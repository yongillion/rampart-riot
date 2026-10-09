// Rampart Riot — application shell: main loop, scenes, transitions, global pause/resume overlay.
import { Screen } from './screen.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Save } from './save.js';
import { clamp } from './util.js';
import { HD } from './hd.js';

export class App {
  constructor(stage, canvas) {
    this.stage = stage;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.scene = null;
    this.nextScene = null;
    this.fade = 0;          // 0..1 black overlay
    this.fadeDir = 0;
    this.fadeSpeed = 4;
    this.time = 0;
    this.last = 0;
    this.resumeOverlay = null; // function(ctx,w,h,t) drawer when paused for fullscreen
    this.resumeDrawer = null;
    this.paused = false;
    this.fps = 60; this._fpsAcc = 0; this._fpsN = 0;
    this.showFps = false;
    this.errors = [];
    this.gestured = false;
    this.slowFrames = 0;
    this.registry = {};
  }

  register(name, cls) { this.registry[name] = cls; }
  go(name, params = {}, instant = false) {
    const Cls = this.registry[name];
    if (!Cls) { console.error('unknown scene', name); return; }
    this.setScene(new Cls(this), params, instant);
  }

  start() {
    Screen.init(this.stage, this.canvas);
    this.input = new Input(this.stage, this);
    Screen.on('resize', () => { if (this.scene && this.scene.layout) this.scene.layout(); });
    Screen.on('fullscreenlost', () => this.onFullscreenLost());
    Screen.on('hidden', () => this.onHidden());
    Screen.on('visible', () => this.onVisible());
    // extra iOS audio unlock path
    const unlock = () => { Audio.unlock(); };
    document.addEventListener('touchend', unlock, { passive: true });
    document.addEventListener('click', unlock, { passive: true });
    window.addEventListener('error', e => this.errors.push(String(e.message || e)));
    window.addEventListener('unhandledrejection', e => this.errors.push(String(e.reason && (e.reason.stack || e.reason.message) || e.reason)));
    requestAnimationFrame(t => this.frame(t));
  }

  // ---------- scenes ----------
  setScene(scene, params, instant = false) {
    if (instant || !this.scene) {
      this._switch(scene, params);
      this.fade = instant ? 0 : 1; this.fadeDir = -1;
      return;
    }
    this.nextScene = { scene, params };
    this.fadeDir = 1;
  }
  _switch(scene, params) {
    const old = this.scene;
    if (old && old.exit) old.exit();
    if (old) HD.release(old);   // HD art the old scene asked for (js/core/hd.js)
    this.scene = scene;
    HD.owner = scene;
    this.input.reset();
    if (scene.layout) scene.layout();
    if (scene.enter) scene.enter(params || {});
    if (scene.layout) scene.layout();
  }

  // ---------- pause overlay (title-like "TOUCH" screen) ----------
  onFullscreenLost() {
    if (!Screen.isTouch || !Screen.canFullscreen) return;
    if (this.scene && this.scene.noResumeOverlay) return;
    this.showResume();
  }
  onHidden() {
    Audio.suspend();
    if (this.scene && this.scene.onHidden) this.scene.onHidden();
    Save.persist();
  }
  onVisible() {
    if (Screen.isTouch && !(this.scene && this.scene.noResumeOverlay)) this.showResume();
    else if (!this.resumeOverlay) Audio.resume();
  }
  showResume() {
    if (this.resumeOverlay) return;
    this.resumeOverlay = { t: 0 };
    this.paused = true;
    Audio.suspend();
    this.input.reset();
  }
  hideResume() {
    if (!this.resumeOverlay) return;
    this.resumeOverlay = null;
    this.paused = false;
    Audio.resume();
    if (this.scene && this.scene.onResume) this.scene.onResume();
  }

  // user gesture hook — enter fullscreen on touch devices
  gesture() {
    Audio.unlock();
    this.gestured = true;
    if (Screen.isTouch && Screen.canFullscreen && !Screen.isFullscreen()) Screen.enterFullscreen();
  }

  // ---------- input dispatch ----------
  _target() { return this.scene; }
  _dispatch(name, ...args) {
    if (this.resumeOverlay) return false;
    if (this.fadeDir === 1 && this.nextScene) return false;
    const s = this._target();
    if (s && typeof s[name] === 'function') return s[name](...args);
    return false;
  }
  onDown(p) { if (this.resumeOverlay) return true; return this._dispatch('onDown', p); }
  onUp(p, cancelled) { if (this.resumeOverlay) { if (!cancelled) this._resumeTap(); return; } this._dispatch('onUp', p, cancelled); }
  onTap(p) { if (this.resumeOverlay) return; Audio.unlock(); this._dispatch('onTap', p); }
  _resumeTap() { this.gesture(); this.hideResume(); }
  onDragStart(p) { this._dispatch('onDragStart', p); }
  onDrag(dx, dy, p) { this._dispatch('onDrag', dx, dy, p); }
  onDragEnd(p) { this._dispatch('onDragEnd', p); }
  onPinchStart(cx, cy) { this._dispatch('onPinchStart', cx, cy); }
  onPinch(f, cx, cy, dx, dy) { this._dispatch('onPinch', f, cx, cy, dx, dy); }
  onPinchEnd() { this._dispatch('onPinchEnd'); }
  onCancelPress() { this._dispatch('onCancelPress'); }
  onWheel(dy, x, y, ctrl) { this._dispatch('onWheel', dy, x, y, ctrl); }
  onHover(p) { this._dispatch('onHover', p); }
  onMoveDown(p) { this._dispatch('onMoveDown', p); }
  onKey(k, e) {
    if (k === 'F2') { this.showFps = !this.showFps; return; }
    if (this.resumeOverlay) { if (k === 'Enter' || k === ' ') this._resumeTap(); return; }
    Audio.unlock();
    this._dispatch('onKey', k, e);
  }

  // ---------- main loop ----------
  frame(ts) {
    requestAnimationFrame(t => this.frame(t));
    const now = ts / 1000;
    let dt = this.last ? now - this.last : 1 / 60;
    this.last = now;
    if (dt > 0.25) dt = 0.25; // tab switch etc.
    const sdt = Math.min(dt, 1 / 20);
    this.time += dt;
    this._fpsAcc += dt; this._fpsN++;
    if (this._fpsAcc >= 1) { this.fps = this._fpsN / this._fpsAcc; this._fpsAcc = 0; this._fpsN = 0; }

    Audio.update();

    // transitions
    if (this.fadeDir !== 0) {
      this.fade = clamp(this.fade + this.fadeDir * dt * this.fadeSpeed, 0, 1);
      if (this.fadeDir === 1 && this.fade >= 1) {
        if (this.nextScene) { const n = this.nextScene; this.nextScene = null; this._switch(n.scene, n.params); }
        this.fadeDir = -1;
      } else if (this.fadeDir === -1 && this.fade <= 0) this.fadeDir = 0;
    }

    if (!this.paused && this.scene && this.scene.update) {
      try { this.scene.update(sdt); } catch (e) { this.errors.push(e.stack || String(e)); console.error(e); }
    }
    if (this.resumeOverlay) this.resumeOverlay.t += dt;
    this.render();
  }

  render() {
    const ctx = this.ctx;
    const dpr = Screen.dpr;
    const w = Screen.gw, h = Screen.gh;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = Screen.quality === 'low' ? 'low' : 'medium';
    if (this.scene && this.scene.render && !(this.resumeOverlay && this.resumeOverlay.t > 0.4)) {
      try { this.scene.render(ctx, w, h); } catch (e) { this.errors.push(e.stack || String(e)); console.error(e); }
    } else if (!this.scene) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${this.fade})`; ctx.fillRect(0, 0, w, h); }
    if (this.resumeOverlay && this.resumeDrawer) {
      const a = Math.min(1, this.resumeOverlay.t / 0.35);
      ctx.save(); ctx.globalAlpha = a;
      this.resumeDrawer(ctx, w, h, this.time);
      ctx.restore();
    }
    if (this.showFps) {
      ctx.font = '12px monospace'; ctx.fillStyle = '#0f0'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`${this.fps.toFixed(0)} fps  ${w}x${h}@${dpr}${Screen.rotated ? ' R' : ''}`, 6 + Screen.safe.l, 6);
    }
    if (this.errors.length) {
      ctx.font = '11px monospace'; ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, h - 60, w, 60);
      ctx.fillStyle = '#ff6060'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      this.errors.slice(-3).forEach((e, i) => ctx.fillText(String(e).split('\n')[0].slice(0, 160), 6, h - 56 + i * 16));
    }
  }
}
