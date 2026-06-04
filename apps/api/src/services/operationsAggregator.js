import { schools, schoolsWithTransportData } from '../data/schools.js';
import { schoolHasSheetData } from './sheetLoader.js';
import { getTransportSummaryForSchool } from './transportParser.js';
import { getModuleSummary, moduleHasData } from './moduleParser.js';
import { getSchoolCampusMeta, NETWORK_SCHOOL_ID } from '../data/schoolCampusMap.js';

const MODULES = [
  { id: 'transport', name: 'Transport', path: '/transport', phase: 1 },
  { id: 'kitchen', name: 'Kitchen', path: '/kitchen', phase: 2 },
  { id: 'facilities', name: 'Facilities', path: '/facilities', phase: 2 },
  { id: 'farm', name: 'Farm', path: '/farm', phase: 2 },
];

function kpiOnTrack(kpi) {
  if (kpi.actual == null) return null;
  if (kpi.key === 'incidents') return kpi.actual <= kpi.target;
  return kpi.actual >= kpi.target;
}

function stubModuleKpis(moduleId) {
  const labels =
    moduleId === 'kitchen'
      ? ['Meal cost vs budget', 'Food safety score', 'Wastage %']
      : moduleId === 'facilities'
        ? ['Assets tracked %', 'Open maintenance', 'Utility vs budget']
        : ['Yield vs target', 'Input cost / unit', 'Labour efficiency'];
  return labels.map((label, i) => ({
    key: `${moduleId}_${i}`,
    label,
    target: 90,
    actual: null,
    unit: '%',
    onTrack: null,
  }));
}

export function getOperationsSummary(schoolId) {
  const transport = getTransportSummaryForSchool(schoolId);
  const transportKpis = (transport.kpis ?? []).map((k) => ({
    ...k,
    module: 'transport',
    onTrack: kpiOnTrack(k),
  }));

  const modules = MODULES.map((m) => {
    if (m.id === 'transport') {
      return {
        ...m,
        active: schoolHasSheetData(schoolId) || schoolsWithTransportData.has(schoolId),
        hasData: transport.hasData !== false,
        kpis: transportKpis,
      };
    }
    const mod = getModuleSummary(schoolId, m.id);
    const hasData = moduleHasData(schoolId, m.id) && mod.hasData;
    const kpis = hasData
      ? mod.kpis.map((k) => ({ ...k, module: m.id, onTrack: kpiOnTrack(k) }))
      : stubModuleKpis(m.id);
    return {
      ...m,
      active: true,
      hasData,
      reportMonth: mod.reportMonth,
      kpis,
    };
  });

  const onTrackCount = transportKpis.filter((k) => k.onTrack === true).length;
  const offTrackCount = transportKpis.filter((k) => k.onTrack === false).length;

  return {
    schoolId,
    reportMonth: transport.reportMonth,
    reportYear: transport.reportYear,
    organization: 'Silverleaf Academy Group',
    modules,
    overview: {
      schoolsInNetwork: schools.length,
      schoolsWithData: [...schoolsWithTransportData].length,
      kpisOnTrack: onTrackCount,
      kpisOffTrack: offTrackCount,
      kpisPending: transportKpis.filter((k) => k.onTrack === null).length,
    },
    transportSummary: transport,
  };
}

/** Cross-module executive snapshot for leadership PDF / Overall dashboard */
export function getExecutiveSummary(schoolId) {
  const ops = getOperationsSummary(schoolId);
  const network = getNetworkRollup();
  const transport = ops.transportSummary;

  const alerts = [];
  for (const k of transport?.kpis ?? []) {
    if (k.onTrack === false) alerts.push({ module: 'transport', kpi: k.label, actual: k.actual, target: k.target });
  }
  for (const m of ops.modules) {
    if (m.id === 'transport') continue;
    for (const k of m.kpis ?? []) {
      if (k.onTrack === false) alerts.push({ module: m.id, kpi: k.label, actual: k.actual, target: k.target });
    }
  }

  const campusesLive = (transport?.campuses ?? []).filter((c) => c.kpis?.some((k) => k.actual != null)).length;

  return {
    schoolId,
    reportMonth: ops.reportMonth,
    reportYear: ops.reportYear,
    organization: ops.organization,
    viewMode: transport?.viewMode ?? 'school',
    campusesLive,
    modulesSummary: ops.modules.map((m) => ({
      id: m.id,
      name: m.name,
      hasData: m.hasData,
      onTrack: (m.kpis ?? []).filter((k) => k.onTrack === true).length,
      offTrack: (m.kpis ?? []).filter((k) => k.onTrack === false).length,
    })),
    offTrackAlerts: alerts.slice(0, 12),
    networkSchoolsWithData: network.schools.filter((s) => s.hasTransportData).length,
    networkSchoolCount: network.schoolCount,
    generatedAt: new Date().toISOString(),
  };
}

export function getNetworkRollup() {
  const groupTransport = getTransportSummaryForSchool(NETWORK_SCHOOL_ID);
  const campusKpis = Object.fromEntries(
    (groupTransport.campuses ?? []).map((c) => [c.campusKey, c.kpis])
  );

  const schoolSnapshots = schools
    .filter((s) => s.id !== NETWORK_SCHOOL_ID)
    .map((s) => {
      const meta = getSchoolCampusMeta(s.id);
      const summary = getOperationsSummary(s.id);
      const transport = summary.modules.find((m) => m.id === 'transport');
      const hasData = schoolHasSheetData(s.id) || !!meta.campusKey;

      return {
        schoolId: s.id,
        name: s.name,
        code: s.code,
        region: s.region,
        campusKey: meta.campusKey ?? null,
        hasTransportData: hasData,
        dataSource: meta.inheritsSheetFrom ? 'master_sheet_campus' : hasData ? 'own_workbook' : 'pending',
        reportMonth: summary.reportMonth,
        kpis: transport?.kpis ?? campusKpis[meta.campusKey] ?? [],
      };
    });

  return {
    organization: 'Silverleaf Academy Group',
    schoolCount: schools.length,
    networkSchoolId: NETWORK_SCHOOL_ID,
    campusesInMasterSheet: groupTransport.campuses ?? [],
    schools: schoolSnapshots,
    updatedAt: new Date().toISOString(),
  };
}
