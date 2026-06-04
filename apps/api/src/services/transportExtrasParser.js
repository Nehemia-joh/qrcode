import { loadSheetRaw, schoolHasSheetData } from './sheetLoader.js';
import { getSchoolCampusMeta, campusSheetNameMatches } from '../data/schoolCampusMap.js';

export function getTransportBuses(schoolId) {
  if (!schoolHasSheetData(schoolId)) return { hasData: false, buses: [] };
  const rows = loadSheetRaw(schoolId, 'Transport_Users');
  const buses = [];
  for (const r of rows) {
    if (r?.[2] === 'Campus' || r?.[1] === '#') continue;
    const campus = r?.[2];
    const busNo = r?.[3];
    if (!campus || !busNo || String(busNo).trim() === '') continue;
    buses.push({
      campus: String(campus).trim(),
      busNo: String(busNo).trim(),
      busType: r?.[4] ?? null,
      regCapacity: num(r?.[5]),
      maxCapacity: num(r?.[6]),
      occupancy: num(r?.[7]),
      spareSeats: num(r?.[8]),
      route: r?.[9] ?? null,
    });
  }
  const meta = getSchoolCampusMeta(schoolId);
  const filtered = meta.campusKey
    ? buses.filter((b) => campusSheetNameMatches(meta.campusKey, b.campus))
    : buses;
  return {
    hasData: filtered.length > 0,
    schoolId,
    buses: filtered.slice(0, 200),
    total: filtered.length,
    campusFilter: meta.campusKey ?? null,
  };
}

export function getTransportBudget(schoolId) {
  if (!schoolHasSheetData(schoolId)) return { hasData: false };
  const plRows = loadSheetRaw(schoolId, 'Transport_PL');
  const budgetRows = loadSheetRaw(schoolId, 'Actual_vs_Budget');

  const plLines = [];
  for (const r of plRows) {
    const label = String(r?.[1] ?? '').trim();
    if (/^\d+\./.test(label)) {
      plLines.push({
        label: label.replace(/^\d+\.\s*/, ''),
        yearBudget: num(r?.[2]),
        ytdActual: num(r?.[3]),
        monthly: {
          Jan: num(r?.[4]),
          Feb: num(r?.[5]),
          Mar: num(r?.[6]),
          Apr: num(r?.[7]),
          May: num(r?.[8]),
          Jun: num(r?.[9]),
        },
      });
    }
  }

  let repairBudget = null;
  const repairActuals = [];
  if (budgetRows.length >= 3) {
    repairBudget = num(budgetRows[0]?.[0]);
    const months = budgetRows[2]?.slice(1) ?? [];
    const actuals = budgetRows[3]?.slice(1) ?? [];
    months.forEach((m, i) => {
      if (m) repairActuals.push({ month: String(m), actual: num(actuals[i]) });
    });
  }

  return {
    hasData: plLines.length > 0,
    schoolId,
    profitLoss: plLines,
    repairMaintenance: { annualBudget: repairBudget, monthly: repairActuals },
  };
}

export function getTransportQrStats(schoolId) {
  if (!schoolHasSheetData(schoolId)) return { hasData: false, routes: [] };
  const rows = loadSheetRaw(schoolId, 'QR_Code');
  if (rows.length < 2) return { hasData: false, routes: [] };

  const header = rows[0] ?? [];
  const routes = [];
  for (let col = 1; col < header.length; col += 3) {
    const routeName = header[col];
    if (!routeName || String(routeName).includes('NAME')) continue;
    let studentCount = 0;
    for (let i = 2; i < rows.length; i++) {
      const name = rows[i]?.[col];
      if (name && String(name).trim().length > 2) studentCount++;
    }
    routes.push({ route: String(routeName).trim(), studentsWithQr: studentCount });
  }
  return {
    hasData: routes.length > 0,
    schoolId,
    routes,
    totalStudents: routes.reduce((s, r) => s + r.studentsWithQr, 0),
    note: 'Full QR generation links to Nehemiah when database is connected.',
  };
}

function num(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
