<?php
/**
 * Get dashboard statistics for mobile app
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

require_once '../config/database.php';

$db = getDB();
$response = ['success' => false, 'message' => '', 'stats' => []];

// Today's attendance
$today_attendance = $db->query("
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN attendance_type = 'morning_pickup' THEN 1 ELSE 0 END) as morning_pickup,
        SUM(CASE WHEN attendance_type = 'morning_drop' THEN 1 ELSE 0 END) as morning_drop,
        SUM(CASE WHEN attendance_type = 'evening_pickup' THEN 1 ELSE 0 END) as evening_pickup,
        SUM(CASE WHEN attendance_type = 'evening_drop' THEN 1 ELSE 0 END) as evening_drop
    FROM attendance_records 
    WHERE attendance_date = CURDATE()
")->fetch_assoc();

// Student stats
$student_stats = $db->query("
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_in_credit = 1 THEN 1 ELSE 0 END) as in_credit,
        SUM(current_balance) as total_balance
    FROM students
")->fetch_assoc();

// Bus stats
$bus_stats = $db->query("
    SELECT COUNT(*) as active_buses, SUM(current_students) as total_students_on_buses
    FROM bus_routes WHERE status = 'active'
")->fetch_assoc();

$response['success'] = true;
$response['stats'] = [
    'today_attendance' => [
        'total' => intval($today_attendance['total']),
        'morning_pickup' => intval($today_attendance['morning_pickup']),
        'morning_drop' => intval($today_attendance['morning_drop']),
        'evening_pickup' => intval($today_attendance['evening_pickup']),
        'evening_drop' => intval($today_attendance['evening_drop'])
    ],
    'students' => [
        'total' => intval($student_stats['total']),
        'active' => intval($student_stats['active']),
        'in_credit' => intval($student_stats['in_credit']),
        'total_balance' => floatval($student_stats['total_balance'])
    ],
    'buses' => [
        'active' => intval($bus_stats['active_buses']),
        'students_on_buses' => intval($bus_stats['total_students_on_buses'])
    ]
];
$response['last_updated'] = date('Y-m-d H:i:s');

echo json_encode($response);
?>