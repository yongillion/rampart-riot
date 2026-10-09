// Rampart Riot — HD "showcase" atlases: the same art as the battle atlases, re-rendered much larger for the places
// that draw it big (hero screen, NEW ENEMY card, encyclopedia, portraits in dialogues and cutscenes, UI icons).
// The game loads them on demand (js/core/hd.js); battles keep using the small atlases.
//
// Set names understood by tools/art/gen.html (node tools/art/export.mjs <set> ...):
//   hd_<hero>      hero body: idle/attack/special            frames hd_<hero>/<anim>/<n>, hd_portrait/<hero>
//   hde_<enemy>    enemy: idle/walk/attack                    frames hde_<enemy>/<anim>/<n>
//   hdt_<tower>    tower (+ its front, + the units on/beside it)   hdt_<tower>[/idle/<n>], hdt_<tower>_front,
//                                                             hdt_<tower>:<unit sprite>/idle/<n>
//   hdp_<id>       portrait bust                               hdp/<id>
//   hdi_enemies    one still per enemy for encyclopedia tiles  hdi/e_<enemy>
//   hdi_towers     one still per tower (+ front, unit)         hdi/t_<tower>, hdi/t_<tower>_front, hdi/t_<tower>:<unit>
//   ui4, ui8       the UI icon atlas at 2x / 4x (same frame names as 'ui', loaded instead of it on sharp screens)
import { jobs as heroJobs } from '../sets/heroes.js';
import { jobs as portraitJobs } from '../sets/portraits.js';

export const BODY_SCALE = 10;    // battle atlas: 1.6  (Brannoc ~85 px -> ~520 px tall)
export const PORTRAIT_SCALE = 6; // portraits atlas: 2  (128 units -> 768 px), hero screen copy
const PORTRAIT_HD = 12;          // hdp_*: 128 units -> 1536 px (cutscenes draw busts ~760 design px, x2 on HiDPI)
// The griffin is wide, so the screen fits it by width and draws it smaller: ~600 device px wide at most.
const BODY_SCALE_FOR = { aerin: 7.5 };
const SHOW = ['idle', 'attack', 'special'];  // what the hero screen plays

// targets in device pixels (largest views measured on a 1920x1080 @2x screen)
const ENEMY_BOX = { h: 560, w: 760, maxScale: 14 };   // encyclopedia showcase / NEW ENEMY card
const TOWER_BOX = { h: 520, w: 740, maxScale: 12 };   // encyclopedia tower showcase (wide cannons are width-bound)
const ICON_BOX = { enemy: 256, tower: 320 };          // encyclopedia tiles, upgrade-path row

export function hdJobs(id) {
  const body = heroJobs().find(j => j.name === 'h_' + id);
  const face = portraitJobs().find(j => j.name === 'portrait/' + id);
  if (!body) throw new Error('no hero job for ' + id);
  const out = [{ ...body, name: 'hd_' + id, scale: BODY_SCALE_FOR[id] || BODY_SCALE, anims: Object.fromEntries(SHOW.filter(a => body.anims[a]).map(a => [a, body.anims[a]])) }];
  if (face) out.push({ ...face, name: 'hd_portrait/' + id, scale: PORTRAIT_SCALE });
  return out;
}

// ---------------------------------------------------------------- helpers
const ENEMY_SETS = ['enemies1', 'enemies2', 'enemies3', 'enemies4'];
const atlasCache = new Map();
async function atlasJSON(set) {
  if (!atlasCache.has(set)) atlasCache.set(set, fetch(`/assets/sprites/${set}.json`).then(r => r.json()));
  return atlasCache.get(set);
}
// logical (unit-space) bounding box of a sprite's frames in the shipped battle atlas, over the given anims
async function logicalBox(set, sprite, anims) {
  const j = await atlasJSON(set);
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const [name, f] of Object.entries(j.frames)) {
    const ok = name === sprite || anims.some(a => name.startsWith(`${sprite}/${a}/`));
    if (!ok) continue;
    const s = 1 / (f[7] || j.scale);
    l = Math.min(l, -f[5] * s); t = Math.min(t, -f[6] * s); r = Math.max(r, (f[3] - f[5]) * s); b = Math.max(b, (f[4] - f[6]) * s);
  }
  if (!isFinite(l)) throw new Error('no frames for ' + sprite + ' in ' + set);
  return { w: r - l, h: b - t };
}
const fit = (box, T) => Math.min(T.h / box.h, T.w / box.w, T.maxScale || Infinity);
const pick = (job, names) => Object.fromEntries(names.filter(a => job.anims[a]).map(a => [a, job.anims[a]]));
// one still frame (the first frame of `anim`, or the job's single frame) as a single-frame job
function still(job, name, scale, anim = 'idle') {
  const a = job.anims[anim] || Object.values(job.anims)[0];
  const n = a.frames || 1;
  return { ...job, name, scale, anims: { s: { frames: 1, single: true, draw: (g) => a.draw(g, 0, 0, n) } } };
}

async function enemyJob(id) {
  for (const set of ENEMY_SETS) {
    const m = await import(`../sets/${set}.js`);
    const job = (await m.jobs()).find(j => j.name === 'e_' + id);
    if (job) return { set, job };
  }
  throw new Error('no enemy ' + id);
}
async function towerData() { return (await import('/js/data/towers.js')).TOWERS; }
async function towerJobsAll() { return (await import('../sets/towers.js')).jobs(); }
async function unitJobsAll() { return (await import('../sets/units.js')).jobs(); }
function towerUnits(id, d) {  // sprites the encyclopedia draws with a tower
  if (d.line === 'archer') return [d.spec === 'arbalest' ? 'u_arbalest' : d.spec === 'gale' ? 'u_gale' : 'u_archer'];
  if (d.line === 'barracks' && d.unit) return ['s_' + d.unit];
  return [];
}

// ---------------------------------------------------------------- sets
async function enemySet(id) {
  const { set, job } = await enemyJob(id);
  const show = ['idle', 'walk', 'attack'];
  const scale = fit(await logicalBox(set, 'e_' + id, show), ENEMY_BOX);
  return { scale, jobs: () => [{ ...job, name: 'hde_' + id, scale, anims: pick(job, show) }] };
}

async function towerSet(id) {
  const T = await towerData(), d = T[id];
  if (!d) throw new Error('no tower ' + id);
  const tj = await towerJobsAll(), uj = await unitJobsAll();
  const base = tj.find(j => j.name === 't_' + id);
  const scale = fit(await logicalBox('towers', 't_' + id, ['idle']), TOWER_BOX);
  const out = [{ ...base, name: 'hdt_' + id, scale, anims: base.anims.idle ? pick(base, ['idle']) : base.anims }];
  const front = tj.find(j => j.name === `t_${id}_front`);
  if (front) out.push({ ...front, name: `hdt_${id}_front`, scale });
  for (const u of towerUnits(id, d)) {
    const j = tj.find(x => x.name === u) || uj.find(x => x.name === u);
    // barracks squads stand 1.15x larger than the building in the encyclopedia
    if (j) out.push({ ...j, name: `hdt_${id}:${u}`, scale: scale * (u.startsWith('s_') ? 1.15 : 1), anims: pick(j, ['idle']) });
  }
  return { scale, jobs: () => out };
}

async function portraitSet(id) {
  const face = portraitJobs().find(j => j.name === 'portrait/' + id);
  if (!face) throw new Error('no portrait ' + id);
  return { scale: PORTRAIT_HD, jobs: () => [{ ...face, name: 'hdp/' + id }] };
}

async function enemyIcons() {
  const ids = [];
  for (const set of ENEMY_SETS) for (const j of await (await import(`../sets/${set}.js`)).jobs()) ids.push({ set, job: j });
  const out = [];
  for (const { set, job } of ids) {
    const s = ICON_BOX.enemy / Math.max(...Object.values(await logicalBox(set, job.name, ['idle'])));
    out.push(still(job, 'hdi/' + job.name, s));
  }
  return { scale: 4, jobs: () => out };
}

async function towerIcons() {
  const T = await towerData(), tj = await towerJobsAll(), uj = await unitJobsAll();
  const out = [];
  for (const [id, d] of Object.entries(T)) {
    const base = tj.find(j => j.name === 't_' + id);
    if (!base) continue;
    const s = ICON_BOX.tower / Math.max(...Object.values(await logicalBox('towers', 't_' + id, ['idle'])));
    out.push(still(base, 'hdi/t_' + id, s));
    const front = tj.find(j => j.name === `t_${id}_front`);
    if (front) out.push(still(front, `hdi/t_${id}_front`, s));
    for (const u of towerUnits(id, d)) {
      const j = tj.find(x => x.name === u) || uj.find(x => x.name === u);
      if (j && u.startsWith('u_')) out.push(still(j, `hdi/t_${id}:${u}`, s));
    }
  }
  return { scale: 4, jobs: () => out };
}

async function uiSet(scale) {   // ui4 / ui8: the icon atlas at 2x / 4x (same frame names as 'ui')
  const m = await import('../sets/ui.js'), k = scale / m.scale;
  // some icons carry their own render scale: multiply it too
  return { scale, jobs: async () => (await m.jobs()).map(j => ({ ...j, scale: (j.scale || m.scale) * k })) };
}

// set name -> { scale, jobs } (or null when the name is not an HD set)
export async function hdSet(name) {
  let m;
  if ((m = /^hde_(.+)$/.exec(name))) return enemySet(m[1]);
  if ((m = /^hdt_(.+)$/.exec(name))) return towerSet(m[1]);
  if ((m = /^hdp_(.+)$/.exec(name))) return portraitSet(m[1]);
  if (name === 'hdi_enemies') return enemyIcons();
  if (name === 'hdi_towers') return towerIcons();
  if ((m = /^ui(4|8)$/.exec(name))) return uiSet(+m[1]);
  if ((m = /^hd_(.+)$/.exec(name))) return { scale: BODY_SCALE, jobs: () => hdJobs(m[1]) };
  return null;
}
