// Rampart Riot — battle scene: loads a stage, runs the simulation, handles input, HUD, popups, story beats
import { Screen } from '../core/screen.js';
import { Audio } from '../core/audio.js';
import { Assets } from '../core/assets.js';
import { Save } from '../core/save.js';
import { t, L } from '../core/i18n.js';
import { clamp, TAU, fmtInt } from '../core/util.js';
import { panel, text, button, wrap, vignette, star as drawStar, roundRect } from '../render/draw.js';
import { drawIcon } from '../render/icons.js';
import { UI, textButton } from '../ui/widgets.js';
import { Battle, FIELD } from '../game/battle.js';
import { Camera } from '../game/camera.js';
import { FX } from '../game/fx.js';
import { BattleRenderer, unitFrame } from '../game/renderer.js';
import { HUD, armorWord, speedWord } from '../game/hud.js';
import { getLevel, nextStageId, chapterOf } from '../data/levels/index.js';
import { ENEMIES } from '../data/enemies.js';
import { HEROES, heroLevel } from '../data/heroes.js';
import { Dialogue } from '../ui/dialogue.js';
import { STORY } from '../data/story.js';
import { drawFrameFit } from '../core/assets.js';
import { Achievements } from '../meta/achievements.js';
import { MapProps } from '../game/props.js';
import { OptionsPopup } from '../ui/options.js';

const STEP = 1 / 60;
const CH_MUSIC = { 1: 'battle1', 2: 'battle2', 3: 'battle3', 4: 'battle4' };
const CH_AMB = { 1: 'amb_meadow', 2: 'amb_snow', 3: 'amb_swamp', 4: 'amb_volcano' };

export class BattleScene {
  constructor(app) {
    this.app = app;
    this.ui = new UI();
    this.loading = true;
    this.loadProg = 0;
    this.speed = 1;
    this.paused = false;
    this.popup = null;
    this.acc = 0;
    this.time = 0;
    this.lifeFlash = 0;
    this.spellMode = null;
    this.rallyTower = null;
    this.cursor = null;
  }

  async enter(p) {
    this.params = p;
    this.stageId = p.stageId;
    this.mode = p.mode || 'campaign';
    this.level = getLevel(this.stageId);
    this.ch = chapterOf(this.stageId);
    this.maxTowerLevel = this.level.maxTower ?? 4;
    this.cam = new Camera();
    this.cam.fit(Screen.gw, Screen.gh);
    this.fx = new FX(this.cam);
    this.loading = true;
    // ---- load assets ----
    const slot = Save.slot;
    const heroId = slot ? slot.hero : 'brannoc';
    const jobs = [
      Assets.loadImage(`assets/maps/${this.level.mapImage || 'map_' + this.stageId.replace('-', '_')}.jpg`).then(img => { this.mapImg = img; }),
      Assets.loadAtlas('towers'), Assets.loadAtlas('units'), Assets.loadAtlas('fx'), Assets.loadAtlas('ui'),
      Assets.loadAtlas('heroes'), Assets.loadAtlas('props'), Assets.loadAtlas('portraits'),
      Assets.loadAtlas('enemies' + this.ch),
    ];
    if (this.level.bossAtlas) jobs.push(Assets.loadAtlas(this.level.bossAtlas));
    if (this.level.extraAtlases) for (const a of this.level.extraAtlases) jobs.push(Assets.loadAtlas(a));
    let done = 0;
    const all = jobs.map(j => Promise.resolve(j).catch(() => null).then(() => { done++; this.loadProg = done / jobs.length; }));
    const music = this.level.music || CH_MUSIC[this.ch];
    Audio.preloadMusic(music);
    Audio.preload(['arrow_shoot', 'arrow_hit', 'sword_hit', 'bomb_launch', 'bomb_explode', 'magic_cast', 'magic_hit', 'enemy_death', 'build_tower', 'upgrade_tower', 'wave_incoming', 'wave_early', 'ui_click', 'tower_menu', 'soldier_death', 'life_lost', 'coin', 'rally', 'hero_move', 'meteor_fall', 'meteor_impact', 'reinforcements']);
    await Promise.all(all);
    // ---- create battle ----
    const upgrades = slot ? slot.upgrades : {};
    const xp = slot && slot.heroes[heroId] ? slot.heroes[heroId].xp : 0;
    const locked = [];
    if (this.level.lockSpells) locked.push(...this.level.lockSpells);
    this.battle = new Battle(this.level, {
      mode: this.mode, difficulty: (slot && slot.difficulty) || 'normal', upgrades, seed: (Date.now() & 0xffff),
      hero: this.level.noHero ? null : { id: heroId, xp }, fx: this.fx, lockedSpells: locked,
    });
    this.renderer = new BattleRenderer(this.battle, this.cam, this.fx);
    this.renderer.setMap(this.mapImg);
    this.props = new MapProps(this, this.level);
    this.renderer.props = this.props.list;
    this.hud = new HUD(this);
    this.layout();
    this.loading = false;
    Audio.playMusic(music, { fadeIn: 1.5 });
    Audio.playAmb(this.level.amb || CH_AMB[this.ch], 0.8);
    this.seen = slot ? slot.seenEnemies : {};
    // story beats
    const pre = this.mode === 'campaign' ? (this.level.story && this.level.story.pre) : null;
    if (pre && STORY[pre]) this.startDialogue(pre);
    else this.introBanner();
    this.tutorial = this.mode === 'campaign' && this.level.tutorial ? { step: 0, t: 0 } : null;
  }

  exit() { Audio.stopAmb(1); this.fx && this.fx.clear(); }

  introBanner() {
    const name = L(this.level.name) || this.stageId;
    this.hud.banner(name, { sub: this.mode === 'heroic' ? t('mode.heroic') : this.mode === 'iron' ? t('mode.iron') : t('hud.prepare'), life: 3, big: true });
  }

  layout() {
    if (!this.cam) return;
    this.cam.fit(Screen.gw, Screen.gh, !!this.battle);
    if (this.hud) this.hud.layout();
    if (this.popup && this.popup.layout) this.popup.layout();
    if (this.dialogue) this.dialogue.layout();
    if (this.opt) this.opt.layout();
  }
  // Settings popup switched the language: rebuild every label that was laid out with t()
  onLangChange() {
    if (this.hud) this.hud.layout();
    if (this.popup && this.popup.layout) this.popup.layout();
    if (this.dialogue && this.dialogue.layout) this.dialogue.layout();
  }

  // ------------------------------------------------------------------ flow
  get blocking() { return this.loading || this.paused || !!this.popup || !!this.dialogue || !!this.opt; }

  update(dt) {
    this.time += dt;
    if (this.loading) return;
    if (this.dialogue) { this.dialogue.update(dt); }
    if (this.popup && this.popup.update) this.popup.update(dt);
    if (this.opt) { this.opt.update(dt); if (!this.opt.isOpen) this.opt = null; }
    this.cam.update(dt);
    if (!this.blocking) {
      this.acc += dt * this.speed;
      let n = 0;
      while (this.acc >= STEP && n < 10) { this.battle.update(STEP); this.acc -= STEP; n++; }
      if (n >= 10) this.acc = 0;
      this.fx.update(dt * this.speed);
      this.props.update(dt * this.speed);
      this.processEvents();
      if (this.lifeFlash > 0) this.lifeFlash -= dt;
      if (this.tutorial) this.updateTutorial(dt);
    } else if (this.paused || this.popup) {
      // keep effects frozen
    }
    this.hud.update(dt);
    // end of battle
    const b = this.battle;
    if (b.state !== 'running' && !this.endHandled && b.endT > (b.state === 'won' ? 1.4 : 1.0)) {
      this.endHandled = true;
      if (b.state === 'won') this.onVictory(); else this.onDefeat();
    }
    if (b.state !== 'running' && !this.popup) { b.update(dt); this.fx.update(dt); }
  }

  processEvents() {
    const b = this.battle;
    const evs = b.events.splice(0);
    for (const ev of evs) {
      switch (ev.kind) {
        case 'spawn':
          if (!this.seen[ev.type]) {
            this.seen[ev.type] = true;
            if (Save.slot) { Save.slot.seenEnemies[ev.type] = true; Save.persist(); }
            if (!ENEMIES[ev.type].minor) this.showNewEnemy(ev.type);   // minor spawns are recorded silently
          }
          if (ENEMIES[ev.type].boss) { this.hud.banner(t(`enemy.${ev.type}.name`), { sub: t('hud.bossArrives'), color: '#ff8a6a', big: true, life: 3.2 }); Audio.sfx('boss_appear'); if (this.level.music !== 'boss') Audio.playMusic('boss', { fadeIn: 1.2, fadeOut: 1.2 }); this.bossMusic = true; const st = this.level.story && this.level.story.boss; if (st && STORY[st] && this.mode === 'campaign') this.startDialogue(st); }
          break;
        case 'waveStart':
          this.hud.banner(t('hud.wave', { n: ev.wave }) + (ev.wave === ev.total ? ' — ' + t('hud.finalWave') : ''), { life: 2 });
          if (this.mode === 'campaign' && this.level.story && this.level.story.waves && this.level.story.waves[ev.wave]) { const id = this.level.story.waves[ev.wave]; if (STORY[id]) this.startDialogue(id); }
          break;
        case 'earlyCall': {
          const fl = this.hud.flagPositions()[0];
          if (ev.bonus > 0) this.hud.banner('+' + ev.bonus + ' ' + t('hud.goldEarly'), { color: '#ffe27a', life: 1.4 });
          break;
        }
        case 'leak': this.lifeFlash = 1.2; this.cam.shake(3); break;
        case 'bossDefeated':
          this.hud.banner(t('hud.bossDefeated'), { color: '#ffe27a', big: true, life: 3 });
          if (this.bossMusic) Audio.playMusic(this.level.music || CH_MUSIC[this.ch], { fadeIn: 2 });
          break;
        case 'bossPhase':
          if (this.mode === 'campaign' && this.level.story && this.level.story.phases && this.level.story.phases[ev.phase]) { const id = this.level.story.phases[ev.phase]; if (STORY[id]) this.startDialogue(id); }
          break;
        case 'heroLevel': this.hud.banner(t('hud.heroLevel', { n: ev.level }), { color: '#ffd75a', life: 1.8 }); break;
      }
    }
  }

  // ------------------------------------------------------------------ actions from HUD
  togglePause() {
    if (this.battle.state !== 'running') return;
    if (this.popup && this.popup.kind === 'pause') this.closePopup();
    else if (!this.popup) this.showPause();
  }
  toggleSpeed() { this.speed = this.speed === 1 ? 2 : 1; }
  selectHero() {
    const h = this.battle.heroes[0];
    if (!h) return;
    const sel = this.renderer.sel;
    this.hud.closeMenu(); this.spellMode = null; this.rallyTower = null;
    if (sel && sel.kind === 'hero') { this.renderer.sel = null; return; }
    this.renderer.sel = { kind: 'hero', obj: h };
    Audio.sfx('hero_select');
    if (h.dead) Audio.sfx('ui_error');
  }
  toggleSpell(id) {
    const b = this.battle;
    if (this.spellMode === id) { this.spellMode = null; this.renderer.sel = null; Audio.sfx('ui_close'); return; }
    if (!b.spellReady(id)) { Audio.sfx('ui_error'); return; }
    this.hud.closeMenu(); this.rallyTower = null;
    this.spellMode = id;
    this.renderer.sel = { kind: 'spell', cursor: null };
    Audio.sfx('ui_click');
  }
  startRally(tw) {
    this.rallyTower = tw;
    this.hud.closeMenu();
    this.renderer.sel = { kind: 'tower', obj: tw, rallyMode: true };
    Audio.sfx('ui_click');
  }
  onBuilt(tw) { if (this.tutorial) this.tutEvent('build'); }
  onUpgraded(tw) {}
  onWaveCalled() { if (this.tutorial) this.tutEvent('wave'); }

  // ------------------------------------------------------------------ input
  onDown(p) {
    if (this.opt) return this.opt.onDown(p);
    if (this.loading) return true;
    if (this.dialogue) return true;
    if (this.popup) return this.ui.down(p);
    this.dragMoved = false;
    this.cam.vx = 0; this.cam.vy = 0;
    return false;
  }
  onUp(p) { if (this.opt) return this.opt.onUp(p); this.ui.up(); }
  onMoveDown(p) { if (this.opt) return this.opt.onMoveDown(p); }
  onCancelPress() { if (this.opt) return this.opt.onCancelPress(); this.ui.cancel(); }
  onPinchStart() { if (this.opt) return true; }
  onPinchEnd() { if (this.opt) return true; }
  onTap(p) {
    if (this.opt) return this.opt.onTap(p);
    if (this.loading) return;
    if (this.dialogue) { this.dialogue.tap(); return; }
    if (this.popup) { if (!this.ui.tap(p) && this.popup.tapAnywhere) this.popup.tapAnywhere(); return; }
    const mouse = p.type === 'mouse';
    if (this.hud.tap(p, mouse)) return;
    const b = this.battle;
    const w = this.cam.toWorld(p.x, p.y);
    if (this.spellMode) {
      if (b.castSpell(this.spellMode, w.x, w.y)) { if (this.tutorial) this.tutEvent('spell'); this.spellMode = null; this.renderer.sel = null; }
      else Audio.sfx('ui_error');
      return;
    }
    if (this.rallyTower) {
      if (b.setRally(this.rallyTower, w.x, w.y)) { this.rallyTower = null; this.renderer.sel = null; }
      else { Audio.sfx('ui_error'); this.rallyTower = null; this.renderer.sel = null; }
      return;
    }
    // world picking
    const pick = this.pick(w.x, w.y);
    const sel = this.renderer.sel;
    if (pick && pick.kind === 'hero') { this.hud.closeMenu(); this.renderer.sel = { kind: 'hero', obj: pick.obj }; Audio.sfx('hero_select'); return; }
    if (sel && sel.kind === 'hero' && (!pick || pick.kind === 'enemy' || pick.kind === 'ground')) {
      if (b.moveHero(sel.obj, w.x, w.y)) { this.renderer.sel = null; if (this.tutorial) this.tutEvent('hero'); }
      else Audio.sfx('ui_error');
      return;
    }
    if (pick && pick.kind === 'tower') { if (this.hud.menu && this.hud.menu.obj === pick.obj) this.hud.closeMenu(); else this.hud.openTowerMenu(pick.obj); return; }
    if (pick && pick.kind === 'plot') { if (this.hud.menu && this.hud.menu.obj === pick.obj) this.hud.closeMenu(); else this.hud.openPlotMenu(pick.obj); return; }
    if (pick && pick.kind === 'prop') { pick.obj.tap(); this.hud.closeMenu(); return; }
    if (pick && pick.kind === 'enemy') { this.hud.closeMenu(); this.renderer.sel = { kind: 'enemy', obj: pick.obj }; Audio.sfx('ui_click'); return; }
    this.hud.closeMenu();
    this.renderer.sel = null;
  }

  pick(x, y) {
    const b = this.battle;
    const h = b.heroes[0];
    if (h && !h.dead) {
      const hy = h.flying ? h.y - 66 : h.y;
      if (Math.abs(x - h.x) < 24 && y > hy - 52 && y < hy + 10) return { kind: 'hero', obj: h };
    }
    for (const tw of b.towers) if (Math.abs(x - tw.x) < 50 && y > tw.y - Math.max(70, tw.top + 20) && y < tw.y + 28) return { kind: 'tower', obj: tw };
    for (const pl of b.plots) if (!pl.tower && ((x - pl.x) ** 2) / (54 * 54) + ((y - pl.y) ** 2) / (32 * 32) <= 1) return { kind: 'plot', obj: pl };
    const pr = this.props.hit(x, y); if (pr) return { kind: 'prop', obj: pr };
    let best = null, bd = 34;
    for (const e of b.enemies) {
      if (e.dead || e.burrowed) continue;
      const ey = e.y - (e.flying ? e.def.fly : 0) - e.def.h * 0.45;
      const d = Math.hypot(x - e.x, (y - ey) * 0.8);
      if (d < bd + e.size * 0.5) { bd = d; best = e; }
    }
    if (best) return { kind: 'enemy', obj: best };
    return { kind: 'ground' };
  }

  onDragStart(p) { if (this.opt) return this.opt.onDragStart(p); if (this.popup || this.dialogue) return; this.dragging = true; }
  onDrag(dx, dy, p) {
    if (this.opt) return this.opt.onDrag(dx, dy, p);
    if (this.popup || this.dialogue || this.loading) return;
    this.cam.pan(dx, dy);
    this.dragV = { x: dx / (1 / 60), y: dy / (1 / 60) };
  }
  onDragEnd(p) { if (this.opt) return this.opt.onDragEnd(p); if (this.dragV) { this.cam.vx = clamp(this.dragV.x, -2400, 2400) * 0.5; this.cam.vy = clamp(this.dragV.y, -2400, 2400) * 0.5; } this.dragV = null; this.dragging = false; }
  onPinch(f, cx, cy, dx, dy) { if (this.opt) return true; if (this.popup || this.dialogue || this.loading) return; this.cam.zoomAt(f, cx, cy); this.cam.pan(dx, dy); }
  onWheel(dy, x, y) { if (this.opt) return this.opt.onWheel(dy, x, y); if (this.popup || this.dialogue || this.loading) return; this.cam.zoomAt(Math.exp(-dy * 0.0015), x, y); }
  onHover(p) {
    if (this.opt) return this.opt.onHover(p);
    if (this.loading) return;
    if (this.popup) { this.ui.move(p); return; }
    this.hud.hoverAt(p);
    if (this.spellMode || this.rallyTower) {
      const w = this.cam.toWorld(p.x, p.y);
      const ok = this.spellMode ? this.battle.validSpellSpot(this.spellMode, w.x, w.y) : this.battle.validRally(this.rallyTower, w.x, w.y);
      const r = this.spellMode === 'skyfall' ? 90 : 40;
      if (this.renderer.sel) this.renderer.sel.cursor = { x: w.x, y: w.y, r, ok };
    }
  }
  onKey(k) {
    if (this.opt) return this.opt.onKey(k);
    if (this.dialogue) { if (k === 'Enter' || k === ' ' || k === 'Escape') this.dialogue.tap(); return; }
    if (k === 'Escape') { if (this.popup && this.popup.kind === 'pause') this.closePopup(); else if (this.hud.menu || this.spellMode || this.rallyTower || this.renderer.sel) { this.hud.closeMenu(); this.spellMode = null; this.rallyTower = null; this.renderer.sel = null; } else this.togglePause(); return; }
    if (this.popup) return;
    if (k === ' ' || k === 'p' || k === 'P') this.togglePause();
    else if (k === '1') this.toggleSpell('skyfall');
    else if (k === '2') this.toggleSpell('militia');
    else if (k === 'h' || k === 'H') this.selectHero();
    else if (k === 'w' || k === 'W') { if (this.battle.callWave()) this.onWaveCalled(); }
    else if (k === 'f' || k === 'F') this.toggleSpeed();
  }
  onHidden() { if (this.battle && this.battle.state === 'running' && !this.popup && !Screen.isTouch) this.showPause(); }
  onResume() {}

  // ------------------------------------------------------------------ popups
  closePopup() { this.popup = null; this.ui.clear(); this.ui.modal = null; }

  showPause() {
    this.hud.closeMenu();
    const U = Screen.uiScale;
    const pop = { kind: 'pause' };
    pop.layout = () => {
      this.ui.clear(); this.ui.modal = 10;
      const W = Screen.gw, H = Screen.gh;
      const w = 420 * U, h = 420 * U;
      pop.rect = { x: (W - w) / 2, y: (H - h) / 2, w, h };
      const bw = 300 * U, bh = 56 * U, x = (W - bw) / 2;
      let y = pop.rect.y + 92 * U;
      this.ui.add(textButton(x, y, bw, bh, t('pause.resume'), () => this.closePopup(), { color: 'green', layer: 10 })); y += 70 * U;
      this.ui.add(textButton(x, y, bw, bh, t('pause.restart'), () => this.confirm(t('pause.restartQ'), () => this.restart()), { color: 'gold', layer: 10 })); y += 70 * U;
      this.ui.add(textButton(x, y, bw, bh, t('pause.options'), () => this.showOptions(), { color: 'blue', layer: 10 })); y += 70 * U;
      this.ui.add(textButton(x, y, bw, bh, t('pause.quit'), () => this.confirm(t('pause.quitQ'), () => this.quit()), { color: 'red', layer: 10 }));
    };
    pop.draw = (ctx) => {
      const r = pop.rect;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, Screen.gw, Screen.gh);
      panel(ctx, 'wood', r.x, r.y, r.w, r.h);
      text(ctx, t('pause.title'), r.x + r.w / 2, r.y + 46 * U, { size: 34 * U, align: 'center', color: '#ffe9a8', stroke: '#2a1606', weight: 900, fam: 'display' });
    };
    this.popup = pop; pop.layout();
    Audio.sfx('ui_open');
  }

  confirm(msg, yes) {
    const U = Screen.uiScale;
    const prev = this.popup;
    const pop = { kind: 'confirm' };
    pop.layout = () => {
      this.ui.clear(); this.ui.modal = 20;
      const W = Screen.gw, H = Screen.gh, w = 440 * U, h = 220 * U;
      pop.rect = { x: (W - w) / 2, y: (H - h) / 2, w, h };
      this.ui.add(textButton(pop.rect.x + 30 * U, pop.rect.y + h - 80 * U, 170 * U, 54 * U, t('ui.yes'), () => { this.closePopup(); yes(); }, { color: 'green', layer: 20 }));
      this.ui.add(textButton(pop.rect.x + w - 200 * U, pop.rect.y + h - 80 * U, 170 * U, 54 * U, t('ui.no'), () => { this.popup = prev; prev.layout(); }, { color: 'red', layer: 20 }));
    };
    pop.draw = (ctx) => {
      if (prev && prev.draw) prev.draw(ctx);
      const r = pop.rect;
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, Screen.gw, Screen.gh);
      panel(ctx, 'parchment', r.x, r.y, r.w, r.h);
      const lines = wrap(ctx, msg, r.w - 50 * U, 22 * U, 800);
      lines.forEach((ln, i) => text(ctx, ln, r.x + r.w / 2, r.y + 50 * U + i * 30 * U, { size: 22 * U, align: 'center', color: '#3a2412', weight: 800 }));
    };
    this.popup = pop; pop.layout();
  }

  showOptions() {
    this.opt = new OptionsPopup({ app: this.app, onClose: () => { this.opt = null; } }).open();
  }

  showNewEnemy(type) {
    const U = Screen.uiScale;
    const d = ENEMIES[type];
    const pop = { kind: 'newEnemy', t: 0 };
    pop.update = dt => { pop.t += dt; };
    pop.layout = () => {
      this.ui.clear(); this.ui.modal = 10;
      const W = Screen.gw, H = Screen.gh, w = Math.min(620 * U, W - 20), h = 300 * U;
      pop.rect = { x: (W - w) / 2, y: (H - h) / 2, w, h };
    };
    pop.tapAnywhere = () => { if (pop.t > 0.35) { this.closePopup(); Audio.sfx('ui_close'); } };
    pop.draw = (ctx) => {
      const r = pop.rect;
      const k = Math.min(1, pop.t * 5);
      ctx.fillStyle = `rgba(0,0,0,${0.5 * k})`; ctx.fillRect(0, 0, Screen.gw, Screen.gh);
      ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k); ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
      panel(ctx, 'parchment', r.x, r.y, r.w, r.h);
      text(ctx, t('hud.newEnemy'), r.x + r.w / 2, r.y - 4 * U, { size: 26 * U, align: 'center', color: '#ffd04a', stroke: '#2a1606', weight: 900, fam: 'display' });
      // portrait frame
      const px = r.x + 110 * U, py = r.y + r.h / 2;
      ctx.beginPath(); ctx.arc(px, py, 78 * U, 0, TAU); ctx.fillStyle = '#3a2a1c'; ctx.fill(); ctx.lineWidth = 4 * U; ctx.strokeStyle = '#d8b052'; ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.arc(px, py, 74 * U, 0, TAU); ctx.clip();
      ctx.fillStyle = '#6f8a4a'; ctx.fillRect(px - 80 * U, py - 80 * U, 160 * U, 160 * U);
      const f = Assets.frame('portrait/e_' + type) || unitFrame('e_' + type, 'idle', this.time);
      if (f) drawFrameFit(ctx, f, px, py + 6 * U, (d.boss ? 150 : 120) * U);
      ctx.restore();
      const tx = r.x + 210 * U, tw = r.w - 230 * U;
      text(ctx, t(`enemy.${type}.name`), tx, r.y + 44 * U, { size: 26 * U, color: '#4a1c0a', weight: 900 });
      const lines = wrap(ctx, t(`enemy.${type}.desc`), tw, 17 * U, 600);
      lines.slice(0, 5).forEach((ln, i) => text(ctx, ln, tx, r.y + 80 * U + i * 23 * U, { size: 17 * U, color: '#3a2412', weight: 600 }));
      const st = [`${t('stat.hp')} ${Math.round(d.hp * this.battle.hpMul)}`, `${t('stat.armor')} ${armorWord(d.armor)}`, `${t('stat.mr')} ${armorWord(d.mr)}`, `${t('stat.speed')} ${speedWord(d.speed)}`];
      text(ctx, st.join('  ·  '), tx, r.y + r.h - 64 * U, { size: 15 * U, color: '#6a3a10', weight: 800, maxWidth: tw });
      const tip = t(`enemy.${type}.tip`);
      if (tip && !tip.startsWith('enemy.')) text(ctx, '💡 ' + tip, tx, r.y + r.h - 36 * U, { size: 15 * U, color: '#2a5a1a', weight: 800, maxWidth: tw });
      ctx.restore();
      if (pop.t > 0.6) text(ctx, t('ui.tapContinue'), Screen.gw / 2, r.y + r.h + 24 * U, { size: 17 * U, align: 'center', color: '#fff', stroke: '#000', weight: 700, alpha: 0.6 + 0.4 * Math.sin(this.time * 4) });
    };
    this.popup = pop; pop.layout();
    Audio.sfx('ui_open');
  }

  // ------------------------------------------------------------------ victory / defeat
  onVictory() {
    const b = this.battle, slot = Save.slot;
    const stars = b.starsEarned();
    let first = false;
    const res = { stars, xp: Math.round(b.heroXpGained), newHero: null, unlocked: null };
    if (slot) {
      const st = Save.stage(this.stageId);
      first = !st.done;
      if (this.mode === 'campaign') { st.done = true; st.stars = Math.max(st.stars || 0, stars); st.bestLives = Math.max(st.bestLives || 0, b.lives); }
      else if (this.mode === 'heroic') st.heroic = true;
      else if (this.mode === 'iron') st.iron = true;
      const h = b.heroes[0];
      if (h) { slot.heroes[h.heroId] = slot.heroes[h.heroId] || { xp: 0 }; slot.heroes[h.heroId].xp = h.xp + 60 + this.level.idx * 8; }
      this.applyStats(slot, b);
      slot.stats.victories++;
      // hero unlocks
      for (const [id, H] of Object.entries(HEROES)) if (H.unlock === this.stageId && !slot.heroes[id]) { slot.heroes[id] = { xp: { kaela: 0, seren: 300, torvald: 1350, aerin: 3000, ysolde: 5400 }[id] || 0 }; res.newHero = id; }
      res.firstClear = first && this.mode === 'campaign';
      res.achievements = Achievements.check(slot, { battle: b, stageId: this.stageId, mode: this.mode, stars });
      Save.persist();
    }
    Audio.playMusic('victory', { fadeIn: 0, fadeOut: 0.6, loop: false });
    Audio.stopAmb(1);
    Audio.sfx('victory_cheer', { vol: 0.6 });
    // story beat after the fight (first time only), then the results
    const post = this.mode === 'campaign' && this.level.story && this.level.story.post;
    const seenKey = 'post_' + this.stageId;
    if (post && STORY[post] && (!slot || !slot.story[seenKey])) {
      if (slot) { slot.story[seenKey] = true; Save.persist(); }
      setTimeout(() => this.startDialogue(post, () => this.showResult(true, res)), 900);
    } else this.showResult(true, res);
  }

  onDefeat() {
    const b = this.battle, slot = Save.slot;
    if (slot) {
      const h = b.heroes[0];
      if (h) { slot.heroes[h.heroId] = slot.heroes[h.heroId] || { xp: 0 }; slot.heroes[h.heroId].xp = Math.round(h.xpStart + (h.xp - h.xpStart) * 0.5); }
      this.applyStats(slot, b);
      slot.stats.defeats++;
      Achievements.check(slot, { battle: b, stageId: this.stageId, mode: this.mode, stars: 0, defeat: true });
      Save.persist();
    }
    Audio.playMusic('defeat', { fadeIn: 0, fadeOut: 0.5, loop: false });
    Audio.stopAmb(1);
    this.showResult(false, {});
  }

  applyStats(slot, b) {
    const S = slot.stats, st = b.stats;
    S.kills += st.kills; S.goldEarned += st.goldEarned; S.towersBuilt += st.towersBuilt; S.wavesEarly += st.earlyCalls;
    S.meteors += st.meteors; S.reinforcements += st.reinforcements; S.heroDeaths += st.heroDeaths; S.sheep += st.sheep;
    S.leaks += st.leaks; S.upgradesBought += st.upgrades; S.sold += st.sold; S.bossKills += st.bossKills;
  }

  showResult(won, res) {
    const U = Screen.uiScale;
    const pop = { kind: 'result', t: 0, won, res };
    pop.update = dt => {
      const before = pop.t; pop.t += dt;
      if (won) for (let i = 0; i < res.stars; i++) { const at = 0.7 + i * 0.45; if (before < at && pop.t >= at) Audio.sfx('ui_star'); }
    };
    pop.layout = () => {
      this.ui.clear(); this.ui.modal = 10;
      const W = Screen.gw, H = Screen.gh, w = 520 * U, h = 400 * U;
      pop.rect = { x: (W - w) / 2, y: (H - h) / 2 + 20 * U, w, h };
      const r = pop.rect, bw = 210 * U, bh = 58 * U;
      if (won) {
        this.ui.add(textButton(r.x + w / 2 - bw - 12 * U, r.y + h - 86 * U, bw, bh, t('result.restart'), () => this.restart(), { color: 'gold', layer: 10 }));
        this.ui.add(textButton(r.x + w / 2 + 12 * U, r.y + h - 86 * U, bw, bh, t('result.continue'), () => this.leaveAfterVictory(res), { color: 'green', layer: 10 }));
      } else {
        this.ui.add(textButton(r.x + w / 2 - bw - 12 * U, r.y + h - 86 * U, bw, bh, t('result.quit'), () => this.quit(), { color: 'red', layer: 10 }));
        this.ui.add(textButton(r.x + w / 2 + 12 * U, r.y + h - 86 * U, bw, bh, t('result.retry'), () => this.restart(), { color: 'green', layer: 10 }));
      }
    };
    pop.draw = (ctx) => {
      const r = pop.rect, k = Math.min(1, pop.t * 3);
      ctx.fillStyle = `rgba(0,0,0,${0.55 * k})`; ctx.fillRect(0, 0, Screen.gw, Screen.gh);
      ctx.save(); ctx.globalAlpha = k;
      panel(ctx, won ? 'parchment' : 'wood', r.x, r.y, r.w, r.h);
      const title = won ? t('result.victory') : t('result.defeat');
      text(ctx, title, r.x + r.w / 2, r.y - 10 * U, { size: 52 * U, align: 'center', color: won ? '#ffd04a' : '#ff6a5a', stroke: '#2a1606', strokeWidth: 9 * U, weight: 900, fam: 'display' });
      if (won) {
        const n = this.mode === 'campaign' ? 3 : 1;
        for (let i = 0; i < n; i++) {
          const at = 0.7 + i * 0.45;
          const sx = r.x + r.w / 2 + (i - (n - 1) / 2) * 96 * U, sy = r.y + 92 * U - (i === 1 && n === 3 ? 14 * U : 0);
          drawStar(ctx, sx, sy, 38 * U, false);
          if (i < res.stars && pop.t > at) { const q = Math.min(1, (pop.t - at) / 0.25); const s = q < 1 ? 1.6 - 0.6 * q : 1; drawStar(ctx, sx, sy, 38 * U * s, true); }
        }
        const lines = [];
        if (this.mode !== 'campaign') lines.push(t(this.mode === 'heroic' ? 'result.heroicDone' : 'result.ironDone'));
        lines.push(t('result.lives', { n: this.battle.lives }));
        if (res.xp) lines.push(t('result.xp', { n: res.xp }));
        if (res.newHero) lines.push(t('result.newHero', { name: t(`hero.${res.newHero}.name`) }));
        if (res.achievements && res.achievements.length) lines.push(t('result.achievements', { n: res.achievements.length }));
        lines.forEach((ln, i) => text(ctx, ln, r.x + r.w / 2, r.y + 170 * U + i * 30 * U, { size: 20 * U, align: 'center', color: '#3a2412', weight: 800 }));
      } else {
        const lines = wrap(ctx, t('result.defeatTip' + (1 + (this.stageId.length % 3))), r.w - 80 * U, 20 * U, 700);
        lines.forEach((ln, i) => text(ctx, ln, r.x + r.w / 2, r.y + 120 * U + i * 30 * U, { size: 20 * U, align: 'center', color: '#fff2d8', stroke: '#2a1606', weight: 700 }));
      }
      ctx.restore();
    };
    this.popup = pop; pop.layout();
  }

  leaveAfterVictory(res) {
    const slot = Save.slot;
    const wm = { scene: 'worldmap', params: { focus: res.firstClear ? nextStageId(this.stageId) || this.stageId : this.stageId, justCleared: res.firstClear ? this.stageId : null } };
    // chapter interludes / the ending play once, the first time the stage is won
    const cine = this.mode === 'campaign' && this.level.story && this.level.story.cine;
    if (cine && (!slot || !slot.story[cine])) {
      Audio.stopMusic(0.8);
      const next = cine === 'ending' ? { scene: 'credits', params: { next: { scene: 'title', params: { menu: true } } } } : wm;
      this.app.go('cutscene', { id: cine, next });
      return;
    }
    this.app.go(wm.scene, wm.params);
  }
  restart() { this.app.go('battle', Object.assign({}, this.params, { restarted: true })); }
  quit() { Audio.stopMusic(0.8); this.app.go('worldmap', { focus: this.stageId }); }

  // ------------------------------------------------------------------ dialogue
  startDialogue(id, after) {
    this.hud.closeMenu();
    this.dialogue = new Dialogue(STORY[id], () => { this.dialogue = null; if (after) { after(); return; } if (!this.battle.started && !this.introShown) { this.introShown = true; this.introBanner(); } });
    this.dialogue.layout();
  }

  // ------------------------------------------------------------------ tutorial (stage 1-1)
  updateTutorial(dt) { this.tutorial.t += dt; }
  tutEvent(ev) {
    const tu = this.tutorial; if (!tu) return;
    const order = ['build', 'wave', 'spell', 'hero'];
    if (order[tu.step] === ev) { tu.step++; tu.t = 0; if (tu.step >= order.length) this.tutorial = null; }
  }
  drawTutorial(ctx) {
    const tu = this.tutorial; if (!tu || this.popup || this.dialogue) return;
    const U = Screen.uiScale;
    const keys = ['tut.build', 'tut.wave', 'tut.spell', 'tut.hero'];
    const k = keys[tu.step]; if (!k) return;
    if (tu.step === 1 && this.battle.started) { tu.step++; return; }
    const msg = t(k);
    const w = Math.min(520 * U, Screen.gw - 40), lines = wrap(ctx, msg, w - 30 * U, 18 * U, 700);
    const h = 22 * U + lines.length * 25 * U;
    const x = (Screen.gw - w) / 2, y = 82 * U;
    ctx.save(); ctx.globalAlpha = Math.min(1, tu.t * 2);
    panel(ctx, 'dark', x, y, w, h);
    lines.forEach((ln, i) => text(ctx, ln, Screen.gw / 2, y + 22 * U + i * 25 * U, { size: 18 * U, align: 'center', color: '#fff2c0', weight: 700 }));
    ctx.restore();
  }

  // ------------------------------------------------------------------ render
  render(ctx, w, h) {
    if (this.loading) {
      ctx.fillStyle = '#0c0805'; ctx.fillRect(0, 0, w, h);
      const U = Screen.uiScale;
      text(ctx, t('loading'), w / 2, h / 2 - 20 * U, { size: 24 * U, align: 'center', color: '#e9c46a', weight: 800 });
      ctx.fillStyle = '#2a1a0c'; ctx.fillRect(w / 2 - 150 * U, h / 2 + 10 * U, 300 * U, 10 * U);
      ctx.fillStyle = '#e9a43a'; ctx.fillRect(w / 2 - 150 * U, h / 2 + 10 * U, 300 * U * this.loadProg, 10 * U);
      return;
    }
    const dpr = Screen.dpr;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    if (this.spellMode && this.renderer.sel && !this.renderer.sel.cursor && Screen.isTouch) {
      // touch: show a hint instead of cursor
    }
    this.renderer.render(ctx, dpr, this.blocking ? 0 : (1 / 60) * this.speed);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.lifeFlash > 0) { ctx.save(); ctx.globalAlpha = Math.min(0.35, this.lifeFlash * 0.3); vignette(ctx, w, h, 1); ctx.fillStyle = 'rgba(200,20,10,0.25)'; ctx.fillRect(0, 0, w, h); ctx.restore(); }
    this.hud.draw(ctx);
    if (this.spellMode) {
      const U = Screen.uiScale;
      text(ctx, t(this.spellMode === 'skyfall' ? 'hud.pickSkyfall' : 'hud.pickMilitia'), w / 2, h - 30 * U, { size: 19 * U, align: 'center', color: '#fff2c0', stroke: '#2a1606', weight: 800 });
    } else if (this.rallyTower) {
      const U = Screen.uiScale;
      text(ctx, t('hud.pickRally'), w / 2, h - 30 * U, { size: 19 * U, align: 'center', color: '#fff2c0', stroke: '#2a1606', weight: 800 });
    } else if (this.renderer.sel && this.renderer.sel.kind === 'hero') {
      const U = Screen.uiScale;
      text(ctx, t('hud.pickHero'), w / 2, h - 110 * U, { size: 17 * U, align: 'center', color: '#d8ffc8', stroke: '#1a2a0a', weight: 800 });
    }
    this.drawTutorial(ctx);
    if (this.dialogue) this.dialogue.draw(ctx);
    if (this.popup) { this.popup.draw(ctx); this.ui.draw(ctx); }
    if (this.opt) this.opt.draw(ctx);
  }
}
