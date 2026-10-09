// Validate stage geometry: plot distance to roads, plot spacing, bounds.
import { STAGES } from '../../js/data/levels/index.js';
import { Path } from '../../js/game/path.js';
const ids = process.argv.slice(2);
for (const lv of STAGES) {
  if (ids.length && !ids.includes(lv.id)) continue;
  const paths = lv.paths.filter(p => !p.air).map(p => new Path(p.pts, { width: p.width ?? 26 }));
  const issues = [];
  lv.plots.forEach(([x, y], i) => {
    let best = Infinity;
    for (const p of paths) best = Math.min(best, p.nearest(x, y).d);
    if (best < 92) issues.push(`plot${i} too close to road (${best.toFixed(0)})`);
    if (best > 210) issues.push(`plot${i} far from road (${best.toFixed(0)})`);
    if (x < 270 || x > 2130 || y < 170 || y > 1200) issues.push(`plot${i} near edge (${x},${y})`);
    lv.plots.forEach(([x2, y2], j) => { if (j > i && Math.hypot(x - x2, (y - y2) * 1.4) < 120) issues.push(`plot${i}-${j} overlap`); });
  });
  if (lv.hero) { let best = Infinity; for (const p of paths) best = Math.min(best, p.nearest(lv.hero[0], lv.hero[1]).d); if (best > 120) issues.push(`hero far from road ${best.toFixed(0)}`); }
  const lens = paths.map(p => p.len.toFixed(0)).join(',');
  console.log(`${lv.id}: plots=${lv.plots.length} waves=${lv.waves.length} pathLen=[${lens}] ${issues.length ? '\n   ' + issues.join('\n   ') : 'OK'}`);
}
