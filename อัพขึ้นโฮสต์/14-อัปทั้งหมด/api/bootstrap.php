<?php

require __DIR__ . '/config/db.php';

$userId = require_login();
$isAdmin = (($_SESSION['role'] ?? '') === 'admin');
$pdo = db();

$stmt = $pdo->prepare(
    "SELECT user_id, username, full_name, student_code, email, role
     FROM users WHERE user_id = ?"
);
$stmt->execute([$userId]);
$me = $stmt->fetch();

if (!$me) {
    session_destroy();
    json_error('ไม่พบบัญชีนี้ในระบบ กรุณาเข้าสู่ระบบอีกครั้ง', 401);
}

$where  = "";
$params = [];

if (!$isAdmin) {
    $where = "WHERE (r.is_approved = 1 AND r.status <> 'reject') OR r.user_id = ?";
    $params[] = $userId;
}

$sql = "SELECT r.report_id, r.report_code, r.user_id, r.severity, r.status,
               r.is_approved, r.title, r.description, r.occurred_at,
               r.latitude, r.longitude, r.is_anonymous, r.reject_reason,
               r.resolved_at, r.resolve_note, r.resolve_unit,
               r.confirm_count, r.category_other,
               c.code     AS category_code,
               COALESCE(NULLIF(r.location_name, ''), l.name_th) AS location_th,
               u.full_name AS reporter
        FROM reports r
        JOIN categories c   ON c.category_id = r.category_id
        LEFT JOIN locations l ON l.location_id = r.location_id
        LEFT JOIN users u     ON u.user_id     = r.user_id
        $where
        ORDER BY r.occurred_at DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

$hidden = $isAdmin ? "" : "AND cm.is_hidden = 0";

$cmtRows = $pdo->query(
    "SELECT cm.report_id, cm.comment_id, cm.content, cm.created_at, cm.is_hidden,
            u.full_name AS author
     FROM comments cm
     LEFT JOIN users u ON u.user_id = cm.user_id
     WHERE 1 = 1 $hidden
     ORDER BY cm.created_at ASC"
)->fetchAll();

$byReport = [];
foreach ($cmtRows as $c) {
    $byReport[(int) $c['report_id']][] = [
        'id'     => (int) $c['comment_id'],
        'by'     => $c['author'] ?? 'บัญชีที่ถูกลบแล้ว',
        'text'   => $c['content'],
        'time'   => thai_time($c['created_at']),
        'hidden' => (bool) $c['is_hidden'],
    ];
}

$photoRows = $pdo->query(
    "SELECT report_id, kind, file_path
     FROM report_attachments
     ORDER BY attachment_id"
)->fetchAll();

$byPhoto = [];
$byAfter = [];

foreach ($photoRows as $ph) {
    if (($ph['kind'] ?? 'before') === 'after') {
        $byAfter[(int) $ph['report_id']][] = $ph['file_path'];
    } else {
        $byPhoto[(int) $ph['report_id']][] = $ph['file_path'];
    }
}

$reports = array_map(function (array $r) use ($byReport, $byPhoto, $byAfter, $isAdmin, $userId): array {
    $out = [
        'id'        => $r['report_code'],
        'sev'       => $r['severity'],
        'cat'       => $r['category_code'],
        'catOther'  => $r['category_other'] ?? '',
        'lat'       => (float) $r['latitude'],
        'lng'       => (float) $r['longitude'],
        'stage'     => $r['status'],
        'approved'  => (bool) $r['is_approved'],
        'conf'      => (int) $r['confirm_count'],
        'title'     => $r['title'],
        'loc'       => $r['location_th'] ?? 'ไม่ระบุสถานที่',
        'note'      => $r['description'] ?? '',
        'time'      => thai_time($r['occurred_at']),
        'at'        => date('c', strtotime($r['occurred_at'])),
        'anon'      => (bool) $r['is_anonymous'],
        'comments'  => $byReport[(int) $r['report_id']] ?? [],
        'photos'      => $byPhoto[(int) $r['report_id']] ?? [],
        'afterPhotos' => $byAfter[(int) $r['report_id']] ?? [],
        'resolvedAt'  => $r['resolved_at'] ? thai_time($r['resolved_at']) : null,
        'resolveNote' => $r['resolve_note'],
        'resolveUnit' => $r['resolve_unit'],
    ];

    $isOwner = ($r['user_id'] !== null && (int) $r['user_id'] === $userId);

    if ($r['user_id'] !== null && ($isAdmin || $isOwner)) {
        $out['reporterId'] = (int) $r['user_id'];
        $out['reporter']   = $r['reporter'];
    } elseif ($r['user_id'] !== null && !$r['is_anonymous']) {
        $out['reporter'] = $r['reporter'];
    }

    if ($r['reject_reason']) {
        $out['rejectReason'] = $r['reject_reason'];
    }

    return $out;
}, $rows);

$stmt = $pdo->prepare(
    "SELECT n.type, n.title, n.message, n.is_read, n.created_at
     FROM notifications n
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC
     LIMIT 50"
);
$stmt->execute([$userId]);

$alerts = array_map(function (array $a) use ($userId): array {
    return [
        'userId' => $userId,
        'k'      => $a['type'],
        'title'  => $a['title'],
        'msg'    => $a['message'] ?? '',
        'n'      => !$a['is_read'],
        'time'   => thai_time($a['created_at']),
    ];
}, $stmt->fetchAll());

$users = [];
$audit = [];

if ($isAdmin) {
    $users = array_map(function (array $u): array {
        return [
            'id'      => (int) $u['user_id'],
            'name'    => $u['full_name'],
            'code'    => $u['student_code'] ?? '-',
            'email'   => $u['email'],
            'role'    => $u['role'],
            'active'  => (bool) $u['is_active'],
            'reports' => (int) $u['report_count'],
            'joined'  => thai_date($u['created_at']),
            'banReason' => $u['ban_reason'],
        ];
    }, $pdo->query(
        "SELECT u.user_id, u.full_name, u.student_code, u.email, u.role,
                u.is_active, u.ban_reason, u.created_at,
                (SELECT COUNT(*) FROM reports r WHERE r.user_id = u.user_id) AS report_count
         FROM users u ORDER BY u.user_id"
    )->fetchAll());

    $audit = array_map(function (array $a): array {
        return [
            'admin'  => $a['admin_name'],
            'action' => $a['action'],
            'target' => $a['target_id'],
            'reason' => $a['reason'] ?? '',
            'time'   => thai_time($a['created_at']),
        ];
    }, $pdo->query(

        "SELECT al.action,
                COALESCE(t.full_name, al.target_id) AS target_id,
                al.reason, al.created_at,
                u.full_name AS admin_name
         FROM admin_audit_logs al
         JOIN users u ON u.user_id = al.admin_id
         LEFT JOIN users t ON al.target_type = 'user'
                          AND t.user_id = CAST(al.target_id AS UNSIGNED)
         ORDER BY al.created_at DESC LIMIT 100"
    )->fetchAll());
}

json_out([
    'ok'   => true,

    'csrf' => csrf_token(),
    'me'   => [
        'userId'   => (int) $me['user_id'],
        'username' => $me['username'],
        'name'     => $me['full_name'],
        'code'     => $me['student_code'] ?? '-',
        'email'    => $me['email'],
        'role'     => $me['role'],
    ],
    'reports' => $reports,
    'alerts'  => $alerts,
    'users'   => $users,
    'audit'   => $audit,
]);
