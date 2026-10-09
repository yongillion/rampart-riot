// Rampart Riot — tower definitions. Ranges/positions are in world units (playable field 1920x1080).
// Names/descriptions come from i18n keys: tower.<id>.name / tower.<id>.desc, skill.<id>.name / .desc

export const LINES = ['archer', 'barracks', 'mage', 'artillery'];

export const TOWERS = {
  // ---------------- Archer line (physical, hits air) ----------------
  archer1: { line: 'archer', level: 1, cost: 70, range: 290, cd: 0.8, dmg: [4, 7], dtype: 'phys', air: true, next: ['archer2'] },
  archer2: { line: 'archer', level: 2, cost: 110, range: 310, cd: 0.7, dmg: [7, 11], dtype: 'phys', air: true, next: ['archer3'] },
  archer3: { line: 'archer', level: 3, cost: 160, range: 330, cd: 0.6, dmg: [10, 16], dtype: 'phys', air: true, next: ['archerA', 'archerB'] },
  archerA: { line: 'archer', level: 4, cost: 230, range: 345, cd: 0.38, dmg: [12, 18], dtype: 'phys', air: true, spec: 'gale',
    skills: ['split', 'mark'] },
  archerB: { line: 'archer', level: 4, cost: 250, range: 400, cd: 1.6, dmg: [40, 65], dtype: 'phys', air: true, spec: 'arbalest', armorPierce: 0.25,
    skills: ['pierce', 'execute'] },

  // ---------------- Barracks line (melee blockers) ----------------
  barracks1: { line: 'barracks', level: 1, cost: 70, range: 210, soldiers: 3, unit: 'militia', next: ['barracks2'] },
  barracks2: { line: 'barracks', level: 2, cost: 110, range: 215, soldiers: 3, unit: 'footman', next: ['barracks3'] },
  barracks3: { line: 'barracks', level: 3, cost: 150, range: 220, soldiers: 3, unit: 'knight', next: ['barracksA', 'barracksB'] },
  barracksA: { line: 'barracks', level: 4, cost: 230, range: 230, soldiers: 3, unit: 'bastion', spec: 'bastion', skills: ['wall', 'bash'] },
  barracksB: { line: 'barracks', level: 4, cost: 250, range: 230, soldiers: 3, unit: 'wolfguard', spec: 'wolfguard', skills: ['wolf', 'bloodlust'] },

  // ---------------- Mage line (magic damage, hits air) ----------------
  mage1: { line: 'mage', level: 1, cost: 100, range: 270, cd: 1.5, dmg: [9, 17], dtype: 'magic', air: true, next: ['mage2'] },
  mage2: { line: 'mage', level: 2, cost: 160, range: 290, cd: 1.5, dmg: [23, 43], dtype: 'magic', air: true, next: ['mage3'] },
  mage3: { line: 'mage', level: 3, cost: 240, range: 310, cd: 1.5, dmg: [40, 74], dtype: 'magic', air: true, next: ['mageA', 'mageB'] },
  mageA: { line: 'mage', level: 4, cost: 300, range: 315, cd: 1.4, dmg: [52, 92], dtype: 'magic', air: true, spec: 'storm', chain: 1, skills: ['chain', 'thunder'] },
  mageB: { line: 'mage', level: 4, cost: 300, range: 320, cd: 1.25, dmg: [44, 78], dtype: 'magic', air: true, spec: 'frost', slow: 0.3, slowDur: 2, skills: ['prison', 'blizzard'] },

  // ---------------- Artillery line (physical splash, ground only) ----------------
  artillery1: { line: 'artillery', level: 1, cost: 125, range: 270, cd: 3.0, dmg: [8, 15], dtype: 'phys', splash: 62, next: ['artillery2'] },
  artillery2: { line: 'artillery', level: 2, cost: 220, range: 290, cd: 3.0, dmg: [20, 40], dtype: 'phys', splash: 68, next: ['artillery3'] },
  artillery3: { line: 'artillery', level: 3, cost: 320, range: 310, cd: 3.0, dmg: [32, 62], dtype: 'phys', splash: 74, next: ['artilleryA', 'artilleryB'] },
  artilleryA: { line: 'artillery', level: 4, cost: 400, range: 335, cd: 2.6, dmg: [46, 78], dtype: 'phys', splash: 72, air: true, spec: 'rocket', skills: ['salvo', 'firestorm'] },
  artilleryB: { line: 'artillery', level: 4, cost: 375, range: 315, cd: 2.8, dmg: [36, 66], dtype: 'phys', splash: 84, spec: 'alchemy', shred: 0.3, shredDur: 5, skills: ['pool', 'sheep'] },
};

// Level-4 skills: 3 ranks each. `cost` per rank.
export const SKILLS = {
  // Gale Roost
  split: { cost: [200, 150, 150], chance: [0.3, 0.45, 0.6], extra: 2 },
  mark: { cost: [180, 150, 150], cd: [9, 8, 7], bonus: [0.2, 0.3, 0.4], dur: 6 },
  // Arbalest Bastion
  pierce: { cost: [220, 160, 160], cd: [10, 9, 8], dmg: [90, 150, 220] },
  execute: { cost: [250, 200, 200], cd: [14, 12, 10], chance: [0.3, 0.42, 0.55], dmg: [150, 250, 350] },
  // Bastion Order
  wall: { cost: [180, 150, 150], dr: [0.3, 0.45, 0.6] },
  bash: { cost: [200, 150, 150], cd: [7, 6, 5], stun: [1, 1.5, 2], dmg: [30, 50, 70] },
  // Wolfguard Lodge
  wolf: { cost: [220, 180, 180], hp: [130, 190, 190], count: [1, 1, 2], dmg: [[8, 12], [11, 16], [11, 16]] },
  bloodlust: { cost: [180, 150, 150], steal: [0.12, 0.18, 0.25], haste: [0.15, 0.25, 0.35] },
  // Stormcaller
  chain: { cost: [220, 180, 180], targets: [2, 3, 4] },
  thunder: { cost: [250, 200, 200], cd: [12, 10, 8], dmg: [100, 180, 260], radius: 85, stun: 1 },
  // Frost Spire
  prison: { cost: [220, 180, 180], cd: [10, 9, 8], dur: [2, 3, 4] },
  blizzard: { cost: [250, 200, 200], cd: [15, 13, 11], dps: [20, 35, 50], radius: 110, dur: 4, slow: 0.5 },
  // Rocket Battery
  salvo: { cost: [250, 200, 200], cd: [10, 9, 8], count: [4, 6, 8], dmg: 36 },
  firestorm: { cost: [200, 175, 175], dps: [10, 18, 26], dur: 3 },
  // Alchemist Catapult
  pool: { cost: [220, 180, 180], cd: [9, 8, 7], dps: [15, 25, 35], radius: 90, dur: 5 },
  sheep: { cost: [250, 200, 200], cd: [18, 15, 12], count: 3, dur: [4, 5, 6] },
};

// Soldier units for barracks (also used by reinforcements & summons)
export const UNITS = {
  militia: { hp: 50, dmg: [1, 3], armor: 0, cd: 1.0, respawn: 10, regen: 5, speed: 75 },
  footman: { hp: 90, dmg: [3, 5], armor: 0.15, cd: 1.0, respawn: 10, regen: 8, speed: 75 },
  knight: { hp: 150, dmg: [6, 10], armor: 0.3, cd: 1.0, respawn: 10, regen: 12, speed: 75 },
  bastion: { hp: 260, dmg: [10, 16], armor: 0.5, cd: 1.0, respawn: 12, regen: 18, speed: 75 },
  wolfguard: { hp: 200, dmg: [14, 22], armor: 0.2, cd: 0.8, respawn: 12, regen: 16, speed: 82 },
  packwolf: { hp: 130, dmg: [8, 12], armor: 0.1, cd: 0.8, respawn: 14, regen: 10, speed: 110 },
  levy: { hp: 70, dmg: [2, 5], armor: 0, cd: 1.0, regen: 0, speed: 80 },        // Call to Arms (base)
  veteran: { hp: 110, dmg: [4, 8], armor: 0.2, cd: 1.0, regen: 0, speed: 80 },   // Call to Arms (upgraded)
};

export const SELL_RATE = 0.6;

export function totalCost(id, skillRanks) {
  let c = 0;
  const chain = { archer: ['archer1', 'archer2', 'archer3'], barracks: ['barracks1', 'barracks2', 'barracks3'], mage: ['mage1', 'mage2', 'mage3'], artillery: ['artillery1', 'artillery2', 'artillery3'] };
  const t = TOWERS[id];
  for (const k of chain[t.line]) { c += TOWERS[k].cost; if (k === id) return c; }
  c += t.cost;
  if (skillRanks) for (const [sk, r] of Object.entries(skillRanks)) for (let i = 0; i < r; i++) c += SKILLS[sk].cost[i];
  return c;
}
