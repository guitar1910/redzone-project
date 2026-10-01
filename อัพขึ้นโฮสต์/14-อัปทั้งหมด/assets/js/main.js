window.RZ = window.RZ || {};

RZ.renderAll = function() {
  RZ.renderCats();
  RZ.renderPins();
  RZ.renderZones();
  RZ.renderMapSub();
  RZ.renderFeed();
  RZ.renderMine();
  RZ.renderAlerts();
  RZ.setBadge(RZ.api.countUnread());
  if (RZ.isAdmin()) RZ.renderAdminAll();
  if (RZ.state.sel) RZ.renderDetail(RZ.state.sel);
  RZ.renderProfile();
  RZ.renderUserMenu();
  RZ.syncPanel();
  if (RZ.refreshMaps) {
    RZ.refreshMaps();
    setTimeout(RZ.refreshMaps, 200);
  }
};

function init() {
  RZ.initRouter();
  RZ.initMap();
  RZ.initForm();
  RZ.initAuth();
  RZ.initPanel();
  RZ.initProfile();
  RZ.initUserMenu();
  RZ.initLegend();
  RZ.initAdSearch();
  RZ.api.boot().then(function(mode) {
    if (mode === "live-in") {
      RZ.renderAll();
      RZ.applyRole();
      return;
    }
    RZ.renderAll();
    RZ.showLogin();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
