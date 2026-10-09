// Rampart Riot — opening film (91 s), locked to the cue sheet of music/opening.mp3:
// void 0 · bell 2 · impact 7.5 · ashen_host 10 · the_wall 20 · wall_chord 37.5 · forgotten 40 · beacons 50
// beacon1..8 55..63.75 · breach 65 · warden_call 67.5 · build 70 · silence 72.2 · title_slam 72.5 · final_chord 82.5
import { Assets } from '../core/assets.js';
import { TAU } from '../core/util.js';
import {
  DW, DH, lerp, sm, seg, easeOut, easeIn, easeInOut, rng, mix, rgba, sky, stars, glow, haze, vignette, tint, godRays,
  ridge, peaks, treeLine, wall, wallAlong, tower, beacon, flame, banner, figure, procession, queen, Particles, plate, smoke, noise1,
} from './kit.js';

const HORDE = [{ sprite: 'e_grimling' }, { sprite: 'e_grimling' }, { sprite: 'e_grimling' }, { sprite: 'e_slinger' }, { sprite: 'e_hound' }, { sprite: 'e_shaman' }, { sprite: 'e_brute', scale: 1 }];
const BEACON_T = [55, 56.25, 57.5, 58.75, 60, 61.25, 62.5, 63.75];

export const OPENING = {
  music: 'opening', sync: true, dur: 91, fadeIn: 0.6, fadeOut: 2.5,
  atlases: ['enemies1', 'towers', 'units'],
  images: ['assets/ui/title_bg.jpg'],
  init(S) {
    S.embers = new Particles({ kind: 'ember', add: true, rate: 22, x0: 300, x1: 2300, y0: 980, y1: 1120, vx: -50, vxr: 40, vy: -70, vyr: 50, life: 7, size: 2.6, sway: 22, color: '#ffa04a', twinkle: true, max: 260 });
    S.embers.prefill(4);
    S.snow = new Particles({ kind: 'dot', rate: 60, x0: -100, x1: 2100, y0: -30, y1: -10, vx: -30, vxr: 20, vy: 110, vyr: 40, life: 12, size: 2.4, sway: 25, color: '#ffffff', alpha: 0.85, max: 500 });
    S.dust = new Particles({ kind: 'dot', rate: 0, life: 2.2, size: 9, vx: 0, vxr: 160, vy: -40, vyr: 80, drag: 1.2, color: '#5a4a44', alpha: 0.5, max: 300 });
    S.chunks = new Particles({ kind: 'chunk', rate: 0, life: 2.4, size: 20, vx: -200, vxr: 500, vy: -380, vyr: 300, g: 900, spin: 8, color: '#17121a', max: 120 });
    S.sparks = new Particles({ kind: 'ember', add: true, rate: 0, life: 1.6, size: 3, vx: 0, vxr: 900, vy: -300, vyr: 600, g: 500, drag: 0.6, color: '#ffc070', max: 300 });
    S.wallRise = Array.from({ length: 14 }, () => ({ dusted: false }));
    S.beacons = BEACON_T.map(() => ({ lit: false }));
    S.built = [false, false, false, false];
  },
  update(S, dt, t) {
    S.embers.o.rate = t < 7.5 ? 0 : t < 40 ? 26 : t < 50 ? 0 : 22;
    S.embers.update(dt);
    S.snow.o.rate = t > 45.5 && t < 48.6 ? 70 : 0;
    S.snow.update(dt); S.dust.update(dt); S.chunks.update(dt); S.sparks.update(dt);
    // wall segments rising: puffs of dust at their feet
    S.wallRise.forEach((w, i) => { const ts = 23.2 + i * 0.95; if (!w.dusted && t >= ts) { w.dusted = true; S.dust.emit(8, { x: wallX(i) + 60, y: 812, w: 120, h: 8 }); } });
    S.beacons.forEach((b, i) => { if (!b.lit && t >= BEACON_T[i]) { b.lit = true; const p = beaconPos(i); S.sparks.emit(18, { x: p.x, y: p.y - 10, w: 10, h: 10 }); } });
    if (!S.breached && t >= 65) { S.breached = true; S.chunks.emit(42, { x: 980, y: 560, w: 240, h: 300 }); S.dust.emit(40, { x: 980, y: 700, w: 400, h: 300 }); S.sparks.emit(60, { x: 980, y: 600, w: 120, h: 200 }); }
    for (let i = 0; i < 4; i++) if (!S.built[i] && t >= 70 + i * 0.625) { S.built[i] = true; S.dust.emit(16, { x: 360 + i * 400, y: 860, w: 200, h: 10 }); }
    if (!S.slam && t >= 72.5) { S.slam = true; S.sparks.emit(90, { x: DW / 2, y: DH * 0.42, w: 900, h: 260 }); }
  },
  cues: [
    { t: 7.5, flash: 1, d: 1.4 }, { t: 7.5, shake: 22, d: 1.8 },
    { t: 37.5, flash: 0.35, color: '#9fd8ff', d: 1.2 },
    { t: 65.0, shake: 16, d: 1.5 }, { t: 65.0, flash: 0.45, color: '#ff9a50', d: 0.7 },
    { t: 72.5, flash: 1, d: 1.0 }, { t: 72.5, shake: 12, d: 0.9 },
  ],
  captions: [
    { t: 2.3, d: 4.6, ko: '삼백 년 전.', en: 'Three hundred years ago.' },
    { t: 10.3, d: 4.0, ko: '하늘에서 불이 떨어졌다.', en: 'Fire fell from the sky.' },
    { t: 14.6, d: 5.0, ko: '그 재 속에서, 군대가 일어났다.', en: 'And from its ashes, a host arose.' },
    { t: 20.6, d: 5.4, ko: '여왕 마엘리스는 자신의 피를 돌에 묶었다.', en: 'Queen Maelis bound her own blood to stone,' },
    { t: 26.4, d: 5.0, ko: '그리고 성벽을 세웠다.', en: 'and raised the Rampart' },
    { t: 31.6, d: 5.6, ko: '사람의 땅과 재의 땅 사이에.', en: 'between the land of men and the land of ash.' },
    { t: 40.6, d: 3.8, ko: '성벽은 삼백 년을 버텼다.', en: 'The wall held for three hundred years.' },
    { t: 44.6, d: 5.0, ko: '그리고 사람들은 잊었다. 그것이 왜 서 있는지를.', en: 'And people forgot why it stood.' },
    { t: 50.8, d: 3.6, ko: '그러던 어느 밤—', en: 'Until one night—' },
    { t: 56.2, d: 6.4, ko: '봉화가 성벽을 따라 타올랐다.', en: 'the beacons blazed along the wall.' },
    { t: 65.3, d: 2.2, ko: '성벽이 무너졌다.', en: 'The wall was breached.' },
    { t: 67.7, d: 4.2, ko: '봉화를 올려라. 수호관을 불러라.', en: 'Light the beacons. Summon the Warden.' },
    { t: 82.8, d: 6.4, style: 'card', y: 0.8, ko: ['제1장', '녹음의 변경'], en: ['Chapter I', 'The Greenmarch'] },
  ],
  shots: [
    { t0: 0, t1: 7.5, xf: 0, draw: shotVoid },
    { t0: 7.5, t1: 20, xf: 0, draw: shotFall },
    { t0: 20, t1: 40, xf: 1.2, draw: shotQueen },
    { t0: 40, t1: 50, xf: 1.2, draw: shotForgotten },
    { t0: 50, t1: 65, xf: 1.4, draw: shotBeacons },
    { t0: 65, t1: 67.5, xf: 0, draw: shotBreach },
    { t0: 67.5, t1: 70, xf: 0.25, draw: shotBanner },
    { t0: 70, t1: 72.2, xf: 0.15, draw: shotBuild },
    { t0: 72.5, t1: 91.5, xf: 0, draw: shotTitle },
  ],
};

// ------------------------------------------------------------------ 0–7.5: the void and the falling star
function shotVoid(ctx, S, lt, u, T) {
  sky(ctx, [[0, '#020208'], [0.6, '#06081a'], [1, '#0d0f22']]);
  stars(ctx, T, { alpha: sm(seg(T, 0.5, 4)) * 0.85, seed: 3, n: 260, yMax: 860 });
  ridge(ctx, { y: 840, amp: 70, freq: 0.0028, seed: 5, color: '#07070d' });
  ridge(ctx, { y: 930, amp: 90, freq: 0.0035, seed: 8, color: '#030305' });
  const p = easeIn(seg(T, 4.4, 7.5));
  if (T > 4.2) {
    const x0 = 260, y0 = 90, x1 = 1420, y1 = 790;
    const hx = lerp(x0, x1, p), hy = lerp(y0, y1, p);
    const tl = 0.18 + 0.25 * p;
    const tx = lerp(x0, x1, Math.max(0, p - tl)), ty = lerp(y0, y1, Math.max(0, p - tl));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(tx, ty, hx, hy); g.addColorStop(0, 'rgba(255,190,120,0)'); g.addColorStop(1, 'rgba(255,240,210,0.95)');
    ctx.strokeStyle = g; ctx.lineCap = 'round'; ctx.lineWidth = 4 + p * 10; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.restore();
    glow(ctx, hx, hy, 60 + p * 220, '#ffd8a0', 0.5 + p * 0.5);
    glow(ctx, hx, hy, 18 + p * 40, '#ffffff', 1);
    tint(ctx, '#ff9a50', p * p * 0.22, 'lighter');
  }
  vignette(ctx, 0.7);
}

// ------------------------------------------------------------------ 7.5–20: impact, the burning land, the host
function shotFall(ctx, S, lt, u, T) {
  const cam = easeInOut(seg(T, 9, 20)) * 220;
  ctx.save(); ctx.translate(-cam * 0.15, 0);
  sky(ctx, [[0, '#07020a'], [0.45, '#2a0a12'], [0.72, '#7a1e10'], [0.86, '#d0501a'], [1, '#2a0a06']]);
  stars(ctx, T, { alpha: 0.25, seed: 9, n: 120, yMax: 400 });
  // smoke column from the crater
  const cx = 1420, cy = 790;
  glow(ctx, cx, cy - 20, 620, '#ff5a1a', 0.75);
  smoke(ctx, cx, cy - 40, T, { n: 22, h: 760, r: 110, color: '#1a0808', alpha: 0.55, drift: -260, speed: 0.04 });
  glow(ctx, cx, cy - 10, 220, '#ffd08a', 0.9 - 0.4 * seg(lt, 0, 4));
  ctx.restore();
  ctx.save(); ctx.translate(-cam * 0.4, 0);
  peaks(ctx, { y: 800, n: 10, x0: -300, x1: 2600, hmin: 70, hmax: 230, seed: 12, color: '#2a0e10', grad: '#160709', saddle: 40, rim: '#ff7a3a', rimA: 0.35 });
  ctx.restore();
  // the host marching along the skyline of the near ridge, silhouetted against the glow
  ctx.save(); ctx.translate(-cam, 0);
  if (T > 9.6) {
    const a = sm(seg(T, 9.6, 11.5));
    procession(ctx, T, { types: HORDE, n: 30, x0: -300, x1: 2700, y: 872, scale: 4.2, speed: -60, color: '#060203', flip: true, alpha: a, seed: 31, jitter: 10, rim: '#ff7a3a' });
  }
  ctx.fillStyle = '#060203'; ctx.fillRect(-400, 868, 3400, 400);
  ridge(ctx, { y: 880, amp: 14, seed: 21, freq: 0.004, color: '#060203', x1: 2800 });
  ctx.restore();
  S.embers.draw(ctx, 0.9);
  ridge(ctx, { y: 1100, amp: 70, seed: 41, freq: 0.003, color: '#020101' });
  vignette(ctx, 0.65);
}

// ------------------------------------------------------------------ 20–40: the queen raises the wall
function wallX(i) { return 560 + i * 118; }
function shotQueen(ctx, S, lt, u, T) {
  const cam = easeInOut(seg(T, 20, 40));
  const chord = Math.max(0, 1 - Math.abs(T - 37.6) / 1.6);
  ctx.save(); ctx.translate(-cam * 90, -cam * 14);
  sky(ctx, [[0, '#060a1c'], [0.38, '#1a1a3c'], [0.66, '#4a2a50'], [0.82, '#a04a34'], [1, '#1a0c10']]);
  stars(ctx, T, { alpha: 0.65, seed: 17, n: 220, yMax: 520 });
  glow(ctx, 1750, 820, 760, '#ff4a1a', 0.5);
  peaks(ctx, { y: 790, n: 9, x0: -200, x1: 2400, hmin: 90, hmax: 260, seed: 44, color: '#241a30', grad: '#1a1424', snow: '#4a3e5c', shade: '#000000' });
  // the host halted beyond the wall (right, far)
  procession(ctx, T * 0.2, { types: HORDE, n: 30, x0: 1250, x1: 2400, y: 800, scale: 1.3, speed: 0, color: '#120a10', flip: true, seed: 52, jitter: 16 });
  ridge(ctx, { y: 812, amp: 26, seed: 46, color: '#151020', x1: 2400 });
  // the wall rising segment by segment from the queen's hill toward the horizon
  for (let i = 0; i < 14; i++) {
    const ts = 23.2 + i * 0.95, r = easeOut(seg(T, ts, ts + 1.2));
    if (r <= 0) continue;
    const x0 = wallX(i), x1 = x0 + 120, base = 860 - i * 3.4, hh = (190 - i * 7) * r;
    const runes = Math.max(seg(T, ts + 0.6, ts + 1.4) * (1 - seg(T, ts + 3.5, ts + 7)) * 0.95, chord);
    wall(ctx, x0, x1, base, hh, { color: '#17121f', bricks: '#2c2638', runes, seed: i + 3, light: '#9a7ab8', lightA: 0.22, merlon: 14 - i * 0.4 });
    if (i % 3 === 1 && r > 0.95) tower(ctx, x1, base, 56 - i * 2, (260 - i * 9) * r, { color: '#16111d', light: '#7a6a9a', lightA: 0.2 }, T);
    // a ribbon of light flows from the queen to each new segment as it rises
    const fl = seg(T, ts - 0.4, ts + 0.3) * (1 - seg(T, ts + 0.3, ts + 1.2));
    if (fl > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fl * 0.6; ctx.strokeStyle = '#bfe6ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(534, 532); ctx.quadraticCurveTo((534 + x0) / 2, 440, x0 + 60, base - hh * 0.5); ctx.stroke(); ctx.restore(); glow(ctx, x0 + 60, base - hh * 0.5, 120, '#bfe6ff', fl * 0.5); }
  }
  ctx.restore();
  // the queen on her hill (near layer)
  ctx.save(); ctx.translate(-cam * 170, 0);
  ctx.fillStyle = '#07060c';
  ctx.beginPath(); ctx.moveTo(-300, 1200); ctx.lineTo(-300, 770); ctx.bezierCurveTo(100, 720, 300, 790, 470, 790); ctx.bezierCurveTo(560, 792, 640, 850, 760, 1000); ctx.lineTo(900, 1200); ctx.closePath(); ctx.fill();
  const arms = easeInOut(seg(T, 21, 24.2)) * (1 - 0.4 * seg(T, 38.6, 40));
  glow(ctx, 470, 560, 300, '#9fd8ff', 0.18 * seg(T, 22, 25) + chord * 0.55);
  glow(ctx, 470 - 64, 792 - 262, 60, '#e8f6ff', 0.7 * arms); glow(ctx, 470 + 64, 792 - 262, 60, '#e8f6ff', 0.7 * arms);
  queen(ctx, 470, 792, 118, { arms, color: '#05040a' }, T);
  ctx.restore();
  S.embers.draw(ctx, 0.3);
  vignette(ctx, 0.6);
}

// ------------------------------------------------------------------ 40–50: three peaceful centuries
const FWALL = [[-160, 930, 170], [150, 880, 150], [430, 822, 122], [700, 780, 98], [960, 752, 80], [1210, 733, 64], [1470, 718, 52], [1730, 707, 42], [2000, 700, 34], [2300, 696, 28]];
function shotForgotten(ctx, S, lt, u, T) {
  // seasons: spring/summer -> autumn -> winter -> night falls
  const sA = seg(T, 42.4, 44.2), sW = seg(T, 45.2, 46.6), sN = seg(T, 48.2, 50.2);
  const season = (g, a, wv, n) => mix(mix(mix(g, a, sA * (1 - sW)), wv, sW), n, sN);
  sky(ctx, [[0, season('#4a8ad0', '#6a8ab8', '#8ea4bc', '#141c3c')], [0.62, season('#cfe6f2', '#f2d8b0', '#e4ebf2', '#3a3456')], [1, season('#e8f2f0', '#f6e0c0', '#f0f4f6', '#4a3a4a')]]);
  const sunX = 1500 - sN * 200, sunY = 250 + sN * 520;
  glow(ctx, sunX, sunY, 520, season('#fff6d8', '#ffd8a0', '#ffffff', '#ff8a4a'), 0.55 * (1 - sN * 0.5));
  if (sN > 0.4) stars(ctx, T, { alpha: (sN - 0.4) * 1.2, seed: 33, n: 160, yMax: 500 });
  const cam = easeInOut(u) * 160;
  ctx.save(); ctx.translate(-cam * 0.25, 0);
  peaks(ctx, { y: 690, n: 9, x0: -200, x1: 2400, hmin: 70, hmax: 230, seed: 70, color: season('#7a96aa', '#8a90a2', '#a8b4c4', '#262a44'), grad: season('#9ab4c0', '#a8a4b0', '#c8d2dc', '#30304a'), snow: season('#f4f8fb', '#f4f6f8', '#ffffff', '#9aa0b8'), shade: '#20304a' });
  ridge(ctx, { y: 760, amp: 60, seed: 71, freq: 0.0022, color: season('#86a87a', '#b0a070', '#d4dde4', '#262c40'), x1: 2400 });
  ctx.restore();
  ctx.save(); ctx.translate(-cam * 0.55, 0);
  // the old wall winding over the hills (ivy-grown, sun-lit)
  ridge(ctx, { y: 860, amp: 80, seed: 72, freq: 0.0018, color: season('#6f9a52', '#b08a42', '#dfe6ec', '#1c2234'), x1: 2500 });
  wallAlong(ctx, FWALL, { color: season('#a49c8c', '#a89c88', '#b4b0ac', '#2c2a36'), face: season('#7a7466', '#7c7060', '#8a8890', '#1c1a24'), bricks: season('#5e584c', '#5e5446', '#6a6870', '#14121a'), bricksA: 0.45, top: season('#fffaf0', '#fff0d0', '#ffffff', '#6a6a90'), topA: 0.55 });
  [1, 3, 5, 7].forEach(k => { const [x, y, h] = FWALL[k]; tower(ctx, x, y, h * 0.62, h * 1.75, { color: season('#9a9282', '#a09480', '#aeaaa8', '#28262f'), light: '#ffffff', lightA: 0.18 * (1 - sN), window: sN > 0.55 ? '#ffcf7a' : null }, T); });
  // ivy patches
  const R = rng(7); ctx.save(); ctx.fillStyle = season('#3e6e2a', '#9a5a20', '#a4b0a8', '#141a20');
  for (let i = 0; i < 70; i++) { const k = R() * (FWALL.length - 1), a = Math.floor(k), f = k - a, p0 = FWALL[a], p1 = FWALL[a + 1]; const x = lerp(p0[0], p1[0], f), y = lerp(p0[1], p1[1], f), h = lerp(p0[2], p1[2], f); ctx.globalAlpha = 0.55 + R() * 0.4; ctx.beginPath(); ctx.ellipse(x, y - h * (0.15 + R() * 0.6), h * (0.06 + R() * 0.08), h * (0.1 + R() * 0.16), 0, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.restore();
  ctx.save(); ctx.translate(-cam, 0);
  // near fields and orchards
  ridge(ctx, { y: 960, amp: 90, seed: 75, freq: 0.0016, color: season('#5e8a3e', '#a07a32', '#e8eef2', '#141a28'), x1: 2700 });
  const F = rng(12);
  for (let i = 0; i < 9; i++) { const fx = -100 + i * 300 + F() * 60, fy = 975 + F() * 30; ctx.save(); ctx.translate(fx, fy); ctx.transform(1, 0, -0.5, 0.32, 0, 0); ctx.fillStyle = season(['#7aa04a', '#a8b85a', '#6a8a3a'][i % 3], ['#d8a840', '#c88a32', '#b8782a'][i % 3], '#f4f8fa', '#182030'); ctx.fillRect(0, 0, 240, 160); ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 6; for (let k = 20; k < 240; k += 26) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, 160); ctx.stroke(); } ctx.restore(); }
  treeLine(ctx, { y: 950, h: 80, spacing: 44, seed: 77, color: season('#3a6a2a', '#a8642a', '#e2eaee', '#0e1420'), round: true });
  ridge(ctx, { y: 1110, amp: 100, seed: 79, color: season('#4a7432', '#8a6428', '#ccd6de', '#0a0e18'), x1: 2700 });
  ctx.restore();
  if (T < 44) { ctx.save(); ctx.strokeStyle = 'rgba(20,24,30,0.7)'; ctx.lineWidth = 3; for (let i = 0; i < 7; i++) { const bx = 300 + lt * 90 + i * 46 + (i % 2) * 20, by = 300 - i * 12 + Math.sin(lt * 3 + i) * 6, f = Math.sin(lt * 9 + i) * 8; ctx.beginPath(); ctx.moveTo(bx - 12, by - f); ctx.quadraticCurveTo(bx - 4, by - 4, bx, by); ctx.quadraticCurveTo(bx + 4, by - 4, bx + 12, by - f); ctx.stroke(); } ctx.restore(); }
  S.snow.draw(ctx, 1);
  vignette(ctx, 0.3 + sN * 0.35);
}

// ------------------------------------------------------------------ 50–65: the beacons, one by one
const BWALL = [[-200, 610, 14], [120, 604, 18], [420, 612, 24], [700, 626, 31], [960, 645, 42], [1200, 668, 57], [1420, 700, 78], [1630, 742, 108], [1830, 800, 152], [2030, 880, 214], [2260, 980, 300]];
function beaconPos(i) { const p = BWALL[i + 2]; return { x: p[0], y: p[1] - p[2] * 1.55, h: p[2], g: p[1] }; }
function shotBeacons(ctx, S, lt, u, T) {
  const cam = easeInOut(seg(T, 50, 65));
  sky(ctx, [[0, '#02030c'], [0.5, '#0a0f2c'], [0.78, '#1c1c3e'], [1, '#2c1a2c']]);
  stars(ctx, T, { alpha: 0.95, seed: 23, n: 320, yMax: 620, dx: -cam * 30 });
  const mx = 420 - cam * 60;
  glow(ctx, mx, 180, 160, '#d8e4ff', 0.3); ctx.fillStyle = '#eef2ff'; ctx.beginPath(); ctx.arc(mx, 180, 30, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0a0f2c'; ctx.beginPath(); ctx.arc(mx + 12, 171, 27, 0, TAU); ctx.fill();
  glow(ctx, 1500, 650, 1000, '#ff3a10', 0.1 + 0.22 * seg(T, 52, 64));
  ctx.save(); ctx.translate(-cam * 120, 0);
  peaks(ctx, { y: 620, n: 11, x0: -300, x1: 2600, hmin: 50, hmax: 170, seed: 90, color: '#10142c', grad: '#0c0f22', snow: '#2a3050' });
  haze(ctx, 640, 60, '#3a3a6a', 0.25);
  ctx.restore();
  ctx.save(); ctx.translate(-cam * 260, 0);
  // the ridge the wall stands on
  ctx.fillStyle = '#06060e'; ctx.beginPath(); ctx.moveTo(-300, 1300);
  for (const [x, y] of BWALL) ctx.lineTo(x, y + 6); ctx.lineTo(2600, 1100); ctx.lineTo(2600, 1300); ctx.closePath(); ctx.fill();
  wallAlong(ctx, BWALL, { color: '#141626', face: '#0a0a14', bricks: '#262a40', bricksA: 0.5, top: '#8aa0d8', topA: 0.35 });
  for (let i = 0; i < 8; i++) {
    const p = beaconPos(i), lit = seg(T, BEACON_T[i] - 0.05, BEACON_T[i] + 0.35);
    tower(ctx, p.x, p.g, p.h * 1.05, p.h * 1.55, { color: '#10121e', light: lit > 0 ? '#ff9a50' : '#8aa0d8', lightA: lit > 0 ? 0.35 * lit : 0.18, beacon: lit, seed: i * 13 + 5 }, T);
    if (lit > 0) {
      glow(ctx, p.x, p.y, p.h * 6, '#ff7a2a', 0.22 * lit);
      const fl = Math.max(0, 1 - (T - BEACON_T[i]) / 0.55); if (fl > 0) glow(ctx, p.x, p.y - p.h * 0.3, p.h * 9, '#fff0c8', fl * 0.75);
    }
  }
  haze(ctx, 900, 120, '#20244a', 0.35);
  ctx.restore();
  S.sparks.draw(ctx);
  ctx.save(); ctx.translate(-cam * 420, 0);
  ridge(ctx, { y: 1060, amp: 110, seed: 95, color: '#020206', x1: 2800 });
  ctx.restore();
  vignette(ctx, 0.6);
}

// ------------------------------------------------------------------ 65–67.5: the breach
const HOLE = (() => { const n = noise1(77), pts = []; for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; const r = 0.72 + 0.5 * n(i * 0.9) + (i % 2 ? 0.12 : -0.05); pts.push([Math.cos(a) * r, Math.sin(a) * r * 1.15]); } return pts; })();
function holePath(ctx, hx, hy, R, rev) { const P = rev ? HOLE.slice().reverse() : HOLE; ctx.moveTo(hx + P[0][0] * R, hy + P[0][1] * R); for (const [x, y] of P) ctx.lineTo(hx + x * R, hy + y * R); ctx.closePath(); }
function shotBreach(ctx, S, lt, u, T) {
  const z = 1 + easeOut(seg(lt, 0, 2.5)) * 0.07;
  ctx.save(); ctx.translate(DW / 2, DH / 2); ctx.scale(z, z); ctx.translate(-DW / 2, -DH / 2);
  const hx = 960, hy = 560, R = 250 * easeOut(seg(lt, 0.02, 0.5));
  // through the hole: the burning land and the host pouring in
  ctx.save(); ctx.beginPath(); holePath(ctx, hx, hy, R, false); ctx.clip();
  sky(ctx, [[0, '#3a0a0c'], [0.45, '#b83a12'], [0.62, '#ff8a2a'], [1, '#3a0c08']]);
  glow(ctx, hx + 80, hy + 140, 520, '#ffd27a', 0.9);
  peaks(ctx, { y: hy + 150, n: 6, x0: hx - 500, x1: hx + 500, hmin: 40, hmax: 140, seed: 8, color: '#4a1408' });
  ctx.fillStyle = '#1a0604'; ctx.fillRect(hx - 600, hy + 150, 1200, 600);
  procession(ctx, T, { types: HORDE, n: 16, x0: hx - 420, x1: hx + 420, y: hy + 230, scale: 3.6, speed: 90, color: '#100304', seed: 77, jitter: 40, rim: '#ffb060', rimA: 0.7 });
  ctx.restore();
  // the wall face around it
  ctx.save(); ctx.beginPath(); ctx.rect(-300, -300, DW + 600, DH + 600); holePath(ctx, hx, hy, R, true); ctx.clip();
  const wg = ctx.createRadialGradient(hx, hy, R * 0.8, hx, hy, 1100); wg.addColorStop(0, '#3a2a2c'); wg.addColorStop(0.4, '#221a22'); wg.addColorStop(1, '#0c0a10');
  ctx.fillStyle = wg; ctx.fillRect(-300, -300, DW + 600, DH + 600);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 7;
  for (let y = -60; y < DH + 120; y += 96) { ctx.beginPath(); ctx.moveTo(-300, y); ctx.lineTo(DW + 300, y); ctx.stroke(); for (let x = ((Math.round(y / 96) % 2) ? 95 : 0) - 300; x < DW + 300; x += 190) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 96); ctx.stroke(); } }
  // rim of the hole lit from the fire, glowing cracks running out
  ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(255,140,60,0.35)'; ctx.beginPath(); holePath(ctx, hx, hy, R * 1.02, false); ctx.stroke();
  const cr = easeOut(seg(lt, 0, 0.6)), RR = rng(5);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let k = 0; k < 9; k++) { const a = RR() * TAU; let x = hx + Math.cos(a) * R, y = hy + Math.sin(a) * R * 1.1; const pts = [[x, y]]; for (let j2 = 0; j2 < 7; j2++) { x += Math.cos(a + (RR() - 0.5) * 1.3) * 80; y += Math.sin(a + (RR() - 0.5) * 1.3) * 80; pts.push([x, y]); } const m = Math.max(1, Math.round(pts.length * cr)); for (const [lw, col] of [[14, 'rgba(255,90,20,0.35)'], [5, '#ffb060']]) { ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.beginPath(); pts.slice(0, m).forEach(([px, py], q) => (q ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke(); } }
  ctx.restore();
  ctx.restore();
  ctx.restore();
  smoke(ctx, hx, hy + 120, T, { n: 14, h: 600, r: 90, color: '#2a1410', alpha: 0.4, drift: 140, speed: 0.12 });
  S.chunks.draw(ctx); S.dust.draw(ctx); S.sparks.draw(ctx);
  vignette(ctx, 0.75);
}

// ------------------------------------------------------------------ 67.5–70: the Warden's banner
function shotBanner(ctx, S, lt, u, T) {
  sky(ctx, [[0, '#03050c'], [0.55, '#0e1428'], [1, '#3a1a12']]);
  smoke(ctx, 1500, 1100, T, { n: 16, h: 900, r: 160, color: '#140c10', alpha: 0.6, drift: -300, speed: 0.06 });
  glow(ctx, 900, 1250, 1000, '#ff6a20', 0.6);
  const z = 1 + u * 0.1;
  ctx.save(); ctx.translate(DW / 2, DH * 0.55); ctx.scale(z, z); ctx.translate(-DW / 2, -DH * 0.55);
  tower(ctx, 520, 1250, 300, 380, { color: '#0a0a12', light: '#ff8a40', lightA: 0.3 }, T);
  banner(ctx, 520, 250, 900, 500, T * 1.25, { field: '#21438e', emblem: 'tower', edge: '#d8b060', emblemColor: '#f4f0e6', pole: '#1a120a', light: '#ff9a50', amp: 0.16, swallow: true, poleLen: 1.5 });
  ctx.restore();
  S.embers.draw(ctx, 1);
  vignette(ctx, 0.7);
}

// ------------------------------------------------------------------ 70–72.2: towers rise
function shotBuild(ctx, S, lt, u, T) {
  sky(ctx, [[0, '#0a0814'], [0.6, '#3a1820'], [0.85, '#c8541e'], [1, '#2a0c08']]);
  glow(ctx, 960, 900, 900, '#ff7a2a', 0.5);
  ridge(ctx, { y: 880, amp: 60, seed: 101, color: '#0a0507' });
  const ids = ['t_archer3', 't_barracks3', 't_mage3', 't_artillery3'];
  ids.forEach((id, i) => {
    const r = easeOut(seg(T, 70 + i * 0.625, 70 + i * 0.625 + 0.35));
    if (r <= 0) return;
    const x = 360 + i * 400;
    ctx.save(); ctx.beginPath(); ctx.rect(x - 300, -100, 600, 960); ctx.clip();
    figure(ctx, id, 'idle', T, x, 870 + (1 - r) * 330, 2.6, { color: '#060305', rim: '#ff9a50', rimA: 0.35 });
    ctx.restore();
  });
  procession(ctx, T, { types: [{ sprite: 's_knight' }, { sprite: 's_footman' }], n: 16, x0: -200, x1: 2200, y: 1010, scale: 3.2, speed: 140, color: '#030203', seed: 3 });
  S.dust.draw(ctx);
  vignette(ctx, 0.6);
}

// ------------------------------------------------------------------ 72.5–91: title
function shotTitle(ctx, S, lt, u, T) {
  ctx.fillStyle = '#000'; ctx.fillRect(-DW, -DH, DW * 3, DH * 3);
  const bga = sm(seg(lt, 0.2, 3.5)) * 0.55;
  if (bga > 0) { ctx.save(); ctx.globalAlpha *= bga; plate(ctx, 'assets/ui/title_bg.jpg', 1200, 675, 1.08 + lt * 0.004); ctx.restore(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-DW, -DH, DW * 3, DH * 3); }
  S.embers.draw(ctx, 1);
  const img = Assets.img('assets/ui/logo.png');
  const k = easeOut(seg(lt, 0, 0.3));
  const sc = lerp(1.7, 1, k) * (1 + 0.012 * Math.sin(lt * 1.2));
  const w = 1220 * sc, h = img ? w * img.height / img.width : w * 0.37;
  ctx.save(); ctx.globalAlpha *= k;
  glow(ctx, DW / 2, DH * 0.42, 700, '#ff8a3a', 0.35 + 0.1 * Math.sin(lt * 1.4));
  if (img) ctx.drawImage(img, DW / 2 - w / 2, DH * 0.42 - h / 2, w, h);
  ctx.restore();
  S.sparks.draw(ctx);
  vignette(ctx, 0.5);
}
