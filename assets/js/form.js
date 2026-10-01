window.RZ = window.RZ || {};

RZ.form = {
  cat: "",
  sev: "",
  loc: "",
  locRough: "",
  lat: 13.8183,
  lng: 100.5148
};

RZ.nearestLoc = function(lat, lng) {
  var best = null;
  var bestD = Infinity;
  for (var i = 0; i < RZ.LOCATIONS.length; i++) {
    var l = RZ.LOCATIONS[i];
    var d = RZ.distanceM(lat, lng, l.lat, l.lng);
    if (d < bestD) {
      bestD = d;
      best = l;
    }
  }
  return {
    loc: best,
    dist: bestD
  };
};

RZ.locLabel = function(dist) {
  if (dist < 1000) return "ห่าง " + Math.round(dist / 10) * 10 + " ม.";
  return "ห่าง " + (dist / 1000).toFixed(1) + " กม.";
};

RZ.LOC_NEAR = 300;

RZ.locRough = function(dist) {
  if (dist < 1000) return "ประมาณ " + Math.round(dist / 50) * 50 + " ม.";
  return "ประมาณ " + (dist / 1000).toFixed(1) + " กม.";
};

RZ.autoLocName = function(near) {
  if (near.dist <= RZ.LOC_NEAR) return near.loc.name;
  return "ใกล้" + near.loc.name;
};

RZ.paintLocName = function() {
  var el = RZ.$("#locName");
  if (!el) return;
  el.innerHTML = "<b>" + RZ.esc(RZ.form.loc) + "</b>" + (RZ.form.locRough ? ' <span class="locdist">' + RZ.esc(RZ.form.locRough) + "</span>" : "");
};

RZ.fmErr = function(id, on) {
  var el = RZ.$("#" + id);
  if (el) el.hidden = !on;
};

RZ.renderCats = function() {
  RZ.$("#catGrid").innerHTML = RZ.CATS.map(function(c) {
    return '<button type="button" class="opt" data-cat="' + c.id + '" ' + 'aria-pressed="' + (RZ.form.cat === c.id) + '">' + '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-linecap="round" stroke-linejoin="round"><path d="' + c.d + '"/></svg>' + "<span>" + RZ.esc(c.name) + "</span>" + "</button>";
  }).join("");
  RZ.$$("#catGrid .opt").forEach(function(b) {
    b.addEventListener("click", function() {
      RZ.form.cat = b.getAttribute("data-cat");
      RZ.$$("#catGrid .opt").forEach(function(o) {
        o.setAttribute("aria-pressed", o === b);
      });
      RZ.fmErr("catErr", false);
      RZ.syncCatOther();
    });
  });
  RZ.syncCatOther();
};

RZ.syncCatOther = function() {
  var field = RZ.$("#catOtherField");
  if (!field) return;
  var needsText = RZ.form.cat === "other";
  field.hidden = !needsText;
  if (needsText) RZ.$("#catOther").focus();
};

RZ.pickMap = null;

RZ.pickMarker = null;

RZ.setPin = function(lat, lng, pan) {
  if (!RZ.inScope(lat, lng)) {
    RZ.$("#coord").textContent = "อยู่นอกพื้นที่ให้บริการ · " + RZ.distanceText(lat, lng) + " · รับแจ้งเฉพาะใน" + RZ.SCOPE.label;
    RZ.$("#coord").classList.add("coord-bad");
    return;
  }
  RZ.$("#coord").classList.remove("coord-bad");
  RZ.form.lat = lat;
  RZ.form.lng = lng;
  var near = RZ.nearestLoc(lat, lng);
  RZ.form.locRough = near.dist <= RZ.LOC_NEAR ? "" : "ห่างออกไป " + RZ.locRough(near.dist).replace("ประมาณ ", "~");
  RZ.form.loc = RZ.autoLocName(near);
  RZ.paintLocName();
  if (RZ.pickMarker) {
    RZ.pickMarker.setLatLng([ lat, lng ]);
  }
  if (pan && RZ.pickMap) {
    RZ.pickMap.panTo([ lat, lng ], {
      animate: true
    });
  }
  RZ.$("#coord").textContent = lat.toFixed(5) + " N, " + lng.toFixed(5) + " E  ·  " + RZ.distanceText(lat, lng);
};

RZ.PICK_START = [ RZ.SCOPE.center[0], RZ.SCOPE.center[1] ];

RZ.initPicker = function() {
  var first = {
    lat: RZ.PICK_START[0],
    lng: RZ.PICK_START[1]
  };
  if (!RZ.hasLeaflet) {
    RZ.mapFallback("pickCanvas");
    RZ.setPin(first.lat, first.lng, false);
    return;
  }
  RZ.pickMap = RZ.newMap("pickCanvas", {
    center: [ first.lat, first.lng ],
    zoom: 16
  });
  RZ.drawScope(RZ.pickMap, true);
  RZ.pickMarker = RZ.newPin([ first.lat, first.lng ]).addTo(RZ.pickMap);
  RZ.pickMap.on("click", function(e) {
    RZ.setPin(e.latlng.lat, e.latlng.lng, false);
  });
  RZ.setPin(first.lat, first.lng, false);
  RZ.$$('[data-go="form"]').forEach(function(b) {
    b.addEventListener("click", function() {
      setTimeout(function() {
        RZ.pickMap.invalidateSize();
      }, 60);
    });
  });
};

RZ.resetForm = function() {
  if (!RZ.$("#rzForm")) return;
  RZ.form.cat = "";
  RZ.form.sev = "";
  RZ.$$("#catGrid .opt").forEach(function(o) {
    o.setAttribute("aria-pressed", "false");
  });
  RZ.$$("#sevGrid .sevopt").forEach(function(o) {
    o.setAttribute("aria-pressed", "false");
  });
  RZ.fmErr("catErr", false);
  RZ.fmErr("sevErr", false);
  RZ.fmErr("photoErr", false);
  RZ.photos = [];
  RZ.renderPhotoBox();
  RZ.$("#catOther").value = "";
  RZ.$("#catOther").style.borderColor = "";
  RZ.$("#desc").value = "";
  RZ.$("#cc").textContent = "0";
  RZ.syncCatOther();
  RZ.$("#when").value = RZ.nowLocalInput();
  var anon = RZ.$("#tgAnon");
  anon.setAttribute("aria-pressed", "false");
  RZ.$("#anonHint").textContent = "ผู้ใช้อื่นจะเห็นชื่อผู้ใช้ของคุณบนรายงานนี้";
  RZ.setPin(RZ.PICK_START[0], RZ.PICK_START[1], true);
};

RZ.initForm = function() {
  RZ.initPicker();
  RZ.initPhotos();
  RZ.$$("#sevGrid .sevopt").forEach(function(b) {
    b.addEventListener("click", function() {
      RZ.form.sev = b.getAttribute("data-v");
      RZ.$$("#sevGrid .sevopt").forEach(function(o) {
        o.setAttribute("aria-pressed", o === b);
      });
      RZ.fmErr("sevErr", false);
    });
  });
  RZ.$("#desc").addEventListener("input", function(e) {
    RZ.$("#cc").textContent = Math.min(e.target.value.length, 500);
  });
  RZ.$$(".tg").forEach(function(t) {
    if (t.hasAttribute("data-locked")) return;
    t.addEventListener("click", function() {
      t.setAttribute("aria-pressed", t.getAttribute("aria-pressed") !== "true");
    });
  });
  var anon = RZ.$("#tgAnon");
  anon.addEventListener("click", function() {
    var on = anon.getAttribute("aria-pressed") === "true";
    RZ.$("#anonHint").textContent = on ? 'ผู้ใช้อื่นจะเห็นรายงานนี้เป็น "ไม่ระบุชื่อ" · ผู้ดูแลระบบยังเห็นบัญชีของคุณ' : "ผู้ใช้อื่นจะเห็นชื่อผู้ใช้ของคุณบนรายงานนี้";
  });
  RZ.$("#rzForm").addEventListener("submit", function(e) {
    e.preventDefault();
    if (!RZ.form.cat) {
      RZ.fmErr("catErr", true);
      RZ.$("#catGrid").scrollIntoView({
        block: "center",
        behavior: "smooth"
      });
      return;
    }
    if (!RZ.form.sev) {
      RZ.fmErr("sevErr", true);
      RZ.$("#sevGrid").scrollIntoView({
        block: "center",
        behavior: "smooth"
      });
      return;
    }
    if (!RZ.photos.length) {
      RZ.fmErr("photoErr", true);
      RZ.$("#photoBox").scrollIntoView({
        block: "center",
        behavior: "smooth"
      });
      return;
    }
    var isFree = RZ.form.cat === "other";
    var otherText = isFree ? RZ.$("#catOther").value.trim() : "";
    if (isFree && !otherText) {
      RZ.$("#catOther").focus();
      RZ.$("#catOther").style.borderColor = "var(--high)";
      return;
    }
    RZ.$("#catOther").style.borderColor = "";
    var payload = {
      cat: RZ.form.cat,
      catOther: otherText,
      sev: RZ.form.sev,
      loc: RZ.form.loc,
      lat: RZ.form.lat,
      lng: RZ.form.lng,
      when: RZ.$("#when").value,
      desc: RZ.$("#desc").value.trim(),
      anonymous: anon.getAttribute("aria-pressed") === "true"
    };
    var btn = RZ.$("#rzForm button[type=submit]");
    btn.disabled = true;
    Promise.resolve(RZ.api.createReport(payload)).then(function(row) {
      return RZ.uploadPhotos(row.id).then(function() {
        return RZ.api.refresh ? RZ.api.refresh() : null;
      }).then(function() {
        return row;
      });
    }).then(function(row) {
      RZ.$("#newId").textContent = row.id;
      RZ.renderProfile();
      RZ.renderPins();
      RZ.renderFeed();
      RZ.renderMine();
      RZ.renderAlerts();
      RZ.resetForm();
      RZ.go("done");
    }).catch(function(err) {
      alert("ส่งรายงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง\n\n" + err.message);
    }).then(function() {
      btn.disabled = false;
    });
  });
};

RZ.PHOTO_MAX = 3;

RZ.PHOTO_EDGE = 1200;

RZ.photos = [];

RZ.shrinkImage = function(file) {
  return new Promise(function(resolve, reject) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      reject(new Error("รองรับเฉพาะไฟล์ JPG, PNG และ WEBP"));
      return;
    }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function() {
      var w = img.naturalWidth, h = img.naturalHeight;
      var scale = Math.min(1, RZ.PHOTO_EDGE / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * scale));
      var ch = Math.max(1, Math.round(h * scale));
      var cv = document.createElement("canvas");
      cv.width = cw;
      cv.height = ch;
      cv.getContext("2d").drawImage(img, 0, 0, cw, ch);
      URL.revokeObjectURL(url);
      cv.toBlob(function(blob) {
        if (!blob) {
          reject(new Error("ย่อรูปไม่สำเร็จ กรุณาเลือกไฟล์อื่น"));
          return;
        }
        resolve({
          blob: blob,
          url: cv.toDataURL("image/jpeg", .7),
          w: cw,
          h: ch
        });
      }, "image/jpeg", .82);
    };
    img.onerror = function() {
      URL.revokeObjectURL(url);
      reject(new Error("เปิดไฟล์รูปไม่ได้ กรุณาเลือกไฟล์อื่น"));
    };
    img.src = url;
  });
};

RZ.renderPhotoBox = function() {
  var box = RZ.$("#photoBox");
  if (!box) return;
  var n = RZ.photos.length;
  if (!n) {
    box.innerHTML = '<button type="button" class="drop" id="photoAdd">' + '<span class="ic">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' + '<path d="M4 16V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/>' + '<path d="m4 16 4.5-4.5a2 2 0 0 1 2.8 0L16 16"/><circle cx="15" cy="9" r="1.4"/></svg>' + "</span>" + "<b>เพิ่มรูปภาพ</b>" + "<span>อย่างน้อย 1 รูป · สูงสุด " + RZ.PHOTO_MAX + " รูป · JPG, PNG, WEBP</span>" + "</button>";
  } else {
    box.innerHTML = '<div class="thumbs">' + RZ.photos.map(function(p, i) {
      return '<div class="thumb">' + '<img src="' + p.url + '" alt="รูปที่ ' + (i + 1) + '">' + '<span class="tagn">' + (i + 1) + "</span>" + '<button type="button" class="x" data-delphoto="' + i + '" aria-label="ลบรูปที่ ' + (i + 1) + '">✕</button>' + "</div>";
    }).join("") + (n < RZ.PHOTO_MAX ? '<button type="button" class="thumb add" id="photoAdd" aria-label="เพิ่มรูป">+</button>' : "") + "</div>";
  }
  RZ.$("#photoHint").textContent = n ? "แนบแล้ว " + n + "/" + RZ.PHOTO_MAX + " รูป · ระบบย่อรูปและลบพิกัด GPS อัตโนมัติ" : "ยังไม่ได้แนบรูป";
  var add = RZ.$("#photoAdd");
  if (add) add.addEventListener("click", function() {
    RZ.$("#photoInput").click();
  });
  RZ.$$("#photoBox [data-delphoto]").forEach(function(b) {
    b.addEventListener("click", function() {
      RZ.photos.splice(parseInt(b.getAttribute("data-delphoto"), 10), 1);
      RZ.renderPhotoBox();
    });
  });
};

RZ.initPhotos = function() {
  var input = RZ.$("#photoInput");
  if (!input) return;
  input.addEventListener("change", function() {
    var files = [].slice.call(input.files || []);
    input.value = "";
    if (!files.length) return;
    var room = RZ.PHOTO_MAX - RZ.photos.length;
    if (room <= 0) return;
    var take = files.slice(0, room);
    var skipped = files.length - take.length;
    Promise.all(take.map(function(f) {
      return RZ.shrinkImage(f).then(function(r) {
        return {
          ok: true,
          data: r
        };
      }).catch(function(e) {
        return {
          ok: false,
          msg: e.message
        };
      });
    })).then(function(rows) {
      var bad = [];
      rows.forEach(function(r) {
        if (r.ok) RZ.photos.push(r.data); else bad.push(r.msg);
      });
      RZ.fmErr("photoErr", false);
      RZ.renderPhotoBox();
      if (skipped > 0) {
        RZ.$("#photoHint").textContent = "แนบได้สูงสุด " + RZ.PHOTO_MAX + " รูป · ข้ามไป " + skipped + " ไฟล์";
      }
      if (bad.length) alert(bad[0]);
    });
  });
  RZ.renderPhotoBox();
};

RZ.uploadPhotos = function(reportCode) {
  if (!RZ.photos.length) return Promise.resolve();
  if (!RZ.LIVE) return Promise.resolve();
  var fd = new FormData();
  fd.append("report", reportCode);
  RZ.photos.forEach(function(p, i) {
    fd.append("photos[]", p.blob, "photo" + (i + 1) + ".jpg");
  });
  return fetch("api/upload.php", {
    method: "POST",
    body: fd,
    credentials: "same-origin",
    headers: {
      "X-CSRF-Token": RZ.csrf || ""
    }
  }).then(function(res) {
    return res.json().catch(function() {
      return {};
    }).then(function(d) {
      if (!res.ok || !d.ok) throw new Error(d.error || "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      return d;
    });
  });
};
