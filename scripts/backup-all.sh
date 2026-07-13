#!/usr/bin/env bash
# Backup Operations data/ JSON + Bus QR MySQL database.
# Weekly cron example:
#   0 2 * * 0 cd /path/to/Operations_system && bash scripts/backup-all.sh >> backups/backup.log 2>&1
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/load-env.sh
source "$ROOT/scripts/lib/load-env.sh"
load_project_env "$ROOT"

STAMP="$(date +%Y%m%d_%H%M%S)"
DEST="${1:-$ROOT/backups}"
mkdir -p "$DEST"

echo "=== Backup Operations + Bus QR ==="

bash "$ROOT/scripts/backup-data.sh" "$DEST"

DB_HOST="${NEHEMIAH_DB_HOST:-localhost}"
DB_NAME="${NEHEMIAH_DB_NAME:-school_bus_tracking}"
DB_USER="${NEHEMIAH_DB_USER:-${DB_USER:-bus_ops}}"
DB_PASS="${NEHEMIAH_DB_PASSWORD:-${DB_PASS:-chance00}}"

SQL_FILE="$DEST/busqr_${DB_NAME}_${STAMP}.sql"
if mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$SQL_FILE" 2>/dev/null; then
  gzip -f "$SQL_FILE"
  echo "MySQL backup: ${SQL_FILE}.gz"
  ls -lh "${SQL_FILE}.gz"
else
  echo "WARN: MySQL backup skipped (check NEHEMIAH_DB_* / DB_* in .env)"
fi

echo "All backups in: $DEST"
