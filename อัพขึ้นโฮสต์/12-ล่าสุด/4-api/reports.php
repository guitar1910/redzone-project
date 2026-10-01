<?php

require __DIR__ . '/config/db.php';

$userId = require_login();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

if ($method === 'POST' && $action === 'confirm') {
    require_csrf();
    $code = $_GET['id'] ?? '';
    if ($code === '') {
        json_error('ไม่ได้ระบุเลขรายงาน');
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("SELECT report_id FROM reports WHERE report_code = ?");
        $stmt->execute([$code]);
        $reportId = $stmt->fetchColumn();

        if (!$reportId) {
            $pdo->rollBack();
            json_error('ไม่พบรายงานนี้', 404);
        }

        $pdo->prepare("INSERT IGNORE INTO report_confirmations (report_id, user_id) VALUES (?, ?)")
            ->execute([$reportId, $userId]);

        $pdo->prepare("UPDATE reports SET confirm_count =
                         (SELECT COUNT(*) FROM report_confirmations WHERE report_id = ?)
                       WHERE report_id = ?")
            ->execute([$reportId, $reportId]);

        $pdo->commit();
        json_out(['ok' => true]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('บันทึกไม่สำเร็จ', 500);
    }
}

if ($method === 'GET') {
    $stmt = db()->prepare(
        "SELECT r.report_code, r.severity, r.status, r.title, r.description,
                r.occurred_at, r.confirm_count,
                r.category_other,
                c.code AS category_code,
                COALESCE(NULLIF(r.location_name, ''), l.name_th) AS location_th,
                l.latitude, l.longitude
         FROM reports r
         JOIN categories c ON c.category_id = r.category_id
         LEFT JOIN locations l ON l.location_id = r.location_id
         WHERE r.user_id = ?
         ORDER BY r.created_at DESC"
    );
    $stmt->execute([$userId]);

    $out = array_map(function (array $r): array {
        return [
            'id'   => $r['report_code'],
            'sev'  => $r['severity'],
            'cat'      => $r['category_code'],
            'catOther' => $r['category_other'],
            'lat'  => (float) ($r['latitude']  ?? 0),
            'lng'  => (float) ($r['longitude'] ?? 0),
            'mine' => true,
            'stage' => $r['status'],
            'conf' => (int) $r['confirm_count'],
            'title' => $r['title'],
            'loc'   => $r['location_th'],
            'note'  => $r['description'],
            'time'  => date('d/m/Y H:i', strtotime($r['occurred_at'])),
            'comments' => [],
        ];
    }, $stmt->fetchAll());

    json_out($out);
}

if ($method === 'POST') {
    require_csrf();
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $catCode  = trim($body['cat'] ?? '');
    $catOther = trim($body['catOther'] ?? '');
    $sev      = $body['sev'] ?? 'mid';

    if (!is_numeric($body['lat'] ?? null) || !is_numeric($body['lng'] ?? null)) {
        json_error('พิกัดไม่ถูกต้อง');
    }
    $lat = (float) $body['lat'];
    $lng = (float) $body['lng'];

    if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
        json_error('พิกัดอยู่นอกช่วงที่เป็นไปได้');
    }
    $locName = trim($body['loc'] ?? '');
    $desc    = trim($body['desc'] ?? '');
    $when    = $body['when'] ?? date('Y-m-d H:i:s');
    $anon    = !empty($body['anonymous']);

    if ($catCode === '' || $locName === '') {
        json_error('กรุณาเลือกประเภทเหตุการณ์และตำแหน่ง');
    }
    if (!in_array($sev, ['high', 'mid', 'low'], true)) {
        json_error('ระดับความเสี่ยงไม่ถูกต้อง');
    }
    if (mb_strlen($desc) > 500) {
        json_error('รายละเอียดยาวเกิน 500 ตัวอักษร');
    }

    if ($catCode === 'other' && $catOther === '') {
        json_error('กรุณาระบุประเภทเหตุการณ์');
    }
    if (mb_strlen($catOther) > 120) {
        json_error('ชื่อประเภทเหตุการณ์ยาวเกินไป');
    }
    if (mb_strlen($locName) > 120) {
        json_error('ชื่อจุดยาวเกิน 120 ตัวอักษร');
    }

    $centerLat = 13.8197;
    $centerLng = 100.5145;
    $maxMetres = 4000;

    $earth = 6371000;
    $dLat = deg2rad($lat - $centerLat);
    $dLng = deg2rad($lng - $centerLng);
    $a = sin($dLat / 2) ** 2
       + cos(deg2rad($centerLat)) * cos(deg2rad($lat)) * sin($dLng / 2) ** 2;
    $distance = $earth * 2 * atan2(sqrt($a), sqrt(1 - $a));

    if ($distance > $maxMetres) {
        json_error('ตำแหน่งอยู่นอกขอบเขตที่รับแจ้ง (รัศมี 4 กม. รอบ มจพ.)');
    }

    $pdo = db();

    $stmt = $pdo->prepare("SELECT category_id, name_th FROM categories WHERE code = ?");
    $stmt->execute([$catCode]);
    $cat = $stmt->fetch();
    if (!$cat) {
        json_error('ไม่พบประเภทเหตุการณ์นี้');
    }

    $stmt = $pdo->prepare("SELECT location_id FROM locations WHERE name_th = ?");
    $stmt->execute([$locName]);
    $locationId = $stmt->fetchColumn() ?: null;

    $year = (int) date('Y') + 543;
    $stmt = $pdo->prepare(
        "SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(report_code, '-', -1) AS UNSIGNED)), 0)
         FROM reports WHERE report_code LIKE ?"
    );
    $stmt->execute(["RZ-$year-%"]);
    $code = sprintf('RZ-%d-%04d', $year, (int) $stmt->fetchColumn() + 1);

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            "INSERT INTO reports
               (report_code, user_id, category_id, category_other, location_id,
                location_name, severity, status, is_approved, title, description,
                occurred_at, latitude, longitude, is_anonymous)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', 0, ?, ?, ?, ?, ?, ?)"
        )->execute([
            $code,
            $userId,
            $cat['category_id'],
            $catOther !== '' ? $catOther : null,
            $locationId,
            $locName,
            $sev,
            ($catOther !== '' ? $catOther : $cat['name_th']) . ' — ' . $locName,
            $desc,
            date('Y-m-d H:i:s', strtotime($when)),
            $lat,
            $lng,
            $anon ? 1 : 0,
        ]);

        $reportId = (int) $pdo->lastInsertId();

        $log = $pdo->prepare(
            "INSERT INTO report_status_logs (report_id, from_status, to_status, note)
             VALUES (?, ?, ?, ?)"
        );
        $log->execute([$reportId, null, 'sent', 'ผู้ใช้ส่งรายงานเข้าระบบ รอผู้ดูแลตรวจสอบ']);

        $pdo->commit();
        json_out(['ok' => true, 'id' => $code], 201);
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('บันทึกรายงานไม่สำเร็จ', 500);
    }
}

json_error('ไม่รองรับคำสั่งนี้', 405);
