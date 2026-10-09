// Rampart Riot — canvas drawing helpers for UI: fonts, text, panels, buttons, bars
import { clamp } from '../core/util.js';

export const FONT = {
  sans: '"RRSans", "Noto Sans KR", "Noto Sans CJK KR", "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", sans-serif',
  serif: '"RRSerif", "Noto Serif KR", "Noto Serif CJK KR", "AppleMyungjo", "Batang", Georgia, serif',
  display: '"RRDisplay", "RRSerif", "Noto Serif CJK KR", Georgia, serif',
};

export function font(size, weight = 700, fam = 'sans') {
  return `${weight} ${Math.max(1, Math.round(size))}px ${FONT[fam] || fam}`;
}

// text with optional outline + shadow
export function text(ctx, s, x, y, o = {}) {
  const size = o.size || 20;
  ctx.font = o.font || font(size, o.weight ?? 700, o.fam || 'sans');
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.baseline || 'middle';
  const a = o.alpha ?? 1;
  if (a <= 0) return;
  if (a !== 1) { ctx.save(); ctx.globalAlpha *= a; }
  if (o.shadow) {
    ctx.fillStyle = o.shadow === true ? 'rgba(0,0,0,0.55)' : o.shadow;
    ctx.fillText(s, x + (o.shadowX ?? 0), y + (o.shadowY ?? size * 0.08), o.maxWidth);
  }
  if (o.stroke) {
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = o.stroke;
    ctx.lineWidth = o.strokeWidth ?? Math.max(2, size * 0.16);
    ctx.strokeText(s, x, y, o.maxWidth);
  }
  ctx.fillStyle = o.color || '#fff';
  ctx.fillText(s, x, y, o.maxWidth);
  if (a !== 1) ctx.restore();
}

export function measure(ctx, s, size, weight = 700, fam = 'sans') {
  ctx.font = font(size, weight, fam);
  return ctx.measureText(s).width;
}

// Word wrap that handles Korean (prefers spaces, falls back to per-character breaks)
export function wrap(ctx, s, maxW, size, weight = 700, fam = 'sans') {
  if (size) ctx.font = font(size, weight, fam);
  const out = [];
  for (const para of String(s).split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width <= maxW) { line = test; continue; }
      if (line) out.push(line);
      if (ctx.measureText(w).width <= maxW) { line = w; continue; }
      // break long word by chars
      let chunk = '';
      for (const ch of w) {
        if (ctx.measureText(chunk + ch).width > maxW && chunk) { out.push(chunk); chunk = ch; }
        else chunk += ch;
      }
      line = chunk;
    }
    out.push(line);
  }
  return out;
}

export function textBlock(ctx, s, x, y, maxW, o = {}) {
  const size = o.size || 18;
  const lines = wrap(ctx, s, maxW, size, o.weight ?? 500, o.fam || 'sans');
  const lh = o.lineHeight || size * 1.38;
  let yy = y;
  for (const ln of lines) { text(ctx, ln, x, yy, Object.assign({ baseline: 'top' }, o)); yy += lh; }
  return yy - y;
}

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- cached procedural panels ----------
const panelCache = new Map();
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function makePanel(kind, w, h, k) {
  // k = pixel ratio for crispness
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * k); c.height = Math.ceil(h * k);
  const g = c.getContext('2d');
  g.scale(k, k);
  const R = seeded(w * 31 + h * 17 + kind.length);
  if (kind === 'wood' || kind === 'woodDark') {
    const b = Math.min(18, Math.max(8, Math.min(w, h) * 0.08));
    roundRect(g, 0, 0, w, h, b * 0.9);
    g.fillStyle = '#26160c'; g.fill();
    roundRect(g, 2, 2, w - 4, h - 4, b * 0.8);
    const gr = g.createLinearGradient(0, 0, 0, h);
    if (kind === 'wood') { gr.addColorStop(0, '#9a6337'); gr.addColorStop(0.5, '#7b4a25'); gr.addColorStop(1, '#5c3418'); }
    else { gr.addColorStop(0, '#5a3a22'); gr.addColorStop(1, '#3a2312'); }
    g.fillStyle = gr; g.fill();
    // grain
    g.save(); g.clip();
    g.globalAlpha = 0.18; g.strokeStyle = '#2a170a'; g.lineWidth = 1.2;
    for (let i = 0; i < h / 7; i++) {
      const yy = R() * h; g.beginPath(); g.moveTo(0, yy);
      for (let xx = 0; xx <= w; xx += 24) g.lineTo(xx, yy + Math.sin(xx * 0.03 + i) * 2.5 + (R() - 0.5) * 1.5);
      g.stroke();
    }
    g.globalAlpha = 0.12; g.strokeStyle = '#f0c48a';
    for (let i = 0; i < h / 14; i++) { const yy = R() * h; g.beginPath(); g.moveTo(0, yy); g.lineTo(w, yy + (R() - 0.5) * 6); g.stroke(); }
    g.restore();
    // bevel
    roundRect(g, 3.5, 3.5, w - 7, h - 7, b * 0.75);
    g.strokeStyle = 'rgba(255,220,170,0.25)'; g.lineWidth = 1.5; g.stroke();
    // inner recess
    if (Math.min(w, h) > 60) {
      roundRect(g, b, b, w - 2 * b, h - 2 * b, b * 0.5);
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.stroke();
    }
    // corner rivets
    const rv = Math.max(2.5, b * 0.22);
    for (const [cx, cy] of [[b * 0.55, b * 0.55], [w - b * 0.55, b * 0.55], [b * 0.55, h - b * 0.55], [w - b * 0.55, h - b * 0.55]]) {
      g.beginPath(); g.arc(cx, cy, rv, 0, Math.PI * 2);
      const rg = g.createRadialGradient(cx - rv * 0.3, cy - rv * 0.3, 0, cx, cy, rv);
      rg.addColorStop(0, '#f6e2a8'); rg.addColorStop(0.5, '#b88b3e'); rg.addColorStop(1, '#4a3212');
      g.fillStyle = rg; g.fill();
    }
  } else if (kind === 'parchment') {
    const r = Math.min(14, Math.min(w, h) * 0.06);
    roundRect(g, 0, 0, w, h, r);
    g.fillStyle = '#3b2412'; g.fill();
    roundRect(g, 3, 3, w - 6, h - 6, r * 0.8);
    const gr = g.createRadialGradient(w * 0.5, h * 0.45, Math.min(w, h) * 0.1, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    gr.addColorStop(0, '#f6e8c4'); gr.addColorStop(0.7, '#ead39e'); gr.addColorStop(1, '#c9a464');
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    for (let i = 0; i < (w * h) / 3000; i++) {
      const x = R() * w, y = R() * h, rr = 4 + R() * 26;
      const sg = g.createRadialGradient(x, y, 0, x, y, rr);
      sg.addColorStop(0, 'rgba(150,100,40,0.08)'); sg.addColorStop(1, 'rgba(150,100,40,0)');
      g.fillStyle = sg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    g.globalAlpha = 0.06; g.fillStyle = '#5a3a14';
    for (let i = 0; i < (w * h) / 120; i++) g.fillRect(R() * w, R() * h, 1, 1);
    g.restore();
    roundRect(g, 6, 6, w - 12, h - 12, r * 0.6);
    g.strokeStyle = 'rgba(110,70,25,0.35)'; g.lineWidth = 1.5; g.stroke();
  } else if (kind === 'dark') {
    const r = Math.min(12, Math.min(w, h) * 0.12);
    roundRect(g, 0, 0, w, h, r);
    g.fillStyle = 'rgba(18,12,8,0.9)'; g.fill();
    roundRect(g, 1.5, 1.5, w - 3, h - 3, r);
    g.strokeStyle = '#b9934a'; g.lineWidth = 2; g.stroke();
    roundRect(g, 4.5, 4.5, w - 9, h - 9, r * 0.7);
    g.strokeStyle = 'rgba(185,147,74,0.3)'; g.lineWidth = 1; g.stroke();
  } else if (kind === 'stone') {
    const r = Math.min(10, Math.min(w, h) * 0.1);
    roundRect(g, 0, 0, w, h, r);
    g.fillStyle = '#1d1c1f'; g.fill();
    roundRect(g, 2, 2, w - 4, h - 4, r);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#77757d'); gr.addColorStop(1, '#4b4950');
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    g.globalAlpha = 0.25; g.strokeStyle = '#2b2a2e'; g.lineWidth = 1.5;
    const bh = 18;
    for (let yy = 0, row = 0; yy < h; yy += bh, row++) {
      g.beginPath(); g.moveTo(0, yy); g.lineTo(w, yy); g.stroke();
      for (let xx = (row % 2) * 20; xx < w; xx += 40) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + bh); g.stroke(); }
    }
    g.restore();
    roundRect(g, 3, 3, w - 6, h - 6, r);
    g.strokeStyle = 'rgba(255,255,255,0.15)'; g.lineWidth = 1.5; g.stroke();
  }
  return c;
}

export function panel(ctx, kind, x, y, w, h, alpha = 1) {
  w = Math.max(8, Math.round(w)); h = Math.max(8, Math.round(h));
  const k = 2;
  const key = kind + ':' + w + 'x' + h;
  let c = panelCache.get(key);
  if (!c) {
    c = makePanel(kind, w, h, k);
    panelCache.set(key, c);
    if (panelCache.size > 120) panelCache.delete(panelCache.keys().next().value);
  }
  if (alpha !== 1) { ctx.save(); ctx.globalAlpha *= alpha; }
  ctx.drawImage(c, x, y, w, h);
  if (alpha !== 1) ctx.restore();
}

// ---------- buttons ----------
export const BTN = {
  green: ['#7fd35a', '#3f9a2c', '#1f4a14'],
  red: ['#f07b5c', '#b43a24', '#4d140a'],
  gold: ['#ffd76a', '#d9961f', '#5a3a07'],
  blue: ['#7ec3f2', '#2f74b8', '#10304f'],
  gray: ['#c7c2b8', '#7e776b', '#2f2b25'],
  purple: ['#c99af2', '#7a43b8', '#2e1250'],
  dark: ['#6d5843', '#3e2f22', '#171009'],
};

export function button(ctx, x, y, w, h, o = {}) {
  const [hi, base, dark] = BTN[o.color || 'green'];
  const pressed = !!o.pressed;
  const dis = !!o.disabled;
  const r = o.radius ?? Math.min(h * 0.32, 16);
  ctx.save();
  if (pressed) { ctx.translate(x + w / 2, y + h / 2); ctx.scale(0.95, 0.95); ctx.translate(-(x + w / 2), -(y + h / 2)); }
  // drop shadow
  roundRect(ctx, x, y + h * 0.08, w, h, r);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = '#1b120a'; ctx.fill();
  const inset = Math.max(2, h * 0.06);
  roundRect(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, r * 0.8);
  const gr = ctx.createLinearGradient(0, y, 0, y + h);
  if (dis) { gr.addColorStop(0, '#9a958c'); gr.addColorStop(1, '#5e5a52'); }
  else { gr.addColorStop(0, hi); gr.addColorStop(0.55, base); gr.addColorStop(1, dark); }
  ctx.fillStyle = gr; ctx.fill();
  // gloss
  roundRect(ctx, x + inset * 2, y + inset * 1.6, w - inset * 4, (h - inset * 2) * 0.42, r * 0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill();
  if (o.label) {
    text(ctx, o.label, x + w / 2, y + h / 2 + (o.labelDy || 0), {
      size: o.size || h * 0.42, align: 'center', color: dis ? '#d8d2c6' : (o.textColor || '#fffbe8'),
      stroke: 'rgba(30,18,6,0.85)', strokeWidth: (o.size || h * 0.42) * 0.2, weight: 800, maxWidth: w - inset * 4, fam: o.fam,
    });
  }
  ctx.restore();
}

export function circleButton(ctx, cx, cy, r, o = {}) {
  ctx.save();
  if (o.pressed) { ctx.translate(cx, cy); ctx.scale(0.92, 0.92); ctx.translate(-cx, -cy); }
  ctx.beginPath(); ctx.arc(cx, cy + r * 0.08, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = '#1b120a'; ctx.fill();
  const rim = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  rim.addColorStop(0, '#f2d58e'); rim.addColorStop(0.5, '#a77a32'); rim.addColorStop(1, '#5d3f12');
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2); ctx.fillStyle = rim; ctx.fill();
  const [hi, base, dark] = BTN[o.color || 'dark'];
  const gr = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r * 0.8);
  gr.addColorStop(0, o.disabled ? '#888' : hi); gr.addColorStop(0.6, o.disabled ? '#555' : base); gr.addColorStop(1, o.disabled ? '#333' : dark);
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
  ctx.restore();
}

export function bar(ctx, x, y, w, h, frac, fg = '#5fd04a', bg = '#3a0d0d', border = '#120a05') {
  frac = clamp(frac, 0, 1);
  ctx.fillStyle = border; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fg; ctx.fillRect(x, y, w * frac, h);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, w * frac, Math.max(1, h * 0.35));
}

// radial cooldown sweep (dark wedge), frac = remaining fraction (1 = full cooldown)
export function cooldownSweep(ctx, cx, cy, r, frac) {
  if (frac <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false);
  ctx.closePath();
  ctx.fillStyle = 'rgba(10,6,3,0.62)';
  ctx.fill();
  ctx.restore();
}

export function vignette(ctx, w, h, strength = 0.55) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function star(ctx, cx, cy, r, filled = true, inner = 0.48) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * inner;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, r * 0.16);
  ctx.strokeStyle = '#3a2208';
  if (filled) {
    const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    g.addColorStop(0, '#fff3a8'); g.addColorStop(0.5, '#ffc928'); g.addColorStop(1, '#d07a0a');
    ctx.fillStyle = g;
  } else ctx.fillStyle = 'rgba(40,28,16,0.75)';
  ctx.fill(); ctx.stroke();
}
