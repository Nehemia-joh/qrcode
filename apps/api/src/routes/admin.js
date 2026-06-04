import { Router } from 'express';
import multer from 'multer';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { requireUserAdmin, requireAdmin } from '../middleware/permissions.js';
import { listUsers, createUser, updateUser } from '../auth/userStore.js';
import { ROLES } from '../auth/roles.js';
import { invalidateTransportCache } from '../services/transportParser.js';
import { schoolsWithTransportData } from '../data/schools.js';
import { schoolHasSheetData } from '../services/sheetLoader.js';
import { afterWorkbookImport, getSheetImportStatus } from '../services/sheetSyncService.js';
import {
  recordImport,
  getImportHistory,
  getLastImportsForSchool,
  getStaleDays,
  isImportStale,
} from '../services/importLogStore.js';
import { resolveSchoolId } from '../data/schools.js';
import { GOOGLE_SHEET_REFERENCE } from '../data/sheetCatalog.js';
import { handleAttendanceWebhook } from '../services/webhookAttendanceService.js';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../../../');
const UPLOAD_DIR = join(ROOT, 'data/uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `transport_${Date.now()}_${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/\.xlsx?$/i.test(file.originalname)) {
      return cb(new Error('Only Excel (.xlsx) files are allowed'));
    }
    cb(null, true);
  },
});

export const adminRouter = Router();

/** How to load data + current import health for a school */
adminRouter.post('/test-webhook', requireAdmin, async (req, res) => {
  try {
    const result = await handleAttendanceWebhook({
      student_id: req.body.studentId || 'ADMIN-TEST-001',
      full_name: req.body.fullName || 'Admin Webhook Test',
      attendance_type: 'morning_pickup',
      is_in_credit: req.body.isInCredit !== false ? 1 : 0,
      current_balance: req.body.balance ?? -10000,
      parent_phone: req.body.parentPhone || '0712345678',
      parent_email: req.body.parentEmail || null,
      school_id: req.body.schoolId || 'sl-main',
      source: 'admin_test',
    });
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

adminRouter.get('/import/status', requireAdmin, (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId);
  const sheetMap = getSheetImportStatus(schoolId);
  const lastImports = getLastImportsForSchool(schoolId);
  const transportAt = sheetMap.lastImportAt || lastImports.transport?.at;

  res.json({
    schoolId,
    googleSheet: GOOGLE_SHEET_REFERENCE,
    sheetMap,
    lastImports,
    history: getImportHistory(schoolId, 10),
    stale: {
      transport: isImportStale(transportAt),
      staleAfterDays: getStaleDays(),
      lastImportAt: transportAt,
    },
    loadMethods: [
      {
        id: 'transport-xlsx',
        label: 'Transport master workbook',
        how: 'Google Sheets → Download .xlsx → Admin → Import → Transport',
        route: '/admin/import',
        roles: ['admin'],
      },
      {
        id: 'module-xlsx',
        label: 'Kitchen / Farm / Facilities workbooks',
        how: 'Same flow; pick module on Import page (needs Dashboard tab with KPIs)',
        route: '/admin/import',
        roles: ['admin'],
      },
      {
        id: 'staff-report',
        label: 'Staff incident / ops reports',
        how: 'Reports page → New report (all logged-in users)',
        route: '/reports',
        roles: ['admin', 'viewer', 'staff'],
      },
      {
        id: 'facilities-assets',
        label: 'Facilities assets & QR labels',
        how: 'Facilities → Assets → Add asset (admin)',
        route: '/facilities/assets',
        roles: ['admin'],
      },
      {
        id: 'maintenance',
        label: 'Maintenance tickets',
        how: 'Facilities → Maintenance → New ticket',
        route: '/facilities/maintenance',
        roles: ['admin', 'viewer'],
      },
      {
        id: 'webhook-attendance',
        label: 'Live QR attendance scans',
        how: 'Nehemiah PHP posts to /api/webhooks/attendance (or sheet rows on transport import)',
        route: null,
        roles: ['system'],
      },
    ],
  });
});

adminRouter.get('/users', requireUserAdmin, (_req, res) => {
  res.json({ users: listUsers(), roles: Object.values(ROLES) });
});

adminRouter.post('/users', requireUserAdmin, (req, res) => {
  try {
    const { username, password, email, fullName, role, schoolIds } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const user = createUser({
      username: username.trim(),
      password,
      email,
      fullName,
      role: role || ROLES.VIEWER,
      schoolIds,
    });
    res.status(201).json({ user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

adminRouter.patch('/users/:id', requireUserAdmin, (req, res) => {
  try {
    const user = updateUser(req.params.id, req.body);
    res.json({ user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

async function runSheetImport(filePath, outDir) {
  const script = join(ROOT, 'scripts/extract_google_sheet.py');
  await execFileAsync('python3', [script, '--xlsx', filePath, '--output', outDir], {
    cwd: ROOT,
    timeout: 120000,
  });
}

adminRouter.post('/import/transport-sheet', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
  }

  const schoolId = req.body.schoolId || 'sl-main';

  try {
    const outDir = join(ROOT, 'data/schools', schoolId, 'sheets');
    await runSheetImport(req.file.path, outDir);
    const sync = afterWorkbookImport(schoolId);
    recordImport({
      schoolId,
      module: 'transport',
      filename: req.file.originalname,
      wiredCount: sync.wiredCount,
      totalTabs: sync.totalTabs,
      attendanceSynced: sync.attendanceSynced,
    });

    res.json({
      ok: true,
      message: sync.message,
      schoolId,
      module: 'transport',
      file: req.file.filename,
      sheetMap: sync,
      lastImportAt: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: 'Import failed', detail: e.message });
  }
});

adminRouter.post('/import/module-sheet', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
  }

  const schoolId = req.body.schoolId || 'sl-main';
  const moduleId = req.body.moduleId;
  if (!['kitchen', 'farm', 'facilities'].includes(moduleId)) {
    return res.status(400).json({ error: 'moduleId must be kitchen, farm, or facilities' });
  }

  try {
    const outDir = join(ROOT, 'data/schools', schoolId, moduleId);
    await runSheetImport(req.file.path, outDir);
    recordImport({
      schoolId,
      module: moduleId,
      filename: req.file.originalname,
    });

    res.json({
      ok: true,
      message: `${moduleId} master sheet imported.`,
      schoolId,
      module: moduleId,
      file: req.file.filename,
      lastImportAt: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: 'Import failed', detail: e.message });
  }
});
