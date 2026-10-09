// Paint battlefield maps via headless Chromium.
// usage: node tools/maps/export.mjs 1-1 1-2 ...        -> assets/maps/map_1_1.jpg ...
//        node tools/maps/export.mjs --preview 1-1 [out.jpg] [overlay]  -> preview jpg (with path/plot overlay)
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire((process.env.PW_PATH || '/home/claude/.npm-global/lib/node_modules') + '/');
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const args = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on('pageerror', e => console.log('[pageerror]', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()); });
async function run(id, extra = '') {
  await page.goto(`http://localhost:8080/tools/maps/genmap.html?stage=${id}${extra}`);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 300000 });
  const err = await page.evaluate(() => window.__error);
  if (err) { console.log(err); return null; }
  return page.evaluate(() => window.__result.jpg);
}
if (args[0] === '--preview') {
  const id = args[1], out = args[2] || '/tmp/map_preview.jpg';
  const d = await run(id, args[3] ? '&overlay=1&q=0.8' : '&q=0.8');
  if (d) { fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64')); console.log('preview', id, '->', out); }
} else {
  const dir = path.join(root, 'assets/maps'); fs.mkdirSync(dir, { recursive: true });
  for (const id of args) {
    const t0 = Date.now();
    const d = await run(id);
    if (!d) { console.log('FAILED', id); continue; }
    const f = path.join(dir, `map_${id.replace('-', '_')}.jpg`);
    fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64'));
    console.log(id, '->', path.basename(f), (fs.statSync(f).size / 1024).toFixed(0) + ' KB', (Date.now() - t0) + 'ms');
  }
}
await browser.close();
