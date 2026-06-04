import { Router } from 'express';
import { resolveSchoolId } from '../data/schools.js';
import { getSheetImportStatus } from '../services/sheetSyncService.js';
import { NOTIFICATION_CHANNELS, GOOGLE_SHEET_REFERENCE } from '../data/sheetCatalog.js';
import { getEmailConfig } from '../services/emailService.js';
import { getSmsConfig } from '../services/smsService.js';
import { getNotificationReadiness } from '../services/notificationReadiness.js';

export const systemRouter = Router();

systemRouter.get('/overview', (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId);
  const sheets = getSheetImportStatus(schoolId);
  res.json({
    product: 'Silverleaf Operations Manager',
    schoolId,
    googleSheet: GOOGLE_SHEET_REFERENCE,
    dataSources: {
      masterWorkbook: sheets.hasWorkbook
        ? { status: 'connected', ...sheets }
        : { status: 'missing', hint: 'Admin → Import transport .xlsx from Google Sheets' },
      liveAttendance: { status: 'webhook + sheet', api: '/api/attendance/live' },
      database: { status: 'deferred', note: 'Nehemiah MySQL — link after UI complete' },
    },
    notifications: {
      channels: NOTIFICATION_CHANNELS,
      email: getEmailConfig(),
      sms: getSmsConfig(),
    },
    backend: {
      api: 'Node.js Express (apps/api)',
      web: 'React Vite (apps/web)',
      legacy: 'PHP Nehemiah QR (legacy/qrcode) — reference + webhook',
      storage: 'JSON files in data/ (users, reports, assets, sheets, events)',
    },
  });
});

systemRouter.get('/sheet-map', (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId);
  res.json(getSheetImportStatus(schoolId));
});

systemRouter.get('/notifications', (_req, res) => {
  res.json(getNotificationReadiness());
});
