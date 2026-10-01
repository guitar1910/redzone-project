<?php

$hash = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['pw'])) {
    $pw = (string) $_POST['pw'];
    if ($pw !== '') {
        $hash = password_hash($pw, PASSWORD_BCRYPT, ['cost' => 12]);
    }
}

?>
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>สร้าง hash รหัสผ่าน</title>
<style>
body{font-family:system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 20px;line-height:1.7}
h1{font-size:20px}
input[type=password]{width:100%;padding:10px;font-size:15px;box-sizing:border-box}
button{margin-top:12px;padding:10px 20px;font-size:15px;cursor:pointer}
textarea{width:100%;height:80px;margin-top:16px;font-family:ui-monospace,monospace;font-size:13px;padding:10px;box-sizing:border-box}
.warn{background:#fff3cd;border-left:4px solid #e0a800;padding:12px 16px;margin-top:24px;font-size:14px}
code{background:#eee;padding:2px 5px;border-radius:3px}
</style>
</head>
<body>

<h1>สร้าง hash รหัสผ่านสำหรับบัญชี admin</h1>

<form method="post">
  <label for="pw">พิมพ์รหัสผ่านใหม่ที่ต้องการ</label>
  <input id="pw" name="pw" type="password" autocomplete="new-password" required>
  <button type="submit">สร้าง hash</button>
</form>

<?php if ($hash !== ''): ?>
<p>คัดลอกข้อความข้างล่างนี้ทั้งหมด</p>
<textarea readonly onclick="this.select()"><?= htmlspecialchars($hash, ENT_QUOTES, 'UTF-8') ?></textarea>

<p>แล้วเอาไปวางแทนที่ <code>วางhashตรงนี้</code> ในคำสั่ง SQL นี้ รันใน phpMyAdmin</p>
<textarea readonly onclick="this.select()">UPDATE users SET password_hash = 'วางhashตรงนี้' WHERE username = 'admin';</textarea>
<?php endif; ?>

<div class="warn">
  ใช้เสร็จแล้ว <b>ลบไฟล์ hash-tool.php ออกจากโฮสต์ทันที</b>
</div>

</body>
</html>
