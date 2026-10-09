// Rampart Riot key art — shared painting helpers (canvas, colour math, smoothing, post effects)
export const PI = Math.PI, TAU = Math.PI * 2;
export function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; }
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export function rgb(h) { h = h.replace('#', ''); const v = parseInt(h, 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
export const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
// piecewise-linear colour ramp: stops = [[t, '#hex'], ...]
export function ramp(stops) {
  const S = stops.map(([t, c]) => [t, typeof c === 'string' ? rgb(c) : c]);
  return t => {
    if (t <= S[0][0]) return S[0][1];
    for (let i = 1; i < S.length; i++) if (t <= S[i][0]) return mix3(S[i - 1][1], S[i][1], (t - S[i - 1][0]) / (S[i][0] - S[i - 1][0]));
    return S[S.length - 1][1];
  };
}
// Catmull-Rom densify an open polyline
export function smooth(pts, n = 10, closed = false) {
  const out = [], L = pts.length;
  const get = i => (closed ? pts[(i + L) % L] : pts[Math.max(0, Math.min(L - 1, i))]);
  const segs = closed ? L : L - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  if (!closed) out.push(pts[L - 1]);
  return out;
}
export function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function distToPoly(x, y, pts) { // distance to an open polyline
  let best = 1e9;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / l2);
    const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
    if (d < best) best = d;
  }
  return best;
}
// additive soft glow
export function glowAt(g, x, y, r, c, a = 0.6, mode = 'lighter') {
  g.save(); g.globalCompositeOperation = mode;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, css(c, a)); gr.addColorStop(0.35, css(c, a * 0.4)); gr.addColorStop(1, css(c, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
}
// bloom: blurred copy of the bright parts added on top
export function bloom(cv, { thresh = 0.62, blur = 18, amt = 0.55, scale = 0.25 } = {}) {
  const w = Math.round(cv.width * scale), h = Math.round(cv.height * scale);
  const s = mk(w, h), sg = s.getContext('2d');
  sg.imageSmoothingQuality = 'high'; sg.drawImage(cv, 0, 0, w, h);
  const id = sg.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = (0.3 * d[i] + 0.55 * d[i + 1] + 0.15 * d[i + 2]) / 255;
    const k = clamp((l - thresh) / (1 - thresh));
    d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
  }
  sg.putImageData(id, 0, 0);
  const b = mk(w, h), bg = b.getContext('2d');
  bg.filter = `blur(${blur * scale}px)`; bg.drawImage(s, 0, 0); bg.filter = 'none';
  const g = cv.getContext('2d');
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = amt; g.imageSmoothingQuality = 'high';
  g.drawImage(b, 0, 0, cv.width, cv.height); g.restore();
}
// fine film grain (keeps gradients from banding in JPEG)
export function grain(cv, amt = 6, seed = 1) {
  const g = cv.getContext('2d'), id = g.getImageData(0, 0, cv.width, cv.height), d = id.data;
  let s = seed >>> 0;
  for (let i = 0; i < d.length; i += 4) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const n = ((s >>> 8) / 16777216 - 0.5) * amt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(id, 0, 0);
}
// 2x2 box downsample of an RGBA buffer
export function half(src, w, h) {
  const W2 = w >> 1, H2 = h >> 1, out = new Uint8ClampedArray(W2 * H2 * 4);
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
    const o = (y * W2 + x) * 4, a = ((2 * y) * w + 2 * x) * 4, b = a + 4, c = a + w * 4, e = c + 4;
    const A = src[a + 3] + src[b + 3] + src[c + 3] + src[e + 3];
    out[o + 3] = A / 4;
    if (A > 0) for (let k = 0; k < 3; k++) out[o + k] = (src[a + k] * src[a + 3] + src[b + k] * src[b + 3] + src[c + k] * src[c + 3] + src[e + k] * src[e + 3]) / A;
  }
  return out;
}

// ---------- Euclidean distance transform (Felzenszwalb & Huttenlocher) ----------
export function edt(inside, w, h) { // returns distance (px) from each "inside" pixel to the nearest outside pixel
  const INF = 1e20, f = new Float64Array(Math.max(w, h)), d = new Float64Array(Math.max(w, h)), v = new Int32Array(Math.max(w, h)), z = new Float64Array(Math.max(w, h) + 1);
  const g = new Float64Array(w * h);
  const pass = (n) => {
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < n; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
  };
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = inside[y * w + x] ? INF : 0; pass(h); for (let y = 0; y < h; y++) g[y * w + x] = d[y]; }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g[y * w + x]; pass(w); for (let x = 0; x < w; x++) out[y * w + x] = Math.sqrt(d[x]); }
  return out;
}
// signed distance: >0 inside, <0 outside (sub-pixel corrected by the AA alpha)
export function sdf(alpha, w, h) {
  const ins = new Uint8Array(w * h), outs = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) { ins[i] = alpha[i] >= 0.5 ? 1 : 0; outs[i] = 1 - ins[i]; }
  const di = edt(ins, w, h), dout = edt(outs, w, h);
  const s = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) s[i] = ins[i] ? di[i] - 0.5 : -(dout[i] - 0.5);
  return s;
}

// premultiplied 'over' into a float RGBA buffer at index i
export function over(dst, i, r, g, b, a) { const k = 1 - a; dst[i] = r * a + dst[i] * k; dst[i + 1] = g * a + dst[i + 1] * k; dst[i + 2] = b * a + dst[i + 2] * k; dst[i + 3] = a + dst[i + 3] * k; }
