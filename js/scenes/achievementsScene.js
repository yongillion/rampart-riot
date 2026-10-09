// Rampart Riot — achievements: scrollable list of all ACHIEVEMENTS (medal, name, description, unlock date or
// progress), counter x/30 with a progress bar; achievements earned since the last visit are marked NEW.
// Params: { back: scene (default 'worldmap'), backParams: {} }
import { Screen } from '../core/screen.js';
import { Audio } from '../core/audio.js';
import { Save } from '../core/save.js';
import { Assets } from '../core/assets.js';
import { t, getLang } from '../core/i18n.js';
import { clamp, TAU, fmtInt } from '../core/util.js';
import { panel, text, roundRect } from '../render/draw.js';
import { drawIcon } from '../render/icons.js';
import { ACHIEVEMENTS } from '../meta/achievements.js';
import { heroLevel } from '../data/heroes.js';
import { gearButton } from '../ui/options.js';
import { MenuScene, Backdrop, ScrollView, backBtn, titleRibbon, fz, fitText, lines, textW, iconGray, glowDot, ensureSlot, achText, appear, COL } from '../ui/menukit.js';

// display-only progress for counter achievements: [current, target]
const doneIn = (s, ch) => Array.from({ length: 8 }, (_, i) => s.stages[`${ch}-${i + 1}`]).filter(x => x && x.done).length;
const perfIn = (s, ch) => Array.from({ length: 8 }, (_, i) => s.stages[`${ch}-${i + 1}`]).filter(x => x && x.stars >= 3).length;
const PROGRESS = {
  ch1: s => [doneIn(s, 1), 8], ch2: s => [doneIn(s, 2), 8], ch3: s => [doneIn(s, 3), 8], ch4: s => [doneIn(s, 4), 8],
  perfect1: s => [perfIn(s, 1), 8], perfect2: s => [perfIn(s, 2), 8], perfect3: s => [perfIn(s, 3), 8], perfect4: s => [perfIn(s, 4), 8],
  slayer1: s => [s.stats.kills, 1000], slayer2: s => [s.stats.kills, 10000], rich: s => [s.stats.goldEarned, 50000],
  builder: s => [s.stats.towersBuilt, 300], eager: s => [s.stats.wavesEarly, 100], meteor: s => [s.stats.meteors, 300],
  levy: s => [s.stats.reinforcements, 200], sheep: s => [s.stats.sheep, 50], boss3: s => [s.stats.bossKills, 3],
  stars100: s => [Save.totalStars(s), 100], secret8: s => [Object.keys(s.secrets || {}).length, 8],
  allheroes: s => [Object.keys(s.heroes).length, 6], hero10: s => [Math.max(1, ...Object.values(s.heroes).map(h => heroLevel(h.xp || 0))), 10],
  upgrader: s => [Math.max(0, ...Object.values(s.upgrades)), 5], maxall: s => [Object.values(s.upgrades).reduce((a, b) => a + b, 0), 30],
};

export class AchievementsScene extends MenuScene {
  constructor(app) { super(app); this.bg = new Backdrop('hall'); this.list = new ScrollView(); this.scrolls = [this.list]; }

  enter(p) {
    super.enter(p);
    ensureSlot();
    Audio.playMusic('worldmap', { fadeIn: 1 });
    Assets.loadAtlas('ui');
    const s = Save.slot;
    this.since = s.achSeen || 0;
    s.achSeen = Date.now(); Save.persist();
    this.layout();
  }
  goBack() { this.app.go(this.params.back || 'worldmap', this.params.backParams || {}); }

  layout() {
    const U = this.U, W = Screen.gw, H = Screen.gh, sf = Screen.safe;
    this.ui.clear();
    this.back = this.ui.add(backBtn(() => this.goBack()));
    this.gear = this.ui.add(gearButton(this, W - sf.r - 14 * U - this.back.r, this.back.y, this.back.r));
    this.titleY = this.back.y;
    const top = this.back.y + this.back.r + 12 * U, bottom = H - sf.b - Math.max(14 * U, 8);
    const left = sf.l + Math.max(20 * U, 10), right = W - sf.r - Math.max(20 * U, 10);
    const avW = Math.min(right - left, 1360 * U), x0 = left + (right - left - avW) / 2;
    this.panelR = { x: x0, y: top, w: avW, h: bottom - top };
    const pad = Math.max(16 * U, 9);
    this.list.set(x0 + pad, top + pad, avW - pad * 2, bottom - top - pad * 2);
    // cards
    const lw = this.list.w - 14 * U, gap = Math.max(12 * U, 7);
    const cols = clamp(Math.floor((lw + gap) / Math.max(470 * U, 300)), 1, 3);
    const cw = (lw - gap * (cols - 1)) / cols;
    this.fs = { name: fz(20, 11.5), desc: fz(16, 10), small: fz(14, 9.5) };
    const F = this.fs, mr = Math.max(18, 30 * U);
    const descW = cw - mr * 2 - 40 * U;
    const ch = Math.max(mr * 2 + 20 * U, F.name * 1.5 + 2 * F.desc * 1.35 + F.small * 1.6 + 22 * U);
    this.cards = ACHIEVEMENTS.map((a, i) => ({ a, x: (i % cols) * (cw + gap), y: Math.floor(i / cols) * (ch + gap), w: cw, h: ch, mr, descW }));
    this.list.setContent(Math.ceil(ACHIEVEMENTS.length / cols) * (ch + gap));
  }

  drawScene(ctx, w, h) {
    const U = this.U, s = Save.slot;
    this.bg.draw(ctx, w, h, this.time);
    const got = ACHIEVEMENTS.filter(a => s.ach[a.id]).length, total = ACHIEVEMENTS.length;
    ctx.save(); ctx.globalAlpha = appear(this.time, 0, 0.3);
    const rh = Math.max(50 * U, 30);
    // counter plaque (top right): trophy, x/30 and a bar
    const ph = rh, label = t('ach.count', { n: got, m: total });
    const pw = Math.max(ph * 1.3 + textW(label, ph * 0.4, 900) + ph * 0.5, 200 * U);
    const px = this.gear.x - this.gear.r - 12 * U - pw, py = this.titleY - ph / 2;
    titleRibbon(ctx, t('ach.title'), this.titleY, rh, this.back.x + this.back.r + 12 * U, px - 12 * U, 380 * U);
    panel(ctx, 'wood', px, py, pw, ph);
    drawIcon(ctx, 'trophy', px + ph * 0.55, py + ph / 2, ph * 0.66);
    text(ctx, label, px + ph * 1.05, py + ph * 0.4, { size: ph * 0.36, color: '#ffe9a8', stroke: '#2a1606', weight: 900, maxWidth: pw - ph * 1.25 });
    const bx = px + ph * 1.05, bw = pw - ph * 1.35, by = py + ph * 0.7, bh = Math.max(5, ph * 0.12);
    roundRect(ctx, bx, by, bw, bh, bh / 2); ctx.fillStyle = '#1a0f07'; ctx.fill();
    if (got) { roundRect(ctx, bx + 1, by + 1, Math.max(bh, (bw - 2) * got / total), bh - 2, (bh - 2) / 2); ctx.fillStyle = '#ffc93a'; ctx.fill(); }
    ctx.restore();
    // list
    const P = this.panelR, k = appear(this.time, 0.05, 0.35);
    ctx.save(); ctx.globalAlpha *= k; ctx.translate(0, (1 - k) * 30 * U);
    panel(ctx, 'woodDark', P.x, P.y, P.w, P.h);
    const sv = this.list;
    sv.begin(ctx);
    for (const c of this.cards) if (c.y + c.h >= sv.pos && c.y <= sv.pos + sv.h) this.drawCard(ctx, c);
    sv.end(ctx, { fade: 'rgba(40,24,12,0.9)' });
    ctx.restore();
    this.ui.draw(ctx);
  }

  drawCard(ctx, c) {
    const U = this.U, s = Save.slot, a = c.a, F = this.fs;
    const at = s.ach[a.id], fresh = at && at > this.since;
    const [name, desc] = achText(a);
    const { x, y, w, h, mr } = c;
    // card body
    roundRect(ctx, x, y, w, h, 12 * U);
    if (at) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#f2e2b8'); g.addColorStop(1, '#d8bc84'); ctx.fillStyle = g; }
    else ctx.fillStyle = 'rgba(20,12,6,0.55)';
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, 2.5 * U); ctx.strokeStyle = at ? (fresh ? '#ffcf4a' : '#a8803a') : 'rgba(168,128,58,0.35)'; ctx.stroke();
    // medal
    const mx = x + 16 * U + mr, my = y + h / 2;
    if (fresh) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDot(ctx, mx, my, mr * 1.8, '#ffd860', 0.35 + 0.2 * Math.sin(this.time * 4)); ctx.restore(); }
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU);
    const g = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.35, mr * 0.1, mx, my, mr);
    if (at) { g.addColorStop(0, '#fff0b0'); g.addColorStop(0.55, '#e0a830'); g.addColorStop(1, '#7a4a0a'); }
    else { g.addColorStop(0, '#4a3a2c'); g.addColorStop(1, '#1e150e'); }
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = Math.max(1.5, 3 * U); ctx.strokeStyle = at ? '#5a3208' : '#5a4a3a'; ctx.stroke();
    if (at) drawIcon(ctx, a.icon || 'trophy', mx, my, mr * 1.25); else iconGray(ctx, a.icon || 'trophy', mx, my, mr * 1.2, 0.55);
    // text
    const tx = mx + mr + 16 * U, tw = x + w - 14 * U - tx;
    const top = y + Math.max(10 * U, (h - (F.name * 1.4 + F.desc * 1.35 * 2 + F.small * 1.5)) / 2);
    fitText(ctx, name, tx, top + F.name * 0.6, tw - (fresh ? 54 * U : 0), { size: F.name, color: at ? COL.head : '#d8c8a8', weight: 900 });
    const dl = lines(desc, tw, F.desc, 600).slice(0, 2);
    dl.forEach((ln, i) => text(ctx, ln, tx, top + F.name * 1.4 + i * F.desc * 1.35, { size: F.desc, color: at ? COL.ink : '#b8a888', weight: 600, baseline: 'top' }));
    const fy = top + F.name * 1.4 + 2 * F.desc * 1.35 + F.small * 0.75;
    if (at) {
      const d = new Date(at).toLocaleDateString(getLang() === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      text(ctx, t('ach.done', { date: d }), tx, fy, { size: F.small, color: '#7a5a20', weight: 800 });
    } else {
      const pr = PROGRESS[a.id] && PROGRESS[a.id](s);
      if (pr && pr[1] > 1) {
        const [cur, tgt] = pr, frac = clamp(cur / tgt, 0, 1), bw = Math.min(tw * 0.55, 220 * U), bh = Math.max(5, 7 * U);
        roundRect(ctx, tx, fy - bh / 2, bw, bh, bh / 2); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
        if (frac > 0) { roundRect(ctx, tx + 1, fy - bh / 2 + 1, Math.max(bh, (bw - 2) * frac), bh - 2, (bh - 2) / 2); ctx.fillStyle = '#c8a050'; ctx.fill(); }
        text(ctx, `${fmtInt(Math.min(cur, tgt))} / ${fmtInt(tgt)}`, tx + bw + 10 * U, fy, { size: F.small, color: '#c8b090', weight: 800, maxWidth: tw - bw - 10 * U });
      } else text(ctx, t('ach.locked'), tx, fy, { size: F.small, color: '#a89878', weight: 800 });
    }
    if (fresh) {
      const bw = textW(t('heroes.new'), F.small, 900) + 14 * U, bh = F.small * 1.5;
      roundRect(ctx, x + w - bw - 10 * U, y + 8 * U, bw, bh, bh / 2); ctx.fillStyle = '#d8342a'; ctx.fill();
      text(ctx, t('heroes.new'), x + w - bw / 2 - 10 * U, y + 8 * U + bh / 2 + 1, { size: F.small, align: 'center', color: '#fff', weight: 900 });
    }
  }
}
