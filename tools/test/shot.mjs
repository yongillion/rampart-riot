// Headless browser test driver.
// usage: NODE_PATH=/home/claude/.npm-global/lib/node_modules node tools/test/shot.mjs '<json>'
// json: { device: "desktop"|"iphone"|"iphone-land"|"android"|"android-land"|"ipad", url, steps: [
//   {wait: ms} | {tap: [x,y]} | {drag: [x1,y1,x2,y2]} | {eval: "js"} | {shot: "path.png"} | {key: "Enter"} | {pinch: [cx,cy,scale]} ] }
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire((process.env.PW_PATH || '/home/claude/.npm-global/lib/node_modules') + '/');
const { chromium, devices } = require('playwright');

const cfg = JSON.parse(process.argv[2] || '{}');
const url = cfg.url || 'http://localhost:8080/index.html';
const profiles = {
  desktop: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
  'desktop-hd': { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
  iphone: { ...devices['iPhone 13'] },
  'iphone-land': { ...devices['iPhone 13 landscape'] },
  android: { ...devices['Pixel 7'] },
  'android-land': { ...devices['Pixel 7 landscape'] },
  ipad: { ...devices['iPad Pro 11 landscape'] },
};
const prof = profiles[cfg.device || 'desktop'];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }).catch(async () => chromium.launch());
const context = await browser.newContext({ ...prof });
const page = await context.newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning' || cfg.verbose) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}\n${e.stack || ''}`));
page.on('requestfailed', r => logs.push(`[reqfail] ${r.url()} ${r.failure() && r.failure().errorText}`));
await page.goto(url, { waitUntil: 'load' });

const isTouch = !!prof.hasTouch;
for (const s of cfg.steps || []) {
  if (s.wait) await page.waitForTimeout(s.wait);
  if (s.tap) { if (isTouch) await page.touchscreen.tap(s.tap[0], s.tap[1]); else await page.mouse.click(s.tap[0], s.tap[1]); }
  if (s.click) await page.mouse.click(s.click[0], s.click[1]);
  if (s.drag) {
    const [x1, y1, x2, y2] = s.drag;
    await page.mouse.move(x1, y1); await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(x1 + (x2 - x1) * i / 10, y1 + (y2 - y1) * i / 10);
    await page.mouse.up();
  }
  if (s.pinch) { // two-finger pinch via CDP touch events: [cx, cy, scale]
    const [cx, cy, sc] = s.pinch;
    const cdp = await context.newCDPSession(page);
    const pts = d => [{ x: cx - d, y: cy, id: 0 }, { x: cx + d, y: cy, id: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(60) });
    for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(60 + (60 * sc - 60) * i / 10) }); await page.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  if (s.wheel) { await page.mouse.move(s.wheel[0], s.wheel[1]); await page.mouse.wheel(0, s.wheel[2]); }
  if (s.key) await page.keyboard.press(s.key);
  if (s.evalFile) { const r = await page.evaluate(fs.readFileSync(s.evalFile, 'utf8')); if (r !== undefined) console.log('eval:', typeof r === 'string' ? r : JSON.stringify(r)); }
  if (s.eval) { const r = await page.evaluate(s.eval); if (r !== undefined) console.log('eval:', typeof r === 'string' ? r : JSON.stringify(r)); }
  if (s.shot) await page.screenshot({ path: s.shot });
}
if (cfg.shot) await page.screenshot({ path: cfg.shot });
for (const l of logs) console.log(l);
await browser.close();
