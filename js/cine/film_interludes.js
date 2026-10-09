// Rampart Riot — chapter interludes: short films between stages (story_* scores, free-running clock).
import { Assets } from '../core/assets.js';
import { TAU, clamp } from '../core/util.js';
import { getLang } from '../core/i18n.js';
import { font } from '../render/draw.js';
import { WORLD, ORDER } from '../data/worldmap.js';
import {
  DW, DH, lerp, sm, seg, easeOut, easeIn, easeInOut, rng, noise1, mix, rgba, sky, stars, glow, haze, vignette, tint, godRays,
  ridge, peaks, treeLine, wall, wallAlong, tower, gate, beacon, flame, banner, raven, figure, procession, person, queen,
  shard, signetRing, emberCrown, starCore, smoke, Particles, plate, portrait,
} from './kit.js';

const MAP = 'assets/ui/worldmap.jpg';
const GRIM = [{ sprite: 'e_grimling' }, { sprite: 'e_grimling' }, { sprite: 'e_slinger' }, { sprite: 'e_hound' }, { sprite: 'e_brute' }];
const ARMY = [{ sprite: 's_knight' }, { sprite: 's_footman' }, { sprite: 's_footman' }, { sprite: 's_bastion' }];

// ------------------------------------------------------------------ shared pieces
// world-map travel: pan from one stage flag to the next while the road draws itself in
function mapTravel(ctx, from, to, u, T) {
  const ia = ORDER.indexOf(from), ib = ORDER.indexOf(to);
  const A = WORLD.stages[from], B = WORLD.stages[to];
  const road = ia >= 0 && ib === ia + 1 ? WORLD.roads[ia] : [A, B];
  const p = easeInOut(seg(u, 0.12, 0.8));
  const cx = lerp(A[0], B[0], p), cy = lerp(A[1], B[1], p);
  const zoom = 1.9 - 0.25 * Math.sin(p * Math.PI);
  const k = plate(ctx, MAP, cx, cy, zoom);
  if (!k) return;
  const X = x => DW / 2 + (x - cx) * k, Y = y => DH / 2 + (y - cy) * k;
  tint(ctx, '#1a1008', 0.18);
  // dotted road, drawn progressively
  const n = Math.max(2, Math.round(road.length * clamp(seg(u, 0.15, 0.85), 0, 1)));
  ctx.save(); ctx.setLineDash([14, 14]); ctx.lineDashOffset = -T * 30; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(40,20,8,0.75)'; ctx.lineWidth = 9; ctx.beginPath(); road.slice(0, n).forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.stroke();
  ctx.strokeStyle = '#ffe2a0'; ctx.lineWidth = 4.5; ctx.stroke();
  ctx.restore();
  for (const [P, a] of [[A, 1], [B, seg(u, 0.8, 0.95)]]) { if (a <= 0) continue; glow(ctx, X(P[0]), Y(P[1]), 70, '#ffd27a', 0.6 * a); ctx.fillStyle = rgba('#fff2c8', a); ctx.beginPath(); ctx.arc(X(P[0]), Y(P[1]), 9, 0, TAU); ctx.fill(); }
  vignette(ctx, 0.7);
}
// two characters face each other (bust portraits), with the speaker brightened
function duet(ctx, T, left, right, speaker, bg) {
  bg(ctx, T);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-DW, -DH, DW * 3, DH * 3);
  const H = 760;
  for (const [id, x, flip] of [[left, 560, false], [right, 1360, true]]) {
    if (!id) continue;
    const on = speaker === id || !speaker;
    portrait(ctx, id, x, 640 + (on ? 0 : 10), H, { flip, dim: on ? 0 : 0.5 });
  }
  // floor shadow / fade into the letterbox
  const g = ctx.createLinearGradient(0, 820, 0, 1080); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = g; ctx.fillRect(-DW, 820, DW * 3, 400);
  vignette(ctx, 0.6);
}
function snowDusk(ctx, T) {
  sky(ctx, [[0, '#1a1a3a'], [0.55, '#5a4a7a'], [0.8, '#c88a8a'], [1, '#e8c8c0']]);
  peaks(ctx, { y: 760, n: 8, x0: -200, x1: 2200, hmin: 120, hmax: 380, seed: 5, color: '#4a4a72', grad: '#3a3a5e', snow: '#e8e4f4', shade: '#1a1a3a' });
  ridge(ctx, { y: 900, amp: 80, seed: 6, color: '#d8d6ea', grad: '#a8a6c8' });
}
function nightWall(ctx, T) {
  sky(ctx, [[0, '#04060f'], [0.6, '#10183a'], [1, '#2a1a2a']]);
  stars(ctx, T, { alpha: 0.8, seed: 61, n: 260, yMax: 600 });
  wallAlong(ctx, [[-200, 760, 60], [400, 740, 80], [900, 760, 110], [1400, 800, 150], [2100, 860, 210]], { color: '#14162a', face: '#0a0a14', bricks: '#262a40', top: '#8aa0d8', topA: 0.3 });
}

// ------------------------------------------------------------------ c1_mid — The Breaker (after 1-4)
const C1_MID = {
  music: 'story_tension', musicLoop: true, dur: 34, atlases: ['enemies1', 'units'],
  init(S) {
    S.dust = new Particles({ kind: 'dot', rate: 0, x0: 400, x1: 1500, y0: 470, y1: 480, vy: 60, vyr: 40, life: 2.5, size: 3, color: '#8a7a6a', alpha: 0.7, sway: 10 });
    S.chunks = new Particles({ kind: 'chunk', rate: 0, life: 2.4, size: 22, vx: 0, vxr: 900, vy: -300, vyr: 400, g: 900, spin: 9, color: '#1a1210', max: 120 });
    S.sparks = new Particles({ kind: 'ember', add: true, rate: 0, life: 2, size: 3, vx: 0, vxr: 700, vy: -260, vyr: 400, g: 300, color: '#ffb060' });
    S.embers = new Particles({ kind: 'ember', add: true, rate: 12, x0: 300, x1: 1700, y0: 900, y1: 1000, vx: -20, vxr: 40, vy: -60, vyr: 30, life: 6, size: 2.4, sway: 20, color: '#ffa040', twinkle: true });
  },
  update(S, dt, t) {
    S.dust.o.rate = t > 10 && t < 18 ? 40 : 0;
    S.dust.update(dt); S.chunks.update(dt); S.sparks.update(dt); S.embers.update(dt);
    if (!S.burst && t >= 19.0) { S.burst = true; S.chunks.emit(50, { x: 960, y: 640, w: 260, h: 300 }); S.sparks.emit(70, { x: 960, y: 640, w: 200, h: 200 }); }
  },
  cues: [{ t: 11.0, sfx: 'stomp', vol: 0.7 }, { t: 11.0, shake: 6, d: 0.5 }, { t: 13.2, sfx: 'stomp', vol: 0.8 }, { t: 13.2, shake: 8, d: 0.5 },
    { t: 15.2, sfx: 'stomp', vol: 0.9 }, { t: 15.2, shake: 10, d: 0.5 }, { t: 16.9, sfx: 'boss_roar', vol: 0.8 },
    { t: 19.0, sfx: 'gate_break', vol: 1 }, { t: 19.0, flash: 0.8, color: '#ffd8a0', d: 0.6 }, { t: 19.0, shake: 20, d: 1.4 }],
  captions: [
    { t: 0.9, d: 5.0, ko: '애시비가 불타던 그 밤, 동문.', en: 'The night Ashby burned. The Eastgate.' },
    { t: 9.6, d: 5.2, ko: '땅이 울렸다. 처음엔 다들 천둥인 줄 알았다.', en: 'The ground shook. At first, they took it for thunder.' },
    { t: 19.4, d: 2.6, ko: '그것은 성문을 두드리지 않았다.', en: 'It did not knock on the gate.' },
    { t: 22.2, d: 3.2, ko: '찢어 버렸다.', en: 'It tore it open.' },
    { t: 27.0, d: 5.6, ko: '그날 밤, 동쪽 요새들은 끝내 봉화를 보지 못했다.', en: 'That night, the eastern forts never saw a beacon.' },
  ],
  shots: [
    { t0: 0, t1: 18.6, xf: 0, draw: (ctx, S, lt, u, T) => eastgate(ctx, S, T, 0) },
    { t0: 18.6, t1: 26, xf: 0, draw: (ctx, S, lt, u, T) => eastgate(ctx, S, T, 1) },
    { t0: 26, t1: 34, xf: 1, draw: (ctx, S, lt, u, T) => eastgate(ctx, S, T, 2) },
  ],
};
function eastgate(ctx, S, T, phase) {
  const z = phase === 0 ? 1 + easeInOut(seg(T, 0, 18)) * 0.16 : phase === 1 ? 1.2 : 1.05;
  ctx.save(); ctx.translate(DW / 2, DH * 0.62); ctx.scale(z, z); ctx.translate(-DW / 2, -DH * 0.62);
  sky(ctx, [[0, '#04050c'], [0.55, '#0e1226'], [0.82, phase ? '#3a1410' : '#1a1a2c'], [1, '#0a0608']]);
  stars(ctx, T, { alpha: 0.7, seed: 41, n: 200, yMax: 420 });
  if (phase === 0) {
    // the shape in the fog beyond the wall
    const rise = easeOut(seg(T, 10, 17.5));
    if (rise > 0) {
      haze(ctx, 470, 120, '#2a2638', 0.5);
      figure(ctx, 'e_boss_gorrath', 'walk', T * 0.6, 980, 1040 - rise * 250, 4.2, { color: '#06050a', alpha: 0.9 });
      const ey = 1040 - rise * 250 - 150 * 4.2 * 0.83;
      glow(ctx, 1040, ey + 20, 26, '#ff8a2a', rise); glow(ctx, 1000, ey + 22, 22, '#ff8a2a', rise * 0.9);
      glow(ctx, 860, 1040 - rise * 250 - 300, 50, '#b88aff', rise * (0.6 + 0.3 * Math.sin(T * 4)));
    }
  } else glow(ctx, 960, 760, 700, '#ff5a1a', 0.55);
  // wall & gate
  const wallTop = 470;
  wall(ctx, -200, 760, 900, 900 - wallTop, { color: '#141622', bricks: '#2a2c40', bricksA: 0.5, light: '#8a9ad0', lightA: 0.18, merlon: 36 });
  wall(ctx, 1160, 2120, 900, 900 - wallTop, { color: '#141622', bricks: '#2a2c40', bricksA: 0.5, light: '#8a9ad0', lightA: 0.18, merlon: 36 });
  tower(ctx, 700, 900, 170, 520, { color: '#121420', window: '#ffb05a', light: '#8a9ad0', lightA: 0.15 }, T);
  tower(ctx, 1220, 900, 170, 520, { color: '#121420', window: '#ffb05a', light: '#8a9ad0', lightA: 0.15 }, T);
  ctx.fillStyle = '#121420'; ctx.fillRect(760, wallTop - 20, 400, 160);
  const broken = phase === 0 ? 0 : 1;
  gate(ctx, 960, 900, 300, 470, { broken, door: '#2a1a12', inside: phase ? '#ff7a2a' : '#080608', through: phase ? (c) => {
    sky(c, [[0, '#ff9a40'], [0.6, '#c83a10'], [1, '#2a0804']], 400, 900);
    if (phase === 1) figure(c, 'e_boss_gorrath', 'attack', (T - 18.6) * 0.9, 1010, 980, 2.8, { color: '#0a0406' });
    else procession(c, T, { types: GRIM, n: 10, x0: 760, x1: 1160, y: 900, scale: 2.4, speed: 60, color: '#0a0406', seed: 5 });
  } : null });
  // sentries with torches on the wall
  for (const [x, d] of [[220, 1], [420, -1], [1420, 1], [1680, -1]]) {
    person(ctx, x, wallTop + 2, 52, { color: '#0a0a12', helm: true, dir: d, reach: phase ? 0.8 : 0.2 }, T);
    flame(ctx, x + d * 20, wallTop - 70, 12, T, x); glow(ctx, x + d * 20, wallTop - 80, 70, '#ffa040', 0.35);
  }
  ctx.restore();
  if (phase === 2) procession(ctx, T, { types: GRIM, n: 22, x0: -200, x1: 2200, y: 960, scale: 3.4, speed: -120, color: '#050304', flip: true, seed: 9, rim: '#ff8a3a', rimA: 0.6 });
  S.dust.draw(ctx); S.chunks.draw(ctx); S.sparks.draw(ctx); S.embers.draw(ctx, phase ? 1 : 0.3);
  vignette(ctx, 0.65);
}

// ------------------------------------------------------------------ c1_end — Black Glass (after 1-8)
const C1_END = {
  music: 'story_somber', musicLoop: true, dur: 44, atlases: ['enemies1', 'portraits'], images: [MAP],
  init(S) { S.ash = new Particles({ kind: 'dot', rate: 18, x0: -100, x1: 2100, y0: -20, y1: -10, vx: 20, vxr: 20, vy: 50, vyr: 20, life: 20, size: 2.2, sway: 18, color: '#d8ccc0', alpha: 0.6 }); S.ash.prefill(10); },
  update(S, dt) { S.ash.update(dt); },
  captions: [
    { t: 1.0, d: 6.5, ko: '파괴자는 동문 앞에 쓰러졌다.', en: 'The Breaker fell before the Eastgate.' },
    { t: 11.2, d: 5.5, who: 'seren', ko: '…속삭이고 있어요.', en: '...It\'s whispering.' },
    { t: 20.6, d: 5.0, ko: '그리고 반지 하나. 왕관을 쓴 까마귀 — 모로우 가문의 문장.', en: 'And a ring. A crowned raven — the crest of House Morrow.' },
    { t: 25.8, d: 4.0, who: 'brannoc', ko: '누군가 저 괴물에게 값을 치렀군.', en: 'Someone paid that monster.' },
    { t: 30.6, d: 5.0, ko: '길은 북쪽, 서리 고개로 이어졌다.', en: 'The road led north, into the Frostbound Pass.' },
    { t: 37.2, d: 6.0, style: 'card', ko: ['제2장', '서리 고개'], en: ['Chapter II', 'Frostbound Pass'] },
  ],
  shots: [
    { t0: 0, t1: 10.4, xf: 0, draw: (ctx, S, lt, u, T) => {
      sky(ctx, [[0, '#2a2a3c'], [0.5, '#7a6a7a'], [0.78, '#d8a08a'], [1, '#f0c8a0']]);
      godRays(ctx, 200, -100, 7, 1500, '#fff0d0', 0.25, T, 0.9, 0.9);
      wall(ctx, -200, 1100, 760, 260, { color: '#4a4450', bricks: '#3a3440', light: '#ffd8b0', lightA: 0.25 });
      tower(ctx, 1180, 760, 150, 360, { color: '#46404c', light: '#ffd8b0', lightA: 0.2 }, T);
      smoke(ctx, 1500, 700, T, { n: 10, h: 600, r: 90, color: '#4a4048', alpha: 0.3, drift: -80, speed: 0.03 });
      ridge(ctx, { y: 880, amp: 40, seed: 3, color: '#2a2228' });
      figure(ctx, 'e_boss_gorrath', 'death', 2, 900 + u * 30, 960, 3.2, { color: '#120e12', flip: true, rim: '#ffcf9a', rimA: 0.5 });
      ctx.save(); ctx.strokeStyle = 'rgba(20,16,20,0.8)'; ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) { const a = T * 0.5 + i * 1.3, bx = 960 + Math.cos(a) * (220 + i * 40), by = 300 + Math.sin(a * 1.3) * 60; const f = Math.sin(T * 8 + i) * 7; ctx.beginPath(); ctx.moveTo(bx - 12, by - f); ctx.quadraticCurveTo(bx - 4, by - 4, bx, by); ctx.quadraticCurveTo(bx + 4, by - 4, bx + 12, by - f); ctx.stroke(); }
      ctx.restore();
      S.ash.draw(ctx); vignette(ctx, 0.55);
    } },
    { t0: 10.4, t1: 20.2, draw: (ctx, S, lt, u, T) => {
      sky(ctx, [[0, '#0c0a10'], [1, '#2a2226']]);
      const g = ctx.createRadialGradient(960, 640, 50, 960, 640, 900); g.addColorStop(0, '#3a3236'); g.addColorStop(1, '#0a080c'); ctx.fillStyle = g; ctx.fillRect(0, 0, DW, DH);
      const R = rng(4); for (let i = 0; i < 260; i++) { ctx.fillStyle = rgba(['#5a5054', '#2a2428', '#6a5e5a'][i % 3], 0.5); ctx.beginPath(); ctx.arc(R() * DW, 500 + R() * 600, 2 + R() * 10, 0, TAU); ctx.fill(); }
      shard(ctx, 1010, 700, 110, T, 1);
      // whispers: faint glyphs drifting off the shard
      ctx.save(); ctx.font = font(30, 600, 'serif'); ctx.textAlign = 'center';
      for (let i = 0; i < 12; i++) { const k = ((T * 0.18 + i / 12) % 1), a = Math.sin(k * Math.PI) * 0.4; ctx.fillStyle = rgba('#c9a8ff', a); ctx.fillText('ᚱᛟᚨᛗᛁᛋᛏ'.charAt(i % 8), 1010 + Math.sin(i * 2.1 + T) * 180 * k, 680 - k * 360); }
      ctx.restore();
      // a gloved hand reaching in from the lower left
      const r = easeInOut(seg(lt, 1, 7));
      ctx.save(); ctx.translate(lerp(360, 820, r), lerp(1060, 790, r)); ctx.rotate(-0.55);
      ctx.fillStyle = '#2a1e18'; ctx.fillRect(-420, -46, 420, 92);
      ctx.fillStyle = '#3a2a20'; ctx.beginPath(); ctx.ellipse(10, 0, 70, 52, 0, 0, TAU); ctx.fill();
      for (let f = 0; f < 4; f++) { ctx.beginPath(); ctx.ellipse(70 + f * 4, -30 + f * 20, 46, 13, 0.15 * f - 0.1, 0, TAU); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(30, -54, 40, 14, -0.9, 0, TAU); ctx.fill();
      ctx.restore();
      glow(ctx, 1010, 700, 300, '#b88aff', 0.18);
      vignette(ctx, 0.7);
    } },
    { t0: 20.2, t1: 30.2, draw: (ctx, S, lt, u, T) => {
      const g = ctx.createRadialGradient(960, 560, 50, 960, 560, 1000); g.addColorStop(0, '#3a2a22'); g.addColorStop(1, '#0c0806'); ctx.fillStyle = g; ctx.fillRect(-DW, -DH, DW * 3, DH * 3);
      const R = rng(9); for (let i = 0; i < 120; i++) { ctx.strokeStyle = rgba('#5a4434', 0.35); ctx.lineWidth = 2; ctx.beginPath(); const y = R() * DH; ctx.moveTo(0, y); ctx.bezierCurveTo(600, y + 40, 1200, y - 40, DW, y + R() * 30); ctx.stroke(); }
      const z = 1 + u * 0.12;
      ctx.save(); ctx.translate(960, 560); ctx.scale(z, z); ctx.translate(-960, -560);
      signetRing(ctx, 960, 560, 200, T);
      ctx.restore();
      godRays(ctx, 600, -100, 5, 1200, '#ffe0b0', 0.12, T, 0.6, 1.1);
      vignette(ctx, 0.75);
    } },
    { t0: 30.2, t1: 44, draw: (ctx, S, lt, u, T) => mapTravel(ctx, '1-8', '2-1', u, T) },
  ],
};

// ------------------------------------------------------------------ c2_mid — The Raven's Letter (after 2-4)
const LETTER = {
  ko: ['성벽이 무너지면, 이 왕국에는', '불을 두려워하지 않는 왕이 필요할 것이다.', '약속한 대가는 검은 유리로 치르겠다.', '— V. M.'],
  en: ['When the wall falls, this realm will need', 'a king who does not fear fire.', 'Your price will be paid in black glass.', '— V. M.'],
};
const C2_MID = {
  music: 'story_tension', musicLoop: true, dur: 32, atlases: ['portraits'],
  captions: [
    { t: 0.9, d: 5.4, ko: '모로우의 진지에서, 편지 한 통이 나왔다.', en: 'In Morrow\'s camp, a letter was found.' },
    { t: 26.4, d: 5.0, who: 'brannoc', ko: '모로우… 그 이름을 다시 듣게 될 줄은 몰랐소.', en: 'Morrow... I never thought I\'d hear that name again.' },
  ],
  shots: [
    { t0: 0, t1: 12, xf: 0, draw: (ctx, S, lt, u, T) => tent(ctx, T, u, false) },
    { t0: 12, t1: 26.2, draw: (ctx, S, lt, u, T) => letter(ctx, T, lt) },
    { t0: 26.2, t1: 32, draw: (ctx, S, lt, u, T) => duet(ctx, T, 'brannoc', null, 'brannoc', (c, t) => tent(c, t, 1, true)) },
  ],
};
function tent(ctx, T, u, dim) {
  const fl = 0.85 + 0.15 * Math.sin(T * 11) * Math.sin(T * 7.3);
  const g = ctx.createRadialGradient(1100, 620, 40, 1100, 620, 1300); g.addColorStop(0, '#6a4628'); g.addColorStop(0.5, '#3a2416'); g.addColorStop(1, '#120a06'); ctx.fillStyle = g; ctx.fillRect(-DW, -DH, DW * 3, DH * 3);
  // canvas seams
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 5; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(960 + (i - 2.5) * 120, -50); ctx.lineTo(960 + (i - 2.5) * 520, 700); ctx.stroke(); }
  const z = 1 + (dim ? 0 : u * 0.1);
  ctx.save(); ctx.translate(1100, 700); ctx.scale(z, z); ctx.translate(-1100, -700);
  // table
  ctx.fillStyle = '#2a180c'; ctx.beginPath(); ctx.moveTo(200, 760); ctx.lineTo(1720, 760); ctx.lineTo(1900, 1100); ctx.lineTo(20, 1100); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3a2412'; ctx.fillRect(200, 740, 1520, 24);
  // map and the letter with its seal
  ctx.save(); ctx.translate(560, 860); ctx.rotate(-0.05); ctx.fillStyle = '#b89a6a'; ctx.fillRect(-260, -90, 420, 220); ctx.strokeStyle = 'rgba(80,50,20,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-200, 40); ctx.bezierCurveTo(-100, -40, 0, 80, 120, -20); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(1080, 880); ctx.rotate(0.06); ctx.fillStyle = '#e8dcc0'; ctx.fillRect(-170, -110, 340, 230);
  ctx.strokeStyle = 'rgba(60,40,20,0.55)'; ctx.lineWidth = 3; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-140, -80 + i * 28); ctx.lineTo(120 - (i === 5 ? 120 : 0), -80 + i * 28); ctx.stroke(); }
  ctx.fillStyle = '#7a1424'; ctx.beginPath(); ctx.arc(90, 80, 28, 0, TAU); ctx.fill(); raven(ctx, 90, 82, 36, '#3a0810');
  ctx.restore();
  // candle
  ctx.fillStyle = '#e8dcc8'; ctx.fillRect(1440, 640, 40, 120); flame(ctx, 1460, 640, 26, T, 3);
  ctx.restore();
  glow(ctx, 1460, 600, 700 * fl, '#ffb060', 0.35);
  if (dim) tint(ctx, '#000000', 0.35);
  vignette(ctx, 0.7);
}
function letter(ctx, T, lt) {
  ctx.fillStyle = '#120a06'; ctx.fillRect(-DW, -DH, DW * 3, DH * 3);
  const burn = seg(lt, 9.6, 14);
  ctx.save(); ctx.translate(960, 560); ctx.rotate(-0.025);
  const w = 1180, h = 760;
  // parchment with a charring corner
  ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2);
  const bx = w / 2, by = h / 2, br = burn * 360, N = noise1(5);
  ctx.lineTo(bx, by - br);
  for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 - (i / 10) * Math.PI / 2, r = br * (0.85 + 0.3 * N(i * 1.7 + lt)); ctx.lineTo(bx + Math.cos(a) * r, by + Math.sin(a) * r * -1 * -1); }
  ctx.lineTo(bx - br, by); ctx.lineTo(-w / 2, h / 2); ctx.closePath();
  const pg = ctx.createRadialGradient(0, 0, 100, 0, 0, 800); pg.addColorStop(0, '#f2e6c8'); pg.addColorStop(1, '#b89a6a'); ctx.fillStyle = pg; ctx.fill();
  ctx.save(); ctx.clip();
  const R = rng(3); for (let i = 0; i < 400; i++) { ctx.fillStyle = rgba('#7a5a30', 0.06 + R() * 0.06); ctx.fillRect(-w / 2 + R() * w, -h / 2 + R() * h, 2 + R() * 6, 2 + R() * 6); }
  if (burn > 0) { const cg = ctx.createRadialGradient(bx, by, br * 0.6, bx, by, br * 1.3); cg.addColorStop(0, 'rgba(30,10,0,0.9)'); cg.addColorStop(0.5, 'rgba(90,40,10,0.5)'); cg.addColorStop(1, 'rgba(90,40,10,0)'); ctx.fillStyle = cg; ctx.fillRect(-w, -h, w * 2, h * 2); }
  // handwriting appears line by line
  const lines = LETTER[getLang()] || LETTER.en;
  ctx.fillStyle = '#2a1608'; ctx.textBaseline = 'middle';
  lines.forEach((ln, i) => {
    const t0 = 0.6 + i * 2.0, k = clamp((lt - t0) / 1.8, 0, 1);
    if (k <= 0) return;
    const last = i === lines.length - 1;
    ctx.font = font(last ? 44 : 50, 600, 'serif'); ctx.textAlign = last ? 'right' : 'left';
    const x = last ? w / 2 - 110 : -w / 2 + 90, y = -h / 2 + 130 + i * 110 + (last ? 40 : 0);
    const shown = ln.slice(0, Math.ceil(ln.length * k));
    ctx.globalAlpha = 0.9; ctx.fillText(shown, x, y);
  });
  ctx.globalAlpha = 1;
  ctx.restore();
  // burning edge glow
  if (burn > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,140,40,0.85)'; ctx.lineWidth = 6; ctx.beginPath(); for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 - (i / 10) * Math.PI / 2, r = br * (0.85 + 0.3 * N(i * 1.7 + lt)); const x = bx + Math.cos(a) * r, y = by + Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore(); flame(ctx, bx - br * 0.5, by - br * 0.5, 40 * burn, T, 2); }
  // wax seal
  ctx.fillStyle = '#7a1424'; ctx.beginPath(); ctx.arc(-w / 2 + 160, h / 2 - 120, 62, 0, TAU); ctx.fill(); raven(ctx, -w / 2 + 160, h / 2 - 116, 78, '#3a0810');
  ctx.restore();
  glow(ctx, 1500, 900, 700, '#ffb060', 0.18);
  vignette(ctx, 0.75);
}

// ------------------------------------------------------------------ c2_end — What the Ice Kept (after 2-8)
const C2_END = {
  music: 'story_somber', musicLoop: true, dur: 49, atlases: ['enemies2', 'enemies3', 'portraits'], images: [MAP],
  init(S) {
    S.snow = new Particles({ kind: 'dot', rate: 40, x0: -100, x1: 2100, y0: -20, y1: -10, vx: -40, vxr: 30, vy: 90, vyr: 30, life: 16, size: 2.6, sway: 22, color: '#ffffff', alpha: 0.8 }); S.snow.prefill(8);
  },
  update(S, dt) { S.snow.update(dt); },
  captions: [
    { t: 1.0, d: 6.8, ko: '비룡이 쓰러지자, 산은 오랫동안 숨을 죽였다.', en: 'When the wyrm fell, the mountain held its breath for a long time.' },
    { t: 10.6, d: 4.6, ko: '조각에 손이 닿는 순간, 세렌은 보았다.', en: 'The moment her hand touched the shard, Seren saw it:' },
    { t: 15.6, d: 5.0, ko: '검은 물에 잠긴 옛 왕도. 그리고 불타는 왕관을 든 남자.', en: 'the old capital beneath black water — and a man raising a burning crown.' },
    { t: 21.6, d: 6.6, ko: '멀리 수도에서는, 한 왕이 숨을 거두고 있었다.', en: 'Far away in the capital, a king was drawing his last breath.' },
    { t: 29.6, d: 4.2, who: 'seren', ko: '브라녹… 당신은 알고 있었죠.', en: 'Brannoc... you knew.' },
    { t: 34.2, d: 4.6, ko: '늙은 병사는 대답하지 않았다. 대답할 필요가 없었다.', en: 'The old soldier didn\'t answer. He didn\'t need to.' },
    { t: 42.0, d: 6.0, style: 'card', ko: ['제3장', '가라앉은 왕관'], en: ['Chapter III', 'The Drowned Crown'] },
  ],
  shots: [
    { t0: 0, t1: 10.2, xf: 0, draw: (ctx, S, lt, u, T) => {
      snowDusk(ctx, T);
      const z = 1 + u * 0.06; ctx.save(); ctx.translate(960, 800); ctx.scale(z, z); ctx.translate(-960, -800);
      ctx.fillStyle = '#c8c6e0'; ctx.beginPath(); ctx.moveTo(-200, 1200); ctx.lineTo(-200, 900); ctx.bezierCurveTo(500, 820, 1300, 840, 2200, 930); ctx.lineTo(2200, 1200); ctx.closePath(); ctx.fill();
      figure(ctx, 'e_boss_hrimvald', 'death', 2, 980, 930, 2.6, { color: '#1a1830', rim: '#e8e0ff', rimA: 0.5 });
      glow(ctx, 1150, 720, 120, '#b88aff', 0.45 * (1 - seg(lt, 2, 9)));
      ctx.restore();
      S.snow.draw(ctx); vignette(ctx, 0.5);
    } },
    { t0: 10.2, t1: 21.2, xf: 1.2, draw: (ctx, S, lt, u, T) => {
      // vision: the drowned capital, violet and unsteady
      sky(ctx, [[0, '#0a0614'], [0.6, '#24143a'], [1, '#3a1a3a']]);
      drownedCity(ctx, T, 620);
      const rise = easeOut(seg(lt, 2, 6));
      figure(ctx, 'e_boss_varkas', 'idle', T, 980, 900, 2.6, { color: '#06040a', rim: '#ff9a50', rimA: 0.6 });
      emberCrown(ctx, 990, 900 - 110 * 2.6 * 0.86 - rise * 30, 60, T, rise);
      water(ctx, 900, T, '#0a0614', '#2a1a3a');
      tint(ctx, '#8a5aff', 0.12 + 0.05 * Math.sin(T * 2), 'lighter');
      vignette(ctx, 0.8, '#05020a');
    } },
    { t0: 21.2, t1: 29.2, xf: 1.2, draw: (ctx, S, lt, u, T) => throneRoom(ctx, T, lt) },
    { t0: 29.2, t1: 39, xf: 1.0, draw: (ctx, S, lt, u, T) => duet(ctx, T, 'seren', 'brannoc', T < 34 ? 'seren' : 'brannoc', snowDusk) },
    { t0: 39, t1: 49, xf: 1.0, draw: (ctx, S, lt, u, T) => mapTravel(ctx, '2-8', '3-1', u, T) },
  ],
};
function drownedCity(ctx, T, y) {
  const R = rng(19);
  for (let i = 0; i < 9; i++) {
    const x = 120 + i * 220 + R() * 60, h = 200 + R() * 360, w = 60 + R() * 70, tilt = (R() - 0.5) * 0.16;
    ctx.save(); ctx.translate(x, y + 40); ctx.rotate(tilt);
    ctx.fillStyle = mix('#1a1028', '#2a1a3a', R());
    ctx.fillRect(-w / 2, -h, w, h + 200);
    if (R() > 0.4) { ctx.beginPath(); ctx.moveTo(-w / 2 - 6, -h); ctx.lineTo(0, -h - w * 1.3); ctx.lineTo(w / 2 + 6, -h); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,140,60,0.5)'; if (R() > 0.5) ctx.fillRect(-6, -h * 0.7, 12, 20);
    ctx.restore();
  }
}
function water(ctx, y, T, top, bottom) {
  const g = ctx.createLinearGradient(0, y, 0, DH); g.addColorStop(0, rgba(bottom, 0.85)); g.addColorStop(1, rgba(top, 1));
  ctx.fillStyle = g; ctx.fillRect(-DW, y, DW * 3, DH);
  ctx.save(); ctx.strokeStyle = 'rgba(200,170,255,0.18)'; ctx.lineWidth = 2;
  for (let i = 0; i < 18; i++) { const yy = y + 10 + i * i * 1.2, off = Math.sin(T * 0.8 + i) * 40; ctx.beginPath(); ctx.moveTo(-100 + off, yy); for (let x = -100; x < DW + 100; x += 60) ctx.lineTo(x + off, yy + Math.sin(x * 0.02 + T * 2 + i) * 2); ctx.stroke(); }
  ctx.restore();
}
function throneRoom(ctx, T, lt) {
  sky(ctx, [[0, '#0a0c14'], [1, '#1a1c26']]);
  godRays(ctx, 960, -200, 6, 1500, '#c8d8ff', 0.18, T, 0.5, Math.PI / 2);
  for (let i = 0; i < 6; i++) { const x = 160 + i * 320, w = 90; const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, '#20232e'); g.addColorStop(0.4, '#3a3e4c'); g.addColorStop(1, '#14161e'); ctx.fillStyle = g; ctx.fillRect(x - w / 2, -50, w, 900); }
  ctx.fillStyle = '#14161e'; ctx.fillRect(-DW, 840, DW * 3, 400);
  ctx.fillStyle = '#2a2c38'; for (let i = 0; i < 4; i++) ctx.fillRect(560 + i * 30, 840 - i * 26, 800 - i * 60, 26);
  // the empty throne
  ctx.fillStyle = '#0e0f16'; ctx.fillRect(880, 520, 160, 220); ctx.beginPath(); ctx.moveTo(860, 520); ctx.lineTo(960, 400); ctx.lineTo(1060, 520); ctx.closePath(); ctx.fill();
  // a crown falling, bouncing, rolling to a stop
  const k = seg(lt, 0.6, 1.7), b = seg(lt, 1.7, 2.3), r = easeOut(seg(lt, 2.3, 4.6));
  let x = 960, y = lerp(560, 836, easeIn(k)), rot = 0;
  if (b > 0) { y = 836 - Math.sin(b * Math.PI) * 60; x = 960 + b * 60; rot = b * 2; }
  if (r > 0) { x = 1020 + r * 240; y = 836; rot = 2 + r * 6; }
  ctx.save(); ctx.translate(x, y - 22); ctx.rotate(rot * 0.3);
  ctx.fillStyle = '#c8a040'; ctx.beginPath(); ctx.moveTo(-40, 20); ctx.lineTo(-40, -8); ctx.lineTo(-26, 4); ctx.lineTo(-12, -20); ctx.lineTo(0, 2); ctx.lineTo(12, -20); ctx.lineTo(26, 4); ctx.lineTo(40, -8); ctx.lineTo(40, 20); ctx.closePath(); ctx.fill();
  ctx.restore();
  glow(ctx, x, y - 20, 90, '#ffe0a0', 0.25);
  vignette(ctx, 0.75);
}

// ------------------------------------------------------------------ c3_mid — The Ember Crown (after 3-4)
const C3_MID = {
  music: 'story_tension', musicLoop: true, dur: 34, atlases: ['enemies3'],
  init(S) { S.embers = new Particles({ kind: 'ember', add: true, rate: 10, x0: 700, x1: 1300, y0: 520, y1: 600, vx: 0, vxr: 40, vy: -60, vyr: 30, life: 5, size: 2.4, sway: 16, color: '#ff9a40', twinkle: true }); },
  update(S, dt) { S.embers.update(dt); },
  cues: [{ t: 24.6, sfx: 'heartbeat', vol: 0.9 }, { t: 26.0, sfx: 'heartbeat', vol: 0.9 }, { t: 27.4, sfx: 'heartbeat', vol: 1 }],
  captions: [
    { t: 0.9, d: 6.4, ko: '옛 왕도의 대성당. 바르카스 모로우는 그곳에서 왕관을 썼다.', en: 'The cathedral of the old capital. There, Varkas Morrow put on the Crown.' },
    { t: 12.6, d: 4.2, ko: '왕관은 산 자의 충성을 구하지 않았다.', en: 'The Crown did not ask the living for loyalty.' },
    { t: 17.2, d: 5.0, ko: '죽은 자에게 요구했다.', en: 'It demanded it of the dead.' },
    { t: 24.8, d: 7.0, ko: '그리고 그 불꽃 깊은 곳에서, 무언가가 그를 부르고 있었다.', en: 'And deep within its fire, something was calling him.' },
  ],
  shots: [
    { t0: 0, t1: 24.2, xf: 0, draw: (ctx, S, lt, u, T) => cathedralNight(ctx, S, T, lt) },
    { t0: 24.2, t1: 34, xf: 1.0, draw: (ctx, S, lt, u, T) => {
      ctx.fillStyle = '#060304'; ctx.fillRect(-DW, -DH, DW * 3, DH * 3);
      const beat = [0.4, 1.8, 3.2].reduce((m, b) => Math.max(m, Math.exp(-Math.pow((lt - b) * 6, 2))), 0);
      const s = 260 * (1 + beat * 0.06);
      glow(ctx, 960, 560, 900, '#ff4a10', 0.35 + beat * 0.3);
      starCore(ctx, 960, 470, 22 + beat * 10, T, 0.35 + beat * 0.4);
      emberCrown(ctx, 960, 660, s, T, 1);
      vignette(ctx, 0.8);
    } },
  ],
};
function cathedral(ctx, x, y, s, T, win = '#ff8a3a') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#0a0812';
  ctx.fillRect(-260, -300, 520, 400);
  ctx.beginPath(); ctx.moveTo(-280, -300); ctx.lineTo(0, -470); ctx.lineTo(280, -300); ctx.closePath(); ctx.fill();
  ctx.fillRect(-380, -230, 120, 330); ctx.fillRect(260, -230, 120, 330);
  // broken spire
  ctx.beginPath(); ctx.moveTo(-60, -460); ctx.lineTo(-30, -760); ctx.lineTo(-10, -700); ctx.lineTo(10, -730); ctx.lineTo(40, -520); ctx.lineTo(60, -460); ctx.closePath(); ctx.fill();
  // rose window
  const f = 0.75 + 0.25 * Math.sin(T * 3) * Math.sin(T * 1.7);
  ctx.fillStyle = win; ctx.globalAlpha = f; ctx.beginPath(); ctx.arc(0, -250, 64, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1; ctx.strokeStyle = '#0a0812'; ctx.lineWidth = 8; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.beginPath(); ctx.moveTo(0, -250); ctx.lineTo(Math.cos(a) * 64, -250 + Math.sin(a) * 64); ctx.stroke(); }
  ctx.fillStyle = win; ctx.globalAlpha = f * 0.7; ctx.fillRect(-40, -120, 80, 140);
  ctx.restore();
  glow(ctx, x, y - 250 * s, 200 * s, win, 0.35 * f);
}
function cathedralNight(ctx, S, T, lt) {
  sky(ctx, [[0, '#03040a'], [0.6, '#0c1624'], [1, '#13242c']]);
  stars(ctx, T, { alpha: 0.7, seed: 71, n: 220, yMax: 500 });
  ctx.fillStyle = '#e8f0ff'; ctx.beginPath(); ctx.arc(1480, 200, 46, 0, TAU); ctx.fill(); glow(ctx, 1480, 200, 260, '#bfd8ff', 0.3);
  drownedCity(ctx, T, 560);
  cathedral(ctx, 960, 640, 1, T);
  // steps & Varkas with the crown
  ctx.fillStyle = '#0c0a12'; for (let i = 0; i < 5; i++) ctx.fillRect(760 + i * 16, 640 + i * 18, 400 - i * 32, 18);
  figure(ctx, 'e_boss_varkas', 'idle', T, 960, 650, 1.2, { color: '#050308', rim: '#ff9a50', rimA: 0.7 });
  glow(ctx, 962, 650 - 110 * 1.2 * 0.93, 60, '#ff8a2a', 0.8);
  water(ctx, 700, T, '#03060a', '#123038');
  // the dead rising from the water
  if (lt > 11) {
    const R = rng(13);
    for (let i = 0; i < 14; i++) {
      const x = 120 + R() * 1700, d = R(), t0 = 11.5 + R() * 6, k = easeOut(seg(lt, t0, t0 + 3));
      if (k <= 0) continue;
      const y = 780 + d * 220, sc = 1.8 + d * 1.6;
      ctx.save(); ctx.beginPath(); ctx.rect(-DW, -DH, DW * 3, y - 2 + DH); ctx.clip();
      figure(ctx, R() > 0.35 ? 'e_thrall' : 'e_graveknight', 'walk', T * 0.5 + i, x, y + (1 - k) * 45 * sc, sc, { color: '#030608', rim: '#7affd8', rimA: 0.45 });
      ctx.restore();
      glow(ctx, x + 6, y - 32 * sc * k, 16, '#7affd8', k * 0.8);
      ctx.save(); ctx.strokeStyle = rgba('#7affd8', 0.4 * (1 - seg(lt, t0 + 2, t0 + 5))); ctx.lineWidth = 2; const rr = 30 + (lt - t0) * 40; ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.22, 0, 0, TAU); ctx.stroke(); ctx.restore();
    }
  }
  S.embers.draw(ctx, 0.8);
  vignette(ctx, 0.7);
}

// ------------------------------------------------------------------ c3_end — The Wall Answers (after 3-8)
const C3_END = {
  music: 'story_hope', musicLoop: true, dur: 49, atlases: ['enemies3', 'units', 'portraits'],
  init(S) { S.sparks = new Particles({ kind: 'ember', add: true, rate: 0, life: 2, size: 3, vx: 0, vxr: 500, vy: -200, vyr: 300, g: 200, color: '#ffb060' }); },
  update(S, dt) { S.sparks.update(dt); },
  cues: [{ t: 3.0, sfx: 'cine_whoosh', vol: 0.8 }, { t: 11.5, sfx: 'wall_crack', vol: 0.9 }, { t: 11.5, shake: 9, d: 1.6 }, { t: 33.5, sfx: 'gate_break', vol: 0.6 }],
  captions: [
    { t: 1.0, d: 7.6, ko: '왕관이 부서지자, 그 불꽃은 동쪽으로 날아갔다. 자신을 부르는 심장에게로.', en: 'When the Crown shattered, its fire flew east — home, to the Heart that called it.' },
    { t: 11.4, d: 6.4, ko: '삼백 년 만에 처음으로, 성벽이 신음했다.', en: 'For the first time in three hundred years, the wall groaned.' },
    { t: 21.6, d: 5.0, who: 'seren', ko: '벽이 제 피에 대답하고 있어요. 문을 열어 달래요.', en: 'The wall is answering my blood. It wants to be opened.' },
    { t: 27.2, d: 5.0, who: 'brannoc', ko: '그럼 열어 줍시다. 이번엔 우리가 넘어갈 차례요.', en: 'Then let\'s open it. This time, we\'re the ones crossing over.' },
    { t: 41.0, d: 7.0, style: 'card', ko: ['제4장', '재의 심장'], en: ['Chapter IV', 'Heart of Ash'] },
  ],
  shots: [
    { t0: 0, t1: 10.4, xf: 0, draw: (ctx, S, lt, u, T) => {
      sky(ctx, [[0, '#0a1018'], [0.6, '#24343c'], [1, '#3a4a4a']]);
      drownedCity(ctx, T, 600);
      cathedral(ctx, 960, 680, 0.9, T, '#5a4030');
      water(ctx, 720, T, '#060a0c', '#1a3036');
      emberCrown(ctx, 900, 760, 70, T, 1 - seg(lt, 1.8, 3.2));
      // the crown's fire leaps up and streaks east
      const k = easeIn(seg(lt, 2.4, 6.5));
      if (k > 0 && k < 1) { const x = lerp(900, 2100, k), y = lerp(720, 120, Math.sqrt(k)); glow(ctx, x, y, 140, '#ff8a2a', 0.8); glow(ctx, x, y, 40, '#fff2c8', 1); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,170,80,0.6)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(lerp(900, 2100, Math.max(0, k - 0.15)), lerp(720, 120, Math.sqrt(Math.max(0, k - 0.15)))); ctx.lineTo(x, y); ctx.stroke(); ctx.restore(); }
      vignette(ctx, 0.65);
    } },
    { t0: 10.4, t1: 21.2, xf: 1.0, draw: (ctx, S, lt, u, T) => {
      nightWall(ctx, T);
      const k = seg(lt, 1, 4.5);
      const pts = [[-200, 700], [400, 662], [900, 652], [1400, 652], [2100, 652]];
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const [lw, col] of [[16, 'rgba(160,220,255,0.25)'], [5, '#cfeeff']]) { ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.beginPath(); const R = rng(4); let first = true; for (let x = -200; x < -200 + 2300 * k; x += 40) { const y = 690 + (x / 2300) * 60 + (R() - 0.5) * 30; first ? ctx.moveTo(x, y) : ctx.lineTo(x, y); first = false; } ctx.stroke(); }
      ctx.restore();
      wallAlong(ctx, [[-200, 760, 60], [400, 740, 80], [900, 760, 110], [1400, 800, 150], [2100, 860, 210]], { color: 'rgba(0,0,0,0)', runes: 0.4 + 0.4 * Math.sin(T * 6) * k });
      const c = seg(lt, 0, 3); if (c < 1) glow(ctx, lerp(-100, 2100, c), lerp(150, 60, c), 120, '#ff8a2a', 0.7);
      vignette(ctx, 0.65);
    } },
    { t0: 21.2, t1: 33, xf: 1.0, draw: (ctx, S, lt, u, T) => duet(ctx, T, 'seren', 'brannoc', T < 27 ? 'seren' : 'brannoc', nightWall) },
    { t0: 33, t1: 49, xf: 1.0, draw: (ctx, S, lt, u, T) => {
      sky(ctx, [[0, '#0a0c1a'], [0.5, '#3a2a3a'], [0.8, '#c8603a'], [1, '#ffb070']]);
      const open = easeInOut(seg(lt, 0.4, 6));
      wall(ctx, -200, 700, 900, 520, { color: '#16141e', bricks: '#2a2834', light: '#ffb070', lightA: 0.3 });
      wall(ctx, 1220, 2120, 900, 520, { color: '#16141e', bricks: '#2a2834', light: '#ffb070', lightA: 0.3 });
      tower(ctx, 690, 900, 160, 640, { color: '#14121c', banner: { field: '#21438e', emblem: 'tower', edge: '#d8b060' } }, T);
      tower(ctx, 1230, 900, 160, 640, { color: '#14121c', banner: { field: '#21438e', emblem: 'tower', edge: '#d8b060' } }, T);
      ctx.fillStyle = '#16141e'; ctx.fillRect(700, 340, 520, 140);
      gate(ctx, 960, 900, 440, 560, { broken: open, door: '#2a1a12', inside: '#ffb070', through: (c) => { sky(c, [[0, '#ffd8a0'], [0.6, '#ff8a3a'], [1, '#8a2a10']], 300, 900); peaks(c, { y: 900, n: 5, x0: 700, x1: 1220, hmin: 40, hmax: 120, seed: 4, color: '#5a2010' }); } });
      glow(ctx, 960, 760, 600, '#ffb070', 0.35 * open);
      procession(ctx, T, { types: ARMY, n: 18, x0: -200, x1: 2200, y: 1010, scale: 3.4, speed: 70, color: '#06050a', seed: 8, rim: '#ffb070', rimA: 0.6 });
      vignette(ctx, 0.6);
    } },
  ],
};

// ------------------------------------------------------------------ c4_mid — The Fallen Star (after 4-4)
const C4_MID = {
  music: 'story_somber', musicLoop: true, dur: 42, atlases: ['portraits'],
  captions: [
    { t: 1.0, d: 7.4, ko: '별지기들의 벽화는 전혀 다른 이야기를 하고 있었다.', en: 'The star-watchers\' murals told a very different story.' },
    { t: 10.6, d: 7.0, ko: '심장은 침략자가 아니었다. 길을 잃은 별이었다.', en: 'The Heart was no invader. It was a star that had lost its way.' },
    { t: 24.6, d: 7.2, ko: '마엘리스는 그것을 죽일 수 없었다. 그래서 가두었다. 자신의 피와 함께.', en: 'Maelis could not kill it. So she caged it — with her own blood.' },
    { t: 33.2, d: 6.6, who: 'ysolde', ko: '삼백 년 동안, 저 별은 울고 있었던 거야.', en: 'For three hundred years, that star has been weeping.' },
  ],
  shots: [
    { t0: 0, t1: 24.2, xf: 0, draw: (ctx, S, lt, u, T) => mural(ctx, T, lt, u) },
    { t0: 24.2, t1: 42, xf: 1.4, draw: (ctx, S, lt, u, T) => {
      sky(ctx, [[0, '#02030a'], [0.6, '#0c0c22'], [1, '#2a1018']]);
      stars(ctx, T, { alpha: 0.9, seed: 81, n: 280, yMax: 640 });
      // the crater, the trapped star, the queen binding it
      ctx.fillStyle = '#0a0608'; ctx.beginPath(); ctx.moveTo(-200, 1200); ctx.lineTo(-200, 760); ctx.bezierCurveTo(400, 720, 700, 790, 900, 820); ctx.bezierCurveTo(1100, 860, 1500, 860, 2200, 780); ctx.lineTo(2200, 1200); ctx.closePath(); ctx.fill();
      starCore(ctx, 1260, 900, 46, T, 0.9);
      glow(ctx, 1260, 900, 500, '#ff6a20', 0.35);
      const bind = easeOut(seg(lt, 2, 9));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(170,220,255,0.7)'; ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) { const a = -0.9 + i * 0.36; ctx.beginPath(); ctx.moveTo(560, 700); ctx.quadraticCurveTo(lerp(560, 1260 + Math.cos(a) * 120, 0.5), 600 + i * 30, lerp(560, 1260 + Math.cos(a) * 90, bind), lerp(700, 900 + Math.sin(a) * 60, bind)); ctx.stroke(); }
      ctx.restore();
      queen(ctx, 560, 800, 110, { arms: 0.55, color: '#05040a' }, T);
      glow(ctx, 560, 640, 220, '#9fd8ff', 0.3);
      tint(ctx, '#3a50a0', 0.08, 'lighter');
      vignette(ctx, 0.7);
    } },
  ],
};
function mural(ctx, T, lt, u) {
  // torch-lit fresco on a temple wall; the camera drifts across it
  ctx.fillStyle = '#120a06'; ctx.fillRect(-DW, -DH, DW * 3, DH * 3);
  const pan = easeInOut(u) * 700;
  ctx.save(); ctx.translate(-pan, 0);
  const W = 2600, X0 = -100, Y0 = 120, H = 820;
  const g = ctx.createLinearGradient(0, Y0, 0, Y0 + H); g.addColorStop(0, '#b88a54'); g.addColorStop(1, '#8a6038'); ctx.fillStyle = g; ctx.fillRect(X0, Y0, W, H);
  const R = rng(17);
  for (let i = 0; i < 900; i++) { ctx.fillStyle = rgba(R() > 0.5 ? '#5a3a1a' : '#e8c890', 0.05 + R() * 0.08); ctx.fillRect(X0 + R() * W, Y0 + R() * H, 2 + R() * 10, 2 + R() * 6); }
  // painted bands
  ctx.fillStyle = '#5a2a14'; ctx.fillRect(X0, Y0 + 30, W, 16); ctx.fillRect(X0, Y0 + H - 46, W, 16);
  // panel 1: the star falls; panel 2: the crater weeps; panel 3: the queen kneels; panel 4: the wall
  const P = (x, f) => { ctx.save(); ctx.translate(x, Y0 + H / 2); f(); ctx.restore(); };
  P(260, () => { ctx.strokeStyle = '#f2d070'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-200, -260); ctx.lineTo(80, 60); ctx.stroke(); starPaint(ctx, 100, 90, 50); });
  P(860, () => { ctx.fillStyle = '#4a2010'; ctx.beginPath(); ctx.ellipse(0, 200, 300, 70, 0, 0, TAU); ctx.fill(); starPaint(ctx, 0, 120, 70); ctx.strokeStyle = '#d84a20'; ctx.lineWidth = 8; for (let k = -1; k <= 1; k += 2) { ctx.beginPath(); ctx.moveTo(k * 30, 170); ctx.quadraticCurveTo(k * 60, 260, k * 40, 330); ctx.stroke(); } for (let i = 0; i < 5; i++) { ctx.fillStyle = '#3a1a10'; ctx.beginPath(); ctx.arc(-260 + i * 120 + (i > 1 ? 40 : 0), 300, 26, 0, TAU); ctx.fill(); ctx.fillRect(-270 + i * 120 + (i > 1 ? 40 : 0), 300, 20, 60); } });
  P(1500, () => { ctx.save(); ctx.scale(1.6, 1.6); queen(ctx, 0, 180, 70, { arms: 0.15, color: '#2a3a6a' }, 0); ctx.restore(); ctx.strokeStyle = '#7aaad8'; ctx.lineWidth = 6; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(30, -60); ctx.lineTo(220 + i * 30, -200 + i * 70); ctx.stroke(); } starPaint(ctx, 320, 0, 40); });
  P(2150, () => { ctx.fillStyle = '#4a3a2a'; ctx.fillRect(-300, 60, 600, 160); for (let i = 0; i < 8; i++) ctx.fillRect(-300 + i * 80, 30, 40, 30); ctx.fillStyle = '#6a8ac8'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-200 + i * 130, 140, 14, 0, TAU); ctx.fill(); } });
  // cracks
  ctx.strokeStyle = 'rgba(40,20,10,0.55)'; ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) { let x = X0 + R() * W, y = Y0 + R() * H; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 120; y += R() * 60; ctx.lineTo(x, y); } ctx.stroke(); }
  ctx.restore();
  // torch light
  const f = 0.85 + 0.15 * Math.sin(T * 9) * Math.sin(T * 5.7);
  const lg = ctx.createRadialGradient(560, 900, 100, 760, 560, 1500); lg.addColorStop(0, `rgba(0,0,0,0)`); lg.addColorStop(1, `rgba(0,0,0,${0.75 - 0.1 * f})`);
  ctx.fillStyle = lg; ctx.fillRect(-DW, -DH, DW * 3, DH * 3);
  glow(ctx, 380, 980, 600 * f, '#ff9a40', 0.28);
  flame(ctx, 380, 1000, 36, T, 9);
}
function starPaint(ctx, x, y, r) {
  ctx.fillStyle = '#f6dc80'; ctx.beginPath();
  for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + i * Math.PI / 8, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#5a2a14'; ctx.beginPath(); ctx.arc(x - r * 0.18, y - r * 0.05, r * 0.07, 0, TAU); ctx.arc(x + r * 0.18, y - r * 0.05, r * 0.07, 0, TAU); ctx.fill();
}

export const INTERLUDES = { c1_mid: C1_MID, c1_end: C1_END, c2_mid: C2_MID, c2_end: C2_END, c3_mid: C3_MID, c3_end: C3_END, c4_mid: C4_MID };
