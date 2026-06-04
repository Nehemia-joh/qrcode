# Production deployment checklist

## 1. Environment (`.env`)

Copy `.env.example` → `.env` and set:

| Variable | Production |
|----------|------------|
| `JWT_SECRET` | 32+ random characters |
| `WEBHOOK_SECRET` | Strong secret (match Nehemiah PHP) |
| `OPS_ADMIN_PASSWORD` | Change from default |
| `EMAIL_PROVIDER` | `smtp` + `SMTP_*` |
| `SMS_PROVIDER` | `twilio` or `africas_talking` |
| `NEHEMIAH_DB_ENABLED` | `true` when MySQL ready |

## 2. Nehemiah PHP server

Copy `legacy/qrcode/env.example` → `.env` on PHP host:

```
OPS_WEBHOOK_URL=https://your-ops-domain/api/webhooks/attendance
OPS_WEBHOOK_SECRET=<same as Operations>
OPS_SCHOOL_ID=sl-main
```

Test: `bash scripts/test-webhook.sh`

## 3. Docker

```bash
docker compose up --build -d
```

- Web: port **8080**
- API: port **4000**
- Mount `./data` (included in compose)

## 4. Backups

```bash
bash scripts/backup-data.sh
# or cron: 0 2 * * * /path/to/scripts/backup-data.sh
```

## 5. HTTPS

Put Caddy/nginx in front of web (8080) and API (4000). Update `apps/api` CORS origins in `src/index.js` for your domain.

## 6. Verify

- Login → change admin password
- Settings → notification readiness
- Settings → Test MySQL (when enabled)
- Admin → Test webhook scan
- Load data → import transport `.xlsx`
