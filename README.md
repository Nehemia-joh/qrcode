# Silverleaf Operations Manager

Multi-campus operations platform: **Transport**, **Kitchen**, **Facilities**, **Farm**.

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:5173/login** — default `admin` / `admin123` (change in production).

## School views

| Selection | Data |
|-----------|------|
| **Silverleaf — All Campuses** | Full group + campus comparison (one transport master sheet) |
| **Silverleaf — Usariver**, etc. | That campus column only |
| **Other regions** | Import dedicated `.xlsx` per school |

See `docs/DATA_MODEL_SCHOOLS.md`.

## Load data

1. Download transport master `.xlsx` from Google Sheets  
2. **Load data** (admin) → Transport → upload  
3. Kitchen/Farm/Facilities: use `npm run templates:modules` or your own workbook  

## Backlog scripts

```bash
npm run test:webhook    # Test attendance webhook
npm run backup:data     # Archive data/ folder
npm run templates:modules
```

## Nehemiah integration

| Piece | Doc |
|-------|-----|
| PHP → webhook | `docs/NEHEMIAH_WEBHOOK.md`, `legacy/qrcode/env.example` |
| MySQL (optional) | `docs/MYSQL_LINK.md` |
| Production | `docs/DEPLOYMENT.md` |

## Docker

```bash
docker compose up --build
# Web http://localhost:8080  API http://localhost:4000
```

## Project layout

| Path | Purpose |
|------|---------|
| `apps/api` | Node.js API |
| `apps/web` | React UI |
| `legacy/qrcode` | Nehemiah PHP QR/bus system |
| `data/` | Sheets JSON, users, logs |

## Features (unified)

- JWT auth, admin-only edits, role-based nav  
- Transport dashboards (summary, incidents, fleet, GPS, buses, budget, QR)  
- Group vs campus filtering from master sheet  
- Staff reports + email to ops  
- Facilities assets, maintenance, QR  
- Webhook attendance + optional fee SMS/email on scan  
- PDF export, import history, stale-data reminders  
- MySQL bridge when `NEHEMIAH_DB_ENABLED=true`  
