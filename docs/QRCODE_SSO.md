# Transport ↔ qrcode (Bus QR) single sign-on

When you are logged into **Silverleaf Operations → Transport**, you can open the **legacy qrcode PHP app** without logging in again.

## How it works

1. You log into Operations (`admin` / `admin123`).
2. Go to **Transport** — buttons appear: **Open Bus QR (qrcode)**, **QR codes**, **Scan attendance**.
3. Click a button → Operations API mints a **short-lived SSO token** (5 min).
4. Browser opens `legacy/qrcode/api/sso.php?token=...`
5. PHP verifies token, starts a **PHP session** for the **same username** in `school_bus_tracking.users`.
6. You land on the qrcode dashboard (students, QR codes, scan, etc.).

## Setup

### Operations `.env`

```env
NEHEMIAH_APP_URL=http://YOUR-SERVER/path/to/legacy/qrcode
NEHEMIAH_SSO_SECRET=your-shared-secret
```

Use the **public URL** where PHP runs (not file path).

Examples:
- Local XAMPP: `http://localhost/legacy/qrcode`
- Server: `https://bus.silverleaf.co.tz`

`NEHEMIAH_SSO_SECRET` must match PHP `OPS_SSO_SECRET` (defaults to same as `WEBHOOK_SECRET` in dev).

### PHP server (`legacy/qrcode/env.example`)

```env
OPS_SSO_SECRET=your-shared-secret
```

### Matching users

| Operations (`data/ops-users.json`) | qrcode (`users` table) |
|-----------------------------------|-------------------------|
| username `admin`                  | username `admin`        |

Usernames must **match**. Default qrcode admin: `admin` / `password` (see `first_database.sql`).

Operations default: `admin` / `admin123`.

## API

- `GET /api/nehemiah/qrcode/config` — is SSO configured?
- `GET /api/nehemiah/sso-url?returnTo=finance/qrcodes.php` — SSO link (JWT required)

## Security

- Token expires in 5 minutes.
- HMAC-SHA256 signed with shared secret.
- Only relative `return` paths allowed inside qrcode app.
