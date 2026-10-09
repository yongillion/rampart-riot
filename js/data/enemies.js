// Rampart Riot — enemy definitions (original bestiary)
// hp/armor/mr: armor & mr are fractional damage reduction (0..0.9). speed in world units/s.
// size: body radius for hit tests; h: sprite height (for hp bar & projectile aim).
// Names/descriptions: enemy.<id>.name / enemy.<id>.desc

export const ENEMIES = {
  // ---------------- Chapter I — Greenmarch: the Ashen vanguard ----------------
  grimling: { ch: 1, hp: 26, armor: 0, mr: 0, speed: 70, gold: 5, lives: 1, dmg: [1, 3], cd: 1.0, size: 11, h: 34, xp: 2, death: 'enemy_death' },
  slinger: { ch: 1, hp: 32, armor: 0, mr: 0, speed: 66, gold: 7, lives: 1, dmg: [1, 3], cd: 1.0, size: 11, h: 34, xp: 3,
    ranged: { range: 150, dmg: [2, 4], cd: 1.6, proj: 'stone', delay: 0.2, ox: 8, oy: 30 }, death: 'enemy_death' },
  hound: { ch: 1, hp: 40, armor: 0, mr: 0, speed: 135, gold: 6, lives: 1, dmg: [2, 5], cd: 0.8, size: 13, h: 26, xp: 3, death: 'enemy_death', quad: true },
  shieldbearer: { ch: 1, hp: 85, armor: 0.6, mr: 0, speed: 58, gold: 12, lives: 1, dmg: [3, 6], cd: 1.0, size: 12, h: 36, xp: 6, death: 'enemy_death' },
  brute: { ch: 1, hp: 240, armor: 0, mr: 0, speed: 45, gold: 22, lives: 2, dmg: [8, 14], cd: 1.3, size: 20, h: 64, xp: 14, death: 'enemy_death_big', big: true },
  shaman: { ch: 1, hp: 75, armor: 0, mr: 0.6, speed: 58, gold: 16, lives: 1, dmg: [2, 4], cd: 1.0, size: 11, h: 38, xp: 8,
    heal: { cd: 7, amount: 40, radius: 110 }, death: 'enemy_death' },
  wisp: { ch: 1, hp: 55, armor: 0, mr: 0.25, speed: 80, gold: 10, lives: 1, flying: true, size: 12, h: 30, fly: 46, xp: 5, death: 'enemy_death_magic' },
  boss_gorrath: { ch: 1, boss: true, hp: 4200, armor: 0.3, mr: 0, speed: 30, gold: 400, lives: 20, dmg: [50, 70], cd: 2.0, splashMelee: 70, size: 42, h: 150, xp: 300,
    summon: { cd: 14, unit: 'grimling', count: 3 }, stomp: { cd: 9, radius: 110, stun: 1.5, dmg: 30, delay: 0.42 }, death: 'enemy_death_big' },

  // ---------------- Chapter II — Frostbound Pass ----------------
  raider: { ch: 2, hp: 50, armor: 0.15, mr: 0, speed: 72, gold: 7, lives: 1, dmg: [2, 5], cd: 1.0, size: 11, h: 36, xp: 3, death: 'enemy_death' },
  wolf: { ch: 2, hp: 75, armor: 0, mr: 0, speed: 145, gold: 8, lives: 1, dmg: [3, 6], cd: 0.8, size: 14, h: 28, xp: 4, dodge: 0.2, death: 'enemy_death', quad: true },
  crossbowman: { ch: 2, hp: 100, armor: 0.3, mr: 0, speed: 60, gold: 14, lives: 1, dmg: [3, 5], cd: 1.0, size: 12, h: 42, xp: 7,
    ranged: { range: 170, dmg: [6, 10], cd: 2.0, proj: 'bolt', ox: 20, oy: 24.5 }, death: 'enemy_death' },
  knight: { ch: 2, hp: 300, armor: 0.7, mr: 0, speed: 50, gold: 28, lives: 1, dmg: [10, 16], cd: 1.2, size: 14, h: 46, xp: 14, death: 'enemy_death' },
  witch: { ch: 2, hp: 190, armor: 0, mr: 0.7, speed: 55, gold: 32, lives: 1, dmg: [4, 8], cd: 1.2, size: 12, h: 44, xp: 14,
    freeze: { cd: 12, range: 220, dur: 4, ox: 17, oy: 72 }, death: 'enemy_death_magic' },
  bat: { ch: 2, hp: 45, armor: 0, mr: 0, speed: 115, gold: 6, lives: 1, flying: true, size: 11, h: 22, fly: 52, xp: 3, death: 'enemy_death_fly' },
  troll: { ch: 2, hp: 520, armor: 0.2, mr: 0, speed: 42, gold: 45, lives: 2, dmg: [16, 24], cd: 1.4, size: 20, h: 62, xp: 24, regen: 12, death: 'enemy_death_big', big: true },
  behemoth: { ch: 2, hp: 1300, armor: 0.45, mr: 0, speed: 32, gold: 90, lives: 3, dmg: [24, 36], cd: 1.6, size: 28, h: 86, xp: 60,
    stomp: { cd: 8, radius: 85, stun: 1.2, dmg: 15, delay: 0.4, ox: 24 }, death: 'enemy_death_big', big: true },
  boss_hrimvald: { ch: 2, boss: true, hp: 9500, armor: 0.4, mr: 0.4, speed: 26, gold: 600, lives: 20, dmg: [60, 90], cd: 2.0, splashMelee: 80, size: 50, h: 140, xp: 450,
    breath: { cd: 11, range: 200, freezeTower: 5, freezeSoldiers: 3, dmg: 40, ox: 100, oy: 73 }, death: 'enemy_death_big' },

  // ---------------- Chapter III — The Drowned Crown ----------------
  thrall: { ch: 3, hp: 140, armor: 0, mr: 0, speed: 38, gold: 8, lives: 1, dmg: [4, 7], cd: 1.3, size: 12, h: 40, xp: 5, undead: true, death: 'enemy_death_bone' },
  bonearcher: { ch: 3, hp: 90, armor: 0, mr: 0, speed: 55, gold: 12, lives: 1, dmg: [2, 4], cd: 1.0, size: 11, h: 40, xp: 6, undead: true,
    ranged: { range: 180, dmg: [5, 9], cd: 1.8, proj: 'arrow', delay: 0.17, ox: 12, oy: 25 }, death: 'enemy_death_bone' },
  lurker: { ch: 3, hp: 220, armor: 0.3, mr: 0, speed: 55, gold: 18, lives: 1, dmg: [6, 10], cd: 1.1, size: 15, h: 30, xp: 10,
    burrow: { every: 6, dur: 3, speedMul: 1.8 }, death: 'enemy_death', quad: true },
  cultist: { ch: 3, hp: 170, armor: 0, mr: 0.5, speed: 55, gold: 18, lives: 1, dmg: [3, 6], cd: 1.0, size: 12, h: 42, xp: 10,
    ranged: { range: 150, dmg: [8, 12], cd: 2.0, proj: 'ember', magic: true, delay: 0.17, ox: 22, oy: 27 }, onDeath: { spawn: 'spirit', count: 1 }, death: 'enemy_death_magic' },
  spirit: { ch: 3, hp: 60, armor: 0, mr: 0.3, speed: 90, gold: 3, lives: 1, flying: true, size: 10, h: 26, fly: 40, xp: 2, death: 'enemy_death_magic', minor: true },
  wraith: { ch: 3, hp: 160, armor: 0.75, mr: 0, speed: 70, gold: 18, lives: 1, flying: true, size: 12, h: 40, fly: 44, xp: 10, undead: true, death: 'enemy_death_magic' },
  graveknight: { ch: 3, hp: 480, armor: 0.6, mr: 0, speed: 45, gold: 35, lives: 1, dmg: [14, 22], cd: 1.2, size: 15, h: 48, xp: 22, undead: true,
    revive: { hp: 0.5, delay: 3 }, death: 'enemy_death_bone' },
  plaguebearer: { ch: 3, hp: 320, armor: 0, mr: 0.2, speed: 42, gold: 25, lives: 1, dmg: [6, 10], cd: 1.3, size: 16, h: 50, xp: 14, undead: true,
    onDeath: { cloud: { dps: 20, dur: 4, radius: 70 } }, death: 'enemy_death_big' },
  horror: { ch: 3, hp: 1600, armor: 0.3, mr: 0.3, speed: 30, gold: 100, lives: 3, dmg: [26, 40], cd: 1.6, size: 30, h: 80, xp: 70,
    devour: { cd: 10 }, death: 'enemy_death_big', big: true },
  boss_varkas: { ch: 3, boss: true, hp: 15000, armor: 0.3, mr: 0.6, speed: 28, gold: 800, lives: 20, dmg: [60, 90], cd: 1.6, size: 30, h: 110, xp: 600,
    blink: { cd: 15, dist: 160 }, summon: { cd: 20, unit: 'graveknight', count: 2 }, curse: { cd: 18, towers: 2, dur: 6 }, death: 'enemy_death_magic' },

  // ---------------- Chapter IV — Heart of Ash ----------------
  imp: { ch: 4, hp: 95, armor: 0, mr: 0, speed: 100, gold: 8, lives: 1, dmg: [4, 7], cd: 0.9, size: 11, h: 30, xp: 4,
    onDeath: { explode: { dmg: 40, radius: 60 } }, death: 'explode_small' },
  spearman: { ch: 4, hp: 280, armor: 0.35, mr: 0, speed: 55, gold: 16, lives: 1, dmg: [8, 12], cd: 1.0, size: 13, h: 46, xp: 10, death: 'enemy_death' },
  golem: { ch: 4, hp: 650, armor: 0.8, mr: 0, speed: 34, gold: 40, lives: 2, dmg: [18, 28], cd: 1.5, size: 22, h: 62, xp: 26,
    onDeath: { spawn: 'shard', count: 2 }, death: 'enemy_death_big', big: true },
  shard: { ch: 4, hp: 160, armor: 0.6, mr: 0, speed: 50, gold: 6, lives: 1, dmg: [6, 9], cd: 1.0, size: 11, h: 30, xp: 5, death: 'enemy_death', minor: true },
  drake: { ch: 4, hp: 420, armor: 0.3, mr: 0, speed: 70, gold: 30, lives: 2, flying: true, size: 20, h: 50, fly: 58, xp: 20, death: 'enemy_death_fly' },
  zealot: { ch: 4, hp: 320, armor: 0, mr: 0.5, speed: 52, gold: 28, lives: 1, dmg: [5, 9], cd: 1.0, size: 12, h: 44, xp: 14,
    shield: { cd: 9, amount: 120, radius: 120 }, death: 'enemy_death_magic' },
  cinderknight: { ch: 4, hp: 950, armor: 0.6, mr: 0.5, speed: 45, gold: 50, lives: 2, dmg: [20, 30], cd: 1.2, size: 16, h: 52, xp: 36, death: 'enemy_death_big' },
  juggernaut: { ch: 4, hp: 3200, armor: 0.5, mr: 0, speed: 24, gold: 150, lives: 5, dmg: [40, 60], cd: 1.8, splashMelee: 60, size: 36, h: 100, xp: 120,
    summon: { cd: 10, unit: 'imp', count: 2 }, death: 'enemy_death_big', big: true },
  shade: { ch: 4, hp: 360, armor: 0, mr: 0.8, speed: 60, gold: 24, lives: 1, dmg: [8, 14], cd: 1.0, size: 12, h: 44, xp: 14,
    blinkOnHit: { cd: 8, dist: 140 }, death: 'enemy_death_magic' },
  boss_heart: { ch: 4, boss: true, hp: 26000, armor: 0.4, mr: 0.4, speed: 22, gold: 1500, lives: 20, dmg: [80, 120], cd: 2.0, splashMelee: 90, size: 48, h: 170, xp: 1000,
    summon: { cd: 12, unit: 'imp', count: 3 }, curse: { cd: 16, towers: 2, dur: 5 }, phases: true, death: 'enemy_death_big' },
};

// Order used by the encyclopedia
export const BESTIARY = Object.keys(ENEMIES);

// Heroic-mode elite modifiers
export const ELITE = { hp: 1.35, armorAdd: 0.05, speed: 1.05 };
