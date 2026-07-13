#!/usr/bin/env bash
# Batch-write repo-root .env + legacy/qrcode/.env (preserves DB password / JWT if already set).
# Usage: bash scripts/sync-env.sh [--nginx | --dev | --auto]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/load-env.sh
source "$ROOT/scripts/lib/load-env.sh"
load_project_env "$ROOT"

MODE="${1:---auto}"
case "$MODE" in
  --nginx) BUS_BASE="http://localhost/school-bus-tracking" ;;
  --dev)   BUS_BASE="http://localhost:8081" ;;
  --auto)
    if curl -sf -o /dev/null "http://localhost/school-bus-tracking/index.php" 2>/dev/null; then
      BUS_BASE="http://localhost/school-bus-tracking"
    else
      BUS_BASE="http://localhost:8081"
    fi
    ;;
  -h|--help)
    echo "Usage: bash scripts/sync-env.sh [--nginx | --dev | --auto]"
    echo "  --nginx  permanent URL (after sudo bash scripts/fix-bus-qr.sh)"
    echo "  --dev    PHP built-in server on :8081"
    echo "  --auto   pick nginx if HTTP 200, else dev (default)"
    exit 0
    ;;
  *) echo "Unknown option: $MODE"; exit 1 ;;
esac

DB_PASS="${NEHEMIAH_DB_PASSWORD:-${DB_PASS:-chance00}}"
DB_USER="${NEHEMIAH_DB_USER:-${DB_USER:-bus_ops}}"
JWT_SECRET="${JWT_SECRET:-dev-silverleaf-ops-change-before-production}"
ADMIN_PASS="${OPS_ADMIN_PASSWORD:-admin123}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-dev-webhook-secret}"
SSO_SECRET="${NEHEMIAH_SSO_SECRET:-${OPS_SSO_SECRET:-$WEBHOOK_SECRET}}"

cat > "$ROOT/.env" <<EOF
# Operations API — local (gitignored). Regenerated: bash scripts/sync-env.sh

PORT=4000
JWT_SECRET=${JWT_SECRET}

OPS_ADMIN_USERNAME=admin
OPS_ADMIN_PASSWORD=${ADMIN_PASS}

NEHEMIAH_DB_ENABLED=true
NEHEMIAH_DB_HOST=localhost
NEHEMIAH_DB_USER=${DB_USER}
NEHEMIAH_DB_PASSWORD=${DB_PASS}
NEHEMIAH_DB_NAME=school_bus_tracking

OPS_APP_URL=http://localhost:8080

NEHEMIAH_APP_URL=${BUS_BASE}
NEHEMIAH_SSO_SECRET=${SSO_SECRET}
NEHEMIAH_API_BASE_URL=

SMS_PROVIDER=mock
SMS_FEE_TEMPLATE=Silverleaf Transport: Fee balance for {name} requires attention. Please contact the school office.

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

AT_API_KEY=
AT_USERNAME=

WEBHOOK_SECRET=${WEBHOOK_SECRET}
AUTO_FEE_NOTIFY_ON_SCAN=true
IMPORT_STALE_DAYS=30

EMAIL_PROVIDER=mock
OPS_NOTIFY_EMAIL=operations@silverleaf.ac.tz
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Silverleaf Operations <noreply@silverleaf.ac.tz>
EOF

cat > "$ROOT/legacy/qrcode/.env" <<EOF
# Bus QR PHP — local (gitignored). Regenerated: bash scripts/sync-env.sh

DB_HOST=localhost
DB_NAME=school_bus_tracking
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
SITE_URL=${BUS_BASE}/

OPS_APP_URL=http://localhost:8080
OPS_WEBHOOK_URL=http://localhost:4000/api/webhooks/attendance
OPS_WEBHOOK_SECRET=${WEBHOOK_SECRET}
OPS_SSO_SECRET=${SSO_SECRET}
OPS_SCHOOL_ID=sl-main
OPS_WEBHOOK_ENABLED=true
EOF

echo "=== Env synced (${MODE}) ==="
echo "  Operations:  $ROOT/.env"
echo "  Bus QR:      $ROOT/legacy/qrcode/.env"
echo "  Bus QR URL:  ${BUS_BASE}/"
echo "  MySQL:       ${DB_USER} / (password unchanged)"
if [[ "$BUS_BASE" == *":8081" ]]; then
  echo ""
  echo "  Nginx not detected — using dev :8081."
  echo "  After: sudo bash scripts/fix-bus-qr.sh"
  echo "  Then:  bash scripts/sync-env.sh --nginx"
fi
