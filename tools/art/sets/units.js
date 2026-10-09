// Rampart Riot — allied unit sprites: barracks soldiers, reinforcements, pack wolves, summons, sheep
import { toon, flat, ellipse, circle, rrect, poly, blob, dark, light, alpha, OUT, glow, line, stroke, rng } from '../lib/toon.js';
import { humanoid, quadruped, Pose, QPose } from '../lib/rig.js';
import { sheepRig } from '../lib/critters.js';

export const scale = 1.5;
const PI = Math.PI;

function crest(g, x, y, s = 1, col = '#f4ecd8') {
  g.save(); g.translate(x, y); g.scale(s, s);
  flat(g, poly([[-4, 5], [-4, -2], [-5, -2], [-5, -6], [-3, -6], [-3, -4], [-1, -4], [-1, -6], [1, -6], [1, -4], [3, -4], [3, -6], [5, -6], [5, -2], [4, -2], [4, 5]]), col, 0.6);
  g.restore();
}

export const RIGS = {
  militia: humanoid({ h: 42, skin: '#f0c49a', hair: '#6b4123', shirt: '#9a5a32', torsoStyle: 'tunic', pants: '#5d4a36', boots: '#3a2718', helmet: 'kettle', helmColor: '#98a0a8', weapon: 'sword', shield: 'round', shieldColor: '#a0682e', shieldR: 6.5, belt: '#4a2e18', sleeve: '#7a5a3e', lw: 1.5 }),
  footman: humanoid({ h: 43, skin: '#ecc096', hair: '#4a2e18', shirt: '#9aa1a8', torsoStyle: 'mail', tabard: '#b03a2a', emblem: (g, x, y) => crest(g, x, y, 0.55), pants: '#5a4a3a', boots: '#3a2a1c', helmet: 'nasal', helmColor: '#a8b0b8', weapon: 'sword', shield: 'kite', shieldColor: '#b03a2a', shieldR: 7.5, shieldEmblem: (g, x, y) => crest(g, x, y, 0.6), sleeve: '#8a929a', glove: '#5a4a3a', belt: '#4a2e18', lw: 1.5 }),
  knight: humanoid({ h: 45, skin: '#e9bf96', shirt: '#aab2ba', torsoStyle: 'plate', tabard: '#b03a2a', emblem: (g, x, y) => crest(g, x, y, 0.55), pants: '#8a929a', boots: '#5a6068', sleeve: '#aab2ba', glove: '#6a7078', helmet: 'great', helmColor: '#c0c7ce', plume: '#c0392b', helmTrim: '#d8b052', weapon: 'sword', shield: 'kite', shieldColor: '#b03a2a', shieldR: 8, shieldEmblem: (g, x, y) => crest(g, x, y, 0.7), pauldron: '#b8bfc6', kneePad: '#b8bfc6', lw: 1.5 }),
  bastion: humanoid({ h: 47, skin: '#e9bf96', shirt: '#8aa0bc', torsoStyle: 'plate', tabard: '#2f5fa8', emblem: (g, x, y) => crest(g, x, y, 0.6), pants: '#6a7c94', boots: '#4a5468', sleeve: '#8aa0bc', glove: '#4a5468', helmet: 'great', helmColor: '#a8bcd4', plume: '#2f5fa8', helmTrim: '#e2c25a', weapon: 'mace', shield: 'tower', shieldColor: '#2f5fa8', shieldR: 10, shieldEmblem: (g, x, y) => crest(g, x, y, 0.9), shieldRim: '#e2c25a', pauldron: '#9ab0c8', kneePad: '#9ab0c8', chest: 1.15, lw: 1.5 }),
  wolfguard: humanoid({ h: 46, skin: '#e4b48a', hair: '#8a4a1a', shirt: '#7a3a22', torsoStyle: 'fur', pants: '#4a3a2a', boots: '#3a2a1a', bareArms: true, sleeve: '#e4b48a', helmet: 'wolf', weapon: 'axe', wScale: 1.4, beard: '#8a4a1a', beardLen: 1.3, belt: '#3a2010', cape: '#8c8478', chest: 1.15, lw: 1.5, scar: true }),
  levy: humanoid({ h: 41, skin: '#f0c49a', hair: '#8a5a2a', shirt: '#a89870', torsoStyle: 'tunic', pants: '#6a5a40', boots: '#4a3a24', helmet: 'bandana', helmColor: '#6a7a3a', weapon: 'pitchfork', weaponAngle: 0.15, belt: '#5a3a1a', sleeve: '#8a7a58', lw: 1.5 }),
  veteran: humanoid({ h: 42, skin: '#ecc096', hair: '#5a3a1a', shirt: '#6a7a8a', torsoStyle: 'mail', pants: '#5a4a3a', boots: '#3a2a1c', helmet: 'kettle', helmColor: '#9aa2aa', weapon: 'spear', weaponAngle: 0.1, shield: 'round', shieldColor: '#3a6fc4', shieldR: 6.5, belt: '#4a2e18', sleeve: '#5a6a7a', lw: 1.5 }),
};

const stoneGuard = humanoid({ h: 64, headR: 9, torsoH: 22, torsoW: 22, thigh: 10, shin: 9, upper: 11, fore: 11, limbR: 5.5, legThick: 1.3, armThick: 1.4,
  skin: '#8a8a92', shirt: '#7a7a84', torsoStyle: 'plate', pants: '#6e6e78', boots: '#5e5e68', sleeve: '#7a7a84', glove: '#8a8a92', bareArms: true, foreColor: '#8a8a92',
  eyeGlow: '#6ad0ff', mouth: 'none', brow: false, belt: null, chest: 1.3, lw: 1.7,
  chestDetail: (g, w, h) => { g.strokeStyle = 'rgba(120,220,255,0.9)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-w * 0.2, -h * 0.8); g.lineTo(w * 0.1, -h * 0.55); g.lineTo(-w * 0.1, -h * 0.3); g.lineTo(w * 0.2, -h * 0.1); g.stroke(); } });

const packwolf = quadruped({ len: 31, bodyH: 11, legLen: 10.5, headR: 6, color: '#8a7a68', belly: '#cbbfae', fur: true, fangs: true, muzzle: '#b8aa96', bodyDetail: (g, L, by) => { g.fillStyle = '#b03a2a'; g.fillRect(L * 0.32, by - 9, 5, 9); } });
const sheep = sheepRig();

function humanAnims(rig, o = {}) {
  return {
    idle: { frames: 6, fps: 7, draw: (g, t) => rig.draw(g, Pose.idle(t)) },
    walk: { frames: 8, fps: 13, draw: (g, t) => rig.draw(g, Pose.walk(t)) },
    attack: { frames: 7, fps: 12, loop: false, draw: (g, t) => rig.draw(g, (o.attack || Pose.melee)(t)) },
    death: { frames: 8, fps: 12, loop: false, draw: (g, t) => rig.draw(g, Pose.death(t)) },
  };
}

export function jobs() {
  const J = [];
  for (const [k, rig] of Object.entries(RIGS)) {
    const thrust = k === 'levy' || k === 'veteran';
    J.push({ name: 's_' + k, w: 84, h: 84, ax: 40, ay: 70, anims: humanAnims(rig, { attack: thrust ? Pose.thrust : Pose.melee }) });
  }
  J.push({ name: 's_stoneguard', w: 120, h: 120, ax: 58, ay: 104, anims: Object.assign(humanAnims(stoneGuard), { attack: { frames: 7, fps: 10, loop: false, draw: (g, t) => stoneGuard.draw(g, Pose.melee(t)) } }) });
  J.push({ name: 's_packwolf', w: 84, h: 62, ax: 40, ay: 52, anims: {
    idle: { frames: 6, fps: 7, draw: (g, t) => packwolf.draw(g, QPose.idle(t)) },
    walk: { frames: 8, fps: 14, draw: (g, t) => packwolf.draw(g, QPose.walk(t, true)) },
    attack: { frames: 6, fps: 12, loop: false, draw: (g, t) => packwolf.draw(g, QPose.bite(t)) },
    death: { frames: 6, fps: 10, loop: false, draw: (g, t) => packwolf.draw(g, QPose.death(t)) },
  } });
  J.push({ name: 'sheep', w: 70, h: 54, ax: 30, ay: 44, anims: {
    walk: { frames: 8, fps: 10, draw: (g, t) => sheep.draw(g, QPose.walk(t)) },
    idle: { frames: 4, fps: 4, draw: (g, t) => sheep.draw(g, QPose.idle(t)) },
  } });
  return J;
}
