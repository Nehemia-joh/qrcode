<?php
/**
 * School Bus Tracking System - Main API Router
 * Mobile-friendly API endpoints without authentication
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'school_bus_tracking');
define('DB_USER', 'root');
define('DB_PASS', 'chance00');

// API base path
define('API_BASE', '/school_bus_tracking/api/');

// Get request method and endpoint
$method = $_SERVER['REQUEST_METHOD'];
$endpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : '';

// Route to appropriate handler
switch ($endpoint) {
    case 'students':
        require_once 'students.php';
        break;
    case 'attendance':
        require_once 'attendance.php';
        break;
    case 'buses':
        require_once 'buses.php';
        break;
    case 'routes':
        require_once 'routes.php';
        break;
    case 'sync':
        require_once 'sync.php';
        break;
    case 'qr':
        require_once 'qr.php';
        break;
    case 'stats':
        require_once 'stats.php';
        break;
    default:
        echo json_encode([
            'success' => true,
            'message' => 'School Bus Tracking API',
            'version' => '1.0',
            'endpoints' => [
                '/api/index.php?endpoint=students',
                '/api/index.php?endpoint=attendance',
                '/api/index.php?endpoint=buses',
                '/api/index.php?endpoint=routes',
                '/api/index.php?endpoint=sync',
                '/api/index.php?endpoint=qr',
                '/api/index.php?endpoint=stats'
            ],
            'documentation' => 'Use GET for fetching data, POST for creating records'
        ]);
        break;
}

function getDB() {
    static $conn = null;
    if ($conn === null) {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($conn->connect_error) {
            http_response_code(500);
            die(json_encode(['success' => false, 'message' => 'Database connection failed']));
        }
        $conn->set_charset('utf8mb4');
    }
    return $conn;
}