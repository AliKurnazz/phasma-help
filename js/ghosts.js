// Ghost data. Edit this file when the game updates.
// evidence keys: emf, box, uv, orb, writing, freezing, dots
// forced: evidence that is always visible on reduced-evidence difficulties
// hunt: sanity thresholds (%) at which the ghost can start a normal hunt
// speed: base speed range in m/s (incl. line-of-sight build-up where relevant)
// los: whether the ghost speeds up with line of sight like a normal ghost
// tags: speed categories for filtering
// verify: newer ghost, double-check numbers against the current patch

const EVIDENCE = [
  { key: "emf",      name: "EMF Level 5",  short: "EMF 5",   hotkey: "1" },
  { key: "box",      name: "Spirit Box",   short: "Box",     hotkey: "2" },
  { key: "uv",       name: "Ultraviolet",  short: "UV",      hotkey: "3" },
  { key: "orb",      name: "Ghost Orb",    short: "Orbs",    hotkey: "4" },
  { key: "writing",  name: "Ghost Writing",short: "Writing", hotkey: "5" },
  { key: "freezing", name: "Freezing Temps",short: "Freezing",hotkey: "6" },
  { key: "dots",     name: "D.O.T.S.",     short: "DOTS",    hotkey: "7" },
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
            "More singing ghost events."],
    tests: ["Listen on the parabolic mic for the shriek.", "Note who it ignores during hunts."] },

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
            "More visible during hunts (blinks less)."],
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

  { name: "Gallu", evidence: ["emf", "box", "uv"], hunt: [40, 60], speed: [1.36, 2.8], los: true, tags: ["slow", "normal", "fast"], verify: true,
    tells: ["Gets enraged by protective equipment (salt, crucifix, incense).",
            "Enraged: faster and hunts at higher sanity; calm: slower."],
    tests: ["Use protective items repeatedly and watch the hunt speed climb."] },

  { name: "Dayan", evidence: ["emf", "box", "orb"], hunt: [45, 60], speed: [1.2, 2.25], los: false, tags: ["slow", "normal", "fast"], verify: true,
    tells: ["Reacts to player movement close to it.",
            "Faster while you move nearby, slower if you stand still."],
    tests: ["Stand still vs walk near it during a hunt and compare speed."] },

  { name: "Obambo", evidence: ["uv", "writing", "dots"], hunt: [10, 65], speed: [1.45, 1.96], los: true, tags: ["slow", "normal", "fast"], verify: true,
    tells: ["Switches between a calm and an aggressive state on a timer.",
            "Calm: slower, hunts only at very low sanity. Aggressive: faster, hunts early."],
    tests: ["Track activity over a few minutes: clear calm/aggressive phases."] },
];

// Behaviour you saw → which ghosts it rules out.
// out: ghosts that can NOT do this. only: the only ghosts that can.
// minHunt: the ghost must be able to hunt at or above this sanity.
const OBSERVATIONS = [
  { key: "salt",      label: "Ghost stepped in salt",                    out: ["Wraith"] },
  { key: "breakeroff",label: "Ghost turned the fuse box OFF",            out: ["Jinn"] },
  { key: "breakeron", label: "Ghost turned the fuse box ON",             out: ["Hantu"] },
  { key: "lighton",   label: "Ghost turned a light ON",                  out: ["Mare"] },
  { key: "airball",   label: "Saw the airball (mist) event",             out: ["Oni"] },
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

// Hunt filter buckets
const HUNT_BUCKETS = [
  { key: "late",      label: "Late (<50%)",   test: (h) => h.some((v) => v < 50) },
  { key: "normal",    label: "Normal (50%)",  test: (h) => h.includes(50) },
  { key: "early",     label: "Early (55-70%)",test: (h) => h.some((v) => v > 50 && v <= 70) },
  { key: "veryearly", label: "Very early (75%+)", test: (h) => h.some((v) => v >= 75) },
];
