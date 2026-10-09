// Rampart Riot — enemy behaviour (walking, blocking, ranged attacks, abilities)
import { ENEMIES, ELITE } from '../data/enemies.js';
import { inRange, rangeDist, clamp } from '../core/util.js';
import { damageSoldier, soldierTargetable, splash, damageEnemy } from './combat.js';

const HIT_DELAY = 0.22;

export class Enemy {
  constructor(b, type, pathIdx, o = {}) {
    const def = ENEMIES[type];
    this.b = b; this.type = type; this.def = def;
    this.uid = b.nextId++;
    const hpMul = b.hpMul * (o.elite ? ELITE.hp : 1) * (def.boss ? b.bossHpMul : 1);
    this.maxHp = Math.round(def.hp * hpMul);
    this.hp = this.maxHp;
    this.armor = def.armor + (o.elite ? ELITE.armorAdd : 0);
    this.mr = def.mr;
    this.speed = def.speed * (o.elite ? ELITE.speed : 1);
    this.elite = !!o.elite;
    this.pathIdx = pathIdx;
    this.path = b.paths[pathIdx];
    this.s = o.s ?? 0;
    this.lane = o.lane ?? (b.rng.range(-1, 1) * this.path.width * (def.flying ? 0.6 : 1));
    this.flying = !!def.flying;
    this.size = def.size;
    this.x = 0; this.y = 0;
    this.path.pos(this.s, this.lane, this);
    this.facing = this.path.dirX(this.s) < 0 ? -1 : 1;
    this.state = 'walk';
    this.blocker = null;
    this.atkT = 0.3; this.rangedT = 0.5;
    this.anim = 'walk'; this.animT = b.rng.next() * 2;
    this.slows = []; this.stun = 0; this.freeze = 0; this.root = 0; this.burns = [];
    this.mark = null; this.shred = 0; this.shredT = 0; this.sheep = 0; this.absorb = 0; this.absorbT = 0;
    this.dead = false; this.removed = false; this.deathT = 0; this.spawned = true;
    this.burrowed = false; this.untargetable = false;
    this.pending = null; this.hitT = 0;
    this.ab = {};
    this.revived = false; this.phase = 1;
    this.queue = []; this.burrowT = 0; this.shootStand = 0; this.noShoot = 0;
    this.bob = b.rng.next() * 10;
    if (o.flash) this.spawnFlash = 0.5;
  }

  get alive() { return !this.dead && !this.removed; }
  progress() { return this.s / this.path.len; }
  setAnim(a) { if (this.anim !== a) { this.anim = a; this.animT = 0; } }

  slowMul() {
    let m = 1;
    for (const s of this.slows) if (s.mul < m) m = s.mul;
    if (this.sheep > 0) m = Math.min(m, 0.6);
    return m;
  }

  // predicted position after t seconds (for artillery lead)
  predict(t, out = {}) {
    if (this.state !== 'walk' || this.stun > 0 || this.freeze > 0 || this.root > 0) { out.x = this.x; out.y = this.y; return out; }
    const s = Math.min(this.path.len, this.s + this.speed * this.slowMul() * t);
    return this.path.pos(s, this.lane, out);
  }

  release() {
    if (this.blocker) { if (this.blocker.target === this) this.blocker.target = null; this.blocker = null; }
  }

  update(dt) {
    const b = this.b, def = this.def;
    this.animT += this.anim === 'walk' ? dt * this.slowMul() * (this.burrowed ? 1.6 : 1) : dt;
    if (this.hitT > 0) this.hitT -= dt;
    if (this.spawnFlash > 0) this.spawnFlash -= dt;
    if (this.dead) {
      this.deathT += dt;
      if (this.deathT > (def.boss ? 3.5 : 1.6)) this.removed = true;
      return;
    }
    if (this.reviving > 0) {
      this.reviving -= dt;
      if (this.reviving <= 0.8 && this.anim === 'death') this.setAnim('revive');
      if (this.reviving <= 0) {
        this.untargetable = false; this.hp = this.maxHp * def.revive.hp; this.setAnim('walk');
        b.fx.sfx('emerge', this.x); b.fx.burst('revive', this.x, this.y);
      }
      return;
    }
    // ---- status timers ----
    for (let i = this.slows.length - 1; i >= 0; i--) { this.slows[i].t -= dt; if (this.slows[i].t <= 0) this.slows.splice(i, 1); }
    if (this.stun > 0) this.stun -= dt;
    if (this.freeze > 0) { this.freeze -= dt; if (this.freeze <= 0) b.fx.burst('iceshatter', this.x, this.y - def.h * 0.4); }
    if (this.root > 0) this.root -= dt;
    if (this.shredT > 0) this.shredT -= dt;
    if (this.absorbT > 0) { this.absorbT -= dt; if (this.absorbT <= 0) this.absorb = 0; }
    if (this.mark) { this.mark.t -= dt; if (this.mark.t <= 0) this.mark = null; }
    if (this.sheep > 0) { this.sheep -= dt; if (this.sheep <= 0) { b.fx.burst('poof', this.x, this.y - 10); b.fx.sfx('sheep_pop', this.x); } }
    for (let i = this.burns.length - 1; i >= 0; i--) {
      const bu = this.burns[i];
      bu.t -= dt;
      damageEnemy(b, this, bu.dps * dt, 'true', bu.src, { noDodge: true });
      if (this.dead) return;
      if (bu.t <= 0) this.burns.splice(i, 1);
    }
    if (def.regen && !this.burns.length && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + def.regen * dt);
    if (this.burrowed) this.burrowT += dt;
    if (this.noShoot > 0) this.noShoot -= dt;
    // queued actions timed to animation key frames
    if (this.queue.length) for (let i = this.queue.length - 1; i >= 0; i--) { const q = this.queue[i]; q.t -= dt; if (q.t <= 0) { this.queue.splice(i, 1); if (!this.dead) q.fn(); } }

    // ---- pending melee hit ----
    if (this.pending) {
      this.pending.t -= dt;
      if (this.pending.t <= 0) {
        const tgt = this.pending.target; this.pending = null;
        if (def.splashMelee) {
          let any = false;
          for (const s of b.soldiers) if (soldierTargetable(s) && !s.flying && inRange(this.x, this.y, s.x, s.y, def.splashMelee)) { damageSoldier(b, s, b.rng.range(def.dmg[0], def.dmg[1]), 'phys', this); any = true; }
          if (any) { b.fx.burst('dust', this.x + this.facing * 20, this.y); b.fx.shake(def.boss ? 5 : 3); b.fx.sfx('stomp', this.x, { vol: 0.7 }); }
        } else if (tgt && soldierTargetable(tgt)) {
          damageSoldier(b, tgt, b.rng.range(def.dmg[0], def.dmg[1]), 'phys', this);
          b.fx.sfx(def.big || def.boss ? 'shield_block' : 'sword_hit', this.x, { vol: 0.55 });
        }
      }
    }

    if (this.stun > 0 || this.freeze > 0) { if (this.anim !== 'idle') this.setAnim('idle'); return; }

    // ---- abilities ----
    this.abilities(dt);
    if (this.dead || this.removed) return;
    if (this.casting > 0) { this.casting -= dt; return; }

    // ---- melee engagement ----
    const bl = this.blocker;
    if (bl && (!soldierTargetable(bl) || (bl.target !== this && !(bl.taunt > 0 && inRange(bl.x, bl.y, this.x, this.y, bl.tauntR || 100))))) this.blocker = null;
    if (this.blocker && !this.burrowed) {
      const s = this.blocker;
      this.state = 'fight';
      this.facing = s.x < this.x ? -1 : 1;
      const reach = this.size + s.size + 14;
      if (Math.abs(s.x - this.x) <= reach + 6 && Math.abs(s.y - this.y) < 24) {
        this.atkT -= dt;
        if (this.atkT <= 0 && this.sheep <= 0) {
          this.atkT = def.cd;
          this.setAnim('attack');
          this.pending = { t: HIT_DELAY, target: s };
        } else if (this.anim !== 'attack' || this.animT > 0.6) this.setAnim('idle');
      } else if (this.anim !== 'idle') this.setAnim('idle');
      return;
    }

    // ---- ranged attackers stop to shoot soldiers/heroes in range ----
    if (def.ranged && this.sheep <= 0 && !this.burrowed && this.noShoot <= 0) {
      this.rangedT -= dt;
      const tgt = this.rangedTarget;
      const valid = tgt && soldierTargetable(tgt) && inRange(this.x, this.y, tgt.x, tgt.y, def.ranged.range);
      if (!valid) this.rangedTarget = null;
      if (!this.rangedTarget && this.rangedT <= 0) this.rangedTarget = this.findRangedTarget();
      if (this.rangedTarget) {
        this.state = 'shoot';
        this.shootStand += dt;
        if (this.shootStand > 7) { this.noShoot = 4; this.shootStand = 0; this.rangedTarget = null; }
        else {
          this.facing = this.rangedTarget.x < this.x ? -1 : 1;
          if (this.rangedT <= 0) {
            this.rangedT = def.ranged.cd;
            this.setAnim('attack');
            const tgt = this.rangedTarget;
            const fire = () => { if (soldierTargetable(tgt) && this.stun <= 0 && this.freeze <= 0) this.b.enemyShoot(this, tgt); };
            if (def.ranged.delay) this.queue.push({ t: def.ranged.delay, fn: fire }); else fire();
          } else if (this.anim === 'walk' || (this.anim === 'attack' && this.animT > 0.7)) this.setAnim('idle');
          return;
        }
      }
    }
    this.shootStand = 0;

    // ---- walking ----
    this.state = 'walk';
    if (this.root > 0) { this.setAnim('idle'); return; }
    let sp = this.speed * this.slowMul();
    if (this.burrowed) sp *= def.burrow.speedMul;
    this.s += sp * dt;
    if (this.s >= this.path.len) { this.b.leak(this); return; }
    this.path.pos(this.s, this.lane, this);
    const dx = this.path.dirX(this.s);
    if (Math.abs(dx) > 0.5) this.facing = dx < 0 ? -1 : 1;
    if (!this.burrowed && this.anim !== 'walk' && !(this.anim === 'special' && this.animT < 0.8) && !(this.anim === 'emerge' && this.animT < 0.5)) this.setAnim('walk');
  }

  findRangedTarget() {
    let best = null, bd = Infinity;
    for (const s of this.b.soldiers) {
      if (!soldierTargetable(s)) continue;
      const d = rangeDist(this.x, this.y, s.x, s.y);
      if (d <= this.def.ranged.range && d < bd) { bd = d; best = s; }
    }
    return best;
  }

  abilities(dt) {
    const b = this.b, def = this.def, A = this.ab;
    const tick = (key, cd, first = 0.5) => { if (A[key] === undefined) A[key] = cd * first; A[key] -= dt; if (A[key] <= 0) { A[key] = cd; return true; } return false; };

    if (def.heal && tick('heal', def.heal.cd, 0.4)) {
      let any = false;
      for (const e of b.enemies) if (e.alive && !e.flying && e.hp < e.maxHp && inRange(this.x, this.y, e.x, e.y, def.heal.radius)) { e.hp = Math.min(e.maxHp, e.hp + def.heal.amount); b.fx.burst('heal', e.x, e.y - e.def.h * 0.5); any = true; }
      if (any) { this.setAnim('special'); this.casting = 0.6; b.fx.sfx('heal', this.x); }
      else A.heal = 1;
    }
    if (def.shield && tick('shield', def.shield.cd, 0.5)) {
      let any = false;
      for (const e of b.enemies) if (e.alive && e !== this && inRange(this.x, this.y, e.x, e.y, def.shield.radius)) { e.absorb = def.shield.amount; e.absorbT = 8; any = true; b.fx.burst('fireshield', e.x, e.y - e.def.h * 0.5); }
      if (any) { this.setAnim('special'); this.casting = 0.6; b.fx.sfx('shield_up', this.x); }
      else A.shield = 1.5;
    }
    if (def.freeze && tick('freeze', def.freeze.cd, 0.5)) {
      const ts = b.towers.filter(t => !t.disabled && inRange(this.x, this.y, t.x, t.y, def.freeze.range));
      if (ts.length) {
        const t = ts[Math.floor(b.rng.next() * ts.length)];
        t.disable(def.freeze.dur, 'ice');
        this.setAnim('special'); this.casting = 0.7;
        b.fx.beam('frost', this.x + this.facing * (def.freeze.ox || 0), this.y - (def.freeze.oy ?? def.h * 0.7), t.x, t.y - 40);
        b.fx.sfx('tower_disabled', t.x);
      } else A.freeze = 1;
    }
    if (def.curse && tick('curse', def.curse.cd * (this.phase === 3 ? 0.7 : 1), 0.6)) {
      const ts = b.towers.filter(t => !t.disabled && inRange(this.x, this.y, t.x, t.y, 480));
      for (let i = 0; i < def.curse.towers && ts.length; i++) {
        const t = ts.splice(Math.floor(b.rng.next() * ts.length), 1)[0];
        t.disable(def.curse.dur, 'curse');
        b.fx.beam('curse', this.x, this.y - def.h * 0.7, t.x, t.y - 40);
      }
      this.setAnim('special'); this.casting = 0.8; b.fx.sfx('tower_disabled', this.x);
    }
    if (def.stomp && tick('stomp', def.stomp.cd, 0.6)) {
      const hit = b.soldiers.filter(s => soldierTargetable(s) && !s.flying && inRange(this.x, this.y, s.x, s.y, def.stomp.radius));
      if (hit.length) {
        this.setAnim('special'); this.casting = 0.8;
        this.queue.push({ t: def.stomp.delay ?? 0.35, fn: () => {
          for (const s of b.soldiers) if (soldierTargetable(s) && !s.flying && inRange(this.x, this.y, s.x, s.y, def.stomp.radius)) { s.stun = Math.max(s.stun || 0, def.stomp.stun); damageSoldier(b, s, def.stomp.dmg, 'phys', this); }
          b.fx.burst('stomp', this.x + this.facing * (def.stomp.ox || 0), this.y); b.fx.shake(def.boss ? 8 : 5); b.fx.sfx('stomp', this.x);
        } });
      } else A.stomp = 1;
    }
    if (def.summon && tick('summon', def.summon.cd * (this.phase >= 2 ? 0.75 : 1), 0.5)) {
      if (this.s > 60 && this.s < this.path.len - 200) {
        for (let i = 0; i < def.summon.count; i++) {
          const e = b.spawnEnemy(def.summon.unit, this.pathIdx, { s: Math.max(0, this.s - 20 - i * 18), elite: this.elite, flash: true });
          if (e) b.fx.burst('summon', e.x, e.y);
        }
        this.setAnim('special'); this.casting = 0.8;
        b.fx.sfx(def.boss ? 'boss_roar' : 'enemy_spawn_portal', this.x);
      }
    }
    if (def.breath && tick('breath', def.breath.cd, 0.5)) {
      const br = def.breath;
      const sol = b.soldiers.filter(s => soldierTargetable(s) && inRange(this.x, this.y, s.x, s.y, br.range));
      const tw = b.towers.filter(t => !t.disabled && inRange(this.x, this.y, t.x, t.y, br.range + 60));
      if (sol.length || tw.length) {
        for (const s of sol) { s.stun = Math.max(s.stun || 0, br.freezeSoldiers); s.frozen = br.freezeSoldiers; damageSoldier(b, s, br.dmg, 'magic', this); }
        if (tw.length) { let t = tw[0], bd = Infinity; for (const x of tw) { const d = rangeDist(this.x, this.y, x.x, x.y); if (d < bd) { bd = d; t = x; } } t.disable(br.freezeTower, 'ice'); }
        this.setAnim('special'); this.casting = 1.0;
        b.fx.breath(this.x + this.facing * (br.ox ?? 40), this.y - (br.oy ?? def.h * 0.55), this.facing);
        b.fx.sfx('blizzard', this.x); b.fx.shake(4);
      } else A.breath = 1;
    }
    if (def.burrow) {
      if (A.bur === undefined) A.bur = def.burrow.every * (0.5 + b.rng.next() * 0.5);
      A.bur -= dt;
      if (!this.burrowed && A.bur <= 0) {
        this.burrowed = true; this.burrowT = 0; A.bur = def.burrow.dur; this.release(); this.setAnim('burrow');
        b.fx.sfx('burrow', this.x); b.fx.burst('dirt', this.x, this.y);
      } else if (this.burrowed && A.bur <= 0) {
        this.burrowed = false; A.bur = def.burrow.every; this.setAnim('emerge');
        b.fx.sfx('emerge', this.x); b.fx.burst('dirt', this.x, this.y);
      }
    }
    if (def.blink && tick('blink', def.blink.cd, 0.7)) {
      if (this.s < this.path.len - def.blink.dist - 150) this.teleport(def.blink.dist);
      else A.blink = 2;
    }
    if (def.devour && this.blocker && !this.blocker.isHero && tick('devour', def.devour.cd, 0.4)) {
      const s = this.blocker;
      b.fx.sfx('roar', this.x);
      this.setAnim('special'); this.casting = 0.9;
      this.queue.push({ t: 0.35, fn: () => { if (soldierTargetable(s)) { b.fx.burst('devour', s.x, s.y); s.hp = 0; s.die(this, true); } } });
    }
    if (def.phases) {
      const f = this.hp / this.maxHp;
      if (this.phase === 1 && f < 0.66) { this.phase = 2; this.speed *= 1.2; b.fx.sfx('boss_roar', this.x); b.fx.shake(10); b.notify('bossPhase', { e: this, phase: 2 }); this.setAnim('special'); this.casting = 1.4; }
      else if (this.phase === 2 && f < 0.33) { this.phase = 3; b.fx.sfx('boss_roar', this.x); b.fx.shake(12); b.notify('bossPhase', { e: this, phase: 3 }); this.setAnim('special'); this.casting = 1.4; }
      if (this.phase === 3 && tick('aura', 1, 1)) {
        for (const s of b.soldiers) if (soldierTargetable(s) && inRange(this.x, this.y, s.x, s.y, 120)) damageSoldier(b, s, 25, 'magic', this);
        b.fx.burst('flameaura', this.x, this.y);
      }
    }
  }

  teleport(dist) {
    const b = this.b;
    if (!this.dead) { this.setAnim('special'); this.casting = Math.max(this.casting || 0, 0.25); }
    b.fx.burst('teleport', this.x, this.y - this.def.h * 0.5);
    this.release();
    this.s = Math.min(this.path.len - 120, this.s + dist);
    this.path.pos(this.s, this.lane, this);
    b.fx.burst('teleport', this.x, this.y - this.def.h * 0.5);
    b.fx.sfx('teleport', this.x);
  }

  onHit() {
    const def = this.def;
    if (def.blinkOnHit && !this.dead) {
      const A = this.ab;
      if ((A.boh || 0) <= this.b.t && this.s < this.path.len - def.blinkOnHit.dist - 150) {
        A.boh = this.b.t + def.blinkOnHit.cd;
        this.teleport(def.blinkOnHit.dist);
      }
    }
  }
}
