// Builds the floor plans in /maps as SVG, all in one consistent style.
// Run:  node tools/build-maps.js
// Each map is a list of shapes in its own coordinate space:
//   rooms   R(x,y,w,h,label,opts)     rectangles (opts: size, rot, fill, cls)
//   tents   T(cx,cy,w,h,label,rot,fill,size)  rotated rectangles by centre
//   polys   P("x,y x,y ...")           filled outline (open areas, buildings)
//   circles C(cx,cy,r,label,opts)
//   walls   [x1,y1,x2,y2]   windows/doors same
//   stairs  [x,y,w,h,"v"|"h"]  v = you walk up/down the page (treads horizontal)
//   fuse    [cx,cy]
//   labels  [x,y,text,size,rotate]   zone / extra labels
//   floors  [x,y,text]                floor titles
"use strict";
const fs = require("fs");
const path = require("path");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const R = (x, y, w, h, label = "", o = {}) => ({ x, y, w, h, label, ...o });
const T = (cx, cy, w, h, label, rot = 0, fill, size) =>
  ({ x: cx - w / 2, y: cy - h / 2, w, h, label, rot, fill, size });
const P = (points, o = {}) => ({ points, ...o });
const C = (cx, cy, r, label = "", o = {}) => ({ cx, cy, r, label, ...o });

const STYLE = `
  .floor { fill: #1d2530; stroke: #d5dde7; stroke-width: 4; stroke-linejoin: round; }
  .outside { fill: #171d25; stroke: #5d6878; stroke-width: 2.5; stroke-linejoin: round; }
  .void { fill: #10151b; stroke: #5d6878; stroke-width: 2; stroke-dasharray: 8 6; }
  .solid { fill: #4a5462; stroke: #d5dde7; stroke-width: 3; }
  .wall  { stroke: #d5dde7; stroke-width: 4; stroke-linecap: round; }
  .furn  { fill: none; stroke: #4c596a; stroke-width: 2; }
  .stair { fill: #283241; stroke: #8b98aa; stroke-width: 2; }
  .tread { stroke: #8b98aa; stroke-width: 1.5; }
  .win   { stroke: #5fb6ff; stroke-width: 6; stroke-linecap: round; }
  .door  { stroke: #4fd394; stroke-width: 7; stroke-linecap: round; }
  .lbl   { fill: #eef2f6; text-anchor: middle; dominant-baseline: middle; }
  .zone  { fill: #c9d2dc; text-anchor: middle; dominant-baseline: middle; }
  .ft    { fill: #7fd8cd; font-size: 26px; font-weight: 700; letter-spacing: 2px; }
  .legend { fill: #c9d2dc; font-size: 18px; }
`;
// Cursed possession spawn spots: purple badge with the item's icon.
const CURSED_ICONS = { ouija: "🔤", music: "🎵", tarot: "🃏", paw: "🐒", mirror: "🪞", doll: "🪡", circle: "⭐" };
const CURSED_NAMES = { ouija: "Ouija", music: "Music box", tarot: "Tarot", paw: "Monkey paw", mirror: "Mirror", doll: "Voodoo doll", circle: "Summoning circle" };
const CURSED_KEY = Object.keys(CURSED_ICONS).map((k) => `${CURSED_ICONS[k]} ${CURSED_NAMES[k]}`);
const cursedBadge = (x, y, type) =>
  `<g><title>${CURSED_NAMES[type]}</title><circle cx="${x}" cy="${y}" r="15" fill="#2a1d3d" stroke="#c084fc" stroke-width="2.5"/>` +
  `<text x="${x}" y="${y + 1}" font-size="16" text-anchor="middle" dominant-baseline="middle">${CURSED_ICONS[type]}</text></g>`;

const FUSE = `<symbol id="fuse" viewBox="0 0 28 28"><rect x="1.5" y="1.5" width="25" height="25" rx="5" fill="#2a2210" stroke="#f0b93a" stroke-width="2.5"/><path d="M16 4 L8 15 H13 L11 24 L20 12 H15 Z" fill="#f0b93a"/></symbol>`;

function text(x, y, label, size, cls = "lbl", rot = 0, extra = "") {
  const lines = String(label).split("\n");
  const lh = size * 1.15;
  const y0 = y - ((lines.length - 1) * lh) / 2;
  const tr = rot ? ` transform="rotate(${rot} ${x} ${y})"` : "";
  return `<text class="${cls}" font-size="${size}"${tr}${extra}>` +
    lines.map((l, i) => `<tspan x="${x}" y="${(y0 + i * lh).toFixed(1)}">${esc(l)}</tspan>`).join("") +
    `</text>`;
}

function stairs([x, y, w, h, dir]) {
  let s = `<rect class="stair" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  if (dir === "v") for (let t = y + 9; t < y + h - 2; t += 9) s += `<line class="tread" x1="${x}" y1="${t}" x2="${x + w}" y2="${t}"/>`;
  else for (let t = x + 9; t < x + w - 2; t += 9) s += `<line class="tread" x1="${t}" y1="${y}" x2="${t}" y2="${y + h}"/>`;
  return s;
}

function build(m) {
  const out = [];
  const g = [];
  const def = { size: 20, ...m };
  (m.outside || []).forEach((p) => g.push(p.points
    ? `<polygon class="outside" points="${p.points}"/>`
    : `<rect class="outside" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}"/>`));
  (m.polys || []).forEach((p) => g.push(`<polygon class="${p.cls || "floor"}" points="${p.points}"${p.fill ? ` style="fill:${p.fill}"` : ""}/>`));
  (m.circles || []).forEach((c) => {
    g.push(`<circle class="${c.cls || "floor"}" cx="${c.cx}" cy="${c.cy}" r="${c.r}"${c.fill ? ` style="fill:${c.fill}"` : ""}/>`);
    if (c.wall) g.push(`<circle cx="${c.cx}" cy="${c.cy}" r="${c.r - c.wall / 2 - 2}" fill="none" stroke="#3a4452" stroke-width="${c.wall}"/>`);
  });
  (m.rooms || []).forEach((r) => {
    const tr = r.rot ? ` transform="rotate(${r.rot} ${r.x + r.w / 2} ${r.y + r.h / 2})"` : "";
    g.push(`<rect class="${r.cls || "floor"}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"${r.fill ? ` style="fill:${r.fill}"` : ""}${tr}/>`);
  });
  (m.furn || []).forEach(([x, y, w, h, rot]) => g.push(`<rect class="furn" x="${x}" y="${y}" width="${w}" height="${h}"${rot ? ` transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"` : ""}/>`));
  (m.solid || []).forEach(([x, y, w, h]) => g.push(`<rect class="solid" x="${x}" y="${y}" width="${w}" height="${h}"/>`));
  (m.stairs || []).forEach((s) => g.push(stairs(s)));
  (m.walls || []).forEach(([a, b, c, d]) => g.push(`<line class="wall" x1="${a}" y1="${b}" x2="${c}" y2="${d}"/>`));
  (m.win || []).forEach(([a, b, c, d]) => g.push(`<line class="win" x1="${a}" y1="${b}" x2="${c}" y2="${d}"/>`));
  (m.door || []).forEach(([a, b, c, d]) => g.push(`<line class="door" x1="${a}" y1="${b}" x2="${c}" y2="${d}"/>`));
  (m.fuse || []).forEach(([x, y]) => g.push(`<use href="#fuse" x="${x - 14}" y="${y - 14}" width="28" height="28"/>`));
  (m.cursed || []).forEach(([x, y, type]) => g.push(cursedBadge(x, y, type)));
  // labels last so they sit on top
  (m.rooms || []).forEach((r) => {
    if (!r.label) return;
    g.push(text(r.x + r.w / 2, r.y + r.h / 2, r.label, r.size || def.size, "lbl", r.rot || 0));
  });
  (m.circles || []).forEach((c) => { if (c.label) g.push(text(c.cx, c.cy, c.label, c.size || def.size + 6)); });
  (m.labels || []).forEach(([x, y, t, size, rot]) => g.push(text(x, y, t, size || 18, "zone", rot || 0)));
  (m.floors || []).forEach(([x, y, t, anchor]) =>
    g.push(`<text class="ft" x="${x}" y="${y}"${anchor ? ` text-anchor="${anchor}"` : ""}>${esc(t)}</text>`));

  const [dx, dy] = m.shift || [0, 0];
  const [lx, ly] = m.legend;
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.w} ${m.h}" width="${m.w}" height="${m.h}" font-family="Inter, Segoe UI, Arial, sans-serif">`);
  out.push(`<defs>${FUSE}<style>${STYLE}</style></defs>`);
  out.push(`<rect width="${m.w}" height="${m.h}" fill="#10151b"/>`);
  out.push(`<text x="60" y="78" fill="#eef2f6" font-size="${m.titleSize || 46}" font-weight="700">${esc(m.name)}</text>`);
  out.push(`<text x="62" y="112" fill="#8d99a8" font-size="18">${esc(m.sub)}</text>`);
  out.push(`<g transform="translate(${dx},${dy})">`);
  out.push(...g);
  out.push(`<g transform="translate(${lx},${ly})">
    <text x="0" y="0" class="ft" font-size="20">LEGEND</text>
    <use href="#fuse" x="0" y="22" width="26" height="26"/><text class="legend" x="42" y="42">Fuse box (possible spot)</text>
    <line class="door" x1="2" y1="80" x2="26" y2="80"/><text class="legend" x="42" y="86">Front door</text>
    <line class="win" x1="2" y1="118" x2="26" y2="118"/><text class="legend" x="42" y="124">Window</text>
    <rect class="stair" x="2" y="146" width="24" height="20"/><line class="tread" x1="10" y1="146" x2="10" y2="166"/><line class="tread" x1="18" y1="146" x2="18" y2="166"/>
    <text class="legend" x="42" y="163">Stairs</text>
    ${cursedBadge(13, 200, "circle")}<text class="legend" x="42" y="206">Cursed object spot</text>
    <text class="legend" x="0" y="240" font-size="15">${esc(CURSED_KEY.slice(0, 4).join("  ·  "))}</text>
    <text class="legend" x="0" y="264" font-size="15">${esc(CURSED_KEY.slice(4).join("  ·  "))}</text></g>`);
  out.push(`</g></svg>`);
  return out.join("\n");
}

// ---------- helpers for repeated rooms ----------
const column = (x, w, ys, names, size = 15) =>
  ys.slice(0, -1).map((y, i) => R(x, y, w, ys[i + 1] - y, names[i], { size }));
const row = (xs, y, h, names, size = 15) =>
  xs.slice(0, -1).map((x, i) => R(x, y, xs[i + 1] - x, h, names[i], { size }));

// =====================================================================
const MAPS = [];

// ---------- 13 Willow Street ----------
MAPS.push({
  id: "willow", name: "13 Willow Street", sub: "Small map · 3 floors", w: 1500, h: 1120, legend: [60, 900],
  polys: [
    P("268,373 347,373 347,576 627,576 627,795 541,795 541,868 208,868 208,673 268,673"),
    P("708,660 882,660 882,552 986,552 986,663 953,663 953,916 708,916"),
    P("986,730 1248,730 1248,770 1232,770 1232,876 1248,876 1248,950 986,950"),
  ],
  rooms: [
    R(208, 673, 161, 195, "Right\nStorage Room"), R(369, 673, 172, 195, "Left\nStorage Room"),
    R(708, 580, 158, 80, "Garage", { size: 18 }),
    R(986, 512, 262, 218, "Kitchen"),
    R(988, 950, 260, 48, "Porch", { cls: "outside", size: 14 }),
    R(856, 102, 177, 258, "Master\nBedroom"), R(1219, 102, 175, 255, "Boys\nBedroom"),
    R(1033, 245, 186, 113, "Hallway"), R(1033, 358, 150, 154, "Hallway"),
    R(1183, 358, 64, 154, "Bath", { size: 15 }),
  ],
  furn: [[784, 771, 76, 120]],
  stairs: [[347, 397, 171, 75, "h"], [842, 398, 190, 76, "h"]],
  labels: [[440, 600, "Basement Hallway", 20], [823, 735, "Garage", 20], [1115, 835, "Living Room", 20]],
  win: [[708, 718, 708, 768], [708, 808, 708, 858], [1248, 605, 1248, 680], [1143, 950, 1195, 950],
    [905, 102, 980, 102], [1268, 102, 1342, 102], [856, 230, 856, 300], [1393, 190, 1393, 265],
    [1087, 245, 1160, 245], [1247, 425, 1247, 448]],
  door: [[1048, 950, 1086, 950]],
  fuse: [[614, 693], [938, 777]],
  floors: [[208, 350, "BASEMENT"], [708, 540, "GROUND FLOOR"], [856, 85, "UPSTAIRS"]],
});

// ---------- 42 Edgefield Road ----------
MAPS.push({
  id: "edgefield", name: "42 Edgefield Road", sub: "Small map · 3 floors", w: 1560, h: 1000, legend: [60, 760],
  polys: [
    P("964,138 1067,138 1067,286 964,286"),
    P("1117,236 1268,236 1268,436 1270,436 1270,528 1168,528 1168,436 1117,436"),
    P("1272,436 1370,436 1370,483 1470,483 1470,583 1272,583"),
    P("967,828 1200,828 1200,680 1249,680 1249,920 967,920"),
  ],
  rooms: [
    R(407, 136, 92, 104, "Utility", { size: 18 }), R(499, 188, 113, 52, "Toilet", { size: 17 }),
    R(614, 136, 88, 104, "Hallway\n(Backdoor)", { size: 15 }), R(702, 136, 112, 254, "Dining\nRoom"),
    R(407, 240, 205, 146, "Kitchen"), R(612, 240, 103, 293, ""), R(407, 386, 205, 194, "Living\nRoom"),
    R(718, 390, 197, 190, "Garage"),
    R(964, 138, 103, 148, "Purple\nBedroom", { size: 17 }), R(1067, 188, 98, 48, "Purple Bath", { size: 12 }),
    R(1165, 138, 103, 98, "Bathroom\n(Upstairs)", { size: 15 }), R(1268, 138, 102, 150, "Orange\nBedroom", { size: 17 }),
    R(964, 286, 103, 150, "Green\nBedroom", { size: 17 }), R(1067, 290, 50, 95, "Bath", { size: 11 }),
    R(1268, 288, 102, 148, "Small Blue\nBedroom", { size: 16 }),
    R(964, 436, 148, 147, "Large Blue\nBedroom", { size: 17 }), R(1112, 483, 56, 100, "Bath", { size: 11 }),
    R(1370, 384, 100, 99, "Master\nBath", { size: 14 }),
    R(967, 645, 223, 183, "Basement\n(Storage)"),
  ],
  furn: [[1037, 648, 18, 43], [1130, 648, 18, 43], [969, 744, 90, 19], [1097, 744, 90, 19]],
  stairs: [[656, 335, 54, 122, "v"], [1213, 338, 52, 96, "v"], [1200, 680, 49, 128, "v"]],
  labels: [[635, 300, "Hallway", 17, -90], [1142, 355, "Upstairs Hallway", 17, -90], [1380, 530, "Master\nBedroom", 20], [1100, 880, "Basement", 20]],
  win: [[407, 298, 407, 368], [470, 580, 545, 580], [519, 188, 545, 188], [640, 136, 682, 136], [724, 136, 798, 136],
    [814, 140, 814, 180], [814, 315, 814, 355],
    [980, 138, 1050, 138], [964, 240, 964, 280], [964, 380, 964, 420], [1075, 188, 1103, 188], [1370, 145, 1370, 180],
    [1370, 315, 1370, 355], [1033, 583, 1100, 583], [1198, 528, 1238, 528], [1335, 583, 1405, 583], [1403, 384, 1440, 384]],
  door: [[620, 533, 652, 533]],
  fuse: [[900, 548], [1178, 693]],
  floors: [[407, 122, "GROUND FLOOR"], [964, 122, "UPSTAIRS"], [967, 628, "BASEMENT"]],
});

// ---------- 6 Tanglewood Drive ----------
MAPS.push({
  id: "tanglewood", name: "6 Tanglewood Drive", sub: "Small map · 2 floors", w: 1480, h: 900, legend: [60, 640],
  polys: [P("728,148 1147,148 1147,525 845,525 845,455 795,455 795,705 665,705 665,206 728,206")],
  rooms: [
    R(543, 78, 118, 128, "Master\nBathroom", { size: 16 }), R(661, 78, 67, 128, "Closet", { size: 14 }),
    R(551, 206, 177, 125, "Master\nBedroom"), R(543, 338, 122, 184, "Nursery"),
    R(630, 520, 38, 88, ""), R(551, 608, 110, 82, "Main\nBathroom", { size: 16 }),
    R(551, 712, 114, 121, "Boys\nBedroom"), R(665, 705, 70, 128, ""),
    R(852, 395, 108, 125, "Utility\nRoom", { size: 18 }), R(845, 525, 302, 305, "Garage"),
    R(1172, 215, 61, 150, ""), R(1233, 78, 171, 349, "Basement"),
  ],
  solid: [[795, 515, 50, 315]],
  furn: [[1237, 220, 46, 20], [1354, 222, 46, 20], [1237, 311, 46, 20], [1353, 311, 46, 20]],
  stairs: [[910, 148, 62, 175, "v"], [1172, 215, 61, 150, "v"]],
  walls: [[966, 395, 966, 520]],
  labels: [[815, 255, "Living\nRoom", 20], [1047, 262, "Dining\nRoom", 20], [1045, 440, "Kitchen", 20], [728, 600, "Foyer", 20]],
  win: [[815, 148, 888, 148], [997, 148, 1065, 148], [1147, 425, 1147, 478], [551, 230, 551, 305], [543, 360, 543, 440],
    [551, 640, 551, 668], [572, 833, 648, 833], [614, 78, 646, 78]],
  door: [[742, 705, 782, 705]],
  fuse: [[1292, 98], [988, 538]],
  floors: [[543, 62, "GROUND FLOOR"], [1172, 62, "BASEMENT"]],
});

// ---------- Bleasdale Farmhouse ----------
MAPS.push({
  id: "bleasdale", name: "Bleasdale Farmhouse", sub: "Small map · 3 floors", w: 1330, h: 1100, shift: [80, 60], legend: [0, 640],
  polys: [
    P("822,270 1187,270 1187,510 1105,510 1105,365 915,365 915,510 822,510"),
    P("637,667 826,667 826,570 1013,570 1013,667 1200,667 1200,993 637,993"),
  ],
  rooms: [
    R(0, 187, 182, 193, ""), R(42, 277, 138, 103, "Toilet"), R(0, 380, 182, 130, "Garage"),
    R(182, 90, 186, 287, ""), R(368, 187, 178, 190, "Living\nRoom"),
    R(182, 377, 186, 133, "Office"), R(368, 377, 178, 133, "Foyer"),
    R(180, 510, 366, 48, "Porch", { cls: "outside", size: 14 }),
    R(640, 187, 182, 174, "Girls\nBedroom"), R(640, 368, 182, 142, "Boys\nBedroom"),
    R(826, 88, 182, 182, "Master\nBedroom"), R(1015, 187, 172, 85, "Bathroom"),
    R(915, 365, 100, 145, "Side\nBathroom", { size: 16 }), R(1015, 365, 90, 145, "Utility", { size: 18 }),
  ],
  stairs: [[465, 475, 45, 35, "h"], [510, 420, 35, 90, "v"], [865, 276, 40, 30, "h"], [905, 276, 38, 72, "v"],
    [1150, 410, 37, 100, "v"], [1120, 470, 30, 40, "v"], [870, 755, 40, 30, "h"], [910, 785, 38, 55, "v"]],
  labels: [[98, 232, "Hallway", 20], [275, 160, "Dining\nRoom", 20], [278, 320, "Kitchen", 20], [1070, 316, "Hallway", 20], [908, 905, "Attic", 22]],
  win: [[110, 187, 156, 187], [200, 90, 250, 90], [295, 90, 345, 90], [186, 95, 186, 150], [366, 100, 366, 150], [546, 300, 546, 345],
    [10, 510, 62, 510], [110, 510, 156, 510], [200, 510, 246, 510], [296, 510, 342, 510],
    [640, 200, 640, 290], [640, 395, 640, 480], [750, 187, 800, 187], [845, 88, 890, 88], [1008, 95, 1008, 150],
    [1130, 187, 1175, 187], [1187, 290, 1187, 345], [1187, 395, 1187, 445], [660, 510, 706, 510], [840, 510, 890, 510],
    [940, 510, 988, 510], [1030, 510, 1080, 510]],
  door: [[20, 187, 52, 187], [395, 187, 428, 187], [398, 510, 428, 510]],
  fuse: [[166, 470], [532, 407], [650, 820]],
  floors: [[0, 165, "GROUND FLOOR"], [640, 168, "UPSTAIRS"], [637, 645, "ATTIC"]],
});

// ---------- Grafton Farmhouse ----------
MAPS.push({
  id: "grafton", name: "Grafton Farmhouse", sub: "Small map · 2 floors", w: 1700, h: 980, legend: [1000, 770],
  polys: [P("1156,525 1437,525 1437,700 1342,700 1342,605 1156,605")],
  rooms: [
    R(275, 227, 185, 93, "Storage\n(Workshop)", { size: 17 }), R(275, 320, 185, 195, "Kitchen"),
    R(275, 515, 185, 185, "Dining\nRoom"), R(460, 227, 180, 288, "Living\nRoom"), R(460, 515, 182, 185, "Foyer"),
    R(640, 227, 190, 185, "Master\nBedroom"), R(830, 227, 92, 85, "Closet", { size: 14 }),
    R(830, 312, 92, 203, "Master\nBath", { size: 15 }), R(702, 412, 128, 103, "Utility", { size: 18 }),
    R(642, 515, 188, 185, "Twin\nBedroom"), R(830, 515, 92, 185, "Twin\nCloset", { size: 14 }),
    R(365, 700, 368, 45, "Porch", { cls: "outside", size: 14 }),
    R(976, 525, 180, 176, "Nursery"), R(1156, 605, 144, 95, "", { cls: "void" }),
    R(1250, 425, 187, 100, "Upstairs\nBathroom", { size: 17 }), R(1442, 256, 180, 264, "Storage"),
    R(1437, 520, 185, 180, "Upstairs\nBedroom"),
  ],
  stairs: [[557, 665, 40, 35, "h"], [600, 625, 38, 40, "v"], [1300, 605, 42, 62, "v"], [1258, 668, 42, 32, "h"]],
  labels: [[1293, 556, "Upstairs Hallway", 19]],
  win: [[290, 227, 340, 227], [385, 227, 435, 227], [570, 227, 625, 227], [668, 227, 720, 227], [762, 227, 815, 227],
    [275, 435, 275, 490], [275, 535, 275, 590], [922, 340, 922, 390], [922, 435, 922, 490], [922, 535, 922, 590], [922, 635, 922, 690],
    [290, 700, 340, 700], [385, 700, 435, 700], [668, 700, 718, 700], [762, 700, 815, 700],
    [976, 540, 976, 590], [976, 635, 976, 690], [1622, 540, 1622, 590], [1622, 635, 1622, 690], [1368, 700, 1418, 700]],
  door: [[487, 700, 520, 700], [487, 227, 520, 227]],
  fuse: [[289, 268], [879, 295], [1453, 380]],
  floors: [[275, 210, "GROUND FLOOR"], [976, 505, "UPSTAIRS"]],
});

// ---------- Brownstone High School ----------
(() => {
  const L = [158, 238, 322, 405, 487, 567, 650];
  const U = [160, 240, 323, 405, 487, 567, 650];
  MAPS.push({
    id: "brownstone", name: "Brownstone High School", sub: "Large map · 2 floors", w: 1820, h: 980, legend: [1000, 760],
    rooms: [
      // ground floor
      ...column(98, 74, L, ["Classroom\n17", "Classroom\n16", "Classroom\n15", "Classroom\n14", "Classroom\n13", "Classroom\n12"], 14),
      R(172, 158, 38, 492, ""), R(772, 158, 38, 492, ""),
      ...column(810, 75, L, ["Classroom\n11", "Classroom\n10", "Classroom\n9", "Classroom\n8", "Classroom\n7", "Classroom\n6"], 14),
      R(210, 158, 115, 80, "Science 2\n(Lab)", { size: 13 }), R(325, 158, 73, 80, "Science\n2", { size: 13 }), R(398, 158, 37, 40, "", {}),
      R(550, 158, 35, 40, ""), R(585, 158, 112, 80, "Science 1\n(Lab)", { size: 13 }), R(697, 158, 75, 80, "Science\n1", { size: 13 }),
      R(210, 238, 188, 44, "Left Wing", { size: 16 }), R(585, 238, 187, 44, "Right Wing", { size: 16 }),
      R(210, 282, 77, 83, "Classroom\n19", { size: 13 }), R(210, 365, 77, 40, "Teacher WC", { size: 11 }), R(210, 405, 77, 42, "Boys WC", { size: 11 }),
      R(210, 447, 77, 78, ""), R(287, 282, 111, 123, "Girls\nLocker Room", { size: 15 }), R(287, 405, 111, 120, "Boys\nLocker Room", { size: 15 }),
      R(398, 158, 187, 367, "Basketball\nCourt"), R(585, 282, 112, 243, "Cafeteria"),
      R(697, 282, 75, 81, "Classroom\n18", { size: 13 }), R(697, 363, 75, 42, "Teacher WC", { size: 11 }), R(697, 405, 75, 40, "Girls WC", { size: 11 }),
      R(697, 445, 75, 80, ""),
      R(210, 525, 562, 42, "Ground Floor Corridor", { size: 16 }),
      ...row([210, 287, 360, 435], 567, 83, ["Classroom\n3", "Classroom\n2", "Classroom\n1"], 13),
      R(435, 567, 115, 165, ""),
      ...row([550, 625, 697, 772], 567, 83, ["Library", "Classroom\n4", "Classroom\n5"], 13),
      // upstairs
      ...column(977, 73, U, ["Classroom\n37", "Classroom\n36", "Classroom\n35", "Classroom\n34", "Classroom\n33", "Classroom\n32"], 14),
      R(1050, 160, 38, 490, ""), R(1650, 160, 40, 490, ""),
      ...column(1690, 73, U, ["Classroom\n31", "Classroom\n30", "Classroom\n29", "Classroom\n28", "Classroom\n27", "Classroom\n26"], 14),
      R(1088, 160, 115, 78, "Science 4\n(Lab)", { size: 13 }), R(1203, 160, 74, 78, "Science\n4", { size: 13 }), R(1277, 160, 36, 38, ""),
      R(1430, 160, 35, 38, ""), R(1465, 160, 112, 78, "Science 3\n(Lab)", { size: 13 }), R(1577, 160, 73, 78, "Science\n3", { size: 13 }),
      R(1088, 238, 189, 44, "Left Wing", { size: 16 }), R(1465, 238, 185, 44, "Right Wing", { size: 16 }),
      R(1088, 282, 77, 83, "Storage\nRoom 1", { size: 13 }), R(1088, 365, 77, 40, "Teacher WC", { size: 11 }), R(1088, 405, 77, 42, "Boys WC", { size: 11 }),
      R(1088, 447, 77, 78, ""), R(1165, 282, 112, 243, "Left Hall", { size: 17 }),
      R(1277, 160, 188, 365, "(open to court)", { cls: "void", size: 14 }),
      R(1465, 282, 112, 243, "Right Hall", { size: 17 }),
      R(1577, 282, 73, 83, "Storage\nRoom 2", { size: 13 }), R(1577, 365, 73, 40, "Teacher WC", { size: 11 }), R(1577, 405, 73, 42, "Girls WC", { size: 11 }),
      R(1577, 447, 73, 78, ""),
      R(1088, 525, 562, 42, "Upstairs Corridor", { size: 16 }),
      ...row([1088, 1165, 1238, 1313], 567, 83, ["Classroom\n22", "Classroom\n21", "Classroom\n20"], 13),
      R(1313, 567, 115, 165, "Lecture\nHall"),
      ...row([1428, 1503, 1577, 1650], 567, 83, ["Classroom\n23", "Classroom\n24", "Classroom\n25"], 13),
    ],
    stairs: [[210, 485, 77, 40, "h"], [697, 485, 75, 40, "h"], [1088, 485, 77, 40, "h"], [1577, 485, 73, 40, "h"]],
    labels: [[492, 708, "Lobby", 18], [191, 400, "Corridor", 14, -90], [791, 400, "Corridor", 14, -90], [1069, 400, "Corridor", 14, -90], [1670, 400, "Corridor", 14, -90]],
    door: [[478, 732, 508, 732]],
    fuse: [[222, 461], [708, 460], [1152, 352], [1588, 352]],
    floors: [[98, 142, "GROUND FLOOR"], [977, 142, "UPSTAIRS"]],
  });
})();

// ---------- Prison ----------
(() => {
  const cellYs = (y0, y1, n) => Array.from({ length: n + 1 }, (_, i) => Math.round(y0 + ((y1 - y0) * i) / n));
  const cells = (x, w, y0, y1, n) => column(x, w, cellYs(y0, y1, n), Array(n).fill(""));
  MAPS.push({
    id: "prison", name: "Prison", sub: "Large map · 2 floors + cell block upper levels", w: 2000, h: 1000, legend: [1700, 700],
    outside: [R(988, 158, 390, 90)],
    rooms: [
      // A block
      R(775, 158, 213, 387, ""), ...cells(775, 37, 235, 545, 8), ...cells(923, 37, 235, 545, 8),
      R(923, 350, 60, 80, "Security", { size: 11 }), R(830, 545, 80, 85, "A Block\nEntrance", { size: 13 }),
      // B block
      R(1378, 158, 236, 387, ""), ...cells(1403, 37, 235, 545, 8), ...cells(1550, 37, 235, 545, 8),
      R(1550, 350, 58, 80, "Security", { size: 11 }), R(1457, 545, 80, 85, "B Block\nEntrance", { size: 13 }),
      R(1537, 550, 78, 160, "Bathroom\nB", { size: 13 }),
      // centre
      R(1063, 315, 238, 238, "Cafeteria"), R(1220, 512, 80, 41, "Kitchen", { size: 12 }),
      R(1105, 553, 115, 77, "Central\nControl", { size: 15 }), R(1220, 553, 157, 77, "Library"),
      R(830, 630, 707, 80, ""), R(875, 710, 188, 78, "Bathroom A"),
      R(1063, 710, 80, 155, ""), R(1143, 710, 80, 155, "Visitation", { size: 13 }),
      R(1223, 710, 75, 235, "Entrance", { size: 15 }), R(1298, 710, 80, 235, "Admin\nHallway", { size: 15 }),
      R(1143, 865, 80, 80, "Inspection", { size: 12 }), R(1378, 865, 80, 80, ""),
      // upper cell blocks
      R(493, 230, 67, 315, ""), R(613, 230, 67, 315, ""), R(560, 350, 53, 30, ""),
      R(1693, 233, 67, 312, ""), R(1813, 233, 67, 312, ""), R(1760, 352, 53, 30, ""),
      // admin upstairs
      R(229, 438, 110, 108, "Cafeteria\nSecurity", { size: 14 }), R(22, 546, 80, 78, "Warden's\nOffice", { size: 13 }),
      R(102, 546, 237, 40, "Infirmary Hallway", { size: 12 }), R(102, 586, 80, 115, ""),
      R(182, 586, 157, 115, "Infirmary"), R(339, 546, 77, 155, "Infirmary", { size: 14 }),
      R(102, 701, 314, 80, "Office Hallway"), R(339, 701, 77, 158, "Main\nOffice", { size: 14 }),
      R(102, 781, 77, 77, ""), R(179, 781, 80, 77, "Office\nToilet", { size: 14 }), R(179, 858, 80, 80, "Chief\nSecurity", { size: 12 }),
      R(259, 781, 80, 157, ""), R(339, 859, 155, 80, ""),
    ],
    stairs: [[845, 192, 24, 68, "v"], [1470, 192, 24, 68, "v"], [563, 190, 25, 78, "v"], [1763, 192, 25, 78, "v"],
      [1065, 790, 40, 30, "h"], [1382, 869, 72, 72, "h"], [416, 863, 74, 50, "h"], [104, 783, 50, 30, "h"]],
    labels: [[1183, 203, "Outside", 18], [867, 300, "A Block\nHallway", 18], [1495, 300, "B Block\nHallway", 18],
      [1218, 670, "Main Hall", 20], [586, 460, "A Block\nUpper", 14], [1786, 460, "B Block\nUpper", 14]],
    door: [[1232, 945, 1270, 945], [988, 190, 988, 210], [1378, 190, 1378, 210]],
    fuse: [[90, 610], [113, 690], [247, 925], [970, 371], [1213, 722]],
    floors: [[1075, 290, "GROUND FLOOR"], [22, 420, "UPSTAIRS (OFFICES)"], [493, 172, "A CELLS UP"], [1693, 175, "B CELLS UP"]],
  });
})();

// ---------- Sunny Meadows Mental Institution ----------
(() => {
  const five = (xs, y, h, prefix, size) => xs.map((x, i) => R(x, y, 50, h, `${prefix}\n${5 - i}`, { size, rot: 0 }));
  const fiveF = (xs, y, h, prefix, size) => xs.map((x, i) => R(x, y, 50, h, `${prefix}\n${i + 1}`, { size }));
  MAPS.push({
    id: "sunny", name: "Sunny Meadows Mental Institution", sub: "Large map · 2 floors", titleSize: 38, w: 1900, h: 1080, legend: [1330, 90],
    rooms: [
      // ground floor: west
      R(185, 537, 555, 58, "Male Wing"), R(86, 418, 99, 100, "Male\nDorm", { size: 15 }), R(86, 525, 99, 112, "Male\nDay Room", { size: 15 }),
      R(185, 476, 35, 61, ""), R(245, 471, 63, 66, ""), R(308, 471, 75, 66, "Male\nBathroom", { size: 13 }),
      ...five([390, 447, 505, 563, 620], 471, 66, "Male", 12),
      // centre ring
      R(738, 215, 435, 380, ""), R(772, 250, 368, 175, "Courtyard", { cls: "outside" }),
      R(868, 435, 270, 103, ""), R(787, 495, 52, 40, "Infirmary", { size: 10 }),
      R(855, 537, 200, 50, "Entrance Corridor", { size: 14 }),
      R(902, 28, 115, 187, "Kitchen"), R(830, 28, 72, 92, "Scullery", { size: 13 }), R(830, 120, 72, 95, "Servants\nDining", { size: 13 }),
      R(1017, 28, 70, 92, "Boiler\nhouse", { size: 12 }), R(1017, 120, 70, 95, "Bake\nhouse", { size: 12 }),
      R(1087, 85, 43, 130, "Wash", { size: 11 }), R(1130, 85, 92, 130, "Laundry\nRoom", { size: 14 }),
      R(686, 120, 100, 45, "Dairy Store", { size: 13 }), R(686, 165, 100, 50, "Food Store", { size: 13 }), R(786, 120, 44, 95, ""),
      R(668, 235, 70, 58, "Foul Linen\nWest", { size: 11 }), R(668, 300, 70, 130, "Classroom", { size: 12 }),
      R(668, 430, 70, 65, "Visitors\nWest", { size: 12 }), R(668, 495, 70, 42, "Clothes\nStore", { size: 11 }),
      R(1173, 235, 68, 58, "Foul Linen\nEast", { size: 11 }), R(1173, 298, 68, 60, "Servant\nRoom 1", { size: 12 }),
      R(1173, 360, 68, 60, "Servant\nRoom 2", { size: 12 }), R(1173, 425, 68, 65, "Visitors\nEast", { size: 12 }),
      R(1173, 495, 68, 42, "Utility", { size: 12 }),
      // east
      R(1173, 537, 552, 58, "Female Wing"), ...fiveF([1243, 1300, 1357, 1415, 1473], 471, 66, "Female", 11),
      R(1525, 471, 78, 66, "Female\nBathroom", { size: 13 }), R(1603, 471, 64, 66, ""), R(1690, 476, 35, 61, ""),
      R(1725, 418, 100, 100, "Female\nDorm", { size: 15 }), R(1725, 525, 100, 112, "Female\nDay Room", { size: 15 }),
      // entrance
      R(870, 587, 65, 60, ""), R(935, 587, 40, 75, ""), R(975, 587, 65, 60, ""),
      R(920, 662, 67, 115, "Foyer", { size: 14 }), R(800, 662, 120, 82, "Manager\nOffice", { size: 14 }),
      R(987, 662, 120, 82, "Waiting\nRoom", { size: 14 }),
      // basement
      R(226, 893, 512, 58, "Hospital Wing"), R(124, 832, 102, 119, "Morgue"), R(243, 828, 65, 65, ""),
      R(308, 828, 75, 65, "Operating\nRoom", { size: 12 }),
      ...five([390, 447, 505, 563, 620], 828, 65, "Hospital", 10),
      R(668, 858, 70, 35, "Storage", { size: 11 }),
      R(738, 893, 117, 57, "West\nCorridor", { size: 13 }), R(777, 852, 60, 41, "Padded\nCell 1", { size: 10 }),
      R(840, 825, 120, 70, "Matron\nOffice 1", { size: 13 }), R(960, 825, 105, 70, "Matron\nOffice 2", { size: 13 }),
      R(855, 895, 200, 52, "Basement Corridor", { size: 14 }), R(1085, 852, 45, 41, "Cell 2", { size: 10 }),
      R(1055, 893, 118, 57, "East\nCorridor", { size: 13 }),
      R(1173, 893, 475, 58, "Restricted Wing"), ...fiveF([1243, 1300, 1357, 1415, 1473], 828, 65, "Restricted", 9),
      R(1528, 828, 75, 65, "Exam\nRoom", { size: 11 }), R(1603, 828, 65, 65, ""),
      R(870, 947, 65, 58, ""), R(935, 947, 40, 75, ""), R(975, 947, 65, 58, ""),
    ],
    stairs: [[247, 475, 58, 58, "v"], [1606, 475, 58, 58, "v"], [873, 590, 59, 54, "h"], [246, 831, 59, 59, "v"],
      [1606, 831, 59, 59, "v"], [873, 950, 59, 52, "h"]],
    labels: [[955, 232, "Courtyard Corridor", 15], [1003, 466, "Chapel", 20]],
    door: [[943, 777, 967, 777]],
    fuse: [[1033, 113], [956, 412], [928, 716], [1183, 505], [942, 983]],
    floors: [[86, 400, "GROUND FLOOR"], [86, 810, "BASEMENT"]],
  });
})();

// ---------- Maple Lodge Campsite ----------
MAPS.push({
  id: "maple", name: "Maple Lodge Campsite", sub: "Medium map · outdoor campsite + cabin", w: 1800, h: 1000, legend: [1490, 700],
  outside: [P("240,535 240,380 330,275 375,275 410,240 410,155 600,140 690,165 830,162 900,195 985,182 1578,90 1575,470 1420,483 1420,355 1198,362 1088,375 1088,905 418,905")],
  polys: [P("1198,375 1410,362 1420,618 1210,628"), P("1214,705 1438,692 1450,905 1222,918")],
  rooms: [
    R(240, 380, 332, 155, ""), R(415, 385, 23, 95, "", { cls: "solid" }),
    R(672, 533, 175, 170, "Reception\nBuilding"),
    R(857, 550, 58, 130, "Storage\nTent 2", { size: 13 }), R(1025, 772, 58, 130, "Storage\nTent 1", { size: 13 }),
    R(605, 652, 55, 130, "Food\nTent", { size: 13 }),
    T(636, 163, 70, 100, "Red\nTent", 15, "#5a2a2a", 14), T(789, 186, 65, 105, "Blue\nTent", 10, "#26355a", 14),
    T(950, 250, 100, 65, "Yellow\nTent", -25, "#5a5226", 14), T(508, 315, 65, 100, "Black\nTent", 10, "#15181d", 14),
    T(636, 410, 75, 100, "White\nTent", -35, "#6b7078", 14), T(875, 432, 65, 95, "Grey\nTent", -25, "#454b55", 14),
    T(606, 598, 110, 70, "Green\nTent", -35, "#22472c", 14), T(447, 583, 120, 45, "Games Tent", -15, "#3a3f48", 13),
    R(1345, 395, 65, 95, "Kitchen", { size: 13 }),
    R(1222, 800, 110, 115, "Cabin\nBathroom", { size: 13 }), R(1280, 655, 60, 50, ""),
    R(1447, 190, 215, 60, "Pier", { fill: "#3a2a18" }),
  ],
  circles: [C(495, 725, 30, "", { fill: "#4a2c14" }), C(708, 243, 30, "", { fill: "#4a2c14" })],
  furn: [[335, 385, 80, 95], [438, 385, 80, 95]],
  stairs: [[1370, 570, 40, 45, "v"], [1405, 790, 40, 95, "v"]],
  labels: [[357, 336, "Female Toilets", 18], [288, 476, "Female\nToilets", 16], [531, 505, "Male\nToilets", 16],
    [763, 412, "Reception", 18], [1273, 255, "Picnic Area", 20], [1055, 415, "North East Path", 17, -90],
    [972, 730, "Staff Storage Area", 18], [752, 832, "Entrance", 20], [495, 770, "Campfire A", 13], [708, 288, "Campfire B", 13],
    [1290, 480, "Cabin\nLiving Room", 18], [1360, 740, "Cabin Bedroom", 17]],
  door: [[712, 905, 808, 905]],
  fuse: [[532, 398], [709, 519], [1016, 520], [916, 890], [1392, 377]],
  floors: [[1198, 345, "CABIN · GROUND"], [1214, 680, "CABIN · UP"]],
});

// ---------- Camp Woodwind ----------
MAPS.push({
  id: "woodwind", name: "Camp Woodwind", sub: "Small map · outdoor campsite", w: 1600, h: 1050, legend: [60, 800],
  outside: [P("617,198 950,173 1045,225 1075,248 1240,225 1270,240 1365,380 1528,575 1510,740 1355,925 1230,968 1100,983 672,987 555,920 600,745 590,733 617,590")],
  rooms: [
    T(1153, 155, 120, 190, "Red\nTent", 8, "#5a2a2a"), T(500, 655, 205, 135, "Yellow\nTent", 5, "#5a5226"),
    T(788, 510, 135, 185, "Blue\nTent", -8, "#26355a"), T(668, 858, 120, 190, "White\nTent", 28, "#6b7078"),
    T(1392, 572, 165, 230, "Food\nTent", -42, "#3a3f48"), T(1385, 795, 140, 210, "Games\nTent", 42, "#3a3f48"),
    T(1355, 262, 160, 185, "Bathroom", -42, "#2b333e", 18),
    T(995, 203, 65, 85, "", -20, "#4f2d5a"), T(912, 388, 85, 70, "", 5, "#4f2d5a"),
  ],
  furn: [[725, 318, 130, 75, -5], [801, 773, 50, 90, 25], [908, 803, 60, 80, 10]],
  circles: [C(1187, 633, 35, "", { fill: "#4a2c14" })],
  labels: [[748, 252, "Lovers Bench", 20], [1092, 332, "Kids Area", 20], [1190, 565, "Campfire", 20], [944, 738, "Picnic Area", 20]],
  door: [[987, 983, 1097, 983]],
  fuse: [[1333, 401]],
  floors: [],
});

// ---------- Point Hope ----------
MAPS.push({
  id: "pointhope", name: "Point Hope", sub: "Small map · lighthouse, one floor per circle", w: 1560, h: 1330, shift: [60, 70], legend: [10, 880],
  polys: [P("0,118 290,118 300,355 0,355")],
  rooms: [R(15, 138, 115, 110, "Entry\nBathroom", { size: 15 }), R(200, 140, 90, 75, "", {})],
  circles: [
    C(510, 237, 230, "Living\nRoom", { wall: 45 }), C(918, 237, 178, "Kitchen"), C(1280, 237, 172, "Dining\nRoom"),
    C(166, 682, 165, "Games\nRoom"), C(562, 682, 160, "Bathroom"), C(945, 682, 152, "Master\nBedroom", { size: 24 }),
    C(1310, 682, 145, "Child\nBedroom", { size: 24 }), C(370, 1015, 137, "Maintenance\nRoom", { size: 21 }),
    C(760, 1015, 128, "Lantern Room\n(Downstairs)", { size: 18 }),
    C(1136, 1015, 200, "", { fill: "#171d25" }), C(1136, 1015, 130, "Lantern Room\n(Upstairs)", { size: 18 }),
  ],
  stairs: [[650, 232, 24, 20, "h"], [910, 70, 24, 20, "h"], [763, 173, 24, 20, "h"], [1366, 308, 24, 20, "h"], [1223, 355, 24, 20, "h"],
    [74, 553, 24, 20, "h"], [245, 568, 24, 20, "h"], [431, 738, 24, 20, "h"], [631, 783, 24, 20, "h"]],
  labels: [[140, 285, "Entry Hallway", 15, -40], [575, 790, "Bathroom Hallway", 14], [1290, 790, "Child Bedroom Hallway", 13], [1136, 1180, "Balcony", 20],
    [510, -8, "1 · Ground", 15], [918, 44, "2", 15], [1280, 50, "3", 15], [166, 502, "4", 15], [562, 507, "5", 15], [945, 515, "6", 15],
    [1310, 522, "7", 15], [370, 863, "8", 15], [760, 872, "9", 15], [1136, 800, "10", 15]],
  door: [[145, 355, 190, 355]],
  fuse: [[250, 273], [670, 272], [780, 147], [1256, 394], [1180, 700]],
  floors: [],
});

// =====================================================================
// ---------- Nell's Diner ----------
MAPS.push({
  id: "nells", name: "Nell's Diner", sub: "Small map · 1 floor", w: 1380, h: 860, shift: [200, 80], legend: [700, 160],
  polys: [
    P("265,62 325,62 325,345 155,345 155,282 265,282"),                 // hallway
    P("325,62 495,62 495,170 383,170 383,110 325,110"),                 // break room
    P("325,170 612,170 612,285 552,285 552,228 325,228"),               // staff hallway
    P("385,340 552,340 552,285 612,285 612,452 385,452"),               // kitchen
  ],
  rooms: [
    R(155, 62, 110, 108, "Men's\nBathroom", { size: 16 }), R(155, 172, 110, 110, "Women's\nBathroom", { size: 16 }),
    R(325, 110, 58, 60, "Staff\nWC", { size: 12 }), R(495, 62, 117, 108, "Manager's\nOffice", { size: 16 }),
    R(325, 228, 60, 117, "Janitor's\nCloset", { size: 12 }), R(385, 228, 107, 112, "Storage", { size: 17 }),
    R(492, 228, 60, 112, "Cooler", { size: 13 }),
    R(155, 345, 230, 277, "Dining Area"), R(385, 452, 227, 170, ""),
    R(290, 622, 60, 66, "Foyer", { size: 13 }),
  ],
  furn: [[262, 410, 8, 140], [400, 512, 165, 20]],
  labels: [[230, 314, "Hallway", 15], [440, 140, "Break Room", 16], [470, 200, "Staff Hallway", 16], [498, 400, "Kitchen", 19], [498, 580, "Counter Area", 18]],
  win: [[155, 395, 155, 455], [155, 500, 155, 560], [175, 622, 270, 622], [400, 622, 590, 622], [612, 470, 612, 600], [190, 62, 235, 62], [520, 62, 590, 62]],
  door: [[298, 688, 342, 688], [612, 240, 612, 268]],
  fuse: [[373, 250], [565, 253], [597, 490]],
  floors: [[155, 45, "GROUND FLOOR"]],
});

// ---------- Sunny Meadows Restricted ----------
MAPS.push({
  id: "restricted", name: "Sunny Meadows Restricted", sub: "Medium map · 1 floor (part of Sunny Meadows)", titleSize: 40,
  w: 1420, h: 950, legend: [60, 640],
  outside: [R(512, 235, 400, 195), R(512, 430, 88, 125), R(390, 512, 78, 38), R(955, 352, 78, 70), R(610, 612, 80, 75), R(732, 612, 78, 75)],
  polys: [P("470,195 955,195 955,610 470,610 470,195 512,195 512,555 912,555 912,235 512,235 512,195")],
  rooms: [
    R(905, 42, 110, 150, "Laundry\nRoom", { size: 16 }),
    R(512, 235, 400, 195, "Courtyard", { cls: "outside" }),
    R(600, 440, 312, 115, ""), R(522, 505, 58, 45, "Infirmary", { size: 11 }),
    R(600, 555, 220, 55, "Entrance Corridor", { size: 15 }),
    R(390, 212, 78, 70, "West Foul\nLinen", { size: 12 }), R(390, 285, 78, 145, "Classroom", { size: 13 }),
    R(390, 438, 78, 72, "West\nVisitors", { size: 13 }),
    R(955, 212, 78, 70, "East Foul\nLinen", { size: 12 }), R(955, 288, 78, 62, "Servants'\nRoom 2", { size: 12 }),
    R(955, 428, 78, 68, "East\nVisitors", { size: 13 }), R(955, 500, 78, 50, ""),
    R(693, 610, 35, 80, ""),
    R(540, 688, 130, 100, "Manager's\nOffice", { size: 16 }), R(670, 688, 80, 207, ""), R(750, 688, 130, 100, "Waiting\nRoom", { size: 16 }),
  ],
  stairs: [[738, 618, 66, 62, "v"]],
  labels: [[712, 215, "Courtyard Corridor", 16], [756, 470, "Chapel", 20], [491, 400, "Corridor", 14, -90], [934, 400, "Corridor", 14, -90], [710, 850, "Foyer", 16], [994, 512, "Utility", 12]],
  door: [[690, 895, 730, 895]],
  fuse: [[712, 420], [994, 536], [682, 763]],
  floors: [[390, 170, "GROUND FLOOR"]],
});

// Cursed possession spots per map (same coordinates as the map shapes).
const CURSED_SPOTS = {
  nells:      [[240, 150, "circle"], [470, 95, "mirror"], [592, 152, "music"], [355, 328, "ouija"], [578, 395, "paw"], [178, 405, "doll"], [437, 475, "tarot"]],
  restricted: [[640, 528, "ouija"], [676, 528, "music"], [712, 528, "circle"], [748, 528, "doll"], [784, 528, "paw"], [820, 528, "mirror"], [856, 528, "tarot"]], // all in the Chapel
  willow:     [[1384, 150, "doll"], [1167, 440, "paw"], [814, 598, "ouija"], [307, 630, "circle"], [1126, 890, "tarot"], [1028, 930, "music"], [728, 651, "mirror"]],
  edgefield:  [[478, 218, "ouija"], [541, 404, "music"], [700, 487, "mirror"], [676, 521, "tarot"], [1345, 232, "paw"], [990, 500, "doll"], [1090, 706, "circle"]],
  tanglewood: [[896, 165, "tarot"], [1125, 318, "paw"], [648, 468, "mirror"], [604, 500, "music"], [1125, 548, "doll"], [1298, 182, "circle"], [1341, 405, "ouija"]],
  bleasdale:  [[484, 198, "music"], [160, 408, "ouija"], [195, 470, "mirror"], [263, 492, "tarot"], [865, 245, "paw"], [904, 485, "doll"], [1048, 910, "circle"]],
  grafton:    [[467, 515, "mirror"], [879, 270, "ouija"], [372, 628, "tarot"], [592, 603, "music"], [662, 654, "paw"], [1073, 686, "doll"], [1530, 288, "circle"]],
  brownstone: [[452, 590, "ouija"], [492, 590, "circle"], [532, 590, "mirror"], [452, 628, "tarot"], [492, 628, "doll"], [532, 628, "paw"], [492, 666, "music"]], // all in the Lobby
  prison:     [[1259, 722, "circle"], [1261, 777, "mirror"], [1245, 880, "doll"], [1245, 918, "ouija"]],
  sunny:      [[885, 518, "ouija"], [921, 518, "music"], [957, 518, "circle"], [993, 518, "doll"], [1029, 518, "paw"], [1065, 518, "mirror"], [1101, 518, "tarot"]], // all in the Chapel
  maple:      [[1166, 190, "tarot"], [737, 262, "music"], [426, 396, "ouija"], [962, 552, "paw"], [686, 682, "mirror"], [474, 662, "doll"], [1373, 566, "circle"]],
  woodwind:   [[1038, 245, "doll"], [835, 330, "paw"], [590, 617, "music"], [1347, 500, "circle"], [995, 580, "mirror"], [822, 836, "tarot"], [1420, 818, "ouija"]],
  pointhope:  [[525, 400, "tarot"], [1355, 108, "mirror"], [186, 700, "ouija"], [567, 694, "circle"], [938, 610, "music"], [1420, 612, "doll"], [452, 966, "paw"]],
};
// extra room for the bigger legend
const MIN_H = { willow: 1180, grafton: 1050, brownstone: 1050, woodwind: 1080, tanglewood: 940, edgefield: 1040 };
MAPS.forEach((m) => {
  m.cursed = CURSED_SPOTS[m.id] || [];
  if (MIN_H[m.id]) m.h = Math.max(m.h, MIN_H[m.id]);
});

const outDir = path.join(__dirname, "..", "maps");
for (const m of MAPS) {
  fs.writeFileSync(path.join(outDir, `${m.id}.svg`), build(m));
  console.log("wrote", `${m.id}.svg`);
}
