import { Router } from 'express';
import { handleAttendanceWebhook } from '../services/webhookAttendanceService.js';

export const webhooksRouter = Router();

webhooksRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    endpoint: 'POST /api/webhooks/attendance',
    feeNotifyOnScan: process.env.AUTO_FEE_NOTIFY_ON_SCAN !== 'false',
  });
});

/** Public endpoint for Nehemiah PHP / mobile app — secured by shared secret */
webhooksRouter.post('/attendance', async (req, res) => {
  const secret = process.env.WEBHOOK_SECRET || 'dev-webhook-secret';
  const provided = req.headers['x-webhook-secret'] || req.query.secret;

  if (!provided || provided !== secret) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  try {
    const { event, notify, inCredit } = await handleAttendanceWebhook(req.body);
    res.status(201).json({ ok: true, event, inCredit, notify });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
