#!/usr/bin/env bash
# Backup JSON data stores (users, sheets, reports, logs)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d_%H%M%S)"
DEST="${1:-$ROOT/backups}"
ARCHIVE="$DEST/operations_data_$STAMP.tar.gz"

mkdir -p "$DEST"
tar -czf "$ARCHIVE" -C "$ROOT" data
echo "Backup written: $ARCHIVE"
ls -lh "$ARCHIVE"
