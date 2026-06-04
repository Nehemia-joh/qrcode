import { Router } from 'express';
import { schools, schoolsWithTransportData } from '../data/schools.js';
import { schoolHasSheetData } from '../services/sheetLoader.js';
import { getSchoolCampusMeta, NETWORK_SCHOOL_ID } from '../data/schoolCampusMap.js';

export const schoolsRouter = Router();

schoolsRouter.get('/', (_req, res) => {
  for (const s of schools) {
    if (schoolHasSheetData(s.id)) schoolsWithTransportData.add(s.id);
  }

  const enriched = schools.map((s) => {
    const meta = getSchoolCampusMeta(s.id);
    return {
      ...s,
      hasTransportData: schoolHasSheetData(s.id) || schoolsWithTransportData.has(s.id),
      campusKey: meta.campusKey ?? null,
      isNetwork: s.id === NETWORK_SCHOOL_ID || meta.isNetwork,
      inheritsSheetFrom: meta.inheritsSheetFrom ?? null,
    };
  });

  const network = enriched.filter((s) => s.isNetwork);
  const campuses = enriched.filter((s) => s.inheritsSheetFrom === NETWORK_SCHOOL_ID);
  const other = enriched.filter((s) => !s.isNetwork && !s.inheritsSheetFrom);

  res.json({
    schools: enriched,
    count: schools.length,
    groups: [
      { id: 'network', label: 'Silverleaf (all campuses)', schools: network },
      { id: 'campuses', label: 'Campuses in master sheet', schools: campuses },
      { id: 'other', label: 'Other locations (own workbook)', schools: other },
    ],
    dataModel: {
      masterSheet: 'One transport workbook with columns per campus (Usariver, Arusha Modern, Kijenge, …)',
      perCampus: 'Select a campus school to see only that column',
      group: 'Select Silverleaf — All Campuses for network totals and campus comparison',
    },
  });
});
