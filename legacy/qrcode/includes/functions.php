<?php
require_once __DIR__ . '/../config/database.php';

function sanitize($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

function formatDate($date) {
    return date('d-m-Y', strtotime($date));
}

function formatTime($time) {
    return date('h:i A', strtotime($time));
}

function formatCurrency($amount) {
    return '₹' . number_format($amount, 2);
}

function getDashboardStats() {
    $db = getDB();
    
    $stats = [];
    
    // Total students
    $result = $db->query("SELECT COUNT(*) as count FROM students WHERE status = 'active'");
    $stats['total_students'] = $result->fetch_assoc()['count'];
    
    // Students in credit
    $result = $db->query("SELECT COUNT(*) as count FROM students WHERE is_in_credit = 1 AND status = 'active'");
    $stats['credit_students'] = $result->fetch_assoc()['count'];
    
    // Total balance (sum of all balances)
    $result = $db->query("SELECT SUM(current_balance) as total FROM students WHERE status = 'active'");
    $stats['total_balance'] = $result->fetch_assoc()['total'] ?? 0;
    
    // Total negative balance (credit amount)
    $result = $db->query("SELECT SUM(current_balance) as total FROM students WHERE current_balance < 0 AND status = 'active'");
    $stats['total_credit'] = abs($result->fetch_assoc()['total'] ?? 0);
    
    // Today's attendance
    $result = $db->query("SELECT COUNT(*) as count FROM attendance_records WHERE DATE(attendance_date) = CURDATE()");
    $stats['today_attendance'] = $result->fetch_assoc()['count'];
    
    // Active buses
    $result = $db->query("SELECT COUNT(*) as count FROM bus_routes WHERE status = 'active'");
    $stats['active_buses'] = $result->fetch_assoc()['count'];
    
    // Total deductions this month
    $result = $db->query("SELECT SUM(amount_deducted) as total FROM deduction_log WHERE MONTH(deduction_date) = MONTH(CURDATE()) AND YEAR(deduction_date) = YEAR(CURDATE())");
    $stats['monthly_deductions'] = $result->fetch_assoc()['total'] ?? 0;
    
    return $stats;
}

function getRecentStudents($limit = 10) {
    $db = getDB();
    $stmt = $db->prepare("SELECT id, student_id, full_name, parent_phone, bus_number, current_balance, daily_deduction_rate, is_in_credit, status 
                          FROM students 
                          WHERE status = 'active' 
                          ORDER BY created_at DESC 
                          LIMIT ?");
    $stmt->bind_param('i', $limit);
    $stmt->execute();
    return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
}

function getCreditStudents() {
    $db = getDB();
    return $db->query("SELECT id, student_id, full_name, parent_phone, current_balance, daily_deduction_rate, consecutive_overdue_days 
                       FROM students 
                       WHERE is_in_credit = 1 AND status = 'active' 
                       ORDER BY current_balance ASC 
                       LIMIT 20")->fetch_all(MYSQLI_ASSOC);
}

function getSystemSetting($key, $default = null) {
    $db = getDB();
    $stmt = $db->prepare("SELECT setting_value FROM system_settings WHERE setting_key = ?");
    $stmt->bind_param('s', $key);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    return $row ? $row['setting_value'] : $default;
}

function updateSystemSetting($key, $value) {
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
    $stmt->bind_param('ss', $key, $value);
    return $stmt->execute();
}

function addAlertLog($student_id, $alert_type, $message, $sent_to) {
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO alerts_log (student_id, alert_type, message, sent_to) VALUES (?, ?, ?, ?)");
    $stmt->bind_param('isss', $student_id, $alert_type, $message, $sent_to);
    return $stmt->execute();
}
?>