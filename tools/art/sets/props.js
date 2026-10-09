// Rampart Riot — animated map props / easter eggs (original): sheep, windmill, crows, frog, chickens, bell, fish, statue, snowman, lava
import { toon, flat, ellipse, circle, rrect, poly, blob, dark, light, alpha, OUT, glow, line, stroke, rng, star, banner, pole } from '../lib/toon.js';
import { cylinder, cone, house } from '../lib/build.js';
import { quadruped, QPose } from '../lib/rig.js';
import { sheepRig } from '../lib/critters.js';

export const scale = 1.5;
const PI = Math.PI, S = Math.sin, C = Math.cos;

const sheep = sheepRig();

function windmill(g, ang) {
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(14, 2, 44, 12, 0, 0, PI * 2); g.fill();
  // tapered stone tower
  const body = poly([[-22, 0], [-15, -78], [15, -78], [22, 0]]);
  toon(g, body, '#d8cfbc', { sd: 3, hd: 1.4, lw: 1.8, detail: c => { c.strokeStyle = 'rgba(80,60,40,0.3)'; c.lineWidth = 1; for (let y = -6; y > -78; y -= 9) { c.beginPath(); c.moveTo(-24, y); c.lineTo(24, y); c.stroke(); } } });
  toon(g, rrect(-6, -22, 12, 22, 5), '#5a3a1e', { sd: 0.5, hd: 0.3, lw: 1.4 });
  toon(g, rrect(-5, -56, 10, 10, 3), '#ffd27a', { sd: 0, hd: 0, lw: 1.2 });
  cone(g, 0, -76, 20, 7, -104, '#8a4a2a', { rows: 3 });
  // sails
  g.save(); g.translate(4, -84); g.rotate(ang);
  for (let i = 0; i < 4; i++) {
    g.save(); g.rotate(i * PI / 2);
    line(g, [[0, 0], [0, -54]], OUT, 4.4); line(g, [[0, 0], [0, -54]], '#7a4a24', 2.6);
    toon(g, poly([[2, -10], [14, -12], [14, -54], [2, -54]]), '#efe6d0', { sd: 1, hd: 0.5, lw: 1.3, detail: c => { c.strokeStyle = 'rgba(90,60,30,0.5)'; c.lineWidth = 0.8; for (let y = -16; y > -54; y -= 7) { c.beginPath(); c.moveTo(2, y); c.lineTo(14, y); c.stroke(); } } });
    g.restore();
  }
  toon(g, circle(0, 0, 4.4), '#6b4423', { sd: 0.5, hd: 0.4, lw: 1.3 });
  g.restore();
}

function crow(g, x, y, peck, flip = 1) {
  g.save(); g.translate(x, y); g.scale(flip, 1);
  toon(g, blob([[-8, -4], [-4, -9], [4, -9], [8, -5], [6, -1], [-6, -1]], 0.6), '#2a2a32', { sd: 1, hd: 0.8, lw: 1.2, light: '#5a5a6a' });
  toon(g, poly([[-8, -5], [-14, -2], [-8, -2]]), '#2a2a32', { sd: 0, hd: 0, lw: 1 });
  g.save(); g.translate(5, -9 + peck * 5); g.rotate(peck * 0.6);
  toon(g, circle(0, 0, 3.6), '#2a2a32', { sd: 0.5, hd: 0.5, lw: 1.1, light: '#5a5a6a' });
  toon(g, poly([[2.5, -1], [7, 0.5], [2.5, 1.5]]), '#d8a83a', { sd: 0, hd: 0, lw: 0.8 });
  flat(g, circle(1, -1, 0.9), '#fff', 0);
  g.restore();
  line(g, [[-1, -1], [-1, 2]], '#d8a83a', 1); line(g, [[2, -1], [2, 2]], '#d8a83a', 1);
  g.restore();
}

function frog(g, t, croak) {
  toon(g, ellipse(0, 0, 18, 6), '#4a8a3a', { sd: 0.6, hd: 0.5, lw: 1.3 }); // lily pad
  const jump = S(Math.max(0, t) * PI) * (croak ? 4 : 0);
  g.save(); g.translate(0, -3 - jump);
  toon(g, blob([[-8, 0], [-7, -6], [0, -9], [7, -6], [8, 0]], 0.7), '#6ab83a', { sd: 1.4, hd: 1, lw: 1.3 });
  for (const sx of [-4, 4]) { toon(g, circle(sx, -9, 2.8), '#6ab83a', { sd: 0.4, hd: 0.4, lw: 1.1 }); flat(g, circle(sx, -9.5, 1.3), '#1a120c', 0); }
  const sac = croak ? 2.5 + S(t * PI * 4) * 1.5 : 0;
  if (sac > 0.5) toon(g, ellipse(0, -2, 4 + sac, 2.5 + sac * 0.6), '#e8e0a0', { sd: 0.3, hd: 0.5, lw: 1 });
  g.restore();
}

function chicken(g, t, peck) {
  const p = peck ? Math.max(0, S(t * PI * 2)) : 0;
  toon(g, blob([[-8, -2], [-9, -10], [-2, -13], [6, -10], [8, -4], [2, 0]], 0.6), '#f4efe4', { sd: 1.2, hd: 0.8, lw: 1.2 });
  toon(g, poly([[-8, -8], [-13, -14], [-9, -6]]), '#f4efe4', { sd: 0, hd: 0, lw: 1 });
  g.save(); g.translate(5, -13 + p * 6); g.rotate(p * 0.8);
  toon(g, circle(0, 0, 3.6), '#f4efe4', { sd: 0.5, hd: 0.4, lw: 1.1 });
  toon(g, poly([[-1, -3], [1, -6], [3, -3]]), '#e0302a', { sd: 0, hd: 0, lw: 0.8 });
  toon(g, poly([[3, -0.5], [6.5, 0.5], [3, 1.5]]), '#e8b030', { sd: 0, hd: 0, lw: 0.8 });
  flat(g, circle(1.2, -0.8, 0.8), '#1a120c', 0);
  g.restore();
  line(g, [[-2, 0], [-2, 3]], '#e8b030', 1.2); line(g, [[2, 0], [2, 3]], '#e8b030', 1.2);
}

function bellTower(g, t) {
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(10, 2, 30, 8, 0, 0, PI * 2); g.fill();
  for (const x of [-16, 16]) toon(g, rrect(x - 3, -56, 6, 56, 2), '#7a4a24', { sd: 0.8, hd: 0.4, lw: 1.4 });
  toon(g, poly([[-24, -54], [0, -76], [24, -54], [20, -50], [0, -70], [-20, -50]]), '#a8452c', { sd: 1, hd: 0.6, lw: 1.5 });
  line(g, [[-16, -50], [16, -50]], OUT, 4); line(g, [[-16, -50], [16, -50]], '#6b4423', 2.4);
  const sw = S(t * PI * 2) * 0.5;
  g.save(); g.translate(0, -50); g.rotate(sw);
  toon(g, blob([[-8, 18], [-7, 6], [-4, 0], [4, 0], [7, 6], [8, 18]], 0.5), '#c9993e', { sd: 1.6, hd: 1, lw: 1.4, light: '#f2d28a' });
  toon(g, circle(0, 19, 2.4), '#8a6a2a', { sd: 0.4, hd: 0.3, lw: 1 });
  g.restore();
}

function fishPond(g, t) {
  // ripples & a fish arc
  for (let i = 0; i < 2; i++) { const k = (t + i * 0.5) % 1; g.save(); g.globalAlpha = 1 - k; const r = new Path2D(); r.ellipse(0, 0, 6 + k * 16, 2 + k * 6, 0, 0, PI * 2); stroke(g, r, 'rgba(230,245,255,0.9)', 1.4); g.restore(); }
  const u = (t * 1.0) % 1;
  if (u < 0.5) {
    const a = u / 0.5;
    const x = -12 + a * 24, y = -S(a * PI) * 18;
    g.save(); g.translate(x, y); g.rotate(-C(a * PI) * 0.8);
    toon(g, ellipse(0, 0, 6, 2.6), '#d8a050', { sd: 0.6, hd: 0.6, lw: 1.1, light: '#fff0c0' });
    toon(g, poly([[-5, 0], [-9, -3], [-9, 3]]), '#c88a3a', { sd: 0, hd: 0, lw: 1 });
    flat(g, circle(3, -0.6, 0.7), '#1a120c', 0);
    g.restore();
  }
}

function statue(g) {
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(10, 2, 28, 8, 0, 0, PI * 2); g.fill();
  toon(g, rrect(-18, -14, 36, 14, 2), '#a8a39a', { sd: 1, hd: 0.6, lw: 1.5 });
  toon(g, rrect(-14, -20, 28, 7, 2), '#b8b3aa', { sd: 0.6, hd: 0.4, lw: 1.3 });
  const col = '#8f9a92';
  // a weathered stone warden leaning on a sword
  toon(g, blob([[-9, -20], [-10, -46], [-5, -58], [5, -58], [10, -46], [9, -20]], 0.6), col, { sd: 2, hd: 1.2, lw: 1.6, detail: c => { c.fillStyle = 'rgba(90,120,70,0.5)'; c.beginPath(); c.ellipse(-4, -30, 4, 7, 0, 0, PI * 2); c.fill(); } });
  toon(g, circle(0, -64, 7), col, { sd: 1.2, hd: 0.8, lw: 1.5 });
  toon(g, blob([[-7, -66], [-6, -72], [0, -74], [6, -72], [7, -66]], 0.6), dark(col, 0.06), { sd: 0.5, hd: 0.4, lw: 1.3 });
  line(g, [[12, -20], [12, -54]], OUT, 4.4); line(g, [[12, -20], [12, -54]], '#a8b0b2', 2.6);
  toon(g, rrect(6, -48, 12, 3, 1), col, { sd: 0.3, hd: 0.3, lw: 1.1 });
  toon(g, blob([[-10, -44], [-16, -30], [-12, -24], [-8, -34]], 0.6), dark(col, 0.05), { sd: 0.6, hd: 0.3, lw: 1.3 });
}

function snowman(g, t, broken) {
  g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(6, 2, 18, 6, 0, 0, PI * 2); g.fill();
  toon(g, circle(0, -11, 12), '#f4f8fc', { sd: 2, hd: 1, lw: 1.4, shade: '#c8d6e2' });
  if (broken) { toon(g, circle(14, -4, 7), '#f4f8fc', { sd: 1, hd: 0.6, lw: 1.3, shade: '#c8d6e2' }); return; }
  toon(g, circle(0, -28, 8.5), '#f4f8fc', { sd: 1.6, hd: 0.8, lw: 1.4, shade: '#c8d6e2' });
  toon(g, circle(0, -41, 6.5), '#f4f8fc', { sd: 1.2, hd: 0.6, lw: 1.3, shade: '#c8d6e2' });
  for (const x of [-2.4, 2.4]) flat(g, circle(x, -42, 1), '#1a120c', 0);
  toon(g, poly([[0, -40], [7, -39], [0, -38]]), '#e8802a', { sd: 0, hd: 0, lw: 0.8 });
  toon(g, rrect(-7, -50, 14, 4, 1), '#3a3a40', { sd: 0, hd: 0.3, lw: 1 }); toon(g, rrect(-4.5, -58, 9, 9, 1), '#3a3a40', { sd: 0, hd: 0.3, lw: 1 });
  line(g, [[-7, -30], [-16, -36 + S(t * PI * 2) * 2]], '#6b4423', 1.6); line(g, [[7, -30], [16, -35]], '#6b4423', 1.6);
  toon(g, rrect(-9, -36, 18, 3.4, 1.5), '#c0392b', { sd: 0, hd: 0.3, lw: 1 });
}

function lavaPool(g, t) {
  toon(g, ellipse(0, 0, 26, 10), '#2a2224', { sd: 1, hd: 0.5, lw: 1.5 });
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 0, -2, 40, '#ff6a20', 0.55 + 0.15 * S(t * PI * 2)); g.restore();
  flat(g, ellipse(0, 0, 20, 7), '#ff8a2a', 1, '#7a1a04');
  flat(g, ellipse(-4, -1, 10, 3.4), '#ffd06a', 0);
  for (let i = 0; i < 3; i++) { const k = (t * 1.5 + i / 3) % 1; const x = -10 + i * 9; g.save(); g.globalAlpha = 1 - k; flat(g, circle(x, -2 - k * 10, 2 + k * 2), '#ffb040', 0.8, '#7a1a04'); g.restore(); }
}

export function jobs() {
  const J = [];
  J.push({ name: 'prop_sheep', w: 70, h: 54, ax: 30, ay: 44, anims: {
    walk: { frames: 8, fps: 10, draw: (g, t) => sheep.draw(g, QPose.walk(t)) },
    idle: { frames: 6, fps: 5, draw: (g, t) => { const p = QPose.idle(t); p.head = 0.25 + S(t * PI * 2) * 0.15; sheep.draw(g, p); } },
  } });
  J.push({ name: 'prop_windmill', w: 140, h: 180, ax: 64, ay: 150, anims: { idle: { frames: 8, fps: 8 / (PI / 2), draw: (g, t, i) => windmill(g, (i / 8) * (PI / 2)) } } });
  J.push({ name: 'prop_crows', w: 70, h: 40, ax: 35, ay: 30, anims: { idle: { frames: 8, fps: 6, draw: (g, t) => { crow(g, -16, 2, Math.max(0, S(t * PI * 2)), 1); crow(g, 4, -4, Math.max(0, S(t * PI * 2 + 2)), -1); crow(g, 18, 4, Math.max(0, S(t * PI * 2 + 4)), 1); } } } });
  J.push({ name: 'prop_frog', w: 50, h: 40, ax: 25, ay: 26, anims: { idle: { frames: 8, fps: 6, draw: (g, t) => frog(g, t, t > 0.5) } } });
  J.push({ name: 'prop_chicken', w: 40, h: 40, ax: 20, ay: 32, anims: { idle: { frames: 8, fps: 6, draw: (g, t) => chicken(g, t, true) } } });
  J.push({ name: 'prop_bell', w: 70, h: 100, ax: 35, ay: 88, anims: { idle: { frames: 8, fps: 4, draw: (g, t) => bellTower(g, t) } } });
  J.push({ name: 'prop_fish', w: 70, h: 50, ax: 35, ay: 30, anims: { idle: { frames: 12, fps: 8, draw: (g, t) => fishPond(g, t) } } });
  J.push({ name: 'prop_statue', w: 70, h: 100, ax: 35, ay: 88, anims: { idle: { frames: 1, draw: g => statue(g) } } });
  J.push({ name: 'prop_snowman', w: 50, h: 80, ax: 25, ay: 70, anims: { idle: { frames: 6, fps: 4, draw: (g, t) => snowman(g, t, false) }, broken: { frames: 1, draw: g => snowman(g, 0, true) } } });
  J.push({ name: 'prop_lava', w: 70, h: 50, ax: 35, ay: 30, anims: { idle: { frames: 8, fps: 8, draw: (g, t) => lavaPool(g, t) } } });
  return J;
}
