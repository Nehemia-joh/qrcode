import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, '../../../../data/ops-maintenance.json');

const STATUSES = ['open', 'scheduled', 'in_progress', 'completed', 'cancelled'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

function ensure() {
  const dir = dirname(FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(FILE)) writeFileSync(FILE, '[]', 'utf8');
}

function load() {
  ensure();
  return JSON.parse(readFileSync(FILE, 'utf8'));
}

function save(items) {
  ensure();
  writeFileSync(FILE, JSON.stringify(items, null, 2), 'utf8');
}

export function listMaintenance({ schoolId, assetId, status } = {}) {
  let items = load().filter((m) => m.status !== 'deleted');
  if (schoolId) items = items.filter((m) => m.schoolId === schoolId);
  if (assetId) items = items.filter((m) => m.assetId === assetId);
  if (status) items = items.filter((m) => m.status === status);
  return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function createMaintenance(payload, user) {
  const items = load();
  const ticket = {
    id: randomUUID(),
    schoolId: payload.schoolId,
    assetId: payload.assetId || null,
    assetTag: payload.assetTag || null,
    title: String(payload.title || '').trim().slice(0, 200),
    description: String(payload.description || '').trim().slice(0, 5000),
    priority: PRIORITIES.includes(payload.priority) ? payload.priority : 'normal',
    status: 'open',
    campus: payload.campus || null,
    createdBy: user.id,
    createdByName: user.fullName,
    assignedTo: null,
    scheduledDate: payload.scheduledDate || null,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (!ticket.title) throw new Error('Title is required');
  items.push(ticket);
  save(items);
  return ticket;
}

export function updateMaintenance(id, patch, user) {
  const items = load();
  const idx = items.findIndex((m) => m.id === id);
  if (idx < 0) throw new Error('Ticket not found');
  const m = items[idx];
  if (patch.status && STATUSES.includes(patch.status)) {
    m.status = patch.status;
    if (patch.status === 'completed') m.completedAt = new Date().toISOString();
  }
  if (patch.priority && PRIORITIES.includes(patch.priority)) m.priority = patch.priority;
  if (patch.assignedTo != null) m.assignedTo = patch.assignedTo;
  if (patch.scheduledDate != null) m.scheduledDate = patch.scheduledDate;
  if (patch.description != null) m.description = String(patch.description).slice(0, 5000);
  m.updatedAt = new Date().toISOString();
  m.updatedBy = user.id;
  items[idx] = m;
  save(items);
  return m;
}

export { STATUSES, PRIORITIES };
