import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { schoolsWithTransportData } from '../data/schools.js';
import { getSheetDataSchoolId, getSchoolCampusMeta, SCHOOL_CAMPUS_META, NETWORK_SCHOOL_ID } from '../data/schoolCampusMap.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = join(__dirname, '../../../../data');

/** Resolve sheet JSON directory for a school */
export function getSheetsDir(schoolId) {
  const perSchool = join(DATA_ROOT, 'schools', schoolId, 'sheets');
  if (existsSync(join(perSchool, 'Dashboard.json'))) return perSchool;

  if (schoolId === 'sl-main') {
    const legacy = join(DATA_ROOT, 'sheets');
    if (existsSync(join(legacy, 'Dashboard.json'))) return legacy;
  }
  return null;
}

export function schoolHasSheetData(schoolId) {
  const sourceId = getSheetDataSchoolId(schoolId);
  if (getSheetsDir(sourceId) != null) {
    const meta = getSchoolCampusMeta(schoolId);
    if (meta.campusKey || meta.isNetwork) return true;
    if (sourceId === schoolId) return true;
  }
  return getSheetsDir(schoolId) != null;
}

export function syncSchoolsWithData() {
  for (const id of [NETWORK_SCHOOL_ID, ...Array.from(schoolsWithTransportData)]) {
    if (schoolHasSheetData(id)) {
      schoolsWithTransportData.add(id);
      if (id === NETWORK_SCHOOL_ID) {
        for (const [sid, meta] of Object.entries(SCHOOL_CAMPUS_META)) {
          if (meta.inheritsSheetFrom === NETWORK_SCHOOL_ID) schoolsWithTransportData.add(sid);
        }
      }
    }
  }
}

export function loadSheetRaw(schoolId, slug) {
  const dir = getSheetsDir(getSheetDataSchoolId(schoolId));
  if (!dir) return [];
  const path = join(dir, `${slug}.json`);
  if (!existsSync(path)) return [];
  const data = JSON.parse(readFileSync(path, 'utf8'));
  return data.raw ?? [];
}
