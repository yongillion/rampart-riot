// Paint the key art (title background, logo, world map, app icons) via headless Chromium.
// usage: node tools/keyart/export.mjs title logo worldmap icons      -> assets/ui/...
//        node tools/keyart/export.mjs --out /tmp/dir title ...         -> same files written to another folder
//        painter options ride along as a query: "title&ss=1" (fast preview), "worldmap&debug=1" (flags/route/fog overlay)
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire((process.env.PW_PATH || '/home/claude/.npm-global/lib/node_modules') + '/');
const { chromium } = require('playwright');
let sharp = null; try { sharp = require('sharp'); } catch (e) { /* optional: used to drop the alpha channel of the opaque app icons */ }
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
let args = process.argv.slice(2);
let dir = path.join(root, 'assets/ui');
const oi = args.indexOf('--out');
if (oi >= 0) { dir = path.resolve(args[oi + 1]); args.splice(oi, 2); }
if (!args.length) args = ['title', 'logo', 'worldmap', 'icons'];
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on('pageerror', e => console.log('[pageerror]', e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning' || process.env.VERBOSE) console.log('[console]', m.text()); });
for (const job of args) {
  const t0 = Date.now();
  const [what, extra = ''] = job.split(/&(.*)/s);
  await page.goto(`http://localhost:8080/tools/keyart/keyart.html?what=${what}${extra ? '&' + extra : ''}`);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 600000 });
  const err = await page.evaluate(() => window.__error);
  if (err) { console.log('FAILED', what, err); continue; }
  const res = await page.evaluate(() => window.__result);
  for (const [name, data] of Object.entries(res)) {
    const f = path.join(dir, name);
    let buf = Buffer.from(data.split(',')[1], 'base64');
    if (sharp && name.startsWith('icon-')) buf = await sharp(buf).removeAlpha().png({ compressionLevel: 9 }).toBuffer();
    fs.writeFileSync(f, buf);
    console.log(what, '->', path.relative(root, f).startsWith('..') ? f : path.relative(root, f), (fs.statSync(f).size / 1024).toFixed(0) + ' KB');
  }
  console.log(what, 'done in', Date.now() - t0, 'ms');
}
await browser.close();
