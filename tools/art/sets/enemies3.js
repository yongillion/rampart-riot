// Rampart Riot — Chapter III enemies (original bestiary): the Drowned Crown
// Drowned dead, bone archers, bog beasts and the Ember Crown cult of Lord Varkas Morrow.
import { toon, flat, ellipse, circle, rrect, poly, blob, dark, light, alpha, OUT, glow, line, stroke, rng, capsule } from '../lib/toon.js';
import { humanoid, Pose, basePose, ease, seg } from '../lib/rig.js';

export const scale = 1.5;
const PI = Math.PI, S = Math.sin, C = Math.cos;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const bell = (t, a, b) => S(seg(t, a, b) * PI);          // 0 -> 1 -> 0 over [a,b]

// ---------------- palette ----------------
const TEAL = '#7affd8', TEAL_C = '#eafff9', TEAL_D = '#1d5c52';  // ghost-light
const EMBER = '#ff8a2a', EMBER_H = '#ffd27a', EMBER_D = '#b8401a'; // Ember Crown
const WINE = '#6a1a34';                                            // House Morrow
const DROWN = '#87a08d', DROWN_D = '#617a6a';                      // drowned flesh
const BONE = '#d9cca6', BONE_D = '#a89a74';
const RAG = '#5a4c36', BOG = '#4a3c2a', MUD = '#4b3a28';
const WEED = '#4d6d2b', WEED_L = '#6f8f36', WEED_D = '#34501f';
const IRON = '#5d5a57', RUST = '#8c4f2b', VERD = '#4f9c86', LEATHER = '#5e4630';

// ---------------- small drawing helpers ----------------
// inked line: outline pass then colour pass
function iline(g, pts, col, w = 1.2) { const p = poly(pts, false); stroke(g, p, OUT, w + 1.3); stroke(g, p, col, w); }
function icurve(g, path, col, w = 1.2) { stroke(g, path, OUT, w + 1.3); stroke(g, path, col, w); }
// hanging strand (weed, rag strip, hair) from (x,y), swaying at the tip
function strand(g, x, y, len, sway, col = WEED, w = 1.3) {
  const p = new Path2D(); p.moveTo(x, y); p.quadraticCurveTo(x + sway * 0.25, y + len * 0.6, x + sway, y + len);
  icurve(g, p, col, w);
}
// tapered hanging tatter (filled), for rags/weeds with more body
function tatter(g, x, y, len, wid, sway, col, lw = 1.1) {
  const p = new Path2D();
  p.moveTo(x - wid / 2, y); p.quadraticCurveTo(x - wid * 0.4 + sway * 0.3, y + len * 0.6, x + sway, y + len);
  p.quadraticCurveTo(x + wid * 0.4 + sway * 0.3, y + len * 0.55, x + wid / 2, y); p.closePath();
  toon(g, p, col, { sd: 0.6, hd: 0.3, lw });
}
// chain of links along a polyline
function chain(g, pts, col = '#6e6a66', r = 1.05) {
  const step = r * 1.9; let carry = 0, k = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
    for (let d = carry; d < L; d += step, k++) {
      const x = x0 + (x1 - x0) * d / L, y = y0 + (y1 - y0) * d / L;
      if (k % 2) { const e = ellipse(x, y, r * 1.2, r * 0.75, a); stroke(g, e, OUT, 1.5); stroke(g, e, col, 0.75); }
      else { const q = [[x - C(a) * r, y - S(a) * r], [x + C(a) * r, y + S(a) * r]]; iline(g, q, light(col, 0.08), 0.8); }
      carry = d + step - L;
    }
  }
}
// water drips falling from a point
function drips(g, x, y, t, n = 2, len = 9, seed = 0, col = '#a6d6cf') {
  for (let i = 0; i < n; i++) {
    const u = (t + i / n + seed * 0.37) % 1;
    const yy = y + u * u * len, a = 1 - u * 0.8;
    g.save(); g.globalAlpha *= a;
    flat(g, blob([[x, yy - 1.6], [x + 0.75, yy + 0.2], [x, yy + 0.9], [x - 0.75, yy + 0.2]], 0.8), col, 0.6, alpha(OUT, 0.8));
    g.restore();
  }
}
// two-bone IK in rig convention (0 = down, +PI/2 = forward): returns [upperAngle, bend]
function ik(s, tg, l1, l2, flip = 1) {
  const dx = tg[0] - s[0], dy = tg[1] - s[1];
  const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const ua = Math.atan2(dx, dy) + flip * a;
  const el = [s[0] + S(ua) * l1, s[1] + C(ua) * l1];
  return [ua, Math.atan2(tg[0] - el[0], tg[1] - el[1]) - ua];
}
// item in hand: drawn pointing up (-y), perpendicular to the forearm (same convention as the stock rig)
function inHand(g, A, extra, fn) { g.save(); g.translate(A.hd[0], A.hd[1]); g.rotate(-A.fa + PI / 2 + extra); fn(g); g.restore(); }

// Parts falling apart: each part moves from its start frame [x,y,angle] to a resting frame on the ground.
function collapse(g, parts, t, t0, t1) {
  for (const pt of parts) {
    const u = seg(t, t0 + (pt.d || 0), t1 + (pt.d || 0));
    let ea = pt.e[2];
    if (!pt.spin) { while (ea - pt.s[2] > PI) ea -= 2 * PI; while (pt.s[2] - ea > PI) ea += 2 * PI; }
    const x = lerp(pt.s[0], pt.e[0], ease(u)), y = lerp(pt.s[1], pt.e[1], u * u) - S(seg(u, 0.75, 1) * PI) * (pt.b || 0), a = lerp(pt.s[2], ea, ease(u));
    g.save(); g.translate(x, y); g.rotate(a); pt.draw(g, u); g.restore();
  }
}
const frameOf = (a, b) => [a[0], a[1], Math.atan2(b[1] - a[1], b[0] - a[0])];
const sub = (J, local, extra = 0) => [J.hip[0] + C(J.lean) * local[0] - S(J.lean) * local[1], J.hip[1] + S(J.lean) * local[0] + C(J.lean) * local[1], J.lean + extra];

// ---------------- layered humanoid renderer ----------------
// Uses the stock rig's joints/poses, but draws parts itself so robes, rags and bones can sit between layers.
function torsoPath(c) {
  const w = c.torsoW, h = c.torsoH, bel = c.belly || 0, tw = w * (c.chest || 1);
  return blob([[-w * 0.48, 0.5], [-w * 0.55 - bel * 0.2, -h * 0.35], [-tw * 0.55, -h * 0.78], [-tw * 0.32, -h - 1.2],
    [tw * 0.3, -h - 1.4], [tw * 0.58 + bel * 0.1, -h * 0.75], [w * 0.62 + bel, -h * 0.35], [w * 0.5 + bel * 0.4, 0.8]], 0.75);
}
function inTorso(g, J, fn) { g.save(); g.translate(J.hip[0], J.hip[1]); g.rotate(J.lean); fn(g); g.restore(); }
function inHead(g, J, p, fn) { g.save(); g.translate(J.head[0], J.head[1]); g.rotate(J.lean * 0.6 + (p.tilt || 0)); fn(g); g.restore(); }
function stdArm(g, c, A, far) {
  const sl = far ? dark(c.sleeve, 0.08) : c.sleeve, fo = c.foreColor || c.sleeve, gl = c.glove || c.skin;
  const r = c.limbR * (c.armThick || 0.95);
  toon(g, capsule(A.s[0], A.s[1], A.el[0], A.el[1], r * 1.1, r * 0.95), sl, { sd: 1.1, hd: 0.6, lw: c.lw });
  toon(g, capsule(A.el[0], A.el[1], A.hd[0], A.hd[1], r * 0.95, r * 0.8), far ? dark(fo, 0.08) : fo, { sd: 1.1, hd: 0.6, lw: c.lw });
  toon(g, circle(A.hd[0], A.hd[1], r * 0.95), far ? dark(gl, 0.08) : gl, { sd: 0.8, hd: 0.5, lw: c.lw });
}
function stdLeg(g, c, L, far) {
  const r = c.limbR * (c.legThick || 1), k = c.h / 44;
  const pa = far ? dark(c.pants, 0.08) : c.pants, sh = c.shinColor || c.boots, bo = far ? dark(c.boots, 0.08) : c.boots;
  toon(g, capsule(L.h[0], L.h[1], L.kn[0], L.kn[1], r * 1.15, r), pa, { sd: 1.2, hd: 0.6, lw: c.lw });
  toon(g, capsule(L.kn[0], L.kn[1], L.ft[0], L.ft[1], r, r * 0.9), far ? dark(sh, 0.08) : sh, { sd: 1.2, hd: 0.6, lw: c.lw });
  const fl = (c.footLen || 4.4) * k;
  toon(g, ellipse(L.ft[0] + fl * 0.35, L.ft[1] - 1.1 * k, fl * 0.75, 2.2 * k), bo, { sd: 0.8, hd: 0.5, lw: c.lw });
}
function stdTorso(g, c, J, p) {
  inTorso(g, J, q => toon(q, torsoPath(c), c.torsoColor, { sd: 2.2, hd: 1.2, lw: c.lw, detail: c.chestDetail ? d => c.chestDetail(d, c.torsoW, c.torsoH, p) : undefined }));
}
function fig(g, rig, p, L) {
  const c = rig.cfg, J = rig.joints(p);
  g.save();
  if (p.alpha !== undefined && p.alpha < 1) g.globalAlpha *= Math.max(0, p.alpha);
  if (p.rot) g.rotate(p.rot);
  if (L.back) L.back(g, J, p, c);
  (L.farArm || stdArm)(g, c, J.fa, true, p, J);
  if (L.farHand) L.farHand(g, J, p, c);
  (L.farLeg || stdLeg)(g, c, J.fl, true, p, J);
  (L.nearLeg || stdLeg)(g, c, J.nl, false, p, J);
  if (L.hips) L.hips(g, J, p, c);
  (L.torso || stdTorso)(g, c, J, p);
  if (L.overTorso) L.overTorso(g, J, p, c);
  if (L.head) inHead(g, J, p, q => L.head(q, c.headR, p, c, J));
  if (L.preNear) L.preNear(g, J, p, c);
  (L.nearArm || stdArm)(g, c, J.na, false, p, J);
  if (L.nearHand) L.nearHand(g, J, p, c);
  if (L.front) L.front(g, J, p, c);
  g.restore();
  return J;
}
// animation block helpers
const A = (frames, fps, draw, o = {}) => Object.assign({ frames, fps, draw }, o);
const once = (frames, fps, draw, o = {}) => Object.assign({ frames, fps, loop: false, draw }, o);

// =====================================================================================
// THRALL — bloated drowned corpse, weeds & chains, empty teal eyes, shambling gait
// =====================================================================================
const thrallRig = humanoid({ h: 40, headR: 6.9, torsoH: 14, torsoW: 13, belly: 5, chest: 0.94, thigh: 6.9, shin: 6.5, upper: 8, fore: 7.6, limbR: 3,
  legThick: 1.02, armThick: 1.05, footLen: 3.8, lw: 1.5, skin: DROWN, sleeve: DROWN, glove: DROWN, pants: '#3f3b2f', shinColor: DROWN, boots: DROWN_D, torsoColor: DROWN });
thrallRig.cfg.chestDetail = (g, w, h, p) => {
  // swollen belly sheen, veins and navel
  g.fillStyle = alpha('#e2f6e4', 0.22); g.beginPath(); g.ellipse(w * 0.5, -h * 0.33, w * 0.3, h * 0.2, -0.35, 0, PI * 2); g.fill();
  g.strokeStyle = alpha('#2e4a40', 0.45); g.lineWidth = 0.6;
  for (const [x0, y0, x1, y1] of [[w * 0.3, -h * 0.55, w * 0.62, -h * 0.4], [w * 0.2, -h * 0.25, w * 0.5, -h * 0.12]]) { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, y0 - 1.5, x1, y1); g.stroke(); }
  flat(g, ellipse(w * 0.78, -h * 0.28, 0.7, 0.9), '#2e4a40', 0);
  // mottled skin
  g.fillStyle = alpha('#2e4a40', 0.22);
  for (const [x, y, rx, ry] of [[-w * 0.1, -h * 0.25, 2.6, 2], [w * 0.15, -h * 0.5, 1.6, 1.2]]) { g.beginPath(); g.ellipse(x, y, rx, ry, 0.4, 0, PI * 2); g.fill(); }
  // torn shirt hanging open: covers back and shoulders, ragged edges
  const R = rng(5), hem = [];
  for (let i = 0; i <= 6; i++) { const x = -w * 0.7 + i * w * 0.17; hem.push([x, -h * (0.18 + (i % 2 ? 0.1 : -0.02) + R() * 0.06)]); }
  const sh = poly([[-w, -h - 3], [w * 0.75, -h - 3], [w * 0.52, -h * 0.78], [w * 0.36, -h * 0.62], [w * 0.38, -h * 0.4], [w * 0.22, -h * 0.3], ...hem.reverse()]);
  toon(g, sh, RAG, { sd: 1.4, hd: 0.6, lw: 1.1 });
  // rusted chain slung across the chest
  chain(g, [[-w * 0.45, -h * 1.02], [w * 0.15, -h * 0.62], [w * 0.8, -h * 0.2]], '#6b6560', 1.0);
};
function thrallHead(g, r, p) {
  const sw = S((p.t || 0) * PI * 2) * 0.8;
  // lank, weed-tangled hair hanging behind the head
  for (const [x, y, l, s, c, w] of [[-r * 0.95, -r * 0.2, r * 1.5, -r * 0.3 + sw, WEED_D, 1.7], [-r * 0.6, -r * 0.75, r * 1.9, -r * 0.5 + sw, '#2c3a22', 1.7], [-r * 0.2, -r * 0.95, r * 1.6, -r * 0.75 + sw, WEED, 1.4]]) strand(g, x, y, l, s, c, w);
  // puffy, jowly head
  const hd = blob([[-r, 0], [-r * 0.72, -r * 0.82], [r * 0.15, -r * 1.0], [r * 0.88, -r * 0.55], [r * 1.05, r * 0.15], [r * 0.82, r * 0.82], [r * 0.1, r * 1.08], [-r * 0.68, r * 0.72]], 0.8);
  toon(g, hd, DROWN, { sd: 1.7, hd: 1, lw: 1.5, detail: q => {
    q.fillStyle = alpha('#2e4a40', 0.28); q.beginPath(); q.ellipse(-r * 0.45, r * 0.45, r * 0.32, r * 0.24, 0.3, 0, PI * 2); q.fill();
    // wet hair plastered over the scalp
    q.fillStyle = '#2c3a22';
    q.beginPath(); q.moveTo(-r * 1.1, r * 0.2); q.quadraticCurveTo(-r * 0.9, -r * 0.9, r * 0.35, -r * 1.1); q.quadraticCurveTo(-r * 0.1, -r * 0.75, -r * 0.35, -r * 0.45); q.quadraticCurveTo(-r * 0.5, -r * 0.1, -r * 0.62, r * 0.25); q.closePath(); q.fill();
    q.fillStyle = alpha('#ffffff', 0.18); q.beginPath(); q.ellipse(r * 0.25, -r * 0.62, r * 0.32, r * 0.16, -0.3, 0, PI * 2); q.fill();
  } });
  // sunken sockets with cold eye-light
  flat(g, ellipse(r * 0.42, -r * 0.1, r * 0.28, r * 0.25), '#16241f', 0);
  flat(g, ellipse(r * 0.85, -r * 0.04, r * 0.16, r * 0.22), '#16241f', 0);
  if (!p.eyesClosed) {
    glow(g, r * 0.5, -r * 0.1, r * 1.2, TEAL, 0.6);
    flat(g, circle(r * 0.5, -r * 0.1, r * 0.12), TEAL_C, 0);
    flat(g, circle(r * 0.88, -r * 0.04, r * 0.08), TEAL_C, 0);
  }
  // slack jaw
  flat(g, ellipse(r * 0.68, r * 0.55, r * 0.2, r * 0.14 + (p.mouth || 0) * r * 0.14, -0.2), '#1a1210', 0.9);
}
const THRALL = {
  back: (g, J, p) => { const sw = S((p.t || 0) * PI * 2) * 0.8; tatter(g, J.neck[0] - 4.5, J.neck[1] + 2, 10, 3, -2 + sw, WEED_D, 1.1); },
  hips: (g, J, p) => { // rope belt with rag strips over the trousers
    inTorso(g, J, q => {
      const sw = S((p.t || 0) * PI * 2) * 0.6;
      for (const [x, l, c] of [[-5.5, 6.5, RAG], [-1.5, 5, dark(RAG, 0.06)], [2.5, 6, RAG]]) tatter(q, x, -1, l, 3.2, -0.8 + sw, c, 1.1);
      toon(q, rrect(-7.2, -2.6, 16.5, 2.6, 1.2), '#6b5a3a', { sd: 0.5, hd: 0.3, lw: 1.1 });
    });
  },
  head: thrallHead,
  preNear: (g, J, p) => { // weeds draped over the near shoulder (behind the arm)
    const sw = S((p.t || 0) * PI * 2) * 0.8, [sx, sy] = J.na.s;
    strand(g, sx - 2.5, sy - 2, 6.5, -1.2 + sw, WEED_D, 1.2);
    strand(g, sx - 0.5, sy - 2.5, 8, -0.5 + sw, WEED, 1.2);
    toon(g, ellipse(sx - 1, sy - 2.2, 3, 1.5, -0.25), WEED, { sd: 0.4, hd: 0.3, lw: 1 });
  },
  nearHand: (g, J, p) => { // cracked nails, iron manacle and a dangling chain
    const A = J.na, sw = S((p.t || 0) * PI * 2 + 0.6) * 2.2 + (p.chainKick || 0);
    inHand(g, A, 0, q => {
      for (const k of [-1, 0, 1]) iline(q, [[1.6, k * 1.1], [3.3, k * 1.35]], '#cfc6a0', 0.6);
      toon(q, rrect(-4.2, -2.8, 2.8, 5.6, 1), '#4e4b48', { sd: 0.5, hd: 0.4, lw: 1.1 });
    });
    const x = A.hd[0] - S(A.fa) * 2.8, y = A.hd[1] - C(A.fa) * 2.8 + 1.5;
    chain(g, [[x, y], [x + sw * 0.4, y + 3.5], [x + sw, y + 7.5]], '#6b6560', 0.95);
  },
  front: (g, J, p) => {
    const t = p.t || 0;
    if (!p.noDrips) { drips(g, J.na.hd[0] + 1, J.na.hd[1] + 2, t, 1, 10, 0); drips(g, J.fa.hd[0], J.fa.hd[1] + 2.5, t, 1, 10, 0.5); drips(g, J.head[0] + 5, J.head[1] + 6, t, 1, 7, 0.2); }
  },
};
const TP = {
  walk(t) {
    const p = basePose(), ph = t * PI * 2, s = S(ph), c = C(ph);
    p.nl = [s * 0.42, Math.max(0, -c) * 0.75 + 0.12];
    p.fl = [-s * 0.3, Math.max(0, c) * 0.3 + 0.1];            // dragging foot
    p.bob = -Math.abs(s) * 1.1 + 0.5 - Math.max(0, s) * 0.5;    // limp
    p.lean = 0.3 + s * 0.04; p.tilt = 0.2 + s * 0.06;
    p.na = [0.18 + s * 0.24, 0.18 + Math.max(0, s) * 0.2];      // dangling arm with chain
    p.fa = [1.05 - s * 0.12, 0.38];                            // reaching arm
    p.t = t; return p;
  },
  idle(t) {
    const p = basePose(), s = S(t * PI * 2);
    p.bob = s * 0.4; p.lean = 0.27 + s * 0.03; p.tilt = 0.22 + s * 0.08;
    p.na = [0.12 + s * 0.08, 0.2]; p.fa = [0.9 + s * 0.06, 0.4];
    p.nl = [0.08, 0.06]; p.fl = [-0.12, 0.08]; p.t = t; return p;
  },
  attack(t) { // clumsy overhead claw / chain lash
    const p = Pose.melee(t);
    const w = ease(seg(t, 0, 0.4)), s = ease(seg(t, 0.4, 0.58)), r = ease(seg(t, 0.62, 1));
    p.fa = [lerp(1.0, 1.5, w) * (1 - s * 0.4) * (1 - r) + 1.0 * r, lerp(0.4, 0.9, w)];
    p.lean = 0.15 + lerp(0, -0.12, w) + s * 0.3 * (1 - r); p.tilt = 0.12;
    p.mouth = bell(t, 0.3, 0.7); p.chainKick = -3 * w * (1 - s) + 4 * s * (1 - r);
    p.t = t * 0.5; return p;
  },
  death(t) { // knees buckle, topples face-down
    const p = basePose();
    const k = ease(seg(t, 0, 0.35)), f = seg(t, 0.28, 0.8), fe = f * f, st = seg(t, 0.8, 0.9);
    p.nl = [lerp(lerp(0.05, 0.5, k), 0.45, fe), lerp(0.05, 2.0, k) * (1 - fe) + 0.1 * fe];
    p.fl = [lerp(lerp(-0.05, 0.3, k), 0.3, fe), lerp(0.05, 1.8, k) * (1 - fe) + 0.05 * fe];
    p.dy = k * 6 * (1 - fe) + fe * 8;
    p.rot = fe * PI / 2 * 0.97;
    p.dx = -fe * 10;
    p.lean = 0.25 + k * 0.35 * (1 - fe); p.tilt = 0.2 + fe * 0.3;
    p.na = [lerp(lerp(0.2, 1.2, k), 2.5, fe), 0.3]; p.fa = [lerp(lerp(1.0, 1.6, k), 0.4, fe), 0.25];
    p.dy += S(st * PI) * -1.2;
    p.eyesClosed = t > 0.75; p.mouth = 0.6; p.noDrips = t > 0.3; p.t = 0.3;
    return p;
  },
};

// =====================================================================================
// BONE ARCHER — skeleton bowman: rusted sallet, rotted leather, an old cracked bow
// =====================================================================================
const archRig = humanoid({ h: 40, headR: 6.8, torsoH: 12, torsoW: 8.6, thigh: 7.6, shin: 7.2, upper: 7, fore: 6.6, limbR: 1.7, lw: 1.4 });
const SALLET = '#6f5f4c';
// bone along +x from 0 to L in local coords, with knobby joint ends
function boneL(g, L, r, col = BONE, kA = 1.2, kB = 0) {
  toon(g, capsule(0, 0, L, 0, r * 0.72, r * 0.62), col, { sd: 0.6, hd: 0.4, lw: 1.3 });
  if (kA) toon(g, ellipse(0, 0, r * kA, r * kA * 0.88), col, { sd: 0.4, hd: 0.3, lw: 1.2 });
  if (kB) toon(g, ellipse(L, 0, r * kB, r * kB * 0.88), col, { sd: 0.4, hd: 0.3, lw: 1.2 });
}
function boneSeg(g, a, b, r, col, kA, kB) { g.save(); g.translate(a[0], a[1]); g.rotate(Math.atan2(b[1] - a[1], b[0] - a[0])); boneL(g, Math.hypot(b[0] - a[0], b[1] - a[1]), r, col, kA, kB); g.restore(); }
function boneHand(g, x, y, a, col) { // a = direction of fingers
  for (const k of [-0.5, 0, 0.5]) iline(g, [[x, y], [x + C(a + k) * 2.6, y + S(a + k) * 2.6]], col, 0.7);
  toon(g, ellipse(x, y, 1.5, 1.3, a), col, { sd: 0.3, hd: 0.2, lw: 1.1 });
}
function boneFoot(g, x, y, col) { toon(g, blob([[x - 1.4, y - 1.8], [x + 3.4, y - 1.0], [x + 4.4, y + 0.1], [x - 1.8, y + 0.2]], 0.5), col, { sd: 0.4, hd: 0.3, lw: 1.2 }); }
function boneArm(g, c, A, far) {
  const col = far ? dark(BONE, 0.12) : BONE;
  boneSeg(g, A.s, A.el, 1.6, col, 1.15, 0);
  boneSeg(g, A.el, A.hd, 1.35, col, 1.2, 0);
  boneHand(g, A.hd[0], A.hd[1], Math.atan2(C(A.fa), S(A.fa)), col);
  if (far) inHand(g, A, 0, q => toon(q, rrect(-4.6, -1.9, 3.8, 3.8, 0.8), dark(LEATHER, 0.1), { sd: 0.4, hd: 0.3, lw: 1 })); // bracer
}
function boneLeg(g, c, L, far) {
  const col = far ? dark(BONE, 0.12) : BONE;
  boneSeg(g, L.h, L.kn, 1.8, col, 1.0, 0);
  boneSeg(g, L.kn, L.ft, 1.55, col, 1.15, 0);
  boneFoot(g, L.ft[0], L.ft[1], col);
}
// ribcage + spine in torso-local coords
function ribcage(g, w, h, col = BONE) {
  for (let i = 0; i < 4; i++) toon(g, rrect(-w * 0.26, -1.6 - i * 1.55, 2.3, 1.5, 0.5), dark(col, 0.06), { sd: 0.2, hd: 0.2, lw: 1 });
  const cage = blob([[-w * 0.46, -h * 0.36], [-w * 0.56, -h * 0.74], [-w * 0.34, -h - 0.8], [w * 0.34, -h - 0.9], [w * 0.62, -h * 0.68], [w * 0.5, -h * 0.38], [w * 0.05, -h * 0.28]], 0.7);
  toon(g, cage, col, { sd: 1.3, hd: 0.8, lw: 1.3, detail: q => {
    q.strokeStyle = '#2a2219'; q.lineWidth = 1.05; q.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const y = -h * 0.88 + i * h * 0.17; q.beginPath(); q.moveTo(-w * 0.32, y - 0.4); q.quadraticCurveTo(w * 0.15, y - 1.4, w * 0.4, y + 1.1); q.stroke(); }
    q.fillStyle = light(col, 0.06); q.fillRect(w * 0.3, -h, 1.4, h * 0.62);   // sternum
  } });
}
function pelvis(g, w, col = BONE) { toon(g, blob([[-w * 0.45, -1.5], [w * 0.4, -2], [w * 0.5, 1.2], [0, 2.6], [-w * 0.5, 1]], 0.7), col, { sd: 0.6, hd: 0.4, lw: 1.2 }); }
function kilt(g, w, t) { // rotted leather flaps
  const sw = S(t * PI * 2) * 0.5;
  toon(g, poly([[-w * 0.62, -1.2], [-w * 0.02, -1.2], [-w * 0.1 + sw, 5.5], [-w * 0.28 + sw, 4.2], [-w * 0.42 + sw, 6.6], [-w * 0.66 + sw, 4.8]]), dark(LEATHER, 0.08), { sd: 0.6, hd: 0.3, lw: 1.1 });
  toon(g, poly([[w * 0.05, -1.2], [w * 0.62, -1.2], [w * 0.7 + sw, 4.4], [w * 0.5 + sw, 3.2], [w * 0.36 + sw, 5.4], [w * 0.12 + sw, 4]]), LEATHER, { sd: 0.6, hd: 0.3, lw: 1.1 });
  toon(g, rrect(-w * 0.66, -2.4, w * 1.36, 2.1, 0.8), dark(LEATHER, 0.18), { sd: 0.3, hd: 0.2, lw: 1 });
  toon(g, rrect(w * 0.18, -2.7, 2.4, 2.7, 0.5), RUST, { sd: 0.2, hd: 0.2, lw: 0.8 });
}
// skull (head-local, r = head radius, facing right); jaw opens with p.jaw
function skull(g, r, p, col = BONE) {
  const jaw = (p.jaw || 0) * 0.4;
  g.save(); g.translate(-r * 0.15, r * 0.42); g.rotate(jaw);   // mandible
  toon(g, blob([[-r * 0.05, -r * 0.08], [r * 0.95, r * 0.08], [r * 0.92, r * 0.3], [r * 0.25, r * 0.46], [-r * 0.12, r * 0.28]], 0.5), dark(col, 0.05), { sd: 0.5, hd: 0.3, lw: 1.2 });
  for (let i = 0; i < 3; i++) line(g, [[r * (0.5 + i * 0.15), r * 0.07], [r * (0.5 + i * 0.15), r * 0.2]], '#2a2219', 0.55);
  g.restore();
  const head = blob([[-r * 0.95, -r * 0.1], [-r * 0.68, -r * 0.82], [r * 0.12, -r * 1.02], [r * 0.82, -r * 0.62], [r * 1.02, -r * 0.22], [r * 0.86, r * 0.02],
    [r * 1.0, r * 0.3], [r * 0.92, r * 0.5], [r * 0.25, r * 0.52], [-r * 0.15, r * 0.42], [-r * 0.78, r * 0.3]], 0.6);
  toon(g, head, col, { sd: 1.4, hd: 0.9, lw: 1.35 });
  // socket under the brow, nasal cavity, cheekbone, upper teeth
  flat(g, blob([[r * 0.3, -r * 0.3], [r * 0.72, -r * 0.33], [r * 0.76, -r * 0.02], [r * 0.5, r * 0.1], [r * 0.3, -r * 0.05]], 0.6), '#1d1812', 0);
  flat(g, poly([[r * 0.93, r * 0.1], [r * 1.0, r * 0.3], [r * 0.82, r * 0.3]]), '#1d1812', 0);
  line(g, [[r * 0.2, r * 0.18], [r * 0.55, r * 0.26], [r * 0.75, r * 0.2]], alpha('#2a2219', 0.6), 0.6);
  for (let i = 0; i < 4; i++) line(g, [[r * (0.38 + i * 0.15), r * 0.4], [r * (0.38 + i * 0.15), r * 0.54]], '#2a2219', 0.55);
  if (!p.eyesClosed) { glow(g, r * 0.53, -r * 0.12, r * 0.85, TEAL, 0.7); flat(g, circle(r * 0.54, -r * 0.12, r * 0.1), TEAL_C, 0); }
}
function sallet(g, r) { // rusted long-tailed helm
  const h = blob([[-r * 1.05, -r * 0.05], [-r * 1.0, -r * 0.7], [-r * 0.35, -r * 1.22], [r * 0.55, -r * 1.12], [r * 1.02, -r * 0.55], [r * 1.12, -r * 0.3], [r * 0.4, -r * 0.42], [-r * 0.4, -r * 0.28], [-r * 1.0, r * 0.25], [-r * 1.55, r * 0.55], [-r * 1.5, r * 0.15]], 0.55);
  toon(g, h, SALLET, { sd: 1.4, hd: 0.9, lw: 1.35, detail: q => {
    q.fillStyle = alpha(VERD, 0.75); q.beginPath(); q.ellipse(-r * 0.2, -r * 0.95, r * 0.35, r * 0.16, -0.2, 0, PI * 2); q.fill();
    q.fillStyle = alpha(RUST, 0.8); q.beginPath(); q.ellipse(r * 0.6, -r * 0.6, r * 0.22, r * 0.14, 0.5, 0, PI * 2); q.fill();
    q.strokeStyle = alpha('#000', 0.3); q.lineWidth = 0.8; q.beginPath(); q.moveTo(-r * 0.95, -r * 0.35); q.quadraticCurveTo(0, -r * 0.55, r * 1.0, -r * 0.42); q.stroke();
  } });
  for (const [x, y] of [[-r * 0.6, -r * 0.5], [r * 0.15, -r * 0.62]]) flat(g, circle(x, y, 0.55), '#d8c8a0', 0.5);
}
// old cracked bow (bow-local: grip at 0,0, vertical); pull = string draw 0..1
function oldBow(g, pull = 0, nocked = false, twang = 0) {
  const h = 15.5, bend = 4.2 + pull * 1.6, px = -pull * 10 - 0.6;
  const bow = new Path2D(); bow.moveTo(-1.2, -h); bow.quadraticCurveTo(bend * 0.6, -h * 0.75, bend * 0.55, -h * 0.25); bow.quadraticCurveTo(bend * 0.75, 0, bend * 0.55, h * 0.25); bow.quadraticCurveTo(bend * 0.6, h * 0.75, -1.2, h);
  stroke(g, bow, OUT, 3.6); stroke(g, bow, '#5a4030', 2.1);
  for (const y of [-h * 0.5, h * 0.42]) iline(g, [[bend * 0.42 - 1, y - 0.4], [bend * 0.62 + 1, y + 0.4]], '#a89a74', 0.9);  // bindings over cracks
  toon(g, rrect(bend * 0.4 - 1.3, -2, 2.6, 4, 0.8), '#3a2a1e', { sd: 0, hd: 0, lw: 0.9 });
  if (twang) { const q = new Path2D(); q.moveTo(-1.2, -h); q.quadraticCurveTo(1.8, 0, -1.2, h); stroke(g, q, '#d8d0b8', 0.6);
    g.save(); g.globalCompositeOperation = 'lighter'; stroke(g, poly([[6, 0], [24, 0]], false), alpha('#fff4d8', 0.5), 1.4); stroke(g, poly([[10, -2.5], [20, -2.5]], false), alpha('#fff4d8', 0.25), 0.8); g.restore(); }
  else line(g, [[-1.2, -h], [px, 0], [-1.2, h]], '#d8d0b8', 0.6);
  if (nocked) arrowAt(g, px, 0);
}
function arrowAt(g, x, y, len = 17) {
  iline(g, [[x, y], [x + len - 2.5, y]], '#7a5a38', 0.9);
  toon(g, poly([[x + len - 3, y - 1.6], [x + len + 0.8, y], [x + len - 3, y + 1.6]]), '#8a8a86', { sd: 0, hd: 0, lw: 0.8 });
  for (const sy of [-1, 1]) toon(g, poly([[x + 0.3, y], [x - 1.2, y + sy * 2.2], [x + 3.4, y + sy * 0.5]]), '#cdbf9c', { sd: 0, hd: 0, lw: 0.7 });
}
function quiver(g, n = 3) {
  for (let i = 0; i < n; i++) { iline(g, [[-1 + i * 1.3, -6.5], [-1.4 + i * 1.6, -10.5]], '#7a5a38', 0.7); toon(g, poly([[-1.4 + i * 1.6, -10.5], [-2.6 + i * 1.6, -12.8], [-0.4 + i * 1.6, -12.4]]), '#cdbf9c', { sd: 0, hd: 0, lw: 0.6 }); }
  toon(g, rrect(-2.8, -7, 5.6, 13, 1.8), LEATHER, { sd: 0.8, hd: 0.4, lw: 1.1, detail: q => { q.fillStyle = dark(LEATHER, 0.15); q.fillRect(-3, -4.5, 6, 1.4); q.fillRect(-3, 2.5, 6, 1.4); } });
}
const ARCHER = {
  back: (g, J, p) => {
    inTorso(g, J, q => { // tattered cloak scrap + quiver
      const sw = S((p.t || 0) * PI * 2) * 0.7;
      toon(q, poly([[-3.6, -12.6], [1, -12.6], [-1 + sw, -4], [-2.2 + sw, -5.4], [-3.4 + sw, -2.2], [-4.6 + sw, -4.6], [-6 + sw, -3]]), '#3f3a2e', { sd: 0.8, hd: 0.3, lw: 1.1 });
      q.save(); q.translate(-5.2, -8); q.rotate(-0.45); quiver(q); q.restore();
    });
  },
  farArm: (g, c, A) => boneArm(g, c, A, true),
  farLeg: (g, c, L) => boneLeg(g, c, L, true),
  nearLeg: (g, c, L) => boneLeg(g, c, L, false),
  hips: (g, J, p, c) => inTorso(g, J, q => { pelvis(q, c.torsoW); kilt(q, c.torsoW, p.t || 0); }),
  torso: (g, c, J, p) => inTorso(g, J, q => {
    ribcage(q, c.torsoW, c.torsoH);
    // rotted strap across the chest (quiver strap)
    toon(q, poly([[-c.torsoW * 0.5, -c.torsoH - 0.5], [-c.torsoW * 0.1, -c.torsoH - 0.8], [c.torsoW * 0.62, -2.5], [c.torsoW * 0.32, -2]]), LEATHER, { sd: 0.4, hd: 0.3, lw: 1 });
    toon(q, ellipse(-c.torsoW * 0.15, -c.torsoH - 0.2, 4.2, 2.2, -0.15), dark(BONE, 0.04), { sd: 0.5, hd: 0.4, lw: 1.1 });   // shoulder girdle
  }),
  overTorso: (g, J, p) => { // the bow in the far hand, arrow nocked while drawing
    const h = J.fa.hd;
    g.save(); g.translate(h[0], h[1]); g.rotate(p.bowTilt ?? 0.08); oldBow(g, p.pull || 0, !!p.nocked, p.twang || 0); g.restore();
  },
  head: (g, r, p) => { skull(g, r, p); sallet(g, r); },
  nearArm: (g, c, A) => boneArm(g, c, A, false),
  nearHand: (g, J, p) => {
    if (p.holdArrow !== undefined) { g.save(); g.translate(J.na.hd[0], J.na.hd[1]); g.rotate(p.holdArrow); arrowAt(g, -7, 0, 16); g.restore(); }
  },
};
// draw hand placed on the nocked string (IK), bow arm extended
function archerAim(p, pull, tilt = 0.06) {
  const J = archRig.joints(p), c = archRig.cfg, h = J.fa.hd;
  const px = -pull * 10 - 0.6;
  const nock = [h[0] + C(tilt) * px, h[1] + S(tilt) * px];
  p.na = ik(J.na.s, [nock[0] - 0.8, nock[1] + 0.6], c.upper, c.fore, 1);
  p.pull = pull; p.bowTilt = tilt; p.nocked = true;
  return p;
}
function reachTo(p, tgt, flip = 1) { const J = archRig.joints(p), c = archRig.cfg; p.na = ik(J.na.s, tgt, c.upper, c.fore, flip); return p; }
const BP = {
  walk(t) { const p = Pose.walk(t, { stride: 0.5, arm: 0.35, lean: 0.12, bobAmp: 1.4 }); p.fa = [0.35 + S(t * PI * 2) * 0.18, 0.5]; p.bowTilt = -0.15; p.t = t; return p; },
  ready(t = 0) { // bow lowered, arrow loosely nocked
    const p = basePose(), b = S(t * PI * 2);
    p.bob = b * 0.4; p.nl = [0.2, 0.1]; p.fl = [-0.18, 0.08]; p.lean = 0.02;
    p.fa = [0.85 + b * 0.03, 0.45]; p.jaw = 0.15 + b * 0.15; p.t = t;
    return archerAim(p, 0.12, 0.42);
  },
  buckle(t) { // struck: knees give, head snaps back
    const p = BP.ready(0), k = ease(seg(t, 0, 0.3));
    p.nl = [lerp(0.2, 0.6, k), lerp(0.1, 1.3, k)]; p.fl = [lerp(-0.18, 0.4, k), lerp(0.08, 1.2, k)];
    p.dy = k * 3.2; p.lean = lerp(0.02, -0.12, k); p.tilt = lerp(0, -0.35, k);
    p.na = [lerp(p.na[0], -0.2, k), lerp(p.na[1], 0.5, k)]; p.fa = [lerp(0.85, 0.35, k), 0.5]; p.bowTilt = lerp(0.42, 0.8, k);
    p.nocked = false; p.jaw = k; p.t = 0.3;
    return p;
  },
  death(g, t) { // collapses into a pile of bones; skull rolls forward, helm tumbles off
    if (t < 0.3) return fig(g, archRig, BP.buckle(t), ARCHER);
    const p = BP.buckle(0.3), J = archRig.joints(p), c = archRig.cfg, w = c.torsoW, h = c.torsoH;
    const bone = (A, B, r, kA, far) => { const L = Math.hypot(B[0] - A[0], B[1] - A[1]); return gg => boneL(gg, L, r, far ? dark(BONE, 0.12) : BONE, kA, 0); };
    const headF = [J.head[0], J.head[1], J.lean * 0.6 + p.tilt];
    const parts = [
      { s: [J.fa.hd[0], J.fa.hd[1], p.bowTilt], e: [2, -4.2, PI / 2 + 0.22], draw: gg => oldBow(gg, 0) },
      { s: sub(J, [-5.2, -8], -0.45), e: [-13, -3, -1.25], draw: gg => quiver(gg, 2) },
      { s: frameOf(J.fa.s, J.fa.el), e: [-9, -1.4, 0.25], draw: bone(J.fa.s, J.fa.el, 1.6, 1.15, true) },
      { s: frameOf(J.fa.el, J.fa.hd), e: [5, -1.3, 2.9], draw: bone(J.fa.el, J.fa.hd, 1.35, 1.2, true) },
      { s: frameOf(J.fl.h, J.fl.kn), e: [-12, -1.5, -0.12], draw: bone(J.fl.h, J.fl.kn, 1.8, 1.0, true) },
      { s: frameOf(J.fl.kn, J.fl.ft), e: [-2, -1.6, 2.95], draw: bone(J.fl.kn, J.fl.ft, 1.55, 1.15, true) },
      { s: sub(J, [0, 0]), e: [-6, -3.6, -0.35], draw: gg => { pelvis(gg, w); kilt(gg, w, 0.3); } },
      { s: frameOf(J.nl.h, J.nl.kn), e: [-15, -1.8, 0.3], draw: bone(J.nl.h, J.nl.kn, 1.8, 1.0) },
      { s: frameOf(J.nl.kn, J.nl.ft), e: [-6, -1.5, -0.2], draw: bone(J.nl.kn, J.nl.ft, 1.55, 1.15) },
      { s: sub(J, [0, 0]), e: [8.4, -5.6, -PI / 2 + 0.08], d: 0.03, draw: gg => ribcage(gg, w, h) },
      { s: frameOf(J.na.s, J.na.el), e: [1, -1.5, 3.3], draw: bone(J.na.s, J.na.el, 1.6, 1.15) },
      { s: frameOf(J.na.el, J.na.hd), e: [10, -1.4, 0.4], draw: bone(J.na.el, J.na.hd, 1.35, 1.2) },
      { s: headF, e: [13.5, -4.3, 0.42], d: 0.05, b: 1.5, draw: gg => skull(gg, c.headR, { eyesClosed: true, jaw: 0.8 }) },
      { s: headF, e: [-17, -2.2, -0.55], d: 0.02, b: 2.5, draw: gg => sallet(gg, c.headR) },
    ];
    collapse(g, parts, t, 0.3, 0.86);
    // the eye-light gutters out as the skull drops
    const u = seg(t, 0.3, 0.6);
    if (u < 1) { const x = lerp(headF[0], 13.5, ease(u)), y = lerp(headF[1], -4.3, u * u); glow(g, x + 3, y - 1, 6, TEAL, 0.6 * (1 - u)); }
  },
  idle(t) { return BP.ready(t); },
  attack(t) { // draw, loose (frame 2), follow through, pull a fresh arrow from the quiver, nock it
    const p = basePose(); p.t = t;
    p.nl = [0.28, 0.12]; p.fl = [-0.26, 0.1]; p.lean = -0.04;
    if (t < 0.25) { p.fa = [1.58, 0.04]; return archerAim(p, lerp(0.6, 1, ease(seg(t, 0, 0.14))), 0.06); }
    const q = ease(seg(t, 0.3, 0.58)), d = ease(seg(t, 0.62, 1));
    p.fa = [lerp(1.58, 0.85, d), lerp(0.04, 0.45, d)];
    p.lean = lerp(-0.04, 0.02, d); p.nl = [lerp(0.28, 0.2, d), 0.1]; p.fl = [lerp(-0.26, -0.18, d), 0.08];
    if (d > 0.55) return archerAim(p, 0.12, lerp(0.06, 0.42, d));
    p.bowTilt = lerp(0.06, 0.42, d);
    if (t < 0.3) { p.twang = 1; p.jaw = 0.5; return reachTo(p, [-4.5, -27.5], 1); }        // release: hand flung back past the ear
    const J = archRig.joints(p), tgtQ = [-9, -34], tgtB = [J.fa.hd[0] - 4, J.fa.hd[1] - 2];
    const tg = d > 0 ? [lerp(tgtQ[0], tgtB[0], d / 0.55), lerp(tgtQ[1] + 3, tgtB[1], d / 0.55)] : [lerp(-4.5, tgtQ[0], q), lerp(-27.5, tgtQ[1] - (t > 0.5 ? 2 : 0), q)];
    reachTo(p, tg, 1);
    if (t > 0.5) p.holdArrow = lerp(PI * 0.6, 0.35, d / 0.55);   // arrow drawn from the quiver
    return p;
  },
};

// =====================================================================================
// LURKER — long-snouted amphibious bog beast with mossy back ridges; burrows into the mud
// =====================================================================================
const LK = { body: '#4d5734', flank: '#636b42', belly: '#b9ab78', ridge: '#86a63c', ridgeD: '#2e3a1c', spot: '#353f22', mud: '#4c3a26', eye: '#ffc93a', mouth: '#6a1e1e', tooth: '#efe6c8', gill: '#9a4a3a' };
const LK_LEGS = [ // [anchor on body (body-local), base foot x (world), phase offset, far?]
  { a: [13, 1.5], fx: 17, ph: 0.5, far: true }, { a: [-13, 1.5], fx: -11, ph: 0, far: true },
  { a: [-14.5, 2.5], fx: -13, ph: 0.5, far: false }, { a: [12, 2.5], fx: 16, ph: 0, far: false },
];
function lkWorld(P, x, y) { const c = C(P.pitch), s = S(P.pitch); return [P.x + c * x - s * y, P.y + s * x + c * y]; }
function lkLeg(g, P, L, i) {
  const [ax, ay] = lkWorld(P, L.a[0], L.a[1]);
  const f = P.feet[i], front = L.a[0] > 0;
  const col = L.far ? dark(LK.flank, 0.12) : LK.flank;
  const [ua, rel] = ik([ax, ay], [f[0], f[1] - 1.2], 8, 7.5, front ? -1 : 1);
  const el = [ax + S(ua) * 8, ay + C(ua) * 8], ft = [el[0] + S(ua + rel) * 7.5, el[1] + C(ua + rel) * 7.5];
  toon(g, capsule(ax, ay, el[0], el[1], 3.6, 2.6), col, { sd: 1, hd: 0.5, lw: 1.4 });
  toon(g, capsule(el[0], el[1], ft[0], ft[1], 2.5, 2), L.far ? dark(LK.mud, 0.1) : LK.mud, { sd: 0.8, hd: 0.4, lw: 1.4 });
  // webbed, clawed foot
  const fy = ft[1] + 0.6;
  toon(g, blob([[ft[0] - 2.6, fy - 1.6], [ft[0] + 1.5, fy - 2], [ft[0] + 4.6, fy - 0.6], [ft[0] + 4.4, fy + 0.6], [ft[0] - 2.8, fy + 0.6]], 0.5), L.far ? dark(LK.mud, 0.16) : dark(LK.mud, 0.06), { sd: 0.4, hd: 0.3, lw: 1.2 });
  for (const k of [0, 1.6]) iline(g, [[ft[0] + 3.2 + k * 0.2, fy - 0.4 + k * 0.3], [ft[0] + 5.2 + k * 0.3, fy + 0.2 + k * 0.3]], LK.tooth, 0.55);
}
function lkTail(g, P) {
  const pts = [], up = [], dn = [];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10, x = -19 - u * 23, y = -0.5 + u * 2.5 + S(P.tail + u * 2.4) * 4 * u * u;
    const r = 6.6 * (1 - u) + 0.6;
    pts.push([x, y]); up.push(lkWorld(P, x, y - r)); dn.push(lkWorld(P, x, y + r * 0.85));
  }
  const path = blob([...up, ...dn.reverse()], 0.4);
  toon(g, path, LK.body, { sd: 1.6, hd: 0.8, lw: 1.5, detail: q => { q.fillStyle = alpha(LK.belly, 0.55); q.beginPath(); dn.slice().reverse().forEach(([x, y], i) => (i ? q.lineTo(x, y + 0.3) : q.moveTo(x, y + 0.3))); for (let i = 10; i >= 0; i--) { const [x, y] = dn[10 - i]; q.lineTo(x, y - 2.2); } q.closePath(); q.fill(); } });
  // low wavy newt fin along the top of the tail
  const fin = [];
  for (let i = 1; i <= 9; i++) { const [x, y] = up[i]; fin.push([x, y + 0.6]); }
  const top = []; for (let i = 9; i >= 1; i--) { const [x, y] = up[i]; top.push([x, y - (2.6 + S(i * 1.3 + P.t * PI * 2) * 0.8) * (1 - i / 11)]); }
  toon(g, blob([...fin, ...top], 0.5), dark(LK.ridge, 0.12), { sd: 0.5, hd: 0.4, lw: 1.2 });
}
function lkHead(g, P) {
  const [hx, hy] = lkWorld(P, 17, -1.5);
  g.save(); g.translate(hx, hy); g.rotate(P.pitch + P.head);
  g.scale(1.08, 1.08);
  const jaw = P.jaw || 0, ja = jaw * 0.62;
  // throat pouch + lower jaw (rotates around the hinge)
  toon(g, ellipse(3, 4.6 + P.throat, 5.2, 3 + P.throat * 0.6), LK.belly, { sd: 0.6, hd: 0.4, lw: 1.3 });
  g.save(); g.translate(6, 1); g.rotate(ja);
  if (jaw > 0.05) flat(g, poly([[0, -1], [21, -1.5], [21, 0.6], [0, 1.5]]), LK.mouth, 0);
  toon(g, blob([[-6, -0.5], [6, 0], [16, 0.2], [21.5, -0.2], [22, 1.6], [15, 3.6], [3, 4.3], [-6, 3.4]], 0.55), dark(LK.flank, 0.04), { sd: 0.6, hd: 0.4, lw: 1.4,
    detail: q => { q.fillStyle = alpha(LK.belly, 0.6); q.fillRect(-7, 2.4, 30, 3); } });
  for (let x = 4; x < 21; x += 3.4) flat(g, poly([[x, 0.2], [x + 0.8, -2.2 - (x > 15 ? 0.6 : 0)], [x + 1.6, 0.2]]), LK.tooth, 0.6);
  g.restore();
  if (jaw > 0.05) flat(g, poly([[6, 0.2], [26, -0.6], [26, 1.4], [6, 2.4]]), dark(LK.mouth, 0.1), 0);
  // upper head with brow bump and nostril knob
  const head = blob([[-3, -5.5], [3, -7.6], [7.5, -9.6], [11.5, -8.4], [15, -5.6], [21, -4.4], [25.5, -4.4], [28, -3.4], [28.6, -0.8], [26, 0.6], [14, 0.9], [5, 1.6], [-3, 3.2]], 0.6);
  toon(g, head, LK.body, { sd: 1.4, hd: 0.9, lw: 1.5, detail: q => {
    q.fillStyle = alpha(LK.belly, 0.45); q.beginPath(); q.ellipse(16, 0.4, 11, 1.6, -0.03, 0, PI * 2); q.fill();
    q.fillStyle = LK.spot; for (const [x, y, r] of [[2, -4, 1.6], [16, -3.6, 1]]) { q.beginPath(); q.ellipse(x, y, r * 1.3, r, 0, 0, PI * 2); q.fill(); }
  } });
  for (let x = 9; x < 25; x += 3.6) flat(g, poly([[x, 0.4], [x + 0.7, 2.6], [x + 1.4, 0.5]]), LK.tooth, 0.6);   // upper teeth
  flat(g, ellipse(26.6, -3.2, 0.9, 0.6, -0.4), '#1a120c', 0);
  // amber eye on the brow bump
  if (P.eyesClosed) line(g, [[7.2, -6.9], [10.6, -6.4]], OUT, 1.1);
  else { glow(g, 9.2, -6.6, 6, LK.eye, 0.35); flat(g, ellipse(9.2, -6.6, 2.1, 1.35, 0.12), LK.eye, 0.9); flat(g, ellipse(9.6, -6.6, 0.45, 1.15), '#1a120c', 0); }
  toon(g, blob([[5.6, -8.6], [9, -9.9], [12.6, -8.4], [12.4, -7.3], [9.4, -7.9], [6.2, -7.4]], 0.5), dark(LK.body, 0.06), { sd: 0.3, hd: 0.5, lw: 1.2 });   // heavy brow
  g.restore();
}
function drawLurker(g, P) {
  g.save();
  if (P.sink !== undefined) { const cl = new Path2D(); cl.rect(-200, -200, 400, 200); g.clip(cl); }
  g.scale(0.86, 0.86);
  lkLeg(g, P, LK_LEGS[0], 0); lkLeg(g, P, LK_LEGS[1], 1);
  lkTail(g, P);
  // body with mossy ridges
  const B = (x, y) => lkWorld(P, x, y);
  const body = blob([B(-21, -3), B(-15, -9), B(-5, -11), B(6, -11.4), B(14, -9.4), B(19.5, -4), B(18.5, 4.4), B(10, 7.8), B(-4, 8.2), B(-16, 6.6), B(-21.5, 2.5)], 0.75);
  toon(g, body, LK.body, { sd: 2.2, hd: 1.1, lw: 1.6, detail: q => {
    q.fillStyle = LK.flank; q.beginPath(); const [cx, cy] = B(0, 1.5); q.ellipse(cx, cy, 20, 5, P.pitch, 0, PI * 2); q.fill();
    q.fillStyle = LK.belly; q.beginPath(); const [bx, by] = B(0, 7); q.ellipse(bx, by, 18, 3.6, P.pitch, 0, PI * 2); q.fill();
    q.fillStyle = LK.spot; for (const [x, y, r] of [[-10, -4.5, 2.4], [2, -5.6, 2], [10, -4.2, 1.6], [-3, -1, 1.4]]) { const [sx, sy] = B(x, y); q.beginPath(); q.ellipse(sx, sy, r * 1.4, r, P.pitch, 0, PI * 2); q.fill(); }
  } });
  for (const [x, hgt, sprout] of [[12, 3.6, 0], [6.5, 5, 1], [0.5, 5.6, 0], [-5.5, 5.2, 1], [-11.5, 4.4, 0], [-16.5, 3.2, 0]]) {
    const top = -10.6 + Math.abs(x) * 0.035 + (x < -10 ? 0.8 : 0), sw = S(P.t * PI * 2 + x * 0.3) * 0.5;
    const hump = blob([B(x - 3.4, top + 2), B(x - 2.6, top - hgt * 0.6), B(x - 0.6, top - hgt), B(x + 1.8, top - hgt * 0.8), B(x + 3.2, top - hgt * 0.2), B(x + 3.4, top + 2)], 0.7);
    toon(g, hump, LK.ridge, { sd: 1.1, hd: 0.7, lw: 1.3, detail: q => {
      q.fillStyle = alpha('#c8e070', 0.45); for (const [dx, dy] of [[-1.6, -0.7], [0.4, -0.95], [1.8, -0.55]]) { const [mx, my] = B(x + dx, top - hgt * -dy * 1.0 - hgt * 0.0 + dy * hgt * 1.0 + hgt * 0.15); q.beginPath(); q.arc(mx, my, 0.9, 0, PI * 2); q.fill(); }
      q.fillStyle = alpha(LK.ridgeD, 0.5); const [bx, by] = B(x, top + 1.6); q.beginPath(); q.ellipse(bx, by, 3.6, 1.4, P.pitch, 0, PI * 2); q.fill();
    } });
    if (sprout) { const [rx, ry] = B(x - 0.3, top - hgt + 0.6); iline(g, [[rx, ry], [rx - 1.2 + sw, ry - 5.5]], '#9ab84a', 0.8); iline(g, [[rx + 0.8, ry + 0.3], [rx + 2 + sw, ry - 4]], '#7a9a3a', 0.8); }
  }
  // moss strand hanging off the flank
  const [mx, my] = B(-3, -6); strand(g, mx, my, 7, -1 + S(P.t * PI * 2) * 0.7, WEED_L, 1);
  lkHead(g, P);
  lkLeg(g, P, LK_LEGS[2], 2); lkLeg(g, P, LK_LEGS[3], 3);
  g.restore();
}
// gait: diagonal pairs; stance slides the foot back, swing lifts it forward
function lkFeet(t, stride = 10, lift = 3.5) {
  return LK_LEGS.map(L => {
    const u = (t + L.ph) % 1;
    if (u < 0.6) return [L.fx + stride / 2 - (u / 0.6) * stride, 0];
    const v = (u - 0.6) / 0.4; return [L.fx - stride / 2 + v * stride, -S(v * PI) * lift];
  });
}
const LP = {
  base(t) { return { x: 0, y: -13.2, pitch: 0, head: 0, jaw: 0, tail: t * PI * 2, throat: 0, t, feet: lkFeet(0, 0, 0) }; },
  walk(t) { const P = LP.base(t); P.feet = lkFeet(t, 19, 4); P.y = -13.2 - Math.abs(S(t * PI * 4)) * 0.8; P.pitch = S(t * PI * 4) * 0.015; P.head = S(t * PI * 2) * 0.04; return P; },
  idle(t) { const P = LP.base(t); P.y = -13 + S(t * PI * 2) * 0.3; P.throat = (S(t * PI * 2) + 1) * 0.7; P.head = -0.03 + S(t * PI * 2) * 0.02; P.tail = t * PI * 2 * 0.5; return P; },
  bite(t) {
    const P = LP.base(t), w = ease(seg(t, 0, 0.35)), s = ease(seg(t, 0.35, 0.55)), r = ease(seg(t, 0.6, 1));
    P.x = -2.5 * w * (1 - s) + 6 * s * (1 - r);
    P.feet = lkFeet(0, 0, 0).map(([x, y], i) => [x + (i % 3 === 0 ? P.x * 0.6 : 0), y]);
    P.head = -0.28 * w * (1 - s) + 0.12 * s * (1 - r); P.jaw = w * (1 - s * 0.9) + 0.12 * (1 - r) * s;
    P.pitch = -0.06 * w * (1 - s) + 0.04 * s * (1 - r); P.y = -13.2 - 1.2 * w * (1 - s);
    return P;
  },
  death(t) { // rears up in pain, then rolls belly-up (flip is drawn by lurkerDeath)
    const P = LP.base(0.2), k = ease(seg(t, 0, 0.3)), f = ease(seg(t, 0.3, 0.6));
    P.pitch = -0.22 * k * (1 - f); P.head = -0.45 * k * (1 - f) + 0.15 * f; P.jaw = k * (1 - f * 0.5); P.gillFlare = k;
    P.y = -13.2 - 2.5 * k * (1 - f);
    const limp = seg(t, 0.55, 1);
    P.feet = lkFeet(0, 0, 0).map(([x, y], i) => [x + (i % 3 === 0 ? 3 : -3) * limp, y - 4 * limp - (i < 2 ? 2 : 0) * limp]);
    P.tail = 0.6 + f * 1.5; P.eyesClosed = t > 0.6; P.throat = 0;
    return P;
  },
  burrow(t) { // nose down, dives forward into the mud
    const P = LP.base(0), d = ease(seg(t, 0.1, 1));
    P.pitch = 0.08 + 0.45 * ease(seg(t, 0, 0.35)); P.head = 0.2 * ease(seg(t, 0, 0.3));
    P.x = d * 14; P.y = -13.2 + d * 36; P.sink = d;
    P.feet = lkFeet(0, 0, 0).map(([x, y]) => [x + P.x * 0.7, y + d * 20]);
    P.tail = t * 3; return P;
  },
  emerge(t) { // bursts out snout-first, levels out
    const P = LP.base(0), u = ease(seg(t, 0, 0.75)), l = ease(seg(t, 0.45, 1));
    P.pitch = -0.5 * (1 - l) + 0.0; P.head = -0.25 * (1 - l);
    P.x = -8 * (1 - u); P.y = -13.2 + (1 - u) * 30; P.sink = 1 - u; P.jaw = bell(t, 0.2, 0.75) * 0.7;
    P.feet = lkFeet(0, 0, 0).map(([x, y]) => [x + P.x * 0.5, y + (1 - u) * 18]);
    P.tail = t * 4; return P;
  },
};
function lurkerDeath(g, t) {
  const P = LP.death(t), fl = seg(t, 0.36, 0.62);   // 0 upright -> 1 belly-up
  if (fl <= 0) return drawLurker(g, P);
  const sy = C(fl * PI), lift = S(fl * PI) * 6;
  g.save(); g.translate(0, -8 - lift); g.scale(1, sy < 0 ? Math.min(-0.62, sy) : Math.max(0.35, sy)); g.translate(0, 8);
  if (sy < 0) g.translate(0, -1 - 3 * seg(t, 0.62, 0.8));
  drawLurker(g, P);
  g.restore();
  // belly-up: ridges sink into the mud
  if (sy < 0) { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.fillRect(-100, 1.5, 200, 30); g.restore(); }
}
// mud splash ring + flying clods at ground level
function mudSplash(g, x, t, k = 1, seed = 3) {
  if (t <= 0 || t >= 1) return;
  const R = rng(seed);
  g.save(); g.globalAlpha *= 1 - t * 0.6;
  toon(g, ellipse(x, -0.8, 12 + t * 10, 3 + t * 1.5), MUD, { sd: 0.6, hd: 0.4, lw: 1.3, detail: q => { q.fillStyle = dark(MUD, 0.1); q.beginPath(); q.ellipse(x, -0.2, 8 + t * 8, 1.6, 0, 0, PI * 2); q.fill(); } });
  for (let i = 0; i < 7; i++) {
    const a = -PI * (0.15 + R() * 0.7), v = (12 + R() * 14) * k, cx = x + C(a) * v * t, cy = -1 + S(a) * v * t + 30 * t * t;
    if (cy < 0) toon(g, circle(cx, cy, 1.3 + R() * 1.3), R() < 0.5 ? MUD : '#5e4a32', { sd: 0.3, hd: 0.3, lw: 1 });
  }
  g.restore();
}

// =====================================================================================
// CULTIST — Ember Crown devotee: ash-black hooded robe with ember trim, porcelain mask, censer
// =====================================================================================
const cultRig = humanoid({ h: 42, headR: 7, torsoH: 13, torsoW: 9.6, thigh: 7.4, shin: 7, upper: 7.2, fore: 6.6, limbR: 2.6, lw: 1.5 });
const CU = { robe: '#2b2623', robeL: '#3d3631', trim: '#e8741f', trimD: '#a8481a', hand: '#4a3f38', mask: '#f1ece2', brass: '#a8843a', rope: '#8a6a3e' };
function sleeveArm(g, c, A, far) {
  const robe = far ? dark(CU.robe, 0.06) : CU.robe;
  toon(g, capsule(A.s[0], A.s[1], A.el[0], A.el[1], 2.9, 2.6), robe, { sd: 1, hd: 0.6, lw: 1.5 });
  // bell sleeve widening toward the wrist, ember-trimmed cuff
  const a = Math.atan2(A.hd[1] - A.el[1], A.hd[0] - A.el[0]), n = [-S(a), C(a)];
  const e = [A.el[0] - C(a) * 0.5, A.el[1] - S(a) * 0.5], w = [A.hd[0] - C(a) * 1.4, A.hd[1] - S(a) * 1.4];
  const sl = poly([[e[0] + n[0] * 2.6, e[1] + n[1] * 2.6], [w[0] + n[0] * 4.4, w[1] + n[1] * 4.4], [w[0] - n[0] * 4.0, w[1] - n[1] * 4.0], [e[0] - n[0] * 2.6, e[1] - n[1] * 2.6]]);
  toon(g, circle(A.hd[0], A.hd[1], 2.1), far ? dark(CU.hand, 0.08) : CU.hand, { sd: 0.6, hd: 0.4, lw: 1.3 });
  toon(g, sl, robe, { sd: 1, hd: 0.6, lw: 1.5, detail: q => { q.strokeStyle = far ? CU.trimD : CU.trim; q.lineWidth = 1.6; q.beginPath(); q.moveTo(w[0] + n[0] * 4.4 - C(a) * 0.8, w[1] + n[1] * 4.4 - S(a) * 0.8); q.lineTo(w[0] - n[0] * 4 - C(a) * 0.8, w[1] - n[1] * 4 - S(a) * 0.8); q.stroke(); } });
}
function shoe(g, L, far) { toon(g, blob([[L.ft[0] - 2, L.ft[1] - 2.2], [L.ft[0] + 3.4, L.ft[1] - 1.6], [L.ft[0] + 4.4, L.ft[1] - 0.2], [L.ft[0] - 2.2, L.ft[1] + 0.1]], 0.6), far ? '#16120f' : '#221c18', { sd: 0.4, hd: 0.3, lw: 1.3 }); }
function robeSkirt(g, J, c, p) {
  const w = c.torsoW, fwd = Math.max(J.nl.ft[0], J.fl.ft[0]), back = Math.min(J.nl.ft[0], J.fl.ft[0]);
  const knee = Math.max(J.nl.kn[0], J.fl.kn[0]), ky = (J.nl.kn[1] + J.fl.kn[1]) / 2;
  const lift = Math.min(J.nl.ft[1], J.fl.ft[1]);
  const tb = sub(J, [-w * 0.52, -1.5]), tf = sub(J, [w * 0.58, -1.5]);
  const hemY = Math.max(J.nl.ft[1], J.fl.ft[1]) - 1.3, fy = Math.min(hemY, lift - 0.6), sw = S((p.t || 0) * PI * 2) * 0.8;
  const hem = [[fwd + 4, fy], [fwd + 1.5, fy + 1.4], [lerp(fwd, back, 0.35), hemY + 0.6], [lerp(fwd, back, 0.55), hemY - 0.8], [lerp(fwd, back, 0.75), hemY + 0.7], [back - 1.5, hemY - 0.2], [back - 4.2 + sw, hemY - 0.6]];
  const path = new Path2D();
  path.moveTo(tb[0], tb[1]); path.lineTo(tf[0], tf[1]);
  path.quadraticCurveTo(Math.max(knee + 2.6, tf[0] + 1), ky, hem[0][0], hem[0][1]);
  for (const [x, y] of hem.slice(1)) path.lineTo(x, y);
  path.quadraticCurveTo(tb[0] - 3.5, ky + 2, tb[0], tb[1]); path.closePath();
  toon(g, path, CU.robe, { sd: 1.8, hd: 0.8, lw: 1.5, detail: q => {
    q.fillStyle = CU.trim; q.beginPath(); for (const [x, y] of hem) q.lineTo(x, y - 2.4); for (const [x, y] of hem.slice().reverse()) q.lineTo(x, y + 2); q.closePath(); q.fill();
    q.strokeStyle = alpha('#000', 0.35); q.lineWidth = 0.9;
    for (const u of [0.32, 0.62]) { const x = lerp(tb[0], tf[0], u); q.beginPath(); q.moveTo(x, tb[1] + 2); q.quadraticCurveTo(x + 1, ky, lerp(back, fwd, u) + sw * 0.4, hemY - 2.5); q.stroke(); }
  } });
}
function maskHood(g, r, p) {
  const sw = S((p.t || 0) * PI * 2) * 0.6;
  const hood = blob([[r * 0.78, -r * 0.82], [r * 0.15, -r * 1.3], [-r * 0.7, -r * 1.12], [-r * 1.45 + sw * 0.3, -r * 0.42], [-r * 1.25, r * 0.55], [-r * 0.95, r * 1.35], [r * 0.25, r * 1.25], [r * 0.9, r * 0.55]], 0.7);
  toon(g, hood, CU.robe, { sd: 1.6, hd: 0.8, lw: 1.5 });
  flat(g, ellipse(r * 0.5, r * 0.02, r * 0.58, r * 0.84, 0.08), '#0e0b0a', 0);                  // shadowed opening
  if (p.noMask) return;
  // porcelain mask
  toon(g, blob([[r * 0.18, -r * 0.62], [r * 0.7, -r * 0.72], [r * 0.98, -r * 0.3], [r * 0.95, r * 0.35], [r * 0.62, r * 0.78], [r * 0.25, r * 0.55], [r * 0.08, -r * 0.05]], 0.7), CU.mask, { sd: 0.9, hd: 0.6, lw: 1.2, light: '#ffffff' });
  for (const [x, y, s] of [[r * 0.5, -r * 0.14, 1], [r * 0.88, -r * 0.1, 0.62]]) {
    flat(g, ellipse(x, y, r * 0.17 * s, r * 0.09, -0.15), '#1a0e08', 0);
    if (!p.eyesClosed) { glow(g, x, y, r * 0.75 * s, EMBER, 0.6); flat(g, ellipse(x + 0.2, y, r * 0.07 * s, r * 0.05), EMBER_H, 0); }
  }
  // painted ember crown on the brow, mouth slit, hairline crack
  flat(g, poly([[r * 0.38, -r * 0.42], [r * 0.42, -r * 0.62], [r * 0.52, -r * 0.48], [r * 0.6, -r * 0.66], [r * 0.68, -r * 0.48], [r * 0.78, -r * 0.6], [r * 0.8, -r * 0.4]]), CU.trim, 0.5, CU.trimD);
  line(g, [[r * 0.55, r * 0.42], [r * 0.8, r * 0.38]], '#3a2a20', 0.6);
  line(g, [[r * 0.3, -r * 0.3], [r * 0.36, -r * 0.05], [r * 0.3, r * 0.15]], alpha('#6a5a4a', 0.8), 0.45);
  // ember-trimmed hood rim
  const rim = new Path2D(); rim.moveTo(r * 0.85, -r * 0.78); rim.quadraticCurveTo(r * 0.05, -r * 0.95, -r * 0.05, r * 0.1); rim.quadraticCurveTo(-r * 0.05, r * 0.8, r * 0.6, r * 1.05);
  stroke(g, rim, CU.trimD, 1.6); stroke(g, rim, CU.trim, 0.9);
}
function censer(g, x, y, ang, t, lit = 1) {
  const L = 6, cx = x + S(ang) * L, cy = y + C(ang) * L;
  chain(g, [[x, y + 0.5], [cx, cy - 2.4]], '#7a6a50', 0.75);
  if (lit > 0) {
    glow(g, cx, cy, 9, EMBER, 0.55 * lit);
    g.save(); g.globalAlpha *= 0.55 * lit;
    for (let i = 0; i < 3; i++) { const u = (t * 2 + i / 3) % 1; flat(g, circle(cx - 1 - u * 4 + S(u * 6 + i) * 1.2, cy - 3 - u * 9, 1.4 + u * 2.2), alpha('#9a9088', 0.7 * (1 - u)), 0); }
    g.restore();
  }
  toon(g, blob([[cx - 3.2, cy - 1.2], [cx, cy - 2.6], [cx + 3.2, cy - 1.2], [cx + 2.6, cy + 2.4], [cx, cy + 3.2], [cx - 2.6, cy + 2.4]], 0.7), CU.brass, { sd: 0.9, hd: 0.6, lw: 1.2 });
  toon(g, blob([[cx - 2.8, cy - 1], [cx, cy - 4.4], [cx + 2.8, cy - 1]], 0.6), dark(CU.brass, 0.08), { sd: 0.4, hd: 0.4, lw: 1.1 });
  if (lit > 0) for (const dx of [-1.3, 0.9]) flat(g, circle(cx + dx, cy + 0.6, 0.65), EMBER_H, 0);
}
function emberBall(g, x, y, k = 1, t = 0) {
  glow(g, x, y, 10 * k, EMBER, 0.85);
  flat(g, blob([[x - 3 * k, y], [x - 1.4 * k, y - 3.4 * k - S(t * 20) * 0.6], [x + 0.6 * k, y - 2 * k], [x + 2.8 * k, y], [x + 1.4 * k, y + 2.4 * k], [x - 1.6 * k, y + 2.4 * k]], 0.7), '#ff9a3a', 0.9, EMBER_D);
  flat(g, circle(x + 0.2, y + 0.2, 1.4 * k), '#fff2b8', 0);
}
const CULT = {
  farArm: (g, c, A) => sleeveArm(g, c, A, true),
  farLeg: (g, c, L) => shoe(g, L, true), nearLeg: (g, c, L) => shoe(g, L, false),
  hips: (g, J, p, c) => robeSkirt(g, J, c, p),
  torso: (g, c, J, p) => inTorso(g, J, q => {
    const w = c.torsoW, h = c.torsoH;
    toon(q, torsoPath(c), CU.robe, { sd: 2, hd: 1, lw: 1.5, detail: d => {
      d.fillStyle = CU.trim; d.beginPath(); d.moveTo(w * 0.12, -h - 1); d.lineTo(w * 0.42, -h - 1); d.lineTo(w * 0.36, 1); d.lineTo(w * 0.18, 1); d.closePath(); d.fill();   // stole
      d.fillStyle = alpha('#000', 0.25); d.fillRect(w * 0.2, -h, 1, h + 1);
    } });
    toon(q, rrect(-w * 0.6, -h * 0.2, w * 1.25, 2.2, 1), CU.rope, { sd: 0.4, hd: 0.3, lw: 1.1 });
    iline(q, [[w * 0.05, -h * 0.1], [-w * 0.05 + S((p.t || 0) * PI * 2) * 0.6, h * 0.25]], CU.rope, 1);
  }),
  overTorso: (g, J, p) => { if (!p.dropCenser) censer(g, J.fa.hd[0], J.fa.hd[1] + 1, p.censer || 0, p.t || 0, p.censerLit ?? 1); },
  head: maskHood,
  nearArm: (g, c, A) => sleeveArm(g, c, A, false),
  nearHand: (g, J, p) => { if (p.ember) emberBall(g, J.na.hd[0] + 0.5, J.na.hd[1] - 1.5, p.ember, p.t || 0); },
  front: (g, J, p) => { if (p.flung) { const [x, y] = p.flung; g.save(); g.globalCompositeOperation = 'lighter'; stroke(g, poly([[x - 12, y + 2], [x - 2, y]], false), alpha(EMBER, 0.6), 2.2); g.restore(); emberBall(g, x, y, 0.85, p.t || 0); } },
};
const CP = {
  walk(t) { const p = Pose.walk(t, { stride: 0.42, arm: 0.25, lean: 0.1, bobAmp: 1.1 }); p.fa = [0.75 + S(t * PI * 2) * 0.08, 0.45]; p.na[1] = 0.6; p.censer = -0.35 - S(t * PI * 2 + 0.8) * 0.35; p.t = t; return p; },
  idle(t) { const p = Pose.idle(t); p.fa = [0.7, 0.5]; p.na = [0.15, 0.9]; p.censer = S(t * PI * 2) * 0.15; p.tilt = -0.04; p.t = t; return p; },
  attack(t) { // conjure an ember, hurl it (release on frame 2)
    const p = basePose(); p.t = t;
    const w = ease(seg(t, 0, 0.17)), s = ease(seg(t, 0.17, 0.32)), r = ease(seg(t, 0.5, 1));
    p.na = [lerp(0.2, -2.2, w) * (1 - s) + lerp(-2.2, 1.75, s) * s * (1 - r) + 0.2 * r * s, lerp(0.6, 1.1, w) * (1 - s) + 0.12 * s * (1 - r) + 0.8 * r * s];
    p.fa = [lerp(0.7, 0.2, w) * (1 - r) + 0.7 * r, 0.45]; p.censer = lerp(0, 0.5, w) * (1 - r) - 0.6 * s * (1 - r);
    p.lean = lerp(0.05, -0.18, w) * (1 - s) + 0.28 * s * (1 - r) + 0.05 * r;
    p.nl = [0.32 * s * (1 - r), 0.15]; p.fl = [-0.25, 0.15]; p.bob = -0.8 * s * (1 - r);
    if (t < 0.3) p.ember = 0.6 + w * 0.45;
    else if (t < 0.4) { const J = cultRig.joints(p); p.flung = [J.na.hd[0] + 9, J.na.hd[1] - 0.5]; }
    return p;
  },
  death(t) { // staggers, kneels, crumples face-down; the mask slips off
    const p = basePose(), k = ease(seg(t, 0, 0.35)), f = seg(t, 0.3, 0.8), fe = f * f;
    p.nl = [lerp(lerp(0.05, 0.55, k), 0.4, fe), lerp(0.05, 2.0, k) * (1 - fe) + 0.1 * fe];
    p.fl = [lerp(lerp(-0.05, 0.3, k), 0.3, fe), lerp(0.05, 1.8, k) * (1 - fe)];
    p.dy = k * 6 * (1 - fe) + fe * 3; p.rot = fe * PI / 2 * 0.96; p.dx = -fe * 7;
    p.lean = lerp(-0.2, 0.3, k) * (1 - fe) + 0.2 * fe; p.tilt = lerp(-0.3, 0.2, k);
    p.na = [lerp(0.6, 2.3, fe), 0.4]; p.fa = [lerp(0.8, 0.3, fe), 0.3]; p.censer = 1.2 * fe; p.censerLit = 1 - seg(t, 0.4, 0.9);
    p.eyesClosed = t > 0.55; p.noMask = t > 0.62; p.dropCenser = t > 0.45; p.t = 0.2;
    return p;
  },
};
function cultistDeath(g, t) {
  fig(g, cultRig, CP.death(t), CULT);
  if (t > 0.45) { // the censer drops from the hand, rolls and gutters out
    const u = seg(t, 0.45, 0.8);
    g.save(); g.translate(lerp(14, 3, ease(u)), lerp(-12, -0.5, u * u)); g.rotate(lerp(0, 1.3, ease(u)));
    censer(g, 0, -6.5, 0, 0.2, 1 - seg(t, 0.5, 1)); g.restore();
  }
  if (t > 0.62) { // the fallen porcelain mask, face up
    const u = seg(t, 0.62, 1);
    g.save(); g.translate(lerp(30, 45, ease(u)), lerp(-16, -2.6, u * u) - S(seg(u, 0.7, 1) * PI) * 1.5); g.rotate(lerp(1.2, -0.3, ease(u)));
    toon(g, ellipse(0, 0, 3.6, 2.4), CU.mask, { sd: 0.6, hd: 0.5, lw: 1.1, light: '#ffffff' });
    flat(g, ellipse(-1, -0.4, 0.8, 0.45), '#1a0e08', 0); flat(g, ellipse(1.4, -0.3, 0.55, 0.4), '#1a0e08', 0);
    g.restore();
  }
  // a thin curl of teal soul-smoke escapes (the spirit is spawned by the game)
  const v = bell(t, 0.45, 1);
  if (v > 0) { g.save(); g.globalAlpha *= v * 0.8; glow(g, 18, -10 - t * 12, 10, TEAL, 0.5); g.restore(); }
}

// =====================================================================================
// SPIRIT — small pale-teal soul flame with a faint face and trailing wisps (flying)
// =====================================================================================
const SPC = { edge: '#5fe6c2', core: '#dcfff4', ink: '#0f4a40' };
function spirit(g, t, o = {}) {
  const f = S(t * PI * 2), die = o.die || 0, flare = o.flare || 0;
  g.save();
  g.translate((o.dx || 0), -11 + f * 1.2 - die * 6);
  if (die) { g.globalAlpha *= 1 - die * 0.85; g.scale(1 - die * 0.35, 1 + die * 0.6); }
  const k = 1 + flare * 0.25;
  glow(g, 0, 0, 16 * k, TEAL, 0.42 + flare * 0.25);
  // trailing wisps
  for (let i = 0; i < 3; i++) {
    const ph = t * PI * 2 + i * 2.1, pts = [];
    for (let j = 0; j <= 6; j++) { const u = j / 6; pts.push([-3 - u * (13 + i * 3) * (1 + die), (i - 1) * 2.6 + 1 + S(ph + u * 4) * 2.2 * u - u * (2 - i) * 1.5]); }
    const p = new Path2D(); pts.forEach(([x, y], j) => (j ? p.lineTo(x, y) : p.moveTo(x, y)));
    g.save(); g.globalAlpha *= 0.75; stroke(g, p, alpha(SPC.edge, 0.55), 3.6 - i * 0.6); stroke(g, p, alpha(SPC.core, 0.7), 1.2); g.restore();
  }
  // flame body: round belly, a main tip curling back and two smaller flickering tongues
  const f1 = S(t * PI * 4) * 1.4, f2 = S(t * PI * 6 + 1.3) * 1.2;
  const tip = [-4 + S(t * PI * 4) * 1.6 - flare * 2, -16 - flare * 3 + S(t * PI * 2 + 1) * 1.2];
  const body = blob([[0, 7.5 * k], [-6.8 * k, 3], [-7.2 * k, -2.4], [-6.2, -6], [-9.6 + f1, -10.6 - flare], [-4.6, -8.2], tip, [-0.6, -10], [2.6 + f2 * 0.6, -12.6 - flare * 1.5 + f2], [3.6, -8], [6.8 * k, -3], [7.2 * k, 2.4], [4.4, 6.4 * k]], 0.62);
  toon(g, body, SPC.edge, { sd: 1.4, hd: 1.6, lw: 1.4, outline: SPC.ink, light: SPC.core, shade: '#3fbfa0' });
  flat(g, blob([[0.6, 5], [-4, 2], [-3.8, -3], [-2, -7.5], [0.4, -4.4], [3.4, -2], [3.6, 3]], 0.75), alpha(SPC.core, 0.9), 0);
  // faint, sorrowful face with a wailing mouth
  const mo = (o.mouth || 0) + flare * 0.8;
  g.save(); g.globalAlpha *= 0.62;
  flat(g, blob([[-0.9, -2.6], [1.5, -2.1], [1.2, -0.6], [-0.6, -0.9]], 0.6), SPC.ink, 0);
  flat(g, blob([[3.2, -2.2], [5, -2.6], [4.9, -1.0], [3.4, -0.6]], 0.6), SPC.ink, 0);
  flat(g, ellipse(2.1, 2.8, 0.75 + mo * 0.3, 1.2 + mo * 1.1), SPC.ink, 0);
  g.restore();
  // drifting sparks
  for (let i = 0; i < 3; i++) { const u = (t + i / 3) % 1; flat(g, circle(-2 + i * 2.5 + S(u * 7 + i) * 1.5, -8 - u * 9, 0.8 * (1 - u) + 0.2), alpha(SPC.core, 0.9 * (1 - u)), 0); }
  g.restore();
}

// =====================================================================================
// WRAITH — legless shade in tattered robes; heavy armoured gauntlets and a crowned helm
// =====================================================================================
const WR = { robe: '#232c33', robeL: '#37474e', iron: '#363e42', ironL: '#5b686c', crown: '#b09443', verd: '#58a48c' };
function gauntletArm(g, s, hd, far, t, claw = 0) {
  const [ua, rel] = ik(s, hd, 7.5, 7, -1);
  const el = [s[0] + S(ua) * 7.5, s[1] + C(ua) * 7.5], fa = ua + rel;
  const robe = far ? dark(WR.robe, 0.06) : WR.robe, iron = far ? dark(WR.iron, 0.1) : WR.iron, ironL = far ? dark(WR.ironL, 0.1) : WR.ironL;
  // draped sleeve with a ragged, trailing end
  const n = [C(ua), -S(ua)], sw = S(t * PI * 2) * 1.2;
  toon(g, poly([[s[0] + n[0] * 3.4, s[1] + n[1] * 3.4], [el[0] + n[0] * 3.6, el[1] + n[1] * 3.6], [el[0] - n[0] * 1.5 + S(ua) * 2, el[1] - n[1] * 1.5 + C(ua) * 2], [el[0] - n[0] * 2.5 - 4 + sw, el[1] + 6], [el[0] - n[0] * 4 - 2, el[1] + 2], [s[0] - n[0] * 3.4, s[1] - n[1] * 3.4]]), robe, { sd: 1, hd: 0.5, lw: 1.4 });
  // vambrace
  toon(g, capsule(el[0], el[1], hd[0], hd[1], 2.4, 2.9), iron, { sd: 1, hd: 0.7, lw: 1.4, detail: q => { q.strokeStyle = alpha(WR.verd, 0.7); q.lineWidth = 1; const m = [lerp(el[0], hd[0], 0.45), lerp(el[1], hd[1], 0.45)]; q.beginPath(); q.moveTo(m[0] + C(fa) * 3, m[1] - S(fa) * 3); q.lineTo(m[0] - C(fa) * 3, m[1] + S(fa) * 3); q.stroke(); } });
  g.save(); g.translate(hd[0], hd[1]); g.rotate(-fa + PI / 2);
  // long plated claws along local +x, curling as `claw` rises
  for (const [y, l] of [[-2.2, 5], [0, 6], [2.2, 5.2]]) {
    const bend = 0.25 + claw * 0.55;
    const cl = new Path2D(); cl.moveTo(1.6, y - 1); cl.quadraticCurveTo(1.6 + l * 0.7, y - 1.2, 1.6 + l, y + l * bend); cl.quadraticCurveTo(1.6 + l * 0.5, y + 0.6, 1.6, y + 1); cl.closePath();
    toon(g, cl, ironL, { sd: 0.3, hd: 0.3, lw: 1.1 });
  }
  toon(g, rrect(-3.2, -3.4, 5.6, 6.8, 1.6), iron, { sd: 0.8, hd: 0.6, lw: 1.4, detail: q => { q.fillStyle = alpha(WR.verd, 0.45); q.fillRect(-3, -3.2, 1.8, 6.4); } });
  toon(g, rrect(-5, -4, 2.6, 8, 1), ironL, { sd: 0.4, hd: 0.4, lw: 1.2 });   // flared cuff
  g.restore();
  glow(g, hd[0] + C(PI / 2 - fa) * 4, hd[1] + S(PI / 2 - fa) * 4, 6, TEAL, far ? 0.2 : 0.35);
}
function crownedHelm(g, x, y, a, eyes = 1, t = 0) {
  g.save(); g.translate(x, y); g.rotate(a);
  // tattered veil hanging from the back of the helm
  const sw = S(t * PI * 2) * 1.5;
  toon(g, poly([[-1, -5], [-6, -3.5], [-9 + sw, 6.5], [-7.4 + sw, 5], [-6.4 + sw, 9.5], [-4.4 + sw * 0.6, 6.5], [-2.4, 8.5], [1, 2.5]]), WR.robeL, { sd: 1, hd: 0.5, lw: 1.3 });
  // dome
  toon(g, blob([[-5.4, 4.6], [-6, -1.5], [-4.2, -6.4], [0.4, -7.8], [4.4, -5.6], [5.6, 0], [4, 5.4], [-1, 6.2]], 0.65), WR.iron, { sd: 1.5, hd: 1.1, lw: 1.5, light: '#7b888c', detail: q => {
    q.fillStyle = alpha(WR.verd, 0.5); q.beginPath(); q.ellipse(-2.6, -3.6, 2, 1.1, -0.5, 0, PI * 2); q.fill();
  } });
  // hound-snout visor with a glowing eye slit and breath holes
  const visor = blob([[2.6, -4.6], [6.5, -3.6], [11.2, 0.2], [6.8, 3.8], [2.8, 5.2], [1.8, 0.4]], 0.45);
  toon(g, visor, WR.iron, { sd: 1, hd: 0.9, lw: 1.4, light: '#7b888c', detail: q => {
    q.fillStyle = '#081012'; q.beginPath(); q.moveTo(2.4, -2.4); q.lineTo(8.2, -1.6); q.lineTo(8.4, -0.6); q.lineTo(2.6, -0.9); q.closePath(); q.fill();
    q.fillStyle = '#0c1416'; for (const [hx, hy] of [[5.2, 1.8], [7, 1.3], [6.2, 2.9]]) { q.beginPath(); q.arc(hx, hy, 0.45, 0, PI * 2); q.fill(); }
  } });
  // tarnished crown ring
  toon(g, poly([[-5.4, -3.6], [-6, -8.6], [-3.8, -6], [-2, -10.4], [-0.2, -6.4], [1.8, -9.8], [3.2, -5.6], [5, -8], [5.4, -3.4], [0, -2.8]]), WR.crown, { sd: 0.6, hd: 0.6, lw: 1.2, detail: q => { q.fillStyle = alpha(WR.verd, 0.6); q.fillRect(-7, -4.8, 14, 1.4); } });
  if (eyes > 0) { glow(g, 5.5, -1.4, 6.5, TEAL, 0.85 * eyes); flat(g, ellipse(4.2, -1.55, 1.2, 0.45, 0.1), alpha(TEAL_C, eyes), 0); flat(g, ellipse(7.2, -1.15, 0.8, 0.4, 0.1), alpha(TEAL_C, eyes), 0); }
  g.restore();
}
// W: { bob, lean, t, near:[x,y], far:[x,y], claw, die, shriek }
function wraith(g, W) {
  const t = W.t, die = W.die || 0;
  g.save(); g.scale(0.9, 0.9); g.translate(0, W.bob || 0);
  const fade = 1 - seg(die, 0.25, 0.85);
  glow(g, 0, -20, 24, TEAL, 0.2 * fade);
  g.save(); g.globalAlpha *= fade;
  const lean = W.lean ?? 0.2, L = x => x * lean;
  // trailing rags (back layer), streaming behind
  for (let i = 0; i < 5; i++) {
    const x0 = -6 + i * 2.8, ph = t * PI * 2 + i * 1.3, len = 12 + (i % 2) * 3 - i * 0.6 + die * 6;
    g.save(); g.globalAlpha *= 0.92 - i * 0.04;
    tatter(g, x0, -16, len, 4.4 - i * 0.2, -6 - i * 0.4 + S(ph) * 2.4 - die * 4, i % 2 ? WR.robe : dark(WR.robe, 0.05), 1.3);
    g.restore();
  }
  const sh = [-3 + L(10), -29], shN = [2.5 + L(12), -28.5];
  gauntletArm(g, sh, W.far, true, t, W.claw || 0);
  // hunched robe body, hem dissolving into ghost-light
  const sw = S(t * PI * 2) * 1;
  const body = blob([[-8.5 + L(6), -31], [-2 + L(11), -34.5], [7 + L(13), -31.5], [8 + L(8), -24], [6.5, -17.5], [7 + sw, -12.5], [3.5, -15], [0 + sw, -10.5], [-3, -14.5], [-7 + sw, -11.5], [-8.5, -16.5], [-9.5 + L(3), -24]], 0.6);
  toon(g, body, WR.robe, { sd: 2, hd: 1.6, lw: 1.5, light: '#3f6a6c', detail: q => {
    q.strokeStyle = alpha(WR.robeL, 0.9); q.lineWidth = 1; for (const x of [-4, 1.5]) { q.beginPath(); q.moveTo(x + L(10), -30); q.quadraticCurveTo(x + 1, -22, x - 0.5 + sw * 0.5, -13); q.stroke(); }
    const gr = q.createLinearGradient(0, -22, 0, -10); gr.addColorStop(0, alpha(TEAL, 0)); gr.addColorStop(1, alpha(TEAL, 0.4)); q.fillStyle = gr; q.fillRect(-12, -24, 24, 16);
  } });
  // ragged mantle over the shoulders
  toon(g, blob([[-9 + L(6), -30], [-3 + L(11), -35], [6 + L(13), -33], [9 + L(12), -28], [6 + L(11), -25.5], [3 + L(10), -27.5], [0 + L(9), -24.5], [-3 + L(8), -27.5], [-7 + L(6), -25.5]], 0.5), WR.robeL, { sd: 1, hd: 1.2, lw: 1.3, light: '#5a8a88' });
  g.restore();
  // the hem and rags thin out into nothing
  g.save(); g.globalCompositeOperation = 'destination-out';
  const fo = g.createLinearGradient(0, -13, 0, 1); fo.addColorStop(0, 'rgba(0,0,0,0)'); fo.addColorStop(1, 'rgba(0,0,0,0.8)');
  g.fillStyle = fo; g.fillRect(-40, -13, 80, 16); g.restore();
  // crowned helm (drops and fades when dying)
  const hy = -35 + die * die * 26, hx = 1.5 + L(16) + die * 3;
  g.save(); g.globalAlpha *= 1 - seg(die, 0.6, 1);
  crownedHelm(g, hx, hy, lean * 0.5 - (W.shriek || 0) * 0.4 + die * 0.9, (1 - seg(die, 0.2, 0.6)) * (W.eyes ?? 1), t);
  g.restore();
  g.save(); g.globalAlpha *= fade;
  gauntletArm(g, shN, W.near, false, t, W.claw || 0);
  g.restore();
  // unravelling into motes of ghost-light
  if (die > 0) for (let i = 0; i < 9; i++) { const u = clamp(die * 1.4 - i * 0.05, 0, 1), a = i * 0.7; if (u > 0 && u < 1) glow(g, C(a) * 8 * u + (i - 4) * 1.5, -22 - u * 18 + S(a) * 4, 6, TEAL, 0.5 * (1 - u)); }
  g.restore();
}
const WP = {
  hover(t, amp = 1) { const b = S(t * PI * 2); return { t, bob: b * 1.6 * amp, lean: 0.2, near: [15 + b * 1, -18 + b * 1.5], far: [12 - b * 1, -15.5 - b * 1.2], claw: 0.25 + b * 0.1 }; },
  attack(t) {
    const W = WP.hover(0.25), w = ease(seg(t, 0, 0.4)), s = ease(seg(t, 0.4, 0.58)), r = ease(seg(t, 0.62, 1));
    W.lean = 0.2 - 0.15 * w * (1 - s) + 0.25 * s * (1 - r);
    W.near = [lerp(lerp(15, 5, w), 20, s) * (1 - r) + 15 * r, lerp(lerp(-18, -40, w), -11, s) * (1 - r) - 18 * r];
    W.far = [lerp(12, 16, w) * (1 - r) + 12 * r, lerp(-15.5, -24, w) * (1 - r) - 15.5 * r];
    W.claw = lerp(0.25, 1, w) * (1 - s) + 0.1 * s; W.bob = -2 * w * (1 - s) + 1.5 * s * (1 - r);
    return W;
  },
  death(t) {
    const W = WP.hover(0.25), k = ease(seg(t, 0, 0.3));
    W.shriek = k; W.lean = lerp(0.2, -0.1, k); W.near = [lerp(15, 15, k), lerp(-18, -36, k)]; W.far = [lerp(12, 3, k), lerp(-15.5, -37, k)]; W.claw = 1;
    W.die = seg(t, 0.25, 1); W.bob = -2 * k;
    return W;
  },
};

// =====================================================================================
// GRAVE KNIGHT — drowned knight in rusted, barnacle-crusted plate; tattered surcoat; greatsword
// =====================================================================================
const gkRig = humanoid({ h: 48, headR: 7.4, torsoH: 15, torsoW: 13.5, chest: 1.12, thigh: 8.4, shin: 8, upper: 7.8, fore: 7.2, limbR: 3.3, legThick: 1.12, armThick: 1.1, lw: 1.6,
  sleeve: '#574c43', glove: '#433b35', pants: '#4f463e', shinColor: '#5b5047', boots: '#3b342f', footLen: 5 });
const GK = { plate: '#5b4f45', plateL: '#7d6e5f', coat: '#4a5134', coatD: '#363b25', emblem: '#a89458', blade: '#8d8a84' };
function barnacles(g, pts, s = 1) { for (const [x, y, r] of pts) { toon(g, ellipse(x, y, r * s, r * s * 0.8), '#d8ceb4', { sd: 0.4, hd: 0.3, lw: 0.9 }); flat(g, circle(x + 0.2, y - 0.1, r * s * 0.35), '#3a3028', 0); } }
function rustPatches(g, pts) { for (const [x, y, rx, ry, a] of pts) { g.fillStyle = alpha(RUST, 0.75); g.beginPath(); g.ellipse(x, y, rx, ry, a || 0, 0, PI * 2); g.fill(); } }
// greatsword in world coords: grip point (near hand) and blade angle
function greatsword(g, x, y, ang, glowK = 0) {
  g.save(); g.translate(x, y); g.rotate(ang);
  toon(g, rrect(-7, -1.3, 8.5, 2.6, 1), '#4a3a2c', { sd: 0.3, hd: 0.2, lw: 1.1 });               // grip
  toon(g, circle(-7.4, 0, 2), '#7a6a4a', { sd: 0.4, hd: 0.4, lw: 1.1 });                          // pommel
  toon(g, rrect(1.2, -5.2, 2.6, 10.4, 1.1), '#6a5a48', { sd: 0.4, hd: 0.4, lw: 1.2 });             // crossguard
  const L = 25, blade = poly([[3.6, -2.2], [L - 1, -2], [L + 2.4, 0], [L - 1, 2.1], [L * 0.62, 2.1], [L * 0.6, 1.2], [L * 0.56, 2.1], [3.6, 2.2]]);
  toon(g, blade, GK.blade, { sd: 1, hd: 0.8, lw: 1.3, light: '#b8b4a8', detail: q => {
    q.fillStyle = alpha(RUST, 0.7); for (const [bx, by, r] of [[8, 0.8, 1.6], [15, -0.6, 1.2], [21, 0.9, 1]]) { q.beginPath(); q.ellipse(bx, by, r * 1.6, r, 0, 0, PI * 2); q.fill(); }
    q.strokeStyle = alpha('#000', 0.3); q.lineWidth = 0.7; q.beginPath(); q.moveTo(4, 0); q.lineTo(L - 2, 0); q.stroke();
  } });
  if (glowK > 0) { glow(g, L * 0.55, 0, 14, TEAL, 0.4 * glowK); }
  g.restore();
}
function gkHelm(g, r, p) {
  const sw = S((p.t || 0) * PI * 2) * 0.6;
  toon(g, blob([[-r * 1.05, r * 0.95], [-r * 1.12, -r * 0.55], [-r * 0.55, -r * 1.18], [r * 0.55, -r * 1.2], [r * 1.12, -r * 0.6], [r * 1.18, r * 0.2], [r * 1.05, r * 0.95]], 0.55), GK.plate, { sd: 1.8, hd: 1.1, lw: 1.6, light: GK.plateL, detail: q => {
    rustPatches(q, [[-r * 0.5, -r * 0.6, r * 0.35, r * 0.2, 0.3], [r * 0.6, r * 0.55, r * 0.25, r * 0.18]]);
    q.fillStyle = alpha(VERD, 0.7); q.beginPath(); q.ellipse(r * 0.2, -r * 0.95, r * 0.4, r * 0.14, 0, 0, PI * 2); q.fill();
    q.fillStyle = '#0d0a08'; q.fillRect(r * 0.05, -r * 0.24, r * 1.2, r * 0.24);                      // eye slit
    q.fillStyle = '#1a1410'; for (const [hx, hy] of [[r * 0.75, r * 0.35], [r * 0.95, r * 0.5], [r * 0.75, r * 0.6]]) { q.beginPath(); q.arc(hx, hy, 0.45, 0, PI * 2); q.fill(); }
  } });
  toon(g, rrect(-r * 0.14, -r * 1.42, r * 0.28, r * 1.0, 0.5), dark(GK.plate, 0.05), { sd: 0.3, hd: 0.3, lw: 1.1 });    // crest ridge
  if (!p.eyesClosed) { glow(g, r * 0.75, -r * 0.12, r * 0.75, TEAL, 0.7 * (p.eyeK ?? 1)); flat(g, rrect(r * 0.2, -r * 0.2, r * 0.9, r * 0.14, 0.3), alpha(TEAL_C, p.eyeK ?? 1), 0); }
  barnacles(g, [[-r * 0.8, -r * 0.1, 1.1], [-r * 0.6, r * 0.25, 0.9], [-r * 0.85, r * 0.55, 0.8]]);
  strand(g, -r * 0.3, -r * 1.0, r * 1.3, -r * 0.6 + sw, WEED_D, 1.0);
}
function gkSkirt(g, J, p) {
  inTorso(g, J, q => {
    const sw = S((p.t || 0) * PI * 2) * 0.8;
    toon(q, poly([[-7.6, -2], [-1, -2], [-1.5 + sw, 9], [-3.4 + sw, 7.4], [-5 + sw, 10], [-7.2 + sw, 7.8], [-8.6 + sw, 9.4]]), GK.coatD, { sd: 0.8, hd: 0.4, lw: 1.3 });
    toon(q, poly([[1, -2], [8.8, -2], [9.6 + sw, 7.6], [7.6 + sw, 6.2], [5.6 + sw, 8.8], [3.4 + sw, 6.6], [1.4 + sw, 8.2]]), GK.coat, { sd: 0.8, hd: 0.4, lw: 1.3 });
    toon(q, rrect(-8, -3.4, 17.6, 2.8, 1), '#3a2e24', { sd: 0.4, hd: 0.3, lw: 1.1 });
    toon(q, rrect(3, -3.8, 3.2, 3.6, 0.6), RUST, { sd: 0.3, hd: 0.2, lw: 0.9 });
  });
}
const GRAVE = {
  back: (g, J, p) => inTorso(g, J, q => { // ragged half-cape
    const sw = S((p.t || 0) * PI * 2) * 1.2;
    toon(q, poly([[-6, -16], [-1, -16.5], [-3 + sw, 2], [-5 + sw, 0.4], [-7 + sw, 3.4], [-9 + sw, 0.8], [-10.4 + sw, 2.2], [-9.6, -10]]), GK.coatD, { sd: 1, hd: 0.4, lw: 1.3 });
  }),
  hips: (g, J, p) => gkSkirt(g, J, p),
  torso: (g, c, J, p) => inTorso(g, J, q => {
    const w = c.torsoW, h = c.torsoH;
    toon(q, torsoPath(c), GK.plate, { sd: 2.2, hd: 1.2, lw: 1.6, light: GK.plateL, detail: d => {
      rustPatches(d, [[-w * 0.2, -h * 0.75, 2.6, 1.6, 0.4], [w * 0.5, -h * 0.25, 1.8, 1.2]]);
      // tattered surcoat panel
      d.fillStyle = GK.coat; d.beginPath(); d.moveTo(-w * 0.02, -h * 1.05); d.lineTo(w * 0.55, -h * 1.05); d.lineTo(w * 0.62, 1); d.lineTo(w * 0.42, -1.6); d.lineTo(w * 0.3, 1); d.lineTo(w * 0.12, -2); d.lineTo(-w * 0.05, 1); d.closePath(); d.fill();
      d.strokeStyle = alpha('#000', 0.3); d.lineWidth = 0.8; d.stroke();
      d.fillStyle = GK.plate; d.beginPath(); d.ellipse(w * 0.4, -h * 0.35, 1.5, 1.1, 0.4, 0, PI * 2); d.fill();   // torn hole
      // faded crown emblem
      d.fillStyle = alpha(GK.emblem, 0.75); d.beginPath(); const ex = w * 0.27, ey = -h * 0.66; d.moveTo(ex - 2.4, ey + 1.6); d.lineTo(ex - 2.6, ey - 1.6); d.lineTo(ex - 1.2, ey - 0.2); d.lineTo(ex, ey - 2); d.lineTo(ex + 1.2, ey - 0.2); d.lineTo(ex + 2.6, ey - 1.6); d.lineTo(ex + 2.4, ey + 1.6); d.closePath(); d.fill();
    } });
    barnacles(q, [[-w * 0.4, -h * 0.9, 1.1], [-w * 0.48, -h * 0.6, 0.9], [-w * 0.3, -h * 0.45, 0.7]]);
  }),
  head: gkHelm,
  nearArm: (g, c, A, far, p) => {
    stdArm(g, c, A, false);
    toon(g, blob([[A.s[0] - 4.6, A.s[1] - 1], [A.s[0] - 1, A.s[1] - 4.4], [A.s[0] + 4, A.s[1] - 2.6], [A.s[0] + 4.4, A.s[1] + 2], [A.s[0] - 0.5, A.s[1] + 3.6], [A.s[0] - 4.4, A.s[1] + 2.4]], 0.6), GK.plate, { sd: 1.2, hd: 0.8, lw: 1.5, light: GK.plateL,
      detail: q => rustPatches(q, [[A.s[0] + 1.5, A.s[1] - 1, 1.6, 1, 0.5]]) });
    barnacles(g, [[A.s[0] - 2.2, A.s[1] - 2.2, 1.1], [A.s[0] + 0.4, A.s[1] - 3, 0.9], [A.s[0] - 3.4, A.s[1] + 0.2, 0.8]]);
    strand(g, A.s[0] - 3.6, A.s[1] + 1.5, 6, -1.2 + S((p.t || 0) * PI * 2) * 0.8, WEED_D, 1.0);
  },
  nearHand: (g, J, p, c) => {
    if (p.sword && p.sword[3]) { greatsword(g, p.sword[0], p.sword[1], p.sword[2], p.swordGlow || 0); toon(g, circle(J.na.hd[0], J.na.hd[1], c.limbR * 0.95), c.glove, { sd: 0.8, hd: 0.5, lw: c.lw }); }
  },
};
// place both hands on the greatsword grip (G = near hand, angle a); drop = sword not held
function gkGrip(p, G, a) {
  const J = gkRig.joints(p), c = gkRig.cfg;
  const F = [G[0] - C(a) * 4, G[1] - S(a) * 4];
  p.na = ik(J.na.s, G, c.upper, c.fore, 1); p.fa = ik(J.fa.s, F, c.upper, c.fore, 1);
  p.sword = [G[0], G[1], a, true];
  return p;
}
const GP = {
  walk(t) { const p = Pose.walk(t, { stride: 0.5, lean: 0.1, bobAmp: 1.6 }), b = S(t * PI * 4); p.t = t; return gkGrip(p, [10 + b * 0.5, -23 + Math.abs(S(t * PI * 2)) * 1.2], 0.42 + b * 0.03); },
  idle(t) { const p = Pose.idle(t); p.nl = [0.14, 0.06]; p.fl = [-0.16, 0.06]; p.t = t; return gkGrip(p, [11.5, -22.5 + p.bob * 0.6], 1.38); },
  attack(t) { // overhead two-handed cleave
    const p = basePose(); p.t = t;
    const w = ease(seg(t, 0, 0.3)), s = ease(seg(t, 0.3, 0.45)), r = ease(seg(t, 0.52, 1));
    p.lean = lerp(0.05, -0.18, w) * (1 - s) + 0.3 * s * (1 - r) + 0.05 * r;
    p.nl = [0.4 * s * (1 - r) + 0.1, 0.25 * s * (1 - r)]; p.fl = [-0.35 * s * (1 - r) - 0.1, 0.15]; p.bob = -1.5 * s * (1 - r); p.dx = 2.5 * s * (1 - r);
    const up = [lerp(10, -6, w), lerp(-23, -46, w)], dn = [17, -18], rest = [10, -23];
    const G = s > 0 ? [lerp(up[0], dn[0], s), lerp(up[1], dn[1], s)] : up;
    const a = s > 0 ? lerp(lerp(0.42, -2.55, w), 0.75, s) : lerp(0.42, -2.55, w);
    const Gf = [lerp(G[0], rest[0], r), lerp(G[1], rest[1], r)], af = lerp(a, 0.42, r);
    p.swordGlow = bell(t, 0.28, 0.6);
    return gkGrip(p, Gf, af);
  },
  kneel(k, f) { // shared by death (forward) and revive (reverse)
    const p = basePose();
    p.nl = [lerp(0.05, 0.6, k), lerp(0.05, 2.1, k) * (1 - f)]; p.fl = [lerp(-0.05, -0.2, k), lerp(0.05, 1.6, k) * (1 - f)];
    p.dy = k * 6.5 + f * 2; p.lean = lerp(0.05, 0.45, k) * (1 - f) + 0.1 * f; p.tilt = 0.25 * k;
    p.rot = f * PI / 2 * 0.95; p.dx = -f * 10;
    p.na = [lerp(0.6, 0.15, k) * (1 - f) + 2.6 * f, 0.3]; p.fa = [lerp(0.4, 0.1, k) * (1 - f) + 2.3 * f, 0.25];
    return p;
  },
  death(t) {
    const k = ease(seg(t, 0, 0.4)), f = seg(t, 0.4, 0.85), p = GP.kneel(k, f * f);
    p.eyeK = 1 - seg(t, 0.3, 0.7); p.eyesClosed = t > 0.7; p.t = 0.2;
    const u = seg(t, 0.1, 0.55); // the sword slips from the hands and falls flat
    p.sword = [lerp(12, 4, ease(u)), lerp(-22, -2, u * u), lerp(1.38, -0.04, ease(u)), false];
    return p;
  },
  revive(t) { // rises again in a surge of ghost-light, picking up the sword
    const k = 1 - ease(seg(t, 0.35, 1)), f = 1 - ease(seg(t, 0, 0.4)), p = GP.kneel(k, f * f);
    p.eyeK = seg(t, 0.1, 0.5); p.eyesClosed = t < 0.1; p.t = t;
    if (t < 0.5) { p.sword = [4, -2, -0.04, false]; p.swordGlow = bell(t, 0.1, 0.6); return p; }
    const u = ease(seg(t, 0.5, 1));
    return gkGrip(p, [lerp(14, 11.5, u), lerp(-9, -22.5, u)], lerp(0.1, 1.38, u));
  },
};

// =====================================================================================
// PLAGUEBEARER — bloated, stitched corpse in a sack hood swinging a censer of green fumes
// =====================================================================================
const pbRig = humanoid({ h: 50, headR: 6.6, torsoH: 19.5, torsoW: 19, belly: 8, chest: 0.78, thigh: 7.6, shin: 7.2, upper: 8.6, fore: 8, limbR: 3.4,
  legThick: 1.35, armThick: 1.15, lw: 1.6, skin: '#959a62', sleeve: '#959a62', glove: '#959a62', pants: '#5e4e36', shinColor: '#959a62', boots: '#6f7048', footLen: 4.6 });
const PB = { skin: '#959a62', bruise: '#6e5a72', boil: '#a6c43c', sack: '#7d6c4c', rag: '#5e4e36', fume: '#9ab83a', fumeD: '#6e8a2a', iron: '#4a4642' };
function fumes(g, x, y, t, n = 4, spread = 1, k = 1) {
  g.save(); g.globalAlpha *= 0.7 * k;
  for (let i = 0; i < n; i++) {
    const u = (t + i / n) % 1, a = -PI / 2 - 0.5 + (i % 3) * 0.45;
    const cx = x + C(a) * u * 11 * spread - u * 5, cy = y + S(a) * u * 12 * spread, r = 2.4 + u * 5 * spread;
    flat(g, circle(cx, cy, r), alpha(i % 2 ? PB.fume : PB.fumeD, 0.75 * (1 - u)), 0);
  }
  g.restore();
}
function bigCenser(g, x, y, ang, t, burst = 0) {
  const L = 9, cx = x + S(ang) * L, cy = y + C(ang) * L;
  chain(g, [[x, y + 1], [cx, cy - 3.6]], '#6b6560', 0.85);
  glow(g, cx, cy, 10 + burst * 8, PB.fume, 0.45 + burst * 0.3);
  toon(g, blob([[cx - 4.4, cy - 1.8], [cx, cy - 3.8], [cx + 4.4, cy - 1.8], [cx + 3.6, cy + 3.2], [cx, cy + 4.4], [cx - 3.6, cy + 3.2]], 0.7), PB.iron, { sd: 1, hd: 0.7, lw: 1.3, light: '#7a7670' });
  toon(g, blob([[cx - 3.6, cy - 1.6], [cx, cy - 6], [cx + 3.6, cy - 1.6]], 0.6), dark(PB.iron, 0.05), { sd: 0.4, hd: 0.4, lw: 1.2 });
  for (const dx of [-1.8, 0.4, 2.4]) flat(g, ellipse(cx + dx, cy + 0.8, 0.7, 1), '#d8ff7a', 0);
  fumes(g, cx, cy - 4, t, 4, 1 + burst, 1 + burst * 0.5);
}
function sackHood(g, r, p) {
  // rough sack tied at the neck, ragged mouth hole, sickly eye-light
  toon(g, blob([[-r * 1.1, r * 0.4], [-r * 1.05, -r * 0.6], [-r * 0.4, -r * 1.2], [r * 0.5, -r * 1.15], [r * 1.05, -r * 0.5], [r * 1.12, r * 0.4], [r * 0.7, r * 1.0], [-r * 0.4, r * 1.05]], 0.7), PB.sack, { sd: 1.6, hd: 0.8, lw: 1.5, detail: q => {
    q.strokeStyle = alpha('#3a2e1e', 0.5); q.lineWidth = 0.7; for (const y of [-0.6, -0.1, 0.4]) { q.beginPath(); q.moveTo(-r, r * y); q.lineTo(r * 1.1, r * y + 0.5); q.stroke(); }
    q.fillStyle = alpha('#5a4a30', 0.4); q.beginPath(); q.ellipse(r * 0.2, r * 0.8, r * 0.6, r * 0.25, 0, 0, PI * 2); q.fill();
  } });
  toon(g, blob([[-r * 0.85, -r * 0.75], [-r * 1.45, -r * 0.5], [-r * 1.75, r * 0.3], [-r * 1.35, r * 0.25], [-r * 1.05, -r * 0.2]], 0.5), dark(PB.sack, 0.05), { sd: 0.5, hd: 0.3, lw: 1.2 });   // floppy tied tip
  flat(g, blob([[r * 0.4, r * 0.38], [r * 0.95, r * 0.3], [r * 0.85, r * 0.62 + (p.mouth || 0) * r * 0.25], [r * 0.5, r * 0.7]], 0.5), '#1c140c', 0.6);
  for (const [x, y, s2] of [[r * 0.42, -r * 0.18, 1], [r * 0.9, -r * 0.14, 0.7]]) {
    flat(g, ellipse(x, y, r * 0.2 * s2, r * 0.16), '#1c140c', 0.6);
    if (!p.eyesClosed) { glow(g, x, y, r * 0.8 * s2, PB.boil, 0.6); flat(g, circle(x + 0.2, y, r * 0.07 * s2 + 0.2), '#efffb0', 0); }
  }
  iline(g, [[-r * 0.9, r * 0.95], [r * 0.6, r * 1.1]], '#8a6a3e', 1.2);   // neck rope
}
const PLAGUE = {
  back: (g, J, p) => inTorso(g, J, q => { // tattered burlap mantle on the hunched back
    const sw = S((p.t || 0) * PI * 2) * 0.8;
    toon(q, poly([[-6, -21], [3, -21.5], [-2 + sw, -8], [-5 + sw, -10], [-8 + sw, -6], [-11, -10], [-11.5, -16]]), dark(PB.sack, 0.08), { sd: 0.8, hd: 0.4, lw: 1.3 });
  }),
  farArm: (g, c, A) => { stdArm(g, c, A, true); bandage(g, A, true); },
  hips: (g, J, p) => inTorso(g, J, q => {
    const sw = S((p.t || 0) * PI * 2) * 0.7;
    toon(q, poly([[-9, -3], [9, -3], [9.6 + sw, 5.4], [6 + sw, 4], [3 + sw, 6.6], [-1 + sw, 4.4], [-4 + sw, 6.4], [-8.6 + sw, 4.6]]), PB.rag, { sd: 0.8, hd: 0.4, lw: 1.3 });
  }),
  torso: (g, c, J, p) => inTorso(g, J, q => {
    const sw = p.swell || 0, cc = Object.assign({}, c, { belly: c.belly + sw * 7, torsoW: c.torsoW + sw * 3 });
    const w = cc.torsoW, h = c.torsoH;
    toon(q, torsoPath(cc), PB.skin, { sd: 2.6, hd: 1.4, lw: 1.6, detail: d => {
      d.fillStyle = alpha('#f4f0c0', 0.25); d.beginPath(); d.ellipse(w * 0.5, -h * 0.4, w * 0.32, h * 0.22, -0.3, 0, PI * 2); d.fill();
      d.fillStyle = alpha(PB.bruise, 0.7); for (const [x, y, rx, ry] of [[w * 0.05, -h * 0.75, 3.4, 2.4], [w * 0.55, -h * 0.15, 2.6, 1.8], [-w * 0.3, -h * 0.35, 3, 2.2]]) { d.beginPath(); d.ellipse(x, y, rx, ry, 0.4, 0, PI * 2); d.fill(); }
      d.strokeStyle = alpha('#4a5a2a', 0.6); d.lineWidth = 0.7; for (const [x0, y0, x1, y1] of [[-w * 0.2, -h * 0.9, w * 0.2, -h * 0.55], [w * 0.7, -h * 0.75, w * 0.95, -h * 0.5], [-w * 0.35, -h * 0.15, w * 0.05, -h * 0.05]]) { d.beginPath(); d.moveTo(x0, y0); d.quadraticCurveTo((x0 + x1) / 2 + 2, (y0 + y1) / 2 - 1.5, x1, y1); d.stroke(); }
      // crude stitched seam across the belly
      d.strokeStyle = '#3a2a1e'; d.lineWidth = 0.9; d.beginPath(); d.moveTo(w * 0.15, -h * 0.72); d.quadraticCurveTo(w * 0.75, -h * 0.5, w * 0.62, -h * 0.12); d.stroke();
      for (let i = 0; i < 6; i++) { const u = i / 5, x = lerp(w * 0.2, w * 0.64, u) + S(u * PI) * w * 0.12, y = lerp(-h * 0.7, -h * 0.15, u); d.beginPath(); d.moveTo(x - 1.2, y - 0.6); d.lineTo(x + 1.2, y + 0.6); d.stroke(); }
      // boils, glowing when about to burst
      for (const [x, y, r] of [[w * 0.42, -h * 0.82, 1.4], [w * 0.78, -h * 0.35, 1.2], [-w * 0.1, -h * 0.5, 1.1]]) { d.fillStyle = PB.boil; d.beginPath(); d.arc(x, y, r * (1 + sw * 0.4), 0, PI * 2); d.fill(); d.fillStyle = '#e8ff9a'; d.beginPath(); d.arc(x - 0.3, y - 0.3, r * 0.4, 0, PI * 2); d.fill(); }
      if (sw > 0.3) { d.strokeStyle = alpha('#d8ff6a', sw); d.lineWidth = 1.1; for (const [x0, y0, x1, y1] of [[w * 0.3, -h * 0.6, w * 0.6, -h * 0.75], [w * 0.4, -h * 0.25, w * 0.75, -h * 0.4]]) { d.beginPath(); d.moveTo(x0, y0); d.lineTo((x0 + x1) / 2 + 1, (y0 + y1) / 2 + 1); d.lineTo(x1, y1); d.stroke(); } }
    } });
    toon(q, rrect(-w * 0.55, -h * 0.08, w * 1.15 + cc.belly * 0.5, 2.6, 1.2), '#7a5e38', { sd: 0.4, hd: 0.3, lw: 1.1 });   // rope belt
    if (sw > 0.3) glow(q, w * 0.4, -h * 0.45, 14 * sw, PB.fume, 0.5 * sw);
  }),
  head: sackHood,
  nearArm: (g, c, A) => { stdArm(g, c, A, false); bandage(g, A, false); },
  nearHand: (g, J, p) => { if (!p.noCenser) bigCenser(g, J.na.hd[0], J.na.hd[1] + 1, p.censer || 0, p.t || 0, p.burstC || 0); },
};
function bandage(g, A, far) {
  const col = far ? dark('#c8bc94', 0.1) : '#c8bc94';
  for (const u of [0.35, 0.6]) { const x = lerp(A.el[0], A.hd[0], u), y = lerp(A.el[1], A.hd[1], u), a = Math.atan2(A.hd[1] - A.el[1], A.hd[0] - A.el[0]) + PI / 2; iline(g, [[x - C(a) * 3.2, y - S(a) * 3.2], [x + C(a) * 3.2 + 0.6, y + S(a) * 3.2 + 0.8]], col, 1.3); }
}
const PBP = {
  walk(t) {
    const p = Pose.walk(t, { stride: 0.38, arm: 0.2, lean: 0.2, bobAmp: 1.8 }), ph = t * PI * 2;
    p.lean = 0.2 + S(ph * 2) * 0.03; p.tilt = S(ph) * 0.06;
    p.na = [0.75 + S(ph) * 0.12, 0.55]; p.fa = [0.15 - S(ph) * 0.15, 0.35];
    p.censer = -S(ph - 0.9) * 0.55; p.t = t; return p;
  },
  idle(t) { const p = Pose.idle(t), b = S(t * PI * 2); p.lean = 0.17; p.bob = b * 0.6; p.na = [0.7, 0.55]; p.fa = [0.12, 0.35]; p.censer = S(t * PI * 2 + 1) * 0.2; p.swell = 0.08 + b * 0.06; p.t = t; return p; },
  attack(t) { // censer swung overhead and smashed down in a burst of fumes
    const p = basePose(); p.t = t;
    const w = ease(seg(t, 0, 0.42)), s = ease(seg(t, 0.42, 0.58)), r = ease(seg(t, 0.62, 1));
    p.na = [lerp(0.75, -2.5, w) * (1 - s) + lerp(-2.5, 1.5, s) * s * (1 - r) + 0.75 * r * s, lerp(0.55, 0.9, w) * (1 - s) + 0.2 * s * (1 - r) + 0.55 * r * s];
    p.fa = [lerp(0.15, 0.7, w) * (1 - r) + 0.15 * r, 0.4];
    p.lean = lerp(0.18, -0.05, w) * (1 - s) + 0.4 * s * (1 - r) + 0.18 * r * s; p.bob = -2 * s * (1 - r);
    p.nl = [0.35 * s * (1 - r), 0.2]; p.fl = [-0.25, 0.15];
    p.censer = lerp(0, -2.2, w) * (1 - s) + lerp(-2.2, 0.9, s) * s * (1 - r) + 0.0 * r * s; p.burstC = bell(t, 0.48, 0.85);
    return p;
  },
  death(t) { // staggers, swells... and bursts
    const p = basePose(); p.t = t * 2;
    const k = ease(seg(t, 0, 0.45));
    p.lean = lerp(0.18, -0.12, k); p.tilt = -0.25 * k; p.na = [lerp(0.7, 1.8, k), 0.4]; p.fa = [lerp(0.15, 1.5, k), 0.4];
    p.nl = [0.25 * k, 0.3 * k]; p.fl = [-0.2 * k, 0.2 * k]; p.dy = 1.5 * k; p.mouth = k;
    p.swell = k * (1 + S(t * PI * 9) * 0.08); p.censer = 0.8 * k; p.noCenser = t > 0.3;
    return p;
  },
};
function plagueDeath(g, t) {
  const pop = seg(t, 0.5, 1);
  if (t < 0.3) { fig(g, pbRig, PBP.death(t), PLAGUE); return; }
  // the censer drops
  const cu = seg(t, 0.3, 0.6);
  g.save(); g.translate(lerp(14, 18, ease(cu)), lerp(-22, -4.4, cu * cu)); g.rotate(lerp(0, 1.4, ease(cu))); bigCenser(g, 0, -10, 0, t, 0); g.restore();
  if (pop <= 0) { fig(g, pbRig, PBP.death(t), PLAGUE); return; }
  // deflated remains: empty skin, rags and the sack hood (revealed as the cloud thins)
  g.save(); g.globalAlpha *= seg(pop, 0.15, 0.55);
  toon(g, blob([[-15, 0], [-12, -5], [-4, -7.5], [6, -6], [13, -3], [15, 0]], 0.7), PB.skin, { sd: 1.2, hd: 0.8, lw: 1.5, detail: q => { q.fillStyle = alpha(PB.bruise, 0.6); q.beginPath(); q.ellipse(-3, -3, 4, 2, 0, 0, PI * 2); q.fill(); q.strokeStyle = '#3a2a1e'; q.lineWidth = 0.9; q.beginPath(); q.moveTo(-8, -4); q.quadraticCurveTo(0, -6.5, 8, -3); q.stroke(); } });
  toon(g, poly([[-14, -1], [-6, -6], [-2, -1.5], [2, -5], [6, -1], [-14, 0]]), PB.rag, { sd: 0.6, hd: 0.4, lw: 1.3 });
  for (const [x, a] of [[-9, -0.5], [4, 0.4]]) { g.save(); g.translate(x, -5.5); g.rotate(a); boneL(g, 7, 1.3, '#d8ceb0', 1, 1); g.restore(); }
  g.save(); g.translate(-17, -5); g.rotate(-0.5); sackHood(g, 6.2, { eyesClosed: true }); g.restore();
  g.restore();
  // the burst: a big olive cloud that billows out and thins, with flying gobbets
  const R = rng(9), k = 1 - pop, grow = 0.75 + ease(pop) * 0.6;
  g.save(); g.globalAlpha *= clamp(1.25 - pop * 1.15, 0, 1);
  glow(g, 0, -20, 28 * grow, PB.fume, 0.8 * k + 0.2);
  for (let i = 0; i < 11; i++) {
    const a = -PI * (0.05 + R() * 0.9), d = (3 + R() * 13) * grow, r = (6 + R() * 6) * grow;
    flat(g, circle(C(a) * d * 1.3, -19 + S(a) * d * 0.8 + 6, r), alpha(i % 3 ? PB.fume : PB.fumeD, 0.55), 0);
  }
  flat(g, circle(0, -20, 9 * grow * k), alpha('#e8ff9a', 0.6 * k), 0);
  g.restore();
}

// =====================================================================================
// BOG HORROR — towering amalgam of mud, roots and bones with a huge vertical maw in its chest
// =====================================================================================
const HR = { mud: '#4b3a29', mudL: '#6b563a', root: '#5b4b3b', rootD: '#3b3027', moss: '#5c7a2c', bone: '#d6ccae', maw: '#1a100d' };
// H: { t, x, lean, bob, maw, gulp, near:[x,y], far:[x,y], feet:[[x,lift],[x,lift]], head, die, eyes }
function hBody(H, x, y) { const c = C(H.lean), s = S(H.lean), ox = H.x, oy = -24 + H.bob; return [ox + c * x - s * (y + 24), oy + s * x + c * (y + 24)]; }
function rootLimb(g, a, b, r0, r1, col) {
  toon(g, capsule(a[0], a[1], b[0], b[1], r0, r1), col, { sd: 1.4, hd: 0.7, lw: 1.8, detail: q => {
    q.strokeStyle = alpha(HR.rootD, 0.8); q.lineWidth = 1.2; const n = [-(b[1] - a[1]), b[0] - a[0]], L = Math.hypot(n[0], n[1]);
    for (const k of [-0.4, 0.35]) { q.beginPath(); q.moveTo(a[0] + n[0] / L * r0 * k, a[1] + n[1] / L * r0 * k); q.quadraticCurveTo((a[0] + b[0]) / 2 + n[0] / L * r0 * (k + 0.3), (a[1] + b[1]) / 2 + n[1] / L * r0 * (k + 0.3), b[0] + n[0] / L * r1 * k, b[1] + n[1] / L * r1 * k); q.stroke(); }
  } });
}
function braid(g, a, b, r0, r1, col, ph = 0) { // two twisted root strands with little offshoots
  const n = [-(b[1] - a[1]), b[0] - a[0]], L = Math.hypot(n[0], n[1]); n[0] /= L; n[1] /= L;
  for (const sd of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 6; i++) { const u = i / 6, w = S(u * PI * 2 + ph + (sd > 0 ? PI : 0)) * lerp(r0, r1, u) * 0.45; pts.push([lerp(a[0], b[0], u) + n[0] * w, lerp(a[1], b[1], u) + n[1] * w]); }
    const path = blob(pts, 0.5, false), w = lerp(r0, r1, 0.5) * 1.15;
    stroke(g, path, OUT, w + 2.2); stroke(g, path, sd > 0 ? col : dark(col, 0.07), w);
  }
  for (const u of [0.35, 0.7]) { const x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u), d = u > 0.5 ? 1 : -1; iline(g, [[x + n[0] * r0 * 0.6 * d, y + n[1] * r0 * 0.6 * d], [x + n[0] * (r0 + 3.5) * d + 1, y + n[1] * (r0 + 3.5) * d + 2]], col, 1); }
}
function hArm(g, H, sh, hand, far) {
  const s = hBody(H, sh[0], sh[1]);
  const [ua, rel] = ik(s, hand, 21, 21, 1);
  const el = [s[0] + S(ua) * 21, s[1] + C(ua) * 21], fa = ua + rel;
  const col = far ? dark(HR.mud, 0.08) : HR.mud, rc = far ? dark(HR.root, 0.08) : HR.root;
  braid(g, s, el, 5.4, 4.2, col, 0.4);
  braid(g, el, hand, 4.2, 3.2, rc, 1.3);
  toon(g, circle(el[0], el[1], 4.4), col, { sd: 0.8, hd: 0.5, lw: 1.6 });   // knotted elbow
  // root-claw hand: long splayed fingers
  for (const k of [-0.55, -0.15, 0.25, 0.6]) {
    const a = fa + k, len = 9 - Math.abs(k) * 3, tip = [hand[0] + S(a) * len, hand[1] + C(a) * len], mid = [hand[0] + S(a - 0.25) * len * 0.55, hand[1] + C(a - 0.25) * len * 0.55];
    const f = new Path2D(); f.moveTo(hand[0], hand[1]); f.quadraticCurveTo(mid[0], mid[1], tip[0], tip[1]);
    stroke(g, f, OUT, 4.2); stroke(g, f, rc, 2.4);
  }
  toon(g, circle(hand[0], hand[1], 4.4), rc, { sd: 0.8, hd: 0.5, lw: 1.6 });
  if (!far && H.t !== undefined) drips(g, hand[0] - 1, hand[1] + 3, H.t, 1, 10, 0.3, '#6b563a');
  if (!far) strand(g, el[0] - 1, el[1] + 2, 9, -1.5 + S((H.t || 0) * PI * 2) * 1.5, WEED, 1.2);
}
function hLeg(g, H, hip, foot, far) {
  const h = hBody(H, hip[0], hip[1]);
  const [ua, rel] = ik(h, [foot[0], -2 - foot[1]], 13, 12, 1);
  const kn = [h[0] + S(ua) * 13, h[1] + C(ua) * 13], ft = [kn[0] + S(ua + rel) * 12, kn[1] + C(ua + rel) * 12];
  const col = far ? dark(HR.mud, 0.1) : HR.mud;
  rootLimb(g, h, kn, 8, 6.5, col); rootLimb(g, kn, ft, 6.5, 5.5, col);
  for (const k of [-1, 0, 1, 2]) { const tip = [ft[0] + k * 3.4 + 2, ft[1] + 2.2], f = new Path2D(); f.moveTo(ft[0], ft[1]); f.quadraticCurveTo(ft[0] + k * 2, ft[1] + 2.5, tip[0] + 1.5, tip[1] - 0.3); stroke(g, f, OUT, 3.8); stroke(g, f, far ? dark(HR.root, 0.1) : HR.root, 2.2); }
}
function tendril(g, H, base, ang, len, ph, w = 3) { // tapered, writhing root
  const [bx, by] = hBody(H, base[0], base[1]), L = [], R = [];
  for (let i = 0; i <= 8; i++) {
    const u = i / 8, a = ang + S(ph + u * 3) * 0.55 * u, x = bx + C(a) * len * u + S(ph * 0.7 + u * 4) * 2 * u, y = by + S(a) * len * u;
    const r = w * (1 - u * 0.85), n = a + PI / 2;
    L.push([x + C(n) * r, y + S(n) * r]); R.push([x - C(n) * r, y - S(n) * r]);
  }
  toon(g, blob([...L, ...R.reverse()], 0.5), HR.root, { sd: 0.8, hd: 0.5, lw: 1.6 });
}
function hHead(g, H) { // a lump of mud with a hollow face-cavity and cold eyes, under a brow of roots
  const [hx, hy] = hBody(H, 13, -67);
  g.save(); g.translate(hx, hy); g.rotate(H.lean * 0.5 + (H.head || 0));
  toon(g, blob([[-7, 5], [-8, -3], [-3, -8.5], [4, -8], [9, -3.5], [10.5, 3], [6, 7.5], [-2, 8]], 0.7), HR.mud, { sd: 1.6, hd: 1, lw: 1.8, light: HR.mudL });
  const jaw = (H.jaw || 0);
  flat(g, blob([[0.5, -3.6], [8, -3.2], [9.2, 1.5 + jaw * 2.5], [5, 4.5 + jaw * 3], [0.5, 2.5]], 0.6), '#140c09', 0);
  for (const [x, y] of [[6.4, 3.6 + jaw * 2.6], [3.6, 3.4 + jaw * 2.2]]) flat(g, poly([[x - 0.9, y + 0.3], [x, y - 2], [x + 0.9, y + 0.3]]), HR.bone, 0.6);
  const e = H.eyes ?? 1;
  if (e > 0) { glow(g, 5, -1, 9, TEAL, 0.85 * e); for (const [x, y, r] of [[3.4, -1.2, 1.1], [6.6, -1.6, 0.9], [5.2, 0.8, 0.6]]) flat(g, circle(x, y, r), alpha(TEAL_C, e), 0); }
  for (const [x0, y0, x1, y1, cx, cy] of [[-6, -4, 10, -5, 2, -12], [-4, -7, 7, -9, 0, -14]]) { const r = new Path2D(); r.moveTo(x0, y0); r.quadraticCurveTo(cx, cy, x1, y1); icurve(g, r, HR.root, 2.2); }
  g.restore();
}
function horror(g, H) {
  const t = H.t || 0, die = H.die || 0;
  g.save();
  if (die > 0) { const k = ease(seg(die, 0.15, 1)); g.scale(1 + k * 0.3, 1 - k * 0.72); g.globalAlpha *= 1 - seg(die, 0.5, 0.92); }
  const P = (x, y) => hBody(H, x, y);
  // far side: tendril, arm, leg
  tendril(g, H, [-16, -70], -2.6, 24, t * PI * 2, 3.8);
  hArm(g, H, [-1, -64], H.far, true);
  hLeg(g, H, [-6, -26], H.feet[1], true);
  // bone spines jutting from the hump
  for (const [x, y, a, L] of [[-20, -62, -2.5, 13], [-23, -50, -2.8, 11], [-23, -38, -3.0, 9]]) { const p0 = P(x, y), p1 = [p0[0] + C(a + H.lean) * L, p0[1] + S(a + H.lean) * L]; toon(g, capsule(p0[0], p0[1], p1[0], p1[1], 2, 1.1), HR.bone, { sd: 0.6, hd: 0.4, lw: 1.5 }); }
  // body mass
  const maw = H.maw || 0, mw = maw * 10;
  const body = blob([P(-14, -21), P(-20, -27), P(-24, -36), P(-26.5, -45), P(-25, -54), P(-23, -62), P(-18, -70), P(-13, -76.5), P(-8, -79), P(-2, -80.5), P(4, -77), P(8.5, -75.5), P(12, -71), P(16, -66), P(17, -60), P(19, -53), P(18.5, -46), P(18.2, -38), P(17, -31), P(14.5, -25), P(11, -21), P(5, -18.5), P(-2, -18), P(-8, -19)], 0.6);
  toon(g, body, HR.mud, { sd: 3.4, hd: 1.8, lw: 2, light: HR.mudL, detail: q => {
    q.fillStyle = alpha('#9a8462', 0.35); for (const [x, y, rx, ry] of [[-12, -68, 6, 2.4], [2, -74, 4, 1.6]]) { const [a, b] = P(x, y); q.beginPath(); q.ellipse(a, b, rx, ry, H.lean - 0.3, 0, PI * 2); q.fill(); }
    q.fillStyle = HR.moss; for (const [x, y, rx, ry] of [[-6, -77, 9, 3.4], [-19, -66, 5, 3.6], [8, -73, 5, 2.4]]) { const [a, b] = P(x, y); q.beginPath(); q.ellipse(a, b, rx, ry, H.lean, 0, PI * 2); q.fill(); }
    q.fillStyle = alpha('#2a2018', 0.35); for (const [x, y, rx, ry] of [[-14, -40, 5, 7], [-6, -26, 6, 3]]) { const [a, b] = P(x, y); q.beginPath(); q.ellipse(a, b, rx, ry, H.lean, 0, PI * 2); q.fill(); }
    // wet drip streaks, cracks and embedded stones
    q.lineCap = 'round';
    for (const [x, y, l] of [[-20, -60, 9], [-12, -70, 12], [-2, -74, 8], [8, -68, 10], [-24, -46, 7]]) { const [a, b] = P(x, y), [c, d] = P(x + 0.5, y + l); q.strokeStyle = alpha('#9a8462', 0.4); q.lineWidth = 1.6; q.beginPath(); q.moveTo(a, b); q.lineTo(c, d); q.stroke(); q.fillStyle = alpha('#9a8462', 0.45); q.beginPath(); q.arc(c, d + 0.6, 1.2, 0, PI * 2); q.fill(); }
    q.strokeStyle = alpha('#1e150e', 0.55); q.lineWidth = 1;
    for (const pts of [[[-18, -34], [-14, -30], [-15, -25]], [[-4, -62], [-1, -57], [-5, -52]], [[10, -40], [12, -34]]]) { q.beginPath(); pts.forEach(([x, y], i) => { const [a, b] = P(x, y); i ? q.lineTo(a, b) : q.moveTo(a, b); }); q.stroke(); }
    for (const [x, y, r] of [[-20, -50, 1.8], [-8, -32, 1.5], [2, -66, 1.3]]) { const [a, b] = P(x, y); q.fillStyle = '#7a7268'; q.beginPath(); q.arc(a, b, r, 0, PI * 2); q.fill(); q.fillStyle = alpha('#000', 0.3); q.beginPath(); q.arc(a + 0.4, b + 0.4, r * 0.7, 0, PI * 2); q.fill(); }
    q.lineCap = 'round';
    for (const pts of [[[-24, -46], [-12, -54], [-2, -48]], [[-22, -30], [-10, -36], [0, -28]], [[-16, -72], [-22, -58], [-18, -42]], [[0, -76], [-4, -64], [-2, -56]]]) {
      const pp = pts.map(([x, y]) => P(x, y)), path = new Path2D(); path.moveTo(...pp[0]); path.quadraticCurveTo(...pp[1], ...pp[2]);
      q.strokeStyle = OUT; q.lineWidth = 4.6; q.stroke(path); q.strokeStyle = HR.root; q.lineWidth = 2.8; q.stroke(path);
    }
  } });
  // the maw on the chest: a vertical split lined with bone teeth, glowing from within
  const top = P(7.5, -61), bot = P(6.5, -28), mid = P(7 + mw * 0.15, -44.5);
  const m = new Path2D(); m.moveTo(...top); m.quadraticCurveTo(mid[0] + 1 + mw * 1.9, mid[1], bot[0], bot[1]); m.quadraticCurveTo(mid[0] - 1 - mw * 1.9, mid[1], top[0], top[1]);
  toon(g, m, HR.maw, { sd: 0, hd: 0, lw: 2, detail: q => {
    glow(q, mid[0], mid[1] + 3, 7 + mw * 1.6, TEAL, 0.45 + maw * 0.35);
    if (maw > 0.2) { q.fillStyle = '#5a1e1e'; q.beginPath(); q.ellipse(mid[0], mid[1] + 9, mw * 0.8, 4, 0, 0, PI * 2); q.fill(); }
  } });
  for (let i = 1; i < 8; i++) {
    const u = i / 8, x = lerp(top[0], bot[0], u), y = lerp(top[1], bot[1], u), bulge = S(u * PI) * (1 + mw * 0.95);
    for (const sd of [-1, 1]) flat(g, poly([[x + sd * bulge, y - 1.5], [x + sd * bulge - sd * (2.4 + maw * 1.6), y + 0.2], [x + sd * bulge, y + 1.5]]), HR.bone, 0.8);
  }
  // swallow bulge travelling down the body
  if (H.gulp > 0 && H.gulp < 1) { const [gx, gy] = P(-2 + H.gulp * 2, lerp(-46, -26, H.gulp)); toon(g, ellipse(gx, gy, 8, 6.4), HR.mud, { sd: 2, hd: 1.2, lw: 1.8, light: HR.mudL }); }
  tendril(g, H, [-4, -77], -2.45, 15, t * PI * 2 + 2, 3.2);
  tendril(g, H, [-10, -76], -2.75, 20, t * PI * 2 + 4, 3.8);
  hHead(g, H);
  hLeg(g, H, [6, -26], H.feet[0], false);
  hArm(g, H, [10, -55], H.near, false);
  // weeds dripping off the shoulders
  for (const [x, y, l] of [[4, -75, 11], [-18, -67, 13], [14, -62, 8]]) { const [a, b] = P(x, y); strand(g, a, b, l, -1.5 + S(t * PI * 2 + x) * 1.2, WEED, 1.3); }
  g.restore();
}
const HP = {
  base(t) { return { t, x: 0, lean: 0.12, bob: 0, maw: 0, gulp: 0, near: [31, -7], far: [22, -9], feet: [[7, 0], [-6, 0]], head: 0, jaw: 0.2 }; },
  walk(t) {
    const H = HP.base(t), ph = t * PI * 2, s = S(ph), c = C(ph);
    H.feet = [[7 + s * 7, Math.max(0, -c) * 4], [-6 - s * 7, Math.max(0, c) * 4]];
    H.bob = -Math.abs(s) * 2 + 1; H.lean = 0.13 + S(ph * 2) * 0.02;
    H.near = [30 + s * 6, -7 - Math.max(0, s) * 5]; H.far = [21 - s * 6, -9 - Math.max(0, -s) * 5];
    H.head = S(ph * 2) * 0.04; return H;
  },
  idle(t) { const H = HP.base(t), b = S(t * PI * 2); H.bob = b * 0.8; H.maw = 0.06 + b * 0.05; H.jaw = 0.2 + b * 0.1; H.near = [30, -8 + b]; H.far = [21, -9 - b]; return H; },
  attack(t) { // raises the near arm and slams it down
    const H = HP.base(t), w = ease(seg(t, 0, 0.3)), s = ease(seg(t, 0.3, 0.45)), r = ease(seg(t, 0.52, 1));
    H.near = s > 0 ? [lerp(16, 38, s) * (1 - r) + 31 * r, lerp(-90, -4, s) * (1 - r) - 7 * r] : [lerp(31, 16, w), lerp(-7, -90, w)];
    H.lean = lerp(0.12, -0.08, w) * (1 - s) + 0.28 * s * (1 - r) + 0.12 * r; H.bob = -2 * s * (1 - r); H.x = 3 * s * (1 - r);
    H.jaw = 0.2 + w * 0.6 * (1 - r); H.head = -0.2 * w * (1 - s); return H;
  },
  devour(t) { // rears back, maw splits open, lunges and gulps
    const H = HP.base(t), o = ease(seg(t, 0, 0.3)), l = ease(seg(t, 0.3, 0.45)), shut = ease(seg(t, 0.48, 0.58)), r = ease(seg(t, 0.75, 1));
    H.maw = Math.min(1, o * 1.1) * (1 - shut);
    H.lean = lerp(0.12, -0.12, o) * (1 - l) + 0.42 * l * (1 - r) + 0.12 * r; H.x = 12 * l * (1 - r);
    H.near = [lerp(31, 36, o) + 6 * l * (1 - shut) - 12 * shut * (1 - r), lerp(-7, -44, o) * (1 - l) - 32 * l * (1 - r) - 7 * r];
    H.far = [lerp(22, 30, o) + 4 * l - 10 * shut * (1 - r), lerp(-9, -50, o) * (1 - l) - 36 * l * (1 - r) - 9 * r];
    H.gulp = seg(t, 0.58, 0.9); H.bob = S(seg(t, 0.58, 0.9) * PI * 3) * 1.2; H.head = -0.25 * o * (1 - l) + 0.1 * l * (1 - r); H.jaw = 0.2 + o * 0.5;
    return H;
  },
  death(t) {
    const H = HP.base(t * 0.5), k = ease(seg(t, 0, 0.3));
    H.maw = 0.6 * k * (1 - seg(t, 0.5, 0.8)); H.lean = lerp(0.12, -0.2, k); H.head = -0.4 * k; H.jaw = 0.8 * k;
    H.near = [lerp(31, 36, k), lerp(-7, -30, k)]; H.far = [lerp(22, 8, k), lerp(-9, -40, k)];
    H.die = seg(t, 0.25, 1); H.eyes = 1 - seg(t, 0.3, 0.7);
    return H;
  },
};
function horrorDeath(g, t) {
  const H = HP.death(t), d = H.die;
  horror(g, H);
  if (d > 0) { // slumping into a mound of mud, bones spilling out
    const k = ease(seg(d, 0.3, 1));
    g.save(); g.globalAlpha *= k;
    toon(g, blob([[-34, 0], [-28, -9], [-12, -16], [6, -15], [24, -9], [34, 0]], 0.7), HR.mud, { sd: 2.4, hd: 1.4, lw: 2, light: HR.mudL, detail: q => { q.fillStyle = HR.moss; q.beginPath(); q.ellipse(-8, -14, 9, 3, 0, 0, PI * 2); q.fill(); } });
    for (const [x, y, a, L] of [[-18, -8, -0.4, 12], [8, -10, 0.5, 10], [-4, -13, 2.6, 9]]) { g.save(); g.translate(x, y); g.rotate(a); boneL(g, L, 1.8, HR.bone, 1, 1.2); g.restore(); }
    g.save(); g.translate(16, -11); g.rotate(0.25); toon(g, ellipse(0, 0, 4.2, 3.8), HR.bone, { sd: 1, hd: 0.6, lw: 1.4 }); flat(g, ellipse(1.5, -0.4, 1.2, 1.1), '#1a120c', 0); flat(g, ellipse(-1.4, -0.3, 1, 1), '#1a120c', 0); g.restore();
    strand(g, -22, -6, 6, -2, WEED, 1.3);
    g.restore();
  }
}

// =====================================================================================
// LORD VARKAS MORROW — fallen lord in black & wine-red plate under the burning Ember Crown
// =====================================================================================
const vkRig = humanoid({ h: 110, headR: 8.8, torsoH: 30, torsoW: 17.5, chest: 1.3, thigh: 23, shin: 22, upper: 17, fore: 16, limbR: 4.8, legThick: 1.05, armThick: 1.05, lw: 2,
  sleeve: '#2c272f', glove: '#26222a', pants: '#2a252c', shinColor: '#2f2a32', boots: '#211d24', footLen: 7.5 });
const VK = { plate: '#2c272f', plateL: '#4c4452', wine: '#6a1a34', wineL: '#8e2a48', gold: '#b8903c', goldD: '#7a5a22', cape: '#5c1730', capeIn: '#1c171c', skin: '#c9bcb4', hair: '#262127' };
function flames(g, x, y, ang, len, t, k = 1, n = 5) { // tongues of fire along a direction, rising upward in world space
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, fx = x + C(ang) * len * u, fy = y + S(ang) * len * u;
    const h = (4.5 + S(t * PI * 6 + i * 2.3) * 1.8) * k * (1 - u * 0.3), w = 2.6 * k, lean = S(t * PI * 4 + i) * 0.8 - 0.8;
    flat(g, blob([[fx - w, fy + 1], [fx - w * 0.6, fy - h * 0.5], [fx + lean, fy - h], [fx + w * 0.6, fy - h * 0.45], [fx + w, fy + 1]], 0.7), alpha(EMBER, 0.6), 0);
    flat(g, blob([[fx - w * 0.5, fy + 0.6], [fx + lean * 0.5, fy - h * 0.55], [fx + w * 0.5, fy + 0.6]], 0.7), alpha(EMBER_H, 0.75), 0);
  }
  g.restore();
}
function vkSword(g, x, y, ang, t, fire = 1) { // flaming longsword, grip at (x,y), blade along ang
  g.save(); g.translate(x, y); g.rotate(ang);
  toon(g, rrect(-7.5, -1.5, 9, 3, 1.2), '#2a1a1c', { sd: 0.3, hd: 0.2, lw: 1.3 });
  toon(g, circle(-8.2, 0, 2.4), VK.gold, { sd: 0.5, hd: 0.5, lw: 1.3 });
  // raven-wing crossguard
  toon(g, blob([[1.4, -1.6], [2.6, -6.6], [4.6, -8.6], [3.8, -4.4], [4, 0], [3.8, 4.4], [4.6, 8.6], [2.6, 6.6], [1.4, 1.6]], 0.5), VK.gold, { sd: 0.6, hd: 0.5, lw: 1.3 });
  const L = 34, blade = poly([[4, -2.3], [L - 2, -1.7], [L + 2.4, 0], [L - 2, 1.7], [4, 2.3]]);
  if (fire > 0) glow(g, L * 0.55, 0, 16 * fire, EMBER, 0.35 * fire);
  toon(g, blade, '#3a3238', { sd: 1, hd: 0.6, lw: 1.4, light: '#6a5e66', detail: q => {
    q.fillStyle = alpha(EMBER, 0.85 * fire + 0.15); q.fillRect(4, 0.9, L, 1.2);   // glowing edge
    q.strokeStyle = alpha('#ff5a1a', 0.6); q.lineWidth = 0.8; q.beginPath(); q.moveTo(6, -0.4); q.lineTo(L - 4, -0.2); q.stroke();
  } });
  g.restore();
  if (fire > 0) bladeFire(g, x, y, ang, 7, L + 1, t, fire);
}
// continuous sheath of flame hugging a blade from d0 to d1 along ang; tongues lean upward in world space
function bladeFire(g, x, y, ang, d0, d1, t, k = 1) {
  const n = 12, top = [], core = [], bot = [];
  const nx = S(ang), ny = -C(ang), up = ny < 0 ? 1 : -1;            // blade normal pointing upward
  for (let i = 0; i <= n; i++) {
    const u = i / n, d = lerp(d0, d1, u), bx = x + C(ang) * d, by = y + S(ang) * d;
    const h = (3.2 + 2.2 * S(t * PI * 6 + u * 11) + 1.2 * S(t * PI * 10 + u * 23)) * k * (1 - u * 0.45) + 1;
    top.push([bx + nx * up * h * 0.6 + S(t * PI * 4 + u * 7) * 0.6, by + ny * up * h * 0.6 - h * 0.65]);
    core.push([bx + nx * up * h * 0.25, by + ny * up * h * 0.25 - h * 0.3]);
    bot.push([bx - nx * up * 1.6, by - ny * up * 1.6 + 0.6]);
  }
  top.push([x + C(ang) * (d1 + 3), y + S(ang) * (d1 + 3) - 2 * k]);
  g.save(); g.globalCompositeOperation = 'lighter';
  flat(g, blob([...bot, ...top.reverse()], 0.5), alpha(EMBER, 0.62), 0);
  flat(g, blob([...bot.slice(1, -1), ...core.slice(1, -1).reverse()], 0.5), alpha(EMBER_H, 0.7), 0);
  g.restore();
}
function emberCrown(g, r, t, flare = 0, lit = 1) {
  // black iron crown band with tall points, ember gems; flames rise from the points
  const pts = [[-r * 0.95, -r * 0.55], [-r * 1.05, -r * 1.35], [-r * 0.6, -r * 0.95], [-r * 0.25, -r * 1.6], [r * 0.12, -r * 1.0], [r * 0.45, -r * 1.55], [r * 0.7, -r * 0.95], [r * 1.0, -r * 1.3], [r * 0.95, -r * 0.5]];
  if (lit > 0) {
    glow(g, 0, -r * 1.7, r * (1.6 + flare * 1.6), EMBER, (0.4 + flare * 0.4) * lit);
    for (const [px, py, k] of [[-r * 1.05, -r * 1.35, 0.8], [-r * 0.25, -r * 1.6, 1.1], [r * 0.45, -r * 1.55, 1], [r * 1.0, -r * 1.3, 0.75]]) flames(g, px - 1.2, py + 0.6, -PI / 2 - 0.15, 2.4, t + px * 0.01, (1.5 + flare * 1.2) * k * lit, 1);
  }
  toon(g, poly(pts), '#25202a', { sd: 0.8, hd: 0.6, lw: 1.6, light: '#5a5060', detail: q => {
    q.fillStyle = alpha(VK.gold, 0.85); q.fillRect(-r * 1.1, -r * 0.72, r * 2.2, r * 0.14);
    q.strokeStyle = alpha('#ff7a20', 0.9 * lit); q.lineWidth = 0.8; q.beginPath(); q.moveTo(-r * 0.6, -r * 0.6); q.lineTo(-r * 0.45, -r * 1.0); q.moveTo(r * 0.3, -r * 0.62); q.lineTo(r * 0.42, -r * 1.1); q.stroke();
  } });
  for (const [x, y] of [[-r * 0.6, -r * 0.78], [r * 0.12, -r * 0.8], [r * 0.7, -r * 0.78]]) { flat(g, circle(x, y, r * 0.11), lit > 0 ? '#ffb04a' : '#5a3020', 0.8); if (lit > 0) glow(g, x, y, r * 0.5, EMBER, 0.7 * lit); }
}
function vkHead(g, r, p) {
  const t = p.t || 0, sw = S(t * PI * 2) * 0.6;
  // long dark hair swept back, silver-streaked
  toon(g, blob([[r * 0.3, -r * 0.92], [-r * 0.5, -r * 1.0], [-r * 1.05, -r * 0.4], [-r * 1.2 + sw * 0.4, r * 0.6], [-r * 0.9 + sw * 0.5, r * 1.2], [-r * 0.45, r * 0.75], [-r * 0.2, -r * 0.2]], 0.7), VK.hair, { sd: 1.2, hd: 0.8, lw: 1.6, light: '#4a4248' });
  // gaunt, long face with an aquiline nose
  const face = blob([[-r * 0.55, r * 0.6], [-r * 0.75, -r * 0.2], [-r * 0.35, -r * 0.9], [r * 0.5, -r * 0.82], [r * 0.82, -r * 0.4], [r * 0.86, -r * 0.12], [r * 1.12, r * 0.24], [r * 0.88, r * 0.34], [r * 0.9, r * 0.5], [r * 0.78, r * 0.92], [r * 0.3, r * 1.0]], 0.6);
  toon(g, face, VK.skin, { sd: 1.6, hd: 0.9, lw: 1.6, light: '#f0e8e0', detail: q => {
    q.fillStyle = alpha('#5a4250', 0.55); q.beginPath(); q.moveTo(r * 0.2, r * 0.15); q.quadraticCurveTo(r * 0.55, r * 0.3, r * 0.45, r * 0.7); q.quadraticCurveTo(r * 0.15, r * 0.55, r * 0.2, r * 0.15); q.fill();   // hollow cheek
    q.fillStyle = alpha('#3a2a34', 0.6); q.beginPath(); q.ellipse(r * 0.55, -r * 0.15, r * 0.32, r * 0.2, -0.1, 0, PI * 2); q.fill();   // sunken eye
  } });
  // hair over the brow, silver streak
  toon(g, blob([[r * 0.62, -r * 0.62], [r * 0.2, -r * 1.02], [-r * 0.6, -r * 0.95], [-r * 0.85, -r * 0.45], [-r * 0.3, -r * 0.62]], 0.7), VK.hair, { sd: 0.8, hd: 0.6, lw: 1.4, light: '#4a4248' });
  line(g, [[r * 0.25, -r * 0.88], [-r * 0.4, -r * 0.8], [-r * 0.85, -r * 0.3]], '#9a929a', 1.1);
  // pointed beard, thin mouth, brow and the ember eye
  toon(g, blob([[r * 0.5, r * 0.72], [r * 0.84, r * 0.68], [r * 0.78, r * 0.98], [r * 0.64, r * 1.3], [r * 0.52, r * 0.98]], 0.6), VK.hair, { sd: 0.6, hd: 0.4, lw: 1.2, light: '#4a4248' });
  line(g, [[r * 0.58, r * 0.53], [r * 0.88, r * 0.47]], '#3a1a20', 1);
  line(g, [[r * 0.28, -r * 0.5], [r * 0.86, -r * 0.27]], VK.hair, 2.1);
  if (p.eyesClosed) line(g, [[r * 0.4, -r * 0.14], [r * 0.72, -r * 0.1]], OUT, 1.2);
  else { glow(g, r * 0.6, -r * 0.13, r * 1.2, EMBER, 0.9); flat(g, ellipse(r * 0.6, -r * 0.13, r * 0.22, r * 0.095, 0.12), '#ffe8b0', 0.6, '#7a2a08'); }
  if (!p.noCrown) emberCrown(g, r, t, p.flare || 0, p.crownLit ?? 1);
}
function vkCape(g, J, p) {
  const t = p.t || 0, sw = S(t * PI * 2), lift = p.capeLift || 0, trail = p.capeTrail ?? 1;
  const n = J.neck, hp = J.hip;
  const top = [n[0] - 7, n[1] + 4], topF = [n[0] + 3, n[1] + 3];
  const hemY = Math.min(-2, -2 - lift * 30), back = hp[0] - 20 - trail * 10 - sw * 2.5 - lift * 14;
  const hem = []; const N = 7;
  for (let i = 0; i <= N; i++) { const u = i / N; hem.push([lerp(back, hp[0] + 2, u) + S(t * PI * 2 + u * 4) * 1.5, hemY + (i % 2 ? -4 : 0) - u * 2 + S(u * 9 + t * 6) * 1]); }
  const cape = new Path2D();
  cape.moveTo(topF[0], topF[1]); cape.quadraticCurveTo(hp[0] + 6, hp[1] - 6, hem[N][0], hem[N][1]);
  for (let i = N; i >= 0; i--) cape.lineTo(hem[i][0], hem[i][1]);
  cape.quadraticCurveTo(back + 8 - lift * 10, (top[1] + hemY) / 2 - lift * 10, top[0], top[1]); cape.closePath();
  toon(g, cape, VK.cape, { sd: 3, hd: 1.4, lw: 2, light: VK.wineL, detail: q => {
    q.strokeStyle = alpha('#1c0a12', 0.55); q.lineWidth = 1.2;
    for (const u of [0.25, 0.5, 0.75]) { q.beginPath(); q.moveTo(lerp(top[0], topF[0], u), top[1] + 3); q.quadraticCurveTo(lerp(back, hp[0], u) + 4, (top[1] + hemY) / 2, lerp(back, hp[0] + 2, u), hemY - 3); q.stroke(); }
    q.fillStyle = VK.capeIn; q.beginPath(); for (const [x, y] of hem) q.lineTo(x, y - 3.5); for (const [x, y] of hem.slice().reverse()) q.lineTo(x, y + 2); q.closePath(); q.fill();
  } });
}
function vkArm(g, c, A, far) {
  const pl = far ? dark(VK.plate, 0.05) : VK.plate;
  toon(g, capsule(A.s[0], A.s[1], A.el[0], A.el[1], 5.6, 5), pl, { sd: 1.4, hd: 0.8, lw: 2, light: VK.plateL });
  toon(g, capsule(A.el[0], A.el[1], A.hd[0], A.hd[1], 5, 4.4), pl, { sd: 1.4, hd: 0.8, lw: 2, light: VK.plateL });
  toon(g, circle(A.el[0], A.el[1], 3.6), far ? dark(VK.plate, 0.05) : VK.plate, { sd: 0.6, hd: 0.6, lw: 1.5, light: VK.plateL }); stroke(g, circle(A.el[0], A.el[1], 2.2), far ? VK.goldD : VK.gold, 1);     // couter
  inHand(g, A, 0, q => toon(q, rrect(-7, -5.4, 4.2, 10.8, 1.6), far ? dark(VK.wine, 0.06) : VK.wine, { sd: 0.6, hd: 0.4, lw: 1.5 }));   // flared cuff
  toon(g, circle(A.hd[0], A.hd[1], 4.4), far ? dark('#26222a', 0.05) : '#26222a', { sd: 0.8, hd: 0.5, lw: 1.8, light: VK.plateL });
}
function vkLeg(g, c, L, far) {
  const pl = far ? dark(VK.plate, 0.06) : VK.plate;
  toon(g, capsule(L.h[0], L.h[1], L.kn[0], L.kn[1], 6.6, 5.6), pl, { sd: 1.4, hd: 0.8, lw: 2, light: VK.plateL });
  toon(g, capsule(L.kn[0], L.kn[1], L.ft[0], L.ft[1], 5.4, 4.4), pl, { sd: 1.4, hd: 0.8, lw: 2, light: VK.plateL });
  toon(g, blob([[L.ft[0] - 4, L.ft[1] - 4.4], [L.ft[0] + 6, L.ft[1] - 3.6], [L.ft[0] + 12, L.ft[1] - 0.6], [L.ft[0] + 6, L.ft[1] + 0.4], [L.ft[0] - 4.4, L.ft[1] + 0.4]], 0.5), far ? dark('#211d24', 0.05) : '#211d24', { sd: 0.8, hd: 0.5, lw: 1.8, light: VK.plateL });
  toon(g, blob([[L.kn[0] - 3.6, L.kn[1] - 3], [L.kn[0] + 3.4, L.kn[1] - 4], [L.kn[0] + 6, L.kn[1] + 0.5], [L.kn[0] + 2, L.kn[1] + 4.6], [L.kn[0] - 3.4, L.kn[1] + 2.6]], 0.6), far ? dark(VK.plate, 0.05) : VK.plate, { sd: 0.8, hd: 0.6, lw: 1.6, light: VK.plateL, detail: q => { q.strokeStyle = far ? VK.goldD : VK.gold; q.lineWidth = 1.2; q.beginPath(); q.moveTo(L.kn[0] - 2.6, L.kn[1] - 2.4); q.lineTo(L.kn[0] + 3.4, L.kn[1] - 3.2); q.lineTo(L.kn[0] + 5.2, L.kn[1] + 0.4); q.stroke(); } });
}
function ravenSigil(g, x, y, s, col = '#120d12') { // black crowned raven
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = col;
  g.beginPath(); g.moveTo(-4, 1); g.quadraticCurveTo(-1, -2.5, 2.4, -2.2); g.lineTo(4.6, -1.5); g.lineTo(2.6, -0.8); g.quadraticCurveTo(2, 2.4, -1, 3.2); g.lineTo(-4.6, 4.6); g.lineTo(-3.4, 2.2); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-2.4, 0); g.lineTo(-5.6, -3.4); g.lineTo(-1, -1.2); g.closePath(); g.fill();
  g.fillStyle = VK.gold; g.beginPath(); g.moveTo(1.2, -2.4); g.lineTo(1.4, -4.4); g.lineTo(2.1, -3.2); g.lineTo(2.8, -4.6); g.lineTo(3.2, -2.2); g.closePath(); g.fill();
  g.restore();
}
const VARKAS = {
  back: (g, J, p) => {
    vkCape(g, J, p);
    // tall standing collar behind the head
    inTorso(g, J, q => toon(q, blob([[-8.5, -27], [-12, -38], [-8, -44], [-1, -41], [3, -32], [0, -28]], 0.5), VK.capeIn, { sd: 1, hd: 0.6, lw: 1.8, light: '#3a2e38', detail: d => { d.fillStyle = VK.wine; d.beginPath(); d.moveTo(-9, -36); d.lineTo(-7, -42); d.lineTo(-2, -39.5); d.lineTo(0.5, -31); d.closePath(); d.fill(); } }));
  },
  farArm: (g, c, A) => vkArm(g, c, A, true),
  farLeg: (g, c, L) => vkLeg(g, c, L, true), nearLeg: (g, c, L) => vkLeg(g, c, L, false),
  hips: (g, J, p) => inTorso(g, J, q => {
    const sw = S((p.t || 0) * PI * 2) * 0.8;
    // ragged wine tabard skirt between the legs, then layered black tassets with gilt edges
    toon(q, poly([[-2, -2], [12, -2], [13 + sw, 22], [10 + sw, 19], [7 + sw, 24], [4 + sw, 20], [1 + sw, 23]]), VK.wine, { sd: 1.4, hd: 0.6, lw: 1.8, light: VK.wineL });
    for (const [x0, x1, y1] of [[-11, -2, 9], [-3, 7, 9.5], [6, 13, 8.5]]) toon(q, poly([[x0, -3], [x1, -3], [x1 + 1, y1], [x0 - 1, y1 + 0.5]]), VK.plate, { sd: 0.8, hd: 0.5, lw: 1.6, light: VK.plateL, detail: d => { d.fillStyle = VK.gold; d.fillRect(x0 - 2, y1 - 1.6, x1 - x0 + 4, 1.4); } });
    toon(q, rrect(-12, -5.4, 26, 4.4, 1.6), '#1e1a20', { sd: 0.5, hd: 0.4, lw: 1.5 });
    toon(q, rrect(4.5, -6, 5, 5.6, 1), VK.gold, { sd: 0.4, hd: 0.4, lw: 1.2 });
  }),
  torso: (g, c, J, p) => inTorso(g, J, q => {
    const w = c.torsoW, h = c.torsoH;
    toon(q, torsoPath(c), VK.plate, { sd: 3, hd: 1.6, lw: 2, light: VK.plateL, detail: d => {
      d.fillStyle = VK.wine; d.beginPath(); d.moveTo(w * 0.0, -h * 0.98); d.lineTo(w * 0.62, -h * 0.9); d.lineTo(w * 0.6, -h * 0.28); d.quadraticCurveTo(w * 0.3, -h * 0.1, w * 0.02, -h * 0.3); d.closePath(); d.fill();
      d.strokeStyle = VK.gold; d.lineWidth = 1.3; d.stroke();
      ravenSigil(d, w * 0.32, -h * 0.62, 1.15);
      d.strokeStyle = alpha(VK.gold, 0.9); d.lineWidth = 1.2; d.beginPath(); d.moveTo(-w * 0.5, -h * 0.12); d.quadraticCurveTo(w * 0.2, -h * 0.02, w * 0.68, -h * 0.18); d.stroke();
      d.fillStyle = alpha('#ffffff', 0.12); d.beginPath(); d.ellipse(-w * 0.15, -h * 0.65, w * 0.18, h * 0.22, -0.3, 0, PI * 2); d.fill();
    } });
    toon(q, blob([[-w * 0.3, -h - 2.5], [w * 0.35, -h - 3], [w * 0.42, -h + 1.5], [-w * 0.32, -h + 1.8]], 0.6), '#1e1a20', { sd: 0.5, hd: 0.4, lw: 1.6, light: VK.plateL });   // gorget
  }),
  head: vkHead,
  nearArm: (g, c, A) => {
    vkArm(g, c, A, false);
    // raven-wing pauldron: layered, gilt-edged feather plates fanning over the upper arm
    const [sx, sy] = A.s, ua = Math.atan2(A.el[0] - sx, A.el[1] - sy);
    for (let i = 4; i >= 0; i--) {
      const a = ua - 0.65 + i * 0.3, L = 15 - i * 1.3, dx = S(a), dy = C(a), nx = dy, ny = -dx;
      const f = blob([[sx - nx * 2.6, sy - ny * 2.6 - 2], [sx + dx * L * 0.55 - nx * 3.4, sy + dy * L * 0.55 - ny * 3.4], [sx + dx * L, sy + dy * L], [sx + dx * L * 0.6 + nx * 2.6, sy + dy * L * 0.6 + ny * 2.6], [sx + nx * 2.6, sy + ny * 2.6 - 2]], 0.55);
      toon(g, f, i % 2 ? '#221e25' : VK.plate, { sd: 0.9, hd: 0.7, lw: 1.6, light: VK.plateL, detail: q => { q.strokeStyle = VK.gold; q.lineWidth = 1; q.beginPath(); q.moveTo(sx + dx * L * 0.3, sy + dy * L * 0.3); q.lineTo(sx + dx * L * 0.95, sy + dy * L * 0.95); q.stroke(); } });
    }
    toon(g, blob([[sx - 7, sy - 0.5], [sx - 3, sy - 7.5], [sx + 6, sy - 6.5], [sx + 8, sy - 1], [sx + 1, sy + 2.5]], 0.6), VK.plate, { sd: 1, hd: 0.8, lw: 1.8, light: VK.plateL, detail: q => { q.fillStyle = VK.gold; q.fillRect(sx - 7, sy - 7.5, 16, 1.6); } });
  },
  nearHand: (g, J, p) => { if (p.sword && p.sword[3]) { vkSword(g, p.sword[0], p.sword[1], p.sword[2], p.t || 0, p.fire ?? 1); toon(g, circle(J.na.hd[0], J.na.hd[1], 4.4), '#26222a', { sd: 0.8, hd: 0.5, lw: 1.8, light: VK.plateL }); } },
};
function vkGrip(p, G, a, farTo) {
  const J = vkRig.joints(p), c = vkRig.cfg;
  p.na = ik(J.na.s, G, c.upper, c.fore, 1);
  if (farTo) p.fa = ik(J.fa.s, farTo, c.upper, c.fore, 1);
  p.sword = [G[0], G[1], a, true];
  return p;
}
const VP = {
  walk(t) { const p = Pose.walk(t, { stride: 0.26, arm: 0.18, lean: 0.06, bobAmp: 1.8 }), ph = t * PI * 2; p.t = t; p.fa = [0.15 - S(ph) * 0.22, 0.35]; return vkGrip(p, [17 + S(ph) * 1.2, -50 + Math.abs(S(ph)) * 1.5], 0.55 + S(ph) * 0.04); },
  idle(t) { const p = Pose.idle(t); p.t = t; p.nl = [0.1, 0.05]; p.fl = [-0.14, 0.05]; p.fa = [0.1, 0.3]; p.tilt = -0.05; return vkGrip(p, [17, -44 + p.bob * 0.5], 1.32); },
  attack(t) { // high diagonal cut with a trail of fire
    const p = basePose(); p.t = t;
    const w = ease(seg(t, 0, 0.3)), s = ease(seg(t, 0.3, 0.46)), r = ease(seg(t, 0.55, 1));
    p.lean = lerp(0.04, -0.14, w) * (1 - s) + 0.24 * s * (1 - r) + 0.04 * r; p.dx = 4 * s * (1 - r);
    p.nl = [0.1 + 0.35 * s * (1 - r), 0.2 * s * (1 - r)]; p.fl = [-0.12 - 0.3 * s * (1 - r), 0.15]; p.bob = -2 * s * (1 - r);
    p.fa = [lerp(0.1, 0.9, w) * (1 - s) + lerp(0.9, -0.3, s) * s * (1 - r) + 0.1 * r, 0.5];
    const up = [lerp(17, -2, w), lerp(-50, -100, w)], dn = [34, -50], aUp = lerp(0.55, -2.3, w);
    const G = s > 0 ? [lerp(up[0], dn[0], s), lerp(up[1], dn[1], s)] : up, a = s > 0 ? lerp(aUp, 0.85, s) : aUp;
    p.slash = s > 0.05 && r < 0.4 ? 1 - r * 2.5 : 0;
    return vkGrip(p, [lerp(G[0], 17, r), lerp(G[1], -50, r)], lerp(a, 0.55, r));
  },
  special(t) { // raises the burning sword; the crown flares (blink / summon / curse)
    const p = basePose(); p.t = t;
    const u = ease(seg(t, 0, 0.35)), r = ease(seg(t, 0.8, 1)), k = u * (1 - r);
    p.lean = -0.1 * k + 0.04 * (1 - k); p.tilt = -0.22 * k; p.bob = -2 * k;
    p.fa = [lerp(0.1, 1.9, k), lerp(0.3, 0.2, k)];
    p.flare = k * (0.7 + 0.3 * S(t * PI * 10)); p.capeLift = k * 0.35; p.fire = 1 + k * 0.6;
    return vkGrip(p, [lerp(17, 14, k), lerp(-50, -102, k)], lerp(0.55, -1.25, k));
  },
  death(t) { // staggers, drops the sword, falls to his knees and slumps forward; the crown gutters out
    const p = basePose(); p.t = t * 0.5;
    const st = ease(seg(t, 0, 0.25)), k = ease(seg(t, 0.15, 0.5)), f = seg(t, 0.5, 0.9), fe = f * f;
    p.lean = lerp(0.04, -0.2, st) * (1 - k) + lerp(-0.2, 0.35, k) * k * (1 - fe) + 0.2 * fe; p.tilt = lerp(-0.3, 0.3, k);
    p.nl = [lerp(0.05, 0.75, k) * (1 - fe) + 0.35 * fe, lerp(0.05, 2.2, k) * (1 - fe)]; p.fl = [lerp(-0.05, -0.15, k), lerp(0.05, 1.7, k) * (1 - fe)];
    p.dy = k * 15 * (1 - fe) + fe * 6; p.rot = fe * PI / 2 * 0.93; p.dx = -fe * 22;
    p.na = [lerp(0.6, 0.2, k) * (1 - fe) + 2.7 * fe, 0.3]; p.fa = [lerp(0.2, 0.0, k) * (1 - fe) + 2.4 * fe, 0.2];
    p.crownLit = 1 - seg(t, 0.35, 0.85); p.flare = 0; p.eyesClosed = t > 0.75; p.capeTrail = 1 - fe * 0.8; p.noCrown = t > 0.62;
    const u = seg(t, 0.08, 0.5);
    p.sword = [lerp(20, 28, ease(u)), lerp(-48, -2.6, u * u), lerp(1.3, 0.06, ease(u)), false];
    p.fire = 1 - seg(t, 0.3, 0.8);
    return p;
  },
};
function varkasDraw(pose) {
  return (g, t) => {
    const p = pose(t);
    if (p.sword && !p.sword[3]) vkSword(g, p.sword[0], p.sword[1], p.sword[2], p.t, p.fire);
    fig(g, vkRig, p, VARKAS);
    if (p.slash && p.sword) { // fiery arc trailing the blade tip
      const [gx, gy, ga] = p.sword, tip = [gx + C(ga) * 36, gy + S(ga) * 36], cx = 8, cy = -62;
      const end = Math.atan2(tip[1] - cy, tip[0] - cx), r = Math.hypot(tip[0] - cx, tip[1] - cy), start = Math.max(-2.3, end - 2.2);
      if (end > start + 0.1) {
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = p.slash;
        const arc = new Path2D(); arc.arc(cx, cy, r, start, end); stroke(g, arc, alpha(EMBER, 0.45), 9); stroke(g, arc, alpha(EMBER_H, 0.8), 3);
        g.restore();
      }
    }
    if (pose === VP.death && t > 0.62) { // the Ember Crown rolls free, its fire dying
      const u = seg(t, 0.62, 1);
      g.save(); g.translate(lerp(60, 74, ease(u)), lerp(-30, -5.5, u * u) - S(seg(u, 0.6, 1) * PI) * 2); g.rotate(lerp(1.2, 0.3, ease(u)));
      emberCrown(g, 9.4, t, 0, 0.6 * (1 - u)); g.restore();
    }
    if (pose === VP.special) { const k = ease(seg(t, 0, 0.35)) * (1 - ease(seg(t, 0.8, 1))); if (k > 0) { glow(g, 4, -60, 50, '#ff5a1a', 0.22 * k); } }
  };
}

export function jobs() {
  const J = [];
  const drawT = (pose) => (g, t) => fig(g, thrallRig, pose(t), THRALL);
  J.push({ name: 'e_thrall', w: 96, h: 72, ax: 42, ay: 60, anims: {
    walk: A(8, 10, drawT(TP.walk)), idle: A(4, 5, drawT(TP.idle)),
    attack: once(7, 11, drawT(TP.attack), { ev: { hit: 3 } }), death: once(8, 11, drawT(TP.death)),
  } });
  J.push({ name: 'e_bonearcher', w: 90, h: 70, ax: 40, ay: 60, anims: {
    walk: A(8, 12, (g, t) => fig(g, archRig, BP.walk(t), ARCHER)), idle: A(4, 5, (g, t) => fig(g, archRig, BP.idle(t), ARCHER)),
    attack: once(8, 12, (g, t) => fig(g, archRig, BP.attack(t), ARCHER), { ev: { shoot: 2 } }), death: once(8, 11, (g, t) => BP.death(g, t)),
  } });
  J.push({ name: 'e_lurker', w: 120, h: 64, ax: 56, ay: 50, anims: {
    walk: A(8, 15, (g, t) => drawLurker(g, LP.walk(t))), idle: A(4, 5, (g, t) => drawLurker(g, LP.idle(t))),
    attack: once(7, 12, (g, t) => drawLurker(g, LP.bite(t)), { ev: { hit: 3 } }), death: once(8, 11, (g, t) => lurkerDeath(g, t)),
    burrow: once(6, 12, (g, t) => { drawLurker(g, LP.burrow(t)); mudSplash(g, 16, seg(t, 0.15, 1)); }),
    emerge: once(6, 12, (g, t) => { drawLurker(g, LP.emerge(t)); mudSplash(g, 8, seg(t, 0, 0.8), 1.2, 7); }),
  } });
  J.push({ name: 'e_cultist', w: 112, h: 76, ax: 44, ay: 62, anims: {
    walk: A(8, 12, (g, t) => fig(g, cultRig, CP.walk(t), CULT)), idle: A(4, 5, (g, t) => fig(g, cultRig, CP.idle(t), CULT)),
    attack: once(7, 12, (g, t) => fig(g, cultRig, CP.attack(t), CULT), { ev: { shoot: 2 } }), death: once(8, 11, cultistDeath),
  } });
  J.push({ name: 'e_spirit', w: 84, h: 72, ax: 42, ay: 52, anims: {
    walk: A(8, 12, (g, t) => spirit(g, t)), idle: A(4, 6, (g, t) => spirit(g, t)),
    attack: once(6, 12, (g, t) => spirit(g, t, { flare: bell(t, 0, 0.8), dx: bell(t, 0.1, 0.8) * 4 })), death: once(8, 12, (g, t) => spirit(g, t, { die: t, mouth: 1 })),
  } });
  J.push({ name: 'e_wraith', w: 80, h: 64, ax: 38, ay: 54, anims: {
    walk: A(8, 10, (g, t) => wraith(g, WP.hover(t))), idle: A(4, 6, (g, t) => wraith(g, WP.hover(t, 0.6))),
    attack: once(7, 12, (g, t) => wraith(g, WP.attack(t)), { ev: { hit: 3 } }), death: once(8, 11, (g, t) => wraith(g, WP.death(t))),
  } });
  const gkDraw = pose => (g, t) => {
    const p = pose(t);
    if (p.sword && !p.sword[3]) greatsword(g, p.sword[0], p.sword[1], p.sword[2], p.swordGlow || 0);   // dropped: world space, behind the body
    fig(g, gkRig, p, GRAVE);
    if (pose === GP.revive) { const v = bell(t, 0, 0.8); if (v > 0) glow(g, 6, -16, 26, TEAL, 0.45 * v); }
  };
  J.push({ name: 'e_graveknight', w: 108, h: 100, ax: 46, ay: 84, anims: {
    walk: A(8, 10, gkDraw(GP.walk)), idle: A(4, 5, gkDraw(GP.idle)),
    attack: once(8, 12, gkDraw(GP.attack), { ev: { hit: 3 } }), death: once(8, 10, gkDraw(GP.death)), revive: once(8, 10, gkDraw(GP.revive)),
  } });
  J.push({ name: 'e_plaguebearer', w: 116, h: 112, ax: 50, ay: 82, anims: {
    walk: A(8, 10, (g, t) => fig(g, pbRig, PBP.walk(t), PLAGUE)), idle: A(4, 5, (g, t) => fig(g, pbRig, PBP.idle(t), PLAGUE)),
    attack: once(7, 12, (g, t) => fig(g, pbRig, PBP.attack(t), PLAGUE), { ev: { hit: 3 } }), death: once(8, 11, plagueDeath),
  } });
  J.push({ name: 'e_horror', w: 180, h: 140, ax: 74, ay: 118, anims: {
    walk: A(8, 8, (g, t) => horror(g, HP.walk(t))), idle: A(4, 5, (g, t) => horror(g, HP.idle(t))),
    attack: once(8, 11, (g, t) => horror(g, HP.attack(t)), { ev: { hit: 3 } }),
    special: once(8, 9, (g, t) => horror(g, HP.devour(t)), { ev: { hit: 3 } }), death: once(8, 9, horrorDeath),
  } });
  J.push({ name: 'e_boss_varkas', w: 250, h: 210, ax: 100, ay: 176, scale: 1.25, anims: {
    walk: A(8, 6, varkasDraw(VP.walk)), idle: A(4, 5, varkasDraw(VP.idle)),
    attack: once(8, 11, varkasDraw(VP.attack), { ev: { hit: 3 } }), special: once(8, 9, varkasDraw(VP.special)), death: once(8, 8, varkasDraw(VP.death)),
  } });
  return J;
}
