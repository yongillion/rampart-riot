// Rampart Riot — unified pointer input with gesture recognition (tap, drag, pinch, wheel)
// Coordinates delivered to handlers are in game-space CSS pixels (rotation already undone).
import { Screen } from './screen.js';

const TAP_MOVE = 12;     // px movement allowed for a tap
const TAP_TIME = 650;    // ms
const DRAG_START = 9;    // px before a drag begins

export class Input {
  constructor(target, handler) {
    this.target = target;
    this.handler = handler; // object with optional onDown/onUp/onTap/onDragStart/onDrag/onDragEnd/onPinch/onPinchEnd/onWheel/onHover/onKey
    this.pointers = new Map();
    this.pinch = null;
    this.mouse = { x: -1, y: -1, inside: false };
    this.enabled = true;
    this._bind();
  }

  _p(e) { const g = Screen.toGame(e.clientX, e.clientY); return { x: g.x, y: g.y, id: e.pointerId, type: e.pointerType, button: e.button }; }

  _bind() {
    const t = this.target;
    const opts = { passive: false };
    t.addEventListener('pointerdown', e => this._down(e), opts);
    window.addEventListener('pointermove', e => this._move(e), opts);
    window.addEventListener('pointerup', e => this._up(e), opts);
    window.addEventListener('pointercancel', e => this._cancel(e), opts);
    t.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') this.mouse.inside = false; });
    t.addEventListener('wheel', e => {
      e.preventDefault();
      if (!this.enabled) return;
      const g = Screen.toGame(e.clientX, e.clientY);
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 32; else if (e.deltaMode === 2) dy *= 400;
      this._call('onWheel', dy, g.x, g.y, e.ctrlKey);
    }, opts);
    t.addEventListener('contextmenu', e => e.preventDefault());
    // Block iOS Safari page pinch-zoom / double-tap zoom
    document.addEventListener('gesturestart', e => e.preventDefault(), opts);
    document.addEventListener('gesturechange', e => e.preventDefault(), opts);
    document.addEventListener('dblclick', e => e.preventDefault(), opts);
    document.addEventListener('touchmove', e => { e.preventDefault(); }, opts);
    window.addEventListener('keydown', e => {
      if (!this.enabled) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this._call('onKey', e.key, e);
    });
  }

  _call(name, ...args) {
    const h = this.handler;
    if (h && typeof h[name] === 'function') return h[name](...args);
  }

  _down(e) {
    e.preventDefault();
    if (!this.enabled) return;
    try { this.target.setPointerCapture(e.pointerId); } catch (_) {}
    const p = this._p(e);
    const rec = { id: e.pointerId, x: p.x, y: p.y, sx: p.x, sy: p.y, t0: performance.now(), moved: false, dragging: false, type: e.pointerType, button: e.button, captured: false };
    this.pointers.set(e.pointerId, rec);
    if (this.pointers.size === 2) {
      // begin pinch, cancel single-finger interactions
      const [a, b] = [...this.pointers.values()];
      for (const r of [a, b]) {
        if (r.dragging) { r.dragging = false; this._call('onDragEnd', { x: r.x, y: r.y, id: r.id }); }
        r.moved = true;
      }
      this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      this._call('onPinchStart', this.pinch.cx, this.pinch.cy);
      this._call('onCancelPress');
      return;
    }
    if (this.pointers.size > 2) return;
    rec.captured = !!this._call('onDown', p);
  }

  _move(e) {
    const g = Screen.toGame(e.clientX, e.clientY);
    if (e.pointerType === 'mouse') { this.mouse.x = g.x; this.mouse.y = g.y; this.mouse.inside = true; }
    const rec = this.pointers.get(e.pointerId);
    if (!this.enabled) return;
    if (!rec) {
      if (e.pointerType === 'mouse') this._call('onHover', { x: g.x, y: g.y });
      return;
    }
    e.preventDefault();
    const px = rec.x, py = rec.y;
    rec.x = g.x; rec.y = g.y;
    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      const f = d / this.pinch.d;
      this._call('onPinch', f, cx, cy, cx - this.pinch.cx, cy - this.pinch.cy);
      this.pinch.d = d; this.pinch.cx = cx; this.pinch.cy = cy;
      return;
    }
    if (this.pinch) return; // one finger left after pinch: ignore until lifted
    const moved = Math.hypot(rec.x - rec.sx, rec.y - rec.sy);
    if (!rec.moved && moved > TAP_MOVE) rec.moved = true;
    if (!rec.dragging && moved > DRAG_START) {
      rec.dragging = true;
      this._call('onDragStart', { x: rec.sx, y: rec.sy, id: rec.id, captured: rec.captured });
    }
    if (rec.dragging) this._call('onDrag', rec.x - px, rec.y - py, { x: rec.x, y: rec.y, id: rec.id, captured: rec.captured });
    else this._call('onMoveDown', { x: rec.x, y: rec.y, id: rec.id });
  }

  _up(e) {
    const rec = this.pointers.get(e.pointerId);
    if (!rec) return;
    e.preventDefault();
    this.pointers.delete(e.pointerId);
    try { this.target.releasePointerCapture(e.pointerId); } catch (_) {}
    if (!this.enabled) { if (this.pointers.size === 0) this.pinch = null; return; }
    const g = Screen.toGame(e.clientX, e.clientY);
    const p = { x: g.x, y: g.y, id: rec.id, type: rec.type };
    if (this.pinch) {
      if (this.pointers.size < 2) { this._call('onPinchEnd'); }
      if (this.pointers.size === 0) this.pinch = null;
      this._call('onUp', p, true);
      return;
    }
    if (rec.dragging) this._call('onDragEnd', p);
    const isTap = !rec.moved && performance.now() - rec.t0 < TAP_TIME && (rec.type !== 'mouse' || rec.button === 0);
    this._call('onUp', p, !isTap);
    if (isTap) this._call('onTap', p);
  }

  _cancel(e) {
    const rec = this.pointers.get(e.pointerId);
    if (!rec) return;
    this.pointers.delete(e.pointerId);
    if (rec.dragging) this._call('onDragEnd', { x: rec.x, y: rec.y, id: rec.id });
    this._call('onUp', { x: rec.x, y: rec.y, id: rec.id }, true);
    if (this.pointers.size < 2 && this.pinch) { this._call('onPinchEnd'); }
    if (this.pointers.size === 0) this.pinch = null;
  }

  reset() {
    this.pointers.clear();
    this.pinch = null;
  }
}
