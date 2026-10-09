// Export sprite atlases via headless Chromium.
// usage: node tools/art/export.mjs set1 [set2 ...]        -> writes assets/sprites/<set>.json + pngs
//        node tools/art/export.mjs --sheet set [filter] [out.png] [cols] [cell]  -> contact sheet screenshot
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire((process.env.PW_PATH || '/home/claude/.npm-global/lib/node_modules') + '/');
const { chromium } = require('playwright');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const args = process.argv.slice(2);
const base = 'http://localhost:8080/tools/art/gen.html';
const browser = await chromium.launch({ args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));

async function run(set, extra = '') {
  await page.goto(`${base}?set=${set}${extra}`);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 600000 });
  const err = await page.evaluate(() => window.__error);
  if (err) { console.log(err); return null; }
  return page.evaluate(() => window.__result);
}

if (args[0] === '--sheet') {
  const [, set, filter = '', out = '/tmp/sheet.png', cols = '10', cell = '140', bg = '', zoom = '1'] = args;
  const r = await run(set, `&sheet=1&cols=${cols}&cell=${cell}${filter ? '&filter=' + encodeURIComponent(filter) : ''}${bg ? '&bg=' + bg : ''}&zoom=${zoom}`);
  if (r) {
    const dims = await page.evaluate(() => window.__sheet);
    await page.setViewportSize({ width: Math.min(4000, dims.w), height: Math.min(8000, dims.h + 30) });
    const el = await page.$('#out canvas');
    await el.screenshot({ path: out });
    console.log(`sheet ${set}: ${r.count} frames -> ${out} (${dims.w}x${dims.h})`);
  }
} else {
  const outDir = path.join(root, 'assets/sprites');
  fs.mkdirSync(outDir, { recursive: true });
  for (const set of args) {
    const r = await run(set);
    if (!r) { console.log('FAILED', set); continue; }
    // remove stale pages
    for (const f of fs.readdirSync(outDir)) if (f.startsWith(set + '_') && f.endsWith('.png')) fs.unlinkSync(path.join(outDir, f));
    r.pages.forEach((d, i) => fs.writeFileSync(path.join(outDir, `${set}_${i}.png`), Buffer.from(d.split(',')[1], 'base64')));
    fs.writeFileSync(path.join(outDir, `${set}.json`), JSON.stringify(r.json));
    const sz = r.pages.reduce((a, d) => a + d.length * 0.75, 0);
    console.log(`${set}: ${r.count} frames, ${r.pages.length} page(s), ~${(sz / 1024).toFixed(0)} KB`);
  }
}
await browser.close();
