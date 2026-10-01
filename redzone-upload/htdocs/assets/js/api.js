window.RZ = window.RZ || {};

RZ.LIVE = false;

RZ.csrf = "";

RZ.KEY_DATA = "redzone.reports";

RZ.KEY_ALERTS = "redzone.alerts";

RZ.loadStored = function() {
  var saved = RZ.storeGet(RZ.KEY_DATA, null);
  var ver = RZ.storeGet("redzone.version", null);

  if (!saved) {
    RZ.storeSet("redzone.version", RZ.DATA_VERSION);
    RZ.storeSet(RZ.KEY_DATA, RZ.DATA);
    RZ.storeSet(RZ.KEY_ALERTS, RZ.ALERTS);
    return;
  }

  if (ver !== RZ.DATA_VERSION) {
    var sampleId = {};
    RZ.DATA.forEach(function(d) {
      sampleId[d.id] = true;
    });

    var mine = saved.filter(function(d) {
      return d && !sampleId[d.id];
    });

    for (var i = mine.length - 1; i >= 0; i--) RZ.DATA.unshift(mine[i]);

    var keepId = {};
    mine.forEach(function(d) {
      keepId[d.id] = true;
    });
    var savedA = RZ.storeGet(RZ.KEY_ALERTS, null) || [];
    savedA.forEach(function(a) {
      if (a && a.ref && keepId[a.ref]) RZ.ALERTS.unshift(a);
    });

    RZ.storeSet("redzone.version", RZ.DATA_VERSION);
    RZ.storeSet(RZ.KEY_DATA, RZ.DATA);
    RZ.storeSet(RZ.KEY_ALERTS, RZ.ALERTS);
    return;
  }

  RZ.DATA.length = 0;
  saved.forEach(function(d) {
    RZ.DATA.push(d);
  });
  var savedAlerts = RZ.storeGet(RZ.KEY_ALERTS, null);
  if (savedAlerts) {
    RZ.ALERTS.length = 0;
    savedAlerts.forEach(function(a) {
      RZ.ALERTS.push(a);
    });
  }
};

RZ.resetDemo = function() {
  try {
    localStorage.removeItem(RZ.KEY_DATA);
    localStorage.removeItem(RZ.KEY_ALERTS);
    localStorage.removeItem("redzone.version");
  } catch (e) {}
  location.reload();
};

RZ.api = {
  _save: function() {
    if (RZ.LIVE) return;
    RZ.storeSet(RZ.KEY_DATA, RZ.DATA);
    RZ.storeSet(RZ.KEY_ALERTS, RZ.ALERTS);
  },
  _fetch: function(path, options) {
    var opt = options || {};
    opt.credentials = "same-origin";
    opt.headers = opt.headers || {};
    if (opt.body) opt.headers["Content-Type"] = "application/json";
    if (RZ.csrf) opt.headers["X-CSRF-Token"] = RZ.csrf;
    return fetch(path, opt).then(function(r) {
      return r.json().catch(function() {
        throw new Error("ไม่ใช่ JSON — เซิร์ฟเวอร์ไม่ได้รัน PHP");
      }).then(function(data) {
        if (!r.ok) {
          var err = new Error(data.error || "HTTP " + r.status);
          err.status = r.status;
          throw err;
        }
        return data;
      });
    });
  },
  _post: function(path, body) {
    return this._fetch(path, {
      method: "POST",
      body: JSON.stringify(body || {})
    });
  },
  _fill: function(d) {
    var swap = function(target, rows) {
      target.length = 0;
      (rows || []).forEach(function(x) {
        target.push(x);
      });
    };
    swap(RZ.DATA, d.reports);
    swap(RZ.ALERTS, d.alerts);
    swap(RZ.USERS, d.users);
    swap(RZ.AUDIT, d.audit);
    if (d.csrf) RZ.csrf = d.csrf;
    RZ.session = d.me;
    RZ.me = d.me ? d.me.name : "";
  },
  boot: function() {
    var self = this;
    return this._fetch("api/bootstrap.php").then(function(d) {
      RZ.LIVE = true;
      self._fill(d);
      return "live-in";
    }).catch(function(e) {
      if (e.status === 401 || e.status === 403 || e.status === 419) {
        RZ.LIVE = true;
        RZ.session = null;
        RZ.me = "";
        RZ.csrf = "";
        return "live-out";
      }
      RZ.LIVE = false;
      RZ.csrf = "";
      console.info("ไม่พบ PHP — ใช้โหมดต้นแบบด้วยข้อมูลจำลอง (" + e.message + ")");
      RZ.loadStored();
      return "mock";
    });
  },
  refresh: function() {
    if (!RZ.LIVE) return Promise.resolve();
    var self = this;
    return this._fetch("api/bootstrap.php").then(function(d) {
      self._fill(d);
      RZ.renderAll();
    });
  },
  _sync: function(promise) {
    var self = this;
    return promise.then(function() {
      return self.refresh();
    }).catch(function(e) {
      console.error("บันทึกลงฐานข้อมูลไม่สำเร็จ:", e.message);
      alert("บันทึกไม่สำเร็จ: " + e.message);
      return self.refresh();
    });
  },
  getIncidents: function() {
    return RZ.DATA.filter(function(d) {
      return d.approved === true && d.stage !== "reject";
    });
  },
  getAllReports: function() {
    return RZ.DATA;
  },
  getPendingReports: function() {
    return RZ.DATA.filter(function(d) {
      return !d.approved && d.stage !== "reject";
    });
  },
  getMyReports: function() {
    if (!RZ.session) return [];
    var meId = RZ.session.userId;
    return RZ.DATA.filter(function(d) {
      return d.reporterId === meId;
    });
  },
  findIncident: function(id) {
    var found = null;
    RZ.DATA.forEach(function(d) {
      if (d.id === id) found = d;
    });
    return found;
  },
  createReport: function(payload) {
    if (RZ.LIVE) {
      var self = this;
      return this._post("api/reports.php", payload).then(function(res) {
        return self.refresh().then(function() {
          return self.findIncident(res.id) || {
            id: res.id
          };
        });
      });
    }
    var cat = RZ.catOf(payload.cat);
    var row = {
      id: "RZ-2569-0" + RZ.nextReportNo(),
      sev: payload.sev,
      cat: payload.cat,
      catOther: payload.catOther || "",
      lat: payload.lat,
      lng: payload.lng,
      reporterId: payload.anonymous ? null : RZ.session.userId,
      reporter: payload.anonymous ? null : RZ.session.name,
      anon: !!payload.anonymous,
      stage: "prog",
      approved: false,
      conf: 1,
      title: (payload.catOther || cat.name) + " — " + payload.loc,
      loc: payload.loc,
      note: payload.desc || "(ไม่ได้กรอกรายละเอียด)",
      time: RZ.thaiTime(payload.when),
      comments: []
    };
    RZ.DATA.unshift(row);
    this._save();
    return row;
  },
  confirmIncident: function(id) {
    if (RZ.LIVE) {
      return this._sync(this._post("api/reports.php?action=confirm&id=" + encodeURIComponent(id)));
    }
    RZ.DATA.forEach(function(d) {
      if (d.id === id) d.conf += 1;
    });
    this._save();
  },
  getComments: function(id) {
    var d = this.findIncident(id);
    return d ? d.comments : [];
  },
  addComment: function(id, text) {
    if (RZ.LIVE) {
      return this._sync(this._post("api/comments.php", {
        report: id,
        text: text
      }));
    }
    var d = this.findIncident(id);
    if (!d) return null;
    var row = {
      by: RZ.me,
      text: text,
      time: RZ.thaiTime()
    };
    d.comments.push(row);
    this._save();
    return row;
  },
  deleteComment: function(id, index) {
    if (RZ.LIVE) {
      var row = this.findIncident(id);
      var c = row && row.comments[index];
      if (!c || !c.id) return Promise.resolve();
      return this._sync(this._post("api/comments.php?action=delete&id=" + c.id));
    }
    var d = this.findIncident(id);
    if (d && d.comments[index]) d.comments.splice(index, 1);
    this._save();
  },
  getAlerts: function() {
    if (!RZ.session) return [];
    var meId = RZ.session.userId;
    return RZ.ALERTS.filter(function(a) {
      return a.userId === meId;
    });
  },
  countUnread: function() {
    return this.getAlerts().filter(function(a) {
      return a.n;
    }).length;
  },
  _needAdmin: function() {
    if (!RZ.isAdmin()) {
      console.warn("เรียกฟังก์ชันของผู้ดูแลระบบโดยไม่มีสิทธิ์ — ถูกปฏิเสธ");
      return false;
    }
    return true;
  },
  _audit: function(action, target, reason) {
    RZ.AUDIT.unshift({
      admin: RZ.session.name,
      action: action,
      target: target,
      reason: reason || "",
      time: RZ.thaiTime()
    });
    this._save();
  },
  approveReport: function(id, reason) {
    if (!this._needAdmin()) return false;
    var d = this.findIncident(id);
    if (!d) return false;
    if (RZ.LIVE) {
      return this._sync(this._post("api/admin.php?action=approve&id=" + encodeURIComponent(id), {
        reason: reason
      }));
    }
    d.approved = true;
    d.stage = "done";
    delete d.rejectReason;
    this._audit("approve_report", id, reason);
    this._notifyReporter(d, "รายงานของคุณดำเนินการเสร็จสมบูรณ์", "ผู้ดูแลระบบตรวจสอบและปิดงาน " + id + " แล้ว ขอบคุณที่ช่วยแจ้ง");
    return true;
  },
  rejectReport: function(id, reason) {
    if (!this._needAdmin()) return false;
    if (!reason) return false;
    var d = this.findIncident(id);
    if (!d) return false;
    if (RZ.LIVE) {
      return this._sync(this._post("api/admin.php?action=reject&id=" + encodeURIComponent(id), {
        reason: reason
      }));
    }
    d.stage = "reject";
    d.rejectReason = reason;
    this._audit("reject_report", id, reason);
    this._notifyReporter(d, "รายงาน " + id + " ไม่ผ่านการตรวจสอบ", reason);
    return true;
  },
  setStatus: function(id, stage) {
    if (!this._needAdmin()) return false;
    var d = this.findIncident(id);
    if (!d) return false;
    if (RZ.LIVE) {
      return this._sync(this._post("api/admin.php?action=set_status&id=" + encodeURIComponent(id), {
        status: stage
      }));
    }
    d.stage = stage;
    d.approved = true;
    this._audit("set_status", id, "เปลี่ยนสถานะเป็น " + RZ.stageName(stage));
    this._notifyReporter(d, "สถานะรายงาน " + id + " เปลี่ยนแล้ว", "สถานะปัจจุบัน: " + RZ.stageName(stage));
    return true;
  },
  deleteReport: function(id, reason) {
    if (!this._needAdmin()) return false;
    if (!reason) return false;
    var i = RZ.DATA.findIndex(function(d) {
      return d.id === id;
    });
    if (i < 0) return false;
    if (RZ.LIVE) {
      return this._sync(this._post("api/admin.php?action=delete_report&id=" + encodeURIComponent(id), {
        reason: reason
      }));
    }
    RZ.DATA.splice(i, 1);
    this._audit("delete_report", id, reason);
    return true;
  },
  getAllComments: function() {
    var out = [];
    RZ.DATA.forEach(function(d) {
      (d.comments || []).forEach(function(c, i) {
        out.push({
          reportId: d.id,
          reportTitle: d.title,
          index: i,
          by: c.by,
          text: c.text,
          time: c.time,
          hidden: !!c.hidden
        });
      });
    });
    return out;
  },
  hideComment: function(reportId, index, reason) {
    if (!this._needAdmin()) return false;
    var d = this.findIncident(reportId);
    if (!d || !d.comments[index]) return false;
    if (RZ.LIVE) {
      var c = d.comments[index];
      if (!c.id) return false;
      return this._sync(this._post("api/admin.php?action=hide_comment&id=" + c.id, {
        reason: reason
      }));
    }
    d.comments[index].hidden = true;
    this._audit("hide_comment", reportId + " #" + (index + 1), reason);
    return true;
  },
  getUsers: function() {
    if (!this._needAdmin()) return [];
    return RZ.USERS;
  },
  setUserActive: function(userId, active, reason) {
    if (!this._needAdmin()) return false;
    var u = null;
    RZ.USERS.forEach(function(x) {
      if (x.id === userId) u = x;
    });
    if (!u) return false;
    if (u.id === RZ.session.userId) return false;
    if (RZ.LIVE) {
      return this._sync(this._post("api/admin.php?action=" + (active ? "unban" : "ban") + "&id=" + userId, {
        reason: reason
      }));
    }
    u.active = active;
    if (active) {
      delete u.banReason;
    } else {
      u.banReason = reason || "";
    }
    this._audit(active ? "unban_user" : "ban_user", u.name, reason);
    return true;
  },
  getAudit: function() {
    if (!this._needAdmin()) return [];
    return RZ.AUDIT;
  },
  _notifyReporter: function(d, title, msg) {
    if (!d.reporterId) return;
    RZ.ALERTS.unshift({
      userId: d.reporterId,
      ref: d.id,
      n: true,
      k: d.stage === "reject" ? "status" : d.stage === "done" ? "done" : "status",
      title: title,
      msg: msg,
      time: RZ.thaiTime()
    });
    this._save();
  }
};
