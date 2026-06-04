import { loadSheetRaw, schoolHasSheetData } from './sheetLoader.js';
import { getSchoolCampusMeta, campusSheetNameMatches } from '../data/schoolCampusMap.js';

function isDateString(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v);
}

function parseIncidents(schoolId) {
  const rows = loadSheetRaw(schoolId, 'Bus_Incidence');
  if (!rows.length) return { records: [], monthlyByCampus: {} };

  const records = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const date = r?.[0];
    const campus = r?.[1];
    if (!campus || campus === 'Months' || String(campus).startsWith('#')) continue;
    const desc = String(r?.[4] ?? '');
    if (!desc || desc.length < 15) continue;
    if (!isDateString(String(date)) && date == null) continue;

    records.push({
      date: String(date).slice(0, 10),
      campus: String(campus).trim(),
      busNo: r?.[2] ?? null,
      driverName: r?.[3] ?? null,
      description: r?.[4] ?? null,
      location: r?.[5] ?? null,
      solution: r?.[6] ?? null,
      nextSteps: r?.[7] ?? null,
    });
  }

  return { records: records.slice(0, 200), total: records.length };
}

function parseFleet(schoolId) {
  const repairs = loadSheetRaw(schoolId, 'Repair_Maintenance');
  const services = loadSheetRaw(schoolId, 'Buses_Services');

  const repairLines = [];
  for (const r of repairs) {
    const bus = r?.[1];
    if (!bus || String(bus).includes('TOTAL') || String(bus).includes('BUS')) continue;
    const actual = Number(r?.[2]);
    const budget = Number(r?.[3]);
    if (Number.isNaN(actual) && Number.isNaN(budget)) continue;
    repairLines.push({
      bus: String(bus).trim(),
      actualCost: actual || 0,
      budget: budget || 0,
      difference: Number(r?.[4]) || 0,
    });
  }

  const serviceLines = [];
  let currentCampus = null;
  for (const r of services) {
    if (r?.[0] && !r?.[1] && String(r[0]).length < 30) {
      currentCampus = String(r[0]).trim();
      continue;
    }
    if (r?.[0] && String(r[0]).includes('BUS')) continue;
    if (r?.[1] === 'MAINTNANCE & REPAIR' || r?.[1] === 'UNIT') continue;
    if (r?.[0] && r?.[4] != null) {
      serviceLines.push({
        campus: currentCampus,
        item: String(r[0]).trim(),
        category: r?.[1] ?? null,
        quantity: r?.[3],
        costPerUnit: r?.[4],
        totalCost: r?.[5],
      });
    }
  }

  return {
    repairs: repairLines.slice(0, 50),
    services: serviceLines.slice(0, 50),
    liveLocationsAvailable: loadSheetRaw(schoolId, 'Live_Locations').length > 0,
  };
}

export function getTransportIncidents(schoolId) {
  if (!schoolHasSheetData(schoolId)) {
    return { hasData: false, records: [], total: 0 };
  }
  const data = parseIncidents(schoolId);
  const meta = getSchoolCampusMeta(schoolId);
  if (meta.campusKey) {
    const records = data.records.filter((r) => campusSheetNameMatches(meta.campusKey, r.campus));
    return {
      hasData: records.length > 0,
      schoolId,
      records,
      total: records.length,
      campusFilter: meta.campusKey,
    };
  }
  return { hasData: true, schoolId, ...data };
}

export function getTransportFleet(schoolId) {
  if (!schoolHasSheetData(schoolId)) {
    return { hasData: false, repairs: [], services: [] };
  }
  const data = parseFleet(schoolId);
  const meta = getSchoolCampusMeta(schoolId);
  if (meta.campusKey) {
    const services = data.services.filter((s) => campusSheetNameMatches(meta.campusKey, s.campus));
    return { hasData: true, schoolId, ...data, services, campusFilter: meta.campusKey };
  }
  return { hasData: true, schoolId, ...data };
}
