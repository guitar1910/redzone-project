window.RZ = window.RZ || {};

RZ.renderFeed = function() {
  var all = RZ.api.getIncidents();
  var list = all.filter(RZ.visible);
  RZ.$("#feedCount").textContent = list.length + "/" + all.length;
  if (!list.length) {
    RZ.$("#feed").innerHTML = '<div class="empty">ไม่พบเหตุการณ์ที่ตรงกับเงื่อนไข</div>';
    return;
  }
  RZ.$("#feed").innerHTML = list.map(function(d) {
    var n = d.comments.filter(function(c) {
      return !c.hidden;
    }).length;
    return '<button class="item' + (RZ.state.sel === d.id ? " sel" : "") + '" data-id="' + d.id + '">' + '<span class="sev ' + d.sev + '" aria-hidden="true"></span>' + "<span><b>" + RZ.esc(d.title) + "</b>" + '<span class="meta">' + "<span>" + RZ.esc(d.loc) + "</span><span>·</span>" + "<span>" + RZ.esc(RZ.catName(d)) + "</span>" + '<span class="mono">' + RZ.esc(d.time) + "</span>" + (n ? '<span class="mono">💬 ' + n + "</span>" : "") + "</span>" + "</span>" + "</button>";
  }).join("");
  RZ.$$("#feed .item").forEach(function(b) {
    b.addEventListener("click", function() {
      RZ.pick(b.getAttribute("data-id"));
    });
  });
};

RZ.pick = function(id) {
  RZ.state.sel = RZ.state.sel === id ? null : id;
  RZ.renderPins();
  RZ.renderFeed();
  if (RZ.state.sel) {
    RZ.renderDetail(RZ.state.sel);
    RZ.focusIncident(RZ.api.findIncident(RZ.state.sel));
  } else {
    RZ.$("#detail").innerHTML = "";
  }
};

RZ.renderDetail = function(id) {
  var d = RZ.api.findIncident(id);
  if (!d) {
    RZ.$("#detail").innerHTML = "";
    return;
  }
  var stage = RZ.STAGES[RZ.stageIdx(d.stage)];
  RZ.$("#detail").innerHTML = '<div class="detail">' + '<div class="dt-top"><h3>' + RZ.esc(d.title) + "</h3>" + '<span class="pill ' + d.sev + '">' + RZ.esc(RZ.SEVT[d.sev]) + "</span></div>" + '<dl class="kv">' + '<dt>เลขรายงาน</dt><dd class="mono">' + d.id + "</dd>" + "<dt>ตำแหน่ง</dt><dd>" + RZ.esc(d.loc) + "</dd>" + "<dt>ประเภท</dt><dd>" + RZ.esc(RZ.catName(d)) + "</dd>" + '<dt>พบเมื่อ</dt><dd class="mono">' + RZ.esc(d.time) + "</dd>" + '<dt>พิกัด</dt><dd class="mono">' + d.lat.toFixed(5) + ", " + d.lng.toFixed(5) + "</dd>" + "<dt>ระยะห่าง</dt><dd>" + RZ.esc(RZ.distanceText(d.lat, d.lng)) + "</dd>" + '<dt>สถานะ</dt><dd><span class="pill st">' + RZ.esc(stage.name) + "</span></dd>" + '<dt>ยืนยันโดย</dt><dd id="confCount">' + d.conf + " คน</dd>" + "</dl>" + '<p class="note">' + RZ.esc(d.note) + "</p>" + '<div class="rowbtns">' + '<button class="btn pri" data-go="form">แจ้งเหตุที่จุดนี้</button>' + '<button class="btn" id="confirmBtn">ฉันพบเหตุนี้ด้วย</button>' + "</div>" + '<div class="cmt" id="cmt"></div>' + "</div>";
  var cb = RZ.$("#confirmBtn");
  cb.addEventListener("click", function() {
    RZ.api.confirmIncident(d.id);
    RZ.$("#confCount").textContent = d.conf + " คน";
    cb.textContent = "ขอบคุณ ยืนยันแล้ว";
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
  }).join("") : '<li class="cmt-none">ยังไม่มีความคิดเห็น เป็นคนแรกได้เลย</li>';
  box.innerHTML = '<div class="cmt-h">ความคิดเห็น <span class="mono">' + list.length + "</span></div>" + '<ul class="cmt-list">' + items + "</ul>" + '<form class="cmt-form" id="cmtForm">' + '<input id="cmtText" type="text" maxlength="300" ' + 'placeholder="เพิ่มข้อมูลที่เป็นประโยชน์ เช่น เวลาที่พบ หรือทางเลี่ยง">' + '<button type="submit" class="btn pri">ส่ง</button>' + "</form>" + '<p class="cmt-rule">ความคิดเห็นแสดงชื่อผู้เขียน และผู้ดูแลระบบสามารถลบความคิดเห็นที่ไม่เหมาะสมได้</p>';
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
