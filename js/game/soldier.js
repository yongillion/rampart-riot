// Rampart Riot — allied units: barracks soldiers, reinforcements, summons and heroes
import { UNITS, SKILLS } from '../data/towers.js';
import { HEROES, heroStat, heroLevel } from '../data/heroes.js';
import { inRange, rangeDist, clamp } from '../core/util.js';
import { targetable, damageEnemy, enemiesInRange, firstTarget, clusterTarget, splash, stunEnemy, rootEnemy, burnEnemy, nearestTarget, soldierTargetable } from './combat.js';

const HIT_DELAY = 0.2;
const tmp = [];

export class Soldier {
  constructor(b, kind, o = {}) {
    this.b = b; this.kind = kind; this.uid = b.nextId++;
    this.tower = o.tower || null; this.slot = o.slot ?? 0;
    const d = o.def || UNITS[kind];
    this.def = d;
    const m = b.mods;
    const isLevy = kind === 'levy' || kind === 'veteran';
    const hpMul = this.tower ? m.soldierHp : isLevy ? m.milHp : 1;
    this.maxHp = Math.round(d.hp * hpMul); this.hp = this.maxHp;
    this.armor = Math.min(0.85, d.armor + (this.tower ? m.soldierArmor : isLevy ? m.milArmor : 0));
    this.mr = d.mr || 0;
    this.dmg = [d.dmg[0] + (this.tower ? m.soldierDmg : isLevy ? m.milDmg : 0), d.dmg[1] + (this.tower ? m.soldierDmg : isLevy ? m.milDmg : 0)];
    this.cd = d.cd; this.speed = d.speed;
    this.regen = (d.regen || 0) * (this.tower ? m.soldierRegen : 1);
    this.respawn = Math.max(4, (d.respawn || 10) - (this.tower ? m.respawnCut : 0));
    this.x = o.x ?? 0; this.y = o.y ?? 0;
    this.homeX = o.homeX ?? this.x; this.homeY = o.homeY ?? this.y;
    this.engageR = o.engageR ?? 82;
    this.life = o.life ?? 0;          // >0 => timed unit
    this.size = o.size ?? 9;
    this.state = 'idle'; this.target = null;
    this.atkT = 0.2; this.searchT = 0;
    this.facing = 1; this.anim = 'idle'; this.animT = b.rng.next();
    this.dead = false; this.removed = false; this.respawnT = 0; this.deathT = 0;
    this.stun = 0; this.absorb = 0; this.absorbT = 0; this.dr = 0; this.immune = 0; this.idleT = 0;
    this.pending = null; this.hitT = 0; this.javT = 1;
    this.sprite = o.sprite || kind;
    this.stationary = !!o.stationary;
    if (o.spawnFx) b.fx.burst('spawn', this.x, this.y);
  }

  setAnim(a) { if (this.anim !== a) { this.anim = a; this.animT = 0; } }

  setHome(x, y) {
    this.homeX = x; this.homeY = y;
    if (this.target) this.releaseTarget();
    if (!this.dead) this.state = 'move';
  }

  releaseTarget() {
    const t = this.target;
    if (t) {
      if (t.blocker === this) t.blocker = null;
      else if (this.helping && t.helpers) t.helpers--;
    }
    this.target = null;
    this.helping = false;
  }

  die(src, devoured = false) {
    if (this.dead) return;
    this.dead = true; this.hp = 0;
    this.releaseTarget();
    this.setAnim('death'); this.deathT = 0;
    this.devoured = devoured;
    this.respawnT = this.respawn;
    this.b.fx.sfx(this.isHero ? 'hero_death' : 'soldier_death', this.x, { vol: 0.6 });
    if (this.isHero) this.b.onHeroDeath(this);
    if (!this.tower && !this.isHero) this.dropOnDeath = true;
  }

  // ---- shared per-frame logic ----
  update(dt) {
    const b = this.b;
    this.animT += dt;
    if (this.hitT > 0) this.hitT -= dt;
    if (this.dead) {
      this.deathT += dt;
      if (this.tower || this.isHero) {
        this.respawnT -= dt;
        if (this.respawnT <= 0) this.revive();
      } else if (this.deathT > 1.2) this.removed = true;
      return;
    }
    if (this.life > 0) {
      this.life -= dt;
      if (this.life <= 0) { this.releaseTarget(); this.removed = true; b.fx.burst('poof', this.x, this.y - 12); return; }
    }
    if (this.immune > 0) this.immune -= dt;
    if (this.absorbT > 0) { this.absorbT -= dt; if (this.absorbT <= 0) this.absorb = 0; }
    if (this.frozen > 0) this.frozen -= dt;
    if (this.drT > 0) { this.drT -= dt; if (this.drT <= 0) this.dr = 0; }
    if (this.stun > 0) { this.stun -= dt; this.setAnim('idle'); return; }
    // pending melee hit
    if (this.pending) {
      this.pending.t -= dt;
      if (this.pending.t <= 0) {
        const p = this.pending; this.pending = null;
        if (p.target && targetable(p.target, false)) this.applyHit(p.target, p.extra);
      }
    }
    this.think(dt);
  }

  applyHit(e, extra = 1) {
    const b = this.b;
    let dmg = b.rng.range(this.dmg[0], this.dmg[1]) * extra;
    const dealt = damageEnemy(b, e, dmg, this.dmgType || 'phys', this);
    if (this.lifesteal && dealt > 0) this.hp = Math.min(this.maxHp, this.hp + dealt * this.lifesteal);
    b.fx.sfx(this.hitSfx || 'sword_hit', this.x, { vol: 0.45 });
    if (this.onHitExtra) this.onHitExtra(e);
  }

  think(dt) {
    const b = this.b;
    // validate current target
    const t = this.target;
    if (t && (!targetable(t, false) || (t.blocker && t.blocker !== this && !this.helping) || rangeDist(this.homeX, this.homeY, t.x, t.y) > this.engageR + 70)) this.releaseTarget();
    if (this.target && this.helping && !this.target.blocker) { this.target.blocker = this; this.helping = false; if (this.target.helpers) this.target.helpers--; }
    // acquire
    this.searchT -= dt;
    if (!this.target && this.searchT <= 0 && this.state !== 'move') {
      this.searchT = 0.15 + b.rng.next() * 0.1;
      this.acquire();
    }
    if (this.target) { this.fight(dt); return; }
    // ranged militia javelins
    if (this.javelin && this.state !== 'move') {
      this.javT -= dt;
      if (this.javT <= 0) {
        const list = enemiesInRange(b, this.x, this.y, 170, false, tmp);
        const e = firstTarget(list);
        if (e) { this.javT = 2.2; this.facing = e.x < this.x ? -1 : 1; this.setAnim('attack'); b.projectile('javelin', this.x, this.y - 22, e, { dmg: [8, 14], dtype: 'phys', src: this }); }
        else this.javT = 0.3;
      }
    }
    // go home
    const dx = this.homeX - this.x, dy = this.homeY - this.y;
    const d = Math.hypot(dx, dy);
    if (d > 3 && !this.stationary) {
      this.state = 'move';
      const st = Math.min(d, this.speed * dt);
      this.x += (dx / d) * st; this.y += (dy / d) * st;
      if (Math.abs(dx) > 1) this.facing = dx < 0 ? -1 : 1;
      this.setAnim('walk');
      this.idleT = 0;
    } else {
      if (this.state === 'move') this.state = 'idle';
      if (this.anim !== 'attack' || this.animT > 0.6) this.setAnim('idle');
      this.idleT += dt;
      if (this.idleT > 1.5 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);
    }
  }

  acquire() {
    const b = this.b;
    let best = null, bd = Infinity, help = null, hd = Infinity;
    for (const e of b.enemies) {
      if (!targetable(e, false)) continue;
      if (rangeDist(this.homeX, this.homeY, e.x, e.y) > this.engageR + e.size) continue;
      const d = rangeDist(this.x, this.y, e.x, e.y);
      if (!e.blocker) { if (d < bd) { bd = d; best = e; } }
      else if ((e.helpers || 0) < 2 && d < hd) { hd = d; help = e; }
    }
    if (best) { this.target = best; best.blocker = this; this.helping = false; this.state = 'fight'; }
    else if (help) { this.target = help; this.helping = true; help.helpers = (help.helpers || 0) + 1; this.state = 'fight'; }
  }

  fight(dt) {
    const e = this.target;
    const side = this.helping ? (e.blocker && e.blocker.x < e.x ? 1 : -1) : (this.x < e.x ? -1 : 1);
    const tx = e.x + side * (e.size + this.size + 6);
    const ty = e.y + (this.helping ? 6 : 0);
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    this.state = 'fight';
    if (d > 4 && !this.stationary) {
      const st = Math.min(d, this.speed * 1.15 * dt);
      this.x += (dx / d) * st; this.y += (dy / d) * st;
      this.facing = e.x < this.x ? -1 : 1;
      this.setAnim('walk');
      return;
    }
    this.facing = e.x < this.x ? -1 : 1;
    this.atkT -= dt * (this.hasteMul ? this.hasteMul() : 1);
    if (this.atkT <= 0) {
      this.atkT = this.cd;
      this.setAnim('attack');
      let extra = 1;
      if (this.preAttack) extra = this.preAttack(e) || 1;
      this.pending = { t: HIT_DELAY, target: e, extra };
    } else if (this.anim !== 'attack' || this.animT > 0.55) this.setAnim('idle');
  }

  revive() {
    const b = this.b;
    this.dead = false; this.hp = this.maxHp; this.target = null; this.stun = 0;
    this.removed = false;
    if (this.tower) { this.x = this.tower.x + (this.slot - 1) * 10; this.y = this.tower.y + 14; this.state = 'move'; }
    this.setAnim('walk');
    b.fx.sfx('soldier_spawn', this.x, { vol: 0.5 });
  }
}

// ---------------- Barracks soldier with tower skills ----------------
export class TowerSoldier extends Soldier {
  constructor(b, kind, o) {
    super(b, kind, o);
    this.bashT = 2 + this.slot;
  }
  refreshSkills() {
    const tw = this.tower;
    const wall = tw.skills.wall || 0, bash = tw.skills.bash || 0, bl = tw.skills.bloodlust || 0;
    this.wallRank = wall; this.bashRank = bash;
    this.lifesteal = bl ? SKILLS.bloodlust.steal[bl - 1] : 0;
    this.bloodHaste = bl ? SKILLS.bloodlust.haste[bl - 1] : 0;
  }
  hasteMul() { return this.bloodHaste && this.hp < this.maxHp * 0.5 ? 1 + this.bloodHaste : 1; }
  think(dt) {
    this.wallDr = this.wallRank && this.state === 'fight' ? SKILLS.wall.dr[this.wallRank - 1] : 0;
    if (this.bashRank) this.bashT -= dt;
    super.think(dt);
  }
  preAttack(e) {
    if (this.bashRank && this.bashT <= 0) {
      const sk = SKILLS.bash;
      this.bashT = sk.cd[this.bashRank - 1];
      stunEnemy(e, sk.stun[this.bashRank - 1]);
      damageEnemy(this.b, e, sk.dmg[this.bashRank - 1], 'phys', this);
      this.b.fx.burst('bash', e.x, e.y - e.def.h * 0.5);
      this.b.fx.sfx('bash', e.x);
    }
    return 1;
  }
}

// ---------------- Hero ----------------
export class Hero extends Soldier {
  constructor(b, id, xp, o) {
    const H = HEROES[id];
    const level = heroLevel(xp);
    const def = { hp: heroStat(H.hp, level), dmg: heroStat(H.dmg, level), armor: heroStat(H.armor, level), mr: heroStat(H.mr, level), cd: H.cd, speed: H.speed, regen: heroStat(H.regen, level), respawn: H.respawn };
    super(b, id, Object.assign({ def, engageR: 105, size: 11 }, o));
    this.isHero = true; this.heroId = id; this.H = H;
    this.xp = xp; this.xpStart = xp; this.level = level; this.dealt = 0;
    this.flying = !!H.flying;
    this.mr = def.mr;
    this.spawnX = o.x; this.spawnY = o.y;
    this.commanded = false;
    this.skillT = {};
    for (const s of H.skills) this.skillT[s.id] = s.cd * 0.35;
    this.rangedT = 0;
    this.applyLevel();
    if (this.flying) this.engageR = 0;
  }
  applyLevel() {
    const H = this.H, L = this.level;
    const oldMax = this.maxHp;
    this.maxHp = Math.round(heroStat(H.hp, L));
    this.hp = Math.min(this.maxHp, this.hp + (this.maxHp - oldMax));
    this.armor = heroStat(H.armor, L); this.mr = heroStat(H.mr, L);
    this.dmg = heroStat(H.dmg, L);
    this.regen = heroStat(H.regen, L);
    this.ranged = H.ranged ? Object.assign({}, H.ranged, { dmg: heroStat(H.ranged.dmg, L) }) : null;
    this.skills = H.skills.filter(s => s.lvl <= L);
  }
  gainXp(a) {
    this.xp += a;
    const L = heroLevel(this.xp);
    if (L > this.level) {
      this.level = L; this.applyLevel();
      this.hp = this.maxHp;
      this.b.fx.burst('levelup', this.x, this.y);
      this.b.fx.sfx('hero_levelup', this.x);
      this.b.notify('heroLevel', { hero: this, level: L });
    }
  }
  moveTo(x, y) {
    this.releaseTarget();
    this.homeX = x; this.homeY = y;
    this.commanded = true; this.state = 'move';
    this.rangedTarget = null;
  }
  revive() {
    super.revive();
    this.x = this.spawnX; this.y = this.spawnY;
    this.homeX = this.spawnX; this.homeY = this.spawnY;
    this.commanded = false; this.state = 'idle';
    this.b.fx.burst('respawn', this.x, this.y);
    this.b.fx.sfx('hero_respawn', this.x);
    this.setAnim('idle');
  }
  sk(id) { return this.skills.find(s => s.id === id); }
  skLevelVal(v) { if (!Array.isArray(v)) return v; const t = (this.level - 1) / 9; return v[0] + (v[1] - v[0]) * t; }

  think(dt) {
    const b = this.b;
    for (const k in this.skillT) this.skillT[k] -= dt;
    // Last Stand (passive)
    const ls = this.sk('laststand');
    if (ls && this.hp < this.maxHp * 0.25 && this.skillT.laststand <= 0) {
      this.skillT.laststand = ls.cd; this.hp += this.maxHp * ls.heal; this.immune = ls.immune;
      b.fx.burst('holy', this.x, this.y); b.fx.sfx('hero_skill', this.x);
    }
    if (this.taunt > 0) this.taunt -= dt;
    if (this.commanded) {
      const dx = this.homeX - this.x, dy = this.homeY - this.y, d = Math.hypot(dx, dy);
      if (d > 4) {
        const st = Math.min(d, this.speed * dt);
        this.x += (dx / d) * st; this.y += (dy / d) * st;
        if (Math.abs(dx) > 1) this.facing = dx < 0 ? -1 : 1;
        this.setAnim('walk'); this.state = 'move'; this.idleT = 0;
        return;
      }
      this.commanded = false; this.state = 'idle';
    }
    this.useSkills(dt);
    if (this.casting > 0) { this.casting -= dt; return; }
    // ranged attack when not locked in melee
    if (this.ranged && (!this.target || this.flying)) {
      this.rangedT -= dt;
      const list = enemiesInRange(b, this.x, this.y, this.ranged.range, this.ranged.air, tmp);
      const e = firstTarget(list);
      if (e) {
        this.facing = e.x < this.x ? -1 : 1;
        if (this.rangedT <= 0) {
          this.rangedT = this.ranged.cd;
          this.setAnim('attack');
          this.fireAt(e);
        } else if (this.anim !== 'attack' || this.animT > 0.6) this.setAnim('idle');
        this.idleT = 0;
        if (this.flying) return;
        // ranged heroes still go home / engage blockers when enemies close
        if (!this.target) { const close = list.find(x => !x.flying && !x.blocker && rangeDist(this.x, this.y, x.x, x.y) < 60); if (close) { this.target = close; close.blocker = this; } else return; }
      }
    }
    if (this.flying) { super.think(dt); return; }
    super.think(dt);
  }

  fireAt(e) {
    const b = this.b, r = this.ranged;
    const id = this.heroId;
    const kind = id === 'kaela' ? 'heroArrow' : id === 'seren' ? 'starbolt' : id === 'ysolde' ? 'firebolt' : id === 'aerin' ? 'dive' : 'heroArrow';
    if (kind === 'dive') {
      // Aerin swoops: instant strike
      const dmg = b.rng.range(r.dmg[0], r.dmg[1]);
      damageEnemy(b, e, dmg, 'phys', this);
      b.fx.burst('claw', e.x, e.y - e.def.h * 0.5);
      b.fx.sfx('hero_attack', e.x, { vol: 0.5 });
      return;
    }
    b.projectile(kind, this.x + this.facing * 8, this.y - 30, e, { dmg: r.dmg, dtype: r.magic ? 'magic' : 'phys', src: this });
    b.fx.sfx(r.magic ? 'magic_cast' : 'arrow_shoot', this.x, { vol: 0.5 });
  }

  useSkills(dt) {
    const b = this.b, T = this.skillT;
    const ready = id => this.sk(id) && T[id] <= 0;
    const near = r => enemiesInRange(b, this.x, this.y, r, true, []).filter(e => !e.flying || r > 0);
    // --- Brannoc ---
    if (ready('shieldwall')) {
      const s = this.sk('shieldwall');
      const list = enemiesInRange(b, this.x, this.y, s.radius, false, []);
      if (list.length >= 2 || (list.length && this.hp < this.maxHp * 0.6)) {
        T.shieldwall = s.cd; this.dr = s.dr; this.drT = s.dur; this.taunt = s.dur; this.tauntR = s.radius;
        for (const e of list) if (!e.blocker) e.blocker = this;
        b.fx.burst('shieldwall', this.x, this.y); b.fx.sfx('shield_block', this.x);
        this.setAnim('special'); this.casting = 0.4;
      }
    }
    if (ready('cleave') && this.target) {
      const s = this.sk('cleave');
      const list = enemiesInRange(b, this.x, this.y, s.radius, false, []);
      if (list.length >= 2) {
        T.cleave = s.cd;
        for (const e of list) damageEnemy(b, e, b.rng.range(this.dmg[0], this.dmg[1]) * s.mult, 'phys', this);
        b.fx.burst('cleave', this.x + this.facing * 16, this.y); b.fx.sfx('hero_attack', this.x);
        this.setAnim('special'); this.casting = 0.5;
      }
    }
    // --- Kaela ---
    if (ready('twinshot')) {
      const s = this.sk('twinshot');
      const list = enemiesInRange(b, this.x, this.y, this.ranged.range, true, []);
      if (list.length >= 2) {
        T.twinshot = s.cd;
        list.sort((a, c) => (a.path.len - a.s) - (c.path.len - c.s));
        for (let i = 0; i < Math.min(s.extra + 1, list.length); i++) b.projectile('heroArrow', this.x, this.y - 30, list[i], { dmg: this.ranged.dmg, dtype: 'phys', src: this });
        this.setAnim('attack'); b.fx.sfx('multishot', this.x);
      }
    }
    if (ready('snare')) {
      const s = this.sk('snare');
      const list = enemiesInRange(b, this.x, this.y, this.ranged.range, false, []);
      const c = clusterTarget(list, s.radius);
      if (c.e && c.count >= 3) {
        T.snare = s.cd;
        const cx = c.e.x, cy = c.e.y;
        for (const e of list) if (inRange(cx, cy, e.x, e.y, s.radius)) { rootEnemy(e, s.root); damageEnemy(b, e, s.dmg, 'phys', this); }
        b.fx.burst('snare', cx, cy); b.fx.sfx('burrow', cx);
        this.setAnim('special'); this.casting = 0.4;
      }
    }
    if (ready('arrowstorm')) {
      const s = this.sk('arrowstorm');
      const list = enemiesInRange(b, this.x, this.y, this.ranged.range + 40, true, []);
      const c = clusterTarget(list, s.radius);
      if (c.e && c.count >= 4) {
        T.arrowstorm = s.cd;
        b.addZone({ kind: 'arrowstorm', x: c.e.x, y: c.e.y, r: s.radius, dur: 2, hits: s.hits, dmg: s.dmg, src: this });
        b.fx.sfx('arrow_rain', c.e.x);
        this.setAnim('special'); this.casting = 0.5;
      }
    }
    // --- Seren ---
    if (ready('sigil')) {
      const s = this.sk('sigil');
      const allies = b.soldiers.filter(u => !u.dead && inRange(this.x, this.y, u.x, u.y, s.radius) && (u.state === 'fight' || u.hp < u.maxHp * 0.7));
      if (allies.length >= 2 || (allies.includes(this) && this.hp < this.maxHp * 0.5)) {
        T.sigil = s.cd;
        const amt = this.skLevelVal(s.absorb);
        for (const u of b.soldiers) if (!u.dead && inRange(this.x, this.y, u.x, u.y, s.radius)) { u.absorb = amt; u.absorbT = 8; b.fx.burst('sigil', u.x, u.y); }
        b.fx.sfx('shield_up', this.x); this.setAnim('special'); this.casting = 0.5;
      }
    }
    if (ready('starfall')) {
      const s = this.sk('starfall');
      const list = enemiesInRange(b, this.x, this.y, this.ranged.range + 30, false, []);
      const c = clusterTarget(list, s.radius);
      if (c.e && c.count >= 3) {
        T.starfall = s.cd;
        b.addZone({ kind: 'starfall', x: c.e.x, y: c.e.y, r: s.radius, dur: 0.8, dmg: this.skLevelVal(s.dmg), src: this });
        this.setAnim('special'); this.casting = 0.6; b.fx.sfx('magic_cast', this.x);
      }
    }
    if (ready('stoneguard')) {
      const s = this.sk('stoneguard');
      if (enemiesInRange(b, this.x, this.y, 200, false, []).length >= 2) {
        T.stoneguard = s.cd;
        const g = new Soldier(b, 'stoneguard', { def: { hp: s.hp, dmg: [20, 32], armor: 0.5, cd: 1.2, speed: 60, regen: 0 }, x: this.x + this.facing * 30, y: this.y + 8, life: s.dur, engageR: 110, size: 14, sprite: 'stoneguard', spawnFx: true });
        g.hitSfx = 'stomp';
        b.soldiers.push(g);
        b.fx.sfx('ground_slam', this.x); this.setAnim('special'); this.casting = 0.6;
      }
    }
    // --- Torvald ---
    if (ready('turret')) {
      const s = this.sk('turret');
      if (enemiesInRange(b, this.x, this.y, s.range, true, []).length >= 1) {
        T.turret = s.cd;
        b.addTurret(this.x - this.facing * 26, this.y - 6, { dur: s.dur, dmg: this.skLevelVal ? [this.skLevelVal([s.dmg[0][0], s.dmg[1][0]]), this.skLevelVal([s.dmg[0][1], s.dmg[1][1]])] : s.dmg[0], range: s.range, src: this });
        this.setAnim('special'); this.casting = 0.6; b.fx.sfx('build_tower', this.x, { vol: 0.6 });
      }
    }
    if (ready('quake')) {
      const s = this.sk('quake');
      const list = enemiesInRange(b, this.x, this.y, s.radius, false, []);
      if (list.length >= 3) {
        T.quake = s.cd;
        for (const e of list) { stunEnemy(e, s.stun); damageEnemy(b, e, this.skLevelVal(s.dmg), 'phys', this); }
        b.fx.burst('quake', this.x, this.y); b.fx.shake(6); b.fx.sfx('ground_slam', this.x);
        this.setAnim('special'); this.casting = 0.6;
      }
    }
    if (ready('keg')) {
      const s = this.sk('keg');
      const list = enemiesInRange(b, this.x, this.y, 240, false, []);
      const c = clusterTarget(list, s.radius);
      if (c.e && c.count >= 3) {
        T.keg = s.cd;
        b.projectile('keg', this.x, this.y - 30, null, { tx: c.e.x, ty: c.e.y, dmg: this.skLevelVal(s.dmg), dtype: 'phys', splash: s.radius, src: this });
        this.setAnim('special'); this.casting = 0.5;
      }
    }
    // --- Aerin ---
    if (ready('dive')) {
      const s = this.sk('dive');
      const list = enemiesInRange(b, this.x, this.y, 220, true, []);
      const c = clusterTarget(list, s.radius);
      if (c.e && c.count >= 2) {
        T.dive = s.cd;
        splash(b, c.e.x, c.e.y, s.radius, this.skLevelVal(s.dmg), 'phys', this, { air: true, noFalloff: true });
        b.fx.burst('dive', c.e.x, c.e.y); b.fx.sfx('hero_attack', c.e.x); b.fx.shake(3);
        this.setAnim('special'); this.casting = 0.5;
      }
    }
    if (ready('gale')) {
      const s = this.sk('gale');
      const list = enemiesInRange(b, this.x, this.y, s.radius + 60, false, []).filter(e => !e.def.boss);
      if (list.length >= 4) {
        T.gale = s.cd;
        for (const e of list) { e.release(); e.s = Math.max(0, e.s - s.push); e.path.pos(e.s, e.lane, e); }
        b.fx.burst('gale', this.x, this.y); b.fx.sfx('blizzard', this.x);
        this.setAnim('special'); this.casting = 0.5;
      }
    }
    if (ready('talonstorm')) {
      const s = this.sk('talonstorm');
      const list = enemiesInRange(b, this.x, this.y, 200, true, []);
      if (list.length >= 3) {
        T.talonstorm = s.cd;
        for (let i = 0; i < s.hits; i++) { const e = list[i % list.length]; damageEnemy(b, e, this.skLevelVal(s.dmg), 'phys', this); b.fx.burst('claw', e.x, e.y - e.def.h * 0.5); }
        b.fx.sfx('hero_skill', this.x); this.setAnim('special'); this.casting = 0.6;
      }
    }
    // --- Ysolde ---
    if (ready('lash')) {
      const s = this.sk('lash');
      const list = enemiesInRange(b, this.x, this.y, this.ranged.range, true, []);
      if (list.length >= 2) {
        T.lash = s.cd;
        list.sort((a, c) => rangeDist(this.x, this.y, a.x, a.y) - rangeDist(this.x, this.y, c.x, c.y));
        let px = this.x, py = this.y - 30;
        for (let i = 0; i < Math.min(s.targets, list.length); i++) {
          const e = list[i];
          damageEnemy(b, e, this.skLevelVal(s.dmg), 'magic', this); burnEnemy(e, 12, 3, 'fire', this);
          b.fx.beam('fire', px, py, e.x, e.y - e.def.h * 0.5); px = e.x; py = e.y - e.def.h * 0.5;
        }
        b.fx.sfx('fireball', this.x); this.setAnim('special'); this.casting = 0.5;
      }
    }
    if (ready('veil')) {
      const s = this.sk('veil');
      const allies = b.soldiers.filter(u => !u.dead && inRange(this.x, this.y, u.x, u.y, s.radius) && u.hp < u.maxHp * 0.5);
      if (allies.length >= 1) {
        T.veil = s.cd;
        for (const u of b.soldiers) if (!u.dead && inRange(this.x, this.y, u.x, u.y, s.radius)) { u.immune = s.dur; b.fx.burst('veil', u.x, u.y); }
        b.fx.sfx('teleport', this.x); this.setAnim('special'); this.casting = 0.5;
      }
    }
    if (ready('phoenix')) {
      const s = this.sk('phoenix');
      const list = enemiesInRange(b, this.x, this.y, s.radius, false, []);
      if (list.length >= 4 || (list.length >= 1 && this.hp < this.maxHp * 0.35)) {
        T.phoenix = s.cd;
        for (const e of list) { damageEnemy(b, e, this.skLevelVal(s.dmg), 'magic', this); burnEnemy(e, 20, 4, 'fire', this); }
        b.fx.burst('phoenix', this.x, this.y); b.fx.shake(6); b.fx.sfx('meteor_impact', this.x, { vol: 0.7 });
        this.setAnim('special'); this.casting = 0.8;
      }
    }
  }
}
