// Rampart Riot — tower behaviour for all four lines and their level-4 specialisations
import { TOWERS, SKILLS, SELL_RATE } from '../data/towers.js';
import { inRange, rangeDist } from '../core/util.js';
import { enemiesInRange, firstTarget, strongestTarget, clusterTarget, damageEnemy, splash, slowEnemy, stunEnemy, freezeEnemy, markEnemy, targetable } from './combat.js';
import { TowerSoldier } from './soldier.js';

// height of the projectile origin above the plot center (world units)
export const TOWER_TOP = {
  archer1: 66, archer2: 82, archer3: 98, archerA: 106, archerB: 70,
  mage1: 82, mage2: 96, mage3: 112, mageA: 118, mageB: 118,
  artillery1: 26, artillery2: 32, artillery3: 40, artilleryA: 50, artilleryB: 56,
  barracks1: 0, barracks2: 0, barracks3: 0, barracksA: 0, barracksB: 0,
};
const FORMATION = [[-15, -7], [15, -7], [0, 9], [-24, 10], [24, 10]];
const tmp = [];

export class Tower {
  constructor(b, plot, id) {
    this.b = b; this.plot = plot; this.uid = b.nextId++;
    this.x = plot.x; this.y = plot.y;
    this.skills = {}; this.skT = {};
    this.disabled = 0; this.disabledKind = null;
    this.cdT = 0.4; this.shooter = 0; this.shotT = 9; this.aimX = this.x + 1; this.aimY = this.y;
    this.soldiers = [];
    this.spent = 0;
    this.buildT = 0.7;
    this.setType(id);
    this.spent = this.price(TOWERS[id].cost);
    if (this.line === 'barracks') { this.rally = b.defaultRally(this); this.syncSoldiers(true); }
  }

  price(c) {
    const m = this.b.mods;
    const disc = this.line === 'mage' ? m.mageDiscount : this.line === 'artillery' ? m.artDiscount : 0;
    return Math.round(c * (1 - disc));
  }

  setType(id) {
    this.id = id; this.def = TOWERS[id]; this.line = this.def.line; this.level = this.def.level; this.spec = this.def.spec || null;
    this.refreshStats();
  }

  refreshStats() {
    const d = this.def, m = this.b.mods;
    let range = d.range, cd = d.cd || 1, dmgMul = 1;
    if (this.line === 'archer') { range *= m.archerRange; cd /= m.archerHaste; dmgMul = m.archerDmg; }
    if (this.line === 'mage') { range *= m.mageRange; cd /= m.mageHaste; dmgMul = m.mageDmg; }
    if (this.line === 'artillery') { range *= m.artRange; dmgMul = m.artDmg; }
    this.range = range; this.cd = cd;
    this.dmg = d.dmg ? [d.dmg[0] * dmgMul, d.dmg[1] * dmgMul] : null;
    this.splash = d.splash ? d.splash * (this.line === 'artillery' ? m.artRadius : 1) : 0;
    this.top = TOWER_TOP[this.id] || 40;
  }

  get sellValue() { return Math.round(this.spent * SELL_RATE); }

  upgradeCost(toId) { return this.price(TOWERS[toId].cost); }
  skillCost(sk) { const r = this.skills[sk] || 0; return r >= 3 ? Infinity : SKILLS[sk].cost[r]; }

  upgradeTo(toId) {
    const cost = this.upgradeCost(toId);
    this.spent += cost;
    this.setType(toId);
    this.buildT = 0.55;
    this.cdT = 0.3;
    if (this.line === 'barracks') this.syncSoldiers(true);
  }

  buySkill(sk) {
    const cost = this.skillCost(sk);
    this.spent += cost;
    this.skills[sk] = (this.skills[sk] || 0) + 1;
    this.skT[sk] = Math.min(this.skT[sk] ?? 1.5, 1.5);
    if (this.line === 'barracks') this.syncSoldiers(false);
  }

  disable(dur, kind) { this.disabled = Math.max(this.disabled, dur); this.disabledKind = kind; }

  remove() {
    for (const s of this.soldiers) { s.releaseTarget(); s.removed = true; }
    this.soldiers.length = 0;
  }

  // ---------------- barracks ----------------
  syncSoldiers(replace) {
    const b = this.b;
    const unit = this.def.unit;
    const wolfRank = this.skills.wolf || 0;
    const wolves = wolfRank ? SKILLS.wolf.count[wolfRank - 1] : 0;
    const want = [unit, unit, unit];
    for (let i = 0; i < wolves; i++) want.push('packwolf');
    const old = this.soldiers;
    const next = [];
    want.forEach((kind, i) => {
      let s = old[i];
      if (!s || replace || s.kind !== kind) {
        const pos = s && !s.dead ? { x: s.x, y: s.y } : { x: this.x + (i - 1) * 10, y: this.y + 14 };
        const ns = new TowerSoldier(b, kind, { tower: this, slot: i, x: pos.x, y: pos.y, engageR: 84 });
        if (kind === 'packwolf') {
          const sk = SKILLS.wolf;
          ns.maxHp = ns.hp = Math.round(sk.hp[wolfRank - 1] * b.mods.soldierHp);
          ns.dmg = sk.dmg[wolfRank - 1].slice();
          ns.hitSfx = 'enemy_hit_armor';
          ns.size = 11;
        }
        if (s) { s.releaseTarget(); s.removed = true; }
        s = ns;
        b.soldiers.push(s);
      }
      s.refreshSkills();
      next.push(s);
    });
    for (let i = want.length; i < old.length; i++) { old[i].releaseTarget(); old[i].removed = true; }
    this.soldiers = next;
    this.placeSoldiers();
  }

  placeSoldiers() {
    this.soldiers.forEach((s, i) => { const f = FORMATION[i] || [0, 0]; s.setHome(this.rally.x + f[0], this.rally.y + f[1]); });
  }

  setRally(x, y) {
    this.rally = { x, y };
    this.placeSoldiers();
  }

  // ---------------- main update ----------------
  update(dt) {
    this.shotT += dt;
    if (this.buildT > 0) { this.buildT -= dt; return; }
    for (const k in this.skT) this.skT[k] -= dt;
    if (this.disabled > 0) { this.disabled -= dt; if (this.disabled <= 0) this.disabledKind = null; return; }
    switch (this.line) {
      case 'archer': this.updArcher(dt); break;
      case 'mage': this.updMage(dt); break;
      case 'artillery': this.updArtillery(dt); break;
      case 'barracks': break;
    }
  }

  ox() { return this.x; }
  oy() { return this.y - this.top; }

  fireAnim(target) {
    this.shotT = 0;
    this.shooter = 1 - this.shooter;
    if (target) { this.aimX = target.x; this.aimY = target.y; }
  }

  updArcher(dt) {
    const b = this.b, m = b.mods;
    const list = enemiesInRange(b, this.x, this.y, this.range, true, tmp);
    // skills
    if (this.skills.mark && this.skT.mark <= 0 && list.length) {
      const r = this.skills.mark, sk = SKILLS.mark;
      const e = strongestTarget(list);
      if (e) { markEnemy(e, sk.bonus[r - 1], sk.dur); this.skT.mark = sk.cd[r - 1]; b.fx.burst('mark', e.x, e.y - e.def.h); b.fx.sfx('ui_tick', e.x); }
    }
    if (this.skills.pierce && this.skT.pierce <= 0 && list.length) {
      const r = this.skills.pierce, sk = SKILLS.pierce;
      const e = firstTarget(list);
      this.skT.pierce = sk.cd[r - 1];
      this.fireAnim(e);
      b.pierceShot(this, e, sk.dmg[r - 1]);
      return;
    }
    if (this.skills.execute && this.skT.execute <= 0 && list.length) {
      const r = this.skills.execute, sk = SKILLS.execute;
      const e = strongestTarget(list, true);
      if (e) {
        this.skT.execute = sk.cd[r - 1];
        this.fireAnim(e);
        b.projectile('bolt', this.ox(), this.oy(), e, { dmg: [sk.dmg[r - 1], sk.dmg[r - 1]], dtype: 'phys', src: this, execute: sk.chance[r - 1], big: true });
        b.fx.sfx('crossbow_shoot', this.x);
        return;
      }
    }
    this.cdT -= dt;
    if (this.cdT > 0) return;
    if (!list.length) { this.cdT = 0.08; return; }
    const e = firstTarget(list);
    this.cdT = this.cd;
    this.fireAnim(e);
    const crit = m.archerCrit && b.rng.next() < m.archerCrit;
    const dmg = crit ? [this.dmg[0] * 2, this.dmg[1] * 2] : this.dmg;
    const pierce = (this.def.armorPierce || 0) + m.archerPierce;
    if (this.spec === 'arbalest') {
      b.projectile('bolt', this.ox(), this.oy(), e, { dmg, dtype: 'phys', src: this, pierce, crit });
      b.fx.sfx('crossbow_shoot', this.x, { vol: 0.6 });
    } else {
      const sx = this.ox() + (this.shooter ? 12 : -12) * (this.level >= 4 ? 0.9 : 1);
      b.projectile('arrow', sx, this.oy(), e, { dmg, dtype: 'phys', src: this, pierce, crit });
      b.fx.sfx('arrow_shoot', this.x, { vol: 0.42 });
      if (this.skills.split) {
        const r = this.skills.split, sk = SKILLS.split;
        if (b.rng.next() < sk.chance[r - 1]) {
          const others = list.filter(o => o !== e);
          for (let i = 0; i < Math.min(sk.extra, others.length); i++) b.projectile('arrow', sx, this.oy(), others[i], { dmg: this.dmg, dtype: 'phys', src: this, pierce });
          if (others.length) b.fx.sfx('multishot', this.x, { vol: 0.5 });
        }
      }
    }
  }

  updMage(dt) {
    const b = this.b, m = b.mods;
    const list = enemiesInRange(b, this.x, this.y, this.range, true, tmp);
    // Stormcaller: Thunderstrike
    if (this.skills.thunder && this.skT.thunder <= 0 && list.length) {
      const r = this.skills.thunder, sk = SKILLS.thunder;
      const c = clusterTarget(list, sk.radius);
      if (c.e) {
        this.skT.thunder = sk.cd[r - 1];
        splash(b, c.e.x, c.e.y, sk.radius, sk.dmg[r - 1], 'magic', this, { air: true, noFalloff: true, onEach: e => stunEnemy(e, sk.stun) });
        b.fx.thunder(c.e.x, c.e.y); b.fx.sfx('lightning', c.e.x); b.fx.shake(3);
        this.fireAnim(c.e);
      }
    }
    // Frost: Glacial Prison & Blizzard
    if (this.skills.prison && this.skT.prison <= 0 && list.length) {
      const r = this.skills.prison, sk = SKILLS.prison;
      const e = strongestTarget(list.filter(x => !x.flying && x.freeze <= 0));
      if (e) { this.skT.prison = sk.cd[r - 1]; freezeEnemy(e, sk.dur[r - 1]); b.fx.sfx('freeze', e.x); b.fx.beam('frost', this.ox(), this.oy(), e.x, e.y - e.def.h * 0.5); this.fireAnim(e); }
    }
    if (this.skills.blizzard && this.skT.blizzard <= 0 && list.length) {
      const r = this.skills.blizzard, sk = SKILLS.blizzard;
      const c = clusterTarget(list.filter(x => !x.flying), sk.radius);
      if (c.e && c.count >= 2) {
        this.skT.blizzard = sk.cd[r - 1];
        b.addZone({ kind: 'blizzard', x: c.e.x, y: c.e.y, r: sk.radius, dur: sk.dur, dps: sk.dps[r - 1], slow: sk.slow, src: this });
        b.fx.sfx('blizzard', c.e.x);
      }
    }
    this.cdT -= dt;
    if (this.cdT > 0) return;
    if (!list.length) { this.cdT = 0.08; return; }
    const e = firstTarget(list);
    this.cdT = this.cd;
    this.fireAnim(e);
    if (this.spec === 'storm') {
      const chainN = this.skills.chain ? SKILLS.chain.targets[this.skills.chain - 1] : this.def.chain;
      b.chainLightning(this, e, chainN);
      b.fx.sfx('lightning', this.x, { vol: 0.55 });
    } else {
      b.projectile(this.spec === 'frost' ? 'frostorb' : 'orb', this.ox(), this.oy(), e, { dmg: this.dmg, dtype: 'magic', src: this, slow: this.spec === 'frost' ? this.def.slow : m.mageSlow, slowDur: this.spec === 'frost' ? this.def.slowDur : 1 });
      b.fx.sfx(this.spec === 'frost' ? 'frost_cast' : 'magic_cast', this.x, { vol: 0.5 });
    }
  }

  updArtillery(dt) {
    const b = this.b;
    const air = !!this.def.air;
    const list = enemiesInRange(b, this.x, this.y, this.range, air, tmp);
    if (this.skills.salvo && this.skT.salvo <= 0 && list.length >= 2) {
      const r = this.skills.salvo, sk = SKILLS.salvo;
      this.skT.salvo = sk.cd[r - 1];
      for (let i = 0; i < sk.count[r - 1]; i++) {
        const e = list[i % list.length];
        b.projectile('minirocket', this.ox() + (i - sk.count[r - 1] / 2) * 3, this.oy(), e, { dmg: [sk.dmg, sk.dmg], dtype: 'phys', splash: 40, src: this, delay: i * 0.08, air: true });
      }
      b.fx.sfx('rocket_launch', this.x);
      this.fireAnim(list[0]);
    }
    if (this.skills.pool && this.skT.pool <= 0 && list.length) {
      const r = this.skills.pool, sk = SKILLS.pool;
      const c = clusterTarget(list.filter(x => !x.flying), sk.radius);
      if (c.e && c.count >= 2) {
        this.skT.pool = sk.cd[r - 1];
        const p = c.e.predict(0.9, {});
        b.projectile('flask', this.ox(), this.oy(), null, { tx: p.x, ty: p.y, dmg: [10, 20], dtype: 'phys', splash: 60, src: this, pool: { dps: sk.dps[r - 1], r: sk.radius, dur: sk.dur } });
        b.fx.sfx('bomb_launch', this.x, { vol: 0.5 });
      }
    }
    if (this.skills.sheep && this.skT.sheep <= 0 && list.length) {
      const r = this.skills.sheep, sk = SKILLS.sheep;
      const cands = list.filter(x => !x.def.boss && !x.flying && x.sheep <= 0).sort((a, c) => c.hp - a.hp).slice(0, sk.count);
      if (cands.length) {
        this.skT.sheep = sk.cd[r - 1];
        for (const e of cands) { e.sheep = sk.dur[r - 1]; e.release(); b.fx.burst('poof', e.x, e.y - 10); b.stats.sheep++; }
        b.fx.sfx('sheep', cands[0].x);
        this.fireAnim(cands[0]);
      }
    }
    this.cdT -= dt;
    if (this.cdT > 0) return;
    if (!list.length) { this.cdT = 0.1; return; }
    const e = firstTarget(list);
    this.cdT = this.cd;
    this.fireAnim(e);
    if (this.spec === 'rocket') {
      b.projectile('rocket', this.ox(), this.oy(), e, { dmg: this.dmg, dtype: 'phys', splash: this.splash, src: this, air: true, fire: this.skills.firestorm ? SKILLS.firestorm.dps[this.skills.firestorm - 1] : 0 });
      b.fx.sfx('rocket_launch', this.x, { vol: 0.6 });
    } else {
      const T = 0.85 + rangeDist(this.x, this.y, e.x, e.y) / 1400;
      const p = e.predict(T, {});
      if (this.spec === 'alchemy') {
        b.projectile('flask', this.ox(), this.oy(), null, { tx: p.x, ty: p.y, T, dmg: this.dmg, dtype: 'phys', splash: this.splash, src: this, shred: this.def.shred, shredDur: this.def.shredDur });
        b.fx.sfx('bomb_launch', this.x, { vol: 0.5 });
      } else {
        b.projectile('bomb', this.ox(), this.oy(), null, { tx: p.x, ty: p.y, T, dmg: this.dmg, dtype: 'phys', splash: this.splash, src: this, big: this.level >= 3 });
        b.fx.sfx('bomb_launch', this.x, { vol: 0.6 });
      }
    }
  }
}
