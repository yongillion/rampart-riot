// Rampart Riot — battle state & rules (DOM-free; runs in the browser and in the Node simulator)
import { Path } from './path.js';
import { Enemy } from './enemy.js';
import { Soldier, Hero } from './soldier.js';
import { Tower } from './tower.js';
import { Projectile } from './projectile.js';
import { TOWERS, UNITS } from '../data/towers.js';
import { SPELLS, buildMods } from '../data/upgrades.js';
import { ENEMIES } from '../data/enemies.js';
import { RNG, inRange, rangeDist, compact } from '../core/util.js';
import { damageEnemy, splash, slowEnemy, burnEnemy, shredEnemy, targetable, damageSoldier, soldierTargetable, enemiesInRange, firstTarget } from './combat.js';

const NOFX = new Proxy({}, { get: () => () => {} });
export const FIELD = { w: 2400, h: 1350, px: 240, py: 135, pw: 1920, ph: 1080 };
const DIFF_HP = { casual: 0.78, normal: 1, veteran: 1.32 };

export class Battle {
  constructor(level, o = {}) {
    this.level = level;
    this.mode = o.mode || 'campaign';
    this.heroic = this.mode === 'heroic';
    this.iron = this.mode === 'iron';
    this.fx = o.fx || NOFX;
    this.onNotify = o.onNotify || null;
    this.rng = new RNG(o.seed ?? 20261008);
    this.mods = buildMods(o.upgrades || {});
    this.difficulty = o.difficulty || 'normal';
    this.hpMul = DIFF_HP[this.difficulty] || 1;
    this.bossHpMul = 1;
    this.t = 0; this.nextId = 1;
    const modeCfg = this.heroic ? level.heroic : this.iron ? level.iron : null;
    this.gold = modeCfg && modeCfg.gold ? modeCfg.gold : level.gold;
    this.lives = this.heroic || this.iron ? 1 : 20;
    this.maxLives = this.lives;
    this.allowed = this.iron && level.iron && level.iron.allowed ? level.iron.allowed : null; // allowed tower lines
    this.paths = level.paths.map((p, i) => new Path(p.pts, { id: i, width: p.width ?? 26, air: !!p.air }));
    this.plots = level.plots.map((p, i) => ({ i, x: p[0], y: p[1], tower: null }));
    this.towers = []; this.enemies = []; this.soldiers = []; this.projectiles = []; this.zones = []; this.turrets = [];
    this.heroes = [];
    if (o.hero) {
      const hp = level.hero || [FIELD.w / 2, FIELD.h / 2];
      const h = new Hero(this, o.hero.id, o.hero.xp || 0, { x: hp[0], y: hp[1] });
      this.soldiers.push(h); this.heroes.push(h);
    }
    const sky = SPELLS.skyfall, mil = SPELLS.militia;
    this.spells = {
      skyfall: { cd: Math.max(30, sky.cd - this.mods.skyCdCut), t: 0, locked: false },
      militia: { cd: mil.cd, t: 0, locked: false },
    };
    if (o.lockedSpells) for (const s of o.lockedSpells) if (this.spells[s]) this.spells[s].locked = true;
    this.waves = (modeCfg && modeCfg.waves) || level.waves;
    this.waveIdx = 0;
    this.waveStartT = -999;
    this.nextWaveIn = Infinity;   // countdown to auto-start of next wave
    this.spawnQueue = [];
    this.state = 'running';
    this.endT = 0;
    this.events = [];
    this.stats = { kills: 0, leaks: 0, damage: 0, goldEarned: 0, towersBuilt: 0, sold: 0, spellsCast: 0, meteors: 0, reinforcements: 0, earlyCalls: 0, earlyGold: 0, sheep: 0, killsByType: {}, maxTowerLevel: 0, heroDeaths: 0, bossKills: 0, upgrades: 0, skills: 0 };
    this.heroXpGained = 0;
    this.started = false;
  }

  notify(kind, data = {}) {
    const ev = Object.assign({ kind, t: this.t }, data);
    this.events.push(ev);
    if (this.onNotify) this.onNotify(ev);
  }

  // ---------------- waves ----------------
  get totalWaves() { return this.waves.length; }
  waveVisible() {
    if (this.state !== 'running' || this.waveIdx >= this.waves.length) return false;
    if (!this.started) return true;
    return this.t - this.waveStartT > 5;
  }
  wavePaths(i = this.waveIdx) {
    const w = this.waves[i]; if (!w) return [];
    const set = new Set();
    for (const g of w.groups) set.add(g.path ?? 0);
    return [...set];
  }
  waveComposition(i = this.waveIdx) {
    const w = this.waves[i]; if (!w) return [];
    const m = new Map();
    for (const g of w.groups) m.set(g.e, (m.get(g.e) || 0) + (g.n || 1));
    return [...m.entries()].map(([e, n]) => ({ e, n }));
  }
  earlyBonus() {
    if (!this.started || !isFinite(this.nextWaveIn)) return 0;
    return Math.max(0, Math.round(this.nextWaveIn * (this.level.earlyRate ?? 1.0)));
  }
  callWave() {
    if (this.state !== 'running' || this.waveIdx >= this.waves.length) return false;
    if (this.started && !this.waveVisible()) return false;
    if (this.started && isFinite(this.nextWaveIn) && this.nextWaveIn > 0.5) {
      const bonus = this.earlyBonus();
      this.gold += bonus; this.stats.earlyGold += bonus; this.stats.earlyCalls++;
      for (const s of Object.values(this.spells)) s.t = Math.max(0, s.t - this.nextWaveIn * 0.5);
      this.notify('earlyCall', { bonus });
      this.fx.sfx('wave_early');
    } else this.fx.sfx('wave_incoming');
    this.startWave();
    return true;
  }
  startWave() {
    const i = this.waveIdx;
    const w = this.waves[i];
    this.started = true;
    this.waveIdx++;
    this.waveStartT = this.t;
    let end = 0;
    for (const g of w.groups) {
      const n = g.n || 1;
      for (let k = 0; k < n; k++) {
        const at = (g.at || 0) + k * (g.every ?? 1);
        this.spawnQueue.push({ t: this.t + at, e: g.e, path: g.path ?? 0, elite: !!(g.elite || this.heroic), lane: g.lane });
        end = Math.max(end, at);
      }
    }
    this.spawnQueue.sort((a, b) => a.t - b.t);
    const gap = w.gap ?? this.level.gap ?? 22;
    this.nextWaveIn = this.waveIdx < this.waves.length ? end + gap : Infinity;
    this.notify('waveStart', { wave: this.waveIdx, total: this.waves.length, boss: w.boss });
  }

  // ---------------- entities ----------------
  spawnEnemy(type, pathIdx, o = {}) {
    if (!ENEMIES[type]) return null;
    const p = Math.min(pathIdx, this.paths.length - 1);
    const e = new Enemy(this, type, p, o);
    this.enemies.push(e);
    this.notify('spawn', { type, e });
    return e;
  }
  projectile(kind, x, y, target, o = {}) {
    const p = new Projectile(this, kind, x, y, target, o);
    this.projectiles.push(p);
    return p;
  }
  addZone(z) { z.t = 0; z.tick = 0; this.zones.push(z); this.notify('zone', { z }); return z; }
  addTurret(x, y, o) {
    const tu = { x, y, life: o.dur, maxLife: o.dur, cdT: 0.5, cd: 0.8, range: o.range, dmg: o.dmg, src: o.src, aimX: x + 1, shotT: 9, uid: this.nextId++ };
    this.turrets.push(tu);
    this.fx.burst('dust', x, y);
    return tu;
  }

  heroXp(h, a) { if (h && h.isHero && !h.dead) { h.gainXp(a); this.heroXpGained += a; } }

  enemyShoot(e, target) {
    const r = e.def.ranged;
    const kind = r.proj === 'stone' ? 'stone' : r.proj === 'bolt' ? 'ebolt' : r.proj === 'arrow' ? 'earrow' : 'ember';
    this.projectile(kind, e.x + e.facing * (r.ox ?? 6), e.y - (r.oy ?? e.def.h * 0.6), target, { dmg: r.dmg, src: e, magic: r.magic });
    this.fx.sfx(kind === 'ebolt' ? 'crossbow_shoot' : kind === 'ember' ? 'magic_cast' : 'arrow_shoot', e.x, { vol: 0.35 });
  }

  chainLightning(tower, first, n) {
    const hit = new Set();
    let cur = first, px = tower.ox(), py = tower.oy();
    let mul = 1;
    for (let k = 0; k <= n && cur; k++) {
      hit.add(cur);
      const dmg = this.rng.range(tower.dmg[0], tower.dmg[1]) * mul;
      this.fx.beam('lightning', px, py, cur.x, cur.y - cur.def.h * 0.5 - (cur.flying ? cur.def.fly : 0));
      damageEnemy(this, cur, dmg, 'magic', tower);
      if (this.mods.mageSlow) slowEnemy(cur, 1 - this.mods.mageSlow, 1);
      px = cur.x; py = cur.y - cur.def.h * 0.5 - (cur.flying ? cur.def.fly : 0);
      mul *= 0.72;
      let next = null, bd = 160;
      for (const e of this.enemies) {
        if (hit.has(e) || !targetable(e, true)) continue;
        const d = rangeDist(cur.x, cur.y, e.x, e.y);
        if (d < bd) { bd = d; next = e; }
      }
      cur = next;
    }
  }

  pierceShot(tower, e, dmg) {
    const x0 = tower.ox(), y0 = tower.oy();
    const ang = Math.atan2(e.y - e.def.h * 0.5 - y0, e.x - x0);
    const L = 760;
    const x1 = x0 + Math.cos(ang) * L, y1 = y0 + Math.sin(ang) * L;
    this.projectile('piercebolt', x0, y0, null, { tx: x1, ty: y1 });
    const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy;
    for (const t of this.enemies.slice()) {
      if (!targetable(t, true)) continue;
      const ty = t.y - t.def.h * 0.5;
      const u = Math.max(0, Math.min(1, ((t.x - x0) * dx + (ty - y0) * dy) / len2));
      const px = x0 + dx * u, py = y0 + dy * u;
      if (Math.hypot(t.x - px, ty - py) < 26 + t.size) { damageEnemy(this, t, dmg, 'true', tower); this.fx.burst('boltbig', t.x, ty); }
    }
    this.fx.sfx('bolt_pierce', tower.x);
  }

  leak(e) {
    if (e.removed) return;
    e.removed = true; e.release();
    this.lives = Math.max(0, this.lives - (e.def.lives || 1));
    this.stats.leaks++;
    this.fx.sfx('life_lost');
    this.notify('leak', { e, lives: this.lives });
    if (this.lives <= 0 && this.state === 'running') { this.state = 'lost'; this.endT = 0; this.notify('defeat'); }
  }

  killEnemy(e, src) {
    if (e.dead) return;
    const def = e.def;
    if (def.revive && !e.revived) {
      e.revived = true; e.reviving = def.revive.delay; e.untargetable = true; e.hp = 1; e.release();
      e.setAnim('death');
      this.fx.sfx(def.death || 'enemy_death', e.x, { vol: 0.6 });
      return;
    }
    e.dead = true; e.hp = 0; e.release();
    e.burns.length = 0;
    e.setAnim('death'); e.deathT = 0;
    const gold = def.gold;
    this.gold += gold; this.stats.goldEarned += gold; this.stats.kills++;
    this.stats.killsByType[e.type] = (this.stats.killsByType[e.type] || 0) + 1;
    if (def.boss) this.stats.bossKills++;
    for (const h of this.heroes) {
      if (h.dead) continue;
      const bonus = src === h ? 1.0 : 0.45;
      if (src === h || rangeDist(h.x, h.y, e.x, e.y) < 280) this.heroXp(h, def.xp * bonus * 3);
    }
    if (def.onDeath) {
      const od = def.onDeath;
      if (od.spawn) for (let i = 0; i < od.count; i++) {
        const n = this.spawnEnemy(od.spawn, e.pathIdx, { s: Math.max(0, e.s - 8 - i * 14), elite: e.elite, lane: e.lane + (i - (od.count - 1) / 2) * 16 });
        if (n) this.fx.burst('summon', n.x, n.y);
      }
      if (od.explode) {
        for (const s of this.soldiers) if (soldierTargetable(s) && !s.flying && inRange(e.x, e.y, s.x, s.y, od.explode.radius)) damageSoldier(this, s, od.explode.dmg, 'phys', e);
        this.fx.explosion(e.x, e.y, 0.7, 'fire'); this.fx.shake(2);
      }
      if (od.cloud) this.addZone({ kind: 'plague', x: e.x, y: e.y, r: od.cloud.radius, dur: od.cloud.dur, dps: od.cloud.dps });
    }
    this.fx.sfx(def.death || 'enemy_death', e.x, { vol: def.boss ? 1 : 0.5 });
    this.fx.kill(e, gold);
    if (def.boss) { this.fx.shake(14); this.notify('bossDefeated', { e }); }
  }

  onHeroDeath(h) { this.stats.heroDeaths++; this.notify('heroDied', { hero: h }); }

  // ---------------- player commands ----------------
  canAfford(c) { return this.gold >= c; }
  lineAllowed(line) { return !this.allowed || this.allowed.includes(line); }

  build(plotIdx, id) {
    const plot = this.plots[plotIdx];
    if (!plot || plot.tower || this.state !== 'running') return null;
    const def = TOWERS[id];
    if (!def || def.level !== 1 || !this.lineAllowed(def.line)) return null;
    const tw = new Tower(this, plot, id);
    const cost = tw.spent;
    if (this.gold < cost) { tw.remove(); return null; }
    this.gold -= cost;
    plot.tower = tw;
    this.towers.push(tw);
    this.stats.towersBuilt++;
    this.stats.maxTowerLevel = Math.max(this.stats.maxTowerLevel, 1);
    this.fx.sfx('build_tower', tw.x);
    this.fx.burst('build', tw.x, tw.y);
    this.notify('build', { tower: tw });
    return tw;
  }
  upgrade(tw, toId) {
    if (!tw || this.state !== 'running') return false;
    const def = tw.def;
    if (!def.next || !def.next.includes(toId)) return false;
    const cost = tw.upgradeCost(toId);
    if (this.gold < cost) return false;
    this.gold -= cost;
    tw.upgradeTo(toId);
    this.stats.upgrades++;
    this.stats.maxTowerLevel = Math.max(this.stats.maxTowerLevel, tw.level);
    this.fx.sfx('upgrade_tower', tw.x);
    this.fx.burst('build', tw.x, tw.y);
    this.notify('upgrade', { tower: tw });
    return true;
  }
  buySkill(tw, sk) {
    if (!tw || !tw.def.skills || !tw.def.skills.includes(sk)) return false;
    const cost = tw.skillCost(sk);
    if (!isFinite(cost) || this.gold < cost) return false;
    this.gold -= cost;
    tw.buySkill(sk);
    this.stats.skills++;
    this.fx.sfx('ui_stars_spend', tw.x);
    this.fx.burst('skillup', tw.x, tw.y - tw.top);
    this.notify('skill', { tower: tw, skill: sk });
    return true;
  }
  sell(tw) {
    if (!tw) return false;
    const v = tw.sellValue;
    this.gold += v;
    tw.remove();
    tw.plot.tower = null;
    const i = this.towers.indexOf(tw); if (i >= 0) this.towers.splice(i, 1);
    this.stats.sold++;
    this.fx.sfx('sell_tower', tw.x);
    this.fx.burst('sell', tw.x, tw.y);
    this.notify('sell', { tower: tw, value: v });
    return true;
  }
  // nearest point on any path; returns {x,y,d,path}
  nearestPathPoint(x, y) {
    let best = null;
    for (const p of this.paths) {
      if (p.air) continue;
      const n = p.nearest(x, y);
      if (!best || n.d < best.d) { const q = p.pos(n.s, 0, {}); best = { x: q.x, y: q.y, d: n.d, path: p, s: n.s }; }
    }
    return best;
  }
  defaultRally(tw) {
    let best = null;
    for (const p of this.paths) {
      if (p.air) continue;
      // sample points within range, choose the nearest one to the tower
      for (let s = 0; s < p.len; s += 12) {
        const q = p.pos(s, 0, {});
        if (q.x < FIELD.px - 40 || q.x > FIELD.px + FIELD.pw + 40 || q.y < FIELD.py - 40 || q.y > FIELD.py + FIELD.ph + 40) continue;
        const d = Math.hypot(q.x - tw.x, (q.y - tw.y) / 0.8);
        if (d <= tw.range * 0.9 && (!best || d < best.d)) best = { x: q.x, y: q.y, d };
      }
    }
    return best ? { x: best.x, y: best.y } : { x: tw.x, y: tw.y + 50 };
  }
  validRally(tw, x, y) {
    if (!inRange(tw.x, tw.y, x, y, tw.range)) return false;
    const n = this.nearestPathPoint(x, y);
    return n && n.d < 70;
  }
  setRally(tw, x, y) {
    if (!this.validRally(tw, x, y)) return false;
    tw.setRally(x, y);
    this.fx.sfx('rally', x);
    this.fx.burst('rally', x, y);
    return true;
  }
  validHeroSpot(h, x, y) {
    if (x < 40 || y < 40 || x > FIELD.w - 40 || y > FIELD.h - 40) return false;
    if (h.flying) return true;
    const n = this.nearestPathPoint(x, y);
    return n && n.d < 130;
  }
  moveHero(h, x, y) {
    if (!h || h.dead) return false;
    if (!this.validHeroSpot(h, x, y)) {
      const n = this.nearestPathPoint(x, y);
      if (!n || n.d > 260) return false;
      // clamp to the walkable band near the path
      const k = 110 / n.d;
      x = n.x + (x - n.x) * Math.min(1, k); y = n.y + (y - n.y) * Math.min(1, k);
    }
    h.moveTo(x, y);
    this.fx.sfx('hero_move', x, { vol: 0.6 });
    this.fx.burst('moveflag', x, y);
    return true;
  }
  spellReady(id) { const s = this.spells[id]; return s && !s.locked && s.t <= 0 && this.state === 'running' && this.started; }
  validSpellSpot(id, x, y) {
    if (id === 'militia') { const n = this.nearestPathPoint(x, y); return n && n.d < 90; }
    return x > 0 && y > 0 && x < FIELD.w && y < FIELD.h;
  }
  castSpell(id, x, y) {
    if (!this.spellReady(id) || !this.validSpellSpot(id, x, y)) return false;
    const sp = this.spells[id];
    sp.t = sp.cd;
    this.stats.spellsCast++;
    if (id === 'skyfall') {
      const cfg = SPELLS.skyfall, m = this.mods;
      const n = cfg.meteors + m.skyExtra;
      const r = cfg.radius * m.skyRadius;
      this.stats.meteors += n;
      for (let i = 0; i < n; i++) {
        const a = this.rng.next() * Math.PI * 2, d = i === 0 ? 0 : this.rng.range(20, cfg.spread * (m.skyCataclysm ? 1.6 : 1));
        const tx = x + Math.cos(a) * d, ty = y + Math.sin(a) * d * 0.7;
        this.projectile('meteor', tx, ty, null, { tx, ty, delay: i * 0.22, radius: r, dmg: cfg.dmg, scorch: m.skyScorch });
      }
      this.fx.sfx('meteor_fall');
    } else if (id === 'militia') {
      const m = this.mods;
      const n = SPELLS.militia.count + (m.milThird ? 1 : 0);
      const kind = m.milArmor > 0 ? 'veteran' : 'levy';
      for (let i = 0; i < n; i++) {
        const ox = (i - (n - 1) / 2) * 26, oy = i === 2 ? 14 : 0;
        const s = new Soldier(this, kind, { x: x + ox, y: y + oy - 4, homeX: x + ox, homeY: y + oy, life: SPELLS.militia.dur, engageR: 90, spawnFx: true });
        s.javelin = m.milJavelin;
        this.soldiers.push(s);
      }
      this.stats.reinforcements += n;
      this.fx.sfx('reinforcements', x);
    }
    this.notify('spell', { id, x, y });
    return true;
  }

  // ---------------- simulation step ----------------
  update(dt) {
    if (this.state !== 'running') {
      this.endT += dt;
      // keep visuals alive after the end
      for (const e of this.enemies) if (e.dead) e.update(dt);
      for (const p of this.projectiles) if (!p.dead && this.state === 'won') p.update(dt);
      compact(this.projectiles, p => p.dead);
      return;
    }
    this.t += dt;
    for (const s of Object.values(this.spells)) if (s.t > 0) s.t -= dt;
    // waves
    if (this.started && isFinite(this.nextWaveIn)) {
      this.nextWaveIn -= dt;
      if (this.nextWaveIn <= 0 && this.waveIdx < this.waves.length) { this.fx.sfx('wave_incoming'); this.startWave(); }
    }
    while (this.spawnQueue.length && this.spawnQueue[0].t <= this.t) {
      const q = this.spawnQueue.shift();
      this.spawnEnemy(q.e, q.path, { elite: q.elite, lane: q.lane });
    }
    for (const tw of this.towers) tw.update(dt);
    for (const tu of this.turrets) this.updateTurret(tu, dt);
    for (const s of this.soldiers) s.update(dt);
    for (const e of this.enemies) e.update(dt);
    for (const p of this.projectiles) if (!p.dead) p.update(dt);
    for (const z of this.zones) this.updateZone(z, dt);
    compact(this.enemies, e => e.removed);
    compact(this.soldiers, s => s.removed);
    compact(this.projectiles, p => p.dead);
    compact(this.zones, z => z.t >= z.dur);
    compact(this.turrets, t => t.life <= 0);
    // victory
    if (this.state === 'running' && this.waveIdx >= this.waves.length && !this.spawnQueue.length && !this.enemies.some(e => !e.dead)) {
      this.state = 'won'; this.endT = 0;
      this.notify('victory', { lives: this.lives, stars: this.starsEarned() });
    }
  }

  starsEarned() {
    if (this.state !== 'won') return 0;
    if (this.heroic || this.iron) return 1;
    return this.lives >= 18 ? 3 : this.lives >= 6 ? 2 : 1;
  }

  updateTurret(tu, dt) {
    tu.life -= dt; tu.shotT += dt;
    tu.cdT -= dt;
    if (tu.cdT > 0) return;
    const list = enemiesInRange(this, tu.x, tu.y, tu.range, true, []);
    const e = firstTarget(list);
    if (!e) { tu.cdT = 0.1; return; }
    tu.cdT = tu.cd; tu.shotT = 0; tu.aimX = e.x;
    this.projectile('cannonball', tu.x + (e.x < tu.x ? -10 : 10), tu.y - 18, e, { dmg: tu.dmg, src: tu.src });
    this.fx.sfx('bomb_launch', tu.x, { vol: 0.3 });
  }

  updateZone(z, dt) {
    z.t += dt;
    z.tick -= dt;
    const tick = z.tick <= 0;
    if (tick) z.tick = 0.25;
    switch (z.kind) {
      case 'blizzard':
        if (tick) for (const e of this.enemies) if (targetable(e, false) && inRange(z.x, z.y, e.x, e.y, z.r)) { slowEnemy(e, 1 - z.slow, 0.4); damageEnemy(this, e, z.dps * 0.25, 'magic', z.src); }
        break;
      case 'acid':
        if (tick) for (const e of this.enemies) if (targetable(e, false) && inRange(z.x, z.y, e.x, e.y, z.r)) { shredEnemy(e, 0.3, 1); damageEnemy(this, e, z.dps * 0.25, 'true', z.src); }
        break;
      case 'fire':
        if (tick) for (const e of this.enemies) if (targetable(e, false) && inRange(z.x, z.y, e.x, e.y, z.r)) burnEnemy(e, z.dps, 1, 'ground', z.src);
        break;
      case 'plague':
        if (tick) for (const s of this.soldiers) if (soldierTargetable(s) && !s.flying && inRange(z.x, z.y, s.x, s.y, z.r)) damageSoldier(this, s, z.dps * 0.25, 'true');
        break;
      case 'arrowstorm': {
        z.acc = (z.acc || 0) + dt * (z.hits / z.dur);
        while (z.acc >= 1) {
          z.acc -= 1;
          const list = this.enemies.filter(e => targetable(e, true) && inRange(z.x, z.y, e.x, e.y, z.r));
          if (list.length) { const e = list[Math.floor(this.rng.next() * list.length)]; damageEnemy(this, e, this.rng.range(z.dmg[0], z.dmg[1]), 'phys', z.src); }
        }
        break;
      }
      case 'starfall':
        if (!z.done && z.t >= 0.6) { z.done = true; splash(this, z.x, z.y, z.r, z.dmg, 'magic', z.src, { noFalloff: true }); this.fx.explosion(z.x, z.y, 1, 'arcane'); this.fx.sfx('meteor_impact', z.x, { vol: 0.5 }); }
        break;
    }
  }
}
