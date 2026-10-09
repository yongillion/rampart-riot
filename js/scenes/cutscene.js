// Rampart Riot — cinematic player. Plays a film from js/cine/films.js: shots painted procedurally in a
// 1920x1080 design space (cover-fit to the screen), bilingual captions, chapter cards, sound cues, letterbox.
// Films with `sync: true` follow the music clock (Audio.musicTime) so picture and score stay locked.
// params: { id, next: { scene, params } | 'scene', t?: debug start time, freeze?: debug pause }
import { Screen } from '../core/screen.js';
import { Audio } from '../core/audio.js';
import { Assets } from '../core/assets.js';
import { Save } from '../core/save.js';
import { t as tr, L, getLang } from '../core/i18n.js';
import { clamp } from '../core/util.js';
import { text, font, wrap, roundRect } from '../render/draw.js';
import { CHARACTERS } from '../data/story.js';
import { DW, DH } from '../cine/kit.js';
import { FILMS } from '../cine/films.js';
import { HD } from '../core/hd.js';

const XF = 0.7; // default crossfade between shots

export class CutsceneScene {
  constructor(app) { this.app = app; this.loading = true; this.clock = 0; this.prev = 0; this.skipT = -10; this.done = false; this.realT = 0; }

  async enter(p) {
    this.p = p; this.id = p.id; this.film = FILMS[this.id];
    if (!this.film) { console.warn('no film', this.id); this.finish(); return; }
    const F = this.film;
    this.debug = p.t !== undefined; this.clock = this.debug ? +p.t : 0; this.prev = this.clock;
    this.freeze = p.freeze !== undefined;
    this.S = { fx: { flash: 0, flashColor: '#fff', flashD: 0.5, shake: 0, shakeD: 1, shakeT: 0 } };
    await Promise.all([
      ...(F.atlases || []).map(a => Assets.loadAtlas(a)),
      ...(F.images || []).map(u => Assets.loadImage(u)),
      Assets.loadImage('assets/ui/logo.png'),
    ]);
    // HD busts / paintings (js/core/hd.js) start loading now so they're ready by the time they're on screen
    for (const id of F.cast || []) HD.want('hdp_' + id);
    for (const u of F.images || []) HD.image(u, true);
    if (F.init) F.init(this.S);
    this.loading = false;
    this.cues = (F.cues || []).slice().sort((a, b) => a.t - b.t);
    if (F.music && !this.debug) Audio.playMusic(F.music, { restart: true, fadeIn: F.musicFade ?? 0.05, fadeOut: 1.0, loop: !!F.musicLoop });
    else if (F.music && this.debug) Audio.stopMusic(0.2);
    this.musicWait = 0;
  }
  exit() { }

  get time() { return this.clock; }

  update(dt) {
    if (this.loading || this.done) return;
    this.realT += dt;
    const F = this.film;
    if (!this.freeze) {
      const mt = F.sync && !this.debug && Audio.musicId() === F.music ? Audio.musicTime() : null;
      if (mt !== null && mt >= 0) this.clock = mt + (F.musicOffset || 0);
      else if (F.sync && !this.debug && F.music && this.musicWait < 2.5 && Audio.ready && Audio.ctx && Audio.ctx.state === 'running') this.musicWait += dt; // wait for the track to start
      else this.clock += dt;
    }
    // sound / screen cues that fire when the clock crosses them
    for (const c of this.cues) if (c.t > this.prev && c.t <= this.clock) this.cue(c);
    this.prev = this.clock;
    const fx = this.S.fx;
    if (fx.flash > 0) fx.flash = Math.max(0, fx.flash - dt / fx.flashD);
    if (fx.shakeT > 0) fx.shakeT = Math.max(0, fx.shakeT - dt);
    if (F.update) F.update(this.S, dt, this.clock);
    if (this.clock >= F.dur && !this.debug) this.finish();
  }
  cue(c) {
    const fx = this.S.fx;
    if (c.sfx) Audio.sfx(c.sfx, { vol: c.vol ?? 0.8, minGap: 0 });
    if (c.flash) { fx.flash = c.flash; fx.flashColor = c.color || '#ffffff'; fx.flashD = c.d || 0.6; }
    if (c.shake) { fx.shake = c.shake; fx.shakeD = c.d || 1; fx.shakeT = c.d || 1; }
  }

  finish(skipped = false) {
    if (this.done) return;
    this.done = true;
    const slot = Save.slot;
    if (slot && this.id) { slot.story = slot.story || {}; slot.story[this.id] = true; if (this.id === 'ending') slot.endingSeen = true; Save.persist(); }
    if (!this.film || this.film.stopMusic !== false || skipped) Audio.stopMusic(skipped ? 0.6 : 1.4);
    const n = this.p && this.p.next;
    if (!n) this.app.go('title', { menu: true });
    else if (typeof n === 'string') this.app.go(n, {});
    else this.app.go(n.scene, n.params || {});
  }

  // ---------------------------------------------------------------- input: tap shows "Skip", tap it to skip
  skipRect() {
    const U = Screen.uiScale, w = Math.max(150 * U, 96), h = Math.max(48 * U, 36);
    return { x: Screen.gw - Screen.safe.r - w - 16 * U, y: Screen.safe.t + 14 * U, w, h };
  }
  onDown() { return true; }
  onTap(p) {
    if (this.loading) return;
    const r = this.skipRect(), vis = this.realT - this.skipT < 3;
    if (vis && p.x >= r.x - 10 && p.x <= r.x + r.w + 10 && p.y >= r.y - 10 && p.y <= r.y + r.h + 10) { Audio.sfx('ui_click'); this.finish(true); return; }
    this.skipT = this.realT;
  }
  onKey(k) { if (k === 'Escape' || k === 'Enter') this.finish(true); else if (k === ' ') this.skipT = this.realT; }

  // ---------------------------------------------------------------- drawing
  render(ctx, w, h) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    if (this.loading || !this.film) return;
    const F = this.film, T = this.clock, fx = this.S.fx;
    const k = Math.max(w / DW, h / DH);
    ctx.save();
    ctx.translate((w - DW * k) / 2, (h - DH * k) / 2); ctx.scale(k, k);
    if (fx.shakeT > 0) { const a = fx.shake * (fx.shakeT / fx.shakeD); ctx.translate((Math.random() - 0.5) * a * 2, (Math.random() - 0.5) * a * 2); }
    // shots (crossfade in over `xf` seconds before their start)
    for (const sh of F.shots) {
      const xf = sh.xf ?? XF;
      if (T < sh.t0 - xf || T >= sh.t1) continue;
      const a = T < sh.t0 ? clamp((T - (sh.t0 - xf)) / xf, 0, 1) : 1;
      const lt = T - sh.t0, u = clamp(lt / (sh.t1 - sh.t0), 0, 1);
      ctx.save(); ctx.globalAlpha = a;
      try { sh.draw(ctx, this.S, lt, u, T); } catch (e) { console.error('shot', e); }
      ctx.restore();
    }
    ctx.restore();
    if (fx.flash > 0) { ctx.save(); ctx.globalAlpha = clamp(fx.flash, 0, 1); ctx.fillStyle = fx.flashColor; ctx.fillRect(0, 0, w, h); ctx.restore(); }
    // letterbox (2.2:1)
    const lb = F.letterbox === false ? 0 : Math.max(0, (h - w / 2.2) / 2) * clamp(T / 1.5, 0, 1);
    if (lb > 0) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, lb); ctx.fillRect(0, h - lb, w, lb); }
    this.drawCaptions(ctx, w, h, lb);
    // fade from / to black
    const fin = clamp(T / (F.fadeIn ?? 1.2), 0, 1), fout = clamp((F.dur - T) / (F.fadeOut ?? 1.5), 0, 1);
    const fa = 1 - Math.min(fin, fout);
    if (fa > 0) { ctx.fillStyle = `rgba(0,0,0,${fa})`; ctx.fillRect(0, 0, w, h); }
    // skip button
    const sv = clamp(1 - (this.realT - this.skipT - 2.4) / 0.6, 0, 1);
    if (sv > 0 && this.realT - this.skipT < 3) {
      const r = this.skipRect(), U = Screen.uiScale;
      ctx.save(); ctx.globalAlpha = sv;
      roundRect(ctx, r.x, r.y, r.w, r.h, r.h / 2); ctx.fillStyle = 'rgba(10,8,6,0.6)'; ctx.fill();
      ctx.lineWidth = Math.max(1, 2 * U); ctx.strokeStyle = 'rgba(255,230,180,0.6)'; ctx.stroke();
      text(ctx, tr('cine.skip') + '  ▸▸', r.x + r.w / 2, r.y + r.h / 2 + 1, { size: Math.max(14, 19 * U), align: 'center', color: '#fff1d6', weight: 800 });
      ctx.restore();
    }
  }

  drawCaptions(ctx, w, h, lb) {
    const F = this.film, T = this.clock, U = Screen.uiScale;
    for (const c of F.captions || []) {
      const d = c.d ?? 4;
      if (T < c.t || T > c.t + d) continue;
      const a = Math.min(clamp((T - c.t) / 0.45, 0, 1), clamp((c.t + d - T) / 0.55, 0, 1));
      if (c.style === 'card') { this.drawCard(ctx, w, h, c, a); continue; }
      const size = clamp(Math.min(w, h * 1.9) * 0.0175, 15, 30);
      const maxW = Math.min(w * 0.78, size * 34);
      const str = L(c);
      const lines = wrap(ctx, str, maxW, size, 600, 'serif');
      const lh = size * 1.5;
      const who = c.who && CHARACTERS[c.who];
      const block = lines.length * lh + (who ? size * 1.25 : 0);
      // inside the bottom letterbox bar when there is room, otherwise just above the bottom edge
      let y0 = lb >= block + 16 ? h - lb + (lb - block) / 2 : h - Screen.safe.b - block - Math.max(18, h * 0.05);
      if (c.pos === 'top') y0 = lb >= block + 16 ? (lb - block) / 2 : Screen.safe.t + Math.max(18, h * 0.05);
      ctx.save(); ctx.globalAlpha = a;
      if (lb < block + 16) { // soft dark band behind the text for readability
        const g = ctx.createLinearGradient(0, y0 - size, 0, y0 + block + size);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.3, 'rgba(0,0,0,0.45)'); g.addColorStop(0.7, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, y0 - size, w, block + size * 2);
      }
      let y = y0;
      if (who) {
        const name = who[getLang()] || who.en;
        text(ctx, name, w / 2, y + size * 0.45, { size: size * 0.78, align: 'center', color: lighten(who.color || '#c8a060'), weight: 800, fam: 'sans', stroke: 'rgba(0,0,0,0.7)', strokeWidth: size * 0.12 });
        y += size * 1.25;
      }
      for (const ln of lines) {
        text(ctx, who ? ln : ln, w / 2, y + lh / 2, { size, align: 'center', color: c.color || (who ? '#fff8ec' : '#f4e6c8'), weight: 600, fam: 'serif', shadow: 'rgba(0,0,0,0.85)', shadowY: size * 0.08 });
        y += lh;
      }
      ctx.restore();
    }
  }
  drawCard(ctx, w, h, c, a) {
    const lines = L({ ko: c.ko, en: c.en });
    const [l1, l2] = Array.isArray(lines) ? lines : [lines, ''];
    const s1 = clamp(h * 0.04, 16, 34), s2 = clamp(h * 0.085, 30, 76);
    const cy = h * (c.y ?? 0.5);
    ctx.save(); ctx.globalAlpha = a;
    text(ctx, l1, w / 2, cy - s2 * 0.75, { size: s1, align: 'center', color: '#e8c87a', weight: 600, fam: 'serif', shadow: 'rgba(0,0,0,0.8)' });
    text(ctx, l2, w / 2, cy + s1 * 0.2, { size: s2, align: 'center', color: '#fff4dc', weight: 900, fam: 'display', shadow: 'rgba(0,0,0,0.85)', shadowY: s2 * 0.06 });
    // ornament line
    const lw = Math.min(w * 0.3, s2 * 5) * clamp(a * 1.4, 0, 1);
    const g = ctx.createLinearGradient(w / 2 - lw, 0, w / 2 + lw, 0);
    g.addColorStop(0, 'rgba(232,200,122,0)'); g.addColorStop(0.5, 'rgba(232,200,122,0.9)'); g.addColorStop(1, 'rgba(232,200,122,0)');
    ctx.fillStyle = g; ctx.fillRect(w / 2 - lw, cy + s2 * 0.75, lw * 2, Math.max(1.5, s1 * 0.08));
    ctx.restore();
  }
}

function lighten(c) {
  const n = parseInt(c.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = v => Math.round(v + (255 - v) * 0.55);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
