// Rampart Riot — star upgrades: 6 trees x 5 tiers bought with campaign stars, details panel, buy and reset-all.
// Params: { back: scene name (default 'worldmap'), backParams: {} }
import { Screen } from '../core/screen.js';
import { Audio } from '../core/audio.js';
import { Save } from '../core/save.js';
import { Assets } from '../core/assets.js';
import { t } from '../core/i18n.js';
import { clamp, TAU, Ease } from '../core/util.js';
import { panel, text, roundRect } from '../render/draw.js';
import { drawIcon } from '../render/icons.js';
import { UPGRADES, UPGRADE_TREES, UPGRADE_COST } from '../data/upgrades.js';
import { Achievements } from '../meta/achievements.js';
import { gearButton } from '../ui/options.js';
import {
  MenuScene, Backdrop, ConfirmPopup, Toasts, btn, backBtn, ribbon, plaque, fz, fitText, para, textW, starIcon, glowDot, iconGray,
  ensureSlot, appear, COL, TOUCH,
} from '../ui/menukit.js';

const TREE_ICON = { archer: 'archer', barracks: 'barracks', mage: 'mage', artillery: 'artillery', skyfall: 'skyfall', militia: 'militia' };

export class UpgradesScene extends MenuScene {
  constructor(app) { super(app); this.bg = new Backdrop('hall'); this.sel = null; this.hover = null; this.fx = []; this.shownStars = null; }

  enter(p) {
    super.enter(p);
    ensureSlot();
    Audio.playMusic('worldmap', { fadeIn: 1 });
    Assets.loadAtlas('ui');
    const s = Save.slot;
    // preselect the first affordable upgrade, else archer tier 1
    const av = Save.availableStars();
    let pick = null;
    for (const tr of UPGRADE_TREES) { const lv = s.upgrades[tr] || 0; if (lv < 5 && UPGRADE_COST[lv] <= av) { pick = { tree: tr, tier: lv }; break; } }
    this.sel = pick || { tree: UPGRADE_TREES[0], tier: Math.min(4, s.upgrades.archer || 0) };
    this.shownStars = av;
    this.layout();
  }

  goBack() { this.app.go(this.params.back || 'worldmap', this.params.backParams || {}); }

  layout() {
    const U = this.U, W = Screen.gw, H = Screen.gh, sf = Screen.safe;
    this.ui.clear();
    this.back = this.ui.add(backBtn(() => this.goBack()));
    this.gear = this.ui.add(gearButton(this, W - sf.r - 14 * U - this.back.r, this.back.y, this.back.r));
    const top = this.back.y + this.back.r + 12 * U;
    this.titleY = this.back.y;
    const bottom = H - sf.b - Math.max(14 * U, 8);
    const left = sf.l + Math.max(20 * U, 10), right = W - sf.r - Math.max(20 * U, 10);
    const avW = right - left;
    const infoW = clamp(avW * 0.3, 250 * U, 360 * U);
    const gap = Math.max(16 * U, 8);
    const treeW = Math.min(avW - infoW - gap, 900 * U);
    const x0 = left + (avW - treeW - infoW - gap) / 2;
    this.treeRect = { x: x0, y: top, w: treeW, h: bottom - top };
    this.infoRect = { x: x0 + treeW + gap, y: top, w: infoW, h: bottom - top };
    // node grid
    const T = this.treeRect, cols = UPGRADE_TREES.length, cw = (T.w - 24 * U) / cols;
    const headH = Math.min(118 * U, T.h * 0.22);
    const rowH = (T.h - headH - 28 * U) / 5;
    this.nodeR = Math.max(13, Math.min(cw * 0.3, rowH * 0.36, 34 * U));
    this.cols = UPGRADE_TREES.map((tree, c) => {
      const cx = T.x + 12 * U + cw * (c + 0.5);
      return { tree, cx, headY: T.y + 18 * U + Math.min(30 * U, headH * 0.28), nodes: UPGRADES[tree].map((id, i) => ({ tree, tier: i, id, x: cx, y: T.y + headH + rowH * (i + 0.5) + 6 * U })) };
    });
    this.headR = Math.max(14, Math.min(cw * 0.26, headH * 0.26, 30 * U));
    this.cw = cw; this.headH = headH;
    // info panel buttons
    const I = this.infoRect, bh = Math.max(56 * U, 36);
    this.buyBtn = this.ui.add(btn(I.x + 20 * U, I.y + I.h - bh * 2 - 34 * U, I.w - 40 * U, bh, () => this.buyLabel(), () => this.buy(), {
      color: 'green', icon: () => (this.canBuy() ? 'star' : null), size: Math.min(bh * 0.4, fz(22, 12)), sound: false,
    }));
    this.buyBtn.onDisabledTap = () => this.buy(); // explains why (needs previous tier / more stars)
    const rh = Math.max(44 * U, 30);
    this.resetBtn = this.ui.add(btn(I.x + 20 * U, I.y + I.h - rh - 18 * U, I.w - 40 * U, rh, t('up.reset'), () => this.askReset(), { color: 'red', size: Math.min(rh * 0.4, fz(18, 10.5)) }));
    Toasts.top = top + 6 * U;
  }

  // ------------------------------------------------------------------ state
  level(tree) { return (Save.slot.upgrades[tree] || 0); }
  state(n) {
    const lv = this.level(n.tree);
    if (n.tier < lv) return 'owned';
    if (n.tier > lv) return 'locked';
    return UPGRADE_COST[n.tier] <= Save.availableStars() ? 'ready' : 'poor';
  }
  get focus() { return this.hover || this.sel; }
  canBuy() { const n = this.sel; return !!n && this.state(n) === 'ready'; }
  buyLabel() {
    const n = this.sel; if (!n) return t('up.buy');
    const st = this.state(n);
    if (st === 'owned') return t('up.owned');
    return `${t('up.buy')}  ${UPGRADE_COST[n.tier]}`;
  }

  buy() {
    const n = this.sel; if (!n) return;
    const st = this.state(n);
    if (st !== 'ready') {
      Audio.sfx('ui_error');
      this.flash = { t: 0, msg: st === 'owned' ? t('up.owned') : st === 'locked' ? t('up.needPrev') : t('up.needStars') };
      return;
    }
    const s = Save.slot;
    s.upgrades[n.tree] = n.tier + 1;
    s.starsSpent = (s.starsSpent || 0) + UPGRADE_COST[n.tier];
    Achievements.check(s, {}); Toasts.pullAchievements();
    Save.persist();
    Audio.sfx('ui_stars_spend');
    const node = this.nodeOf(n);
    this.fx.push({ x: node.x, y: node.y, t: 0 });
    // move the selection to the next tier of the same tree
    if (n.tier < 4) this.sel = { tree: n.tree, tier: n.tier + 1 };
  }
  askReset() {
    const s = Save.slot;
    const spent = UPGRADE_TREES.reduce((a, tr) => { let c = 0; for (let i = 0; i < (s.upgrades[tr] || 0); i++) c += UPGRADE_COST[i]; return a + c; }, 0);
    if (!spent) { Audio.sfx('ui_error'); this.flash = { t: 0, msg: t('up.resetNone') }; return; }
    this.openPopup(new ConfirmPopup(t('up.resetQ', { n: spent }), () => {
      for (const tr of UPGRADE_TREES) s.upgrades[tr] = 0;
      s.starsSpent = Math.max(0, (s.starsSpent || 0) - spent);
      Save.persist();
      Audio.sfx('coins');
      for (const c of this.cols) this.fx.push({ x: c.cx, y: c.nodes[2].y, t: 0, big: true });
      this.sel = { tree: UPGRADE_TREES[0], tier: 0 };
    }, { yesColor: 'red', noColor: 'gray' }));
  }
  nodeOf(n) { const c = this.cols.find(c => c.tree === n.tree); return c && c.nodes[n.tier]; }
  nodeAt(p) {
    const rr = Math.max(this.nodeR * 1.25, TOUCH / 2);
    let best = null, bd = rr * rr;
    for (const c of this.cols) for (const n of c.nodes) { const d = (p.x - n.x) ** 2 + (p.y - n.y) ** 2; if (d <= bd) { bd = d; best = n; } }
    return best;
  }

  // ------------------------------------------------------------------ input
  tapOut(p) {
    const n = this.nodeAt(p);
    if (!n) return;
    if (this.sel && this.sel.tree === n.tree && this.sel.tier === n.tier && this.state(n) === 'ready') { this.buy(); return; }
    this.sel = { tree: n.tree, tier: n.tier };
    Audio.sfx('ui_click');
  }
  hoverAt(p) { const n = this.nodeAt(p); this.hover = n ? { tree: n.tree, tier: n.tier } : null; return n ? 'pointer' : ''; }
  onDragStart(p) { super.onDragStart(p); this.hover = null; }

  update(dt) {
    super.update(dt);
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter(f => f.t < 0.9);
    if (this.flash) { this.flash.t += dt; if (this.flash.t > 2.2) this.flash = null; }
    const av = Save.availableStars();
    this.shownStars += (av - this.shownStars) * Math.min(1, dt * 8);
    if (Math.abs(av - this.shownStars) < 0.05) this.shownStars = av;
  }

  // ------------------------------------------------------------------ drawing
  drawScene(ctx, w, h) {
    const U = this.U;
    this.bg.draw(ctx, w, h, this.time);
    const a = appear(this.time, 0, 0.3);
    ctx.save(); ctx.globalAlpha = a;
    ribbon(ctx, w / 2, this.titleY, Math.min(380 * U, w * 0.4), Math.max(50 * U, 30), t('up.title'));
    // available stars (top-right)
    const ph = Math.max(50 * U, 32), label = String(Math.round(this.shownStars));
    const pw = ph * 1.05 + textW(label, ph * 0.52, 900) + ph * 0.5;
    plaque(ctx, this.gear.x - this.gear.r - 12 * U - pw, this.titleY - ph / 2, ph, 'star', label, { size: ph * 0.52, color: '#ffe27a', w: pw });
    ctx.restore();
    this.drawTrees(ctx);
    this.drawInfo(ctx);
    this.ui.draw(ctx);
    // purchase sparkles
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const f of this.fx) {
      const k = f.t / 0.9;
      for (let i = 0; i < 10; i++) {
        const an = i * TAU / 10 + f.t, d = (f.big ? 60 : 30) * U * Ease.outCubic(k) + this.nodeR;
        glowDot(ctx, f.x + Math.cos(an) * d, f.y + Math.sin(an) * d, 9 * U * (1 - k) + 2, '#ffd860', 1 - k);
      }
      glowDot(ctx, f.x, f.y, this.nodeR * 2.6 * (1 - k * 0.5), '#ffe8a0', (1 - k) * 0.8);
    }
    ctx.restore();
  }

  drawTrees(ctx) {
    const U = this.U, T = this.treeRect;
    const k0 = appear(this.time, 0.05, 0.35);
    ctx.save(); ctx.globalAlpha *= k0; ctx.translate(0, (1 - k0) * 30 * U);
    panel(ctx, 'parchment', T.x, T.y, T.w, T.h);
    const r = this.nodeR, fsName = fz(17, 10);
    this.cols.forEach((c, ci) => {
      const lv = this.level(c.tree);
      // column backdrop
      if (ci % 2 === 1) { ctx.fillStyle = 'rgba(120,80,30,0.06)'; ctx.fillRect(c.cx - this.cw / 2, T.y + 10 * U, this.cw, T.h - 20 * U); }
      // header
      const hr = this.headR;
      ctx.beginPath(); ctx.arc(c.cx, c.headY, hr, 0, TAU);
      ctx.fillStyle = '#3a2716'; ctx.fill(); ctx.lineWidth = Math.max(1.5, 3 * U); ctx.strokeStyle = lv >= 5 ? '#ffd24a' : '#a07838'; ctx.stroke();
      drawIcon(ctx, TREE_ICON[c.tree], c.cx, c.headY, hr * 1.55);
      fitText(ctx, t('up.tree.' + c.tree), c.cx, c.headY + hr + fsName * 0.95, this.cw - 8 * U, { size: fsName, align: 'center', color: COL.head, weight: 900 });
      // pips (progress)
      const py = c.headY + hr + fsName * 2.1, pg = Math.min(9 * U, this.cw / 7);
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(c.cx + (i - 2) * pg * 1.25, py, Math.max(2, pg * 0.38), 0, TAU); ctx.fillStyle = i < lv ? '#e8a82a' : 'rgba(80,50,20,0.25)'; ctx.fill(); }
      // connectors
      for (let i = 0; i < 4; i++) {
        const a = c.nodes[i], b = c.nodes[i + 1];
        ctx.lineWidth = Math.max(3, r * 0.26); ctx.lineCap = 'round';
        ctx.strokeStyle = i + 1 < lv ? '#d8a030' : 'rgba(70,45,20,0.35)';
        ctx.beginPath(); ctx.moveTo(a.x, a.y + r); ctx.lineTo(b.x, b.y - r); ctx.stroke();
      }
      for (const n of c.nodes) this.drawNode(ctx, n);
    });
    ctx.restore();
  }

  drawNode(ctx, n) {
    const U = this.U, r = this.nodeR, st = this.state(n);
    const sel = this.sel && this.sel.tree === n.tree && this.sel.tier === n.tier;
    const hov = this.hover && this.hover.tree === n.tree && this.hover.tier === n.tier;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 4 + n.tier);
    const pop = this.fx.find(f => Math.abs(f.x - n.x) < 1 && Math.abs(f.y - n.y) < 1);
    const sc = (pop ? 1 + 0.25 * Math.sin(Math.min(1, pop.t / 0.35) * Math.PI) : 1) * (hov ? 1.06 : 1);
    ctx.save(); ctx.translate(n.x, n.y); ctx.scale(sc, sc);
    if (st === 'ready') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDot(ctx, 0, 0, r * 1.9, '#9cff6a', 0.25 + 0.25 * pulse); ctx.restore(); }
    if (sel) { ctx.beginPath(); ctx.arc(0, 0, r * 1.28, 0, TAU); ctx.lineWidth = Math.max(2, 4 * U); ctx.strokeStyle = `rgba(255,236,170,${0.6 + 0.4 * pulse})`; ctx.stroke(); }
    // medallion
    ctx.beginPath(); ctx.arc(0, r * 0.07, r, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    if (st === 'owned') { g.addColorStop(0, '#ffeaa0'); g.addColorStop(0.6, '#d9961f'); g.addColorStop(1, '#6a4008'); }
    else if (st === 'locked') { g.addColorStop(0, '#6a5a4a'); g.addColorStop(1, '#2a2018'); }
    else { g.addColorStop(0, '#7a5a3a'); g.addColorStop(1, '#2e1e10'); }
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.strokeStyle = st === 'owned' ? '#fff0b0' : st === 'ready' ? '#8fe05a' : st === 'poor' ? '#c89a5a' : '#5a4a3a'; ctx.stroke();
    if (st === 'locked') iconGray(ctx, 'up_' + n.id, 0, 0, r * 1.25, 0.6);
    else drawIcon(ctx, 'up_' + n.id, 0, 0, r * 1.3);
    ctx.restore();
    // cost tag
    if (st !== 'owned') {
      const cost = UPGRADE_COST[n.tier], fs = Math.max(9.5, r * 0.5);
      const tx = n.x + r * 0.95, ty = n.y + r * 0.72;
      roundRect(ctx, tx - fs * 0.95, ty - fs * 0.62, fs * 2.05, fs * 1.24, fs * 0.6);
      ctx.fillStyle = 'rgba(30,18,8,0.88)'; ctx.fill();
      starIcon(ctx, tx - fs * 0.38, ty, fs * 0.5, true);
      text(ctx, String(cost), tx + fs * 0.42, ty + 1, { size: fs * 0.95, align: 'center', color: st === 'poor' || (st === 'locked' && cost > Save.availableStars()) ? '#ff8a6a' : '#ffe9a8', weight: 900 });
    } else {
      drawIcon(ctx, 'check', n.x + r * 0.78, n.y + r * 0.72, r * 0.75);
    }
  }

  drawInfo(ctx) {
    const U = this.U, I = this.infoRect, n = this.focus;
    const k0 = appear(this.time, 0.12, 0.35);
    ctx.save(); ctx.globalAlpha *= k0; ctx.translate((1 - k0) * 40 * U, 0);
    panel(ctx, 'wood', I.x, I.y, I.w, I.h);
    const pad = 22 * U, x = I.x + pad, w = I.w - pad * 2;
    let y = I.y + pad;
    if (!n) {
      para(ctx, t('up.hint'), x, y + 20 * U, w, { size: fz(19, 11), color: '#fff2d6', weight: 700, align: 'left' });
      ctx.restore(); return;
    }
    const st = this.state(n), id = UPGRADES[n.tree][n.tier];
    const ir = Math.max(18, Math.min(46 * U, I.w * 0.16));
    // icon medallion + titles
    ctx.beginPath(); ctx.arc(x + ir, y + ir, ir, 0, TAU);
    ctx.fillStyle = st === 'owned' ? '#d9961f' : '#3a2716'; ctx.fill(); ctx.lineWidth = Math.max(2, 3 * U); ctx.strokeStyle = '#e8c060'; ctx.stroke();
    drawIcon(ctx, 'up_' + id, x + ir, y + ir, ir * 1.35);
    const tx = x + ir * 2 + 14 * U, tw = I.x + I.w - pad - tx;
    fitText(ctx, `${t('up.tree.' + n.tree)} · ${t('up.tier', { n: n.tier + 1 })}`, tx, y + ir * 0.55, tw, { size: fz(16, 10), color: '#e8c070', weight: 800 });
    fitText(ctx, t(`up.${n.tree}.${id}.name`), tx, y + ir * 1.3, tw, { size: fz(25, 13), color: '#fff2d6', stroke: '#1a0e06', weight: 900, fam: 'display' });
    y += ir * 2 + 18 * U;
    ctx.fillStyle = 'rgba(255,220,160,0.2)'; ctx.fillRect(x, y, w, Math.max(1, 1.5 * U)); y += 14 * U;
    const fs = fz(19, 11);
    const maxY = this.buyBtn.y - 14 * U;
    const avail = Math.max(1, Math.floor((maxY - y - fs * 2.4) / (fs * 1.4)));
    y += para(ctx, t(`up.${n.tree}.${id}.desc`), x, y, w, { size: fs, color: '#fff2d6', weight: 600, max: avail, lh: fs * 1.4 });
    y += 10 * U;
    // overview of the whole tree when there is room
    const ofs = fz(16, 9.5), orh = Math.max(ofs * 1.8, 16);
    const oy0 = maxY - orh * 5 - 8 * U;
    if (oy0 > y + fz(17, 10) * 1.6) {
      const lv = this.level(n.tree);
      UPGRADES[n.tree].forEach((uid, i) => {
        const ry = oy0 + i * orh, cy = ry + orh / 2, cur = i === n.tier;
        if (cur) { roundRect(ctx, x - 6 * U, ry + 1, w + 12 * U, orh - 2, orh * 0.3); ctx.fillStyle = 'rgba(255,220,150,0.13)'; ctx.fill(); }
        if (i < lv) drawIcon(ctx, 'up_' + uid, x + orh * 0.42, cy, orh * 0.78); else iconGray(ctx, 'up_' + uid, x + orh * 0.42, cy, orh * 0.78, 0.7);
        fitText(ctx, t(`up.${n.tree}.${uid}.name`), x + orh * 1.05, cy + 1, w - orh * 2.3, { size: ofs, color: i < lv ? '#ffe9a8' : cur ? '#fff2d6' : '#c8b090', weight: cur ? 900 : 700 });
        if (i < lv) drawIcon(ctx, 'check', x + w - orh * 0.4, cy, orh * 0.7);
        else { starIcon(ctx, x + w - orh * 0.95, cy, ofs * 0.5, true); text(ctx, String(UPGRADE_COST[i]), x + w - orh * 0.25, cy + 1, { size: ofs, align: 'center', color: '#ffe9a8', weight: 900 }); }
      });
    }
    // status line
    const sfs = fz(17, 10);
    if (this.flash) { ctx.save(); ctx.globalAlpha = Math.min(1, (2.2 - this.flash.t) * 3); fitText(ctx, this.flash.msg, x, y + sfs * 0.6, w, { size: sfs, color: '#ff9a7a', weight: 800 }); ctx.restore(); }
    else if (st === 'owned') fitText(ctx, t('up.owned'), x, y + sfs * 0.6, w, { size: sfs, color: '#a8e08a', weight: 800 });
    else if (st === 'locked') fitText(ctx, t('up.needPrev'), x, y + sfs * 0.6, w, { size: sfs, color: '#e8b08a', weight: 800 });
    else if (st === 'poor') fitText(ctx, t('up.needStars'), x, y + sfs * 0.6, w, { size: sfs, color: '#ff9a7a', weight: 800 });
    ctx.restore();
    // button enabled state follows the selected node
    this.buyBtn.enabled = this.canBuy();
    this.buyBtn.color = this.state(this.sel || n) === 'owned' ? 'gray' : 'green';
  }
}
