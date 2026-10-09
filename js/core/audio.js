// Rampart Riot — WebAudio manager: music (gapless timed loops), ambience (crossfaded loops) and SFX.
import { clamp } from './util.js';

const BASE = 'assets/audio/';

class AudioManager {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.unlocked = false;
    this.music = {}; this.sfxDefs = {}; this.ambDefs = {};
    this.buffers = new Map();   // url -> AudioBuffer
    this.loading = new Map();   // url -> Promise
    this.musicLRU = [];
    this.vol = { master: 1, music: 0.7, sfx: 0.85 };
    this.muted = false;
    this.track = null;          // current music track
    this.amb = null;            // current ambience
    this.lastPlay = new Map();  // sfx name -> time
    this.active = new Map();    // sfx name -> count
    this.totalActive = 0;
    this.duckLevel = 1;
    this._token = 0;
  }

  async init() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC({ latencyHint: 'interactive' });
      const c = this.ctx;
      this.master = c.createGain();
      this.limiter = c.createDynamicsCompressor();
      this.limiter.threshold.value = -6; this.limiter.knee.value = 6; this.limiter.ratio.value = 8;
      this.limiter.attack.value = 0.003; this.limiter.release.value = 0.15;
      this.master.connect(this.limiter); this.limiter.connect(c.destination);
      this.musicBus = c.createGain(); this.musicBus.connect(this.master);
      this.duckBus = c.createGain(); this.duckBus.connect(this.musicBus);
      this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
      this.ambBus = c.createGain(); this.ambBus.connect(this.master);
      this.applyVolumes();
      const [m, s] = await Promise.all([
        fetch(BASE + 'music.json').then(r => r.json()).catch(() => ({})),
        fetch(BASE + 'sfx.json').then(r => r.json()).catch(() => ({ sfx: {}, amb: {} })),
      ]);
      this.music = m || {};
      this.sfxDefs = (s && s.sfx) || {};
      this.ambDefs = (s && s.amb) || {};
      this.ready = true;
    } catch (e) {
      console.warn('Audio init failed', e);
    }
  }

  // Must be called from a user gesture (touchend / pointerup / click / keydown)
  unlock() {
    const c = this.ctx;
    if (!c) return;
    if (c.state !== 'running') { c.resume().catch(() => {}); }
    if (!this.unlocked) {
      try {
        const b = c.createBuffer(1, 1, 22050);
        const src = c.createBufferSource(); src.buffer = b; src.connect(c.destination); src.start(0);
      } catch (_) {}
      this.unlocked = true;
    }
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ctx && this.ctx.state !== 'running' && this.ctx.state !== 'closed') this.ctx.resume().catch(() => {}); }
  get time() { return this.ctx ? this.ctx.currentTime : performance.now() / 1000; }

  setVolumes(v) { Object.assign(this.vol, v); this.applyVolumes(); }
  setMuted(m) { this.muted = m; this.applyVolumes(); }
  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const m = this.muted ? 0 : this.vol.master;
    this.master.gain.setTargetAtTime(m, t, 0.02);
    this.musicBus.gain.setTargetAtTime(this.vol.music, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.02);
    this.ambBus.gain.setTargetAtTime(this.vol.sfx * 0.9, t, 0.05);
  }
  duck(level = 0.45, time = 0.4) {
    if (!this.ctx) return;
    this.duckLevel = level;
    this.duckBus.gain.setTargetAtTime(level, this.ctx.currentTime, time / 3);
  }

  load(file) {
    const url = BASE + file;
    if (this.buffers.has(url)) return Promise.resolve(this.buffers.get(url));
    if (this.loading.has(url)) return this.loading.get(url);
    if (!this.ctx) return Promise.resolve(null);
    const p = fetch(url)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => {
        const pr = this.ctx.decodeAudioData(ab, res, rej);
        if (pr && pr.then) pr.then(res, rej);
      }))
      .then(buf => { this.buffers.set(url, buf); this.loading.delete(url); return buf; })
      .catch(err => { this.loading.delete(url); console.warn('audio load failed', url, err); return null; });
    this.loading.set(url, p);
    return p;
  }
  getLoaded(file) { return this.buffers.get(BASE + file) || null; }

  // ---------------- SFX ----------------
  sfxFiles(name) { const d = this.sfxDefs[name]; if (!d) return []; return d.files || (d.file ? [d.file] : []); }

  preload(names, onProgress) {
    const files = [];
    for (const n of names) for (const f of this.sfxFiles(n)) files.push(f);
    let done = 0;
    return Promise.all(files.map(f => this.load(f).then(() => { done++; onProgress && onProgress(done / files.length); })));
  }
  preloadAllSfx(onProgress) { return this.preload(Object.keys(this.sfxDefs), onProgress); }

  sfx(name, opts = {}) {
    if (!this.ctx || !this.ready || this.muted) return null;
    if (this.ctx.state !== 'running') return null;
    const def = this.sfxDefs[name];
    if (!def) return null;
    const now = this.ctx.currentTime;
    const minGap = opts.minGap ?? 0.035;
    const last = this.lastPlay.get(name) || -1;
    if (now - last < minGap) return null;
    const maxConc = opts.max ?? 5;
    const act = this.active.get(name) || 0;
    if (act >= maxConc || this.totalActive > 40) return null;
    const files = this.sfxFiles(name);
    const file = files[Math.floor(Math.random() * files.length)];
    const buf = this.getLoaded(file);
    if (!buf) { this.load(file); return null; }
    this.lastPlay.set(name, now);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    let rate = opts.rate ?? 1;
    if (opts.detune !== 0) rate *= 1 + (Math.random() - 0.5) * (opts.detune ?? 0.06);
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = clamp((opts.vol ?? 1) * (def.gain ?? 1), 0, 2);
    let node = src;
    node.connect(g); node = g;
    if (opts.pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = clamp(opts.pan, -1, 1);
      node.connect(p); node = p;
    }
    node.connect(opts.bus === 'amb' ? this.ambBus : this.sfxBus);
    this.active.set(name, act + 1); this.totalActive++;
    src.onended = () => { this.active.set(name, Math.max(0, (this.active.get(name) || 1) - 1)); this.totalActive = Math.max(0, this.totalActive - 1); };
    src.start(now + (opts.delay || 0));
    return { src, gain: g, stop: (f = 0.08) => { try { g.gain.setTargetAtTime(0, this.ctx.currentTime, f / 3); src.stop(this.ctx.currentTime + f + 0.05); } catch (_) {} } };
  }

  // ---------------- Music ----------------
  _touchLRU(file) {
    const i = this.musicLRU.indexOf(file); if (i >= 0) this.musicLRU.splice(i, 1);
    this.musicLRU.push(file);
    while (this.musicLRU.length > 3) {
      const old = this.musicLRU.shift();
      if (this.track && this.track.def.file === old) { this.musicLRU.push(old); break; }
      this.buffers.delete(BASE + old);
    }
  }

  preloadMusic(id) { const d = this.music[id]; return d ? this.load(d.file) : Promise.resolve(null); }

  async playMusic(id, opts = {}) {
    if (!this.ctx || !this.ready) return;
    const def = this.music[id];
    if (!def) return;
    if (this.track && this.track.id === id && !opts.restart) return;
    const token = ++this._token;
    this.stopMusic(opts.fadeOut ?? 0.8);
    const buf = await this.load(def.file);
    if (!buf || token !== this._token) return;
    this._touchLRU(def.file);
    const c = this.ctx;
    const gain = c.createGain();
    gain.connect(this.duckBus);
    const fadeIn = opts.fadeIn ?? 0.6;
    const start = c.currentTime + 0.05;
    gain.gain.setValueAtTime(fadeIn > 0 ? 0.0001 : 1, start);
    if (fadeIn > 0) gain.gain.exponentialRampToValueAtTime(1, start + fadeIn);
    const tr = { id, def, buf, gain, sources: [], start, next: start, loop: !!def.loop && opts.loop !== false, onEnd: opts.onEnd, ended: false };
    this.track = tr;
    this._schedule(tr);
  }

  _schedule(tr) {
    const c = this.ctx;
    while (tr.next < c.currentTime + 1.5 && !tr.ended) {
      const src = c.createBufferSource();
      src.buffer = tr.buf;
      src.connect(tr.gain);
      src.start(Math.max(tr.next, c.currentTime));
      tr.sources.push(src);
      src.onended = () => { const i = tr.sources.indexOf(src); if (i >= 0) tr.sources.splice(i, 1); };
      if (tr.loop) tr.next += tr.def.loopLength;
      else { tr.next = Infinity; tr.endAt = tr.start + tr.buf.duration; break; }
    }
  }

  stopMusic(fade = 0.8) {
    const tr = this.track;
    if (!tr) return;
    this.track = null;
    tr.ended = true;
    const c = this.ctx;
    const t = c.currentTime;
    try {
      tr.gain.gain.cancelScheduledValues(t);
      tr.gain.gain.setValueAtTime(tr.gain.gain.value, t);
      tr.gain.gain.linearRampToValueAtTime(0, t + Math.max(0.01, fade));
    } catch (_) {}
    const srcs = tr.sources.slice();
    setTimeout(() => { for (const s of srcs) { try { s.stop(); } catch (_) {} } try { tr.gain.disconnect(); } catch (_) {} }, (fade + 0.1) * 1000);
  }

  // seconds since current track started (for cinematic sync); null if none
  musicTime() {
    const tr = this.track;
    if (!tr || !this.ctx) return null;
    return this.ctx.currentTime - tr.start;
  }
  musicId() { return this.track ? this.track.id : null; }

  // ---------------- Ambience ----------------
  async playAmb(name, vol = 1) {
    if (!this.ctx || !this.ready) return;
    if (this.amb && this.amb.name === name) return;
    this.stopAmb(1.2);
    const def = this.ambDefs[name];
    if (!def) return;
    const tok = (this._ambTok = (this._ambTok || 0) + 1);
    const buf = await this.load(def.file);
    if (!buf || tok !== this._ambTok) return;
    const c = this.ctx;
    const out = c.createGain(); out.gain.value = 0.0001; out.connect(this.ambBus);
    out.gain.exponentialRampToValueAtTime(vol * (def.gain ?? 1), c.currentTime + 1.5);
    this.amb = { name, def, buf, out, next: c.currentTime + 0.05, first: true, sources: [] };
  }
  _scheduleAmb() {
    const a = this.amb; if (!a) return;
    const c = this.ctx;
    const L = a.def.loopLength, X = a.def.overlap || 2;
    while (a.next < c.currentTime + 1.5) {
      const src = c.createBufferSource(); src.buffer = a.buf;
      const g = c.createGain();
      const t0 = Math.max(a.next, c.currentTime);
      if (a.first) g.gain.setValueAtTime(1, t0);
      else { g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(1, t0 + X); }
      g.gain.setValueAtTime(1, t0 + L);
      g.gain.linearRampToValueAtTime(0.0001, t0 + L + X);
      src.connect(g); g.connect(a.out);
      src.start(t0);
      a.sources.push(src);
      src.onended = () => { const i = a.sources.indexOf(src); if (i >= 0) a.sources.splice(i, 1); try { g.disconnect(); } catch (_) {} };
      a.first = false;
      a.next = t0 + L;
    }
  }
  stopAmb(fade = 1) {
    const a = this.amb; if (!a) return;
    this.amb = null;
    this._ambTok = (this._ambTok || 0) + 1;
    const t = this.ctx.currentTime;
    try { a.out.gain.cancelScheduledValues(t); a.out.gain.setValueAtTime(a.out.gain.value, t); a.out.gain.linearRampToValueAtTime(0, t + fade); } catch (_) {}
    setTimeout(() => { for (const s of a.sources) { try { s.stop(); } catch (_) {} } try { a.out.disconnect(); } catch (_) {} }, (fade + 0.1) * 1000);
  }

  // Called every frame
  update() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const tr = this.track;
    if (tr && !tr.ended) {
      if (tr.loop) this._schedule(tr);
      else if (tr.endAt && this.ctx.currentTime >= tr.endAt) {
        tr.ended = true;
        const cb = tr.onEnd; tr.onEnd = null;
        if (this.track === tr) this.track = null;
        if (cb) cb();
      }
    }
    if (this.amb) this._scheduleAmb();
  }
}

export const Audio = new AudioManager();
