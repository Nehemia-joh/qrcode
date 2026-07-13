#!/usr/bin/env bash
# Check why Bus QR may not load (no sudo required)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LINK="/var/www/html/school-bus-tracking"
# shellcheck source=lib/load-env.sh
source "$ROOT/scripts/lib/load-env.sh"
load_project_env "$ROOT"
DB_PASS="${NEHEMIAH_DB_PASSWORD:-${DB_PASS:-chance00}}"

echo "=== Bus QR diagnostics ==="
echo ""

# Nginx path (needs sudo setup)
if [[ -L "$LINK" ]]; then
  echo "OK:  $LINK → $(readlink -f "$LINK")"
elif [[ -e "$LINK" ]]; then
  echo "WARN: $LINK exists but is not a symlink"
else
  echo "MISS: $LINK (run: sudo bash scripts/fix-bus-qr.sh)"
fi

if [[ -L /etc/nginx/sites-enabled/school-bus-tracking ]]; then
  echo "OK:  Nginx site school-bus-tracking enabled"
else
  echo "MISS: Nginx school-bus-tracking site (still using default → 404 for /school-bus-tracking/)"
fi

code80=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/school-bus-tracking/index.php" 2>/dev/null || echo "000")
code81=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8081/" 2>/dev/null || echo "000")
echo ""
echo "http://localhost/school-bus-tracking/  → HTTP $code80"
echo "http://localhost:8081/                 → HTTP $code81 (dev fallback)"

if mysql -u bus_ops -p"${DB_PASS}" -e "SELECT 1" school_bus_tracking 2>/dev/null; then
  echo "OK:  MySQL bus_ops → school_bus_tracking"
else
  echo "MISS: MySQL bus_ops (check NEHEMIAH_DB_PASSWORD in .env)"
fi

if [[ "$code80" == "404" && -L "$LINK" ]]; then
  echo ""
  echo "WARN: Nginx symlink exists but returns 404 — www-data cannot read $ROOT"
  echo "  Fix: chmod o+x /home/kiki /home/kiki/Documents /home/kiki/Documents/Operations_system"
  echo "  Or:  sudo bash scripts/fix-bus-qr.sh"
fi

echo ""
echo "Quick fix without sudo:"
echo "  bash scripts/start-qrcode-server.sh"
echo "  Use http://localhost:8081/  (set NEHEMIAH_APP_URL=http://localhost:8081 in .env)"
echo ""
echo "Permanent fix (needs your password):"
echo "  cd $ROOT"
echo "  sudo bash scripts/fix-bus-qr.sh"
