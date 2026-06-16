#!/usr/bin/env bash
# Fix Bus QR: Nginx symlink + MySQL bus_ops user + DB import + admin login (admin / admin123)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HTML_LINK="/var/www/html/school-bus-tracking"
SQL_FILE="$ROOT/legacy/qrcode/database/first_database.sql"
NGINX_SITE="school-bus-tracking"
DB_PASS="chance00"
DB_APP_USER="bus_ops"
ADMIN_PASS="admin123"

echo "=== Fix Bus QR (MySQL + Nginx) ==="
echo ""

if [[ $EUID -ne 0 ]]; then
  echo "This script needs sudo (MySQL + Nginx). Run:"
  echo "  cd $ROOT"
  echo "  sudo bash scripts/fix-bus-qr.sh"
  exit 1
fi

# --- Nginx: symlink + site ---
mkdir -p /var/www/html
if [[ -e "$HTML_LINK" && ! -L "$HTML_LINK" ]]; then
  echo "ERROR: $HTML_LINK exists and is not a symlink. Remove or rename it first."
  exit 1
fi
ln -sfn "$ROOT/legacy/qrcode" "$HTML_LINK"
echo "OK: $HTML_LINK → legacy/qrcode"

mkdir -p "$ROOT/legacy/qrcode/phpqrcode/cache"
chown -R www-data:www-data "$ROOT/legacy/qrcode/phpqrcode/cache" 2>/dev/null || true
chmod -R 775 "$ROOT/legacy/qrcode/phpqrcode/cache" 2>/dev/null || true

cp "$ROOT/deploy/nginx-school-bus-tracking.conf" "/etc/nginx/sites-available/$NGINX_SITE"
ln -sf "/etc/nginx/sites-available/$NGINX_SITE" "/etc/nginx/sites-enabled/$NGINX_SITE"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
echo "OK: Nginx → http://localhost/school-bus-tracking/"

# --- MySQL: socket auth as root, then create bus_ops (works on Ubuntu) ---
echo "Configuring MySQL (bus_ops user for PHP + Operations API)..."
mysql <<SQL
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASS}';
CREATE DATABASE IF NOT EXISTS school_bus_tracking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_APP_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON school_bus_tracking.* TO '${DB_APP_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

if [[ -f "$SQL_FILE" ]]; then
  mysql -u "${DB_APP_USER}" -p"${DB_PASS}" school_bus_tracking < "$SQL_FILE"
  echo "OK: Imported schema"
fi

# --- Admin password: match Operations login (admin / admin123) ---
DB_USER="${DB_APP_USER}" DB_PASS="${DB_PASS}" php -r "
require '${ROOT}/legacy/qrcode/config/database.php';
\$db = getDB();
\$hash = password_hash('${ADMIN_PASS}', PASSWORD_DEFAULT);
\$stmt = \$db->prepare(\"UPDATE users SET password = ?, status = 'active' WHERE username = 'admin'\");
\$stmt->bind_param('s', \$hash);
if (!\$stmt->execute()) { fwrite(STDERR, 'WARN: ' . \$db->error . PHP_EOL); exit(1); }
if (\$stmt->affected_rows === 0) {
  \$stmt = \$db->prepare(\"INSERT INTO users (username, password, email, role, full_name, status) VALUES ('admin', ?, 'admin@schoolbus.com', 'admin', 'System Administrator', 'active')\");
  \$stmt->bind_param('s', \$hash);
  \$stmt->execute();
}
echo \"OK: admin password set to ${ADMIN_PASS}\n\";
"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/school-bus-tracking/index.php" || echo "000")
echo "HTTP test: $HTTP_CODE"

cat <<EOF

=== Bus QR ready ===

URL:      http://localhost/school-bus-tracking/
Login:    admin / admin123

MySQL:    ${DB_APP_USER} / ${DB_PASS}  (database: school_bus_tracking)

Operations .env should use:
  NEHEMIAH_DB_USER=${DB_APP_USER}
  NEHEMIAH_DB_PASSWORD=${DB_PASS}
  NEHEMIAH_DB_ENABLED=true

Then restart: npm run start:server

EOF
