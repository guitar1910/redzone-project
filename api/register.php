<?php

require __DIR__ . '/config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('วิธีเรียกข้อมูลไม่ถูกต้อง', 405);
}

const MAIL_DOMAIN = '@email.kmutnb.ac.th';

$body     = json_decode(file_get_contents('php://input'), true) ?? [];
$username = strtolower(trim($body['username'] ?? ''));
$name     = trim($body['name'] ?? '');
$code     = trim($body['code'] ?? '');
$password = $body['password'] ?? '';

if ($username === '' || $name === '' || $code === '' || $password === '') {
    json_error('กรุณากรอกข้อมูลให้ครบทุกช่อง');
}
if (mb_strlen($username) < 4 || mb_strlen($username) > 20) {
    json_error('ชื่อผู้ใช้ต้องมี 4-20 ตัวอักษร');
}
if (!preg_match('/^[a-z0-9._]+$/', $username)) {
    json_error('ชื่อผู้ใช้ใช้ได้เฉพาะ a-z, 0-9, จุด และขีดล่าง');
}
if (!preg_match('/^[0-9]{8,13}$/', $code)) {
    json_error('รหัสนักศึกษา/บุคลากรต้องเป็นตัวเลข 8-13 หลัก');
}
if (mb_strlen($password) < 8) {
    json_error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
}
if (mb_strlen($name) > 100) {
    json_error('ชื่อ-นามสกุลยาวเกินไป');
}

$email = 's' . $code . MAIL_DOMAIN;

$dup = db()->prepare("SELECT username, student_code FROM users
                      WHERE username = ? OR student_code = ? OR email = ?");
$dup->execute([$username, $code, $email]);

if ($row = $dup->fetch()) {
    if ($row['username'] === $username) {
        json_error('ชื่อผู้ใช้นี้ถูกใช้แล้ว กรุณาใช้ชื่ออื่น', 409);
    }
    json_error('รหัสนี้มีบัญชีอยู่แล้ว · หากลืมรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ', 409);
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$pdo  = db();

try {
    $pdo->beginTransaction();

    $pdo->prepare(
        "INSERT INTO users (username, student_code, email, password_hash,
                            full_name, role, is_active)
         VALUES (?, ?, ?, ?, ?, 'user', 1)"
    )->execute([$username, $code, $email, $hash, $name]);

    $userId = (int) $pdo->lastInsertId();

    $pdo->prepare("INSERT INTO user_settings (user_id) VALUES (?)")
        ->execute([$userId]);

    $pdo->commit();

} catch (PDOException $e) {
    $pdo->rollBack();

    if ($e->getCode() === '23000') {
        json_error('ชื่อผู้ใช้นี้มีคนใช้แล้ว กรุณาเลือกชื่ออื่น', 409);
    }

    error_log('register failed: ' . $e->getMessage());
    json_error('สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 500);
}

json_out([
    'ok'      => true,
    'message' => 'สมัครสมาชิกเรียบร้อย กรุณาเข้าสู่ระบบด้วยรหัสผ่านที่ตั้งไว้',
    'user'    => ['username' => $username, 'email' => $email],
]);
