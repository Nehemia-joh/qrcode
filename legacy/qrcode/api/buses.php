<?php
/**
 * Get bus routes for mobile app
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

require_once '../config/database.php';

$db = getDB();
$response = ['success' => false, 'message' => '', 'buses' => []];

$buses = $db->query("
    SELECT 
        id, 
        route_name, 
        route_number, 
        bus_number, 
        driver_name, 
        driver_phone,
        morning_pickup_time,
        morning_drop_time,
        evening_pickup_time,
        evening_drop_time,
        capacity,
        current_students
    FROM bus_routes 
    WHERE status = 'active'
    ORDER BY route_name
")->fetch_all(MYSQLI_ASSOC);

$response['success'] = true;
$response['buses'] = $buses;
$response['total'] = count($buses);

echo json_encode($response);
?>