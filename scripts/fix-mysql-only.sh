#!/usr/bin/env bash
# MySQL only — create bus_ops + school_bus_tracking (no Nginx). Needs sudo once.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/load-env.sh
source "$ROOT/scripts/lib/load-env.sh"
load_project_env "$ROOT"

SQL_FILE="$ROOT/legacy/qrcode/database/first_database.sql"
DB_PASS="${NEHEMIAH_DB_PASSWORD:-${DB_PASS:-chance00}}"
DB_APP_USER="${NEHEMIAH_DB_USER:-${DB_USER:-bus_ops}}"
ADMIN_PASS="${OPS_ADMIN_PASSWORD:-admin123}"

if [[ $EUID -ne 0 ]]; then
  echo "Run: sudo bash scripts/fix-mysql-only.sh"
  exit 1
fi

echo "=== Fix MySQL for Bus QR ==="

mysql <<SQL
CREATE DATABASE IF NOT EXISTS school_bus_tracking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_APP_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_APP_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON school_bus_tracking.* TO '${DB_APP_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
echo "OK: user ${DB_APP_USER} created"

if [[ -f "$SQL_FILE" ]]; then
  mysql -u "${DB_APP_USER}" -p"${DB_PASS}" school_bus_tracking < "$SQL_FILE"
  echo "OK: database imported"
fi

DB_USER="${DB_APP_USER}" DB_PASS="${DB_PASS}" bash "$ROOT/scripts/apply-busqr-migrations.sh"
echo "OK: migrations applied"

DB_USER="${DB_APP_USER}" DB_PASS="${DB_PASS}" php -r "
require '${ROOT}/legacy/qrcode/config/database.php';
\$db = getDB();
\$hash = password_hash('${ADMIN_PASS}', PASSWORD_DEFAULT);
\$stmt = \$db->prepare(\"UPDATE users SET password = ?, status = 'active' WHERE username = 'admin'\");
\$stmt->bind_param('s', \$hash);
\$stmt->execute();
if (\$stmt->affected_rows === 0) {
  \$stmt = \$db->prepare(\"INSERT INTO users (username, password, email, role, full_name, status) VALUES ('admin', ?, 'admin@schoolbus.com', 'admin', 'System Administrator', 'active')\");
  \$stmt->bind_param('s', \$hash);
  \$stmt->execute();
}
echo \"OK: Bus QR login admin / ${ADMIN_PASS}\n\";
"

mysql -u "${DB_APP_USER}" -p"${DB_PASS}" -e "SELECT COUNT(*) AS students FROM school_bus_tracking.students;" 2>/dev/null

cat <<EOF

Done. Test:
  mysql -u bus_ops -p school_bus_tracking -e "SELECT 1"
  bash scripts/start-all.sh

EOF
