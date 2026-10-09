// Rampart Riot — screen / orientation / fullscreen management.
// - The game is always presented in landscape. On touch devices held in portrait we rotate the
//   whole stage 90° with CSS (never asking the player to rotate).
// - On devices that support the Fullscreen API (Android, iPad, desktop) a tap enters fullscreen and
//   locks landscape. Leaving fullscreen (back button) emits 'fullscreenlost' so the app can pause.
import { Emitter, clamp } from './util.js';

const ua = navigator.userAgent || '';
const isIPad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isIPhone = /iPhone|iPod/.test(ua);
const isIOS = isIPad || isIPhone;
const isAndroid = /Android/i.test(ua);
const isTouch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
const docEl = document.documentElement;
const fsRequest = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;

class ScreenManager extends Emitter {
  constructor() {
    super();
    this.isIOS = isIOS;
    this.isIPhone = isIPhone;
    this.isAndroid = isAndroid;
    this.isTouch = !!isTouch;
    this.isMobile = isIOS || isAndroid || (this.isTouch && Math.min(screen.width, screen.height) < 820);
    // iPhone Safari exposes no element fullscreen; treat as unsupported.
    this.canFullscreen = !!fsRequest && !isIPhone;
    this.standalone = !!(navigator.standalone || (window.matchMedia && (matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches)));
    this.vw = 0; this.vh = 0; // window (CSS px)
    this.gw = 0; this.gh = 0; // game viewport (CSS px, always landscape-ish)
    this.dpr = 1;
    this.rotated = false;
    this.uiScale = 1;
    this.safe = { l: 0, r: 0, t: 0, b: 0 };
    this.quality = 'high';
    this.wasFullscreen = false;
    this._pendingLayout = false;
  }

  init(stage, canvas) {
    this.stage = stage;
    this.canvas = canvas;
    // probe element to read CSS safe-area insets
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);' +
      'padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left);';
    document.body.appendChild(probe);
    this._probe = probe;

    const onResize = () => this.requestLayout();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => { this.requestLayout(); setTimeout(() => this.requestLayout(), 300); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
    const onFs = () => {
      const fs = this.isFullscreen();
      if (fs) this.wasFullscreen = true;
      else if (this.wasFullscreen) { this.wasFullscreen = false; this.emit('fullscreenlost'); }
      this.requestLayout();
      setTimeout(() => this.requestLayout(), 250);
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    document.addEventListener('visibilitychange', () => {
      this.emit(document.hidden ? 'hidden' : 'visible');
    });
    window.addEventListener('pagehide', () => this.emit('hidden'));
    this.layout();
  }

  requestLayout() {
    if (this._pendingLayout) return;
    this._pendingLayout = true;
    requestAnimationFrame(() => { this._pendingLayout = false; this.layout(); });
  }

  readSafe() {
    const cs = getComputedStyle(this._probe);
    const v = k => parseFloat(cs[k]) || 0;
    return { t: v('paddingTop'), r: v('paddingRight'), b: v('paddingBottom'), l: v('paddingLeft') };
  }

  layout() {
    const vw = Math.max(1, Math.round(window.innerWidth));
    const vh = Math.max(1, Math.round(window.innerHeight));
    const rotated = this.isTouch && vh > vw * 1.05;
    const gw = rotated ? vh : vw;
    const gh = rotated ? vw : vh;
    const cap = this.quality === 'low' ? 1 : (this.isMobile ? 2 : 2);
    const dpr = clamp(window.devicePixelRatio || 1, 1, cap);
    const changed = vw !== this.vw || vh !== this.vh || dpr !== this.dpr || rotated !== this.rotated;
    this.vw = vw; this.vh = vh; this.gw = gw; this.gh = gh; this.dpr = dpr; this.rotated = rotated;

    const s = this.stage.style;
    s.width = gw + 'px';
    s.height = gh + 'px';
    s.transform = rotated ? `translate(${vw}px,0) rotate(90deg)` : 'none';
    const cw = Math.round(gw * dpr), ch = Math.round(gh * dpr);
    if (this.canvas.width !== cw || this.canvas.height !== ch) { this.canvas.width = cw; this.canvas.height = ch; }

    const w = this.readSafe();
    // map window insets into game-space insets (CW rotation: game-left = window-top, game-top = window-right)
    this.safe = rotated ? { l: w.t, r: w.b, t: w.r, b: w.l } : { l: w.l, r: w.r, t: w.t, b: w.b };

    let u = Math.min(gw / 1280, gh / 720);
    if (this.isTouch) u *= 1.15;
    this.uiScale = clamp(u, 0.48, 1.45);
    if (changed) this.emit('resize', this);
  }

  // window client coords -> game coords
  toGame(cx, cy) {
    if (this.rotated) return { x: cy, y: this.vw - cx };
    return { x: cx, y: cy };
  }

  isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }

  async enterFullscreen() {
    if (!this.canFullscreen || this.isFullscreen()) return this.isFullscreen();
    try {
      const p = fsRequest.call(docEl, { navigationUI: 'hide' });
      if (p && p.then) await p;
    } catch (e) { /* user agent refused */ }
    try {
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
    } catch (e) { /* not supported */ }
    this.requestLayout();
    return this.isFullscreen();
  }

  async exitFullscreen() {
    try { if (document.exitFullscreen) await document.exitFullscreen(); else if (document.webkitExitFullscreen) document.webkitExitFullscreen(); } catch (e) {}
  }

  setQuality(q) { this.quality = q; this.layout(); this.emit('resize', this); }
}

export const Screen = new ScreenManager();
