// Rampart Riot — persistent save data (3 slots + global settings) in localStorage
const KEY = 'rampart_riot_save_v1';

function detectLang() {
  const l = (navigator.language || 'ko').toLowerCase();
  return l.startsWith('ko') ? 'ko' : 'en';
}

export function defaultSettings() {
  return { music: 0.7, sfx: 0.85, lang: detectLang(), quality: 'high', muted: false, speedRemember: 1 };
}

export function newSlotData() {
  return {
    v: 1,
    created: Date.now(),
    lastPlayed: Date.now(),
    playTime: 0,
    stages: {},                 // stageId -> { stars, heroic, iron, done, bestLives }
    upgrades: { archer: 0, barracks: 0, mage: 0, artillery: 0, skyfall: 0, militia: 0 },
    starsSpent: 0,
    heroes: { brannoc: { xp: 0 } },
    hero: 'brannoc',
    seenEnemies: {},
    seenTowers: {},
    ach: {},
    stats: { kills: 0, goldEarned: 0, towersBuilt: 0, wavesEarly: 0, meteors: 0, reinforcements: 0, heroDeaths: 0, secrets: 0, sheep: 0, leaks: 0, victories: 0, defeats: 0, upgradesBought: 0, sold: 0, bossKills: 0 },
    story: {},                  // cutscene id -> true
    secrets: {},                // secret id -> true
    difficulty: 'normal',
    endingSeen: false,
  };
}

class SaveManager {
  constructor() {
    this.data = { settings: defaultSettings(), slots: [null, null, null], current: -1 };
    this.ok = true;
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        this.data.settings = Object.assign(defaultSettings(), d.settings || {});
        this.data.slots = (d.slots || [null, null, null]).slice(0, 3);
        while (this.data.slots.length < 3) this.data.slots.push(null);
        this.data.slots = this.data.slots.map(s => (s ? this.migrate(s) : null));
        this.data.current = typeof d.current === 'number' ? d.current : -1;
      }
    } catch (e) {
      console.warn('save load failed', e);
      this.ok = false;
    }
    return this.data;
  }

  migrate(s) {
    const base = newSlotData();
    const out = Object.assign(base, s);
    out.upgrades = Object.assign(newSlotData().upgrades, s.upgrades || {});
    out.stats = Object.assign(newSlotData().stats, s.stats || {});
    out.heroes = Object.assign({ brannoc: { xp: 0 } }, s.heroes || {});
    return out;
  }

  persist() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); }
    catch (e) { this.ok = false; }
  }

  get settings() { return this.data.settings; }
  get slot() { const i = this.data.current; return i >= 0 ? this.data.slots[i] : null; }

  selectSlot(i) {
    if (!this.data.slots[i]) this.data.slots[i] = newSlotData();
    this.data.current = i;
    this.slot.lastPlayed = Date.now();
    this.persist();
    return this.slot;
  }
  deleteSlot(i) {
    this.data.slots[i] = null;
    if (this.data.current === i) this.data.current = -1;
    this.persist();
  }

  // ---- helpers over the current slot ----
  stage(id) { const s = this.slot; if (!s) return null; return (s.stages[id] ||= { stars: 0, heroic: false, iron: false, done: false, bestLives: 0 }); }
  totalStars(slot = this.slot) {
    if (!slot) return 0;
    let n = 0;
    for (const st of Object.values(slot.stages)) n += (st.stars || 0) + (st.heroic ? 1 : 0) + (st.iron ? 1 : 0);
    return n;
  }
  availableStars(slot = this.slot) { return slot ? this.totalStars(slot) - (slot.starsSpent || 0) : 0; }
}

export const Save = new SaveManager();
