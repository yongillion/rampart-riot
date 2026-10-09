// Rampart Riot — spells and the persistent star-upgrade tree.

export const SPELLS = {
  skyfall: { cd: 80, meteors: 3, dmg: [55, 105], radius: 72, spread: 65, delay: 0.9 },
  militia: { cd: 12, count: 2, dur: 20, unit: 'levy' },
};

// 6 trees x 5 tiers. Effects are read by the battle via buildMods().
export const UPGRADE_TREES = ['archer', 'barracks', 'mage', 'artillery', 'skyfall', 'militia'];
export const UPGRADE_COST = [1, 2, 2, 3, 4];

export const UPGRADES = {
  archer: ['range', 'pierce', 'damage', 'crit', 'haste'],
  barracks: ['hp', 'armor', 'respawn', 'damage', 'regen'],
  mage: ['range', 'damage', 'discount', 'slow', 'haste'],
  artillery: ['range', 'radius', 'discount', 'damage', 'concuss'],
  skyfall: ['cooldown', 'extra', 'radius', 'scorch', 'cataclysm'],
  militia: ['hp', 'armor', 'third', 'damage', 'javelin'],
};

// Convert purchased levels (0..5 per tree) into battle modifiers
export function buildMods(levels = {}) {
  const L = k => levels[k] || 0;
  const m = {
    archerRange: 1, archerPierce: 0, archerDmg: 1, archerCrit: 0, archerHaste: 1,
    soldierHp: 1, soldierArmor: 0, respawnCut: 0, soldierDmg: 0, soldierRegen: 1,
    mageRange: 1, mageDmg: 1, mageDiscount: 0, mageSlow: 0, mageHaste: 1,
    artRange: 1, artRadius: 1, artDiscount: 0, artDmg: 1, artStun: 0,
    skyCdCut: 0, skyExtra: 0, skyRadius: 1, skyScorch: false, skyCataclysm: false,
    milHp: 1, milArmor: 0, milThird: false, milDmg: 0, milJavelin: false,
  };
  const a = L('archer');
  if (a >= 1) m.archerRange = 1.1;
  if (a >= 2) m.archerPierce = 0.1;
  if (a >= 3) m.archerDmg = 1.12;
  if (a >= 4) m.archerCrit = 0.1;
  if (a >= 5) m.archerHaste = 1.12;
  const b = L('barracks');
  if (b >= 1) m.soldierHp = 1.12;
  if (b >= 2) m.soldierArmor = 0.1;
  if (b >= 3) m.respawnCut = 3;
  if (b >= 4) m.soldierDmg = 2;
  if (b >= 5) m.soldierRegen = 1.6;
  const g = L('mage');
  if (g >= 1) m.mageRange = 1.1;
  if (g >= 2) m.mageDmg = 1.12;
  if (g >= 3) m.mageDiscount = 0.1;
  if (g >= 4) m.mageSlow = 0.15;
  if (g >= 5) m.mageHaste = 1.15;
  const t = L('artillery');
  if (t >= 1) m.artRange = 1.1;
  if (t >= 2) m.artRadius = 1.15;
  if (t >= 3) m.artDiscount = 0.1;
  if (t >= 4) m.artDmg = 1.15;
  if (t >= 5) m.artStun = 0.15;
  const s = L('skyfall');
  if (s >= 1) m.skyCdCut = 15;
  if (s >= 2) m.skyExtra = 1;
  if (s >= 3) m.skyRadius = 1.25;
  if (s >= 4) m.skyScorch = true;
  if (s >= 5) { m.skyCataclysm = true; m.skyExtra = 3; }
  const r = L('militia');
  if (r >= 1) m.milHp = 1.3;
  if (r >= 2) m.milArmor = 0.25;
  if (r >= 3) m.milThird = true;
  if (r >= 4) m.milDmg = 3;
  if (r >= 5) m.milJavelin = true;
  return m;
}
