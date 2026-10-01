<?php

require __DIR__ . '/config/db.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('วิธีเรียกข้อมูลไม่ถูกต้อง', 405);
}

if (($_GET['action'] ?? '') === 'logout') {
    require_csrf();
    session_destroy();
    json_out(['ok' => true]);
}

$body     = json_decode(file_get_contents('php://input'), true) ?? [];
$username = strtolower(trim($body['username'] ?? ''));
$password = $body['password'] ?? '';

if ($username === '' || $password === '') {
    json_error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
}

const MAX_TRIES = 8;
const WINDOW_MIN = 15;

$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$pdo = db();

$pdo->prepare("DELETE FROM login_attempts
               WHERE created_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)")
    ->execute([WINDOW_MIN]);

$stmt = $pdo->prepare(
    "SELECT COUNT(*) FROM login_attempts
     WHERE (username = ? OR ip_address = ?)
       AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)"
);
$stmt->execute([$username, $ip, WINDOW_MIN]);

if ((int) $stmt->fetchColumn() >= MAX_TRIES) {
    json_error('เข้าสู่ระบบผิดหลายครั้งเกินไป · กรุณารอ ' .
               WINDOW_MIN . ' นาที', 429);
}

$stmt = $pdo->prepare(
    "SELECT user_id, username, full_name, student_code, email,
            role, password_hash, is_active, ban_reason
     FROM users WHERE username = ?"
);
$stmt->execute([$username]);
$user = $stmt->fetch();

$DUMMY_HASH = '$2y$12$'.'usermustnotexist000000000000000000000000000000000000';
$ok = password_verify($password, $user ? $user['password_hash'] : $DUMMY_HASH);

if (!$user || !$ok) {
    $pdo->prepare("INSERT INTO login_attempts (username, ip_address) VALUES (?, ?)")
        ->execute([mb_substr($username, 0, 20), $ip]);

    json_error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);
}

$pdo->prepare("DELETE FROM login_attempts WHERE username = ? OR ip_address = ?")
    ->execute([$username, $ip]);

if (!$user['is_active']) {
    json_error('บัญชีนี้ถูกระงับการใช้งาน' .
        ($user['ban_reason'] ? ' : ' . $user['ban_reason'] : '') .
        ' · กรุณาติดต่อผู้ดูแลระบบ', 403);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['user_id'];
$_SESSION['role']    = $user['role'];

unset($_SESSION['csrf']);

json_out([
    'ok'   => true,

    'csrf' => csrf_token(),
    'user' => [
        'userId'   => (int) $user['user_id'],
        'username' => $user['username'],
        'name'     => $user['full_name'],
        'code'     => $user['student_code'] ?? '-',
        'email'    => $user['email'],
        'role'     => $user['role'],
    ],
]);
