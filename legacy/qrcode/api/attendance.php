<?php
/**
 * Record attendance from mobile app
 * Supports both online and offline mode (batch sync)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

require_once '../config/database.php';
require_once '../includes/functions.php';
require_once '../includes/ops_webhook.php';

$db = getDB();
$response = ['success' => false, 'message' => ''];

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    // Get input (supports both JSON and form data)
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }
    
    // Check if this is a batch sync (multiple records)
    if (isset($input['batch']) && is_array($input['records'])) {
        // Batch sync from offline storage
        $records = $input['records'];
        $device_id = $input['device_id'] ?? 'mobile_app';
        $synced_count = 0;
        $failed_count = 0;
        $errors = [];
        
        foreach ($records as $record) {
            $qr_data = $record['qr_data'] ?? '';
            $attendance_type = $record['attendance_type'] ?? '';
            $attendance_time = $record['attendance_time'] ?? date('Y-m-d H:i:s');
            $latitude = $record['latitude'] ?? null;
            $longitude = $record['longitude'] ?? null;
            
            if (!$qr_data || !$attendance_type) {
                $failed_count++;
                $errors[] = 'Missing required data for record';
                continue;
            }
            
            // Find student
            $stmt = $db->prepare("SELECT id, student_id, full_name, bus_number, current_balance, is_in_credit, parent_phone FROM students WHERE student_id = ? AND status = 'active'");
            $stmt->bind_param('s', $qr_data);
            $stmt->execute();
            $student = $stmt->get_result()->fetch_assoc();
            
            if (!$student) {
                $failed_count++;
                $errors[] = "Student not found: $qr_data";
                continue;
            }
            
            // Check if already recorded
            $checkStmt = $db->prepare("
                SELECT id FROM attendance_records 
                WHERE student_id = ? AND attendance_date = DATE(?) AND attendance_type = ?
            ");
            $checkStmt->bind_param('iss', $student['id'], $attendance_time, $attendance_type);
            $checkStmt->execute();
            
            if ($checkStmt->get_result()->num_rows > 0) {
                $failed_count++;
                $errors[] = "Duplicate attendance for student: $qr_data";
                continue;
            }
            
            // Get QR code
            $qrStmt = $db->prepare("SELECT qr_code FROM student_qr_codes WHERE student_id = ? AND is_active = 1");
            $qrStmt->bind_param('i', $student['id']);
            $qrStmt->execute();
            $qr_result = $qrStmt->get_result()->fetch_assoc();
            $qr_code = $qr_result['qr_code'] ?? $qr_data . '_QR';
            
            // Insert attendance
            $insertStmt = $db->prepare("
                INSERT INTO attendance_records 
                (student_id, qr_code, bus_number, attendance_type, attendance_time, attendance_date, 
                 latitude, longitude, device_id, recorded_by, sync_status) 
                VALUES (?, ?, ?, ?, ?, DATE(?), ?, ?, ?, 'mobile_app', 'synced')
            ");
            
            $insertStmt->bind_param(
                'isssssddss',
                $student['id'],
                $qr_code,
                $student['bus_number'],
                $attendance_type,
                $attendance_time,
                $attendance_time,
                $latitude,
                $longitude,
                $device_id
            );
            
            if ($insertStmt->execute()) {
                $synced_count++;
                ops_forward_attendance([
                    'student_id' => $student['student_id'],
                    'full_name' => $student['full_name'],
                    'attendance_type' => $attendance_type,
                    'attendance_time' => $attendance_time,
                    'is_in_credit' => (bool) ($student['is_in_credit'] ?? 0),
                    'current_balance' => isset($student['current_balance']) ? (float) $student['current_balance'] : null,
                    'parent_phone' => $student['parent_phone'] ?? null,
                    'bus_number' => $student['bus_number'] ?? null,
                ]);
            } else {
                $failed_count++;
                $errors[] = "Database error for $qr_data";
            }
        }
        
        $response['success'] = true;
        $response['message'] = "Synced $synced_count records, failed $failed_count";
        $response['synced'] = $synced_count;
        $response['failed'] = $failed_count;
        $response['errors'] = $errors;
        
    } else {
        // Single attendance record
        $qr_data = $input['qr_data'] ?? '';
        $attendance_type = $input['attendance_type'] ?? '';
        $device_id = $input['device_id'] ?? 'mobile_app';
        $latitude = $input['latitude'] ?? null;
        $longitude = $input['longitude'] ?? null;
        
        if (!$qr_data || !$attendance_type) {
            $response['message'] = 'qr_data and attendance_type are required';
            echo json_encode($response);
            exit();
        }
        
        // Find student
        $stmt = $db->prepare("SELECT * FROM students WHERE student_id = ? AND status = 'active'");
        $stmt->bind_param('s', $qr_data);
        $stmt->execute();
        $student = $stmt->get_result()->fetch_assoc();
        
        if (!$student) {
            $response['message'] = 'Invalid QR code. Student not found.';
            echo json_encode($response);
            exit();
        }
        
        // Check if already marked today
        $checkStmt = $db->prepare("
            SELECT id FROM attendance_records 
            WHERE student_id = ? AND attendance_date = CURDATE() AND attendance_type = ?
        ");
        $checkStmt->bind_param('is', $student['id'], $attendance_type);
        $checkStmt->execute();
        
        if ($checkStmt->get_result()->num_rows > 0) {
            $response['message'] = 'Attendance already marked for this session today';
            echo json_encode($response);
            exit();
        }
        
        // Get QR code
        $qrStmt = $db->prepare("SELECT qr_code FROM student_qr_codes WHERE student_id = ? AND is_active = 1");
        $qrStmt->bind_param('i', $student['id']);
        $qrStmt->execute();
        $qr_result = $qrStmt->get_result()->fetch_assoc();
        $qr_code = $qr_result['qr_code'] ?? $qr_data . '_QR';
        
        // Insert attendance
        $insertStmt = $db->prepare("
            INSERT INTO attendance_records 
            (student_id, qr_code, bus_number, attendance_type, attendance_time, attendance_date, 
             latitude, longitude, device_id, recorded_by, sync_status) 
            VALUES (?, ?, ?, ?, NOW(), CURDATE(), ?, ?, ?, 'mobile_app', 'synced')
        ");
        
        $insertStmt->bind_param(
            'isssddss',
            $student['id'],
            $qr_code,
            $student['bus_number'],
            $attendance_type,
            $latitude,
            $longitude,
            $device_id
        );
        
        if ($insertStmt->execute()) {
            ops_forward_attendance([
                'student_id' => $student['student_id'],
                'full_name' => $student['full_name'],
                'attendance_type' => $attendance_type,
                'attendance_time' => date('Y-m-d H:i:s'),
                'is_in_credit' => (bool) $student['is_in_credit'],
                'current_balance' => (float) $student['current_balance'],
                'parent_phone' => $student['parent_phone'] ?? null,
                'bus_number' => $student['bus_number'] ?? null,
            ]);

            $response['success'] = true;
            $response['message'] = 'Attendance recorded successfully';
            $response['student'] = [
                'id' => $student['id'],
                'student_id' => $student['student_id'],
                'full_name' => $student['full_name'],
                'current_balance' => floatval($student['current_balance']),
                'is_in_credit' => (bool)$student['is_in_credit']
            ];
            $response['attendance_type'] = $attendance_type;
            $response['recorded_at'] = date('Y-m-d H:i:s');
        } else {
            $response['message'] = 'Failed to record attendance: ' . $db->error;
        }
    }
    
    echo json_encode($response);
    exit();
}

// GET method - get attendance records for a date range
if ($method === 'GET') {
    $from_date = $_GET['from'] ?? date('Y-m-d', strtotime('-7 days'));
    $to_date = $_GET['to'] ?? date('Y-m-d');
    $student_id = $_GET['student_id'] ?? '';
    
    $query = "
        SELECT a.*, s.full_name, s.student_id
        FROM attendance_records a
        JOIN students s ON a.student_id = s.id
        WHERE a.attendance_date BETWEEN ? AND ?
    ";
    $params = [$from_date, $to_date];
    $types = 'ss';
    
    if ($student_id) {
        $query .= " AND s.student_id = ?";
        $params[] = $student_id;
        $types .= 's';
    }
    
    $query .= " ORDER BY a.attendance_time DESC";
    
    $stmt = $db->prepare($query);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $records = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    
    $response['success'] = true;
    $response['records'] = $records;
    $response['count'] = count($records);
    echo json_encode($response);
    exit();
}

$response['message'] = 'Invalid request method';
echo json_encode($response);
?>