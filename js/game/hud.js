// Rampart Riot — in-battle HUD: stats plaque, controls, hero & spell buttons, wave flags,
// radial tower menu with tooltips, info panel, boss bar and banners.
import { Screen } from '../core/screen.js';
import { Audio } from '../core/audio.js';
import { t } from '../core/i18n.js';
import { clamp, fmtInt, TAU } from '../core/util.js';
import { panel, text, bar, cooldownSweep, circleButton, roundRect, wrap, font, star, measure } from '../render/draw.js';
import { drawIcon } from '../render/icons.js';
import { Assets, drawFrameFit } from '../core/assets.js';
import { TOWERS, SKILLS, UNITS } from '../data/towers.js';
import { ENEMIES } from '../data/enemies.js';
import { HEROES } from '../data/heroes.js';
import { unitFrame } from './renderer.js';
import { FIELD } from './battle.js';

const LINE_ICONS = { archer: 'archer', barracks: 'barracks', mage: 'mage', artillery: 'artillery' };

export function armorWord(v) { return v <= 0 ? t('stat.none') : v < 0.3 ? t('stat.low') : v < 0.55 ? t('stat.medium') : v < 0.75 ? t('stat.high') : t('stat.veryhigh'); }
export function speedWord(v) { return v < 40 ? t('stat.slow') : v < 75 ? t('stat.normal') : v < 120 ? t('stat.fast') : t('stat.veryfast'); }
export function rateWord(cd) { return cd <= 0.5 ? t('stat.veryfast') : cd <= 0.9 ? t('stat.fast') : cd <= 1.6 ? t('stat.normal') : t('stat.slow'); }

export class HUD {
  constructor(scene) {
    this.s = scene;
    this.menu = null;          // {kind:'plot'|'tower', obj, buttons:[], pick: index|null}
    this.waveTip = null;       // path index with visible info
    this.banners = [];
    this.time = 0;
    this.press = null;
    this.flagPulse = 0;
    this.hover = null;
  }
  get b() { return this.s.battle; }
  get U() { return Screen.uiScale; }

  layout() {
    const U = this.U, W = Screen.gw, H = Screen.gh, sf = Screen.safe;
    this.W = W; this.H = H;
    this.top = { x: sf.l + 10 * U, y: 8 * U, w: 330 * U, h: 60 * U };
    this.pauseBtn = { x: W - sf.r - 44 * U, y: 42 * U, r: 30 * U };
    this.speedBtn = { x: W - sf.r - 112 * U, y: 42 * U, r: 30 * U };
    let bx = sf.l + 56 * U;
    const by = H - 54 * U - sf.b * 0.5;
    this.heroBtn = this.b.heroes.length ? { x: bx, y: by, r: 42 * U } : null;
    if (this.heroBtn) bx += 100 * U;
    this.spellBtns = [
      { id: 'skyfall', x: bx, y: by + 2 * U, r: 37 * U },
      { id: 'militia', x: bx + 88 * U, y: by + 2 * U, r: 37 * U },
    ];
    this.infoRect = { w: Math.min(560 * U, W * 0.5), h: 74 * U };
    this.infoRect.x = (W - this.infoRect.w) / 2 + 60 * U;
    this.infoRect.y = H - this.infoRect.h - 6 * U - sf.b * 0.5;
    if (this.infoRect.x < bx + 60 * U) this.infoRect.x = bx + 60 * U;
    if (this.infoRect.x + this.infoRect.w > W - sf.r - 8) this.infoRect.w = W - sf.r - 8 - this.infoRect.x;
  }

  banner(str, o = {}) { this.banners.push({ str, sub: o.sub || '', t: 0, life: o.life || 2.4, color: o.color || '#ffe9a8', big: o.big }); }

  update(dt) {
    this.time += dt;
    for (const b of this.banners) b.t += dt;
    this.banners = this.banners.filter(b => b.t < b.life);
    if (this.menu && this.menu.obj && this.menu.kind === 'tower' && !this.b.towers.includes(this.menu.obj)) this.closeMenu();
    if (this.menu && this.menu.kind === 'plot' && this.menu.obj.tower) this.closeMenu();
  }

  // ------------------------------------------------------------------ wave flags
  flagPositions() {
    const b = this.b, cam = this.s.cam, U = this.U;
    if (!b.waveVisible()) return [];
    const out = [];
    for (const pi of b.wavePaths()) {
      const p = b.paths[pi];
      const s0 = p.entryInside(FIELD.px + 40, FIELD.py + 40, FIELD.px + FIELD.pw - 40, FIELD.py + FIELD.ph - 40);
      const q = p.pos(s0 + 20, 0, {});
      const sp = cam.toScreen(q.x, q.y - 34);
      const m = 40 * U, r = 30 * U;
      let x = clamp(sp.x, Screen.safe.l + m, this.W - Screen.safe.r - m), y = clamp(sp.y, 90 * U, this.H - 110 * U);
      // keep clear of the HUD clusters (stats plaque, speed/pause, hero & spell buttons)
      for (const z of this.hudZones()) {
        if (x + r > z.x0 && x - r < z.x1 && y + r > z.y0 && y - r < z.y1) y = z.top ? z.y1 + r + 4 * U : z.y0 - r - 26 * U;
      }
      // avoid stacking two flags on top of each other
      for (const o of out) if (Math.hypot(o.x - x, o.y - y) < r * 2.3) y = o.y + (y >= o.y ? 1 : -1) * r * 2.4;
      out.push({ pi, x, y, r, off: x !== sp.x || y !== sp.y, wx: q.x, wy: q.y });
    }
    return out;
  }

  hudZones() {
    const U = this.U, z = [];
    if (this.top) z.push({ x0: this.top.x - 6 * U, y0: 0, x1: this.top.x + this.top.w + 10 * U, y1: this.top.y + this.top.h + 6 * U, top: true });
    if (this.speedBtn) z.push({ x0: this.speedBtn.x - this.speedBtn.r - 8 * U, y0: 0, x1: this.W, y1: this.pauseBtn.y + this.pauseBtn.r + 8 * U, top: true });
    const lb = this.spellBtns && this.spellBtns[this.spellBtns.length - 1];
    if (lb) z.push({ x0: 0, y0: lb.y - 50 * U, x1: lb.x + lb.r + 10 * U, y1: this.H, top: false });
    return z;
  }

  // ------------------------------------------------------------------ tower menu
  openPlotMenu(plot) {
    const b = this.b;
    const opts = ['archer', 'barracks', 'mage', 'artillery'].map((line, i) => {
      const id = line + '1';
      const allowed = b.lineAllowed(line);
      return { kind: 'build', id, line, icon: line, ang: [225, 315, 135, 45][i], cost: allowed ? this.priceOf(id) : null, locked: !allowed };
    });
    this.menu = { kind: 'plot', obj: plot, opts, pick: null, t: 0 };
    this.s.renderer.sel = { kind: 'plot', obj: plot };
    Audio.sfx('tower_menu');
  }
  priceOf(id) {
    const d = TOWERS[id], m = this.b.mods;
    const disc = d.line === 'mage' ? m.mageDiscount : d.line === 'artillery' ? m.artDiscount : 0;
    return Math.round(d.cost * (1 - disc));
  }
  openTowerMenu(tw) {
    const b = this.b, opts = [];
    const maxL = this.s.maxTowerLevel;
    if (tw.def.next && tw.level < 3) {
      const to = tw.def.next[0];
      const locked = TOWERS[to].level > maxL;
      opts.push({ kind: 'upgrade', id: to, icon: 'upgrade', ang: 270, cost: tw.upgradeCost(to), locked });
    } else if (tw.def.next && tw.level === 3) {
      tw.def.next.forEach((to, i) => opts.push({ kind: 'upgrade', id: to, icon: to, ang: i ? 315 : 225, cost: tw.upgradeCost(to), locked: maxL < 4 }));
    } else if (tw.def.skills) {
      tw.def.skills.forEach((sk, i) => opts.push({ kind: 'skill', id: sk, icon: 'sk_' + sk, ang: i ? 315 : 225, cost: tw.skillCost(sk), rank: tw.skills[sk] || 0 }));
    }
    opts.push({ kind: 'sell', icon: 'sell', ang: 90, cost: -tw.sellValue });
    if (tw.line === 'barracks') opts.push({ kind: 'rally', icon: 'rally', ang: 30 });
    this.menu = { kind: 'tower', obj: tw, opts, pick: null, t: 0 };
    this.s.renderer.sel = { kind: 'tower', obj: tw };
    Audio.sfx('tower_menu');
  }
  closeMenu() {
    this.menu = null;
    if (this.s.renderer.sel && (this.s.renderer.sel.kind === 'plot' || this.s.renderer.sel.kind === 'tower')) this.s.renderer.sel = null;
  }
  menuGeom() {
    const m = this.menu; if (!m) return null;
    const U = this.U;
    const o = m.obj;
    const sp = this.s.cam.toScreen(o.x, o.y - (m.kind === 'tower' ? Math.min(60, (o.top || 40) * 0.6) : 10));
    const R = 74 * U, r = 26 * U;
    const cx = clamp(sp.x, Screen.safe.l + R + r + 4, this.W - Screen.safe.r - R - r - 4);
    const cy = clamp(sp.y, R + r + 66 * U, this.H - R - r - 20 * U);
    const btns = m.opts.map((op, i) => { const a = op.ang * Math.PI / 180; return { op, i, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, r }; });
    return { cx, cy, R, r, btns };
  }
  optAffordable(op) { return op.cost === null || op.cost <= this.b.gold; }
  optEnabled(op) {
    if (op.locked) return false;
    if (op.kind === 'skill' && op.rank >= 3) return false;
    if (op.kind === 'build' || op.kind === 'upgrade' || op.kind === 'skill') return this.optAffordable(op);
    return true;
  }

  menuTap(p, mouse) {
    const g = this.menuGeom(); if (!g) return false;
    for (const bt of g.btns) {
      if (Math.hypot(p.x - bt.x, p.y - bt.y) <= bt.r * 1.15) {
        const op = bt.op;
        if (op.locked) { Audio.sfx('ui_error'); this.menu.pick = bt.i; return true; }
        if (op.kind === 'rally') { this.s.startRally(this.menu.obj); return true; }
        if (this.menu.pick === bt.i || mouse) {
          if (!this.optEnabled(op)) { Audio.sfx('ui_error'); this.menu.pick = bt.i; return true; }
          this.execute(op);
        } else {
          this.menu.pick = bt.i;
          Audio.sfx('ui_click');
          this.previewRange(op);
        }
        return true;
      }
    }
    // tap on tooltip confirm area
    if (this.tipRect && this.menu.pick !== null) {
      const r = this.tipRect;
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
        const op = this.menu.opts[this.menu.pick];
        if (this.optEnabled(op) && op.kind !== 'rally') this.execute(op); else Audio.sfx('ui_error');
        return true;
      }
    }
    // inside ring center: keep
    if (Math.hypot(p.x - g.cx, p.y - g.cy) < g.R * 0.55) return true;
    return false;
  }
  previewRange(op) {
    const sel = this.s.renderer.sel; if (!sel) return;
    if (op.kind === 'build' || op.kind === 'upgrade') {
      const d = TOWERS[op.id];
      const m = this.b.mods;
      const mul = d.line === 'archer' ? m.archerRange : d.line === 'mage' ? m.mageRange : d.line === 'artillery' ? m.artRange : 1;
      sel.previewRange = d.line === 'barracks' ? 0 : d.range * mul;
    } else sel.previewRange = 0;
  }
  execute(op) {
    const b = this.b, m = this.menu;
    if (op.kind === 'build') {
      const tw = b.build(m.obj.i, op.id);
      if (tw) { this.s.onBuilt(tw); this.closeMenu(); }
      else Audio.sfx('ui_error');
    } else if (op.kind === 'upgrade') {
      if (b.upgrade(m.obj, op.id)) { this.s.onUpgraded(m.obj); this.openTowerMenu(m.obj); this.closeMenu(); }
      else Audio.sfx('ui_error');
    } else if (op.kind === 'skill') {
      if (b.buySkill(m.obj, op.id)) { const tw = m.obj; this.openTowerMenu(tw); this.menu.pick = this.menu.opts.findIndex(o => o.id === op.id); }
      else Audio.sfx('ui_error');
    } else if (op.kind === 'sell') {
      b.sell(m.obj); this.closeMenu();
    }
  }

  // ------------------------------------------------------------------ input
  // returns true if consumed
  tap(p, mouse) {
    const b = this.b;
    if (this.menu && this.menuTap(p, mouse)) return true;
    const hitC = (o) => o && Math.hypot(p.x - o.x, p.y - o.y) <= o.r * 1.12;
    if (hitC(this.pauseBtn)) { Audio.sfx('ui_click'); this.s.togglePause(); return true; }
    if (hitC(this.speedBtn)) { Audio.sfx('ui_click'); this.s.toggleSpeed(); return true; }
    if (this.heroBtn && hitC(this.heroBtn)) { this.s.selectHero(); return true; }
    for (const sb of this.spellBtns) if (hitC(sb)) { this.s.toggleSpell(sb.id); return true; }
    for (const f of this.flagPositions()) {
      if (Math.hypot(p.x - f.x, p.y - f.y) <= f.r * 1.25) {
        if (!b.started || mouse || this.waveTip === f.pi) { this.waveTip = null; if (b.callWave()) this.s.onWaveCalled(); }
        else { this.waveTip = f.pi; Audio.sfx('ui_click'); }
        return true;
      }
    }
    if (this.waveTip !== null) { this.waveTip = null; }
    // top plaque / info panel swallow taps
    const tp = this.top;
    if (p.x >= tp.x && p.x <= tp.x + tp.w && p.y >= tp.y && p.y <= tp.y + tp.h) return true;
    return false;
  }
  hoverAt(p) {
    this.hover = p;
    let wt = null;
    for (const f of this.flagPositions()) if (Math.hypot(p.x - f.x, p.y - f.y) <= f.r * 1.25) wt = f.pi;
    this.waveTip = wt;
    if (this.menu) {
      const g = this.menuGeom();
      let pick = null;
      if (g) for (const bt of g.btns) if (Math.hypot(p.x - bt.x, p.y - bt.y) <= bt.r * 1.15) pick = bt.i;
      if (pick !== this.menu.pick) { this.menu.pick = pick; if (pick !== null) this.previewRange(this.menu.opts[pick]); else if (this.s.renderer.sel) this.s.renderer.sel.previewRange = 0; }
    }
  }
  pointInHud(p) {
    const hitC = (o) => o && Math.hypot(p.x - o.x, p.y - o.y) <= o.r * 1.12;
    if (hitC(this.pauseBtn) || hitC(this.speedBtn) || hitC(this.heroBtn)) return true;
    for (const sb of this.spellBtns) if (hitC(sb)) return true;
    return false;
  }

  // ------------------------------------------------------------------ drawing
  draw(ctx) {
    const b = this.b, U = this.U;
    this.drawFlags(ctx);
    if (this.menu) this.drawMenu(ctx);
    this.drawTop(ctx);
    this.drawButtons(ctx);
    this.drawBoss(ctx);
    this.drawInfo(ctx);
    this.drawBanners(ctx);
  }

  drawTop(ctx) {
    const U = this.U, b = this.b, r = this.top;
    panel(ctx, 'wood', r.x, r.y, r.w, r.h);
    const cy = r.y + r.h / 2;
    const fs = 25 * U;
    let x = r.x + 30 * U;
    const flash = this.s.lifeFlash > 0 ? Math.sin(this.time * 30) > 0 : false;
    drawIcon(ctx, 'heart', x, cy, 30 * U);
    text(ctx, String(b.lives), x + 20 * U, cy + 1, { size: fs, color: flash ? '#ff6a5a' : '#fff6e0', stroke: '#2a1606', weight: 900 });
    x += 86 * U;
    drawIcon(ctx, 'gold', x, cy, 30 * U);
    text(ctx, fmtInt(b.gold), x + 20 * U, cy + 1, { size: fs, color: '#ffe27a', stroke: '#2a1606', weight: 900 });
    x += 116 * U;
    drawIcon(ctx, 'skull', x, cy, 28 * U);
    text(ctx, `${Math.min(b.waveIdx, b.totalWaves)}/${b.totalWaves}`, x + 19 * U, cy + 1, { size: fs * 0.92, color: '#fff6e0', stroke: '#2a1606', weight: 900 });
  }

  drawButtons(ctx) {
    const U = this.U, b = this.b, s = this.s;
    // pause / speed
    circleButton(ctx, this.pauseBtn.x, this.pauseBtn.y, this.pauseBtn.r, { color: 'dark' });
    drawIcon(ctx, 'pause', this.pauseBtn.x, this.pauseBtn.y, this.pauseBtn.r * 1.0);
    circleButton(ctx, this.speedBtn.x, this.speedBtn.y, this.speedBtn.r, { color: s.speed > 1 ? 'gold' : 'dark' });
    drawIcon(ctx, 'speed' + s.speed, this.speedBtn.x, this.speedBtn.y, this.speedBtn.r * 1.05);
    // hero
    if (this.heroBtn) {
      const h = b.heroes[0], hb = this.heroBtn;
      const selected = s.renderer.sel && s.renderer.sel.kind === 'hero';
      circleButton(ctx, hb.x, hb.y, hb.r, { color: selected ? 'green' : 'dark' });
      const pf = Assets.frame('portrait/' + h.heroId);
      ctx.save(); ctx.beginPath(); ctx.arc(hb.x, hb.y, hb.r * 0.78, 0, TAU); ctx.clip();
      if (pf) drawFrameFit(ctx, pf, hb.x, hb.y + hb.r * 0.05, hb.r * 1.7);
      else { const f = unitFrame('h_' + h.heroId, 'idle', this.time); if (f) drawFrameFit(ctx, f, hb.x, hb.y + hb.r * 0.25, hb.r * 2.0); else { ctx.fillStyle = HEROES[h.heroId].color; ctx.fill(); } }
      if (h.dead) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(hb.x - hb.r, hb.y - hb.r, hb.r * 2, hb.r * 2); }
      ctx.restore();
      // hp ring
      ctx.save(); ctx.lineWidth = 5 * U; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(30,10,5,0.8)'; ctx.beginPath(); ctx.arc(hb.x, hb.y, hb.r * 0.9, 0, TAU); ctx.stroke();
      ctx.strokeStyle = h.dead ? '#888' : '#6fdc4a'; ctx.beginPath(); ctx.arc(hb.x, hb.y, hb.r * 0.9, -Math.PI / 2, -Math.PI / 2 + TAU * (h.dead ? 1 - h.respawnT / h.respawn : h.hp / h.maxHp)); ctx.stroke();
      ctx.restore();
      if (h.dead) text(ctx, String(Math.ceil(h.respawnT)), hb.x, hb.y, { size: 26 * U, align: 'center', color: '#fff', stroke: '#000', weight: 900 });
      // level badge
      ctx.beginPath(); ctx.arc(hb.x + hb.r * 0.72, hb.y + hb.r * 0.66, 13 * U, 0, TAU); ctx.fillStyle = '#2a1a0c'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#d8b052'; ctx.stroke();
      text(ctx, String(h.level), hb.x + hb.r * 0.72, hb.y + hb.r * 0.67, { size: 15 * U, align: 'center', color: '#ffe27a', weight: 900 });
    }
    // spells
    for (const sb of this.spellBtns) {
      const sp = b.spells[sb.id];
      const active = s.spellMode === sb.id;
      const ready = b.spellReady(sb.id);
      circleButton(ctx, sb.x, sb.y, sb.r, { color: active ? 'gold' : 'dark', disabled: sp.locked });
      if (sp.locked) { drawIcon(ctx, 'lock', sb.x, sb.y, sb.r); continue; }
      drawIcon(ctx, sb.id, sb.x, sb.y, sb.r * 1.25, { gray: !ready && !active });
      if (sp.t > 0) {
        cooldownSweep(ctx, sb.x, sb.y, sb.r * 0.78, sp.t / sp.cd);
        text(ctx, String(Math.ceil(sp.t)), sb.x, sb.y, { size: 20 * U, align: 'center', color: '#fff', stroke: '#000', weight: 900 });
      } else if (ready && !active) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.2 * Math.sin(this.time * 4);
        ctx.strokeStyle = '#ffe48a'; ctx.lineWidth = 4 * U; ctx.beginPath(); ctx.arc(sb.x, sb.y, sb.r * 0.98, 0, TAU); ctx.stroke(); ctx.restore();
      }
    }
  }

  drawFlags(ctx) {
    const b = this.b, U = this.U;
    const flags = this.flagPositions();
    let hinted = false;
    for (const f of flags) {
      const pulse = 1 + 0.08 * Math.sin(this.time * 6);
      const r = f.r * pulse;
      // ring timer
      circleButton(ctx, f.x, f.y, r, { color: 'red' });
      drawIcon(ctx, 'skull', f.x, f.y, r * 1.0);
      if (b.started && isFinite(b.nextWaveIn)) {
        const total = Math.max(1, b.nextWaveIn + (b.t - b.waveStartT));
        const frac = clamp(b.nextWaveIn / total, 0, 1);
        ctx.save(); ctx.lineWidth = 5 * U; ctx.strokeStyle = '#ffd04a'; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(f.x, f.y, r * 1.08, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke(); ctx.restore();
      }
      if (!b.started && !hinted) {
        hinted = true;
        const bob = Math.sin(this.time * 5) * 6 * U;
        const msg = t('hud.callFirst'), tw = measure(ctx, msg, 18 * U, 900) / 2 + 10 * U;
        const tx = clamp(f.x, Screen.safe.l + tw, this.W - Screen.safe.r - tw);
        const below = f.y - r - 40 * U < 70 * U;
        text(ctx, msg, tx, (below ? f.y + r + 26 * U : f.y - r - 18 * U) + bob, { size: 18 * U, align: 'center', color: '#fff2c0', stroke: '#2a1606', weight: 900 });
      } else if (b.earlyBonus() > 0) {
        text(ctx, '+' + b.earlyBonus(), f.x, f.y + r + 14 * U, { size: 17 * U, align: 'center', color: '#ffe27a', stroke: '#2a1606', weight: 900 });
      }
      if (this.waveTip === f.pi) this.drawWaveTip(ctx, f);
    }
  }

  drawWaveTip(ctx, f) {
    const U = this.U, b = this.b;
    const comp = b.waveComposition().filter(c => {
      const w = b.waves[b.waveIdx];
      return w.groups.some(g => g.e === c.e && (g.path ?? 0) === f.pi);
    });
    const w = Math.max(200 * U, comp.length * 62 * U + 24 * U), h = 112 * U;
    let x = clamp(f.x - w / 2, 8, this.W - w - 8), y = f.y + f.r + 14 * U;
    if (y + h > this.H - 8) y = f.y - f.r - h - 14 * U;
    panel(ctx, 'dark', x, y, w, h);
    text(ctx, t('hud.nextWave', { n: b.waveIdx + 1 }), x + w / 2, y + 18 * U, { size: 16 * U, align: 'center', color: '#ffe9a8', weight: 800 });
    comp.forEach((c, i) => {
      const cx = x + 12 * U + 31 * U + i * 62 * U, cy = y + 60 * U;
      const fr = Assets.frame('portrait/e_' + c.e) || unitFrame('e_' + c.e, 'idle', 0);
      if (fr) drawFrameFit(ctx, fr, cx, cy, 46 * U); else drawIcon(ctx, 'skull', cx, cy, 34 * U);
      text(ctx, 'x' + c.n, cx, cy + 34 * U, { size: 15 * U, align: 'center', color: '#fff', stroke: '#000', weight: 800 });
    });
    text(ctx, b.started ? t('hud.tapAgainCall') : t('hud.tapToCall'), x + w / 2, y + h + 12 * U, { size: 13 * U, align: 'center', color: '#fff', stroke: '#000', weight: 700 });
  }

  drawMenu(ctx) {
    const g = this.menuGeom(); if (!g) return;
    const U = this.U, m = this.menu, b = this.b;
    m.t = (m.t || 0) + 1 / 60;
    const k = Math.min(1, m.t * 6);
    ctx.save();
    ctx.globalAlpha = 0.9 * k;
    ctx.strokeStyle = 'rgba(255,240,200,0.6)'; ctx.lineWidth = 3 * U;
    ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R * k, 0, TAU); ctx.stroke();
    ctx.restore();
    for (const bt of g.btns) {
      const op = bt.op;
      const x = g.cx + (bt.x - g.cx) * k, y = g.cy + (bt.y - g.cy) * k;
      const picked = m.pick === bt.i;
      const en = this.optEnabled(op);
      circleButton(ctx, x, y, bt.r * (picked ? 1.12 : 1), { color: picked ? 'gold' : op.kind === 'sell' ? 'dark' : 'dark', disabled: op.locked });
      if (op.locked) drawIcon(ctx, 'lock', x, y, bt.r * 1.0);
      else {
        const icon = op.kind === 'upgrade' && op.icon !== 'upgrade' ? op.icon : op.icon;
        drawIcon(ctx, icon, x, y, bt.r * 1.35, { gray: !en && op.kind !== 'sell' && op.kind !== 'rally' });
      }
      if (op.kind === 'skill') {
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x - 9 * U + i * 9 * U, y - bt.r - 4 * U, 3.6 * U, 0, TAU); ctx.fillStyle = i < op.rank ? '#ffd04a' : '#3a2a1a'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#1d130c'; ctx.stroke(); }
      }
      if (op.cost !== null && op.cost !== undefined && !(op.kind === 'skill' && op.rank >= 3) && !op.locked) {
        const label = op.kind === 'sell' ? '+' + (-op.cost) : String(op.cost);
        const ok = op.kind === 'sell' || op.cost <= b.gold;
        const tw = Math.max(40 * U, label.length * 11 * U + 16 * U);
        roundRect(ctx, x - tw / 2, y + bt.r - 2 * U, tw, 20 * U, 8 * U);
        ctx.fillStyle = 'rgba(20,12,6,0.88)'; ctx.fill();
        text(ctx, label, x, y + bt.r + 8 * U, { size: 15 * U, align: 'center', color: ok ? '#ffe27a' : '#ff6a5a', weight: 900 });
      }
      if (picked && !op.locked && op.kind !== 'rally' && op.kind !== 'sell' && en) {
        ctx.save(); ctx.globalAlpha = 0.9; drawIcon(ctx, 'check', x + bt.r * 0.75, y - bt.r * 0.7, bt.r * 0.8); ctx.restore();
      }
    }
    this.tipRect = null;
    if (m.pick !== null && m.pick !== undefined) this.drawTip(ctx, g, m.opts[m.pick]);
  }

  tipContent(op) {
    const b = this.b, m = this.menu;
    const lines = [];
    let title = '', desc = '';
    if (op.kind === 'build' || op.kind === 'upgrade') {
      const d = TOWERS[op.id];
      title = t(`tower.${op.id}.name`); desc = t(`tower.${op.id}.desc`);
      if (d.line === 'barracks') { const u = UNITS[d.unit]; lines.push(`${t('stat.soldiers')} 3  ·  ${t('stat.hp')} ${u.hp}  ·  ${t('stat.dmg')} ${u.dmg[0]}-${u.dmg[1]}  ·  ${t('stat.armor')} ${armorWord(u.armor)}`); }
      else lines.push(`${t('stat.dmg')} ${d.dmg[0]}-${d.dmg[1]}  ·  ${t('stat.rate')} ${rateWord(d.cd)}  ·  ${t('stat.range')} ${Math.round(d.range)}`);
      if (op.locked) lines.push(b.allowed && !b.lineAllowed(d.line) ? t('hud.ironLocked') : t('hud.lockedLevel'));
    } else if (op.kind === 'skill') {
      title = `${t(`skill.${op.id}.name`)} ${op.rank > 0 ? '(' + op.rank + '/3)' : ''}`; desc = t(`skill.${op.id}.desc`);
      if (op.rank >= 3) lines.push(t('hud.maxed'));
    } else if (op.kind === 'sell') { title = t('hud.sell'); desc = t('hud.sellDesc', { n: -op.cost }); }
    else if (op.kind === 'rally') { title = t('hud.rally'); desc = t('hud.rallyDesc'); }
    return { title, desc, lines };
  }

  drawTip(ctx, g, op) {
    const U = this.U;
    const c = this.tipContent(op);
    const w = Math.min(380 * U, this.W - 20);
    const fs = 15 * U;
    const descLines = wrap(ctx, c.desc, w - 24 * U, fs, 600);
    const h = 36 * U + descLines.length * fs * 1.35 + c.lines.length * fs * 1.35 + 14 * U;
    let x = clamp(g.cx - w / 2, 10, this.W - w - 10);
    let y = g.cy - g.R - g.r - h - 14 * U;
    if (y < 72 * U) y = g.cy + g.R + g.r + 26 * U;
    if (y + h > this.H - 6) y = this.H - h - 6;
    panel(ctx, 'dark', x, y, w, h);
    text(ctx, c.title, x + 12 * U, y + 18 * U, { size: 18 * U, color: '#ffd96a', weight: 900 });
    let yy = y + 36 * U;
    for (const ln of descLines) { text(ctx, ln, x + 12 * U, yy, { size: fs, color: '#f2e8d4', weight: 600, baseline: 'top' }); yy += fs * 1.35; }
    for (const ln of c.lines) { text(ctx, ln, x + 12 * U, yy, { size: fs * 0.95, color: '#a8e08a', weight: 700, baseline: 'top' }); yy += fs * 1.35; }
    this.tipRect = { x, y, w, h };
  }

  drawBoss(ctx) {
    const b = this.b, U = this.U;
    const boss = b.enemies.find(e => e.def.boss && !e.dead && !e.removed);
    if (!boss) return;
    const w = Math.min(520 * U, this.W * 0.42), h = 18 * U;
    const x = (this.W - w) / 2, y = 22 * U;
    text(ctx, t(`enemy.${boss.type}.name`), this.W / 2, y - 2 * U, { size: 17 * U, align: 'center', color: '#ffd0c0', stroke: '#2a0606', weight: 900 });
    bar(ctx, x, y + 10 * U, w, h, boss.hp / boss.maxHp, '#d8342a', '#2a0808', '#0e0503');
  }

  drawInfo(ctx) {
    const sel = this.s.renderer.sel;
    if (!sel || !sel.obj || this.menu) return;
    const U = this.U, r = this.infoRect, b = this.b;
    if (r.w < 200 * U) return;
    const o = sel.obj;
    let title = '', stats = [];
    let portrait = null;
    if (sel.kind === 'enemy') {
      if (o.dead) return;
      const d = o.def;
      title = t(`enemy.${o.type}.name`);
      portrait = Assets.frame('portrait/e_' + o.type) || unitFrame('e_' + o.type, 'idle', 0);
      stats = [`${t('stat.hp')} ${Math.ceil(o.hp)}/${o.maxHp}`, `${t('stat.armor')} ${armorWord(o.armor)}`, `${t('stat.mr')} ${armorWord(o.mr)}`, `${t('stat.speed')} ${speedWord(d.speed)}`, `${t('stat.lives')} ${d.lives}`];
    } else if (sel.kind === 'hero') {
      const h = o;
      title = `${t(`hero.${h.heroId}.name`)}  Lv.${h.level}`;
      portrait = Assets.frame('portrait/' + h.heroId);
      stats = [`${t('stat.hp')} ${Math.ceil(h.hp)}/${h.maxHp}`, `${t('stat.dmg')} ${Math.round((h.ranged || h).dmg[0])}-${Math.round((h.ranged || h).dmg[1])}`, `${t('stat.armor')} ${armorWord(h.armor)}`];
    } else return;
    panel(ctx, 'wood', r.x, r.y, r.w, r.h);
    const px = r.x + 40 * U, py = r.y + r.h / 2;
    if (portrait) drawFrameFit(ctx, portrait, px, py, 54 * U);
    text(ctx, title, r.x + 78 * U, r.y + 22 * U, { size: 18 * U, color: '#ffe9a8', stroke: '#2a1606', weight: 900, maxWidth: r.w - 90 * U });
    text(ctx, stats.join('   '), r.x + 78 * U, r.y + 50 * U, { size: 14 * U, color: '#fff6e0', stroke: '#2a1606', weight: 700, maxWidth: r.w - 90 * U });
  }

  drawBanners(ctx) {
    const U = this.U;
    let y = this.H * 0.3;
    for (const bn of this.banners) {
      const u = bn.t / bn.life;
      const a = u < 0.12 ? u / 0.12 : u > 0.8 ? (1 - u) / 0.2 : 1;
      const sc = u < 0.12 ? 0.7 + 0.3 * (u / 0.12) : 1;
      const size = (bn.big ? 46 : 34) * U * sc;
      text(ctx, bn.str, this.W / 2, y, { size, align: 'center', color: bn.color, stroke: '#2a1606', strokeWidth: size * 0.18, weight: 900, alpha: a, fam: 'display' });
      if (bn.sub) text(ctx, bn.sub, this.W / 2, y + size * 0.85, { size: 18 * U, align: 'center', color: '#fff6e0', stroke: '#2a1606', weight: 700, alpha: a });
      y += size * 1.6;
    }
  }
}
