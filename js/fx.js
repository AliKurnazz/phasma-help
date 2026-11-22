// Looks (themes), sound effects and haptics settings.
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const KEY = "phasma-help:fx";
  const THEMES = ["spectral", "nightvision", "journal"];
  const THEME_COLOR = { spectral: "#10151b", nightvision: "#020a03", journal: "#d9cdb2" };

  let fx = { theme: "spectral", sound: false, haptics: true };
  try { Object.assign(fx, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(fx)); } catch (_) {} };

  // ---------- themes ----------
  function setTheme(t) {
    if (!THEMES.includes(t)) t = "spectral";
    fx.theme = t;
    document.documentElement.dataset.theme = t;
    document.querySelector('meta[name="theme-color"]').content = THEME_COLOR[t];
    document.querySelectorAll("#theme-pick button").forEach((b) => b.classList.toggle("on", b.dataset.theme === t));
    save();
  }
  document.querySelectorAll("#theme-pick button").forEach((b) => { b.onclick = () => { setTheme(b.dataset.theme); blip(1100, 0.05); }; });
  $("#theme-btn").onclick = () => setTheme(THEMES[(THEMES.indexOf(fx.theme) + 1) % THEMES.length]);
  setTheme(fx.theme);

  // ---------- haptics ----------
  const realVibrate = navigator.vibrate ? navigator.vibrate.bind(navigator) : null;
  if (realVibrate) {
    try { navigator.vibrate = (p) => (fx.haptics ? realVibrate(p) : false); } catch (_) {}
  }
  const hapt = $("#set-haptics");
  hapt.checked = fx.haptics;
  hapt.onchange = () => { fx.haptics = hapt.checked; save(); };
  if (!realVibrate) hapt.closest(".set-row").hidden = true;

  // ---------- sound (generated, no audio files) ----------
  let ctx = null;
  const audio = () => {
    if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  function tone(freq, dur, { type = "square", vol = 0.05, at = 0, slide = 0 } = {}) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + at;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function staticBurst(dur = 0.35, vol = 0.05) {
    const a = audio(); if (!a) return;
    const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 0.8;
    g.gain.value = vol;
    src.buffer = buf;
    src.connect(f).connect(g).connect(a.destination);
    src.start();
  }
  function blip(f, d) { if (fx.sound) tone(f, d, { vol: 0.04 }); }
  const SFX = {
    found: () => { tone(880, 0.07); tone(1320, 0.09, { at: 0.08 }); },       // EMF-style chirp
    out: () => tone(220, 0.12, { type: "triangle", vol: 0.06, slide: 0.7 }),
    identified: () => {                                                        // spirit-box sting
      staticBurst(0.4, 0.06);
      tone(196, 1.1, { type: "sine", vol: 0.07, at: 0.3 });
      tone(233, 1.1, { type: "sine", vol: 0.05, at: 0.3 });
      tone(277, 1.2, { type: "sine", vol: 0.04, at: 0.45 });
    },
    mark: () => { tone(1000, 0.08); tone(1000, 0.08, { at: 0.14 }); },
  };
  const play = (k) => { if (fx.sound) try { SFX[k](); } catch (_) {} };

  const snd = $("#set-sound");
  snd.checked = fx.sound;
  snd.onchange = () => { fx.sound = snd.checked; save(); if (fx.sound) play("found"); };

  // React to journal changes.
  const snap = () => ({ ev: { ...window.PH.state.evidence }, left: window.PH.possible().length });
  let prev = snap();
  const onChange = () => {
    const now = snap();
    for (const k in now.ev) {
      if (now.ev[k] === prev.ev[k]) continue;
      if (now.ev[k] === 1) play("found"); else if (now.ev[k] === -1) play("out");
    }
    if (now.left === 1 && prev.left !== 1) setTimeout(() => play("identified"), 150);
    prev = now;
  };
  window.PH.onChange(() => setTimeout(onChange, 0));
  document.addEventListener("ph:remote", onChange);
  document.addEventListener("ph:mark", () => play("mark"));

  window.PHFx = { setTheme, play };
})();
