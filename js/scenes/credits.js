// Rampart Riot — scrolling credits on a starry night with drifting embers. Hold / tap to speed up, skip button.
// Params: { next: scene name or { scene, params } to go to when done (default 'title') }
import { Screen } from '../core/screen.js';
import { Audio } from '../core/audio.js';
import { Assets } from '../core/assets.js';
import { t, getLang } from '../core/i18n.js';
import { clamp, Ease } from '../core/util.js';
import { text } from '../render/draw.js';
import { HERO_ORDER } from '../data/heroes.js';
import { CHARACTERS } from '../data/story.js';
import { MenuScene, Backdrop, goSafe, btn, fz, lines, glowDot, setCursor } from '../ui/menukit.js';

export class CreditsScene extends MenuScene {
  constructor(app) { super(app); this.bg = new Backdrop('night'); this.pos = 0; this.speed = 1; this.hold = false; this.boost = 0; this.doneT = -1; this.noResumeOverlay = false; }

  enter(p) {
    super.enter(p);
    Audio.playMusic('story_hope', { fadeIn: 2 });
    this.pos = 0; this.doneT = -1; this.leaving = false;
    this.layout();
  }

  goBack() { this.finish(); }
  finish() {
    if (this.leaving) return;
    this.leaving = true;
    const n = this.params.next;
    const scene = typeof n === 'string' && n ? n : n && n.scene ? n.scene : 'title';
    const params = n && typeof n === 'object' ? n.params || {} : {};
    goSafe(this.app, scene, params, () => this.app.go('slots'));
  }

  layout() {
    const U = this.U, W = Screen.gw, H = Screen.gh, sf = Screen.safe;
    this.ui.clear();
    const bh = Math.max(46 * U, 32), bw = Math.max(150 * U, 96);
    this.ui.add(btn(W - sf.r - 16 * U - bw, sf.t + 14 * U, bw, bh, `${t('ui.skip')}  »`, () => this.finish(), { color: 'dark', size: Math.min(bh * 0.4, fz(19, 11)), sound: 'ui_click', alpha: 0.85 }));
    this.build();
  }

  // the credit roll as styled lines; heights are measured here
  build() {
    const U = this.U, W = Screen.gw, maxW = Math.min(W - 60 * U, 900 * U);
    const L = []; let y = 0;
    const add = (s, o = {}) => {
      const size = o.size || fz(22, 12), fam = o.fam || 'sans', weight = o.weight || 700;
      for (const ln of lines(s, maxW, size, weight, fam)) { L.push({ s: ln, y: y + size * 0.6, size, fam, weight, color: o.color || '#efe2c4', glow: o.glow }); y += size * (o.lh || 1.45); }
    };
    const gap = n => { y += n * U; };
    const head = s => { add(s, { size: fz(17, 10), color: '#d8a85a', weight: 800 }); gap(4); };
    const name = (s, o = {}) => add(s, Object.assign({ size: fz(26, 14), color: '#fff2d6', fam: 'serif', weight: 600 }, o));
    const lang = getLang();
    add('Rampart Riot', { size: fz(78, 34), fam: 'display', weight: 900, color: '#ffd96a', glow: true, lh: 1.25 });
    gap(70);
    head(t('credits.made'));
    name(t('credits.madeBy'), { size: fz(30, 15) });
    gap(80);
    head(t('credits.story'));
    for (const ln of t('credits.storyText').split('\n')) name(ln, { size: fz(22, 12) });
    gap(60);
    head(t('credits.cast'));
    for (const id of HERO_ORDER) name(`${t(`hero.${id}.name`)}  —  ${t(`hero.${id}.title`)}`, { size: fz(22, 12) });
    const cn = id => (CHARACTERS[id] ? CHARACTERS[id][lang] || CHARACTERS[id].en : id);
    gap(14);
    name(`${cn('maelis')}  ·  ${cn('warden')}`, { size: fz(22, 12) });
    gap(40);
    head(t('credits.foes'));
    for (const id of ['boss_gorrath', 'boss_hrimvald', 'boss_varkas', 'boss_heart']) name(t(`enemy.${id}.name`), { size: fz(22, 12) });
    gap(60);
    for (const [h, s] of [['credits.art', 'credits.artText'], ['credits.music', 'credits.musicText'], ['credits.sound', 'credits.soundText']]) { head(t(h)); name(t(s), { size: fz(22, 12) }); gap(50); }
    head(t('credits.fonts'));
    name('Noto Sans CJK · Noto Serif CJK', { size: fz(22, 12) });
    add('SIL Open Font License 1.1', { size: fz(16, 10), color: '#b8a888' });
    gap(50);
    head(t('credits.tech'));
    name(t('credits.techText'), { size: fz(20, 11) });
    gap(Math.max(160, Screen.gh / U * 0.35));
    this.endBlock = y;
    add(t('credits.thanks'), { size: fz(44, 20), fam: 'display', weight: 900, color: '#ffd96a', glow: true, lh: 1.6 });
    add(t('credits.thanksSub'), { size: fz(21, 12), fam: 'serif', weight: 600, color: '#efe2c4' });
    this.endCenter = (this.endBlock + y) / 2;
    this.lines = L;
    this.total = y;
  }

  // ------------------------------------------------------------------ input: hold to fast-forward, tap for a burst
  onDown(p) { const r = super.onDown(p); if (!this.ui.pressed) this.hold = true; return r; }
  onUp(p, c) { super.onUp(p, c); this.hold = false; }
  onTap(p) { if (this.ui.tap(p)) return; this.boost = Math.min(3, this.boost + 1.2); }
  onKey(k) { if (k === 'Escape' || k === 'Enter') { Audio.sfx('ui_click'); this.finish(); } else if (k === ' ') this.boost = Math.min(3, this.boost + 1.2); }
  onHover(p) { this.ui.move(p); setCursor(this.ui.hover ? 'pointer' : ''); }

  update(dt) {
    super.update(dt);
    const U = this.U;
    this.boost = Math.max(0, this.boost - dt);
    const target = this.hold ? 6 : this.boost > 0 ? 3.5 : 1;
    this.speed += (target - this.speed) * Math.min(1, dt * 5);
    const H = Screen.gh;
    // the "thank you" block stops at the screen centre
    const startY = H + 30 * U;
    const maxPos = startY + this.endCenter - H * 0.5;
    this.pos = Math.min(this.pos, maxPos);
    if (this.pos < maxPos) this.pos = Math.min(maxPos, this.pos + 42 * U * this.speed * dt);
    else {
      if (this.doneT < 0) this.doneT = 0;
      this.doneT += dt * (this.hold ? 3 : 1);
      if (this.doneT > 5) this.finish();
    }
    this.startY = startY;
  }

  drawScene(ctx, w, h) {
    const U = this.U;
    this.bg.draw(ctx, w, h, this.time);
    const y0 = this.startY - this.pos;
    const logo = Assets.img('assets/ui/logo.png');
    for (const l of this.lines) {
      const y = y0 + l.y;
      if (y < -l.size * 2 || y > h + l.size * 2) continue;
      // fade near the edges
      const edge = Math.min(y, h - y) / (h * 0.16);
      const a = clamp(edge, 0, 1);
      if (l.glow) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 6; i++) glowDot(ctx, w / 2 + Math.sin(this.time * 0.7 + i * 1.7) * l.size * 3, y + Math.cos(this.time * 0.9 + i * 2.1) * l.size * 0.6, l.size * 0.25, '#ffcc66', 0.35 * a);
        ctx.restore();
      }
      if (l === this.lines[0] && logo) {
        const lw = Math.min(w * 0.6, 640 * U), lh = lw * logo.height / logo.width;
        ctx.save(); ctx.globalAlpha = a; ctx.drawImage(logo, w / 2 - lw / 2, y - lh / 2, lw, lh); ctx.restore();
        continue;
      }
      text(ctx, l.s, w / 2, y, { size: l.size, align: 'center', color: l.color, weight: l.weight, fam: l.fam, alpha: a, stroke: l.glow ? '#2a1606' : null, strokeWidth: l.size * 0.12, shadow: l.glow ? 'rgba(255,170,60,0.35)' : null });
    }
    // final fade-out
    if (this.doneT > 3.8) { ctx.fillStyle = `rgba(0,0,0,${clamp((this.doneT - 3.8) / 1.2, 0, 1)})`; ctx.fillRect(0, 0, w, h); }
    // hint
    const ha = clamp(1 - this.time / 6, 0, 1);
    if (ha > 0) text(ctx, t('credits.hold'), w / 2, Screen.safe.t + 34 * U, { size: fz(15, 10), align: 'center', color: '#c8b898', weight: 700, alpha: ha * 0.8 });
    this.ui.draw(ctx);
  }
}
