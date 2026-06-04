import { Router } from 'express';
import { resolveSchoolId } from '../data/schools.js';
import { requireAdmin } from '../middleware/permissions.js';
import { listReports, createReport, updateReport, STATUSES, CATEGORIES } from '../services/reportsStore.js';
import { notifyOpsNewReport } from '../services/emailService.js';
import { getSchool } from '../data/schools.js';

export const reportsRouter = Router();

reportsRouter.get('/', (req, res) => {
  const schoolId = req.query.schoolId ? resolveSchoolId(req.query.schoolId) : undefined;
  res.json({
    reports: listReports({ schoolId, status: req.query.status }),
    statuses: STATUSES,
    categories: CATEGORIES,
  });
});

reportsRouter.get('/summary', (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId);
  const reports = listReports({ schoolId });
  const open = reports.filter((r) => r.status === 'open' || r.status === 'in_progress').length;
  res.json({ schoolId, openCount: open, total: reports.length });
});

/** Any logged-in staff can raise an issue */
reportsRouter.post('/', async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req.body.schoolId || req.query.schoolId);
    const school = getSchool(schoolId);
    const report = await createReport({ ...req.body, schoolId }, req.user, {
      onCreated: async (r) => notifyOpsNewReport(r, school?.name || schoolId),
    });
    res.status(201).json({ report });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/** Admin updates status / notes */
reportsRouter.patch('/:id', requireAdmin, (req, res) => {
  try {
    const report = updateReport(req.params.id, req.body, req.user);
    res.json({ report });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
