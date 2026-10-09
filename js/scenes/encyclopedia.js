// Rampart Riot — encyclopedia: Towers (all 20, stats, specialist skills, upgrade path) and Enemies (bestiary with
// unseen entries as silhouettes, animated sprite, description, stats, traits, tip). Scrollable grid + detail panel.
// Params: { tab: 'towers'|'enemies', id: entry to show, back: scene (default 'worldmap'), backParams: {} }
import { Screen } from '../core/screen.js';
import { Audio } from '../core/audio.js';
import { Save } from '../core/save.js';
import { Assets, drawFrame } from '../core/assets.js';
import { t, has } from '../core/i18n.js';
import { clamp, TAU, Ease } from '../core/util.js';
import { panel, text, roundRect } from '../render/draw.js';
import { drawIcon } from '../render/icons.js';
import { ENEMIES, BESTIARY } from '../data/enemies.js';
import { TOWERS, SKILLS, UNITS, LINES } from '../data/towers.js';
import { STAGES } from '../data/levels/index.js';
import { TOWER_TOP } from '../game/tower.js';
import { unitFrame } from '../game/renderer.js';
import { armorWord, speedWord, rateWord } from '../game/hud.js';
import { gearButton } from '../ui/options.js';
import {
  MenuScene, Backdrop, ScrollView, btn, backBtn, titleRibbon, segmented, fz, fitText, lines, textW, drawSpriteFit, spriteBox, silhouette,
  glowDot, iconGray, ensureSlot, loadAtlasSafe, appear, roman, COL, TOUCH,
} from '../ui/menukit.js';

const R = Math.round;
const TOWER_IDS = LINES.flatMap(l => [`${l}1`, `${l}2`, `${l}3`, `${l}A`, `${l}B`]).filter(id => TOWERS[id]);
const ENEMY_ATLASES = ['enemies1', 'enemies2', 'enemies3', 'enemies4'];

function enemyTraits(d) {
  const out = [], nm = k => t(`enemy.${k}.name`);
  if (d.flying) out.push(t('enc.ab.flying'));
  if (d.ranged) out.push(t('enc.ab.ranged'));
  if (d.heal) out.push(t('enc.ab.heal'));
  if (d.regen) out.push(t('enc.ab.regen'));
  if (d.dodge) out.push(t('enc.ab.dodge', { n: R(d.dodge * 100) }));
  if (d.stomp) out.push(t('enc.ab.stomp'));
  if (d.summon) out.push(t('enc.ab.summon', { unit: nm(d.summon.unit), n: d.summon.count }));
  if (d.freeze) out.push(t('enc.ab.freeze', { n: d.freeze.dur }));
  if (d.burrow) out.push(t('enc.ab.burrow'));
  if (d.onDeath && d.onDeath.spawn) out.push(t('enc.ab.spawn', { unit: nm(d.onDeath.spawn), n: d.onDeath.count || 1 }));
  if (d.onDeath && d.onDeath.cloud) out.push(t('enc.ab.cloud'));
  if (d.onDeath && d.onDeath.explode) out.push(t('enc.ab.explode'));
  if (d.revive) out.push(t('enc.ab.revive'));
  if (d.devour) out.push(t('enc.ab.devour'));
  if (d.blink) out.push(t('enc.ab.blink'));
  if (d.curse) out.push(t('enc.ab.curse', { n: d.curse.towers }));
  if (d.shield) out.push(t('enc.ab.shield'));
  if (d.blinkOnHit) out.push(t('enc.ab.blinkOnHit'));
  if (d.breath) out.push(t('enc.ab.breath'));
  if (d.splashMelee) out.push(t('enc.ab.splash'));
  if (d.phases) out.push(t('enc.ab.phases'));
  if (d.undead) out.push(t('enc.ab.undead'));
  if ((d.lives || 1) > 1) out.push(t('enc.ab.lives', { n: d.lives }));
  return out;
}

export class EncyclopediaScene extends MenuScene {
  constructor(app) {
    super(app);
    this.bg = new Backdrop('hall');
    this.grid = new ScrollView(); this.detail = new ScrollView();
    this.scrolls = [this.grid, this.detail];
    this.tab = 'enemies'; this.sel = { towers: TOWER_IDS[0], enemies: BESTIARY[0] };
    this.animT0 = 0;
  }

  enter(p) {
    super.enter(p);
    ensureSlot();
    Audio.playMusic('worldmap', { fadeIn: 1 });
    this.tab = p.tab === 'towers' ? 'towers' : 'enemies';
    if (p.id && TOWERS[p.id]) { this.tab = 'towers'; this.sel.towers = p.id; }
    else if (p.id && ENEMIES[p.id]) { this.tab = 'enemies'; this.sel.enemies = p.id; }
    else { const first = BESTIARY.find(id => this.seen(id)); if (first) this.sel.enemies = first; }
    const extra = new Set();
    for (const s of STAGES) { if (s.bossAtlas) extra.add(s.bossAtlas); for (const a of s.extraAtlases || []) extra.add(a); }
    const jobs = [Assets.loadAtlas('ui'), Assets.loadAtlas('towers'), Assets.loadAtlas('units'), ...ENEMY_ATLASES.map(loadAtlasSafe), ...[...extra].filter(a => !ENEMY_ATLASES.includes(a)).map(loadAtlasSafe)];
    for (const j of jobs) Promise.resolve(j).then(() => { this.dirty = true; }).catch(() => {});
    this.markViewed();
    this.layout();
    const tl = this.tiles.find(x => x.id === this.cur);
    if (tl && tl.y + tl.s > this.grid.h) this.grid.scrollTo(tl.y - this.grid.h / 3, true);
  }
  goBack() { this.app.go(this.params.back || 'worldmap', this.params.backParams || {}); }

  // ------------------------------------------------------------------ data helpers
  seen(id) {
    const s = Save.slot, d = ENEMIES[id];
    if (s.seenEnemies[id]) return true;
    if (d && d.minor) return BESTIARY.some(k => s.seenEnemies[k] && ENEMIES[k].onDeath && ENEMIES[k].onDeath.spawn === id);
    return false;
  }
  markViewed() {
    if (this.tab !== 'enemies') return;
    const id = this.sel.enemies, s = Save.slot;
    if (!this.seen(id)) return;
    s.encViewed = s.encViewed || {};
    if (!s.encViewed[id]) { s.encViewed[id] = true; Save.persist(); }
  }
  get list() { return this.tab === 'towers' ? TOWER_IDS : BESTIARY; }
  get cur() { return this.sel[this.tab]; }

  // ------------------------------------------------------------------ layout
  layout() {
    const U = this.U, W = Screen.gw, H = Screen.gh, sf = Screen.safe;
    this.ui.clear();
    this.back = this.ui.add(backBtn(() => this.goBack()));
    this.gear = this.ui.add(gearButton(this, W - sf.r - 14 * U - this.back.r, this.back.y, this.back.r));
    this.titleY = this.back.y;
    // tabs (top right, left of the settings button)
    const th = Math.max(46 * U, 32), tw = Math.min(150 * U, (W - sf.r - 20 * U) * 0.14) + 36 * U;
    const tx = this.gear.x - this.gear.r - 12 * U - tw * 2 - 6 * U;
    for (const it of segmented(tx, this.titleY - th / 2, tw * 2 + 6 * U, th, [
      { label: t('enc.towers'), value: 'towers', icon: 'archer' }, { label: t('enc.enemies'), value: 'enemies', icon: 'skull' },
    ], { get: () => this.tab, set: v => this.setTab(v), size: Math.min(th * 0.4, fz(19, 11)) })) this.ui.add(it);
    this.tabsX = tx;
    const top = this.back.y + this.back.r + 12 * U, bottom = H - sf.b - Math.max(14 * U, 8);
    const left = sf.l + Math.max(20 * U, 10), right = W - sf.r - Math.max(20 * U, 10);
    const gap = Math.max(14 * U, 8), avW = Math.min(right - left, 1320 * U), x0 = left + (right - left - avW) / 2;
    const detW = clamp(avW * 0.44, 330 * U, 560 * U);
    this.gridR = { x: x0, y: top, w: avW - detW - gap, h: bottom - top };
    this.detR = { x: x0 + avW - detW, y: top, w: detW, h: bottom - top };
    const G = this.gridR, pad = Math.max(14 * U, 8);
    this.grid.set(G.x + pad * 0.6, G.y + pad * 0.6, G.w - pad * 1.2, G.h - pad * 1.2);
    // showcase box on top of the detail panel, scrolling text below
    const D = this.detR;
    this.show = { x: D.x + pad, y: D.y + pad, w: D.w - pad * 2, h: clamp(D.h * 0.34, 120 * U, 230 * U) };
    this.detail.set(D.x + pad * 0.6, this.show.y + this.show.h + 8 * U, D.w - pad * 1.2, D.y + D.h - pad * 0.6 - (this.show.y + this.show.h + 8 * U));
    this.buildGrid();
    this.buildDetail();
  }
  setTab(v) {
    if (this.tab === v) return;
    this.tab = v; this.grid.scrollTo(0, true); this.detail.scrollTo(0, true);
    this.animT0 = this.time; this.switchT = this.time;
    this.markViewed();
    this.buildGrid(); this.buildDetail();
    this.revealSel();
  }

  // grid: section headers + tiles (content coordinates)
  buildGrid() {
    const U = this.U, gw = this.grid.w, gap = Math.max(8 * U, 5);
    let cols = Math.max(3, Math.min(7, Math.floor((gw + gap) / Math.max(96 * U, 58))));
    if (this.tab === 'towers' && (gw - gap * 4) / 5 >= 56) cols = 5; // one row per tower line
    const ts = (gw - 10 * U - gap * (cols - 1)) / cols;
    const groups = [];
    if (this.tab === 'towers') for (const l of LINES) groups.push({ label: t('enc.line.' + l), icon: l, ids: TOWER_IDS.filter(id => TOWERS[id].line === l) });
    else for (let c = 1; c <= 4; c++) groups.push({ label: `${roman(c)} · ${t('wm.region' + c)}`, ids: BESTIARY.filter(id => ENEMIES[id].ch === c) });
    const hh = fz(22, 13) * 1.7;
    let y = 4 * U;
    this.heads = []; this.tiles = [];
    for (const g of groups) {
      this.heads.push({ y, h: hh, label: g.label, icon: g.icon, ids: g.ids });
      y += hh;
      g.ids.forEach((id, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        this.tiles.push({ id, x: 5 * U + c * (ts + gap), y: y + r * (ts + gap), s: ts });
      });
      y += Math.ceil(g.ids.length / cols) * (ts + gap) + 8 * U;
    }
    this.grid.setContent(y);
  }
  revealSel() { const tl = this.tiles.find(x => x.id === this.cur); if (tl) this.grid.reveal(tl.y, tl.y + tl.s, 20 * this.U); }

  // ------------------------------------------------------------------ input
  tapIn(view, cp) {
    if (view === this.detail) { // upgrade-path thumbnails
      const hit = (this.pathHits || []).find(q => cp.x >= q.x && cp.x <= q.x + q.s && cp.y >= q.y && cp.y <= q.y + q.s);
      if (hit && hit.id !== this.cur) { this.pick(hit.id); this.revealSel(); }
      return;
    }
    const tl = this.tiles.find(x => cp.x >= x.x && cp.x <= x.x + x.s && cp.y >= x.y && cp.y <= x.y + x.s);
    if (!tl || tl.id === this.cur) return;
    this.pick(tl.id);
  }
  pick(id) {
    this.sel[this.tab] = id;
    Audio.sfx(this.tab === 'enemies' && !this.seen(id) ? 'ui_error' : 'ui_click', { vol: 0.8 });
    this.animT0 = this.time; this.switchT = this.time;
    this.detail.scrollTo(0, true);
    this.markViewed();
    this.buildDetail();
  }
  hoverAt(p) {
    if (!this.grid.contains(p)) return '';
    const cp = this.grid.toContent(p);
    return this.tiles.some(x => cp.x >= x.x && cp.x <= x.x + x.s && cp.y >= x.y && cp.y <= x.y + x.s) ? 'pointer' : '';
  }
  key(k) {
    const L = this.list, i = L.indexOf(this.cur);
    if (k === 'ArrowRight' || k === 'ArrowDown') this.pick(L[(i + 1) % L.length]);
    else if (k === 'ArrowLeft' || k === 'ArrowUp') this.pick(L[(i + L.length - 1) % L.length]);
    else if (k === 'Tab') this.setTab(this.tab === 'towers' ? 'enemies' : 'towers');
    else return;
    this.revealSel();
  }

  update(dt) {
    super.update(dt);
    if (this.dirty) { this.dirty = false; this.buildDetail(); }
  }

  // ------------------------------------------------------------------ detail content
  buildDetail() {
    if (!this.detR) return;
    const U = this.U, w = this.detail.w - 34 * U, id = this.cur;
    const items = []; let y = 4 * U;
    const add = (h, draw) => { items.push({ y, h, draw }); y += h; };
    const F = { name: fz(30, 15), tag: fz(16, 10), body: fz(17, 10.5), small: fz(15, 9.5), head: fz(19, 11) };
    const head = (label) => add(F.head * 1.7, (ctx, x, yy) => {
      const cy = yy + F.head * 0.95;
      text(ctx, label, x, cy, { size: F.head, color: '#8a3a10', weight: 900 });
      const lw = textW(label, F.head, 900) + 12 * U;
      ctx.fillStyle = 'rgba(138,58,16,0.3)'; ctx.fillRect(x + lw, cy, w - lw, Math.max(1, 1.5 * U));
    });
    const para = (s, size, color, weight = 600, indent = 0) => {
      const ls = lines(s, w - indent, size, weight);
      add(ls.length * size * 1.4 + 4 * U, (ctx, x, yy) => ls.forEach((ln, i) => text(ctx, ln, x + indent, yy + i * size * 1.4, { size, color, weight, baseline: 'top' })));
    };
    const grid = (rows) => { // [label, value] pairs in 2 columns
      const cols = w > 300 * U ? 2 : 1, rh = F.body * 1.7, n = Math.ceil(rows.length / cols), cw = (w - (cols - 1) * 14 * U) / cols;
      add(n * rh + 6 * U, (ctx, x, yy) => rows.forEach(([k, v], i) => {
        const cx = x + (i % cols) * (cw + 14 * U), cy = yy + Math.floor(i / cols) * rh + rh / 2;
        if (Math.floor(i / cols) % 2 === 0) { ctx.fillStyle = 'rgba(120,80,30,0.08)'; ctx.fillRect(cx - 4 * U, cy - rh / 2, cw + 8 * U, rh); }
        fitText(ctx, k, cx, cy, cw * 0.52, { size: F.body, color: COL.soft, weight: 700 });
        fitText(ctx, v, cx + cw, cy, cw * 0.46, { size: F.body, align: 'right', color: COL.ink, weight: 900 });
      }));
    };
    const bullets = (list, color = COL.ink) => list.forEach(s => {
      const ls = lines(s, w - 22 * U, F.body, 600);
      add(ls.length * F.body * 1.38 + 6 * U, (ctx, x, yy) => {
        ctx.beginPath(); ctx.arc(x + 6 * U, yy + F.body * 0.68, Math.max(2, 3.2 * U), 0, TAU); ctx.fillStyle = '#a8621e'; ctx.fill();
        ls.forEach((ln, i) => text(ctx, ln, x + 20 * U, yy + i * F.body * 1.38, { size: F.body, color, weight: 600, baseline: 'top' }));
      });
    });
    if (this.tab === 'enemies') {
      const d = ENEMIES[id], seen = this.seen(id);
      add(F.name * 1.25, (ctx, x, yy) => fitText(ctx, seen ? t(`enemy.${id}.name`) : t('enc.unknown'), x, yy + F.name * 0.62, w, { size: F.name, color: COL.head, weight: 900, fam: 'display' }));
      const tags = [`${roman(d.ch)} · ${t('wm.region' + d.ch)}`]; if (d.boss) tags.push(t('enc.boss')); if (d.flying) tags.push(t('enc.flying'));
      add(F.tag * 1.6, (ctx, x, yy) => text(ctx, tags.join('  ·  '), x, yy + F.tag * 0.7, { size: F.tag, color: d.boss ? '#a8321e' : COL.soft, weight: 800, maxWidth: w }));
      if (!seen) { para(t('enc.unseen'), F.body, COL.soft, 600); }
      else {
        para(t(`enemy.${id}.desc`), F.body, COL.ink, 600);
        head(t('heroes.stats'));
        grid([[t('stat.hp'), String(d.hp)], [t('stat.armor'), armorWord(d.armor)], [t('stat.mr'), armorWord(d.mr)], [t('stat.speed'), speedWord(d.speed)], [t('stat.lives'), String(d.lives || 1)], [t('enc.bounty'), String(d.gold)]]);
        const tr = enemyTraits(d);
        if (tr.length) { head(t('enc.traits')); bullets(tr); }
        // the tip, unless it only repeats one of the traits (e.g. "costs 2 lives")
        const tipKey = `enemy.${id}.tip`, tip = has(tipKey) ? t(tipKey) : '', norm = v => v.replace(/[\s.!。]/g, '').toLowerCase();
        if (tip && !tr.some(x => norm(x).includes(norm(tip)) || norm(tip).includes(norm(x)))) { head(t('enc.tip')); para(tip, F.body, COL.good, 800); }
      }
    } else {
      const d = TOWERS[id], spec = d.level === 4;
      add(F.name * 1.25, (ctx, x, yy) => fitText(ctx, t(`tower.${id}.name`), x, yy + F.name * 0.62, w, { size: F.name, color: COL.head, weight: 900, fam: 'display' }));
      add(F.tag * 1.6, (ctx, x, yy) => text(ctx, `${t('enc.line.' + d.line)}  ·  ${spec ? t('enc.spec') : t('enc.tier', { n: d.level })}`, x, yy + F.tag * 0.7, { size: F.tag, color: COL.soft, weight: 800, maxWidth: w }));
      para(t(`tower.${id}.desc`), F.body, COL.ink, 600);
      head(t('heroes.stats'));
      const rows = [[t('enc.cost'), `${d.cost}`]];
      if (d.line === 'barracks') {
        const u = UNITS[d.unit];
        rows.push([t('stat.soldiers'), String(d.soldiers)], [t('stat.hp'), String(u.hp)], [t('stat.dmg'), `${u.dmg[0]}–${u.dmg[1]}`], [t('stat.armor'), armorWord(u.armor)], [t('stat.range'), String(d.range)]);
      } else {
        rows.push([t('stat.dmg'), `${d.dmg[0]}–${d.dmg[1]}`], [t('stat.rate'), rateWord(d.cd)], [t('stat.range'), String(d.range)], [t('enc.dtype'), t(d.dtype === 'magic' ? 'enc.magic' : 'enc.phys')], [t('enc.air'), d.air ? t('enc.yes') : t('enc.no')]);
        if (d.splash) rows.push([t('enc.splash'), String(d.splash)]);
      }
      if (d.armorPierce) rows.push([t('enc.pierce', { n: R(d.armorPierce * 100) }), '✓']);
      if (d.slow) rows.push([t('enc.slow', { n: R(d.slow * 100) }), '✓']);
      if (d.shred) rows.push([t('enc.shred', { n: R(d.shred * 100) }), '✓']);
      if (d.chain) rows.push([t('enc.chain'), '✓']);
      grid(rows);
      if (d.skills) {
        head(t('enc.skills'));
        for (const sk of d.skills) {
          const S = SKILLS[sk], ir = Math.max(14, 22 * U);
          const dl = lines(t(`skill.${sk}.desc`), w - ir * 2 - 14 * U, F.body, 600);
          const costs = `${t('enc.rankCost')}: ${S.cost.join(' / ')}`;
          add(F.body * 1.5 + dl.length * F.body * 1.36 + F.small * 1.5 + 12 * U, (ctx, x, yy) => {
            const cx = x + ir, cy = yy + ir + 2 * U;
            ctx.beginPath(); ctx.arc(cx, cy, ir, 0, TAU); ctx.fillStyle = '#3a2716'; ctx.fill(); ctx.lineWidth = Math.max(1.5, 2.5 * U); ctx.strokeStyle = '#d8b052'; ctx.stroke();
            drawIcon(ctx, 'sk_' + sk, cx, cy, ir * 1.4);
            const tx = x + ir * 2 + 14 * U;
            text(ctx, t(`skill.${sk}.name`), tx, yy + F.body * 0.72, { size: F.body * 1.06, color: COL.head, weight: 900, maxWidth: w - (tx - x) });
            let ly = yy + F.body * 1.5;
            dl.forEach(ln => { text(ctx, ln, tx, ly, { size: F.body, color: COL.ink, weight: 600, baseline: 'top' }); ly += F.body * 1.36; });
            text(ctx, costs, tx, ly + 2 * U, { size: F.small, color: '#7a4a10', weight: 800, baseline: 'top', maxWidth: w - (tx - x) });
          });
        }
      }
      // upgrade path
      head(t('enc.path'));
      const path = TOWER_IDS.filter(k => TOWERS[k].line === d.line);
      const ps = Math.min(52 * U, (w - 4 * 18 * U) / 5);
      add(ps + 12 * U, (ctx, x, yy) => {
        this.pathHits = [];
        path.forEach((k, i) => {
          const px = x + ps / 2 + i * (ps + 18 * U), py = yy + ps / 2 + 4 * U, curr = k === id;
          if (i > 0 && i < 4) { ctx.fillStyle = 'rgba(110,70,25,0.5)'; ctx.beginPath(); const ax = px - ps / 2 - 15 * U; ctx.moveTo(ax, py - 5 * U); ctx.lineTo(ax + 10 * U, py); ctx.lineTo(ax, py + 5 * U); ctx.fill(); }
          if (i === 4) { text(ctx, '/', px - ps / 2 - 9 * U, py, { size: F.body, align: 'center', color: COL.soft, weight: 900 }); }
          roundRect(ctx, px - ps / 2, py - ps / 2, ps, ps, 8 * U); ctx.fillStyle = curr ? 'rgba(232,170,60,0.45)' : 'rgba(80,50,20,0.15)'; ctx.fill();
          ctx.lineWidth = Math.max(1, 2 * U); ctx.strokeStyle = curr ? '#b8761a' : 'rgba(110,70,25,0.35)'; ctx.stroke();
          this.drawTowerSprite(ctx, k, px, py, ps * 0.9, ps * 0.9, false);
          this.pathHits.push({ id: k, x: px - ps / 2, y: py - ps / 2, s: ps });
        });
      });
    }
    this.detItems = items;
    this.detail.setContent(y + 10 * U);
  }

  // ------------------------------------------------------------------ drawing helpers
  drawTowerSprite(ctx, id, cx, cy, bw, bh, animate) {
    const d = TOWERS[id], base = 't_' + id;
    const anim = d.line === 'mage' || d.line === 'artillery';
    const box = spriteBox(base, anim ? 'idle' : null) || spriteBox(base, 'idle');
    const f = anim ? unitFrame(base, 'idle', animate ? this.time : 0) : (Assets.frame(base) || unitFrame(base, 'idle', 0));
    if (!f || !box) { drawIcon(ctx, d.level === 4 ? id : d.line, cx, cy, Math.min(bw, bh)); return; }
    const sc = Math.min(bw / box.w, bh / box.h);
    const ax = cx - (box.l + box.w / 2) * sc, ay = cy - (box.t + box.h / 2) * sc;
    drawFrame(ctx, f, ax, ay, false, sc);
    const top = TOWER_TOP[id] || 40;
    if (d.line === 'archer') {
      if (d.spec === 'arbalest') { const fu = unitFrame('u_arbalest', 'idle', animate ? this.time : 0); if (fu) drawFrame(ctx, fu, ax, ay - (top - 6) * sc, false, sc); }
      else for (let i = 0; i < 2; i++) { const fu = unitFrame(d.spec === 'gale' ? 'u_gale' : 'u_archer', 'idle', animate ? this.time + i * 0.4 : 0); if (fu) drawFrame(ctx, fu, ax + (i ? 13 : -13) * sc, ay - (top - 8) * sc, false, sc); }
    }
    const ff = Assets.frame(base + '_front');
    if (ff) drawFrame(ctx, ff, ax, ay, false, sc);
    return { sc, ax, ay };
  }

  drawScene(ctx, w, h) {
    const U = this.U;
    this.bg.draw(ctx, w, h, this.time);
    ctx.save(); ctx.globalAlpha = appear(this.time, 0, 0.3);
    titleRibbon(ctx, t('enc.title'), this.titleY, Math.max(50 * U, 30), this.back.x + this.back.r + 12 * U, this.tabsX - 12 * U, Math.min(380 * U, w * 0.4));
    ctx.restore();
    this.drawGrid(ctx);
    this.drawDetail(ctx);
    this.ui.draw(ctx);
  }

  drawGrid(ctx) {
    const U = this.U, G = this.gridR, sv = this.grid, k = appear(this.time, 0.04, 0.35);
    ctx.save(); ctx.globalAlpha *= k; ctx.translate(-(1 - k) * 30 * U, 0);
    panel(ctx, 'woodDark', G.x, G.y, G.w, G.h);
    sv.begin(ctx);
    const fsH = fz(19, 11);
    for (const hd of this.heads) {
      if (hd.y + hd.h < sv.pos || hd.y > sv.pos + sv.h) continue;
      const cy = hd.y + hd.h * 0.55;
      let x = 6 * U;
      if (hd.icon) { drawIcon(ctx, hd.icon, x + fsH * 0.7, cy, fsH * 1.6); x += fsH * 1.7; }
      text(ctx, hd.label, x, cy, { size: fsH, color: '#ffe9a8', stroke: '#1a0e06', weight: 900 });
      if (this.tab === 'enemies') {
        const n = hd.ids.filter(id => this.seen(id)).length;
        text(ctx, `${n}/${hd.ids.length}`, sv.w - 14 * U, cy, { size: fsH * 0.85, align: 'right', color: '#c8a070', weight: 800 });
      }
    }
    for (const tl of this.tiles) {
      if (tl.y + tl.s < sv.pos || tl.y > sv.pos + sv.h) continue;
      this.drawTile(ctx, tl);
    }
    sv.end(ctx, { fade: 'rgba(40,24,12,0.9)' });
    ctx.restore();
  }

  drawTile(ctx, tl) {
    const U = this.U, { id, x, y, s } = tl, sel = id === this.cur;
    const enemy = this.tab === 'enemies', seen = !enemy || this.seen(id), d = enemy ? ENEMIES[id] : TOWERS[id];
    roundRect(ctx, x, y, s, s, 10 * U);
    const g = ctx.createLinearGradient(0, y, 0, y + s);
    g.addColorStop(0, seen ? '#5a4632' : '#2e241c'); g.addColorStop(1, seen ? '#2a1c10' : '#18120c');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = Math.max(1.5, (sel ? 3.5 : 2) * U);
    ctx.strokeStyle = sel ? '#ffd96a' : enemy && d.boss ? '#b8402a' : 'rgba(216,176,82,0.55)'; ctx.stroke();
    ctx.save(); roundRect(ctx, x + 2, y + 2, s - 4, s - 4, 9 * U); ctx.clip();
    if (sel) { ctx.globalCompositeOperation = 'lighter'; glowDot(ctx, x + s / 2, y + s * 0.55, s * 0.6, '#ffcc66', 0.35); ctx.globalCompositeOperation = 'source-over'; }
    if (enemy) {
      const r = drawSpriteFit(ctx, 'e_' + id, 'idle', 0, x + s / 2, y + s * 0.52, s * 0.8, s * 0.78, { silhouette: seen ? null : '#0c0806' });
      if (!r) drawIcon(ctx, 'skull', x + s / 2, y + s / 2, s * 0.5, { alpha: 0.5 });
      if (!seen) text(ctx, '?', x + s / 2, y + s / 2, { size: s * 0.42, align: 'center', color: '#c8a878', stroke: '#0c0806', strokeWidth: s * 0.06, weight: 900, fam: 'display' });
    } else this.drawTowerSprite(ctx, id, x + s / 2, y + s * 0.5, s * 0.82, s * 0.82, false);
    ctx.restore();
    if (enemy && seen && !(Save.slot.encViewed || {})[id]) { ctx.beginPath(); ctx.arc(x + s - 9 * U, y + 9 * U, Math.max(3.5, 6 * U), 0, TAU); ctx.fillStyle = '#e8402a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#2a0b05'; ctx.stroke(); }
    if (!enemy && d.level === 4) drawIcon(ctx, 'star', x + s - 10 * U, y + 10 * U, Math.max(10, 16 * U));
  }

  drawDetail(ctx) {
    const U = this.U, D = this.detR, S = this.show, id = this.cur;
    const k = appear(this.time, 0.12, 0.35);
    ctx.save(); ctx.globalAlpha *= k; ctx.translate((1 - k) * 30 * U, 0);
    panel(ctx, 'parchment', D.x, D.y, D.w, D.h);
    // showcase
    roundRect(ctx, S.x, S.y, S.w, S.h, 12 * U);
    const g = ctx.createRadialGradient(S.x + S.w / 2, S.y + S.h * 0.45, 0, S.x + S.w / 2, S.y + S.h * 0.5, S.w * 0.6);
    g.addColorStop(0, '#6a5038'); g.addColorStop(1, '#22160c');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = Math.max(2, 3 * U); ctx.strokeStyle = '#8a6a3a'; ctx.stroke();
    ctx.save(); roundRect(ctx, S.x + 2, S.y + 2, S.w - 4, S.h - 4, 11 * U); ctx.clip();
    const sw = this.switchT !== undefined ? Ease.outBack(clamp((this.time - this.switchT) / 0.35, 0, 1)) : 1;
    const cx = S.x + S.w / 2, cy = S.y + S.h * 0.54;
    ctx.translate(cx, cy); ctx.scale(sw, sw); ctx.translate(-cx, -cy);
    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(cx, S.y + S.h * 0.86, S.w * 0.2, S.h * 0.05, 0, 0, TAU); ctx.fill();
    if (this.tab === 'enemies') {
      const seen = this.seen(id), d = ENEMIES[id];
      // cycle walk -> attack -> idle
      const tt = this.time - this.animT0, ph = tt % 6;
      const an = !seen ? 'idle' : ph < 3 ? 'walk' : ph < 4.2 && Assets.anim(`e_${id}/attack`) ? 'attack' : 'idle';
      const bh = S.h * (d.boss ? 0.86 : d.big ? 0.78 : 0.66), bw = S.w * 0.7;
      const r = drawSpriteFit(ctx, 'e_' + id, an, ph < 3 ? tt : ph - 3, cx, S.y + S.h * 0.86 - bh / 2 - (d.flying ? S.h * 0.08 : 0), bw, bh, { silhouette: seen ? null : '#0c0806', maxScale: 3.2 * U * 1.5 });
      if (!r) drawIcon(ctx, 'skull', cx, cy, S.h * 0.5, { alpha: 0.4 });
      if (!seen) text(ctx, '?', cx, cy, { size: S.h * 0.4, align: 'center', color: '#c8a878', stroke: '#0c0806', strokeWidth: S.h * 0.05, weight: 900, fam: 'display' });
    } else {
      const d = TOWERS[id], bar = d.line === 'barracks';
      const bh = S.h * 0.78, bw = S.w * (bar ? 0.42 : 0.5);
      const r = this.drawTowerSprite(ctx, id, cx - (bar ? S.w * 0.13 : 0), S.y + S.h * 0.88 - bh / 2, bw, bh, true);
      // barracks: the squad stands guard beside the building
      if (r && bar) {
        const sp = 's_' + d.unit, gx = cx + S.w * 0.2, ss = r.sc * 1.15;
        [[-20, -8], [20, -8], [0, 8]].forEach(([ox, oy], i) => { const f = unitFrame(sp, 'idle', this.time + i * 0.3); if (f) drawFrame(ctx, f, gx + ox * ss, r.ay + oy * ss, false, ss); });
      }
    }
    ctx.restore();
    // text
    const sv = this.detail;
    sv.begin(ctx);
    const a = this.switchT !== undefined ? clamp((this.time - this.switchT) / 0.25, 0, 1) : 1;
    ctx.globalAlpha *= a;
    for (const it of this.detItems || []) if (it.y + it.h >= sv.pos - 4 && it.y <= sv.pos + sv.h + 4) it.draw(ctx, 13 * U, it.y);
    sv.end(ctx, { color: 'rgba(110,70,25,0.6)', fade: 'rgba(236,214,166,0.95)' });
    ctx.restore();
  }
}
