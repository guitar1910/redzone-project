import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { execSync } from 'child_process';

function clearThrottle() {
  try { execSync('mysql -e "USE redzone; DELETE FROM login_attempts;"'); } catch (e) {}
}

const BASE = 'http://127.0.0.1:8100';
const results = [];
let browser, ctx, page;

function rec(o) {
  results.push(o);
  const mark = o.status === 'PASS' ? '  ok  ' : (o.status === 'MANUAL' ? ' man  ' : 'FAIL  ');
  console.log(mark + o.id + '  ' + o.title + (o.status === 'PASS' ? '' : '\n        actual: ' + o.actual));
}

async function tc(id, module, title, pre, steps, data, expected, fn) {
  let actual = '', status = 'FAIL';
  try {
    const r = await fn();
    actual = r.actual;
    status = r.ok === null ? 'MANUAL' : (r.ok ? 'PASS' : 'FAIL');
  } catch (e) {
    actual = 'เกิดข้อผิดพลาดระหว่างทดสอบ: ' + e.message;
  }
  rec({ id, module, title, pre, steps, data, expected, actual, status });
}

// ---------- helpers ----------
const newCtx = async () => {
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  return c;
};

async function uiLogin(p, user, pw) {
  clearThrottle();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  await p.fill('#lg-user', user);
  await p.fill('#lg-pw', pw);
  await p.click('#loginGo');
  await p.waitForTimeout(1600);
}

async function apiLoginRaw(request, user, pw) {
  const r = await request.post(BASE + '/api/auth.php', { data: { username: user, password: pw } });
  const j = await r.json().catch(() => ({}));
  return { status: r.status(), body: j, csrf: j.csrf };
}

async function apiLogin(request, user, pw) {
  clearThrottle();
  const r = await request.post(BASE + '/api/auth.php', { data: { username: user, password: pw } });
  const j = await r.json().catch(() => ({}));
  return { status: r.status(), body: j, csrf: j.csrf };
}

async function attachPhoto(p, n = 1) {
  await p.evaluate(async (count) => {
    const dt = new DataTransfer();
    for (let k = 0; k < count; k++) {
      const c = document.createElement('canvas');
      c.width = 70; c.height = 50;
      const x = c.getContext('2d');
      x.fillStyle = ['#888', '#567', '#a76'][k % 3];
      x.fillRect(0, 0, 70, 50);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .8));
      dt.items.add(new File([blob], 'p' + k + '.jpg', { type: 'image/jpeg' }));
    }
    const i = document.querySelector('#photoInput');
    i.files = dt.files;
    i.dispatchEvent(new Event('change', { bubbles: true }));
  }, n);
  await p.waitForTimeout(500 + n * 250);
}

async function waitForm(p) {
  await p.evaluate(() => RZ.go('form'));
  await p.waitForSelector('#view-form.on', { state: 'attached' });
  await p.waitForFunction(() => {
    const b = document.querySelector('#catGrid .opt');
    return b && b.getBoundingClientRect().width > 0;
  }, null, { timeout: 15000 });
  await p.waitForTimeout(250);
}

async function fillReport(p, { cat = 'light', sev = 'mid', lat = 13.8191, lng = 100.5157, desc = 'ทดสอบระบบ', photos = 1, anon = false } = {}) {
  await waitForm(p);
  if (cat) await p.click(`#catGrid .opt[data-cat="${cat}"]`);
  if (sev) await p.click(`#sevGrid .sevopt[data-v="${sev}"]`);
  await p.evaluate(([a, b]) => RZ.setPin(a, b, false), [lat, lng]);
  if (desc !== null) await p.fill('#desc', desc);
  if (anon) await p.click('#tgAnon');
  if (photos > 0) await attachPhoto(p, photos);
}

// ---------- run ----------
browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

/* ======================= 1. การยืนยันตัวตน ======================= */
{
  const c = await newCtx(); const p = await c.newPage();
  await tc('TC-AU-01', 'การยืนยันตัวตน', 'เข้าสู่ระบบด้วยข้อมูลที่ถูกต้อง',
    'มีบัญชี user123 อยู่ในฐานข้อมูลและสถานะใช้งานได้',
    ['เปิดหน้าเว็บ', 'กรอกชื่อผู้ใช้ user123', 'กรอกรหัสผ่านที่ถูกต้อง', 'กดปุ่มเข้าสู่ระบบ'],
    'user123 / Test1234!',
    'เข้าสู่ระบบสำเร็จ ปิดหน้าล็อกอิน และแสดงชื่อผู้ใช้ที่แถบบน',
    async () => {
      await uiLogin(p, 'user123', 'Test1234!');
      const s = await p.evaluate(() => RZ.session);
      const locked = await p.evaluate(() => document.body.classList.contains('locked'));
      return { ok: !!s && s.username === 'user123' && !locked, actual: s ? `เข้าสู่ระบบเป็น ${s.username} (${s.role}) · หน้าล็อกอิน${locked ? 'ยังค้างอยู่' : 'ถูกปิดแล้ว'}` : 'ไม่ได้ session' };
    });
  await c.close();
}
{
  const c = await newCtx(); const p = await c.newPage();
  await tc('TC-AU-02', 'การยืนยันตัวตน', 'เข้าสู่ระบบด้วยรหัสผ่านผิด',
    'มีบัญชี user123 อยู่ในฐานข้อมูล',
    ['กรอกชื่อผู้ใช้ user123', 'กรอกรหัสผ่านผิด', 'กดปุ่มเข้าสู่ระบบ'],
    'user123 / wrongpass99',
    'ไม่เข้าสู่ระบบ และแสดงข้อความ "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"',
    async () => {
      const r = await apiLogin(p.request, 'user123', 'wrongpass99');
      return { ok: r.status === 401 && /ไม่ถูกต้อง/.test(r.body.error || ''), actual: `HTTP ${r.status} · ${r.body.error || '-'}` };
    });
  await tc('TC-AU-03', 'การยืนยันตัวตน', 'เข้าสู่ระบบด้วยชื่อผู้ใช้ที่ไม่มีในระบบ',
    'ไม่มีบัญชีชื่อ ghostuser ในฐานข้อมูล',
    ['กรอกชื่อผู้ใช้ ghostuser', 'กรอกรหัสผ่านใดก็ได้', 'กดปุ่มเข้าสู่ระบบ'],
    'ghostuser / Test1234!',
    'แสดงข้อความเดียวกับกรณีรหัสผิด เพื่อไม่ให้เดาได้ว่าบัญชีมีอยู่จริงหรือไม่',
    async () => {
      const r = await apiLogin(p.request, 'ghostuser', 'Test1234!');
      return { ok: r.status === 401 && /ไม่ถูกต้อง/.test(r.body.error || ''), actual: `HTTP ${r.status} · ${r.body.error || '-'}` };
    });
  await tc('TC-AU-04', 'การยืนยันตัวตน', 'เข้าสู่ระบบด้วยบัญชีที่ถูกระงับ',
    'บัญชี user999 มีสถานะ is_active = 0',
    ['กรอกชื่อผู้ใช้ user999', 'กรอกรหัสผ่านที่ถูกต้อง', 'กดปุ่มเข้าสู่ระบบ'],
    'user999 / Test1234!',
    'ปฏิเสธการเข้าสู่ระบบ พร้อมแจ้งว่าบัญชีถูกระงับและเหตุผล',
    async () => {
      const r = await apiLogin(p.request, 'user999', 'Test1234!');
      return { ok: r.status === 403 && /ระงับ/.test(r.body.error || ''), actual: `HTTP ${r.status} · ${r.body.error || '-'}` };
    });
  await c.close();
}
{
  const c = await newCtx(); const p = await c.newPage();
  const uniq = String(Date.now()).slice(-7);
  await tc('TC-AU-05', 'การยืนยันตัวตน', 'สมัครสมาชิกใหม่สำเร็จ',
    'ยังไม่มีชื่อผู้ใช้และรหัสนักศึกษานี้ในระบบ',
    ['เปิดหน้าสมัครสมาชิก', 'กรอกข้อมูลครบทุกช่องตามเงื่อนไข', 'กดสมัครสมาชิก'],
    `ชื่อผู้ใช้ tcuser${uniq} · รหัส นศ. 20${uniq} · รหัสผ่าน Test1234!`,
    'สร้างบัญชีสำเร็จ และสร้างอีเมลอัตโนมัติเป็น s<รหัสนักศึกษา>@email.kmutnb.ac.th',
    async () => {
      const r = await p.request.post(BASE + '/api/register.php', { data: { username: 'tcuser' + uniq, name: 'ผู้ใช้ทดสอบ', code: '20' + uniq, password: 'Test1234!' } });
      const j = await r.json().catch(() => ({}));
      return { ok: r.status() < 300 && j.ok !== false, actual: `HTTP ${r.status()} · ${JSON.stringify(j).slice(0, 150)}` };
    });
  await tc('TC-AU-06', 'การยืนยันตัวตน', 'สมัครด้วยชื่อผู้ใช้ที่มีคนใช้แล้ว',
    'มีบัญชี user123 อยู่ในระบบแล้ว',
    ['กรอกชื่อผู้ใช้ user123', 'กรอกข้อมูลอื่นให้ถูกต้อง', 'กดสมัครสมาชิก'],
    'user123 / รหัส นศ. 1999999999',
    'ปฏิเสธการสมัคร พร้อมข้อความว่าชื่อผู้ใช้นี้มีคนใช้แล้ว (HTTP 409)',
    async () => {
      const r = await p.request.post(BASE + '/api/register.php', { data: { username: 'user123', name: 'ซ้ำ', code: '1999999999', password: 'Test1234!' } });
      const j = await r.json().catch(() => ({}));
      return { ok: r.status() === 409 && /มีคนใช้แล้ว/.test(j.error || ''), actual: `HTTP ${r.status()} · ${j.error || '-'}` };
    });
  await tc('TC-AU-07', 'การยืนยันตัวตน', 'สมัครด้วยรหัสผ่านสั้นกว่า 8 ตัวอักษร',
    'ไม่มีบัญชีนี้ในระบบ',
    ['กรอกข้อมูลครบ แต่ใส่รหัสผ่านเพียง 4 ตัวอักษร', 'กดสมัครสมาชิก'],
    'รหัสผ่าน 1234',
    'ปฏิเสธการสมัคร พร้อมข้อความว่ารหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร',
    async () => {
      const r = await p.request.post(BASE + '/api/register.php', { data: { username: 'tcshort' + uniq, name: 'สั้น', code: '21' + uniq, password: '1234' } });
      const j = await r.json().catch(() => ({}));
      return { ok: r.status() >= 400 && /8 ตัวอักษร/.test(j.error || ''), actual: `HTTP ${r.status()} · ${j.error || '-'}` };
    });
  await tc('TC-AU-08', 'การยืนยันตัวตน', 'สมัครด้วยรหัสนักศึกษาที่ไม่ใช่ตัวเลข',
    'ไม่มีบัญชีนี้ในระบบ',
    ['กรอกรหัสนักศึกษาเป็นตัวอักษร abcdefgh', 'กดสมัครสมาชิก'],
    'รหัส นศ. abcdefgh',
    'ปฏิเสธการสมัคร พร้อมข้อความว่ารหัสต้องเป็นตัวเลข 8-13 หลัก',
    async () => {
      const r = await p.request.post(BASE + '/api/register.php', { data: { username: 'tcabc' + uniq, name: 'ตัวอักษร', code: 'abcdefgh', password: 'Test1234!' } });
      const j = await r.json().catch(() => ({}));
      return { ok: r.status() >= 400 && /ตัวเลข/.test(j.error || ''), actual: `HTTP ${r.status()} · ${j.error || '-'}` };
    });
  clearThrottle();
  await tc('TC-AU-09', 'การยืนยันตัวตน', 'ป้องกันการเดารหัสผ่านซ้ำ ๆ',
    'ล้างประวัติการล็อกอินผิดแล้ว',
    ['ส่งคำขอเข้าสู่ระบบด้วยรหัสผ่านผิดติดต่อกัน 9 ครั้ง', 'ดูคำตอบของครั้งสุดท้าย'],
    'user123 / รหัสผิด ทำซ้ำ 9 ครั้ง',
    'ครั้งที่เกินโควตาต้องถูกปฏิเสธด้วย HTTP 429 พร้อมบอกให้รอ 15 นาที',
    async () => {
      let last = null;
      clearThrottle();
      for (let i = 0; i < 9; i++) last = await apiLoginRaw(p.request, 'user123', 'badpass' + i);
      return { ok: last.status === 429, actual: `คำขอครั้งที่ 9 ได้ HTTP ${last.status} · ${last.body.error || '-'}` };
    });
  await c.close();
}

clearThrottle();

/* ======================= 2. สิทธิ์การเข้าถึง ======================= */
{
  const c = await newCtx(); const p = await c.newPage();
  await tc('TC-SEC-01', 'สิทธิ์การเข้าถึง', 'เรียก API ขณะยังไม่เข้าสู่ระบบ',
    'ยังไม่ได้เข้าสู่ระบบ ไม่มี session',
    ['เรียก api/bootstrap.php โดยตรงโดยไม่ล็อกอิน'],
    'GET /api/bootstrap.php',
    'ปฏิเสธคำขอ พร้อมข้อความให้เข้าสู่ระบบก่อน',
    async () => {
      const r = await p.request.get(BASE + '/api/bootstrap.php');
      const j = await r.json().catch(() => ({}));
      return { ok: j.ok === false && /เข้าสู่ระบบ/.test(j.error || ''), actual: `HTTP ${r.status()} · ${j.error || '-'}` };
    });
  await c.close();
}
{
  const c = await newCtx(); const p = await c.newPage();
  await tc('TC-SEC-02', 'สิทธิ์การเข้าถึง', 'ผู้ใช้ทั่วไปเรียก API ของผู้ดูแลระบบ',
    'เข้าสู่ระบบด้วยบัญชีผู้ใช้ทั่วไป user123',
    ['เข้าสู่ระบบเป็น user123', 'เรียก api/admin.php?view=pending โดยตรง'],
    'GET /api/admin.php?view=pending ด้วย session ของ user123',
    'ปฏิเสธคำขอ ไม่ส่งข้อมูลรายงานที่รอตรวจสอบกลับมา',
    async () => {
      await apiLogin(p.request, 'user123', 'Test1234!');
      const r = await p.request.get(BASE + '/api/admin.php?view=pending');
      const j = await r.json().catch(() => ({}));
      return { ok: r.status() >= 400 || j.ok === false, actual: `HTTP ${r.status()} · ${JSON.stringify(j).slice(0, 120)}` };
    });
  await tc('TC-SEC-03', 'สิทธิ์การเข้าถึง', 'ส่งรายงานโดยไม่แนบ CSRF token',
    'เข้าสู่ระบบแล้ว แต่ไม่ส่ง header X-CSRF-Token',
    ['เข้าสู่ระบบเป็น user123', 'ส่ง POST ไป api/reports.php โดยไม่ใส่ X-CSRF-Token'],
    'POST /api/reports.php ไม่มี header CSRF',
    'ปฏิเสธคำขอ เพื่อกัน Cross-Site Request Forgery',
    async () => {
      const r = await p.request.post(BASE + '/api/reports.php', { data: { cat: 'light', sev: 'low', loc: 'สนามกีฬา', lat: 13.8186, lng: 100.5163, desc: 'csrf', when: '2026-09-17 10:00' } });
      const j = await r.json().catch(() => ({}));
      return { ok: r.status() >= 400 || j.ok === false, actual: `HTTP ${r.status()} · ${j.error || JSON.stringify(j).slice(0, 100)}` };
    });
  await c.close();
}
{
  const c = await newCtx(); const p = await c.newPage();
  await tc('TC-SEC-04', 'สิทธิ์การเข้าถึง', 'ผู้ใช้ทั่วไปเข้าหน้าผู้ดูแลระบบผ่านหน้าจอ',
    'เข้าสู่ระบบด้วยบัญชีผู้ใช้ทั่วไป user123',
    ['เข้าสู่ระบบเป็น user123', 'สั่งเปิดหน้า admin ด้วยคำสั่ง RZ.go("admin")'],
    'RZ.go("admin")',
    'ระบบไม่เปิดหน้าผู้ดูแล แต่พาไปหน้าแผนที่แทน',
    async () => {
      await uiLogin(p, 'user123', 'Test1234!');
      await p.evaluate(() => RZ.go('admin'));
      await p.waitForTimeout(500);
      const v = await p.evaluate(() => document.body.dataset.view);
      return { ok: v === 'map', actual: `หน้าที่แสดงจริงคือ view = ${v}` };
    });
  await tc('TC-SEC-05', 'สิทธิ์การเข้าถึง', 'ไฟล์ .php ในโฟลเดอร์ uploads ต้องไม่ถูกประมวลผล',
    'มีไฟล์ .htaccess ในโฟลเดอร์ uploads ที่ปิดการทำงานของ PHP',
    ['เรียกไฟล์ uploads/probe.php ผ่านเบราว์เซอร์'],
    'GET /uploads/probe.php',
    'เซิร์ฟเวอร์ต้องไม่รันโค้ด PHP (ตอบ 403 หรือส่งเป็นข้อความธรรมดา)',
    async () => {
      const r = await p.request.get(BASE + '/uploads/probe.php');
      const t = await r.text().catch(() => '');
      const executed = /RZ_PHP_EXECUTED/.test(t);
      return { ok: null, actual: `ทดสอบอัตโนมัติไม่ได้บนเครื่องทดสอบ เพราะใช้เว็บเซิร์ฟเวอร์ในตัวของ PHP ซึ่งไม่อ่านไฟล์ .htaccess (ผลที่วัดได้ HTTP ${r.status()} · โค้ด${executed ? 'ถูกรัน' : 'ไม่ถูกรัน'}) ต้องทดสอบด้วยมือบนโฮสต์จริงที่ใช้ Apache` };
    });
  await c.close();
}

clearThrottle();

/* ======================= 3. แจ้งเหตุการณ์ ======================= */
let reportForPhoto = null;
{
  const c = await newCtx(); const p = await c.newPage();
  await uiLogin(p, 'user123', 'Test1234!');

  await tc('TC-RP-01', 'แจ้งเหตุการณ์', 'ฟอร์มต้องเริ่มต้นแบบยังไม่เลือกอะไร',
    'เข้าสู่ระบบแล้ว',
    ['กดปุ่มแจ้งเหตุการณ์เพื่อเปิดฟอร์ม', 'ตรวจดูปุ่มประเภทและระดับความเสี่ยง'],
    '-',
    'ไม่มีประเภทหรือระดับความเสี่ยงใดถูกเลือกไว้ล่วงหน้า',
    async () => {
      await waitForm(p);
      const s = await p.evaluate(() => ({ cat: RZ.form.cat, sev: RZ.form.sev, pressed: document.querySelectorAll('#catGrid .opt[aria-pressed="true"], #sevGrid .sevopt[aria-pressed="true"]').length }));
      return { ok: s.cat === '' && s.sev === '' && s.pressed === 0, actual: `ประเภท="${s.cat}" ระดับ="${s.sev}" ปุ่มที่ถูกเลือกไว้ ${s.pressed} ปุ่ม` };
    });

  await tc('TC-RP-02', 'แจ้งเหตุการณ์', 'ส่งฟอร์มโดยไม่เลือกประเภทเหตุการณ์',
    'เปิดฟอร์มแจ้งเหตุการณ์แล้ว',
    ['ไม่เลือกประเภทเหตุการณ์', 'กดปุ่มส่งรายงาน'],
    'ประเภท = ว่าง',
    'ไม่ส่งข้อมูล และแสดงข้อความ "กรุณาเลือกประเภทเหตุการณ์"',
    async () => {
      await fillReport(p, { cat: null, sev: 'mid', photos: 0 });
      await p.click('#rzForm button[type=submit]');
      await p.waitForTimeout(500);
      const s = await p.evaluate(() => ({ err: !document.querySelector('#catErr').hidden, view: document.body.dataset.view }));
      return { ok: s.err && s.view === 'form', actual: `ข้อความเตือนประเภท: ${s.err ? 'แสดง' : 'ไม่แสดง'} · ยังอยู่หน้า ${s.view}` };
    });

  await tc('TC-RP-03', 'แจ้งเหตุการณ์', 'ส่งฟอร์มโดยไม่เลือกระดับความเสี่ยง',
    'เลือกประเภทเหตุการณ์แล้ว',
    ['เลือกประเภทเหตุการณ์', 'ไม่เลือกระดับความเสี่ยง', 'กดปุ่มส่งรายงาน'],
    'ประเภท = ไฟส่องสว่างชำรุด, ระดับ = ว่าง',
    'ไม่ส่งข้อมูล และแสดงข้อความ "กรุณาเลือกระดับความเสี่ยง"',
    async () => {
      await fillReport(p, { cat: 'light', sev: null, photos: 0 });
      await p.click('#rzForm button[type=submit]');
      await p.waitForTimeout(500);
      const s = await p.evaluate(() => ({ err: !document.querySelector('#sevErr').hidden, view: document.body.dataset.view }));
      return { ok: s.err && s.view === 'form', actual: `ข้อความเตือนระดับ: ${s.err ? 'แสดง' : 'ไม่แสดง'} · ยังอยู่หน้า ${s.view}` };
    });

  await tc('TC-RP-04', 'แจ้งเหตุการณ์', 'ส่งฟอร์มโดยไม่แนบรูปภาพ',
    'เลือกประเภทและระดับความเสี่ยงแล้ว',
    ['เลือกประเภทและระดับความเสี่ยง', 'ไม่แนบรูปภาพ', 'กดปุ่มส่งรายงาน'],
    'จำนวนรูปที่แนบ = 0',
    'ไม่ส่งข้อมูล และแสดงข้อความ "กรุณาแนบรูปอย่างน้อย 1 รูป"',
    async () => {
      await fillReport(p, { photos: 0 });
      await p.click('#rzForm button[type=submit]');
      await p.waitForTimeout(500);
      const s = await p.evaluate(() => ({ err: !document.querySelector('#photoErr').hidden, view: document.body.dataset.view }));
      return { ok: s.err && s.view === 'form', actual: `ข้อความเตือนรูปภาพ: ${s.err ? 'แสดง' : 'ไม่แสดง'} · ยังอยู่หน้า ${s.view}` };
    });

  await tc('TC-RP-05', 'แจ้งเหตุการณ์', 'เลือกประเภท "อื่น ๆ" แต่ไม่พิมพ์ชื่อประเภท',
    'เปิดฟอร์มแจ้งเหตุการณ์แล้ว',
    ['เลือกประเภท "อื่น ๆ (ระบุเอง)"', 'เว้นช่องระบุประเภทไว้', 'กรอกข้อมูลอื่นครบ', 'กดปุ่มส่งรายงาน'],
    'ประเภท = อื่น ๆ, ช่องระบุประเภท = ว่าง',
    'ไม่ส่งข้อมูล และโฟกัสกลับไปที่ช่องระบุประเภทพร้อมขอบสีแดง',
    async () => {
      await fillReport(p, { cat: 'other', sev: 'low', photos: 1 });
      await p.click('#rzForm button[type=submit]');
      await p.waitForTimeout(600);
      const s = await p.evaluate(() => ({ border: document.querySelector('#catOther').style.borderColor, view: document.body.dataset.view }));
      return { ok: !!s.border && s.view === 'form', actual: `ขอบช่องระบุประเภท = "${s.border || 'ปกติ'}" · ยังอยู่หน้า ${s.view}` };
    });

  await tc('TC-RP-06', 'แจ้งเหตุการณ์', 'ปักหมุดนอกรัศมี 10 กม. รอบ มจพ.',
    'เปิดฟอร์มแจ้งเหตุการณ์แล้ว',
    ['คลิกบนแผนที่ที่จุดนอกรัศมี 10 กม.'],
    'พิกัด 13.6000, 100.9000 (ห่างประมาณ 45 กม.)',
    'แสดงข้อความเตือนสีแดงว่าอยู่นอกขอบเขต และไม่ย้ายหมุดไปจุดนั้น',
    async () => {
      await waitForm(p);
      const before = await p.evaluate(() => ({ lat: RZ.form.lat, lng: RZ.form.lng }));
      await p.evaluate(() => RZ.setPin(13.6, 100.9, false));
      const after = await p.evaluate(() => ({ lat: RZ.form.lat, bad: document.querySelector('#coord').classList.contains('coord-bad'), msg: document.querySelector('#coord').textContent }));
      return { ok: after.bad && after.lat === before.lat, actual: `${after.bad ? 'แสดงเตือนสีแดง' : 'ไม่แสดงเตือน'} · หมุดยังอยู่ที่ ${after.lat} (เดิม ${before.lat})` };
    });

  await tc('TC-RP-07', 'แจ้งเหตุการณ์', 'ชื่อตำแหน่งต้องมาจากจุดที่ปักหมุด',
    'เปิดฟอร์มแจ้งเหตุการณ์แล้ว (ไม่มีช่องเลือกตำแหน่งแบบรายการแล้ว)',
    ['คลิกบนแผนที่ตรงพิกัดหน้าหอสมุดกลาง', 'อ่านชื่อสถานที่ที่ระบบแสดงใต้แผนที่'],
    'พิกัด 13.81990, 100.51330',
    'ระบบเลือกชื่อ "หน้าหอสมุดกลาง" ให้อัตโนมัติ และไม่มีช่อง select ตำแหน่งเหลืออยู่',
    async () => {
      await p.evaluate(() => RZ.setPin(13.8199, 100.5133, false));
      await p.waitForTimeout(300);
      const s = await p.evaluate(() => ({ loc: RZ.form.loc, text: document.querySelector('#locName').innerText, sel: !!document.querySelector('#loc') }));
      return { ok: s.loc === 'หน้าหอสมุดกลาง' && !s.sel, actual: `แสดง "${s.text}" · ช่อง select ตำแหน่ง ${s.sel ? 'ยังอยู่' : 'ถูกเอาออกแล้ว'}` };
    });

  await tc('TC-RP-08', 'แจ้งเหตุการณ์', 'ปักหมุดห่างจากสถานที่ที่ระบบรู้จัก ต้องบอกระยะห่าง',
    'เปิดฟอร์มแจ้งเหตุการณ์แล้ว',
    ['คลิกบนแผนที่ที่จุดห่างจากสถานที่ที่ใกล้ที่สุดประมาณ 200 เมตร'],
    'พิกัด 13.82170, 100.51330',
    'แสดงชื่อสถานที่ที่ใกล้ที่สุด พร้อมข้อความบอกระยะห่างต่อท้าย',
    async () => {
      await p.evaluate(() => RZ.setPin(13.8217, 100.5133, false));
      await p.waitForTimeout(300);
      const t = await p.evaluate(() => document.querySelector('#locName').innerText);
      return { ok: /ห่าง/.test(t), actual: `แสดง "${t}"` };
    });

  await tc('TC-RP-09', 'แจ้งเหตุการณ์', 'ส่งรายงานครบถ้วนพร้อมรูป 1 รูป',
    'เข้าสู่ระบบแล้ว และกรอกข้อมูลครบทุกช่องที่จำเป็น',
    ['เลือกประเภทและระดับความเสี่ยง', 'ปักหมุดในเขตพื้นที่บริการ', 'พิมพ์รายละเอียด', 'แนบรูป 1 รูป', 'กดปุ่มส่งรายงาน'],
    'ประเภท=ไฟส่องสว่างชำรุด, ระดับ=กลาง, พิกัด 13.81910/100.51570, รูป 1 รูป',
    'ส่งสำเร็จ แสดงหน้ายืนยันพร้อมเลขรายงานรูปแบบ RZ-ปีพ.ศ.-ลำดับ',
    async () => {
      await fillReport(p, { desc: 'ทดสอบส่งรายงานครบถ้วน', photos: 1 });
      await p.click('#rzForm button[type=submit]');
      await p.waitForTimeout(2500);
      const id = await p.evaluate(() => document.querySelector('#newId').textContent);
      reportForPhoto = id;
      return { ok: /^RZ-\d{4}-\d{4}$/.test(id), actual: `ได้เลขรายงาน ${id}` };
    });

  await tc('TC-RP-10', 'แจ้งเหตุการณ์', 'ฟอร์มต้องถูกล้างค่าหลังส่งสำเร็จ',
    'เพิ่งส่งรายงานสำเร็จ',
    ['กดปุ่มแจ้งเหตุการณ์เพื่อเปิดฟอร์มอีกครั้ง', 'ตรวจดูค่าที่ค้างอยู่'],
    '-',
    'ทุกช่องกลับเป็นค่าว่าง ไม่มีรูปค้าง และหมุดกลับไปจุดตั้งต้น',
    async () => {
      await waitForm(p);
      const s = await p.evaluate(() => ({ cat: RZ.form.cat, sev: RZ.form.sev, desc: document.querySelector('#desc').value, photos: RZ.photos.length, lat: +RZ.form.lat.toFixed(4) }));
      return { ok: s.cat === '' && s.sev === '' && s.desc === '' && s.photos === 0 && s.lat === 13.8197, actual: `ประเภท="${s.cat}" ระดับ="${s.sev}" รายละเอียด="${s.desc}" รูป=${s.photos} หมุด=${s.lat}` };
    });

  await tc('TC-RP-11', 'แจ้งเหตุการณ์', 'ส่งรายละเอียดยาวเกิน 500 ตัวอักษรผ่าน API',
    'เข้าสู่ระบบแล้วและมี CSRF token',
    ['ส่ง POST ไป api/reports.php โดยใส่รายละเอียดยาว 600 ตัวอักษร'],
    'รายละเอียดยาว 600 ตัวอักษร',
    'เซิร์ฟเวอร์ปฏิเสธ พร้อมข้อความว่ารายละเอียดยาวเกิน 500 ตัวอักษร',
    async () => {
      const csrf = await p.evaluate(() => RZ.api.csrf || RZ.csrf || (window.RZ && RZ.state && RZ.state.csrf));
      const token = csrf || await p.evaluate(() => RZ.api._csrf);
      const r = await p.request.post(BASE + '/api/reports.php', {
        headers: { 'X-CSRF-Token': token || '' },
        data: { cat: 'light', sev: 'low', loc: 'สนามกีฬา', lat: 13.8186, lng: 100.5163, desc: 'ก'.repeat(600), when: '2026-09-17 10:00' }
      });
      const j = await r.json().catch(() => ({}));
      return { ok: r.status() >= 400 || j.ok === false, actual: `HTTP ${r.status()} · ${j.error || '-'}` };
    });
  await c.close();
}

clearThrottle();

/* ======================= 4. รูปภาพประกอบ ======================= */
{
  const c = await newCtx(); const p = await c.newPage();
  await uiLogin(p, 'user123', 'Test1234!');

  await tc('TC-PH-01', 'รูปภาพประกอบ', 'แนบรูปได้สูงสุด 3 รูป',
    'เปิดฟอร์มแจ้งเหตุการณ์แล้ว',
    ['เลือกรูปภาพ 3 รูปพร้อมกัน', 'ดูจำนวนรูปที่ระบบรับไว้'],
    'ไฟล์ JPEG 3 ไฟล์',
    'ระบบรับรูปครบทั้ง 3 รูป และแสดงรูปตัวอย่าง 3 รูป',
    async () => {
      await fillReport(p, { photos: 3, desc: 'ทดสอบ 3 รูป' });
      const n = await p.evaluate(() => ({ arr: RZ.photos.length, thumbs: document.querySelectorAll('#photoBox .thumb').length }));
      return { ok: n.arr === 3, actual: `รับไว้ ${n.arr} รูป แสดงรูปตัวอย่าง ${n.thumbs} รูป` };
    });

  await tc('TC-PH-02', 'รูปภาพประกอบ', 'แนบรูปเกิน 3 รูป',
    'แนบรูปไว้แล้ว 3 รูป',
    ['เลือกรูปเพิ่มอีก 2 รูป'],
    'ไฟล์ JPEG เพิ่มอีก 2 ไฟล์',
    'ระบบไม่รับรูปส่วนเกิน จำนวนรูปยังคงเป็น 3',
    async () => {
      await attachPhoto(p, 2);
      const n = await p.evaluate(() => RZ.photos.length);
      return { ok: n === 3, actual: `จำนวนรูปหลังพยายามแนบเพิ่ม = ${n} รูป` };
    });

  await tc('TC-PH-03', 'รูปภาพประกอบ', 'รูปที่แนบต้องถูกบันทึกและแสดงในรายละเอียดเหตุการณ์',
    'ส่งรายงานพร้อมรูป 2 รูปสำเร็จ',
    ['ส่งรายงานพร้อมรูป 2 รูป', 'ผู้ดูแลระบบอนุมัติรายงาน', 'เปิดดูรายละเอียดเหตุการณ์บนแผนที่'],
    'รูป JPEG 2 ไฟล์',
    'รายละเอียดเหตุการณ์แสดงแกลเลอรีรูปครบ 2 รูป',
    async () => {
      await fillReport(p, { photos: 2, desc: 'ทดสอบแกลเลอรีรูป' });
      await p.click('#rzForm button[type=submit]');
      await p.waitForTimeout(2600);
      const id = await p.evaluate(() => document.querySelector('#newId').textContent);
      const admin = await browser.newContext();
      const ap = await admin.newPage();
      const lg = await apiLogin(ap.request, 'admin', 'Rzf58f00!A84F');
      await ap.request.post(BASE + '/api/admin.php?action=approve&id=' + encodeURIComponent(id), { headers: { 'X-CSRF-Token': lg.csrf }, data: { reason: 'อนุมัติเพื่อการทดสอบ' } });
      await admin.close();
      await p.evaluate(() => RZ.api.refresh && RZ.api.refresh());
      await p.waitForTimeout(1200);
      const n = await p.evaluate(x => { const d = RZ.api.getIncidents().find(r => r.id === x); return d ? (d.photos || []).length : -1; }, id);
      return { ok: n === 2, actual: `รายงาน ${id} มีรูปที่บันทึกไว้ ${n} รูป` };
    });

  await tc('TC-PH-04', 'รูปภาพประกอบ', 'อัปโหลดไฟล์ที่ไม่ใช่รูปภาพแต่ตั้งชื่อเป็น .jpg',
    'เข้าสู่ระบบแล้วและมีรายงานของตนเองอยู่',
    ['สร้างไฟล์ข้อความที่มีโค้ด PHP แล้วตั้งชื่อ evil.jpg', 'ส่งไฟล์นี้ไปที่ api/upload.php'],
    'ไฟล์ข้อความ "<?php echo 1; ?>" ชื่อ evil.jpg ประเภท image/jpeg',
    'เซิร์ฟเวอร์ปฏิเสธ เพราะตรวจจากเนื้อไฟล์จริง ไม่ใช่นามสกุล',
    async () => {
      const lg = await apiLogin(p.request, 'user123', 'Test1234!');
      const r = await p.request.post(BASE + '/api/upload.php', {
        headers: { 'X-CSRF-Token': lg.csrf },
        multipart: { report: reportForPhoto || 'RZ-2569-0001', 'photos[]': { name: 'evil.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('<?php echo "RZ_PHP_EXECUTED"; ?>') } }
      });
      const j = await r.json().catch(() => ({}));
      return { ok: r.status() >= 400 || j.ok === false, actual: `HTTP ${r.status()} · ${j.error || '-'}` };
    });

  await tc('TC-PH-05', 'รูปภาพประกอบ', 'แนบรูปเข้ากับรายงานของผู้ใช้คนอื่น',
    'เข้าสู่ระบบเป็น user456 และมีรายงานของ user123 อยู่ในระบบ',
    ['เข้าสู่ระบบเป็น user456', 'ส่งรูปไปที่ api/upload.php โดยระบุเลขรายงานของ user123'],
    `เลขรายงานของ user123`,
    'เซิร์ฟเวอร์ปฏิเสธ พร้อมข้อความว่าไม่มีสิทธิ์แนบรูปกับรายงานนี้ (HTTP 403)',
    async () => {
      const c2 = await browser.newContext();
      const p2 = await c2.newPage();
      const lg = await apiLogin(p2.request, 'user456', 'Test1234!');
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
      const r = await p2.request.post(BASE + '/api/upload.php', {
        headers: { 'X-CSRF-Token': lg.csrf },
        multipart: { report: reportForPhoto || 'RZ-2569-0001', 'photos[]': { name: 'ok.png', mimeType: 'image/png', buffer: png } }
      });
      const j = await r.json().catch(() => ({}));
      await c2.close();
      return { ok: r.status() === 403, actual: `HTTP ${r.status()} · ${j.error || '-'}` };
    });
  await c.close();
}

clearThrottle();

/* ======================= 5. ความเป็นส่วนตัวของผู้แจ้ง ======================= */
let anonId = null, openId = null;
{
  const c = await newCtx(); const p = await c.newPage();
  await uiLogin(p, 'user123', 'Test1234!');

  await tc('TC-PV-01', 'ความเป็นส่วนตัว', 'ข้อความแจ้งความยินยอมต้องแสดงในฟอร์ม',
    'เข้าสู่ระบบแล้ว',
    ['เปิดฟอร์มแจ้งเหตุการณ์', 'อ่านข้อความส่วนล่างของฟอร์ม'],
    '-',
    'แสดงข้อความว่าผู้ดูแลระบบจะเห็นข้อมูลผู้แจ้ง พร้อมอีเมลจริงของผู้ใช้จากฐานข้อมูล',
    async () => {
      await waitForm(p);
      await p.waitForFunction(() => {
        const e = document.querySelector('#fmEmail');
        return e && e.textContent.indexOf('@') > -1;
      }, null, { timeout: 8000 }).catch(() => {});
      const t = await p.evaluate(() => document.querySelector('.consent').innerText.replace(/\s+/g, ' '));
      return { ok: /ผู้ดูแลระบบจะเห็น/.test(t) && /s1000000123@email\.kmutnb\.ac\.th/.test(t), actual: t.slice(0, 160) };
    });

  await tc('TC-PV-02', 'ความเป็นส่วนตัว', 'ส่งรายงานแบบไม่แสดงชื่อต่อสาธารณะ',
    'เข้าสู่ระบบเป็น user123',
    ['เปิดสวิตช์ "ไม่แสดงชื่อผู้ใช้ต่อสาธารณะ"', 'กรอกข้อมูลครบและส่งรายงาน'],
    'สวิตช์ไม่แสดงชื่อ = เปิด',
    'ส่งสำเร็จ และรายงานถูกทำเครื่องหมายว่าไม่แสดงชื่อต่อสาธารณะ',
    async () => {
      await fillReport(p, { desc: 'ทดสอบไม่แสดงชื่อ', photos: 1, anon: true, lat: 13.8186, lng: 100.5163 });
      await p.click('#rzForm button[type=submit]');
      await p.waitForTimeout(2500);
      anonId = await p.evaluate(() => document.querySelector('#newId').textContent);
      return { ok: /^RZ-/.test(anonId), actual: `ได้เลขรายงาน ${anonId}` };
    });

  await tc('TC-PV-03', 'ความเป็นส่วนตัว', 'ส่งรายงานแบบแสดงชื่อ',
    'เข้าสู่ระบบเป็น user123',
    ['ไม่เปิดสวิตช์ไม่แสดงชื่อ', 'กรอกข้อมูลครบและส่งรายงาน'],
    'สวิตช์ไม่แสดงชื่อ = ปิด',
    'ส่งสำเร็จ และรายงานผูกกับบัญชีผู้แจ้งตามปกติ',
    async () => {
      await fillReport(p, { desc: 'ทดสอบแสดงชื่อ', photos: 1, anon: false, lat: 13.8194, lng: 100.5128 });
      await p.click('#rzForm button[type=submit]');
      await p.waitForTimeout(2500);
      openId = await p.evaluate(() => document.querySelector('#newId').textContent);
      return { ok: /^RZ-/.test(openId), actual: `ได้เลขรายงาน ${openId}` };
    });

  await tc('TC-PV-04', 'ความเป็นส่วนตัว', 'เจ้าของต้องเห็นรายงานที่ส่งแบบไม่แสดงชื่อใน "รายงานของฉัน"',
    'user123 ส่งรายงานแบบไม่แสดงชื่อไว้แล้ว',
    ['เข้าสู่ระบบเป็น user123', 'เปิดหน้ารายงานของฉัน', 'ค้นหาเลขรายงานที่ส่งแบบไม่แสดงชื่อ'],
    `เลขรายงานจาก TC-PV-02`,
    'พบรายงานนั้นในรายการ เพราะระบบยังเก็บ user_id ไว้',
    async () => {
      await p.evaluate(() => RZ.api.refresh && RZ.api.refresh());
      await p.waitForTimeout(1200);
      const r = await p.evaluate(x => { const d = RZ.api.getMyReports().find(y => y.id === x); return d ? { anon: d.anon, reporter: d.reporter } : null; }, anonId);
      return { ok: !!r, actual: r ? `พบรายงาน ${anonId} (ธงไม่แสดงชื่อ = ${r.anon})` : `ไม่พบรายงาน ${anonId} ในรายงานของฉัน` };
    });
  await c.close();
}
{
  // อนุมัติทั้งสองรายงานเพื่อให้ผู้ใช้อื่นมองเห็น
  const c = await newCtx(); const p = await c.newPage();
  const lg = await apiLogin(p.request, 'admin', 'Rzf58f00!A84F');
  for (const id of [anonId, openId]) {
    if (id) await p.request.post(BASE + '/api/admin.php?action=approve&id=' + encodeURIComponent(id), { headers: { 'X-CSRF-Token': lg.csrf }, data: { reason: 'อนุมัติเพื่อการทดสอบ' } });
  }

  await tc('TC-PV-05', 'ความเป็นส่วนตัว', 'ผู้ดูแลระบบต้องเห็นชื่อผู้แจ้งแม้ผู้ใช้เลือกไม่แสดงชื่อ',
    'มีรายงานที่ส่งแบบไม่แสดงชื่อในระบบ และเข้าสู่ระบบเป็นผู้ดูแล',
    ['เข้าสู่ระบบเป็น admin', 'เรียกดูรายการรายงานทั้งหมด', 'ดูช่องผู้แจ้งของรายงานนั้น'],
    `เลขรายงานจาก TC-PV-02`,
    'แสดงชื่อผู้ใช้ผู้แจ้ง พร้อมหมายเหตุว่าไม่แสดงต่อสาธารณะ',
    async () => {
      const r = await p.request.get(BASE + '/api/admin.php?view=reports');
      const rows = await r.json().catch(() => []);
      const row = (rows || []).find(x => x.id === anonId);
      return { ok: !!(row && row.reporter && row.anon), actual: row ? `ผู้แจ้ง = ${row.reporter} · ธงไม่แสดงชื่อ = ${row.anon}` : 'ไม่พบรายงานในรายการของผู้ดูแล' };
    });
  await c.close();
}
{
  const c = await newCtx(); const p = await c.newPage();
  await uiLogin(p, 'user456', 'Test1234!');

  await tc('TC-PV-06', 'ความเป็นส่วนตัว', 'ผู้ใช้คนอื่นต้องไม่เห็นชื่อผู้แจ้งของรายงานที่ไม่แสดงชื่อ',
    'รายงานที่ไม่แสดงชื่อถูกอนุมัติแล้ว',
    ['เข้าสู่ระบบเป็น user456', 'เปิดดูรายละเอียดรายงานนั้นบนแผนที่'],
    `เลขรายงานจาก TC-PV-02`,
    'ช่องผู้แจ้งแสดงว่า "ไม่ระบุชื่อ" ไม่มีชื่อผู้ใช้จริง',
    async () => {
      await p.evaluate(x => RZ.pick(x), anonId);
      await p.waitForTimeout(700);
      const s = await p.evaluate(x => {
        const d = RZ.api.getIncidents().find(y => y.id === x);
        const dts = [...document.querySelectorAll('#detail dt')];
        const i = dts.findIndex(e => e.textContent === 'ผู้แจ้ง');
        return { reporter: d ? d.reporter : undefined, shown: i < 0 ? null : document.querySelectorAll('#detail dd')[i].innerText };
      }, anonId);
      return { ok: !s.reporter && s.shown === 'ไม่ระบุชื่อ', actual: `ข้อมูลที่ส่งมา reporter = ${s.reporter === undefined ? 'ไม่ส่งมา' : s.reporter} · หน้าจอแสดง "${s.shown}"` };
    });

  await tc('TC-PV-07', 'ความเป็นส่วนตัว', 'ผู้ใช้คนอื่นเห็นชื่อผู้แจ้งของรายงานแบบแสดงชื่อ',
    'รายงานแบบแสดงชื่อถูกอนุมัติแล้ว',
    ['เข้าสู่ระบบเป็น user456', 'เปิดดูรายละเอียดรายงานนั้นบนแผนที่'],
    `เลขรายงานจาก TC-PV-03`,
    'ช่องผู้แจ้งแสดงชื่อผู้ใช้ของผู้แจ้ง',
    async () => {
      await p.evaluate(x => RZ.pick(x), openId);
      await p.waitForTimeout(700);
      const s = await p.evaluate(() => {
        const dts = [...document.querySelectorAll('#detail dt')];
        const i = dts.findIndex(e => e.textContent === 'ผู้แจ้ง');
        return i < 0 ? null : document.querySelectorAll('#detail dd')[i].innerText;
      });
      return { ok: s === 'user123', actual: `หน้าจอแสดงผู้แจ้งว่า "${s}"` };
    });
  await c.close();
}

clearThrottle();

/* ======================= 6. ผู้ดูแลระบบ ======================= */
{
  const c = await newCtx(); const p = await c.newPage();
  const lg = await apiLogin(p.request, 'admin', 'Rzf58f00!A84F');
  let pendingId = null;

  await tc('TC-AD-01', 'ผู้ดูแลระบบ', 'ผู้ดูแลเห็นคิวรายงานที่รอตรวจสอบ',
    'มีรายงานที่ยังไม่ถูกอนุมัติในระบบ',
    ['เข้าสู่ระบบเป็น admin', 'เปิดหน้าคิวรอตรวจสอบ'],
    '-',
    'แสดงรายการรายงานที่ยังไม่อนุมัติ',
    async () => {
      const r = await p.request.get(BASE + '/api/admin.php?view=pending');
      const rows = await r.json().catch(() => []);
      if (rows && rows.length) pendingId = rows[0].id;
      return { ok: Array.isArray(rows) && rows.length > 0, actual: `พบรายงานรอตรวจสอบ ${Array.isArray(rows) ? rows.length : 0} รายการ` };
    });

  await tc('TC-AD-02', 'ผู้ดูแลระบบ', 'ไม่อนุมัติรายงานโดยไม่ระบุเหตุผล',
    'มีรายงานรอตรวจสอบอยู่',
    ['ส่งคำสั่งไม่อนุมัติโดยเว้นช่องเหตุผลไว้'],
    'reason = ว่าง',
    'ระบบปฏิเสธ เพราะการไม่อนุมัติต้องบันทึกเหตุผลให้ผู้แจ้งทราบ',
    async () => {
      const r = await p.request.post(BASE + '/api/admin.php?action=reject&id=' + encodeURIComponent(pendingId), { headers: { 'X-CSRF-Token': lg.csrf }, data: { reason: '' } });
      const j = await r.json().catch(() => ({}));
      return { ok: r.status() >= 400 || j.ok === false, actual: `HTTP ${r.status()} · ${j.error || '-'}` };
    });

  await tc('TC-AD-03', 'ผู้ดูแลระบบ', 'อนุมัติรายงานพร้อมระบุเหตุผล',
    'มีรายงานรอตรวจสอบอยู่',
    ['ส่งคำสั่งอนุมัติพร้อมเหตุผล', 'ตรวจสอบสถานะรายงาน'],
    'reason = "ตรวจสอบแล้วเป็นเหตุจริง"',
    'รายงานถูกอนุมัติ และแสดงบนแผนที่สาธารณะ',
    async () => {
      const r = await p.request.post(BASE + '/api/admin.php?action=approve&id=' + encodeURIComponent(pendingId), { headers: { 'X-CSRF-Token': lg.csrf }, data: { reason: 'ตรวจสอบแล้วเป็นเหตุจริง' } });
      const j = await r.json().catch(() => ({}));
      const all = await (await p.request.get(BASE + '/api/admin.php?view=reports')).json().catch(() => []);
      const row = (all || []).find(x => x.id === pendingId);
      return { ok: (r.status() < 300) && row && row.approved === true, actual: `HTTP ${r.status()} · สถานะอนุมัติของ ${pendingId} = ${row ? row.approved : 'ไม่พบ'}` };
    });

  await tc('TC-AD-04', 'ผู้ดูแลระบบ', 'ไม่อนุมัติรายงานพร้อมระบุเหตุผล',
    'มีรายงานรอตรวจสอบอยู่',
    ['ส่งคำสั่งไม่อนุมัติพร้อมเหตุผล', 'ตรวจสอบว่าเหตุผลถูกบันทึก'],
    'reason = "ข้อมูลไม่เพียงพอต่อการตรวจสอบ"',
    'รายงานเปลี่ยนสถานะเป็นไม่อนุมัติ และเก็บเหตุผลไว้ให้ผู้แจ้งเห็น',
    async () => {
      const pend = await (await p.request.get(BASE + '/api/admin.php?view=pending')).json().catch(() => []);
      const id = pend && pend.length ? pend[0].id : null;
      if (!id) return { ok: false, actual: 'ไม่มีรายงานรอตรวจสอบให้ทดสอบ' };
      await p.request.post(BASE + '/api/admin.php?action=reject&id=' + encodeURIComponent(id), { headers: { 'X-CSRF-Token': lg.csrf }, data: { reason: 'ข้อมูลไม่เพียงพอต่อการตรวจสอบ' } });
      const all = await (await p.request.get(BASE + '/api/admin.php?view=reports')).json().catch(() => []);
      const row = (all || []).find(x => x.id === id);
      return { ok: !!(row && row.stage === 'reject' && row.rejectReason), actual: row ? `สถานะ = ${row.stage} · เหตุผล = ${row.rejectReason}` : 'ไม่พบรายงาน' };
    });

  await tc('TC-AD-05', 'ผู้ดูแลระบบ', 'เปลี่ยนสถานะการดำเนินงานของรายงาน',
    'มีรายงานที่อนุมัติแล้วอยู่ในระบบ',
    ['ส่งคำสั่งเปลี่ยนสถานะเป็น "กำลังดำเนินการ" พร้อมเหตุผล'],
    'status = prog',
    'สถานะของรายงานเปลี่ยนตามที่สั่ง',
    async () => {
      const r = await p.request.post(BASE + '/api/admin.php?action=set_status&id=' + encodeURIComponent(pendingId), { headers: { 'X-CSRF-Token': lg.csrf }, data: { status: 'prog', reason: 'ส่งเรื่องให้หน่วยงานที่รับผิดชอบแล้ว' } });
      const all = await (await p.request.get(BASE + '/api/admin.php?view=reports')).json().catch(() => []);
      const row = (all || []).find(x => x.id === pendingId);
      return { ok: r.status() < 300 && row && row.stage === 'prog', actual: `HTTP ${r.status()} · สถานะปัจจุบัน = ${row ? row.stage : 'ไม่พบ'}` };
    });

  await tc('TC-AD-06', 'ผู้ดูแลระบบ', 'ส่งสถานะที่ไม่มีอยู่จริง',
    'มีรายงานอยู่ในระบบ',
    ['ส่งคำสั่งเปลี่ยนสถานะเป็นค่าที่ระบบไม่รู้จัก'],
    'status = hacked',
    'ระบบปฏิเสธ พร้อมข้อความว่าสถานะไม่ถูกต้อง',
    async () => {
      const r = await p.request.post(BASE + '/api/admin.php?action=set_status&id=' + encodeURIComponent(pendingId), { headers: { 'X-CSRF-Token': lg.csrf }, data: { status: 'hacked', reason: 'ทดสอบ' } });
      const j = await r.json().catch(() => ({}));
      return { ok: r.status() >= 400 || j.ok === false, actual: `HTTP ${r.status()} · ${j.error || '-'}` };
    });

  await tc('TC-AD-07', 'ผู้ดูแลระบบ', 'ระงับบัญชีผู้ใช้',
    'มีบัญชี user654 ที่ยังใช้งานได้',
    ['ส่งคำสั่งระงับบัญชี user654 พร้อมเหตุผล', 'ลองเข้าสู่ระบบด้วยบัญชีนั้น'],
    'userId = 52 (user654)',
    'บัญชีถูกระงับ และเข้าสู่ระบบไม่ได้อีก',
    async () => {
      await p.request.post(BASE + '/api/admin.php?action=ban&id=52', { headers: { 'X-CSRF-Token': lg.csrf }, data: { reason: 'ทดสอบการระงับบัญชี' } });
      const c2 = await browser.newContext(); const p2 = await c2.newPage();
      const lr = await apiLogin(p2.request, 'user654', 'Test1234!');
      await c2.close();
      return { ok: lr.status === 403, actual: `ผลการเข้าสู่ระบบหลังถูกระงับ: HTTP ${lr.status} · ${lr.body.error || '-'}` };
    });

  await tc('TC-AD-08', 'ผู้ดูแลระบบ', 'ยกเลิกการระงับบัญชีผู้ใช้',
    'บัญชี user654 ถูกระงับอยู่',
    ['ส่งคำสั่งยกเลิกการระงับพร้อมเหตุผล', 'ลองเข้าสู่ระบบด้วยบัญชีนั้น'],
    'userId = 52 (user654)',
    'บัญชีกลับมาใช้งานได้ และเข้าสู่ระบบได้ตามปกติ',
    async () => {
      await p.request.post(BASE + '/api/admin.php?action=unban&id=52', { headers: { 'X-CSRF-Token': lg.csrf }, data: { reason: 'ทดสอบเสร็จแล้ว' } });
      const c2 = await browser.newContext(); const p2 = await c2.newPage();
      const lr = await apiLogin(p2.request, 'user654', 'Test1234!');
      await c2.close();
      return { ok: lr.status === 200 && lr.body.ok, actual: `ผลการเข้าสู่ระบบหลังยกเลิกการระงับ: HTTP ${lr.status}` };
    });

  await tc('TC-AD-09', 'ผู้ดูแลระบบ', 'ผู้ดูแลระงับบัญชีของตนเอง',
    'เข้าสู่ระบบเป็น admin (user_id = 2)',
    ['ส่งคำสั่งระงับบัญชีโดยระบุ userId ของตนเอง'],
    'userId = 2 (admin)',
    'ระบบปฏิเสธ เพื่อกันไม่ให้ระบบเหลือผู้ดูแลที่ใช้งานไม่ได้',
    async () => {
      const r = await p.request.post(BASE + '/api/admin.php?action=ban&id=2', { headers: { 'X-CSRF-Token': lg.csrf }, data: { reason: 'ทดสอบ' } });
      const j = await r.json().catch(() => ({}));
      return { ok: r.status() >= 400 || j.ok === false, actual: `HTTP ${r.status()} · ${j.error || '-'}` };
    });

  await tc('TC-AD-10', 'ผู้ดูแลระบบ', 'ทุกการกระทำของผู้ดูแลต้องถูกบันทึกลงประวัติ',
    'ผู้ดูแลได้ทำคำสั่งอนุมัติ ไม่อนุมัติ และระงับบัญชีไปแล้ว',
    ['เปิดหน้าประวัติการจัดการ', 'ตรวจว่ามีรายการที่เพิ่งทำไปบันทึกอยู่'],
    '-',
    'มีบันทึกครบทุกคำสั่ง พร้อมเหตุผลที่ผู้ดูแลกรอกไว้',
    async () => {
      const rows = await (await p.request.get(BASE + '/api/admin.php?view=audit')).json().catch(() => []);
      const acts = (rows || []).map(x => x.action);
      const need = ['approve_report', 'reject_report', 'ban_user', 'unban_user'];
      const missing = need.filter(a => !acts.includes(a));
      return { ok: missing.length === 0, actual: `พบบันทึก ${rows ? rows.length : 0} รายการ · ครอบคลุม ${need.filter(a => acts.includes(a)).join(', ')}${missing.length ? ' · ขาด ' + missing.join(', ') : ''}` };
    });
  await c.close();
}

clearThrottle();

/* ======================= 7. แผนที่และการค้นหา ======================= */
{
  const c = await newCtx(); const p = await c.newPage();
  await uiLogin(p, 'user123', 'Test1234!');

  await tc('TC-MP-01', 'แผนที่และการค้นหา', 'ขนาดแผนที่ต้องตรงกับกรอบหลังเข้าสู่ระบบ',
    'เข้าสู่ระบบแล้วและอยู่ที่หน้าแผนที่',
    ['เข้าสู่ระบบ', 'วัดความกว้างกรอบแผนที่', 'เทียบกับขนาดที่ Leaflet ใช้วาด'],
    '-',
    'ค่าทั้งสองต้องเท่ากัน (คลาดเคลื่อนไม่เกิน 2 พิกเซล)',
    async () => {
      await p.waitForTimeout(800);
      const s = await p.evaluate(() => ({ css: Math.round(document.querySelector('#mapCanvas').getBoundingClientRect().width), leaf: RZ.map ? Math.round(RZ.map.getSize().x) : null }));
      return { ok: s.leaf !== null && Math.abs(s.css - s.leaf) <= 2, actual: `กรอบกว้าง ${s.css}px · Leaflet ใช้ ${s.leaf}px` };
    });

  await tc('TC-MP-02', 'แผนที่และการค้นหา', 'ขนาดแผนที่ต้องยังตรงหลังสลับหน้าไปกลับ',
    'อยู่ที่หน้าแผนที่',
    ['เปิดหน้าแจ้งเหตุการณ์', 'กลับมาหน้าแผนที่', 'วัดขนาดอีกครั้ง'],
    '-',
    'ขนาดยังตรงกัน ไม่เกิดอาการแผนที่โหลดไม่เต็มกรอบ',
    async () => {
      await p.evaluate(() => RZ.go('form'));
      await p.waitForTimeout(600);
      await p.evaluate(() => RZ.go('map'));
      await p.waitForTimeout(800);
      const s = await p.evaluate(() => ({ css: Math.round(document.querySelector('#mapCanvas').getBoundingClientRect().width), leaf: RZ.map ? Math.round(RZ.map.getSize().x) : null }));
      return { ok: s.leaf !== null && Math.abs(s.css - s.leaf) <= 2, actual: `กรอบกว้าง ${s.css}px · Leaflet ใช้ ${s.leaf}px` };
    });

  await tc('TC-MP-03', 'แผนที่และการค้นหา', 'ขนาดแผนที่ต้องยังตรงหลังย่อ-ขยายหน้าต่าง',
    'อยู่ที่หน้าแผนที่',
    ['ย่อหน้าต่างเบราว์เซอร์เหลือ 820 พิกเซล', 'ขยายกลับเป็น 1400 พิกเซล', 'วัดขนาดแผนที่'],
    'ความกว้างหน้าต่าง 820px แล้ว 1400px',
    'แผนที่ปรับขนาดตามกรอบทุกครั้ง',
    async () => {
      await p.setViewportSize({ width: 820, height: 900 });
      await p.waitForTimeout(700);
      await p.setViewportSize({ width: 1400, height: 900 });
      await p.waitForTimeout(800);
      const s = await p.evaluate(() => ({ css: Math.round(document.querySelector('#mapCanvas').getBoundingClientRect().width), leaf: RZ.map ? Math.round(RZ.map.getSize().x) : null }));
      await p.setViewportSize({ width: 1280, height: 900 });
      await p.waitForTimeout(500);
      return { ok: s.leaf !== null && Math.abs(s.css - s.leaf) <= 2, actual: `กรอบกว้าง ${s.css}px · Leaflet ใช้ ${s.leaf}px` };
    });

  await tc('TC-MP-04', 'แผนที่และการค้นหา', 'กรองเหตุการณ์ตามระดับความเสี่ยง',
    'มีเหตุการณ์หลายระดับความเสี่ยงบนแผนที่',
    ['กดปุ่มกรอง "เสี่ยงสูง"', 'นับจำนวนรายการในรายชื่อเหตุการณ์'],
    'ตัวกรอง = เสี่ยงสูง',
    'แสดงเฉพาะเหตุการณ์ระดับเสี่ยงสูงเท่านั้น',
    async () => {
      await p.click('#sevFilter .chip[data-sev="high"]');
      await p.waitForTimeout(600);
      const s = await p.evaluate(() => {
        const list = RZ.api.getIncidents().filter(RZ.visible);
        return { total: list.length, allHigh: list.every(d => d.sev === 'high') };
      });
      await p.click('#sevFilter .chip[data-sev="all"]');
      await p.waitForTimeout(400);
      return { ok: s.allHigh && s.total > 0, actual: `แสดง ${s.total} รายการ · เป็นระดับเสี่ยงสูงทั้งหมด = ${s.allHigh}` };
    });

  await tc('TC-MP-05', 'แผนที่และการค้นหา', 'ค้นหาด้วยคำที่อยู่ในรายละเอียดของผู้แจ้ง',
    'มีเหตุการณ์ที่มีคำว่า "ไฟ" อยู่ในข้อมูล',
    ['พิมพ์คำค้นลงในช่องค้นหา', 'ดูรายการที่เหลืออยู่'],
    'คำค้น = "ไฟ"',
    'แสดงเฉพาะเหตุการณ์ที่มีคำค้นอยู่ในหัวข้อ สถานที่ ประเภท หรือรายละเอียด',
    async () => {
      await p.fill('#q', 'ไฟ');
      await p.waitForTimeout(700);
      const s = await p.evaluate(() => {
        const list = RZ.api.getIncidents().filter(RZ.visible);
        return { n: list.length, all: list.every(d => (d.title + d.loc + d.note + RZ.catName(d)).includes('ไฟ')) };
      });
      await p.fill('#q', '');
      await p.waitForTimeout(400);
      return { ok: s.n > 0 && s.all, actual: `พบ ${s.n} รายการ · ทุกรายการมีคำค้นอยู่จริง = ${s.all}` };
    });

  await tc('TC-MP-06', 'แผนที่และการค้นหา', 'เลือกเหตุการณ์แล้วต้องแสดงรายละเอียด',
    'มีเหตุการณ์อยู่ในรายการ',
    ['คลิกรายการเหตุการณ์รายการแรก', 'ดูแผงรายละเอียดด้านขวา'],
    '-',
    'แผงขวาแสดงรายละเอียดของเหตุการณ์ที่เลือก พร้อมเลขรายงานและพิกัด',
    async () => {
      const id = await p.evaluate(() => { const l = RZ.api.getIncidents().filter(RZ.visible); return l.length ? l[0].id : null; });
      await p.evaluate(x => RZ.pick(x), id);
      await p.waitForTimeout(700);
      const t = await p.evaluate(() => document.querySelector('#detail').innerText);
      return { ok: !!id && t.includes(id), actual: `แผงรายละเอียดแสดงรายงาน ${id} = ${t.includes(id)}` };
    });
  await c.close();
}

clearThrottle();

/* ======================= 8. ความคิดเห็น ======================= */
{
  const c = await newCtx(); const p = await c.newPage();
  await uiLogin(p, 'user456', 'Test1234!');
  let targetId = null;

  await tc('TC-CM-01', 'ความคิดเห็น', 'เพิ่มความคิดเห็นในเหตุการณ์',
    'เข้าสู่ระบบแล้วและเลือกเหตุการณ์ที่อนุมัติแล้ว',
    ['เลือกเหตุการณ์', 'พิมพ์ความคิดเห็น', 'กดปุ่มส่ง'],
    'ข้อความ "ทดสอบเพิ่มความคิดเห็น"',
    'ความคิดเห็นถูกบันทึกและแสดงในรายการทันที',
    async () => {
      targetId = await p.evaluate(() => { const l = RZ.api.getIncidents().filter(RZ.visible); return l.length ? l[0].id : null; });
      await p.evaluate(x => RZ.pick(x), targetId);
      await p.waitForTimeout(800);
      await p.fill('#cmtText', 'ทดสอบเพิ่มความคิดเห็น');
      await p.click('#cmtForm button[type=submit]');
      await p.waitForTimeout(1500);
      const t = await p.evaluate(() => document.querySelector('#cmt').innerText);
      return { ok: t.includes('ทดสอบเพิ่มความคิดเห็น'), actual: `รายการความคิดเห็นมีข้อความที่เพิ่ง้เพิ่ม = ${t.includes('ทดสอบเพิ่มความคิดเห็น')}` };
    });

  await tc('TC-CM-02', 'ความคิดเห็น', 'ส่งความคิดเห็นที่ยาวเกิน 500 ตัวอักษร',
    'เข้าสู่ระบบแล้วและเลือกเหตุการณ์',
    ['ส่ง POST ไป api/comments.php พร้อมข้อความยาว 600 ตัวอักษร'],
    'ข้อความยาว 600 ตัวอักษร',
    'เซิร์ฟเวอร์ปฏิเสธ พร้อมข้อความว่ายาวเกิน 500 ตัวอักษร',
    async () => {
      const lg = await apiLogin(p.request, 'user456', 'Test1234!');
      const r = await p.request.post(BASE + '/api/comments.php', { headers: { 'X-CSRF-Token': lg.csrf }, data: { report: targetId, text: 'ก'.repeat(600) } });
      const j = await r.json().catch(() => ({}));
      return { ok: r.status() >= 400 || j.ok === false, actual: `HTTP ${r.status()} · ${j.error || '-'}` };
    });

  await tc('TC-CM-03', 'ความคิดเห็น', 'ลบความคิดเห็นของผู้ใช้คนอื่น',
    'มีความคิดเห็นของ user456 อยู่ และเข้าสู่ระบบเป็น user123',
    ['เข้าสู่ระบบเป็น user123', 'ส่งคำสั่งลบความคิดเห็นของ user456'],
    'comment id ของ user456',
    'ระบบปฏิเสธ เพราะลบได้เฉพาะความคิดเห็นของตนเองหรือโดยผู้ดูแล (HTTP 403)',
    async () => {
      const cid = await p.evaluate(async () => {
        const r = await fetch('api/bootstrap.php');
        const j = await r.json();
        for (const rep of j.reports || []) {
          for (const cm of rep.comments || []) {
            if (cm.by === 'user456') return cm.cid || cm.id || null;
          }
        }
        return null;
      });
      const c2 = await browser.newContext(); const p2 = await c2.newPage();
      const lg = await apiLogin(p2.request, 'user123', 'Test1234!');
      const r = await p2.request.post(BASE + '/api/comments.php?action=delete&id=' + (cid || 0), { headers: { 'X-CSRF-Token': lg.csrf }, data: {} });
      const j = await r.json().catch(() => ({}));
      await c2.close();
      return { ok: r.status() >= 400 || j.ok === false, actual: `HTTP ${r.status()} · ${j.error || '-'}` };
    });
  await c.close();
}

clearThrottle();

/* ======================= 9. การแสดงผลบนมือถือ ======================= */
{
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await c.newPage();
  await uiLogin(p, 'user123', 'Test1234!');

  await tc('TC-UI-01', 'การแสดงผลบนมือถือ', 'แผนที่ต้องกว้างเต็มหน้าจอบนมือถือ',
    'เปิดเว็บด้วยหน้าจอกว้าง 390 พิกเซล',
    ['เข้าสู่ระบบ', 'วัดความกว้างของกรอบแผนที่'],
    'ความกว้างหน้าจอ 390px',
    'กรอบแผนที่กว้างใกล้เคียงความกว้างหน้าจอ ไม่ถูกบีบจนแคบ',
    async () => {
      await p.waitForTimeout(900);
      const w = await p.evaluate(() => Math.round(document.querySelector('#mapCanvas').getBoundingClientRect().width));
      return { ok: w > 300, actual: `กรอบแผนที่กว้าง ${w}px จากหน้าจอ 390px` };
    });

  await tc('TC-UI-02', 'การแสดงผลบนมือถือ', 'ปุ่มแจ้งเหตุการณ์ลอยต้องอยู่เฉพาะหน้าแผนที่',
    'เข้าสู่ระบบด้วยมือถือแล้ว',
    ['ดูปุ่มลอยที่หน้าแผนที่', 'เปลี่ยนไปหน้ารายงานของฉัน แล้วดูอีกครั้ง'],
    '-',
    'ปุ่มลอยแสดงเฉพาะหน้าแผนที่ และซ่อนในหน้าอื่น',
    async () => {
      await p.evaluate(() => RZ.go('map'));
      await p.waitForTimeout(500);
      const onMap = await p.evaluate(() => getComputedStyle(document.querySelector('.fab')).display !== 'none');
      await p.evaluate(() => RZ.go('reports'));
      await p.waitForTimeout(500);
      const onOther = await p.evaluate(() => getComputedStyle(document.querySelector('.fab')).display !== 'none');
      return { ok: onMap && !onOther, actual: `หน้าแผนที่: ${onMap ? 'แสดง' : 'ไม่แสดง'} · หน้าอื่น: ${onOther ? 'แสดง' : 'ไม่แสดง'}` };
    });

  await tc('TC-UI-03', 'การแสดงผลบนมือถือ', 'ปุ่มลอยต้องไม่ทับแถบเมนูล่าง',
    'อยู่ที่หน้าแผนที่บนมือถือ',
    ['วัดตำแหน่งปุ่มลอยและแถบเมนูล่าง', 'ตรวจว่าซ้อนทับกันหรือไม่'],
    '-',
    'ขอบล่างของปุ่มลอยต้องอยู่เหนือขอบบนของแถบเมนู',
    async () => {
      await p.evaluate(() => RZ.go('map'));
      await p.waitForTimeout(600);
      const s = await p.evaluate(() => {
        const f = document.querySelector('.fab').getBoundingClientRect();
        const t = document.querySelector('.tabbar').getBoundingClientRect();
        return { gap: Math.round(t.top - f.bottom) };
      });
      return { ok: s.gap >= 0, actual: `ระยะห่างระหว่างปุ่มลอยกับแถบเมนู = ${s.gap}px` };
    });

  await tc('TC-UI-04', 'การแสดงผลบนมือถือ', 'ปุ่มกรองต้องเลื่อนแนวนอนได้ ไม่ถูกบีบ',
    'อยู่ที่หน้าแผนที่บนมือถือ',
    ['วัดความกว้างของปุ่มกรองแต่ละปุ่ม'],
    '-',
    'ปุ่มกรองยังคงความกว้างพออ่านข้อความได้ (มากกว่า 50 พิกเซล)',
    async () => {
      await p.evaluate(() => RZ.go('map'));
      await p.waitForTimeout(500);
      const w = await p.evaluate(() => [...document.querySelectorAll('#sevFilter .chip')].map(c => Math.round(c.getBoundingClientRect().width)));
      return { ok: w.every(x => x > 50), actual: `ความกว้างปุ่มกรอง: ${w.join(', ')} px` };
    });
  await c.close();
}

await browser.close();

const pass = results.filter(r => r.status === 'PASS').length;
const manual = results.filter(r => r.status === 'MANUAL').length;
const fail = results.length - pass - manual;
console.log(`\nสรุป: ผ่าน ${pass} / ไม่ผ่าน ${fail} / ทดสอบด้วยมือ ${manual} / ทั้งหมด ${results.length}`);
writeFileSync('/home/claude/tc-results.json', JSON.stringify({ runAt: new Date().toISOString(), pass, fail, manual, total: results.length, results }, null, 2));
