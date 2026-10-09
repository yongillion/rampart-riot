// Rampart Riot — boot/loading scene
import { Audio } from '../core/audio.js';
import { Screen } from '../core/screen.js';
import { Assets } from '../core/assets.js';
import { text } from '../render/draw.js';
import { t } from '../core/i18n.js';
import { loadFonts } from '../render/fonts.js';
import { drawResumeOverlay } from '../render/titleart.js';

export class BootScene {
  constructor(app) { this.app = app; this.t = 0; this.prog = 0; this.done = false; }
  async enter(p) {
    const steps = [
      () => loadFonts(),
      () => Audio.init(),
      () => Assets.loadAtlas('ui'),
      () => Assets.loadImage('assets/ui/title_bg.jpg'),
      () => Assets.loadImage('assets/ui/logo.png'),
    ];
    let n = 0;
    for (const s of steps) { try { await s(); } catch (e) { console.warn(e); } n++; this.prog = n / steps.length; }
    // the "TOUCH to resume" overlay (shown when fullscreen is lost or the app returns from the background)
    this.app.resumeDrawer = drawResumeOverlay;
    const bootEl = document.getElementById('boot');
    if (bootEl) { bootEl.classList.add('hide'); setTimeout(() => bootEl.remove(), 600); }
    this.done = true;
    const q = new URLSearchParams(location.search);
    if (q.get('stage')) this.app.go('battle', { stageId: q.get('stage'), mode: q.get('mode') || 'campaign' }, true);
    else if (q.get('scene')) this.app.go(q.get('scene'), Object.fromEntries(q.entries()), true);
    else this.app.go('title', {}, true);
  }
  update(dt) { this.t += dt; }
  render(ctx, w, h) {
    ctx.fillStyle = '#0a0705'; ctx.fillRect(0, 0, w, h);
    const U = Screen.uiScale;
    text(ctx, t('loading'), w / 2, h / 2 - 16 * U, { size: 22 * U, align: 'center', color: '#e9c46a', weight: 800 });
    ctx.fillStyle = '#2a1a0c'; ctx.fillRect(w / 2 - 140 * U, h / 2 + 10 * U, 280 * U, 8 * U);
    ctx.fillStyle = '#e9a43a'; ctx.fillRect(w / 2 - 140 * U, h / 2 + 10 * U, 280 * U * this.prog, 8 * U);
  }
}
