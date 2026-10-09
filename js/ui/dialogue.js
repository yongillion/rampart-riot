// Rampart Riot — in-battle / world-map dialogue box with portraits and typewriter text
import { Screen } from '../core/screen.js';
import { Audio } from '../core/audio.js';
import { getLang, t } from '../core/i18n.js';
import { panel, text, wrap, roundRect } from '../render/draw.js';
import { Assets, drawFrame, drawFrameFit } from '../core/assets.js';
import { HD } from '../core/hd.js';
import { CHARACTERS } from '../data/story.js';

export function lineText(l) { return l[getLang()] || l.en || l.ko || (l.k ? t(l.k) : ''); }

export class Dialogue {
  constructor(lines, onDone) {
    this.lines = lines || [];
    this.i = 0; this.chars = 0; this.t = 0;
    this.onDone = onDone;
    this.tickAcc = 0;
    if (!this.lines.length) setTimeout(() => onDone && onDone(), 0);
    Audio.duck(0.5);
  }
  get cur() { return this.lines[this.i]; }
  layout() {}
  update(dt) {
    this.t += dt;
    const l = this.cur; if (!l) return;
    const full = lineText(l).length;
    if (this.chars < full) {
      this.chars = Math.min(full, this.chars + dt * 38);
      this.tickAcc += dt;
      if (this.tickAcc > 0.07) { this.tickAcc = 0; Audio.sfx('typewriter', { vol: 0.5, minGap: 0.05 }); }
    }
  }
  tap() {
    const l = this.cur; if (!l) return;
    const full = lineText(l).length;
    if (this.chars < full) { this.chars = full; return; }
    this.i++; this.chars = 0;
    if (this.i >= this.lines.length) { Audio.duck(1); this.done = true; if (this.onDone) this.onDone(); }
    else Audio.sfx('ui_page', { vol: 0.6 });
  }
  draw(ctx) {
    const l = this.cur; if (!l) return;
    const U = Screen.uiScale, W = Screen.gw, H = Screen.gh;
    const ch = CHARACTERS[l.who] || CHARACTERS.narrator;
    const narr = l.who === 'narrator';
    const w = Math.min(980 * U, W - 24), h = 168 * U;
    const x = (W - w) / 2, y = H - h - 14 * U - Screen.safe.b * 0.5;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
    const right = ch.side === 'right';
    if (!narr) {
      // portrait
      const pr = 92 * U;
      const px = right ? x + w - pr * 0.95 : x + pr * 0.95, py = y - pr * 0.35;
      ctx.save();
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = ch.bg || '#3a2a1c'; ctx.fill();
      ctx.lineWidth = 6 * U; ctx.strokeStyle = '#d8b052'; ctx.stroke();
      ctx.clip();
      const pid = ch.portrait || l.who, base = Assets.frame('portrait/' + pid);
      // HD bust (hdp_<id>, js/core/hd.js) once the atlas one would be stretched
      const f = Assets.frame('hdp/' + pid) || base;
      if (f && f === base && HD.needed(1, base.s * (pr / 60) * HD.px(ctx))) HD.want('hdp_' + pid);
      // portraits are 128x128-unit busts facing right, anchored at their centre; speakers on the right face left
      if (f) drawFrame(ctx, f, px, py, right, pr / 60);
      else { ctx.fillStyle = ch.color || '#888'; ctx.beginPath(); ctx.arc(px, py + pr * 0.3, pr * 0.7, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    panel(ctx, narr ? 'dark' : 'parchment', x, y, w, h);
    const tx = narr ? x + 34 * U : right ? x + 30 * U : x + 200 * U;
    const tw = narr ? w - 68 * U : w - 230 * U;
    if (!narr) {
      const name = ch[getLang()] || ch.en;
      const nw = Math.max(140 * U, name.length * 18 * U + 40 * U);
      const nx = right ? x + w - 200 * U - nw : tx - 12 * U;
      roundRect(ctx, nx, y - 20 * U, nw, 38 * U, 10 * U); ctx.fillStyle = ch.color || '#6a3a1a'; ctx.fill(); ctx.lineWidth = 3 * U; ctx.strokeStyle = '#2a1606'; ctx.stroke();
      text(ctx, name, nx + nw / 2, y - 1 * U, { size: 20 * U, align: 'center', color: '#fff6e0', stroke: '#2a1606', weight: 900 });
    }
    const full = lineText(l);
    const shown = full.slice(0, Math.floor(this.chars));
    const fs = (narr ? 22 : 21) * U;
    const lines = wrap(ctx, full, tw, fs, 600, narr ? 'serif' : 'sans');
    let remaining = shown.length, yy = y + 34 * U;
    for (const ln of lines) {
      if (remaining <= 0) break;
      const part = ln.slice(0, remaining);
      remaining -= ln.length + 1;
      text(ctx, part, tx, yy, { size: fs, color: narr ? '#f2e6c8' : '#2e1c0c', weight: narr ? 600 : 650, fam: narr ? 'serif' : 'sans', baseline: 'top' });
      yy += fs * 1.45;
    }
    if (this.chars >= full.length) {
      const a = 0.5 + 0.5 * Math.sin(this.t * 6);
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = narr ? '#f2e6c8' : '#6a3a10';
      ctx.beginPath(); const ax = x + w - 34 * U, ay = y + h - 28 * U; ctx.moveTo(ax - 9 * U, ay - 6 * U); ctx.lineTo(ax + 9 * U, ay - 6 * U); ctx.lineTo(ax, ay + 6 * U); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
}
