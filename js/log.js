// Case log: a timeline of what happened, and a shareable case report.
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const KEY = "phasma-help:case";
  let c = { start: null, entries: [] };
  try { Object.assign(c, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (_) {} };

  const evName = (k) => (EVIDENCE.find((e) => e.key === k) || {}).name || k;
  const obsLabel = (k) => (OBSERVATIONS.find((o) => o.key === k) || {}).label || k;
  const fmt = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  function add(icon, text) {
    const now = Date.now();
    if (!c.start) c.start = now;
    c.entries.push({ t: now - c.start, icon, text });
    if (c.entries.length > 300) c.entries.shift();
    save();
    render();
  }

  // Compare the journal before/after each change and describe it.
  let prev = snapshot(window.PH.state);
  function snapshot(s) {
    return { evidence: { ...s.evidence }, evCount: s.evCount, manualOut: [...s.manualOut], guess: s.guess, obs: [...(s.obs || [])] };
  }
  function diff() {
    const s = window.PH.state, p = prev;
    EVIDENCE.forEach((e) => {
      const a = p.evidence[e.key], b = s.evidence[e.key];
      if (a === b) return;
      if (b === 1) add("✅", `${evName(e.key)} found`);
      else if (b === -1) add("❌", `${evName(e.key)} ruled out`);
      else add("↩", `${evName(e.key)} cleared`);
    });
    if (p.evCount !== s.evCount) add("⚙", `Difficulty: ${s.evCount} evidence`);
    s.obs.filter((k) => !p.obs.includes(k)).forEach((k) => add("👁", obsLabel(k)));
    s.manualOut.filter((n) => !p.manualOut.includes(n)).forEach((n) => add("✕", `${n} ruled out by hand`));
    if (s.guess && s.guess !== p.guess) add("★", `Guess: ${s.guess}`);
    const left = window.PH.possible();
    if (left.length === 1 && (p._left || 0) !== 1) add("🎯", `Only ${left[0].name} fits`);
    prev = snapshot(s);
    prev._left = left.length;
  }
  prev._left = window.PH.possible().length;
  window.PH.onChange(diff);
  document.addEventListener("ph:remote", diff);

  document.addEventListener("ph:timer", (e) => {
    const { name, running, elapsed } = e.detail;
    add(name === "Hunt" ? "🩸" : name === "Smudge" ? "🌿" : "⏱",
      running ? `${name} timer started` : `${name} timer stopped at ${fmt(elapsed * 1000)}`);
  });

  // ---------- UI ----------
  function render() {
    const list = $("#case-log");
    list.innerHTML = "";
    if (!c.entries.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "Nothing yet. Evidence, timers and guesses show up here.";
      list.append(li);
    }
    [...c.entries].reverse().forEach((en) => {
      const li = document.createElement("li");
      const t = document.createElement("time");
      t.textContent = fmt(en.t);
      const i = document.createElement("span");
      i.className = "ic";
      i.textContent = en.icon;
      const x = document.createElement("span");
      x.textContent = en.text;
      li.append(t, i, x);
      list.append(li);
    });
    $("#case-left").textContent = window.PH.possible().length;
  }

  setInterval(() => {
    $("#case-clock").textContent = c.start ? fmt(Date.now() - c.start) : "0:00";
  }, 1000);

  function report() {
    const s = window.PH.state;
    const left = window.PH.possible();
    const found = EVIDENCE.filter((e) => s.evidence[e.key] === 1).map((e) => e.name);
    const out = EVIDENCE.filter((e) => s.evidence[e.key] === -1).map((e) => e.name);
    const lines = [
      "👻 Phasma Help · case report",
      s.guess ? `Our guess: ${s.guess}` : left.length === 1 ? `Ghost: ${left[0].name}` : `Still possible: ${left.map((g) => g.name).join(", ")}`,
      `Evidence found: ${found.join(", ") || "none"}`,
      out.length ? `Ruled out: ${out.join(", ")}` : "",
      s.obs.length ? `Seen: ${s.obs.map(obsLabel).join("; ")}` : "",
      c.start ? `Case time: ${fmt(Date.now() - c.start)}` : "",
    ].filter(Boolean);
    return lines.join("\n");
  }

  $("#case-share").onclick = async () => {
    const text = report();
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) { await navigator.share({ text }); return; }
      await navigator.clipboard.writeText(text);
      $("#case-msg").textContent = "Case report copied.";
    } catch (_) {
      $("#case-msg").textContent = text;
    }
  };
  $("#case-clear").onclick = () => { c = { start: null, entries: [] }; save(); render(); };

  // "New case" also starts a fresh log.
  $("#reset").addEventListener("click", () => {
    c = { start: null, entries: [] };
    save();
    prev = snapshot(window.PH.state);
    prev._left = window.PH.possible().length;
    render();
  });

  render();
  window.PHLog = { add, report };
})();
