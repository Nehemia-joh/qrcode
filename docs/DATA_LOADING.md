# Loading data into Silverleaf Operations Manager

You **can** load data without connecting MySQL. Use the UI (admin) or automated feeds (webhooks).

## 1. Google Sheets → Excel upload (main KPI data)

1. Open the [Transport Master Sheet](https://docs.google.com/spreadsheets/d/1BDkvHWhJnJXS9vx1c2reyXkab494ZF7bji8z76Ck-mw/edit) (or your school copy).
2. **File → Download → Microsoft Excel (.xlsx)**
3. Log in as **admin** → **Load data** (`/admin/import`)
4. Choose module (Transport, Kitchen, Farm, Facilities), confirm school, upload file.
5. Dashboards refresh immediately; transport import also syncs AttendanceA/B into the live feed.

Re-import monthly (or when the sheet changes). After 30 days without import, admins see a stale-data reminder (`IMPORT_STALE_DAYS` in `.env`).

## 2. Staff reports

Any logged-in user: **Reports → New report**. Ops receives email (`OPS_NOTIFY_EMAIL`).

## 3. Facilities

- **Assets** — admin adds equipment and QR labels.
- **Maintenance** — tickets from Facilities → Maintenance.

## 4. Live QR attendance

- **Webhook** — Nehemiah PHP → `POST /api/webhooks/attendance` with `X-Webhook-Secret` (see `legacy/qrcode/api/webhook-forward.php`).
- **Sheet rows** — AttendanceA/B tabs are pushed on transport import.

## 5. Command line (developers)

```bash
python3 scripts/extract_google_sheet.py --xlsx /path/to/workbook.xlsx --output data/sheets
```

## Deferred

- **Nehemiah MySQL** — live student balances, parent phones, full QR history after UI sign-off.

## API

- `GET /api/admin/import/status?schoolId=` — import health, history, load methods
- `POST /api/admin/import/transport-sheet` — multipart field `file`, body `schoolId`
- `POST /api/admin/import/module-sheet` — `file`, `schoolId`, `moduleId`
