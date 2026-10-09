// Rampart Riot — projectiles & effect sprites (all point right; renderer rotates)
import { toon, flat, ellipse, circle, rrect, poly, blob, dark, light, mix, alpha, OUT, glow, line, stroke, rng, star } from '../lib/toon.js';

export const scale = 2;
const PI = Math.PI, S = Math.sin, C = Math.cos;

function arrow(g, len = 20, col = '#8a6038') {
  line(g, [[-len / 2, 0], [len / 2 - 3, 0]], OUT, 2.6); line(g, [[-len / 2, 0], [len / 2 - 3, 0]], col, 1.3);
  toon(g, poly([[len / 2 - 4, -2.4], [len / 2 + 2, 0], [len / 2 - 4, 2.4]]), '#d6dde4', { sd: 0, hd: 0, lw: 1 });
  for (const s of [-1, 1]) toon(g, poly([[-len / 2, 0], [-len / 2 - 2.5, s * 3], [-len / 2 + 4, s * 0.6]]), '#f2ead8', { sd: 0, hd: 0, lw: 0.8 });
}
function trail(g, len, col, w) {
  const gr = g.createLinearGradient(-len, 0, 0, 0); gr.addColorStop(0, alpha(col, 0)); gr.addColorStop(1, alpha(col, 0.8));
  g.fillStyle = gr; g.beginPath(); g.moveTo(-len, 0); g.lineTo(0, -w); g.lineTo(0, w); g.closePath(); g.fill();
}
function magicOrb(g, t, core, edge, r = 5.5) {
  g.save(); g.globalCompositeOperation = 'lighter'; trail(g, 18, edge, r * 0.7); g.restore();
  glow(g, 0, 0, r * 3.2, edge, 0.7);
  flat(g, circle(0, 0, r), edge, 1.1, dark(edge, 0.35));
  flat(g, circle(-r * 0.2, -r * 0.2, r * 0.6), core, 0);
  for (let i = 0; i < 3; i++) { const a = t * PI * 2 + i * 2.1; flat(g, star(C(a) * r * 1.4, S(a) * r * 1.4, 2.2, 0.4, 4), '#ffffff', 0); }
}

export function jobs() {
  const one = (name, w, h, draw, ax = w / 2, ay = h / 2) => ({ name, w, h, ax, ay, anims: { s: { frames: 1, single: true, draw } } });
  const anim = (name, w, h, n, fps, draw, ax = w / 2, ay = h / 2) => ({ name, w, h, ax, ay, anims: { idle: { frames: n, fps, draw } } });
  const J = [];
  J.push(one('p_arrow', 30, 12, g => arrow(g, 20)));
  J.push(one('p_javelin', 38, 12, g => arrow(g, 28, '#9a7040')));
  J.push(one('p_bolt', 30, 14, g => { line(g, [[-9, 0], [7, 0]], OUT, 3.6); line(g, [[-9, 0], [7, 0]], '#6b4423', 2); toon(g, poly([[6, -3], [13, 0], [6, 3]]), '#cfd6dc', { sd: 0, hd: 0, lw: 1 }); for (const s of [-1, 1]) toon(g, poly([[-9, 0], [-12, s * 3.4], [-6, s * 0.8]]), '#b03a2a', { sd: 0, hd: 0, lw: 0.8 }); }));
  J.push(one('p_piercebolt', 50, 16, g => { g.save(); g.globalCompositeOperation = 'lighter'; trail(g, 24, '#fff2b0', 4); g.restore(); glow(g, 4, 0, 12, '#ffe080', 0.8); line(g, [[-8, 0], [10, 0]], '#fff8e0', 3); toon(g, poly([[9, -3.5], [17, 0], [9, 3.5]]), '#ffffff', { sd: 0, hd: 0, lw: 1 }); }, 28, 8));
  J.push(one('p_stone', 12, 12, g => toon(g, blob([[-3.5, -2], [0, -3.8], [3.5, -1.5], [3, 2.5], [-1, 3.6], [-3.6, 1.5]], 0.6), '#8a8378', { sd: 1, hd: 0.6, lw: 1 })));
  J.push(anim('p_orb', 44, 24, 4, 16, (g, t) => magicOrb(g, t, '#f0e0ff', '#a070ff'), 30, 12));
  J.push(anim('p_frostorb', 44, 24, 4, 16, (g, t) => { g.save(); g.globalCompositeOperation = 'lighter'; trail(g, 18, '#9fe4ff', 4); g.restore(); glow(g, 0, 0, 16, '#9fe4ff', 0.7); g.save(); g.rotate(t * PI * 2); toon(g, poly([[0, -6], [3, 0], [0, 6], [-3, 0]]), '#e8fbff', { sd: 0.6, hd: 0.6, lw: 1, light: '#ffffff' }); toon(g, poly([[-6, 0], [0, -2.5], [6, 0], [0, 2.5]]), '#bfefff', { sd: 0.4, hd: 0.4, lw: 1 }); g.restore(); }, 30, 12));
  J.push(anim('p_starbolt', 44, 24, 4, 16, (g, t) => { g.save(); g.globalCompositeOperation = 'lighter'; trail(g, 20, '#bcd8ff', 4); g.restore(); glow(g, 0, 0, 16, '#cfe0ff', 0.8); g.save(); g.rotate(t * PI); flat(g, star(0, 0, 6.5, 0.42, 5), '#ffffff', 1, '#4a6aa8'); g.restore(); }, 30, 12));
  J.push(anim('p_firebolt', 48, 26, 4, 16, (g, t) => { g.save(); g.globalCompositeOperation = 'lighter'; trail(g, 22, '#ff8a2a', 5); g.restore(); glow(g, 0, 0, 18, '#ff8a2a', 0.85); flat(g, blob([[-6, 0], [-2, -5 - S(t * PI * 2)], [5, -3], [7, 0], [5, 3], [-2, 5 + S(t * PI * 2)]], 0.7), '#ffb040', 1, '#7a2a08'); flat(g, circle(1, 0, 2.6), '#fff4b0', 0); }, 32, 13));
  J.push(anim('p_ember', 40, 22, 4, 16, (g, t) => magicOrb(g, t, '#ffd0a0', '#d0401a', 4.8), 28, 11));
  J.push(one('p_bomb', 22, 22, g => { toon(g, circle(0, 0, 6.2), '#2e2e34', { sd: 1.6, hd: 1.2, lw: 1.3, light: '#8a8a96' }); line(g, [[3, -5], [6, -8]], '#8a6038', 1.6); glow(g, 6.5, -8.5, 5, '#ffb040', 0.9); flat(g, star(6.5, -8.5, 2.6, 0.4, 5), '#fff2a0', 0); }));
  J.push(one('p_cannonball', 14, 14, g => toon(g, circle(0, 0, 3.6), '#2e2e34', { sd: 1, hd: 0.8, lw: 1, light: '#8a8a96' })));
  J.push(one('p_flask', 20, 24, g => { toon(g, circle(0, 2.5, 5.5), '#7ae03a', { sd: 1, hd: 1, lw: 1.2, light: '#e8ffd0' }); toon(g, rrect(-1.8, -6, 3.6, 5, 1), '#d8f0c8', { sd: 0, hd: 0, lw: 1 }); toon(g, rrect(-2.4, -7.5, 4.8, 2, 0.8), '#8a5a2a', { sd: 0, hd: 0, lw: 0.9 }); glow(g, 0, 2.5, 10, '#8aff4a', 0.4); }));
  J.push(one('p_keg', 24, 24, g => { toon(g, rrect(-6, -7, 12, 14, 3), '#8a5a2a', { sd: 1, hd: 0.6, lw: 1.2, detail: c => { c.fillStyle = '#4a4a50'; c.fillRect(-7, -4, 14, 1.8); c.fillRect(-7, 2.5, 14, 1.8); } }); line(g, [[2, -7], [5, -10]], '#5a3a1a', 1.4); glow(g, 5.5, -10.5, 5, '#ffb040', 0.9); }));
  const rocket = (g, t, s) => {
    g.save(); g.scale(s, s);
    g.save(); g.globalCompositeOperation = 'lighter';
    const fl = 8 + S(t * PI * 4) * 2;
    glow(g, -10, 0, 10, '#ffb040', 0.9);
    flat(g, poly([[-8, -2.5], [-8 - fl, 0], [-8, 2.5]]), '#ffd060', 0);
    g.restore();
    toon(g, rrect(-8, -3, 15, 6, 2.6), '#d8cfc0', { sd: 0.8, hd: 0.6, lw: 1.1 });
    toon(g, poly([[7, -3], [12, 0], [7, 3]]), '#c0392b', { sd: 0.4, hd: 0.3, lw: 1 });
    for (const sy of [-1, 1]) toon(g, poly([[-8, sy * 3], [-11, sy * 6], [-5, sy * 3]]), '#c0392b', { sd: 0, hd: 0, lw: 0.9 });
    g.restore();
  };
  J.push(anim('p_rocket', 50, 22, 4, 20, (g, t) => rocket(g, t, 1.1), 26, 11));
  J.push(anim('p_minirocket', 40, 18, 4, 20, (g, t) => rocket(g, t, 0.75), 20, 9));
  J.push(anim('p_meteor', 110, 60, 6, 16, (g, t) => {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { const k = i / 6; glow(g, -10 - i * 9, S(t * PI * 2 + i) * 2, 18 - i * 2, i < 2 ? '#fff0a0' : '#ff7a20', 0.7 - k * 0.5); }
    g.restore();
    glow(g, 0, 0, 30, '#ff8a30', 0.8);
    toon(g, blob([[-11, -4], [-6, -11], [4, -11], [12, -3], [10, 7], [1, 12], [-9, 9]], 0.6), '#5a3a2a', { sd: 3, hd: 2, lw: 1.6, light: '#ffb060', shade: '#2a1810' });
    g.save(); g.globalCompositeOperation = 'lighter';
    stroke(g, poly([[-6, -4], [0, 0], [-2, 6]], false), '#ffb040', 1.6);
    stroke(g, poly([[3, -6], [6, 1]], false), '#ffb040', 1.4);
    g.restore();
  }, 70, 30));
  // frozen block for enemies
  J.push(one('fx_iceblock', 50, 60, g => {
    g.save(); g.globalAlpha = 0.72;
    toon(g, poly([[-16, 2], [-18, -26], [-10, -40], [6, -42], [17, -30], [16, 2]]), '#bfe8ff', { sd: 3, hd: 2, lw: 1.5, light: '#ffffff', shade: '#7ab8e0' });
    g.restore();
    stroke(g, poly([[-10, -34], [-4, -20], [-8, -8]], false), 'rgba(255,255,255,0.8)', 1.4);
    stroke(g, poly([[8, -36], [10, -26]], false), 'rgba(255,255,255,0.8)', 1.2);
  }, 25, 52));
  // burrow mound
  J.push(anim('fx_mound', 50, 26, 6, 10, (g, t) => {
    const R = rng(Math.floor(t * 6) + 1);
    toon(g, blob([[-16, 0], [-10, -6], [-2, -8 - S(t * PI * 2)], [8, -7], [16, 0]], 0.6), '#6b4a2a', { sd: 1.2, hd: 0.6, lw: 1.3 });
    for (let i = 0; i < 4; i++) toon(g, circle(-12 + R() * 24, -2 - R() * 8, 1.6 + R()), '#5a3a1e', { sd: 0, hd: 0, lw: 0.8 });
  }, 25, 20));
  // hero move marker / misc
  J.push(one('fx_moveflag', 30, 40, g => { line(g, [[0, 0], [0, -26]], OUT, 3); line(g, [[0, 0], [0, -26]], '#6b4423', 1.6); toon(g, poly([[0, -26], [14, -21], [0, -16]]), '#7ad04a', { sd: 0.4, hd: 0.3, lw: 1.1 }); }, 15, 34));
  return J;
}
