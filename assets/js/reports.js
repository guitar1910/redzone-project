window.RZ = window.RZ || {};

RZ.renderMine = function() {
  var mine = RZ.api.getMyReports();
  if (!mine.length) {
    RZ.$("#myReports").innerHTML = '<div class="card empty">ยังไม่มีรายงานที่แจ้ง</div>';
    return;
  }
  RZ.$("#myReports").innerHTML = mine.map(function(d) {
    var body;
    if (d.stage === "reject") {
      body = '<div class="rejectbox"><b>' + RZ.REJECT.name + "</b>" + "<span>" + RZ.esc(d.rejectReason || "ไม่ผ่านการตรวจสอบจากผู้ดูแลระบบ") + "</span>" + "<span>แก้ไขข้อมูลแล้วส่งใหม่ได้</span></div>";
    } else {
      var idx = RZ.stageIdx(d.stage);
      var track = RZ.STAGES.map(function(s, i) {
        var cls = (i <= idx ? " done" : "") + (i === idx ? " now" : "");
        return '<li class="st' + cls + '"><span class="st-name">' + RZ.esc(s.name) + "</span></li>";
      }).join("");
      body = '<ol class="track">' + track + "</ol>";
      if (!d.approved) {
        body += '<p class="waitnote">รอผู้ดูแลตรวจสอบ · จะแสดงบนแผนที่เมื่ออนุมัติแล้ว</p>';
      }
      body += RZ.resolveHtml(d) + RZ.galleryHtml(d, true);
    }
    return '<article class="card">' + '<div class="rcard"><div>' + "<h3>" + RZ.esc(d.title) + "</h3>" + '<div class="meta"><span class="mono">' + d.id + "</span> · " + RZ.esc(d.loc) + " · " + RZ.esc(RZ.catName(d)) + " · " + '<span class="mono">' + RZ.esc(d.time) + "</span>" + "</div>" + "</div>" + '<span class="pill ' + d.sev + '">' + RZ.esc(RZ.SEVT[d.sev]) + "</span></div>" + body + "</article>";
  }).join("");
  RZ.initGallery("#myReports");
};
