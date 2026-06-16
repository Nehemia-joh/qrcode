#!/usr/bin/env bash
# Set MySQL bus_ops password (needs sudo once)
set -euo pipefail

NEW_PASS="${1:-kiki}"

if [[ $EUID -ne 0 ]]; then
  echo "Run: sudo bash scripts/set-mysql-password.sh [new_password]"
  exit 1
fi

mysql <<SQL
ALTER USER 'bus_ops'@'localhost' IDENTIFIED BY '${NEW_PASS}';
FLUSH PRIVILEGES;
SQL

echo "OK: bus_ops password set to ${NEW_PASS}"
echo "Test: mysql -u bus_ops -p${NEW_PASS} school_bus_tracking -e \"SELECT 1\""
