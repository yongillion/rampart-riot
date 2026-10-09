// Rampart Riot — HD showcase art (made by tools/art/lib/hd.js and the --hd map exports).
// The battle atlases are drawn ~1:1 during play; menus, cards, dialogues and cutscenes draw some of that art 2-7x
// larger. For those places there are high-resolution copies, loaded only when a view would otherwise stretch the
// regular art (so small phone screens skip most of them), owned by the scene that asked for them and released when
// that scene ends. Families keep only a few atlases each, so browsing the encyclopedia doesn't pile them up.
//   atlases: hd_<hero> hde_<enemy> hdt_<tower> hdp_<portrait> hdi_enemies hdi_towers   (frame names: see tools/art/lib/hd.js)
//   images:  assets/maps/map_<n>_hd.webp, assets/ui/worldmap_hd.webp
import { Assets } from './assets.js';
import { Screen } from './screen.js';

const NEED = 1.1;                                  // swap in HD once the regular art would be stretched more than this
const KEEP = { hd: 2, hde: 2, hdt: 3, hdp: 4 };     // per family; others (icons) unlimited
const atlasOwner = new Map();                      // atlas -> owning scene
const lru = [];                                    // atlas names, most recent last
const imgs = new Map();                            // base url -> { url, img, owner, loading }

const family = a => a.slice(0, a.indexOf('_') > 0 ? a.indexOf('_') : a.length);

export const HD = {
  owner: null,  // the current scene (set by the engine)

  // HD pages ship as WebP only; 'low' quality keeps memory and downloads small
  get ok() { return Assets.webp !== false && Screen.quality !== 'low'; },
  // device pixels per canvas unit under the current transform
  px(ctx) { const m = ctx.getTransform(); return Math.hypot(m.a, m.b) || 1; },
  // would art `srcPx` pixels wide/tall look stretched when drawn `devPx` device pixels wide/tall?
  needed(srcPx, devPx) { return devPx > srcPx * NEED; },
  has(atlas) { return Assets.atlases.has(atlas) || !!(Assets.pending && Assets.pending.has(atlas)); },
  loaded(atlas) { return Assets.atlases.has(atlas); },

  // ask for an HD atlas (cheap to call every frame)
  want(atlas) {
    if (!atlas || !this.ok) return;
    atlasOwner.set(atlas, this.owner);
    if (lru[lru.length - 1] !== atlas) {
      const i = lru.indexOf(atlas); if (i >= 0) lru.splice(i, 1);
      lru.push(atlas);
      const fam = family(atlas), keep = KEEP[fam];
      if (keep) { const same = lru.filter(a => family(a) === fam); while (same.length > keep) this.drop(same.shift()); }
    }
    if (!this.has(atlas)) Assets.loadAtlas(atlas).then(a => { if (a && !atlasOwner.has(atlas)) Assets.unloadAtlas(atlas); }).catch(() => {});
  },
  drop(atlas) {
    atlasOwner.delete(atlas);
    const i = lru.indexOf(atlas); if (i >= 0) lru.splice(i, 1);
    Assets.unloadAtlas(atlas);   // a load still in flight is unloaded when it lands (no owner)
  },

  // frame / animation frame from the HD atlases (null when not loaded)
  frame(name) { return Assets.frame(name); },
  anim(sprite, anim, t) {
    const an = Assets.anim(sprite + '/' + anim) || Assets.anim(sprite + '/idle');
    if (!an) return null;
    const n = an.frames.length;
    let i = Math.floor(t * an.fps);
    i = an.loop ? ((i % n) + n) % n : Math.min(n - 1, Math.max(0, i));
    return an.frames[i];
  },

  // ---- images: an HD copy of a map / painting, if one exists
  imageUrl(url) {
    if (!url) return null;
    if (/assets\/maps\/map_\d+_\d+\.jpg$/.test(url)) return url.replace(/\.jpg$/, '_hd.webp');
    if (url.endsWith('assets/ui/worldmap.jpg')) return url.replace(/\.jpg$/, '_hd.webp');
    return null;
  },
  // big pictures are only worth it on screens with room for them (phones never zoom far enough to need 13 Mpx maps)
  get bigScreen() { return Screen.gw * Screen.dpr >= 1800 || Screen.gh * Screen.dpr >= 1300; },
  // the best loaded image for `url`; starts loading the HD copy when `need` is true
  image(url, need) {
    const base = Assets.img(url);
    let e = imgs.get(url);
    if (need && !e && this.ok && this.bigScreen) {
      const hd = this.imageUrl(url);
      if (hd) {
        e = { url: hd, img: null, owner: this.owner, loading: true };
        imgs.set(url, e);
        Assets.loadImage(hd).then(img => { e.loading = false; if (imgs.get(url) === e) e.img = img; else if (img) Assets.images.delete(hd); });
      }
    }
    if (e) e.owner = this.owner;
    return (e && e.img) || base;
  },

  // scene ended: free what it asked for
  release(owner) {
    for (const [a, o] of [...atlasOwner]) if (o === owner) this.drop(a);
    for (const [url, e] of [...imgs]) if (e.owner === owner) { imgs.delete(url); Assets.images.delete(e.url); }
  },
};
