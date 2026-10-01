<?php

require __DIR__ . '/config/db.php';

session_start();
$userId = $_SESSION['user_id'] ?? 1;
$role   = $_SESSION['role']    ?? 'user';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

if ($method === 'POST' && $action === 'delete') {
    require_csrf();
    $commentId = (int) ($_GET['id'] ?? 0);
    if ($commentId <= 0) {
        json_error('ไม่ได้ระบุความคิดเห็นที่จะลบ');
    }

    $stmt = db()->prepare("SELECT user_id FROM comments WHERE comment_id = ?");
    $stmt->execute([$commentId]);
    $owner = $stmt->fetchColumn();

    if ($owner === false) {
        json_error('ไม่พบความคิดเห็นนี้', 404);
    }

    $isOwner = ((int) $owner === $userId);
    if (!$isOwner && $role !== 'admin') {
        json_error('ไม่มีสิทธิ์ลบความคิดเห็นนี้', 403);
    }

    db()->prepare("UPDATE comments SET is_hidden = 1, hidden_by = ? WHERE comment_id = ?")
        ->execute([$userId, $commentId]);

    json_out(['ok' => true]);
}

if ($method === 'GET') {
    $code = $_GET['report'] ?? '';
    if ($code === '') {
        json_error('ไม่ได้ระบุเลขรายงาน');
    }

    $stmt = db()->prepare(
        "SELECT c.comment_id, c.content, c.created_at, c.user_id,
                COALESCE(u.full_name, 'ผู้ใช้ที่ถูกลบ') AS author
         FROM comments c
         JOIN reports r  ON r.report_id = c.report_id
         LEFT JOIN users u ON u.user_id = c.user_id
         WHERE r.report_code = ? AND c.is_hidden = 0
         ORDER BY c.created_at ASC"
    );
    $stmt->execute([$code]);

    $out = array_map(function (array $c) use ($userId): array {
        return [
            'id'   => (int) $c['comment_id'],
            'by'   => $c['author'],
            'text' => $c['content'],
            'time' => date('d/m/Y H:i', strtotime($c['created_at'])),
            'own'  => ((int) $c['user_id'] === $userId),
        ];
    }, $stmt->fetchAll());

    json_out($out);
}

if ($method === 'POST') {
    require_csrf();
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $code = trim($body['report'] ?? '');
    $text = trim($body['text'] ?? '');

    if ($code === '' || $text === '') {
        json_error('กรุณาพิมพ์ความคิดเห็น');
    }
    if (mb_strlen($text) > 500) {
        json_error('ความคิดเห็นยาวเกิน 500 ตัวอักษร');
    }

    $pdo = db();

    $stmt = $pdo->prepare("SELECT report_id FROM reports WHERE report_code = ?");
    $stmt->execute([$code]);
    $reportId = $stmt->fetchColumn();
    if (!$reportId) {
        json_error('ไม่พบรายงานนี้', 404);
    }

    $pdo->prepare("INSERT INTO comments (report_id, user_id, content) VALUES (?, ?, ?)")
        ->execute([$reportId, $userId, $text]);

    json_out(['ok' => true, 'id' => (int) $pdo->lastInsertId()], 201);
}

json_error('ไม่รองรับคำสั่งนี้', 405);
