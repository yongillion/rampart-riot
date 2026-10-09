// Rampart Riot — damage resolution, status effects and target queries (shared by all game entities)
import { inRange, rangeDist } from '../core/util.js';

// ---------- queries ----------
export function targetable(e, air = true) {
  return !e.dead && !e.removed && e.spawned && !e.burrowed && !e.untargetable && (air || !e.flying);
}

export function enemiesInRange(b, x, y, r, air = true, out = []) {
  out.length = 0;
  for (const e of b.enemies) if (targetable(e, air) && inRange(x, y, e.x, e.y, r + e.size * 0.5)) out.push(e);
  return out;
}

// KR-like default priority: the enemy closest to the exit
export function firstTarget(list) {
  let best = null, bv = Infinity;
  for (const e of list) { const v = e.path.len - e.s; if (v < bv) { bv = v; best = e; } }
  return best;
}
export function strongestTarget(list, noBoss = false) {
  let best = null, bv = -1;
  for (const e of list) { if (noBoss && e.def.boss) continue; if (e.hp > bv) { bv = e.hp; best = e; } }
  return best;
}
export function nearestTarget(list, x, y) {
  let best = null, bv = Infinity;
  for (const e of list) { const d = rangeDist(x, y, e.x, e.y); if (d < bv) { bv = d; best = e; } }
  return best;
}
// densest cluster center among candidates (for AoE skills)
export function clusterTarget(list, radius) {
  let best = null, bc = 0;
  for (const e of list) {
    let c = 0;
    for (const o of list) if (inRange(e.x, e.y, o.x, o.y, radius)) c += o.def.big || o.def.boss ? 2 : 1;
    if (c > bc) { bc = c; best = e; }
  }
  return { e: best, count: bc };
}

// ---------- enemy damage ----------
// type: 'phys' | 'magic' | 'true'
export function damageEnemy(b, e, amount, type, src = null, o = {}) {
  if (e.dead || e.removed || !e.spawned) return 0;
  if (type === 'phys' && e.def.dodge && !o.noDodge && b.rng.next() < e.def.dodge) {
    b.fx.text && b.fx.text('miss', e.x, e.y - e.def.h);
    return 0;
  }
  let a = amount;
  if (e.mark) a *= 1 + e.mark.bonus;
  if (e.freeze > 0) a *= 1.25;
  if (e.sheep > 0) a *= 1.5;
  if (type === 'phys') {
    const armor = Math.max(0, Math.min(0.9, e.armor - (e.shredT > 0 ? e.shred : 0) - (o.pierce || 0)));
    a *= 1 - armor;
  } else if (type === 'magic') {
    a *= 1 - Math.max(0, Math.min(0.9, e.mr - (o.mpierce || 0)));
  }
  if (e.absorb > 0) {
    const used = Math.min(e.absorb, a);
    e.absorb -= used; a -= used;
    if (a <= 0) return 0;
  }
  if (e.def.boss && b.heroic) a *= 1;
  e.hp -= a;
  e.hitT = 0.12;
  b.stats.damage += a;
  if (src && src.isHero) { src.dealt += a; b.heroXp(src, a * 0.05); }
  if (e.onHit) e.onHit(src, a);
  if (e.hp <= 0) b.killEnemy(e, src);
  return a;
}

// splash damage around a point (ellipse); falloff toward the edge
export function splash(b, x, y, radius, dmg, type, src, o = {}) {
  let hits = 0;
  const list = b.enemies.slice();
  for (const e of list) {
    if (!targetable(e, !!o.air)) continue;
    if (o.airOnly && !e.flying) continue;
    const d = rangeDist(x, y, e.x, e.y);
    if (d > radius + e.size * 0.6) continue;
    const f = o.noFalloff ? 1 : 1 - 0.45 * Math.min(1, d / radius);
    const amt = (Array.isArray(dmg) ? b.rng.range(dmg[0], dmg[1]) : dmg) * f;
    damageEnemy(b, e, amt, type, src, o);
    if (o.onEach) o.onEach(e);
    hits++;
  }
  return hits;
}

// ---------- status effects ----------
export function slowEnemy(e, mul, dur) {
  if (e.def.boss) mul = 1 - (1 - mul) * 0.5;
  for (const s of e.slows) if (s.mul === mul) { s.t = Math.max(s.t, dur); return; }
  e.slows.push({ mul, t: dur });
}
export function stunEnemy(e, dur) { if (e.def.boss) return; e.stun = Math.max(e.stun, dur); }
export function freezeEnemy(e, dur) { if (e.def.boss) { slowEnemy(e, 0.5, dur); return; } e.freeze = Math.max(e.freeze, dur); }
export function rootEnemy(e, dur) { if (e.def.boss) return; e.root = Math.max(e.root, dur); }
export function burnEnemy(e, dps, dur, kind = 'fire', src = null) {
  for (const s of e.burns) if (s.kind === kind) { s.dps = Math.max(s.dps, dps); s.t = Math.max(s.t, dur); s.src = src || s.src; return; }
  e.burns.push({ dps, t: dur, kind, src });
}
export function markEnemy(e, bonus, dur) { if (!e.mark || e.mark.bonus <= bonus) e.mark = { bonus, t: dur }; else e.mark.t = Math.max(e.mark.t, dur); }
export function shredEnemy(e, amt, dur) { e.shred = Math.max(e.shredT > 0 ? e.shred : 0, amt); e.shredT = Math.max(e.shredT, dur); }

// ---------- soldier / hero damage ----------
export function damageSoldier(b, s, amount, type = 'phys', src = null) {
  if (s.dead || s.removed) return 0;
  if (s.immune > 0) return 0;
  let a = amount;
  if (type === 'phys') a *= 1 - Math.min(0.9, s.armor);
  else if (type === 'magic') a *= 1 - Math.min(0.9, s.mr || 0);
  if (s.dr > 0) a *= 1 - s.dr;
  if (s.wallDr && s.wallDr > 0) a *= 1 - s.wallDr;
  if (s.absorb > 0) { const u = Math.min(s.absorb, a); s.absorb -= u; a -= u; }
  if (a <= 0) return 0;
  s.hp -= a;
  s.hitT = 0.12;
  if (s.hp <= 0) s.die(src);
  return a;
}
export function soldierTargetable(s) { return !s.dead && !s.removed && !s.veiled && s.spawnedIn !== false; }
