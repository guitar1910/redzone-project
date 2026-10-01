-- ============================================================
--  RedZone · fix-copy.sql
--  แก้ข้อความที่ถูกบันทึกลงฐานข้อมูลไปแล้ว ให้ตรงกับข้อความชุดใหม่
--  รันครั้งเดียวใน phpMyAdmin (รันซ้ำได้ ไม่พัง)
-- ============================================================
--
--  ทำไมต้องมีไฟล์นี้
--    ข้อความในตาราง notifications ถูกเขียนลงฐานข้อมูลตั้งแต่ตอน seed
--    การแก้ไฟล์ .sql อย่างเดียวไม่ทำให้ข้อมูลเก่าบนโฮสต์เปลี่ยน
--    ต้อง UPDATE ทับของเดิม
-- ============================================================

SET NAMES utf8mb4;

-- 1) หัวข้อแจ้งเตือน
UPDATE notifications SET title = REPLACE(title, ' เสร็จสมบูรณ์', ' ได้รับการแก้ไขแล้ว')
 WHERE title LIKE '% เสร็จสมบูรณ์';

UPDATE notifications SET title = REPLACE(title, ' ถูกรับเรื่องแล้ว', ' รับเรื่องแล้ว')
 WHERE title LIKE '% ถูกรับเรื่องแล้ว';

UPDATE notifications SET title = REPLACE(title, ' อยู่ระหว่างประสานงาน', ' กำลังดำเนินการ')
 WHERE title LIKE '% อยู่ระหว่างประสานงาน';

UPDATE notifications SET title = 'เรื่องที่คุณแจ้งได้รับการแก้ไขแล้ว'
 WHERE title = 'รายงานของคุณเสร็จสมบูรณ์';

-- 2) เนื้อความแจ้งเตือน: เปลี่ยน — เป็น · และตัดคำฟุ่มเฟือย
UPDATE notifications SET message = REPLACE(message, ' — ', ' · ')
 WHERE message LIKE '% — %';

UPDATE notifications SET message = REPLACE(message, ' ขอบคุณที่แจ้ง', '')
 WHERE message LIKE '% ขอบคุณที่แจ้ง%';

-- 3) ตรวจผล: ต้องได้ 0 ทุกแถว
SELECT 'notifications ที่ยังมีคำเก่า' AS รายการ,
       COUNT(*) AS ต้องเป็น0
  FROM notifications
 WHERE title LIKE '%เสร็จสมบูรณ์%'
    OR title LIKE '%ถูกรับเรื่องแล้ว%'
    OR title LIKE '%อยู่ระหว่างประสานงาน%'
    OR message LIKE '% — %';
