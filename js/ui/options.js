// Rampart Riot — reusable Settings popup (usable from any scene: title, world map, battle pause menu, meta screens).
// Rows: language (한국어 / English, applied instantly), music & sound volume sliders, mute, graphics quality,
// and fullscreen (touch devices that support it) / credits (only if onCredits is given).
//
// API
//   const opt = new OptionsPopup({ app, onClose, onLangChange, onCredits, fullscreen = true });
//   opt.open()            lay out + open animation + sound; returns opt
//   opt.update(dt)        every frame while opt.isOpen (also while the game itself is paused)
//   opt.draw(ctx)         after drawing the scene (dims the screen, draws the panel)
//   opt.layout()          from the scene's layout() (resize / rotation / quality change)
//   opt.close()           programmatic close; Esc, tapping outside and the Close button do the same
//   opt.isOpen            true until the close animation has finished; then onClose() is called once
//   input: forward the engine hooks verbatim while opt.isOpen — onDown, onUp, onTap, onMoveDown, onDragStart,
//          onDrag, onDragEnd, onHover, onWheel, onKey, onPinchStart, onPinch, onPinchEnd, onCancelPress
//          (all return true: the popup is modal and consumes everything)
//   language switch: setLang + Save.settings.lang + Save.persist(), the popup re-lays itself out, then calls
//          app.scene.onLangChange?.(lang) and opts.onLangChange?.(lang) so the screen underneath re-labels.
import { Screen } from '../core/screen.js';
import { Audio } from '../core/audio.js';
import { Save } from '../core/save.js';
import { t, setLang, getLang } from '../core/i18n.js';
import { clamp, TAU } from '../core/util.js';
import { panel, text, roundRect } from '../render/draw.js';
import { drawIcon } from '../render/icons.js';
import { Popup, btn, roundBtn, segmented, fz, fitText, TOUCH } from './menukit.js';

export class OptionsPopup extends Popup {
  constructor(o = {}) { super(); this.o = o; this.dragging = null; this.hoverSlider = null; this.sliders = []; this.rows = []; }

  get canFullscreen() { return this.o.fullscreen !== false && Screen.isTouch && Screen.canFullscreen && !Screen.isFullscreen(); }

  layout() {
    const U = this.U, W = Screen.gw, H = Screen.gh, S = Save.settings;
    const extra = this.canFullscreen || !!this.o.onCredits;
    const n = 5 + (extra ? 1 : 0); // language, music, sound, mute, graphics (+ fullscreen / credits)
    const head = Math.max(70 * U, 34), foot = Math.max(84 * U, 52);
    let rh = Math.max(62 * U, 44);
    const maxH = H - 12;
    if (head + n * rh + foot > maxH) rh = Math.max(34, (maxH - head - foot) / n);
    const w = Math.min(620 * U, W - 24), h = Math.min(maxH, head + n * rh + foot);
    this.rect = { x: (W - w) / 2, y: (H - h) / 2, w, h };
    this.head = head;
    const r = this.rect, pad = 34 * U;
    this.labelW = Math.min(190 * U, w * 0.34);
    const cx = r.x + pad + this.labelW, cw = r.x + r.w - pad - cx;
    const ch = Math.min(rh * 0.74, Math.max(48 * U, 36));
    this.rows = [];
    this.ui.clear(); this.sliders = [];
    let y = r.y + head;
    const row = (label, icon) => { const yy = y; y += rh; this.rows.push({ y: yy, h: rh, label, icon }); return yy + (rh - ch) / 2; };
    const fsb = fz(19, 11);
    // language first: always one tap away
    for (const it of segmented(cx, row('opt.lang', 'book'), cw, ch, [
      { label: '한국어', value: 'ko' }, { label: 'English', value: 'en' },
    ], { get: () => getLang(), set: v => this.setLanguage(v), size: fsb })) this.ui.add(it);
    // volume sliders
    for (const [key, icon, label] of [['music', 'music', 'opt.music'], ['sfx', 'sound', 'opt.sfx']]) {
      row(label, icon);
      this.sliders.push({ key, x: cx + 10 * U, y: y - rh / 2, w: cw - 96 * U, h: rh });
    }
    // mute toggle
    this.ui.add(btn(cx, row('opt.mute', 'sound'), Math.min((cw - 12 * U) / 2, 200 * U), ch, () => (S.muted ? t('opt.on') : t('opt.off')), () => {
      S.muted = !S.muted; Audio.setMuted(S.muted); Save.persist();
    }, { color: () => (S.muted ? 'red' : 'dark'), size: fsb, keepColor: true }));
    // graphics quality
    for (const it of segmented(cx, row('opt.quality', 'gear'), cw, ch, [
      { label: t('opt.high'), value: 'high' }, { label: t('opt.low'), value: 'low' },
    ], { get: () => S.quality || 'high', set: v => { if (S.quality === v) return; S.quality = v; Screen.setQuality(v); Save.persist(); }, size: fsb })) this.ui.add(it);
    if (extra) {
      // fullscreen / credits share the last row
      const items = [];
      if (this.canFullscreen) items.push([t('opt.fullscreen'), () => { Screen.enterFullscreen().then(() => this.layout()); }, 'blue']);
      if (this.o.onCredits) items.push([t('opt.credits'), () => this.close(() => this.o.onCredits(), true), 'purple']);
      const by = y + (rh - ch) / 2; y += rh;
      const bw = Math.min(260 * U, (r.w - pad * 2 - 16 * U * (items.length - 1)) / items.length);
      const tot = bw * items.length + 16 * U * (items.length - 1);
      items.forEach(([label, fn, color], i) => this.ui.add(btn(r.x + (r.w - tot) / 2 + i * (bw + 16 * U), by, bw, ch, label, fn, { color, size: fsb })));
    }
    const bw = Math.min(220 * U, r.w * 0.5), bh = Math.min(Math.max(56 * U, 38), foot - 14);
    this.ui.add(btn(r.x + (r.w - bw) / 2, r.y + r.h - bh - (foot - bh) * 0.45, bw, bh, t('ui.close'), () => this.close(), { color: 'green', sound: 'ui_click' }));
  }

  close(cb, silent = false) {
    if (this.closing) return;
    super.close(() => { if (cb) cb(); if (this.o.onClose) this.o.onClose(); }, silent);
  }

  setLanguage(l) {
    if (getLang() === l) return;
    setLang(l); Save.settings.lang = l; Save.persist();
    try { document.documentElement.lang = l; } catch (e) { /* no DOM */ }
    this.layout();
    const app = this.o.app || (window.RR && window.RR.app);
    if (app && app.scene && typeof app.scene.onLangChange === 'function') app.scene.onLangChange(l);
    if (this.o.onLangChange) this.o.onLangChange(l);
  }

  // ---- slider input
  sliderAt(p) {
    const U = this.U;
    for (const s of this.sliders) {
      const padY = Math.max(TOUCH / 2, s.h * 0.45);
      if (p.x >= s.x - 18 * U && p.x <= s.x + s.w + 18 * U && Math.abs(p.y - s.y) <= padY) return s;
    }
    return null;
  }
  setSlider(s, x) {
    const S = Save.settings;
    const v = Math.round(clamp((x - s.x) / s.w, 0, 1) * 20) / 20;
    if (S[s.key] === v) return;
    S[s.key] = v;
    Audio.setVolumes({ music: S.music, sfx: S.sfx });
  }
  down(p) {
    if (!this.ready) return true;
    const s = this.sliderAt(p);
    if (s) { this.dragging = s; this.setSlider(s, p.x); return true; }
    return super.down(p);
  }
  moveDown(p) { if (this.dragging) this.setSlider(this.dragging, p.x); }
  drag(dx, dy, p) { if (this.dragging) this.setSlider(this.dragging, p.x); }
  up(p) {
    if (this.dragging) {
      const s = this.dragging; this.dragging = null;
      Save.persist();
      if (s.key === 'sfx') Audio.sfx('ui_click');
    }
    super.up(p);
  }
  tap(p) { if (this.sliderAt(p)) return true; return super.tap(p); }
  hover(p) { this.hoverSlider = this.sliderAt(p); }

  // ---- drawing
  drawBody(ctx) {
    const r = this.rect, U = this.U, S = Save.settings;
    panel(ctx, 'wood', r.x, r.y, r.w, r.h);
    text(ctx, t('opt.title'), r.x + r.w / 2, r.y + this.head * 0.56, { size: fz(32, 16), align: 'center', color: '#ffe9a8', stroke: '#2a1606', weight: 900, fam: 'display' });
    const lx = r.x + 34 * U, fs = fz(20, 11);
    for (const row of this.rows) {
      const cy = row.y + row.h / 2;
      if (row.icon) drawIcon(ctx, row.icon, lx + 15 * U, cy, Math.max(26 * U, 16));
      fitText(ctx, t(row.label), lx + 38 * U, cy + 1, this.labelW - 46 * U, { size: fs, color: '#fff2d6', stroke: '#2a1606', weight: 800 });
    }
    for (const s of this.sliders) {
      const v = S[s.key] ?? 0, th = Math.max(12 * U, 8), kr = Math.max(17 * U, 11);
      roundRect(ctx, s.x, s.y - th / 2, s.w, th, th / 2); ctx.fillStyle = '#1e120a'; ctx.fill();
      ctx.lineWidth = Math.max(1, 2 * U); ctx.strokeStyle = 'rgba(255,220,160,0.25)'; ctx.stroke();
      if (v > 0) {
        roundRect(ctx, s.x + 1, s.y - th / 2 + 1, Math.max(th, (s.w - 2) * v), th - 2, (th - 2) / 2);
        const gr = ctx.createLinearGradient(0, s.y - th / 2, 0, s.y + th / 2); gr.addColorStop(0, '#ffe08a'); gr.addColorStop(1, '#c8861a');
        ctx.fillStyle = gr; ctx.fill();
      }
      const kx = s.x + s.w * v, act = this.dragging === s || this.hoverSlider === s;
      ctx.beginPath(); ctx.arc(kx, s.y + kr * 0.12, kr, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
      ctx.beginPath(); ctx.arc(kx, s.y, kr * (act ? 1.1 : 1), 0, TAU);
      const kg = ctx.createRadialGradient(kx - kr * 0.3, s.y - kr * 0.35, kr * 0.1, kx, s.y, kr);
      kg.addColorStop(0, '#fff6d0'); kg.addColorStop(0.55, '#e8b84a'); kg.addColorStop(1, '#8a5a12');
      ctx.fillStyle = kg; ctx.fill(); ctx.lineWidth = Math.max(1.5, 2.5 * U); ctx.strokeStyle = '#2a1606'; ctx.stroke();
      text(ctx, Math.round(v * 100) + '%', s.x + s.w + 30 * U, s.y + 1, { size: fz(19, 11), color: S.muted ? '#c8a080' : '#ffe9a8', stroke: '#2a1606', weight: 900 });
    }
  }
}

// Round gear button that opens the settings popup over a MenuScene (used in the top bar of every menu screen).
export function gearButton(scene, x, y, r, o = {}) {
  return roundBtn(x, y, r, 'gear', () => scene.openPopup(new OptionsPopup(Object.assign({ app: scene.app }, o))), { sound: 'ui_click' });
}
