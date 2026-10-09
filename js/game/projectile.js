// Rampart Riot — projectiles (arrows, bolts, orbs, bombs, rockets, flasks, meteors, enemy shots)
import { clamp } from '../core/util.js';
import { damageEnemy, splash, slowEnemy, shredEnemy, stunEnemy, burnEnemy, damageSoldier, soldierTargetable, targetable } from './combat.js';

const HOMING_ARC = { arrow: [850, 0.22, 0.26, 0.8], heroArrow: [900, 0.18, 0.22, 0.7], javelin: [600, 0.25, 0.3, 0.9], stone: [520, 0.3, 0.3, 0.9], earrow: [800, 0.2, 0.25, 0.8] };
const HOMING_STRAIGHT = { bolt: 1700, ebolt: 1300, orb: 680, frostorb: 680, starbolt: 760, firebolt: 760, ember: 520, cannonball: 1100 };
const BALLISTIC = { bomb: 1, flask: 1, keg: 1 };

export class Projectile {
  constructor(b, kind, x, y, target, o = {}) {
    this.b = b; this.kind = kind; this.o = o;
    this.sx = x; this.sy = y; this.x = x; this.y = y; this.z = 0;
    this.target = target; this.t = -(o.delay || 0); this.dead = false;
    this.ang = 0; this.u = 0;
    this.lastX = target ? target.x : (o.tx ?? x); this.lastY = target ? target.y - (target.def ? target.def.h * 0.5 : 20) : (o.ty ?? y);
    if (HOMING_ARC[kind]) {
      const [sp, arc, tmin, tmax] = HOMING_ARC[kind];
      const d = Math.hypot(this.lastX - x, this.lastY - y);
      this.T = clamp(d / sp, tmin, tmax); this.arc = d * arc; this.mode = 'arc';
    } else if (HOMING_STRAIGHT[kind]) {
      this.speed = HOMING_STRAIGHT[kind]; this.mode = 'home';
    } else if (BALLISTIC[kind]) {
      this.tx = o.tx; this.ty = o.ty;
      const d = Math.hypot(o.tx - x, o.ty - y);
      this.T = o.T || (0.75 + d / 1400); this.arc = 110 + d * 0.28; this.mode = 'ballistic';
      this.gx0 = x; this.gy0 = y + (o.top || 30);
      this.spin = (b.rng.next() - 0.5) * 12;
    } else if (kind === 'rocket' || kind === 'minirocket') {
      this.mode = 'rocket';
      this.vx = (b.rng.next() - 0.5) * 120; this.vy = -380 - b.rng.next() * 80;
      this.speed = kind === 'rocket' ? 560 : 640; this.life = 0;
    } else if (kind === 'meteor') {
      this.mode = 'meteor';
      this.tx = o.tx; this.ty = o.ty; this.T = o.T || 0.95;
      this.sx = o.tx - 260; this.sy = o.ty - 820; this.x = this.sx; this.y = this.sy;
    } else if (kind === 'piercebolt') {
      this.mode = 'line'; this.tx = o.tx; this.ty = o.ty; this.T = 0.22;
    }
  }

  aimPoint() {
    const t = this.target;
    if (t && !t.dead && !t.removed && (t.def ? targetable(t, true) : soldierTargetable(t))) {
      this.lastX = t.x;
      this.lastY = t.y - (t.def ? (t.flying ? t.def.fly : 0) + t.def.h * 0.5 : 22);
      return true;
    }
    return false;
  }

  update(dt) {
    this.t += dt;
    if (this.t < 0) return;
    const b = this.b;
    switch (this.mode) {
      case 'arc': {
        const alive = this.aimPoint();
        const u = Math.min(1, this.t / this.T);
        const px = this.x, py = this.y;
        this.x = this.sx + (this.lastX - this.sx) * u;
        this.y = this.sy + (this.lastY - this.sy) * u - this.arc * 4 * u * (1 - u);
        this.ang = Math.atan2(this.y - py, this.x - px);
        this.u = u;
        if (u >= 1) this.arrive(alive);
        break;
      }
      case 'home': {
        const alive = this.aimPoint();
        const dx = this.lastX - this.x, dy = this.lastY - this.y, d = Math.hypot(dx, dy);
        const st = this.speed * dt;
        this.ang = Math.atan2(dy, dx);
        if (d <= st + 4) { this.x = this.lastX; this.y = this.lastY; this.arrive(alive); }
        else { this.x += (dx / d) * st; this.y += (dy / d) * st; }
        break;
      }
      case 'ballistic': {
        const u = Math.min(1, this.t / this.T);
        const px = this.x, py = this.y;
        this.x = this.sx + (this.tx - this.sx) * u;
        this.y = this.sy + (this.ty - this.sy) * u - this.arc * 4 * u * (1 - u);
        this.gx = this.gx0 + (this.tx - this.gx0) * u; this.gy = this.gy0 + (this.ty - this.gy0) * u;
        this.ang = Math.atan2(this.y - py, this.x - px);
        this.rot = (this.rot || 0) + this.spin * dt;
        this.u = u;
        if (u >= 1) this.land();
        break;
      }
      case 'rocket': {
        this.life += dt;
        this.aimPoint();
        const dx = this.lastX - this.x, dy = this.lastY - this.y, d = Math.hypot(dx, dy) || 1;
        const steer = this.life < 0.18 ? 0.5 : 9;
        const sp = this.speed * (this.life < 0.18 ? 0.8 : 1);
        this.vx += ((dx / d) * sp - this.vx) * Math.min(1, steer * dt);
        this.vy += ((dy / d) * sp - this.vy) * Math.min(1, steer * dt);
        this.x += this.vx * dt; this.y += this.vy * dt;
        this.ang = Math.atan2(this.vy, this.vx);
        if (this.smokeT === undefined || (this.smokeT -= dt) <= 0) { this.smokeT = 0.035; b.fx.trail(this.x - Math.cos(this.ang) * 8, this.y - Math.sin(this.ang) * 8); }
        if (d < 14 || this.life > 3) this.explodeRocket();
        break;
      }
      case 'meteor': {
        const u = Math.min(1, this.t / this.T);
        this.x = this.sx + (this.tx - this.sx) * u * u;
        this.y = this.sy + (this.ty - this.sy) * u * u;
        this.ang = Math.atan2(this.ty - this.sy, this.tx - this.sx);
        this.u = u;
        if (this.smokeT === undefined || (this.smokeT -= dt) <= 0) { this.smokeT = 0.03; b.fx.trail(this.x, this.y, 'fire'); }
        if (u >= 1) this.meteorHit();
        break;
      }
      case 'line': {
        const u = Math.min(1, this.t / this.T);
        this.x = this.sx + (this.tx - this.sx) * u; this.y = this.sy + (this.ty - this.sy) * u;
        this.ang = Math.atan2(this.ty - this.sy, this.tx - this.sx);
        if (u >= 1) this.dead = true;
        break;
      }
    }
  }

  dmgRoll() { const d = this.o.dmg; return Array.isArray(d) ? this.b.rng.range(d[0], d[1]) : d; }

  arrive(alive) {
    this.dead = true;
    const b = this.b, o = this.o, t = this.target;
    const k = this.kind;
    const enemyShot = k === 'stone' || k === 'earrow' || k === 'ebolt' || k === 'ember';
    if (enemyShot) {
      if (alive && t) { damageSoldier(b, t, this.dmgRoll(), k === 'ember' ? 'magic' : 'phys', o.src); b.fx.burst(k === 'ember' ? 'emberhit' : 'hitspark', this.x, this.y); }
      return;
    }
    if (!alive || !t) {
      if (k === 'arrow' || k === 'heroArrow' || k === 'javelin') b.fx.stuck(k, this.lastX, this.lastY + 18, this.ang);
      return;
    }
    if (k === 'cannonball') { splash(b, this.x, this.y + 10, 30, o.dmg, 'phys', o.src, { air: true }); b.fx.burst('smallboom', this.x, this.y); return; }
    let dmg = this.dmgRoll();
    if (o.execute !== undefined) {
      if (!t.def.boss && b.rng.next() < o.execute) {
        b.fx.burst('execute', t.x, t.y - t.def.h * 0.6); b.fx.text('execute', t.x, t.y - t.def.h - 10);
        damageEnemy(b, t, t.hp + t.maxHp, 'true', o.src);
        b.fx.sfx('bolt_pierce', t.x);
        return;
      }
    }
    damageEnemy(b, t, dmg, o.dtype || 'phys', o.src, { pierce: o.pierce || 0 });
    switch (k) {
      case 'arrow': case 'heroArrow': case 'javelin': b.fx.sfx('arrow_hit', t.x, { vol: 0.35 }); b.fx.burst('hitspark', this.x, this.y); break;
      case 'bolt': b.fx.sfx('arrow_hit', t.x, { vol: 0.5 }); b.fx.burst(o.big ? 'boltbig' : 'hitspark', this.x, this.y); break;
      case 'orb': case 'starbolt': b.fx.burst('magichit', this.x, this.y); b.fx.sfx('magic_hit', t.x, { vol: 0.45 }); break;
      case 'firebolt': b.fx.burst('emberhit', this.x, this.y); burnEnemy(t, 8, 2, 'fire', o.src); b.fx.sfx('magic_hit', t.x, { vol: 0.45 }); break;
      case 'frostorb': b.fx.burst('frosthit', this.x, this.y); b.fx.sfx('magic_hit', t.x, { vol: 0.4 }); break;
    }
    if (o.slow) slowEnemy(t, 1 - o.slow, o.slowDur || 1);
  }

  land() {
    this.dead = true;
    const b = this.b, o = this.o;
    const k = this.kind;
    const x = this.tx, y = this.ty;
    if (k === 'bomb' || k === 'keg') {
      const stun = b.mods.artStun && o.src && o.src.line === 'artillery' ? b.mods.artStun : 0;
      splash(b, x, y, o.splash, o.dmg, 'phys', o.src, { onEach: stun ? (e => { if (b.rng.next() < stun) stunEnemy(e, 0.6); }) : null });
      b.fx.explosion(x, y, o.big || k === 'keg' ? 1.2 : 0.85);
      b.fx.sfx('bomb_explode', x, { vol: 0.7 });
      b.fx.shake(k === 'keg' ? 4 : o.big ? 2.5 : 1.5);
      b.fx.decal('scorch', x, y);
    } else if (k === 'flask') {
      splash(b, x, y, o.splash, o.dmg, 'phys', o.src, { onEach: e => { if (o.shred) shredEnemy(e, o.shred, o.shredDur); } });
      b.fx.burst('acid', x, y);
      b.fx.sfx('acid_splash', x, { vol: 0.7 });
      if (o.pool) b.addZone({ kind: 'acid', x, y, r: o.pool.r, dur: o.pool.dur, dps: o.pool.dps, src: o.src });
      b.fx.decal('acid', x, y);
    }
  }

  explodeRocket() {
    this.dead = true;
    const b = this.b, o = this.o;
    splash(b, this.x, this.y + 8, o.splash || 50, o.dmg, 'phys', o.src, { air: true });
    b.fx.explosion(this.x, this.y + 8, this.kind === 'rocket' ? 0.9 : 0.55);
    b.fx.sfx('rocket_explode', this.x, { vol: this.kind === 'rocket' ? 0.6 : 0.35 });
    if (o.fire) b.addZone({ kind: 'fire', x: this.x, y: this.y + 8, r: 55, dur: 3, dps: o.fire, src: o.src });
  }

  meteorHit() {
    this.dead = true;
    const b = this.b, o = this.o;
    splash(b, this.tx, this.ty, o.radius, o.dmg, 'true', null, { noFalloff: false });
    b.fx.explosion(this.tx, this.ty, 1.5, 'fire');
    b.fx.sfx('meteor_impact', this.tx, { vol: 0.85 });
    b.fx.shake(7);
    b.fx.decal('crater', this.tx, this.ty);
    if (o.scorch) b.addZone({ kind: 'fire', x: this.tx, y: this.ty, r: o.radius * 0.8, dur: 4, dps: 15 });
  }
}
