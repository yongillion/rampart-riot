// Rampart Riot — animated map props and tappable easter eggs (all original gags)
import { Assets, drawFrame } from '../core/assets.js';
import { Audio } from '../core/audio.js';
import { Save } from '../core/save.js';
import { unitFrame } from './renderer.js';
import { rand, TAU } from '../core/util.js';
import { t } from '../core/i18n.js';

class Prop {
  constructor(scene, o) {
    this.s = scene; this.o = o; this.type = o.type;
    this.x = o.x; this.y = o.y; this.t = rand(0, 10); this.taps = 0; this.state = 'idle'; this.st = 0;
    this.r = o.r || 26; this.flip = !!o.flip;
    this.hx = this.x; this.hy = this.y;
  }
  fx() { return this.s.fx; }
  secret(id) {
    const slot = Save.slot; if (!slot) return;
    if (!slot.secrets[id]) {
      slot.secrets[id] = true; slot.stats.secrets = (slot.stats.secrets || 0) + 1; Save.persist();
      Audio.sfx('chime_secret');
      this.s.hud.banner(t('hud.secret'), { color: '#9effa0', life: 2.2 });
    }
  }
  update(dt) {
    this.t += dt; this.st += dt;
    const o = this.o;
    switch (this.type) {
      case 'sheep': {
        if (this.state === 'gone') { if (this.st > 25) { this.state = 'idle'; this.taps = 0; this.st = 0; this.fx().burst('poof', this.x, this.y - 10); } break; }
        if (this.state === 'walk') {
          const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
          if (d < 2) { this.state = 'idle'; this.st = 0; }
          else { this.x += dx / d * 18 * dt; this.y += dy / d * 18 * dt; this.flip = dx < 0; }
        } else if (this.state === 'idle' && this.st > rand(3, 8)) {
          const a = rand(0, TAU), r = rand(10, 50);
          this.tx = this.hx + Math.cos(a) * r; this.ty = this.hy + Math.sin(a) * r * 0.5; this.state = 'walk'; this.st = 0;
        }
        break;
      }
      case 'crows': if (this.state === 'flown' && this.st > 14) { this.state = 'idle'; this.st = 0; } break;
      case 'snowman': if (this.state === 'broken' && this.st > 18) { this.state = 'idle'; this.st = 0; this.taps = 0; } break;
    }
  }
  tap() {
    const fx = this.fx();
    this.taps++; this.st = 0;
    switch (this.type) {
      case 'sheep':
        if (this.state === 'gone') return;
        if (this.taps >= 6) { this.state = 'gone'; Audio.sfx('sheep_pop'); fx.burst('poof', this.x, this.y - 12); fx.burst('poof', this.x + 6, this.y - 18); this.secret('sheep_' + this.s.stageId); if (Save.slot) Save.slot.stats.sheep = (Save.slot.stats.sheep || 0); }
        else { Audio.sfx('sheep', { rate: 1 + this.taps * 0.08 }); this.state = 'idle'; this.bump = 0.3; }
        break;
      case 'windmill': Audio.sfx('windmill'); this.spin = 4; if (this.taps === 10) this.secret('windmill_' + this.s.stageId); break;
      case 'crows': if (this.state !== 'flown') { this.state = 'flown'; Audio.sfx('crow'); for (let i = 0; i < 4; i++) fx.p({ x: this.x + rand(-20, 20), y: this.y - 8, vx: rand(-120, 120), vy: rand(-220, -140), life: 1.6, size: 10, tex: 'feather', color: '#2a2a30', rot: rand(0, TAU), vr: 3 }); } break;
      case 'frog': Audio.sfx('frog'); this.bump = 0.45; if (this.taps === 7) { this.secret('frog_' + this.s.stageId); fx.burst('poof', this.x, this.y - 10); } break;
      case 'snowman': if (this.state !== 'broken') { Audio.sfx('snowman'); this.bump = 0.3; if (this.taps >= 3) { this.state = 'broken'; fx.burst('poof', this.x, this.y - 30); if (this.taps === 3) this.secret('snowman_' + this.s.stageId); } } break;
      case 'bell': Audio.sfx('bell_toll'); this.bump = 1; if (this.taps === 12) this.secret('bell_' + this.s.stageId); break;
      case 'fish': Audio.sfx('fish_splash'); fx.burst('acid', this.x, this.y); this.bump = 0.8; break;
      case 'lava': Audio.sfx('lava_burst'); fx.explosion(this.x, this.y, 0.5, 'fire'); if (this.taps === 9) this.secret('lava_' + this.s.stageId); break;
      case 'chicken': Audio.sfx('chicken'); this.bump = 0.4; for (let i = 0; i < 3; i++) fx.p({ x: this.x, y: this.y - 10, vx: rand(-60, 60), vy: rand(-90, -40), g: 120, life: 1, size: 7, tex: 'feather', color: '#f4efe4', rot: rand(0, TAU), vr: 4 }); break;
      case 'statue': Audio.sfx('ui_tick'); if (this.taps === 5) { this.secret(this.o.secret || ('statue_' + this.s.stageId)); fx.burst('levelup', this.x, this.y); } break;
      default: Audio.sfx('ui_tick');
    }
  }
  hit(x, y) { return this.state !== 'gone' && Math.abs(x - this.x) < this.r && y > this.y - this.r * 1.8 && y < this.y + 10; }
  draw(ctx, time) {
    const b = this.bump > 0 ? (this.bump -= 1 / 60, Math.sin(this.bump * 20) * 0.08) : 0;
    const name = 'prop_' + this.type;
    let anim = 'idle', t = this.t;
    if (this.type === 'sheep') { if (this.state === 'gone') return; anim = this.state === 'walk' ? 'walk' : 'idle'; }
    if (this.type === 'windmill') { this.spin = Math.max(1, (this.spin || 1) - 1 / 60); this.ang = (this.ang || 0) + this.spin / 60; t = this.ang; }
    if (this.type === 'crows' && this.state === 'flown') return;
    if (this.type === 'snowman' && this.state === 'broken') anim = 'broken';
    const f = unitFrame(name, anim, t);
    ctx.save(); ctx.translate(this.x, this.y); ctx.scale((this.flip ? -1 : 1) * (1 + b), 1 - b);
    if (f) drawFrame(ctx, f, 0, 0);
    else this.fallback(ctx);
    ctx.restore();
  }
  fallback(ctx) {
    ctx.lineWidth = 2; ctx.strokeStyle = '#1d130c';
    switch (this.type) {
      case 'sheep': ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.ellipse(0, -10, 13, 9, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#2a2420'; ctx.beginPath(); ctx.ellipse(12, -13, 5, 4, 0, 0, TAU); ctx.fill(); break;
      case 'windmill': ctx.fillStyle = '#c8b090'; ctx.fillRect(-12, -60, 24, 60); ctx.strokeRect(-12, -60, 24, 60); ctx.save(); ctx.translate(0, -58); ctx.rotate(this.ang || 0); ctx.fillStyle = '#efe6d0'; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillRect(0, -4, 40, 8); } ctx.restore(); break;
      default: ctx.fillStyle = '#8a7a6a'; ctx.beginPath(); ctx.arc(0, -10, 10, 0, TAU); ctx.fill(); ctx.stroke();
    }
  }
}

export class MapProps {
  constructor(scene, level) {
    this.s = scene;
    this.list = (level.props || []).map(o => new Prop(scene, o));
  }
  update(dt) { for (const p of this.list) p.update(dt); }
  hit(x, y) { for (const p of this.list) if (p.hit(x, y)) return p; return null; }
}
