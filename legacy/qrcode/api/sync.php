<?php
/**
 * Complete sync endpoint for mobile app
 * Downloads all data needed for offline operation
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

require_once '../config/database.php';

$db = getDB();
$response = ['success' => false, 'message' => ''];

// Get device ID
$device_id = $_SERVER['HTTP_X_DEVICE_ID'] ?? $_GET['device_id'] ?? 'unknown';
$last_sync = $_GET['last_sync'] ?? date('Y-m-d', strtotime('-30 days'));

// 1. Get all active students
$students_query = "
    SELECT 
        s.id,
        s.student_id,
        s.full_name,
        s.parent_phone,
        s.bus_number,
        s.current_balance,
        s.is_in_credit,
        s.daily_deduction_rate,
        sq.qr_code
    FROM students s
    LEFT JOIN student_qr_codes sq ON s.id = sq.student_id AND sq.is_active = 1
    WHERE s.status = 'active'
";

$students = $db->query($students_query)->fetch_all(MYSQLI_ASSOC);

foreach ($students as &$student) {
    $student['qr_data'] = $student['student_id'];
    $student['current_balance'] = floatval($student['current_balance']);
}

// 2. Get bus routes
$buses = $db->query("
    SELECT id, route_name, route_number, bus_number, driver_name, driver_phone
    FROM bus_routes WHERE status = 'active'
")->fetch_all(MYSQLI_ASSOC);

// 3. Get recent attendance (last 30 days for offline reference)
$attendance = $db->query("
    SELECT 
        a.student_id,
        a.attendance_type,
        a.attendance_date,
        a.attendance_time
    FROM attendance_records a
    WHERE a.attendance_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    ORDER BY a.attendance_time DESC
    LIMIT 1000
")->fetch_all(MYSQLI_ASSOC);

// 4. Get system settings
$settings = $db->query("
    SELECT setting_key, setting_value FROM system_settings
")->fetch_all(MYSQLI_ASSOC);

$settings_map = [];
foreach ($settings as $setting) {
    $settings_map[$setting['setting_key']] = $setting['setting_value'];
}

$response['success'] = true;
$response['message'] = 'Sync completed successfully';
$response['data'] = [
    'students' => $students,
    'buses' => $buses,
    'recent_attendance' => $attendance,
    'settings' => $settings_map
];
$response['sync_info'] = [
    'total_students' => count($students),
    'total_buses' => count($buses),
    'attendance_count' => count($attendance),
    'sync_timestamp' => date('Y-m-d H:i:s'),
    'device_id' => $device_id,
    'app_version' => $_GET['app_version'] ?? '1.0.0'
];

// Log sync
$log_stmt = $db->prepare("
    INSERT INTO sync_logs (device_id, sync_type, records_count, sync_time, status) 
    VALUES (?, 'both', ?, NOW(), 'success')
");
$log_stmt->bind_param('si', $device_id, count($students));
$log_stmt->execute();

echo json_encode($response);
?>