// Rampart Riot — visual effects: particles, explosions, beams, decals, floating text + positional sfx
import { Audio } from '../core/audio.js';
import { clamp, rand, TAU } from '../core/util.js';
import { Assets, drawFrame } from '../core/assets.js';
import { text as drawText } from '../render/draw.js';
import { t as tr } from '../core/i18n.js';

// ---------- pre-rendered particle textures ----------
const TEX = {};
function mk(name, size, fn) { const c = document.createElement('canvas'); c.width = c.height = size; fn(c.getContext('2d'), size); TEX[name] = c; }
function radial(g, s, stops) { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, s, s); }
export function initFxTextures() {
  if (TEX.glow) return;
  mk('glow', 64, (g, s) => radial(g, s, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]));
  mk('soft', 64, (g, s) => radial(g, s, [[0, 'rgba(255,255,255,0.9)'], [0.6, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]));
  mk('smoke', 64, (g, s) => {
    for (let i = 0; i < 7; i++) {
      const x = s / 2 + (Math.random() - 0.5) * s * 0.35, y = s / 2 + (Math.random() - 0.5) * s * 0.35, r = s * (0.18 + Math.random() * 0.14);
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
  });
  mk('spark', 32, (g, s) => { g.translate(s / 2, s / 2); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-s / 2, 0); g.lineTo(0, -2.5); g.lineTo(s / 2, 0); g.lineTo(0, 2.5); g.closePath(); g.fill(); });
  mk('shard', 24, (g, s) => { g.translate(s / 2, s / 2); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -s / 2); g.lineTo(s * 0.25, 0); g.lineTo(0, s / 2); g.lineTo(-s * 0.25, 0); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.5; g.stroke(); });
  mk('ring', 96, (g, s) => { g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 6, 0, TAU); g.stroke(); });
  mk('plus', 32, (g, s) => { g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,60,0,0.6)'; g.lineWidth = 2; g.beginPath(); g.rect(s * 0.38, s * 0.12, s * 0.24, s * 0.76); g.rect(s * 0.12, s * 0.38, s * 0.76, s * 0.24); g.stroke(); g.fill(); });
  mk('chip', 16, (g, s) => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(2, 4); g.lineTo(s - 3, 2); g.lineTo(s - 2, s - 5); g.lineTo(4, s - 2); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5; g.stroke(); });
  mk('feather', 24, (g, s) => { g.translate(s / 2, s / 2); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 0, s * 0.42, s * 0.14, 0.4, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-s * 0.4, -s * 0.15); g.lineTo(s * 0.4, s * 0.15); g.stroke(); });
  mk('coin', 24, (g, s) => { g.translate(s / 2, s / 2); const gr = g.createRadialGradient(-3, -3, 1, 0, 0, s / 2); gr.addColorStop(0, '#fff6b0'); gr.addColorStop(0.6, '#f2b72e'); gr.addColorStop(1, '#9a5c08'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s / 2 - 2, 0, TAU); g.fill(); g.strokeStyle = '#4a2a04'; g.lineWidth = 2; g.stroke(); });
  mk('star4', 32, (g, s) => { g.translate(s / 2, s / 2); g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * 0.12 : s * 0.48; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); });
  mk('flame', 48, (g, s) => { const gr = g.createRadialGradient(s / 2, s * 0.62, 1, s / 2, s * 0.55, s * 0.45); gr.addColorStop(0, 'rgba(255,255,220,1)'); gr.addColorStop(0.3, 'rgba(255,200,60,0.95)'); gr.addColorStop(0.7, 'rgba(240,90,20,0.6)'); gr.addColorStop(1, 'rgba(160,30,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(s / 2, 2); g.quadraticCurveTo(s * 0.95, s * 0.6, s / 2, s - 2); g.quadraticCurveTo(s * 0.05, s * 0.6, s / 2, 2); g.fill(); });
}

// tinted texture cache
const tintCache = new Map();
function tinted(name, color) {
  const key = name + color;
  let c = tintCache.get(key);
  if (!c) {
    const src = TEX[name];
    c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    tintCache.set(key, c);
  }
  return c;
}

class Particle {
  set(o) {
    this.x = o.x; this.y = o.y; this.vx = o.vx || 0; this.vy = o.vy || 0; this.g = o.g || 0;
    this.life = o.life || 0.6; this.t = 0; this.size = o.size || 10; this.size1 = o.size1 ?? this.size;
    this.tex = o.tex || 'glow'; this.color = o.color || '#ffffff'; this.add = !!o.add;
    this.rot = o.rot || 0; this.vr = o.vr || 0; this.a0 = o.a ?? 1; this.drag = o.drag ?? 0;
    this.sy = o.sy ?? 1; this.floor = o.floor; this.stretch = o.stretch || 0; this.delay = o.delay || 0;
    return this;
  }
}

export class FX {
  constructor(cam) {
    this.cam = cam;
    this.parts = []; this.pool = [];
    this.decals = []; this.beams = []; this.texts = []; this.anims = [];
    this.flashes = [];
    initFxTextures();
  }

  // ---------- sound ----------
  sfx(name, x, o = {}) {
    if (x !== undefined && this.cam) {
      const c = this.cam;
      const sx = (x - c.x) * c.z;
      const half = c.vw / 2;
      const pan = clamp(sx / half, -1, 1) * 0.65;
      const off = Math.max(0, Math.abs(sx) - half) / half;
      const vol = (o.vol ?? 1) * clamp(1 - off * 0.8, 0.15, 1);
      Audio.sfx(name, Object.assign({}, o, { pan, vol }));
    } else Audio.sfx(name, o);
  }
  shake(a) { if (this.cam) this.cam.shake(a); }

  p(o) { const q = (this.pool.pop() || new Particle()).set(o); this.parts.push(q); return q; }

  // ---------- generic bursts ----------
  burst(kind, x, y) {
    const R = rand;
    switch (kind) {
      case 'hitspark': for (let i = 0; i < 4; i++) this.p({ x, y, vx: R(-90, 90), vy: R(-110, 20), g: 300, life: 0.25, size: 7, size1: 2, tex: 'spark', color: '#ffe9a8', add: true, rot: R(0, TAU) }); break;
      case 'boltbig': for (let i = 0; i < 8; i++) this.p({ x, y, vx: R(-160, 160), vy: R(-160, 40), g: 300, life: 0.35, size: 9, size1: 2, tex: 'spark', color: '#fff2c0', add: true, rot: R(0, TAU) }); this.p({ x, y, life: 0.18, size: 30, size1: 46, tex: 'glow', color: '#ffe8b0', add: true, a: 0.8 }); break;
      case 'magichit': this.p({ x, y, life: 0.3, size: 14, size1: 44, tex: 'ring', color: '#b88cff', add: true, a: 0.9, sy: 0.7 }); for (let i = 0; i < 6; i++) this.p({ x, y, vx: R(-70, 70), vy: R(-90, 10), life: 0.45, size: 8, size1: 1, tex: 'glow', color: '#c9a2ff', add: true }); break;
      case 'frosthit': this.p({ x, y, life: 0.3, size: 12, size1: 40, tex: 'ring', color: '#9fe4ff', add: true, a: 0.9, sy: 0.7 }); for (let i = 0; i < 6; i++) this.p({ x, y, vx: R(-90, 90), vy: R(-100, 20), g: 280, life: 0.5, size: 7, size1: 3, tex: 'shard', color: '#dff6ff', rot: R(0, TAU), vr: R(-8, 8) }); break;
      case 'emberhit': for (let i = 0; i < 7; i++) this.p({ x, y, vx: R(-80, 80), vy: R(-120, 0), g: 120, life: 0.5, size: 8, size1: 1, tex: 'glow', color: '#ff9a3a', add: true }); break;
      case 'heal': for (let i = 0; i < 5; i++) this.p({ x: x + R(-12, 12), y: y + R(-10, 10), vy: R(-50, -30), life: 0.9, size: 9, tex: 'plus', color: '#7dff6a', delay: i * 0.06 }); break;
      case 'fireshield': this.p({ x, y, life: 0.5, size: 20, size1: 50, tex: 'ring', color: '#ffa040', add: true, sy: 0.8 }); break;
      case 'iceshatter': for (let i = 0; i < 10; i++) this.p({ x, y, vx: R(-120, 120), vy: R(-150, 0), g: 400, life: 0.6, size: 9, size1: 4, tex: 'shard', color: '#d8f4ff', rot: R(0, TAU), vr: R(-10, 10) }); break;
      case 'stomp': case 'quake':
        this.p({ x, y, life: 0.5, size: 30, size1: 150, tex: 'ring', color: '#e8d2a6', a: 0.8, sy: 0.45 });
        for (let i = 0; i < 12; i++) { const a = R(0, TAU); this.p({ x: x + Math.cos(a) * 20, y: y + Math.sin(a) * 10, vx: Math.cos(a) * R(60, 140), vy: Math.sin(a) * R(30, 60) - 20, life: 0.8, size: 22, size1: 40, tex: 'smoke', color: '#c9b48c', a: 0.6, drag: 2 }); }
        if (kind === 'quake') this.decal('crack', x, y);
        break;
      case 'dust': case 'build':
        for (let i = 0; i < (kind === 'build' ? 14 : 7); i++) { const a = R(0, TAU); this.p({ x: x + Math.cos(a) * R(5, 30), y: y + Math.sin(a) * R(3, 12), vx: Math.cos(a) * R(30, 90), vy: R(-50, -10), life: R(0.6, 1.0), size: R(18, 28), size1: R(34, 50), tex: 'smoke', color: '#d8c6a2', a: 0.65, drag: 1.5 }); }
        if (kind === 'build') for (let i = 0; i < 8; i++) this.p({ x, y: y - 20, vx: R(-120, 120), vy: R(-220, -80), g: 600, life: 0.8, size: 6, tex: 'chip', color: '#a4743e', rot: R(0, TAU), vr: R(-12, 12), floor: y + 10 });
        break;
      case 'summon': case 'teleport':
        this.p({ x, y: y - 10, life: 0.6, size: 10, size1: 60, tex: 'ring', color: kind === 'summon' ? '#a050ff' : '#c080ff', add: true, sy: 0.5 });
        for (let i = 0; i < 10; i++) this.p({ x: x + R(-14, 14), y: y + R(-30, 0), vy: R(-80, -30), life: 0.7, size: 8, size1: 1, tex: 'glow', color: '#b070ff', add: true });
        break;
      case 'dirt': for (let i = 0; i < 9; i++) this.p({ x, y, vx: R(-90, 90), vy: R(-180, -60), g: 500, life: 0.7, size: 6, tex: 'chip', color: '#6b4a2a', rot: R(0, TAU), vr: R(-10, 10), floor: y + 6 }); break;
      case 'revive': for (let i = 0; i < 12; i++) this.p({ x: x + R(-16, 16), y: y + R(-6, 6), vy: R(-70, -30), life: 0.9, size: 12, size1: 2, tex: 'glow', color: '#7dffb0', add: true, delay: i * 0.03 }); break;
      case 'devour': for (let i = 0; i < 10; i++) this.p({ x, y: y - 10, vx: R(-100, 100), vy: R(-120, 10), g: 300, life: 0.6, size: 10, size1: 4, tex: 'soft', color: '#3a5a2a', a: 0.9 }); break;
      case 'flameaura': for (let i = 0; i < 10; i++) { const a = R(0, TAU); this.p({ x: x + Math.cos(a) * 100, y: y + Math.sin(a) * 50, vy: R(-60, -20), life: 0.6, size: 18, size1: 4, tex: 'flame', color: '#ffffff', add: true }); } break;
      case 'poof': for (let i = 0; i < 8; i++) { const a = R(0, TAU); this.p({ x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 4, vx: Math.cos(a) * R(30, 70), vy: Math.sin(a) * 30 - 20, life: 0.6, size: 14, size1: 30, tex: 'smoke', color: '#f2efe8', a: 0.9, drag: 2 }); } break;
      case 'spawn': case 'respawn': case 'holy': case 'levelup':
        this.p({ x, y: y - 20, life: 0.6, size: 20, size1: 80, tex: 'glow', color: kind === 'levelup' ? '#ffd860' : '#fff2b0', add: true, a: 0.9 });
        for (let i = 0; i < 12; i++) this.p({ x: x + R(-18, 18), y: y + R(-4, 4), vy: R(-110, -50), life: 0.8, size: 7, size1: 1, tex: 'star4', color: '#ffe680', add: true, rot: R(0, TAU), delay: i * 0.03 });
        if (kind === 'levelup') this.text(tr('fx.levelup'), x, y - 60, '#ffd75a', 22);
        break;
      case 'bash': this.p({ x, y, life: 0.25, size: 10, size1: 40, tex: 'star4', color: '#fff4c0', add: true }); break;
      case 'mark': this.p({ x, y: y - 8, life: 0.8, size: 26, size1: 16, tex: 'ring', color: '#ff4a3a', add: true, a: 0.9, sy: 1 }); break;
      case 'shieldwall': this.p({ x, y: y - 20, life: 0.6, size: 30, size1: 90, tex: 'ring', color: '#7fb4ff', add: true, sy: 0.8 }); this.p({ x, y: y - 20, life: 0.5, size: 40, size1: 70, tex: 'glow', color: '#5a8cff', add: true, a: 0.5 }); break;
      case 'cleave': for (let i = 0; i < 6; i++) this.p({ x: x + R(-20, 20), y: y - 20 + R(-10, 10), vx: R(-60, 60), life: 0.25, size: 26, size1: 10, tex: 'spark', color: '#ffffff', add: true, rot: R(-0.5, 0.5) }); break;
      case 'snare': for (let i = 0; i < 14; i++) { const a = R(0, TAU); this.p({ x: x + Math.cos(a) * R(10, 60), y: y + Math.sin(a) * R(5, 30), vy: -20, life: 1.0, size: 10, size1: 4, tex: 'soft', color: '#5aa83a', a: 0.9 }); } this.decal('vines', x, y); break;
      case 'sigil': this.p({ x, y: y - 2, life: 0.8, size: 20, size1: 40, tex: 'ring', color: '#8ac8ff', add: true, sy: 0.45 }); break;
      case 'dive': for (let i = 0; i < 10; i++) this.p({ x, y: y - 10, vx: R(-120, 120), vy: R(-120, 20), g: 150, life: 0.9, size: 8, tex: 'feather', color: '#f2e2b8', rot: R(0, TAU), vr: R(-6, 6), drag: 1.5 }); this.burst('dust', x, y); break;
      case 'gale': for (let i = 0; i < 16; i++) { const a = R(0, TAU); this.p({ x: x + Math.cos(a) * 20, y: y + Math.sin(a) * 10, vx: Math.cos(a) * 240, vy: Math.sin(a) * 120, life: 0.6, size: 20, size1: 40, tex: 'smoke', color: '#e8f4ff', a: 0.5, drag: 1 }); } break;
      case 'claw': for (let i = 0; i < 3; i++) this.p({ x: x + (i - 1) * 6, y, vx: 40, vy: 60, life: 0.22, size: 24, size1: 18, tex: 'spark', color: '#ffffff', add: true, rot: 1.0 }); break;
      case 'veil': this.p({ x, y: y - 20, life: 0.8, size: 26, size1: 50, tex: 'soft', color: '#c890ff', a: 0.5, add: true }); break;
      case 'phoenix': this.p({ x, y, life: 0.6, size: 30, size1: 230, tex: 'ring', color: '#ff8a30', add: true, sy: 0.5 }); for (let i = 0; i < 24; i++) { const a = R(0, TAU); this.p({ x: x + Math.cos(a) * R(10, 100), y: y + Math.sin(a) * R(5, 50), vy: R(-90, -40), life: 0.8, size: 20, size1: 4, tex: 'flame', color: '#fff', add: true }); } break;
      case 'sell': for (let i = 0; i < 10; i++) this.p({ x, y: y - 30, vx: R(-120, 120), vy: R(-260, -140), g: 700, life: 0.9, size: 11, tex: 'coin', color: '#ffffff', floor: y + 4, rot: 0 }); this.burst('dust', x, y); break;
      case 'skillup': for (let i = 0; i < 14; i++) this.p({ x: x + R(-20, 20), y: y + R(-10, 10), vy: R(-90, -40), life: 0.8, size: 8, size1: 1, tex: 'star4', color: '#ffd860', add: true, delay: i * 0.02 }); break;
      case 'rally': case 'moveflag': this.p({ x, y, life: 0.5, size: 8, size1: 34, tex: 'ring', color: kind === 'rally' ? '#ffe28a' : '#9ef07a', add: true, sy: 0.5, a: 0.9 }); break;
      case 'acid':
        for (let i = 0; i < 12; i++) this.p({ x, y: y - 6, vx: R(-120, 120), vy: R(-200, -60), g: 600, life: 0.6, size: 8, size1: 4, tex: 'soft', color: '#8fe83a', a: 0.95, floor: y + R(-8, 8) });
        this.p({ x, y, life: 0.4, size: 20, size1: 70, tex: 'ring', color: '#9cff4a', a: 0.7, sy: 0.5, add: true });
        break;
      case 'smallboom': this.explosion(x, y, 0.4); break;
      case 'execute': this.p({ x, y, life: 0.6, size: 20, size1: 60, tex: 'glow', color: '#ff3020', add: true }); break;
      case 'ash': for (let i = 0; i < 8; i++) this.p({ x: x + R(-10, 10), y: y + R(-20, 0), vx: R(-40, 40), vy: R(-60, -10), life: R(0.6, 1.1), size: R(10, 16), size1: R(22, 34), tex: 'smoke', color: '#8a837a', a: 0.7, drag: 1.5 }); for (let i = 0; i < 5; i++) this.p({ x, y: y - 10, vx: R(-60, 60), vy: R(-100, -30), life: 0.7, size: 5, size1: 1, tex: 'glow', color: '#ff8a30', add: true }); break;
      case 'bones': for (let i = 0; i < 7; i++) this.p({ x, y: y - 14, vx: R(-110, 110), vy: R(-200, -60), g: 600, life: 0.9, size: 7, tex: 'chip', color: '#eee6d0', rot: R(0, TAU), vr: R(-14, 14), floor: y + R(-4, 6) }); break;
      case 'spirit': for (let i = 0; i < 8; i++) this.p({ x: x + R(-10, 10), y: y + R(-20, 0), vy: R(-80, -30), life: 0.9, size: 14, size1: 2, tex: 'soft', color: '#b8e0ff', add: true, a: 0.8 }); break;
    }
  }

  explosion(x, y, s = 1, type = 'normal') {
    const R = rand;
    const hot = type === 'fire' ? '#ffb040' : type === 'arcane' ? '#c080ff' : '#ffc860';
    this.p({ x, y: y - 10 * s, life: 0.2, size: 50 * s, size1: 110 * s, tex: 'glow', color: '#fff4d0', add: true, a: 1 });
    this.p({ x, y: y - 14 * s, life: 0.45, size: 40 * s, size1: 85 * s, tex: 'glow', color: hot, add: true, a: 0.9 });
    for (let i = 0; i < 8 * s + 4; i++) {
      const a = R(0, TAU), sp = R(40, 140) * s;
      this.p({ x: x + Math.cos(a) * 8 * s, y: y - 12 * s + Math.sin(a) * 6 * s, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - R(20, 60), life: R(0.7, 1.2), size: R(16, 24) * s, size1: R(40, 60) * s, tex: 'smoke', color: type === 'arcane' ? '#5a3a7a' : '#4a4038', a: 0.75, drag: 1.8 });
    }
    for (let i = 0; i < 6 * s + 2; i++) this.p({ x, y: y - 10, vx: R(-200, 200) * s, vy: R(-300, -100) * s, g: 700, life: 0.8, size: 5 * s + 2, tex: 'chip', color: '#3b2f25', rot: R(0, TAU), vr: R(-14, 14), floor: y + R(-6, 8) });
    for (let i = 0; i < 6 * s + 3; i++) this.p({ x, y: y - 10, vx: R(-160, 160) * s, vy: R(-200, -40) * s, g: 300, life: 0.5, size: 6, size1: 1, tex: 'glow', color: hot, add: true });
  }

  trail(x, y, kind) {
    if (kind === 'fire') { this.p({ x, y, vx: rand(-20, 20), vy: rand(-30, 0), life: 0.4, size: 22, size1: 6, tex: 'flame', color: '#fff', add: true }); this.p({ x, y, life: 0.9, size: 14, size1: 34, tex: 'smoke', color: '#5a4a3a', a: 0.5, vy: -20 }); }
    else this.p({ x, y, vx: rand(-10, 10), vy: rand(-20, -5), life: 0.6, size: 7, size1: 18, tex: 'smoke', color: '#d8d0c4', a: 0.6 });
  }

  beam(kind, x1, y1, x2, y2) { this.beams.push({ kind, x1, y1, x2, y2, t: 0, life: kind === 'lightning' ? 0.22 : kind === 'fire' ? 0.3 : 0.5, seed: Math.random() * 1000 }); }
  thunder(x, y) { this.beams.push({ kind: 'thunder', x1: x + rand(-40, 40), y1: y - 700, x2: x, y2: y, t: 0, life: 0.35, seed: Math.random() * 1000 }); this.explosion(x, y, 0.6, 'arcane'); this.decal('scorch', x, y); }
  breath(x, y, dir) {
    for (let i = 0; i < 40; i++) this.p({ x, y, vx: dir * rand(220, 420), vy: rand(-80, 80), life: rand(0.5, 0.9), size: rand(10, 18), size1: rand(30, 50), tex: 'smoke', color: '#dff4ff', a: 0.7, drag: 1.2, delay: i * 0.015 });
    for (let i = 0; i < 20; i++) this.p({ x, y, vx: dir * rand(250, 450), vy: rand(-60, 60), life: 0.6, size: 7, tex: 'shard', color: '#bfeaff', rot: rand(0, TAU), vr: 8, delay: i * 0.02 });
  }

  stuck(kind, x, y, ang) { this.decals.push({ kind: 'arrow', x, y, ang: Math.atan2(Math.sin(ang), Math.cos(ang)), t: 0, life: 3 }); }
  decal(kind, x, y) {
    const life = { scorch: 7, crater: 10, acid: 5, crack: 4, vines: 3, ash: 6 }[kind] || 5;
    this.decals.push({ kind, x, y, t: 0, life, r: rand(0, TAU), s: rand(0.85, 1.15) });
    if (this.decals.length > 90) this.decals.shift();
  }

  text(str, x, y, color = '#fff', size = 18) {
    const label = str === 'miss' ? tr('fx.miss') : str === 'execute' ? tr('fx.execute') : str;
    this.texts.push({ str: label, x, y, t: 0, life: 1.1, color, size });
  }

  kill(e, gold) {
    const d = e.def;
    if (e.flying) this.burst('poof', e.x, e.y - d.fly);
    else if (d.undead) this.burst('bones', e.x, e.y);
    else if (d.death === 'enemy_death_magic') this.burst('spirit', e.x, e.y);
    else this.burst('ash', e.x, e.y);
    if (!e.flying && !d.minor && Math.random() < 0.6) this.decal('ash', e.x, e.y);
  }

  // ---------- update/draw ----------
  update(dt) {
    const P = this.parts;
    let j = 0;
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      if (p.delay > 0) { p.delay -= dt; P[j++] = p; continue; }
      p.t += dt;
      if (p.t >= p.life) { this.pool.push(p); continue; }
      if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
      p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.floor !== undefined && p.y > p.floor) { p.y = p.floor; p.vy *= -0.3; p.vx *= 0.6; p.vr *= 0.5; }
      p.rot += p.vr * dt;
      P[j++] = p;
    }
    P.length = j;
    if (P.length > 900) { for (const p of P.splice(0, P.length - 900)) this.pool.push(p); }
    for (const d of this.decals) d.t += dt;
    this.decals = this.decals.filter(d => d.t < d.life);
    for (const b of this.beams) b.t += dt;
    this.beams = this.beams.filter(b => b.t < b.life);
    for (const t of this.texts) { t.t += dt; t.y -= 28 * dt; }
    this.texts = this.texts.filter(t => t.t < t.life);
  }

  drawGround(ctx) {
    for (const d of this.decals) {
      const a = Math.min(1, (d.life - d.t) / 1.2);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(d.x, d.y);
      switch (d.kind) {
        case 'arrow':
          ctx.rotate(d.ang); ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(2, 0); ctx.stroke();
          ctx.fillStyle = '#e8e0d0'; ctx.fillRect(-12, -2, 4, 4);
          break;
        case 'scorch': case 'crater': {
          ctx.scale(d.s * (d.kind === 'crater' ? 1.5 : 1), d.s * 0.5 * (d.kind === 'crater' ? 1.5 : 1));
          const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 40);
          g.addColorStop(0, 'rgba(20,12,6,0.65)'); g.addColorStop(0.6, 'rgba(30,20,10,0.35)'); g.addColorStop(1, 'rgba(30,20,10,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.fill();
          break;
        }
        case 'acid': {
          ctx.scale(d.s, d.s * 0.5);
          const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 44);
          g.addColorStop(0, 'rgba(140,230,60,0.55)'); g.addColorStop(1, 'rgba(90,180,30,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.fill();
          break;
        }
        case 'ash': {
          ctx.scale(d.s, d.s * 0.45);
          ctx.fillStyle = 'rgba(60,55,50,0.35)'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
          break;
        }
        case 'crack':
          ctx.strokeStyle = 'rgba(40,25,10,0.6)'; ctx.lineWidth = 2.5;
          for (let i = 0; i < 7; i++) { const a = d.r + i * TAU / 7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 40, Math.sin(a) * 20); ctx.lineTo(Math.cos(a + 0.2) * 70, Math.sin(a + 0.2) * 35); ctx.stroke(); }
          break;
        case 'vines':
          ctx.strokeStyle = 'rgba(60,120,30,0.9)'; ctx.lineWidth = 3;
          for (let i = 0; i < 9; i++) { const a = d.r + i * TAU / 9; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 10); ctx.quadraticCurveTo(Math.cos(a + 0.6) * 50, Math.sin(a + 0.6) * 25 - 10, Math.cos(a) * 60, Math.sin(a) * 30); ctx.stroke(); }
          break;
      }
      ctx.restore();
    }
  }

  drawTop(ctx) {
    // beams
    for (const b of this.beams) this.drawBeam(ctx, b);
    // particles: normal first, then additive
    for (let pass = 0; pass < 2; pass++) {
      if (pass === 1) ctx.globalCompositeOperation = 'lighter';
      for (const p of this.parts) {
        if (p.delay > 0 || p.add !== (pass === 1)) continue;
        const u = p.t / p.life;
        const s = p.size + (p.size1 - p.size) * u;
        const a = p.a0 * (u < 0.15 ? u / 0.15 : 1 - Math.max(0, (u - 0.5) / 0.5));
        if (a <= 0.01) continue;
        ctx.globalAlpha = a;
        const tex = p.color === '#ffffff' ? TEX[p.tex] : tinted(p.tex, p.color);
        if (p.rot || p.sy !== 1) {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, p.sy);
          ctx.drawImage(tex, -s / 2, -s / 2, s, s); ctx.restore();
        } else ctx.drawImage(tex, p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const t of this.texts) {
      const a = t.t < 0.8 ? 1 : 1 - (t.t - 0.8) / 0.3;
      drawText(ctx, t.str, t.x, t.y, { size: t.size, align: 'center', color: t.color, stroke: '#2a1606', strokeWidth: 4, alpha: a, weight: 900 });
    }
  }

  drawBeam(ctx, b) {
    const u = b.t / b.life;
    const a = 1 - u;
    ctx.save();
    if (b.kind === 'lightning' || b.kind === 'thunder') {
      ctx.globalCompositeOperation = 'lighter';
      const pts = [];
      const n = b.kind === 'thunder' ? 12 : 7;
      let s = b.seed + Math.floor(b.t * 30);
      const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
      const dx = b.x2 - b.x1, dy = b.y2 - b.y1, L = Math.hypot(dx, dy);
      const nx = -dy / L, ny = dx / L;
      for (let i = 0; i <= n; i++) { const t = i / n; const off = i === 0 || i === n ? 0 : (rnd() - 0.5) * Math.min(40, L * 0.18); pts.push([b.x1 + dx * t + nx * off, b.y1 + dy * t + ny * off]); }
      for (const [w, col] of [[9, `rgba(120,170,255,${0.35 * a})`], [4, `rgba(180,220,255,${0.8 * a})`], [1.8, `rgba(255,255,255,${a})`]]) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      }
    } else {
      const col = b.kind === 'frost' ? [150, 220, 255] : b.kind === 'curse' ? [180, 80, 255] : [255, 140, 40];
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const [w, al] of [[10, 0.25], [4, 0.7], [1.5, 1]]) {
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${al * a})`; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1);
        const mx = (b.x1 + b.x2) / 2, my = (b.y1 + b.y2) / 2 - 30 * Math.sin(u * 3);
        ctx.quadraticCurveTo(mx, my, b.x2, b.y2); ctx.stroke();
      }
    }
    ctx.restore();
  }

  clear() { this.parts.length = 0; this.decals.length = 0; this.beams.length = 0; this.texts.length = 0; }
}
