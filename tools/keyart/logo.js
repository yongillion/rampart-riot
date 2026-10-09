// Rampart Riot — logo (transparent PNG ~1500x560): "RAMPART" in chiselled stone over "RIOT" in ember-hot bronze,
// flanked by two swords. Letters come from a system serif, then get a distance-field chamfer bevel, layered
// outlines, an extruded underside, stone/metal texture, cracks and an ember glow from below.
import { makeNoise, rngf } from '../maps/lib/noise.js';
import { mk, clamp, lerp, sstep, TAU, sdf, over } from './kit.js';

const W = 1500, H = 560;
const N = makeNoise(31);

// ---------- letter masks ----------
function wordMask(text, o) {
  const c = mk(W, H), g = c.getContext('2d');
  g.font = `${o.weight} ${o.size}px "${o.font}"`;
  g.textBaseline = 'alphabetic';
  const ws = [...text].map(ch => g.measureText(ch).width);
  const track = o.track || 0;
  const total = ws.reduce((a, b) => a + b, 0) + track * (text.length - 1);
  let x = o.cx - total / 2;
  const boxes = [];
  [...text].forEach((ch, i) => {
    const mx = x + ws[i] / 2, t = (mx - o.cx) / (total / 2);
    const lift = o.arch * (1 - t * t), ang = -2 * o.arch * t / (total / 2) * 0.9;
    const sc = 1 + (o.capBoost && (i === 0 || i === text.length - 1) ? o.capBoost : 0);
    g.save(); g.translate(mx, o.base - lift); g.rotate(ang); g.scale(sc, sc);
    g.fillStyle = '#fff'; g.fillText(ch, -ws[i] / 2, 0);
    if (o.embolden) { g.strokeStyle = '#fff'; g.lineWidth = o.embolden; g.lineJoin = 'miter'; g.miterLimit = 3; g.strokeText(ch, -ws[i] / 2, 0); }
    g.restore();
    boxes.push({ x: mx, y: o.base - lift, w: ws[i] });
    x += ws[i] + track;
  });
  const d = g.getImageData(0, 0, W, H).data, a = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) a[i] = d[i * 4 + 3] / 255;
  return { a, boxes };
}
function shapeMask(draw) {
  const c = mk(W, H), g = c.getContext('2d'); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; draw(g);
  const d = g.getImageData(0, 0, W, H).data, a = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) a[i] = d[i * 4 + 3] / 255;
  return a;
}

// ---------- layered rendering ----------
// layer buffers are premultiplied RGBA floats; we composite "over" from back to front
const L = (() => { const v = [-0.55, -0.75, 0.62]; const l = Math.hypot(...v); return v.map(x => x / l); })();

function material(kind, x, y, top, bot) {
  const t = clamp((y - top) / (bot - top));
  if (kind === 'stone') {
    const n = N.fbm(x / 40, y / 40, 4), n2 = N.fbm(x / 7 + 30, y / 7, 2);
    const base = [lerp(196, 112, t) + (n - 0.5) * 50, lerp(200, 116, t) + (n - 0.5) * 46, lerp(206, 128, t) + (n - 0.5) * 40];
    const sp = n2 > 0.7 ? -18 : n2 < 0.28 ? 10 : 0; // speckle
    return [base[0] + sp, base[1] + sp, base[2] + sp];
  }
  if (kind === 'bronze') {
    const n = N.fbm(x / 30 + 9, y / 30, 3);
    const k = t < 0.5 ? t / 0.5 : 1;
    const c0 = [255, 226, 140], c1 = [232, 150, 52], c2 = [168, 70, 22];
    const c = t < 0.45 ? [lerp(c0[0], c1[0], t / 0.45), lerp(c0[1], c1[1], t / 0.45), lerp(c0[2], c1[2], t / 0.45)] : [lerp(c1[0], c2[0], (t - 0.45) / 0.55), lerp(c1[1], c2[1], (t - 0.45) / 0.55), lerp(c1[2], c2[2], (t - 0.45) / 0.55)];
    return [c[0] + (n - 0.5) * 40 * k, c[1] + (n - 0.5) * 34 * k, c[2] + (n - 0.5) * 20];
  }
  if (kind === 'steel') { const n = N.fbm(x / 20, y / 60, 3); return [168 + (n - 0.5) * 40, 176 + (n - 0.5) * 40, 190 + (n - 0.5) * 36]; }
  if (kind === 'gold') { const n = N.fbm(x / 20, y / 20, 3); return [236 + (n - 0.5) * 30, 178 + (n - 0.5) * 30, 72]; }
  if (kind === 'gem') return [200, 30, 40];
  if (kind === 'leather') { const n = N.fbm(x / 6, y / 6, 2); return [92 + (n - 0.5) * 30, 48 + (n - 0.5) * 20, 30]; }
  return [200, 200, 200];
}

// paint one solid "piece" (word or ornament) with outlines, extrusion, bevel and texture into buf
function piece(buf, alpha, o) {
  const s = sdf(alpha, W, H);
  const B = o.bevel, O1 = o.out1, O2 = o.out2, O3 = o.out3, ext = o.extrude;
  const R = rngf(o.seed || 1);
  // crack mask (stone) / molten seams (bronze)
  let crack = null;
  if (o.cracks) {
    const c = mk(W, H), g = c.getContext('2d');
    g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < o.cracks; i++) {
      const bx = o.boxes[Math.floor(R() * o.boxes.length)];
      let x = bx.x + (R() - 0.5) * bx.w * 0.8, y = bx.y - R() * o.cap;
      g.lineWidth = o.crackW * (0.6 + R() * 0.6); g.beginPath(); g.moveTo(x, y);
      let ang = R() * TAU;
      for (let k = 0; k < 6 + R() * 8; k++) { ang += (R() - 0.5) * 1.6; x += Math.cos(ang) * (5 + R() * 9); y += Math.sin(ang) * (5 + R() * 9); g.lineTo(x, y); if (R() < 0.15) { g.stroke(); g.lineWidth *= 0.7; g.beginPath(); g.moveTo(x, y); } }
      g.stroke();
    }
    const d = g.getImageData(0, 0, W, H).data; crack = new Float32Array(W * H); for (let i = 0; i < W * H; i++) crack[i] = d[i * 4 + 3] / 255;
  }
  // chips: notches carved into the edges
  const chipAt = (x, y) => (o.chips ? N.fbm(x / 16 + 17, y / 16 + 5, 2) : 0);
  const top = o.top, bot = o.bot;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, d = s[i];
    if (d < -(O3 + ext + 2)) continue;
    const p = i * 4;
    // extruded underside: the outline shape shifted down, with its own outline and a shaded side colour
    if (ext) {
      for (let k = ext; k >= 1; k -= 1) { // sweep so the side reads as a solid band
        const de = s[Math.max(0, i - k * W)];
        if (de > -(O3 + 3)) { const t = k / ext; over(buf, p, o.outC[0], o.outC[1], o.outC[2], clamp(de + O3 + 3.5)); if (de > -O3) over(buf, p, lerp(o.extC[0] * 0.55, o.extC[0], t), lerp(o.extC[1] * 0.55, o.extC[1], t), lerp(o.extC[2] * 0.55, o.extC[2], t), clamp(de + O3 + 0.5)); break; }
      }
    }
    // outer dark outline, rim line, inner dark outline
    if (d > -O3) {
      const a3 = clamp(d + O3 + 0.5);
      over(buf, p, o.outC[0], o.outC[1], o.outC[2], a3);
      if (d > -O2 && o.rimC) { const ar = clamp(d + O2 + 0.5) * (1 - clamp(d + O1 + 0.5)); const sh = clamp(0.55 + 0.45 * ((y - top) / (bot - top) < 0.5 ? 1 : 0.6)); over(buf, p, o.rimC[0] * sh, o.rimC[1] * sh, o.rimC[2] * sh, ar); }
    }
    // letter face
    let chip = 0;
    if (o.chips && d < 7) { const c = chipAt(x, y); if (c > 0.64) chip = clamp((c - 0.64) * 14) * (1 - d / 7); }
    const df = d - chip * 2.5;
    if (df <= -0.5 || o.faceless) continue;
    const af = clamp(df + 0.5);
    // bevel normal from the distance gradient
    let nx = 0, ny = 0, nz = 1;
    if (df < B) {
      const gx = (s[i + 1] - s[i - 1]) * 0.5, gy = (s[i + W] - s[i - W]) * 0.5, gl = Math.hypot(gx, gy) || 1;
      const k = o.steep;
      nx = -gx / gl * k; ny = -gy / gl * k; const l = Math.hypot(nx, ny, 1); nx /= l; ny /= l; nz = 1 / l;
    }
    if (chip > 0) { // rough, freshly chipped facets
      const a = N.perlin(x / 3.1, y / 3.1) * TAU * 2; nx += Math.cos(a) * 0.6 * chip; ny += Math.sin(a) * 0.6 * chip; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    }
    const dif = nx * L[0] + ny * L[1] + nz * L[2];
    let c = material(o.mat, x, y, top, bot);
    let lit = o.amb + o.dif * dif;
    // specular (metal)
    let spec = 0;
    if (o.spec) { const rz = 2 * dif * nz - L[2]; spec = Math.pow(clamp(rz), o.shiny) * o.spec; }
    c = [c[0] * lit + spec * 255, c[1] * lit + spec * 240, c[2] * lit + spec * 200];
    // ember light from below: warm the lower faces
    const ty = clamp((y - top) / (bot - top));
    const ember = o.ember * sstep(0.45, 1.0, ty) * (ny > 0.2 ? 1.4 : 1);
    c = [c[0] + 255 * ember * 0.55, c[1] + 120 * ember * 0.55, c[2] + 40 * ember * 0.3];
    // inner edge darkening (ambient occlusion in the chamfer valley)
    if (df < 1.6) c = c.map(v => v * (0.7 + 0.3 * df / 1.6));
    if (crack) { const cr = crack[i]; if (cr > 0.01) { if (o.molten) c = [lerp(c[0], 255, cr), lerp(c[1], 200, cr), lerp(c[2], 110, cr)]; else c = c.map(v => v * (1 - 0.65 * cr)); } }
    over(buf, p, c[0], c[1], c[2], af);
  }
}

function glow(buf, alpha, o) { // soft coloured glow behind a mask (blurred via canvas filter)
  const c = mk(W, H), g = c.getContext('2d'), id = g.createImageData(W, H);
  for (let i = 0; i < W * H; i++) { id.data[i * 4 + 3] = alpha[i] * 255; id.data[i * 4] = 255; id.data[i * 4 + 1] = 255; id.data[i * 4 + 2] = 255; }
  g.putImageData(id, 0, 0);
  const b = mk(W, H), bg = b.getContext('2d'); bg.filter = `blur(${o.blur}px)`; bg.drawImage(c, o.dx || 0, o.dy || 0); bg.filter = 'none';
  const d = bg.getImageData(0, 0, W, H).data;
  for (let i = 0; i < W * H; i++) { const a = d[i * 4 + 3] / 255 * o.a; if (a > 0.002) over(buf, i * 4, o.c[0], o.c[1], o.c[2], clamp(a)); }
}

// broadsword lying horizontally, hilt at (x, y), blade pointing outwards (dir -1 = left, 1 = right); parts drawn separately
function swordPart(g, part, x, y, dir, len) {
  g.save(); g.translate(x, y); g.scale(dir, 1);
  if (part === 'blade') { const bw = 30; g.beginPath(); g.moveTo(30, -bw / 2); g.lineTo(30 + len - 56, -bw / 2 + 2); g.lineTo(30 + len, 0); g.lineTo(30 + len - 56, bw / 2 - 2); g.lineTo(30, bw / 2); g.closePath(); g.fill(); }
  if (part === 'guard') { g.beginPath(); g.roundRect(18, -48, 18, 96, 7); g.fill(); g.beginPath(); g.moveTo(27, -16); g.lineTo(44, 0); g.lineTo(27, 16); g.lineTo(10, 0); g.closePath(); g.fill(); g.beginPath(); g.arc(27, -50, 10, 0, TAU); g.arc(27, 50, 10, 0, TAU); g.fill(); }
  if (part === 'grip') { g.beginPath(); g.roundRect(-50, -11, 70, 22, 7); g.fill(); }
  if (part === 'pommel') { g.beginPath(); g.arc(-62, 0, 19, 0, TAU); g.fill(); }
  if (part === 'gem') { g.beginPath(); g.arc(-62, 0, 8, 0, TAU); g.fill(); }
  g.restore();
}
export async function render(q) {
  const font = q.get('font') || 'TeX Gyre Pagella', weight = q.get('weight') || '700';
  try { await document.fonts.load(`${weight} 200px "${font}"`); } catch (e) {}
  const buf = new Float32Array(W * H * 4);
  // RAMPART
  const top1 = 66, base1 = 296;
  const ramp = wordMask('RAMPART', { font, weight, size: 262, cx: W / 2, base: base1, arch: 26, track: 6, embolden: 9, capBoost: 0.08 });
  // RIOT
  const base2 = 508;
  const riot = wordMask('RIOT', { font, weight, size: 218, cx: W / 2, base: base2, arch: 0, track: 20, embolden: 9 });
  const riotW = riot.boxes[riot.boxes.length - 1].x + riot.boxes[riot.boxes.length - 1].w / 2 - (riot.boxes[0].x - riot.boxes[0].w / 2);
  // swords flanking RIOT
  const sx = riotW / 2 + 80, sy = base2 - 76, sl = 250;
  const part = name => shapeMask(g => { swordPart(g, name, W / 2 - sx, sy, -1, sl); swordPart(g, name, W / 2 + sx, sy, 1, sl); });
  const blade = part('blade'), guard = part('guard'), grip = part('grip'), pommel = part('pommel'), gem = part('gem');
  const swords = new Float32Array(W * H); for (let i = 0; i < W * H; i++) swords[i] = Math.max(blade[i], guard[i], grip[i], pommel[i]);
  // glows behind
  const allA = new Float32Array(W * H); for (let i = 0; i < W * H; i++) allA[i] = Math.max(ramp.a[i], riot.a[i], swords[i]);
  glow(buf, allA, { blur: 14, dy: 22, a: 0.7, c: [6, 2, 2] });
  glow(buf, allA, { blur: 30, dy: 14, a: 0.7, c: [255, 96, 24] });
  glow(buf, riot.a, { blur: 40, dy: 4, a: 0.9, c: [255, 120, 30] });
  const OUT = [22, 12, 8];
  // sword silhouette outline first, then each part with its own material
  piece(buf, swords, { mat: 'steel', top: sy - 50, bot: sy + 50, bevel: 0, steep: 0, amb: 0, dif: 0, out1: 3, out2: 5, out3: 10, extrude: 7, outC: OUT, rimC: [150, 110, 60], extC: [14, 8, 6], ember: 0, faceless: true });
  piece(buf, blade, { mat: 'steel', top: sy - 15, bot: sy + 15, bevel: 9, steep: 1.3, amb: 0.5, dif: 0.7, spec: 0.8, shiny: 16, out1: 0, out2: 0, out3: 1.5, extrude: 0, outC: OUT, ember: 0.35, seed: 3 });
  piece(buf, grip, { mat: 'leather', top: sy - 11, bot: sy + 11, bevel: 6, steep: 1, amb: 0.55, dif: 0.6, out1: 0, out2: 0, out3: 1.5, extrude: 0, outC: OUT, ember: 0.2, seed: 4 });
  piece(buf, guard, { mat: 'gold', top: sy - 60, bot: sy + 60, bevel: 6, steep: 1.2, amb: 0.5, dif: 0.75, spec: 0.7, shiny: 12, out1: 0, out2: 0, out3: 1.8, extrude: 0, outC: OUT, ember: 0.3, seed: 6 });
  piece(buf, pommel, { mat: 'gold', top: sy - 20, bot: sy + 20, bevel: 7, steep: 1.2, amb: 0.5, dif: 0.75, spec: 0.7, shiny: 12, out1: 0, out2: 0, out3: 1.8, extrude: 0, outC: OUT, ember: 0.3, seed: 8 });
  piece(buf, gem, { mat: 'gem', top: sy - 8, bot: sy + 8, bevel: 4, steep: 1.4, amb: 0.5, dif: 0.8, spec: 1, shiny: 20, out1: 0, out2: 0, out3: 1.4, extrude: 0, outC: OUT, ember: 0, seed: 9 });
  piece(buf, riot.a, { mat: 'bronze', top: base2 - 152, bot: base2 + 4, bevel: 9, steep: 1.1, amb: 0.5, dif: 0.75, spec: 0.75, shiny: 14, out1: 3, out2: 7, out3: 13, extrude: 10, outC: OUT, rimC: [255, 196, 96], extC: [150, 64, 22], ember: 0.55, cracks: 7, crackW: 2.2, molten: true, boxes: riot.boxes, cap: 140, seed: 5 });
  piece(buf, ramp.a, { mat: 'stone', top: top1, bot: base1 + 6, bevel: 12, steep: 1.25, amb: 0.42, dif: 0.85, spec: 0.12, shiny: 6, out1: 3, out2: 8, out3: 14, extrude: 14, outC: OUT, rimC: [214, 160, 92], extC: [98, 84, 82], ember: 0.42, cracks: 16, crackW: 1.6, chips: true, boxes: ramp.boxes, cap: 170, seed: 7 });
  // encode
  const cv = mk(W, H), g = cv.getContext('2d'), id = g.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const a = buf[i * 4 + 3];
    if (a <= 0) continue;
    id.data[i * 4] = buf[i * 4] / a; id.data[i * 4 + 1] = buf[i * 4 + 1] / a; id.data[i * 4 + 2] = buf[i * 4 + 2] / a; id.data[i * 4 + 3] = a * 255;
  }
  g.putImageData(id, 0, 0);
  return [{ name: 'logo.png', canvas: cv, type: 'png' }];
}
