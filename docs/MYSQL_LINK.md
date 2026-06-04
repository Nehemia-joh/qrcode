# Linking Nehemiah MySQL (when UI is ready)

The app works without MySQL (Google Sheets + webhooks). When you are ready:

## 1. Configure `.env`

```env
NEHEMIAH_DB_ENABLED=true
NEHEMIAH_DB_HOST=localhost
NEHEMIAH_DB_USER=your_user
NEHEMIAH_DB_PASSWORD=your_password
NEHEMIAH_DB_NAME=school_bus_tracking
```

Use the same database as `legacy/qrcode/config/database.php`.

Set `NEHEMIAH_DB_ENABLED=false` to force sheet-only mode even if host is set.

## 2. Test in the app

**Settings → Test MySQL connection** (admin), or:

```bash
curl -X POST http://localhost:4000/api/nehemiah/test-db \
  -H "Authorization: Bearer $TOKEN"
```

## 3. What unlocks

- Live QR stats and recent scans from `attendance_records` / `students`
- Finance alerts and batch parent SMS from real balances
- No change to sheet import — both can run together

## 4. PHP webhook

Keep `OPS_WEBHOOK_*` on Nehemiah so Operations still receives scans in real time even with MySQL linked.
