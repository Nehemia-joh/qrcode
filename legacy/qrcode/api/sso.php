<?php
/**
 * SSO from Silverleaf Operations Manager → Bus QR (qrcode) PHP session.
 *
 * Operations API: GET /api/nehemiah/sso-url (JWT required)
 * Opens: {NEHEMIAH_APP_URL}/api/sso.php?token=...&return=finance/students.php
 *
 * Env on PHP host: OPS_SSO_SECRET (same as NEHEMIAH_SSO_SECRET / WEBHOOK_SECRET in Operations .env)
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

function ops_sso_secret(): string
{
    $s = getenv('OPS_SSO_SECRET') ?: getenv('NEHEMIAH_SSO_SECRET');
    if ($s) {
        return $s;
    }
    return 'dev-webhook-secret';
}

function ops_sso_verify_token(string $token): ?array
{
    $parts = explode('.', $token, 2);
    if (count($parts) !== 2) {
        return null;
    }
    [$body, $sig] = $parts;
    $expected = rtrim(strtr(base64_encode(hash_hmac('sha256', $body, ops_sso_secret(), true)), '+/', '-_'), '=');
    if (!hash_equals($expected, $sig)) {
        return null;
    }
    $json = base64_decode(strtr($body, '-_', '+/'));
    $data = json_decode($json, true);
    if (!is_array($data) || empty($data['username']) || empty($data['exp'])) {
        return null;
    }
    if ((int) $data['exp'] < time()) {
        return null;
    }
    return $data;
}

$token = $_GET['token'] ?? '';
$return = $_GET['return'] ?? 'index.php';

// Only allow relative paths inside this app
$return = preg_replace('#^(\.\./|https?://)#', '', $return);
if ($return === '' || strpos($return, '..') !== false) {
    $return = 'index.php';
}

if (!$token) {
    http_response_code(400);
    echo 'Missing SSO token. Open Bus QR from Silverleaf Transport (logged in).';
    exit;
}

$payload = ops_sso_verify_token($token);
if (!$payload) {
    http_response_code(401);
    echo 'Invalid or expired SSO token. Return to Operations → Transport and try again.';
    exit;
}

if (!loginUserByUsername($payload['username'])) {
    http_response_code(403);
    echo 'No matching qrcode user for username: ' . htmlspecialchars($payload['username'])
        . '. Create the same username in the Bus QR system (school_bus_tracking.users).';
    exit;
}

header('Location: ' . SITE_URL . $return);
exit;
