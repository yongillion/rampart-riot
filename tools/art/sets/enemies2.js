// Rampart Riot — Chapter II enemies (original bestiary): Frostbound Pass — House Morrow mercenaries & frost beasts
import { toon, flat, ellipse, circle, rrect, poly, blob, dark, light, mix, alpha, OUT, glow, line, stroke, rng, capsule, eye } from '../lib/toon.js';
import { humanoid, Pose, basePose, ease, seg } from '../lib/rig.js';

export const scale = 1.5;
const PI = Math.PI, S = Math.sin, C = Math.cos;
const lerp = (a, b, t) => a + (b - a) * t;
const WINE = '#6a1a34', WINE_L = '#8a2a48', BLACK = '#1c181e', GOLD = '#d8b052', SHARD = '#c9a8ff';
const ICE = '#cdeefa', ICE_D = '#7fbcdc', FROST = '#9fe0ff';

// ---------------- shared helpers ----------------
// House Morrow crest: black crowned raven, wings displayed (s=1 is ~10 units wide)
function raven(g, x, y, s = 1, col = BLACK, crown = GOLD) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const wing = k => poly([[-0.5 * k, -0.7], [-4.8 * k, -3.9], [-4.3 * k, -2.5], [-5.2 * k, -1.9], [-4.0 * k, -1.1], [-4.6 * k, -0.3], [-1.0 * k, 1.0]]);
  flat(g, wing(1), col, 0); flat(g, wing(-1), col, 0);
  flat(g, ellipse(0, 0.6, 1.4, 2.5), col, 0);
  flat(g, circle(0.2, -2.3, 1.15), col, 0);
  flat(g, poly([[1.0, -2.7], [2.7, -2.2], [1.0, -1.8]]), col, 0);
  flat(g, poly([[-1.0, 2.4], [1.0, 2.4], [1.6, 4.3], [0, 3.6], [-1.6, 4.3]]), col, 0);
  flat(g, poly([[-1.0, -3.5], [-1.1, -4.9], [-0.45, -4.2], [0.05, -5.1], [0.55, -4.2], [1.15, -4.9], [1.05, -3.5]]), crown, 0);
  g.restore();
}

// 2-bone IK in rig convention (angle 0 = down, +PI/2 = forward). Returns [upperAngle, elbowBend].
function ik(sh, tgt, a, b) {
  const dx = tgt[0] - sh[0], dy = tgt[1] - sh[1];
  const d = Math.max(Math.abs(a - b) + 0.01, Math.min(a + b - 0.01, Math.hypot(dx, dy)));
  const phi = Math.atan2(dx, dy);
  const al = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
  const be = Math.acos(Math.max(-1, Math.min(1, (b * b + d * d - a * a) / (2 * b * d))));
  return [phi - al, al + be];
}
// held item in rig hand space (same transform as rig.holdItem): local -y points away from the fist
function hold(g, A, extra, fn) { g.save(); g.translate(A.hd[0], A.hd[1]); g.rotate(-A.fa + PI / 2 + extra); fn(g); g.restore(); }
const P2 = (x, y, a, d) => [x + C(a) * d, y + S(a) * d];   // point at distance d along screen angle a
const FUR = '#e4ddd0';
function furEdge(g, pts, w = 2.4, col = FUR) { // thick fur trim along an open curve
  const p = blob(pts, 0.6, false);
  stroke(g, p, OUT, w + 1.6); stroke(g, p, col, w);
}
function sparkle(g, x, y, r, a = 1) {
  g.save(); g.globalAlpha *= a; g.globalCompositeOperation = 'lighter';
  flat(g, poly([[x, y - r], [x + r * 0.2, y - r * 0.2], [x + r, y], [x + r * 0.2, y + r * 0.2], [x, y + r], [x - r * 0.2, y + r * 0.2], [x - r, y], [x - r * 0.2, y - r * 0.2]]), '#f4fdff', 0);
  g.restore();
}
// smooth tapered limb through joints pts with half-widths ws (no joint circles)
function limb(g, pts, ws, col, o = {}) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const d = Math.hypot(nx, ny) || 1; nx /= d; ny /= d;
    L.push([pts[i][0] + nx * ws[i], pts[i][1] + ny * ws[i]]); R.push([pts[i][0] - nx * ws[i], pts[i][1] - ny * ws[i]]);
  }
  const e = pts[pts.length - 1], e0 = pts[pts.length - 2], s0 = pts[0], s1 = pts[1];
  const ue = Math.hypot(e[0] - e0[0], e[1] - e0[1]) || 1, us = Math.hypot(s1[0] - s0[0], s1[1] - s0[1]) || 1;
  const tip = [e[0] + (e[0] - e0[0]) / ue * ws[ws.length - 1] * 0.8, e[1] + (e[1] - e0[1]) / ue * ws[ws.length - 1] * 0.8];
  const root = [s0[0] - (s1[0] - s0[0]) / us * ws[0] * 0.8, s0[1] - (s1[1] - s0[1]) / us * ws[0] * 0.8];
  const path = blob([root, ...L, tip, ...R.reverse()], o.tension ?? 0.45);
  toon(g, path, col, { sd: o.sd ?? 1, hd: o.hd ?? 0.5, lw: o.lw ?? 1.5, detail: o.detail });
  return path;
}
function breathPuff(g, x, y, k, a = 1) { // small frosty breath cloud, k = 0..1 age
  if (k <= 0 || k >= 1) return;
  g.save(); g.globalAlpha *= a * Math.min(1, (1 - k) * 1.6);
  const r = 1.3 + k * 2.4;
  flat(g, circle(x + k * 5, y - k * 2, r), '#f4fbff', 0.8, alpha('#6a8aa8', 0.55));
  flat(g, circle(x + k * 3.5 + r * 0.9, y - k * 1.2 + r * 0.25, r * 0.7), '#f4fbff', 0.7, alpha('#6a8aa8', 0.45));
  g.restore();
}
// one-handed overhead chop: rows [t, upperArm, elbowBend, weaponDir(screen angle, unwrapped), lean, bob, dx, stride, farUpper]
// the weapon's screen direction is keyed directly so it arcs over the head and lands pointing forward-down
function swingPose(keys, wBase = 0) {
  return t => keyPose(keys, t, (p, k) => { p.na = [k[1], k[2]]; p.wAng = k[3] + k[1] + k[2] - wBase; p.lean = k[4]; p.bob = k[5]; p.dx = k[6]; p.nl = [k[7], 0.15]; p.fl = [-k[7] * 0.8, 0.2]; p.fa = [k[8], 0.5]; });
}
const CHOP = [[0, 0.2, 0.45, -0.45, 0.06, 0, 0, 0.05, -0.1], [0.34, -2.5, 1.05, -2.6, -0.12, 0.6, -1, 0.12, 0.45], [0.5, 1.0, 0.18, 0.8, 0.3, -1.2, 2.2, 0.38, -0.25],
  [0.64, 1.08, 0.15, 1.0, 0.3, -1.1, 2.2, 0.36, -0.25], [1, 0.2, 0.45, -0.45, 0.06, 0, 0, 0.05, -0.1]];
// motion crescent behind a swinging weapon tip: arc around c from a0 to a1 (screen angles), thickening toward a1
function swoosh(g, c, r, a0, a1, w, a = 0.8) {
  const n = 12, outer = [], inner = [];
  for (let i = 0; i <= n; i++) { const u = i / n, an = lerp(a0, a1, u); outer.push([c[0] + C(an) * r, c[1] + S(an) * r]); inner.push([c[0] + C(an) * (r - w * u * u), c[1] + S(an) * (r - w * u * u)]); }
  g.save(); g.globalAlpha *= a;
  flat(g, poly([...outer, ...inner.reverse()]), '#f4fbff', 0);
  stroke(g, poly(outer, false), alpha(FROST, 0.9), 0.9);
  g.restore();
}
// strike-frame swoosh for keyed chops: follows the weapon tip of `rig` posed by swingPose(keys)
function chopFx(rig, keys, len) {
  const pose = swingPose(keys);
  return (g, t) => {
    if (t < 0.4 || t > 0.66) return;
    const p = pose(t), J = rig.joints(p), th = p.wAng - (p.na[0] + p.na[1]), sh = J.na.s;
    const tip = [J.na.hd[0] + C(th) * len, J.na.hd[1] + S(th) * len], r = Math.hypot(tip[0] - sh[0], tip[1] - sh[1]), an = Math.atan2(tip[1] - sh[1], tip[0] - sh[0]);
    swoosh(g, sh, r, an - 2.1, an - 0.1, r * 0.32, t < 0.55 ? 0.85 : 0.85 * (0.66 - t) / 0.11);
  };
}
// keyframe helper: rows [t, ...values]; apply(p, values) fills a basePose
function keyPose(keys, t, apply) {
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const A = keys[i], B = keys[i + 1], u = ease(Math.max(0, Math.min(1, (t - A[0]) / (B[0] - A[0]))));
  const p = basePose(); apply(p, A.map((v, j) => lerp(v, B[j], u))); return p;
}
// lateral-sequence walk: per-leg swing angle & lift. Order [nearFront, farFront, nearHind, farHind]
function gait(t, amp, offs = [0.25, 0.75, 0, 0.5], duty = 0.7) {
  const legs = [], lift = [];
  for (const o of offs) {
    const f = (t + o) % 1;
    if (f < duty) { legs.push(lerp(amp, -amp, f / duty)); lift.push(0); }
    else { const u = (f - duty) / (1 - duty); legs.push(lerp(-amp, amp, ease(u))); lift.push(S(u * PI)); }
  }
  return { legs, lift };
}
// 2-bone IK with bend side: dir 1 = joint bends backward (elbow), -1 = forward (knee)
function ik2(sh, tgt, a, b, dir = 1) {
  const r = ik(sh, tgt, a, b);
  if (dir > 0) return r;
  const phi = Math.atan2(tgt[0] - sh[0], tgt[1] - sh[1]), al = phi - r[0];
  return [phi + al, -r[1]];
}

// ---------------- Raider ----------------
const raider = humanoid({ h: 36, headR: 6.6, torsoH: 10.5, torsoW: 8.2, thigh: 6.4, shin: 6.2, upper: 5.8, fore: 5.5, limbR: 2.35, lw: 1.45,
  skin: '#d9a383', hair: '#3a2a22', shirt: '#7a5436', torsoStyle: 'fur', sleeve: '#5e4636', glove: '#4a3428', pants: '#4a4048', boots: '#5e5048', belt: '#2a2024', buckle: '#9aa0a8',
  helmet: 'hood', helmColor: '#433c46', cape: '#cfc7b8', angry: true, browColor: '#2a1e18', mouth: 'none', eyeR: 0.23,
  shield: 'buckler', shieldR: 4.6, shieldColor: WINE, shieldDx: 1.5, shieldDy: -0.5,
  chestDetail: (g, w, h) => { g.fillStyle = WINE; g.beginPath(); g.moveTo(w * 0.15, -h * 0.98); g.lineTo(w * 0.7, -h * 0.98); g.lineTo(w * 0.7, 2); g.lineTo(w * 0.32, 2); g.closePath(); g.fill(); },
  headExtra: (g, c, r) => {
    furEdge(g, [[r * 1.2, -r * 0.3], [r * 0.8, -r * 0.62], [r * 0.2, -r * 0.78], [-r * 0.3, -r * 0.3], [-r * 0.45, r * 0.5]], 2.2);
    // wine-red scarf over mouth and chin
    toon(g, blob([[r * 0.12, r * 0.22], [r * 1.12, r * 0.18], [r * 1.02, r * 0.72], [r * 0.35, r * 1.02], [-r * 0.3, r * 0.75]], 0.6), WINE, { sd: 0.8, hd: 0.5, lw: 1.15 });
    // fur collar over the shoulders
    toon(g, blob([[-r * 1.05, r * 0.6], [-r * 0.2, r * 0.82], [r * 0.7, r * 0.78], [r * 1.05, r * 1.0], [r * 0.75, r * 1.5], [r * 0.35, r * 1.3], [0, r * 1.62], [-r * 0.4, r * 1.32], [-r * 0.8, r * 1.55], [-r * 1.2, r * 1.1]], 0.5), FUR, { sd: 1.0, hd: 0.5, lw: 1.2 });
  },
  front: (g, J, p) => { // bearded hand axe: dark iron head, bright edge
    hold(g, J.na, p.wAng || 0, q => {
      toon(q, rrect(-1, -12, 2, 15, 1), '#6b4826', { sd: 0.5, hd: 0.3, lw: 1 });
      toon(q, poly([[0.4, -12.6], [3.4, -13.4], [6.6, -14.6], [7.4, -10.4], [6.2, -6.2], [4.2, -8.4], [0.4, -9.4]]), '#59606c', { sd: 0.8, hd: 0.5, lw: 1.1 });
      line(q, [[6.7, -14.1], [7.0, -10.4], [6.0, -6.9]], '#e8eef4', 1.0);
    });
    toon(g, circle(J.na.hd[0], J.na.hd[1], 2.35 * 0.9), '#4a3428', { sd: 0.8, hd: 0.5, lw: 1.45 });
  },
});

// ---------------- Crossbowman ----------------
function crossbow(g, x, y, a, o = {}) {
  // origin = trigger grip, +x along the aim. o.str: 0 = cocked, 1 = released; o.bolt: loaded bolt visible
  g.save(); g.translate(x, y); g.rotate(a);
  const str = o.str || 0;
  toon(g, blob([[-8.5, -1.0], [-2, -1.6], [13, -1.5], [15.5, -0.3], [14, 1.0], [2, 1.2], [-1.5, 1.4], [-5, 2.9], [-8.8, 2.6]], 0.5), '#6e4628', { sd: 0.9, hd: 0.5, lw: 1.1 });
  toon(g, rrect(0.3, 0.6, 1.6, 2.8, 0.6), '#3a3034', { sd: 0.3, hd: 0.2, lw: 0.8 });           // trigger lever
  toon(g, rrect(9.5, -2.0, 2.4, 3.6, 0.6), '#4a4c54', { sd: 0.4, hd: 0.3, lw: 0.9 });         // iron lath block
  const sx = lerp(3.2, 11.2, str);
  if (o.bolt) {
    toon(g, rrect(sx - 0.5, -2.6, 13.2, 1.3, 0.6), '#8a6a44', { sd: 0.2, hd: 0.2, lw: 0.8 });
    toon(g, poly([[sx + 12.4, -3.3], [sx + 15.2, -1.95], [sx + 12.4, -0.6]]), '#5a5e66', { sd: 0.2, hd: 0.3, lw: 0.8 });
    flat(g, poly([[sx - 0.5, -2.5], [sx + 2.4, -2.4], [sx + 0.8, -4.2]]), WINE_L, 0.6);
  }
  // steel prod (edge-on arc) and string
  const prod = new Path2D(); prod.moveTo(12.4, -8.8); prod.quadraticCurveTo(15.8, -1, 12.4, 6.8);
  stroke(g, prod, OUT, 3.6); stroke(g, prod, '#7a838e', 2.0);
  line(g, [[12.4, -8.8], [sx, -1.9], [12.4, 6.8]], '#ece4d0', 0.7);
  toon(g, blob([[15, -1.2], [17.6, -2.2], [18.2, 0.6], [15.2, 1.2]], 0.6), '#4a4c54', { sd: 0.2, hd: 0.2, lw: 0.9 });   // stirrup
  g.restore();
}
const xbow = humanoid({ h: 42, headR: 7.0, torsoH: 12.5, torsoW: 10, chest: 1.08, limbR: 2.7, lw: 1.5,
  skin: '#deae8c', hair: '#3a2a20', mustache: '#4a3020', nose: true, skirt: WINE, shirt: '#8c8472', sleeve: '#7c7464', glove: '#4a3428', pants: '#4e4850', boots: '#3a3034', belt: '#2a2024', buckle: '#a8aeb6',
  tabard: WINE, emblem: (g, x, y) => raven(g, x + 0.3, y + 0.3, 0.42), helmet: 'kettle', helmColor: '#5e646e', browColor: '#2a1e18', angry: true,
  chestDetail: (g, w, h) => { g.strokeStyle = alpha('#2a2018', 0.35); g.lineWidth = 0.7; for (let x = -w * 0.6; x < -w * 0.05; x += 2.1) { g.beginPath(); g.moveTo(x, -h); g.lineTo(x + 0.5, 1); g.stroke(); } },
  backItem: (g, J) => { // bolt quiver on the hip
    const h = J.hip; g.save(); g.translate(h[0] - 5.2, h[1] - 1); g.rotate(0.35);
    toon(g, rrect(-2.4, -6, 4.8, 10, 1.4), '#5a3a26', { sd: 0.6, hd: 0.3, lw: 1.1 });
    for (let i = 0; i < 3; i++) flat(g, poly([[-1.6 + i * 1.5, -6], [-1.0 + i * 1.5, -9], [-0.3 + i * 1.5, -6]]), WINE_L, 0.6);
    g.restore();
  },
  front: (g, J, p) => {
    if (!p.xb) return;
    const x = p.xb;
    crossbow(g, x.x, x.y, x.a, x);
    // gloved hands over the stock
    const c = xbow.cfg;
    toon(g, circle(J.fa.hd[0], J.fa.hd[1] - 0.4, c.limbR * 0.85), dark(c.glove, 0.06), { sd: 0.6, hd: 0.4, lw: c.lw });
    toon(g, circle(J.na.hd[0], J.na.hd[1], c.limbR * 0.9), c.glove, { sd: 0.8, hd: 0.5, lw: c.lw });
    if (x.flash) { // release snap: twang lines + streak
      const m = P2(x.x, x.y, x.a, 19), u = x.a - PI / 2;
      g.save(); g.globalAlpha = x.flash;
      line(g, [P2(m[0], m[1], x.a, 1), P2(m[0], m[1], x.a, 9)], '#fffbe8', 1.4);
      for (const k of [-1, 1]) line(g, [P2(...P2(x.x, x.y, x.a, 13), u, k * 7), P2(...P2(x.x, x.y, x.a, 16), u, k * 10)], '#fffbe8', 0.9);
      g.restore();
    }
  },
});
// put the crossbow at grip offset (gx, gy) from the near shoulder, aimed at angle a; arms solved by IK
function xbHold(p, gx, gy, a, o = {}) {
  const J = xbow.joints(p), c = xbow.cfg;
  const grip = [J.na.s[0] + gx, J.na.s[1] + gy];
  const fore = P2(grip[0], grip[1], a, 8.5);
  p.na = ik(J.na.s, grip, c.upper, c.fore);
  p.fa = ik(J.fa.s, [fore[0] - S(a) * 1.2, fore[1] + 1.4], c.upper, c.fore);
  p.xb = { x: grip[0], y: grip[1], a, bolt: true, str: 0, ...o };
  return p;
}
// keyframed attack: aim -> release (t=0, the game spawns the bolt at once) -> recoil -> lower & re-span -> ready
const XB_KEYS = [ // t, gx, gy, a, lean, str, bolt
  [0.00, 4.6, 2.2, -0.02, -0.04, 0.6, 0], [0.14, 2.6, 1.2, -0.3, -0.16, 1, 0], [0.30, 3.8, 2.6, -0.1, -0.08, 1, 0],
  [0.46, 4.4, 7.0, 0.42, 0.06, 1, 0], [0.62, 4.0, 7.5, 0.5, 0.1, 0.45, 0], [0.78, 4.0, 7.2, 0.4, 0.06, 0, 1], [1.00, 3.8, 8.6, 0.14, 0.03, 0, 1]];
const XPose = {
  idle: t => { const p = Pose.idle(t); return xbHold(p, 3.8, 8.6 + S(t * PI * 2) * 0.3, 0.14 + S(t * PI * 2) * 0.03); },
  walk: t => { const p = Pose.walk(t, { stride: 0.55, lean: 0.1 }); return xbHold(p, 3.4, 9.4, 0.32 + S(t * PI * 4) * 0.05); },
  attack: t => {
    let i = 0; while (i < XB_KEYS.length - 2 && t > XB_KEYS[i + 1][0]) i++;
    const A = XB_KEYS[i], B = XB_KEYS[i + 1], u = ease(Math.min(1, (t - A[0]) / (B[0] - A[0])));
    const k = j => lerp(A[j], B[j], u);
    const p = basePose(); p.lean = k(4); p.nl = [0.28, 0.12]; p.fl = [-0.22, 0.1]; p.dx = (k(1) - 4) * 0.5;
    return xbHold(p, k(1), k(2), k(3), { str: k(5), bolt: (u < 0.5 ? A[6] : B[6]) > 0, flash: t < 0.1 ? 1 : 0 });
  },
};
function xbDrop(g, t) { // the crossbow falls from the hands and settles on the ground
  const f = ease(seg(t, 0.1, 0.5)), b = S(seg(t, 0.5, 0.7) * PI) * 1.5;
  crossbow(g, lerp(6, 9, f), lerp(-20, -2.6, f) - b, lerp(0.14, 0.04, f), { bolt: f < 0.5 });
}

// ---------------- House Morrow knight ----------------
function ravenHelm(g, c, r) {
  const col = c.helmColor;
  // black raven-feather crest sweeping back
  for (let i = 0; i < 4; i++) {
    g.save(); g.translate(-r * 0.15 - i * r * 0.18, -r * 1.05 + i * r * 0.08); g.rotate(-0.9 - i * 0.28);
    toon(g, blob([[0, 0], [-r * 0.28, -r * 0.6], [0, -r * 1.25 + i * r * 0.12], [r * 0.28, -r * 0.55]], 0.6), i % 2 ? '#2a2430' : BLACK, { sd: 0.4, hd: 0.5, lw: 1.1, light: '#5a5068' });
    g.restore();
  }
  toon(g, blob([[-r * 1.05, r * 1.0], [-r * 1.12, -r * 0.5], [-r * 0.6, -r * 1.2], [r * 0.45, -r * 1.22], [r * 1.02, -r * 0.62], [r * 1.08, r * 0.3], [r * 0.85, r * 1.0]], 0.55), col, { sd: 1.8, hd: 1.0, lw: c.lw, light: light(col, 0.18) });
  // raven-beak visor
  toon(g, blob([[r * 0.45, -r * 0.42], [r * 1.25, -r * 0.3], [r * 2.15, r * 0.42], [r * 1.25, r * 0.62], [r * 0.5, r * 0.82]], 0.45), dark(col, 0.03), { sd: 1.0, hd: 0.8, lw: c.lw, light: light(col, 0.22) });
  line(g, [[r * 0.95, r * 0.12], [r * 1.85, r * 0.42]], alpha('#000', 0.45), 0.7);
  for (const [x, y] of [[r * 0.95, r * 0.42], [r * 1.25, r * 0.48]]) flat(g, circle(x, y, 0.45), '#0e0a0c', 0);
  // eye slit with a cold glint
  flat(g, poly([[-r * 0.05, -r * 0.3], [r * 1.05, -r * 0.28], [r * 1.05, -r * 0.1], [-r * 0.05, -r * 0.12]]), '#0e0a0c', 0);
  flat(g, ellipse(r * 0.62, -r * 0.2, r * 0.16, r * 0.07), '#ffb0a0', 0);
  // gilt crown band
  toon(g, poly([[-r * 0.85, -r * 0.62], [r * 0.95, -r * 0.6], [r * 0.95, -r * 0.82], [r * 0.6, -r * 1.12], [r * 0.4, -r * 0.84], [r * 0.05, -r * 1.2], [-r * 0.25, -r * 0.86], [-r * 0.6, -r * 1.1], [-r * 0.85, -r * 0.82]]), GOLD, { sd: 0.5, hd: 0.4, lw: 1 });
}
const knight = humanoid({ h: 46, headR: 7.6, torsoH: 13.5, torsoW: 11, chest: 1.15, thigh: 7.8, shin: 7.4, upper: 7, fore: 6.6, limbR: 3.0, legThick: 1.15, armThick: 1.1, lw: 1.55,
  skin: '#e0b090', shirt: '#565c6a', torsoStyle: 'plate', tabard: WINE, emblem: (g, x, y) => raven(g, x, y + 0.5, 0.5),
  pants: '#4c525e', boots: '#3c414b', sleeve: '#565c6a', glove: '#3c414b', pauldron: '#626978', kneePad: '#626978', belt: BLACK, buckle: GOLD, cape: '#2a1820',
  helmColor: '#5a606e', face: false, headExtra: ravenHelm,
  weapon: 'sword', wScale: 1.3, blade: '#c8d0d8', guard: '#2a2430', shield: 'kite', shieldR: 9, shieldColor: WINE, shieldRim: GOLD, shieldDx: 2.5, shieldDy: -1,
  shieldEmblem: (g, x, y, r) => raven(g, x, y - r * 0.05, r * 0.11),
});

// ---------------- Frost witch (custom robed figure driven by humanoid joints) ----------------
const WR = humanoid({ h: 44, headR: 6.3, torsoH: 24.5, torsoW: 9, thigh: 0.7, shin: 0.7, upper: 7.2, fore: 6.8, limbR: 2.1, lw: 1.5 });
const W = { robe: '#2f3d68', robeL: '#4d64a0', skin: '#a9c7df', hair: '#eef3f8', staff: '#3e3448' };
// jagged ice-crystal cluster pointing up (local -y)
function iceCrystal(g, x, y, s = 1, a = 0) {
  g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
  const sh = pts => toon(g, poly(pts), ICE, { sd: 0.9, hd: 0.8, lw: 1.1, light: '#ffffff', shade: ICE_D });
  sh([[-1.0, 0.2], [-4.0, -3.6], [-3.0, -5.0], [-0.4, -1.6]]);
  sh([[0.9, 0.2], [4.0, -2.8], [3.0, -4.4], [0.3, -1.6]]);
  sh([[-1.7, 0.6], [-2.4, -5.2], [0, -12], [2.2, -5.6], [1.7, 0.6]]);
  line(g, [[0.1, -10.5], [-0.5, -5.4], [-0.1, -1]], alpha('#ffffff', 0.9), 0.8);
  g.restore();
}
// staff in hand (hx,hy) tilted by a from vertical (+ = top forward); flare 0..1 = crystal flare
function witchStaff(g, hx, hy, a, flare = 0, pulse = 0, below = 15) {
  const ux = S(a), uy = -C(a), above = 43 - below;
  const top = [hx + ux * above, hy + uy * above], bot = [hx - ux * below, hy - uy * below];
  toon(g, capsule(bot[0], bot[1], top[0], top[1], 0.95, 1.3), W.staff, { sd: 0.6, hd: 0.4, lw: 1.1 });
  for (const k of [0.25, 0.62]) toon(g, circle(lerp(bot[0], top[0], k), lerp(bot[1], top[1], k), 1.5), dark(W.staff, 0.04), { sd: 0.3, hd: 0.3, lw: 0.9 });
  g.save(); g.translate(top[0], top[1]); g.rotate(a);
  for (const k of [-1, 1]) toon(g, poly([[k * 0.5, 1.2], [k * 3.2, -1.6], [k * 2.4, -4.6], [k * 1.7, -2.0], [0, -0.4]]), W.staff, { sd: 0.4, hd: 0.3, lw: 1 });
  g.restore();
  const cx = top[0] + ux * 0.6, cy = top[1] + uy * 0.6;
  glow(g, cx + ux * 5, cy + uy * 5, 9 + flare * 20 + pulse * 2, FROST, 0.32 + flare * 0.55 + pulse * 0.08);
  iceCrystal(g, cx, cy, 1 + flare * 0.18, a);
  if (flare > 0.2) { sparkle(g, cx + ux * 6, cy + uy * 6, 4 + flare * 7, flare); sparkle(g, cx + ux * 6, cy + uy * 6, 2 + flare * 3, 1); }
}
function witchArm(g, A, far) {
  const sl = far ? dark(W.robe, 0.08) : W.robe, sk = far ? dark(W.skin, 0.1) : W.skin;
  const cu = [lerp(A.el[0], A.hd[0], 0.6), lerp(A.el[1], A.hd[1], 0.6)];
  for (const k of [-0.35, 0.3]) { const a = A.fa + k; line(g, [A.hd, [A.hd[0] + S(a) * 3.4, A.hd[1] + C(a) * 3.4]], OUT, 1.6); line(g, [A.hd, [A.hd[0] + S(a) * 3.0, A.hd[1] + C(a) * 3.0]], sk, 0.7); }
  toon(g, circle(A.hd[0], A.hd[1], 1.75), sk, { sd: 0.6, hd: 0.4, lw: 1.2 });
  toon(g, capsule(A.s[0], A.s[1], A.el[0], A.el[1], 2.5, 2.1), sl, { sd: 1.1, hd: 0.6, lw: 1.45 });
  toon(g, capsule(A.el[0], A.el[1], cu[0], cu[1], 2.1, 3.1), sl, { sd: 1.1, hd: 0.6, lw: 1.45 });
  g.save(); g.translate(cu[0], cu[1]); g.rotate(-A.fa);
  toon(g, ellipse(0, 0.2, 3.3, 1.2), ICE, { sd: 0.5, hd: 0.5, lw: 1.1, light: '#ffffff', shade: ICE_D });
  g.restore();
}
function frostBand(g, x0, x1, y, hgt, seed = 3) { // spiky frost crust growing up from a hem line
  const R = rng(seed), pts = [[x0, y + 0.6]];
  const n = Math.max(3, Math.round((x1 - x0) / 2.2));
  for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n); pts.push([x, y - (i % 2 ? hgt * (0.7 + R() * 0.8) : hgt * 0.25)]); }
  pts.push([x1, y + 0.6]);
  toon(g, poly(pts), ICE, { sd: 0.6, hd: 0.6, lw: 1.1, light: '#ffffff', shade: ICE_D });
}
function drawWitch(g, p) {
  const J = WR.joints(p), r = WR.cfg.headR, L = J.lean, hip = J.hip;
  const tp = (x, y) => [hip[0] + x * C(L) - y * S(L), hip[1] + x * S(L) + y * C(L)];
  const sw = p.hem || 0, hy = -0.2;
  g.save();
  if (p.rot) g.rotate(p.rot);
  // far arm (behind the robe)
  witchArm(g, J.fa, true);
  // robe body: smooth upper body, flaring skirt to a wavy hem at the ground
  const hemF = hip[0] + 8.2 + sw * 1.2, hemB = hip[0] - 9.6 + sw * 2.2;
  const pts = [[hemB, hy], tp(-4.8, -11), tp(-5.0, -19), tp(-3.8, -24.4), tp(1.0, -25.2), tp(4.4, -24.2), tp(5.6, -18.5), tp(4.9, -12.5), [hemF, hy],
    [hemF - 3.5, hy + 0.4], [lerp(hemF, hemB, 0.4), hy - 0.4], [lerp(hemF, hemB, 0.65), hy + 0.4], [hemB + 2.5, hy - 0.3]];
  const robe = blob(pts, 0.5);
  toon(g, robe, W.robe, { sd: 2.4, hd: 1.2, lw: 1.5, detail: q => {
    // inner robe panel at the front, fold lines, silver clasp
    q.fillStyle = W.robeL;
    q.beginPath(); const a = tp(3.0, -23), b = tp(5.4, -18), c2 = [hemF + 0.5, hy], d = [hemF - 4.2, hy]; q.moveTo(...a); q.lineTo(...b); q.lineTo(...c2); q.lineTo(...d); q.closePath(); q.fill();
    q.strokeStyle = alpha('#0a0c1a', 0.35); q.lineWidth = 0.8;
    for (const [x0, x1] of [[-1.5, -4.5], [1.5, 0.2]]) { q.beginPath(); q.moveTo(...tp(x0, -12)); q.lineTo(hip[0] + x1 * 1.6 + sw, hy); q.stroke(); }
  } });
  frostBand(g, hemB + 0.6, hemF - 0.4, hy, 2.6, 5);
  toon(g, circle(...tp(3.6, -21.5), 1.2), '#dfe8f2', { sd: 0.3, hd: 0.3, lw: 0.9 });
  // staff: drawn before the head so the hood never hides behind the shaft; the hand grips on top
  witchStaff(g, J.na.hd[0], J.na.hd[1], p.staff ?? 0.1, p.flare || 0, p.pulse || 0, p.grip ?? 15);
  // head: hood, gaunt pale-blue face, glowing eyes, white hair, icy rim
  g.save(); g.translate(J.head[0], J.head[1]); g.rotate(L * 0.6 + p.tilt);
  toon(g, blob([[-r * 1.25, r * 1.35], [-r * 1.45, r * 0.1], [-r * 1.2, -r * 0.85], [-r * 1.0, -r * 1.35], [-r * 1.75, -r * 2.15], [-r * 0.15, -r * 1.75], [r * 0.7, -r * 1.3], [r * 1.3, -r * 0.5], [r * 1.35, r * 0.4], [r * 0.6, r * 1.45]], 0.55), W.robe, { sd: 1.5, hd: 0.8, lw: 1.5 });
  const face = blob([[-r * 0.05, -r * 0.5], [r * 0.75, -r * 0.6], [r * 1.12, -r * 0.2], [r * 1.42, r * 0.22], [r * 1.02, r * 0.36], [r * 0.98, r * 0.78], [r * 0.45, r * 1.05], [-r * 0.05, r * 0.6]], 0.55);
  toon(g, face, W.skin, { sd: 1.2, hd: 0.7, lw: 1.2, detail: q => { q.fillStyle = alpha('#16224a', 0.45); q.fillRect(-r * 2, -r * 2, r * 4, r * 1.75); } });
  if (p.eyesClosed) line(g, [[r * 0.4, -r * 0.08], [r * 0.85, -r * 0.02]], OUT, 1);
  else { eye(g, r * 0.62, -r * 0.1, r * 0.18, { glow: FROST, glowCore: '#ffffff', squint: true }); eye(g, r * 1.0, -r * 0.06, r * 0.12, { glow: FROST, glowCore: '#ffffff', squint: true }); line(g, [[r * 0.35, -r * 0.42], [r * 1.1, -r * 0.18]], '#16224a', 1.1); }
  line(g, [[r * 0.62, r * 0.66], [r * 0.92, r * 0.6]], OUT, 0.9);
  toon(g, blob([[-r * 0.35, r * 0.2], [r * 0.15, r * 0.5], [r * 0.25, r * 1.6], [r * 0.05, r * 2.7], [-r * 0.35, r * 1.7], [-r * 0.55, r * 0.8]], 0.6), W.hair, { sd: 0.8, hd: 0.4, lw: 1.1 });
  furEdge(g, [[r * 1.38, -r * 0.42], [r * 0.7, -r * 0.92], [-r * 0.15, -r * 0.72], [-r * 0.55, r * 0.15], [-r * 0.45, r * 1.15]], 2.0, ICE);
  for (const [x, y, a] of [[r * 0.9, -r * 0.85, -0.5], [r * 0.2, -r * 0.9, -0.1], [-r * 0.45, -r * 0.45, 0.6]]) { g.save(); g.translate(x, y); g.rotate(a); toon(g, poly([[-0.9, 0], [0, -2.6], [0.9, 0]]), ICE, { sd: 0.3, hd: 0.3, lw: 0.9 }); g.restore(); }
  g.restore();
  witchArm(g, J.na, false);
  g.restore();
}
// arms placed by IK; staff angle & flare carried on the pose
function wArms(p, nOff, fOff) {
  const J = WR.joints(p), c = WR.cfg;
  if (nOff) p.na = ik(J.na.s, [J.na.s[0] + nOff[0], J.na.s[1] + nOff[1]], c.upper, c.fore);
  if (fOff) p.fa = ik(J.fa.s, [J.fa.s[0] + fOff[0], J.fa.s[1] + fOff[1]], c.upper, c.fore);
  return p;
}
const WPose = {
  idle: t => { const b = S(t * PI * 2); const p = basePose(); p.bob = 0.6 + b * 0.6; p.lean = 0.04; p.tilt = b * 0.03; p.staff = 0.4; p.pulse = (b + 1) / 2; p.hem = b * 0.4;
    return wArms(p, [6.4, 10 + b * 0.3], [2.6, 10.5]); },
  walk: t => { const ph = t * PI * 2, b = S(ph); const p = basePose(); p.bob = 0.9 + S(ph * 2) * 0.9; p.lean = 0.12 + S(ph * 2) * 0.03; p.tilt = S(ph * 2) * 0.03; p.hem = b * 1.6; p.staff = 0.42 + b * 0.08; p.pulse = 0.5;
    return wArms(p, [6.6 + b * 1.4, 9.6 - Math.abs(b) * 0.6], [1.2 - b * 2.6, 10.6]); },
  attack: t => { // swing the crystal down onto the target
    const w = ease(seg(t, 0, 0.38)), s = ease(seg(t, 0.38, 0.52)), r2 = ease(seg(t, 0.62, 1));
    const p = basePose(); p.bob = 0.6; p.lean = lerp(lerp(0.04, -0.14, w), 0.24, s) * (1 - r2) + 0.04 * r2; p.hem = lerp(0, 0.8, s) * (1 - r2); p.tilt = -0.1 * w * (1 - s);
    p.staff = lerp(lerp(0.4, -0.5, w), 1.5, s) * (1 - r2) + 0.4 * r2; p.flare = s * (1 - seg(t, 0.55, 0.85)) * 0.6; p.grip = lerp(15, 10, s * (1 - r2));
    const nx = lerp(lerp(6.4, 1.5, w), 10, s) * (1 - r2) + 6.4 * r2, ny = lerp(lerp(10, 2.5, w), 6, s) * (1 - r2) + 10 * r2;
    return wArms(p, [nx, ny], [lerp(2.6, -1.5, w) * (1 - r2) + 2.6 * r2, 10.5]); },
  special: t => { // staff thrust up at arm's length, head thrown back, crystal flares
    const u = ease(seg(t, 0, 0.3)), r2 = ease(seg(t, 0.78, 1)), k = u * (1 - r2);
    const p = basePose(); p.bob = 0.6 - k * 1.8; p.lean = -0.12 * k + 0.04 * (1 - k); p.tilt = -0.3 * k; p.staff = lerp(0.4, 0.22, k); p.grip = lerp(15, 7, k); p.hem = S(t * PI * 3) * 0.7 * k;
    p.flare = seg(t, 0.15, 0.4) * (1 - seg(t, 0.72, 1)) * (0.85 + S(t * PI * 8) * 0.15);
    return wArms(p, [lerp(6.4, 9.6, k), lerp(10, -8.5, k)], [lerp(2.6, 5, k), lerp(10.5, -7, k)]); },
};
function witchDeath(g, t) {
  // recoil -> ice creeps over her -> she shatters; robe and empty hood slump into a frosted heap, the staff falls
  const fr = seg(t, 0.05, 0.42), sh = seg(t, 0.5, 1);
  if (t < 0.5) {
    const k = ease(seg(t, 0, 0.2));
    const p = basePose(); p.bob = 0.6; p.lean = -0.18 * k; p.tilt = -0.3 * k; p.staff = 0.4 - 0.2 * k; p.hem = 0.5 * k; p.eyesClosed = fr > 0.7; p.flare = 0;
    wArms(p, [lerp(6.4, 7, k), lerp(10, 4, k)], [lerp(2.6, -3, k), lerp(10.5, 4, k)]);
    g.save(); drawWitch(g, p);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = alpha('#dcf6ff', fr * 0.75); g.fillRect(-40, -80, 100, 82);   // ice creeping over (tints only what is drawn)
    g.globalCompositeOperation = 'source-over';
    if (fr > 0.55) { g.globalAlpha = Math.min(1, (fr - 0.55) / 0.3); for (const pts of [[[-3, -30], [0, -24], [-2, -18], [2, -12]], [[3, -21], [5, -15], [3, -8]], [[-5, -11], [-2, -5]], [[2, -36], [5, -31]]]) line(g, pts, '#4a7aa4', 1); }
    g.restore();
    if (fr > 0.85) glow(g, 0, -20, 26, '#e8faff', (fr - 0.85) * 4);
    return;
  }
  // heap: crumpled robe with the empty pointed hood lying on top, frosted hem
  const se = ease(Math.min(1, sh * 2));
  toon(g, blob([[-12, 0], [-10.5, -3.6 * se - 1], [-5, -6.5 * se - 1], [1, -7.5 * se - 1], [7, -5 * se - 1], [11, -1.5], [11.5, 0]], 0.6), W.robe, { sd: 1.6, hd: 0.8, lw: 1.5, detail: q => { q.strokeStyle = alpha('#0a0c1a', 0.35); q.lineWidth = 0.8; q.beginPath(); q.moveTo(-6, -1); q.lineTo(-3, -6); q.moveTo(3, -1); q.lineTo(4, -5.5); q.stroke(); } });
  frostBand(g, -11.5, 11, 0, 2.2, 11);
  g.save(); g.translate(-2, -6.5 * se - 1.5); g.rotate(-0.5 + (1 - se) * 0.8);
  toon(g, blob([[-5, 2], [-6, -2.5], [-11, -6], [-2, -5], [4, -3], [6, 1.5]], 0.5), W.robe, { sd: 1, hd: 0.5, lw: 1.4 });
  furEdge(g, [[5.5, 1.5], [3, -2.5], [-1, -3.5]], 1.4, ICE);
  g.restore();
  // shards: ballistic arcs that land and stay on the ground
  const R = rng(9), G = 150;
  for (let i = 0; i < 10; i++) {
    const x0 = (R() - 0.5) * 10, y0 = -12 - R() * 22, vx = (R() - 0.5) * 70, vy = -20 - R() * 40, sz = 1.2 + R() * 1.8, spin = (R() - 0.5) * 14;
    const tl = (-vy + Math.sqrt(vy * vy - 2 * G * (y0 + 1.5))) / G, tt = Math.min(sh * 1.2, tl);
    const x = x0 + vx * tt, y = Math.min(-1.5, y0 + vy * tt + 0.5 * G * tt * tt);
    g.save(); g.translate(x, y); g.rotate(spin * tt + R() * 6);
    toon(g, poly([[-sz, 0], [0, -sz * 1.9], [sz * 0.8, sz * 0.2], [0, sz * 0.8]]), ICE, { sd: 0.4, hd: 0.4, lw: 0.9, light: '#ffffff', shade: ICE_D });
    g.restore();
  }
  // staff topples forward and lands
  const sf = ease(seg(t, 0.5, 0.82)), bo = S(seg(t, 0.82, 0.95) * PI) * 1.2;
  witchStaff(g, lerp(7, 4, sf), lerp(-17, -2.4, sf) - bo, lerp(0.35, PI / 2 - 0.04, sf), 0, 0, lerp(15, 4, sf));
  if (sh < 0.3) glow(g, 0, -18, 23, '#e8faff', 0.7 * (1 - sh / 0.3));
}

// ---------------- Frost wolf ----------------
const WOLF = { fur: '#9fb2c4', back: '#5d7288', belly: '#e3ebf1', ruff: '#e6eef4', leg: '#8a9eb2', paw: '#4c5a6c', eye: '#8af0ff' };
function wolfHead(g, c, p) {
  const r = c.headR, jaw = p.jaw || 0, darkTop = q => { q.fillStyle = WOLF.back; q.beginPath(); q.moveTo(-r * 2, -r * 0.1); q.quadraticCurveTo(r * 0.8, -r * 0.55, r * 2.6, -r * 0.05); q.lineTo(r * 2.6, -r * 3); q.lineTo(-r * 2, -r * 3); q.closePath(); q.fill(); };
  toon(g, poly([[-r * 0.6, -r * 0.5], [-r * 0.65, -r * 1.85], [r * 0.05, -r * 0.7]]), dark(WOLF.back, 0.08), { sd: 0.4, hd: 0.3, lw: c.lw });   // far ear
  // lower jaw (hinged), then skull + muzzle
  g.save(); g.translate(r * 0.45, r * 0.55); g.rotate(jaw * 0.55);
  toon(g, blob([[-r * 0.3, -r * 0.1], [r * 1.5, -r * 0.05], [r * 1.65, r * 0.2], [r * 0.6, r * 0.45], [-r * 0.3, r * 0.35]], 0.6), mix(WOLF.fur, WOLF.belly, 0.4), { sd: 0.6, hd: 0.3, lw: c.lw });
  if (jaw > 0.15) flat(g, poly([[r * 1.05, -r * 0.05], [r * 1.18, -r * 0.5], [r * 1.32, -r * 0.05]]), '#f6fbff', 0.7);
  g.restore();
  if (jaw > 0.15) flat(g, poly([[r * 0.5, r * 0.45], [r * 2.0, r * 0.42], [r * 1.9, r * 0.55 + jaw * r * 0.75], [r * 0.6, r * 0.75]]), '#4a1622', 0.6);
  const head = blob([[-r * 0.85, r * 0.3], [-r * 0.7, -r * 0.55], [r * 0.05, -r * 0.88], [r * 0.85, -r * 0.62], [r * 1.35, -r * 0.3], [r * 2.2, -r * 0.08], [r * 2.4, r * 0.22], [r * 2.05, r * 0.46], [r * 1.1, r * 0.5], [r * 0.45, r * 0.85], [-r * 0.35, r * 0.8]], 0.7);
  toon(g, head, WOLF.fur, { sd: 1.3, hd: 0.7, lw: c.lw, detail: q => { darkTop(q); q.fillStyle = WOLF.belly; q.beginPath(); q.ellipse(r * 0.3, r * 0.75, r * 0.9, r * 0.45, -0.2, 0, PI * 2); q.fill(); } });
  toon(g, poly([[-r * 0.2, -r * 0.62], [-r * 0.05, -r * 2.0], [r * 0.6, -r * 0.6]]), WOLF.back, { sd: 0.5, hd: 0.4, lw: c.lw, detail: q => { q.fillStyle = '#2e3644'; q.beginPath(); q.moveTo(r * 0.0, -r * 0.7); q.lineTo(r * 0.05, -r * 1.6); q.lineTo(r * 0.38, -r * 0.7); q.fill(); } });   // near ear
  flat(g, ellipse(r * 2.32, r * 0.12, r * 0.24, r * 0.2), '#1a1418', 0.8);
  line(g, [[r * 1.15, r * 0.48], [r * 1.9, r * 0.42]], OUT, 1);
  flat(g, poly([[r * 1.62, r * 0.42], [r * 1.72, r * (0.74 + jaw * 0.1)], [r * 1.83, r * 0.42]]), '#f6fbff', 0.7);
  if (p.eyesClosed) line(g, [[r * 0.5, -r * 0.2], [r * 1.05, -r * 0.1]], OUT, 1.1);
  else {
    glow(g, r * 0.85, -r * 0.18, r * 1.0, WOLF.eye, 0.8);
    flat(g, poly([[r * 0.45, -r * 0.3], [r * 1.12, -r * 0.2], [r * 0.6, -r * 0.04]]), '#0e1a26', 0);
    flat(g, ellipse(r * 0.82, -r * 0.18, r * 0.25, r * 0.1, 0.12), '#f0feff', 0);
  }
  line(g, [[r * 0.3, -r * 0.56], [r * 1.25, -r * 0.3]], OUT, 1.3);
  if (p.breath !== undefined) breathPuff(g, r * 2.5, r * 0.35, p.breath, 0.9);
}
// frost wolf on a smooth custom body (pose fields mirror the rig's QPose: bob, legs[4], lift, head, tail, rot, stretch, lunge, jaw, down)
const WCFG = { headR: 6.6, lw: 1.5 };
function drawWolf(g, p) {
  const lift = p.lift || [0, 0, 0, 0], st = p.stretch || 0, dn = p.down || 0;
  g.save(); g.translate(p.lunge || 0, 0); g.rotate(p.rot || 0);
  const by = -13.2 + (p.bob || 0) + dn * 7.5;
  const front = (i, far) => {
    const a = p.legs[i], k = lift[i], sh = [8.5 + st, by + 0.5];
    const el = [sh[0] + S(a) * 5.4, sh[1] + C(a) * 5.4];
    const wa = a + 0.08 - k * 1.7 - dn * 0.9, wr = [el[0] + S(wa) * 4.6, el[1] + C(wa) * 4.6];
    const pa = wa * 0.4 + 0.1, pw = [wr[0] + S(pa) * 1.8, Math.min(-0.9, wr[1] + C(pa) * 1.8)];
    const col = far ? dark(WOLF.fur, 0.12) : WOLF.fur;
    limb(g, [sh, el, wr, pw], [3.6, 2.2, 1.5, 1.4], col, { detail: q => { if (!far) { q.fillStyle = alpha('#ffffff', 0.25); q.beginPath(); q.ellipse(el[0] + 1, el[1] + 2, 1, 3, 0, 0, PI * 2); q.fill(); } } });
    toon(g, ellipse(pw[0] + 1.3, pw[1] + 0.1, 2.3, 1.2, wa * 0.3), far ? dark(WOLF.paw, 0.1) : WOLF.paw, { sd: 0.3, hd: 0.3, lw: 1.2 });
  };
  const hind = (i, far) => {
    const a = p.legs[i], k = lift[i], hp = [-9.5 - st, by - 0.5];
    const kn = [hp[0] + S(a + 0.55) * 5.6, hp[1] + C(a + 0.55) * 5.6];
    const ha = a - 0.75 - k * 0.6 - dn * 0.8, hk = [kn[0] + S(ha) * 4.6, kn[1] + C(ha) * 4.6];
    const ma = a * 0.35 + 0.05 + k * 0.9 + dn, pw = [hk[0] + S(ma) * 4.4, Math.min(-0.9, hk[1] + C(ma) * 4.4)];
    const col = far ? dark(WOLF.fur, 0.12) : WOLF.fur;
    limb(g, [[hp[0] - 1, hp[1] - 1.5], kn, hk, pw], [5.0, 2.6, 1.6, 1.4], col);
    toon(g, ellipse(pw[0] + 1.3, pw[1] + 0.1, 2.3, 1.2, ma * 0.3), far ? dark(WOLF.paw, 0.1) : WOLF.paw, { sd: 0.3, hd: 0.3, lw: 1.2 });
  };
  front(1, true); hind(2, true);
  // bushy tail
  const ta = -0.55 + (p.tail || 0), tb = [-14.5 - st, by - 3.2];
  const tm = [tb[0] - C(ta) * 6.5, tb[1] + S(ta) * 5.5 - 1.2], te = [tb[0] - C(ta) * 13 - 1, tb[1] + S(ta) * 11.5 + 1.5];
  toon(g, blob([[tb[0] + 1, tb[1] - 2.2], [tm[0], tm[1] - 3.4], [te[0] - 1, te[1] - 0.5], [te[0] + 1.5, te[1] + 1.2], [tm[0] + 1.2, tm[1] + 3.0], [tb[0] + 1.5, tb[1] + 2.6]], 0.6), WOLF.back, { sd: 1, hd: 0.5, lw: 1.5,
    detail: q => { q.fillStyle = WOLF.ruff; q.beginPath(); q.ellipse(te[0] + 0.5, te[1], 2.4, 2.0, 0, 0, PI * 2); q.fill(); } });
  // body: deep chest, tucked waist, rump
  const body = blob([[-16 - st, by - 2.5], [-11 - st, by - 6.0], [-3, by - 5.6], [5 + st, by - 6.8], [10.5 + st, by - 6.2], [13.5 + st, by - 2.5], [12 + st, by + 3.4], [7 + st, by + 5.6], [0, by + 2.4], [-6, by + 2.2], [-12 - st, by + 4.0], [-16.5 - st, by + 1.5]], 0.75);
  toon(g, body, WOLF.fur, { sd: 2.2, hd: 1.1, lw: 1.5, detail: q => {
    q.fillStyle = WOLF.belly; q.beginPath(); q.ellipse(4, by + 5.2, 10, 3.2, -0.08, 0, PI * 2); q.fill();
    q.fillStyle = WOLF.back; q.beginPath(); q.moveTo(-18 - st, by + 0.5); q.quadraticCurveTo(-6, by - 3.6, 9 + st, by - 2.8); q.lineTo(16, by - 12); q.lineTo(-18, by - 12); q.closePath(); q.fill();
    q.strokeStyle = alpha('#1c2430', 0.3); q.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) { const x = -11 + i * 3.8; q.beginPath(); q.moveTo(x, by - 2.6 + Math.abs(i - 2) * 0.3); q.lineTo(x - 1.1, by - 0.8); q.stroke(); }
  } });
  hind(3, false);
  // fluffy neck ruff (pale); the head sits on top of it
  const hx = 14.8 + st, hy = by - 7.6 + dn * 2.5;
  toon(g, blob([[hx - 6.5, hy - 2.5], [hx - 9.5, hy + 1.5], [hx - 8.2, hy + 3.2], [hx - 9.4, hy + 6.2], [hx - 6.4, hy + 6.8], [hx - 5.8, hy + 9.8], [hx - 2.8, hy + 8.6], [hx - 1.0, hy + 11.4], [hx + 1.2, hy + 8.2], [hx + 1.8, hy + 4.0], [hx + 0.5, hy + 0.5]], 0.35), WOLF.ruff, { sd: 1.2, hd: 0.5, lw: 1.35 });
  front(0, false);
  g.save(); g.translate(hx, hy); g.rotate(p.head || 0);
  wolfHead(g, WCFG, p);
  g.restore();
  g.restore();
}
const WolfPose = {
  // gallop: extended flight (t=0) -> fore contact -> gathered flight (t=.5) -> hind push
  run(t) {
    const ph = t * PI * 2, f = C(ph);
    const sw = (x, d) => Math.max(0, S(x)) * d;            // lift paw while swinging forward
    return { legs: [0.85 * C(ph - 0.35), 0.85 * C(ph - 0.75), -0.75 * C(ph - 0.3), -0.75 * C(ph + 0.1)],
      lift: [sw(ph - 0.35 + PI, 1), sw(ph - 0.75 + PI, 1), sw(ph - 0.3, 1), sw(ph + 0.1, 1)],
      bob: -Math.abs(S(ph)) * 1.0 - 0.6 + Math.abs(f) * -0.8, stretch: f * 1.8, rot: S(ph) * 0.05, head: -0.06 + S(ph) * 0.05, tail: 0.15 + C(ph) * 0.18, breath: (t * 2) % 1 };
  },
  idle(t) { const b = S(t * PI * 2); return { legs: [0.06, -0.04, -0.06, 0.05], bob: b * 0.35, head: b * 0.04, tail: b * 0.12, breath: t }; },
  bite(t) {
    const w = ease(seg(t, 0, 0.3)), s = S(seg(t, 0.3, 0.75) * PI), r = ease(seg(t, 0.75, 1));
    return { legs: [0.25 * s - 0.15 * w * (1 - s), -0.1 + 0.3 * s, -0.3 * s + 0.1 * w, -0.45 * s + 0.15 * w], lift: [s * 0.4, 0, 0, 0],
      bob: w * (1 - s) * 1.6 - s * 1.2, lunge: -2 * w * (1 - s) + 5 * s, rot: -0.1 * s + 0.05 * w * (1 - s), head: 0.22 * s - 0.15 * w * (1 - s), jaw: Math.min(1, w * 0.6 + s), tail: 0.4 * (1 - r), stretch: s * 1.2 };
  },
  death(t) { // yelp & rear back, then slump onto its side with the legs stretched out
    const k = ease(seg(t, 0, 0.3)), d = ease(seg(t, 0.22, 0.72)), b = S(seg(t, 0.72, 0.9) * PI) * 0.8;
    return { legs: [0.3 * k * (1 - d) + d * 1.25, 0.2 * k * (1 - d) + d * 1.0, -0.3 * k * (1 - d) + d * 0.75, -0.2 * k * (1 - d) + d * 1.0], lift: [-d * 0.3, -d * 0.2, -d * 0.4, -d * 0.5], down: d, bob: -2.4 * k * (1 - d) - b, lunge: -2.5 * k,
      rot: -0.16 * k * (1 - d), head: -0.35 * k * (1 - d) + d * 0.42, tail: -0.45 * d, jaw: 0.6 * k * (1 - d * 0.6), eyesClosed: t > 0.3 };
  },
};

// ---------------- Frost bat ----------------
const BAT = { fur: '#4c566e', wing: '#3e4862', bone: '#7a88a2', belly: '#d9e2ea' };
function batWing(g, x, y, ang, sy, far) {
  // wing drawn extended backwards (-x) from the shoulder, rotated by ang (negative = raised), squashed by sy for depth
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(far ? 0.86 : 1, sy);
  const col = far ? dark(BAT.wing, 0.1) : BAT.wing, bone = far ? dark(BAT.bone, 0.12) : BAT.bone;
  const el = [-5, -2.2], wr = [-10, -3.2], f = [[-18.5, -4.5], [-17, 2.6], [-12.6, 6.4], [-7, 6.6]];
  const mem = poly([[0.5, -0.6], el, wr, f[0], [-15.2, -0.9], f[1], [-14.6, 3.1], [-13.4, 3.4], f[2], [-10.2, 4.0], f[3], [-4.6, 4.2], [-1.4, 3.6]]);
  toon(g, mem, col, { sd: 1.3, hd: 0.7, lw: 1.25, detail: q => {
    q.strokeStyle = bone; q.lineWidth = 0.9; for (const t of f) { q.beginPath(); q.moveTo(...wr); q.lineTo(...t); q.stroke(); }
    // frost rime along the ragged trailing edge
    q.strokeStyle = alpha('#e4f6ff', far ? 0.35 : 0.7); q.lineWidth = 1.3; q.beginPath(); q.moveTo(...f[0]); q.lineTo(-15.2, -0.9); q.lineTo(...f[1]); q.lineTo(-14.6, 3.1); q.lineTo(-13.4, 3.4); q.lineTo(...f[2]); q.lineTo(-10.2, 4.0); q.lineTo(...f[3]); q.stroke();
  } });
  line(g, [[0, 0], el, wr], OUT, 2.4); line(g, [[0, 0], el, wr], bone, 1.3);
  toon(g, poly([[wr[0] + 0.2, wr[1] - 0.2], [wr[0] + 1.6, wr[1] - 2.2], [wr[0] + 1.4, wr[1] + 0.2]]), '#e8eef4', { sd: 0, hd: 0, lw: 0.7 });  // thumb claw
  for (const [fx, fy] of f.slice(0, 3)) toon(g, poly([[fx + 1.1, fy - 0.6], [fx - 3.2, fy + 1.6], [fx + 0.5, fy + 1.2]]), ICE, { sd: 0.2, hd: 0.3, lw: 0.75, light: '#ffffff', shade: ICE_D });
  g.restore();
}
function drawBat(g, o = {}) {
  // o.flap: stroke phase angle; o.open: 0..1 wing spread; o.bite, o.dead, o.rot, o.dx, o.dy
  const y = -10 + (o.dy || 0), ph = o.flap ?? 0, up = C(ph);       // up = 1 at top of stroke, -1 at bottom
  const ang = lerp(-0.6, 0.95, (up + 1) / 2) * (o.open ?? 1) - (1 - (o.open ?? 1)) * 1.1, sy = 0.62 + 0.38 * Math.abs(up);
  g.save(); g.translate(o.dx || 0, y); g.rotate(o.rot || 0);
  batWing(g, 1.6, -3, ang - 0.12 + (o.farLag || 0), sy * 0.92, true);
  toon(g, blob([[-4.2, 1.2], [-3.8, -2.8], [-0.6, -4.4], [3.2, -3.4], [4.2, 0.4], [2.4, 4.0], [-1.6, 4.2]], 0.8), BAT.fur, { sd: 1.4, hd: 0.8, lw: 1.3, detail: q => { q.fillStyle = BAT.belly; q.beginPath(); q.ellipse(1.6, 1.6, 2.3, 2.6, -0.3, 0, PI * 2); q.fill(); } });
  for (const k of [0, 1]) { line(g, [[-1.6 + k * 1.6, 3.6], [-2.2 + k * 1.6, 5.8]], OUT, 1.3); line(g, [[-2.2 + k * 1.6, 5.8], [-1.4 + k * 1.6, 6.3]], OUT, 1); }
  g.save(); g.translate(3.4, -3.3); g.rotate(o.head || 0);
  toon(g, poly([[-2.4, -0.6], [-2.6, -6.4], [0.2, -1.8]]), dark(BAT.fur, 0.08), { sd: 0.4, hd: 0.3, lw: 1.1 });
  toon(g, poly([[-0.6, -1.4], [1.4, -6.8], [2.4, -0.8]]), BAT.fur, { sd: 0.4, hd: 0.3, lw: 1.1, detail: q => { q.fillStyle = '#8a7a94'; q.beginPath(); q.moveTo(0.5, -1.6); q.lineTo(1.4, -5.2); q.lineTo(1.8, -1.4); q.fill(); } });
  toon(g, blob([[-2.6, 0.5], [-1.8, -2.3], [1.4, -2.5], [3.5, -0.6], [4.4, 0.9], [2.4, 2.5], [-0.8, 2.7]], 0.7), BAT.fur, { sd: 1, hd: 0.6, lw: 1.2 });
  const m = o.bite || 0;
  if (m > 0.2) flat(g, poly([[1.2, 1.4], [4.4, 0.9 + m * 0.6], [3.7, 2.4 + m * 1.8], [1.2, 2.5]]), '#4a1420', 0.8);
  flat(g, poly([[2.2, 1.45], [2.6, 2.9 + m], [3.0, 1.35]]), '#f4fbff', 0.5);
  flat(g, poly([[3.2, 1.25], [3.55, 2.5 + m], [3.9, 1.15]]), '#f4fbff', 0.5);
  if (o.dead) line(g, [[0.6, -0.6], [2.4, -0.3]], OUT, 1);
  else eye(g, 1.5, -0.5, 0.8, { glow: FROST, glowCore: '#ffffff', squint: true });
  flat(g, ellipse(4.3, 0.4, 0.7, 0.5), '#1a1418', 0);
  g.restore();
  batWing(g, 0.4, -1.6, ang, sy, false);
  g.restore();
}

// ---------------- Snow troll ----------------
const TROLL = { skin: '#6f8499', skinD: '#5a6c82', fur: '#ecebe5', furS: '#b4bfcc', eye: '#b4f6ff', wood: '#6e4a2c' };
const tp = (J, x, y) => [J.hip[0] + x * C(J.lean) - y * S(J.lean), J.hip[1] + x * S(J.lean) + y * C(J.lean)];   // torso-local -> world
function frozenClub(g, len = 26) { // log with an ice block frozen round its head (hand space, pointing -y)
  toon(g, blob([[-1.8, 3], [1.8, 3], [2.6, -len * 0.55], [3.2, -len + 2], [-3.2, -len + 2], [-2.6, -len * 0.55]], 0.4), TROLL.wood, { sd: 1, hd: 0.5, lw: 1.4,
    detail: q => { q.strokeStyle = alpha('#2a1808', 0.5); q.lineWidth = 0.9; for (const x of [-1, 1]) { q.beginPath(); q.moveTo(x, 1); q.lineTo(x * 1.6, -len + 4); q.stroke(); } } });
  toon(g, rrect(-2.4, -4, 4.8, 3, 1), '#4a3a30', { sd: 0.4, hd: 0.3, lw: 1 });   // hide grip wrap
  const y = -len;
  toon(g, poly([[-5.6, y + 4.5], [-6.8, y - 2], [-4.2, y - 8.5], [0.5, y - 10.5], [5.2, y - 8], [7.0, y - 1.5], [5.4, y + 4.8], [0, y + 6.2]]), ICE, { sd: 1.6, hd: 1.2, lw: 1.5, light: '#ffffff', shade: ICE_D,
    detail: q => { q.fillStyle = alpha(TROLL.wood, 0.4); q.beginPath(); q.ellipse(0, y - 1, 3.2, 6.5, 0, 0, PI * 2); q.fill(); q.strokeStyle = alpha('#ffffff', 0.85); q.lineWidth = 1; q.beginPath(); q.moveTo(-4.4, y - 2); q.lineTo(-2.2, y - 7.5); q.stroke(); q.strokeStyle = alpha(ICE_D, 0.8); q.beginPath(); q.moveTo(1, y + 5); q.lineTo(3.5, y - 1); q.lineTo(2, y - 6); q.stroke(); } });
  for (const [x, l] of [[-4, 3.5], [3.6, 4.5]]) toon(g, poly([[x - 1.2, y + 4.6], [x, y + 4.6 + l], [x + 1.2, y + 4.8]]), ICE, { sd: 0.3, hd: 0.3, lw: 1, light: '#ffffff', shade: ICE_D });
}
// custom hulking body driven by humanoid joints (rig poses); the stock torso can't make the shaggy hunch
const TR = humanoid({ h: 62, headR: 10, torsoH: 27, torsoW: 20, thigh: 10.5, shin: 10, upper: 13.5, fore: 13.5, limbR: 5, lw: 1.8 });
function shagBlob(pts, seed, depth = 1.8) { // closed outline with fur tufts poking out between points (a point with [x,y,0] = no tuft)
  const R = rng(seed), out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    out.push(a);
    if (b[2] !== 0 && a[2] !== 0) { const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, k = depth * (0.7 + R() * 0.6); out.push([(a[0] + b[0]) / 2 + dy / d * k, (a[1] + b[1]) / 2 - dx / d * k]); }
  }
  return blob(out, 0.3);
}
function trollArm(g, A, far, club) {
  const sk = far ? dark(TROLL.skin, 0.1) : TROLL.skin, hand = far ? dark(TROLL.skinD, 0.08) : TROLL.skinD;
  limb(g, [A.s, A.el, A.hd], [6.0, 5.0, 4.6], sk, { lw: 1.8, sd: 1.6 });
  // fur cuff at the wrist
  g.save(); g.translate(...A.el.map((v, i) => lerp(v, A.hd[i], 0.62))); g.rotate(-A.fa);
  toon(g, blob([[-5.6, -2.2], [5.6, -2.2], [6.4, 1.2], [3.6, 3.4], [1.2, 1.8], [-1.6, 3.6], [-4.2, 2.0], [-6.2, 1.4]], 0.4), far ? dark(TROLL.fur, 0.1) : TROLL.fur, { sd: 1, hd: 0.5, lw: 1.6, shade: TROLL.furS });
  g.restore();
  if (club) club();
  toon(g, circle(A.hd[0], A.hd[1], 5.4), hand, { sd: 1, hd: 0.6, lw: 1.8 });
  for (let i = 0; i < 3; i++) { const a = A.fa + 0.9 + i * 0.35; line(g, [[A.hd[0] + S(a) * 4.5, A.hd[1] + C(a) * 4.5], [A.hd[0] + S(a) * 5.5, A.hd[1] + C(a) * 5.5]], alpha('#1d130c', 0.6), 1); }
}
function trollLeg(g, L, far) {
  const fur = far ? dark(TROLL.fur, 0.1) : TROLL.fur, sk = far ? dark(TROLL.skin, 0.1) : TROLL.skin;
  limb(g, [L.kn, L.ft], [5.0, 4.0], sk, { lw: 1.8 });
  const fx = L.ft[0], fy = L.ft[1];
  toon(g, blob([[fx - 4.4, fy - 3.8], [fx + 2, fy - 4.6], [fx + 8, fy - 2.2], [fx + 8.6, fy + 0.2], [fx - 5, fy + 0.2]], 0.5), far ? dark(TROLL.skinD, 0.1) : TROLL.skinD, { sd: 0.8, hd: 0.5, lw: 1.6 });
  for (const x of [3.4, 5.9, 8.2]) flat(g, poly([[fx + x - 1.1, fy - 0.7], [fx + x + 1.7, fy + 0.1], [fx + x - 0.8, fy + 0.3]]), '#e8e2d2', 0.8);
  // shaggy fur breeches ending in a fringe at the knee
  const u = [L.kn[0] - L.h[0], L.kn[1] - L.h[1]], ul = Math.hypot(u[0], u[1]) || 1, n = [-u[1] / ul, u[0] / ul];
  const P = (k, o) => [L.h[0] + u[0] * k + n[0] * o, L.h[1] + u[1] * k + n[1] * o];
  toon(g, blob([P(-0.3, 0), P(0.0, -7.6), P(0.6, -8.0), P(1.04, -7.0), P(1.24, -4.8), P(1.06, -2.8), P(1.3, -0.6), P(1.08, 1.4), P(1.26, 3.6), P(0.98, 5.8), P(0.5, 7.6), P(0.0, 7.4)], 0.35), fur, { sd: 2, hd: 0.9, lw: 1.8, shade: TROLL.furS });
}
function trollHead(g, r, p) {
  toon(g, poly([[-r * 0.5, -r * 0.15], [-r * 1.3, -r * 0.6], [-r * 0.65, r * 0.3]]), TROLL.skinD, { sd: 0.4, hd: 0.3, lw: 1.5 });   // ear
  // skull + jutting underbite jaw
  toon(g, blob([[-r * 0.75, r * 0.5], [-r * 0.8, -r * 0.3], [-r * 0.2, -r * 0.78], [r * 0.6, -r * 0.68], [r * 1.05, -r * 0.2], [r * 1.25, r * 0.25], [r * 1.0, r * 0.45], [r * 0.2, r * 0.7]], 0.6), TROLL.skin, { sd: 1.4, hd: 0.8, lw: 1.8 });
  const jo = (p.jaw || 0) * r * 0.28;
  if (jo > 0.5) flat(g, poly([[r * 0.1, r * 0.44], [r * 1.15, r * 0.36], [r * 1.2, r * 0.4 + jo], [r * 0.1, r * 0.46 + jo * 0.6]]), '#2a1420', 0);
  toon(g, blob([[-r * 0.55, r * 0.35 + jo * 0.5], [r * 1.25, r * 0.38 + jo], [r * 1.4, r * 0.85 + jo], [r * 0.9, r * 1.2 + jo], [-r * 0.3, r * 1.05 + jo * 0.5]], 0.6), TROLL.skinD, { sd: 1, hd: 0.5, lw: 1.8 });
  for (const [x, s] of [[r * 0.55, 0.85], [r * 1.12, 1.05]]) toon(g, blob([[x - r * 0.14, r * 0.55 + jo], [x - r * 0.22 * s, r * 0.05 + jo], [x - r * 0.02, -r * 0.45 * s + jo], [x + r * 0.12, r * 0.1 + jo], [x + r * 0.14, r * 0.55 + jo]], 0.5), '#f2ead6', { sd: 0.5, hd: 0.4, lw: 1.2 });
  // heavy brow, deep-set glowing eyes, broad nose
  toon(g, blob([[-r * 0.1, -r * 0.42], [r * 0.6, -r * 0.64], [r * 1.12, -r * 0.3], [r * 0.95, -r * 0.12], [r * 0.2, -r * 0.18]], 0.5), dark(TROLL.skin, 0.06), { sd: 0.6, hd: 0.5, lw: 1.4 });
  if (p.eyesClosed) line(g, [[r * 0.35, -r * 0.04], [r * 0.7, -r * 0.0]], OUT, 1.2);
  else { eye(g, r * 0.5, -r * 0.03, r * 0.15, { glow: TROLL.eye, glowCore: '#ffffff', squint: true }); eye(g, r * 0.95, r * 0.01, r * 0.1, { glow: TROLL.eye, glowCore: '#ffffff', squint: true }); }
  toon(g, blob([[r * 0.8, -r * 0.1], [r * 1.42, r * 0.12], [r * 1.38, r * 0.4], [r * 0.95, r * 0.42]], 0.6), dark(TROLL.skin, 0.03), { sd: 0.5, hd: 0.4, lw: 1.4 });
  // shaggy white crown flowing back
  toon(g, shagBlob([[-r * 1.6, r * 0.7], [-r * 1.45, -r * 0.4], [-r * 0.85, -r * 1.05], [0, -r * 1.2], [r * 0.75, -r * 0.92], [r * 0.5, -r * 0.5, 0], [-r * 0.35, -r * 0.42, 0], [-r * 0.75, r * 0.4, 0]], 21, 2), TROLL.fur, { sd: 1.6, hd: 0.7, lw: 1.8, shade: TROLL.furS });
}
function drawTroll(g, p) {
  const J = TR.joints(p), L = J.lean;
  g.save(); if (p.rot) { const pv = p.pivot || [0, 0]; g.translate(pv[0], pv[1]); g.rotate(p.rot); g.translate(-pv[0], -pv[1]); }
  const P = (x, y, f) => { const q = tp(J, x, y); if (f === 0) q.push(0); return q; };
  trollArm(g, J.fa, true);
  trollLeg(g, J.fl, true);
  // barrel torso: bare blue-grey chest and belly
  toon(g, blob([P(-9, 2), P(-12, -9), P(-12.5, -19), P(-8.5, -27.5), P(2, -30.5), P(11, -27), P(13.5, -17), P(12, -6), P(6, 2.5)], 0.7), TROLL.skin, { sd: 2.6, hd: 1.2, lw: 1.8, detail: q => {
    q.strokeStyle = alpha('#2e3a48', 0.45); q.lineWidth = 1.1;
    for (const k of [0, 1]) { const a = P(6 + k * 1.5, -10 - k * 7), b = P(11.5 + k * 0.5, -11 - k * 7); q.beginPath(); q.moveTo(...a); q.quadraticCurveTo(...P(9, -7.5 - k * 7), ...b); q.stroke(); }
  } });
  trollLeg(g, J.nl, false);
  // hide hanging from a rope belt
  const hp = P(4, 1);
  toon(g, blob([[hp[0] - 6, hp[1] - 2], [hp[0] + 6.5, hp[1] - 2.5], [hp[0] + 5.5, hp[1] + 6], [hp[0] + 2.5, hp[1] + 8.5], [hp[0] - 0.5, hp[1] + 6.5], [hp[0] - 4.5, hp[1] + 8]], 0.5), '#7e6650', { sd: 0.8, hd: 0.4, lw: 1.5 });
  line(g, [P(-11, 0.5), P(11.5, -1.5)], OUT, 3.2); line(g, [P(-11, 0.5), P(11.5, -1.5)], '#a08a62', 1.6);
  // shaggy fur hump over back & shoulders -- the top of the silhouette
  toon(g, shagBlob([P(-12, -4), P(-15, -13), P(-15.5, -23), P(-11, -32), P(-2.5, -37), P(6.5, -35.5), P(12.5, -29), P(13, -23, 0), P(7, -24, 0), P(1, -22, 0), P(-5, -14, 0), P(-8, -5, 0)], 41, 2.6), TROLL.fur, { sd: 3, hd: 1.2, lw: 1.8, shade: TROLL.furS,
    detail: q => { q.strokeStyle = alpha('#7a8aa0', 0.55); q.lineWidth = 1; for (const [x, y] of [[-10, -14], [-6, -25], [2, -30], [-12, -24]]) { q.beginPath(); q.moveTo(...P(x, y)); q.lineTo(...P(x - 1, y + 4)); q.stroke(); } } });
  // head jutting forward at shoulder level
  g.save(); const hd = P(16 + (p.headF || 0), -27 + (p.headY || 0)); g.translate(hd[0], hd[1]); g.rotate(-L * 0.6 + (p.tilt || 0));
  trollHead(g, TR.cfg.headR, p);
  g.restore();
  trollArm(g, J.na, false, p.noClub ? null : () => hold(g, J.na, (p.wAng || 0) + (p.clubA ?? 0.1), q => {
    frozenClub(q);
    if (p.impact > 0) { // frost & snow burst where the club lands
      const k = p.impact; glow(q, 0, -30, 16 + 10 * k, FROST, 0.7 * k);
      for (let i = 0; i < 6; i++) { const a = -PI / 2 + (i - 2.5) * 0.5, d = 9 + k * 7; toon(q, poly([[C(a) * 5, -30 + S(a) * 5 - 1], [C(a) * d, -30 + S(a) * d], [C(a) * 5 + 1.5, -30 + S(a) * 5 + 1]]), ICE, { sd: 0.2, hd: 0.3, lw: 0.9, light: '#ffffff', shade: ICE_D }); }
    }
  }));
  // fur cap over the near shoulder
  const sh = J.na.s;
  toon(g, shagBlob([[sh[0] - 7, sh[1] - 3.5], [sh[0] - 3, sh[1] - 7], [sh[0] + 3, sh[1] - 6.5], [sh[0] + 6, sh[1] - 2], [sh[0] + 5, sh[1] + 3.5], [sh[0] + 0.5, sh[1] + 5.5], [sh[0] - 5, sh[1] + 4]], 51, 2.0), TROLL.fur, { sd: 1.8, hd: 0.8, lw: 1.8, shade: TROLL.furS });
  g.restore();
}
const TPose = {
  walk: t => { const p = Pose.walk(t, { stride: 0.45, bobAmp: 2.6, lean: 0.28, arm: 0.3 }); p.lean = 0.28 + S(t * PI * 4) * 0.03; p.tilt = S(t * PI * 4) * 0.04;
    p.na = [0.3 + S(t * PI * 2) * 0.15, 0.35]; p.fa = [0.05 - S(t * PI * 2) * 0.35, 0.35]; p.clubA = 0.3; return p; },
  idle: t => { const b = S(t * PI * 2); const p = Pose.idle(t); p.lean = 0.28 + b * 0.02; p.bob = b * 0.8; p.tilt = b * 0.04; p.na = [0.3, 0.3]; p.fa = [0.1, 0.35]; p.clubA = 0.25; p.nl = [0.14, 0.12]; p.fl = [-0.14, 0.12]; return p; },
  attack: t => keyPose(TROLL_SMASH, t, (p, k) => { p.na = [k[1], k[2]]; p.clubA = k[3]; p.lean = k[4]; p.bob = k[5]; p.fa = [k[6], 0.5]; p.jaw = k[7]; p.tilt = -0.1 * k[7]; p.nl = [k[8], 0.15]; p.fl = [-k[8] * 0.8, 0.15]; p.impact = seg(t, 0.46, 0.52) * (1 - seg(t, 0.62, 0.85)); }),
  death: t => { // stagger, knees buckle, topple forward onto the belly
    const k = ease(seg(t, 0, 0.25)), f = ease(seg(t, 0.25, 0.75)), b = S(seg(t, 0.75, 0.92) * PI);
    const p = basePose(); p.lean = lerp(0.28, 0.12, k) * (1 - f) + 0.4 * f; p.tilt = -0.3 * k * (1 - f) + 0.25 * f; p.jaw = 0.8 * k * (1 - f * 0.4); p.eyesClosed = t > 0.35;
    p.nl = [lerp(0.1, 0.5, k) + f * 0.3, lerp(0.1, 0.7, k) + f * 0.6]; p.fl = [lerp(-0.1, 0.3, k) + f * 0.2, lerp(0.1, 0.8, k) + f * 0.5];
    p.na = [lerp(0.3, 1.6, k) * (1 - f) + 2.1 * f, 0.2]; p.fa = [lerp(0.1, 1.2, k) * (1 - f) + 1.9 * f, 0.3]; p.clubA = lerp(0.3, 1.2, f);
    p.pivot = [12, -3]; p.rot = f * 1.12; p.dx = -2 * k; p.bob = -2.5 * f - b * 1.2; p.noClub = true;
    return p; },
};
function trollClubDrop(g, t) { // the club slips from the hand at once and thuds onto the snow
  const f = ease(seg(t, 0, 0.45)), b = S(seg(t, 0.45, 0.62) * PI) * 2.5;
  g.save(); g.translate(lerp(22.4, 26, f), lerp(-17.5, -4.6, f) - b); g.rotate(lerp(1.22, PI / 2 + 0.06, f) + S(f * PI) * 0.5);
  frozenClub(g); g.restore();
}
// t, near-arm upper, bend, club angle, lean, bob, far arm, jaw, stride
const TROLL_SMASH = [[0, 0.3, 0.3, 0.3, 0.28, 0, 0.1, 0, 0], [0.34, -2.7, 0.9, 0.5, 0.05, -1.6, 1.0, 1, -0.1], [0.5, 0.95, 0.1, 1.75, 0.6, 2.8, 0.5, 1, 0.35],
  [0.64, 1.0, 0.15, 1.7, 0.62, 3.0, 0.45, 0.6, 0.35], [1, 0.3, 0.3, 0.3, 0.28, 0, 0.1, 0, 0]];
// ---------------- War behemoth (custom quadruped) ----------------
const BEH = { coat: '#5b6472', coatL: '#a3b0c0', coatD: '#424a58', skin: '#4a4e5a', skinL: '#5e6371', tusk: '#efe4c8', iron: '#5a616d', rope: '#b49a6a', wood: '#7a5530', eye: '#b4f6ff' };
function behLeg(g, jx, jy, a, lift, front, far, len = 30) {
  const sk = far ? dark(BEH.skin, 0.1) : BEH.skin;
  const ua = a + (front ? 0.05 : 0.35) * lift, la = a - (front ? 1.3 : 1.1) * lift;
  const kn = [jx + S(ua) * len * 0.5, jy + C(ua) * len * 0.5], ft = [kn[0] + S(la) * len * 0.5, Math.min(-2.5, kn[1] + C(la) * len * 0.5)];
  limb(g, [[jx, jy], kn, ft], [9.5, 7.2, 6.8], sk, { lw: 2, sd: 2 });
  toon(g, blob([[ft[0] - 7.4, ft[1] - 1], [ft[0] - 6, ft[1] - 3.2], [ft[0] + 6.4, ft[1] - 3.2], [ft[0] + 7.8, ft[1] - 0.6], [ft[0] + 7.4, ft[1] + 2.5], [ft[0] - 7.4, ft[1] + 2.5]], 0.5), far ? dark(BEH.skinL, 0.1) : BEH.skinL, { sd: 0.8, hd: 0.5, lw: 1.8 });
  for (const x of [-3.2, 0.6, 4.4]) toon(g, ellipse(ft[0] + x, ft[1] + 1.4, 1.5, 1.1), far ? dark(BEH.tusk, 0.12) : BEH.tusk, { sd: 0.2, hd: 0.2, lw: 1 });
  return { kn, ft };
}
function tusk(g, pts, w, col) { // tapered curved tusk
  limb(g, pts, pts.map((_, i) => w * (1 - i / pts.length * 0.85)), col, { lw: 1.6, sd: 0.9, hd: 0.8, tension: 0.5 });
}
function morrowBanner(g, x, y, ph, s = 1, tilt = 0) { // pole with a small wine-red pennant bearing the raven
  g.save(); g.translate(x, y + 22 * s); g.rotate(tilt); g.translate(-x, -y - 22 * s);
  toon(g, rrect(x - 1.1, y, 2.2, 22 * s, 1), BEH.wood, { sd: 0.5, hd: 0.3, lw: 1.2 });
  toon(g, circle(x, y - 0.6, 1.6), GOLD, { sd: 0.4, hd: 0.3, lw: 1 });
  const w = 11 * s, h = 13 * s, p = new Path2D();
  p.moveTo(x - 0.5, y + 1.5);
  for (let i = 0; i <= 6; i++) { const u = i / 6; p.lineTo(x - 0.5 - u * w, y + 1.5 + S(ph + u * 3) * 1.6 * u); }
  p.lineTo(x - 0.5 - w * 0.75 + S(ph + 2) * 1.2, y + 1.5 + h * 0.62); p.lineTo(x - 0.5 - w + S(ph + 3) * 1.6, y + 1.5 + h);
  for (let i = 6; i >= 0; i--) { const u = i / 6; p.lineTo(x - 0.5 - u * w, y + 1.5 + h * 0.92 + S(ph + u * 3 + 0.5) * 1.6 * u); }
  p.closePath();
  toon(g, p, WINE, { sd: 1.2, hd: 0.7, lw: 1.3, detail: q => { raven(q, x - 0.5 - w * 0.48 + S(ph + 1.5) * 0.6, y + 1.5 + h * 0.45, 0.62 * s); q.fillStyle = BLACK; q.fillRect(x - w - 3, y + 1.2, w + 3, 1.6); } });
  g.restore();
}
function drawBehemoth(g, p) {
  // p: legs/lift [nF, fF, nH, fH], bob, rot+pivot (body pitch), head, trunk (curl), jaw, eyesClosed, banner phase, drop (death), roll
  const lg = p.legs, lf = p.lift || [0, 0, 0, 0], drop = p.drop || 0;
  g.save();
  if (p.rot) { const pv = p.pivot || [0, 0]; g.translate(pv[0], pv[1]); g.rotate(p.rot); g.translate(-pv[0], -pv[1]); }
  const by = -(p.bob || 0) + drop;           // body vertical offset
  const FJ = [17, -33 + by], HJ = [-25, -33 + by];
  const legLen = 30 - drop * 0.75;
  // far legs
  behLeg(g, FJ[0] + 4, FJ[1] - 1, lg[1], lf[1], true, true, legLen);
  behLeg(g, HJ[0] + 4, HJ[1] - 1, lg[3], lf[3], false, true, legLen);
  // tail
  const ts = p.tail || 0;
  limb(g, [[-37, -50 + by], [-43, -42 + by + ts], [-45 + ts, -33 + by]], [3.2, 2, 1.4], BEH.skin, { lw: 1.6 });
  toon(g, blob([[-47 + ts, -36 + by], [-43 + ts, -35 + by], [-42 + ts, -28 + by], [-45 + ts, -25 + by], [-48 + ts, -28 + by]], 0.5), BEH.coatD, { sd: 0.6, hd: 0.3, lw: 1.5 });
  // near legs (their tops hide under the coat)
  behLeg(g, HJ[0], HJ[1], lg[2], lf[2], false, false, legLen);
  behLeg(g, FJ[0], FJ[1], lg[0], lf[0], true, false, legLen);
  // body = shaggy coat with a fringed hem
  const R = rng(17), hem = [];
  for (let i = 0; i <= 14; i++) { const u = i / 14; hem.push([lerp(33, -40, u), -17 + by + (i % 2 ? -4 : 0) + R() * 1.4 + S(u * PI) * 1.5 + (p.hemSway || 0) * S(u * 7 + i)]); }
  const coat = blob([[-40, -44 + by], [-36, -60 + by], [-20, -67 + by], [2, -71 + by], [15, -75 + by], [26, -70 + by], [33, -58 + by], [36, -38 + by], ...hem, [-42, -26 + by]], 0.45);
  toon(g, coat, BEH.coat, { sd: 3.2, hd: 1.4, lw: 2, shade: BEH.coatD, detail: q => {
    q.strokeStyle = alpha(BEH.coatL, 0.55); q.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) { const x = -32 + i * 7.5, y0 = -60 + by + Math.abs(i - 5) * 1.4; q.beginPath(); q.moveTo(x, y0); q.quadraticCurveTo(x - 2, y0 + 12, x - 1, y0 + 26 + (i % 2) * 6); q.stroke(); }
    q.strokeStyle = alpha('#1d130c', 0.3); for (let i = 0; i < 6; i++) { const x = -28 + i * 10; q.beginPath(); q.moveTo(x + 3, -40 + by); q.lineTo(x + 1.5, -24 + by); q.stroke(); }
  } });
  // war-saddle: wine blanket with black hem & raven, lashed packs, banner poles
  const sb = by;
  toon(g, blob([[-21, -66 + sb], [12, -73 + sb], [16, -58 + sb], [14, -44 + sb], [-2, -42 + sb], [-19, -45 + sb], [-23, -55 + sb]], 0.4), WINE, { sd: 1.8, hd: 0.9, lw: 1.7, detail: q => {
    q.fillStyle = BLACK; q.beginPath(); q.moveTo(-26, -48 + sb); q.lineTo(18, -47 + sb); q.lineTo(18, -41 + sb); q.lineTo(-26, -41 + sb); q.fill();
    q.fillStyle = GOLD; for (let x = -18; x < 14; x += 6) { q.beginPath(); q.arc(x, -46.5 + sb, 0.9, 0, PI * 2); q.fill(); }
    raven(q, -3, -56 + sb, 0.95);
  } });
  morrowBanner(g, -15, -94 + sb, (p.ph || 0), 1, -(p.poleTilt || 0) * 0.6);
  toon(g, rrect(-19, -76 + sb, 31, 6, 2), BEH.wood, { sd: 1, hd: 0.5, lw: 1.6, detail: q => { q.strokeStyle = alpha('#2a1808', 0.5); q.lineWidth = 0.9; for (let x = -15; x < 12; x += 5) { q.beginPath(); q.moveTo(x, -76 + sb); q.lineTo(x, -70 + sb); q.stroke(); } } });
  toon(g, rrect(-15, -84 + sb, 13, 8.5, 4), '#8a6a48', { sd: 1, hd: 0.5, lw: 1.5 });     // rolled hides
  toon(g, rrect(-2, -86 + sb, 9, 10.5, 2.5), '#6a5640', { sd: 1, hd: 0.5, lw: 1.5 });    // pack
  for (const x of [-10, -5, 2.5]) line(g, [[x, -85 + sb], [x + 0.5, -75 + sb]], BEH.rope, 1.2);
  line(g, [[-19, -71 + sb], [-12, -56 + sb], [10, -58 + sb], [12, -71 + sb]], BEH.rope, 1.3);
  morrowBanner(g, 9, -98 + sb, (p.ph || 0) + 1.3, 1.05, p.poleTilt || 0);
  // head (pivot at the neck), far tusks first
  g.save(); g.translate(29, -54 + by); g.rotate(p.head || 0); g.scale(1.28, 1.28);
  const jaw = p.jaw || 0, tc = p.trunk || 0;
  tusk(g, [[13, 10], [21, 18], [30, 19], [38, 12], [40, 4]], 2.6, dark(BEH.tusk, 0.14));
  tusk(g, [[11, 12], [17, 21], [24, 25], [29, 23]], 2.0, dark(BEH.tusk, 0.14));
  // trunk: chain of segments curling forward
  const tr = [[17, 6]]; let ang = 0.1 - tc * 0.3;
  for (let i = 0; i < 5; i++) { ang += 0.12 + tc * (i * 0.12) - (p.trunkSwing || 0) * 0.05; const l = 7.5 - i * 0.6; const q = tr[tr.length - 1]; tr.push([q[0] + S(ang) * l, q[1] + C(ang) * l]); }
  limb(g, tr, [5.8, 5.2, 4.5, 3.7, 3.0, 2.4], BEH.skin, { lw: 1.6, detail: q => { q.strokeStyle = alpha('#1d130c', 0.35); q.lineWidth = 0.9; for (let i = 1; i < 5; i++) { const [x, y] = tr[i]; q.beginPath(); q.arc(x, y, 4.6 - i * 0.5, -0.4, 1.4); q.stroke(); } } });
  if (jaw > 0.1) flat(g, poly([[9, 8], [16, 8], [15, 9 + jaw * 6], [9, 10]]), '#3a1418', 1.2);
  // skull dome with shaggy crown & ear
  toon(g, blob([[-6, -14], [4, -21], [14, -19], [20, -9], [20, 4], [14, 10], [4, 10], [-6, 2]], 0.6), BEH.skin, { sd: 2, hd: 1, lw: 2 });
  toon(g, blob([[-9, -6], [-4, -18], [3, -24], [10, -22], [6, -16], [0, -12], [-2, -2], [-6, 4]], 0.4), BEH.coat, { sd: 1.4, hd: 0.6, lw: 1.8 });
  toon(g, blob([[-5, -6], [-11, -9], [-12, 2], [-6, 5]], 0.5), dark(BEH.coat, 0.05), { sd: 0.8, hd: 0.4, lw: 1.6 });   // ear
  // armoured brow plate with rivets and a stub horn
  toon(g, blob([[3, -21], [14, -19.5], [19.5, -11], [16, -7], [6, -9.5], [1.5, -15]], 0.45), BEH.iron, { sd: 1.2, hd: 0.9, lw: 1.7, light: '#9aa2b0', detail: q => { q.fillStyle = WINE; q.fillRect(2, -16.2, 18, 2.2); } });
  for (const [x, y] of [[6, -18.5], [11, -18], [16, -12.5], [8, -12]]) toon(g, circle(x, y, 0.9), '#c8ccd4', { sd: 0, hd: 0.3, lw: 0.7 });
  toon(g, poly([[11, -19.5], [14.5, -26], [15.5, -18.5]]), '#c8ccd4', { sd: 0.4, hd: 0.4, lw: 1.2 });
  // eye
  if (p.eyesClosed) line(g, [[12, -5], [16, -4.5]], OUT, 1.3);
  else { glow(g, 14.2, -4.6, 5, BEH.eye, 0.6); flat(g, ellipse(14.2, -4.6, 1.6, 0.9, 0.2), '#effdff', 0.9); }
  line(g, [[10.5, -8], [17.5, -6.2]], OUT, 1.5);
  // near tusks: the long sweeping pair
  tusk(g, [[15, 9], [23, 17.5], [32, 18.5], [40, 12], [43, 3]], 3.0, BEH.tusk);
  tusk(g, [[13, 11], [19, 20], [26, 24], [32, 22.5]], 2.3, BEH.tusk);
  g.restore();
  g.restore();
}
const BPose = {
  walk(t) { const gt = gait(t, 0.36); return { ...gt, bob: Math.abs(S(t * PI * 4)) * 1.2, head: S(t * PI * 2) * 0.04, trunk: 0.1, trunkSwing: S(t * PI * 2) * 2, tail: S(t * PI * 2) * 2, ph: t * PI * 2, hemSway: S(t * PI * 4) * 0.8 }; },
  idle(t) { const b = S(t * PI * 2); return { legs: [0.05, -0.05, -0.05, 0.05], bob: b * 0.6, head: b * 0.03, trunk: 0.15 + b * 0.15, trunkSwing: b * 1.5, tail: b * 1.5, ph: t * PI * 2 }; },
  attack(t) { // tusk hook: head dips then sweeps up, impact ~ frame 3
    const w = ease(seg(t, 0, 0.36)), s = ease(seg(t, 0.36, 0.55)), r = ease(seg(t, 0.62, 1));
    return { legs: [0.12 * s * (1 - r), -0.05, -0.15 * s * (1 - r), 0.05], bob: -1.5 * w * (1 - s) + 1.5 * s * (1 - r), head: (0.32 * w * (1 - s) - 0.42 * s) * (1 - r), trunk: 0.1 - 0.5 * s * (1 - r) + 0.3 * w * (1 - s),
      jaw: s * (1 - r), dxBody: 0, ph: t * 4, tail: 2 * s * (1 - r), rot: (0.04 * w * (1 - s) - 0.06 * s) * (1 - r), pivot: [-25, 0] };
  },
  special(t) { // rear up on the hind legs, trumpet, slam the forefeet down (impact ~ frame 4)
    const u = ease(seg(t, 0, 0.38)), d = seg(t, 0.38, 0.52), de = d * d, r = ease(seg(t, 0.62, 1)), k = u * (1 - de);
    const imp = seg(t, 0.5, 0.56) * (1 - seg(t, 0.62, 0.85));
    return { legs: [0.55 * k + 0.1 * imp, 0.45 * k, -0.18 * k, -0.1 * k], lift: [0.9 * k, 0.75 * k, 0, 0], rot: -0.42 * k + 0.03 * imp, pivot: [-24, 0], bob: -2.5 * imp * (1 - r),
      head: -0.38 * k + 0.12 * imp, trunk: -1.0 * k + 0.2, trunkSwing: -2 * k, jaw: k, ph: t * 5, tail: 3 * k };
  },
  death(t) { // front knees buckle, body sinks and rolls onto its side
    const k = ease(seg(t, 0, 0.35)), f = ease(seg(t, 0.25, 0.8)), b = S(seg(t, 0.8, 0.95) * PI);
    return { legs: [0.5 * k + 0.4 * f, 0.4 * k + 0.4 * f, -0.2 * f, -0.3 * f], lift: [0.9 * k * (1 - f * 0.3), 0.8 * k, 0.6 * f, 0.5 * f], drop: 14 * f + 3 * k * (1 - f) - b, rot: 0.08 * k * (1 - f) + 0.12 * f, pivot: [20, 0],
      head: 0.15 * k + 0.12 * f, trunk: 1.45 * f, trunkSwing: -1.5 * f, jaw: 0.6 * k * (1 - f), eyesClosed: t > 0.3, ph: 2 + t * 2, tail: -2 * f, poleTilt: 0.35 * f };
  },
};
function stompFx(g, t, x, y, s = 1) { // dust & frost shockwave on impact
  const u = seg(t, 0.5, 1); if (u <= 0 || u >= 1) return;
  g.save(); g.globalAlpha = (1 - u) * 0.9;
  const r = 10 + u * 46 * s, e = new Path2D(); e.ellipse(x, y, r, r * 0.3, 0, 0, PI * 2);
  for (let i = 0; i < 5; i++) { const a = PI * (0.9 + i * 0.3), rr = r * 0.85; flat(g, circle(x + C(a) * rr, y + S(a) * rr * 0.3 - 3 - u * 3, 3 + u * 5), alpha('#c8c4bc', 0.7), 0); }
  stroke(g, e, alpha('#3a4658', 0.35), 5 * (1 - u) + 1.5); stroke(g, e, alpha('#ffffff', 0.95), 3.2 * (1 - u) + 0.8); stroke(g, e, alpha(FROST, 0.8), 1.4);
  const R = rng(4);
  for (let i = 0; i < 7; i++) { const a = PI + (i / 6) * PI, rr = r * (0.5 + R() * 0.4); toon(g, poly([[x + C(a) * rr - 1.4, y + S(a) * rr * 0.3], [x + C(a) * rr, y + S(a) * rr * 0.3 - 3 - R() * 3 - (1 - u) * 4], [x + C(a) * rr + 1.4, y + S(a) * rr * 0.3]]), ICE, { sd: 0.3, hd: 0.3, lw: 0.9, light: '#ffffff', shade: ICE_D }); }
  g.restore();
}

// ---------------- Hrimvald, the frost wyrm (boss, fully custom) ----------------
const HR = { scale: '#3c5a7c', scaleD: '#283f5c', scaleL: '#6a8db2', belly: '#d2e3ee', bellyS: '#94afc6', wing: '#2c3a54', wingL: '#566a8c', bone: '#8aa2be',
  claw: '#e8f2f6', mouth: '#1a2440', shard: '#16101e', eye: '#efe4ff' };
const HR_LW = 2.4, HR_K = 0.88;   // HR_K: overall size so the horn tips sit near h=140
function hrHorn(g, base, tip, w, col, bend = 0.25) { // jagged curved ice horn
  const mx = (base[0] + tip[0]) / 2, my = (base[1] + tip[1]) / 2, dx = tip[0] - base[0], dy = tip[1] - base[1];
  const c = [mx - dy * bend, my + dx * bend], n = Math.hypot(dx, dy) || 1, nx = -dy / n, ny = dx / n;
  const pts = [[base[0] + nx * w, base[1] + ny * w], [c[0] + nx * w * 0.55, c[1] + ny * w * 0.55], [tip[0], tip[1]], [c[0] - nx * w * 0.5 + dx * 0.06, c[1] - ny * w * 0.5 + dy * 0.06], [lerp(base[0], c[0], 0.5) - nx * w * 0.9, lerp(base[1], c[1], 0.5) - ny * w * 0.9], [base[0] - nx * w, base[1] - ny * w]];
  toon(g, poly(pts), col, { sd: 1.2, hd: 1, lw: 1.6, light: '#ffffff', shade: ICE_D });
  line(g, [[lerp(base[0], c[0], 0.3), lerp(base[1], c[1], 0.3)], [lerp(c[0], tip[0], 0.5), lerp(c[1], tip[1], 0.5)]], alpha('#ffffff', 0.8), 0.9);
}
// draconic leg from body joint J to a foot planted at F: front = arm (elbow back), hind = thigh/shin/metatarsus (knee forward)
function hrLeg(g, J, F, front, far) {
  const col = far ? dark(HR.scale, 0.14) : HR.scale, scl = q => { q.strokeStyle = alpha(HR.scaleD, 0.7); q.lineWidth = 1; };
  let tip;
  if (front) {
    const W = [F[0] - 3, F[1] - 10], a = 31, b = 28, [ua] = ik2(J, W, a, b, 1), el = [J[0] + S(ua) * a, J[1] + C(ua) * a];
    limb(g, [J, el, W], [15, 10, 7.8], col, { lw: HR_LW, sd: 2.6, light: HR.scaleL, tension: 0.5, detail: q => { scl(q); for (let i = 1; i < 4; i++) { const x = lerp(el[0], W[0], i / 4), y = lerp(el[1], W[1], i / 4); q.beginPath(); q.arc(x, y, 3.4, 0.4, PI - 0.4); q.stroke(); } } });
    toon(g, blob([[W[0] - 6.5, W[1] - 1], [W[0] + 5, W[1] - 3], [F[0] + 10, F[1] - 5], [F[0] + 12, F[1] - 1.5], [F[0] + 8, F[1] + 0.6], [W[0] - 6, F[1] + 0.6]], 0.5), far ? dark(HR.scaleD, 0.1) : HR.scaleD, { sd: 1, hd: 0.6, lw: HR_LW });
    tip = F[0] + 2;
  } else {
    const H = [F[0] - 13, F[1] - 15], a = 30, b = 25, [ua] = ik2(J, H, a, b, -1), kn = [J[0] + S(ua) * a, J[1] + C(ua) * a];
    limb(g, [[J[0] - 2, J[1] - 4], kn, H], [20, 11.5, 7.6], col, { lw: HR_LW, sd: 2.8, light: HR.scaleL, tension: 0.5, detail: q => { scl(q); for (let i = 1; i < 3; i++) { const x = lerp(kn[0], H[0], i / 3), y = lerp(kn[1], H[1], i / 3); q.beginPath(); q.arc(x, y, 3.4, 0.4, PI - 0.4); q.stroke(); } } });
    limb(g, [H, [F[0] - 2, F[1] - 4]], [7.6, 6.2], col, { lw: HR_LW, sd: 1.6, light: HR.scaleL });
    toon(g, blob([[F[0] - 7, F[1] - 6], [F[0] + 4, F[1] - 6.5], [F[0] + 11, F[1] - 4], [F[0] + 12, F[1] - 1], [F[0] + 8, F[1] + 0.6], [F[0] - 7, F[1] + 0.6]], 0.5), far ? dark(HR.scaleD, 0.1) : HR.scaleD, { sd: 1, hd: 0.6, lw: HR_LW });
    toon(g, poly([[H[0] - 3, H[1] + 1], [H[0] - 9, H[1] + 3], [H[0] - 2, H[1] + 5]]), far ? dark(HR.claw, 0.15) : HR.claw, { sd: 0.3, hd: 0.3, lw: 1.1 });   // dew claw
    tip = F[0] + 1;
  }
  for (let i = 0; i < 3; i++) { const x = tip + i * 3.8 - (far ? 1 : 0), y = F[1] - 1; toon(g, poly([[x - 1.8, y - 3.2], [x + 4.8, y + 0.6], [x - 0.2, y + 1.4]]), far ? dark(HR.claw, 0.15) : HR.claw, { sd: 0.3, hd: 0.3, lw: 1.2 }); }
}
function hrWing(g, sh, k, far, droop = 0) { // folded, tattered, frost-rimed wing: high wrist, fingers fanned back, scalloped panels
  const col = far ? dark(HR.wing, 0.12) : HR.wing, bone = far ? dark(HR.bone, 0.14) : HR.bone;
  const W = [sh[0] - 14 - k * 3 - droop * 12, sh[1] - 54 - k * 9 + droop * 34];
  const F = [[-72, 20], [-66, 38], [-50, 52], [-30, 58]].map(([x, y], i) => [W[0] + x * (1 - droop * 0.15), W[1] + y - k * (6 - i) + droop * (10 - i * 2)]);
  const scal = (a, b, d = 0.3) => [lerp((a[0] + b[0]) / 2, W[0], d), lerp((a[1] + b[1]) / 2, W[1], d)];
  const end = [sh[0] - 10, sh[1] + 12];
  const edge = [sh, [lerp(sh[0], W[0], 0.55) + 2, lerp(sh[1], W[1], 0.55)], W, [lerp(W[0], F[0][0], 0.5), lerp(W[1], F[0][1], 0.5) - 4], F[0],
    scal(F[0], F[1], 0.22), [F[1][0] - 1, F[1][1]], [F[1][0] + 3, F[1][1] + 2], scal(F[1], F[2], 0.3), F[2], [F[2][0] + 4, F[2][1] - 3], [F[2][0] + 6, F[2][1] + 1], scal(F[2], F[3], 0.28), F[3], scal(F[3], end, 0.25), end];
  toon(g, blob(edge, 0.35), col, { sd: 2.4, hd: 1.0, lw: 1.9, light: HR.wingL, detail: q => {
    q.strokeStyle = bone; q.lineWidth = 1.7; for (const f of F.slice(1)) { q.beginPath(); q.moveTo(...W); q.lineTo(...f); q.stroke(); }
    q.fillStyle = alpha('#0a1020', 0.65); for (const [u, r] of [[0.62, 2.4], [0.4, 1.7]]) { const x = lerp(W[0], lerp(F[1][0], F[2][0], 0.5), u), y = lerp(W[1], lerp(F[1][1], F[2][1], 0.5), u); q.beginPath(); q.ellipse(x, y, r * 1.5, r, 0.6, 0, PI * 2); q.fill(); }
    q.strokeStyle = alpha('#c8e4f4', far ? 0.25 : 0.5); q.lineWidth = 1.2; q.beginPath(); q.moveTo(...F[0]); q.lineTo(...scal(F[0], F[1], 0.22)); q.lineTo(...F[1]); q.lineTo(...scal(F[1], F[2], 0.3)); q.lineTo(...F[2]); q.stroke();
  } });
  // leading edge: arm bone with frost rime, wrist claw and icicles
  const lead = [sh, [lerp(sh[0], W[0], 0.55) + 2, lerp(sh[1], W[1], 0.55)], W, [lerp(W[0], F[0][0], 0.5), lerp(W[1], F[0][1], 0.5) - 4], F[0]];
  stroke(g, blob(lead, 0.5, false), OUT, 6.2); stroke(g, blob(lead, 0.5, false), bone, 3.8); stroke(g, blob(lead.slice(0, 4), 0.5, false), alpha('#ffffff', far ? 0.3 : 0.7), 1.3);
  toon(g, poly([[W[0] - 3, W[1] + 1.5], [W[0] + 1, W[1] - 9], [W[0] + 3.6, W[1] + 1.5]]), far ? dark(HR.claw, 0.15) : HR.claw, { sd: 0.3, hd: 0.3, lw: 1.2 });
  for (const u of [0.25, 0.5, 0.75]) { const x = lerp(W[0], F[0][0], u), y = lerp(W[1], F[0][1], u) - 2.5; toon(g, poly([[x - 1.4, y + 1], [x, y + 6 + u * 2], [x + 1.4, y + 1]]), ICE, { sd: 0.2, hd: 0.3, lw: 1, light: '#ffffff', shade: ICE_D }); }
}
function hrHead(g, p) {
  const jaw = p.jaw || 0, gl = p.glow || 0, sh = p.shard ?? 1;
  // far horns
  hrHorn(g, [2, -12], [-24, -34], 3.2, dark(ICE, 0.2), 0.16);
  hrHorn(g, [-3, -7], [-36, -22], 3, dark(ICE, 0.2), 0.1);
  // lower jaw hinged at (0,4); the maw interior follows the hinge
  const jr = jaw * 0.62, J2 = (x, y) => [x * C(jr) - y * S(jr), x * S(jr) + y * C(jr) + 4];
  if (jaw > 0.05) {
    flat(g, poly([[-2, 3.5], [39, 2], J2(37, -1), J2(20, -1), J2(-4, -1)]), '#24182f', 0);
    flat(g, blob([J2(4, -2), J2(22, -3.5), J2(30, -1.5), J2(14, -0.5)], 0.6), '#5a3a5e', 0);   // tongue
    if (gl > 0) { const c = J2(18, -6); glow(g, c[0], c[1], 10 + gl * 18, FROST, 0.5 + gl * 0.5); flat(g, ellipse(c[0], c[1], 7 * gl + 1, 3.5 * gl + 0.5, jr * 0.5), alpha('#ffffff', 0.9 * gl), 0); }
  }
  g.save(); g.translate(0, 4); g.rotate(jr);
  toon(g, blob([[-6, -1], [34, -1], [37.5, 2.5], [26, 7.5], [6, 9], [-6, 6]], 0.6), HR.scaleD, { sd: 1.2, hd: 0.6, lw: HR_LW, detail: q => { q.fillStyle = HR.belly; q.fillRect(-8, 5, 48, 6); } });
  for (let i = 0; i < 5; i++) { const x = 9 + i * 5.4; flat(g, poly([[x, -0.6], [x + 1.4, -4.6 - (i === 4 ? 1.2 : 0)], [x + 2.9, -0.6]]), '#f4fbff', 0.8); }
  for (const x of [2, 10]) toon(g, poly([[x - 2, 7], [x - 5, 13], [x + 2, 8.5]]), ICE, { sd: 0.3, hd: 0.3, lw: 1, light: '#ffffff', shade: ICE_D });
  g.restore();
  // skull & snout
  toon(g, blob([[-10, 4], [-9, -8], [2, -15], [15, -14.5], [25, -9.5], [37, -6], [42, -1.5], [40, 3.2], [24, 4.2], [8, 5]], 0.6), HR.scale, { sd: 2.2, hd: 1.2, lw: HR_LW, light: HR.scaleL, detail: q => {
    q.strokeStyle = alpha(HR.scaleD, 0.8); q.lineWidth = 1; for (const [x, y] of [[22, -7], [28, -5], [16, -9]]) { q.beginPath(); q.arc(x, y, 2.2, 0.3, PI - 0.3); q.stroke(); }
    if (sh > 0) { q.strokeStyle = alpha(SHARD, 0.85 * sh); q.lineWidth = 1.2; q.beginPath(); q.moveTo(9, -13); q.lineTo(6, -8); q.lineTo(8, -4); q.moveTo(12, -13); q.lineTo(17, -9); q.lineTo(16, -5); q.moveTo(9, -13); q.lineTo(3, -11); q.stroke(); }
  } });
  for (let i = 0; i < 5; i++) { const x = 11 + i * 5.6, l = i === 4 ? 5.2 : i === 1 ? 4.4 : 3.2; flat(g, poly([[x, 3.4 - i * 0.2], [x + 1.4, 3.4 + l - i * 0.2], [x + 2.8, 3.2 - i * 0.2]]), '#f4fbff', 0.8); }
  // brow ridge spikes, eye
  toon(g, blob([[6, -9], [14, -14], [22, -10.5], [16, -8]], 0.5), HR.scaleD, { sd: 0.6, hd: 0.5, lw: 1.6 });
  if (p.eyesClosed) line(g, [[13, -6], [19, -5.5]], OUT, 1.6);
  else { glow(g, 16, -6.2, 9, SHARD, 0.75 * Math.max(0.4, sh)); flat(g, poly([[12.5, -6.8], [19.5, -7.4], [17, -4.8]]), HR.eye, 0.9); }
  flat(g, ellipse(38, -3.2, 1.6, 1), '#0c1220', 0);
  // crown of ice horns (near side)
  hrHorn(g, [6, -13], [-28, -30], 4.4, ICE, 0.18);
  hrHorn(g, [-2, -10], [-38, -16], 4, ICE, 0.12);
  hrHorn(g, [-6, -3], [-32, 2], 3.2, ICE, 0.08);
  hrHorn(g, [15, -14], [13, -27], 2.6, ICE, -0.15);
  // the black-glass shard in the skull
  if (sh > 0) glow(g, 10, -21, 16 + sh * 10 + (p.shardPulse || 0) * 6, SHARD, 0.55 * sh + 0.15);
  toon(g, poly([[5, -12], [7, -24], [11, -31], [14, -21], [15, -12]]), HR.shard, { sd: 0, hd: 0, lw: 1.6, detail: q => { q.strokeStyle = alpha(SHARD, 0.4 + 0.6 * sh); q.lineWidth = 1.2; q.beginPath(); q.moveTo(7.6, -14); q.lineTo(9.2, -25); q.lineTo(11, -30); q.stroke(); q.fillStyle = alpha('#ffffff', 0.5 * sh); q.beginPath(); q.moveTo(11, -29); q.lineTo(12.6, -21); q.lineTo(11.6, -21); q.fill(); } });
  if (p.vapor !== undefined) breathPuff(g, 41, -2, p.vapor, 0.85);
}
function drawWyrm(g, p) {
  // p: legs/lift [nF, fF, nH, fH] (gait), bob, rot+pivot, neck [3 angles], head, jaw, glow, breath, tail, wing, drop, droop, shard, eyesClosed, vapor
  const lg = p.legs || [0, 0, 0, 0], lf = p.lift || [0, 0, 0, 0], drop = p.drop || 0, gl = p.glow || 0, spr = p.spread || 0;
  g.save(); g.scale(HR_K, HR_K);
  if (p.rot) { const pv = p.pivot || [0, 0]; g.translate(pv[0], pv[1]); g.rotate(p.rot); g.translate(-pv[0], -pv[1]); }
  const by = -(p.bob || 0) + drop;
  const FJ = [24, -64 + by], HJ = [-44, -62 + by];
  const foot = (J, i, fx) => [fx + S(lg[i]) * 34 + (i < 2 ? spr : -spr), -lf[i] * 12];
  // far legs & far wing
  hrLeg(g, [FJ[0] + 7, FJ[1] - 2], foot(FJ, 1, 35), true, true);
  hrLeg(g, [HJ[0] + 7, HJ[1] - 2], foot(HJ, 3, -22), false, true);
  hrWing(g, [14, -100 + by], (p.wing || 0) + 0.2, true, p.droop || 0);
  // tail sweeping down and curling up at the tip (wave travels to the tip)
  const tw = p.tail || 0, tb = [-66, -72 + by], tpts = [tb];
  const TP = [[-20, 15], [-38, 30], [-53, 39], [-66, 41], [-76, 35], [-81, 24]];
  for (let i = 0; i < TP.length; i++) { const u = (i + 1) / TP.length; tpts.push([tb[0] + TP[i][0] + S(tw + u * 2.6) * 4 * u, tb[1] + TP[i][1] * (1 - drop * 0.004) + C(tw + u * 2.6) * 3 * u + drop * u * 0.6]); }
  limb(g, tpts, [20, 16, 12, 9, 7, 5, 3], HR.scale, { lw: HR_LW, sd: 2.6, light: HR.scaleL, tension: 0.5, detail: q => { q.fillStyle = HR.belly; for (let i = 1; i < 5; i++) { const [x, y] = tpts[i]; q.beginPath(); q.ellipse(x + 2, y + 10 - i * 1.6, 8 - i, 3, 0.25 - i * 0.18, 0, PI * 2); q.fill(); } } });
  for (let i = 1; i < 6; i++) { const [x, y] = tpts[i], [x0, y0] = tpts[i - 1], an = Math.atan2(y - y0, x - x0) - PI / 2, s = 1.1 - i * 0.14, w = [20, 16, 12, 9, 7, 5][i] * 0.9;
    toon(g, poly([[x + C(an) * w - 3 * s, y + S(an) * w], [x + C(an) * (w + 9 * s) - 4 * s, y + S(an) * (w + 9 * s)], [x + C(an) * w + 3 * s, y + S(an) * w + 1]]), ICE, { sd: 0.4, hd: 0.4, lw: 1.2, light: '#ffffff', shade: ICE_D }); }
  const tt = tpts[6];
  for (const [dx, dy, l] of [[-2, -9, 9], [-8, -4, 7], [3, -10, 6]]) toon(g, poly([[tt[0] - 2.5, tt[1]], [tt[0] + dx, tt[1] + dy - l * 0.3], [tt[0] + 2.5, tt[1] - 0.5]]), ICE, { sd: 0.4, hd: 0.4, lw: 1.2, light: '#ffffff', shade: ICE_D });
  // massive body with pale belly plates and scale rows
  const body = blob([[-76, -64 + by], [-66, -84 + by], [-42, -98 + by], [-12, -106 + by], [12, -111 + by], [32, -104 + by], [48, -82 + by], [44, -54 + by], [12, -42 + by], [-26, -44 + by], [-58, -50 + by]], 0.7);
  toon(g, body, HR.scale, { sd: 3.8, hd: 1.8, lw: HR_LW, light: HR.scaleL, detail: q => {
    q.fillStyle = HR.belly; q.beginPath(); q.moveTo(50, -74 + by); q.quadraticCurveTo(26, -56 + by, -10, -54 + by); q.quadraticCurveTo(-44, -54 + by, -70, -60 + by); q.lineTo(-70, -30 + by); q.lineTo(50, -30 + by); q.closePath(); q.fill();
    q.strokeStyle = HR.bellyS; q.lineWidth = 1.2; for (let x = -60; x < 44; x += 8) { q.beginPath(); q.moveTo(x, -55 + by + Math.abs(x + 10) * 0.06 - (x > 20 ? (x - 20) * 0.5 : 0)); q.lineTo(x + 2, -40 + by); q.stroke(); }
    q.strokeStyle = alpha(HR.scaleD, 0.75); q.lineWidth = 1.1;
    for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) { const x = -62 + i * 12 + (r % 2) * 6, y = -88 + r * 10 + by + Math.abs(x + 10) * 0.08; q.beginPath(); q.arc(x, y, 3.6, 0.35, PI - 0.35); q.stroke(); }
    if (gl > 0) { q.fillStyle = alpha(FROST, gl * 0.45); q.beginPath(); q.ellipse(40, -70 + by, 12, 16, 0.3, 0, PI * 2); q.fill(); }
  } });
  hrLeg(g, HJ, foot(HJ, 2, -28), false, false);
  // neck rising from the chest; belly plates on the throat glow while the breath gathers
  const nb = [36, -84 + by], A = p.neck || [0.75, 0.42, 0.18], L = [22, 20, 16];
  const np = [nb]; for (let i = 0; i < 3; i++) { const q = np[i]; np.push([q[0] + S(A[i]) * L[i], q[1] - C(A[i]) * L[i]]); }
  const NW = [18, 13, 10.5, 9.5];
  limb(g, np, NW, HR.scale, { lw: HR_LW, sd: 2.8, light: HR.scaleL, tension: 0.5, detail: q => {
    for (let i = 0; i < 3; i++) { const a = np[i], c2 = np[i + 1], ang = A[i]; q.save(); q.translate((a[0] + c2[0]) / 2 + C(ang) * NW[i] * 0.72, (a[1] + c2[1]) / 2 + S(ang) * NW[i] * 0.72); q.rotate(ang); q.fillStyle = gl > 0 ? mix(HR.belly, '#effdff', gl) : HR.belly; q.fillRect(-NW[i] * 0.42, -L[i] * 0.7, NW[i] * 0.84, L[i] * 1.4); q.strokeStyle = HR.bellyS; q.lineWidth = 1; for (let k = -2; k <= 2; k++) { q.beginPath(); q.moveTo(-NW[i] * 0.42, k * L[i] * 0.25); q.lineTo(NW[i] * 0.42, k * L[i] * 0.25); q.stroke(); } q.restore(); }
    if (gl > 0) { q.save(); q.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { const k = Math.min(1, gl * 1.8 - i * 0.28); if (k <= 0) continue; const [x, y] = np[i]; q.fillStyle = alpha(FROST, 0.4 * k); q.beginPath(); q.ellipse(x + 8, y + 5, 11, 11, 0, 0, PI * 2); q.fill(); } q.restore(); }
  } });
  for (let i = 0; i < 3; i++) { const a = np[i], c2 = np[i + 1], m = [(a[0] + c2[0]) / 2, (a[1] + c2[1]) / 2], ang = A[i] - PI, w = NW[i] * 0.8, s = 1 - i * 0.18;
    toon(g, poly([[m[0] + C(ang) * w - 3, m[1] + S(ang) * w + 1], [m[0] + C(ang) * (w + 10 * s) - 6, m[1] + S(ang) * (w + 10 * s) - 1], [m[0] + C(ang) * w + 3, m[1] + S(ang) * w - 1]]), ICE, { sd: 0.4, hd: 0.4, lw: 1.2, light: '#ffffff', shade: ICE_D }); }
  hrLeg(g, FJ, foot(FJ, 0, 28), true, false);
  // dorsal ice spikes along the back
  for (const [x, y, s] of [[-58, -84, 0.85], [-40, -96, 1], [-20, -104, 1.1]]) toon(g, poly([[x - 4 * s, y + by + 3], [x - 7 * s, y + by - 12 * s], [x + 4 * s, y + by + 2]]), ICE, { sd: 0.5, hd: 0.5, lw: 1.3, light: '#ffffff', shade: ICE_D });
  hrWing(g, [10, -98 + by], p.wing || 0, false, p.droop || 0);
  // head at the end of the neck
  const hd = np[3], ha = p.head ?? 0.12;
  g.save(); g.translate(hd[0], hd[1]); g.rotate(ha); g.scale(1.22, 1.22); hrHead(g, p); g.restore();
  // breath cone from the maw
  if (p.breath > 0) {
    const m = [hd[0] + C(ha) * 34 - S(ha) * 10, hd[1] + S(ha) * 34 + C(ha) * 10], a = ha + 0.18, b = p.breath, len = 24 + b * 34;
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(m[0], m[1], 2, m[0], m[1], len);
    gr.addColorStop(0, alpha('#ffffff', 0.95 * b)); gr.addColorStop(0.35, alpha(FROST, 0.7 * b)); gr.addColorStop(1, alpha(FROST, 0));
    g.fillStyle = gr; g.beginPath(); g.moveTo(m[0], m[1]); g.arc(m[0], m[1], len, a - 0.34, a + 0.34); g.closePath(); g.fill();
    g.fillStyle = alpha('#ffffff', 0.55 * b); g.beginPath(); g.moveTo(m[0], m[1]); g.arc(m[0], m[1], len * 0.7, a - 0.1, a + 0.1); g.closePath(); g.fill();
    g.restore();
    const R = rng(7);
    for (let i = 0; i < 7; i++) { const d = 12 + R() * len * 0.8, aa = a + (R() - 0.5) * 0.55; sparkle(g, m[0] + C(aa) * d, m[1] + S(aa) * d, 1.5 + R() * 3, b); }
  }
  g.restore();
}
const WyrmPose = {
  idle(t) { const b = S(t * PI * 2); return { bob: b * 0.9, neck: [0.75 + b * 0.02, 0.42 - b * 0.03, 0.18], head: 0.16 + b * 0.02, tail: t * PI * 2, vapor: t, shardPulse: (b + 1) / 2, wing: b * 0.05 }; },
  walk(t) { const ph = t * PI * 2, gt = gait(t, 0.26);
    return { ...gt, bob: Math.abs(S(ph * 2)) * 1.6 - 0.4, neck: [0.75 + S(ph) * 0.05, 0.42 - S(ph) * 0.06, 0.18 + S(ph) * 0.03], head: 0.16 - S(ph * 2) * 0.03, tail: ph, wing: S(ph * 2) * 0.08, shardPulse: 0.5 }; },
  attack(t) { return keyPose(WYRM_BITE, t, (p, k) => { p.neck = [k[1], k[2], k[3]]; p.head = k[4]; p.jaw = k[5]; p.rot = k[6]; p.pivot = [-30, 0]; p.bob = k[7]; p.tail = t * 3; p.wing = k[8]; p.shardPulse = k[5]; }); },
  special(t) { return keyPose(WYRM_BREATH, t, (p, k) => { p.neck = [k[1], k[2], k[3]]; p.head = k[4]; p.jaw = k[5]; p.glow = k[6]; p.breath = k[7]; p.rot = k[8]; p.pivot = [-30, 0]; p.wing = k[9]; p.tail = t * 4; p.shardPulse = 1; }); },
  death(t) { return keyPose(WYRM_DEATH, t, (p, k) => { p.neck = [k[1], k[2], k[3]]; p.head = k[4]; p.jaw = k[5]; p.drop = k[6]; p.spread = k[6] * 0.45; p.droop = k[7]; p.shard = k[8]; p.shardPulse = k[8] > 0.5 ? 1 : 0; p.eyesClosed = t > 0.55; p.tail = 1.2 + t; p.wing = k[9]; }); },
};
// rows: t, neck a1 a2 a3, head, jaw, body pitch, bob, wing
const WYRM_BITE = [[0, 0.75, 0.42, 0.18, 0.16, 0, 0, 0, 0], [0.28, 0.4, 0.1, -0.15, -0.25, 0.7, -0.04, -1, 0.25], [0.43, 1.5, 1.85, 2.0, 0.72, 1, 0.08, -3, 0.15],
  [0.55, 1.5, 1.9, 2.05, 0.78, 0.05, 0.09, -3.4, 0.1], [0.68, 1.4, 1.7, 1.8, 0.65, 0.1, 0.07, -2.5, 0.05], [1, 0.75, 0.42, 0.18, 0.16, 0, 0, 0, 0]];
// rows: t, neck a1 a2 a3, head, jaw, glow, breath, pitch, wing
const WYRM_BREATH = [[0, 0.75, 0.42, 0.18, 0.16, 0, 0, 0, 0, 0], [0.3, 0.35, -0.05, -0.35, -0.5, 0.5, 0.55, 0, -0.06, 0.5], [0.44, 0.3, -0.1, -0.4, -0.55, 0.75, 0.95, 0, -0.07, 0.6],
  [0.56, 1.15, 1.25, 1.3, 0.32, 1, 1, 1, 0.03, 0.35], [0.76, 1.1, 1.2, 1.25, 0.3, 0.95, 0.65, 0.75, 0.02, 0.3], [1, 0.75, 0.42, 0.18, 0.16, 0, 0, 0, 0, 0]];
// rows: t, neck a1 a2 a3, head, jaw, drop, droop, shard, wing
const WYRM_DEATH = [[0, 0.75, 0.42, 0.18, 0.16, 0, 0, 0, 1, 0], [0.18, 0.35, -0.1, -0.45, -0.6, 1, 0, 0, 1, 0.6], [0.45, 1.1, 1.5, 1.7, 0.5, 0.4, 14, 0.2, 0.7, 0.3],
  [0.72, 1.55, 2.15, 2.35, 0.55, 0.15, 30, 0.55, 0.3, 0], [0.86, 1.6, 2.2, 2.4, 0.5, 0.1, 31, 0.65, 0.05, 0], [1, 1.6, 2.2, 2.4, 0.5, 0.1, 31, 0.68, 0, 0]];

// ---------------- anim helpers ----------------
function hanims(rig, o = {}) {
  const fx = (k, g, t) => { if (o[k]) o[k](g, t); };
  return {
    walk: { frames: 8, fps: o.walkFps || 12, draw: (g, t) => { rig.draw(g, (o.walkPose || (t2 => Pose.walk(t2, o.walk)))(t)); fx('walkFx', g, t); } },
    idle: { frames: 4, fps: o.idleFps || 6, draw: (g, t) => { rig.draw(g, (o.idlePose || Pose.idle)(t)); fx('idleFx', g, t); } },
    attack: { frames: o.atkFrames || 7, fps: o.atkFps || 12, loop: false, ev: o.atkEv || { hit: 3 }, draw: (g, t) => { rig.draw(g, (o.attack || Pose.melee)(t)); fx('attackFx', g, t); } },
    death: { frames: 8, fps: o.deathFps || 12, loop: false, draw: (g, t) => { rig.draw(g, (o.deathPose || (t2 => Pose.death(t2, { forward: o.fallForward })))(t)); fx('deathFx', g, t); } },
    ...(o.special ? { special: { frames: 8, fps: o.specialFps || 10, loop: false, ev: o.specialEv, draw: (g, t) => { rig.draw(g, o.special(t)); fx('specialFx', g, t); } } } : {}),
  };
}

export function jobs() {
  const J = [];
  J.push({ name: 'e_raider', w: 84, h: 64, ax: 42, ay: 55, anims: hanims(raider, { walk: { stride: 0.75, arm: 0.7, lean: 0.2, bobAmp: 2 }, walkFps: 13, attack: swingPose(CHOP), attackFx: chopFx(raider, CHOP, 13) }) });
  J.push({ name: 'e_wolf', w: 84, h: 60, ax: 42, ay: 50, anims: {
    walk: { frames: 8, fps: 16, draw: (g, t) => drawWolf(g, WolfPose.run(t)) },
    idle: { frames: 4, fps: 6, draw: (g, t) => drawWolf(g, WolfPose.idle(t)) },
    attack: { frames: 6, fps: 12, loop: false, ev: { hit: 3 }, draw: (g, t) => drawWolf(g, WolfPose.bite(t)) },
    death: { frames: 8, fps: 11, loop: false, draw: (g, t) => drawWolf(g, WolfPose.death(t)) },
  } });
  J.push({ name: 'e_crossbowman', w: 92, h: 70, ax: 46, ay: 60, anims: hanims(xbow, { walkPose: XPose.walk, idlePose: XPose.idle, attack: XPose.attack, atkFrames: 8, atkEv: { shoot: 0 }, deathFx: xbDrop }) });
  J.push({ name: 'e_knight', w: 104, h: 80, ax: 54, ay: 66, anims: hanims(knight, { walkFps: 9, walk: { stride: 0.4, bobAmp: 1.1, lean: 0.06, arm: 0.3 }, attack: swingPose(CHOP), attackFx: chopFx(knight, CHOP, 19) }) });
  J.push({ name: 'e_witch', w: 132, h: 128, ax: 44, ay: 110, anims: {
    walk: { frames: 8, fps: 10, draw: (g, t) => drawWitch(g, WPose.walk(t)) },
    idle: { frames: 4, fps: 5, draw: (g, t) => drawWitch(g, WPose.idle(t)) },
    attack: { frames: 7, fps: 12, loop: false, ev: { hit: 3 }, draw: (g, t) => drawWitch(g, WPose.attack(t)) },
    special: { frames: 8, fps: 10, loop: false, ev: { cast: 2 }, draw: (g, t) => drawWitch(g, WPose.special(t)) },
    death: { frames: 8, fps: 11, loop: false, draw: (g, t) => witchDeath(g, t) },
  } });
  J.push({ name: 'e_bat', w: 64, h: 68, ax: 34, ay: 44, anims: {
    walk: { frames: 8, fps: 14, draw: (g, t) => drawBat(g, { flap: t * PI * 2, farLag: S(t * PI * 2) * 0.12, dy: S(t * PI * 2) * 1.8 }) },
    idle: { frames: 8, fps: 11, draw: (g, t) => drawBat(g, { flap: t * PI * 2, farLag: S(t * PI * 2) * 0.12, dy: S(t * PI * 2) * 2.2 }) },
    attack: { frames: 6, fps: 12, loop: false, ev: { hit: 2 }, draw: (g, t) => { const d = S(seg(t, 0, 0.85) * PI); drawBat(g, { flap: lerp(0, PI, seg(t, 0.1, 0.5)), open: 1 - d * 0.35, dx: d * 6, dy: d * 4, rot: d * 0.5, bite: seg(t, 0.2, 0.45) * (1 - seg(t, 0.6, 0.9)), head: d * 0.15 }); } },
    death: { frames: 8, fps: 12, loop: false, draw: (g, t) => { const f = ease(t); drawBat(g, { flap: 0.6, open: 1 - f * 0.8, dy: f * f * 12, rot: f * 2.6, dead: t > 0.12 }); } },
  } });
  const trollRig = { draw: drawTroll };   // custom body, rig-style draw(pose) interface
  J.push({ name: 'e_troll', w: 168, h: 116, ax: 62, ay: 100, anims: { ...hanims(trollRig, { walkPose: TPose.walk, idlePose: TPose.idle, attack: TPose.attack, walkFps: 9, atkFps: 11 }),
    death: { frames: 8, fps: 11, loop: false, draw: (g, t) => { trollClubDrop(g, t); drawTroll(g, TPose.death(t)); } } } });
  J.push({ name: 'e_behemoth', w: 200, h: 150, ax: 92, ay: 132, anims: {
    walk: { frames: 8, fps: 8, draw: (g, t) => drawBehemoth(g, BPose.walk(t)) },
    idle: { frames: 4, fps: 5, draw: (g, t) => drawBehemoth(g, BPose.idle(t)) },
    attack: { frames: 7, fps: 10, loop: false, ev: { hit: 3 }, draw: (g, t) => drawBehemoth(g, BPose.attack(t)) },
    special: { frames: 8, fps: 10, loop: false, ev: { stomp: 4 }, draw: (g, t) => { drawBehemoth(g, BPose.special(t)); stompFx(g, t, 24, -1, 1.1); } },
    death: { frames: 8, fps: 10, loop: false, draw: (g, t) => drawBehemoth(g, BPose.death(t)) },
  } });
  J.push({ name: 'e_boss_hrimvald', w: 320, h: 210, ax: 158, ay: 192, anims: {
    walk: { frames: 8, fps: 8, draw: (g, t) => drawWyrm(g, WyrmPose.walk(t)) },
    idle: { frames: 4, fps: 5, draw: (g, t) => drawWyrm(g, WyrmPose.idle(t)) },
    attack: { frames: 8, fps: 11, loop: false, ev: { hit: 3 }, draw: (g, t) => drawWyrm(g, WyrmPose.attack(t)) },
    special: { frames: 8, fps: 10, loop: false, ev: { breath: 4 }, draw: (g, t) => drawWyrm(g, WyrmPose.special(t)) },
    death: { frames: 8, fps: 8, loop: false, draw: (g, t) => drawWyrm(g, WyrmPose.death(t)) },
  } });
  return J;
}
