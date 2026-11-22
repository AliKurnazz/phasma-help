// Map viewer: zoom/pan floor plans and drop marks.
// Floor plan images go in /maps/<id>.png (or .jpg / .webp).
(() => {
  "use strict";

  const MAPS = [
    { id: "tanglewood",  name: "6 Tanglewood Drive",         size: "Small" },
    { id: "edgefield",   name: "42 Edgefield Road",          size: "Small" },
    { id: "ridgeview",   name: "10 Ridgeview Court",         size: "Small" },
    { id: "willow",      name: "13 Willow Street",           size: "Small" },
    { id: "grafton",     name: "Grafton Farmhouse",          size: "Small" },
    { id: "bleasdale",   name: "Bleasdale Farmhouse",        size: "Small" },
    { id: "woodwind",    name: "Camp Woodwind",              size: "Small" },
    { id: "pointhope",   name: "Point Hope",                 size: "Small" },
    { id: "nells",       name: "Nell's Diner",               size: "Small" },
    { id: "maple",       name: "Maple Lodge Campsite",       size: "Medium" },
    { id: "restricted",  name: "Sunny Meadows Restricted",   size: "Medium" },
    { id: "brownstone",  name: "Brownstone High School",     size: "Large" },
    { id: "prison",      name: "Prison",                     size: "Large" },
    { id: "sunny",       name: "Sunny Meadows Mental Institution", size: "Large" },
  ];
  const EXTS = ["svg", "png", "jpg", "webp"]; // our own drawings (svg) win
  const PIN_TYPES = [
    { icon: "👻", label: "Ghost room" },
    { icon: "🦴", label: "Bone" },
    { icon: "🔮", label: "Cursed object" },
    { icon: "⚡", label: "Fuse box" },
    { icon: "📍", label: "Note" },
  ];
  const KEY = "phasma-help:maps";

  const $ = (s) => document.querySelector(s);
  let store = { current: "tanglewood", pins: {} };
  try { Object.assign(store, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (_) {} };

  const dlg = $("#maps"), view = $("#map-view"), stage = $("#map-stage"),
        img = $("#map-img"), pinsBox = $("#map-pins"), missing = $("#map-missing");

  let zoom = 1, tx = 0, ty = 0, loaded = false;

  // ---------- list ----------
  function renderList() {
    const box = $("#map-list");
    box.innerHTML = "";
    let lastSize = null;
    MAPS.forEach((m) => {
      if (m.size !== lastSize) {
        const h = document.createElement("div");
        h.className = "map-group";
        h.textContent = m.size;
        box.append(h);
        lastSize = m.size;
      }
      const b = document.createElement("button");
      b.className = "map-item" + (m.id === store.current ? " on" : "");
      b.textContent = m.name;
      const n = (store.pins[m.id] || []).length;
      if (n) { const s = document.createElement("span"); s.textContent = n; b.append(s); }
      b.onclick = () => select(m.id);
      box.append(b);
    });
  }

  // ---------- image loading ----------
  function select(id) {
    store.current = id;
    save();
    const m = MAPS.find((x) => x.id === id) || MAPS[0];
    $("#map-title").textContent = m.name;
    $("#map-meta").textContent = `${m.size} map`;
    renderList();
    loadImage(m, 0);
  }

  function loadImage(m, i) {
    loaded = false;
    if (i >= EXTS.length) {
      img.hidden = true;
      pinsBox.hidden = true;
      missing.hidden = false;
      missing.innerHTML = "";
      const p = document.createElement("div");
      p.innerHTML = `<b>No floor plan yet for ${m.name}.</b><br>
        Save an image as <code>maps/${m.id}.png</code> (or .jpg / .webp) in the project folder and reopen this map.`;
      missing.append(p);
      return;
    }
    img.onload = () => {
      loaded = true;
      img.hidden = false;
      pinsBox.hidden = false;
      missing.hidden = true;
      fit();
      renderPins();
    };
    img.onerror = () => loadImage(m, i + 1);
    img.src = `maps/${m.id}.${EXTS[i]}`;
  }

  // ---------- pan / zoom ----------
  function apply() {
    stage.style.transform = `translate(${tx}px, ${ty}px) scale(${zoom})`;
    stage.style.setProperty("--inv", 1 / zoom);
  }
  function fit() {
    if (!loaded) return;
    const r = view.getBoundingClientRect();
    zoom = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight) * 0.95;
    tx = (r.width - img.naturalWidth * zoom) / 2;
    ty = (r.height - img.naturalHeight * zoom) / 2;
    apply();
  }
  function zoomAt(factor, cx, cy) {
    const nz = Math.min(8, Math.max(0.05, zoom * factor));
    tx = cx - ((cx - tx) * nz) / zoom;
    ty = cy - ((cy - ty) * nz) / zoom;
    zoom = nz;
    apply();
  }
  const centre = () => { const r = view.getBoundingClientRect(); return [r.width / 2, r.height / 2]; };

  view.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = view.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  // One finger / mouse drags; two fingers pinch-zoom.
  let drag = null, pinch = null;
  const pts = new Map();
  const local = (x, y) => { const r = view.getBoundingClientRect(); return [x - r.left, y - r.top]; };
  const pinchInfo = () => {
    const [a, b] = [...pts.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  };
  view.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest(".pin")) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    view.setPointerCapture(e.pointerId);
    if (pts.size === 2) { drag = null; pinch = pinchInfo(); }
    else if (pts.size === 1) { drag = { x: e.clientX, y: e.clientY, tx, ty }; view.classList.add("dragging"); }
  });
  view.addEventListener("pointermove", (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size === 2) {
      const now = pinchInfo();
      const [cx, cy] = local(now.cx, now.cy);
      // pan with the midpoint, zoom with the finger distance
      tx += now.cx - pinch.cx; ty += now.cy - pinch.cy;
      zoomAt(now.d / pinch.d, cx, cy);
      pinch = now;
    } else if (drag) {
      tx = drag.tx + e.clientX - drag.x;
      ty = drag.ty + e.clientY - drag.y;
      apply();
    }
  });
  const endDrag = (e) => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (pts.size === 1) { const p = [...pts.values()][0]; drag = { x: p.x, y: p.y, tx, ty }; }
    if (!pts.size) { drag = null; view.classList.remove("dragging"); }
  };
  view.addEventListener("pointerup", endDrag);
  view.addEventListener("pointercancel", endDrag);

  // ---------- pins ----------
  const pins = () => (store.pins[store.current] ||= []);

  view.addEventListener("dblclick", (e) => {
    if (!loaded || e.target.closest(".pin")) return;
    const r = img.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    pins().push({ x, y, t: 0 });
    save(); renderPins(); renderList();
  });

  function renderPins() {
    pinsBox.innerHTML = "";
    pins().forEach((p, i) => {
      const type = PIN_TYPES[p.t % PIN_TYPES.length];
      const b = document.createElement("button");
      b.className = "pin";
      b.style.left = p.x * 100 + "%";
      b.style.top = p.y * 100 + "%";
      b.textContent = type.icon;
      b.title = `${type.label} (click: change type, right-click: delete)`;
      b.onclick = () => { p.t = (p.t + 1) % PIN_TYPES.length; save(); renderPins(); };
      b.oncontextmenu = (e) => { e.preventDefault(); pins().splice(i, 1); save(); renderPins(); renderList(); };
      pinsBox.append(b);
    });
  }

  // ---------- controls ----------
  $("#map-zoom-in").onclick = () => zoomAt(1.25, ...centre());
  $("#map-zoom-out").onclick = () => zoomAt(1 / 1.25, ...centre());
  $("#map-zoom-reset").onclick = fit;
  $("#map-clear-pins").onclick = () => { store.pins[store.current] = []; save(); renderPins(); renderList(); };
  $("#map-close").onclick = () => dlg.close();
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener("keydown", (e) => {
    if (e.key === "+" || e.key === "=") zoomAt(1.25, ...centre());
    else if (e.key === "-") zoomAt(1 / 1.25, ...centre());
    else if (e.key === "0") fit();
    else if (e.key.toLowerCase() === "m") dlg.close();
  });
  window.addEventListener("resize", () => { if (dlg.open) fit(); });
  // Refit once the viewer actually has a size (e.g. right after the dialog opens on a phone).
  let lastW = 0;
  new ResizeObserver(() => {
    const w = view.clientWidth;
    if (w && Math.abs(w - lastW) > 2) { lastW = w; fit(); }
  }).observe(view);

  function open(id) {
    if (!dlg.open) dlg.showModal();
    select(id || store.current);
  }
  const toggle = () => (dlg.open ? dlg.close() : open());
  $("#map-btn").onclick = toggle;

  // Fuzzy find a map by spoken/typed name.
  function find(text) {
    const t = text.toLowerCase();
    return MAPS.find((m) => m.name.toLowerCase().includes(t) || t.includes(m.id) ||
      m.name.toLowerCase().split(/\s+/).some((w) => w.length > 3 && t.includes(w)));
  }

  window.PHMaps = { open, close: () => dlg.close(), toggle, find, MAPS };
})();
