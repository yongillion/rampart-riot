// Headless battle simulator.
// usage: node tools/sim/sim.mjs [stageId|test] [--mode campaign|heroic|iron] [--diff normal] [--hero brannoc:0] [--runs 3] [--up 0] [--v]
import { Battle } from '../../js/game/battle.js';
import { AIPlayer } from './ai.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const flag = k => args.includes('--' + k);
const stage = args[0] && !args[0].startsWith('--') ? args[0] : 'test';

async function loadLevel(id) {
  if (id === 'test') return (await import('./testlevel.mjs')).default;
  const ch = id.split('-')[0];
  const mod = await import(`../../js/data/levels/ch${ch}.js`);
  const lv = mod.default.find(l => l.id === id);
  if (!lv) throw new Error('no stage ' + id);
  return lv;
}

export function runOnce(level, o) {
  const [hid, hxp] = (o.hero || 'brannoc:0').split(':');
  const b = new Battle(level, { mode: o.mode, difficulty: o.diff, seed: o.seed, upgrades: o.upgrades, hero: hid === 'none' ? null : { id: hid, xp: +hxp || 0 } });
  const ai = new AIPlayer(b, { skill: o.skill ?? 1 });
  const dt = 1 / 30;
  let steps = 0;
  while (b.state === 'running' && steps < 30 * 60 * 40) { ai.step(dt); b.update(dt); steps++; }
  return { state: b.state, lives: b.lives, t: b.t, gold: b.gold, waves: `${b.waveIdx}/${b.waves.length}`, stars: b.starsEarned(), kills: b.stats.kills, leaks: b.stats.leaks, towers: b.towers.map(t => t.id).join(','), xp: Math.round(b.heroXpGained), log: ai.log };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const level = await loadLevel(stage);
  const runs = +opt('runs', 3);
  const upLevel = +opt('up', 0);
  const upgrades = { archer: upLevel, barracks: upLevel, mage: upLevel, artillery: upLevel, skyfall: upLevel, militia: upLevel };
  for (let r = 0; r < runs; r++) {
    const t0 = Date.now();
    const res = runOnce(level, { mode: opt('mode', 'campaign'), diff: opt('diff', 'normal'), seed: 1000 + r * 77, upgrades, hero: opt('hero', 'brannoc:0'), skill: +opt('skill', 1) });
    console.log(`${stage} [${opt('mode', 'campaign')}/${opt('diff', 'normal')}] run${r}: ${res.state} lives=${res.lives} stars=${res.stars} waves=${res.waves} t=${res.t.toFixed(0)}s kills=${res.kills} leaks=${res.leaks} gold=${res.gold} xp=${res.xp} (${Date.now() - t0}ms)`);
    if (flag('v')) { console.log('  towers:', res.towers); console.log('  ', res.log.slice(0, 40).join(' | ')); }
  }
}
