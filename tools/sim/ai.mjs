// Heuristic AI player used to validate & balance stages headlessly.
// It plays roughly like a competent human: covers the busiest stretches of road first, then weighs
// "build a new tower" against "upgrade an existing one" by expected value per gold, saving up when
// the best move is not yet affordable.
import { TOWERS, SKILLS } from '../../js/data/towers.js';
import { ENEMIES } from '../../js/data/enemies.js';
import { inRange } from '../../js/core/util.js';

const SPEC = { archer: ['archerA', 'archerB'], mage: ['mageA', 'mageB'], artillery: ['artilleryA', 'artilleryB'], barracks: ['barracksA', 'barracksB'] };
const power = c => Math.pow(c, 0.86);

export class AIPlayer {
  constructor(b, o = {}) {
    this.b = b;
    this.skill = o.skill ?? 1.0;        // 0..1 how optimally it plays
    this.rand = mulberry((o.seed ?? 7) * 9301 + 49297);
    this.profile = this.enemyProfile();
    this.plan = this.makePlan();
    this.think = 0;
    this.heroPlaced = false;
    this.log = [];
  }

  // hp-weighted armor / magic resistance / air share of the whole level
  enemyProfile() {
    let hp = 0, ar = 0, mr = 0, air = 0;
    for (const w of this.b.waves) for (const g of w.groups) {
      const d = ENEMIES[g.e]; if (!d) continue;
      const h = d.hp * g.n; hp += h; ar += d.armor * h; mr += d.mr * h; if (d.flying) air += h;
    }
    hp = hp || 1;
    return { armor: ar / hp, mr: mr / hp, air: air / hp };
  }

  // share of enemy hp that walks each path (a merged stretch is counted once per stream, weighted by its share)
  pathWeights() {
    if (this._pw) return this._pw;
    const w = this.b.paths.map(() => 0);
    let tot = 0;
    for (const wave of this.b.waves) for (const g of wave.groups) { const d = ENEMIES[g.e]; if (!d) continue; const h = d.hp * g.n; w[g.path ?? 0] = (w[g.path ?? 0] || 0) + h; tot += h; }
    this._pw = w.map(v => (tot ? v / tot : 1 / w.length) * w.length);
    return this._pw;
  }
  coverage(x, y, r, groundOnly = false) {
    const W = this.pathWeights();
    let c = 0;
    this.b.paths.forEach((p, i) => {
      if (groundOnly && p.air) return;
      let n = 0;
      for (let s = 0; s < p.len; s += 20) { const q = p.pos(s, 0, {}); if (inRange(x, y, q.x, q.y, r)) n++; }
      c += n * (W[i] || 0);
    });
    return c;
  }

  makePlan() {
    const b = this.b, P = this.profile;
    const allowed = l => b.lineAllowed(l);
    const plots = b.plots.map(p => ({ p, cov: this.coverage(p.x, p.y, 300), near: this.coverage(p.x, p.y, 190, true) }));
    plots.sort((a, c) => c.cov - a.cov);
    // desired share of each line given the enemy mix
    const want = {
      archer: 0.26 + P.air * 0.6 + P.mr * 0.25,
      mage: 0.24 + P.armor * 0.55,
      artillery: P.air > 0.5 ? 0.12 : 0.24 + P.mr * 0.2,
      barracks: 0.18,
    };
    for (const k of Object.keys(want)) if (!allowed(k)) want[k] = 0;
    const tot = Object.values(want).reduce((a, c) => a + c, 0) || 1;
    for (const k of Object.keys(want)) want[k] /= tot;
    const have = { archer: 0, mage: 0, artillery: 0, barracks: 0 };
    const out = [];
    plots.forEach((q, i) => {
      let best = null, bs = -1e9;
      for (const line of Object.keys(want)) {
        if (!want[line]) continue;
        let sc = want[line] * (i + 1) - have[line];
        if (line === 'barracks') sc += q.near > 6 ? 0.5 : -1.5;
        if (line === 'artillery' && q.near < 4) sc -= 0.4;
        if (sc > bs) { bs = sc; best = line; }
      }
      have[best]++;
      const spec = SPEC[best][(i + (P.armor > 0.35 && best === 'archer' ? 1 : 0)) % 2];
      out.push({ plot: q.p, line: best, spec, cov: best === 'barracks' ? q.near * 1.6 : q.cov });
    });
    return out;
  }

  step(dt) {
    const b = this.b;
    this.think -= dt;
    if (this.think > 0) return;
    this.think = 0.5 + (1 - this.skill) * 1.5;
    if (!b.started) { let n = 0; while (this.act(true) && n++ < 20); b.callWave(); return; }
    this.act(false);
    // call waves early when comfortable
    if (b.waveVisible() && this.skill >= 0.8 && b.nextWaveIn > 3 && b.enemies.filter(e => !e.dead).length < 4 && b.lives >= 18) b.callWave();
    this.spells();
    this.hero();
  }

  // pick the best value-per-gold action; returns true if something was bought
  act(opening) {
    const b = this.b;
    const cands = [];
    for (const it of this.plan) {
      const tw = it.plot.tower;
      if (!tw) {
        const id = it.line + '1', cost = TOWERS[id].cost;
        cands.push({ kind: 'build', it, id, cost, v: it.cov * power(cost) / cost });
        continue;
      }
      const spent = tw.spent || 0;
      if (tw.def.next) {
        const to = tw.level === 3 ? it.spec : tw.def.next[0];
        if (TOWERS[to].level > ((b.level && b.level.maxTower) || 4)) continue;
        const cost = tw.upgradeCost(to);
        if (isFinite(cost)) cands.push({ kind: 'up', tw, it, to, cost, v: it.cov * (power(spent + cost) - power(spent)) / cost * 1.05 });
      } else if (tw.def.skills) {
        for (const sk of tw.def.skills) {
          const cost = tw.skillCost(sk);
          if (isFinite(cost)) cands.push({ kind: 'skill', tw, it, sk, cost, v: it.cov * (power(spent + cost) - power(spent)) / cost * 0.9 });
        }
      }
    }
    if (!cands.length) return false;
    // imperfect players misjudge values a little
    for (const c of cands) c.v *= 1 + (this.rand() - 0.5) * (1 - this.skill) * 0.8;
    cands.sort((a, c) => c.v - a.v);
    const best = cands[0];
    let pick = null;
    if (b.gold >= best.cost) pick = best;
    else {
      // something affordable and almost as good? otherwise save up
      const alt = cands.find(c => b.gold >= c.cost && c.v >= best.v * (opening ? 0.5 : 0.82));
      if (alt) pick = alt;
    }
    if (!pick) return false;
    let ok = false;
    if (pick.kind === 'build') ok = b.build(pick.it.plot.i, pick.id);
    else if (pick.kind === 'up') ok = b.upgrade(pick.tw, pick.to);
    else ok = b.buySkill(pick.tw, pick.sk);
    if (ok) {
      const tw = pick.kind === 'build' ? pick.it.plot.tower : pick.tw;
      if (tw) tw.spent = (tw.spent || 0) + pick.cost;
      this.log.push(`${b.t.toFixed(0)} ${pick.kind} ${pick.id || pick.to || pick.sk}`);
    }
    return !!ok;
  }

  spells() {
    const b = this.b;
    const alive = b.enemies.filter(e => !e.dead && e.spawned && !e.flying);
    if (b.spellReady('skyfall') && alive.length >= 4) {
      let best = null, bc = 0;
      for (const e of alive) { let c = 0; for (const o of alive) if (inRange(e.x, e.y, o.x, o.y, 80)) c += o.def.boss ? 4 : o.def.big ? 2 : 1; if (c > bc) { bc = c; best = e; } }
      if (best && bc >= 4) { const p = best.predict(0.9, {}); b.castSpell('skyfall', p.x, p.y); }
    }
    if (b.spellReady('militia') && alive.length) {
      const e = alive.reduce((a, c) => (a.path.len - a.s < c.path.len - c.s ? a : c));
      if (e.path.len - e.s < 900) { const p = e.predict(1.2, {}); b.castSpell('militia', p.x, p.y); }
    }
  }

  hero() {
    const b = this.b;
    const h = b.heroes[0];
    if (!h || h.dead) return;
    if (!this.heroPlaced) {
      // stand on the busiest stretch near the end of the main road
      const p = b.paths.find(q => !q.air) || b.paths[0];
      const q = p.pos(p.len * 0.62, 0, {});
      b.moveHero(h, q.x, q.y);
      this.heroPlaced = true;
    }
  }
}

function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
