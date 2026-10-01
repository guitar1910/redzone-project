<?php

require __DIR__ . '/config/db.php';

session_start();
require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('วิธีเรียกข้อมูลไม่ถูกต้อง', 405);
}

require_csrf();

const MAX_PHOTOS    = 3;
const MAX_BYTES     = 3 * 1024 * 1024;
const MAX_EDGE      = 4000;
const UPLOAD_DIR    = __DIR__ . '/../uploads';

$code   = trim($_POST['report'] ?? '');
$kind   = ($_POST['kind'] ?? 'before') === 'after' ? 'after' : 'before';
$userId = (int) $_SESSION['user_id'];
$isAdmin = ($_SESSION['role'] ?? '') === 'admin';

if ($kind === 'after' && !$isAdmin) {
    json_error('เฉพาะผู้ดูแลระบบเท่านั้นที่แนบรูปหลังแก้ไขได้', 403);
}

if ($code === '') {
    json_error('ไม่พบเลขรายงาน');
}

$pdo = db();

$stmt = $pdo->prepare('SELECT report_id, user_id FROM reports WHERE report_code = ?');
$stmt->execute([$code]);
$report = $stmt->fetch();

if (!$report) {
    json_error('ไม่พบรายงานนี้', 404);
}

if ($kind === 'before' && !$isAdmin && (int) $report['user_id'] !== $userId) {
    json_error('คุณไม่มีสิทธิ์แนบรูปกับรายงานนี้', 403);
}

$reportId = (int) $report['report_id'];

$stmt = $pdo->prepare('SELECT COUNT(*) FROM report_attachments WHERE report_id = ? AND kind = ?');
$stmt->execute([$reportId, $kind]);
$already = (int) $stmt->fetchColumn();

if (!isset($_FILES['photos'])) {
    json_error('ไม่พบไฟล์รูปที่แนบมา');
}

$files = $_FILES['photos'];
$count = is_array($files['name']) ? count($files['name']) : 0;

if ($count === 0) {
    json_error('ไม่พบไฟล์รูปที่แนบมา');
}

if ($already + $count > MAX_PHOTOS) {
    json_error('แนบรูปได้สูงสุด ' . MAX_PHOTOS . ' รูป');
}

if (!is_dir(UPLOAD_DIR) && !@mkdir(UPLOAD_DIR, 0755, true)) {
    json_error('ระบบจัดเก็บรูปขัดข้อง กรุณาแจ้งผู้ดูแลระบบ', 500);
}

if (!is_writable(UPLOAD_DIR)) {
    json_error('ระบบจัดเก็บรูปขัดข้อง กรุณาแจ้งผู้ดูแลระบบ', 500);
}

$allowed = [
    IMAGETYPE_JPEG => 'jpg',
    IMAGETYPE_PNG  => 'png',
    IMAGETYPE_WEBP => 'webp',
];

$saved = [];
$paths = [];

$cleanup = function () use (&$paths) {
    foreach ($paths as $p) {
        @unlink($p);
    }
};

for ($i = 0; $i < $count; $i++) {
    if ($files['error'][$i] !== UPLOAD_ERR_OK) {
        $cleanup();
        json_error('อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }

    $tmp = $files['tmp_name'][$i];

    if (!is_uploaded_file($tmp)) {
        $cleanup();
        json_error('ไฟล์รูปไม่ถูกต้อง');
    }

    if ($files['size'][$i] > MAX_BYTES) {
        $cleanup();
        json_error('ไฟล์ใหญ่เกิน ' . (MAX_BYTES / 1024 / 1024) . ' MB');
    }

    $info = @getimagesize($tmp);

    if ($info === false || !isset($allowed[$info[2]])) {
        $cleanup();
        json_error('รองรับเฉพาะไฟล์ JPG, PNG และ WEBP');
    }

    if ($info[0] > MAX_EDGE || $info[1] > MAX_EDGE) {
        $cleanup();
        json_error('ขนาดภาพใหญ่เกินไป');
    }

    $ext  = $allowed[$info[2]];
    $name = bin2hex(random_bytes(16)) . '.' . $ext;
    $dest = UPLOAD_DIR . '/' . $name;

    if (!move_uploaded_file($tmp, $dest)) {
        $cleanup();
        json_error('บันทึกไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 500);
    }

    @chmod($dest, 0644);

    $paths[] = $dest;
    $saved[] = [
        'path' => 'uploads/' . $name,
        'size' => (int) $files['size'][$i],
        'mime' => $info['mime'] ?? 'image/' . $ext,
    ];
}

try {
    $pdo->beginTransaction();

    $ins = $pdo->prepare(
        'INSERT INTO report_attachments (report_id, kind, file_path, file_size, mime_type)
         VALUES (?, ?, ?, ?, ?)'
    );

    foreach ($saved as $s) {
        $ins->execute([$reportId, $kind, $s['path'], $s['size'], $s['mime']]);
    }

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    $cleanup();
    json_error('บันทึกข้อมูลรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 500);
}

json_out([
    'ok'     => true,
    'photos' => array_map(function (array $s): string {
        return $s['path'];
    }, $saved),
], 201);
