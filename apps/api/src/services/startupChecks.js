import { getNotificationReadiness } from './notificationReadiness.js';
import { checkNehemiahConnection, isNehemiahDbEnabled } from './nehemiahBridge.js';

export async function logStartupStatus() {
  const n = getNotificationReadiness();
  const neh = await checkNehemiahConnection();

  console.log('[startup] Webhook: POST /api/webhooks/attendance');
  console.log(
    `[startup] Fee notify on scan: ${process.env.AUTO_FEE_NOTIFY_ON_SCAN !== 'false' ? 'on' : 'off'}`
  );
  console.log(
    `[startup] Email: ${n.email.provider}${n.email.productionReady ? ' (production ready)' : ''}`
  );
  console.log(`[startup] SMS: ${n.sms.provider}${n.sms.productionReady ? ' (production ready)' : ''}`);
  console.log(
    `[startup] MySQL: ${isNehemiahDbEnabled() ? (neh.connected ? `connected (${neh.mode})` : 'configured but not connected') : 'disabled (sheet mode)'}`
  );

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      console.warn('[startup] WARN: Set a strong JWT_SECRET (32+ chars) in production');
    }
    if (process.env.WEBHOOK_SECRET === 'dev-webhook-secret') {
      console.warn('[startup] WARN: Change WEBHOOK_SECRET from default in production');
    }
  }
}
