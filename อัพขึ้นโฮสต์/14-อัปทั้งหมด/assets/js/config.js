window.RZ = window.RZ || {};

RZ.DATA_VERSION = 4;

RZ.state = {
  sev: "all",
  q: "",
  sel: null,
  place: null,
  hideFixed: false
};

RZ.ROLES = {
  user: "ผู้ใช้ทั่วไป",
  admin: "ผู้ดูแลระบบ"
};

RZ.SEED_ADMIN = {
  userId: 2,
  username: "admin",
  password: "demo1234",
  name: "admin",
  code: "admin001",
  email: "admin@example.com",
  role: "admin"
};

RZ.SIGNUP_RULES = {
  usernameMin: 4,
  usernameMax: 20,
  usernamePattern: /^[a-z0-9._]+$/,
  codeMin: 8,
  codeMax: 13,
  passwordMin: 8,
  mailDomain: "@email.kmutnb.ac.th"
};

RZ.session = null;

RZ.me = "";

RZ.CATS = [ {
  id: "light",
  name: "ไฟส่องสว่างชำรุด",
  d: "M12 3v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M17.7 6.3l1.4-1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
}, {
  id: "walk",
  name: "ทางเดิน/พื้นชำรุด",
  d: "M3 18h18M6 18l3-9M15 18l3-9M9 9h6"
}, {
  id: "harass",
  name: "การคุกคาม/ตามรบกวน",
  d: "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21a8 8 0 0 1 12-6.9M18 16v3M18 21.5v.01"
}, {
  id: "theft",
  name: "ลักทรัพย์/ทรัพย์สินเสียหาย",
  d: "M4 8h16v12H4zM9 8V6a3 3 0 0 1 6 0v2M12 13v3"
}, {
  id: "traffic",
  name: "อุบัติเหตุจราจร",
  d: "M5 17h14M7 17V9l2-4h6l2 4v8M7 13h10M8 20v-3M16 20v-3"
}, {
  id: "flood",
  name: "น้ำท่วมขัง/สิ่งกีดขวาง",
  d: "M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0M12 3v6"
}, {
  id: "other",
  name: "อื่น ๆ (ระบุเอง)",
  d: "M12 17v.01M12 13.5a2.5 2.5 0 1 0-2.5-3.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  free: true
} ];

RZ.SCOPE = {
  center: [ 13.8197, 100.5145 ],
  radius: 4e3,
  label: "รัศมี 4 กม. รอบ มจพ."
};

RZ.LOCATIONS = [ {
  name: "หน้าหอสมุดกลาง",
  lat: 13.81974,
  lng: 100.51422,
  inCampus: true
}, {
  name: "อาคารนวมินทรราชินี",
  lat: 13.81981,
  lng: 100.51414,
  inCampus: true
}, {
  name: "หอพักนักศึกษา",
  lat: 13.8189,
  lng: 100.5139,
  inCampus: true
}, {
  name: "ทางเดินริมคลองบางซื่อ",
  lat: 13.8183,
  lng: 100.5148,
  inCampus: true
}, {
  name: "โรงอาหารกลาง",
  lat: 13.8194,
  lng: 100.5128,
  inCampus: true
}, {
  name: "สนามกีฬา",
  lat: 13.8186,
  lng: 100.5163,
  inCampus: true
}, {
  name: "ลานจอดรถอาคาร 62",
  lat: 13.82054,
  lng: 100.51653,
  inCampus: true
}, {
  name: "ประตูวงศ์สว่าง",
  lat: 13.8211,
  lng: 100.5127,
  inCampus: true
}, {
  name: "ประตูพิบูลสงคราม",
  lat: 13.821,
  lng: 100.5165,
  inCampus: true
}, {
  name: "ถนนประชาราษฎร์ สาย 1",
  lat: 13.8158,
  lng: 100.51486,
  inCampus: false
}, {
  name: "สะพานพระราม 7",
  lat: 13.81284,
  lng: 100.51374,
  inCampus: false
}, {
  name: "วัดเขมาภิรตาราม (ฝั่งนนทบุรี)",
  lat: 13.82149,
  lng: 100.50324,
  inCampus: false
}, {
  name: "สถานี MRT บางโพ",
  lat: 13.80646,
  lng: 100.52101,
  inCampus: false
}, {
  name: "สถานี MRT วงศ์สว่าง",
  lat: 13.82986,
  lng: 100.52651,
  inCampus: false
}, {
  name: "ตลาดบางซ่อน",
  lat: 13.82177,
  lng: 100.53187,
  inCampus: false
}, {
  name: "วัดจันทร์ (บางกรวย)",
  lat: 13.8115,
  lng: 100.49706,
  inCampus: false
}, {
  name: "สถานี MRT บางซ่อน",
  lat: 13.82213,
  lng: 100.5342,
  inCampus: false
}, {
  name: "สถานี MRT เตาปูน",
  lat: 13.80603,
  lng: 100.53113,
  inCampus: false
}, {
  name: "วัดสังฆทาน (ฝั่งนนทบุรี)",
  lat: 13.8255,
  lng: 100.49161,
  inCampus: false
}, {
  name: "สำนักงานเขตบางซื่อ",
  lat: 13.80967,
  lng: 100.53737,
  inCampus: false
}, {
  name: "ย่านบางไผ่ (ฝั่งนนทบุรี)",
  lat: 13.84463,
  lng: 100.51212,
  inCampus: false
}, {
  name: "วัดสามัคคีสุทธาวาส (บางพลัด)",
  lat: 13.79681,
  lng: 100.50224,
  inCampus: false
}, {
  name: "โรงพยาบาลเกษมราษฎร์ ประชาชื่น",
  lat: 13.83183,
  lng: 100.53865,
  inCampus: false
}, {
  name: "วัดใหม่ทองเสน",
  lat: 13.79418,
  lng: 100.52197,
  inCampus: false
}, {
  name: "ตลาดนนทบุรี (ท่าน้ำนนท์)",
  lat: 13.84242,
  lng: 100.49501,
  inCampus: false
}, {
  name: "วัดอาวุธวิกสิตาราม (บางพลัด)",
  lat: 13.79018,
  lng: 100.50541,
  inCampus: false
}, {
  name: "สถานีขนส่งหมอชิต (จตุจักร)",
  lat: 13.81236,
  lng: 100.54776,
  inCampus: false
}, {
  name: "วัดเพลง (บางพลัด)",
  lat: 13.7951,
  lng: 100.4881,
  inCampus: false
}, {
  name: "ย่านบางสีทอง (บางกรวย)",
  lat: 13.8166,
  lng: 100.4779,
  inCampus: false
}, {
  name: "ย่านตลาดขวัญ (นนทบุรี)",
  lat: 13.8529,
  lng: 100.5283,
  inCampus: false
}, {
  name: "ย่านบางศรีเมือง (นนทบุรี)",
  lat: 13.8361,
  lng: 100.4817,
  inCampus: false
}, {
  name: "ย่านประดิพัทธ์ (พญาไท)",
  lat: 13.7907,
  lng: 100.5363,
  inCampus: false
} ];

RZ.ZONES = [ {
  name: "ทางเดินริมคลองบางซื่อ",
  lat: 13.8183,
  lng: 100.5148,
  radius: 95
}, {
  name: "ลานจอดรถอาคาร 62",
  lat: 13.82054,
  lng: 100.51653,
  radius: 70
}, {
  name: "ประตูวงศ์สว่าง",
  lat: 13.8211,
  lng: 100.5127,
  radius: 60
}, {
  name: "ทางเท้าใต้สะพานพระราม 7",
  lat: 13.81284,
  lng: 100.51374,
  radius: 180
}, {
  name: "รอบสถานี MRT บางซ่อน",
  lat: 13.82213,
  lng: 100.5342,
  radius: 150
} ];

RZ.SEVT = {
  high: "สูง",
  mid: "กลาง",
  low: "ต่ำ"
};

RZ.STAGES = [ {
  id: "sent",
  name: "ส่งแล้ว"
}, {
  id: "ack",
  name: "รับเรื่องแล้ว"
}, {
  id: "prog",
  name: "กำลังดำเนินการ"
}, {
  id: "done",
  name: "ได้รับการแก้ไข"
} ];

RZ.REJECT = {
  id: "reject",
  name: "ไม่อนุมัติ"
};

RZ.ICONS = {
  status: '<path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/>',
  zone: '<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
  new: '<path d="M18 8a6 6 0 1 0-12 0c0 6-2 8-2 8h16s-2-2-2-8Z"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>',
  done: '<path d="m5 13 4 4L19 7"/>'
};
