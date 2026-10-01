<?php

require __DIR__ . '/config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('รับเฉพาะ GET', 405);
}

$severity = $_GET['severity'] ?? null;

$sql = "SELECT r.report_code, r.severity, r.status, r.title, r.description,
               r.occurred_at, r.confirm_count, r.is_anonymous, r.category_other,
               c.code       AS category_code,
               COALESCE(NULLIF(r.location_name, ''), l.name_th) AS location_th,
               l.name_en    AS location_en,
               l.latitude, l.longitude
        FROM reports r
        JOIN categories c ON c.category_id = r.category_id
        LEFT JOIN locations l ON l.location_id = r.location_id
        WHERE r.is_approved = 1 AND r.status <> 'reject'";

$params = [];
if ($severity !== null && in_array($severity, ['high', 'mid', 'low'], true)) {
    $sql .= " AND r.severity = :sev";
    $params['sev'] = $severity;
}
$sql .= " ORDER BY r.occurred_at DESC";

$stmt = db()->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

$out = array_map(function (array $r): array {
    return [
        'id'   => $r['report_code'],
        'sev'  => $r['severity'],
        'cat'      => $r['category_code'],
        'catOther' => $r['category_other'],
        'lat'  => (float) ($r['latitude']  ?? 0),
        'lng'  => (float) ($r['longitude'] ?? 0),
        'mine' => false,
        'stage' => $r['status'],
        'conf' => (int) $r['confirm_count'],
        'comments' => [],
        'title' => $r['title'],
        'loc'   => $r['location_th'],
        'note'  => $r['description'],
        'time'  => date('d/m/Y H:i', strtotime($r['occurred_at'])),
    ];
}, $rows);

json_out($out);
