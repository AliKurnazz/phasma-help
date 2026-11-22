# Phasma Help

A fast, no-install Phasmophobia evidence journal. Open `index.html` or host it on GitHub Pages.

## Features
- **3-state evidence**: click = found, right-click = ruled out, or keys `1`–`7` (Shift = ruled out)
- **Difficulty aware**: 3 / 2 / 1 / 0 visible evidence, including forced evidence and the Mimic's fake orbs
- **Best next test**: ranks unchecked evidence by how evenly it splits the remaining ghosts
- **Filters**: ghost speed, line-of-sight speed-up, first-hunt sanity
- **Ghost cards**: evidence, hunt sanity, speed, key tells and how to test; rule out (✕) or guess (★)
- **Timers**: smudge, hunt cooldown, hunt length, with per-ghost markers
- **Footstep tapper**: estimate ghost speed (m/s) and highlight matching ghosts
- **Sanity tracker**: live drain in the dark, pills, sanity events, and which ghosts could hunt right now
- **Weather**: what each weather type changes about the investigation
- **Behaviour checklist**: tick what you saw (salt step, breaker off, airball, six-finger print…) and impossible ghosts drop out
- **Maps**: 12 hand-built floor plans (rooms, stairs, windows, fuse-box spots) with zoom/pan and your own marks. Rebuild them with `node tools/build-maps.js`
- **Case log**: automatic timeline of evidence, timers and guesses, plus a one-tap shareable case report
- **Made for phones**: bottom navigation, sticky evidence strip, press-and-hold to rule out, folding ghost cards, vibration on timer markers, keep-screen-on, installable app that works offline
- **Hunt mode**: one-tap red screen with a big hunt clock, smudge / hunt-over buttons and survival tips for the ghosts still possible
- **Smart next steps**: what to test next, how to get that evidence, and which behaviour would rule ghosts out
- **Learn**: cursed possessions guide, ghost-tell quiz with streaks, and personal case stats
- **Shared journal**: create a room, share the code or link, and everyone's journal stays in sync (peer-to-peer via PeerJS)
- **Voice commands** (Chrome/Edge): "EMF five", "no orbs", "nightmare", "rule out wraith", "smudge", "open map prison"…

## Data
Ghost data is based on the [Phasmophobia Wiki](https://phasmophobia.fandom.com/wiki/Phasmophobia_Wiki) and in-game testing. It lives in [`js/ghosts.js`](js/ghosts.js); ghosts marked `verify: true` are newer additions to double-check after patches. Sanity drain rates in `js/tools.js` are approximate and can be overridden in the app.

## Hosting on GitHub Pages
Push to GitHub → Settings → Pages → Deploy from branch `main`, folder `/ (root)`.
The shared journal and voice commands need the page served over HTTPS (GitHub Pages does this).
