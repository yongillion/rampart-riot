// Rampart Riot — title background (2400x1350): dusk over the Rampart, the Ash lands burning beyond it.
// The sky is painted per pixel, the land is ray-cast from a heightfield (so the wall can snake over real hills in
// perspective), the wall/towers/trees are vector geometry clipped against the terrain, and the foreground knoll
// with the Warden's watchtower is painted on top. Embers/flicker are added by the game at runtime.
import { makeNoise, rngf } from '../maps/lib/noise.js';
import { mk, clamp, lerp, sstep, rgb, mix3, css, ramp, glowAt, bloom, grain, half, PI, TAU } from './kit.js';

const W = 2400, H = 1350;
const CAM = { f: 1700, cx: 1200, hy: 700, y: 58 };
const N = makeNoise(2024), N2 = makeNoise(77), N3 = makeNoise(9);
const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const P3 = (x, y, z) => [CAM.cx + CAM.f * x / z, CAM.hy - CAM.f * (y - CAM.y) / z];

// ---------------- the wall's course (camera space: x right, z forward, y up) ----------------
const WALL_CP = [[140, 210], [220, 162], [300, 124], [420, 89], [560, 82], [700, 132], [900, 79], [1150, -68], [1450, -119], [1800, -53], [2300, -298], [3000, -600], [4200, -988], [6000, -1518], [9000, -2382]];
const CREST_CP = [[140, 6], [220, 8], [300, 16], [420, 34], [560, 22], [700, 6], [900, 28], [1150, 12], [1450, 44], [1800, 18], [2300, 50], [3000, 34], [4200, 80], [6000, 140], [9000, 220]];
const ROAD_CP = [[30, -30], [120, -50], [260, -26], [420, -70], [600, -64], [760, -30], [880, 40], [960, 70]];
function interp(cp, z) { // cubic Hermite through [z, v] control points
  let i = 0; while (i < cp.length - 2 && cp[i + 1][0] < z) i++;
  const p0 = cp[Math.max(0, i - 1)], p1 = cp[i], p2 = cp[i + 1], p3 = cp[Math.min(cp.length - 1, i + 2)];
  const t = clamp((z - p1[0]) / (p2[0] - p1[0])), t2 = t * t, t3 = t2 * t, dz = p2[0] - p1[0];
  const m1 = (p2[1] - p0[1]) / ((p2[0] - p0[0]) || 1) * dz, m2 = (p3[1] - p1[1]) / ((p3[0] - p1[0]) || 1) * dz;
  return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2;
}
const wallX = z => interp(WALL_CP, z), crest = z => interp(CREST_CP, z), roadX = z => interp(ROAD_CP, z);
const GATE_Z = 930;

// ---------------- terrain heightfield ----------------
function rolling(x, z) { return 28 * (N.fbm(x / 560 + 3.1, z / 560 + 1.7, 4) - 0.5) * 2 + 11 * (N.fbm(x / 210 + 9.3, z / 210 + 4.4, 3) - 0.5) * 2; }
function ridgedN(x, z, oct) { let a = 1, f = 1, s = 0, nrm = 0, prev = 1; for (let i = 0; i < oct; i++) { let r = 1 - Math.abs(N2.perlin(x * f, z * f) * 2 - 1); r *= r; s += r * a * (0.5 + prev * 0.5); prev = r; nrm += a; a *= 0.5; f *= 2.05; } return s / nrm; }
const CRATER = { x: 7600, z: 16500 };
function mountains(x, z) {
  if (z < 4000) return 0;
  const side = x - wallX(z);
  const north = sstep(5000, 11000, z) * sstep(1500, -2500, side);   // Frostbound peaks (north = left/centre)
  const east = sstep(6000, 12000, z) * sstep(1500, 6000, side);      // volcanic ranges beyond the wall
  let h = 0;
  if (north > 0) h = north * (250 + 1500 * ridgedN(x / 4200 + 3, z / 4200 + 1, 6));
  if (east > 0) h = Math.max(h, east * (80 + 800 * ridgedN(x / 3000 + 9, z / 3000 + 4, 5) ** 1.4));
  const dc = Math.hypot(x - CRATER.x, z - CRATER.z);
  return Math.max(h, 900 * Math.exp(-((dc / 3400) ** 2)) - 330 * Math.exp(-((dc / 650) ** 2)));
}
function T(x, z) {
  const d = x - wallX(z), rw = 60 + z * 0.035;
  const m = Math.exp(-(d * d) / (rw * rw));
  let h = rolling(x, z) * (1 - m) + crest(z) * m;
  h += (1 - m) * 4 * (N.fbm(x / 60, z / 60, 2) - 0.5) * 2;
  if (d > 0) h -= sstep(0, 500 + z * 0.1, d) * 20;   // the Ash side sinks into plains
  if (z < 1000) { const rd = x - roadX(z); h -= 1.2 * Math.exp(-(rd * rd) / 40); } // the road is a worn groove
  return h + mountains(x, z);
}

// ---------------- sky (per pixel, half resolution) ----------------
const SKY_R = ramp([[0, '#04071a'], [0.25, '#0a0f2e'], [0.47, '#1b1a44'], [0.64, '#36285a'], [0.8, '#6a3456'], [0.91, '#a8443e'], [1.0, '#e2683a']]);
const SKY_L = ramp([[0, '#04071a'], [0.3, '#0a1232'], [0.55, '#172152'], [0.74, '#2c3a6c'], [0.88, '#4c5682'], [1.0, '#76789a']]);
const SUN = [2000, 735]; // the ember glow behind the eastern horizon
function skyBase(X, Y) {
  const t = clamp(Y / CAM.hy, 0, 1.05);
  const c = mix3(SKY_L(t), SKY_R(t), sstep(350, 2000, X));
  const e = Math.exp(-(((X - SUN[0]) / 620) ** 2)) * Math.exp(-Math.max(0, CAM.hy - Y) / 150);
  return [c[0] + 140 * e, c[1] + 66 * e, c[2] + 22 * e];
}
function cloudD(X, Y) {
  const wx = (N2.fbm(X / 1000 + 4, Y / 260 + 2, 3) - 0.5) * 520, wy = (N2.fbm(X / 1000 + 9, Y / 260 + 7, 3) - 0.5) * 140;
  const n = N.fbm((X + wx) / 760 + 20, (Y + wy) / 120 + 20, 5);
  const band = sstep(330, 470, Y) * (1 - sstep(615, 690, Y)) * (0.75 + 0.35 * sstep(1300, 2200, X));
  const hi = sstep(40, 110, Y) * (1 - sstep(190, 270, Y)) * 0.6;
  const calm = 1 - 0.6 * Math.exp(-(((X - 1200) / 700) ** 2) - (((Y - 300) / 230) ** 2)); // keep the logo area quiet
  return clamp((n - 0.445) * 3.1) * Math.max(band, hi) * calm;
}
const PILLAR_X = CAM.cx + CAM.f * CRATER.x / CRATER.z;
function paintSky() {
  const s = 2, w = W / s, h = H / s;
  const cv = mk(w, h), g = cv.getContext('2d'), id = g.createImageData(w, h), d = id.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const X = x * s + 1, Y = y * s + 1;
    let c = skyBase(X, Y);
    const den = cloudD(X, Y);
    if (den > 0.002) { // clouds lit from below by the ember glow
      const lx = SUN[0] - X, ly = SUN[1] - Y, ll = Math.hypot(lx, ly) || 1;
      let occ = 0; for (let k = 1; k <= 4; k++) occ += cloudD(X + lx / ll * k * 22, Y + ly / ll * k * 22);
      const lit = Math.exp(-occ * 1.6);
      const warm = Math.exp(-(((X - SUN[0]) / 900) ** 2)) * sstep(150, 560, Y);
      const dark = mix3(rgb('#110e24'), rgb('#271a36'), sstep(200, 600, Y));
      const litC = mix3(mix3(rgb('#6c5a86'), rgb('#c07890'), sstep(250, 620, Y)), mix3(rgb('#ff8a48'), rgb('#ffc070'), sstep(400, 640, Y)), warm);
      c = mix3(c, mix3(dark, litC, lit * (0.35 + 0.65 * sstep(150, 600, Y))), clamp(den * 1.3));
    }
    const py = CAM.hy - 40 - Y; // faint pillar of light rising from the crater
    if (py > 0) {
      const bw = 8 + py * 0.045, dx = (X - PILLAR_X - py * 0.02) / bw;
      const p = Math.exp(-dx * dx) * Math.exp(-py / 200) * 0.5 + Math.exp(-dx * dx * 0.07) * Math.exp(-py / 140) * 0.1;
      c = [c[0] + 255 * p, c[1] + 185 * p, c[2] + 105 * p];
    }
    const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  const out = mk(W, H), og = out.getContext('2d');
  og.imageSmoothingQuality = 'high'; og.drawImage(cv, 0, 0, W, H);
  return out;
}
function stars(g, R) {
  for (let i = 0; i < 1100; i++) {
    const x = R() * W, y = Math.pow(R(), 1.5) * 580;
    const den = cloudD(x, y); if (den > 0.12) continue;
    const b = (0.2 + R() * 0.8) * (1 - sstep(260, 580, y)) * (1 - den * 6);
    if (b <= 0.05) continue;
    const r = R() < 0.035 ? 1.5 : 0.55 + R() * 0.65;
    g.fillStyle = `rgba(${215 + R() * 40},${222 + R() * 33},255,${b})`;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    if (r > 1.4) glowAt(g, x, y, 8, [200, 210, 255], b * 0.45);
  }
}

// ---------------- terrain ray-cast (supersampled) ----------------
const L_EMBER = norm([0.6, 0.3, 1]), L_DUSK = norm([-0.6, 0.45, -0.65]);
function shadeTerrain(x, z, th, Ys) {
  const e = Math.max(0.6, z * 0.0035);
  const hx = (T(x + e, z) - th) / e, hz = (T(x, z + e) - th) / e;
  const n = norm([-hx, 1, -hz]);
  const side = x - wallX(z), ash = side > 0;
  const Xs = CAM.cx + CAM.f * x / z;
  const back = 0.3 + 0.7 * sstep(300, 2100, Xs);
  const d1 = Math.max(0, dot(n, L_EMBER)) * back, d3 = Math.max(0, dot(n, L_DUSK));
  let alb;
  if (th > 160) { // mountains: snow & rock (north) or basalt (east)
    const snow = !ash && th > 420 + 260 * N.fbm(x / 500, z / 500, 3) && n[1] > 0.55;
    alb = ash ? [0.11, 0.08, 0.08] : snow ? [0.6, 0.6, 0.7] : [0.19, 0.18, 0.23];
  } else if (ash) alb = [0.11, 0.09, 0.085];
  else alb = mix3([0.085, 0.13, 0.11], [0.12, 0.14, 0.09], N.fbm(x / 300, z / 300, 2));
  if (!ash && z < 1000) { const rd = Math.abs(x - roadX(z)); if (rd < 3.2 + z * 0.002) alb = [0.2, 0.17, 0.15]; }
  let c = [
    255 * (alb[0] * (0.3 + 1.6 * d1 + 0.6 * d3) + 0.012),
    255 * (alb[1] * (0.32 + 0.6 * d1 + 0.52 * d3) + 0.015),
    255 * (alb[2] * (0.55 + 0.2 * d1 + 0.85 * d3) + 0.035)];
  const fg = 0.4 + 0.6 * sstep(30, 520, z); // keep the foreground dark
  c = [c[0] * fg, c[1] * fg, c[2] * fg];
  if (ash) { // lava rivers & glowing cracks
    const wx = (N3.fbm(x / 900, z / 900, 2) - 0.5) * 700;
    const rv = Math.abs(N2.fbm((x + wx) / 420, z / 420, 3) - 0.5), rw = 0.012 + z * 0.0000008;
    const cr = Math.abs(N3.fbm(x / 70, z / 70, 2) - 0.5), cw = 0.012;
    const k = (th > 160 ? 0.5 : 1) * sstep(0, 60, side);
    if (rv < rw * 3) c = mix3(c, [200, 60, 20], (1 - rv / (rw * 3)) * 0.35 * k);
    if (rv < rw) c = mix3(c, [255, 160, 60], (1 - rv / rw) * 0.95 * k);
    if (cr < cw) c = mix3(c, [240, 90, 30], (1 - cr / cw) * 0.55 * k * sstep(0.45, 0.6, N.fbm(x / 400, z / 400, 2)));
  }
  const dc = Math.hypot(x - CRATER.x, z - CRATER.z); // crater mouth glow
  if (dc < 1300) c = mix3(c, [255, 175, 85], clamp(1 - dc / 1300) ** 2);
  // haze toward the sky colour behind + low valley mist
  let fogc = skyBase(Xs, Math.min(Ys, CAM.hy + 4));
  if (ash) fogc = mix3(fogc, [70, 26, 24], 0.5 * (1 - sstep(3000, 14000, z)));
  const fa = 1 - Math.exp(-z / 5600);
  const mist = ash ? 0 : clamp((24 - th) / 26) * 0.55 * sstep(140, 900, z) * (1 - sstep(5000, 9000, z));
  const mistC = mix3([fogc[0] * 1.05 + 12, fogc[1] * 1.05 + 12, fogc[2] * 1.1 + 18], [120, 112, 150], 0.3);
  return mix3(mix3(c, fogc, fa), mistC, mist);
}
function renderTerrain(SS) {
  const w = W * SS, h = H * SS;
  const f = CAM.f * SS, cx = CAM.cx * SS, hy = CAM.hy * SS;
  const buf = new Uint8ClampedArray(w * h * 4), dep = new Float32Array(w * h);
  const BINS = []; for (let z = 40; z < 30000; z *= 1.04) BINS.push(z);
  const occ = new Float32Array(BINS.length * W); // per bin & 1x column: top of the terrain nearer than the bin depth
  const zFar = 30000;
  for (let X = 0; X < w; X++) {
    const dx = (X + 0.5 - cx) / f, col = (X / SS) | 0;
    let ymin = h, z = 16, k = 0, lastC = null;
    while (z < zFar) {
      while (k < BINS.length && BINS[k] <= z) { if (X % SS === 0) occ[k * W + col] = ymin / SS; k++; }
      const x = dx * z, th = T(x, z);
      const Y = hy - f * (th - CAM.y) / z;
      if (Y < ymin) {
        const c = shadeTerrain(x, z, th, Y / SS);
        const y0 = Math.max(0, Math.ceil(Y)), y1 = Math.min(h, Math.ceil(ymin)), span = Math.max(1, y1 - y0);
        for (let y = y0; y < y1; y++) {
          const cc = lastC ? mix3(c, lastC, ((y - y0) / span) * 0.5) : c;
          const i = (y * w + X) * 4; buf[i] = cc[0]; buf[i + 1] = cc[1]; buf[i + 2] = cc[2]; buf[i + 3] = 255; dep[y * w + X] = z;
        }
        lastC = c; ymin = Y;
        if (ymin <= 0) break;
      }
      z += Math.max(0.25, z * 0.0028);
    }
    while (k < BINS.length) { if (X % SS === 0) occ[k * W + col] = ymin / SS; k++; }
  }
  // warm rim light on silhouettes (sky or much farther ground right above)
  for (let X = 0; X < w; X++) {
    const Xs = X / SS;
    let prevZ = 1e9;
    for (let y = 0; y < h; y++) {
      const z = dep[y * w + X];
      if (z > 0 && prevZ > z * 1.3 + 30) {
        const sky = skyBase(Xs, y / SS - 4), lum = (sky[0] * 0.5 + sky[1] * 0.4 + sky[2] * 0.1) / 255;
        const amt = clamp(lum * 1.5) * (0.4 + 0.6 * sstep(400, 2000, Xs)) * (0.3 + 0.7 * Math.exp(-z / 9000)) * (z < 3000 ? 0.75 : 1);
        const R = 3 * SS;
        for (let k = 0; k < R && y + k < h; k++) {
          const i = ((y + k) * w + X) * 4, a = amt * (1 - k / R) ** 1.5;
          buf[i] += (255 - buf[i]) * a * 0.7; buf[i + 1] += (150 - buf[i + 1]) * a * 0.5; buf[i + 2] += (90 - buf[i + 2]) * a * 0.22;
        }
      }
      prevZ = z > 0 ? z : 1e9;
    }
  }
  // 1x depth map (nearest of each block) for later skyline tests
  const dep1 = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let m = 0; for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) { const v = dep[(y * SS + j) * w + x * SS + i]; if (v > 0 && (m === 0 || v < m)) m = v; } dep1[y * W + x] = m; }
  let px = buf, pw = w, ph = h;
  while (pw > W) { px = half(px, pw, ph); pw >>= 1; ph >>= 1; }
  const cv = mk(W, H); cv.getContext('2d').putImageData(new ImageData(px, W, H), 0, 0);
  return { cv, occ, BINS, dep1 };
}

// ---------------- the Rampart, trees and a village as depth-sorted vector elements ----------------
const WALL = { thick: 10, h: 34, tower: 18, towerH: 54, every: 122 };
let LIT_TOWERS = [];
function fogOf(X, Y, z) { return { c: skyBase(clamp(X, 0, W), Math.min(Y, CAM.hy + 4)), a: clamp(1 - Math.exp(-z / 5600)) }; }
const fogMix = (c, f) => mix3(c, f.c, f.a);
const STONE = [0.35, 0.36, 0.44];
function litStone(nx, nz, base = STONE, bright = 1) { // horizontal face normal -> colour (dusk fill + ember back light)
  const d3 = Math.max(0, nx * L_DUSK[0] + nz * L_DUSK[2]) / Math.hypot(L_DUSK[0], L_DUSK[2]);
  const d1 = Math.max(0, nx * L_EMBER[0] + nz * L_EMBER[2]) / Math.hypot(L_EMBER[0], L_EMBER[2]);
  return [255 * base[0] * (0.2 + 0.26 * d3 + 1.5 * d1) * bright, 255 * base[1] * (0.22 + 0.34 * d3 + 0.62 * d1) * bright, 255 * base[2] * (0.34 + 0.56 * d3 + 0.25 * d1) * bright];
}
function polyFill(g, pts, fill) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = fill; g.fill(); }
function rimAmt(X, Y) { const sky = skyBase(clamp(X, 0, W), Math.min(Y, CAM.hy)); const lum = (sky[0] * 0.6 + sky[1] * 0.3 + sky[2] * 0.1) / 255; return clamp(lum * 1.4 - 0.1) * (0.4 + 0.6 * sstep(500, 2100, X)) * 0.85; }
function wallSamples() {
  const pts = []; let z = 130, s = 0, px = wallX(z), pz = z;
  while (z < 9500) { const x = wallX(z); s += Math.hypot(x - px, z - pz); pts.push({ x, z, s, y: T(x, z) }); px = x; pz = z; z += Math.max(0.4, z * 0.003); }
  return pts;
}
function atS(pts, s) { // centreline at arc length s
  let lo = 0, hi = pts.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].s < s) lo = m; else hi = m; }
  const a = pts[lo], b = pts[hi], t = clamp((s - a.s) / ((b.s - a.s) || 1));
  const ux = b.x - a.x, uz = b.z - a.z, l = Math.hypot(ux, uz) || 1;
  return { x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t), y: lerp(a.y, b.y, t), ux: ux / l, uz: uz / l };
}
function buildElements(R) {
  const els = [];
  const pts = wallSamples(), Lw = pts[pts.length - 1].s;
  const hw = WALL.thick / 2;
  let gateS = 0; for (const p of pts) if (p.z <= GATE_Z) gateS = p.s;
  const towers = [{ s: gateS, gate: true }];
  for (let s = 60; s < Lw - 50; s += WALL.every * (0.85 + R() * 0.3)) if (Math.abs(s - gateS) > WALL.every * 0.6) towers.push({ s });
  let s = 0;
  while (s < Lw - 1) {
    const a = atS(pts, s), len = Math.max(1.6, a.z * 0.006), b = atS(pts, Math.min(Lw, s + len));
    els.push({ z: (a.z + b.z) / 2, zmin: Math.min(a.z, b.z) - hw, kind: 'seg', seg: { a, b, nx: a.uz, nz: -a.ux, s0: s, s1: s + len } });
    s += len;
  }
  for (const t of towers) { const c = atS(pts, t.s); t.lit = t.gate || c.z < 3200 || R() < 0.55; els.push({ z: c.z + 0.5, zmin: c.z - WALL.tower * 0.75, kind: 'tower', c, s: t.s, gate: t.gate, lit: t.lit }); }
  LIT_TOWERS = towers.filter(t => t.lit).map(t => t.s);
  for (let st = 40; st < Lw; st += 37 + R() * 30) { // patrol torches on the walkway
    const c = atS(pts, st); if (c.z > 1300) break;
    if (towers.some(t => Math.abs(t.s - st) < WALL.tower)) continue;
    els.push({ z: c.z - 0.2, zmin: c.z - WALL.thick / 2, kind: 'ptorch', c });
  }
  for (let sm = 2; sm < Lw; sm += 4.2) { // merlons on both parapets (near part only)
    const c = atS(pts, sm); if (c.z > 1900) break;
    if (towers.some(t => Math.abs(t.s - sm) < WALL.tower * 0.62)) continue;
    for (const side of [1, -1]) els.push({ z: c.z - side * 0.01, zmin: c.z - hw, kind: 'merlon', c, side });
  }
  for (let i = 0; i < 30000; i++) { // woods on the realm side
    const z = 90 * Math.pow(3000 / 90, R()), X = R() * (W + 200) - 100;
    const x = (X - CAM.cx) * z / CAM.f;
    const side = x - wallX(z); if (side > -26) continue;
    const dens = N3.fbm(x / 240 + 40, z / 240 + 40, 3);
    if (R() > (dens > 0.57 ? 0.55 : dens > 0.52 ? 0.12 : 0.004)) continue;
    if (z < 1000 && Math.abs(x - roadX(z)) < 10) continue;
    if (Math.hypot(x + 70, z - 690) < 70) continue; // village clearing
    const y = T(x, z); if (y > 150) continue;
    els.push({ z, zmin: z - 2, kind: 'tree', x, y, h: 8 + R() * 7, r: R(), round: R() < 0.3 });
  }
  for (const [dx, dz, k] of [[0, 0, 0], [16, 22, 1], [-20, 30, 2], [34, -6, 3], [-8, 52, 4], [26, 46, 5], [-36, 4, 6], [6, 74, 7]]) {
    const x = -70 + dx, z = 690 + dz; els.push({ z, zmin: z - 6, kind: 'house', x, y: T(x, z), k });
  }
  return els;
}
// a contiguous run of wall segments drawn as single polygons (no seams between segments)
function drawRun(g, run, allSegs) {
  const hw = WALL.thick / 2, H = WALL.h;
  const list = run.segs.map(e => e.seg);
  const next = allSegs[run.segs[run.segs.length - 1].idx + 1]; // overlap one segment into the farther run
  if (next) list.push(next.seg);
  const P = [list[0].a, ...list.map(sg => sg.b)];
  const nxs = [list[0].nx, ...list.map(sg => sg.nx)], nzs = [list[0].nz, ...list.map(sg => sg.nz)];
  const zc = run.z, sc = CAM.f / zc;
  const at = (i, side, y) => P3(P[i].x + nxs[i] * hw * side, P[i].y + y, P[i].z + nzs[i] * hw * side);
  const top = P.map((_, i) => at(i, -1, H + 1)), bot = P.map((_, i) => at(i, -1, -3));
  const farTop = P.map((_, i) => at(i, 1, H)), farPar = P.map((_, i) => at(i, 1, H + 1.3));
  const mid = P[P.length >> 1], nx = nxs[nxs.length >> 1], nz = nzs[nzs.length >> 1];
  const fog = fogOf(top[top.length >> 1][0], top[top.length >> 1][1], zc);
  const poly = (A, B) => [...A, ...B.slice().reverse()];
  polyFill(g, poly(farPar, farTop), css(fogMix(litStone(-nx, -nz, [0.34, 0.31, 0.36]), fog)));
  polyFill(g, poly(top, farTop), css(fogMix([48, 42, 56], fog)));
  if ((-nx) * (0 - mid.x) + (-nz) * (0 - mid.z) <= 0) return;
  const col = fogMix(litStone(-nx, -nz), fog), dk = fogMix(mix3(litStone(-nx, -nz), [10, 9, 16], 0.62), fog);
  const yT = Math.min(...top.map(p => p[1])), yB = Math.max(...bot.map(p => p[1]));
  const gr = g.createLinearGradient(0, yT, 0, yB);
  gr.addColorStop(0, css(col)); gr.addColorStop(0.7, css(mix3(col, dk, 0.6))); gr.addColorStop(1, css(dk));
  const face = poly(top, bot);
  polyFill(g, face, gr);
  if (zc < 1500) { // masonry courses + a scatter of lighter/darker blocks
    const k = 1 - zc / 1500;
    g.save(); g.beginPath(); face.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
    const RB = rngf(Math.floor(list[0].s0 * 7) + 3);
    for (let hh = 0, row = 0; hh < H; hh += 2.0, row++) {
      for (const sg of list) {
        const bl = 3.6, off = (row % 2) * bl / 2;
        for (let s = Math.floor((sg.s0 - off) / bl) * bl + off; s < sg.s1; s += bl) {
          const v = RB(); if (v > 0.3) continue;
          const t0 = clamp((s - sg.s0) / (sg.s1 - sg.s0)), t1 = clamp((s + bl - sg.s0) / (sg.s1 - sg.s0));
          const pt = (t, y) => P3(lerp(sg.a.x, sg.b.x, t) - sg.nx * hw, lerp(sg.a.y, sg.b.y, t) + y, lerp(sg.a.z, sg.b.z, t) - sg.nz * hw);
          polyFill(g, [pt(t0, hh), pt(t1, hh), pt(t1, hh + 2), pt(t0, hh + 2)], v < 0.14 ? `rgba(255,235,220,${0.045 * k})` : `rgba(0,0,10,${0.13 * k})`);
        }
      }
      g.strokeStyle = `rgba(8,6,14,${0.32 * k})`; g.lineWidth = Math.max(0.5, sc * 0.12);
      g.beginPath(); P.forEach((_, i) => { const p = at(i, -1, hh); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.stroke();
    }
    g.restore();
  }
  // warm pools of beacon light on the face near lit towers
  const sMid = (list[0].s0 + list[list.length - 1].s1) / 2;
  let bk = 0; for (const ts of LIT_TOWERS) bk = Math.max(bk, Math.exp(-(((sMid - ts) / 34) ** 2)));
  if (bk > 0.02 && zc < 4000) {
    g.save(); g.beginPath(); face.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
    const lg = g.createLinearGradient(0, yT, 0, yT + (yB - yT) * 0.8); lg.addColorStop(0, `rgba(255,130,50,${0.42 * bk})`); lg.addColorStop(1, 'rgba(255,110,40,0)');
    g.globalCompositeOperation = 'lighter'; g.fillStyle = lg; g.fillRect(-10, yT - 5, W + 20, yB - yT + 10); g.restore();
  }
  const rim = rimAmt(top[0][0], top[0][1]);
  if (rim > 0.02) { g.strokeStyle = `rgba(255,150,80,${rim})`; g.lineWidth = Math.max(0.7, sc * 0.3); g.beginPath(); top.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
}
function drawPatrolTorch(g, e) {
  const { c } = e, nx = c.uz, nz = -c.ux, hw = WALL.thick / 2 - 1.2;
  const [x, y] = P3(c.x - nx * hw, c.y + WALL.h + 3.4, c.z - nz * hw), sc = CAM.f / c.z;
  glowAt(g, x, y, sc * 7, [255, 140, 60], 0.35);
  g.fillStyle = 'rgba(255,220,150,0.95)'; g.beginPath(); g.ellipse(x, y, Math.max(0.8, sc * 0.35), Math.max(1.2, sc * 0.7), 0, 0, TAU); g.fill();
}
function drawMerlon(g, e) {
  const { c, side } = e, hw = WALL.thick / 2 - 0.55, nx = c.uz, nz = -c.ux;
  const cx0 = c.x + nx * hw * side, cz0 = c.z + nz * hw * side, y0 = c.y + WALL.h + 1, y1 = y0 + 2.3;
  const ux = c.ux * 1.15, uz = c.uz * 1.15, tx = nx * 0.55, tz = nz * 0.55;
  const fog = fogOf(...P3(cx0, y0, cz0), cz0);
  const A = P3(cx0 - ux - tx, y0, cz0 - uz - tz), B = P3(cx0 + ux - tx, y0, cz0 + uz - tz), Bt = P3(cx0 + ux - tx, y1, cz0 + uz - tz), At = P3(cx0 - ux - tx, y1, cz0 - uz - tz);
  const Ct = P3(cx0 + ux + tx, y1, cz0 + uz + tz), Dt = P3(cx0 - ux + tx, y1, cz0 - uz + tz), D = P3(cx0 - ux + tx, y0, cz0 - uz + tz);
  polyFill(g, [At, Dt, D, A], css(fogMix(litStone(-c.ux, -c.uz), fog)));
  polyFill(g, [At, Bt, Ct, Dt], css(fogMix([66, 56, 70], fog)));
  polyFill(g, [A, B, Bt, At], css(fogMix(litStone(-nx, -nz), fog)));
  const rim = rimAmt(At[0], At[1]);
  if (rim > 0.02) { g.strokeStyle = `rgba(255,160,90,${rim})`; g.lineWidth = Math.max(0.7, CAM.f / cz0 * 0.3); g.beginPath(); g.moveTo(Dt[0], Dt[1]); g.lineTo(Ct[0], Ct[1]); g.lineTo(Bt[0], Bt[1]); g.stroke(); }
}
function drawTower(g, e, fires) {
  const { c } = e, H = WALL.towerH + (e.gate ? 4 : 0), nx = c.uz, nz = -c.ux;
  const r0 = WALL.tower / 2 + (e.gate ? 2 : 0), r1 = r0 * 0.88, rp = r0 * 1.0, base = c.y - 5, top = c.y + H, band = top - 5;
  const corner = (su, sn, y, r) => P3(c.x + c.ux * r * su + nx * r * sn, y, c.z + c.uz * r * su + nz * r * sn);
  const rAt = y => lerp(r0, r1, clamp((y - base) / (band - base)));
  const faces = [[-1, -1, 1, -1, [-nx, -nz]], [1, 1, -1, 1, [nx, nz]], [-1, 1, -1, -1, [-c.ux, -c.uz]], [1, -1, 1, 1, [c.ux, c.uz]]];
  const fog = fogOf(...P3(c.x, top, c.z), c.z), sc = CAM.f / c.z;
  const fire = P3(c.x, top + 3.4, c.z);
  const vis = faces.filter(f => { const fx = c.x + (c.ux * r0 * (f[0] + f[2]) + nx * r0 * (f[1] + f[3])) / 2, fz = c.z + (c.uz * r0 * (f[0] + f[2]) + nz * r0 * (f[1] + f[3])) / 2; return f[4][0] * -fx + f[4][1] * -fz > 0; });
  const faceAt = (f, y0, y1, ra, rb) => [corner(f[0], f[1], y0, ra), corner(f[2], f[3], y0, ra), corner(f[2], f[3], y1, rb), corner(f[0], f[1], y1, rb)];
  for (const f of vis) {
    const q = faceAt(f, base, band, r0, r1);
    const col = fogMix(litStone(f[4][0], f[4][1], [0.42, 0.39, 0.44]), fog), dk = fogMix(mix3(litStone(f[4][0], f[4][1]), [10, 9, 16], 0.62), fog);
    const gr = g.createLinearGradient(0, Math.min(q[2][1], q[3][1]), 0, Math.max(q[0][1], q[1][1]));
    gr.addColorStop(0, css(col)); gr.addColorStop(0.75, css(mix3(col, dk, 0.65))); gr.addColorStop(1, css(dk));
    polyFill(g, q, gr);
    g.save(); g.beginPath(); q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
    if (c.z < 1700) { // courses, slits
      const k = 1 - c.z / 1700;
      g.strokeStyle = `rgba(8,6,14,${0.32 * k})`; g.lineWidth = Math.max(0.5, sc * 0.12);
      for (let hh = 0; hh < band - base; hh += 2) { const y = base + hh, a = corner(f[0], f[1], y, rAt(y)), b = corner(f[2], f[3], y, rAt(y)); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
      for (let k2 = 0; k2 < (band - base) / 2; k2++) for (let t = (k2 % 2 ? 0.12 : 0.25); t < 1; t += 0.26) { const y = base + k2 * 2, su = lerp(f[0], f[2], t), sn = lerp(f[1], f[3], t); const a = corner(su, sn, y, rAt(y)), b = corner(su, sn, y + 2, rAt(y + 2)); g.globalAlpha = 0.6; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.globalAlpha = 1; }
      for (const hh of [0.42, 0.66]) { const y = base + (band - base) * hh, a = corner(lerp(f[0], f[2], 0.46), lerp(f[1], f[3], 0.46), y, rAt(y)), b = corner(lerp(f[0], f[2], 0.54), lerp(f[1], f[3], 0.54), y + 3.6, rAt(y)); polyFill(g, [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]], 'rgba(6,4,10,0.8)'); }
    }
    if (e.lit) { // beacon light washing down from the top
      const lg = g.createLinearGradient(0, fire[1], 0, fire[1] + sc * 22);
      lg.addColorStop(0, 'rgba(255,140,60,0.5)'); lg.addColorStop(1, 'rgba(255,110,40,0)');
      g.globalCompositeOperation = 'lighter'; g.fillStyle = lg; g.fillRect(-10, fire[1] - 10, W + 20, sc * 30); g.globalCompositeOperation = 'source-over';
    }
    g.restore();
    if (e.gate && f[4][0] === -nx) { // the gate arch on the realm face, firelit inside
      const gw = 0.34, gh = 12, y0 = c.y - 1;
      const L0 = corner(-gw, -1, y0, r0), R0 = corner(gw, -1, y0, r0), Ltop = corner(-gw, -1, y0 + gh, rAt(y0 + gh)), Rtop = corner(gw, -1, y0 + gh, rAt(y0 + gh)), Mtop = corner(0, -1, y0 + gh + 5, rAt(y0 + gh));
      const p = new Path2D(); p.moveTo(L0[0], L0[1]); p.lineTo(Ltop[0], Ltop[1]); p.quadraticCurveTo(Mtop[0], Mtop[1] - (Rtop[1] - Mtop[1]) * 0.2, Rtop[0], Rtop[1]); p.lineTo(R0[0], R0[1]); p.closePath();
      const gg = g.createLinearGradient(0, Mtop[1], 0, L0[1]); gg.addColorStop(0, '#5a2a14'); gg.addColorStop(1, '#ffb050');
      g.fillStyle = gg; g.fill(p); g.strokeStyle = 'rgba(10,6,10,0.9)'; g.lineWidth = Math.max(1, sc * 0.5); g.stroke(p);
      glowAt(g, (L0[0] + R0[0]) / 2, L0[1] - sc * 4, sc * 18, [255, 150, 60], 0.45);
      for (const sx of [-0.62, 0.62]) { const tp = corner(sx, -1.02, y0 + 7, r0); torchFlame(g, tp[0], tp[1], sc * 1.4); }
    }
  }
  // machicolated parapet band
  for (const f of vis) {
    const q = faceAt(f, band, top, rp, rp);
    polyFill(g, q, css(fogMix(litStone(f[4][0], f[4][1], [0.46, 0.42, 0.46]), fog)));
    const lo = faceAt(f, band - 0.01, band - 1.4, rp, r1);
    polyFill(g, lo, `rgba(8,6,12,${0.7 * (1 - fog.a)})`);
    if (c.z < 1500) for (let t = 0.08; t < 1; t += 0.14) { const a = corner(lerp(f[0], f[2], t), lerp(f[1], f[3], t), band, rp), b = corner(lerp(f[0], f[2], t), lerp(f[1], f[3], t), band - 2.2, r1); g.strokeStyle = `rgba(8,6,12,${0.6 * (1 - c.z / 1500)})`; g.lineWidth = Math.max(0.6, sc * 0.5); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    if (e.lit) { g.save(); g.globalCompositeOperation = 'lighter'; polyFill(g, q, `rgba(255,120,50,${0.22 * (1 - fog.a)})`); g.restore(); }
  }
  const T0 = corner(-1, -1, top, rp), T1 = corner(1, -1, top, rp), T2 = corner(1, 1, top, rp), T3 = corner(-1, 1, top, rp);
  polyFill(g, [T0, T1, T2, T3], css(fogMix(e.lit ? [110, 66, 50] : [60, 52, 64], fog)));
  const mer = [];
  for (const sd of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) for (let t = 0.12; t < 0.95; t += 0.25) {
    const su = lerp(sd[0], sd[2], t), sn = lerp(sd[1], sd[3], t);
    mer.push({ su, sn, along: Math.abs(sd[1] - sd[3]) < 0.01, d: Math.hypot(c.x + c.ux * rp * su + nx * rp * sn, c.z + c.uz * rp * su + nz * rp * sn) });
  }
  mer.sort((a, b) => b.d - a.d);
  for (const m of mer) {
    const w = 0.13, mh = 2.8;
    const q = m.along ? [corner(m.su - w, m.sn, top, rp), corner(m.su + w, m.sn, top, rp), corner(m.su + w, m.sn, top + mh, rp), corner(m.su - w, m.sn, top + mh, rp)]
      : [corner(m.su, m.sn - w, top, rp), corner(m.su, m.sn + w, top, rp), corner(m.su, m.sn + w, top + mh, rp), corner(m.su, m.sn - w, top + mh, rp)];
    polyFill(g, q, css(fogMix(e.lit ? [120, 78, 62] : [70, 62, 74], fog)));
    const rim = rimAmt(q[3][0], q[3][1]);
    if (rim > 0.03) { g.strokeStyle = `rgba(255,160,90,${rim})`; g.lineWidth = Math.max(0.6, sc * 0.3); g.beginPath(); g.moveTo(q[3][0], q[3][1]); g.lineTo(q[2][0], q[2][1]); g.stroke(); }
  }
  if (!e.lit) return;
  fires.push({ x: fire[0], y: fire[1], s: sc, z: c.z });
  const bw = sc * 1.7;
  polyFill(g, [[fire[0] - bw, fire[1] - bw * 0.2], [fire[0] + bw, fire[1] - bw * 0.2], [fire[0] + bw * 0.6, fire[1] + bw * 0.9], [fire[0] - bw * 0.6, fire[1] + bw * 0.9]], '#1a1014');
  flame(g, fire[0], fire[1] - bw * 0.1, sc * 2.8, c.z);
}
function flame(g, x, y, s, z) {
  const far = Math.exp(-z / 2400);
  glowAt(g, x, y - s * 0.6, Math.max(6, s * 10), [255, 110, 40], 0.18 + 0.32 * far);
  glowAt(g, x, y - s * 0.5, Math.max(3, s * 3.2), [255, 200, 120], 0.45 + 0.4 * far);
  if (s < 1.2) { g.fillStyle = 'rgba(255,230,170,0.95)'; g.beginPath(); g.arc(x, y - s * 0.5, Math.max(0.7, s * 0.6), 0, TAU); g.fill(); return; }
  const tongue = (dx, hgt, w) => { const p = new Path2D(); p.moveTo(x + dx - s * w, y); p.bezierCurveTo(x + dx - s * w * 1.1, y - s * hgt * 0.4, x + dx - s * w * 0.2, y - s * hgt * 0.6, x + dx + s * 0.08, y - s * hgt); p.bezierCurveTo(x + dx + s * w * 0.3, y - s * hgt * 0.55, x + dx + s * w * 1.1, y - s * hgt * 0.35, x + dx + s * w, y); p.closePath(); return p; };
  const gr = g.createLinearGradient(0, y - s * 2.2, 0, y);
  gr.addColorStop(0, 'rgba(255,90,30,0.85)'); gr.addColorStop(0.45, 'rgba(255,170,70,1)'); gr.addColorStop(1, 'rgba(255,240,190,1)');
  g.fillStyle = gr;
  g.fill(tongue(-s * 0.3, 1.5, 0.35)); g.fill(tongue(s * 0.32, 1.6, 0.32)); g.fill(tongue(0, 2.2, 0.55));
  g.fillStyle = 'rgba(255,250,220,0.9)'; g.fill(tongue(0, 1.1, 0.25));
}
function torchFlame(g, x, y, s) {
  glowAt(g, x, y - s, s * 9, [255, 130, 50], 0.4);
  g.fillStyle = '#ffcf6a'; g.beginPath(); g.ellipse(x, y - s * 0.9, s * 0.45, s * 0.9, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff4c8'; g.beginPath(); g.ellipse(x, y - s * 0.7, s * 0.2, s * 0.45, 0, 0, TAU); g.fill();
}
function drawTree(g, e, dep1) {
  const top = P3(e.x, e.y + e.h, e.z), bot = P3(e.x, e.y - 1.5, e.z);
  const hpx = bot[1] - top[1]; if (hpx < 1.5) return;
  const fog = fogOf(top[0], top[1], e.z);
  const dk = 0.55 + 0.45 * sstep(40, 600, e.z);
  const col = fogMix([(14 + e.r * 8) * dk, (22 + e.r * 9) * dk, (26 + e.r * 6) * dk], fog);
  const R = rngf(Math.floor(e.r * 1e6) + 1);
  const p = new Path2D();
  if (e.round) { // broadleaf: lumpy crown on a short trunk
    const cy = top[1] + hpx * 0.38, rr = hpx * 0.36;
    for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU, d = rr * (0.55 + R() * 0.25); p.moveTo(top[0] + Math.cos(a) * d + rr * 0.5, cy + Math.sin(a) * d * 0.8); p.arc(top[0] + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, rr * 0.5, 0, TAU); }
    p.rect(top[0] - hpx * 0.04, cy, hpx * 0.08, bot[1] - cy);
  } else { // conifer: tiers of drooping boughs
    const wpx = hpx * (0.34 + e.r * 0.08), n = hpx > 14 ? 6 : 4;
    p.moveTo(top[0], top[1]);
    for (let i = 1; i <= n; i++) { const t = i / n, yy = top[1] + hpx * 0.88 * t; p.lineTo(top[0] + wpx * 0.5 * t * (0.85 + R() * 0.3), yy); if (i < n) p.lineTo(top[0] + wpx * 0.2 * t, yy - hpx * 0.05); }
    p.lineTo(top[0] + hpx * 0.03, top[1] + hpx * 0.88); p.lineTo(top[0] + hpx * 0.03, bot[1]); p.lineTo(top[0] - hpx * 0.03, bot[1]); p.lineTo(top[0] - hpx * 0.03, top[1] + hpx * 0.88);
    for (let i = n; i >= 1; i--) { const t = i / n, yy = top[1] + hpx * 0.88 * t; if (i < n) p.lineTo(top[0] - wpx * 0.2 * t, yy - hpx * 0.05); p.lineTo(top[0] - wpx * 0.5 * t * (0.85 + R() * 0.3), yy); }
    p.closePath();
  }
  g.fillStyle = css(col); g.fill(p);
  // rim light only for trees standing against the bright sky / far land
  const tx = Math.round(top[0]), ty = Math.round(top[1] - 2);
  const behind = tx >= 0 && tx < W && ty >= 0 && ty < H ? dep1[ty * W + tx] : 0;
  if (!e.round && hpx > 4 && (behind === 0 || behind > e.z * 2.5)) {
    const rim = rimAmt(top[0], top[1]) * 0.7;
    if (rim > 0.03) { g.save(); g.clip(p); g.translate(-hpx * 0.06, hpx * 0.04); g.strokeStyle = `rgba(255,140,80,${rim})`; g.lineWidth = Math.max(1, hpx * 0.08); g.stroke(p); g.restore(); }
  }
}
function drawHouse(g, e, lights) {
  const s = CAM.f / e.z, [x, y] = P3(e.x, e.y, e.z);
  const w = (7 + (e.k % 3) * 2) * s, h = 4.6 * s, rh = 3.6 * s;
  const fog = fogOf(x, y, e.z);
  polyFill(g, [[x - w / 2, y], [x + w / 2, y], [x + w / 2, y - h], [x - w / 2, y - h]], css(fogMix([34, 30, 36], fog)));
  polyFill(g, [[x + w / 2, y], [x + w / 2 + w * 0.3, y - s * 1.5], [x + w / 2 + w * 0.3, y - h - s * 1.5], [x + w / 2, y - h]], css(fogMix([26, 22, 30], fog)));
  polyFill(g, [[x - w / 2 - s * 0.8, y - h], [x + w / 2 + s * 0.8, y - h], [x + w / 2 + w * 0.3, y - h - rh], [x - w * 0.15, y - h - rh]], css(fogMix([24, 18, 24], fog)));
  for (let i = 0; i < 1 + (e.k % 2); i++) {
    const wx = x - w * 0.25 + i * w * 0.45, wy = y - h * 0.55;
    g.fillStyle = '#ffc96a'; g.fillRect(wx - s * 0.6, wy - s * 0.7, s * 1.2, s * 1.4);
    lights.push({ x: wx, y: wy, s });
  }
}
function drawElements(g, terr, els) {
  const { occ, BINS, dep1 } = terr, fires = [], lights = [];
  const binOf = z => { let k = 0; while (k < BINS.length - 1 && BINS[k + 1] <= z) k++; return k; };
  const allSegs = els.filter(e => e.kind === 'seg').sort((a, b) => a.seg.s0 - b.seg.s0);
  allSegs.forEach((e, i) => { e.idx = i; });
  const groups = new Map();
  for (const e of els) { const k = binOf(Math.max(40, e.zmin)); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); }
  for (const k of [...groups.keys()].sort((a, b) => b - a)) {
    const all = groups.get(k), runs = [];
    for (const e of all.filter(e => e.kind === 'seg').sort((a, b) => a.idx - b.idx)) {
      const r = runs[runs.length - 1];
      if (r && r.segs[r.segs.length - 1].idx === e.idx - 1) r.segs.push(e); else runs.push({ kind: 'run', segs: [e] });
    }
    for (const r of runs) r.z = r.segs.reduce((a, e) => a + e.z, 0) / r.segs.length;
    const list = [...all.filter(e => e.kind !== 'seg'), ...runs].sort((a, b) => b.z - a.z);
    g.save();
    const clip = new Path2D(); clip.moveTo(-20, -20); clip.lineTo(W + 20, -20);
    for (let X = W - 1; X >= 0; X -= 2) clip.lineTo(X + 1, occ[k * W + X] + 0.5);
    clip.lineTo(-20, occ[k * W] + 0.5); clip.closePath(); g.clip(clip);
    for (const e of list) {
      if (e.kind === 'run') drawRun(g, e, allSegs); else if (e.kind === 'tower') drawTower(g, e, fires); else if (e.kind === 'merlon') drawMerlon(g, e);
      else if (e.kind === 'tree') drawTree(g, e, dep1); else if (e.kind === 'house') drawHouse(g, e, lights); else if (e.kind === 'ptorch') drawPatrolTorch(g, e);
    }
    g.restore();
  }
  for (const l of lights) glowAt(g, l.x, l.y, l.s * 7, [255, 170, 80], 0.32);
  return fires;
}

// ---------------- foreground: rocky knoll, the Warden's watchtower, banner, torches ----------------
const KNOLL = [[-40, 1350], [-40, 905], [60, 892], [150, 900], [235, 925], [300, 958], [330, 978], [640, 982], [700, 996], [770, 1030], [850, 1078], [940, 1140], [1030, 1215], [1110, 1290], [1150, 1350]];
function drawForeground(g, R) {
  // dark foreground swell along the bottom (calm area for the "touch" prompt)
  const sw = new Path2D(); sw.moveTo(700, 1350);
  for (let x = 700; x <= W + 20; x += 20) sw.lineTo(x, 1188 + 26 * Math.sin(x / 260 + 1.2) + 18 * Math.sin(x / 97) - 60 * sstep(1700, 2400, x));
  sw.lineTo(W + 20, 1350); sw.closePath();
  const sg = g.createLinearGradient(0, 1100, 0, 1350); sg.addColorStop(0, '#0d0d16'); sg.addColorStop(1, '#050508');
  g.fillStyle = sg; g.fill(sw);
  g.save(); g.clip(sw); g.translate(0, 3); g.strokeStyle = 'rgba(255,140,80,0.16)'; g.lineWidth = 3; g.stroke(sw); g.restore();
  grassEdge(g, sw, R, 700, W, x => 1188 + 26 * Math.sin(x / 260 + 1.2) + 18 * Math.sin(x / 97) - 60 * sstep(1700, 2400, x), 0.8);
  // knoll
  const kp = new Path2D(); KNOLL.forEach(([x, y], i) => (i ? kp.lineTo(x, y) : kp.moveTo(x, y))); kp.closePath();
  const kg = g.createLinearGradient(0, 880, 0, 1350); kg.addColorStop(0, '#16141e'); kg.addColorStop(1, '#060508');
  g.fillStyle = kg; g.fill(kp);
  g.save(); g.clip(kp);
  // faceted rock outcrops lit on their eastern faces
  const rocks = [[150, 960, 70], [255, 1010, 60], [690, 1035, 52], [790, 1090, 64], [880, 1160, 58], [60, 1000, 64], [560, 1060, 46], [420, 1080, 40], [980, 1240, 70]];
  for (const [x, y, s] of rocks) rock(g, x, y, s, R);
  g.restore();
  g.save(); g.clip(kp); g.translate(-3, 4); g.strokeStyle = 'rgba(255,150,90,0.22)'; g.lineWidth = 4; g.stroke(kp); g.restore();
  grassEdge(g, kp, R, -40, 1120, x => { for (let i = 1; i < KNOLL.length; i++) if (KNOLL[i][0] >= x) { const [x0, y0] = KNOLL[i - 1], [x1, y1] = KNOLL[i]; return lerp(y0, y1, (x - x0) / ((x1 - x0) || 1)); } return 1350; }, 1);
  watchtower(g, R);
  // path torches up the knoll
  for (const [x, y, s] of [[760, 1062, 1.0], [905, 1150, 1.15]]) torchPost(g, x, y, s);
}
function rock(g, x, y, s, R) {
  const pts = [], n = 8;
  for (let i = 0; i < n; i++) { const a = PI + (i / (n - 1)) * PI; pts.push([x + Math.cos(a) * s * (0.8 + R() * 0.35), y + Math.sin(a) * s * (0.5 + R() * 0.3)]); }
  pts.push([x + s * 0.95, y + s * 0.5], [x - s * 0.95, y + s * 0.5]);
  const p = new Path2D(); pts.forEach(([px, py], i) => (i ? p.lineTo(px, py) : p.moveTo(px, py))); p.closePath();
  g.fillStyle = '#121019'; g.fill(p);
  g.save(); g.clip(p);
  const k = Math.floor(n * (0.45 + R() * 0.15)), ridge = pts[k];
  // faint cool top light on the left facet, ember light on the right facet
  g.fillStyle = 'rgba(70,70,110,0.16)'; g.beginPath(); g.moveTo(ridge[0], ridge[1]); for (let i = k - 1; i >= 0; i--) g.lineTo(pts[i][0], pts[i][1]); g.lineTo(x - s * 0.2, y + s * 0.3); g.closePath(); g.fill();
  const eg = g.createLinearGradient(ridge[0], 0, x + s, 0); eg.addColorStop(0, 'rgba(160,70,40,0.22)'); eg.addColorStop(1, 'rgba(120,50,40,0.05)');
  g.fillStyle = eg; g.beginPath(); g.moveTo(ridge[0], ridge[1]); for (let i = k + 1; i < n; i++) g.lineTo(pts[i][0], pts[i][1]); g.lineTo(x + s * 0.95, y + s * 0.5); g.lineTo(x + s * 0.1, y + s * 0.4); g.closePath(); g.fill();
  g.restore();
  g.strokeStyle = 'rgba(255,150,90,0.35)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(ridge[0], ridge[1]); for (let i = k + 1; i < n; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke();
}
function grassEdge(g, path, R, x0, x1, yAt, k) {
  g.save(); g.lineCap = 'round';
  for (let x = x0; x < x1; x += 3 + R() * 5) {
    const y = yAt(x) + 2, h = (8 + R() * 16) * k, lean = 4 + R() * 6;
    g.strokeStyle = R() < 0.5 ? '#0b0a10' : '#121018'; g.lineWidth = 1.2 + R() * 1.4;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.3, y - h * 0.6, x - lean, y - h); g.stroke();
    if (R() < 0.35) { g.strokeStyle = 'rgba(255,150,90,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 1, y - h * 0.3); g.quadraticCurveTo(x + lean * 0.3 + 1, y - h * 0.6, x - lean + 1, y - h); g.stroke(); }
  }
  g.restore();
}
function torchPost(g, x, y, s) {
  g.fillStyle = '#0c0a0e'; g.fillRect(x - 3 * s, y - 70 * s, 6 * s, 70 * s);
  g.fillStyle = '#2a1c16'; g.fillRect(x - 6 * s, y - 78 * s, 12 * s, 10 * s);
  torchFlame(g, x, y - 78 * s, 9 * s);
  glowAt(g, x, y - 20 * s, 120 * s, [255, 120, 50], 0.12);
}
// the Warden's banner: deep blue, white tower emblem, gold trim
export function wardenBanner(g, x, y, w, h, R, light = 1) {
  const wave = (t, k) => Math.sin(t * 5.2 + k) * h * 0.07 * t + Math.sin(t * 2.3 + k * 2) * h * 0.04;
  const top = [], bot = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; top.push([x + w * t, y + wave(t, 0) - t * h * 0.06]); bot.push([x + w * t * (1 - 0.06 * t), y + h * (1 - 0.18 * t) + wave(t, 0.6)]); }
  const p = new Path2D(); top.forEach(([px, py], i) => (i ? p.lineTo(px, py) : p.moveTo(px, py)));
  // swallow-tail
  const e1 = top[20], e2 = bot[20];
  p.lineTo(e1[0] - w * 0.02, (e1[1] + e2[1]) / 2 - h * 0.05); p.lineTo(e1[0] - w * 0.16, (e1[1] + e2[1]) / 2 + h * 0.02); p.lineTo(e2[0], e2[1]);
  for (let i = 20; i >= 0; i--) p.lineTo(bot[i][0], bot[i][1]);
  p.closePath();
  g.fillStyle = '#1d3a86'; g.fill(p);
  g.save(); g.clip(p);
  // cloth folds: light & shadow bands following the wave
  for (let i = 0; i < 20; i++) {
    const t = (i + 0.5) / 20, k = Math.cos(t * 5.2) * 0.5 + Math.cos(t * 2.3 + 2) * 0.5;
    g.fillStyle = k > 0 ? `rgba(120,170,255,${0.22 * k * light})` : `rgba(0,0,30,${-0.35 * k})`;
    g.fillRect(x + w * i / 20 - 1, y - h, w / 20 + 2, h * 3);
  }
  // ember side light from the right
  const lg = g.createLinearGradient(x, 0, x + w, 0); lg.addColorStop(0, 'rgba(255,120,60,0)'); lg.addColorStop(1, `rgba(255,120,60,${0.28 * light})`);
  g.fillStyle = lg; g.fillRect(x, y - h, w, h * 3);
  // emblem: a white tower
  const ex = x + w * 0.36, ey = y + h * 0.5 + wave(0.36, 0.3) * 0.6, es = h * 0.36;
  g.fillStyle = '#e9e4d6';
  g.beginPath();
  g.moveTo(ex - es * 0.42, ey + es * 0.75); g.lineTo(ex - es * 0.34, ey - es * 0.42); g.lineTo(ex - es * 0.5, ey - es * 0.42); g.lineTo(ex - es * 0.5, ey - es * 0.78);
  for (let i = 0; i < 4; i++) { const xx = ex - es * 0.5 + i * es * 0.333; g.lineTo(xx, ey - es * 0.78); g.lineTo(xx, ey - es * 0.96); g.lineTo(xx + es * 0.17, ey - es * 0.96); g.lineTo(xx + es * 0.17, ey - es * 0.78); }
  g.lineTo(ex + es * 0.5, ey - es * 0.78); g.lineTo(ex + es * 0.5, ey - es * 0.42); g.lineTo(ex + es * 0.34, ey - es * 0.42); g.lineTo(ex + es * 0.42, ey + es * 0.75); g.closePath(); g.fill();
  g.fillStyle = '#1d3a86'; g.beginPath(); g.moveTo(ex - es * 0.11, ey + es * 0.75); g.lineTo(ex - es * 0.11, ey + es * 0.38); g.arc(ex, ey + es * 0.38, es * 0.11, PI, 0); g.lineTo(ex + es * 0.11, ey + es * 0.75); g.closePath(); g.fill();
  g.restore();
  // gold trim along the hoist and the top edge, outline
  g.strokeStyle = '#d9a640'; g.lineWidth = h * 0.045; g.save(); g.clip(p); g.stroke(p); g.restore();
  g.strokeStyle = 'rgba(6,6,14,0.9)'; g.lineWidth = 2.2; g.stroke(p);
  return p;
}
function stoneFace(g, quad, R, o) { // painterly masonry inside a quad [bl, br, tr, tl]
  const [bl, br, tr, tl] = quad;
  const p = new Path2D(); quad.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath();
  const top = Math.min(tl[1], tr[1]), bot = Math.max(bl[1], br[1]);
  const gr = g.createLinearGradient(0, top, 0, bot); o.grad.forEach(([t, c]) => gr.addColorStop(t, c));
  g.fillStyle = gr; g.fill(p);
  g.save(); g.clip(p);
  const lerpP = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const rows = Math.round((bot - top) / o.rowH);
  for (let r = 0; r < rows; r++) {
    const t0 = r / rows, t1 = (r + 1) / rows;
    const L0 = lerpP(bl, tl, t0), R0 = lerpP(br, tr, t0), L1 = lerpP(bl, tl, t1), R1 = lerpP(br, tr, t1);
    let u = -R() * 0.5 * o.blockW;
    const width = Math.hypot(R0[0] - L0[0], R0[1] - L0[1]);
    while (u < width) {
      const bw = o.blockW * (0.6 + R() * 0.8), u0 = Math.max(0, u) / width, u1 = Math.min(width, u + bw) / width;
      const A = lerpP(L0, R0, u0), B = lerpP(L0, R0, u1), C = lerpP(L1, R1, u1), D = lerpP(L1, R1, u0);
      const v = R();
      g.fillStyle = v < 0.3 ? `rgba(255,240,230,${0.03 + R() * 0.04})` : v < 0.65 ? `rgba(0,0,8,${0.08 + R() * 0.1})` : 'rgba(0,0,0,0)';
      g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.lineTo(C[0], C[1]); g.lineTo(D[0], D[1]); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(4,3,8,0.42)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(B[0], B[1]); g.lineTo(C[0], C[1]); g.stroke();
      // chipped highlight on the block's upper edge
      if (R() < 0.5) { g.strokeStyle = o.chip; g.lineWidth = 1; g.beginPath(); g.moveTo(lerp(D[0], C[0], 0.1), lerp(D[1], C[1], 0.1) + 1.5); g.lineTo(lerp(D[0], C[0], 0.9), lerp(D[1], C[1], 0.9) + 1.5); g.stroke(); }
      u += bw;
    }
    g.strokeStyle = 'rgba(4,3,8,0.5)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(L1[0], L1[1]); g.lineTo(R1[0], R1[1]); g.stroke();
  }
  // weathering streaks + moss at the foot
  for (let i = 0; i < 18; i++) { const t = R(), a = lerpP(tl, tr, t), b = lerpP(bl, br, t), l = 0.2 + R() * 0.6, y0 = R() * 0.5; g.strokeStyle = `rgba(0,0,0,${0.05 + R() * 0.08})`; g.lineWidth = 2 + R() * 5; g.beginPath(); g.moveTo(lerp(a[0], b[0], y0), lerp(a[1], b[1], y0)); g.lineTo(lerp(a[0], b[0], y0 + l), lerp(a[1], b[1], y0 + l)); g.stroke(); }
  if (o.moss !== false) { const mg = g.createLinearGradient(0, bot - 70, 0, bot); mg.addColorStop(0, 'rgba(20,40,24,0)'); mg.addColorStop(1, 'rgba(20,40,24,0.55)'); g.fillStyle = mg; g.fillRect(-10, bot - 70, W, 80); }
  if (o.after) o.after(p);
  g.restore();
  return p;
}
function watchtower(g, R) {
  // 3/4 view: front face (towards us, in dusk shadow) and east face (catching the ember glow)
  const bl = [338, 1000], bm = [516, 1012], br = [604, 994];
  const tl = [350, 430], tm = [510, 438], tr = [594, 426];
  const cx = (bl[0] + bm[0]) / 2;
  stoneFace(g, [bm, br, tr, tm], R, { rowH: 24, blockW: 30, chip: 'rgba(255,190,140,0.25)', grad: [[0, '#7a4434'], [0.45, '#4e2a28'], [1, '#1e141a']],
    after: () => { const lg = g.createLinearGradient(bm[0], 0, br[0], 0); lg.addColorStop(0, 'rgba(255,120,60,0)'); lg.addColorStop(1, 'rgba(255,140,70,0.22)'); g.fillStyle = lg; g.fillRect(bm[0], 300, 120, 800); } });
  stoneFace(g, [bl, bm, tm, tl], R, { rowH: 24, blockW: 44, chip: 'rgba(150,150,200,0.14)', grad: [[0, '#2c2e40'], [0.55, '#191a26'], [1, '#0b0b12']],
    after: () => {
      const tg = g.createRadialGradient(cx, 990, 20, cx, 990, 250); tg.addColorStop(0, 'rgba(255,140,60,0.42)'); tg.addColorStop(0.45, 'rgba(255,110,50,0.1)'); tg.addColorStop(1, 'rgba(255,100,40,0)');
      g.globalCompositeOperation = 'lighter'; g.fillStyle = tg; g.fillRect(cx - 320, 680, 640, 340); g.globalCompositeOperation = 'source-over';
      const sg = g.createLinearGradient(0, 430, 0, 700); sg.addColorStop(0, 'rgba(110,120,180,0.1)'); sg.addColorStop(1, 'rgba(110,120,180,0)');
      g.fillStyle = sg; g.fillRect(300, 430, 260, 280);
    } });
  // corner rim (the east edge glows) and a softer line on the near corner
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(255,175,110,0.9)'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(tr[0], tr[1]); g.lineTo(br[0], br[1]); g.stroke();
  g.strokeStyle = 'rgba(255,150,90,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(tm[0], tm[1]); g.lineTo(bm[0], bm[1]); g.stroke();
  // arrow slits (front), one with firelight; a lit arched window up high; slit on the east face
  const slit = (x, y, w, h, lit) => { const p = new Path2D(); p.moveTo(x - w / 2, y); p.lineTo(x - w / 2, y - h + w / 2); p.arc(x, y - h + w / 2, w / 2, PI, 0); p.lineTo(x + w / 2, y); p.closePath(); g.fillStyle = lit ? '#ffb85a' : '#040306'; g.fill(p); if (lit) glowAt(g, x, y - h / 2, h * 1.6, [255, 150, 60], 0.32); return p; };
  slit(cx, 870, 11, 40, false); slit(cx - 2, 730, 11, 40, true); slit(560, 800, 8, 34, false);
  const wp = slit(cx, 600, 24, 52, true);
  g.strokeStyle = '#0a0806'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, 600); g.lineTo(cx, 548); g.moveTo(cx - 12, 578); g.lineTo(cx + 12, 578); g.stroke();
  g.strokeStyle = '#1a1414'; g.lineWidth = 5; g.stroke(wp);
  // door: arched, firelit, with an iron-banded leaf ajar
  const dw = 34, dTop = 905;
  const dp = new Path2D(); dp.moveTo(cx - dw, 1006); dp.lineTo(cx - dw, dTop); dp.arc(cx, dTop, dw, PI, 0); dp.lineTo(cx + dw, 1008); dp.closePath();
  const dg = g.createLinearGradient(0, dTop - dw, 0, 1006); dg.addColorStop(0, '#7a3814'); dg.addColorStop(1, '#ffc060');
  g.fillStyle = dg; g.fill(dp);
  g.fillStyle = '#2a160c'; g.beginPath(); g.moveTo(cx - dw, 1006); g.lineTo(cx - dw, dTop); g.lineTo(cx - dw + 22, dTop - 6); g.lineTo(cx - dw + 22, 1012); g.closePath(); g.fill();
  g.strokeStyle = '#140a06'; g.lineWidth = 2; for (const yy of [930, 975]) { g.beginPath(); g.moveTo(cx - dw, yy); g.lineTo(cx - dw + 22, yy - 3); g.stroke(); }
  g.strokeStyle = '#08060a'; g.lineWidth = 5; g.stroke(dp);
  g.strokeStyle = '#2c2430'; g.lineWidth = 8; g.beginPath(); g.arc(cx, dTop, dw + 8, PI, 0); g.stroke();
  for (const sx of [-1, 1]) { const tx = cx + sx * 64, ty = 920; g.fillStyle = '#100c0c'; g.fillRect(tx - 3, ty, 6, 26); g.fillStyle = '#3a2a1e'; g.fillRect(tx - 6, ty - 4, 12, 7); torchFlame(g, tx, ty - 3, 11); }
  glowAt(g, cx, 975, 190, [255, 130, 50], 0.3);
  // corbelled parapet with merlons (two faces)
  const ov = 14, pH = 54, mH = 34;
  const pbl = [tl[0] - ov, tl[1] + 2], pbm = [tm[0], tm[1] + 6], pbr = [tr[0] + ov * 0.6, tr[1] - 2];
  const up = (p, h) => [p[0], p[1] - h];
  for (let i = 0; i < 7; i++) { const t = (i + 0.5) / 7, x = lerp(pbl[0] + 6, pbm[0] - 6, t), y = lerp(pbl[1], pbm[1], t); g.fillStyle = '#100e16'; g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x + 7, y); g.lineTo(x + 5, y + 18); g.lineTo(x - 5, y + 18); g.closePath(); g.fill(); }
  stoneFace(g, [pbm, pbr, up(pbr, pH), up(pbm, pH)], R, { moss: false, rowH: 18, blockW: 26, chip: 'rgba(255,190,140,0.25)', grad: [[0, '#7a3c2c'], [1, '#5a2c26']] });
  stoneFace(g, [pbl, pbm, up(pbm, pH), up(pbl, pH)], R, { moss: false, rowH: 18, blockW: 34, chip: 'rgba(150,150,200,0.14)', grad: [[0, '#262838'], [1, '#1e2030']] });
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(pbl[0], pbl[1]); g.lineTo(pbm[0], pbm[1]); g.lineTo(pbr[0], pbr[1]); g.stroke();
  // merlons: front row then east row
  const merlon = (a, b, h, front) => {
    const q = [a, b, up(b, h), up(a, h)];
    g.fillStyle = front ? '#262838' : '#7a3c2c'; g.beginPath(); q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
    g.strokeStyle = front ? 'rgba(255,160,100,0.5)' : 'rgba(255,190,130,0.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(...up(a, h)); g.lineTo(...up(b, h)); g.stroke();
    if (!front) { g.strokeStyle = 'rgba(255,190,130,0.9)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(...up(b, h)); g.lineTo(...b); g.stroke(); }
  };
  const pt = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const fl = up(pbl, pH), fm = up(pbm, pH), fr = up(pbr, pH);
  for (let i = 0; i < 4; i++) { const t0 = i / 3.4, t1 = t0 + 0.16; merlon(pt(fl, fm, t0), pt(fl, fm, Math.min(1, t1)), mH, true); }
  for (let i = 0; i < 2; i++) { const t0 = 0.12 + i * 0.5, t1 = t0 + 0.3; merlon(pt(fm, fr, t0), pt(fm, fr, t1), mH, false); }
  g.strokeStyle = 'rgba(255,180,120,0.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(...fr); g.lineTo(...pbr); g.stroke();
  g.strokeStyle = 'rgba(255,160,100,0.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(...fl); g.lineTo(...fm); g.lineTo(...fr); g.stroke();
  // flag pole + banner
  const poleX = 486, poleTop = 156, poleBot = fm[1] - 4;
  g.fillStyle = '#0e0b0c'; g.fillRect(poleX - 4, poleTop, 8, poleBot - poleTop);
  g.strokeStyle = 'rgba(255,170,100,0.65)'; g.lineWidth = 2; g.beginPath(); g.moveTo(poleX + 4, poleTop + 4); g.lineTo(poleX + 4, poleBot); g.stroke();
  g.fillStyle = '#d9a640'; g.beginPath(); g.arc(poleX, poleTop - 5, 8, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,240,200,0.7)'; g.beginPath(); g.arc(poleX + 2, poleTop - 7, 3, 0, TAU); g.fill();
  wardenBanner(g, poleX + 4, poleTop + 8, 112, 112, R);
}

// ---------------- atmosphere: haze, embers, grading ----------------
function atmosphere(g, R) {
  // drifting embers (the game animates more at runtime): mostly glowing motes rising from the east
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 150; i++) {
    const x = W * (0.25 + 0.75 * Math.pow(R(), 0.6)), y = 250 + R() * 1000;
    if (x > 560 && x < 1840 && y < 560) continue; // keep the logo area clean
    const s = 0.7 + R() * 1.8, a = 0.3 + R() * 0.6;
    if (R() < 0.15) { const ang = -1.9 - R() * 0.6, l = 4 + R() * 6; g.strokeStyle = `rgba(255,${130 + R() * 70},60,${a * 0.5})`; g.lineWidth = s * 0.8; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * l, y - Math.sin(-ang) * l); g.stroke(); }
    g.fillStyle = `rgba(255,${170 + R() * 60},${90 + R() * 40},${a})`; g.beginPath(); g.arc(x, y, s * 0.6, 0, TAU); g.fill();
    glowAt(g, x, y, s * 6, [255, 120, 40], a * 0.3);
  }
  for (let i = 0; i < 10; i++) { const x = 1000 + R() * 1400, y = 950 + R() * 350, r = 10 + R() * 18; glowAt(g, x, y, r, [255, 130, 50], 0.1 + R() * 0.1); }
  g.restore();
  // vignette & a darker, calm bottom band for the "touch" prompt
  const vg = g.createRadialGradient(W / 2, H * 0.45, H * 0.45, W / 2, H * 0.5, W * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,6,0.55)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  const bg = g.createLinearGradient(0, 1020, 0, H); bg.addColorStop(0, 'rgba(0,0,6,0)'); bg.addColorStop(1, 'rgba(0,0,6,0.45)');
  g.fillStyle = bg; g.fillRect(0, 1020, W, H - 1020);
}

export async function render(q) { // ?ss=1 for a fast preview (default 2x supersampled terrain), ?raw=1 skips foreground & post
  const SS = +(q.get('ss') || 2);
  const t0 = performance.now();
  const cv = mk(W, H), g = cv.getContext('2d');
  g.drawImage(paintSky(), 0, 0);
  stars(g, rngf(5));
  const t1 = performance.now();
  const terr = renderTerrain(SS);
  g.drawImage(terr.cv, 0, 0);
  { // warm haze over the eastern horizon (veils the distance, not the near wall)
    const hz = g.createRadialGradient(SUN[0], CAM.hy, 40, SUN[0], CAM.hy, 900);
    hz.addColorStop(0, 'rgba(255,120,50,0.16)'); hz.addColorStop(1, 'rgba(255,90,40,0)');
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = hz; g.fillRect(0, 0, W, H); g.restore();
  }
  const t2 = performance.now();
  const els = buildElements(rngf(11));
  drawElements(g, terr, els);
  const t3 = performance.now();
  if (!q.get('raw')) {
    drawForeground(g, rngf(21));
    bloom(cv, { thresh: 0.6, blur: 26, amt: 0.5 });
    atmosphere(g, rngf(31));
    grain(cv, 5, 3);
  }
  console.log(`sky ${(t1 - t0) | 0}ms terrain ${(t2 - t1) | 0}ms elements ${els.length} ${(t3 - t2) | 0}ms total ${(performance.now() - t0) | 0}ms`);
  return [{ name: 'title_bg.jpg', canvas: cv, type: 'jpeg', quality: 0.86 }];
}
