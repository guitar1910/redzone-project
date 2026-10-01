window.RZ = window.RZ || {};

RZ.DATA_VERSION = 4;

RZ.state = {
  sev: "all",
  q: "",
  sel: null
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
  code: "STAFF-001",
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
  radius: 1e4,
  label: "รัศมี 10 กม. รอบ มจพ."
};

RZ.LOCATIONS = [ {
  name: "ทางเดินริมคลองบางซื่อ",
  lat: 13.8183,
  lng: 100.5148,
  inCampus: true
}, {
  name: "หน้าหอสมุดกลาง",
  lat: 13.8199,
  lng: 100.5133,
  inCampus: true
}, {
  name: "ลานจอดรถอาคาร 62",
  lat: 13.8191,
  lng: 100.5157,
  inCampus: true
}, {
  name: "โรงอาหารกลาง",
  lat: 13.8194,
  lng: 100.5128,
  inCampus: true
}, {
  name: "อาคารนวมินทรราชินี",
  lat: 13.8203,
  lng: 100.5142,
  inCampus: true
}, {
  name: "หอพักนักศึกษา",
  lat: 13.8189,
  lng: 100.5139,
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
  name: "สนามกีฬา",
  lat: 13.8186,
  lng: 100.5163,
  inCampus: true
}, {
  name: "สถานี MRT บางซ่อน",
  lat: 13.8226,
  lng: 100.5279,
  inCampus: false
}, {
  name: "ตลาดบางซ่อน",
  lat: 13.8248,
  lng: 100.5252,
  inCampus: false
}, {
  name: "ใต้สะพานพระราม 7",
  lat: 13.8118,
  lng: 100.506,
  inCampus: false
}, {
  name: "สถานี MRT เตาปูน",
  lat: 13.8073,
  lng: 100.5297,
  inCampus: false
}, {
  name: "สถานีกลางกรุงเทพอภิวัฒน์",
  lat: 13.802,
  lng: 100.539,
  inCampus: false
}, {
  name: "สวนวชิรเบญจทัศ (สวนรถไฟ)",
  lat: 13.813,
  lng: 100.551,
  inCampus: false
}, {
  name: "ย่านหอพักซอยวงศ์สว่าง 11",
  lat: 13.8235,
  lng: 100.5175,
  inCampus: false
}, {
  name: "ท่าน้ำนนทบุรี",
  lat: 13.857,
  lng: 100.49,
  inCampus: false
}, {
  name: "อนุสาวรีย์ชัยสมรภูมิ",
  lat: 13.765,
  lng: 100.538,
  inCampus: false
} ];

RZ.ZONES = [ {
  name: "ทางเดินริมคลองบางซื่อ",
  level: "high",
  lat: 13.8183,
  lng: 100.5148,
  radius: 95,
  count: 18
}, {
  name: "ลานจอดรถอาคาร 62",
  level: "mid",
  lat: 13.8191,
  lng: 100.5157,
  radius: 70,
  count: 9
}, {
  name: "ประตูวงศ์สว่าง",
  level: "mid",
  lat: 13.8211,
  lng: 100.5127,
  radius: 60,
  count: 6
}, {
  name: "ทางเท้าใต้สะพานพระราม 7",
  level: "high",
  lat: 13.8118,
  lng: 100.506,
  radius: 180,
  count: 14
}, {
  name: "รอบสถานี MRT บางซ่อน",
  level: "mid",
  lat: 13.8226,
  lng: 100.5279,
  radius: 150,
  count: 8
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
  name: "เสร็จสมบูรณ์"
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
