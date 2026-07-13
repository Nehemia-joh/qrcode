#!/usr/bin/env bash
# Start Bus QR (Nginx or dev :8081) + Operations (API :4000, web :8080).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=lib/load-env.sh
source "$ROOT/scripts/lib/load-env.sh"
load_project_env "$ROOT"

# Keep Bus QR + Operations URLs aligned before start
bash "$ROOT/scripts/sync-env.sh" --auto >/dev/null

ops_running() {
  curl -sf -o /dev/null "http://localhost:4000/api/health" 2>/dev/null \
    || curl -sf -o /dev/null "http://localhost:8080/" 2>/dev/null
}

bus_running() {
  curl -sf -o /dev/null "http://localhost/school-bus-tracking/index.php" 2>/dev/null \
    || curl -sf -o /dev/null "http://localhost:${QRCODE_PORT:-8081}/" 2>/dev/null
}

if ops_running; then
  echo "Operations already running:"
  echo "  http://localhost:8080/login"
  if bus_running; then
    if curl -sf -o /dev/null "http://localhost/school-bus-tracking/index.php" 2>/dev/null; then
      echo "Bus QR (Nginx): http://localhost/school-bus-tracking/"
    else
      echo "Bus QR (dev):   http://localhost:${QRCODE_PORT:-8081}/"
    fi
  else
    echo "Bus QR not responding — start: bash scripts/start-qrcode-server.sh"
  fi
  exit 0
fi

if fuser 4000/tcp 8080/tcp >/dev/null 2>&1; then
  echo "Ports 4000/8080 in use but Operations not healthy. Run:"
  echo "  bash scripts/stop-all.sh && bash scripts/start-all.sh"
  exit 1
fi

BUS_URL="http://localhost/school-bus-tracking/index.php"
if curl -sf -o /dev/null "$BUS_URL" 2>/dev/null; then
  echo "Bus QR (Nginx): http://localhost/school-bus-tracking/"
  echo "Operations:     http://localhost:8080/login"
  exec npm run start:fast
fi

PORT="${QRCODE_PORT:-8081}"
DEV_URL="http://localhost:${PORT}/"
if curl -sf -o /dev/null "$DEV_URL" 2>/dev/null; then
  echo "Bus QR (dev, already running): $DEV_URL"
  echo "Operations:                  http://localhost:8080/login"
  exec npm run start:fast
fi

echo "Bus QR (Nginx) not found — starting dev server on :${PORT}"
echo "  Tip: sudo bash scripts/fix-bus-qr.sh for http://localhost/school-bus-tracking/"
echo "Operations: http://localhost:8080/login"
echo ""

if command -v concurrently >/dev/null 2>&1 || [[ -f "$ROOT/node_modules/.bin/concurrently" ]]; then
  exec npx concurrently -n qrcode,ops -c magenta,blue \
    "bash scripts/start-qrcode-server.sh" \
    "npm run start:fast"
fi

echo "WARN: concurrently not found; starting Operations only."
echo "Run in another terminal: bash scripts/start-qrcode-server.sh"
exec npm run start:fast
