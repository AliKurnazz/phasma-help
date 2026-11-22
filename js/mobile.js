// Phone experience: bottom navigation, keep-screen-on, install + offline.
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);

  // ---------- bottom navigation (phones only, CSS decides visibility) ----------
  const nav = document.querySelector(".bottom-nav");
  function setView(v) {
    if (v === "maps") { window.PHMaps && window.PHMaps.open(); return; }
    document.body.dataset.view = v;
    nav.querySelectorAll("button[data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === v));
    window.scrollTo({ top: 0 });
  }
  nav.querySelectorAll("button[data-view]").forEach((b) => { b.onclick = () => setView(b.dataset.view); });
  // ?view=journal|ghosts|tools opens that section (handy as a home-screen bookmark)
  const startView = new URLSearchParams(location.search).get("view");
  setView(["journal", "ghosts", "tools"].includes(startView) ? startView : "ghosts");

  // Badge with the number of ghosts left.
  const badge = () => {
    const n = window.PH.possible().length;
    $("#nav-count").textContent = n;
  };
  window.PH.onChange(badge);
  document.addEventListener("ph:remote", badge);
  badge();

  // ---------- search toggle (phone header) ----------
  $("#search-btn").onclick = () => {
    const on = document.body.classList.toggle("searching");
    if (on) { setView("ghosts"); $("#search").focus(); }
    else { $("#search").value = ""; window.PH.search(""); }
  };

  // ---------- floating timers: visible from any section ----------
  const dock = $("#timer-dock");
  const KEYS = { Smudge: "s", Cooldown: "c", Hunt: "h" };
  const NEXT = { // upcoming marker text per timer
    Smudge: [[60, "Demon"], [90, "Normal"], [180, "Spirit"]],
    Cooldown: [[20, "Demon"], [25, "Others"]],
    Hunt: [[20, "Short"], [40, "Medium"], [60, "Long"]],
  };
  const running = new Map(); // name -> start time
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  document.addEventListener("ph:timer", (e) => {
    const { name, running: on } = e.detail;
    if (on) running.set(name, performance.now()); else running.delete(name);
    drawDock();
  });
  function drawDock() {
    dock.innerHTML = "";
    running.forEach((t0, name) => {
      const s = (performance.now() - t0) / 1000;
      const next = NEXT[name].find(([t]) => t > s);
      const b = document.createElement("button");
      b.className = "dock-chip" + (next ? "" : " done");
      const n = document.createElement("span"); n.textContent = name;
      const c = document.createElement("b"); c.textContent = fmt(s);
      const x = document.createElement("small");
      x.textContent = next ? `${next[1]} in ${Math.ceil(next[0] - s)}s` : "all clear";
      b.append(n, c, x);
      b.title = "Tap to stop";
      b.onclick = () => window.PH.timers[KEYS[name]].toggle();
      dock.append(b);
      // timers stop themselves at their max; mirror that here
      if (!next && s > NEXT[name][NEXT[name].length - 1][0] + 1) running.delete(name);
    });
  }
  setInterval(() => { if (running.size) drawDock(); }, 250);

  // ---------- swipe left / right between sections ----------
  const ORDER = ["journal", "ghosts", "tools"];
  let sx = 0, sy = 0, st = 0, swiping = false;
  const main = document.querySelector("main");
  main.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1 || e.target.closest("input, select, textarea, .tap-btn, .track")) { swiping = false; return; }
    swiping = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
  }, { passive: true });
  main.addEventListener("touchend", (e) => {
    if (!swiping) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6 || Date.now() - st > 600) return;
    const i = ORDER.indexOf(document.body.dataset.view);
    const j = i + (dx < 0 ? 1 : -1);
    if (j >= 0 && j < ORDER.length) setView(ORDER[j]);
  }, { passive: true });

  // ---------- keep the screen on during a match ----------
  const wakeBtn = $("#wake-btn");
  let lock = null, wantLock = false;
  if ("wakeLock" in navigator) {
    wakeBtn.hidden = false;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        lock.addEventListener("release", () => { lock = null; render(); });
      } catch (_) { wantLock = false; }
      render();
    };
    const render = () => wakeBtn.classList.toggle("on", !!lock);
    wakeBtn.onclick = async () => {
      wantLock = !lock;
      if (lock) { await lock.release(); lock = null; render(); } else acquire();
    };
    // The lock drops when the tab is hidden; take it back on return.
    document.addEventListener("visibilitychange", () => {
      if (wantLock && !lock && document.visibilityState === "visible") acquire();
    });
  }

  // ---------- install as an app ----------
  let deferred = null;
  const installBtn = $("#install-btn");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    installBtn.hidden = false;
  });
  installBtn.onclick = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    deferred = null;
    installBtn.hidden = true;
  };
  window.addEventListener("appinstalled", () => { installBtn.hidden = true; });

  // ---------- offline support ----------
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
