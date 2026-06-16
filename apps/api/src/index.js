import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { transportRouter } from './routes/transport.js';
import { schoolsRouter } from './routes/schools.js';
import { operationsRouter } from './routes/operations.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { nehemiahRouter } from './routes/nehemiah.js';
import { reportsRouter } from './routes/reports.js';
import { modulesRouter } from './routes/modules.js';
import { facilitiesRouter } from './routes/facilities.js';
import { getSmsConfig } from './services/smsService.js';
import { webhooksRouter } from './routes/webhooks.js';
import { attendanceRouter } from './routes/attendance.js';
import { systemRouter } from './routes/system.js';
import { getEmailConfig } from './services/emailService.js';
import { logStartupStatus } from './services/startupChecks.js';
import { authenticate } from './middleware/authenticate.js';
import { attachPermissions } from './middleware/permissions.js';
import { requireSchoolAccess } from './middleware/permissions.js';

const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080'];

app.use(
  cors({
    origin: corsOrigins,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Secret'],
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'operations-manager-api', multiSchool: true, phase: 'unified' });
});

app.use('/api/webhooks', webhooksRouter);
app.use('/api/auth', authRouter);

app.use(authenticate);
app.use(attachPermissions);
app.use(requireSchoolAccess);

app.use('/api/schools', schoolsRouter);
app.use('/api/operations', operationsRouter);
app.use('/api/transport', transportRouter);
app.use('/api/nehemiah', nehemiahRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/modules', modulesRouter);
app.use('/api/facilities', facilitiesRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/system', systemRouter);
app.use('/api/admin', adminRouter);

app.listen(PORT, HOST, () => {
  console.log(`API listening on http://${HOST}:${PORT}`);
  const sms = getSmsConfig();
  console.log(`[sms] Provider: ${sms.provider}${sms.provider === 'mock' ? ' (logs to data/sms-log.json)' : ''}`);
  console.log('[webhook] POST /api/webhooks/attendance (X-Webhook-Secret)');
  const email = getEmailConfig();
  console.log(`[email] ${email.provider} → ${email.opsNotifyEmail}`);
  logStartupStatus().catch((e) => console.warn('[startup]', e.message));
});
