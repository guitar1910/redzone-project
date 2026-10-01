<?php

/**
 * RedZone · ไฟล์ตรวจสอบระบบชั่วคราว
 * ------------------------------------------------------------------
 * ใช้หาสาเหตุว่าทำไมรูปหลังแก้ไขไม่ขึ้น
 * เปิดได้เฉพาะตอนล็อกอินเป็น admin เท่านั้น
 *
 * ★ ใช้เสร็จแล้วให้ลบไฟล์นี้ออกจากโฮสต์ ★
 */

require __DIR__ . '/config/db.php';

require_role('admin');

header('Content-Type: text/html; charset=utf-8');

$pdo = db();

function hasCol(PDO $pdo, string $table, string $col): bool
{
    $st = $pdo->prepare(
        "SELECT COUNT(*) FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?"
    );
    $st->execute([$table, $col]);
    return (int) $st->fetchColumn() > 0;
}

$colKind   = hasCol($pdo, 'report_attachments', 'kind');
$colPlace  = hasCol($pdo, 'reports', 'location_name');
$colResNote = hasCol($pdo, 'reports', 'resolve_note');

$kinds = [];
if ($colKind) {
    $kinds = $pdo->query("SELECT kind, COUNT(*) n FROM report_attachments GROUP BY kind")
                 ->fetchAll(PDO::FETCH_KEY_PAIR);
}
$totalPhotos = (int) $pdo->query("SELECT COUNT(*) FROM report_attachments")->fetchColumn();

$recent = $pdo->query(
    "SELECT r.report_code, r.status, r.resolved_at,
            SUM(CASE WHEN a.kind = 'after'  THEN 1 ELSE 0 END) AS n_after,
            SUM(CASE WHEN a.kind = 'before' THEN 1 ELSE 0 END) AS n_before
       FROM reports r
       LEFT JOIN report_attachments a ON a.report_id = r.report_id
      WHERE r.status = 'done'
   GROUP BY r.report_id
   ORDER BY r.resolved_at DESC
      LIMIT 10"
)->fetchAll();

$uploadDir = realpath(__DIR__ . '/../uploads');
$writable  = $uploadDir && is_writable($uploadDir);

$ok = fn(bool $v) => $v ? '<b style="color:#1E7A3C">ผ่าน</b>' : '<b style="color:#C0281F">ไม่ผ่าน</b>';

?>
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ตรวจสอบระบบ RedZone</title>
<style>
body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.8;color:#241B1A}
h1{font-size:20px}
h2{font-size:15px;margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:6px}
table{border-collapse:collapse;width:100%;font-size:14px;margin-top:8px}
th,td{border:1px solid #ddd;padding:7px 10px;text-align:left}
th{background:#f4f4f4}
code{background:#eee;padding:2px 5px;border-radius:3px;font-size:13px}
.warn{background:#fff3cd;border-left:4px solid #e0a800;padding:12px 16px;margin-top:26px;font-size:14px}
.fix{background:#e7f1fb;border-left:4px solid #1E5A96;padding:12px 16px;margin-top:16px;font-size:14px}
</style>
</head>
<body>

<h1>ตรวจสอบระบบ RedZone</h1>

<h2>1. โครงสร้างฐานข้อมูล</h2>
<table>
<tr><th>สิ่งที่ตรวจ</th><th>ผล</th><th>ถ้าไม่ผ่านต้องทำอะไร</th></tr>
<tr><td><code>report_attachments.kind</code></td><td><?= $ok($colKind) ?></td><td>รัน <code>migrate-resolve.sql</code></td></tr>
<tr><td><code>reports.resolve_note</code></td><td><?= $ok($colResNote) ?></td><td>รัน <code>migrate-resolve.sql</code></td></tr>
<tr><td><code>reports.location_name</code></td><td><?= $ok($colPlace) ?></td><td>รัน <code>migrate-place.sql</code></td></tr>
<tr><td>โฟลเดอร์ <code>uploads/</code> เขียนได้</td><td><?= $ok($writable) ?></td><td>ตั้ง permission เป็น 755</td></tr>
</table>

<h2>2. รูปในระบบ</h2>
<p>รูปทั้งหมด <b><?= $totalPhotos ?></b> รูป</p>
<?php if ($colKind): ?>
<table>
<tr><th>ชนิด</th><th>จำนวน</th><th>หมายถึง</th></tr>
<tr><td><code>before</code></td><td><?= (int) ($kinds['before'] ?? 0) ?></td><td>รูปจากผู้แจ้ง</td></tr>
<tr><td><code>after</code></td><td><?= (int) ($kinds['after'] ?? 0) ?></td><td>รูปหลังแก้ไข (ที่ผู้ดูแลแนบ)</td></tr>
</table>
<?php if ((int) ($kinds['after'] ?? 0) === 0 && $totalPhotos > 0): ?>
<div class="warn">
  <b>เจอปัญหาแล้ว</b> — ไม่มีรูปไหนถูกบันทึกเป็นชนิด <code>after</code> เลย
  แปลว่ารูปที่ผู้ดูแลแนบตอนปิดเรื่อง ถูกเก็บเป็น "รูปจากผู้แจ้ง" แทน
  <br>สาเหตุคือไฟล์ <code>api/upload.php</code> บนโฮสต์ยังเป็นเวอร์ชันเก่า ที่ยังไม่รู้จักชนิดรูป
  <br><b>วิธีแก้:</b> อัปไฟล์ <code>4-api/upload.php</code> ขึ้นทับ แล้วลองปิดเรื่องใหม่อีกครั้ง
</div>
<?php endif; ?>
<?php endif; ?>

<h2>3. เรื่องที่ปิดไปแล้ว 10 รายการล่าสุด</h2>
<table>
<tr><th>เลขรายงาน</th><th>ปิดเมื่อ</th><th>รูปผู้แจ้ง</th><th>รูปหลังแก้</th></tr>
<?php foreach ($recent as $r): ?>
<tr>
  <td><code><?= htmlspecialchars($r['report_code']) ?></code></td>
  <td><?= htmlspecialchars((string) $r['resolved_at']) ?></td>
  <td><?= (int) $r['n_before'] ?></td>
  <td><?= (int) $r['n_after'] ?></td>
</tr>
<?php endforeach; ?>
<?php if (!$recent): ?>
<tr><td colspan="4">ยังไม่มีเรื่องที่ปิดแล้ว</td></tr>
<?php endif; ?>
</table>

<div class="fix">
  <b>อ่านผลยังไง</b><br>
  • ข้อ 1 ไม่ผ่านข้อไหน → รันไฟล์ SQL ตามที่บอกในช่องขวา<br>
  • ข้อ 2 <code>after</code> เป็น 0 ทั้งที่แนบรูปไปแล้ว → <code>api/upload.php</code> บนโฮสต์เป็นตัวเก่า<br>
  • ข้อ 3 มีเลข "รูปหลังแก้" มากกว่า 0 แต่หน้าเว็บไม่ขึ้นรูป → <code>api/bootstrap.php</code> บนโฮสต์เป็นตัวเก่า
</div>

<div class="warn">
  ★ ตรวจเสร็จแล้ว <b>ลบไฟล์ <code>api/diag.php</code> ออกจากโฮสต์</b> ★
</div>

</body>
</html>
