<?php

require __DIR__ . '/config/db.php';

$userId = require_login();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_GET['action'] ?? '') === 'read') {
    require_csrf();
    db()->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?")
        ->execute([$userId]);
    json_out(['ok' => true]);
}

$stmt = db()->prepare(
    "SELECT type, title, message, is_read, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 50"
);
$stmt->execute([$userId]);

$out = array_map(function (array $r): array {
    return [
        'n'  => !$r['is_read'],
        'k'  => $r['type'],
        'title' => $r['title'],
        'msg'   => $r['message'],
        'time'  => date('d/m/Y H:i', strtotime($r['created_at'])),
    ];
}, $stmt->fetchAll());

json_out($out);
