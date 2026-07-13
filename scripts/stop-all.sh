#!/usr/bin/env bash
# Stop Operations (4000, 8080) and Bus QR dev server (8081).
set -euo pipefail

PORTS=(4000 8080 8081)
for p in "${PORTS[@]}"; do
  if fuser "${p}/tcp" >/dev/null 2>&1; then
    echo "Stopping :${p}..."
    fuser -k "${p}/tcp" >/dev/null 2>&1 || true
    sleep 0.5
  fi
done
echo "Ports clear: ${PORTS[*]}"
