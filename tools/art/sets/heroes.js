// Rampart Riot — hero sprites (original cast): Brannoc, Kaela, Seren, Torvald, Aerin (griffin rider), Ysolde
import { toon, flat, ellipse, circle, rrect, poly, blob, dark, light, mix, alpha, OUT, glow, line, stroke, rng, star, capsule } from '../lib/toon.js';
import { humanoid, Pose, basePose, ease, seg, WEAPONS } from '../lib/rig.js';

export const scale = 1.6;
const PI = Math.PI, S = Math.sin, C = Math.cos;
const lerp = (a, b, t) => a + (b - a) * t;

function crest(g, x, y, s = 1, col = '#f4ecd8') {
  g.save(); g.translate(x, y); g.scale(s, s);
  flat(g, poly([[-4, 5], [-4, -2], [-5, -2], [-5, -6], [-3, -6], [-3, -4], [-1, -4], [-1, -6], [1, -6], [1, -4], [3, -4], [3, -6], [5, -6], [5, -2], [4, -2], [4, 5]]), col, 0.6);
  g.restore();
}

// extra poses
export const HPose = {
  block(t) { // shield raised, braced
    const p = basePose(); const u = ease(seg(t, 0, 0.3)), r = ease(seg(t, 0.75, 1));
    const k = u * (1 - r);
    p.fa = [lerp(-0.1, 1.5, k), lerp(0.3, 0.9, k)]; p.na = [lerp(0.2, -0.6, k), lerp(0.4, 1.4, k)];
    p.lean = 0.12 * k; p.nl = [0.35 * k, 0.3 * k]; p.fl = [-0.35 * k, 0.2]; p.bob = -1.5 * k; return p;
  },
  slam(t) { // heavy overhead slam
    const p = basePose(); const w = ease(seg(t, 0, 0.45)), s = ease(seg(t, 0.45, 0.6)), r = ease(seg(t, 0.7, 1));
    let up = lerp(0.2, -2.9, w); up = lerp(up, 1.5, s); up = lerp(up, 0.2, r);
    p.na = [up, lerp(0.3, 0.1, s)]; p.fa = [lerp(-0.1, -2.6, w) * (1 - s) + 1.2 * s * (1 - r), 0.2];
    p.lean = lerp(0, -0.25, w) + s * 0.5 * (1 - r); p.bob = -w * 2 * (1 - s) + s * 3 * (1 - r);
    p.nl = [0.4 * s * (1 - r), 0.5 * s * (1 - r)]; p.fl = [-0.4 * s * (1 - r), 0.4 * s * (1 - r)]; return p;
  },
  skyshot(t) { // arrow volley into the sky
    const p = Pose.shoot(t); p.fa = [2.4, 0.05]; p.na = [2.2, 1.0 + (p.draw || 0)]; p.lean = -0.25; p.bowTilt = -0.9; return p;
  },
  invoke(t) { // both hands raised, staff high
    const p = basePose(); const u = ease(seg(t, 0, 0.4)), r = ease(seg(t, 0.75, 1)); const k = u * (1 - r);
    p.na = [lerp(0.2, 2.9, k), 0.2]; p.fa = [lerp(-0.1, 2.5, k), 0.4]; p.lean = -0.15 * k; p.bob = -2 * k + S(t * PI * 6) * 0.5 * k; p.tilt = -0.15 * k; return p;
  },
  lash(t) { // sweeping whip / horizontal swing
    const p = basePose(); const w = ease(seg(t, 0, 0.35)), s = ease(seg(t, 0.35, 0.55)), r = ease(seg(t, 0.65, 1));
    let a = lerp(0.3, -1.4, w); a = lerp(a, 1.9, s); a = lerp(a, 0.3, r);
    p.na = [a, 0.15]; p.lean = lerp(0, -0.15, w) + 0.3 * s * (1 - r); p.nl = [0.3 * s, 0.2]; p.fl = [-0.25 * s, 0.2]; return p;
  },
};

// ---------------- rigs ----------------
const brannoc = humanoid({ h: 50, headR: 7.8, skin: '#e2b088', hair: '#a8a29a', shirt: '#a8b0b8', torsoStyle: 'plate', tabard: '#2f5fa8', emblem: (g, x, y) => crest(g, x, y, 0.6),
  pants: '#6a7078', boots: '#4a4038', sleeve: '#a8b0b8', glove: '#5a4a3a', helmet: 'nasal', helmColor: '#b8c0c8', helmTrim: '#d8b052',
  beard: '#b8b2a8', beardLen: 1.35, mustache: '#c8c2b8', scar: true, weapon: 'sword', wScale: 1.25, shield: 'kite', shieldColor: '#2f5fa8', shieldR: 9.5,
  shieldEmblem: (g, x, y) => crest(g, x, y, 0.9), shieldRim: '#e2c25a', pauldron: '#b8c0c8', kneePad: '#b8c0c8', cape: '#2a4a8a', chest: 1.12, lw: 1.5, browColor: '#8a847c' });

const kaela = humanoid({ h: 48, headR: 7.2, torsoW: 8.6, skin: '#f0c49a', hair: '#9a4a24', hairFront: true, hairBack: true, shirt: '#6a4a2a', torsoStyle: 'tunic',
  pants: '#4a3a28', boots: '#3a2a1a', sleeve: '#4a6a32', glove: '#6a4a2a', bow: true, bowScale: 1.1, bowColor: '#7a4a1a', cape: '#3f6a2a', belt: '#4a2e18', lw: 1.5, nose: false, browColor: '#7a3a18',
  backItem: (g, J) => { const h = J.hip, n = J.neck; g.save(); g.translate((h[0] + n[0]) / 2 - 5, (h[1] + n[1]) / 2 - 2); g.rotate(-0.4); toon(g, rrect(-3, -10, 6, 18, 2), '#6a3a1a', { sd: 0.6, hd: 0.4, lw: 1.1 }); for (let i = 0; i < 3; i++) { line(g, [[-1.5 + i * 1.5, -10], [-1.5 + i * 1.5, -15]], '#d8d0c0', 1); } g.restore(); },
  headExtra: (g, c, r) => { toon(g, blob([[-r * 0.9, r * 0.2], [-r * 1.4, r * 0.9], [-r * 1.2, r * 1.9], [-r * 0.85, r * 1.0]], 0.6), c.hair, { sd: 0.6, hd: 0.3, lw: 1.1 }); } });

const seren = humanoid({ h: 46, headR: 7.4, torsoW: 8.4, skin: '#f2cca6', hair: '#2a2236', hairFront: true, hairBack: true, shirt: '#4a3a8a', torsoStyle: 'robe',
  pants: '#3a2e6a', boots: '#2a2238', sleeve: '#4a3a8a', glove: '#f2cca6', skirt: '#3e3078', helmet: 'circlet', helmColor: '#d8d0e0', gem: '#7ad0ff',
  weapon: 'staff', orb: '#7ad0ff', staffColor: '#5a4a3a', weaponAngle: -0.2, belt: '#b8a0e0', buckle: '#7ad0ff', lw: 1.5, nose: false, cape: '#2e2460', browColor: '#2a2236' });

const torvald = humanoid({ h: 40, headR: 8.2, torsoH: 12, torsoW: 13, thigh: 5.2, shin: 5, upper: 6.2, fore: 6, limbR: 3.2, legThick: 1.25, armThick: 1.25,
  skin: '#e0a07a', hair: '#c0582a', shirt: '#8a929a', torsoStyle: 'mail', pants: '#5a4030', boots: '#3a2a1a', sleeve: '#7a5a3a', glove: '#5a3a1e',
  beard: '#c0582a', beardLen: 2.0, mustache: '#d06a32', nose: 'big', helmet: 'kettle', helmColor: '#9a7a4a', weapon: 'hammer', wScale: 1.3, belt: '#3a2010', chest: 1.2, lw: 1.5,
  chestDetail: (g, w, h) => { g.fillStyle = '#6b4423'; g.beginPath(); g.moveTo(-w * 0.35, -h * 0.75); g.lineTo(w * 0.55, -h * 0.75); g.lineTo(w * 0.6, 1); g.lineTo(-w * 0.4, 1); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.8; g.stroke(); },
  headExtra: (g, c, r) => { toon(g, ellipse(r * 0.15, -r * 0.62, r * 0.36, r * 0.27), '#7ad0ff', { sd: 0, hd: 0.4, lw: 1 }); toon(g, ellipse(r * 0.75, -r * 0.62, r * 0.32, r * 0.25), '#7ad0ff', { sd: 0, hd: 0.4, lw: 1 }); line(g, [[-r * 0.95, -r * 0.6], [r * 0.0, -r * 0.62]], '#3a2a1a', 1.4); } });

const ysolde = humanoid({ h: 48, headR: 7.3, torsoW: 8.6, skin: '#a8a09c', hair: '#1e1618', hairFront: true, hairBack: true, shirt: '#2a1a1e', torsoStyle: 'robe',
  pants: '#3a1a1a', boots: '#1e1416', sleeve: '#7a1e14', glove: '#2a1a1e', skirt: '#8a2416', weapon: 'wand', orb: '#ff7a2a', belt: '#c8902a', buckle: '#ff9a3a', lw: 1.5, nose: false, cape: '#4a1410', eyeColor: '#c8401a', browColor: '#1a1214',
  chestDetail: (g, w, h) => { g.strokeStyle = 'rgba(255,140,50,0.95)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-w * 0.1, -h * 0.9); g.lineTo(w * 0.2, -h * 0.6); g.lineTo(0, -h * 0.35); g.stroke(); },
  headExtra: (g, c, r) => {
    // ember-red streaks in her black hair
    g.strokeStyle = '#b8281a'; g.lineWidth = 1.1; g.lineCap = 'round';
    for (const [x0, y0, x1, y1] of [[-r * 0.55, -r * 0.95, -r * 0.95, r * 0.15], [-r * 0.1, -r * 1.05, -r * 0.45, -r * 0.35]]) { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 - r * 0.15, (y0 + y1) / 2, x1, y1); g.stroke(); }
    g.strokeStyle = 'rgba(255,130,40,0.95)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(r * 0.2, r * 0.2); g.lineTo(r * 0.6, r * 0.55); g.stroke(); g.beginPath(); g.moveTo(r * 0.85, -r * 0.4); g.lineTo(r * 0.95, -r * 0.05); g.stroke(); } });

function whip(g, J, t) {
  const h = J.na.hd;
  const a = J.na.fa;
  const pts = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push([h[0] + S(a) * 30 * u + S(u * 6 + t * 12) * 3 * u, h[1] + C(a) * 30 * u + C(u * 5 + t * 10) * 2 * u]); }
  g.save(); g.globalCompositeOperation = 'lighter';
  stroke(g, poly(pts, false), 'rgba(255,120,30,0.5)', 5); stroke(g, poly(pts, false), 'rgba(255,220,120,0.95)', 1.8);
  g.restore();
}

// ---------------- Aerin & the griffin ----------------
function griffin(g, o) {
  const { flapA = 0, tilt = 0, dy = 0, lance = 0, rot = 0, fold = 0, beak = 0 } = o;
  g.save(); g.translate(0, -26 + dy); g.rotate(tilt + rot);
  const fur = '#c8954e', furD = '#9a6a32', feather = '#a87a3a', white = '#f4efe2';
  // far wing
  const wing = (front) => {
    const a = (front ? flapA : flapA * 0.9 + 0.15) * (1 - fold * 0.8);
    g.save(); g.translate(front ? 2 : 4, -10); g.rotate(-0.5 + a); g.scale(1, front ? 1 : 0.85);
    const col = front ? feather : dark(feather, 0.12);
    const w = blob([[0, 0], [-8, -12], [-20, -26], [-30, -30], [-28, -22], [-36, -18], [-30, -12], [-34, -6], [-24, -4], [-14, 2]], 0.6);
    toon(g, w, col, { sd: 1.6, hd: 1, lw: 1.3, detail: c => { c.fillStyle = front ? white : '#d8d2c4'; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(-24 - i * 3, -24 + i * 6, 6, 2.5, 0.7, 0, PI * 2); c.fill(); } c.strokeStyle = 'rgba(60,30,10,0.4)'; c.lineWidth = 0.8; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-6 - i * 4, -4 - i * 3); c.lineTo(-18 - i * 4, -20 + i * 2); c.stroke(); } } });
    g.restore();
  };
  wing(false);
  // tail
  toon(g, capsule(-18, -2, -32, 6, 2.6, 1.2), fur, { sd: 0.6, hd: 0.3, lw: 1.2 });
  toon(g, blob([[-34, 3], [-38, 9], [-30, 10], [-31, 6]], 0.6), furD, { sd: 0.4, hd: 0.2, lw: 1 });
  // hind legs tucked
  toon(g, capsule(-12, 4, -18, 12, 4, 2.6), furD, { sd: 0.8, hd: 0.4, lw: 1.2 });
  toon(g, capsule(-18, 12, -12, 16, 2.4, 2), furD, { sd: 0.6, hd: 0.3, lw: 1.1 });
  // body
  toon(g, blob([[-20, -2], [-14, -10], [2, -12], [14, -10], [18, -2], [12, 6], [-2, 8], [-16, 6]], 0.8), fur, { sd: 2, hd: 1.2, lw: 1.5, detail: c => { c.fillStyle = white; c.beginPath(); c.ellipse(13, -2, 7, 8, 0, 0, PI * 2); c.fill(); } });
  // front talons
  toon(g, capsule(10, 4, 16, 12, 2.6, 2), '#e0b04a', { sd: 0.5, hd: 0.3, lw: 1.1 });
  toon(g, capsule(16, 12, 22, 12, 2, 1.4), '#e0b04a', { sd: 0.4, hd: 0.2, lw: 1 });
  // rider
  const R = { skin: '#f0c49a' };
  g.save(); g.translate(-2, -12);
  toon(g, capsule(0, 0, -2, 8, 2.6, 2.4), '#6a5030', { sd: 0.5, hd: 0.3, lw: 1.1 }); // leg
  toon(g, blob([[-5, 2], [-5, -10], [3, -12], [5, -2], [3, 3]], 0.7), '#c8a032', { sd: 1, hd: 0.6, lw: 1.3, detail: c => { c.fillStyle = '#2f5fa8'; c.fillRect(-1, -11, 4, 14); } }); // torso
  toon(g, blob([[-4, -10], [-14, -8], [-12, -2], [-4, -4]], 0.6), '#2f5fa8', { sd: 0.6, hd: 0.3, lw: 1.1 }); // cape
  toon(g, circle(0, -16, 5), R.skin, { sd: 0.8, hd: 0.6, lw: 1.2 });
  // winged helm
  toon(g, blob([[-5, -16], [-4, -21], [1, -22.5], [5, -19], [5, -16]], 0.6), '#d8b84a', { sd: 0.6, hd: 0.5, lw: 1.1 });
  toon(g, blob([[-3, -19], [-10, -25], [-9, -20], [-4, -17]], 0.6), white, { sd: 0.4, hd: 0.3, lw: 1 });
  flat(g, circle(2.5, -16, 0.9), '#1a120c', 0);
  // lance arm
  g.save(); g.translate(2, -8); g.rotate(-0.25 + lance);
  toon(g, rrect(-12, -1.3, 44, 2.6, 1.2), '#7a5530', { sd: 0.4, hd: 0.3, lw: 1 });
  toon(g, poly([[32, -3], [42, 0], [32, 3]]), '#d6dde4', { sd: 0.4, hd: 0.4, lw: 1 });
  toon(g, poly([[22, -1.3], [26, -6], [28, -1.3]]), '#2f5fa8', { sd: 0, hd: 0, lw: 0.8 });
  g.restore();
  toon(g, circle(4, -7, 2), R.skin, { sd: 0.4, hd: 0.3, lw: 1 });
  g.restore();
  // eagle head
  g.save(); g.translate(18, -12); g.rotate(-0.1 + beak * 0.25);
  toon(g, blob([[-6, 4], [-5, -6], [2, -9], [8, -5], [9, 1], [3, 5]], 0.7), white, { sd: 1.2, hd: 0.8, lw: 1.3 });
  toon(g, blob([[6, -4], [14, -2], [15, 2], [11, 3], [7, 1]], 0.6), '#e8b030', { sd: 0.6, hd: 0.5, lw: 1.2 });
  toon(g, poly([[-3, -6], [-8, -12], [-1, -8]]), white, { sd: 0.4, hd: 0.3, lw: 1 });
  flat(g, circle(4, -4, 1.6), '#1a120c', 0.6); flat(g, circle(4.5, -4.5, 0.5), '#fff', 0);
  g.restore();
  wing(true);
  g.restore();
}

function anims(rig, o) {
  return {
    idle: { frames: 6, fps: 7, draw: (g, t) => { const J = rig.draw(g, Pose.idle(t)); } },
    walk: { frames: 8, fps: 13, draw: (g, t) => rig.draw(g, Pose.walk(t)) },
    attack: { frames: 8, fps: 13, loop: false, draw: (g, t) => { rig.draw(g, o.attack(t)); if (o.attackFx) o.attackFx(g, t, rig); } },
    special: { frames: 10, fps: 12, loop: false, draw: (g, t) => { rig.draw(g, o.special(t)); if (o.specialFx) o.specialFx(g, t, rig); } },
    death: { frames: 8, fps: 11, loop: false, draw: (g, t) => rig.draw(g, Pose.death(t)) },
  };
}

export function jobs() {
  const J = [];
  J.push({ name: 'h_brannoc', w: 96, h: 96, ax: 46, ay: 80, anims: anims(brannoc, { attack: Pose.melee, special: HPose.block, specialFx: (g, t) => { if (t > 0.2 && t < 0.8) glow(g, 8, -26, 30, '#6a9cff', 0.35); } }) });
  J.push({ name: 'h_kaela', w: 96, h: 96, ax: 46, ay: 80, anims: anims(kaela, { attack: Pose.shoot, special: HPose.skyshot }) });
  J.push({ name: 'h_seren', w: 96, h: 100, ax: 46, ay: 84, anims: anims(seren, { attack: Pose.cast, special: HPose.invoke, specialFx: (g, t) => { if (t > 0.25 && t < 0.85) { glow(g, 4, -60, 26, '#7ad0ff', 0.6); flat(g, star(4, -60, 6 + S(t * PI) * 4, 0.4, 6), '#e8f8ff', 0); } }, attackFx: (g, t) => { if (t > 0.45 && t < 0.7) glow(g, 18, -34, 16, '#7ad0ff', 0.7); } }) });
  J.push({ name: 'h_torvald', w: 96, h: 96, ax: 46, ay: 80, anims: anims(torvald, { attack: Pose.melee, special: HPose.slam, specialFx: (g, t) => { if (t > 0.55 && t < 0.85) { g.save(); g.globalAlpha = 1 - (t - 0.55) / 0.3; const r = new Path2D(); r.ellipse(14, 0, 10 + (t - 0.55) * 120, 4 + (t - 0.55) * 40, 0, 0, PI * 2); stroke(g, r, '#e8d2a6', 2.5); g.restore(); } } }) });
  J.push({ name: 'h_ysolde', w: 100, h: 96, ax: 46, ay: 80, anims: anims(ysolde, { attack: Pose.cast, special: HPose.lash,
    attackFx: (g, t) => { if (t > 0.45 && t < 0.7) glow(g, 18, -32, 16, '#ff7a2a', 0.7); },
    specialFx: (g, t, rig) => { if (t > 0.3 && t < 0.8) { const J2 = rig.joints(HPose.lash(t)); whip(g, J2, t); } } }) });
  // Aerin (flying)
  J.push({ name: 'h_aerin', w: 110, h: 90, ax: 50, ay: 62, anims: {
    idle: { frames: 8, fps: 10, draw: (g, t) => griffin(g, { flapA: S(t * PI * 2) * 0.7, dy: S(t * PI * 2 + 1) * 1.5 }) },
    walk: { frames: 8, fps: 12, draw: (g, t) => griffin(g, { flapA: S(t * PI * 2) * 0.9, tilt: 0.1, dy: S(t * PI * 2 + 1) * 2 }) },
    attack: { frames: 8, fps: 14, loop: false, draw: (g, t) => { const d = S(t * PI); griffin(g, { flapA: -0.6 + d * 0.3, tilt: 0.45 * d, dy: 14 * d, lance: 0.35 * d, beak: d }); } },
    special: { frames: 10, fps: 12, loop: false, draw: (g, t) => { const d = S(t * PI); griffin(g, { flapA: S(t * PI * 4) * 1.1, tilt: -0.2 * d, dy: -4 * d, beak: d }); } },
    death: { frames: 8, fps: 10, loop: false, draw: (g, t) => griffin(g, { flapA: 0.3, rot: t * 1.2, dy: t * 24, fold: t }) },
  } });
  return J;
}
