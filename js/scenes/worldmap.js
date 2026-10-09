// Rampart Riot — campaign world map: painted map with drag + inertia, pinch / wheel / double-tap zoom, animated
// stage flags, roads revealed up to the furthest unlocked stage, drifting fog over locked regions, a top bar
// (stars, upgrades, heroes, encyclopedia, achievements, options, title) and the stage popup (modes, difficulty,
// hero, fight). Map art & layout come from js/data/worldmap.js (WORLD) with a procedural parchment fallback.
// Params: { focus: stageId, justCleared: stageId, intro: bool, popup: stageId }
import { Screen } from '../core/screen.js';
import { Audio } from '../core/audio.js';
import { Save } from '../core/save.js';
import { Assets } from '../core/assets.js';
import { HD } from '../core/hd.js';
import { t, L } from '../core/i18n.js';
import { clamp, lerp, TAU, Ease, RNG } from '../core/util.js';
import { panel, text, roundRect } from '../render/draw.js';
import { drawIcon } from '../render/icons.js';
import { STAGES } from '../data/levels/index.js';
import { HEROES, HERO_XP, heroLevel } from '../data/heroes.js';
import { UPGRADE_TREES, UPGRADE_COST } from '../data/upgrades.js';
import { BESTIARY } from '../data/enemies.js';
import { Achievements, ACHIEVEMENTS } from '../meta/achievements.js';
import { OptionsPopup } from '../ui/options.js';
import {
  MenuScene, Popup, Toasts, goSafe, btn, roundBtn, segmented, ribbon, plaque, fz, fitText, lines, para, textW, starIcon, glowDot, iconGray,
  heroPortrait, setCursor, ensureSlot, settleBattleTime, markBattleStart, loadAtlasSafe, roman, inRect, MAX_STARS, COL, TOUCH,
} from '../ui/menukit.js';

const IDS = []; for (let c = 1; c <= 4; c++) for (let i = 1; i <= 8; i++) IDS.push(`${c}-${i}`);
const prevId = id => { const i = IDS.indexOf(id); return i > 0 ? IDS[i - 1] : null; };
const nextId = id => { const i = IDS.indexOf(id); return i >= 0 && i < IDS.length - 1 ? IDS[i + 1] : null; };
const chOf = id => +String(id).split('-')[0];
const levelOf = id => STAGES.find(s => s.id === id) || null;
const stageName = (id, lv) => { const n = lv ? L(lv.name) : ''; return n && n !== id ? n : t('wm.stage', { id }); };
const OUT = '#1d130c';

// ===================================================================== world data (+ fallback)
let worldPromise = null;
function loadWorld() {
  if (!worldPromise) worldPromise = (async () => {
    let W = null;
    try { const m = await import('../data/worldmap.js'); W = m.WORLD || m.default || null; } catch (e) { W = null; }
    const world = W && W.stages && Object.keys(W.stages).length ? normalize(W) : fallbackWorld();
    world.img = world.image ? await Assets.loadImage(world.image) : null;
    if (!world.img) world.img = paintParchment(world);
    return world;
  })();
  return worldPromise;
}
function normalize(W) {
  const w = W.w || 2400, h = W.h || 1350;
  const regions = {};
  for (const [k, r] of Object.entries(W.regions || {})) regions[k] = { label: r.label || null, fog: r.fog && r.fog.length > 2 ? r.fog : null };
  return { w, h, image: W.image || null, stages: W.stages, roads: (W.roads || []).filter(r => r && r.length > 1), regions, fallback: false };
}
function fallbackWorld() {
  const W = 2400, H = 1350, stages = {}, roads = [], regions = {};
  for (let c = 1; c <= 4; c++) {
    for (let i = 1; i <= 8; i++) {
      const u = (i - 1) / 7, up = c % 2 === 1;
      const y = up ? lerp(1110, 250, u) : lerp(250, 1110, u);
      const x = 600 * (c - 1) + 300 + Math.sin(u * Math.PI * 2.1 + c * 1.3) * 150;
      stages[`${c}-${i}`] = [Math.round(x), Math.round(y)];
    }
    const x0 = 600 * (c - 1), x1 = 600 * c;
    const edge = (x, rev) => { const pts = []; for (let k = 0; k <= 9; k++) pts.push([x + (x > 0 && x < W ? Math.sin(k * 1.9 + x * 0.01) * 24 : 0), (k / 9) * H]); return rev ? pts.reverse() : pts; };
    regions[c] = { label: [600 * (c - 1) + 300, 640], labelOpen: [600 * (c - 1) + 300, 1262], fog: [...edge(x0, false), ...edge(x1, true)] };
  }
  for (let k = 0; k < IDS.length - 1; k++) {
    const a = stages[IDS[k]], b = stages[IDS[k + 1]];
    const mx = (a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.22, my = (a[1] + b[1]) / 2 - (b[0] - a[0]) * 0.22;
    const pts = [];
    for (let i = 0; i <= 12; i++) { const s = i / 12, q = 1 - s; pts.push([q * q * a[0] + 2 * q * s * mx + s * s * b[0], q * q * a[1] + 2 * q * s * my + s * s * b[1]]); }
    roads.push(pts);
  }
  return { w: W, h: H, image: null, stages, roads, regions, fallback: true };
}

// ---- geometry helpers
function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function polyBounds(poly) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
function centroid(poly) { let x = 0, y = 0; for (const p of poly) { x += p[0]; y += p[1]; } return [x / poly.length, y / poly.length]; }
function tracePoly(g, poly) { g.beginPath(); poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
// resample a polyline at ~step spacing; returns {pts:[[x,y]], cum:[s]}
function resample(poly, step) {
  const pts = [[poly[0][0], poly[0][1]]], cum = [0];
  let s = 0;
  for (let i = 1; i < poly.length; i++) {
    const [ax, ay] = poly[i - 1], [bx, by] = poly[i];
    const d = Math.hypot(bx - ax, by - ay); if (d < 0.01) continue;
    const n = Math.max(1, Math.ceil(d / step));
    for (let k = 1; k <= n; k++) { const u = k / n; pts.push([ax + (bx - ax) * u, ay + (by - ay) * u]); s += d / n; cum.push(s); }
  }
  return { pts, cum, len: s };
}

// ---- procedural parchment (used when the painted map is missing)
const TINT = { 1: '#8fbf5a', 2: '#c4d8ea', 3: '#6f9a86', 4: '#b0603a' };
function paintParchment(world) {
  const W = world.w, H = world.h, S = Math.min(0.6, 1500 / W);
  const c = document.createElement('canvas'); c.width = Math.round(W * S); c.height = Math.round(H * S);
  const g = c.getContext('2d'); g.scale(S, S);
  const rng = new RNG(4242), R = () => rng.next();
  const base = g.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, W * 0.75);
  base.addColorStop(0, '#f3e5c2'); base.addColorStop(0.7, '#e4cc98'); base.addColorStop(1, '#c49a5c');
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    const x = R() * W, y = R() * H, r = 20 + R() * 90;
    const sg = g.createRadialGradient(x, y, 0, x, y, r);
    sg.addColorStop(0, `rgba(140,95,40,${0.03 + R() * 0.05})`); sg.addColorStop(1, 'rgba(140,95,40,0)');
    g.fillStyle = sg; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const stagePts = Object.values(world.stages);
  const clearOf = (x, y, d) => stagePts.every(p => Math.hypot(p[0] - x, p[1] - y) > d);
  for (const [k, reg] of Object.entries(world.regions)) {
    if (!reg.fog) continue;
    const ch = +k, col = TINT[ch] || '#a89a7a';
    g.save(); tracePoly(g, reg.fog); g.clip();
    g.globalAlpha = 0.32; g.fillStyle = col; g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
    const bb = polyBounds(reg.fog);
    const n = Math.round((bb.w * bb.h) / 9000);
    const spots = [];
    for (let i = 0; i < n * 3 && spots.length < n; i++) {
      const x = bb.x + R() * bb.w, y = bb.y + 40 + R() * (bb.h - 80);
      if (inPoly(x, y, reg.fog) && clearOf(x, y, 85)) spots.push([x, y]);
    }
    spots.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of spots) glyph(g, ch, x, y, 0.8 + R() * 0.6, R);
    if (ch === 4) volcano(g, bb.x + bb.w * 0.55, bb.y + bb.h * 0.45);
    g.restore();
    g.save(); tracePoly(g, reg.fog); g.setLineDash([14, 10]); g.lineWidth = 3; g.strokeStyle = 'rgba(90,58,26,0.45)'; g.stroke(); g.restore();
  }
  if (world.fallback) { // the Rampart between the realm and the Ash lands
    g.save(); g.strokeStyle = '#4a3020'; g.lineWidth = 10; g.beginPath();
    for (let y = 0; y <= H; y += 30) g.lineTo(1800 + Math.sin(y * 0.01) * 10, y);
    g.stroke();
    g.fillStyle = '#4a3020';
    for (let y = 10; y < H; y += 30) g.fillRect(1800 + Math.sin(y * 0.01) * 10 - 12, y, 8, 14);
    g.restore();
  }
  // frame
  g.strokeStyle = 'rgba(70,40,15,0.7)'; g.lineWidth = 6; g.strokeRect(14, 14, W - 28, H - 28);
  g.lineWidth = 2; g.strokeRect(28, 28, W - 56, H - 56);
  compass(g, W - 120, H - 150, 70);
  return c;
}
function inked(g, fill, lw = 2.5) { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = 'rgba(60,36,14,0.85)'; g.stroke(); }
function glyph(g, ch, x, y, s, R) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  if (ch === 1) { // round trees
    for (let i = 0; i < 3; i++) {
      const tx = x + (i - 1) * 16 * s + (R() - 0.5) * 6, ty = y + (i === 1 ? -6 : 0) * s;
      g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx, ty + 14 * s); g.lineWidth = 3; g.strokeStyle = '#5a3a1a'; g.stroke();
      g.beginPath(); g.arc(tx, ty - 4 * s, 12 * s, 0, TAU); inked(g, i === 1 ? '#7aa84a' : '#6a9a3e');
    }
  } else if (ch === 2) { // snowy peaks
    const w = 46 * s, h = 52 * s;
    g.beginPath(); g.moveTo(x - w, y + h * 0.4); g.lineTo(x, y - h * 0.6); g.lineTo(x + w, y + h * 0.4); g.closePath(); inked(g, '#9aa6b4');
    g.beginPath(); g.moveTo(x, y - h * 0.6); g.lineTo(x + w, y + h * 0.4); g.lineTo(x + w * 0.2, y + h * 0.4); g.closePath(); g.fillStyle = 'rgba(40,50,70,0.25)'; g.fill();
    g.beginPath(); g.moveTo(x - w * 0.36, y - h * 0.24); g.lineTo(x, y - h * 0.6); g.lineTo(x + w * 0.36, y - h * 0.24); g.lineTo(x + w * 0.12, y - h * 0.3); g.lineTo(x, y - h * 0.18); g.lineTo(x - w * 0.14, y - h * 0.3); g.closePath(); inked(g, '#f6f8fc', 2);
  } else if (ch === 3) { // marsh pools & reeds
    g.beginPath(); g.ellipse(x, y + 6 * s, 30 * s, 10 * s, 0, 0, TAU); inked(g, 'rgba(70,110,110,0.55)', 2);
    g.strokeStyle = '#4a5a2a'; g.lineWidth = 2.4;
    for (let i = 0; i < 5; i++) { const rx = x - 18 * s + i * 9 * s; g.beginPath(); g.moveTo(rx, y + 4 * s); g.quadraticCurveTo(rx + 2 * s, y - 10 * s, rx + (R() - 0.5) * 8 * s, y - 20 * s); g.stroke(); }
  } else { // ash dunes and embers
    g.strokeStyle = 'rgba(70,30,15,0.7)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x - 36 * s, y + 6 * s); g.quadraticCurveTo(x - 10 * s, y - 14 * s, x + 14 * s, y + 4 * s); g.quadraticCurveTo(x + 28 * s, y - 6 * s, x + 40 * s, y + 6 * s); g.stroke();
    if (R() < 0.5) { g.strokeStyle = 'rgba(230,110,30,0.75)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 10 * s, y + 14 * s); g.lineTo(x, y + 20 * s); g.lineTo(x + 12 * s, y + 16 * s); g.stroke(); }
  }
}
function volcano(g, x, y) {
  g.beginPath(); g.moveTo(x - 140, y + 90); g.lineTo(x - 34, y - 70); g.lineTo(x + 34, y - 70); g.lineTo(x + 140, y + 90); g.closePath(); inked(g, '#6a4a3a', 4);
  g.beginPath(); g.ellipse(x, y - 70, 34, 10, 0, 0, TAU); inked(g, '#ff8a30', 3);
  const gl = g.createRadialGradient(x, y - 80, 0, x, y - 80, 140); gl.addColorStop(0, 'rgba(255,120,40,0.5)'); gl.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = gl; g.fillRect(x - 140, y - 220, 280, 280);
  g.strokeStyle = 'rgba(255,110,30,0.8)'; g.lineWidth = 5; g.beginPath(); g.moveTo(x + 6, y - 64); g.quadraticCurveTo(x + 30, y, x + 20, y + 80); g.stroke();
}
function compass(g, x, y, r) {
  g.save(); g.translate(x, y);
  g.beginPath(); g.arc(0, 0, r * 0.62, 0, TAU); g.lineWidth = 2.5; g.strokeStyle = 'rgba(70,40,15,0.75)'; g.stroke();
  for (let i = 0; i < 4; i++) {
    g.rotate(Math.PI / 2);
    g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.16, 0); g.lineTo(-r * 0.16, 0); g.closePath();
    g.fillStyle = i % 2 ? 'rgba(120,30,20,0.85)' : 'rgba(60,36,14,0.85)'; g.fill();
  }
  g.restore();
}

// ---- fog over locked regions: painted once into one low-res world-sized canvas (repainted only when the set changes)
function paintFogLayer(world, chs) {
  // M: margin beyond the world edges, so the drifting layer never uncovers a sliver of map at the borders
  const W = world.w, H = world.h, S = Math.min(0.4, 1000 / W), M = 24;
  const c = document.createElement('canvas'); c.width = Math.ceil((W + M * 2) * S); c.height = Math.ceil((H + M * 2) * S);
  const g = c.getContext('2d'); g.scale(S, S); g.translate(M, M);
  for (const ch of chs) {
    const poly = world.regions[ch].fog;
    const b = polyBounds(poly), rng = new RNG(77 + ch * 13), R = () => rng.next();
    // base wash
    g.save(); tracePoly(g, poly);
    const bg = g.createLinearGradient(0, b.y, 0, b.y + b.h); bg.addColorStop(0, '#e6eaf0'); bg.addColorStop(1, '#c4cbd7');
    g.globalAlpha = 0.94; g.fillStyle = bg; g.fill(); g.restore();
    // soft interior texture
    const n = Math.round((b.w * b.h) / 6000);
    for (let i = 0; i < n; i++) {
      const x = b.x + R() * b.w, y = b.y + R() * b.h;
      if (!inPoly(x, y, poly)) continue;
      const r = 60 + R() * 110, light = R() < 0.6;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, light ? 'rgba(255,255,255,0.42)' : 'rgba(110,120,142,0.2)'); gr.addColorStop(1, 'rgba(240,244,250,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // cartoon cloud billows along the border hide the polygon edge
    const pts = [];
    for (let i = 0; i < poly.length; i++) {
      const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
      const d = Math.hypot(bx - ax, by - ay), k = Math.max(1, Math.round(d / 80));
      for (let j = 0; j < k; j++) { const u = (j + R() * 0.6) / k; pts.push([ax + (bx - ax) * u + (R() - 0.5) * 34, ay + (by - ay) * u + (R() - 0.5) * 34, 52 + R() * 50]); }
    }
    for (let i = 0; i < n * 0.14; i++) { const x = b.x + R() * b.w, y = b.y + R() * b.h; if (inPoly(x, y, poly)) pts.push([x, y, 70 + R() * 70, 1]); }
    for (const [x, y, r, inner] of pts) { if (inner) continue; g.beginPath(); g.arc(x + r * 0.14, y + r * 0.2, r, 0, TAU); g.fillStyle = 'rgba(80,92,116,0.16)'; g.fill(); }
    for (const [x, y, r, inner] of pts) {
      g.beginPath(); g.arc(x, y, r, 0, TAU);
      const gr = g.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.08, x, y, r);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, inner ? '#e2e6ee' : '#e8ecf2'); gr.addColorStop(1, '#bcc4d2');
      g.globalAlpha = inner ? 0.32 : 0.97; g.fillStyle = gr; g.fill();
    }
    g.globalAlpha = 1;
  }
  // a few wisp anchors per region for the animated drift
  const wisps = [];
  for (const ch of chs) {
    const poly = world.regions[ch].fog, b = polyBounds(poly), rng = new RNG(5 + ch), R = () => rng.next();
    for (let i = 0, k = 0; i < 40 && k < 4; i++) { const x = b.x + b.w * (0.15 + R() * 0.7), y = b.y + b.h * (0.12 + R() * 0.76); if (inPoly(x, y, poly)) { wisps.push({ x, y, ph: R() * TAU }); k++; } }
  }
  return { key: chs.join(','), c, S, M, wisps };
}

// ---- waving flag sprite sheets (8 frames), rendered at a reference scale
const FLAG_COLORS = { open: ['#e0503a', '#a8281a'], done: ['#3a78c8', '#1f4a8a'], soon: ['#9a9284', '#6a6458'] };
const FLAG_FRAMES = 8;
function paintFlagSheet(kind, s, dpr) {
  const ph = 54 * s, bw = 32 * s, bh = 20 * s, padX = 8 * s, padY = 8 * s;
  const fw = bw + padX * 2, fh = ph + padY * 2;
  const c = document.createElement('canvas'); c.width = Math.ceil(fw * FLAG_FRAMES * dpr); c.height = Math.ceil(fh * dpr);
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const [col, dk] = FLAG_COLORS[kind];
  for (let f = 0; f < FLAG_FRAMES; f++) {
    g.save(); g.translate(f * fw + padX, padY + ph);
    const phase = (f / FLAG_FRAMES) * TAU;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = OUT; g.lineWidth = 5 * s; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -ph); g.stroke();
    g.strokeStyle = '#8a5a2a'; g.lineWidth = 2.6 * s; g.beginPath(); g.moveTo(0, -1 * s); g.lineTo(0, -ph + 1 * s); g.stroke();
    // banner with a travelling wave and a swallowtail
    const N = 10, top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, x = 1.5 * s + bw * u, w = Math.sin(phase - u * 3.2) * 2.6 * s * (0.25 + u);
      top.push([x, -ph + 2 * s + w]); bot.push([x, -ph + 2 * s + bh + w * 0.9]);
    }
    g.beginPath(); top.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    const mid = (top[N][1] + bot[N][1]) / 2;
    g.lineTo(top[N][0] - 7 * s, mid);
    for (let i = N; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]);
    g.closePath();
    const gr = g.createLinearGradient(0, -ph, 0, -ph + bh + 4 * s); gr.addColorStop(0, col); gr.addColorStop(1, dk);
    g.fillStyle = gr; g.fill(); g.lineWidth = 1.7 * s; g.strokeStyle = OUT; g.stroke();
    // fold shading
    g.save(); g.clip();
    for (let i = 1; i < N; i++) { const sh = Math.sin(phase - (i / N) * 3.2 + 1.2); g.fillStyle = sh > 0 ? `rgba(255,255,255,${0.12 * sh})` : `rgba(0,0,0,${-0.15 * sh})`; g.fillRect(top[i][0] - bw / N / 2, -ph - 6 * s, bw / N, bh + 14 * s); }
    g.restore();
    // emblem: little white tower
    const ex = 1.5 * s + bw * 0.42, ey = (top[4][1] + bot[4][1]) / 2;
    g.fillStyle = kind === 'soon' ? '#e8e2d4' : '#fff4dc';
    g.fillRect(ex - 3.6 * s, ey - 3 * s, 7.2 * s, 7.5 * s);
    for (let k = 0; k < 3; k++) g.fillRect(ex - 3.6 * s + k * 2.7 * s, ey - 5.2 * s, 1.8 * s, 2.4 * s);
    // finial
    g.beginPath(); g.arc(0, -ph - 1.5 * s, 2.8 * s, 0, TAU); g.fillStyle = '#f2c84a'; g.fill(); g.lineWidth = 1.2 * s; g.strokeStyle = OUT; g.stroke();
    g.restore();
  }
  return { c, fw, fh, ax: padX, ay: padY + ph, s };
}

// ===================================================================== camera
class MapCam {
  constructor() { this.x = 0; this.y = 0; this.z = 1; this.minZ = 1; this.maxZ = 2.2; this.vw = 1; this.vh = 1; this.W = 1; this.H = 1; this.vx = 0; this.vy = 0; this.tw = null; this.zt = null; this.za = null; }
  setup(vw, vh, W, H) {
    const rel = this.minZ ? this.z / this.minZ : 1;
    this.vw = vw; this.vh = vh; this.W = W; this.H = H;
    this.minZ = Math.max(vw / W, vh / H);
    this.maxZ = this.minZ * 2.2;
    this.z = clamp(this.minZ * rel, this.minZ, this.maxZ);
    this.clamp();
  }
  fixed(x, y, z) {
    const hw = this.vw / 2 / z, hh = this.vh / 2 / z;
    return { x: hw * 2 >= this.W ? this.W / 2 : clamp(x, hw, this.W - hw), y: hh * 2 >= this.H ? this.H / 2 : clamp(y, hh, this.H - hh) };
  }
  clamp() { const p = this.fixed(this.x, this.y, this.z); this.x = p.x; this.y = p.y; }
  sx(wx) { return (wx - this.x) * this.z + this.vw / 2; }
  sy(wy) { return (wy - this.y) * this.z + this.vh / 2; }
  wx(sx) { return this.x + (sx - this.vw / 2) / this.z; }
  wy(sy) { return this.y + (sy - this.vh / 2) / this.z; }
  pan(dx, dy) { this.x -= dx / this.z; this.y -= dy / this.z; this.clamp(); }
  zoomAt(f, sx, sy) {
    const bx = this.wx(sx), by = this.wy(sy);
    this.z = clamp(this.z * f, this.minZ, this.maxZ);
    this.x += bx - this.wx(sx); this.y += by - this.wy(sy); this.clamp();
  }
  get rel() { return this.z / this.minZ; }
  stop() { this.vx = 0; this.vy = 0; this.tw = null; this.zt = null; }
  tweenTo(x, y, z, dur = 1, ease = Ease.inOutCubic) {
    z = clamp(z, this.minZ, this.maxZ);
    const p = this.fixed(x, y, z);
    this.tw = { x0: this.x, y0: this.y, z0: this.z, x1: p.x, y1: p.y, z1: z, t: 0, dur, ease };
    this.vx = 0; this.vy = 0; this.zt = null;
  }
  zoomTo(z, sx, sy) { this.tw = null; this.zt = clamp(z, this.minZ, this.maxZ); this.za = { x: sx, y: sy }; }
  update(dt) {
    if (this.tw) {
      const w = this.tw; w.t += dt;
      const k = w.ease(clamp(w.t / w.dur, 0, 1));
      this.z = w.z0 * Math.pow(w.z1 / w.z0, k); this.x = lerp(w.x0, w.x1, k); this.y = lerp(w.y0, w.y1, k);
      this.clamp();
      if (w.t >= w.dur) this.tw = null;
      return;
    }
    if (this.zt !== null) {
      const f = Math.pow(this.zt / this.z, 1 - Math.pow(0.0004, dt));
      this.zoomAt(f, this.za.x, this.za.y);
      if (Math.abs(this.z / this.zt - 1) < 0.002) { this.zoomAt(this.zt / this.z, this.za.x, this.za.y); this.zt = null; }
    }
    if (Math.abs(this.vx) > 3 || Math.abs(this.vy) > 3) {
      this.pan(this.vx * dt, this.vy * dt);
      const k = Math.pow(0.005, dt); this.vx *= k; this.vy *= k;
    } else { this.vx = 0; this.vy = 0; }
  }
}

// ===================================================================== scene
export class WorldMapScene extends MenuScene {
  constructor(app) {
    super(app);
    this.cam = new MapCam();
    this.loading = true;
    this.flagSheets = {};
    this.lastTap = null;
    this.hoverFlag = null;
    this.seq = null;
    this.banner = null;
  }

  async enter(p) {
    super.enter(p);
    ensureSlot();
    settleBattleTime();
    Audio.playMusic('worldmap', { fadeIn: 1.2 });
    Audio.preload(['ui_flag', 'ui_star', 'ui_unlock', 'ui_open', 'ui_close', 'ui_click', 'ui_error', 'sword_draw', 'ui_achievement']);
    this.loading = true;
    const [world] = await Promise.all([loadWorld(), Assets.loadAtlas('ui'), Assets.loadAtlas('heroes'), loadAtlasSafe('portraits')]);
    this.world = world;
    this.buildRoads();
    this.fogLayer = null; this.fogReveal = null; this.labVis = null;
    this.loading = false;
    this.layout();
    // meta achievements (stars, heroes...) and any earned in battle
    Achievements.check(Save.slot, {});
    Toasts.pullAchievements();
    Save.persist();
    // camera entry
    const P = this.params;
    if (P.justCleared && this.world.stages[P.justCleared]) this.startClearSeq(P.justCleared);
    else if (P.intro) this.startIntro();
    else {
      const id = (P.focus && this.world.stages[P.focus] && this.isOpen(P.focus)) ? P.focus : this.furthest();
      this.centerOn(id, this.cam.minZ * 1.25, 0);
      if (P.popup && this.world.stages[P.popup] && this.isOpen(P.popup)) setTimeout(() => { if (this.app.scene === this && !this.popup) this.openStage(P.popup, true); }, 150);
    }
  }
  exit() { super.exit(); setCursor(''); }

  goBack() { goSafe(this.app, 'title', {}, () => this.app.go('slots')); }

  // ------------------------------------------------------------------ progress helpers
  isDone(id) { const s = Save.slot; return !!(s && s.stages[id] && s.stages[id].done); }
  isOpen(id) { return id === IDS[0] || this.isDone(prevId(id)); }
  regionOpen(ch) { return this.isOpen(`${ch}-1`); }
  furthest() { let f = IDS[0]; for (const id of IDS) if (this.world.stages[id] && this.isOpen(id)) f = id; return f; }
  flagState(id) {
    const sq = this.seq;
    if (sq) {
      if (id === sq.next && sq.t < sq.appearT) return 'hidden';
      if (id === sq.id && sq.t < sq.raiseT) return 'open';
    }
    if (!this.isOpen(id)) return 'hidden';
    if (this.isDone(id)) return 'done';
    return levelOf(id) ? 'open' : 'soon';
  }
  starsOf(id) {
    const st = Save.slot && Save.slot.stages[id];
    const n = st ? st.stars || 0 : 0;
    const sq = this.seq;
    if (sq && id === sq.id) { let k = 0; for (const at of sq.starT) if (sq.t >= at) k++; return Math.min(n, k); }
    return n;
  }

  // ------------------------------------------------------------------ layout
  layout() {
    const U = this.U, W = Screen.gw, H = Screen.gh, sf = Screen.safe;
    if (this.world) {
      const first = this.cam.W === 1;
      this.cam.setup(W, H, this.world.w, this.world.h);
      if (first) { this.cam.x = this.world.w / 2; this.cam.y = this.world.h / 2; this.cam.z = this.cam.minZ; this.cam.clamp(); }
    }
    this.ui.clear();
    this.back = this.ui.add(roundBtn(0, 0, 1, 'back', () => this.goBack(), { sound: 'ui_close' }));
    const r = Math.max(32 * U, 19);
    this.back.r = r; this.back.x = sf.l + 14 * U + r; this.back.y = sf.t + 12 * U + r;
    // right cluster
    const items = [
      ['upgrade', 'menu.upgrades', () => this.go('upgrades'), () => this.upgradeBadge()],
      ['hero', 'menu.heroes', () => this.go('heroes'), () => this.heroBadge()],
      ['book', 'menu.encyclopedia', () => this.go('encyclopedia'), () => this.encBadge()],
      ['trophy', 'menu.achievements', () => this.go('achievements'), () => this.achBadge()],
      ['gear', 'menu.options', () => this.openOptions(), null],
    ];
    const br = Math.max(31 * U, 19), capFs = fz(15, 10);
    const lw = items.map(i => textW(t(i[1]), capFs, 800));
    const plW = Math.max(46 * U, 30) * 1.5 + textW(`${Save.totalStars()} / ${MAX_STARS}`, fz(22, 12), 900);
    const leftEdge = this.back.x + this.back.r + 14 * U + plW + 16 * U;
    // centre-to-centre distances that keep captions apart; drop captions if they cannot fit
    let dist = lw.slice(1).map((w2, i) => Math.max(br * 2 + 14 * U, (lw[i] + w2) / 2 + 12 * U));
    let caps = true;
    const span = () => dist.reduce((a, b) => a + b, 0) + Math.max(br, lw[lw.length - 1] / 2);
    if (W - sf.r - 10 * U - span() < leftEdge + Math.max(br, lw[0] / 2)) { caps = false; dist = dist.map(() => br * 2 + 14 * U); }
    let x = W - sf.r - 10 * U - (caps ? Math.max(br, lw[lw.length - 1] / 2) : br);
    this.hudBtns = [];
    for (let i = items.length - 1; i >= 0; i--) {
      const [icon, label, fn, badge] = items[i];
      this.hudBtns.unshift(this.ui.add(roundBtn(x, sf.t + 12 * U + br, br, icon, fn, { label: caps ? () => t(label) : null, badge })));
      if (i > 0) x -= dist[i - 1];
    }
    this.hudBottom = sf.t + 12 * U + br * 2 + (caps ? capFs * 1.9 : 8 * U);
    // the two top-bar clusters that map labels must not slide under
    const rx = this.hudBtns[0].x - (caps ? Math.max(br, lw[0] / 2) : br) - 6 * U;
    this.hudRects = [{ x: 0, y: 0, w: leftEdge, h: this.back.y + r + 6 * U }, { x: rx, y: 0, w: W - rx, h: this.hudBottom }];
    Toasts.top = this.hudBottom + 6 * U;
    if (this.popup && this.popup.layout) this.popup.layout();
    this.flagSheets = {};
  }

  go(scene) {
    if (scene === 'heroes' || scene === 'upgrades' || scene === 'encyclopedia' || scene === 'achievements') this.app.go(scene, { back: 'worldmap', backParams: { focus: this.focusId() } });
  }
  focusId() { // stage nearest to the screen centre (to come back to the same view)
    let best = null, bd = Infinity;
    for (const id of IDS) { const p = this.world && this.world.stages[id]; if (!p || !this.isOpen(id)) continue; const d = Math.hypot(p[0] - this.cam.x, p[1] - this.cam.y); if (d < bd) { bd = d; best = id; } }
    return best;
  }
  openOptions() {
    this.openPopup(new OptionsPopup({
      app: this.app,
      onCredits: () => this.app.go('credits', { next: { scene: 'worldmap', params: { focus: this.focusId() } } }),
    }));
  }

  // ------------------------------------------------------------------ badges
  upgradeBadge() {
    const s = Save.slot; if (!s) return null;
    const av = Save.availableStars(s);
    if (av <= 0) return null;
    return UPGRADE_TREES.some(tr => (s.upgrades[tr] || 0) < 5 && UPGRADE_COST[s.upgrades[tr] || 0] <= av) ? av : null;
  }
  heroBadge() { const s = Save.slot; if (!s) return null; const seen = s.heroSeen || {}; return Object.keys(s.heroes).some(id => id !== 'brannoc' && !seen[id]) ? '!' : null; }
  encBadge() { const s = Save.slot; if (!s) return null; const v = s.encViewed || {}; const n = BESTIARY.filter(id => s.seenEnemies[id] && !v[id]).length; return n || null; }
  achBadge() { const s = Save.slot; if (!s) return null; const since = s.achSeen || 0; const n = ACHIEVEMENTS.filter(a => s.ach[a.id] && s.ach[a.id] > since).length; return n || null; }

  // ------------------------------------------------------------------ roads
  buildRoads() {
    const W = this.world, step = 12;
    const sp = IDS.filter(id => W.stages[id]).map(id => ({ id, x: W.stages[id][0], y: W.stages[id][1] }));
    const near = Math.max(40, W.w * 0.03);
    this.roadParts = [];
    for (const poly of W.roads) {
      const rs = resample(poly, step);
      // project stages onto the polyline
      const anchors = [];
      for (const s of sp) {
        let bd = Infinity, bi = -1;
        for (let i = 0; i < rs.pts.length; i++) { const d = Math.hypot(rs.pts[i][0] - s.x, rs.pts[i][1] - s.y); if (d < bd) { bd = d; bi = i; } }
        if (bd <= near) anchors.push({ id: s.id, i: bi, s: rs.cum[bi] });
      }
      anchors.sort((a, b) => a.s - b.s);
      const part = (s0, s1, need, kind) => { if (s1 - s0 > 1) this.roadParts.push({ rs, s0, s1, need, kind }); };
      if (!anchors.length) {
        const e = rs.pts[rs.pts.length - 1];
        let best = null, bd = Infinity; for (const s of sp) { const d = Math.hypot(s.x - e[0], s.y - e[1]); if (d < bd) { bd = d; best = s.id; } }
        part(0, rs.len, best, 'free');
        continue;
      }
      part(0, anchors[0].s, anchors[0].id, 'lead');
      for (let k = 0; k < anchors.length - 1; k++) {
        const a = anchors[k], b = anchors[k + 1];
        // the later stage (campaign order) decides when the segment appears
        const later = IDS.indexOf(a.id) > IDS.indexOf(b.id) ? a.id : b.id;
        part(a.s, b.s, later, 'link');
      }
      const last = anchors[anchors.length - 1];
      part(last.s, rs.len, nextId(last.id) || last.id, 'tail');
    }
  }
  roadReveal(part) {
    const sq = this.seq;
    if (sq && part.need === sq.next) return clamp((sq.t - sq.roadT) / sq.roadDur, 0, 1);
    return this.isOpen(part.need) ? 1 : 0;
  }

  // ------------------------------------------------------------------ camera helpers
  centerOn(id, z, dur = 1) {
    const p = this.world.stages[id] || [this.world.w / 2, this.world.h / 2];
    const zz = clamp(z ?? this.cam.z, this.cam.minZ, this.cam.maxZ);
    // keep the flag a little below the top bar
    const oy = (this.hudBottom || 0) * 0.35 / zz;
    if (dur <= 0) { const q = this.cam.fixed(p[0], p[1] - oy, zz); this.cam.stop(); this.cam.z = zz; this.cam.x = q.x; this.cam.y = q.y; }
    else this.cam.tweenTo(p[0], p[1] - oy, zz, dur);
  }

  startIntro() {
    this.cam.z = this.cam.minZ; this.cam.x = this.world.w / 2; this.cam.y = this.world.h / 2; this.cam.clamp();
    this.introT = 0;
    this.intro = { t: 0, panned: false, opened: false };
  }

  startClearSeq(id) {
    const nx = nextId(id);
    const showNext = nx && this.world.stages[nx];
    const st = Save.slot.stages[id] || {};
    const n = st.stars || 0;
    const region = showNext && chOf(nx) !== chOf(id) && this.world.regions[chOf(nx)] ? chOf(nx) : null;
    this.seq = {
      t: 0, id, next: showNext ? nx : null, raiseT: 0.75, starT: Array.from({ length: n }, (_, i) => 1.25 + i * 0.38),
      roadT: 2.7, roadDur: 1.0, appearT: 3.75, region, end: region ? 5.6 : 4.6, sfx: {},
    };
    if (!this.seq.next) { this.seq.appearT = 0; this.seq.end = 2.6; }
    this.centerOn(id, this.cam.minZ * 1.45, 0);
  }

  updateSeq(dt) {
    const sq = this.seq; if (!sq) return;
    const before = sq.t; sq.t += dt;
    const hit = at => before < at && sq.t >= at;
    if (hit(sq.raiseT - 0.25)) Audio.sfx('ui_flag');
    sq.starT.forEach(at => { if (hit(at)) Audio.sfx('ui_star'); });
    if (sq.next) {
      if (hit(sq.roadT - 0.25)) this.centerOn(sq.next, this.cam.z, 1.3);
      if (hit(sq.appearT)) Audio.sfx('ui_unlock');
      if (sq.region && hit(sq.appearT - 0.2)) { this.banner = { t: 0, title: t('wm.newRegion'), sub: `${roman(sq.region)} · ${t('wm.region' + sq.region)}` }; }
    }
    if (sq.t >= sq.end) this.seq = null;
  }
  skipSeq() { if (this.seq) { const sq = this.seq; sq.t = sq.end - 0.01; if (sq.next) this.centerOn(sq.next, this.cam.z, 0.5); } }

  // ------------------------------------------------------------------ update
  // achievement toasts wait until a clear / intro sequence and its region banner are over
  toastsHeld() { return !!(this.popup || this.seq || this.banner); }
  update(dt) {
    super.update(dt);
    if (this.loading) return;
    this.cam.update(dt);
    this.updateSeq(dt);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 3.4) this.banner = null; }
    if (this.intro) {
      const it = this.intro; it.t += dt;
      if (!it.panned && it.t > 0.7) { it.panned = true; this.centerOn(IDS[0], this.cam.minZ * 1.5, 2.0); }
      if (!it.opened && it.t > 2.9) { it.opened = true; this.intro = null; if (!this.popup) this.openStage(IDS[0]); }
    }
  }

  // ------------------------------------------------------------------ input
  flagAt(px, py) {
    if (!this.world) return null;
    const s = this.flagScale();
    let best = null, bd = Infinity;
    for (const id of IDS) {
      const p = this.world.stages[id]; if (!p) continue;
      const st = this.flagState(id); if (st === 'hidden') continue;
      const x = this.cam.sx(p[0]), y = this.cam.sy(p[1]) - 26 * s;
      const rr = Math.max(30 * s, TOUCH / 2 + 2);
      const d = Math.hypot(px - x, (py - y) * 0.8);
      if (d < rr && d < bd) { bd = d; best = id; }
    }
    return best;
  }
  onDown(p) {
    if (this.loading) return true;
    if (this.popup) return this.popup.down(p);
    if (this.ui.down(p)) return true;
    this.cam.stop();
    this.dragV = { x: 0, y: 0, t: performance.now() };
    if (this.intro) { this.intro = null; }
    return false;
  }
  onTap(p) {
    if (this.loading) return;
    if (this.popup) { this.popup.tap(p); return; }
    if (this.seq) { this.skipSeq(); return; }
    if (this.ui.tap(p)) return;
    const id = this.flagAt(p.x, p.y);
    if (id) { this.lastTap = null; this.openStage(id); return; }
    // double tap / double click zooms
    const now = performance.now();
    if (this.lastTap && now - this.lastTap.t < 330 && Math.hypot(p.x - this.lastTap.x, p.y - this.lastTap.y) < 40) {
      this.lastTap = null;
      const c = this.cam, mid = Math.sqrt(c.minZ * c.maxZ);
      if (c.z < mid * 0.98) c.zoomTo(Math.min(c.maxZ, c.z * 1.9), p.x, p.y); else c.zoomTo(c.minZ, p.x, p.y);
      return;
    }
    this.lastTap = { t: now, x: p.x, y: p.y };
  }
  onDragStart(p) { if (this.popup) { this.popup.dragStart(p); return; } this.ui.cancel(); if (this.seq) this.skipSeq(); }
  onDrag(dx, dy, p) {
    if (this.loading) return;
    if (this.popup) { this.popup.drag(dx, dy, p); return; }
    if (p && p.captured) return;
    this.cam.tw = null; this.cam.zt = null;
    this.cam.pan(dx, dy);
    const now = performance.now(), d = Math.max(4, now - this.dragV.t) / 1000;
    this.dragV.x = lerp(this.dragV.x, dx / d, 0.45); this.dragV.y = lerp(this.dragV.y, dy / d, 0.45); this.dragV.t = now;
  }
  onDragEnd(p) {
    if (this.popup) { this.popup.dragEnd(p); return; }
    if (!this.dragV) return;
    if (performance.now() - this.dragV.t > 90) { this.dragV.x = 0; this.dragV.y = 0; }
    this.cam.vx = clamp(this.dragV.x, -3200, 3200); this.cam.vy = clamp(this.dragV.y, -3200, 3200);
  }
  onPinchStart() { if (this.popup || this.loading) return; this.cam.stop(); this.ui.cancel(); this.intro = null; }
  onPinch(f, cx, cy, dx, dy) { if (this.popup || this.loading) return; this.cam.zoomAt(f, cx, cy); this.cam.pan(dx, dy); }
  onWheel(dy, x, y) {
    if (this.loading) return;
    if (this.popup) { this.popup.wheel(dy, x, y); return; }
    const c = this.cam;
    c.zoomTo((c.zt ?? c.z) * Math.exp(-dy * 0.0016), x, y);
  }
  onHover(p) {
    if (this.loading) return;
    if (this.popup) { super.onHover(p); return; }
    this.ui.move(p);
    const h = this.ui.hover;
    this.hoverFlag = h ? null : this.flagAt(p.x, p.y);
    setCursor((h && h.onTap) || this.hoverFlag ? 'pointer' : '');
  }
  onKey(k) {
    if (this.popup) { this.popup.key(k); return; }
    if (this.loading) return;
    const c = this.cam;
    if (k === 'Escape' || k === 'Backspace') { Audio.sfx('ui_close'); this.goBack(); }
    else if (k === 'ArrowLeft') c.pan(80, 0); else if (k === 'ArrowRight') c.pan(-80, 0);
    else if (k === 'ArrowUp') c.pan(0, 80); else if (k === 'ArrowDown') c.pan(0, -80);
    else if (k === '+' || k === '=') c.zoomTo((c.zt ?? c.z) * 1.25, c.vw / 2, c.vh / 2);
    else if (k === '-' || k === '_') c.zoomTo((c.zt ?? c.z) / 1.25, c.vw / 2, c.vh / 2);
    else if (k === 'Enter' && !this.popup) this.openStage(this.furthest());
  }

  openStage(id, silent = false) {
    if (!this.world || !this.world.stages[id]) return;
    this.cam.stop();
    this.selected = id;
    const pp = new StagePopup(this, id);
    pp.onClosed = () => { if (this.popup === pp) this.popup = null; this.selected = null; };
    this.popup = pp; pp.open(silent);
  }

  // ------------------------------------------------------------------ drawing
  flagScale() { return this.U * clamp(0.86 + 0.24 * (this.cam.rel - 1), 0.86, 1.18); }
  sheet(kind) {
    const dpr = Screen.dpr, ref = Math.max(0.6, this.U * 1.2), key = kind;
    let s = this.flagSheets[key];
    if (!s || s.dpr !== dpr || s.ref !== ref) { s = paintFlagSheet(kind, ref, dpr); s.dpr = dpr; s.ref = ref; this.flagSheets[key] = s; }
    return s;
  }

  drawScene(ctx, w, h) {
    if (this.loading || !this.world) { ctx.fillStyle = '#120c07'; ctx.fillRect(0, 0, w, h); text(ctx, t('loading'), w / 2, h / 2, { size: fz(22, 12), align: 'center', color: '#e9c46a', weight: 800 }); return; }
    const c = this.cam, W = this.world;
    ctx.fillStyle = '#2a1c10'; ctx.fillRect(0, 0, w, h);
    // ---- map image (visible part only)
    // HD painting (js/core/hd.js) once the map would be stretched: large/HiDPI screens, zooming in
    const img = HD.image(W.image, HD.needed(W.img.width / W.w, c.z * HD.px(ctx))) || W.img, kx = img.width / W.w, ky = img.height / W.h;
    const x0 = Math.max(0, c.wx(0)), y0 = Math.max(0, c.wy(0)), x1 = Math.min(W.w, c.wx(w)), y1 = Math.min(W.h, c.wy(h));
    // scaled layers: mip-mapped bilinear for the map, plain bilinear for soft layers (bicubic 'high' is costly)
    ctx.imageSmoothingQuality = 'medium';
    if (x1 > x0 && y1 > y0) ctx.drawImage(img, x0 * kx, y0 * ky, (x1 - x0) * kx, (y1 - y0) * ky, c.sx(x0), c.sy(y0), (x1 - x0) * c.z, (y1 - y0) * c.z);
    this.drawRoads(ctx);
    ctx.imageSmoothingQuality = 'low';
    this.drawFog(ctx);
    ctx.imageSmoothingQuality = 'medium';
    this.drawRegionLabels(ctx);
    this.drawFlags(ctx);
    if (Screen.quality !== 'low') { ctx.imageSmoothingQuality = 'low'; this.drawVignette(ctx, w, h); ctx.imageSmoothingQuality = 'medium'; }
    this.drawTop(ctx, w, h);
    this.ui.draw(ctx);
    this.drawBanner(ctx, w, h);
    if (this.hoverFlag && !this.popup) this.drawTooltip(ctx, this.hoverFlag);
  }

  drawRoads(ctx) {
    const c = this.cam, U = this.U;
    const d = Math.max(2.4, 5.2 * U * (0.85 + 0.15 * c.rel)), gap = d * 2.3;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const pass of [0, 1]) {
      ctx.setLineDash([0.001, gap]);
      ctx.lineWidth = pass ? d : d + Math.max(2, 2.6 * U);
      ctx.strokeStyle = pass ? '#fff0c8' : 'rgba(40,22,8,0.85)';
      for (const part of this.roadParts) {
        const k = this.roadReveal(part); if (k <= 0) continue;
        const { pts, cum } = part.rs, end = part.s0 + (part.s1 - part.s0) * k;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < pts.length; i++) {
          if (cum[i] < part.s0) continue;
          if (cum[i] > end) {
            const j = i - 1;
            if (j >= 0 && started) { const u = (end - cum[j]) / Math.max(0.001, cum[i] - cum[j]); ctx.lineTo(c.sx(lerp(pts[j][0], pts[i][0], u)), c.sy(lerp(pts[j][1], pts[i][1], u))); }
            break;
          }
          const x = c.sx(pts[i][0]), y = c.sy(pts[i][1]);
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  regionFogAlpha(ch) {
    const sq = this.seq;
    if (sq && sq.region === ch) return 1 - clamp((sq.t - (sq.appearT - 0.4)) / 1.6, 0, 1);
    return this.regionOpen(ch) ? 0 : 1;
  }
  // draws the visible part of a world-sized canvas (painted at scale S, with a margin of M world px around the world)
  // with a small offset (screen px)
  drawWorldLayer(ctx, cv, S, ox = 0, oy = 0, M = 0) {
    const c = this.cam, W = this.world;
    const x0 = Math.max(-M, c.wx(-ox)), y0 = Math.max(-M, c.wy(-oy)), x1 = Math.min(W.w + M, c.wx(c.vw - ox)), y1 = Math.min(W.h + M, c.wy(c.vh - oy));
    if (x1 <= x0 || y1 <= y0) return;
    ctx.drawImage(cv, (x0 + M) * S, (y0 + M) * S, (x1 - x0) * S, (y1 - y0) * S, c.sx(x0) + ox, c.sy(y0) + oy, (x1 - x0) * c.z, (y1 - y0) * c.z);
  }
  drawFog(ctx) {
    const c = this.cam, W = this.world, sq = this.seq;
    const locked = Object.keys(W.regions).map(Number).filter(ch => W.regions[ch].fog && !this.regionOpen(ch)).sort();
    const key = locked.join(',');
    if (!this.fogLayer || this.fogLayer.key !== key) this.fogLayer = locked.length ? paintFogLayer(W, locked) : { key, c: null, wisps: [] };
    const hi = Screen.quality !== 'low';
    const ox = hi ? Math.sin(this.time * 0.23) * 7 * c.z : 0, oy = hi ? Math.cos(this.time * 0.19) * 4 * c.z : 0;
    const layers = [[this.fogLayer, 1]];
    if (sq && sq.region && W.regions[sq.region] && W.regions[sq.region].fog) {
      const a = this.regionFogAlpha(sq.region);
      if (a > 0) {
        if (!this.fogReveal || this.fogReveal.key !== String(sq.region)) this.fogReveal = paintFogLayer(W, [sq.region]);
        layers.push([this.fogReveal, a]);
      }
    }
    for (const [L, a] of layers) {
      if (!L.c) continue;
      ctx.save(); ctx.globalAlpha = a;
      this.drawWorldLayer(ctx, L.c, L.S, ox, oy, L.M || 0);
      if (hi) for (const w of L.wisps) {
        const x = c.sx(w.x + Math.sin(this.time * 0.12 + w.ph) * 60), y = c.sy(w.y + Math.cos(this.time * 0.09 + w.ph) * 30);
        const r = 170 * c.z;
        if (x < -r || x > c.vw + r || y < -r || y > c.vh + r) continue;
        glowDot(ctx, x, y, r, '#f4f6fa', 0.22 * a);
      }
      ctx.restore();
    }
  }

  drawRegionLabels(ctx) {
    const c = this.cam, W = this.world, U = this.U;
    const ldt = clamp(this.time - (this.labT ?? this.time), 0, 0.1); this.labT = this.time;
    // 1) measure and place every label
    const L = [];
    for (const [k, reg] of Object.entries(W.regions)) {
      const ch = +k;
      const fa = this.regionFogAlpha(ch);
      const lp = reg.label || (reg.fog ? centroid(reg.fog) : null); if (!lp) continue;
      const title = `${roman(ch)} · ${t('wm.region' + ch)}`;
      if (fa > 0.5) {
        const fs = fz(22, 12), sub = t('wm.regionLocked'), fs2 = fz(15, 10);
        const w = Math.max(textW(title, fs, 900, 'display'), textW(sub, fs2, 700)) + 70 * U, h = fs * 1.3 + fs2 * 1.5 + 22 * U;
        const [x, y, k] = this.keepLabelOnScreen(c.sx(lp[0]), c.sy(lp[1]), w, h), v = this.labelVis(ch + 'L', k >= 0.5, ldt);
        if (v > 0) L.push({ locked: true, title, sub, fs, fs2, x, y, w, h, a: (fa - 0.5) * 2 * v });
      } else {
        const op = reg.labelOpen || lp, fs = fz(26, 13);
        const w = textW(title, fs, 900, 'display') + 20 * U, h = fs * 1.4;
        const [x, y, k] = this.keepLabelOnScreen(c.sx(op[0]), c.sy(op[1]), w, h), v = this.labelVis(ch + 'O', k >= 0.5, ldt);
        if (v > 0) L.push({ locked: false, title, fs, x, y, w, h, a: (1 - fa * 2) * v });
      }
    }
    // 2) push overlapping labels apart horizontally (labels clamped to the same edge can collide), keep them on screen
    L.sort((a, b) => a.x - b.x);
    const minX = Screen.safe.l + 8, maxX = c.vw - Screen.safe.r - 8;
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 1; i < L.length; i++) {
        const a = L[i - 1], b = L[i];
        const ox = (a.w + b.w) / 2 + 8 - (b.x - a.x), oy = (a.h + b.h) / 2 - Math.abs(b.y - a.y);
        if (ox > 0 && oy > 0) { a.x -= ox / 2; b.x += ox / 2; }
      }
      for (const l of L) l.x = clamp(l.x, minX + l.w / 2, Math.max(minX + l.w / 2, maxX - l.w / 2));
    }
    // 3) draw
    for (const l of L) {
      if (l.a <= 0) continue;
      ctx.save(); ctx.globalAlpha = l.a;
      if (l.locked) {
        const { x, y, w, h, fs, fs2 } = l;
        panel(ctx, 'dark', x - w / 2, y - h / 2, w, h);
        drawIcon(ctx, 'lock', x - w / 2 + 24 * U, y - h / 2 + 11 * U + fs * 0.65, fs * 1.1);
        text(ctx, l.title, x + 12 * U, y - h / 2 + 11 * U + fs * 0.65, { size: fs, align: 'center', color: '#e8dcc0', weight: 900, fam: 'display', maxWidth: w - 64 * U });
        text(ctx, l.sub, x, y + h / 2 - 11 * U - fs2 * 0.7, { size: fs2, align: 'center', color: '#b8a888', weight: 700, maxWidth: w - 20 * U });
      } else text(ctx, l.title, l.x, l.y, { size: l.fs, align: 'center', color: '#4a240c', stroke: 'rgba(250,238,205,0.85)', strokeWidth: l.fs * 0.22, weight: 900, fam: 'display' });
      ctx.restore();
    }
  }

  // A label is shown while it sits close enough to its anchor (k >= 0.5) and fades in / out over 0.2 s when that
  // changes, so it never rests half-transparent and never pops.
  labelVis(key, on, dt) {
    const m = this.labVis || (this.labVis = {});
    return (m[key] = clamp((m[key] ?? (on ? 1 : 0)) + (on ? dt : -dt) * 5, 0, 1));
  }
  // Keep a label inside the (safe) screen and out from under the top-bar clusters. Returns [x, y, k]: k drops from 1
  // to 0 the further the label had to move from its anchor beyond about half its size (anchor off screen or deep
  // under the top bar), so labels are never dragged far from their region.
  keepLabelOnScreen(x, y, bw, bh) {
    const W = this.cam.vw, H = this.cam.vh, sf = Screen.safe, m = 8;
    const l = sf.l + m, r = W - sf.r - m, tp = sf.t + m, bt = H - sf.b - m;
    const nx = clamp(x, l + bw / 2, Math.max(l + bw / 2, r - bw / 2)), y1 = Math.max(tp + bh / 2, bt - bh / 2);
    let ny = clamp(y, tp + bh / 2, y1);
    for (const h of this.hudRects || []) {
      if (nx + bw / 2 > h.x && nx - bw / 2 < h.x + h.w && ny - bh / 2 < h.y + h.h) ny = Math.max(ny, h.y + h.h + m + bh / 2);
    }
    ny = Math.min(ny, y1);
    const ex = Math.max(0, Math.abs(nx - x) - bw / 2 - m - Math.max(sf.l, sf.r));
    const ey = Math.max(0, Math.abs(ny - y) - bh / 2 - m - Math.max(sf.t, sf.b));
    return [nx, ny, clamp(Math.min(1 - ex / (bw * 0.6), 1 - ey / (bh * 1.2)), 0, 1)];
  }

  drawFlags(ctx) {
    const c = this.cam, W = this.world, U = this.U, s = this.flagScale(), sq = this.seq;
    const list = [];
    for (const id of IDS) {
      const p = W.stages[id]; if (!p) continue;
      const st = this.flagState(id); if (st === 'hidden') continue;
      list.push({ id, st, x: c.sx(p[0]), y: c.sy(p[1]) });
    }
    list.sort((a, b) => a.y - b.y);
    const vw = c.vw, vh = c.vh;
    for (const f of list) {
      if (f.x < -80 || f.x > vw + 80 || f.y < -40 || f.y > vh + 120) continue;
      const sel = this.selected === f.id || this.hoverFlag === f.id;
      let appear = 1, raise = 1, kind = f.st;
      if (sq && f.id === sq.next) appear = clamp((sq.t - sq.appearT) / 0.5, 0, 1);
      if (sq && f.id === sq.id) {
        const r0 = sq.raiseT - 0.5;
        if (sq.t < r0) { kind = 'open'; raise = 1; }
        else if (sq.t < sq.raiseT) { kind = 'open'; raise = 1 - (sq.t - r0) / 0.5; }
        else { kind = 'done'; raise = clamp((sq.t - sq.raiseT) / 0.45, 0, 1); }
      }
      const bob = kind === 'open' ? -Math.abs(Math.sin(this.time * 3.2 + f.x * 0.01)) * 7 * s : 0;
      const sc = s * (sel ? 1.12 : 1) * (appear < 1 ? Ease.outBack(appear) : 1);
      if (sc <= 0.01) continue;
      // base: glow ring for playable flags, a small mound for others
      ctx.save();
      if (kind === 'open') {
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 4 + f.x * 0.02);
        ctx.globalCompositeOperation = 'lighter';
        glowDot(ctx, f.x, f.y, 26 * sc * (1 + 0.2 * pulse), '#ffcc66', 0.55 + 0.25 * pulse);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.fillStyle = 'rgba(30,18,8,0.35)'; ctx.beginPath(); ctx.ellipse(f.x, f.y, 11 * sc, 4.4 * sc, 0, 0, TAU); ctx.fill();
      // flag sprite
      const sh = this.sheet(kind), fr = Math.floor(this.time * 9 + f.x * 0.05) % FLAG_FRAMES;
      const k = sc / sh.ref;
      if (raise < 1) { // lowering / raising along the pole: clip the banner above the pole base
        const lift = (1 - raise) * 40 * sc;
        ctx.save();
        ctx.beginPath(); ctx.rect(f.x - 20 * sc, f.y - 80 * sc, 70 * sc, 80 * sc - 2 * sc); ctx.clip();
        ctx.drawImage(sh.c, fr * sh.fw * sh.dpr, 0, sh.fw * sh.dpr, sh.fh * sh.dpr, f.x - sh.ax * k, f.y + bob - sh.ay * k + lift, sh.fw * k, sh.fh * k);
        ctx.restore();
      } else ctx.drawImage(sh.c, fr * sh.fw * sh.dpr, 0, sh.fw * sh.dpr, sh.fh * sh.dpr, f.x - sh.ax * k, f.y + bob - sh.ay * k, sh.fw * k, sh.fh * k);
      ctx.restore();
      // stars & challenge shields under cleared flags
      if (kind === 'done') this.drawFlagStars(ctx, f, s);
      if (f.st === 'soon') text(ctx, '?', f.x + 13 * sc, f.y - 36 * sc, { size: 15 * sc, align: 'center', color: '#fff', stroke: OUT, weight: 900 });
    }
  }
  drawFlagStars(ctx, f, s) {
    const st = Save.slot.stages[f.id] || {};
    const n = this.starsOf(f.id), sq = this.seq;
    const r = 7.5 * s, gap = r * 2.05, y = f.y + 13 * s;
    const pw = gap * 3 + 8 * s, ph = r * 2 + 6 * s;
    ctx.save();
    roundRect(ctx, f.x - pw / 2, y - ph / 2, pw, ph, ph / 2); ctx.fillStyle = 'rgba(28,16,8,0.78)'; ctx.fill();
    ctx.lineWidth = Math.max(1, 1.4 * s); ctx.strokeStyle = 'rgba(232,192,96,0.7)'; ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const sx = f.x + (i - 1) * gap;
      let k = 1;
      if (sq && sq.id === f.id && i < n) { const at = sq.starT[i]; const u = clamp((sq.t - at) / 0.3, 0, 1); k = u < 1 ? 1.9 - 0.9 * Ease.outBack(u) : 1; }
      starIcon(ctx, sx, y, r * (i < n ? k : 1), i < n);
      if (sq && sq.id === f.id && i < n && sq.t - sq.starT[i] < 0.5 && sq.t >= sq.starT[i]) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDot(ctx, sx, y, r * 3.2, '#ffe080', 1 - (sq.t - sq.starT[i]) / 0.5); ctx.restore(); }
    }
    const ir = 15 * s;
    if (st.heroic) drawIcon(ctx, 'heroic', f.x - pw / 2 - ir * 0.45, y, ir);
    if (st.iron) drawIcon(ctx, 'iron', f.x + pw / 2 + ir * 0.45, y, ir);
    ctx.restore();
  }

  drawVignette(ctx, w, h) {
    const key = `${w}x${h}`;
    if (this._vigKey !== key) {
      this._vigKey = key;
      const dpr = Screen.dpr, cv = this._vig || document.createElement('canvas');
      cv.width = Math.ceil(w * dpr / 2); cv.height = Math.ceil(h * dpr / 2);
      const g = cv.getContext('2d'); g.setTransform(dpr / 2, 0, 0, dpr / 2, 0, 0);
      const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(20,10,4,0.5)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const tg = g.createLinearGradient(0, 0, 0, h * 0.2); tg.addColorStop(0, 'rgba(20,10,4,0.42)'); tg.addColorStop(1, 'rgba(20,10,4,0)');
      g.fillStyle = tg; g.fillRect(0, 0, w, h * 0.2);
      this._vig = cv;
    }
    ctx.drawImage(this._vig, 0, 0, w, h);
  }

  drawTop(ctx) {
    const U = this.U, s = Save.slot, b = this.back;
    const ph = Math.max(46 * U, 30);
    plaque(ctx, b.x + b.r + 14 * U, b.y - ph / 2, ph, 'star', `${Save.totalStars(s)} / ${MAX_STARS}`, { size: fz(22, 12) });
  }

  drawBanner(ctx, w, h) {
    const b = this.banner; if (!b) return;
    const U = this.U, k = b.t < 0.4 ? Ease.outBack(b.t / 0.4) : b.t > 2.8 ? 1 - (b.t - 2.8) / 0.6 : 1;
    ctx.save(); ctx.globalAlpha = clamp(k, 0, 1);
    const y = h * 0.42, rh = Math.max(56 * U, 34), rw = Math.min(w * 0.7, Math.max(420 * U, textW(b.sub, fz(30, 15), 900, 'display') + 120 * U));
    text(ctx, b.title, w / 2, y - rh * 0.95, { size: fz(22, 12), align: 'center', color: '#fff2d6', stroke: '#1a0e06', strokeWidth: fz(5, 3), weight: 800 });
    ctx.translate(w / 2, y); ctx.scale(0.8 + 0.2 * k, 0.8 + 0.2 * k); ctx.translate(-w / 2, -y);
    ribbon(ctx, w / 2, y, rw, rh, b.sub, { color: 'blue' });
    ctx.restore();
  }

  drawTooltip(ctx, id) {
    const p = this.world.stages[id]; if (!p) return;
    const U = this.U, s = this.flagScale();
    const lv = levelOf(id);
    let name = lv ? stageName(id, lv) : t('menu.comingSoon');
    if (name === t('wm.stage', { id })) name = '';
    const fs = fz(17, 11), tw = textW(`${id}  ${name}`, fs, 800) + 28 * U, th = fs * 1.9;
    const x = clamp(this.cam.sx(p[0]) - tw / 2, 6, this.cam.vw - tw - 6), y = this.cam.sy(p[1]) - 66 * s - th;
    panel(ctx, 'dark', x, y, tw, th);
    text(ctx, id, x + 14 * U, y + th / 2 + 1, { size: fs, color: '#ffd96a', weight: 900 });
    text(ctx, name, x + 14 * U + textW(id + '  ', fs, 900), y + th / 2 + 1, { size: fs, color: '#fff2d6', weight: 800 });
  }
}

// ===================================================================== stage popup
const MODES = ['campaign', 'heroic', 'iron'];
const DIFFS = ['casual', 'normal', 'veteran'];
class StagePopup extends Popup {
  constructor(scene, id) {
    super();
    this.s = scene; this.id = id; this.level = levelOf(id);
    this.mode = 'campaign'; this.note = null; this.shake = null;
  }
  get st() { return Save.slot.stages[this.id] || {}; }
  modeOpen(m) { return m === 'campaign' || !!this.st.done; }

  layout() {
    const U = this.U, W = Screen.gw, H = Screen.gh, sf = Screen.safe, lv = this.level;
    const w = Math.min(980 * U, W - 20 - sf.l - sf.r), maxH = H - 14;
    this.sideW = clamp(w * 0.31, 200 * U, 310 * U);
    const pad = Math.max(26 * U, 14);
    // ---- left column: measure at decreasing font scales until it fits the screen height
    let k = 1, V;
    for (let iter = 0; iter < 8; iter++) {
      V = this.vlayout(k, w, pad);
      if (V.bottom <= maxH || k < 0.72) break;
      k *= 0.93;
    }
    // ---- sidebar needs: title, portrait, name, level + xp, change, fight
    const sfs = fz(20, 11), fs2 = fz(18, 10.5), fh = Math.max(66 * U, 40), cbh = Math.max(40 * U, 28);
    const pr = Math.max(18, Math.min(this.sideW * 0.27, 62 * U));
    const sideNeed = 12 * U + 16 * U + sfs * 1.2 + 10 * U + pr * 2 + fs2 * 3.3 + 24 * U + cbh + 22 * U + fh + 26 * U;
    const h = Math.min(maxH, Math.max(V.bottom, sideNeed, 360 * U));
    this.rect = { x: sf.l + (W - sf.l - sf.r - w) / 2, y: (H - h) / 2, w, h };
    const r = this.rect;
    V = this.vlayout(k, w, pad, r.y);
    Object.assign(this, V);
    this.L = { x: r.x + pad, w: w - this.sideW - pad * 2 - 6 * U };
    this.side = { x: r.x + r.w - this.sideW - 12 * U, y: r.y + 12 * U, w: this.sideW, h: r.h - 24 * U };
    this.ui.clear();
    const cr = Math.max(24 * U, 17);
    this.ui.add(roundBtn(r.x + r.w - cr * 0.55, r.y + cr * 0.55, cr, 'close', () => this.close(), { color: 'red', sound: 'ui_close', iconScale: 0.95 }));
    if (lv) {
      const tw = (this.L.w - 16 * U) / 3;
      this.tabs = {};
      MODES.forEach((m, i) => {
        this.tabs[m] = this.ui.add(btn(this.L.x + i * (tw + 8 * U), this.yTabs, tw, this.tabH, () => t('mode.' + m), () => this.pickMode(m), {
          icon: () => (this.modeOpen(m) ? m : 'lock'), color: () => (this.mode === m ? 'gold' : 'dark'), keepColor: true,
          size: Math.max(10, Math.min(this.tabH * 0.36, fz(19, 10.5))), iconScale: 0.62,
          after: (ctx, it) => {
            const earned = m === 'heroic' ? this.st.heroic : m === 'iron' ? this.st.iron : false;
            if (earned) starIcon(ctx, it.x + it.w - 6 * U, it.y + 4 * U, Math.max(9 * U, 6), true);
          },
        }));
      });
      const lw = Math.min(150 * U, this.L.w * 0.26);
      this.diffLabelW = lw;
      for (const it of segmented(this.L.x + lw, this.yDiff, this.L.w - lw, this.diffH, DIFFS.map(d => ({ label: t('diff.' + d), value: d })), {
        get: () => Save.slot.difficulty || 'normal', set: v => { Save.slot.difficulty = v; Save.persist(); }, size: Math.max(10, Math.min(this.diffH * 0.4, fz(18, 10.5))), on: 'blue',
      })) this.ui.add(it);
    }
    // ---- sidebar
    const sd = this.side;
    this.fightBtn = this.ui.add(btn(sd.x + 14 * U, sd.y + sd.h - fh - 14 * U, sd.w - 28 * U, fh, t('wm.fight'), () => this.fight(), {
      color: 'green', icon: 'campaign', size: Math.max(12, Math.min(fh * 0.38, fz(26, 13))), fam: 'display', enabled: !!lv, sound: 'sword_draw',
    }));
    this.sfs = sfs; this.sfs2 = fs2;
    this.portrait = { x: sd.x + sd.w / 2, y: sd.y + 16 * U + sfs * 1.2 + 10 * U + pr, r: pr };
    const cbw = Math.min(sd.w - 40 * U, 150 * U);
    this.yHeroName = this.portrait.y + pr + fs2 * 1.0;
    this.yHeroLvl = this.yHeroName + fs2 * 1.2;
    this.yXp = this.yHeroLvl + fs2 * 0.95;
    this.ui.add(btn(sd.x + (sd.w - cbw) / 2, this.yXp + 16 * U, cbw, cbh, t('wm.change'), () => this.changeHero(), { color: 'blue', size: Math.max(10, Math.min(cbh * 0.42, fz(17, 10))) }));
  }
  // vertical layout of the left column at font scale k; returns positions (absolute when top is given)
  vlayout(k, w, pad, top = 0) {
    const U = this.U, lv = this.level, Lw = w - this.sideW - pad * 2 - 6 * U;
    const F = { tag: fz(16 * k, 10), name: fz(34 * k, 15), desc: fz(19 * k, 10.5), info: fz(17 * k, 10), small: fz(15 * k, 9.5) };
    const o = { fs: F };
    let y = top + pad * 0.9;
    o.yTag = y + F.tag * 0.6; y += F.tag * 1.35;
    o.yName = y + F.name * 0.55; y += F.name * 1.2;
    o.descLines = lines(lv ? L(lv.desc) || ' ' : t('wm.comingSoon'), Lw, F.desc, 600).slice(0, 3);
    o.yDesc = y + 4 * U; y = o.yDesc + o.descLines.length * F.desc * 1.38 + 14 * U;
    if (!lv) { o.bottom = y + pad - top; return o; }
    o.yTabs = y; o.tabH = Math.max(50 * U * k, 32); y += o.tabH + 10 * U;
    // the info box fits the tallest of the three mode descriptions
    const iw = Lw - 28 * U, lh = F.info * 1.38;
    const nCamp = Math.min(3, lines(t('wm.campaignDesc'), iw, F.info, 600).length);
    const nHer = Math.min(2, lines(t('mode.heroicDesc'), iw, F.info, 700).length) + 1;
    const nIron = Math.min(2, lines(t('mode.ironDesc'), iw, F.info, 700).length) + 1.25;
    o.yInfo = y; o.infoH = Math.max(nCamp, nHer, nIron) * lh + 20 * U; y += o.infoH + 12 * U;
    o.yDiff = y; o.diffH = Math.max(44 * U * k, 30); y += o.diffH + 6 * U;
    o.yDiffDesc = y; y += F.small * 1.5 + pad * 0.7;
    o.bottom = y - top;
    return o;
  }

  pickMode(m) {
    if (!this.modeOpen(m)) { Audio.sfx('ui_error'); this.shake = { m, t: 0 }; this.note = { text: t('wm.modeLocked'), t: 0 }; return; }
    if (this.mode !== m) { this.mode = m; this.note = null; }
  }
  fight() {
    if (!this.level) return;
    Save.persist();
    markBattleStart();
    this.s.app.go('battle', { stageId: this.id, mode: this.mode });
  }
  changeHero() { this.s.app.go('heroes', { back: 'worldmap', backParams: { focus: this.id, popup: this.id } }); }

  update(dt) {
    super.update(dt);
    if (this.shake) { this.shake.t += dt; if (this.shake.t > 0.4) this.shake = null; }
    if (this.note) { this.note.t += dt; if (this.note.t > 2.6) this.note = null; }
  }

  drawBody(ctx) {
    const r = this.rect, U = this.U, F = this.fs, lv = this.level, Lc = this.L;
    panel(ctx, 'parchment', r.x, r.y, r.w, r.h);
    // ---- header
    text(ctx, t('wm.stage', { id: this.id }) + (lv ? '' : '  ·  ' + t('menu.comingSoon')), Lc.x, this.yTag, { size: F.tag, color: COL.soft, weight: 800 });
    const starsW = lv ? F.name * 2.9 : 0;
    fitText(ctx, stageName(this.id, lv), Lc.x, this.yName, Lc.w - starsW - 8 * U, { size: F.name, color: COL.head, weight: 900, fam: 'display' });
    if (lv) {
      const n = this.st.stars || 0, sr = F.name * 0.42;
      for (let i = 0; i < 3; i++) starIcon(ctx, Lc.x + Lc.w - starsW + sr + i * sr * 2.25, this.yName - (i === 1 ? sr * 0.25 : 0), sr, i < n);
    }
    this.descLines.forEach((ln, i) => text(ctx, ln, Lc.x, this.yDesc + i * F.desc * 1.38, { size: F.desc, color: COL.ink, weight: 600, baseline: 'top' }));
    if (!lv) { this.drawSide(ctx); return; }
    // divider above the tabs
    ctx.fillStyle = 'rgba(110,70,25,0.3)'; ctx.fillRect(Lc.x, this.yTabs - 8 * U, Lc.w, Math.max(1, 1.5 * U));
    // ---- mode info
    const ib = { x: Lc.x, y: this.yInfo, w: Lc.w, h: this.infoH };
    roundRect(ctx, ib.x, ib.y, ib.w, ib.h, 10 * U); ctx.fillStyle = 'rgba(120,80,30,0.12)'; ctx.fill();
    ctx.lineWidth = Math.max(1, 1.5 * U); ctx.strokeStyle = 'rgba(110,70,25,0.3)'; ctx.stroke();
    const ix = ib.x + 14 * U, iw = ib.w - 28 * U;
    let yy = ib.y + 10 * U;
    if (this.note) {
      ctx.save(); ctx.globalAlpha = Math.min(1, (2.6 - this.note.t) * 3);
      drawIcon(ctx, 'lock', ix + F.info * 0.6, ib.y + ib.h / 2, F.info * 1.5);
      para(ctx, this.note.text, ix + F.info * 1.6, ib.y + ib.h / 2 - F.info * 0.7, iw - F.info * 1.6, { size: F.info, color: COL.bad, weight: 800, max: 2 });
      ctx.restore();
    } else if (this.mode === 'campaign') {
      para(ctx, t('wm.campaignDesc'), ix, yy, iw, { size: F.info, color: COL.ink, weight: 600, max: 3 });
    } else {
      const earned = this.mode === 'heroic' ? this.st.heroic : this.st.iron;
      yy += para(ctx, t(this.mode === 'heroic' ? 'mode.heroicDesc' : 'mode.ironDesc'), ix, yy, iw, { size: F.info, color: COL.ink, weight: 700, max: 2 });
      const line2 = earned ? `${t('wm.earned')}  ` : t('wm.extraStar');
      if (this.mode === 'iron' && lv.iron && lv.iron.allowed) {
        const isz = F.info * 1.7;
        text(ctx, t('wm.allowed'), ix, yy + isz * 0.5, { size: F.info, color: COL.soft, weight: 800 });
        let ax = ix + textW(t('wm.allowed'), F.info, 800) + 10 * U + isz / 2;
        for (const a of lv.iron.allowed) { drawIcon(ctx, a, ax, yy + isz * 0.45, isz); ax += isz * 1.05; }
        ax += 8 * U;
        if (earned) { starIcon(ctx, ax + F.info * 0.5, yy + isz * 0.5, F.info * 0.6, true); text(ctx, t('wm.earned'), ax + F.info * 1.3, yy + isz * 0.5, { size: F.info, color: COL.good, weight: 800 }); }
        else text(ctx, '+1', ax, yy + isz * 0.5, { size: F.info, color: COL.soft, weight: 900 });
      } else {
        if (earned) { starIcon(ctx, ix + F.info * 0.55, yy + F.info * 0.7, F.info * 0.6, true); text(ctx, line2, ix + F.info * 1.4, yy + F.info * 0.7, { size: F.info, color: COL.good, weight: 800 }); }
        else text(ctx, line2, ix, yy + F.info * 0.7, { size: F.info, color: COL.soft, weight: 700, maxWidth: iw });
      }
    }
    // ---- difficulty
    fitText(ctx, t('opt.difficulty'), Lc.x, this.yDiff + this.diffH / 2, this.diffLabelW - 10 * U, { size: F.desc, color: COL.head, weight: 900 });
    const d = Save.slot.difficulty || 'normal';
    fitText(ctx, t(`diff.${d}Desc`), Lc.x + this.diffLabelW, this.yDiffDesc + F.small * 0.65, Lc.w - this.diffLabelW, { size: F.small, color: COL.soft, weight: 700 });
    this.drawSide(ctx);
  }

  drawSide(ctx) {
    const U = this.U, sd = this.side, s = Save.slot;
    panel(ctx, 'woodDark', sd.x, sd.y, sd.w, sd.h);
    const fs = fz(20, 11);
    text(ctx, t('wm.hero'), sd.x + sd.w / 2, sd.y + 16 * U + fs * 0.6, { size: fs, align: 'center', color: '#ffe9a8', stroke: '#1a0e06', weight: 900 });
    const hid = HEROES[s.hero] ? s.hero : 'brannoc';
    const pt = this.portrait;
    heroPortrait(ctx, hid, pt.x, pt.y, pt.r, this.s.time);
    const xp = (s.heroes[hid] || {}).xp || 0, lvl = heroLevel(xp);
    const fs2 = this.sfs2;
    fitText(ctx, t(`hero.${hid}.name`), pt.x, this.yHeroName, sd.w - 20 * U, { size: fs2 * 1.08, align: 'center', color: '#fff2d6', stroke: '#1a0e06', weight: 900 });
    // level + xp bar
    const bw = Math.min(sd.w - 50 * U, 170 * U), bh = Math.max(7 * U, 5), by = this.yXp - bh / 2;
    const a = HERO_XP[lvl - 1] || 0, b = HERO_XP[lvl] || a, frac = lvl >= HERO_XP.length ? 1 : (xp - a) / Math.max(1, b - a);
    text(ctx, t('heroes.level', { n: lvl }), pt.x, this.yHeroLvl, { size: fs2 * 0.85, align: 'center', color: '#e8c070', weight: 800 });
    roundRect(ctx, pt.x - bw / 2, by, bw, bh, bh / 2); ctx.fillStyle = '#1a0f07'; ctx.fill();
    if (frac > 0) { roundRect(ctx, pt.x - bw / 2 + 1, by + 1, Math.max(bh, (bw - 2) * clamp(frac, 0, 1)), bh - 2, (bh - 2) / 2); ctx.fillStyle = '#8fd85a'; ctx.fill(); }
  }

  drawOver(ctx) {
    // shake feedback on a locked tab
    if (!this.shake) return;
    const it = this.tabs && this.tabs[this.shake.m];
    if (!it) return;
    const a = (1 - this.shake.t / 0.4) * 0.5;
    ctx.save(); ctx.globalAlpha *= a; roundRect(ctx, it.x, it.y, it.w, it.h, 10); ctx.fillStyle = '#ff4a2a'; ctx.fill(); ctx.restore();
  }
}
