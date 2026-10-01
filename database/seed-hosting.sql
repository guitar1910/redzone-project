SET NAMES utf8mb4;

INSERT INTO categories (code, name_th, name_en) VALUES
  ('light',   'ไฟส่องสว่างชำรุด',          'Broken lighting'),
  ('walk',    'ทางเดิน/พื้นชำรุด',          'Damaged walkway'),
  ('harass',  'การคุกคาม/ตามรบกวน',        'Harassment'),
  ('theft',   'ลักทรัพย์/ทรัพย์สินเสียหาย',   'Theft or damage'),
  ('traffic', 'อุบัติเหตุจราจร',             'Traffic incident'),
  ('flood',   'น้ำท่วมขัง/สิ่งกีดขวาง',       'Flooding or obstruction'),
  ('other',   'อื่น ๆ (ระบุเอง)',            'Other (specify)');

INSERT INTO locations (name_th, name_en, latitude, longitude) VALUES

  ('ทางเดินริมคลองบางซื่อ',  'Bang Sue canal walkway',    13.8183, 100.5148),
  ('หน้าหอสมุดกลาง',         'Central Library entrance',  13.8199, 100.5133),
  ('ลานจอดรถอาคาร 62',       'Building 62 car park',      13.8191, 100.5157),
  ('โรงอาหารกลาง',           'Main canteen',              13.8194, 100.5128),
  ('อาคารนวมินทรราชินี',      'Nawaminrachini Building',   13.8203, 100.5142),
  ('หอพักนักศึกษา',           'Student dormitory',         13.8189, 100.5139),
  ('ประตูวงศ์สว่าง',          'Wongsawang gate',           13.8211, 100.5127),
  ('ประตูพิบูลสงคราม',        'Phibun Songkhram gate',     13.8210, 100.5165),
  ('สนามกีฬา',               'Sports field',              13.8186, 100.5163),

  ('สถานี MRT บางซ่อน',       'MRT Bang Son',              13.8226, 100.5279),
  ('ตลาดบางซ่อน',            'Bang Son market',           13.8248, 100.5252),
  ('ใต้สะพานพระราม 7',        'Under Rama VII bridge',     13.8118, 100.5060),
  ('สถานี MRT เตาปูน',        'MRT Tao Poon',              13.8073, 100.5297),
  ('สถานีกลางกรุงเทพอภิวัฒน์', 'Krung Thep Aphiwat station',13.8020, 100.5390),
  ('สวนวชิรเบญจทัศ (สวนรถไฟ)','Wachirabenchathat Park',    13.8130, 100.5510),
  ('ย่านหอพักซอยวงศ์สว่าง 11', 'Wongsawang 11 dorm area',   13.8235, 100.5175),
  ('ท่าน้ำนนทบุรี',            'Nonthaburi pier',           13.8570, 100.4900),
  ('อนุสาวรีย์ชัยสมรภูมิ',      'Victory Monument',          13.7650, 100.5380);

INSERT INTO zones (name_th, name_en, risk_level, center_lat, center_lng, radius_m, report_count) VALUES
  ('ทางเดินริมคลองบางซื่อ',  'Bang Sue canal walkway', 'high', 13.8183, 100.5148,  95, 18),
  ('ลานจอดรถอาคาร 62',       'Building 62 car park',   'mid',  13.8191, 100.5157,  70,  9),
  ('ประตูวงศ์สว่าง',          'Wongsawang gate',        'mid',  13.8211, 100.5127,  60,  6),
  ('ทางเท้าใต้สะพานพระราม 7', 'Rama VII bridge path',   'high', 13.8118, 100.5060, 180, 14),
  ('รอบสถานี MRT บางซ่อน',    'Around MRT Bang Son',    'mid',  13.8226, 100.5279, 150,  8);

INSERT INTO users (user_id, username, student_code, email, password_hash, full_name, faculty, role, is_active, ban_reason) VALUES
  (2,  'admin',    'admin001',     'admin@email.kmutnb.ac.th',
   '$2y$12$B4uiLXB6d0PE469HUvV1GeUBUagp8MT9izWBMZclc6c9qu6uNisca',
   'admin', 'หน่วยงานผู้ดูแลระบบ', 'admin', 1, NULL),

  (15, 'user123','1000000123', 's1000000123@email.kmutnb.ac.th',
   '$2y$12$mwyhR9gaUhRf5C.g8SS41uWXzqp5bOi84KbjYB2nl71601wJz5Zw.',
   'user123', 'คณะตัวอย่าง A', 'user', 1, NULL),

  (21, 'user456', '1000000456', 's1000000456@email.kmutnb.ac.th',
   '$2y$12$mwyhR9gaUhRf5C.g8SS41uWXzqp5bOi84KbjYB2nl71601wJz5Zw.',
   'user456', 'คณะตัวอย่าง A', 'user', 1, NULL),

  (33, 'user789','1000000789', 's1000000789@email.kmutnb.ac.th',
   '$2y$12$mwyhR9gaUhRf5C.g8SS41uWXzqp5bOi84KbjYB2nl71601wJz5Zw.',
   'user789', 'คณะตัวอย่าง B', 'user', 1, NULL),

  (41, 'user321',   '1000000321', 's1000000321@email.kmutnb.ac.th',
   '$2y$12$mwyhR9gaUhRf5C.g8SS41uWXzqp5bOi84KbjYB2nl71601wJz5Zw.',
   'user321', 'คณะตัวอย่าง C', 'user', 1, NULL),

  (47, 'user999',  '1000000999', 's1000000999@email.kmutnb.ac.th',
   '$2y$12$mwyhR9gaUhRf5C.g8SS41uWXzqp5bOi84KbjYB2nl71601wJz5Zw.',
   'user999', 'คณะตัวอย่าง A', 'user', 0,
   'ส่งรายงานทดสอบที่ไม่มีเนื้อหาจริงซ้ำ 9 ครั้ง'),

  (52, 'user654', '1000000654', 's1000000654@email.kmutnb.ac.th',
   '$2y$12$mwyhR9gaUhRf5C.g8SS41uWXzqp5bOi84KbjYB2nl71601wJz5Zw.',
   'user654', 'คณะตัวอย่าง B', 'user', 1, NULL),

  (58, 'user987','1000000987', 's1000000987@email.kmutnb.ac.th',
   '$2y$12$mwyhR9gaUhRf5C.g8SS41uWXzqp5bOi84KbjYB2nl71601wJz5Zw.',
   'user987', 'คณะตัวอย่าง A', 'user', 1, NULL);

INSERT INTO user_settings (user_id) VALUES (2), (15), (21), (33), (41), (47), (52), (58);

INSERT INTO reports
  (report_code, user_id, category_id, category_other, location_id, severity,
   status, is_approved, title, description, occurred_at, latitude, longitude,
   is_anonymous, reject_reason, confirm_count) VALUES
  ('RZ-2569-0119', 21, 1, NULL, NULL, 'high', 'prog', 1, 'สายไฟห้อยต่ำเหนือทางเดิน', 'สายห้อยลงมาสูงจากพื้นประมาณ 1.9 เมตร เสี่ยงต่อผู้ใช้ทางเดิน', '2026-08-31 09:15:00', 13.8186, 100.5163, 0, NULL, 4),
  ('RZ-2569-0124', 33, 7, 'กล้อง CCTV ขัดข้อง', 5, 'low', 'done', 1, 'กล้อง CCTV ทางเดินชั้น 1 ไม่ทำงาน', 'ไฟสถานะที่ตัวกล้องดับ แจ้งไว้เพื่อให้ตรวจสอบระบบบันทึกภาพ', '2026-09-01 15:40:00', 13.8203, 100.5142, 0, NULL, 2),
  ('RZ-2569-0128', 15, 7, 'สัตว์จรจัด', NULL, 'mid', 'ack', 1, 'สุนัขจรจัดรวมกลุ่ม 4 ตัว มีพฤติกรรมไล่คน', 'อยู่ประจำช่วง 11:00–13:00 ที่มีเศษอาหาร ไล่จักรยานและมอเตอร์ไซค์', '2026-09-02 18:05:00', 13.8194, 100.5128, 0, NULL, 9),
  ('RZ-2569-0131', 52, 6, NULL, NULL, 'mid', 'done', 1, 'น้ำท่วมขังลึกประมาณ 15 ซม.', 'ท่วมทุกครั้งที่ฝนตกหนักเกิน 30 นาที ท่อระบายอุดตัน', '2026-09-03 08:20:00', 13.8211, 100.5127, 0, NULL, 8),
  ('RZ-2569-0136', NULL, 3, NULL, 3, 'high', 'prog', 1, 'ถูกบุคคลภายนอกเดินตามในลานจอดรถ', 'เกิดช่วงกลางคืน ไฟในลานติดไม่ครบ และไม่มีเจ้าหน้าที่ประจำจุด', '2026-09-05 21:30:00', 13.8191, 100.5157, 1, NULL, 3),
  ('RZ-2569-0139', 15, 2, NULL, 2, 'mid', 'ack', 1, 'พื้นทางเดินแตกร้าว ต่างระดับ 4 ซม.', 'มีคนสะดุดล้มแล้ว 2 ราย ช่วงเปลี่ยนคาบเรียนคนเดินหนาแน่น', '2026-09-07 12:10:00', 13.8199, 100.5133, 0, NULL, 5),
  ('RZ-2569-0142', 41, 1, NULL, 1, 'high', 'prog', 1, 'ไฟส่องสว่างดับ 3 เสาติดกัน', 'ทางเดินมืดสนิทหลัง 19:00 นักศึกษาใช้เส้นทางนี้กลับหอพักจำนวนมาก', '2026-09-06 20:45:00', 13.8183, 100.5148, 0, NULL, 12),
  ('RZ-2569-0143', 15, 1, NULL, 16, 'mid', 'sent', 0, 'ไฟทางในซอยหอพักดับตลอดแนว', 'ซอยแคบและไม่มีไฟเลยตั้งแต่ปากซอยถึงกลางซอย มีนักศึกษาเช่าหอในซอยนี้หลายสิบคน', '2026-09-05 19:50:00', 13.8235, 100.5175, 0, NULL, 3),
  ('RZ-2569-0144', 21, 5, NULL, 10, 'high', 'ack', 1, 'จุดข้ามถนนหน้าสถานี MRT บางซ่อน ไม่มีทางม้าลาย', 'นักศึกษาข้ามถนนตรงจุดนี้ทุกวันเพื่อต่อรถเข้ามหาวิทยาลัย รถวิ่งเร็วและไม่มีสัญญาณคนข้าม', '2026-09-06 07:45:00', 13.8226, 100.5279, 0, NULL, 11),
  ('RZ-2569-0145', NULL, 2, NULL, 12, 'high', 'sent', 0, 'ทางเท้าใต้สะพานพระราม 7 มืดและมีคนนอนอยู่ประจำ', 'เป็นเส้นทางเดินไปขึ้นรถประจำทาง ไฟใต้สะพานดับหลายจุด นักศึกษาหญิงไม่กล้าเดินคนเดียวหลัง 20:00', '2026-09-07 20:10:00', 13.8118, 100.506, 1, NULL, 14),
  ('RZ-2569-0146', 47, 4, NULL, 8, 'high', 'reject', 0, 'ทดสอบระบบ ทดสอบ ทดสอบ', 'asdfasdf ทดสอบ', '2026-09-06 02:14:00', 13.821, 100.5165, 0, 'ข้อความไม่มีเนื้อหาเหตุการณ์จริง เป็นการทดสอบระบบ', 0),
  ('RZ-2569-0147', 33, 7, 'ขยะล้นถัง', 4, 'low', 'sent', 0, 'ถังขยะข้างโรงอาหารล้น มีแมลงเยอะ', 'ล้นมา 2 วันแล้ว ยังไม่มีใครมาเก็บ', '2026-09-07 12:30:00', 13.8194, 100.5128, 0, NULL, 1),
  ('RZ-2569-0148', NULL, 3, NULL, 2, 'high', 'sent', 0, 'มีคนแปลกหน้าเดินวนถ่ายรูปนักศึกษาหน้าหอสมุด', 'ประมาณ 16:30 ใส่เสื้อสีเข้ม ถือกล้อง เดินวนอยู่ราว 20 นาที ไม่ได้ติดบัตรเข้ามหาวิทยาลัย', '2026-09-07 16:52:00', 13.8199, 100.5133, 1, NULL, 1);

INSERT INTO report_status_logs (report_id, from_status, to_status, note)
SELECT report_id, NULL, 'sent', 'ผู้ใช้ส่งรายงานเข้าระบบ' FROM reports;

INSERT INTO comments (report_id, user_id, content, created_at) VALUES
  ((SELECT report_id FROM reports WHERE report_code='RZ-2569-0131'), 52, 'ลอกท่อแล้วเมื่อวาน น้ำลดเร็วขึ้นจริง', '2026-09-04 16:05:00'),
  ((SELECT report_id FROM reports WHERE report_code='RZ-2569-0139'), 41, 'จุดเดียวกับที่เพื่อนหกล้มเมื่อเทอมที่แล้วเลย', '2026-09-07 13:25:00'),
  ((SELECT report_id FROM reports WHERE report_code='RZ-2569-0142'), 21, 'เมื่อคืนเดินผ่านมืดจริง มองไม่เห็นพื้นเลย ต้องเปิดไฟมือถือ', '2026-09-07 07:12:00'),
  ((SELECT report_id FROM reports WHERE report_code='RZ-2569-0142'), 33, 'ช่วงนี้มีมอเตอร์ไซค์วิ่งสวนทางด้วย เสี่ยงชนกันมาก', '2026-09-07 09:40:00'),
  ((SELECT report_id FROM reports WHERE report_code='RZ-2569-0145'), 58, 'ผมเลี่ยงไปใช้ทางข้ามฝั่งตรงข้ามแทน อ้อมขึ้นแต่สว่างกว่า', '2026-09-07 21:02:00');

INSERT INTO notifications (user_id, type, title, message, is_read, created_at) VALUES
  (15, 'status', 'RZ-2569-0139 รับเรื่องแล้ว', 'งานอาคารสถานที่นัดเข้าตรวจพื้นทางเดินหน้าหอสมุดกลาง 8 ก.ย. เวลา 09:00', 0, '2026-09-07 13:02:00'),
  (15, 'zone', 'คุณกำลังเข้าใกล้จุดเสี่ยงสูง', 'ทางเดินริมคลองบางซื่อ · ไฟดับ 3 จุด แนะนำใช้ทางเดินหน้าอาคาร 62 หลัง 19:00', 0, '2026-09-07 19:00:00'),
  (15, 'new', 'มีเหตุใหม่ใกล้เส้นทางของคุณ', 'ถูกบุคคลภายนอกเดินตามในลานจอดรถอาคาร 62 · ระดับเสี่ยงสูง', 0, '2026-09-05 21:35:00'),
  (15, 'status', 'RZ-2569-0128 กำลังดำเนินการ', 'ส่งเรื่องต่อให้หน่วยควบคุมสัตว์จรจัดของเขตบางซื่อแล้ว', 1, '2026-09-04 10:12:00'),
  (15, 'done', 'RZ-2569-0124 ได้รับการแก้ไขแล้ว', 'เปลี่ยนกล้องตัวใหม่และทดสอบระบบบันทึกภาพเรียบร้อย', 1, '2026-09-02 16:40:00');

INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, reason, created_at) VALUES
  (2, 'reject_report',  'report', 'RZ-2569-0146', 'ข้อความไม่มีเนื้อหาเหตุการณ์จริง เป็นการทดสอบระบบ', '2026-09-06 09:15:00'),
  (2, 'ban_user',       'user',   '47',           'ส่งรายงานทดสอบที่ไม่มีเนื้อหาจริงซ้ำ 9 ครั้ง',        '2026-09-06 09:18:00'),
  (2, 'approve_report', 'report', 'RZ-2569-0144', 'ตรวจสอบกับภาพถ่ายแล้ว จุดข้ามถนนไม่มีทางม้าลายจริง',  '2026-09-06 08:12:00');

-- ผลการแก้ไขสำหรับรายงานที่ปิดเรื่องแล้ว (ใช้สาธิตระบบ "แก้ไขแล้ว")
UPDATE reports SET
  resolved_at  = DATE_ADD(occurred_at, INTERVAL 5 DAY),
  resolve_note = 'เปลี่ยนอุปกรณ์ที่ชำรุดและตรวจสอบการใช้งานแล้ว พบว่าใช้งานได้ตามปกติ',
  resolve_unit = 'งานอาคารสถานที่',
  resolved_by  = 2
WHERE status = 'done';

-- เติมชื่อจุดให้รายงานตัวอย่าง (ต้องมาหลัง INSERT reports)
UPDATE reports r
  LEFT JOIN locations l ON l.location_id = r.location_id
   SET r.location_name = l.name_th
 WHERE r.location_name IS NULL;
