// Rampart Riot — title screen.
// State 'touch': artwork + logo + blinking TOUCH (CLICK on desktop). The first tap is the user gesture that
// unlocks audio and (on Android & co.) switches to landscape fullscreen. State 'menu': Start / Settings /
// Opening / Credits. The shared Settings popup (language, volume, quality) is one tap away at any time.
import { Screen } from '../core/screen.js';
import { Audio } from '../core/audio.js';
import { Save } from '../core/save.js';
import { t } from '../core/i18n.js';
import { clamp } from '../core/util.js';
import { text } from '../render/draw.js';
import { TitleArt } from '../render/titleart.js';
import { MenuScene, btn, roundBtn, fz, appear } from '../ui/menukit.js';
import { OptionsPopup } from '../ui/options.js';

export class TitleScene extends MenuScene {
  constructor(app) {
    super(app);
    this.art = new TitleArt();
    this.state = 'touch';
    this.menuT = 0;
  }
  // the title already is a "TOUCH" screen, so the engine's resume overlay is not needed while waiting for it
  get noResumeOverlay() { return this.state === 'touch'; }

  enter(p) {
    super.enter(p);
    // coming back from another screen (or after the first gesture) -> straight to the menu
    if (this.app.gestured || p.menu) { this.state = 'menu'; this.menuT = 1; Audio.playMusic('title', { fadeIn: 1.5 }); }
    this.layout();
  }
  exit() { super.exit(); }

  layout() {
    this.ui.clear();
    if (this.state !== 'menu') return;
    const U = this.U, W = Screen.gw, H = Screen.gh;
    const bw = clamp(330 * U, 200, 460), bh = clamp(72 * U, 48, 88);
    const cy = H - Screen.safe.b - clamp(H * 0.2, 96, 210);
    this.ui.add(btn((W - bw) / 2, cy - bh / 2, bw, bh, () => t('title.start'), () => this.start(), { color: 'gold', size: fz(30, 17), fam: 'display' }));
    const sw = clamp(170 * U, 104, 220), sh = clamp(52 * U, 40, 62), gap = 14 * U;
    const row = [
      [() => t('opt.title'), () => this.openSettings(), 'dark', 'gear'],
      [() => t('title.opening'), () => this.app.go('cutscene', { id: 'opening', next: { scene: 'title', params: { menu: true } } }), 'dark', 'play'],
      [() => t('title.credits'), () => this.app.go('credits', { next: { scene: 'title', params: { menu: true } } }), 'dark', 'book'],
    ];
    const tot = row.length * sw + (row.length - 1) * gap;
    const y2 = cy + bh / 2 + 18 * U;
    row.forEach(([label, fn, color, icon], i) => this.ui.add(btn((W - tot) / 2 + i * (sw + gap), y2, sw, sh, label, fn, { color, icon, size: fz(19, 12) })));
    // a gear in the corner as well: settings (and the language switch) are always one tap away
    const r = Math.max(30 * U, 20);
    this.ui.add(roundBtn(W - Screen.safe.r - 16 * U - r, Screen.safe.t + 14 * U + r, r, 'gear', () => this.openSettings(), { sound: 'ui_click' }));
  }

  openSettings() { this.openPopup(new OptionsPopup({ app: this.app, onCredits: () => this.app.go('credits', { next: { scene: 'title', params: { menu: true } } }) })); }

  start() {
    Audio.sfx('ui_unlock');
    const anySlot = (Save.data.slots || []).some(Boolean);
    this.app.go('slots', { first: !anySlot });
  }

  // first tap / click / key: user gesture -> audio + fullscreen, then reveal the menu
  wake() {
    if (this.state !== 'touch') return false;
    this.app.gesture();
    this.state = 'menu'; this.menuT = 0;
    Audio.sfx('cine_whoosh', { vol: 0.6 });
    Audio.playMusic('title', { fadeIn: 2.5 });
    this.layout();
    return true;
  }

  onDown(p) { if (this.state === 'touch') return true; return super.onDown(p); }
  onTap(p) { if (this.wake()) return; if (this.menuT < 0.35 && !this.popup) return; super.onTap(p); }
  onKey(k) {
    if (this.state === 'touch') { if (k === 'Enter' || k === ' ') this.wake(); return; }
    if (this.popup) { this.popup.key(k); return; }
    if (k === 'Enter') this.start();
  }
  onResume() { if (this.state === 'menu') Audio.playMusic('title', { fadeIn: 1 }); }

  update(dt) {
    super.update(dt);
    if (this.state === 'menu') this.menuT += dt;
  }

  drawScene(ctx, w, h) {
    const T = this.time;
    this.art.drawBackground(ctx, w, h, T);
    // intro: fade the art in, then drop the logo in
    const fadeIn = clamp(T / 1.2, 0, 1);
    if (fadeIn < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - fadeIn})`; ctx.fillRect(0, 0, w, h); }
    const la = appear(T, 0.6, 1.1);
    this.art.drawLogo(ctx, w, h, T, la, 0.92 + 0.08 * la);
    if (this.state === 'touch') {
      if (T > 1.4) this.art.drawPrompt(ctx, w, h, T - 1.4, Screen.isTouch ? t('title.touch') : t('title.click'), clamp((T - 1.4) / 0.4, 0, 1));
    } else {
      const k = appear(this.menuT, 0, 0.45);
      ctx.save(); ctx.globalAlpha *= k; ctx.translate(0, (1 - k) * 24 * this.U);
      this.ui.draw(ctx);
      ctx.restore();
      const U = this.U;
      text(ctx, 'v1.0', w - Screen.safe.r - 12 * U, h - Screen.safe.b - 12 * U, { size: fz(13, 9), align: 'right', color: 'rgba(255,240,210,0.55)', weight: 700 });
    }
  }
  // the MenuScene base draws this.ui inside drawScene's transform above, so skip its own pass
  render(ctx, w, h) {
    ctx.imageSmoothingQuality = 'medium';
    this.drawScene(ctx, w, h);
    if (this.popup) this.popup.draw(ctx);
  }
}
