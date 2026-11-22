(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  const DIFFICULTIES = [
    { n: 3, label: "3 evi" },
    { n: 2, label: "2 evi" },
    { n: 1, label: "1 evi" },
    { n: 0, label: "0 evi" },
  ];
  const SPEEDS = [
    { key: "slow", label: "Slow" },
    { key: "normal", label: "Normal" },
    { key: "fast", label: "Fast" },
  ];
  const STORE_KEY = "phasma-help:v1";
  const DEFAULT_CALIB = 1.7 / 120; // m/s per BPM; user can recalibrate

  // ---------- state ----------
  const fresh = () => ({
    evidence: Object.fromEntries(EVIDENCE.map((e) => [e.key, 0])), // 0 unknown, 1 found, -1 ruled out
    evCount: 3,
    speed: [],
    los: null, // null | "yes" | "no"
    hunt: [],
    manualOut: [],
    guess: null,
    hideOut: false,
    obs: [], // behaviour observations (keys from OBSERVATIONS)
  });

  let state = fresh();
  let calib = DEFAULT_CALIB;
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (saved && saved.state) state = Object.assign(fresh(), saved.state);
    if (saved && saved.calib) calib = saved.calib;
  } catch (_) { /* storage unavailable */ }

  const save = () => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ state, calib })); } catch (_) {}
  };

  // ---------- core logic ----------
  const evName = (k) => EVIDENCE.find((e) => e.key === k).short;

  // Returns null if the ghost is still possible, otherwise a reason string.
  function evidenceReason(g) {
    const n = state.evCount;
    const found = EVIDENCE.filter((e) => state.evidence[e.key] === 1).map((e) => e.key);
    const out = EVIDENCE.filter((e) => state.evidence[e.key] === -1).map((e) => e.key);
    const has = (k) => g.evidence.includes(k) || (g.fakeOrb && k === "orb");

    for (const k of found) if (!has(k)) return `No ${evName(k)}`;

    // Mimic's fake orbs are always visible and don't take a slot.
    if (g.fakeOrb && out.includes("orb")) return "Mimic always shows Orbs";
    const foundReal = found.filter((k) => !(g.fakeOrb && k === "orb"));

    if (foundReal.length > n) return `Only ${n} evidence visible`;

    if (n < 3 && g.forced) {
      if (out.includes(g.forced)) return `${evName(g.forced)} is always shown`;
      if (n >= 1 && foundReal.filter((k) => k !== g.forced).length > n - 1)
        return `${evName(g.forced)} must be one of the ${n}`;
    }

    const hiddenSlots = 3 - n;
    const outOwn = out.filter((k) => g.evidence.includes(k)).length;
    if (outOwn > hiddenSlots) {
      const k = out.find((k) => g.evidence.includes(k));
      return n === 3 ? `Has ${evName(k)}` : `Too many of its evidence ruled out`;
    }
    return null;
  }

  function filterReason(g) {
    const r = evidenceReason(g);
    if (r) return r;
    for (const k of state.obs) {
      const o = OBSERVATIONS.find((x) => x.key === k);
      if (!o) continue;
      if (o.out && o.out.includes(g.name)) return `Can't have: ${o.label.toLowerCase()}`;
      if (o.only && !o.only.includes(g.name)) return `Doesn't fit: ${o.label.toLowerCase()}`;
      if (o.minHunt && Math.max(...g.hunt) < o.minHunt) return "Can't hunt that early";
    }
    if (state.speed.length && !state.speed.some((s) => g.tags.includes(s))) return "Speed doesn't fit";
    if (state.los === "yes" && !g.los) return "No LOS speed-up";
    if (state.los === "no" && g.los && g.name !== "The Mimic") return "Has LOS speed-up";
    if (state.hunt.length && g.name !== "The Mimic" &&
        !state.hunt.some((k) => HUNT_BUCKETS.find((b) => b.key === k).test(g.hunt)))
      return "Hunt sanity doesn't fit";
    return null;
  }

  const isOut = (g) => !!filterReason(g) || state.manualOut.includes(g.name);
  const possibleGhosts = () => GHOSTS.filter((g) => !isOut(g));

  // ---------- render: journal ----------
  function renderDifficulty() {
    const box = $("#difficulty");
    box.innerHTML = "";
    DIFFICULTIES.forEach((d) => {
      const b = el("button", state.evCount === d.n ? "on" : "", d.label);
      b.title = { 3: "Amateur – Professional", 2: "Nightmare", 1: "Insanity", 0: "Apocalypse / custom" }[d.n];
      b.onclick = () => { state.evCount = d.n; update(); };
      box.append(b);
    });
  }

  function cycleEvidence(k, toNo) {
    const v = state.evidence[k];
    state.evidence[k] = toNo ? (v === -1 ? 0 : -1) : v === 0 ? 1 : v === 1 ? -1 : 0;
    if (navigator.vibrate) navigator.vibrate(12);
    update();
  }

  function renderEvidence(possible) {
    const box = $("#evidence");
    box.innerHTML = "";
    EVIDENCE.forEach((e) => {
      const v = state.evidence[e.key];
      const count = possible.filter((g) => g.evidence.includes(e.key) || (g.fakeOrb && e.key === "orb")).length;
      const cls = ["ev", v === 1 ? "yes" : v === -1 ? "no" : "", v === 0 && count === 0 ? "dead" : ""].join(" ");
      const b = el("button", cls,
        `<span class="box">${v === 1 ? "✓" : v === -1 ? "✕" : ""}</span>
         <span class="ev-name">${e.name}</span>
         <span class="count"><kbd>${e.hotkey}</kbd> ${count}</span>`);
      b.title = `${count} remaining ghost(s) can have ${e.name}`;
      bindPress(b, () => cycleEvidence(e.key, false), () => cycleEvidence(e.key, true));
      box.append(b);
    });
    renderQuickEvidence(possible);
  }

  // Tap = cycle, right-click or long-press (phones) = rule out.
  function bindPress(btn, onTap, onLong) {
    let timer = null, longFired = false;
    btn.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      longFired = false;
      timer = setTimeout(() => {
        longFired = true;
        if (navigator.vibrate) navigator.vibrate(30);
        onLong();
      }, 450);
    });
    const cancel = () => clearTimeout(timer);
    btn.addEventListener("pointerup", cancel);
    btn.addEventListener("pointerleave", cancel);
    btn.addEventListener("pointercancel", cancel);
    btn.addEventListener("click", (e) => { if (longFired) { e.preventDefault(); return; } onTap(); });
    btn.addEventListener("contextmenu", (e) => { e.preventDefault(); if (!longFired) onLong(); });
  }

  // Compact evidence strip shown above the ghost list on phones.
  function renderQuickEvidence(possible) {
    const box = $("#quick-ev");
    if (!box) return;
    box.innerHTML = "";
    EVIDENCE.forEach((e) => {
      const v = state.evidence[e.key];
      const count = possible.filter((g) => g.evidence.includes(e.key) || (g.fakeOrb && e.key === "orb")).length;
      const b = el("button", "qev" + (v === 1 ? " yes" : v === -1 ? " no" : "") + (v === 0 && !count ? " dead" : ""));
      b.textContent = e.short;
      b.title = `${e.name} (tap: found, hold: ruled out)`;
      bindPress(b, () => cycleEvidence(e.key, false), () => cycleEvidence(e.key, true));
      box.append(b);
    });
    // 8th cell: ghosts left; tap to jump to the list
    const n = possible.length;
    const left = el("button", "qev qcount" + (n === 1 ? " one" : n === 0 ? " zero" : ""));
    left.append(el("b", null, String(n)), el("span", null, n === 1 ? "ghost" : "left"));
    left.title = "Jump to the ghost list";
    left.onclick = () => $("#summary").scrollIntoView({ behavior: "smooth", block: "center" });
    box.append(left);
  }

  // "Ruled out: …" / "Back in: …" message so you see what each tap changed.
  let lastNames = null, toastTimer = null;
  function announce(possible) {
    const names = possible.map((g) => g.name);
    if (lastNames) {
      const gone = lastNames.filter((x) => !names.includes(x));
      const back = names.filter((x) => !lastNames.includes(x));
      const list = (a) => a.slice(0, 5).join(", ") + (a.length > 5 ? ` +${a.length - 5} more` : "");
      const t = $("#toast");
      const fullReset = !gone.length && names.length === GHOSTS.length;
      if (t && !fullReset && (gone.length || back.length)) {
        t.innerHTML = "";
        if (gone.length) { const p = el("div", "t-out"); p.append(el("b", null, "Ruled out: "), document.createTextNode(list(gone))); t.append(p); }
        if (back.length) { const p = el("div", "t-in"); p.append(el("b", null, "Back in: "), document.createTextNode(list(back))); t.append(p); }
        const c = el("div", "t-left", names.length === 1 ? `Only ${names[0]} left` : `${names.length} left`);
        t.append(c);
        t.hidden = false;
        t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
      }
    }
    lastNames = names;
  }

  function renderObservations() {
    const box = $("#obs");
    if (!box) return;
    box.innerHTML = "";
    OBSERVATIONS.forEach((o) => {
      const on = state.obs.includes(o.key);
      const row = el("label", "obs" + (on ? " on" : ""));
      const cb = el("input");
      cb.type = "checkbox";
      cb.checked = on;
      cb.onchange = () => { toggleIn(state.obs, o.key); update(); };
      row.append(cb, document.createTextNode(o.label));
      box.append(row);
    });
    const n = state.obs.length;
    $("#obs-count").textContent = n ? `${n} ticked` : "";
  }

  // Which unknown evidence splits the remaining ghosts most evenly?
  function renderSuggest(possible) {
    const box = $("#suggest");
    box.innerHTML = "";
    const total = possible.length;
    if (total === 1) {
      box.append(el("div", "sug-done", `It's the <b>${possible[0].name}</b>. Mark it with ★ and get out.`));
      return;
    }
    if (total === 0) {
      // Help find the mistake instead of a dead end.
      const tip = el("div", "sug-zero");
      tip.append(el("b", null, "No ghost fits. Usually one of these:"));
      const ul = el("ul");
      [
        "An evidence marked by mistake: tap it again to clear it.",
        state.evCount === 3 ? "You're on a reduced-evidence difficulty: change it above." : "Check the difficulty above matches your contract.",
        "Orbs + 3 other evidence? That's the Mimic's fake orbs.",
        state.obs.length ? "A ticked behaviour that you weren't sure about." : "",
      ].filter(Boolean).forEach((t) => ul.append(el("li", null, t)));
      tip.append(ul);
      box.append(tip);
      return;
    }

    // 1) the evidence that splits the remaining ghosts best, with how to get it
    const found = Object.values(state.evidence).filter((v) => v === 1).length;
    const evDone = found >= state.evCount && state.evCount > 0;
    const rows = evDone ? [] : EVIDENCE.filter((e) => state.evidence[e.key] === 0)
      .map((e) => {
        const k = possible.filter((g) => g.evidence.includes(e.key)).length;
        return { e, k, score: Math.min(k, total - k) };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    rows.forEach((r, i) => {
      const row = el("div", "sug" + (i === 0 ? " top" : ""));
      row.append(el("span", null, r.e.name), el("span", "n", `${r.k}/${total}`));
      const bar = el("span", "bar");
      const fill = el("i");
      fill.style.width = (r.k / total) * 100 + "%";
      bar.append(fill);
      row.append(bar);
      if (i === 0) row.append(el("p", "how", r.e.how));
      row.title = `If found: ${r.k} left. If ruled out: ${total - r.k} left.`;
      box.append(row);
    });

    // 2) behaviour you could watch for that would rule ghosts out
    const names = possible.map((g) => g.name);
    const watch = OBSERVATIONS.filter((o) => !state.obs.includes(o.key))
      .map((o) => {
        let n = 0;
        if (o.out) n = o.out.filter((x) => names.includes(x)).length;
        else if (o.only) n = names.filter((x) => !o.only.includes(x)).length;
        else if (o.minHunt) n = possible.filter((g) => Math.max(...g.hunt) < o.minHunt).length;
        return { o, n };
      })
      .filter((w) => w.n > 0 && w.n < total)
      .sort((a, b) => (a.o.out ? 0 : 1) - (b.o.out ? 0 : 1) || b.n - a.n)
      .slice(0, 2);
    if (watch.length) {
      const w = el("div", "sug-watch");
      w.append(el("small", null, "Watch for"));
      watch.forEach(({ o, n }) => w.append(el("div", null, `${o.label} → rules out ${n}`)));
      box.append(w);
    }

    // 3) a few ghosts left: how to tell them apart
    if (total <= 4) {
      const t = el("div", "sug-watch");
      t.append(el("small", null, "Tell them apart"));
      possible.forEach((g) => {
        const line = el("div");
        line.append(el("b", null, g.name + ": "), document.createTextNode((g.tests && g.tests[0]) || g.tells[0]));
        t.append(line);
      });
      box.append(t);
    } else if (!rows.length) {
      box.append(el("div", "hint", "Evidence can't split these further. Use the behaviour checks below."));
    }
  }

  function renderChips() {
    const speed = $("#speed-filter");
    speed.innerHTML = "";
    SPEEDS.forEach((s) => {
      const c = el("button", "chip" + (state.speed.includes(s.key) ? " on" : ""), s.label);
      c.onclick = () => { toggleIn(state.speed, s.key); update(); };
      speed.append(c);
    });
    const los = $("#los-filter");
    los.innerHTML = "";
    [["yes", "Speeds up with LOS"], ["no", "No LOS speed-up"]].forEach(([k, label]) => {
      const c = el("button", "chip" + (state.los === k ? " on" : ""), label);
      c.onclick = () => { state.los = state.los === k ? null : k; update(); };
      los.append(c);
    });
    const hunt = $("#hunt-filter");
    hunt.innerHTML = "";
    HUNT_BUCKETS.forEach((b) => {
      const c = el("button", "chip" + (state.hunt.includes(b.key) ? " on" : ""), b.label);
      c.onclick = () => { toggleIn(state.hunt, b.key); update(); };
      hunt.append(c);
    });
  }

  function toggleIn(arr, v) {
    const i = arr.indexOf(v);
    i >= 0 ? arr.splice(i, 1) : arr.push(v);
  }

  // ---------- render: ghosts ----------
  let measuredSpeed = null;

  function renderGhosts(possible) {
    const grid = $("#ghosts");
    const q = $("#search").value.trim().toLowerCase();
    grid.innerHTML = "";

    const list = GHOSTS
      .filter((g) => !q || g.name.toLowerCase().includes(q) ||
        g.tells.some((t) => t.toLowerCase().includes(q)))
      .map((g) => ({ g, out: isOut(g) }))
      .sort((a, b) => a.out - b.out);

    list.forEach(({ g, out }) => {
      if (out && state.hideOut) return;
      const manual = state.manualOut.includes(g.name);
      const reason = filterReason(g);
      const speedMatch = measuredSpeed != null &&
        measuredSpeed >= g.speed[0] - 0.15 && measuredSpeed <= g.speed[1] + 0.15;
      const cls = ["ghost",
        out ? "out" : "",
        manual ? "manual-out" : "",
        state.guess === g.name ? "guess" : "",
        !out && possible.length === 1 ? "only" : "",
        !out && speedMatch && possible.length > 1 ? "speed-match" : ""].join(" ");

      const card = el("article", cls);

      if (openCards.has(g.name)) card.classList.add("open");
      const head = el("div", "g-head");
      const nameEl = el("h3", "g-name", g.name);
      // On phones the card folds; tapping the name opens the details.
      nameEl.onclick = () => {
        card.classList.toggle("open");
        card.classList.contains("open") ? openCards.add(g.name) : openCards.delete(g.name);
      };
      head.append(nameEl);
      const actions = el("div", "g-actions");
      const x = el("button", "icon-btn x" + (manual ? " on" : ""), "✕");
      x.title = manual ? "Bring back" : "Rule out by hand";
      x.onclick = () => { toggleIn(state.manualOut, g.name); if (state.guess === g.name) state.guess = null; update(); };
      const star = el("button", "icon-btn star" + (state.guess === g.name ? " on" : ""), "★");
      star.title = "Mark as my guess";
      star.onclick = () => { state.guess = state.guess === g.name ? null : g.name; update(); };
      actions.append(x, star);
      head.append(actions);
      card.append(head);

      const ev = el("div", "g-ev");
      g.evidence.forEach((k) => {
        const v = state.evidence[k];
        const t = el("span", "tag" + (v === 1 ? " yes" : v === -1 ? " no" : "") + (g.forced === k ? " forced" : ""), evName(k));
        if (g.forced === k) t.title = "Always shown on reduced-evidence difficulties";
        ev.append(t);
      });
      if (g.fakeOrb) {
        const t = el("span", "tag fake" + (state.evidence.orb === 1 ? " yes" : ""), "+ Orbs");
        t.title = "Fake evidence: the Mimic always shows Ghost Orbs";
        ev.append(t);
      }
      if (g.verify) {
        const t = el("span", "tag new", "newer ghost");
        t.title = "Numbers for newer ghosts may change between patches. Double-check in game.";
        ev.append(t);
      }
      card.append(ev);

      const huntTxt = g.name === "The Mimic" ? "Copied" : g.hunt.map((h) => h + "%").join(" / ");
      const speedTxt = g.speed[0] === 1.7 && g.speed[1] === 2.8 ? "1.7 (LOS ↑)" :
        `${g.speed[0]}–${g.speed[1]}${g.los ? " (LOS ↑)" : ""}`;
      // one-line summary shown on folded phone cards
      card.append(el("div", "g-meta", `Hunts ${huntTxt} · ${speedTxt} m/s`));
      card.append(el("div", "g-stats",
        `<div class="stat"><small>Hunts at</small><span>${huntTxt}</span></div>
         <div class="stat"><small>Speed m/s</small><span>${speedTxt}</span></div>`));

      const tells = el("ul", "g-tells");
      g.tells.forEach((t) => tells.append(el("li", null, t)));
      card.append(tells);

      if (g.tests && g.tests.length) {
        const d = el("details", "g-tests");
        d.append(el("summary", null, "How to test"));
        const ul = el("ul");
        g.tests.forEach((t) => ul.append(el("li", null, t)));
        d.append(ul);
        card.append(d);
      }

      if (reason) card.append(el("div", "reason", reason));
      grid.append(card);
    });
  }

  function renderSummary(possible) {
    const total = GHOSTS.length;
    const n = possible.length;
    const s = $("#summary");
    if (n === 1) s.innerHTML = `Only <b>${possible[0].name}</b> fits.`;
    else if (n === 0) s.innerHTML = `<b>0</b> ghosts fit. Something's off: check your evidence and difficulty.`;
    else s.innerHTML = `<b>${n}</b> / ${total} ghosts left`;

    // EMF meter: more LEDs the closer you are to one ghost.
    const level = n === 0 ? 0 : n === 1 ? 5 : n <= 3 ? 4 : n <= 8 ? 3 : n <= 16 ? 2 : 1;
    const emf = $("#emf");
    if (emf) {
      emf.innerHTML = "";
      for (let i = 1; i <= 5; i++) emf.append(el("i", i <= level ? `on l${i}` : ""));
      emf.dataset.level = level;
      emf.title = `EMF ${level}: ${n} ghost${n === 1 ? "" : "s"} left`;
    }
  }

  const openCards = new Set();
  const listeners = [];
  function update(fromRemote) {
    save();
    if (!fromRemote) listeners.forEach((fn) => fn(state));
    const possible = possibleGhosts();
    renderDifficulty();
    renderEvidence(possible);
    renderSuggest(possible);
    renderObservations();
    renderChips();
    renderGhosts(possible);
    renderSummary(possible);
    announce(possible);
    $("#hide-impossible").checked = state.hideOut;
  }

  // ---------- timers ----------
  function makeTimer(root, { name, max, marks }) {
    let start = null, raf = null, elapsed = 0;
    root.innerHTML = "";
    const clock = el("div", "clock", "0:00");
    clock.title = "Click to start / stop";
    const track = el("div", "track");
    const fill = el("div", "fill");
    track.append(fill);
    const markEls = marks.map((m) => {
      const mk = el("div", "mark", `<span>${m.label}</span>`);
      mk.style.left = (m.t / max) * 100 + "%";
      mk.title = m.title || "";
      track.append(mk);
      return { m, mk };
    });
    root.append(clock, track);

    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    const draw = () => {
      if (start != null) elapsed = (performance.now() - start) / 1000;
      clock.textContent = fmt(elapsed);
      fill.style.width = Math.min(100, (elapsed / max) * 100) + "%";
      markEls.forEach(({ m, mk }) => {
        const hit = elapsed >= m.t;
        // buzz the phone the moment a marker is reached
        if (hit && !mk.classList.contains("hit") && start != null) {
          if (navigator.vibrate) navigator.vibrate([80, 60, 80]);
          document.dispatchEvent(new CustomEvent("ph:mark", { detail: { name, label: m.label } }));
        }
        mk.classList.toggle("hit", hit);
      });
      if (start != null) {
        if (elapsed >= max) {
          stop();
          document.dispatchEvent(new CustomEvent("ph:timer", { detail: { name, running: false, elapsed } }));
          return;
        }
        raf = requestAnimationFrame(draw);
      }
    };
    const stop = () => { start = null; cancelAnimationFrame(raf); root.classList.remove("running"); };
    const toggle = () => {
      const running = start == null;
      if (!running) stop();
      else { elapsed = 0; start = performance.now(); root.classList.add("running"); draw(); }
      document.dispatchEvent(new CustomEvent("ph:timer", { detail: { name, running, elapsed } }));
    };
    clock.onclick = toggle;
    draw();
    return { toggle };
  }

  const timers = {
    s: makeTimer($("#t-smudge"), {
      name: "Smudge",
      max: 180,
      marks: [
        { t: 60, label: "Demon 60s", title: "Demon can hunt again" },
        { t: 90, label: "Normal 90s", title: "Most ghosts can hunt again" },
        { t: 180, label: "Spirit 180s", title: "Spirit can hunt again" },
      ],
    }),
    c: makeTimer($("#t-cooldown"), {
      name: "Cooldown",
      max: 25,
      marks: [
        { t: 20, label: "Demon 20s", title: "Demon can hunt again" },
        { t: 25, label: "Others 25s", title: "Other ghosts can hunt again" },
      ],
    }),
    h: makeTimer($("#t-hunt"), {
      name: "Hunt",
      max: 60,
      marks: [
        { t: 20, label: "Short", title: "Short hunt on small maps / low difficulty" },
        { t: 40, label: "Medium" },
        { t: 60, label: "Long" },
      ],
    }),
  };

  // ---------- footstep tapper ----------
  let taps = [];
  const mult = () => parseFloat($("#speed-mult").value) || 1;

  function tap() {
    const now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > 2500) taps = [];
    taps.push(now);
    if (taps.length > 12) taps.shift();
    const btn = $("#tap");
    btn.classList.add("flash");
    setTimeout(() => btn.classList.remove("flash"), 80);
    renderTap();
  }

  function currentBpm() {
    if (taps.length < 3) return null;
    const gaps = taps.slice(1).map((t, i) => t - taps[i]);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    return 60000 / avg;
  }

  function renderTap() {
    const bpm = currentBpm();
    if (bpm == null) {
      $("#bpm").textContent = taps.length ? "…" : "–";
      $("#ms").textContent = "–";
      $("#speed-match").textContent = "";
      measuredSpeed = null;
    } else {
      const ms = (bpm * calib) / mult(); // normalised to 100% ghost speed
      measuredSpeed = ms;
      $("#bpm").textContent = Math.round(bpm);
      $("#ms").textContent = ms.toFixed(2);
      const fits = possibleGhosts().filter((g) => ms >= g.speed[0] - 0.15 && ms <= g.speed[1] + 0.15);
      $("#speed-match").textContent = fits.length
        ? `Fits: ${fits.map((g) => g.name).join(", ")}`
        : "No remaining ghost fits this speed.";
    }
    renderGhosts(possibleGhosts());
  }

  $("#tap").onclick = tap;
  $("#tap-reset").onclick = () => { taps = []; renderTap(); };
  $("#speed-mult").onchange = renderTap;
  $("#calibrate").onclick = () => {
    const bpm = currentBpm();
    if (!bpm) return;
    calib = (1.7 * mult()) / bpm;
    save();
    renderTap();
  };

  // ---------- misc controls ----------
  $("#search").oninput = () => renderGhosts(possibleGhosts());
  $("#hide-impossible").onchange = (e) => { state.hideOut = e.target.checked; update(); };
  $("#reset").onclick = () => {
    const keepHide = state.hideOut;
    state = fresh();
    state.hideOut = keepHide;
    taps = [];
    $("#search").value = "";
    renderTap();
    update();
  };
  $("#help-btn").onclick = () => $("#help").showModal();

  document.addEventListener("keydown", (e) => {
    const typing = e.target.matches("input, select, textarea");
    if (e.key === "Escape" && typing) { e.target.blur(); return; }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;

    // Shift+digit gives symbols on most layouts, so use e.code.
    const m = /^Digit([1-7])$/.exec(e.code);
    if (m) {
      e.preventDefault();
      cycleEvidence(EVIDENCE[+m[1] - 1].key, e.shiftKey);
      return;
    }
    switch (e.key.toLowerCase()) {
      case "m": window.PHMaps && window.PHMaps.toggle(); break;
      case "v": window.PHVoice && window.PHVoice.toggle(); break;
      case "s": timers.s.toggle(); break;
      case "c": timers.c.toggle(); break;
      case "h": timers.h.toggle(); break;
      case "t": tap(); break;
      case "/": e.preventDefault(); $("#search").focus(); break;
      case "backspace": e.preventDefault(); $("#reset").click(); break;
      case "?": $("#help").showModal(); break;
      default: return;
    }
  });

  // ---------- public API for voice / sync / sanity modules ----------
  const SHARED = ["evidence", "evCount", "speed", "los", "hunt", "manualOut", "guess", "obs"];
  // (applyRemote validates each of these individually)
  window.PH = {
    get state() { return state; },
    possible: possibleGhosts,
    findGhost: (text) => {
      const t = text.toLowerCase();
      return GHOSTS.find((g) =>
        new RegExp(`\\b${g.name.toLowerCase().replace(/^the /, "")}s?\\b`).test(t));
    },
    setEvidence(k, v) { state.evidence[k] = v; update(); },
    setDifficulty(n) { state.evCount = n; update(); },
    toggleSpeed(k) { toggleIn(state.speed, k); update(); },
    clearSpeed() { state.speed = []; state.los = null; update(); },
    ruleOut(name) { if (!state.manualOut.includes(name)) state.manualOut.push(name); update(); },
    bringBack(name) { state.manualOut = state.manualOut.filter((n) => n !== name); update(); },
    guess(name) { state.guess = name; update(); },
    search(text) { $("#search").value = text; renderGhosts(possibleGhosts()); },
    reset: () => $("#reset").click(),
    timers,
    tap,
    // sync
    sharedState: () => JSON.parse(JSON.stringify(Object.fromEntries(SHARED.map((k) => [k, state[k]])))),
    applyRemote(s) {
      // Data from other players: accept only known keys and values.
      const names = GHOSTS.map((g) => g.name);
      const list = (v, ok) => (Array.isArray(v) ? v.filter((x) => ok.includes(x)) : []);
      if (s.evidence && typeof s.evidence === "object")
        EVIDENCE.forEach((e) => { const v = s.evidence[e.key]; state.evidence[e.key] = [1, 0, -1].includes(v) ? v : 0; });
      if ([0, 1, 2, 3].includes(s.evCount)) state.evCount = s.evCount;
      if ("speed" in s) state.speed = list(s.speed, SPEEDS.map((x) => x.key));
      if ("los" in s) state.los = ["yes", "no"].includes(s.los) ? s.los : null;
      if ("hunt" in s) state.hunt = list(s.hunt, HUNT_BUCKETS.map((b) => b.key));
      if ("manualOut" in s) state.manualOut = list(s.manualOut, names);
      if ("guess" in s) state.guess = names.includes(s.guess) ? s.guess : null;
      if ("obs" in s) state.obs = list(s.obs, OBSERVATIONS.map((o) => o.key));
      update(true);
      document.dispatchEvent(new Event("ph:remote"));
    },
    onChange: (fn) => listeners.push(fn),
  };

  update();
})();
