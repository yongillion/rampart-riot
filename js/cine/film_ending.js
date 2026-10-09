// Rampart Riot — ending film (120 s), locked to the cue sheet of music/ending.mp3:
// ash_snow 0 · the_walk 13.33 · sacrifice 40 · climax/dawn 46.67 · years_later 73.33 · her_name 100 · final_chord 106.67 · end 120
import { Assets } from '../core/assets.js';
import { TAU, clamp } from '../core/util.js';
import {
  DW, DH, lerp, sm, seg, easeOut, easeIn, easeInOut, rng, mix, rgba, sky, stars, glow, haze, vignette, tint, godRays,
  ridge, peaks, wall, wallAlong, tower, gate, banner, figure, procession, person, starCore, smoke, Particles, portrait, flame,
} from './kit.js';

export const ENDING = {
  music: 'ending', sync: true, dur: 120, fadeIn: 2.0, fadeOut: 4.0,
  atlases: ['enemies4', 'heroes', 'portraits', 'units'],
  init(S) {
    S.ash = new Particles({ kind: 'dot', rate: 34, x0: -100, x1: 2100, y0: -20, y1: -10, vx: -25, vxr: 25, vy: 70, vyr: 25, life: 18, size: 2.6, sway: 22, color: '#d8d0c8', alpha: 0.75, max: 600 });
    S.ash.prefill(12);
    S.motes = new Particles({ kind: 'ember', add: true, rate: 0, life: 4, size: 2.8, vx: 0, vxr: 60, vy: -120, vyr: 60, sway: 20, color: '#fff2c8', twinkle: true, max: 400 });
    S.petals = new Particles({ kind: 'dot', rate: 0, x0: -100, x1: 2100, y0: -20, y1: -10, vx: 40, vxr: 30, vy: 60, vyr: 20, life: 16, size: 3.2, sway: 30, color: '#f6e6a0', alpha: 0.8 });
  },
  update(S, dt, t) {
    S.ash.o.rate = t < 46 ? 34 : t < 60 ? 12 : 0;
    S.ash.update(dt);
    S.motes.o.rate = t > 33 && t < 47 ? 70 : t > 47 && t < 56 ? 25 : 0;
    S.motes.o.at = t < 47 ? { x: 1180, y: 700, w: 120, h: 160 } : { x: 960, y: 760, w: 600, h: 100 };
    S.motes.update(dt);
    S.petals.o.rate = t > 75 && t < 100 ? 6 : 0;
    S.petals.update(dt);
  },
  cues: [
    { t: 40.0, flash: 0.0 }, { t: 46.4, flash: 1, d: 2.6 },
    { t: 88.2, sfx: 'coin', vol: 0.7 },
    { t: 100.0, sfx: 'star_rise', vol: 0.6 },
  ],
  captions: [
    { t: 1.6, d: 5.0, ko: '싸움이 끝나자, 재가 눈처럼 내렸다.', en: 'When the fighting ended, ash fell like snow.' },
    { t: 7.2, d: 5.6, ko: '심장은 쓰러졌다. 그러나 그 안의 별은 아직 타고 있었다.', en: 'The Heart had fallen. But the star within it still burned.' },
    { t: 15.4, d: 6.0, who: 'seren', ko: '무섭지 않아요. 저 별은 그저 집에 가고 싶을 뿐이에요.', en: 'I\'m not afraid. It only wants to go home.' },
    { t: 22.4, d: 2.8, who: 'brannoc', ko: '세렌—', en: 'Seren—' },
    { t: 25.6, d: 5.8, who: 'seren', ko: '이번엔 제가 지킬게요. 당신이 늘 그랬던 것처럼.', en: 'This time, I\'ll keep watch. Like you always did.' },
    { t: 32.6, d: 6.8, ko: '마엘리스의 피가 별을 가두었다. 이제 같은 피가, 별을 놓아주었다.', en: 'Maelis\'s blood had caged the star. Now that same blood set it free.' },
    { t: 48.4, d: 6.6, ko: '그날, 재의 땅에 처음으로 아침이 왔다.', en: 'That day, for the first time, morning came to the Ash lands.' },
    { t: 56.4, d: 5.0, who: 'ysolde', ko: '…이게, 아침이구나.', en: '...So this is morning.' },
    { t: 63.2, d: 7.6, ko: '성벽의 맹세는 끝났다. 이제 그것은 그저 돌이었다.', en: 'The wall\'s oath was ended. Now it was only stone.' },
    { t: 74.0, d: 3.4, ko: '여러 해가 지난 뒤.', en: 'Years later.' },
    { t: 78.0, d: 6.4, ko: '성벽에는 문이 생겼고, 그 문은 다시 닫히지 않았다.', en: 'The wall gained gates, and the gates were never closed again.' },
    { t: 85.4, d: 5.0, ko: '늙은 병사는 지금도 성벽에 동전을 던진다.', en: 'The old soldier still tosses coins at the wall.' },
    { t: 91.0, d: 7.0, ko: '이제는 소원을 빌지 않는다. 고맙다고 말할 뿐.', en: 'Not for luck anymore. Only to say thank you.' },
    { t: 100.6, d: 4.4, ko: '사람들은 새벽에 뜨는 그 별을 「세렌」이라 불렀다.', en: 'People named the star that rises before dawn "Seren."' },
    { t: 105.2, d: 5.0, ko: '옛말로, 「별」이라는 뜻이었다.', en: 'In the old tongue, it means "star."' },
    { t: 112.0, d: 6.6, style: 'card', y: 0.78, ko: ['', '끝'], en: ['', 'The End'] },
  ],
  shots: [
    { t0: 0, t1: 13.33, xf: 0, draw: shotAftermath },
    { t0: 13.33, t1: 22, xf: 1.4, draw: shotWalk },
    { t0: 22, t1: 29.3, xf: 1.0, draw: shotFarewell },
    { t0: 29.3, t1: 40, xf: 1.0, draw: shotTouch },
    { t0: 40, t1: 46.67, xf: 0.6, draw: shotLight },
    { t0: 46.67, t1: 73.33, xf: 0, draw: shotDawn },
    { t0: 73.33, t1: 100, xf: 2.0, draw: shotYears },
    { t0: 100, t1: 106.67, xf: 2.0, draw: shotStar },
    { t0: 106.67, t1: 121, xf: 2.0, draw: shotFin },
  ],
};

// shared crater backdrop: grey ash sky, cooling magma, the fallen Heart
function crater(ctx, T, glowK = 1, cam = 0) {
  sky(ctx, [[0, '#2a2628'], [0.5, '#4a4040'], [0.8, '#6a5048'], [1, '#3a2a26']]);
  ctx.save(); ctx.translate(-cam * 0.3, 0);
  peaks(ctx, { y: 720, n: 8, x0: -300, x1: 2400, hmin: 60, hmax: 200, seed: 31, color: '#3a3234', grad: '#2a2426' });
  ctx.restore();
  ctx.save(); ctx.translate(-cam * 0.6, 0);
  ctx.fillStyle = '#1e1818'; ctx.beginPath(); ctx.moveTo(-300, 1200); ctx.lineTo(-300, 820); ctx.bezierCurveTo(400, 780, 900, 840, 1300, 830); ctx.bezierCurveTo(1700, 820, 2100, 790, 2400, 800); ctx.lineTo(2400, 1200); ctx.closePath(); ctx.fill();
  // cooling magma veins
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#ff6a20', 0.35 * glowK); ctx.lineWidth = 4; const R = rng(8);
  for (let i = 0; i < 9; i++) { let x = R() * 2200 - 100, y = 860 + R() * 200; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 5; k++) { x += 60 + R() * 80; y += (R() - 0.5) * 40; ctx.lineTo(x, y); } ctx.stroke(); }
  ctx.restore();
  // the fallen Heart: a kneeling colossus of cracked obsidian, one hand raised to the sky
  figure(ctx, 'e_boss_heart', 'death', 0.75, 1260, 860, 2.35, { color: '#141012', rim: '#ff8a40', rimA: 0.35 * glowK });
  ctx.restore();
}

// 0–13.3: aftermath in the falling ash
function shotAftermath(ctx, S, lt, u, T) {
  const cam = easeInOut(u) * 120;
  crater(ctx, T, 1, cam);
  ctx.save(); ctx.translate(-cam * 0.6, 0);
  starCore(ctx, 1238, 700, 14, T, 0.55 + 0.1 * Math.sin(T * 2.2));
  ctx.restore();
  // the army stands silent; the Warden's banner planted in the ash
  ctx.save(); ctx.translate(-cam, 0);
  banner(ctx, 300, 520, 300, 190, T * 0.5, { field: '#21438e', emblem: 'tower', edge: '#d8b060', light: '#ff9a50', amp: 0.08, poleLen: 2.2 });
  procession(ctx, 0.5, { types: [{ sprite: 's_knight' }, { sprite: 's_footman' }, { sprite: 's_bastion' }], n: 14, x0: -100, x1: 900, y: 930, scale: 3.2, speed: 0, color: '#0c0a0c', seed: 5, rim: '#ffb080', rimA: 0.35 });
  ctx.restore();
  S.ash.draw(ctx);
  vignette(ctx, 0.55);
}
// 13.3–22: Seren walks to the star
function shotWalk(ctx, S, lt, u, T) {
  crater(ctx, T, 1, 120);
  ctx.save(); ctx.translate(-72, 0);
  starCore(ctx, 1238, 700, 16 + u * 6, T, 0.6 + u * 0.25);
  ctx.restore();
  const x = lerp(380, 820, easeInOut(u));
  figure(ctx, 'h_brannoc', 'idle', T, 300, 930, 3.6, { color: '#0c0a0c', rim: '#ffcf9a', rimA: 0.4 });
  figure(ctx, 'h_seren', 'walk', T * 0.6, x, 930, 3.6, { color: '#0c0a0c', rim: '#ffe0b0', rimA: 0.55 });
  S.ash.draw(ctx);
  vignette(ctx, 0.55);
}
// 22–29.3: farewell
function shotFarewell(ctx, S, lt, u, T) {
  crater(ctx, T, 1, 120);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-DW, -DH, DW * 3, DH * 3);
  const sp = T < 25.4 ? 'brannoc' : 'seren';
  portrait(ctx, 'seren', 600, 640, 760, { dim: sp === 'seren' ? 0 : 0.45 });
  portrait(ctx, 'brannoc', 1340, 650, 760, { flip: true, dim: sp === 'brannoc' ? 0 : 0.45 });
  glow(ctx, 960, 560, 500, '#ffd8a0', 0.12);
  const g = ctx.createLinearGradient(0, 820, 0, 1080); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.85)'); ctx.fillStyle = g; ctx.fillRect(-DW, 820, DW * 3, 400);
  S.ash.draw(ctx, 0.7);
  vignette(ctx, 0.6);
}
// 29.3–40: she reaches the star
function shotTouch(ctx, S, lt, u, T) {
  const z = 1 + easeInOut(u) * 0.35;
  ctx.save(); ctx.translate(1180, 760); ctx.scale(z, z); ctx.translate(-1180, -760);
  crater(ctx, T, 1, 0);
  const k = seg(T, 31, 39.8);
  starCore(ctx, 1238, 700, 18 + k * 30, T, 0.7 + k * 0.6);
  figure(ctx, 'h_seren', T < 33 ? 'walk' : 'idle', T * 0.6, lerp(1000, 1150, easeOut(seg(T, 29.3, 33))), 860, 3.0, { color: '#0c0a0c', rim: '#fff2c8', rimA: 0.6 + k * 0.4 });
  ctx.restore();
  tint(ctx, '#ffe6b0', k * 0.25, 'lighter');
  S.motes.draw(ctx);
  S.ash.draw(ctx, 1 - k * 0.5);
  vignette(ctx, 0.55 - k * 0.3);
}
// 40–46.7: the light swallows everything
function shotLight(ctx, S, lt, u, T) {
  const k = easeIn(u);
  sky(ctx, [[0, mix('#5a4a40', '#fff8ec', k)], [1, mix('#3a2a26', '#fff2d8', k)]]);
  starCore(ctx, 960, 620, 40 + k * 260, T, 1.2);
  godRays(ctx, 960, 620, 16, 1800, '#fff6e0', 0.35 + k * 0.4, T, TAU, 0);
  // Seren dissolving into light
  figure(ctx, 'h_seren', 'idle', T, 900, 860, 3.0, { color: mix('#2a2420', '#fff6e8', k), alpha: 1 - k });
  S.motes.draw(ctx);
  tint(ctx, '#ffffff', seg(u, 0.6, 1) * 0.8);
}
// 46.7–73.3: the star returns to the sky, and dawn breaks over the Ash lands
function shotDawn(ctx, S, lt, u, T) {
  const d = easeInOut(seg(T, 47, 66));           // dawn progress
  const rise = easeIn(seg(T, 46.7, 52));         // star leaving the crater
  sky(ctx, [[0, mix('#1a1e3a', '#5a8ad0', d)], [0.45, mix('#3a2a40', '#f0b088', d)], [0.75, mix('#5a3a38', '#ffd8a0', d)], [1, mix('#3a2a26', '#ffe8c0', d)]]);
  const sunY = lerp(820, 600, d);
  glow(ctx, 1400, sunY, 900, '#ffd8a0', 0.25 + d * 0.5);
  if (d > 0.05) { ctx.fillStyle = rgba('#fff6e0', clamp(d * 2, 0, 1)); ctx.beginPath(); ctx.arc(1400, sunY + 40, 70, 0, TAU); ctx.fill(); godRays(ctx, 1400, sunY + 40, 12, 1600, '#fff0d0', 0.15 * d, T, 2.6, Math.PI * 0.5 + 0.6); }
  // the parting ash clouds
  for (let i = 0; i < 8; i++) { const off = (i % 2 ? -1 : 1) * d * 400; ctx.fillStyle = rgba(mix('#2a2428', '#e8c8b0', d), 0.5 * (1 - d * 0.7)); ctx.beginPath(); ctx.ellipse(i * 280 + off, 160 + (i % 3) * 50, 260, 70, 0, 0, TAU); ctx.fill(); }
  // the rising star streak
  if (rise < 1) { const y = lerp(760, -100, rise); glow(ctx, 960, y, 160, '#fff2c8', 0.9); glow(ctx, 960, y, 40, '#ffffff', 1); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, y, 0, 900); g.addColorStop(0, 'rgba(255,240,200,0.7)'); g.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = g; ctx.fillRect(950, y, 20, 900 - y); ctx.restore(); }
  // the Ash lands catching the first light
  peaks(ctx, { y: 760, n: 9, x0: -300, x1: 2400, hmin: 60, hmax: 200, seed: 31, color: mix('#2a2426', '#8a6a5a', d), grad: mix('#1e1a1c', '#6a5048', d), rim: '#ffd8a0', rimA: 0.5 * d });
  // the Rampart far behind, its runes going dark for good
  wallAlong(ctx, [[-200, 742, 22], [500, 736, 26], [1000, 742, 30]], { color: mix('#1a1820', '#7a6a62', d), top: '#ffe0b0', topA: 0.4 * d, runes: (1 - seg(T, 60, 68)) * 0.8 });
  ctx.fillStyle = mix('#141012', '#5a4038', d); ctx.beginPath(); ctx.moveTo(-200, 1200); ctx.lineTo(-200, 850); ctx.bezierCurveTo(600, 800, 1200, 830, 2200, 860); ctx.lineTo(2200, 1200); ctx.closePath(); ctx.fill();
  // light sweeping across the land
  const sweep = seg(T, 50, 64);
  if (sweep > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(lerp(2200, -400, sweep) - 400, 0, lerp(2200, -400, sweep) + 400, 0); g.addColorStop(0, 'rgba(255,220,160,0)'); g.addColorStop(0.5, 'rgba(255,220,160,0.22)'); g.addColorStop(1, 'rgba(255,220,160,0)'); ctx.fillStyle = g; ctx.fillRect(-DW, 700, DW * 3, 600); ctx.restore(); }
  // Ysolde on the ridge, watching
  figure(ctx, 'h_ysolde', 'idle', T, 520, 862, 3.4, { color: mix('#0e0a0c', '#2a1a14', d), rim: '#ffe0b0', rimA: 0.3 + 0.5 * d });
  S.ash.draw(ctx, 1 - d);
  S.motes.draw(ctx, 0.6);
  vignette(ctx, 0.5 - d * 0.2);
}
// 73.3–100: years later — open gates, green returning, an old soldier's coin
function shotYears(ctx, S, lt, u, T) {
  const cam = easeInOut(u) * 160;
  sky(ctx, [[0, '#6aa0dc'], [0.6, '#cfe4f0'], [1, '#f0f0e0']]);
  glow(ctx, 1500, 200, 520, '#fff8e0', 0.45);
  ctx.save(); ctx.translate(-cam * 0.3, 0);
  peaks(ctx, { y: 640, n: 9, x0: -300, x1: 2500, hmin: 60, hmax: 200, seed: 52, color: '#8aa0b0', grad: '#a8b8c0', snow: '#f4f8fa', shade: '#405060' });
  ctx.restore();
  ctx.save(); ctx.translate(-cam * 0.6, 0);
  ridge(ctx, { y: 760, amp: 50, seed: 54, color: '#7aa860', x1: 2600 });
  // the Rampart in sunlight, its great gate open; carts pass through
  wall(ctx, -200, 820, 860, 300, { color: '#b0a898', bricks: '#7a7266', bricksA: 0.45, light: '#ffffff', lightA: 0.3, ivy: '#5a8a3a', seed: 3 });
  wall(ctx, 1260, 2400, 860, 300, { color: '#b0a898', bricks: '#7a7266', bricksA: 0.45, light: '#ffffff', lightA: 0.3, ivy: '#5a8a3a', seed: 5 });
  tower(ctx, 820, 860, 140, 420, { color: '#a8a090', light: '#ffffff', lightA: 0.25, banner: { field: '#21438e', emblem: 'tower', edge: '#d8b060' } }, T);
  tower(ctx, 1260, 860, 140, 420, { color: '#a8a090', light: '#ffffff', lightA: 0.25, banner: { field: '#21438e', emblem: 'tower', edge: '#d8b060' } }, T);
  ctx.fillStyle = '#a8a090'; ctx.fillRect(820, 470, 440, 120);
  gate(ctx, 1040, 860, 360, 400, { broken: 1, inside: '#9ac070', through: c => { sky(c, [[0, '#cfe4f0'], [1, '#e8f0d8']], 400, 860); ridge(c, { y: 860, amp: 40, seed: 9, color: '#88b068', x0: 800, x1: 1300 }); } });
  // a cart rolling through the gate
  const cx = lerp(700, 1500, (lt * 0.04) % 1);
  ctx.fillStyle = '#5a3a20'; ctx.fillRect(cx - 60, 860 - 70, 120, 50); ctx.fillStyle = '#e8dcc0'; ctx.beginPath(); ctx.ellipse(cx, 860 - 76, 60, 30, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#2a1a10'; for (const w of [-40, 40]) { ctx.beginPath(); ctx.arc(cx + w, 860 - 16, 18, 0, TAU); ctx.fill(); }
  figure(ctx, 'sheep', 'walk', T, cx - 130, 860, 1.6, {});
  ctx.restore();
  ctx.save(); ctx.translate(-cam, 0);
  // meadow with flowers where the ash used to be
  ridge(ctx, { y: 1000, amp: 60, seed: 57, color: '#6a9a48', x1: 2700 });
  const R = rng(3); for (let i = 0; i < 160; i++) { ctx.fillStyle = ['#f6e6a0', '#ffffff', '#e8a0c0', '#ffd080'][i % 4]; ctx.beginPath(); ctx.arc(R() * 2700 - 200, 930 + R() * 160, 4 + R() * 4, 0, TAU); ctx.fill(); }
  // the old soldier and his coin
  const tossT = 88.2 - 73.33;
  person(ctx, 640, 960, 118, { color: '#2a2a3a', cloak: true, cane: true }, T);
  const k = seg(lt, tossT - 0.9, tossT);
  if (k > 0 && k < 1) { const x = lerp(690, 900, k), y = 810 - Math.sin(k * Math.PI) * 160; ctx.fillStyle = '#ffd860'; ctx.beginPath(); ctx.ellipse(x, y, 9, 9 * Math.abs(Math.cos(k * 20)), 0, 0, TAU); ctx.fill(); glow(ctx, x, y, 40, '#fff2a0', 0.6); }
  if (lt > tossT) { const g2 = Math.max(0, 1 - (lt - tossT) / 1.2); glow(ctx, 900, 830, 120, '#fff2a0', g2); }
  ctx.restore();
  S.petals.draw(ctx);
  vignette(ctx, 0.3);
}
// 100–106.7: the morning star
function shotStar(ctx, S, lt, u, T) {
  const k = easeOut(seg(lt, 0, 4));
  sky(ctx, [[0, '#060a1e'], [0.6, '#1a2448'], [0.85, '#5a4a6a'], [1, '#c88a6a']]);
  stars(ctx, T, { alpha: 0.9, seed: 91, n: 320, yMax: 760 });
  const sy = lerp(760, 380, k);
  glow(ctx, 1180, sy, 260, '#cfe2ff', 0.5); glow(ctx, 1180, sy, 60, '#ffffff', 1);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(220,235,255,0.7)'; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4 + T * 0.05, l = 90 + 20 * Math.sin(T * 2 + i); ctx.beginPath(); ctx.moveTo(1180 - Math.cos(a) * l, sy - Math.sin(a) * l); ctx.lineTo(1180 + Math.cos(a) * l, sy + Math.sin(a) * l); ctx.stroke(); }
  ctx.restore();
  ridge(ctx, { y: 900, amp: 80, seed: 61, color: '#05060c' });
  // people on the hill looking up
  for (const [x, s, d] of [[560, 82, 1], [640, 70, 1], [700, 92, -1], [1460, 76, -1]]) person(ctx, x, 880, s, { color: '#05060c', cloak: true, dir: d, reach: x === 640 ? 0.9 : undefined }, T);
  vignette(ctx, 0.5);
}
// 106.7–120: title and the end
function shotFin(ctx, S, lt, u, T) {
  sky(ctx, [[0, '#04060f'], [1, '#141a30']]);
  stars(ctx, T, { alpha: 0.85, seed: 91, n: 320, yMax: 1000 });
  glow(ctx, 1180, 380, 220, '#cfe2ff', 0.35); glow(ctx, 1180, 380, 40, '#ffffff', 0.8);
  const img = Assets.img('assets/ui/logo.png');
  const a = easeOut(seg(lt, 0.6, 3.6)), w = 1000, h = img ? w * img.height / img.width : 370;
  if (img && a > 0) { ctx.save(); ctx.globalAlpha *= a; glow(ctx, DW / 2, DH * 0.42, 600, '#ff9a50', 0.25); ctx.drawImage(img, DW / 2 - w / 2, DH * 0.42 - h / 2, w, h); ctx.restore(); }
  vignette(ctx, 0.5);
}
