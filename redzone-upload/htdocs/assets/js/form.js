window.RZ = window.RZ || {};

RZ.form = {
  cat: "light",
  sev: "mid",
  lat: 13.8183,
  lng: 100.5148
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
      RZ.syncCatOther();
    });
  });
  RZ.syncCatOther();
};

RZ.syncCatOther = function() {
  var field = RZ.$("#catOtherField");
  if (!field) return;
  var needsText = !!RZ.catOf(RZ.form.cat).free;
  field.hidden = !needsText;
  if (needsText) RZ.$("#catOther").focus();
};

RZ.pickMap = null;

RZ.pickMarker = null;

RZ.setPin = function(lat, lng, pan) {
  if (!RZ.inScope(lat, lng)) {
    RZ.$("#coord").textContent = "จุดนี้อยู่นอกขอบเขตที่รับแจ้ง (" + RZ.SCOPE.label + ") — " + RZ.distanceText(lat, lng) + " กรุณาเลือกจุดที่ใกล้กว่านี้";
    RZ.$("#coord").classList.add("coord-bad");
    return;
  }
  RZ.$("#coord").classList.remove("coord-bad");
  RZ.form.lat = lat;
  RZ.form.lng = lng;
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

RZ.initPicker = function() {
  var inC = RZ.LOCATIONS.filter(function(l) {
    return l.inCampus;
  });
  var outC = RZ.LOCATIONS.filter(function(l) {
    return !l.inCampus;
  });
  var opt = function(l) {
    return "<option>" + RZ.esc(l.name) + "</option>";
  };
  RZ.$("#loc").innerHTML = '<optgroup label="ในมหาวิทยาลัย">' + inC.map(opt).join("") + "</optgroup>" + '<optgroup label="นอกรั้ว (ในรัศมี 10 กม.)">' + outC.map(opt).join("") + "</optgroup>";
  var first = RZ.locOf(RZ.$("#loc").value);
  if (!RZ.hasLeaflet) {
    RZ.mapFallback("pickCanvas");
    RZ.$("#loc").addEventListener("change", function(e) {
      var l = RZ.locOf(e.target.value);
      RZ.setPin(l.lat, l.lng, false);
    });
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
  RZ.$("#loc").addEventListener("change", function(e) {
    var l = RZ.locOf(e.target.value);
    RZ.setPin(l.lat, l.lng, true);
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
  RZ.form.cat = RZ.CATS[0].id;
  RZ.form.sev = "mid";
  RZ.$$("#catGrid .opt").forEach(function(o) {
    o.setAttribute("aria-pressed", o.getAttribute("data-cat") === RZ.form.cat);
  });
  RZ.$$("#sevGrid .sevopt").forEach(function(o) {
    o.setAttribute("aria-pressed", o.getAttribute("data-v") === RZ.form.sev);
  });
  RZ.$("#catOther").value = "";
  RZ.$("#catOther").style.borderColor = "";
  RZ.$("#desc").value = "";
  RZ.$("#cc").textContent = "0";
  RZ.syncCatOther();
  RZ.$("#when").value = RZ.nowLocalInput();
  var anon = RZ.$("#tgAnon");
  anon.setAttribute("aria-pressed", "false");
  RZ.$("#anonHint").textContent = "เจ้าหน้าที่จะไม่เห็นชื่อและรหัสนักศึกษาของคุณ";
  RZ.$("#loc").selectedIndex = 0;
  var first = RZ.locOf(RZ.$("#loc").value);
  if (first) RZ.setPin(first.lat, first.lng, true);
};

RZ.initForm = function() {
  RZ.initPicker();
  RZ.$$("#sevGrid .sevopt").forEach(function(b) {
    b.addEventListener("click", function() {
      RZ.form.sev = b.getAttribute("data-v");
      RZ.$$("#sevGrid .sevopt").forEach(function(o) {
        o.setAttribute("aria-pressed", o === b);
      });
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
    RZ.$("#anonHint").textContent = on ? "เจ้าหน้าที่จะเห็นแค่เนื้อหารายงาน ไม่เห็นชื่อ รหัสนักศึกษา และอีเมลของคุณ" : "เจ้าหน้าที่จะไม่เห็นชื่อและรหัสนักศึกษาของคุณ";
  });
  RZ.$("#rzForm").addEventListener("submit", function(e) {
    e.preventDefault();
    var isFree = !!RZ.catOf(RZ.form.cat).free;
    var otherText = isFree ? RZ.$("#catOther").value.trim() : "";
    if (isFree && !otherText) {
      RZ.$("#catOther").focus();
      RZ.$("#catOther").style.borderColor = "var(--high)";
      return;
    }
    RZ.$("#catOther").style.borderColor = "";
    var locSel = RZ.$("#loc");
    var payload = {
      cat: RZ.form.cat,
      catOther: otherText,
      sev: RZ.form.sev,
      loc: locSel.options[locSel.selectedIndex].text,
      lat: RZ.form.lat,
      lng: RZ.form.lng,
      when: RZ.$("#when").value,
      desc: RZ.$("#desc").value.trim(),
      anonymous: anon.getAttribute("aria-pressed") === "true"
    };
    var btn = RZ.$("#rzForm button[type=submit]");
    btn.disabled = true;
    Promise.resolve(RZ.api.createReport(payload)).then(function(row) {
      RZ.$("#newId").textContent = row.id;
      RZ.$("#stReports").textContent = RZ.api.getMyReports().length;
      RZ.renderPins();
      RZ.renderFeed();
      RZ.renderMine();
      RZ.renderAlerts();
      RZ.resetForm();
      RZ.go("done");
    }).catch(function(err) {
      alert("ส่งรายงานไม่สำเร็จ: " + err.message);
    }).then(function() {
      btn.disabled = false;
    });
  });
};
