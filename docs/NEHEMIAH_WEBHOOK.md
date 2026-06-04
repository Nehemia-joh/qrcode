# Nehemiah PHP → Operations webhook

After each successful QR scan, `legacy/qrcode/api/attendance.php` forwards to Operations Manager (single and batch sync).

## PHP environment

Set on the Nehemiah server (Apache `SetEnv`, php-fpm pool, or `.env`):

```env
OPS_WEBHOOK_URL=http://your-ops-api:4000/api/webhooks/attendance
OPS_WEBHOOK_SECRET=same-as-WEBHOOK_SECRET-in-ops-.env
OPS_SCHOOL_ID=sl-main
OPS_WEBHOOK_ENABLED=true
```

Operations `.env`:

```env
WEBHOOK_SECRET=your-production-secret
```

## Verify

1. Record a test scan in Nehemiah (or POST to `attendance.php`).
2. Open **Transport → Summary** — live attendance panel, or `GET /api/attendance/live`.
3. Check `data/attendance-events.json` for `source: nehemiah_php`.

Implementation: `legacy/qrcode/includes/ops_webhook.php` (included from `attendance.php`).
