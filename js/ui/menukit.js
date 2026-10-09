// Rampart Riot — shared kit for the out-of-battle screens (slots, world map, upgrades, heroes, encyclopedia,
// achievements, credits): sizing helpers, buttons with generous touch targets, title ribbon, cached animated
// backdrops, inertial scroll views, modal popups, confirm dialog, achievement toasts and sprite fitting.
import { Screen } from '../core/screen.js';
import { Audio } from '../core/audio.js';
import { Save } from '../core/save.js';
import { Assets, drawFrame } from '../core/assets.js';
import { t, getLang } from '../core/i18n.js';
import { clamp, lerp, TAU, Ease, RNG } from '../core/util.js';
import { panel, text, button, circleButton, roundRect, wrap, font } from '../render/draw.js';
import { drawIcon } from '../render/icons.js';
import { UI } from './widgets.js';
import { unitFrame } from '../game/renderer.js';
import { Achievements } from '../meta/achievements.js';

export const TOUCH = 44;          // minimum touch target (CSS px)
export const MAX_STARS = 160;     // 32 stages x (3 campaign + heroic + iron)
export const COL = { ink: '#3a2412', soft: '#6a4626', head: '#4a1c0a', cream: '#fff2d6', gold: '#ffd96a', stroke: '#2a1606', good: '#2f6a1a', bad: '#a8321e' };

// ---------------------------------------------------------------- sizing & text
export const sz = n => n * Screen.uiScale;
export function fz(n, min = 10) { return Math.max(min, n * Screen.uiScale); }

let _mc = null;
export function mctx() { if (!_mc) _mc = document.createElement('canvas').getContext('2d'); return _mc; }
export function textW(s, size, weight = 700, fam = 'sans') { const c = mctx(); c.font = font(size, weight, fam); return c.measureText(s).width; }
export function lines(s, maxW, size, weight = 600, fam = 'sans') { return wrap(mctx(), s, maxW, size, weight, fam); }

// single line, shrinking the font (down to 70%) before squeezing with maxWidth
export function fitText(ctx, s, x, y, maxW, o = {}) {
  let size = o.size || 20;
  const w = textW(s, size, o.weight ?? 700, o.fam || 'sans');
  if (w > maxW && w > 0) size = Math.max(size * 0.7, size * maxW / w);
  text(ctx, s, x, y, Object.assign({}, o, { size, maxWidth: Math.max(1, maxW) }));
  return size;
}

// wrapped paragraph (top baseline); o.max limits the line count (last line gets an ellipsis). Returns height.
export function para(ctx, s, x, y, maxW, o = {}) {
  const size = o.size || 18, lh = o.lh || size * 1.38, weight = o.weight ?? 600, fam = o.fam || 'sans';
  const ls = wrap(ctx, s, maxW, size, weight, fam);
  const n = o.max ? Math.min(o.max, ls.length) : ls.length;
  for (let i = 0; i < n; i++) {
    let ln = ls[i];
    if (i === n - 1 && n < ls.length) { ctx.font = font(size, weight, fam); while (ln.length > 1 && ctx.measureText(ln + '…').width > maxW) ln = ln.slice(0, -1); ln += '…'; }
    text(ctx, ln, x, y + i * lh, Object.assign({ baseline: 'top' }, o, { size, weight, fam }));
  }
  return n * lh;
}
export function paraH(s, maxW, size, o = {}) { const n = lines(s, maxW, size, o.weight ?? 600, o.fam || 'sans').length; return (o.max ? Math.min(o.max, n) : n) * (o.lh || size * 1.38); }

let _cursor = '';
export function setCursor(c) { if (c === _cursor || !Screen.canvas) return; _cursor = c; Screen.canvas.style.cursor = c; }

export function inRect(p, r) { return !!r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }
export function roman(n) { return ['', 'I', 'II', 'III', 'IV', 'V'][n] || String(n); }

// ---------------------------------------------------------------- navigation
// go to a (lazily loaded) scene; if it cannot be loaded (e.g. not shipped yet) run the fallback instead
export function goSafe(app, scene, params = {}, fallback = null) {
  return Promise.resolve(app.go(scene, params)).then(() => { if (!app.registry[scene] && fallback) fallback(); });
}

// ---------------------------------------------------------------- save helpers
export function ensureSlot() {
  if (Save.slot) return Save.slot;
  let best = -1, at = -1;
  Save.data.slots.forEach((s, i) => { if (s && (s.lastPlayed || 0) > at) { at = s.lastPlayed || 0; best = i; } });
  return Save.selectSlot(best >= 0 ? best : 0);
}
export function tickPlayTime(dt) { const s = Save.slot; if (s) s.playTime = (s.playTime || 0) + dt; }
// battles are timed by wall clock from the moment the map launches them (capped, in case the tab was closed)
export function markBattleStart() { const s = Save.slot; if (s) s.battleStart = Date.now(); }
export function settleBattleTime() {
  const s = Save.slot; if (!s || !s.battleStart) return;
  const el = (Date.now() - s.battleStart) / 1000;
  if (el > 0 && el < 3600) s.playTime = (s.playTime || 0) + el;
  delete s.battleStart;
}
export function fmtPlayTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return getLang() === 'ko' ? (h ? `${h}시간 ${m}분` : `${m}분`) : (h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`);
}
export function achText(a) { return a[getLang()] || a.en || a.ko || ['', '']; }

// optional atlases (portraits, later enemy sets): load once per session, never throw
const tried = new Map();
export function loadAtlasSafe(name) {
  if (!tried.has(name)) {
    const p = Assets.loadAtlas(name).catch(() => null);
    tried.set(name, p);
    p.then(a => { if (!a) setTimeout(() => tried.delete(name), 20000); }); // allow a later retry
  }
  return tried.get(name);
}

// ---------------------------------------------------------------- buttons
// Rectangular glossy button. Hit box is padded so small buttons still give a 44 px target.
export function btn(x, y, w, h, label, onTap, o = {}) {
  return {
    x, y, w, h, label, onTap, o, layer: o.layer, sound: o.sound, enabled: o.enabled ?? true,
    color: o.color || 'green', icon: o.icon || null, size: o.size || 0, fam: o.fam,
    get pad() { return Math.max(3, (TOUCH - Math.min(this.w, this.h)) / 2 + 1); },
    draw(ctx, it, pressed, hover) { drawBtn(ctx, it, pressed, hover); },
  };
}
export function drawBtn(ctx, it, pressed, hover) {
  const { x, y, w, h } = it, o = it.o || {};
  const dis = !it.enabled;
  const color = typeof it.color === 'function' ? it.color(it) : it.color;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (pressed && !dis) { ctx.translate(x + w / 2, y + h / 2); ctx.scale(0.95, 0.95); ctx.translate(-(x + w / 2), -(y + h / 2)); }
  button(ctx, x, y, w, h, { color, disabled: dis && !o.keepColor, radius: o.radius });
  if (hover && !dis) { roundRect(ctx, x + 2, y + 2, w - 4, h - 4, Math.min(h * 0.3, 15)); ctx.fillStyle = 'rgba(255,245,210,0.14)'; ctx.fill(); }
  const lab = typeof it.label === 'function' ? it.label(it) : it.label;
  const icon = typeof it.icon === 'function' ? it.icon(it) : it.icon;
  const fs = Math.max(10, it.size || h * 0.42);
  const isz = icon ? h * (o.iconScale || 0.66) : 0, gap = icon && lab ? h * 0.12 : 0;
  const maxLw = Math.max(10, w - h * 0.45 - isz - gap);
  let lw = lab ? textW(lab, fs, 800, it.fam || 'sans') : 0;
  const fs2 = lw > maxLw ? Math.max(fs * 0.72, fs * maxLw / lw) : fs;
  lw = Math.min(maxLw, lab ? textW(lab, fs2, 800, it.fam || 'sans') : 0);
  let cx = x + w / 2 - (isz + gap + lw) / 2;
  if (icon) { if (dis) iconGray(ctx, icon, cx + isz / 2, y + h / 2, isz); else drawIcon(ctx, icon, cx + isz / 2, y + h / 2, isz); cx += isz + gap; }
  if (lab) text(ctx, lab, cx, y + h / 2 + 1, { size: fs2, color: dis ? '#e2dccf' : (o.textColor || '#fffbe8'), stroke: 'rgba(30,18,6,0.85)', strokeWidth: fs2 * 0.2, weight: 800, maxWidth: maxLw, fam: it.fam });
  if (o.after) o.after(ctx, it, pressed);
  ctx.restore();
}

// Round icon button with optional caption below and a red badge.
export function roundBtn(cx, cy, r, icon, onTap, o = {}) {
  return {
    x: cx, y: cy, r, icon, onTap, o, layer: o.layer, sound: o.sound, enabled: o.enabled ?? true, label: o.label || null,
    badge: o.badge || null, color: o.color || 'dark', iconScale: o.iconScale || 1.12,
    hitTest(px, py) { const rr = Math.max(this.r * 1.12, TOUCH / 2); const dx = px - this.x, dy = py - this.y; return dx * dx + dy * dy <= rr * rr; },
    draw(ctx, it, pressed, hover) {
      const { x, y, r } = it, dis = !it.enabled;
      const col = typeof it.color === 'function' ? it.color(it) : it.color;
      circleButton(ctx, x, y, r, { pressed, color: col, disabled: dis });
      ctx.save();
      if (pressed) { ctx.translate(x, y); ctx.scale(0.92, 0.92); ctx.translate(-x, -y); }
      const ic = typeof it.icon === 'function' ? it.icon(it) : it.icon;
      if (ic) { if (dis) iconGray(ctx, ic, x, y, r * it.iconScale); else drawIcon(ctx, ic, x, y, r * it.iconScale); }
      ctx.restore();
      if (hover && !dis) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.16; ctx.fillStyle = '#ffe8b0'; ctx.beginPath(); ctx.arc(x, y, r * 0.82, 0, TAU); ctx.fill(); ctx.restore(); }
      const lab = typeof it.label === 'function' ? it.label() : it.label;
      if (lab) text(ctx, lab, x, y + r + fz(11, 7), { size: fz(15, 10), align: 'center', color: '#fff2d6', stroke: '#1a0e06', strokeWidth: fz(4, 2.6), weight: 800 });
      const b = it.badge ? it.badge() : null;
      if (b) badge(ctx, x + r * 0.76, y - r * 0.72, Math.max(r * 0.34, 8), String(b));
    },
  };
}
export function badge(ctx, x, y, r, s) {
  const w = Math.max(r * 2, textW(s, r * 1.15, 900) + r * 0.9);
  roundRect(ctx, x - w / 2, y - r, w, r * 2, r);
  ctx.fillStyle = '#d8342a'; ctx.fill(); ctx.lineWidth = Math.max(1.5, r * 0.2); ctx.strokeStyle = '#2a0b05'; ctx.stroke();
  text(ctx, s, x, y + r * 0.06, { size: r * 1.15, align: 'center', color: '#fff', weight: 900 });
}

// standard back button (top-left, inside the safe area)
export function backBtn(onTap, o = {}) {
  const U = Screen.uiScale, r = Math.max(32 * U, 19);
  return roundBtn(Screen.safe.l + 14 * U + r, Screen.safe.t + 12 * U + r, r, 'back', onTap, Object.assign({ sound: 'ui_close' }, o));
}
// segmented control: returns UI items; o.get() -> current value, o.set(v)
export function segmented(x, y, w, h, opts, o) {
  const n = opts.length, gap = Math.max(3, h * 0.08), bw = (w - gap * (n - 1)) / n;
  return opts.map((op, i) => btn(x + i * (bw + gap), y, bw, h, op.label, () => o.set(op.value), {
    color: () => (o.get() === op.value ? (o.on || 'gold') : 'dark'), icon: op.icon, size: o.size, layer: o.layer,
    sound: o.sound, enabled: op.enabled, keepColor: true, textColor: op.textColor,
  }));
}

// ---------------------------------------------------------------- cached sprites: stars, glow dots, gray icons
const spriteCache = new Map();
function cached(key, w, h, paint) {
  let c = spriteCache.get(key);
  if (c) return c;
  const dpr = Screen.dpr;
  c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * dpr)); c.height = Math.max(1, Math.ceil(h * dpr));
  const g = c.getContext('2d'); g.scale(dpr, dpr); paint(g, w, h);
  spriteCache.set(key, c);
  if (spriteCache.size > 200) spriteCache.delete(spriteCache.keys().next().value);
  return c;
}
export function starPath(g, cx, cy, r, inner = 0.48) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 === 0 ? r : r * inner; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  g.closePath();
}
// star sprite (filled gold or empty socket), drawn centered at (x, y) with outer radius r
export function starIcon(ctx, x, y, r, filled = true, alpha = 1) {
  const R = Math.max(2, Math.round(r * 4) / 4), pad = R * 0.3;
  const c = cached(`star:${R}:${filled}:${Screen.dpr}`, (R + pad) * 2, (R + pad) * 2, (g, w) => {
    const cx = w / 2;
    starPath(g, cx, cx, R); g.lineJoin = 'round'; g.lineWidth = Math.max(1.4, R * 0.18); g.strokeStyle = '#3a2208';
    if (filled) { const gr = g.createLinearGradient(0, cx - R, 0, cx + R); gr.addColorStop(0, '#fff3a8'); gr.addColorStop(0.5, '#ffc928'); gr.addColorStop(1, '#d07a0a'); g.fillStyle = gr; }
    else g.fillStyle = 'rgba(40,28,16,0.78)';
    g.fill(); g.stroke();
    if (filled) { starPath(g, cx - R * 0.12, cx - R * 0.16, R * 0.42); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill(); }
  });
  const s = (R + pad) * 2 * (r / R);
  if (alpha !== 1) { ctx.save(); ctx.globalAlpha *= alpha; }
  ctx.drawImage(c, x - s / 2, y - s / 2, s, s);
  if (alpha !== 1) ctx.restore();
}
// soft additive glow dot (for embers, dust, sparkles)
export function glowDot(ctx, x, y, r, color = '#ffb060', alpha = 1) {
  const c = cached('glow:' + color, 32, 32, (g) => {
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  });
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * alpha;
  ctx.drawImage(c, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = a0;
}
// grayscale version of an atlas icon (works without ctx.filter, e.g. Safari)
const grayCache = new Map();
export function iconGray(ctx, name, x, y, size, alpha = 0.9) {
  const f = Assets.frame('icon/' + name);
  if (!f) { drawIcon(ctx, name, x, y, size, { gray: true, alpha }); return; }
  let c = grayCache.get(name);
  if (c === undefined) {
    try {
      c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
      const g = c.getContext('2d'); g.drawImage(f.img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
      const d = g.getImageData(0, 0, f.w, f.h), p = d.data;
      for (let i = 0; i < p.length; i += 4) { const l = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) * 0.72 + 20; p[i] = l; p[i + 1] = l * 0.97; p[i + 2] = l * 0.92; }
      g.putImageData(d, 0, 0);
    } catch (e) { c = null; }
    grayCache.set(name, c);
  }
  if (!c) { drawIcon(ctx, name, x, y, size, { gray: true, alpha }); return; }
  const k = size / Math.max(f.w, f.h);
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.drawImage(c, x - (f.w * k) / 2, y - (f.h * k) / 2, f.w * k, f.h * k);
  ctx.restore();
}
// solid silhouette of a sprite frame (for unseen bestiary entries); returns a frame-like object for drawFrame
const silCache = new WeakMap(); // keyed by frame: lets unloaded (HD) atlases be freed
export function silhouette(f, color = '#1a110a') {
  if (!f) return null;
  let s = silCache.get(f);
  if (!s) {
    const c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
    const g = c.getContext('2d'); g.drawImage(f.img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, f.w, f.h);
    s = { img: c, x: 0, y: 0, w: f.w, h: f.h, ox: f.ox, oy: f.oy, s: f.s };
    silCache.set(f, s);
  }
  return s;
}

// ---------------------------------------------------------------- sprites fitted into boxes
const boxCache = new Map();
export function spriteBox(sprite, anim = 'idle') {
  const key = sprite + '/' + anim;
  if (boxCache.has(key)) return boxCache.get(key);
  const an = Assets.anim(key);
  const frames = an ? an.frames : [Assets.frame(sprite)].filter(Boolean);
  if (!frames.length) return null;
  let l = Infinity, tp = Infinity, r = -Infinity, b = -Infinity;
  for (const f of frames) { const s = f.s; l = Math.min(l, -f.ox * s); tp = Math.min(tp, -f.oy * s); r = Math.max(r, (f.w - f.ox) * s); b = Math.max(b, (f.h - f.oy) * s); }
  const box = { l, t: tp, r, b, w: r - l, h: b - tp };
  boxCache.set(key, box);
  return box;
}
// Draws sprite/anim at `time` so that its (stable, idle-based) bounding box is centered in a bw x bh box.
// Returns {sc, ax, ay} (scale and anchor position) or null if the sprite is not loaded.
export function drawSpriteFit(ctx, sprite, anim, time, cx, cy, bw, bh, o = {}) {
  const f = o.frame || unitFrame(sprite, anim, time);
  if (!f) return null;
  // o.boxSprite: lay out by another sprite's box (an HD copy drawn exactly where its battle sprite would be)
  const box = (o.boxSprite && spriteBox(o.boxSprite, o.boxAnim || 'idle')) || spriteBox(sprite, o.boxAnim || 'idle') || spriteBox(sprite, anim) || { l: -f.ox * f.s, t: -f.oy * f.s, w: f.w * f.s, h: f.h * f.s };
  const sc = Math.min(bw / box.w, bh / box.h, o.maxScale ?? Infinity);
  const ax = cx - (box.l + box.w / 2) * sc * (o.flip ? -1 : 1), ay = cy - (box.t + box.h / 2) * sc;
  if (o.silhouette) drawFrame(ctx, silhouette(f, o.silhouette), ax, ay, !!o.flip, sc);
  else drawFrame(ctx, f, ax, ay, !!o.flip, sc);
  return { sc, ax, ay, box };
}

// circular hero portrait: atlas portrait if present, else the animated sprite; gold rim
export function heroPortrait(ctx, id, cx, cy, r, time = 0, o = {}) {
  const bg = o.bg || '#2e2218';
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
  const gr = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r);
  gr.addColorStop(0, o.light || '#5a4632'); gr.addColorStop(1, bg);
  ctx.fillStyle = gr; ctx.fill();
  ctx.clip();
  const pf = Assets.frame('hd_portrait/' + id) || Assets.frame('portrait/' + id); // HD copy while the hero screen has it loaded
  if (pf) drawFrame(ctx, o.locked ? silhouette(pf, '#140d08') : pf, cx, cy + r * 0.04, false, r / 60);
  else drawSpriteFit(ctx, 'h_' + id, 'idle', time, cx, cy + r * 0.1, r * 1.5, r * 1.55, { silhouette: o.locked ? '#140d08' : null });
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
  ctx.lineWidth = Math.max(2, r * 0.09); ctx.strokeStyle = o.rim || '#d8b052'; ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.03); ctx.strokeStyle = 'rgba(40,20,5,0.8)';
  ctx.beginPath(); ctx.arc(cx, cy, r + Math.max(1, r * 0.045), 0, TAU); ctx.stroke();
}

// ---------------------------------------------------------------- title ribbon
const RIBBON = { wine: ['#c8483a', '#8e2420', '#5a1210', '#3a0a08'], blue: ['#4e86c8', '#2a5a9a', '#173a6a', '#0c2444'], green: ['#6aa84a', '#3f7a2a', '#24501a', '#14300c'] };
const ribbonCache = new Map();
function paintRibbon(w, h, dpr, color) {
  const tail = h * 0.95, W = w + tail * 2, H = h * 1.32;
  const c = document.createElement('canvas'); c.width = Math.ceil(W * dpr); c.height = Math.ceil(H * dpr);
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const [hi, base, dk, dkr] = RIBBON[color] || RIBBON.wine;
  const ty = h * 0.3, th = h * 0.92, lw = Math.max(1.5, h * 0.05);
  g.lineJoin = 'round'; g.strokeStyle = '#1d0a06'; g.lineWidth = lw;
  for (const s of [-1, 1]) {
    const ox = s < 0 ? lw : W - lw, ix = s < 0 ? tail + h * 0.35 : W - tail - h * 0.35;
    g.beginPath(); g.moveTo(ix, ty); g.lineTo(ox, ty); g.lineTo(ox - s * tail * 0.32, ty + th / 2); g.lineTo(ox, ty + th); g.lineTo(ix, ty + th); g.closePath();
    const gr = g.createLinearGradient(0, ty, 0, ty + th); gr.addColorStop(0, base); gr.addColorStop(1, dkr);
    g.fillStyle = gr; g.fill(); g.stroke();
    // fold
    const bx = s < 0 ? tail : W - tail;
    g.beginPath(); g.moveTo(bx, h - lw * 0.5); g.lineTo(bx, ty + th); g.lineTo(bx - s * h * 0.34, ty + th); g.closePath();
    g.fillStyle = dkr; g.fill(); g.stroke();
  }
  // band
  roundRect(g, tail, lw * 0.5, w, h - lw, h * 0.08);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, hi); gr.addColorStop(0.45, base); gr.addColorStop(1, dk);
  g.fillStyle = gr; g.fill(); g.stroke();
  g.strokeStyle = 'rgba(240,200,110,0.75)'; g.lineWidth = Math.max(1, h * 0.035);
  for (const yy of [h * 0.14, h * 0.86]) { g.beginPath(); g.moveTo(tail + h * 0.12, yy); g.lineTo(tail + w - h * 0.12, yy); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(tail + 3, h * 0.18, w - 6, h * 0.2);
  return c;
}
export function ribbon(ctx, cx, cy, w, h, label, o = {}) {
  w = Math.round(w); h = Math.round(h);
  const dpr = Screen.dpr, key = `${w}x${h}@${dpr}:${o.color || 'wine'}`;
  let c = ribbonCache.get(key);
  if (!c) { c = paintRibbon(w, h, dpr, o.color); ribbonCache.set(key, c); if (ribbonCache.size > 30) ribbonCache.delete(ribbonCache.keys().next().value); }
  const tail = h * 0.95;
  ctx.drawImage(c, cx - w / 2 - tail, cy - h / 2, w + tail * 2, h * 1.32);
  if (label) {
    const size = o.size || h * 0.5;
    fitText(ctx, label, cx, cy + h * 0.02, w - h * 0.5, { size, align: 'center', color: '#ffeab0', stroke: '#2a0606', strokeWidth: size * 0.2, weight: 900, fam: 'display' });
  }
}
// Screen title ribbon for a top bar with controls on both sides: centred on screen while that leaves the label room
// between `left` and `right` (the inner edges of the side controls), otherwise centred in that gap.
export function titleRibbon(ctx, label, cy, h, left, right, maxW) {
  const tail = h * 0.95, cx0 = Screen.gw / 2;
  const need = Math.min(maxW, textW(label, h * 0.5, 900, 'display') + h * 0.9);
  const centred = Math.min(maxW, (Math.min(cx0 - left, right - cx0) - tail) * 2);
  if (centred >= need) { ribbon(ctx, cx0, cy, centred, h, label); return; }
  ribbon(ctx, (left + right) / 2, cy, Math.max(h * 1.5, Math.min(maxW, right - left - tail * 2)), h, label);
}
// small wooden plaque with an icon and a value (star counter etc). Returns its rect.
export function plaque(ctx, x, y, h, icon, label, o = {}) {
  const fs = o.size || h * 0.5;
  const w = o.w || (h * 1.05 + textW(label, fs, 900) + h * 0.45);
  panel(ctx, 'wood', x, y, w, h);
  drawIcon(ctx, icon, x + h * 0.55, y + h / 2, h * 0.62);
  text(ctx, label, x + h * 0.98, y + h / 2 + 1, { size: fs, color: o.color || '#ffe9a8', stroke: '#2a1606', strokeWidth: fs * 0.18, weight: 900, maxWidth: w - h * 1.2 });
  return { x, y, w, h };
}

// ---------------------------------------------------------------- backdrops (static layer cached, light animation on top)
function shade(hex, v) { const n = parseInt(hex.slice(1), 16); const f = c => clamp(Math.round(c * v), 0, 255); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }

const PAINT = {
  hall(g, w, h, R) {
    g.fillStyle = '#1c1109'; g.fillRect(0, 0, w, h);
    const pw = Math.max(64, Math.min(w, h) * 0.17);
    for (let x = -R() * pw; x < w; x += pw) {
      const v = 0.78 + R() * 0.38;
      const gr = g.createLinearGradient(x, 0, x + pw, 0);
      gr.addColorStop(0, shade('#4a2c16', v * 0.82)); gr.addColorStop(0.5, shade('#4a2c16', v)); gr.addColorStop(1, shade('#4a2c16', v * 0.76));
      g.fillStyle = gr; g.fillRect(x, 0, pw, h);
      g.save(); g.beginPath(); g.rect(x, 0, pw, h); g.clip();
      g.globalAlpha = 0.18; g.strokeStyle = '#140a04'; g.lineWidth = 1;
      for (let k = 0; k < 10; k++) {
        const gx = x + R() * pw; g.beginPath(); g.moveTo(gx, 0);
        for (let y = 0; y <= h + 30; y += 30) g.lineTo(gx + Math.sin(y * 0.012 + k * 2) * 3.5 + (R() - 0.5) * 1.6, y);
        g.stroke();
      }
      g.globalAlpha = 0.08; g.strokeStyle = '#f0c48a';
      for (let k = 0; k < 4; k++) { const gx = x + R() * pw; g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx + (R() - 0.5) * 8, h); g.stroke(); }
      for (let k = 0; k < 2; k++) { // knots
        if (R() < 0.5) continue;
        const kx = x + pw * (0.25 + R() * 0.5), ky = R() * h;
        g.globalAlpha = 0.35; g.fillStyle = '#1e1007'; g.beginPath(); g.ellipse(kx, ky, 3 + R() * 3, 6 + R() * 6, 0, 0, TAU); g.fill();
      }
      g.restore();
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x, 0, 2, h);
      g.fillStyle = 'rgba(255,220,170,0.07)'; g.fillRect(x + 2, 0, 1, h);
    }
    // beams
    for (const [y0, bh] of [[0, h * 0.05], [h * 0.95, h * 0.05]]) {
      const gr = g.createLinearGradient(0, y0, 0, y0 + bh); gr.addColorStop(0, '#2a180c'); gr.addColorStop(1, '#170d06');
      g.fillStyle = gr; g.fillRect(0, y0, w, bh);
    }
    const lg = g.createRadialGradient(w * 0.5, -h * 0.15, 0, w * 0.5, -h * 0.15, h * 1.15);
    lg.addColorStop(0, 'rgba(255,196,120,0.34)'); lg.addColorStop(0.55, 'rgba(255,160,80,0.08)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
    const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.7)');
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
    return {};
  },
  rampart(g, w, h, R) {
    const hy = h * 0.6;
    const sky = g.createLinearGradient(0, 0, 0, hy);
    sky.addColorStop(0, '#0b0d20'); sky.addColorStop(0.45, '#241a36'); sky.addColorStop(0.8, '#5a2a30'); sky.addColorStop(1, '#a8502a');
    g.fillStyle = sky; g.fillRect(0, 0, w, hy + 2);
    for (let i = 0; i < 160; i++) { const x = R() * w, y = R() * hy * 0.75, r = R() < 0.1 ? 1.4 : 0.7; g.globalAlpha = 0.25 + R() * 0.6 * (1 - y / hy); g.fillStyle = '#fff6e0'; g.fillRect(x, y, r, r); }
    g.globalAlpha = 1;
    // the Cinder Heart glowing far beyond the wall
    const gx = w * 0.7, glow = g.createRadialGradient(gx, hy, 0, gx, hy, h * 0.55);
    glow.addColorStop(0, 'rgba(255,150,60,0.55)'); glow.addColorStop(0.4, 'rgba(200,70,30,0.18)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow; g.fillRect(0, 0, w, h);
    // mountains (two layers)
    const ridge = (base, amp, col, seed) => {
      g.beginPath(); g.moveTo(0, h); g.lineTo(0, base);
      let x = 0; while (x < w) { x += 30 + R() * 70; g.lineTo(x, base - (0.3 + R() * 0.7) * amp * (0.6 + 0.4 * Math.sin(x * 0.004 + seed))); }
      g.lineTo(w, h); g.closePath(); g.fillStyle = col; g.fill();
    };
    ridge(hy + h * 0.02, h * 0.16, '#24182a', 1);
    ridge(hy + h * 0.05, h * 0.09, '#1a1220', 3);
    // the Rampart
    const wy = hy + h * 0.07, wb = h * 0.86, mer = Math.max(8, h * 0.018);
    const wg = g.createLinearGradient(0, wy, 0, wb); wg.addColorStop(0, '#2a1e22'); wg.addColorStop(1, '#100b0e');
    g.fillStyle = wg; g.fillRect(0, wy, w, wb - wy);
    for (let x = 0; x < w; x += mer * 2) g.fillRect(x, wy - mer, mer, mer + 1);
    g.fillStyle = 'rgba(255,140,60,0.25)'; g.fillRect(0, wy, w, 1.5);
    g.globalAlpha = 0.18; g.strokeStyle = '#000';
    for (let y = wy + mer * 1.6; y < wb; y += mer * 1.4) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.globalAlpha = 1;
    const beacons = [];
    const n = Math.max(3, Math.round(w / 300));
    for (let i = 0; i < n; i++) {
      const tx = (i + 0.5) * (w / n) + (R() - 0.5) * w / n * 0.3, tw = h * 0.07, th = h * 0.17;
      g.fillStyle = '#150f13'; g.fillRect(tx - tw / 2, wy - th, tw, th + 2);
      for (let k = 0; k < 3; k++) g.fillRect(tx - tw / 2 + k * tw * 0.4, wy - th - mer, tw * 0.22, mer + 1);
      g.fillStyle = 'rgba(255,150,70,0.3)'; g.fillRect(tx - tw / 2, wy - th, 1.5, th);
      g.fillStyle = '#ffb060'; g.fillRect(tx - tw * 0.08, wy - th * 0.55, tw * 0.16, th * 0.18);
      beacons.push({ x: tx, y: wy - th - mer * 1.6, s: tw });
    }
    // foreground
    const fg = g.createLinearGradient(0, wb - h * 0.04, 0, h); fg.addColorStop(0, '#0c0a0c'); fg.addColorStop(1, '#040304');
    g.fillStyle = fg; g.beginPath(); g.moveTo(0, h); g.lineTo(0, wb);
    for (let x = 0; x <= w; x += 40) g.lineTo(x, wb - h * 0.02 * Math.sin(x * 0.006) - R() * 3);
    g.lineTo(w, h); g.closePath(); g.fill();
    const vg = g.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
    return { beacons, hy: wy };
  },
  night(g, w, h, R) {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#04050c'); sky.addColorStop(0.6, '#0c0a18'); sky.addColorStop(1, '#1e0f0a');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const neb = g.createRadialGradient(w * 0.3, h * 0.25, 0, w * 0.3, h * 0.25, w * 0.5);
    neb.addColorStop(0, 'rgba(90,70,140,0.12)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = neb; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const x = R() * w, y = R() * h * 0.9, r = R() < 0.08 ? 1.6 : R() < 0.3 ? 1 : 0.6; g.globalAlpha = 0.2 + R() * 0.6; g.fillStyle = R() < 0.15 ? '#ffd9a0' : '#e8ecff'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
    const ember = g.createRadialGradient(w / 2, h * 1.1, 0, w / 2, h * 1.1, h * 0.7);
    ember.addColorStop(0, 'rgba(200,80,30,0.3)'); ember.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = ember; g.fillRect(0, 0, w, h);
    return {};
  },
};

export class Backdrop {
  constructor(kind = 'hall') { this.kind = kind; this.c = null; this.key = ''; this.parts = []; this.info = {}; }
  ensure(w, h) {
    const dpr = Screen.dpr, key = `${w}x${h}@${dpr}`;
    if (this.c && this.key === key) return;
    this.key = key;
    const c = this.c || document.createElement('canvas');
    c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rng = new RNG(7 + this.kind.length * 13);
    this.info = PAINT[this.kind](g, w, h, () => rng.next()) || {};
    this.c = c;
    const n = this.kind === 'hall' ? 26 : this.kind === 'rampart' ? 34 : 44;
    this.parts = Array.from({ length: n }, (_, i) => ({ seed: i * 7.31 + 1.7, x: Math.random() * w, y: Math.random() * h, life: Math.random() }));
  }
  draw(ctx, w, h, time) {
    this.ensure(w, h);
    ctx.drawImage(this.c, 0, 0, w, h);
    if (Screen.quality === 'low') return;
    const U = Screen.uiScale;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (this.kind === 'hall') {
      for (const p of this.parts) {
        const tt = time * 0.03 + p.seed;
        const x = ((p.x + Math.sin(tt * 3.1) * 40 + time * 6) % (w + 40) + w + 40) % (w + 40) - 20;
        const y = ((p.y - time * 9 + Math.cos(tt * 2.3) * 20) % h + h) % h;
        const a = 0.25 + 0.25 * Math.sin(time * 1.3 + p.seed * 3);
        glowDot(ctx, x, y, (2 + (p.seed % 3)) * Math.max(U, 0.7), '#ffd9a0', a * (1 - y / h * 0.6));
      }
    } else if (this.kind === 'rampart') {
      for (const b of this.info.beacons || []) {
        const fl = 0.75 + 0.25 * Math.sin(time * 9 + b.x) * Math.sin(time * 5.3 + b.x * 0.3);
        glowDot(ctx, b.x, b.y, b.s * 2.2 * fl, '#ff9a40', 0.55);
        glowDot(ctx, b.x, b.y + b.s * 0.1, b.s * 0.7 * fl, '#ffe0a0', 0.9);
      }
      const hy = this.info.hy || h * 0.6;
      for (const p of this.parts) {
        p.life += 0.0035 + (p.seed % 1) * 0.002;
        if (p.life > 1) { p.life = 0; p.x = Math.random() * w; }
        const y = hy + 20 - p.life * hy * 0.9, x = p.x + Math.sin(time * 0.8 + p.seed) * 14 + p.life * 60;
        glowDot(ctx, x, y, (1.6 + (p.seed % 2)) * Math.max(U, 0.7), '#ff8a3a', Math.sin(p.life * Math.PI) * 0.8);
      }
    } else {
      for (const p of this.parts) {
        p.life += 0.0016 + (p.seed % 1) * 0.0015;
        if (p.life > 1) { p.life = 0; p.x = Math.random() * w; }
        const y = h + 10 - p.life * h * 1.05, x = p.x + Math.sin(time * 0.5 + p.seed) * 24;
        glowDot(ctx, x, y, (1.5 + (p.seed % 2.5)) * Math.max(U, 0.7), p.seed % 3 < 1 ? '#ffd080' : '#ff7a30', Math.sin(p.life * Math.PI) * 0.75);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- inertial vertical scroll view
export class ScrollView {
  constructor() { this.x = 0; this.y = 0; this.w = 0; this.h = 0; this.content = 0; this.pos = 0; this.vel = 0; this.hold = false; this.dragging = false; this.target = null; this.bar = 0; this.blockTap = false; this.lastT = 0; }
  set(x, y, w, h, content) { this.x = x; this.y = y; this.w = w; this.h = h; if (content !== undefined) this.setContent(content); }
  setContent(c) { this.content = c; if (!this.dragging) this.pos = clamp(this.pos, 0, this.max); }
  get max() { return Math.max(0, this.content - this.h); }
  contains(p) { return p.x >= this.x && p.x <= this.x + this.w && p.y >= this.y && p.y <= this.y + this.h; }
  toContent(p) { return { x: p.x - this.x, y: p.y - this.y + this.pos }; }
  onDown(p) {
    if (!this.contains(p)) return false;
    this.blockTap = Math.abs(this.vel) > 140 || this.target !== null && Math.abs(this.target - this.pos) > 8;
    this.hold = true; this.vel = 0; this.target = null;
    return true;
  }
  onDragStart() { if (this.hold) { this.dragging = true; this.lastT = performance.now(); } }
  onDrag(dx, dy) {
    if (!this.dragging) return false;
    const now = performance.now(), dt = Math.max(4, now - this.lastT) / 1000; this.lastT = now;
    let d = -dy;
    if ((this.pos < 0 && d < 0) || (this.pos > this.max && d > 0)) d *= 0.4;
    this.pos += d;
    this.vel = lerp(this.vel, d / dt, 0.4);
    this.bar = 1;
    return true;
  }
  onDragEnd() { if (!this.dragging) return; this.dragging = false; if (performance.now() - this.lastT > 80) this.vel = 0; this.vel = clamp(this.vel, -4000, 4000); }
  onUp() { this.hold = false; this.onDragEnd(); }
  onWheel(dy, x, y) {
    if (!this.contains({ x, y }) || this.max <= 0) return false;
    this.target = clamp((this.target ?? this.pos) + dy, 0, this.max); this.vel = 0; this.bar = 1;
    return true;
  }
  scrollTo(pos, instant = false) { pos = clamp(pos, 0, this.max); if (instant) { this.pos = pos; this.target = null; } else this.target = pos; this.vel = 0; }
  // make [y0, y1] (content coords) visible
  reveal(y0, y1, margin = 10) { if (y0 - margin < this.pos) this.scrollTo(y0 - margin); else if (y1 + margin > this.pos + this.h) this.scrollTo(y1 + margin - this.h); }
  update(dt) {
    if (!this.dragging) {
      if (this.target !== null) {
        this.pos = lerp(this.pos, this.target, 1 - Math.pow(0.00002, dt));
        if (Math.abs(this.pos - this.target) < 0.5) { this.pos = this.target; this.target = null; }
      } else if (Math.abs(this.vel) > 8) {
        this.pos += this.vel * dt;
        this.vel *= Math.pow(this.pos < 0 || this.pos > this.max ? 0.00005 : 0.035, dt);
      } else this.vel = 0;
      if (this.target === null && (this.pos < 0 || this.pos > this.max)) {
        const tg = this.pos < 0 ? 0 : this.max;
        this.pos = lerp(this.pos, tg, 1 - Math.pow(0.0004, dt));
        if (Math.abs(this.pos - tg) < 0.5) { this.pos = tg; this.vel = 0; }
      }
      this.bar = Math.max(0, this.bar - dt * 0.9);
    }
  }
  begin(ctx) { ctx.save(); ctx.beginPath(); ctx.rect(this.x, this.y, this.w, this.h); ctx.clip(); ctx.translate(this.x, this.y - Math.round(this.pos)); }
  end(ctx, o = {}) {
    ctx.restore();
    if (this.max <= 1) return;
    const U = Screen.uiScale, bw = Math.max(3, 5 * U);
    const vis = this.h / this.content, bh = Math.max(24 * U, this.h * vis);
    const p = clamp(this.pos / this.max, 0, 1);
    const bx = this.x + this.w - bw - (o.inset ?? 3 * U), by = this.y + 4 * U + (this.h - 8 * U - bh) * p;
    ctx.save(); ctx.globalAlpha = 0.35 + 0.5 * this.bar;
    roundRect(ctx, bx, by, bw, bh, bw / 2); ctx.fillStyle = o.color || 'rgba(255,230,180,0.85)'; ctx.fill();
    ctx.restore();
    // soft fades hint that more content exists above / below
    if (o.fade) {
      const fh = Math.min(26 * U, this.h * 0.12);
      if (this.pos > 2) { const gr = ctx.createLinearGradient(0, this.y, 0, this.y + fh); gr.addColorStop(0, o.fade); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(this.x, this.y, this.w, fh); }
      if (this.pos < this.max - 2) { const gr = ctx.createLinearGradient(0, this.y + this.h - fh, 0, this.y + this.h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, o.fade); ctx.fillStyle = gr; ctx.fillRect(this.x, this.y + this.h - fh, this.w, fh); }
    }
  }
}

// ---------------------------------------------------------------- modal popups
export class Popup {
  constructor() { this.ui = new UI(); this.t = 0; this.out = 0; this.closing = false; this.closed = false; this.rect = { x: 0, y: 0, w: 10, h: 10 }; this.dismissible = true; this.dim = 0.55; }
  get U() { return Screen.uiScale; }
  layout() {}
  open(silent = false) { this.t = 0; this.layout(); if (!silent) Audio.sfx('ui_open'); return this; }
  close(cb, silent = false) {
    if (this.closing) return;
    this.closing = true; this.out = 0; this.cb = cb;
    if (!silent) Audio.sfx('ui_close');
  }
  get k() { const a = Math.min(1, this.t / 0.2); const b = this.closing ? Math.max(0, 1 - this.out / 0.15) : 1; return Math.min(a, b); }
  update(dt) {
    this.t += dt;
    if (this.closing && !this.closed) { this.out += dt; if (this.out >= 0.15) { this.closed = true; if (this.cb) this.cb(); if (this.onClosed) this.onClosed(); } }
  }
  draw(ctx) {
    const k = this.k, r = this.rect;
    if (this.dim) { ctx.fillStyle = `rgba(0,0,0,${this.dim * k})`; ctx.fillRect(0, 0, Screen.gw, Screen.gh); }
    const s = this.closing ? 0.95 + 0.05 * k : 0.88 + 0.12 * Ease.outBack(Math.min(1, this.t / 0.24));
    ctx.save(); ctx.globalAlpha *= k;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
    this.drawBody(ctx);
    this.ui.draw(ctx);
    if (this.drawOver) this.drawOver(ctx);
    ctx.restore();
  }
  drawBody(ctx) {}
  get ready() { return !this.closing && this.t > 0.12; }
  down(p) { if (this.ready) this.ui.down(p); return true; }
  up() { this.ui.up(); }
  tap(p) {
    if (!this.ready) return true;
    if (this.ui.tap(p)) return true;
    if (this.dismissible && !inRect(p, this.rect)) this.close();
    return true;
  }
  hover(p) { this.ui.move(p); }
  dragStart() { this.ui.cancel(); }
  drag() {}
  dragEnd() {}
  wheel() {}
  key(k) { if (k === 'Escape') this.close(); }
  get isOpen() { return !this.closed; } // keep routing input + update/draw until this turns false
  // Engine-style aliases: any scene can forward its own input hooks verbatim while the popup is open.
  // Each returns true (= consumed; the popup is modal).
  onDown(p) { this.down(p); return true; }
  onUp(p) { this.up(p); return true; }
  onTap(p) { this.tap(p); return true; }
  onMoveDown(p) { if (this.moveDown) this.moveDown(p); return true; }
  onDragStart(p) { this.dragStart(p); return true; }
  onDrag(dx, dy, p) { this.drag(dx, dy, p); return true; }
  onDragEnd(p) { this.dragEnd(p); return true; }
  onHover(p) { this.ui.move(p); this.hover(p); const h = this.ui.hover; setCursor((h && h.enabled !== false && h.onTap) || this.hoverSlider ? 'pointer' : ''); return true; }
  onWheel(dy, x, y) { this.wheel(dy, x, y); return true; }
  onKey(k) { this.key(k); return true; }
  onPinchStart() { return true; }
  onPinch() { return true; }
  onPinchEnd() { return true; }
  onCancelPress() { this.ui.cancel(); return true; }
}

// yes/no confirmation on parchment
export class ConfirmPopup extends Popup {
  constructor(msg, onYes, o = {}) { super(); this.msg = msg; this.onYes = onYes; this.o = o; }
  layout() {
    const U = this.U, W = Screen.gw, H = Screen.gh;
    const w = Math.min(560 * U, W - 24);
    this.fs = fz(22, 12);
    this.ls = lines(this.msg, w - 70 * U, this.fs, 700);
    const bh = Math.max(54 * U, 34), pad = Math.max(30 * U, 16);
    const h = Math.min(H - 16, pad + this.ls.length * this.fs * 1.45 + 26 * U + bh + pad * 0.85);
    this.rect = { x: (W - w) / 2, y: (H - h) / 2, w, h };
    this.ui.clear();
    const bw = Math.min(200 * U, (w - 90 * U) / 2), by = this.rect.y + h - bh - pad * 0.85;
    this.pad = pad;
    this.ui.add(btn(W / 2 - bw - 14 * U, by, bw, bh, this.o.yes || t('ui.yes'), () => this.close(() => this.onYes && this.onYes(), true), { color: this.o.yesColor || 'green', sound: this.o.yesSound }));
    this.ui.add(btn(W / 2 + 14 * U, by, bw, bh, this.o.no || t('ui.no'), () => this.close(this.o.onNo), { color: this.o.noColor || 'red' }));
  }
  drawBody(ctx) {
    const r = this.rect, U = this.U;
    panel(ctx, 'parchment', r.x, r.y, r.w, r.h);
    this.ls.forEach((ln, i) => text(ctx, ln, r.x + r.w / 2, r.y + this.pad + this.fs * 0.72 + i * this.fs * 1.45, { size: this.fs, align: 'center', color: COL.ink, weight: 800 }));
  }
}

// ---------------------------------------------------------------- toasts (achievements etc.)
export const Toasts = {
  q: [], cur: null, t: 0, top: null, // top: y of the toast (scenes may move it below their top bar)
  push(title, sub, icon = 'trophy') { this.q.push({ title, sub, icon }); }, // title / sub: string or () => string
  pullAchievements() {
    for (const a of Achievements.pending.splice(0)) this.push(() => t('menu.newAchievement'), () => achText(a)[0], a.icon || 'trophy');
  },
  update(dt) {
    if (!this.cur && this.q.length) { this.cur = this.q.shift(); this.t = 0; Audio.sfx('ui_achievement'); }
    if (this.cur) { this.t += dt; if (this.t > 3.4) this.cur = null; }
  },
  draw(ctx) {
    const c0 = this.cur; if (!c0) return;
    const c = { title: typeof c0.title === 'function' ? c0.title() : c0.title, sub: typeof c0.sub === 'function' ? c0.sub() : c0.sub, icon: c0.icon };
    const U = Screen.uiScale, W = Screen.gw;
    const k = this.t < 0.35 ? Ease.outBack(this.t / 0.35) : this.t > 3.0 ? 1 - Ease.inQuad((this.t - 3.0) / 0.4) : 1;
    const fs1 = fz(16, 10), fs2 = fz(21, 12);
    const w = Math.min(W - 24, Math.max(textW(c.sub, fs2, 900), textW(c.title, fs1, 800)) + 120 * U), h = Math.max(70 * U, 42);
    const y0 = this.top ?? Screen.safe.t + 14 * U;
    const x = (W - w) / 2, y = -h + (h + y0) * k;
    ctx.save();
    panel(ctx, 'dark', x, y, w, h);
    const ir = h * 0.36;
    ctx.beginPath(); ctx.arc(x + h * 0.55, y + h / 2, ir, 0, TAU); ctx.fillStyle = '#3a2a14'; ctx.fill(); ctx.lineWidth = Math.max(1.5, 3 * U); ctx.strokeStyle = '#e8c060'; ctx.stroke();
    drawIcon(ctx, c.icon, x + h * 0.55, y + h / 2, ir * 1.5);
    text(ctx, c.title, x + h * 1.05, y + h * 0.33, { size: fs1, color: '#ffd96a', weight: 800, maxWidth: w - h * 1.2 });
    text(ctx, c.sub, x + h * 1.05, y + h * 0.67, { size: fs2, color: '#fff2d6', weight: 900, maxWidth: w - h * 1.2 });
    const sh = (this.t * 1.4) % 3;
    if (sh < 1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 * Math.sin(sh * Math.PI); const gx = x + w * sh; const gr = ctx.createLinearGradient(gx - 40 * U, 0, gx + 40 * U, 0); gr.addColorStop(0, 'rgba(255,230,160,0)'); gr.addColorStop(0.5, 'rgba(255,230,160,1)'); gr.addColorStop(1, 'rgba(255,230,160,0)'); ctx.fillStyle = gr; roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 10); ctx.fill(); }
    ctx.restore();
  },
};

// ---------------------------------------------------------------- base class for menu scenes
// Routes input to an open popup first, then the scene's UI buttons, then its scroll views, then scene hooks:
// tapIn(view, contentPoint, p), tapOut(p), press(p), drawScene(ctx, w, h).
export class MenuScene {
  constructor(app) { this.app = app; this.ui = new UI(); this.time = 0; this.popup = null; this.scrolls = []; this.params = {}; }
  enter(p) { this.params = p || {}; this.time = 0; this.popup = null; Toasts.top = null; }
  exit() { setCursor(''); Save.persist(); }
  get U() { return Screen.uiScale; }
  goBack() {}
  openPopup(pp) { this.popup = pp; pp.onClosed = () => { if (this.popup === pp) this.popup = null; }; pp.open(); return pp; }
  // Called by the options popup right after the language changes (app.scene.onLangChange?.()):
  // every menu scene rebuilds its layout, which re-creates buttons and any cached / measured text.
  onLangChange() { this.layout(); if (this.popup && this.popup.layout) this.popup.layout(); }
  // toasts wait (neither advance nor draw) while this is true: a popup is open, or a scene's own modal moment
  toastsHeld() { return !!this.popup; }
  update(dt) {
    this.time += dt;
    tickPlayTime(dt);
    for (const s of this.scrolls) s.update(dt);
    if (this.popup) this.popup.update(dt);
    if (!this.toastsHeld()) Toasts.update(dt);
  }
  onDown(p) {
    if (this.popup) return this.popup.down(p);
    if (this.ui.down(p)) return true;
    for (const s of this.scrolls) if (s.onDown(p)) { if (this.press) this.press(p, s); return true; }
    if (this.press) this.press(p, null);
    return false;
  }
  onUp(p, cancelled) {
    if (this.popup) { this.popup.up(p); return; }
    this.ui.up();
    for (const s of this.scrolls) s.onUp(p);
    if (this.release) this.release(p, cancelled);
  }
  onTap(p) {
    if (this.popup) { this.popup.tap(p); return; }
    if (this.ui.tap(p)) return;
    for (const s of this.scrolls) if (s.contains(p)) { if (!s.blockTap && this.tapIn) this.tapIn(s, s.toContent(p), p); return; }
    if (this.tapOut) this.tapOut(p);
  }
  onDragStart(p) {
    if (this.popup) { this.popup.dragStart(p); return; }
    this.ui.cancel();
    for (const s of this.scrolls) s.onDragStart(p);
    if (this.dragStart) this.dragStart(p);
  }
  onDrag(dx, dy, p) { if (this.popup) { this.popup.drag(dx, dy, p); return; } for (const s of this.scrolls) s.onDrag(dx, dy, p); }
  onMoveDown(p) { if (this.popup && this.popup.moveDown) this.popup.moveDown(p); }
  onDragEnd(p) { if (this.popup) { this.popup.dragEnd(p); return; } for (const s of this.scrolls) s.onDragEnd(p); }
  onCancelPress() { this.ui.cancel(); if (this.popup) this.popup.ui.cancel(); }
  onWheel(dy, x, y) { if (this.popup) { this.popup.wheel(dy, x, y); return; } for (const s of this.scrolls) if (s.onWheel(dy, x, y)) return; }
  onHover(p) {
    const ui = this.popup ? this.popup.ui : this.ui;
    ui.move(p);
    if (this.popup && this.popup.hover) this.popup.hover(p);
    const h = ui.hover;
    const cur = h && h.enabled !== false && h.onTap ? 'pointer' : '';
    // scene hover hook always runs (with an off-screen point while a button is hovered) so its state resets
    const hc = !this.popup && this.hoverAt ? this.hoverAt(h ? { x: -1e6, y: -1e6 } : p) : '';
    setCursor(cur || hc || '');
  }
  onKey(k) {
    if (this.popup) { this.popup.key(k); return; }
    if (k === 'Escape' || k === 'Backspace') { Audio.sfx('ui_close'); this.goBack(); }
    else if (this.key) this.key(k);
  }
  render(ctx, w, h) {
    ctx.imageSmoothingQuality = 'medium'; // mip-mapped bilinear: crisp enough for cached panels, much cheaper than bicubic
    this.drawScene(ctx, w, h);
    if (this.popup) this.popup.draw(ctx);
    else if (!this.toastsHeld()) Toasts.draw(ctx);
  }
  drawScene() {}
}

// enter animation helper: 0 -> 1 over `dur` seconds after `delay`
export function appear(time, delay = 0, dur = 0.35) { return Ease.outCubic(clamp((time - delay) / dur, 0, 1)); }
