import { loadSheetRaw, schoolHasSheetData } from './sheetLoader.js';

export function getTransportGps(schoolId) {
  if (!schoolHasSheetData(schoolId)) {
    return { hasData: false, routes: [], daily: [], summary: null };
  }

  const rows = loadSheetRaw(schoolId, 'Live_Locations');
  if (rows.length < 3) {
    return { hasData: false, routes: [], daily: [], summary: null };
  }

  const headerRow = rows.find((r) => r?.[0] === 'DATE' || String(r?.[0]).trim() === 'DATE');
  if (!headerRow) {
    return { hasData: false, routes: [], daily: [], summary: null };
  }

  const routes = headerRow.slice(1).map((h) => String(h ?? '').trim()).filter(Boolean);
  const daily = [];

  for (const r of rows) {
    const dateVal = r?.[0];
    if (!dateVal || String(dateVal) === 'DATE' || String(dateVal) === 'Top') continue;
    if (!String(dateVal).includes('202')) continue;

    let yes = 0;
    let no = 0;
    let blank = 0;
    const byRoute = {};

    routes.forEach((route, idx) => {
      const v = String(r[idx + 1] ?? '').trim();
      if (v === 'Yes') {
        yes++;
        byRoute[route] = 'yes';
      } else if (v === 'No') {
        no++;
        byRoute[route] = 'no';
      } else {
        blank++;
        byRoute[route] = 'missing';
      }
    });

    const tracked = yes + no;
    if (tracked === 0) continue;

    daily.push({
      date: String(dateVal).slice(0, 10),
      compliancePct: Math.round((yes / tracked) * 1000) / 10,
      routesTracked: tracked,
      routesYes: yes,
      routesNo: no,
      byRoute,
    });
  }

  const last14 = daily.slice(-14);
  const avgCompliance =
    last14.length > 0
      ? Math.round((last14.reduce((s, d) => s + d.compliancePct, 0) / last14.length) * 10) / 10
      : null;

  const routeStats = routes.map((route) => {
    let y = 0;
    let n = 0;
    for (const d of daily) {
      if (d.byRoute[route] === 'yes') y++;
      if (d.byRoute[route] === 'no') n++;
    }
    const t = y + n;
    return {
      route,
      compliancePct: t ? Math.round((y / t) * 1000) / 10 : null,
      daysYes: y,
      daysNo: n,
    };
  });

  return {
    hasData: true,
    schoolId,
    routes,
    daily: daily.slice(-30),
    summary: {
      avgCompliance14d: avgCompliance,
      totalDays: daily.length,
      routeCount: routes.length,
    },
    routeStats: routeStats.sort((a, b) => (a.compliancePct ?? 100) - (b.compliancePct ?? 100)),
  };
}
