<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

require_once '../config/database.php';

$db = getDB();
$response = ['success' => false, 'message' => '', 'students' => []];

// Get all active students with QR codes
$query = "
    SELECT 
        s.id,
        s.student_id,
        s.full_name,
        s.parent_phone,
        s.bus_number,
        s.current_balance,
        s.is_in_credit,
        s.daily_deduction_rate,
        sq.qr_code,
        sq.qr_image_path
    FROM students s
    LEFT JOIN student_qr_codes sq ON s.id = sq.student_id AND sq.is_active = 1
    WHERE s.status = 'active'
    ORDER BY s.full_name
";

$result = $db->query($query);
$students = $result->fetch_all(MYSQLI_ASSOC);

// Process each student
foreach ($students as &$student) {
    $student['qr_data'] = $student['student_id']; // What scanner reads
    $student['current_balance'] = floatval($student['current_balance']);
    $student['is_in_credit'] = (bool)$student['is_in_credit'];
}

$response['success'] = true;
$response['message'] = 'Students fetched successfully';
$response['students'] = $students;
$response['total'] = count($students);
$response['sync_timestamp'] = date('Y-m-d H:i:s');

echo json_encode($response);
?>