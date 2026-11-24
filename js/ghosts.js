// Ghost data. Edit this file when the game updates.
// evidence keys: emf, box, uv, orb, writing, freezing, dots
// forced: evidence that is always visible on reduced-evidence difficulties
// hunt: sanity thresholds (%) at which the ghost can start a normal hunt
// speed: base speed range in m/s (incl. line-of-sight build-up where relevant)
// los: whether the ghost speeds up with line of sight like a normal ghost
// tags: speed categories for filtering
// verify: newer ghost, double-check numbers against the current patch

const EVIDENCE = [
  { key: "emf",      name: "EMF Level 5",  short: "EMF 5",   hotkey: "1",
    how: "Hold the EMF reader where the ghost just interacted: thrown items, opened doors, light switches." },
  { key: "box",      name: "Spirit Box",   short: "Box",     hotkey: "2",
    how: "Lights off, stand in the ghost room and ask questions. Some ghosts only answer when you're alone." },
  { key: "uv",       name: "Ultraviolet",  short: "UV",      hotkey: "3",
    how: "Shine UV on doors, light switches, windows and keyboards the ghost touched. Salt footprints count too." },
  { key: "orb",      name: "Ghost Orb",    short: "Orbs",    hotkey: "4",
    how: "Watch the ghost room through a video camera or head-cam with night vision." },
  { key: "writing",  name: "Ghost Writing",short: "Writing", hotkey: "5",
    how: "Put a ghost writing book on the floor in the ghost room and check it every minute." },
  { key: "freezing", name: "Freezing Temps",short: "Freezing",hotkey: "6",
    how: "Use a thermometer in the ghost room: below 0 °C / 32 °F. You'll also see your breath." },
  { key: "dots",     name: "D.O.T.S.",     short: "DOTS",    hotkey: "7",
    how: "Place a D.O.T.S. projector in the ghost room and watch for the green figure (or on camera)." },
];

// What to do during a hunt if this ghost is still possible.
const HUNT_TIPS = {
  "Deogen": "Deogen: it always finds you. Don't hide: loop it around furniture, it's very slow up close.",
  "Revenant": "Revenant: extremely fast once it sees you. Break line of sight early and hide.",
  "Yokai": "Yokai: it only hears you within 2.5 m. Stay quiet and keep electronics off.",
  "Jinn": "Jinn: turn the fuse box off so it can't speed up.",
  "Raiju": "Raiju: drop or switch off electronics; they make it faster.",
  "Hantu": "Hantu: faster in cold rooms. Run through warm parts of the house.",
  "Moroi": "Moroi: smudging blinds it for longer; it's faster when sanity is low.",
  "Thaye": "Thaye: a young Thaye is very fast; it slows down as it ages.",
  "Myling": "Myling: you'll hear footsteps late. Watch for flickering lights instead.",
  "Phantom": "Phantom: invisible for long stretches. Don't rely on seeing it.",
  "Demon": "Demon: can hunt again after just 20 s. Stay near a hiding spot.",
  "Spirit": "Spirit: a smudge keeps it from hunting for 3 minutes.",
  "The Twins": "Twins: the next hunt might be slightly faster than the last.",
  "Obake": "Obake: it may change shape during the hunt.",
  "The Mimic": "Mimic: it copies other ghosts, so expect anything.",
  "Banshee": "Banshee: it chases one target. If it's not you, help them.",
  "Shade": "Shade: it won't start a hunt while someone is in its room.",
  "Oni": "Oni: very visible during hunts; you'll see it coming.",
};

// Cursed possessions: what they do and how risky they are.
// Exact sanity costs change between patches, so kept descriptive.
const CURSED = [
  { name: "Ouija Board", icon: "🔤", risk: 3,
    does: "Ask it questions out loud: where the ghost is, how old it is, how many people are in the room, and more.",
    risk_text: "Every question costs sanity, bigger questions cost more. Running out of sanity, or walking away without saying “goodbye”, triggers a cursed hunt.",
    tip: "Ask “where are you?” early to find the ghost room. Always end with “goodbye”." },
  { name: "Music Box", icon: "🎵", risk: 3,
    does: "Wind it up and it plays a tune; a nearby ghost sings along and can appear and walk towards it.",
    risk_text: "Drains sanity while playing. If the ghost reaches you or the song ends near it, a cursed hunt can start.",
    tip: "Great for finding the ghost room: listen for singing, then drop it and run." },
  { name: "Tarot Cards", icon: "🃏", risk: 4,
    does: "Draw a card for a random effect: restore or lose sanity, force a ghost event, trap the ghost, revive a teammate, or worse.",
    risk_text: "Death starts a cursed hunt, The Moon drops sanity to 0, and The Hanged Man kills you instantly.",
    tip: "Draw at high sanity and near a hiding spot. The Sun restores your sanity fully." },
  { name: "Monkey Paw", icon: "🐒", risk: 4,
    does: "Make a wish (for example to see the ghost room, more activity, or to revive someone). Wishes come true… with a price.",
    risk_text: "Every wish has a nasty side effect, from slower movement to hunts.",
    tip: "Only wish when you know what you're trading. Location wishes are popular." },
  { name: "Haunted Mirror", icon: "🪞", risk: 2,
    does: "Look into it to see a view of the ghost room.",
    risk_text: "Drains sanity quickly while you look. It breaks when your sanity runs too low and can trigger a cursed hunt.",
    tip: "A quick look at high sanity is usually enough to find the room." },
  { name: "Voodoo Doll", icon: "🪡", risk: 3,
    does: "Pins are pushed in at random, forcing the ghost to interact (good for evidence like UV or EMF).",
    risk_text: "Each pin costs some sanity. The heart pin starts a cursed hunt.",
    tip: "Use it near the ghost room with EMF and UV ready." },
  { name: "Summoning Circle", icon: "🕯", risk: 4,
    does: "Light all 5 candles and the ghost appears in the circle. Perfect for a ghost photo.",
    risk_text: "Each candle costs sanity, and after the ghost appears it starts a cursed hunt.",
    tip: "Take the photo, then run to your hiding spot straight away." },
];

const N = [1.7, 2.8]; // normal ghost: 1.7 m/s, LOS build-up to ~2.8

const GHOSTS = [
  { name: "Spirit", evidence: ["emf", "box", "writing"], hunt: [50], speed: N, los: true, tags: ["normal"],
    tells: ["Smudging stops it from hunting for 180 s (normal ghosts: 90 s)."],
    tests: ["Smudge it, then watch: a hunt between 90 s and 180 s rules Spirit out."] },

  { name: "Wraith", evidence: ["emf", "box", "dots"], hunt: [50], speed: N, los: true, tags: ["normal"],
    tells: ["Never steps in salt.", "Can teleport next to a player, leaving EMF 2 there."],
    tests: ["Salt the ghost room: footprints in salt rule Wraith out."] },

  { name: "Phantom", evidence: ["box", "uv", "dots"], hunt: [50], speed: N, los: true, tags: ["normal"],
    tells: ["Disappears when photographed during a ghost event (photo shows no ghost).",
            "Blinks less often during hunts: invisible for longer stretches.",
            "Looking at it drains extra sanity."],
    tests: ["Take a photo during a manifestation: if it vanishes instantly, likely Phantom."] },

  { name: "Poltergeist", evidence: ["box", "uv", "writing"], hunt: [50], speed: N, los: true, tags: ["normal"],
    tells: ["Can throw many items at once (each drains 2% sanity of nearby players).",
            "Throws objects far more often than other ghosts."],
    tests: ["Make a pile of throwables in the ghost room and wait for a 'burst' throw."] },

  { name: "Banshee", evidence: ["uv", "orb", "dots"], hunt: [50], speed: N, los: true, tags: ["normal"],
    tells: ["Only checks its target's sanity for hunts and chases that one player.",
            "Unique scream on the parabolic microphone.",
            "More singing ghost events.",
            "Always female (name and model)."],
    tests: ["Listen on the parabolic mic for the shriek.", "Note who it ignores during hunts.", "A male ghost name rules Banshee out."] },

  { name: "Jinn", evidence: ["emf", "uv", "freezing"], hunt: [50], speed: [1.7, 2.5], los: false, tags: ["normal", "fast"],
    tells: ["Never turns the fuse box off.",
            "With the fuse box on: 2.5 m/s when it sees you from >3 m away.",
            "Ability: drains 25% sanity of players near the fuse box."],
    tests: ["Leave the breaker on: if the ghost turns it off, it is not a Jinn."] },

  { name: "Mare", evidence: ["box", "orb", "writing"], hunt: [60, 40], speed: N, los: true, tags: ["normal"],
    tells: ["Hunts at 60% in the dark, 40% when its room is lit.",
            "Turns lights off right after they are switched on.",
            "Never turns lights on; breaks bulbs more often."],
    tests: ["Turn on the ghost room light: switched off within seconds, likely Mare."] },

  { name: "Revenant", evidence: ["orb", "writing", "freezing"], hunt: [50], speed: [1.0, 3.0], los: false, tags: ["slow", "fast"],
    tells: ["1.0 m/s while searching, 3.0 m/s once it sees a player.",
            "Slows down gradually after losing you."],
    tests: ["Hide during a hunt: very slow footsteps that then speed up sharply on sight."] },

  { name: "Shade", evidence: ["emf", "writing", "freezing"], hunt: [35], speed: N, los: true, tags: ["normal"],
    tells: ["Hunts only below 35% sanity.",
            "Can't start a hunt while a player is in its room.",
            "Very shy: little activity with players nearby; shadow-form events."],
    tests: ["Long periods of no activity with a group in the room point to Shade."] },

  { name: "Demon", evidence: ["uv", "writing", "freezing"], hunt: [70, 100], speed: N, los: true, tags: ["normal"],
    tells: ["Hunts at 70%; its ability lets it hunt at any sanity.",
            "Only 20 s between hunts (normal: 25 s).",
            "Smudging stops hunts for only 60 s; crucifix range is 1.5×."],
    tests: ["Hunt within 20-25 s of the last one ending → Demon.",
            "Hunt 60-90 s after a smudge → Demon."] },

  { name: "Yurei", evidence: ["orb", "freezing", "dots"], hunt: [50], speed: N, los: true, tags: ["normal"],
    tells: ["Ability: slams a door fully shut and drains 15% sanity.",
            "Smudging traps it in its room for 90 s."],
    tests: ["A door slammed shut with no hunt plus a big sanity drop suggests Yurei."] },

  { name: "Oni", evidence: ["emf", "freezing", "dots"], hunt: [50], speed: N, los: true, tags: ["normal"],
    tells: ["More active with players nearby; shows itself more.",
            "Can't do the 'airball' (hissing mist) ghost event.",
            "More visible during hunts (blinks less).",
            "Its ghost events drain 20% sanity (others 10%)."],
    tests: ["Seeing the airball event rules Oni out."] },

  { name: "Yokai", evidence: ["box", "orb", "dots"], hunt: [80, 50], speed: N, los: true, tags: ["normal"],
    tells: ["Can hunt at 80% if players talk near it.",
            "During hunts only hears voices and electronics within 2.5 m."],
    tests: ["Talk near it during a hunt from >2.5 m: if it doesn't come to you, likely Yokai."] },

  { name: "Hantu", evidence: ["uv", "orb", "freezing"], forced: "freezing", hunt: [50], speed: [1.4, 2.7], los: false, tags: ["slow", "normal", "fast"],
    tells: ["Faster in cold rooms, slower in warm rooms; no LOS speed-up.",
            "Visible freezing breath during hunts while the fuse box is off.",
            "Never turns the fuse box on."],
    tests: ["Turn the breaker off and watch for breath vapour during a hunt."] },

  { name: "Goryo", evidence: ["emf", "uv", "dots"], forced: "dots", hunt: [50], speed: N, los: true, tags: ["normal"],
    tells: ["DOTS only shows on a video camera with nobody in the room.",
            "Rarely wanders far from its room; never changes favourite room."],
    tests: ["DOTS seen with your own eyes rules Goryo out."] },

  { name: "Myling", evidence: ["emf", "uv", "writing"], hunt: [50], speed: N, los: true, tags: ["normal"],
    tells: ["During hunts footsteps are only audible within ~12 m (same range as flicker).",
            "More frequent paranormal sounds on the parabolic mic."],
    tests: ["Electronics flicker before you hear footsteps during a hunt → Myling."] },

  { name: "Onryo", evidence: ["box", "orb", "freezing"], hunt: [60], speed: N, los: true, tags: ["normal"],
    tells: ["Hunts at 60%; blowing out the 3rd flame can trigger a hunt.",
            "A lit flame near it blocks hunts like a crucifix."],
    tests: ["Place a lit candle/firelight: a blocked hunt that consumes the flame → Onryo."] },

  { name: "The Twins", evidence: ["emf", "box", "freezing"], hunt: [50], speed: [1.53, 1.87], los: true, tags: ["normal", "fast"],
    tells: ["Interactions in two places at nearly the same time.",
            "Each hunt is either ~10% slower or ~10% faster than normal."],
    tests: ["Compare hunt speeds: alternating slightly slow / slightly fast hunts."] },

  { name: "Raiju", evidence: ["emf", "orb", "dots"], hunt: [65, 50], speed: [1.7, 2.5], los: false, tags: ["normal", "fast"],
    tells: ["2.5 m/s near active electronics.",
            "Hunts at 65% with electronics running nearby.",
            "Disrupts electronics from 15 m (normal: 10 m)."],
    tests: ["Drop active electronics on the hunt path: sudden speed-up → Raiju."] },

  { name: "Obake", evidence: ["emf", "uv", "orb"], forced: "uv", hunt: [50], speed: N, los: true, tags: ["normal"],
    tells: ["Can leave six-fingered or odd fingerprints.",
            "Fingerprints may disappear twice as fast.",
            "Briefly shapeshifts into another model during hunts."],
    tests: ["Check every handprint closely: six fingers → Obake."] },

  { name: "The Mimic", evidence: ["box", "uv", "freezing"], fakeOrb: true, hunt: [15, 50, 60, 100], speed: [1.0, 3.0], los: true, tags: ["slow", "normal", "fast"],
    tells: ["Copies other ghosts' abilities, speed and hunt sanity.",
            "Always shows Ghost Orbs as an extra, fake evidence (even on Nightmare)."],
    tests: ["Orbs alongside Box + UV + Freezing → Mimic.", "Behaviour that changes mid-contract."] },

  { name: "Moroi", evidence: ["box", "writing", "freezing"], forced: "box", hunt: [50], speed: [1.5, 3.71], los: true, tags: ["normal", "fast"],
    tells: ["Curses you via Spirit Box / parabolic mic responses: faster passive drain until you take pills.",
            "Gets faster as average sanity drops (1.5 → 2.25 m/s base).",
            "Smudging blinds it for longer during hunts."],
    tests: ["Compare hunt speed at high vs low sanity."] },

  { name: "Deogen", evidence: ["box", "writing", "dots"], forced: "box", hunt: [40], speed: [0.4, 3.0], los: false, tags: ["slow", "fast"],
    tells: ["Always knows where players are during hunts; hiding doesn't work.",
            "Very fast far away (3 m/s), crawls at 0.4 m/s next to you.",
            "Heavy bull-like breathing on the Spirit Box at close range."],
    tests: ["Loop it around furniture: extremely slow up close → Deogen."] },

  { name: "Thaye", evidence: ["orb", "writing", "dots"], hunt: [75, 15], speed: [1.0, 2.75], los: false, tags: ["slow", "normal", "fast"],
    tells: ["Ages while players are near it.",
            "Young: very active, 2.75 m/s, hunts at 75%. Old: slow 1.0 m/s, hunts at 15%."],
    tests: ["Ask the Ouija board its age repeatedly: rising age → Thaye.",
            "Activity and speed drop over the contract."] },

  { name: "Gallu", evidence: ["emf", "box", "uv"], hunt: [40, 50, 60], speed: [1.36, 2.8], los: true, tags: ["slow", "normal", "fast"],
    tells: ["Has 3 moods: normal (1.7 m/s, hunts at 50%), enraged (1.96 m/s, hunts at 60%) and weakened (1.36 m/s, hunts at 40%).",
            "Gets enraged by protection: a burnt crucifix, incense, or stepping in salt (even tier I).",
            "Enraged: no longer disturbs salt and its crucifix range is 2 m shorter. After an enraged hunt it becomes weakened."],
    tests: ["Put several salt piles in its path: steps in the first, then stops stepping in the rest → Gallu.",
            "Use a crucifix or incense, then compare: a faster next hunt points to Gallu."] },

  { name: "Dayan", evidence: ["emf", "box", "orb"], hunt: [45, 50, 65], speed: [1.2, 2.8], los: true, tags: ["slow", "normal", "fast"],
    tells: ["Reacts to the nearest player within 10 m (even through floors).",
            "If you move near her: fixed 2.25 m/s and hunts at 65%. Stand still: 1.2 m/s and hunts at 45%.",
            "With nobody within 10 m it acts normal (50%, 1.7 m/s). Always female."],
    tests: ["During a hunt, stand still near it, then walk: 1.2 → 2.25 m/s → Dayan.",
            "A male ghost name rules Dayan out."] },

  { name: "Obambo", evidence: ["uv", "writing", "dots"], hunt: [10, 65], speed: [1.45, 2.8], los: true, tags: ["slow", "normal", "fast"],
    tells: ["Switches between calm and aggressive every 2 minutes, even mid-hunt (first switch 1 min after the front door opens).",
            "Calm: 1.45 m/s, hunts only at 10%. Aggressive: 1.96 m/s, hunts at 65%.",
            "Hunts that start aggressive are 20% shorter."],
    tests: ["Time a hunt that started fast: 20% shorter than normal → Obambo.",
            "Footsteps switching slow ↔ fast mid-hunt for no reason."] },
];

// Behaviour you saw → which ghosts it rules out.
// out: ghosts that can NOT do this. only: the only ghosts that can.
// minHunt: the ghost must be able to hunt at or above this sanity.
const OBSERVATIONS = [
  { key: "salt",      label: "Ghost stepped in salt",                    out: ["Wraith"] },
  { key: "breakeroff",label: "Ghost turned the fuse box OFF",            out: ["Jinn"] },
  { key: "breakeron", label: "Ghost turned the fuse box ON",             out: ["Hantu"] },
  { key: "lighton",   label: "Ghost turned a light ON",                  out: ["Mare"] },
  { key: "airball",   label: "Saw the airball (mist) event",             out: ["Oni", "Kormos"] },
  { key: "male",      label: "The ghost is male (name, model or voice)", out: ["Banshee", "Dayan"] },
  { key: "hidesafe",  label: "It found someone in a hiding spot and the hunt just ended", only: ["Aswang", "The Mimic"] },
  { key: "dotseye",   label: "Saw DOTS with your own eyes",              out: ["Goryo"] },
  { key: "inroom",    label: "Hunt started with someone in its room",    out: ["Shade"] },
  { key: "hunt55",    label: "Hunted above 50% sanity",                  minHunt: 51 },
  { key: "hunt75",    label: "Hunted above 70% sanity",                  minHunt: 71 },
  { key: "smudge60",  label: "Hunted 60–90 s after a smudge",            only: ["Demon", "The Mimic"] },
  { key: "smudge90",  label: "Hunted 90–180 s after a smudge",           out: ["Spirit"] },
  { key: "fast20",    label: "Hunted 20–25 s after the last hunt ended", only: ["Demon", "The Mimic"] },
  { key: "sixfinger", label: "Found a six-fingered print",               only: ["Obake", "The Mimic"] },
  { key: "scream",    label: "Heard a shriek on the parabolic mic",      only: ["Banshee", "The Mimic"] },
  { key: "breath",    label: "Saw freezing breath during a hunt",        only: ["Hantu", "The Mimic"] },
];

// ---- Ghosts added in 2026 (Alan Wake event v0.17 and v0.18). Numbers from Phasmopedia, game v0.19.0.2 ----
GHOSTS.push(
  { name: "Kormos", evidence: ["orb", "box", "uv"], hunt: [50, 70], speed: [1.7, 2.21], los: false, tags: ["normal", "fast"],
    tells: ["Nearly blind: only sees you within 5 m with nothing in between.",
            "Hears footsteps on its floor: sprinting 30 m, walking 15 m, crouching 10 m. Heads there 30% faster (2.21 m/s).",
            "Hunts at 70% if someone sprints in its room (50% otherwise). Never does the mist or chasing ghost events."],
    tests: ["Stand still in an open area during a hunt: it walks close past you, then finds you as soon as you move → Kormos.",
            "Sprint in the ghost room at high sanity: a hunt above 50% points to Kormos."] },

  { name: "Aswang", evidence: ["freezing", "writing", "dots"], hunt: [50], speed: [1.53, 2.53], los: true, tags: ["slow", "normal", "fast"],
    tells: ["Starts slow (1.53 m/s) but speeds up with line of sight much faster than normal (2.53 m/s in ~9 s).",
            "Can't kill you inside an official hiding spot: the hunt ends instantly.",
            "If it found you hiding, its next hunt heads straight for that spot."],
    tests: ["Hide in an official hiding spot: if it finds you and the hunt just ends → Aswang (risky: any other ghost kills you).",
            "Slow start, then a very fast speed-up once it sees you."] },

  { name: "Deildegast", evidence: ["emf", "writing", "dots"], hunt: [50], speed: [0.4, 3.0], los: false, tags: ["slow", "normal", "fast"],
    tells: ["Starts at 3.0 m/s and loses 0.1 m/s for each different object your team moved outside hunts (min 0.4 m/s at 26).",
            "The count resets after every hunt and when a crucifix burns. No line-of-sight speed-up.",
            "Uses doors and light switches less often, and its interactions sometimes fail."],
    tests: ["Move ~15 different objects before the next hunt: clearly slower → Deildegast.",
            "First hunt with nothing moved: very fast footsteps (3 m/s) that don't speed up on sight."] },
);
Object.assign(HUNT_TIPS, {
  "Kormos": "Kormos: don't sprint. Crouch or stand still; it's nearly blind and hunts by sound.",
  "Aswang": "Aswang: get into an official hiding spot (closet or locker); it can't kill you there.",
  "Deildegast": "Deildegast: very fast (up to 3 m/s) unless your team moved lots of objects before the hunt.",
  "Gallu": "Gallu: don't spam protection: crucifix, incense and salt make it faster and hunt earlier.",
  "Dayan": "Dayan: if it's near you, stand still: it drops to 1.2 m/s.",
  "Obambo": "Obambo: hunts that start fast are 20% shorter. Just survive it.",
});

// Hunt filter buckets
const HUNT_BUCKETS = [
  { key: "late",      label: "Late (<50%)",   test: (h) => h.some((v) => v < 50) },
  { key: "normal",    label: "Normal (50%)",  test: (h) => h.includes(50) },
  { key: "early",     label: "Early (55-70%)",test: (h) => h.some((v) => v > 50 && v <= 70) },
  { key: "veryearly", label: "Very early (75%+)", test: (h) => h.some((v) => v >= 75) },
];

// Latest Phasmophobia update, shown in the help dialog. Source: Kinetic Games news (official).
const GAME_NEWS = {
  title: "Resonance",
  date: "Released 24 November 2026 · all platforms",
  source: "https://www.kineticgames.co.uk/news/resonance-releasedate",
  items: [
    ["🗣", "Ghost voice commands", "Ask the ghost to use nearby doors and light switches, throw objects, or give a sign it's there. The phrases you can use are on a new Journal page. Also works in Text mode (VR players: via the sanity watch)."],
    ["🦴", "Dowsing Rods (new equipment)", "Help you find the Bone, mainly on big maps like Brownstone High School. Tier 1 points in the general direction; Tier 3 is much more accurate, including which floor."],
    ["🎙", "Sound Sensor rework", "Its map now shows what kind of sound it picked up: looping sounds stay a while, single sounds ping once. Only sounds on your floor show. You can use it to judge the ghost's speed during a hunt."],
    ["🗺", "Map pool", "Pick as many maps as you like for a random pool, with quick buttons for small, medium and large maps. The dice picks a random map."],
    ["⚙", "Unity 6, lighting and settings", "Better performance and many bug fixes, improved lighting, graphics presets, an extreme shadow setting, and colour-blind options. Xbox Play Anywhere support."],
  ],
  note: "No new ghosts and no ghost or evidence changes were announced. Full patch notes come out at launch.",
};
