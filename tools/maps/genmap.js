// Rampart Riot — battlefield map painter (runs in the browser; exported by tools/maps/export.mjs)
import { makeNoise, rngf, hex, lerp3 } from './lib/noise.js';
import * as D from './lib/deco.js';
import { Path } from '../../js/game/path.js';
import { toon, flat, ellipse, circle, rrect, poly, blob, dark, light, mix, alpha, OUT, glow, line, stroke, setOL } from '../art/lib/toon.js';

export const W = 2400, H = 1350;
const PX = 240, PY = 135, PW = 1920, PH = 1080;

export const THEMES = {
  meadow: {
    ground: ['#6a9640', '#5c8838', '#7aa64c', '#86ad52', '#6f9a44'], grain: ['#4f7a2e', '#8ab656', '#5f8c36'],
    road: '#c8a571', roadDark: '#a8854f', shoulder: '#8a6d42', rut: 'rgba(110,80,40,0.35)', pebble: '#a89a84',
    tuft: '#3f6a28', leaf: ['#4f8a34', '#5a9a3a', '#3f7a2e', '#6aa840', '#4a8a3a'], trunk: '#6b4423', rock: '#9a958c', bush: '#4a8a30', berry: '#c0392b',
    flowers: ['#f2e05a', '#f08aa8', '#ffffff', '#b88af0', '#f0a040'], roofs: ['#a8452c', '#8a5a3a', '#b0602a', '#7a4a3a'], thatch: true,
    water: ['#3d7aa8', '#5a9ac4', '#9fd0e8'], shore: '#b8a070', fence: '#9a6a3a', mushroom: '#c0392b',
    trees: ['round', 'round', 'round', 'pine'], grade: { tint: 'rgba(255,230,160,0.06)', vig: 0.38 },
  },
  snow: { // Chapter II — snowfield, frozen water, snow-laden trees & snow structures come from lib/deco.js (snow*), enabled by `snow: true`
    snow: true,
    ground: ['#e4ecf2', '#d4dfe8', '#eef4f8', '#c8d6e2', '#dde7ef'], grain: ['#b8c8d8', '#ffffff', '#c4d2de'],
    road: '#a8998a', roadDark: '#8a7a6a', shoulder: '#a9b8cc', rut: 'rgba(90,80,70,0.3)', pebble: '#8a8a92',
    tuft: '#a8905c', leaf: ['#2f5a46'], pine: '#2f5a4a', snowy: true, trunk: '#5a3e2a', rock: '#8a8e96', bush: '#4a6a5a',
    flowers: ['#ffffff'], roofs: ['#7a4a3a', '#5a5a6a'], water: ['#7ab0d0', '#a8d0e8', '#e8f6ff'], shore: '#c8d4dc', fence: '#7a5a3a', ice: true,
    trees: ['pine', 'pine', 'pine', 'pine', 'fir', 'birch', 'dead'], deadwood: '#4a3e36', grade: { tint: 'rgba(170,200,255,0.03)', vig: 0.06 },
  },
  swamp: { // Chapter III — bog water, causeways, marsh flora & sunken ruins come from lib/deco.js (swamp*), enabled by `swamp: true`
    swamp: true,
    ground: ['#5c6c3c', '#4a5a32', '#6a7848', '#505e36', '#6a7048'], grain: ['#3c4a28', '#7c8650', '#4a5a30', '#5e583a'],
    road: '#9a8a62', roadDark: '#6e5e40', shoulder: '#4a4030', rut: 'rgba(60,48,28,0.38)', pebble: '#6e6c5c',
    tuft: '#3c4c24', leaf: ['#4a6a2e', '#3a5a2a'], willow: '#5a7a3a', trunk: '#4a3a2a', deadwood: '#3e342a', moss: '#6a8a3a', rock: '#6e7064', rockMoss: '#5a7a32', bush: '#3e5a2a',
    flowers: ['#d8d0a0', '#a8c0d8'], roofs: ['#5a4a3a'], water: ['#2e4438', '#3e5a48', '#6a8a70'], shore: '#4a4430', fence: '#5a4a32', ruin: '#8c8a7c', mushroom: '#c8a040', reed: '#7a8a3a',
    trees: ['willow', 'dead', 'round', 'cypress', 'cypress'], grade: { tint: 'rgba(70,110,100,0.07)', vig: 0.48 },
  },
  ash: { // Chapter IV — the ash theme has its own painter passes in lib/deco.js (ash*), enabled by `ash: true`
    ash: true,
    ground: ['#4a4546', '#373334', '#5a5554', '#2d2a2c', '#66605c'], grain: ['#221f21', '#6c6662', '#38333a'],
    road: '#8e8274', roadDark: '#62574c', shoulder: '#1c1818', rut: 'rgba(28,20,16,0.3)', pebble: '#4a4240',
    tuft: '#6a5a46', leaf: ['#4a3a2e'], trunk: '#2a2220', deadwood: '#2a2220', rock: '#54504e', obsidian: '#1e1a24', ember: '#ff6a20', bush: '#3a2e28',
    flowers: ['#ff8a2a'], roofs: ['#4a3a3a'], water: ['#c8401a', '#ff8a2a', '#ffd06a'], lava: true, shore: '#1e1816', fence: '#4a3a30', ruin: '#8a8278',
    trees: ['dead', 'dead', 'spire', 'basalt'], grade: { tint: 'rgba(255,110,50,0.04)', vig: 0.3 },
  },
};

function smoothPts(pts, n = 12) { // catmull-rom densify
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function strokePts(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
function fillPts(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

export function paintMap(level, o = {}) {
  const M = level.map || {};
  const th = THEMES[M.theme || o.theme || 'meadow'];
  const seed = M.seed || 7;
  const N = makeNoise(seed), R = rngf(seed * 13 + 1);
  const scale = o.scale || 1;
  const cv = mk(Math.round(W * scale), Math.round(H * scale));
  const g = cv.getContext('2d');
  g.scale(scale, scale);
  setOL(1.7);

  // ---------- 1. ground ----------
  const lw = 300, lh = 169;
  const low = mk(lw, lh), lg2 = low.getContext('2d');
  const id = lg2.createImageData(lw, lh);
  const C0 = th.ground.map(hex);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const n1 = N.fbm(x / 38, y / 38, 4), n2 = N.fbm(x / 12 + 50, y / 12 + 50, 3);
    let c = lerp3(C0[0], C0[1], Math.min(1, Math.max(0, (n1 - 0.35) * 2.2)));
    c = lerp3(c, C0[2], Math.max(0, n2 - 0.55) * 1.8);
    c = lerp3(c, C0[3], Math.max(0, 0.42 - n2) * 1.6);
    const i = (y * lw + x) * 4; id.data[i] = c[0]; id.data[i + 1] = c[1]; id.data[i + 2] = c[2]; id.data[i + 3] = 255;
  }
  lg2.putImageData(id, 0, 0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(low, 0, 0, W, H);
  // painterly grain: short strokes
  for (let i = 0; i < 26000; i++) {
    const x = R() * W, y = R() * H;
    const n = N.fbm(x / 160, y / 160, 2);
    g.strokeStyle = alpha(th.grain[Math.floor(R() * th.grain.length)], 0.18 + n * 0.2);
    g.lineWidth = 1.1 + R() * 1.2;
    const a = -PI_2 + (R() - 0.5) * 0.8, l = 3 + R() * 5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  // soft light patches
  for (let i = 0; i < 40; i++) { const x = R() * W, y = R() * H, r = 80 + R() * 220; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, R() < 0.5 ? 'rgba(255,250,200,0.07)' : 'rgba(0,20,0,0.07)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }

  // ---------- 2. fields, dirt patches ----------
  for (const f of M.fields || []) {
    g.save();
    g.fillStyle = f.color || '#8a6a3a'; fillPts(g, f.pts);
    g.clip();
    const xs = f.pts.map(p => p[0]), ys = f.pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const crop = f.crop || 'wheat';
    for (let y = y0; y < y1; y += 11) {
      g.strokeStyle = crop === 'wheat' ? '#d8b456' : crop === 'cabbage' ? '#5a9a3a' : '#7a5a32'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y + (f.slant || 0)); g.stroke();
      g.strokeStyle = 'rgba(80,50,20,0.4)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, y + 4); g.lineTo(x1, y + 4 + (f.slant || 0)); g.stroke();
      if (crop === 'wheat') for (let x = x0; x < x1; x += 7) { g.strokeStyle = 'rgba(255,240,170,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x + 1, y - 5); g.stroke(); }
    }
    g.restore();
    g.strokeStyle = alpha(th.shoulder, 0.6); g.lineWidth = 3; g.beginPath(); f.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
  }
  for (const p of M.patches || []) { // dirt / snow / ash patches
    const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    gr.addColorStop(0, alpha(p.color || th.shoulder, p.a ?? 0.5)); gr.addColorStop(1, alpha(p.color || th.shoulder, 0));
    g.save(); g.translate(p.x, p.y); g.scale(1, 0.55); g.translate(-p.x, -p.y); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill(); g.restore();
  }
  if (th.ash) D.ashGround(g, { M, R, N, th, level, W, H }); // ash drifts, cracks, ember fissures, ground decals
  if (th.snow) D.snowGround(g, { M, R, N, th, level, W, H }); // snow: relief-shaded snowfield, first-snow earth, sastrugi, tracks

  // ---------- 3. water ----------
  const waterMask = mk(W / 4, H / 4), wm = waterMask.getContext('2d'); wm.scale(0.25, 0.25);
  const drawWater = (pathFn, fillFn) => {
    const [deep, mid, hi] = th.water;
    // shore
    g.save(); pathFn(g, 18, th.shore); g.restore();
    pathFn(g, 8, dark(th.shore, 0.15));
    fillFn(g, mid);
    fillFn(g, deep, 0.55);
  };
  for (const r of M.rivers || []) {
    if (th.ash) { const pts = smoothPts(r.pts); D.ashLavaRiver(g, pts, r, R, N); wm.lineCap = 'round'; wm.lineJoin = 'round'; wm.strokeStyle = '#fff'; wm.lineWidth = (r.w || 90) * 1.3 + 24; strokePts(wm, pts); continue; } // ash: molten river
    if (th.snow) { const pts = smoothPts(r.pts); D.snowRiver(g, pts, r, R, N); wm.lineCap = 'round'; wm.lineJoin = 'round'; wm.strokeStyle = '#fff'; wm.lineWidth = (r.w || 90) + 34; strokePts(wm, pts); continue; } // snow: frozen stream
    const pts = smoothPts(r.pts);
    const w = r.w || 90;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = th.shore; g.lineWidth = w + 26; strokePts(g, pts);
    g.strokeStyle = dark(th.shore, 0.12); g.lineWidth = w + 10; strokePts(g, pts);
    g.strokeStyle = th.water[1]; g.lineWidth = w; strokePts(g, pts);
    g.strokeStyle = th.water[0]; g.lineWidth = w * 0.55; strokePts(g, pts);
    if (th.lava) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,200,90,0.5)'; g.lineWidth = w * 0.25; strokePts(g, pts); g.restore(); }
    // highlights
    g.strokeStyle = alpha(th.water[2], th.lava ? 0.8 : 0.55); g.lineWidth = 2;
    for (let i = 0; i < pts.length - 1; i += 3) { if (R() < 0.45) { const [x, y] = pts[i]; const off = (R() - 0.5) * w * 0.6; g.beginPath(); g.moveTo(x - 12 + off, y + off * 0.3); g.lineTo(x + 12 + off, y + off * 0.3); g.stroke(); } }
    wm.lineCap = 'round'; wm.lineJoin = 'round'; wm.strokeStyle = '#fff'; wm.lineWidth = w + 24; strokePts(wm, pts);
  }
  for (const l of M.lakes || []) {
    if (th.ash) { const pts = smoothPts([...l.pts, l.pts[0]], 10); D.ashLavaLake(g, pts, l, R, N); wm.fillStyle = '#fff'; fillPts(wm, pts); wm.strokeStyle = '#fff'; wm.lineWidth = 40; strokePts(wm, pts); continue; } // ash: lava lake
    if (th.snow) { const pts = smoothPts([...l.pts, l.pts[0]], 10); D.snowLake(g, pts, l, R, N); wm.fillStyle = '#fff'; fillPts(wm, pts); wm.strokeStyle = '#fff'; wm.lineWidth = 36; strokePts(wm, pts); continue; } // snow: frozen lake
    const pts = smoothPts([...l.pts, l.pts[0]], 10);
    g.lineJoin = 'round';
    g.fillStyle = th.shore; g.strokeStyle = th.shore; g.lineWidth = 26; fillPts(g, pts); g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    g.fillStyle = th.water[1]; fillPts(g, pts);
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    g.save(); g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
    const gr = g.createRadialGradient(cx, cy, 10, cx, cy, 260); gr.addColorStop(0, th.water[0]); gr.addColorStop(1, alpha(th.water[0], 0)); g.fillStyle = gr; g.fillRect(cx - 400, cy - 300, 800, 600);
    if (th.ice) { g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.5; for (let i = 0; i < 20; i++) { const x = cx + (R() - 0.5) * 300, y = cy + (R() - 0.5) * 160; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 60, y + (R() - 0.5) * 30); g.stroke(); } }
    g.strokeStyle = alpha(th.water[2], 0.5); g.lineWidth = 2; for (let i = 0; i < 26; i++) { const x = cx + (R() - 0.5) * 340, y = cy + (R() - 0.5) * 180; g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + 10, y); g.stroke(); }
    g.restore();
    wm.fillStyle = '#fff'; fillPts(wm, pts); wm.strokeStyle = '#fff'; wm.lineWidth = 30; wm.beginPath(); pts.forEach(([x, y], i) => (i ? wm.lineTo(x, y) : wm.moveTo(x, y))); wm.closePath(); wm.stroke();
  }
  const SW = th.swamp ? D.swampWater(g, wm, { M, R, N, th, level, W, H, Path, smoothPts }) : null; // swamp: mossy ground, bog water, lily pads

  // ---------- 4. cliffs ----------
  for (const c of M.cliffs || []) {
    if (th.ash) { D.ashCliff(g, smoothPts(c.pts, 8), c, R, th); continue; } // ash: basalt column cliffs
    if (th.snow) { D.snowCliff(g, smoothPts(c.pts, 8), c, R, th); continue; } // snow: rock bands with snow caps & icicles
    const pts = smoothPts(c.pts, 8);
    const h = c.h || 34;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const face = poly([[x1, y1], [x2, y2], [x2, y2 + h], [x1, y1 + h]]);
      g.fillStyle = i % 2 ? (c.color || th.rock) : dark(c.color || th.rock, 0.04); g.fill(face);
    }
    g.strokeStyle = alpha('#1d130c', 0.35); g.lineWidth = 1.2;
    for (let i = 0; i < pts.length - 1; i += 2) { const [x, y] = pts[i]; g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x + (R() - 0.5) * 6, y + h - 4); g.stroke(); }
    const sh = g.createLinearGradient(0, 0, 0, 1);
    g.strokeStyle = '#1d130c'; g.lineWidth = 2; strokePts(g, pts); strokePts(g, pts.map(([x, y]) => [x, y + h]));
    g.strokeStyle = alpha(th.tuft, 0.9); g.lineWidth = 4; strokePts(g, pts.map(([x, y]) => [x, y - 1]));
    // shadow below cliff
    g.save(); g.globalAlpha = 0.18; g.strokeStyle = '#000'; g.lineWidth = 18; strokePts(g, pts.map(([x, y]) => [x, y + h + 9])); g.restore();
  }

  // ---------- 5. roads ----------
  const paths = (level.paths || []).filter(p => !p.air).map((p, i) => new Path(p.pts, { id: i, width: p.width ?? 26 }));
  const roadPolys = paths.map(p => { const pts = []; for (let i = 0; i < p.n; i += 2) pts.push([p.xs[i], p.ys[i]]); pts.push([p.xs[p.n - 1], p.ys[p.n - 1]]); return { pts, w: (p.width + 20) * 2 }; });
  for (const r of M.roads || []) roadPolys.push({ pts: smoothPts(r.pts), w: r.w || 60, deco: true });
  const road = mk(W, H), rg = road.getContext('2d');
  rg.lineCap = 'round'; rg.lineJoin = 'round';
  // shoulder (soft)
  for (const rp of roadPolys) {
    for (let k = 4; k >= 1; k--) { rg.strokeStyle = alpha(th.shoulder, 0.16); rg.lineWidth = rp.w + 10 + k * 8; strokePts(rg, rp.pts); }
  }
  g.drawImage(road, 0, 0);
  rg.clearRect(0, 0, W, H);
  for (const rp of roadPolys) { rg.strokeStyle = '#fff'; rg.lineWidth = rp.w; strokePts(rg, rp.pts); }
  // texture via source-in
  rg.globalCompositeOperation = 'source-in';
  rg.fillStyle = th.road; rg.fillRect(0, 0, W, H);
  rg.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 9000; i++) { const x = R() * W, y = R() * H; const n = N.fbm(x / 90, y / 90, 2); rg.fillStyle = n > 0.5 ? alpha(th.roadDark, 0.22) : alpha(light(th.road, 0.08), 0.25); rg.beginPath(); rg.ellipse(x, y, 3 + R() * 9, 2 + R() * 4, 0, 0, PI2); rg.fill(); }
  // ruts
  for (const rp of roadPolys) {
    if (rp.deco) continue;
    for (const off of [-12, 12]) {
      rg.strokeStyle = th.rut; rg.lineWidth = 3;
      rg.beginPath();
      for (let i = 0; i < rp.pts.length - 1; i++) {
        const [x1, y1] = rp.pts[i], [x2, y2] = rp.pts[i + 1];
        const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1;
        const nx = -dy / l, ny = dx / l;
        i ? rg.lineTo(x1 + nx * off, y1 + ny * off) : rg.moveTo(x1 + nx * off, y1 + ny * off);
      }
      rg.stroke();
    }
  }
  // pebbles
  for (let i = 0; i < 1600; i++) { const x = R() * W, y = R() * H; rg.fillStyle = alpha(th.pebble, 0.85); rg.beginPath(); rg.ellipse(x, y, 1.5 + R() * 2.5, 1 + R() * 1.6, 0, 0, PI2); rg.fill(); rg.strokeStyle = 'rgba(40,30,20,0.35)'; rg.lineWidth = 0.8; rg.stroke(); }
  // inner edge darkening
  rg.globalCompositeOperation = 'source-atop';
  for (const rp of roadPolys) { rg.strokeStyle = alpha(th.roadDark, 0.35); rg.lineWidth = 6; rg.save(); rg.globalCompositeOperation = 'source-atop'; rg.restore(); }
  rg.globalCompositeOperation = 'source-over';
  g.drawImage(road, 0, 0);
  // road edge outline & tufts
  for (const rp of roadPolys) {
    for (let i = 0; i < rp.pts.length - 1; i++) {
      const [x1, y1] = rp.pts[i], [x2, y2] = rp.pts[i + 1];
      const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l, ny = dx / l;
      for (const side of [-1, 1]) {
        if (R() < 0.35) {
          const ex = x1 + nx * side * (rp.w / 2 + 2), ey = y1 + ny * side * (rp.w / 2 + 2);
          D.grassTuft(g, ex, ey, 0.9 + R() * 0.5, R, th);
        }
      }
    }
  }

  if (th.ash) D.ashRoad(g, roadPolys, R, N, M); // ash: cinders, worn flagstones, edge stones
  if (SW) D.swampRoad(g, roadPolys, SW); // swamp: raised causeways with posts & ropes, or flagstones and quay walls
  if (th.snow) D.snowRoad(g, roadPolys, R, N, M); // snow: trodden slush, wheel ruts, ploughed snowbanks
  // ---------- 6. bridges ----------
  for (const b of M.bridges || []) {
    if (th.ash) { D.ashBridge(g, b, R); continue; } // ash: basalt bridge
    if (th.snow) { D.snowBridge(g, b, R); continue; } // snow: snowy timber bridge
    g.save(); g.translate(b.x, b.y); g.rotate(b.ang || 0);
    const len = b.len || 150, bw = b.w || 96;
    D.shadowBlob(g, 0, bw * 0.55, len * 0.5, 14, 0.35);
    toon(g, rrect(-len / 2, -bw / 2, len, bw, 6), '#9a6a3a', { sd: 3, hd: 1.4, lw: 2, detail: c => { c.strokeStyle = 'rgba(50,25,10,0.5)'; c.lineWidth = 1.4; for (let x = -len / 2 + 9; x < len / 2; x += 11) { c.beginPath(); c.moveTo(x, -bw / 2); c.lineTo(x + 1, bw / 2); c.stroke(); } } });
    for (const sy of [-1, 1]) { toon(g, rrect(-len / 2 - 4, sy * bw / 2 - 5, len + 8, 8, 3), '#7a4a24', { sd: 1, hd: 0.6, lw: 1.6 }); for (let x = -len / 2; x <= len / 2; x += len / 5) toon(g, rrect(x - 3, sy * bw / 2 - 12, 6, 14, 2), '#6b4423', { sd: 0.6, hd: 0.3, lw: 1.3 }); }
    g.restore();
  }

  // ---------- 7. occupancy for scatter ----------
  const occ = mk(W / 4, H / 4), og = occ.getContext('2d'); og.scale(0.25, 0.25);
  og.lineCap = 'round'; og.lineJoin = 'round'; og.strokeStyle = '#fff'; og.fillStyle = '#fff';
  for (const rp of roadPolys) { og.lineWidth = rp.w + (rp.deco ? 40 : 90); strokePts(og, rp.pts); }
  for (const p of level.plots || []) { og.beginPath(); og.ellipse(p[0], p[1] - 10, 96, 84, 0, 0, PI2); og.fill(); }
  if (level.hero) { og.beginPath(); og.arc(level.hero[0], level.hero[1], 40, 0, PI2); og.fill(); }
  og.drawImage(waterMask, 0, 0, W, H);
  for (const c of M.clear || []) { og.beginPath(); og.ellipse(c.x, c.y, c.r, c.r * (c.ry || 0.7), 0, 0, PI2); og.fill(); }
  for (const b of M.bridges || []) { og.beginPath(); og.arc(b.x, b.y, (b.len || 150) * 0.6, 0, PI2); og.fill(); }
  for (const f of M.fields || []) fillPts(og, f.pts);
  const CLEAR_R = { house: 95, barn: 110, well: 45, tent: 60, walltower: 80, gate: 120, statue: 45, pillar: 35, arch: 85, crates: 35, cart: 50, haystack: 35, campfire: 35, sign: 25, banner: 25, log: 35, stump: 25, lavavent: 30 };
  if (th.ash) { Object.assign(CLEAR_R, D.ASH_CLEAR); D.ashOccupy(og, M); } // ash: footprints of ash structures & decals
  if (SW) Object.assign(CLEAR_R, D.SWAMP_CLEAR); // swamp: footprints of sunken ruins & marsh structures
  if (th.snow) { Object.assign(CLEAR_R, D.SNOW_CLEAR); D.snowOccupy(og, M); } // snow: footprints of snow structures & decals
  for (const d of M.deco || []) {
    if (d.t === 'wall') { og.beginPath(); og.moveTo(d.x1, d.y1 + 30); og.lineTo(d.x2, d.y2 + 30); og.lineTo(d.x2, d.y2 - (d.h || 90) - 40); og.lineTo(d.x1, d.y1 - (d.h || 90) - 40); og.closePath(); og.fill(); continue; }
    if (d.t === 'fence') { og.lineWidth = 30; og.beginPath(); og.moveTo(d.x1, d.y1); og.lineTo(d.x2, d.y2); og.stroke(); continue; }
    const r = (CLEAR_R[d.t] || 30) * (d.s || 1);
    og.beginPath(); og.ellipse(d.x, d.y - r * 0.35, r, r * 0.85, 0, 0, PI2); og.fill();
  }
  for (const pr of level.props || []) { og.beginPath(); og.ellipse(pr.x, pr.y - 20, pr.type === 'windmill' ? 80 : 40, pr.type === 'windmill' ? 90 : 34, 0, 0, PI2); og.fill(); }
  const occData = og.getImageData(0, 0, W / 4, H / 4).data;
  const free = (x, y) => { const xi = Math.floor(x / 4), yi = Math.floor(y / 4); if (xi < 0 || yi < 0 || xi >= W / 4 || yi >= H / 4) return true; return occData[(yi * (W / 4) + xi) * 4] < 128; };
  const markUsed = (x, y, r) => { og.beginPath(); og.arc(x, y, r, 0, PI2); og.fill(); };

  // ---------- 8. decorations ----------
  const items = [];
  const add = (t, x, y, s = 1, extra) => items.push({ t, x, y, s, extra });
  for (const d of M.deco || []) add(d.t, d.x, d.y, d.s || 1, d);
  // fences (drawn as items sorted by y of midpoint)
  const dens = Object.assign({ tree: 1, rock: 1, bush: 1, flower: 1, tuft: 1, border: 1 }, M.density || {});
  // border forest: dense trees beyond the playable frame
  const inPlay = (x, y, m = 0) => x > PX - m && x < PX + PW + m && y > PY - m && y < PY + PH + m;
  const treeKinds = th.trees;
  let attempts = 0;
  const placed = [];
  const okSpacing = (x, y, r) => { for (const p of placed) { if (Math.abs(p[0] - x) < r && Math.abs(p[1] - y) < r * 0.7) return false; } return true; };
  // forests from noise clusters + border
  for (let i = 0; i < 2600 * dens.tree; i++) {
    const x = R() * W, y = R() * (H + 60) - 20;
    const border = !inPlay(x, y, -10);
    const n = N.fbm(x / 260 + 10, y / 260 + 10, 3);
    const want = border ? (0.75 * dens.border) : (n > 0.6 ? 0.28 : n > 0.52 ? 0.07 : 0.01) * dens.tree;
    if (R() > want) continue;
    if (!free(x, y) || !free(x, y - 30) || !free(x, y - 60) || !free(x - 20, y - 40) || !free(x + 20, y - 40)) continue;
    if (!okSpacing(x, y, border ? 36 : 44)) continue;
    placed.push([x, y]);
    const kind = treeKinds[Math.floor(R() * treeKinds.length)];
    add('tree_' + kind, x, y, 0.85 + R() * 0.45);
  }
  for (let i = 0; i < 900 * dens.bush; i++) { const x = R() * W, y = R() * H; if (!free(x, y) || !okSpacing(x, y, 26)) continue; placed.push([x, y]); add('bush', x, y, 0.8 + R() * 0.5); if (i > 260 * dens.bush) break; }
  for (let i = 0; i < 700; i++) { const x = R() * W, y = R() * H; if (R() > 0.3 * dens.rock || !free(x, y) || !okSpacing(x, y, 24)) continue; placed.push([x, y]); add('rock', x, y, 0.6 + R() * 0.7); }
  for (let i = 0; i < 600; i++) { const x = R() * W, y = R() * H; if (R() > 0.4 * dens.flower || !free(x, y)) continue; add(th.lava ? 'ember' : th.snowy ? 'tuft' : 'flowers', x, y, 0.8 + R() * 0.4); }
  for (let i = 0; i < 1400 * dens.tuft; i++) { const x = R() * W, y = R() * H; if (!free(x, y)) continue; add('tuft', x, y, 0.7 + R() * 0.6); }
  if (SW) D.swampScatter({ add, free, okSpacing, placed, inPlay, R, N, M, W, H, SW }); // swamp: shore reeds, drowned snags, cypress, reed beds, fungi
  if (th.ash) D.ashScatter({ add, free, okSpacing, placed, inPlay, R, N, M, W, H }); // ash: shards, bones, vents, cinder mounds
  if (th.snow) D.snowScatter({ add, free, okSpacing, placed, inPlay, R, N, M, W, H }); // snow: boulders, drifts, stumps, ice crystals

  items.sort((a, b) => a.y - b.y);
  const DR = rngf(seed * 7 + 3);
  for (const it of items) {
    const { t, x, y, s } = it;
    if (th.ash && D.ashDeco(g, it, DR, th)) continue; // ash: restyled scatter + ash structures (t: 'ash*')
    if (SW && D.swampDeco(g, it, DR, th, SW)) continue; // swamp: marsh trees & reeds, sunken ruins and structures (t: 'swamp*')
    if (th.snow && D.snowDeco(g, it, DR, th)) continue; // snow: snow-laden trees & scatter, snow structures (t: 'snow*')
    switch (t) {
      case 'tree_round': D.treeRound(g, x, y, s, DR, th); break;
      case 'tree_pine': D.treePine(g, x, y, s, DR, th); break;
      case 'tree_dead': D.treeDead(g, x, y, s, DR, th); break;
      case 'tree_willow': D.treeWillow(g, x, y, s, DR, th); break;
      case 'tree_crystal': case 'crystal': D.crystalRock(g, x, y, s, DR, th); break;
      case 'bush': D.bush(g, x, y, s, DR, th); break;
      case 'rock': D.rock(g, x, y, s, DR, th); break;
      case 'flowers': D.flowers(g, x, y, s, DR, th); break;
      case 'tuft': D.grassTuft(g, x, y, s, DR, th); break;
      case 'reeds': D.reeds(g, x, y, s, DR, th); break;
      case 'mushroom': D.mushroom(g, x, y, s, DR, th); break;
      case 'lily': D.lily(g, x, y, s, DR); break;
      case 'stump': D.stump(g, x, y, s, DR, th); break;
      case 'log': D.log(g, x, y, s, DR, th); break;
      case 'bones': D.bones(g, x, y, s, DR); break;
      case 'iceshard': D.iceShard(g, x, y, s, DR); break;
      case 'ember': { g.save(); g.globalCompositeOperation = 'lighter'; D.shadowBlob(g, x, y, 1, 1, 0); g.fillStyle = 'rgba(255,120,40,0.5)'; g.beginPath(); g.arc(x, y, 1.6 * s, 0, PI2); g.fill(); g.restore(); break; }
      case 'house': D.cottage(g, x, y, s, DR, th); break;
      case 'barn': D.barn(g, x, y, s, DR, th); break;
      case 'well': D.well(g, x, y, s, DR, th); break;
      case 'haystack': D.haystack(g, x, y, s); break;
      case 'cart': D.cart(g, x, y, s); break;
      case 'crates': D.crateStack(g, x, y, s); break;
      case 'pillar': D.ruinPillar(g, x, y, s, DR, th); break;
      case 'arch': D.ruinArch(g, x, y, s, DR, th); break;
      case 'statue': D.statue(g, x, y, s, DR, th); break;
      case 'tent': D.tent(g, x, y, s, DR, th); break;
      case 'campfire': D.campfire(g, x, y, s); break;
      case 'sign': D.signpost(g, x, y, s); break;
      case 'banner': D.banners(g, x, y, s, it.extra.color || '#c0392b'); break;
      case 'lavavent': D.lavaVent(g, x, y, s, DR); break;
      case 'fence': D.fence(g, it.extra.x1, it.extra.y1, it.extra.x2, it.extra.y2, s, th); break;
      case 'wall': D.rampartWall(g, it.extra.x1, it.extra.y1, it.extra.x2, it.extra.y2, it.extra); break;
      case 'walltower': D.wallTower(g, x, y, s, it.extra); break;
      case 'gate': D.gateArch(g, x, y, s, it.extra); break;
    }
  }

  if (th.ash) D.ashAtmosphere(g, { M, R, N, th, level, W, H }); // ash: lava light, smoke, embers, falling ash
  if (SW) D.swampAtmosphere(g, { M, R, N, th, level, W, H, SW }); // swamp: mist banks, fireflies, will-o'-wisps
  if (th.snow) D.snowAtmosphere(g, { M, R, N, th, level, W, H }); // snow: chimney smoke, warm light, mist, falling snow, cold vignette
  // ---------- 9. grading & vignette ----------
  if (th.grade) {
    g.fillStyle = th.grade.tint; g.fillRect(0, 0, W, H);
    const gr = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${th.grade.vig})`);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  return cv;
}
const PI2 = Math.PI * 2, PI_2 = Math.PI / 2;
