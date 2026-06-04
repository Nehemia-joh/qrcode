import { Router } from 'express';
import { resolveSchoolId } from '../data/schools.js';
import { getOperationsSummary, getNetworkRollup, getExecutiveSummary } from '../services/operationsAggregator.js';
import { requireAdmin } from '../middleware/permissions.js';
import { buildOperationsOverviewPdf } from '../services/pdfReportService.js';

export const operationsRouter = Router();

operationsRouter.get('/summary', (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId);
  res.json(getOperationsSummary(schoolId));
});

operationsRouter.get('/network', (_req, res) => {
  res.json(getNetworkRollup());
});

operationsRouter.get('/executive', (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId);
  res.json(getExecutiveSummary(schoolId));
});

operationsRouter.get('/export/pdf', requireAdmin, async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req.query.schoolId);
    const pdf = await buildOperationsOverviewPdf(schoolId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="operations-overview-${schoolId}.pdf"`);
    res.send(pdf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
