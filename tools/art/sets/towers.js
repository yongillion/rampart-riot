// Rampart Riot — tower sprites (original designs): build sites, 4 tower lines x 5 forms, crews and overlays
import { toon, flat, ellipse, circle, rrect, poly, blob, rect, dark, light, mix, alpha, OUT, glow, lg, rg, line, stroke, banner, pole, rng, star, wallBricks, planks, setOL, crescent } from '../lib/toon.js';
import { cylinder, cone, merlons, parapet, stakes, house, door, windowArch, foundation, cannonballs, keg, sandbag, torch, STONE, STONE_D, WOOD, WOOD_D, IRON, BRASS } from '../lib/build.js';
import { humanoid, Pose, WEAPONS } from '../lib/rig.js';

export const scale = 1.5;
const S = Math.sin, PI = Math.PI;

// ---------------- emblem helpers ----------------
function emblemTower(g, x, y, s = 1, col = '#f4ecd8') { // the Rampart crest: a crenellated tower
  g.save(); g.translate(x, y); g.scale(s, s);
  flat(g, poly([[-4, 5], [-4, -2], [-5, -2], [-5, -6], [-3, -6], [-3, -4], [-1, -4], [-1, -6], [1, -6], [1, -4], [3, -4], [3, -6], [5, -6], [5, -2], [4, -2], [4, 5]]), col, 0.7);
  g.restore();
}
function emblemArrow(g, x, y, col = '#f4ecd8') { line(g, [[x - 5, y + 5], [x + 5, y - 5]], col, 1.6); flat(g, poly([[x + 6, y - 6], [x + 1.5, y - 4.5], [x + 4.5, y - 1.5]]), col, 0); }
function emblemWolf(g, x, y, col = '#f4ecd8') { flat(g, poly([[x - 5, y + 4], [x - 4, y - 3], [x - 5, y - 7], [x - 2, y - 4], [x + 2, y - 4], [x + 5, y - 7], [x + 4, y - 3], [x + 5, y + 4], [x, y + 6]]), col, 0.6); }
function emblemStar(g, x, y, col = '#f6e7a8') { flat(g, star(x, y, 5, 0.42), col, 0.6); }

// ---------------- build site ----------------
function plot(g) {
  const R = rng(5);
  // soft ground shadow
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(0, 4, 54, 24, 0, 0, PI * 2); g.fill();
  // packed earth disc
  toon(g, ellipse(0, 0, 48, 21), '#9a7a4e', { sd: 2.5, hd: 1.2, lw: 1.6, detail: c => {
    c.fillStyle = 'rgba(70,45,20,0.18)';
    for (let i = 0; i < 26; i++) { c.beginPath(); c.ellipse(R.range(-40, 40), R.range(-16, 16), R.range(2, 5), R.range(1, 2.5), 0, 0, PI * 2); c.fill(); }
  } });
  // stone ring
  const n = 18;
  const stones = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2; stones.push({ a, x: Math.cos(a) * 47, y: Math.sin(a) * 20.5 }); }
  stones.sort((a, b) => a.y - b.y);
  for (const s of stones) {
    const w = 8.5 + R() * 2, h = 5.2 + R() * 1.4;
    toon(g, ellipse(s.x, s.y - 1, w * (0.55 + 0.45 * Math.abs(Math.sin(s.a))) , h), mix('#a8a297', '#8d877d', R()), { sd: 1.3, hd: 0.8, lw: 1.2 });
  }
  // wooden stake with a red pennant (back right)
  pole(g, 30, -34, -14, 2.2, '#7a4a24');
  banner(g, 31, -33, 12, 7, '#c0392b', { tail: true, wave: 1, lw: 1 });
}

// ---------------- construction animation ----------------
function construction(g, t) {
  const R = rng(9);
  plot(g);
  const h = 40 + t * 30;
  // scaffold poles
  for (const x of [-30, -10, 12, 30]) toon(g, rrect(x - 1.8, -h, 3.6, h - 4 + (x < 0 ? 0 : 2), 1.5), '#9a6a3a', { sd: 0.6, hd: 0.3, lw: 1.1 });
  for (let y = -12; y > -h; y -= 14) toon(g, rrect(-34, y - 2, 68, 3.4, 1.5), '#8a5a2a', { sd: 0.6, hd: 0.3, lw: 1.1 });
  // crates and stones
  toon(g, rrect(-38, -12, 16, 12, 2), '#b07a40', { sd: 1, hd: 0.6, lw: 1.2 });
  toon(g, ellipse(26, -4, 9, 6), STONE, { sd: 1, hd: 0.6, lw: 1.2 });
  // dust puffs
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2 + t * 3, r = 30 + 10 * S(t * 6 + i);
    g.fillStyle = `rgba(220,200,160,${0.5 - 0.3 * Math.abs(S(t * 4 + i))})`;
    g.beginPath(); g.arc(Math.cos(a) * r, -10 + Math.sin(a) * 10 - t * 12, 8 + 4 * S(i + t * 5), 0, PI * 2); g.fill();
  }
  // hammer
  g.save(); g.translate(4, -h - 6); g.rotate(-0.8 + S(t * PI * 6) * 0.7);
  toon(g, rrect(-1.2, -2, 2.4, 14, 1), '#7a4a24', { sd: 0.4, hd: 0.2, lw: 1 });
  toon(g, rrect(-5, -6, 10, 5, 1), IRON, { sd: 0.5, hd: 0.4, lw: 1 });
  g.restore();
}

// =====================================================================
// ARCHER LINE
// =====================================================================
const GREEN = '#4c8a3a', GREEN_D = '#2f5e24', TEAL = '#2f8a7a';

function archer1(g, front) {
  if (!front) {
    foundation(g, 40, 17, 9);
    // back legs
    for (const x of [-22, 22]) toon(g, rrect(x - 3, -64, 6, 58, 2.5), dark(WOOD, 0.1), { sd: 1, hd: 0.4, lw: 1.4 });
    // cross braces
    for (const [a, b] of [[[-28, -14], [26, -50]], [[28, -14], [-26, -50]]]) { line(g, [a, b], OUT, 4.4); line(g, [a, b], '#7a4a24', 2.6); }
    // front legs
    for (const x of [-30, 30]) toon(g, rrect(x - 3.5, -60, 7, 62, 3), WOOD, { sd: 1.4, hd: 0.6, lw: 1.5 });
    // deck
    cylinder(g, 0, -56, 40, 15, 7, '#9a6a3a', { kind: 'wood', topColor: '#b98a52', topDetail: (c, yt) => { c.strokeStyle = alpha('#5a3a1a', 0.5); c.lineWidth = 1; for (let x = -40; x < 40; x += 7) { c.beginPath(); c.moveTo(x, yt - 16); c.lineTo(x + 4, yt + 16); c.stroke(); } } });
    // back stakes
    stakes(g, 0, -63, 38, 14, 'back', 13, { color: '#9a6a3a' });
    // pennant
    pole(g, -30, -104, -66, 2.2);
    banner(g, -29, -102, 16, 10, GREEN, { tail: true, wave: 1.5, emblem: (c, x, y) => emblemArrow(c, x - 1, y, '#f4ecd8') });
    // ladder
    toon(g, rrect(14, -54, 3, 54, 1), '#7a4a24', { sd: 0.5, hd: 0.2, lw: 1 }); toon(g, rrect(24, -54, 3, 54, 1), '#7a4a24', { sd: 0.5, hd: 0.2, lw: 1 });
    for (let y = -50; y < 0; y += 8) line(g, [[16, y], [25, y]], '#5a3a1a', 2);
  } else {
    stakes(g, 0, -63, 38, 14, 'front', 9, { color: '#a87642' });
  }
}

function archer2(g, front) {
  if (!front) {
    foundation(g, 42, 18, 9);
    const yt = cylinder(g, 0, -2, 31, 12.5, 64, STONE, { rowH: 8, seed: 4, detail: (c, yt) => { windowArch(c, -10, yt + 28, 6, 12, null); } });
    // green banner on the front
    pole(g, 0, yt + 6, yt + 8, 0.1);
    banner(g, 4, yt + 6, 14, 26, GREEN, { tail: true, wave: 0.8, emblem: (c, x, y) => emblemArrow(c, x, y + 2) });
    // wooden balcony deck
    for (const [x, y0] of [[-30, yt + 18], [30, yt + 18]]) { line(g, [[x * 0.95, y0], [x * 1.25, yt + 2]], OUT, 4); line(g, [[x * 0.95, y0], [x * 1.25, yt + 2]], WOOD, 2.4); }
    cylinder(g, 0, yt + 4, 39, 15, 7, '#9a6a3a', { kind: 'wood', topColor: '#b98a52' });
    // railing posts back
    stakes(g, 0, yt - 3, 37, 14, 'back', 11, { color: '#8a5a32', n: 16 });
    // pennant on a tall pole
    pole(g, 26, yt - 46, yt - 4, 2.2);
    banner(g, 27, yt - 45, 18, 11, '#e8e0c8', { tail: true, wave: 1.6, emblem: (c, x, y) => emblemArrow(c, x - 1, y, GREEN_D) });
  } else {
    const yt = -66;
    const n = 16, items = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2; if (S(a) > -0.05) items.push([Math.cos(a) * 37, yt - 3 + S(a) * 14]); }
    items.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of items) toon(g, rrect(x - 1.8, y - 12, 3.6, 13, 1.2), '#8a5a32', { sd: 0.6, hd: 0.3, lw: 1.1 });
    const rail = new Path2D(); rail.ellipse(0, yt - 13, 37, 14, 0, 0.02, PI - 0.02, false);
    g.lineWidth = 4.4; g.strokeStyle = OUT; g.stroke(rail); g.lineWidth = 2.6; g.strokeStyle = '#a87642'; g.stroke(rail);
  }
}

function archer3(g, front) {
  const yt = -84;
  if (!front) {
    foundation(g, 44, 19, 10);
    cylinder(g, 0, -2, 33, 13, 82, '#a29d93', { rowH: 8, seed: 6, topColor: '#8d877d', detail: (c, y) => { windowArch(c, -12, y + 34, 6, 13, null); windowArch(c, 12, y + 56, 5, 10, null); } });
    // banners left & right
    for (const [x, side] of [[-26, -1], [26, 1]]) { pole(g, x, yt + 4, yt + 6, 0.1); banner(g, x - 7, yt + 6, 14, 30, GREEN, { tail: true, wave: 0.6, trim: '#e8c45a', emblem: (c, ex, ey) => emblemArrow(c, ex, ey + 3) }); }
    parapet(g, 0, yt, 36, 14, 9, '#a29d93', 'back');
    // tall pennant
    pole(g, -24, yt - 52, yt - 8, 2.4);
    banner(g, -23, yt - 51, 22, 12, GREEN, { tail: true, wave: 2, emblem: (c, x, y) => emblemArrow(c, x - 2, y, '#f4ecd8') });
  } else {
    parapet(g, 0, yt, 36, 14, 9, '#a29d93', 'front');
    merlons(g, 0, yt - 9, 36, 14, 'front', '#a8a399', { n: 12, h: 6, w: 7 });
  }
}

function archerA(g, front, t = 0) {
  const yt = -94;
  const W = '#d9d4c6';
  if (!front) {
    foundation(g, 44, 19, 10, '#b8b2a6');
    cylinder(g, 0, -2, 30, 12, 92, W, { rowH: 9, seed: 8, mortar: alpha('#5a5040', 0.35), topColor: '#c8c2b4', bands: [24, 60], bandColor: TEAL, detail: (c, y) => { windowArch(c, 0, y + 42, 7, 15, null); } });
    // streaming pennants
    for (const [x, ph] of [[-24, 0], [24, 1.5]]) { pole(g, x, yt - 40, yt + 30, 2); banner(g, x + 1, yt - 39, 30, 8, x < 0 ? TEAL : GREEN, { tail: true, wave: 3, phase: ph + t * PI * 2 }); }
    parapet(g, 0, yt, 34, 13, 8, W, 'back');
    // hawk weather vane at the back
    pole(g, 10, yt - 70, yt - 6, 2);
    g.save(); g.translate(10, yt - 72); g.rotate(S(t * PI * 2) * 0.15);
    toon(g, blob([[-10, 0], [-2, -3], [6, -2], [12, 0], [6, 2], [-2, 2]], 0.6), BRASS, { sd: 0.6, hd: 0.5, lw: 1.1 });
    toon(g, poly([[-2, -2], [-8, -9], [3, -3]]), BRASS, { sd: 0.4, hd: 0.3, lw: 1 });
    g.restore();
  } else {
    parapet(g, 0, yt, 34, 13, 8, W, 'front');
    merlons(g, 0, yt - 8, 34, 13, 'front', '#e2ddcf', { n: 12, h: 5, w: 6 });
    const band = new Path2D(); band.ellipse(0, yt - 3, 34.5, 13.5, 0, 0.1, PI - 0.1, false); g.lineWidth = 2.4; g.strokeStyle = TEAL; g.stroke(band);
  }
}

function archerB(g) {
  const G = '#7d7a76';
  foundation(g, 48, 20, 10, '#86827b');
  const yt = cylinder(g, 0, -2, 44, 17, 50, G, { rowH: 9, seed: 12, bands: [10, 38], bandColor: '#4a4d54', topColor: '#6e6b66', detail: (c, y) => { for (const x of [-26, 0, 26]) { toon(c, rrect(x - 3, y + 20, 6, 12, 2), '#1f150e', { sd: 0, hd: 0, lw: 1.2 }); } } });
  merlons(g, 0, yt, 44, 17, 'back', '#8a8781', { n: 14, h: 7, w: 8 });
  // turntable
  cylinder(g, 0, yt + 2, 22, 8.5, 5, '#5d6168', { bricks: false, topColor: '#73777e' });
  merlons(g, 0, yt, 44, 17, 'front', '#8a8781', { n: 14, h: 7, w: 8 });
  // grey banners
  for (const x of [-30, 30]) banner(g, x - 6, yt + 6, 12, 22, '#5a5f7a', { tail: true, wave: 0.5, emblem: (c, ex, ey) => emblemTower(c, ex, ey + 2, 0.8) });
}

// crew: archers on top of archer towers
const archerMan = humanoid({ h: 27, headR: 5.4, skin: '#f0c49a', hair: '#5b3a1e', shirt: '#4c7a37', torsoStyle: 'tunic', pants: '#5a4630', boots: '#3d2a1c', helmet: 'cap', helmColor: '#3f6a2a', feather: '#efe6cc', bow: true, bowScale: 0.75, belt: '#4a2e18', sleeve: '#5f4a32', glove: '#7a5a3a', lw: 1.3 });
const ranger = humanoid({ h: 28, headR: 5.4, skin: '#e8b88e', hair: '#3a2410', shirt: '#2f6a5e', torsoStyle: 'tunic', cape: '#2a5a50', pants: '#3f4a3a', boots: '#3a2a1c', helmet: 'hood', helmColor: '#2f6a5e', bow: true, bowScale: 0.85, bowColor: '#d8c890', belt: '#5a3a1a', sleeve: '#2f5a50', glove: '#6a4a2a', lw: 1.3 });

function arbalest(g, t, firing) {
  // operator behind the weapon
  const op = humanoid({ h: 26, headR: 5.2, skin: '#e8b88e', shirt: '#5a5f7a', torsoStyle: 'mail', pants: '#4a4d54', boots: '#2a2a30', helmet: 'nasal', helmColor: '#9aa1a8', sleeve: '#5a5f7a', glove: '#5a4a3a', lw: 1.3 });
  const kick = firing ? Math.max(0, S(Math.min(1, t * 2.2) * PI)) : 0;
  const p = Pose.aim(firing ? 0.3 + t * 0.4 : 0.2);
  g.save(); g.translate(-14 - kick * 2, -2); op.draw(g, p); g.restore();
  // big crossbow on a pivot post
  toon(g, rrect(-3, -16, 6, 16, 2), '#4a4d54', { sd: 0.8, hd: 0.5, lw: 1.3 });
  g.save(); g.translate(-kick * 3, -18);
  toon(g, rrect(-16, -3, 40, 6, 2), '#7a4a24', { sd: 1, hd: 0.6, lw: 1.4 });
  const draw = firing ? (t < 0.25 ? 0 : Math.min(1, (t - 0.25) * 2)) : 1;
  const arms = new Path2D(); arms.moveTo(18, -16); arms.quadraticCurveTo(26 - draw * 2, 0, 18, 16);
  stroke(g, arms, OUT, 5); stroke(g, arms, '#9aa1a8', 3);
  line(g, [[18, -16], [18 - 14 * draw, 0], [18, 16]], '#efe8d8', 1.1);
  if (draw > 0.6) { toon(g, rrect(18 - 14 * draw, -1.2, 20, 2.4, 1), '#5a3a1a', { sd: 0, hd: 0, lw: 0.8 }); flat(g, poly([[24 - 14 * draw + 14, -2.5], [29 - 14 * draw + 14, 0], [24 - 14 * draw + 14, 2.5]]), '#cfd6dc', 0.8); }
  toon(g, circle(-14, 0, 3.4), BRASS, { sd: 0.5, hd: 0.4, lw: 1 });
  g.restore();
}

// =====================================================================
// BARRACKS LINE
// =====================================================================
const RED = '#b03a2a', RED_D = '#7a2418';

function barracks1(g) {
  foundation(g, 44, 18, 6, '#8d877d');
  const h = house(g, 0, -2, 64, 36, 30, { wall: '#a8784a', wallKind: 'logs', roof: '#c8a45a', roofKind: 'thatch', depth: 16, overhang: 9 });
  door(g, -4, -2, 18, 26, { color: '#1f150e', wood: '#7a4a24', glowColor: '#ff9a40' });
  // small window
  toon(g, rrect(16, -28, 9, 8, 1.5), '#1f150e', { sd: 0, hd: 0, lw: 1.2 });
  // weapon rack with spears (left)
  for (let i = 0; i < 3; i++) { line(g, [[-40 + i * 4, -2], [-37 + i * 4, -42]], OUT, 3); line(g, [[-40 + i * 4, -2], [-37 + i * 4, -42]], '#8a6038', 1.6); flat(g, poly([[-38.6 + i * 4, -42], [-37 + i * 4, -48], [-35.4 + i * 4, -42]]), '#cfd6dc', 0.9); }
  toon(g, rrect(-44, -24, 16, 3, 1), WOOD_D, { sd: 0.4, hd: 0.2, lw: 1 });
  // red flag
  pole(g, 38, -84, -4, 2.3);
  banner(g, 39, -83, 18, 12, RED, { tail: true, wave: 1.6, emblem: (c, x, y) => emblemTower(c, x - 1, y, 0.7) });
  // fence posts front corners
  for (const x of [-46, -38, 38, 46]) toon(g, rrect(x - 1.8, -8, 3.6, 12, 1), '#9a6a3a', { sd: 0.5, hd: 0.3, lw: 1 });
  line(g, [[-47, -3], [-36, -3]], OUT, 3); line(g, [[-47, -3], [-36, -3]], '#9a6a3a', 1.6);
  line(g, [[36, -3], [47, -3]], OUT, 3); line(g, [[36, -3], [47, -3]], '#9a6a3a', 1.6);
}

function shieldOnWall(g, x, y, col, rim = '#d8b052') {
  const p = blob([[x - 6, y - 7], [x + 6, y - 7], [x + 6, y], [x, y + 8], [x - 6, y]], 0.35);
  toon(g, p, col, { sd: 1, hd: 0.6, lw: 1.2 });
  stroke(g, blob([[x - 4.6, y - 5.6], [x + 4.6, y - 5.6], [x + 4.6, y], [x, y + 6.4], [x - 4.6, y]], 0.35), rim, 0.9);
}

function barracks2(g) {
  foundation(g, 46, 19, 6, '#8d877d');
  house(g, 0, -2, 70, 40, 30, { wall: '#a39e94', wallKind: 'stone', roof: '#9a4a2e', roofKind: 'shingle', depth: 16, overhang: 9, seed: 7,
    gableDetail: (c, cx, ya, yt) => { toon(c, circle(cx, yt - 12, 5), '#1f150e', { sd: 0, hd: 0, lw: 1.2 }); } });
  door(g, 0, -2, 20, 29, { color: '#1f150e', wood: '#6b4022', glowColor: '#ff9a40' });
  shieldOnWall(g, -22, -28, RED); shieldOnWall(g, 22, -28, '#3a6fc4');
  pole(g, -42, -90, -4, 2.3);
  banner(g, -41, -89, 20, 13, RED, { tail: true, wave: 1.6, emblem: (c, x, y) => emblemTower(c, x - 1, y, 0.75) });
  // barrels
  keg(g, 40, 2, 0.9); keg(g, 48, 4, 0.8, '#7a4a24');
}

function barracks3(g) {
  foundation(g, 48, 20, 7, '#8d877d');
  // side turret (behind)
  cylinder(g, 34, -10, 13, 5.5, 54, '#a39e94', { rowH: 8, seed: 11, topColor: '#8d877d' });
  cone(g, 34, -64, 16, 6, -94, '#3d4f6e', { rows: 4 });
  house(g, -4, -2, 72, 44, 30, { wall: '#aaa59b', wallKind: 'stone', roof: '#3d4f6e', roofKind: 'shingle', depth: 14, overhang: 9, seed: 13,
    gableDetail: (c, cx, ya, yt) => { /* crest */ } });
  door(g, -4, -2, 22, 32, { color: '#1f150e', wood: '#5a3a1e', glowColor: '#ffa040' });
  // crest above door: crossed swords & shield
  line(g, [[-16, -50], [8, -38]], OUT, 3.4); line(g, [[-16, -50], [8, -38]], '#d6dde4', 1.8);
  line(g, [[8, -50], [-16, -38]], OUT, 3.4); line(g, [[8, -50], [-16, -38]], '#d6dde4', 1.8);
  shieldOnWall(g, -4, -42, '#3a6fc4');
  g.save(); emblemTower(g, -4, -43, 0.55); g.restore();
  for (const x of [-38, 30]) banner(g, x - 6, -40, 12, 26, RED, { tail: true, wave: 0.5, trim: '#e8c45a', emblem: (c, ex, ey) => emblemTower(c, ex, ey + 2, 0.6) });
}

function barracksA(g) {
  const B = '#a8a49c';
  foundation(g, 50, 21, 8, '#8d877d');
  // square keep
  const x0 = -36, x1 = 36, yb = -4, yt = -66;
  toon(g, poly([[x1, yb], [x1, yt], [x1 + 12, yt - 7], [x1 + 12, yb - 7]]), dark(B, 0.15), { sd: 0.8, hd: 0, lw: 1.7, detail: c => wallBricks(c, x1, yt - 8, x1 + 12, yb, { rowH: 8, bw: 12, seed: 3 }) });
  toon(g, rect(x0, yt, x1 - x0, yb - yt), B, { sd: 1.8, hd: 0.8, lw: 1.9, detail: c => wallBricks(c, x0, yt, x1, yb, { rowH: 8, bw: 15, seed: 5, tint: true }) });
  // top walkway & merlons
  toon(g, poly([[x0, yt], [x0 + 12, yt - 7], [x1 + 12, yt - 7], [x1, yt]]), '#8d877d', { sd: 0, hd: 0.5, lw: 1.5 });
  for (let x = x0; x < x1 - 2; x += 12) toon(g, rrect(x, yt - 8, 8, 9, 1), B, { sd: 1, hd: 0.5, lw: 1.3 });
  // gate
  door(g, 0, yb, 24, 34, { color: '#1a120c', wood: '#5a3a1e', glowColor: '#ffa040' });
  toon(g, rrect(-14, yb - 36, 28, 4, 1), '#6e6a63', { sd: 0.6, hd: 0.4, lw: 1.2 });
  // large kite shield emblem with the Rampart crest
  const sh = blob([[-12, -64], [12, -64], [11, -50], [0, -38], [-11, -50]], 0.35);
  toon(g, sh, '#2f5fa8', { sd: 1.6, hd: 1, lw: 1.6 });
  stroke(g, blob([[-10, -62], [10, -62], [9, -50], [0, -40.5], [-9, -50]], 0.35), '#e2c25a', 1.2);
  emblemTower(g, 0, -53, 0.95);
  // blue banners
  for (const x of [-30, 30]) { banner(g, x - 6, yt + 4, 12, 30, '#2f5fa8', { tail: true, wave: 0.4, trim: '#e2c25a', emblem: (c, ex, ey) => emblemTower(c, ex, ey + 3, 0.6) }); }
  pole(g, 24, yt - 40, yt - 6, 2.2);
  banner(g, 25, yt - 39, 20, 12, '#2f5fa8', { tail: true, wave: 1.6, emblem: (c, ex, ey) => emblemTower(c, ex - 1, ey, 0.6) });
}

function barracksB(g, t = 0) {
  foundation(g, 48, 20, 6, '#857f75');
  house(g, 0, -2, 74, 34, 40, { wall: '#8a5a32', wallKind: 'logs', roof: '#5a3a1e', roofKind: 'shingle', depth: 16, overhang: 10, seed: 17 });
  // crossed wolf-head gable carvings
  for (const s of [-1, 1]) {
    g.save(); g.translate(s * 5, -78); g.scale(s, 1);
    toon(g, poly([[0, 0], [12, -14], [16, -12], [15, -8], [20, -8], [10, 2]]), '#6b4423', { sd: 0.8, hd: 0.5, lw: 1.2 });
    g.restore();
  }
  // pelt hanging on the wall
  toon(g, blob([[-28, -32], [-16, -34], [-14, -18], [-18, -10], [-26, -12], [-30, -20]], 0.6), '#a29a8c', { sd: 1, hd: 0.5, lw: 1.2 });
  door(g, 6, -2, 20, 26, { color: '#1a120c', wood: '#5a3a1e', glowColor: '#ff9030' });
  for (const x of [-44, 44]) banner(g, x - 6, -60, 12, 30, '#a02a1a', { tail: true, wave: 0.6, emblem: (c, ex, ey) => emblemWolf(c, ex, ey + 2) });
  torch(g, -30, -2, t); torch(g, 34, -2, t + 0.4);
  // war drum
  toon(g, ellipse(-46, -10, 7, 3), '#d8c8a0', { sd: 0.5, hd: 0.3, lw: 1.1 });
  toon(g, rrect(-53, -10, 14, 10, 2), '#8a3a1a', { sd: 0.8, hd: 0.4, lw: 1.2 });
}

// =====================================================================
// MAGE LINE
// =====================================================================
const PURPLE = '#6a48b8', PURPLE_D = '#43307a';

function orb(g, x, y, r, col, pulse) {
  glow(g, x, y, r * (3.4 + pulse * 1.5), col, 0.55 + pulse * 0.3);
  toon(g, circle(x, y, r), mix(col, '#ffffff', 0.25 + pulse * 0.3), { sd: 0.8, hd: 1.2, lw: 1.2, light: '#ffffff' });
  flat(g, circle(x - r * 0.35, y - r * 0.35, r * 0.3), 'rgba(255,255,255,0.85)', 0);
}
function crystal(g, x, y, s, col, rot = 0, pulse = 0) {
  glow(g, x, y, 22 * s * (1 + pulse * 0.6), col, 0.5 + pulse * 0.35);
  g.save(); g.translate(x, y); g.scale(Math.cos(rot) * 0.35 + 0.65, 1);
  const p = poly([[0, -14 * s], [7 * s, -3 * s], [5 * s, 9 * s], [0, 14 * s], [-5 * s, 9 * s], [-7 * s, -3 * s]]);
  toon(g, p, mix(col, '#ffffff', 0.15 + pulse * 0.3), { sd: 2 * s, hd: 1.5 * s, lw: 1.3, light: '#ffffff' });
  line(g, [[0, -14 * s], [0, 14 * s]], alpha('#ffffff', 0.6), 0.8);
  g.restore();
}
function runes(g, cx, y, rx, ry, col, t) {
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * PI + 0.2;
    const x = cx + Math.cos(a) * rx * 0.92, yy = y + S(a) * ry * 0.9;
    const k = 0.5 + 0.5 * S(t * PI * 2 + i);
    g.fillStyle = alpha(col, 0.35 + 0.5 * k);
    g.font = '700 7px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('ᚱᚨᛗᛈᚨᚱᛏ'[i % 7], x, yy);
  }
}

function mage1(g, t, fire) {
  foundation(g, 36, 15, 9, '#9a958c');
  const yt = cylinder(g, 0, -2, 23, 9, 60, '#a8a39a', { rowH: 8, cols: 6, seed: 31, detail: (c, y) => { windowArch(c, 0, y + 26, 7, 14, PURPLE); runes(c, 0, y + 46, 23, 9, '#b89aff', t); } });
  cone(g, 0, yt + 2, 30, 11, yt - 40, PURPLE, { rows: 6 });
  pole(g, 0, yt - 52, yt - 38, 2, BRASS);
  const pulse = fire ? Math.max(0, 1 - t * 1.4) : 0.4 + 0.3 * S(t * PI * 2);
  orb(g, 0, yt - 56, 5.5, '#c9a2ff', pulse);
}
function mage2(g, t, fire) {
  foundation(g, 38, 16, 9, '#9a958c');
  const yt = cylinder(g, 0, -2, 25, 10, 72, '#aaa59c', { rowH: 8, cols: 6, seed: 33, bands: [8], bandColor: PURPLE_D, detail: (c, y) => { windowArch(c, 0, y + 32, 8, 16, PURPLE); runes(c, 0, y + 58, 25, 10, '#c9b0ff', t); } });
  cone(g, 0, yt + 2, 33, 12, yt - 46, PURPLE, { rows: 7 });
  // floating rune stones orbiting
  for (let i = 0; i < 2; i++) {
    const a = t * PI * 2 + i * PI;
    const x = Math.cos(a) * 34, y = yt - 18 + S(a) * 10;
    toon(g, rrect(x - 3.5, y - 5, 7, 10, 1.5), '#8a849a', { sd: 0.8, hd: 0.5, lw: 1.1, detail: c => { c.fillStyle = '#d8c8ff'; c.font = '700 6px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ᛟ', x, y); } });
  }
  pole(g, 0, yt - 60, yt - 44, 2, BRASS);
  const pulse = fire ? Math.max(0, 1 - t * 1.4) : 0.4 + 0.3 * S(t * PI * 2);
  orb(g, 0, yt - 64, 6.2, '#c9a2ff', pulse);
}
function mage3(g, t, fire) {
  foundation(g, 40, 17, 10, '#9a958c');
  const yt = cylinder(g, 0, -2, 26, 10.5, 84, '#b0aba1', { rowH: 8, cols: 7, seed: 35, bands: [10, 46], bandColor: PURPLE_D, detail: (c, y) => { windowArch(c, 0, y + 36, 8, 16, PURPLE); runes(c, 0, y + 68, 26, 10.5, '#d0b8ff', t); } });
  // crown ring of pillars
  for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; const x = Math.cos(a) * 24, y = yt + S(a) * 9.5; if (S(a) < 0) toon(g, rrect(x - 2.5, y - 16, 5, 16, 1.5), '#9a95a8', { sd: 0.8, hd: 0.4, lw: 1.1 }); }
  cylinder(g, 0, yt, 28, 11, 4, '#8a849a', { bricks: false, topColor: '#5a4a8a' });
  const bob = S(t * PI * 2) * 3;
  const pulse = fire ? Math.max(0, 1 - t * 1.3) : 0.35 + 0.25 * S(t * PI * 2);
  // arcane ring
  g.save(); g.globalAlpha = 0.6 + pulse * 0.4; const ring = new Path2D(); ring.ellipse(0, yt - 26 + bob, 22, 7, 0, 0, PI * 2); stroke(g, ring, '#b48aff', 1.6); g.restore();
  crystal(g, 0, yt - 30 + bob, 1.05, '#b48aff', t * PI * 2, pulse);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; const x = Math.cos(a) * 24, y = yt + S(a) * 9.5; if (S(a) >= 0) toon(g, rrect(x - 2.5, y - 16, 5, 16, 1.5), '#a8a3b8', { sd: 0.8, hd: 0.4, lw: 1.1 }); }
}
function mageA(g, t, fire) {
  const D = '#6a6670';
  foundation(g, 40, 17, 10, '#7a766e');
  const yt = cylinder(g, 0, -2, 26, 10.5, 88, D, { rowH: 8, cols: 7, seed: 37, bands: [6, 30, 54], bandColor: '#b8743a', detail: (c, y) => { windowArch(c, 0, y + 70, 7, 13, '#5ab8ff'); } });
  // copper coil spiral
  for (let i = 0; i < 18; i++) { const a = i * 0.7; const x = Math.cos(a) * 27, y = yt + 8 + i * 2.2 + S(a) * 10; if (S(a) > 0) toon(g, circle(x, y, 2.2), '#c87a3a', { sd: 0.4, hd: 0.3, lw: 0.9 }); }
  // prongs
  for (const s of [-1, 1]) { line(g, [[s * 14, yt], [s * 18, yt - 30]], OUT, 4); line(g, [[s * 14, yt], [s * 18, yt - 30]], '#c87a3a', 2.2); toon(g, circle(s * 18, yt - 31, 2.6), '#e8a05a', { sd: 0.3, hd: 0.3, lw: 0.9 }); }
  const pulse = fire ? Math.max(0, 1 - t * 1.3) : 0.35 + 0.3 * S(t * PI * 4);
  crystal(g, 0, yt - 30, 1.0, '#7ac8ff', t * PI * 2, pulse);
  // arcs
  const R = rng(Math.floor(t * 8) + 3);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < (fire ? 4 : 2); k++) {
    const s = R() < 0.5 ? -1 : 1; let x = 0, y = yt - 30;
    g.beginPath(); g.moveTo(x, y);
    for (let i = 1; i <= 4; i++) { x += (s * 18 - 0) / 4 + (R() - 0.5) * 6; y += (0 - 30 * -1 - 30) / 4 + (R() - 0.5) * 6; g.lineTo(s * 4.5 * i + (R() - 0.5) * 4, yt - 30 + (-1) * (i * 0.3) + (R() - 0.5) * 8); }
    g.strokeStyle = 'rgba(160,220,255,0.9)'; g.lineWidth = 1.2; g.stroke();
  }
  g.restore();
  // storm cloud
  g.save(); g.globalAlpha = 0.85;
  for (let i = 0; i < 5; i++) { const x = -18 + i * 9, y = yt - 52 + S(t * PI * 2 + i) * 1.5; toon(g, circle(x, y, 7 + (i % 2) * 2), '#5a5a6a', { sd: 1.2, hd: 0.8, lw: 1.1 }); }
  g.restore();
}
function mageB(g, t, fire) {
  const I = '#b8d4e2';
  foundation(g, 40, 17, 10, '#9aa6ae');
  const yt = cylinder(g, 0, -2, 25, 10, 86, I, { rowH: 9, cols: 7, seed: 39, mortar: alpha('#3a5a7a', 0.35), topColor: '#cfe6f2', bands: [12], bandColor: '#5a8ab0', detail: (c, y) => { windowArch(c, 0, y + 40, 7, 14, '#7ad8ff'); } });
  // ice spikes around the body
  for (const [x, y, h, s] of [[-26, -20, 22, -1], [26, -24, 26, 1], [-24, -58, 16, -1], [25, -64, 18, 1], [-12, -6, 14, -1], [14, -8, 12, 1]]) {
    toon(g, poly([[x, y], [x + s * h * 0.55, y - h], [x + s * 3, y + 3]]), '#dff4ff', { sd: 0.8, hd: 0.8, lw: 1.1, light: '#ffffff' });
  }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; const x = Math.cos(a) * 22, y = yt + S(a) * 8.5; toon(g, poly([[x - 3, y], [x, y - 12 - (i % 2) * 6], [x + 3, y]]), '#e8f8ff', { sd: 0.5, hd: 0.5, lw: 1 }); }
  const bob = S(t * PI * 2) * 2.5;
  const pulse = fire ? Math.max(0, 1 - t * 1.3) : 0.35 + 0.25 * S(t * PI * 2);
  crystal(g, 0, yt - 26 + bob, 1.0, '#9fe8ff', -t * PI * 2, pulse);
  // snowflakes
  for (let i = 0; i < 6; i++) { const a = t * PI * 2 + i; const x = Math.cos(a) * 30, y = yt - 20 + ((i * 13 + t * 40) % 40) - 10; g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(x, y, 1.3, 0, PI * 2); g.fill(); }
}

// =====================================================================
// ARTILLERY LINE
// =====================================================================
const gunner = humanoid({ h: 30, headR: 6, skin: '#e8b88e', hair: '#5a3a1e', shirt: '#8a5a32', torsoStyle: 'tunic', pants: '#4a3a2a', boots: '#2a1e14', helmet: 'kettle', helmColor: '#7d8288', sleeve: '#7a4a24', glove: '#4a3020', belt: '#3a2a1a', apron: true, lw: 1.3, mustache: '#6a4020' });

function mortar(g, x, y, s, t, fire, col = '#a87a3a', ang = -0.75) {
  const kick = fire ? Math.max(0, S(Math.min(1, t * 3) * PI)) * (1 - Math.min(1, t)) : 0;
  g.save(); g.translate(x, y + kick * 3 * s);
  // base block
  toon(g, rrect(-12 * s, -8 * s, 24 * s, 9 * s, 2 * s), '#6b4423', { sd: 1, hd: 0.5, lw: 1.3 });
  g.rotate(ang);
  const barrel = blob([[-7 * s, 2 * s], [-8 * s, -6 * s], [-6 * s, -18 * s], [6 * s, -18 * s], [8 * s, -6 * s], [7 * s, 2 * s]], 0.5);
  toon(g, barrel, col, { sd: 1.8 * s, hd: 1.2 * s, lw: 1.5, light: light(col, 0.2) });
  toon(g, ellipse(0, -18 * s, 7 * s, 2.6 * s), dark(col, 0.25), { sd: 0, hd: 0, lw: 1.3 });
  flat(g, ellipse(0, -18 * s, 4.8 * s, 1.6 * s), '#1a1210', 0);
  for (const yy of [-4, -12]) { g.fillStyle = dark(col, 0.3); g.fillRect(-7.6 * s, yy * s, 15.2 * s, 2 * s); }
  if (fire && t < 0.35) { glow(g, 0, -24 * s, 24 * s, '#ffb040', 0.9 * (1 - t / 0.35)); flat(g, star(0, -24 * s, 9 * s * (1 - t), 0.45, 7), '#fff2a0', 0); }
  g.restore();
  if (fire && t > 0.1) { for (let i = 0; i < 4; i++) { const k = (t - 0.1) / 0.9; g.fillStyle = `rgba(220,215,205,${0.75 * (1 - k)})`; g.beginPath(); g.arc(x + 12 * s + i * 4 * s * k + 10 * k * s, y - 20 * s - 14 * k * s - i * 3, (5 + 6 * k + i) * s, 0, PI * 2); g.fill(); } }
}

function artillery1(g, t, fire) {
  foundation(g, 44, 18, 6, '#8d877d');
  // timber & sandbag ring (back)
  for (let i = 0; i < 9; i++) { const a = PI + (i / 8) * PI; sandbag(g, Math.cos(a) * 36, -6 + S(a) * 14, 14, 7); }
  cannonballs(g, -28, -4, 6);
  mortar(g, 4, -8, 1, t, fire);
  const p = fire ? Pose.hurt(Math.min(1, t * 1.5)) : Pose.idle(t);
  g.save(); g.translate(28, -6); gunner.draw(g, p); g.restore();
  for (let i = 0; i < 7; i++) { const a = (i / 6) * PI; sandbag(g, Math.cos(a) * 38, -2 + S(a) * 14, 15, 7.5); }
}
function artillery2(g, t, fire) {
  foundation(g, 46, 19, 6, '#8d877d');
  const yt = cylinder(g, 0, -2, 40, 16, 14, '#9a958c', { rowH: 7, seed: 41, topColor: '#7d776d' });
  keg(g, -26, yt + 2, 0.9); keg(g, -17, yt + 4, 0.8, '#7a4a24');
  cannonballs(g, 18, yt + 8, 3);
  mortar(g, 0, yt + 2, 1.25, t, fire, '#55585e', -0.7);
  const p = fire ? Pose.hurt(Math.min(1, t * 1.5)) : Pose.idle(t);
  g.save(); g.translate(30, yt + 4); gunner.draw(g, p); g.restore();
}
function artillery3(g, t, fire) {
  foundation(g, 48, 20, 7, '#8d877d');
  const yt = cylinder(g, 0, -2, 42, 17, 24, '#a39e94', { rowH: 8, seed: 43, topColor: '#857f75' });
  merlons(g, 0, yt, 42, 17, 'back', '#aaa59b', { n: 12, h: 6, w: 8 });
  // great bombard on a cradle
  const kick = fire ? Math.max(0, S(Math.min(1, t * 3) * PI)) * (1 - Math.min(1, t)) : 0;
  g.save(); g.translate(-4 - kick * 5, yt + 2);
  toon(g, rrect(-18, -10, 34, 10, 2), '#5a3a1e', { sd: 1, hd: 0.5, lw: 1.4 });
  for (const x of [-12, 10]) { toon(g, circle(x, -2, 6), '#6b4423', { sd: 1, hd: 0.6, lw: 1.3 }); toon(g, circle(x, -2, 2), IRON, { sd: 0.3, hd: 0.2, lw: 0.9 }); }
  g.rotate(-0.55);
  const barrel = blob([[-12, 4], [-12, -8], [-9, -40], [9, -40], [12, -8], [12, 4]], 0.4);
  toon(g, barrel, '#b88a3a', { sd: 2, hd: 1.4, lw: 1.6, light: '#f2d28a' });
  for (const yy of [-6, -18, -30]) { g.fillStyle = '#7a5418'; g.fillRect(-11, yy, 22, 2.5); }
  toon(g, ellipse(0, -40, 9.5, 3.4), '#7a5418', { sd: 0, hd: 0, lw: 1.3 });
  flat(g, ellipse(0, -40, 6.5, 2.2), '#1a1210', 0);
  if (fire && t < 0.35) { glow(g, 0, -48, 34, '#ffb040', 0.9 * (1 - t / 0.35)); flat(g, star(0, -48, 13 * (1 - t), 0.45, 8), '#fff2a0', 0); }
  g.restore();
  if (fire && t > 0.1) { const k = (t - 0.1) / 0.9; for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(220,215,205,${0.75 * (1 - k)})`; g.beginPath(); g.arc(16 + i * 5 * k + 14 * k, yt - 34 - 18 * k - i * 3, 7 + 8 * k + i, 0, PI * 2); g.fill(); } }
  const p = fire ? Pose.hurt(Math.min(1, t * 1.5)) : Pose.idle(t);
  g.save(); g.translate(-30, yt + 6); gunner.draw(g, Object.assign(p, {})); g.restore();
  merlons(g, 0, yt, 42, 17, 'front', '#aaa59b', { n: 12, h: 6, w: 8 });
}
function artilleryA(g, t, fire) {
  foundation(g, 46, 19, 6, '#8d877d');
  const yt = cylinder(g, 0, -2, 40, 16, 12, '#8a5a32', { kind: 'wood', topColor: '#a87a48' });
  // launcher frame
  toon(g, poly([[-26, yt + 2], [-20, yt - 30], [-14, yt - 30], [-18, yt + 2]]), '#6b4423', { sd: 1, hd: 0.5, lw: 1.4 });
  toon(g, poly([[18, yt + 2], [12, yt - 22], [18, yt - 22], [26, yt + 2]]), '#6b4423', { sd: 1, hd: 0.5, lw: 1.4 });
  g.save(); g.translate(-2, yt - 16); g.rotate(-0.42);
  toon(g, rrect(-30, -12, 58, 22, 3), '#5a3a1e', { sd: 1.2, hd: 0.6, lw: 1.5 });
  // rockets in rack
  const launched = fire ? Math.min(6, Math.floor(t * 12)) : 0;
  for (let i = 0; i < 6; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    const x = -24 + row * 2, y = -8 + col * 9 + row * 0;
    if (fire && i < launched && t < 0.8) continue;
    const yy = y + (row - 1) * 0;
    toon(g, rrect(x + row * 1, yy, 30 - row * 2, 6, 3), '#d8cfc0', { sd: 0.6, hd: 0.4, lw: 1.1 });
    toon(g, poly([[x + 30 - row, yy], [x + 37 - row, yy + 3], [x + 30 - row, yy + 6]]), '#c0392b', { sd: 0.4, hd: 0.3, lw: 1 });
  }
  g.restore();
  for (let i = 0; i < 4; i++) toon(g, circle(-28 + i * 3, yt - 4 - i, 3), BRASS, { sd: 0.4, hd: 0.3, lw: 0.9 });
  if (fire && t < 0.6) for (let i = 0; i < 3; i++) { g.fillStyle = `rgba(230,220,200,${0.7 * (1 - t / 0.6)})`; g.beginPath(); g.arc(-30 - i * 6, yt - 2 + i * 2, 6 + i * 3, 0, PI * 2); g.fill(); glow(g, -26, yt - 6, 16, '#ffb040', 0.6 * (1 - t / 0.6)); }
  // engineer with goggles
  const eng = humanoid({ h: 30, headR: 6.2, skin: '#e8b88e', hair: '#b8642a', shirt: '#5a6a7a', torsoStyle: 'tunic', pants: '#4a3a2a', boots: '#2a1e14', helmet: 'cap', helmColor: '#6b4423', beard: '#b8642a', beardLen: 1.2, sleeve: '#4a5a6a', glove: '#3a2a1a', lw: 1.3, headExtra: (c, cc, r) => { toon(c, ellipse(r * 0.5, -r * 0.55, r * 0.32, r * 0.24), '#9ad8ff', { sd: 0, hd: 0.3, lw: 0.9 }); line(c, [[-r * 0.8, -r * 0.5], [r * 0.2, -r * 0.55]], '#3a2a1a', 1.3); } });
  const p = fire ? Pose.cast(Math.min(1, t * 1.2)) : Pose.idle(t);
  g.save(); g.translate(30, yt + 4); eng.draw(g, p); g.restore();
}
function artilleryB(g, t, fire) {
  foundation(g, 46, 19, 6, '#8d877d');
  const yt = cylinder(g, 0, -2, 40, 16, 12, '#9a958c', { rowH: 7, seed: 45, topColor: '#7d776d' });
  // vats
  for (const [x, y, r] of [[-28, yt + 4, 9], [26, yt + 6, 7]]) {
    toon(g, rrect(x - r, y - r * 1.4, r * 2, r * 1.4, 2), '#6b4423', { sd: 1, hd: 0.5, lw: 1.3, detail: c => { c.fillStyle = IRON; c.fillRect(x - r, y - r * 1.1, r * 2, 1.8); c.fillRect(x - r, y - r * 0.4, r * 2, 1.8); } });
    toon(g, ellipse(x, y - r * 1.4, r, r * 0.35), '#7ae03a', { sd: 0, hd: 0.5, lw: 1.1 });
    for (let i = 0; i < 2; i++) { const k = (t * 2 + i * 0.5) % 1; g.fillStyle = `rgba(160,255,90,${0.8 * (1 - k)})`; g.beginPath(); g.arc(x - 3 + i * 5, y - r * 1.4 - k * 12, 2 + k * 2, 0, PI * 2); g.fill(); }
    glow(g, x, y - r * 1.5, r * 2, '#8aff4a', 0.35);
  }
  // catapult
  toon(g, rrect(-18, yt - 6, 36, 8, 2), '#6b4423', { sd: 1, hd: 0.5, lw: 1.4 });
  toon(g, poly([[-6, yt - 6], [-2, yt - 30], [2, yt - 30], [6, yt - 6]]), '#5a3a1e', { sd: 1, hd: 0.5, lw: 1.4 });
  const sw = fire ? (t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7 * 0.9) : 0;
  const ang = -0.35 - sw * 1.9;
  g.save(); g.translate(0, yt - 26); g.rotate(ang + PI / 2);
  toon(g, rrect(-30, -2.5, 46, 5, 2), '#8a5a32', { sd: 0.8, hd: 0.5, lw: 1.3 });
  toon(g, blob([[-36, -6], [-28, -6], [-26, 0], [-28, 6], [-36, 6], [-38, 0]], 0.6), '#5a3a1e', { sd: 0.6, hd: 0.3, lw: 1.2 });
  if (!fire || t > 0.6) toon(g, circle(-32, -5, 4), '#8aff4a', { sd: 0.6, hd: 0.8, lw: 1, light: '#e8ffd0' });
  toon(g, rrect(10, -6, 10, 12, 2), '#4a4d54', { sd: 0.8, hd: 0.5, lw: 1.2 });
  g.restore();
  toon(g, circle(0, yt - 26, 2.8), BRASS, { sd: 0.3, hd: 0.3, lw: 1 });
  // flasks rack
  for (let i = 0; i < 3; i++) { toon(g, circle(-16 + i * 6, yt + 10, 2.8), ['#8aff4a', '#ffb04a', '#8ad8ff'][i], { sd: 0.4, hd: 0.5, lw: 0.9, light: '#ffffff' }); toon(g, rrect(-17 + i * 6, yt + 4, 2, 4, 0.5), '#d8cfc0', { sd: 0, hd: 0, lw: 0.6 }); }
  const alch = humanoid({ h: 30, headR: 6, skin: '#e0b08a', hair: '#3a2a1a', shirt: '#6a5a3a', torsoStyle: 'robe', pants: '#3a3a2a', boots: '#2a1e14', helmet: 'hood', helmColor: '#4a5a3a', sleeve: '#5a4a2a', glove: '#3a3a2a', lw: 1.3, headExtra: (c, cc, r) => { toon(c, blob([[r * 0.3, r * 0.1], [r * 1.25, r * 0.1], [r * 1.35, r * 0.55], [r * 0.4, r * 0.8]], 0.6), '#8a8a7a', { sd: 0.3, hd: 0.2, lw: 0.9 }); } });
  const p = fire ? Pose.throw(Math.min(1, t * 1.2)) : Pose.idle(t);
  g.save(); g.translate(28, yt + 6); alch.draw(g, p); g.restore();
}

// ---------------- overlays & misc ----------------
function towerIce(g) {
  g.save(); g.globalAlpha = 0.78;
  const shards = [[-30, 0, 20, 70], [-10, 0, 26, 92], [12, 0, 24, 86], [32, 0, 18, 60]];
  for (const [x, y, w, h] of shards) toon(g, poly([[x - w / 2, y + 4], [x - w * 0.35, y - h * 0.7], [x, y - h], [x + w * 0.4, y - h * 0.65], [x + w / 2, y + 4]]), '#bfe8ff', { sd: 2, hd: 2, lw: 1.4, light: '#ffffff' });
  g.restore();
}
function towerCurse(g) {
  g.save(); g.globalAlpha = 0.85;
  for (let i = 0; i < 3; i++) {
    const y = -20 - i * 26;
    const ring = new Path2D(); ring.ellipse(0, y, 40 - i * 4, 12, 0, 0, PI * 2);
    stroke(g, ring, '#2a0a3a', 5); stroke(g, ring, '#a050ff', 2.4);
  }
  glow(g, 0, -40, 50, '#8a30ff', 0.35);
  g.restore();
}
function rallyFlag(g) {
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(0, 0, 10, 4, 0, 0, PI * 2); g.fill();
  pole(g, 0, -40, 0, 2.6, '#7a4a24');
  banner(g, 1, -39, 20, 13, '#c0392b', { tail: true, wave: 1.8, emblem: (c, x, y) => emblemTower(c, x - 1, y, 0.7) });
}
function turret(g, t, fire) {
  toon(g, ellipse(0, 0, 18, 7), '#6b4423', { sd: 1, hd: 0.5, lw: 1.3 });
  for (const s of [-1, 1]) line(g, [[s * 14, 2], [s * 4, -14]], OUT, 4), line(g, [[s * 14, 2], [s * 4, -14]], '#7a4a24', 2.4);
  const kick = fire ? S(Math.min(1, t * 3) * PI) : 0;
  g.save(); g.translate(-kick * 3, -16);
  toon(g, rrect(-8, -5, 26, 10, 4), '#55585e', { sd: 1, hd: 0.8, lw: 1.4, light: '#a8acb4' });
  toon(g, rrect(16, -6, 4, 12, 1.5), '#3a3d42', { sd: 0, hd: 0, lw: 1.1 });
  toon(g, circle(-6, 0, 5), BRASS, { sd: 0.5, hd: 0.4, lw: 1.1 });
  if (fire && t < 0.3) { glow(g, 24, 0, 14, '#ffb040', 0.9); flat(g, star(24, 0, 6, 0.45, 6), '#fff2a0', 0); }
  g.restore();
}

// =====================================================================
export function jobs() {
  const one = (name, w, h, ax, ay, draw) => ({ name, w, h, ax, ay, anims: { s: { frames: 1, single: true, draw } } });
  const J = [];
  J.push(one('plot', 120, 70, 60, 38, g => plot(g)));
  J.push({ name: 't_build', w: 130, h: 150, ax: 65, ay: 118, anims: { idle: { frames: 8, fps: 12, draw: (g, t) => construction(g, t) } } });
  // archer line (base + front rail)
  J.push(one('t_archer1', 130, 150, 65, 118, g => archer1(g, false)));
  J.push(one('t_archer1_front', 130, 150, 65, 118, g => archer1(g, true)));
  J.push(one('t_archer2', 130, 165, 65, 128, g => archer2(g, false)));
  J.push(one('t_archer2_front', 130, 165, 65, 128, g => archer2(g, true)));
  J.push(one('t_archer3', 130, 185, 65, 145, g => archer3(g, false)));
  J.push(one('t_archer3_front', 130, 185, 65, 145, g => archer3(g, true)));
  J.push({ name: 't_archerA', w: 140, h: 210, ax: 70, ay: 165, anims: { idle: { frames: 8, fps: 8, draw: (g, t) => archerA(g, false, t) } } });
  J.push(one('t_archerA_front', 140, 210, 70, 165, g => archerA(g, true)));
  J.push(one('t_archerB', 140, 150, 70, 110, g => archerB(g)));
  J.push({ name: 'u_archer', w: 50, h: 50, ax: 25, ay: 42, anims: {
    idle: { frames: 4, fps: 5, draw: (g, t) => archerMan.draw(g, Pose.idle(t)) },
    shoot: { frames: 6, fps: 14, loop: false, draw: (g, t) => archerMan.draw(g, Pose.shoot(t)) },
  } });
  J.push({ name: 'u_gale', w: 50, h: 52, ax: 25, ay: 44, anims: {
    idle: { frames: 4, fps: 5, draw: (g, t) => ranger.draw(g, Pose.idle(t)) },
    shoot: { frames: 6, fps: 18, loop: false, draw: (g, t) => ranger.draw(g, Pose.shoot(t)) },
  } });
  J.push({ name: 'u_arbalest', w: 90, h: 60, ax: 45, ay: 44, anims: {
    idle: { frames: 1, fps: 1, draw: (g, t) => arbalest(g, 0, false) },
    fire: { frames: 8, fps: 16, loop: false, draw: (g, t) => arbalest(g, t, true) },
  } });
  // barracks
  J.push(one('t_barracks1', 130, 130, 65, 100, g => barracks1(g)));
  J.push(one('t_barracks2', 130, 135, 65, 104, g => barracks2(g)));
  J.push(one('t_barracks3', 140, 150, 70, 112, g => barracks3(g)));
  J.push(one('t_barracksA', 140, 150, 70, 110, g => barracksA(g)));
  J.push({ name: 't_barracksB', w: 140, h: 140, ax: 70, ay: 106, anims: { idle: { frames: 6, fps: 10, draw: (g, t) => barracksB(g, t) } } });
  // mage
  const mageJob = (id, fn, h, ay) => ({ name: 't_' + id, w: 120, h, ax: 60, ay, anims: {
    idle: { frames: 8, fps: 8, draw: (g, t) => fn(g, t, false) },
    fire: { frames: 6, fps: 14, loop: false, draw: (g, t) => fn(g, t, true) },
  } });
  J.push(mageJob('mage1', mage1, 160, 122));
  J.push(mageJob('mage2', mage2, 185, 140));
  J.push(mageJob('mage3', mage3, 200, 154));
  J.push(mageJob('mageA', mageA, 210, 162));
  J.push(mageJob('mageB', mageB, 205, 158));
  // artillery
  const artJob = (id, fn, h, ay) => ({ name: 't_' + id, w: 130, h, ax: 65, ay, anims: {
    idle: { frames: 4, fps: 4, draw: (g, t) => fn(g, t, false) },
    fire: { frames: 10, fps: 16, loop: false, draw: (g, t) => fn(g, t, true) },
  } });
  J.push(artJob('artillery1', artillery1, 110, 76));
  J.push(artJob('artillery2', artillery2, 120, 84));
  J.push(artJob('artillery3', artillery3, 140, 100));
  J.push(artJob('artilleryA', artilleryA, 130, 90));
  J.push(artJob('artilleryB', artilleryB, 130, 90));
  // misc
  J.push(one('fx_towerice', 130, 130, 65, 112, g => towerIce(g)));
  J.push(one('fx_towercurse', 130, 130, 65, 112, g => towerCurse(g)));
  J.push(one('flag_rally', 40, 56, 14, 48, g => rallyFlag(g)));
  J.push({ name: 'turret', w: 70, h: 50, ax: 30, ay: 38, anims: {
    idle: { frames: 1, draw: (g) => turret(g, 0, false) },
    fire: { frames: 6, fps: 16, loop: false, draw: (g, t) => turret(g, t, true) },
  } });
  return J;
}
