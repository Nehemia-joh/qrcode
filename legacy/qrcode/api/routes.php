<?php
/**
 * Routes API - Get route information with stops
 * Endpoint: /api/index.php?endpoint=routes
 * Methods: GET
 */

require_once 'index.php';

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Get all routes with student counts
$query = "
    SELECT 
        b.*,
        COUNT(s.id) as total_students,
        SUM(CASE WHEN s.morning_pickup = 1 THEN 1 ELSE 0 END) as morning_students,
        SUM(CASE WHEN s.evening_drop = 1 THEN 1 ELSE 0 END) as evening_students
    FROM bus_routes b
    LEFT JOIN students s ON b.id = s.bus_route_id AND s.status = 'active'
    WHERE b.status = 'active'
    GROUP BY b.id
    ORDER BY b.route_name
";

$result = $db->query($query);
$routes = $result->fetch_all(MYSQLI_ASSOC);

// For each route, get student list if requested
if (isset($_GET['include_students']) && $_GET['include_students'] == 1) {
    foreach ($routes as &$route) {
        $studentStmt = $db->prepare("
            SELECT id, student_id, full_name, grade_class, section, 
                   morning_pickup, evening_drop, address, phone
            FROM students
            WHERE bus_route_id = ? AND status = 'active'
            ORDER BY full_name
        ");
        $studentStmt->bind_param('i', $route['id']);
        $studentStmt->execute();
        $studentResult = $studentStmt->get_result();
        $route['students'] = $studentResult->fetch_all(MYSQLI_ASSOC);
    }
}

echo json_encode([
    'success' => true,
    'data' => $routes,
    'count' => count($routes)
]);