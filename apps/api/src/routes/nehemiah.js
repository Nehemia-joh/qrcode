import { Router } from 'express';
import { resolveSchoolId } from '../data/schools.js';
import {
  getNehemiahStats,
  getRecentAttendance,
  getFinanceAlerts,
  checkNehemiahConnection,
  testNehemiahDatabase,
  isNehemiahDbEnabled,
} from '../services/nehemiahBridge.js';
import { requireAdmin } from '../middleware/permissions.js';
import { notifyParentFeeAlert, getSmsLog, getSmsConfig } from '../services/smsService.js';
import { notifyParentFeeEmail, getEmailConfig } from '../services/emailService.js';
import { buildQrcodeSsoUrl, getQrcodeAppBaseUrl, getQrcodeQuickLinks } from '../services/qrcodeSsoService.js';

export const nehemiahRouter = Router();

nehemiahRouter.get('/qrcode/config', (_req, res) => {
  const base = getQrcodeAppBaseUrl();
  res.json({
    ok: true,
    configured: !!base,
    appUrl: base || null,
    links: getQrcodeQuickLinks(),
    hint: base
      ? null
      : 'Set NEHEMIAH_APP_URL in .env to link Transport login to legacy/qrcode (qrcode.zip).',
  });
});

/** One-click SSO into legacy PHP qrcode app (same username in both systems) */
nehemiahRouter.get('/sso-url', (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId);
  const returnTo = req.query.returnTo || 'index.php';
  const result = buildQrcodeSsoUrl(req.user, { schoolId, returnTo });
  if (!result.configured) {
    return res.status(503).json({ ok: false, ...result });
  }
  res.json({ ok: true, ...result });
});

nehemiahRouter.get('/status', async (_req, res) => {
  res.json({
    ok: true,
    dbEnabled: isNehemiahDbEnabled(),
    ...(await checkNehemiahConnection()),
  });
});

nehemiahRouter.post('/test-db', requireAdmin, async (_req, res) => {
  const result = await testNehemiahDatabase();
  res.status(result.ok ? 200 : 503).json(result);
});

nehemiahRouter.get('/stats', async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req.query.schoolId);
    const stats = await getNehemiahStats(schoolId);
    res.json({ ok: true, ...stats, schoolId, updatedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

nehemiahRouter.get('/attendance/recent', async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req.query.schoolId);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const data = await getRecentAttendance(limit, schoolId);
    res.json({ ok: true, schoolId, ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

nehemiahRouter.get('/finance-alerts', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    res.json({ ok: true, ...(await getFinanceAlerts(limit)) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

nehemiahRouter.get('/sms/config', (_req, res) => {
  res.json({ ok: true, ...getSmsConfig(), email: getEmailConfig() });
});

nehemiahRouter.get('/sms/log', requireAdmin, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json({ log: getSmsLog(limit) });
});

nehemiahRouter.post('/sms/notify', requireAdmin, async (req, res) => {
  try {
    const { studentId, parentPhone, fullName, balance } = req.body;
    const result = await notifyParentFeeAlert({
      studentId,
      parentPhone,
      full_name: fullName,
      balance,
    });
    res.json({ ok: true, result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

nehemiahRouter.post('/sms/notify-batch', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const { alerts } = await getFinanceAlerts(limit);
    const results = [];
    const errors = [];
    for (const student of alerts) {
      try {
        const result = await notifyParentFeeAlert(student);
        results.push({ studentId: student.studentId, ok: true, result });
      } catch (e) {
        errors.push({ studentId: student.studentId, error: e.message });
      }
    }
    res.json({
      ok: true,
      sent: results.length,
      failed: errors.length,
      results,
      errors,
      provider: getSmsConfig().provider,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
