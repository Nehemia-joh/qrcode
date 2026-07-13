<?php
/**
 * Shown when user arrived via Operations SSO — one click back to Transport.
 */
function render_ops_return_bar(): void
{
    if (empty($_SESSION['sso_from_ops'])) {
        return;
    }
    $ops = getenv('OPS_APP_URL') ?: 'http://localhost:8080';
    $ops = rtrim($ops, '/');
    $href = htmlspecialchars($ops . '/transport', ENT_QUOTES, 'UTF-8');
    echo <<<HTML
<div style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#0f766e;color:#fff;padding:0.5rem 1rem;font-size:0.875rem;display:flex;align-items:center;justify-content:center;gap:0.75rem;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
  <span>Opened from Silverleaf Operations</span>
  <a href="{$href}" style="color:#fff;font-weight:600;text-decoration:underline;">← Back to Transport</a>
</div>
<div style="height:2.5rem;"></div>
HTML;
}
