// Rampart Riot — Chapter I enemies (original bestiary): the Ashen vanguard
import { toon, flat, ellipse, circle, rrect, poly, blob, dark, light, mix, alpha, OUT, glow, line, stroke, rng, star, capsule, eye } from '../lib/toon.js';
import { humanoid, quadruped, Pose, QPose, basePose, ease, seg } from '../lib/rig.js';

export const scale = 1.5;
const PI = Math.PI, S = Math.sin, C = Math.cos;
const lerp = (a, b, t) => a + (b - a) * t;
const ASH = '#7a746c', ASH_D = '#5a544e', EMBER = '#ff8a2a';

function cracks(g, pts, w = 1) {
  g.save(); g.globalCompositeOperation = 'lighter';
  stroke(g, poly(pts, false), alpha('#ff7a20', 0.45), 2.6 * w);
  stroke(g, poly(pts, false), '#ffb050', 1.0 * w);
  g.restore();
}
const grimBase = { h: 34, headR: 8.4, torsoH: 9, torsoW: 9, thigh: 5.2, shin: 5, upper: 6.2, fore: 6, limbR: 2.6, skin: ASH, bareArms: true, sleeve: ASH, ears: 'long', eyeGlow: EMBER, eyeCore: '#fff2b0', mouth: 'fangs', nose: 'big', feet: 'claw', boots: ASH_D, pants: '#4a3a2a', belt: '#3a2a1a', brow: false, lw: 1.4,
  headExtra: (g, c, r) => cracks(g, [[-r * 0.6, -r * 0.6], [-r * 0.2, -r * 0.2], [-r * 0.35, r * 0.3]], 0.8) };

const RIG = {
  grimling: humanoid(Object.assign({}, grimBase, { shirt: '#6b5135', torsoStyle: 'rags', weapon: 'club', clubColor: '#7a5030',
    chestDetail: (g, w, h) => { g.fillStyle = 'rgba(40,25,15,0.25)'; g.fillRect(-w, -h * 0.4, w * 2, 2); } })),
  slinger: humanoid(Object.assign({}, grimBase, { shirt: '#5a6a3a', torsoStyle: 'rags', helmet: 'bandana', helmColor: '#8a3a2a', weapon: 'sling',
    backItem: (g, J) => { toon(g, ellipse(J.hip[0] - 5, J.hip[1] - 2, 4, 3.4), '#7a5a3a', { sd: 0.6, hd: 0.3, lw: 1 }); } })),
  shieldbearer: humanoid(Object.assign({}, grimBase, { shirt: '#6a5a4a', torsoStyle: 'rags', helmet: 'kettle', helmColor: '#8a7a68', weapon: 'spear', weaponLen: 20, shield: 'tower', shieldR: 9.5, shieldColor: '#8a6a4a', shieldRim: '#5a5a62',
    shieldEmblem: (g, x, y, r) => { g.fillStyle = '#7a7a82'; g.fillRect(x - r * 0.6, y - r * 0.6, r * 0.7, r * 0.5); g.fillStyle = '#6a5a4a'; g.fillRect(x - r * 0.1, y + r * 0.2, r * 0.6, r * 0.5); g.strokeStyle = '#3a3a40'; g.lineWidth = 0.8; for (const [a, b] of [[-0.4, -0.5], [0.3, 0.4], [-0.5, 0.5]]) { g.beginPath(); g.arc(x + a * r, y + b * r, 0.7, 0, PI * 2); g.stroke(); } } })),
  shaman: humanoid(Object.assign({}, grimBase, { h: 37, shirt: '#5a3a5a', torsoStyle: 'robe', skirt: '#4a2e4a', weapon: 'staff', orb: '#ff9a3a', staffColor: '#d8ccb0', weaponAngle: -0.15,
    helmet: 'skullcap', helmColor: '#e0d6c0', headExtra: (g, c, r) => { for (let i = 0; i < 3; i++) toon(g, poly([[-r * 0.6 + i * r * 0.4, -r * 1.0], [-r * 0.9 + i * r * 0.45, -r * 2.0 + i * 0.4], [-r * 0.4 + i * r * 0.4, -r * 1.05]]), ['#c0392b', '#e8b030', '#3a8a5a'][i], { sd: 0.4, hd: 0.3, lw: 1 }); } })),
  brute: humanoid({ h: 64, headR: 9.2, torsoH: 24, torsoW: 22, belly: 4, thigh: 9.5, shin: 8.5, upper: 11, fore: 11, limbR: 5, legThick: 1.25, armThick: 1.4,
    skin: '#8a837a', bareArms: true, sleeve: '#8a837a', shirt: '#8a837a', torsoStyle: 'bare', pants: '#5a4030', boots: '#6a645c', feet: 'claw', skirt: '#6b4a2a', belt: '#3a2a1a',
    eyeGlow: EMBER, squint: true, tusks: true, mouth: 'grin', nose: 'big', ears: 'round', brow: true, browColor: '#3a3530', angry: true, weapon: 'club', clubColor: '#8a8478', spikes: true, weaponLen: 18, wScale: 1.6, chest: 1.1, lw: 1.7,
    chestDetail: (g, w, h) => { cracks(g, [[-w * 0.3, -h * 0.9], [-w * 0.05, -h * 0.6], [-w * 0.25, -h * 0.35], [w * 0.05, -h * 0.1]]); cracks(g, [[w * 0.3, -h * 0.8], [w * 0.45, -h * 0.5]]); } }),
};

// cinder hound
const hound = quadruped({ len: 30, bodyH: 10, legLen: 9.5, headR: 5.8, color: '#3a3532', belly: '#4a4440', fangs: true, eyeGlow: EMBER, tailLen: 10, tailColor: '#ff8a2a', muzzle: '#2a2624',
  bodyDetail: (g, L, by) => { cracks(g, [[-L * 0.3, by - 4], [-L * 0.05, by], [L * 0.15, by - 5], [L * 0.35, by - 1]]); },
  mane: '#e8622a' });

// ash wisp (flying)
function wisp(g, t, o = {}) {
  const f = S(t * PI * 2);
  const y = -10 + f * 2;
  g.save();
  if (o.die) { g.globalAlpha = 1 - o.die; g.translate(0, o.die * 8); g.scale(1 + o.die * 0.6, 1 - o.die * 0.5); }
  glow(g, 0, y, 30, '#ff8a2a', 0.45);
  // tail flames
  for (let i = 3; i >= 0; i--) {
    const k = i / 3;
    const tx = -8 - i * 6, ty = y + 2 + S(t * PI * 4 + i) * 3;
    flat(g, ellipse(tx, ty, 7 - i * 1.2, 5 - i), mix('#ffb040', '#7a5a4a', k), 0);
  }
  const body = blob([[-10, y + 6], [-12, y - 4], [-6, y - 12], [2, y - 14 + f], [10, y - 8], [12, y + 2], [6, y + 9], [-4, y + 10]], 0.8);
  toon(g, body, '#ffa040', { sd: 2.5, hd: 1.5, lw: 1.4, outline: '#5a1e08', light: '#fff2b0', shade: '#e0582a' });
  flat(g, ellipse(1, y - 3, 6, 6), 'rgba(255,240,180,0.85)', 0);
  // face
  eye(g, 1, y - 3, 1.6, { glow: '#ffffff' }); eye(g, 6, y - 2.5, 1.4, { glow: '#ffffff' });
  flat(g, ellipse(4, y + 2.5, 2.4, 1.3 + (o.attack ? 1 : 0)), '#5a1e08', 0);
  g.restore();
}

// Gorrath the Wall-Breaker — boss
const gorrath = humanoid({ h: 150, headR: 17, torsoH: 52, torsoW: 46, belly: 8, thigh: 22, shin: 20, upper: 24, fore: 24, limbR: 10, legThick: 1.3, armThick: 1.45,
  skin: '#7e776e', bareArms: true, sleeve: '#7e776e', shirt: '#7e776e', torsoStyle: 'bare', pants: '#4a3a2a', boots: '#5a544c', feet: 'claw', skirt: '#5a3a24', belt: '#2a1e14', buckle: '#8a8a92',
  eyeGlow: EMBER, squint: true, tusks: true, mouth: 'grin', nose: 'big', ears: 'round', angry: true, brow: true, browColor: '#3a3530', twoEyes: true,
  headExtra: (g, c, r) => { for (const [x, y, a] of [[-r * 0.5, -r * 0.85, -0.6], [r * 0.1, -r * 1.0, -0.1], [r * 0.6, -r * 0.8, 0.4]]) { g.save(); g.translate(x, y); g.rotate(a); toon(g, poly([[-r * 0.16, 0], [0, -r * 0.7], [r * 0.16, 0]]), '#5d6168', { sd: 0.6, hd: 0.5, lw: 1.6 }); g.restore(); } toon(g, rrect(-r * 0.9, -r * 0.95, r * 1.8, r * 0.3, r * 0.1), '#4a4d54', { sd: 0.6, hd: 0.4, lw: 1.6 }); cracks(g, [[-r * 0.5, -r * 0.4], [-r * 0.1, 0], [-r * 0.3, r * 0.4]], 1.4); },
  chest: 1.15, lw: 2.2,
  chestDetail: (g, w, h) => {
    cracks(g, [[-w * 0.3, -h * 0.9], [-w * 0.05, -h * 0.65], [-w * 0.3, -h * 0.4], [-w * 0.05, -h * 0.15]], 1.6);
    cracks(g, [[w * 0.25, -h * 0.85], [w * 0.45, -h * 0.55], [w * 0.3, -h * 0.3]], 1.4);
    g.strokeStyle = '#3a3a40'; g.lineWidth = 3; g.beginPath(); g.moveTo(-w * 0.6, -h * 0.95); g.lineTo(w * 0.6, -h * 0.2); g.stroke();
    g.strokeStyle = '#8a8a92'; g.lineWidth = 1.4; g.stroke();
  },
  front: (g, J, p) => {
    // battering ram strapped to the near forearm
    const A = J.na;
    g.save(); g.translate(A.hd[0], A.hd[1]); g.rotate(-A.fa + PI / 2 + 0.0);
    toon(g, rrect(-16, -9, 70, 18, 8), '#7a5030', { sd: 3, hd: 1.6, lw: 2, detail: c => { c.strokeStyle = 'rgba(40,20,8,0.45)'; c.lineWidth = 1.2; for (let y = -6; y < 9; y += 4) { c.beginPath(); c.moveTo(-14, y); c.lineTo(52, y + 1); c.stroke(); } } });
    for (const x of [0, 26]) toon(g, rrect(x - 3, -11, 6, 22, 2), '#4a4d54', { sd: 0.8, hd: 0.6, lw: 1.4 });
    toon(g, blob([[50, -13], [66, -10], [74, 0], [66, 10], [50, 13]], 0.5), '#5d6168', { sd: 2, hd: 1.4, lw: 2, light: '#a8acb4' });
    toon(g, blob([[64, -6], [76, -3], [78, 0], [76, 3], [64, 6]], 0.5), '#8a8e96', { sd: 0.8, hd: 0.8, lw: 1.5 });
    g.restore();
  } });

const PO = {
  stomp(t) { const p = basePose(); const u = ease(seg(t, 0, 0.45)), d = ease(seg(t, 0.45, 0.6)), r = ease(seg(t, 0.7, 1)); p.nl = [lerp(0.05, 0.9, u) * (1 - d) + 0.05 * d, lerp(0.05, 1.2, u) * (1 - d)]; p.lean = -0.15 * u * (1 - d) + 0.15 * d * (1 - r); p.bob = -3 * u * (1 - d) + 2 * d * (1 - r); p.na = [lerp(0.2, -0.6, u) * (1 - d) + 0.6 * d, 0.6]; p.fa = [lerp(-0.1, 0.6, u), 0.4]; return p; },
  roar(t) { const p = basePose(); const u = ease(seg(t, 0, 0.3)), r = ease(seg(t, 0.8, 1)); const k = u * (1 - r); p.lean = -0.25 * k; p.tilt = -0.35 * k; p.na = [lerp(0.2, 1.8, k), 0.5]; p.fa = [lerp(-0.1, 1.6, k), 0.5]; p.bob = -1.5 * k + S(t * PI * 10) * 0.6 * k; return p; },
  heal(t) { const p = Pose.cast(t); return p; },
};

function hanims(rig, o = {}) {
  return {
    walk: { frames: 8, fps: o.walkFps || 12, draw: (g, t) => rig.draw(g, Pose.walk(t, o.walk)) },
    idle: { frames: 4, fps: 6, draw: (g, t) => rig.draw(g, Pose.idle(t)) },
    attack: { frames: 7, fps: o.atkFps || 12, loop: false, draw: (g, t) => rig.draw(g, (o.attack || Pose.melee)(t)) },
    death: { frames: 8, fps: 12, loop: false, draw: (g, t) => rig.draw(g, Pose.death(t, { forward: o.fallForward })) },
    ...(o.special ? { special: { frames: 8, fps: 10, loop: false, draw: (g, t) => { rig.draw(g, o.special(t)); if (o.specialFx) o.specialFx(g, t); } } } : {}),
  };
}

export function jobs() {
  const J = [];
  J.push({ name: 'e_grimling', w: 70, h: 64, ax: 34, ay: 56, anims: hanims(RIG.grimling, { walk: { stride: 0.7, arm: 0.7, lean: 0.2 } }) });
  J.push({ name: 'e_slinger', w: 70, h: 64, ax: 34, ay: 56, anims: hanims(RIG.slinger, { walk: { stride: 0.7, lean: 0.18 }, attack: Pose.throw }) });
  J.push({ name: 'e_shieldbearer', w: 74, h: 68, ax: 36, ay: 58, anims: hanims(RIG.shieldbearer, { walk: { stride: 0.55, lean: 0.12 }, attack: Pose.thrust }) });
  J.push({ name: 'e_shaman', w: 76, h: 76, ax: 36, ay: 62, anims: hanims(RIG.shaman, { walk: { stride: 0.55, lean: 0.12 }, attack: Pose.melee, special: PO.heal, specialFx: (g, t) => { if (t > 0.3 && t < 0.85) glow(g, 6, -48, 22, '#7aff6a', 0.6); } }) });
  J.push({ name: 'e_brute', w: 110, h: 110, ax: 52, ay: 94, anims: hanims(RIG.brute, { walkFps: 9, walk: { stride: 0.45, bobAmp: 2.4, lean: 0.12 }, atkFps: 10, fallForward: true }) });
  J.push({ name: 'e_hound', w: 80, h: 56, ax: 38, ay: 48, anims: {
    walk: { frames: 8, fps: 16, draw: (g, t) => hound.draw(g, QPose.walk(t, true)) },
    idle: { frames: 4, fps: 6, draw: (g, t) => hound.draw(g, QPose.idle(t)) },
    attack: { frames: 6, fps: 12, loop: false, draw: (g, t) => hound.draw(g, QPose.bite(t)) },
    death: { frames: 6, fps: 10, loop: false, draw: (g, t) => hound.draw(g, QPose.death(t)) },
  } });
  J.push({ name: 'e_wisp', w: 76, h: 60, ax: 38, ay: 40, anims: {
    walk: { frames: 8, fps: 12, draw: (g, t) => wisp(g, t) },
    idle: { frames: 8, fps: 12, draw: (g, t) => wisp(g, t) },
    death: { frames: 6, fps: 12, loop: false, draw: (g, t) => wisp(g, t, { die: t }) },
  } });
  J.push({ name: 'e_boss_gorrath', w: 300, h: 260, ax: 120, ay: 226, scale: 1.25, anims: hanims(gorrath, {
    walkFps: 7, walk: { stride: 0.35, bobAmp: 3.5, lean: 0.1, arm: 0.3 }, atkFps: 9, fallForward: true,
    attack: (t) => { const p = Pose.melee(t); p.na[0] = lerp(0.3, p.na[0], 0.8); return p; },
    special: PO.stomp,
  }) });
  return J;
}
