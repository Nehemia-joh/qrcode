# Your stack — chosen for this machine

## What we picked (and why)

| Option | Verdict |
|--------|---------|
| **XAMPP** | Not a fit — you're on **Ubuntu Linux**; XAMPP is mainly for Windows beginners |
| **Docker** | Good later for production — **not installed** on this machine yet |
| **cPanel** | For live hosting at Silverleaf — use when you deploy to your host |
| **Nginx + PHP-FPM + MySQL** | **Best fit now** — already installed and running |

Your machine today:

- **Nginx** — active  
- **PHP 8.1** + **php-fpm** — active  
- **MySQL** — active (root uses socket auth; set password or create `chance00` user)  
- **Operations** — Node on port **8080** (`npm run start:server`)  
- **LAN IP** — `192.168.100.229`

---

## Architecture

```
Staff browser
    │
    ├─► http://192.168.100.229:8080     Silverleaf Operations (Node + React)
    │       Transport → Open Bus QR (SSO)
    │
    └─► http://localhost/                 Bus QR / qrcode (Nginx + PHP + MySQL)
            same DB: school_bus_tracking
            webhook → Operations :4000/api/webhooks/attendance
```

---

## Config from `legacy/qrcode/config/database.php`

| Setting | Value |
|---------|--------|
| DB host | `localhost` |
| DB name | `school_bus_tracking` |
| DB user | `root` |
| DB pass | `chance00` (in repo — fix MySQL to match) |
| SITE_URL | `http://localhost/school-bus-tracking/` |

Operations `.env` (aligned):

```env
NEHEMIAH_APP_URL=http://localhost/school-bus-tracking
NEHEMIAH_DB_HOST=localhost
NEHEMIAH_DB_USER=root
NEHEMIAH_DB_PASSWORD=chance00
NEHEMIAH_DB_NAME=school_bus_tracking
NEHEMIAH_DB_ENABLED=true
NEHEMIAH_SSO_SECRET=dev-webhook-secret
```

---

## Setup steps (one time)

### A. Full setup (recommended — needs sudo)

```bash
cd /home/kiki/Documents/Operations_system
sudo bash scripts/setup-linux-qrcode.sh
```

Then fix MySQL password if `chance00` does not work:

```bash
sudo mysql
```

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'chance00';
FLUSH PRIVILEGES;
CREATE DATABASE IF NOT EXISTS school_bus_tracking;
```

Import:

```bash
mysql -u root -pchance00 school_bus_tracking < legacy/qrcode/database/first_database.sql
```

### B. Quick dev (no sudo, no Nginx)

```bash
cd /home/kiki/Documents/Operations_system/legacy/qrcode
php -S 0.0.0.0:8081
```

In `.env`:

```env
NEHEMIAH_APP_URL=http://localhost:8081
```

In `config/database.php` temporarily:

```php
define('SITE_URL', 'http://localhost:8081/');
```

### C. Run Operations

```bash
cd /home/kiki/Documents/Operations_system
npm run start:server
```

Open: **http://localhost:8080/login** → Transport → **Open Bus QR**

---

## Logins

| System | Username | Password |
|--------|----------|----------|
| Operations | `admin` | `admin123` |
| qrcode (Bus QR) | `admin` | `admin123` |

SSO needs username **`admin`** in both.

---

## Production (Silverleaf server later)

Use **cPanel or VPS + Nginx**:

- `https://ops.silverleaf.co.tz` → Operations (port 8080 behind Nginx SSL)
- `https://bus.silverleaf.co.tz` → qrcode PHP
- Same MySQL on server; update `SITE_URL` and `.env` to HTTPS URLs

Docker optional when you install Docker:

```bash
docker compose up --build -d   # Operations only today; add PHP+MySQL service later
```
