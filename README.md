# Rampart Riot

An original single-player fantasy tower-defense game for the web (desktop, Android, iPhone, iPad).
Four chapters × eight stages, six heroes, twenty towers with specializations and skills, 37 enemy types
with four bosses, star upgrades, Heroic/Iron challenges, an encyclopedia, 30 achievements, an opening film,
chapter interludes, an ending film and credits. Korean and English (switch any time in **Settings**).

Everything is original and generated for this project: code, sprites and animations, maps, key art,
music and sound effects. The only third-party content is the font set (Noto Sans/Serif CJK, SIL OFL 1.1,
see `assets/fonts/OFL.txt`).

## Run it

The game uses ES modules, so it must be served over HTTP. `file://` won't work.

```bash
cd rampart-riot
python3 -m http.server 8080          # Windows: py -m http.server 8080
# then open http://localhost:8080
```

Any static host works for phones: GitHub Pages, Netlify, Cloudflare Pages, or your own server.
There is no build step; copy the folder as-is.

### Mobile
- The game never asks you to rotate the device. Held upright, the picture is rotated so it always plays in landscape.
- The title screen shows a blinking **TOUCH**. The first tap starts the sound and, on browsers with the
  Fullscreen API (Android Chrome and others, iPad), switches to landscape fullscreen.
- If fullscreen is lost mid-game, for example after the back gesture or when the address bar comes back,
  the game pauses and shows the title-style **TOUCH** screen. Tapping returns to fullscreen and continues.
- iPhone Safari has no Fullscreen API for web pages. Use **Share → Add to Home Screen** and launch it from the icon to get a full-screen app.
- Pinch to zoom and drag to pan, both on the battlefield and on the world map.

### Controls (desktop)
Click or tap to build, upgrade and sell, and to place rally points and the hero. Mouse wheel zooms, drag pans.
Keys: `Space`/`P` pause, `1` Skyfall, `2` Call to Arms, `H` select hero, `W` call wave, `F` speed, `Esc` back. `F2` shows FPS.

## Project layout

```
index.html, css/, manifest.webmanifest
js/
  main.js                 entry; lazy scene registry
  core/                   engine (loop, scenes, resume overlay), screen (rotation, fullscreen, safe areas),
                          input (tap/drag/pinch/wheel), audio (WebAudio music/ambience/SFX), assets, save, i18n
  game/                   battle simulation: battle, enemy, soldier/hero, tower, projectile, combat, path,
                          camera, fx, renderer, hud, map props (easter eggs)
  scenes/                 boot, title, slots, worldmap, battle, cutscene, upgrades, heroes, encyclopedia,
                          achievementsScene, credits
  cine/                   cinematic kit + films (opening, interludes, ending)
  ui/  render/            widgets, menu kit, settings popup, dialogue; drawing helpers, fonts, title art
  data/                   towers, enemies, heroes, upgrades, story, world map, languages, levels/ch1..ch4
  meta/                   achievements
assets/
  sprites/                texture atlases (PNG + WebP) with JSON frame/animation data
  maps/                   32 painted battlefield maps
  ui/                     title background, logo, world map, app icons
  audio/                  music (14 tracks), ambiences, sound effects + manifests
  fonts/                  subset web fonts + licence
tools/                    the generators used to make every asset (see below)
```

## Regenerating assets (optional)

Requirements: Node 18+ with Playwright and Chromium, Python 3 with Pillow, NumPy and fontTools, and `ffmpeg`.
Start a local server on port 8080 first, because the tools drive headless Chromium.

| What | Command |
|---|---|
| Sprite atlas | `node tools/art/export.mjs towers units heroes enemies1 enemies2 enemies3 enemies4 fx ui props portraits`, then `python3 tools/art/webp.py` |
| HD hero screen | `node tools/art/export.mjs hd_brannoc hd_kaela hd_seren hd_torvald hd_aerin hd_ysolde`, then `python3 tools/art/webp.py hd_brannoc hd_kaela hd_seren hd_torvald hd_aerin hd_ysolde`. Sharp copies of the hero sprites and portraits for the Hall of Heroes (`tools/art/lib/hd.js`). Re-run after changing `sets/heroes.js` or `sets/portraits.js` |
| Contact sheet | `node tools/art/export.mjs --sheet enemies2 "" /tmp/sheet.png 8 150 5a6a4a 2` |
| Battle maps | `node tools/maps/export.mjs 1-1 1-2 …`  ·  `node tools/maps/checklevel.mjs` |
| Key art | `node tools/keyart/export.mjs title logo worldmap icons` |
| Music & SFX | `python3 tools/audio/music/build_all.py`  ·  `python3 tools/audio/sfx/build_sfx.py` (needs `ffmpeg`) |
| Fonts | `python3 tools/fonts/subset.py` (re-run after changing any text) |
| Balance sim | `node tools/sim/sim.mjs 2-5 --runs 6 --up 3 --hero brannoc:3700 [--skill 0.6] [--mode heroic]` |
| Screenshots | `node tools/test/shot.mjs '{"device":"iphone-land","url":"http://localhost:8080/index.html?stage=1-1","steps":[{"wait":4000},{"shot":"/tmp/a.png"}]}'` |

Debug URLs:
- `?stage=3-4` opens a battle directly.
- `?scene=worldmap` opens a scene directly.
- `?scene=cutscene&id=ending&t=60&freeze=1` shows a film frame.

## Save data
Progress is stored in the browser (`localStorage`, key `rampart_riot_save_v1`) in three save slots.
