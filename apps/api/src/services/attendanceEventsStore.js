import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, '../../../../data/attendance-events.json');
const MAX_EVENTS = 2000;

function ensure() {
  const dir = dirname(FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(FILE)) writeFileSync(FILE, '[]', 'utf8');
}

function load() {
  ensure();
  return JSON.parse(readFileSync(FILE, 'utf8'));
}

function save(events) {
  ensure();
  writeFileSync(FILE, JSON.stringify(events.slice(0, MAX_EVENTS), null, 2), 'utf8');
}

export function recordAttendanceEvent(payload) {
  const events = load();
  const event = {
    id: randomUUID(),
    studentId: payload.student_id || payload.studentId || null,
    fullName: payload.full_name || payload.fullName || 'Unknown',
    attendanceType: payload.attendance_type || payload.attendanceType || 'scan',
    attendanceTime: payload.attendance_time || payload.attendanceTime || new Date().toISOString(),
    isInCredit: !!(payload.is_in_credit ?? payload.isInCredit),
    balance: payload.current_balance ?? payload.balance ?? null,
    busNumber: payload.bus_number || payload.busNumber || null,
    parentPhone: payload.parent_phone || payload.parentPhone || null,
    schoolId: payload.school_id || payload.schoolId || 'sl-main',
    source: payload.source || 'webhook',
    receivedAt: new Date().toISOString(),
  };
  events.unshift(event);
  save(events);
  return event;
}

export function getRecentEvents(limit = 20, schoolId) {
  let events = load();
  if (schoolId) events = events.filter((e) => e.schoolId === schoolId);
  return events.slice(0, limit);
}

export function getTodayCount(schoolId) {
  const today = new Date().toISOString().slice(0, 10);
  return getRecentEvents(500, schoolId).filter((e) =>
    String(e.attendanceTime).startsWith(today)
  ).length;
}
