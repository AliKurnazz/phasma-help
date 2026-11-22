// Hunt mode, Learn (cursed items, quiz, stats).
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const store = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch (_) { return fallback; }
  };
  const persist = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) {} };
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  // Track the app's timers through their events.
  const runningSince = {};
  let lastHuntEnd = null;
  document.addEventListener("ph:timer", (e) => {
    const { name, running } = e.detail;
    if (running) runningSince[name] = performance.now();
    else {
      delete runningSince[name];
      if (name === "Hunt") lastHuntEnd = performance.now();
    }
  });
  const isRunning = (name) => name in runningSince;

  // =================== HUNT MODE ===================
  const hunt = $("#hunt");
  let huntTick = null;

  function openHunt() {
    if (!isRunning("Hunt")) window.PH.timers.h.toggle();
    if (isRunning("Cooldown")) window.PH.timers.c.toggle();
    renderTips();
    if (!hunt.open) hunt.showModal();
    if (navigator.vibrate) navigator.vibrate([60, 40, 60, 40, 120]);
    clearInterval(huntTick);
    huntTick = setInterval(drawHunt, 200);
    drawHunt();
  }
  function drawHunt() {
    const t0 = runningSince.Hunt;
    $("#hunt-clock").textContent = t0 ? fmt((performance.now() - t0) / 1000) : "0:00";
    const sub = [];
    const left = window.PH.possible().length;
    sub.push(`${left} ghost${left === 1 ? "" : "s"} possible`);
    if (isRunning("Smudge")) sub.push(`smudged ${fmt((performance.now() - runningSince.Smudge) / 1000)} ago`);
    $("#hunt-sub").textContent = sub.join(" · ");
    $("#hunt-smudge").classList.toggle("done", isRunning("Smudge"));
  }
  function renderTips() {
    const ul = $("#hunt-tips");
    ul.innerHTML = "";
    const tips = [
      "Break line of sight first, then hide. Close the door behind you.",
      "Turn off or drop electronics: the ghost hears them and they flicker.",
      "Stay quiet unless you're near a teammate (voice chat attracts it).",
    ];
    const possible = window.PH.possible();
    const special = possible.filter((g) => HUNT_TIPS[g.name]).map((g) => HUNT_TIPS[g.name]);
    // ghost-specific tips first when there are only a few ghosts left
    (possible.length <= 6 ? special.concat(tips) : tips.concat(special)).slice(0, 6)
      .forEach((t) => ul.append(el("li", null, t)));
  }
  function closeHunt() { clearInterval(huntTick); hunt.close(); }

  $("#hunt-smudge").onclick = () => {
    if (!isRunning("Smudge")) window.PH.timers.s.toggle();
    if (navigator.vibrate) navigator.vibrate(30);
    drawHunt();
  };
  $("#hunt-over").onclick = () => {
    if (isRunning("Hunt")) window.PH.timers.h.toggle();
    if (!isRunning("Cooldown")) window.PH.timers.c.toggle();
    closeHunt();
  };
  $("#hunt-close").onclick = closeHunt;
  hunt.addEventListener("cancel", () => clearInterval(huntTick));
  $("#hunt-btn").onclick = openHunt;

  // =================== LEARN ===================
  const learn = $("#learn");
  function showLearn(tab) {
    document.querySelectorAll(".ltab").forEach((b) => b.classList.toggle("on", b.dataset.ltab === tab));
    document.querySelectorAll(".learn-body").forEach((b) => { b.hidden = b.dataset.lbody !== tab; });
    if (tab === "quiz" && !quiz.q) nextQuestion();
    if (tab === "stats") renderStats();
  }
  function openLearn(tab) {
    if (!learn.open) learn.showModal();
    showLearn(tab || document.querySelector(".ltab.on").dataset.ltab);
  }
  document.querySelectorAll(".ltab").forEach((b) => { b.onclick = () => showLearn(b.dataset.ltab); });
  $("#learn-close").onclick = () => learn.close();
  learn.addEventListener("click", (e) => { if (e.target === learn) learn.close(); });
  $("#learn-btn").onclick = () => openLearn();

  // ---- cursed items ----
  (function renderCursed() {
    const box = $("#cursed-list");
    CURSED.forEach((c) => {
      const card = el("article", "cursed");
      const head = el("div", "cursed-head");
      head.append(el("span", "cursed-icon", c.icon), el("h3", null, c.name));
      const risk = el("span", "risk risk-" + c.risk, "●".repeat(c.risk) + "○".repeat(5 - c.risk));
      risk.title = `Risk ${c.risk} of 5`;
      head.append(risk);
      card.append(head);
      const dl = el("dl");
      [["What it does", c.does], ["The danger", c.risk_text], ["Pro tip", c.tip]].forEach(([k, v]) => {
        dl.append(el("dt", null, k), el("dd", null, v));
      });
      card.append(dl);
      box.append(card);
    });
    box.append(el("p", "hint", "Exact sanity costs change between game updates."));
  })();

  // ---- quiz ----
  const QKEY = "phasma-help:quiz";
  const quiz = Object.assign({ best: 0, right: 0, total: 0 }, store(QKEY, {}), { streak: 0, q: null });
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function nextQuestion() {
    // a tell that doesn't give the answer away by naming the ghost
    let g, tell;
    for (let tries = 0; tries < 50; tries++) {
      g = GHOSTS[Math.floor(Math.random() * GHOSTS.length)];
      const pool = g.tells.concat(g.tests || []).filter((t) => !t.toLowerCase().includes(g.name.toLowerCase().replace(/^the /, "")));
      if (pool.length) { tell = pool[Math.floor(Math.random() * pool.length)]; break; }
    }
    const wrong = shuffle(GHOSTS.filter((x) => x !== g)).slice(0, 3);
    quiz.q = { g, opts: shuffle([g, ...wrong]) };
    $("#quiz-q").textContent = tell;
    $("#quiz-feedback").textContent = "";
    $("#quiz-next").hidden = true;
    const opts = $("#quiz-opts");
    opts.innerHTML = "";
    quiz.q.opts.forEach((o) => {
      const b = el("button", "quiz-opt", o.name);
      b.onclick = () => answer(o, b);
      opts.append(b);
    });
    drawScore();
  }
  function answer(o, btn) {
    if (!quiz.q || quiz.q.answered) return;
    quiz.q.answered = true;
    const ok = o === quiz.q.g;
    quiz.total++;
    if (ok) { quiz.right++; quiz.streak++; quiz.best = Math.max(quiz.best, quiz.streak); }
    else quiz.streak = 0;
    document.querySelectorAll(".quiz-opt").forEach((b) => {
      b.disabled = true;
      if (b.textContent === quiz.q.g.name) b.classList.add("right");
    });
    if (!ok) btn.classList.add("wrong");
    const g = quiz.q.g;
    $("#quiz-feedback").textContent = ok
      ? `Correct! ${g.name}: ${g.evidence.map((k) => EVIDENCE.find((e) => e.key === k).short).join(", ")}.`
      : `It was the ${g.name} (${g.evidence.map((k) => EVIDENCE.find((e) => e.key === k).short).join(", ")}).`;
    $("#quiz-next").hidden = false;
    if (window.PHFx) window.PHFx.play(ok ? "found" : "out");
    persist(QKEY, { best: quiz.best, right: quiz.right, total: quiz.total });
    drawScore();
  }
  function drawScore() {
    $("#quiz-streak").textContent = quiz.streak;
    $("#quiz-best").textContent = quiz.best;
    $("#quiz-score").textContent = `${quiz.right}/${quiz.total}`;
  }
  $("#quiz-next").onclick = nextQuestion;

  // ---- stats: recorded when you start a new case after naming the ghost ----
  const SKEY = "phasma-help:stats";
  let stats = store(SKEY, []);
  if (!Array.isArray(stats)) stats = [];

  // Capture phase so this runs before the journal is wiped.
  $("#reset").addEventListener("click", () => {
    const s = window.PH.state;
    const left = window.PH.possible();
    const ghost = s.guess || (left.length === 1 ? left[0].name : null);
    if (!ghost) return;
    const c = store("phasma-help:case", {});
    stats.push({
      ghost,
      at: Date.now(),
      secs: c && c.start ? Math.round((Date.now() - c.start) / 1000) : null,
      evidence: EVIDENCE.filter((e) => s.evidence[e.key] === 1).length,
    });
    if (stats.length > 500) stats.shift();
    persist(SKEY, stats);
  }, true);

  function renderStats() {
    const cards = $("#stats-cards");
    cards.innerHTML = "";
    const timed = stats.filter((x) => x.secs);
    const avg = timed.length ? timed.reduce((a, x) => a + x.secs, 0) / timed.length : 0;
    const fastest = timed.length ? Math.min(...timed.map((x) => x.secs)) : 0;
    [["Cases", stats.length], ["Avg. time", avg ? fmt(avg) : "–"], ["Fastest", fastest ? fmt(fastest) : "–"]]
      .forEach(([k, v]) => { const d = el("div"); d.append(el("small", null, k), el("span", null, String(v))); cards.append(d); });

    const top = $("#stats-top");
    top.innerHTML = "";
    const counts = {};
    stats.forEach((x) => { counts[x.ghost] = (counts[x.ghost] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!sorted.length) top.append(el("p", "hint", "No cases yet. Name the ghost (★), then press New case."));
    const max = sorted.length ? sorted[0][1] : 1;
    sorted.forEach(([name, n]) => {
      const row = el("div", "sug");
      row.append(el("span", null, name), el("span", "n", String(n)));
      const bar = el("span", "bar"), fill = el("i");
      fill.style.width = (n / max) * 100 + "%";
      bar.append(fill); row.append(bar);
      top.append(row);
    });

    const recent = $("#stats-recent");
    recent.innerHTML = "";
    stats.slice(-10).reverse().forEach((x) => {
      const li = el("li");
      li.append(el("time", null, new Date(x.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })),
        el("span", "ic", "👻"), el("span", null, `${x.ghost}${x.secs ? ` in ${fmt(x.secs)}` : ""}`));
      recent.append(li);
    });
  }
  $("#stats-clear").onclick = () => {
    if (!confirm("Clear all your saved case stats?")) return;
    stats = []; persist(SKEY, stats); renderStats();
  };

  // =================== wiring: phone nav, keys, settings ===================
  document.querySelectorAll(".bottom-nav [data-action]").forEach((b) => {
    const a = b.dataset.action;
    b.onclick = () => (a === "hunt" ? openHunt() : a === "maps" ? window.PHMaps.open() : openLearn());
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, select, textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector("dialog[open]") && !hunt.open && !learn.open) return;
    const k = e.key.toLowerCase();
    if (k === "g") { hunt.open ? $("#hunt-over").click() : openHunt(); }
    else if (k === "l") { learn.open ? learn.close() : openLearn(); }
  });

  // "Keep screen on" in settings mirrors the header button (header button is hidden on phones).
  const wakeBtn = $("#wake-btn");
  if (!wakeBtn.hidden) {
    $("#set-wake-row").hidden = false;
    const sync = () => { $("#set-wake").checked = wakeBtn.classList.contains("on"); };
    $("#set-wake").onchange = () => { wakeBtn.click(); setTimeout(sync, 300); };
    new MutationObserver(sync).observe(wakeBtn, { attributes: true, attributeFilter: ["class"] });
    sync();
  }

  window.PHExtras = { openHunt, openLearn };
})();
