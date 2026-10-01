window.RZ = window.RZ || {};

RZ.renderAll = function() {
  RZ.renderCats();
  RZ.renderPins();
  RZ.renderFeed();
  RZ.renderMine();
  RZ.renderAlerts();
  RZ.setBadge(RZ.api.countUnread());
  if (RZ.isAdmin()) RZ.renderAdminAll();
  if (RZ.state.sel) RZ.renderDetail(RZ.state.sel);
};

function init() {
  RZ.initRouter();
  RZ.initMap();
  RZ.initForm();
  RZ.initAuth();
  RZ.api.boot().then(function(mode) {
    if (mode === "live-in") {
      RZ.renderAll();
      RZ.applyRole();
      return;
    }
    RZ.renderAll();
    RZ.pick(RZ.DATA.length ? RZ.DATA[0].id : null);
    RZ.showLogin();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
