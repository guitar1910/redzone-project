window.RZ = window.RZ || {};

RZ.adFilter = "all";


function statusPill(d) {
  if (d.stage === "reject") return '<span class="pill high">' + RZ.REJECT.name + "</span>";
  if (!d.approved) return '<span class="pill mid">รอตรวจสอบ</span>';
  if (d.stage === "done") return '<span class="stpill fixed">✓ แก้ไขแล้ว</span>';
  return '<span class="pill st">' + RZ.esc(RZ.stageName(d.stage)) + "</span>";
}

function reporterName(d) {
  if (!d.reporter) return '<span class="anon">ไม่ระบุชื่อ</span>';
  return RZ.esc(d.reporter) + (d.anon ? ' <span class="anon">(ไม่แสดงต่อสาธารณะ)</span>' : "");
}

function askReason(question) {
  var r = window.prompt(question);
  if (r === null) return null;
  r = r.trim();
  return r === "" ? null : r;
}

RZ.renderAdQueue = function() {
  if (!RZ.$("#adQueue")) return;
  var all = RZ.api.getAllReports();
  var pending = RZ.api.getPendingReports();
  var count = function(st) {
    return all.filter(function(d) {
      return st === "reject" ? d.stage === "reject" : d.approved && d.stage === st;
    }).length;
  };
  RZ.$("#adStats").innerHTML = '<span class="sumchip warn">รอตรวจสอบ <b>' + pending.length + "</b></span>" + '<span class="sumchip">รับเรื่องแล้ว <b>' + count("ack") + "</b></span>" + '<span class="sumchip">กำลังดำเนินการ <b>' + count("prog") + "</b></span>" + '<span class="sumchip">แก้ไขแล้ว <b>' + count("done") + "</b></span>" + '<span class="sumchip">ไม่อนุมัติ <b>' + count("reject") + "</b></span>";
  RZ.setQueueBadge(pending.length);
  if (!pending.length) {
    RZ.$("#adQueue").innerHTML = '<div class="card empty">ไม่มีรายงานรอตรวจสอบ — เคลียร์คิวหมดแล้ว</div>';
    return;
  }
  RZ.$("#adQueue").innerHTML = pending.map(function(d) {
    return '<article class="card">' + '<div class="rcard"><div>' + "<h3>" + RZ.esc(d.title) + "</h3>" + '<div class="meta"><span class="mono">' + d.id + "</span> · " + RZ.esc(d.loc) + " · " + RZ.esc(RZ.catName(d)) + " · " + '<span class="mono">' + RZ.esc(d.time) + "</span></div>" + '<div class="meta">ผู้แจ้ง: ' + reporterName(d) + " · " + RZ.esc(RZ.distanceText(d.lat, d.lng)) + "</div>" + "</div>" + '<span class="pill ' + d.sev + '">' + RZ.esc(RZ.SEVT[d.sev]) + "</span></div>" + '<p class="note">' + RZ.esc(d.note) + "</p>" + RZ.adminPhotos(d) + '<div class="rowbtns">' + '<button class="btn pri" data-approve="' + d.id + '">อนุมัติ</button>' + '<button class="btn danger" data-reject="' + d.id + '">ไม่อนุมัติ</button>' + "</div>" + "</article>";
  }).join("");
  RZ.$$("#adQueue [data-shot]").forEach(function(im) {
    im.addEventListener("click", function() {
      var card = im.closest(".adshots");
      RZ.openLightbox(RZ.$$("img", card).map(function(x) {
        return x.getAttribute("src");
      }), RZ.$$("img", card).indexOf(im));
    });
  });
  RZ.$$("#adQueue [data-approve]").forEach(function(b) {
    b.addEventListener("click", function() {
      RZ.api.approveReport(b.getAttribute("data-approve"), "ตรวจสอบข้อมูลแล้ว");
      RZ.renderAdminAll();
      RZ.renderPins();
      RZ.renderFeed();
    });
  });
  RZ.$$("#adQueue [data-reject]").forEach(function(b) {
    b.addEventListener("click", function() {
      var reason = askReason("เหตุผลที่ไม่อนุมัติ (ผู้แจ้งจะเห็นข้อความนี้):");
      if (!reason) return;
      RZ.api.rejectReport(b.getAttribute("data-reject"), reason);
      RZ.renderAdminAll();
    });
  });
};

RZ.AD_PAGE = 10;
RZ.adQuery = "";
RZ.adShown = {};
RZ.adOpen = null;

RZ.adRowOpen = {};

RZ.AD_GROUPS = [ {
  id: "check",
  name: "ต้องตรวจสอบก่อน",
  tone: "a",
  test: function(d) {
    return !d.approved && d.stage !== "reject";
  }
}, {
  id: "work",
  name: "อนุมัติแล้ว รอปิดเรื่อง",
  tone: "b",
  test: function(d) {
    return d.approved && d.stage !== "done" && d.stage !== "reject";
  }
}, {
  id: "done",
  name: "จบแล้ว",
  tone: "c",
  fold: true,
  test: function(d) {
    return d.stage === "done";
  }
}, {
  id: "reject",
  name: "ไม่อนุมัติ",
  tone: "d",
  fold: true,
  test: function(d) {
    return d.stage === "reject";
  }
} ];

RZ.adFolded = function(id) {
  if (!RZ.adOpen) {
    RZ.adOpen = {};
    RZ.AD_GROUPS.forEach(function(g) {
      var v = null;
      try {
        v = localStorage.getItem("rz.ad." + g.id);
      } catch (e) {}
      RZ.adOpen[g.id] = v === null ? !g.fold : v === "1";
    });
  }
  return !RZ.adOpen[id];
};

RZ.adToggle = function(id) {
  RZ.adFolded(id);
  RZ.adOpen[id] = !RZ.adOpen[id];
  try {
    localStorage.setItem("rz.ad." + id, RZ.adOpen[id] ? "1" : "0");
  } catch (e) {}
  RZ.renderAdReports();
};

RZ.adMatch = function(d, q) {
  if (!q) return true;
  q = q.toLowerCase();
  return [ d.id, d.title, d.loc, RZ.catName(d), d.reporter || "", d.note || "" ].join(" ").toLowerCase().indexOf(q) >= 0;
};

RZ.adRow = function(d, gid) {
  var dot = d.stage === "done" ? "fixed" : d.stage === "reject" ? "rej" : d.sev;
  var right;
  if (gid === "check") {
    right = '<span class="pill ' + d.sev + '">' + RZ.esc(RZ.SEVT[d.sev]) + "</span>" + '<button class="btn pri sm" data-approve="' + d.id + '">อนุมัติ</button>' + '<button class="btn sm" data-reject="' + d.id + '">ไม่อนุมัติ</button>';
  } else if (gid === "work") {
    right = '<span class="pill ' + d.sev + '">' + RZ.esc(RZ.SEVT[d.sev]) + "</span>" + '<select class="adsel" data-status="' + d.id + '">' + RZ.STAGES.filter(function(s) {
      return s.id !== "done";
    }).map(function(s) {
      return '<option value="' + s.id + '"' + (d.stage === s.id ? " selected" : "") + ">" + RZ.esc(s.name) + "</option>";
    }).join("") + "</select>" + '<button class="btn pri sm" data-resolve="' + d.id + '">ปิดเรื่อง</button>';
  } else if (gid === "done") {
    right = '<span class="stpill fixed">✓ แก้ไขแล้ว</span>';
  } else {
    right = '<span class="pill high">' + RZ.REJECT.name + "</span>";
  }
  var meta = '<span class="mono">' + d.id + "</span> · " + reporterName(d) + " · " + '<span class="mono">' + RZ.esc(d.time) + "</span>" + (d.rejectReason ? ' · <span class="rej">' + RZ.esc(d.rejectReason) + "</span>" : "");
  var open = !!RZ.adRowOpen[d.id];
  return '<div class="adrow' + (open ? " open" : "") + '" data-row="' + d.id + '" role="button" tabindex="0" aria-expanded="' + open + '">' + '<span class="adtog" aria-hidden="true">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>' + "</span>" + '<span class="addot ' + dot + '"></span>' + '<span class="adt"><b>' + RZ.esc(d.title) + "</b><span>" + meta + "</span></span>" + '<span class="adact">' + right + '<button class="btn ghost sm" data-del="' + d.id + '" title="ลบรายงาน" aria-label="ลบรายงาน">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke-linecap="round" stroke-linejoin="round"/></svg>' + "</button></span>" + "</div>" + (open ? RZ.adDetail(d) : "");
};

RZ.adDetail = function(d) {
  var note = (d.note || "").trim();
  var kv = '<dl class="addl">' + "<dt>ตำแหน่ง</dt><dd>" + RZ.esc(d.loc) + (RZ.locGap ? RZ.locGap(d) : "") + "</dd>" + "<dt>ประเภท</dt><dd>" + RZ.esc(RZ.catName(d)) + "</dd>" + '<dt>พิกัด</dt><dd class="mono">' + (+d.lat).toFixed(5) + ", " + (+d.lng).toFixed(5) + "</dd>" + "<dt>ยืนยันโดย</dt><dd>" + d.conf + " คน</dd>" + "</dl>";
  var body = '<p class="notelbl">รายละเอียดจากผู้แจ้ง</p>' + '<p class="note">' + (note ? RZ.esc(note) : "— ไม่ได้กรอกรายละเอียด —") + "</p>";
  var ph = d.photos || [];
  var pics = ph.length ? '<p class="notelbl gal-h">รูปจากผู้แจ้ง ' + ph.length + " รูป</p>" + '<div class="adshots">' + ph.map(function(src, i) {
    return '<img src="' + RZ.esc(src) + '" alt="รูปที่ ' + (i + 1) + '" data-shot="' + RZ.esc(d.id) + '|' + i + '" loading="lazy">';
  }).join("") + "</div>" : '<p class="meta nophoto">ผู้แจ้งไม่ได้แนบรูป</p>';
  var after = d.afterPhotos || [];
  var fixed = "";
  if (RZ.isFixed(d) && d.resolveNote) {
    fixed = '<p class="notelbl gal-h after">ดำเนินการแล้ว</p>' + '<p class="note">' + RZ.esc(d.resolveNote) + "</p>" + (after.length ? '<div class="adshots">' + after.map(function(src, i) {
      return '<img src="' + RZ.esc(src) + '" alt="รูปหลังแก้ไขที่ ' + (i + 1) + '" data-after="' + RZ.esc(d.id) + '|' + i + '" loading="lazy">';
    }).join("") + "</div>" : Array.isArray(d.afterPhotos) ? '<p class="meta nophoto">ไม่มีรูปหลังแก้ไข</p>' : "");
  }
  return '<div class="addet">' + kv + body + pics + fixed + "</div>";
};

RZ.renderAdReports = function() {
  var box = RZ.$("#adReports");
  if (!box) return;
  var q = RZ.adQuery.trim();
  var all = RZ.api.getAllReports().filter(function(d) {
    return RZ.adMatch(d, q);
  });
  if (!all.length) {
    box.innerHTML = '<div class="card empty">' + (q ? "ไม่พบรายงานที่ตรงกับคำค้น" : "ยังไม่มีรายงานในระบบ") + "</div>";
    return;
  }
  box.innerHTML = RZ.AD_GROUPS.map(function(g) {
    var list = all.filter(g.test);
    if (!list.length) return "";
    var folded = q ? false : RZ.adFolded(g.id);
    var shown = Math.min(RZ.adShown[g.id] || RZ.AD_PAGE, list.length);
    var left = list.length - shown;
    return '<section class="adgrp">' + '<button class="adgh" type="button" data-fold="' + g.id + '" aria-expanded="' + !folded + '">' + '<span class="adtag ' + g.tone + '"></span>' + "<b>" + RZ.esc(g.name) + "</b>" + '<span class="adn mono">' + list.length + " เรื่อง</span>" + '<svg class="adchev' + (folded ? " f" : "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>' + "</button>" + (folded ? "" : '<div class="adgb">' + list.slice(0, shown).map(function(d) {
      return RZ.adRow(d, g.id);
    }).join("") + (left > 0 ? '<button class="admore" type="button" data-more="' + g.id + '">แสดงเพิ่มอีก ' + Math.min(left, RZ.AD_PAGE) + " เรื่อง (เหลือ " + left + ")</button>" : "") + "</div>") + "</section>";
  }).join("");
  RZ.$$("#adReports [data-fold]").forEach(function(b) {
    b.addEventListener("click", function() {
      RZ.adToggle(b.getAttribute("data-fold"));
    });
  });
  RZ.$$("#adReports [data-row]").forEach(function(row) {
    var toggle = function(e) {
      if (e.target.closest && e.target.closest(".adact")) return;
      var id = row.getAttribute("data-row");
      RZ.adRowOpen[id] = !RZ.adRowOpen[id];
      RZ.renderAdReports();
    };
    row.addEventListener("click", toggle);
    row.addEventListener("keydown", function(e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle(e);
      }
    });
  });
  RZ.$$("#adReports .addet .adshots").forEach(function(box) {
    var imgs = RZ.$$("img", box);
    imgs.forEach(function(im, i) {
      im.addEventListener("click", function() {
        RZ.openLightbox(imgs.map(function(x) {
          return x.getAttribute("src");
        }), i);
      });
    });
  });
  RZ.$$("#adReports [data-more]").forEach(function(b) {
    b.addEventListener("click", function() {
      var g = b.getAttribute("data-more");
      RZ.adShown[g] = (RZ.adShown[g] || RZ.AD_PAGE) + RZ.AD_PAGE;
      RZ.renderAdReports();
    });
  });
  RZ.$$("#adReports [data-approve]").forEach(function(b) {
    b.addEventListener("click", function() {
      RZ.api.approveReport(b.getAttribute("data-approve"), "ตรวจสอบข้อมูลแล้ว");
      RZ.renderAdminAll();
      RZ.renderPins();
      RZ.renderFeed();
      RZ.renderMine();
    });
  });
  RZ.$$("#adReports [data-reject]").forEach(function(b) {
    b.addEventListener("click", function() {
      var reason = askReason("เหตุผลที่ไม่อนุมัติ (ผู้แจ้งจะเห็นข้อความนี้):");
      if (!reason) return;
      RZ.api.rejectReport(b.getAttribute("data-reject"), reason);
      RZ.renderAdminAll();
      RZ.renderPins();
      RZ.renderFeed();
      RZ.renderMine();
    });
  });
  RZ.$$("#adReports [data-status]").forEach(function(sel) {
    sel.addEventListener("change", function() {
      RZ.api.setStatus(sel.getAttribute("data-status"), sel.value);
      RZ.renderAdminAll();
      RZ.renderPins();
      RZ.renderFeed();
      RZ.renderMine();
    });
  });
  RZ.$$("#adReports [data-resolve]").forEach(function(b) {
    b.addEventListener("click", function() {
      RZ.openResolve(b.getAttribute("data-resolve"));
    });
  });
  RZ.$$("#adReports [data-del]").forEach(function(b) {
    b.addEventListener("click", function() {
      var id = b.getAttribute("data-del");
      var reason = askReason("เหตุผลที่ลบรายงาน " + id + " :");
      if (!reason) return;
      RZ.api.deleteReport(id, reason);
      if (RZ.state.sel === id) RZ.state.sel = null;
      RZ.renderAdminAll();
      RZ.renderPins();
      RZ.renderFeed();
      RZ.renderMine();
    });
  });
};

RZ.initAdSearch = function() {
  var i = RZ.$("#adSearch");
  if (!i) return;
  i.addEventListener("input", function() {
    RZ.adQuery = i.value;
    RZ.adShown = {};
    RZ.renderAdReports();
  });
};

RZ.renderAdComments = function() {
  if (!RZ.$("#adComments")) return;
  var rows = RZ.api.getAllComments();
  if (!rows.length) {
    RZ.$("#adComments").innerHTML = '<tbody><tr><td class="empty">ยังไม่มีความคิดเห็นในระบบ</td></tr></tbody>';
    return;
  }
  RZ.$("#adComments").innerHTML = "<thead><tr><th>ผู้เขียน</th><th>ข้อความ</th><th>อยู่ใต้รายงาน</th><th>เวลา</th><th></th></tr></thead><tbody>" + rows.map(function(c) {
    return '<tr' + (c.hidden ? ' class="rowoff"' : "") + ">" + "<td><b>" + RZ.esc(c.by) + "</b></td>" + "<td>" + RZ.esc(c.text) + (c.hidden ? '<br><span class="rej">ถูกซ่อนโดยผู้ดูแลระบบ</span>' : "") + "</td>" + '<td><span class="mono">' + c.reportId + "</span><br>" + '<span class="dim">' + RZ.esc(c.reportTitle) + "</span></td>" + '<td class="mono nowrap">' + RZ.esc(c.time) + "</td>" + '<td class="nowrap">' + (c.hidden ? '<span class="dim">ซ่อนแล้ว</span>' : '<button class="btn danger sm" data-hide="' + c.reportId + '|' + c.index + '">ซ่อน</button>') + "</td>" + "</tr>";
  }).join("") + "</tbody>";
  RZ.$$("#adComments [data-hide]").forEach(function(b) {
    b.addEventListener("click", function() {
      var parts = b.getAttribute("data-hide").split("|");
      var reason = askReason("เหตุผลที่ซ่อนความคิดเห็นนี้:");
      if (!reason) return;
      RZ.api.hideComment(parts[0], parseInt(parts[1], 10), reason);
      RZ.renderAdminAll();
      if (RZ.state.sel) RZ.renderComments(RZ.state.sel);
      RZ.renderFeed();
    });
  });
};

RZ.renderAdUsers = function() {
  if (!RZ.$("#adUsers")) return;
  var rows = RZ.api.getUsers();
  RZ.$("#adUsers").innerHTML = "<thead><tr><th>ชื่อ</th><th>อีเมล</th><th>บทบาท</th><th>รายงานที่ส่ง</th><th>สถานะบัญชี</th><th></th></tr></thead><tbody>" + rows.map(function(u) {
    var isMe = u.id === RZ.session.userId;
    return '<tr' + (u.active ? "" : ' class="rowoff"') + ">" + "<td><b>" + RZ.esc(u.name) + "</b>" + (isMe ? ' <span class="lockpill">คุณ</span>' : "") + '<br><span class="dim mono">' + RZ.esc(u.code) + "</span></td>" + '<td class="mono">' + RZ.esc(u.email) + "</td>" + "<td>" + (u.role === "admin" ? '<span class="pill st">ผู้ดูแลระบบ</span>' : '<span class="dim">ผู้ใช้ทั่วไป</span>') + "</td>" + '<td class="mono">' + u.reports + "</td>" + "<td>" + (u.active ? '<span class="pill low">ใช้งานได้</span>' : '<span class="pill high">ถูกระงับ</span>' + (u.banReason ? '<br><span class="rej">' + RZ.esc(u.banReason) + "</span>" : "")) + "</td>" + '<td class="nowrap">' + (isMe ? '<span class="dim">—</span>' : u.active ? '<button class="btn danger sm" data-ban="' + u.id + '">ระงับบัญชี</button>' : '<button class="btn sm" data-unban="' + u.id + '">ปลดระงับ</button>') + "</td>" + "</tr>";
  }).join("") + "</tbody>";
  RZ.$$("#adUsers [data-ban]").forEach(function(b) {
    b.addEventListener("click", function() {
      var reason = askReason("เหตุผลที่ระงับบัญชีนี้ (ผู้ใช้จะเข้าสู่ระบบไม่ได้):");
      if (!reason) return;
      RZ.api.setUserActive(parseInt(b.getAttribute("data-ban"), 10), false, reason);
      RZ.renderAdminAll();
    });
  });
  RZ.$$("#adUsers [data-unban]").forEach(function(b) {
    b.addEventListener("click", function() {
      RZ.api.setUserActive(parseInt(b.getAttribute("data-unban"), 10), true, "ตรวจสอบแล้ว ปลดระงับ");
      RZ.renderAdminAll();
    });
  });
};

RZ.renderAdAudit = function() {
  if (!RZ.$("#adAudit")) return;
  var rows = RZ.api.getAudit();
  if (!rows.length) {
    RZ.$("#adAudit").innerHTML = '<div class="empty">ยังไม่มีประวัติ</div>';
    return;
  }
  RZ.$("#adAudit").innerHTML = rows.map(function(a) {
    return '<div class="alert">' + '<span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-linecap="round" stroke-linejoin="round">' + RZ.ICONS.status + "</svg></span>" + "<div><b>" + RZ.esc(RZ.AUDIT_LABEL[a.action] || a.action) + " · " + '<span class="mono">' + RZ.esc(a.target) + "</span></b>" + (a.reason ? "<p>เหตุผล: " + RZ.esc(a.reason) + "</p>" : "") + '<div class="t">' + RZ.esc(a.admin) + " · " + RZ.esc(a.time) + "</div>" + "</div></div>";
  }).join("");
};

RZ.setQueueBadge = function(n) {
  var el = RZ.$("#badgeQueue");
  if (!el) return;
  if (n > 0) {
    el.textContent = n;
    el.style.display = "";
  } else {
    el.style.display = "none";
  }
};

RZ.renderAdminAll = function() {
  RZ.renderAdQueue();
  RZ.renderAdReports();
  RZ.renderAdComments();
  RZ.renderAdUsers();
  RZ.renderAdAudit();
};

RZ.adminPhotos = function(d) {
  var ph = d.photos || [];
  if (!ph.length) return '<p class="meta nophoto">ไม่มีรูปแนบ</p>';
  return '<p class="notelbl gal-h">รูปแนบ ' + ph.length + " รูป — กดดูก่อนอนุมัติ</p>" + '<div class="adshots">' + ph.map(function(src, i) {
    return '<img src="' + RZ.esc(src) + '" alt="รูปที่ ' + (i + 1) + '" data-shot="' + RZ.esc(d.id) + '|' + i + '" loading="lazy">';
  }).join("") + "</div>";
};
RZ.resolvePhotos = [];

RZ.openResolve = function(id) {
  var d = RZ.api.findIncident(id);
  if (!d) return;
  RZ.resolvePhotos = [];

  var box = RZ.$("#resolveBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "resolveBox";
    box.className = "lightbox";
    document.body.appendChild(box);
  }

  box.innerHTML = '<div class="resmodal">' + '<button type="button" class="lb-close" id="resClose" aria-label="ปิด">✕</button>' + '<h3 class="resttl">บันทึกผลการแก้ไข</h3>' + '<p class="ressub mono">' + RZ.esc(d.id) + " · " + RZ.esc(d.title) + "</p>" + '<div class="resform">' + "<label>ดำเนินการแล้ว <b>จำเป็น</b></label>" + '<textarea id="resNote" maxlength="500" placeholder="เช่น เปลี่ยนหลอดไฟ LED 3 ดวง และเดินสายไฟใหม่ช่วงทางเดิน 20 เมตร"></textarea>' + "<label>หน่วยงานที่ดำเนินการ</label>" + '<input id="resUnit" type="text" maxlength="120" placeholder="เช่น งานอาคารสถานที่">' + "<label>รูปหลังแก้ไข <b>จำเป็นอย่างน้อย 1 รูป</b></label>" + '<input id="resFile" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden>' + '<div class="resfiles" id="resDrop"><b>+ เพิ่มรูปภาพ</b><span>สูงสุด 3 รูป · JPG PNG หรือ WEBP</span></div>' + '<div class="resthumbs" id="resThumbs"></div>' + '<label class="rescheck"><input type="checkbox" id="resNoPhoto"><span>ไม่มีรูปหลังแก้ไข</span></label>' + '<p class="fmerr" id="resErr" hidden></p>' + '<div class="rowbtns">' + '<button type="button" class="btn pri" id="resGo">ปิดเรื่อง</button>' + '<button type="button" class="btn" id="resCancel">ยกเลิก</button>' + "</div>" + "</div>" + "</div>";

  box.classList.add("on");

  var close = function() {
    box.classList.remove("on");
    RZ.resolvePhotos = [];
  };

  RZ.$("#resClose", box).addEventListener("click", close);
  RZ.$("#resCancel", box).addEventListener("click", close);
  box.onclick = function(e) {
    if (e.target === box) close();
  };

  var input = RZ.$("#resFile", box);
  RZ.$("#resDrop", box).addEventListener("click", function() {
    input.click();
  });

  input.addEventListener("change", function() {
    var files = Array.prototype.slice.call(input.files || []);
    input.value = "";
    var room = 3 - RZ.resolvePhotos.length;
    files.slice(0, Math.max(room, 0)).reduce(function(chain, f) {
      return chain.then(function() {
        return RZ.shrinkImage(f).then(function(p) {
          RZ.resolvePhotos.push(p);
        });
      });
    }, Promise.resolve()).then(function() {
      RZ.$("#resThumbs", box).innerHTML = RZ.resolvePhotos.map(function(p) {
        return '<img src="' + p.url + '" alt="">';
      }).join("");
    });
  });

  RZ.$("#resGo", box).addEventListener("click", function() {
    var note = RZ.$("#resNote", box).value.trim();
    var unit = RZ.$("#resUnit", box).value.trim();
    var err = RZ.$("#resErr", box);
    var fail = function(msg) {
      err.textContent = msg;
      err.hidden = false;
    };
    err.hidden = true;

    if (!note) return fail("กรุณากรอกว่าดำเนินการอะไรไปบ้าง");
    var skip = RZ.$("#resNoPhoto", box).checked;
    if (!RZ.resolvePhotos.length && !skip) {
      return fail("ต้องแนบรูปหลังแก้ไขอย่างน้อย 1 รูป หรือติ๊กช่องไม่มีรูปหลังแก้ไขก่อน");
    }

    var btn = RZ.$("#resGo", box);
    btn.disabled = true;

    RZ.uploadAfterPhotos(id).then(function() {
      return RZ.api.resolveReport(id, note, unit, skip);
    }).then(function() {
      close();
      RZ.renderAdminAll();
      RZ.renderPins();
      RZ.renderFeed();
      RZ.renderMine();
      if (RZ.state.sel === id) RZ.renderDetail(id);
    }).catch(function(e) {
      fail("บันทึกไม่สำเร็จ: " + e.message);
    }).then(function() {
      btn.disabled = false;
    });
  });

  RZ.$("#resNote", box).focus();
};

RZ.uploadAfterPhotos = function(code) {
  if (!RZ.LIVE || !RZ.resolvePhotos.length) return Promise.resolve();
  var fd = new FormData();
  fd.append("report", code);
  fd.append("kind", "after");
  RZ.resolvePhotos.forEach(function(p, i) {
    fd.append("photos[]", p.blob, "after" + (i + 1) + ".jpg");
  });
  return fetch("api/upload.php", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "X-CSRF-Token": RZ.csrf
    },
    body: fd
  }).then(function(r) {
    return r.json().catch(function() {
      throw new Error("เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง");
    }).then(function(j) {
      if (!r.ok) throw new Error(j.error || "อัปโหลดรูปไม่สำเร็จ");
      return j;
    });
  });
};
