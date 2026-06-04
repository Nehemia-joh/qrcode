import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = join(__dirname, '../../../../data/sms-log.json');

const PROVIDER = (process.env.SMS_PROVIDER || 'mock').toLowerCase();

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

function normalizePhone(phone) {
  let p = String(phone || '').replace(/\D/g, '');
  if (p.startsWith('0')) p = '255' + p.slice(1);
  if (!p.startsWith('255') && p.length === 9) p = '255' + p;
  return p;
}

function buildFeeMessage(student) {
  const balance = Math.abs(Number(student.balance ?? student.current_balance ?? 0));
  return (
    process.env.SMS_FEE_TEMPLATE ||
    `Silverleaf Transport: Fee balance for ${student.fullName || student.full_name} is TZS ${balance.toLocaleString()}. Please top up to avoid service interruption.`
  );
}

async function sendViaTwilio(phone, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    throw new Error('Twilio not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)');
  }
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const body = new URLSearchParams({ To: `+${phone}`, From: from, Body: message });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio error: ${err}`);
  }
  return { provider: 'twilio', sid: (await res.json()).sid };
}

async function sendViaAfricasTalking(phone, message) {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;
  if (!apiKey || !username) {
    throw new Error('Africa\'s Talking not configured (AT_API_KEY, AT_USERNAME)');
  }
  const body = new URLSearchParams({ username, to: `+${phone}`, message });
  const res = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: { apiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Africa's Talking error: ${await res.text()}`);
  return { provider: 'africas_talking' };
}

export async function sendSms({ phone, message, meta = {} }) {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 9) {
    throw new Error('Invalid parent phone number');
  }

  let result;
  if (PROVIDER === 'twilio') {
    result = await sendViaTwilio(normalized, message);
  } else if (PROVIDER === 'africas_talking' || PROVIDER === 'at') {
    result = await sendViaAfricasTalking(normalized, message);
  } else {
    result = { provider: 'mock', simulated: true };
    console.log(`[sms:mock] → +${normalized}: ${message.slice(0, 80)}…`);
  }

  appendLog({ phone: normalized, message, meta, ...result });
  return { ok: true, phone: normalized, ...result };
}

export async function notifyParentFeeAlert(student) {
  const phone = student.parentPhone || student.parent_phone;
  if (!phone) throw new Error('No parent phone on file');
  const message = buildFeeMessage(student);
  return sendSms({
    phone,
    message,
    meta: { type: 'fee_alert', studentId: student.studentId || student.student_id },
  });
}

export function getSmsLog(limit = 50) {
  ensureLog();
  return JSON.parse(readFileSync(LOG_FILE, 'utf8')).slice(0, limit);
}

export function getSmsConfig() {
  const missing = [];
  if (PROVIDER === 'twilio') {
    if (!process.env.TWILIO_ACCOUNT_SID) missing.push('TWILIO_ACCOUNT_SID');
    if (!process.env.TWILIO_AUTH_TOKEN) missing.push('TWILIO_AUTH_TOKEN');
    if (!process.env.TWILIO_FROM_NUMBER) missing.push('TWILIO_FROM_NUMBER');
  }
  if (PROVIDER === 'africas_talking' || PROVIDER === 'at') {
    if (!process.env.AT_API_KEY) missing.push('AT_API_KEY');
    if (!process.env.AT_USERNAME) missing.push('AT_USERNAME');
  }
  return {
    provider: PROVIDER,
    configured: PROVIDER === 'mock' || missing.length === 0,
    productionReady: PROVIDER !== 'mock' && missing.length === 0,
    missingEnv: missing,
  };
}
