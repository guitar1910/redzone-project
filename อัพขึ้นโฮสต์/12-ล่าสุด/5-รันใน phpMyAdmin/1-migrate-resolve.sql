-- =====================================================================
--  RedZone — อัปเดตฐานข้อมูลสำหรับระบบ "แก้ไขแล้ว"
--  รันครั้งเดียวใน phpMyAdmin แท็บ SQL  ข้อมูลเดิมไม่หาย
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 1. เพิ่มช่องเก็บผลการแก้ไขในตาราง reports
-- ---------------------------------------------------------------------
ALTER TABLE reports
  ADD COLUMN resolved_at  DATETIME     NULL AFTER is_approved,
  ADD COLUMN resolve_note VARCHAR(500) NULL AFTER resolved_at,
  ADD COLUMN resolve_unit VARCHAR(120) NULL AFTER resolve_note,
  ADD COLUMN resolved_by  INT          NULL AFTER resolve_unit,
  ADD INDEX idx_report_resolved (resolved_at);

ALTER TABLE reports
  ADD CONSTRAINT fk_report_resolver FOREIGN KEY (resolved_by)
    REFERENCES users(user_id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 2. รายงานที่เพิ่งส่งเข้ามาต้องเริ่มที่ "ส่งแล้ว" ไม่ใช่ "กำลังดำเนินการ"
-- ---------------------------------------------------------------------
ALTER TABLE reports
  MODIFY status ENUM('sent','ack','prog','done','reject')
    NOT NULL DEFAULT 'sent';

-- ---------------------------------------------------------------------
-- 3. แยกรูปก่อนแก้ (ผู้แจ้งส่ง) ออกจากรูปหลังแก้ (เจ้าหน้าที่ส่ง)
-- ---------------------------------------------------------------------
ALTER TABLE report_attachments
  ADD COLUMN kind ENUM('before','after') NOT NULL DEFAULT 'before' AFTER report_id;

-- ---------------------------------------------------------------------
-- 4. เพิ่มชนิดการกระทำ "บันทึกผลการแก้ไข" ในประวัติของผู้ดูแล
-- ---------------------------------------------------------------------
ALTER TABLE admin_audit_logs
  MODIFY action ENUM('approve_report','reject_report','delete_report',
                     'set_status','resolve_report',
                     'hide_comment','ban_user','unban_user') NOT NULL;

-- ---------------------------------------------------------------------
-- 5. แก้ข้อมูลเดิมที่บันทึกผิดความหมาย
--    เดิมกดอนุมัติแล้วระบบเขียนว่า "เสร็จสมบูรณ์" ทันที
--    ทั้งที่แปลว่าแค่ตรวจสอบแล้ว ยังไม่ได้ลงไปแก้จริง
--    จึงย้ายรายงานที่อนุมัติแล้วแต่ไม่มีบันทึกผลการแก้ไข
--    กลับไปเป็น "รับเรื่องแล้ว"
-- ---------------------------------------------------------------------
UPDATE reports
   SET status = 'ack'
 WHERE status = 'done'
   AND resolved_at IS NULL;

-- ---------------------------------------------------------------------
-- ตรวจผลหลังรัน
-- ---------------------------------------------------------------------
SELECT status, COUNT(*) AS จำนวน FROM reports GROUP BY status;
