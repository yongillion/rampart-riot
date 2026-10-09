// Rampart Riot — character portraits: head-and-shoulders busts in 3/4 view facing right (128×128 units).
// The game clips them to a circle (r≈60) around the anchor, so no background is drawn.
import { toon, flat, ellipse, circle, rrect, poly, dark, light, mix, alpha, OUT, glow, stroke, rng, star, lg, rg } from '../lib/toon.js';

export const scale = 2;
const PI = Math.PI, S = Math.sin, C = Math.cos;
const lerp = (a, b, t) => a + (b - a) * t;
const sm = t => t * t * (3 - 2 * t);
const LW = 1.9, LI = 1.1;          // silhouette / inner line widths
const HEAD = 1.08;                 // global head scale for all busts
const INK = '#3a2018';             // soft inner-line colour for faces

// ---------------------------------------------------------------- curves
// Catmull-Rom samples through pts; a point [x, y, 1] is a sharp corner.
function spline(pts, closed = true, n = 10, k = 0.5) {
  const N = pts.length, out = [];
  if (N < 3) return pts.map(p => [p[0], p[1]]);
  const get = i => (closed ? pts[(i + N) % N] : pts[Math.max(0, Math.min(N - 1, i))]);
  const tan = (i, d) => (get(i)[2] ? 0 : k * (get(i + 1)[d] - get(i - 1)[d]));
  const segs = closed ? N : N - 1;
  for (let i = 0; i < segs; i++) {
    const p1 = get(i), p2 = get(i + 1);
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      const a = 2 * t3 - 3 * t2 + 1, b = t3 - 2 * t2 + t, c = -2 * t3 + 3 * t2, d = t3 - t2;
      out.push([a * p1[0] + b * tan(i, 0) + c * p2[0] + d * tan(i + 1, 0), a * p1[1] + b * tan(i, 1) + c * p2[1] + d * tan(i + 1, 1)]);
    }
  }
  if (!closed) out.push([pts[N - 1][0], pts[N - 1][1]]);
  return out;
}
const sp = (pts, k) => poly(spline(pts, true, 10, k));            // smooth closed shape
// tapered ribbon along a curve; prof = [start, mid, end] width multipliers
function ribbon(pts, w, prof = [0.15, 1, 0.15]) {
  const s = spline(pts, false, 10), n = s.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = s[Math.max(0, i - 1)], b = s[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const t = i / (n - 1);
    const ww = w * (t < 0.5 ? lerp(prof[0], prof[1], sm(t * 2)) : lerp(prof[1], prof[2], sm(t * 2 - 1))) / 2;
    L.push([s[i][0] - dy * ww, s[i][1] + dx * ww]); R.push([s[i][0] + dy * ww, s[i][1] - dx * ww]);
  }
  return poly(L.concat(R.reverse()));
}
const ink = (g, pts, w = LI, col = INK, prof) => flat(g, ribbon(pts, w, prof), col, 0);
// ribbon through sampled points with width wf(t), t in [0, 1]
function ribbonF(s, wf) {
  const n = s.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = s[Math.max(0, i - 1)], b = s[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const ww = wf(i / (n - 1)) / 2;
    L.push([s[i][0] - dy * ww, s[i][1] + dx * ww]); R.push([s[i][0] + dy * ww, s[i][1] - dx * ww]);
  }
  return poly(L.concat(R.reverse()));
}
const clipIn = (g, path, fn) => { g.save(); g.clip(path); fn(); g.restore(); };
const T = (g, p, col, o = {}) => toon(g, p, col, Object.assign({ sd: 3, hd: 1.5, lw: LW }, o));
const metal = (g, p, col, o = {}) => T(g, p, col, Object.assign({ shade: dark(col, 0.2), light: mix(col, '#ffffff', 0.55), hd: 1.8, sd: 3.4 }, o));
// shift / scale a point list
const mv = (pts, dx, dy) => pts.map(p => [p[0] + dx, p[1] + dy, p[2]]);
const area = pts => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
// closed smooth shape with holes (holes get the opposite winding so nonzero fill leaves them empty)
function holed(outer, ...inners) {
  const o = spline(outer, true, 10), path = poly(o), so = Math.sign(area(o));
  for (const inn of inners) { let q = spline(inn, true, 10); if (Math.sign(area(q)) === so) q = q.reverse(); path.addPath(poly(q)); }
  return path;
}

// ---------------------------------------------------------------- emblems
function towerCrest(g, x, y, s = 1, col = '#f2ecdc') {   // the realm's white tower
  g.save(); g.translate(x, y); g.scale(s, s);
  const p = poly([[-4, 6], [-4, -2], [-5.2, -2.6], [-5.2, -7], [-3.2, -7], [-3.2, -5.2], [-1, -5.2], [-1, -7], [1, -7], [1, -5.2], [3.2, -5.2], [3.2, -7], [5.2, -7], [5.2, -2.6], [4, -2], [4, 6]]);
  flat(g, p, col, 0.7);
  flat(g, poly([[-1.3, 6], [-1.3, 2.4], [0, 1.2], [1.3, 2.4], [1.3, 6]]), mix(col, '#1a2a4a', 0.75), 0);
  g.restore();
}
function starCrest(g, x, y, r, col = '#e8eef8', o = {}) { // eight-pointed star of Maelis
  if (o.glow) glow(g, x, y, r * 3, o.glow, o.ga ?? 0.5);
  T(g, star(x, y, r, 0.42, 8, -PI / 2), col, { sd: r * 0.25, hd: r * 0.2, lw: o.lw ?? 1, light: '#ffffff', shade: o.shade || mix(col, '#5a6a9a', 0.4) });
  flat(g, star(x, y, r * 0.5, 0.5, 4, -PI / 2), o.core || '#ffffff', 0);
}
function raven(g, x, y, s = 1, col = '#14100f', crown = '#c8a040') { // Morrow raven (facing right), crowned
  g.save(); g.translate(x, y); g.scale(s, s);
  const body = sp([[-6, 3], [-3, -1], [1, -3.5], [3.2, -5.6], [5.4, -5], [7.6, -4.2], [5.6, -3.4], [4.6, -1.8], [3.6, 1.6], [0, 4.4], [-4, 6.2], [-7.4, 7.2, 1], [-5.6, 4.8]]);
  flat(g, body, col, 0);
  flat(g, sp([[-1.5, -1], [-5.5, -6.5], [-4.2, -2.6], [-7.8, -4.4], [-4.4, 0.6]]), col, 0); // wing
  flat(g, poly([[2.6, -6], [3, -8.4], [3.9, -6.9], [4.6, -8.8], [5.2, -6.8], [6, -8.2], [5.9, -5.6]]), crown, 0);
  g.restore();
}

// ---------------------------------------------------------------- 3/4 head
// Standard head geometry. (x, y) = skull centre x / eye line y; k = head scale. Returns key points.
function geo(o = {}) {
  const x = o.x ?? 61, y = o.y ?? 46, k = (o.k ?? 1.06) * HEAD;
  const fw = o.width ?? 1, jw = o.jaw ?? 1, cl = o.chin ?? 1, ck = o.cheek ?? 0, cr = o.crown ?? 1, cf = o.chinFwd ?? 0;
  const P = (dx, dy) => [x + dx * k, y + dy * k];
  const outline = [
    P(-12.5 * fw, 9), P(-17.6 * fw, -2), P(-15.6 * fw, -15.5 * cr), P(-5, -23.2 * cr), P(8, -22.4 * cr),
    P(15.8 * fw, -13.5 * cr), P(18.2 * fw, -4.6), P(17.3 * fw, 0.4), P((18.4 + ck) * fw, 5.6), P((17.1 + ck * 0.7) * fw, 12.2),
    P((15.2 + cf * 0.5) * fw, 18.4 * cl), P(13.4 + cf, 22.4 * cl), P(9.6 + cf * 0.7, 24.4 * cl), P(3.2, 23.6 * cl),
    P(-3.5 * jw, 20 * cl), P(-8.4 * jw, 14.6), P(-11, 10.6),
  ];
  return {
    x, y, k, P, outline, fw, cl,
    eyeN: P(1.8 * fw, 0), eyeF: P(13.9 * fw, 0.2),
    nose: P(12.9 * fw, 9.6), mouth: P(10.2 * fw, 16.3 * cl), ear: P(-7.4 * fw, 4.6),
  };
}

// skin palette
function skinPal(base, o = {}) {
  return { base, sh: o.sh || mix(dark(base, 0.13), '#b04a40', 0.16), sh2: o.sh2 || mix(dark(base, 0.24), '#8a3038', 0.2), hi: o.hi || light(base, 0.06), blush: o.blush || '#e0705e', line: o.line || mix(INK, dark(base, 0.4), 0.3) };
}

function neck(g, G, pal, o = {}) {
  const { P } = G, w = o.w ?? 1, len = o.len ?? 40;
  const p = sp([P(-12.5 * w, 4), P(-13 * w, len * 0.6), P(-14 * w, len), P(9.5 * w, len + 1), P(8.6 * w, len * 0.6), P(7.5, 20)], 0.4);
  T(g, p, pal.base, { sd: 0, hd: 0, lw: LW });
  clipIn(g, p, () => {
    // jaw cast shadow + far side of the neck
    g.fillStyle = pal.sh; g.fill(sp(mv(G.outline, 1.2, 6.5)));
    g.fillStyle = alpha(pal.sh, 0.55); g.fill(poly([P(7.2 * w, 10), P(14, 10), P(14, len + 4), P(8.4 * w, len + 4)]));
    if (o.adam) ink(g, [P(6.6 * w, 27), P(7.4 * w, 30)], 1.1, pal.sh2);
  });
  return p;
}

// draws ear on the near side
function ear(g, G, pal, o = {}) {
  const [ex, ey] = G.ear, s = (o.s ?? 1) * G.k;
  const p = sp([[ex + 2.8 * s, ey - 4.8 * s], [ex - 0.6 * s, ey - 6.6 * s], [ex - 3.4 * s, ey - 4.2 * s], [ex - 3.6 * s, ey + 0.2 * s], [ex - 2.4 * s, ey + 4 * s], [ex - 0.6 * s, ey + 6.6 * s], [ex + 1.6 * s, ey + 6.6 * s], [ex + 2.6 * s, ey + 4 * s]]);
  T(g, p, pal.base, { sd: 1.4, hd: 0.8, lw: LI * 1.2, shade: pal.sh });
  ink(g, [[ex + 1.4 * s, ey - 3.2 * s], [ex - 1.4 * s, ey - 3.6 * s], [ex - 2 * s, ey - 0.2 * s], [ex - 0.6 * s, ey + 2.6 * s], [ex + 0.6 * s, ey + 4.4 * s]], 1.1, pal.sh2, [0.3, 1, 0.3]);
  flat(g, ellipse(ex + 1.2 * s, ey + 0.8 * s, 1.1 * s, 1.8 * s), pal.sh2, 0);
  return p;
}

// one eye. side: 'n' (near, inner corner on the right) or 'f' (far, inner corner on the left)
function eye(g, cx, cy, o) {
  const k = o.k ?? 1, fsh = o.side === 'f' ? (o.fs ?? 0.62) : 1;
  const w = (o.w ?? 4.2) * k * fsh, h = (o.h ?? 2) * k, lid = o.lid ?? 0.15, low = o.low ?? 0, tilt = (o.tilt ?? 0.4) * k;
  const dir = o.side === 'f' ? 1 : -1;            // direction from inner to outer corner
  const I = [cx - dir * w, cy + 0.2], O = [cx + dir * w, cy - tilt];
  const up = h * (1.15 - lid * 1.1), dn = h * (0.95 - low);
  // lid curves: upper peaks nearer the inner corner, lower dips nearer the outer
  const U = [I, [lerp(I[0], O[0], 0.33), cy - up], [lerp(I[0], O[0], 0.72), cy - up * 0.82 - tilt * 0.5], O];
  const hp = (o.happy ?? 0) * h;
  const D = [O, [lerp(I[0], O[0], 0.62), cy + dn - hp], [lerp(I[0], O[0], 0.25), cy + dn * 0.72 - hp * 0.8], I];
  const shape = poly(spline(U, false, 8).concat(spline(D, false, 8)));
  flat(g, shape, o.white || '#f6f0e4', 0);
  const ir = (o.ir ?? 1.95) * k;
  const lx = cx + (o.look?.[0] ?? 0.9) * k * (o.side === 'f' ? 0.7 : 1), ly = cy + (o.look?.[1] ?? 0.1) * k;
  const iw = ir * (o.side === 'f' ? 0.66 : 0.9);
  clipIn(g, shape, () => {
    flat(g, ellipse(lx, ly, iw, ir), o.iris || '#5a3a22', 0);
    flat(g, ellipse(lx, ly + ir * 0.35, iw * 0.7, ir * 0.55), light(o.iris || '#5a3a22', 0.12), 0);
    stroke(g, ellipse(lx, ly, iw, ir), dark(o.iris || '#5a3a22', 0.25), 0.55);
    flat(g, ellipse(lx + 0.05, ly, iw * (o.pupilR ?? 0.48), ir * (o.pupilR ?? 0.48) * 1.04), o.pupil || '#120c0a', 0);
    // shadow cast by the upper lid
    g.fillStyle = o.lidShadow || 'rgba(70,30,30,0.28)';
    g.fill(poly(spline(U, false, 8).concat(spline(mv(U, 0, h * 0.55).reverse(), false, 8))));
    if (!o.noHi) {
      flat(g, ellipse(lx - iw * 0.35, ly - ir * 0.42, ir * 0.3, ir * 0.24), 'rgba(255,255,255,0.95)', 0);
      flat(g, circle(lx + iw * 0.4, ly + ir * 0.35, ir * 0.12), 'rgba(255,255,255,0.7)', 0);
    }
  });
  // upper lash line (thicker toward the outer corner), lower lid
  const lc = o.lash || OUT;
  flat(g, ribbon(U, (o.lw ?? 1.25) * k, dir < 0 ? [1.5, 1, 0.25] : [0.25, 1, 1.5]), lc, 0);
  if (o.flick) ink(g, [O, [O[0] + dir * 1.3 * k, O[1] - 0.9 * k], [O[0] + dir * 2.2 * k, O[1] - 1.6 * k]], 0.9, lc, [1, 0.7, 0.1]);
  ink(g, D.slice(0, 3), o.lowW ?? 0.7, o.lowCol || alpha(lc, 0.55), [0.3, 1, 0.1]);
  if (o.crease !== false) ink(g, mv(U.slice(1), 0, -(o.creaseH ?? 1.5) * k), 0.6, o.creaseCol || alpha(INK, 0.5), [0.2, 1, 0.3]);
  if (o.bag) ink(g, mv(D.slice(0, 3), 0, (o.bagH ?? 1.6) * k), 0.6, alpha(INK, o.bag), [0.2, 1, 0.2]);
  return { I, O, U, D, shape, iris: [lx, ly] };
}

// tapered brow shape from inner to outer end
function brow(g, pts, w, col, o = {}) {
  flat(g, ribbon(pts, w, o.prof || [1.1, 0.95, 0.35]), col, 0);
  if (o.ol) stroke(g, ribbon(pts, w, o.prof || [1.1, 0.95, 0.35]), o.ol, o.olw ?? 0.5);
}
// brow pair from offsets relative to each eye: n = [[dx,dy] inner, mid, outer], f likewise
function brows(g, G, n, f, w, col, o = {}) {
  const k = G.k;
  brow(g, n.map(([dx, dy]) => [G.eyeN[0] + dx * k, G.eyeN[1] + dy * k]), w * k, col, o);
  brow(g, f.map(([dx, dy]) => [G.eyeF[0] + dx * k, G.eyeF[1] + dy * k]), w * k * 0.85, col, o);
}

function nose(g, G, pal, o = {}) {
  const [nx, ny] = G.nose, s = (o.s ?? 1) * G.k, { P } = G;
  const bridgeTop = P(10.6 * G.fw, -2.5);
  const tip = [nx + (o.tipX ?? 0) * s, ny + (o.tipY ?? 0) * s];
  const hook = o.hook ?? 0;
  // far side of the nose in shadow
  const side = sp([bridgeTop, [lerp(bridgeTop[0], tip[0], 0.5) + 0.4 + hook, lerp(bridgeTop[1], tip[1], 0.5)], [tip[0] + 0.9 * s, tip[1] - 0.6 * s], [tip[0] + 0.2 * s, tip[1] + 1.4 * s], [tip[0] - 1.2 * s, tip[1] + 0.2 * s], [lerp(bridgeTop[0], tip[0], 0.55) - 0.6, lerp(bridgeTop[1], tip[1], 0.55)]]);
  if (o.shade !== false) { g.fillStyle = alpha(pal.sh, 0.85); g.fill(side); }
  if (o.red) flat(g, ellipse(tip[0] - 1.2 * s, tip[1] - 0.2 * s, 2.6 * s, 2 * s), alpha(pal.blush, o.red), 0);
  // under-nose shadow
  if (o.under !== false) flat(g, sp([[tip[0] - 4 * s, tip[1] + 1.8 * s], [tip[0] - 0.5 * s, tip[1] + 1.4 * s], [tip[0] + 1.2 * s, tip[1] + 2.4 * s], [tip[0] - 1.5 * s, tip[1] + 3.6 * s]]), alpha(pal.sh, 0.75), 0);
  // ridge / tip / nostril lines
  ink(g, [bridgeTop, [lerp(bridgeTop[0], tip[0], 0.45) + 0.5 + hook * 1.4, lerp(bridgeTop[1], tip[1], 0.45)], [tip[0] + 0.9 * s, tip[1] - 1.2 * s], [tip[0] + 0.9 * s, tip[1] + 0.4 * s], [tip[0] - 0.2 * s, tip[1] + 1.6 * s]], o.w ?? 1.05, pal.line, [0.05, 0.8, 1]);
  ink(g, [[tip[0] - 1.8 * s, tip[1] + 1.8 * s], [tip[0] - 3 * s, tip[1] + 1.2 * s], [tip[0] - 3.6 * s, tip[1] - 0.4 * s], [tip[0] - 2.8 * s, tip[1] - 1.6 * s]], 0.95, pal.line, [1, 0.8, 0.1]);
  flat(g, ellipse(tip[0] - 1.6 * s, tip[1] + 1.6 * s, 1.1 * s, 0.55 * s, 0.2), alpha(OUT, 0.75), 0);
  if (o.hi !== false) flat(g, ellipse(tip[0] - 0.6 * s, tip[1] - 1.1 * s, 0.9 * s, 0.6 * s, -0.4), alpha('#ffffff', 0.4), 0);
  return { tip };
}

// mouth: curve >0 smiles; open 0..1; teeth; smirk raises the far corner
function mouth(g, G, pal, o = {}) {
  const [mx, my] = G.mouth, s = (o.s ?? 1) * G.k;
  const wn = (o.w ?? 5.6) * s, wf = wn * 0.62;
  const cv = o.curve ?? 0, op = o.open ?? 0, sk = o.smirk ?? 0;
  const L = [mx - wn, my - cv * 1.6 + (o.dropN ?? 0)], R = [mx + wf, my - cv * 1.3 - sk * 1.5];
  if (op > 0) {
    const top = my - op * 0.8 * s, bot = my + op * 3.4 * s;
    const m = sp([L, [mx - wn * 0.4, top - 0.3], [mx + wf * 0.4, top - 0.2], R, [mx + wf * 0.3, bot - op * 0.5], [mx - wn * 0.4, bot]], 0.45);
    flat(g, m, o.inside || '#4a1612', 0);
    clipIn(g, m, () => {
      if (o.teeth) flat(g, rrect(mx - wn, top - 2, wn + wf, 2 + op * 1.6 * (o.teeth === 'big' ? 1.6 : 1), 1), '#f6efe0', 0);
      if (o.lowTeeth) flat(g, rrect(mx - wn, bot - op * 1.4, wn + wf, 3, 1), '#efe6d2', 0);
      if (o.tongue !== false && !o.grit) flat(g, ellipse(mx - 0.5, bot + 0.6, wn * 0.65, op * 1.4 + 0.4), '#b0443a', 0);
      if (o.grit) {
        flat(g, rrect(mx - wn - 1, top - 3, wn + wf + 2, bot - top + 6, 0.5), '#f0e8d6', 0);
        ink(g, [[mx - wn, (top + bot) / 2 + 0.2], [mx, (top + bot) / 2 + 0.5], [mx + wf, (top + bot) / 2]], 0.7, alpha(OUT, 0.7), [1, 1, 1]);
        for (let i = 1; i < 6; i++) { const tx = mx - wn + (wn + wf) * i / 6; ink(g, [[tx, top - 1], [tx + 0.2, bot + 1]], 0.5, alpha(OUT, 0.45), [1, 1, 1]); }
      }
    });
    stroke(g, m, pal.line, LI * 1.05);
    // lower lip shade
    ink(g, [[mx - wn * 0.5, bot + 1.6 * s], [mx, bot + 2.1 * s], [mx + wf * 0.5, bot + 1.6 * s]], 1.1, alpha(pal.sh2, 0.8));
  } else {
    const mid = [mx, my + (o.midY ?? 0.2) - cv * 0.2];
    if (o.lips) { flat(g, sp([[mx - wn * 0.7, my + 0.5], [mx, my + 0.3], [mx + wf * 0.7, my + 0.5], [mx + wf * 0.3, my + 2.4 * s], [mx - wn * 0.35, my + 2.5 * s]]), alpha(o.lips, 0.6), 0); flat(g, sp([[mx - wn * 0.6, my - 0.2], [mx - wn * 0.1, my - 1.3 * s], [mx + 0.6, my - 0.9 * s], [mx + wf * 0.6, my - 0.3]]), alpha(o.lips, 0.35), 0); }
    ink(g, [L, [lerp(L[0], mid[0], 0.5), lerp(L[1], mid[1], 0.6) + 0.1], mid, [lerp(mid[0], R[0], 0.55), lerp(mid[1], R[1], 0.5)], R], o.lw ?? 1.15, pal.line, [0.25, 1, 0.3]);
    // lower lip shadow + mouth-corner tuck
    ink(g, [[mx - wn * 0.45, my + 2.7 * s], [mx + 0.2, my + 3.3 * s], [mx + wf * 0.5, my + 2.6 * s]], o.lowW ?? 1.2, alpha(pal.sh2, 0.75));
    if (o.corner !== false) ink(g, [[L[0] + 0.2, L[1] - 0.8], [L[0] - 0.5, L[1] + 0.2 - cv * 0.2], [L[0], L[1] + 1.3]], 0.75, alpha(pal.line, 0.7));
  }
}

// whole face: skin shape with cel shading, ear, eyes, brows, nose, mouth. Returns head path.
function face(g, G, pal, o = {}) {
  const head = sp(G.outline);
  const { P, k } = G;
  flat(g, head, pal.base, 0);
  clipIn(g, head, () => {
    // far-side plane + chin underside in shadow
    g.fillStyle = pal.sh;
    g.fill(sp([P(14.6 * G.fw, -30), P(15.4 * G.fw, -12), P(15.2 * G.fw, -4), P(16.6 * G.fw, 3), P(15.4 * G.fw, 10), P(13.2, 17), P(11, 21.6 * G.cl), P(4, 23.2 * G.cl), P(-6, 19), P(-20, 30), P(40, 40), P(40, -30)], 0.4));
    // soft socket shading under the brows
    g.fillStyle = alpha(pal.sh, o.socket ?? 0.45);
    g.fill(ellipse(G.eyeN[0] + 0.5 * k, G.eyeN[1] - 2.2 * k, 6.4 * k, 2.6 * k, -0.05));
    g.fill(ellipse(G.eyeF[0] + 0.6 * k, G.eyeF[1] - 2.2 * k, 3.6 * k, 2.4 * k));
    // cheek warmth
    if (o.blush !== 0) {
      const b = o.blush ?? 0.22;
      g.fillStyle = rg(g, G.eyeN[0] - 1, G.y + 9 * k, 0, 7 * k, [[0, alpha(pal.blush, b)], [1, alpha(pal.blush, 0)]]); g.fillRect(G.x - 30, G.y - 20, 60, 60);
      g.fillStyle = rg(g, G.eyeF[0] + 1.5, G.y + 9 * k, 0, 4.5 * k, [[0, alpha(pal.blush, b * 0.8)], [1, alpha(pal.blush, 0)]]); g.fillRect(G.x - 30, G.y - 20, 60, 60);
    }
    // lit forehead / cheekbone
    g.fillStyle = alpha(pal.hi, 0.9);
    g.fill(sp([P(-13, -14), P(-5, -21), P(6, -21), P(1, -17), P(-8, -12)]));
    g.fill(ellipse(G.eyeN[0] - 1.6 * k, G.y + 6.6 * k, 3.6 * k, 1.6 * k, -0.25));
    if (o.under) o.under(g, G);
  });
  // silhouette (open at the back of the neck)
  const s = spline(G.outline, true, 10).slice(0, -18), jt = o.jawLine ?? 0.55;
  flat(g, ribbonF(s, t => LW * (t < 0.03 ? 0.6 + t / 0.03 * 0.4 : t < 0.8 ? 1 : lerp(1, jt, sm((t - 0.8) / 0.2)))), OUT, 0);
  if (o.ear !== false) ear(g, G, pal, o.earO);
  if (o.mid) o.mid(g, G);
  const E = Object.assign({ k }, o.eyes || {});
  const eN = eye(g, G.eyeN[0], G.eyeN[1], Object.assign({ side: 'n' }, E, E.n));
  const eF = eye(g, G.eyeF[0], G.eyeF[1], Object.assign({ side: 'f' }, E, E.f));
  if (o.brows) o.brows(g, G);
  if (o.nose !== false) nose(g, G, pal, o.nose);
  if (o.mouth !== false) mouth(g, G, pal, o.mouth);
  if (o.over) o.over(g, G, eN, eF);
  return head;
}

// hair / fur mass: toon fill + strand lines clipped inside
function hair(g, path, col, o = {}) {
  T(g, path, col, Object.assign({ sd: o.sd ?? 3, hd: o.hd ?? 0, lw: o.lw ?? LW, shade: o.shade || dark(col, 0.12) }, o.t || {}));
  clipIn(g, path, () => {
    for (const s of o.dark || []) ink(g, s, o.dw ?? 1.1, o.dcol || dark(col, 0.2), [0.1, 1, 0.1]);
    for (const s of o.lite || []) ink(g, s, o.lw2 ?? 1.6, o.lcol || light(col, 0.12), [0.1, 1, 0.1]);
  });
  if (o.ol !== false) stroke(g, path, OUT, o.lw ?? LW);
}

// pointed lock of hair along a spine (w = max width); drawn with toon shading + outline
function lockPath(pts, w, prof = [0.7, 1, 0.05]) { return ribbon(pts, w, prof); }
function locks(g, list, col, o = {}) {
  for (const L of list) {
    const p = lockPath(L.p, L.w, L.prof);
    T(g, p, L.col || col, { sd: o.sd ?? 1.6, hd: o.hd ?? 0, lw: o.lw ?? 1.3, shade: o.shade || dark(L.col || col, 0.12) });
    if (o.hi !== false) clipIn(g, p, () => ink(g, L.p.slice(0, Math.max(2, L.p.length - 1)).map(([x, y]) => [x - L.w * 0.12, y - L.w * 0.1]), L.w * 0.22, o.hcol || light(L.col || col, 0.14), [0.1, 1, 0.1]));
    if (o.strand) clipIn(g, p, () => ink(g, L.p.map(([x, y]) => [x + L.w * 0.18, y + L.w * 0.12]), 0.6, o.strand, [0.1, 1, 0.1]));
  }
}

// classic three-strand braid along a spine, drawn bottom-up so upper lobes overlap
function braid(g, pts, w, col, o = {}) {
  const s = spline(pts, false, 14), segs = [];
  let acc = 0;
  for (let i = 1; i < s.length; i++) { acc += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); if (acc >= w * 0.62) { acc = 0; segs.push(i); } }
  const n = segs.length;
  for (let j = n - 1; j >= 0; j--) {
    const i = segs[j], a = s[Math.max(0, i - 1)], b = s[Math.min(s.length - 1, i + 1)];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), side = j % 2 ? 1 : -1, ww = w * (1 - 0.35 * j / n);
    const cx = s[i][0] + C(ang + PI / 2) * side * ww * 0.18, cy = s[i][1] + S(ang + PI / 2) * side * ww * 0.18;
    T(g, ellipse(cx, cy, ww * 0.62, ww * 0.36, ang + side * 0.62), col, { sd: 1.2, hd: 0.8, lw: o.lw ?? 1.1, light: o.light || light(col, 0.14), shade: dark(col, 0.14) });
  }
}
// feathered wing: n pointed feathers fanning from (x, y) between angles a0..a1 (outermost drawn first)
function wingF(g, x, y, a0, a1, n, len, col, o = {}) {
  const sh = o.shade || mix(col, '#6a7a9a', 0.35);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = lerp(a0, a1, t), l = len * (o.taper ? lerp(1, o.taper, t) : 1);
    const pts = [[x, y], [x + C(a) * l * 0.5 + C(a + PI / 2) * l * 0.05, y + S(a) * l * 0.5 + S(a + PI / 2) * l * 0.05], [x + C(a) * l, y + S(a) * l]];
    const p = lockPath(pts, l * (o.fw ?? 0.2), [0.5, 1, 0.08]);
    T(g, p, col, { sd: 1.4, hd: 0, lw: 1.1, shade: sh });
    ink(g, pts.slice(0, 2).concat([[x + C(a) * l * 0.85, y + S(a) * l * 0.85]]), 0.6, alpha(sh, 0.9), [0.4, 1, 0.1]);
  }
}

// ---------------------------------------------------------------- costume helpers
function mail(c, x0, y0, x1, y1, col = 'rgba(20,22,30,0.38)', hi = 'rgba(255,255,255,0.18)', r = 1.4) {
  c.lineWidth = 0.75;
  for (let yy = y0, row = 0; yy < y1; yy += r * 1.7, row++) for (let xx = x0 + (row % 2) * r; xx < x1; xx += r * 2) {
    c.strokeStyle = col; c.beginPath(); c.arc(xx, yy, r, 0.15, PI - 0.15); c.stroke();
    c.strokeStyle = hi; c.beginPath(); c.arc(xx - 0.3, yy - 0.3, r * 0.7, PI * 1.1, PI * 1.6); c.stroke();
  }
}
function scratches(c, seed, x0, y0, x1, y1, n = 6, col = 'rgba(255,255,255,0.45)') {
  const R = rng(seed);
  for (let i = 0; i < n; i++) { const x = R.range(x0, x1), y = R.range(y0, y1), a = R.range(-0.6, 0.6), l = R.range(2, 5); ink(c, [[x, y], [x + C(a) * l, y + S(a) * l]], 0.6, col, [0.2, 1, 0.2]); }
}
function rivets(g, pts, col = '#d8b052', r = 0.9) { for (const [x, y] of pts) { flat(g, circle(x, y, r), col, 0.5); flat(g, circle(x - r * 0.3, y - r * 0.3, r * 0.35), 'rgba(255,255,255,0.7)', 0); } }
function folds(c, list, col, w = 1) { for (const f of list) ink(c, f, w, col, [0.1, 1, 0.1]); }

// ---------------------------------------------------------------- characters
// The Warden — the player: knight-commander's armet with the visor raised; the face stays in shadow.
function warden(g) {
  const G = geo({ x: 61, y: 46, k: 1.04, jaw: 1.05 });
  const { P } = G;
  const pal = skinPal('#c8987a');
  const steel = '#b4bec8', steelD = '#8e98a4', blue = '#22406e', blueL = '#34588e', blue2 = '#2f5fa8', gold = '#d8b052';
  // horsehair plume sweeping back from the crest
  hair(g, sp([P(0, -29), P(-9, -36.4), P(-22, -37), P(-33, -30), P(-40, -18), P(-42.6, -4, 1), P(-37, -11.6), P(-35.4, -1, 1), P(-31.4, -13), P(-25, -23), P(-14, -28.6)]), '#2a4a8a',
    { sd: 3, dark: [[P(-6, -32), P(-20, -32.4), P(-32, -23), P(-38, -9)], [P(-10, -29), P(-24, -27), P(-32, -16)]], dcol: '#162a54', lite: [[P(-4, -34.6), P(-18, -35.4), P(-30, -28.4)]], lcol: '#4a72b8' });
  // breastplate, blue tabard with the white tower, deep-blue mantle with gold edge
  metal(g, sp([[34, 130], [36, 100], [46, 90], [90, 90], [100, 100], [102, 130]]), steel, { sd: 4, detail: c => { c.fillStyle = alpha('#ffffff', 0.35); c.fill(sp([[40, 128], [41, 104], [46, 96], [44, 114]])); } });
  T(g, sp([[56, 130], [57, 99], [61, 92], [83, 92], [87, 99], [87, 130]]), blue2, { sd: 3.4, light: '#4a7ac8' });
  stroke(g, sp([[59, 130], [60, 100], [63.5, 95], [80.5, 95], [84, 100], [84, 130]]), gold, 1.1);
  towerCrest(g, 71.5, 106, 1.45);
  const mN = sp([[-6, 130], [-4, 102], [8, 88], [26, 80], [42, 78], [50, 88], [48, 104], [46, 130]]);
  const mF = sp([[92, 130], [92, 104], [88, 90], [96, 82], [112, 86], [124, 98], [132, 130]]);
  for (const m of [mN, mF]) T(g, m, blue, { sd: 4.5, hd: 1.4, light: blueL, detail: c => folds(c, [[[16, 128], [18, 108], [26, 96]], [[32, 128], [34, 102]], [[108, 128], [106, 106]], [[120, 128], [116, 108]]], alpha('#0a1430', 0.5), 1.4) });
  stroke(g, sp([[46.6, 130], [48.4, 104], [49, 89], [42.6, 81]]), gold, 1.5);
  stroke(g, sp([[92.6, 130], [93.6, 104], [90.6, 91]]), gold, 1.5);
  // gorget lames
  metal(g, sp([[42, 95], [44, 88], [56, 84], [82, 85], [94, 89], [93, 96], [66, 95]]), steelD, { sd: 2.2 });
  metal(g, sp([[46, 89], [48, 82], [60, 78], [80, 79], [89, 83], [88, 90], [64, 89.6]]), steel, { sd: 2 });
  rivets(g, [[47, 92], [90, 92.6]], '#d8dee4', 0.8);
  // the face, deep in shadow
  const opening = [P(-3, -7.2), P(8, -9.6), P(19.8, -7.6), P(20.6, 0), P(19.4, 7.4), P(10, 9.2), P(0, 9.8), P(-3.6, 4), P(-4.2, -2)];
  face(g, G, pal, { ear: false, blush: 0.08, eyes: { iris: '#6a7a90', lid: 0.32, h: 1.9 }, mouth: false,
    brows: (g, G) => brows(g, G, [[4.4, -4.1], [0, -4.8], [-4.6, -4.4]], [[-2.2, -4.2], [0.8, -4.7], [3.4, -4.4]], 2.2, '#3a2a22') });
  clipIn(g, sp(opening), () => { g.fillStyle = lg(g, 0, P(0, -10)[1], 0, P(0, 10)[1], [[0, 'rgba(6,8,16,0.95)'], [0.5, 'rgba(8,10,20,0.8)'], [1, 'rgba(12,12,22,0.6)']]); g.fillRect(0, 0, 128, 128); });
  for (const [e, r] of [[G.eyeN, 1], [G.eyeF, 0.75]]) { glow(g, e[0] + 1, e[1], 4.4 * r, '#9ac0ff', 0.4); flat(g, ellipse(e[0] + 0.9 * r, e[1] - 0.1, 1.25 * r, 0.8 * r), '#eef6ff', 0); }
  // helm shell: skull, cheek plates and bevor around the face opening
  const outer = [P(-21, 12), P(-23, -3), P(-20.4, -17), P(-10, -28.6), P(4, -30), P(15.4, -25), P(21.4, -15), P(23, -6), P(23.4, 4), P(22.4, 15), P(17.6, 25.4), P(8, 30), P(-2, 28.6), P(-10, 23), P(-15, 21), P(-21.4, 20)];
  const helm = holed(outer, opening);
  metal(g, helm, steel, { sd: 4.2, hd: 2.2, detail: c => {
    c.fillStyle = alpha('#ffffff', 0.42); c.fill(sp([P(-17, -14), P(-10, -24), P(-2, -27.6), P(-8, -22), P(-14, -10)]));
    c.fillStyle = alpha('#3a4450', 0.3); c.fill(sp([P(-21, 12), P(-14, 13), P(-8, 19), P(-14, 21), P(-21.4, 20)]));
    // bevor lames, breaths
    for (const y of [15, 21]) ink(c, [P(-12, y - 2), P(2, y + 1.4), P(14, y), P(22, y - 3.6)], 1, alpha('#2a3440', 0.55), [0.3, 1, 0.3]);
    for (let i = 0; i < 4; i++) flat(c, circle(P(15.6 + i * 1.6, 10.6 + i * 0.9)[0], P(15.6, 10.6 + i * 1.8)[1], 0.6), alpha(OUT, 0.8), 0);
  } });
  clipIn(g, helm, () => stroke(g, sp(opening), gold, 4));
  stroke(g, sp(opening), OUT, LW);
  ink(g, [P(-20, -10), P(-14, -22), P(-4, -29.6), P(5, -30)], 2.2, gold, [0.4, 1, 1]);
  // raised visor with its sight slit
  const visor = sp([P(-8.6, -5), P(-8, -15), P(0.6, -25.4), P(13, -26), P(23, -19.4), P(26.4, -12), P(21, -11.4), P(10, -13.6), P(0.4, -12), P(-4.6, -5.6)]);
  metal(g, visor, mix(steel, '#ffffff', 0.08), { sd: 3, hd: 2 });
  ink(g, [P(1.4, -15), P(11, -17), P(21.8, -14.6)], 1.6, OUT, [0.4, 1, 0.6]);
  ink(g, [P(-7.4, -6), P(0.4, -12.8), P(10, -14.4), P(24, -12.2)], 1, gold, [0.4, 1, 0.6]);
  rivets(g, [P(-7, -7.6)], '#e0e6ec', 1.5);
}

// Brannoc — grizzled veteran (late fifties): grey crop and beard, scar, kind tired eyes, worn blue & steel.
function brannoc(g) {
  const G = geo({ x: 59, y: 46, k: 1.08, jaw: 1.12, cheek: 0.4, width: 1.04 });
  const { P } = G;
  const pal = skinPal('#e2b088', { blush: '#d8644e' });
  const steel = '#a8b0b8', blue = '#2f5fa8', cape = '#2a4a8a', gold = '#d8b052', grey = '#b8b2a8';
  // cape behind
  T(g, sp([[-4, 128], [0, 100], [16, 84], [44, 76], [90, 78], [116, 86], [132, 128]]), cape, { sd: 4 });
  // torso: mail shirt + blue tabard
  const torso = sp([[4, 130], [8, 100], [24, 88], [42, 78], [76, 80], [104, 86], [120, 100], [124, 130]]);
  T(g, torso, '#8a929a', { sd: 4, detail: c => mail(c, 0, 76, 128, 130) });
  const tab = sp([[44, 130], [46, 100], [52, 90], [92, 90], [98, 100], [100, 130]]);
  T(g, tab, blue, { sd: 4, detail: c => { folds(c, [[[58, 128], [60, 104]], [[90, 128], [88, 106]]], alpha('#0a1a3a', 0.4), 1.4); c.fillStyle = alpha('#ffffff', 0.08); c.fillRect(44, 100, 6, 30); } });
  stroke(g, sp([[47, 130], [49, 101], [54, 93], [90, 93], [95, 101], [97, 130]]), alpha(gold, 0.9), 1.2);
  towerCrest(g, 76, 105, 1.3, '#f2ecdc');
  neck(g, G, pal, { w: 1.3, len: 36 });
  // mail collar
  T(g, sp([[34, 86], [36, 76], [52, 72], [78, 74], [86, 80], [84, 90], [58, 88]]), '#9aa2aa', { sd: 2.6, detail: c => mail(c, 30, 70, 90, 92, 'rgba(20,22,30,0.45)', 'rgba(255,255,255,0.25)', 1.2) });
  // pauldrons (dented, scratched), gold trimmed
  metal(g, sp([[-2, 124], [-1, 110], [14, 109], [34, 103], [45, 97], [47, 105], [38, 114], [18, 120]]), dark(steel, 0.05), { detail: c => scratches(c, 9, 4, 108, 44, 120, 5) });
  stroke(g, sp([[1, 120.6], [1.4, 112.6], [15, 111.8], [34, 106], [44, 100.6]]), gold, 1.2);
  const pN = sp([[-2, 112], [0, 96], [12, 85], [30, 81], [44, 86], [46, 98], [36, 106], [16, 112]]);
  metal(g, pN, steel, { detail: c => { scratches(c, 3, 6, 88, 40, 108, 8); flat(c, ellipse(26, 92, 4, 2.2, -0.4), alpha('#5a6470', 0.5), 0); flat(c, ellipse(25, 91, 3.4, 1.4, -0.4), alpha('#ffffff', 0.35), 0); } });
  stroke(g, sp([[1, 108.6], [3, 97], [14, 87.5], [30, 84], [42, 88.6], [43.5, 97], [35, 103.5], [16, 108.6]]), gold, 1.3);
  rivets(g, [[8, 100], [18, 92], [31, 88], [40, 95]]);
  const pF = sp([[92, 84], [108, 82], [124, 90], [130, 104], [122, 110], [104, 100]]);
  metal(g, pF, steel, { detail: c => scratches(c, 5, 96, 84, 126, 104, 6) });
  stroke(g, sp([[95, 86.5], [108, 85], [121.5, 92], [126, 102], [120, 106], [105, 97.5]]), gold, 1.3);
  // hair (behind the face silhouette)
  const hairP = sp([P(7, -23.6), P(-2, -26), P(-12.5, -22.6), P(-19, -12), P(-19.8, -1), P(-17.2, 8.6), P(-12.8, 12.5), P(-9, 9.5), P(-5.6, 6), P(-4.6, -3), P(-6.8, -12.5), P(-1, -18.5)]);
  face(g, G, pal, {
    ear: false, blush: 0.32, socket: 0.55,
    eyes: { iris: '#6a7c8c', lid: 0.44, h: 1.9, bag: 0.45, n: {}, f: {} },
    nose: { s: 1.22, red: 0.28 },
    mouth: false,
    under: (c, G) => {
      // forehead creases, crow's feet, brow furrow
      for (const [y, a, b] of [[-12.4, -7, 9], [-15.4, -5, 7.5], [-18.2, -2, 5]]) ink(c, [P(a, y + 0.6), P((a + b) / 2, y - 0.6), P(b, y + 0.3)], 0.75, alpha(pal.sh2, 0.8));
      for (const a of [-0.45, 0, 0.42]) ink(c, [P(-3 - C(a) * 0.5, 0.5 + S(a) * 1.4), P(-3 - C(a) * 3.2, 0.5 + S(a) * 3.2)], 0.65, alpha(pal.sh2, 0.85));
      ink(c, [P(7.8, -6), P(8.2, -3.4)], 0.8, alpha(pal.sh2, 0.8));
      ink(c, [P(9.6, 10.6), P(7.2, 13.4), P(5.6, 16)], 0.9, alpha(pal.sh2, 0.7));
    },
    over: (c, G) => {
      // scar through the near brow and cheek
      for (const seg of [[P(-4.4, -15.4), P(-2.6, -10), P(-1, -6.2)], [P(1.4, 3.4), P(2.6, 6.4), P(3.8, 9.6)]]) { ink(c, seg, 2.1, mix(pal.sh2, '#7a3028', 0.4), [0.3, 1, 0.3]); ink(c, seg, 1, '#f0c8b0', [0.2, 1, 0.2]); }
    },
  });
  // brows: bushy grey, inner ends lifted (kind, weary)
  const bc = '#9a948c';
  brows(g, G, [[4.6, -4.5], [0.4, -5.7], [-4.6, -4.2]], [[-2.2, -4.7], [0.8, -5.4], [3.4, -4.1]], 2.6, bc, { ol: OUT, olw: 0.6 });
  clipIn(g, ribbon([[G.eyeN[0] + 4.6 * G.k, G.eyeN[1] - 4.5 * G.k], [G.eyeN[0] + 0.4 * G.k, G.eyeN[1] - 5.7 * G.k], [G.eyeN[0] - 4.6 * G.k, G.eyeN[1] - 4.2 * G.k]], 2.8 * G.k), () => { for (let i = 0; i < 7; i++) ink(g, [P(4 - i * 1.3, -4 - (i % 2) * 0.6), P(2.8 - i * 1.3, -6)], 0.5, '#e0dcd4'); });
  flat(g, ellipse(P(-1.2, -5.4)[0], P(-1.2, -5.4)[1], 0.75, 1.7, 0.35), pal.base, 0); // scar notch in brow
  // grey crop
  hair(g, hairP, '#a8a29a', { sd: 2.4, dark: [[P(-17, -4), P(-15, 4), P(-13, 9)], [P(-12, -18), P(-15.5, -8)], [P(-4, -22), P(-9, -16)]], lite: [[P(-14, -16), P(-8, -22.6), P(0, -24.4)], [P(-17.4, -8), P(-16.2, 0)]], lcol: '#d8d4cc' });
  clipIn(g, hairP, () => { const R = rng(7); for (let i = 0; i < 60; i++) { const [hx, hy] = P(R.range(-19, 6), R.range(-25, 10)); ink(g, [[hx, hy], [hx - 0.8, hy + 1.6]], 0.55, R() < 0.5 ? alpha('#5a5650', 0.5) : alpha('#f2eee8', 0.55)); } });
  ear(g, G, pal);
  // beard
  const bd = sp([P(-4.6, 1), P(-2.2, 8.4), P(2.6, 12.2), P(6.6, 13.6), P(13, 13.2), P(17.4, 9.4), P(20.2, 12), P(20.8, 20), P(18.6, 28), P(14, 34), P(9.6, 37.5, 1), P(6.6, 33.5), P(2, 36, 1), P(-2.6, 30), P(-7.4, 27, 1), P(-8.6, 20), P(-10.6, 13.4), P(-9.4, 7.4), P(-6.4, 3)]);
  hair(g, bd, grey, { sd: 3.2, dark: [[P(-6, 10), P(-5, 20), P(-3, 27)], [P(0, 16), P(1.5, 26), P(3, 32)], [P(8, 22), P(9, 30), P(9.6, 35)], [P(14, 18), P(14.6, 26), P(13, 31)], [P(18, 14), P(18.6, 22)]], dcol: '#8a847c', lite: [[P(-4, 4), P(-3.4, 12), P(-1.4, 20)], [P(4, 20), P(5, 27)], [P(11, 21), P(11.6, 28)]], lcol: '#e2ded6' });
  // lower lip peeking out, then the moustache
  const [mx, my] = G.mouth;
  flat(g, sp([[mx - 4.4, my + 1.6], [mx + 2, my + 1.3], [mx + 4.4, my + 2.4], [mx + 1, my + 4.4], [mx - 3.4, my + 3.8]]), '#c88070', LI * 0.9, OUT);
  flat(g, ellipse(mx - 0.6, my + 2.4, 2, 0.6), alpha('#ffffff', 0.3), 0);
  const mu = sp([P(8.4, 11.4), P(12.6, 11.1), P(16.4, 12.6), P(18.4, 16.2), P(17.6, 19.2, 1), P(15.2, 15.6), P(11, 15.2), P(6.4, 16.6), P(2.6, 20.4, 1), P(3.4, 15.4), P(6, 12.4)]);
  hair(g, mu, '#c8c2b8', { sd: 1.8, dark: [[P(10, 12.6), P(7, 15.6), P(4, 18.6)], [P(13.6, 12.6), P(16, 15.6)]], dcol: '#9a948c', lite: [[P(11.4, 12), P(7.6, 13.6)]], lcol: '#f0ece6' });
}

// Seren — young mage (~19) secretly of Maelis's blood: dark hair, silver circlet, violet robes, star brooch.
// Determined but haunted.
function seren(g) {
  const G = geo({ x: 61, y: 46, k: 0.99, jaw: 0.76, chin: 0.85, width: 0.95, cheek: -0.3 });
  const { P } = G;
  const pal = skinPal('#f2cca6', { blush: '#ec8478' });
  const hc = '#2a2236', hd = '#17121f', hl = '#5c5080', robe = '#4a3a8a', robeD = '#3a2e70', mant = '#2e2460', trim = '#b8a0e0', silver = '#dcd6e6';
  // long hair behind the head and shoulders
  const back = sp([P(-3, -27.5), P(-16, -22.4), P(-23.6, -9), P(-25.6, 8), P(-27.4, 26), P(-30.4, 44), P(-33, 58, 1), P(-22, 53), P(-12, 44), P(4, 34), P(18, 32), P(25, 44), P(29, 56, 1), P(28.4, 34), P(25.6, 12), P(23.4, -6), P(16, -22)]);
  hair(g, back, hc, { sd: 3, dark: [[P(-20, -4), P(-23, 18), P(-27, 42)], [P(-14, 6), P(-17, 26), P(-20, 46)], [P(24, 10), P(25, 30)]], dcol: hd, lite: [[P(-21, -12), P(-24, 8), P(-27, 30)]], lcol: hl });
  // robe
  T(g, sp([[8, 130], [10, 108], [20, 96], [36, 88], [50, 84], [74, 85], [92, 89], [106, 97], [114, 110], [118, 130]]), robe, { sd: 4, light: '#5c4ca4', detail: c => folds(c, [[[60, 128], [62, 108]], [[76, 128], [75, 108]]], alpha('#160c40', 0.45), 1.3) });
  // standing collar (back half), neck, collar front with silver edge
  T(g, sp([[43, 92], [42, 76], [47, 68], [58, 72], [72, 74], [82, 69], [87, 75], [88, 92], [66, 96]]), robeD, { sd: 2.2, light: '#4c3e8c' });
  neck(g, G, pal, { w: 0.74, len: 38 });
  for (const sp0 of [[[44, 77], [51, 85], [61.6, 92]], [[86, 75], [79, 85], [69.4, 92]]]) {
    const band = ribbon(sp0, 7.4, [1, 1, 0.75]);
    T(g, band, robeD, { sd: 1.6, hd: 0.8, lw: 1.3, light: '#5a4c9c' });
    ink(g, mv(sp0, 0, -3), 1.2, silver, [0.8, 1, 0.6]);
  }
  // dark violet mantle on the shoulders, clasped by the star brooch
  const mN = sp([[-2, 130], [0, 106], [10, 94], [26, 88], [40, 88], [47, 100], [46, 130]]);
  const mF = sp([[87, 130], [86, 102], [92, 92], [104, 93], [116, 103], [124, 130]]);
  for (const m of [mN, mF]) T(g, m, mant, { sd: 4, hd: 1.4, light: '#433890', detail: c => folds(c, [[[14, 128], [16, 108], [24, 98]], [[32, 128], [34, 104]], [[104, 128], [102, 108]], [[116, 128], [112, 110]]], alpha('#0c0820', 0.5), 1.3) });
  stroke(g, sp([[45.4, 130], [46.6, 101], [39.6, 90]], 0.5), trim, 1.4);
  stroke(g, sp([[87.6, 130], [86.6, 102.6], [91.6, 93.6]], 0.5), trim, 1.4);
  for (let i = 0; i <= 12; i++) { const t = i / 12; if (Math.abs(t - 0.45) < 0.12) continue; flat(g, circle(lerp(47, 87, t), 101 + S(t * PI) * 4, 0.75), silver, 0.4); }
  starCrest(g, 65, 104, 6.4, '#e8eef8', { glow: '#7ad0ff', ga: 0.5, lw: 1.1 });
  // face
  face(g, G, pal, { ear: false, blush: 0.24,
    eyes: { iris: '#5a6ec0', w: 4.7, h: 2.45, ir: 2.15, lid: 0.16, low: 0.16, flick: true, lw: 1.35, bag: 0.34, bagH: 2.2, look: [1.05, 0] },
    brows: (g, G) => { brows(g, G, [[4.6, -4.3], [1.4, -5.3], [-1.6, -5.4], [-4.6, -4.5]], [[-2.4, -4.4], [0, -5.2], [3.4, -4.6]], 1.7, hc); ink(g, [P(8.4, -5.6), P(8.2, -3.8)], 0.6, alpha(pal.sh2, 0.6)); },
    nose: { s: 0.8 }, mouth: { curve: -0.14, w: 4.3, lips: '#d8706e' }, jawLine: 0.45,
    under: (c, G) => { c.fillStyle = 'rgba(110,80,170,0.16)'; c.fill(ellipse(G.eyeN[0], G.eyeN[1] - 2.4, 5.6, 2)); c.fill(ellipse(G.eyeF[0] + 0.4, G.eyeF[1] - 2.3, 3.2, 1.8)); } });
  // front hair: base mass, side lock over the ear, long lock framing the far cheek, side-swept fringe locks
  hair(g, sp([P(-14.6, -12), P(-14.6, -22.4), P(-5, -28.8), P(6, -29.2), P(15, -25.2), P(20.6, -16), P(21.8, -6), P(18, -10), P(8, -16), P(-4, -16), P(-10, -12)]), hc, { sd: 2 });
  locks(g, [
    { p: [P(-11, -18), P(-14.4, -4), P(-13.6, 10), P(-15, 24), P(-18.4, 36)], w: 8.6, prof: [0.7, 1, 0.05] },
    { p: [P(12, -24), P(19.6, -12), P(21.6, 4), P(21, 22), P(24.4, 42)], w: 8, prof: [0.7, 1, 0.05] },
    { p: [P(-4, -28), P(7, -26), P(15, -19), P(18.6, -9), P(19.4, -2.6)], w: 8.6, prof: [0.8, 1, 0.04] },
    { p: [P(-6, -27), P(2.6, -24.6), P(9, -18), P(12, -9.6)], w: 8.6, prof: [0.8, 1, 0.04] },
    { p: [P(-8, -25.6), P(-2, -22), P(3, -15), P(4.6, -9.4)], w: 7.6, prof: [0.8, 1, 0.04] },
    { p: [P(-10, -23), P(-7.2, -18), P(-5.6, -11)], w: 6.4, prof: [0.8, 1, 0.04] },
  ], hc, { hcol: hl, sd: 2 });
  for (let i = 0; i < 6; i++) { const t = i / 5; ink(g, [P(-11 + t * 25, -25.4 - S(t * PI) * 2.6), P(-9 + t * 25, -23.6 - S(t * PI) * 2.2)], 1.5, '#7a6ca8', [0.2, 1, 0.2]); }
  // silver circlet with a blue gem
  const cb = [P(-15, -14.2), P(-4, -17.2), P(8, -17), P(19.4, -13.4)];
  flat(g, ribbon(cb, 1.9, [1, 1, 0.8]), silver, 0); stroke(g, ribbon(cb, 1.9, [1, 1, 0.8]), OUT, 0.8);
  const gm = P(8.4, -17.4);
  glow(g, gm[0], gm[1], 7, '#7ad0ff', 0.55);
  T(g, sp([[gm[0], gm[1] - 2.8, 1], [gm[0] + 1.9, gm[1] - 0.2], [gm[0], gm[1] + 2.6, 1], [gm[0] - 1.9, gm[1] - 0.2]]), '#7ad0ff', { sd: 0.8, hd: 0.8, lw: 0.9, light: '#ffffff' });
}

// Kaela — Greenmarch ranger: green hood, auburn braid, freckles, sharp watchful eyes, quiver strap.
function kaela(g) {
  const G = geo({ x: 61, y: 47, k: 1.02, jaw: 0.9, chin: 0.94, width: 0.96 });
  const { P } = G;
  const pal = skinPal('#f0c49a', { blush: '#e88070' });
  const hood = '#3f6a2a', hoodL = '#58883c', lining = '#22401a', hc = '#9a4a24', hhi = '#cc7440', hdk = '#6a2a10', leather = '#4a2e18', jer = '#6a4a2a';
  // quiver behind the near shoulder: arrow shafts with clear fletching
  for (const [x, y, a, f] of [[10, 62, -0.42, '#ece4d4'], [16.5, 58, -0.28, '#b8442a'], [23, 59, -0.14, '#ece4d4'], [29, 62, 0, '#7a8a5a']]) {
    g.save(); g.translate(x, y); g.rotate(a);
    flat(g, rrect(-0.8, 2, 1.6, 26, 0.6), '#9a6a3a', 0.9);
    T(g, sp([[0, -1, 1], [2.8, 1.6], [3.2, 9], [0.6, 11.4, 1], [0, 3]]), f, { sd: 0.8, hd: 0, lw: 0.9 });
    T(g, sp([[0, -1, 1], [-2.8, 1.6], [-3.2, 9], [-0.6, 11.4, 1], [0, 3]]), dark(f, 0.08), { sd: 0.8, hd: 0, lw: 0.9 });
    ink(g, [[0, 0], [0, 11]], 0.7, alpha(OUT, 0.6), [1, 1, 1]);
    g.restore();
  }
  T(g, sp([[8, 92], [7, 78], [12, 76], [30, 78], [33, 82], [30, 92]]), leather, { sd: 2.2 });
  T(g, ellipse(20, 77, 12.4, 4.2, 0.12), '#5a3a20', { sd: 1.2, hd: 0.6, lw: 1.3, detail: c => flat(c, ellipse(20.4, 77.6, 10, 2.6, 0.12), '#24160a', 0) });
  // hood + cloak (outer, behind the head) with the dark lining
  const hoodO = sp([[-6, 130], [-2, 104], [8, 90], P(-25, 32), P(-26.5, 8), P(-23, -14), P(-12, -29), P(4, -32.5), P(17, -26), P(23.4, -13), P(24.4, 4), P(23.6, 20), P(30, 32), [104, 86], [120, 96], [128, 110], [132, 130]]);
  T(g, hoodO, hood, { sd: 4.5, hd: 1.4, light: hoodL });
  flat(g, sp([P(-9, -14), P(-6, -23), P(6, -27.6), P(16.6, -22), P(21.2, -10), P(21.8, 6), P(21, 20), P(15, 31), P(4, 33), P(-8, 27), P(-11, 8)]), lining, 0);
  // jerkin with laces
  T(g, sp([[44, 130], [46, 102], [54, 90], [84, 90], [94, 102], [96, 130]]), jer, { sd: 3.6, detail: c => { ink(c, [[70, 92], [70, 130]], 1.2, alpha('#2a1a0c', 0.6), [1, 1, 1]); for (let i = 0; i < 4; i++) { ink(c, [[66, 96 + i * 6.4], [74, 99 + i * 6.4]], 1, '#2a1a0c', [1, 1, 1]); ink(c, [[74, 96 + i * 6.4], [66, 99 + i * 6.4]], 1, '#3a2614', [1, 1, 1]); } } });
  // cloak front panels over the shoulders
  T(g, sp([[-6, 130], [-4, 104], [8, 90], [26, 84], [40, 84], [48, 96], [50, 130]]), hood, { sd: 4, hd: 1.3, light: hoodL, detail: c => folds(c, [[[16, 128], [20, 104]], [[34, 128], [36, 100]]], alpha('#14280c', 0.5), 1.3) });
  T(g, sp([[92, 130], [90, 100], [96, 88], [108, 88], [122, 98], [132, 130]]), hood, { sd: 4, hd: 1.3, light: hoodL, detail: c => folds(c, [[[112, 128], [110, 104]]], alpha('#14280c', 0.5), 1.3) });
  neck(g, G, pal, { w: 0.82, len: 36 });
  // face
  face(g, G, pal, { ear: false, blush: 0.2,
    eyes: { iris: '#6a8a3a', w: 4.3, h: 2.05, lid: 0.26, low: 0.24, flick: true, look: [1.15, 0] },
    brows: (g, G) => brows(g, G, [[4.4, -3.9], [0.2, -4.9], [-4.4, -4.6]], [[-2.2, -4.0], [0.8, -4.8], [3.4, -4.4]], 1.6, '#7a3a18'),
    nose: { s: 0.9 }, mouth: { curve: 0.05, smirk: 0.45, w: 4.8, lips: '#d47c6c' },
    over: (c, G) => { const R = rng(4); for (let i = 0; i < 30; i++) { const a = R() * PI * 2, d = Math.sqrt(R()); const [fx, fy] = P(8 + C(a) * 9.5 * d * (C(a) < 0 ? 1.4 : 0.8), 6.4 + S(a) * 3.2 * d); flat(c, circle(fx, fy, 0.32 + R() * 0.3), alpha('#a8582a', 0.5 + R() * 0.35), 0); } } });
  // auburn fringe escaping the hood: base + side-swept locks
  hair(g, sp([P(-9.4, -12), P(-6, -23), P(6, -27.4), P(16.4, -21.6), P(20.4, -11), P(16, -12), P(6, -15), P(-4, -14)]), hc, { sd: 2 });
  locks(g, [
    { p: [P(-1, -26), P(9, -24), P(15.6, -17), P(18.4, -7.6)], w: 7.6, prof: [0.8, 1, 0.04] },
    { p: [P(-4.4, -24), P(3.4, -21), P(9, -14), P(10.6, -7)], w: 7.6, prof: [0.8, 1, 0.04] },
    { p: [P(-7, -21.6), P(-2, -18), P(2.2, -12), P(3.2, -6.6)], w: 6.8, prof: [0.8, 1, 0.04] },
    { p: [P(-8.6, -18), P(-7.6, -13), P(-6.8, -7.6)], w: 5, prof: [0.8, 1, 0.04] },
  ], hc, { hcol: hhi, sd: 2 });
  // near side of the hood, in front of the ear, wrapping to the cloak
  const flap = sp([P(6, -28.6), P(-3.4, -21), P(-7.6, -8), P(-8.4, 6), P(-6.6, 18), P(-3, 27), P(4, 34.5), P(12, 38), [52, 96], [36, 86], [12, 92], P(-25, 32), P(-26.5, 8), P(-23, -14), P(-12, -29)]);
  T(g, flap, hood, { sd: 3.8, hd: 1.6, light: hoodL, detail: c => folds(c, [[P(-14, -20), P(-18, 0), P(-17, 22)], [P(-6, -24), P(-12, -6)], [P(-20, 10), P(-21, 26)]], alpha('#14280c', 0.45), 1.4) });
  ink(g, [P(6, -28), P(-3, -20.4), P(-7, -8), P(-7.8, 6), P(-6, 18), P(-2.4, 26.4)], 1.4, light(hood, 0.16), [0.2, 1, 0.4]);
  // braid over the near shoulder
  braid(g, [P(-4, 24), P(-6, 34), [45, 96], [44, 108], [45, 118]], 7.4, hc, { light: hhi });
  T(g, rrect(41, 117.6, 7.6, 3.4, 1.2), leather, { sd: 0.6, hd: 0.3, lw: 1 });
  locks(g, [{ p: [[44.6, 120], [44, 125], [45.4, 129]], w: 5, prof: [1, 1, 0.1] }], hc, { hcol: hhi });
  // quiver strap with buckle
  const strap = [[30, 84], [56, 100], [84, 116], [104, 130]];
  flat(g, ribbon(strap, 4.6, [1, 1, 1]), leather, 0); stroke(g, ribbon(strap, 4.6, [1, 1, 1]), OUT, 1.1);
  ink(g, mv(strap, 0, -1.2), 0.7, '#7a5030', [1, 1, 1]);
  T(g, rrect(63, 100.6, 6.4, 6.4, 1.2), '#c8a050', { sd: 0.8, hd: 0.5, lw: 1, light: '#f0d890' });
  flat(g, rrect(65, 102.6, 2.4, 2.4, 0.4), leather, 0);
}

// Torvald Emberforge — dwarf engineer: bronze helm with goggles, braided copper beard, apron, soot, grin.
function torvald(g) {
  const G = geo({ x: 59, y: 48, k: 1.16, width: 1.1, jaw: 1.3, cheek: 0.9, chin: 0.92 });
  const { P } = G;
  const pal = skinPal('#e0a07a', { blush: '#d8604a' });
  const cu = '#c0582a', cuL = '#e08048', cuD = '#8a3a18', bronze = '#9a7a4a', brass = '#c8963a';
  // body: mail, leather apron and straps
  T(g, sp([[-8, 130], [-6, 100], [6, 86], [26, 78], [48, 74], [80, 76], [104, 82], [122, 94], [134, 130]]), '#8a929a', { sd: 4, detail: c => mail(c, -8, 70, 134, 130) });
  T(g, sp([[30, 130], [32, 98], [40, 88], [96, 88], [104, 98], [106, 130]]), '#6b4423', { sd: 3.6, detail: c => { scratches(c, 2, 34, 92, 104, 128, 8, 'rgba(255,220,180,0.25)'); c.fillStyle = 'rgba(30,20,20,0.3)'; c.fill(ellipse(46, 112, 6, 3)); } });
  for (const [x0, y0, x1, y1] of [[36, 92, 22, 78], [98, 92, 108, 80]]) { flat(g, ribbon([[x0, y0], [x1, y1]], 5, [1, 1, 1]), '#3a2010', 0); stroke(g, ribbon([[x0, y0], [x1, y1]], 5, [1, 1, 1]), OUT, 1); T(g, rrect(x0 - 3, y0 - 3.5, 6, 6, 1), brass, { sd: 0.8, hd: 0.5, lw: 1 }); }
  neck(g, G, pal, { w: 1.4, len: 30 });
  // bushy hair under the helm at the back
  hair(g, sp([P(-20, -9), P(-23.6, -2), P(-23, 8), P(-19, 16), P(-13, 18), P(-8, 12), P(-6, 2), P(-10, -6)]), cu, { sd: 2.4, dark: [[P(-20, -4), P(-19, 8)], [P(-15, -2), P(-14, 12)]], dcol: cuD, lite: [[P(-21, -6), P(-21.6, 4)]], lcol: cuL });
  face(g, G, pal, { ear: false, blush: 0.4, socket: 0.4,
    eyes: { iris: '#5a3a1e', w: 4, h: 2.1, lid: 0.25, happy: 0.55, low: 0.1, look: [0.9, 0] },
    nose: { s: 1.6, red: 0.45, tipX: 0.6, tipY: 0.4 }, mouth: false,
    under: (c, G) => {
      for (const a of [-0.4, 0, 0.4]) ink(c, [P(-3 - C(a) * 0.5, 0.6 + S(a) * 1.4), P(-3 - C(a) * 3.4, 0.6 + S(a) * 3.4)], 0.7, alpha(pal.sh2, 0.85));
      c.fillStyle = 'rgba(40,28,28,0.32)'; c.fill(ellipse(P(16, 5)[0], P(16, 5)[1], 3, 2.2, 0.3)); c.fill(ellipse(P(-3, -9)[0], P(-3, -9)[1], 4, 1.6, -0.2)); c.fill(ellipse(P(4, 8)[0], P(4, 8)[1], 2.2, 1.2));
    } });
  ear(g, G, pal, { s: 1.05 });
  // pencil tucked behind the ear
  g.save(); g.translate(...P(-8.6, -2)); g.rotate(-0.75); T(g, rrect(-1, -9, 2.2, 13, 0.6), '#e8b030', { sd: 0.6, hd: 0.4, lw: 0.9 }); flat(g, poly([[-1, 4], [1.2, 4], [0.1, 6.6]]), '#e8c8a0', 0.8); g.restore();
  // beard with two braids
  for (const [bx, len] of [[2.4, 30], [13.2, 26]]) {
    for (let i = 0; i < 5; i++) { const cx = P(bx + S(i * 1.7) * 0.5, 0)[0]; T(g, ellipse(cx, P(0, 44)[1] + i * 5.2, 3.6 - i * 0.25, 3.4, i % 2 ? 0.5 : -0.5), cu, { sd: 1.4, hd: 0.8, lw: 1.2, light: cuL }); }
    const [rx] = P(bx, 0); T(g, rrect(rx - 3.6, P(0, 44)[1] + 7, 7.2, 3, 1), brass, { sd: 0.6, hd: 0.5, lw: 1 });
    T(g, rrect(rx - 3.2, P(0, 44)[1] + 17.4, 6.4, 2.8, 1), brass, { sd: 0.6, hd: 0.5, lw: 1 });
  }
  const bd = sp([P(-6.6, 1), P(-10.4, 12), P(-10.6, 22), P(-7, 33), P(-1, 41), P(4, 46, 1), P(8, 43), P(12, 47, 1), P(17, 42), P(22, 34), P(24.4, 22), P(23.6, 10), P(20.4, 8.4), P(15, 13.6), P(10, 14.4), P(4, 13.8), P(-0.4, 9), P(-3.4, 3)]);
  hair(g, bd, cu, { sd: 3.6, dark: [[P(-7, 10), P(-6, 22), P(-2, 34)], [P(1, 18), P(3, 30), P(5, 40)], [P(10, 22), P(11, 34), P(12, 42)], [P(17, 18), P(18, 28), P(17, 36)]], dcol: cuD, lite: [[P(-5, 6), P(-4, 16), P(-2, 26)], [P(6, 22), P(7, 32)], [P(15, 20), P(16, 30)]], lcol: cuL });
  // grin under the moustache
  const [mx, my] = G.mouth;
  const grin = sp([[mx - 7.2, my + 0.6], [mx + 6.4, my + 0.4], [mx + 4.6, my + 5.2], [mx - 0.6, my + 6.6], [mx - 5.4, my + 4.6]]);
  flat(g, grin, '#4a1612', LI * 1.1, OUT);
  clipIn(g, grin, () => { flat(g, rrect(mx - 8, my - 1, 15, 3.4, 1), '#f6efe0', 0); for (let i = 1; i < 5; i++) ink(g, [[mx - 7 + i * 2.8, my - 1], [mx - 7 + i * 2.8, my + 2.4]], 0.5, alpha(OUT, 0.5), [1, 1, 1]); flat(g, ellipse(mx - 0.4, my + 6, 4, 2), '#b0443a', 0); });
  // moustache with upturned ends
  const mu = sp([P(7, 10.6), P(13.6, 10.2), P(18, 11.6), P(22.6, 10.4), P(25.6, 6.6, 1), P(24.6, 12.6), P(19, 16), P(12.6, 15.4), P(6, 16.4), P(-0.6, 14.6), P(-5.2, 10.4, 1), P(-0.6, 11.4), P(3.6, 11)]);
  hair(g, mu, '#d06a32', { sd: 2, dark: [[P(10, 12), P(4, 14), P(-1, 13)], [P(14, 12), P(20, 13.4)]], dcol: cuD, lite: [[P(11, 11.6), P(5, 12.4)], [P(15, 11.6), P(21, 11.6)]], lcol: '#f0a060' });
  // bronze helm: back brim, dome, goggles, front brim
  const bc = P(0.6, -8.6);
  T(g, ellipse(bc[0], bc[1], 28.4, 4.6, -0.03), dark(bronze, 0.06), { sd: 1.4, hd: 0.8 });
  const dome = sp([P(-20.4, -7.8), P(-19.6, -19.4), P(-10.6, -28.8), P(3, -31.6), P(14.6, -27.8), P(20.4, -18), P(21.4, -8.2)]);
  metal(g, dome, bronze, { sd: 4, hd: 2, light: '#d8b880', detail: c => { scratches(c, 11, 44, 12, 80, 34, 6, 'rgba(255,240,200,0.4)'); } });
  rivets(g, [P(-14, -16), P(-6, -23.4), P(4, -26.4), P(14, -22.4)], '#7a5a30', 1);
  // goggles strapped on the brow of the helm
  flat(g, ribbon([P(-19.6, -14), P(-10, -15), P(-2, -15)], 3.2, [1, 1, 1]), '#3a2a1a', 0.8);
  for (const [c0, rx, ry] of [[P(1.6, -14.2), 4.6, 4.4], [P(13.8, -13.8), 3.2, 4.1]]) {
    T(g, ellipse(c0[0], c0[1], rx + 1.4, ry + 1.4), brass, { sd: 1.2, hd: 0.8, lw: 1.2, light: '#f0d080' });
    T(g, ellipse(c0[0], c0[1], rx, ry), '#4aa8e0', { sd: 1.6, hd: 0, lw: 1, shade: '#2a6aa0' });
    flat(g, ellipse(c0[0] - rx * 0.3, c0[1] - ry * 0.35, rx * 0.35, ry * 0.22, -0.5), 'rgba(255,255,255,0.85)', 0);
  }
  flat(g, ribbon([P(6.2, -14.4), P(8, -15.4), P(9.8, -14.4)], 2, [1, 1, 1]), brass, 0.8);
  clipIn(g, poly([[0, bc[1]], [128, bc[1]], [128, 128], [0, 128]]), () => T(g, ellipse(bc[0], bc[1], 28.4, 4.6, -0.03), bronze, { sd: 1.4, hd: 0.8, light: '#d8b880' }));
  // bushy brows bristling out under the brim, raised in good cheer
  const bn = [[4.8, -5.2], [0.4, -6.8], [-5.4, -5.6]];
  brows(g, G, bn, [[-2.4, -5.3], [1, -6.6], [3.9, -5.2]], 4.4, cu, { ol: OUT, olw: 0.8, prof: [1.1, 1, 0.5] });
  clipIn(g, ribbon(bn.map(([dx, dy]) => [G.eyeN[0] + dx * G.k, G.eyeN[1] + dy * G.k]), 4.6 * G.k, [1.1, 1, 0.5]), () => { for (let i = 0; i < 7; i++) ink(g, [P(4.2 - i * 1.5, -4.8 - (i % 2) * 0.6), P(3 - i * 1.5, -7.8)], 0.7, i % 2 ? cuL : cuD); });
}

// Aerin — griffin rider from the capital: gold winged helm, golden-brown hair, gold & white armour, blue cape.
function aerin(g) {
  const G = geo({ x: 61, y: 47, k: 1.04, jaw: 1.0, chin: 1.06, width: 0.97 });
  const { P } = G;
  const pal = skinPal('#f0c49a');
  const hc = '#b5803a', hd = '#7a5020', hl = '#e2b464', gold = '#d8b84a', goldL = '#fff2b0', white = '#f4efe2', whiteS = '#c4bcb0', blue = '#2f5fa8';
  // far wing, rising behind the helm
  wingF(g, ...P(12, -22), -2.3, -1.4, 6, 30, '#e8e2d6', { taper: 0.55, fw: 0.22 });
  // golden-brown hair flowing from under the helm
  locks(g, [{ p: [P(-12, -8), P(-20, 4), P(-22, 16), P(-19, 28)], w: 10 }, { p: [P(-8, -6), P(-14, 8), P(-14, 22)], w: 8 }, { p: [P(-16, -10), P(-23, 0), P(-26, 12)], w: 7 }], hc, { hcol: hl, sd: 2 });
  // blue cape behind
  T(g, sp([[-6, 130], [-2, 100], [10, 88], [30, 80], [50, 77], [80, 79], [104, 85], [122, 97], [132, 130]]), blue, { sd: 4, light: '#4a7ac8' });
  // padded white collar (back half)
  T(g, sp([[44, 92], [44, 77], [52, 71], [68, 72], [80, 70], [86, 76], [86, 92]]), white, { sd: 2, shade: whiteS });
  // gold breastplate with a central ridge
  metal(g, sp([[22, 130], [24, 104], [34, 92], [52, 88], [82, 88], [98, 94], [108, 106], [110, 130]]), gold, { light: goldL, sd: 4, detail: c => { c.fillStyle = alpha('#fff6c8', 0.5); c.fill(sp([[54, 128], [58, 100], [66, 92], [62, 110]])); ink(c, [[67, 92], [68, 112], [70, 130]], 1.2, alpha('#8a6a1a', 0.8), [1, 1, 1]); for (let i = 0; i < 9; i++) { const a = -PI * 0.92 + i * PI * 0.105; ink(c, [[78 + C(a) * 9, 112 + S(a) * 9], [78 + C(a) * 15, 112 + S(a) * 15]], 0.9, alpha('#8a6a1a', 0.75), [0.3, 1, 0.3]); } stroke(c, circle(78, 112, 6.6), alpha('#8a6a1a', 0.75), 1); ink(c, [[86, 96], [96, 100], [102, 110]], 0.9, alpha('#8a6a1a', 0.6), [0.2, 1, 0.2]); } });
  // blue sash with a griffin badge
  const sash = [[24, 92], [50, 104], [78, 120], [94, 130]];
  flat(g, ribbon(sash, 8.4, [1, 1, 1]), blue, 0); clipIn(g, ribbon(sash, 8.4, [1, 1, 1]), () => { g.fillStyle = alpha('#16306a', 0.5); g.fill(ribbon(mv(sash, 0.8, 2.6), 3.4, [1, 1, 1])); }); stroke(g, ribbon(sash, 8.4, [1, 1, 1]), OUT, 1.2);
  ink(g, mv(sash, 0.6, -3), 0.9, gold, [1, 1, 1]); ink(g, mv(sash, -0.6, 3), 0.9, gold, [1, 1, 1]);
  T(g, circle(54, 106.4, 5.6), gold, { sd: 1.2, hd: 0.9, lw: 1.2, light: goldL });
  flat(g, sp([[50.4, 109.6], [51, 104], [54.6, 101.8], [58.4, 103.4], [55.6, 104.6], [57.4, 108.6, 1], [54, 106.6]]), white, 0.7);
  neck(g, G, pal, { w: 0.95, len: 32, adam: true });
  // gold gorget, collar front
  for (const [y, w] of [[93, 5.4], [88.6, 5]]) { const lame = ribbon([[44, y - 3], [56, y + 1.4], [70, y + 2], [86, y - 2]], w, [0.8, 1, 0.8]); metal(g, lame, gold, { light: goldL, sd: 1.4, hd: 1, lw: 1.3 }); }
  // white enamel pauldrons with gold edges
  const pN = sp([[0, 108], [2, 95], [13, 87], [29, 84], [40, 88.6], [40, 97], [27, 102], [11, 106.6]]);
  metal(g, sp([[-1, 122], [0, 106], [14, 103.6], [31, 99], [40, 102], [36, 113], [18, 119]]), white, { shade: whiteS, light: '#ffffff' });
  stroke(g, sp([[1.4, 119], [2.4, 108], [14.6, 106], [30.6, 101.6], [37.6, 104]]), gold, 1.3);
  metal(g, pN, white, { shade: whiteS, light: '#ffffff', detail: c => { c.fillStyle = alpha('#ffffff', 0.7); c.fill(sp([[6, 96], [16, 89], [28, 86.4], [16, 92]])); } });
  stroke(g, sp([[3, 105.6], [4.6, 96.2], [14.2, 89.6], [28.8, 86.8], [37.6, 90.4], [37.6, 95.6], [26.4, 99.8], [11.4, 103.8]]), gold, 1.5);
  rivets(g, [[10, 97], [21, 91], [33, 90]], gold, 0.9);
  metal(g, sp([[94, 90], [108, 86], [122, 92], [128, 108], [116, 104], [100, 98]]), white, { shade: whiteS, light: '#ffffff' });
  stroke(g, sp([[97, 91], [108, 88.6], [119.6, 93.6], [124.6, 104]]), gold, 1.4);
  face(g, G, pal, { ear: false, blush: 0.2,
    eyes: { iris: '#3a6ab0', lid: 0.08, h: 2.1, look: [1.05, -0.05] },
    brows: (g, G) => brows(g, G, [[4.3, -5.0], [0.2, -5.7], [-4.6, -4.8]], [[-2.1, -5.1], [0.9, -5.6], [3.4, -4.6]], 1.8, '#6a4418'),
    nose: { s: 1.0 }, mouth: { open: 0.24, w: 5.0, curve: -0.05 } });
  // locks escaping at the brow
  locks(g, [{ p: [P(14, -12), P(17.4, -6), P(18.6, 0)], w: 4.6 }, { p: [P(-4, -11), P(-6.6, -4), P(-6.2, 3)], w: 5 }], hc, { hcol: hl });
  // gold helm: dome, brow guard with a centre point, cheek piece in front of the ear
  const helm = sp([P(-21.4, 6), P(-22.4, -10), P(-13, -26), P(2, -30.4), P(14.6, -26), P(20.6, -16.4), P(21.6, -8.4), P(16, -9.6), P(10.4, -9.8), P(9.2, -7.2, 1), P(8, -10), P(0, -9.8), P(-4.8, -8.4), P(-6.2, -1), P(-5.6, 6.4), P(-8, 11, 1), P(-13, 9), P(-17.6, 7.6)]);
  metal(g, helm, gold, { light: goldL, sd: 4, detail: c => { c.fillStyle = alpha('#fff6c8', 0.55); c.fill(sp([P(-17, -14), P(-9, -25), P(2, -28.4), P(-6, -21.6), P(-13, -10)])); c.fillStyle = alpha('#7a5a10', 0.35); c.fill(sp([P(-21, 4), P(-16, 0), P(-9, 2), P(-8, 10), P(-17, 7)])); } });
  flat(g, ribbon([P(-5.4, -4), P(-4.6, -9.4), P(2, -11.6), P(10, -11.6), P(20.6, -10.2)], 2.6, [1, 1, 1]), white, 0.8);
  ink(g, [P(-19, -6), P(-12, -21), P(0, -29), P(12, -27)], 2, light(gold, 0.18), [0.3, 1, 0.4]);
  rivets(g, [P(-9, 0), P(-14, -4)], goldL, 0.9);
  // near wing
  const [wx, wy] = P(-11, -13);
  wingF(g, wx, wy, -2.15, -3.35, 7, 38, white, { taper: 0.5, fw: 0.2 });
  T(g, sp([[wx + 4, wy + 4], [wx - 2, wy - 5], [wx - 10, wy - 9], [wx - 12, wy - 2], [wx - 5, wy + 5]]), white, { sd: 1.4, hd: 0.6, lw: 1.2, shade: whiteS });
  T(g, sp([[wx + 5, wy + 3], [wx + 1, wy - 3], [wx - 3, wy - 1], [wx - 1, wy + 5]]), gold, { sd: 1, hd: 0.8, lw: 1.2, light: goldL });
}

// Ysolde — fire-witch of the Ash lands: ash-grey skin, ember freckles, black hair with red streaks, wary.
function ysolde(g) {
  const G = geo({ x: 61, y: 46, k: 1.0, jaw: 0.9, chin: 0.96, width: 0.95, cheek: 0.7 });
  const { P } = G;
  const pal = skinPal('#a8a09c', { sh: '#857c7e', sh2: '#665c62', hi: '#c2bcb6', blush: '#c86a50', line: '#3a2a2c' });
  const hc = '#1e1618', hdk = '#0c0809', hl = '#4a3a40', red = '#b0301a', redL = '#e85a2c', char = '#2a1a1e', charL = '#4a3238', crim = '#7a1e14', crimL = '#a8341e', gold = '#c8902a';
  const ember = (c, x, y, r = 0.5) => { glow(c, x, y, r * 3.2, '#ff7a20', 0.45); flat(c, circle(x, y, r), '#ffc070', 0); };
  const crackG = (pts, w = 1) => { g.save(); g.globalCompositeOperation = 'lighter'; ink(g, pts, 2.6 * w, alpha('#ff6a20', 0.45)); ink(g, pts, 0.9 * w, '#ffc070'); g.restore(); };
  // wild mane behind
  const mane = sp([P(-4, -27), P(-17, -23), P(-25, -12), P(-28, 4), P(-30, 20), P(-33, 34, 1), P(-29, 36), P(-32, 50, 1), P(-24, 46), P(-22, 58, 1), P(-14, 48), P(-6, 40), P(8, 34), P(20, 36), P(26, 48, 1), P(27, 34), P(26, 14), P(24, -6), P(16, -22)]);
  hair(g, mane, hc, { sd: 3, dark: [[P(-22, -2), P(-25, 18), P(-29, 40)], [P(-15, 8), P(-18, 30), P(-20, 48)]], dcol: hdk, lite: [[P(-20, -14), P(-25, 4), P(-27, 22)]], lcol: hl });
  clipIn(g, mane, () => { ink(g, [P(-21, -8), P(-25.6, 14), P(-30, 38)], 2.4, red, [0.3, 1, 0.4]); ink(g, [P(-21.4, -6), P(-25.6, 14)], 0.9, redL); ink(g, [P(22, 6), P(24, 24), P(25, 40)], 2, red, [0.3, 1, 0.3]); });
  // crimson robe with a V-neck; charcoal mantle with the hood down as a cowl
  T(g, sp([[20, 130], [24, 104], [36, 92], [50, 86], [82, 86], [98, 92], [108, 104], [112, 130]]), crim, { sd: 3.6, light: crimL, detail: c => folds(c, [[[40, 128], [44, 108]], [[94, 128], [92, 108]]], alpha('#2a0604', 0.5), 1.3) });
  T(g, sp([[-2, 130], [0, 106], [8, 94], [22, 86], [40, 84], [80, 84], [98, 86], [112, 92], [124, 104], [130, 130], [104, 130], [100, 104], [92, 96], [78, 92], [56, 92], [44, 98], [38, 110], [36, 130]]), char, { sd: 4, hd: 1.4, light: charL, detail: c => { folds(c, [[[14, 128], [18, 104]], [[26, 128], [30, 104]], [[114, 128], [112, 106]]], alpha('#000', 0.45), 1.3); const R = rng(9); for (let i = 0; i < 46; i++) flat(c, circle(R.range(0, 128), R.range(84, 128), 0.35), alpha('#9a8a86', 0.45), 0); } });
  T(g, sp([[30, 94], [32, 82], [44, 74], [62, 76], [82, 74], [96, 80], [100, 92], [88, 92], [76, 86], [56, 87], [42, 92]]), dark(char, 0.03), { sd: 2.4, hd: 1.2, light: charL, detail: c => folds(c, [[[40, 80], [50, 86]], [[86, 80], [92, 88]]], alpha('#000', 0.5), 1.2) });
  neck(g, G, pal, { w: 0.8, len: 40 });
  // bare V of the chest with ember cracks
  const vee = sp([[51, 86], [81, 86], [74, 100], [66, 110, 1], [58, 100]]);
  flat(g, vee, pal.base, 0);
  clipIn(g, vee, () => { g.fillStyle = pal.sh; g.fill(sp([[40, 80], [92, 80], [92, 89], [66, 93], [40, 89]])); g.fillStyle = alpha(pal.sh, 0.6); g.fill(poly([[66, 86], [92, 86], [92, 120], [66, 120]])); });
  stroke(g, vee, OUT, 1.4);
  ink(g, [[52, 87], [59, 100], [66, 109.4]], 1.5, '#4a0e08', [1, 1, 0.4]); ink(g, [[80, 87], [73.4, 100], [66, 109.4]], 1.5, '#4a0e08', [1, 1, 0.4]);
  crackG([[60, 94], [63, 98], [61, 102]]); crackG([[71, 93], [74, 96.6], [72.6, 99.6]]); crackG([P(3, 23), P(5.6, 27), P(3, 31)], 0.9);
  // gold torc with an ember stone
  const torc = [[49, 84.6], [58, 89.4], [68, 90], [78, 87.4], [85, 82.6]];
  flat(g, ribbon(torc, 2.6, [1, 1, 1]), gold, 0); stroke(g, ribbon(torc, 2.6, [1, 1, 1]), OUT, 0.9);
  glow(g, 67, 91, 6, '#ff7a20', 0.5); T(g, ellipse(67, 91, 2.2, 2.6), '#ff7a2a', { sd: 0.6, hd: 0.6, lw: 0.9, light: '#ffe0a0' });
  face(g, G, pal, { ear: false, blush: 0.1,
    eyes: { iris: '#e0582c', w: 4.3, h: 2.05, lid: 0.32, low: 0.28, flick: true, look: [1.3, 0.05], pupil: '#2a0804', white: '#efe6dc' },
    brows: (g, G) => brows(g, G, [[4.2, -3.6], [0, -4.7], [-4.6, -4.7]], [[-2.0, -3.7], [1.0, -4.8], [3.4, -4.5]], 1.7, hc),
    nose: { s: 0.88 }, mouth: { curve: -0.2, w: 4.6, lips: '#8a5a5c' },
    over: (c, G) => { const R = rng(12); for (let i = 0; i < 11; i++) { const a = R() * PI * 2, d = 0.3 + 0.7 * Math.sqrt(R()); const [fx, fy] = P(8.6 + C(a) * 9.4 * d * (C(a) < 0 ? 1.25 : 0.75), 6.2 + S(a) * 2.8 * d); ember(c, fx, fy, 0.3 + R() * 0.16); } } });
  // near side swept back behind the ear (gold ear cuff)
  locks(g, [{ p: [P(-6, -20), P(-14, -12), P(-17, -2), P(-18, 10)], w: 8 }, { p: [P(-10, -14), P(-15, -4), P(-16.6, 8), P(-20, 18)], w: 6 }], hc, { hcol: hl, sd: 1.6 });
  ear(g, G, pal, { s: 0.88 });
  const [ex, ey] = G.ear; T(g, rrect(ex - 3.2, ey - 4.2, 2.2, 3.2, 0.8), gold, { sd: 0.4, hd: 0.4, lw: 0.8 });
  // front hair: smooth base mass, then long side-swept locks (red streaks) falling past the far cheek
  const base = sp([P(-12, -13), P(-11, -24), P(0, -29.6), P(12, -27.4), P(20.6, -19), P(24, -6), P(22, 6), P(16, -6), P(4, -13), P(-6, -12)]);
  hair(g, base, hc, { sd: 2, lite: [[P(-6, -25), P(4, -27.6), P(14, -24)]], lcol: hl });
  const L = [
    { p: [P(0, -28.6), P(12, -26), P(20.4, -17), P(23.6, -3), P(24.4, 12), P(26.4, 28), P(31, 45)], w: 9.6, prof: [0.8, 1, 0.04] },
    { p: [P(-3.4, -27.6), P(7, -26.4), P(15.6, -20), P(19.6, -9), P(20.4, 2)], w: 9, prof: [0.8, 1, 0.04] },
    { p: [P(-6, -26.4), P(3, -25.4), P(10.6, -19), P(14, -10), P(14.6, -3)], w: 8.4, prof: [0.8, 1, 0.04] },
    { p: [P(-8, -24.6), P(-2.6, -21.6), P(3, -15), P(5.6, -8.6)], w: 7.4, prof: [0.8, 1, 0.04] },
    { p: [P(-10, -22), P(-7.4, -17), P(-5.6, -10.4)], w: 6, prof: [0.8, 1, 0.04] },
  ];
  locks(g, L, hc, { hcol: hl, sd: 2 });
  for (const i of [0, 2]) clipIn(g, lockPath(L[i].p, L[i].w, L[i].prof), () => { ink(g, mv(L[i].p, 0.6, 0.4), 2.2, red, [0.3, 1, 0.2]); ink(g, mv(L[i].p, 0.1, -0.2), 0.8, redL, [0.2, 1, 0.1]); });
  // flyaway strands at the crown
  for (const f of [[P(-6, -27), P(-10, -32.6), P(-16, -34)], [P(3, -29), P(5, -34.6), P(11, -36)], [P(16, -24), P(22, -28), P(26, -26.6)]]) ink(g, f, 1.3, hc, [1, 0.8, 0.1]);
}

// Scout — young soldier in a dented kettle hat, out of breath.
function scout(g) {
  const G = geo({ x: 62, y: 49, k: 1.02, jaw: 0.94, chin: 0.94, width: 0.96 });
  const { P } = G;
  const pal = skinPal('#eab890', { blush: '#e86a5a' });
  const steel = '#9aa1a8', gamb = '#7a7448', hc = '#6a4426';
  // quilted gambeson
  T(g, sp([[0, 130], [4, 104], [16, 92], [36, 84], [52, 80], [76, 82], [96, 88], [112, 98], [122, 112], [126, 130]]), gamb, { sd: 4, detail: c => { c.strokeStyle = alpha('#2a2810', 0.35); c.lineWidth = 0.9; for (let i = -12; i < 12; i++) { c.beginPath(); c.moveTo(i * 9, 80); c.lineTo(i * 9 + 60, 140); c.stroke(); c.beginPath(); c.moveTo(i * 9 + 60, 80); c.lineTo(i * 9, 140); c.stroke(); } } });
  neck(g, G, pal, { w: 0.86, len: 34, adam: true });
  // blue scarf of the Rampart guard + strap
  T(g, sp([[44, 92], [46, 82], [58, 86], [72, 86], [84, 80], [88, 90], [78, 98], [62, 100]]), '#3a5a9a', { sd: 2.6, light: '#5a7ac0' });
  T(g, sp([[70, 96], [76, 98], [80, 112], [74, 114]]), '#34528c', { sd: 1.4 });
  flat(g, ribbon([[96, 88], [86, 104], [72, 130]], 4.2, [1, 1, 1]), '#5a3a20', 0); stroke(g, ribbon([[96, 88], [86, 104], [72, 130]], 4.2, [1, 1, 1]), OUT, 1);
  // messy hair under the hat
  hair(g, sp([P(-19, -8), P(-21.6, 2), P(-19, 10, 1), P(-16.6, 4), P(-14, 10, 1), P(-11, 2), P(-8, 0), P(-6, -6)]), hc, { sd: 1.6 });
  face(g, G, pal, { ear: false, blush: 0.5,
    eyes: { iris: '#6a4a2a', w: 4.2, h: 2.45, lid: 0.0, ir: 1.7, look: [0.7, -0.1] },
    brows: (g, G) => brows(g, G, [[4.2, -6.4], [0.2, -6.6], [-4.6, -5.4]], [[-2, -6.5], [0.9, -6.4], [3.4, -5.4]], 1.7, '#4a2e18'),
    nose: { s: 0.92 }, mouth: { open: 0.75, w: 4.6, teeth: true, curve: -0.1 },
    under: (c, G) => { for (const [y, a, b] of [[-11.6, -5, 8], [-14, -3, 6]]) ink(c, [P(a, y + 0.5), P((a + b) / 2, y - 0.6), P(b, y + 0.4)], 0.6, alpha(pal.sh2, 0.6)); } });
  ear(g, G, pal);
  // sweat drops
  for (const [x, y, s] of [[P(17, -8), 0, 1], [P(-5, -9), 0, 0.8], [P(19.6, 6), 0, 0.7]]) { const [dx, dy] = x; T(g, sp([[dx, dy - 2.6 * s], [dx + 1.3 * s, dy + 0.4 * s], [dx, dy + 1.6 * s], [dx - 1.3 * s, dy + 0.4 * s]]), '#d8f0ff', { sd: 0.5, hd: 0.5, lw: 0.8, light: '#ffffff' }); }
  // dented kettle hat, a little askew
  g.save(); const [hx, hy] = P(0, -8); g.translate(hx, hy); g.rotate(-0.1);
  T(g, ellipse(0, 0, 30, 5, 0), dark(steel, 0.08), { sd: 1.2, hd: 0.6 });
  const dome = sp([[-21, 0], [-20, -12], [-11, -20.4], [1, -23], [12, -20], [19.6, -11], [21, 0]]);
  metal(g, dome, steel, { sd: 3.6, hd: 2, detail: c => { c.fillStyle = alpha('#4a5058', 0.45); c.fill(sp([[2, -21], [9, -17], [7, -11], [1, -14]])); c.fillStyle = alpha('#ffffff', 0.45); c.fill(sp([[0.6, -22], [2.6, -14.6], [-1, -12], [-1, -19]])); scratches(c, 6, -18, -18, 18, -2, 7, 'rgba(255,255,255,0.4)'); } });
  ink(g, [[1.6, -22], [3.6, -16], [1, -11]], 0.9, alpha(OUT, 0.8), [0.2, 1, 0.2]);
  clipIn(g, poly([[-40, 0], [40, 0], [40, 20], [-40, 20]]), () => metal(g, ellipse(0, 0, 30, 5, 0), steel, { sd: 1.6, hd: 1 }));
  rivets(g, [[-16, -3], [-6, -3.6], [6, -3.6], [16, -3]], '#c8ccd0', 0.7);
  g.restore();
}

// Villager — farmer woman in a wool shawl, frightened.
function villager(g) {
  const G = geo({ x: 61, y: 46, k: 1.03, jaw: 0.94, chin: 0.97, width: 0.96 });
  const { P } = G;
  const pal = skinPal('#dca47e', { blush: '#d86a54' });
  const shawl = '#8a4a2e', shawlL = '#a86444', border = '#d8c49a', stripe = '#5a2a18', hc = '#5a3a24';
  const edge = (pts) => { flat(g, ribbon(pts, 3.2, [1, 1, 1]), border, 0); ink(g, pts, 0.9, stripe, [1, 1, 1]); };
  // shawl back (over head & shoulders) with darker inside
  T(g, sp([[-4, 130], [0, 104], [10, 90], P(-24, 30), P(-26, 4), P(-21.6, -18), P(-9, -30.6), P(7, -31), P(18, -24), P(22.6, -12), P(23.4, 4), P(22.6, 18), P(28, 30), [106, 88], [120, 98], [130, 130]]), shawl, { sd: 4.4, hd: 1.4, light: shawlL });
  flat(g, sp([P(-9, -14), P(-6, -23), P(6, -27.6), P(16.4, -21.6), P(20.8, -10), P(21.2, 6), P(20.6, 20), P(15, 31), P(4, 33), P(-8, 27), P(-11, 8)]), dark(shawl, 0.16), 0);
  // linen blouse with a gathered neckline
  T(g, sp([[46, 84], [86, 84], [80, 100], [66, 110], [52, 100]]), '#ece2c8', { sd: 2.6, shade: '#c4b490', light: '#fffaf0', detail: c => { for (let i = 0; i < 9; i++) ink(c, [[50 + i * 3.6, 86], [51 + i * 3.4, 92]], 0.6, alpha('#8a7a5a', 0.7), [0.2, 1, 0.2]); } });
  neck(g, G, pal, { w: 0.8, len: 36 });
  ink(g, [[52, 87.6], [60, 90], [68, 90.6], [78, 89], [82, 86.6]], 1, '#a8987a', [1, 1, 1]);
  face(g, G, pal, { ear: false, blush: 0.3,
    eyes: { iris: '#5a3a1a', w: 4.2, h: 2.6, lid: -0.05, ir: 1.55, look: [0.6, 0], bag: 0.3 },
    brows: (g, G) => brows(g, G, [[4.0, -6.8], [0.2, -6.4], [-4.6, -4.8]], [[-1.8, -6.9], [1.0, -6.2], [3.4, -4.8]], 1.6, '#4a2e1a'),
    nose: { s: 0.95 }, mouth: { open: 0.85, w: 4.8, teeth: true, curve: -0.35 },
    under: (c, G) => { for (const [y, a, b] of [[-11.4, -4, 8], [-14, -2, 6]]) ink(c, [P(a, y + 0.2), P((a + b) / 2, y - 0.8), P(b, y + 0.2)], 0.65, alpha(pal.sh2, 0.7)); ink(c, [P(9.6, 10.6), P(7, 13.4), P(6, 16.4)], 0.8, alpha(pal.sh2, 0.6)); } });
  // centre-parted hair under the shawl, a few loose strands, a grey hair
  hair(g, sp([P(-9, -14), P(-4, -22), P(4, -24.4), P(13, -22), P(18, -14), P(13, -16), P(6, -18.4), P(4, -16), P(0, -18.6), P(-5, -14), P(-8, -8)]), hc, { sd: 1.6, lite: [[P(-4, -19), P(4, -21.6), P(12, -19.6)]], lcol: '#8a6a4a' });
  ink(g, [P(14, -16), P(18, -8), P(17, 2)], 0.8, hc); ink(g, [P(-8, -10), P(-11, -2), P(-9, 6)], 0.8, hc);
  ink(g, [P(2, -21), P(8, -21)], 0.7, '#b8b0a8');
  // shawl far end over the far shoulder, tucked under the near end
  T(g, sp([P(20.6, 16), P(28, 30), [106, 88], [120, 98], [130, 130], [92, 130], [78, 108], [72, 96], P(15.6, 31)]), shawl, { sd: 4, hd: 1.4, light: shawlL, detail: c => folds(c, [[[100, 128], [96, 108]], [[114, 128], [110, 108]]], alpha('#3a1408', 0.4), 1.4) });
  edge([P(15.2, 31.4), [72, 96.4], [78.6, 108], [91.6, 130]]);
  // near end: over the head, down the near side and across the chest
  const flap = sp([P(6, -28.6), P(-3.4, -21), P(-8, -8), P(-8.6, 6), P(-6.6, 18), P(-2, 27), P(6, 34), [70, 92], [82, 110], [90, 130], [-4, 130], [0, 104], [10, 90], P(-24, 30), P(-26, 4), P(-21.6, -18), P(-9, -30.6)]);
  T(g, flap, shawl, { sd: 4, hd: 1.6, light: shawlL, detail: c => folds(c, [[P(-14, -20), P(-18, 0), P(-17, 22)], [[22, 128], [26, 104]], [[44, 128], [48, 106]], [[64, 128], [62, 110]]], alpha('#3a1408', 0.4), 1.4) });
  edge([P(5.4, -28), P(-3.6, -20.4), P(-7.6, -8), P(-8.2, 6), P(-6.2, 18), P(-1.6, 26.6), P(6.2, 33.6), [69.6, 92.4], [81.6, 110.4], [89.6, 130]]);
}

// Captured sellsword — scruffy, stubbled, bruised and nervous, wearing House Morrow's wine-red armband.
function mercenary(g) {
  const G = geo({ x: 60, y: 46, k: 1.05, jaw: 1.1, chin: 1.0, width: 1.0, cheek: 0.4 });
  const { P } = G;
  const pal = skinPal('#d8a27a', { blush: '#c8604a' });
  const hc = '#3a2a22', hdk = '#1e1410', hl = '#6a5040', leather = '#5a3a28', leatherL = '#7a5236', wine = '#6a1a2a', linen = '#c4b494';
  // battered leather jerkin with studs and a torn edge
  T(g, sp([[-2, 130], [2, 100], [12, 88], [30, 80], [48, 77], [78, 79], [98, 85], [114, 95], [124, 110], [128, 130]]), leather, { sd: 4, light: leatherL, detail: c => { scratches(c, 21, 30, 90, 124, 128, 12, 'rgba(255,220,180,0.22)'); folds(c, [[[96, 128], [94, 106]], [[110, 128], [108, 110]]], alpha('#1a0c06', 0.45), 1.3); c.fillStyle = alpha('#1a0c06', 0.35); c.fill(sp([[104, 118], [110, 114], [114, 120], [108, 124]])); } });
  rivets(g, [[46, 102], [46, 112], [46, 122], [88, 100], [88, 110], [88, 120]], '#8a8478', 0.9);
  // linen shirt in the open V, laces, jerkin lapels
  const vee = sp([[48, 82], [82, 82], [74, 104], [66, 112, 1], [57, 102]]);
  T(g, vee, linen, { sd: 2.4, shade: '#8a7a5a', light: '#e0d4b8' });
  neck(g, G, pal, { w: 1.02, len: 40, adam: true });
  const chest = sp([[57, 84], [75, 84], [70, 96], [66, 102, 1], [62, 96]]);
  flat(g, chest, pal.base, 1.1); clipIn(g, chest, () => { g.fillStyle = alpha(pal.sh, 0.7); g.fill(sp([[50, 80], [80, 80], [80, 86], [66, 87.6], [50, 86]])); });
  for (let i = 0; i < 3; i++) ink(g, [[61 + i * 1.2, 90 + i * 4], [71 - i * 1.2, 92 + i * 4]], 0.8, '#6a5a3a', [1, 1, 1]);
  for (const side of [[[47, 82], [56.6, 102], [66, 113]], [[83, 82], [74.6, 103], [66, 113]]]) { flat(g, ribbon(side, 3.6, [1, 1, 0.6]), dark(leather, 0.06), 0); stroke(g, ribbon(side, 3.6, [1, 1, 0.6]), OUT, 1); }
  // rope binding the arms
  const rope = [[-4, 122], [30, 119], [70, 124], [130, 119]];
  flat(g, ribbon(rope, 4, [1, 1, 1]), '#b8995a', 0); stroke(g, ribbon(rope, 4, [1, 1, 1]), OUT, 1);
  clipIn(g, ribbon(rope, 4, [1, 1, 1]), () => { for (let x = -4; x < 132; x += 3.4) ink(g, [[x, 116], [x + 3, 126]], 0.7, alpha('#5a4020', 0.8), [1, 1, 1]); });
  // near upper arm with the Morrow armband (black crowned raven on wine red)
  T(g, sp([[0, 130], [2, 100], [8, 87], [22, 80], [37, 82], [45, 94], [44, 130]]), dark(leather, 0.03), { sd: 3.2, light: leatherL, detail: c => folds(c, [[[14, 128], [16, 112]], [[30, 128], [32, 112]]], alpha('#1a0c06', 0.45), 1.2) });
  const band = sp([[5, 93], [25, 88.6], [44.4, 90.6], [46, 100.6], [25, 99.4], [4, 103.6]]);
  T(g, band, wine, { sd: 2.6, hd: 1, light: '#9a3040', lw: 1.4 });
  clipIn(g, band, () => { ink(g, [[4, 94.6], [25, 90.2], [45, 92.2]], 0.9, '#c8a040', [1, 1, 1]); ink(g, [[4, 102], [25, 97.8], [46, 99]], 0.9, '#c8a040', [1, 1, 1]); });
  raven(g, 27, 95.2, 1.05, '#120c0e', '#c8a040');
  flat(g, ribbon([[-2, 121], [20, 119.6], [44, 121]], 4, [1, 1, 1]), '#b8995a', 1);
  face(g, G, pal, { ear: false, blush: 0.16,
    eyes: { iris: '#4a5a3a', w: 4.1, h: 2.3, lid: 0.04, ir: 1.7, look: [1.6, -0.35], n: { lid: 0.34, low: 0.12 } },
    brows: (g, G) => brows(g, G, [[4.2, -6.2], [0.2, -5.8], [-4.6, -4.4]], [[-1.9, -6.3], [1.0, -5.8], [3.4, -4.6]], 2.0, '#2a1a14'),
    nose: { s: 1.08, red: 0.15 }, mouth: { open: 0.34, grit: true, w: 5.6, curve: -0.3, smirk: -0.2 },
    under: (c, G) => {
      // stubble
      const st = sp([P(-6.4, 4), P(-1, 10), P(5, 12.6), P(10, 12.4), P(15, 12), P(18.6, 8), P(24, 10), P(24, 30), P(-14, 30), P(-12, 8)]);
      clipIn(c, st, () => { c.fillStyle = 'rgba(70,56,64,0.24)'; c.fillRect(0, 0, 128, 128); const R = rng(5); for (let i = 0; i < 160; i++) flat(c, circle(R.range(40, 90), R.range(48, 82), 0.28), alpha('#2a1e1e', 0.55), 0); });
      // swollen bruise around the near eye
      c.fillStyle = rg(c, G.eyeN[0] - 0.8, G.eyeN[1] + 0.8, 0, 7.6, [[0, 'rgba(100,50,120,0.55)'], [0.6, 'rgba(120,70,110,0.38)'], [1, 'rgba(150,150,80,0)']]); c.fillRect(0, 0, 128, 128);
      ink(c, [P(-3.4, 3.4), P(1.6, 4.6), P(5.6, 3.6)], 0.8, alpha('#5a2a50', 0.6));
      for (const [y, a, b] of [[-11.6, -4, 8], [-14.2, -2, 6]]) ink(c, [P(a, y + 0.6), P((a + b) / 2, y - 0.6), P(b, y + 0.4)], 0.6, alpha(pal.sh2, 0.7));
    },
    over: (c, G) => {
      ink(c, [P(14.4, 2.6), P(16.8, 6.2)], 1.4, '#a0302a'); ink(c, [P(14.6, 2.8), P(16.6, 6)], 0.5, '#f0a090');
      const [mx, my] = G.mouth; ink(c, [[mx - 2.4, my + 2.4], [mx - 1.6, my + 4.4]], 1.2, '#a0302a');
    } });
  ear(g, G, pal, { s: 1.02 });
  // messy hair: base mass + unruly locks falling over the brow
  hair(g, sp([P(-8, -12), P(-17.6, -14), P(-21, -2), P(-19, 9), P(-13, 10), P(-9.6, 2), P(-8.4, -6), P(-2, -14), P(8, -16), P(16, -14), P(19, -18), P(12, -26.6), P(-2, -28.4), P(-14, -24)]), hc, { sd: 2.4, dark: [[P(-14, -16), P(-17, -4), P(-16, 6)]], dcol: hdk, lite: [[P(-14, -20), P(-6, -25.6), P(4, -26)]], lcol: hl });
  locks(g, [
    { p: [P(-17, -10), P(-20.6, -2), P(-21.4, 8), P(-18, 14)], w: 6.4, prof: [0.8, 1, 0.05] },
    { p: [P(-10, 0), P(-13.6, 6), P(-12.6, 13)], w: 5, prof: [0.8, 1, 0.05] },
    { p: [P(-6, -26), P(4, -24.6), P(12, -19), P(16.6, -12.6)], w: 7.4, prof: [0.8, 1, 0.04] },
    { p: [P(-4, -24.4), P(3.6, -20), P(8.6, -13), P(9.6, -7.6)], w: 7, prof: [0.8, 1, 0.04] },
    { p: [P(-8.6, -22), P(-4, -18), P(0.4, -12.6), P(0.4, -7.6)], w: 6.6, prof: [0.8, 1, 0.04] },
    { p: [P(-12, -19), P(-9.6, -14), P(-8.6, -8.6)], w: 5.4, prof: [0.8, 1, 0.04] },
    { p: [P(6, -27.6), P(14.6, -26), P(20, -22.6), P(23.6, -24.6)], w: 5, prof: [0.8, 1, 0.04] },
  ], hc, { hcol: hl, sd: 2 });
  // sweat
  for (const [p, s] of [[P(18.8, -7), 1], [P(-5, -6.6), 0.75], [P(20.4, 8), 0.7]]) { const [dx, dy] = p; T(g, sp([[dx, dy - 2.6 * s, 1], [dx + 1.3 * s, dy + 0.4 * s], [dx, dy + 1.6 * s], [dx - 1.3 * s, dy + 0.4 * s]]), '#d8f0ff', { sd: 0.5, hd: 0.5, lw: 0.8, light: '#ffffff' }); }
}

// Lord Varkas Morrow — gaunt aristocrat in black & wine-red raven armour, the burning Ember Crown on his brow.
function varkas(g) {
  const G = geo({ x: 61, y: 47, k: 1.06, jaw: 0.92, chin: 1.12, width: 0.93, cheek: 1.0, chinFwd: 1.0 });
  const { P } = G;
  const pal = skinPal('#e6d2c4', { sh: '#b8989c', sh2: '#8a6a76', hi: '#f6eae0', blush: '#c88a90', line: '#3a2228' });
  const black = '#26222c', black2 = '#302a36', rim = '#8a8aa4', wine = '#6a1a2a', wineL = '#8e2a3c', gold = '#c09a44';
  const plate = (p, col = black, o = {}) => metal(g, p, col, Object.assign({ light: rim, shade: '#0e0a10', sd: 3.4, hd: 1.4 }, o));
  // wine-red cloak behind the shoulders
  T(g, sp([[-6, 130], [-4, 100], [8, 86], [30, 78], [100, 80], [122, 92], [134, 130]]), wine, { sd: 4, light: wineL });
  // high stiff collar: black outside (near), wine lining (far)
  plate(sp([[28, 102], [29, 84], [33, 70], [40, 61], [47, 62], [51, 74], [55, 92]]), black, { sd: 2.6 });
  ink(g, [[30.6, 84], [34.4, 70.6], [40.6, 63], [46, 63.6]], 1.1, gold, [0.4, 1, 0.6]);
  T(g, sp([[80, 94], [83, 76], [88, 64], [94, 59], [99, 66], [100, 84], [97, 96]]), wine, { sd: 2.4, light: wineL, detail: c => folds(c, [[[90, 92], [91, 72]]], alpha('#200408', 0.5), 1) });
  stroke(g, sp([[97.6, 96], [99.6, 84], [98.6, 66.6], [94.4, 60.4]], 0.5), black2, 2.2);
  // armour: breastplate with a ridge, wine tabard panel
  plate(sp([[4, 130], [8, 104], [18, 92], [36, 86], [56, 84], [80, 84], [98, 88], [112, 96], [122, 110], [124, 130]]), black, { sd: 4.2 });
  T(g, sp([[54, 130], [56, 106], [62, 100], [80, 100], [86, 106], [88, 130]]), wine, { sd: 3, light: wineL, detail: c => folds(c, [[[64, 128], [65, 110]], [[80, 128], [79, 112]]], alpha('#200408', 0.5), 1.2) });
  stroke(g, sp([[57, 130], [58.6, 107], [63.6, 103], [78.6, 103], [83.4, 107], [85, 130]]), gold, 1);
  ink(g, [[100, 92], [112, 104], [118, 122]], 1.2, alpha(rim, 0.7), [0.2, 1, 0.3]);
  neck(g, G, pal, { w: 0.84, len: 32 });
  // gorget lames with the raven roundel
  plate(sp([[42, 98], [44, 90], [56, 86], [80, 86], [92, 90], [92, 99], [68, 101]]), black2, { sd: 2.2 });
  plate(sp([[44, 92], [46, 84], [58, 80], [80, 80], [90, 84], [90, 92], [68, 94]]), black, { sd: 2 });
  T(g, circle(68, 97, 7.6), wine, { sd: 1.6, hd: 1, lw: 1.3, light: wineL });
  stroke(g, circle(68, 97, 6.4), gold, 1.1);
  raven(g, 68.4, 97.6, 0.82, '#0c080a', '#e0b850');
  // raven-feather pauldron: shoulder dome with feather lames
  for (let i = 4; i >= 0; i--) {
    g.save(); g.translate(26 - i * 4.6, 92 + i * 3.4); g.rotate(0.42 + i * 0.16);
    const f = sp([[0, -2], [4.6, 2], [5.4, 14], [1.4, 24, 1], [-3.6, 14], [-4, 2]]);
    plate(f, i % 2 ? black2 : black, { sd: 1.8, hd: 1.2 });
    ink(g, [[0.6, 1], [1, 12], [1.3, 21]], 0.7, alpha(rim, 0.75), [0.2, 1, 0.2]);
    g.restore();
  }
  plate(sp([[2, 100], [6, 90], [18, 84], [34, 82], [44, 88], [40, 96], [24, 98], [10, 102]]), black, { sd: 2.6, hd: 1.6 });
  stroke(g, sp([[5, 99], [8.4, 91.6], [19, 86.6], [33, 85], [41, 89]]), wineL, 1.2);
  rivets(g, [[14, 92], [24, 88], [34, 88]], gold, 0.85);
  plate(sp([[98, 90], [112, 88], [124, 96], [128, 112], [116, 106], [102, 100]]));
  stroke(g, sp([[101, 92.6], [112, 91], [121.4, 97.4], [124.4, 107]]), wineL, 1.2);
  face(g, G, pal, { ear: false, blush: 0.06, socket: 0.65,
    eyes: { iris: '#a8b8c8', w: 4.2, h: 1.95, lid: 0.52, low: 0.1, ir: 1.75, pupilR: 0.36, look: [1.0, 0.4], lidShadow: 'rgba(60,30,50,0.35)' },
    brows: (g, G) => brows(g, G, [[4.4, -3.6], [-0.2, -5.6], [-4.6, -5.4]], [[-2.2, -3.8], [1.2, -5.4], [3.6, -5]], 1.35, '#1a1418'),
    nose: { s: 1.06, hook: 0.9, tipY: 0.8 }, mouth: { curve: -0.05, smirk: 0.55, dropN: 0.7, w: 5.2, lw: 1.0, lowW: 0.8 },
    under: (c, G) => {
      c.fillStyle = alpha(pal.sh, 0.75); c.fill(sp([P(-6, 6.6), P(2, 10.6), P(7.6, 15.6), P(3, 13.4), P(-5, 11)]));
      c.fillStyle = 'rgba(90,50,90,0.2)'; c.fill(ellipse(G.eyeN[0] - 0.4, G.eyeN[1] + 2.6, 4.4, 1.6)); c.fill(ellipse(G.eyeF[0] + 0.4, G.eyeF[1] + 2.4, 2.6, 1.4));
      ink(c, [P(9.4, 10.6), P(7.4, 14.6), P(6.6, 17.6)], 0.7, alpha(pal.sh2, 0.7));
      c.save(); c.globalCompositeOperation = 'source-atop'; c.fillStyle = rg(c, P(6, -16)[0], P(6, -16)[1], 0, 16, [[0, 'rgba(255,130,50,0.5)'], [1, 'rgba(255,130,50,0)']]); c.fillRect(0, 0, 128, 128); c.restore();
    } });
  ear(g, G, pal, { s: 0.98 });
  // slicked-back hair hugging the skull, a grey streak from the temple
  const hp = sp([P(-15.4, -8.4), P(-6, -13.4), P(4, -15), P(14, -14), P(19.2, -12), P(17.6, -19), P(9, -25.6), P(-3, -28), P(-13, -24.6), P(-19.6, -15), P(-20.6, -3), P(-19.4, 7), P(-15.4, 12.6), P(-14, 5.4), P(-13.4, 0.4), P(-11.4, -3.4), P(-12.6, -6)]);
  hair(g, hp, '#18121a', { sd: 2.4, lite: [[P(6, -16), P(-4, -22), P(-14, -19), P(-18.6, -8)], [P(14, -15.6), P(4, -24), P(-9, -25), P(-17, -15)], [P(-2, -15), P(-11, -15), P(-17, -6), P(-17.4, 4)]], lcol: '#4a4458', lw2: 1.1 });
  clipIn(g, hp, () => { ink(g, [P(-11.4, -5.6), P(-16, -5), P(-19, 3)], 2.6, '#8a8696'); ink(g, [P(-11.4, -6.6), P(-15.8, -6.4), P(-19.4, 0)], 1, '#c8c4cc'); });
  // the Ember Crown: blackened iron with flame-shaped points, burning
  const band = [P(-17.6, -7.6), P(-7, -12.6), P(6, -14), P(19.6, -10.6)];
  const pts = [[P(-13, -10), -0.5, 7], [P(-4, -13.4), -0.25, 9], [P(6, -14.6), 0, 12], [P(14.6, -13), 0.25, 9], [P(19.4, -11), 0.45, 6.4]];
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const [[x, y], a, h] of pts) { const tx = x + S(a) * (h + 8), ty = y - C(a) * (h + 8); glow(g, tx, ty, 9, '#ff6a1a', 0.55); }
  g.restore();
  for (const [[x, y], a, h] of pts) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.save(); g.globalCompositeOperation = 'lighter';
    flat(g, sp([[-2.6, -h + 2], [-3.2, -h - 4], [-1, -h - 7], [0.4, -h - 12, 1], [1.8, -h - 6], [3.2, -h - 4], [2.6, -h + 2]]), 'rgba(255,110,30,0.75)', 0);
    flat(g, sp([[-1.4, -h + 1], [-1.4, -h - 3], [0.2, -h - 7, 1], [1.6, -h - 3], [1.4, -h + 1]]), 'rgba(255,220,120,0.95)', 0);
    g.restore();
    T(g, sp([[-2.4, 1], [-2.6, -h * 0.5], [-1.2, -h * 0.8], [0, -h, 1], [1.4, -h * 0.75], [2.6, -h * 0.45], [2.4, 1]]), '#2c2026', { sd: 1, hd: 0.8, lw: 1.1, light: '#ff9a50', shade: '#140c10' });
    ink(g, [[0, -1], [0.3, -h * 0.5], [0, -h * 0.85]], 0.7, '#ffb060', [0.3, 1, 0.1]);
    g.restore();
  }
  flat(g, ribbon(band, 4.4, [0.8, 1, 0.8]), '#2c2026', 0); stroke(g, ribbon(band, 4.4, [0.8, 1, 0.8]), OUT, 1.1);
  clipIn(g, ribbon(band, 4.4, [0.8, 1, 0.8]), () => { ink(g, mv(band, 0, -1.2), 0.8, '#d8a040', [1, 1, 1]); g.save(); g.globalCompositeOperation = 'lighter'; ink(g, [P(-4, -12.6), P(-1, -12), P(2, -13.6)], 0.9, '#ff7a20', [1, 1, 1]); ink(g, [P(10, -13), P(12, -12), P(14, -13)], 0.9, '#ff7a20', [1, 1, 1]); g.restore(); });
  for (const [x, y] of [P(6, -12.8), P(-4.6, -11.4), P(15, -11.4)]) { glow(g, x, y, 4, '#ff6a20', 0.7); T(g, circle(x, y, 1.4), '#ff8a2a', { sd: 0.3, hd: 0.4, lw: 0.8, light: '#ffe0a0' }); }
  const R = rng(31); g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) { const [x, y] = P(R.range(-14, 24), R.range(-40, -26)); flat(g, circle(x, y, R.range(0.4, 0.9)), R() < 0.5 ? '#ffb060' : '#ff7a30', 0); }
  g.restore();
}

// Gorrath the Wall-Breaker — huge ash-grey brute with ember cracks, tusks and a spiked stone crown.
function gorrath(g) {
  const skin = '#7e776e', sh = '#5c564e', sh2 = '#433d38', hi = '#9e978c', stone = '#5d6168', stoneD = '#4a4d54', stoneL = '#9aa0a8';
  const crack = (pts, w = 1) => { const q = pts.map((p, i) => [p[0], p[1], i > 0 && i < pts.length - 1 ? 1 : 0]); g.save(); g.globalCompositeOperation = 'lighter'; ink(g, q, 3 * w, alpha('#ff6a18', 0.45), [0.4, 1, 0.3]); ink(g, q, 1.1 * w, '#ffc060', [0.3, 1, 0.2]); g.restore(); };
  const S2 = (p, col, o = {}) => T(g, p, col, Object.assign({ sd: 4, hd: 1.6, lw: 2.2, shade: sh, light: hi }, o));
  // massive shoulders and traps
  const body = sp([[-8, 130], [-8, 90], [2, 72], [18, 60], [34, 54], [46, 60], [84, 66], [100, 60], [116, 64], [128, 76], [136, 96], [136, 130]]);
  S2(body, skin, { sd: 6 });
  clipIn(g, body, () => {
    g.fillStyle = sh; g.fill(sp([[40, 130], [46, 100], [60, 92], [84, 94], [96, 104], [100, 130]]));
    ink(g, [[20, 70], [30, 86], [26, 104]], 1.6, alpha(sh2, 0.8)); ink(g, [[110, 74], [104, 92]], 1.6, alpha(sh2, 0.8)); ink(g, [[48, 112], [66, 106], [86, 110]], 1.4, alpha(sh2, 0.6));
  });
  crack([[6, 80], [11, 84], [12.4, 91], [17, 96.6], [16, 101]]); crack([[12.4, 91], [8, 94.6]], 0.6); crack([[118, 80], [114, 86.4], [114.6, 93], [110, 98]], 0.9); crack([[114.6, 93], [119, 96]], 0.6); crack([[60, 112], [66, 115], [67.6, 121], [72, 125]], 0.85);
  // iron chain across the chest
  for (let i = 9; i >= 0; i--) {
    const t = i / 9, x = lerp(10, 108, t), y = lerp(66, 128, t), a = Math.atan2(62, 98);
    g.save(); g.translate(x, y); g.rotate(a);
    if (i % 2) T(g, rrect(-5.4, -1.6, 10.8, 3.2, 1.6), '#3e4046', { sd: 0.8, hd: 0.6, lw: 1.3, light: stoneL });
    else { T(g, ellipse(0, 0, 5.4, 3.8), '#5d6168', { sd: 1.2, hd: 0.9, lw: 1.3, light: stoneL }); flat(g, ellipse(0, 0, 3, 1.5), '#2a2a2e', 0.9); }
    g.restore();
  }
  // head
  const head = sp([[36, 54], [37, 36], [46, 24], [62, 18], [78, 21], [88, 30], [93, 37], [90, 44], [94, 50], [99, 57], [97, 63], [101, 70], [95, 80], [80, 86], [62, 86], [48, 80], [40, 70]]);
  S2(head, skin, { sd: 5, hd: 2 });
  clipIn(g, head, () => {
    g.fillStyle = sh; g.fill(sp([[96, 30], [90, 44], [93, 54], [92, 66], [86, 78], [70, 84], [52, 80], [60, 92], [110, 92], [110, 30]]));
    g.fillStyle = alpha(hi, 0.7); g.fill(sp([[42, 36], [50, 26], [62, 22], [54, 30], [46, 42]]));
    g.fillStyle = sh2; g.fill(sp([[52, 38], [70, 37], [88, 39], [90, 46], [80, 48], [66, 47], [54, 46]]));
    ink(g, [[46, 58], [52, 66], [60, 70]], 1.3, alpha(sh2, 0.7)); ink(g, [[72, 52], [76, 60]], 1.1, alpha(sh2, 0.6));
  });
  // ear
  S2(sp([[44, 44], [38, 42], [36, 50], [40, 56], [45, 54]]), skin, { sd: 1.6, hd: 0.8, lw: 1.6 });
  ink(g, [[42, 46], [39.6, 49], [42, 53]], 1, sh2);
  // brow ridge
  S2(sp([[50, 38], [58, 32], [72, 31], [86, 32], [93, 37], [90, 40.4], [80, 38.6], [74, 39.6], [60, 40], [52, 42]]), skin, { sd: 2.2, hd: 1.2, lw: 1.8 });
  ink(g, [[60, 36.6], [68, 33.6], [78, 34]], 1.2, alpha(sh2, 0.8)); ink(g, [[74, 30], [76, 34.6]], 1.1, alpha(sh2, 0.8));
  // glowing ember eyes, squinting with rage
  for (const [x, y, rx] of [[66, 43.4, 3.6], [86.6, 43.4, 2.3]]) { glow(g, x, y, 12, '#ff7a20', 0.8); flat(g, sp([[x - rx, y + 0.8, 1], [x - rx * 0.2, y - 1.5], [x + rx, y - 0.6, 1], [x + rx * 0.3, y + 1.7]]), '#fff2b0', 1, '#2a0e04'); }
  // broad nose
  S2(sp([[78, 41], [83, 47.6], [91, 53], [95.6, 58], [89, 61], [82, 59], [77.6, 54]]), skin, { sd: 2, hd: 1, lw: 1.8 });
  flat(g, ellipse(85, 58.4, 2.2, 1.1, 0.2), sh2, 0); flat(g, ellipse(92.6, 58, 1.4, 0.9, 0.2), sh2, 0);
  // snarling mouth, underbite with tusks
  const m = sp([[62, 66], [72, 64.6], [86, 63.8], [97, 63], [95, 68], [84, 70], [72, 71], [64, 70]]);
  flat(g, m, '#2a0c08', 1.4);
  clipIn(g, m, () => { for (let i = 0; i < 7; i++) flat(g, poly([[66 + i * 4.3, 71], [67.8 + i * 4.3, 66.4 - (i % 2) * 0.8], [69.6 + i * 4.3, 71]]), '#e8dcc0', 0.6); });
  S2(sp([[60, 70], [74, 72.6], [90, 71], [100, 69], [100, 74], [92, 77], [74, 78], [62, 75]]), skin, { sd: 1.6, hd: 1, lw: 1.8 });
  for (const [x, y, h, a] of [[70, 72, 17, -0.18], [92, 70, 15, 0.1]]) { g.save(); g.translate(x, y); g.rotate(a); T(g, sp([[-2.8, 1], [-2.6, -h * 0.5], [-0.6, -h, 1], [1.8, -h * 0.55], [2.8, 1]]), '#f4ecd2', { sd: 1.2, hd: 0.8, lw: 1.5, shade: '#c8bc9a', light: '#ffffff' }); ink(g, [[-1, -2], [-0.6, -h * 0.6]], 0.6, alpha('#a89a78', 0.8)); g.restore(); }
  crack([[63, 27], [60.6, 31], [61.6, 34.4], [59, 37]], 0.9); crack([[47, 54], [51.6, 57], [52, 62.4], [55.6, 67]], 0.95); crack([[52, 62.4], [48.6, 65]], 0.6);
  // spiked stone crown: chipped band, three cracked spikes with ember seams
  for (const [x, y, a, h] of [[50, 26, -0.55, 19], [65, 19.6, -0.08, 24], [80, 23, 0.42, 18]]) {
    g.save(); g.translate(x, y); g.rotate(a);
    const sp0 = poly([[-4, 2], [-2.6, -h * 0.5], [-0.6, -h * 0.8], [0, -h], [1.6, -h * 0.55], [4, 2]]);
    T(g, sp0, stone, { sd: 1.8, hd: 1.2, lw: 1.8, light: stoneL, shade: '#3a3c42' });
    ink(g, [[-0.6, -1], [0.6, -h * 0.3], [-0.4, -h * 0.5]], 0.8, alpha('#2a2a2e', 0.8));
    g.restore();
  }
  const band = [[39, 33], [48, 26], [64, 21.6], [80, 24], [90, 31]];
  const bp = ribbon(band, 7, [0.9, 1, 0.8]);
  T(g, bp, stoneD, { sd: 1.6, hd: 1, lw: 1.8, light: stoneL, shade: '#34363c', detail: c => { ink(c, [[56, 20], [57, 28]], 0.9, alpha('#000', 0.55)); ink(c, [[72, 20], [71, 27]], 0.9, alpha('#000', 0.55)); flat(c, poly([[44, 27], [47, 30], [42, 32]]), alpha('#000', 0.3), 0); } });
  crack([[60, 22.4], [62, 25], [61, 27]], 0.6);
}

// Queen Maelis — a luminous memory in cool translucent blues: silver star crown, veil, gentle sad eyes.
function maelisFigure(g) {
  const G = geo({ x: 61, y: 46, k: 1.0, jaw: 0.88, chin: 0.98, width: 0.95, cheek: 0.2 });
  const { P } = G;
  const pal = skinPal('#e2ecf8', { sh: '#a8bee0', sh2: '#7f9cc8', hi: '#f8fcff', blush: '#b4ccf0', line: '#2a3e66' });
  const hc = '#c4d6ee', hd = '#8aa4cc', hl = '#f2f8ff', gown = '#5a7ab0', mant = '#3a5a90', silver = '#eef4fc';
  // veil behind (translucent)
  g.save(); g.globalAlpha = 0.55;
  T(g, sp([P(-4, -30), P(-22, -22), P(-30, 0), P(-34, 30), P(-40, 60), [-4, 130], [40, 130], P(-10, 40), P(8, 24)]), '#dfeaff', { sd: 3, hd: 0, lw: 1.2, shade: '#a8c0e8' });
  T(g, sp([P(14, -26), P(26, -10), P(30, 20), P(36, 50), [118, 130], [92, 130], P(22, 30), P(18, 0)]), '#dfeaff', { sd: 3, hd: 0, lw: 1.2, shade: '#a8c0e8' });
  g.restore();
  // long hair behind
  hair(g, sp([P(-6, -24), P(-19, -16), P(-23, 2), P(-24, 22), P(-27, 44), P(-24, 60, 1), P(-14, 52), P(-6, 40), P(4, 30)]), hc, { sd: 3, dark: [[P(-19, 0), P(-21, 22), P(-23, 44)]], dcol: hd, lite: [[P(-20, -6), P(-21.6, 14), P(-24, 36)]], lcol: hl });
  // gown + mantle with silver trim
  T(g, sp([[10, 130], [12, 108], [22, 96], [38, 88], [52, 84], [74, 85], [92, 90], [104, 98], [112, 110], [116, 130]]), gown, { sd: 4, light: '#7a9ad0', detail: c => folds(c, [[[30, 128], [34, 106]], [[96, 128], [94, 108]]], alpha('#1a2a50', 0.4), 1.3) });
  neck(g, G, pal, { w: 0.76, len: 38 });
  // high lace collar
  T(g, sp([[48, 92], [47, 82], [52, 74], [58, 84], [66, 90], [76, 86], [82, 76], [86, 86], [84, 94], [66, 98]]), '#cfdcf2', { sd: 2, shade: '#9ab0d8', light: '#ffffff', detail: c => { for (let i = 0; i < 8; i++) flat(c, circle(50 + i * 4.6, 92 + S(i) * 1.2, 1), alpha('#ffffff', 0.7), 0); } });
  T(g, sp([[0, 130], [4, 104], [16, 92], [32, 88], [44, 92], [50, 104], [48, 130]]), mant, { sd: 4, light: '#5a7ab8' });
  T(g, sp([[84, 130], [82, 104], [90, 92], [104, 92], [116, 102], [126, 130]]), mant, { sd: 4, light: '#5a7ab8' });
  stroke(g, sp([[47.6, 130], [49.4, 104], [43.4, 93.6]]), silver, 1.3); stroke(g, sp([[84.4, 130], [82.6, 104], [89.6, 93.6]]), silver, 1.3);
  starCrest(g, 66, 100, 5.2, silver, { glow: '#bfe0ff', ga: 0.5 });
  face(g, G, pal, { ear: false, blush: 0.2, socket: 0.35,
    eyes: { iris: '#7aa8e0', w: 4.3, h: 2.15, lid: 0.38, flick: true, look: [0.6, 0.25], lash: '#1e2e50', white: '#f4f8ff', lidShadow: 'rgba(40,60,120,0.25)' },
    brows: (g, G) => brows(g, G, [[4.2, -5.6], [0.2, -5.6], [-4.6, -4.3]], [[-2.1, -5.7], [0.8, -5.4], [3.4, -4.3]], 1.3, '#8aa4cc', { ol: '#2a3e66', olw: 0.4 }),
    nose: { s: 0.85 }, mouth: { curve: 0.16, w: 4.6, lips: '#9ab0e0' } });
  // centre-parted hair framing the face, falling over the shoulders
  hair(g, sp([P(1, -25), P(-9, -23), P(-15, -14), P(-15.6, 0), P(-14, 14), P(-16, 30), P(-20, 50, 1), P(-21, 30), P(-20, 10), P(-18.6, -8)]), hc, { sd: 2, lite: [[P(-13, -16), P(-16.4, 0), P(-17, 20)]], lcol: hl, dark: [[P(-11, -18), P(-15, -4)]], dcol: hd });
  hair(g, sp([P(3, -25.4), P(13, -22), P(19, -12), P(21, 4), P(21, 22), P(24, 44, 1), P(18, 34), P(17.6, 16), P(18, 0), P(15, -12), P(8, -19.4)]), hc, { sd: 2.2, lite: [[P(11, -20), P(18, -8), P(19.6, 10)]], lcol: hl, dark: [[P(6, -21), P(14, -12)]], dcol: hd });
  // tall silver crown with the star of her line
  const crown = sp([P(-12, -21), P(-13, -30, 1), P(-8, -25), P(-4, -35, 1), P(0, -27), P(5, -40, 1), P(10, -27.4), P(14.6, -35, 1), P(16.6, -24), P(19, -30, 1), P(19.6, -20), P(4, -23)]);
  T(g, crown, silver, { sd: 2.4, hd: 1.2, light: '#ffffff', shade: '#a8bcd8', lw: 1.3 });
  flat(g, ribbon([P(-12, -21), P(4, -23.4), P(19.6, -20)], 2.4, [1, 1, 1]), '#d8e4f4', 0.9);
  for (const [x, y] of [P(-4, -22.6), P(14, -22)]) T(g, circle(x, y, 1.1), '#9ad0ff', { sd: 0.3, hd: 0.3, lw: 0.7, light: '#ffffff' });
  starCrest(g, ...P(5, -27), 3.4, '#ffffff', { glow: '#cfe8ff', ga: 0.6, lw: 0.9 });
  // veil over the crown sides (translucent front layer with a star-dotted hem)
  g.save(); g.globalAlpha = 0.42;
  T(g, sp([P(-12, -24), P(-20, -14), P(-23, 6), P(-25, 28), P(-30, 50), P(-22, 46), P(-19, 24), P(-17.6, 2), P(-15.6, -14)]), '#f2f8ff', { sd: 2, hd: 0, lw: 1, shade: '#b8d0f0' });
  T(g, sp([P(18, -22), P(23, -8), P(24.6, 12), P(28, 36), P(33, 52), P(26, 48), P(22, 30), P(20, 8), P(19, -12)]), '#f2f8ff', { sd: 2, hd: 0, lw: 1, shade: '#b8d0f0' });
  g.restore();
  for (let i = 0; i < 8; i++) { const t = i / 7; const [x, y] = P(lerp(-24, -29, t) + S(i) * 0.6, lerp(6, 46, t)); flat(g, star(x, y, 1.1, 0.4, 4), alpha('#ffffff', 0.85), 0); const [x2, y2] = P(lerp(24, 29, t), lerp(10, 46, t)); flat(g, star(x2, y2, 1, 0.4, 4), alpha('#ffffff', 0.8), 0); }
}

function maelis(g) {
  // offscreen at the current render scale (2 for the portraits atlas, more for the HD copies)
  const k = g.getTransform().a, P = Math.round(128 * k);
  const off = document.createElement('canvas'); off.width = P; off.height = P;
  const o = off.getContext('2d'); o.scale(k, k);
  maelisFigure(o);
  // unify into cool blues, then let the figure dissolve into mist toward the bottom
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.globalCompositeOperation = 'source-atop'; o.fillStyle = 'rgba(110,160,235,0.22)'; o.fillRect(0, 0, P, P);
  o.globalCompositeOperation = 'destination-in';
  o.fillStyle = lg(o, 0, 0, 0, P, [[0, 'rgba(0,0,0,0.94)'], [0.6, 'rgba(0,0,0,0.9)'], [0.82, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0)']]); o.fillRect(0, 0, P, P);
  glow(g, 66, 48, 62, '#5a9aff', 0.32);
  g.drawImage(off, 0, 0, 128, 128);
  // drifting motes of light
  const R = rng(17); g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 11; i++) { const x = R.range(10, 118), y = R.range(66, 122); glow(g, x, y, 2.6, '#9ad0ff', 0.5); flat(g, circle(x, y, R.range(0.35, 0.7)), '#eaf6ff', 0); }
  g.restore();
}

// The Cinder Heart — a fallen star blazing inside cracked obsidian; a face of white light in the fire.
function heart(g) {
  const cx = 64, cy = 62;
  const R = rng(41);
  g.save(); g.globalCompositeOperation = 'lighter';
  glow(g, cx, cy, 76, '#ff5a10', 0.6);
  // corona flames licking up behind the shell
  for (let i = 0; i < 11; i++) {
    const a = -PI / 2 + (i - 5) * 0.27 + R.range(-0.05, 0.05), h = 24 + R() * 20 - Math.abs(i - 5) * 1.5, x = cx + C(a) * 40, y = cy + S(a) * 40;
    g.save(); g.translate(x, y); g.rotate(a + PI / 2 + R.range(-0.15, 0.15));
    flat(g, sp([[-7, 6], [-6.4, -h * 0.4], [-2.6, -h * 0.75], [0, -h, 1], [2.6, -h * 0.6], [6.6, -h * 0.3], [7, 6]]), 'rgba(255,96,20,0.55)', 0);
    flat(g, sp([[-3.6, 4], [-2.6, -h * 0.4], [0, -h * 0.7, 1], [2.4, -h * 0.4], [3.6, 4]]), 'rgba(255,200,100,0.6)', 0);
    g.restore();
  }
  g.restore();
  // obsidian shell, cracked open over the star-core
  const shellPts = [];
  const rad = [47, 43, 49, 45.6, 41.4, 47.6, 44, 49.4, 46, 42.6, 48.6, 45, 50, 44.4, 47, 42, 48.4, 45.4, 43];
  rad.forEach((r, i) => { const a = i / rad.length * PI * 2 + 0.1; shellPts.push([cx + C(a) * r, cy + S(a) * r * 0.96, [0, 2, 5, 7, 10, 12, 15, 17].includes(i) ? 1 : 0]); });
  const core = [[cx - 24, cy - 8], [cx - 15, cy - 24, 1], [cx - 7, cy - 17], [cx - 1, cy - 21], [cx + 6, cy - 28, 1], [cx + 13, cy - 16], [cx + 28, cy - 19, 1], [cx + 25, cy - 4], [cx + 30, cy + 11, 1], [cx + 18, cy + 17], [cx + 11, cy + 29, 1], [cx + 3, cy + 21], [cx - 4, cy + 24], [cx - 15, cy + 28, 1], [cx - 19, cy + 15], [cx - 32, cy + 7, 1], [cx - 26, cy + 1]];
  const shell = holed(shellPts, core);
  T(g, shell, '#2a2230', { sd: 7, hd: 3.4, lw: 2.4, light: '#7a6a8c', shade: '#100a12', detail: c => {
    c.fillStyle = alpha('#8a7a9a', 0.35);
    for (const f of [[[cx - 42, cy - 18], [cx - 26, cy - 40], [cx - 14, cy - 30], [cx - 28, cy - 12]], [[cx + 2, cy - 46], [cx + 26, cy - 40], [cx + 16, cy - 30]], [[cx - 46, cy + 10], [cx - 36, cy + 4], [cx - 32, cy + 22]]]) c.fill(poly(f));
    c.fillStyle = alpha('#000000', 0.32);
    for (const f of [[[cx + 32, cy + 12], [cx + 46, cy + 6], [cx + 38, cy + 30]], [[cx - 10, cy + 34], [cx + 12, cy + 38], [cx, cy + 46]], [[cx + 30, cy - 30], [cx + 44, cy - 14], [cx + 34, cy - 12]]]) c.fill(poly(f));
    // ember rim light from the core
    c.strokeStyle = alpha('#ff7a20', 0.55); c.lineWidth = 3; c.stroke(sp(core));
  } });
  // magma veins running out from the rift
  const vein = (pts, w = 1) => { const q = pts.map((p, i) => [p[0], p[1], i > 0 && i < pts.length - 1 ? 1 : 0]); ink(g, q, 4.4 * w, alpha('#ff5a10', 0.5), [1, 0.8, 0.1]); ink(g, q, 1.6 * w, '#ffb040', [1, 0.8, 0.1]); };
  g.save(); g.globalCompositeOperation = 'lighter';
  vein([[cx - 14, cy - 23], [cx - 20, cy - 30], [cx - 18, cy - 36], [cx - 26, cy - 42]]); vein([[cx + 6, cy - 27], [cx + 4, cy - 35], [cx + 10, cy - 42]], 0.9);
  vein([[cx + 27, cy - 18], [cx + 35, cy - 24], [cx + 40, cy - 22]], 0.8); vein([[cx + 29, cy + 12], [cx + 37, cy + 14], [cx + 44, cy + 8]]);
  vein([[cx + 10, cy + 29], [cx + 12, cy + 37], [cx + 8, cy + 44]], 0.9); vein([[cx - 14, cy + 28], [cx - 22, cy + 34], [cx - 30, cy + 34]]); vein([[cx - 31, cy + 6], [cx - 39, cy + 8], [cx - 44, cy + 2]], 0.9);
  g.restore();
  // the core: molten gradient; a stern face emerges from the fire, with eyes of white light
  const cp = sp(core);
  clipIn(g, cp, () => {
    g.fillStyle = rg(g, cx + 1, cy + 2, 0, 32, [[0, '#ffe080'], [0.4, '#ffb030'], [0.75, '#ff7018'], [1, '#c02c08']]); g.fillRect(0, 0, 128, 128);
    g.save(); g.filter = `blur(${1.2 * g.getTransform().a}px)`; // CSS blur ignores the transform: 2.4 px at the atlas scale of 2
    g.fillStyle = alpha('#8a1c04', 0.9);
    g.fill(sp([[cx - 23, cy - 10], [cx - 8, cy - 5], [cx + 1, cy - 9, 1], [cx + 10, cy - 5], [cx + 25, cy - 10], [cx + 22, cy - 2], [cx + 10, cy + 0.4], [cx + 1, cy - 3], [cx - 8, cy + 0.4], [cx - 20, cy - 2]]));
    g.fill(sp([[cx - 17, cy + 4], [cx - 11, cy + 9], [cx - 15, cy + 15]])); g.fill(sp([[cx + 18, cy + 4], [cx + 12, cy + 9], [cx + 16, cy + 15]]));
    g.fill(sp([[cx - 11, cy + 12], [cx - 2, cy + 10], [cx + 1, cy + 11.4, 1], [cx + 4, cy + 10], [cx + 12, cy + 12], [cx + 6, cy + 18], [cx - 5, cy + 18]]));
    g.restore();
  });
  stroke(g, cp, OUT, 2.4);
  g.save(); g.globalCompositeOperation = 'lighter';
  flat(g, sp([[cx - 7, cy + 13.4], [cx, cy + 12.4], [cx + 8, cy + 13.4], [cx + 3, cy + 15.6], [cx - 3, cy + 15.6]]), 'rgba(255,240,200,0.9)', 0);
  for (const [x, y, s] of [[cx - 9.6, cy + 1.8, -1], [cx + 11, cy + 1.8, 1]]) {
    glow(g, x, y, 11, '#fff4d0', 0.7); glow(g, x, y, 4.4, '#ffffff', 0.8);
    flat(g, sp([[x - 6.4 * s, y + 1, 1], [x - 1 * s, y - 2.2], [x + 6.4 * s, y - 1.6, 1], [x + 1.2 * s, y + 2]]), '#ffffff', 0);
  }
  g.restore();
  // rising embers
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 30; i++) { const x = R.range(4, 124), y = R.range(2, 126); if (Math.hypot(x - cx, y - cy) < 46) continue; glow(g, x, y, 3.4, '#ff7a20', 0.6); flat(g, circle(x, y, R.range(0.4, 1)), '#ffd080', 0); }
  g.restore();
}

// ---------------------------------------------------------------- jobs
const IDS = ['warden', 'brannoc', 'seren', 'kaela', 'torvald', 'aerin', 'ysolde', 'scout', 'villager', 'mercenary', 'varkas', 'gorrath', 'maelis', 'heart'];
const DRAW = { warden, brannoc, seren, kaela, torvald, aerin, ysolde, scout, villager, mercenary, varkas, gorrath, maelis, heart };

function frame(fn) {
  return g => {
    g.translate(-64, -64);
    g.fillStyle = 'rgba(0,0,0,0.02)'; g.fillRect(0, 0, 1, 1); g.fillRect(127, 127, 1, 1);
    g.save(); g.beginPath(); g.rect(0, 0, 128, 128); g.clip();
    fn(g);
    g.restore();
  };
}

export function jobs() {
  return IDS.filter(id => DRAW[id]).map(id => ({ name: 'portrait/' + id, w: 128, h: 128, ax: 64, ay: 64, anims: { s: { frames: 1, single: true, draw: frame(DRAW[id]) } } }));
}
