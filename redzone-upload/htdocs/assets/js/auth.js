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
    return "ชื่อผู้ใช้ต้องยาว " + R.usernameMin + "-" + R.usernameMax + " ตัวอักษร";
  }
  if (!R.usernamePattern.test(username)) {
    return "ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 จุด และขีดล่าง";
  }
  if (!RZ.LIVE && RZ.usernameTaken(username)) {
    return "ชื่อผู้ใช้นี้มีคนใช้แล้ว กรุณาเลือกชื่ออื่น";
  }
  if (!/^[0-9]+$/.test(code) || code.length < R.codeMin || code.length > R.codeMax) {
    return "รหัสนักศึกษา/บุคลากร ต้องเป็นตัวเลข " + R.codeMin + "-" + R.codeMax + " หลัก";
  }
  if (pw.length < R.passwordMin) {
    return "รหัสผ่านต้องยาวอย่างน้อย " + R.passwordMin + " ตัวอักษร";
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
  RZ.$(".avatar").textContent = RZ.session.name.charAt(0);
  RZ.$(".who-t b").textContent = RZ.session.name + " (" + RZ.ROLES[role] + ")";
  RZ.$(".who-t span").textContent = RZ.session.code;
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
        msg("lgError", err.message || "เข้าสู่ระบบไม่สำเร็จ");
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
      msg("lgError", "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
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
    RZ.$("#rg-mail").textContent = code ? "อีเมลของระบบ: s" + code + RZ.SIGNUP_RULES.mailDomain : "อีเมลของระบบจะสร้างจากรหัสนี้ให้อัตโนมัติ";
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
        msg("lgOk", out.message || "สร้างบัญชีเรียบร้อย — เข้าสู่ระบบได้เลย");
      }).catch(function(err) {
        msg("rgError", err.message || "สมัครสมาชิกไม่สำเร็จ");
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
    msg("lgOk", "สร้างบัญชีเรียบร้อย — เข้าสู่ระบบด้วยรหัสผ่านที่ตั้งไว้ได้เลย");
    if (RZ.isAdmin()) RZ.renderAdminAll();
  });
};
