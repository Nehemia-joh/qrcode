#!/usr/bin/env php
<?php
// Run this file via cron job daily at 23:40
// crontab -e
// 40 23 * * * /usr/bin/php /var/www/html/school-bus-tracking/cron/daily-deduction.php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

// Check if running from CLI or web
$is_cli = (php_sapi_name() === 'cli');

function log_message($message) {
    global $is_cli;
    $timestamp = date('Y-m-d H:i:s');
    $log_line = "[$timestamp] $message\n";
    
    if ($is_cli) {
        echo $log_line;
    }
    
    // Also write to log file
    file_put_contents(__DIR__ . '/../logs/deduction.log', $log_line, FILE_APPEND);
}

log_message("=== Starting Daily Deduction Process ===");

// Check if deduction is enabled
$db = getDB();
$deduction_mode = getSystemSetting('deduction_mode', 'automatic');

if ($deduction_mode !== 'automatic') {
    log_message("Deduction mode is set to 'manual'. Skipping automatic deduction.");
    exit(0);
}

// Get deduction time setting
$deduction_time = getSystemSetting('deduction_time', '23:40');
$current_time = date('H:i');

// If running manually, we can skip time check
if (!$is_cli && $current_time !== $deduction_time) {
    log_message("Current time ($current_time) does not match deduction time ($deduction_time). Skipping.");
    exit(0);
}

$today = date('Y-m-d');
$day_of_week = date('N'); // 1 = Monday, 5 = Friday, 6 = Saturday, 7 = Sunday

// Check if today is a school day (Monday to Friday)
$school_days_only = getSystemSetting('school_days_only', '1');

if ($school_days_only == '1') {
    if ($day_of_week == 6 || $day_of_week == 7) {
        log_message("Today is weekend (Saturday/Sunday). No deduction on weekends.");
        exit(0);
    }
}

// Check if today is a holiday
$holiday_check = $db->prepare("SELECT id FROM holiday_calendar WHERE holiday_date = ?");
$holiday_check->bind_param('s', $today);
$holiday_check->execute();
if ($holiday_check->get_result()->num_rows > 0) {
    log_message("Today is a holiday. No deduction.");
    exit(0);
}

// Get all active students with daily deduction rate > 0
$students = $db->query("SELECT id, student_id, full_name, current_balance, daily_deduction_rate, is_in_credit, parent_phone 
                        FROM students 
                        WHERE status = 'active' AND daily_deduction_rate > 0");

$deducted_count = 0;
$skipped_count = 0;
$total_deducted = 0;
$credit_count = 0;

while ($student = $students->fetch_assoc()) {
    $student_id = $student['id'];
    
    // Check if already deducted today
    $check_deduction = $db->prepare("SELECT id FROM deduction_log WHERE student_id = ? AND deduction_date = ?");
    $check_deduction->bind_param('is', $student_id, $today);
    $check_deduction->execute();
    if ($check_deduction->get_result()->num_rows > 0) {
        log_message("Student {$student['student_id']} already deducted today. Skipping.");
        $skipped_count++;
        continue;
    }
    
    $rate = $student['daily_deduction_rate'];
    $balance_before = $student['current_balance'];
    $was_overdue = $balance_before < 0 ? 1 : 0;
    
    // Calculate attendance count for today
    $attendance_count = 0;
    $attendance_stmt = $db->prepare("SELECT COUNT(*) as count FROM attendance_records WHERE student_id = ? AND attendance_date = ?");
    $attendance_stmt->bind_param('is', $student_id, $today);
    $attendance_stmt->execute();
    $attendance_result = $attendance_stmt->get_result();
    if ($attendance_row = $attendance_result->fetch_assoc()) {
        $attendance_count = $attendance_row['count'];
    }
    
    // Apply deduction (subscription model - always deduct regardless of attendance)
    $amount_deducted = $rate;
    $balance_after = $balance_before - $amount_deducted;
    
    // Insert deduction log
    $log_stmt = $db->prepare("INSERT INTO deduction_log (student_id, deduction_date, daily_rate, amount_deducted, balance_before, balance_after, was_overdue, attendance_count) 
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $log_stmt->bind_param('isddddii', $student_id, $today, $rate, $amount_deducted, $balance_before, $balance_after, $was_overdue, $attendance_count);
    $log_stmt->execute();
    
    // Update student balance
    $update_stmt = $db->prepare("UPDATE students SET current_balance = ?, last_deduction_date = ? WHERE id = ?");
    $update_stmt->bind_param('dsi', $balance_after, $today, $student_id);
    $update_stmt->execute();
    
    // Update credit status and overdue days
    $new_is_in_credit = $balance_after < 0 ? 1 : 0;
    if ($new_is_in_credit) {
        $credit_stmt = $db->prepare("UPDATE students SET is_in_credit = 1, consecutive_overdue_days = consecutive_overdue_days + 1, total_overdue_days = total_overdue_days + 1 WHERE id = ?");
        $credit_stmt->bind_param('i', $student_id);
        $credit_stmt->execute();
        $credit_count++;
    } else {
        // Reset overdue days if balance became positive
        if ($was_overdue && !$new_is_in_credit) {
            $reset_stmt = $db->prepare("UPDATE students SET is_in_credit = 0, consecutive_overdue_days = 0 WHERE id = ?");
            $reset_stmt->bind_param('i', $student_id);
            $reset_stmt->execute();
        } else {
            $reset_stmt = $db->prepare("UPDATE students SET is_in_credit = 0 WHERE id = ? AND is_in_credit = 1");
            $reset_stmt->bind_param('i', $student_id);
            $reset_stmt->execute();
        }
    }
    
    $deducted_count++;
    $total_deducted += $amount_deducted;
    
    log_message("Deducted {$student['student_id']} - {$student['full_name']}: ₹$rate (Balance: $balance_before → $balance_after)");
    
    // Send alert if balance became negative
    if ($balance_after < 0 && $balance_before >= 0) {
        $alert_message = "Student {$student['full_name']} has entered negative balance of " . formatCurrency($balance_after);
        
        // Email alert (if email configured)
        $admin_email = getSystemSetting('admin_email', 'admin@schoolbus.com');
        $subject = "[ALERT] Student Credit Alert - {$student['full_name']}";
        $headers = "From: " . SITE_NAME . " <noreply@schoolbus.com>\r\n";
        mail($admin_email, $subject, $alert_message, $headers);
        
        // Log alert
        addAlertLog($student_id, 'credit_entered', $alert_message, $admin_email);
        
        // SMS placeholder for future
        if (getSystemSetting('sms_enabled', '0') == '1') {
            // SMS integration placeholder
            log_message("SMS would be sent to {$student['parent_phone']}");
        }
    }
}

log_message("=== Daily Deduction Complete ===");
log_message("Students deducted: $deducted_count");
log_message("Skipped (already deducted): $skipped_count");
log_message("Total amount deducted: ₹" . number_format($total_deducted, 2));
log_message("Students now in credit: $credit_count");
log_message("================================\n");

// Send daily digest if enabled
if (getSystemSetting('alert_daily_digest', '1') == '1' && $credit_count > 0) {
    $credit_students = $db->query("SELECT full_name, student_id, current_balance, consecutive_overdue_days FROM students WHERE is_in_credit = 1 AND status = 'active'");
    
    $digest_message = "Daily Credit Report - " . date('Y-m-d') . "\n\n";
    $digest_message .= "Total students in credit: " . $credit_count . "\n\n";
    $digest_message .= "Students:\n";
    
    while ($credit = $credit_students->fetch_assoc()) {
        $digest_message .= "- {$credit['full_name']} ({$credit['student_id']}): " . formatCurrency($credit['current_balance']) . " (Overdue: {$credit['consecutive_overdue_days']} days)\n";
    }
    
    $admin_email = getSystemSetting('admin_email', 'admin@schoolbus.com');
    mail($admin_email, "Daily Credit Digest - " . date('Y-m-d'), $digest_message, "From: " . SITE_NAME . " <noreply@schoolbus.com>\r\n");
}

log_message("Daily digest sent to admin");
?>