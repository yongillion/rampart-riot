// Rampart Riot — battlefield renderer (map, plots, towers, units, projectiles, overlays)
import { Assets, drawFrame } from '../core/assets.js';
import { HD } from '../core/hd.js';
import { RANGE_Y_SCALE, TAU, clamp } from '../core/util.js';
import { FIELD } from './battle.js';
import { text } from '../render/draw.js';

const ANIM_FALLBACK = {
  special: ['special', 'attack', 'idle', 'walk'],
  attack: ['attack', 'idle', 'walk'],
  idle: ['idle', 'walk'],
  walk: ['walk', 'idle'],
  death: ['death'],
  burrow: ['burrow', 'walk'],
  emerge: ['emerge', 'idle', 'walk'],
  shoot: ['shoot', 'attack', 'idle'],
  fire: ['fire', 'idle'],
};

export function unitFrame(sprite, anim, t) {
  const chain = ANIM_FALLBACK[anim] || [anim, 'idle', 'walk'];
  for (const a of chain) {
    const an = Assets.anim(sprite + '/' + a);
    if (an) {
      const n = an.frames.length;
      let i = Math.floor(t * an.fps);
      i = an.loop ? ((i % n) + n) % n : Math.min(n - 1, Math.max(0, i));
      return an.frames[i];
    }
  }
  return Assets.frame(sprite);
}

const PROJ = { arrow: 'p_arrow', heroArrow: 'p_arrow', bolt: 'p_bolt', ebolt: 'p_bolt', earrow: 'p_arrow', javelin: 'p_javelin', stone: 'p_stone', orb: 'p_orb', frostorb: 'p_frostorb', starbolt: 'p_starbolt', firebolt: 'p_firebolt', ember: 'p_ember', bomb: 'p_bomb', flask: 'p_flask', keg: 'p_keg', rocket: 'p_rocket', minirocket: 'p_minirocket', meteor: 'p_meteor', cannonball: 'p_cannonball', piercebolt: 'p_piercebolt' };

export class BattleRenderer {
  constructor(battle, cam, fx) {
    this.b = battle; this.cam = cam; this.fx = fx;
    this.map = null;
    this.time = 0;
    this.list = [];
    this.sel = null;       // selection info from scene: {kind:'plot'|'tower'|'hero'|'enemy', obj, preview}
    this.props = [];       // animated map props
  }

  setMap(img) { this.map = img; }

  render(ctx, dpr, dt) {
    this.time += dt;
    const b = this.b, cam = this.cam;
    cam.apply(ctx, dpr);
    const v = cam.view();
    // ----- map -----
    if (this.map) {
      // HD copy of the painted map (js/core/hd.js) once it would be stretched: HiDPI screens, zooming in
      if (this.mapUrl) { const best = HD.image(this.mapUrl, HD.needed(this.map.width / FIELD.w, HD.px(ctx))); if (best && best !== this.map) this.map = best; }
      const sx = Math.max(0, v.x0 - 2), sy = Math.max(0, v.y0 - 2);
      const sw = Math.min(FIELD.w, v.x1 + 2) - sx, sh = Math.min(FIELD.h, v.y1 + 2) - sy;
      const kx = this.map.width / FIELD.w, ky = this.map.height / FIELD.h;
      ctx.drawImage(this.map, sx * kx, sy * ky, sw * kx, sh * ky, sx, sy, sw, sh);
    } else this.fallbackMap(ctx);
    // ----- ground layer -----
    this.drawZones(ctx);
    this.fx.drawGround(ctx);
    this.drawPlots(ctx);
    this.drawSelectionUnder(ctx);
    // shadows
    ctx.fillStyle = 'rgba(0,0,0,0.26)';
    for (const e of b.enemies) if (!e.removed && !(e.dead && e.deathT > 1) && !e.burrowed) this.shadow(ctx, e.x, e.y, e.size * (e.flying ? 0.9 : 1.15), e.flying ? 0.16 : 0.26);
    for (const s of b.soldiers) if (!s.removed && !(s.dead && s.tower)) this.shadow(ctx, s.x, s.y, s.size * (s.flying ? 1.4 : 1.15), s.flying ? 0.14 : 0.26);
    // ----- sorted actors -----
    const L = this.list; L.length = 0;
    for (const t of b.towers) L.push(t);
    for (const e of b.enemies) if (!e.removed && !e.flying) L.push(e);
    for (const s of b.soldiers) if (!s.removed && !s.flying && !(s.dead && (s.tower || s.isHero) && s.deathT > 1.2)) L.push(s);
    for (const tu of b.turrets) L.push(tu);
    for (const p of this.props) L.push(p);
    L.sort((a, c) => a.y - c.y);
    for (const o of L) this.drawActor(ctx, o);
    // rally flags
    this.drawRally(ctx);
    // flyers
    for (const e of b.enemies) if (!e.removed && e.flying) this.drawEnemy(ctx, e);
    for (const s of b.soldiers) if (!s.removed && s.flying) this.drawSoldier(ctx, s);
    // projectiles
    for (const p of b.projectiles) this.drawProjectile(ctx, p);
    this.fx.drawTop(ctx);
    // hp bars
    for (const e of b.enemies) if (!e.dead && !e.removed && !e.burrowed && e.reviving === undefined || (e.reviving !== undefined && e.reviving <= 0 && !e.dead && !e.removed)) this.hpBar(ctx, e.x, e.y - (e.flying ? e.def.fly : 0) - e.def.h - 6, e.hp / e.maxHp, e.def.big || e.def.boss ? 30 : 22, e.absorb > 0, e.elite);
    for (const s of b.soldiers) if (!s.dead && !s.removed && (s.hp < s.maxHp || s.isHero)) this.hpBar(ctx, s.x, s.y - (s.flying ? 70 : 0) - (s.isHero ? 52 : 44), s.hp / s.maxHp, s.isHero ? 26 : 18, s.absorb > 0, false, true);
    this.drawSelectionTop(ctx);
  }

  shadow(ctx, x, y, r, a) {
    ctx.globalAlpha = a / 0.26;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.42, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }

  fallbackMap(ctx) {
    ctx.fillStyle = '#5f7f3e'; ctx.fillRect(0, 0, FIELD.w, FIELD.h);
    ctx.strokeStyle = '#b8955c'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const p of this.b.paths) {
      ctx.lineWidth = 84; ctx.strokeStyle = '#8f6f3e'; ctx.beginPath();
      for (let i = 0; i < p.n; i += 3) (i ? ctx.lineTo(p.xs[i], p.ys[i]) : ctx.moveTo(p.xs[i], p.ys[i])); ctx.stroke();
      ctx.lineWidth = 72; ctx.strokeStyle = '#c4a46a'; ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 3; ctx.strokeRect(FIELD.px, FIELD.py, FIELD.pw, FIELD.ph);
  }

  drawPlots(ctx) {
    const f = Assets.frame('plot');
    const sel = this.sel;
    for (const p of this.b.plots) {
      if (p.tower) continue;
      const hl = sel && sel.kind === 'plot' && sel.obj === p;
      if (f) drawFrame(ctx, f, p.x, p.y);
      else { ctx.fillStyle = '#7a6040'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 44, 20, 0, 0, TAU); ctx.fill(); }
      if (hl) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + 0.15 * Math.sin(this.time * 6);
        ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 46, 22, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
    }
  }

  rangeEllipse(ctx, x, y, r, col, fill) {
    ctx.beginPath(); ctx.ellipse(x, y, r, r * RANGE_Y_SCALE, 0, 0, TAU);
    ctx.fillStyle = fill; ctx.fill();
    ctx.setLineDash([10, 8]); ctx.lineDashOffset = -this.time * 20;
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke(); ctx.setLineDash([]);
  }

  drawSelectionUnder(ctx) {
    const s = this.sel; if (!s) return;
    if (s.kind === 'tower' && s.obj) {
      const t = s.obj;
      if (s.rallyMode) this.rangeEllipse(ctx, t.x, t.y, t.range, 'rgba(255,230,140,0.9)', 'rgba(255,220,120,0.12)');
      else if (t.line !== 'barracks') this.rangeEllipse(ctx, t.x, t.y, s.previewRange || t.range, 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0.08)');
    }
    if (s.kind === 'plot' && s.previewRange) this.rangeEllipse(ctx, s.obj.x, s.obj.y, s.previewRange, 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0.08)');
    if (s.kind === 'hero' && s.obj && !s.obj.dead) {
      const h = s.obj;
      ctx.save(); ctx.strokeStyle = 'rgba(140,240,110,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(h.x, h.y, 22, 10, 0, 0, TAU); ctx.stroke(); ctx.restore();
    }
  }
  drawSelectionTop(ctx) {
    const s = this.sel; if (!s) return;
    if (s.kind === 'enemy' && s.obj && !s.obj.dead) {
      const e = s.obj;
      ctx.save(); ctx.strokeStyle = 'rgba(255,90,70,0.95)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.size * 1.6, e.size * 0.7, 0, 0, TAU); ctx.stroke(); ctx.restore();
    }
    if (s.cursor) {
      const c = s.cursor;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = c.ok ? '#ffe28a' : '#ff6a5a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r, c.r * 0.5, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = c.ok ? 'rgba(255,220,120,0.15)' : 'rgba(255,90,70,0.15)'; ctx.fill();
      ctx.restore();
    }
  }

  drawRally(ctx) {
    const s = this.sel;
    if (!s || s.kind !== 'tower' || !s.obj || s.obj.line !== 'barracks') return;
    const r = s.obj.rally;
    const f = Assets.frame('flag_rally');
    if (f) drawFrame(ctx, f, r.x, r.y);
    else { ctx.fillStyle = '#c33'; ctx.fillRect(r.x, r.y - 30, 14, 10); ctx.fillStyle = '#542'; ctx.fillRect(r.x - 1, r.y - 30, 3, 30); }
  }

  drawActor(ctx, o) {
    if (o.def && o.path) this.drawEnemy(ctx, o);
    else if (o.plot) this.drawTower(ctx, o);
    else if (o.maxLife !== undefined) this.drawTurret(ctx, o);
    else if (o.draw) o.draw(ctx, this.time);
    else this.drawSoldier(ctx, o);
  }

  drawEnemy(ctx, e) {
    const def = e.def;
    let y = e.y;
    let alpha = 1;
    if (e.dead) alpha = clamp(1 - (e.deathT - (def.boss ? 2.5 : 0.9)) / 0.6, 0, 1);
    if (alpha <= 0) return;
    if (e.flying) y -= def.fly + Math.sin(this.time * 3 + e.bob) * 4;
    if (e.burrowed && e.burrowT < 0.45 && Assets.anim('e_' + e.type + '/burrow')) {
      const f = unitFrame('e_' + e.type, 'burrow', e.burrowT);
      if (f) drawFrame(ctx, f, e.x, e.y, e.facing < 0);
      return;
    }
    if (e.burrowed) {
      const f = unitFrame('fx_mound', 'walk', e.animT);
      if (f) drawFrame(ctx, f, e.x, e.y, e.facing < 0);
      else { ctx.fillStyle = '#5a3f22'; ctx.beginPath(); ctx.ellipse(e.x, e.y, 16, 7, 0, Math.PI, 0); ctx.fill(); }
      return;
    }
    if (alpha < 1) ctx.globalAlpha = alpha;
    if (e.sheep > 0 && !e.dead) {
      const f = unitFrame('sheep', 'walk', e.animT);
      if (f) drawFrame(ctx, f, e.x, y, e.facing < 0);
      else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x, y - 10, 10, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1; return;
    }
    if (e.elite && !e.dead) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.1 * Math.sin(this.time * 5); ctx.fillStyle = '#ff3a20'; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.size * 1.5, e.size * 0.6, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    let t = e.animT;
    if (e.freeze > 0 || e.stun > 0) t = 0.1;
    const an = e.dead ? 'death' : e.anim;
    // multi-phase bosses may provide per-phase anims ("walk2", "attack3", ...)
    const pa = e.phase > 1 ? Assets.anim('e_' + e.type + '/' + an + e.phase) : null;
    const f = pa ? pa.frames[pa.loop ? Math.floor(t * pa.fps) % pa.frames.length : Math.min(pa.frames.length - 1, Math.floor(t * pa.fps))] : unitFrame('e_' + e.type, an, t);
    if (f) drawFrame(ctx, f, e.x, y, e.facing < 0);
    else this.placeholder(ctx, e.x, y, e.size, def.h, e.dead ? '#555' : def.boss ? '#a02020' : def.flying ? '#c080ff' : '#7a8a5a');
    ctx.globalAlpha = 1;
    if (e.dead) return;
    // status overlays
    if (e.freeze > 0) {
      const fi = Assets.frame('fx_iceblock');
      if (fi) drawFrame(ctx, fi, e.x, e.y, false, Math.max(0.8, def.h / 40));
      else { ctx.fillStyle = 'rgba(170,230,255,0.55)'; ctx.fillRect(e.x - e.size * 1.2, y - def.h, e.size * 2.4, def.h); }
    }
    if (e.stun > 0) this.stars(ctx, e.x, y - def.h - 2);
    if (e.slows.length && e.freeze <= 0) { ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#8fd8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.size * 1.3, e.size * 0.5, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
    if (e.burns.length && Math.random() < 0.35) this.fx.p({ x: e.x + (Math.random() - 0.5) * e.size * 1.4, y: y - Math.random() * def.h * 0.8, vy: -40, life: 0.45, size: 14, size1: 3, tex: 'flame', color: e.burns.some(b => b.kind === 'ground') ? '#ffffff' : '#ffffff', add: true });
    if (e.shredT > 0 && Math.random() < 0.15) this.fx.p({ x: e.x + (Math.random() - 0.5) * e.size, y: y - Math.random() * def.h * 0.6, vy: -25, life: 0.6, size: 6, size1: 2, tex: 'soft', color: '#9cff4a', a: 0.8 });
    if (e.mark) { ctx.save(); ctx.strokeStyle = '#ff4030'; ctx.lineWidth = 2; ctx.globalAlpha = 0.85; const yy = y - def.h - 16; ctx.beginPath(); ctx.arc(e.x, yy, 6, 0, TAU); ctx.moveTo(e.x - 9, yy); ctx.lineTo(e.x + 9, yy); ctx.moveTo(e.x, yy - 9); ctx.lineTo(e.x, yy + 9); ctx.stroke(); ctx.restore(); }
    if (e.absorb > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25; ctx.fillStyle = '#ff9a30'; ctx.beginPath(); ctx.ellipse(e.x, y - def.h * 0.5, e.size * 1.6, def.h * 0.62, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    if (e.spawnFlash > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = e.spawnFlash; ctx.fillStyle = '#c070ff'; ctx.beginPath(); ctx.ellipse(e.x, y - def.h * 0.5, e.size * 1.5, def.h * 0.6, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  }

  drawSoldier(ctx, s) {
    let y = s.y;
    let alpha = 1;
    if (s.dead) alpha = clamp(1 - (s.deathT - 0.7) / 0.5, 0, 1);
    if (s.life > 0 && s.life < 1.5) alpha *= 0.5 + 0.5 * Math.abs(Math.sin(this.time * 10));
    if (alpha <= 0) return;
    if (s.flying) y -= 66 + Math.sin(this.time * 2.4) * 5;
    ctx.globalAlpha = alpha;
    const sprite = s.isHero ? 'h_' + s.heroId : 's_' + s.sprite;
    const f = unitFrame(sprite, s.dead ? 'death' : s.anim, s.animT);
    if (f) drawFrame(ctx, f, s.x, y, s.facing < 0);
    else this.placeholder(ctx, s.x, y, s.size, s.isHero ? 48 : 40, s.isHero ? '#3a6fc4' : '#c4c4c4');
    ctx.globalAlpha = 1;
    if (s.dead) return;
    if (s.stun > 0) {
      if (s.frozen > 0) { const fi = Assets.frame('fx_iceblock'); if (fi) drawFrame(ctx, fi, s.x, s.y, false, 1); }
      else this.stars(ctx, s.x, y - 46);
    }
    if (s.absorb > 0 || s.immune > 0 || s.dr > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.22 + 0.06 * Math.sin(this.time * 6);
      ctx.fillStyle = s.immune > 0 ? '#ffe680' : s.dr > 0 ? '#6a9cff' : '#7ac8ff';
      ctx.beginPath(); ctx.ellipse(s.x, y - 22, 20, 28, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
  }

  drawTurret(ctx, tu) {
    const firing = tu.shotT < 0.3;
    const f = unitFrame('turret', firing ? 'fire' : 'idle', firing ? tu.shotT : this.time);
    const a = tu.life < 1.5 ? 0.5 + 0.5 * Math.abs(Math.sin(this.time * 10)) : 1;
    ctx.globalAlpha = a;
    if (f) drawFrame(ctx, f, tu.x, tu.y, tu.aimX < tu.x);
    else this.placeholder(ctx, tu.x, tu.y, 12, 26, '#8a6a3a');
    ctx.globalAlpha = 1;
  }

  drawTower(ctx, t) {
    const id = t.id;
    if (t.buildT > 0) {
      const f = unitFrame('t_build', 'idle', 0.7 - t.buildT);
      if (f) drawFrame(ctx, f, t.x, t.y);
      else this.placeholder(ctx, t.x, t.y, 30, 50, '#a08060');
      return;
    }
    const firing = t.shotT < 0.55;
    let f = null;
    if (t.line === 'artillery' || t.line === 'mage') f = unitFrame('t_' + id, firing ? 'fire' : 'idle', firing ? t.shotT : this.time + t.uid);
    else f = Assets.frame('t_' + id) || unitFrame('t_' + id, 'idle', this.time);
    if (f) drawFrame(ctx, f, t.x, t.y);
    else this.placeholder(ctx, t.x, t.y, 34, t.top + 20, { archer: '#4f7a37', barracks: '#9a4a2a', mage: '#6a4ab8', artillery: '#6a6a6a' }[t.line]);
    // crew on top
    if (t.line === 'archer') {
      const facingLeft = t.aimX < t.x;
      if (t.spec === 'arbalest') {
        const fu = unitFrame('u_arbalest', t.shotT < 0.4 ? 'fire' : 'idle', t.shotT < 0.4 ? t.shotT : this.time);
        if (fu) drawFrame(ctx, fu, t.x, t.y - t.top + 6, facingLeft);
      } else {
        const sp = t.spec === 'gale' ? 'u_gale' : 'u_archer';
        for (let i = 0; i < 2; i++) {
          const shooting = t.shooter === i && t.shotT < 0.45;
          const fu = unitFrame(sp, shooting ? 'shoot' : 'idle', shooting ? t.shotT : this.time + i * 0.4);
          const ox = (i ? 13 : -13);
          if (fu) drawFrame(ctx, fu, t.x + ox, t.y - t.top + 8, facingLeft);
        }
      }
    }
    const ff = Assets.frame('t_' + id + '_front');
    if (ff) drawFrame(ctx, ff, t.x, t.y);
    if (t.disabled > 0) {
      const ov = Assets.frame(t.disabledKind === 'ice' ? 'fx_towerice' : 'fx_towercurse') || null;
      if (ov) drawFrame(ctx, ov, t.x, t.y);
      else { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = t.disabledKind === 'ice' ? '#bfeaff' : '#8a40c0'; ctx.beginPath(); ctx.ellipse(t.x, t.y - 40, 46, 60, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    }
    // skill-level pips for level 4
    if (t.level === 4 && this.sel && this.sel.obj === t) { /* drawn by menu */ }
  }

  drawProjectile(ctx, p) {
    if (p.t < 0) return;
    const name = PROJ[p.kind];
    const f = Assets.frame(name) || unitFrame(name, 'idle', p.t);
    if (p.mode === 'ballistic' && p.gx !== undefined) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(p.gx, p.gy, 7, 3, 0, 0, TAU); ctx.fill();
    }
    if (f) {
      ctx.save(); ctx.translate(p.x, p.y);
      const rotating = p.kind === 'bomb' || p.kind === 'keg' || p.kind === 'flask' || p.kind === 'stone';
      ctx.rotate(rotating ? (p.rot || 0) : p.ang);
      drawFrame(ctx, f, 0, 0, false, p.kind === 'meteor' ? 1.8 : p.kind === 'rocket' ? 1.1 : 1);
      ctx.restore();
      if (p.kind === 'orb' || p.kind === 'frostorb' || p.kind === 'starbolt' || p.kind === 'firebolt' || p.kind === 'ember') {
        if (Math.random() < 0.6) this.fx.p({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, life: 0.3, size: 9, size1: 1, tex: 'glow', color: p.kind === 'frostorb' ? '#9fe4ff' : p.kind === 'orb' ? '#c09aff' : p.kind === 'starbolt' ? '#d8e8ff' : '#ff9a3a', add: true });
      }
    } else {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
      ctx.fillStyle = p.kind === 'meteor' ? '#ff7a20' : p.mode === 'ballistic' ? '#333' : '#fff';
      if (p.kind === 'arrow' || p.kind === 'bolt') ctx.fillRect(-10, -1, 20, 2);
      else { ctx.beginPath(); ctx.arc(0, 0, p.kind === 'meteor' ? 16 : 5, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }

  drawZones(ctx) {
    for (const z of this.b.zones) {
      const a = Math.min(1, z.t * 4) * Math.min(1, (z.dur - z.t) * 2);
      if (a <= 0) continue;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(z.x, z.y);
      if (z.kind === 'blizzard') {
        const g = ctx.createRadialGradient(0, 0, 4, 0, 0, z.r);
        g.addColorStop(0, 'rgba(220,245,255,0.45)'); g.addColorStop(1, 'rgba(160,220,255,0)');
        ctx.scale(1, 0.55); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, z.r, 0, TAU); ctx.fill();
        if (Math.random() < 0.8) this.fx.p({ x: z.x + (Math.random() - 0.5) * z.r * 2, y: z.y - 60 + Math.random() * 30, vx: 60, vy: 90, life: 0.8, size: 5, tex: 'glow', color: '#ffffff', a: 0.9 });
      } else if (z.kind === 'acid') {
        const g = ctx.createRadialGradient(0, 0, 4, 0, 0, z.r);
        g.addColorStop(0, 'rgba(140,230,60,0.55)'); g.addColorStop(0.8, 'rgba(110,200,40,0.35)'); g.addColorStop(1, 'rgba(90,160,30,0)');
        ctx.scale(1, 0.5); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, z.r, 0, TAU); ctx.fill();
        if (Math.random() < 0.3) this.fx.p({ x: z.x + (Math.random() - 0.5) * z.r * 1.4, y: z.y + (Math.random() - 0.5) * z.r * 0.6, vy: -20, life: 0.6, size: 6, size1: 12, tex: 'ring', color: '#b8ff6a', a: 0.7, sy: 0.6 });
      } else if (z.kind === 'fire') {
        if (Math.random() < 0.7) this.fx.p({ x: z.x + (Math.random() - 0.5) * z.r * 1.6, y: z.y + (Math.random() - 0.5) * z.r * 0.6, vy: -50, life: 0.5, size: 20, size1: 4, tex: 'flame', color: '#ffffff', add: true });
        const g = ctx.createRadialGradient(0, 0, 4, 0, 0, z.r);
        g.addColorStop(0, 'rgba(255,120,30,0.35)'); g.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.scale(1, 0.5); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, z.r, 0, TAU); ctx.fill();
      } else if (z.kind === 'plague') {
        const g = ctx.createRadialGradient(0, -10, 4, 0, -10, z.r);
        g.addColorStop(0, 'rgba(120,170,40,0.45)'); g.addColorStop(1, 'rgba(90,130,30,0)');
        ctx.scale(1, 0.6); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -10, z.r, 0, TAU); ctx.fill();
        if (Math.random() < 0.4) this.fx.p({ x: z.x + (Math.random() - 0.5) * z.r, y: z.y - Math.random() * 20, vy: -15, life: 1, size: 14, size1: 30, tex: 'smoke', color: '#8aa83a', a: 0.4 });
      } else if (z.kind === 'arrowstorm') {
        if (Math.random() < 0.9) this.fx.p({ x: z.x + (Math.random() - 0.5) * z.r * 2 - 40, y: z.y - 220, vx: 90, vy: 520, life: 0.4, size: 16, size1: 12, tex: 'spark', color: '#f2e2b8', rot: 1.4, a: 0.9 });
      } else if (z.kind === 'starfall') {
        if (!z.done && Math.random() < 0.9) this.fx.p({ x: z.x + (Math.random() - 0.5) * z.r * 1.4 - 60, y: z.y - 260, vx: 260, vy: 480, life: 0.45, size: 14, size1: 6, tex: 'star4', color: '#cfe0ff', add: true });
      }
      ctx.restore();
    }
  }

  stars(ctx, x, y) {
    for (let i = 0; i < 3; i++) {
      const a = this.time * 5 + i * TAU / 3;
      const sx = x + Math.cos(a) * 11, sy = y + Math.sin(a) * 4;
      ctx.fillStyle = '#ffe45a'; ctx.strokeStyle = '#5a3a00'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) { const r = k % 2 ? 2 : 4.6, an = -Math.PI / 2 + k * Math.PI / 5; ctx.lineTo(sx + Math.cos(an) * r, sy + Math.sin(an) * r); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }

  hpBar(ctx, x, y, frac, w, shield, elite, ally) {
    const h = 4;
    ctx.fillStyle = '#140a04'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#7a1408'; ctx.fillRect(x - w / 2, y, w, h);
    ctx.fillStyle = ally ? '#7ce05a' : elite ? '#ff8a3a' : '#5ccf3c';
    ctx.fillRect(x - w / 2, y, w * clamp(frac, 0, 1), h);
    if (shield) { ctx.fillStyle = 'rgba(255,200,90,0.85)'; ctx.fillRect(x - w / 2, y - 3, w, 2); }
  }

  placeholder(ctx, x, y, r, h, col) {
    ctx.fillStyle = col; ctx.strokeStyle = '#1d130c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y - h / 2, r, h / 2, 0, 0, TAU); ctx.fill(); ctx.stroke();
  }
}
