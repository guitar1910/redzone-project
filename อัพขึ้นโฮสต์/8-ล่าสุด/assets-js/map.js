window.RZ = window.RZ || {};

RZ.MAP_CENTER = RZ.SCOPE.center;

RZ.MAP_ZOOM = 12;

RZ.hasLeaflet = typeof L !== "undefined";

RZ.map = null;

RZ.pinLayer = null;

RZ.zoneLayer = null;

RZ.distanceM = function(lat1, lng1, lat2, lng2) {
  var R = 6371e3;
  var rad = Math.PI / 180;
  var dLat = (lat2 - lat1) * rad;
  var dLng = (lng2 - lng1) * rad;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

RZ.inScope = function(lat, lng) {
  return RZ.distanceM(lat, lng, RZ.SCOPE.center[0], RZ.SCOPE.center[1]) <= RZ.SCOPE.radius;
};

RZ.distanceText = function(lat, lng) {
  var m = RZ.distanceM(lat, lng, RZ.SCOPE.center[0], RZ.SCOPE.center[1]);
  return m < 1e3 ? Math.round(m) + " ม. จาก มจพ." : (m / 1e3).toFixed(1) + " กม. จาก มจพ.";
};

RZ.drawScope = function(map, clamp) {
  if (!map) return null;
  var ring = L.circle(RZ.SCOPE.center, {
    radius: RZ.SCOPE.radius,
    color: "#8a8a8a",
    weight: 1.5,
    dashArray: "8 6",
    fill: false,
    interactive: false
  }).addTo(map);
  if (clamp) {
    var b = ring.getBounds();
    map.setMaxBounds(b.pad(.08));
    map.setMinZoom(map.getBoundsZoom(b) - 1);
  }
  return ring;
};

RZ.newMap = function(el, opts) {
  if (!RZ.hasLeaflet) return null;
  opts = opts || {};
  var map = L.map(el, {
    center: opts.center || RZ.MAP_CENTER,
    zoom: opts.zoom || RZ.MAP_ZOOM,
    zoomControl: true,
    scrollWheelZoom: true,
    attributionControl: true
  });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  RZ.watchMapSize(map);
  return map;
};

RZ.watchMapSize = function(map) {
  if (!map || typeof ResizeObserver === "undefined") return;
  var box = map.getContainer && map.getContainer();
  if (!box || typeof Element === "undefined" || !(box instanceof Element)) return;
  var timer = null;
  var last = 0;
  var ro = new ResizeObserver(function(entries) {
    var w = entries[0] && entries[0].contentRect ? entries[0].contentRect.width : 0;
    if (!w) return;
    if (Math.abs(w - last) < 1) return;
    last = w;
    clearTimeout(timer);
    timer = setTimeout(function() {
      map.invalidateSize({
        animate: false
      });
    }, 90);
  });
  ro.observe(box);
};

RZ.refreshMaps = function() {
  [ RZ.map, RZ.pickMap ].forEach(function(m) {
    if (!m || !m.getContainer) return;
    var box = m.getContainer();
    if (!box || typeof Element === "undefined" || !(box instanceof Element)) return;
    if (!box.offsetWidth) return;
    m.invalidateSize({
      animate: false
    });
  });
};

RZ.visible = function(d) {
  if (RZ.state.sev !== "all" && d.sev !== RZ.state.sev) return false;
  var q = RZ.state.q;
  if (!q) return true;
  var hay = (d.id + " " + d.title + " " + d.loc + " " + RZ.catName(d) + " " + (d.note || "")).toLowerCase();
  return hay.indexOf(q) > -1;
};

RZ.renderPins = function() {
  if (!RZ.pinLayer) return;
  RZ.pinLayer.clearLayers();
  RZ.api.getIncidents().forEach(function(d) {
    if (!RZ.visible(d)) return;
    if (typeof d.lat !== "number") return;
    var selected = RZ.state.sel === d.id;
    var color = RZ.sevColor(d.sev);
    var marker = L.circleMarker([ d.lat, d.lng ], {
      radius: selected ? 12 : 8,
      color: "#ffffff",
      weight: selected ? 3 : 2,
      fillColor: color,
      fillOpacity: 1,
      className: "rz-pin"
    });
    marker.bindTooltip(RZ.esc(d.title) + " · " + RZ.esc(RZ.distanceText(d.lat, d.lng)), {
      direction: "top",
      offset: [ 0, -10 ]
    });
    marker.on("click", function() {
      RZ.pick(d.id);
    });
    marker.addTo(RZ.pinLayer);
  });
};

RZ.sevColor = function(sev) {
  var v = getComputedStyle(document.documentElement).getPropertyValue("--" + sev).trim();
  return v || "#888888";
};

RZ.renderZones = function() {
  if (!RZ.zoneLayer) return;
  RZ.zoneLayer.clearLayers();
  RZ.ZONES.forEach(function(z) {
    var color = RZ.sevColor(z.level);
    L.circle([ z.lat, z.lng ], {
      radius: z.radius,
      color: color,
      weight: 1.5,
      dashArray: "5 5",
      fillColor: color,
      fillOpacity: .14
    }).bindPopup('<b>' + RZ.esc(z.name) + "</b><br>" + "ระดับ: " + RZ.esc(RZ.SEVT[z.level]) + "<br>" + "รายงานใน 30 วัน: " + z.count + " ครั้ง<br>" + "รัศมี: " + z.radius + " เมตร").addTo(RZ.zoneLayer);
  });
};

RZ.focusIncident = function(d) {
  if (!RZ.map || !d || typeof d.lat !== "number") return;
  RZ.map.panTo([ d.lat, d.lng ], {
    animate: true
  });
};

RZ.mapFallback = function(elId) {
  var el = RZ.$("#" + elId);
  if (el) {
    el.innerHTML = '<div class="mapoff">' + "<b>โหลดแผนที่ไม่ได้</b>" + "<span>แผนที่ใช้ Leaflet + OpenStreetMap ซึ่งต้องต่ออินเทอร์เน็ต " + "ส่วนอื่นของเว็บยังใช้งานและสาธิตได้ปกติ</span>" + "</div>";
  }
};

RZ.initMap = function() {
  if (!RZ.hasLeaflet) {
    RZ.mapFallback("mapCanvas");
    RZ.$("#zoneToggle").disabled = true;
  }
  RZ.map = RZ.newMap("mapCanvas");
  if (!RZ.map) {
    RZ.initMapControls();
    return;
  }
  var scope = RZ.drawScope(RZ.map, true);
  RZ.map.fitBounds(scope.getBounds(), {
    padding: [ 16, 16 ]
  });
  RZ.zoneLayer = L.layerGroup().addTo(RZ.map);
  RZ.pinLayer = L.layerGroup().addTo(RZ.map);
  RZ.renderZones();
  var zt = RZ.$("#zoneToggle");
  zt.addEventListener("click", function() {
    var on = zt.getAttribute("aria-pressed") !== "true";
    zt.setAttribute("aria-pressed", on);
    if (on) RZ.map.addLayer(RZ.zoneLayer); else RZ.map.removeLayer(RZ.zoneLayer);
  });
  RZ.initMapControls();
};

RZ.initMapControls = function() {
  RZ.$$("#sevFilter .chip").forEach(function(chip) {
    chip.addEventListener("click", function() {
      RZ.state.sev = chip.getAttribute("data-sev");
      RZ.$$("#sevFilter .chip").forEach(function(o) {
        o.setAttribute("aria-pressed", o === chip);
      });
      RZ.renderPins();
      RZ.renderFeed();
    });
  });
  RZ.$("#q").addEventListener("input", function(e) {
    RZ.state.q = e.target.value.trim().toLowerCase();
    RZ.renderPins();
    RZ.renderFeed();
  });
};

RZ.PIN_SVG = '<svg viewBox="0 0 32 44" width="32" height="44" aria-hidden="true">' +
  '<ellipse cx="16" cy="41" rx="6" ry="2.4" fill="rgba(0,0,0,.38)"/>' +
  '<path d="M16 1.5c-7.5 0-13.5 6-13.5 13.5 0 9.6 11.3 21.2 12.7 22.6a1.1 1.1 0 0 0 1.6 0' +
  'C18.2 36.2 29.5 24.6 29.5 15 29.5 7.5 23.5 1.5 16 1.5Z" ' +
  'fill="var(--pin-fill)" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>' +
  '<circle cx="16" cy="15" r="4.6" fill="#fff"/>' +
  '</svg>';

RZ.newPin = function (latlng) {
  if (!RZ.hasLeaflet) return null;

  if (!L.divIcon) {
    return L.circleMarker(latlng, {
      radius: 10, color: "#ffffff", weight: 3,
      fillColor: RZ.sevColor("high"), fillOpacity: 1
    });
  }

  var icon = L.divIcon({
    className: "rz-droppin",
    html: '<span class="rz-droppin-pulse"></span>' + RZ.PIN_SVG,
    iconSize: [ 32, 44 ],
    iconAnchor: [ 16, 42 ]
  });

  return L.marker(latlng, { icon: icon, keyboard: false, interactive: false });
};
RZ.LEGEND_KEY = "rz.legend.hidden";

RZ.setLegend = function(show, remember) {
  var box = RZ.$("#mapLegend");
  var btn = RZ.$("#legendShow");
  if (!box || !btn) return;
  box.hidden = !show;
  btn.hidden = !!show;
  if (remember) {
    try {
      if (show) {
        localStorage.removeItem(RZ.LEGEND_KEY);
      } else {
        localStorage.setItem(RZ.LEGEND_KEY, "1");
      }
    } catch (e) {}
  }
};

RZ.initLegend = function() {
  var hide = RZ.$("#legendHide");
  var show = RZ.$("#legendShow");
  if (!hide || !show) return;
  hide.addEventListener("click", function() {
    RZ.setLegend(false, true);
  });
  show.addEventListener("click", function() {
    RZ.setLegend(true, true);
  });
  var saved = "";
  try {
    saved = localStorage.getItem(RZ.LEGEND_KEY) || "";
  } catch (e) {}
  RZ.setLegend(saved !== "1", false);
};
