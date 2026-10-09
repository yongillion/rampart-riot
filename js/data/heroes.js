// Rampart Riot — heroes (original characters). Stats scale linearly from level 1 to level 10.
// Names: hero.<id>.name / .title / .desc ; skills: hskill.<id>.name / .desc

export const HERO_ORDER = ['brannoc', 'kaela', 'seren', 'torvald', 'aerin', 'ysolde'];

export const HEROES = {
  brannoc: {
    unlock: null, color: '#3a6fc4', role: 'tank',
    hp: [420, 940], armor: [0.3, 0.5], mr: [0, 0.1], dmg: [[12, 20], [32, 48]], cd: 1.0, speed: 82, regen: [14, 34], respawn: 15,
    skills: [
      { id: 'shieldwall', lvl: 1, cd: 15, dur: 4, dr: 0.5, radius: 110 },
      { id: 'cleave', lvl: 4, cd: 8, mult: 1.6, radius: 65 },
      { id: 'laststand', lvl: 7, cd: 60, heal: 0.45, immune: 2.5 },
    ],
  },
  kaela: {
    unlock: '1-3', color: '#4f8a3a', role: 'ranged',
    hp: [270, 640], armor: [0.1, 0.2], mr: [0, 0.1], dmg: [[5, 8], [12, 18]], cd: 1.0, speed: 95, regen: [10, 26], respawn: 15,
    ranged: { range: 270, dmg: [[10, 15], [26, 38]], cd: 0.75, air: true },
    skills: [
      { id: 'twinshot', lvl: 1, cd: 6, extra: 2 },
      { id: 'snare', lvl: 4, cd: 14, root: 2.5, radius: 65, dmg: 40 },
      { id: 'arrowstorm', lvl: 7, cd: 24, dmg: [12, 18], hits: 14, radius: 95 },
    ],
  },
  seren: {
    unlock: '1-6', color: '#7a5ad8', role: 'mage',
    hp: [240, 580], armor: [0, 0.1], mr: [0.3, 0.5], dmg: [[4, 7], [10, 16]], cd: 1.0, speed: 80, regen: [10, 24], respawn: 16,
    ranged: { range: 240, dmg: [[16, 26], [40, 62]], cd: 1.3, air: true, magic: true },
    skills: [
      { id: 'sigil', lvl: 1, cd: 16, absorb: [60, 200], radius: 120 },
      { id: 'starfall', lvl: 4, cd: 18, dmg: [120, 300], radius: 90 },
      { id: 'stoneguard', lvl: 7, cd: 40, hp: 500, dur: 16 },
    ],
  },
  torvald: {
    unlock: '2-3', color: '#c9822c', role: 'tank',
    hp: [400, 900], armor: [0.4, 0.55], mr: [0, 0.1], dmg: [[14, 22], [34, 50]], cd: 1.2, speed: 72, regen: [14, 32], respawn: 15,
    skills: [
      { id: 'turret', lvl: 1, cd: 22, dur: 14, dmg: [[8, 14], [20, 32]], range: 230 },
      { id: 'quake', lvl: 4, cd: 14, stun: 1.6, radius: 95, dmg: [40, 110] },
      { id: 'keg', lvl: 7, cd: 20, dmg: [150, 260], radius: 90 },
    ],
  },
  aerin: {
    unlock: '3-2', color: '#d8b84a', role: 'flying', flying: true,
    hp: [320, 720], armor: [0.2, 0.3], mr: [0.1, 0.2], dmg: [[16, 24], [38, 56]], cd: 1.0, speed: 150, regen: [12, 30], respawn: 18,
    ranged: { range: 130, dmg: [[16, 24], [38, 56]], cd: 1.0, air: true, dive: true },
    skills: [
      { id: 'dive', lvl: 1, cd: 10, dmg: [60, 180], radius: 75 },
      { id: 'gale', lvl: 4, cd: 18, push: 130, radius: 110 },
      { id: 'talonstorm', lvl: 7, cd: 26, hits: 6, dmg: [40, 70] },
    ],
  },
  ysolde: {
    unlock: '4-2', color: '#e0582c', role: 'mage',
    hp: [300, 700], armor: [0.1, 0.2], mr: [0.4, 0.6], dmg: [[6, 10], [14, 22]], cd: 1.0, speed: 85, regen: [12, 28], respawn: 16,
    ranged: { range: 225, dmg: [[20, 30], [46, 70]], cd: 1.2, air: true, magic: true },
    skills: [
      { id: 'lash', lvl: 1, cd: 8, targets: 3, dmg: [40, 120] },
      { id: 'veil', lvl: 4, cd: 25, dur: 3, radius: 120 },
      { id: 'phoenix', lvl: 7, cd: 50, dmg: [160, 320], radius: 110 },
    ],
  },
};

// cumulative xp needed to reach level (index = level-1)
export const HERO_XP = [0, 300, 750, 1350, 2100, 3000, 4100, 5400, 6900, 8600];
export const HERO_MAX = 10;

export function heroLevel(xp) {
  let l = 1;
  for (let i = 1; i < HERO_XP.length; i++) if (xp >= HERO_XP[i]) l = i + 1;
  return l;
}
export function heroStat(range, level) {
  const t = (level - 1) / (HERO_MAX - 1);
  if (Array.isArray(range[0])) return [range[0][0] + (range[1][0] - range[0][0]) * t, range[0][1] + (range[1][1] - range[0][1]) * t];
  return range[0] + (range[1] - range[0]) * t;
}
