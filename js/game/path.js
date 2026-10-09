// Rampart Riot — enemy paths: Catmull-Rom smoothed, arc-length resampled polylines with lane offsets.
const STEP = 3; // resample spacing (world units)

function catmull(pts, samplesPerSeg = 16) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let k = 0; k < samplesPerSeg; k++) {
      const t = k / samplesPerSeg, t2 = t * t, t3 = t2 * t;
      const x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      out.push([x, y]);
    }
  }
  out.push(pts[n - 1].slice());
  return out;
}

export class Path {
  constructor(points, opts = {}) {
    this.id = opts.id ?? 0;
    this.width = opts.width ?? 26;     // half-width of lane spread
    this.air = !!opts.air;            // flyer-only route (not a road)
    this.ctrl = points;
    const dense = opts.raw ? points : catmull(points);
    // cumulative length of dense polyline
    const cum = [0];
    for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
    const len = cum[cum.length - 1];
    const n = Math.max(2, Math.ceil(len / STEP) + 1);
    this.n = n;
    this.len = len;
    this.step = len / (n - 1);
    this.xs = new Float32Array(n); this.ys = new Float32Array(n);
    let j = 0;
    for (let i = 0; i < n; i++) {
      const s = i * this.step;
      while (j < cum.length - 2 && cum[j + 1] < s) j++;
      const seg = cum[j + 1] - cum[j] || 1;
      const t = Math.min(1, Math.max(0, (s - cum[j]) / seg));
      this.xs[i] = dense[j][0] + (dense[j + 1][0] - dense[j][0]) * t;
      this.ys[i] = dense[j][1] + (dense[j + 1][1] - dense[j][1]) * t;
    }
    // smoothed normals (left of travel direction)
    this.nx = new Float32Array(n); this.ny = new Float32Array(n);
    const W = 8;
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - W), b = Math.min(n - 1, i + W);
      let dx = this.xs[b] - this.xs[a], dy = this.ys[b] - this.ys[a];
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      this.nx[i] = -dy; this.ny[i] = dx;
    }
  }

  // position at distance s with lateral lane offset (world units); writes into out
  pos(s, lane = 0, out = {}) {
    const f = Math.max(0, Math.min(this.n - 1.0001, s / this.step));
    const i = Math.floor(f), t = f - i;
    const x = this.xs[i] + (this.xs[i + 1] - this.xs[i]) * t;
    const y = this.ys[i] + (this.ys[i + 1] - this.ys[i]) * t;
    const nx = this.nx[i] + (this.nx[i + 1] - this.nx[i]) * t;
    const ny = this.ny[i] + (this.ny[i + 1] - this.ny[i]) * t;
    out.x = x + nx * lane;
    out.y = y + ny * lane * 0.85;
    return out;
  }
  // travel direction (dx) at s, used for facing
  dirX(s) {
    const i = Math.max(0, Math.min(this.n - 2, Math.floor(s / this.step)));
    const k = Math.min(this.n - 1, i + 3);
    return this.xs[k] - this.xs[i];
  }
  angle(s) {
    const i = Math.max(0, Math.min(this.n - 2, Math.floor(s / this.step)));
    const k = Math.min(this.n - 1, i + 2);
    return Math.atan2(this.ys[k] - this.ys[i], this.xs[k] - this.xs[i]);
  }
  // nearest point on path: returns {s, d}
  nearest(x, y) {
    let best = Infinity, bi = 0;
    for (let i = 0; i < this.n; i += 2) {
      const dx = this.xs[i] - x, dy = this.ys[i] - y;
      const d = dx * dx + dy * dy;
      if (d < best) { best = d; bi = i; }
    }
    for (let i = Math.max(0, bi - 2); i <= Math.min(this.n - 1, bi + 2); i++) {
      const dx = this.xs[i] - x, dy = this.ys[i] - y;
      const d = dx * dx + dy * dy;
      if (d < best) { best = d; bi = i; }
    }
    return { s: bi * this.step, d: Math.sqrt(best) };
  }
  // first distance where the path is inside rect (for wave flags)
  entryInside(x0, y0, x1, y1) {
    for (let i = 0; i < this.n; i++) if (this.xs[i] >= x0 && this.xs[i] <= x1 && this.ys[i] >= y0 && this.ys[i] <= y1) return i * this.step;
    return 0;
  }
}
