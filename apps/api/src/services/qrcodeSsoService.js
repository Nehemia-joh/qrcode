import crypto from 'crypto';

const SSO_TTL_SEC = Number(process.env.NEHMIAH_SSO_TTL_SEC || 300);

function getSsoSecret() {
  return process.env.NEHMIAH_SSO_SECRET || process.env.WEBHOOK_SECRET || 'dev-webhook-secret';
}

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Signed token Operations → legacy/qrcode PHP (sso.php) */
export function createQrcodeSsoToken(opsUser, schoolId = 'sl-main') {
  const payload = {
    username: opsUser.username,
    fullName: opsUser.fullName || opsUser.username,
    role: opsUser.role,
    opsUserId: opsUser.id,
    schoolId,
    exp: Math.floor(Date.now() / 1000) + SSO_TTL_SEC,
    jti: crypto.randomUUID(),
  };
  const body = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', getSsoSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function getQrcodeAppBaseUrl() {
  const url = process.env.NEHMIAH_APP_URL || process.env.QRCODE_APP_URL || '';
  return url.replace(/\/$/, '');
}

export function buildQrcodeSsoUrl(opsUser, { schoolId, returnTo } = {}) {
  const base = getQrcodeAppBaseUrl();
  if (!base) {
    return {
      configured: false,
      url: null,
      message: 'Set NEHEMIAH_APP_URL in .env to your qrcode PHP app (e.g. http://localhost/legacy/qrcode)',
    };
  }

  const token = createQrcodeSsoToken(opsUser, schoolId);
  const params = new URLSearchParams({ token });
  if (returnTo) params.set('return', returnTo);

  return {
    configured: true,
    url: `${base}/api/sso.php?${params.toString()}`,
    expiresInSeconds: SSO_TTL_SEC,
    username: opsUser.username,
    message: 'Opens Bus QR system logged in as matching qrcode user (same username).',
  };
}

export function getQrcodeQuickLinks() {
  const base = getQrcodeAppBaseUrl();
  if (!base) return [];
  return [
    { id: 'dashboard', label: 'QR Dashboard', path: 'index.php' },
    { id: 'students', label: 'Students', path: 'finance/students.php' },
    { id: 'qrcodes', label: 'QR Codes', path: 'finance/qrcodes.php' },
    { id: 'attendance', label: 'Attendance', path: 'attendance/records.php' },
    { id: 'scan', label: 'Scan QR', path: 'attendance/scan.php' },
    { id: 'balances', label: 'Balances', path: 'finance/balances.php' },
  ].map((l) => ({ ...l, url: `${base}/${l.path}` }));
}
