// Rampart Riot — save slot selection: three chronicles with progress summaries, new game, continue and delete
// (trash button or long-press, both confirmed). Params: none. Leads to 'cutscene' (new game), 'worldmap', 'title'.
import { Screen } from '../core/screen.js';
import { Audio } from '../core/audio.js';
import { Save } from '../core/save.js';
import { Assets } from '../core/assets.js';
import { t } from '../core/i18n.js';
import { clamp, TAU, Ease } from '../core/util.js';
import { panel, text, roundRect } from '../render/draw.js';
import { drawIcon } from '../render/icons.js';
import { HEROES } from '../data/heroes.js';
import { gearButton } from '../ui/options.js';
import { MenuScene, Backdrop, ConfirmPopup, goSafe, backBtn, ribbon, fz, fitText, lines, heroPortrait, starIcon, fmtPlayTime, loadAtlasSafe, roman, MAX_STARS, COL, TOUCH } from '../ui/menukit.js';

const HOLD = 0.75; // long-press seconds to delete

function summary(slot) {
  const ids = Object.keys(slot.stages).filter(id => slot.stages[id] && slot.stages[id].done);
  let ch = 1;
  for (const id of ids) ch = Math.max(ch, +id.split('-')[0] + (id.endsWith('-8') ? 1 : 0));
  return { stars: Save.totalStars(slot), cleared: ids.length, ch: Math.min(4, ch), hero: HEROES[slot.hero] ? slot.hero : 'brannoc', time: slot.playTime || 0, done: !!slot.endingSeen };
}

export class SlotsScene extends MenuScene {
  constructor(app) { super(app); this.bg = new Backdrop('rampart'); this.hold = null; }

  enter(p) {
    super.enter(p);
    Audio.playMusic('title', { fadeIn: 1 });
    Promise.all([Assets.loadAtlas('ui'), Assets.loadAtlas('heroes'), loadAtlasSafe('portraits')]).catch(() => {});
    this.layout();
  }

  goBack() { goSafe(this.app, 'title'); }

  layout() {
    const U = this.U, W = Screen.gw, H = Screen.gh, sf = Screen.safe;
    this.ui.clear();
    this.back = this.ui.add(backBtn(() => this.goBack()));
    this.gear = this.ui.add(gearButton(this, W - sf.r - 14 * U - this.back.r, this.back.y, this.back.r));
    const top = this.back.y + this.back.r + 14 * U;
    const hint = Math.max(30 * U, 20);
    const gap = Math.max(16 * U, 10);
    const availW = W - sf.l - sf.r - 2 * Math.max(24 * U, 14);
    const cw = Math.min(340 * U, (availW - gap * 2) / 3);
    const chh = Math.min(460 * U, H - top - hint - sf.b - 12 * U);
    const x0 = sf.l + (W - sf.l - sf.r - (cw * 3 + gap * 2)) / 2;
    const y0 = top + Math.max(0, (H - sf.b - hint - top - chh) / 2);
    this.cards = [0, 1, 2].map(i => {
      const card = this.ui.add({
        i, x: x0 + i * (cw + gap), y: y0, w: cw, h: chh, sound: false,
        onTap: () => this.open(i),
        draw: (ctx, it, pressed, hover) => this.drawCard(ctx, it, pressed, hover),
      });
      return card;
    });
    // trash buttons (added after the cards so they win hit-testing)
    this.trash = this.cards.map(c => {
      const r = Math.max(22 * U, 15);
      return this.ui.add({
        i: c.i, x: c.x + c.w - r - 12 * U, y: c.y + r + 12 * U, r, sound: 'ui_click',
        get visible() { return !!Save.data.slots[c.i]; }, set visible(v) {},
        hitTest(px, py) { const rr = Math.max(this.r * 1.2, TOUCH / 2); return (px - this.x) ** 2 + (py - this.y) ** 2 <= rr * rr; },
        onTap: () => this.askDelete(c.i),
        draw: (ctx, it, pressed, hover) => this.drawTrash(ctx, it, pressed, hover),
      });
    });
    this.title = { y: Math.max(this.back.y, sf.t + 12 * U + 26 * U) };
  }

  open(i) {
    const slot = Save.data.slots[i];
    if (slot) {
      Audio.sfx('ui_click');
      Save.selectSlot(i);
      this.app.go('worldmap', {});
    } else {
      Audio.sfx('ui_open');
      Save.selectSlot(i);
      goSafe(this.app, 'cutscene', { id: 'opening', next: { scene: 'worldmap', params: { intro: true } } }, () => this.app.go('worldmap', { intro: true }));
    }
  }

  askDelete(i) {
    this.hold = null;
    this.openPopup(new ConfirmPopup(t('slot.deleteQ', { n: i + 1 }), () => {
      Save.deleteSlot(i);
      Audio.sfx('wall_crack', { vol: 0.5 });
      this.poof = { i, t: 0 };
    }, { yes: t('slot.delete'), yesColor: 'red', noColor: 'gray' }));
  }

  // long-press on a used card
  onDown(p) {
    const r = super.onDown(p);
    const it = this.ui.pressed;
    this.hold = it && this.cards.includes(it) && Save.data.slots[it.i] ? { i: it.i, t: 0, fired: false } : null;
    return r;
  }
  onUp(p, c) { super.onUp(p, c); if (this.hold && !this.hold.fired) this.hold = null; }
  onDragStart(p) { super.onDragStart(p); this.hold = null; }
  onTap(p) { if (this.hold && this.hold.fired) { this.hold = null; return; } super.onTap(p); }

  update(dt) {
    super.update(dt);
    if (this.hold && !this.hold.fired) {
      this.hold.t += dt;
      if (this.hold.t >= HOLD) { this.hold.fired = true; this.ui.cancel(); Audio.sfx('ui_tick'); this.askDelete(this.hold.i); this.hold = { fired: true }; }
    }
    if (this.poof) { this.poof.t += dt; if (this.poof.t > 0.6) this.poof = null; }
  }

  // ------------------------------------------------------------------ drawing
  drawScene(ctx, w, h) {
    const U = this.U;
    const bgImg = Assets.img('assets/ui/title_bg.jpg');
    if (bgImg) {
      const k = Math.max(w / bgImg.width, h / bgImg.height);
      ctx.drawImage(bgImg, (w - bgImg.width * k) / 2, (h - bgImg.height * k) / 2, bgImg.width * k, bgImg.height * k);
      ctx.fillStyle = 'rgba(8,5,3,0.55)'; ctx.fillRect(0, 0, w, h);
    } else this.bg.draw(ctx, w, h, this.time);
    const a = Math.min(1, this.time * 3);
    ctx.save(); ctx.globalAlpha = a;
    const rh = Math.max(50 * U, 30);
    ribbon(ctx, w / 2, this.title.y, Math.min(420 * U, w * 0.5), rh, t('slot.title'));
    ctx.restore();
    this.ui.draw(ctx);
    text(ctx, t('slot.holdHint'), w / 2, h - Screen.safe.b - Math.max(16 * U, 11), { size: fz(15, 10), align: 'center', color: 'rgba(255,236,200,0.7)', weight: 700, alpha: a * 0.9 });
  }

  drawCard(ctx, it, pressed, hover) {
    const U = this.U, slot = Save.data.slots[it.i];
    const k = Ease.outBack(clamp((this.time - 0.08 - it.i * 0.09) / 0.45, 0, 1));
    if (k <= 0) return;
    const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
    const holding = this.hold && !this.hold.fired && this.hold.i === it.i ? clamp((this.hold.t - 0.15) / (HOLD - 0.15), 0, 1) : 0;
    const s = (pressed ? 0.97 : hover ? 1.02 : 1) * (0.9 + 0.1 * k) - holding * 0.03;
    const poof = this.poof && this.poof.i === it.i ? this.poof.t / 0.6 : 0;
    this.xf = this.xf || [];
    this.xf[it.i] = { cx, cy: cy + (1 - k) * 40 * U, s, a: clamp(k, 0, 1) }; // the trash button follows the card
    ctx.save();
    ctx.globalAlpha *= clamp(k, 0, 1);
    ctx.translate(cx, cy + (1 - k) * 40 * U); ctx.scale(s, s); ctx.translate(-cx, -cy);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(ctx, it.x + 6 * U, it.y + 10 * U, it.w, it.h, 14 * U); ctx.fill();
    if (slot) this.drawUsed(ctx, it, slot, hover);
    else this.drawEmpty(ctx, it, hover);
    if (holding > 0) {
      ctx.fillStyle = `rgba(90,10,5,${0.35 * holding})`; roundRect(ctx, it.x, it.y, it.w, it.h, 14 * U); ctx.fill();
      const tr = this.trash[it.i];
      ctx.lineWidth = Math.max(3, 5 * U); ctx.strokeStyle = '#ff6a4a'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r + 7 * U, -Math.PI / 2, -Math.PI / 2 + TAU * holding); ctx.stroke();
    }
    if (poof > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,190,120,${0.5 * (1 - poof)})`; roundRect(ctx, it.x, it.y, it.w, it.h, 14 * U); ctx.fill(); }
    ctx.restore();
  }

  drawUsed(ctx, it, slot, hover) {
    const U = this.U, S = summary(slot), { x, y, w, h } = it;
    panel(ctx, 'parchment', x, y, w, h);
    if (hover) { ctx.fillStyle = 'rgba(255,250,220,0.12)'; roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 12); ctx.fill(); }
    const pad = Math.max(18 * U, 10), inner = w - pad * 2;
    // header
    const fsH = fz(26, 13);
    fitText(ctx, t('slot.n', { n: it.i + 1 }), x + pad, y + pad + fsH * 0.55, inner - 50 * U, { size: fsH, color: COL.head, weight: 900, fam: 'display' });
    // portrait
    const pr = Math.min(w * 0.2, h * 0.13);
    const py = y + pad + fsH * 1.3 + pr + 4 * U;
    heroPortrait(ctx, S.hero, x + w / 2, py, pr, this.time, { bg: '#2a2016' });
    fitText(ctx, t(`hero.${S.hero}.name`), x + w / 2, py + pr + fz(16, 10), inner, { size: fz(18, 10.5), align: 'center', color: COL.soft, weight: 800 });
    // chapter
    let yy = py + pr + fz(16, 10) + fz(28, 15);
    const chName = t('wm.region' + S.ch);
    fitText(ctx, `${roman(S.ch)} · ${chName}`, x + w / 2, yy, inner, { size: fz(21, 11), align: 'center', color: COL.head, weight: 900, fam: 'serif' });
    // divider
    yy += fz(18, 10);
    ctx.fillStyle = 'rgba(110,70,25,0.35)'; ctx.fillRect(x + pad, yy, inner, Math.max(1, 1.5 * U));
    yy += fz(20, 11);
    // stats rows
    const fsS = fz(18, 10.5), rowH = Math.max(fsS * 1.65, 14);
    const statRow = (draw, label, value) => {
      draw(x + pad + fsS * 0.6, yy);
      text(ctx, label, x + pad + fsS * 1.5, yy, { size: fsS, color: COL.soft, weight: 700, maxWidth: inner * 0.55 });
      text(ctx, value, x + w - pad, yy, { size: fsS, align: 'right', color: COL.ink, weight: 900 });
      yy += rowH;
    };
    statRow((sx, sy) => starIcon(ctx, sx, sy, fsS * 0.62), t('slot.stars'), `${S.stars}/${MAX_STARS}`);
    statRow((sx, sy) => drawIcon(ctx, 'flag_done', sx, sy, fsS * 1.35), t('slot.stages'), `${S.cleared}/32`);
    statRow((sx, sy) => drawIcon(ctx, 'up_respawn', sx, sy, fsS * 1.3), t('slot.time'), fmtPlayTime(S.time));
    // footer: continue strip
    const bh = Math.max(44 * U, 26), by = y + h - pad - bh;
    if (by > yy - rowH * 0.3) {
      roundRect(ctx, x + pad, by, inner, bh, bh * 0.3);
      const gr = ctx.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, '#7fd35a'); gr.addColorStop(0.55, '#3f9a2c'); gr.addColorStop(1, '#1f4a14');
      ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = Math.max(1.5, 2 * U); ctx.strokeStyle = '#1b120a'; ctx.stroke();
      fitText(ctx, S.done ? `${t('slot.continue')} · ${t('slot.complete')}` : t('slot.continue'), x + w / 2, by + bh / 2 + 1, inner - 16 * U, { size: fz(19, 11), align: 'center', color: '#fffbe8', stroke: 'rgba(30,18,6,0.85)', weight: 800 });
    }
  }

  drawEmpty(ctx, it, hover) {
    const U = this.U, { x, y, w, h } = it;
    panel(ctx, 'woodDark', x, y, w, h);
    if (hover) { ctx.fillStyle = 'rgba(255,230,180,0.08)'; roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 12); ctx.fill(); }
    const pad = Math.max(18 * U, 10);
    const fsH = fz(26, 13);
    fitText(ctx, t('slot.n', { n: it.i + 1 }), x + pad, y + pad + fsH * 0.55, w - pad * 2, { size: fsH, color: '#e8c890', weight: 900, fam: 'display' });
    // plus medallion
    const r = Math.min(w * 0.2, h * 0.14), cx = x + w / 2, cy = y + h * 0.46;
    const pulse = 1 + 0.04 * Math.sin(this.time * 3 + it.i);
    ctx.beginPath(); ctx.arc(cx, cy, r * pulse, 0, TAU);
    const gr = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    gr.addColorStop(0, '#5a4026'); gr.addColorStop(1, '#2a1a0c');
    ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = Math.max(2, 4 * U); ctx.strokeStyle = '#d8b052'; ctx.stroke();
    ctx.lineCap = 'round';
    for (const [lw, col] of [[r * 0.32, '#1d130c'], [r * 0.18, '#ffe9a8']]) {
      ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.beginPath();
      ctx.moveTo(cx - r * 0.45 * pulse, cy); ctx.lineTo(cx + r * 0.45 * pulse, cy); ctx.moveTo(cx, cy - r * 0.45 * pulse); ctx.lineTo(cx, cy + r * 0.45 * pulse); ctx.stroke();
    }
    fitText(ctx, t('slot.new'), cx, cy + r + fz(30, 16), w - pad * 2, { size: fz(26, 13), align: 'center', color: '#ffe9a8', stroke: '#1a0e06', weight: 900, fam: 'display' });
    const fs = fz(16, 10);
    const maxL = Math.min(3, Math.max(1, Math.floor((y + h - pad - (cy + r + fz(50, 27))) / (fs * 1.4))));
    lines(t('slot.newHint'), w - pad * 2, fs, 700).slice(0, maxL).forEach((ln, i) => text(ctx, ln, cx, cy + r + fz(58, 31) + i * fs * 1.4, { size: fs, align: 'center', color: 'rgba(255,233,190,0.75)', weight: 700 }));
  }

  drawTrash(ctx, it, pressed, hover) {
    if (!Save.data.slots[it.i]) return;
    const k = clamp((this.time - 0.3 - it.i * 0.09) / 0.3, 0, 1); if (k <= 0) return;
    const U = this.U, r = it.r * (pressed ? 0.92 : hover ? 1.06 : 1);
    ctx.save(); ctx.globalAlpha *= k;
    const xf = this.xf && this.xf[it.i];
    if (xf) { const c = this.cards[it.i]; ctx.translate(xf.cx, xf.cy); ctx.scale(xf.s, xf.s); ctx.translate(-(c.x + c.w / 2), -(c.y + c.h / 2)); }
    ctx.beginPath(); ctx.arc(it.x, it.y + r * 0.08, r, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
    ctx.beginPath(); ctx.arc(it.x, it.y, r, 0, TAU);
    const gr = ctx.createRadialGradient(it.x - r * 0.3, it.y - r * 0.35, r * 0.1, it.x, it.y, r);
    gr.addColorStop(0, '#f07b5c'); gr.addColorStop(0.6, '#b43a24'); gr.addColorStop(1, '#4d140a');
    ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = Math.max(1.5, 2.5 * U); ctx.strokeStyle = '#2a0b05'; ctx.stroke();
    // bin glyph
    const s = r * 0.5, x = it.x, y = it.y;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.fillStyle = '#fff2e0'; ctx.strokeStyle = '#2a0b05'; ctx.lineWidth = Math.max(1, s * 0.16);
    ctx.beginPath(); ctx.moveTo(x - s * 0.62, y - s * 0.38); ctx.lineTo(x + s * 0.62, y - s * 0.38); ctx.lineTo(x + s * 0.48, y + s * 0.85); ctx.lineTo(x - s * 0.48, y + s * 0.85); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); roundRect(ctx, x - s * 0.82, y - s * 0.72, s * 1.64, s * 0.3, s * 0.1); ctx.fill(); ctx.stroke();
    ctx.beginPath(); roundRect(ctx, x - s * 0.25, y - s * 0.95, s * 0.5, s * 0.25, s * 0.08); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#b43a24'; ctx.lineWidth = Math.max(1, s * 0.12);
    for (const dx of [-0.24, 0, 0.24]) { ctx.beginPath(); ctx.moveTo(x + dx * s, y - s * 0.15); ctx.lineTo(x + dx * s * 0.9, y + s * 0.62); ctx.stroke(); }
    ctx.restore();
  }
}
