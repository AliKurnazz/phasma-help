// Voice commands via the browser's Web Speech API (Chrome / Edge).
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = $("#voice-btn"), bar = $("#voice-bar"), status = $("#voice-status"), heard = $("#voice-heard");

  if (!Rec) {
    btn.title = "Voice commands need Chrome or Edge";
    btn.onclick = () => alert("Voice commands need Chrome or Edge (Web Speech API).");
    window.PHVoice = { toggle: btn.onclick };
    return;
  }

  // Spoken aliases for each evidence type.
  const EV_WORDS = [
    ["emf", ["emf", "e m f", "level 5", "level five"]],
    ["box", ["spirit box", "spiritbox", "box"]],
    ["uv", ["ultraviolet", "uv", "fingerprint", "fingerprints", "prints", "handprint"]],
    ["orb", ["orb", "orbs", "ghost orb"]],
    ["writing", ["writing", "book", "ghost writing"]],
    ["freezing", ["freezing", "freezing temps", "temperature", "temps", "cold"]],
    ["dots", ["dots", "dot", "d o t s", "dot projector"]],
  ];
  const DIFF_WORDS = [
    [3, ["amateur", "intermediate", "professional", "three evidence", "3 evidence"]],
    [2, ["nightmare", "two evidence", "2 evidence"]],
    [1, ["insanity", "one evidence", "1 evidence"]],
    [0, ["apocalypse", "zero evidence", "0 evidence", "no evidence"]],
  ];
  const NEG = /\b(no|not|none|never|without|rule out|ruled out|cross out|negative)\b/;
  const CLEAR = /\b(clear|undo|remove|unknown|reset)\b/;

  const has = (t, words) => words.some((w) => new RegExp(`\\b${w}\\b`).test(t));

  function handle(raw) {
    let t = raw.toLowerCase().replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
    if ($("#voice-wake").checked) {
      const i = t.indexOf("journal");
      if (i < 0) return null;
      t = t.slice(i + 7).trim();
    }
    const PH = window.PH, Maps = window.PHMaps, Tools = window.PHTools;

    // maps
    if (/\b(close|hide) (the )?map\b/.test(t)) { Maps.close(); return "Map closed"; }
    if (/\b(open|show|select)\b.*\bmap\b|\bmap\b/.test(t)) {
      const m = Maps.find(t.replace(/\b(open|show|select|the|map)\b/g, " ").trim() || "zzzz");
      Maps.open(m && m.id);
      return m ? `Map: ${m.name}` : "Map opened";
    }

    // journal reset
    if (/\breset (the )?(journal|all|everything)\b/.test(t)) { PH.reset(); return "Journal reset"; }

    // sanity
    if (/\bsanity\b|\bpill\b/.test(t)) {
      if (/\bpill/.test(t)) { Tools.sanity.pill(); return "Pill taken"; }
      if (/\breset\b/.test(t)) { Tools.sanity.reset(); return "Sanity reset"; }
      Tools.sanity.toggle(); return "Sanity drain toggled";
    }

    // timers
    if (/\bsmudge\b|\bsmudge timer\b|\bincense\b/.test(t)) { PH.timers.s.toggle(); return "Smudge timer"; }
    if (/\bcool ?down\b/.test(t)) { PH.timers.c.toggle(); return "Cooldown timer"; }
    if (/\bhunt( timer| start| stop| over| started| ended)?$/.test(t)) { PH.timers.h.toggle(); return "Hunt timer"; }

    // difficulty
    for (const [n, words] of DIFF_WORDS) if (has(t, words)) { PH.setDifficulty(n); return `${n} evidence`; }

    // speed
    if (/\bspeed\b/.test(t)) {
      if (CLEAR.test(t)) { PH.clearSpeed(); return "Speed filter cleared"; }
      for (const k of ["slow", "normal", "fast"]) if (t.includes(k)) { PH.toggleSpeed(k); return `Speed: ${k}`; }
    }

    // evidence (checked before ghosts so "spirit box" isn't read as Spirit)
    for (const [k, words] of EV_WORDS) {
      if (has(t, words)) {
        const v = CLEAR.test(t) ? 0 : NEG.test(t) ? -1 : 1;
        PH.setEvidence(k, v);
        const name = EVIDENCE.find((e) => e.key === k).name;
        return `${name}: ${v === 1 ? "found" : v === -1 ? "ruled out" : "cleared"}`;
      }
    }

    // ghosts
    const g = PH.findGhost(t);
    if (g) {
      if (/\b(guess|it'?s|its|it is|select|pick)\b/.test(t)) { PH.guess(g.name); return `Guess: ${g.name}`; }
      if (/\b(bring back|restore)\b/.test(t) || CLEAR.test(t)) { PH.bringBack(g.name); return `${g.name} restored`; }
      if (NEG.test(t)) { PH.ruleOut(g.name); return `${g.name} ruled out`; }
      PH.search(g.name); return `Showing ${g.name}`;
    }
    if (/\b(clear|reset) search\b/.test(t)) { PH.search(""); return "Search cleared"; }
    return null;
  }

  let rec = null, on = false;

  function start() {
    rec = new Rec();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const r = e.results[e.results.length - 1];
      const text = r[0].transcript;
      const done = handle(text);
      heard.textContent = done ? `“${text.trim()}” → ${done}` : `“${text.trim()}” (not understood)`;
      heard.classList.toggle("miss", !done);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        stop();
        alert("Microphone access was blocked. Allow it in the address bar to use voice commands.");
      }
    };
    rec.onend = () => { if (on) { try { rec.start(); } catch (_) {} } };
    rec.start();
  }

  function stop() {
    on = false;
    if (rec) { rec.onend = null; try { rec.stop(); } catch (_) {} }
    btn.classList.remove("on");
    bar.hidden = true;
  }

  function toggle() {
    if (on) { stop(); return; }
    on = true;
    btn.classList.add("on");
    bar.hidden = false;
    status.textContent = "Listening…";
    heard.textContent = "";
    try { start(); } catch (_) { stop(); }
  }

  btn.onclick = toggle;
  window.PHVoice = { toggle, handle };
})();
