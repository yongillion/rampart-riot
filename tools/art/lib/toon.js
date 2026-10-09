// Rampart Riot art generator — toon-style vector drawing library (runs in the browser canvas).
// All coordinates are in world units; the generator applies the pixel scale.

export const OUT = '#1d130c';          // outline color
export let OL = 1.7;                   // default outline width (world units)
export function setOL(v) { OL = v; }
export const LIGHT = [-0.55, -1];       // light comes from upper-left

// ---------------- color utilities ----------------
export function hex2rgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const v = parseInt(h, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
export function rgb2hex(r, g, b) {
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
export function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    switch (mx) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; default: h = (r - g) / d + 4; }
    h /= 6;
  }
  return [h, s, l];
}
export function hsl2rgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const hue = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255];
}
export function mix(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
export function adjust(hex, { h = 0, s = 0, l = 0 } = {}) {
  const [r, g, b] = hex2rgb(hex);
  let [H, S, L] = rgb2hsl(r, g, b);
  H = (H + h + 1) % 1; S = Math.max(0, Math.min(1, S + s)); L = Math.max(0, Math.min(1, L + l));
  return rgb2hex(...hsl2rgb(H, S, L));
}
// Shadows shift hue toward violet and lose lightness; highlights shift toward warm yellow.
export function dark(hex, amt = 0.16) {
  const [r, g, b] = hex2rgb(hex);
  const [H, S, L] = rgb2hsl(r, g, b);
  let h2 = H;
  const target = 0.72; // violet
  const dh = ((target - H + 1.5) % 1) - 0.5;
  h2 = (H + dh * 0.08 + 1) % 1;
  return rgb2hex(...hsl2rgb(h2, Math.min(1, S * 1.05 + 0.03), Math.max(0, L - amt)));
}
export function light(hex, amt = 0.12) {
  const [r, g, b] = hex2rgb(hex);
  const [H, S, L] = rgb2hsl(r, g, b);
  const target = 0.14; // warm
  const dh = ((target - H + 1.5) % 1) - 0.5;
  return rgb2hex(...hsl2rgb((H + dh * 0.06 + 1) % 1, S, Math.min(1, L + amt)));
}
export function alpha(hex, a) { const [r, g, b] = hex2rgb(hex); return `rgba(${r},${g},${b},${a})`; }

// ---------------- RNG ----------------
export function rng(seed = 1) {
  let s = seed >>> 0;
  const f = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.range = (a, b) => a + (b - a) * f();
  f.int = (a, b) => Math.floor(a + (b - a + 1) * f());
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  return f;
}

// ---------------- path builders (return Path2D) ----------------
export function P(svg) { return new Path2D(svg); }
export function ellipse(cx, cy, rx, ry, rot = 0) { const p = new Path2D(); p.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2); return p; }
export function circle(cx, cy, r) { return ellipse(cx, cy, r, r); }
export function rect(x, y, w, h) { const p = new Path2D(); p.rect(x, y, w, h); return p; }
export function rrect(x, y, w, h, r) {
  const p = new Path2D(); r = Math.min(r, w / 2, h / 2);
  p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r);
  p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); return p;
}
export function poly(pts, close = true) {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  if (close) p.closePath();
  return p;
}
// Smooth closed blob through points (Catmull-Rom -> bezier)
export function blob(pts, tension = 0.5, closed = true) {
  const p = new Path2D();
  const n = pts.length;
  if (n < 3) return poly(pts, closed);
  const get = i => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  p.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const t = tension / 3 * 2;
    const c1 = [p1[0] + (p2[0] - p0[0]) * t / 2, p1[1] + (p2[1] - p0[1]) * t / 2];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t / 2, p2[1] - (p3[1] - p1[1]) * t / 2];
    p.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
  }
  if (closed) p.closePath();
  return p;
}
// Tapered limb between two points with radii r1 (start) r2 (end)
export function capsule(x1, y1, x2, y2, r1, r2 = r1) {
  const p = new Path2D();
  const a = Math.atan2(y2 - y1, x2 - x1);
  const n = a + Math.PI / 2;
  p.moveTo(x1 + Math.cos(n) * r1, y1 + Math.sin(n) * r1);
  p.arc(x1, y1, r1, n, n + Math.PI, false);
  p.lineTo(x2 + Math.cos(n + Math.PI) * r2, y2 + Math.sin(n + Math.PI) * r2);
  p.arc(x2, y2, r2, n + Math.PI, n + Math.PI * 2, false);
  p.closePath();
  return p;
}
export function star(cx, cy, r, inner = 0.45, n = 5, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n; const rr = i % 2 ? r * inner : r; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  return poly(pts);
}
export function combine(...paths) { const p = new Path2D(); for (const q of paths) p.addPath(q); return p; }
export function moved(path, dx, dy, sx = 1, sy = 1, rot = 0) {
  const p = new Path2D();
  const m = new DOMMatrix().translate(dx, dy).rotate(rot * 180 / Math.PI).scale(sx, sy);
  p.addPath(path, m);
  return p;
}

// ---------------- toon fill ----------------
// fill `path` with `base`, shadow crescent away from the light, highlight crescent toward it, then outline.
export function crescent(ctx, path, dx, dy, color) {
  ctx.save();
  ctx.clip(path);
  const inv = new Path2D();
  inv.rect(-4000, -4000, 8000, 8000);
  inv.addPath(path, new DOMMatrix([1, 0, 0, 1, dx, dy]));
  ctx.clip(inv, 'evenodd');
  ctx.fillStyle = color;
  ctx.fillRect(-4000, -4000, 8000, 8000);
  ctx.restore();
}

export function toon(ctx, path, base, o = {}) {
  const sh = o.shade ?? dark(base, o.shadeAmt ?? 0.15);
  const hi = o.light ?? light(base, o.lightAmt ?? 0.1);
  const sd = o.sd ?? 2.6;       // shadow depth
  const hd = o.hd ?? 1.4;       // highlight depth
  const L = o.dir || LIGHT;
  ctx.fillStyle = base;
  ctx.fill(path);
  if (o.grad !== false && o.gradient) {
    ctx.save(); ctx.clip(path); ctx.fillStyle = o.gradient; ctx.fillRect(-4000, -4000, 8000, 8000); ctx.restore();
  }
  if (sd > 0) crescent(ctx, path, L[0] * sd, L[1] * sd, sh);
  if (hd > 0 && o.noHi !== true) crescent(ctx, path, -L[0] * hd, -L[1] * hd, hi);
  if (o.detail) { ctx.save(); ctx.clip(path); o.detail(ctx); ctx.restore(); }
  if (o.lw !== 0) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = o.lw ?? OL;
    ctx.strokeStyle = o.outline || OUT;
    ctx.stroke(path);
  }
}

// flat fill + outline
export function flat(ctx, path, color, lw = OL, outline = OUT) {
  ctx.fillStyle = color; ctx.fill(path);
  if (lw) { ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = outline; ctx.stroke(path); }
}
export function stroke(ctx, path, color = OUT, lw = OL) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.stroke(path);
}
export function line(ctx, pts, color = OUT, lw = OL) { stroke(ctx, poly(pts, false), color, lw); }
export function curve(ctx, svg, color = OUT, lw = OL) { stroke(ctx, new Path2D(svg), color, lw); }

// soft glow (additive)
export function glow(ctx, x, y, r, color, a = 0.8) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, alpha(color, a));
  g.addColorStop(0.4, alpha(color, a * 0.45));
  g.addColorStop(1, alpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}
// ground contact shadow (drawn in sprite only for big static objects; units get runtime shadows)
export function groundShadow(ctx, x, y, rx, ry, a = 0.3) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.setTransform(ctx.getTransform().translate(x, y).scale(1, ry / rx).translate(-x, -y));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// linear gradient helper
export function lg(ctx, x1, y1, x2, y2, stops) {
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
export function rg(ctx, x, y, r0, r1, stops, x1 = x, y1 = y) {
  const g = ctx.createRadialGradient(x, y, r0, x1, y1, r1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

// ---------------- transforms ----------------
export function withT(ctx, x, y, rot, sx, sy, fn) {
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (sx !== undefined) ctx.scale(sx, sy ?? sx);
  fn(ctx);
  ctx.restore();
}

// ---------------- material details ----------------
// Bricks on a cylinder: draws mortar lines inside an already-clipped region
export function cylinderBricks(ctx, cx, top, bottom, r, ry, o = {}) {
  const rowH = o.rowH || 9;
  const R = rng(o.seed || 7);
  ctx.save();
  ctx.lineWidth = o.lw || 1.1;
  ctx.strokeStyle = o.color || 'rgba(30,20,15,0.45)';
  let row = 0;
  for (let y = bottom; y > top; y -= rowH, row++) {
    ctx.beginPath();
    ctx.ellipse(cx, y, r, ry, 0, 0, Math.PI);
    ctx.stroke();
    // vertical joints
    const n = o.cols || 7;
    for (let i = 0; i < n; i++) {
      const th = ((i + (row % 2) * 0.5) / n) * Math.PI;
      const x = cx - Math.cos(th) * r;
      const yy = y + Math.sin(th) * ry;
      if (Math.abs(Math.cos(th)) > 0.93) continue;
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x, yy - rowH * 0.98); ctx.stroke();
    }
    // random chips / stone tints
    if (o.tint) {
      for (let i = 0; i < 3; i++) {
        const th = R() * Math.PI; const x = cx - Math.cos(th) * r * 0.9; const yy = y + Math.sin(th) * ry - rowH * 0.5;
        ctx.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
        ctx.fillRect(x - 4, yy - rowH * 0.4, 7, rowH * 0.75);
      }
    }
  }
  ctx.restore();
}

// Flat-wall bricks (inside clip) between x0..x1, y0..y1
export function wallBricks(ctx, x0, y0, x1, y1, o = {}) {
  const rowH = o.rowH || 9, bw = o.bw || 18;
  const R = rng(o.seed || 3);
  ctx.save();
  ctx.lineWidth = o.lw || 1.1;
  ctx.strokeStyle = o.color || 'rgba(30,20,15,0.45)';
  let row = 0;
  for (let y = y1; y > y0 - rowH; y -= rowH, row++) {
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    for (let x = x0 + ((row % 2) * bw) / 2; x < x1; x += bw) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - rowH); ctx.stroke();
      if (o.tint && R() < 0.35) { ctx.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'; ctx.fillRect(x + 1, y - rowH + 1, bw - 2, rowH - 2); }
    }
  }
  ctx.restore();
}

// Wood planks (vertical or horizontal grain) inside clip
export function planks(ctx, x0, y0, x1, y1, o = {}) {
  const R = rng(o.seed || 11);
  const vertical = !!o.vertical;
  const pw = o.pw || 8;
  ctx.save();
  ctx.lineWidth = o.lw || 1.1;
  ctx.strokeStyle = o.color || 'rgba(40,20,8,0.55)';
  if (vertical) {
    for (let x = x0; x < x1; x += pw) {
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
      ctx.globalAlpha = 0.35;
      for (let k = 0; k < 2; k++) { const gx = x + R() * pw; ctx.beginPath(); ctx.moveTo(gx, y0 + R() * 6); ctx.lineTo(gx + (R() - 0.5) * 2, y1 - R() * 6); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
  } else {
    for (let y = y0; y < y1; y += pw) {
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.globalAlpha = 0.35;
      for (let k = 0; k < 2; k++) { const gy = y + R() * pw; ctx.beginPath(); ctx.moveTo(x0 + R() * 6, gy); ctx.lineTo(x1 - R() * 6, gy + (R() - 0.5) * 2); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

// scalloped roof tiles inside a clip, rows following ellipse arcs around (cx) between top..bottom
export function roofTiles(ctx, cx, top, bottom, rTop, rBot, o = {}) {
  const rows = o.rows || 5;
  ctx.save();
  ctx.lineWidth = o.lw || 1.1;
  ctx.strokeStyle = o.color || 'rgba(40,10,10,0.5)';
  for (let i = 1; i <= rows; i++) {
    const t = i / rows;
    const y = top + (bottom - top) * t;
    const r = rTop + (rBot - rTop) * t;
    const n = Math.max(3, Math.round(r / 5));
    for (let k = 0; k < n; k++) {
      const x0 = cx - r + (k * 2 * r) / n, x1 = cx - r + ((k + 1) * 2 * r) / n;
      const yy = y + Math.sin(((k + 0.5) / n) * Math.PI) * r * 0.22;
      ctx.beginPath();
      ctx.moveTo(x0, yy - 1);
      ctx.quadraticCurveTo((x0 + x1) / 2, yy + 4, x1, yy - 1);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// fur/grass strokes along a path region (simple random tufts)
export function tufts(ctx, cx, cy, rx, ry, n, color, seed = 5, len = 4) {
  const R = rng(seed);
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R());
    const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (R() - 0.5) * len, y - len * (0.6 + R() * 0.6)); ctx.stroke();
  }
  ctx.restore();
}

// ---------------- common props ----------------
// Banner hanging from a pole: drawn with top-left at (x,y), width w, height h, wave phase
export function banner(ctx, x, y, w, h, color, o = {}) {
  const ph = o.phase || 0;
  const wave = o.wave ?? 2;
  const p = new Path2D();
  p.moveTo(x, y);
  p.lineTo(x + w, y);
  const steps = 6;
  for (let i = 1; i <= steps; i++) { const t = i / steps; p.lineTo(x + w + Math.sin(ph + t * 3) * wave * t, y + h * t * (o.tail ? 0.85 : 1)); }
  if (o.tail) { p.lineTo(x + w / 2, y + h * 0.7 + Math.sin(ph + 2) * wave); }
  for (let i = steps; i >= 0; i--) { const t = i / steps; p.lineTo(x + Math.sin(ph + t * 3 + 0.4) * wave * t, y + h * t * (o.tail ? 0.85 : 1)); }
  p.closePath();
  toon(ctx, p, color, { sd: 2, hd: 1, lw: o.lw ?? 1.3 });
  if (o.emblem) { ctx.save(); ctx.clip(p); o.emblem(ctx, x + w / 2, y + h * 0.42); ctx.restore(); }
  if (o.trim) { ctx.save(); ctx.clip(p); ctx.fillStyle = o.trim; ctx.fillRect(x - 5, y, w + 10, 2.2); ctx.restore(); }
  return p;
}

export function pole(ctx, x, y0, y1, w = 2.2, color = '#6b4423') {
  toon(ctx, rrect(x - w / 2, y0, w, y1 - y0, w / 2), color, { sd: 1, hd: 0.5, lw: 1.2 });
  toon(ctx, circle(x, y0 - 1, w * 0.9), '#e3b34a', { sd: 0.8, hd: 0.5, lw: 1.1 });
}

// eye with pupil looking right
export function eye(ctx, x, y, r, o = {}) {
  if (o.glow) {
    glow(ctx, x, y, r * 4, o.glow, 0.7);
    flat(ctx, ellipse(x, y, r, r * (o.squint ? 0.55 : 1)), o.glowCore || '#fff6c0', o.lw ?? 0.9);
    return;
  }
  flat(ctx, ellipse(x, y, r, r * (o.squint ? 0.6 : 1.05)), o.white || '#fffaf0', o.lw ?? 0.9);
  ctx.fillStyle = o.pupil || '#1a120c';
  ctx.beginPath(); ctx.ellipse(x + r * (o.look ?? 0.35), y + r * 0.05, r * 0.5, r * (o.squint ? 0.45 : 0.62), 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(x + r * 0.15, y - r * 0.3, r * 0.2, 0, Math.PI * 2); ctx.fill();
}
