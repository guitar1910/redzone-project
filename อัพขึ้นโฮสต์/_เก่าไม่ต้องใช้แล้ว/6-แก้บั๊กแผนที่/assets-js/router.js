window.RZ = window.RZ || {};

RZ.go = function(viewName) {
  var target = RZ.$("#view-" + viewName);
  if (target) {
    var need = target.getAttribute("data-role");
    if (need && need !== RZ.role()) {
      console.warn("ไม่มีสิทธิ์เข้าหน้า " + viewName);
      viewName = "map";
    }
  }
  RZ.$$(".view").forEach(function(s) {
    s.classList.toggle("on", s.id === "view-" + viewName);
  });
  document.body.setAttribute("data-view", viewName);
  if (viewName === "form" && RZ.resetForm) RZ.resetForm();
  if (viewName.indexOf("admin") === 0 && RZ.isAdmin()) RZ.renderAdminAll();
  RZ.$$("[data-go]").forEach(function(b) {
    var isMenu = b.classList.contains("nav-i") || b.parentElement && b.parentElement.classList.contains("tabbar");
    if (!isMenu) return;
    if (b.getAttribute("data-go") === viewName) {
      b.setAttribute("aria-current", "page");
    } else {
      b.removeAttribute("aria-current");
    }
  });
  if (viewName === "alerts") {
    RZ.api.getAlerts().forEach(function(a) {
      a.n = false;
    });
    RZ.renderAlerts();
    RZ.setBadge(RZ.api.countUnread());
    if (RZ.LIVE) {
      RZ.api._post("api/notifications.php?action=read").catch(function() {});
    } else {
      RZ.api._save();
    }
  }
  window.scrollTo({
    top: 0,
    behavior: "instant"
  });
  if (RZ.refreshMaps) {
    RZ.refreshMaps();
    setTimeout(RZ.refreshMaps, 120);
  }
};

RZ.setBadge = function(n) {
  [ "#badgeRail", "#badgeTab" ].forEach(function(sel) {
    var el = RZ.$(sel);
    if (!el) return;
    if (n > 0) {
      el.textContent = n;
      el.style.display = "";
    } else {
      el.textContent = "";
      el.style.display = "none";
    }
  });
};

RZ.initRouter = function() {
  document.addEventListener("click", function(e) {
    var btn = e.target.closest("[data-go]");
    if (btn) RZ.go(btn.getAttribute("data-go"));
  });
};
