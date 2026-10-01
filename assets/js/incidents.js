window.RZ = window.RZ || {};

RZ.PLACE_NONE = "ไม่ระบุสถานที่";

RZ.renderMapSub = function() {
  var el = RZ.$("#mapSub");
  if (!el) return;
  var list = RZ.api.getIncidents();
  var open = list.filter(function(d) {
    return !RZ.isFixed(d);
  }).length;
  var latest = "";
  list.forEach(function(d) {
    if (!latest || RZ.timeKey(d.time) > RZ.timeKey(latest)) latest = d.time;
  });
  el.textContent = (open ? "เหตุการณ์ที่ยังไม่ปิด " + open + " รายการ" : "ไม่มีเหตุการณ์ที่ยังไม่ปิด") + " · ทั้งในและนอกรั้วมหาวิทยาลัย" + (latest ? " · อัปเดตล่าสุด " + latest : "");
};

RZ.groupByPlace = function(list) {
  var map = {};
  var order = [];
  list.forEach(function(d) {
    var k = d.loc || RZ.PLACE_NONE;
    if (!map[k]) {
      map[k] = [];
      order.push(k);
    }
    map[k].push(d);
  });
  return order.map(function(k) {
    var items = map[k];
    return {
      name: k,
      items: items,
      open: items.filter(function(d) {
        return !RZ.isFixed(d);
      }).length,
      high: items.filter(function(d) {
        return d.sev === "high" && !RZ.isFixed(d);
      }).length
    };
  }).sort(function(a, b) {
    var an = a.name === RZ.PLACE_NONE ? 1 : 0;
    var bn = b.name === RZ.PLACE_NONE ? 1 : 0;
    if (an !== bn) return an - bn;
    if (b.high !== a.high) return b.high - a.high;
    if (b.open !== a.open) return b.open - a.open;
    return b.items.length - a.items.length;
  });
};

RZ.renderFeed = function() {
  var all = RZ.api.getIncidents();
  var list = all.filter(RZ.visible);
  var head = RZ.$("#feedHead");
  var feed = RZ.$("#feed");
  if (!feed) return;

  if (!list.length) {
    if (head) head.innerHTML = "<span>เหตุการณ์ใกล้ฉัน</span>" + '<span class="count mono">0/' + all.length + "</span>";
    feed.innerHTML = '<div class="empty">ไม่พบเหตุการณ์ที่ตรงกับการค้นหา</div>';
    RZ.state.place = null;
    return;
  }

  var groups = RZ.groupByPlace(list);

  if (RZ.state.place) {
    var g = null;
    groups.forEach(function(x) {
      if (x.name === RZ.state.place) g = x;
    });
    if (!g) {
      RZ.state.place = null;
    } else {
      if (head) {
        head.innerHTML = '<button class="drillback" id="placeBack" type="button">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m15 18-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>' + "<span>" + RZ.esc(g.name) + "</span>" + "</button>" + '<span class="count mono">' + g.items.length + " เรื่อง</span>";
        var bk = RZ.$("#placeBack");
        if (bk) bk.addEventListener("click", function() {
          RZ.state.place = null;
          if (RZ.state.sel) RZ.pick(RZ.state.sel);
          RZ.renderFeed();
        });
      }
      feed.innerHTML = g.items.map(RZ.rowHtml).join("");
      RZ.$$("#feed .rowi").forEach(function(b) {
        b.addEventListener("click", function() {
          RZ.pick(b.getAttribute("data-id"));
        });
      });
      return;
    }
  }

  if (head) {
    head.innerHTML = "<span>จุดที่มีการแจ้ง</span>" + '<span class="count mono">' + groups.length + " จุด · " + list.length + " เรื่อง</span>";
  }

  feed.innerHTML = groups.map(function(g) {
    var dots = [ "high", "mid", "low" ].map(function(sv) {
      var n = g.items.filter(function(d) {
        return d.sev === sv && !RZ.isFixed(d);
      }).length;
      return n ? '<i style="background:var(--' + sv + ')"></i><u>' + n + "</u>" : "";
    }).join("");
    var fixedN = g.items.filter(RZ.isFixed).length;
    if (fixedN) dots += '<i style="background:var(--fixed)"></i><u>' + fixedN + "</u>";
    return '<button class="place" data-place="' + RZ.esc(g.name) + '">' + "<span>" + "<b>" + RZ.esc(g.name) + "</b>" + '<span class="pm">' + '<span class="dots">' + dots + "</span>" + "<span>ล่าสุด " + RZ.esc(g.items[0].time) + "</span>" + "</span>" + "</span>" + '<span class="cntwrap">' + '<span class="cnt">' + g.items.length + "<span>เรื่อง</span></span>" + '<span class="chev">›</span>' + "</span>" + "</button>";
  }).join("");

  RZ.$$("#feed .place").forEach(function(b) {
    b.addEventListener("click", function() {
      var name = b.getAttribute("data-place");
      var g = null;
      groups.forEach(function(x) {
        if (x.name === name) g = x;
      });
      RZ.state.place = name;
      if (g && g.items.length === 1) {
        RZ.pick(g.items[0].id);
      } else {
        RZ.renderFeed();
      }
    });
  });
};

RZ.rowHtml = function(d) {
  var note = (d.note || "").trim();
  var n = d.comments.filter(function(c) {
    return !c.hidden;
  }).length;
  return '<button class="rowi' + (RZ.state.sel === d.id ? " sel" : "") + '" data-id="' + d.id + '">' + '<span class="sev ' + (RZ.isFixed(d) ? "fixed" : d.sev) + '" aria-hidden="true"></span>' + '<span class="rt">' + "<b>" + RZ.esc(note || RZ.catName(d)) + "</b>" + "<span>" + RZ.esc(RZ.catName(d)) + (n ? " · 💬 " + n : "") + "</span>" + "</span>" + '<span class="rr">' + (RZ.isFixed(d) ? '<span class="stpill fixed">✓ แก้ไขแล้ว</span><br>' : "") + RZ.esc(d.time) + "</span>" + "</button>";
};

RZ.locGap = function(d) {
  if (!RZ.nearestLoc || !d.lat || !d.lng) return "";
  var near = RZ.nearestLoc(d.lat, d.lng);
  if (!near || !near.loc || near.dist <= (RZ.LOC_NEAR || 300)) return "";
  return ' <span class="locdist">ห่างออกไป ' + RZ.esc(RZ.locRough(near.dist).replace("ประมาณ ", "~")) + "</span>";
};

RZ.statusPill = function(d) {
  if (!d.approved) return "";
  return RZ.isFixed(d) ? '<span class="stpill fixed">✓ แก้ไขแล้ว</span>' : '<span class="stpill wait">ยังไม่ได้แก้ไข</span>';
};

RZ.resolveHtml = function(d) {
  if (!RZ.isFixed(d) || !d.resolveNote) return "";
  var who = [];
  if (d.resolveUnit) who.push(RZ.esc(d.resolveUnit));
  if (d.resolvedAt) who.push(RZ.esc(d.resolvedAt));
  var pic = "";
  if (Array.isArray(d.afterPhotos)) {
    pic = d.afterPhotos.length ? '<div class="resnote has">มีรูปหลังแก้ไข ' + d.afterPhotos.length + " รูป ดูด้านล่าง</div>" : '<div class="resnote">ไม่มีรูปหลังแก้ไข</div>';
  }
  return '<div class="resbox">' + '<div class="reslbl">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 13 4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>' + "<span>ดำเนินการแล้ว</span>" + "</div>" + "<p>" + RZ.esc(d.resolveNote) + "</p>" + (who.length ? '<div class="reswho">' + who.join(" · ") + "</div>" : "") + pic + "</div>";
};

RZ.reporterText = function(d) {
  if (!d.reporter) return '<span class="anon">ไม่ระบุชื่อ</span>';
  if (d.anon) return RZ.esc(d.reporter) + ' <span class="anon">· ไม่แสดงต่อสาธารณะ</span>';
  return RZ.esc(d.reporter);
};

RZ.syncPanel = function() {
  var p = RZ.$("#panel");
  if (p) p.classList.toggle("has-sel", !!RZ.state.sel);
};

RZ.pick = function(id) {
  var target = RZ.api.findIncident(id);
  RZ.state.sel = RZ.state.sel === id ? null : id;
  if (RZ.state.sel && target) RZ.state.place = target.loc || RZ.PLACE_NONE;
  RZ.renderPins();
  RZ.renderFeed();
  if (RZ.state.sel) {
    RZ.renderDetail(RZ.state.sel);
    RZ.focusIncident(RZ.api.findIncident(RZ.state.sel));
  } else {
    RZ.$("#detail").innerHTML = "";
  }
  RZ.syncPanel();
  var p = RZ.$("#panel");
  if (p && RZ.state.sel && window.matchMedia("(max-width:820px)").matches) {
    p.scrollIntoView({
      block: "start",
      behavior: "smooth"
    });
  }
};

RZ.initPanel = function() {
  var b = RZ.$("#detailBack");
  if (b) b.addEventListener("click", function() {
    if (RZ.state.sel) RZ.pick(RZ.state.sel);
  });
  RZ.syncPanel();
};

RZ.renderDetail = function(id) {
  var d = RZ.api.findIncident(id);
  if (!d) {
    RZ.$("#detail").innerHTML = "";
    RZ.state.sel = null;
    RZ.syncPanel();
    return;
  }
  var stage = RZ.STAGES[RZ.stageIdx(d.stage)];
  RZ.$("#detail").innerHTML = '<div class="detail">' + '<div class="dt-top"><h3>' + RZ.esc(d.title) + "</h3>" + '<span class="pill ' + d.sev + '">' + RZ.esc(RZ.SEVT[d.sev]) + "</span></div>" + '<dl class="kv">' + '<dt>เลขรายงาน</dt><dd class="mono">' + d.id + "</dd>" + "<dt>ตำแหน่ง</dt><dd>" + RZ.esc(d.loc) + RZ.locGap(d) + "</dd>" + "<dt>ประเภท</dt><dd>" + RZ.esc(RZ.catName(d)) + "</dd>" + '<dt>พบเมื่อ</dt><dd class="mono">' + RZ.esc(d.time) + "</dd>" + '<dt>พิกัด</dt><dd class="mono">' + d.lat.toFixed(5) + ", " + d.lng.toFixed(5) + "</dd>" + "<dt>ระยะห่าง</dt><dd>" + RZ.esc(RZ.distanceText(d.lat, d.lng)) + "</dd>" + '<dt>สถานะ</dt><dd>' + (RZ.isFixed(d) ? '<span class="stpill fixed">✓ แก้ไขแล้ว</span>' : '<span class="pill st">' + RZ.esc(stage.name) + "</span>") + "</dd>" + "<dt>ผู้แจ้ง</dt><dd>" + RZ.reporterText(d) + "</dd>" + '<dt>คนที่ยืนยัน</dt><dd id="confCount">' + d.conf + " คน</dd>" + "</dl>" + '<div class="notewrap"><p class="notelbl">รายละเอียดจากผู้แจ้ง</p><p class="note">' + RZ.esc(d.note) + "</p></div>" + RZ.galleryHtml(d) + RZ.resolveHtml(d) + RZ.galleryHtml(d, true) + '<div class="rowbtns">' + '<button class="btn pri" data-go="form">แจ้งเหตุที่จุดนี้</button>' + '<button class="btn" id="confirmBtn">ยืนยันว่าพบเหตุนี้</button>' + "</div>" + '<div class="cmt" id="cmt"></div>' + "</div>";
  RZ.initGallery();
  var cb = RZ.$("#confirmBtn");
  cb.addEventListener("click", function() {
    RZ.api.confirmIncident(d.id);
    RZ.$("#confCount").textContent = d.conf + " คน";
    cb.textContent = "ยืนยันแล้ว";
    cb.disabled = true;
    cb.style.opacity = ".6";
    cb.style.cursor = "default";
  });
  RZ.renderComments(d.id);
};

RZ.renderComments = function(id) {
  var box = RZ.$("#cmt");
  if (!box) return;
  var list = RZ.api.getComments(id).map(function(c, i) {
    return {
      c: c,
      i: i
    };
  }).filter(function(x) {
    return !x.c.hidden;
  });
  var items = list.length ? list.map(function(x) {
    var c = x.c, i = x.i;
    var mine = c.by === RZ.me;
    return '<li class="cmt-i' + (mine ? " own" : "") + '">' + '<div class="cmt-top">' + "<b>" + RZ.esc(mine ? "คุณ" : c.by) + "</b>" + '<span class="mono">' + RZ.esc(c.time) + "</span>" + (mine ? '<button class="cmt-del" data-i="' + i + '">ลบ</button>' : "") + "</div>" + "<p>" + RZ.esc(c.text) + "</p>" + "</li>";
  }).join("") : '<li class="cmt-none">ยังไม่มีความคิดเห็น · ร่วมแสดงความคิดเห็นเป็นคนแรก</li>';
  box.innerHTML = '<div class="cmt-h">ความคิดเห็น <span class="mono">' + list.length + "</span></div>" + '<ul class="cmt-list">' + items + "</ul>" + '<form class="cmt-form" id="cmtForm">' + '<input id="cmtText" type="text" maxlength="300" ' + 'placeholder="ระบุข้อมูลเพิ่มเติม เช่น เวลาที่พบ, เส้นทางเลี่ยง">' + '<button type="submit" class="btn pri">ส่ง</button>' + "</form>" + '<p class="cmt-rule">โปรดแสดงความคิดเห็นอย่างสุภาพ · ระบบขอสงวนสิทธิ์ลบข้อความที่ไม่เหมาะสม</p>';
  RZ.$("#cmtForm").addEventListener("submit", function(e) {
    e.preventDefault();
    var input = RZ.$("#cmtText");
    var text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }
    RZ.api.addComment(id, text);
    RZ.renderComments(id);
    RZ.renderFeed();
    RZ.$("#cmtText").focus();
  });
  RZ.$$("#cmt .cmt-del").forEach(function(b) {
    b.addEventListener("click", function() {
      RZ.api.deleteComment(id, parseInt(b.getAttribute("data-i"), 10));
      RZ.renderComments(id);
      RZ.renderFeed();
    });
  });
};

RZ.galleryHtml = function(d, after) {
  var ph = (after ? d.afterPhotos : d.photos) || [];
  if (!ph.length) return "";
  return '<p class="notelbl gal-h' + (after ? " after" : "") + '">' + (after ? "รูปหลังแก้ไข" : "รูปจากผู้แจ้ง") + "</p>" + '<div class="gal" data-i="0">' + '<div class="gal-win">' + (ph.length > 1 ? '<span class="gal-cnt"><b>1</b>/' + ph.length + "</span>" : "") + ph.map(function(src, i) {
    return '<img class="gal-img' + (i ? "" : " on") + '" src="' + RZ.esc(src) + '" alt="รูปที่ ' + (i + 1) + '" loading="lazy">';
  }).join("") + (ph.length > 1 ? '<div class="gal-nav">' + '<button type="button" data-gal="-1" aria-label="รูปก่อนหน้า">‹</button>' + '<button type="button" data-gal="1" aria-label="รูปถัดไป">›</button>' + "</div>" : "") + "</div>" + (ph.length > 1 ? '<div class="gal-dots">' + ph.map(function(_, i) {
    return '<button type="button" class="' + (i ? "" : "on") + '" data-galgo="' + i + '" aria-label="ไปรูปที่ ' + (i + 1) + '"></button>';
  }).join("") + "</div>" : "") + "</div>";
};

RZ.galShow = function(gal, i) {
  var imgs = RZ.$$(".gal-img", gal);
  if (!imgs.length) return;
  i = (i + imgs.length) % imgs.length;
  gal.setAttribute("data-i", i);
  imgs.forEach(function(im, k) {
    im.classList.toggle("on", k === i);
  });
  RZ.$$(".gal-dots button", gal).forEach(function(b, k) {
    b.classList.toggle("on", k === i);
  });
  var cnt = RZ.$(".gal-cnt b", gal);
  if (cnt) cnt.textContent = i + 1;
};

RZ.initGallery = function(scope) {
  RZ.$$((scope || "#detail") + " .gal").forEach(RZ.bindGallery);
};

RZ.bindGallery = function(gal) {
  if (!gal) return;
  RZ.$$("[data-gal]", gal).forEach(function(b) {
    b.addEventListener("click", function() {
      RZ.galShow(gal, parseInt(gal.getAttribute("data-i"), 10) + parseInt(b.getAttribute("data-gal"), 10));
    });
  });
  RZ.$$("[data-galgo]", gal).forEach(function(b) {
    b.addEventListener("click", function() {
      RZ.galShow(gal, parseInt(b.getAttribute("data-galgo"), 10));
    });
  });
  RZ.$$(".gal-img", gal).forEach(function(im, i) {
    im.addEventListener("click", function() {
      RZ.openLightbox(RZ.$$(".gal-img", gal).map(function(x) {
        return x.getAttribute("src");
      }), i);
    });
  });
};

RZ.openLightbox = function(srcs, i) {
  var box = RZ.$("#lightbox");
  if (!box) {
    box = document.createElement("div");
    box.id = "lightbox";
    box.className = "lightbox";
    document.body.appendChild(box);
  }
  var n = srcs.length;
  var cur = i || 0;
  function draw() {
    box.innerHTML = '<button type="button" class="lb-close" aria-label="ปิด">✕</button>' + '<div class="lb-box">' + '<img src="' + RZ.esc(srcs[cur]) + '" alt="รูปที่ ' + (cur + 1) + '">' + (n > 1 ? '<div class="lb-nav"><button type="button" data-lb="-1">‹</button><button type="button" data-lb="1">›</button></div>' : "") + '<p class="lb-cap">รูปที่ ' + (cur + 1) + " จาก " + n + "</p>" + "</div>";
    RZ.$(".lb-close", box).addEventListener("click", close);
    RZ.$$("[data-lb]", box).forEach(function(b) {
      b.addEventListener("click", function(e) {
        e.stopPropagation();
        cur = (cur + parseInt(b.getAttribute("data-lb"), 10) + n) % n;
        draw();
      });
    });
  }
  function close() {
    box.classList.remove("on");
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) {
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight" && n > 1) {
      cur = (cur + 1) % n;
      draw();
    }
    if (e.key === "ArrowLeft" && n > 1) {
      cur = (cur - 1 + n) % n;
      draw();
    }
  }
  draw();
  box.classList.add("on");
  box.onclick = function(e) {
    if (e.target === box) close();
  };
  document.addEventListener("keydown", onKey);
};
