// Rampart Riot — UI icon atlas: HUD icons, tower/spec icons (rendered from the tower art), skill & upgrade icons
import { toon, flat, ellipse, circle, rrect, poly, blob, dark, light, mix, alpha, OUT, glow, line, stroke, rng, star, capsule, eye, banner, pole, lg } from '../lib/toon.js';
import { jobs as towerJobs } from './towers.js';
import { jobs as unitJobs } from './units.js';

export const scale = 2;
const PI = Math.PI, S = Math.sin, C = Math.cos;
const LW = 2.2;

const T = (g, path, col, o = {}) => toon(g, path, col, Object.assign({ sd: 2.2, hd: 1.4, lw: LW }, o));

function crest(g, x, y, s = 1, col = '#f4ecd8') {
  g.save(); g.translate(x, y); g.scale(s, s);
  flat(g, poly([[-4, 5], [-4, -2], [-5, -2], [-5, -6], [-3, -6], [-3, -4], [-1, -4], [-1, -6], [1, -6], [1, -4], [3, -4], [3, -6], [5, -6], [5, -2], [4, -2], [4, 5]]), col, 0.8);
  g.restore();
}
function arrowShape(g, x0, y0, x1, y1, col = '#a8743a', w = 2.4) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  line(g, [[x0, y0], [x1, y1]], OUT, w + 2.2); line(g, [[x0, y0], [x1, y1]], col, w);
  g.save(); g.translate(x1, y1); g.rotate(a); T(g, poly([[-1, -4.5], [8, 0], [-1, 4.5]]), '#d6dde4', { sd: 0.6, hd: 0.5, lw: 1.6 }); g.restore();
  g.save(); g.translate(x0, y0); g.rotate(a); for (const s of [-1, 1]) T(g, poly([[0, 0], [-5, s * 5], [5, s * 1]]), '#f2ead8', { sd: 0, hd: 0, lw: 1.2 }); g.restore();
}
function coin(g, x, y, r) {
  T(g, ellipse(x, y, r, r * 0.92), '#f5c232', { light: '#fff2a8', shade: '#c88a12' });
  stroke(g, ellipse(x, y, r * 0.72, r * 0.66), '#c88a12', 1.4);
}
function shieldShape(g, x, y, s, col) {
  const p = blob([[x - 12 * s, y - 13 * s], [x + 12 * s, y - 13 * s], [x + 11 * s, y + 2 * s], [x, y + 16 * s], [x - 11 * s, y + 2 * s]], 0.35);
  T(g, p, col);
  stroke(g, blob([[x - 9.5 * s, y - 10.5 * s], [x + 9.5 * s, y - 10.5 * s], [x + 8.8 * s, y + 1.5 * s], [x, y + 12.5 * s], [x - 8.8 * s, y + 1.5 * s]], 0.35), '#e2c25a', 1.6);
}
function flame(g, x, y, s, col = '#ff9a2a') {
  T(g, blob([[x - 8 * s, y + 6 * s], [x - 9 * s, y - 2 * s], [x - 3 * s, y - 8 * s], [x - 1 * s, y - 16 * s], [x + 5 * s, y - 7 * s], [x + 9 * s, y - 1 * s], [x + 8 * s, y + 6 * s]], 0.7), col, { light: '#fff2a0', shade: '#d0401a' });
  flat(g, blob([[x - 3 * s, y + 5 * s], [x, y - 5 * s], [x + 3 * s, y + 5 * s]], 0.7), '#fff4b0', 0);
}
function bolt(g, pts, col = '#ffe86a') { stroke(g, poly(pts, false), OUT, 6); stroke(g, poly(pts, false), col, 3.4); }
function snowflake(g, x, y, r) { for (let i = 0; i < 6; i++) { const a = i * PI / 3; line(g, [[x, y], [x + C(a) * r, y + S(a) * r]], OUT, 4.4); line(g, [[x, y], [x + C(a) * r, y + S(a) * r]], '#dff6ff', 2.4); } T(g, circle(x, y, r * 0.22), '#ffffff', { sd: 0, hd: 0, lw: 1.4 }); }
function hourglass(g, x, y, s) {
  T(g, poly([[x - 9 * s, y - 13 * s], [x + 9 * s, y - 13 * s], [x + 2 * s, y], [x + 9 * s, y + 13 * s], [x - 9 * s, y + 13 * s], [x - 2 * s, y]]), '#cfe8ff', { sd: 1, hd: 1 });
  flat(g, poly([[x - 6 * s, y + 11 * s], [x + 6 * s, y + 11 * s], [x, y + 3 * s]]), '#e8c45a', 0);
  T(g, rrect(x - 11 * s, y - 15 * s, 22 * s, 4 * s, 1.5), '#8a5a2a', { sd: 0.5, hd: 0.4 }); T(g, rrect(x - 11 * s, y + 11 * s, 22 * s, 4 * s, 1.5), '#8a5a2a', { sd: 0.5, hd: 0.4 });
}

const ICONS = {
  heart: g => { T(g, blob([[0, 17], [-17, 0], [-15, -12], [-6, -15], [0, -8], [6, -15], [15, -12], [17, 0]], 0.6), '#e8323a', { light: '#ff8a8a' }); flat(g, ellipse(-8, -7, 4, 2.6, -0.6), 'rgba(255,255,255,0.7)', 0); },
  gold: g => { coin(g, -7, 7, 11); coin(g, 7, 4, 11); coin(g, 0, -6, 11); },
  skull: g => { T(g, blob([[-15, 0], [-14, -12], [0, -18], [14, -12], [15, 0], [10, 8], [-10, 8]], 0.7), '#efe7d4'); T(g, rrect(-9, 5, 18, 11, 3), '#efe7d4', { sd: 1 }); flat(g, ellipse(-6, -3, 4.4, 5), '#1d130c', 0); flat(g, ellipse(6, -3, 4.4, 5), '#1d130c', 0); flat(g, poly([[0, 3], [-2.5, 7], [2.5, 7]]), '#1d130c', 0); for (const x of [-4, 0, 4]) line(g, [[x, 11], [x, 15]], OUT, 1.4); },
  star: g => { T(g, star(0, 0, 18, 0.48), '#ffc928', { light: '#fff3a8', shade: '#d07a0a' }); },
  starEmpty: g => { T(g, star(0, 0, 18, 0.48), '#3a2a1a', { light: '#4a3a2a', shade: '#2a1a0a' }); },
  pause: g => { for (const x of [-7, 7]) T(g, rrect(x - 4.5, -13, 9, 26, 2.5), '#f4ead2'); },
  play: g => { T(g, poly([[-9, -14], [14, 0], [-9, 14]]), '#f4ead2'); },
  speed1: g => { T(g, poly([[-9, -12], [10, 0], [-9, 12]]), '#f4ead2'); },
  speed2: g => { for (const x of [-9, 5]) T(g, poly([[x - 6, -12], [x + 9, 0], [x - 6, 12]]), '#ffe27a'); },
  check: g => { stroke(g, poly([[-13, 1], [-4, 11], [14, -10]], false), OUT, 9); stroke(g, poly([[-13, 1], [-4, 11], [14, -10]], false), '#7fe35a', 5); },
  close: g => { for (const k of [1, -1]) { stroke(g, poly([[-11, -11 * k], [11, 11 * k]], false), OUT, 9); stroke(g, poly([[-11, -11 * k], [11, 11 * k]], false), '#f06a5a', 5); } },
  lock: g => { stroke(g, new Path2D('M -8 -2 L -8 -8 A 8 8 0 0 1 8 -8 L 8 -2'), OUT, 7); stroke(g, new Path2D('M -8 -2 L -8 -8 A 8 8 0 0 1 8 -8 L 8 -2'), '#b8bec6', 3.6); T(g, rrect(-12, -3, 24, 18, 3), '#d8a842', { light: '#ffe08a' }); flat(g, circle(0, 4, 2.6), '#3a2a10', 0); flat(g, rrect(-1, 5, 2, 6, 1), '#3a2a10', 0); },
  upgrade: g => { T(g, poly([[0, -17], [15, 0], [6, 0], [6, 15], [-6, 15], [-6, 0], [-15, 0]]), '#7fd35a', { light: '#d0ffb0', shade: '#3a8a2a' }); },
  sell: g => { coin(g, 0, 0, 15); crest(g, 0, 1, 1.4, '#a8700a'); },
  rally: g => { line(g, [[-8, 16], [-8, -16]], OUT, 5.6); line(g, [[-8, 16], [-8, -16]], '#7a4a24', 3); T(g, poly([[-7, -15], [14, -8], [-7, -1]]), '#e8463a'); },
  book: g => { T(g, rrect(-15, -12, 30, 26, 3), '#8a3a2a'); T(g, rrect(-12, -10, 24, 20, 2), '#f2e6c4', { sd: 1 }); line(g, [[0, -10], [0, 10]], '#8a3a2a', 2); for (let y = -6; y < 8; y += 4) { line(g, [[-9, y], [-3, y]], alpha('#5a3a1a', 0.6), 1.2); line(g, [[3, y], [9, y]], alpha('#5a3a1a', 0.6), 1.2); } },
  gear: g => { const p = new Path2D(); for (let i = 0; i < 16; i++) { const a = i * TAU16, r = i % 2 ? 11 : 16; i ? p.lineTo(C(a) * r, S(a) * r) : p.moveTo(C(a) * r, S(a) * r); } p.closePath(); T(g, p, '#b8bec6'); T(g, circle(0, 0, 5), '#4a4d54', { sd: 0.5, hd: 0.3 }); },
  trophy: g => { T(g, blob([[-12, -14], [12, -14], [10, 0], [3, 5], [-3, 5], [-10, 0]], 0.5), '#f2c43a', { light: '#fff2a8' }); T(g, rrect(-2.5, 4, 5, 7, 1), '#d8a020'); T(g, rrect(-9, 10, 18, 5, 1.5), '#8a5a2a'); for (const s of [-1, 1]) stroke(g, new Path2D(`M ${s * 11} -10 C ${s * 19} -10 ${s * 18} 0 ${s * 8} -1`), '#d8a020', 2.6); },
  map: g => { T(g, poly([[-16, -11], [-5, -14], [5, -11], [16, -14], [16, 11], [5, 14], [-5, 11], [-16, 14]]), '#efe0b8'); line(g, [[-5, -14], [-5, 11]], alpha('#8a6a3a', 0.8), 1.4); line(g, [[5, -11], [5, 14]], alpha('#8a6a3a', 0.8), 1.4); stroke(g, poly([[-12, 6], [-6, -2], [0, 3], [8, -6]], false), '#c0392b', 2); flat(g, poly([[7, -9], [11, -5], [8, -3]]), '#c0392b', 0); },
  back: g => { T(g, poly([[-15, 0], [0, -14], [0, -6], [14, -6], [14, 6], [0, 6], [0, 14]]), '#f4ead2'); },
  music: g => { line(g, [[4, 10], [4, -14], [14, -10]], OUT, 5); line(g, [[4, 10], [4, -14], [14, -10]], '#f4ead2', 2.6); T(g, ellipse(-1, 11, 6, 4.5, -0.4), '#f4ead2'); },
  sound: g => { T(g, poly([[-14, -5], [-7, -5], [2, -13], [2, 13], [-7, 5], [-14, 5]]), '#f4ead2'); for (const r of [7, 12]) stroke(g, new Path2D(`M ${4 + r * 0.3} ${-r} A ${r} ${r} 0 0 1 ${4 + r * 0.3} ${r}`), '#f4ead2', 2.4); },
  hero: g => { T(g, blob([[-12, 6], [-12, -6], [-6, -14], [6, -14], [12, -6], [12, 6], [6, 12], [-6, 12]], 0.6), '#b8c0c8', { light: '#ffffff' }); flat(g, rrect(-7, -3, 14, 3, 1), '#1d130c', 0); T(g, blob([[0, -13], [-2, -20], [-9, -22], [-12, -18], [-6, -16]], 0.6), '#c0392b', { sd: 0.6, hd: 0.4 }); },
  campaign: g => { line(g, [[-12, 12], [12, -12]], OUT, 6.5); line(g, [[-12, 12], [12, -12]], '#d6dde4', 3.6); T(g, rrect(-10, 4, 8, 3.4, 1.2), '#c9a14a', { sd: 0, hd: 0 }); },
  heroic: g => { ICONS.skull(g); T(g, star(12, -12, 6, 0.45), '#ffc928', { sd: 0.5, hd: 0.4 }); },
  iron: g => { T(g, poly([[-16, 4], [-10, -6], [12, -6], [16, 0], [10, 0], [8, 6], [10, 14], [-8, 14], [-6, 6], [-12, 6]]), '#5d6168', { light: '#a8acb4' }); },
  sheep: g => { for (let i = 0; i < 7; i++) { const a = i * PI * 2 / 7; T(g, circle(C(a) * 9, S(a) * 7, 7), '#f6f3ec', { sd: 1, hd: 0.6 }); } T(g, ellipse(0, 0, 11, 8), '#f6f3ec', { sd: 0.8, hd: 0.4, lw: 0 }); T(g, ellipse(10, 2, 7, 6), '#3a3430', { sd: 0.6, hd: 0.4 }); flat(g, circle(12, 0, 1.6), '#fff', 0); },
  skyfall: g => { for (let i = 0; i < 3; i++) line(g, [[-14 + i * 4, -16 + i * 2], [-2 + i * 2, -4 + i * 2]], alpha('#ffb040', 0.9), 3); glow(g, 4, 4, 18, '#ff8a30', 0.7); T(g, blob([[-6, 0], [-2, -7], [7, -6], [11, 2], [6, 10], [-3, 9]], 0.6), '#6a3a22', { light: '#ffb060', shade: '#2a1810' }); stroke(g, poly([[-1, 0], [3, 3], [1, 7]], false), '#ffb040', 1.6); },
  militia: g => { line(g, [[-14, 14], [10, -14]], OUT, 5); line(g, [[-14, 14], [10, -14]], '#8a6038', 2.6); T(g, poly([[8, -16], [14, -18], [12, -12]]), '#d6dde4', { sd: 0, hd: 0 }); T(g, circle(5, 6, 10), '#3a6fc4', { sd: 1.6, hd: 1 }); stroke(g, circle(5, 6, 7.5), '#e2c25a', 1.4); T(g, circle(5, 6, 3), '#d6dde4', { sd: 0.3, hd: 0.3 }); },
  // ---- skill icons ----
  sk_split: g => { arrowShape(g, -14, 10, 12, -10); arrowShape(g, -14, 10, 14, 4); arrowShape(g, -14, 10, 2, -15); },
  sk_mark: g => { ICONS.skull(g); g.save(); g.globalAlpha = 0.95; stroke(g, circle(0, 0, 16), '#e8322a', 2.6); for (const [a, b, c, d] of [[-20, 0, -11, 0], [11, 0, 20, 0], [0, -20, 0, -11], [0, 11, 0, 20]]) line(g, [[a, b], [c, d]], '#e8322a', 2.6); g.restore(); },
  sk_pierce: g => { for (const x of [-8, 2, 12]) T(g, circle(x, 4 - (x + 8) * 0.25, 5.5), '#8a8378', { sd: 1, hd: 0.6 }); g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 0, 0, 16, '#ffe080', 0.6); g.restore(); arrowShape(g, -18, 9, 18, -8, '#fff2c0', 3); },
  sk_execute: g => { ICONS.skull(g); line(g, [[-16, 14], [14, -12]], OUT, 5); line(g, [[-16, 14], [14, -12]], '#6b4423', 2.6); T(g, poly([[12, -16], [18, -16], [15, -9]]), '#d6dde4', { sd: 0, hd: 0 }); },
  sk_wall: g => { shieldShape(g, -5, 0, 0.9, '#2f5fa8'); shieldShape(g, 6, 2, 0.9, '#3a6fc4'); crest(g, 6, 0, 0.9); },
  sk_bash: g => { shieldShape(g, -3, 2, 1, '#2f5fa8'); T(g, star(12, -10, 8, 0.4, 6), '#fff2a0', { sd: 0.4, hd: 0.3 }); },
  sk_wolf: g => { T(g, blob([[-12, 8], [-14, -4], [-12, -16], [-6, -8], [6, -8], [12, -16], [14, -4], [12, 8], [0, 16]], 0.5), '#8c8478', { light: '#c8c0b4' }); eye(g, -5, 0, 2.4, { glow: '#ffcf4a' }); eye(g, 5, 0, 2.4, { glow: '#ffcf4a' }); T(g, ellipse(0, 9, 4, 3), '#1d130c', { sd: 0, hd: 0.3 }); },
  sk_bloodlust: g => { T(g, blob([[0, -16], [9, 0], [8, 9], [0, 14], [-8, 9], [-9, 0]], 0.6), '#c0392b', { light: '#ff8a8a' }); flat(g, ellipse(-3, 2, 2.5, 4), 'rgba(255,255,255,0.6)', 0); },
  sk_chain: g => { bolt(g, [[-14, -8], [-6, 2], [-2, -6], [6, 6], [10, -2], [15, 10]]); for (const [x, y] of [[-14, -8], [6, 6], [15, 10]]) T(g, circle(x, y, 4), '#8a8378', { sd: 0.6, hd: 0.4 }); },
  sk_thunder: g => { for (let i = 0; i < 4; i++) T(g, circle(-10 + i * 7, -8 + (i % 2) * 3, 8), '#6a6a7a', { sd: 1, hd: 0.6 }); bolt(g, [[2, -2], [-4, 7], [2, 7], [-3, 17]]); },
  sk_prison: g => { T(g, poly([[-12, -14], [12, -14], [15, 12], [-15, 12]]), '#bfe8ff', { light: '#ffffff', shade: '#7ab8e0' }); stroke(g, poly([[-6, -8], [-2, 2], [-6, 8]], false), 'rgba(255,255,255,0.9)', 1.6); },
  sk_blizzard: g => { snowflake(g, -5, -3, 11); snowflake(g, 10, 9, 6); },
  sk_salvo: g => { for (let i = 0; i < 3; i++) { g.save(); g.translate(-6 + i * 6, 8 - i * 7); g.rotate(-0.7); T(g, rrect(-9, -2.5, 15, 5, 2.4), '#d8cfc0', { sd: 0.6, hd: 0.4, lw: 1.6 }); T(g, poly([[6, -2.5], [11, 0], [6, 2.5]]), '#c0392b', { sd: 0, hd: 0, lw: 1.4 }); g.restore(); } },
  sk_firestorm: g => { flame(g, -7, 6, 0.9); flame(g, 7, 8, 1.0); },
  sk_pool: g => { T(g, ellipse(0, 6, 16, 8), '#7ae03a', { light: '#d8ffb0', shade: '#3a8a1a' }); for (const [x, y, r] of [[-6, -2, 3.5], [4, -8, 2.6], [8, 0, 2]]) T(g, circle(x, y, r), '#a8ff6a', { sd: 0.3, hd: 0.4, lw: 1.4 }); },
  sk_sheep: g => ICONS.sheep(g),
  // ---- upgrade icons ----
  up_range: g => { for (const r of [16, 10, 4]) T(g, circle(0, 0, r), r === 10 ? '#f4ead2' : '#c0392b', { sd: 0.8, hd: 0.5 }); },
  up_pierce: g => { shieldShape(g, 4, 2, 0.8, '#7a7a82'); arrowShape(g, -16, 12, 14, -12); },
  up_damage: g => { line(g, [[-12, 12], [12, -12]], OUT, 7); line(g, [[-12, 12], [12, -12]], '#d6dde4', 4); T(g, rrect(-14, 3, 10, 4, 1.4), '#c9a14a', { sd: 0, hd: 0 }); },
  up_crit: g => { T(g, star(0, 0, 17, 0.35, 8), '#ffd040', { light: '#fff6c0' }); },
  up_haste: g => { T(g, blob([[-14, 10], [-4, -6], [8, -14], [14, -10], [4, 0], [-8, 12]], 0.6), '#f2ead8'); for (let i = 0; i < 4; i++) line(g, [[-8 + i * 4, 8 - i * 4], [-2 + i * 4, 4 - i * 4]], alpha('#8a6a3a', 0.7), 1.2); },
  up_hp: g => { ICONS.heart(g); T(g, poly([[10, -12], [14, -12], [14, -8], [18, -8], [18, -4], [14, -4], [14, 0], [10, 0], [10, -4], [6, -4], [6, -8], [10, -8]]), '#7fe35a', { sd: 0.4, hd: 0.3, lw: 1.6 }); },
  up_armor: g => shieldShape(g, 0, 0, 1.1, '#7a8a9a'),
  up_respawn: g => hourglass(g, 0, 0, 1),
  up_regen: g => { T(g, poly([[-5, -15], [5, -15], [5, -5], [15, -5], [15, 5], [5, 5], [5, 15], [-5, 15], [-5, 5], [-15, 5], [-15, -5], [-5, -5]]), '#7fe35a', { light: '#d0ffb0' }); },
  up_discount: g => { coin(g, 0, 2, 14); line(g, [[-8, 2], [8, 2]], '#7a4a08', 4); },
  up_slow: g => { snowflake(g, 0, 0, 14); },
  up_radius: g => { stroke(g, circle(0, 0, 15), '#ffb040', 3); stroke(g, circle(0, 0, 9), '#ff8a30', 2.6); T(g, circle(0, 0, 5), '#3a3a40', { sd: 0.6, hd: 0.5 }); },
  up_concuss: g => { T(g, circle(-2, 4, 9), '#3a3a40', { sd: 1, hd: 0.8, light: '#8a8a96' }); for (let i = 0; i < 3; i++) T(g, star(-10 + i * 10, -12, 5, 0.4), '#ffe45a', { sd: 0.3, hd: 0.2, lw: 1.4 }); },
  up_cooldown: g => hourglass(g, 0, 0, 1),
  up_extra: g => { g.save(); g.scale(0.7, 0.7); g.translate(-8, -6); ICONS.skyfall(g); g.restore(); g.save(); g.scale(0.7, 0.7); g.translate(10, 10); ICONS.skyfall(g); g.restore(); },
  up_scorch: g => { flame(g, 0, 6, 1.2); },
  up_cataclysm: g => { g.save(); g.scale(1.25, 1.25); ICONS.skyfall(g); g.restore(); },
  up_third: g => { for (let i = 0; i < 3; i++) { g.save(); g.translate(-10 + i * 10, 2 - (i === 1 ? 4 : 0)); T(g, blob([[-6, 4], [-6, -3], [0, -8], [6, -3], [6, 4]], 0.6), '#9aa2aa', { sd: 0.8, hd: 0.6 }); T(g, ellipse(0, 4, 9, 2.4), '#8a929a', { sd: 0.3, hd: 0.2 }); g.restore(); } },
  up_javelin: g => { line(g, [[-15, 14], [12, -12]], OUT, 5); line(g, [[-15, 14], [12, -12]], '#9a7040', 2.6); T(g, poly([[9, -14], [17, -17], [14, -9]]), '#d6dde4', { sd: 0, hd: 0 }); },
  // ---- world map ----
  flag_stage: g => { line(g, [[-6, 18], [-6, -18]], OUT, 5); line(g, [[-6, 18], [-6, -18]], '#7a4a24', 3); banner(g, -5, -17, 22, 16, '#c0392b', { tail: true, wave: 1.5, emblem: (c, x, y) => crest(c, x - 1, y, 0.9) }); },
  flag_done: g => { line(g, [[-6, 18], [-6, -18]], OUT, 5); line(g, [[-6, 18], [-6, -18]], '#7a4a24', 3); banner(g, -5, -17, 22, 16, '#2f5fa8', { tail: true, wave: 1.5, emblem: (c, x, y) => crest(c, x - 1, y, 0.9) }); },
};
const TAU16 = PI * 2 / 16;

export function jobs() {
  const J = [];
  for (const [name, fn] of Object.entries(ICONS)) J.push({ name: 'icon/' + name, w: 48, h: 48, ax: 24, ay: 24, anims: { s: { frames: 1, single: true, draw: g => fn(g) } } });
  // tower icons rendered from the tower art
  const tj = towerJobs();
  const find = n => tj.find(j => j.name === n);
  const towerIcon = (iconName, jobName, s, dy) => {
    const job = find(jobName); if (!job) return;
    const a = Object.values(job.anims)[0];
    J.push({ name: 'icon/' + iconName, w: 48, h: 48, ax: 24, ay: 24, scale: 2, anims: { s: { frames: 1, single: true, draw: g => { g.save(); g.translate(0, dy); g.scale(s, s); a.draw(g, 0, 0, 1); const front = find(jobName + '_front'); if (front) Object.values(front.anims)[0].draw(g, 0, 0, 1); g.restore(); } } } });
  };
  towerIcon('archer', 't_archer1', 0.3, 15); towerIcon('barracks', 't_barracks1', 0.32, 13); towerIcon('mage', 't_mage1', 0.27, 16); towerIcon('artillery', 't_artillery1', 0.36, 10);
  towerIcon('archerA', 't_archerA', 0.21, 18); towerIcon('archerB', 't_archerB', 0.3, 13);
  towerIcon('barracksA', 't_barracksA', 0.3, 13); towerIcon('barracksB', 't_barracksB', 0.3, 13);
  towerIcon('mageA', 't_mageA', 0.21, 18); towerIcon('mageB', 't_mageB', 0.21, 18);
  towerIcon('artilleryA', 't_artilleryA', 0.33, 11); towerIcon('artilleryB', 't_artilleryB', 0.33, 11);
  return J;
}
