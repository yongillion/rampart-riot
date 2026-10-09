// Rampart Riot — hall of heroes: roster of the six heroes, portrait + animated sprite, level / XP, stats and the
// three skills (numbers scale with level), selection for the next battle. Locked heroes show how they join.
// Params: { back: scene (default 'worldmap'), backParams: {}, hero: id to show first }
import { Screen } from '../core/screen.js';
import { Audio } from '../core/audio.js';
import { Save } from '../core/save.js';
import { Assets } from '../core/assets.js';
import { t, L } from '../core/i18n.js';
import { clamp, TAU, Ease } from '../core/util.js';
import { panel, text, roundRect } from '../render/draw.js';
import { drawIcon } from '../render/icons.js';
import { HEROES, HERO_ORDER, HERO_XP, HERO_MAX, heroLevel, heroStat } from '../data/heroes.js';
import { STAGES } from '../data/levels/index.js';
import { armorWord, speedWord } from '../game/hud.js';
import { gearButton } from '../ui/options.js';
import {
  MenuScene, Backdrop, ScrollView, btn, backBtn, ribbon, fz, fitText, lines, textW, heroPortrait, drawSpriteFit, glowDot,
  ensureSlot, loadAtlasSafe, appear, COL, TOUCH,
} from '../ui/menukit.js';

const lvVal = (v, L) => (Array.isArray(v) ? v[0] + (v[1] - v[0]) * (L - 1) / (HERO_MAX - 1) : v);
const R = Math.round;
// skill numbers at a given hero level: [[param key, value], ...]
const SKILL_FMT = {
  shieldwall: s => [['dr', R(s.dr * 100)], ['dur', s.dur], ['cd', s.cd]],
  cleave: s => [['mult', R(s.mult * 100)], ['cd', s.cd]],
  laststand: s => [['heal', R(s.heal * 100)], ['immune', s.immune], ['cd', s.cd]],
  twinshot: s => [['extra', s.extra], ['cd', s.cd]],
  snare: s => [['root', s.root], ['dmg', s.dmg], ['cd', s.cd]],
  arrowstorm: s => [['hits', s.hits], ['dmg', `${s.dmg[0]}–${s.dmg[1]}`], ['cd', s.cd]],
  sigil: (s, L) => [['absorb', R(lvVal(s.absorb, L))], ['cd', s.cd]],
  starfall: (s, L) => [['dmg', R(lvVal(s.dmg, L))], ['cd', s.cd]],
  stoneguard: s => [['hp', s.hp], ['dur', s.dur], ['cd', s.cd]],
  turret: (s, L) => [['dmg', `${R(lvVal([s.dmg[0][0], s.dmg[1][0]], L))}–${R(lvVal([s.dmg[0][1], s.dmg[1][1]], L))}`], ['dur', s.dur], ['cd', s.cd]],
  quake: (s, L) => [['dmg', R(lvVal(s.dmg, L))], ['stun', s.stun], ['cd', s.cd]],
  keg: (s, L) => [['dmg', R(lvVal(s.dmg, L))], ['cd', s.cd]],
  dive: (s, L) => [['dmg', R(lvVal(s.dmg, L))], ['cd', s.cd]],
  gale: s => [['push', s.push], ['cd', s.cd]],
  talonstorm: (s, L) => [['hits', s.hits], ['dmg', R(lvVal(s.dmg, L))], ['cd', s.cd]],
  lash: (s, L) => [['targets', s.targets], ['dmg', R(lvVal(s.dmg, L))], ['cd', s.cd]],
  veil: s => [['immune', s.dur], ['cd', s.cd]],
  phoenix: (s, L) => [['dmg', R(lvVal(s.dmg, L))], ['cd', s.cd]],
};
function skillNumbers(s, L) {
  const f = SKILL_FMT[s.id];
  const list = f ? f(s, L) : Object.entries(s).filter(([k, v]) => k !== 'id' && k !== 'lvl' && typeof v === 'number').map(([k, v]) => [k, v]);
  return list.map(([k, v]) => t('heroes.p.' + k, { n: v })).join('  ·  ');
}

export class HeroesScene extends MenuScene {
  constructor(app) { super(app); this.bg = new Backdrop('hall'); this.view = 'brannoc'; this.info = new ScrollView(); this.scrolls = [this.info]; this.anim = { name: 'idle', t0: 0, next: 3 }; }

  enter(p) {
    super.enter(p);
    ensureSlot();
    Audio.playMusic('worldmap', { fadeIn: 1 });
    Promise.all([Assets.loadAtlas('ui'), Assets.loadAtlas('heroes'), loadAtlasSafe('portraits')]).then(() => this.buildInfo()).catch(() => {});
    const s = Save.slot;
    this.view = (p.hero && HEROES[p.hero]) ? p.hero : (HEROES[s.hero] ? s.hero : 'brannoc');
    this.markSeen(this.view);
    this.layout();
  }
  goBack() { this.app.go(this.params.back || 'worldmap', this.params.backParams || {}); }

  unlocked(id) { return !!Save.slot.heroes[id]; }
  xp(id) { return (Save.slot.heroes[id] || {}).xp || 0; }
  markSeen(id) { const s = Save.slot; if (!this.unlocked(id)) return; s.heroSeen = s.heroSeen || {}; if (!s.heroSeen[id]) { s.heroSeen[id] = true; Save.persist(); } }

  layout() {
    const U = this.U, W = Screen.gw, H = Screen.gh, sf = Screen.safe;
    this.ui.clear();
    this.back = this.ui.add(backBtn(() => this.goBack()));
    this.gear = this.ui.add(gearButton(this, W - sf.r - 14 * U - this.back.r, this.back.y, this.back.r));
    this.titleY = this.back.y;
    const top = this.back.y + this.back.r + 12 * U, bottom = H - sf.b - Math.max(14 * U, 8);
    const left = sf.l + Math.max(20 * U, 10), right = W - sf.r - Math.max(20 * U, 10);
    const gap = Math.max(14 * U, 8), avW = Math.min(right - left, 1300 * U);
    const x0 = left + (right - left - avW) / 2;
    const rosterW = clamp(avW * 0.2, 170 * U, 250 * U), stageW = clamp(avW * 0.28, 220 * U, 360 * U);
    this.roster = { x: x0, y: top, w: rosterW, h: bottom - top };
    this.stage = { x: x0 + rosterW + gap, y: top, w: stageW, h: bottom - top };
    this.infoR = { x: this.stage.x + stageW + gap, y: top, w: x0 + avW - (this.stage.x + stageW + gap), h: bottom - top };
    // roster cells (2 x 3)
    const R0 = this.roster, cw = (R0.w - 16 * U) / 2, ch = (R0.h - 16 * U) / 3;
    this.cells = HERO_ORDER.map((id, i) => {
      const cx = R0.x + 8 * U + cw * (i % 2 + 0.5), cy = R0.y + 8 * U + ch * (Math.floor(i / 2) + 0.5);
      const r = Math.max(16, Math.min(cw * 0.36, ch * 0.3));
      return this.ui.add({
        id, x: cx, y: cy - ch * 0.1, r, cw, ch, sound: false,
        hitTest(px, py) { return Math.abs(px - cx) <= Math.max(cw / 2, TOUCH / 2) && Math.abs(py - cy) <= Math.max(ch / 2, TOUCH / 2); },
        onTap: () => this.show(id),
        draw: (ctx, it, pressed, hover) => this.drawCell(ctx, it, pressed, hover),
      });
    });
    // select button
    const S = this.stage, bh = Math.max(58 * U, 36);
    this.selBtn = this.ui.add(btn(S.x + 18 * U, S.y + S.h - bh - 18 * U, S.w - 36 * U, bh, () => this.selLabel(), () => this.select(), {
      color: () => (!this.unlocked(this.view) ? 'gray' : Save.slot.hero === this.view ? 'gold' : 'green'), keepColor: true, size: Math.min(bh * 0.4, fz(22, 12)), sound: false,
      icon: () => (!this.unlocked(this.view) ? 'lock' : Save.slot.hero === this.view ? 'check' : 'hero'),
    }));
    // info scroll view
    const I = this.infoR, pad = Math.max(22 * U, 12);
    this.info.set(I.x + pad * 0.6, I.y + pad * 0.6, I.w - pad * 1.2, I.h - pad * 1.2);
    this.infoPad = pad * 0.4;
    this.buildInfo();
  }

  selLabel() {
    if (!this.unlocked(this.view)) return t('heroes.lockedShort', { id: HEROES[this.view].unlock });
    return Save.slot.hero === this.view ? t('heroes.selected') : t('heroes.select');
  }
  select() {
    const id = this.view;
    if (!this.unlocked(id)) { Audio.sfx('ui_error'); return; }
    if (Save.slot.hero === id) { Audio.sfx('ui_click'); return; }
    Save.slot.hero = id; Save.persist();
    Audio.sfx('hero_select');
    this.cheer = { t: 0 };
    this.playAnim('special');
  }
  show(id) {
    if (this.view === id) return;
    this.view = id; this.markSeen(id);
    Audio.sfx(this.unlocked(id) ? 'ui_click' : 'ui_error', { vol: this.unlocked(id) ? 1 : 0.5 });
    this.info.scrollTo(0, true);
    this.anim = { name: 'idle', t0: this.time, next: this.time + 2.5 };
    this.switchT = this.time;
    this.buildInfo();
  }
  playAnim(name) {
    const a = Assets.anim(`h_${this.view}/${name}`);
    if (!a) return;
    this.anim = { name, t0: this.time, end: this.time + a.dur, next: this.time + a.dur + 2.5 + Math.random() * 2 };
  }

  key(k) {
    const i = HERO_ORDER.indexOf(this.view);
    if (k === 'ArrowRight' || k === 'ArrowDown') this.show(HERO_ORDER[(i + 1) % 6]);
    else if (k === 'ArrowLeft' || k === 'ArrowUp') this.show(HERO_ORDER[(i + 5) % 6]);
    else if (k === 'Enter' || k === ' ') this.select();
  }

  update(dt) {
    super.update(dt);
    const a = this.anim;
    if (a.end && this.time >= a.end) { this.anim = { name: 'idle', t0: this.time, next: a.next }; }
    else if (!a.end && this.time >= a.next && this.unlocked(this.view)) this.playAnim(Math.random() < 0.6 ? 'attack' : 'special');
    if (this.cheer) { this.cheer.t += dt; if (this.cheer.t > 1) this.cheer = null; }
  }

  // ------------------------------------------------------------------ info content (built once per hero / layout)
  buildInfo() {
    if (!this.info || !this.infoR) return;
    const U = this.U, id = this.view, H = HEROES[id], unl = this.unlocked(id), xp = this.xp(id), lvl = unl ? heroLevel(xp) : 1;
    const w = this.info.w - this.infoPad * 2 - 8 * U;
    const items = []; let y = 0;
    const add = (h, draw) => { items.push({ y, h, draw }); y += h; };
    const F = { name: fz(32, 15), title: fz(19, 11), body: fz(17, 10.5), small: fz(15, 9.5), head: fz(20, 11.5) };
    // name + role chip
    add(F.name * 1.25, (ctx, x, yy) => {
      const role = t('heroes.role.' + H.role), rw = textW(role, F.small, 800) + 20 * U;
      fitText(ctx, t(`hero.${id}.name`), x, yy + F.name * 0.62, w - rw - 12 * U, { size: F.name, color: COL.head, weight: 900, fam: 'display' });
      roundRect(ctx, x + w - rw, yy + F.name * 0.62 - F.small * 0.85, rw, F.small * 1.7, F.small * 0.85);
      ctx.fillStyle = H.color; ctx.fill(); ctx.lineWidth = Math.max(1, 1.5 * U); ctx.strokeStyle = 'rgba(40,20,5,0.7)'; ctx.stroke();
      text(ctx, role, x + w - rw / 2, yy + F.name * 0.62 + 1, { size: F.small, align: 'center', color: '#fff', stroke: 'rgba(20,10,5,0.6)', weight: 800 });
    });
    add(F.title * 1.5, (ctx, x, yy) => fitText(ctx, t(`hero.${id}.title`), x, yy + F.title * 0.6, w, { size: F.title, color: COL.soft, weight: 600, fam: 'serif' }));
    const dl = lines(t(`hero.${id}.desc`), w, F.body, 600);
    add(dl.length * F.body * 1.4 + 8 * U, (ctx, x, yy) => dl.forEach((ln, i) => text(ctx, ln, x, yy + i * F.body * 1.4, { size: F.body, color: COL.ink, weight: 600, baseline: 'top' })));
    if (!unl) {
      const st = STAGES.find(s => s.id === H.unlock), nm = st ? L(st.name) : '';
      const msg = nm && nm !== H.unlock ? t('heroes.locked', { id: H.unlock, name: nm }) : t('heroes.lockedNoName', { id: H.unlock });
      const ll = lines(msg, w - 40 * U, F.body, 800);
      add(ll.length * F.body * 1.4 + 22 * U, (ctx, x, yy) => {
        roundRect(ctx, x, yy + 4 * U, w, ll.length * F.body * 1.4 + 12 * U, 10 * U); ctx.fillStyle = 'rgba(120,40,20,0.12)'; ctx.fill();
        drawIcon(ctx, 'lock', x + 16 * U, yy + 4 * U + (ll.length * F.body * 1.4 + 12 * U) / 2, F.body * 1.4);
        ll.forEach((ln, i) => text(ctx, ln, x + 34 * U, yy + 10 * U + i * F.body * 1.4, { size: F.body, color: COL.bad, weight: 800, baseline: 'top' }));
      });
    }
    // level + xp
    if (unl) add(F.head * 2.4, (ctx, x, yy) => {
      const cy = yy + F.head * 0.9;
      text(ctx, t('heroes.level', { n: lvl }), x, cy, { size: F.head, color: COL.head, weight: 900 });
      const lx = x + textW(t('heroes.level', { n: 10 }), F.head, 900) + 14 * U, bw = w - (lx - x), bh = Math.max(10 * U, 7);
      const a = HERO_XP[lvl - 1] || 0, b = HERO_XP[lvl], max = lvl >= HERO_MAX;
      const frac = max ? 1 : clamp((xp - a) / Math.max(1, b - a), 0, 1);
      roundRect(ctx, lx, cy - bh / 2, bw, bh, bh / 2); ctx.fillStyle = '#3a2412'; ctx.fill();
      if (frac > 0) { roundRect(ctx, lx + 1, cy - bh / 2 + 1, Math.max(bh, (bw - 2) * frac), bh - 2, (bh - 2) / 2); const g = ctx.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2); g.addColorStop(0, '#b8f08a'); g.addColorStop(1, '#4a9a2a'); ctx.fillStyle = g; ctx.fill(); }
      // numbers count within the current level, matching the bar (0 / 450 right after reaching level 2)
      text(ctx, max ? t('heroes.maxLevel') : t('heroes.xp', { a: Math.max(0, xp - a), b: b - a }), lx + bw, cy + bh / 2 + F.small * 0.9, { size: F.small, align: 'right', color: COL.soft, weight: 700 });
    });
    // stats grid
    const stat = [];
    const hp = R(heroStat(H.hp, lvl)), hpN = lvl < HERO_MAX ? R(heroStat(H.hp, lvl + 1)) : hp;
    stat.push([t('heroes.st.hp'), String(hp), unl && hpN > hp ? `+${hpN - hp}` : '']);
    const md = heroStat(H.dmg, lvl);
    stat.push([t('heroes.st.melee'), `${R(md[0])}–${R(md[1])}`, '']);
    if (H.ranged) { const rd = heroStat(H.ranged.dmg, lvl); stat.push([t('heroes.st.ranged'), `${R(rd[0])}–${R(rd[1])}`, '']); stat.push([t('heroes.st.range'), String(H.ranged.range), '']); }
    stat.push([t('heroes.st.armor'), armorWord(heroStat(H.armor, lvl)), '']);
    stat.push([t('heroes.st.mr'), armorWord(heroStat(H.mr, lvl)), '']);
    stat.push([t('heroes.st.regen'), String(R(heroStat(H.regen, lvl))), '']);
    stat.push([t('heroes.st.respawn'), t('heroes.sec', { n: H.respawn }), '']);
    const cols = w > 360 * U ? 2 : 1, rh = F.body * 1.75, rows = Math.ceil(stat.length / cols);
    add(F.head * 1.5, (ctx, x, yy) => this.sectionHead(ctx, t('heroes.stats'), x, yy + F.head * 0.75, w, F.head));
    add(rows * rh + 10 * U, (ctx, x, yy) => {
      const cw2 = (w - (cols - 1) * 16 * U) / cols;
      stat.forEach(([k, v, d], i) => {
        const cx = x + (i % cols) * (cw2 + 16 * U), cy = yy + Math.floor(i / cols) * rh + rh / 2;
        if (Math.floor(i / cols) % 2 === 0) { ctx.fillStyle = 'rgba(120,80,30,0.08)'; ctx.fillRect(cx - 4 * U, cy - rh / 2, cw2 + 8 * U, rh); }
        fitText(ctx, k, cx, cy, cw2 * 0.55, { size: F.body, color: COL.soft, weight: 700 });
        if (d) text(ctx, d, cx + cw2, cy, { size: F.small, align: 'right', color: COL.good, weight: 800 });
        text(ctx, v, cx + cw2 - (d ? textW(d, F.small, 800) + 8 * U : 0), cy, { size: F.body, align: 'right', color: COL.ink, weight: 900 });
      });
    });
    // skills
    add(F.head * 1.6, (ctx, x, yy) => this.sectionHead(ctx, t('heroes.skills'), x, yy + F.head * 0.8, w, F.head));
    H.skills.forEach((s, i) => {
      const open = unl && lvl >= s.lvl;
      const nums = skillNumbers(s, Math.max(lvl, s.lvl));
      const mr = Math.max(14, 22 * U), tx = 2 * mr + 12 * U, tw = w - tx;
      const dl2 = lines(t(`hskill.${s.id}.desc`), tw, F.body, 600);
      const nl = lines(nums, tw, F.small, 800);
      const h = F.body * 1.5 + dl2.length * F.body * 1.36 + nl.length * F.small * 1.4 + 18 * U;
      add(h, (ctx, x, yy) => {
        ctx.save(); if (!open) ctx.globalAlpha *= 0.62;
        // number medallion
        const mx = x + mr, my = yy + mr + 2 * U;
        ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU);
        const g = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.35, mr * 0.1, mx, my, mr);
        g.addColorStop(0, open ? '#ffe08a' : '#9a8a7a'); g.addColorStop(1, open ? '#b8761a' : '#4a3a2a');
        ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = Math.max(1.5, 2.5 * U); ctx.strokeStyle = '#3a2208'; ctx.stroke();
        if (open) text(ctx, String(i + 1), mx, my + 1, { size: mr * 1.05, align: 'center', color: '#3a1e06', weight: 900, fam: 'display' });
        else drawIcon(ctx, 'lock', mx, my, mr * 1.25);
        fitText(ctx, t(`hskill.${s.id}.name`), x + tx, yy + F.body * 0.75, tw * 0.6, { size: F.body * 1.08, color: COL.head, weight: 900 });
        const tag = open || (!unl && s.lvl <= 1) ? '' : t('heroes.skillAt', { n: s.lvl });
        if (tag) text(ctx, tag, x + w, yy + F.body * 0.75, { size: F.small, align: 'right', color: COL.bad, weight: 800 });
        let ly = yy + F.body * 1.5;
        dl2.forEach(ln => { text(ctx, ln, x + tx, ly, { size: F.body, color: COL.ink, weight: 600, baseline: 'top' }); ly += F.body * 1.36; });
        nl.forEach(ln => { text(ctx, ln, x + tx, ly + 2 * U, { size: F.small, color: '#7a4a10', weight: 800, baseline: 'top' }); ly += F.small * 1.4; });
        ctx.restore();
      });
    });
    this.infoItems = items;
    this.info.setContent(y + 10 * U);
  }
  sectionHead(ctx, label, x, y, w, fs) {
    text(ctx, label, x, y, { size: fs, color: '#8a3a10', weight: 900 });
    const lw = textW(label, fs, 900) + 12 * this.U;
    ctx.fillStyle = 'rgba(138,58,16,0.3)'; ctx.fillRect(x + lw, y, w - lw, Math.max(1, 1.5 * this.U));
  }

  // ------------------------------------------------------------------ drawing
  drawScene(ctx, w, h) {
    const U = this.U;
    this.bg.draw(ctx, w, h, this.time);
    ctx.save(); ctx.globalAlpha = appear(this.time, 0, 0.3);
    ribbon(ctx, w / 2, this.titleY, Math.min(400 * U, w * 0.42), Math.max(50 * U, 30), t('heroes.title'));
    ctx.restore();
    // roster
    const k1 = appear(this.time, 0.04, 0.35), Rr = this.roster;
    ctx.save(); ctx.globalAlpha *= k1; ctx.translate(-(1 - k1) * 30 * U, 0);
    panel(ctx, 'woodDark', Rr.x, Rr.y, Rr.w, Rr.h);
    ctx.restore();
    this.drawStage(ctx);
    // info
    const k3 = appear(this.time, 0.14, 0.35), I = this.infoR;
    ctx.save(); ctx.globalAlpha *= k3; ctx.translate((1 - k3) * 30 * U, 0);
    panel(ctx, 'parchment', I.x, I.y, I.w, I.h);
    const sv = this.info;
    sv.begin(ctx);
    const sw = this.switchT !== undefined ? clamp((this.time - this.switchT) / 0.25, 0, 1) : 1;
    ctx.globalAlpha *= sw;
    for (const it of this.infoItems || []) if (it.y + it.h >= sv.pos - 4 && it.y <= sv.pos + sv.h + 4) it.draw(ctx, this.infoPad, it.y);
    sv.end(ctx, { color: 'rgba(110,70,25,0.6)', fade: 'rgba(236,214,166,0.95)' });
    ctx.restore();
    this.ui.draw(ctx);
  }

  drawStage(ctx) {
    const U = this.U, S = this.stage, id = this.view, unl = this.unlocked(id), H = HEROES[id];
    const k = appear(this.time, 0.09, 0.35);
    ctx.save(); ctx.globalAlpha *= k; ctx.translate(0, (1 - k) * 30 * U);
    panel(ctx, 'wood', S.x, S.y, S.w, S.h);
    // light pool
    const cx = S.x + S.w / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(S.x + 10, S.y + 10, S.w - 20, S.h - 20); ctx.clip();
    const lg = ctx.createRadialGradient(cx, S.y + S.h * 0.35, 0, cx, S.y + S.h * 0.35, S.h * 0.6);
    lg.addColorStop(0, `rgba(255,214,140,${unl ? 0.28 : 0.12})`); lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg; ctx.fillRect(S.x, S.y, S.w, S.h);
    ctx.restore();
    const sw = this.switchT !== undefined ? Ease.outBack(clamp((this.time - this.switchT) / 0.35, 0, 1)) : 1;
    const hasPortrait = !!Assets.frame('portrait/' + id);
    const btnTop = this.selBtn.y - 12 * U;
    const avail = btnTop - (S.y + 16 * U);
    if (hasPortrait) {
      const pr = Math.min(S.w * 0.36, avail * 0.3);
      const py = S.y + 18 * U + pr;
      ctx.save(); ctx.translate(cx, py); ctx.scale(sw, sw); ctx.translate(-cx, -py);
      heroPortrait(ctx, id, cx, py, pr, this.time, { locked: !unl, bg: '#241a12', light: H.color });
      ctx.restore();
      this.drawPedestal(ctx, cx, py + pr + 14 * U, btnTop, unl, sw);
    } else this.drawPedestal(ctx, cx, S.y + 20 * U, btnTop, unl, sw, true);
    if (this.cheer) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const q = this.cheer.t; for (let i = 0; i < 12; i++) { const a = i * TAU / 12; glowDot(ctx, cx + Math.cos(a) * (40 + 120 * q) * U, S.y + S.h * 0.55 + Math.sin(a) * (30 + 90 * q) * U, 8 * U * (1 - q) + 2, '#ffd860', 1 - q); } ctx.restore(); }
    ctx.restore();
  }
  drawPedestal(ctx, cx, top, bottom, unl, sw, big = false) {
    const U = this.U, id = this.view;
    const h = bottom - top, gy = top + h * (big ? 0.84 : 0.8);
    // pedestal stone
    const pw = Math.min(this.stage.w * 0.55, h * 0.9), ph = Math.max(8, pw * 0.14);
    ctx.beginPath(); ctx.ellipse(cx, gy + ph * 0.55, pw / 2, ph * 0.6, 0, 0, TAU); ctx.fillStyle = '#2a1e16'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, gy, pw / 2, ph * 0.6, 0, 0, TAU);
    const g = ctx.createLinearGradient(0, gy - ph, 0, gy + ph); g.addColorStop(0, '#9a9088'); g.addColorStop(1, '#5a524c');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = Math.max(1.5, 2.5 * U); ctx.strokeStyle = '#1d130c'; ctx.stroke();
    const flying = !!HEROES[id].flying;
    const bh = h * (big ? 0.78 : 0.7) * (flying ? 0.9 : 1), bw = this.stage.w * 0.8;
    const cy = gy - bh / 2 - (flying ? bh * 0.12 : 0) + ph * 0.1;
    ctx.save(); ctx.translate(cx, gy); ctx.scale(sw, sw); ctx.translate(-cx, -gy);
    const a = this.anim;
    const r = drawSpriteFit(ctx, 'h_' + id, unl ? a.name : 'idle', unl ? this.time - a.t0 : 0, cx, cy, bw, bh, { silhouette: unl ? null : '#1a110a', maxScale: 3 * U * 1.6 });
    if (!r) { ctx.beginPath(); ctx.arc(cx, cy, Math.min(bw, bh) * 0.3, 0, TAU); ctx.fillStyle = HEROES[id].color; ctx.fill(); }
    if (!unl) drawIcon(ctx, 'lock', cx, cy, Math.min(bw, bh) * 0.28);
    ctx.restore();
  }

  drawCell(ctx, it, pressed, hover) {
    const U = this.U, id = it.id, unl = this.unlocked(id), cur = Save.slot.hero === id, viewing = this.view === id;
    const k = appear(this.time, 0.06 + HERO_ORDER.indexOf(id) * 0.04, 0.3);
    const s = (pressed ? 0.94 : hover ? 1.05 : 1) * (0.85 + 0.15 * k);
    ctx.save(); ctx.globalAlpha *= k;
    ctx.translate(it.x, it.y); ctx.scale(s, s); ctx.translate(-it.x, -it.y);
    if (viewing) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDot(ctx, it.x, it.y, it.r * 1.7, '#ffcc66', 0.45 + 0.15 * Math.sin(this.time * 4)); ctx.restore(); }
    heroPortrait(ctx, id, it.x, it.y, it.r, this.time, { locked: !unl, rim: viewing ? '#ffe08a' : unl ? '#b8904a' : '#6a5a4a', bg: unl ? '#2e2218' : '#1a140e', light: unl ? HEROES[id].color : '#3a3028' });
    if (!unl) drawIcon(ctx, 'lock', it.x, it.y, it.r * 0.9);
    if (cur) drawIcon(ctx, 'check', it.x + it.r * 0.72, it.y + it.r * 0.7, it.r * 0.7);
    const seen = (Save.slot.heroSeen || {})[id];
    if (unl && !seen && id !== 'brannoc') { const bw = textW(t('heroes.new'), fz(12, 8), 900) + 10 * U; roundRect(ctx, it.x + it.r * 0.2, it.y - it.r * 1.05, bw, fz(18, 12), 6 * U); ctx.fillStyle = '#d8342a'; ctx.fill(); text(ctx, t('heroes.new'), it.x + it.r * 0.2 + bw / 2, it.y - it.r * 1.05 + fz(9, 6), { size: fz(12, 8), align: 'center', color: '#fff', weight: 900 }); }
    const fs = fz(16, 10);
    fitText(ctx, t(`hero.${id}.name`), it.x, it.y + it.r + fs * 0.95, it.cw - 6 * U, { size: fs, align: 'center', color: unl ? '#ffe9a8' : '#a89880', stroke: '#1a0e06', weight: 900 });
    const sub = unl ? t('heroes.level', { n: heroLevel(this.xp(id)) }) : t('heroes.lockedShort', { id: HEROES[id].unlock });
    fitText(ctx, sub, it.x, it.y + it.r + fs * 2.05, it.cw - 6 * U, { size: fz(13, 9), align: 'center', color: unl ? '#d8b070' : '#a08870', weight: 700 });
    ctx.restore();
  }
}
