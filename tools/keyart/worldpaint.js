// Rampart Riot — world map painter (3200x1800). Painterly top-down map in the style of the battle maps, zoomed out:
// Greenmarch farmland (SW), the Frostbound mountains (N), the Drowned Crown marshes (SE), the Rampart (N-S) and the
// Heart of Ash beyond it. Stage flags, the travel route and region fog come from js/data/worldmap.js; the game draws
// labels, flags and the dotted route on top, so no text is baked in. Props reuse the battle-map painters (deco.js).
import { WORLD, ORDER } from '../../js/data/worldmap.js';
import { makeNoise, rngf } from '../maps/lib/noise.js';
import * as D from '../maps/lib/deco.js';
import { toon, flat, ellipse, circle, rrect, poly, blob, dark, light, alpha, OUT, line, setOL, banner, pole, star, wallBricks } from '../art/lib/toon.js';
import { cylinder, merlons, cone } from '../art/lib/build.js';
import { mk, clamp, lerp, sstep, rgb, mix3, css, smooth, glowAt, edt, pointInPoly, distToPoly, PI, TAU } from './kit.js';

const W = 3200, H = 1800, Q = 4; // Q: low-res factor for masks
const N = makeNoise(4242), N2 = makeNoise(99);
const S = WORLD.stages;

// ---------------- geography ----------------
const SEA = [[-40, -40], [175, -40], [138, 110], [190, 245], [128, 390], [205, 505], [118, 650], [158, 800], [82, 950], [140, 1100], [215, 1240], [168, 1380], [225, 1500], [190, 1590], [262, 1665], [388, 1720], [430, 1840], [-40, 1840]];
const WALL = smooth([[2238, -40], [2216, 150], [2232, 330], [2196, 520], [2205, 700], [2160, 880], [2182, 1060], [2160, 1250], [2185, 1425], [2168, 1600], [2150, 1840]], 12);
const GATES = { east: [2160, 880], south: [2185, 1425] };
const wallXAt = y => { for (let i = 1; i < WALL.length; i++) if (WALL[i][1] >= y) { const [x0, y0] = WALL[i - 1], [x1, y1] = WALL[i]; return lerp(x0, x1, (y - y0) / ((y1 - y0) || 1)); } return WALL[WALL.length - 1][0]; };
const LAGOON = smooth([[1572, 1840], [1576, 1722], [1600, 1640], [1658, 1572], [1740, 1538], [1832, 1546], [1922, 1562], [1994, 1604], [2042, 1672], [2052, 1760], [2060, 1840]], 6);
const ISLAND = smooth([[1752, 1606], [1800, 1588], [1862, 1598], [1894, 1640], [1876, 1700], [1810, 1722], [1756, 1704], [1734, 1656], [1752, 1606]], 5);
const RIVERS = [
  { pts: [[1000, 545], [985, 640], [960, 740], [930, 830], [800, 990], [700, 1160], [610, 1310], [560, 1400], [528, 1520], [478, 1640], [440, 1760], [430, 1850]], w: 24, src: 10 },  // the Willow
  { pts: [[1300, 640], [1360, 760], [1450, 860], [1560, 950], [1640, 1080], [1680, 1220], [1740, 1380], [1790, 1548]], w: 20, src: 9 },               // the Mournwater, into the lagoon
  { pts: [[620, 560], [640, 700], [700, 860], [800, 990]], w: 11, src: 6 },                                                                               // a mountain brook
];
const LAVA = [
  { pts: [[2700, -30], [2790, 180], [2880, 400], [2950, 600], [2985, 740]], w: 14 },
  { pts: [[2400, 250], [2560, 330], [2720, 400], [2880, 470], [2960, 620]], w: 10 },
  { pts: [[2610, 1850], [2730, 1560], [2810, 1260], [2860, 1060], [2925, 935]], w: 15 },
  { pts: [[3240, 1260], [3150, 1110], [3090, 980]], w: 11 },
  { pts: [[2370, 1690], [2480, 1660], [2580, 1650], [2690, 1640]], w: 6 },
  { pts: [[3200, 560], [3120, 640], [3070, 740]], w: 7 },
  { pts: [[3000, 1560], [2900, 1460], [2810, 1330]], w: 6 },
];
const CRATER = { x: 3025, y: 870, r: 140 };
const BRIDGE = { a: [1612, 1641], b: [1742, 1656] }; // stone bridge to the cathedral island (3-7)
const CAUSEWAY = { a: [1890, 1660], b: [2040, 1640] }; // the island's eastern causeway

// ---------------- helpers ----------------
const strokePts = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
const fillPts = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
function maskCanvas(draw, q = Q) { const c = mk(W / q, H / q), g = c.getContext('2d'); g.scale(1 / q, 1 / q); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round'; draw(g); return c; }
function maskData(c) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, a = new Uint8Array(c.width * c.height); for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] > 127 ? 1 : 0; return a; }
const snowLine = x => 610 + 70 * (N.fbm(x / 500, 3.3, 3) - 0.5) * 2 - 70 * sstep(1500, 2150, x);
function biome(x, y) {
  const ash = sstep(-6, 24, x - wallXAt(y));
  const sl = snowLine(x) + 40 * (N.fbm(x / 120, y / 120, 2) - 0.5) * 2;
  const snow = (1 - ash) * sstep(sl + 40, sl - 30, y);
  const high = (1 - ash) * (1 - snow) * sstep(sl + 190, sl + 40, y);
  const dl = Math.hypot((x - 1790) / 560, (y - 1620) / 470);
  const swamp = (1 - ash) * (1 - snow) * sstep(1.12, 0.78, dl + 0.25 * (N.fbm(x / 160, y / 160, 3) - 0.5));
  return { snow, high, swamp, ash };
}

// palettes for the battle-map prop painters
const PM = { leaf: ['#4f8a34', '#5a9a3a', '#3f7a2e', '#6aa840', '#4a8a3a'], trunk: '#6b4423', rock: '#9a958c', bush: '#4a8a30', berry: '#c0392b', flowers: ['#f2e05a', '#f08aa8', '#ffffff', '#b88af0'], roofs: ['#a8452c', '#8a5a3a', '#b0602a', '#7a4a3a'], thatch: true, pine: '#2f5a3a', tuft: '#3f6a28', fence: '#9a6a3a', ruin: '#aaa59c' };
const PS = { leaf: ['#2f5a46'], pine: '#2f5a4a', snowy: true, trunk: '#5a3e2a', rock: '#8a8e96', bush: '#4a6a5a', roofs: ['#7a4a3a', '#5a5a6a'], deadwood: '#4a3e36', ruin: '#a8a8b0', tuft: '#7a8a6a' };
const PH = { ...PM, leaf: ['#3f7a3a', '#4a7a36'], pine: '#2a5236', rock: '#8e8c84' };
const PW = { leaf: ['#4a6a2e', '#3a5a2a'], willow: '#5a7a3a', trunk: '#4a3a2a', deadwood: '#3e342a', moss: '#6a8a3a', rock: '#6e7064', rockMoss: '#5a7a32', bush: '#3e5a2a', roofs: ['#5a4a3a', '#6a5040'], ruin: '#8a8a7e', mushroom: '#c8a040', reed: '#7a8a3a', tuft: '#3a4a22' };
const PA = { leaf: ['#4a3a2e'], trunk: '#3a2e26', deadwood: '#2e2622', rock: '#5a5452', obsidian: '#26222c', ember: '#ff6a20', bush: '#4a3a30', roofs: ['#4a3a3a'], ruin: '#6a625c', tuft: '#5a4a3a' };

// ---------------- ground ----------------
const PAL = {
  meadow: ['#6a9640', '#5c8838', '#7aa64c', '#86ad52'], high: ['#7d8c58', '#6c7a4e', '#8c9466', '#9a9c78'],
  snow: ['#dbe5ee', '#c9d6e3', '#e9f0f5', '#bccbda'], swamp: ['#5e6c3c', '#4c5c32', '#6a764a', '#56643a'],
  ash: ['#4a4440', '#3a3432', '#57504a', '#433c38'],
};
function paintGround(g) {
  const lw = W / Q, lh = H / Q, c = mk(lw, lh), cg = c.getContext('2d'), id = cg.createImageData(lw, lh), d = id.data;
  const P = {}; for (const k in PAL) P[k] = PAL[k].map(rgb);
  const pick = (pal, n1, n2) => { let c = mix3(pal[0], pal[1], clamp((n1 - 0.35) * 2.2)); c = mix3(c, pal[2], Math.max(0, n2 - 0.55) * 1.8); return mix3(c, pal[3], Math.max(0, 0.42 - n2) * 1.6); };
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const X = x * Q + Q / 2, Y = y * Q + Q / 2;
    const n1 = N.fbm(X / 150, Y / 150, 4), n2 = N.fbm(X / 48 + 50, Y / 48 + 50, 3);
    const b = biome(X, Y);
    let c = pick(P.meadow, n1, n2);
    c = mix3(c, pick(P.high, n1, n2), b.high);
    c = mix3(c, pick(P.swamp, n1, n2), b.swamp);
    c = mix3(c, pick(P.snow, n1, n2), b.snow);
    c = mix3(c, pick(P.ash, n1, n2), b.ash);
    if (b.ash > 0) { const dc = Math.hypot(X - CRATER.x, Y - CRATER.y); c = mix3(c, [96, 52, 40], b.ash * clamp(1 - dc / 700) * 0.55); }
    const i = (y * lw + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  cg.putImageData(id, 0, 0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(c, 0, 0, W, H);
  const R = rngf(7);
  for (let i = 0; i < 80000; i++) { // painterly grain
    const x = R() * W, y = R() * H, b = biome(x, y);
    const pal = b.ash > 0.5 ? PAL.ash : b.snow > 0.5 ? PAL.snow : b.swamp > 0.5 ? PAL.swamp : b.high > 0.5 ? PAL.high : PAL.meadow;
    const base = rgb(pal[Math.floor(R() * 4)]), k = R() < 0.5 ? 0.82 : 1.12;
    g.strokeStyle = css([base[0] * k, base[1] * k, base[2] * k], 0.16 + R() * 0.16);
    g.lineWidth = 1 + R() * 1.4;
    const a = -PI / 2 + (R() - 0.5) * 0.9, l = 3 + R() * 5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  for (let i = 0; i < 90; i++) { const x = R() * W, y = R() * H, r = 120 + R() * 300; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, R() < 0.5 ? 'rgba(255,250,210,0.07)' : 'rgba(0,20,10,0.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  for (let i = 0; i < 1400; i++) { // wind-blown snow drifts
    const x = R() * 2250, y = R() * 720; if (biome(x, y).snow < 0.8) continue;
    const l = 20 + R() * 50; g.strokeStyle = R() < 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(140,160,200,0.22)'; g.lineWidth = 1.2 + R() * 1.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l * 0.5, y - 3 - R() * 3, x + l, y + 1); g.stroke();
  }
  // snowfields: soft blue shadows in hollows
  for (let i = 0; i < 160; i++) { const x = R() * 2200, y = R() * 650; if (biome(x, y).snow < 0.8) continue; const r = 40 + R() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(120,150,200,0.12)'); gr.addColorStop(1, 'rgba(120,150,200,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
}
// Ash lands surface: cracked crust, cinder dunes, scorch, faint ember seams
function paintAshGround(g, R) {
  g.save();
  const clipP = new Path2D(); clipP.moveTo(W + 10, -10); WALL.forEach(([x, y]) => clipP.lineTo(x + 14, y)); clipP.lineTo(W + 10, H + 10); clipP.closePath(); g.clip(clipP);
  for (let i = 0; i < 260; i++) { // cinder dunes (wind streaks)
    const x = 2200 + R() * 1000, y = R() * H, l = 40 + R() * 90;
    g.strokeStyle = `rgba(150,140,130,${0.06 + R() * 0.08})`; g.lineWidth = 3 + R() * 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l * 0.5, y - 6, x + l, y + 2); g.stroke();
  }
  for (let i = 0; i < 520; i++) { // cracked crust
    let x = 2200 + R() * 1000, y = R() * H;
    const dc = Math.hypot(x - CRATER.x, y - CRATER.y), hot = clamp(1 - dc / 650);
    g.strokeStyle = `rgba(20,14,12,${0.35 + R() * 0.25})`; g.lineWidth = 1 + R() * 1.4;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (R() - 0.5) * 34; y += (R() - 0.5) * 26; g.lineTo(x, y); }
    g.stroke();
    if (R() < 0.18 + hot * 0.6) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,${90 + R() * 60},30,${0.25 + hot * 0.35})`; g.lineWidth = 1.2; g.stroke(); g.restore(); }
  }
  for (let i = 0; i < 70; i++) { const x = 2250 + R() * 950, y = R() * H, r = 30 + R() * 70; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(20,12,10,0.22)'); gr.addColorStop(1, 'rgba(20,12,10,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  // cracked plates: a jittered lattice of seams (denser and hotter toward the crater)
  const cs = 46, pts = [];
  for (let j = -1; j < H / cs + 2; j++) { const row = []; for (let i = -1; i < 1100 / cs + 2; i++) row.push([2180 + i * cs + (R() - 0.5) * cs * 0.8, j * cs + (R() - 0.5) * cs * 0.8]); pts.push(row); }
  g.lineCap = 'round';
  for (let j = 0; j < pts.length - 1; j++) for (let i = 0; i < pts[j].length - 1; i++) {
    const a = pts[j][i]; if (N2.fbm(a[0] / 260, a[1] / 260, 2) < 0.47) continue;
    const hot = clamp(1 - Math.hypot(a[0] - CRATER.x, a[1] - CRATER.y) / 600);
    for (const b of [pts[j][i + 1], pts[j + 1][i]]) {
      const mx = (a[0] + b[0]) / 2 + (R() - 0.5) * 10, my = (a[1] + b[1]) / 2 + (R() - 0.5) * 10;
      g.strokeStyle = 'rgba(14,9,8,0.5)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(...a); g.quadraticCurveTo(mx, my, ...b); g.stroke();
      g.strokeStyle = 'rgba(120,100,90,0.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(a[0] + 1.2, a[1] + 1.4); g.quadraticCurveTo(mx + 1.2, my + 1.4, b[0] + 1.2, b[1] + 1.4); g.stroke();
      if (R() < hot * 0.7) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,${80 + R() * 70},20,${0.3 + hot * 0.4})`; g.lineWidth = 1.3; g.beginPath(); g.moveTo(...a); g.quadraticCurveTo(mx, my, ...b); g.stroke(); g.restore(); }
    }
  }
  g.restore();
}

// ---------------- farmland ----------------
const FARMS = [[340, 1420, 210], [720, 1260, 190], [1010, 1210, 170], [1180, 1420, 120], [880, 1050, 150], [420, 1180, 150], [1330, 880, 120], [600, 960, 150]];
function paintFields(g, occFn, R) {
  const crops = [['#d8b456', 'wheat'], ['#c9a640', 'wheat'], ['#7ab040', 'rows'], ['#8a6a3e', 'plow'], ['#94b85a', 'pasture'], ['#a89a5a', 'fallow'], ['#6aa040', 'rows'], ['#b8a050', 'wheat']];
  const fields = [];
  for (const [cx, cy, rad] of FARMS) {
    const ang = (R() - 0.5) * 0.7, ca = Math.cos(ang), sa = Math.sin(ang), cw = 44 + R() * 14, ch = 32 + R() * 10;
    for (let gy = -rad; gy < rad; gy += ch) for (let gx = -rad; gx < rad; gx += cw) {
      const jx = (R() - 0.5) * 10, jy = (R() - 0.5) * 8;
      const pts = [[gx + jx, gy + jy], [gx + cw + jx * 0.5, gy + jy * 0.4], [gx + cw - 2, gy + ch - 1], [gx + 1, gy + ch + jy * 0.3]].map(([x, y]) => [cx + x * ca - y * sa, cy + x * sa + y * ca]);
      const mx = pts.reduce((a, p) => a + p[0], 0) / 4, my = pts.reduce((a, p) => a + p[1], 0) / 4;
      if (Math.hypot(mx - cx, my - cy) > rad * (0.75 + 0.35 * N.fbm(mx / 90, my / 90, 2)) || R() < 0.12) continue;
      if (pts.some(([x, y]) => occFn(x, y)) || biome(mx, my).high > 0.3 || biome(mx, my).swamp > 0.3) continue;
      fields.push({ pts, crop: crops[Math.floor(R() * crops.length)], ang });
    }
  }
  for (const f of fields) {
    const [col, kind] = f.crop;
    g.save();
    g.fillStyle = col; fillPts(g, f.pts); g.clip();
    const xs = f.pts.map(p => p[0]), ys = f.pts.map(p => p[1]);
    const x0 = Math.min(...xs) - 20, x1 = Math.max(...xs) + 20, y0 = Math.min(...ys) - 20, y1 = Math.max(...ys) + 20;
    const ca = Math.cos(f.ang), sa = Math.sin(f.ang);
    if (kind !== 'pasture') {
      g.strokeStyle = kind === 'wheat' ? 'rgba(120,80,20,0.28)' : kind === 'plow' ? 'rgba(60,36,16,0.4)' : 'rgba(30,70,20,0.35)'; g.lineWidth = kind === 'plow' ? 1.6 : 1.3;
      for (let t = -80; t < 80; t += kind === 'plow' ? 5 : 4) { g.beginPath(); g.moveTo((x0 + x1) / 2 - 80 * ca - t * sa, (y0 + y1) / 2 - 80 * sa + t * ca); g.lineTo((x0 + x1) / 2 + 80 * ca - t * sa, (y0 + y1) / 2 + 80 * sa + t * ca); g.stroke(); }
    } else { for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(60,110,40,0.35)'; g.beginPath(); g.arc(x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), 1.4, 0, TAU); g.fill(); } }
    const lg = g.createLinearGradient(x0, y0, x1, y1); lg.addColorStop(0, 'rgba(255,250,210,0.12)'); lg.addColorStop(1, 'rgba(0,0,0,0.08)'); g.fillStyle = lg; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.restore();
    g.strokeStyle = 'rgba(70,60,30,0.45)'; g.lineWidth = 1.4; g.beginPath(); f.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
  }
  for (const f of fields) for (let e = 0; e < 4; e++) { // hedgerows along some field edges
    if (R() < 0.55) continue;
    const a = f.pts[e], b = f.pts[(e + 1) % 4], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let t = 0; t < l; t += 5 + R() * 3) { const x = lerp(a[0], b[0], t / l), y = lerp(a[1], b[1], t / l), r = 2.4 + R() * 1.4; g.fillStyle = '#2e5a22'; g.beginPath(); g.arc(x, y, r + 0.8, 0, TAU); g.fill(); g.fillStyle = R() < 0.5 ? '#4a8030' : '#3e7228'; g.beginPath(); g.arc(x - 0.4, y - 0.5, r, 0, TAU); g.fill(); }
  }
  return fields;
}

// ---------------- water ----------------
function paintSea(g) {
  const lw = W / Q, lh = H / Q;
  const isW = maskData(maskCanvas(gg => fillPts(gg, SEA)));
  const dist = edt(isW, lw, lh);
  const c = mk(lw, lh), cg = c.getContext('2d'), id = cg.createImageData(lw, lh), d = id.data;
  const deep = rgb('#1d4a72'), mid = rgb('#2b6896'), shal = rgb('#4f9cc2'), surf = rgb('#86cfe0');
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const i = y * lw + x; if (!isW[i]) continue;
    const dd = dist[i] * Q + 18 * (N.fbm(x / 20, y / 20, 3) - 0.5);
    let col = dd < 14 ? mix3(surf, shal, dd / 14) : dd < 70 ? mix3(shal, mid, (dd - 14) / 56) : mix3(mid, deep, clamp((dd - 70) / 200));
    const n = N2.fbm(x / 9, y / 9, 3); col = mix3(col, [col[0] * 1.1 + 6, col[1] * 1.1 + 8, col[2] * 1.06 + 8], clamp((n - 0.5) * 2));
    d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
  }
  cg.putImageData(id, 0, 0);
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = '#d6c08a'; g.lineWidth = 24; strokePts(g, smooth(SEA.slice(1, -1), 6));
  g.strokeStyle = '#c8b07a'; g.lineWidth = 12; strokePts(g, smooth(SEA.slice(1, -1), 6));
  g.beginPath(); smooth(SEA, 6).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
  g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, W, H);
  for (const [lv, a, wdt] of [[9, 0.55, 2.2], [22, 0.32, 1.6], [40, 0.18, 1.4]]) { // ripple lines parallel to the coast
    const lc = mk(lw, lh), lg = lc.getContext('2d'), ld = lg.createImageData(lw, lh);
    for (let i = 0; i < lw * lh; i++) { if (!isW[i]) continue; const dd = dist[i] * Q; const v = 1 - Math.abs(dd - lv - 3 * (N.fbm((i % lw) / 14, (i / lw) / 14, 2) - 0.5)) / (wdt * 0.9); if (v > 0) { ld.data[i * 4] = 230; ld.data[i * 4 + 1] = 248; ld.data[i * 4 + 2] = 255; ld.data[i * 4 + 3] = clamp(v) * 255 * a; } }
    lg.putImageData(ld, 0, 0); g.drawImage(lc, 0, 0, W, H);
  }
  const R = rngf(3);
  g.strokeStyle = 'rgba(220,245,255,0.45)'; g.lineWidth = 1.6;
  for (let i = 0; i < 900; i++) { const x = R() * 600, y = R() * H; const lx = Math.floor(x / Q), ly = Math.floor(y / Q); if (lx < 0 || ly < 0 || lx >= lw || ly >= lh || !isW[ly * lw + lx] || dist[ly * lw + lx] * Q < 30) continue; g.beginPath(); g.moveTo(x - 6, y); g.quadraticCurveTo(x, y - 3, x + 6, y); g.stroke(); }
  g.restore();
  compass(g, 150, 1300 + 140, 62);
}
function compass(g, x, y, r) { // a simple map star in the sea (no letters)
  g.save(); g.globalAlpha = 0.75;
  for (const [rr, rot, col] of [[r, 0, '#e8dcb8'], [r * 0.62, PI / 4, '#c9b48a']]) {
    for (let i = 0; i < 4; i++) {
      const a = rot + i * PI / 2;
      const tip = [x + Math.cos(a) * rr, y + Math.sin(a) * rr], l = [x + Math.cos(a + 0.5) * rr * 0.2, y + Math.sin(a + 0.5) * rr * 0.2], rgt = [x + Math.cos(a - 0.5) * rr * 0.2, y + Math.sin(a - 0.5) * rr * 0.2];
      g.fillStyle = col; g.beginPath(); g.moveTo(x, y); g.lineTo(...l); g.lineTo(...tip); g.closePath(); g.fill();
      g.fillStyle = dark(col, 0.25); g.beginPath(); g.moveTo(x, y); g.lineTo(...rgt); g.lineTo(...tip); g.closePath(); g.fill();
    }
  }
  g.strokeStyle = 'rgba(232,220,184,0.8)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r * 0.42, 0, TAU); g.stroke();
  g.beginPath(); g.arc(x, y, r * 1.08, 0, TAU); g.stroke();
  g.fillStyle = '#c0392b'; g.beginPath(); g.moveTo(x, y - r * 1.32); g.lineTo(x - 7, y - r * 1.1); g.lineTo(x + 7, y - r * 1.1); g.closePath(); g.fill();
  g.restore();
}
function paintLagoon(g, R) {
  g.save(); g.lineJoin = 'round';
  g.fillStyle = '#6a6440'; g.strokeStyle = '#6a6440'; g.lineWidth = 30; fillPts(g, LAGOON); strokePts(g, LAGOON);
  g.strokeStyle = '#4e5a3a'; g.lineWidth = 14; strokePts(g, LAGOON);
  g.fillStyle = '#3e5e54'; fillPts(g, LAGOON);
  g.beginPath(); LAGOON.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
  const gr = g.createRadialGradient(1810, 1760, 30, 1810, 1760, 330); gr.addColorStop(0, '#22403c'); gr.addColorStop(1, 'rgba(46,80,70,0)');
  g.fillStyle = gr; g.fillRect(1400, 1400, 800, 500);
  // drowned streets: faint grid of sunken paving under the water
  g.strokeStyle = 'rgba(150,170,150,0.16)'; g.lineWidth = 2;
  for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(1590, 1560 + k * 34); g.lineTo(2060, 1540 + k * 34); g.stroke(); g.beginPath(); g.moveTo(1600 + k * 56, 1540); g.lineTo(1630 + k * 56, 1840); g.stroke(); }
  g.strokeStyle = 'rgba(190,220,200,0.35)'; g.lineWidth = 1.5; g.lineCap = 'round';
  for (let i = 0; i < 140; i++) { const x = 1580 + R() * 480, y = 1540 + R() * 300; g.beginPath(); g.moveTo(x - 7, y); g.quadraticCurveTo(x, y - 2.5, x + 7, y); g.stroke(); }
  g.restore();
  // the cathedral island
  g.fillStyle = '#7a7048'; g.strokeStyle = '#7a7048'; g.lineWidth = 14; fillPts(g, ISLAND); strokePts(g, ISLAND);
  g.fillStyle = '#5e6c3c'; fillPts(g, ISLAND);
}
function marshPools(g, occFn, R) { // ponds, lilies and reeds scattered through the marsh
  const pools = [];
  for (let i = 0; i < 900 && pools.length < 70; i++) {
    const x = 1300 + R() * 880, y = 1120 + R() * 700, b = biome(x, y);
    if (b.swamp < 0.7 || occFn(x, y) || pointInPoly(x, y, LAGOON)) continue;
    const r = 14 + R() * 34;
    if (pools.some(p => Math.hypot(p.x - x, p.y - y) < p.r + r + 20)) continue;
    if ([...Array(8)].some((_, k) => occFn(x + Math.cos(k * PI / 4) * r * 1.3, y + Math.sin(k * PI / 4) * r * 0.8))) continue;
    const pts = []; for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, rr = r * (0.7 + R() * 0.45); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.62]); }
    pools.push({ x, y, r, pts: smooth(pts.concat([pts[0]]), 4) });
  }
  for (const p of pools) {
    g.fillStyle = '#4a4a2e'; g.strokeStyle = '#4a4a2e'; g.lineWidth = 8; g.lineJoin = 'round'; fillPts(g, p.pts); strokePts(g, p.pts);
    g.fillStyle = '#3a5a4e'; fillPts(g, p.pts);
    g.save(); g.beginPath(); p.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
    g.fillStyle = 'rgba(30,50,44,0.5)'; g.beginPath(); g.ellipse(p.x + 3, p.y + 2, p.r * 0.6, p.r * 0.35, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(200,230,210,0.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(p.x - p.r * 0.4, p.y - p.r * 0.2); g.lineTo(p.x - p.r * 0.1, p.y - p.r * 0.2); g.stroke();
    g.restore();
    for (let k = 0; k < 3; k++) if (R() < 0.6) D.lily(g, p.x + (R() - 0.5) * p.r, p.y + (R() - 0.5) * p.r * 0.4, 0.45, R);
  }
  return pools;
}
const FROZEN = [[[620, 250], 70, 34], [[1560, 420], 60, 26], [[420, 470], 44, 22]];
function frozenLakes(g, R) {
  for (const [[x, y], rx, ry] of FROZEN) {
    const pts = []; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, r = 0.8 + R() * 0.3; pts.push([x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r]); }
    const sp = smooth(pts.concat([pts[0]]), 4);
    g.fillStyle = '#9fb8cc'; g.strokeStyle = '#9fb8cc'; g.lineWidth = 8; g.lineJoin = 'round'; fillPts(g, sp); strokePts(g, sp);
    g.fillStyle = '#c4def0'; fillPts(g, sp);
    g.save(); g.beginPath(); sp.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); g.clip();
    const gr = g.createLinearGradient(x - rx, y - ry, x + rx, y + ry); gr.addColorStop(0, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(120,160,200,0.3)'); g.fillStyle = gr; g.fillRect(x - rx, y - ry, rx * 2, ry * 2);
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.2; for (let i = 0; i < 6; i++) { const px = x + (R() - 0.5) * rx, py = y + (R() - 0.5) * ry; g.beginPath(); g.moveTo(px, py); g.lineTo(px + (R() - 0.5) * 30, py + (R() - 0.5) * 12); g.stroke(); }
    g.restore();
  }
}
function paintRiver(g, r, R) {
  const pts = smooth(r.pts, 10), w0 = r.src || r.w * 0.5;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  const pass = (wAdd, colF) => { for (let i = 1; i < pts.length; i++) { const t = i / pts.length; g.strokeStyle = colF(...pts[i]); g.lineWidth = lerp(w0, r.w, t) + wAdd; g.beginPath(); g.moveTo(...pts[i - 1]); g.lineTo(...pts[i]); g.stroke(); } };
  const icy = (x, y) => biome(x, y).snow > 0.5;
  pass(14, (x, y) => (icy(x, y) ? '#c8d4dc' : '#b8a070'));
  pass(6, (x, y) => (icy(x, y) ? '#9aaab8' : '#8a7a50'));
  pass(0, (x, y) => (icy(x, y) ? '#8ab8d8' : biome(x, y).swamp > 0.5 ? '#3e6a60' : '#4a8ab8'));
  pass(-r.w * 0.45, (x, y) => (icy(x, y) ? '#7aa8cc' : biome(x, y).swamp > 0.5 ? '#2e5a50' : '#3a72a0'));
  g.restore();
  g.strokeStyle = 'rgba(210,240,255,0.6)'; g.lineWidth = 1.4;
  for (let i = 2; i < pts.length - 1; i += 2) { if (R() < 0.5) continue; const [x, y] = pts[i], [x2, y2] = pts[i + 1]; const ang = Math.atan2(y2 - y, x2 - x), off = (R() - 0.5) * r.w * 0.4; g.beginPath(); g.moveTo(x - Math.cos(ang) * 5 - Math.sin(ang) * off, y - Math.sin(ang) * 5 + Math.cos(ang) * off); g.lineTo(x + Math.cos(ang) * 5 - Math.sin(ang) * off, y + Math.sin(ang) * 5 + Math.cos(ang) * off); g.stroke(); }
  return pts;
}
function paintLava(g, r, R) {
  const base = smooth(r.pts, 12), n = base.length;
  // meander the bed and vary its width along the flow
  const nrm = base.map((p, i) => { const a = base[Math.max(0, i - 1)], b = base[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
  const pts = base.map(([x, y], i) => { const o = (N2.fbm(i / 9, r.w * 1.7, 3) - 0.5) * 2 * r.w * 1.1; return [x + nrm[i][0] * o, y + nrm[i][1] * o]; });
  const wid = pts.map(([x, y], i) => r.w * (0.55 + 0.9 * N.fbm(x / 70, y / 70, 2)) * (0.6 + 0.4 * Math.min(1, i / (n * 0.3))));
  const seg = (wMul, wAdd, col) => { g.strokeStyle = col; for (let i = 1; i < n; i++) { g.lineWidth = Math.max(0.5, wid[i] * wMul + wAdd); g.beginPath(); g.moveTo(...pts[i - 1]); g.lineTo(...pts[i]); g.stroke(); } };
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.globalCompositeOperation = 'lighter';
  seg(1, 44, 'rgba(255,70,16,0.05)'); seg(1, 24, 'rgba(255,80,20,0.08)'); seg(1, 10, 'rgba(255,100,30,0.1)');
  g.globalCompositeOperation = 'source-over';
  seg(1, 8, '#120c0b'); seg(1, 5, '#2a1d19');      // basalt banks
  seg(1, 0, '#7a1a06'); seg(0.8, 0, '#c8380c'); seg(0.56, 0, '#f2661a'); seg(0.32, 0, '#ffa232'); seg(0.12, 0, '#ffe39a');
  // flow streaks and crust plates
  for (let i = 1; i < n - 1; i++) {
    const [x, y] = pts[i], [x2, y2] = pts[i + 1], dx = x2 - x, dy = y2 - y, l = Math.hypot(dx, dy) || 1;
    if (R() < 0.5) { const off = (R() - 0.5) * wid[i] * 0.6; g.strokeStyle = R() < 0.5 ? 'rgba(255,248,210,0.55)' : 'rgba(255,170,70,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - dy / l * off, y + dx / l * off); g.lineTo(x - dy / l * off + dx / l * 9, y + dx / l * off + dy / l * 9); g.stroke(); }
    if (R() < 0.3) { const off = (R() < 0.5 ? -1 : 1) * wid[i] * (0.32 + R() * 0.12); g.fillStyle = '#3a1a10'; g.beginPath(); g.ellipse(x - dy / l * off, y + dx / l * off, 2 + R() * 3, 1.3 + R() * 1.6, Math.atan2(dy, dx), 0, TAU); g.fill(); }
  }
  // broken basalt along the banks
  for (let i = 0; i < n; i += 2) for (const sd of [-1, 1]) {
    if (R() < 0.55) continue;
    const off = sd * (wid[i] / 2 + 5 + R() * 4), x = pts[i][0] + nrm[i][0] * off, y = pts[i][1] + nrm[i][1] * off, rr = 2 + R() * 4;
    toon(g, poly([...Array(6)].map((_, k) => [x + Math.cos(k / 6 * TAU) * rr * (0.7 + R() * 0.5), y + Math.sin(k / 6 * TAU) * rr * 0.7 * (0.7 + R() * 0.5)])), R() < 0.5 ? '#3a302d' : '#241d1b', { sd: 1, hd: 0.8, lw: 1, light: '#6a5850' });
  }
  g.restore();
  return pts;
}
function paintCrater(g, R) {
  const { x, y, r } = CRATER;
  // scorched halo, rim wall (cel shaded), lava lake, the Cinder Heart
  const halo = g.createRadialGradient(x, y, r * 0.8, x, y, r * 2.6); halo.addColorStop(0, 'rgba(40,16,10,0.55)'); halo.addColorStop(1, 'rgba(40,16,10,0)');
  g.fillStyle = halo; g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  const slope = []; for (let k = 0; k < 28; k++) { const a = k / 28 * TAU, rr = r * (1.62 + (R() - 0.5) * 0.16); slope.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.78 + 10]); }
  toon(g, blob(slope, 0.5), '#3e322e', { sd: 14, hd: 8, lw: 2.2, light: '#5e4c44', shade: '#261c1a' });
  for (let k = 0; k < 40; k++) { // gullies running down the cone
    const a = k / 40 * TAU + (R() - 0.5) * 0.08, r0 = r * 1.14, r1 = r * (1.45 + R() * 0.15);
    const lit = Math.cos(a + 2.2) > 0;
    g.strokeStyle = lit ? 'rgba(130,104,92,0.5)' : 'rgba(16,10,8,0.5)'; g.lineWidth = 1.6 + R();
    g.beginPath(); g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.78); g.quadraticCurveTo(x + Math.cos(a + 0.05) * (r0 + r1) / 2, y + Math.sin(a + 0.05) * (r0 + r1) / 2 * 0.78 + 4, x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.78 + 9); g.stroke();
  }
  const rim = []; for (let k = 0; k < 24; k++) { const a = k / 24 * TAU, rr = r * (1.12 + (R() - 0.5) * 0.12); rim.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.78]); }
  const inner = rim.map(([px, py]) => [x + (px - x) * 0.78, y + (py - y) * 0.78 + 6]);
  toon(g, poly(rim), '#4a3a36', { sd: 10, hd: 5, lw: 2.4, light: '#7a5a4a', shade: '#2a1e1e' });
  for (let k = 0; k < 30; k++) { const a = k / 30 * TAU + R() * 0.1, rr = r * (1.16 + R() * 0.08); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.78; toon(g, poly([...Array(6)].map((_, j) => [px + Math.cos(j / 6 * TAU) * (5 + R() * 6), py + Math.sin(j / 6 * TAU) * (4 + R() * 4)])), R() < 0.5 ? '#4a3a36' : '#3a2c2a', { sd: 1.4, hd: 1, lw: 1.2, light: '#7a5e52' }); }
  // inner wall, lit from below by the molten lake
  toon(g, poly(inner), '#2a1a18', { sd: 0, hd: 0, lw: 2 });
  g.save(); g.clip(poly(inner)); const iw = g.createLinearGradient(0, y - r * 0.8, 0, y + r * 0.6); iw.addColorStop(0, 'rgba(255,110,40,0.55)'); iw.addColorStop(0.5, 'rgba(120,40,20,0.2)'); iw.addColorStop(1, 'rgba(20,10,8,0)'); g.fillStyle = iw; g.fillRect(x - r * 1.2, y - r, r * 2.4, r * 2); g.restore();
  const lake = inner.map(([px, py]) => [x + (px - x) * 0.82, y + (py - y) * 0.82 + 8]);
  g.save(); g.beginPath(); lake.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); g.clip();
  const lg = g.createRadialGradient(x, y + 8, 4, x, y + 8, r * 0.85); lg.addColorStop(0, '#fff6c0'); lg.addColorStop(0.25, '#ffd060'); lg.addColorStop(0.6, '#ff7a20'); lg.addColorStop(1, '#a8300e');
  g.fillStyle = lg; g.fillRect(x - r, y - r, r * 2, r * 2);
  g.strokeStyle = 'rgba(80,20,10,0.55)'; g.lineWidth = 2.2;
  for (let i = 0; i < 26; i++) { const a = R() * TAU, d = r * (0.3 + R() * 0.5); const px = x + Math.cos(a) * d, py = y + 8 + Math.sin(a) * d * 0.78; g.beginPath(); g.moveTo(px, py); g.lineTo(px + (R() - 0.5) * 30, py + (R() - 0.5) * 20); g.lineTo(px + (R() - 0.5) * 30, py + (R() - 0.5) * 20); g.stroke(); }
  g.restore();
  // the Heart: a burning star caught in the lake
  g.save(); g.globalCompositeOperation = 'lighter';
  glowAt(g, x, y + 4, r * 2.2, [255, 120, 40], 0.5);
  glowAt(g, x, y + 4, r * 0.9, [255, 210, 120], 0.8);
  g.restore();
  flat(g, star(x, y + 4, 26, 0.42, 8, -PI / 2), '#fffbe0', 2, '#ff9a30');
  flat(g, star(x, y + 4, 14, 0.45, 8, -PI / 2 + PI / 8), '#ffffff', 0);
}

// ---------------- roads ----------------
function segX(a, b, c, d) { // intersection point of segments ab and cd (or null)
  const r = [b[0] - a[0], b[1] - a[1]], q = [d[0] - c[0], d[1] - c[1]], den = r[0] * q[1] - r[1] * q[0];
  if (Math.abs(den) < 1e-6) return null;
  const t = ((c[0] - a[0]) * q[1] - (c[1] - a[1]) * q[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + r[0] * t, a[1] + r[1] * t, Math.atan2(r[1], r[0])] : null;
}
function crossings(roads, rivers) {
  const out = [];
  for (const rd of roads) for (let i = 1; i < rd.length; i++) for (const rv of rivers) for (let j = 1; j < rv.length; j++) {
    const p = segX(rd[i - 1], rd[i], rv[j - 1], rv[j]);
    if (p && !out.some(o => Math.hypot(o[0] - p[0], o[1] - p[1]) < 30)) out.push(p);
  }
  return out;
}
function plankBridge(g, x, y, ang, len, stone) {
  g.save(); g.translate(x, y); g.rotate(ang);
  D.shadowBlob(g, 2, 8, len * 0.55, 6, 0.3);
  if (stone) toon(g, rrect(-len / 2, -7, len, 14, 3), '#aaa496', { sd: 1.6, hd: 0.8, lw: 1.6, detail: c => { c.strokeStyle = 'rgba(40,30,20,0.35)'; c.lineWidth = 1; for (let k = -len / 2 + 5; k < len / 2; k += 7) { c.beginPath(); c.moveTo(k, -7); c.lineTo(k, 7); c.stroke(); } } });
  else {
    toon(g, rrect(-len / 2, -7, len, 14, 2), '#9a6a3a', { sd: 1.4, hd: 0.7, lw: 1.5, detail: c => { c.strokeStyle = 'rgba(50,25,10,0.5)'; c.lineWidth = 1; for (let k = -len / 2 + 4; k < len / 2; k += 4) { c.beginPath(); c.moveTo(k, -7); c.lineTo(k, 7); c.stroke(); } } });
    for (const sy of [-1, 1]) line(g, [[-len / 2, sy * 7], [len / 2, sy * 7]], '#6b4423', 2);
  }
  g.restore();
}
function roadColor(x, y) { const b = biome(x, y); return b.ash > 0.5 ? ['#a08e78', '#3a302a'] : b.snow > 0.5 ? ['#bcae94', '#6e6458'] : b.swamp > 0.5 ? ['#a08e64', '#4e4230'] : ['#d4b07a', '#7a5a34']; }
const EXTRA_ROADS = [ // roads that are not part of the travel route, for a lived-in realm
  [[330, 1560], [250, 1450], [210, 1330]], [[1010, 1320], [900, 1180], [880, 1050], [760, 960]], [[560, 1400], [430, 1230], [380, 1080]],
  [[1190, 1140], [1150, 1350], [1180, 1420]], [[1730, 960], [1700, 1100], [1760, 1230]], [[380, 1080], [450, 960], [512, 884]],
];
function paintRoads(g, legs) {
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  for (const pts of legs) for (let k = 3; k >= 1; k--) { g.strokeStyle = 'rgba(80,60,30,0.08)'; g.lineWidth = 12 + k * 6; strokePts(g, pts); }
  for (const pts of legs) for (let i = 1; i < pts.length; i++) { g.strokeStyle = alpha(roadColor(...pts[i])[1], 0.6); g.lineWidth = 13; g.beginPath(); g.moveTo(...pts[i - 1]); g.lineTo(...pts[i]); g.stroke(); }
  for (const pts of legs) for (let i = 1; i < pts.length; i++) { g.strokeStyle = roadColor(...pts[i])[0]; g.lineWidth = 9; g.beginPath(); g.moveTo(...pts[i - 1]); g.lineTo(...pts[i]); g.stroke(); }
  const R = rngf(41);
  for (const pts of legs) for (let i = 1; i < pts.length; i++) { if (R() < 0.5) continue; const [x, y] = pts[i]; g.fillStyle = 'rgba(90,70,40,0.32)'; g.beginPath(); g.ellipse(x + (R() - 0.5) * 5, y + (R() - 0.5) * 5, 1.5 + R() * 2, 1 + R(), 0, 0, TAU); g.fill(); }
  g.restore();
}

// ---------------- mountains, hills, volcanoes ----------------
const MK = {
  snow: { lit: '#a8a29c', shade: '#6e6a7c', snowLit: '#f6f9fc', snowShade: '#b4c4dc', snow: 0.58 },
  peak: { lit: '#aca6a0', shade: '#706c80', snowLit: '#ffffff', snowShade: '#b8c8e0', snow: 0.66 },
  rock: { lit: '#a49c8c', shade: '#6c6670', snowLit: '#f4f8fc', snowShade: '#b8c4d8', snow: 0.22 },
  volc: { lit: '#5a4a46', shade: '#2e2428', snow: 0, volcano: true, foot: 'rgba(30,10,8,0.3)' },
  basalt: { lit: '#544a46', shade: '#2c2426', snow: 0, jag: 0.05, foot: 'rgba(30,10,8,0.3)' },
  wyrm: { lit: '#9aa4b4', shade: '#5e6680', snowLit: '#f2f8ff', snowShade: '#a6bce0', snow: 0.62, jag: 0.035 },
  crag: { lit: '#8e8478', shade: '#5c5660', snowLit: '#f4f8fc', snowShade: '#b8c4d8', snow: 0.12, jag: 0.04 },
};
function mountain(g, it) {
  const { x, y, w, h } = it, k = MK[it.kind], R = rngf(it.seed);
  const sx = x + (R() - 0.5) * w * 0.3, sy = y - h;
  const pw = 1.1 + R() * 0.45, jag = (k.jag || 0.02) * (0.7 + R() * 0.6);
  const prof = t => Math.pow(t, pw);
  const n = Math.max(5, Math.round(w / 22)), L = [], Rt = [];
  // optional shoulder on one slope (a lesser summit)
  const sh = R() < 0.55 ? { side: R() < 0.5 ? -1 : 1, t: 0.55 + R() * 0.2, d: 0.08 + R() * 0.08 } : null;
  const bump = (t, side) => (sh && sh.side === side ? Math.max(0, 1 - Math.abs(t - sh.t) / 0.18) * sh.d * h : 0);
  for (let i = 0; i <= n; i++) { const t = i / n, j = i > 0 && i < n ? (i % 2 ? 1 : -1) * w * jag * (0.5 + R()) : 0; L.push([lerp(x - w / 2, sx, t) + j * 0.4, y - h * prof(t) - j - bump(t, -1)]); }
  for (let i = 0; i <= n; i++) { const t = 1 - i / n, j = i > 0 && i < n ? (i % 2 ? 1 : -1) * w * jag * (0.5 + R()) : 0; Rt.push([lerp(x + w / 2, sx, t) - j * 0.4, y - h * prof(t) - j - bump(t, 1)]); }
  let top = [sx, sy];
  if (k.volcano) { // truncated cone with a crater
    const cut = 0.8, cw = w * 0.13;
    L.length = 0; Rt.length = 0;
    for (let i = 0; i <= n; i++) { const t = i / n * cut, j = i > 0 && i < n ? (i % 2 ? 1 : -1) * w * 0.015 : 0; L.push([lerp(x - w / 2, sx - cw, t / cut), y - h * prof(t) - j]); }
    for (let i = 0; i <= n; i++) { const t = (1 - i / n) * cut, j = i > 0 && i < n ? (i % 2 ? 1 : -1) * w * 0.015 : 0; Rt.push([lerp(x + w / 2, sx + cw, t / cut), y - h * prof(t) - j]); }
    top = [sx, y - h * prof(cut)];
  }
  const sil = [...L, ...Rt.slice(1)];
  const rb = [x + w * (0.02 + R() * 0.14), y + 2];
  const ridge = []; for (let i = 0; i <= 6; i++) { const t = i / 6; ridge.push([lerp(top[0], rb[0], t) + (i > 0 && i < 6 ? (R() - 0.5) * w * 0.08 : 0), lerp(top[1], rb[1], Math.pow(t, 0.7))]); }
  D.shadowBlob(g, x + w * 0.2, y + 2, w * 0.6, Math.max(8, h * 0.12), 0.32);
  const silP = poly(sil), litP = poly([...L, ...ridge.slice(1)]);
  g.fillStyle = k.shade; g.fill(silP);
  g.fillStyle = k.lit; g.fill(litP);
  g.save(); g.clip(silP);
  // light falloff: the lit face brightens toward the top-left, the shadow face darkens toward its outer edge
  const lg = g.createLinearGradient(x - w / 2, sy, x + w / 2, y); lg.addColorStop(0, 'rgba(255,255,240,0.14)'); lg.addColorStop(0.5, 'rgba(255,255,240,0)'); lg.addColorStop(1, 'rgba(20,10,40,0.16)');
  g.fillStyle = lg; g.fillRect(x - w, sy - 10, w * 2, h + 20);
  for (let i = 1; i < ridge.length - 1; i++) { // gullies on both faces
    const [px, py] = ridge[i], l = h * (0.2 + R() * 0.28);
    g.strokeStyle = alpha(dark(k.lit, 0.16), 0.75); g.lineWidth = 1.5; g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px - l * 0.35, py + l * 0.4, px - l * 0.55, py + l); g.stroke();
    if (R() < 0.7) { g.strokeStyle = alpha(light(k.shade, 0.1), 0.6); g.lineWidth = 1.2; g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + l * 0.3, py + l * 0.4, px + l * 0.45, py + l); g.stroke(); }
  }
  if (k.snow > 0) { // jagged snow cap with drips down the gullies
    const sf = clamp(k.snow + (R() - 0.5) * 0.16), ys = y - h * (1 - sf), sp = [], m = 10;
    for (let i = 0; i <= m; i++) { const t = i / m, px = x - w * 0.6 + w * 1.2 * t; sp.push([px, ys + (i % 2 ? h * 0.09 : -h * 0.02) + (R() - 0.5) * h * 0.06 + (Math.abs(px - sx) / w) * h * 0.3]); }
    const snowP = poly([[x - w, sy - 60], ...sp, [x + w, sy - 60]]);
    g.fillStyle = k.snowShade; g.fill(snowP);
    g.save(); g.clip(litP); g.fillStyle = k.snowLit; g.fill(snowP); g.restore();
    g.strokeStyle = alpha('#7a8aa8', 0.55); g.lineWidth = 1.2; g.beginPath(); ridge.slice(0, 3).forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
  }
  const fg = g.createLinearGradient(0, y - h * 0.22, 0, y + 2); fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, k.foot || 'rgba(40,50,60,0.28)');
  g.fillStyle = fg; g.fillRect(x - w, y - h * 0.22, w * 2, h * 0.24);
  g.restore();
  g.lineJoin = 'round'; g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke(silP);
  g.strokeStyle = alpha(OUT, 0.5); g.lineWidth = 1.3; g.beginPath(); ridge.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
  if (k.volcano) {
    const cw = w * 0.13, cy = top[1];
    toon(g, ellipse(top[0], cy + 1, cw, cw * 0.38), '#2a1a18', { sd: 0, hd: 0, lw: 1.8 });
    flat(g, ellipse(top[0], cy + 2, cw * 0.72, cw * 0.24), '#ff8a2a', 0);
    flat(g, ellipse(top[0], cy + 2, cw * 0.36, cw * 0.12), '#ffe08a', 0);
    g.save(); g.globalCompositeOperation = 'lighter'; glowAt(g, top[0], cy, w * 0.5, [255, 110, 30], 0.45); g.restore();
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const sx2 = top[0] + (i - 1) * cw * 0.5, l = h * (0.25 + R() * 0.35); const ex = sx2 + (R() - 0.5) * 24, mx = sx2 + (R() - 0.5) * 16; g.beginPath(); g.moveTo(sx2, cy + 3); g.quadraticCurveTo(mx, cy + l * 0.5, ex, cy + l); g.strokeStyle = '#3a1410'; g.lineWidth = 4.4 - i * 0.6; g.stroke(); g.strokeStyle = '#ff6a1a'; g.lineWidth = 2.4 - i * 0.4; g.stroke(); }
    it.smoke = [top[0], cy];
  }
}
function spires(g, it) { // jagged basalt crags: a cluster of narrow cel-shaded spikes
  const { x, y, w, h } = it, R = rngf(it.seed), n = 3 + Math.floor(R() * 3), sp = [];
  for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1), mid = 1 - Math.abs(t - 0.5) * 1.2; sp.push({ x: x + (t - 0.5) * w * 0.8 + (R() - 0.5) * w * 0.1, w: w * (0.2 + R() * 0.14), h: h * (0.45 + mid * 0.55) * (0.8 + R() * 0.3), y: y + (R() - 0.5) * 8 }); }
  sp.sort((a, b) => a.h - b.h || a.y - b.y);
  D.shadowBlob(g, x + w * 0.2, y + 2, w * 0.6, Math.max(8, h * 0.1), 0.35);
  for (const s of sp) {
    const lean = (R() - 0.5) * s.w * 0.5, tip = [s.x + lean, s.y - s.h];
    const L = [[s.x - s.w / 2, s.y], [s.x - s.w * 0.3 + lean * 0.4, s.y - s.h * 0.45], [s.x - s.w * 0.12 + lean * 0.8, s.y - s.h * 0.8], tip];
    const Rr = [tip, [s.x + s.w * 0.16 + lean * 0.8, s.y - s.h * 0.75], [s.x + s.w * 0.32 + lean * 0.4, s.y - s.h * 0.4], [s.x + s.w / 2, s.y]];
    const mid = [s.x + s.w * 0.06, s.y];
    const sil = poly([...L, ...Rr.slice(1)]);
    g.fillStyle = '#2a2224'; g.fill(sil);
    g.fillStyle = '#564a46'; g.fill(poly([...L, mid]));
    g.save(); g.clip(sil); const lg = g.createLinearGradient(0, s.y - s.h, 0, s.y); lg.addColorStop(0, 'rgba(255,230,210,0.12)'); lg.addColorStop(1, 'rgba(255,80,30,0.16)'); g.fillStyle = lg; g.fillRect(s.x - s.w, s.y - s.h, s.w * 2, s.h); g.restore();
    g.lineJoin = 'round'; g.strokeStyle = OUT; g.lineWidth = 1.8; g.stroke(sil);
    g.strokeStyle = alpha(OUT, 0.5); g.lineWidth = 1.1; g.beginPath(); g.moveTo(...tip); g.lineTo(...mid); g.stroke();
  }
}
function hill(g, it) { // soft painted rise (terrain relief, no outline)
  const { x, y, w, h } = it, R = rngf(it.seed);
  const pts = []; const n = 14;
  for (let i = 0; i <= n; i++) { const t = i / n, a = PI + t * PI; pts.push([x + Math.cos(a) * w / 2, y + Math.sin(a) * h * (0.85 + R() * 0.25)]); }
  const p = poly(pts), base = rgb(it.col || '#79a24a');
  D.shadowBlob(g, x + w * 0.2, y, w * 0.6, h * 0.35, 0.18);
  const gr = g.createLinearGradient(x - w * 0.4, y - h, x + w * 0.35, y);
  gr.addColorStop(0, css(mix3(base, [255, 250, 210], 0.18), 0.9)); gr.addColorStop(0.55, css(base, 0.85)); gr.addColorStop(1, css(mix3(base, [20, 30, 40], 0.35), 0.85));
  g.fillStyle = gr; g.fill(p);
  g.strokeStyle = css(mix3(base, [20, 30, 20], 0.5), 0.35); g.lineWidth = 1.4; g.beginPath(); pts.slice(Math.floor(n * 0.45)).forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
}

// ---------------- the Rampart ----------------
const WSTONE = '#aaa59a', WH = 18, WW = 30;
function wallPieces(items) {
  const pts = []; // resample the wall line every ~16px
  let acc = 0; pts.push(WALL[0]);
  for (let i = 1; i < WALL.length; i++) { const [x0, y0] = WALL[i - 1], [x1, y1] = WALL[i]; const l = Math.hypot(x1 - x0, y1 - y0); let t = (16 - acc) / l; while (t <= 1) { pts.push([lerp(x0, x1, t), lerp(y0, y1, t)]); t += 16 / l; } acc = (acc + l) % 16; }
  const inGate = ([x, y]) => (y > GATES.east[1] - 34 && y < GATES.east[1] + 34) || (y > GATES.south[1] - 30 && y < GATES.south[1] + 30);
  for (let i = 1; i < pts.length; i++) if (!inGate(pts[i - 1]) && !inGate(pts[i])) items.push({ y: Math.max(pts[i - 1][1], pts[i][1]), kind: 'wallseg', a: pts[i - 1], b: pts[i], i });
  // towers along the wall (skip near the gates)
  let s = 0; const towers = [];
  for (let i = 1; i < pts.length; i++) {
    s += 16; if (s < 118) continue;
    const [x, y] = pts[i]; if (y < -10 || y > H + 20) continue;
    if (Math.hypot(x - GATES.east[0], y - GATES.east[1]) < 110 || Math.hypot(x - GATES.south[0], y - GATES.south[1]) < 100) continue;
    towers.push([x, y]); s = 0;
  }
  towers.forEach(([x, y], i) => items.push({ y: y + 6, kind: 'walltower', x, y, lit: i % 2 === 0 }));
  for (const [k, [gx, gy]] of Object.entries(GATES)) items.push({ y: gy + 16, kind: 'gate', x: gx, gy, s: k === 'east' ? 1 : 0.86 });
}
function wallSeg(g, it) {
  const [ax, ay] = it.a, [bx, by] = it.b;
  const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; // n points west for a southward wall
  const hw = WW / 2, ex = dx / l * 1.2, ey = dy / l * 1.2; // overlap neighbours slightly
  const P = (sd, k, up) => [ax + nx * hw * sd + (k ? dx + ex : -ex), ay + ny * hw * sd + (k ? dy + ey : -ey) - (up ? WH : 0)];
  // cast shadow to the south-east over the Ash side
  g.fillStyle = 'rgba(8,6,4,0.3)'; fillPts(g, [P(-1, 0, 0), P(-1, 1, 0), [P(-1, 1, 0)[0] + 20, P(-1, 1, 0)[1] + 12], [P(-1, 0, 0)[0] + 20, P(-1, 0, 0)[1] + 12]]);
  // the faces that turn towards the viewer at bends
  g.fillStyle = '#6a6560'; fillPts(g, [P(-1, 0, 0), P(-1, 1, 0), P(-1, 1, 1), P(-1, 0, 1)]);
  g.fillStyle = '#8e897f'; fillPts(g, [P(1, 0, 0), P(1, 1, 0), P(1, 1, 1), P(1, 0, 1)]);
  // walkway: lit western half, shaded eastern parapet
  g.fillStyle = WSTONE; fillPts(g, [P(1, 0, 1), P(1, 1, 1), P(-1, 1, 1), P(-1, 0, 1)]);
  g.fillStyle = '#c4bfb2'; fillPts(g, [P(1, 0, 1), P(1, 1, 1), P(0.55, 1, 1), P(0.55, 0, 1)]);
  g.fillStyle = '#8a857b'; fillPts(g, [P(-0.55, 0, 1), P(-0.55, 1, 1), P(-1, 1, 1), P(-1, 0, 1)]);
  g.strokeStyle = 'rgba(60,50,40,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(...P(0, 0, 1)); g.lineTo(...P(0, 1, 1)); g.stroke();
  // merlons on both parapets
  for (const sd of [0.8, -0.8]) {
    const [cx, cy] = [(ax + bx) / 2 + nx * hw * sd, (ay + by) / 2 + ny * hw * sd - WH];
    toon(g, rrect(cx - 3.6, cy - 6, 7.2, 7.2, 1.2), sd > 0 ? '#bdb8ab' : '#8e897f', { sd: 1, hd: 0.6, lw: 1.2 });
  }
  g.strokeStyle = OUT; g.lineWidth = 2; g.lineCap = 'round';
  g.beginPath(); g.moveTo(...P(1, 0, 1)); g.lineTo(...P(1, 1, 1)); g.moveTo(...P(-1, 0, 1)); g.lineTo(...P(-1, 1, 1)); g.stroke();
}
function wallTower(g, it) {
  const { x, y } = it;
  D.shadowBlob(g, x + 16, y + 6, 34, 11, 0.35);
  const yt = cylinder(g, x, y, 22, 9, 44, WSTONE, { rowH: 8, cols: 8, seed: Math.floor(x + y), topColor: dark(WSTONE, 0.06), lw: 1.8 });
  merlons(g, x, yt, 22, 9, 'back', WSTONE, { n: 10, h: 7, w: 7 });
  merlons(g, x, yt, 22, 9, 'front', WSTONE, { n: 10, h: 7, w: 7 });
  if (it.lit) {
    toon(g, ellipse(x, yt - 1, 8, 3.4), '#3a2a1e', { sd: 0, hd: 0, lw: 1.2 });
    flat(g, blob([[x - 7, yt - 2], [x - 4, yt - 16], [x, yt - 26], [x + 4, yt - 15], [x + 7, yt - 2]], 0.7), '#ffae3a', 1.1, '#7a2a08'); flat(g, blob([[x - 3, yt - 2], [x, yt - 14], [x + 3, yt - 2]], 0.7), '#fff3a0', 0); it.glow = [x, yt - 12];
  } else banner(g, x - 6, yt + 12, 12, 22, '#1d3a86', { tail: true, wave: 0.5 });
}
function gatehouse(g, it) { // front-facing gatehouse astride the wall: a firelit arch between two drum towers
  const { x, gy, s } = it;
  g.save(); g.translate(x, gy + 16); g.scale(s, s);
  D.shadowBlob(g, 24, 4, 76, 16, 0.4);
  const fw = 66, fh = 50;
  // roof walk seen from above, then the facade
  toon(g, rrect(-fw / 2, -fh - 16, fw, 18, 2), dark(WSTONE, 0.04), { sd: 1, hd: 0.6, lw: 1.8 });
  toon(g, rect2(-fw / 2, -fh, fw, fh), WSTONE, { sd: 2.4, hd: 1.2, lw: 2, detail: c => wallBricks(c, -fw / 2, -fh, fw / 2, 0, { rowH: 7, bw: 13, seed: 5, tint: true }) });
  const ap = new Path2D(); ap.moveTo(-15, 0); ap.lineTo(-15, -24); ap.arc(0, -24, 15, PI, 0); ap.lineTo(15, 0); ap.closePath();
  g.save(); g.clip(ap); const gr = g.createLinearGradient(0, -40, 0, 0); gr.addColorStop(0, '#4a1e0c'); gr.addColorStop(1, '#ffb456'); g.fillStyle = gr; g.fillRect(-16, -40, 32, 42);
  g.strokeStyle = 'rgba(30,18,10,0.85)'; g.lineWidth = 1.4; for (let k = -12; k <= 12; k += 6) { g.beginPath(); g.moveTo(k, -40); g.lineTo(k, -14); g.stroke(); } g.beginPath(); g.moveTo(-16, -22); g.lineTo(16, -22); g.moveTo(-16, -30); g.lineTo(16, -30); g.stroke();
  g.restore();
  g.strokeStyle = OUT; g.lineWidth = 2; g.stroke(ap);
  g.strokeStyle = '#7a756c'; g.lineWidth = 3; g.beginPath(); g.arc(0, -24, 18, PI, 0); g.stroke();
  for (let i = 0; i < 6; i++) toon(g, rrect(-fw / 2 + 2 + i * 11, -fh - 8, 7, 9, 1), WSTONE, { sd: 0.8, hd: 0.5, lw: 1.2 });
  // drum towers
  const glows = [];
  for (const tx of [-fw / 2 - 4, fw / 2 + 4]) {
    const yt = cylinder(g, tx, 6, 17, 7, 66, WSTONE, { rowH: 8, cols: 7, seed: 13, topColor: dark(WSTONE, 0.06), lw: 1.8 });
    merlons(g, tx, yt, 17, 7, 'back', WSTONE, { n: 9, h: 7, w: 7 }); merlons(g, tx, yt, 17, 7, 'front', WSTONE, { n: 9, h: 7, w: 7 });
    toon(g, ellipse(tx, yt - 1, 7, 3), '#3a2a1e', { sd: 0, hd: 0, lw: 1.1 });
    flat(g, blob([[tx - 7, yt - 2], [tx - 4, yt - 16], [tx, yt - 27], [tx + 4, yt - 15], [tx + 7, yt - 2]], 0.7), '#ffae3a', 1.1, '#7a2a08'); flat(g, blob([[tx - 3, yt - 2], [tx, yt - 14], [tx + 3, yt - 2]], 0.7), '#fff3a0', 0);
    banner(g, tx - 6, yt + 14, 12, 28, '#1d3a86', { tail: true, wave: 0.5 });
    glows.push([x + tx * s, gy + 16 + (yt - 12) * s]);
  }
  g.restore();
  it.glows = glows;
}
function rect2(x, y, w, h) { const p = new Path2D(); p.rect(x, y, w, h); return p; }

// ---------------- landmarks ----------------
function windmill(g, x, y, s, R) {
  g.save(); g.translate(x, y); g.scale(s, s);
  D.shadowBlob(g, 12, 2, 26, 8, 0.3);
  toon(g, poly([[-11, 0], [-8, -34], [8, -34], [11, 0]]), '#e8dcc0', { sd: 2, hd: 1, lw: 1.6 });
  toon(g, poly([[-10, -34], [0, -46], [10, -34]]), '#8a4a2c', { sd: 1, hd: 0.6, lw: 1.5 });
  toon(g, rrect(-3, -10, 6, 10, 2), '#5a3a1e', { sd: 0, hd: 0, lw: 1.2 });
  const a0 = R() * PI;
  for (let i = 0; i < 4; i++) { const a = a0 + i * PI / 2, ex = Math.cos(a) * 30, ey = -34 + Math.sin(a) * 30; line(g, [[0, -34], [ex, ey]], OUT, 3.4); line(g, [[0, -34], [ex, ey]], '#8a6a3a', 1.8); toon(g, poly([[ex * 0.3, -34 + (ey + 34) * 0.3], [ex, ey], [ex + Math.cos(a + PI / 2) * 6, ey + Math.sin(a + PI / 2) * 6], [ex * 0.3 + Math.cos(a + PI / 2) * 6, -34 + (ey + 34) * 0.3 + Math.sin(a + PI / 2) * 6]]), '#f2ead0', { sd: 0.5, hd: 0.3, lw: 1 }); }
  flat(g, circle(0, -34, 2.6), '#3a2a1a', 1);
  g.restore();
}
function beaconTower(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  D.shadowBlob(g, 14, 4, 30, 9, 0.3);
  const yt = cylinder(g, 0, 0, 13, 5.5, 46, '#9a958c', { rowH: 7, cols: 6, seed: 3, topColor: '#7a756c', lw: 1.6 });
  merlons(g, 0, yt, 13, 5.5, 'back', '#9a958c', { n: 8, h: 5, w: 5 }); merlons(g, 0, yt, 13, 5.5, 'front', '#9a958c', { n: 8, h: 5, w: 5 });
  flat(g, blob([[-8, yt - 2], [-4, yt - 18], [0, yt - 30], [4, yt - 17], [8, yt - 2]], 0.7), '#ffae3a', 1.2, '#7a2a08'); flat(g, blob([[-3, yt - 2], [0, yt - 16], [3, yt - 2]], 0.7), '#fff3a0', 0);
  g.restore();
  return [x, y + (yt - 14) * s];
}
function chapel(g, x, y, s, snowy) {
  g.save(); g.translate(x, y); g.scale(s, s);
  D.shadowBlob(g, 18, 3, 50, 12, 0.3);
  toon(g, poly([[-26, 0], [-26, -26], [18, -26], [18, 0]]), '#cfc8b8', { sd: 2, hd: 1, lw: 1.8, detail: c => wallBricks(c, -26, -26, 18, 0, { rowH: 6, bw: 11, seed: 2, tint: true }) });
  toon(g, poly([[18, 0], [18, -26], [28, -32], [28, -6]]), '#a8a094', { sd: 0.6, hd: 0, lw: 1.6 });
  toon(g, poly([[-30, -24], [-4, -44], [22, -24], [18, -24], [-4, -40], [-26, -24]]), '#5a4a5a', { sd: 1, hd: 0.6, lw: 1.6 });
  toon(g, poly([[-28, -25], [-4, -44], [20, -25]]), '#6a5a6a', { sd: 1.6, hd: 0.8, lw: 1.6 });
  if (snowy) toon(g, poly([[-26, -27], [-4, -43], [18, -27], [12, -29], [-4, -39], [-20, -29]]), '#f4f8fc', { sd: 0.5, hd: 0.4, lw: 1 });
  // steeple
  toon(g, rrect(-12, -66, 14, 30, 1), '#d8d0c0', { sd: 1.2, hd: 0.6, lw: 1.6 });
  toon(g, poly([[-14, -66], [-5, -88], [4, -66]]), '#5a4a5a', { sd: 1, hd: 0.6, lw: 1.5 });
  line(g, [[-5, -88], [-5, -96]], OUT, 1.6); line(g, [[-8.5, -93], [-1.5, -93]], OUT, 1.6);
  toon(g, circle(-5, -54, 3.6), '#ffd27a', { sd: 0, hd: 0, lw: 1.1 });
  toon(g, rrect(-8, -16, 8, 16, 3), '#3a2a1e', { sd: 0, hd: 0, lw: 1.2 });
  g.restore();
}
function tentCamp(g, x, y, R) {
  const spots = [[-34, -6, '#7a2a3a'], [6, -18, '#5a1a2a'], [38, -2, '#7a2a3a'], [-8, 16, '#4a1a2a']];
  for (const [dx, dy, col] of spots) {
    g.save(); g.translate(x + dx, y + dy); g.scale(0.55, 0.55);
    D.shadowBlob(g, 10, 2, 34, 9, 0.3);
    toon(g, poly([[-28, 0], [0, -32], [28, 0]]), col, { sd: 2, hd: 1, lw: 2 });
    toon(g, poly([[-6, 0], [0, -24], [6, 0]]), '#1a0e10', { sd: 0, hd: 0, lw: 1.4 });
    pole(g, 0, -44, -30, 2); banner(g, 1, -43, 10, 8, '#2a0e18', { tail: true, wave: 1, lw: 1 });
    g.restore();
  }
  D.campfire(g, x + 4, y + 2, 0.7);
  return [[x + 4, y - 2]];
}
function ironvein(g, x, y) { // dwarven gate carved into the mountain's foot
  g.save(); g.translate(x, y);
  D.shadowBlob(g, 14, 10, 70, 14, 0.4);
  // cut rock apron and the carved facade
  toon(g, poly([[-70, 12], [-62, -30], [-50, -64], [50, -64], [62, -30], [70, 12]]), '#7e7888', { sd: 4, hd: 2, lw: 2, light: '#a49eac', shade: '#5a5466' });
  toon(g, poly([[-48, 12], [-48, -48], [0, -72], [48, -48], [48, 12]]), '#aaa49c', { sd: 2.4, hd: 1.2, lw: 2, detail: c => wallBricks(c, -48, -72, 48, 12, { rowH: 9, bw: 18, seed: 6, tint: true }) });
  for (const px of [-40, 30]) { toon(g, rrect(px, -46, 10, 58, 2), '#c4beb4', { sd: 1.4, hd: 0.8, lw: 1.6 }); toon(g, rrect(px - 3, -52, 16, 8, 2), '#bab4aa', { sd: 1, hd: 0.6, lw: 1.4 }); }
  toon(g, poly([[-52, -46], [0, -76], [52, -46], [44, -46], [0, -68], [-44, -46]]), '#8e8880', { sd: 1, hd: 0.6, lw: 1.6 });
  const dp = new Path2D(); dp.moveTo(-20, 12); dp.lineTo(-20, -22); dp.arc(0, -22, 20, PI, 0); dp.lineTo(20, 12); dp.closePath();
  g.save(); g.clip(dp); const gr = g.createLinearGradient(0, -44, 0, 12); gr.addColorStop(0, '#7a2a0a'); gr.addColorStop(1, '#ffd070'); g.fillStyle = gr; g.fillRect(-22, -46, 44, 60); g.restore();
  g.strokeStyle = OUT; g.lineWidth = 2.2; g.stroke(dp);
  g.strokeStyle = '#4a3a2a'; g.lineWidth = 1.4; for (let k = -14; k <= 14; k += 7) { g.beginPath(); g.moveTo(k, -40 + Math.abs(k) * 0.5); g.lineTo(k, 12); g.stroke(); }
  toon(g, poly([[-10, -54], [0, -62], [10, -54], [0, -48]]), '#ffcc66', { sd: 0, hd: 0, lw: 1.2 });
  for (const bx of [-30, 30]) { toon(g, rrect(bx - 4, 0, 8, 12, 1), '#4a4a50', { sd: 0.6, hd: 0.3, lw: 1.2 }); flat(g, blob([[bx - 5, 0], [bx - 2, -10], [bx, -17], [bx + 2, -9], [bx + 5, 0]], 0.7), '#ffae3a', 1, '#7a2a08'); }
  // stair down to the road
  for (let k = 0; k < 3; k++) toon(g, rrect(-24 + k * 3, 12 + k * 5, 48 - k * 6, 5, 1), '#a29c94', { sd: 0.6, hd: 0.4, lw: 1.2 });
  g.restore();
  return [[x, y - 16], [x - 30, y - 8], [x + 30, y - 8]];
}
function shardField(g, x, y, R) { // black glass shards in the snow, faintly glowing violet
  const glows = [];
  for (let i = 0; i < 13; i++) {
    const px = x + (R() - 0.5) * 120, py = y + (R() - 0.5) * 60, s = 0.5 + R() * 0.5;
    g.save(); g.translate(px, py); g.scale(s, s);
    D.shadowBlob(g, 6, 1, 16, 5, 0.25);
    for (let k = 0; k < 3; k++) { const cx = (k - 1) * 6, h = 16 + R() * 22, w = 4 + R() * 3; toon(g, poly([[cx - w, 0], [cx - w * 0.6, -h * 0.7], [cx, -h], [cx + w * 0.7, -h * 0.65], [cx + w, 0]]), '#1e1a26', { sd: 1.4, hd: 1.4, lw: 1.3, light: '#6a5a8a' }); }
    g.restore();
    glows.push([px, py - 10 * s]);
  }
  return glows;
}
function obsidianField(g, x, y, R) {
  const spots = [];
  for (let i = 0; i < 40 && spots.length < 16; i++) { const px = x + (R() - 0.5) * 190, py = y + (R() - 0.5) * 90; if (WORLD.roads.some(l => distToPoly(px, py, l) < 30)) continue; spots.push([px, py]); }
  spots.sort((a, b) => a[1] - b[1]);
  for (const [px, py] of spots) {
    const s = 0.6 + R() * 0.9;
    g.save(); g.translate(px, py); g.scale(s, s);
    D.shadowBlob(g, 8, 2, 18, 6, 0.3);
    for (let k = 0; k < 2 + Math.floor(R() * 2); k++) { const cx = (k - 1) * 7, h = 22 + R() * 30, w = 5 + R() * 3; toon(g, poly([[cx - w, 0], [cx - w * 0.5, -h * 0.75], [cx + 1, -h], [cx + w * 0.6, -h * 0.7], [cx + w, 0]]), '#221e28', { sd: 1.6, hd: 1.6, lw: 1.4, light: '#5e5672' }); }
    g.restore();
  }
}
function stoneRing(g, x, y, R) {
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * TAU, px = x + Math.cos(a) * 52, py = y + Math.sin(a) * 24;
    g.save(); g.translate(px, py); g.scale(0.7, 0.7);
    D.shadowBlob(g, 6, 1, 12, 4, 0.3);
    toon(g, poly([[-6, 0], [-7, -22 - R() * 8], [0, -30 - R() * 6], [7, -24], [6, 0]]), '#6a625c', { sd: 1.6, hd: 1, lw: 1.5 });
    g.restore();
  }
  toon(g, ellipse(x, y, 18, 8), '#4a3e3a', { sd: 1, hd: 0.5, lw: 1.4 });
  return [[x, y]];
}
function shrine(g, x, y) { // a fallen queen's shrine: broken statue on a dais
  g.save(); g.translate(x, y);
  D.shadowBlob(g, 14, 4, 46, 12, 0.35);
  toon(g, ellipse(0, 0, 40, 16), '#6a625c', { sd: 3, hd: 1.5, lw: 1.8 });
  toon(g, ellipse(0, -4, 30, 11), '#7a726a', { sd: 2, hd: 1, lw: 1.6 });
  g.scale(1.1, 1.1); D.statue(g, 0, -6, 0.9, rngf(2), { ruin: '#7a726a', statue: '#8a96a0' });
  g.restore();
  return [[x, y - 30]];
}
function skullBones(g, x, y, R) { // the ribcage of something huge, half-buried in ash
  g.save(); g.translate(x, y);
  D.shadowBlob(g, 14, 10, 90, 16, 0.35);
  const bone = '#e6dcc6', boneD = '#b8ab92';
  // ribs as tall arches standing out of the ash, smaller toward the tail (west)
  const ribs = 8;
  for (let i = ribs - 1; i >= 0; i--) {
    const bx = -56 + i * 15, hgt = 18 + i * 4.2, lean = 5 + i * 0.6;
    for (const [sd, col] of [[-1, boneD], [1, bone]]) {
      const p = new Path2D(); p.moveTo(bx + sd * 3, 6); p.quadraticCurveTo(bx + sd * (10 + i * 0.6) + lean, -hgt * 0.55, bx + lean * 0.6 + sd * 2, -hgt);
      g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = 6.6; g.stroke(p); g.strokeStyle = col; g.lineWidth = 4; g.stroke(p);
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.2; g.save(); g.translate(-1, -0.5); g.stroke(p); g.restore();
    }
  }
  // spine along the ground and ash drifts burying the feet of the ribs
  for (let i = 0; i < 12; i++) toon(g, ellipse(-70 + i * 12.5, 6 - i * 0.3, 5.4, 3.6), bone, { sd: 0.8, hd: 0.6, lw: 1.3 });
  for (let i = 0; i < 6; i++) toon(g, ellipse(-60 + i * 26 + (R() - 0.5) * 8, 10 + (R() - 0.5) * 4, 16 + R() * 8, 5), '#5a524c', { sd: 1, hd: 0.8, lw: 0, light: '#7a706a' });
  // the horned skull resting at the head end
  toon(g, blob([[58, 2], [64, -16], [84, -22], [104, -14], [110, 4], [92, 12], [68, 12]], 0.6), bone, { sd: 2.4, hd: 1.4, lw: 1.8 });
  toon(g, blob([[100, 4], [118, 0], [126, 8], [108, 14]], 0.6), boneD, { sd: 1, hd: 0.6, lw: 1.5 }); // jaw
  toon(g, ellipse(84, -6, 6, 4.6), '#1e1612', { sd: 0, hd: 0, lw: 1 });
  for (const [hx, hy, dx] of [[70, -16, -22], [82, -21, -6]]) { const p = new Path2D(); p.moveTo(hx, hy); p.quadraticCurveTo(hx + dx * 0.6, hy - 18, hx + dx, hy - 26); g.strokeStyle = OUT; g.lineWidth = 6; g.stroke(p); g.strokeStyle = '#d8ccb0'; g.lineWidth = 3.6; g.stroke(p); }
  g.restore();
}
function cathedral(g, x, y) { // the drowned cathedral: gothic nave with a tall spire, sinking at one end
  g.save(); g.translate(x, y);
  D.shadowBlob(g, 20, 4, 70, 14, 0.35);
  const st = '#9a968a', st2 = '#7e7a70';
  toon(g, poly([[-46, 0], [-46, -38], [30, -38], [30, 0]]), st, { sd: 2.4, hd: 1.2, lw: 2, detail: c => wallBricks(c, -46, -38, 30, 0, { rowH: 7, bw: 12, seed: 8, tint: true }) });
  toon(g, poly([[30, 0], [30, -38], [44, -46], [44, -8]]), st2, { sd: 0.6, hd: 0, lw: 1.8 });
  toon(g, poly([[-50, -36], [-8, -64], [34, -36]]), '#4e5a5e', { sd: 2, hd: 1, lw: 1.8 });
  toon(g, poly([[34, -36], [-8, -64], [6, -70], [48, -44]]), '#3e4a4e', { sd: 0.6, hd: 0, lw: 1.6 });
  for (const wx of [-36, -20, -4, 12]) windowArchSmall(g, wx, -18);
  // spire
  toon(g, rrect(-60, -86, 22, 86, 2), st, { sd: 1.6, hd: 0.8, lw: 1.8, detail: c => wallBricks(c, -60, -86, -38, 0, { rowH: 7, bw: 11, seed: 3, tint: true }) });
  toon(g, poly([[-64, -86], [-49, -128], [-34, -86]]), '#4e5a5e', { sd: 1.4, hd: 0.8, lw: 1.6 });
  toon(g, circle(-49, -66, 6), '#2a3436', { sd: 0, hd: 0, lw: 1.4 });
  line(g, [[-49, -128], [-49, -138]], OUT, 1.8);
  // rose window glowing faintly (an ember crown's light)
  toon(g, circle(-8, -46, 6.5), '#ffb860', { sd: 0, hd: 0, lw: 1.4 });
  // water lapping at the foot (it is half-sunken)
  g.fillStyle = 'rgba(62,94,84,0.85)'; g.beginPath(); g.ellipse(-8, 2, 70, 9, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(200,230,210,0.5)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-70, 0); g.lineTo(-40, -1); g.moveTo(10, 1); g.lineTo(48, 0); g.stroke();
  g.restore();
  return [[x - 8, y - 46]];
}
function castle(g, x, y, s) { // small walled keep with corner towers (seen from the south)
  g.save(); g.translate(x, y); g.scale(s, s);
  D.shadowBlob(g, 24, 4, 90, 22, 0.35);
  const st = '#aaa59a', w = 96, d = 56, wh = 20;
  const tower = (tx, ty, h) => { const yt = cylinder(g, tx, ty, 11, 4.6, h, st, { rowH: 6, cols: 6, seed: 3, topColor: dark(st, 0.06), lw: 1.5 }); toon(g, poly([[tx - 13, yt + 1], [tx, yt - 18], [tx + 13, yt + 1]]), '#3e5a8a', { sd: 1.4, hd: 0.8, lw: 1.4 }); return yt; };
  tower(-w / 2, -d, 34); tower(w / 2, -d, 34);
  toon(g, rrect(-w / 2, -d - wh - 6, w, 8, 1), dark(st, 0.05), { sd: 0.6, hd: 0.4, lw: 1.4 });
  // keep
  toon(g, rrect(-20, -d + 4 - 50, 40, 50, 2), st, { sd: 2, hd: 1, lw: 1.8, detail: c => wallBricks(c, -20, -d - 46, 20, -d + 4, { rowH: 7, bw: 12, seed: 7, tint: true }) });
  toon(g, poly([[-24, -d - 45], [0, -d - 72], [24, -d - 45]]), '#3e5a8a', { sd: 1.6, hd: 0.8, lw: 1.6 });
  pole(g, 0, -d - 92, -d - 70, 1.8); banner(g, 1, -d - 91, 14, 10, '#1d3a86', { tail: true, wave: 1, lw: 1 });
  toon(g, rrect(-5, -d - 30, 10, 14, 4), '#ffd27a', { sd: 0, hd: 0, lw: 1.2 });
  // side walls (tops) and the front curtain with its gate
  for (const sx of [-1, 1]) toon(g, poly([[sx * w / 2 - 4, -d - wh + 2], [sx * w / 2 + 4, -d - wh + 2], [sx * w / 2 + 4, -wh], [sx * w / 2 - 4, -wh]]), dark(st, 0.04), { sd: 0.6, hd: 0.3, lw: 1.4 });
  toon(g, rrect(-w / 2, -wh, w, wh, 1), st, { sd: 1.6, hd: 0.8, lw: 1.8, detail: c => wallBricks(c, -w / 2, -wh, w / 2, 0, { rowH: 6, bw: 11, seed: 2, tint: true }) });
  for (let i = 0; i < 9; i++) toon(g, rrect(-w / 2 + 2 + i * 11, -wh - 6, 7, 7, 1), st, { sd: 0.6, hd: 0.4, lw: 1.1 });
  const gp = new Path2D(); gp.moveTo(-8, 0); gp.lineTo(-8, -10); gp.arc(0, -10, 8, PI, 0); gp.lineTo(8, 0); gp.closePath(); g.fillStyle = '#2a1a10'; g.fill(gp); g.strokeStyle = OUT; g.lineWidth = 1.4; g.stroke(gp);
  tower(-w / 2, 2, 30); tower(w / 2, 2, 30);
  g.restore();
}
function windowArchSmall(g, x, y) { const p = new Path2D(); p.moveTo(x - 3, y + 8); p.lineTo(x - 3, y - 3); p.arc(x, y - 3, 3, PI, 0); p.lineTo(x + 3, y + 8); p.closePath(); g.fillStyle = '#2a3034'; g.fill(p); g.strokeStyle = OUT; g.lineWidth = 1; g.stroke(p); }
function sunkenTower(g, x, y, s, R) { // ruined round tower standing in water
  g.save(); g.translate(x, y); g.scale(s, s);
  const h = 22 + R() * 26;
  cylinder(g, 0, 0, 12, 5, h, '#8e8a7e', { rowH: 6, cols: 6, seed: Math.floor(R() * 99), topColor: '#6a675e', lw: 1.5 });
  toon(g, poly([[-12, -h], [-8, -h - 8], [-2, -h - 3], [5, -h - 10], [12, -h]]), '#8e8a7e', { sd: 0.6, hd: 0.4, lw: 1.3 });
  g.fillStyle = 'rgba(58,90,80,0.9)'; g.beginPath(); g.ellipse(0, 1, 18, 5, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(200,230,210,0.5)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, 1, 18, 5, 0, PI * 0.1, PI * 0.9); g.stroke();
  g.restore();
}
function sunkenRoof(g, x, y, s) { // gable of a drowned house poking out of the water
  g.save(); g.translate(x, y); g.scale(s, s);
  toon(g, poly([[-16, 0], [0, -14], [16, 0]]), '#6a4a3a', { sd: 1.2, hd: 0.6, lw: 1.5 });
  toon(g, poly([[16, 0], [0, -14], [8, -18], [24, -4]]), '#5a3e30', { sd: 0.4, hd: 0, lw: 1.3 });
  g.fillStyle = 'rgba(58,90,80,0.9)'; g.beginPath(); g.ellipse(4, 1, 24, 4, 0, 0, TAU); g.fill();
  g.restore();
}
function ruinWall(g, x1, y1, x2, y2, h, R) { // crumbling stone wall between two points (old Rampart, sunken city)
  const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 10));
  for (let i = 0; i < n; i++) {
    const t = i / n, x = lerp(x1, x2, t), y = lerp(y1, y2, t), hh = h * (0.35 + R() * 0.65);
    if (R() < 0.15) continue;
    toon(g, rrect(x - 5.5, y - hh, 11, hh, 1), '#a29d92', { sd: 1, hd: 0.6, lw: 1.3, detail: c => { c.strokeStyle = 'rgba(40,30,20,0.35)'; c.lineWidth = 1; for (let k = 4; k < hh; k += 5) { c.beginPath(); c.moveTo(x - 6, y - k); c.lineTo(x + 6, y - k); c.stroke(); } } });
  }
}
function quarry(g, x, y, R) { // terraces cut into a pale hillside, blocks and a crane
  const tier = (k, col) => { const pts = []; const rx = 96 - k * 18, ry = 50 - k * 9; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; pts.push([x + Math.cos(a) * rx * (0.82 + R() * 0.24) + k * 4, y + Math.sin(a) * ry * (0.8 + R() * 0.25) + k * 6]); } return poly(pts); };
  D.shadowBlob(g, x + 16, y + 10, 110, 30, 0.25);
  toon(g, tier(0, 0), '#cfc6ae', { sd: 3, hd: 2, lw: 2 });
  const cols = ['#bdb399', '#aaa086', '#968c72'];
  for (let k = 1; k <= 3; k++) toon(g, tier(k), cols[k - 1], { sd: -3, hd: -1.6, lw: 1.6, light: '#ddd4be' });
  g.fillStyle = 'rgba(40,30,20,0.25)'; g.beginPath(); g.ellipse(x + 12, y + 18, 26, 9, 0, 0, TAU); g.fill();
  for (let i = 0; i < 7; i++) toon(g, rrect(x - 70 + R() * 130, y + 26 + R() * 28, 11, 7, 1), '#e4dcc8', { sd: 1, hd: 0.6, lw: 1.2 });
  line(g, [[x + 80, y - 6], [x + 80, y - 54], [x + 44, y - 48]], OUT, 4.2); line(g, [[x + 80, y - 6], [x + 80, y - 54], [x + 44, y - 48]], '#7a4a24', 2.4);
  line(g, [[x + 46, y - 48], [x + 46, y - 22]], '#3a2a1a', 1.2);
  toon(g, rrect(x + 40, y - 22, 12, 9, 1), '#e4dcc8', { sd: 1, hd: 0.6, lw: 1.2 });
}
function stiltHut(g, x, y, s, R) {
  g.save(); g.translate(x, y); g.scale(s, s);
  for (const px of [-12, -4, 4, 12]) line(g, [[px, 0], [px, -10]], '#3a2a1a', 2);
  D.shadowBlob(g, 8, 2, 22, 6, 0.3);
  toon(g, rrect(-16, -22, 32, 13, 1), '#7a5a3a', { sd: 1, hd: 0.5, lw: 1.4, detail: c => { c.strokeStyle = 'rgba(40,20,10,0.5)'; c.lineWidth = 1; for (let k = -14; k < 16; k += 5) { c.beginPath(); c.moveTo(k, -22); c.lineTo(k, -9); c.stroke(); } } });
  toon(g, poly([[-20, -21], [0, -36], [20, -21]]), '#8a7a4a', { sd: 1.4, hd: 0.7, lw: 1.5, detail: c => { c.strokeStyle = 'rgba(80,60,20,0.5)'; for (let k = -18; k < 20; k += 4) { c.beginPath(); c.moveTo(k, -21); c.lineTo(k * 0.3, -33); c.stroke(); } } });
  toon(g, rrect(-3, -18, 6, 8, 1), '#ffc870', { sd: 0, hd: 0, lw: 1 });
  g.restore();
  return [x, y - 14 * s];
}
function ashHut(g, x, y, s) { // hide-and-bone shelters of the ash-born
  g.save(); g.translate(x, y); g.scale(s, s);
  D.shadowBlob(g, 8, 2, 24, 7, 0.3);
  toon(g, blob([[-20, 0], [-14, -16], [0, -24], [14, -16], [20, 0]], 0.6), '#6a4a3a', { sd: 2, hd: 1, lw: 1.6 });
  for (const px of [-10, 0, 10]) line(g, [[px, -18 + Math.abs(px) * 0.5], [px * 1.3, -30 + Math.abs(px) * 0.4]], '#e8e0cc', 2);
  toon(g, rrect(-4, -10, 8, 10, 2), '#1a0e0a', { sd: 0, hd: 0, lw: 1 });
  g.restore();
}
function waystation(g, x, y) {
  g.save(); g.translate(x, y); g.scale(0.5, 0.5);
  D.cottage(g, 0, 0, 1, rngf(9), PS);
  g.restore();
  D.signpost(g, x + 30, y + 8, 0.6);
}

// ---------------- placement ----------------
function buildOcc(legs) { // occupancy at Q res: roads, flags, rivers, water, wall corridor, landmark keep-outs
  const keep = LANDMARK_KEEP;
  const c = maskCanvas(g => {
    g.lineWidth = 34; for (const pts of legs) strokePts(g, pts);
    g.lineWidth = 26; for (const pts of EXTRA_ROADS.map(p => smooth(p, 8))) strokePts(g, pts);
    for (const id of ORDER) { const [x, y] = S[id]; g.beginPath(); g.ellipse(x, y - 14, 42, 38, 0, 0, TAU); g.fill(); }
    for (const r of RIVERS) { g.lineWidth = r.w + 18; strokePts(g, smooth(r.pts, 10)); }
    for (const r of LAVA) { g.lineWidth = r.w + 26; strokePts(g, smooth(r.pts, 10)); }
    fillPts(g, SEA); fillPts(g, LAGOON);
    g.lineWidth = 70; strokePts(g, WALL);
    g.beginPath(); g.ellipse(CRATER.x, CRATER.y, CRATER.r * 1.5, CRATER.r * 1.25, 0, 0, TAU); g.fill();
    for (const [x, y, r] of keep) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  });
  const d = maskData(c), lw = W / Q, lh = H / Q;
  const free = (x, y) => { const xi = Math.floor(x / Q), yi = Math.floor(y / Q); if (xi < 0 || yi < 0 || xi >= lw || yi >= lh) return x > -60 && x < W + 60 && y > -60 && y < H + 60; return !d[yi * lw + xi]; };
  const mark = (x, y, r) => { const r2 = Math.ceil(r / Q); const xi = Math.floor(x / Q), yi = Math.floor(y / Q); for (let j = -r2; j <= r2; j++) for (let i = -r2; i <= r2; i++) { if (i * i + j * j > r2 * r2) continue; const X = xi + i, Y = yi + j; if (X >= 0 && Y >= 0 && X < lw && Y < lh) d[Y * lw + X] = 1; } };
  return { free, mark, occ: (x, y) => !free(x, y) };
}
// landmark positions (keep-out circles for scatter): [x, y, r]
const LM = {
  halden: [300, 1640], mill: [430, 1610], ford: [600, 1372], ashby: [1060, 1360], ruinA: [1110, 1215], ruinB: [1300, 1065], quarry: [1500, 960],
  beacon: [1770, 912], way: [1918, 702], iron: [1380, 512], camp: [1080, 650], shards: [870, 380], chapel: [1160, 262], wyrm: [1830, 175],
  stilts: [2010, 1150], watch: [1800, 1196], arches: [1500, 1222], cath: [1814, 1634], ysolde: [2480, 1600], obsid: [2668, 1330], ring: [2530, 1130],
  bones: [2600, 742], shrine: [2790, 560], keep: [520, 870],
};
const LANDMARK_KEEP = [
  [...LM.halden, 70], [...LM.mill, 34], [...LM.ford, 40], [...LM.ashby, 80], [...LM.ruinA, 50], [...LM.ruinB, 50], [...LM.quarry, 100], [...LM.beacon, 70], [...LM.way, 40],
  [...LM.iron, 120], [...LM.camp, 70], [...LM.shards, 80], [...LM.chapel, 70], [...LM.wyrm, 110], [...LM.stilts, 70], [...LM.watch, 40], [...LM.arches, 50],
  [...LM.cath, 80], [...LM.ysolde, 60], [...LM.obsid, 90], [...LM.ring, 70], [...LM.bones, 70], [...LM.shrine, 60], [...LM.keep, 100], [600, 250, 90], [1560, 420, 80], [420, 470, 60],
];
function placeMountains(items, O, R) {
  const tryPut = (x, y, w, h, kind, force) => {
    if (!force) for (let k = 0; k < 16; k++) { const t = k / 15; for (const fx of [-0.42, -0.2, 0, 0.2, 0.42]) { const px = x + fx * w * (1 - t * 0.85), py = y - h * t * 0.95 + 4; if (O.occ(px, py)) return false; } }
    items.push({ y, kind: 'mountain', m: { x, y, w, h, kind, seed: Math.floor(R() * 1e6) } });
    return true;
  };
  // the wyrm's peak towers over the north-east heights; Ironvein's mountain stands behind the hold
  tryPut(LM.wyrm[0] + 10, LM.wyrm[1] + 30, 270, 205, 'wyrm', true);
  tryPut(LM.iron[0] + 6, LM.iron[1] - 50, 280, 200, 'snow', true);
  // Frostbound ranges: rows from the far north (big peaks) down to the snowline (foothills)
  for (let y = -50; y < 700; y += 30 + R() * 14) {
    let x = 60 + R() * 60;
    while (x < 2300) {
      const sl = snowLine(x), north = clamp(1 - (y + 50) / (sl + 110));
      const w = 90 + north * 190 + R() * 60, h = w * (0.62 + R() * 0.32);
      if (y < sl + 60 && x < wallXAt(y) - 46 - w * 0.3) {
        const kind = y > sl - 10 ? 'crag' : y < 240 && R() < 0.3 ? 'peak' : 'snow';
        if (R() < 0.9) { const jx = x + (R() - 0.5) * 30, jy = y + (R() - 0.5) * 16; if (!tryPut(jx, jy, w, h, kind) && !tryPut(jx, jy, w * 0.66, h * 0.66, kind)) tryPut(jx, jy, w * 0.45, h * 0.5, y > sl - 60 ? 'crag' : kind); }
      }
      x += w * (0.42 + R() * 0.3);
    }
  }
  // volcanic heights beyond the wall: north-east and south-east massifs, the eastern rim, a few lone crags
  for (let y = -50; y < 1900; y += 34 + R() * 16) {
    let x = 2280 + R() * 80;
    while (x < 3300) {
      const w = 110 + R() * 120, h = w * (0.55 + R() * 0.3);
      const zone = (y < 470 && x > 2360) || (y > 1480 && x > 2720) || x > 3090;
      const volc = R() < 0.1;
      if ((zone || R() < 0.05) && x > wallXAt(y) + 60 + w * 0.3) tryPut(x + (R() - 0.5) * 30, y, volc ? w * 1.4 : w * 0.8, volc ? h * 1.3 : h * 1.25, volc ? 'volc' : 'spires');
      x += w * (0.45 + R() * 0.35);
    }
  }
  // rolling hills in the highlands and a few in Greenmarch
  for (let i = 0; i < 1400; i++) {
    const x = 150 + R() * 2000, y = 500 + R() * 1250, b = biome(x, y);
    if (b.ash > 0.2 || b.snow > 0.5 || b.swamp > 0.4 || pointInPoly(x, y, SEA)) continue;
    if (b.high < 0.4 || R() > 0.12) continue;
    const w = 90 + R() * 90, h = w * (0.22 + R() * 0.12);
    let ok = true; for (let k = 0; k < 9; k++) if (O.occ(x + (k / 8 - 0.5) * w * 0.9, y - h * 0.5)) { ok = false; break; }
    if (!ok) continue;
    items.push({ y, kind: 'hill', h: { x, y, w, h, seed: Math.floor(R() * 1e6), col: b.high > 0.4 ? '#7d8c58' : '#79a24a' } });
    O.mark(x, y - h * 0.4, w * 0.4);
  }
}
function placeTrees(items, O, R) {
  const placed = [];
  const okSpacing = (x, y, r) => { for (let i = placed.length - 1; i >= Math.max(0, placed.length - 600); i--) { const p = placed[i]; if (Math.abs(p[0] - x) < r && Math.abs(p[1] - y) < r * 0.7) return false; } return true; };
  const THORN = [820, 1600, 260];
  for (let i = 0; i < 52000; i++) {
    const x = R() * W, y = R() * (H + 40) - 10;
    const b = biome(x, y);
    const n = N.fbm(x / 230 + 10, y / 230 + 10, 3);
    const thorn = Math.hypot(x - THORN[0], (y - THORN[1]) * 1.3) < THORN[2] * (0.75 + 0.4 * N.fbm(x / 80, y / 80, 2));
    let want;
    if (b.ash > 0.5) want = n > 0.62 ? 0.08 : 0.004;
    else if (b.snow > 0.5) want = n > 0.58 ? 0.35 : n > 0.52 ? 0.06 : 0.004;
    else if (b.swamp > 0.5) want = n > 0.55 ? 0.12 : 0.03;
    else if (b.high > 0.5) want = n > 0.5 ? 0.42 : 0.04;
    else want = thorn ? 0.85 : n > 0.6 ? 0.36 : n > 0.54 ? 0.08 : 0.006;
    if (R() > want) continue;
    if (!O.free(x, y) || !O.free(x, y - 16) || !O.free(x - 8, y - 8) || !O.free(x + 8, y - 8)) continue;
    if (!okSpacing(x, y, b.ash > 0.5 ? 26 : 15)) continue;
    placed.push([x, y]);
    let kind;
    if (b.ash > 0.5) kind = R() < 0.7 ? 'dead_ash' : 'crystal';
    else if (b.snow > 0.5) kind = R() < 0.9 ? 'pine_snow' : 'dead_snow';
    else if (b.swamp > 0.5) kind = R() < 0.45 ? 'willow' : R() < 0.6 ? 'dead_swamp' : 'round_swamp';
    else if (b.high > 0.5) kind = R() < 0.75 ? 'pine_high' : 'round_high';
    else kind = R() < (thorn ? 0.3 : 0.2) ? 'pine' : 'round';
    items.push({ y, kind: 'tree', t: kind, x, s: 0.36 + R() * 0.12 });
  }
  // marsh reeds, bushes and rocks
  for (let i = 0; i < 9000; i++) {
    const x = R() * W, y = R() * H, b = biome(x, y);
    if (!O.free(x, y)) continue;
    const r = R();
    if (b.swamp > 0.6 && r < 0.12) items.push({ y, kind: 'reeds', x, s: 0.5 + R() * 0.2 });
    else if (b.ash > 0.5 && r < 0.03) items.push({ y, kind: 'ashrock', x, s: 0.45 + R() * 0.3 });
    else if (b.ash > 0.5 && r < 0.036 && x > wallXAt(y) + 80) items.push({ y, kind: 'mountain', m: { x, y, w: 30 + R() * 30, h: 40 + R() * 40, kind: 'spires', seed: Math.floor(R() * 1e6) } });
    else if (b.snow > 0.5 && r < 0.012) items.push({ y, kind: 'snowrock', x, s: 0.45 + R() * 0.3 });
    else if (b.ash < 0.5 && b.snow < 0.5 && r < 0.02) items.push({ y, kind: R() < 0.6 ? 'bush' : 'rock', x, s: 0.42 + R() * 0.2 });
  }
}
function placeLandmarks(items, R) {
  const add = (y, draw) => items.push({ y, kind: 'fn', draw });
  // Greenmarch
  for (const [dx, dy] of [[-40, -30], [10, -20], [50, 0], [-20, 20], [30, 40], [-60, 10]]) add(LM.halden[1] + dy, g => D.cottage(g, LM.halden[0] + dx, LM.halden[1] + dy, 0.42, R, PM));
  add(LM.mill[1], g => windmill(g, LM.mill[0], LM.mill[1], 0.8, R));
  for (const [dx, dy] of [[0, 0], [40, 18]]) add(LM.ford[1] + dy, g => D.cottage(g, LM.ford[0] + dx, LM.ford[1] + dy, 0.4, R, PM));
  for (const [dx, dy] of [[-50, -20], [-10, -36], [34, -22], [-30, 14], [20, 10], [58, 6], [-2, 40]]) add(LM.ashby[1] + dy, g => D.cottage(g, LM.ashby[0] + dx, LM.ashby[1] + dy, 0.42, R, PM));
  add(LM.ashby[1] - 50, g => { D.well(g, LM.ashby[0] + 6, LM.ashby[1] - 6, 0.5, R, PM); });
  add(LM.ashby[1] + 60, g => D.barn(g, LM.ashby[0] + 80, LM.ashby[1] + 46, 0.45, R, PM));
  add(LM.ruinA[1] + 10, g => { ruinWall(g, LM.ruinA[0] - 60, LM.ruinA[1] + 40, LM.ruinA[0] + 40, LM.ruinA[1] - 20, 20, R); });
  add(LM.ruinB[1] + 10, g => { ruinWall(g, LM.ruinB[0] - 50, LM.ruinB[1] + 30, LM.ruinB[0] + 60, LM.ruinB[1] - 34, 22, R); D.ruinPillar(g, LM.ruinB[0] - 60, LM.ruinB[1] + 40, 0.6, R, PM); });
  add(LM.ruinA[1] + 4, g => { const yt = cylinder(g, LM.ruinA[0] + 50, LM.ruinA[1] - 10, 12, 5, 26, '#a29d92', { rowH: 6, cols: 6, seed: 5, topColor: '#7e796f', lw: 1.5 }); toon(g, poly([[LM.ruinA[0] + 38, yt], [LM.ruinA[0] + 43, yt - 9], [LM.ruinA[0] + 50, yt - 3], [LM.ruinA[0] + 56, yt - 12], [LM.ruinA[0] + 62, yt]]), '#a29d92', { sd: 0.6, hd: 0.4, lw: 1.3 }); });
  add(LM.quarry[1] - 60, g => quarry(g, LM.quarry[0], LM.quarry[1] - 30, R));
  add(LM.beacon[1], g => { hill(g, { x: LM.beacon[0], y: LM.beacon[1] + 30, w: 150, h: 46, seed: 5, col: '#7fa64e' }); });
  add(LM.beacon[1] + 31, g => { GLOWS.push(beaconTower(g, LM.beacon[0], LM.beacon[1] + 2, 0.75)); });
  add(LM.keep[1], g => castle(g, LM.keep[0], LM.keep[1], 0.8));
  for (const [dx, dy] of [[-70, 30], [-40, 52], [60, 40], [84, 18]]) add(LM.keep[1] + dy, g => D.cottage(g, LM.keep[0] + dx, LM.keep[1] + dy, 0.38, R, PM));
  // Frostbound
  add(LM.way[1], g => waystation(g, LM.way[0], LM.way[1]));
  add(LM.iron[1] + 8, g => { GLOWS.push(...ironvein(g, LM.iron[0], LM.iron[1])); });
  add(LM.camp[1], g => { GLOWS.push(...tentCamp(g, LM.camp[0], LM.camp[1], R)); });
  add(LM.shards[1] + 30, g => { VIOLET.push(...shardField(g, LM.shards[0], LM.shards[1], R)); });
  add(LM.chapel[1], g => chapel(g, LM.chapel[0], LM.chapel[1], 0.85, true));
  add(LM.wyrm[1] + 34, g => { // the wyrm's lair: a dark cave mouth glowing with shard-light, old bones before it
    const [x, y] = [LM.wyrm[0] + 26, LM.wyrm[1] + 30];
    const cave = new Path2D(); cave.moveTo(x - 26, y); cave.quadraticCurveTo(x - 24, y - 34, x, y - 38); cave.quadraticCurveTo(x + 24, y - 34, x + 26, y); cave.closePath();
    g.fillStyle = '#1a1424'; g.fill(cave); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke(cave);
    g.save(); g.clip(cave); const gr = g.createRadialGradient(x, y - 4, 2, x, y - 4, 30); gr.addColorStop(0, 'rgba(190,120,255,0.8)'); gr.addColorStop(1, 'rgba(90,40,160,0)'); g.fillStyle = gr; g.fillRect(x - 30, y - 40, 60, 42); g.restore();
    for (let i = 0; i < 4; i++) D.iceShard(g, x - 70 + i * 34 + (i > 1 ? 40 : 0), y + 8 + (i % 2) * 6, 0.65, R);
    for (const [dx, dy, a] of [[-46, 14, -0.6], [-30, 20, -0.3], [36, 16, 0.5], [52, 20, 0.8]]) { line(g, [[x + dx, y + dy], [x + dx + Math.cos(a - PI / 2) * 16, y + dy + Math.sin(a - PI / 2) * 16]], OUT, 4.6); line(g, [[x + dx, y + dy], [x + dx + Math.cos(a - PI / 2) * 16, y + dy + Math.sin(a - PI / 2) * 16]], '#e8e0cc', 2.6); }
    VIOLET.push([x, y - 12], [x, y - 12]);
  });
  // Drowned Crown
  for (const [dx, dy] of [[0, 0], [-46, 18], [44, 14], [-12, -30]]) add(LM.stilts[1] + dy, g => { GLOWS.push(stiltHut(g, LM.stilts[0] + dx, LM.stilts[1] + dy, 0.55, R)); });
  add(LM.watch[1], g => { const yt = cylinder(g, LM.watch[0], LM.watch[1], 12, 5, 34, '#8e8a7e', { rowH: 6, cols: 6, seed: 11, topColor: '#6a675e', lw: 1.5 }); toon(g, poly([[LM.watch[0] - 12, yt], [LM.watch[0] - 6, yt - 10], [LM.watch[0], yt - 4], [LM.watch[0] + 7, yt - 12], [LM.watch[0] + 12, yt]]), '#8e8a7e', { sd: 0.6, hd: 0.4, lw: 1.3 }); });
  for (const dx of [-30, 10, 44]) add(LM.arches[1], g => D.ruinArch(g, LM.arches[0] + dx, LM.arches[1] + (dx % 20), 0.45, R, PW));
  add(1520, g => { ruinWall(g, 1360, 1500, 1460, 1470, 16, R); ruinWall(g, 1380, 1560, 1470, 1540, 14, R); });
  add(1700, g => { ruinWall(g, 1420, 1700, 1530, 1690, 14, R); D.ruinPillar(g, 1440, 1730, 0.5, R, PW); });
  // the sunken capital in the lagoon
  const sunk = [[1652, 1594, 'tower'], [1700, 1764, 'roof'], [1958, 1612, 'tower'], [1994, 1726, 'roof'], [1640, 1712, 'roof'], [1936, 1782, 'tower'], [2014, 1668, 'roof'], [1688, 1686, 'roof'], [1764, 1806, 'roof'], [1880, 1800, 'roof'], [1610, 1792, 'tower'], [2036, 1792, 'roof'], [1906, 1574, 'roof']];
  for (const [x, y, k] of sunk) add(y, g => (k === 'tower' ? sunkenTower(g, x, y, 1.0, R) : sunkenRoof(g, x, y, 1.05)));
  add(1700, g => { ruinWall(g, 1600, 1740, 1680, 1730, 12, R); ruinWall(g, 1930, 1700, 2030, 1720, 12, R); });
  add(LM.cath[1], g => { g.save(); g.translate(LM.cath[0], LM.cath[1] - 8); g.scale(1.2, 1.2); const gl = cathedral(g, 0, 0); g.restore(); GLOWS.push([LM.cath[0] - 10, LM.cath[1] - 63]); });
  // bridge + causeway (drawn flat, before the cathedral)
  add(1580, g => { bridge(g, BRIDGE.a, BRIDGE.b); bridge(g, CAUSEWAY.a, CAUSEWAY.b, true); });
  // Heart of Ash
  for (const [dx, dy] of [[0, 0], [-40, 20], [40, 14], [10, -26]]) add(LM.ysolde[1] + dy, g => ashHut(g, LM.ysolde[0] + dx, LM.ysolde[1] + dy, 0.6));
  add(LM.ysolde[1] + 30, g => { D.campfire(g, LM.ysolde[0], LM.ysolde[1] + 30, 0.7); GLOWS.push([LM.ysolde[0], LM.ysolde[1] + 26]); });
  add(LM.obsid[1] + 50, g => obsidianField(g, LM.obsid[0], LM.obsid[1], R));
  add(LM.ring[1] + 30, g => { stoneRing(g, LM.ring[0], LM.ring[1], R); });
  add(LM.bones[1], g => skullBones(g, LM.bones[0], LM.bones[1], R));
  add(LM.shrine[1] + 10, g => { GLOWS.push(...shrine(g, LM.shrine[0], LM.shrine[1])); });
}
function bridge(g, a, b, causeway) {
  const [ax, ay] = a, [bx, by] = b, ang = Math.atan2(by - ay, bx - ax), len = Math.hypot(bx - ax, by - ay);
  g.save(); g.translate(ax, ay); g.rotate(ang);
  D.shadowBlob(g, len / 2, 12, len * 0.5, 8, 0.3);
  toon(g, rrect(-4, -9, len + 8, 18, 3), causeway ? '#8a8476' : '#a49e90', { sd: 2, hd: 1, lw: 1.8, detail: c => { c.strokeStyle = 'rgba(40,30,20,0.35)'; c.lineWidth = 1; for (let x = 6; x < len; x += 10) { c.beginPath(); c.moveTo(x, -9); c.lineTo(x, 9); c.stroke(); } } });
  for (const sy of [-1, 1]) for (let x = 0; x <= len; x += 16) toon(g, rrect(x - 2, sy * 9 - 3, 5, 5, 1), '#b8b2a4', { sd: 0.5, hd: 0.3, lw: 1 });
  g.restore();
}

// ---------------- atmosphere ----------------
let GLOWS = [], VIOLET = [];
function atmosphere(g, R, smokes) {
  // marsh mist banks
  g.save();
  for (let i = 0; i < 26; i++) { const x = 1350 + R() * 800, y = 1150 + R() * 650; if (biome(x, y).swamp < 0.5) continue; const r = 60 + R() * 110; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(220,235,225,0.16)'); gr.addColorStop(1, 'rgba(220,235,225,0)'); g.fillStyle = gr; g.save(); g.translate(x, y); g.scale(1.8, 0.6); g.translate(-x, -y); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
  // smoke from volcanoes and the crater
  for (const [x, y] of smokes) for (let k = 0; k < 7; k++) { const px = x - k * 9 + (R() - 0.5) * 8, py = y - 10 - k * 14, r = 12 + k * 6; const gr = g.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(40,34,34,${0.32 - k * 0.035})`); gr.addColorStop(1, 'rgba(40,34,34,0)'); g.fillStyle = gr; g.fillRect(px - r, py - r, r * 2, r * 2); }
  // the Ash lands under a red pall; cold light over the north
  const ash = g.createLinearGradient(2150, 0, 3200, 0); ash.addColorStop(0, 'rgba(120,30,10,0)'); ash.addColorStop(0.25, 'rgba(120,30,10,0.1)'); ash.addColorStop(1, 'rgba(90,20,10,0.22)');
  g.fillStyle = ash; g.fillRect(2150, 0, 1050, H);
  const north = g.createLinearGradient(0, 0, 0, 700); north.addColorStop(0, 'rgba(150,180,230,0.14)'); north.addColorStop(1, 'rgba(150,180,230,0)');
  g.fillStyle = north; g.fillRect(0, 0, 2200, 700);
  g.restore();
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const [x, y] of GLOWS) glowAt(g, x, y, 46, [255, 150, 60], 0.35);
  for (const [x, y] of VIOLET) glowAt(g, x, y, 26, [160, 90, 255], 0.3);
  const cg = g.createRadialGradient(CRATER.x, CRATER.y, 30, CRATER.x, CRATER.y, 520); cg.addColorStop(0, 'rgba(255,120,40,0.35)'); cg.addColorStop(1, 'rgba(255,80,20,0)');
  g.fillStyle = cg; g.fillRect(CRATER.x - 520, CRATER.y - 520, 1040, 1040);
  g.restore();
  // soft vignette
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.55, W / 2, H / 2, W * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,8,4,0.32)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

// ---------------- debug overlay ----------------
function debugOverlay(g) {
  g.save();
  const cols = { 1: 'rgba(80,255,80,0.9)', 2: 'rgba(120,200,255,0.9)', 3: 'rgba(200,120,255,0.9)', 4: 'rgba(255,90,60,0.9)' };
  for (const [k, r] of Object.entries(WORLD.regions)) { g.strokeStyle = cols[k]; g.lineWidth = 4; g.setLineDash([16, 10]); g.beginPath(); r.fog.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke(); g.setLineDash([]); g.fillStyle = cols[k]; g.font = 'bold 56px sans-serif'; g.fillText('R' + k, r.label[0] - 30, r.label[1]); }
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; g.setLineDash([10, 8]);
  for (const leg of WORLD.roads) strokePts(g, leg);
  g.setLineDash([]);
  for (const id of ORDER) { const [x, y] = S[id]; g.fillStyle = '#c0392b'; g.beginPath(); g.arc(x, y, 14, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.fillText(id, x + 16, y - 12); }
  g.restore();
}

export async function render(q) {
  const t0 = performance.now();
  GLOWS = []; VIOLET = [];
  const cv = mk(W, H), g = cv.getContext('2d');
  setOL(1.6);
  const R = rngf(2024);
  const O = buildOcc(WORLD.roads);
  paintGround(g);
  paintAshGround(g, rngf(5));
  paintFields(g, (x, y) => O.occ(x, y) || pointInPoly(x, y, SEA), rngf(8));
  paintSea(g);
  paintLagoon(g, rngf(17));
  marshPools(g, (x, y) => O.occ(x, y), rngf(23));
  frozenLakes(g, rngf(29));
  for (const r of RIVERS) paintRiver(g, r, rngf(r.w));
  for (const r of LAVA) paintLava(g, r, rngf(r.w * 3));
  paintCrater(g, rngf(31));
  const allRoads = [...WORLD.roads, ...EXTRA_ROADS.map(p => smooth(p, 8))];
  paintRoads(g, allRoads);
  for (const [x, y, ang] of crossings(allRoads, RIVERS.map(r => smooth(r.pts, 10)))) {
    if (Math.hypot(x - S['1-2'][0], y - S['1-2'][1]) < 40) { // the ford: stepping stones instead of a bridge
      for (let k = -2; k <= 2; k++) toon(g, ellipse(x + Math.cos(ang) * k * 7, y + Math.sin(ang) * k * 7, 4.2, 3), '#b0aa9c', { sd: 1, hd: 0.6, lw: 1.1 });
    } else plankBridge(g, x, y, ang, 40, biome(x, y).snow > 0.5);
  }
  // standing things, sorted by their foot
  const items = [];
  wallPieces(items);
  placeLandmarks(items, rngf(37));
  placeMountains(items, O, rngf(41));
  placeTrees(items, O, rngf(43));
  items.sort((a, b) => a.y - b.y);
  const DR = rngf(47), smokes = [];
  for (const it of items) {
    switch (it.kind) {
      case 'mountain': if (it.m.kind === 'spires') spires(g, it.m); else { mountain(g, it.m); if (it.m.smoke) smokes.push(it.m.smoke); } break;
      case 'hill': hill(g, it.h); break;
      case 'tree': {
        const { x, y, s, t } = it;
        if (t === 'round') D.treeRound(g, x, y, s, DR, PM); else if (t === 'pine') D.treePine(g, x, y, s, DR, PM);
        else if (t === 'round_high') D.treeRound(g, x, y, s, DR, PH); else if (t === 'pine_high') D.treePine(g, x, y, s, DR, PH);
        else if (t === 'pine_snow') D.treePine(g, x, y, s, DR, PS); else if (t === 'dead_snow') D.treeDead(g, x, y, s, DR, PS);
        else if (t === 'willow') D.treeWillow(g, x, y, s, DR, PW); else if (t === 'dead_swamp') D.treeDead(g, x, y, s, DR, PW); else if (t === 'round_swamp') D.treeRound(g, x, y, s, DR, PW);
        else if (t === 'dead_ash') D.treeDead(g, x, y, s, DR, PA); else if (t === 'crystal') D.crystalRock(g, x, y, s, DR, PA);
        break;
      }
      case 'reeds': D.reeds(g, it.x, it.y, it.s, DR, PW); break;
      case 'bush': D.bush(g, it.x, it.y, it.s, DR, PM); break;
      case 'rock': D.rock(g, it.x, it.y, it.s, DR, PM); break;
      case 'snowrock': D.rock(g, it.x, it.y, it.s, DR, PS); break;
      case 'ashrock': D.rock(g, it.x, it.y, it.s, DR, PA); break;
      case 'wallseg': wallSeg(g, it); break;
      case 'walltower': wallTower(g, it); if (it.glow) GLOWS.push(it.glow); break;
      case 'gate': gatehouse(g, it); GLOWS.push(...it.glows); break;
      case 'fn': it.draw(g); break;
    }
  }
  atmosphere(g, rngf(53), [...smokes, [CRATER.x + 20, CRATER.y - 40]]);
  if (q.get('debug')) debugOverlay(g);
  console.log(`worldmap ${(performance.now() - t0) | 0}ms, ${items.length} items`);
  return [{ name: 'worldmap.jpg', canvas: cv, type: 'jpeg', quality: 0.85 }];
}
