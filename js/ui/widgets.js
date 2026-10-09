// Rampart Riot — minimal retained-mode UI: hit-testing, press states, tap dispatch.
import { Audio } from '../core/audio.js';
import { button, circleButton, text } from '../render/draw.js';

export class UI {
  constructor() {
    this.items = [];
    this.pressed = null;
    this.hover = null;
    this.modal = null; // when set, only items with same layer as modal receive input
  }
  clear() { this.items.length = 0; this.pressed = null; this.hover = null; }
  add(it) {
    it.visible = it.visible ?? true;
    it.enabled = it.enabled ?? true;
    it.layer = it.layer ?? 0;
    this.items.push(it);
    return it;
  }
  remove(it) { const i = this.items.indexOf(it); if (i >= 0) this.items.splice(i, 1); }
  removeLayer(layer) { this.items = this.items.filter(i => i.layer !== layer); }

  contains(it, x, y) {
    if (it.hitTest) return it.hitTest(x, y);
    if (it.r) { const dx = x - it.x, dy = y - it.y; return dx * dx + dy * dy <= (it.r * 1.08) * (it.r * 1.08); }
    const pad = it.pad ?? 4;
    return x >= it.x - pad && x <= it.x + it.w + pad && y >= it.y - pad && y <= it.y + it.h + pad;
  }
  hit(x, y) {
    let top = -Infinity;
    for (const it of this.items) if (it.visible && it.layer > top) top = it.layer;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (!it.visible) continue;
      if (this.modal !== null && it.layer < this.modal) continue;
      if (it.passive) continue;
      if (this.contains(it, x, y)) return it;
    }
    return null;
  }
  // returns true if the UI captured this pointer
  down(p) {
    const it = this.hit(p.x, p.y);
    this.pressed = it;
    if (it) { it._pressT = performance.now(); return true; }
    return this.modal !== null; // a modal swallows all input
  }
  up() { this.pressed = null; }
  cancel() { this.pressed = null; }
  tap(p) {
    const it = this.hit(p.x, p.y);
    if (!it) return this.modal !== null;
    if (it.enabled && it.onTap) {
      if (it.sound !== false) Audio.sfx(it.sound || 'ui_click');
      it.onTap(it, p);
    } else if (!it.enabled && it.onDisabledTap) it.onDisabledTap(it, p);
    else if (!it.enabled) Audio.sfx('ui_error');
    return true;
  }
  move(p) { this.hover = this.hit(p.x, p.y); }

  draw(ctx) {
    for (const it of this.items) {
      if (!it.visible || !it.draw) continue;
      const pressed = this.pressed === it;
      it.draw(ctx, it, pressed, this.hover === it);
    }
  }
}

// ---- common widget factories ----
export function textButton(x, y, w, h, label, onTap, o = {}) {
  return {
    x, y, w, h, onTap, label, color: o.color || 'green', size: o.size, layer: o.layer, sound: o.sound,
    draw(ctx, it, pressed) {
      button(ctx, it.x, it.y, it.w, it.h, { color: it.color, pressed, label: it.label, size: it.size, disabled: !it.enabled, fam: o.fam });
      if (o.after) o.after(ctx, it, pressed);
    },
  };
}

export function roundIconButton(cx, cy, r, drawIcon, onTap, o = {}) {
  return {
    x: cx, y: cy, r, onTap, layer: o.layer, sound: o.sound,
    draw(ctx, it, pressed) {
      circleButton(ctx, it.x, it.y, it.r, { pressed, color: o.color || 'dark', disabled: !it.enabled });
      ctx.save();
      if (pressed) { ctx.translate(it.x, it.y); ctx.scale(0.92, 0.92); ctx.translate(-it.x, -it.y); }
      drawIcon(ctx, it.x, it.y, it.r * 0.95, it);
      ctx.restore();
      if (o.badge) {
        const b = o.badge(it);
        if (b) {
          ctx.beginPath(); ctx.arc(it.x + it.r * 0.72, it.y - it.r * 0.72, it.r * 0.34, 0, Math.PI * 2);
          ctx.fillStyle = '#d33'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#2a0b05'; ctx.stroke();
          text(ctx, String(b), it.x + it.r * 0.72, it.y - it.r * 0.72, { size: it.r * 0.4, align: 'center', color: '#fff' });
        }
      }
    },
  };
}
