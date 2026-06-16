<?php
/**
 * Load key=value pairs from legacy/qrcode/.env (no Composer required).
 * Skips keys already set in the process environment (Apache/php-fpm wins).
 */
function load_qrcode_env(): void
{
    $path = dirname(__DIR__) . '/.env';
    if (!is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') {
            continue;
        }
        $eq = strpos($line, '=');
        if ($eq === false) {
            continue;
        }
        $key = trim(substr($line, 0, $eq));
        $val = trim(substr($line, $eq + 1), " \t\"'");
        if ($key === '' || getenv($key) !== false) {
            continue;
        }
        putenv("{$key}={$val}");
        $_ENV[$key] = $val;
    }
}

load_qrcode_env();
