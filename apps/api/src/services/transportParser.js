import { loadSheetRaw, schoolHasSheetData } from './sheetLoader.js';
import { getSheetDataSchoolId, getSchoolCampusMeta, isNetworkSchool } from '../data/schoolCampusMap.js';
import { filterTransportForCampus, buildCampusBreakdown } from './campusFilter.js';

function cell(row, idx) {
  if (!row || idx >= row.length) return null;
  const v = row[idx];
  return v === '' ? null : v;
}

function pct(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return n <= 1 && n >= -1 ? Math.round(n * 10000) / 100 : Math.round(n * 100) / 100;
}

function num(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function findRow(rows, col0Match) {
  return rows.find((r) => r && String(r[0] ?? '').trim() === col0Match);
}

function findMetaValue(rows, labelPart) {
  for (const r of rows) {
    if (!r) continue;
    for (let i = 0; i < r.length; i++) {
      if (String(r[i] ?? '').includes(labelPart)) {
        return num(r[i + 2]) ?? num(r[18]);
      }
    }
  }
  return null;
}

function rowsUntil(rows, startIdx, stopLabels) {
  const out = [];
  for (let i = startIdx; i < rows.length; i++) {
    const label = String(rows[i]?.[0] ?? '').trim();
    if (stopLabels.some((s) => label.startsWith(s))) break;
    if (label && !['Months', 'Campus', 'Summary', 'Discription'].includes(label)) {
      out.push(rows[i]);
    }
  }
  return out;
}

function parseOccupancy(rows) {
  const campusLabels = ['Total Students Using Transport', 'Total Bus Capacity', 'Total Spare Seats', 'Overall Occupancy %'];
  const occupancyRows = campusLabels.map((label) => {
    const r = findRow(rows, label);
    if (!r) return null;
    const isPct = label.includes('Occupancy');
    return {
      label,
      total: isPct ? pct(r[1]) : num(r[1]),
      usariver: isPct ? pct(r[2]) : num(r[2]),
      am: isPct ? pct(r[3]) : num(r[3]),
      kijenge: isPct ? pct(r[4]) : num(r[4]),
      ilboru: isPct ? pct(r[5]) : num(r[5]),
      boma: isPct ? pct(r[6]) : num(r[6]),
    };
  }).filter(Boolean);

  const growthStart = rows.findIndex((r) => r && r[0] === 'Monthly Transport Growth');
  const monthlyGrowth = [];
  if (growthStart >= 0) {
    const monthHeader = growthStart + 1;
    for (let i = growthStart + 2; i < rows.length; i++) {
      const r = rows[i];
      const month = cell(r, 0);
      if (!month || ['Total', '2. Incidents'].some((x) => String(month).startsWith(x))) break;
      if (['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].includes(month)) {
        if (num(r[1]) == null) continue;
        monthlyGrowth.push({
          month,
          total: num(r[1]),
          usariver: num(r[2]),
          am: num(r[3]),
          kijenge: num(r[4]),
          ilboru: num(r[5]),
          boma: num(r[6]),
        });
      }
    }
  }

  const targetedStudentsAt95 = findMetaValue(rows, 'Targeted number of the student');
  const gapToTarget = findMetaValue(rows, 'Remaining number of students');

  return {
    rows: occupancyRows,
    targetPct: 95,
    targetedStudentsAt95: targetedStudentsAt95 != null ? Math.round(targetedStudentsAt95) : null,
    gapToTarget: gapToTarget != null ? Math.round(gapToTarget) : null,
    monthlyGrowth,
    narrative: '',
  };
}

function parseIncidents(rows) {
  const start = rows.findIndex((r) => r && String(r[0]).startsWith('2. Incidents'));
  if (start < 0) return { monthly: [], ytdTotal: 0, narrative: '' };
  const monthly = [];
  for (let i = start + 2; i < rows.length; i++) {
    const r = rows[i];
    const month = cell(r, 0);
    if (month === 'Total') {
      return {
        monthly,
        ytdTotal: num(r[1]) ?? 0,
        narrative: '',
      };
    }
    if (!['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].includes(month)) continue;
    if (num(r[1]) == null && num(r[2]) == null) continue;
    monthly.push({
      month,
      total: num(r[1]) ?? 0,
      usariver: num(r[2]) ?? 0,
      arushaModern: num(r[3]) ?? 0,
    });
  }
  return { monthly: [], ytdTotal: 0, narrative: '' };
}

function parseBusArrival(rows) {
  const start = rows.findIndex((r) => r && String(r[0]).startsWith('3. Bus Arrival'));
  if (start < 0) return { targetPct: 90, monthly: [], ytd: {}, narrative: '' };
  const monthly = [];
  let ytd = {};
  for (let i = start + 2; i < rows.length; i++) {
    const r = rows[i];
    const label = cell(r, 0);
    if (label === 'Total' && String(r[1]) !== 'Usariver') {
      ytd = {
        usariver: pct(r[1]),
        am: pct(r[2]),
        mbegu: pct(r[3]),
        total: pct(r[5]),
      };
      break;
    }
    if (!['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].includes(label)) continue;
    if (num(r[5]) == null && pct(r[1]) == null) continue;
    monthly.push({
      month: label,
      usariver: pct(r[1]),
      am: pct(r[2]),
      mbegu: pct(r[3]),
      total: pct(r[5]),
    });
  }
  return { targetPct: 90, monthly, ytd, narrative: '' };
}

function parseProfitLoss(rows) {
  const start = rows.findIndex((r) => r && String(r[0]).startsWith('4. Transport P&L'));
  if (start < 0) return { currency: 'TZS', lines: [], netProfitLoss: {}, narrative: '' };
  const lines = [];
  let netProfitLoss = {};
  for (let i = start + 3; i < rows.length; i++) {
    const r = rows[i];
    const label = String(cell(r, 0) ?? '').trim();
    if (!label) continue;
    if (label.startsWith('Profit/(Loss)')) {
      netProfitLoss = {
        total: num(r[1]),
        usariver: num(r[2]),
        am: num(r[3]),
        kijenge: num(r[4]),
        ilboru: num(r[5]),
        boma: num(r[6]),
      };
      break;
    }
    if (/^\d+\./.test(label)) {
      lines.push({
        key: label.replace(/^\d+\.\s*/, '').toLowerCase().replace(/\s+/g, '_').slice(0, 40),
        label: label.replace(/^\d+\.\s*/, ''),
        total: num(r[1]),
        usariver: num(r[2]),
        am: num(r[3]),
        kijenge: num(r[4]),
        ilboru: num(r[5]),
        boma: num(r[6]),
      });
    }
  }
  return { currency: 'TZS', lines, netProfitLoss, narrative: '' };
}

function parseKpis(rows) {
  const kpis = [];
  for (const r of rows.slice(0, 10)) {
    const name = r?.[16];
    const target = r?.[17];
    const actual = r?.[18];
    if (!name || target == null || actual == null) continue;
    const label = String(name).trim();
    if (label.startsWith('1. Occupancy')) {
      kpis.push({ key: 'occupancy', label: 'Occupancy', target: pct(target), actual: pct(actual), unit: '%' });
    } else if (label.startsWith('2. Incidents')) {
      kpis.push({ key: 'incidents', label: 'Incidents', target: num(target), actual: num(actual), unit: 'count' });
    } else if (label.startsWith('3. Bus Arrival')) {
      kpis.push({ key: 'bus_arrival', label: 'Bus Arrival Time', target: pct(target), actual: pct(actual), unit: '%' });
    } else if (label.startsWith('4. Transport P&L')) {
      kpis.push({ key: 'transport_pl', label: 'Transport P&L', target: pct(target), actual: pct(actual), unit: '%' });
    }
  }
  return kpis;
}

function parseReportPeriod(rows) {
  for (const r of rows.slice(0, 10)) {
    if (cell(r, 2) === 'Month:' || String(cell(r, 2)).includes('Month')) {
      return { reportMonth: String(cell(r, 3) ?? 'June'), reportYear: new Date().getFullYear() };
    }
  }
  return { reportMonth: 'June', reportYear: 2026 };
}

export function invalidateTransportCache(schoolId) {
  if (schoolId) {
    cache.delete(getSheetDataSchoolId(schoolId));
    cache.delete(schoolId);
  } else cache.clear();
}

export function parseTransportFromDashboard(schoolId = 'sl-main') {
  const rows = loadSheetRaw(schoolId, 'Dashboard');
  if (!rows.length) return null;
  const { reportMonth, reportYear } = parseReportPeriod(rows);
  return {
    reportMonth,
    reportYear,
    source: '2026 Transport Master sheet',
    updatedAt: new Date().toISOString(),
    kpis: parseKpis(rows),
    occupancy: parseOccupancy(rows),
    incidents: parseIncidents(rows),
    busArrival: parseBusArrival(rows),
    profitLoss: parseProfitLoss(rows),
  };
}

const cache = new Map();

function getFullSummary(sourceSchoolId) {
  if (!cache.has(sourceSchoolId)) {
    const parsed = parseTransportFromDashboard(sourceSchoolId);
    if (parsed) cache.set(sourceSchoolId, parsed);
  }
  return cache.get(sourceSchoolId);
}

export function getTransportSummaryForSchool(schoolId) {
  const sourceId = getSheetDataSchoolId(schoolId);
  const meta = getSchoolCampusMeta(schoolId);

  if (!schoolHasSheetData(schoolId)) {
    return {
      ...emptyTransportSummary(schoolId),
      viewMode: meta.campusKey ? 'campus' : isNetworkSchool(schoolId) ? 'network' : 'school',
      campusKey: meta.campusKey ?? null,
      campusLabel: null,
      note: meta.inheritsSheetFrom
        ? 'This campus is in the master sheet — select Silverleaf — All Campuses after import.'
        : 'Import a dedicated workbook for this location via Load data.',
    };
  }

  const full = getFullSummary(sourceId);
  if (!full) return emptyTransportSummary(schoolId);

  if (isNetworkSchool(schoolId)) {
    return {
      ...full,
      schoolId,
      hasData: true,
      viewMode: 'network',
      campusKey: null,
      campusLabel: null,
      campuses: buildCampusBreakdown(full),
    };
  }

  if (meta.campusKey) {
    return filterTransportForCampus(full, meta.campusKey, schoolId);
  }

  return { ...full, schoolId, hasData: true, viewMode: 'school' };
}

function emptyTransportSummary(schoolId) {
  return {
    schoolId,
    reportMonth: null,
    reportYear: new Date().getFullYear(),
    source: null,
    updatedAt: null,
    hasData: false,
    kpis: [
      { key: 'occupancy', label: 'Occupancy', target: 95, actual: null, unit: '%' },
      { key: 'incidents', label: 'Incidents', target: 0, actual: null, unit: 'count' },
      { key: 'bus_arrival', label: 'Bus Arrival Time', target: 90, actual: null, unit: '%' },
      { key: 'transport_pl', label: 'Transport P&L', target: 90, actual: null, unit: '%' },
    ],
    occupancy: { rows: [], targetPct: 95, monthlyGrowth: [], narrative: '' },
    incidents: { monthly: [], ytdTotal: null, narrative: '' },
    busArrival: { targetPct: 90, monthly: [], ytd: {}, narrative: '' },
    profitLoss: { currency: 'TZS', lines: [], netProfitLoss: {}, narrative: '' },
  };
}
