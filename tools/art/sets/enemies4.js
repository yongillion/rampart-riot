// Rampart Riot — Chapter IV enemies (original bestiary): servants of the Cinder Heart, beyond the Rampart.
// Obsidian bodies, ash, magma seams; the final boss is a fallen star wrapped in a titan of rock and fire.
import { toon, flat, ellipse, circle, rrect, poly, blob, dark, light, mix, alpha, OUT, glow, line, stroke, rng, star, capsule, crescent, eye } from '../lib/toon.js';
import { Pose, basePose, ease, seg } from '../lib/rig.js';

export const scale = 1.5;
const PI = Math.PI, S = Math.sin, C = Math.cos, TAU = PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const V = (a, l) => [S(a) * l, C(a) * l];             // rig convention: 0 = down, +PI/2 = forward (right)
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
const mixP = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
const bump = t => S(clamp(t, 0, 1) * PI);              // 0 -> 1 -> 0

// ---------------- palette ----------------
const OB = '#2a2230', OB_M = '#3a3044', OB_L = '#685a7c', OB_G = '#9a8ab2';   // obsidian (base, mid, glassy light, glint)
const ASH = '#7a746c', ASH_L = '#a29a8e', ASH_D = '#4e4842';
const MAG = '#ff6a1a', MAG_Y = '#ffd04a', HOT = '#fff2b0', MAG_D = '#c2380e';
const CORE = '#fff6d0', GOLD = '#ffc94a', BLUEW = '#cfe8ff';

// ---------------- helpers ----------------
// glowing magma seam along a polyline (additive)
function vein(g, pts, w = 1, heat = 1) {
  if (heat <= 0) return;
  const P = poly(pts, false);
  g.save(); g.globalCompositeOperation = 'lighter';
  stroke(g, P, alpha('#ff4a08', 0.32 * heat), 3.4 * w);
  stroke(g, P, alpha('#ff8a2a', 0.9 * Math.min(1, heat)), 1.5 * w);
  stroke(g, P, alpha('#ffe9a0', Math.min(1, heat)), 0.6 * w);
  g.restore();
}
// non-additive dark crack line
function crack(g, pts, w = 0.8, col = OUT) { line(g, pts, col, w); }
// tapered ribbon along a centerline -> closed Path2D (horns, tails, claws, flames)
function ribbon(pts, w0, w1, round = false) {
  const L = [], R = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d, w = lerp(w0, w1, i / (n - 1)) / 2;
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  return round ? blob([...L, ...R.reverse()], 0.5) : poly([...L, ...R.reverse()]);
}
// centerline points: start (x,y), canvas heading `ang` (0 = +x, +PI/2 = down), total length, total turn
function arcPts(x, y, ang, len, curl = 0, n = 8) {
  const pts = [[x, y]]; let a = ang, px = x, py = y; const st = len / n;
  for (let i = 0; i < n; i++) { a += curl / n; px += Math.cos(a) * st; py += Math.sin(a) * st; pts.push([px, py]); }
  return pts;
}
// small rising embers (loop-safe for t in [0,1))
function embers(g, x, y, n, spread, rise, t, seed = 1, size = 1, col = '#ffb040') {
  const R = rng(seed);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const ph = (R() + t) % 1, ox = (R() - 0.5) * spread, sw = R() * 6;
    const ex = x + ox + S(ph * 5 + sw) * 1.6, ey = y - ph * rise;
    const a = S(ph * PI) * 0.95, r = size * (0.6 + R() * 0.6) * (1 - ph * 0.5);
    g.fillStyle = alpha(col, a * 0.45); g.beginPath(); g.arc(ex, ey, r * 2.2, 0, TAU); g.fill();
    g.fillStyle = alpha('#fff0b0', a); g.beginPath(); g.arc(ex, ey, r * 0.8, 0, TAU); g.fill();
  }
  g.restore();
}
// soft smoke puff
function puff(g, x, y, r, a = 0.5, col = '#4a4048') {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, alpha(col, a)); gr.addColorStop(0.6, alpha(col, a * 0.55)); gr.addColorStop(1, alpha(col, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
// obsidian toon fill: glassy highlight + warm magma under-light
function obs(g, path, o = {}) {
  const base = o.base || OB_M;
  toon(g, path, base, { sd: o.sd ?? 2, hd: o.hd ?? 1.1, lw: o.lw ?? 1.4, light: o.light || OB_L, shade: o.shade || OB, detail: (c) => {
    if (o.warm !== 0) crescent(c, path, 0, -(o.warm ?? 1.4), alpha('#ff6a1a', o.warmA ?? 0.32));
    if (o.detail) o.detail(c);
  } });
}
// glint stroke on glass
function glint(g, pts, a = 0.75, w = 0.8) { line(g, pts, alpha('#e8e0ff', a), w); }

// overhand melee swing (like Pose.melee, but the arm rises in front and comes down over the top,
// instead of looping under the body): a0 rest -> up (> PI: raised behind the head) -> hit (forward-down)
function overhand(t, o = {}) {
  const p = basePose();
  const w = ease(seg(t, 0, 0.4)), s = ease(seg(t, 0.4, 0.58)), r = ease(seg(t, 0.62, 1));
  const a0 = o.a0 ?? 0.2, au = o.up ?? 3.6, ah = o.hit ?? 1.15;
  let up = lerp(a0, au, w); up = lerp(up, ah, s); up = lerp(up, a0, r);
  let el = lerp(0.4, 1.1, w); el = lerp(el, 0.15, s); el = lerp(el, 0.45, r);
  p.na = [up, el];
  p.fa = [lerp(-0.1, 0.5, w) * (1 - r), 0.6];
  p.lean = lerp(0.05, -0.12, w); p.lean = lerp(p.lean, 0.3, s); p.lean = lerp(p.lean, 0.05, r);
  p.nl = [lerp(0.05, 0.35, s * (1 - r)), 0.15]; p.fl = [lerp(-0.05, -0.3, s * (1 - r)), 0.2];
  p.bob = -s * (1 - r) * 1.2; p.dx = s * (1 - r) * 2;
  return p;
}
// ---------------- simple skeleton (same angle conventions as rig.js, so Pose.* drive it) ----------------
function skel(c, p) {
  const hip = [p.dx || 0, -(c.thigh + c.shin) - (p.bob || 0) + (p.dy || 0)];
  const lean = p.lean || 0;
  const U = [S(lean), -C(lean)], F = [C(lean), S(lean)];
  const T = (fx, uy) => [hip[0] + F[0] * fx + U[0] * uy, hip[1] + F[1] * fx + U[1] * uy];
  const neck = T(0, c.torsoH);
  const ht = lean + (p.tilt || 0), nk = c.neckK ?? 0.85;
  const head = [neck[0] + S(ht) * c.headR * nk + c.headR * (c.headFx ?? 0.12), neck[1] - C(ht) * c.headR * nk];
  const shN = T(c.shN[0], c.torsoH - c.shN[1]), shF = T(c.shF[0], c.torsoH - c.shF[1]);
  const hipN = T(c.hipN ?? 1.4, 0), hipF = T(c.hipF ?? -1.4, 0);
  const legJ = (h, a) => { const kn = add(h, V(a[0], c.thigh)); const sa = a[0] - a[1]; return { h, kn, ft: add(kn, V(sa, c.shin)), sa, ta: a[0] }; };
  const armJ = (s, a) => { const el = add(s, V(a[0], c.upper)); const fa = a[0] + a[1]; return { s, el, hd: add(el, V(fa, c.fore)), ua: a[0], fa }; };
  return { hip, neck, head, lean, T, nl: legJ(hipN, p.nl), fl: legJ(hipF, p.fl), na: armJ(shN, p.na), fa: armJ(shF, p.fa) };
}
// whole-body rotation about an optional ground pivot (falls forward onto the ground instead of through it)
function rotAbout(g, p) { if (!p.rot) return; const v = p.pivot || [0, 0]; g.translate(v[0], v[1]); g.rotate(p.rot); g.translate(-v[0], -v[1]); }
// toon capsule limb
function limb(g, a, b, r1, r2, col, o = {}) { toon(g, capsule(a[0], a[1], b[0], b[1], r1, r2), col, { sd: o.sd ?? 1.1, hd: o.hd ?? 0.6, lw: o.lw ?? 1.4, light: o.light, shade: o.shade, detail: o.detail }); }
// run fn in a local frame (origin p, rotation a)
function at(g, p, a, fn) { g.save(); g.translate(p[0], p[1]); if (a) g.rotate(a); fn(g); g.restore(); }

// ============================================================================
// CINDER IMP — small, wiry, horned; crust of cooling lava over a molten body
// ============================================================================
const IMP = { thigh: 4.3, shin: 4.9, torsoH: 7.4, headR: 7.4, upper: 5.6, fore: 5.8, shN: [1.2, 1.7], shF: [-1.6, 2.1], hipN: 1.3, hipF: -1.3 };
const IMP_C = '#432c29';
function impClaws(g, A, far, heat) {
  const a = A.fa;
  for (let i = -1; i <= 1; i++) {
    const ca = a + i * 0.42 + 0.15, h = A.hd;
    const tip = add(h, V(ca, 3.4));
    toon(g, poly([add(h, V(ca + 1.2, 0.9)), tip, add(h, V(ca - 1.2, 0.9))]), far ? '#c8601e' : '#ff9a3a', { sd: 0, hd: 0, lw: 0.9 });
  }
}
function drawImp(g, p, o = {}) {
  const J = skel(IMP, p);
  const heat = o.heat ?? 1, sw = o.swell || 0, lw = 1.35;
  const skin = IMP_C, far = dark(IMP_C, 0.07);
  g.save();
  if (p.rot) g.rotate(p.rot);
  // tail with ember tip
  const tb = J.T(-2.6, 1.6), ta = p.tail || 0;
  const tp = arcPts(tb[0], tb[1], PI * 0.9 + ta * 0.3, 11, 1.6 + ta, 7);
  toon(g, ribbon(tp, 2.6, 0.9), skin, { sd: 0.6, hd: 0.3, lw });
  const te = tp[tp.length - 1];
  glow(g, te[0], te[1], 6, MAG, 0.6 * heat);
  toon(g, blob([[te[0] - 1.6, te[1] + 0.8], [te[0] - 0.4, te[1] - 3.4], [te[0] + 1.9, te[1] - 0.2], [te[0] + 0.4, te[1] + 1.6]], 0.6), '#ff9a2a', { sd: 0.4, hd: 0.4, lw: 1, light: HOT });
  // far arm + leg
  limb(g, J.fa.s, J.fa.el, 1.8, 1.5, far, { lw }); limb(g, J.fa.el, J.fa.hd, 1.5, 1.3, far, { lw });
  impClaws(g, J.fa, true, heat);
  const leg = (L, col) => {
    limb(g, L.h, L.kn, 2.1, 1.6, col, { lw });
    limb(g, L.kn, L.ft, 1.6, 1.2, col, { lw });
    const f = L.ft;
    toon(g, poly([[f[0] - 1.6, f[1] - 1.6], [f[0] + 4.2, f[1] - 0.2], [f[0] + 3.2, f[1] + 0.8], [f[0] - 2, f[1] + 0.8]]), col, { sd: 0.5, hd: 0.3, lw: 1.1 });
  };
  leg(J.fl, far); leg(J.nl, skin);
  // torso: wiry, hunched, molten belly
  at(g, J.hip, J.lean, c => {
    const k = 1 + sw * 0.5;
    const body = blob([[-3.4 * k, 0.8], [-4.2 * k, -3], [-3.4 * k, -6.6], [-1.2, -8.2], [2.2, -7.8], [4.2 * k, -5.2], [4.6 * k, -1.8], [3.2 * k, 1]], 0.75);
    toon(c, body, skin, { sd: 1.6, hd: 0.9, lw, detail: q => {
      const gr = q.createRadialGradient(1.5, -2.5, 0, 1.5, -2.5, 5 * k);
      gr.addColorStop(0, alpha(HOT, 0.85 * heat)); gr.addColorStop(0.45, alpha(MAG, 0.7 * heat)); gr.addColorStop(1, alpha(MAG_D, 0));
      q.fillStyle = gr; q.fillRect(-8, -12, 16, 14);
      vein(q, [[-2.6, -6.8], [-0.8, -4.6], [-1.6, -2.2], [0.2, 0.4]], 0.8, heat * (1 + sw));
      vein(q, [[2.6, -7], [1.4, -5.2], [3.2, -3.6]], 0.7, heat * (1 + sw));
    } });
  });
  // head: big, horned, grinning
  at(g, J.head, J.lean * 0.6 + (p.tilt || 0), c => {
    const r = IMP.headR * (1 + sw * 0.25);
    // far horn
    toon(c, ribbon(arcPts(-r * 0.2, -r * 0.72, -PI * 0.5, r * 1.3, -1.3, 7), r * 0.42, 0.2), '#2a1c22', { sd: 0.4, hd: 0.3, lw: 1.1 });
    // ear (swept back)
    toon(c, poly([[-r * 0.35, -r * 0.15], [-r * 1.75, -r * 0.55], [-r * 0.55, r * 0.3]]), far, { sd: 0.6, hd: 0.3, lw: 1.1 });
    const head = blob([[-r * 0.9, r * 0.15], [-r * 0.75, -r * 0.72], [r * 0.05, -r * 0.98], [r * 0.78, -r * 0.7], [r * 1.08, -r * 0.05], [r * 1.0, r * 0.45], [r * 0.55, r * 0.86], [-r * 0.25, r * 0.82], [-r * 0.82, r * 0.5]], 0.8);
    toon(c, head, skin, { sd: 1.5, hd: 1, lw, detail: q => {
      vein(q, [[-r * 0.55, -r * 0.62], [-r * 0.25, -r * 0.3], [-r * 0.45, r * 0.1], [-r * 0.2, r * 0.45]], 0.7, heat * (1 + sw));
      vein(q, [[r * 0.1, -r * 0.95], [r * 0.15, -r * 0.6]], 0.6, heat * (1 + sw));
    } });
    // near horn: rises, then sweeps back
    toon(c, ribbon(arcPts(r * 0.28, -r * 0.8, -PI * 0.44, r * 1.5, -1.5, 8), r * 0.52, 0.2), '#3a2830', { sd: 0.6, hd: 0.5, lw: 1.1, light: '#6e5262' });
    // brow ridge + glowing eyes
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, r * 0.55, -r * 0.12, r * 0.9, MAG, 0.45 * heat); c.restore();
    flat(c, poly([[r * 0.22, -r * 0.3], [r * 0.82, -r * 0.08], [r * 0.78, r * 0.05], [r * 0.3, -r * 0.05]]), HOT, 0.8);
    line(c, [[r * 0.12, -r * 0.42], [r * 0.95, -r * 0.18]], OUT, 1.2);
    // grin with fire inside
    const m = 0.12 + (p.mouth || 0) * 0.3;
    flat(c, poly([[r * 0.18, r * 0.3], [r * 1.0, r * 0.18], [r * 0.85, r * (0.42 + m)], [r * 0.38, r * (0.5 + m)]]), '#ff8a1a', 0.9);
    flat(c, poly([[r * 0.35, r * 0.36], [r * 0.85, r * 0.27], [r * 0.7, r * (0.38 + m * 0.6)], [r * 0.45, r * (0.42 + m * 0.6)]]), HOT, 0);
    for (const x of [0.42, 0.62, 0.8]) flat(c, poly([[r * x, r * 0.27], [r * (x + 0.07), r * 0.43], [r * (x + 0.13), r * 0.25]]), '#fff6dc', 0.5);
  });
  // near arm + claws
  limb(g, J.na.s, J.na.el, 1.9, 1.6, skin, { lw }); limb(g, J.na.el, J.na.hd, 1.6, 1.4, skin, { lw });
  impClaws(g, J.na, false, heat);
  vein(g, [mixP(J.na.s, J.na.el, 0.2), mixP(J.na.s, J.na.el, 0.8)], 0.5, heat * 0.8);
  g.restore();
}
const ImpPose = {
  walk(t) { const p = Pose.walk(t, { stride: 0.85, arm: 0.55, bobAmp: 2.2, lean: 0.34 }); p.tilt = -0.18 + S(t * TAU * 2) * 0.05; p.tail = S(t * TAU) * 0.5; p.na[0] -= 0.15; p.fa[0] -= 0.2; p.na[1] += 0.55; p.fa[1] += 0.6; return p; },
  idle(t) { const p = Pose.idle(t); const b = S(t * TAU); p.lean = 0.22; p.tilt = -0.1 + b * 0.06; p.na = [0.35 + b * 0.08, 0.7]; p.fa = [-0.1 - b * 0.06, 0.8]; p.nl = [0.25, 0.5]; p.fl = [-0.15, 0.45]; p.bob = 1 + b * 0.5; p.tail = S(t * TAU + 1) * 0.6; return p; },
  attack(t) { const p = overhand(t, { a0: 0.35, up: 3.7, hit: 1.25 }); p.lean += 0.15; p.na[1] += 0.2; p.tail = -0.3 + bump(seg(t, 0.35, 0.8)) * 0.8; p.mouth = bump(seg(t, 0.3, 0.8)); return p; },
};
function impSwipe(g, t) {
  // claw streak trailing the striking hand around the shoulder
  const k = seg(t, 0.38, 0.72); if (k <= 0 || k >= 1) return;
  const J = skel(IMP, ImpPose.attack(t)), s0 = J.na.s, cur = PI / 2 - J.na.fa, a = bump(k);
  g.save(); g.globalAlpha *= a; g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 2; i++) { const arc = new Path2D(); arc.arc(s0[0], s0[1], 13 + i * 2, cur - 1.4 * Math.min(1, k * 1.8), cur); stroke(g, arc, alpha(MAG, 0.5), 3); stroke(g, arc, alpha(HOT, 0.9), 1); }
  g.restore();
}
// fireball: layered flame blob (not additive, so it reads on any ground)
function fireball(g, x, y, r, a = 1, seed = 3) {
  if (a <= 0 || r <= 0) return;
  const R = rng(seed);
  const ring = (rr, j) => { const pts = []; for (let i = 0; i < 11; i++) { const an = (i / 11) * TAU; const q = rr * (0.78 + R() * 0.38 * j); pts.push([x + Math.cos(an) * q, y + Math.sin(an) * q * 0.92 - (Math.sin(an) < 0 ? rr * 0.12 : 0)]); } return blob(pts, 0.8); };
  g.save(); g.globalAlpha *= a;
  flat(g, ring(r, 1), '#ff6a1a', 1.1, '#7a1e08');
  flat(g, ring(r * 0.72, 1), '#ffb43a', 0);
  flat(g, ring(r * 0.42, 0.6), '#fff2b0', 0);
  g.restore();
}
// burning debris chunk thrown on a ballistic arc; lands and cools
function debris(g, i, k, o) {
  const R = rng(o.seed + i * 13);
  const a = -PI / 2 + (R() - 0.5) * (o.cone || 2.4), sp = o.sp * (0.55 + R() * 0.6), sz = o.sz * (0.7 + R() * 0.6);
  let x = o.x + Math.cos(a) * sp * k * (o.hs ?? 1.3), y = o.y + Math.sin(a) * sp * k + o.grav * k * k;
  const ground = -sz * 0.5;
  let rot = (R() - 0.5) * 9 * k;
  if (y > ground) { y = ground; rot = (R() - 0.5) * 1.2; }
  const cool = clamp(k * 1.4, 0, 1);
  at(g, [x, y], rot, c => {
    const sh = poly([[-sz, -sz * 0.35], [-sz * 0.2, -sz], [sz * 0.9, -sz * 0.45], [sz, sz * 0.4], [-sz * 0.1, sz * 0.7]]);
    toon(c, sh, o.col || '#3a2622', { sd: 0.5, hd: 0.4, lw: 0.9, light: o.lightCol });
    if (o.hot !== false) { flat(c, poly([[-sz * 0.4, -sz * 0.2], [sz * 0.3, -sz * 0.45], [sz * 0.45, sz * 0.2], [-sz * 0.1, sz * 0.3]]), mix('#ffd04a', '#a8300c', cool), 0); }
  });
}
// death: swells, cracks go white-hot, bursts into burning fragments
function impDeath(g, t) {
  const sw = ease(seg(t, 0, 0.42)), b = seg(t, 0.42, 1);
  if (t < 0.45) {
    const p = basePose(); const sh = S(t * 60) * sw * 0.7;
    p.dx = sh; p.lean = 0.05 - sw * 0.12; p.tilt = -0.3 * sw; p.na = [0.2 + sw * 1.4, 0.7]; p.fa = [-0.1 - sw * 0.9, 0.6]; p.bob = -sw * 1.5; p.mouth = sw; p.tail = sw;
    p.nl = [0.15 * sw, 0.2]; p.fl = [-0.15 * sw, 0.2];
    glow(g, 1, -15, 12 + sw * 8, MAG, 0.3 + sw * 0.45);
    g.save(); g.translate(1, 0); g.scale(1 + sw * 0.22, 1 + sw * 0.16); g.translate(-1, 0);
    drawImp(g, p, { swell: sw, heat: 1 + sw * 1.6 });
    g.restore();
    return;
  }
  const k = ease(b);
  // smoke behind
  for (let i = 0; i < 4; i++) puff(g, -6 + i * 4.5, -12 - k * 12 - (i % 2) * 3, 7 + k * 6, 0.42 * (1 - k * 0.75), '#3e3438');
  // flash -> fireball -> gone
  fireball(g, 1, -14 - k * 4, 13 * (0.7 + b * 1.2), 1 - seg(b, 0.25, 0.6), 5);
  if (b < 0.2) flat(g, circle(1, -14, 8 * (1 - b / 0.2) + 2), alpha('#fffbe0', 1 - b / 0.2), 0);
  for (let i = 0; i < 7; i++) debris(g, i, k, { seed: 41, x: 1, y: -14, sp: 20, grav: 34, sz: 2.1, cone: 2.0, hs: 0.9 });
  embers(g, 1, -6, 6, 22, 26, b * 0.8, 9, 0.9);
}

// ============================================================================
// ASH LEGION soldiers (spearman, cinder knight): volcanic-glass plate with glowing seams
// ============================================================================
// two-bone IK: joint between a and target b; side +1 = joint clockwise of a->b (elbows down/back), -1 = knees forward
function ik(a, b, l1, l2, side = 1) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
  const ang = Math.atan2(dy, dx) + side * Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const j = [a[0] + Math.cos(ang) * l1, a[1] + Math.sin(ang) * l1];
  const e = Math.atan2(b[1] - j[1], b[0] - j[0]);
  return { j, e: [j[0] + Math.cos(e) * l2, j[1] + Math.sin(e) * l2] };
}
// resolve an arm either by FK angles (rig style) or by a hand target (IK)
function arm(c, J, which, p) {
  const A = J[which], tgt = p[which === 'na' ? 'hN' : 'hF'];
  if (!tgt) return A;
  const r = ik(A.s, tgt, c.upper, c.fore, 1);
  return { s: A.s, el: r.j, hd: r.e, ua: 0, fa: Math.atan2(r.e[0] - r.j[0], r.e[1] - r.j[1]) };
}
// plate segment along a bone: angular obsidian sleeve
function plateSeg(g, a, b, w1, w2, col, o = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, ux = dx / d, uy = dy / d;
  const e1 = o.ext1 ?? 0.8, e2 = o.ext2 ?? 0.8;
  const pts = [
    [a[0] - ux * e1 + nx * w1 * 0.7, a[1] - uy * e1 + ny * w1 * 0.7], [a[0] + nx * w1, a[1] + ny * w1],
    [b[0] + nx * w2, b[1] + ny * w2], [b[0] + ux * e2 + nx * w2 * 0.6, b[1] + uy * e2 + ny * w2 * 0.6],
    [b[0] + ux * e2 - nx * w2 * 0.6, b[1] + uy * e2 - ny * w2 * 0.6], [b[0] - nx * w2, b[1] - ny * w2],
    [a[0] - nx * w1, a[1] - ny * w1], [a[0] - ux * e1 - nx * w1 * 0.7, a[1] - uy * e1 - ny * w1 * 0.7]];
  const P = blob(pts, 0.25);
  obs(g, P, { base: col, sd: o.sd ?? 1.2, hd: o.hd ?? 0.7, lw: o.lw ?? 1.4, warm: o.warm ?? 0.9, detail: o.detail });
  return P;
}
function soldier(g, p, c) {
  const J = skel(c, p);
  const NA = arm(c, J, 'na', p), FA = arm(c, J, 'fa', p);
  const lw = c.lw || 1.45, heat = (p.heat ?? 1) * (c.heat ?? 1);
  const farK = 0.07;
  g.save();
  if (p.alpha !== undefined) g.globalAlpha *= p.alpha;
  rotAbout(g, p);
  const ctx = { J, NA, FA, lw, heat, p, c };
  if (c.back) c.back(g, ctx);
  // far arm
  const armDraw = (A, far) => {
    const cl = far ? dark(c.cloth, farK) : c.cloth, pl = far ? dark(c.plate, farK) : c.plate;
    limb(g, A.s, A.el, c.armR * 1.05, c.armR * 0.9, cl, { lw });
    plateSeg(g, A.el, A.hd, c.armR * 1.15, c.armR * 1.0, pl, { lw, warm: far ? 0 : 0.9 });
    toon(g, circle(A.hd[0], A.hd[1], c.armR * 0.95), far ? dark(c.glove, farK) : c.glove, { sd: 0.6, hd: 0.4, lw });
  };
  armDraw(FA, true);
  if (c.farItem) c.farItem(g, ctx);
  // legs
  const legDraw = (L, far) => {
    const cl = far ? dark(c.cloth, farK) : c.cloth, pl = far ? dark(c.plate, farK) : c.plate;
    limb(g, L.h, L.kn, c.legR * 1.1, c.legR * 0.95, cl, { lw });
    plateSeg(g, L.kn, L.ft, c.legR * 1.1, c.legR * 0.9, pl, { lw, warm: 0.6, ext1: 1.4 });
    const f = L.ft;
    const fk = c.footK ?? 1;
    obs(g, blob([[f[0] - 2.2 * fk, f[1] - 2.4 * fk], [f[0] + 2 * fk, f[1] - 2.6 * fk], [f[0] + 5 * fk, f[1] - 0.6], [f[0] + 4.7 * fk, f[1] + 0.9], [f[0] - 2.5 * fk, f[1] + 0.9]], 0.4), { base: pl, sd: 0.7, hd: 0.5, lw, warm: 0 });
    if (!far) obs(g, ellipse(L.kn[0] + 0.6, L.kn[1], c.legR * 1.15, c.legR * 1.0), { base: pl, sd: 0.6, hd: 0.5, lw: lw * 0.9, warm: 0 });
  };
  legDraw(J.fl, true); legDraw(J.nl, false);
  // torso (hip frame)
  at(g, J.hip, J.lean, q => c.torso(q, ctx));
  if (c.midItem) c.midItem(g, ctx);
  at(g, J.head, J.lean * 0.6 + (p.tilt || 0), q => c.helm(q, ctx));
  armDraw(NA, false);
  if (c.pauldron) c.pauldron(g, ctx, NA);
  if (c.weapon) c.weapon(g, ctx);
  toon(g, circle(NA.hd[0], NA.hd[1], c.armR * 0.95), c.glove, { sd: 0.6, hd: 0.4, lw });
  if (c.front) c.front(g, ctx);
  g.restore();
  return ctx;
}
// cuirass with segmented lames and glowing seams (drawn in hip frame, up = -y)
function cuirass(q, ctx, o) {
  const { c, heat, lw } = ctx; const w = c.torsoW, h = c.torsoH, ch = o.chest || 1.1;
  // cloth under-tunic / skirt
  const sk = blob([[-w * 0.62, -h * 0.3], [w * 0.66, -h * 0.3], [w * 0.78, o.skirt ?? 5.5], [w * 0.1, (o.skirt ?? 5.5) + 1.2], [-w * 0.72, (o.skirt ?? 5.5) - 0.4]], 0.4);
  toon(q, sk, c.cloth, { sd: 1.2, hd: 0.6, lw, detail: g2 => { g2.fillStyle = alpha(MAG, 0.85); g2.fillRect(-w, (o.skirt ?? 5.5) - 1.1, w * 2, 1.2); line(g2, [[w * 0.05, -2], [w * 0.15, 8]], alpha('#000', 0.3), 0.8); } });
  // lames
  for (let i = 0; i < 2; i++) {
    const y0 = -h * 0.42 + i * h * 0.17;
    obs(q, rrect(-w * 0.6, y0 - h * 0.1, w * 1.24, h * 0.18, 1.2), { base: c.plate, sd: 0.8, hd: 0.5, lw: lw * 0.9, warm: 0.6 });
  }
  // breastplate
  const bp = blob([[-w * 0.58, -h * 0.5], [-w * 0.62 * ch, -h * 0.85], [-w * 0.3, -h * 1.06], [w * 0.35, -h * 1.05], [w * 0.68 * ch, -h * 0.82], [w * 0.7, -h * 0.5], [w * 0.1, -h * 0.4]], 0.6);
  obs(q, bp, { base: c.plate, sd: 2, hd: 1.2, lw, warm: 1.2, detail: g2 => {
    vein(g2, [[w * 0.12, -h * 1.0], [w * 0.16, -h * 0.75], [w * 0.1, -h * 0.45]], 0.9, heat);
    vein(g2, [[-w * 0.5, -h * 0.62], [-w * 0.1, -h * 0.55], [w * 0.15, -h * 0.6], [w * 0.62, -h * 0.66]], 0.8, heat);
    glint(g2, [[-w * 0.35, -h * 0.95], [-w * 0.05, -h * 0.98]], 0.55, 0.9);
    if (o.detail) o.detail(g2, w, h);
  } });
  vein(q, [[-w * 0.55, -h * 0.33], [w * 0.62, -h * 0.33]], 0.7, heat * 0.9);
  vein(q, [[-w * 0.55, -h * 0.16], [w * 0.62, -h * 0.16]], 0.6, heat * 0.7);
}

// ---------------- spearman ----------------
const SPEAR_LEN = 60;
const SP = { thigh: 8.8, shin: 8.4, torsoH: 13.6, torsoW: 9.4, headR: 5.5, upper: 7.8, fore: 7.2, armR: 2.4, legR: 2.6, shN: [1.4, 2.4], shF: [-2.4, 2.8], hipN: 1.6, hipF: -1.6,
  cloth: '#68605a', plate: OB_M, glove: '#2e2634', lw: 1.45, footK: 0.85 };
function spearShape(g, len, heat) {
  // drawn along +x from the butt (0,0) to the tip (len,0)
  toon(g, rrect(-1, -1.05, len - 8, 2.1, 1), '#3a2a26', { sd: 0.5, hd: 0.4, lw: 1.1, light: '#6a5048' });
  for (const x of [len * 0.36, len - 12]) toon(g, rrect(x - 1.2, -1.5, 2.4, 3, 0.6), '#8a6a3a', { sd: 0.3, hd: 0.3, lw: 0.9 });
  // tattered ash pennant below the head
  const pen = poly([[len - 13, -1], [len - 21, -1.5], [len - 25, 5.5], [len - 21.5, 4], [len - 20, 8.2], [len - 16.5, 4.6], [len - 13, 3]]);
  toon(g, pen, '#8a8278', { sd: 0.8, hd: 0.4, lw: 1, detail: q => { q.fillStyle = alpha(MAG_D, 0.9); q.fillRect(len - 26, 3.2, 14, 1.2); } });
  // glass spearhead with molten edge
  const hd = poly([[len - 9, -2.4], [len - 3, -2.6], [len + 9, 0], [len - 3, 2.6], [len - 9, 2.4]]);
  obs(g, hd, { base: '#2a2230', sd: 0.8, hd: 0.8, lw: 1.1, warm: 0, light: OB_L, detail: q => { vein(q, [[len - 8, 0], [len + 7, 0]], 0.7, heat); } });
  glow(g, len + 2, 0, 6, MAG, 0.35 * heat);
}
function spearHelm(q, ctx) {
  const r = SP.headR, heat = ctx.heat;
  // tall upright crest (the legion's "tower"): ember-red bristles in a glass frame
  const sway = (ctx.p.crest || 0);
  const crest = blob([[r * 0.2, -r * 0.9], [r * 0.3, -r * 1.9], [r * 0.12 + sway, -r * 2.85], [-r * 0.55 + sway, -r * 2.95], [-r * 0.75 + sway * 0.5, -r * 2.0], [-r * 0.8, -r * 0.95]], 0.45);
  toon(q, crest, '#c0441a', { sd: 1, hd: 0.7, lw: 1.3, light: '#f58a3a', shade: '#7a2412', detail: g2 => {
    g2.strokeStyle = alpha('#5a1a0a', 0.5); g2.lineWidth = 0.55;
    for (let i = 0; i < 4; i++) { const x = -r * 0.62 + i * r * 0.26; g2.beginPath(); g2.moveTo(x, -r * 1.0); g2.lineTo(x + r * 0.1 + sway * 0.8, -r * 2.9); g2.stroke(); }
  } });
  // closed helm: rounded bowl, flared neck guard, jutting face plate
  const helm = blob([[-r * 1.4, r * 0.95], [-r * 1.15, -r * 0.25], [-r * 0.85, -r * 0.95], [-r * 0.1, -r * 1.22], [r * 0.7, -r * 1.0], [r * 1.12, -r * 0.35], [r * 1.25, r * 0.45], [r * 0.85, r * 1.08], [r * 0.1, r * 1.0], [-r * 0.45, r * 0.75]], 0.5);
  obs(q, helm, { base: OB_M, sd: 1.6, hd: 1.1, lw: 1.4, warm: 1.2, detail: g2 => {
    glint(g2, [[-r * 0.7, -r * 0.62], [-r * 0.2, -r * 0.98]], 0.7, 0.9);
    vein(g2, [[-r * 1.2, r * 0.25], [-r * 0.6, r * 0.32], [-r * 0.3, r * 0.75]], 0.55, heat * 0.8);
    line(g2, [[-r * 0.15, -r * 1.1], [-r * 0.2, r * 0.6]], alpha('#000', 0.3), 0.7);
  } });
  obs(q, rrect(-r * 1.1, -r * 1.12, r * 1.95, r * 0.36, r * 0.15), { base: OB, sd: 0.4, hd: 0.4, lw: 1.1, warm: 0, detail: g2 => vein(g2, [[-r * 1.0, -r * 0.94], [r * 0.8, -r * 0.94]], 0.45, heat * 0.7) });
  // glowing T-visor
  flat(q, poly([[r * 0.22, -r * 0.42], [r * 1.18, -r * 0.34], [r * 1.16, -r * 0.08], [r * 0.22, -r * 0.16]]), '#160e14', 0.8);
  q.save(); q.globalCompositeOperation = 'lighter'; glow(q, r * 0.8, -r * 0.25, r * 1.1, MAG, 0.5 * heat); q.restore();
  flat(q, poly([[r * 0.42, -r * 0.33], [r * 1.1, -r * 0.27], [r * 1.09, -r * 0.17], [r * 0.42, -r * 0.23]]), mix(MAG, HOT, 0.55), 0);
  flat(q, poly([[r * 0.7, -r * 0.16], [r * 0.86, -r * 0.16], [r * 0.86, r * 0.62], [r * 0.7, r * 0.62]]), '#160e14', 0);
}
function spearman(g, p) {
  return soldier(g, p, Object.assign({}, SP, {
    torso: (q, ctx) => cuirass(q, ctx, { chest: 1.08, skirt: 6.5 }),
    helm: spearHelm,
    pauldron: (g2, ctx, A) => obs(g2, blob([[A.s[0] - 3.6, A.s[1] + 1.5], [A.s[0] - 2.6, A.s[1] - 2.8], [A.s[0] + 1.8, A.s[1] - 3.2], [A.s[0] + 4.2, A.s[1] + 0.2], [A.s[0] + 3, A.s[1] + 3.6], [A.s[0] - 1.6, A.s[1] + 3.6]], 0.5), { base: OB_M, sd: 1.1, hd: 0.8, lw: 1.35, warm: 1, detail: q => vein(q, [[A.s[0] - 2.8, A.s[1] + 2.6], [A.s[0] + 3.2, A.s[1] + 2.4]], 0.6, ctx.heat) }),
    weapon: (g2, ctx) => {
      const { p, NA, FA } = ctx;
      if (p.dropSpear) return;
      let a = p.spearA ?? -PI / 2, gp = p.grip ?? 0.3;
      if (p.twoHand) a = Math.atan2(NA.hd[1] - FA.hd[1], NA.hd[0] - FA.hd[0]);
      const butt = [NA.hd[0] - Math.cos(a) * SPEAR_LEN * gp, NA.hd[1] - Math.sin(a) * SPEAR_LEN * gp];
      if (p.spearAt) { butt[0] = p.spearAt[0]; butt[1] = p.spearAt[1]; }
      at(g2, butt, a, q => spearShape(q, SPEAR_LEN, ctx.heat));
    },
  }));
}
// shoulder-relative hand target helper
const SPS = (p, dx, dy) => { const J = skel(SP, p); return [J.na.s[0] + dx, J.na.s[1] + dy]; };
const SpearPose = {
  walk(t) {
    const p = Pose.walk(t, { stride: 0.55, arm: 0.45, bobAmp: 1.6, lean: 0.07 });
    p.hN = SPS(p, 4.6, 9.2 + S(t * TAU * 2) * 0.4); p.spearA = -PI / 2 + 0.16; p.grip = 0.3; p.crest = -0.5 - S(t * TAU * 2) * 0.3; return p;
  },
  idle(t) {
    const p = Pose.idle(t); p.lean = 0.03;
    p.hN = SPS(p, 5, 9.5); p.spearA = -PI / 2 + 0.05; p.grip = 0.27;
    p.fa = [-0.08 + S(t * TAU) * 0.03, 0.25]; return p;
  },
  attack(t) {
    const p = basePose();
    const w = ease(seg(t, 0, 0.36)), s = ease(seg(t, 0.36, 0.52)), r = ease(seg(t, 0.62, 1));
    const k = s * (1 - r);
    p.lean = lerp(0.04, -0.06, w) + k * 0.28 - w * r * 0.0;
    p.dx = -w * 1.6 * (1 - s) + k * 5;
    p.nl = [lerp(0.05, 0.12, w) + k * 0.45, 0.15 + k * 0.25]; p.fl = [-0.05 - k * 0.35, 0.15];
    p.bob = -k * 1.4;
    const J = skel(SP, p);
    // hands: chamber (low & back), thrust forward, then return upright
    const sN = J.na.s, sF = J.fa.s;
    const chN = [sN[0] + 0.5, sN[1] + 8.5], chF = [sF[0] - 5.5, sF[1] + 9.5];
    const thN = [sN[0] + 13, sN[1] + 3.5], thF = [sF[0] + 5.5, sF[1] + 6];
    const upN = [sN[0] + 5, sN[1] + 9.5];
    let hN = mixP(upN, chN, w), hF = mixP([sF[0] - 1, sF[1] + 11], chF, w);
    hN = mixP(hN, thN, s); hF = mixP(hF, thF, s);
    hN = mixP(hN, upN, r); hF = mixP(hF, [sF[0] - 1, sF[1] + 11], r);
    p.hN = hN; p.hF = hF;
    // spear axis: upright -> along both hands (lowered) -> back upright
    const J2 = skel(SP, p), NA = arm(SP, J2, 'na', p), FA = arm(SP, J2, 'fa', p);
    const two = Math.atan2(NA.hd[1] - FA.hd[1], NA.hd[0] - FA.hd[0]), up = -PI / 2 + 0.05;
    const down = ease(seg(t, 0, 0.3)), back = ease(seg(t, 0.7, 1));
    p.spearA = lerp(lerp(up, two, down), up, back); p.grip = lerp(lerp(0.27, 0.62, down), 0.27, back);
    return p;
  },
};
// death: the soldier topples backwards, the spear falls behind him across the ground
function spearmanDeath(g, t) {
  const f = clamp(seg(t, 0.05, 0.62), 0, 1), fe = f * f;
  const a = lerp(-PI / 2 + 0.05, -PI - 0.03, fe);
  const butt = [lerp(7, 15, f), lerp(-3, -1.8, f)];
  at(g, butt, a, q => spearShape(q, SPEAR_LEN, 1 - f * 0.7));
  const p = Pose.death(t); p.dropSpear = true; p.heat = 1 - ease(seg(t, 0.3, 1)) * 0.75;
  spearman(g, p);
}

// ============================================================================
// Part-based figures: a list of {z, x, y, a, draw} rendered in z order; deaths can scatter the parts.
// ============================================================================
function renderParts(g, parts) {
  parts.sort((a, b) => a.z - b.z);
  for (const P of parts) { if (P.hide) continue; g.save(); g.translate(P.x, P.y); if (P.a) g.rotate(P.a); if (P.alpha !== undefined) g.globalAlpha *= P.alpha; P.draw(g); g.restore(); }
}
// biped gait with grounded feet: duty = stance fraction; returns near/far foot targets and hip bob
function gait(t, o) {
  const S2 = o.stride / 2, duty = o.duty ?? 0.6, H = o.lift ?? 3;
  const foot = (ph) => {
    ph = ((ph % 1) + 1) % 1;
    if (ph < duty) return { x: lerp(S2, -S2, ph / duty), y: 0, up: 0 };
    const u = (ph - duty) / (1 - duty);
    return { x: lerp(-S2, S2, ease(u)), y: -H * S(u * PI), up: S(u * PI) };
  };
  const bob = (o.bob ?? 1.5) * C(TAU * 2 * (t - duty / 2));   // highest at mid-stance
  return { n: foot(t), f: foot(t + 0.5), bob };
}
// angular rock chunk: obsidian fill with facet line and glint
function rock(g, pts, o = {}) {
  const P = poly(pts);
  obs(g, P, { base: o.base || OB_M, sd: o.sd ?? 1.8, hd: o.hd ?? 1.1, lw: o.lw ?? 1.6, warm: o.warm ?? 1.2, warmA: o.warmA, light: o.light, detail: o.detail });
  return P;
}

// ---------------- obsidian golem ----------------
const GOL = { thigh: 9, shin: 8.6, upper: 14, fore: 13 };
function golemParts(p) {
  const heat = p.heat ?? 1, parts = [];
  const lean = p.lean ?? 0.22;
  const hip = [p.dx || 0, -(GOL.thigh + GOL.shin) * 0.94 - (p.bob || 0)];
  const U = [S(lean), -C(lean)], F = [C(lean), S(lean)];
  const T = (fx, uy) => [hip[0] + F[0] * fx + U[0] * uy, hip[1] + F[1] * fx + U[1] * uy];
  const shN = T(4.5, 26.5), shF = T(-6, 28.5);
  // legs (IK to grounded feet)
  const leg = (h, f, far, z0) => {
    const r = ik(h, [f.x, f.y], GOL.thigh, GOL.shin, -1), kn = r.j, ft = r.e;
    const col = far ? dark(OB_M, 0.06) : OB_M;
    const ta = Math.atan2(kn[0] - h[0], kn[1] - h[1]), sa = Math.atan2(ft[0] - kn[0], ft[1] - kn[1]);
    const id = far ? 'f' : 'n';
    parts.push({ z: z0, x: h[0], y: h[1], a: -ta, id: id + 't', c: [0, 4], draw: q => rock(q, [[-5.6, -2], [5.4, -2.6], [6, 6], [4.5, GOL.thigh + 1], [-4.2, GOL.thigh + 1.4], [-5.8, 5]], { base: col, warm: far ? 0.4 : 1, detail: c2 => vein(c2, [[-4, 3], [-0.5, 5.5], [4, 4]], 0.7, heat * 0.8) }) });
    parts.push({ z: z0 + 0.5, x: kn[0], y: kn[1], a: -sa, id: id + 's', c: [0, 3.5], draw: q => {
      rock(q, [[-4.8, -1.5], [4.6, -1.8], [5.2, GOL.shin - 2], [-5, GOL.shin - 1.6]], { base: col, warm: far ? 0.4 : 1, sd: 1.4 });
      vein(q, [[-4.5, -1.2], [4.5, -1.5]], 0.8, heat);
    } });
    const tilt = (f.up || 0) * 0.25;
    parts.push({ z: z0 + 0.6, x: ft[0], y: ft[1], a: tilt, id: id + 'f', c: [1, -2], draw: q => rock(q, [[-5.6, -4.2], [3.8, -4.4], [8.6, -1.2], [8.8, 0.6], [-6.2, 0.6]], { base: dark(col, 0.04), sd: 1, hd: 0.7, warm: 0.6 }) });
    return { kn, ft };
  };
  const nlh = T(3.2, 0), flh = T(-3.2, 0);
  const NF = p.nf || { x: 5, y: 0 }, FF = p.ff || { x: -5, y: 0 };
  leg(flh, FF, true, 3); leg(nlh, NF, false, 5);
  // arms: FK from pose angles [upper, elbow]
  const armP = (s, a, far, z0) => {
    const el = add(s, V(a[0], GOL.upper)), fa = a[0] + a[1], hd = add(el, V(fa, GOL.fore));
    const col = far ? dark(OB_M, 0.07) : OB_M;
    const id = far ? 'F' : 'N';
    parts.push({ z: z0, x: s[0], y: s[1], a: -a[0], id: id + 'u', c: [0, 6], draw: q => rock(q, [[-5.4, -4], [5, -4.6], [5.6, GOL.upper * 0.6], [4.4, GOL.upper + 1.5], [-4.6, GOL.upper + 1.5], [-5.8, GOL.upper * 0.5]], { base: col, warm: far ? 0.3 : 1, detail: c2 => vein(c2, [[-4.6, GOL.upper * 0.55], [0, GOL.upper * 0.45], [4.6, GOL.upper * 0.62]], 0.7, heat * 0.8) }) });
    parts.push({ z: z0 + 0.3, x: el[0], y: el[1], a: -fa, id: id + 'f', c: [0, 6], draw: q => {
      rock(q, [[-5, -1.5], [5.2, -1.8], [6.4, GOL.fore - 1], [-6.2, GOL.fore - 0.8]], { base: col, warm: far ? 0.3 : 1 });
      vein(q, [[-4.6, -1.2], [4.8, -1.5]], 0.8, heat);
    } });
    // fist: big boulder, knuckles toward the forearm direction
    parts.push({ z: z0 + 0.6, x: hd[0], y: hd[1], a: -fa, id: id + 'x', c: [0, 5], draw: q => {
      rock(q, [[-7.4, -1.6], [7.4, -2.2], [8.6, 6.4], [6.2, 11.6], [-6.4, 12], [-8.8, 6]], { base: col, sd: 2.2, hd: 1.3, warm: far ? 0.3 : 1.3, detail: c2 => {
        for (const x of [-4, 0, 4]) line(c2, [[x, 6], [x + 0.6, 12]], alpha('#000', 0.35), 0.9);
        glint(c2, [[-6, 1], [-6.8, 6]], 0.5, 0.9);
        vein(c2, [[-6.5, 2.4], [-1.5, 3.4], [6.8, 1.8]], 0.7, heat * 0.9);
      } });
    } });
    return { el, hd };
  };
  const NA = armP(shN, p.na || [0.25, 0.25], false, 9), FA = armP(shF, p.fa || [0.05, 0.2], true, 0);
  // torso + back crystals (optionally split in two chunks along a crack for the death)
  const GBODY = [[-10, 1.5], [9, 1.5], [12.5, -9], [15, -21], [12.5, -30.5], [3, -35.5], [-10, -34], [-15.5, -24], [-13.5, -10]];
  const torso = q => {
    const cr = (x, y, a, l, w, k) => { q.save(); q.translate(x, y); q.rotate(a); rock(q, [[-w, 0], [-w * 0.35, -l * 0.7], [0, -l], [w * 0.5, -l * 0.55], [w, 0]], { base: k ? OB_L : OB_M, sd: 1, hd: 0.8, lw: 1.4, warm: 0, light: OB_G, detail: c2 => glint(c2, [[-w * 0.3, -2], [-w * 0.15, -l * 0.6]], 0.8, 0.8) }); q.restore(); };
    cr(-9, -30, -0.7, 13, 3.8, 1); cr(-2, -34, -0.25, 11, 3.4, 0); cr(-13.5, -21, -1.15, 10, 3.2, 0);
    rock(q, GBODY, { sd: 2.6, hd: 1.5, lw: 1.8, warm: 1.6, detail: c2 => {
      // facets: lit top plane, shadowed lower front
      flat(c2, poly([[-14, -27], [-6, -35], [5, -35], [9, -29], [-1, -25]]), alpha(OB_L, 0.5), 0);
      flat(c2, poly([[3, -15], [15, -17], [12, -6], [9, 2], [4, 2]]), alpha('#140f18', 0.32), 0);
      glint(c2, [[-11, -28.5], [-5, -32.5], [2, -33]], 0.75, 1);
      // magma heart: radial glow + jagged radiating cracks
      const g2 = c2.createRadialGradient(5, -19, 0, 5, -19, 8.5);
      g2.addColorStop(0, alpha(HOT, 0.95 * Math.min(1.3, heat))); g2.addColorStop(0.45, alpha(MAG, 0.6 * heat)); g2.addColorStop(1, alpha(MAG_D, 0));
      c2.fillStyle = g2; c2.fillRect(-5, -29, 20, 20);
      vein(c2, [[5, -19], [9, -23], [11, -28], [9.5, -31]], 1.1, heat);
      vein(c2, [[5, -19], [-1, -21], [-6, -19], [-9, -23]], 1, heat);
      vein(c2, [[5, -19], [7, -14], [5, -9], [8, -3]], 1, heat);
      vein(c2, [[5, -19], [0, -13], [-6, -11], [-9, -5]], 0.8, heat * 0.85);
      if (heat > 1.2) vein(c2, [[-6, -19], [-11, -13], [-12, -7]], 0.9, heat - 0.9);
    } });
  };
  const SPLIT = [[-20, -16], [-6, -17], [2, -14], [8, -16], [20, -13]];
  if (p.split) {
    const up = poly([[-30, -60], [30, -60], ...SPLIT.slice().reverse()]), lo = poly([[-30, 10], [30, 10], ...SPLIT.slice().reverse()]);
    const sv = q => { q.save(); q.clip(poly(GBODY)); vein(q, SPLIT, 1.1, heat + 0.3); q.restore(); };
    parts.push({ z: 7, x: hip[0], y: hip[1], a: lean, id: 'tu', c: [0, -26], draw: q => { q.save(); q.clip(up); torso(q); sv(q); q.restore(); } });
    parts.push({ z: 6.9, x: hip[0], y: hip[1], a: lean, id: 'tl', c: [0, -8], draw: q => { q.save(); q.clip(lo); torso(q); sv(q); q.restore(); } });
  } else parts.push({ z: 7, x: hip[0], y: hip[1], a: lean, draw: torso });
  // head: heavy brow, glowing slit, jutting jaw
  const hp = T(11.5, 31);
  parts.push({ z: 8, x: hp[0], y: hp[1], a: lean * 0.5 + (p.tilt || 0), id: 'hd', c: [1, 0], draw: q => {
    q.save(); q.scale(1.2, 1.2);
    rock(q, [[-6, 3.5], [-6.2, -3.6], [-2, -7.2], [5.2, -6.4], [8.2, -2.4], [9.2, 2.2], [6.4, 6.2], [-3, 5.6]], { base: OB_M, sd: 1.6, hd: 1.1, lw: 1.3, warm: 1 });
    rock(q, [[-4.4, -4.4], [3.6, -6.2], [9.4, -3.4], [9.2, -1.0], [1, -1.6], [-4.6, -1.8]], { base: OB, sd: 0.6, hd: 0.6, lw: 1.2, warm: 0, light: OB_L });
    q.save(); q.globalCompositeOperation = 'lighter'; glow(q, 5.5, 0.6, 7, MAG, 0.6 * Math.min(1, heat)); q.restore();
    flat(q, poly([[1.8, -0.4], [8.6, -0.8], [8.2, 1.4], [2.2, 1.2]]), mix(MAG, HOT, 0.65 * Math.min(1, heat)), 0.7);
    vein(q, [[2, 3.6], [7.5, 3.2]], 0.5, heat * 0.8);
    q.restore();
  } });
  return { parts, NA, FA, hip, T };
}
function drawGolem(g, p) { renderParts(g, golemParts(p).parts); }
const GolemPose = {
  walk(t) {
    const G = gait(t, { stride: 14, duty: 0.6, lift: 3.4, bob: 1.1 });
    const sw = S(t * TAU);
    return { nf: { x: G.n.x + 3, y: G.n.y, up: G.n.up }, ff: { x: G.f.x - 3, y: G.f.y, up: G.f.up }, bob: G.bob, lean: 0.22 + S(t * TAU * 2) * 0.015, dx: 0, tilt: S(t * TAU * 2) * 0.03,
      na: [0.22 - sw * 0.2, 0.3 + Math.max(0, -sw) * 0.15], fa: [0.05 + sw * 0.18, 0.25 + Math.max(0, sw) * 0.15] };
  },
  idle(t) {
    const b = S(t * TAU);
    return { nf: { x: 5.5, y: 0 }, ff: { x: -5, y: 0 }, bob: b * 0.5 - 0.3, lean: 0.21 + b * 0.012, na: [0.26 + b * 0.03, 0.3], fa: [0.05 - b * 0.03, 0.25], heat: 0.85 + 0.15 * b };
  },
  attack(t) {
    // both fists raised overhead, hammered down in front
    const w = ease(seg(t, 0, 0.42)), s = ease(seg(t, 0.42, 0.56)), r = ease(seg(t, 0.68, 1));
    let up = lerp(0.28, 3.55, w); up = lerp(up, 1.05, s); up = lerp(up, 0.28, r);
    let el = lerp(0.3, 0.55, w); el = lerp(el, 0.2, s); el = lerp(el, 0.3, r);
    let lean = lerp(0.22, 0.02, w); lean = lerp(lean, 0.5, s); lean = lerp(lean, 0.22, r);
    const step = s * (1 - r);
    return { nf: { x: 5.5 + step * 4, y: 0 }, ff: { x: -5 - step * 1.5, y: 0 }, bob: -w * (1 - s) * 1.5 + step * 2.2, lean,
      na: [up, el], fa: [up - 0.15, el + 0.1], dx: step * 2, heat: 1 + step * 0.6 };
  },
};
// move a part so its local centre `c` lands at world point w with rotation a
function placePart(P, w, a) { const c = P.c || [0, 0]; P.a = a; P.x = w[0] - (C(a) * c[0] - S(a) * c[1]); P.y = w[1] - (S(a) * c[0] + C(a) * c[1]); }
function partCenter(P) { const c = P.c || [0, 0], a = P.a || 0; return [P.x + C(a) * c[0] - S(a) * c[1], P.y + S(a) * c[0] + C(a) * c[1]]; }
// scatter parts toward rest poses {id: [x, y, extraRot, delay]} with a falling arc
function scatter(parts, k, rest, seed = 3) {
  const R = rng(seed);
  for (const P of parts) {
    const r = rest[P.id]; if (!r) continue;
    const d = r[3] ?? R() * 0.2, kk = clamp((k - d) / (1 - d), 0, 1);
    const c0 = partCenter(P), a0 = P.a || 0;
    const x = lerp(c0[0], r[0], ease(kk)), y = lerp(c0[1], r[1], kk * kk) - S(kk * PI) * (r[4] ?? 4);
    placePart(P, [x, Math.min(y, r[1])], a0 + r[2] * ease(kk));
  }
}
// death: cracks flare white-hot, then the golem breaks into tumbling chunks that settle into a rubble heap
const GOLEM_REST = {
  tl: [-1, -9, 0.25, 0.05, 1], tu: [-15, -11, -1.35, 0.1, 6], hd: [13, -7, 1.1, 0.05, 7],
  Nu: [6, -5, -1.2, 0.15], Nf: [18, -5, 1.4, 0.1], Nx: [27, -7, 0.6, 0.0, 5],
  Fu: [-6, -5, 1.0, 0.2], Ff: [-24, -5, -1.4, 0.15], Fx: [-33, -7, -0.7, 0.1, 5],
  nt: [3, -5, 1.2, 0.3, 1], ns: [8, -4.5, 1.5, 0.25, 1], nf: [10, -2, 0.2, 0.3, 0],
  ft: [-5, -5, -1.2, 0.3, 1], fs: [-9, -4.5, -1.5, 0.25, 1], ff: [-11, -2, -0.2, 0.3, 0],
};
function golemDeath(g, t) {
  const crackT = seg(t, 0, 0.3), k = seg(t, 0.28, 1);
  const p = GolemPose.idle(0); p.lean = 0.22 + crackT * 0.12; p.na = [0.4 + crackT * 0.4, 0.45]; p.fa = [0.1, 0.4]; p.tilt = -0.35 * crackT;
  p.heat = 1 + crackT * 1.3 - ease(seg(t, 0.45, 1)) * 1.9; p.split = t > 0.12;
  const G = golemParts(p);
  scatter(G.parts, k, GOLEM_REST, 5);
  g.save(); if (t < 0.32) g.translate(S(t * 70) * 0.9 * crackT, 0);
  renderParts(g, G.parts); g.restore();
  if (t > 0.12 && t < 0.55) glow(g, 6, -34, 24, MAG_Y, 0.55 * bump(seg(t, 0.12, 0.55)));
  if (k > 0) for (let i = 0; i < 5; i++) puff(g, -24 + i * 12, -5 - k * 7, 8 + k * 7, 0.45 * bump(k * 0.9 + 0.1), '#3a3236');
  embers(g, 0, -10, 8, 40, 18 + k * 12, k * 0.9, 21, 1);
}

// ============================================================================
// OBSIDIAN SHARD — a jagged glass splinter skittering on spider legs around a glowing core
// ============================================================================
const SHARD_BODY = [[-8.5, -11.5], [-12, -18.5], [-8, -22], [-11, -30], [-3.5, -25], [1.5, -33], [4.5, -24.5], [11, -22.5], [8, -17.5], [13, -13.5], [4.5, -9.5], [-2.5, -10.5]];
// legs: attach x, rest foot x, phase offset (tripod), near?
const SHARD_LEGS = [[-4, -17, 0.5, 0], [0, -6, 0, 0], [4, 10, 0.5, 0], [-5, -13, 0, 1], [-0.5, 1, 0.5, 1], [3.5, 15, 0, 1]];
function shardLeg(g, at0, ft, near, heat, curl = 0, rest = 0) {
  const dir = rest >= at0[0] ? 1 : -1;
  // spider leg: knee raised high above the body line, thin tibia down to a needle tip
  let kn = [at0[0] + dir * 7 + (ft[0] - rest) * 0.45, at0[1] - 9 + ft[1] * 0.4], f = ft;
  if (curl > 0) { kn = mixP(kn, [at0[0] + dir * 3.5, at0[1] - 4], curl); f = mixP(ft, [at0[0] + dir * 2, at0[1] + 2.5], curl); }
  const col = near ? '#2e2636' : '#1c1622';
  toon(g, ribbon([at0, mixP(at0, kn, 0.5), kn], 2.6, 1.7), col, { sd: 0.5, hd: 0.5, lw: 1.1, light: OB_L });
  toon(g, ribbon([kn, mixP(kn, f, 0.45), f], 1.9, 0.2), col, { sd: 0.4, hd: 0.5, lw: 1.1, light: OB_L });
  if (heat > 0) { g.save(); g.globalCompositeOperation = 'lighter'; flat(g, circle(kn[0], kn[1], 1.05), alpha(MAG, (near ? 0.95 : 0.55) * Math.min(1, heat)), 0); g.restore(); }
}
function drawShard(g, p) {
  const heat = p.heat ?? 1, by = p.bob || 0, rot = p.rot || 0, lunge = p.lunge || 0;
  const piv = [0, -12];
  const xf = (pt) => { const x = pt[0], y = pt[1] + by; const dx = x - piv[0], dy = y - piv[1]; return [piv[0] + lunge + dx * C(rot) - dy * S(rot), piv[1] + dx * S(rot) + dy * C(rot)]; };
  const legs = p.legs || SHARD_LEGS.map(L => [L[1], 0]);
  // far legs
  SHARD_LEGS.forEach((L, i) => { if (!L[3]) shardLeg(g, xf([L[0], -12.5]), legs[i], false, heat * 0.7, p.curl || 0, L[1]); });
  // body
  g.save(); g.translate(piv[0] + lunge, piv[1]); g.rotate(rot); g.translate(-piv[0], -piv[1] + by);
  const B = poly(SHARD_BODY);
  obs(g, B, { base: OB_M, sd: 2, hd: 1.2, lw: 1.5, warm: 1.2, detail: c => {
    flat(c, poly([[-12, -18.5], [-8, -22], [-11, -30], [-3.5, -25], [-2, -18]]), alpha(OB_L, 0.55), 0);
    flat(c, poly([[1.5, -33], [4.5, -24.5], [1, -19], [-1, -25]]), alpha(OB_G, 0.45), 0);
    flat(c, poly([[4, -16], [13, -13.5], [4.5, -9.5], [-2, -10.5]]), alpha('#120d16', 0.4), 0);
    const gr = c.createRadialGradient(0.5, -17, 0, 0.5, -17, 7);
    gr.addColorStop(0, alpha(HOT, 0.95 * heat)); gr.addColorStop(0.35, alpha(MAG_Y, 0.8 * heat)); gr.addColorStop(0.7, alpha(MAG, 0.35 * heat)); gr.addColorStop(1, alpha(MAG, 0));
    c.fillStyle = gr; c.fillRect(-8, -26, 17, 18);
    vein(c, [[0.5, -17], [-3, -21], [-6, -27]], 0.6, heat * 0.8);
    vein(c, [[0.5, -17], [6, -20], [9, -21.5]], 0.6, heat * 0.8);
    vein(c, [[0.5, -17], [5, -13], [10, -13.5]], 0.6, heat * 0.7);
    glint(c, [[-9.5, -20], [-8.5, -25]], 0.8, 0.8); glint(c, [[0, -29], [1.2, -31.5]], 0.85, 0.7);
  } });
  if (p.cracks) vein(g, [[-6, -28], [-1, -21], [3, -17], [1, -12]], 0.9, p.cracks);
  g.restore();
  // near legs
  SHARD_LEGS.forEach((L, i) => { if (L[3]) shardLeg(g, xf([L[0], -12]), legs[i], true, heat, p.curl || 0, L[1]); });
}
const ShardPose = {
  walk(t) {
    const legs = SHARD_LEGS.map(L => {
      const ph = (t + L[2]) % 1, duty = 0.55;
      if (ph < duty) return [L[1] + lerp(3, -3, ph / duty), 0];
      const u = (ph - duty) / (1 - duty);
      return [L[1] + lerp(-3, 3, ease(u)), -3.2 * S(u * PI)];
    });
    return { legs, bob: -0.8 * Math.abs(S(t * TAU * 2)), rot: S(t * TAU * 2) * 0.03, heat: 0.95 + 0.05 * S(t * TAU * 2) };
  },
  idle(t) {
    const b = S(t * TAU);
    return { legs: SHARD_LEGS.map((L, i) => [L[1] + (i === 2 || i === 5 ? b * 0.8 : 0), 0]), bob: b * 0.5, rot: b * 0.02, heat: 0.8 + 0.25 * (0.5 + 0.5 * b) };
  },
  attack(t) {
    // rear up on the hind legs, then stab forward with the crystal tip
    const w = ease(seg(t, 0, 0.4)), s = ease(seg(t, 0.4, 0.55)), r = ease(seg(t, 0.65, 1));
    const rot = lerp(0, -0.4, w) * (1 - s) + 0.35 * s * (1 - r);
    const legs = SHARD_LEGS.map((L, i) => { const front = L[0] > 2; let x = L[1], y = 0; if (front) { y = -6 * w * (1 - s); x += 4 * s * (1 - r) - 2 * w * (1 - s); } return [x, y]; });
    return { legs, rot, bob: -w * (1 - s) * 2 + s * (1 - r) * 1.5, lunge: s * (1 - r) * 4, heat: 1 + s * (1 - r) * 0.4 };
  },
  death(t) {
    const c = ease(seg(t, 0, 0.5)), k = seg(t, 0.35, 1);
    return { legs: SHARD_LEGS.map(L => [L[1] * (1 - c * 0.3), 0]), curl: c, bob: c * 6, rot: k * 0.5, heat: (1 - ease(seg(t, 0.2, 0.8))) * (1 + bump(seg(t, 0, 0.3)) * 0.6), cracks: bump(seg(t, 0.1, 0.6)) * 1.5 };
  },
};
function shardDeath(g, t) {
  const p = ShardPose.death(t);
  if (t < 0.55) { drawShard(g, p); return; }
  // shatter into glass splinters that settle
  const k = seg(t, 0.55, 1);
  const cut = [[[-20, 6], [-20, -40], [-1, -40], [2, 6]], [[2, 6], [-1, -40], [22, -40], [22, 6]]];
  cut.forEach((poly0, i) => {
    g.save();
    const dir = i ? 1 : -1;
    // each half tips outward about its outer foot, settling on the ground
    const pv = [dir * 8, -5];
    g.translate(dir * k * 3, k * k * 4); g.translate(pv[0], pv[1]); g.rotate(dir * ease(k) * 0.9); g.translate(-pv[0], -pv[1]);
    g.beginPath(); poly0.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
    drawShard(g, Object.assign({}, p, { curl: 1 }));
    g.restore();
  });
  for (let i = 0; i < 5; i++) debris(g, i, k, { seed: 61, x: 0, y: -16, sp: 12, grav: 22, sz: 1.5, cone: 2.2, hs: 1, col: OB_M, lightCol: OB_G, hot: false });
}

// ============================================================================
// FIRE DRAKE — lean winged reptile, ember belly, smoky wings
// ============================================================================
// Catmull-Rom sampling through control points
function spline(pts, per = 6) {
  const out = [], n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  out.push(pts[n - 1]);
  return out;
}
// variable-width ribbon: widths[] given per control point (interpolated along the sampled spline)
function body(ctrl, widths, per = 6) {
  const pts = spline(ctrl, per), W = [];
  for (let i = 0; i < pts.length; i++) { const u = i / per, j = Math.min(widths.length - 2, Math.floor(u)); W.push(lerp(widths[j], widths[j + 1], u - j)); }
  const L = [], R = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, w = W[i] / 2;
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  return { path: poly([...L, ...R.reverse()]), pts, W, lower: L, upper: R.slice().reverse() };
}
// smoky bat wing. Points are defined for the raised wing (span up = -y, chord back = -x) and projected with
// vertical factor sy = sin(elevation): 1 = fully up, ~0 = edge-on, negative = swept down. spread folds the fingers.
function drakeWing(g, far, heat, sy, spread = 1, smoke = 0) {
  const sp = spread;
  const pr = (q) => [q[0] + (1 - Math.abs(sy)) * q[1] * 0.18, q[1] * sy];
  const E = pr([-2.5, -11]), W = pr([3, -23]);
  const tips = [[-3 * sp + 3 * (1 - sp), -42 * sp - 22 * (1 - sp)], [-20 * sp, -36 * sp - 18 * (1 - sp)], [-32 * sp - 2, -22 * sp - 12 * (1 - sp)], [-31 * sp - 4, -5 * sp - 6 * (1 - sp)]].map(pr);
  const memCol = far ? '#2e2630' : '#40323c';
  const m = new Path2D();
  m.moveTo(0, 0); m.lineTo(E[0], E[1]); m.lineTo(W[0], W[1]); m.lineTo(tips[0][0], tips[0][1]);
  for (let i = 0; i < tips.length - 1; i++) { const a = tips[i], b = tips[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; const nx = (b[1] - a[1]) / d, ny = -(b[0] - a[0]) / d; const k = 3.4 * sp * Math.sign(sy || 1); m.quadraticCurveTo((a[0] + b[0]) / 2 - nx * k, (a[1] + b[1]) / 2 - ny * k, b[0], b[1]); }
  const root = pr([-12, 3]); m.quadraticCurveTo(root[0] - 6, root[1] + 1, root[0], root[1]); m.closePath();
  toon(g, m, memCol, { sd: 1.6, hd: 0.8, lw: 1.3, light: far ? '#463a46' : '#5e4c58', detail: c => {
    // smoky membrane: darker at the arm, hazy and ember-lit toward the trailing edge
    const mid = mixP(tips[1], tips[2], 0.5);
    const gr = c.createLinearGradient(W[0], W[1], mid[0], mid[1]);
    gr.addColorStop(0, alpha('#1a1216', 0.25)); gr.addColorStop(0.6, alpha('#6a5a64', 0.0)); gr.addColorStop(1, alpha('#8a7a84', 0.35));
    c.fillStyle = gr; c.fillRect(-50, -50, 70, 100);
    for (let i = 0; i < tips.length - 1; i++) { const a = tips[i], b = tips[i + 1]; line(c, [mixP(a, b, 0.15), mixP(a, b, 0.5), mixP(a, b, 0.85)], alpha('#ff7a2a', 0.45 * heat * (far ? 0.5 : 1)), 1.6); }
  } });
  const boneCol = far ? '#1e161c' : '#2c2026';
  const bone = (a, b, w) => toon(g, ribbon([a, mixP(a, b, 0.5), b], w, w * 0.45), boneCol, { sd: 0, hd: 0.5, lw: 0.9, light: '#5a4450' });
  bone([0, 0], E, 3.4); bone(E, W, 2.8);
  tips.forEach((tp, i) => bone(W, tp, i === 0 ? 2.1 : 1.6));
  toon(g, poly([[W[0] - 1, W[1]], [W[0] + 3.6, W[1] - 2.6 * Math.sign(sy || 1)], [W[0] + 1.6, W[1] + 1]]), '#d8c8b0', { sd: 0, hd: 0, lw: 0.8 });
  if (smoke > 0) for (let i = 0; i < 3; i++) { const tp = tips[i + 1]; puff(g, tp[0] - 3, tp[1] + 1, 4.5 + i, 0.32 * smoke, '#4a4048'); }
}
function drawDrake(g, p) {
  const heat = p.heat ?? 1, t = p.t || 0;
  const fl = p.flap ?? 0;                        // -1 = wings down, +1 = wings up
  const by = -24 + (p.dy || 0) - fl * 2.2;       // body rises on the downstroke
  g.save();
  g.translate(0, by); g.rotate(p.rot || 0);
  const tw = p.tailWave ?? 0, nk = p.neck ?? 0, jaw = p.jaw || 0;
  // far wing (behind body)
  // wing elevation -> projection factor (never fully edge-on so the membrane stays readable)
  const wsy = (k) => { const v = lerp(-0.72, 1, (k + 1) / 2); return Math.sign(v || 1) * Math.max(0.2, Math.abs(v)); };
  g.save(); g.translate(-7, -7); g.rotate(-0.22); drakeWing(g, true, heat, wsy(clamp(fl * 0.95 + 0.15, -1, 1)) * 0.92, p.spread ?? 1, p.smoke ?? 0.6); g.restore();
  // tail
  const tail = [[-12, 0], [-22, 1 + S(tw) * 2], [-32, -1 + S(tw + 1.2) * 3.5], [-42, -3 + S(tw + 2.4) * 5], [-51, -6 + S(tw + 3.6) * 6]];
  // hind legs (tucked)
  const leg = (x, far) => {
    const col = far ? '#241c22' : '#33282e';
    const h = [x, 3], k = [x - 4, 9 + (p.legDrop || 0)], f = [x + 1.5, 12.5 + (p.legDrop || 0)];
    toon(g, ribbon([h, k], 5, 3.4, true), col, { sd: 0.6, hd: 0.4, lw: 1.2 });
    toon(g, ribbon([k, f], 3, 2, true), col, { sd: 0.5, hd: 0.3, lw: 1.1 });
    for (let i = 0; i < 3; i++) line(g, [f, [f[0] + 2.4 + i * 0.6, f[1] + 1.2 - i * 0.8]], '#e8dcc4', 1);
  };
  leg(-10, true);
  // body: tail -> hips -> chest -> neck -> head base
  const ctrl = [tail[4], tail[3], tail[2], tail[1], [-12, 0.5], [0, -0.5], [9, -3], [15 + nk * 0.5, -9 - nk], [20 + nk, -14 - nk * 1.5]];
  const wid = [0.8, 3, 4.8, 7, 11, 11.5, 9, 6, 5];
  const B = body(ctrl, wid, 5);
  toon(g, B.path, '#3a2c30', { sd: 1.8, hd: 1, lw: 1.5, light: '#5a4448', detail: c => {
    // ember belly: glowing segmented underside
    const L = B.lower; const bel = [];
    for (let i = Math.floor(L.length * 0.35); i < Math.floor(L.length * 0.92); i++) bel.push(L[i]);
    stroke(c, poly(bel, false), alpha('#ff7a20', 0.95), 5.5);
    stroke(c, poly(bel, false), alpha('#ffc04a', heat), 2.6);
    for (let i = 2; i < bel.length - 1; i += 3) { const q = bel[i]; line(c, [[q[0] - 0.6, q[1] - 3], [q[0] + 0.6, q[1] + 2]], alpha('#7a2a10', 0.8), 0.8); }
    // back ridge scales
    const U = B.upper;
    for (let i = Math.floor(U.length * 0.2); i < Math.floor(U.length * 0.85); i += 3) flat(c, circle(U[i][0], U[i][1] + 1.5, 1.4), alpha('#1e1418', 0.6), 0);
  } });
  // dorsal spines
  const U = B.upper;
  for (let i = Math.floor(U.length * 0.3); i < Math.floor(U.length * 0.82); i += 4) {
    const a = U[i], b = U[Math.min(U.length - 1, i + 1)], ang = Math.atan2(b[1] - a[1], b[0] - a[0]) - PI / 2 - 0.5;
    toon(g, poly([[a[0] - 1.6, a[1] + 0.8], [a[0] + Math.cos(ang) * 4.5, a[1] + Math.sin(ang) * 4.5], [a[0] + 1.6, a[1] + 0.4]]), '#241a1e', { sd: 0, hd: 0.3, lw: 1 });
  }
  // flame tail tip
  const te = tail[4];
  glow(g, te[0], te[1], 8, MAG, 0.5 * heat);
  toon(g, blob([[te[0] + 2, te[1] - 2], [te[0] - 4, te[1] - 5 + S(tw) * 1.5], [te[0] - 9, te[1] - 1], [te[0] - 4, te[1] + 1.6], [te[0] + 2, te[1] + 1.4]], 0.7), '#ff8a2a', { sd: 0.4, hd: 0.5, lw: 1, light: HOT, outline: '#6a1e08' });
  leg(-7, false);
  // head
  const hb = ctrl[ctrl.length - 1];
  g.save(); g.translate(hb[0] + 1, hb[1] - 1); g.rotate(0.12 - nk * 0.15 + (p.headTilt || 0)); g.scale(1.22, 1.22);
  // horns swept back
  toon(g, ribbon(arcPts(-1, -3.5, PI + 0.55, 11, 0.5, 6), 3, 0.2), '#d8c8b0', { sd: 0.4, hd: 0.4, lw: 1.1 });
  // lower jaw hinged at the back of the head; mouth glows when open
  if (jaw > 0.05) {
    flat(g, poly([[-1, 1], [13, 0.2], [12, 2 + jaw * 5], [-1, 3]]), '#ffb43a', 0);
    flat(g, poly([[1, 1.2], [11, 0.8], [9, 1.8 + jaw * 3]]), HOT, 0);
  }
  at(g, [-2, 1.6], jaw * 0.42, c => {
    toon(c, poly([[0, -0.6], [13.5, -0.2], [13, 1.3], [8, 2.6], [0.5, 2.8]]), '#3a2a2e', { sd: 0.5, hd: 0.3, lw: 1.2, light: '#5a4448' });
    for (const x of [6, 9, 11.8]) flat(c, poly([[x, -0.3], [x + 0.7, -1.9], [x + 1.4, -0.3]]), '#f4ead8', 0.5);
  });
  const head = blob([[-4, 2.5], [-4.5, -3.5], [1, -5.5], [8, -4], [14.5, -1.2], [14.5, 1.2], [6, 2.0]], 0.6);
  toon(g, head, '#3e2e32', { sd: 1, hd: 0.8, lw: 1.3, light: '#5e484c' });
  if (p.fire > 0) drakeBreath(g, p.fire, p.t || 0);
  toon(g, ribbon(arcPts(1, -4.5, PI + 0.25, 8, 0.35, 5), 2.4, 0.2), '#e8dcc4', { sd: 0.3, hd: 0.3, lw: 1 });
  eye(g, 4.5, -2.2, 1.25, { glow: MAG_Y, glowCore: HOT });
  flat(g, circle(13.3, -0.6, 0.6), '#140c0e', 0);
  if (heat > 0) { g.save(); g.globalCompositeOperation = 'lighter'; flat(g, circle(13.3, -0.6, 1.2), alpha(MAG, 0.35 * heat), 0); g.restore(); }
  g.restore();
  // near wing (in front)
  g.save(); g.translate(1, -4); g.rotate(0.05); drakeWing(g, false, heat, wsy(fl), p.spread ?? 1, p.smoke ?? 0.6); g.restore();
  g.restore();
}
const DrakePose = {
  fly(t, amp = 1) {
    const ph = t * TAU;
    return { flap: C(ph) * amp, dy: S(ph) * 1.5 * amp, tailWave: ph, neck: S(ph + 0.8) * 0.6, rot: -S(ph) * 0.03, heat: 0.9 + 0.1 * C(ph * 2), smoke: 0.6 };
  },
  attack(t) {
    // rear back, then lunge and belch fire
    const w = ease(seg(t, 0, 0.4)), s = ease(seg(t, 0.4, 0.55)), r = ease(seg(t, 0.75, 1));
    const p = DrakePose.fly(t * 0.999, 0.6);
    p.neck = lerp(0, 2.2, w) * (1 - s) - 1.2 * s * (1 - r);
    p.headTilt = -0.2 * w * (1 - s) + 0.15 * s * (1 - r);
    p.jaw = s * (1 - r) + w * (1 - s) * 0.15;
    p.fire = ease(seg(t, 0.45, 0.6)) * (1 - ease(seg(t, 0.8, 1)));
    p.rot = -0.08 * w * (1 - s) + 0.08 * s * (1 - r);
    return p;
  },
};
// fire gout from the mouth (head-local coords; mouth at ~ (14, 1.5)); f = 0..1 strength
function drakeBreath(g, f, t) {
  const L = 8 + f * 24, x0 = 13.5, y0 = 1.6, R = rng(17);
  const cone = (w0, w1, len, col) => { const e = [x0 + len, y0 + len * 0.18]; flat(g, blob([[x0, y0 - w0], [x0 + len * 0.5, y0 - w1 * 0.7 + len * 0.09], [e[0], e[1] - w1], [e[0] + w1 * 0.7, e[1]], [e[0], e[1] + w1], [x0 + len * 0.5, y0 + w1 * 0.7 + len * 0.09], [x0, y0 + w0]], 0.55), col, 0); };
  g.save(); g.globalAlpha *= Math.min(1, f * 1.6);
  cone(1.6, 2.5 + L * 0.28, L, '#e8501a');
  cone(1.1, 1.8 + L * 0.2, L * 0.85, '#ff9a2a');
  cone(0.7, 1 + L * 0.12, L * 0.6, '#ffd04a');
  cone(0.4, 0.6 + L * 0.06, L * 0.35, HOT);
  for (let i = 0; i < 4; i++) { const u = 0.55 + i * 0.15, r = 2 + u * L * 0.18; flat(g, circle(x0 + u * L + (R() - 0.5) * 3, y0 + u * L * 0.18 + (R() - 0.5) * 4 * u, r), i % 2 ? '#ff7a20' : '#ffb43a', 0); }
  g.restore();
}
function drakeDeath(g, t) {
  // a shriek, wings go limp and fold, it drops; the body flakes away into ash and embers
  const k = ease(seg(t, 0, 0.45)), d = seg(t, 0.3, 1);
  const p = DrakePose.fly(0, 1);
  p.flap = lerp(1, -0.85, k); p.spread = 1 - k * 0.45; p.rot = 0.22 * ease(seg(t, 0.1, 0.7)); p.dy = d * d * 16; p.neck = lerp(1.6, -0.6, k); p.headTilt = -0.4 * bump(seg(t, 0, 0.5));
  p.jaw = bump(seg(t, 0, 0.6)); p.tailWave = 1.4 + k * 1.5; p.heat = 1 - ease(seg(t, 0.25, 0.85)); p.legDrop = k * 2; p.smoke = 1;
  g.save(); g.globalAlpha = 1 - ease(seg(t, 0.5, 1)); drawDrake(g, p); g.restore();
  // ash flakes + smoke where the body crumbles
  if (d > 0) {
    for (let i = 0; i < 6; i++) puff(g, -26 + i * 9, -16 + d * 14 - (i % 2) * 4, 6 + d * 8, 0.5 * bump(d), '#3a3236');
    embers(g, -4, -6 + d * 10, 10, 50, 14, d, 33, 1);
  }
}

// ============================================================================
// ZEALOT OF THE HEART — robed priest, burning halo-disc, chained censer
// ============================================================================
const ZE = { thigh: 9.3, shin: 8.9, torsoH: 13.8, torsoW: 10.2, headR: 6, upper: 8, fore: 7.4, shN: [1.2, 2.3], shF: [-2.3, 2.7], hipN: 1.6, hipF: -1.6 };
const ROBE = '#7c756c', ROBE_D = '#5e5852', MANTLE = '#2e2632', TRIM = '#e0902a';
// burning halo disc (centre cx, cy); fl = flicker phase, k = intensity
function haloDisc(g, cx, cy, r, fl, k = 1) {
  if (k <= 0) return;
  g.save(); g.globalAlpha *= Math.min(1, k);
  glow(g, cx, cy, r * 2.1, MAG, 0.45 * k);
  // flame tongues around the rim
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + fl * 0.4, h = r * (0.42 + 0.22 * S(fl * 2 + i * 1.7)) * (0.8 + 0.2 * k);
    const b0 = [cx + C(a - 0.2) * r, cy + S(a - 0.2) * r], b1 = [cx + C(a + 0.2) * r, cy + S(a + 0.2) * r];
    const tip = [cx + C(a + 0.12) * (r + h), cy + S(a + 0.12) * (r + h) - h * 0.35];
    flat(g, poly([b0, tip, b1]), i % 2 ? '#ff8a2a' : '#ffb43a', 0);
  }
  // disc: dark iron ring with a golden sun face
  toon(g, circle(cx, cy, r), '#c8862a', { sd: 1.2, hd: 0.8, lw: 1.3, light: '#ffd870', shade: '#8a4a14', detail: c => {
    const gr = c.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, alpha(HOT, 0.9 * k)); gr.addColorStop(0.55, alpha(MAG_Y, 0.55 * k)); gr.addColorStop(1, alpha(MAG, 0));
    c.fillStyle = gr; c.fillRect(cx - r, cy - r, r * 2, r * 2);
  } });
  stroke(g, circle(cx, cy, r * 0.72), alpha('#7a3a10', 0.7), 0.8);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; line(g, [[cx + C(a) * r * 0.75, cy + S(a) * r * 0.75], [cx + C(a) * r * 0.95, cy + S(a) * r * 0.95]], alpha('#7a3a10', 0.7), 0.8); }
  g.restore();
}
function censer(g, x, y, heat, t) {
  glow(g, x, y + 1, 8, MAG, 0.5 * heat);
  toon(g, poly([[x - 2.2, y - 2.6], [x + 2.2, y - 2.6], [x + 1.2, y - 4.4], [x - 1.2, y - 4.4]]), '#8a6a3a', { sd: 0.3, hd: 0.3, lw: 0.9 });
  toon(g, blob([[x - 3.4, y - 2.4], [x + 3.4, y - 2.4], [x + 3, y + 1.8], [x, y + 3.4], [x - 3, y + 1.8]], 0.6), '#a07a3a', { sd: 0.9, hd: 0.6, lw: 1.1, light: '#e8c070', detail: c => {
    for (const dx of [-1.6, 0, 1.6]) flat(c, ellipse(x + dx, y - 0.2, 0.55, 1), alpha(HOT, 0.95 * heat), 0);
  } });
  embers(g, x, y - 3, 4, 4, 12, t, 5, 0.7);
}
function zealot(g, p) {
  const J = skel(ZE, p);
  const NA = arm(ZE, J, 'na', p), FA = arm(ZE, J, 'fa', p);
  const heat = p.heat ?? 1, lw = 1.45, t = p.t || 0;
  g.save();
  rotAbout(g, p);
  // halo behind the head
  const hR = 8.6 * (p.haloScale || 1);
  haloDisc(g, J.head[0] - 2.4, J.head[1] - 1.2, hR, p.flick ?? t * TAU, p.halo ?? 1);
  // far arm: bell sleeve
  const sleeve = (A, far) => {
    const col = far ? dark(ROBE, 0.1) : ROBE;
    limb(g, A.s, A.el, 2.6, 2.4, col, { lw });
    const d = [A.hd[0] - A.el[0], A.hd[1] - A.el[1]], L = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / L, d[0] / L];
    const cuff = [A.hd[0] - d[0] / L * 1.2, A.hd[1] - d[1] / L * 1.2];
    toon(g, poly([[A.el[0] + n[0] * 2.4, A.el[1] + n[1] * 2.4], [cuff[0] + n[0] * 4.2, cuff[1] + n[1] * 4.2], [cuff[0] - n[0] * 4.2 + d[0] / L * 1.5, cuff[1] - n[1] * 4.2 + d[1] / L * 1.5], [A.el[0] - n[0] * 2.4, A.el[1] - n[1] * 2.4]]), col, { sd: 1, hd: 0.5, lw, detail: c => line(c, [[cuff[0] + n[0] * 4.2, cuff[1] + n[1] * 4.2], [cuff[0] - n[0] * 4.2 + d[0] / L * 1.5, cuff[1] - n[1] * 4.2 + d[1] / L * 1.5]], TRIM, 1.6) });
    toon(g, circle(A.hd[0], A.hd[1], 2.1), far ? '#5a4a44' : '#7a6458', { sd: 0.5, hd: 0.4, lw });
  };
  sleeve(FA, true);
  // robe skirt from the waist to the hem, following the feet
  const nf = J.nl.ft, ff = J.fl.ft, hip = J.hip;
  const front = Math.max(nf[0], ff[0]) + 3.6, back = Math.min(nf[0], ff[0]) - 4;
  for (const f of [ff, nf]) toon(g, ellipse(f[0] + 1.6, f[1] - 1, 3, 1.7), '#2a2024', { sd: 0.4, hd: 0.3, lw });
  const wa = J.T(5.2, 1), wb = J.T(-5.2, 1.5);
  const hemY = Math.min(-0.8, Math.max(nf[1], ff[1]) - 1.2);
  const skirt = blob([[wb[0], wb[1]], [wa[0], wa[1]], [lerp(wa[0], front, 0.5) + 1, lerp(wa[1], hemY, 0.5)], [front + 1, hemY - 1.2], [front - 1, hemY + 0.3], [(front + back) / 2 + (p.hemSway || 0), hemY + 0.6], [back + 0.5, hemY + 0.3], [back - 1.4, hemY - 1.5], [lerp(wb[0], back, 0.5) - 1.2, lerp(wb[1], hemY, 0.5)]], 0.45);
  toon(g, skirt, ROBE, { sd: 2, hd: 1, lw, detail: c => {
    c.fillStyle = TRIM; c.fillRect(-30, hemY - 2.4, 60, 1.6);
    line(c, [[J.T(1.2, 0)[0], J.T(1.2, 0)[1]], [(front + back) / 2 + 2, hemY - 1]], alpha('#000', 0.22), 0.9);
    line(c, [[J.T(-2.5, 0)[0], J.T(-2.5, 0)[1]], [back + 3, hemY - 1]], alpha('#000', 0.18), 0.8);
  } });
  // torso: robe with dark mantle and sun-sash
  at(g, hip, J.lean, q => {
    const w = ZE.torsoW, h = ZE.torsoH;
    const tor = blob([[-w * 0.5, 1], [-w * 0.6, -h * 0.5], [-w * 0.5, -h * 0.95], [w * 0.35, -h * 1.02], [w * 0.62, -h * 0.6], [w * 0.55, 1]], 0.7);
    toon(q, tor, ROBE, { sd: 1.8, hd: 1, lw });
    // mantle over the shoulders
    const man = blob([[-w * 0.68, -h * 0.45], [-w * 0.6, -h * 1.0], [w * 0.1, -h * 1.12], [w * 0.68, -h * 0.85], [w * 0.62, -h * 0.55], [w * 0.1, -h * 0.62], [-w * 0.3, -h * 0.35]], 0.6);
    toon(q, man, MANTLE, { sd: 1.2, hd: 0.8, lw, light: '#4a3e50', detail: c => line(c, [[-w * 0.62, -h * 0.5], [-w * 0.3, -h * 0.4], [w * 0.1, -h * 0.66], [w * 0.62, -h * 0.6]], TRIM, 1.1) });
    // sash with a sun medallion
    toon(q, poly([[w * 0.05, -h * 0.62], [w * 0.4, -h * 0.65], [w * 0.5, 1.5], [w * 0.15, 1.5]]), '#b8661e', { sd: 0.5, hd: 0.4, lw: lw * 0.85 });
    toon(q, circle(w * 0.28, -h * 0.32, 1.9), '#ffcf5a', { sd: 0.4, hd: 0.4, lw: 0.9 });
  });
  // head: deep hood, face in shadow, ember eyes
  at(g, J.head, J.lean * 0.5 + (p.tilt || 0), q => {
    const r = ZE.headR;
    const hood = blob([[-r * 1.25, r * 1.05], [-r * 1.25, -r * 0.4], [-r * 0.65, -r * 1.2], [r * 0.25, -r * 1.35], [r * 1.0, -r * 0.85], [r * 1.25, -r * 0.1], [r * 1.05, r * 0.95], [r * 0.2, r * 1.15]], 0.6);
    toon(q, hood, MANTLE, { sd: 1.4, hd: 0.9, lw, light: '#4a3e50' });
    const face = blob([[r * 0.15, -r * 0.55], [r * 0.95, -r * 0.6], [r * 1.12, r * 0.2], [r * 0.85, r * 0.9], [r * 0.15, r * 0.75], [-r * 0.05, r * 0.1]], 0.7);
    flat(q, face, '#140e12', 0);
    if (heat > 0) { q.save(); q.globalCompositeOperation = 'lighter'; glow(q, r * 0.68, -r * 0.05, r * 0.9, MAG, 0.45 * Math.min(1, heat)); q.restore(); }
    flat(q, ellipse(r * 0.52, -r * 0.08, r * 0.15, r * 0.1), mix(MAG, HOT, 0.6), 0);
    flat(q, ellipse(r * 0.9, -r * 0.05, r * 0.12, r * 0.09), mix(MAG, HOT, 0.4), 0);
    line(q, [[r * 0.2, -r * 0.6], [r * 1.0, -r * 0.62]], TRIM, 0.9);
  });
  // near arm, chain and censer
  sleeve(NA, false);
  if (p.censer !== false) {
    const cz = p.cz || [NA.hd[0] + 1.5, NA.hd[1] + 9];
    const ch = [NA.hd, mixP(NA.hd, cz, 0.33), mixP(NA.hd, cz, 0.66), cz];
    line(g, ch, '#2a1e18', 1.3); line(g, ch, '#a08860', 0.5);
    censer(g, cz[0], cz[1] + 3, heat, t);
    for (let i = 0; i < 3; i++) puff(g, cz[0] - 2 - i * 3 - (p.smokeDx || 0) * i, cz[1] - 3 - i * 3.5, 2.6 + i * 1.3, 0.28, '#6a6066');
  }
  g.restore();
}
// censer pendulum: hand path -> lagging bob position
function censerPos(p, len, lagA) {
  const J = skel(ZE, p), NA = arm(ZE, J, 'na', p);
  return [NA.hd[0] + S(lagA) * len, NA.hd[1] + C(lagA) * len];
}
const ZealotPose = {
  walk(t) {
    const p = Pose.walk(t, { stride: 0.42, arm: 0.25, bobAmp: 1, lean: 0.04 });
    p.na = [0.55 + S(t * TAU) * 0.08, 0.9]; p.t = t; p.flick = t * TAU;
    p.cz = censerPos(p, 9, -0.35 + S(t * TAU - 0.9) * 0.35); p.hemSway = S(t * TAU) * 1.5; p.smokeDx = 1;
    return p;
  },
  idle(t) {
    const p = Pose.idle(t); p.na = [0.5, 0.95]; p.fa = [0.1, 1.2]; p.t = t; p.flick = t * TAU;
    p.cz = censerPos(p, 9, S(t * TAU) * 0.3); return p;
  },
  attack(t) {
    // whirl the censer overhead and bring it crashing down
    const w = ease(seg(t, 0, 0.42)), s = ease(seg(t, 0.42, 0.6)), r = ease(seg(t, 0.68, 1));
    const p = overhand(t, { a0: 0.5, up: 3.5, hit: 1.3 }); p.t = t; p.flick = t * TAU;
    const sw = lerp(lerp(0, -3.4, w), 1.6, s); const ang = lerp(sw, 0.2, r);
    p.cz = censerPos(p, 10, ang);
    return p;
  },
  special(t) {
    // both arms raised to the sky, the halo flares, shield light bursts outward
    const u = ease(seg(t, 0, 0.35)), r = ease(seg(t, 0.8, 1)), k = u * (1 - r);
    const p = basePose(); p.t = t; p.flick = t * TAU * 2;
    p.na = [lerp(0.5, 2.05, k), lerp(0.9, 0.35, k)]; p.fa = [lerp(0.1, 2.75, k), lerp(1.2, 0.2, k)];
    p.lean = -0.12 * k; p.tilt = -0.25 * k; p.bob = -1.2 * k;
    p.halo = 1 + k * 0.8; p.haloScale = 1 + k * 0.25;
    p.cz = censerPos(p, 9, -0.4 * k + S(t * TAU * 2) * 0.2 * k);
    return p;
  },
};
function zealotSpecialFx(g, t) {
  const k = seg(t, 0.3, 0.95); if (k <= 0) return;
  const a = bump(k);
  // golden-orange shield flare: expanding ring + inner dome glow
  glow(g, 0, -24, 26 + k * 10, GOLD, 0.35 * a);
  g.save(); g.globalAlpha = a;
  const ring = new Path2D(); ring.ellipse(0, -2, 14 + k * 22, 5 + k * 8, 0, 0, TAU);
  stroke(g, ring, alpha('#ff9a2a', 0.8), 3); stroke(g, ring, alpha('#fff0b0', 0.95), 1.2);
  const dome = new Path2D(); dome.ellipse(0, -22, 15 + k * 4, 26 + k * 4, 0, PI, TAU);
  stroke(g, dome, alpha('#ffc84a', 0.55), 2.2);
  g.restore();
  for (let i = 0; i < 6; i++) { const an = -PI / 2 + (i - 2.5) * 0.45, d = 14 + k * 18; flat(g, star(C(an) * d * 0.9, -24 + S(an) * d * 0.9, 2.2 * a + 0.5, 0.4, 4), alpha('#fff2b0', a), 0); }
}
function zealotDeath(g, t) {
  // sinks to the knees, then topples; the halo gutters out into smoke, the censer drops
  const k = ease(seg(t, 0, 0.4)), f = ease(seg(t, 0.35, 0.85));
  const p = basePose(); p.t = t;
  p.nl = [lerp(0.05, 1.3, k), lerp(0.05, 2.4, k)]; p.fl = [lerp(-0.05, 0.9, k), lerp(0.05, 2.3, k)];
  p.dy = k * 7.5 + f * 2; p.lean = lerp(0.04, 0.35, k); p.tilt = 0.3 * k;
  p.na = [lerp(0.5, 0.1, k), 0.4]; p.fa = [0.1, 0.4];
  p.rot = f * 1.2; p.pivot = [9, 0];
  p.halo = 1 - ease(seg(t, 0.15, 0.6)); p.heat = 1 - ease(seg(t, 0.2, 0.9)); p.censer = false;
  // dropped censer rolls on the ground in front
  const cx = lerp(4, 14, f), cy = lerp(-14, -3.4, Math.min(1, k * 1.4));
  censer(g, cx, cy, p.heat * 0.7, t);
  zealot(g, p);
  if (t > 0.15) for (let i = 0; i < 3; i++) puff(g, -6 + i * 3, -36 + t * 10 - i * 5, 4 + t * 6, 0.4 * bump(seg(t, 0.15, 1)), '#4a4048');
}

// ============================================================================
// CINDER KNIGHT — elite in molten-edged black plate, flaming greatsword, smouldering cape
// ============================================================================
const CK = { thigh: 9.4, shin: 9, torsoH: 15, torsoW: 12, headR: 6.1, upper: 8.4, fore: 7.8, armR: 2.9, legR: 3.1, shN: [1.6, 2.8], shF: [-2.8, 3.2], hipN: 2, hipF: -2,
  cloth: '#3a2a2a', plate: '#33293a', glove: '#241c28', lw: 1.5, footK: 1 };
const SWORD_L = 34;
// flaming greatsword along -y from the grip (0,0); heat = 0..1 (flames are drawn by swordFlames in world space)
function greatsword(g, heat) {
  const L = SWORD_L;
  toon(g, rrect(-1.3, -1, 2.6, 8.5, 1), '#2a1e1a', { sd: 0.4, hd: 0.3, lw: 1.1 });                   // grip
  toon(g, circle(0, 8.2, 1.9), '#8a6a3a', { sd: 0.4, hd: 0.4, lw: 1 });                              // pommel
  toon(g, poly([[-5.4, -1.8], [5.4, -1.8], [4.6, 0.4], [-4.6, 0.4]]), '#3a2e40', { sd: 0.5, hd: 0.4, lw: 1.1, light: OB_L });   // guard
  const blade = poly([[-2.4, -1.8], [2.4, -1.8], [2.1, -L + 4], [0, -L - 1.5], [-2.1, -L + 4]]);
  obs(g, blade, { base: '#2a2230', sd: 0.9, hd: 0.8, lw: 1.2, warm: 0, light: OB_L, detail: c => {
    vein(c, [[0, -2.5], [0, -L + 2]], 0.8, Math.max(0.25, heat));
    stroke(c, poly([[2.2, -2], [1.9, -L + 4], [0, -L - 1.5]], false), alpha('#ff9a3a', 0.85 * Math.max(0.3, heat)), 0.9);
  } });
}
// flames rising (world up) from the blade between grip G and direction angle a
function swordFlames(g, G, a, heat, fl, behind) {
  if (heat <= 0) return;
  const d = [C(a), S(a)];
  g.save(); g.globalAlpha *= Math.min(1, heat);
  if (!behind) glow(g, G[0] + d[0] * SWORD_L * 0.55, G[1] + d[1] * SWORD_L * 0.55, SWORD_L * 0.5, MAG, 0.3 * heat);
  for (let i = 0; i < 7; i++) {
    const u = 0.22 + i * 0.12, x = G[0] + d[0] * SWORD_L * u, y = G[1] + d[1] * SWORD_L * u;
    const h = (4.2 + 2 * S(fl + i * 1.9)) * (behind ? 1.15 : 0.8), sw = S(fl * 1.3 + i) * 1.2;
    const col = behind ? (i % 2 ? '#e8501a' : '#ff8a2a') : (i % 3 ? '#ff9a2a' : '#ffd04a');
    flat(g, blob([[x - 2.2, y + 0.6], [x - 1.6 + sw * 0.5, y - h * 0.55], [x + sw, y - h], [x + 1.8 + sw * 0.4, y - h * 0.45], [x + 2.2, y + 0.6]], 0.6), col, 0);
  }
  g.restore();
}
function knightHelm(q, ctx) {
  const r = CK.headR, heat = ctx.heat;
  // horns sweeping forward and up (behind the bowl first: far horn)
  toon(q, ribbon(arcPts(-r * 0.5, -r * 0.55, -PI * 0.86, r * 1.7, 1.7, 8), r * 0.62, 0.2), '#1e1820', { sd: 0.4, hd: 0.3, lw: 1.2 });
  // great helm: tall bowl, flat face plate, flared neck guard
  const helm = poly([[-r * 1.3, r * 1.0], [-r * 1.12, -r * 0.5], [-r * 0.7, -r * 1.12], [r * 0.2, -r * 1.22], [r * 0.95, -r * 0.92], [r * 1.18, -r * 0.2], [r * 1.18, r * 0.75], [r * 0.7, r * 1.15], [-r * 0.2, r * 1.0]]);
  obs(q, helm, { base: '#33293a', sd: 1.6, hd: 1.1, lw: 1.45, warm: 1.2, detail: c => {
    glint(c, [[-r * 0.75, -r * 0.62], [-r * 0.2, -r * 0.98]], 0.7, 0.9);
    vein(c, [[-r * 0.7, -r * 1.1], [-r * 1.12, -r * 0.5], [-r * 1.3, r * 0.98]], 0.6, heat * 0.9);     // molten rim
    vein(c, [[r * 0.25, -r * 1.2], [r * 0.15, r * 1.05]], 0.5, heat * 0.7);
  } });
  // visor cross
  flat(q, poly([[r * 0.32, -r * 0.42], [r * 1.2, -r * 0.36], [r * 1.18, -r * 0.12], [r * 0.32, -r * 0.18]]), '#140c12', 0.8);
  q.save(); q.globalCompositeOperation = 'lighter'; glow(q, r * 0.85, -r * 0.27, r * 1.2, MAG, 0.55 * heat); q.restore();
  flat(q, poly([[r * 0.5, -r * 0.34], [r * 1.12, -r * 0.29], [r * 1.11, -r * 0.2], [r * 0.5, -r * 0.24]]), mix(MAG, HOT, 0.6), 0);
  flat(q, poly([[r * 0.78, -r * 0.18], [r * 0.95, -r * 0.18], [r * 0.95, r * 0.7], [r * 0.78, r * 0.7]]), '#140c12', 0);
  // near horn
  toon(q, ribbon(arcPts(-r * 0.15, -r * 0.62, -PI * 0.86, r * 1.85, 1.75, 8), r * 0.7, 0.2), '#2c2430', { sd: 0.6, hd: 0.5, lw: 1.25, light: '#6a5a74', detail: c => vein(c, arcPts(-r * 0.15, -r * 0.62, -PI * 0.86, r * 1.4, 1.4, 5), 0.4, heat * 0.6) });
}
function knightCape(g, ctx) {
  const { J, p, heat } = ctx;
  const nk = J.T(-2.5, CK.torsoH - 1), sh = J.T(-6.5, CK.torsoH - 3.5);
  const sway = (p.capeSway || 0) + J.lean * 8;
  const hemY = -2.5 + (p.capeLift || 0);
  const tips = [[sh[0] - 7 - sway, hemY + 1], [sh[0] - 3 - sway * 0.8, hemY - 2.2], [sh[0] + 1 - sway * 0.6, hemY + 1.4], [sh[0] + 5 - sway * 0.4, hemY - 1.6], [J.hip[0] + 1, hemY - 4]];
  const cape = poly([nk, sh, [sh[0] - 4.5 - sway * 0.3, J.hip[1] - 4], ...tips, [J.hip[0] + 2, J.hip[1] + 2]]);
  toon(g, cape, '#3a1e1c', { sd: 2, hd: 0.8, lw: 1.4, light: '#5a2e26', detail: c => {
    line(c, [mixP(sh, tips[1], 0.2), tips[1]], alpha('#000', 0.3), 0.9); line(c, [mixP(sh, tips[3], 0.25), tips[3]], alpha('#000', 0.3), 0.9);
  } });
  // smouldering hem
  vein(g, tips, 1, heat);
  for (let i = 0; i < 3; i++) puff(g, tips[i][0] - 1, tips[i][1] - 3 - i, 3.5 + i * 0.8, 0.3, '#4a4048');
  embers(g, tips[2][0], tips[2][1] - 2, 3, 10, 14, p.t || 0, 7, 0.8);
}
function knightPauldron(g, ctx, A) {
  const s = A.s, heat = ctx.heat;
  const P = blob([[s[0] - 5.2, s[1] + 2.6], [s[0] - 4, s[1] - 3.4], [s[0] + 1, s[1] - 4.6], [s[0] + 5.2, s[1] - 1.6], [s[0] + 5, s[1] + 2.8], [s[0] + 0.5, s[1] + 4.4]], 0.5);
  toon(g, poly([[s[0] - 2.6, s[1] - 3.6], [s[0] - 1.2, s[1] - 8.6], [s[0] + 0.6, s[1] - 4]]), '#2a2230', { sd: 0.3, hd: 0.4, lw: 1.1, light: OB_L });
  toon(g, poly([[s[0] + 0.8, s[1] - 4.2], [s[0] + 3, s[1] - 8], [s[0] + 3.6, s[1] - 3]]), '#2a2230', { sd: 0.3, hd: 0.4, lw: 1.1, light: OB_L });
  obs(g, P, { base: CK.plate, sd: 1.2, hd: 0.9, lw: 1.4, warm: 1.2, detail: c => {
    vein(c, [[s[0] - 4.8, s[1] + 2.2], [s[0] + 0.5, s[1] + 3.8], [s[0] + 4.8, s[1] + 2.4]], 0.8, heat);
    glint(c, [[s[0] - 3, s[1] - 2.2], [s[0], s[1] - 3.4]], 0.6, 0.8);
  } });
}
function cinderknight(g, p) {
  return soldier(g, p, Object.assign({}, CK, {
    back: knightCape,
    torso: (q, ctx) => cuirass(q, ctx, { chest: 1.12, skirt: 6, detail: (c, w, h) => {
      vein(c, [[-w * 0.62, -h * 0.85], [-w * 0.3, -h * 1.05], [w * 0.35, -h * 1.04], [w * 0.68, -h * 0.82]], 0.8, ctx.heat);   // molten neckline
    } }),
    helm: knightHelm,
    pauldron: knightPauldron,
    weapon: (g2, ctx) => {
      const { p, NA, FA } = ctx;
      if (p.dropSword) return;
      let a = p.swordA ?? -2.3;                       // canvas angle of the blade direction
      if (p.twoHand) a = Math.atan2(NA.hd[1] - FA.hd[1], NA.hd[0] - FA.hd[0]) + (p.twoOff || 0);
      const hf = ctx.heat * (p.flame ?? 1), fl = (p.t || 0) * TAU * 2;
      if (p.trail) swordTrail(g2, NA.hd, a, p.trail);
      swordFlames(g2, NA.hd, a, hf, fl, true);
      at(g2, NA.hd, a + PI / 2, q => greatsword(q, hf));
      swordFlames(g2, NA.hd, a, hf * 0.9, fl + 1.3, false);
    },
  }));
}
function swordTrail(g, G, a, tr) {
  // flame crescent swept behind the blade (arc around the grip, trailing the current blade angle)
  const k = tr.k; if (k <= 0 || k >= 1) return;
  const span = tr.span * bump(k), R = SWORD_L * 0.95;
  g.save(); g.globalAlpha *= Math.min(1, bump(k) * 1.4);
  const arc = new Path2D(); arc.arc(G[0], G[1], R, a - span, a);
  stroke(g, arc, alpha('#ff5a10', 0.5), 8); stroke(g, arc, alpha('#ffb43a', 0.85), 4); stroke(g, arc, alpha(HOT, 0.95), 1.5);
  const arc2 = new Path2D(); arc2.arc(G[0], G[1], R * 0.72, a - span * 0.8, a);
  stroke(g, arc2, alpha('#ff8a2a', 0.45), 3);
  g.restore();
}
const CKS = (p, dx, dy) => { const J = skel(CK, p); return [J.na.s[0] + dx, J.na.s[1] + dy]; };
const KnightPose = {
  walk(t) {
    const p = Pose.walk(t, { stride: 0.5, arm: 0.4, bobAmp: 1.8, lean: 0.08 });
    p.hN = CKS(p, 5.2, 10.5 + S(t * TAU * 2) * 0.4); p.swordA = 0.62 + S(t * TAU * 2) * 0.04;
    p.capeSway = S(t * TAU * 2) * 1.2 + 1.5; p.t = t; return p;
  },
  idle(t) {
    const p = Pose.idle(t); p.lean = 0.05;
    p.hN = CKS(p, 5.4, 10.4 + S(t * TAU) * 0.3); p.swordA = 0.6 + S(t * TAU) * 0.02; p.capeSway = S(t * TAU) * 0.6; p.t = t; return p;
  },
  attack(t) {
    // two-handed overhead cleave with a flame arc
    const w = ease(seg(t, 0, 0.4)), s = ease(seg(t, 0.4, 0.56)), r = ease(seg(t, 0.68, 1));
    const p = basePose(); p.t = t;
    p.lean = lerp(0.05, -0.1, w) * (1 - s) + 0.32 * s * (1 - r) + 0.05 * r;
    p.nl = [0.05 + 0.45 * s * (1 - r), 0.15 + 0.3 * s * (1 - r)]; p.fl = [-0.05 - 0.3 * s * (1 - r), 0.1];
    p.bob = -w * (1 - s) * 1 + s * (1 - r) * 2; p.dx = s * (1 - r) * 3;
    const J = skel(CK, p), sh = J.na.s;
    const ready = [sh[0] + 5.4, sh[1] + 10.4], up = [sh[0] - 1, sh[1] - 9], low = [sh[0] + 11, sh[1] + 9];
    let G = mixP(ready, up, w); G = mixP(G, low, s); G = mixP(G, ready, r);
    // blade angle: low guard (0.6) -> raised back over the head (-2.9, via up) -> cleave forward-down (0.55) -> guard
    const aReady = 0.6, aUp = -2.9, aLow = 0.55;
    let a = lerp(aReady, aUp, w); a = lerp(a, aLow, s); a = lerp(a, aReady, r);
    p.hN = G; const dir = [C(a), S(a)];
    p.hF = [G[0] - dir[0] * 4, G[1] - dir[1] * 4]; p.swordA = a;
    if (s > 0.02 && r < 0.5) p.trail = { k: seg(t, 0.4, 0.8), span: 1.9 };
    p.flame = 1 + s * (1 - r) * 0.5;
    return p;
  },
};
function knightDeath(g, t) {
  // drops to one knee, then crashes forward; the blade's fire dies
  const k = ease(seg(t, 0, 0.35)), f = ease(seg(t, 0.35, 0.85));
  const p = basePose(); p.t = t;
  p.nl = [lerp(0.05, 1.45, k), lerp(0.05, 1.7, k)]; p.fl = [lerp(-0.05, 0.1, k), lerp(0.05, 2.5, k)];
  p.dy = k * 7.2; p.lean = lerp(0.05, 0.4, k) + f * 0.2; p.tilt = 0.25 * k;
  p.na = [lerp(0.4, 0.9, k), 0.3]; p.fa = [0.2, 0.4];
  p.rot = f * 1.25; p.pivot = [12, 0];
  p.heat = 1 - ease(seg(t, 0.25, 0.95)) * 0.85; p.dropSword = true; p.t = t;
  // sword falls flat in front
  const fk = ease(seg(t, 0.05, 0.5)), sa = lerp(0.6, -0.04, fk), G = [lerp(10, -6, fk), lerp(-22, -2.6, fk)], hf = 1 - ease(seg(t, 0.1, 0.7));
  swordFlames(g, G, sa, hf, t * 9, true);
  at(g, G, sa + PI / 2, q => greatsword(q, hf));
  swordFlames(g, G, sa, hf * 0.8, t * 9 + 1.3, false);
  cinderknight(g, p);
}

// ============================================================================
// JUGGERNAUT — hunched armoured siege-titan on massive forearms, a furnace in its back that spits imps
// ============================================================================
const IRON = '#3e3440', IRON_L = '#6a5a6e', IRON_D = '#241c26';
// generic foot cycle: phase -> {x offset, lift}
function footCycle(ph, stride, duty, lift) {
  ph = ((ph % 1) + 1) % 1;
  if (ph < duty) return { x: lerp(stride / 2, -stride / 2, ph / duty), y: 0, up: 0 };
  const u = (ph - duty) / (1 - duty);
  return { x: lerp(-stride / 2, stride / 2, ease(u)), y: -lift * S(u * PI), up: S(u * PI) };
}
function rivets(g, pts, r = 0.9) { for (const [x, y] of pts) { flat(g, circle(x, y, r), IRON_L, 0.6); } }
// a little imp silhouette launched from the furnace
function flungImp(g, x, y, a, s = 1) {
  g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
  glow(g, 0, 0, 9, MAG, 0.5);
  toon(g, blob([[-4, 3], [-5, -2], [-1, -5], [4, -4], [5, 1], [1, 4]], 0.7), '#43302c', { sd: 0.6, hd: 0.4, lw: 1.1, detail: c => vein(c, [[-2, -2], [0, 0], [-1, 2.5]], 0.5, 1.2) });
  toon(g, ribbon(arcPts(0, -4, -PI * 0.5, 4, -1, 4), 1.6, 0.2), '#3a2830', { sd: 0, hd: 0.3, lw: 0.9 });
  line(g, [[-4, 1], [-8, 4]], OUT, 1.6); line(g, [[4, 2], [7, 6]], OUT, 1.6); line(g, [[-2, 4], [-3, 8]], OUT, 1.6); line(g, [[2, 4], [4, 8]], OUT, 1.6);
  flat(g, ellipse(2, -1.5, 1.4, 0.8), HOT, 0);
  g.restore();
}
// body frame pivots at the hips so the beast can rear up (roll < 0) and slam forward (roll > 0)
const JH = [-30, -40];
function jugFrame(p) {
  const roll = p.roll || 0, bx = p.dx || 0, by = -(p.bob || 0);
  return (x, y) => { const dx = x - JH[0], dy = y - JH[1]; return [JH[0] + bx + dx * C(roll) - dy * S(roll), JH[1] + by + dx * S(roll) + dy * C(roll)]; };
}
function juggernaut(g, p) {
  const heat = p.heat ?? 1, t = p.t || 0, roll = p.roll || 0;
  const B = jugFrame(p);
  const shN = B(20, -72), shF = B(10, -78), hpN = B(-32, -40), hpF = B(-40, -44);
  const FT = p.feet || { nf: [50, 0], ff: [38, 0], nh: [-30, 0], fh: [-42, 0] };
  const SKIN = '#4a2622', SKIN_D = '#331a18';
  // massive arm: skin upper arm, pauldron, ram-gauntlet forearm, knuckle block
  const arm = (sh, fist, far) => {
    const r = ik(sh, [fist[0], fist[1] - 12], 25, 31, 1), el = r.j, wr = r.e;
    const col = far ? IRON_D : IRON, sk = far ? SKIN_D : SKIN;
    toon(g, capsule(sh[0], sh[1], el[0], el[1], 11, 9.5), sk, { sd: 2, hd: 1, lw: 1.9, light: far ? '#4a2622' : '#6a3428', detail: c => vein(c, [mixP(sh, el, 0.15), mixP(sh, el, 0.55), [mixP(sh, el, 0.85)[0] + 2, mixP(sh, el, 0.85)[1]]], 1, heat * (far ? 0.5 : 1)) });
    const d = [wr[0] - el[0], wr[1] - el[1]], L = Math.hypot(d[0], d[1]) || 1, u = [d[0] / L, d[1] / L], n = [-u[1], u[0]];
    const P = (a, w) => [el[0] + u[0] * a + n[0] * w, el[1] + u[1] * a + n[1] * w];
    const fa = poly([P(-6, 10), P(4, 13), P(L + 2, 15.5), P(L + 6, 13), P(L + 6, -13), P(L + 2, -15.5), P(4, -13), P(-6, -10)]);
    obs(g, fa, { base: col, sd: 2.6, hd: 1.4, lw: 2, warm: far ? 0.5 : 1.5, light: IRON_L, shade: IRON_D, detail: c => {
      for (const a of [0.3, 0.6]) { line(c, [P(L * a, 16), P(L * a, -16)], alpha('#000', 0.4), 1.3); vein(c, [P(L * a + 1.6, 14), P(L * a + 1.6, -14)], 0.7, heat * (far ? 0.4 : 0.9)); }
      glint(c, [P(2, -9), P(L - 4, -11)], 0.55, 1.3);
      rivets(c, [P(L * 0.15, 8), P(L * 0.15, -8), P(L * 0.85, 10), P(L * 0.85, -10)], 1.2);
    } });
    // knuckle block, carried in the forearm frame (local +y along the forearm)
    at(g, wr, -Math.atan2(u[0], u[1]), c0 => {
      obs(c0, poly([[-13, -2], [-14, 10], [-9, 15], [10, 15], [15, 9], [13, -2]]), { base: col, sd: 1.8, hd: 1.1, lw: 1.9, light: IRON_L, shade: IRON_D, warm: 0.5, detail: c => {
        for (const x of [-6, 0, 6]) line(c, [[x, 8], [x + 1, 15]], alpha('#000', 0.45), 1.2);
        glint(c, [[-11, 1], [-12, 9]], 0.5, 1.1);
      } });
    });
    if (!far) { // shoulder pauldron
      obs(g, blob([[sh[0] - 14, sh[1] + 4], [sh[0] - 12, sh[1] - 10], [sh[0] + 2, sh[1] - 15], [sh[0] + 15, sh[1] - 8], [sh[0] + 15, sh[1] + 6], [sh[0] + 2, sh[1] + 11]], 0.45), { base: IRON, sd: 2.2, hd: 1.3, lw: 1.9, light: IRON_L, shade: IRON_D, warm: 1.3, detail: c => {
        glint(c, [[sh[0] - 9, sh[1] - 8], [sh[0] + 3, sh[1] - 12]], 0.6, 1.2);
        vein(c, [[sh[0] - 13, sh[1] + 5], [sh[0] + 2, sh[1] + 10], [sh[0] + 14, sh[1] + 5]], 0.9, heat);
        rivets(c, [[sh[0] - 6, sh[1] - 7], [sh[0] + 6, sh[1] - 8]], 1.2);
      } });
    }
    return { el, wr };
  };
  const leg = (hp, ft, far) => {
    const r = ik(hp, [ft[0], ft[1] - 4], 18, 17, -1), kn = r.j, f = [ft[0], ft[1]];
    const col = far ? IRON_D : IRON, sk = far ? SKIN_D : SKIN;
    toon(g, capsule(hp[0], hp[1], kn[0], kn[1], 12, 9), sk, { sd: 2, hd: 1, lw: 1.9, light: far ? '#4a2622' : '#6a3428', detail: c => vein(c, [mixP(hp, kn, 0.25), mixP(hp, kn, 0.75)], 1, heat * (far ? 0.5 : 1)) });
    obs(g, poly([[kn[0] - 8, kn[1] - 4], [kn[0] + 8, kn[1] - 5], [f[0] + 7, f[1] - 7], [f[0] - 7, f[1] - 7]]), { base: col, sd: 1.6, hd: 1, lw: 1.8, light: IRON_L, shade: IRON_D, warm: far ? 0.3 : 1 });
    obs(g, poly([[f[0] - 10, f[1] - 8], [f[0] + 8, f[1] - 8.5], [f[0] + 15, f[1] - 1.5], [f[0] + 15, f[1]], [f[0] - 11, f[1]]]), { base: col, sd: 1, hd: 0.8, lw: 1.7, light: IRON_L, shade: IRON_D, warm: 0.4, detail: c => { for (const x of [4, 9, 13]) line(c, [[f[0] + x, f[1] - 4], [f[0] + x + 2, f[1]]], alpha('#000', 0.45), 1.1); } });
  };
  arm(shF, FT.ff, true);
  leg(hpF, FT.fh, true);
  // ---- body: a wedge, high armoured shoulders sloping down to the hips ----
  const bodyPts = [[-50, -38], [-46, -58], [-28, -76], [-6, -90], [14, -97], [32, -90], [44, -76], [47, -60], [38, -46], [16, -38], [-12, -32], [-40, -30]].map(q => B(q[0], q[1]));
  toon(g, blob(bodyPts, 0.65), SKIN, { sd: 3, hd: 1.4, lw: 2, light: '#6a3428', shade: SKIN_D, detail: c => {
    vein(c, [B(-40, -34), B(-20, -40), B(0, -36), B(20, -44), B(36, -50)], 1.2, heat);
    vein(c, [B(-6, -38), B(-2, -50), B(6, -56)], 0.9, heat * 0.9);
    vein(c, [B(18, -44), B(22, -56)], 0.8, heat * 0.8);
  } });
  // back plates
  const plate = (pts, rv, seam = true) => { const P = pts.map(q => B(q[0], q[1])); obs(g, poly(P), { base: IRON, sd: 2.4, hd: 1.4, lw: 2, light: IRON_L, shade: IRON_D, warm: 1.2, detail: c => { glint(c, [mixP(P[0], P[1], 0.2), mixP(P[0], P[1], 0.8)], 0.55, 1.2); if (rv) rivets(c, rv.map(q => B(q[0], q[1])), 1.2); } }); if (seam) vein(g, [P[P.length - 1], P[0]], 0.9, heat); };
  plate([[-53, -40], [-48, -62], [-32, -74], [-24, -58], [-34, -40]], [[-44, -56], [-36, -64]]);
  // ---- furnace (boiler set into the back) ----
  const vent = p.vent || 0;
  const stack = (x0, y0, h, w) => {
    const a = B(x0, y0), b = B(x0 - 3, y0 - h);
    obs(g, poly([[a[0] - w / 2, a[1]], [b[0] - w / 2, b[1]], [b[0] + w / 2, b[1]], [a[0] + w / 2, a[1]]]), { base: IRON_D, sd: 1, hd: 0.8, lw: 1.7, light: IRON_L, shade: '#140e16', warm: 0 });
    obs(g, rrect(b[0] - w / 2 - 1.8, b[1] - 3, w + 3.6, 4, 1.2), { base: '#7a4228', sd: 0.6, hd: 0.5, lw: 1.5, light: '#c87a4a', warm: 0 });
    const kk = 0.8 + vent * 1.4;
    for (let i = 0; i < 4; i++) { const ph = (t + i * 0.25) % 1; puff(g, b[0] - 3 - ph * 12, b[1] - 5 - ph * (16 + vent * 16), 4.5 + ph * 8 + vent * 4, 0.55 * (1 - ph) * Math.min(1, kk), '#3e363a'); }
    if (vent > 0.05) { glow(g, b[0], b[1] - 5, 12 + vent * 8, MAG, 0.6 * vent); fireball(g, b[0] - 1, b[1] - 7 - vent * 7, 3.5 + vent * 6, Math.min(1, vent * 1.5), 7 + x0); }
    else glow(g, b[0], b[1] - 3, 6, MAG, 0.3 * heat);
    embers(g, b[0] - 2, b[1] - 5, 3 + Math.round(vent * 4), 8, 18 + vent * 22, t, 13 + x0, 1);
  };
  stack(-22, -84, 16, 7.5); stack(-8, -90, 20, 8.5);
  const F = [B(-32, -66), B(-28, -86), B(-12, -96), B(6, -92), B(8, -76), B(-10, -64)];
  obs(g, blob(F, 0.35), { base: IRON, sd: 2.6, hd: 1.4, lw: 2.1, light: IRON_L, shade: IRON_D, warm: 0.6, detail: c => {
    // copper bands + rivets
    stroke(c, poly([B(-20, -68), B(-14, -94)], false), alpha('#9a5a32', 0.95), 3.2);
    stroke(c, poly([B(-4, -66), B(0, -94)], false), alpha('#9a5a32', 0.95), 3.2);
    rivets(c, [B(-20, -72), B(-18, -80), B(-16, -88), B(-3, -72), B(-2, -80), B(-1, -88)], 1);
    glint(c, [B(-27, -84), B(-14, -94)], 0.55, 1.2);
  } });
  // hatch (faces back): glowing grate; door swings open when venting
  const H0 = B(-31, -70), H1 = B(-28, -84), H2 = B(-21, -88), H3 = B(-23, -70);
  const mouth = poly([H0, H1, H2, H3]);
  const mc = mixP(H0, H2, 0.5);
  g.save(); g.clip(mouth);
  const gr = g.createRadialGradient(mc[0], mc[1], 0, mc[0], mc[1], 12);
  gr.addColorStop(0, mix(MAG_Y, HOT, Math.min(1, vent))); gr.addColorStop(0.6, '#ff7a1a'); gr.addColorStop(1, '#a8300c');
  g.fillStyle = gr; g.fillRect(mc[0] - 20, mc[1] - 20, 40, 40);
  g.restore();
  stroke(g, mouth, OUT, 1.8);
  if (vent < 0.3) { for (let i = 1; i < 4; i++) line(g, [mixP(H0, H3, i / 4), mixP(H1, H2, i / 4)], '#2a1e22', 1.7); }
  else {
    const o = ease(seg(vent, 0.3, 0.7));
    const D2 = mixP(H3, [H1[0] - 12, H1[1] - 2], o), D3 = mixP(H0, [H1[0] - 14, H1[1] + 10], o);
    obs(g, poly([H1, H2, D2, D3].map((q, i) => i < 2 ? q : q)), { base: IRON, sd: 1, hd: 0.7, lw: 1.7, light: IRON_L, shade: IRON_D, warm: 0 });
  }
  glow(g, mc[0] - 6, mc[1] - 4, 14 + vent * 10, MAG, (0.3 + vent * 0.5) * Math.min(1.2, heat + vent));
  // shoulder hump plate (over the furnace's front edge)
  plate([[4, -94], [16, -102], [32, -96], [44, -82], [48, -66], [36, -70], [22, -80], [8, -84]], [[24, -92], [38, -82]]);
  // ---- head: low between the shoulders, armoured, glowing grille-maw ----
  const hp = B(52 + (p.headDx || 0), -58 + (p.headDy || 0));
  at(g, hp, roll * 0.6 + (p.headA || 0), q => {
    q.scale(1.15, 1.15);
    toon(q, ribbon(arcPts(-6, -9, -PI * 0.75, 12, 1.5, 6), 5, 0.4), '#d8ccb0', { sd: 0.6, hd: 0.5, lw: 1.4 });
    obs(q, poly([[-11, -12], [4, -15], [15, -10], [18, -2], [16, 8], [4, 11], [-9, 9], [-13, -2]]), { base: IRON, sd: 1.8, hd: 1.1, lw: 1.9, light: IRON_L, shade: IRON_D, warm: 1, detail: c => glint(c, [[-7, -10], [6, -12.5]], 0.6, 1.1) });
    obs(q, poly([[-7, -9], [13, -11.5], [19, -5], [7, -4.5], [-7, -4]]), { base: IRON_D, sd: 0.6, hd: 0.6, lw: 1.5, light: IRON_L, warm: 0 });
    q.save(); q.globalCompositeOperation = 'lighter'; glow(q, 12, -3, 9, MAG, 0.6 * Math.min(1, heat)); q.restore();
    flat(q, poly([[8, -4.2], [15, -4.8], [14.5, -2.6], [8.5, -2.4]]), mix(MAG, HOT, 0.6 * Math.min(1, heat)), 0);
    const jaw = p.jaw || 0;
    flat(q, poly([[2, 1], [17, -0.5], [17, 5.5 + jaw * 5], [3, 6.5 + jaw * 4]]), mix('#ff7a1a', MAG_Y, Math.min(1, heat * 0.6 + jaw)), 1.3);
    for (const x of [6.5, 10, 13.5]) line(q, [[x, 0.3], [x, 6 + jaw * 4.5]], '#2a1e22', 1.5);
    toon(q, ribbon(arcPts(15, 7, PI * 0.1, 8, -1.6, 5), 3.4, 0.3), '#e8dcc4', { sd: 0.4, hd: 0.4, lw: 1.3 });
  });
  // ---- near limbs ----
  leg(hpN, FT.nh, false);
  arm(shN, FT.nf, false);
  if (p.impact > 0 && p.impact < 1) groundSlam(g, 58, 0, p.impact, 1);
  return { B };
}
// ground impact: flash, cracks of light and a dust ring (k = 0..1)
function groundSlam(g, x, y, k, s = 1) {
  const a = 1 - k;
  if (k < 0.35) { const f = 1 - k / 0.35; glow(g, x, y - 10 * s, 20 * s, MAG_Y, 0.7 * f); flat(g, ellipse(x, y - 1, 16 * s * (0.6 + k), 4 * s), alpha(HOT, 0.85 * f), 0); }
  for (let i = 0; i < 5; i++) { const dx = (i - 2) * 11 * s * (0.6 + k * 0.8); puff(g, x + dx, y - 5 * s - k * 8 * s - Math.abs(i - 2) * 2, (8 + k * 10) * s, 0.55 * a, '#5a4e4a'); }
  vein(g, [[x - 18 * s, y - 0.5], [x - 8 * s, y - 1.5], [x, y - 0.5], [x + 10 * s, y - 1.8], [x + 20 * s, y - 0.6]], 1.1 * s, a * 1.2);
}
const JugPose = {
  walk(t) {
    const st = 18, d = 0.66;
    const f = (ph, x0) => { const c = footCycle(ph, st, d, 7); return [x0 + c.x, c.y]; };
    const nh = f(t, -30), nf = f(t + 0.25, 50), fh = f(t + 0.5, -42), ff = f(t + 0.75, 38);
    return { t, feet: { nh, nf, fh, ff }, bob: 1.8 * C(TAU * 2 * (t - 0.2)), roll: S(t * TAU) * 0.02, heat: 0.95 + 0.05 * S(t * TAU * 2), headA: S(t * TAU * 2) * 0.04 };
  },
  idle(t) {
    const b = S(t * TAU);
    return { t, bob: b * 1.2, roll: b * 0.012, heat: 0.9 + 0.1 * b, headA: b * 0.03, feet: { nf: [50, 0], ff: [38, 0], nh: [-30, 0], fh: [-42, 0] } };
  },
  attack(t) {
    // rears up on the hind legs, fists hoisted overhead, then hammers the ground in front (splash)
    const w = ease(seg(t, 0, 0.45)), s = ease(seg(t, 0.45, 0.57)), r = ease(seg(t, 0.7, 1));
    const up = w * (1 - s), hit = s * (1 - r);
    const roll = -0.42 * up + 0.07 * hit;
    const fist = (x0, hx) => { let q = mixP([x0, 0], [hx, -128], up); q = mixP(q, [x0 + 10, 0], hit); return q; };
    return { t, roll, bob: -hit * 3, feet: { nf: fist(50, 14), ff: fist(38, 0), nh: [-30, 0], fh: [-42, 0] }, headA: -0.2 * up + 0.12 * hit, jaw: up + hit * 0.6, heat: 1 + hit * 0.5, impact: seg(t, 0.55, 0.95) };
  },
  special(t) {
    // braces, the furnace hatch bursts open: fire, smoke, imps flung out
    const b = ease(seg(t, 0, 0.25)), v = bump(seg(t, 0.12, 1)) * 1.1, r = ease(seg(t, 0.8, 1));
    return { t, roll: 0.06 * b * (1 - r), bob: -2.5 * b * (1 - r), vent: Math.min(1, v), headA: -0.25 * b * (1 - r), jaw: b * (1 - r), heat: 1 + v * 0.3, feet: { nf: [52, 0], ff: [40, 0], nh: [-32, 0], fh: [-44, 0] } };
  },
};
function jugSpecialFx(g, t) {
  // imps launched in arcs out of the furnace hatch (backwards: they land behind the beast)
  for (let i = 0; i < 2; i++) {
    const k = seg(t, 0.3 + i * 0.16, 0.85 + i * 0.12); if (k <= 0 || k >= 1) continue;
    const x = -30 - k * (22 + i * 12), y = -84 - S(k * PI) * (28 - i * 6) + k * 34;
    flungImp(g, x, y, -k * 4 - i, 1.15);
  }
  const k = seg(t, 0.18, 0.7);
  if (k > 0 && k < 1) fireball(g, -32, -84 - k * 12, 6 + k * 10, 1 - k, 11);
}
function jugDeath(g, t) {
  // staggers, collapses forward onto its chest; the furnace bursts, then gutters out in smoke
  const k = ease(seg(t, 0, 0.55)), e = seg(t, 0.35, 0.75), f = seg(t, 0.55, 1);
  const p = { t, roll: 0.22 * k, bob: -k * 10, feet: { nf: [lerp(50, 62, k), 0], ff: [lerp(38, 50, k), 0], nh: [lerp(-30, -34, k), 0], fh: [lerp(-42, -48, k), 0] },
    headA: 0.35 * k, headDy: k * 4, jaw: 0.6 * k, vent: Math.min(1, bump(e) * 1.2), heat: 1 - ease(seg(t, 0.5, 1)) * 0.92 };
  g.save(); g.translate(S(t * 60) * 1.2 * (1 - k), 0);
  juggernaut(g, p);
  g.restore();
  if (e > 0 && e < 1) fireball(g, -24, -80 + k * 10, 10 + e * 14, 1 - e, 19);
  for (let i = 0; i < 4; i++) puff(g, -36 + i * 10, -74 + k * 10 - f * 22 - i * 3, 10 + f * 12, 0.5 * bump(seg(t, 0.35, 1)), '#3a3236');
}

// ============================================================================
// SHADE — living shadow: smoky, semi-transparent silhouette with ember eyes and long claws
// ============================================================================
const SH_C = '#241a2c', SH_D = '#140e1a', SH_RIM = '#8a4ac8';
// perturb a closed point loop along its normals with looping noise (t in [0,1))
function wobble(pts, amp, t, seed = 1) {
  const n = pts.length, R = rng(seed), ph = pts.map(() => R() * TAU), fr = pts.map(() => 1 + Math.floor(R() * 2));
  return pts.map((q, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const k = amp * S(t * TAU * fr[i] + ph[i]);
    return [q[0] - dy / d * k, q[1] + dx / d * k];
  });
}
function shadeClaws(g, A, far, k = 1) {
  const a = A.fa;
  for (let i = -1; i <= 2; i++) {
    const ca = a + i * 0.24 - 0.12, h = A.hd;
    const mid = add(h, V(ca + 0.15, 5.5 * k)), tip = add(h, V(ca - 0.2, 11 * k));
    toon(g, ribbon([h, mid, tip], 1.8, 0.1), far ? '#5a4a66' : '#9a88ac', { sd: 0, hd: 0.5, lw: 0.9, light: '#e0d0f0', outline: SH_D });
  }
}
// smoky tendril (open centreline -> tapered translucent ribbon)
function tendril(g, pts, w0, a, col = SH_C) {
  g.save(); g.globalAlpha *= a;
  toon(g, ribbon(spline(pts, 4), w0, 0.4, true), col, { sd: 0.8, hd: 0.5, lw: 1.2, light: '#3a2c48', shade: SH_D, outline: SH_D });
  g.restore();
}
function drawShade(g, p) {
  const t = p.t || 0, heat = p.heat ?? 1, al = (p.alpha ?? 1) * 0.92;
  const J = skel({ thigh: 8, shin: 7, torsoH: 12.5, headR: 5.2, upper: 10, fore: 10.5, shN: [1.5, 2.2], shF: [-1.6, 2.8] }, p);
  const NA = J.na, FA = J.fa, hip = J.hip, sw = p.sway || 0, tr = p.trail || 0;
  g.save(); g.globalAlpha *= al;
  if (p.rot) g.rotate(p.rot);
  // ground haze + trailing smoke
  for (let i = 5; i >= 0; i--) { const ph = (t + i / 6) % 1; puff(g, hip[0] - 6 - ph * 20 - tr * ph * 8, -3 - S(ph * PI) * 3, 6 + ph * 6, 0.5 * (1 - ph * 0.8), SH_C); }
  // smoke tendrils instead of legs (streaming back)
  const tw = t * TAU;
  tendril(g, [J.T(-2, 1), [hip[0] - 7 + sw, -7 + S(tw) * 1.5], [hip[0] - 15 + sw, -3 + S(tw + 1) * 2], [hip[0] - 24 + sw * 1.3, -5 + S(tw + 2) * 2.5]], 6, 0.6);
  // far arm
  g.save(); g.globalAlpha *= 0.75;
  toon(g, ribbon([FA.s, mixP(FA.s, FA.el, 0.5), FA.el], 3.6, 2.6), SH_D, { sd: 0, hd: 0.6, lw: 1.2, light: '#3a2a46', outline: SH_D });
  toon(g, ribbon([FA.el, mixP(FA.el, FA.hd, 0.5), FA.hd], 2.8, 2), SH_D, { sd: 0, hd: 0.6, lw: 1.2, light: '#3a2a46', outline: SH_D });
  shadeClaws(g, FA, true, p.clawK || 1);
  g.restore();
  tendril(g, [J.T(1, 1.5), [hip[0] - 2 + sw * 0.5, -6 + S(tw + 2.5) * 1.2], [hip[0] - 9 + sw, -1.5 + S(tw + 3.5) * 1.5], [hip[0] - 17 + sw, -1 + S(tw + 4.5) * 1.5]], 5, 0.8);
  // hunched torso: ribbed shadow, tapering into the smoke at the waist
  const pts = [J.T(-5, 12), J.T(-6.5, 6.5), J.T(-4.5, 1.5), J.T(-1, -2), J.T(3.5, -1), J.T(5, 4), J.T(6.5, 9), J.T(4, 13.5), J.T(-1, 14.5)];
  const body = blob(wobble(pts, 0.6, t, 4), 0.7);
  toon(g, body, SH_C, { sd: 1.6, hd: 1.0, lw: 1.4, light: '#433252', shade: SH_D, outline: SH_D, detail: c => {
    crescent(c, body, 1.2, -1.8, alpha('#ff6a1a', 0.25 * heat));
    for (let i = 0; i < 3; i++) stroke(c, poly([J.T(-3.5, 10 - i * 3), J.T(0.5, 9 - i * 3.2), J.T(4.5, 9.8 - i * 3)], false), alpha('#5a4470', 0.7), 0.9);
  } });
  // head: low, long, smoke streaming back like flames; ember eyes
  at(g, J.head, J.lean * 0.4 + (p.tilt || 0), q => {
    const r = 5.2;
    for (let i = 0; i < 3; i++) {
      const y0 = -r * (0.9 - i * 0.45), ph = tw + i * 1.3;
      tendril(q, [[-r * 0.2, y0], [-r * 1.4, y0 - r * 0.5 + S(ph) * 1], [-r * 2.6, y0 - r * 0.3 + S(ph + 1) * 1.5], [-r * 3.6, y0 + S(ph + 2) * 2]], 4.4 - i * 0.6, 0.85 - i * 0.15);
    }
    const hd = blob(wobble([[-r * 0.9, r * 0.7], [-r * 1.1, -r * 0.3], [-r * 0.4, -r * 1.0], [r * 0.7, -r * 0.75], [r * 1.6, -r * 0.1], [r * 1.35, r * 0.35], [r * 0.6, r * 0.85]], 0.4, t, 9), 0.6);
    toon(q, hd, SH_C, { sd: 1.2, hd: 0.8, lw: 1.4, light: '#433252', shade: SH_D, outline: SH_D });
    if (heat > 0) {
      q.save(); q.globalCompositeOperation = 'lighter'; glow(q, r * 0.75, -r * 0.18, r * 0.95, '#ff5a1a', 0.45 * heat); q.restore();
      flat(q, poly([[r * 0.25, -r * 0.42], [r * 0.82, -r * 0.16], [r * 0.24, -r * 0.08]]), alpha(mix(MAG, HOT, 0.55), heat), 0);
      flat(q, poly([[r * 0.98, -r * 0.3], [r * 1.32, -r * 0.08], [r * 0.95, -r * 0.02]]), alpha(mix(MAG, HOT, 0.4), heat), 0);
      // a thin jagged maw
      flat(q, poly([[r * 0.5, r * 0.3], [r * 1.3, r * 0.2], [r * 1.12, r * 0.38], [r * 0.98, r * 0.3], [r * 0.84, r * 0.44], [r * 0.7, r * 0.32], [r * 0.56, r * 0.42]]), alpha('#c8401a', 0.85 * heat), 0);
    }
  });
  // near arm + long claws
  toon(g, ribbon([NA.s, mixP(NA.s, NA.el, 0.5), NA.el], 4.2, 3), SH_C, { sd: 0.8, hd: 0.7, lw: 1.3, light: '#433252', shade: SH_D, outline: SH_D });
  toon(g, ribbon([NA.el, mixP(NA.el, NA.hd, 0.5), NA.hd], 3.2, 2.2), SH_C, { sd: 0.6, hd: 0.7, lw: 1.3, light: '#433252', shade: SH_D, outline: SH_D });
  shadeClaws(g, NA, false, p.clawK || 1);
  g.restore();
}
const ShadePose = {
  walk(t) {
    const p = basePose(); const b = S(t * TAU);
    p.bob = 4 + b * 1.2; p.lean = 0.62 + S(t * TAU * 2) * 0.03; p.tilt = -0.55;
    p.na = [0.55 + b * 0.2, 0.75]; p.fa = [0.25 - b * 0.2, 0.8];
    p.t = t; p.sway = b * 1.5; p.trail = 1; return p;
  },
  idle(t) {
    const p = basePose(); const b = S(t * TAU);
    p.bob = 4.5 + b * 1.4; p.lean = 0.55; p.tilt = -0.5 + b * 0.05;
    p.na = [0.45 + b * 0.08, 0.7]; p.fa = [0.15 - b * 0.08, 0.75]; p.t = t; p.sway = b; return p;
  },
  attack(t) {
    const w = ease(seg(t, 0, 0.4)), s = ease(seg(t, 0.4, 0.55)), r = ease(seg(t, 0.65, 1));
    const p = basePose(); p.t = t;
    let up = lerp(0.5, 3.75, w); up = lerp(up, 1.35, s); up = lerp(up, 0.5, r);
    p.na = [up, lerp(0.7, 0.15, s)]; p.fa = [lerp(0.2, 0.9, w) * (1 - r) + 0.2 * r, 0.7];
    p.lean = lerp(0.55, 0.25, w) * (1 - s) + 0.8 * s * (1 - r) + 0.55 * r * (1 - (1 - s)); p.tilt = -0.5;
    p.bob = 4.5 + w * (1 - s) * 2; p.dx = s * (1 - r) * 6; p.clawK = 1 + s * (1 - r) * 0.3;
    return p;
  },
};
function shadeSlash(g, t) {
  // claw streaks swept around the shoulder by the striking arm
  const k = seg(t, 0.4, 0.72); if (k <= 0 || k >= 1) return;
  const p = ShadePose.attack(t), J = skel({ thigh: 8, shin: 7, torsoH: 12.5, headR: 5.2, upper: 10, fore: 10.5, shN: [1.5, 2.2], shF: [-1.6, 2.8] }, p);
  const s0 = J.na.s, a = bump(k), cur = -J.na.fa + PI / 2;        // canvas angle of the forearm
  g.save(); g.globalAlpha *= a;
  for (let i = 0; i < 3; i++) {
    const R = 26 + i * 2.5, arc = new Path2D(); arc.arc(s0[0], s0[1], R, cur - 1.5 * Math.min(1, k * 1.8), cur - 0.05);
    stroke(g, arc, alpha('#8a4ac8', 0.45), 3.4); stroke(g, arc, alpha('#ffc8a0', 0.9), 1.1);
  }
  g.restore();
}
function shadeSpecial(g, t) {
  // dissolve into scattering smoke, flicker, then reform
  const d = bump(seg(t, 0, 1)), R = rng(91);
  const fl = (Math.floor(t * 7) % 2 ? 0.55 : 1);
  const p = ShadePose.idle(t); p.alpha = (1 - d * 0.85) * (d > 0.2 ? fl : 1);
  for (let i = 0; i < 9; i++) {
    const a = R() * TAU, r0 = 4 + R() * 8, x = C(a) * (r0 + d * 18), y = -22 + S(a) * (r0 * 1.2 + d * 14);
    puff(g, x, y, 5 + d * 5, 0.55 * d, SH_C);
  }
  drawShade(g, p);
  if (d > 0.3) { const q = S(t * 40) > 0 ? 1 : 0.4; flat(g, poly([[5, -38], [8.4, -36.5], [5, -36]]), alpha(HOT, q), 0); flat(g, poly([[9.2, -37.6], [11.6, -36.4], [9, -36]]), alpha(HOT, q * 0.8), 0); }
}
function shadeDeath(g, t) {
  // unravels upward into smoke; the ember eyes linger, then wink out
  const k = ease(seg(t, 0, 0.8));
  const p = ShadePose.idle(0.25); p.alpha = 1 - k; p.bob = 3 + k * 6; p.lean = 0.36 - k * 0.5; p.na = [0.6 + k * 1.5, 0.4]; p.fa = [0.3 + k * 1.2, 0.4]; p.heat = 1;
  for (let i = 0; i < 7; i++) puff(g, -10 + i * 3.4, -12 - k * 22 - (i % 3) * 4, 6 + k * 8, 0.6 * bump(seg(t, 0, 1)), SH_C);
  drawShade(g, p);
  const e = 1 - seg(t, 0.75, 1);
  if (e > 0) { const y = -36 - k * 8; glow(g, 8, y, 7, MAG, 0.5 * e); flat(g, circle(6, y, 1), alpha(HOT, e), 0); flat(g, circle(10, y + 0.4, 0.8), alpha(HOT, e * 0.8), 0); }
  embers(g, 0, -16 - k * 10, 6, 18, 20, t, 41, 0.8, '#ff7a3a');
}

// ============================================================================
// THE CINDER HEART — a fallen star that grew a titan's body of magma and obsidian around itself.
// Phase 1: armoured, the core glimpsed through obsidian ribs. Phase 2: plates cracking, fire pouring out.
// Phase 3: plates gone, the white-hot core blazing in a halo, the body burning away into light.
// ============================================================================
const HZ = { thigh: 38, shin: 36, torsoH: 70, upper: 42, fore: 40 };
const HOB = '#2c2434', HOB_L = '#665678', HOB_G = '#b8a8d4';          // obsidian armour
const HFL = '#33201f', HFL_L = '#55302a', HFL_D = '#1e1214';          // magma-rock flesh (cooled crust)
// per-phase look: vein heat, core brightness/size, plate state, fire, light (burning away)
const HPH = {
  1: { vein: 1, core: 0.9, coreR: 11, plates: 1, fire: 0, light: 0, slit: 3.2 },
  2: { vein: 1.4, core: 1.1, coreR: 13, plates: 2, fire: 1, light: 0, slit: 7 },
  3: { vein: 1.8, core: 1.35, coreR: 15.5, plates: 0, fire: 0.5, light: 1, slit: 0 },
};
function heartFrame(p) {
  const hip = [p.dx || 0, -(HZ.thigh + HZ.shin) * 0.93 - (p.bob || 0)];
  const lean = p.lean ?? 0.1;
  const U = [S(lean), -C(lean)], F = [C(lean), S(lean)];
  const T = (fx, uy) => [hip[0] + F[0] * fx + U[0] * uy, hip[1] + F[1] * fx + U[1] * uy];
  return { hip, lean, T };
}
// flame tongue rising (world up) from a base point
function flameTongue(g, x, y, h, w, ph, a = 1) {
  if (a <= 0) return;
  const sw = S(ph) * w * 0.5;
  g.save(); g.globalAlpha *= Math.min(1, a);
  flat(g, blob([[x - w, y + 1], [x - w * 0.6 + sw * 0.3, y - h * 0.45], [x + sw, y - h], [x + w * 0.7 + sw * 0.4, y - h * 0.4], [x + w, y + 1]], 0.6), '#ff6a1a', 0);
  flat(g, blob([[x - w * 0.55, y + 0.5], [x - w * 0.3 + sw * 0.3, y - h * 0.35], [x + sw * 0.8, y - h * 0.7], [x + w * 0.45 + sw * 0.3, y - h * 0.3], [x + w * 0.55, y + 0.5]], 0.6), '#ffc04a', 0);
  g.restore();
}
// rising motes of light (phase 3: the body burning away)
function lightMotes(g, x, y, n, spread, rise, t, seed, a = 1) {
  const R = rng(seed);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const ph = (R() + t) % 1, ox = (R() - 0.5) * spread, sz = 0.8 + R() * 1.4;
    const ex = x + ox + S(ph * 4 + i) * 2, ey = y - ph * rise, k = S(ph * PI) * a;
    g.fillStyle = alpha('#ffb84a', 0.3 * k); g.beginPath(); g.ellipse(ex, ey, sz * 1.3, sz * 2.4, 0, 0, TAU); g.fill();
    g.fillStyle = alpha('#fffbe8', 0.95 * k); g.beginPath(); g.ellipse(ex, ey, sz * 0.45, sz * 1.7, 0, 0, TAU); g.fill();
  }
  g.restore();
}
// the star-core. k = brightness; exposed = phase-3 look (corona + four-point flare); haloK = halo ring
function starCore(g, x, y, r, k, t, exposed, haloK = 0) {
  if (exposed) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + t * 0.6, L = r * (1.9 + 0.6 * S(t * TAU * 2 + i * 1.7)) * (0.8 + 0.25 * k), w = r * 0.2;
      const gr = g.createLinearGradient(x, y, x + C(a) * L, y + S(a) * L);
      gr.addColorStop(0, alpha('#fff6d0', 0.5)); gr.addColorStop(1, alpha('#ffd070', 0));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x + C(a + 1.2) * w, y + S(a + 1.2) * w); g.lineTo(x + C(a) * L, y + S(a) * L); g.lineTo(x + C(a - 1.2) * w, y + S(a - 1.2) * w); g.closePath(); g.fill();
    }
    g.restore();
    glow(g, x, y, r * 3.4, '#cfe8ff', 0.32 * k);
  }
  glow(g, x, y, r * (exposed ? 2.5 : 2.1), GOLD, (exposed ? 0.7 : 0.55) * k);
  const gr = g.createRadialGradient(x - r * 0.2, y - r * 0.25, 0, x, y, r);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, CORE); gr.addColorStop(0.75, '#ffd36a'); gr.addColorStop(1, '#ff9a3a');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  if (exposed) {
    flat(g, star(x, y, r * 1.45, 0.2, 4, -PI / 2 + 0.15 * S(t * TAU)), alpha('#ffffff', 0.9), 0);
    if (haloK > 0) {
      g.save(); g.globalAlpha *= Math.min(1, haloK);
      const ring = new Path2D(); ring.ellipse(x, y, r * 1.95, r * 1.95, 0, 0, TAU);
      stroke(g, ring, alpha('#cfe8ff', 0.5), 4.5); stroke(g, ring, alpha(GOLD, 0.95), 2.1); stroke(g, ring, alpha('#fffbe8', 0.9), 0.8);
      g.restore();
    }
  }
}
function heartParts(p) {
  // 3/4 front view: a tall, gaunt titan; the chest (a ribcage of obsidian around the star) faces the viewer
  const PH = HPH[p.phase || 1], t = p.t || 0, heat = p.heat ?? 1;
  const vk = PH.vein * heat, LT = PH.light * (p.lightK ?? 1), FI = PH.fire * (p.fireK ?? 1), parts = [];
  const { hip, lean, T } = heartFrame(p);
  const flesh = mix(HFL, '#7a3418', LT * 0.5), fleshL = mix(HFL_L, '#d8682a', LT * 0.55);
  const armour = (g, pts, o = {}) => { const P = o.blob ? blob(pts, o.blob) : poly(pts); obs(g, P, { base: o.base || HOB, sd: o.sd ?? 2.4, hd: o.hd ?? 1.4, lw: o.lw ?? 2.2, light: HOB_L, shade: '#18121c', warm: o.warm ?? 1.6, warmA: 0.32 + LT * 0.3, detail: o.detail }); return P; };
  const fleshFill = (g, path, o = {}) => toon(g, path, flesh, { sd: o.sd ?? 2.4, hd: o.hd ?? 1.2, lw: o.lw ?? 2.2, light: fleshL, shade: HFL_D, detail: c => { if (LT > 0) crescent(c, path, -1.2, 2.2, alpha('#ffd890', 0.4 * LT)); if (o.detail) o.detail(c); } });
  const farShade = (g, path, k = 0.22) => flat(g, path, alpha('#0a0610', k), 0);
  const shN = T(36, 60), shF = T(-34, 62);
  // ---------------- mantle of ash flowing from the shoulders (behind everything) ----------------
  parts.push({ z: -1, id: 'cl', x: 0, y: 0, a: 0, c: [-30, -70], draw: g => {
    const sw = p.cape || 0, burn = FI, k = 1 - LT * 0.35;
    const top = [shF[0] - 4, shF[1] + 4], top2 = [shN[0] - 6, shN[1] - 2];
    const hem = []; const n = 7;
    for (let i = 0; i <= n; i++) { const u = i / n; hem.push([lerp(-62, 22, u) - sw * (1 - u) * 1.2 + S(t * TAU + u * 5) * 2.5, -2 - (i % 2 ? 9 : 0) - u * 10 + S(t * TAU * 2 + u * 7) * 1.5]); }
    const pts = [top2, top, [shF[0] - 26 - sw, shF[1] + 40], ...hem, [hip[0] + 24, hip[1] - 4]];
    const P = blob(pts, 0.35);
    g.save(); g.globalAlpha *= k;
    toon(g, P, '#2e272c', { sd: 2.6, hd: 1, lw: 2.1, light: '#4a4046', shade: '#1a1418', detail: c => {
      for (let i = 1; i < n; i += 2) line(c, [mixP(top, hem[i], 0.25), hem[i]], alpha('#000', 0.28), 1.4);
      vein(c, hem, 1.6, (0.8 + burn * 0.6) * heat);
    } });
    g.restore();
    for (let i = 0; i <= n; i += 2) { if (burn > 0) flameTongue(g, hem[i][0], hem[i][1] + 1, 9 + 3 * S(t * TAU * 2 + i), 3.2, t * TAU * 2 + i, burn * 0.9); puff(g, hem[i][0] - 2, hem[i][1] - 5, 5, 0.25, '#4a4246'); }
    if (LT > 0) lightMotes(g, -28, -40, 8, 60, 60, t, 12, LT);
  } });
  // ---------------- legs (IK, grounded feet) ----------------
  const legP = (hp, f, far, z0, id) => {
    const r = ik(hp, [f.x, f.y], HZ.thigh, HZ.shin, -1), kn = r.j, ft = r.e;
    const ta = Math.atan2(kn[0] - hp[0], kn[1] - hp[1]), sa = Math.atan2(ft[0] - kn[0], ft[1] - kn[1]);
    parts.push({ z: z0, id: id + 't', x: hp[0], y: hp[1], a: -ta, c: [0, 16], draw: g => {
      const P = capsule(0, 0, 0, HZ.thigh, 12.5, 10);
      fleshFill(g, P, { detail: c => { vein(c, [[-5, 4], [-2, 14], [-4, 24], [1, 33]], 1.4, vk * (far ? 0.55 : 1)); } });
      if (far) farShade(g, P);
    } });
    parts.push({ z: z0 + 0.3, id: id + 's', x: kn[0], y: kn[1], a: -sa, c: [0, 15], draw: g => {
      const P = armour(g, [[-11, -3], [11, -5], [12, 10], [9, HZ.shin - 3], [-9, HZ.shin - 2], [-12, 10]], { warm: far ? 0.6 : 1.6, detail: c => { glint(c, [[-7, 0], [-8, 22]], 0.55, 1.4); vein(c, [[-11, 12], [0, 14], [12, 11]], 1, vk * 0.8); } });
      armour(g, [[-11, -8], [1, -15], [12, -8], [10, 0], [-10, 1]], { sd: 1.4, warm: 0.8, detail: c => glint(c, [[-8, -6], [0, -12]], 0.6, 1.1) });
      if (far) farShade(g, P);
    } });
    parts.push({ z: z0 + 0.5, id: id + 'f', x: ft[0], y: ft[1], a: (f.up || 0) * 0.18, c: [3, -6], draw: g => {
      const P = armour(g, [[-13, -13], [6, -14], [21, -5], [22, 0.5], [-15, 0.5]], { sd: 1.4, hd: 1, warm: 0.6, detail: c => { for (const x of [7, 12, 17]) line(c, [[x, -6], [x + 2, 0.5]], alpha('#000', 0.45), 1.3); } });
      if (far) farShade(g, P);
    } });
  };
  const NF = p.nf || { x: 15, y: 0 }, FF = p.ff || { x: -15, y: 0 };
  legP(T(-12, 0), FF, true, 2, 'f'); legP(T(12, 0), NF, false, 3, 'n');
  // ---------------- arms (FK): long and gaunt, great clawed hands ----------------
  const armP = (s, a, far, z0, id) => {
    const el = add(s, V(a[0], HZ.upper)), fa = a[0] + a[1], hd = add(el, V(fa, HZ.fore));
    parts.push({ z: z0, id: id + 'u', x: s[0], y: s[1], a: -a[0], c: [0, 18], draw: g => {
      const P = capsule(0, 0, 0, HZ.upper, 11, 9);
      fleshFill(g, P, { detail: c => { vein(c, [[-4, 5], [0, 17], [-3, 28], [1, 38]], 1.4, vk * (far ? 0.55 : 1)); } });
      if (far) farShade(g, P);
    } });
    parts.push({ z: z0 + 0.3, id: id + 'f', x: el[0], y: el[1], a: -fa, c: [0, 18], draw: g => {
      const F0 = capsule(0, 0, 0, HZ.fore, 9, 8);
      fleshFill(g, F0);
      const P = armour(g, [[-11, 5], [10, 3], [12, HZ.fore - 4], [-10, HZ.fore - 3]], { warm: far ? 0.5 : 1.4, detail: c => { glint(c, [[-7, 8], [-7, HZ.fore - 8]], 0.55, 1.3); vein(c, [[-10, 20], [0, 18], [11, 21]], 1, vk * 0.8); } });
      if (far) { farShade(g, F0); farShade(g, P); }
    } });
    parts.push({ z: z0 + 0.6, id: id + 'x', x: hd[0], y: hd[1], a: -fa, c: [0, 12], draw: g => {
      const curl = p.fist ?? 0.4;
      // palm + long clawed fingers of rock, molten knuckles
      const P = blob([[-11, -2], [10, -3], [12, 8], [8, 13], [-8, 14], [-12, 7]], 0.5);
      for (let i = 0; i < 4; i++) {
        const x0 = -7.5 + i * 5, a0 = (i - 1.5) * 0.12, L = 13 - Math.abs(i - 1.5) * 1.5;
        const k0 = [x0, 11], k1 = [x0 + S(a0) * L * 0.55, 11 + C(a0) * L * 0.55 * (1 - curl * 0.4)], k2 = [k1[0] + S(a0 - curl * 1.4) * L * 0.5, k1[1] + C(a0 - curl * 1.4) * L * 0.5];
        toon(g, ribbon([k0, k1, k2], 4.6, 1.2, true), far ? dark(flesh, 0.08) : flesh, { sd: 0.8, hd: 0.6, lw: 1.6, light: fleshL, shade: HFL_D });
        vein(g, [k0, k1], 0.6, vk * 0.8);
      }
      toon(g, ribbon([[-10, 4], [-15, 10], [-14, 17]], 5, 1.4, true), far ? dark(flesh, 0.08) : flesh, { sd: 0.8, hd: 0.6, lw: 1.6, light: fleshL, shade: HFL_D });
      fleshFill(g, P, { sd: 2, detail: c => { vein(c, [[-9, 9], [9, 9]], 1, vk * 0.9); glint(c, [[-8, 0], [-9, 8]], 0.4, 1.1); } });
      if (far) farShade(g, P, 0.18);
    } });
    return { el, hd };
  };
  const pauldron = (g, far) => {
    const sx = far ? -1 : 1;
    for (const [x, y, a, L] of [[-7, -8, -0.55, 20], [4, -11, 0.05, 25]]) {
      g.save(); g.translate(x * sx, y); g.rotate(a * sx);
      obs(g, poly([[-4.4, 2], [0, -L], [4.4, 2]]), { base: HOB_L, sd: 0.6, hd: 0.6, lw: 1.9, light: HOB_G, warm: 0, detail: c => { glint(c, [[-1.6, 0], [-0.4, -L * 0.7]], 0.8, 1); if (LT > 0) crescent(c, poly([[-4.4, 2], [0, -L], [4.4, 2]]), 1, 1, alpha('#ffe9a8', 0.6 * LT)); } });
      if (FI > 0) flameTongue(g, 0, -L + 2, 9 + 3 * S(t * TAU * 2 + x), 2.8, t * TAU * 2 + x, FI);
      g.restore();
    }
    const P = armour(g, [[-16, 8], [-15, -6], [-6, -13], [8, -13], [17, -4], [15, 9], [0, 13]].map(([x, y]) => [x * sx, y]), { blob: 0.5, sd: 2.2, hd: 1.4, lw: 2.2, warm: 1.6, detail: c => {
      glint(c, [[-11 * sx, -5], [-1 * sx, -11]], 0.8, 1.3);
      vein(c, [[-15 * sx, 7], [0, 11], [14 * sx, 7]], 1.2, vk);
    } });
    if (far) farShade(g, P, 0.25);
  };
  // ---------------- back spires: a broken crown of obsidian shards behind the shoulders ----------------
  parts.push({ z: 0, id: 'cr', x: hip[0], y: hip[1], a: lean, c: [0, -66], draw: g => {
    const cry = (x, y, a, L, w, k) => {
      g.save(); g.translate(x, y); g.rotate(a);
      const P = poly([[-w, 0], [-w * 0.45, -L * 0.7], [0, -L], [w * 0.5, -L * 0.62], [w, 0]]);
      obs(g, P, { base: k ? HOB_L : HOB, sd: 1.4, hd: 1, lw: 2, light: HOB_G, warm: 0, detail: c => {
        glint(c, [[-w * 0.35, -4], [-w * 0.12, -L * 0.66]], 0.85, 1.2);
        if (PH.vein > 1.2) vein(c, [[0, -4], [-w * 0.2, -L * 0.5], [w * 0.05, -L * 0.82]], 1, (PH.vein - 1) * 1.4 * heat);
        if (LT > 0) crescent(c, P, 1.2, 1.6, alpha('#ffe9a8', 0.55 * LT));
      } });
      g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 0, -L, 5, GOLD, 0.45 * heat); g.restore();
      if (FI > 0) flameTongue(g, 0, -L + 3, 10 + 4 * S(t * TAU * 2 + x), 3.6, t * TAU * 2 + x, FI);
      if (LT > 0) lightMotes(g, 0, -L * 0.7, 3, w * 2.2, 28, t, 70 + x, LT);
      g.restore();
    };
    cry(-34, -62, -0.85, 40, 8, 1); cry(-20, -70, -0.45, 56, 10, 0); cry(18, -70, 0.35, 52, 10, 1); cry(32, -64, 0.75, 38, 8, 0);
  } });
  const FA = armP(shF, p.fa || [-0.08, 0.2], true, 1, 'F');
  parts.push({ z: 1.95, id: 'pf', x: shF[0], y: shF[1], a: lean * 0.5, c: [0, 0], draw: g => pauldron(g, true) });
  // ---------------- torso: gaunt, a ribcage of obsidian around the star ----------------
  const coreAt = [2, -47], cc = T(coreAt[0], -coreAt[1]), coreR = PH.coreR * (p.coreScale || 1);
  const torsoDraw = g => {
    fleshFill(g, capsule(2, -66, 6, -80, 11, 10), { detail: c => vein(c, [[1, -68], [5, -78]], 1, vk * 0.8) });       // neck
    const body = blob([[-15, 4], [-17, -16], [-26, -32], [-40, -52], [-38, -68], [-18, -76], [22, -76], [42, -67], [44, -51], [30, -32], [19, -16], [17, 4]], 0.7);
    fleshFill(g, body, { sd: 3.2, hd: 1.6, lw: 2.4, detail: c => {
      // the star's light inside the chest: everything between the ribs glows
      const cg = c.createRadialGradient(coreAt[0], coreAt[1], 0, coreAt[0], coreAt[1], 40);
      const ck = (PH.plates === 0 ? 1 : 0.75 + PH.plates * 0.1) * (p.chestK ?? 1);
      cg.addColorStop(0, alpha('#fff2c8', ck)); cg.addColorStop(0.35, alpha('#ffb040', 0.9 * ck)); cg.addColorStop(0.75, alpha('#c2400e', 0.55 * ck)); cg.addColorStop(1, alpha('#5a1a0a', 0));
      c.fillStyle = cg; c.fillRect(coreAt[0] - 45, coreAt[1] - 45, 90, 90);
      // gaunt belly ridges + veins
      for (let i = 0; i < 3; i++) line(c, [[-12 + i, -14 - i * 5], [0, -12 - i * 5], [14 - i, -14 - i * 5]], alpha('#000', 0.3), 1.2);
      vein(c, [[-30, -40], [-26, -54], [-32, -64]], 1.4, vk);
      vein(c, [[32, -40], [28, -54], [34, -62]], 1.3, vk * 0.9);
      vein(c, [[1, -24], [3, -14], [0, -2]], 1.6, vk * 1.1);
      if (PH.plates === 0) for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.3, L = coreR * (1.9 + (i % 2) * 0.7); vein(c, [[coreAt[0] + C(a) * coreR * 1.2, coreAt[1] + S(a) * coreR * 1.2], [coreAt[0] + C(a + 0.18) * L * 1.35, coreAt[1] + S(a + 0.18) * L * 1.35]], 1.5, LT * 1.2 * (p.chestK ?? 1)); }
    } });
    // belt of shards at the hips
    for (let i = 0; i < 5; i++) {
      const x = -16 + i * 8.5, h = 13 + (i % 2) * 5;
      armour(g, [[x - 5, -6], [x + 5, -6], [x + 4, -6 + h * 0.6], [x, -6 + h], [x - 4, -6 + h * 0.6]], { sd: 1.2, hd: 1, lw: 1.8, warm: 1, detail: c => glint(c, [[x - 3, -4], [x - 2, 2]], 0.5, 0.9) });
    }
    vein(g, [[-21, -6.5], [23, -6.5]], 1.2, vk * 0.9);
  };
  if (p.split) {
    const SPL = [[-50, -30], [-20, -36], [0, -30], [20, -38], [50, -32]];
    const up = poly([[-60, -100], [60, -100], ...SPL.slice().reverse()]), lo = poly([[-60, 30], [60, 30], ...SPL.slice().reverse()]);
    parts.push({ z: 4, id: 'tu', x: hip[0], y: hip[1], a: lean, c: [2, -54], draw: g => { g.save(); g.clip(up); torsoDraw(g); g.restore(); } });
    parts.push({ z: 3.9, id: 'tl', x: hip[0], y: hip[1], a: lean, c: [1, -16], draw: g => { g.save(); g.clip(lo); torsoDraw(g); g.restore(); } });
  } else parts.push({ z: 4, id: 'to', x: hip[0], y: hip[1], a: lean, c: [2, -36], draw: torsoDraw });
  // ---------------- the star-core ----------------
  parts.push({ z: 4.5, id: 'core', x: cc[0], y: cc[1], a: 0, c: [0, 0], draw: g => starCore(g, 0, 0, coreR, PH.core * (p.coreK ?? 1), t, PH.plates === 0, p.halo ?? (PH.plates === 0 ? 1 : 0)) });
  // ---------------- ribs of obsidian (1: closed cage, 2: cracked and broken, fire pouring out) ----------------
  if (PH.plates > 0) {
    parts.push({ z: 4.7, id: 'pl', x: hip[0], y: hip[1], a: lean, c: [2, -46], draw: g => {
      const br = PH.plates === 2, gap = (PH.slit + 1) * (p.slitK ?? 1);
      const [cx, cy] = coreAt;
      // [startY, endX, endY, thickness]; side -1 = far (left), +1 = near (right)
      const RIBS = [[-70, 36, -63, 10.5], [-60, 40, -49, 10], [-50, 38, -37, 9.5], [-40, 32, -27, 8.5], [-31, 24, -19, 7.5]];
      const broken = br ? { '-1,1': 0.45, '1,2': 0.4, '1,0': 0.6, '-1,3': 0.5 } : {};
      for (const side of [-1, 1]) RIBS.forEach(([y0, ex, ey, w], i) => {
        const x0 = cx + side * (gap / 2 + 1);
        const ctrl = [[x0, y0], [x0 + side * ex * 0.45, y0 - 3], [cx + side * ex * 0.85, (y0 + ey) / 2], [cx + side * ex, ey]];
        let pts = spline(ctrl, 5);
        const cut = broken[side + ',' + i];
        if (cut) pts = pts.slice(Math.floor(pts.length * cut));
        const P = ribbon(pts, w, w * 0.55, true);
        obs(g, P, { base: side > 0 ? HOB : dark(HOB, 0.03), sd: 1.8, hd: 1.4, lw: 2, light: HOB_L, shade: '#18121c', warm: 0, detail: c => {
          // inner edges lit by the star
          stroke(c, poly(pts.map(([x, y]) => [x, y + w * 0.42]), false), alpha('#ffc860', 0.75 * heat), 2.2);
          glint(c, pts.slice(1, 4).map(([x, y]) => [x, y - w * 0.25]), 0.75, 1.2);
          if (br) vein(c, pts.slice(Math.floor(pts.length * 0.3), Math.floor(pts.length * 0.7)), 1, 1.4 * heat);
        } });
        if (cut) { const e = pts[0]; flat(g, circle(e[0], e[1], w * 0.45), '#ffd36a', 1, '#7a2008'); }
      });
      if (br) for (let i = 0; i < 5; i++) flameTongue(g, cx - 10 + i * 5, -70 - (i % 2) * 3, 16 + 6 * S(t * TAU * 2 + i * 1.3), 4, t * TAU * 2 + i, 0.95);
      // the bright seam where the ribs meet
      g.save(); g.globalCompositeOperation = 'lighter';
      stroke(g, poly([[cx, -72], [cx, -24]], false), alpha('#ffd36a', 0.5 * heat), gap + 4);
      stroke(g, poly([[cx, -70], [cx, -26]], false), alpha('#fffbe8', 0.9 * heat), Math.max(1.3, gap * 0.4));
      g.restore();
    } });
  }
  // ---------------- head: crowned obsidian mask turned right, white-fire eyes, molten tears ----------------
  const nk = T(6, 82), ht = lean * 0.4 + (p.tilt || 0);
  const hc = [nk[0] + S(ht) * 15 + 2, nk[1] - C(ht) * 15];
  parts.push({ z: 6, id: 'hd', x: hc[0], y: hc[1], a: ht, c: [0, 0], draw: g => {
    const r = 16.5;
    const rays = [[-2.95, 0.6, 0.2], [-2.6, 1.25, 0.24], [-2.25, 0.85, 0.17], [-1.9, 1.9, 0.26], [-1.55, 1.0, 0.17], [-1.22, 1.45, 0.24], [-0.88, 0.7, 0.2]];
    rays.forEach(([a, l, w], i) => {
      const L = r * l, b0 = r * 0.72, tip = [C(a) * (r + L), S(a) * (r + L)];
      const P = poly([[C(a - w) * b0, S(a - w) * b0], tip, [C(a + w) * b0, S(a + w) * b0]]);
      obs(g, P, { base: LT > 0 ? mix(HOB_L, '#ffd36a', LT * 0.85) : (i % 2 ? HOB : HOB_L), sd: 1, hd: 1, lw: 1.9, light: LT > 0 ? '#fff6d0' : HOB_G, warm: 0, detail: c => {
        glint(c, [[C(a - w * 0.5) * b0 * 1.1, S(a - w * 0.5) * b0 * 1.1], [C(a - w * 0.15) * (r + L * 0.75), S(a - w * 0.15) * (r + L * 0.75)]], 0.7, 1);
        if (PH.vein > 1.2 || LT > 0) vein(c, [[C(a) * r * 0.85, S(a) * r * 0.85], [C(a) * (r + L * 0.85), S(a) * (r + L * 0.85)]], 0.9, Math.max(LT, (PH.vein - 1) * 1.5) * heat);
      } });
      g.save(); g.globalCompositeOperation = 'lighter'; glow(g, tip[0], tip[1], 4 + l * 2.5, GOLD, (0.5 + LT * 0.4) * heat); g.restore();
      if (FI > 0 && LT === 0) flameTongue(g, tip[0], tip[1] + 2, 8, 2.8, t * TAU * 2 + i * 1.4, FI * 0.9);
    });
    if (LT > 0) { g.save(); g.globalAlpha *= LT; const ring = new Path2D(); ring.ellipse(-1, -3, r * 1.75, r * 1.7, 0, 0, TAU); stroke(g, ring, alpha('#cfe8ff', 0.45), 4.5); stroke(g, ring, alpha(GOLD, 0.9), 2); g.restore(); }
    const mask = blob([[-r * 0.86, r * 0.2], [-r * 0.78, -r * 0.62], [-r * 0.1, -r * 1.0], [r * 0.62, -r * 0.8], [r * 1.02, -r * 0.15], [r * 0.98, r * 0.62], [r * 0.56, r * 1.25], [-r * 0.22, r * 1.08]], 0.7);
    obs(g, mask, { base: HOB, sd: 2.2, hd: 1.4, lw: 2.2, light: HOB_L, warm: 1.5, warmA: 0.4, detail: c => {
      glint(c, [[-r * 0.5, -r * 0.62], [r * 0.12, -r * 0.88]], 0.8, 1.4);
      line(c, [[r * 0.12, -r * 0.44], [r * 0.98, -r * 0.3]], alpha('#000', 0.35), 1.2);
      line(c, [[r * 0.98, -r * 0.1], [r * 0.7, r * 0.15], [r * 0.95, r * 0.4]], alpha('#000', 0.3), 1);
      if (LT > 0 || PH.vein > 1.2) vein(c, [[-r * 0.2, -r * 0.95], [-r * 0.05, -r * 0.45], [-r * 0.3, r * 0.05], [-r * 0.1, r * 0.5]], 1.1, Math.max(LT * 1.4, (PH.vein - 1) * 1.4) * heat);
    } });
    const eg = Math.min(1.4, 0.95 + LT * 0.5) * (p.eyeK ?? 1);
    g.save(); g.globalCompositeOperation = 'lighter'; glow(g, r * 0.55, -r * 0.12, r * 1.15, GOLD, 0.6 * eg); g.restore();
    flat(g, poly([[r * 0.14, -r * 0.3], [r * 0.6, -r * 0.2], [r * 0.58, -r * 0.04], [r * 0.18, -r * 0.12]]), alpha('#fffbe8', Math.min(1, eg)), 0.9);
    flat(g, poly([[r * 0.72, -r * 0.2], [r * 0.97, -r * 0.1], [r * 0.95, r * 0.02], [r * 0.73, -r * 0.06]]), alpha('#fff2c8', Math.min(1, eg)), 0.9);
    vein(g, [[r * 0.33, -r * 0.06], [r * 0.29, r * 0.4], [r * 0.36, r * 0.86]], 1, 0.95 * heat);
    vein(g, [[r * 0.85, r * 0.02], [r * 0.84, r * 0.36]], 0.8, 0.75 * heat);
  } });
  // ---------------- near arm + pauldron ----------------
  const NA = armP(shN, p.na || [0.12, 0.25], false, 7, 'N');
  parts.push({ z: 7.9, id: 'pa', x: shN[0], y: shN[1], a: lean * 0.5 + (p.na ? clamp(p.na[0], -1, 2.6) * 0.12 : 0), c: [0, 0], draw: g => pauldron(g, false) });
  if (LT > 0) parts.push({ z: 9, id: 'fx', x: 0, y: 0, a: 0, draw: g => {
    lightMotes(g, shN[0], shN[1] - 10, 5, 30, 42, t, 3, LT);
    lightMotes(g, shF[0], shF[1] - 10, 4, 26, 40, t, 6, LT * 0.8);
    lightMotes(g, hip[0], hip[1] - 40, 6, 50, 52, t, 4, LT * 0.8);
    lightMotes(g, NA.hd[0], NA.hd[1] + 6, 3, 18, 34, t, 5, LT * 0.8);
  } });
  return { parts, NA, FA, hip, T, cc, hc };
}
const HeartPose = {
  walk(t, ph) {
    const G = gait(t, { stride: 24, duty: 0.62, lift: 8, bob: 2.4 });
    const sw = S(t * TAU), k = ph === 2 ? 1.25 : 1;
    return { phase: ph, t, nf: { x: G.n.x + 12, y: G.n.y, up: G.n.up }, ff: { x: G.f.x - 12, y: G.f.y, up: G.f.up }, bob: G.bob, lean: (ph === 3 ? 0.07 : ph === 2 ? 0.15 : 0.11) + S(t * TAU * 2) * 0.012,
      tilt: (ph === 3 ? -0.22 : -0.04) + S(t * TAU * 2) * 0.02, na: [0.14 - sw * 0.26 * k, 0.25 + Math.max(0, -sw) * 0.25], fa: [-0.1 + sw * 0.24 * k, 0.2 + Math.max(0, sw) * 0.2] };
  },
  idle(t, ph) {
    const b = S(t * TAU);
    return { phase: ph, t, nf: { x: 14, y: 0 }, ff: { x: -14, y: 0 }, bob: b * 1.2 - 0.5, lean: (ph === 3 ? 0.05 : 0.1) + b * 0.01, tilt: (ph === 3 ? -0.38 : ph === 2 ? -0.14 : -0.08) + b * 0.03,
      na: [0.12 + b * 0.03, 0.25], fa: [-0.1 - b * 0.03, 0.2], coreK: 1 + b * 0.08 };
  },
  attack(t, ph) {
    // the near fist rises high and comes down like a falling star
    const w = ease(seg(t, 0, 0.42)), s = ease(seg(t, 0.42, 0.56)), r = ease(seg(t, 0.68, 1));
    let up = lerp(0.12, 3.3, w); up = lerp(up, 1.1, s); up = lerp(up, 0.12, r);
    let el = lerp(0.25, 0.5, w); el = lerp(el, 0.15, s); el = lerp(el, 0.25, r);
    let lean = lerp(0.1, -0.06, w); lean = lerp(lean, 0.3, s); lean = lerp(lean, 0.1, r);
    const hit = s * (1 - r);
    return { phase: ph, t, nf: { x: 14 + hit * 10, y: 0 }, ff: { x: -14 - hit * 4, y: 0 }, bob: -w * (1 - s) * 2 + hit * 4, lean, tilt: -0.1 * w * (1 - s) + 0.1 * hit,
      na: [up, el], fa: [lerp(-0.1, -0.5, w) * (1 - r) - 0.1 * r, 0.35], dx: hit * 4, coreK: 1 + hit * 0.3, impact: seg(t, 0.53, 0.95) };
  },
  special(t, ph) {
    // rears up, arms flung wide toward the sky, the core flares: a roar that is also a plea
    const u = ease(seg(t, 0, 0.35)), r = ease(seg(t, 0.82, 1)), k = u * (1 - r);
    return { phase: ph, t, nf: { x: 14, y: 0 }, ff: { x: -16, y: 0 }, bob: -k * 3, lean: lerp(0.1, -0.16, k), tilt: -0.55 * k,
      na: [lerp(0.12, 2.45, k), lerp(0.25, 0.35, k)], fa: [lerp(-0.1, -2.5, k), lerp(0.2, -0.3, k)], coreK: 1 + k * 0.6, coreScale: 1 + k * 0.15, slitK: 1 + k * 0.6, flare: bump(seg(t, 0.25, 0.95)) };
  },
};
function heartFx(g, p) {
  const ph = p.phase || 1;
  const P = heartParts(p);
  if (p.flare > 0 && ph === 3) {
    glow(g, P.cc[0], P.cc[1], 64, '#fff6d0', 0.35 * p.flare);
    // phase 3: a slim pillar of light climbs from the star toward the sky it longs for
    const f = p.flare, c = P.cc, top = c[1] - 60 - 105 * f;
    g.save(); g.globalCompositeOperation = 'lighter';
    const col = g.createLinearGradient(0, top, 0, c[1]);
    col.addColorStop(0, alpha('#cfe8ff', 0)); col.addColorStop(0.35, alpha('#fff6d0', 0.45 * f)); col.addColorStop(1, alpha('#ffd070', 0.6 * f));
    g.fillStyle = col; g.beginPath(); g.moveTo(c[0] - 9, c[1]); g.lineTo(c[0] - 3, top); g.lineTo(c[0] + 3, top); g.lineTo(c[0] + 9, c[1]); g.closePath(); g.fill();
    g.restore();
  }
  renderParts(g, P.parts);
  if (p.impact > 0 && p.impact < 1) {
    groundSlam(g, 72, 0, p.impact, 1.55);
    const k = p.impact;
    if (ph >= 2) for (let i = 0; i < 5; i++) flameTongue(g, 56 + i * 9, 0, (16 - Math.abs(i - 2) * 4) * (1 - k), 4, i * 2 + k * 9, 1 - k);
    if (ph === 3) flat(g, star(74, -10, 26 * (1 - k) + 6, 0.22, 4), alpha('#fffbe8', 0.85 * (1 - k)), 0);
  }
  if (p.flare > 0) {
    const c = P.cc, f = p.flare;
    glow(g, c[0], c[1], 46 + ph * 6, ph === 3 ? '#fff6d0' : GOLD, 0.45 * f);
    g.save(); g.globalAlpha = f;
    const R0 = 18 + f * (26 + ph * 9);
    const ring = new Path2D(); ring.ellipse(c[0], c[1], R0, R0, 0, 0, TAU);
    stroke(g, ring, alpha(ph === 3 ? '#cfe8ff' : '#ff9a3a', 0.6), 4.5); stroke(g, ring, alpha(HOT, 0.9), 1.6);
    g.restore();
    if (ph === 2) for (let i = 0; i < 6; i++) {           // obsidian shards burst off the chest
      const a = -PI * 0.9 + i * 0.36, d = 22 + f * 36;
      at(g, [c[0] + C(a) * d, c[1] + S(a) * d], a * 2 + f * 3, q => obs(q, poly([[-4.5, -2], [3, -4.5], [5.5, 2], [-2, 4.5]]), { base: HOB, sd: 0.5, hd: 0.5, lw: 1.5, warm: 0 }));
    }
  }
}

// death: it sinks to its knees with one hand raised to the sky; the body crumbles to cooling rubble
// while the freed star rises upward, home at last.
const HEART_REST = {
  tu: [-10, -16, -1.25, 0.06, 8], tl: [8, -13, 0.35, 0.14, 2], hd: [34, -12, 1.2, 0.02, 10], cr: [-36, -14, -1.1, 0.0, 6], pa: [36, -11, 0.9, 0.08, 6], pf: [-38, -11, -0.8, 0.1, 6],
  Nu: [20, -9, 1.45, 0.06, 6], Nf: [44, -8, 1.6, 0.04, 6], Nx: [64, -10, 1.2, 0.0, 6], Fu: [-22, -9, -1.4, 0.12, 5], Ff: [-46, -8, -1.5, 0.1, 5], Fx: [-64, -10, -1.1, 0.08, 5],
  nt: [10, -10, 1.0, 0.3, 2], ns: [22, -8, 1.45, 0.28, 2], nf: [26, -5, 0.1, 0.3, 0], ft: [-12, -10, -1.0, 0.32, 2], fs: [-24, -8, -1.45, 0.3, 2], ff: [-28, -5, -0.1, 0.32, 0],
};
function heartDeath(g, t) {
  const kn = ease(seg(t, 0.05, 0.4)), reach = ease(seg(t, 0.15, 0.45)) * (1 - ease(seg(t, 0.55, 0.8)));
  const k = seg(t, 0.45, 1), rise = ease(seg(t, 0.38, 1)), cool = ease(seg(t, 0.45, 1));
  const p = { phase: 3, t: t * 0.37, nf: { x: lerp(14, -4, kn), y: 0 }, ff: { x: lerp(-14, -30, kn), y: 0 }, bob: -kn * 32, lean: lerp(0.05, 0.2, kn), tilt: lerp(-0.25, -0.65, kn),
    na: [lerp(0.12, 2.75, reach), lerp(0.25, 0.1, reach)], fa: [lerp(-0.1, 0.35, kn), 0.4], heat: lerp(1.25, 0.25, cool), lightK: 1 - cool * 0.85, coreK: 1.3, halo: 0, fist: 0.15,
    chestK: 1 - ease(seg(t, 0.35, 0.7)) * 0.85, split: t > 0.4, fireK: 1 - ease(seg(t, 0.4, 0.85)) };
  const P = heartParts(p);
  const c0 = P.cc.slice();
  for (const q of P.parts) { if (q.id === 'core') q.hide = true; if (q.id === 'cl' || q.id === 'fx') q.alpha = 1 - ease(seg(t, 0.4, 0.85)); }
  scatter(P.parts, k, HEART_REST, 7);
  g.save(); if (t < 0.45) g.translate(S(t * 50) * 1.6 * (1 - kn * 0.5), 0);
  renderParts(g, P.parts); g.restore();
  // dust and embers rising from the heap
  if (k > 0) { for (let i = 0; i < 6; i++) puff(g, -52 + i * 20, -10 - k * 12 - (i % 2) * 5, 14 + k * 12, 0.5 * bump(k * 0.85 + 0.15), '#3a3236'); embers(g, 0, -12, 12, 110, 40, k, 51, 1.3); }
  // the star ascends: a column of light, then a lone star high above
  const x = lerp(c0[0], 6, rise), y = lerp(c0[1], -224, rise), r = HPH[3].coreR * lerp(1.1, 0.5, rise);
  if (rise > 0.05) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const col = g.createLinearGradient(0, y, 0, c0[1]);
    col.addColorStop(0, alpha('#fff6d0', 0.4 * (1 - rise * 0.6))); col.addColorStop(1, alpha('#ffd070', 0));
    g.fillStyle = col; g.beginPath(); g.moveTo(x - r * 0.7, y); g.lineTo(x + r * 0.7, y); g.lineTo(c0[0] + 16, c0[1]); g.lineTo(c0[0] - 16, c0[1]); g.closePath(); g.fill();
    g.restore();
  }
  const ring = 1 - seg(t, 0.55, 1);
  starCore(g, x, y, r, 1.4, t, true, ring);
  if (rise > 0.6) { const tw = (rise - 0.6) / 0.4; flat(g, star(x, y, r * (2.4 + tw * 1.6), 0.12, 4, -PI / 2), alpha('#ffffff', 0.85), 0); flat(g, star(x, y, r * 1.6, 0.14, 4, -PI / 4), alpha('#fffbe8', 0.6), 0); }
}

// Drop near-invisible glow fringes (alpha < floor) after drawing, so trimmed frames carry no wasted margin.
function floorAlpha(g, floor = 9) {
  const c = g.canvas, d = g.getImageData(0, 0, c.width, c.height), a = d.data;
  for (let i = 3; i < a.length; i += 4) if (a[i] < floor) a[i] = 0;
  g.putImageData(d, 0, 0);
}

// ============================================================================
export function jobs() {
  const J = [];
  J.push({ name: 'e_imp', w: 76, h: 64, ax: 36, ay: 54, anims: {
    walk: { frames: 8, fps: 15, draw: (g, t) => drawImp(g, ImpPose.walk(t)) },
    idle: { frames: 4, fps: 8, draw: (g, t) => drawImp(g, ImpPose.idle(t)) },
    attack: { frames: 7, fps: 14, loop: false, draw: (g, t) => { drawImp(g, ImpPose.attack(t)); impSwipe(g, t); } },
    death: { frames: 8, fps: 13, loop: false, draw: (g, t) => impDeath(g, t) },
  } });
  J.push({ name: 'e_spearman', w: 118, h: 100, ax: 56, ay: 86, anims: {
    walk: { frames: 8, fps: 12, draw: (g, t) => spearman(g, SpearPose.walk(t)) },
    idle: { frames: 4, fps: 6, draw: (g, t) => spearman(g, SpearPose.idle(t)) },
    attack: { frames: 7, fps: 12, loop: false, draw: (g, t) => spearman(g, SpearPose.attack(t)) },
    death: { frames: 8, fps: 12, loop: false, draw: (g, t) => spearmanDeath(g, t) },
  } });
  J.push({ name: 'e_golem', w: 130, h: 104, ax: 60, ay: 90, anims: {
    walk: { frames: 8, fps: 9, draw: (g, t) => drawGolem(g, GolemPose.walk(t)) },
    idle: { frames: 4, fps: 5, draw: (g, t) => drawGolem(g, GolemPose.idle(t)) },
    attack: { frames: 7, fps: 10, loop: false, draw: (g, t) => drawGolem(g, GolemPose.attack(t)) },
    death: { frames: 8, fps: 11, loop: false, draw: (g, t) => golemDeath(g, t) },
  } });
  J.push({ name: 'e_shard', w: 74, h: 64, ax: 36, ay: 48, anims: {
    walk: { frames: 8, fps: 14, draw: (g, t) => drawShard(g, ShardPose.walk(t)) },
    idle: { frames: 4, fps: 6, draw: (g, t) => drawShard(g, ShardPose.idle(t)) },
    attack: { frames: 7, fps: 12, loop: false, draw: (g, t) => drawShard(g, ShardPose.attack(t)) },
    death: { frames: 8, fps: 12, loop: false, draw: (g, t) => shardDeath(g, t) },
  } });
  J.push({ name: 'e_drake', w: 156, h: 104, ax: 66, ay: 74, anims: {
    walk: { frames: 8, fps: 12, draw: (g, t) => drawDrake(g, DrakePose.fly(t)) },
    idle: { frames: 4, fps: 7, draw: (g, t) => drawDrake(g, DrakePose.fly(t, 0.8)) },
    attack: { frames: 7, fps: 12, loop: false, draw: (g, t) => drawDrake(g, DrakePose.attack(t)) },
    death: { frames: 8, fps: 11, loop: false, draw: (g, t) => drakeDeath(g, t) },
  } });
  J.push({ name: 'e_zealot', w: 96, h: 92, ax: 44, ay: 78, anims: {
    walk: { frames: 8, fps: 10, draw: (g, t) => zealot(g, ZealotPose.walk(t)) },
    idle: { frames: 4, fps: 6, draw: (g, t) => zealot(g, ZealotPose.idle(t)) },
    attack: { frames: 7, fps: 12, loop: false, draw: (g, t) => zealot(g, ZealotPose.attack(t)) },
    special: { frames: 8, fps: 10, loop: false, draw: (g, t) => { zealot(g, ZealotPose.special(t)); zealotSpecialFx(g, t); } },
    death: { frames: 8, fps: 12, loop: false, draw: (g, t) => zealotDeath(g, t) },
  } });
  J.push({ name: 'e_cinderknight', w: 124, h: 116, ax: 56, ay: 96, anims: {
    walk: { frames: 8, fps: 11, draw: (g, t) => cinderknight(g, KnightPose.walk(t)) },
    idle: { frames: 4, fps: 6, draw: (g, t) => cinderknight(g, KnightPose.idle(t)) },
    attack: { frames: 8, fps: 13, loop: false, draw: (g, t) => cinderknight(g, KnightPose.attack(t)) },
    death: { frames: 8, fps: 11, loop: false, draw: (g, t) => knightDeath(g, t) },
  } });
  J.push({ name: 'e_juggernaut', w: 200, h: 200, ax: 92, ay: 172, scale: 1.25, anims: {
    walk: { frames: 8, fps: 8, draw: (g, t) => juggernaut(g, JugPose.walk(t)) },
    idle: { frames: 4, fps: 5, draw: (g, t) => juggernaut(g, JugPose.idle(t)) },
    attack: { frames: 8, fps: 12, loop: false, draw: (g, t) => juggernaut(g, JugPose.attack(t)) },
    special: { frames: 8, fps: 10, loop: false, draw: (g, t) => { juggernaut(g, JugPose.special(t)); jugSpecialFx(g, t); } },
    death: { frames: 8, fps: 10, loop: false, draw: (g, t) => jugDeath(g, t) },
  } });
  J.push({ name: 'e_shade', w: 100, h: 88, ax: 50, ay: 74, anims: {
    walk: { frames: 8, fps: 10, draw: (g, t) => drawShade(g, ShadePose.walk(t)) },
    idle: { frames: 4, fps: 6, draw: (g, t) => drawShade(g, ShadePose.idle(t)) },
    attack: { frames: 7, fps: 13, loop: false, draw: (g, t) => { drawShade(g, ShadePose.attack(t)); shadeSlash(g, t); } },
    special: { frames: 8, fps: 14, loop: false, draw: (g, t) => shadeSpecial(g, t) },
    death: { frames: 8, fps: 11, loop: false, draw: (g, t) => shadeDeath(g, t) },
  } });
  // the final boss: per-phase variants (the renderer picks `<anim><phase>`)
  const HA = {};
  for (const ph of [1, 2, 3]) {
    const sfx = ph === 1 ? '' : String(ph);
    HA['walk' + sfx] = { frames: 8, fps: ph === 1 ? 6 : 6.5, draw: (g, t) => heartFx(g, HeartPose.walk(t, ph)) };
    HA['idle' + sfx] = { frames: 4, fps: 5, draw: (g, t) => heartFx(g, HeartPose.idle(t, ph)) };
    HA['attack' + sfx] = { frames: 8, fps: 11, loop: false, draw: (g, t) => heartFx(g, HeartPose.attack(t, ph)) };
    HA['special' + sfx] = { frames: 8, fps: 9, loop: false, draw: (g, t) => heartFx(g, HeartPose.special(t, ph)) };
  }
  HA.death = { frames: 8, fps: 5, loop: false, draw: (g, t) => heartDeath(g, t) };
  J.push({ name: 'e_boss_heart', w: 330, h: 330, ax: 150, ay: 280, scale: 1, anims: HA });
  for (const job of J) for (const an of Object.values(job.anims)) { const d0 = an.draw; an.draw = (g, t, i, n) => { d0(g, t, i, n); floorAlpha(g); }; }
  return J;
}
