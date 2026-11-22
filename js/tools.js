// Tabs, weather notes and the sanity tracker.
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const KEY = "phasma-help:tools";
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (_) {}
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (_) {} };

  // ---------- tabs ----------
  function showTab(name) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.dataset.tab === name));
    document.querySelectorAll(".tab-body").forEach((b) => { b.hidden = b.dataset.body !== name; });
    saved.tab = name; persist();
  }
  document.querySelectorAll(".tab").forEach((t) => { t.onclick = () => showTab(t.dataset.tab); });
  if (saved.tab) showTab(saved.tab);

  // ---------- weather ----------
  const WEATHER = [
    { key: "clear",  label: "☀️ Clear",       note: "No effect on investigation." },
    { key: "sunrise",label: "🌅 Sunrise",     note: "Bright outside; no effect inside." },
    { key: "rain",   label: "🌦 Light rain",  note: "Rain noise outside. Slightly harder to hear footsteps near windows." },
    { key: "heavy",  label: "🌧 Heavy rain",  note: "Loud rain and thunder. Hard to hear footsteps and the parabolic mic near outer walls; listen from inside rooms." },
    { key: "fog",    label: "🌫 Fog",         note: "Low visibility outside. Watch your way back to the truck during hunts." },
    { key: "wind",   label: "🍃 Wind",        note: "Some wind noise; open doors may sway slightly." },
    { key: "storm",  label: "🌪 Strong wind", note: "Loud wind can hide footsteps. Doors moving on their own may be the wind, not the ghost." },
    { key: "snow",   label: "❄️ Snow",        note: "Cold outside. Rooms near open doors and windows can read low: confirm freezing (below 0 °C / 32 °F) deep inside the ghost room." },
    { key: "blood",  label: "🩸 Blood Moon",  note: "Event modifier: the ghost is more aggressive. Expect more activity and hunts. Set the speed setting on the Speed tab if your contract changes ghost speed." },
  ];
  const wSel = $("#weather");
  WEATHER.forEach((w) => wSel.append(new Option(w.label, w.key)));
  wSel.value = saved.weather || "clear";
  const showWeather = () => {
    const w = WEATHER.find((x) => x.key === wSel.value);
    $("#weather-note").textContent = w.note;
    saved.weather = w.key; persist();
  };
  wSel.onchange = showWeather;
  showWeather();

  // ---------- sanity ----------
  // Approximate passive drain in the dark, % per second (100% drain speed).
  const RATES = {
    solo:  { small: 0.12, medium: 0.08, large: 0.05 },
    multi: { small: 0.08, medium: 0.05, large: 0.04 },
  };
  const MARKS = [80, 75, 70, 65, 60, 50, 40, 35, 15];

  const s = Object.assign({
    lobby: "solo", size: "small", start: "100", drain: "1", pill: "40", rate: null, value: 100,
  }, saved.sanity || {});
  const fields = { lobby: "#san-lobby", size: "#san-size", start: "#san-start", drain: "#san-drain", pill: "#san-pillamt" };
  let running = false, last = 0, raf = 0;

  const baseRate = () => RATES[s.lobby][s.size] * parseFloat(s.drain);
  const rate = () => (s.rate != null ? s.rate : baseRate());
  const saveSan = () => { saved.sanity = s; persist(); };

  // Build the bar with threshold markers once.
  const bar = $("#san-bar");
  const fill = document.createElement("div");
  fill.className = "san-fill";
  bar.append(fill);
  MARKS.forEach((m) => {
    const mk = document.createElement("div");
    mk.className = "san-mark";
    mk.style.left = m + "%";
    mk.dataset.v = m;
    const lbl = document.createElement("span");
    lbl.textContent = m;
    mk.append(lbl);
    bar.append(mk);
  });

  function render() {
    const v = Math.max(0, Math.min(100, s.value));
    $("#san-value").textContent = Math.round(v);
    fill.style.width = v + "%";
    fill.dataset.level = v > 50 ? "ok" : v > 35 ? "warn" : "bad";
    bar.querySelectorAll(".san-mark").forEach((mk) => mk.classList.toggle("passed", v <= +mk.dataset.v));
    $("#san-rate").placeholder = baseRate().toFixed(2);
    $("#san-rate").value = s.rate != null ? s.rate : "";

    const possible = window.PH ? window.PH.possible() : GHOSTS;
    const hunters = possible.filter((g) => Math.max(...g.hunt) >= v);
    $("#san-hunters").textContent = !hunters.length
      ? "None of the remaining ghosts can start a normal hunt yet."
      : hunters.length === possible.length
        ? "Every remaining ghost can hunt."
        : hunters.map((g) => `${g.name} (${Math.max(...g.hunt)}%)`).join(", ");
  }

  function tick(now) {
    if (!running) return;
    const dt = (now - last) / 1000;
    last = now;
    s.value = Math.max(0, s.value - rate() * dt);
    render();
    if (s.value <= 0) { setRunning(false); return; }
    raf = requestAnimationFrame(tick);
  }

  function setRunning(on) {
    running = on;
    $("#san-run").textContent = on ? "⏸ Lights on (pause)" : "▶ Lights off (drain)";
    $("#san-run").classList.toggle("on", on);
    cancelAnimationFrame(raf);
    if (on) { last = performance.now(); raf = requestAnimationFrame(tick); }
    saveSan();
  }

  const add = (d) => { s.value = Math.max(0, Math.min(100, s.value + d)); saveSan(); render(); };

  Object.entries(fields).forEach(([k, sel]) => {
    $(sel).value = s[k];
    $(sel).onchange = (e) => {
      s[k] = e.target.value;
      if (k === "start") s.value = +s.start;
      saveSan(); render();
    };
  });
  $("#san-rate").oninput = (e) => {
    const v = parseFloat(e.target.value);
    s.rate = isNaN(v) ? null : v;
    saveSan(); render();
  };
  $("#san-run").onclick = () => setRunning(!running);
  $("#san-pill").onclick = () => add(+s.pill);
  $("#san-reset").onclick = () => { setRunning(false); s.value = +s.start; saveSan(); render(); };
  document.querySelectorAll("[data-san]").forEach((b) => { b.onclick = () => add(+b.dataset.san); });

  // "New case" also resets the sanity tracker.
  $("#reset").addEventListener("click", () => $("#san-reset").click());

  if (window.PH) window.PH.onChange(render);
  // Re-render when a remote update arrives too.
  document.addEventListener("ph:remote", render);
  render();

  window.PHTools = {
    showTab,
    sanity: { pill: () => $("#san-pill").click(), toggle: () => setRunning(!running), add, reset: () => $("#san-reset").click() },
  };
})();
