<?php

define('DB_HOST', getenv('RZ_DB_HOST') ?: '127.0.0.1');
define('DB_NAME', getenv('RZ_DB_NAME') ?: 'redzone');
define('DB_USER', getenv('RZ_DB_USER') ?: 'root');
define('DB_PASS', getenv('RZ_DB_PASS') !== false ? getenv('RZ_DB_PASS') : '');

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

set_exception_handler(function (Throwable $e): void {
    error_log('RedZone uncaught: ' . $e->getMessage() . ' @ ' .
              $e->getFile() . ':' . $e->getLine());

    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['ok' => false, 'error' => 'ระบบขัดข้อง กรุณาลองใหม่'],
                     JSON_UNESCAPED_UNICODE);
    exit;
});

if (session_status() === PHP_SESSION_NONE) {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => $isHttps,
    ]);
}

function csrf_token(): string
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function require_csrf(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $have = $_SESSION['csrf'] ?? '';

    if ($have === '' || !is_string($sent) || !hash_equals($have, $sent)) {
        json_error('คำขอไม่ถูกต้อง กรุณารีเฟรชหน้าเว็บแล้วลองใหม่', 419);
    }
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        error_log('RedZone DB connect failed: ' . $e->getMessage());
        json_error('เชื่อมต่อฐานข้อมูลไม่ได้ — ตรวจค่าใน api/config/db.php', 500);
    }

    return $pdo;
}

function json_out($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $status = 400): void
{
    json_out(['ok' => false, 'error' => $message], $status);
}

function require_login(): int
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (empty($_SESSION['user_id'])) {
        json_error('กรุณาเข้าสู่ระบบ', 401);
    }
    return (int) $_SESSION['user_id'];
}

function require_role(string $role): int
{
    $userId = require_login();

    if (($_SESSION['role'] ?? '') !== $role) {
        json_error('ไม่มีสิทธิ์เข้าถึงส่วนนี้', 403);
    }
    return $userId;
}

function audit(int $adminId, string $action, string $targetType,
               string $targetId, ?string $reason = null): void
{
    db()->prepare(
        "INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, reason)
         VALUES (?, ?, ?, ?, ?)"
    )->execute([$adminId, $action, $targetType, $targetId, $reason]);
}

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                     'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function thai_date(?string $mysqlDateTime): string
{
    if (!$mysqlDateTime) {
        return '-';
    }
    $ts = strtotime($mysqlDateTime);

    return (int) date('j', $ts) . ' ' . THAI_MONTHS[(int) date('n', $ts) - 1]
         . ' ' . ((int) date('Y', $ts) + 543);
}

function thai_time(?string $mysqlDateTime): string
{
    if (!$mysqlDateTime) {
        return '-';
    }
    return thai_date($mysqlDateTime) . ' ' . date('H:i', strtotime($mysqlDateTime));
}
