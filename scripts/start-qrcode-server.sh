#!/usr/bin/env bash
# Dev Bus QR without Nginx (until fix-bus-qr.sh is run with sudo)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/legacy/qrcode"
PORT="${QRCODE_PORT:-8081}"
echo "Bus QR dev server: http://localhost:${PORT}/"
echo "Login: admin / admin123 (requires MySQL — run: sudo bash scripts/fix-bus-qr.sh)"
exec php -S "0.0.0.0:${PORT}" -t .
