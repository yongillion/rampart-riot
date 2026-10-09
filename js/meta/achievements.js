// Rampart Riot — achievements (bilingual, checked after each battle and on meta actions)
import { Save } from '../core/save.js';

const stars3 = (slot, ids) => ids.every(id => slot.stages[id] && slot.stages[id].stars >= 3);
const done = (slot, id) => !!(slot.stages[id] && slot.stages[id].done);
const chapterIds = ch => Array.from({ length: 8 }, (_, i) => `${ch}-${i + 1}`);

export const ACHIEVEMENTS = [
  { id: 'first_blood', icon: 'skull', ko: ['첫 전투', '첫 번째 전투에서 승리하라.'], en: ['First Watch', 'Win your first battle.'], test: (s) => s.stats.victories >= 1 },
  { id: 'ch1', icon: 'star', ko: ['봉화를 지킨 자', '1장을 완료하라.'], en: ['Keeper of Beacons', 'Complete Chapter I.'], test: (s) => done(s, '1-8') },
  { id: 'ch2', icon: 'star', ko: ['서리를 건너', '2장을 완료하라.'], en: ['Through the Frost', 'Complete Chapter II.'], test: (s) => done(s, '2-8') },
  { id: 'ch3', icon: 'star', ko: ['가라앉은 왕관', '3장을 완료하라.'], en: ['The Drowned Crown', 'Complete Chapter III.'], test: (s) => done(s, '3-8') },
  { id: 'ch4', icon: 'star', ko: ['새벽', '4장을 완료하라.'], en: ['Dawn', 'Complete Chapter IV.'], test: (s) => done(s, '4-8') },
  { id: 'perfect1', icon: 'star', ko: ['녹음의 수호자', '1장의 모든 전장에서 별 3개를 얻어라.'], en: ['Warden of the Greenmarch', 'Earn 3 stars on every Chapter I stage.'], test: (s) => stars3(s, chapterIds(1)) },
  { id: 'perfect2', icon: 'star', ko: ['고개의 수호자', '2장의 모든 전장에서 별 3개를 얻어라.'], en: ['Warden of the Pass', 'Earn 3 stars on every Chapter II stage.'], test: (s) => stars3(s, chapterIds(2)) },
  { id: 'perfect3', icon: 'star', ko: ['늪의 수호자', '3장의 모든 전장에서 별 3개를 얻어라.'], en: ['Warden of the Marsh', 'Earn 3 stars on every Chapter III stage.'], test: (s) => stars3(s, chapterIds(3)) },
  { id: 'perfect4', icon: 'star', ko: ['재의 수호자', '4장의 모든 전장에서 별 3개를 얻어라.'], en: ['Warden of the Ash', 'Earn 3 stars on every Chapter IV stage.'], test: (s) => stars3(s, chapterIds(4)) },
  { id: 'flawless', icon: 'heart', ko: ['무결점', '생명을 하나도 잃지 않고 승리하라.'], en: ['Flawless', 'Win a battle without losing a single life.'], test: (s, c) => c && c.battle && c.battle.state === 'won' && c.mode === 'campaign' && c.battle.lives === 20 },
  { id: 'heroic1', icon: 'skull', ko: ['영웅의 길', '영웅 도전을 처음 완료하라.'], en: ['Heroic Path', 'Complete your first Heroic challenge.'], test: (s) => Object.values(s.stages).some(x => x.heroic) },
  { id: 'iron1', icon: 'gear', ko: ['강철 의지', '강철 도전을 처음 완료하라.'], en: ['Iron Will', 'Complete your first Iron challenge.'], test: (s) => Object.values(s.stages).some(x => x.iron) },
  { id: 'slayer1', icon: 'skull', ko: ['방벽', '적 1,000마리를 처치하라.'], en: ['Bulwark', 'Defeat 1,000 enemies.'], test: (s) => s.stats.kills >= 1000 },
  { id: 'slayer2', icon: 'skull', ko: ['살아 있는 성벽', '적 10,000마리를 처치하라.'], en: ['Living Rampart', 'Defeat 10,000 enemies.'], test: (s) => s.stats.kills >= 10000 },
  { id: 'rich', icon: 'gold', ko: ['전쟁 금고', '누적 골드 50,000을 벌어라.'], en: ['War Chest', 'Earn 50,000 gold in total.'], test: (s) => s.stats.goldEarned >= 50000 },
  { id: 'builder', icon: 'upgrade', ko: ['석공의 손', '탑을 300개 건설하라.'], en: ["Mason's Hands", 'Build 300 towers.'], test: (s) => s.stats.towersBuilt >= 300 },
  { id: 'eager', icon: 'wave', ko: ['성급한 나팔', '웨이브를 일찍 100번 호출하라.'], en: ['Eager Horn', 'Call 100 waves early.'], test: (s) => s.stats.wavesEarly >= 100 },
  { id: 'meteor', icon: 'skyfall', ko: ['하늘이 무너진다', '유성 300개를 떨어뜨려라.'], en: ['The Sky Falls', 'Call down 300 meteors.'], test: (s) => s.stats.meteors >= 300 },
  { id: 'levy', icon: 'militia', ko: ['징집관', '지원군 200명을 소집하라.'], en: ['Recruiter', 'Summon 200 reinforcements.'], test: (s) => s.stats.reinforcements >= 200 },
  { id: 'sheep', icon: 'sheep', ko: ['양치기', '적 50마리를 양으로 바꿔라.'], en: ['Shepherd', 'Turn 50 enemies into sheep.'], test: (s) => s.stats.sheep >= 50 },
  { id: 'boss3', icon: 'skull', ko: ['거인 사냥꾼', '보스 3명을 쓰러뜨려라.'], en: ['Giant Slayer', 'Defeat 3 bosses.'], test: (s) => s.stats.bossKills >= 3 },
  { id: 'hero10', icon: 'star', ko: ['전설', '영웅 하나를 10레벨까지 성장시켜라.'], en: ['Legend', 'Raise a hero to level 10.'], test: (s) => Object.values(s.heroes).some(h => h.xp >= 8600) },
  { id: 'allheroes', icon: 'star', ko: ['동료들', '모든 영웅을 해금하라.'], en: ['Companions', 'Unlock every hero.'], test: (s) => Object.keys(s.heroes).length >= 6 },
  { id: 'upgrader', icon: 'upgrade', ko: ['장인 정신', '업그레이드 트리 하나를 모두 구매하라.'], en: ['Craftsmanship', 'Fully upgrade one tree.'], test: (s) => Object.values(s.upgrades).some(v => v >= 5) },
  { id: 'maxall', icon: 'upgrade', ko: ['완성된 성채', '모든 업그레이드를 구매하라.'], en: ['Perfect Citadel', 'Buy every upgrade.'], test: (s) => Object.values(s.upgrades).every(v => v >= 5) },
  { id: 'secret1', icon: 'book', ko: ['호기심', '전장에서 숨겨진 비밀 하나를 찾아라.'], en: ['Curiosity', 'Find a hidden secret on a battlefield.'], test: (s) => Object.keys(s.secrets || {}).length >= 1 },
  { id: 'secret8', icon: 'book', ko: ['비밀의 수집가', '숨겨진 비밀 8개를 찾아라.'], en: ['Collector of Secrets', 'Find 8 hidden secrets.'], test: (s) => Object.keys(s.secrets || {}).length >= 8 },
  { id: 'stars100', icon: 'star', ko: ['별의 길', '별 100개를 모아라.'], en: ['Road of Stars', 'Collect 100 stars.'], test: (s) => Save.totalStars(s) >= 100 },
  { id: 'veteran', icon: 'skull', ko: ['노련한 수호관', '숙련 난이도에서 4장을 완료하라.'], en: ['Seasoned Warden', 'Complete Chapter IV on Veteran.'], test: (s, c) => c && c.stageId === '4-8' && c.battle && c.battle.state === 'won' && c.battle.difficulty === 'veteran' },
  { id: 'nobuild', icon: 'lock', ko: ['맨손의 수호', '탑 4개 이하로 전장에서 승리하라.'], en: ['Bare Hands', 'Win a stage using 4 or fewer towers.'], test: (s, c) => c && c.battle && c.battle.state === 'won' && c.mode === 'campaign' && c.battle.stats.towersBuilt <= 4 && c.battle.waves.length >= 8 },
];

export const Achievements = {
  list: ACHIEVEMENTS,
  // returns newly unlocked achievements
  check(slot, ctx) {
    if (!slot) return [];
    const got = [];
    for (const a of ACHIEVEMENTS) {
      if (slot.ach[a.id]) continue;
      let ok = false;
      try { ok = a.test(slot, ctx); } catch (e) { ok = false; }
      if (ok) { slot.ach[a.id] = Date.now(); got.push(a); }
    }
    if (got.length) Achievements.pending.push(...got);
    return got;
  },
  pending: [],
};
