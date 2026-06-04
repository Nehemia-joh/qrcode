import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = join(__dirname, '../../../../data/import-log.json');
const STALE_DAYS = Number(process.env.IMPORT_STALE_DAYS || 30);

function load() {
  if (!existsSync(LOG_FILE)) return { entries: [] };
  try {
    return JSON.parse(readFileSync(LOG_FILE, 'utf8'));
  } catch {
    return { entries: [] };
  }
}

function save(data) {
  const dir = dirname(LOG_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(LOG_FILE, JSON.stringify(data, null, 2));
}

export function recordImport({
  schoolId,
  module,
  filename,
  wiredCount = 0,
  totalTabs = 0,
  attendanceSynced = 0,
}) {
  const entry = {
    id: randomUUID(),
    at: new Date().toISOString(),
    schoolId: schoolId || 'sl-main',
    module,
    filename,
    wiredCount,
    totalTabs,
    attendanceSynced,
  };
  const data = load();
  data.entries.unshift(entry);
  data.entries = data.entries.slice(0, 200);
  save(data);
  return entry;
}

export function getImportHistory(schoolId, limit = 15) {
  let entries = load().entries;
  if (schoolId) entries = entries.filter((e) => e.schoolId === schoolId);
  return entries.slice(0, limit);
}

export function getLastImportByModule(schoolId, module) {
  const hit = load().entries.find((e) => e.schoolId === schoolId && e.module === module);
  return hit ? { at: hit.at, filename: hit.filename, wiredCount: hit.wiredCount } : null;
}

export function getLastImportsForSchool(schoolId) {
  const modules = ['transport', 'kitchen', 'farm', 'facilities'];
  const out = {};
  for (const m of modules) {
    const last = getLastImportByModule(schoolId, m);
    if (last) out[m] = last;
  }
  return out;
}

export function isImportStale(isoDate) {
  if (!isoDate) return true;
  const ageMs = Date.now() - new Date(isoDate).getTime();
  return ageMs > STALE_DAYS * 24 * 60 * 60 * 1000;
}

export function getStaleDays() {
  return STALE_DAYS;
}
