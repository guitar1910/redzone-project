# RedZone — เอกสารโครงสร้างระบบ (สำหรับรายงาน System Analysis)

เอกสารนี้อธิบายว่าโค้ดในโปรเจกต์แมปกับงานวิเคราะห์ระบบส่วนไหน
เอาไปวางในบท "การออกแบบระบบ (System Design)" ได้

---

## 1. สถาปัตยกรรมระบบ

ระบบใช้สถาปัตยกรรมแบบ 3 ชั้น (Three-tier Architecture)

```
┌──────────────────────────────────────────────────┐
│  Presentation Layer  (ส่วนติดต่อผู้ใช้)              │
│  index.html + assets/css/* + assets/js/*         │
│  หน้าที่ : แสดงผล รับข้อมูลจากผู้ใช้ ตรวจเบื้องต้น        │
└───────────────────────┬──────────────────────────┘
                        │  เรียกผ่าน RZ.api.xxx() เท่านั้น
┌───────────────────────▼──────────────────────────┐
│  Application Layer  (ตรรกะทางธุรกิจ)                │
│  api/*.php                                       │
│  หน้าที่ : ตรวจสอบข้อมูล ตรวจสิทธิ์ ออกเลขรายงาน        │
│           บันทึกประวัติสถานะ สร้างการแจ้งเตือน          │
└───────────────────────┬──────────────────────────┘
                        │  PDO + Prepared Statement
┌───────────────────────▼──────────────────────────┐
│  Data Layer  (ฐานข้อมูล)                           │
│  MySQL — database/schema.sql                     │
└──────────────────────────────────────────────────┘
```

**ขอบเขตของระบบ (System Scope)** — รับแจ้งเหตุในรัศมี **10 กิโลเมตร** รอบ มจพ.
ครอบคลุมทั้งพื้นที่ในรั้วมหาวิทยาลัยและพื้นที่รอบนอกที่นักศึกษาใช้เดินทางประจำ
กำหนดค่าไว้ที่ `RZ.SCOPE` ใน `assets/js/config.js` และบังคับใช้ 2 จุด:
วาดวงขอบเขตบนแผนที่พร้อมล็อกไม่ให้เลื่อนออกนอกเขต และตรวจพิกัดตอนผู้ใช้ปักหมุด
(ระบบจริงควรตรวจซ้ำที่ฝั่ง PHP ด้วย ห้ามเชื่อค่าที่ส่งมาจากหน้าเว็บ)

**เทคโนโลยีที่ใช้** — ฝั่งหน้าเว็บเป็น HTML/CSS/JavaScript ล้วน (ไม่มี framework ไม่มี build)
แผนที่ใช้ไลบรารี Leaflet กับแผ่นแผนที่จาก OpenStreetMap ทั้งคู่เป็นโอเพนซอร์สและใช้ฟรี
ไม่ต้องมี API key จึงไม่มีค่าใช้จ่ายและไม่มีข้อผูกมัดกับผู้ให้บริการรายใด

**ทำไมต้องมีชั้น `api.js` คั่น**
หน้าเว็บไม่รู้ว่าข้อมูลมาจากไหน จะเป็นไฟล์ตัวอย่างหรือฐานข้อมูลก็ได้
เวลาเปลี่ยนแหล่งข้อมูลจึงกระทบไฟล์เดียว = ระบบมี **low coupling**

---

## 2. Use Case กับหน้าจอและตารางฐานข้อมูล

อ้างตาม use case diagram ของกลุ่ม (actor: User, new user, admin, System)

| Use case | Actor | หน้าจอ / ส่วนในต้นแบบ | ไฟล์ JS | ไฟล์ API | ตารางฐานข้อมูล |
|---|---|---|---|---|---|
| log in | User, admin | หน้าเข้าสู่ระบบ (ชื่อผู้ใช้ + รหัสผ่าน) | `auth.js` | `api/auth.php` | `users` |
| Register | new user | แผ่น "สมัครสมาชิก" ในหน้าเข้าสู่ระบบ | `auth.js` | `api/register.php` | `users`, `user_settings` |
| view map | User | แผนที่ Leaflet + หมุด + วงพื้นที่เสี่ยง + รายการ + การ์ดรายละเอียด | `map.js`, `incidents.js` | `api/incidents.php` | `reports`, `locations`, `zones`, `categories` |
| report case | User | ฟอร์มแจ้งเหตุ → หน้าส่งสำเร็จ | `form.js` | `api/reports.php` (POST) | `reports`, `report_attachments`, `report_status_logs` |
| report approved | admin | ยังไม่ทำ (เห็นผลเป็นสถานะในหน้ารายงานของฉัน) | — | ต้องเพิ่ม `api/admin_review.php` | `reports.status`, `report_status_logs` |
| report reject | admin | ยังไม่ทำ | — | ต้องเพิ่ม | `reports.status`, `report_status_logs` |
| comment | User | ส่วนความคิดเห็นในการ์ดรายละเอียด | `incidents.js` | `api/comments.php` (POST) | `comments` |
| delete comment | User (ของตัวเอง), admin (ทุกอัน) | ปุ่ม "ลบ" บนความคิดเห็นของตัวเอง | `incidents.js` | `api/comments.php?action=delete` | `comments.is_hidden` |
| delete report | admin | ยังไม่ทำ | — | ต้องเพิ่ม | `reports` |
| ban user | admin | ยังไม่ทำ | — | ต้องเพิ่ม | `users.is_active` |

**ความสัมพันธ์ `<<extend>>` ใน diagram**

`report case` ถูก extend ด้วย `report approved` และ `report reject`
แปลว่าทั้งสองอย่างเป็น **ทางแยกที่เกิดขึ้นทีหลัง** ไม่ใช่ขั้นตอนบังคับของการแจ้งเหตุ
ในฐานข้อมูลจึงสะท้อนเป็นการเปลี่ยนค่า `reports.status` แล้วบันทึกแถวใหม่ใน
`report_status_logs` ไม่ใช่การสร้างรายงานใหม่

**ส่วนที่ต้นแบบมี แต่ยังไม่มีใน use case diagram**

ต้องเลือกอย่างใดอย่างหนึ่ง — เพิ่มใน diagram หรือตัดออกจากต้นแบบ
ให้เอกสารกับโค้ดตรงกัน (อาจารย์มักถามจุดนี้)

| ส่วนในต้นแบบ | ถ้าจะเพิ่มใน diagram ควรตั้งชื่อว่า | Actor |
|---|---|---|
| หน้ารายงานของฉัน + แถบติดตามสถานะ | track report status | User |
| หน้าการแจ้งเตือน | receive notification | User, System |
| ปุ่ม "ฉันพบเหตุนี้ด้วย" | confirm case | User |
| หน้าโปรไฟล์และการตั้งค่า | manage profile | User |
| ช่องค้นหา + ชิปกรองระดับความเสี่ยง | (รวมอยู่ใน view map ได้) | User |

---

## 3. รายการเอนทิตีในฐานข้อมูล

| ตาราง | เก็บอะไร | ความสัมพันธ์ |
|---|---|---|
| `users` | ผู้ใช้ทุก role | 1:1 `user_settings`, 1:M `reports` |
| `user_settings` | การตั้งค่าส่วนตัว | 1:1 `users` |
| `categories` | ประเภทเหตุการณ์ | 1:M `reports` |
| `locations` | สถานที่ในมหาวิทยาลัย | 1:M `reports` |
| `zones` | พื้นที่เสี่ยง (จุดศูนย์กลาง + รัศมีเป็นเมตร) | 1:M `reports` |
| `locations` | สถานที่ทั้งในและนอกรั้ว ในรัศมี 10 กม. | 1:M `reports` |
| `reports` | รายงานเหตุการณ์ (ตารางหลัก) | M:1 กับ 4 ตารางข้างบน |
| `report_attachments` | รูปภาพแนบ | M:1 `reports` |
| `report_status_logs` | ประวัติเปลี่ยนสถานะ | M:1 `reports` |
| `report_confirmations` | การกดยืนยัน (M:N ระหว่าง user กับ report) | composite PK |
| `comments` | ความคิดเห็นใต้รายงาน | M:1 `reports`, M:1 `users` |
| `notifications` | การแจ้งเตือน | M:1 `users` |

**จุดที่ควรอธิบายในรายงาน**

1. `reports.user_id` เป็น NULL ได้ เพราะรองรับการแจ้งแบบไม่เปิดเผยชื่อ
   (ธุรกิจต้องการ: นักศึกษาอาจไม่กล้าแจ้งเรื่องการคุกคามด้วยชื่อจริง)
2. `report_confirmations` เป็นตารางกลางของความสัมพันธ์แบบ M:N
   ใช้ composite primary key `(report_id, user_id)` เพื่อบังคับว่า 1 คนกดยืนยันได้ครั้งเดียว
3. `reports.confirm_count` เป็นข้อมูลซ้ำซ้อน (denormalized) โดยเจตนา
   เพื่อไม่ต้อง `COUNT(*)` ทุกครั้งที่วาดแผนที่ — แลกความเร็วกับความซ้ำซ้อน
4. `report_status_logs` แยกออกจาก `reports` เพื่อเก็บประวัติได้หลายรอบ
   ถ้าเก็บสถานะไว้ในตาราง `reports` อย่างเดียวจะตรวจย้อนหลังไม่ได้
5. `comments` ใช้ `is_hidden` แทนการลบแถวจริง (soft delete)
   เพราะ use case `delete comment` เป็นสิทธิ์ของ admin — ต้องตรวจย้อนหลังได้ว่า
   ใครลบอะไรไป ถ้าลบแถวจริงจะไม่มีหลักฐานเหลือ

---

## 4. Data Flow ของ use case `report case` (แจ้งเหตุการณ์ใหม่)

```
User (นักศึกษา)
   │  1. กรอกฟอร์ม (ประเภท, ระดับเสี่ยง, ตำแหน่ง, เวลา, รายละเอียด, รูป)
   ▼
form.js ─ รวมค่าเป็น payload
   │  2. RZ.api.createReport(payload)
   ▼
api.js ─ fetch POST
   │  3. JSON
   ▼
api/reports.php
   │  4. ตรวจข้อมูล → ออกเลขรายงาน RZ-2569-nnnn
   │  5. INSERT reports
   │  6. INSERT report_status_logs (สถานะ 'sent')
   │  7. INSERT notifications ให้เจ้าหน้าที่
   ▼
MySQL
   │  8. คืนเลขรายงาน
   ▼
หน้าสำเร็จ (แสดงเลขรายงาน) → หน้ารายงานของฉัน
```

---

## 5. ระดับความเสี่ยงและสถานะ (ต้องตรงกัน 3 ที่)

ค่าเหล่านี้ถูกใช้ทั้งใน JavaScript, CSS และ ENUM ของฐานข้อมูล
**ถ้าแก้ที่หนึ่ง ต้องแก้ให้ครบทั้งสามที่**

| ความหมาย | ค่าในระบบ | ที่ต้องแก้ |
|---|---|---|
| ระดับความเสี่ยง | `high` / `mid` / `low` | `config.js` (RZ.SEVT), `tokens.css` (`--high` ฯลฯ), `schema.sql` (ENUM severity) |
| สถานะรายงาน | `sent` / `ack` / `prog` / `done` | `config.js` (RZ.STAGES), `schema.sql` (ENUM status) |
| ประเภทเหตุการณ์ | `light`, `walk`, `harass`, ... | `config.js` (RZ.CATS), `seed.sql` (categories.code) |
