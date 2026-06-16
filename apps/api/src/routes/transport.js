import { Router } from 'express';
import { resolveSchoolId } from '../data/schools.js';
import { getTransportSummaryForSchool, invalidateTransportCache } from '../services/transportParser.js';
import { getTransportIncidents, getTransportFleet } from '../services/transportDetailsParser.js';
import { getTransportGps } from '../services/transportGpsParser.js';
import {
  getTransportBuses,
  getTransportBudget,
  getTransportQrStats,
} from '../services/transportExtrasParser.js';
import { requireAdmin } from '../middleware/permissions.js';
import { buildTransportSummaryPdf } from '../services/pdfReportService.js';
import { schoolsWithTransportData } from '../data/schools.js';
import { schoolHasSheetData } from '../services/sheetLoader.js';

export const transportRouter = Router();

transportRouter.get('/summary', (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId);
  const data = getTransportSummaryForSchool(schoolId);
  res.json({
    ...data,
    hasData: data.hasData !== false,
  });
});

transportRouter.get('/incidents', (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId);
  res.json(getTransportIncidents(schoolId));
});

transportRouter.get('/fleet', (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId);
  res.json(getTransportFleet(schoolId));
});

transportRouter.get('/gps', (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId);
  res.json(getTransportGps(schoolId));
});

transportRouter.get('/buses', (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId);
  res.json(getTransportBuses(schoolId));
});

transportRouter.get('/budget', (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId);
  res.json(getTransportBudget(schoolId));
});

transportRouter.get('/qr', async (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId);
  res.json(await getTransportQrStats(schoolId));
});

transportRouter.get('/export/pdf', requireAdmin, async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req.query.schoolId);
    const pdf = await buildTransportSummaryPdf(schoolId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="transport-summary-${schoolId}.pdf"`);
    res.send(pdf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Admin-only: refresh parsed data after sheet re-import */
transportRouter.post('/refresh', requireAdmin, (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId || req.body?.schoolId);
  invalidateTransportCache(schoolId);
  if (schoolHasSheetData(schoolId)) schoolsWithTransportData.add(schoolId);
  const data = getTransportSummaryForSchool(schoolId);
  res.json({
    ok: true,
    message: 'Transport data refreshed from master sheet.',
    schoolId,
    hasData: !!data.kpis?.length,
  });
});
