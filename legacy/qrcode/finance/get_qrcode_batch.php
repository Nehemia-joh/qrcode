<?php
require_once '../config/database.php';
require_once '../includes/auth.php';

header('Content-Type: application/json');

requireLogin();

$data = json_decode(file_get_contents('php://input'), true);
$student_ids = $data['student_ids'] ?? [];

if (empty($student_ids)) {
    echo json_encode([]);
    exit();
}

$db = getDB();
$placeholders = implode(',', array_fill(0, count($student_ids), '?'));
$stmt = $db->prepare("
    SELECT s.id, s.full_name, s.student_id, sq.qr_image_path 
    FROM students s
    LEFT JOIN student_qr_codes sq ON s.id = sq.student_id AND sq.is_active = 1
    WHERE s.id IN ($placeholders)
");
$stmt->bind_param(str_repeat('i', count($student_ids)), ...$student_ids);
$stmt->execute();
$result = $stmt->get_result();

$students = [];
while ($row = $result->fetch_assoc()) {
    $students[] = [
        'id' => $row['id'],
        'name' => $row['full_name'],
        'student_id' => $row['student_id'],
        'qr_path' => $row['qr_image_path'] ?? ''
    ];
}

echo json_encode($students);
?>