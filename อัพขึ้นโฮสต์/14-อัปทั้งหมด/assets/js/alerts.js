window.RZ = window.RZ || {};

RZ.renderAlerts = function() {
  RZ.$("#alertList").innerHTML = RZ.api.getAlerts().map(function(a) {
    return '<div class="alert' + (a.n ? " new" : "") + '">' + '<span class="ico">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-linecap="round" stroke-linejoin="round">' + RZ.ICONS[a.k] + "</svg>" + "</span>" + "<div><b>" + RZ.esc(a.title) + "</b>" + "<p>" + RZ.esc(a.msg) + "</p>" + '<div class="t">' + RZ.esc(a.time) + "</div>" + "</div>" + "</div>";
  }).join("");
};
