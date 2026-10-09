// Rampart Riot — level-data helpers: compact wave notation and Heroic / Iron challenge generators
export const w = (...groups) => ({ groups });
export const wb = (...groups) => ({ groups, boss: true });
// g(enemy, count, interval, startAt, path)
export const g = (e, n, every = 1, at = 0, path = 0) => ({ e, n, every, at, path });

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function seedOf(id) { let h = 2166136261; for (const c of id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

// pool: [{ e, w: weight, cost }]; paths: array of usable path indices (ground), air paths for flyers
export function heroic(id, pool, o = {}) {
  const R = rng(seedOf(id + 'h'));
  const paths = o.paths || [0];
  const air = o.air || paths;
  const waves = [];
  for (let i = 0; i < 6; i++) {
    const budget = (o.budget || 60) * (1 + i * 0.45);
    const groups = [];
    let spent = 0, at = 0, k = 0;
    while (spent < budget && k < 8) {
      const p = pool[Math.floor(R() * pool.length)];
      const n = Math.max(1, Math.round((budget - spent) / p.cost / (1.5 + R() * 1.5)));
      const cnt = Math.min(n, p.max || 14);
      const flying = !!p.fly;
      const path = (flying ? air : paths)[Math.floor(R() * (flying ? air : paths).length)];
      groups.push(g(p.e, cnt, p.every || (p.cost > 20 ? 2.4 : 1.0), at, path));
      spent += cnt * p.cost; at += 2 + R() * 4; k++;
    }
    waves.push({ groups, gap: 14 });
  }
  return { gold: o.gold || 600, waves };
}

const IRON_SETS = [['archer', 'barracks'], ['mage', 'artillery'], ['archer', 'mage'], ['barracks', 'artillery'], ['archer', 'artillery'], ['barracks', 'mage']];
export function iron(id, pool, o = {}) {
  const R = rng(seedOf(id + 'i'));
  const paths = o.paths || [0];
  const air = o.air || paths;
  const groups = [];
  const budget = o.budget || 260;
  let spent = 0, at = 0;
  while (spent < budget) {
    const p = pool[Math.floor(R() * pool.length)];
    const cnt = Math.min(p.max || 12, Math.max(2, Math.round(6 + R() * 8 - p.cost / 6)));
    const flying = !!p.fly;
    const path = (flying ? air : paths)[Math.floor(R() * (flying ? air : paths).length)];
    groups.push(g(p.e, cnt, p.every || (p.cost > 20 ? 2.2 : 0.9), at, path));
    spent += cnt * p.cost; at += 4 + R() * 6;
  }
  const allowed = o.allowed || IRON_SETS[seedOf(id) % IRON_SETS.length];
  return { gold: o.gold || 1200, allowed, waves: [{ groups }] };
}

// standard enemy costs (threat units) for generators
export const COST = { grimling: 1, slinger: 1.3, hound: 1.6, shieldbearer: 3.4, brute: 9, shaman: 3.5, wisp: 2.5,
  raider: 1.8, wolf: 2.6, crossbowman: 4, knight: 10, witch: 7, bat: 1.8, troll: 16, behemoth: 40,
  thrall: 4, bonearcher: 3.4, lurker: 8, cultist: 6.5, wraith: 6.5, graveknight: 18, plaguebearer: 11, horror: 55,
  imp: 3.5, spearman: 10, golem: 25, drake: 15, zealot: 11, cinderknight: 35, juggernaut: 110, shade: 13 };
export const P = (e, extra = {}) => Object.assign({ e, cost: COST[e] || 3 }, extra);
