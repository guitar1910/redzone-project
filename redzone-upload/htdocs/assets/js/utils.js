window.RZ = window.RZ || {};

RZ.$ = function(sel, root) {
  return (root || document).querySelector(sel);
};

RZ.$$ = function(sel, root) {
  return Array.prototype.slice.call((root || document).querySelectorAll(sel));
};

RZ.esc = function(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c];
  });
};

RZ.catOf = function(id) {
  for (var i = 0; i < RZ.CATS.length; i++) {
    if (RZ.CATS[i].id === id) return RZ.CATS[i];
  }
  return RZ.CATS[0];
};

RZ.stageIdx = function(stageId) {
  for (var i = 0; i < RZ.STAGES.length; i++) {
    if (RZ.STAGES[i].id === stageId) return i;
  }
  return 0;
};

RZ.catName = function(d) {
  if (d.cat === "other" && d.catOther) return d.catOther;
  return RZ.catOf(d.cat).name;
};

RZ.locOf = function(name) {
  for (var i = 0; i < RZ.LOCATIONS.length; i++) {
    if (RZ.LOCATIONS[i].name === name) return RZ.LOCATIONS[i];
  }
  return RZ.LOCATIONS[0];
};

RZ.stageName = function(stageId) {
  if (stageId === RZ.REJECT.id) return RZ.REJECT.name;
  return RZ.STAGES[RZ.stageIdx(stageId)].name;
};

RZ.isAdmin = function() {
  return !!RZ.session && RZ.session.role === "admin";
};

RZ.role = function() {
  return RZ.session ? RZ.session.role : "";
};

RZ.nextReportNo = function() {
  var max = 0;
  RZ.DATA.forEach(function(d) {
    var n = parseInt(String(d.id).split("-").pop(), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return max + 1;
};

RZ.storeGet = function(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return fallback;
};

RZ.storeSet = function(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("เก็บข้อมูลลง localStorage ไม่ได้ — ข้อมูลจะอยู่แค่จนปิดหน้านี้");
  }
};

RZ.THAI_MONTHS = [ "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค." ];

RZ.thaiTime = function(isoLocal) {
  var d = isoLocal ? new Date(isoLocal) : new Date;
  if (isNaN(d.getTime())) d = new Date;
  var hh = ("0" + d.getHours()).slice(-2);
  var mm = ("0" + d.getMinutes()).slice(-2);
  return d.getDate() + " " + RZ.THAI_MONTHS[d.getMonth()] + " " + (d.getFullYear() + 543) + " " + hh + ":" + mm;
};

RZ.nowLocalInput = function() {
  var d = new Date;
  var pad = function(n) {
    return ("0" + n).slice(-2);
  };
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
};
