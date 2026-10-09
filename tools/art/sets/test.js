// quick visual test of the rig
import { humanoid, Pose, quadruped, QPose } from '../lib/rig.js';
export const scale = 3;

const militia = humanoid({ h: 44, skin: '#f1c7a0', hair: '#6b4123', shirt: '#9b3b2a', torsoStyle: 'tunic', tabard: null, pants: '#5d4a36', boots: '#3a2718', helmet: 'kettle', helmColor: '#9ea6ad', weapon: 'sword', shield: 'round', shieldColor: '#a0682e', belt: '#4a2e18', sleeve: '#7a5a3e' });
const knight = humanoid({ h: 46, skin: '#e9bf96', shirt: '#9aa3ad', torsoStyle: 'plate', tabard: '#2f5fa8', pants: '#7f8891', boots: '#565d66', sleeve: '#9aa3ad', glove: '#6c737c', helmet: 'great', helmColor: '#bfc6ce', plume: '#3a6fc4', helmTrim: '#d8b052', weapon: 'sword', shield: 'kite', shieldColor: '#2f5fa8', pauldron: '#b5bcc4', kneePad: '#b5bcc4' });
const grimling = humanoid({ h: 34, headR: 8.4, torsoH: 9, torsoW: 9, thigh: 5.2, shin: 5, upper: 6.2, fore: 6, skin: '#5e6b4f', shirt: '#6b5135', torsoStyle: 'rags', pants: '#4a3a2a', boots: '#3b4a33', bareArms: true, sleeve: '#5e6b4f', ears: 'long', eyeGlow: '#ff8a2a', mouth: 'fangs', nose: 'big', weapon: 'club', feet: 'claw', claws: false, belt: '#3a2a1a', brow: false });
const archer = humanoid({ h: 44, skin: '#f1c7a0', hair: '#4a2a12', shirt: '#4e7a37', pants: '#5a4a32', boots: '#4a3220', helmet: 'cap', helmColor: '#3f6a2a', feather: '#e8e0c8', bow: true, belt: '#4a2e18', sleeve: '#6a5236', glove: '#7a5a3a' });
const wolf = quadruped({ len: 30, bodyH: 11, legLen: 10, headR: 5.8, color: '#8d8a86', belly: '#c9c2b6', fur: true, fangs: true });

function anims(rig, extra = {}) {
  return {
    idle: { frames: 6, fps: 8, draw: (g, t) => rig.draw(g, Pose.idle(t)) },
    walk: { frames: 8, fps: 12, draw: (g, t) => rig.draw(g, Pose.walk(t)) },
    attack: { frames: 7, fps: 12, loop: false, draw: (g, t) => rig.draw(g, (extra.attack || Pose.melee)(t)) },
    death: { frames: 8, fps: 12, loop: false, draw: (g, t) => rig.draw(g, Pose.death(t)) },
  };
}
export function jobs() {
  return [
    { name: 'militia', w: 80, h: 80, ax: 40, ay: 66, anims: anims(militia) },
    { name: 'knight', w: 80, h: 84, ax: 40, ay: 70, anims: anims(knight) },
    { name: 'grimling', w: 72, h: 72, ax: 36, ay: 60, anims: anims(grimling) },
    { name: 'archer', w: 80, h: 80, ax: 40, ay: 66, anims: anims(archer, { attack: Pose.shoot }) },
    { name: 'wolf', w: 80, h: 60, ax: 40, ay: 50, anims: {
      walk: { frames: 8, draw: (g, t) => wolf.draw(g, QPose.walk(t, true)) },
      bite: { frames: 6, loop: false, draw: (g, t) => wolf.draw(g, QPose.bite(t)) },
      death: { frames: 6, loop: false, draw: (g, t) => wolf.draw(g, QPose.death(t)) },
    } },
  ];
}
