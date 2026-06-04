<?php
/**
 * Optional: forward attendance POST from Nehemiah to Operations Manager webhook.
 * Configure OPS_WEBHOOK_URL and OPS_WEBHOOK_SECRET below.
 */
header('Content-Type: application/json');

$opsUrl = getenv('OPS_WEBHOOK_URL') ?: 'http://localhost:4000/api/webhooks/attendance';
$secret = getenv('OPS_WEBHOOK_SECRET') ?: 'dev-webhook-secret';

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$payload = [
    'student_id' => $input['qr_data'] ?? $input['student_id'] ?? null,
    'full_name' => $input['full_name'] ?? null,
    'attendance_type' => $input['attendance_type'] ?? 'scan',
    'attendance_time' => $input['attendance_time'] ?? date('c'),
    'is_in_credit' => $input['is_in_credit'] ?? 0,
    'current_balance' => $input['current_balance'] ?? null,
    'parent_phone' => $input['parent_phone'] ?? null,
    'bus_number' => $input['bus_number'] ?? null,
    'source' => 'nehemiah_php',
];

$ch = curl_init($opsUrl);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-Webhook-Secret: ' . $secret,
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
]);
$response = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($code >= 200 && $code < 300 ? 200 : 502);
echo $response ?: json_encode(['success' => false, 'message' => 'Webhook forward failed']);
