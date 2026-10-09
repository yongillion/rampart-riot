// Rampart Riot — shared small-animal rigs (original art)
import { toon, flat, ellipse, circle, blob } from './toon.js';
import { quadruped } from './rig.js';

// fluffy sheep: thin dark legs tucked under a cloud of wool, long dark face, side ears
export function sheepRig(o = {}) {
  const face = o.face || '#3a3430', wool = o.wool || '#f6f3ec';
  return quadruped({ len: 22, bodyH: 12, legLen: 9.5, legThick: 0.5, legsUnder: true, headR: 4.6, color: o.body || '#efebe2', legColor: face, wool, tailLen: 0, paw: '#1e1814', headDX: 1, headDY: 1.5,
    drawHead: (g) => {
      toon(g, ellipse(-2.2, -0.6, 2.8, 1.3, 0.5), face, { sd: 0.4, hd: 0.3, lw: 1.1 });                 // far ear
      toon(g, blob([[-2.5, -3], [1.5, -3.6], [5.6, -0.6], [6.2, 2.2], [4, 3.6], [0, 3], [-2.6, 1.2]], 0.75), face, { sd: 0.8, hd: 0.5, lw: 1.3 });
      toon(g, ellipse(-1.2, -3.4, 3.4, 2.2, -0.2), wool, { sd: 0.5, hd: 0.4, lw: 1.1 });                  // wool fringe
      toon(g, ellipse(-0.6, 0.8, 2.9, 1.3, 0.9), face, { sd: 0.4, hd: 0.3, lw: 1.1 });                   // near ear (drooping)
      flat(g, circle(2.6, -0.9, 1.15), '#f4efe0', 0.5); flat(g, circle(2.95, -0.85, 0.6), '#000', 0);
      flat(g, ellipse(5.4, 1.3, 0.6, 0.45), '#120c0a', 0);
    } });
}
