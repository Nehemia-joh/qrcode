# Linking Nehemiah MySQL (when UI is ready)

The app works without MySQL (Google Sheets + webhooks). When you are ready:

## 1. Configure `.env`

```env
NEHEMIAH_DB_ENABLED=true
NEHEMIAH_DB_HOST=localhost
NEHEMIAH_DB_USER=bus_ops
NEHEMIAH_DB_PASSWORD=chance00
NEHEMIAH_DB_NAME=school_bus_tracking
NEHEMIAH_APP_URL=http://localhost/school-bus-tracking
```

Use the same database as `legacy/qrcode/config/database.php`. After `sudo bash scripts/setup-linux-qrcode.sh`, prefer **`bus_ops`** for the Node API (Ubuntu `root` often blocks TCP password login). PHP can keep using `root` / `chance00`.

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
