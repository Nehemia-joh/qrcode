import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = join(__dirname, '../../../../data');

const MODULES = {
  kitchen: { dir: 'kitchen', dashboardSlug: 'Dashboard' },
  farm: { dir: 'farm', dashboardSlug: 'Dashboard' },
  facilities: { dir: 'facilities', dashboardSlug: 'Dashboard' },
};

function getModuleDir(schoolId, moduleId) {
  const cfg = MODULES[moduleId];
  if (!cfg) return null;
  return join(DATA_ROOT, 'schools', schoolId, cfg.dir);
}

export function moduleHasData(schoolId, moduleId) {
  const dir = getModuleDir(schoolId, moduleId);
  if (!dir) return false;
  const cfg = MODULES[moduleId];
  return existsSync(join(dir, `${cfg.dashboardSlug}.json`));
}

function loadModuleRaw(schoolId, moduleId, slug) {
  const dir = getModuleDir(schoolId, moduleId);
  if (!dir) return [];
  const path = join(dir, `${slug}.json`);
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf8')).raw ?? [];
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

/** Parse KPI block from dashboard-style sheets */
export function parseModuleDashboard(schoolId, moduleId) {
  const cfg = MODULES[moduleId];
  const rows = loadModuleRaw(schoolId, moduleId, cfg.dashboardSlug);
  if (!rows.length) return null;

  const kpis = [];
  let reportMonth = null;
  let reportYear = new Date().getFullYear();

  for (const r of rows.slice(0, 15)) {
    if (r?.[2] === 'Month:' || String(r?.[2]).includes('Month')) {
      reportMonth = String(r[3] ?? '').trim();
    }
    const label = r?.[16] ?? r?.[0];
    const target = r?.[17] ?? r?.[1];
    const actual = r?.[18] ?? r?.[2];
    if (!label || target == null || actual == null) continue;
    const name = String(label).trim();
    if (name.length < 3 || name === 'Key Performance Indicator') continue;
    kpis.push({
      key: name.replace(/^\d+\.\s*/, '').toLowerCase().replace(/\s+/g, '_').slice(0, 40),
      label: name.replace(/^\d+\.\s*/, ''),
      target: typeof target === 'number' && target <= 1 ? pct(target) : num(target) ?? pct(target),
      actual: typeof actual === 'number' && Math.abs(actual) <= 1 && actual !== 0 ? pct(actual) : num(actual) ?? pct(actual),
      unit: Math.abs(Number(actual)) <= 1 || Math.abs(Number(target)) <= 1 ? '%' : 'count',
    });
  }

  return {
    schoolId,
    moduleId,
    reportMonth,
    reportYear,
    hasData: kpis.length > 0,
    kpis,
    source: `${moduleId} master sheet`,
    updatedAt: new Date().toISOString(),
  };
}

export function getModuleSummary(schoolId, moduleId) {
  if (!moduleHasData(schoolId, moduleId)) {
    return {
      schoolId,
      moduleId,
      hasData: false,
      kpis: [],
      reportMonth: null,
      reportYear: new Date().getFullYear(),
    };
  }
  return parseModuleDashboard(schoolId, moduleId);
}

export { MODULES };
