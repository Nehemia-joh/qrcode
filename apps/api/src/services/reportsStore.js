import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../../../data');
const REPORTS_FILE = join(DATA_DIR, 'ops-reports.json');

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const CATEGORIES = ['transport', 'kitchen', 'facilities', 'farm', 'security', 'other'];

function ensure() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(REPORTS_FILE)) writeFileSync(REPORTS_FILE, '[]', 'utf8');
}

function load() {
  ensure();
  return JSON.parse(readFileSync(REPORTS_FILE, 'utf8'));
}

function save(reports) {
  ensure();
  writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf8');
}

export function listReports({ schoolId, status } = {}) {
  let reports = load();
  if (schoolId) reports = reports.filter((r) => r.schoolId === schoolId || r.schoolId === '*');
  if (status) reports = reports.filter((r) => r.status === status);
  return reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function createReport(payload, user, hooks = {}) {
  const report = {
    id: randomUUID(),
    schoolId: payload.schoolId || 'sl-main',
    category: CATEGORIES.includes(payload.category) ? payload.category : 'other',
    title: String(payload.title || '').trim().slice(0, 200),
    description: String(payload.description || '').trim().slice(0, 5000),
    campus: payload.campus || null,
    status: 'open',
    priority: payload.priority || 'normal',
    createdBy: user.id,
    createdByName: user.fullName,
    assignedTo: null,
    adminNotes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (!report.title) throw new Error('Title is required');
  const reports = load();
  reports.push(report);
  save(reports);
  if (hooks.onCreated) {
    try {
      await hooks.onCreated(report);
    } catch (e) {
      console.warn('[reports] notification hook failed:', e.message);
    }
  }
  return report;
}

export function updateReport(id, patch, user) {
  const reports = load();
  const idx = reports.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error('Report not found');

  const r = reports[idx];
  if (patch.status && STATUSES.includes(patch.status)) r.status = patch.status;
  if (patch.adminNotes != null) r.adminNotes = String(patch.adminNotes).slice(0, 5000);
  if (patch.assignedTo != null) r.assignedTo = patch.assignedTo;
  if (patch.priority) r.priority = patch.priority;
  r.updatedAt = new Date().toISOString();
  r.updatedBy = user.id;

  reports[idx] = r;
  save(reports);
  return r;
}

export { STATUSES, CATEGORIES };
