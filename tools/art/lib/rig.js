// Rampart Riot art generator — skeletal humanoid rig with procedural poses and accessory kit.
// Side view facing right (3/4 feel). Feet at (0,0); y up is negative.
// Limb angles: 0 = straight down, +PI/2 = forward (right), PI = up.
import { toon, flat, capsule, ellipse, circle, poly, blob, rrect, glow, dark, light, mix, OUT, OL, eye, stroke, line, alpha } from './toon.js';

const S = Math.sin, C = Math.cos, PI = Math.PI;
export function vec(a, l) { return [S(a) * l, C(a) * l]; }
export function ease(t) { return t * t * (3 - 2 * t); }
export function seg(t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); }
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------------------
// Poses
// ---------------------------------------------------------------------------
export function basePose() {
  return { bob: 0, lean: 0.05, tilt: 0, rot: 0, dx: 0, dy: 0,
    nl: [0.05, 0.05], fl: [-0.05, 0.05], na: [0.15, 0.35], fa: [-0.1, 0.3],
    wAng: 0, draw: 0, squash: 1, alpha: 1, mouth: 0, blink: 0 };
}

export const Pose = {
  idle(t, o = {}) {
    const p = basePose();
    const b = S(t * PI * 2);
    p.bob = b * 0.5 * (o.amp || 1);
    p.na = [0.18 + b * 0.04, 0.45];
    p.fa = [-0.1 - b * 0.04, 0.35];
    p.tilt = b * 0.03;
    return p;
  },
  walk(t, o = {}) {
    const p = basePose();
    const ph = t * PI * 2;
    const st = o.stride ?? 0.55;
    p.nl = [S(ph) * st, Math.max(0, -C(ph)) * 0.9 + 0.08];
    p.fl = [-S(ph) * st, Math.max(0, C(ph)) * 0.9 + 0.08];
    p.na = [-S(ph) * (o.arm ?? 0.5) + 0.1, 0.45 + Math.max(0, S(ph)) * 0.3];
    p.fa = [S(ph) * (o.arm ?? 0.5) - 0.05, 0.4];
    p.bob = -Math.abs(S(ph)) * (o.bobAmp ?? 1.6) + 0.8;
    p.lean = (o.lean ?? 0.08) + S(ph * 2) * 0.02;
    p.tilt = S(ph * 2) * 0.03;
    return p;
  },
  run(t, o = {}) { return Pose.walk(t, Object.assign({ stride: 0.85, arm: 0.8, bobAmp: 2.6, lean: 0.25 }, o)); },
  // overhead / forehand melee swing
  melee(t, o = {}) {
    const p = basePose();
    const w = ease(seg(t, 0, 0.4)), s = ease(seg(t, 0.4, 0.58)), r = ease(seg(t, 0.62, 1));
    let up = lerp(0.2, -2.6, w); up = lerp(up, 1.15, s); up = lerp(up, 0.2, r);
    let el = lerp(0.4, 1.2, w); el = lerp(el, 0.15, s); el = lerp(el, 0.45, r);
    p.na = [up, el];
    p.fa = [lerp(-0.1, 0.5, w) * (1 - r), 0.6];
    p.lean = lerp(0.05, -0.12, w); p.lean = lerp(p.lean, 0.3, s); p.lean = lerp(p.lean, 0.05, r);
    p.nl = [lerp(0.05, 0.35, s * (1 - r)), 0.15];
    p.fl = [lerp(-0.05, -0.3, s * (1 - r)), 0.2];
    p.bob = -s * (1 - r) * 1.2;
    p.dx = s * (1 - r) * 2;
    p.wAng = lerp(0, -0.4, w) + s * 0.3;
    return p;
  },
  // thrust (spear / dagger)
  thrust(t) {
    const p = basePose();
    const w = ease(seg(t, 0, 0.4)), s = ease(seg(t, 0.4, 0.55)), r = ease(seg(t, 0.6, 1));
    p.na = [lerp(0.6, 0.9, w) * (1 - s) + 1.55 * s * (1 - r) + 0.6 * r * s, lerp(1.6, 2.0, w) * (1 - s) + 0.0 * s * (1 - r) + 1.6 * r * s];
    p.dx = lerp(0, -2, w) + s * 5 * (1 - r);
    p.lean = 0.05 + s * 0.25 * (1 - r);
    p.nl = [0.3 * s * (1 - r), 0.2]; p.fl = [-0.25 * s * (1 - r), 0.2];
    p.fa = [0.3, 0.8];
    return p;
  },
  // bow draw and release
  shoot(t) {
    const p = basePose();
    const d = ease(seg(t, 0, 0.55)), rel = seg(t, 0.62, 0.7), r = ease(seg(t, 0.7, 1));
    p.fa = [1.6, 0.05];        // bow arm extended forward
    p.na = [1.35 - d * 0.05, 1.1 + d * 1.0 - rel * 0.6];   // draw hand pulls back
    p.draw = rel > 0 ? 0 : d;
    p.lean = -0.05;
    p.nl = [0.25, 0.1]; p.fl = [-0.25, 0.1];
    if (r > 0) { p.na = [lerp(p.na[0], 0.6, r), lerp(p.na[1], 0.6, r)]; }
    return p;
  },
  // crossbow / aim and fire (both arms forward)
  aim(t) {
    const p = basePose();
    const kick = seg(t, 0.45, 0.55) * (1 - seg(t, 0.6, 1));
    p.fa = [1.45, 0.25]; p.na = [1.0, 1.3];
    p.dx = -kick * 2; p.lean = -0.05 - kick * 0.1;
    p.nl = [0.25, 0.1]; p.fl = [-0.25, 0.1];
    return p;
  },
  // spell cast: arms up then thrust forward
  cast(t) {
    const p = basePose();
    const u = ease(seg(t, 0, 0.45)), f = ease(seg(t, 0.45, 0.6)), r = ease(seg(t, 0.65, 1));
    p.na = [lerp(0.2, 2.6, u) * (1 - f) + 1.6 * f * (1 - r) + 0.2 * r, lerp(0.4, 0.4, u) * (1 - f) + 0.1 * f];
    p.fa = [lerp(-0.1, 2.3, u) * (1 - f) + 1.3 * f * (1 - r) - 0.1 * r, 0.5];
    p.lean = -0.15 * u * (1 - f) + 0.2 * f * (1 - r);
    p.bob = -u * 1.5 * (1 - r);
    return p;
  },
  // throw (sling / grenade)
  throw(t) {
    const p = basePose();
    const w = ease(seg(t, 0, 0.45)), s = ease(seg(t, 0.45, 0.6)), r = ease(seg(t, 0.65, 1));
    p.na = [lerp(0.2, -2.2, w) * (1 - s) + 2.2 * s * (1 - r) + 0.2 * r * s, 0.3];
    p.fa = [lerp(-0.1, 0.9, w) * (1 - r), 0.4];
    p.lean = lerp(0, -0.2, w) * (1 - s) + 0.3 * s * (1 - r);
    p.nl = [0.3 * s * (1 - r), 0.2]; p.fl = [-0.2, 0.2];
    return p;
  },
  // fall backwards and lie down
  death(t, o = {}) {
    const p = basePose();
    const k = ease(seg(t, 0, 0.18)), f = seg(t, 0.12, 0.7);
    const fe = f * f;
    const dir = o.forward ? 1 : -1;
    p.rot = dir * fe * PI / 2 * 0.95;
    p.dx = -dir * (k * 3 + fe * 4);
    p.dy = fe * 2;
    p.na = [lerp(0.2, dir > 0 ? 2.2 : -1.0, k) , 0.3];
    p.fa = [lerp(-0.1, dir > 0 ? 2.5 : -1.5, k), 0.2];
    p.nl = [lerp(0.05, 0.4, k), 0.4]; p.fl = [lerp(-0.05, 0.2, k), 0.6];
    p.lean = -dir * k * 0.2;
    p.tilt = -dir * k * 0.3;
    const settle = seg(t, 0.7, 0.8);
    p.dy += S(settle * PI) * -1.5;
    p.eyesClosed = t > 0.15;
    return p;
  },
  hurt(t) { const p = basePose(); p.lean = -0.25 * S(t * PI); p.dx = -2 * S(t * PI); p.tilt = -0.2 * S(t * PI); return p; },
};

// ---------------------------------------------------------------------------
// Humanoid
// ---------------------------------------------------------------------------
export function humanoid(cfg) {
  const H = cfg.h || 44;
  const k = H / 44;
  const c = Object.assign({
    headR: 7.4 * k, torsoH: 13 * k, torsoW: 9.5 * k, belly: 0, thigh: 7.6 * k, shin: 7.2 * k,
    upper: 7 * k, fore: 6.4 * k, limbR: 2.7 * k, lw: OL,
    skin: '#f0c49a', hair: '#5b3a1e', eyeColor: null,
    shirt: '#7d5a3a', pants: '#5a4634', boots: '#3d2a1c', sleeve: null, glove: null, belt: '#4a2e18',
  }, cfg);
  c.sleeve = c.sleeve || c.shirt; c.glove = c.glove || c.skin;
  return {
    cfg: c,
    joints(p) { return joints(c, p); },
    draw(ctx, p) { drawHumanoid(ctx, c, p); },
  };
}

function joints(c, p) {
  const hip = [p.dx, -(c.thigh + c.shin) - p.bob + p.dy];
  const lean = p.lean;
  const neck = [hip[0] + S(lean) * c.torsoH, hip[1] - C(lean) * c.torsoH];
  const head = [neck[0] + S(lean + p.tilt) * c.headR * 0.85 + c.headR * 0.12, neck[1] - C(lean + p.tilt) * c.headR * 0.85];
  const kw = Math.max(1, c.torsoW / 9.5);
  const shN = [neck[0] + C(lean) * 1.0 * kw + S(lean) * 2.2 * kw, neck[1] + 2.2 * kw + S(lean) * 1];
  const shF = [neck[0] - C(lean) * 2.0 * kw + S(lean) * 2.6 * kw, neck[1] + 2.6 * kw];
  const hipN = [hip[0] + 1.6 * (c.torsoW / 9.5), hip[1]];
  const hipF = [hip[0] - 1.4 * (c.torsoW / 9.5), hip[1]];
  const legJ = (h, a) => { const kn = [h[0] + S(a[0]) * c.thigh, h[1] + C(a[0]) * c.thigh]; const sa = a[0] - a[1]; const ft = [kn[0] + S(sa) * c.shin, kn[1] + C(sa) * c.shin]; return { h, kn, ft, sa, ta: a[0] }; };
  const armJ = (s, a) => { const el = [s[0] + S(a[0]) * c.upper, s[1] + C(a[0]) * c.upper]; const fa = a[0] + a[1]; const hd = [el[0] + S(fa) * c.fore, el[1] + C(fa) * c.fore]; return { s, el, hd, ua: a[0], fa }; };
  return { hip, neck, head, lean, nl: legJ(hipN, p.nl), fl: legJ(hipF, p.fl), na: armJ(shN, p.na), fa: armJ(shF, p.fa) };
}

function drawLeg(ctx, c, L, far) {
  const pants = far ? dark(c.pants, 0.08) : c.pants;
  const boots = far ? dark(c.boots, 0.08) : c.boots;
  const r = c.limbR * (c.legThick || 1);
  toon(ctx, capsule(L.h[0], L.h[1], L.kn[0], L.kn[1], r * 1.15, r), pants, { sd: 1.2, hd: 0.6, lw: c.lw });
  const shinCol = c.shinColor ? (far ? dark(c.shinColor, 0.08) : c.shinColor) : boots;
  toon(ctx, capsule(L.kn[0], L.kn[1], L.ft[0], L.ft[1], r, r * 0.9), shinCol, { sd: 1.2, hd: 0.6, lw: c.lw });
  if (c.feet !== 'none') {
    const fx = L.ft[0], fy = L.ft[1];
    const fl = (c.footLen || 4.4) * (c.h / 44 || 1);
    if (c.feet === 'claw') {
      toon(ctx, poly([[fx - 2, fy - 2], [fx + fl + 1, fy - 0.5], [fx + fl - 1, fy + 1], [fx - 2.5, fy + 1]]), boots, { sd: 0.8, hd: 0.4, lw: c.lw });
    } else if (c.feet === 'hoof') {
      toon(ctx, rrect(fx - 2.6, fy - 2.6, 5.2, 3.6, 1), dark(boots, 0.2), { sd: 0.6, hd: 0.3, lw: c.lw });
    } else {
      toon(ctx, ellipse(fx + fl * 0.35, fy - 1.1, fl * 0.75, 2.2 * (c.h / 44 || 1)), boots, { sd: 0.8, hd: 0.5, lw: c.lw });
    }
  }
  if (c.kneePad && !far) toon(ctx, circle(L.kn[0] + 0.5, L.kn[1], r * 1.05), c.kneePad, { sd: 0.8, hd: 0.6, lw: c.lw * 0.8 });
}

function drawArm(ctx, c, A, far) {
  const sleeve = far ? dark(c.sleeve, 0.08) : c.sleeve;
  const glove = far ? dark(c.glove, 0.08) : c.glove;
  const r = c.limbR * (c.armThick || 0.95);
  toon(ctx, capsule(A.s[0], A.s[1], A.el[0], A.el[1], r * 1.1, r * 0.95), sleeve, { sd: 1.1, hd: 0.6, lw: c.lw });
  toon(ctx, capsule(A.el[0], A.el[1], A.hd[0], A.hd[1], r * 0.95, r * 0.8), c.foreColor ? (far ? dark(c.foreColor, .08) : c.foreColor) : (c.bareArms ? (far ? dark(c.skin, .08) : c.skin) : sleeve), { sd: 1.1, hd: 0.6, lw: c.lw });
  if (c.claws) {
    const a = A.fa;
    for (let i = -1; i <= 1; i++) { const ca = a + i * 0.35; line(ctx, [[A.hd[0], A.hd[1]], [A.hd[0] + S(ca) * 4, A.hd[1] + C(ca) * 4]], '#efe6cf', 1.4); }
  }
  toon(ctx, circle(A.hd[0], A.hd[1], r * 0.95), glove, { sd: 0.8, hd: 0.5, lw: c.lw });
  if (c.pauldron && !far) {
    toon(ctx, ellipse(A.s[0] + 0.5, A.s[1] + 0.5, r * 1.7, r * 1.35, 0.2), c.pauldron, { sd: 1.2, hd: 0.8, lw: c.lw });
  }
}

function drawTorso(ctx, c, J, p) {
  const { hip, neck, lean } = J;
  const w = c.torsoW, h = c.torsoH;
  ctx.save();
  ctx.translate(hip[0], hip[1]);
  ctx.rotate(lean);
  // torso shape: rounded, chest wider, optional belly
  const bel = c.belly || 0;
  const tw = w * (c.chest || 1);
  const pts = [
    [-w * 0.48, 0.5], [-w * 0.55 - bel * 0.2, -h * 0.35], [-tw * 0.55, -h * 0.78], [-tw * 0.32, -h - 1.2],
    [tw * 0.3, -h - 1.4], [tw * 0.58 + bel * 0.1, -h * 0.75], [w * 0.62 + bel, -h * 0.35], [w * 0.5 + bel * 0.4, 0.8],
  ];
  const torso = blob(pts, 0.75);
  const base = c.torsoColor || c.shirt;
  toon(ctx, torso, base, { sd: 2.2, hd: 1.2, lw: c.lw, detail: (g) => {
    if (c.torsoStyle === 'mail') {
      g.strokeStyle = alpha('#1a1a22', 0.35); g.lineWidth = 0.7;
      for (let yy = -h; yy < 1; yy += 2.2) for (let xx = -w; xx < w + 4; xx += 2.4) { g.beginPath(); g.arc(xx + ((yy / 2.2) % 2) * 1.2, yy, 1.1, 0, PI); g.stroke(); }
    } else if (c.torsoStyle === 'plate') {
      g.fillStyle = alpha('#ffffff', 0.22); g.beginPath(); g.ellipse(-w * 0.1, -h * 0.65, w * 0.22, h * 0.25, -0.3, 0, PI * 2); g.fill();
      g.strokeStyle = alpha('#000', 0.25); g.lineWidth = 0.8; g.beginPath(); g.moveTo(w * 0.1, -h * 0.95); g.lineTo(w * 0.15, -h * 0.2); g.stroke();
    } else if (c.torsoStyle === 'fur') {
      g.strokeStyle = alpha('#000', 0.25); g.lineWidth = 0.8;
      for (let i = 0; i < 26; i++) { const xx = -w * 0.6 + ((i * 7.3) % (w * 1.3)), yy = -h + ((i * 5.1) % h); g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + 0.8, yy + 2.4); g.stroke(); }
    } else if (c.torsoStyle === 'robe') {
      g.strokeStyle = alpha('#000', 0.18); g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(w * 0.15, -h); g.lineTo(w * 0.25, 1); g.stroke();
    } else if (c.torsoStyle === 'ribs') {
      g.strokeStyle = alpha('#3a2a20', 0.6); g.lineWidth = 1.1;
      for (let i = 0; i < 4; i++) { const yy = -h * 0.75 + i * 2.6; g.beginPath(); g.moveTo(-w * 0.35, yy); g.quadraticCurveTo(w * 0.1, yy - 1.5, w * 0.5, yy + 0.5); g.stroke(); }
    }
    if (c.tabard) {
      g.fillStyle = c.tabard;
      g.beginPath(); g.moveTo(-w * 0.05, -h * 0.95); g.lineTo(w * 0.5, -h * 0.95); g.lineTo(w * 0.55, 2); g.lineTo(-w * 0.1, 2); g.closePath(); g.fill();
      g.strokeStyle = alpha('#000', 0.3); g.lineWidth = 0.8; g.stroke();
      if (c.emblem) c.emblem(g, w * 0.24, -h * 0.55);
    }
    if (c.chestDetail) c.chestDetail(g, w, h);
  } });
  if (c.belt) {
    const by = -h * 0.12;
    toon(ctx, rrect(-w * 0.6, by - 1.6, w * 1.25 + bel * 0.6, 3.2, 1), c.belt, { sd: 0.8, hd: 0.4, lw: c.lw * 0.8 });
    toon(ctx, rrect(w * 0.18, by - 2, 3.2, 4, 0.8), c.buckle || '#d8b052', { sd: 0.5, hd: 0.4, lw: c.lw * 0.7 });
  }
  if (c.skirt) {
    const sk = poly([[-w * 0.58, -1], [w * 0.62 + bel * 0.4, -1], [w * 0.7, 6], [-w * 0.7, 6]]);
    toon(ctx, sk, c.skirt, { sd: 1, hd: 0.6, lw: c.lw * 0.9 });
  }
  ctx.restore();
}

function drawHead(ctx, c, J, p) {
  const [hx, hy] = J.head;
  const r = c.headR;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(J.lean * 0.6 + p.tilt);
  const accessoryBack = c.helmet && HELMETS_BACK[c.helmet];
  if (accessoryBack) accessoryBack(ctx, c, r);
  if (c.hairBack && c.helmet !== 'great') toon(ctx, blob([[-r * 1.05, -r * 0.2], [-r * 0.6, -r * 1.05], [r * 0.4, -r * 1.1], [-r * 0.3, r * 0.9], [-r * 1.15, r * 1.2]], 0.7), c.hair, { sd: 1.2, hd: 0.6, lw: c.lw });
  if (c.ears === 'long') {
    const ear = poly([[-r * 0.25, -r * 0.25], [-r * 1.9, -r * 1.05], [-r * 0.4, r * 0.25]]);
    toon(ctx, ear, c.skin, { sd: 1, hd: 0.6, lw: c.lw });
  }
  // head shape
  const headShape = c.headShape === 'long'
    ? blob([[-r * 0.9, r * 0.1], [-r * 0.7, -r * 0.9], [r * 0.4, -r * 1.0], [r * 1.0, -r * 0.2], [r * 1.05, r * 0.5], [r * 0.4, r * 1.0], [-r * 0.6, r * 0.8]], 0.8)
    : c.headShape === 'skull'
      ? blob([[-r * 0.95, 0], [-r * 0.6, -r * 0.95], [r * 0.5, -r * 0.95], [r * 1.0, -r * 0.1], [r * 0.85, r * 0.55], [r * 0.55, r * 0.95], [-r * 0.2, r * 0.9], [-r * 0.8, r * 0.6]], 0.8)
      : ellipse(0, 0, r, r * (c.headSquash || 1));
  toon(ctx, headShape, c.skin, { sd: 1.6, hd: 1, lw: c.lw });
  if (c.ears === 'pointy') toon(ctx, poly([[-r * 0.2, -r * 0.2], [-r * 1.25, -r * 0.75], [-r * 0.35, r * 0.25]]), c.skin, { sd: 0.8, hd: 0.5, lw: c.lw });
  if (c.ears === 'round') toon(ctx, ellipse(-r * 0.25, 0, r * 0.28, r * 0.35), c.skin, { sd: 0.6, hd: 0.3, lw: c.lw * 0.9 });
  // face
  const ey = c.eyeY ?? -r * 0.08;
  if (c.face !== false) {
    if (c.eyeGlow) {
      eye(ctx, r * 0.45, ey, r * 0.17, { glow: c.eyeGlow, glowCore: c.eyeCore, squint: c.squint });
      if (c.twoEyes) eye(ctx, r * 0.85, ey + 0.4, r * 0.13, { glow: c.eyeGlow, glowCore: c.eyeCore, squint: c.squint });
    } else if (p.eyesClosed) {
      line(ctx, [[r * 0.3, ey], [r * 0.62, ey + 0.4]], OUT, 1);
    } else {
      eye(ctx, r * 0.47, ey, r * (c.eyeR || 0.2), { pupil: c.eyeColor || '#1a120c', squint: c.squint, white: c.eyeWhite, lw: 0.7 });
    }
    if (c.brow !== false) line(ctx, [[r * 0.22, ey - r * 0.3 - (c.angry ? -0.6 : 0)], [r * 0.72, ey - r * (c.angry ? 0.18 : 0.34)]], c.browColor || dark(c.hair, 0.1), c.lw * 0.9);
    if (c.nose) toon(ctx, c.nose === 'big' ? ellipse(r * 0.98, r * 0.15, r * 0.3, r * 0.24) : ellipse(r * 0.95, r * 0.12, r * 0.14, r * 0.14), dark(c.skin, 0.05), { sd: 0.5, hd: 0.3, lw: c.lw * 0.8 });
    if (c.mouth === 'fangs') {
      toon(ctx, poly([[r * 0.35, r * 0.45], [r * 0.95, r * 0.35], [r * 0.85, r * 0.62], [r * 0.4, r * 0.65]]), '#5a1414', { sd: 0, hd: 0, lw: c.lw * 0.8 });
      flat(ctx, poly([[r * 0.5, r * 0.44], [r * 0.58, r * 0.68], [r * 0.66, r * 0.42]]), '#fff6dc', 0.6);
      flat(ctx, poly([[r * 0.72, r * 0.4], [r * 0.8, r * 0.62], [r * 0.87, r * 0.38]]), '#fff6dc', 0.6);
    } else if (c.mouth === 'grin') {
      flat(ctx, poly([[r * 0.3, r * 0.42], [r * 0.95, r * 0.3], [r * 0.7, r * 0.62]]), '#3a1010', 0.8);
      line(ctx, [[r * 0.38, r * 0.43], [r * 0.9, r * 0.33]], '#fff4d8', 0.9);
    } else if (c.mouth !== 'none') {
      line(ctx, [[r * 0.45, r * 0.48], [r * 0.82, r * 0.42]], OUT, c.lw * 0.8);
    }
    if (c.tusks) { flat(ctx, poly([[r * 0.55, r * 0.55], [r * 0.6, r * 0.05], [r * 0.75, r * 0.5]]), '#f4ecd2', 0.8); }
    if (c.beard) {
      toon(ctx, blob([[r * 0.05, r * 0.15], [r * 1.0, r * 0.15], [r * 0.95, r * 0.7], [r * 0.6, r * (c.beardLen || 1.5)], [r * 0.1, r * 0.95]], 0.7), c.beard, { sd: 1, hd: 0.5, lw: c.lw });
    }
    if (c.mustache) toon(ctx, blob([[r * 0.45, r * 0.3], [r * 1.05, r * 0.25], [r * 1.0, r * 0.5], [r * 0.6, r * 0.5]], 0.6), c.mustache, { sd: 0.5, hd: 0.3, lw: c.lw * 0.8 });
    if (c.scar) line(ctx, [[r * 0.2, -r * 0.55], [r * 0.6, r * 0.25]], '#9a4a3a', 0.9);
  }
  if (c.hairFront && (!c.helmet || c.helmet === 'circlet')) toon(ctx, blob([[-r * 1.02, r * 0.1], [-r * 0.95, -r * 0.75], [-r * 0.2, -r * 1.12], [r * 0.75, -r * 0.85], [r * 0.95, -r * 0.35], [r * 0.3, -r * 0.55], [-r * 0.4, -r * 0.35]], 0.7), c.hair, { sd: 1.1, hd: 0.7, lw: c.lw });
  if (c.helmet && HELMETS[c.helmet]) HELMETS[c.helmet](ctx, c, r);
  if (c.headExtra) c.headExtra(ctx, c, r);
  ctx.restore();
}

// ---------------- helmets (drawn in head-local coords, r = head radius) ----------------
const HELMETS_BACK = {
  hood: (g, c, r) => toon(g, blob([[-r * 1.25, r * 1.3], [-r * 1.3, -r * 0.6], [-r * 0.5, -r * 1.3], [r * 0.6, -r * 1.25], [r * 1.15, -r * 0.4], [r * 0.4, r * 1.2]], 0.7), dark(c.helmColor || '#3f5a2e', 0.08), { sd: 1, hd: 0.5, lw: c.lw }),
  wolf: (g, c, r) => toon(g, blob([[-r * 1.6, r * 1.6], [-r * 1.3, -r * 0.4], [-r * 0.4, -r * 1.2], [r * 0.6, -r * 1.1], [r * 0.2, r * 0.6]], 0.7), '#8c8478', { sd: 1.2, hd: 0.6, lw: c.lw }),
};
const HELMETS = {
  kettle(g, c, r) {
    const col = c.helmColor || '#9aa1a8';
    toon(g, blob([[-r * 1.05, -r * 0.05], [-r * 0.9, -r * 0.85], [0, -r * 1.25], [r * 0.9, -r * 0.85], [r * 1.05, -r * 0.05]], 0.6), col, { sd: 1.4, hd: 1, lw: c.lw });
    toon(g, ellipse(0, -r * 0.08, r * 1.45, r * 0.32), dark(col, 0.04), { sd: 0.8, hd: 0.6, lw: c.lw });
  },
  nasal(g, c, r) {
    const col = c.helmColor || '#a3abb2';
    toon(g, blob([[-r * 1.05, r * 0.1], [-r * 0.95, -r * 0.8], [r * 0.05, -r * 1.25], [r * 0.95, -r * 0.75], [r * 1.05, -r * 0.1], [r * 0.2, -r * 0.25]], 0.6), col, { sd: 1.5, hd: 1, lw: c.lw });
    toon(g, rrect(r * 0.62, -r * 0.35, r * 0.22, r * 0.8, 0.5), dark(col, 0.05), { sd: 0.4, hd: 0.3, lw: c.lw * 0.8 });
    toon(g, rrect(-r * 1.05, -r * 0.3, r * 2.1, r * 0.25, 0.6), c.helmTrim || '#c79a3e', { sd: 0.4, hd: 0.3, lw: c.lw * 0.8 });
  },
  great(g, c, r) {
    const col = c.helmColor || '#b8bec6';
    const shape = blob([[-r * 1.05, r * 0.95], [-r * 1.12, -r * 0.6], [-r * 0.5, -r * 1.2], [r * 0.6, -r * 1.2], [r * 1.12, -r * 0.55], [r * 1.12, r * 0.95]], 0.55);
    toon(g, shape, col, { sd: 1.8, hd: 1.1, lw: c.lw });
    flat(g, rrect(r * 0.1, -r * 0.25, r * 1.0, r * 0.22, 0.5), '#16110d', 0);
    line(g, [[r * 0.75, -r * 0.0], [r * 0.75, r * 0.7]], alpha('#000', 0.4), 0.8);
    if (c.plume) {
      toon(g, blob([[-r * 0.1, -r * 1.15], [-r * 0.3, -r * 1.75], [-r * 1.0, -r * 1.85], [-r * 1.55, -r * 1.2], [-r * 1.0, -r * 1.25], [-r * 0.5, -r * 1.0]], 0.6), c.plume, { sd: 1, hd: 0.7, lw: c.lw });
    }
    if (c.helmTrim) toon(g, rrect(-r * 0.12, -r * 1.22, r * 0.24, r * 2.1, 0.5), c.helmTrim, { sd: 0.3, hd: 0.3, lw: c.lw * 0.7 });
  },
  cap(g, c, r) {
    const col = c.helmColor || '#4d6b34';
    toon(g, blob([[-r * 1.08, -r * 0.05], [-r * 0.9, -r * 0.9], [r * 0.1, -r * 1.2], [r * 1.05, -r * 0.6], [r * 1.5, -r * 0.2], [r * 0.4, -r * 0.35]], 0.6), col, { sd: 1.2, hd: 0.8, lw: c.lw });
    if (c.feather) toon(g, blob([[-r * 0.6, -r * 0.8], [-r * 1.6, -r * 1.9], [-r * 1.9, -r * 1.6], [-r * 0.9, -r * 0.6]], 0.6), c.feather, { sd: 0.6, hd: 0.4, lw: c.lw * 0.8 });
  },
  hood(g, c, r) {
    const col = c.helmColor || '#3f5a2e';
    toon(g, blob([[-r * 1.15, r * 0.5], [-r * 1.12, -r * 0.7], [-r * 0.3, -r * 1.3], [r * 0.75, -r * 1.05], [r * 1.18, -r * 0.3], [r * 0.85, -r * 0.4], [r * 0.25, -r * 0.65], [-r * 0.3, -r * 0.1], [-r * 0.5, r * 0.6]], 0.6), col, { sd: 1.4, hd: 0.8, lw: c.lw });
  },
  horned(g, c, r) {
    HELMETS.kettle(g, Object.assign({}, c, { helmColor: c.helmColor || '#7d7468' }), r);
    const hc = c.hornColor || '#e9dcc0';
    toon(g, blob([[-r * 0.6, -r * 0.8], [-r * 1.5, -r * 1.4], [-r * 1.7, -r * 2.3], [-r * 1.1, -r * 1.6], [-r * 0.3, -r * 1.15]], 0.6), hc, { sd: 0.8, hd: 0.5, lw: c.lw });
    toon(g, blob([[r * 0.4, -r * 0.9], [r * 1.3, -r * 1.5], [r * 1.5, -r * 2.4], [r * 0.9, -r * 1.7], [r * 0.1, -r * 1.2]], 0.6), hc, { sd: 0.8, hd: 0.5, lw: c.lw });
  },
  wolf(g, c, r) {
    const col = '#9d958a';
    toon(g, blob([[-r * 1.1, r * 0.2], [-r * 1.0, -r * 0.9], [r * 0.2, -r * 1.3], [r * 1.3, -r * 0.9], [r * 1.9, -r * 0.45], [r * 1.0, -r * 0.35], [r * 0.2, -r * 0.5]], 0.6), col, { sd: 1.4, hd: 0.8, lw: c.lw });
    toon(g, poly([[-r * 0.2, -r * 1.05], [r * 0.15, -r * 1.75], [r * 0.45, -r * 1.1]]), col, { sd: 0.6, hd: 0.4, lw: c.lw * 0.9 });
    eye(g, r * 1.0, -r * 0.7, r * 0.12, { glow: '#ffcf4a' });
  },
  crown(g, c, r) {
    const col = c.helmColor || '#e8c24a';
    toon(g, poly([[-r * 0.85, -r * 0.55], [-r * 0.95, -r * 1.25], [-r * 0.5, -r * 0.95], [-r * 0.1, -r * 1.45], [r * 0.3, -r * 0.95], [r * 0.75, -r * 1.3], [r * 0.85, -r * 0.55]]), col, { sd: 0.9, hd: 0.7, lw: c.lw });
    toon(g, circle(-r * 0.05, -r * 0.8, r * 0.15), c.gem || '#e0313a', { sd: 0.3, hd: 0.3, lw: c.lw * 0.6 });
  },
  circlet(g, c, r) {
    toon(g, rrect(-r * 1.0, -r * 0.62, r * 2.0, r * 0.2, 0.4), c.helmColor || '#d9c27a', { sd: 0.3, hd: 0.3, lw: c.lw * 0.7 });
    toon(g, circle(r * 0.55, -r * 0.55, r * 0.14), c.gem || '#6ad0ff', { sd: 0.2, hd: 0.3, lw: c.lw * 0.6 });
  },
  wizard(g, c, r) {
    const col = c.helmColor || '#4a3a8a';
    toon(g, blob([[-r * 1.3, -r * 0.45], [-r * 0.6, -r * 1.0], [-r * 0.5, -r * 2.2], [-r * 1.3, -r * 3.0], [r * 0.3, -r * 2.2], [r * 0.7, -r * 0.95], [r * 1.4, -r * 0.45]], 0.55), col, { sd: 1.4, hd: 0.8, lw: c.lw });
    toon(g, ellipse(0, -r * 0.5, r * 1.5, r * 0.3), dark(col, 0.05), { sd: 0.6, hd: 0.4, lw: c.lw });
  },
  bandana(g, c, r) {
    const col = c.helmColor || '#a33a2a';
    toon(g, blob([[-r * 1.05, -r * 0.1], [-r * 0.85, -r * 0.95], [r * 0.4, -r * 1.12], [r * 1.02, -r * 0.4], [r * 0.6, -r * 0.35], [-r * 0.2, -r * 0.45]], 0.6), col, { sd: 1.1, hd: 0.6, lw: c.lw });
    toon(g, poly([[-r * 0.9, -r * 0.3], [-r * 1.8, r * 0.3], [-r * 1.5, r * 0.6], [-r * 0.85, 0]]), col, { sd: 0.6, hd: 0.3, lw: c.lw * 0.9 });
  },
  skullcap(g, c, r) {
    const col = c.helmColor || '#d9d0bd';
    toon(g, blob([[-r * 1.05, r * 0.1], [-r * 0.95, -r * 0.85], [r * 0.2, -r * 1.25], [r * 1.05, -r * 0.6], [r * 1.25, r * 0.15], [r * 0.85, r * 0.0], [r * 0.4, -r * 0.4], [-r * 0.3, -r * 0.2]], 0.6), col, { sd: 1.3, hd: 0.8, lw: c.lw });
    eye(g, r * 0.6, -r * 0.45, r * 0.13, { pupil: '#000' });
  },
};

// ---------------- weapons (drawn in hand-local coords, angle along forearm) ----------------
export const WEAPONS = {
  sword(g, c, len = 14) {
    const L = len * (c.wScale || 1);
    toon(g, rrect(-1.2, -2.8, 2.4, 5.6, 0.8), '#5a3a20', { sd: 0.4, hd: 0.3, lw: 1 });                // grip
    toon(g, rrect(-3.6, -3.4, 7.2, 1.8, 0.8), c.guard || '#c9a14a', { sd: 0.5, hd: 0.4, lw: 1 }); // guard
    const blade = poly([[-1.3, -3.4], [1.3, -3.4], [1.0, -L], [0, -L - 2.6], [-1.0, -L]]);
    toon(g, blade, c.blade || '#d6dde4', { sd: 0.9, hd: 0.7, lw: 1.1, light: '#ffffff' });
  },
  greatsword(g, c) { WEAPONS.sword(g, Object.assign({}, c, { wScale: 1.5 })); },
  spear(g, c, len = 26) {
    toon(g, rrect(-0.9, -len * 0.8, 1.8, len * 1.05, 0.9), '#7a5530', { sd: 0.5, hd: 0.3, lw: 1 });
    toon(g, poly([[-1.8, -len * 0.8], [0, -len * 0.8 - 7], [1.8, -len * 0.8]]), c.blade || '#cfd6dc', { sd: 0.6, hd: 0.5, lw: 1 });
  },
  pitchfork(g, c, len = 24) {
    toon(g, rrect(-0.9, -len * 0.8, 1.8, len * 1.05, 0.9), '#8a6538', { sd: 0.5, hd: 0.3, lw: 1 });
    for (const dx of [-2.2, 0, 2.2]) toon(g, rrect(dx - 0.5, -len * 0.8 - 5, 1, 6, 0.5), '#9aa3aa', { sd: 0.3, hd: 0.2, lw: 0.8 });
    toon(g, rrect(-2.8, -len * 0.8 - 0.5, 5.6, 1.4, 0.6), '#9aa3aa', { sd: 0.3, hd: 0.2, lw: 0.8 });
  },
  axe(g, c, len = 13) {
    toon(g, rrect(-1, -len, 2, len + 3, 1), '#6b4826', { sd: 0.5, hd: 0.3, lw: 1 });
    toon(g, blob([[0.5, -len + 1], [6, -len - 1.5], [7.5, -len + 3.5], [6, -len + 7.5], [0.5, -len + 5]], 0.5), c.blade || '#c9d0d6', { sd: 0.8, hd: 0.6, lw: 1.1 });
  },
  club(g, c, len = 13) {
    toon(g, blob([[-1.2, 2], [1.2, 2], [2.6, -len * 0.6], [3.2, -len], [0, -len - 2.5], [-3.0, -len], [-2.4, -len * 0.6]], 0.6), c.clubColor || '#8a5a30', { sd: 1, hd: 0.6, lw: 1.1 });
    if (c.spikes) for (let i = 0; i < 4; i++) flat(g, poly([[-2.6 + i * 1.8, -len + 1.5 - (i % 2) * 2], [-2 + i * 1.8, -len - 2 - (i % 2) * 2], [-1.6 + i * 1.8, -len + 1.5 - (i % 2) * 2]]), '#cfd6dc', 0.7);
  },
  mace(g, c, len = 12) {
    toon(g, rrect(-0.9, -len, 1.8, len + 3, 0.9), '#5c4632', { sd: 0.4, hd: 0.3, lw: 1 });
    toon(g, circle(0, -len - 1, 3.2), c.blade || '#b9c0c8', { sd: 0.8, hd: 0.6, lw: 1.1 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; flat(g, poly([[Math.cos(a) * 2.6, -len - 1 + Math.sin(a) * 2.6], [Math.cos(a) * 5, -len - 1 + Math.sin(a) * 5], [Math.cos(a + 0.4) * 2.6, -len - 1 + Math.sin(a + 0.4) * 2.6]]), '#d9dee4', 0.6); }
  },
  hammer(g, c, len = 14) {
    toon(g, rrect(-1, -len, 2, len + 3, 1), '#6b4826', { sd: 0.5, hd: 0.3, lw: 1 });
    toon(g, rrect(-5, -len - 4, 10, 6, 1.4), c.blade || '#9aa1a8', { sd: 1, hd: 0.7, lw: 1.1 });
    toon(g, rrect(-5.5, -len - 4.5, 2.4, 7, 0.8), '#c9a14a', { sd: 0.3, hd: 0.3, lw: 0.9 });
    toon(g, rrect(3.1, -len - 4.5, 2.4, 7, 0.8), '#c9a14a', { sd: 0.3, hd: 0.3, lw: 0.9 });
  },
  staff(g, c, len = 28) {
    toon(g, rrect(-1, -len * 0.75, 2, len, 1), c.staffColor || '#6b4a2a', { sd: 0.5, hd: 0.3, lw: 1 });
    const y = -len * 0.75 - 3;
    toon(g, blob([[-2.6, y + 3], [-3.2, y - 1], [0, y - 4], [3.2, y - 1], [2.6, y + 3]], 0.5), '#8a6a3a', { sd: 0.4, hd: 0.3, lw: 0.9 });
    toon(g, ellipse(0, y - 1.5, 2.6, 3.2), c.orb || '#7ad8ff', { sd: 0.6, hd: 0.8, lw: 0.9, light: '#ffffff' });
    if (c.orbGlow !== false) glow(g, 0, y - 1.5, 9, c.orb || '#7ad8ff', 0.55);
  },
  torch(g, c, len = 12) {
    toon(g, rrect(-1, -len, 2, len + 2, 1), '#6b4826', { sd: 0.5, hd: 0.3, lw: 1 });
    glow(g, 0, -len - 3, 10, '#ff9a2a', 0.7);
    flat(g, blob([[-2.4, -len], [-1.8, -len - 4], [0, -len - 8], [1.8, -len - 4], [2.4, -len]], 0.7), '#ffb43a', 0.8, '#7a2a08');
    flat(g, blob([[-1.2, -len], [0, -len - 5], [1.2, -len]], 0.7), '#fff2a0', 0);
  },
  dagger(g, c) {
    toon(g, rrect(-0.9, -2, 1.8, 4, 0.6), '#5a3a20', { sd: 0.3, hd: 0.2, lw: 0.9 });
    toon(g, poly([[-1, -2], [1, -2], [0, -9]]), c.blade || '#d6dde4', { sd: 0.5, hd: 0.4, lw: 0.9 });
  },
  bow(g, c, draw = 0) {
    // bow held vertically in far hand; string pulled by `draw`
    const h = 15 * (c.bowScale || 1);
    const bend = 4 + draw * 1.5;
    const bow = new Path2D(); bow.moveTo(-0.5, -h); bow.quadraticCurveTo(bend + 3, 0, -0.5, h);
    stroke(g, bow, OUT, 3.4); stroke(g, bow, c.bowColor || '#8a5a2a', 2);
    line(g, [[-0.5, -h], [-draw * 9 - 0.5, 0], [-0.5, h]], '#efe8d8', 0.7);
  },
  crossbow(g, c) {
    toon(g, rrect(-2, -1.6, 15, 3.2, 1), '#6b4826', { sd: 0.6, hd: 0.4, lw: 1 });
    const arms = new Path2D(); arms.moveTo(11, -8); arms.quadraticCurveTo(14, 0, 11, 8);
    stroke(g, arms, OUT, 3.2); stroke(g, arms, '#9aa1a8', 1.8);
    line(g, [[11, -8], [6, 0], [11, 8]], '#efe8d8', 0.6);
  },
  sling(g, c, t = 0) {
    const a = t * PI * 4;
    line(g, [[0, 0], [S(a) * 7, -C(a) * 7]], '#6b4a2a', 0.9);
    toon(g, circle(S(a) * 7, -C(a) * 7, 1.8), '#8a8378', { sd: 0.3, hd: 0.2, lw: 0.8 });
  },
  scythe(g, c, len = 26) {
    toon(g, rrect(-1, -len * 0.8, 2, len * 1.05, 1), '#4a3a2a', { sd: 0.5, hd: 0.3, lw: 1 });
    toon(g, blob([[0, -len * 0.8], [10, -len * 0.8 - 3], [17, -len * 0.75 + 2], [9, -len * 0.8 + 1], [0, -len * 0.75]], 0.5), c.blade || '#b8c0c8', { sd: 0.6, hd: 0.5, lw: 1.1 });
  },
  shovel(g, c, len = 20) {
    toon(g, rrect(-0.9, -len * 0.8, 1.8, len, 0.9), '#7a5530', { sd: 0.5, hd: 0.3, lw: 1 });
    toon(g, blob([[-3, -len * 0.8], [3, -len * 0.8], [3.2, -len * 0.8 - 6], [0, -len * 0.8 - 8], [-3.2, -len * 0.8 - 6]], 0.5), '#9aa1a8', { sd: 0.6, hd: 0.4, lw: 1 });
  },
  wand(g, c) {
    toon(g, rrect(-0.7, -10, 1.4, 12, 0.7), '#3a2a20', { sd: 0.3, hd: 0.2, lw: 0.9 });
    glow(g, 0, -10.5, 6, c.orb || '#ff7a3a', 0.8);
    flat(g, circle(0, -10.5, 1.3), '#fff4c0', 0);
  },
};

export const SHIELDS = {
  round(g, c, r = 7) {
    toon(g, circle(0, 0, r), c.shieldColor || '#8a5a2a', { sd: 1.5, hd: 1, lw: 1.3, detail: (q) => { q.strokeStyle = alpha('#000', 0.25); q.lineWidth = 0.8; for (let i = -2; i <= 2; i++) { q.beginPath(); q.moveTo(i * 2.6, -r); q.lineTo(i * 2.6, r); q.stroke(); } } });
    stroke(g, circle(0, 0, r - 1.1), c.shieldRim || '#8c9299', 1.4);
    toon(g, circle(0, 0, r * 0.3), c.shieldBoss || '#c9ced4', { sd: 0.5, hd: 0.4, lw: 1 });
  },
  kite(g, c, r = 8) {
    const p = blob([[-r * 0.85, -r * 0.95], [r * 0.85, -r * 0.95], [r * 0.8, r * 0.1], [0, r * 1.3], [-r * 0.8, r * 0.1]], 0.35);
    toon(g, p, c.shieldColor || '#2f5fa8', { sd: 1.6, hd: 1, lw: 1.3, detail: (q) => { if (c.shieldEmblem) c.shieldEmblem(q, 0, -r * 0.1, r); } });
    stroke(g, blob([[-r * 0.72, -r * 0.82], [r * 0.72, -r * 0.82], [r * 0.68, r * 0.08], [0, r * 1.12], [-r * 0.68, r * 0.08]], 0.35), c.shieldRim || '#d8b052', 1.1);
  },
  tower(g, c, r = 10) {
    toon(g, rrect(-r * 0.7, -r * 1.1, r * 1.4, r * 2.2, r * 0.25), c.shieldColor || '#6a6f78', { sd: 1.8, hd: 1, lw: 1.4, detail: (q) => { if (c.shieldEmblem) c.shieldEmblem(q, 0, -r * 0.1, r); } });
    stroke(g, rrect(-r * 0.58, -r * 0.98, r * 1.16, r * 1.96, r * 0.2), c.shieldRim || '#c9a14a', 1.1);
  },
  buckler(g, c, r = 4.5) {
    toon(g, circle(0, 0, r), c.shieldColor || '#9aa1a8', { sd: 1, hd: 0.8, lw: 1.1 });
    toon(g, circle(0, 0, r * 0.35), '#d8b052', { sd: 0.3, hd: 0.3, lw: 0.8 });
  },
};

// ---------------------------------------------------------------------------
function drawHumanoid(ctx, c, p) {
  const J = joints(c, p);
  ctx.save();
  if (p.alpha !== 1) ctx.globalAlpha *= p.alpha;
  if (p.rot) { ctx.rotate(p.rot); }
  if (c.cape) {
    const nk = J.neck, hp = J.hip;
    const sway = (p.lean || 0) * 6 + (p.capeSway || 0);
    const cape = blob([[nk[0] - 1, nk[1] + 1], [nk[0] - c.torsoW * 0.55, nk[1] + 3], [hp[0] - c.torsoW * 0.9 - sway, hp[1] + c.thigh * 0.9], [hp[0] - c.torsoW * 0.2 - sway * 0.6, hp[1] + c.thigh * 1.15], [hp[0], hp[1] - 2]], 0.6);
    toon(ctx, cape, c.cape, { sd: 1.8, hd: 0.8, lw: c.lw });
  }
  if (c.tail) c.tail(ctx, J, p);
  if (c.backItem) c.backItem(ctx, J, p);
  // far arm & its held item
  drawArm(ctx, c, J.fa, true);
  if (c.weapon2) holdItem(ctx, J.fa, c.weapon2Angle ?? 0, g => WEAPONS[c.weapon2](g, c));
  drawLeg(ctx, c, J.fl, true);
  drawLeg(ctx, c, J.nl, false);
  drawTorso(ctx, c, J, p);
  if (c.bow) holdItem(ctx, J.fa, (p.bowTilt ?? 0.08), g => { WEAPONS.bow(g, c, p.draw || 0); }, true);
  if (c.shield) {
    const h = J.fa.hd;
    ctx.save(); ctx.translate(h[0] + (c.shieldDx ?? 2), h[1] + (c.shieldDy ?? -1)); ctx.rotate(c.shieldRot ?? 0.05);
    SHIELDS[c.shield](ctx, c, c.shieldR);
    ctx.restore();
  }
  drawHead(ctx, c, J, p);
  if (c.weapon === 'crossbow') {
    const h = J.na.hd;
    ctx.save(); ctx.translate(h[0] - 3, h[1]); ctx.rotate(-0.05 + (p.aimAng || 0)); WEAPONS.crossbow(ctx, c); ctx.restore();
  }
  drawArm(ctx, c, J.na, false);
  if (c.weapon && c.weapon !== 'crossbow') {
    holdItem(ctx, J.na, (c.weaponAngle ?? 0.0) + (p.wAng || 0), g => WEAPONS[c.weapon](g, c, c.weaponLen));
    // redraw hand over grip
    toon(ctx, circle(J.na.hd[0], J.na.hd[1], c.limbR * 0.9), c.glove, { sd: 0.8, hd: 0.5, lw: c.lw });
  }
  if (c.front) c.front(ctx, J, p);
  ctx.restore();
  return J;
}

// item held in hand: local +y axis points along forearm; weapons are drawn pointing "up" (-y) so rotate
function holdItem(ctx, A, extra, fn, raw) {
  ctx.save();
  ctx.translate(A.hd[0], A.hd[1]);
  if (raw) ctx.rotate(extra); else ctx.rotate(-A.fa + PI / 2 + extra - PI / 2 + (PI / 2));
  fn(ctx);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Quadruped (wolves, hounds, sheep...). Body along x; feet at y=0.
// ---------------------------------------------------------------------------
export function quadruped(cfg) {
  const c = Object.assign({ len: 26, bodyH: 9, legLen: 9, headR: 5.5, color: '#8b8b8b', belly: null, lw: OL, tailLen: 9 }, cfg);
  return { cfg: c, draw(ctx, p) { drawQuad(ctx, c, p); } };
}
export const QPose = {
  idle(t) { const b = S(t * PI * 2); return { bob: b * 0.4, legs: [0, 0, 0, 0], head: b * 0.05, tail: b * 0.3, rot: 0, jaw: 0 }; },
  walk(t, run = false) {
    const ph = t * PI * 2, a = run ? 0.75 : 0.45;
    return { bob: -Math.abs(S(ph)) * (run ? 2.2 : 1) + (run ? 1 : 0.5), legs: [S(ph) * a, S(ph + PI) * a, S(ph + PI) * a * 0.9, S(ph) * a * 0.9], head: S(ph * 2) * 0.05 - (run ? 0.1 : 0), tail: S(ph) * 0.4, rot: run ? S(ph) * 0.06 : 0, stretch: run ? S(ph) * 1.5 : 0, jaw: 0 };
  },
  bite(t) { const s = Math.sin(seg(t, 0.3, 0.7) * PI); return { bob: -s, legs: [0.3 * s, -0.2 * s, 0.2 * s, -0.3 * s], head: 0.25 * s, tail: 0.5, rot: -0.12 * s, lunge: 4 * s, jaw: s }; },
  death(t) { const f = ease(seg(t, 0, 0.6)); return { bob: f * 4, legs: [0.8 * f, 0.6 * f, -0.6 * f, -0.8 * f], head: 0.4 * f, tail: -0.3, rot: 0, roll: f * 1.3, jaw: 0.6 * f, eyesClosed: t > 0.2 }; },
};
function drawQuad(ctx, c, p) {
  const L = c.len, H = c.legLen, BH = c.bodyH;
  ctx.save();
  if (p.roll) { ctx.translate(0, -H * 0.3); ctx.scale(1, 1 - p.roll * 0.35); ctx.translate(0, H * 0.3); }
  ctx.translate(p.lunge || 0, 0);
  ctx.rotate(p.rot || 0);
  const by = -H - BH * 0.35 + (p.bob || 0);
  const st = p.stretch || 0;
  const T = c.legThick || 1;
  const legCol = far => (far ? dark(c.legColor || c.color, 0.12) : (c.legColor || c.color));
  const front = (x, a, far) => {
    const sh = [x + st, by + BH * 0.05];
    const el = [sh[0] + S(a) * H * 0.55, sh[1] + C(a) * H * 0.55];
    const pw = [el[0] + S(a * 0.4 + 0.05) * H * 0.55, Math.min(0, el[1] + C(a * 0.4) * H * 0.55)];
    toon(ctx, capsule(sh[0], sh[1], el[0], el[1], 3.4 * T, 2.0 * T), legCol(far), { sd: 0.9, hd: 0.4, lw: c.lw });
    toon(ctx, capsule(el[0], el[1], pw[0], pw[1], 2.0 * T, 1.6 * T), legCol(far), { sd: 0.8, hd: 0.4, lw: c.lw });
    toon(ctx, ellipse(pw[0] + 1.2, pw[1] - 0.9, 2.5 * T, 1.5), c.paw || dark(legCol(far), 0.15), { sd: 0.4, hd: 0.3, lw: c.lw * 0.8 });
  };
  const hind = (x, a, far) => {
    const hp = [x - st, by - BH * 0.05];
    const kn = [hp[0] + S(a + 0.35) * H * 0.5, hp[1] + C(a + 0.35) * H * 0.5];
    const hk = [kn[0] + S(a - 0.55) * H * 0.42, kn[1] + C(a - 0.55) * H * 0.42];
    const pw = [hk[0] + S(a * 0.3 + 0.12) * H * 0.4, Math.min(0, hk[1] + H * 0.4)];
    toon(ctx, capsule(hp[0], hp[1], kn[0], kn[1], 4.2 * T, 2.4 * T), legCol(far), { sd: 1, hd: 0.5, lw: c.lw });
    toon(ctx, capsule(kn[0], kn[1], hk[0], hk[1], 2.3 * T, 1.7 * T), legCol(far), { sd: 0.8, hd: 0.4, lw: c.lw });
    toon(ctx, capsule(hk[0], hk[1], pw[0], pw[1], 1.7 * T, 1.5 * T), legCol(far), { sd: 0.8, hd: 0.4, lw: c.lw });
    toon(ctx, ellipse(pw[0] + 1.2, pw[1] - 0.9, 2.5 * T, 1.5), c.paw || dark(legCol(far), 0.15), { sd: 0.4, hd: 0.3, lw: c.lw * 0.8 });
  };
  front(L * 0.3, p.legs[1], true); hind(-L * 0.32, p.legs[2], true);
  if (c.legsUnder) { hind(-L * 0.28, p.legs[3], false); front(L * 0.36, p.legs[0], false); }
  if (c.tailLen > 0) {
    const ta = -0.7 + (p.tail || 0);
    const tb = [-L * 0.48, by - BH * 0.25];
    const te = [tb[0] - C(ta) * c.tailLen, tb[1] + S(ta) * c.tailLen * 0.9];
    const tm = [(tb[0] + te[0]) / 2 - 1, (tb[1] + te[1]) / 2 - 2];
    toon(ctx, blob([[tb[0], tb[1] - (c.tailR || 2.4)], [tm[0], tm[1] - (c.tailR || 2.4) * 1.1], [te[0], te[1]], [tm[0] + 1, tm[1] + (c.tailR || 2.4)], [tb[0] + 1, tb[1] + (c.tailR || 2.4)]], 0.7), c.tailColor || c.color, { sd: 0.9, hd: 0.5, lw: c.lw });
  }
  const body = blob([[-L * 0.52, by - BH * 0.2], [-L * 0.3, by - BH * 0.55], [L * 0.05, by - BH * 0.5], [L * 0.32, by - BH * 0.7], [L * 0.55, by - BH * 0.35], [L * 0.52, by + BH * 0.25], [L * 0.32, by + BH * 0.55], [L * 0.0, by + BH * 0.3], [-L * 0.3, by + BH * 0.4], [-L * 0.52, by + BH * 0.25]], 0.8);
  toon(ctx, body, c.color, { sd: 2, hd: 1.1, lw: c.lw, detail: g => {
    if (c.belly) { g.fillStyle = c.belly; g.beginPath(); g.ellipse(L * 0.1, by + BH * 0.42, L * 0.38, BH * 0.25, 0, 0, PI * 2); g.fill(); }
    if (c.fur) { g.strokeStyle = alpha('#000', 0.2); g.lineWidth = 0.8; for (let i = 0; i < 12; i++) { const x = -L * 0.42 + i * L * 0.075; g.beginPath(); g.moveTo(x, by - BH * 0.42); g.lineTo(x - 1.4, by - BH * 0.12); g.stroke(); } }
    if (c.bodyDetail) c.bodyDetail(g, L, by, c);
  } });
  if (c.mane) toon(ctx, blob([[L * 0.12, by - BH * 0.55], [L * 0.32, by - BH * 0.95], [L * 0.6, by - BH * 0.6], [L * 0.55, by + BH * 0.1], [L * 0.3, by - BH * 0.1]], 0.7), c.mane, { sd: 1.2, hd: 0.6, lw: c.lw });
  if (c.wool) {
    for (let i = 0; i < 9; i++) { const a = (i / 9) * PI * 2; toon(ctx, circle(Math.cos(a) * L * 0.36, by + Math.sin(a) * BH * 0.42 - 0.5, BH * 0.36), c.wool, { sd: 1, hd: 0.6, lw: c.lw }); }
    toon(ctx, ellipse(0, by - 0.5, L * 0.42, BH * 0.52), c.wool, { sd: 1.4, hd: 0.8, lw: 0 });
  }
  if (!c.legsUnder) { hind(-L * 0.28, p.legs[3], false); front(L * 0.36, p.legs[0], false); }
  const hx = L * 0.56 + (c.headDX || 0), hy = by - BH * 0.55 + (c.headDY || 0);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(p.head || 0);
  if (c.drawHead) c.drawHead(ctx, c, p);
  else {
    const r = c.headR;
    toon(ctx, poly([[-r * 0.5, -r * 0.6], [-r * 0.15, -r * 1.75], [r * 0.35, -r * 0.65]]), c.earColor || c.color, { sd: 0.6, hd: 0.4, lw: c.lw });
    const jaw = (p.jaw || 0) * 1.6;
    const head = blob([[-r * 0.9, r * 0.5], [-r * 0.8, -r * 0.6], [r * 0.2, -r * 0.85], [r * 0.9, -r * 0.45], [r * 1.9, -r * 0.15], [r * 2.15, r * 0.3], [r * 1.6, r * 0.55], [r * 0.6, r * 0.75 + jaw * 0.4], [-r * 0.3, r * 0.95]], 0.75);
    if (jaw > 0.4) { toon(ctx, blob([[r * 0.3, r * 0.55], [r * 1.9, r * 0.45 + jaw], [r * 1.6, r * 0.9 + jaw], [r * 0.4, r * 0.95]], 0.6), dark(c.headColor || c.color, 0.06), { sd: 0.5, hd: 0.3, lw: c.lw }); flat(ctx, poly([[r * 0.7, r * 0.5], [r * 1.9, r * 0.35], [r * 1.85, r * 0.45 + jaw * 0.9], [r * 0.8, r * 0.85]]), '#5a1414', 0.6); }
    toon(ctx, head, c.headColor || c.color, { sd: 1.4, hd: 0.8, lw: c.lw, detail: g => { if (c.muzzle) { g.fillStyle = c.muzzle; g.beginPath(); g.ellipse(r * 1.4, r * 0.35, r * 0.75, r * 0.32, 0, 0, PI * 2); g.fill(); } } });
    toon(ctx, ellipse(r * 2.08, r * 0.08, r * 0.3, r * 0.24), '#1a1210', { sd: 0, hd: 0.3, lw: 0.6 });
    if (p.eyesClosed) line(ctx, [[r * 0.45, -r * 0.25], [r * 0.95, -r * 0.18]], OUT, 1);
    else eye(ctx, r * 0.72, -r * 0.25, r * 0.22, c.eyeGlow ? { glow: c.eyeGlow } : { pupil: '#1a120c', squint: c.squint });
    if (c.fangs) { flat(ctx, poly([[r * 1.45, r * 0.5], [r * 1.55, r * 0.95], [r * 1.68, r * 0.5]]), '#fff6dc', 0.6); }
    if (c.horns) c.horns(ctx, r);
  }
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Flyer (bats, wisps, drakes): body + two wings flapping
// ---------------------------------------------------------------------------
export function flap(t) { return S(t * PI * 2); }
