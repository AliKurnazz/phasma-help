# Phasma Help

A Phasmophobia investigation helper: evidence journal, ghost filter, timers, sanity tracker,
maps, shared journal, voice commands. Plain HTML/CSS/JS, **no framework and no build step**.
Live on GitHub Pages: https://alikurnazz.github.io/phasma-help/ (deploys from `main`, root folder).

The owner is not a programmer: explain results in plain language, give exact git commands
instead of running `git commit`/`git push` yourself, and show screenshots of visual changes.

## Files
| File | What it does |
|---|---|
| `index.html` | Page shell. Left = journal, middle = ghost cards, right = tool tabs (Timers, Speed, Sanity, Team, Log). Dialogs: maps, settings/help. |
| `css/style.css` | Base styles + phone layout (`@media (max-width: 800px)`, several blocks; later blocks override earlier ones). |
| `css/themes.css` | EMF meter, IDENTIFIED stamp, settings UI, and the 3 looks: `spectral` (default), `nightvision`, `journal` via `:root[data-theme=…]`. |
| `js/ghosts.js` | **All game data**: `EVIDENCE`, `GHOSTS`, `OBSERVATIONS`, `HUNT_BUCKETS`. Ghosts with `verify: true` are newer and less certain. |
| `js/app.js` | Core: state, filtering (`evidenceReason`, `filterReason`), rendering, timers, tapper. Exposes `window.PH`. |
| `js/tools.js` | Tabs (`PHTools.showTab`), weather notes, sanity tracker. |
| `js/maps.js` | Map viewer: list, zoom/pan/pinch, marks per map. Loads `maps/<id>.svg` first, then png/jpg/webp. |
| `js/voice.js` | Voice commands (Web Speech API, Chrome/Edge). Parser in `handle(text)`. |
| `js/sync.js` | Shared journal over PeerJS (loaded on demand from jsDelivr). |
| `js/log.js` | Case log timeline + shareable report (`PHLog`). |
| `js/mobile.js` | Bottom nav, swipe between views, floating timer dock, search toggle, wake lock, install prompt, service worker registration. |
| `js/fx.js` | Theme switching, generated sound effects (Web Audio), haptics toggle (`PHFx`). |
| `tools/build-maps.js` | Generates `maps/*.svg` from shape lists. Run `node tools/build-maps.js`. `maps/ridgeview.svg` is hand-written. |
| `sw.js` | Offline support, network-first. **Bump `CACHE` version** when adding/renaming files, and add new files to `SHELL`. |
| `manifest.webmanifest`, `icons/` | Installable app + home-screen icons. Icon URLs carry `?v=N` to beat phone caches; bump N if icons change. |

Script load order matters (index.html bottom): ghosts → app → maps → tools → voice → sync → log → mobile → fx.

## How the pieces talk
- `window.PH` (app.js): `state`, `possible()`, `findGhost(text)`, `setEvidence(k, v)` (v: 1 found, -1 ruled out, 0 unknown),
  `setDifficulty(n)`, `toggleSpeed`, `ruleOut`, `bringBack`, `guess`, `search`, `reset`, `timers.{s,c,h}.toggle()`,
  `onChange(fn)`, `sharedState()`, `applyRemote(obj)`.
- `PH.onChange` listeners fire on local changes; remote (synced) changes fire the DOM event `ph:remote` instead.
- Other DOM events: `ph:timer` {name, running, elapsed}, `ph:mark` {name, label} when a timer marker is reached.
- Synced state keys: `evidence, evCount, speed, los, hunt, manualOut, guess, obs`. Adding one means: add to `SHARED`
  **and** validate it in `applyRemote` (only accept known keys/values: it comes from other people).

## Rules
- Must work at **390px phone width** and on desktop, in **all 3 themes**. Use CSS variables (`--bg --panel --field --text
  --text-2 --muted --accent --accent-2 --yes --no --warn --line --line-strong`), not hard-coded colors; the journal theme is light.
- Game facts only in `js/ghosts.js`. Unsure numbers: mark `verify: true` and say so.
- Never put user input, voice text or synced data into `innerHTML`; use `textContent` / DOM nodes.
- `localStorage` reads/writes always inside `try/catch`.
- No copied or watermarked images (no third-party map art). Maps are our own SVGs.
- Don't reference other cheat-sheet sites in the code. Credit for data: the Phasmophobia Wiki (footer/README).
- Keep keyboard shortcuts (1–7, Shift+1–7, S/C/H/T/M/V, /, Backspace) working; update the help dialog when adding one.
- Don't commit or push; finish with the git commands for the owner.

## Testing
1. Syntax: `for f in js/*.js sw.js tools/build-maps.js; do node --check "$f"; done`
2. Serve locally (any static server; it must send `image/svg+xml` for `.svg`), e.g. a small Node `http` server on port 5500.
3. Screenshots with headless Edge:
   `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless --disable-gpu --user-data-dir=<tmp> --window-size=1600,1000 --virtual-time-budget=3000 --screenshot=<out.png> http://localhost:5500/`
   Headless windows can't go below ~500px wide: for phone views, put the site in `<iframe width="390" height="844">`
   on a temporary page **served from the same origin** (so it can call `iframe.contentWindow.PH…` to set up state),
   screenshot that, then delete the temporary page. `?view=journal|ghosts|tools` opens a phone section directly.

## Ideas backlog (pick from here when asked to "add stuff")
- Ghost quiz / practice mode (show a tell → guess the ghost)
- Cursed possessions guide (Ouija questions, music box, tarot cards, monkey paw, summoning circle, haunted mirror, voodoo doll)
- Equipment tiers cheat sheet; challenge-mode / custom difficulty builder
- Personal stats across cases (most found ghost, win rate, average case time)
- Ghost room marker synced through the shared journal; room-by-room checklist on maps
- Fingerprint / DOTS / writing "how to get it" tips per evidence
- More languages (Dutch first), with all UI text in one object
