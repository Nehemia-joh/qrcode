#!/usr/bin/env bash
# Path A: Nginx + PHP-FPM + MySQL for legacy/qrcode on Ubuntu/Linux
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HTML_LINK="/var/www/html/school-bus-tracking"
SQL_FILE="$ROOT/legacy/qrcode/database/first_database.sql"
NGINX_SITE="school-bus-tracking"
DB_PASS="chance00"
DB_APP_USER="bus_ops"

echo "=== Path A: Silverleaf Bus QR (Nginx + PHP-FPM + MySQL) ==="
echo "Project: $ROOT"
echo ""

if [[ $EUID -ne 0 ]]; then
  echo "Run: sudo bash scripts/setup-linux-qrcode.sh"
  exit 1
fi

# 1. Symlink into Nginx web root (matches SITE_URL .../school-bus-tracking/)
mkdir -p /var/www/html
if [[ -e "$HTML_LINK" && ! -L "$HTML_LINK" ]]; then
  echo "WARN: $HTML_LINK exists and is not a symlink — remove or rename it first"
  exit 1
fi
ln -sfn "$ROOT/legacy/qrcode" "$HTML_LINK"
echo "OK: $HTML_LINK → legacy/qrcode"

# Writable cache for QR generation
mkdir -p "$ROOT/legacy/qrcode/phpqrcode/cache"
chown -R www-data:www-data "$ROOT/legacy/qrcode/phpqrcode/cache" 2>/dev/null || true
chmod -R 775 "$ROOT/legacy/qrcode/phpqrcode/cache" 2>/dev/null || true

# 2. Nginx — replace default with PHP-enabled site
cp "$ROOT/deploy/nginx-school-bus-tracking.conf" "/etc/nginx/sites-available/$NGINX_SITE"
ln -sf "/etc/nginx/sites-available/$NGINX_SITE" "/etc/nginx/sites-enabled/$NGINX_SITE"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
echo "OK: Nginx → http://localhost/school-bus-tracking/"

# 3. MySQL — root password + database import (socket auth via sudo)
echo "Configuring MySQL..."
mysql <<SQL
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASS}';
CREATE DATABASE IF NOT EXISTS school_bus_tracking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_APP_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON school_bus_tracking.* TO '${DB_APP_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

if [[ -f "$SQL_FILE" ]]; then
  mysql -u root -p"${DB_PASS}" school_bus_tracking < "$SQL_FILE"
  echo "OK: Imported school_bus_tracking schema"
else
  echo "WARN: SQL file not found at $SQL_FILE"
fi

# 4. Admin password — match login page (admin / admin123)
php -r "
require '$ROOT/legacy/qrcode/config/database.php';
\$db = getDB();
\$hash = password_hash('admin123', PASSWORD_DEFAULT);
\$stmt = \$db->prepare(\"UPDATE users SET password = ?, status = 'active' WHERE username = 'admin'\");
\$stmt->bind_param('s', \$hash);
\$stmt->execute();
if (\$stmt->affected_rows === 0) {
  \$stmt = \$db->prepare(\"INSERT INTO users (username, password, email, role, full_name, status) VALUES ('admin', ?, 'admin@schoolbus.com', 'admin', 'System Administrator', 'active')\");
  \$stmt->bind_param('s', \$hash);
  \$stmt->execute();
}
echo \"OK: admin / admin123\n\";
"

# 5. Quick PHP test
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/school-bus-tracking/index.php" || echo "000")
echo "HTTP test index.php: $HTTP_CODE"

cat <<EOF

=== Path A complete ===

Bus QR:     http://localhost/school-bus-tracking/
            Login: admin / admin123

Operations: cd $ROOT && npm run start:server
            http://localhost:8080/transport → Open Bus QR

.env (already aligned):
  NEHEMIAH_APP_URL=http://localhost/school-bus-tracking
  NEHEMIAH_DB_USER=${DB_APP_USER}
  NEHEMIAH_DB_PASSWORD=${DB_PASS}
  NEHEMIAH_DB_ENABLED=true

If root@localhost fails from Node, use bus_ops (created above).

EOF
