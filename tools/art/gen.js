// Rampart Riot art generator — renders sprite jobs to trimmed frames and packs them into atlases.
// Loaded by tools/art/gen.html; driven by tools/art/export.mjs (headless Chromium) or opened manually.

const PAD = 2;

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }

function trim(c) {
  const ctx = c.getContext('2d');
  const { width: w, height: h } = c;
  const d = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) {
      if (d[row + x * 4 + 3] > 2) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
  }
  if (x1 < 0) { const e = makeCanvas(1, 1); return { canvas: e, x: 0, y: 0 }; }
  const tw = x1 - x0 + 1, th = y1 - y0 + 1;
  const out = makeCanvas(tw, th);
  out.getContext('2d').drawImage(c, x0, y0, tw, th, 0, 0, tw, th);
  return { canvas: out, x: x0, y: y0 };
}

// Skyline bottom-left packer
class Skyline {
  constructor(w, h) { this.w = w; this.h = h; this.sky = [{ x: 0, y: 0, w }]; this.used = 0; }
  fit(i, w, h) {
    const s = this.sky; let x = s[i].x; if (x + w > this.w) return -1;
    let y = s[i].y, wl = w, j = i;
    while (wl > 0) { if (j >= s.length) return -1; y = Math.max(y, s[j].y); if (y + h > this.h) return -1; wl -= s[j].w; j++; }
    return y;
  }
  insert(w, h) {
    let best = null;
    for (let i = 0; i < this.sky.length; i++) {
      const y = this.fit(i, w, h);
      if (y >= 0 && (!best || y + h < best.y + best.h || (y + h === best.y + best.h && this.sky[i].x < best.x))) best = { i, x: this.sky[i].x, y, h };
    }
    if (!best) return null;
    const node = { x: best.x, y: best.y + h, w };
    this.sky.splice(best.i, 0, node);
    for (let i = best.i + 1; i < this.sky.length; i++) {
      const prev = this.sky[i - 1], cur = this.sky[i];
      if (cur.x < prev.x + prev.w) {
        const shrink = prev.x + prev.w - cur.x;
        cur.x += shrink; cur.w -= shrink;
        if (cur.w <= 0) { this.sky.splice(i, 1); i--; } else break;
      } else break;
    }
    for (let i = 0; i < this.sky.length - 1; i++) {
      if (this.sky[i].y === this.sky[i + 1].y) { this.sky[i].w += this.sky[i + 1].w; this.sky.splice(i + 1, 1); i--; }
    }
    this.used = Math.max(this.used, best.y + h);
    return { x: best.x, y: best.y };
  }
}

export function renderJobs(jobs, scale) {
  const frames = [];
  const anims = {};
  const t0 = performance.now();
  for (const job of jobs) {
    const s = job.scale || scale;
    for (const [aname, a] of Object.entries(job.anims)) {
      const n = a.frames || 1;
      const names = [];
      for (let i = 0; i < n; i++) {
        // render on a padded canvas so nothing that strays outside the nominal box gets clipped;
        // frames are trimmed afterwards, so the padding costs no atlas space
        const pad = job.pad ?? Math.ceil(Math.max(job.w, job.h) * 0.4);
        const c = makeCanvas((job.w + pad * 2) * s, (job.h + pad * 2) * s);
        const ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.scale(s, s);
        ctx.translate(job.ax + pad, job.ay + pad);
        const loop = a.loop !== false;
        const t = n === 1 ? (loop ? 0 : 1) : loop ? i / n : i / (n - 1);
        try { a.draw(ctx, t, i, n); } catch (e) { console.error('draw failed', job.name, aname, e); }
        const tr = trim(c);
        const fname = n === 1 && a.single ? job.name : `${job.name}/${aname}/${i}`;
        frames.push({ name: fname, canvas: tr.canvas, ox: (job.ax + pad) * s - tr.x, oy: (job.ay + pad) * s - tr.y, scale: s });
        names.push(fname);
      }
      if (!a.single) anims[`${job.name}/${aname}`] = { f: names, fps: a.fps || 12, loop: a.loop !== false, ...(a.ev ? { ev: a.ev } : {}) };
    }
  }
  return { frames, anims, ms: performance.now() - t0 };
}

export function pack(frames, maxW = 2048, maxH = 2048) {
  const sorted = frames.slice().sort((a, b) => b.canvas.height - a.canvas.height || b.canvas.width - a.canvas.width);
  const pages = [];
  let cur = null;
  const placed = new Map();
  for (const f of sorted) {
    const w = f.canvas.width + PAD * 2, h = f.canvas.height + PAD * 2;
    if (w > maxW || h > maxH) throw new Error('frame too large: ' + f.name + ` ${w}x${h}`);
    let pos = cur ? cur.sky.insert(w, h) : null;
    if (!pos) {
      cur = { sky: new Skyline(maxW, maxH), items: [] };
      pages.push(cur);
      pos = cur.sky.insert(w, h);
    }
    cur.items.push({ f, x: pos.x + PAD, y: pos.y + PAD });
    placed.set(f.name, { page: pages.length - 1, x: pos.x + PAD, y: pos.y + PAD });
  }
  const outPages = pages.map(pg => {
    let w = 0; for (const it of pg.items) w = Math.max(w, it.x + it.f.canvas.width + PAD);
    const c = makeCanvas(w, pg.sky.used);
    const ctx = c.getContext('2d');
    for (const it of pg.items) ctx.drawImage(it.f.canvas, it.x, it.y);
    return c;
  });
  return { pages: outPages, placed };
}

export async function buildAtlas(name, mod, opts = {}) {
  const scale = mod.scale || 1.5;
  const jobs = await mod.jobs();
  const { frames, anims, ms } = renderJobs(jobs, scale);
  const { pages, placed } = pack(frames, opts.maxW || 2048, opts.maxH || 2048);
  const json = { scale, pages: pages.map((_, i) => `${name}_${i}.png`), frames: {}, anims };
  for (const f of frames) {
    const p = placed.get(f.name);
    json.frames[f.name] = [p.page, p.x, p.y, f.canvas.width, f.canvas.height, Math.round(f.ox * 10) / 10, Math.round(f.oy * 10) / 10];
    if (f.scale && Math.abs(f.scale - scale) > 1e-6) json.frames[f.name].push(f.scale); // per-job render scale
  }
  return { name, json, pages, frames, ms };
}

// Contact sheet for visual review
export function contactSheet(frames, opts = {}) {
  const cell = opts.cell || 140, cols = opts.cols || 10;
  const filter = opts.filter ? new RegExp(opts.filter) : null;
  const list = frames.filter(f => !filter || filter.test(f.name));
  const rows = Math.ceil(list.length / cols);
  const c = makeCanvas(cols * cell, rows * (cell + 16));
  const ctx = c.getContext('2d');
  ctx.fillStyle = opts.bg || '#6f8a4a'; ctx.fillRect(0, 0, c.width, c.height);
  list.forEach((f, i) => {
    const x = (i % cols) * cell, y = Math.floor(i / cols) * (cell + 16);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell + 15);
    const k = Math.min(1, (cell - 10) / Math.max(f.canvas.width, f.canvas.height)) * (opts.zoom || 1);
    const w = f.canvas.width * k, h = f.canvas.height * k;
    // anchor marker
    const ax = x + cell / 2, ay = y + cell * 0.82;
    ctx.drawImage(f.canvas, ax - f.ox * k, ay - f.oy * k, w, h);
    ctx.fillStyle = 'rgba(255,0,0,0.6)'; ctx.fillRect(ax - 2, ay - 0.5, 4, 1);
    ctx.fillStyle = '#000'; ctx.font = '10px monospace'; ctx.fillText(f.name.slice(-22), x + 3, y + cell + 12);
  });
  return c;
}
