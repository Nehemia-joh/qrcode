# Production email & SMS

## Email (staff reports, parent fee notices)

```env
EMAIL_PROVIDER=smtp
OPS_NOTIFY_EMAIL=operations@silverleaf.ac.tz
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=Silverleaf Operations <noreply@silverleaf.ac.tz>
```

Until SMTP is set, `EMAIL_PROVIDER=mock` logs to `data/email-log.json`.

## SMS (parent fee alerts)

**Twilio:**

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...
```

**Africa's Talking:**

```env
SMS_PROVIDER=africas_talking
AT_API_KEY=...
AT_USERNAME=...
```

Check readiness: **Settings** in the app or `GET /api/system/notifications`.
