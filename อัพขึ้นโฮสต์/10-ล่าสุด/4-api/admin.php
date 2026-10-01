<?php

require __DIR__ . '/config/db.php';

$adminId = require_role('admin');

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = db();

function body(): array
{
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

function need_reason(): string
{
    $reason = trim(body()['reason'] ?? '');
    if ($reason === '') {
        json_error('ต้องระบุเหตุผลของการกระทำนี้');
    }
    if (mb_strlen($reason) > 255) {
        json_error('เหตุผลยาวเกิน 255 ตัวอักษร');
    }
    return $reason;
}

function report_id(string $code): int
{
    $stmt = db()->prepare("SELECT report_id FROM reports WHERE report_code = ?");
    $stmt->execute([$code]);
    $id = $stmt->fetchColumn();
    if (!$id) {
        json_error('ไม่พบรายงาน ' . $code, 404);
    }
    return (int) $id;
}

function change_status(int $adminId, string $code, string $to,
                       ?string $reason, string $auditAction,
                       ?int $approve = null): void
{
    $pdo = db();
    $rid = report_id($code);

    $stmt = $pdo->prepare("SELECT status, user_id FROM reports WHERE report_id = ?");
    $stmt->execute([$rid]);
    $row = $stmt->fetch();

    $pdo->beginTransaction();
    try {
        if ($approve === null) {
            $pdo->prepare("UPDATE reports SET status = ?, reject_reason = ? WHERE report_id = ?")
                ->execute([$to, $to === 'reject' ? $reason : null, $rid]);
        } else {
            $pdo->prepare("UPDATE reports SET status = ?, is_approved = ?, reject_reason = ?
                           WHERE report_id = ?")
                ->execute([$to, $approve, $to === 'reject' ? $reason : null, $rid]);
        }

        $pdo->prepare(
            "INSERT INTO report_status_logs (report_id, from_status, to_status, changed_by, note)
             VALUES (?, ?, ?, ?, ?)"
        )->execute([$rid, $row['status'], $to, $adminId, $reason]);

        if (!empty($row['user_id'])) {
            $titles = [
                'ack'    => 'รายงานของคุณได้รับการอนุมัติแล้ว',
                'done_approved' => 'เรื่องที่คุณแจ้งได้รับการแก้ไขแล้ว',
                'reject' => 'รายงานของคุณไม่ผ่านการตรวจสอบ',
                'prog'   => 'รายงานของคุณอยู่ระหว่างดำเนินการ',
                'done'   => 'เรื่องที่คุณแจ้งได้รับการแก้ไขแล้ว',
            ];
            $pdo->prepare(
                "INSERT INTO notifications (user_id, type, title, message, ref_report_id)
                 VALUES (?, ?, ?, ?, ?)"
            )->execute([
                (int) $row['user_id'],
                $to === 'done' ? 'done' : 'status',
                $titles[$to] ?? ('สถานะรายงาน ' . $code . ' เปลี่ยนแล้ว'),
                $reason ?? '',
                $rid,
            ]);
        }

        audit($adminId, $auditAction, 'report', $code, $reason);

        $pdo->commit();
        json_out(['ok' => true]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('ดำเนินการไม่สำเร็จ', 500);
    }
}

const PHOTO_REQUIRED_CATS = ['light', 'walk', 'flood', 'traffic'];

function resolve_report(int $adminId, string $code): void
{
    $pdo  = db();
    $body = body();

    $note = trim($body['note'] ?? '');
    $unit = trim($body['unit'] ?? '');

    if ($note === '') {
        json_error('กรุณากรอกสิ่งที่ดำเนินการไป');
    }
    if (mb_strlen($note) > 500) {
        json_error('รายละเอียดการแก้ไขยาวเกิน 500 ตัวอักษร');
    }
    if (mb_strlen($unit) > 120) {
        json_error('ชื่อหน่วยงานยาวเกินไป');
    }

    $rid = report_id($code);

    $stmt = $pdo->prepare(
        "SELECT r.status, r.user_id, c.code AS cat
         FROM reports r
         JOIN categories c ON c.category_id = r.category_id
         WHERE r.report_id = ?"
    );
    $stmt->execute([$rid]);
    $row = $stmt->fetch();

    if ($row['status'] === 'reject') {
        json_error('รายงานนี้ไม่ผ่านการตรวจสอบ ปิดเรื่องไม่ได้');
    }

    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM report_attachments WHERE report_id = ? AND kind = 'after'"
    );
    $stmt->execute([$rid]);
    $afterCount = (int) $stmt->fetchColumn();

    if ($afterCount === 0 && in_array($row['cat'], PHOTO_REQUIRED_CATS, true)) {
        json_error('เหตุประเภทนี้ต้องแนบรูปหลังแก้ไขอย่างน้อย 1 รูปก่อนปิดเรื่อง');
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            "UPDATE reports
                SET status = 'done', is_approved = 1, reject_reason = NULL,
                    resolved_at = NOW(), resolve_note = ?, resolve_unit = ?, resolved_by = ?
              WHERE report_id = ?"
        )->execute([$note, $unit !== '' ? $unit : null, $adminId, $rid]);

        $pdo->prepare(
            "INSERT INTO report_status_logs (report_id, from_status, to_status, changed_by, note)
             VALUES (?, ?, 'done', ?, ?)"
        )->execute([$rid, $row['status'], $adminId, $note]);

        if (!empty($row['user_id'])) {
            $pdo->prepare(
                "INSERT INTO notifications (user_id, type, title, message, ref_report_id)
                 VALUES (?, 'done', ?, ?, ?)"
            )->execute([
                (int) $row['user_id'],
                'เรื่องที่คุณแจ้งได้รับการแก้ไขแล้ว',
                $note,
                $rid,
            ]);
        }

        audit($adminId, 'resolve_report', 'report', $code, $note);

        $pdo->commit();
        json_out(['ok' => true]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('บันทึกผลการแก้ไขไม่สำเร็จ', 500);
    }
}

if ($method === 'GET') {
    $view = $_GET['view'] ?? 'pending';

    if ($view === 'pending' || $view === 'reports') {
        $sql = "SELECT r.report_code, r.severity, r.status, r.is_approved,
                       r.title, r.description,
                       r.occurred_at, r.latitude, r.longitude, r.is_anonymous,
                       r.reject_reason, r.category_other,
                       r.resolved_at, r.resolve_note, r.resolve_unit,
                       c.code AS category_code,
                       l.name_th AS location_th,
                       u.full_name AS reporter, u.user_id AS reporter_id
                FROM reports r
                JOIN categories c ON c.category_id = r.category_id
                LEFT JOIN locations l ON l.location_id = r.location_id
                LEFT JOIN users u ON u.user_id = r.user_id";
        if ($view === 'pending') {
            $sql .= " WHERE r.is_approved = 0 AND r.status <> 'reject'";
        }
        $sql .= " ORDER BY r.created_at DESC";

        $rows = $pdo->query($sql)->fetchAll();

        json_out(array_map(function (array $r): array {
            return [
                'id'           => $r['report_code'],
                'sev'          => $r['severity'],
                'stage'        => $r['status'],
                'approved'     => (bool) $r['is_approved'],
                'cat'          => $r['category_code'],
                'catOther'     => $r['category_other'],
                'title'        => $r['title'],
                'loc'          => $r['location_th'],
                'note'         => $r['description'],
                'lat'          => (float) $r['latitude'],
                'lng'          => (float) $r['longitude'],
                'reporter'     => $r['reporter'],
                'reporterId'   => $r['reporter_id'] ? (int) $r['reporter_id'] : null,
                'anon'         => (bool) $r['is_anonymous'],
                'rejectReason' => $r['reject_reason'],
                'resolvedAt'   => $r['resolved_at'] ? date('d/m/Y H:i', strtotime($r['resolved_at'])) : null,
                'resolveNote'  => $r['resolve_note'],
                'resolveUnit'  => $r['resolve_unit'],
                'time'         => date('d/m/Y H:i', strtotime($r['occurred_at'])),
            ];
        }, $rows));
    }

    if ($view === 'comments') {
        $rows = $pdo->query(
            "SELECT c.comment_id, c.content, c.created_at, c.is_hidden,
                    r.report_code, r.title AS report_title,
                    COALESCE(u.full_name, 'ผู้ใช้ที่ถูกลบ') AS author
             FROM comments c
             JOIN reports r ON r.report_id = c.report_id
             LEFT JOIN users u ON u.user_id = c.user_id
             ORDER BY c.created_at DESC"
        )->fetchAll();

        json_out(array_map(function (array $c): array {
            return [
                'id'          => (int) $c['comment_id'],
                'by'          => $c['author'],
                'text'        => $c['content'],
                'reportId'    => $c['report_code'],
                'reportTitle' => $c['report_title'],
                'hidden'      => (bool) $c['is_hidden'],
                'time'        => date('d/m/Y H:i', strtotime($c['created_at'])),
            ];
        }, $rows));
    }

    if ($view === 'users') {
        $rows = $pdo->query(
            "SELECT u.user_id, u.full_name, u.student_code, u.email, u.role,
                    u.is_active, u.ban_reason, u.created_at,
                    (SELECT COUNT(*) FROM reports WHERE user_id = u.user_id) AS report_count
             FROM users u
             ORDER BY u.role DESC, u.full_name ASC"
        )->fetchAll();

        json_out(array_map(function (array $u): array {
            return [
                'id'        => (int) $u['user_id'],
                'name'      => $u['full_name'],
                'code'      => $u['student_code'] ?? '-',
                'email'     => $u['email'],
                'role'      => $u['role'],
                'active'    => (bool) $u['is_active'],
                'banReason' => $u['ban_reason'],
                'reports'   => (int) $u['report_count'],
                'joined'    => date('d/m/Y', strtotime($u['created_at'])),
            ];
        }, $rows));
    }

    if ($view === 'audit') {
        $rows = $pdo->query(
            "SELECT a.action, a.target_type, a.target_id, a.reason, a.created_at,
                    u.full_name AS admin_name
             FROM admin_audit_logs a
             JOIN users u ON u.user_id = a.admin_id
             ORDER BY a.created_at DESC
             LIMIT 200"
        )->fetchAll();

        json_out(array_map(function (array $a): array {
            return [
                'admin'  => $a['admin_name'],
                'action' => $a['action'],
                'target' => $a['target_id'],
                'reason' => $a['reason'],
                'time'   => date('d/m/Y H:i', strtotime($a['created_at'])),
            ];
        }, $rows));
    }

    json_error('ไม่รู้จัก view นี้');
}

if ($method !== 'POST') {
    json_error('รับเฉพาะ GET และ POST', 405);
}

require_csrf();

$action = $_GET['action'] ?? '';
$id     = $_GET['id'] ?? '';

switch ($action) {
    case 'approve':
        change_status($adminId, $id, 'ack',
            trim(body()['reason'] ?? '') ?: 'ตรวจสอบข้อมูลแล้ว', 'approve_report', 1);
        break;

    case 'resolve':
        resolve_report($adminId, $id);
        break;

    case 'reject':
        change_status($adminId, $id, 'reject', need_reason(), 'reject_report', 0);
        break;

    case 'set_status':
        $to = body()['status'] ?? '';
        if (!in_array($to, ['ack', 'prog', 'done'], true)) {
            json_error('สถานะไม่ถูกต้อง');
        }

        change_status($adminId, $id, $to, null, 'set_status', 1);
        break;

    case 'delete_report':
        $reason = need_reason();
        $rid = report_id($id);

        $pdo->beginTransaction();
        try {
            audit($adminId, 'delete_report', 'report', $id, $reason);

            $pdo->prepare("DELETE FROM reports WHERE report_id = ?")->execute([$rid]);

            $pdo->commit();
            json_out(['ok' => true]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_error('ลบรายงานไม่สำเร็จ', 500);
        }
        break;

    case 'hide_comment':
        $reason = need_reason();
        $cid = (int) $id;

        $pdo->beginTransaction();
        try {
            $pdo->prepare("UPDATE comments SET is_hidden = 1, hidden_by = ? WHERE comment_id = ?")
                ->execute([$adminId, $cid]);
            audit($adminId, 'hide_comment', 'comment', (string) $cid, $reason);
            $pdo->commit();
            json_out(['ok' => true]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_error('ซ่อนความคิดเห็นไม่สำเร็จ', 500);
        }
        break;

    case 'ban':
    case 'unban':
        $targetId = (int) $id;
        $ban = ($action === 'ban');

        if ($targetId === $adminId) {
            json_error('ระงับบัญชีของตัวเองไม่ได้');
        }

        $stmt = $pdo->prepare("SELECT full_name, role FROM users WHERE user_id = ?");
        $stmt->execute([$targetId]);
        $target = $stmt->fetch();
        if (!$target) {
            json_error('ไม่พบผู้ใช้นี้', 404);
        }

        $reason = $ban ? need_reason() : (trim(body()['reason'] ?? '') ?: 'ตรวจสอบแล้ว ปลดระงับ');

        $pdo->beginTransaction();
        try {
            $pdo->prepare("UPDATE users SET is_active = ?, ban_reason = ? WHERE user_id = ?")
                ->execute([$ban ? 0 : 1, $ban ? $reason : null, $targetId]);
            audit($adminId, $ban ? 'ban_user' : 'unban_user', 'user',
                  (string) $targetId, $reason);
            $pdo->commit();
            json_out(['ok' => true]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_error('ดำเนินการกับบัญชีไม่สำเร็จ', 500);
        }
        break;

    default:
        json_error('ไม่รู้จักคำสั่งนี้');
}
