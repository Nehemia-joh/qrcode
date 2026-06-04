import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = join(__dirname, '../../../../data/email-log.json');

function ensureLog() {
  const dir = dirname(LOG_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(LOG_FILE)) writeFileSync(LOG_FILE, '[]', 'utf8');
}

function appendLog(entry) {
  ensureLog();
  const log = JSON.parse(readFileSync(LOG_FILE, 'utf8'));
  log.unshift({ ...entry, at: new Date().toISOString() });
  writeFileSync(LOG_FILE, JSON.stringify(log.slice(0, 500), null, 2), 'utf8');
}

function getOpsEmail() {
  return process.env.OPS_NOTIFY_EMAIL || 'operations@silverleaf.ac.tz';
}

async function sendViaSmtp({ to, subject, text, html }) {
  const host = process.env.SMTP_HOST;
  if (!host) throw new Error('SMTP not configured');
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
      : undefined,
  });
  const from = process.env.SMTP_FROM || 'Silverleaf Operations <noreply@silverleaf.ac.tz>';
  return transporter.sendMail({ from, to, subject, text, html });
}

export async function sendEmail({ to, subject, text, html, meta = {} }) {
  const recipient = to || getOpsEmail();
  if (!recipient) throw new Error('No recipient');

  const provider = process.env.EMAIL_PROVIDER || 'mock';

  try {
    if (provider === 'smtp' && process.env.SMTP_HOST) {
      await sendViaSmtp({ to: recipient, subject, text, html: html || text });
      appendLog({ to: recipient, subject, meta, provider: 'smtp' });
      return { ok: true, provider: 'smtp', to: recipient };
    }
  } catch (e) {
    console.warn('[email] SMTP failed, falling back to mock:', e.message);
  }

  console.log(`[email:mock] → ${recipient}: ${subject}`);
  appendLog({ to: recipient, subject, text: text?.slice(0, 200), meta, provider: 'mock' });
  return { ok: true, provider: 'mock', to: recipient, simulated: true };
}

export async function notifyOpsNewReport(report, schoolName) {
  const subject = `[Ops] New report: ${report.title}`;
  const text = [
    `School: ${schoolName}`,
    `Category: ${report.category}`,
    `From: ${report.createdByName}`,
    `Campus: ${report.campus || '—'}`,
    '',
    report.description,
    '',
    'Open Operations Manager → Reports to triage.',
  ].join('\n');
  return sendEmail({ to: getOpsEmail(), subject, text, meta: { type: 'staff_report', reportId: report.id } });
}

export async function notifyParentFeeEmail(student) {
  const email = student.parentEmail || student.parent_email;
  if (!email) throw new Error('No parent email on file');
  const balance = Math.abs(Number(student.balance ?? student.current_balance ?? 0));
  const subject = 'Silverleaf Transport — fee balance notice';
  const text =
    process.env.EMAIL_FEE_TEMPLATE ||
    `Dear parent,\n\nTransport fee balance for ${student.fullName || student.full_name} is TZS ${balance.toLocaleString()}. Please contact the school office.\n\nSilverleaf Academy`;
  return sendEmail({ to: email, subject, text: text.replace('{name}', student.fullName || ''), meta: { type: 'fee_alert' } });
}

export function getEmailConfig() {
  const provider = process.env.EMAIL_PROVIDER || 'mock';
  const missing = [];
  if (provider === 'smtp') {
    if (!process.env.SMTP_HOST) missing.push('SMTP_HOST');
  }
  return {
    provider,
    opsNotifyEmail: getOpsEmail(),
    smtpConfigured: !!process.env.SMTP_HOST,
    productionReady: provider === 'smtp' && !!process.env.SMTP_HOST && missing.length === 0,
    missingEnv: missing,
  };
}
