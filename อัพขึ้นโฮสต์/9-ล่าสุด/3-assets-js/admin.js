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

RZ.renderAdReports = function() {
  if (!RZ.$("#adReports")) return;
  var tabs = [ {
    id: "all",
    name: "ทั้งหมด"
  }, {
    id: "pending",
    name: "รอตรวจสอบ"
  } ].concat(RZ.STAGES.filter(function(s) {
    return s.id !== "sent";
  }).map(function(s) {
    return {
      id: s.id,
      name: s.name
    };
  })).concat([ {
    id: "reject",
    name: RZ.REJECT.name
  } ]);
  RZ.$("#adFilter").innerHTML = tabs.map(function(t) {
    return '<button class="chip" data-adf="' + t.id + '" aria-pressed="' + (RZ.adFilter === t.id) + '">' + RZ.esc(t.name) + "</button>";
  }).join("");
  RZ.$$("#adFilter .chip").forEach(function(c) {
    c.addEventListener("click", function() {
      RZ.adFilter = c.getAttribute("data-adf");
      RZ.renderAdReports();
    });
  });
  var rows = RZ.api.getAllReports().filter(function(d) {
    if (RZ.adFilter === "all") return true;
    if (RZ.adFilter === "pending") return !d.approved && d.stage !== "reject";
    if (RZ.adFilter === "reject") return d.stage === "reject";
    return d.approved && d.stage === RZ.adFilter;
  });
  if (!rows.length) {
    RZ.$("#adReports").innerHTML = '<tbody><tr><td class="empty">ไม่มีรายงานในสถานะนี้</td></tr></tbody>';
    return;
  }
  var stageSelect = function(d) {
    if (d.stage === "reject") return '<span class="dim">—</span>';
    return '<select class="adsel" data-status="' + d.id + '">' + RZ.STAGES.map(function(s) {
      return '<option value="' + s.id + '"' + (d.stage === s.id ? " selected" : "") + ">" + RZ.esc(s.name) + "</option>";
    }).join("") + "</select>";
  };
  RZ.$("#adReports").innerHTML = "<thead><tr>" + "<th>เลขรายงาน</th><th>เรื่อง</th><th>ผู้แจ้ง</th>" + "<th>ระดับ</th><th>สถานะ</th><th>เปลี่ยนสถานะ</th><th></th>" + "</tr></thead><tbody>" + rows.map(function(d) {
    return "<tr>" + '<td class="mono nowrap">' + d.id + "</td>" + "<td><b>" + RZ.esc(d.title) + "</b><br>" + '<span class="dim">' + RZ.esc(d.loc) + " · " + RZ.esc(RZ.catName(d)) + "</span>" + (d.rejectReason ? '<br><span class="rej">เหตุผล: ' + RZ.esc(d.rejectReason) + "</span>" : "") + "</td>" + "<td>" + reporterName(d) + "</td>" + '<td><span class="pill ' + d.sev + '">' + RZ.esc(RZ.SEVT[d.sev]) + "</span></td>" + "<td>" + statusPill(d) + "</td>" + "<td>" + stageSelect(d) + "</td>" + '<td class="nowrap">' + (d.stage !== "reject" && d.stage !== "done" ? '<button class="btn sm" data-resolve="' + d.id + '">บันทึกผลการแก้ไข</button> ' : "") + '<button class="btn danger sm" data-del="' + d.id + '">ลบ</button></td>' + "</tr>";
  }).join("") + "</tbody>";
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
RZ.RESOLVE_PHOTO_CATS = [ "light", "walk", "flood", "traffic" ];

RZ.resolvePhotos = [];

RZ.openResolve = function(id) {
  var d = RZ.api.findIncident(id);
  if (!d) return;
  var needPhoto = RZ.RESOLVE_PHOTO_CATS.indexOf(d.cat) > -1;
  RZ.resolvePhotos = [];

  var box = RZ.$("#resolveBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "resolveBox";
    box.className = "lightbox";
    document.body.appendChild(box);
  }

  box.innerHTML = '<div class="resmodal">' + '<button type="button" class="lb-close" id="resClose" aria-label="ปิด">✕</button>' + '<h3 class="resttl">บันทึกผลการแก้ไข</h3>' + '<p class="ressub mono">' + RZ.esc(d.id) + " · " + RZ.esc(d.title) + "</p>" + '<div class="resform">' + "<label>สิ่งที่ดำเนินการ <b>จำเป็น</b></label>" + '<textarea id="resNote" maxlength="500" placeholder="เช่น เปลี่ยนหลอดไฟ LED 3 ดวง และเดินสายไฟใหม่ช่วงทางเดิน 20 เมตร"></textarea>' + "<label>หน่วยงานที่ดำเนินการ</label>" + '<input id="resUnit" type="text" maxlength="120" placeholder="เช่น งานอาคารสถานที่">' + "<label>รูปหลังแก้ไข " + (needPhoto ? '<b>จำเป็นอย่างน้อย 1 รูป</b>' : "(ไม่บังคับ)") + "</label>" + '<input id="resFile" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden>' + '<div class="resfiles" id="resDrop"><b>+ เพิ่มรูปภาพ</b><span>สูงสุด 3 รูป · JPG PNG หรือ WEBP</span></div>' + '<div class="resthumbs" id="resThumbs"></div>' + '<p class="fmerr" id="resErr" hidden></p>' + '<div class="rowbtns">' + '<button type="button" class="btn pri" id="resGo">ปิดเรื่อง</button>' + '<button type="button" class="btn" id="resCancel">ยกเลิก</button>' + "</div>" + "</div>" + "</div>";

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

    if (!note) return fail("กรุณากรอกสิ่งที่ดำเนินการไป");
    if (needPhoto && !RZ.resolvePhotos.length) {
      return fail("เหตุประเภทนี้ต้องแนบรูปหลังแก้ไขอย่างน้อย 1 รูป");
    }

    var btn = RZ.$("#resGo", box);
    btn.disabled = true;

    RZ.uploadAfterPhotos(id).then(function() {
      return RZ.api.resolveReport(id, note, unit);
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
