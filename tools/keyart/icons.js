// Rampart Riot — app icons (opaque 512/192/180): the Warden's emblem, a white stone tower with a beacon spark on a
// deep blue heater shield with a gold rim, over a night background. Painted at 2x and box-filtered down.
import { makeNoise } from '../maps/lib/noise.js';
import { mk, clamp, lerp, TAU, sdf, over, half } from './kit.js';

const N = makeNoise(5);
const LIGHT = (() => { const v = [-0.5, -0.7, 0.75]; const l = Math.hypot(...v); return v.map(x => x / l); })();

function mask(S, draw) {
  const c = mk(S, S), g = c.getContext('2d'); g.scale(S, S); g.fillStyle = '#fff'; draw(g);
  const d = g.getImageData(0, 0, S, S).data, a = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) a[i] = d[i * 4 + 3] / 255;
  return a;
}
const shieldPath = g => { g.beginPath(); g.moveTo(0.165, 0.145); g.quadraticCurveTo(0.5, 0.095, 0.835, 0.145); g.lineTo(0.835, 0.47); g.bezierCurveTo(0.835, 0.71, 0.67, 0.84, 0.5, 0.935); g.bezierCurveTo(0.33, 0.84, 0.165, 0.71, 0.165, 0.47); g.closePath(); };
const towerPath = g => {
  g.beginPath();
  g.moveTo(0.392, 0.79); g.lineTo(0.412, 0.395); g.lineTo(0.378, 0.395); g.lineTo(0.378, 0.325);
  // merlons
  const ms = [[0.378, 0.432], [0.473, 0.527], [0.568, 0.622]];
  g.lineTo(ms[0][0], 0.255); g.lineTo(ms[0][1], 0.255); g.lineTo(ms[0][1], 0.325); g.lineTo(ms[1][0], 0.325); g.lineTo(ms[1][0], 0.255); g.lineTo(ms[1][1], 0.255); g.lineTo(ms[1][1], 0.325); g.lineTo(ms[2][0], 0.325); g.lineTo(ms[2][0], 0.255); g.lineTo(ms[2][1], 0.255);
  g.lineTo(0.622, 0.395); g.lineTo(0.588, 0.395); g.lineTo(0.608, 0.79); g.closePath();
};
const holesPath = g => { // door + window cut out of the tower
  g.beginPath(); g.moveTo(0.462, 0.79); g.lineTo(0.462, 0.715); g.arc(0.5, 0.715, 0.038, Math.PI, 0); g.lineTo(0.538, 0.79); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(0.486, 0.565); g.lineTo(0.486, 0.515); g.arc(0.5, 0.515, 0.014, Math.PI, 0); g.lineTo(0.514, 0.565); g.closePath(); g.fill();
};
const ledgePath = g => g.fillRect(0.378, 0.392, 0.244, 0.012); // shadow line under the parapet

// shade a mask with a bevelled profile into buf
function shade(buf, S, alpha, o) {
  const s = sdf(alpha, S, S), B = o.bevel * S;
  for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
    const i = y * S + x, d = s[i];
    if (o.outline && d > -o.outline * S - 1 && d <= 0.5) over(buf, i * 4, o.outC[0], o.outC[1], o.outC[2], clamp(d + o.outline * S + 0.5) * (1 - clamp(d + 0.5)));
    if (d <= -0.5) continue;
    let nx = 0, ny = 0, nz = 1;
    if (d < B) {
      const gx = (s[i + 1] - s[i - 1]) * 0.5, gy = (s[i + S] - s[i - S]) * 0.5, gl = Math.hypot(gx, gy) || 1;
      const k = o.round ? Math.cos((d / B) * Math.PI) * o.steep : o.steep; // rounded (rim) or chamfered profile
      nx = -gx / gl * k; ny = -gy / gl * k; const l = Math.hypot(nx, ny, 1); nx /= l; ny /= l; nz = 1 / l;
    }
    const dif = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
    const u = x / S, v = y / S;
    let c = o.color(u, v, d / S);
    const lit = o.amb + o.dif * dif;
    let spec = 0; if (o.spec) { const rz = 2 * dif * nz - LIGHT[2]; spec = Math.pow(clamp(rz), o.shiny) * o.spec; }
    c = [c[0] * lit + 255 * spec, c[1] * lit + 240 * spec, c[2] * lit + 210 * spec];
    over(buf, i * 4, c[0], c[1], c[2], clamp(d + 0.5));
  }
}

function paintIcon(n) {
  const S = n * 2, buf = new Float32Array(S * S * 4);
  // background: night blue with an ember glow rising from below
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, i = (y * S + x) * 4;
    const r = Math.hypot(u - 0.5, v - 0.45);
    let c = [lerp(30, 6, clamp(r / 0.75)), lerp(44, 9, clamp(r / 0.75)), lerp(86, 22, clamp(r / 0.75))];
    const e = Math.exp(-(((u - 0.5) / 0.42) ** 2) - (((v - 1.02) / 0.3) ** 2));
    c = [c[0] + 220 * e * 0.6, c[1] + 90 * e * 0.6, c[2] + 30 * e * 0.6];
    buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 1;
  }
  const shield = mask(S, g => { shieldPath(g); g.fill(); });
  // soft drop shadow
  { const c = mk(S, S), g = c.getContext('2d'); g.filter = `blur(${S * 0.018}px)`; g.scale(S, S); g.translate(0, 0.022); g.fillStyle = '#000'; shieldPath(g); g.fill();
    const d = g.getImageData(0, 0, S, S).data; for (let i = 0; i < S * S; i++) { const a = d[i * 4 + 3] / 255 * 0.75; if (a > 0) over(buf, i * 4, 0, 0, 4, a); } }
  // gold rim (rounded profile) with a dark outline
  shade(buf, S, shield, { bevel: 0.05, round: true, steep: 1.6, amb: 0.5, dif: 0.72, spec: 0.85, shiny: 14, outline: 0.012, outC: [16, 10, 6],
    color: (u, v) => { const n = N.fbm(u * 30, v * 30, 2); return [236 + (n - 0.5) * 30, 176 + (n - 0.5) * 26, 66]; } });
  // inner field: deep blue enamel with a faint diamond diaper, darker towards the bottom-right
  const field = mask(S, g => { g.save(); g.translate(0.5, 0.52); g.scale(0.855, 0.875); g.translate(-0.5, -0.52); shieldPath(g); g.fill(); g.restore(); });
  shade(buf, S, field, { bevel: 0.022, steep: -0.9, amb: 0.82, dif: 0.3, outline: 0.009, outC: [12, 10, 20],
    color: (u, v) => {
      const t = clamp((u - 0.2) * 0.6 + (v - 0.15) * 0.9);
      const diam = (Math.abs(((u + v) * 14) % 1 - 0.5) < 0.04 || Math.abs(((u - v) * 14 + 100) % 1 - 0.5) < 0.04) ? 1 : 0;
      const base = [lerp(52, 18, t), lerp(96, 34, t), lerp(196, 104, t)];
      return diam ? [base[0] * 1.12 + 6, base[1] * 1.12 + 8, base[2] * 1.1 + 10] : base;
    } });
  // inner shadow along the top of the field
  // tower: white stone, chamfered, with door/window cut-outs
  const tower = mask(S, g => { towerPath(g); g.fill(); g.globalCompositeOperation = 'destination-out'; holesPath(g); ledgePath(g); });
  { const c = mk(S, S), g = c.getContext('2d'); g.filter = `blur(${S * 0.01}px)`; g.scale(S, S); g.translate(0.012, 0.016); g.fillStyle = '#000'; towerPath(g); g.fill();
    const d = g.getImageData(0, 0, S, S).data; for (let i = 0; i < S * S; i++) { const a = d[i * 4 + 3] / 255 * 0.5 * field[i]; if (a > 0) over(buf, i * 4, 4, 6, 20, a); } }
  shade(buf, S, tower, { bevel: 0.016, steep: 1.3, amb: 0.62, dif: 0.48, spec: 0.12, shiny: 8, outline: 0.009, outC: [14, 16, 34],
    color: (u, v) => { const n = N.fbm(u * 40 + 5, v * 40, 3); const row = (v * 26) % 1 < 0.1 ? 0.88 : 1; const side = u > 0.5 ? 0.86 : 1; const k = row * side; return [(238 + (n - 0.5) * 30) * k, (234 + (n - 0.5) * 28) * k, (222 + (n - 0.5) * 24) * k]; } });
  // the door/window glow warm (lit from within)
  const holes = mask(S, g => holesPath(g));
  const ledge = mask(S, g => ledgePath(g));
  for (let i = 0; i < S * S; i++) {
    const a = holes[i]; if (a > 0.01) { const v = Math.floor(i / S) / S; over(buf, i * 4, 255, lerp(150, 214, clamp((v - 0.5) * 3)), 70, a * 0.95); }
    if (ledge[i] > 0.01) over(buf, i * 4, 40, 44, 70, ledge[i]);
  }
  // beacon spark: a small flame above the middle merlon with a warm halo and two rising embers
  const fx = 0.5 * S, fy = 0.215 * S;
  const fl = mask(S, g => { g.beginPath(); g.moveTo(0.5 - 0.024, 0.236); g.bezierCurveTo(0.5 - 0.03, 0.2, 0.5 - 0.004, 0.19, 0.5 + 0.004, 0.148); g.bezierCurveTo(0.5 + 0.012, 0.19, 0.5 + 0.03, 0.205, 0.5 + 0.024, 0.236); g.closePath(); g.fill(); });
  const core = mask(S, g => { g.beginPath(); g.ellipse(0.5, 0.222, 0.011, 0.018, 0, 0, TAU); g.fill(); });
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (x - fx) / S, dy = (y - fy) / S, r = Math.hypot(dx, dy * 0.85), i = (y * S + x) * 4;
    const glow = Math.exp(-((r / 0.085) ** 2)) * 0.5 + Math.exp(-((r / 0.03) ** 2)) * 0.6;
    if (glow > 0.003) { buf[i] += 255 * glow; buf[i + 1] += 110 * glow; buf[i + 2] += 30 * glow; }
    const p = y * S + x;
    if (fl[p] > 0) { const t = clamp((y / S - 0.148) / 0.088); over(buf, i, 255, lerp(120, 200, t), lerp(30, 70, t), fl[p]); }
    if (core[p] > 0) over(buf, i, 255, 246, 200, core[p]);
    for (const [ex, ey, er] of [[0.548, 0.16, 0.006], [0.462, 0.135, 0.0045]]) { const e = Math.exp(-((Math.hypot(x / S - ex, y / S - ey) / er) ** 2)); if (e > 0.01) { buf[i] += 255 * e; buf[i + 1] += 170 * e; buf[i + 2] += 80 * e; } }
  }
  // to canvas (clamp), then box-filter down 2x
  const px = new Uint8ClampedArray(S * S * 4);
  for (let i = 0; i < S * S; i++) { px[i * 4] = buf[i * 4]; px[i * 4 + 1] = buf[i * 4 + 1]; px[i * 4 + 2] = buf[i * 4 + 2]; px[i * 4 + 3] = 255; }
  const tmp = mk(n, n); tmp.getContext('2d').putImageData(new ImageData(half(px, S, S), n, n), 0, 0);
  const out = mk(n, n); out.getContext('2d', { alpha: false }).drawImage(tmp, 0, 0); // opaque canvas -> RGB png
  return out;
}

export async function render() {
  return [512, 192, 180].map(n => ({ name: `icon-${n}.png`, canvas: paintIcon(n), type: 'png' }));
}
