/**
 * Multi-school registry (10+). Sheet-backed transport data is wired per schoolId
 * via schoolSheetConfig; other schools return empty KPI shells until onboarded.
 */
export const schools = [
  { id: 'sl-main', name: 'Silverleaf — All Campuses', code: 'SL-GROUP', region: 'Network', active: true, isNetwork: true },
  { id: 'sl-usariver', name: 'Silverleaf — Usariver', code: 'SL-USA', region: 'Dar es Salaam', active: true },
  { id: 'sl-arusha-modern', name: 'Silverleaf — Arusha Modern', code: 'SL-AM', region: 'Arusha', active: true },
  { id: 'sl-kijenge', name: 'Silverleaf — Kijenge', code: 'SL-KIJ', region: 'Arusha', active: true },
  { id: 'sl-ilboru', name: 'Silverleaf — Ilboru', code: 'SL-ILB', region: 'Arusha', active: true },
  { id: 'sl-boma', name: 'Silverleaf — Boma', code: 'SL-BOM', region: 'Arusha', active: true },
  { id: 'sl-mbegu', name: 'Silverleaf — Mbegu', code: 'SL-MBG', region: 'Arusha', active: true },
  { id: 'sl-moshi', name: 'Silverleaf — Moshi', code: 'SL-MSH', region: 'Kilimanjaro', active: true },
  { id: 'sl-dodoma', name: 'Silverleaf — Dodoma', code: 'SL-DOD', region: 'Dodoma', active: true },
  { id: 'sl-mwanza', name: 'Silverleaf — Mwanza', code: 'SL-MWZ', region: 'Mwanza', active: true },
  { id: 'sl-zanzibar', name: 'Silverleaf — Zanzibar', code: 'SL-ZNZ', region: 'Zanzibar', active: true },
  { id: 'sl-mbeya', name: 'Silverleaf — Mbeya', code: 'SL-MBY', region: 'Mbeya', active: true },
];

/** Schools with imported master-sheet transport data */
export const schoolsWithTransportData = new Set(['sl-main']);

export function getSchool(id) {
  return schools.find((s) => s.id === id) ?? null;
}

export function resolveSchoolId(queryId) {
  if (queryId && getSchool(queryId)) return queryId;
  return 'sl-main';
}
