// Rampart Riot — entry point
import { App } from './core/engine.js';
import { Audio } from './core/audio.js';
import { Save } from './core/save.js';
import { Screen } from './core/screen.js';
import { setLang } from './core/i18n.js';
import { BootScene } from './scenes/boot.js';
import { BattleScene } from './scenes/battle.js';

const app = new App(document.getElementById('stage'), document.getElementById('game'));
window.RR = { app, Audio, Save, Screen };

Save.load();
setLang(Save.settings.lang);
Audio.setVolumes({ music: Save.settings.music, sfx: Save.settings.sfx });
Audio.setMuted(!!Save.settings.muted);
if (Save.settings.quality === 'low') Screen.quality = 'low';

app.register('boot', BootScene);
app.register('battle', BattleScene);
// other scenes are registered lazily as they are implemented
const lazy = { title: './scenes/title.js', worldmap: './scenes/worldmap.js', cutscene: './scenes/cutscene.js', slots: './scenes/slots.js', upgrades: './scenes/upgrades.js', heroes: './scenes/heroes.js', encyclopedia: './scenes/encyclopedia.js', achievements: './scenes/achievementsScene.js', credits: './scenes/credits.js' };
const origGo = app.go.bind(app);
app.go = async (name, params = {}, instant = false) => {
  if (!app.registry[name] && lazy[name]) {
    try { const m = await import(lazy[name]); const cls = Object.values(m).find(v => typeof v === 'function'); app.register(name, cls); }
    catch (e) { console.error('scene load failed', name, e); return; }
  }
  origGo(name, params, instant);
};

app.start();
app.go('boot', {}, true);
