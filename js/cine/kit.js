// Rampart Riot — cinematic drawing kit. Everything is painted procedurally at runtime in a 1920x1080
// "design space" (the cutscene player maps it to the screen with cover-fit), in a silhouette / painterly style.
import { Assets } from '../core/assets.js';
import { HD } from '../core/hd.js';
import { unitFrame } from '../game/renderer.js';
import { clamp, TAU } from '../core/util.js';

export const DW = 1920, DH = 1080;
export const lerp = (a, b, t) => a + (b - a) * t;
export const sm = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };              // smoothstep 0..1
export const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);                          // 0..1 between a and b
export const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const easeIn = t => Math.pow(clamp(t, 0, 1), 3);
export const easeInOut = t => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

export function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// smooth 1-D value noise (for ridges / wobble)
export function noise1(seed) {
  const R = rng(seed), N = 256, v = Array.from({ length: N }, () => R());
  return x => { const i = Math.floor(x), f = x - i, a = v[((i % N) + N) % N], b = v[(((i + 1) % N) + N) % N]; const u = f * f * (3 - 2 * f); return a + (b - a) * u; };
}

// ------------------------------------------------------------------ colour helpers
export function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * clamp(t, 0, 1)).toString(16).padStart(2, '0')).join(''); }
export function rgba(c, a) { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; }

// ------------------------------------------------------------------ skies & atmosphere
export function sky(ctx, stops, y0 = 0, y1 = DH) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [p, c] of stops) g.addColorStop(p, c);
  ctx.fillStyle = g; ctx.fillRect(-DW, -DH, DW * 3, DH * 3);
}
const starCache = new Map();
export function stars(ctx, t, o = {}) {
  const key = (o.seed || 7) + ':' + (o.n || 220);
  let S = starCache.get(key);
  if (!S) { const R = rng(o.seed || 7); S = Array.from({ length: o.n || 220 }, () => ({ x: R() * DW * 1.3 - DW * 0.15, y: R() * DH, r: 0.6 + R() * R() * 2.2, p: R() * TAU, f: 0.6 + R() * 2 })); starCache.set(key, S); }
  const ymax = o.yMax ?? DH * 0.75, a0 = o.alpha ?? 1;
  ctx.save();
  for (const s of S) {
    if (s.y > ymax) continue;
    const fade = 1 - s.y / ymax;
    const a = a0 * fade * (0.55 + 0.45 * Math.sin(t * s.f + s.p));
    if (a <= 0.02) continue;
    ctx.globalAlpha = a; ctx.fillStyle = o.color || '#fff6e8';
    ctx.beginPath(); ctx.arc(s.x + (o.dx || 0), s.y, s.r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
export function glow(ctx, x, y, r, color, a = 1) {
  if (a <= 0 || r <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a, 0, 1);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, 1)); g.addColorStop(0.35, rgba(color, 0.45)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}
export function haze(ctx, y, h, color, a) { // horizontal band of mist
  const g = ctx.createLinearGradient(0, y - h, 0, y + h);
  g.addColorStop(0, rgba(color, 0)); g.addColorStop(0.5, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(-DW, y - h, DW * 3, h * 2);
}
export function vignette(ctx, a = 0.6, color = '#000000') {
  const g = ctx.createRadialGradient(DW / 2, DH / 2, DH * 0.35, DW / 2, DH / 2, DW * 0.72);
  g.addColorStop(0, rgba(color, 0)); g.addColorStop(1, rgba(color, a));
  ctx.fillStyle = g; ctx.fillRect(-DW, -DH, DW * 3, DH * 3);
}
export function tint(ctx, color, a, op = 'source-over') {
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = color; ctx.fillRect(-DW, -DH, DW * 3, DH * 3); ctx.restore();
}
export function godRays(ctx, x, y, n, len, color, a, t, spread = 1.2, base = Math.PI / 2) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const ang = base + (i / (n - 1) - 0.5) * spread + Math.sin(t * 0.3 + i) * 0.02;
    const w = 0.035 + 0.025 * Math.sin(i * 2.3);
    const g = ctx.createLinearGradient(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    g.addColorStop(0, rgba(color, a * (0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.7)))); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang - w) * len, y + Math.sin(ang - w) * len); ctx.lineTo(x + Math.cos(ang + w) * len, y + Math.sin(ang + w) * len);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ terrain silhouettes
// rolling ridge from x0..x1 at baseline y (amp = height of features); filled down to the bottom
export function ridge(ctx, o) {
  const n = noise1(o.seed || 1), amp = o.amp ?? 60, fr = o.freq ?? 0.004, y = o.y, off = o.offset || 0;
  const x0 = o.x0 ?? -DW * 0.5, x1 = o.x1 ?? DW * 1.5, step = o.step || 12;
  ctx.beginPath(); ctx.moveTo(x0, DH * 2);
  for (let x = x0; x <= x1 + step; x += step) {
    const u = (x + off) * fr;
    let h = n(u) * 0.65 + n(u * 2.7 + 9) * 0.25 + n(u * 7.1 + 3) * 0.1;
    if (o.jag) h = Math.pow(h, o.jag);
    ctx.lineTo(x, y - h * amp);
  }
  ctx.lineTo(x1 + step, DH * 2); ctx.closePath();
  if (o.grad) { const g = ctx.createLinearGradient(0, y - amp, 0, y + (o.gradH || 300)); g.addColorStop(0, o.color); g.addColorStop(1, o.grad); ctx.fillStyle = g; }
  else ctx.fillStyle = o.color;
  ctx.fill();
  if (o.rim) { ctx.save(); ctx.strokeStyle = o.rim; ctx.globalAlpha = o.rimA ?? 0.5; ctx.lineWidth = o.rimW || 2; ctx.stroke(); ctx.restore(); }
}
// jagged mountain range (midpoint displacement between major peaks); snow: cap colour; shade: lit faces
export function peaks(ctx, o) {
  const R = rng(o.seed || 3), y = o.y, n = o.n || 7, x0 = o.x0 ?? -200, x1 = o.x1 ?? DW + 200;
  const hmin = o.hmin ?? 160, hmax = o.hmax ?? 380, rough = o.rough ?? 0.42;
  const major = [];
  for (let i = 0; i <= n; i++) major.push([lerp(x0, x1, i / n) + (R() - 0.5) * (x1 - x0) / n * 0.55, y - hmin - R() * (hmax - hmin)]);
  // valleys between peaks, then displacement
  let pts = [[x0, y]];
  for (let i = 0; i < major.length; i++) { if (i) { const a = major[i - 1], b = major[i]; pts.push([(a[0] + b[0]) / 2 + (R() - 0.5) * 40, y - (o.saddle ?? 60) * (0.3 + R())]); } pts.push(major[i]); }
  pts.push([x1, y]);
  for (let pass = 0; pass < 4; pass++) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      out.push([(a[0] + b[0]) / 2 + (R() - 0.5) * d * 0.12, (a[1] + b[1]) / 2 + (R() - 0.5) * d * rough * 0.5]);
      out.push(b);
    }
    pts = out;
  }
  ctx.beginPath(); ctx.moveTo(x0, DH * 2);
  for (const p of pts) ctx.lineTo(p[0], Math.min(p[1], y));
  ctx.lineTo(x1, DH * 2); ctx.closePath();
  if (o.grad) { const g = ctx.createLinearGradient(0, y - hmax, 0, y); g.addColorStop(0, o.color); g.addColorStop(1, o.grad); ctx.fillStyle = g; } else ctx.fillStyle = o.color;
  ctx.fill();
  if (o.snow || o.shade) {
    ctx.save(); ctx.clip();
    if (o.shade) { // light from the upper left: right-hand faces darker, left faces lit
      ctx.globalAlpha = o.shadeA ?? 0.22; ctx.fillStyle = o.shade;
      for (const [px, py] of major) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - (y - py) * 0.9, y); ctx.lineTo(px - (y - py) * 0.1, y); ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    if (o.snow) {
      ctx.fillStyle = o.snow;
      for (const [px, py] of major) {
        const s = (y - py) * 0.3;
        ctx.beginPath(); ctx.moveTo(px, py - 2);
        ctx.lineTo(px - s * 0.95, py + s * 1.05); ctx.lineTo(px - s * 0.55, py + s * 0.8); ctx.lineTo(px - s * 0.35, py + s * 1.1);
        ctx.lineTo(px - s * 0.05, py + s * 0.78); ctx.lineTo(px + s * 0.3, py + s * 1.0); ctx.lineTo(px + s * 0.55, py + s * 0.72); ctx.lineTo(px + s * 0.85, py + s * 0.95);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }
  if (o.rim) { ctx.save(); ctx.strokeStyle = o.rim; ctx.globalAlpha = o.rimA ?? 0.5; ctx.lineWidth = o.rimW || 2; ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(p[0], Math.min(p[1], y)) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore(); }
}
// soft rising smoke column (radial-gradient puffs)
export function smoke(ctx, x, y, t, o = {}) {
  const n = o.n || 16, H = o.h || 700, col = o.color || '#2a1414';
  ctx.save();
  for (let i = 0; i < n; i++) {
    const k = ((t * (o.speed || 0.05)) + i / n) % 1;
    const px = x + Math.sin(i * 1.7 + t * 0.4) * 30 * (1 + k * 3) + (o.drift || -120) * k;
    const py = y - k * H, r = (o.r || 90) * (0.6 + k * 2.4);
    const a = (o.alpha || 0.4) * Math.min(1, k * 6) * (1 - k);
    const g = ctx.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.fillRect(px - r, py - r, r * 2, r * 2);
  }
  ctx.restore();
}
// tree line silhouette (pines or round)
export function treeLine(ctx, o) {
  const R = rng(o.seed || 5), y = o.y, x0 = o.x0 ?? -100, x1 = o.x1 ?? DW + 100, sp = o.spacing || 26;
  ctx.fillStyle = o.color;
  for (let x = x0; x < x1; x += sp * (0.6 + R() * 0.8)) {
    const h = (o.h || 60) * (0.6 + R() * 0.8), yy = y + (R() - 0.5) * (o.jitter || 10);
    if (o.round) { ctx.beginPath(); ctx.arc(x, yy - h * 0.6, h * 0.42, 0, TAU); ctx.arc(x + h * 0.25, yy - h * 0.45, h * 0.32, 0, TAU); ctx.fill(); ctx.fillRect(x - 2, yy - h * 0.3, 4, h * 0.3); }
    else { ctx.beginPath(); ctx.moveTo(x, yy - h); ctx.lineTo(x - h * 0.28, yy); ctx.lineTo(x + h * 0.28, yy); ctx.closePath(); ctx.fill(); }
  }
}

// ------------------------------------------------------------------ the Rampart
// crenellated wall from x0 to x1 standing on ground y (top at y-h). opts: color, light (lit edge colour),
// bricks, runes (0..1 glow), crack (0..1), ivy
export function wall(ctx, x0, x1, y, h, o = {}) {
  const top = y - h, mw = o.merlon || h * 0.14;
  ctx.beginPath(); ctx.moveTo(x0, y + 4); ctx.lineTo(x0, top);
  for (let x = x0; x < x1; x += mw * 2) { ctx.lineTo(x, top - mw * 0.8); ctx.lineTo(Math.min(x1, x + mw), top - mw * 0.8); ctx.lineTo(Math.min(x1, x + mw), top); ctx.lineTo(Math.min(x1, x + mw * 2), top); }
  ctx.lineTo(x1, y + 4); ctx.closePath();
  ctx.fillStyle = o.color || '#1a1620'; ctx.fill();
  if (o.bricks) {
    ctx.save(); ctx.clip(); ctx.strokeStyle = o.bricks; ctx.lineWidth = Math.max(1, h * 0.012); ctx.globalAlpha = o.bricksA ?? 0.35;
    const bh = Math.max(6, h * 0.09);
    for (let yy = top + bh; yy < y; yy += bh) { ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke(); const off = ((yy - top) / bh) % 2 ? bh : 0; for (let xx = x0 + off; xx < x1; xx += bh * 2) { ctx.beginPath(); ctx.moveTo(xx, yy - bh); ctx.lineTo(xx, yy); ctx.stroke(); } }
    ctx.restore();
  }
  if (o.light) { ctx.save(); ctx.globalAlpha = o.lightA ?? 0.4; ctx.fillStyle = o.light; ctx.fillRect(x0, top, x1 - x0, Math.max(2, h * 0.025)); ctx.restore(); }
  if (o.runes > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const R = rng(o.seed || 9);
    for (let x = x0 + h * 0.3; x < x1 - h * 0.2; x += h * 0.55) {
      const yy = top + h * (0.35 + R() * 0.3), s = h * 0.08;
      ctx.globalAlpha = clamp(o.runes * (0.6 + 0.4 * R()), 0, 1);
      ctx.strokeStyle = o.runeColor || '#9fd8ff'; ctx.lineWidth = Math.max(1.5, h * 0.018); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - s, yy - s); ctx.lineTo(x, yy + s); ctx.lineTo(x + s, yy - s); ctx.moveTo(x, yy - s * 1.2); ctx.lineTo(x, yy + s * 0.2); ctx.stroke();
      glow(ctx, x, yy, s * 4, o.runeColor || '#9fd8ff', o.runes * 0.35);
    }
    ctx.restore();
  }
  if (o.ivy) {
    const R = rng(o.seed || 4); ctx.save(); ctx.fillStyle = o.ivy;
    for (let x = x0; x < x1; x += h * 0.18) { const hh = h * (0.2 + R() * 0.6); for (let k = 0; k < 6; k++) { ctx.globalAlpha = 0.5 + R() * 0.4; ctx.beginPath(); ctx.arc(x + (R() - 0.5) * h * 0.1, top + h * 0.1 + R() * hh, h * (0.025 + R() * 0.03), 0, TAU); ctx.fill(); } }
    ctx.restore();
  }
}
// wall following a polyline over the land: pts = [[x, groundY, height], ...] (far to near or any order).
// o: color, top (lit top-edge colour), face (gradient bottom colour), bricks, runes, ivy, merlon (relative)
export function wallAlong(ctx, pts, o = {}) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0, h0] = pts[i], [x1, y1, h1] = pts[i + 1];
    ctx.beginPath(); ctx.moveTo(x0, y0 + 2); ctx.lineTo(x0, y0 - h0);
    // crenellations along the top edge
    const len = Math.abs(x1 - x0), mh = (h0 + h1) / 2 * (o.merlon ?? 0.12), n = Math.max(1, Math.round(len / (mh * 2.2)));
    for (let k = 0; k < n; k++) {
      const a = k / n, b = (k + 0.5) / n, c = (k + 1) / n;
      const xa = lerp(x0, x1, a), ya = lerp(y0 - h0, y1 - h1, a), xb = lerp(x0, x1, b), yb = lerp(y0 - h0, y1 - h1, b), xc = lerp(x0, x1, c), yc = lerp(y0 - h0, y1 - h1, c);
      const m = lerp(h0, h1, a) * (o.merlon ?? 0.12);
      ctx.lineTo(xa, ya - m); ctx.lineTo(xb, yb - m); ctx.lineTo(xb, yb); ctx.lineTo(xc, yc);
    }
    ctx.lineTo(x1, y1 + 2); ctx.closePath();
    if (o.face) { const g = ctx.createLinearGradient(0, Math.min(y0 - h0, y1 - h1), 0, Math.max(y0, y1)); g.addColorStop(0, o.color); g.addColorStop(1, o.face); ctx.fillStyle = g; }
    else ctx.fillStyle = o.color || '#1a1620';
    ctx.fill();
    if (o.bricks) {
      ctx.save(); ctx.clip(); ctx.strokeStyle = o.bricks; ctx.globalAlpha = o.bricksA ?? 0.35; ctx.lineWidth = Math.max(0.8, (h0 + h1) * 0.006);
      for (let r = 1; r < 9; r++) { const f = r / 9; ctx.beginPath(); ctx.moveTo(x0, y0 - h0 * (1 - f)); ctx.lineTo(x1, y1 - h1 * (1 - f)); ctx.stroke(); }
      ctx.restore();
    }
    if (o.top) { ctx.save(); ctx.strokeStyle = o.top; ctx.globalAlpha = o.topA ?? 0.5; ctx.lineWidth = Math.max(1, (h0 + h1) * 0.02); ctx.beginPath(); ctx.moveTo(x0, y0 - h0); ctx.lineTo(x1, y1 - h1); ctx.stroke(); ctx.restore(); }
    if (o.runes > 0) {
      const R = rng((o.seed || 9) + i);
      for (let k = 0; k < 2; k++) {
        const f = (k + 0.5) / 2, xx = lerp(x0, x1, f), yy = lerp(y0 - h0 * 0.55, y1 - h1 * 0.55, f), sz = lerp(h0, h1, f) * 0.09;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(o.runes * (0.6 + 0.4 * R()), 0, 1);
        ctx.strokeStyle = o.runeColor || '#9fd8ff'; ctx.lineWidth = Math.max(1.4, sz * 0.22); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(xx - sz, yy - sz); ctx.lineTo(xx, yy + sz); ctx.lineTo(xx + sz, yy - sz); ctx.moveTo(xx, yy - sz * 1.2); ctx.lineTo(xx, yy + sz * 0.2); ctx.stroke();
        ctx.restore(); glow(ctx, xx, yy, sz * 5, o.runeColor || '#9fd8ff', o.runes * 0.3);
      }
    }
  }
}
// square tower with crenellations; beacon: 0..1 fire intensity
export function tower(ctx, x, y, w, h, o = {}, t = 0) {
  const top = y - h, mw = w / 5;
  ctx.fillStyle = o.color || '#15121a';
  ctx.beginPath(); ctx.moveTo(x - w / 2, y + 4); ctx.lineTo(x - w / 2, top);
  for (let i = 0; i < 5; i++) { const xx = x - w / 2 + i * mw; if (i % 2 === 0) { ctx.lineTo(xx, top - mw * 0.9); ctx.lineTo(xx + mw, top - mw * 0.9); ctx.lineTo(xx + mw, top); } else ctx.lineTo(xx + mw, top); }
  ctx.lineTo(x + w / 2, top); ctx.lineTo(x + w / 2, y + 4); ctx.closePath(); ctx.fill();
  if (o.window) { ctx.fillStyle = o.window; ctx.fillRect(x - w * 0.08, top + h * 0.3, w * 0.16, h * 0.12); glow(ctx, x, top + h * 0.36, w * 0.6, o.window, 0.25); }
  if (o.light) { ctx.save(); ctx.globalAlpha = o.lightA ?? 0.35; ctx.fillStyle = o.light; ctx.fillRect(x - w / 2, top, w * 0.18, h); ctx.restore(); }
  if (o.beacon > 0) beacon(ctx, x, top - mw * 0.9, w * 0.55, o.beacon, t, o.seed || x);
  if (o.banner) banner(ctx, x, top - mw * 0.9, w * 0.9, w * 0.55, t, o.banner);
}
export function beacon(ctx, x, y, s, k, t, seed = 1) {
  if (k <= 0) return;
  glow(ctx, x, y - s * 0.3, s * 6 * k, '#ff8a2a', 0.55 * k);
  glow(ctx, x, y - s * 0.4, s * 2.2 * k, '#ffd27a', 0.8 * k);
  flame(ctx, x, y, s * 1.1 * Math.min(1, k * 1.4), t, seed);
}
// layered flame (additive), base at (x,y)
export function flame(ctx, x, y, s, t, seed = 1) {
  const R = rng(seed | 0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const cols = ['#ff4a10', '#ff8a2a', '#ffd27a', '#fff6d8'];
  for (let L = 0; L < 4; L++) {
    const k = 1 - L * 0.22, ph = R() * TAU;
    ctx.globalAlpha = 0.55 + L * 0.1;
    ctx.fillStyle = cols[L];
    ctx.beginPath();
    const hh = s * 1.6 * k * (0.85 + 0.15 * Math.sin(t * 11 + ph));
    const ww = s * 0.5 * k;
    const sway = Math.sin(t * 6.3 + ph) * s * 0.12;
    ctx.moveTo(x - ww, y);
    ctx.quadraticCurveTo(x - ww * 1.1, y - hh * 0.45, x + sway * 0.5, y - hh * 0.62);
    ctx.quadraticCurveTo(x + sway, y - hh * 0.85, x + sway * 1.4, y - hh);
    ctx.quadraticCurveTo(x + ww * 0.9, y - hh * 0.5, x + ww, y);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// arched gate in a wall; broken: 0..1 (doors blown open)
export function gate(ctx, x, y, w, h, o = {}) {
  ctx.save();
  ctx.fillStyle = o.inside || '#0a0608';
  ctx.beginPath(); ctx.moveTo(x - w / 2, y + 4); ctx.lineTo(x - w / 2, y - h * 0.62); ctx.arc(x, y - h * 0.62, w / 2, Math.PI, 0); ctx.lineTo(x + w / 2, y + 4); ctx.closePath(); ctx.fill();
  if (o.through) { ctx.save(); ctx.clip(); o.through(ctx); ctx.restore(); }
  const b = o.broken || 0;
  if (b < 1) {
    // two leaves of a wooden door filling the arch, swinging inward as `broken` goes to 1
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x - w / 2, y + 4); ctx.lineTo(x - w / 2, y - h * 0.62); ctx.arc(x, y - h * 0.62, w / 2, Math.PI, 0); ctx.lineTo(x + w / 2, y + 4); ctx.closePath(); ctx.clip();
    for (const side of [-1, 1]) {
      const leaf = w / 2 * (1 - b * 0.85);
      const x0 = side < 0 ? x - w / 2 : x + w / 2 - leaf;
      const g = ctx.createLinearGradient(x0, 0, x0 + leaf, 0);
      g.addColorStop(0, o.door || '#2a1a10'); g.addColorStop(1, mix(o.door || '#2a1a10', '#000000', 0.35));
      ctx.fillStyle = g; ctx.fillRect(x0, y - h - w, leaf, h + w + 10);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 3;
      for (let k = 1; k < 4; k++) { const xx = x0 + leaf * k / 4; ctx.beginPath(); ctx.moveTo(xx, y - h - w); ctx.lineTo(xx, y + 4); ctx.stroke(); }
      ctx.fillStyle = 'rgba(20,16,16,0.85)'; for (const yy of [y - h * 0.15, y - h * 0.5]) ctx.fillRect(x0, yy, leaf, Math.max(4, h * 0.03));
    }
    ctx.restore();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ cloth
// waving banner hanging from a pole top at (x,y): colours {field, emblem, edge, light}; emblem 'tower' | 'raven' | 'star'
export function banner(ctx, x, y, w, h, t, c = {}) {
  ctx.save();
  ctx.strokeStyle = c.pole || '#1a1008'; ctx.lineWidth = Math.max(2, w * 0.035); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + h * (c.poleLen ?? 1.6)); ctx.lineTo(x, y - h * 0.12); ctx.stroke();
  ctx.fillStyle = c.edge || '#c8a050'; ctx.beginPath(); ctx.arc(x, y - h * 0.14, Math.max(2, w * 0.03), 0, TAU); ctx.fill();
  const N = 24, top = [], bot = [];
  const amp = c.amp ?? 0.13;
  for (let i = 0; i <= N; i++) {
    const u = i / N, ph = t * 4.0 - u * 6.2, ph2 = t * 2.4 - u * 3.4;
    const dy = (Math.sin(ph) * amp + Math.sin(ph2) * amp * 0.45) * h * u;
    const dx = -Math.abs(Math.sin(ph)) * w * 0.02 * u;
    top.push([x + u * w + dx, y + dy]);
    bot.push([x + u * w + dx, y + h + dy * 1.15 + (c.tail ? Math.max(0, u - 0.7) * h * 0.9 : 0)]);
  }
  ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]);
  for (const p of top) ctx.lineTo(p[0], p[1]);
  if (c.swallow) { const l = top[N], b = bot[N]; ctx.lineTo((l[0] + b[0]) / 2 - w * 0.14, (l[1] + b[1]) / 2); }
  for (let i = N; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
  ctx.closePath();
  const fg = ctx.createLinearGradient(0, y, 0, y + h);
  fg.addColorStop(0, c.field || '#1f3f8a'); fg.addColorStop(1, c.fieldDark || mix(c.field || '#1f3f8a', '#000000', 0.35));
  ctx.fillStyle = fg; ctx.fill();
  ctx.save(); ctx.clip();
  // folds: light on the crests, shadow in the troughs
  for (let i = 0; i < N; i++) {
    const u = i / N, d = Math.cos(t * 4.0 - u * 6.2);
    ctx.fillStyle = d > 0 ? `rgba(255,250,235,${0.13 * d})` : `rgba(0,0,0,${-0.28 * d})`;
    ctx.fillRect(top[i][0], y - h, top[i + 1][0] - top[i][0] + 1, h * 3);
  }
  if (c.light) { const lg = ctx.createLinearGradient(0, y + h * 1.2, 0, y); lg.addColorStop(0, rgba(c.light, 0.45)); lg.addColorStop(1, rgba(c.light, 0)); ctx.fillStyle = lg; ctx.fillRect(x - w, y - h, w * 3, h * 3); }
  if (c.emblem) {
    const mi = Math.round(N * 0.46), ex = top[mi][0], ey = (top[mi][1] + bot[mi][1]) / 2, s = h * 0.33;
    const sq = 0.9 + 0.1 * Math.cos(t * 4.0 - 0.46 * 6.2);
    ctx.save(); ctx.translate(ex, ey); ctx.scale(sq, 1); ctx.translate(-ex, -ey);
    ctx.fillStyle = c.emblemColor || '#f2efe6';
    if (c.emblem === 'tower') {
      ctx.beginPath(); ctx.moveTo(ex - s * 0.42, ey + s * 0.85); ctx.lineTo(ex - s * 0.36, ey - s * 0.5); ctx.lineTo(ex + s * 0.36, ey - s * 0.5); ctx.lineTo(ex + s * 0.42, ey + s * 0.85); ctx.closePath(); ctx.fill();
      for (let k = 0; k < 3; k++) ctx.fillRect(ex - s * 0.5 + k * s * 0.38, ey - s * 0.82, s * 0.24, s * 0.36);
      ctx.fillRect(ex - s * 0.5, ey - s * 0.52, s, s * 0.12);
      ctx.fillStyle = c.fieldDark || mix(c.field || '#1f3f8a', '#000000', 0.35);
      ctx.beginPath(); ctx.moveTo(ex - s * 0.14, ey + s * 0.85); ctx.lineTo(ex - s * 0.14, ey + s * 0.5); ctx.arc(ex, ey + s * 0.5, s * 0.14, Math.PI, 0); ctx.lineTo(ex + s * 0.14, ey + s * 0.85); ctx.fill();
      ctx.fillRect(ex - s * 0.05, ey - s * 0.18, s * 0.1, s * 0.22);
    } else if (c.emblem === 'raven') raven(ctx, ex, ey, s * 1.1, c.emblemColor || '#111');
    else if (c.emblem === 'star') starShape(ctx, ex, ey, s * 0.8, s * 0.32, 8, c.emblemColor || '#fff');
    ctx.restore();
  }
  ctx.restore();
  // gold border and fringe
  if (c.edge) {
    ctx.strokeStyle = c.edge; ctx.lineWidth = Math.max(1.5, h * 0.035); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]); for (const p of top) ctx.lineTo(p[0], p[1]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bot[0][0], bot[0][1]); for (const p of bot) ctx.lineTo(p[0], p[1]); ctx.stroke();
    ctx.lineWidth = Math.max(1, h * 0.012);
    for (let i = 0; i <= N; i += 1) { const p = bot[i]; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + Math.sin(t * 5 + i) * 2, p[1] + h * 0.06); ctx.stroke(); }
  }
  ctx.restore();
}
export function starShape(ctx, x, y, r, ri, n, color) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? ri : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}
// House Morrow's crowned raven (heraldic silhouette, facing left)
export function raven(ctx, x, y, s, color = '#111') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100); ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-38, -18); ctx.lineTo(-58, -12); ctx.lineTo(-36, -8);                 // beak
  ctx.quadraticCurveTo(-30, 8, -12, 12); ctx.quadraticCurveTo(10, 16, 30, 6);      // breast
  ctx.lineTo(56, 22); ctx.lineTo(48, 4); ctx.lineTo(60, 2); ctx.lineTo(34, -6);    // tail
  ctx.quadraticCurveTo(20, -30, -6, -26); ctx.quadraticCurveTo(-20, -34, -30, -26); // back & head
  ctx.closePath(); ctx.fill();
  ctx.fillRect(-14, 10, 4, 18); ctx.fillRect(-4, 10, 4, 18);                         // legs
  ctx.beginPath(); ctx.moveTo(-40, -32); ctx.lineTo(-36, -44); ctx.lineTo(-30, -36); ctx.lineTo(-24, -46); ctx.lineTo(-18, -36); ctx.lineTo(-12, -44); ctx.lineTo(-10, -30); ctx.closePath(); ctx.fill(); // crown
  ctx.restore();
}

// ------------------------------------------------------------------ figures
// sprite silhouettes: cached tinted copies of atlas frames
const silCache = new WeakMap(); // frame -> Map(color -> canvas); freed with the frame (HD atlases are unloaded)
function silFrame(f, color) {
  let m = silCache.get(f);
  if (!m) { m = new Map(); silCache.set(f, m); }
  let c = m.get(color);
  if (!c) {
    c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
    const g = c.getContext('2d');
    g.drawImage(f.img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, f.w, f.h);
    m.set(color, c);
  }
  return c;
}
// draw an animated sprite (sprite name + anim + time) at (x,y) scaled; color => silhouette
export function figure(ctx, sprite, anim, t, x, y, scale, o = {}) {
  const f = unitFrame(sprite, anim, t);
  if (!f) return false;
  const s = f.s * scale;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y); if (o.flip) ctx.scale(-1, 1);
  if (o.rim) { ctx.save(); ctx.globalAlpha *= o.rimA ?? 0.8; ctx.drawImage(silFrame(f, o.rim), -f.ox * s + (o.rimX ?? -2.5), -f.oy * s + (o.rimY ?? -1.5), f.w * s, f.h * s); ctx.restore(); }
  if (o.color) ctx.drawImage(silFrame(f, o.color), -f.ox * s, -f.oy * s, f.w * s, f.h * s);
  else ctx.drawImage(f.img, f.x, f.y, f.w, f.h, -f.ox * s, -f.oy * s, f.w * s, f.h * s);
  ctx.restore();
  return true;
}
// a marching column of silhouettes along a line (wraps around for endless processions)
export function procession(ctx, t, o) {
  const R = rng(o.seed || 11), types = o.types, n = o.n || 24, span = o.x1 - o.x0;
  for (let i = 0; i < n; i++) {
    const ty = types[Math.floor(R() * types.length)];
    const phase = R(), sc = (o.scale || 1) * (0.85 + R() * 0.3);
    let x = o.x0 + ((phase * span + t * (o.speed || 40) * (0.9 + R() * 0.2)) % span);
    const y = o.y + (R() - 0.5) * (o.jitter || 10) + (o.slope ? (x - o.x0) * o.slope : 0);
    figure(ctx, ty.sprite, 'walk', t * (0.9 + R() * 0.2) + R() * 3, x, y, sc * (ty.scale || 1), { color: o.color, flip: o.flip, alpha: o.alpha, rim: o.rim, rimA: o.rimA, rimX: o.flip ? 2 : -2 });
  }
}
// regal silhouette (crowned woman, bell gown, narrow wind-blown cape), ~200 units tall at s=100;
// arms: 0 lowered .. 1 raised in a V
export function queen(ctx, x, y, s, o = {}, t = 0) {
  const A = clamp(o.arms ?? 0, 0, 1), col = o.color || '#0d0b12', w = Math.sin(t * 1.3) * 4, w2 = Math.sin(t * 2.1 + 1) * 3;
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // narrow cape behind, lifted by the wind
  ctx.beginPath(); ctx.moveTo(8, -150); ctx.bezierCurveTo(30, -140, 46 + w, -100, 58 + w * 1.6, -46 + w2);
  ctx.bezierCurveTo(64 + w * 2, -24, 60 + w, -8, 54 + w, 0); ctx.lineTo(24, 0); ctx.bezierCurveTo(26, -40, 18, -90, 4, -120); ctx.closePath(); ctx.fill();
  // bell gown with a short train
  ctx.beginPath(); ctx.moveTo(-12, -112); ctx.bezierCurveTo(-18, -70, -30, -26, -40, 0); ctx.lineTo(58, 0); ctx.bezierCurveTo(36, -6, 22, -60, 12, -112); ctx.closePath(); ctx.fill();
  // bodice, neck, head
  ctx.beginPath(); ctx.moveTo(-14, -150); ctx.lineTo(14, -150); ctx.lineTo(11, -110); ctx.lineTo(-11, -110); ctx.closePath(); ctx.fill();
  ctx.fillRect(-3.5, -162, 7, 14);
  ctx.beginPath(); ctx.ellipse(0, -171, 9, 11, 0, 0, TAU); ctx.fill();
  // crown and a short veil
  ctx.beginPath(); ctx.moveTo(-9, -179); ctx.lineTo(-10, -191); ctx.lineTo(-5, -185); ctx.lineTo(-1.5, -197); ctx.lineTo(2, -185); ctx.lineTo(6.5, -192); ctx.lineTo(10, -185); ctx.lineTo(9, -179); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(3, -181); ctx.bezierCurveTo(16, -176, 24 + w, -160, 30 + w * 1.4, -140 + w2); ctx.lineTo(14, -150); ctx.lineTo(4, -160); ctx.closePath(); ctx.fill();
  // arms: shoulder -> elbow -> hand
  for (const sd of [-1, 1]) {
    const sh = [sd * 13, -147];
    const el = [lerp(sd * 19, sd * 34, A), lerp(-124, -184, A)];
    const hd = [lerp(sd * 20, sd * 54, A), lerp(-102, -220, A)];
    ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.quadraticCurveTo(el[0], el[1], hd[0], hd[1]); ctx.stroke();
    // open hand
    ctx.lineWidth = 2.6;
    for (let f = -1; f <= 1; f++) { const a = Math.atan2(hd[1] - el[1], hd[0] - el[0]) + f * 0.32; ctx.beginPath(); ctx.moveTo(hd[0], hd[1]); ctx.lineTo(hd[0] + Math.cos(a) * 8, hd[1] + Math.sin(a) * 8); ctx.stroke(); }
    // cuff drape
    ctx.beginPath(); ctx.moveTo(el[0], el[1]); ctx.lineTo(lerp(el[0], hd[0], 0.55), lerp(el[1], hd[1], 0.55)); ctx.lineTo(el[0] + sd * 3 + w2 * 0.6, el[1] + 18 + 6 * A); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// generic human silhouette standing / walking (cloak optional); dir 1 = facing right
export function person(ctx, x, y, s, o = {}, t = 0) {
  const col = o.color || '#0b0a0e', walk = o.walk || 0, ph = t * 6;
  ctx.save(); ctx.translate(x, y); ctx.scale((o.dir || 1) * s / 100, s / 100); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
  const bob = walk ? Math.abs(Math.sin(ph)) * 3 : 0;
  // legs
  ctx.lineWidth = 11;
  const l1 = walk ? Math.sin(ph) * 0.45 : 0.08, l2 = walk ? -Math.sin(ph) * 0.45 : -0.08;
  for (const a of [l1, l2]) { ctx.beginPath(); ctx.moveTo(0, -78 - bob); ctx.lineTo(Math.sin(a) * 40, -40 - bob + Math.abs(Math.sin(a)) * 4); ctx.lineTo(Math.sin(a) * 52, 0); ctx.stroke(); }
  // torso & cloak
  ctx.beginPath(); ctx.moveTo(-14, -140 - bob); ctx.lineTo(14, -140 - bob); ctx.lineTo(16, -76 - bob); ctx.lineTo(-16, -76 - bob); ctx.closePath(); ctx.fill();
  if (o.cloak) { ctx.beginPath(); ctx.moveTo(-12, -138 - bob); ctx.quadraticCurveTo(-40 - walk * 10, -90, -44 - walk * 16 + Math.sin(t * 3) * 5, -20); ctx.lineTo(-8, -40); ctx.closePath(); ctx.fill(); }
  if (o.robe) { ctx.beginPath(); ctx.moveTo(-16, -90 - bob); ctx.lineTo(16, -90 - bob); ctx.lineTo(30, -6); ctx.lineTo(-30, -6); ctx.closePath(); ctx.fill(); }
  // arms
  ctx.lineWidth = 9;
  const a1 = o.reach ?? (walk ? -Math.sin(ph) * 0.4 : 0.1);
  ctx.beginPath(); ctx.moveTo(0, -132 - bob); ctx.lineTo(Math.sin(a1) * 34 + (o.reach !== undefined ? 30 * o.reach : 0), -98 - bob - (o.reach || 0) * 30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -132 - bob); ctx.lineTo(-Math.sin(a1) * 30, -98 - bob); ctx.stroke();
  // head
  ctx.beginPath(); ctx.arc(2, -156 - bob, 13, 0, TAU); ctx.fill();
  if (o.hair) { ctx.beginPath(); ctx.moveTo(-8, -166 - bob); ctx.quadraticCurveTo(-26, -150 - bob, -22 + Math.sin(t * 3) * 4, -122 - bob); ctx.lineTo(-6, -146 - bob); ctx.closePath(); ctx.fill(); }
  if (o.helm) { ctx.beginPath(); ctx.arc(2, -160 - bob, 15, Math.PI, 0); ctx.fill(); }
  if (o.cane) { ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(34, -96); ctx.lineTo(44, 0); ctx.stroke(); }
  ctx.restore();
}

// ------------------------------------------------------------------ props for close-ups
export function shard(ctx, x, y, s, t, a = 1) {
  glow(ctx, x, y, s * 4, '#b88aff', 0.35 * a * (0.8 + 0.2 * Math.sin(t * 3)));
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.3);
  ctx.beginPath(); ctx.moveTo(0, -s * 1.2); ctx.lineTo(s * 0.45, -s * 0.2); ctx.lineTo(s * 0.25, s * 0.9); ctx.lineTo(-s * 0.35, s * 0.6); ctx.lineTo(-s * 0.5, -s * 0.3); ctx.closePath();
  const g = ctx.createLinearGradient(-s, -s, s, s); g.addColorStop(0, '#2a2236'); g.addColorStop(0.5, '#0a0810'); g.addColorStop(1, '#3a2a4a');
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = rgba('#d8c0ff', 0.6 * a); ctx.lineWidth = s * 0.05; ctx.stroke();
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#c9a8ff', 0.5 + 0.3 * Math.sin(t * 5)); ctx.lineWidth = s * 0.04;
  ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.8); ctx.lineTo(s * 0.1, -s * 0.1); ctx.lineTo(-s * 0.05, s * 0.5); ctx.stroke();
  ctx.restore();
}
export function signetRing(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y);
  // band
  ctx.lineWidth = s * 0.22; ctx.strokeStyle = '#8a6a2a'; ctx.beginPath(); ctx.ellipse(0, s * 0.55, s * 0.95, s * 0.5, 0, 0, TAU); ctx.stroke();
  ctx.lineWidth = s * 0.08; ctx.strokeStyle = '#e8c870'; ctx.beginPath(); ctx.ellipse(0, s * 0.5, s * 0.95, s * 0.5, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  // bezel
  const g = ctx.createRadialGradient(-s * 0.2, -s * 0.25, s * 0.05, 0, 0, s * 0.75);
  g.addColorStop(0, '#fff0b8'); g.addColorStop(0.45, '#c89a3a'); g.addColorStop(1, '#5a3a10');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.72, s * 0.62, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#4a0e1e'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.56, s * 0.47, 0, 0, TAU); ctx.fill();
  raven(ctx, 0, s * 0.06, s * 0.75, '#0a0608');
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2);
  ctx.fillStyle = 'rgba(255,240,200,0.6)'; ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.3, s * 0.14, s * 0.06, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
}
export function emberCrown(ctx, x, y, s, t, fire = 1) {
  if (fire > 0) { glow(ctx, x, y - s * 0.3, s * 3, '#ff7a20', 0.5 * fire); for (let i = 0; i < 5; i++) flame(ctx, x - s * 0.6 + i * s * 0.3, y - s * 0.45, s * 0.28 * fire * (0.8 + 0.4 * ((i * 7) % 3) / 2), t, i + 3); }
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.moveTo(-s * 0.75, 0); ctx.lineTo(-s * 0.75, -s * 0.35);
  for (let i = 0; i < 5; i++) { const xx = -s * 0.75 + i * s * 0.375; ctx.lineTo(xx + s * 0.19, -s * (i % 2 ? 0.6 : 0.85)); ctx.lineTo(xx + s * 0.375, -s * 0.35); }
  ctx.lineTo(s * 0.75, 0); ctx.closePath();
  const g = ctx.createLinearGradient(0, -s, 0, 0); g.addColorStop(0, '#5a5a62'); g.addColorStop(1, '#1a1a20');
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#0a0a0e'; ctx.lineWidth = s * 0.05; ctx.stroke();
  ctx.fillStyle = '#ff6a1a'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-s * 0.4 + i * s * 0.4, -s * 0.18, s * 0.07, 0, TAU); ctx.fill(); }
  ctx.restore();
}
// the fallen star: white-hot core with halo and slow rays
export function starCore(ctx, x, y, r, t, k = 1) {
  glow(ctx, x, y, r * 9 * k, '#ff7a2a', 0.35 * k);
  glow(ctx, x, y, r * 4.5 * k, '#ffd27a', 0.6 * k);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU + t * 0.15, l = r * (3 + 1.5 * Math.sin(t * 1.3 + i * 2.1)) * k;
    ctx.globalAlpha = 0.25 * k; ctx.strokeStyle = '#fff2c8'; ctx.lineWidth = r * 0.12;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  ctx.restore();
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#fff6d0'); g.addColorStop(1, 'rgba(255,220,140,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

// ------------------------------------------------------------------ particles
export class Particles {
  constructor(o = {}) { this.o = o; this.p = []; this.acc = 0; this.R = rng(o.seed || 21); }
  emit(n = 1, at = null) {
    const o = this.o, R = this.R;
    for (let i = 0; i < n; i++) {
      const x = at ? at.x + (R() - 0.5) * (at.w || 0) : (o.x0 ?? -100) + R() * ((o.x1 ?? DW + 100) - (o.x0 ?? -100));
      const y = at ? at.y + (R() - 0.5) * (at.h || 0) : (o.y0 ?? -40) + R() * ((o.y1 ?? DH + 40) - (o.y0 ?? -40));
      this.p.push({ x, y, vx: (o.vx || 0) + (R() - 0.5) * (o.vxr || 0), vy: (o.vy || 0) + (R() - 0.5) * (o.vyr || 0), t: 0, life: (o.life || 4) * (0.6 + R() * 0.8),
        s: (o.size || 3) * (0.5 + R()), ph: R() * TAU, rot: R() * TAU, vr: (R() - 0.5) * (o.spin || 0) });
    }
  }
  prefill(sec) { for (let k = 0; k < sec * 30; k++) this.update(1 / 30); }
  update(dt) {
    const o = this.o;
    if (o.rate) { this.acc += o.rate * dt; while (this.acc >= 1) { this.emit(1, o.at || null); this.acc -= 1; } }
    for (const q of this.p) {
      q.t += dt; q.vy += (o.g || 0) * dt; q.vx *= 1 - (o.drag || 0) * dt; q.vy *= 1 - (o.drag || 0) * dt;
      q.x += (q.vx + Math.sin(q.t * (o.wob || 1.3) + q.ph) * (o.sway || 0)) * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
    }
    if (this.p.length > (o.max || 400)) this.p.splice(0, this.p.length - (o.max || 400));
    this.p = this.p.filter(q => q.t < q.life);
  }
  draw(ctx, alpha = 1) {
    const o = this.o;
    ctx.save();
    if (o.add) ctx.globalCompositeOperation = 'lighter';
    for (const q of this.p) {
      const u = q.t / q.life, a = alpha * Math.min(1, u * 5) * (1 - u) * (o.alpha ?? 1) * (o.twinkle ? 0.6 + 0.4 * Math.sin(q.t * 9 + q.ph) : 1);
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      if (o.kind === 'ember') { ctx.fillStyle = o.color || '#ffb050'; ctx.beginPath(); ctx.arc(q.x, q.y, q.s * 0.6, 0, TAU); ctx.fill(); ctx.globalAlpha = a * 0.35; ctx.beginPath(); ctx.arc(q.x, q.y, q.s * 1.8, 0, TAU); ctx.fill(); }
      else if (o.kind === 'chunk') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = o.color || '#1a1418'; ctx.fillRect(-q.s / 2, -q.s / 2, q.s, q.s * 0.7); ctx.restore(); }
      else if (o.kind === 'streak') { ctx.strokeStyle = o.color || '#fff'; ctx.lineWidth = q.s * 0.4; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.05, q.y - q.vy * 0.05); ctx.stroke(); }
      else { ctx.fillStyle = o.color || '#ffffff'; ctx.beginPath(); ctx.arc(q.x, q.y, q.s, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }
}

// cover-fit image (map / painting) into design space with a camera (cx, cy in image px, zoom)
export function plate(ctx, url, cx, cy, zoom, o = {}) {
  const base = Assets.img(url);
  if (!base) { ctx.fillStyle = o.fallback || '#101014'; ctx.fillRect(0, 0, DW, DH); return false; }
  const k = Math.max(DW / base.width, DH / base.height) * zoom;
  // HD copy (js/core/hd.js) once the painting would be stretched; the camera stays in the base image's pixels
  const img = HD.image(url, HD.needed(1, k * HD.px(ctx)));
  ctx.drawImage(img, DW / 2 - cx * k, DH / 2 - cy * k, base.width * k, base.height * k);
  return k;
}
// bust portrait (portraits atlas), optionally mirrored; size = on-screen height of the 128-unit box
export function portrait(ctx, id, x, y, size, o = {}) {
  const base = Assets.frame('portrait/' + id);
  const f = Assets.frame('hdp/' + id) || base;   // HD bust (hdp_<id>) once loaded
  if (!f) return;
  if (f === base && HD.needed(1, base.s * (size / 128) * HD.px(ctx))) HD.want('hdp_' + id);
  const k = size / 128, s = f.s * k;
  ctx.save(); if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y); if (o.flip) ctx.scale(-1, 1);
  ctx.drawImage(f.img, f.x, f.y, f.w, f.h, -f.ox * s, -f.oy * s, f.w * s, f.h * s);
  if (o.dim) { ctx.globalAlpha *= o.dim; ctx.drawImage(silFrame(f, o.dimColor || '#06050a'), -f.ox * s, -f.oy * s, f.w * s, f.h * s); }
  ctx.restore();
}
