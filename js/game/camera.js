// Rampart Riot — battlefield camera: fit, pan, pinch/wheel zoom, shake
import { clamp } from '../core/util.js';
import { FIELD } from './battle.js';

export class Camera {
  constructor() {
    this.x = FIELD.w / 2; this.y = FIELD.h / 2; this.z = 1;
    this.vw = 1280; this.vh = 720;
    this.minZ = 0.5; this.maxZ = 2; this.baseZ = 1;
    this.shakeAmt = 0; this.sx = 0; this.sy = 0;
    this.vx = 0; this.vy = 0; // pan inertia (screen px/s)
    this.topInset = 0; this.botInset = 0;
  }
  fit(vw, vh, keep = false) {
    const oldBase = this.baseZ, rel = this.z / (oldBase || 1);
    this.vw = vw; this.vh = vh;
    const zContain = Math.min(vw / FIELD.pw, vh / FIELD.ph);
    const zCover = Math.max(vw / FIELD.w, vh / FIELD.h);
    this.minZ = zCover;
    this.baseZ = Math.max(zContain, zCover);
    this.maxZ = this.baseZ * 2.6;
    this.z = keep ? clamp(this.baseZ * rel, this.minZ, this.maxZ) : this.baseZ;
    if (!keep) { this.x = FIELD.w / 2; this.y = FIELD.h / 2; }
    this.clampPos();
  }
  clampPos() {
    const hw = this.vw / 2 / this.z, hh = this.vh / 2 / this.z;
    this.x = hw * 2 >= FIELD.w ? FIELD.w / 2 : clamp(this.x, hw, FIELD.w - hw);
    this.y = hh * 2 >= FIELD.h ? FIELD.h / 2 : clamp(this.y, hh, FIELD.h - hh);
  }
  toWorld(sx, sy) { return { x: this.x + (sx - this.vw / 2) / this.z, y: this.y + (sy - this.vh / 2) / this.z }; }
  toScreen(wx, wy) { return { x: (wx - this.x) * this.z + this.vw / 2, y: (wy - this.y) * this.z + this.vh / 2 }; }
  pan(dx, dy) { this.x -= dx / this.z; this.y -= dy / this.z; this.clampPos(); }
  zoomAt(f, sx, sy) {
    const before = this.toWorld(sx, sy);
    this.z = clamp(this.z * f, this.minZ, this.maxZ);
    const after = this.toWorld(sx, sy);
    this.x += before.x - after.x; this.y += before.y - after.y;
    this.clampPos();
  }
  shake(a) { this.shakeAmt = Math.min(18, Math.max(this.shakeAmt, a)); }
  update(dt) {
    if (this.shakeAmt > 0.05) {
      this.shakeAmt *= Math.pow(0.0025, dt);
      this.sx = (Math.random() - 0.5) * 2 * this.shakeAmt; this.sy = (Math.random() - 0.5) * 2 * this.shakeAmt;
    } else { this.shakeAmt = 0; this.sx = 0; this.sy = 0; }
    if (Math.abs(this.vx) > 4 || Math.abs(this.vy) > 4) {
      this.pan(this.vx * dt, this.vy * dt);
      const k = Math.pow(0.004, dt);
      this.vx *= k; this.vy *= k;
    } else { this.vx = 0; this.vy = 0; }
  }
  apply(ctx, dpr) {
    const z = this.z * dpr;
    ctx.setTransform(z, 0, 0, z, (this.vw / 2 - this.x * this.z + this.sx) * dpr, (this.vh / 2 - this.y * this.z + this.sy) * dpr);
  }
  // visible world rect
  view() { const hw = this.vw / 2 / this.z, hh = this.vh / 2 / this.z; return { x0: this.x - hw, y0: this.y - hh, x1: this.x + hw, y1: this.y + hh }; }
}
