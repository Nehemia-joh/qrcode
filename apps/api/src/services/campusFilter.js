import { CAMPUS_COLUMNS, listCampusesFromSheet } from '../data/schoolCampusMap.js';

function pick(row, campusKey) {
  if (!row) return null;
  if (campusKey && row[campusKey] != null) return row[campusKey];
  return row.total ?? null;
}

function pickIncidentsMonth(row, campusKey) {
  if (!row) return null;
  if (campusKey === 'usariver') return row.usariver;
  if (campusKey === 'am') return row.arushaModern ?? row.am;
  return row.total;
}

function pickBusMonth(row, campusKey) {
  if (!row) return null;
  if (campusKey === 'usariver') return row.usariver;
  if (campusKey === 'am') return row.am;
  if (campusKey === 'mbegu') return row.mbegu;
  return row.total;
}

/** Build campus-level KPI snapshots for network rollup table */
export function buildCampusBreakdown(full) {
  if (!full?.kpis?.length && !full?.occupancy?.rows?.length) return [];

  const occRow = full.occupancy?.rows?.find((r) => r.label?.includes('Overall Occupancy'));
  const pl = full.profitLoss?.netProfitLoss ?? {};

  return listCampusesFromSheet().map(({ campusKey, label }) => {
    const occupancy = occRow ? pick(occRow, campusKey) : null;
    const incidents = (full.incidents?.monthly ?? []).reduce(
      (sum, m) => sum + (pickIncidentsMonth(m, campusKey) ?? 0),
      0
    );
    const arrivalMonths = full.busArrival?.monthly ?? [];
    const arrival =
      arrivalMonths.length > 0
        ? pickBusMonth(arrivalMonths[arrivalMonths.length - 1], campusKey)
        : full.busArrival?.ytd?.[campusKey] ?? null;
    const plVal = pl[campusKey] ?? null;

    return {
      campusKey,
      label,
      kpis: [
        { key: 'occupancy', label: 'Occupancy', actual: occupancy, unit: '%', target: full.occupancy?.targetPct ?? 95 },
        { key: 'incidents', label: 'Incidents', actual: incidents, unit: 'count', target: 0 },
        { key: 'bus_arrival', label: 'Bus Arrival', actual: arrival, unit: '%', target: full.busArrival?.targetPct ?? 90 },
        { key: 'transport_pl', label: 'Transport P&L', actual: plVal != null ? (plVal < 0 ? 0 : 100) : null, unit: 'count', target: 0 },
      ],
      netProfitLoss: plVal,
    };
  });
}

/** Filter full multi-campus transport summary to one campus */
export function filterTransportForCampus(full, campusKey, schoolId) {
  const label = CAMPUS_COLUMNS[campusKey]?.label ?? campusKey;

  const occPct = full.occupancy?.rows?.find((r) => r.label?.includes('Overall Occupancy'));
  const occupancyActual = occPct ? pick(occPct, campusKey) : null;

  const incidentTotal = (full.incidents?.monthly ?? []).reduce(
    (sum, m) => sum + (pickIncidentsMonth(m, campusKey) ?? 0),
    0
  );

  const arrivalMonths = full.busArrival?.monthly ?? [];
  const arrivalActual =
    arrivalMonths.length > 0
      ? pickBusMonth(arrivalMonths[arrivalMonths.length - 1], campusKey)
      : full.busArrival?.ytd?.[campusKey] ?? null;

  const plNet = full.profitLoss?.netProfitLoss?.[campusKey] ?? null;

  const kpis = [
    {
      key: 'occupancy',
      label: 'Occupancy',
      target: full.occupancy?.targetPct ?? 95,
      actual: occupancyActual,
      unit: '%',
    },
    {
      key: 'incidents',
      label: 'Incidents',
      target: 0,
      actual: incidentTotal,
      unit: 'count',
    },
    {
      key: 'bus_arrival',
      label: 'Bus Arrival Time',
      target: full.busArrival?.targetPct ?? 90,
      actual: arrivalActual,
      unit: '%',
    },
    {
      key: 'transport_pl',
      label: 'Transport P&L',
      target: 90,
      actual: plNet != null ? Math.min(100, Math.max(0, plNet >= 0 ? 100 : 50)) : null,
      unit: '%',
    },
  ];

  return {
    ...full,
    schoolId,
    viewMode: 'campus',
    campusKey,
    campusLabel: label,
    source: `${full.source} — ${label} campus`,
    kpis,
    occupancy: {
      ...full.occupancy,
      rows: (full.occupancy?.rows ?? []).map((r) => ({
        label: r.label,
        total: pick(r, campusKey),
        usariver: pick(r, campusKey),
        am: pick(r, campusKey),
        kijenge: pick(r, campusKey),
        ilboru: pick(r, campusKey),
        boma: pick(r, campusKey),
      })),
      monthlyGrowth: (full.occupancy?.monthlyGrowth ?? []).map((m) => ({
        month: m.month,
        total: pick(m, campusKey),
        usariver: pick(m, campusKey),
        am: pick(m, campusKey),
        kijenge: pick(m, campusKey),
        ilboru: pick(m, campusKey),
        boma: pick(m, campusKey),
      })),
    },
    incidents: {
      ...full.incidents,
      monthly: (full.incidents?.monthly ?? []).map((m) => ({
        month: m.month,
        total: pickIncidentsMonth(m, campusKey) ?? 0,
        usariver: pickIncidentsMonth(m, campusKey),
        arushaModern: pickIncidentsMonth(m, campusKey),
      })),
      ytdTotal: incidentTotal,
    },
    busArrival: {
      ...full.busArrival,
      monthly: (full.busArrival?.monthly ?? []).map((m) => ({
        month: m.month,
        total: pickBusMonth(m, campusKey),
        usariver: pickBusMonth(m, campusKey),
        am: pickBusMonth(m, campusKey),
        mbegu: pickBusMonth(m, campusKey),
      })),
      ytd: { total: arrivalActual, [campusKey]: arrivalActual },
    },
    profitLoss: {
      ...full.profitLoss,
      lines: (full.profitLoss?.lines ?? []).map((line) => ({
        ...line,
        total: pick(line, campusKey),
        usariver: pick(line, campusKey),
        am: pick(line, campusKey),
        kijenge: pick(line, campusKey),
        ilboru: pick(line, campusKey),
        boma: pick(line, campusKey),
      })),
      netProfitLoss: { total: plNet, [campusKey]: plNet },
    },
  };
}
