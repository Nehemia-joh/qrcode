import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { getLastImportByModule, isImportStale, getStaleDays } from './importLogStore.js';
import { TRANSPORT_MASTER_SHEETS, GOOGLE_SHEET_REFERENCE } from '../data/sheetCatalog.js';
import { getSheetsDir, loadSheetRaw } from './sheetLoader.js';
import { recordAttendanceEvent } from './attendanceEventsStore.js';
import { invalidateTransportCache } from './transportParser.js';
import { schoolsWithTransportData } from '../data/schools.js';
import { SCHOOL_CAMPUS_META, NETWORK_SCHOOL_ID } from '../data/schoolCampusMap.js';

function slugToFilename(slug) {
  return `${slug}.json`;
}

function latestFileMtime(dir) {
  if (!dir || !existsSync(dir)) return null;
  let latest = 0;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    const m = statSync(join(dir, name)).mtimeMs;
    if (m > latest) latest = m;
  }
  return latest ? new Date(latest).toISOString() : null;
}

export function getSheetImportStatus(schoolId) {
  const dir = getSheetsDir(schoolId);
  if (!dir) {
    return {
      schoolId,
      hasWorkbook: false,
      googleSheet: GOOGLE_SHEET_REFERENCE,
      tabs: TRANSPORT_MASTER_SHEETS.map((t) => ({ ...t, imported: false, rowCount: 0 })),
      importedCount: 0,
      wiredCount: 0,
    };
  }

  const tabs = TRANSPORT_MASTER_SHEETS.map((t) => {
    const path = join(dir, slugToFilename(t.slug));
    const imported = existsSync(path);
    let rowCount = 0;
    if (imported) {
      try {
        rowCount = JSON.parse(readFileSync(path, 'utf8')).raw?.length ?? 0;
      } catch {
        rowCount = 0;
      }
    }
    return {
      ...t,
      imported,
      rowCount,
      wired: !!t.api && imported && rowCount > 0,
    };
  });

  const logged = getLastImportByModule(schoolId, 'transport');
  const fileMtime = latestFileMtime(dir);
  const lastImportAt = logged?.at || fileMtime;
  const stale = isImportStale(lastImportAt);

  return {
    schoolId,
    hasWorkbook: true,
    sheetsDir: dir,
    googleSheet: GOOGLE_SHEET_REFERENCE,
    tabs,
    importedCount: tabs.filter((t) => t.imported).length,
    wiredCount: tabs.filter((t) => t.wired).length,
    totalTabs: tabs.length,
    lastImportAt,
    lastImportFile: logged?.filename || null,
    stale,
    staleAfterDays: getStaleDays(),
    lastChecked: new Date().toISOString(),
  };
}

/** Push AttendanceA/B rows into live attendance feed (no database). */
export function syncAttendanceFromSheets(schoolId) {
  let count = 0;
  for (const slug of ['AttendanceA', 'AttendanceB']) {
    const rows = loadSheetRaw(schoolId, slug)?.slice(1) ?? [];
    for (const r of rows) {
      if (!r?.[0] || !r?.[1]) continue;
      recordAttendanceEvent({
        full_name: r[0],
        attendance_time: r[1],
        attendance_type: slug === 'AttendanceA' ? 'morning' : 'evening',
        school_id: schoolId,
        source: 'sheet_import',
      });
      count++;
    }
  }
  return count;
}

export function afterWorkbookImport(schoolId) {
  invalidateTransportCache(schoolId);
  schoolsWithTransportData.add(schoolId);
  if (schoolId === NETWORK_SCHOOL_ID) {
    for (const [sid, meta] of Object.entries(SCHOOL_CAMPUS_META)) {
      if (meta.inheritsSheetFrom === NETWORK_SCHOOL_ID) schoolsWithTransportData.add(sid);
    }
  }
  const attendanceSynced = syncAttendanceFromSheets(schoolId);
  const status = getSheetImportStatus(schoolId);
  return {
    ...status,
    attendanceSynced,
    message: `Workbook linked: ${status.wiredCount}/${status.totalTabs} tabs active. ${attendanceSynced} attendance rows in live feed.`,
  };
}
