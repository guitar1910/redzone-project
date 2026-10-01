window.RZ = window.RZ || {};

var STORE_KEY = "redzone.accounts";

RZ.loadAccounts = function() {
  var saved = [];
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (raw) saved = JSON.parse(raw) || [];
  } catch (e) {}

  var seedName = RZ.SEED_ADMIN.username;
  var others = saved.filter(function(a) {
    return a && a.username !== seedName;
  });

  if (others.length !== saved.length) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(others));
    } catch (e) {}
  }

  return [ RZ.SEED_ADMIN ].concat(others);
};

RZ.saveAccounts = function(list) {
  var seedName = RZ.SEED_ADMIN.username;
  var others = (list || []).filter(function(a) {
    return a && a.username !== seedName;
  });
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(others));
  } catch (e) {
    console.warn("เก็บบัญชีลง localStorage ไม่ได้ — บัญชีจะอยู่แค่จนปิดหน้านี้");
  }
};

RZ.findAccount = function(username, password) {
  var u = String(username || "").trim().toLowerCase();
  var found = null;
  RZ.loadAccounts().forEach(function(a) {
    if (a.username === u && a.password === password) found = a;
  });
  return found;
};

RZ.usernameTaken = function(username) {
  var u = String(username || "").trim().toLowerCase();
  return RZ.loadAccounts().some(function(a) {
    return a.username === u;
  });
};

RZ.checkSignup = function(form) {
  var R = RZ.SIGNUP_RULES;
  var username = String(form.username || "").trim().toLowerCase();
  var name = String(form.name || "").trim();
  var code = String(form.code || "").trim();
  var pw = String(form.password || "");
  var pw2 = String(form.confirm || "");
  if (!username || !name || !code || !pw) {
    return "กรุณากรอกข้อมูลให้ครบทุกช่อง";
  }
  if (username.length < R.usernameMin || username.length > R.usernameMax) {
    return "ชื่อผู้ใช้ต้องมี " + R.usernameMin + "-" + R.usernameMax + " ตัวอักษร";
  }
  if (!R.usernamePattern.test(username)) {
    return "ชื่อผู้ใช้ใช้ได้เฉพาะ a-z, 0-9, จุด และขีดล่าง";
  }
  if (!RZ.LIVE && RZ.usernameTaken(username)) {
    return "ชื่อผู้ใช้นี้ถูกใช้แล้ว กรุณาใช้ชื่ออื่น";
  }
  if (!/^[0-9]+$/.test(code) || code.length < R.codeMin || code.length > R.codeMax) {
    return "รหัสนักศึกษา/บุคลากรต้องเป็นตัวเลข " + R.codeMin + "-" + R.codeMax + " หลัก";
  }
  if (pw.length < R.passwordMin) {
    return "รหัสผ่านต้องมีอย่างน้อย " + R.passwordMin + " ตัวอักษร";
  }
  if (pw !== pw2) {
    return "รหัสผ่านทั้งสองช่องไม่ตรงกัน";
  }
  return null;
};

RZ.registerAccount = function(form) {
  var R = RZ.SIGNUP_RULES;
  var problem = RZ.checkSignup(form);
  if (problem) return {
    ok: false,
    error: problem
  };
  var username = String(form.username || "").trim().toLowerCase();
  var name = String(form.name || "").trim();
  var code = String(form.code || "").trim();
  var pw = String(form.password || "");
  var list = RZ.loadAccounts();
  var account = {
    userId: Math.max.apply(null, list.map(function(a) {
      return a.userId;
    })) + 1,
    username: username,
    password: pw,
    name: name,
    code: code,
    email: "s" + code + R.mailDomain,
    role: "user"
  };
  list.push(account);
  RZ.saveAccounts(list);
  RZ.USERS.push({
    id: account.userId,
    name: account.name,
    code: account.code,
    email: account.email,
    role: "user",
    active: true,
    reports: 0,
    joined: "7 ก.ย. 2569"
  });
  return {
    ok: true,
    account: account
  };
};

RZ.syncAccountsToUsers = function() {
  RZ.loadAccounts().forEach(function(a) {
    var already = RZ.USERS.some(function(u) {
      return u.id === a.userId;
    });
    if (already) return;
    RZ.USERS.push({
      id: a.userId,
      name: a.name,
      code: a.code,
      email: a.email,
      role: a.role,
      active: true,
      reports: 0,
      joined: "7 ก.ย. 2569"
    });
  });
};

RZ.applyRole = function() {
  if (!RZ.session) return;
  var role = RZ.session.role;
  document.body.classList.toggle("is-admin", role === "admin");
  document.body.classList.toggle("is-user", role === "user");
  RZ.$$("[data-role]").forEach(function(el) {
    el.hidden = el.getAttribute("data-role") !== role;
  });
  RZ.$("#tbAvatar").textContent = (RZ.session.username || RZ.session.name || "-").charAt(0);
  RZ.$("#tbName").textContent = RZ.session.name + " (" + RZ.ROLES[role] + ")";
  RZ.$("#tbCode").textContent = RZ.session.code;
  RZ.renderUserMenu();
  RZ.renderAll();
  RZ.go(role === "admin" ? "admin" : "map");
};

function msg(id, text) {
  var el = RZ.$("#" + id);
  el.textContent = text;
  el.hidden = !text;
}

function showPane(which) {
  RZ.$("#paneLogin").hidden = which !== "login";
  RZ.$("#paneRegister").hidden = which !== "register";
  msg("lgError", "");
  msg("rgError", "");
  msg("lgOk", "");
}

RZ.showLogin = function() {
  document.body.classList.add("locked");
  RZ.$("#login").classList.add("on");
  showPane("login");
  RZ.$("#lg-user").value = "";
  RZ.$("#lg-pw").value = "";
  RZ.$("#lg-user").focus();
};

RZ.hideLogin = function() {
  RZ.$("#login").classList.remove("on");
  document.body.classList.remove("locked");
  if (RZ.map) {
    setTimeout(function() {
      RZ.map.invalidateSize();
    }, 60);
  }
};

RZ.initAuth = function() {
  RZ.syncAccountsToUsers();
  RZ.$("#toRegister").addEventListener("click", function() {
    showPane("register");
    RZ.$("#rg-user").focus();
  });
  RZ.$("#toLogin").addEventListener("click", function() {
    showPane("login");
  });
  RZ.$("#logoutBtn").addEventListener("click", function() {
    if (RZ.LIVE) {
      RZ.api._post("api/auth.php?action=logout").catch(function() {});
    }
    RZ.session = null;
    RZ.me = "";
    RZ.csrf = "";
    RZ.showLogin();
  });
  RZ.$("#lgForm").addEventListener("submit", function(e) {
    e.preventDefault();
    var username = RZ.$("#lg-user").value.trim();
    var password = RZ.$("#lg-pw").value;
    if (!username || !password) {
      msg("lgError", "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }
    if (RZ.LIVE) {
      var btn = RZ.$("#loginGo");
      btn.disabled = true;
      RZ.api._post("api/auth.php", {
        username: username,
        password: password
      }).then(function(res) {
        if (res.csrf) RZ.csrf = res.csrf;
        return RZ.api.refresh();
      }).then(function() {
        msg("lgError", "");
        RZ.hideLogin();
        RZ.applyRole();
      }).catch(function(err) {
        msg("lgError", err.message || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        RZ.$("#lg-pw").value = "";
        RZ.$("#lg-pw").focus();
      }).then(function() {
        btn.disabled = false;
      });
      return;
    }
    var acc = RZ.findAccount(username, password);
    if (!acc) {
      msg("lgError", "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      RZ.$("#lg-pw").value = "";
      RZ.$("#lg-pw").focus();
      return;
    }
    var banned = false;
    RZ.USERS.forEach(function(u) {
      if (u.id === acc.userId && u.active === false) banned = true;
    });
    if (banned) {
      msg("lgError", "บัญชีนี้ถูกระงับการใช้งาน · กรุณาติดต่อผู้ดูแลระบบ");
      return;
    }
    msg("lgError", "");
    RZ.session = acc;
    RZ.me = acc.name;
    RZ.hideLogin();
    RZ.applyRole();
  });
  RZ.$("#rg-code").addEventListener("input", function(e) {
    var code = e.target.value.trim();
    RZ.$("#rg-mail").textContent = code ? "อีเมลของระบบ: s" + code + RZ.SIGNUP_RULES.mailDomain : "ระบบสร้างอีเมลจากรหัสนี้อัตโนมัติ";
  });
  RZ.$("#rgForm").addEventListener("submit", function(e) {
    e.preventDefault();
    var form = {
      username: RZ.$("#rg-user").value,
      name: RZ.$("#rg-name").value,
      code: RZ.$("#rg-code").value,
      password: RZ.$("#rg-pw").value,
      confirm: RZ.$("#rg-pw2").value
    };
    if (RZ.LIVE) {
      var local = RZ.checkSignup(form);
      if (local) {
        msg("rgError", local);
        return;
      }
      RZ.api._post("api/register.php", {
        username: form.username,
        name: form.name,
        code: form.code,
        password: form.password
      }).then(function(out) {
        RZ.$("#rgForm").reset();
        RZ.$("#rg-mail").textContent = "อีเมลของระบบจะสร้างจากรหัสนี้ให้อัตโนมัติ";
        showPane("login");
        RZ.$("#lg-user").value = out.user.username;
        RZ.$("#lg-pw").focus();
        msg("lgOk", out.message || "สมัครสมาชิกเรียบร้อย กรุณาเข้าสู่ระบบ");
      }).catch(function(err) {
        msg("rgError", err.message || "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      });
      return;
    }
    var res = RZ.registerAccount(form);
    if (!res.ok) {
      msg("rgError", res.error);
      return;
    }
    RZ.$("#rgForm").reset();
    RZ.$("#rg-mail").textContent = "อีเมลของระบบจะสร้างจากรหัสนี้ให้อัตโนมัติ";
    showPane("login");
    RZ.$("#lg-user").value = res.account.username;
    RZ.$("#lg-pw").focus();
    msg("lgOk", "สมัครสมาชิกเรียบร้อย กรุณาเข้าสู่ระบบด้วยรหัสผ่านที่ตั้งไว้");
    if (RZ.isAdmin()) RZ.renderAdminAll();
  });
};

RZ.SEV_COLOR = {
  high: "var(--high)",
  mid: "var(--mid)",
  low: "var(--low)"
};

RZ.ALERT_COLOR = {
  done: "var(--low)",
  reject: "var(--high)",
  status: "var(--accent)",
  zone: "var(--mid)",
  new: "var(--mid)"
};

RZ.buildTimeline = function(isAdmin) {
  var out = [];
  if (isAdmin) {
    RZ.api.getAudit().forEach(function(a) {
      out.push({
        t: RZ.timeKey(a.time),
        color: "var(--accent)",
        text: (RZ.AUDIT_LABEL[a.action] || a.action) + " · " + a.target,
        sub: a.admin + " · " + a.time
      });
    });
    return out.sort(function(x, y) {
      return y.t - x.t;
    }).slice(0, 6);
  }
  RZ.api.getAlerts().forEach(function(a) {
    out.push({
      t: RZ.timeKey(a.time),
      color: RZ.ALERT_COLOR[a.k] || "var(--mid)",
      text: a.title,
      sub: a.time
    });
  });
  RZ.api.getMyReports().forEach(function(d) {
    out.push({
      t: RZ.timeKey(d.time),
      color: RZ.SEV_COLOR[d.sev] || "var(--mid)",
      text: "คุณแจ้ง " + RZ.catName(d),
      sub: d.loc + " · " + d.time
    });
  });
  return out.sort(function(x, y) {
    return y.t - x.t;
  }).slice(0, 6);
};

RZ.renderProfile = function() {
  if (!RZ.session) return;
  var s = RZ.session;
  var isAdmin = s.role === "admin";

  var fmEmail = RZ.$("#fmEmail");
  if (fmEmail) fmEmail.textContent = s.email || "-";
  if (!RZ.$("#pfName")) return;

  RZ.$("#pfAvatar").textContent = (s.username || s.name || "-").charAt(0);
  RZ.$("#pfName").textContent = s.username || s.name || "-";
  RZ.$("#pfRole").textContent = RZ.ROLES[s.role] || s.role;
  RZ.$("#pfRole").classList.toggle("adm", isAdmin);

  var ident = RZ.$("#pfIdent");
  var bits = [];
  if (s.code && s.code !== "-") bits.push(s.code);
  if (!isAdmin && s.email) bits.push(s.email);
  ident.textContent = bits.join(" · ");
  ident.hidden = bits.length === 0;

  RZ.$("#pfUser").textContent = s.username || "-";
  RZ.$("#pfCode").textContent = s.code || "-";
  RZ.$("#pfCodeRow").hidden = !s.code || s.code === "-";
  RZ.$("#pfMail").textContent = s.email || "-";
  RZ.$("#pfMailRow").hidden = isAdmin || !s.email;

  var tiles, mine;
  if (isAdmin) {
    var all = RZ.DATA || [];
    RZ.$("#pfImpactH").textContent = "ภาพรวมงานตรวจสอบ";
    tiles = [ [ RZ.api.getPendingReports().length, "รอตรวจสอบ" ], [ all.filter(function(d) {
      return d.approved === true && d.stage !== "reject";
    }).length, "อนุมัติแล้ว" ], [ all.filter(function(d) {
      return d.stage === "reject";
    }).length, "ไม่อนุมัติ" ], [ all.length, "รายงานในระบบ" ] ];
    RZ.$("#pfMore").textContent = "ดูประวัติการจัดการทั้งหมด";
    RZ.$("#pfMoreWrap").hidden = false;
  } else {
    mine = RZ.api.getMyReports();
    RZ.$("#pfImpactH").textContent = "ผลจากการแจ้งของคุณ";
    tiles = [ [ mine.filter(function(d) {
      return d.stage === "done";
    }).length, "เรื่องที่แก้ไขแล้ว" ], [ mine.reduce(function(sum, d) {
      return sum + (d.conf || 0);
    }, 0), "คนยืนยันว่าเจอเหมือนกัน" ], [ mine.length, "รายงานทั้งหมด" ], [ mine.filter(function(d) {
      return d.stage !== "done" && d.stage !== "reject";
    }).length, "กำลังดำเนินการ" ] ];
    RZ.$("#pfMore").textContent = "ดูรายงานทั้งหมด " + mine.length + " รายการ";
    RZ.$("#pfMoreWrap").hidden = mine.length === 0;
  }

  RZ.$("#pfBigStat").innerHTML = tiles.map(function(t) {
    return "<div><b>" + t[0] + "</b><span>" + RZ.esc(t[1]) + "</span></div>";
  }).join("");

  var spotEl = RZ.$("#pfTopSpot");
  spotEl.innerHTML = '<i class="spotdot ok"></i><span>สถานะบัญชี <b>ใช้งานได้ปกติ</b></span>';
  spotEl.hidden = false;

  RZ.$("#pfEmpty").hidden = isAdmin || mine.length > 0;

  var items = RZ.buildTimeline(isAdmin);
  RZ.$("#pfTimeline").innerHTML = items.length ? items.map(function(it) {
    return '<div><i style="background:' + it.color + '"></i>' + "<span><b>" + RZ.esc(it.text) + "</b>" + "<span>" + RZ.esc(it.sub) + "</span></span></div>";
  }).join("") : '<p class="pfempty">ยังไม่มีกิจกรรม</p>';
};

RZ.initProfile = function() {
  var b = RZ.$("#pfMore");
  if (b) b.addEventListener("click", function() {
    RZ.go(RZ.isAdmin() ? "admin-audit" : "reports");
  });
};
RZ.userMenuOpen = false;

RZ.setUserMenu = function(open) {
  var box = RZ.$("#userMenu");
  var btn = RZ.$("#whoBtn");
  if (!box || !btn) return;
  RZ.userMenuOpen = !!open;
  box.hidden = !open;
  btn.setAttribute("aria-expanded", open ? "true" : "false");
  if (!open) {
    var c = RZ.$("#umConfirm");
    var w = RZ.$("#umOutWrap");
    if (c) c.hidden = true;
    if (w) w.hidden = false;
  }
};

RZ.renderUserMenu = function() {
  if (!RZ.session || !RZ.$("#umName")) return;
  var s = RZ.session;
  var isAdmin = s.role === "admin";
  var letter = (s.username || s.name || "-").charAt(0);

  RZ.$("#umAvatar").textContent = letter;
  RZ.$("#umName").textContent = s.username || s.name || "-";
  RZ.$("#umCode").textContent = s.code && s.code !== "-" ? s.code : "";
  RZ.$("#umRole").textContent = RZ.ROLES[s.role] || s.role;

  var tiles;
  if (isAdmin) {
    var all = RZ.api.getAllReports ? RZ.api.getAllReports() : RZ.DATA || [];
    tiles = [ [ RZ.api.getPendingReports().length, "รอตรวจสอบ" ], [ all.filter(function(d) {
      return d.approved === true && d.stage !== "reject";
    }).length, "อนุมัติแล้ว" ], [ all.length, "รายงานในระบบ" ] ];
  } else {
    var mine = RZ.api.getMyReports();
    tiles = [ [ mine.length, "แจ้งทั้งหมด" ], [ mine.filter(function(d) {
      return d.stage === "done";
    }).length, "ปิดเรื่องแล้ว" ], [ mine.filter(function(d) {
      return d.stage !== "done" && d.stage !== "reject";
    }).length, "กำลังดำเนินการ" ] ];
  }

  RZ.$("#umStats").innerHTML = tiles.map(function(t) {
    return "<div><b>" + t[0] + "</b><span>" + RZ.esc(t[1]) + "</span></div>";
  }).join("");

  var badge = RZ.$("#umBadge");
  if (badge) {
    var n = RZ.api.countUnread();
    badge.textContent = n;
    badge.hidden = !(n > 0);
  }
};

RZ.doLogout = function() {
  if (RZ.LIVE) {
    RZ.api._post("api/auth.php?action=logout").catch(function() {});
  }
  RZ.session = null;
  RZ.me = "";
  RZ.csrf = "";
  RZ.setUserMenu(false);
  RZ.showLogin();
};

RZ.initUserMenu = function() {
  var btn = RZ.$("#whoBtn");
  if (!btn) return;

  btn.addEventListener("click", function(e) {
    e.stopPropagation();
    RZ.setUserMenu(!RZ.userMenuOpen);
  });

  RZ.$$("#userMenu [data-go]").forEach(function(b) {
    b.addEventListener("click", function() {
      RZ.setUserMenu(false);
    });
  });

  RZ.$("#umLogout").addEventListener("click", function() {
    RZ.$("#umOutWrap").hidden = true;
    RZ.$("#umConfirm").hidden = false;
  });

  RZ.$("#umLogoutNo").addEventListener("click", function() {
    RZ.$("#umConfirm").hidden = true;
    RZ.$("#umOutWrap").hidden = false;
  });

  RZ.$("#umLogoutYes").addEventListener("click", RZ.doLogout);

  document.addEventListener("click", function(e) {
    if (!RZ.userMenuOpen) return;
    if (e.target.closest("#userMenu") || e.target.closest("#whoBtn")) return;
    RZ.setUserMenu(false);
  });

  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && RZ.userMenuOpen) {
      RZ.setUserMenu(false);
      RZ.$("#whoBtn").focus();
    }
  });
};
