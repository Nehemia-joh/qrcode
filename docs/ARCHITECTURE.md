# Silverleaf Operations Manager — Architecture

## One system, three layers

```
┌─────────────────────────────────────────────────────────────┐
│  Google Sheets (Transport Master)                           │
│  Download .xlsx monthly → Admin Import                        │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  data/sheets/ or data/schools/{id}/sheets/*.json            │
│  (13 tabs extracted)                                        │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Node API (apps/api) — parsers per tab                      │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  React UI (apps/web) — dashboards by module                 │
└─────────────────────────────────────────────────────────────┘

     Nehemiah PHP (legacy) ──webhook──► attendance-events.json
     (database link later)              (no MySQL required now)
```

## Backend (`apps/api`)

| Area | Routes | Storage |
|------|--------|---------|
| Auth | `/api/auth/*` | `data/ops-users.json` |
| Schools | `/api/schools` | `src/data/schools.js` |
| Operations | `/api/operations/*` | Aggregated from parsers |
| Transport | `/api/transport/*` | Sheet JSON |
| Attendance | `/api/attendance/live` | `data/attendance-events.json` |
| Nehemiah | `/api/nehemiah/*` | Sheet fallback / DB later |
| Facilities | `/api/facilities/*` | `ops-assets.json`, `ops-maintenance.json` |
| Reports | `/api/reports/*` | `ops-reports.json` + email notify |
| System | `/api/system/*` | Sheet catalog metadata |
| Webhooks | `/api/webhooks/attendance` | Public + secret |
| Admin | `/api/admin/*` | Import, users |

## Notifications (unified, no DB)

| Event | Channel | Config |
|-------|---------|--------|
| Staff report | Email → ops | `OPS_NOTIFY_EMAIL`, `EMAIL_PROVIDER` |
| Parent fee | SMS + email | `SMS_PROVIDER`, SMTP optional |
| Attendance | Webhook | `WEBHOOK_SECRET` |

## Feedback checklist (done)

1. **Nehemiah webhook** — `attendance.php` → `ops_webhook.php` → `/api/webhooks/attendance`
2. **Production notifications** — SMTP/Twilio/AT via `.env`; readiness in Settings
3. **Kitchen/Farm/Facilities** — import + `data/seeds/` + `scripts/seed_module_dashboards.py`
4. **PDF export** — `/api/transport/export/pdf`, `/api/operations/export/pdf`
5. **MySQL (when ready)** — `NEHEMIAH_DB_ENABLED`, Settings test, `docs/MYSQL_LINK.md`

## Backlog status

| # | Item | Status |
|---|------|--------|
| 1 | Webhook + fee notify on scan | Done in API; set `legacy/qrcode/env.example` on PHP host |
| 2 | Production SMTP/SMS | Configure `.env`; check Settings |
| 3 | MySQL | `NEHEMIAH_DB_ENABLED=true` + Settings test |
| 4 | Module templates | `npm run templates:modules` → `data/templates/*.xlsx` |
| 5 | Regional imports | Per-school Load data |
| 6 | Deploy / backup | `docs/DEPLOYMENT.md`, `npm run backup:data` |
