#!/usr/bin/env bash
# Apply Bus QR DB migrations (idempotent). Reads credentials from .env files.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/load-env.sh
source "$ROOT/scripts/lib/load-env.sh"
load_project_env "$ROOT"

DB_HOST="${DB_HOST:-${NEHEMIAH_DB_HOST:-localhost}}"
DB_NAME="${DB_NAME:-${NEHEMIAH_DB_NAME:-school_bus_tracking}}"
DB_USER="${DB_USER:-${NEHEMIAH_DB_USER:-bus_ops}}"
DB_PASS="${DB_PASS:-${NEHEMIAH_DB_PASSWORD:-chance00}}"

MYSQL=(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME")

echo "=== Bus QR migrations → ${DB_NAME}@${DB_HOST} ==="

"${MYSQL[@]}" < "$ROOT/legacy/qrcode/database/migrations/001_finance_and_ops_tables.sql"
echo "OK: support tables"

add_column_if_missing() {
  local table="$1" column="$2" definition="$3"
  local exists
  exists="$("${MYSQL[@]}" -N -e \
    "SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='${table}' AND COLUMN_NAME='${column}'")"
  if [[ "$exists" == "0" ]]; then
    "${MYSQL[@]}" -e "ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}"
    echo "  + ${table}.${column}"
  fi
}

add_column_if_missing students parent_phone "varchar(20) DEFAULT NULL"
add_column_if_missing students parent_email "varchar(255) DEFAULT NULL"
add_column_if_missing students current_balance "decimal(10,2) DEFAULT 0.00"
add_column_if_missing students daily_deduction_rate "decimal(10,2) DEFAULT 0.00"
add_column_if_missing students is_in_credit "tinyint(1) DEFAULT 0"
add_column_if_missing students consecutive_overdue_days "int DEFAULT 0"
add_column_if_missing students total_overdue_days "int DEFAULT 0"
add_column_if_missing students last_deduction_date "date DEFAULT NULL"
add_column_if_missing students rate_effective_from "date DEFAULT NULL"

"${MYSQL[@]}" <<'SQL'
UPDATE students
SET parent_phone = COALESCE(NULLIF(parent_phone, ''), phone)
WHERE phone IS NOT NULL AND phone != '';

UPDATE students
SET current_balance = COALESCE(amount_paid, 0) - COALESCE(total_amount, 0)
WHERE current_balance IS NULL OR current_balance = 0;

UPDATE students
SET is_in_credit = CASE WHEN current_balance < 0 THEN 1 ELSE 0 END;
SQL

echo "OK: students finance columns backfilled"
echo "Done."
