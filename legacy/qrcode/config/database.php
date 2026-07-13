<?php
require_once __DIR__ . '/../includes/load_env.php';

// ============================================
// DATABASE CONFIGURATION
// ============================================
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'school_bus_tracking');
define('DB_USER', getenv('DB_USER') ?: 'bus_ops');
define('DB_PASS', getenv('DB_PASS') ?: 'chance00');

// Site configuration
define('SITE_NAME', 'School Bus Tracking System');
define('SITE_URL', getenv('SITE_URL') ?: 'http://localhost/school-bus-tracking/');
define('OPS_APP_URL', rtrim(getenv('OPS_APP_URL') ?: 'http://localhost:8080', '/'));

// Session timeout (30 minutes)
define('SESSION_TIMEOUT', 1800);

// Session cookie scoped to this app path (works under /school-bus-tracking/)
$sitePath = parse_url(SITE_URL, PHP_URL_PATH) ?: '/';
$cookiePath = rtrim($sitePath, '/') . '/';
if ($cookiePath === '//') {
    $cookiePath = '/';
}

// Get database connection
function getDB() {
    static $conn = null;
    if ($conn === null) {
        try {
            $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
            if ($conn->connect_error) {
                die("Database Connection Error: " . $conn->connect_error);
            }
            $conn->set_charset("utf8mb4");
        } catch (Exception $e) {
            die("Database Error: " . $e->getMessage());
        }
    }
    return $conn;
}

// Start session if not started
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => $cookiePath,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}
?>