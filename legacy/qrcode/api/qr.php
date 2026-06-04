<?php
/**
 * Quick QR code validation endpoint
 * Mobile app calls this to validate a scanned QR before recording
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

require_once '../config/database.php';

$db = getDB();
$response = ['success' => false, 'message' => '', 'student' => null];

$qr_data = $_GET['qr'] ?? $_POST['qr'] ?? '';

if (!$qr_data) {
    $response['message'] = 'QR data is required';
    echo json_encode($response);
    exit();
}

// Find student by QR data (student_id)
$stmt = $db->prepare("
    SELECT s.id, s.student_id, s.full_name, s.bus_number, s.current_balance, s.is_in_credit
    FROM students s
    WHERE s.student_id = ? AND s.status = 'active'
");
$stmt->bind_param('s', $qr_data);
$stmt->execute();
$student = $stmt->get_result()->fetch_assoc();

if ($student) {
    $response['success'] = true;
    $response['message'] = 'Valid QR code';
    $response['student'] = [
        'id' => $student['id'],
        'student_id' => $student['student_id'],
        'full_name' => $student['full_name'],
        'bus_number' => $student['bus_number'],
        'current_balance' => floatval($student['current_balance']),
        'is_in_credit' => (bool)$student['is_in_credit']
    ];
} else {
    $response['message'] = 'Invalid QR code. Student not found or inactive.';
}

echo json_encode($response);
?>