// Rampart Riot — animated title artwork (shared by the title screen and the "TOUCH to resume" overlay).
// Paints assets/ui/title_bg.jpg (cover-fit with a slow drift), flickering beacons, the crater's light pillar,
// drifting embers and the logo.
import { Assets } from '../core/assets.js';
import { Screen } from '../core/screen.js';
import { clamp, TAU } from '../core/util.js';
import { text, font } from './draw.js';

const BG = 'assets/ui/title_bg.jpg', LOGO = 'assets/ui/logo.png';
const IW = 2400, IH = 1350;
// light sources in image space (beacon fires, torches, lit windows)
const BEACONS = [[1054, 666, 1], [1138, 676, 0.9], [1242, 654, 1], [1318, 644, 0.9], [1452, 610, 1.2], [1578, 552, 1.5], [1940, 596, 1.6]];
const TORCHES = [[362, 914], [490, 914], [760, 980], [904, 1054], [426, 940]];
const PILLAR = [1986, 120, 600];

let glowTex = null;
function glow() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,240,200,1)'); r.addColorStop(0.25, 'rgba(255,170,70,0.75)'); r.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return (glowTex = c);
}

export class TitleArt {
  constructor() { this.embers = []; this.last = null; this.seed = 1; }
  rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }

  // image-space -> screen transform for the current frame
  fit(w, h, t, drift = true) {
    const z = drift ? 1.035 + 0.025 * Math.sin(t * 0.045) : 1.02;
    const k = Math.max(w / IW, h / IH) * z;
    const px = drift ? Math.sin(t * 0.031) * 0.012 : 0, py = drift ? Math.cos(t * 0.027) * 0.008 : 0;
    const ox = (w - IW * k) / 2 + px * w, oy = (h - IH * k) / 2 + py * h;
    return { k, ox, oy, X: x => ox + x * k, Y: y => oy + y * k };
  }

  update(dt, w, h, M) {
    // embers rise from the Ash lands (right) and drift left on the wind
    const want = Screen.quality === 'low' ? 26 : 60;
    while (this.embers.length < want) this.spawn(w, h, M, true);
    for (const e of this.embers) {
      e.t += dt;
      e.x += (e.vx + Math.sin(e.t * e.f + e.ph) * 12) * dt;
      e.y += e.vy * dt;
    }
    this.embers = this.embers.filter(e => e.t < e.life && e.y > -20 && e.x > -20);
  }
  spawn(w, h, M, initial) {
    const fromTorch = this.rnd() < 0.18;
    let x, y;
    if (fromTorch) { const tt = TORCHES[Math.floor(this.rnd() * TORCHES.length)]; x = M.X(tt[0]); y = M.Y(tt[1] - 10); }
    else { x = M.X(1400 + this.rnd() * 1100); y = M.Y(560 + this.rnd() * 700); }
    const life = 4 + this.rnd() * 6;
    this.embers.push({ x, y, vx: -(10 + this.rnd() * 30), vy: -(14 + this.rnd() * 34), t: initial ? this.rnd() * life : 0, life,
      f: 0.8 + this.rnd() * 1.6, ph: this.rnd() * TAU, s: 1.2 + this.rnd() * 2.6 });
  }

  // background + animated lights; returns the transform
  drawBackground(ctx, w, h, t, o = {}) {
    const img = Assets.img(BG);
    const M = this.fit(w, h, t, o.drift !== false);
    if (img) ctx.drawImage(img, M.ox, M.oy, IW * M.k, IH * M.k);
    else { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0d1024'); g.addColorStop(0.6, '#3a1c2a'); g.addColorStop(1, '#0a0806'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
    const dt = this.last === null ? 0 : clamp(t - this.last, 0, 0.1); this.last = t;
    this.update(dt, w, h, M);
    const gt = glow();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // crater light pillar shimmer
    const [px, py0, py1] = PILLAR;
    const pg = ctx.createLinearGradient(0, M.Y(py0), 0, M.Y(py1));
    const pa = 0.10 + 0.05 * Math.sin(t * 1.3) + 0.03 * Math.sin(t * 3.7);
    pg.addColorStop(0, 'rgba(255,200,140,0)'); pg.addColorStop(0.6, `rgba(255,190,120,${pa})`); pg.addColorStop(1, `rgba(255,150,80,${pa * 1.4})`);
    ctx.fillStyle = pg; ctx.fillRect(M.X(px - 26), M.Y(py0), 52 * M.k, (py1 - py0) * M.k);
    // beacon fires and torches flicker
    for (let i = 0; i < BEACONS.length; i++) {
      const [bx, by, s] = BEACONS[i];
      const f = 0.55 + 0.25 * Math.sin(t * 7.3 + i * 1.7) + 0.2 * Math.sin(t * 13.1 + i * 3.1);
      const r = 46 * s * M.k * (0.9 + 0.2 * f);
      ctx.globalAlpha = 0.35 * f; ctx.drawImage(gt, M.X(bx) - r, M.Y(by) - r, r * 2, r * 2);
    }
    for (let i = 0; i < TORCHES.length; i++) {
      const [tx, ty] = TORCHES[i];
      const f = 0.6 + 0.4 * Math.sin(t * 9.1 + i * 2.3) * Math.sin(t * 5.3 + i);
      const r = 26 * M.k * (0.85 + 0.3 * f);
      ctx.globalAlpha = 0.32 * f; ctx.drawImage(gt, M.X(tx) - r, M.Y(ty) - r, r * 2, r * 2);
    }
    // embers
    for (const e of this.embers) {
      const life = e.t / e.life, a = Math.min(1, life * 4) * (1 - life) * (0.6 + 0.4 * Math.sin(e.t * 9 + e.ph));
      if (a <= 0) continue;
      const r = e.s * Math.max(1, M.k * 2.2) * 2.2;
      ctx.globalAlpha = a; ctx.drawImage(gt, e.x - r, e.y - r, r * 2, r * 2);
    }
    ctx.restore();
    // vignette
    const v = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.35, w / 2, h * 0.5, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${o.vignette ?? 0.55})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    return M;
  }

  logoRect(w, h) {
    const img = Assets.img(LOGO);
    const aw = img ? img.width : 1500, ah = img ? img.height : 560;
    const lw = Math.min(w * 0.6, h * 1.25, 1100);
    const lh = lw * ah / aw;
    return { x: (w - lw) / 2 + Screen.safe.l * 0 , y: Math.max(Screen.safe.t, h * 0.06), w: lw, h: lh };
  }
  drawLogo(ctx, w, h, t, a = 1, scale = 1) {
    if (a <= 0) return null;
    const img = Assets.img(LOGO), r = this.logoRect(w, h);
    ctx.save(); ctx.globalAlpha *= a;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy);
    // warm halo breathing behind the letters
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.18 + 0.08 * Math.sin(t * 1.4);
    ctx.drawImage(glow(), cx - r.w * 0.55, cy - r.h * 0.5, r.w * 1.1, r.h * 1.15); ctx.restore();
    if (img) ctx.drawImage(img, r.x, r.y, r.w, r.h);
    else text(ctx, 'RAMPART RIOT', cx, cy, { size: r.h * 0.4, align: 'center', color: '#e8d8b0', stroke: '#2a1606', weight: 900, fam: 'display' });
    ctx.restore();
    return r;
  }

  // blinking prompt ("TOUCH" / "CLICK"): fades fully in and out
  drawPrompt(ctx, w, h, t, label, a = 1) {
    const blink = 0.5 + 0.5 * Math.cos(t * Math.PI / 0.85);
    const alpha = a * (0.08 + 0.92 * blink);
    if (alpha <= 0.01) return;
    const size = clamp(h * 0.062, 20, 46);
    const y = h - Math.max(Screen.safe.b, 0) - clamp(h * 0.14, 46, 140);
    ctx.save(); ctx.globalAlpha *= alpha;
    // letter-spaced
    ctx.font = font(size, 900, 'display');
    const sp = size * 0.42, chars = [...label];
    const widths = chars.map(c => ctx.measureText(c).width);
    const tot = widths.reduce((s, x) => s + x, 0) + sp * (chars.length - 1);
    let x = w / 2 - tot / 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.35;
    ctx.drawImage(glow(), w / 2 - tot * 0.75, y - size * 1.2, tot * 1.5, size * 2.4); ctx.restore();
    chars.forEach((c, i) => { text(ctx, c, x + widths[i] / 2, y, { size, align: 'center', color: '#fff1cf', stroke: '#2a1206', strokeWidth: size * 0.14, weight: 900, fam: 'display' }); x += widths[i] + sp; });
    ctx.restore();
  }
}

// one shared instance for the resume overlay
const overlayArt = new TitleArt();
export function drawResumeOverlay(ctx, w, h, t) {
  overlayArt.drawBackground(ctx, w, h, t, { drift: false, vignette: 0.65 });
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 0, w, h);
  overlayArt.drawLogo(ctx, w, h, t, 1);
  overlayArt.drawPrompt(ctx, w, h, t, 'TOUCH');
}
