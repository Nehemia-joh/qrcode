<?php
/**
 * Forward successful Nehemiah attendance scans to Silverleaf Operations Manager.
 *
 * Environment (Apache/php-fpm or .env loader):
 *   OPS_WEBHOOK_URL      — default http://localhost:4000/api/webhooks/attendance
 *   OPS_WEBHOOK_SECRET   — must match WEBHOOK_SECRET in Operations .env
 *   OPS_WEBHOOK_ENABLED  — set to "false" to disable (default: enabled)
 *   OPS_SCHOOL_ID        — optional school id (default sl-main)
 */

function ops_webhook_enabled(): bool
{
    $flag = getenv('OPS_WEBHOOK_ENABLED');
    if ($flag === false || $flag === '') {
        return true;
    }
    return strtolower((string) $flag) !== 'false' && $flag !== '0';
}

/**
 * @param array<string, mixed> $payload
 */
function ops_forward_attendance(array $payload): void
{
    if (!ops_webhook_enabled()) {
        return;
    }

    $url = getenv('OPS_WEBHOOK_URL') ?: 'http://localhost:4000/api/webhooks/attendance';
    $secret = getenv('OPS_WEBHOOK_SECRET') ?: 'dev-webhook-secret';
    $schoolId = getenv('OPS_SCHOOL_ID') ?: 'sl-main';

    $body = array_merge([
        'school_id' => $schoolId,
        'source' => 'nehemiah_php',
    ], $payload);

    if (!function_exists('curl_init')) {
        error_log('[ops_webhook] curl extension not available');
        return;
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-Webhook-Secret: ' . $secret,
        ],
        CURLOPT_POSTFIELDS => json_encode($body),
    ]);

    $response = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($code < 200 || $code >= 300) {
        error_log('[ops_webhook] forward failed HTTP ' . $code . ($err ? " ($err)" : '') . ' ' . substr((string) $response, 0, 200));
    }
}
