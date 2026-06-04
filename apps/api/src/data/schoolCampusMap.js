/**
 * Master transport workbook = one file, multiple campus columns (not separate files per school).
 * sl-main = Silverleaf group (all campuses). Other sl-* ids = one campus slice from that sheet.
 */

export const NETWORK_SCHOOL_ID = 'sl-main';

/** Column keys in Dashboard / P&L rows (transportParser) */
export const CAMPUS_COLUMNS = {
  usariver: { label: 'Usariver', sheetNames: ['Usariver', 'USA'] },
  am: { label: 'Arusha Modern', sheetNames: ['Arusha Modern', 'AM', 'Arusha Modan'] },
  kijenge: { label: 'Kijenge', sheetNames: ['Kijenge'] },
  ilboru: { label: 'Ilboru', sheetNames: ['Ilboru'] },
  boma: { label: 'Boma', sheetNames: ['Boma'] },
  mbegu: { label: 'Mbegu', sheetNames: ['Mbegu'] },
};

export const SCHOOL_CAMPUS_META = {
  [NETWORK_SCHOOL_ID]: {
    isNetwork: true,
    inheritsSheetFrom: null,
    campusKey: null,
  },
  'sl-usariver': { campusKey: 'usariver', inheritsSheetFrom: NETWORK_SCHOOL_ID },
  'sl-arusha-modern': { campusKey: 'am', inheritsSheetFrom: NETWORK_SCHOOL_ID },
  'sl-kijenge': { campusKey: 'kijenge', inheritsSheetFrom: NETWORK_SCHOOL_ID },
  'sl-ilboru': { campusKey: 'ilboru', inheritsSheetFrom: NETWORK_SCHOOL_ID },
  'sl-boma': { campusKey: 'boma', inheritsSheetFrom: NETWORK_SCHOOL_ID },
  'sl-mbegu': { campusKey: 'mbegu', inheritsSheetFrom: NETWORK_SCHOOL_ID },
};

export function getSchoolCampusMeta(schoolId) {
  return SCHOOL_CAMPUS_META[schoolId] ?? { isNetwork: false, inheritsSheetFrom: null, campusKey: null };
}

export function getSheetDataSchoolId(schoolId) {
  const meta = getSchoolCampusMeta(schoolId);
  if (meta.inheritsSheetFrom) return meta.inheritsSheetFrom;
  return schoolId;
}

export function isNetworkSchool(schoolId) {
  return schoolId === NETWORK_SCHOOL_ID || !!getSchoolCampusMeta(schoolId).isNetwork;
}

export function campusSheetNameMatches(campusKey, name) {
  if (!campusKey || !name) return false;
  const cfg = CAMPUS_COLUMNS[campusKey];
  if (!cfg) return false;
  const n = String(name).trim().toLowerCase();
  return cfg.sheetNames.some((s) => n.includes(s.toLowerCase()) || s.toLowerCase().includes(n));
}

export function listCampusesFromSheet() {
  return Object.entries(CAMPUS_COLUMNS).map(([key, v]) => ({ campusKey: key, label: v.label }));
}
