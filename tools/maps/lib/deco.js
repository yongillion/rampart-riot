// Map decorations (original painted props): trees, bushes, rocks, flowers, buildings, ruins, the Rampart wall...
import { toon, flat, ellipse, circle, rrect, poly, blob, rect, dark, light, mix, alpha, OUT, glow, lg, rg, line, stroke, banner, pole, rng, star, capsule, wallBricks, planks, setOL } from '../../art/lib/toon.js';
import { cylinder, cone, merlons, house, door, windowArch, stakes, torch } from '../../art/lib/build.js';

const PI = Math.PI, S = Math.sin, C = Math.cos;

export function shadowBlob(g, x, y, rx, ry, a = 0.28) {
  g.save();
  const gr = g.createRadialGradient(x, y, 0, x, y, rx);
  gr.addColorStop(0, `rgba(10,20,5,${a})`); gr.addColorStop(1, 'rgba(10,20,5,0)');
  g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, PI * 2); g.fill();
  g.restore();
}

// ---------------- trees ----------------
export function treeRound(g, x, y, s, R, pal) {
  const leaf = pal.leaf[Math.floor(R() * pal.leaf.length)];
  shadowBlob(g, x + 14 * s, y + 2 * s, 34 * s, 12 * s, 0.32);
  toon(g, poly([[x - 4 * s, y], [x - 3 * s, y - 26 * s], [x + 3 * s, y - 26 * s], [x + 5 * s, y]]), pal.trunk, { sd: 1.4 * s, hd: 0.5, lw: 1.6 });
  const blobs = [];
  const n = 5 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2 + R(); blobs.push([x + C(a) * 15 * s * (0.6 + R() * 0.5), y - 44 * s + S(a) * 11 * s * (0.6 + R() * 0.5), (13 + R() * 8) * s]); }
  blobs.push([x, y - 50 * s, 18 * s]);
  blobs.sort((a, b) => a[1] - b[1]);
  // outline pass (one silhouette)
  const sil = new Path2D(); for (const [bx, by, br] of blobs) sil.addPath(circle(bx, by, br + 1));
  g.fillStyle = OUT; g.fill(sil);
  for (const [bx, by, br] of blobs) toon(g, circle(bx, by, br), leaf, { sd: 4 * s, hd: 2.6 * s, lw: 0, shade: dark(leaf, 0.14), light: light(leaf, 0.1) });
  // leaf flecks
  g.fillStyle = alpha(light(leaf, 0.18), 0.6);
  for (let i = 0; i < 10; i++) { const a = R() * PI * 2, d = R() * 18 * s; g.beginPath(); g.ellipse(x + C(a) * d - 4 * s, y - 52 * s + S(a) * d * 0.7, 2.4 * s, 1.5 * s, -0.5, 0, PI * 2); g.fill(); }
  if (pal.fruit && R() < 0.3) for (let i = 0; i < 4; i++) flat(g, circle(x + (R() - 0.5) * 28 * s, y - 40 * s - R() * 20 * s, 2.4 * s), pal.fruit, 1);
}
export function treePine(g, x, y, s, R, pal) {
  const leaf = pal.pine || '#2f5a3a';
  shadowBlob(g, x + 12 * s, y + 2 * s, 26 * s, 9 * s, 0.32);
  toon(g, rrect(x - 3 * s, y - 16 * s, 6 * s, 17 * s, 2), pal.trunk, { sd: 1, hd: 0.4, lw: 1.5 });
  for (let i = 0; i < 4; i++) {
    const w = (26 - i * 5) * s, yb = y - (12 + i * 16) * s, h = 26 * s;
    const tri = poly([[x - w, yb], [x - w * 0.35, yb - h * 0.5], [x, yb - h], [x + w * 0.35, yb - h * 0.5], [x + w, yb], [x + w * 0.4, yb - 4 * s], [x, yb + 2 * s], [x - w * 0.4, yb - 4 * s]]);
    toon(g, tri, leaf, { sd: 3 * s, hd: 1.6 * s, lw: 1.6 });
    if (pal.snowy) toon(g, poly([[x - w * 0.55, yb - h * 0.35], [x, yb - h], [x + w * 0.55, yb - h * 0.35], [x + w * 0.2, yb - h * 0.45], [x - w * 0.15, yb - h * 0.4]]), '#f2f8fc', { sd: 0.6, hd: 0.6, lw: 1.1 });
  }
}
export function treeDead(g, x, y, s, R, pal) {
  const col = pal.deadwood || '#4a3a2e';
  shadowBlob(g, x + 10 * s, y + 2 * s, 20 * s, 7 * s, 0.25);
  toon(g, poly([[x - 5 * s, y], [x - 3 * s, y - 40 * s], [x + 2 * s, y - 52 * s], [x + 4 * s, y - 38 * s], [x + 6 * s, y]]), col, { sd: 1.2, hd: 0.4, lw: 1.6 });
  const br = (bx, by, a, l, w) => { if (l < 6 * s) return; const ex = bx + C(a) * l, ey = by + S(a) * l; line(g, [[bx, by], [ex, ey]], OUT, w + 2); line(g, [[bx, by], [ex, ey]], col, w); br(ex, ey, a - 0.5 - R() * 0.3, l * 0.62, w * 0.65); br(ex, ey, a + 0.4 + R() * 0.3, l * 0.55, w * 0.6); };
  br(x, y - 36 * s, -PI / 2 - 0.6, 18 * s, 3.2 * s); br(x + 1, y - 44 * s, -PI / 2 + 0.5, 16 * s, 3 * s);
  if (pal.moss) { g.fillStyle = alpha(pal.moss, 0.7); for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(x + (R() - 0.5) * 6 * s, y - R() * 36 * s, 2.5 * s, 4 * s, 0, 0, PI * 2); g.fill(); } }
}
export function treeWillow(g, x, y, s, R, pal) {
  const leaf = pal.willow || '#5a7a3a';
  shadowBlob(g, x + 12 * s, y + 2 * s, 34 * s, 12 * s, 0.3);
  toon(g, poly([[x - 5 * s, y], [x - 4 * s, y - 30 * s], [x + 4 * s, y - 30 * s], [x + 6 * s, y]]), pal.trunk, { sd: 1.2, hd: 0.4, lw: 1.6 });
  toon(g, blob([[x - 30 * s, y - 20 * s], [x - 26 * s, y - 50 * s], [x, y - 62 * s], [x + 28 * s, y - 50 * s], [x + 32 * s, y - 18 * s], [x + 20 * s, y - 8 * s], [x, y - 22 * s], [x - 18 * s, y - 8 * s]], 0.7), leaf, { sd: 4 * s, hd: 2 * s, lw: 1.6 });
  g.strokeStyle = alpha(dark(leaf, 0.2), 0.7); g.lineWidth = 1.2;
  for (let i = 0; i < 14; i++) { const xx = x - 26 * s + i * 4 * s; g.beginPath(); g.moveTo(xx, y - 40 * s); g.quadraticCurveTo(xx + 2, y - 24 * s, xx + (R() - 0.5) * 4, y - (8 + R() * 10) * s); g.stroke(); }
}
export function bush(g, x, y, s, R, pal) {
  const col = pal.bush || pal.leaf[0];
  shadowBlob(g, x + 6 * s, y + 1 * s, 18 * s, 6 * s, 0.25);
  const b = [];
  for (let i = 0; i < 4; i++) b.push([x + (i - 1.5) * 7 * s, y - 7 * s - (i % 2) * 4 * s, (7 + R() * 3) * s]);
  const sil = new Path2D(); for (const [bx, by, br] of b) sil.addPath(circle(bx, by, br + 1)); g.fillStyle = OUT; g.fill(sil);
  for (const [bx, by, br] of b) toon(g, circle(bx, by, br), col, { sd: 2 * s, hd: 1.4 * s, lw: 0 });
  if (pal.berry && R() < 0.4) for (let i = 0; i < 3; i++) flat(g, circle(x + (R() - 0.5) * 20 * s, y - 8 * s - R() * 6 * s, 1.6 * s), pal.berry, 0.8);
}
export function rock(g, x, y, s, R, pal) {
  const col = pal.rock || '#8d877d';
  shadowBlob(g, x + 5 * s, y + 1 * s, 16 * s, 5 * s, 0.25);
  const n = 7, pts = [];
  for (let i = 0; i < n; i++) { const a = PI + (i / (n - 1)) * PI; pts.push([x + C(a) * (12 + R() * 4) * s, y - 2 * s + S(a) * (10 + R() * 5) * s]); }
  pts.push([x + 13 * s, y + 1 * s], [x - 13 * s, y + 1 * s]);
  toon(g, poly(pts), col, { sd: 3 * s, hd: 2 * s, lw: 1.5 });
  if (pal.rockMoss && R() < 0.5) { g.fillStyle = alpha(pal.rockMoss, 0.8); g.beginPath(); g.ellipse(x - 3 * s, y - 10 * s, 6 * s, 2.6 * s, -0.2, 0, PI * 2); g.fill(); }
  if (pal.snowy) toon(g, blob([[x - 10 * s, y - 9 * s], [x - 2 * s, y - 15 * s], [x + 8 * s, y - 11 * s], [x + 2 * s, y - 9 * s]], 0.6), '#f2f8fc', { sd: 0, hd: 0.5, lw: 1 });
}
export function flowers(g, x, y, s, R, pal) {
  const cols = pal.flowers || ['#f2e05a', '#f08aa8', '#ffffff', '#b88af0'];
  for (let i = 0; i < 6; i++) {
    const fx = x + (R() - 0.5) * 26 * s, fy = y + (R() - 0.5) * 10 * s;
    line(g, [[fx, fy], [fx, fy - 5 * s]], '#3a6a2a', 1);
    flat(g, circle(fx, fy - 6 * s, 2 * s), cols[Math.floor(R() * cols.length)], 0.7);
  }
}
export function grassTuft(g, x, y, s, R, pal) {
  g.strokeStyle = pal.tuft || '#3f6a28'; g.lineWidth = 1.4 * s; g.lineCap = 'round';
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(x + (i - 2) * 2 * s, y); g.quadraticCurveTo(x + (i - 2) * 3 * s, y - 5 * s, x + (i - 2) * 4.5 * s + (R() - 0.5) * 2, y - (7 + R() * 5) * s); g.stroke(); }
}
export function reeds(g, x, y, s, R, pal) {
  for (let i = 0; i < 6; i++) {
    const rx = x + (i - 3) * 3 * s + (R() - 0.5) * 2, h = (16 + R() * 12) * s;
    line(g, [[rx, y], [rx + (R() - 0.5) * 4, y - h]], OUT, 2.6); line(g, [[rx, y], [rx + (R() - 0.5) * 4, y - h]], pal.reed || '#7a8a3a', 1.4);
    if (R() < 0.5) toon(g, rrect(rx - 1.6 * s, y - h - 1, 3.2 * s, 7 * s, 1.5), '#6a4a2a', { sd: 0.4, hd: 0.2, lw: 1 });
  }
}
export function stump(g, x, y, s, R, pal) {
  shadowBlob(g, x + 5 * s, y + 1, 12 * s, 4 * s, 0.25);
  cylinder(g, x, y, 8 * s, 3.4 * s, 9 * s, pal.trunk || '#6b4423', { bricks: false, kind: 'wood', topColor: '#c8a070', lw: 1.4 });
}
export function log(g, x, y, s, R, pal) {
  shadowBlob(g, x + 4, y + 2, 22 * s, 5 * s, 0.25);
  toon(g, rrect(x - 20 * s, y - 8 * s, 40 * s, 8 * s, 4 * s), pal.trunk || '#6b4423', { sd: 1.4, hd: 0.6, lw: 1.4 });
  toon(g, ellipse(x + 20 * s, y - 4 * s, 3 * s, 4 * s), '#c8a070', { sd: 0.3, hd: 0.2, lw: 1.2 });
}
export function mushroom(g, x, y, s, R, pal) {
  for (let i = 0; i < 3; i++) {
    const mx = x + (i - 1) * 6 * s, h = (5 + R() * 4) * s;
    toon(g, rrect(mx - 1.4 * s, y - h, 2.8 * s, h, 1), '#efe6d0', { sd: 0.3, hd: 0.2, lw: 1 });
    toon(g, blob([[mx - 5 * s, y - h], [mx, y - h - 5 * s], [mx + 5 * s, y - h], [mx, y - h + 1]], 0.6), pal.mushroom || '#c0392b', { sd: 0.6, hd: 0.5, lw: 1 });
  }
}
export function lily(g, x, y, s, R) {
  toon(g, blob([[x - 9 * s, y], [x - 6 * s, y - 4 * s], [x + 6 * s, y - 4 * s], [x + 9 * s, y], [x, y + 3 * s], [x - 1, y]], 0.6), '#4a8a3a', { sd: 0.6, hd: 0.5, lw: 1.1 });
  if (R() < 0.4) flat(g, star(x + 2 * s, y - 2 * s, 3 * s, 0.5, 6), '#f4d0e8', 0.8);
}
export function crystalRock(g, x, y, s, R, pal) {
  shadowBlob(g, x + 6, y + 1, 18 * s, 6 * s, 0.3);
  for (let i = 0; i < 4; i++) {
    const cx = x + (i - 1.5) * 6 * s, h = (14 + R() * 16) * s, w = (4 + R() * 3) * s;
    toon(g, poly([[cx - w, y], [cx - w * 0.7, y - h * 0.75], [cx, y - h], [cx + w * 0.8, y - h * 0.7], [cx + w, y]]), pal.obsidian || '#2a2630', { sd: 1.4, hd: 1.4, lw: 1.3, light: '#6a6478' });
  }
  if (pal.ember) { g.save(); g.globalCompositeOperation = 'lighter'; glow(g, x, y - 6 * s, 18 * s, pal.ember, 0.35); g.restore(); }
}
export function bones(g, x, y, s, R) {
  for (let i = 0; i < 3; i++) { const a = R() * PI; const bx = x + (R() - 0.5) * 20 * s, by = y + (R() - 0.5) * 6 * s; line(g, [[bx - C(a) * 6 * s, by - S(a) * 2 * s], [bx + C(a) * 6 * s, by + S(a) * 2 * s]], OUT, 3.6); line(g, [[bx - C(a) * 6 * s, by - S(a) * 2 * s], [bx + C(a) * 6 * s, by + S(a) * 2 * s]], '#e8e0cc', 2); }
  if (R() < 0.5) toon(g, circle(x + 6 * s, y - 3 * s, 4 * s), '#e8e0cc', { sd: 0.6, hd: 0.4, lw: 1.1 });
}

// ---------------- structures ----------------
export function cottage(g, x, y, s, R, pal) {
  g.save(); g.translate(x, y); g.scale(s, s);
  shadowBlob(g, 16, 2, 60, 16, 0.3);
  const roof = pal.roofs ? pal.roofs[Math.floor(R() * pal.roofs.length)] : '#a8452c';
  const kind = R() < 0.5 ? 'plaster' : 'timber';
  house(g, 0, 0, 58, 32, 26, { wall: kind === 'plaster' ? '#e8dcc0' : '#a8784a', wallKind: kind, roof, roofKind: pal.thatch && R() < 0.5 ? 'thatch' : 'shingle', depth: 18, overhang: 7, seed: Math.floor(R() * 100) });
  door(g, -10, 0, 12, 18, { color: '#2a1a10', open: false });
  toon(g, rrect(8, -22, 10, 9, 1.5), '#ffd27a', { sd: 0, hd: 0, lw: 1.3 });
  line(g, [[13, -22], [13, -13]], OUT, 1); line(g, [[8, -17.5], [18, -17.5]], OUT, 1);
  if (pal.snowy) { toon(g, blob([[-36, -34], [0, -60], [36, -34], [30, -38], [0, -54], [-30, -38]], 0.5), '#f2f8fc', { sd: 0.6, hd: 0.6, lw: 1.2 }); }
  // chimney
  toon(g, rrect(14, -58, 8, 18, 1.5), '#8d877d', { sd: 0.8, hd: 0.4, lw: 1.3 });
  g.restore();
}
export function barn(g, x, y, s, R, pal) {
  g.save(); g.translate(x, y); g.scale(s, s);
  shadowBlob(g, 18, 2, 70, 18, 0.3);
  house(g, 0, 0, 74, 40, 30, { wall: '#9a3a2a', wallKind: 'timber', roof: '#5a4a3a', roofKind: 'shingle', depth: 22, overhang: 6, seed: 3 });
  toon(g, rect(-14, -32, 28, 32), '#7a2a1e', { sd: 0.8, hd: 0.4, lw: 1.5 });
  line(g, [[-14, -32], [14, 0]], '#e8dcc0', 2); line(g, [[14, -32], [-14, 0]], '#e8dcc0', 2);
  g.restore();
}
export function well(g, x, y, s, R, pal) {
  g.save(); g.translate(x, y); g.scale(s, s);
  shadowBlob(g, 6, 2, 24, 7, 0.3);
  cylinder(g, 0, 0, 14, 6, 12, '#9a958c', { rowH: 6, cols: 6, seed: 4, topColor: '#2a3a4a' });
  for (const sx of [-12, 12]) toon(g, rrect(sx - 1.6, -34, 3.2, 26, 1), '#7a4a24', { sd: 0.5, hd: 0.3, lw: 1.1 });
  toon(g, poly([[-18, -32], [0, -44], [18, -32], [14, -30], [0, -40], [-14, -30]]), '#a8452c', { sd: 0.8, hd: 0.5, lw: 1.3 });
  g.restore();
}
export function fence(g, x1, y1, x2, y2, s, pal) {
  const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / (14 * s)));
  const col = pal.fence || '#9a6a3a';
  for (let i = 0; i <= n; i++) { const t = i / n; const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t; toon(g, rrect(x - 1.6 * s, y - 13 * s, 3.2 * s, 14 * s, 1), col, { sd: 0.5, hd: 0.3, lw: 1.1 }); }
  for (const h of [9, 4]) { line(g, [[x1, y1 - h * s], [x2, y2 - h * s]], OUT, 3.4); line(g, [[x1, y1 - h * s], [x2, y2 - h * s]], col, 1.8); }
}
export function haystack(g, x, y, s) {
  shadowBlob(g, x + 6, y + 2, 20 * s, 6 * s, 0.25);
  toon(g, blob([[x - 16 * s, y], [x - 14 * s, y - 14 * s], [x - 4 * s, y - 24 * s], [x + 8 * s, y - 22 * s], [x + 16 * s, y - 8 * s], [x + 16 * s, y]], 0.6), '#e2c25a', { sd: 2, hd: 1.2, lw: 1.5, detail: c => { c.strokeStyle = 'rgba(120,80,20,0.4)'; c.lineWidth = 1; for (let i = 0; i < 10; i++) { c.beginPath(); c.moveTo(x - 14 * s + i * 3 * s, y); c.lineTo(x - 8 * s + i * 2 * s, y - 20 * s); c.stroke(); } } });
}
export function cart(g, x, y, s) {
  shadowBlob(g, x + 4, y + 2, 26 * s, 7 * s, 0.25);
  toon(g, rrect(x - 18 * s, y - 18 * s, 34 * s, 12 * s, 2), '#8a5a2a', { sd: 1, hd: 0.5, lw: 1.4 });
  for (const wx of [-10, 8]) { toon(g, circle(x + wx * s, y - 5 * s, 6 * s), '#6b4423', { sd: 0.8, hd: 0.5, lw: 1.3 }); toon(g, circle(x + wx * s, y - 5 * s, 1.8 * s), '#3a2a1a', { sd: 0, hd: 0, lw: 0.8 }); }
  line(g, [[x + 16 * s, y - 10 * s], [x + 30 * s, y - 4 * s]], OUT, 3.4); line(g, [[x + 16 * s, y - 10 * s], [x + 30 * s, y - 4 * s]], '#7a4a24', 1.8);
  haystack(g, x - 2 * s, y - 14 * s, 0.5 * s);
}
export function crateStack(g, x, y, s) {
  for (const [dx, dy] of [[-8, 0], [8, 0], [0, -14]]) toon(g, rrect(x + dx * s - 7 * s, y + dy * s - 14 * s, 14 * s, 14 * s, 1.5), '#b07a40', { sd: 1, hd: 0.6, lw: 1.3, detail: c => { c.strokeStyle = 'rgba(70,40,10,0.6)'; c.lineWidth = 1; c.strokeRect(x + dx * s - 5 * s, y + dy * s - 12 * s, 10 * s, 10 * s); } });
}
export function ruinPillar(g, x, y, s, R, pal) {
  const col = pal.ruin || '#a8a39a';
  shadowBlob(g, x + 8, y + 2, 16 * s, 5 * s, 0.3);
  const h = (24 + R() * 30) * s;
  cylinder(g, x, y, 8 * s, 3.4 * s, h, col, { rowH: 8 * s, cols: 4, seed: Math.floor(R() * 50), topColor: dark(col, 0.05), lw: 1.4 });
  toon(g, poly([[x - 9 * s, y - h], [x - 6 * s, y - h - 6 * s], [x + 2 * s, y - h - 3 * s], [x + 9 * s, y - h - 7 * s], [x + 9 * s, y - h]]), col, { sd: 0.8, hd: 0.5, lw: 1.3 });
  if (pal.rockMoss) { g.fillStyle = alpha(pal.rockMoss, 0.7); g.beginPath(); g.ellipse(x - 3 * s, y - h * 0.4, 4 * s, 8 * s, 0, 0, PI * 2); g.fill(); }
}
export function ruinArch(g, x, y, s, R, pal) {
  const col = pal.ruin || '#a8a39a';
  g.save(); g.translate(x, y); g.scale(s, s);
  shadowBlob(g, 10, 2, 44, 10, 0.3);
  const p = new Path2D(); p.moveTo(-34, 0); p.lineTo(-34, -46); p.arc(0, -46, 34, PI, 0); p.lineTo(34, 0); p.lineTo(22, 0); p.lineTo(22, -46); p.arc(0, -46, 22, 0, PI, true); p.lineTo(-22, 0); p.closePath();
  toon(g, p, col, { sd: 2.4, hd: 1.2, lw: 1.6, detail: c => wallBricks(c, -40, -86, 40, 0, { rowH: 9, bw: 14, seed: 7 }) });
  toon(g, poly([[22, -60], [32, -72], [34, -58]]), col, { sd: 0.6, hd: 0.3, lw: 1.3 });
  g.restore();
}
export function statue(g, x, y, s, R, pal) {
  g.save(); g.translate(x, y); g.scale(s, s);
  shadowBlob(g, 8, 2, 22, 6, 0.3);
  toon(g, rrect(-14, -10, 28, 10, 2), pal.ruin || '#a8a39a', { sd: 0.8, hd: 0.5, lw: 1.4 });
  const col = pal.statue || '#8f9a92';
  toon(g, blob([[-8, -10], [-9, -34], [-4, -44], [4, -44], [9, -34], [8, -10]], 0.6), col, { sd: 1.6, hd: 1, lw: 1.5 });
  toon(g, circle(0, -50, 6.5), col, { sd: 1, hd: 0.8, lw: 1.4 });
  line(g, [[8, -34], [14, -60]], OUT, 4); line(g, [[8, -34], [14, -60]], col, 2.4);
  toon(g, poly([[11, -60], [14, -70], [17, -60]]), col, { sd: 0.4, hd: 0.3, lw: 1.1 });
  g.restore();
}
export function tent(g, x, y, s, R, pal) {
  g.save(); g.translate(x, y); g.scale(s, s);
  shadowBlob(g, 10, 2, 34, 9, 0.3);
  const col = R() < 0.5 ? '#c8b080' : '#a8452c';
  toon(g, poly([[-28, 0], [0, -32], [28, 0]]), col, { sd: 2, hd: 1, lw: 1.6 });
  toon(g, poly([[-6, 0], [0, -24], [6, 0]]), '#2a1a10', { sd: 0, hd: 0, lw: 1.2 });
  pole(g, 0, -42, -30, 1.8); banner(g, 1, -41, 10, 7, '#c0392b', { tail: true, wave: 1, lw: 1 });
  g.restore();
}
export function campfire(g, x, y, s) {
  for (let i = 0; i < 6; i++) { const a = i * PI / 3; toon(g, ellipse(x + C(a) * 9 * s, y + S(a) * 4 * s, 3 * s, 2 * s), '#7a746c', { sd: 0.4, hd: 0.2, lw: 1 }); }
  line(g, [[x - 7 * s, y + 2], [x + 7 * s, y - 2]], '#5a3a1a', 3); line(g, [[x - 7 * s, y - 2], [x + 7 * s, y + 2]], '#5a3a1a', 3);
}
export function signpost(g, x, y, s) {
  toon(g, rrect(x - 1.8 * s, y - 30 * s, 3.6 * s, 30 * s, 1), '#7a4a24', { sd: 0.5, hd: 0.3, lw: 1.2 });
  toon(g, poly([[x - 14 * s, y - 28 * s], [x + 10 * s, y - 28 * s], [x + 16 * s, y - 23 * s], [x + 10 * s, y - 18 * s], [x - 14 * s, y - 18 * s]]), '#b08a5a', { sd: 0.6, hd: 0.4, lw: 1.2 });
}
export function banners(g, x, y, s, col) { pole(g, x, y - 46 * s, y, 2.4 * s); banner(g, x + 1, y - 45 * s, 18 * s, 26 * s, col, { tail: true, wave: 1 }); }
export function lavaVent(g, x, y, s, R) {
  toon(g, ellipse(x, y, 16 * s, 7 * s), '#2a2224', { sd: 1, hd: 0.5, lw: 1.4 });
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, x, y - 2, 26 * s, '#ff6a20', 0.6); g.restore();
  flat(g, ellipse(x, y, 10 * s, 4 * s), '#ffb040', 0.8, '#7a1a04');
}
export function iceShard(g, x, y, s, R) {
  shadowBlob(g, x + 6, y + 1, 14 * s, 4 * s, 0.25);
  for (let i = 0; i < 3; i++) { const cx = x + (i - 1) * 6 * s, h = (12 + R() * 14) * s; toon(g, poly([[cx - 4 * s, y], [cx, y - h], [cx + 4 * s, y]]), '#cfeeff', { sd: 0.8, hd: 1, lw: 1.2, light: '#ffffff' }); }
}
export function snowman(g, x, y, s) { /* animated prop handles it */ }

// ---------------- the Great Rampart (wall segment) ----------------
// Draws a stretch of the great wall from (x1,y1) to (x2,y2) with towers; facing the viewer
export function rampartWall(g, x1, y1, x2, y2, o = {}) {
  const H = o.h || 90, T = o.thick || 26;
  const col = o.color || '#a6a196';
  const len = Math.hypot(x2 - x1, y2 - y1);
  const n = Math.max(1, Math.round(len / 34));
  // wall body as a parallelogram strip with top walkway
  const body = poly([[x1, y1], [x2, y2], [x2, y2 - H], [x1, y1 - H]]);
  toon(g, body, col, { sd: 3, hd: 1.4, lw: 2, detail: c => {
    const R = rng(o.seed || 3);
    for (let i = 0; i <= n; i++) for (let r = 0; r < H / 10; r++) {
      const t = (i + (r % 2) * 0.5) / n; const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t - r * 10;
      c.strokeStyle = 'rgba(40,30,20,0.35)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 10); c.stroke();
      if (R() < 0.12) { c.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'; c.fillRect(x + 2, y - 9, 30, 8); }
    }
    for (let r = 0; r <= H / 10; r++) { c.strokeStyle = 'rgba(40,30,20,0.35)'; c.beginPath(); c.moveTo(x1, y1 - r * 10); c.lineTo(x2, y2 - r * 10); c.stroke(); }
    if (o.crack) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#ff8a2a'; c.lineWidth = 2; c.beginPath(); const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2; c.moveTo(cx - 6, cy - H); c.lineTo(cx + 4, cy - H * 0.7); c.lineTo(cx - 8, cy - H * 0.45); c.lineTo(cx + 2, cy); c.stroke(); c.restore(); }
  } });
  // walkway top
  const top = poly([[x1, y1 - H], [x2, y2 - H], [x2 + T * 0.3, y2 - H - T * 0.5], [x1 + T * 0.3, y1 - H - T * 0.5]]);
  toon(g, top, dark(col, 0.08), { sd: 0.6, hd: 0.6, lw: 1.6 });
  // merlons
  for (let i = 0; i < n; i++) { const t = (i + 0.25) / n; const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t - H; toon(g, rrect(x - 6, y - 12, 12, 12, 1.5), col, { sd: 1, hd: 0.6, lw: 1.4 }); }
}
export function wallTower(g, x, y, s, o = {}) {
  const col = o.color || '#a6a196';
  g.save(); g.translate(x, y); g.scale(s, s);
  shadowBlob(g, 18, 4, 50, 14, 0.35);
  const yt = cylinder(g, 0, 0, 30, 12, o.h || 120, col, { rowH: 10, cols: 8, seed: 5, topColor: dark(col, 0.08) });
  merlons(g, 0, yt, 30, 12, 'back', col, { n: 10, h: 9, w: 9 });
  merlons(g, 0, yt, 30, 12, 'front', col, { n: 10, h: 9, w: 9 });
  if (o.beacon) { cylinder(g, 0, yt + 2, 12, 5, 8, '#6a4a2a', { bricks: false, kind: 'wood', topColor: '#3a2a1a' }); if (o.lit) { g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 0, yt - 20, 50, '#ff9a2a', 0.8); g.restore(); flat(g, blob([[-10, yt - 6], [-6, yt - 26], [0, yt - 40], [6, yt - 24], [10, yt - 6]], 0.7), '#ffae3a', 1.2, '#7a2a08'); flat(g, blob([[-4, yt - 6], [0, yt - 24], [4, yt - 6]], 0.7), '#fff3a0', 0); } }
  if (o.banner) banner(g, -6, yt + 14, 12, 34, o.banner, { tail: true, wave: 0.5 });
  g.restore();
}
export function gateArch(g, x, y, s, o = {}) {
  const col = o.color || '#a6a196';
  g.save(); g.translate(x, y); g.scale(s, s);
  shadowBlob(g, 20, 4, 70, 16, 0.35);
  const p = new Path2D(); p.moveTo(-50, 0); p.lineTo(-50, -100); p.lineTo(50, -100); p.lineTo(50, 0); p.lineTo(22, 0); p.lineTo(22, -46); p.arc(0, -46, 22, 0, PI, true); p.lineTo(-22, 0); p.closePath();
  toon(g, p, col, { sd: 3, hd: 1.4, lw: 2, detail: c => wallBricks(c, -50, -100, 50, 0, { rowH: 10, bw: 18, seed: 9, tint: true }) });
  if (o.broken) { toon(g, poly([[-22, 0], [-22, -46], [-10, -62], [8, -58], [22, -40], [22, 0]]), '#1a120c', { sd: 0, hd: 0, lw: 1.5 }); for (let i = 0; i < 6; i++) toon(g, ellipse(-30 + i * 12, -2 + (i % 2) * 3, 7, 4), dark(col, 0.1), { sd: 0.6, hd: 0.4, lw: 1.2 }); }
  else { toon(g, poly([[-22, 0], [-22, -46], [22, -46], [22, 0]]), '#4a3220', { sd: 0.5, hd: 0.3, lw: 1.5 }); for (let x = -18; x < 22; x += 8) line(g, [[x, -60], [x, 0]], '#2a1a10', 1.5); }
  for (let i = 0; i < 6; i++) toon(g, rrect(-50 + i * 18, -112, 12, 13, 1.5), col, { sd: 1, hd: 0.6, lw: 1.4 });
  if (o.banner) { banner(g, -42, -90, 14, 40, o.banner, { tail: true, wave: 0.4 }); banner(g, 28, -90, 14, 40, o.banner, { tail: true, wave: 0.4 }); }
  g.restore();
}

// =====================================================================================
// ASH THEME (Chapter IV — Heart of Ash). Painter passes, called from genmap.js when th.ash:
// ashGround -> ashLavaRiver / ashLavaLake -> ashCliff -> ashRoad -> ashBridge -> ashOccupy / ashScatter
// -> ashDeco (every item) -> ashAtmosphere. Ash structures are deco types prefixed 'ash' (see ASH_CLEAR).
// =====================================================================================
const ASH = { lights: [], lava: [], lavaPaths: [], covers: [], shades: [], M: {}, md: null };   // per-map state, reset by ashGround()
const ASH_MOOD = {
  ash: { pale: '#8a8580', basalt: '#1a1819', ripple: '#b2aea8', ambient: '#bab4b6', glow: 0.48, smoke: '#221c1c', embers: 1, sky: [255, 90, 30, 0.12] },
  glass: { pale: '#7e7a86', basalt: '#16141c', ripple: '#b0acbc', ambient: '#bdb6c4', glow: 0.5, smoke: '#1c1a24', embers: 0.7, sky: [255, 100, 50, 0.08] },
  shadow: { pale: '#6e6476', basalt: '#14101a', ripple: '#968ca6', ambient: '#a99bb4', glow: 0.6, smoke: '#18121e', embers: 0.45, sky: [150, 60, 170, 0.1] },
  crater: { pale: '#83705f', basalt: '#1a1012', ripple: '#ab917e', ambient: '#c9a191', glow: 0.7, smoke: '#2a1410', embers: 1.25, sky: [255, 70, 20, 0.2] },
};
export const ASH_CLEAR = { ashHut: 92, ashTotem: 30, ashBrazier: 28, ashForge: 80, ashRack: 40, ashCairn: 30, ashMonolith: 70, ashColumn: 38, ashTemple: 150, ashDome: 150, ashStatue: 40,
  ashSeal: 46, ashSkull: 90, ashRibs: 110, ashSwords: 40, ashBarricade: 60, ashGate: 150, ashCannon: 55, ashStones: 60, ashGlow: 0, ashWisps: 0, ashDrywall: 0, ashChains: 50, ashPyre: 50, ashTowerRuin: 80 };

const ashSS = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ashRGB = h => { h = h.replace('#', ''); const v = parseInt(h, 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
function ashHash(x, y, k = 0) { let h = Math.imul((Math.round(x) * 73856093) ^ (Math.round(y) * 19349663) ^ (k * 83492791), 0x5bd1e995); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; }
function ashCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function ashPolyline(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
export function ashLight(x, y, r, color = '#ff6a20', a = 0.5) { ASH.lights.push({ x, y, r, color, a }); }
function ashSegDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)); return Math.hypot(px - ax - dx * t, py - ay - dy * t); }
function ashLavaDist(x, y) { let d = Infinity; for (const L of ASH.lava) for (let i = 0; i < L.pts.length - 1; i++) d = Math.min(d, ashSegDist(x, y, L.pts[i][0], L.pts[i][1], L.pts[i + 1][0], L.pts[i + 1][1]) - L.w / 2); return d; }
// irregular polygon around (x,y)
function ashBlobPts(x, y, r, k, R, sq = 0.7, j = 0.35) { const p = []; const a0 = R() * PI; for (let i = 0; i < k; i++) { const a = a0 + (i / k) * PI * 2 + (R() - 0.5) * 0.5; const rr = r * (1 - j / 2 + R() * j); p.push([x + C(a) * rr, y + S(a) * rr * sq]); } return p; }
// Voronoi cells (convex polygons) of `sites` inside a box, computed in a y-stretched space (sq = perspective squash)
function ashClipHalf(P, mx, my, nx, ny) {
  const out = [], f = p => (p[0] - mx) * nx + (p[1] - my) * ny;
  for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], fa = f(a), fb = f(b); if (fa <= 0) out.push(a); if ((fa <= 0) !== (fb <= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
  return out;
}
function ashVoronoi(sites, x0, y0, x1, y1, sq = 0.7, reach = 260) {
  const st = sites.map(([x, y]) => [x, y / sq]);
  return st.map(([sx, sy]) => {
    let P = [[x0, y0 / sq], [x1, y0 / sq], [x1, y1 / sq], [x0, y1 / sq]];
    for (const [tx, ty] of st) { if ((tx === sx && ty === sy) || Math.abs(tx - sx) > reach || Math.abs(ty - sy) > reach) continue; P = ashClipHalf(P, (sx + tx) / 2, (sy + ty) / 2, tx - sx, ty - sy); if (!P.length) break; }
    return { site: [sx, sy * sq], pts: P.map(([x, y]) => [x, y * sq]) };
  });
}
// pull a convex polygon toward its centroid by `gap` units
function ashInset(P, gap) {
  const cx = P.reduce((a, p) => a + p[0], 0) / P.length, cy = P.reduce((a, p) => a + p[1], 0) / P.length;
  return P.map(([x, y]) => { const d = Math.hypot(x - cx, y - cy) || 1, k = Math.min(0.6, gap / d); return [x + (cx - x) * k, y + (cy - y) * k]; });
}
// closed Catmull-Rom densify (outline of decals)
function ashClosed(pts, n = 8) {
  const out = [], L = pts.length;
  for (let i = 0; i < L; i++) {
    const p0 = pts[(i - 1 + L) % L], p1 = pts[i], p2 = pts[(i + 1) % L], p3 = pts[(i + 2) % L];
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
  }
  return out;
}
// all crossings of the vertical line x with a closed outline (sorted y)
function ashCross(P, x) {
  const ys = [];
  for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; if ((a[0] <= x) !== (b[0] <= x)) ys.push(a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])); }
  return ys.sort((a, b) => a - b);
}
// a wall of basalt columns hanging below a rim: rim(x) gives the top y (or null); depth = face height
function ashColumnWall(g, x0, x1, rim, depth, R, o = {}) {
  const base = o.color || '#3a3536', capC = light(base, 0.2), voidC = o.voidColor || '#120e12';
  for (let x = x0; x < x1;) {
    const w = 15 + R() * 9, y = rim(x + w / 2);
    if (y == null) { x += w; continue; }
    const rise = 2 + R() * 11, hh = depth * (0.85 + R() * 0.3), top = y - rise, bot = y + hh, mx = x + w / 2, lit = R() * 0.08;
    g.fillStyle = lg(g, 0, top, 0, bot, [[0, light(base, 0.1 + lit)], [0.3, base], [0.75, dark(base, 0.14)], [1, o.fade ? voidC : dark(base, 0.22)]]); g.fillRect(x, top, w + 0.6, bot - top);
    g.fillStyle = 'rgba(255,236,220,0.08)'; g.fillRect(x, top, w * 0.45, bot - top);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + w * 0.7, top, w * 0.3, bot - top);
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke();
    if (R() < 0.35) { g.strokeStyle = 'rgba(0,0,0,0.4)'; const yy = top + R() * (bot - top) * 0.7; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy + (R() - 0.5) * 3); g.stroke(); }
    if (!o.noCaps) toon(g, poly([[x, top], [x + w * 0.25, top - 4], [x + w * 0.75, top - 4], [x + w, top], [x + w * 0.75, top + 3.5], [x + w * 0.25, top + 3.5]]), capC, { sd: 0.6, hd: 0.5, lw: 1.1 });
    x += w;
  }
}
// a cooled crust plate: dark slab, warm under-glow at the rim, pale top-left edge
function ashPlate(g, P, R, col = '#2c1711') {
  const p = blob(P, 0.22);
  g.strokeStyle = 'rgba(255,200,110,0.55)'; g.lineWidth = 3; g.stroke(p);
  g.fillStyle = col; g.fill(p);
  g.save(); g.clip(p); g.strokeStyle = 'rgba(255,80,20,0.45)'; g.lineWidth = 6; g.stroke(p);
  g.translate(1.6, 2.2); g.strokeStyle = 'rgba(176,130,108,0.5)'; g.lineWidth = 1.7; g.stroke(p); g.restore();
  g.strokeStyle = 'rgba(20,8,4,0.7)'; g.lineWidth = 0.9; g.stroke(p);
}

// ---------------- ground ----------------
export function ashGround(g, { M, R, N, W, H }) {
  ASH.lights = []; ASH.lavaPaths = []; ASH.covers = []; ASH.shades = []; ASH.M = M;
  ASH.lava = [...(M.rivers || []).map(r => ({ pts: r.pts, w: r.w || 90 })), ...(M.lakes || []).map(l => ({ pts: [...l.pts, l.pts[0]], w: 40 }))];
  const md = ASH.md = ASH_MOOD[M.mood] || ASH_MOOD.ash;
  const drift = (x, y) => N.fbm(x / 560 + 7.3, y / 560 + 3.1, 4);
  // 1. tonal zones: pale wind-blown ash drifts and dark basalt flats
  const lw = 300, lh = 169, cv = ashCanvas(lw, lh), cg = cv.getContext('2d'), id = cg.createImageData(lw, lh), d = id.data;
  const pc = ashRGB(md.pale), bc = ashRGB(md.basalt);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const wx = x * W / lw, wy = y * H / lh, n = drift(wx, wy), m = N.fbm(wx / 150 + 40, wy / 150 + 9, 3);
    const p = ashSS(0.52, 0.68, n + (m - 0.5) * 0.14) * (M.drift ?? 1), k = ashSS(0.47, 0.32, n - (m - 0.5) * 0.12) * (M.basalt ?? 1);
    const i = (y * lw + x) * 4, src = p >= k ? pc : bc;
    d[i] = src[0]; d[i + 1] = src[1]; d[i + 2] = src[2]; d[i + 3] = Math.min(255, p >= k ? p * 130 * (0.7 + m * 0.6) : k * 165);
  }
  cg.putImageData(id, 0, 0);
  g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(cv, 0, 0, W, H); g.restore();
  // 2. wind ripples on the drifts (light crest + soft shadow)
  const wa = M.wind ?? -0.2, cw = C(wa), sw = S(wa);
  g.lineCap = 'round';
  for (let i = 0; i < 3200; i++) {
    const x = R() * W, y = R() * H, p = ashSS(0.5, 0.66, drift(x, y)) * (M.drift ?? 1);
    if (R() > p * 0.95) continue;
    const L = 12 + R() * 26, k = 2 + Math.floor(R() * 3), bend = 2 + R() * 5;
    for (let j = 0; j < k; j++) {
      const ox = x - sw * j * 7, oy = y + cw * j * 7, L2 = L * (1 - j * 0.15);
      const ax = ox - cw * L2 / 2, ay = oy - sw * L2 / 2, bx = ox + cw * L2 / 2, by = oy + sw * L2 / 2, qx = ox + sw * bend, qy = oy - cw * bend;
      g.strokeStyle = alpha(md.ripple, 0.2 + p * 0.12); g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(qx, qy, bx, by); g.stroke();
      g.strokeStyle = 'rgba(18,12,10,0.16)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(ax, ay + 2); g.quadraticCurveTo(qx, qy + 2, bx, by + 2); g.stroke();
    }
  }
  // 2b. cracked basalt pavement on the dark flats
  const ps = []; let pr = 0;
  for (let y = -40; y < H + 60; y += 62, pr++) for (let x = -40 + (pr % 2) * 42; x < W + 60; x += 84) ps.push([x + (R() - 0.5) * 50, y + (R() - 0.5) * 36]);
  for (const c of ashVoronoi(ps, -60, -60, W + 60, H + 60, 0.7, 200)) {
    const k = ashSS(0.47, 0.35, drift(c.site[0], c.site[1])) * (M.basalt ?? 1);
    if (k < 0.12 || c.pts.length < 3) continue;
    const P = poly(c.pts);
    g.fillStyle = R() < 0.5 ? `rgba(255,236,214,${0.03 * k})` : `rgba(0,0,0,${0.07 * k})`; g.fill(poly(ashInset(c.pts, 2)));
    g.save(); g.translate(0, 1.4); g.strokeStyle = `rgba(150,132,116,${0.09 * k})`; g.lineWidth = 1; g.stroke(P); g.restore();
    g.strokeStyle = `rgba(10,6,6,${0.26 * k})`; g.lineWidth = 1.2; g.stroke(P);
  }
  // 3. scorch blotches
  for (let i = 0; i < (M.scorch ?? 16); i++) {
    const x = R() * W, y = R() * H, r = 50 + R() * 120;
    g.save(); g.translate(x, y); g.scale(1, 0.55);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, 'rgba(12,8,8,0.34)'); gr.addColorStop(0.6, 'rgba(12,8,8,0.16)'); gr.addColorStop(1, 'rgba(12,8,8,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, PI * 2); g.fill(); g.restore();
  }
  // 4. ground decals (fields, glass flows, shadow pools, mosaics, the crater...); `over` decals are painted with the items
  ASH.N = N;
  for (const dc of M.decals || []) if (!dc.over) ashDecal(g, dc, R, N);
  // 5. crack networks; near lava (or on hot maps) they glow
  const cracks = [];
  const grow = (x, y, a, steps, w, hot, depth) => {
    const pts = [[x, y]];
    for (let k = 0; k < steps; k++) {
      a += (R() - 0.5) * 0.9; const l = 8 + R() * 12; x += C(a) * l; y += S(a) * l * 0.68; pts.push([x, y]);
      if (depth < 2 && R() < 0.24) grow(x, y, a + (R() < 0.5 ? -1 : 1) * (0.6 + R() * 0.7), Math.max(2, Math.floor(steps * 0.55)), w * 0.62, hot, depth + 1);
    }
    cracks.push({ pts, w, hot });
  };
  for (let i = 0; i < (M.cracks ?? 70); i++) {
    const x = R() * W, y = R() * H;
    if (drift(x, y) > 0.56 && R() < 0.75) continue;
    const ld = ashLavaDist(x, y);
    grow(x, y, R() * PI * 2, 4 + Math.floor(R() * 7), 1.6 + R() * 1.4, R() < (M.hot ?? 0.12) + (ld < 240 ? 0.75 : 0), 0);
  }
  for (const cr of cracks) {
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.strokeStyle = 'rgba(150,130,112,0.16)'; g.lineWidth = cr.w * 0.8; g.save(); g.translate(0, 1.4); ashPolyline(g, cr.pts); g.restore();
    g.strokeStyle = '#120c0b'; g.lineWidth = cr.w; ashPolyline(g, cr.pts);
  }
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const cr of cracks) {
    if (!cr.hot) continue;
    g.strokeStyle = 'rgba(255,80,16,0.22)'; g.lineWidth = cr.w * 4.2; ashPolyline(g, cr.pts);
    g.strokeStyle = 'rgba(255,120,30,0.55)'; g.lineWidth = cr.w * 1.3; ashPolyline(g, cr.pts);
    g.strokeStyle = 'rgba(255,220,140,0.75)'; g.lineWidth = cr.w * 0.45; ashPolyline(g, cr.pts);
    for (let k = 0; k < cr.pts.length; k += 3) ashLight(cr.pts[k][0], cr.pts[k][1], 46, '#ff5a14', 0.12);
  }
  g.restore();
  // 6. grit: cinders and pale pumice specks
  for (let i = 0; i < 9000; i++) {
    const x = R() * W, y = R() * H, pale = R() < 0.35;
    g.fillStyle = pale ? 'rgba(170,156,140,0.28)' : 'rgba(14,10,9,0.32)';
    g.beginPath(); g.ellipse(x, y, 0.8 + R() * 1.8, 0.6 + R() * 1.1, 0, 0, PI * 2); g.fill();
  }
}

// ground decals: { t: 'field'|'glass'|'shadow'|'scorch'|'starfloor'|'pit'|'slope'|'paving', ... }
function ashDecal(g, d, R, N) {
  switch (d.t) {
    case 'scorch': {
      g.save(); g.translate(d.x, d.y); g.scale(1, d.ry ?? 0.55);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, d.r); gr.addColorStop(0, 'rgba(8,5,5,0.55)'); gr.addColorStop(0.7, 'rgba(8,5,5,0.25)'); gr.addColorStop(1, 'rgba(8,5,5,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, d.r, 0, PI * 2); g.fill(); g.restore(); break;
    }
    case 'field': ashField(g, d, R); break;
    case 'glass': ashGlassFlow(g, d, R); break;
    case 'shadow': ashShadowPool(g, d, R); break;
    case 'starfloor': ashStarFloor(g, d, R); break;
    case 'pit': ashPit(g, d, R, N); break;
    case 'slope': ashSlope(g, d, R, N); break;
    case 'paving': ashPaving(g, d, R); break;
    case 'grass': ashGrass(g, d, R); break;
    case 'chasm': ashChasm(g, d, R, N); break;
  }
}
// ash-folk tuber field: dark tilled furrows with ember-red fire-lichen sprouts and a stone border
function ashField(g, d, R) {
  const P = blob(d.pts, 0.35);
  g.save(); g.fillStyle = '#2c2422'; g.fill(P); g.clip(P);
  const xs = d.pts.map(p => p[0]), ys = d.pts.map(p => p[1]);
  const x0 = Math.min(...xs) - 20, x1 = Math.max(...xs) + 20, y0 = Math.min(...ys) - 10, y1 = Math.max(...ys) + 10, sl = d.slant || 0;
  for (let y = y0; y < y1; y += 13) {
    g.strokeStyle = '#3e3430'; g.lineWidth = 7; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y + sl); g.stroke();
    g.strokeStyle = 'rgba(120,104,92,0.35)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x0, y - 2.5); g.lineTo(x1, y - 2.5 + sl); g.stroke();
    g.strokeStyle = 'rgba(8,5,5,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y + 4.5); g.lineTo(x1, y + 4.5 + sl); g.stroke();
    for (let x = x0 + R() * 10; x < x1; x += 9 + R() * 8) {
      const yy = y + sl * (x - x0) / (x1 - x0) - 3;
      const col = R() < 0.7 ? '#c8401a' : '#e8803a';
      g.strokeStyle = col; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, yy + 2); g.lineTo(x - 2, yy - 4); g.moveTo(x, yy + 2); g.lineTo(x + 2.5, yy - 3.5); g.stroke();
    }
  }
  g.restore();
  g.lineJoin = 'round'; g.strokeStyle = OUT; g.lineWidth = 2.2; g.stroke(P);
  // low border stones
  const pts = d.pts.concat([d.pts[0]]);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay) / 16));
    for (let k = 0; k < n; k++) { const t = k / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t; toon(g, ellipse(x, y - 2, 6 + R() * 3, 4 + R() * 1.5), '#4a4442', { sd: 1, hd: 0.8, lw: 1.1, light: '#6a6260' }); }
  }
}
// obsidian glass flow: glossy black sheet with sky and ember reflections, a crisp lit rim
// outline of a glass flow: densified, lobed and finely chipped (deterministic, shared with ashOccupy)
function ashGlassOutline(d) {
  if (d._ol) return d._ol;
  const P = ashClosed(d.pts, 10), cx = P.reduce((a, p) => a + p[0], 0) / P.length, cy = P.reduce((a, p) => a + p[1], 0) / P.length;
  const f1 = ashHash(cx, cy, 3) * 6.3, f2 = ashHash(cx, cy, 4) * 6.3;
  d._ol = P.map(([x, y]) => {
    const a = Math.atan2((y - cy) / 0.6, x - cx), k = 1 + 0.06 * S(3 * a + f1) + 0.035 * S(7 * a + f2) + (ashHash(x, y, 5) - 0.5) * 0.045;
    return [cx + (x - cx) * k, cy + (y - cy) * k];
  });
  return d._ol;
}
// a frozen flow of volcanic glass: conchoidal facets catching the cold sky, fracture glints, ember reflections
function ashGlassFlow(g, d, R) {
  const O = ashGlassOutline(d), P = poly(O), xs = O.map(p => p[0]), ys = O.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), w = x1 - x0, h = y1 - y0;
  // rough rim of chipped glass and its shadow
  g.save(); g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 16; g.shadowOffsetY = 6; g.lineJoin = 'round'; g.strokeStyle = '#17141c'; g.lineWidth = 10; g.stroke(P); g.fillStyle = '#0d0b12'; g.fill(P); g.restore();
  g.save(); g.clip(P);
  g.fillStyle = lg(g, x0, y0, x1, y1, [[0, '#34344e'], [0.3, '#14121c'], [0.55, '#1b1927'], [0.8, '#0e0c12'], [1, '#43201a']]); g.fillRect(x0, y0, w, h);
  // conchoidal facets: each plane tilts toward or away from the cold light
  const sites = []; for (let i = 0; i < Math.max(8, (w * h) / 2400); i++) sites.push([x0 + R() * w, y0 + R() * h]);
  for (const c of ashVoronoi(sites, x0 - 20, y0 - 20, x1 + 20, y1 + 20, 0.7, 220)) {
    if (c.pts.length < 3) continue;
    const a = R() * PI * 2, lit = 0.5 + 0.5 * C(a - 3.9), F = poly(c.pts);
    g.fillStyle = lit > 0.72 ? `rgba(130,140,205,${0.08 + (lit - 0.72) * 0.55})` : lit < 0.32 ? `rgba(0,0,0,${0.08 + (0.32 - lit) * 0.9})` : 'rgba(46,42,70,0.08)';
    g.fill(F);
    // ripple marks of the fracture around its point of impact
    if (R() < 0.6) { const [sx, sy] = c.site; g.strokeStyle = `rgba(160,170,230,${0.05 + lit * 0.08})`; g.lineWidth = 1; for (let r = 7; r < 34; r += 6 + R() * 3) { g.beginPath(); g.ellipse(sx, sy, r, r * 0.62, a, -0.9, 0.9); g.stroke(); } }
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1.5; g.stroke(F);
    g.save(); g.translate(-0.9, -1.1); g.strokeStyle = `rgba(196,204,255,${0.1 + lit * 0.22})`; g.lineWidth = 0.9; g.stroke(F); g.restore();
  }
  // broad diagonal sheen bands
  for (let i = 0; i < 3; i++) { const t = 0.15 + i * 0.3 + R() * 0.1, cx = x0 + w * t; g.fillStyle = lg(g, cx - 40, y0, cx + 40, y1, [[0, 'rgba(160,170,230,0)'], [0.5, 'rgba(160,170,230,0.12)'], [1, 'rgba(160,170,230,0)']]); g.beginPath(); g.moveTo(cx - 30, y0); g.lineTo(cx + 10, y0); g.lineTo(cx - 40, y1); g.lineTo(cx - 80, y1); g.fill(); }
  // sharp specular glints and a warm ember reflection
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) { const x = x0 + R() * w * 0.8, y = y0 + R() * h * 0.7; g.strokeStyle = 'rgba(220,228,255,0.55)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 16 + R() * 22, y - 6 - R() * 6); g.stroke(); }
  glow(g, x1 - w * 0.25, y1 - h * 0.3, Math.min(w, h) * 0.5, '#ff5a20', 0.16);
  g.restore();
  g.lineJoin = 'round'; g.strokeStyle = '#06050a'; g.lineWidth = 2.4; g.stroke(P);
  g.save(); g.clip(P); g.translate(1.5, 2.2); g.strokeStyle = 'rgba(190,196,240,0.5)'; g.lineWidth = 1.5; g.stroke(P); g.restore();
  // shards and chips growing from the rim
  for (let i = 0; i < 4 + w / 60; i++) { const [px, py] = O[Math.floor(R() * O.length)]; ashShard(g, px, py + 3, 3 + R() * 3, 10 + R() * 16, (R() - 0.5) * 0.6); }
}
// last hardy grass (near the Rampart): faded green-gold tint with dry tufts
function ashGrass(g, d, R) {
  g.save(); g.translate(d.x, d.y); g.scale(1, d.ry ?? 0.45);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, d.r); gr.addColorStop(0, 'rgba(110,120,60,0.5)'); gr.addColorStop(0.6, 'rgba(100,104,56,0.25)'); gr.addColorStop(1, 'rgba(90,90,50,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, d.r, 0, PI * 2); g.fill(); g.restore();
  g.lineCap = 'round';
  for (let i = 0; i < d.r * 0.5; i++) {
    const a = R() * PI * 2, rr = Math.sqrt(R()) * d.r * 0.85, x = d.x + C(a) * rr, y = d.y + S(a) * rr * (d.ry ?? 0.45), k = 0.7 + R() * 0.5, col = R() < 0.4 ? '#8a9a48' : R() < 0.7 ? '#a8a058' : '#6a7a3a';
    g.strokeStyle = col; g.lineWidth = 1.3;
    for (let j = 0; j < 4; j++) { g.beginPath(); g.moveTo(x + (j - 1.5) * 2 * k, y); g.quadraticCurveTo(x + (j - 1.5) * 3 * k, y - 4 * k, x + (j - 1.5) * 4.5 * k + (R() - 0.5) * 2, y - (6 + R() * 5) * k); g.stroke(); }
  }
}
// a chasm of shadow: void with basalt walls on the far side, a broken lip on the near side, violet mist below
function ashChasm(g, d, R, N) {
  const P = ashClosed(d.pts, 10), Pp = poly(P), depth = d.depth || 110;
  const xs = P.map(p => p[0]), ys = P.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 24; g.fillStyle = '#08060c'; g.fill(Pp); g.restore();
  g.save(); g.clip(Pp);
  g.fillStyle = lg(g, 0, y0, 0, y1, [[0, '#0e0a12'], [1, '#040208']]); g.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8);
  ashColumnWall(g, x0, x1, x => { const c = ashCross(P, x); return c.length ? c[0] : null; }, depth, R, { color: d.color || '#332f33', fade: true, voidColor: '#0a070e', noCaps: true });
  // mist rising from below
  const mc = d.mist || [120, 70, 170];
  for (let i = 0; i < (x1 - x0) / 40; i++) { const x = x0 + R() * (x1 - x0), c = ashCross(P, x); if (c.length < 2) continue; const y = c[0] + depth * 0.8 + R() * Math.max(10, c[c.length - 1] - c[0] - depth * 0.8), r = 40 + R() * 70; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${mc[0]},${mc[1]},${mc[2]},0.22)`); gr.addColorStop(1, `rgba(${mc[0]},${mc[1]},${mc[2]},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  g.restore();
  // caps along the far rim, rubble along the near lip
  for (let x = x0 + 4; x < x1 - 4; x += 16 + R() * 6) {
    const c = ashCross(P, x); if (c.length < 2) continue;
    const w = 15 + R() * 6, top = c[0] - 1 - R() * 6;
    toon(g, poly([[x - w / 2, top], [x - w / 4, top - 3.5], [x + w / 4, top - 3.5], [x + w / 2, top], [x + w / 4, top + 3], [x - w / 4, top + 3]]), '#5a5456', { sd: 0.6, hd: 0.5, lw: 1.1 });
    if (R() < 0.7) toon(g, poly(ashBlobPts(x + (R() - 0.5) * 8, c[c.length - 1] + 2, 3 + R() * 5, 5, R, 0.6)), R() < 0.5 ? '#3c3638' : '#2c2729', { sd: 0.8, hd: 0.7, lw: 1, light: '#6a6264' });
  }
  g.lineJoin = 'round'; g.strokeStyle = OUT; g.lineWidth = 2.2; g.stroke(Pp);
  if (d.glow) ashLight((x0 + x1) / 2, (y0 + y1) / 2 + depth * 0.4, Math.max(x1 - x0, y1 - y0) * 0.7, d.glow, 0.35);
}
// pool of creeping shadow (the ravine): violet-black mist with faint swirls
function ashShadowPool(g, d, R) {
  g.save(); g.translate(d.x, d.y); g.scale(1, d.ry ?? 0.5);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, d.r); gr.addColorStop(0, 'rgba(10,4,18,0.78)'); gr.addColorStop(0.55, 'rgba(22,10,34,0.5)'); gr.addColorStop(1, 'rgba(30,14,44,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, d.r, 0, PI * 2); g.fill();
  g.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const r = d.r * (0.25 + R() * 0.6), a = R() * PI * 2, l = 0.6 + R() * 1.2; g.strokeStyle = `rgba(150,110,200,${0.08 + R() * 0.1})`; g.lineWidth = 2 + R() * 3; g.beginPath(); g.arc(0, 0, r, a, a + l); g.stroke(); }
  g.restore();
}
// star-temple mosaic floor: pale disc, eight-pointed star inlay, rings of glyph tiles, half-buried in ash
function ashStarFloor(g, d, R) {
  const r = d.r || 160, sy = d.ry ?? 0.55;
  g.save(); g.translate(d.x, d.y); g.scale(1, sy);
  g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 12; g.shadowOffsetY = 5;
  g.fillStyle = '#6e665e'; g.beginPath(); g.arc(0, 0, r + 10, 0, PI * 2); g.fill(); g.shadowColor = 'transparent';
  g.fillStyle = '#a8a092'; g.beginPath(); g.arc(0, 0, r, 0, PI * 2); g.fill();
  g.strokeStyle = 'rgba(40,30,24,0.55)'; g.lineWidth = 2;
  for (const k of [1, 0.82, 0.62]) { g.beginPath(); g.arc(0, 0, r * k, 0, PI * 2); g.stroke(); }
  // glyph tiles in the outer ring
  for (let i = 0; i < 32; i++) { const a = (i / 32) * PI * 2; g.beginPath(); g.moveTo(C(a) * r * 0.82, S(a) * r * 0.82); g.lineTo(C(a) * r, S(a) * r); g.stroke(); if (i % 2) { g.fillStyle = 'rgba(60,70,110,0.5)'; g.beginPath(); g.arc(C(a + 0.1) * r * 0.91, S(a + 0.1) * r * 0.91, 3, 0, PI * 2); g.fill(); } }
  // star inlay
  const st = star(0, 0, r * 0.6, 0.42, 8, -PI / 2);
  g.fillStyle = '#3a3e5a'; g.fill(st); g.strokeStyle = '#c9a85a'; g.lineWidth = 3; g.stroke(st);
  const st2 = star(0, 0, r * 0.32, 0.5, 8, -PI / 2 + PI / 8); g.fillStyle = '#d8b862'; g.fill(st2); g.strokeStyle = 'rgba(40,30,20,0.6)'; g.lineWidth = 1.5; g.stroke(st2);
  g.fillStyle = '#f4e6b0'; g.beginPath(); g.arc(0, 0, r * 0.08, 0, PI * 2); g.fill();
  // cracks and ash drifts covering parts
  g.strokeStyle = 'rgba(30,22,18,0.7)'; g.lineWidth = 1.6;
  for (let i = 0; i < 9; i++) { let x = (R() - 0.5) * r * 1.4, y = (R() - 0.5) * r * 1.4; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (R() - 0.5) * 40; y += (R() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 6; i++) { const a = R() * PI * 2, dd = r * (0.5 + R() * 0.6), rr = r * (0.25 + R() * 0.3); const gr = g.createRadialGradient(C(a) * dd, S(a) * dd, 0, C(a) * dd, S(a) * dd, rr); gr.addColorStop(0, 'rgba(84,76,70,0.85)'); gr.addColorStop(1, 'rgba(84,76,70,0)'); g.fillStyle = gr; g.beginPath(); g.arc(C(a) * dd, S(a) * dd, rr, 0, PI * 2); g.fill(); }
  g.restore();
  if (d.glow) { ashLight(d.x, d.y, r * 1.2, '#8aa8ff', 0.25); }
}
// paved plaza (polygon): worn flagstones half-buried in ash
function ashPaving(g, d, R) {
  const P = blob(d.pts, 0.3), xs = d.pts.map(p => p[0]), ys = d.pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  g.save(); g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 12; g.fillStyle = '#2e2926'; g.fill(P); g.restore();
  g.save(); g.clip(P);
  // irregular flagstones (Voronoi slabs, squashed by the view); a few are missing, leaving ash-filled hollows
  const ps = []; for (let y = y0 - 30, r = 0; y < y1 + 40; y += 34, r++) for (let x = x0 - 30 + (r % 2) * 24; x < x1 + 40; x += 48) ps.push([x + (R() - 0.5) * 18, y + (R() - 0.5) * 12]);
  for (const c of ashVoronoi(ps, x0 - 40, y0 - 40, x1 + 40, y1 + 40, 0.7, 160)) {
    if (c.pts.length < 3 || R() < 0.04) continue;
    const Q = poly(ashInset(c.pts, 2.2)), [sx, sy] = c.site;
    g.fillStyle = mix('#776f64', '#9d9488', R()); g.fill(Q);
    g.save(); g.clip(Q); g.translate(1.6, 2.2); g.strokeStyle = 'rgba(255,246,230,0.16)'; g.lineWidth = 2.2; g.stroke(Q); g.restore();
    g.strokeStyle = 'rgba(24,18,16,0.55)'; g.lineWidth = 1.2; g.stroke(Q);
    if (R() < 0.14) { g.strokeStyle = 'rgba(30,22,18,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(sx - 12, sy - 6); g.lineTo(sx + (R() - 0.5) * 8, sy + (R() - 0.5) * 6); g.lineTo(sx + 10, sy + 8); g.stroke(); }
    if (R() < 0.05) { g.save(); g.globalAlpha = 0.28; flat(g, star(sx, sy, 6, 0.45, 8), '#3a3430', 0); g.restore(); } // worn star-mark of the watchers
  }
  // drifted ash and soot over the stones
  for (let i = 0; i < 12; i++) { const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), r = 30 + R() * 70, c = R() < 0.55 ? '112,102,94' : '26,20,18'; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${c},0.5)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  g.restore();
  g.lineJoin = 'round'; g.strokeStyle = 'rgba(20,14,10,0.75)'; g.lineWidth = 2.2; g.stroke(P);
  // broken edge: loose stones along the rim
  const O = ashClosed(d.pts, 6);
  for (let i = 0; i < O.length; i += 2) { if (R() < 0.6) continue; const [x, y] = O[i]; toon(g, poly(ashBlobPts(x + (R() - 0.5) * 10, y + (R() - 0.5) * 6, 3 + R() * 5, 5, R, 0.7)), R() < 0.5 ? '#6e665c' : '#575048', { sd: 0.8, hd: 0.7, lw: 1, light: '#9a9084' }); }
}
// the Heart's cradle: a deep glowing pit with terraced walls (crater floor)
function ashPit(g, d, R, N) {
  const rx = d.rx || 260, ry = d.ry || 140, terr = d.terraces || 5;
  if (d.over) ASH.covers.push(ellipse(d.x, d.y + ry * 0.05, rx * 1.08, ry * 1.12)); // keeps its glow over lava running beneath
  ASH.shades.push({ x: d.x, y: d.y + ry * 0.05, rx: rx * 1.04, ry: ry * 1.08, cx: d.x, cy: d.y + ry * 0.36, core: rx * 0.26, k: d.shade ?? 0.78 });
  g.save(); g.translate(d.x, d.y);
  // scorched halo with radiating hot veins
  let gr = g.createRadialGradient(0, 0, rx * 0.4, 0, 0, rx * 1.9); gr.addColorStop(0, 'rgba(8,3,3,0.7)'); gr.addColorStop(1, 'rgba(8,3,3,0)');
  g.save(); g.scale(1, ry / rx); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx * 1.9, 0, PI * 2); g.fill(); g.restore();
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let i = 0; i < 26; i++) { const a = (i / 26) * PI * 2 + R() * 0.2; let px = C(a) * rx * 0.95, py = S(a) * ry * 0.95; const pts = [[px, py]]; let aa = a; for (let k = 0; k < 7; k++) { aa += (R() - 0.5) * 0.5; px += C(aa) * (16 + R() * 18); py += S(aa) * (10 + R() * 12); pts.push([px, py]); } g.strokeStyle = 'rgba(255,90,20,0.3)'; g.lineWidth = 6; ashPolyline(g, pts); g.strokeStyle = 'rgba(255,200,110,0.65)'; g.lineWidth = 1.6; ashPolyline(g, pts); }
  g.restore();
  // terraces stepping down: each ring shows its lit floor and the dark wall below its lip
  for (let i = 0; i < terr; i++) {
    const k = 1 - i / (terr + 0.6), kx = rx * k, ky = ry * k, dy = i * ry * 0.07;
    const pts = []; for (let j = 0; j < 48; j++) { const a = (j / 48) * PI * 2; const wob = 1 + (N.fbm(C(a) * 1.7 + i * 7, S(a) * 1.7 + 3, 2) - 0.5) * 0.2; pts.push([C(a) * kx * wob, S(a) * ky * wob + dy]); }
    const P = blob(pts, 0.5), t = i / terr;
    g.fillStyle = mix('#2c2120', '#120707', t); g.fill(P);
    g.save(); g.clip(P);
    g.fillStyle = mix('#1a1010', '#2a0c06', t); g.beginPath(); g.ellipse(0, dy + ky * 0.16, kx * 0.94, ky * 0.9, 0, PI, 0); g.fill();
    g.fillStyle = `rgba(255,${90 + t * 60},30,${0.08 + t * 0.14})`; g.beginPath(); g.ellipse(0, dy + ky * 0.2, kx * 0.9, ky * 0.75, 0, 0, PI * 2); g.fill();
    g.restore();
    g.lineJoin = 'round'; g.strokeStyle = OUT; g.lineWidth = 2; g.stroke(P);
    g.save(); g.translate(-1.5, -2); g.strokeStyle = `rgba(150,120,104,${0.4 - t * 0.25})`; g.lineWidth = 1.6; g.stroke(P); g.restore();
  }
  // the crater lip: a raised band of dark rock, lit along its crest, strewn with rubble
  const lip = []; for (let j = 0; j < 72; j++) { const a = (j / 72) * PI * 2, wob = 1 + (N.fbm(C(a) * 1.7, S(a) * 1.7 + 3, 2) - 0.5) * 0.2; lip.push([C(a) * rx * wob, S(a) * ry * wob]); }
  const LP = blob(lip, 0.5);
  g.lineJoin = 'round'; g.strokeStyle = '#1c1514'; g.lineWidth = 18; g.stroke(LP);
  g.strokeStyle = '#3a2e2a'; g.lineWidth = 11; g.stroke(LP);
  g.save(); g.translate(0, -3); g.strokeStyle = 'rgba(150,118,100,0.55)'; g.lineWidth = 2; g.stroke(LP); g.restore();
  for (let j = 0; j < 64; j++) { const [lx, ly] = lip[Math.floor(R() * lip.length)]; toon(g, poly(ashBlobPts(lx + (R() - 0.5) * 12, ly + (R() - 0.5) * 8, 3 + R() * 6, 6, R, 0.65)), R() < 0.5 ? '#3a2f2c' : '#2a2220', { sd: 1, hd: 0.8, lw: 1, light: '#7a6258' }); }
  // molten core
  const cy = ry * 0.36;
  g.save(); g.scale(1, 0.55);
  gr = g.createRadialGradient(0, cy / 0.55, 0, 0, cy / 0.55, rx * 0.36);
  gr.addColorStop(0, '#fffbe6'); gr.addColorStop(0.25, '#ffe08a'); gr.addColorStop(0.6, '#ff7a1e'); gr.addColorStop(1, 'rgba(170,30,8,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, cy / 0.55, rx * 0.36, 0, PI * 2); g.fill(); g.restore();
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 0, cy, rx * 0.5, '#ff8a2a', 0.5); g.restore();
  g.restore();
  ashLight(d.x, d.y + cy, rx * 2.6, '#ff6a1a', 0.85); ashLight(d.x, d.y + cy, rx * 0.9, '#ffd080', 0.6);
}
// inner slope of the crater (4-7): beyond the rim the ground drops into hazy, glowing depths
function ashSlope(g, d, R, N) {
  const P = ashClosed(d.pts, 8), Pp = poly(P), xs = P.map(p => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const yTop = d.y1 ?? -40, yRim = d.y2 ?? 300;
  g.save(); g.clip(Pp);
  g.fillStyle = lg(g, 0, yTop, 0, yRim, [[0, '#5a1a0a'], [0.35, '#2a0e08'], [0.75, '#1a0c0a'], [1, '#241a18']]); g.fillRect(x0, yTop - 60, x1 - x0, yRim - yTop + 160);
  // terraced strata stepping down into the crater, their lips lit by the glow below
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let k = 1; k <= 6; k++) {
    const t = k / 7, yb = yTop + (yRim - yTop) * t, pts = [];
    for (let x = x0 - 20; x <= x1 + 20; x += 24) pts.push([x, yb + (N.fbm(x / 260 + k * 3.1, k * 1.7, 2) - 0.5) * 60]);
    g.strokeStyle = `rgba(0,0,0,${0.16 + t * 0.2})`; g.lineWidth = 8; ashPolyline(g, pts.map(([x, y]) => [x, y + 5]));
    g.strokeStyle = `rgba(255,140,80,${0.2 - t * 0.12})`; g.lineWidth = 1.6; ashPolyline(g, pts);
    for (let i = 0; i < 14; i++) { const [x, y] = pts[Math.floor(R() * pts.length)]; toon(g, poly(ashBlobPts(x + (R() - 0.5) * 20, y + 3 + R() * 6, 2 + R() * 4, 5, R, 0.65)), '#2a1a16', { sd: 0.8, hd: 0.6, lw: 0.9, light: '#6a4a3e' }); }
  }
  // far-below lava rivulets and glow, veiled by heat haze
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    let x = x0 + R() * (x1 - x0), y = yTop + R() * (yRim - yTop) * 0.45; const pts = [[x, y]];
    for (let k = 0; k < 8; k++) { x += 24 + R() * 30; y += (R() - 0.5) * 16; pts.push([x, y]); }
    g.strokeStyle = 'rgba(255,90,20,0.28)'; g.lineWidth = 9; ashPolyline(g, pts); g.strokeStyle = 'rgba(255,180,90,0.55)'; g.lineWidth = 2.2; ashPolyline(g, pts);
  }
  g.restore();
  for (let i = 0; i < 26; i++) { const x = x0 + R() * (x1 - x0), y = yTop + R() * (yRim - yTop), rx = 120 + R() * 200; g.save(); g.translate(x, y); g.scale(1, 0.22); const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, 'rgba(120,50,30,0.22)'); gr.addColorStop(1, 'rgba(120,50,30,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, PI * 2); g.fill(); g.restore(); }
  // ridges of the near wall falling away
  for (let i = 0; i < 40; i++) { const x = x0 + R() * (x1 - x0), c = ashCross(P, x); if (c.length < 2) continue; const yb = c[c.length - 1], L = 30 + R() * 70; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2 + R() * 2; g.beginPath(); g.moveTo(x, yb - 4); g.quadraticCurveTo(x + (R() - 0.5) * 20, yb - L * 0.5, x + (R() - 0.5) * 30, yb - L); g.stroke(); }
  g.restore();
  // the rim: rocky lip with a cast shadow into the drop
  const rimPts = []; for (let x = x0; x <= x1; x += 6) { const c = ashCross(P, x); if (c.length) rimPts.push([x, c[c.length - 1]]); }
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 16; ashPolyline(g, rimPts.map(([x, y]) => [x, y - 9]));
  g.strokeStyle = '#4a4240'; g.lineWidth = 5; ashPolyline(g, rimPts);
  g.strokeStyle = 'rgba(190,170,150,0.35)'; g.lineWidth = 1.6; ashPolyline(g, rimPts.map(([x, y]) => [x, y + 2]));
  g.restore();
  for (let k = 0; k < rimPts.length; k += 2) { if (R() < 0.45) continue; const [x, y] = rimPts[k]; toon(g, poly(ashBlobPts(x + (R() - 0.5) * 6, y + 1, 3 + R() * 6, 6, R, 0.65)), R() < 0.5 ? '#433b39' : '#2e2826', { sd: 1, hd: 0.8, lw: 1, light: '#6e625c' }); }
  for (const L of d.lights || []) ashLight(L[0], L[1], L[2], '#ff5a14', L[3] ?? 0.6);
}

// ---------------- lava ----------------
function ashBand(pts, nx, ny, fl, fr) {
  const L = [], Rr = [];
  for (let i = 0; i < pts.length; i++) { const a = fl(i), b = fr(i); L.push([pts[i][0] + nx[i] * a, pts[i][1] + ny[i] * a]); Rr.push([pts[i][0] - nx[i] * b, pts[i][1] - ny[i] * b]); }
  return poly(L.concat(Rr.reverse()));
}
export function ashLavaRiver(g, pts, r, R, N) {
  const w = r.w || 90, hw = w / 2, n = pts.length;
  const Sd = [0], nx = [], ny = [];
  for (let i = 1; i < n; i++) Sd.push(Sd[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; nx.push(-dy / l); ny.push(dx / l); }
  const wob = (i, k, amp) => (N.fbm(Sd[i] / 150 + k * 17.3, k * 3.7, 3) - 0.5) * 2.2 * amp;
  const mean = i => wob(i, 9, hw * 0.3);  // meander of the hot core
  // 0. heat haze on the surrounding ground
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [k, a] of [[3.6, 0.04], [2.8, 0.05], [2.1, 0.07], [1.6, 0.08]]) { g.strokeStyle = `rgba(255,86,20,${a})`; g.lineWidth = w * k; ashPolyline(g, pts); }
  g.restore();
  const idx = s => Math.min(n - 1, Math.round(s / Sd[n - 1] * (n - 1)));
  // 1. dark cooled-rock bed under the banks
  const bank = ashBand(pts, nx, ny, i => hw * 1.22 + 6 + wob(i, 1, w * 0.1), i => hw * 1.22 + 6 + wob(i, 2, w * 0.1));
  g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 18; g.shadowOffsetY = 7; g.fillStyle = '#1e1817'; g.fill(bank); g.restore();
  g.lineJoin = 'round'; g.strokeStyle = OUT; g.lineWidth = 2.4; g.stroke(bank);
  // 2. molten bed (deep red rim -> orange -> yellow core -> white-hot thread)
  const edge = ashBand(pts, nx, ny, i => hw + wob(i, 3, w * 0.07), i => hw + wob(i, 4, w * 0.07));
  ASH.lavaPaths.push(edge);
  g.fillStyle = '#7a1a06'; g.fill(edge);
  g.save(); g.clip(edge);
  const layer = (k, col, blur, kk) => { const p = ashBand(pts, nx, ny, i => hw * k + wob(i, kk, w * 0.09) + mean(i), i => hw * k + wob(i, kk + 1, w * 0.09) - mean(i)); g.shadowColor = col; g.shadowBlur = blur; g.fillStyle = col; g.fill(p); return p; };
  layer(0.86, '#c8380c', 10, 5);
  layer(0.62, '#f2661a', 14, 11);
  layer(0.34, '#ffa232', 16, 13);
  layer(0.12, '#ffe39a', 12, 15);
  g.shadowBlur = 0;
  // flow streaks
  g.lineCap = 'round';
  for (let s = 0; s < Sd[n - 1]; s += 6) {
    if (R() < 0.5) continue;
    const i = Math.min(n - 2, idx(s)), off = (R() - 0.5) * hw * 1.2 + mean(i), x = pts[i][0] + nx[i] * off, y = pts[i][1] + ny[i] * off;
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dy) || 1, L = 8 + R() * 24;
    g.strokeStyle = Math.abs(off - mean(i)) < hw * 0.3 ? 'rgba(255,250,215,0.6)' : 'rgba(255,170,70,0.4)'; g.lineWidth = 1.1 + R() * 1.5;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + dx / l * L * 0.5 + nx[i] * 2, y + dy / l * L * 0.5 + ny[i] * 2, x + dx / l * L, y + dy / l * L); g.stroke();
  }
  // 3. crust shelves along both banks: a jagged dark band split into plates by glowing cracks
  const jag = (i, k) => hw * (0.74 + wob(i, k, 0.34) + (ashHash(i, k, 5) - 0.5) * 0.1);
  const zone = new Path2D();
  zone.addPath(ashBand(pts, nx, ny, i => hw * 1.1, i => -(jag(i, 21) + mean(i) * 0.5)));
  zone.addPath(ashBand(pts, nx, ny, i => -(jag(i, 22) - mean(i) * 0.5), i => hw * 1.1));
  g.save(); g.shadowColor = 'rgba(255,200,110,0.9)'; g.shadowBlur = 6; g.fillStyle = '#2e1a12'; g.fill(zone); g.restore();
  g.save(); g.clip(zone);
  g.fillStyle = '#2a1710'; g.fill(zone);
  for (let k = 0; k < Sd[n - 1] / 4; k++) { const i = Math.floor(R() * n), off = (R() - 0.5) * w * 1.1, x = pts[i][0] + nx[i] * off, y = pts[i][1] + ny[i] * off; g.fillStyle = R() < 0.5 ? 'rgba(120,90,76,0.35)' : 'rgba(8,4,2,0.4)'; g.beginPath(); g.arc(x, y, 0.8 + R() * 1.6, 0, PI * 2); g.fill(); }
  const sites = [];
  for (let s2 = 4; s2 < Sd[n - 1]; s2 += 24 + R() * 22) { const i = idx(s2); for (const sd of [-1, 1]) { const off = sd * hw * (0.8 + R() * 0.3); sites.push([pts[i][0] + nx[i] * off + (R() - 0.5) * 12, pts[i][1] + ny[i] * off + (R() - 0.5) * 12]); } }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  for (const c of ashVoronoi(sites, Math.min(...xs) - w, Math.min(...ys) - w, Math.max(...xs) + w, Math.max(...ys) + w, 0.8, 90)) {
    if (c.pts.length < 3) continue;
    const P = poly(c.pts);
    const hot = R() < 0.35;
    g.save(); g.translate(1.4, 1.8); g.strokeStyle = 'rgba(150,112,94,0.4)'; g.lineWidth = 1.3; g.stroke(P); g.restore();
    g.strokeStyle = hot ? 'rgba(255,96,24,0.6)' : 'rgba(150,40,12,0.55)'; g.lineWidth = hot ? 2.4 : 1.8; g.stroke(P);
    if (hot) { g.strokeStyle = 'rgba(255,214,140,0.8)'; g.lineWidth = 0.8; g.stroke(P); }
  }
  g.restore();
  // a few rafts drifting mid-stream
  for (let s2 = 30 + R() * 80; s2 < Sd[n - 1]; s2 += 90 + R() * 140) {
    const i = Math.min(n - 2, idx(s2)), off = (R() - 0.5) * hw * 0.8 + mean(i), x = pts[i][0] + nx[i] * off, y = pts[i][1] + ny[i] * off;
    const r = 4 + R() * 7, dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dy) || 1, ex = dx / l, ey = dy / l;
    const P = ashBlobPts(0, 0, r, 7, R, 1, 0.6).map(([px, py]) => [x + px * ex * 1.5 - py * ey * 0.8, y + px * ey * 1.5 + py * ex * 0.8]);
    ashPlate(g, P, R, '#33190f');
  }
  // bubbles
  for (let k = 0; k < Sd[n - 1] / 90; k++) { const i = Math.floor(R() * n), off = (R() - 0.5) * hw * 0.6 + mean(i), x = pts[i][0] + nx[i] * off, y = pts[i][1] + ny[i] * off; flat(g, circle(x, y, 1.2 + R() * 1.8), '#fff0b8', 0.8, '#c04010'); }
  g.restore();
  // 4. broken basalt along the banks, overlapping the molten edge
  for (let s = 0; s < Sd[n - 1]; s += 6) {
    const i = idx(s);
    for (const sd of [-1, 1]) {
      if (R() < 0.3) continue;
      const big = R() < 0.18, off = sd * (hw * (1.0 + R() * 0.3) + (big ? 8 : 3)), x = pts[i][0] + nx[i] * off, y = pts[i][1] + ny[i] * off;
      toon(g, poly(ashBlobPts(x, y, big ? 9 + R() * 8 : 3.5 + R() * 6, big ? 7 : 6, R, 0.72, 0.45)), R() < 0.35 ? '#3a302d' : R() < 0.7 ? '#28211f' : '#1a1514', { sd: big ? 2.4 : 1.4, hd: big ? 1.6 : 1, lw: 1.2, light: '#665850' });
    }
  }
  // 5. glowing seam where lava meets the crust
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round';
  g.strokeStyle = 'rgba(255,100,24,0.35)'; g.lineWidth = 6; g.stroke(edge);
  g.strokeStyle = 'rgba(255,190,110,0.35)'; g.lineWidth = 1.6; g.stroke(edge);
  g.restore();
  for (let s = 0; s < Sd[n - 1]; s += 55) { const i = idx(s); ashLight(pts[i][0], pts[i][1], w * 2.3, '#ff5a14', 0.32); }
}
export function ashLavaLake(g, pts, l, R, N) {
  const P = poly(pts);
  ASH.lavaPaths.push(P);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2;
  // heat haze
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round';
  for (const [k, a] of [[120, 0.04], [80, 0.05], [50, 0.07]]) { g.strokeStyle = `rgba(255,86,20,${a})`; g.lineWidth = k; g.stroke(P); }
  g.restore();
  // cooled-rock rim
  g.save(); g.lineJoin = 'round'; g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 16; g.shadowOffsetY = 7; g.strokeStyle = '#1e1817'; g.lineWidth = 40; g.stroke(P); g.restore();
  g.lineJoin = 'round'; g.strokeStyle = OUT; g.lineWidth = 42; g.stroke(P); g.strokeStyle = '#231c1b'; g.lineWidth = 38; g.stroke(P);
  // molten surface
  g.save(); g.clip(P);
  g.fillStyle = rg(g, cx, cy, 0, Math.max(rx, ry) * 1.05, [[0, '#ffe08a'], [0.3, '#ffa232'], [0.65, '#e8541a'], [1, '#8a1e06']]); g.fillRect(x0 - 10, y0 - 10, x1 - x0 + 20, y1 - y0 + 20);
  // crust: Voronoi slabs separated by glowing seams; the hot heart stays mostly open
  const sites = []; let row = 0;
  for (let y = y0 - 16; y < y1 + 24; y += 34, row++) for (let x = x0 - 16 + (row % 2) * 20; x < x1 + 24; x += 40) sites.push([x + (R() - 0.5) * 26, y + (R() - 0.5) * 20]);
  for (const c of ashVoronoi(sites, x0 - 40, y0 - 40, x1 + 40, y1 + 40, 0.75, 140)) {
    if (c.pts.length < 3) continue;
    const dc = Math.hypot((c.site[0] - cx) / rx, (c.site[1] - cy) / ry);
    if (R() > 0.05 + dc * 1.15) continue;
    ashPlate(g, ashInset(c.pts, 2 + (1 - Math.min(1, dc)) * 4 + R() * 1.5), R, dc > 0.75 ? '#26130e' : '#3a1b10');
  }
  for (let k = 0; k < rx * ry / 700; k++) { const x = cx + (R() - 0.5) * rx * 0.9, y = cy + (R() - 0.5) * ry * 0.9; flat(g, circle(x, y, 1.4 + R() * 2.6), '#fff0b8', 0.9, '#c04010'); }
  g.restore();
  // broken basalt rim stones over the edge
  for (let i = 0; i < pts.length; i++) {
    if (R() < 0.3) continue;
    const [x, y] = pts[i], a = R() * PI * 2, d = 6 + R() * 10;
    toon(g, poly(ashBlobPts(x + C(a) * d, y + S(a) * d * 0.7, 5 + R() * 9, 6, R, 0.72)), R() < 0.4 ? '#3a302d' : R() < 0.7 ? '#2a2322' : '#1c1716', { sd: 1.4, hd: 1, lw: 1.1, light: '#62544c' });
  }
  g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,110,30,0.4)'; g.lineWidth = 6; g.stroke(P); g.restore();
  ashLight(cx, cy, Math.max(rx, ry) * 2.3, '#ff5a14', 0.55);
  for (let i = 0; i < pts.length; i += 6) ashLight(pts[i][0], pts[i][1], 110, '#ff6a20', 0.22);
}

// ---------------- basalt cliffs ----------------
export function ashCliff(g, pts, c, R, th) {
  const h = c.h || 40, base = c.color || '#3a3536';
  const xs = pts.map(p => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const rim = x => { for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; if ((a[0] <= x) !== (b[0] <= x) || a[0] === x) return a[1] + (b[1] - a[1]) * (x - a[0]) / ((b[0] - a[0]) || 1); } return null; };
  // lit plateau lip behind the edge, shadow at the foot
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.globalAlpha = 0.35; g.strokeStyle = '#000'; g.lineWidth = 28; ashPolyline(g, pts.map(([x, y]) => [x, y + h + 12]));
  g.globalAlpha = 0.12; g.strokeStyle = '#d8ccc0'; for (const k of [40, 24, 12]) { g.lineWidth = k; ashPolyline(g, pts.map(([x, y]) => [x, y - k / 2 - 4])); }
  g.restore();
  ashColumnWall(g, x0, x1, rim, h, R, { color: base });
  g.strokeStyle = OUT; g.lineWidth = 1.6; g.lineCap = 'round'; ashPolyline(g, pts.map(([x, y]) => [x, y + h * 1.05]));
  if (c.glow) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,90,20,0.18)'; g.lineWidth = 26; g.lineCap = 'round'; ashPolyline(g, pts.map(([x, y]) => [x, y + h])); g.restore(); for (let i = 0; i < pts.length; i += 4) ashLight(pts[i][0], pts[i][1] + h, 90, '#ff5a14', 0.3); }
  for (let x = x0; x < x1; x += 9) { if (R() < 0.5) continue; const y = rim(x); if (y == null) continue; toon(g, poly(ashBlobPts(x + (R() - 0.5) * 10, y + h + 6 + R() * 10, 3 + R() * 5, 5, R)), R() < 0.5 ? '#3a3434' : '#2a2626', { sd: 0.8, hd: 0.6, lw: 1, light: '#5a5452' }); }
}

// ---------------- roads ----------------
export function ashRoad(g, roadPolys, R, N, M) {
  const W = 2400, H = 1350, cv = ashCanvas(W, H), r = cv.getContext('2d');
  r.lineCap = 'round'; r.lineJoin = 'round';
  // texture along the roads: dust streaks, cinder grit, optional worn flagstones
  for (const rp of roadPolys) {
    const pts = rp.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L;
      for (let s = 0; s < L; s += 6) {
        const x = x1 + ux * s, y = y1 + uy * s;
        for (let k = 0; k < 3; k++) {
          const off = (R() - 0.5) * rp.w, px = x - uy * off, py = y + ux * off;
          if (R() < 0.5) { r.fillStyle = R() < 0.6 ? 'rgba(24,16,14,0.42)' : 'rgba(210,196,176,0.3)'; r.beginPath(); r.ellipse(px, py, 0.8 + R() * 1.6, 0.6 + R(), 0, 0, PI * 2); r.fill(); }
        }
        if (R() < 0.08) { const off = (R() - 0.5) * rp.w * 0.8; r.strokeStyle = 'rgba(190,176,156,0.18)'; r.lineWidth = 2 + R() * 3; r.beginPath(); r.moveTo(x - uy * off, y + ux * off); r.lineTo(x - uy * off + ux * (14 + R() * 20), y + ux * off + uy * (14 + R() * 20)); r.stroke(); }
      }
    }
    if (M.paved) {
      let row = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L;
        for (let s = 0; s < L; s += 24, row++) {
          for (let off = -rp.w / 2 + 10 + (row % 2) * 12; off < rp.w / 2 - 6; off += 24) {
            if (R() < 0.3) continue;
            const x = x1 + ux * s - uy * off, y = y1 + uy * s + ux * off;
            const p = ashBlobPts(x, y, 9 + R() * 2, 5, R, 0.75, 0.2);
            r.fillStyle = R() < 0.5 ? 'rgba(160,148,132,0.5)' : 'rgba(118,106,94,0.5)'; r.fill(poly(p));
            r.strokeStyle = 'rgba(30,22,18,0.45)'; r.lineWidth = 1.4; r.stroke(poly(p));
          }
        }
      }
    }
  }
  // keep only what lies on the road surface
  r.globalCompositeOperation = 'destination-in';
  r.strokeStyle = '#fff';
  for (const rp of roadPolys) { r.lineWidth = rp.w - 2; ashPolyline(r, rp.pts); }
  g.drawImage(cv, 0, 0);
  // dark edge stones along the shoulders
  for (const rp of roadPolys) {
    if (rp.deco) continue;
    const pts = rp.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
      for (const sd of [-1, 1]) { if (R() < 0.55) continue; const off = sd * (rp.w / 2 + 3 + R() * 6), x = x1 + nx * off, y = y1 + ny * off; toon(g, poly(ashBlobPts(x, y, 2.5 + R() * 3.5, 5, R)), R() < 0.5 ? '#3a3434' : '#2a2424', { sd: 0.8, hd: 0.7, lw: 1, light: '#6a6260' }); }
    }
  }
}

// ---------------- basalt bridge ----------------
export function ashBridge(g, b, R) {
  const len = b.len || 150, bw = b.w || 96, ang = b.ang || 0, ca = C(ang), sa = S(ang), T = b.t || 20;
  const P = (u, v) => [b.x + u * ca - v * sa, b.y + u * sa + v * ca];
  const A = P(-len / 2, -bw / 2), B = P(len / 2, -bw / 2), Cc = P(len / 2, bw / 2), D = P(-len / 2, bw / 2);
  const deck = [A, B, Cc, D];
  ASH.covers.push(poly([A, B, [Cc[0], Cc[1] + T], [D[0], D[1] + T]]), poly([[A[0], A[1] - 30], [B[0], B[1] - 30], Cc, D]));
  // underside glow + shadow
  shadowBlob(g, b.x, b.y + T + 6, len * 0.55, 16, 0.4);
  // front faces (edges whose outward normal points down-screen)
  for (const i of [0, 2]) { // only the long sides show a face; the ends meet the ground
    const p = deck[i], q = deck[(i + 1) % 4], mx = (p[0] + q[0]) / 2 - b.x, my = (p[1] + q[1]) / 2 - b.y;
    if (my <= 1) continue;
    const face = poly([p, q, [q[0], q[1] + T], [p[0], p[1] + T]]);
    toon(g, face, '#2e2828', { sd: 0, hd: 0, lw: 1.6, detail: c => {
      c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1; const n = Math.max(2, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / 22));
      for (let k = 1; k < n; k++) { const t = k / n; c.beginPath(); c.moveTo(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t); c.lineTo(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t + T); c.stroke(); }
      c.beginPath(); c.moveTo(p[0], p[1] + T * 0.5); c.lineTo(q[0], q[1] + T * 0.5); c.stroke();
      // arch openings lit by the lava below
      const n2 = Math.max(1, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / 70));
      for (let k = 0; k < n2; k++) { const t = (k + 0.5) / n2, x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t + T; c.fillStyle = b.dark ? '#0a070e' : '#ff8a2a'; c.beginPath(); c.ellipse(x, y, 14, T * 0.7, 0, PI, 0); c.fill(); if (!b.dark) { c.fillStyle = 'rgba(255,230,150,0.8)'; c.beginPath(); c.ellipse(x, y, 7, T * 0.35, 0, PI, 0); c.fill(); } }
    } });
  }
  // deck slabs
  toon(g, poly(deck), '#4a4342', { sd: 2, hd: 1.2, lw: 2, light: '#6e6664', detail: c => {
    c.strokeStyle = 'rgba(20,14,12,0.55)'; c.lineWidth = 1.3;
    for (let u = -len / 2 + 18; u < len / 2; u += 18 + R() * 6) { const p = P(u, -bw / 2), q = P(u + (R() - 0.5) * 3, bw / 2); c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); }
    for (const v of [-bw / 6, bw / 6]) { const p = P(-len / 2, v), q = P(len / 2, v); c.globalAlpha = 0.5; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); c.globalAlpha = 1; }
    for (let k = 0; k < 40; k++) { const p = P((R() - 0.5) * len, (R() - 0.5) * bw); c.fillStyle = R() < 0.5 ? 'rgba(20,14,12,0.35)' : 'rgba(190,176,160,0.2)'; c.beginPath(); c.arc(p[0], p[1], 1 + R() * 1.5, 0, PI * 2); c.fill(); }
  } });
  // parapets: far one first, near one last
  const sides = [-1, 1].map(sd => ({ sd, y: P(0, sd * bw / 2)[1] })).sort((a, c) => a.y - c.y);
  for (const { sd } of sides) {
    const n = Math.max(3, Math.round(len / 24));
    for (let k = 0; k < n; k++) {
      const u0 = -len / 2 + (k / n) * len + 1.5, u1 = -len / 2 + ((k + 1) / n) * len - 1.5;
      const p = P(u0, sd * (bw / 2 - 4)), q = P(u1, sd * (bw / 2 - 4)), hh = 11 + (k % 2) * 3;
      toon(g, poly([p, q, [q[0], q[1] - hh], [p[0], p[1] - hh]]), '#3c3534', { sd: 0.8, hd: 0.5, lw: 1.3, light: '#5e5654' });
      toon(g, poly([[p[0], p[1] - hh], [q[0], q[1] - hh], [q[0] + sa * 5 * sd, q[1] - hh - 3], [p[0] + sa * 5 * sd, p[1] - hh - 3]]), '#615856', { sd: 0, hd: 0, lw: 1.1 });
    }
  }
  // end posts with ember bowls
  for (const u of [-len / 2, len / 2]) for (const sd of [-1, 1]) {
    const [x, y] = P(u, sd * (bw / 2 - 2));
    toon(g, rrect(x - 6, y - 26, 12, 26, 2), '#353030', { sd: 1, hd: 0.6, lw: 1.4, light: '#5a5250' });
    toon(g, ellipse(x, y - 27, 8, 3.5), '#4a4442', { sd: 0.4, hd: 0.3, lw: 1.2 });
    glow(g, x, y - 30, 20, '#ff8a30', 0.55); flat(g, ellipse(x, y - 28, 5, 2), '#ffc860', 0.8, '#7a2a08');
    ashLight(x, y - 28, 70, '#ff8a30', 0.3);
  }
}

// ---------------- occupancy & scatter ----------------
export function ashOccupy(og, M) {
  for (const d of M.decals || []) {
    if (d.t === 'glass') { const P = poly(ashGlassOutline(d)); og.fill(P); og.lineJoin = 'round'; og.lineWidth = 40; og.stroke(P); continue; }
    if (d.t === 'field' || d.t === 'paving') { og.fill(blob(d.pts, 0.35)); continue; }
    if (d.t === 'starfloor') { og.beginPath(); og.ellipse(d.x, d.y, (d.r || 160) + 20, ((d.r || 160) + 20) * (d.ry ?? 0.55), 0, 0, PI * 2); og.fill(); }
    if (d.t === 'pit') { og.beginPath(); og.ellipse(d.x, d.y, (d.rx || 260) * 1.1, (d.ry || 140) * 1.15, 0, 0, PI * 2); og.fill(); }
    if (d.t === 'slope' && d.block) og.fill(blob(d.pts, 0.4));
    if (d.t === 'chasm') { og.fill(poly(ashClosed(d.pts, 6))); og.lineWidth = 30; og.stroke(poly(ashClosed(d.pts, 6))); }
  }
  og.lineCap = 'round';
  for (const d of M.deco || []) if (d.t === 'ashDrywall') { og.lineWidth = 44; og.beginPath(); og.moveTo(d.x1, d.y1); og.lineTo(d.x2, d.y2); og.stroke(); }
}
export function ashScatter({ add, free, okSpacing, placed, R, M, W, H }) {
  const sc = Object.assign({ shards: 45, bones: 16, vents: 3, spires: 0 }, M.scatter || {});
  const put = (n, t, s0, s1, sp) => { for (let i = 0, k = 0; i < n * 10 && k < n; i++) { const x = R() * W, y = R() * H; if (!free(x, y) || !free(x, y - 30) || !okSpacing(x, y, sp)) continue; placed.push([x, y]); add(t, x, y, s0 + R() * (s1 - s0)); k++; } };
  put(sc.spires, 'tree_spire', 1.1, 1.8, 60);
  put(sc.shards, 'crystal', 0.6, 1.15, 30);
  put(sc.bones, 'bones', 0.85, 1.25, 40);
  put(sc.vents, 'lavavent', 0.8, 1.2, 90);
  for (const d of M.decals || []) if (d.over) add('ashDecalOver', d.x ?? 0, d.y0 ?? (d.y ?? 0) - (d.ry || 0), 1, d);
}

// ---------------- item drawing (returns true when handled) ----------------
export function ashDeco(g, it, R, th) {
  const { t, x, y, s } = it, e = it.extra || {}, M = ASH.M, hsh = ashHash(x, y, 1);
  let tt = t;
  if (M.trees && t.startsWith('tree_') && t !== 'tree_crystal') tt = 'tree_' + M.trees[Math.floor(ashHash(x, y, 7) * M.trees.length)]; // per-map woodland mix
  switch (tt) {
    case 'tree_dead': if (M.treeMix === 'spire' && hsh < 0.5) ashSpire(g, x, y, s * 0.9, R); else ashTree(g, x, y, s, R); return true;
    case 'tree_spire': ashSpire(g, x, y, s, R); return true;
    case 'tree_basalt': ashBasalt(g, x, y, s, R); return true;
    case 'tree_crystal': case 'crystal': ashShards(g, x, y, s, R); return true;
    case 'rock': ashRock(g, x, y, s, R); return true;
    case 'bush': if (hsh < 0.55) ashShrub(g, x, y, s, R); else ashRock(g, x, y, s * 0.7, R); return true;
    case 'tuft': ashTuft(g, x, y, s, R, hsh); return true;
    case 'ember': ashEmber(g, x, y, s, R, hsh); return true;
    case 'flowers': return true;
    case 'bones': ashBones(g, x, y, s, R); return true;
    case 'lavavent': ashVent(g, x, y, s, R); return true;
    case 'campfire': campfire(g, x, y, s); ashFire(g, x, y - 4 * s, s); return true;
    case 'wall': rampartWall(g, e.x1, e.y1, e.x2, e.y2, Object.assign({ color: '#8c867c' }, e)); ashSoot(g, e, R); ASH.covers.push(poly([[e.x1, e.y1 + 2], [e.x2, e.y2 + 2], [e.x2, e.y2 - (e.h || 90) - 26], [e.x1, e.y1 - (e.h || 90) - 26]])); return true;
  }
  if (!t.startsWith('ash')) return false;
  const fn = ASH_DECO[t];
  if (fn) fn(g, x, y, s, R, e);
  return true;
}
const ASH_DECO = {};

// ---------------- scatter painters ----------------
function ashTree(g, x, y, s, R) {
  const col = '#211b1a', lean = (R() - 0.5) * 0.25;
  shadowBlob(g, x + 12 * s, y + 2 * s, 24 * s, 7 * s, 0.3);
  const hT = (38 + R() * 22) * s, tx = x + lean * hT;
  toon(g, poly([[x - 6 * s, y + 1], [x - 4 * s, y - hT * 0.5], [tx - 2 * s, y - hT], [tx + 2.5 * s, y - hT + 2], [x + 4 * s, y - hT * 0.45], [x + 7 * s, y + 1]]), col, { sd: 1.2, hd: 0.8, lw: 1.6, light: '#3e3432' });
  const br = (bx, by, a, l, w, d) => {
    if (l < 5 * s || d > 3) return;
    const ex = bx + C(a) * l, ey = by + S(a) * l;
    line(g, [[bx, by], [ex, ey]], OUT, w + 2.2); line(g, [[bx, by], [ex, ey]], col, w);
    if (w > 1.6) line(g, [[bx + 0.6, by - w * 0.4], [ex + 0.6, ey - w * 0.4]], 'rgba(150,138,124,0.5)', Math.max(0.8, w * 0.35));
    br(ex, ey, a - 0.45 - R() * 0.35, l * (0.55 + R() * 0.15), w * 0.62, d + 1);
    if (R() < 0.7) br(ex, ey, a + 0.35 + R() * 0.35, l * (0.5 + R() * 0.15), w * 0.6, d + 1);
  };
  br(x + lean * hT * 0.55, y - hT * 0.55, -PI / 2 - 0.7 - R() * 0.3, (14 + R() * 6) * s, 3.4 * s, 0);
  br(x + lean * hT * 0.7, y - hT * 0.7, -PI / 2 + 0.6 + R() * 0.3, (12 + R() * 6) * s, 3 * s, 0);
  br(tx, y - hT, -PI / 2 + (R() - 0.5) * 0.6, (10 + R() * 6) * s, 2.6 * s, 1);
  // smouldering cracks
  if (R() < 0.4) { g.save(); g.globalCompositeOperation = 'lighter'; const yy = y - hT * (0.15 + R() * 0.3); line(g, [[x - 1, yy], [x + 1.5, yy - 7 * s], [x - 0.5, yy - 12 * s]], 'rgba(255,120,30,0.9)', 1.4); glow(g, x, yy - 6 * s, 10 * s, '#ff6a20', 0.5); g.restore(); }
}
function ashSpire(g, x, y, s, R) {
  const n = 2 + Math.floor(R() * 3), shards = [];
  for (let i = 0; i < n; i++) { const h = (i === 0 ? 70 + R() * 50 : 30 + R() * 40) * s, w = (i === 0 ? 13 : 7 + R() * 5) * s; shards.push({ dx: i === 0 ? 0 : (R() - 0.5) * 34 * s, h, w, lean: (R() - 0.5) * 0.35, dy: i === 0 ? 0 : R() * 6 * s }); }
  shadowBlob(g, x + 16 * s, y + 3 * s, 34 * s, 9 * s, 0.38);
  shards.sort((a, b) => a.dy - b.dy || b.h - a.h);
  for (const sh of shards) ashShard(g, x + sh.dx, y + sh.dy, sh.w, sh.h, sh.lean);
  if (ashLavaDist(x, y) < 220) { g.save(); g.globalCompositeOperation = 'lighter'; glow(g, x, y - 10 * s, 30 * s, '#ff5a14', 0.3); g.restore(); }
}
// one faceted obsidian shard: lit left facet, dark right facet, specular edge
function ashShard(g, x, y, w, h, lean = 0) {
  const tx = x + lean * h, ty = y - h, ex = x + w * (0.15 + lean * 0.2);
  const outline = poly([[x - w, y], [x - w * 0.8, y - h * 0.55], [tx, ty], [x + w * 0.85, y - h * 0.5], [x + w, y], [ex, y + w * 0.25]]);
  g.fillStyle = '#141018'; g.fill(outline);
  g.fillStyle = lg(g, x - w, ty, ex, y, [[0, '#5c6276'], [0.4, '#30323e'], [1, '#18161e']]); g.fill(poly([[x - w, y], [x - w * 0.8, y - h * 0.55], [tx, ty], [ex, y + w * 0.25]]));
  g.fillStyle = 'rgba(150,70,50,0.16)'; g.fill(poly([[ex, y + w * 0.25], [tx, ty], [x + w * 0.85, y - h * 0.5], [x + w, y]]));
  g.strokeStyle = 'rgba(214,224,255,0.9)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(tx, ty + 2); g.lineTo(ex, y + w * 0.1); g.stroke();
  g.strokeStyle = 'rgba(190,190,240,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - w * 0.82, y - h * 0.5); g.lineTo(tx - 0.5, ty + 3); g.stroke();
  g.lineJoin = 'round'; g.strokeStyle = OUT; g.lineWidth = 1.6; g.stroke(outline);
}
function ashShards(g, x, y, s, R) {
  shadowBlob(g, x + 7 * s, y + 1, 18 * s, 5 * s, 0.3);
  const n = 2 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) ashShard(g, x + (i - (n - 1) / 2) * 7 * s + (R() - 0.5) * 3, y + (i % 2) * 2, (3.5 + R() * 2.5) * s, (12 + R() * 16) * s, (R() - 0.5) * 0.5);
}
function ashBasalt(g, x, y, s, R) {
  const r = (6.5 + R() * 2) * s, ring = R() < 0.35 ? 2 : 1, cells = [], base = R() < 0.5 ? '#363233' : '#3c3636';
  for (let q = -ring; q <= ring; q++) for (let k = -ring; k <= ring; k++) {
    const d = Math.max(Math.abs(q), Math.abs(k), Math.abs(q + k));
    if (d > ring || (d > 0 && R() < 0.22 + d * 0.14)) continue;
    cells.push({ cx: x + q * r * 1.5, cy: y + (k + q / 2) * r * 0.866, h: ((ring === 2 ? 50 : 36) * (1 - d * 0.3) * (0.7 + R() * 0.55) + 5) * s });
  }
  shadowBlob(g, x + 14 * s, y + 6 * s, (ring + 1.2) * r * 1.7, (ring + 1) * r * 0.65, 0.4);
  cells.sort((a, b) => a.cy - b.cy);
  for (const c of cells) ashColumnHex(g, c.cx, c.cy, r, c.h, mix(base, R() < 0.5 ? '#2a2628' : '#46403e', R() * 0.5));
}
// one hexagonal basalt column (3/4 view)
function ashColumnHex(g, x, y, r, h, col = '#3a3536') {
  const ry = r * 0.5, yt = y - h;
  const hx = a => [x + C(a) * r, yt + S(a) * ry];
  const hexTop = [0, 1, 2, 3, 4, 5].map(i => hx(i * PI / 3));
  const fy = ry * 0.866;
  const body = poly([[x - r, yt], [x - r, y], [x - r * 0.5, y + fy], [x + r * 0.5, y + fy], [x + r, y], [x + r, yt], hexTop[1], hexTop[2]]);
  g.fillStyle = lg(g, 0, yt, 0, y, [[0, col], [1, dark(col, 0.1)]]); g.fill(body);
  g.fillStyle = 'rgba(255,240,225,0.09)'; g.fill(poly([[x - r, yt], [x - r, y], [x - r * 0.5, y + fy], [x - r * 0.5, yt + fy]]));
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.fill(poly([[x + r * 0.5, yt + fy], [x + r * 0.5, y + fy], [x + r, y], [x + r, yt]]));
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - r * 0.5, yt + fy); g.lineTo(x - r * 0.5, y + fy); g.moveTo(x + r * 0.5, yt + fy); g.lineTo(x + r * 0.5, y + fy); g.stroke();
  g.lineJoin = 'round'; g.strokeStyle = OUT; g.lineWidth = 1.5; g.stroke(body);
  toon(g, poly(hexTop), light(col, 0.2), { sd: 0.8, hd: 0.6, lw: 1.3 });
}
function ashRock(g, x, y, s, R) {
  const col = R() < 0.5 ? '#46403f' : '#3a3434';
  shadowBlob(g, x + 5 * s, y + 1 * s, 16 * s, 5 * s, 0.3);
  const pts = []; const n = 7;
  for (let i = 0; i < n; i++) { const a = PI + (i / (n - 1)) * PI; pts.push([x + C(a) * (12 + R() * 5) * s, y - 2 * s + S(a) * (9 + R() * 6) * s]); }
  pts.push([x + 13 * s, y + 1 * s], [x - 13 * s, y + 1 * s]);
  toon(g, poly(pts), col, { sd: 3 * s, hd: 1.8 * s, lw: 1.5, light: '#6a6260', detail: c => { c.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(x + (R() - 0.5) * 18 * s, y - R() * 12 * s, 0.8 + R() * 1.2, 0, PI * 2); c.fill(); } } });
  if (R() < 0.18) { g.save(); g.globalCompositeOperation = 'lighter'; line(g, [[x - 5 * s, y - 3 * s], [x - 1 * s, y - 8 * s], [x + 3 * s, y - 6 * s]], 'rgba(255,120,30,0.85)', 1.3); g.restore(); }
}
function ashShrub(g, x, y, s, R) {
  shadowBlob(g, x + 5 * s, y + 1, 14 * s, 4 * s, 0.25);
  const n = 7 + Math.floor(R() * 5);
  for (let i = 0; i < n; i++) {
    const a = -PI / 2 + (i / (n - 1) - 0.5) * 2.3 + (R() - 0.5) * 0.2, l = (8 + R() * 9) * s;
    const ex = x + C(a) * l, ey = y + S(a) * l * 0.9;
    line(g, [[x, y], [ex, ey]], OUT, 2.8); line(g, [[x, y], [ex, ey]], '#4a3428', 1.4);
    if (R() < 0.35) { const mx = x + C(a) * l * 0.6, my = y + S(a) * l * 0.55; line(g, [[mx, my], [mx + C(a + 0.9) * 4 * s, my + S(a + 0.9) * 4 * s]], '#4a3428', 1); }
    if (R() < 0.18) { g.save(); g.globalCompositeOperation = 'lighter'; glow(g, ex, ey, 5, '#ff7a20', 0.6); g.restore(); flat(g, circle(ex, ey, 1.4), '#ffb050', 0); }
  }
}
function ashTuft(g, x, y, s, R, hsh) {
  if (hsh < 0.3) return; // leave breathing room
  if (hsh < 0.62) { for (let i = 0; i < 3; i++) { const px = x + (R() - 0.5) * 12 * s, py = y + (R() - 0.5) * 4 * s; g.fillStyle = 'rgba(10,6,6,0.3)'; g.beginPath(); g.ellipse(px + 1.5, py + 1, 3 * s, 1.4 * s, 0, 0, PI * 2); g.fill(); toon(g, ellipse(px, py - 1, (1.6 + R() * 1.6) * s, (1.2 + R()) * s), R() < 0.5 ? '#4a4442' : '#6a625c', { sd: 0.6, hd: 0.5, lw: 0.9 }); } return; }
  if (hsh < 0.85) { g.strokeStyle = '#6a5a44'; g.lineWidth = 1.2 * s; g.lineCap = 'round'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x + (i - 1.5) * 2 * s, y); g.quadraticCurveTo(x + (i - 1.5) * 3 * s, y - 4 * s, x + (i - 1.5) * 4.5 * s + (R() - 0.5) * 2, y - (5 + R() * 4) * s); g.stroke(); } return; }
  // little ash mound
  g.fillStyle = 'rgba(10,6,6,0.25)'; g.beginPath(); g.ellipse(x + 3, y + 1, 10 * s, 3 * s, 0, 0, PI * 2); g.fill();
  toon(g, blob([[x - 10 * s, y], [x - 4 * s, y - 5 * s], [x + 5 * s, y - 4 * s], [x + 10 * s, y]], 0.6), '#7a7064', { sd: 1, hd: 0.8, lw: 0, light: '#9a9084' });
}
function ashEmber(g, x, y, s, R, hsh) {
  const near = ashLavaDist(x, y) < 300;
  if (!near && hsh > 0.35) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) { const px = x + (R() - 0.5) * 14 * s, py = y + (R() - 0.5) * 6 * s; glow(g, px, py, 6 * s, '#ff6a20', 0.5); g.fillStyle = '#ffc060'; g.beginPath(); g.arc(px, py, 1.2 * s, 0, PI * 2); g.fill(); }
  g.restore();
}
function ashBones(g, x, y, s, R) {
  shadowBlob(g, x + 4, y + 1, 16 * s, 4 * s, 0.22);
  const bone = (ax, ay, bx, by, w) => { line(g, [[ax, ay], [bx, by]], OUT, w + 2); line(g, [[ax, ay], [bx, by]], '#d6ccb8', w); flat(g, circle(ax, ay, w * 0.75), '#e4dccb', 1); flat(g, circle(bx, by, w * 0.75), '#e4dccb', 1); };
  for (let i = 0; i < 3; i++) { const a = R() * PI, bx = x + (R() - 0.5) * 22 * s, by = y + (R() - 0.5) * 6 * s; bone(bx - C(a) * 7 * s, by - S(a) * 2.5 * s, bx + C(a) * 7 * s, by + S(a) * 2.5 * s, 2.2 * s); }
  if (R() < 0.6) {
    // horned skull
    const sx = x + 6 * s, sy = y - 3 * s;
    line(g, [[sx - 4 * s, sy - 3 * s], [sx - 10 * s, sy - 9 * s], [sx - 9 * s, sy - 14 * s]], OUT, 3.6 * s); line(g, [[sx - 4 * s, sy - 3 * s], [sx - 10 * s, sy - 9 * s], [sx - 9 * s, sy - 14 * s]], '#cfc4ae', 2 * s);
    toon(g, blob([[sx - 6 * s, sy + 1 * s], [sx - 6 * s, sy - 5 * s], [sx, sy - 7 * s], [sx + 6 * s, sy - 4 * s], [sx + 5 * s, sy + 2 * s], [sx, sy + 3 * s]], 0.6), '#ddd3c0', { sd: 1, hd: 0.6, lw: 1.2 });
    flat(g, ellipse(sx - 2 * s, sy - 2 * s, 1.5 * s, 1.8 * s), '#1d130c', 0); flat(g, ellipse(sx + 2.2 * s, sy - 1.6 * s, 1.4 * s, 1.7 * s), '#1d130c', 0);
  }
}
function ashVent(g, x, y, s, R) {
  shadowBlob(g, x + 6 * s, y + 2 * s, 30 * s, 8 * s, 0.35);
  toon(g, blob([[x - 26 * s, y + 2 * s], [x - 14 * s, y - 10 * s], [x - 6 * s, y - 15 * s], [x + 6 * s, y - 15 * s], [x + 15 * s, y - 9 * s], [x + 27 * s, y + 2 * s], [x, y + 7 * s]], 0.5), '#2e2826', { sd: 2.4, hd: 1.4, lw: 1.6, light: '#54484a' });
  flat(g, ellipse(x, y - 13 * s, 7.5 * s, 3 * s), '#ff9a3a', 1.2, '#5a1a06');
  flat(g, ellipse(x - 1 * s, y - 13.5 * s, 3.5 * s, 1.3 * s), '#fff0b0', 0);
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, x, y - 14 * s, 26 * s, '#ff6a20', 0.55);
  line(g, [[x - 14 * s, y - 4 * s], [x - 9 * s, y - 8 * s]], 'rgba(255,120,30,0.8)', 1.2); line(g, [[x + 10 * s, y - 2 * s], [x + 14 * s, y - 7 * s]], 'rgba(255,120,30,0.8)', 1.2); g.restore();
  // smoke plume
  for (let i = 0; i < 6; i++) { const py = y - 18 * s - i * 11 * s, px = x + Math.sin(i * 0.9) * 5 * s + i * 2.5 * s, r = (7 + i * 3.4) * s; const gr = g.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(60,52,50,${0.34 - i * 0.045})`); gr.addColorStop(1, 'rgba(60,52,50,0)'); g.fillStyle = gr; g.fillRect(px - r, py - r, r * 2, r * 2); }
  ashLight(x, y - 12 * s, 110 * s, '#ff6a20', 0.45);
}
function ashFire(g, x, y, s) {
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, x, y - 6 * s, 34 * s, '#ff8a2a', 0.6); g.restore();
  flat(g, blob([[x - 7 * s, y], [x - 5 * s, y - 10 * s], [x, y - 20 * s], [x + 4 * s, y - 9 * s], [x + 7 * s, y]], 0.7), '#ffae3a', 1, '#7a2a08');
  flat(g, blob([[x - 3 * s, y], [x, y - 11 * s], [x + 3 * s, y]], 0.7), '#fff3a0', 0);
  ashLight(x, y - 6 * s, 150 * s, '#ff8a30', 0.55);
}
// soot streaks on the outer face of the Rampart
function ashSoot(g, e, R) {
  const Hh = e.h || 90, len = Math.hypot(e.x2 - e.x1, e.y2 - e.y1);
  g.save();
  g.beginPath(); g.moveTo(e.x1, e.y1); g.lineTo(e.x2, e.y2); g.lineTo(e.x2, e.y2 - Hh); g.lineTo(e.x1, e.y1 - Hh); g.closePath(); g.clip();
  for (let i = 0; i < len / 55; i++) {
    const t = R(), x0 = e.x1 + (e.x2 - e.x1) * t, y0 = e.y1 + (e.y2 - e.y1) * t, w = 14 + R() * 34, hh = Hh * (0.3 + R() * 0.8), a = 0.16 + R() * 0.2;
    let x = x0;
    for (let k = 0; k < 7; k++) { const f = k / 7, y = y0 - hh * f, r = w * (1 - f * 0.65); x += (R() - 0.5) * 6; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(16,11,9,${a * (1 - f * 0.7)})`); gr.addColorStop(1, 'rgba(16,11,9,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  }
  for (let i = 0; i < len / 160; i++) { const t = R(), x = e.x1 + (e.x2 - e.x1) * t, y = e.y1 + (e.y2 - e.y1) * t - Hh * (0.3 + R() * 0.5), r = 20 + R() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(14,10,8,0.4)'); gr.addColorStop(1, 'rgba(14,10,8,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  g.restore();
}

// ---------------- atmosphere: light, smoke, embers, falling ash ----------------
export function ashAtmosphere(g, { M, R, N, W, H }) {
  const md = ASH.md || ASH_MOOD.ash;
  for (const L of M.lights || []) ashLight(L[0], L[1], L[2], L[3] || '#ff6a20', L[4] ?? 0.5);
  // 1. light map at quarter resolution
  const q = 4, lw = W / q, lh = H / q, Lc = ashCanvas(lw, lh), lc = Lc.getContext('2d');
  lc.fillStyle = '#000'; lc.fillRect(0, 0, lw, lh); lc.globalCompositeOperation = 'lighter';
  for (const L of ASH.lights) { const x = L.x / q, y = L.y / q, r = L.r / q; const gr = lc.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, alpha(L.color, L.a)); gr.addColorStop(0.5, alpha(L.color, L.a * 0.35)); gr.addColorStop(1, alpha(L.color, 0)); lc.fillStyle = gr; lc.fillRect(x - r, y - r, r * 2, r * 2); }
  // sky / crater glow along an edge
  const sk = md.sky, gy = lc.createLinearGradient(0, 0, 0, lh * 0.5); gy.addColorStop(0, `rgba(${sk[0]},${sk[1]},${sk[2]},${sk[3] * (M.sky ?? 1)})`); gy.addColorStop(1, 'rgba(0,0,0,0)'); lc.fillStyle = gy; lc.fillRect(0, 0, lw, lh);
  // deep hollows (the crater pit) swallow the light except around their molten core
  for (const sh of ASH.shades) {
    lc.save(); lc.globalCompositeOperation = 'destination-out'; lc.translate(sh.x / q, sh.y / q); lc.scale(1, sh.ry / sh.rx);
    const r = sh.rx / q, gr = lc.createRadialGradient((sh.cx - sh.x) / q, (sh.cy - sh.y) / q * (sh.rx / sh.ry), sh.core / q, 0, 0, r);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.35, `rgba(0,0,0,${sh.k})`); gr.addColorStop(0.88, `rgba(0,0,0,${sh.k})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = gr; lc.beginPath(); lc.arc(0, 0, r, 0, PI * 2); lc.fill(); lc.restore();
  }
  // 2. ambient darkening (multiply) lifted by the lights
  const Ac = ashCanvas(lw, lh), ac = Ac.getContext('2d');
  ac.fillStyle = M.ambient || md.ambient; ac.fillRect(0, 0, lw, lh); ac.globalCompositeOperation = 'lighter'; ac.globalAlpha = 0.9; ac.drawImage(Lc, 0, 0);
  g.save(); g.imageSmoothingEnabled = true; g.globalCompositeOperation = 'multiply'; g.drawImage(Ac, 0, 0, W, H);
  g.restore();
  // 3. warm glow (not over the lava itself, so its crust stays dark)
  const Gc = ashCanvas(W, H), gc = Gc.getContext('2d');
  gc.imageSmoothingEnabled = true; gc.drawImage(Lc, 0, 0, W, H);
  if (ASH.lavaPaths.length) {
    const Mk = ashCanvas(W, H), mk = Mk.getContext('2d'); mk.fillStyle = '#000';
    for (const p of ASH.lavaPaths) mk.fill(p);
    mk.globalCompositeOperation = 'destination-out'; for (const p of ASH.covers) mk.fill(p);
    gc.globalCompositeOperation = 'destination-out'; gc.drawImage(Mk, 0, 0);
  }
  g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = md.glow; g.drawImage(Gc, 0, 0); g.restore();
  // 4. smoke banks around the frame and thin haze across the field
  const sm = ashRGB(md.smoke);
  for (let i = 0; i < 70; i++) {
    const edge = R() < 0.75; let x, y;
    if (edge) { const side = Math.floor(R() * 4); x = side < 2 ? R() * W : (side === 2 ? R() * 260 : W - R() * 260); y = side >= 2 ? R() * H : (side === 0 ? R() * 150 : H - R() * 140); } else { x = R() * W; y = R() * H; }
    const r = (edge ? 120 : 160) + R() * 160, a = edge ? 0.26 : 0.035;
    g.save(); g.translate(x, y); g.scale(1, 0.5);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, `rgba(${sm[0]},${sm[1]},${sm[2]},${a})`); gr.addColorStop(1, `rgba(${sm[0]},${sm[1]},${sm[2]},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, PI * 2); g.fill(); g.restore();
  }
  // 5. floating embers (denser near lava) and falling ash flecks
  g.save(); g.globalCompositeOperation = 'lighter';
  const ne = Math.round(170 * md.embers * (M.embers ?? 1));
  for (let i = 0, k = 0; i < ne * 12 && k < ne; i++) {
    const x = R() * W, y = R() * H, ld = ashLavaDist(x, y);
    if (R() > (ld < 220 ? 0.9 : 0.04)) continue;
    k++; const r = 0.8 + R() * 1.6;
    glow(g, x, y, r * 5, '#ff7a24', 0.45); g.fillStyle = R() < 0.5 ? '#ffd27a' : '#ff9a40'; g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill();
  }
  g.restore();
  for (let i = 0; i < 700; i++) { const x = R() * W, y = R() * H; g.fillStyle = `rgba(200,192,182,${0.12 + R() * 0.22})`; g.beginPath(); g.ellipse(x, y, 1 + R() * 1.4, 0.7 + R() * 0.8, R() * PI, 0, PI * 2); g.fill(); }
  // 6. heavy warm vignette
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, W * 0.64);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.7, 'rgba(18,6,4,0.25)'); vg.addColorStop(1, 'rgba(14,4,2,0.62)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
// ---------------- ash structures (deco types 'ash*'; placed via map.deco) ----------------
// The Rampart's great gate seen from the ash side: open, portcullis raised, the green realm beyond
function ashGate(g, x, y, s, R, e) {
  const col = e.color || '#8a847a';
  g.save(); g.translate(x, y); g.scale(s, s);
  shadowBlob(g, 24, 8, 160, 24, 0.45);
  const W2 = 82, Hh = 136, ar = 38, ay = -64;
  const body = new Path2D(); body.moveTo(-W2, 0); body.lineTo(-W2, -Hh); body.lineTo(W2, -Hh); body.lineTo(W2, 0); body.lineTo(ar, 0); body.lineTo(ar, ay); body.arc(0, ay, ar, 0, PI, true); body.lineTo(-ar, 0); body.closePath();
  const op = new Path2D(); op.moveTo(-ar, 0); op.lineTo(-ar, ay); op.arc(0, ay, ar, PI, 0); op.lineTo(ar, 0); op.closePath();
  g.save(); g.clip(op);
  g.fillStyle = lg(g, 0, ay - ar, 0, 0, [[0, '#fff2c4'], [0.35, '#d8e6a0'], [0.62, '#7aa64c'], [1, '#5c8838']]); g.fillRect(-ar - 2, ay - ar - 2, ar * 2 + 4, -ay + ar + 4);
  g.fillStyle = '#c8a571'; g.beginPath(); g.moveTo(-17, 0); g.lineTo(-5, -44); g.lineTo(5, -44); g.lineTo(17, 0); g.fill();
  g.fillStyle = 'rgba(24,16,10,0.6)'; g.fillRect(-ar - 2, ay - ar - 2, ar * 2 + 4, 22);
  g.fillStyle = 'rgba(24,16,10,0.4)'; g.fillRect(-ar - 2, ay - ar, 9, -ay + ar + 2); g.fillRect(ar - 7, ay - ar, 9, -ay + ar + 2);
  g.restore();
  g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(op);
  toon(g, body, col, { sd: 3, hd: 1.4, lw: 2.2, detail: c => {
    wallBricks(c, -W2, -Hh, W2, 0, { rowH: 11, bw: 20, seed: 9, tint: true });
    for (let i = 0; i < 6; i++) { const sx = -W2 + R() * W2 * 2, hh = 30 + R() * 70; const gr = c.createLinearGradient(0, 0, 0, -hh); gr.addColorStop(0, 'rgba(16,10,8,0.5)'); gr.addColorStop(1, 'rgba(16,10,8,0)'); c.fillStyle = gr; c.fillRect(sx - 10, -hh, 20 + R() * 14, hh); }
  } });
  g.strokeStyle = 'rgba(30,20,14,0.6)'; g.lineWidth = 1.4;
  for (let i = 0; i <= 8; i++) { const a = PI + (i / 8) * PI; line(g, [[C(a) * ar, ay + S(a) * ar], [C(a) * (ar + 12), ay + S(a) * (ar + 12)]], 'rgba(30,20,14,0.6)', 1.4); }
  g.beginPath(); g.arc(0, ay, ar + 12, PI, 0); g.stroke();
  for (let xx = -30; xx <= 30; xx += 10) { line(g, [[xx, ay - ar + 2], [xx, ay - ar + 14]], OUT, 4); line(g, [[xx, ay - ar + 2], [xx, ay - ar + 14]], '#55555e', 2.2); toon(g, poly([[xx - 2.5, ay - ar + 14], [xx, ay - ar + 20], [xx + 2.5, ay - ar + 14]]), '#62626a', { sd: 0, hd: 0, lw: 1 }); }
  line(g, [[-35, ay - ar + 8], [35, ay - ar + 8]], OUT, 4.4); line(g, [[-35, ay - ar + 8], [35, ay - ar + 8]], '#55555e', 2.6);
  toon(g, circle(0, -118, 12), '#34446a', { sd: 1, hd: 0.6, lw: 1.6 });
  flat(g, star(0, -118, 8.5, 0.45, 8), '#dfe8ff', 1.1);
  for (let i = 0; i < 8; i++) toon(g, rrect(-W2 + 2 + i * 21, -Hh - 14, 14, 15, 1.5), col, { sd: 1, hd: 0.6, lw: 1.5 });
  for (const sx of [-1, 1]) {
    const tx = sx * 106;
    const yt = cylinder(g, tx, 10, 36, 15, 172, col, { rowH: 11, cols: 9, seed: 6 + sx, topColor: dark(col, 0.08), detail: c => { for (let i = 0; i < 3; i++) { const hh = 40 + R() * 80; const gr = c.createLinearGradient(0, 10, 0, 10 - hh); gr.addColorStop(0, 'rgba(16,10,8,0.5)'); gr.addColorStop(1, 'rgba(16,10,8,0)'); c.fillStyle = gr; c.fillRect(tx - 30 + R() * 50, 10 - hh, 16, hh); } } });
    merlons(g, tx, yt, 36, 15, 'back', col, { n: 11, h: 11, w: 10 }); merlons(g, tx, yt, 36, 15, 'front', col, { n: 11, h: 11, w: 10 });
    toon(g, rrect(tx - 3, yt + 40, 6, 16, 3), '#1a120c', { sd: 0, hd: 0, lw: 1.2 });
    banner(g, tx - 9 + sx * 4, yt + 70, 18, 54, e.banner || '#b8322a', { tail: true, wave: 0.6, emblem: (c, ex, ey) => flat(c, star(ex, ey, 5, 0.45, 5), '#f2d27a', 0) });
    g.save(); g.globalCompositeOperation = 'lighter'; glow(g, tx, yt - 18, 44, '#ff9a2a', 0.7); g.restore();
    cylinder(g, tx, yt + 2, 12, 5, 8, '#5a3a22', { bricks: false, kind: 'wood', topColor: '#2a1a10' });
    flat(g, blob([[tx - 10, yt - 4], [tx - 6, yt - 24], [tx, yt - 38], [tx + 6, yt - 22], [tx + 10, yt - 4]], 0.7), '#ffae3a', 1.2, '#7a2a08');
    flat(g, blob([[tx - 4, yt - 4], [tx, yt - 22], [tx + 4, yt - 4]], 0.7), '#fff3a0', 0);
    ashLight(x + tx * s, y + (yt - 20) * s, 180 * s, '#ff9a30', 0.5);
  }
  g.restore();
  ashLight(x, y - 30 * s, 220 * s, '#ffe6a8', 0.5);
}
// row of sharpened stakes leaning toward the enemy (e.flip: lean left), e.n stakes
function ashBarricade(g, x, y, s, R, e) {
  const n = e.n || 7, d = e.flip ? -1 : 1, sp = 11 * s;
  shadowBlob(g, x + 8 * s, y + 2, n * sp * 0.6, 7 * s, 0.32);
  const x0 = x - (n - 1) * sp / 2;
  line(g, [[x0 - 6 * s, y - 7 * s], [x0 + (n - 1) * sp + 6 * s, y - 9 * s]], OUT, 5 * s); line(g, [[x0 - 6 * s, y - 7 * s], [x0 + (n - 1) * sp + 6 * s, y - 9 * s]], '#6a4426', 3 * s);
  for (let i = 0; i < n; i++) {
    const bx = x0 + i * sp, by = y + (i % 2) * 2 * s, L = (30 + R() * 8) * s, a = -PI / 2 + d * (0.32 + R() * 0.1);
    const tx = bx + C(a) * L, ty = by + S(a) * L;
    toon(g, poly([[bx - 2.6 * s, by], [tx - 1.2 * s, ty + 3 * s], [tx + C(a) * 6 * s, ty + S(a) * 6 * s], [tx + 1.2 * s, ty + 3 * s], [bx + 2.6 * s, by]]), '#7a5030', { sd: 0.8, hd: 0.5, lw: 1.3 });
    toon(g, poly([[tx - 1.2 * s, ty + 3 * s], [tx + C(a) * 6 * s, ty + S(a) * 6 * s], [tx + 1.2 * s, ty + 3 * s]]), '#c8a070', { sd: 0, hd: 0, lw: 1 });
  }
  line(g, [[x0 - 4 * s, y - 15 * s], [x0 + (n - 1) * sp + 4 * s, y - 17 * s]], OUT, 4.4 * s); line(g, [[x0 - 4 * s, y - 15 * s], [x0 + (n - 1) * sp + 4 * s, y - 17 * s]], '#7a5030', 2.6 * s);
}
// ash-folk dome hut of corbelled black stone, warm doorway, hide awning, horned skull
function ashHut(g, x, y, s, R, e) {
  g.save(); g.translate(x, y); g.scale((e.flip ? -1 : 1) * s, s);
  shadowBlob(g, 16, 4, 58, 16, 0.42);
  const rx = 38, ry = 15, st = '#3e3839';
  const yt = cylinder(g, 0, 0, rx, ry, 14, st, { rowH: 7, cols: 9, seed: 11 + Math.floor(R() * 9), top: false, lw: 1.8 });
  const dh = 46 + R() * 10, dome = new Path2D();
  dome.moveTo(-rx, yt); dome.bezierCurveTo(-rx, yt - dh * 0.62, -rx * 0.42, yt - dh, 0, yt - dh); dome.bezierCurveTo(rx * 0.42, yt - dh, rx, yt - dh * 0.62, rx, yt); dome.ellipse(0, yt, rx, ry, 0, 0, PI, false); dome.closePath();
  toon(g, dome, '#474041', { sd: 6, hd: 3, lw: 1.9, light: '#6c6262', detail: c => {
    c.strokeStyle = 'rgba(12,8,8,0.5)'; c.lineWidth = 1.2;
    for (let k = 1; k < 7; k++) { const t = k / 7, yy = yt - dh * (1 - Math.pow(1 - t, 1.6)), w = rx * Math.sqrt(Math.max(0, 1 - t * t)) * 1.02; c.beginPath(); c.ellipse(0, yy + ry * (1 - t) * 0.6, w, ry * (1 - t) * 0.75 + 1, 0, 0, PI); c.stroke();
      for (let j = 0; j < 6; j++) { const a = ((j + (k % 2) * 0.5) / 6) * PI; const xx = -C(a) * w, y2 = yy + ry * (1 - t) * 0.6 + S(a) * (ry * (1 - t) * 0.75 + 1); c.beginPath(); c.moveTo(xx, y2); c.lineTo(xx, y2 - dh / 7 * 0.9); c.stroke(); } }
  } });
  // smoke hole
  toon(g, ellipse(0, yt - dh + 3, 7, 2.6), '#1a1212', { sd: 0, hd: 0, lw: 1.3 });
  for (let i = 0; i < 5; i++) { const py = yt - dh - 6 - i * 10, px = i * 4 + S(i) * 3, r = 6 + i * 3; const gr = g.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(70,62,60,${0.3 - i * 0.05})`); gr.addColorStop(1, 'rgba(70,62,60,0)'); g.fillStyle = gr; g.fillRect(px - r, py - r, r * 2, r * 2); }
  // doorway
  const dp = new Path2D(); dp.moveTo(-17, 6); dp.lineTo(-17, -12); dp.arc(-8, -12, 9, PI, 0); dp.lineTo(1, 6); dp.closePath();
  g.fillStyle = '#1c0c06'; g.fill(dp);
  g.save(); g.clip(dp); g.fillStyle = rg(g, -8, 6, 0, 22, [[0, 'rgba(255,170,70,0.95)'], [0.6, 'rgba(200,70,20,0.5)'], [1, 'rgba(60,20,8,0)']]); g.fillRect(-20, -26, 26, 34); g.restore();
  g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke(dp);
  // hide awning on two poles
  for (const px of [-22, 6]) toon(g, rrect(px - 1.4, -30, 2.8, 36, 1), '#6a4426', { sd: 0.5, hd: 0.3, lw: 1.1 });
  toon(g, poly([[-26, -30], [10, -30], [14, -20], [-2, -24], [-30, -20]]), '#9a6a42', { sd: 1.2, hd: 0.6, lw: 1.4, detail: c => { c.strokeStyle = 'rgba(60,30,10,0.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-14, -30); c.lineTo(-16, -22); c.moveTo(0, -30); c.lineTo(2, -24); c.stroke(); } });
  // horned skull above
  if (R() < 0.7) { line(g, [[-14, -40], [-20, -46], [-19, -51]], OUT, 3.2); line(g, [[-14, -40], [-20, -46], [-19, -51]], '#d6ccb8', 1.8); line(g, [[-2, -40], [4, -46], [3, -51]], OUT, 3.2); line(g, [[-2, -40], [4, -46], [3, -51]], '#d6ccb8', 1.8); toon(g, blob([[-13, -34], [-14, -41], [-8, -44], [-2, -41], [-3, -34], [-8, -31]], 0.6), '#e2d8c4', { sd: 0.8, hd: 0.5, lw: 1.2 }); flat(g, circle(-10.5, -38.5, 1.3), OUT, 0); flat(g, circle(-5.5, -38.5, 1.3), OUT, 0); }
  // firewood bundle
  for (let i = 0; i < 3; i++) toon(g, rrect(16 + i * 2, -6 - i * 4, 18, 4.4, 2), '#5a3a20', { sd: 0.6, hd: 0.3, lw: 1 });
  g.restore();
  ashLight(x - 8 * s * (e.flip ? -1 : 1), y - 4 * s, 110 * s, '#ff9040', 0.42);
}
// carved basalt totem with ember eyes, a horned skull and red cloth strips
function ashTotem(g, x, y, s, R, e) {
  g.save(); g.translate(x, y); g.scale(s, s);
  shadowBlob(g, 9, 2, 20, 6, 0.38);
  toon(g, ellipse(0, 0, 13, 5), '#2a2526', { sd: 0.6, hd: 0.4, lw: 1.3 });
  const col = '#2f2a2c';
  toon(g, poly([[-9, 0], [-8, -54], [-5, -62], [5, -62], [8, -54], [9, 0]]), col, { sd: 2.2, hd: 1.2, lw: 1.8, light: '#544a4c', detail: c => {
    c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 1.4;
    for (const yy of [-16, -32]) { c.beginPath(); c.moveTo(-9, yy); c.lineTo(9, yy - 1); c.stroke(); }
    c.beginPath(); c.moveTo(-6, -44); c.lineTo(-1, -42); c.moveTo(6, -44); c.lineTo(1, -42); c.moveTo(-4, -36); c.lineTo(4, -36); c.stroke();
    c.beginPath(); for (let k = 0; k < 4; k++) { c.moveTo(-6, -26 + k * 3); c.lineTo(6, -24 + k * 3); } c.stroke();
  } });
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, -3, -40, 9, '#ff6a20', 0.8); glow(g, 3, -40, 9, '#ff6a20', 0.8); g.restore();
  flat(g, ellipse(-3, -40, 1.8, 1.2), '#ffd27a', 0); flat(g, ellipse(3, -40, 1.8, 1.2), '#ffd27a', 0);
  for (const sx of [-1, 1]) { line(g, [[sx * 4, -64], [sx * 12, -70], [sx * 11, -78]], OUT, 3.4); line(g, [[sx * 4, -64], [sx * 12, -70], [sx * 11, -78]], '#d6ccb8', 2); }
  toon(g, blob([[-6, -58], [-7, -66], [0, -70], [7, -66], [6, -58], [0, -55]], 0.6), '#e2d8c4', { sd: 0.8, hd: 0.5, lw: 1.2 });
  flat(g, circle(-2.5, -63, 1.4), OUT, 0); flat(g, circle(2.5, -63, 1.4), OUT, 0);
  toon(g, poly([[8, -30], [16, -27], [14, -12], [11, -14], [10, -26]]), '#a8321e', { sd: 0.6, hd: 0.3, lw: 1.1 });
  toon(g, poly([[-8, -22], [-15, -18], [-13, -6], [-10, -8], [-9, -19]]), '#8a2a1a', { sd: 0.6, hd: 0.3, lw: 1.1 });
  g.restore();
  ashLight(x, y - 40 * s, 60 * s, '#ff6a20', 0.25);
}
// stone fire bowl
function ashBrazier(g, x, y, s, R, e) {
  g.save(); g.translate(x, y); g.scale(s, s);
  shadowBlob(g, 6, 2, 16, 5, 0.35);
  toon(g, poly([[-6, 0], [-4, -20], [4, -20], [6, 0]]), '#3a3434', { sd: 1, hd: 0.6, lw: 1.5, light: '#5e5656' });
  toon(g, poly([[-13, -26], [13, -26], [8, -18], [-8, -18]]), '#4a4242', { sd: 1, hd: 0.6, lw: 1.5, light: '#6e6464' });
  toon(g, ellipse(0, -26, 13, 4), '#2a1a12', { sd: 0, hd: 0, lw: 1.4 });
  g.restore();
  ashFire(g, x, y - 26 * s, s * 0.9);
}
// lava forge of the ash-folk: stone hearth with a glowing trough, chimney and anvil
function ashForge(g, x, y, s, R, e) {
  g.save(); g.translate(x, y); g.scale(s, s);
  shadowBlob(g, 14, 4, 62, 16, 0.42);
  house(g, 0, 0, 74, 26, 0, { wall: '#3c3637', wallKind: 'stone', roofKind: 'flat', depth: 18, seed: 5 });
  toon(g, poly([[-37, -26], [37, -26], [48, -36], [-26, -36]]), '#4a4243', { sd: 0.6, hd: 0.4, lw: 1.6 });
  toon(g, poly([[-22, -27], [22, -27], [28, -33], [-16, -33]]), '#ff8a2a', { sd: 0, hd: 0, lw: 1.4 });
  flat(g, poly([[-14, -29], [16, -29], [20, -31.5], [-10, -31.5]]), '#ffe9a0', 0);
  toon(g, rrect(24, -78, 14, 46, 2), '#353031', { sd: 1.2, hd: 0.6, lw: 1.6, detail: c => wallBricks(c, 24, -78, 38, -32, { rowH: 7, bw: 9, seed: 3 }) });
  toon(g, rrect(-30, -14, 16, 10, 2), '#1c1414', { sd: 0, hd: 0, lw: 1.4 });
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, -22, -10, 16, '#ff7a20', 0.7); glow(g, 2, -32, 40, '#ff7a20', 0.5); g.restore();
  // anvil
  toon(g, poly([[44, -2], [48, -14], [62, -14], [66, -20], [70, -20], [66, -12], [60, -10], [58, -2]]), '#3a3a42', { sd: 1, hd: 0.8, lw: 1.4, light: '#7a7a86' });
  for (let i = 0; i < 5; i++) { const py = -84 - i * 11, r = 7 + i * 3.4; const gr = g.createRadialGradient(31 + i * 2, py, 0, 31 + i * 2, py, r); gr.addColorStop(0, `rgba(60,54,52,${0.34 - i * 0.06})`); gr.addColorStop(1, 'rgba(60,54,52,0)'); g.fillStyle = gr; g.fillRect(31 + i * 2 - r, py - r, r * 2, r * 2); }
  g.restore();
  ashLight(x, y - 30 * s, 160 * s, '#ff7a20', 0.55);
}
// hide-drying rack
function ashRack(g, x, y, s, R, e) {
  g.save(); g.translate(x, y); g.scale(s, s);
  shadowBlob(g, 6, 2, 26, 6, 0.3);
  for (const px of [-18, 18]) { line(g, [[px - 5, 0], [px, -34], [px + 5, 0]], OUT, 4); line(g, [[px - 5, 0], [px, -34], [px + 5, 0]], '#6a4426', 2.2); }
  line(g, [[-22, -32], [22, -32]], OUT, 4); line(g, [[-22, -32], [22, -32]], '#7a5030', 2.4);
  toon(g, poly([[-15, -32], [-3, -32], [-1, -12], [-8, -8], [-16, -14]]), '#b08a62', { sd: 1, hd: 0.5, lw: 1.3 });
  toon(g, poly([[1, -32], [14, -32], [16, -16], [8, -10], [2, -16]]), '#7a5236', { sd: 1, hd: 0.5, lw: 1.3 });
  g.restore();
}
// stacked cairn with an ember on top
function ashCairn(g, x, y, s, R, e) {
  shadowBlob(g, x + 6 * s, y + 2, 18 * s, 5 * s, 0.3);
  let yy = y, r = 13;
  for (let i = 0; i < 5; i++) { toon(g, ellipse(x + (R() - 0.5) * 3 * s, yy - 4 * s, r * s, r * 0.55 * s), i % 2 ? '#4a4444' : '#3a3434', { sd: 1.2, hd: 0.8, lw: 1.3, light: '#6a6260' }); yy -= r * 0.75 * s; r *= 0.78; }
  if (e.lit !== false) { g.save(); g.globalCompositeOperation = 'lighter'; glow(g, x, yy - 2 * s, 14 * s, '#ff7a20', 0.7); g.restore(); flat(g, circle(x, yy - 2 * s, 2.4 * s), '#ffd27a', 0.8, '#7a2a08'); ashLight(x, yy, 50 * s, '#ff7a20', 0.25); }
}
// huge obsidian monolith (landmark)
function ashMonolith(g, x, y, s, R, e) {
  shadowBlob(g, x + 30 * s, y + 6 * s, 70 * s, 16 * s, 0.45);
  const sh = [{ dx: -26, h: 70, w: 12, l: -0.25, dy: -4 }, { dx: 30, h: 90, w: 14, l: 0.2, dy: -6 }, { dx: 0, h: 170 + R() * 40, w: 26, l: (R() - 0.5) * 0.12, dy: 0 }, { dx: -16, h: 46, w: 10, l: -0.4, dy: 6 }, { dx: 22, h: 40, w: 9, l: 0.35, dy: 8 }];
  for (const p of sh) ashShard(g, x + p.dx * s, y + p.dy * s, p.w * s, p.h * s, p.l);
  g.save(); g.globalCompositeOperation = 'lighter';
  line(g, [[x - 8 * s, y - 40 * s], [x - 2 * s, y - 120 * s]], 'rgba(170,190,255,0.35)', 3 * s);
  if (e.glow) glow(g, x, y - 20 * s, 60 * s, '#ff5a14', 0.35);
  g.restore();
}
// pale star-temple column, fluted, usually broken; e.h height, e.whole keeps the capital
function ashColumn(g, x, y, s, R, e) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const col = e.color || '#b2aa9c', h = e.h ?? (34 + R() * 60), r = 10, top = -10 - h;
  shadowBlob(g, 14, 3, 26, 7, 0.38);
  toon(g, rrect(-16, -10, 32, 11, 1.5), dark(col, 0.08), { sd: 0.8, hd: 0.5, lw: 1.5 });
  const shaft = e.whole ? rect(-r, top, r * 2, h) : poly([[-r, -10], [-r, top + 6], [-r * 0.5, top - 2], [-r * 0.1, top + 5], [r * 0.35, top - 4], [r * 0.7, top + 3], [r, top - 1], [r, -10]]);
  toon(g, shaft, col, { sd: 2.6, hd: 1.3, lw: 1.6, detail: c => { c.strokeStyle = 'rgba(60,50,40,0.35)'; c.lineWidth = 1.2; for (const fx of [-6, -2, 2, 6]) { c.beginPath(); c.moveTo(fx, -10); c.lineTo(fx, top - 6); c.stroke(); } c.fillStyle = 'rgba(70,64,60,0.35)'; c.fillRect(-r, -10 - h * 0.3 - R() * 10, r * 2, 6); } });
  if (e.whole) { toon(g, rrect(-15, top - 9, 30, 10, 1.5), col, { sd: 1, hd: 0.6, lw: 1.5 }); flat(g, star(0, top - 4, 3.5, 0.45, 8), '#c9a85a', 0.8); }
  else if (R() < 0.6) { const fx = 22 + R() * 10; toon(g, rrect(fx - 9, -9, 18, 9, 4), dark(col, 0.04), { sd: 1, hd: 0.6, lw: 1.4 }); toon(g, ellipse(fx + 9, -4.5, 3, 4.5), light(col, 0.06), { sd: 0.3, hd: 0.2, lw: 1.1 }); }
  g.restore();
}
// broken portico of the star-temple: stepped platform, a colonnade, a fallen architrave
function ashTemple(g, x, y, s, R, e) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const col = '#aaa294', W2 = e.w || 130;
  shadowBlob(g, 20, 8, W2 + 40, 26, 0.42);
  for (let k = 0; k < 3; k++) { const ww = W2 + 20 - k * 10, yy = -k * 8; toon(g, poly([[-ww, yy], [ww, yy], [ww + 10, yy - 8], [-ww + 10, yy - 8]]), mix(col, '#6e665c', 0.25 - k * 0.07), { sd: 0.8, hd: 0.6, lw: 1.5 }); toon(g, rect(-ww, yy, ww * 2, 6), dark(col, 0.18), { sd: 0, hd: 0, lw: 1.4 }); }
  const n = e.n || 5, sp = (W2 * 2 - 30) / (n - 1), hs = [];
  for (let i = 0; i < n; i++) hs.push(i === 1 || i === 2 ? 92 : 30 + R() * 50);
  for (let i = 0; i < n; i++) ashColumn(g, -W2 + 15 + i * sp, -22, 0.9, R, { h: hs[i], whole: i === 1 || i === 2, color: col });
  const ax = -W2 + 15 + sp - 18, top = -22 - 0.9 * (10 + 92) - 8;
  toon(g, rrect(ax - 4, top - 14, sp + 44, 15, 2), col, { sd: 1.2, hd: 0.7, lw: 1.6, detail: c => { c.strokeStyle = 'rgba(60,50,40,0.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(ax - 4, top - 7); c.lineTo(ax + sp + 40, top - 7); c.stroke(); for (let k = 0; k < 4; k++) flat(c, star(ax + 14 + k * (sp + 10) / 3.4, top - 7, 3, 0.45, 8), '#c9a85a', 0); } });
  toon(g, poly([[W2 * 0.3, -18], [W2 * 0.3 + 60, -26], [W2 * 0.3 + 64, -16], [W2 * 0.3 + 6, -8]]), dark(col, 0.05), { sd: 1, hd: 0.6, lw: 1.4 });
  for (let i = 0; i < 7; i++) toon(g, poly(ashBlobPts(-W2 + R() * W2 * 2, -4 - R() * 20, 4 + R() * 6, 5, R)), dark(col, R() * 0.15), { sd: 0.8, hd: 0.5, lw: 1.1 });
  g.restore();
}
// ruined observatory: drum, cracked dome shell with ribs, bronze armillary sphere
function ashDome(g, x, y, s, R, e) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const col = '#aaa294', rx = 74, ry = 28;
  shadowBlob(g, 24, 8, 110, 26, 0.45);
  const yt = cylinder(g, 0, 0, rx, ry, 46, col, { rowH: 9, cols: 12, seed: 17, top: false, lw: 2 });
  for (const wx of [-40, 0, 40]) windowArch(g, wx, -24, 10, 18, null);
  // interior (dark) visible through the broken half
  g.fillStyle = '#1e1a1c'; g.beginPath(); g.ellipse(0, yt, rx - 2, ry - 1, 0, 0, PI * 2); g.fill();
  // shell: left half intact, right half broken away
  const sh = new Path2D(); sh.moveTo(-rx, yt); sh.bezierCurveTo(-rx, yt - 70, -30, yt - 96, 6, yt - 96); sh.lineTo(14, yt - 80); sh.lineTo(4, yt - 66); sh.lineTo(18, yt - 52); sh.lineTo(8, yt - 36); sh.lineTo(24, yt - 22); sh.lineTo(16, yt - 6); sh.lineTo(28, yt + ry * 0.9); sh.ellipse(0, yt, rx, ry, 0, 1.18, PI, false); sh.closePath();
  toon(g, sh, col, { sd: 6, hd: 3, lw: 2, light: '#d6cebe', detail: c => { c.strokeStyle = 'rgba(60,50,40,0.45)'; c.lineWidth = 1.3; for (let k = 1; k < 6; k++) { const t = k / 6; c.beginPath(); c.ellipse(0, yt - 92 * (1 - Math.pow(1 - t, 1.5)) + ry * 0.5 * (1 - t), rx * Math.sqrt(1 - t * t), ry * (1 - t) * 0.8 + 1, 0, PI * 0.5, PI); c.stroke(); } } });
  // exposed ribs on the broken side
  for (let k = 0; k < 4; k++) { const a = -0.15 - k * 0.32; const p = []; for (let j = 0; j <= 10; j++) { const t = j / 10; p.push([C(a) * rx * Math.sin(t * PI / 2) * 0.98, yt - 92 * Math.cos(t * PI / 2) + S(a) * ry * Math.sin(t * PI / 2)]); } if (k < 2) { line(g, p.slice(0, 8 - k * 2), OUT, 6); line(g, p.slice(0, 8 - k * 2), dark(col, 0.06), 3.6); } }
  // armillary sphere
  const ax = 18, ayy = yt - 34;
  line(g, [[ax, yt + 6], [ax, ayy + 22]], OUT, 5); line(g, [[ax, yt + 6], [ax, ayy + 22]], '#8a6a2a', 3);
  for (const [rr, rot, sq] of [[24, 0, 1], [24, 0.6, 0.3], [24, -0.5, 0.45], [17, PI / 2, 0.35]]) { const p = ellipse(ax, ayy, rr, rr * sq, rot); stroke(g, p, OUT, 4.4); stroke(g, p, '#c9993e', 2.4); }
  flat(g, circle(ax, ayy, 5), '#ffe9a0', 1.2, '#7a5a1a');
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, ax, ayy, 30, '#a8c0ff', 0.35); g.restore();
  g.restore();
  ashLight(x + 18 * s, y - 80 * s, 120 * s, '#a8c0ff', 0.3);
}
// star-priest statue: hooded figure lifting a star; e.toppled lies broken on the ground
function ashStatue(g, x, y, s, R, e) {
  g.save(); g.translate(x, y); g.scale((e.flip ? -1 : 1) * s, s);
  const col = '#a8a092';
  shadowBlob(g, 10, 3, 28, 7, 0.38);
  if (e.toppled) {
    // empty plinth with broken ankles; the star-priest lies broken in front of it
    toon(g, rrect(-15, -14, 30, 14, 2), dark(col, 0.08), { sd: 1, hd: 0.6, lw: 1.5 });
    toon(g, poly([[-9, -14], [-8, -21], [-4, -19], [-1, -23], [3, -20], [8, -22], [9, -14]]), col, { sd: 1, hd: 0.7, lw: 1.3 });
    shadowBlob(g, 0, 15, 42, 6, 0.32);
    line(g, [[14, 3], [42, -5]], OUT, 4.5); line(g, [[14, 3], [42, -5]], col, 2.6);
    flat(g, star(45, -6, 7, 0.45, 8), '#c9a85a', 1.2);
    toon(g, blob([[-30, 4], [8, 1], [22, 4], [24, 12], [-28, 15], [-33, 10]], 0.5), col, { sd: 2, hd: 1, lw: 1.5, detail: c => { c.strokeStyle = 'rgba(60,50,40,0.35)'; c.lineWidth = 1.1; c.beginPath(); for (const xx of [-18, -6, 6]) { c.moveTo(xx, 3); c.lineTo(xx + 1.5, 13); } c.stroke(); } });
    toon(g, blob([[-46, 4], [-40, 0], [-34, 3], [-35, 11], [-43, 12]], 0.6), dark(col, 0.04), { sd: 1, hd: 0.6, lw: 1.3 });
    line(g, [[-44, 5.6], [-41.4, 5.2]], 'rgba(42,36,32,0.75)', 1.1); line(g, [[-39, 5], [-36.4, 4.8]], 'rgba(42,36,32,0.75)', 1.1); // serene closed eyes
    g.restore(); return;
  }
  toon(g, rrect(-15, -14, 30, 14, 2), dark(col, 0.08), { sd: 1, hd: 0.6, lw: 1.5 });
  toon(g, blob([[-11, -14], [-9, -44], [-5, -58], [5, -58], [9, -44], [11, -14]], 0.6), col, { sd: 2, hd: 1.2, lw: 1.6, detail: c => { c.strokeStyle = 'rgba(60,50,40,0.35)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(-4, -16); c.lineTo(-3, -50); c.moveTo(4, -16); c.lineTo(3, -48); c.stroke(); } });
  toon(g, blob([[-7, -56], [-8, -66], [0, -72], [8, -66], [7, -56]], 0.6), dark(col, 0.04), { sd: 1, hd: 0.6, lw: 1.4 });
  flat(g, ellipse(0, -61, 4, 3.5), '#2a2420', 0);
  line(g, [[6, -50], [12, -66], [10, -80]], OUT, 5); line(g, [[6, -50], [12, -66], [10, -80]], col, 3);
  flat(g, star(10, -86, 9, 0.42, 8), '#d4b062', 1.3);
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 10, -86, 18, '#ffe6a0', 0.35); g.restore();
  g.restore();
}
// Queen Maelis's sealing stone: pale menhir with glowing blue runes; e.broken, e.chains
function ashSeal(g, x, y, s, R, e) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const col = '#a6acb8', br = !!e.broken;
  shadowBlob(g, 14, 4, 30, 8, 0.42);
  for (let i = 0; i < 5; i++) toon(g, ellipse(-16 + i * 8, -1 + (i % 2) * 2, 6, 3.5), '#4a4648', { sd: 0.6, hd: 0.4, lw: 1.1 });
  const P = br ? poly([[-14, 0], [-13, -26], [-9, -34], [-4, -28], [1, -38], [6, -30], [10, -35], [14, -24], [14, 0]]) : blob([[-14, 0], [-15, -40], [-11, -80], [0, -92], [11, -82], [15, -42], [14, 0]], 0.4);
  toon(g, P, col, { sd: 3.4, hd: 1.8, lw: 1.9, light: '#dadfe8', detail: c => { c.fillStyle = 'rgba(70,90,80,0.25)'; c.beginPath(); c.ellipse(-8, -14, 5, 9, 0.2, 0, PI * 2); c.fill(); c.strokeStyle = 'rgba(40,44,56,0.45)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(8, -20); c.lineTo(5, -30); c.lineTo(9, -38); c.stroke(); } });
  const rows = br ? 2 : 5, a = br ? 0.45 : 1;
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 0, br ? -18 : -46, br ? 26 : 46, '#5ac8ff', 0.35 * a); g.restore();
  g.lineCap = 'round';
  for (let k = 0; k < rows; k++) {
    const yy = -12 - k * 13, gx = -2;
    const glyph = [[gx - 4, yy], [gx, yy - 7], [gx + 4, yy], [gx, yy + 2]];
    g.strokeStyle = `rgba(90,200,255,${0.45 * a})`; g.lineWidth = 4; ashPolyline(g, k % 2 ? glyph : [[gx - 4, yy - 6], [gx + 4, yy - 6], [gx, yy + 1], [gx - 4, yy - 6]]);
    g.strokeStyle = `rgba(220,248,255,${0.95 * a})`; g.lineWidth = 1.5; ashPolyline(g, k % 2 ? glyph : [[gx - 4, yy - 6], [gx + 4, yy - 6], [gx, yy + 1], [gx - 4, yy - 6]]);
  }
  if (!br) { flat(g, star(0, -78, 6.5, 0.42, 8), '#e8f6ff', 1); g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 0, -78, 16, '#7ad8ff', 0.6); g.restore(); toon(g, poly([[-5, -86], [-3, -90], [0, -87], [3, -90], [5, -86]]), '#e8f6ff', { sd: 0, hd: 0, lw: 1 }); }
  else { toon(g, poly([[18, -2], [22, -12], [58, -20], [66, -12], [62, -2], [26, 4]]), col, { sd: 2, hd: 1, lw: 1.7, light: '#dadfe8' }); g.strokeStyle = 'rgba(90,200,255,0.3)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(30, -6); g.lineTo(38, -12); g.lineTo(46, -8); g.stroke(); }
  if (e.chains) for (const sx of [-1, 1]) { const p = []; for (let k = 0; k <= 8; k++) { const t = k / 8; p.push([sx * (12 + t * 30), (br ? -24 : -50) + t * 46 + S(t * PI) * 10]); } for (let k = 0; k < p.length; k++) { const [cx, cy] = p[k]; stroke(g, ellipse(cx, cy, 3.6, 2.4, k % 2 ? 0.6 : -0.4), OUT, 3.4); stroke(g, ellipse(cx, cy, 3.6, 2.4, k % 2 ? 0.6 : -0.4), '#6a6a74', 1.8); } }
  g.restore();
  ashLight(x, y - (br ? 20 : 50) * s, (br ? 80 : 140) * s, '#5ac8ff', br ? 0.18 : 0.45);
}
// giant horned beast skull half-buried in ash
function ashSkull(g, x, y, s, R, e) {
  g.save(); g.translate(x, y); g.scale((e.flip ? -1 : 1) * s, s);
  shadowBlob(g, 10, 6, 90, 18, 0.42);
  const bone = '#d8cfbc';
  for (const [sx, sy, k] of [[-20, -42, 1], [10, -50, 0.85]]) {
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12, a = PI * 1.05 + t * 1.9; pts.push([sx - 30 * k + C(a) * 40 * k * (1 - t * 0.25), sy - 30 * k * t + S(a) * 44 * k * (1 - t * 0.2)]); }
    const L = [], Rr = []; for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = 9 * k * (1 - i / 12) + 0.8; L.push([pts[i][0] - dy / l * w, pts[i][1] + dx / l * w]); Rr.push([pts[i][0] + dy / l * w, pts[i][1] - dx / l * w]); }
    toon(g, poly(L.concat(Rr.reverse())), '#cabda4', { sd: 2.4, hd: 1.2, lw: 1.8, light: '#efe6d4', detail: c => { c.strokeStyle = 'rgba(90,76,60,0.35)'; c.lineWidth = 1; for (let i = 2; i < 11; i += 2) { c.beginPath(); c.moveTo(L[i][0], L[i][1]); c.lineTo(Rr[Rr.length - 1 - i][0], Rr[Rr.length - 1 - i][1]); c.stroke(); } } });
  }
  toon(g, blob([[-56, -6], [-60, -34], [-36, -58], [0, -62], [30, -48], [74, -30], [86, -14], [70, 0], [20, 4], [-30, 4]], 0.5), bone, { sd: 4, hd: 2, lw: 2, light: '#f4eee0', detail: c => { c.strokeStyle = 'rgba(80,70,56,0.4)'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-30, -50); c.quadraticCurveTo(-10, -30, -24, -6); c.moveTo(20, -50); c.lineTo(30, -30); c.stroke(); } });
  toon(g, blob([[-30, -40], [-12, -46], [-6, -30], [-20, -22], [-34, -28]], 0.6), '#1d130c', { sd: 0, hd: 0, lw: 1.2 });
  toon(g, blob([[48, -30], [60, -28], [62, -20], [52, -18]], 0.6), '#1d130c', { sd: 0, hd: 0, lw: 1 });
  for (let i = 0; i < 6; i++) toon(g, poly([[16 + i * 10, -2], [20 + i * 10, 10], [24 + i * 10, -2]]), '#ece4d2', { sd: 0, hd: 0, lw: 1.2 });
  toon(g, blob([[-80, 6], [-40, -8], [40, -6], [100, 4], [60, 14], [-40, 14]], 0.5), '#5e564e', { sd: 1.4, hd: 1.2, lw: 1.4, light: '#7a7268' });
  g.restore();
}
// giant ribcage arching out of the ash
function ashRibs(g, x, y, s, R, e) {
  g.save(); g.translate(x, y); g.scale((e.flip ? -1 : 1) * s, s);
  shadowBlob(g, 10, 8, 120, 20, 0.4);
  const bone = '#d4cab6', n = 6;
  for (let i = 0; i < n; i++) { const bx = -84 + i * 32, h = 74 - Math.abs(i - 2.2) * 9; const p = [[bx, 4], [bx - 8, -h * 0.55], [bx + 4, -h], [bx + 26, -h * 0.9], [bx + 34, -h * 0.5]]; line(g, p, OUT, 11); line(g, p, i % 2 ? bone : dark(bone, 0.05), 7.4); line(g, p.slice(1, 4), 'rgba(255,255,255,0.4)', 2.2); }
  for (let i = 0; i < 10; i++) toon(g, ellipse(-92 + i * 21, 4 + S(i) * 1.5, 9, 6), bone, { sd: 1, hd: 0.6, lw: 1.4 });
  toon(g, blob([[-110, 10], [-60, -2], [60, 0], [130, 10], [40, 18], [-60, 18]], 0.5), '#5e564e', { sd: 1.4, hd: 1.2, lw: 1.4, light: '#7a7268' });
  g.restore();
}
// rusted blades and spears of a forgotten battle, one with a tattered pennant (e.color)
function ashSwords(g, x, y, s, R, e) {
  shadowBlob(g, x + 6 * s, y + 2, 24 * s, 6 * s, 0.3);
  const n = e.n || 4;
  for (let i = 0; i < n; i++) {
    const bx = x + (i - (n - 1) / 2) * 13 * s + (R() - 0.5) * 6 * s, by = y + (i % 2) * 4 * s, a = -PI / 2 + (R() - 0.5) * 0.7, L = (26 + R() * 12) * s;
    const tx = bx + C(a) * L, ty = by + S(a) * L;
    if (i === 1) { line(g, [[bx, by], [tx, ty - 14 * s]], OUT, 3.4 * s); line(g, [[bx, by], [tx, ty - 14 * s]], '#6a4a2a', 1.8 * s); toon(g, poly([[tx, ty - 14 * s], [tx + 18 * s, ty - 10 * s], [tx + 10 * s, ty - 6 * s], [tx + 16 * s, ty - 1 * s], [tx, ty - 2 * s]]), e.color || '#3a5a9a', { sd: 0.8, hd: 0.4, lw: 1.2 }); continue; }
    line(g, [[bx, by], [tx, ty]], OUT, 4.2 * s); line(g, [[bx, by], [tx, ty]], '#8a8478', 2.4 * s);
    const cx2 = bx + C(a) * L * 0.78, cy2 = by + S(a) * L * 0.78;
    line(g, [[cx2 - 6 * s, cy2 + 1], [cx2 + 6 * s, cy2 - 1]], OUT, 3.4 * s); line(g, [[cx2 - 6 * s, cy2 + 1], [cx2 + 6 * s, cy2 - 1]], '#7a5a2a', 1.8 * s);
    line(g, [[cx2, cy2], [tx, ty]], OUT, 3 * s); line(g, [[cx2, cy2], [tx, ty]], '#4a3020', 1.6 * s);
  }
}
// dwarven field cannon (Torvald's battery)
function ashCannon(g, x, y, s, R, e) {
  g.save(); g.translate(x, y); g.scale((e.flip ? -1 : 1) * s, s);
  shadowBlob(g, 8, 3, 36, 8, 0.38);
  toon(g, poly([[-26, -6], [18, -6], [22, -16], [-20, -18]]), '#6a4426', { sd: 1, hd: 0.6, lw: 1.5 });
  toon(g, capsule(-22, -22, 30, -32, 9, 6.5), '#5a5e66', { sd: 2, hd: 1.2, lw: 1.6, light: '#9aa0aa' });
  for (const bx of [-12, 8]) line(g, [[bx, -30 + bx * 0.1], [bx, -16 + bx * 0.1]], '#c9993e', 2.2);
  toon(g, ellipse(31, -32.5, 3.4, 6), '#1a1a1e', { sd: 0, hd: 0, lw: 1.3 });
  for (const wx of [-14, 10]) { toon(g, circle(wx, -6, 9), '#7a5030', { sd: 1, hd: 0.6, lw: 1.5 }); toon(g, circle(wx, -6, 2.5), '#3a3a40', { sd: 0, hd: 0, lw: 1 }); }
  for (let i = 0; i < 3; i++) toon(g, circle(28 + i * 7, -3, 3.6), '#3a3a40', { sd: 0.8, hd: 0.6, lw: 1.1, light: '#8a8a92' });
  g.restore();
}
// heavy broken chains anchored to a ring-stone (the old seals of the crater)
function ashChains(g, x, y, s, R, e) {
  g.save(); g.translate(x, y); g.scale((e.flip ? -1 : 1) * s, s);
  shadowBlob(g, 10, 3, 40, 8, 0.32);
  toon(g, blob([[-22, 0], [-20, -16], [-6, -22], [8, -18], [14, -4], [6, 2]], 0.5), '#8e929c', { sd: 2, hd: 1, lw: 1.6, light: '#c8ccd6' });
  stroke(g, ellipse(-4, -12, 6, 4), OUT, 4); stroke(g, ellipse(-4, -12, 6, 4), '#6a6a74', 2.2);
  let cx = 4, cy = -10;
  for (let k = 0; k < 9; k++) { cx += 8 + R() * 2; cy += (R() - 0.3) * 5; stroke(g, ellipse(cx, cy, 5, 3.2, k % 2 ? 0.5 : -0.3), OUT, 4); stroke(g, ellipse(cx, cy, 5, 3.2, k % 2 ? 0.5 : -0.3), '#6e6e78', 2.2); }
  g.restore();
}
// great pyre / bonfire
function ashPyre(g, x, y, s, R, e) {
  shadowBlob(g, x + 6 * s, y + 3, 30 * s, 8 * s, 0.38);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; line(g, [[x + C(a) * 20 * s, y + S(a) * 7 * s], [x - C(a) * 4 * s, y - 14 * s]], OUT, 6 * s); line(g, [[x + C(a) * 20 * s, y + S(a) * 7 * s], [x - C(a) * 4 * s, y - 14 * s]], '#5a3a1e', 4 * s); }
  ashFire(g, x, y - 8 * s, s * 1.7);
}
// broken round watchtower of the old outposts
function ashTowerRuin(g, x, y, s, R, e) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const col = e.color || '#7e786e';
  shadowBlob(g, 18, 4, 50, 14, 0.4);
  const yt = cylinder(g, 0, 0, 30, 12, 70 + R() * 40, col, { rowH: 10, cols: 8, seed: 7, top: false });
  toon(g, poly([[-30, yt], [-24, yt - 16], [-14, yt - 6], [-4, yt - 22], [6, yt - 8], [16, yt - 18], [24, yt - 4], [30, yt], [30, yt + 12], [-30, yt + 12]]), col, { sd: 1.4, hd: 0.8, lw: 1.6, detail: c => wallBricks(c, -30, yt - 22, 30, yt + 12, { rowH: 10, bw: 15, seed: 4 }) });
  for (let i = 0; i < 6; i++) toon(g, poly(ashBlobPts(-40 + R() * 90, 4 + R() * 10, 4 + R() * 6, 5, R)), dark(col, R() * 0.2), { sd: 0.8, hd: 0.5, lw: 1.1 });
  g.restore();
}
// small ring of dark standing stones (ash-folk sacred circle)
function ashStones(g, x, y, s, R, e) {
  const n = e.n || 6, rx = (e.r || 46) * s, ry = rx * 0.45, list = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2 + 0.3; list.push([x + C(a) * rx, y + S(a) * ry, (18 + R() * 16) * s]); }
  list.sort((a, b) => a[1] - b[1]);
  if (e.fire) ashFire(g, x, y, s * 0.9);
  for (const [px, py, h] of list) { shadowBlob(g, px + 5, py + 1, 10 * s, 3 * s, 0.3); toon(g, blob([[px - 6 * s, py], [px - 7 * s, py - h * 0.6], [px - 2 * s, py - h], [px + 4 * s, py - h * 0.9], [px + 6 * s, py]], 0.5), '#3a3436', { sd: 1.6, hd: 1, lw: 1.5, light: '#5e5658' }); }
}
// low dry-stone wall of black stones between (x1,y1) and (x2,y2)
function ashDrywall(g, x, y, s, R, e) {
  const L = Math.hypot(e.x2 - e.x1, e.y2 - e.y1), n = Math.max(2, Math.round(L / 13));
  for (let row = 0; row < 3; row++) for (let i = 0; i <= n - (row % 2); i++) {
    const t = (i + (row % 2) * 0.5) / n, px = e.x1 + (e.x2 - e.x1) * t, py = e.y1 + (e.y2 - e.y1) * t - row * 7 * s;
    toon(g, ellipse(px + (R() - 0.5) * 2, py - 4 * s, (7 + R() * 2) * s, (4.4 + R()) * s), mix('#3a3436', '#4e4648', R()), { sd: 1, hd: 0.8, lw: 1.1, light: '#6a6262' });
  }
}
// invisible light source (tune lighting): e.r radius, e.color, e.a strength
function ashDecalOver(g, x, y, s, R, e) { ashDecal(g, e, R, ASH.N); }
function ashGlow(g, x, y, s, R, e) { ashLight(x, y, (e.r || 160) * s, e.color || '#ff6a20', e.a ?? 0.4); }
// drifting shadow wisps (the ravine)
function ashWisps(g, x, y, s, R, e) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < (e.n || 4); i++) { const px = x + (R() - 0.5) * 80 * s, py = y + (R() - 0.5) * 40 * s; glow(g, px, py - 16, 22 * s, '#9a6ad8', 0.35); g.strokeStyle = 'rgba(190,150,255,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py - 16); g.quadraticCurveTo(px - 14 * s, py - 10, px - 24 * s, py - 18); g.stroke(); g.fillStyle = 'rgba(230,210,255,0.8)'; g.beginPath(); g.arc(px, py - 16, 2.2 * s, 0, PI * 2); g.fill(); }
  g.restore();
  ashLight(x, y - 16, 90 * s, '#8a5ad8', 0.25);
}
Object.assign(ASH_DECO, { ashDecalOver, ashDrywall, ashGate, ashBarricade, ashHut, ashTotem, ashBrazier, ashForge, ashRack, ashCairn, ashMonolith, ashColumn, ashTemple, ashDome, ashStatue, ashSeal, ashSkull, ashRibs, ashSwords, ashCannon, ashChains, ashPyre, ashTowerRuin, ashStones, ashGlow, ashWisps });
// ===== end of ash theme =====

// >>> swamp theme (Chapter III)
// The Drowned Crown: bog water & lily pads, raised causeways, marsh flora, sunken ruins, mist and will-o'-wisps.
// Managed block (keep both marker lines). Enabled by THEMES.swamp.swamp; hooks in genmap.js call swampWater /
// swampRoad / swampScatter / swampDeco / swampAtmosphere. Map config `map.swamp`:
//   wet (0..1 share of open ground under water), tilt [x, y] (wetter toward +x / +y), pools & isles [{ x, y, rx, ry }],
//   channels [{ pts, w }], reedbeds [{ x, y, rx, ry, n }], paved (flagstone roads & quay walls), mist / flies / embers /
//   lilies / reeds (density multipliers). Deco items 't: swamp*' (see SWAMP_FOOT) may set wet: true | false.
const SWP = {
  stone: '#8e8b7d', stoneL: '#aaa696', stoneD: '#66655a', moss: '#6b7f37', mossL: '#8c9e48', mossD: '#46582a',
  wood: '#6a5236', woodL: '#8c6e48', woodD: '#45362a', thatch: '#7a7246', iron: '#35373c', slate: '#4f5553',
  ripple: 'rgba(204,228,214,0.55)', ember: '#ff7a2a', emberL: '#ffc46a', morrow: '#6e1c2c', raven: '#16111a', realm: '#c0392b',
};
const swMk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
let swCur = null; // terrain kit of the map being painted (water field for reflections)
const swClamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const swMix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function swEll(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, PI * 2); g.fill(); }
function swLine(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
// two-pass chamfer distance (in cells) to the nearest cell flagged in src
function swDT(src, fw, fh) {
  const D = new Float32Array(fw * fh), B = 1.4142;
  for (let i = 0; i < D.length; i++) D[i] = src[i] ? 0 : 1e6;
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
    const i = y * fw + x; let v = D[i]; if (!v) continue;
    if (x > 0) v = Math.min(v, D[i - 1] + 1);
    if (y > 0) { v = Math.min(v, D[i - fw] + 1); if (x > 0) v = Math.min(v, D[i - fw - 1] + B); if (x < fw - 1) v = Math.min(v, D[i - fw + 1] + B); }
    D[i] = v;
  }
  for (let y = fh - 1; y >= 0; y--) for (let x = fw - 1; x >= 0; x--) {
    const i = y * fw + x; let v = D[i]; if (!v) continue;
    if (x < fw - 1) v = Math.min(v, D[i + 1] + 1);
    if (y < fh - 1) { v = Math.min(v, D[i + fw] + 1); if (x < fw - 1) v = Math.min(v, D[i + fw + 1] + B); if (x > 0) v = Math.min(v, D[i + fw - 1] + B); }
    D[i] = v;
  }
  return D;
}
// ripple rings around something standing in water
function swRipples(g, x, y, rx, ry, a = 0.5) {
  g.save(); g.lineWidth = 1.2;
  g.strokeStyle = `rgba(14,24,20,${a * 0.5})`; g.beginPath(); g.ellipse(x, y + 1.5, rx, ry, 0, 0, PI * 2); g.stroke();
  g.strokeStyle = `rgba(206,230,214,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, PI * 0.05, PI * 0.95); g.stroke();
  g.strokeStyle = `rgba(206,230,214,${a * 0.5})`; g.beginPath(); g.ellipse(x, y + 1, rx * 1.45, ry * 1.5, 0, PI * 0.15, PI * 0.85); g.stroke();
  g.restore();
}
// clip everything drawn by fn to above the waterline y (things standing in the bog)
function swAbove(g, y, fn) { g.save(); g.beginPath(); g.rect(-9999, -9999, 19998, 9999 + y); g.clip(); fn(); g.restore(); }

// footprints on the bog field: [mode, radius]; mode 1 = dry island under it, -1 = water under it, 0 = no change
export const SWAMP_FOOT = {
  house: [1, 92], barn: [1, 100], well: [1, 44], tent: [1, 62], walltower: [1, 72], gate: [1, 110], statue: [1, 40], pillar: [1, 30], arch: [1, 70],
  crates: [1, 34], cart: [1, 44], campfire: [1, 40], sign: [1, 22], banner: [1, 22], log: [1, 30], stump: [1, 22], haystack: [1, 30],
  swampStilthouse: [-1, 70], swampSunkenHouse: [-1, 72], swampBoat: [-1, 40], swampTower: [-1, 62], swampColumn: [0, 28], swampArch: [-1, 64],
  swampStatue: [-1, 60], swampCrypt: [1, 84], swampTombs: [1, 48], swampWatchtower: [1, 70], swampRuin: [1, 86], swampBrazier: [1, 24],
  swampLantern: [1, 20], swampBanner: [1, 22], swampTent: [1, 64], swampCathedral: [1, 0], swampGate: [1, 150], swampObelisk: [1, 30], swampShrine: [1, 40], swampCage: [1, 24],
};
// scatter clearance (merged into genmap's CLEAR_R)
export const SWAMP_CLEAR = {
  swampStilthouse: 80, swampSunkenHouse: 80, swampBoat: 40, swampTower: 70, swampColumn: 32, swampArch: 74, swampStatue: 70, swampCrypt: 90, swampTombs: 50,
  swampWatchtower: 80, swampRuin: 92, swampTent: 66, swampBrazier: 26, swampLantern: 22, swampBanner: 24, swampCathedral: 330, swampGate: 170, swampObelisk: 32, swampShrine: 44, swampCage: 26,
};

// ------------------------------------------------------------------ terrain: ground mottling + bog water
export function swampWater(g, wm, c) {
  const { M, R, N, level, W, H, Path, smoothPts } = c;
  const cf = M.swamp || {};
  const seed = M.seed || 7, Rr = rng(seed * 977 + 13);
  // --- ground: moss, peat and damp hollows, leaf litter ---
  for (let i = 0; i < 110; i++) {
    const x = Rr() * W, y = Rr() * H, r = 60 + Rr() * 240, k = Rr();
    const col = k < 0.4 ? 'rgba(122,146,66,0.14)' : k < 0.75 ? 'rgba(30,38,20,0.17)' : 'rgba(84,66,38,0.13)';
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.translate(x, y); g.scale(1, 0.6); g.translate(-x, -y); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
  }
  const litter = ['#7a6a3a', '#5a4a2a', '#8a7a44', '#4e5a2c', '#9a8248'];
  for (let i = 0; i < 6000; i++) { const x = Rr() * W, y = Rr() * H; g.fillStyle = alpha(litter[i % 5], 0.35 + Rr() * 0.3); g.beginPath(); g.ellipse(x, y, 1 + Rr() * 1.8, 0.7 + Rr() * 0.9, Rr() * 3, 0, PI * 2); g.fill(); }

  // --- masks at field resolution ---
  const cs = 3, fw = Math.ceil(W / cs), fh = Math.ceil(H / cs);
  const mask = () => { const cv = swMk(fw, fh), m = cv.getContext('2d'); m.scale(1 / cs, 1 / cs); m.lineCap = 'round'; m.lineJoin = 'round'; m.fillStyle = '#fff'; m.strokeStyle = '#fff'; return [cv, m]; };
  const [dryC, dg] = mask(), [wetC, wg] = mask(), [hardC, hg] = mask(), [keepC, kg] = mask(), [roadC, rgm] = mask();
  const roads = [];
  for (const p of level.paths || []) {
    if (p.air) continue;
    const P = new Path(p.pts, { width: p.width ?? 26 }), pts = [];
    for (let i = 0; i < P.n; i += 3) pts.push([P.xs[i], P.ys[i]]);
    pts.push([P.xs[P.n - 1], P.ys[P.n - 1]]);
    roads.push({ pts, w: (P.width + 20) * 2 });
  }
  for (const r of M.roads || []) roads.push({ pts: smoothPts(r.pts), w: r.w || 60, deco: true });
  for (const r of roads) {
    dg.lineWidth = r.w + (cf.bank ?? 20); swLine(dg, r.pts);
    kg.lineWidth = r.w + 36; swLine(kg, r.pts);
    rgm.lineWidth = r.w + 2; swLine(rgm, r.pts);
  }
  for (const [x, y] of level.plots || []) { swEll(dg, x, y - 6, 84, 58); swEll(kg, x, y - 14, 90, 74); }
  if (level.hero) { swEll(dg, level.hero[0], level.hero[1], 44, 28); swEll(kg, level.hero[0], level.hero[1] - 8, 34, 26); }
  for (const i of cf.isles || []) swEll(dg, i.x, i.y, i.rx, i.ry || i.rx * 0.62);
  for (const p of cf.pools || []) swEll(wg, p.x, p.y, p.rx, p.ry || p.rx * 0.6);
  for (const ch of cf.channels || []) { wg.lineWidth = ch.w || 140; swLine(wg, smoothPts(ch.pts)); }
  for (const d of M.deco || []) {
    if (d.x1 !== undefined) { // line-shaped items
      if (d.t === 'swampBridge') {
        const dx = Math.sign(d.x2 - d.x1) * (d.abut ?? 46);
        hg.lineWidth = (d.w || 120) + 50; swLine(hg, [[d.x1 + dx, d.y1], [d.x2 - dx, d.y2]]);
        kg.lineWidth = (d.w || 120) + 90; swLine(kg, [[d.x1, d.y1], [d.x2, d.y2]]);
        continue;
      }
      const m = d.wet ? wg : d.t === 'swampJetty' ? null : dg;
      if (m) { m.lineWidth = d.t === 'swampFence' ? 26 : 46; swLine(m, [[d.x1, d.y1], [d.x2, d.y2]]); }
      kg.lineWidth = d.t === 'swampJetty' ? (d.w || 34) + 20 : 50; swLine(kg, [[d.x1, d.y1 - 10], [d.x2, d.y2 - 10]]);
      continue;
    }
    const f = SWAMP_FOOT[d.t] || [1, 30], s = d.s || 1;
    const mode = d.wet === true ? -1 : d.wet === false ? 1 : f[0], r = (d.r || f[1]) * s;
    if (d.t === 'swampCathedral') { swampCathedralFoot(dg, wg, kg, d); continue; }
    if (mode > 0 && r > 0) swEll(dg, d.x, d.y - r * 0.15, r, r * 0.62);
    if (mode < 0 && r > 0) swEll(wg, d.x, d.y, r, r * 0.6);
    const kr = ((SWAMP_CLEAR[d.t] || f[1] || 30) * s);
    swEll(kg, d.x, d.y - kr * 0.3, kr, kr * 0.8);
  }
  for (const pr of level.props || []) {
    if (pr.type === 'frog' || pr.type === 'fish') swEll(wg, pr.x, pr.y, 50, 30); else swEll(dg, pr.x, pr.y - 4, 38, 24);
    swEll(kg, pr.x, pr.y - 16, 42, 34);
  }
  for (const cl of M.clear || []) swEll(kg, cl.x, cl.y, cl.r, cl.r * (cl.ry || 0.7));
  const blurA = (cv, r) => { const o = swMk(fw, fh), m = o.getContext('2d'); m.filter = `blur(${r}px)`; m.drawImage(cv, 0, 0); return m.getImageData(0, 0, fw, fh).data; };
  const Dd = blurA(dryC, cf.soft ?? 4), Ds = blurA(dryC, 12), Wd = blurA(wetC, 7), Hd = blurA(hardC, 2.5);
  const Kd = kg.getImageData(0, 0, fw, fh).data, Rd = rgm.getImageData(0, 0, fw, fh).data;

  // --- signed field: F < 0 is water ---
  const n = fw * fh, nz = new Float32Array(n), SC = new Float32Array(n), F = new Float32Array(n), SD = new Float32Array(n);
  const tilt = cf.tilt || [0, 0];
  for (let j = 0, i = 0; j < fh; j++) for (let k = 0; k < fw; k++, i++) {
    const X = (k + 0.5) * cs, Y = (j + 0.5) * cs;
    nz[i] = 0.68 * N.fbm(X / 520 + 31.7, Y / 520 + 17.3, 4) + 0.32 * N.fbm(X / 140 + 5.1, Y / 140 + 9.7, 3) - tilt[0] * (X / W - 0.5) - tilt[1] * (Y / H - 0.5);
    SC[i] = N.fbm(X / 70 + 71.3, Y / 46 + 3.9, 3);
  }
  const sample = [];
  for (let i = 0; i < n; i += 5) if (Dd[i * 4 + 3] < 30 && Wd[i * 4 + 3] < 30) sample.push(nz[i]);
  sample.sort((a, b) => a - b);
  const L = sample.length ? sample[Math.floor(swClamp(cf.wet ?? 0.4, 0, 1) * (sample.length - 1))] - (cf.wet === 0 ? 1 : 0) : 0;
  for (let i = 0; i < n; i++) {
    const dd = Dd[i * 4 + 3] / 255, ww = Wd[i * 4 + 3] / 255, hh = Hd[i * 4 + 3] / 255;
    let f = (nz[i] - L) * 6 + (Ds[i * 4 + 3] / 255) * 0.9 - ww * 1.45;
    f = Math.max(f, dd * 1.7 - 0.62);
    if (hh > 0) f = f * (1 - hh) - 0.9 * hh;
    F[i] = f;
  }
  // signed distance to the shore (map px): chamfer transform away from the shore, local F/|grad F| estimate near it
  const isW = new Uint8Array(n), isL = new Uint8Array(n);
  for (let i = 0; i < n; i++) { isW[i] = F[i] < 0 ? 1 : 0; isL[i] = 1 - isW[i]; }
  const dW = swDT(isW, fw, fh), dL = swDT(isL, fw, fh);
  for (let j = 0, i = 0; j < fh; j++) for (let k = 0; k < fw; k++, i++) {
    const kx0 = k > 0 ? i - 1 : i, kx1 = k < fw - 1 ? i + 1 : i, jy0 = j > 0 ? i - fw : i, jy1 = j < fh - 1 ? i + fw : i;
    const gx = (F[kx1] - F[kx0]) / ((kx1 - kx0) * cs || 1), gy = (F[jy1] - F[jy0]) / (((jy1 - jy0) / fw) * cs || 1);
    const loc = swClamp(F[i] / Math.max(Math.hypot(gx, gy), 0.0016), -4 * cs, 4 * cs);
    const ds = isW[i] ? -(dL[i] - 0.5) * cs : (dW[i] - 0.5) * cs;
    const w = swClamp((Math.abs(ds) - 1.5 * cs) / (2 * cs), 0, 1);
    SD[i] = loc * (1 - w) + ds * w;
  }
  const bil = (A, X, Y) => {
    const fx = swClamp(X / cs - 0.5, 0, fw - 1.001), fy = swClamp(Y / cs - 0.5, 0, fh - 1.001);
    const k = fx | 0, j = fy | 0, tx = fx - k, ty = fy - j, i = j * fw + k;
    return (A[i] + (A[i + 1] - A[i]) * tx) * (1 - ty) + (A[i + fw] + (A[i + fw + 1] - A[i + fw]) * tx) * ty;
  };
  const sd = (X, Y) => bil(SD, X, Y);

  // --- paint mud banks and water at full resolution ---
  const sh = cf.shallow || [50, 74, 58], dp = cf.deep || [17, 30, 27], bar = [70, 92, 70], rim = [128, 158, 136], scum = [84, 104, 52], mudD = [38, 34, 21], mudL = [64, 58, 37];
  const mudI = g.createImageData(W, H), watI = g.createImageData(W, H), md = mudI.data, wd = watI.data;
  for (let y = 0; y < H; y++) {
    const fy = swClamp(y / cs - 0.5, 0, fh - 1.001), j = fy | 0, ty = fy - j;
    for (let x = 0; x < W; x++) {
      const fx = swClamp(x / cs - 0.5, 0, fw - 1.001), k = fx | 0, tx = fx - k, i = j * fw + k;
      const s = (SD[i] + (SD[i + 1] - SD[i]) * tx) * (1 - ty) + (SD[i + fw] + (SD[i + fw + 1] - SD[i + fw]) * tx) * ty;
      if (s > 34) continue;
      const p = (y * W + x) * 4;
      if (s > -1.5) { // muddy bank, darker toward the waterline, and a damp halo
        const t = swClamp(s / 22, 0, 1), c2 = swMix(mudD, mudL, t * 0.7);
        md[p] = c2[0]; md[p + 1] = c2[1]; md[p + 2] = c2[2];
        md[p + 3] = s < 22 ? 215 * Math.pow(1 - t, 1.25) + 20 : 20 * (1 - (s - 22) / 12);
      }
      if (s < 1) {
        const sc = (SC[i] + (SC[i + 1] - SC[i]) * tx) * (1 - ty) + (SC[i + fw] + (SC[i + fw + 1] - SC[i + fw]) * tx) * ty;
        const d = Math.sqrt(swClamp(-s / 150, 0, 1));
        let c2 = swMix(sh, dp, d);
        const fv = (F[i] + (F[i + 1] - F[i]) * tx) * (1 - ty) + (F[i + fw] + (F[i + fw + 1] - F[i + fw]) * tx) * ty;
        if (fv > -0.3 && s < -8) c2 = swMix(c2, bar, 0.45 * swClamp((fv + 0.3) / 0.3, 0, 1));
        if (s > -60 && sc > 0.52) c2 = swMix(c2, scum, swClamp((sc - 0.52) * 3, 0, 0.55) * (1 + s / 60));
        if (s > -15 && s < -5) { const m = 0.84 + 0.16 * Math.abs(s + 10) / 5; c2 = [c2[0] * m, c2[1] * m, c2[2] * m]; }
        if (s > -5.5 && s < -1) c2 = swMix(c2, rim, 0.6 * (1 - Math.abs(s + 3.25) / 2.25));
        wd[p] = c2[0]; wd[p + 1] = c2[1]; wd[p + 2] = c2[2]; wd[p + 3] = s > -1 ? 255 * (1 - s) / 2 : 255;
      }
    }
  }
  const mudC = swMk(W, H); mudC.getContext('2d').putImageData(mudI, 0, 0);
  const watC = swMk(W, H), wc = watC.getContext('2d'); wc.putImageData(watI, 0, 0);
  // --- water surface details (clipped to the water) ---
  wc.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 70; i++) { // soft sky reflections
    const x = Rr() * W, y = Rr() * H; if (sd(x, y) > -24) continue;
    const rx = 50 + Rr() * 200, ry = 4 + Rr() * 10, gr = wc.createRadialGradient(x, y, 0, x, y, rx);
    gr.addColorStop(0, `rgba(176,206,192,${0.04 + Rr() * 0.05})`); gr.addColorStop(1, 'rgba(176,206,192,0)');
    wc.save(); wc.translate(x, y); wc.scale(1, ry / rx); wc.translate(-x, -y); wc.fillStyle = gr; wc.fillRect(x - rx, y - rx, rx * 2, rx * 2); wc.restore();
  }
  const weed = ['#7c9444', '#93a852', '#5e7a34', '#a8b45a'];
  for (let i = 0; i < 90000; i++) { // duckweed in the still shallows
    const x = Rr() * W, y = Rr() * H, s = sd(x, y);
    if (s > -2 || s < -80) continue;
    if (bil(SC, x, y) < 0.53 + (-s) / 260) continue;
    wc.fillStyle = alpha(weed[i & 3], 0.55 + Rr() * 0.35); wc.fillRect(x, y, 1.4 + Rr() * 1.4, 1 + Rr() * 0.8);
  }
  wc.lineWidth = 1;
  for (let i = 0; i < 520; i++) { // ripples
    const x = Rr() * W, y = Rr() * H; if (sd(x, y) > -8) continue;
    const rx = 4 + Rr() * 11;
    wc.strokeStyle = `rgba(206,230,216,${0.18 + Rr() * 0.2})`; wc.beginPath(); wc.ellipse(x, y, rx, rx * 0.28, 0, PI * 1.05, PI * 1.95); wc.stroke();
  }
  for (let i = 0; i < 260; i++) { // floating leaves & twigs
    const x = Rr() * W, y = Rr() * H; if (sd(x, y) > -6) continue;
    wc.fillStyle = alpha(Rr() < 0.5 ? '#a8843a' : '#7a6a3a', 0.8); wc.beginPath(); wc.ellipse(x, y, 2.2, 1.1, Rr() * 3, 0, PI * 2); wc.fill();
  }
  const lilyN = Math.round(80 * (cf.lilies ?? 1));
  for (let cN = 0, tries = 0; cN < lilyN && tries < 6000; tries++) { // lily pad clusters
    const x = Rr() * W, y = Rr() * H, s = sd(x, y);
    if (s > -14 || s < -170) continue;
    cN++;
    const cnt = 3 + Math.floor(Rr() * 10), spread = 14 + Rr() * 36;
    for (let k = 0; k < cnt; k++) {
      const px = x + (Rr() - 0.5) * spread * 2, py = y + (Rr() - 0.5) * spread * 0.9;
      if (sd(px, py) > -6) continue;
      swLilyPad(wc, px, py, 4 + Rr() * 6.5, Rr, Rr() < 0.13);
    }
  }
  wc.globalCompositeOperation = 'source-over';
  g.drawImage(mudC, 0, 0);
  g.drawImage(watC, 0, 0);
  // occupancy: open water blocks the land scatter
  const om = swMk(fw, fh), og2 = om.getContext('2d'), oi = og2.createImageData(fw, fh);
  for (let i = 0; i < n; i++) if (SD[i] < -4) { oi.data[i * 4] = oi.data[i * 4 + 1] = oi.data[i * 4 + 2] = oi.data[i * 4 + 3] = 255; }
  og2.putImageData(oi, 0, 0);
  wm.drawImage(om, 0, 0, W, H);
  const at = (A, X, Y) => { const k = swClamp(Math.floor(X / cs), 0, fw - 1), j = swClamp(Math.floor(Y / cs), 0, fh - 1); return A[(j * fw + k) * 4 + 3]; };
  return swCur = {
    cf, seed, roads, sd, wet: (x, y) => sd(x, y) < 0,
    keep: (x, y) => at(Kd, x, y) > 90, onRoad: (x, y) => at(Rd, x, y) > 90,
  };
}
function swLilyPad(g, x, y, r, R, flower) {
  const a0 = R() * PI * 2, notch = 0.45 + R() * 0.3, sq = 0.62;
  const col = ['#557f36', '#4a7432', '#62883c', '#6a8a3a'][Math.floor(R() * 4)];
  g.fillStyle = 'rgba(8,16,10,0.25)'; g.beginPath(); g.ellipse(x + 1.2, y + 1.3, r, r * sq, 0, 0, PI * 2); g.fill();
  g.beginPath(); g.moveTo(x, y);
  for (let k = 0; k <= 18; k++) { const t = a0 + notch / 2 + (k / 18) * (PI * 2 - notch); g.lineTo(x + C(t) * r, y + S(t) * r * sq); }
  g.closePath(); g.fillStyle = col; g.fill(); g.lineWidth = 0.9; g.strokeStyle = 'rgba(18,30,14,0.9)'; g.stroke();
  g.fillStyle = 'rgba(200,226,150,0.22)'; g.beginPath(); g.ellipse(x - r * 0.28, y - r * 0.2, r * 0.42, r * 0.18, -0.2, 0, PI * 2); g.fill();
  g.strokeStyle = 'rgba(30,50,20,0.45)'; g.lineWidth = 0.7;
  for (let k = 0; k < 3; k++) { const t = a0 + 1.4 + k * 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + C(t) * r * 0.75, y + S(t) * r * sq * 0.75); g.stroke(); }
  if (flower) {
    g.fillStyle = '#f6e2ec'; g.strokeStyle = 'rgba(60,30,40,0.8)'; g.lineWidth = 0.8;
    g.fill(star(x + r * 0.15, y - 2, r * 0.62, 0.45, 6)); g.stroke(star(x + r * 0.15, y - 2, r * 0.62, 0.45, 6));
    g.fillStyle = '#f2c84a'; g.beginPath(); g.arc(x + r * 0.15, y - 2, r * 0.2, 0, PI * 2); g.fill();
  }
}
// cathedral island: solid ground under the building and its front steps, flooded close on both sides
function swampCathedralFoot(dg, wg, kg, d) {
  const s = d.s || 1, x = d.x, y = d.y;
  dg.fillRect(x - 300 * s, y - 640 * s, 600 * s, 640 * s);
  swEll(dg, x, y + 4 * s, 70 * s, 34 * s);
  swEll(wg, x - 250 * s, y + 40 * s, 230 * s, 90 * s); swEll(wg, x + 250 * s, y + 40 * s, 230 * s, 90 * s);
  kg.fillRect(x - 320 * s, y - 660 * s, 640 * s, 700 * s); swEll(kg, x, y + 30 * s, 120 * s, 40 * s);
}

// ------------------------------------------------------------------ causeways: banks, posts, ropes, flagstones, quay walls
export function swampRoad(g, roadPolys, SW) {
  if (!SW) return;
  const cf = SW.cf, R = rng(SW.seed * 31 + 7), paved = !!cf.paved;
  if (paved) swPave(g, roadPolys, R);
  for (const rp of roadPolys) {
    const pts = rp.pts, hw = rp.w / 2;
    for (const side of [-1, 1]) {
      const runs = []; let run = null;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
        const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * side, ny = (dx / l) * side;
        const ox = x1 + nx * (hw + 16), oy = y1 + ny * (hw + 16);
        const wetSide = SW.sd(ox, oy) < 7 && !SW.onRoad(ox, oy) && !SW.onRoad(x1 + nx * (hw + 4), y1 + ny * (hw + 4));
        if (wetSide) { if (!run) runs.push(run = []); run.push({ x: x1, y: y1, nx, ny }); } else run = null;
      }
      for (const rn of runs) {
        if (rn.length < 3) continue;
        const off = k => rn.map(p => [p.x + p.nx * (hw + k), p.y + p.ny * (hw + k)]);
        g.lineCap = 'round'; g.lineJoin = 'round';
        if (paved) { // quay wall of cut stone
          g.strokeStyle = '#4c4a40'; g.lineWidth = 15; swLine(g, off(6));
          g.strokeStyle = '#6f6c5e'; g.lineWidth = 9; swLine(g, off(4));
          g.strokeStyle = 'rgba(12,18,14,0.5)'; g.lineWidth = 3; swLine(g, off(13));
          g.strokeStyle = 'rgba(30,26,18,0.55)'; g.lineWidth = 1;
          for (let k = 0; k < rn.length; k += 3) { const p = rn[k]; g.beginPath(); g.moveTo(p.x + p.nx * (hw - 1), p.y + p.ny * (hw - 1)); g.lineTo(p.x + p.nx * (hw + 12), p.y + p.ny * (hw + 12)); g.stroke(); }
          g.strokeStyle = 'rgba(210,204,180,0.35)'; g.lineWidth = 1.5; swLine(g, off(0));
          continue;
        }
        // earthen bank of the raised causeway
        g.strokeStyle = 'rgba(46,40,26,0.9)'; g.lineWidth = 12; swLine(g, off(5));
        g.strokeStyle = 'rgba(70,62,40,0.85)'; g.lineWidth = 5; swLine(g, off(2));
        g.strokeStyle = 'rgba(10,16,10,0.42)'; g.lineWidth = 3; swLine(g, off(11));
        g.strokeStyle = 'rgba(224,206,160,0.3)'; g.lineWidth = 1.6; swLine(g, off(-2));
        // posts & sagging ropes
        if (cf.posts === false) continue;
        let acc = R() * 30, prev = null;
        for (let k = 1; k < rn.length; k++) {
          const a = rn[k - 1], b = rn[k];
          acc += Math.hypot(b.x - a.x, b.y - a.y);
          if (acc < 40 + R() * 16) continue;
          acc = 0;
          const px = b.x + b.nx * (hw + 9), py = b.y + b.ny * (hw + 9), h = 11 + R() * 8;
          if (prev && Math.hypot(prev.x - px, prev.y - py) < 70 && R() < 0.7) {
            g.strokeStyle = 'rgba(30,22,14,0.85)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(prev.x, prev.y - prev.h + 3);
            g.quadraticCurveTo((prev.x + px) / 2, (prev.y - prev.h + py - h) / 2 + 9, px, py - h + 3); g.stroke();
          }
          swPost(g, px, py, h, (R() - 0.5) * 3);
          prev = { x: px, y: py, h };
        }
      }
    }
  }
}
function swPost(g, x, y, h, lean) {
  swRipples(g, x, y + 1, 6, 2, 0.35);
  toon(g, poly([[x - 2.7, y + 1], [x - 2.4 + lean, y - h], [x + 2.4 + lean, y - h], [x + 2.7, y + 1]]), SWP.wood, { sd: 1, hd: 0.5, lw: 1.3 });
  flat(g, ellipse(x + lean, y - h, 2.5, 1.2), SWP.woodL, 0.9);
}
function swPave(g, roadPolys, R) {
  const W = g.canvas.width, H = g.canvas.height, sc = g.getTransform().a || 1;
  const pv = swMk(W, H), p = pv.getContext('2d'); p.scale(sc, sc);
  const stones = ['#8e8877', '#958f7d', '#878171', '#9b9583', '#8a8574'];
  for (const rp of roadPolys) {
    const pts = rp.pts, hw = rp.w / 2 + 2;
    let acc = 0;
    p.lineCap = 'round'; p.lineJoin = 'round'; p.strokeStyle = '#5e5747'; p.lineWidth = rp.w; swLine(p, pts);
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], l = Math.hypot(x2 - x1, y2 - y1) || 1;
      acc += l; if (acc < 13) continue; acc = 0;
      const a = Math.atan2(y2 - y1, x2 - x1);
      p.save(); p.translate(x1, y1); p.rotate(a);
      for (let v = -hw + R() * 6; v < hw;) {
        const w = 9 + R() * 7, len = 12.5 + R() * 3;
        if (R() < 0.03) { p.fillStyle = 'rgba(78,70,50,0.9)'; p.fillRect(-len / 2, v, len, w - 1.5); v += w; continue; }
        p.fillStyle = stones[Math.floor(R() * stones.length)]; p.beginPath(); p.roundRect(-len / 2, v + 0.8, len - 1.6, w - 1.8, 2.2); p.fill();
        p.fillStyle = 'rgba(255,250,232,0.09)'; p.fillRect(-len / 2 + 1, v + 1.2, len - 3.5, 1.5);
        if (R() < 0.1) { p.fillStyle = alpha(SWP.mossL, 0.45); p.beginPath(); p.ellipse(-len / 2 + R() * len, v + w - 1.5, 2.5 + R() * 3, 1.3, 0, 0, PI * 2); p.fill(); }
        v += w;
      }
      p.restore();
    }
    p.strokeStyle = 'rgba(60,52,36,0.16)'; p.lineWidth = rp.w * 0.42; swLine(p, pts);
  }
  const m = swMk(W, H), mg = m.getContext('2d'); mg.scale(sc, sc); mg.lineCap = 'round'; mg.lineJoin = 'round'; mg.strokeStyle = '#fff';
  for (const rp of roadPolys) { mg.lineWidth = rp.w - 3; swLine(mg, rp.pts); }
  p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'destination-in'; p.drawImage(m, 0, 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.86; g.drawImage(pv, 0, 0); g.restore();
  // curb stones along both edges
  for (const rp of roadPolys) {
    const pts = rp.pts, hw = rp.w / 2;
    for (const side of [-1, 1]) {
      let acc = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], l = Math.hypot(x2 - x1, y2 - y1) || 1;
        acc += l; if (acc < 15) continue; acc = 0;
        const nx = (-(y2 - y1) / l) * side, ny = ((x2 - x1) / l) * side, cx = x1 + nx * (hw - 3), cy = y1 + ny * (hw - 3);
        if (R() < 0.08) continue;
        g.save(); g.translate(cx, cy); g.rotate(Math.atan2(y2 - y1, x2 - x1));
        toon(g, rrect(-7, -3.2, 14, 6.4, 1.6), R() < 0.5 ? '#7e7a6a' : '#8c8776', { sd: 0.8, hd: 0.5, lw: 1 });
        g.restore();
      }
    }
  }
}

// ------------------------------------------------------------------ scatter: shore reeds, snags, cypress, reed beds, fungi
export function swampScatter(c) {
  const { add, free, okSpacing, placed, R, M, W, H, SW } = c;
  if (!SW) return;
  const cf = M.swamp || {};
  let n = 0;
  const reedCap = 700 * (cf.reeds ?? 1);
  for (let i = 0; i < 16000 && n < reedCap; i++) { // reeds & cattails hugging the shores
    const x = R() * W, y = R() * H, s = SW.sd(x, y);
    if (s < -20 || s > 8 || SW.keep(x, y) || R() > 0.55) continue;
    add('swReeds', x, y, 0.6 + R() * 0.55, { wet: s < -2 }); n++;
  }
  for (let i = 0; i < 900; i++) { // drowned snags and stumps
    const x = R() * W, y = R() * H, s = SW.sd(x, y);
    if (s > -22 || s < -200 || SW.keep(x, y) || SW.keep(x, y - 60) || R() > 0.14 || !okSpacing(x, y, 70)) continue;
    placed.push([x, y]); add(R() < 0.55 ? 'swSnag' : 'swStump', x, y, 0.75 + R() * 0.5, { wet: true });
  }
  for (let i = 0; i < 1200; i++) { // bald cypress along the banks, knees in the shallows
    const x = R() * W, y = R() * H, s = SW.sd(x, y);
    if (s < -6 || s > 22 || R() > 0.3) continue;
    if (SW.keep(x, y) || SW.keep(x, y - 50) || SW.keep(x - 24, y - 70) || SW.keep(x + 24, y - 70) || !okSpacing(x, y, 52)) continue;
    placed.push([x, y]); add('tree_cypress', x, y, 0.8 + R() * 0.45);
  }
  for (const rb of cf.reedbeds || []) { // dense reed beds (maze walls)
    const cnt = rb.n || Math.round((rb.rx * rb.ry) / 300);
    for (let k = 0; k < cnt; k++) {
      const a = R() * PI * 2, d = Math.sqrt(R()), x = rb.x + C(a) * rb.rx * d, y = rb.y + S(a) * rb.ry * d;
      if (SW.keep(x, y)) continue;
      add('swReeds', x, y, 0.95 + R() * 0.6, { wet: SW.sd(x, y) < -2, tall: true });
    }
  }
  for (let i = 0; i < 260; i++) { // fungi & ferns on the hummocks
    const x = R() * W, y = R() * H;
    if (!free(x, y) || SW.keep(x, y)) continue;
    add(R() < 0.5 ? 'swShrooms' : 'swFern', x, y, 0.8 + R() * 0.45);
  }
}

// ------------------------------------------------------------------ dispatcher for the y-sorted pass
export function swampDeco(g, it, R, pal, SW) {
  const { t, x, y, s } = it, o = it.extra || {};
  switch (t) {
    case 'tree_willow': swWillow(g, x, y, s, R, pal); return true;
    case 'tree_cypress': swCypress(g, x, y, s, R, pal, SW); return true;
    case 'tree_dead': swDeadTree(g, x, y, s, R, pal, false); return true;
    case 'tree_round': swGum(g, x, y, s, R, pal); return true;
    case 'swSnag': swDeadTree(g, x, y, s, R, pal, true); return true;
    case 'swStump': swStumpWet(g, x, y, s, R, pal); return true;
    case 'reeds': case 'swReeds': swReeds(g, x, y, s, R, pal, o); return true;
    case 'swShrooms': swShrooms(g, x, y, s, R); return true;
    case 'swFern': swFern(g, x, y, s, R); return true;
    case 'flowers': swFlowers(g, x, y, s, R); return true;
    case 'mushroom': swShrooms(g, x, y, s, R); return true;
  }
  if (t.startsWith('swamp') && SWAMP_DRAW[t]) { SWAMP_DRAW[t](g, x, y, s, R, pal, o, SW); return true; }
  return false;
}

// ------------------------------------------------------------------ atmosphere: mist banks, fog streaks, fireflies, wisps
export function swampAtmosphere(g, c) {
  const { M, W, H, SW } = c;
  const cf = M.swamp || {}, R = rng((M.seed || 7) * 53 + 5);
  const inPlay = (x, y) => x > 240 && x < 2160 && y > 135 && y < 1215;
  const mist = cf.mist ?? 1;
  const fogBlob = (x, y, rx, ry, a, col = '206,222,212') => {
    const gr = g.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(0.55, `rgba(${col},${a * 0.55})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.fillStyle = gr; g.fillRect(x - rx, y - rx, rx * 2, rx * 2); g.restore();
  };
  // heavy mist at the frame, thin banks drifting over open water
  for (let i = 0; i < 46 * mist; i++) {
    let x, y;
    if (R() < 0.5) { x = R() < 0.5 ? R() * 240 : W - R() * 240; y = R() * H; } else { x = R() * W; y = R() < 0.5 ? R() * 120 : H - R() * 120; }
    fogBlob(x, y, 150 + R() * 230, 46 + R() * 50, 0.08 + R() * 0.08);
  }
  for (let i = 0, k = 0; i < 800 && k < 26 * mist; i++) {
    const x = R() * W, y = R() * H;
    if (SW && SW.sd(x, y) > -40) continue;
    k++; fogBlob(x, y, 180 + R() * 220, 26 + R() * 22, (inPlay(x, y) ? 0.04 : 0.08) + R() * 0.03);
  }
  // fireflies and will-o'-wisps
  g.save(); g.globalCompositeOperation = 'lighter';
  const flies = Math.round(60 * (cf.flies ?? 1));
  for (let i = 0; i < flies; i++) {
    const x = R() * W, y = R() * H;
    const r = 4 + R() * 5, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(226,255,150,0.5)'); gr.addColorStop(0.3, 'rgba(190,240,110,0.22)'); gr.addColorStop(1, 'rgba(190,240,110,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    g.fillStyle = 'rgba(250,255,210,0.9)'; g.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
  }
  for (let i = 0, k = 0; i < 400 && k < 7 * (cf.flies ?? 1); i++) {
    const x = R() * W, y = R() * H;
    if (inPlay(x, y) && R() < 0.7) continue;
    if (SW && SW.sd(x, y) > -20) continue;
    k++;
    const r = 18 + R() * 16, gr = g.createRadialGradient(x, y - 14, 0, x, y - 14, r);
    gr.addColorStop(0, 'rgba(150,236,255,0.55)'); gr.addColorStop(0.35, 'rgba(90,200,230,0.2)'); gr.addColorStop(1, 'rgba(90,200,230,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - 14 - r, r * 2, r * 2);
    g.fillStyle = 'rgba(230,252,255,0.95)'; g.beginPath(); g.arc(x, y - 14, 2.2, 0, PI * 2); g.fill();
    const rf = g.createRadialGradient(x, y + 10, 0, x, y + 10, r * 0.8); rf.addColorStop(0, 'rgba(120,220,240,0.18)'); rf.addColorStop(1, 'rgba(120,220,240,0)');
    g.fillStyle = rf; g.save(); g.translate(x, y + 10); g.scale(1, 0.3); g.translate(-x, -(y + 10)); g.fillRect(x - r, y + 10 - r, r * 2, r * 2); g.restore();
  }
  g.restore();
}

// ------------------------------------------------------------------ marsh flora
function swWillow(g, x, y, s, R, pal) {
  const leaf = R() < 0.5 ? '#61793a' : '#6c8442', dk = dark(leaf, 0.12);
  shadowBlob(g, x + 14 * s, y + 3 * s, 42 * s, 13 * s, 0.34);
  toon(g, poly([[x - 7 * s, y], [x - 4 * s, y - 20 * s], [x - 9 * s, y - 34 * s], [x - 2 * s, y - 40 * s], [x + 4 * s, y - 30 * s], [x + 5 * s, y - 18 * s], [x + 8 * s, y]]), '#5a4632', { sd: 1.4, hd: 0.5, lw: 1.6 });
  const pts = [[x - 36 * s, y - 30 * s], [x - 32 * s, y - 56 * s], [x - 14 * s, y - 72 * s], [x + 10 * s, y - 73 * s], [x + 31 * s, y - 58 * s], [x + 38 * s, y - 32 * s], [x + 39 * s, y - 13 * s]];
  for (let i = 0; i <= 9; i++) { const xx = x + 36 * s - i * 8 * s, open = Math.abs(xx - x) < 9 * s; pts.push([xx, y - (open ? 26 : i % 2 ? 6 + R() * 6 : 14 + R() * 6) * s]); }
  pts.push([x - 39 * s, y - 12 * s]);
  const crown = blob(pts, 0.32);
  toon(g, crown, leaf, { sd: 4.5 * s, hd: 2.2 * s, lw: 1.7, detail: c => {
    c.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const xx = x - 34 * s + i * 4.6 * s, top = y - (56 - Math.abs(i - 7.5) * 1.5) * s, bot = y - (10 + R() * 12) * s;
      c.strokeStyle = alpha(i % 3 ? dk : light(leaf, 0.12), 0.6); c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(xx, top); c.quadraticCurveTo(xx + 3 * s, (top + bot) / 2, xx + (R() - 0.5) * 3 * s, bot); c.stroke();
    }
  } });
  g.fillStyle = alpha(light(leaf, 0.2), 0.5);
  for (let i = 0; i < 7; i++) { const a = R() * PI, d = R() * 22 * s; g.beginPath(); g.ellipse(x - 8 * s + C(a) * d, y - 58 * s + S(a) * d * 0.4, 3 * s, 1.6 * s, -0.4, 0, PI * 2); g.fill(); }
}
function swCypress(g, x, y, s, R, pal, SW) {
  const bark = '#66503f', leaf = R() < 0.5 ? '#5d7033' : '#677a39', wetBase = SW && SW.sd(x, y) < 0;
  shadowBlob(g, x + 14 * s, y + 3 * s, 40 * s, 11 * s, 0.3);
  for (let i = 0; i < 3; i++) { const kx = x + (i - 1) * 17 * s + (R() - 0.5) * 6 * s, ky = y + (R() - 0.2) * 6 * s, h = (5 + R() * 5) * s; toon(g, poly([[kx - 3 * s, ky], [kx - 0.6 * s, ky - h], [kx + 0.8 * s, ky - h], [kx + 3 * s, ky]]), bark, { sd: 0.6, hd: 0.3, lw: 1.1 }); }
  // flared, fluted trunk and the limbs that carry the canopy
  const top = y - 58 * s;
  toon(g, poly([[x - 14 * s, y + 1], [x - 8 * s, y - 7 * s], [x - 4.5 * s, y - 26 * s], [x - 3 * s, top], [x + 3 * s, top], [x + 4.5 * s, y - 26 * s], [x + 8 * s, y - 7 * s], [x + 15 * s, y + 1]]), bark, { sd: 1.6, hd: 0.6, lw: 1.6, detail: c => { c.strokeStyle = 'rgba(34,22,14,0.45)'; c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x - 7 * s + i * 4.5 * s, y); c.lineTo(x - 1.5 * s + i * s, y - 34 * s); c.stroke(); } } });
  const clumps = [[-27, -68, 11], [-12, -80, 13], [6, -86, 13], [24, -76, 12], [0, -68, 14], [-30, -55, 8], [27, -58, 9], [13, -64, 10], [-16, -64, 10]].map(([dx, dy, r]) => [x + (dx + (R() - 0.5) * 5) * s, y + (dy + (R() - 0.5) * 4) * s, r * s * (0.9 + R() * 0.25)]);
  for (const [cx, cy] of clumps) { line(g, [[x, top + 6 * s], [(x + cx) / 2, (top + cy) / 2 + 3 * s], [cx, cy + 4 * s]], OUT, 4.2 * s); line(g, [[x, top + 6 * s], [(x + cx) / 2, (top + cy) / 2 + 3 * s], [cx, cy + 4 * s]], bark, 2.2 * s); }
  const shape = (cx, cy, r, k = 0) => ellipse(cx, cy, r + k, (r + k) * 0.62);
  const sil = new Path2D(); for (const [cx, cy, r] of clumps) sil.addPath(shape(cx, cy, r, 1.4)); g.fillStyle = OUT; g.fill(sil);
  clumps.sort((a, b) => a[1] - b[1]);
  clumps.forEach(([cx, cy, r], i) => toon(g, shape(cx, cy, r), i % 3 ? leaf : light(leaf, 0.05), { sd: 2.4 * s, hd: 1.4 * s, lw: 0, detail: c => { c.strokeStyle = alpha(dark(leaf, 0.14), 0.6); c.lineWidth = 1; for (let k = 0; k < 4; k++) { const fx = cx - r * 0.7 + k * r * 0.45; c.beginPath(); c.moveTo(fx, cy - r * 0.3); c.lineTo(fx + 2 * s, cy + r * 0.45); c.stroke(); } } }));
  if (wetBase) swRipples(g, x, y + 1, 18 * s, 4.5 * s, 0.4);
  for (let i = 0; i < 6; i++) { const [cx, cy, r] = clumps[Math.floor(R() * clumps.length)]; swMoss(g, cx + (R() - 0.5) * r, cy + r * 0.45, 2 * s, s, R, 1); }
}
// hanging moss strands under a canopy
function swMoss(g, x, y, w, s, R, n) {
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const mx = x + (R() - 0.5) * w * 2, my = y + R() * 4 * s, len = (8 + R() * 16) * s;
    g.strokeStyle = 'rgba(24,26,16,0.55)'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(mx, my); g.quadraticCurveTo(mx + 2 * s, my + len * 0.5, mx - 1 * s, my + len); g.stroke();
    g.strokeStyle = '#a3ab84'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(mx, my); g.quadraticCurveTo(mx + 2 * s, my + len * 0.5, mx - 1 * s, my + len); g.stroke();
  }
}
function swDeadTree(g, x, y, s, R, pal, wet) {
  const col = R() < 0.5 ? '#5a5048' : '#4c443c';
  if (!wet) shadowBlob(g, x + 10 * s, y + 2 * s, 20 * s, 6 * s, 0.25);
  const draw = () => {
    toon(g, poly([[x - 6 * s, y + 4 * s], [x - 4 * s, y - 34 * s], [x - 1 * s, y - 50 * s], [x + 3 * s, y - 44 * s], [x + 4 * s, y - 30 * s], [x + 7 * s, y + 4 * s]]), col, { sd: 1.4, hd: 0.5, lw: 1.6 });
    const br = (bx, by, a, l, w) => { if (l < 5 * s) return; const ex = bx + C(a) * l, ey = by + S(a) * l; line(g, [[bx, by], [ex, ey]], OUT, w + 2.2); line(g, [[bx, by], [ex, ey]], col, w); br(ex, ey, a - 0.5 - R() * 0.4, l * 0.6, w * 0.62); if (R() < 0.7) br(ex, ey, a + 0.45 + R() * 0.3, l * 0.5, w * 0.58); };
    br(x - 1 * s, y - 30 * s, -PI / 2 - 0.75, 17 * s, 3 * s); br(x + 1 * s, y - 40 * s, -PI / 2 + 0.6, 15 * s, 2.6 * s);
    g.fillStyle = alpha(SWP.moss, 0.85);
    for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(x + (R() - 0.5) * 6 * s, y - R() * 34 * s, 2.4 * s, 3.6 * s, 0, 0, PI * 2); g.fill(); }
    swMoss(g, x - 2 * s, y - 38 * s, 14 * s, s * 0.8, R, 3);
  };
  if (wet) {
    const gr = g.createLinearGradient(0, y, 0, y + 22 * s); gr.addColorStop(0, 'rgba(16,24,20,0.35)'); gr.addColorStop(1, 'rgba(16,24,20,0)');
    g.save(); g.fillStyle = gr; g.fillRect(x - 5 * s, y, 11 * s, 22 * s); g.restore();
    swAbove(g, y, draw); swRipples(g, x + 0.5 * s, y, 11 * s, 3.2 * s, 0.5);
  } else draw();
}
function swStumpWet(g, x, y, s, R, pal) {
  swAbove(g, y, () => {
    toon(g, poly([[x - 9 * s, y + 3], [x - 8 * s, y - 10 * s], [x - 3 * s, y - 14 * s], [x + 2 * s, y - 9 * s], [x + 6 * s, y - 15 * s], [x + 9 * s, y + 3]]), '#4e443a', { sd: 1.2, hd: 0.5, lw: 1.4 });
    g.fillStyle = alpha(SWP.moss, 0.85); g.beginPath(); g.ellipse(x - 2 * s, y - 6 * s, 5 * s, 2.4 * s, 0, 0, PI * 2); g.fill();
  });
  swRipples(g, x, y, 13 * s, 3.6 * s, 0.45);
}
function swGum(g, x, y, s, R, pal) {
  treeRound(g, x, y, s, R, Object.assign({}, pal, { leaf: ['#4d6a30', '#56702f', '#466230'] }));
  swMoss(g, x, y - 36 * s, 18 * s, s * 0.8, R, 4);
}
function swReeds(g, x, y, s, R, pal, o = {}) {
  const tall = o.tall ? 1.45 : 1, n = 6 + Math.floor(R() * 5);
  const greens = ['#6e7e36', '#86904a', '#5a6a2e', '#7a8a3a'];
  if (o.wet) swRipples(g, x, y + 1, 11 * s, 3 * s, 0.4);
  g.lineCap = 'round';
  const blades = [];
  for (let i = 0; i < n; i++) { const bx = x + (i - n / 2) * 2.4 * s + (R() - 0.5) * 2, h = (18 + R() * 16) * s * tall, lean = (R() - 0.5) * 10 * s + (bx - x) * 0.4; blades.push([bx, h, lean, greens[Math.floor(R() * 4)]]); }
  for (const [bx, h, lean] of blades) { g.strokeStyle = OUT; g.lineWidth = 2.8; g.beginPath(); g.moveTo(bx, y); g.quadraticCurveTo(bx + lean * 0.2, y - h * 0.6, bx + lean, y - h); g.stroke(); }
  for (const [bx, h, lean, col] of blades) { g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); g.moveTo(bx, y); g.quadraticCurveTo(bx + lean * 0.2, y - h * 0.6, bx + lean, y - h); g.stroke(); }
  const heads = R() < (o.tall ? 0.45 : 0.75) ? 1 + Math.floor(R() * (o.tall ? 2 : 3)) : 0;
  for (let i = 0; i < heads; i++) {
    const [bx, h, lean] = blades[Math.floor(R() * blades.length)], hx = bx + lean * 0.75, hy = y - h * 0.86;
    toon(g, capsule(hx, hy - 4.5 * s, hx + lean * 0.05, hy + 3.5 * s, 2.2 * s), '#6a4528', { sd: 0.6, hd: 0.4, lw: 1.1 });
  }
}
function swShrooms(g, x, y, s, R) {
  const glowy = R() < 0.35, cap = glowy ? '#7ad6c8' : R() < 0.5 ? '#c89a48' : '#a8643a';
  for (let i = 0; i < 3; i++) {
    const mx = x + (i - 1) * 6 * s + (R() - 0.5) * 2, h = (4 + R() * 4) * s;
    toon(g, rrect(mx - 1.3 * s, y - h, 2.6 * s, h, 1), '#e8dcc0', { sd: 0.3, hd: 0.2, lw: 1 });
    toon(g, blob([[mx - 4.6 * s, y - h], [mx, y - h - 4.6 * s], [mx + 4.6 * s, y - h], [mx, y - h + 1]], 0.6), cap, { sd: 0.6, hd: 0.6, lw: 1 });
  }
  if (glowy) glow(g, x, y - 6 * s, 16 * s, '#7af0d8', 0.35);
}
function swFern(g, x, y, s, R) {
  const col = R() < 0.5 ? '#4e6a2c' : '#5c7632';
  for (let i = 0; i < 6; i++) {
    const a = -PI / 2 + (i - 2.5) * 0.42 + (R() - 0.5) * 0.2, l = (12 + R() * 6) * s, ex = x + C(a) * l, ey = y + S(a) * l * 0.8;
    g.strokeStyle = OUT; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + C(a) * l * 0.5, y + S(a) * l * 0.6 - 3 * s, ex, ey); g.stroke();
    g.strokeStyle = col; g.lineWidth = 1.8; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + C(a) * l * 0.5, y + S(a) * l * 0.6 - 3 * s, ex, ey); g.stroke();
  }
}
function swFlowers(g, x, y, s, R) {
  const kind = R();
  for (let i = 0; i < 4; i++) {
    const fx = x + (R() - 0.5) * 22 * s, fy = y + (R() - 0.5) * 8 * s;
    line(g, [[fx, fy], [fx + (R() - 0.5) * 2, fy - 8 * s]], '#4a6a2a', 1.2);
    if (kind < 0.45) flat(g, star(fx, fy - 9 * s, 2.6 * s, 0.5, 5), '#e8c43a', 0.7);
    else if (kind < 0.8) { flat(g, ellipse(fx, fy - 9 * s, 1.7 * s, 2.6 * s), '#8a78c8', 0.7); flat(g, ellipse(fx, fy - 8 * s, 1 * s, 0.8 * s), '#e8d060', 0); }
    else flat(g, circle(fx, fy - 9 * s, 1.9 * s), '#e8e4d8', 0.7);
  }
}

// structure painters (filled in below)
const SWAMP_DRAW = {};

// ------------------------------------------------------------------ structures (t: 'swamp*'), drawn in the y-sorted pass
// shared helpers -----------------------------------------------------
// mirrored, darkened copy of fn's drawing under a waterline at (x, y); fn draws with the waterline at (0, 0), upward
function swMirror(g, x, y, w, h, fn, a = 0.3) {
  const sc = g.getTransform().a || 1, cw = Math.ceil(w * sc), ch = Math.ceil(h * sc);
  const cv = swMk(cw, ch), c = cv.getContext('2d');
  c.scale(sc, sc); c.translate(w / 2, h); fn(c);
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(16,30,26,0.6)'; c.fillRect(0, 0, cw, ch);
  const rh = h * 0.62, rch = Math.ceil(rh * sc), rc = swMk(cw, rch), r = rc.getContext('2d');
  r.save(); r.scale(1, -0.62); r.drawImage(cv, 0, -ch); r.restore();
  r.strokeStyle = 'rgba(200,226,212,0.5)'; r.lineWidth = 1.2 * sc;
  for (let i = 0; i < 6; i++) { const yy = (4 + i * rh * 0.14) * sc, hw = cw * (0.34 - i * 0.04); r.beginPath(); r.moveTo(cw / 2 - hw, yy); r.lineTo(cw / 2 + hw * 0.7, yy); r.stroke(); }
  if (swCur) { r.globalCompositeOperation = 'destination-in'; r.drawImage(swWaterMask(swCur, x - w / 2, y + 2, w, rh), 0, 0, cw, rch); }
  g.save(); g.globalAlpha = a; g.drawImage(rc, x - w / 2, y + 2, w, rh); g.restore();
}
// alpha mask of open water over a map rectangle (for reflections)
function swWaterMask(SW, x0, y0, w, h) {
  const st = 3, cw = Math.max(1, Math.ceil(w / st)), ch = Math.max(1, Math.ceil(h / st));
  const cv = swMk(cw, ch), c = cv.getContext('2d'), im = c.createImageData(cw, ch);
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) im.data[(j * cw + i) * 4 + 3] = 255 * swClamp((-SW.sd(x0 + (i + 0.5) * st, y0 + (j + 0.5) * st) - 1) / 5, 0, 1);
  c.putImageData(im, 0, 0);
  return cv;
}
// curved brick courses & joints on a cylinder face (inside a clip)
function swCylBricks(g, r, ry, y0, y1, seed, rowH = 10) {
  const Rn = rng(seed);
  g.strokeStyle = 'rgba(30,24,18,0.42)'; g.lineWidth = 1.1;
  let row = 0;
  for (let y = y0; y > y1; y -= rowH, row++) {
    g.beginPath(); g.ellipse(0, y, r, ry, 0, 0, PI); g.stroke();
    for (let i = 0; i < 6; i++) {
      const th = ((i + (row % 2) * 0.5 + 0.25) / 6) * PI, bx = -C(th) * r, by = y + S(th) * ry;
      g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by - rowH); g.stroke();
      if (Rn() < 0.25) { g.fillStyle = Rn() < 0.5 ? 'rgba(255,255,240,0.07)' : 'rgba(0,0,0,0.08)'; g.fillRect(bx + 1, by - rowH + 1, r * 0.28, rowH - 2); }
    }
  }
}
// wet line and moss creeping up from the waterline
function swWetLine(g, x0, x1, y, h) {
  const gr = g.createLinearGradient(0, y, 0, y - h);
  gr.addColorStop(0, 'rgba(36,48,28,0.75)'); gr.addColorStop(0.45, 'rgba(70,92,42,0.4)'); gr.addColorStop(1, 'rgba(70,92,42,0)');
  g.fillStyle = gr; g.fillRect(x0, y - h, x1 - x0, h + 2);
}
function swMossDabs(g, x0, x1, y0, y1, n, R) {
  for (let i = 0; i < n; i++) { g.fillStyle = alpha(R() < 0.5 ? SWP.moss : SWP.mossL, 0.7); g.beginPath(); g.ellipse(x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), 2 + R() * 5, 1.4 + R() * 2.4, 0, 0, PI * 2); g.fill(); }
}
// black crowned raven of House Morrow (emblem, facing right)
function swRaven(g, x, y, k) {
  g.save(); g.translate(x, y); g.scale(k, k); g.fillStyle = SWP.raven;
  g.beginPath(); g.ellipse(-1, 3, 7, 4.4, -0.35, 0, PI * 2); g.fill();
  g.beginPath(); g.arc(5, -2.5, 3, 0, PI * 2); g.fill();
  g.beginPath(); g.moveTo(7.5, -3.6); g.lineTo(12, -1.8); g.lineTo(7.5, -0.8); g.fill();
  g.beginPath(); g.moveTo(-6.5, 4); g.lineTo(-12, 9); g.lineTo(-10.5, 3); g.fill();
  g.beginPath(); g.moveTo(-3, 1); g.lineTo(-9, -8); g.lineTo(-5, -9); g.lineTo(2, -1); g.fill();
  g.fillStyle = '#e0b84a'; g.beginPath(); g.moveTo(2.6, -5.4); g.lineTo(2.8, -9.4); g.lineTo(4.2, -7.4); g.lineTo(5.2, -10.2); g.lineTo(6.3, -7.4); g.lineTo(7.6, -9.4); g.lineTo(7.8, -5.4); g.closePath(); g.fill();
  g.restore();
}
// a hanging cloth banner (top-left at x, y)
function swHanging(g, x, y, w, h, col, raven) {
  banner(g, x, y, w, h, col, { tail: true, wave: 0.6, lw: 1.3, trim: '#c8a040', emblem: raven ? (c, ex, ey) => swRaven(c, ex, ey + h * 0.05, w / 26) : null });
}
// stone ring (cylinder) with a broken, jagged top; origin = front base point; returns the top rim height
function swRuinTower(g, r, h, seed, o = {}) {
  const Rn = rng(seed), ry = r * 0.36, col = o.color || SWP.stone, n = 10;
  const tops = [];
  for (let i = 0; i <= n; i++) { const t = i / n; tops.push([-r + 2 * r * t, -h + (o.intact ? 0 : (Rn() < 0.4 ? Rn() * h * 0.22 : Rn() * h * 0.06)) + S(t * PI) * 4]); }
  const topY = Math.min(...tops.map(t => t[1]));
  // dark interior + inner back wall
  toon(g, ellipse(0, tops[5][1] + 2, r - 2, ry - 1), '#2a241e', { sd: 0, hd: 0, lw: 1.2 });
  const back = new Path2D(); back.moveTo(-r + 3, tops[0][1] + 1);
  for (let i = 0; i <= n; i++) { const a = PI + (i / n) * PI; back.lineTo(C(a) * (r - 3), tops[5][1] + 2 + S(a) * (ry - 1) - (o.intact ? 0 : Rn() * h * 0.12)); }
  back.lineTo(r - 3, tops[n][1] + 1); back.ellipse(0, tops[5][1] + 2, r - 3, ry - 1.5, 0, 0, PI, true); back.closePath();
  toon(g, back, dark(col, 0.2), { sd: 0, hd: 0.8, lw: 1.2 });
  // front body
  const body = new Path2D(); body.moveTo(-r, 0); tops.forEach(([tx, ty]) => body.lineTo(tx, ty)); body.lineTo(r, 0); body.ellipse(0, 0, r, ry, 0, 0, PI, false); body.closePath();
  g.fillStyle = lg(g, -r, 0, r, 0, [[0, light(col, 0.1)], [0.35, col], [0.8, dark(col, 0.14)], [1, dark(col, 0.24)]]); g.fill(body);
  g.save(); g.clip(body);
  swCylBricks(g, r, ry, 0, topY, seed, o.rowH || 10);
  if (o.wet !== false) swWetLine(g, -r, r, 4, 26);
  swMossDabs(g, -r, r, topY + 6, -8, 6, Rn);
  g.restore();
  g.lineJoin = 'round'; g.lineWidth = 1.7; g.strokeStyle = OUT; g.stroke(body);
  // rubble along the broken rim
  for (let i = 1; i < n; i++) if (Rn() < 0.45) toon(g, ellipse(tops[i][0], tops[i][1] + 1, 2.5 + Rn() * 2, 1.6), light(col, 0.06), { sd: 0.4, hd: 0.3, lw: 0.9 });
  return topY;
}
function swSlit(g, x, y, w, h, lit) {
  const p = new Path2D(); p.moveTo(x - w / 2, y + h / 2); p.lineTo(x - w / 2, y - h / 2 + w / 2); p.arc(x, y - h / 2 + w / 2, w / 2, PI, 0); p.lineTo(x + w / 2, y + h / 2); p.closePath();
  toon(g, p, lit ? '#ffb24a' : '#1c1612', { sd: 0, hd: 0, lw: 1.1 });
  if (lit) glow(g, x, y, w * 3.4, '#ff8a2a', 0.45);
  g.fillStyle = 'rgba(230,224,200,0.35)'; g.fillRect(x - w / 2 - 1, y + h / 2, w + 2, 1.6);
}
function swIsWet(o, SW, x, y) { return o.wet === true || (o.wet !== false && !!SW && SW.sd(x, y) < 2); }

// drowned tower: leaning, broken-topped, standing in the bog (o.h, o.r, o.lean, o.lit, o.tree)
SWAMP_DRAW.swampTower = (g, x, y, s, R, pal, o, SW) => {
  const r = o.r || 28, h = o.h || 130, lean = o.lean ?? (R() - 0.5) * 0.2, seed = (o.seed || 0) + Math.floor(R() * 1e4), wet = swIsWet(o, SW, x, y);
  const draw = c => {
    c.save(); c.rotate(lean);
    const top = swRuinTower(c, r, h, seed, { wet });
    const Rn = rng(seed + 3);
    for (let i = 0; i < 3; i++) swSlit(c, (Rn() - 0.5) * r * 0.9, -h * (0.3 + i * 0.22), 4.5, 12, o.lit && i === 1);
    if (o.tree) { c.save(); c.translate(r * 0.2, top + 8); swDeadTree(c, 0, 0, 0.55, Rn, pal, false); c.restore(); }
    c.restore();
  };
  if (wet) swMirror(g, x, y, (r + 30) * 2 * s, (h + 40) * s, c => { c.scale(s, s); draw(c); }, 0.32);
  g.save(); g.translate(x, y); g.scale(s, s);
  if (wet) swAbove(g, 0, () => draw(g)); else { shadowBlob(g, 16, 2, r + 18, 10, 0.32); draw(g); }
  if (wet) swRipples(g, 0, 1, r + 9, (r + 9) * 0.34, 0.55);
  g.restore();
};
// broken column (o.h, o.lean, o.debris) — on land it gets a plinth, in water a waterline
SWAMP_DRAW.swampColumn = (g, x, y, s, R, pal, o, SW) => {
  const wet = swIsWet(o, SW, x, y), h = o.h || 34 + R() * 50, r = 8.5, lean = o.lean ?? (R() - 0.5) * 0.18, col = o.color || '#a39f8f';
  const draw = c => {
    if (!wet) toon(c, poly([[-13, 2], [-13, -7], [-9, -11], [13, -11], [13, 2]]), dark(col, 0.06), { sd: 0.8, hd: 0.5, lw: 1.3 });
    c.save(); c.translate(0, wet ? 0 : -9); c.rotate(lean);
    const t1 = -h + R() * 8, t2 = -h + 6 + R() * 10;
    const body = new Path2D(); body.moveTo(-r, 0); body.lineTo(-r, t1); body.lineTo(-r * 0.3, t1 - 4); body.lineTo(r * 0.2, t2 + 3); body.lineTo(r, t2); body.lineTo(r, 0); body.ellipse(0, 0, r, r * 0.36, 0, 0, PI); body.closePath();
    c.fillStyle = lg(c, -r, 0, r, 0, [[0, light(col, 0.1)], [0.4, col], [1, dark(col, 0.22)]]); c.fill(body);
    c.save(); c.clip(body); c.strokeStyle = 'rgba(40,34,26,0.35)'; c.lineWidth = 1;
    for (const fx of [-0.62, -0.25, 0.12, 0.5]) { c.beginPath(); c.moveTo(fx * r, 2); c.lineTo(fx * r, -h); c.stroke(); }
    for (let yy = -16 - R() * 10; yy > -h; yy -= 22) { c.beginPath(); c.ellipse(0, yy, r, r * 0.36, 0, 0, PI); c.stroke(); }
    if (wet) swWetLine(c, -r, r, 3, 18);
    swMossDabs(c, -r, r, -h + 10, -4, 3, R);
    c.restore();
    c.lineWidth = 1.5; c.strokeStyle = OUT; c.lineJoin = 'round'; c.stroke(body);
    toon(c, poly([[-r, t1], [-r * 0.3, t1 - 4], [r * 0.2, t2 + 3], [r, t2], [r * 0.4, t2 + r * 0.32], [-r * 0.5, t1 + r * 0.3]]), light(col, 0.08), { sd: 0, hd: 0.3, lw: 1.1 });
    c.restore();
  };
  g.save(); g.translate(x, y); g.scale(s, s);
  if (wet) { swAbove(g, 0, () => draw(g)); swRipples(g, 0, 1, r + 6, 3.6, 0.5); } else { shadowBlob(g, 10, 1, 18, 5, 0.3); draw(g); }
  if (o.debris) { const dx = o.debris * 26; toon(g, rrect(dx - 11, -9, 22, 9, 2), dark(col, 0.04), { sd: 0.8, hd: 0.5, lw: 1.2, detail: c => { c.strokeStyle = 'rgba(40,30,20,0.4)'; c.beginPath(); c.arc(dx - 7, -5, 2.4, 0, PI * 2); c.arc(dx + 7, -5, 2.4, 0, PI * 2); c.stroke(); } }); }
  g.restore();
};
// broken arch standing in the water
SWAMP_DRAW.swampArch = (g, x, y, s, R, pal, o, SW) => {
  const wet = swIsWet(o, SW, x, y), col = o.color || SWP.stone, flip = o.flip ? -1 : 1;
  const draw = c => {
    c.save(); c.scale(flip, 1);
    const p = new Path2D(); p.moveTo(-40, 4); p.lineTo(-40, -54); p.arc(0, -54, 40, PI, PI * 1.62); p.lineTo(14, -102); p.lineTo(18, -86); p.lineTo(10, -82); p.arc(0, -54, 26, PI * 1.66, PI, true); p.lineTo(-26, 4); p.closePath();
    toon(c, p, col, { sd: 2.6, hd: 1.2, lw: 1.6, detail: cc => { wallBricks(cc, -44, -106, 44, 4, { rowH: 9, bw: 15, seed: 11, tint: true }); if (wet) swWetLine(cc, -44, 44, 6, 24); swMossDabs(cc, -40, 10, -96, -10, 5, R); } });
    const q = new Path2D(); q.moveTo(26, 4); q.lineTo(26, -50); q.lineTo(32, -60); q.lineTo(40, -52); q.lineTo(40, 4); q.closePath();
    toon(c, q, dark(col, 0.04), { sd: 1.6, hd: 0.8, lw: 1.5, detail: cc => { wallBricks(cc, 24, -64, 44, 4, { rowH: 9, bw: 15, seed: 5, tint: true }); if (wet) swWetLine(cc, 24, 44, 6, 24); } });
    c.restore();
  };
  if (wet) swMirror(g, x, y, 120 * s, 120 * s, c => { c.scale(s, s); draw(c); }, 0.3);
  g.save(); g.translate(x, y); g.scale(s, s);
  if (wet) { swAbove(g, 0, () => draw(g)); swRipples(g, -33 * flip, 1, 13, 3.6, 0.5); swRipples(g, 33 * flip, 1, 13, 3.6, 0.5); } else { shadowBlob(g, 12, 2, 50, 10, 0.3); draw(g); }
  g.restore();
};
// house sunk to its windows (o.tilt, o.sink, o.stone, o.roofless)
SWAMP_DRAW.swampSunkenHouse = (g, x, y, s, R, pal, o, SW) => {
  const tilt = o.tilt ?? (R() - 0.5) * 0.16, sink = o.sink ?? 14, stone = o.stone ?? R() < 0.5, seed = Math.floor(R() * 100);
  const wall = stone ? '#8c8878' : '#7e6446', roof = o.roof || (R() < 0.5 ? '#4e5450' : '#6a5a44');
  const draw = c => {
    c.save(); c.translate(0, sink); c.rotate(tilt);
    const hs = house(c, 0, 0, 64, 38, o.roofless ? 0 : 28, { wall, wallKind: stone ? 'stone' : 'timber', roof, roofKind: o.roofless ? 'flat' : 'shingle', depth: 18, overhang: 6, seed });
    swSlit(c, -16, -24, 9, 12, false); swSlit(c, 14, -24, 9, 12, o.lit);
    if (!o.roofless) {
      toon(c, poly([[6, -50], [20, -46], [24, -38], [12, -36], [2, -42]]), '#1a1410', { sd: 0, hd: 0, lw: 1.2 });
      for (const bx of [8, 14, 19]) line(c, [[bx, -49], [bx + 3, -37]], '#5a4028', 1.6);
      swMossDabs(c, -34, 30, -64, -40, 7, R);
    } else {
      toon(c, poly([[-32, -38], [-26, -46], [-12, -40], [0, -48], [14, -42], [26, -50], [32, -38]]), wall, { sd: 0.8, hd: 0.6, lw: 1.3 });
    }
    swWetLine(c, -34, 34, 2, 22);
    c.restore();
  };
  swMirror(g, x, y, 130 * s, 110 * s, c => { c.scale(s, s); draw(c); }, 0.28);
  g.save(); g.translate(x, y); g.scale(s, s);
  swAbove(g, 0, () => draw(g));
  swRipples(g, 0, 1, 44, 7, 0.5);
  g.restore();
};
// roofless stone house shell on dry ground (o.flip)
SWAMP_DRAW.swampRuin = (g, x, y, s, R, pal, o) => {
  const col = o.color || '#8e8a7a', seed = Math.floor(R() * 100);
  g.save(); g.translate(x, y); g.scale(s * (o.flip ? -1 : 1), s);
  shadowBlob(g, 18, 3, 64, 14, 0.3);
  toon(g, poly([[-40, -4], [40, -4], [54, -22], [-26, -22]]), '#4a4634', { sd: 0, hd: 0.6, lw: 1.2, detail: c => { swMossDabs(c, -30, 40, -20, -6, 8, R); } });
  const back = new Path2D(); back.moveTo(-26, -22); back.lineTo(-26, -56); back.lineTo(-10, -60); back.lineTo(6, -52); back.lineTo(22, -64); back.lineTo(40, -58); back.lineTo(54, -50); back.lineTo(54, -22); back.closePath();
  toon(g, back, dark(col, 0.12), { sd: 1, hd: 0.5, lw: 1.4, detail: c => wallBricks(c, -28, -66, 56, -22, { rowH: 8, bw: 14, seed, tint: true }) });
  swSlit(g, 12, -40, 8, 12, false);
  const side = new Path2D(); side.moveTo(40, -4); side.lineTo(40, -44); side.lineTo(48, -52); side.lineTo(54, -46); side.lineTo(54, -22); side.closePath();
  toon(g, side, dark(col, 0.18), { sd: 0.6, hd: 0.3, lw: 1.3 });
  const front = new Path2D(); front.moveTo(-40, 2); front.lineTo(-40, -34); front.lineTo(-30, -40); front.lineTo(-22, -30); front.lineTo(-14, -26); front.lineTo(-14, 2); front.closePath();
  toon(g, front, col, { sd: 1.4, hd: 0.7, lw: 1.5, detail: c => { wallBricks(c, -42, -44, -12, 2, { rowH: 8, bw: 14, seed: seed + 1, tint: true }); swMossDabs(c, -40, -14, -30, 0, 3, R); } });
  const front2 = new Path2D(); front2.moveTo(10, 2); front2.lineTo(10, -20); front2.lineTo(22, -26); front2.lineTo(30, -18); front2.lineTo(40, -24); front2.lineTo(40, 2); front2.closePath();
  toon(g, front2, col, { sd: 1.4, hd: 0.7, lw: 1.5, detail: c => wallBricks(c, 8, -30, 42, 2, { rowH: 8, bw: 14, seed: seed + 2, tint: true }) });
  for (let i = 0; i < 5; i++) toon(g, ellipse(-8 + i * 4 + R() * 3, -1 + R() * 3, 3 + R() * 2, 2), dark(col, 0.04), { sd: 0.4, hd: 0.3, lw: 0.9 });
  g.restore();
};
// hut on stilts over the water (o.lit)
SWAMP_DRAW.swampStilthouse = (g, x, y, s, R, pal, o, SW) => {
  const wet = swIsWet(o, SW, x, y), deck = -26, seed = Math.floor(R() * 100);
  g.save(); g.translate(x, y); g.scale(s * (o.flip ? -1 : 1), s);
  if (!wet) shadowBlob(g, 14, 2, 54, 12, 0.3);
  const post = (px, py, top) => { toon(g, rrect(px - 2.4, top, 4.8, py - top + 1, 1.5), SWP.woodD, { sd: 0.8, hd: 0.3, lw: 1.2 }); if (wet) swRipples(g, px, py + 1, 7, 2.2, 0.45); };
  post(-28, -9, deck - 10); post(32, -9, deck - 10);
  line(g, [[-28, -12], [32, deck - 6]], OUT, 2.6); line(g, [[-28, -12], [32, deck - 6]], SWP.woodD, 1.3);
  post(-36, 2, deck); post(36, 2, deck); post(0, 3, deck + 2);
  line(g, [[-36, -2], [0, deck + 4]], OUT, 2.6); line(g, [[-36, -2], [0, deck + 4]], SWP.wood, 1.3);
  toon(g, poly([[-46, deck], [46, deck], [54, deck - 12], [-38, deck - 12]]), SWP.woodL, { sd: 0.4, hd: 0.4, lw: 1.4, detail: c => { c.strokeStyle = 'rgba(40,24,10,0.5)'; c.lineWidth = 1; for (let i = -40; i < 54; i += 7) { c.beginPath(); c.moveTo(i, deck); c.lineTo(i + 8, deck - 12); c.stroke(); } } });
  toon(g, rect(-46, deck, 92, 5), SWP.wood, { sd: 0.5, hd: 0.3, lw: 1.3 });
  house(g, -2, deck - 4, 52, 27, 22, { wall: '#7a6244', wallKind: 'timber', roof: SWP.thatch, roofKind: 'thatch', depth: 14, overhang: 6, seed });
  door(g, -12, deck - 4, 10, 17, { color: '#1a120c', open: false });
  toon(g, rrect(4, deck - 23, 10, 8, 1.5), o.lit ? '#ffd27a' : '#1f150e', { sd: 0, hd: 0, lw: 1.2 });
  if (o.lit) glow(g, 9, deck - 19, 18, '#ffb04a', 0.45);
  swMossDabs(g, -30, 24, deck - 52, deck - 34, 6, R);
  // ladder to the water and a tied skiff
  for (const lx of [40, 47]) line(g, [[lx, deck + 2], [lx + 4, 6]], SWP.woodD, 2);
  for (let k = 0; k < 4; k++) line(g, [[40.8 + k * 1, deck + 8 + k * 7], [47.8 + k * 1, deck + 8 + k * 7]], SWP.woodD, 1.6);
  for (let i = -40; i <= -16; i += 8) { line(g, [[i, deck], [i, deck - 9]], SWP.woodD, 1.6); }
  line(g, [[-42, deck - 8], [-14, deck - 8]], SWP.woodD, 1.6);
  g.restore();
};
// small rowboat (o.ang rotation in the water plane, o.sunk)
SWAMP_DRAW.swampBoat = (g, x, y, s, R, pal, o) => {
  const ang = o.ang ?? (R() - 0.5) * 0.8;
  g.save(); g.translate(x, y); g.scale(s, s);
  swRipples(g, 0, 2, 30, 7, 0.45);
  const hull = (c) => {
    c.save(); c.rotate(ang * 0.25);
    const p = new Path2D(); p.moveTo(-28, -6); p.quadraticCurveTo(-10, -13, 26, -8); p.lineTo(31, -11); p.quadraticCurveTo(30, 0, 22, 4); p.quadraticCurveTo(-6, 9, -26, 2); p.closePath();
    toon(c, p, SWP.wood, { sd: 1.4, hd: 0.6, lw: 1.5 });
    const inner = new Path2D(); inner.moveTo(-23, -5); inner.quadraticCurveTo(-8, -10, 22, -7); inner.quadraticCurveTo(20, -1, 16, 0); inner.quadraticCurveTo(-6, 3, -21, -1); inner.closePath();
    toon(c, inner, SWP.woodD, { sd: 0, hd: 0.5, lw: 1.1, detail: cc => { cc.strokeStyle = 'rgba(20,12,6,0.6)'; for (const bx of [-10, 6]) { cc.lineWidth = 3; cc.beginPath(); cc.moveTo(bx, -10); cc.lineTo(bx + 2, 2); cc.stroke(); } } });
    if (!o.sunk) { line(c, [[-4, -6], [-30, 8]], OUT, 3); line(c, [[-4, -6], [-30, 8]], SWP.woodL, 1.6); }
    c.restore();
  };
  if (o.sunk) swAbove(g, -1, () => hull(g)); else hull(g);
  g.restore();
};
// boardwalk on posts from (x1,y1) to (x2,y2), width o.w
SWAMP_DRAW.swampJetty = (g, x, y, s, R, pal, o) => {
  const { x1, y1, x2, y2 } = o, w = o.w || 34, len = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1);
  const nx = -S(a), ny = C(a) * 0.75;
  const at = (t, side, up = 0) => [x1 + (x2 - x1) * t + nx * side * w / 2, y1 + (y2 - y1) * t + ny * side * w / 2 - up];
  const n = Math.max(2, Math.round(len / 44));
  for (let i = 0; i <= n; i++) for (const sd of [-1, 1]) { const [px, py] = at(i / n, sd); toon(g, rrect(px - 2.6, py - 8, 5.2, 14, 1.5), SWP.woodD, { sd: 0.6, hd: 0.3, lw: 1.1 }); swRipples(g, px, py + 6, 6, 2, 0.4); }
  const deck = new Path2D(); const c0 = at(0, -1, 8), c1 = at(1, -1, 8), c2 = at(1, 1, 8), c3 = at(0, 1, 8);
  deck.moveTo(...c0); deck.lineTo(...c1); deck.lineTo(...c2); deck.lineTo(...c3); deck.closePath();
  toon(g, deck, '#4a3a28', { sd: 0, hd: 0, lw: 1.4 });
  const planks = Math.round(len / 6.5);
  for (let i = 0; i < planks; i++) {
    if (R() < 0.05) continue;
    const t0 = i / planks, t1 = (i + 0.84) / planks, j = (R() - 0.5) * 1.5;
    toon(g, poly([at(t0, -1.05, 8 + j), at(t0, 1.05, 8 + j), at(t1, 1.05, 8 + j), at(t1, -1.05, 8 + j)]), R() < 0.5 ? SWP.woodL : '#7e6444', { sd: 0, hd: 0.35, lw: 0.9 });
  }
  for (const sd of [-1, 1]) { const b0 = at(0, sd, 9), b1 = at(1, sd, 9); line(g, [b0, b1], OUT, 3.6); line(g, [b0, b1], SWP.woodD, 2); }
};
// tall wooden watchtower on stilts (o.banner colour, o.lit)
SWAMP_DRAW.swampWatchtower = (g, x, y, s, R, pal, o) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  shadowBlob(g, 24, 3, 46, 12, 0.32);
  const legs = [[-26, -6], [26, -6], [-30, 4], [30, 4]], top = -116;
  for (const [lx, ly] of legs.slice(0, 2)) toon(g, poly([[lx - 2.6, ly], [lx * 0.7 - 2.4, top], [lx * 0.7 + 2.4, top], [lx + 2.6, ly]]), SWP.woodD, { sd: 0.8, hd: 0.3, lw: 1.3 });
  for (let k = 0; k < 3; k++) { const ya = -10 - k * 34, yb = ya - 34, f = t => 1 - (0.3 * (-t)) / 116; line(g, [[-30 * f(ya), ya], [30 * f(yb), yb]], OUT, 3); line(g, [[-30 * f(ya), ya], [30 * f(yb), yb]], SWP.wood, 1.6); line(g, [[30 * f(ya), ya], [-30 * f(yb), yb]], OUT, 3); line(g, [[30 * f(ya), ya], [-30 * f(yb), yb]], SWP.wood, 1.6); }
  for (const [lx, ly] of legs.slice(2)) toon(g, poly([[lx - 2.8, ly], [lx * 0.7 - 2.6, top], [lx * 0.7 + 2.6, top], [lx + 2.8, ly]]), SWP.wood, { sd: 1, hd: 0.4, lw: 1.4 });
  toon(g, poly([[-30, top], [30, top], [36, top - 10], [-24, top - 10]]), SWP.woodL, { sd: 0.4, hd: 0.4, lw: 1.4 });
  toon(g, rect(-30, top, 60, 6), SWP.wood, { sd: 0.5, hd: 0.3, lw: 1.3 });
  for (let i = -28; i <= 28; i += 8) line(g, [[i, top], [i, top - 14]], SWP.woodD, 1.8);
  line(g, [[-30, top - 13], [30, top - 13]], SWP.woodD, 2.2);
  for (const px of [-22, 22]) toon(g, rrect(px - 2, top - 44, 4, 34, 1), SWP.woodD, { sd: 0.5, hd: 0.2, lw: 1.1 });
  toon(g, poly([[-34, top - 40], [0, top - 74], [38, top - 40], [30, top - 36], [0, top - 64], [-28, top - 36]]), SWP.thatch, { sd: 1.4, hd: 0.8, lw: 1.6, detail: c => { c.strokeStyle = 'rgba(60,44,16,0.45)'; c.lineWidth = 1; for (let i = 0; i < 18; i++) { const xx = -32 + i * 4; c.beginPath(); c.moveTo(xx, top - 38); c.lineTo(xx * 0.3, top - 66); c.stroke(); } } });
  pole(g, 0, top - 100, top - 70, 2.2);
  banner(g, 1, top - 99, 16, 22, o.banner || SWP.realm, { tail: true, wave: 1 });
  if (o.lit !== false) { glow(g, 12, top - 22, 30, '#ffa040', 0.5); flat(g, blob([[8, top - 14], [10, top - 24], [13, top - 30], [16, top - 22], [17, top - 14]], 0.7), '#ffae3a', 1, '#7a2a08'); }
  g.restore();
};
// gothic (pointed) arch outline into path p; base at yb, total height h
function swPointed(p, cx, yb, w, h) {
  const ys = yb - h + w * 0.62;
  p.moveTo(cx - w / 2, yb); p.lineTo(cx - w / 2, ys);
  p.bezierCurveTo(cx - w / 2, ys - w * 0.36, cx - w * 0.16, yb - h + w * 0.1, cx, yb - h);
  p.bezierCurveTo(cx + w * 0.16, yb - h + w * 0.1, cx + w / 2, ys - w * 0.36, cx + w / 2, ys);
  p.lineTo(cx + w / 2, yb); p.closePath();
  return p;
}
// ruined wall from (x1,y1) to (x2,y2) with a jagged top (o.h, o.thick, o.wet, o.intact, o.gaps)
SWAMP_DRAW.swampWall = (g, x, y, s, R, pal, o) => {
  const { x1, y1, x2, y2 } = o, H = (o.h || 64) * s, T = (o.thick || 18) * s, col = o.color || SWP.stone, Rn = rng(Math.floor(R() * 1e5));
  const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.round(len / 22));
  const hs = []; let gap = 0, cur = 0.8;
  for (let i = 0; i <= n; i++) {
    if (gap > 0) { hs.push(H * (0.1 + Rn() * 0.08)); gap--; continue; }
    if (o.gaps !== false && !o.intact && Rn() < 0.05 && i > 1 && i < n - 2) { gap = 1 + Math.floor(Rn() * 2); hs.push(H * 0.2); continue; }
    cur = o.intact ? 0.95 + Rn() * 0.05 : swClamp(cur + (Rn() - 0.5) * 0.34, 0.45, 1);
    hs.push(H * cur);
  }
  const P = i => [x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n];
  const tx = T * 0.32, ty = -T * 0.5;
  const draw = () => {
    if (!o.wet) shadowBlob(g, (x1 + x2) / 2 + 10, (y1 + y2) / 2 + 4, len / 2 + 20, 14, 0.28);
    for (let i = 0; i < n; i++) {
      const [ax, ay] = P(i), [bx, by] = P(i + 1);
      toon(g, poly([[ax, ay - hs[i]], [bx, by - hs[i + 1]], [bx + tx, by - hs[i + 1] + ty], [ax + tx, ay - hs[i] + ty]]), light(col, 0.05), { sd: 0, hd: 0.4, lw: 1.2 });
    }
    const face = new Path2D(); face.moveTo(x1, y1);
    for (let i = 0; i <= n; i++) { const [px, py] = P(i); face.lineTo(px, py - hs[i]); }
    face.lineTo(x2, y2); face.closePath();
    toon(g, face, col, { sd: 2, hd: 1, lw: 1.6, detail: c => {
      const top = Math.min(y1, y2) - H - 10, bot = Math.max(y1, y2) + 4;
      c.strokeStyle = 'rgba(34,28,20,0.4)'; c.lineWidth = 1.1;
      for (let r = 0; r * 10 < H + Math.abs(y2 - y1); r++) { c.beginPath(); c.moveTo(x1, y1 - r * 10); c.lineTo(x2, y2 - r * 10); c.stroke(); }
      for (let i = 0; i <= n * 2; i++) for (let r = 0; r * 10 < H; r++) { const t = (i + (r % 2) * 0.5) / (n * 2), bx = x1 + (x2 - x1) * t, by = y1 + (y2 - y1) * t - r * 10; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, by - 10); c.stroke(); }
      swWetLine(c, Math.min(x1, x2) - 4, Math.max(x1, x2) + 4, bot - 2, o.wet ? 26 : 12);
      swMossDabs(c, Math.min(x1, x2), Math.max(x1, x2), top + H * 0.3, bot - 6, Math.round(len / 40), Rn);
    } });
    for (let i = 1; i < n; i++) if (hs[i] < H * 0.15 || Rn() < 0.12) { const [px, py] = P(i); toon(g, ellipse(px + (Rn() - 0.5) * 10, py + 4, 4 + Rn() * 3, 2.6), dark(col, 0.05), { sd: 0.4, hd: 0.3, lw: 1 }); }
  };
  if (o.wet) { g.save(); const cp = new Path2D(); cp.moveTo(x1 - 40, y1); cp.lineTo(x2 + 40, y2); cp.lineTo(x2 + 40, y2 - 9999); cp.lineTo(x1 - 40, y1 - 9999); cp.closePath(); g.clip(cp); draw(); g.restore(); swRipples(g, (x1 + x2) / 2, (y1 + y2) / 2 + 1, len / 2 + 8, 5, 0.4); }
  else draw();
};
// the broken city gate of the old capital (opening at x, y) with Morrow banners and ember braziers
SWAMP_DRAW.swampGate = (g, x, y, s, R, pal, o) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  shadowBlob(g, 30, 8, 200, 26, 0.36);
  g.save(); g.translate(-118, 2); swRuinTower(g, 46, 178, 77, { wet: false }); swSlit(g, -12, -112, 6, 16, true); swSlit(g, 14, -62, 6, 16, false); g.restore();
  g.save(); g.translate(118, 2); swRuinTower(g, 46, 134, 91, { wet: false }); swSlit(g, 10, -82, 6, 16, false); g.restore();
  const gw = 80, gh = 150, st = SWP.stone;
  const block = new Path2D(); block.moveTo(-gw, 0); block.lineTo(-gw, -gh);
  [[-60, -gh], [-52, -gh - 6], [-30, -gh + 4], [-12, -gh - 2], [8, -gh + 12], [26, -gh + 6], [44, -gh + 16], [gw, -gh + 8]].forEach(([px, py]) => block.lineTo(px, py));
  block.lineTo(gw, 0); block.closePath();
  const hole = swPointed(new Path2D(), 0, 0, 72, 108);
  const both = new Path2D(); both.addPath(block); both.addPath(hole);
  g.save(); g.fillStyle = lg(g, -gw, 0, gw, 0, [[0, light(st, 0.08)], [0.5, st], [1, dark(st, 0.14)]]); g.fill(both, 'evenodd');
  g.clip(both, 'evenodd'); wallBricks(g, -gw, -gh - 10, gw, 0, { rowH: 10, bw: 18, seed: 9, tint: true }); swWetLine(g, -gw, gw, 2, 20); swMossDabs(g, -gw, gw, -gh, -10, 12, R); g.restore();
  g.lineWidth = 1.8; g.strokeStyle = OUT; g.lineJoin = 'round'; g.stroke(block);
  // the dark passage, faintly lit from within
  g.save(); g.clip(hole); g.fillStyle = lg(g, 0, -108, 0, 0, [[0, '#120c0a'], [0.6, '#2a140c'], [1, '#5a2410']]); g.fillRect(-40, -110, 80, 112); glow(g, 0, -10, 46, '#ff7a2a', 0.35); g.restore();
  for (const [k, c2] of [[0, light(st, 0.1)], [8, st]]) { const ring = swPointed(new Path2D(), 0, 0, 72 + 16 - k, 108 + 12 - k * 0.6); g.lineWidth = 6; g.strokeStyle = OUT; g.stroke(ring); g.lineWidth = 3.6; g.strokeStyle = c2; g.stroke(ring); }
  g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke(hole);
  // broken portcullis
  g.save(); g.clip(hole); for (let bx = -30; bx <= 30; bx += 10) { const l = 30 + R() * 46; line(g, [[bx, -110], [bx, -110 + l]], OUT, 3.6); line(g, [[bx, -110], [bx, -110 + l]], SWP.iron, 2); line(g, [[bx - 1.5, -110 + l], [bx, -110 + l + 5], [bx + 1.5, -110 + l]], SWP.iron, 1.6); } for (const by of [-92, -70]) { line(g, [[-34, by], [24, by + 3]], OUT, 3.4); line(g, [[-34, by], [24, by + 3]], SWP.iron, 1.8); } g.restore();
  for (let i = 0; i < 5; i++) if (i !== 3) toon(g, rrect(-gw + 6 + i * 34, -gh - 12 + (i === 4 ? 14 : 0), 16, 14, 1.5), st, { sd: 1, hd: 0.6, lw: 1.3 });
  swHanging(g, -70, -138, 24, 76, SWP.morrow, true); swHanging(g, 46, -138, 24, 76, SWP.morrow, true);
  SWAMP_DRAW.swampBrazier(g, -56, 22, 1, R); SWAMP_DRAW.swampBrazier(g, 56, 22, 1, R);
  g.restore();
};
// graves: a cluster of headstones, crosses and little obelisks (o.n); o.wet = sunk to the shoulders in the bog
SWAMP_DRAW.swampTombs = (g, x, y, s, R, pal, o, SW) => {
  const n = o.n || 3 + Math.floor(R() * 3), list = [], wet = o.wet === true;
  for (let i = 0; i < n; i++) list.push([x + (R() - 0.5) * 80 * s, y + (R() - 0.5) * 30 * s, R()]);
  list.sort((a, b) => a[1] - b[1]);
  for (const [gx, gy, k] of list) {
    if (wet) { swAbove(g, gy, () => swGrave(g, gx, gy + 6 * s, s * (0.9 + R() * 0.3), R, o.kind ?? k, true)); swRipples(g, gx, gy, 11 * s, 3 * s, 0.45); }
    else swGrave(g, gx, gy, s * (0.85 + R() * 0.3), R, o.kind ?? k);
  }
};
// a row of graves from (x1,y1) to (x2,y2), some leaning or fallen
SWAMP_DRAW.swampGraves = (g, x, y, s, R, pal, o) => {
  const { x1, y1, x2, y2 } = o, len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(len / (o.gap || 34)));
  for (let i = 0; i <= n; i++) {
    if (R() < 0.12) continue;
    const t = i / n, gx = x1 + (x2 - x1) * t + (R() - 0.5) * 5, gy = y1 + (y2 - y1) * t + (R() - 0.5) * 4;
    swGrave(g, gx, gy, s * (0.9 + R() * 0.25), R, o.kind ?? R());
  }
};
function swGrave(g, x, y, s, R, k, wet) {
  const col = ['#8a887c', '#7c7a70', '#9a978a', '#727068'][Math.floor(R() * 4)], tilt = (R() - 0.5) * 0.32;
  if (!wet) { g.fillStyle = 'rgba(36,32,20,0.45)'; g.beginPath(); g.ellipse(x + 2 * s, y + 7 * s, 12 * s, 4.6 * s, 0, 0, PI * 2); g.fill(); shadowBlob(g, x + 7 * s, y + 1, 12 * s, 4 * s, 0.3); }
  g.save(); g.translate(x, y); g.rotate(tilt); g.scale(s, s);
  let p;
  if (k < 0.42) { p = new Path2D(); p.moveTo(-8, 1); p.lineTo(-8, -15); p.arc(0, -15, 8, PI, 0); p.lineTo(8, 1); p.closePath(); }
  else if (k < 0.72) p = poly([[-2.6, 1], [-2.6, -15], [-8, -15], [-8, -20.5], [-2.6, -20.5], [-2.6, -27], [2.6, -27], [2.6, -20.5], [8, -20.5], [8, -15], [2.6, -15], [2.6, 1]]);
  else if (k < 0.88) p = poly([[-5, 1], [-4, -25], [0, -32], [4, -25], [5, 1]]);
  else p = poly([[-8, 1], [-8, -11], [-2, -15], [2, -9], [8, -13], [8, 1]]);
  g.save(); g.translate(2.6, -1.6); toon(g, p, dark(col, 0.2), { sd: 0, hd: 0, lw: 1.2 }); g.restore();
  toon(g, p, col, { sd: 1.2, hd: 0.8, lw: 1.3, detail: c => { if (k < 0.42) { c.strokeStyle = 'rgba(40,36,30,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-4, -15); c.lineTo(4, -15); c.moveTo(-4, -11); c.lineTo(3, -11); c.stroke(); } swMossDabs(c, -8, 8, -12, 0, 2, R); } });
  g.restore();
}
// mausoleum with a pediment, columns and an iron door (o.flip)
SWAMP_DRAW.swampCrypt = (g, x, y, s, R, pal, o) => {
  const col = '#8e8b7e', seed = Math.floor(R() * 100);
  g.save(); g.translate(x, y); g.scale(s * (o.flip ? -1 : 1), s);
  shadowBlob(g, 22, 4, 74, 16, 0.34);
  toon(g, poly([[34, -11], [34, -64], [52, -74], [52, -21]]), dark(col, 0.18), { sd: 0.6, hd: 0.3, lw: 1.4, detail: c => wallBricks(c, 32, -80, 54, -10, { rowH: 9, bw: 12, seed, tint: true }) });
  toon(g, poly([[0, -98], [40, -62], [58, -72], [18, -108]]), SWP.slate, { sd: 0.6, hd: 0.5, lw: 1.5, detail: c => swMossDabs(c, 6, 50, -100, -66, 6, R) });
  toon(g, rect(-34, -64, 68, 54), col, { sd: 1.6, hd: 0.8, lw: 1.6, detail: c => { wallBricks(c, -34, -64, 34, -10, { rowH: 9, bw: 16, seed: seed + 1, tint: true }); swMossDabs(c, -34, 34, -30, -12, 4, R); } });
  toon(g, poly([[-42, -60], [0, -100], [42, -60]]), light(col, 0.05), { sd: 1, hd: 0.8, lw: 1.6, detail: c => { c.strokeStyle = 'rgba(40,34,26,0.55)'; c.lineWidth = 1.2; c.stroke(star(0, -74, 9, 0.42, 8)); } });
  toon(g, rect(-44, -64, 88, 6), light(col, 0.08), { sd: 0.6, hd: 0.4, lw: 1.4 });
  for (const cx of [-25, 25]) toon(g, rect(cx - 4.5, -58, 9, 47), light(col, 0.1), { sd: 1, hd: 0.6, lw: 1.3, detail: c => { c.strokeStyle = 'rgba(40,34,26,0.35)'; c.beginPath(); c.moveTo(cx - 1.5, -58); c.lineTo(cx - 1.5, -11); c.moveTo(cx + 1.5, -58); c.lineTo(cx + 1.5, -11); c.stroke(); } });
  const dp = new Path2D(); dp.moveTo(-12, -11); dp.lineTo(-12, -40); dp.arc(0, -40, 12, PI, 0); dp.lineTo(12, -11); dp.closePath();
  toon(g, dp, '#1c1814', { sd: 0, hd: 0, lw: 1.4, detail: c => { for (let bx = -9; bx <= 9; bx += 4.5) { line(c, [[bx, -50], [bx, -11]], SWP.iron, 1.6); } line(c, [[-12, -30], [12, -30]], SWP.iron, 1.6); } });
  toon(g, rect(-40, -11, 80, 6), dark(col, 0.04), { sd: 0.5, hd: 0.4, lw: 1.3 }); toon(g, rect(-46, -5, 92, 6), dark(col, 0.1), { sd: 0.5, hd: 0.3, lw: 1.3 });
  for (const ux of [-36, 36]) toon(g, blob([[ux - 4, -64], [ux - 5, -70], [ux - 2, -75], [ux + 2, -75], [ux + 5, -70], [ux + 4, -64]], 0.6), light(col, 0.06), { sd: 0.6, hd: 0.4, lw: 1.1 });
  g.restore();
};
// wrought-iron cemetery fence (line item)
SWAMP_DRAW.swampFence = (g, x, y, s, R, pal, o) => {
  const { x1, y1, x2, y2 } = o, len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.round(len / 7)), h = 22 * s;
  const P = t => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
  for (let i = 0; i <= n; i++) {
    if (R() < 0.08) continue;
    const [bx, by] = P(i / n), bend = R() < 0.1 ? (R() - 0.5) * 9 : 0;
    line(g, [[bx, by], [bx + bend, by - h]], OUT, 2.8); line(g, [[bx, by], [bx + bend, by - h]], SWP.iron, 1.3);
    flat(g, poly([[bx + bend - 2.2, by - h], [bx + bend, by - h - 5], [bx + bend + 2.2, by - h]]), SWP.iron, 0.8);
  }
  for (const hh of [5, 16]) { line(g, [[x1, y1 - hh * s], [x2, y2 - hh * s]], OUT, 3.2); line(g, [[x1, y1 - hh * s], [x2, y2 - hh * s]], SWP.iron, 1.6); }
  const posts = Math.max(1, Math.round(len / 80));
  for (let k = 0; k <= posts; k++) {
    const [px, py] = P(k / posts);
    toon(g, rect(px - 4.5 * s, py - 28 * s, 9 * s, 29 * s), '#8a877a', { sd: 0.8, hd: 0.5, lw: 1.3 });
    toon(g, rect(px - 6 * s, py - 32 * s, 12 * s, 5 * s), '#9a978a', { sd: 0.5, hd: 0.4, lw: 1.2 });
  }
};
SWAMP_DRAW.swampObelisk = (g, x, y, s, R, pal, o) => {
  const col = o.color || '#8c8a7e';
  g.save(); g.translate(x, y); g.scale(s, s);
  shadowBlob(g, 12, 2, 22, 6, 0.32);
  toon(g, rect(-13, -10, 26, 10), dark(col, 0.06), { sd: 0.8, hd: 0.5, lw: 1.3 });
  toon(g, poly([[-9, -10], [-6.5, -76], [0, -88], [6.5, -76], [9, -10]]), col, { sd: 1.6, hd: 0.8, lw: 1.5, detail: c => { c.strokeStyle = 'rgba(40,34,26,0.45)'; c.lineWidth = 1; c.stroke(star(0, -56, 4.5, 0.42, 8)); for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(-4, -40 + k * 6); c.lineTo(4, -40 + k * 6); c.stroke(); } swWetLine(c, -10, 10, -9, 14); swMossDabs(c, -8, 8, -50, -12, 3, R); } });
  g.restore();
};
// giant crowned statue standing waist-deep in the water, its sword broken (o.flip, o.lean)
SWAMP_DRAW.swampStatue = (g, x, y, s, R, pal, o, SW) => {
  const wet = swIsWet(o, SW, x, y), col = o.color || '#8e968a', flip = o.flip ? -1 : 1, Rn = rng(Math.floor(R() * 1e4));
  const draw = c => {
    c.save(); c.scale(flip, 1); c.rotate(o.lean ?? 0.05);
    toon(c, poly([[-27, 14], [-23, -40], [-15, -66], [15, -66], [23, -40], [27, 14]]), col, { sd: 2.4, hd: 1.2, lw: 1.7, detail: cc => { cc.strokeStyle = 'rgba(40,46,40,0.45)'; cc.lineWidth = 1.2; for (const fx of [-12, -3, 7, 15]) { cc.beginPath(); cc.moveTo(fx * 0.6, -60); cc.quadraticCurveTo(fx, -20, fx * 1.1, 14); cc.stroke(); } swWetLine(cc, -30, 30, 6, 30); swMossDabs(cc, -24, 24, -60, 0, 6, Rn); } });
    toon(c, capsule(-17, -58, -25, -22, 6.5, 5), col, { sd: 1.4, hd: 0.7, lw: 1.5 });
    toon(c, poly([[27, -86], [31, -89], [38, -124], [35, -130], [33, -121], [29, -112]]), light(col, 0.08), { sd: 0.8, hd: 0.5, lw: 1.3 });
    toon(c, rrect(22, -88, 14, 5, 2), dark(col, 0.06), { sd: 0.5, hd: 0.3, lw: 1.2 });
    toon(c, capsule(17, -58, 29, -84, 6.5, 5.5), col, { sd: 1.4, hd: 0.7, lw: 1.5 });
    toon(c, circle(0, -77, 11.5), col, { sd: 1.6, hd: 0.9, lw: 1.6, detail: cc => { cc.strokeStyle = 'rgba(40,46,40,0.55)'; cc.lineWidth = 1.1; cc.beginPath(); cc.moveTo(-6, -78); cc.lineTo(-2, -78); cc.moveTo(2, -78); cc.lineTo(6, -78); cc.moveTo(-2, -71); cc.lineTo(2, -71); cc.stroke(); } });
    toon(c, poly([[-10, -84], [-12, -97], [-6, -91], [-3, -101], [0, -92], [3, -101], [6, -91], [12, -97], [10, -84]]), '#a0a088', { sd: 0.8, hd: 0.6, lw: 1.4 });
    c.restore();
  };
  if (wet) {
    swMirror(g, x, y, 130 * s, 150 * s, c => { c.scale(s, s); draw(c); }, 0.3);
    g.save(); g.translate(x, y); g.scale(s, s); swAbove(g, 0, () => draw(g)); swRipples(g, 0, 1, 36, 8, 0.55); g.restore();
  } else {
    g.save(); g.translate(x, y); g.scale(s, s); shadowBlob(g, 16, 2, 40, 10, 0.32);
    toon(g, rect(-30, -14, 60, 15), dark(col, 0.08), { sd: 0.8, hd: 0.5, lw: 1.4 }); g.translate(0, -26); draw(g); g.restore();
  }
};
// small shrine stone of Queen Maelis: eight-pointed star and offerings
SWAMP_DRAW.swampShrine = (g, x, y, s, R) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  shadowBlob(g, 10, 2, 22, 6, 0.3);
  const p = new Path2D(); p.moveTo(-11, 0); p.lineTo(-11, -22); p.arc(0, -22, 11, PI, 0); p.lineTo(11, 0); p.closePath();
  toon(g, p, '#8c8a7c', { sd: 1.4, hd: 0.8, lw: 1.4, detail: c => { c.fillStyle = 'rgba(160,200,230,0.55)'; c.fill(star(0, -20, 6.5, 0.42, 8)); c.strokeStyle = 'rgba(40,34,26,0.5)'; c.lineWidth = 1; c.stroke(star(0, -20, 6.5, 0.42, 8)); swMossDabs(c, -10, 10, -12, 0, 2, R); } });
  for (const cx of [-14, 13]) { toon(g, rrect(cx - 1.6, -6, 3.2, 6, 1), '#efe6cc', { sd: 0.3, hd: 0.2, lw: 0.9 }); glow(g, cx, -9, 9, '#ffcf7a', 0.5); flat(g, ellipse(cx, -8, 1, 2), '#ffe9a0', 0); }
  g.restore();
};
SWAMP_DRAW.swampBrazier = (g, x, y, s, R) => {
  shadowBlob(g, x + 4 * s, y + 1, 12 * s, 4 * s, 0.3);
  g.save(); g.globalCompositeOperation = 'lighter'; const gp = g.createRadialGradient(x, y, 0, x, y, 70 * s); gp.addColorStop(0, 'rgba(255,120,40,0.2)'); gp.addColorStop(1, 'rgba(255,120,40,0)'); g.translate(x, y); g.scale(1, 0.38); g.translate(-x, -y); g.fillStyle = gp; g.fillRect(x - 70 * s, y - 70 * s, 140 * s, 140 * s); g.restore();
  for (const dx of [-7, 0, 7]) { line(g, [[x + dx * s, y + (dx ? 0 : 2) * s], [x + dx * 0.3 * s, y - 16 * s]], OUT, 3.2 * s); line(g, [[x + dx * s, y + (dx ? 0 : 2) * s], [x + dx * 0.3 * s, y - 16 * s]], SWP.iron, 1.7 * s); }
  toon(g, poly([[x - 10 * s, y - 21 * s], [x + 10 * s, y - 21 * s], [x + 6 * s, y - 14 * s], [x - 6 * s, y - 14 * s]]), SWP.iron, { sd: 1, hd: 0.6, lw: 1.3 });
  glow(g, x, y - 28 * s, 42 * s, '#ff7a2a', 0.55);
  flat(g, blob([[x - 8 * s, y - 21 * s], [x - 5 * s, y - 30 * s], [x - 1 * s, y - 39 * s], [x + 3 * s, y - 30 * s], [x + 8 * s, y - 21 * s]], 0.7), '#ff9a30', 1.1, '#7a2a08');
  flat(g, blob([[x - 4 * s, y - 21 * s], [x, y - 32 * s], [x + 4 * s, y - 21 * s]], 0.7), '#ffe28a', 0);
};
SWAMP_DRAW.swampLantern = (g, x, y, s) => {
  shadowBlob(g, x + 4 * s, y + 1, 8 * s, 3 * s, 0.3);
  g.save(); g.globalCompositeOperation = 'lighter'; const gp = g.createRadialGradient(x + 10 * s, y, 0, x + 10 * s, y, 50 * s); gp.addColorStop(0, 'rgba(255,190,90,0.16)'); gp.addColorStop(1, 'rgba(255,190,90,0)'); g.translate(x, y); g.scale(1, 0.4); g.translate(-x, -y); g.fillStyle = gp; g.fillRect(x - 50 * s, y - 50 * s, 120 * s, 100 * s); g.restore();
  toon(g, rrect(x - 1.8 * s, y - 42 * s, 3.6 * s, 42 * s, 1), SWP.woodD, { sd: 0.5, hd: 0.3, lw: 1.2 });
  line(g, [[x, y - 40 * s], [x + 11 * s, y - 40 * s]], OUT, 3); line(g, [[x, y - 40 * s], [x + 11 * s, y - 40 * s]], SWP.woodD, 1.6);
  glow(g, x + 11 * s, y - 31 * s, 26 * s, '#ffb84a', 0.55);
  toon(g, rrect(x + 7.5 * s, y - 36 * s, 7 * s, 9 * s, 1.5), '#ffd27a', { sd: 0, hd: 0, lw: 1.2 });
  line(g, [[x + 11 * s, y - 40 * s], [x + 11 * s, y - 36 * s]], OUT, 1);
};
SWAMP_DRAW.swampBanner = (g, x, y, s, R, pal, o) => {
  pole(g, x, y - 56 * s, y, 2.6 * s);
  banner(g, x + 1, y - 55 * s, 21 * s, 31 * s, o.realm ? SWP.realm : SWP.morrow, { tail: true, wave: 1.2, trim: o.realm ? null : '#c8a040', emblem: o.realm ? null : (c, ex, ey) => swRaven(c, ex, ey, 0.62 * s) });
};
// tent of the Warden's host (default) or of House Morrow (o.morrow)
SWAMP_DRAW.swampTent = (g, x, y, s, R, pal, o) => {
  const col = o.morrow ? '#5e1a26' : R() < 0.5 ? '#c8b48a' : '#a89a72', flag = o.morrow ? SWP.raven : SWP.realm;
  g.save(); g.translate(x, y); g.scale(s * (o.flip ? -1 : 1), s);
  shadowBlob(g, 12, 3, 40, 10, 0.32);
  toon(g, poly([[-30, 0], [-6, -38], [24, -36], [40, -4], [34, 0]]), dark(col, 0.12), { sd: 0.6, hd: 0.3, lw: 1.5 });
  toon(g, poly([[-32, 0], [-6, -38], [18, 0]]), col, { sd: 2, hd: 1, lw: 1.6, detail: c => { c.strokeStyle = alpha(dark(col, 0.25), 0.6); c.lineWidth = 1; for (const k of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(-6, -38); c.lineTo(-7 + k * 46, 0); c.stroke(); } } });
  toon(g, poly([[-12, 0], [-6, -22], [0, 0]]), '#1e1610', { sd: 0, hd: 0, lw: 1.2 });
  pole(g, -6, -52, -36, 1.8);
  banner(g, -5, -51, 11, 8, flag, { tail: true, wave: 1, lw: 1 });
  if (o.morrow) line(g, [[-32, 0], [-40, 6]], SWP.woodD, 1.4);
  g.restore();
};
// long stone bridge (line item, roughly horizontal): flooded arches on the south face, paved deck, parapets with statues & lamps
SWAMP_DRAW.swampBridge = (g, x, y, s, R, pal, o) => {
  const { x1, y1, x2, y2 } = o, wd = o.w || 124, len = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1);
  const hl = len / 2, hw = wd / 2, face = o.face || 44, col = o.color || '#8f8b7b', spans = o.spans || Math.max(2, Math.round(len / 150)), sw = len / spans, pier = 30, Rn = rng(4242);
  g.save(); g.translate((x1 + x2) / 2, (y1 + y2) / 2); g.rotate(a);
  const fy0 = hw, fy1 = hw + face;
  // reflection & shadow on the water
  g.save(); g.globalAlpha = 0.3; g.fillStyle = '#0c1612'; g.fillRect(-hl, fy1 + 2, len, face * 0.6); g.restore();
  g.save(); g.strokeStyle = 'rgba(200,226,212,0.2)'; g.lineWidth = 1.2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-hl + 10, fy1 + 6 + i * 6); g.lineTo(hl - 10 - i * 30, fy1 + 6 + i * 6); g.stroke(); } g.restore();
  // arch openings (dark under-bridge shade over water) and the stone face around them
  const arches = new Path2D();
  for (let i = 0; i < spans; i++) { const cx = -hl + sw * (i + 0.5), aw = sw - pier; arches.moveTo(cx + aw / 2, fy1 + 1); arches.ellipse(cx, fy1 + 1, aw / 2, face - 10, 0, 0, PI, true); arches.closePath(); }
  g.save(); g.clip(arches); g.fillStyle = lg(g, 0, fy0, 0, fy1, [[0, '#0e1412'], [1, '#1c2a24']]); g.fillRect(-hl, fy0, len, face + 2);
  g.strokeStyle = 'rgba(190,220,206,0.25)'; g.lineWidth = 1; for (let i = 0; i < spans; i++) { const cx = -hl + sw * (i + 0.5); g.beginPath(); g.moveTo(cx - 30, fy1 - 4); g.lineTo(cx + 24, fy1 - 4); g.stroke(); } g.restore();
  const facePath = new Path2D(); facePath.rect(-hl, fy0, len, face); facePath.addPath(arches);
  g.save(); g.fillStyle = lg(g, 0, fy0, 0, fy1, [[0, light(col, 0.02)], [1, dark(col, 0.12)]]); g.fill(facePath, 'evenodd'); g.clip(facePath, 'evenodd');
  wallBricks(g, -hl, fy0, hl, fy1, { rowH: 9, bw: 20, seed: 21, tint: true }); swWetLine(g, -hl, hl, fy1 + 1, 22); swMossDabs(g, -hl, hl, fy0 + 6, fy1 - 4, Math.round(len / 30), Rn);
  g.strokeStyle = 'rgba(30,24,18,0.45)'; g.lineWidth = 1.4;
  for (let i = 0; i < spans; i++) { const cx = -hl + sw * (i + 0.5), aw = sw - pier; for (let k = 0; k <= 10; k++) { const t = PI + (k / 10) * PI; g.beginPath(); g.moveTo(cx + C(t) * aw / 2, fy1 + 1 + S(t) * (face - 10)); g.lineTo(cx + C(t) * (aw / 2 + 9), fy1 + 1 + S(t) * (face - 1)); g.stroke(); } }
  g.restore();
  g.lineWidth = 1.7; g.strokeStyle = OUT; g.strokeRect(-hl, fy0, len, face); g.stroke(arches);
  for (let i = 1; i < spans; i++) { const px = -hl + sw * i; toon(g, poly([[px - pier / 2, fy1 - 2], [px, fy1 + 12], [px + pier / 2, fy1 - 2]]), dark(col, 0.1), { sd: 0.6, hd: 0.4, lw: 1.3 }); swRipples(g, px, fy1 + 6, pier * 0.75, 4, 0.5); }
  // deck: worn flagstones
  toon(g, rect(-hl, -hw, len, wd), '#8c8674', { sd: 0, hd: 0, lw: 1.6, detail: c => {
    const stones = ['#928c7a', '#9c9682', '#857f6e', '#a29c8a'];
    c.fillStyle = '#5e5747'; c.fillRect(-hl, -hw, len, wd);
    for (let xx = -hl; xx < hl; xx += 13) for (let yy = -hw + (Math.floor((xx + hl) / 13) % 2) * 5; yy < hw; yy += 9 + Rn() * 6) {
      c.fillStyle = Rn() < 0.03 ? '#4e4836' : stones[Math.floor(Rn() * 4)]; c.beginPath(); c.roundRect(xx + 0.8, yy + 0.8, 11.4, 8, 2); c.fill(); c.fillStyle = 'rgba(255,250,230,0.09)'; c.fillRect(xx + 1.5, yy + 1.2, 9, 1.4);
    }
    c.fillStyle = 'rgba(40,34,24,0.12)'; c.fillRect(-hl, -hw * 0.45, len, wd * 0.9);
    swMossDabs(c, -hl, hl, -hw, hw, Math.round(len / 50), Rn);
  } });
  // far parapet (inner face + coping) and near parapet coping
  const parapet = (py, h, gapFrom, gapTo) => {
    const segs = gapFrom === undefined ? [[-hl, hl]] : [[-hl, gapFrom], [gapTo, hl]];
    for (const [a0, a1] of segs) { toon(g, rect(a0, py - h, a1 - a0, h), dark(col, 0.06), { sd: 0.4, hd: 0.4, lw: 1.4, detail: c => wallBricks(c, a0, py - h, a1, py, { rowH: 7, bw: 16, seed: 3 }) }); toon(g, rect(a0 - 2, py - h - 5, a1 - a0 + 4, 6), light(col, 0.08), { sd: 0.4, hd: 0.4, lw: 1.3 }); }
    if (gapFrom !== undefined) for (let k = 0; k < 4; k++) toon(g, ellipse(gapFrom + 10 + Rn() * (gapTo - gapFrom - 20), py + 6 + Rn() * 12, 4 + Rn() * 3, 2.6), dark(col, 0.04), { sd: 0.4, hd: 0.3, lw: 1 });
  };
  const gp = o.gap ?? 0.62;
  parapet(-hw + 2, 14, -hl + len * gp, -hl + len * gp + 56);
  toon(g, rect(-hl - 2, hw - 6, len + 4, 7), light(col, 0.06), { sd: 0.4, hd: 0.4, lw: 1.3 });
  // pedestals over the piers: statues on the far side, lamps on the near side
  for (let i = 1; i < spans; i++) {
    const px = -hl + sw * i;
    toon(g, rect(px - 9, -hw - 26, 18, 26), col, { sd: 0.8, hd: 0.5, lw: 1.3 });
    if (i % 2) { toon(g, poly([[px - 7, -hw - 26], [px - 6, -hw - 50], [px - 3, -hw - 56], [px + 3, -hw - 56], [px + 6, -hw - 50], [px + 7, -hw - 26]]), '#8e968a', { sd: 1, hd: 0.6, lw: 1.3 }); toon(g, circle(px, -hw - 61, 5), '#8e968a', { sd: 0.6, hd: 0.4, lw: 1.2 }); }
    else { line(g, [[px, -hw - 26], [px, -hw - 58]], OUT, 3.6); line(g, [[px, -hw - 26], [px, -hw - 58]], SWP.iron, 2); toon(g, rrect(px - 4, -hw - 66, 8, 9, 1.5), '#3a3020', { sd: 0, hd: 0, lw: 1.1 }); }
    toon(g, rect(px - 7, hw - 18, 14, 14), col, { sd: 0.6, hd: 0.4, lw: 1.2 });
  }
  // abutments
  for (const e of [-1, 1]) toon(g, poly([[e * hl, -hw - 8], [e * (hl + 22), -hw - 16], [e * (hl + 26), fy1 - 8], [e * hl, fy1]]), dark(col, 0.08), { sd: 0.8, hd: 0.5, lw: 1.4, detail: c => wallBricks(c, Math.min(e * hl, e * (hl + 26)), -hw - 20, Math.max(e * hl, e * (hl + 26)), fy1, { rowH: 9, bw: 14, seed: 8 }) });
  g.restore();
};
// the half-drowned cathedral: twin towers (one fallen), ember rose window, open great door, Morrow banners, steps into the bog
SWAMP_DRAW.swampCathedral = (g, x, y, s, R, pal, o) => {
  const Rn = rng(808);
  const draw = c => swCathedral(c, Rn, o);
  // reflection in the flooded close (masked to open water)
  swMirror(g, x, y + 16 * s, 560 * s, 720 * s, c => { c.translate(0, -16 * s); c.scale(s, s); swCathedral(c, rng(808), o); }, 0.3);
  g.save(); g.translate(x, y); g.scale(s, s); draw(g); g.restore();
};
function swCathedral(g, Rn, o) {
  const st = '#9c988b', stD = '#7a766b', stL = '#b2ae9f', roofL = '#5c6563', roofD = '#3e4745';
  shadowBlob(g, 30, 12, 300, 36, 0.36);
  const tiles = (c, x0, x1, y0, y1) => { c.strokeStyle = 'rgba(20,26,26,0.45)'; c.lineWidth = 1; for (let yy = y0; yy < y1; yy += 12) { c.beginPath(); c.moveTo(x0, yy); c.lineTo(x1, yy); c.stroke(); } };
  const band = (x0, x1, yy) => { toon(g, rect(x0 - 3, yy - 5, x1 - x0 + 6, 6), stL, { sd: 0.3, hd: 0.4, lw: 1.2 }); g.fillStyle = 'rgba(20,16,12,0.3)'; g.fillRect(x0, yy + 1, x1 - x0, 3); };
  const vine = (vx, y0, len) => { let px = vx, py = y0; g.lineCap = 'round'; for (let k = 0; k < len; k += 6) { const nx = px + (Rn() - 0.5) * 7, ny = py - 6; line(g, [[px, py], [nx, ny]], '#2e3e1c', 2.4); line(g, [[px, py], [nx, ny]], '#5a7a30', 1.3); if (Rn() < 0.6) flat(g, ellipse(nx + (Rn() < 0.5 ? -3 : 3), ny, 2.6, 1.6, Rn() * 3), Rn() < 0.5 ? '#6a8a38' : '#4e6e2a', 0.7); px = nx; py = ny; } };
  const sideDoor = cx => { const d = swPointed(new Path2D(), cx, 0, 26, 58); toon(g, swPointed(new Path2D(), cx, 0, 36, 64), stL, { sd: 0.6, hd: 0.4, lw: 1.3 }); toon(g, d, '#1c1410', { sd: 0, hd: 0, lw: 1.3 }); };
  // aisles, nave roof and flying buttresses (reaching above the map edge)
  toon(g, poly([[-112, -250], [-212, -206], [-212, -560], [-112, -604]]), roofD, { sd: 0.6, hd: 0.8, lw: 1.6, detail: c => tiles(c, -212, -112, -600, -206) });
  toon(g, poly([[112, -250], [212, -206], [212, -560], [112, -604]]), dark(roofD, 0.06), { sd: 0.6, hd: 0.4, lw: 1.6, detail: c => tiles(c, 112, 212, -600, -206) });
  toon(g, poly([[-112, -266], [0, -346], [0, -720], [-112, -640]]), roofL, { sd: 0.6, hd: 1, lw: 1.7, detail: c => { tiles(c, -112, 0, -720, -266); swMossDabs(c, -110, 0, -640, -300, 10, Rn); } });
  toon(g, poly([[0, -346], [112, -266], [112, -640], [0, -720]]), roofD, { sd: 0.6, hd: 0.4, lw: 1.7, detail: c => tiles(c, 0, 112, -720, -266) });
  toon(g, poly([[18, -430], [70, -400], [80, -470], [30, -500]]), '#1c1612', { sd: 0, hd: 0, lw: 1.3, detail: c => { for (let k = 0; k < 5; k++) line(c, [[24 + k * 12, -500 + k * 6], [30 + k * 12, -410 + k * 4]], '#5a4028', 3); } });
  for (const side of [-1, 1]) for (let k = 0; k < 3; k++) { const yy = -300 - k * 100; line(g, [[side * 206, yy + 40], [side * 160, yy - 10], [side * 114, yy - 30]], OUT, 9); line(g, [[side * 206, yy + 40], [side * 160, yy - 10], [side * 114, yy - 30]], side < 0 ? st : stD, 6); }
  const tower = (x0, x1, top, broken) => {
    const p = new Path2D(); p.moveTo(x0, 0); p.lineTo(x0, top);
    if (broken) [[0.1, 26], [0.22, 8], [0.35, 40], [0.5, 22], [0.62, 58], [0.76, 30], [0.9, 50], [1, 34]].forEach(([t, d]) => p.lineTo(x0 + (x1 - x0) * t, top + d)); else p.lineTo(x1, top);
    p.lineTo(x1, 0); p.closePath();
    if (broken) toon(g, poly([[x0 + 8, top + 30], [x1 - 8, top + 30], [x1 - 14, top + 70], [x0 + 14, top + 70]]), '#231c16', { sd: 0, hd: 0, lw: 1 });
    g.save(); g.fillStyle = lg(g, x0, 0, x1, 0, [[0, light(st, 0.06)], [0.5, st], [1, dark(st, 0.12)]]); g.fill(p); g.clip(p);
    wallBricks(g, x0, top - 10, x1, 0, { rowH: 11, bw: 20, seed: broken ? 5 : 6, tint: true }); swWetLine(g, x0, x1, 2, 46); swMossDabs(g, x0, x1, top + 20, -10, 14, Rn);
    g.restore(); g.lineWidth = 1.8; g.strokeStyle = OUT; g.lineJoin = 'round'; g.stroke(p);
    band(x0, x1, -150); band(x0, x1, -300); if (!broken) band(x0, x1, top + 8);
    for (const bx of [x0, x1]) toon(g, poly([[bx - 9, 4], [bx - 9, (broken ? -300 : top) + 30], [bx - 5, (broken ? -300 : top) + 20], [bx + 5, (broken ? -300 : top) + 20], [bx + 9, (broken ? -300 : top) + 30], [bx + 9, 4]]), bx === x0 ? stL : stD, { sd: 0.8, hd: 0.5, lw: 1.4 });
    sideDoor((x0 + x1) / 2);
  };
  // left tower: lit lancet, louvered belfry, corner pinnacles and the spire with its bent cross
  tower(-238, -112, -446, false);
  const lw1 = swPointed(new Path2D(), -175, -170, 26, 92); toon(g, lw1, '#1c1410', { sd: 0, hd: 0, lw: 1.4 }); g.save(); g.clip(lw1); glow(g, -175, -200, 34, '#ff7a2a', 0.42); g.restore(); line(g, [[-175, -258], [-175, -170]], st, 2.4);
  for (const bx of [-196, -154]) { const bp = swPointed(new Path2D(), bx, -320, 22, 96); toon(g, bp, '#1a1410', { sd: 0, hd: 0, lw: 1.3 }); g.save(); g.clip(bp); for (let yy = -406; yy < -320; yy += 9) line(g, [[bx - 12, yy], [bx + 12, yy + 4]], '#4a3a2a', 3); g.restore(); }
  for (const px of [-228, -122]) toon(g, poly([[px - 7, -456], [px, -500], [px + 7, -456]]), px < -175 ? stL : stD, { sd: 0.6, hd: 0.4, lw: 1.3 });
  toon(g, poly([[-232, -456], [-175, -648], [-118, -456]]), roofD, { sd: 1, hd: 0.6, lw: 1.7, detail: c => { c.fillStyle = alpha(roofL, 0.95); c.beginPath(); c.moveTo(-232, -456); c.lineTo(-175, -648); c.lineTo(-175, -456); c.closePath(); c.fill(); tiles(c, -240, -110, -650, -456); } });
  for (let k = 1; k < 8; k++) { const t = k / 8; toon(g, circle(-232 + 57 * t - 3, -456 - 192 * t, 3), roofL, { sd: 0.3, hd: 0.3, lw: 0.9 }); toon(g, circle(-118 - 57 * t + 3, -456 - 192 * t, 3), roofD, { sd: 0.3, hd: 0.2, lw: 0.9 }); }
  toon(g, poly([[-188, -540], [-175, -566], [-162, -540]]), stL, { sd: 0.4, hd: 0.3, lw: 1.1 });
  line(g, [[-175, -648], [-171, -676]], OUT, 4.4); line(g, [[-175, -648], [-171, -676]], SWP.iron, 2.4); line(g, [[-181, -666], [-163, -670]], OUT, 4); line(g, [[-181, -666], [-163, -670]], SWP.iron, 2.2);
  // right tower, fallen; a dead tree in the breach and rubble at its foot
  tower(112, 238, -330, true);
  const lw2 = swPointed(new Path2D(), 175, -170, 26, 92); toon(g, lw2, '#1c1410', { sd: 0, hd: 0, lw: 1.4 });
  g.save(); g.translate(150, -284); swDeadTree(g, 0, 0, 0.8, Rn, {}, false); g.restore();
  for (let k = 0; k < 8; k++) toon(g, rrect(214 + Rn() * 56, -8 + Rn() * 24, 16 + Rn() * 12, 11 + Rn() * 6, 2), k % 2 ? st : stD, { sd: 0.8, hd: 0.5, lw: 1.3 });
  // central facade with gable, crockets and a broken finial
  const fac = new Path2D(); fac.moveTo(-112, 0); fac.lineTo(-112, -270); fac.lineTo(0, -352); fac.lineTo(112, -270); fac.lineTo(112, 0); fac.closePath();
  g.save(); g.fillStyle = lg(g, -112, 0, 112, 0, [[0, light(st, 0.08)], [0.5, st], [1, dark(st, 0.06)]]); g.fill(fac); g.clip(fac);
  wallBricks(g, -112, -352, 112, 0, { rowH: 11, bw: 22, seed: 12, tint: true }); swWetLine(g, -112, 112, 2, 40); swMossDabs(g, -112, 112, -300, -10, 16, Rn);
  g.strokeStyle = '#2a201a'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(52, -318); g.lineTo(44, -296); g.lineTo(56, -282); g.lineTo(42, -262); g.lineTo(50, -248); g.stroke();
  g.restore(); g.lineWidth = 1.9; g.strokeStyle = OUT; g.stroke(fac);
  for (let k = 1; k < 7; k++) { const t = k / 7; toon(g, circle(-112 + 112 * t, -270 - 82 * t - 3, 3.4), stL, { sd: 0.4, hd: 0.3, lw: 1 }); toon(g, circle(112 - 112 * t, -270 - 82 * t - 3, 3.4), stD, { sd: 0.4, hd: 0.3, lw: 1 }); }
  line(g, [[0, -352], [0, -372]], OUT, 5); line(g, [[0, -352], [0, -372]], st, 3); line(g, [[-6, -364], [3, -366]], OUT, 4.4); line(g, [[-6, -364], [3, -366]], st, 2.6);
  band(-112, 112, -262);
  // rose window glowing with the Ember Crown's light
  const rc = -206, rr = 50;
  toon(g, circle(0, rc, rr + 9), stL, { sd: 1.4, hd: 0.8, lw: 1.8 });
  g.save(); const gl = g.createRadialGradient(0, rc, 4, 0, rc, rr); gl.addColorStop(0, '#fff0b0'); gl.addColorStop(0.35, '#ffb04a'); gl.addColorStop(0.75, '#e2602a'); gl.addColorStop(1, '#7a2016'); g.fillStyle = gl; g.beginPath(); g.arc(0, rc, rr, 0, PI * 2); g.fill(); g.restore();
  g.strokeStyle = '#3a2a22'; g.lineWidth = 3;
  for (let k = 0; k < 12; k++) { const t = (k / 12) * PI * 2; g.beginPath(); g.moveTo(C(t) * 12, rc + S(t) * 12); g.lineTo(C(t) * rr, rc + S(t) * rr); g.stroke(); }
  g.beginPath(); g.arc(0, rc, 12, 0, PI * 2); g.stroke(); g.beginPath(); g.arc(0, rc, rr * 0.66, 0, PI * 2); g.stroke();
  g.lineWidth = 2; for (let k = 0; k < 12; k++) { const t = ((k + 0.5) / 12) * PI * 2; g.beginPath(); g.arc(C(t) * rr * 0.83, rc + S(t) * rr * 0.83, 7, 0, PI * 2); g.stroke(); }
  g.lineWidth = 2; g.strokeStyle = OUT; g.beginPath(); g.arc(0, rc, rr, 0, PI * 2); g.stroke();
  glow(g, 0, rc, 150, '#ff7a2a', 0.32); glow(g, 0, rc, 60, '#ffc46a', 0.3);
  // arcade of niches with saints above the door
  for (let k = -4; k <= 4; k++) { const np = swPointed(new Path2D(), k * 22, -132, 14, 26); toon(g, np, '#231b16', { sd: 0, hd: 0, lw: 1.1 }); if (Math.abs(k) % 2 === 1) { toon(g, poly([[k * 22 - 4, -132], [k * 22 - 3, -146], [k * 22 + 3, -146], [k * 22 + 4, -132]]), '#8e968a', { sd: 0.4, hd: 0.3, lw: 0.9 }); toon(g, circle(k * 22, -149, 3), '#8e968a', { sd: 0.3, hd: 0.2, lw: 0.9 }); } }
  band(-112, 112, -128);
  // great door: archivolts, ember-lit nave beyond
  for (const [k, c2] of [[30, stD], [20, stL], [10, st]]) toon(g, swPointed(new Path2D(), 0, 0, 92 + k, 124 + k * 0.6), c2, { sd: 1, hd: 0.6, lw: 1.5 });
  const door = swPointed(new Path2D(), 0, 0, 92, 124);
  g.save(); g.clip(door); g.fillStyle = lg(g, 0, -124, 0, 0, [[0, '#140c08'], [0.55, '#3a160c'], [1, '#8a3412']]); g.fillRect(-50, -126, 100, 128); glow(g, 0, -8, 64, '#ff8a3a', 0.55);
  for (const cx of [-30, 30]) toon(g, rect(cx - 5, -100, 10, 100), '#2a1a12', { sd: 0, hd: 0.3, lw: 1 }); g.restore();
  g.lineWidth = 1.8; g.strokeStyle = OUT; g.stroke(door);
  // buttresses with pinnacles between the towers and the facade
  for (const bx of [-112, 112]) { toon(g, poly([[bx - 12, 6], [bx - 12, -250], [bx - 6, -268], [bx + 6, -268], [bx + 12, -250], [bx + 12, 6]]), bx < 0 ? stL : stD, { sd: 0.8, hd: 0.6, lw: 1.5, detail: c => { for (let yy = -40; yy > -250; yy -= 52) { c.fillStyle = 'rgba(30,24,18,0.25)'; c.fillRect(bx - 12, yy, 24, 4); } } }); toon(g, poly([[bx - 6, -268], [bx, -304], [bx + 6, -268]]), st, { sd: 0.5, hd: 0.4, lw: 1.3 }); }
  // banners of Morrow, climbing vines
  swHanging(g, -96, -262, 28, 118, SWP.morrow, true); swHanging(g, 68, -262, 28, 118, SWP.morrow, true);
  vine(-60, 0, 120); vine(-205, 0, 170); vine(130, 0, 150); vine(222, -10, 90);
  // podium and steps down into the water
  toon(g, rect(-266, -2, 532, 20), dark(st, 0.08), { sd: 0.6, hd: 0.5, lw: 1.6, detail: c => { wallBricks(c, -266, -2, 266, 18, { rowH: 10, bw: 24, seed: 2, tint: true }); swWetLine(c, -266, 266, 18, 14); } });
  toon(g, rect(-268, -6, 536, 6), stL, { sd: 0.4, hd: 0.4, lw: 1.4 });
  for (let k = 0; k < 4; k++) { const sy = -2 + k * 11, sw2 = 80 + k * 10; toon(g, rect(-sw2, sy, sw2 * 2, 6), stL, { sd: 0.3, hd: 0.4, lw: 1.3 }); toon(g, rect(-sw2, sy + 6, sw2 * 2, 5), dark(st, 0.1), { sd: 0.3, hd: 0.2, lw: 1.3 }); }
  g.save(); g.globalCompositeOperation = 'lighter'; const sp = g.createRadialGradient(0, 20, 0, 0, 20, 110); sp.addColorStop(0, 'rgba(255,130,50,0.3)'); sp.addColorStop(1, 'rgba(255,130,50,0)'); g.translate(0, 20); g.scale(1, 0.4); g.fillStyle = sp; g.fillRect(-110, -110, 220, 220); g.restore();
  for (const bx of [-110, 110]) SWAMP_DRAW.swampBrazier(g, bx, 28, 1.1, Rn);
}
// <<< swamp theme (Chapter III)

// ===== SNOW THEME START =====
// =====================================================================================
// SNOW THEME (Chapter II — Frostbound Pass). Painter passes, called from genmap.js when th.snow:
// snowGround -> snowRiver / snowLake -> snowCliff -> snowRoad -> snowBridge -> snowOccupy / snowScatter
// -> snowDeco (every item) -> snowAtmosphere. Snow structures are deco types prefixed 'snow' (see SNOW_CLEAR).
// Map options (level.map): snowCover (0..1, <1 shows bare earth), wind (radians), tracks, flakes, mist, scatter{}.
// =====================================================================================
const SNOW = { lights: [], smoke: [], M: {}, bare: () => 0, onRoad: () => false, lakes: [], lakeSnap: null };
const SN = {
  snow: '#eef3f8', snowL: '#ffffff', snowS: '#bccadc', snowD: '#93a6c1', ink: '#28304a',
  rock: '#7d8794', rockL: '#a6afbb', rockD: '#59626f', pine: '#2c5b4d', fir: '#27504c', bark: '#5c3e28', barkD: '#3b2818',
  straw: '#b59b63', ice: '#c9e8f5', iceM: '#97cbe2', iceD: '#5b98bb', water: '#1e4258', warm: '#ffc46a',
};
export const SNOW_CLEAR = {
  snowInn: 150, snowCabin: 92, snowStable: 104, snowWood: 40, snowLantern: 18, snowSign: 24, snowSled: 46, snowWagon: 60, snowCrates: 34,
  snowCairn: 30, snowWell: 46, snowFire: 34, snowBoulder: 40, snowDrift: 30, snowPalisade: 0, snowFence: 0,
  snowLogPile: 70, snowBanner: 22, snowTent: 70, snowPavilion: 100, snowRack: 34, snowCage: 40, snowFishHut: 50, snowDryRack: 36, snowBoat: 46, snowDock: 0,
  snowDwarfGate: 230, snowBastion: 70, snowCannon: 40, snowForge: 76, snowRails: 0, snowMineCart: 30, snowKegs: 30, snowChapel: 170, snowGrave: 50, snowMaelis: 40,
  snowWatchtower: 50, snowDebris: 80, snowAvalanche: 0, snowIceCave: 260, snowIceSpire: 46, snowBones: 80, snowRuin: 56, snowIsle: 0,
};
const snowRGB = h => { h = h.replace('#', ''); const v = parseInt(h, 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
const snowSS = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function snowCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function snowLine(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
function snowHash(x, y, k = 0) { let h = Math.imul((Math.round(x) * 73856093) ^ (Math.round(y) * 19349663) ^ (k * 83492791), 0x5bd1e995); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; }
function snowRamp(stops, t) { for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) { const [t0, a] = stops[i - 1], [t1, b] = stops[i], k = (t - t0) / (t1 - t0 || 1); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; } return stops[stops.length - 1][1]; }
function snowOffset(pts, off) { return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [p[0] - dy / l * off, p[1] + dx / l * off]; }); }
function snowResample(pts, step) { const out = [pts[0]]; let acc = 0; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], L = Math.hypot(x1 - x0, y1 - y0); let s = step - acc; while (s <= L) { out.push([x0 + (x1 - x0) * s / L, y0 + (y1 - y0) * s / L]); s += step; } acc = (acc + L) % step; } return out; }
// soft snow smudge without an outline (small accumulations at the foot of things)
function snowSoft(g, x, y, rx, ry, a = 0.95) { g.fillStyle = 'rgba(150,170,205,0.35)'; g.beginPath(); g.ellipse(x + rx * 0.12, y + ry * 0.3, rx, ry, 0, 0, PI * 2); g.fill(); g.fillStyle = `rgba(250,252,255,${a})`; g.beginPath(); g.ellipse(x, y, rx * 0.92, ry * 0.85, 0, 0, PI * 2); g.fill(); }
function snowBlobPts(x, y, r, k, R, sq = 0.7, j = 0.3) { const p = []; const a0 = R() * PI; for (let i = 0; i < k; i++) { const a = a0 + (i / k) * PI * 2 + (R() - 0.5) * 0.4; const rr = r * (1 - j / 2 + R() * j); p.push([x + C(a) * rr, y + S(a) * rr * sq]); } return p; }
export function snowLight(x, y, r, color = SN.warm, a = 0.5) { SNOW.lights.push({ x, y, r, color, a }); }
export function snowSmoke(x, y, s = 1) { SNOW.smoke.push({ x, y, s }); }
// cool blue contact shadow (snow is lit by the sky, so shadows read blue-violet)
export function snowShadow(g, x, y, rx, ry, a = 0.3) {
  g.save(); const gr = g.createRadialGradient(x, y, 0, x, y, rx);
  gr.addColorStop(0, `rgba(52,70,124,${a})`); gr.addColorStop(0.6, `rgba(64,84,138,${a * 0.5})`); gr.addColorStop(1, 'rgba(70,90,145,0)');
  g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, PI * 2); g.fill(); g.restore();
}
// toon snow mass: blue-violet shade crescent, white highlight, slate outline
function snowLump(g, path, o = {}) { toon(g, path, o.color || SN.snow, { sd: o.sd ?? 2.2, hd: o.hd ?? 1.2, lw: o.lw ?? 1.2, outline: o.outline || SN.ink, shade: o.shade || SN.snowS, light: SN.snowL, detail: o.detail }); }
// union of ellipses drawn as one toon silhouette (snowbanks, drifts, heaps)
function snowHeap(g, lumps, o = {}) {
  if (!lumps.length) return;
  const ol = new Path2D(), sh = new Path2D(), body = new Path2D(), hi = new Path2D();
  for (const [x, y, r, q = 0.62] of lumps) {
    ol.addPath(ellipse(x, y, r + 1.3, r * q + 1.3)); sh.addPath(ellipse(x, y, r, r * q));
    body.addPath(ellipse(x - r * 0.1, y - r * q * 0.22, r * 0.88, r * q * 0.72)); hi.addPath(ellipse(x - r * 0.32, y - r * q * 0.45, r * 0.38, r * q * 0.22));
  }
  g.fillStyle = o.ink || SN.ink; g.fill(ol);
  g.fillStyle = o.shade || SN.snowS; g.fill(sh);
  g.fillStyle = o.color || SN.snow; g.fill(body);
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill(hi);
}

// ---------------- ground: relief-shaded snowfield, first-snow earth, sastrugi, tracks, sparkle ----------------
export function snowGround(g, { M, R, N, W, H }) {
  SNOW.lights = []; SNOW.smoke = []; SNOW.M = M; SNOW.lakes = []; SNOW.lakeSnap = null;
  // 1. a soft height field lit from the upper-left; hollows turn blue, crests near white
  const lw = 480, lh = 270, cv = snowCanvas(lw, lh), cg = cv.getContext('2d'), id = cg.createImageData(lw, lh), d = id.data;
  const hgt = (x, y) => N.fbm(x / 760 + 3.7, y / 760 + 1.3, 3) + 0.12 * N.fbm(x / 230 + 11.1, y / 230 + 5.4, 2);
  const ramp = [[0, snowRGB('#a9b8d2')], [0.3, snowRGB('#c9d5e6')], [0.55, snowRGB('#e1e8f1')], [0.8, snowRGB('#f2f6fa')], [1, snowRGB('#fdfeff')]];
  const E = 20, relief = M.relief ?? 1;
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const wx = x * W / lw, wy = y * H / lh;
    const hx = (hgt(wx + E, wy) - hgt(wx - E, wy)) / (2 * E), hy = (hgt(wx, wy + E) - hgt(wx, wy - E)) / (2 * E);
    const b = Math.max(0, Math.min(1, 0.74 + (0.6 * hx + 0.8 * hy) * 300 * relief + (hgt(wx, wy) - 0.56) * 0.45));
    const c = snowRamp(ramp, b), i = (y * lw + x) * 4;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  cg.putImageData(id, 0, 0);
  g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(cv, 0, 0, W, H); g.restore();
  // 2. thin first snow: dry grass and earth show through in ragged patches (map.snowCover < 1)
  const cover = M.snowCover ?? 1;
  const bareN = (x, y) => N.fbm(x / 260 + 21.3, y / 260 + 7.9, 4) + (N.fbm(x / 40 + 3, y / 40 + 9, 2) - 0.5) * 0.14;
  const t0 = 0.42 + cover * 0.2;
  const bare = cover >= 1 ? () => 0 : (x, y) => snowSS(t0, t0 + 0.035, bareN(x, y));
  SNOW.bare = bare;
  if (cover < 1) {
    const ew = 1200, eh = 675, ec = snowCanvas(ew, eh), eg = ec.getContext('2d'), ed = eg.createImageData(ew, eh), q = ed.data;
    const gA = snowRGB('#b2a274'), gB = snowRGB('#8f845e'), gC = snowRGB('#71705a'), rim = snowRGB('#e9edf2');
    for (let y = 0; y < eh; y++) for (let x = 0; x < ew; x++) {
      const wx = x * W / ew, wy = y * H / eh, n = bareN(wx, wy); if (n < t0 - 0.01) continue;
      const a = snowSS(t0, t0 + 0.035, n), m = N.fbm(wx / 55 + 13, wy / 55 + 2, 2);
      let c = m > 0.5 ? snowRamp([[0, gA], [1, gB]], (m - 0.5) * 2) : snowRamp([[0, gC], [1, gA]], m * 2);
      const edge = 1 - snowSS(t0 + 0.02, t0 + 0.07, n); c = snowRamp([[0, c], [1, rim]], edge * 0.55);
      const i = (y * ew + x) * 4; q[i] = c[0]; q[i + 1] = c[1]; q[i + 2] = c[2]; q[i + 3] = a * 235;
    }
    eg.putImageData(ed, 0, 0);
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(ec, 0, 0, W, H); g.restore();
    g.lineCap = 'round';
    for (let i = 0; i < 26000; i++) {
      const x = R() * W, y = R() * H, a = bare(x, y); if (a < 0.02) continue;
      if (a > 0.7 && R() < 0.55) { g.strokeStyle = R() < 0.5 ? 'rgba(214,190,120,0.8)' : R() < 0.5 ? 'rgba(120,108,76,0.7)' : 'rgba(150,150,110,0.7)'; g.lineWidth = 1.1; const l = 3 + R() * 6, t = -PI / 2 + (R() - 0.5) * 1.1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + C(t) * l, y + S(t) * l); g.stroke(); }
      else { g.fillStyle = `rgba(250,252,255,${0.55 + R() * 0.4})`; g.beginPath(); g.ellipse(x, y, 0.9 + R() * (a < 0.7 ? 2.6 : 1.4), 0.7 + R() * 1.2, 0, 0, PI * 2); g.fill(); }
    }
  }
  // 3. map patches: trampled snow around camps (default), bare earth, glazed ice
  for (const p of M.patches || []) {
    const k = p.kind || 'trample', r = p.r || 120, sq = p.ry ?? 0.55, a0 = p.a ?? 0.5;
    const col = k === 'earth' ? '110,96,76' : k === 'ice' ? '160,206,232' : '150,156,170';
    g.save(); g.translate(p.x, p.y); g.scale(1, sq);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0, `rgba(${col},${a0})`); gr.addColorStop(0.65, `rgba(${col},${a0 * 0.6})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, PI * 2); g.fill(); g.restore();
    if (k === 'trample') for (let i = 0; i < r * 1.2; i++) { const a = R() * PI * 2, dd = Math.sqrt(R()) * r * 0.85; g.fillStyle = 'rgba(88,96,118,0.26)'; g.beginPath(); g.ellipse(p.x + C(a) * dd, p.y + S(a) * dd * sq, 2.2, 1.4, R() * PI, 0, PI * 2); g.fill(); }
  }
  // 4. wind-carved ripples (sastrugi): a bright crest over a blue lee shadow
  const wa = M.wind ?? -0.32, cw = C(wa), sw = S(wa);
  g.lineCap = 'round';
  for (let i = 0; i < 1500; i++) {
    const x = R() * W, y = R() * H, p = snowSS(0.47, 0.62, N.fbm(x / 380 + 5.5, y / 380 + 2.2, 3)) * (1 - bare(x, y));
    if (R() > p * 0.8) continue;
    const L = 16 + R() * 36, bend = 2 + R() * 5;
    const ax = x - cw * L / 2, ay = y - sw * L / 2, bx = x + cw * L / 2, by = y + sw * L / 2, qx = x + sw * bend, qy = y - cw * bend;
    g.strokeStyle = 'rgba(120,142,186,0.16)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(ax, ay + 2.6); g.quadraticCurveTo(qx, qy + 2.6, bx, by + 2.6); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(qx, qy, bx, by); g.stroke();
  }
  // 5. animal tracks wandering across the field (fox: single file, hare: bounding groups)
  for (let k = 0; k < (M.tracks ?? 6); k++) {
    let x = 300 + R() * (W - 600), y = 200 + R() * (H - 400), a = R() * PI * 2;
    const n = 30 + R() * 40, fox = R() < 0.5;
    for (let s = 0; s < n; s++) {
      a += (R() - 0.5) * 0.35; x += C(a) * (fox ? 10 : 18); y += S(a) * (fox ? 7 : 12);
      if (bare(x, y) > 0.3) continue;
      g.fillStyle = 'rgba(96,116,158,0.36)';
      if (fox) { const sd = s % 2 ? 1 : -1; g.beginPath(); g.ellipse(x - S(a) * 2.6 * sd, y + C(a) * 1.8 * sd, 1.9, 1.3, a, 0, PI * 2); g.fill(); }
      else if (s % 2 === 0) for (const [u, v] of [[0, -2.5], [0, 2.5], [5, -1.2], [8, 1.2]]) { g.beginPath(); g.ellipse(x + C(a) * u - S(a) * v, y + (S(a) * u + C(a) * v) * 0.7, 1.7, 1.2, a, 0, PI * 2); g.fill(); }
    }
  }
  // 6. sparkle
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 1800; i++) { const x = R() * W, y = R() * H; if (bare(x, y) > 0.3) continue; g.fillStyle = `rgba(255,255,255,${0.2 + R() * 0.5})`; g.fillRect(x, y, 1.1 + R(), 1.1 + R()); }
  g.restore();
}

// ---------------- frozen water ----------------
function snowCracks(g, x, y, R, n, len, spread = 1) {
  for (let k = 0; k < n; k++) {
    let px = x, py = y, a = R() * PI * 2; const pts = [[px, py]];
    for (let s = 0; s < len; s++) { a += (R() - 0.5) * 0.9; px += C(a) * (8 + R() * 10) * spread; py += S(a) * (5 + R() * 6) * spread; pts.push([px, py]); }
    g.strokeStyle = 'rgba(40,86,128,0.45)'; g.lineWidth = 1.6; snowLine(g, pts.map(([u, v]) => [u + 0.8, v + 1.2]));
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.1; snowLine(g, pts);
  }
}
export function snowRiver(g, pts, r, R, N) {
  const w = r.w || 90, n = pts.length;
  const wid = pts.map(([x, y], i) => w * (0.78 + 0.44 * N.fbm(x / 140 + 4.4, y / 140 + 1.7, 2)));
  const side = (k, f, jit = 0) => snowOffset(pts, 0).map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; const o = k * (wid[i] * f + jit * (N.fbm(p[0] / 40 + k * 3, p[1] / 40, 2) - 0.5)); return [p[0] - dy / l * o, p[1] + dx / l * o]; });
  const band = (f, jit) => { const L = side(1, f, jit), Rr = side(-1, f, jit).reverse(); return poly([...L, ...Rr]); };
  g.save(); g.lineJoin = 'round';
  // soft blue shadow under the far bank, then the snowy lips
  g.save(); g.translate(5, 8); g.fillStyle = 'rgba(60,82,136,0.2)'; g.fill(band(0.5, 0) ); g.restore();
  snowLump(g, band(0.5 + 16 / w, 14), { sd: 2.2, hd: 1, lw: 1.3 });
  // ice
  const ice = band(0.5, 4);
  toon(g, ice, SN.ice, { sd: 0, hd: 0, lw: 1.8, outline: SN.ink });
  g.save(); g.clip(ice);
  g.save(); g.translate(4, 7); g.strokeStyle = 'rgba(40,74,124,0.3)'; g.lineWidth = 12; g.stroke(band(0.5, 4)); g.restore();
  // open water: a dark channel that closes over where the ice has bridged it
  if (!r.frozen) {
    const open = pts.map(([x, y]) => snowSS(0.38, 0.55, N.fbm(x / 160 + 9.1, y / 160 + 3.3, 2)));
    const L = [], Rr = [];
    pts.forEach((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, o = wid[i] * 0.26 * open[i] + 0.01; const mx = (N.fbm(p[0] / 70, p[1] / 70 + 8, 2) - 0.5) * wid[i] * 0.3; L.push([p[0] - dy / l * (o + mx), p[1] + dx / l * (o + mx)]); Rr.push([p[0] + dy / l * (o - mx), p[1] - dx / l * (o - mx)]); });
    const ch = poly([...L, ...Rr.reverse()]);
    g.fillStyle = '#2a5a78'; g.fill(ch);
    g.save(); g.clip(ch); g.strokeStyle = SN.water; g.lineWidth = w * 0.3; snowLine(g, pts);
    g.strokeStyle = 'rgba(200,236,250,0.6)'; g.lineWidth = 1.5;
    for (let i = 2; i < n - 2; i += 2) { if (R() < 0.5 || open[i] < 0.5) continue; const [x, y] = pts[i], o = (R() - 0.5) * wid[i] * 0.2; g.beginPath(); g.moveTo(x - 8 + o, y + o * 0.3); g.quadraticCurveTo(x + o, y - 3 + o * 0.3, x + 8 + o, y + o * 0.3); g.stroke(); }
    g.restore();
    g.strokeStyle = 'rgba(240,250,255,0.9)'; g.lineWidth = 1.6; g.stroke(ch);
  }
  // cracks, wind-blown snow on the ice
  for (let i = 0; i < n; i += 5) { const [x, y] = pts[i], o = (R() < 0.5 ? -1 : 1) * wid[i] * (0.2 + R() * 0.2); snowCracks(g, x + o, y + o * 0.3, R, 1, 3, 0.6); }
  for (let i = 0; i < n; i += 3) { if (R() < 0.6) continue; const [x, y] = pts[i]; g.fillStyle = 'rgba(250,253,255,0.6)'; g.beginPath(); g.ellipse(x + (R() - 0.5) * wid[i] * 0.6, y + (R() - 0.5) * 8, 6 + R() * 12, 2 + R() * 3, R(), 0, PI * 2); g.fill(); }
  g.restore();
  // stones standing in the stream
  for (let i = 4; i < n - 4; i += 9) { if (R() < 0.55) continue; const [x, y] = pts[i]; const o = (R() - 0.5) * wid[i] * 0.7; const sx = x + o, sy = y + o * 0.3; toon(g, poly(snowBlobPts(sx, sy - 3, 6 + R() * 5, 6, R, 0.7)), SN.rock, { sd: 1.4, hd: 1, lw: 1.2, light: SN.rockL }); snowLump(g, ellipse(sx - 1, sy - 6, 4.5, 2.2), { sd: 0.3, hd: 0.2, lw: 0.9 }); }
  g.restore();
}
export function snowLake(g, pts, l, R, N) {
  const P = new Path2D(); pts.forEach(([x, y], i) => (i ? P.lineTo(x, y) : P.moveTo(x, y))); P.closePath();
  SNOW.lakes.push(P);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, rx = (Math.max(...xs) - Math.min(...xs)) / 2, ry = (Math.max(...ys) - Math.min(...ys)) / 2;
  g.save(); g.lineJoin = 'round';
  g.save(); g.translate(4, 7); g.strokeStyle = 'rgba(60,82,136,0.22)'; g.lineWidth = 40; g.stroke(P); g.restore();
  g.strokeStyle = '#f3f7fb'; g.lineWidth = 28; g.stroke(P);
  // ice: pale near the shore, deep clear blue in the middle
  g.fillStyle = SN.ice; g.fill(P);
  g.save(); g.clip(P);
  const gr = g.createRadialGradient(cx, cy, 10, cx, cy, Math.max(rx, ry) * 0.95);
  gr.addColorStop(0, l.open ? '#2f6f92' : '#6fb0d2'); gr.addColorStop(0.55, 'rgba(130,190,220,0.6)'); gr.addColorStop(1, 'rgba(180,222,240,0)');
  g.fillStyle = gr; g.fillRect(cx - rx - 50, cy - ry - 50, rx * 2 + 100, ry * 2 + 100);
  // glossy diagonal sheen bands
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) { const x = cx - rx + R() * rx * 2, y = cy - ry + R() * ry * 2, L = 60 + R() * 140; g.strokeStyle = `rgba(255,255,255,${0.06 + R() * 0.08})`; g.lineWidth = 8 + R() * 18; g.beginPath(); g.moveTo(x - L * 0.5, y + L * 0.28); g.lineTo(x + L * 0.5, y - L * 0.28); g.stroke(); }
  g.restore();
  // the snowy shore casts a blue shadow onto the lower ice
  g.save(); g.translate(5, 9); g.strokeStyle = 'rgba(40,74,124,0.32)'; g.lineWidth = 22; g.stroke(P); g.restore();
  // drifted snow lying on the ice in soft, wind-shaped patches (the glassy middle stays clear)
  for (let i = 0; i < (l.drifts ?? 16); i++) {
    const a = R() * PI * 2, d = 0.45 + R() * 0.55, x = cx + C(a) * rx * d, y = cy + S(a) * ry * d, L = 30 + R() * 70;
    const pp = poly(snowBlobPts(x, y, L, 10, R, 0.28, 0.5));
    g.save(); g.filter = 'blur(2px)'; g.translate(2, 3); g.fillStyle = 'rgba(96,140,186,0.16)'; g.fill(pp); g.translate(-2, -3); g.fillStyle = 'rgba(246,250,253,0.62)'; g.fill(pp); g.restore();
  }
  // wind-blown snow dust drifting over the ice
  for (let i = 0; i < 70; i++) { const x = cx - rx + R() * rx * 2, y = cy - ry + R() * ry * 2, L = 30 + R() * 70; g.strokeStyle = `rgba(250,253,255,${0.25 + R() * 0.3})`; g.lineWidth = 2 + R() * 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + L * 0.5, y - 6, x + L, y + 2); g.stroke(); }
  // pressure cracks
  for (let i = 0; i < (l.cracks ?? 7); i++) snowCracks(g, cx + (R() - 0.5) * rx * 1.4, cy + (R() - 0.5) * ry * 1.2, R, 2 + Math.floor(R() * 2), 5 + Math.floor(R() * 5));
  // fishing holes with dark water and broken ice rims
  for (const [hx, hy, hr = 14] of l.holes || []) {
    snowShadow(g, hx + 3, hy + 3, hr * 1.6, hr * 0.8, 0.25);
    toon(g, ellipse(hx, hy, hr * 1.25, hr * 0.62), '#e9f3f8', { sd: 0.8, hd: 0.6, lw: 1.2, outline: SN.ink, shade: '#b5d3e4' });
    flat(g, ellipse(hx, hy + 1, hr, hr * 0.46), SN.water, 1.2, SN.ink);
    g.strokeStyle = 'rgba(160,214,240,0.7)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(hx - hr * 0.1, hy, hr * 0.55, hr * 0.18, 0, PI * 1.1, PI * 1.9); g.stroke();
  }
  g.restore();
  g.strokeStyle = SN.ink; g.lineWidth = 2; g.stroke(P);
  g.restore();
  // snow drifted against the shore in uneven runs, frozen reeds and a few stones
  const shore = snowResample(pts, 5), drift = [], out = (x, y) => { const ox = (x - cx) / (rx || 1), oy = (y - cy) / (ry || 1), dl = Math.hypot(ox, oy) || 1; return [ox / dl, oy / dl]; };
  for (const [x, y] of shore) {
    const n = N.fbm(x / 90 + 31, y / 90 + 17, 2); if (n < 0.45) continue;
    const [ux, uy] = out(x, y); drift.push([x + ux * 4, y + uy * 3, 5 + (n - 0.45) * 36, 0.55]);
  }
  snowHeap(g, drift);
  for (let i = 0; i < shore.length; i += 6) {
    const [x, y] = shore[i], n2 = N.fbm(x / 60 + 3, y / 60 + 9, 2), [ux, uy] = out(x, y);
    if (n2 > 0.56 && R() < 0.7) snowReeds(g, x + ux * 8 + (R() - 0.5) * 6, y + uy * 6, 0.85 + R() * 0.35, R);
    else if (n2 < 0.36 && R() < 0.3) { const sx = x + ux * 10, sy = y + uy * 7; toon(g, poly(snowBlobPts(sx, sy - 3, 6 + R() * 6, 6, R, 0.7)), SN.rock, { sd: 1.4, hd: 1, lw: 1.2, light: SN.rockL }); snowLump(g, ellipse(sx - 1, sy - 7, 5, 2.2), { sd: 0.3, hd: 0.2, lw: 0.9 }); }
  }
  // keep a copy of the finished ice so roads crossing it can restore clean ice beside their lanes
  const snap = snowCanvas(g.canvas.width, g.canvas.height); snap.getContext('2d').drawImage(g.canvas, 0, 0); SNOW.lakeSnap = snap;
}
function snowReeds(g, x, y, s, R) {
  for (let i = 0; i < 5; i++) { const rx = x + (i - 2) * 3 * s, h = (12 + R() * 10) * s, lean = (R() - 0.5) * 5; line(g, [[rx, y], [rx + lean, y - h]], OUT, 2.4); line(g, [[rx, y], [rx + lean, y - h]], '#a08a5a', 1.2); if (R() < 0.5) toon(g, rrect(rx + lean - 1.6 * s, y - h - 1, 3.2 * s, 6 * s, 1.5), '#6a4a2a', { sd: 0.4, hd: 0.2, lw: 1 }); }
  snowHeap(g, [[x, y + 1, 7 * s]]);
}

// ---------------- cliffs: faceted rock under a scalloped snow cornice, icicles, talus at the foot ----------------
export function snowCliff(g, pts, c, R, th) {
  const h0 = c.h || 34, col = c.color || SN.rock, ink = '#262a36';
  const sm = (x, k, p = 70) => { const a = Math.floor(x / p), t = x / p - a, u = t * t * (3 - 2 * t); return snowHash(a, k, 4) * (1 - u) + snowHash(a + 1, k, 4) * u; };
  // resample the crest every ~6px; the face tapers to nothing at both ends
  const crest = snowResample(pts, 6), xa = crest[0][0], xb = crest[crest.length - 1][0], span = Math.abs(xb - xa) || 1;
  const hAt = x => h0 * (0.7 + 0.6 * sm(x, 9, 160)) * Math.min(1, Math.min(Math.abs(x - xa), Math.abs(xb - x)) / Math.min(90, span * 0.3) * 0.8 + 0.2);
  // blue shadow pooled at the foot
  g.save(); g.globalAlpha = 0.28; g.strokeStyle = '#2e4078'; g.lineWidth = 26; g.lineCap = 'round'; snowLine(g, crest.map(([x, y]) => [x + 8, y + hAt(x) + 12])); g.restore();
  // rock facets: irregular widths and drops, each split into a lit and a shaded face along a slanted ridge
  const blocks = [];
  for (let i = 0; i < crest.length - 1;) {
    let k = Math.min(crest.length - 1, i + 5 + Math.floor(snowHash(crest[i][0], crest[i][1], 6) * 7));
    if (crest.length - 1 - k < 4) k = crest.length - 1;
    blocks.push([i, k]); i = k;
  }
  const order = blocks.map((b, i) => [b, snowHash(i, b[0], 31)]).sort((p, q) => p[1] - q[1]).map(p => p[0]);
  for (const [a, b] of order) {
    const seg = crest.slice(a, b + 1), m = seg.length, x0 = seg[0][0], x1 = seg[m - 1][0], wd = x1 - x0;
    const v = snowHash(x0, 7, 2), hh = hAt((x0 + x1) / 2) * (v < 0.18 ? 1.22 : 0.74 + v * 0.36);
    const pk = 0.25 + snowHash(x1, 3, 3) * 0.5; // where the facet's lowest point sits
    const top = seg.map(([x, y], q) => [x + (q === 0 ? -2 : q === m - 1 ? 2 : 0), y + 2]);
    const bot = [];
    for (let q = m - 1; q >= 0; q--) { const [x, y] = seg[q], u = q / (m - 1), d = Math.abs(u - pk) / Math.max(pk, 1 - pk); bot.push([x + (q === 0 ? -2 : q === m - 1 ? 2 : 0), y + hh * (1 - 0.17 * d * d) + (snowHash(x, y, 5) - 0.5) * 3]); }
    const P = poly([...top, ...bot]);
    const f = snowHash(x0, seg[0][1], 8), base = f < 0.33 ? light(col, 0.07) : f < 0.7 ? col : mix(col, '#7a7468', 0.3);
    const ym = (seg[0][1] + seg[m - 1][1]) / 2, rx = x0 + wd * pk, rt = rx + wd * (snowHash(x0, 4, 9) - 0.3) * 0.3;
    toon(g, P, base, { sd: 2, hd: 1.4, lw: 1.5, outline: ink, light: light(base, 0.14), shade: dark(base, 0.12), detail: cg => {
      cg.fillStyle = alpha(dark(base, 0.2), 0.9); cg.beginPath(); cg.moveTo(rt, ym - 30); cg.lineTo(x1 + 8, ym - 30); cg.lineTo(x1 + 8, ym + hh + 30); cg.lineTo(rx, ym + hh + 30); cg.lineTo(rx, ym + hh); cg.closePath(); cg.fill();
      cg.fillStyle = alpha(light(base, 0.16), 0.75); cg.beginPath(); cg.moveTo(x0 - 6, ym - 10); cg.lineTo(rt - 2, ym - 10); cg.lineTo(x0 + (rt - x0) * 0.35, ym + hh * 0.42); cg.lineTo(x0 - 6, ym + hh * 0.55); cg.closePath(); cg.fill();
      cg.strokeStyle = alpha(ink, 0.5); cg.lineWidth = 1.2; cg.beginPath(); cg.moveTo(rt, ym - 4); cg.lineTo(rx, ym + hh); cg.stroke();
      if (snowHash(x0, 1, 17) < 0.6) { const yy = ym + hh * (0.38 + snowHash(x0, 2, 18) * 0.3); cg.beginPath(); cg.moveTo(x0 - 2, yy); cg.lineTo(x0 + wd * 0.4, yy + 3 + snowHash(x0, 5, 19) * 3); cg.lineTo(x1 + 2, yy - 2); cg.stroke(); }
    } });
    // snow caught on a ledge part-way down the taller faces
    if (hh > 36 && snowHash(x1, 9, 21) < 0.35) { const yy = ym + hh * (0.4 + snowHash(x1, 3, 22) * 0.22); snowHeap(g, [[x0 + wd * 0.3, yy, Math.min(14, wd * 0.22), 0.34], [x0 + wd * 0.5, yy + 1, Math.min(11, wd * 0.18), 0.34]]); }
  }
  // icicles in small clusters under the cornice
  for (let k = 1; k < crest.length - 1; k++) {
    if (sm(crest[k][0], 12, 50) < 0.55 || snowHash(crest[k][0], crest[k][1], 12) < 0.45) continue;
    const [x, y] = crest[k], L = 5 + snowHash(x, 5, 13) * h0 * 0.38;
    toon(g, poly([[x - 2.4, y + 6], [x + 2.4, y + 6], [x + 0.3, y + 6 + L]]), '#d8f1fc', { sd: 0.4, hd: 0.6, lw: 1, outline: '#3a5a7a', light: '#ffffff' });
  }
  // cornice: scalloped, outlined lower lip; its top fades into the snowfield above (no hard edge)
  const lips = [];
  for (let k = 0; k < crest.length; k += 3) { const [x, y] = crest[k], n = sm(x, 15, 46), r = 9 + n * 9 + snowHash(x, y, 23) * 3; lips.push([x, y - 2 + n * 6, r, 0.5]); }
  const oc = snowCanvas(2400, 1350), og = oc.getContext('2d');
  snowHeap(og, lips);
  og.globalCompositeOperation = 'destination-out'; og.filter = 'blur(3px)'; og.lineCap = 'round'; og.lineJoin = 'round'; og.strokeStyle = '#000'; og.lineWidth = 20;
  snowLine(og, crest.map(([x, y]) => [x, y - 12]));
  g.drawImage(oc, 0, 0);
  // talus and drifted snow at the foot
  const foot = [];
  for (let k = 0; k < crest.length; k += 2) {
    const [x, y] = crest[k], yb = y + hAt(x);
    if (snowHash(x, yb, 16) < 0.22) toon(g, poly(snowBlobPts(x + (R() - 0.5) * 8, yb + 6, 5 + R() * 6, 6, R)), '#7a8290', { sd: 1, hd: 0.7, lw: 1.1, outline: ink });
    if (R() < 0.6) foot.push([x + (R() - 0.5) * 10, yb + 6, 7 + R() * 11, 0.5]);
  }
  snowHeap(g, foot);
}

// ---------------- roads: trodden slush between snowy margins, wheel ruts, ploughed banks ----------------
export function snowRoad(g, roadPolys, R, N, M) {
  const W = 2400, H = 1350;
  const mk = snowCanvas(W / 4, H / 4), mg = mk.getContext('2d'); mg.scale(0.25, 0.25); mg.lineCap = 'round'; mg.lineJoin = 'round'; mg.strokeStyle = '#fff';
  for (const rp of roadPolys) { mg.lineWidth = rp.w - 4; snowLine(mg, rp.pts); }
  const md = mg.getImageData(0, 0, W / 4, H / 4).data;
  const onRoad = (x, y) => { const xi = Math.floor(x / 4), yi = Math.floor(y / 4); if (xi < 0 || yi < 0 || xi >= W / 4 || yi >= H / 4) return false; return md[(yi * (W / 4) + xi) * 4] > 100; };
  SNOW.onRoad = onRoad;
  // where paths merge they share one track: mark points already covered by an earlier road so details are drawn once
  const dc = snowCanvas(W / 2, H / 2), dg = dc.getContext('2d'); dg.scale(0.5, 0.5); dg.lineCap = 'round'; dg.lineJoin = 'round'; dg.strokeStyle = '#fff'; dg.lineWidth = 44;
  const dup = roadPolys.map(rp => {
    const dd = dg.getImageData(0, 0, W / 2, H / 2).data;
    const d = rp.pts.map(([x, y]) => { const xi = Math.floor(x / 2), yi = Math.floor(y / 2); return xi >= 0 && yi >= 0 && xi < W / 2 && yi < H / 2 && dd[(yi * (W / 2) + xi) * 4] > 100; });
    snowLine(dg, rp.pts); return d;
  });
  const runs = k => { const out = []; let cur = []; roadPolys[k].pts.forEach((p, i) => { if (dup[k][i]) { if (cur.length > 1) out.push(cur); cur = []; } else cur.push(p); }); if (cur.length > 1) out.push(cur); return out; };
  const cv = snowCanvas(W, H), r = cv.getContext('2d');
  r.lineCap = 'round'; r.lineJoin = 'round';
  // 1. surface: snowy margins, packed grey-brown snow, two muddy wheel tracks and a churned middle
  for (const rp of roadPolys) { r.strokeStyle = M.roadEdge || '#d6dbe3'; r.lineWidth = rp.w; snowLine(r, rp.pts); }
  r.filter = 'blur(7px)';
  for (const rp of roadPolys) { r.strokeStyle = M.road || '#ab9d8c'; r.lineWidth = rp.w * (rp.deco ? 0.5 : 0.74); snowLine(r, rp.pts); }
  r.filter = 'blur(3px)';
  roadPolys.forEach((rp, k) => {
    if (rp.deco) return;
    for (const run of runs(k)) {
      for (const off of [-rp.w * 0.2, rp.w * 0.2]) { r.strokeStyle = M.track || 'rgba(112,94,76,0.75)'; r.lineWidth = rp.w * 0.17; snowLine(r, snowOffset(run, off)); }
      r.strokeStyle = 'rgba(150,136,120,0.6)'; r.lineWidth = rp.w * 0.12; snowLine(r, run);
    }
  });
  r.filter = 'none';
  // mottling: clumps of snow, wet dark patches, grit
  roadPolys.forEach((rp, k) => {
    const pts = rp.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      if (dup[k][i]) continue;
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L, ang = Math.atan2(uy, ux);
      for (let s = 0; s < L; s += 4) {
        const x = x1 + ux * s, y = y1 + uy * s;
        for (let q = 0; q < 2; q++) {
          const off = (R() - 0.5) * rp.w * 0.95, px = x - uy * off, py = y + ux * off, edge = Math.abs(off) / (rp.w / 2);
          const n = N.fbm(px / 55 + 9, py / 55 + 4, 2);
          if (R() < 0.35) { r.fillStyle = n + edge * 0.25 > 0.62 ? 'rgba(240,244,250,0.6)' : n < 0.42 ? 'rgba(96,80,64,0.22)' : 'rgba(176,160,140,0.25)'; r.beginPath(); r.ellipse(px, py, 2 + R() * 6, 1.4 + R() * 2.6, ang, 0, PI * 2); r.fill(); }
          else if (R() < 0.12) { r.fillStyle = R() < 0.6 ? 'rgba(70,58,48,0.55)' : 'rgba(255,255,255,0.7)'; r.beginPath(); r.arc(px, py, 0.8 + R() * 1.1, 0, PI * 2); r.fill(); }
        }
      }
    }
  });
  // 2. wheel ruts (wet mud with an icy glint), boot prints along the middle
  roadPolys.forEach((rp, k) => {
    if (rp.deco) return;
    for (const run of runs(k)) for (const off of [-rp.w * 0.19, rp.w * 0.19]) {
      const pts = snowOffset(run, off).map(([x, y]) => [x + (N.fbm(x / 70 + off * 0.1, y / 70 + 2, 2) - 0.5) * 6, y + (N.fbm(x / 70 + 7, y / 70 + off * 0.1, 2) - 0.5) * 5]);
      r.strokeStyle = 'rgba(82,66,52,0.42)'; r.lineWidth = 5; snowLine(r, pts);
      r.strokeStyle = 'rgba(60,46,36,0.3)'; r.lineWidth = 2; snowLine(r, pts.map(([x, y]) => [x + 0.5, y + 1]));
      r.strokeStyle = 'rgba(232,242,252,0.6)'; r.lineWidth = 1.1; snowLine(r, pts.map(([x, y]) => [x - 1.2, y - 2.2]));
    }
    const pts = rp.pts;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L;
      if (dup[k][i] || N.fbm(x1 / 200, y1 / 200 + 30, 2) < 0.5) continue;
      for (let s = 0, q = 0; s < L; s += 7, q++) { const sd = q % 2 ? 1 : -1, x = x1 + ux * s - uy * sd * 4, y = y1 + uy * s + ux * sd * 4; r.fillStyle = 'rgba(70,56,44,0.28)'; r.beginPath(); r.ellipse(x, y, 2.4, 1.3, Math.atan2(uy, ux), 0, PI * 2); r.fill(); }
    }
  });
  // 3. a few glazed puddles
  for (let i = 0; i < 26; i++) {
    const k = Math.floor(R() * roadPolys.length), rp = roadPolys[k]; if (!rp || rp.deco) continue;
    const j = Math.floor(R() * rp.pts.length), p = rp.pts[j]; if (!p || dup[k][j]) continue;
    const x = p[0] + (R() - 0.5) * rp.w * 0.4, y = p[1] + (R() - 0.5) * rp.w * 0.25, a = 7 + R() * 10;
    r.fillStyle = 'rgba(150,196,222,0.5)'; r.beginPath(); r.ellipse(x, y, a, a * 0.42, 0, 0, PI * 2); r.fill();
    r.strokeStyle = 'rgba(255,255,255,0.7)'; r.lineWidth = 1.2; r.beginPath(); r.ellipse(x - a * 0.15, y - 1, a * 0.6, a * 0.18, 0, PI * 1.05, PI * 1.85); r.stroke();
  }
  // keep only the road surface (slightly feathered edge); all roads go into one mask so a single composite keeps every road
  const rm = snowCanvas(W, H), rmg = rm.getContext('2d'); rmg.lineCap = 'round'; rmg.lineJoin = 'round'; rmg.strokeStyle = '#fff'; rmg.filter = 'blur(1.5px)';
  for (const rp of roadPolys) { rmg.lineWidth = rp.w; snowLine(rmg, rp.pts); }
  r.globalCompositeOperation = 'destination-in'; r.drawImage(rm, 0, 0); r.globalCompositeOperation = 'source-over';
  // ice roads: over a frozen lake the way becomes a packed-snow lane on the ice (the mud fades out before the shore)
  const lk = snowCanvas(W, H), lc = lk.getContext('2d'); lc.fillStyle = '#fff'; for (const P of SNOW.lakes) lc.fill(P);
  const onIce = (x, y) => SNOW.lakes.some(P => lc.isPointInPath(P, x, y));
  if (SNOW.lakes.length && SNOW.lakeSnap) {
    // wipe the generic road, shoulder and verge tufts off the ice: repaint the saved ice in a band around each road
    const k = g.canvas.width / W, cl = snowCanvas(g.canvas.width, g.canvas.height), clg = cl.getContext('2d');
    clg.scale(k, k); clg.lineCap = 'round'; clg.lineJoin = 'round'; clg.strokeStyle = '#fff';
    for (const rp of roadPolys) { clg.lineWidth = rp.w + 80; snowLine(clg, rp.pts); }
    clg.globalCompositeOperation = 'destination-in'; clg.drawImage(lk, 0, 0);
    clg.setTransform(1, 0, 0, 1, 0, 0); clg.globalCompositeOperation = 'source-in'; clg.drawImage(SNOW.lakeSnap, 0, 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(cl, 0, 0); g.restore();
  }
  if (SNOW.lakes.length) {
    const lw = snowCanvas(W, H), lwg = lw.getContext('2d'); lwg.fillStyle = '#fff'; lwg.strokeStyle = '#fff'; lwg.lineWidth = 50; lwg.lineJoin = 'round';
    for (const P of SNOW.lakes) { lwg.fill(P); lwg.stroke(P); }
    r.globalCompositeOperation = 'destination-out'; r.filter = 'blur(12px)'; r.drawImage(lw, 0, 0); r.filter = 'none'; r.globalCompositeOperation = 'source-over';
    const ic = snowCanvas(W, H), ir = ic.getContext('2d'); ir.lineCap = 'round'; ir.lineJoin = 'round';
    ir.filter = 'blur(4px)';
    for (const rp of roadPolys) { ir.strokeStyle = 'rgba(234,239,246,0.96)'; ir.lineWidth = rp.w * 0.94; snowLine(ir, rp.pts); }
    ir.filter = 'blur(2px)';
    roadPolys.forEach((rp, k) => { for (const run of runs(k)) for (const off of [-rp.w * 0.19, rp.w * 0.19]) { ir.strokeStyle = 'rgba(168,184,206,0.45)'; ir.lineWidth = rp.w * 0.12; snowLine(ir, snowOffset(run, off)); } });
    ir.filter = 'none';
    for (const rp of roadPolys) for (let i = 0; i < rp.pts.length; i += 3) { const [x, y] = rp.pts[i]; if (R() < 0.5) continue; ir.strokeStyle = 'rgba(120,150,190,0.3)'; ir.lineWidth = 1; ir.beginPath(); ir.moveTo(x + (R() - 0.5) * rp.w * 0.8, y + (R() - 0.5) * 20); ir.lineTo(x + (R() - 0.5) * 40, y + (R() - 0.5) * 20); ir.stroke(); }
    ir.globalCompositeOperation = 'destination-in'; ir.filter = 'blur(8px)'; ir.drawImage(lw, 0, 0); ir.filter = 'none'; ir.drawImage(rm, 0, 0);
    r.drawImage(ic, 0, 0);
  }
  g.drawImage(cv, 0, 0);
  // 4. ploughed snowbanks on both shoulders, drawn as one lumpy silhouette, with dry stalks poking out (low windrows on the ice)
  const lumps = [], stalks = [];
  for (const rp of roadPolys) {
    for (const sd of [-1, 1]) {
      const off = snowResample(snowOffset(rp.pts, sd * (rp.w / 2 + 7)), 3), offI = SNOW.lakes.length ? snowResample(snowOffset(rp.pts, sd * (rp.w / 2 + 3)), 3) : [];
      for (const [x, y] of offI) if (!onRoad(x, y) && onIce(x, y)) lumps.push([x, y, 4 + N.fbm(x / 80 + 50 + sd * 13, y / 80 + 20, 2) * 7 + (N.fbm(x / 16 + 3, y / 16 + sd, 1) - 0.5) * 3, 0.6]);
      for (let i = 0; i < off.length; i++) {
        const [x, y] = off[i], n = N.fbm(x / 80 + 50 + sd * 13, y / 80 + 20, 2);
        if (n < 0.43 || onRoad(x, y) || (SNOW.lakes.length && onIce(x, y))) continue;
        const rr = (rp.deco ? 4 : 5) + (n - 0.43) * 26 + (N.fbm(x / 16 + 3, y / 16 + sd, 1) - 0.5) * 4;
        lumps.push([x, y, Math.max(3, rr), 0.7]);
        if (R() < 0.025) stalks.push([x + (R() - 0.5) * rr, y - rr * 0.3]);
      }
    }
  }
  snowHeap(g, lumps);
  for (const [x, y] of stalks) snowTuft(g, x, y, 0.8, R, 0.2, true);
  // marker poles with red rags along roads that cross the ice
  if (SNOW.lakes.length) roadPolys.forEach((rp, k) => {
    if (rp.deco) return;
    for (const run of runs(k)) for (const sd of [-1, 1]) { const off = snowResample(snowOffset(run, sd * (rp.w / 2 + 14)), 74); for (const [x, y] of off) if (onIce(x, y) && !onRoad(x, y)) snowStake(g, x, y, R); }
  });
}
function snowStake(g, x, y, R) {
  snowShadow(g, x + 4, y + 1, 7, 2.2, 0.25);
  line(g, [[x, y], [x + 1, y - 22]], OUT, 3.4); line(g, [[x, y], [x + 1, y - 22]], '#7a5232', 1.8);
  toon(g, poly([[x + 1, y - 21], [x + 9, y - 19 + (R() - 0.5) * 2], [x + 1, y - 15]]), '#c8303a', { sd: 0.3, hd: 0.3, lw: 0.9 });
  snowSoft(g, x, y + 0.5, 5, 1.6);
}

// ---------------- bridges: timber deck dusted with snow ----------------
export function snowBridge(g, b, R) {
  g.save(); g.translate(b.x, b.y); g.rotate(b.ang || 0);
  const len = b.len || 150, bw = b.w || 96;
  snowShadow(g, 6, bw * 0.5, len * 0.6, 18, 0.42);
  // stone abutments at both ends
  for (const ex of [-1, 1]) toon(g, poly(snowBlobPts(ex * (len / 2 - 14), bw * 0.42, bw * 0.22, 7, R, 0.8, 0.2)), '#8a909a', { sd: 1.6, hd: 0.8, lw: 1.4, outline: '#262a36', light: '#b0b8c2' });
  // deck: planks laid across the roadway, snow swept to the sides, a trodden middle
  toon(g, rrect(-len / 2, -bw / 2, len, bw, 4), '#8a5e38', { sd: 3, hd: 1.4, lw: 2, detail: c => {
    c.strokeStyle = 'rgba(50,25,10,0.55)'; c.lineWidth = 1.3; for (let x = -len / 2 + 8; x < len / 2; x += 9) { c.beginPath(); c.moveTo(x, -bw / 2); c.lineTo(x + 0.6, bw / 2); c.stroke(); }
    c.fillStyle = 'rgba(150,126,100,0.45)'; c.fillRect(-len / 2, -bw * 0.2, len, bw * 0.4);
    for (const sy of [-1, 1]) { c.fillStyle = 'rgba(244,248,252,0.92)'; for (let x = -len / 2; x < len / 2; x += 6) { c.beginPath(); c.ellipse(x, sy * (bw / 2 - 7 - R() * 4), 6 + R() * 5, 4 + R() * 3, 0, 0, PI * 2); c.fill(); } }
  } });
  // rails on both sides with snowy tops
  for (const sy of [-1, 1]) {
    for (let x = -len / 2 + 4; x <= len / 2 - 3; x += (len - 8) / 6) toon(g, rrect(x - 2.6, sy * bw / 2 - 16, 5.2, 18, 1.5), '#5e3a20', { sd: 0.5, hd: 0.3, lw: 1.2 });
    toon(g, rrect(-len / 2, sy * bw / 2 - 15, len, 5, 2.5), '#6e4526', { sd: 0.8, hd: 0.5, lw: 1.4 });
    snowLump(g, rrect(-len / 2 + 1, sy * bw / 2 - 18, len - 2, 4, 2), { sd: 0.4, hd: 0.4, lw: 1 });
  }
  g.restore();
}

// ---------------- occupancy & scatter ----------------
export function snowOccupy(og, M) {
  for (const c of M.cliffs || []) { const h = (c.h || 34) * 1.3; og.beginPath(); c.pts.forEach(([x, y], i) => (i ? og.lineTo(x, y - 34) : og.moveTo(x, y - 34))); c.pts.slice().reverse().forEach(([x, y]) => og.lineTo(x, y + h + 26)); og.closePath(); og.fill(); }
  for (const d of M.decals || []) { if (d.pts) og.fill(blob(d.pts, 0.35)); else if (d.r) { og.beginPath(); og.ellipse(d.x, d.y, d.r, d.r * (d.ry ?? 0.6), 0, 0, PI * 2); og.fill(); } }
}
export function snowScatter({ add, free, okSpacing, placed, R, M, W, H }) {
  const sc = Object.assign({ boulders: 22, drifts: 26, crystals: 6, stumps: 10, logs: 5 }, M.scatter || {});
  const put = (n, t, s0, s1, sp) => { for (let i = 0, k = 0; i < n * 12 && k < n; i++) { const x = R() * W, y = R() * H; if (!free(x, y) || !free(x, y - 24) || !okSpacing(x, y, sp)) continue; placed.push([x, y]); add(t, x, y, s0 + R() * (s1 - s0)); k++; } };
  put(sc.boulders, 'snowBoulder', 0.8, 1.4, 50);
  put(sc.drifts, 'snowDrift', 0.8, 1.5, 44);
  put(sc.crystals, 'iceshard', 0.7, 1.1, 40);
  put(sc.stumps, 'stump', 0.8, 1.2, 30);
  put(sc.logs, 'log', 0.8, 1.2, 40);
}

// ---------------- item drawing (returns true when handled) ----------------
export function snowDeco(g, it, R, th) {
  const { t, x, y, s } = it, e = it.extra || {}, hsh = snowHash(x, y, 1);
  switch (t) {
    case 'tree_pine': case 'tree_round': snowPine(g, x, y, s, R, hsh); return true;
    case 'tree_fir': snowFir(g, x, y, s, R, hsh); return true;
    case 'tree_birch': snowBirch(g, x, y, s, R, hsh); return true;
    case 'tree_dead': snowDeadTree(g, x, y, s, R, hsh); return true;
    case 'bush': if (hsh < 0.38) snowBush(g, x, y, s, R, hsh); else if (hsh < 0.5) snowRock(g, x, y, s * 0.7, R); return true;
    case 'rock': if (hsh < 0.55) snowRock(g, x, y, s, R); return true;
    case 'tuft': if (SNOW.bare(x, y) > 0.3 || hsh < 0.16) snowTuft(g, x, y, s, R, hsh); return true;
    case 'flowers': return true;
    case 'iceshard': snowCrystal(g, x, y, s, R); return true;
    case 'stump': snowStump(g, x, y, s, R); return true;
    case 'log': snowLog(g, x, y, s, R); return true;
    case 'house': snowCabin(g, x, y, s, R, e); return true;
    case 'campfire': snowFire(g, x, y, s, R, e); return true;
    case 'sign': snowSign(g, x, y, s, R, e); return true;
    case 'crates': snowCrates(g, x, y, s, R, e); return true;
    case 'fence': snowFence(g, e.x1, e.y1, e.x2, e.y2, s, R); return true;
  }
  if (!t.startsWith('snow')) return false;
  const fn = SNOW_DECO[t];
  if (fn) fn(g, x, y, s, R, e);
  return true;
}

// ---------------- trees ----------------
// snow-laden spruce: dark tiers with heavy snow on their upper faces
function snowPine(g, x, y, s, R, hsh) {
  const col = hsh < 0.45 ? SN.pine : hsh < 0.8 ? '#2a5548' : '#355f48', load = 0.5 + snowHash(x, y, 9) * 0.3;
  const tiers = hsh > 0.66 ? 5 : 4, Ht = (60 + hsh * 20) * s, w0 = (24 + hsh * 5) * s;
  snowShadow(g, x + 18 * s, y + 3 * s, 32 * s, 9 * s, 0.36);
  toon(g, rrect(x - 3.2 * s, y - 14 * s, 6.4 * s, 15 * s, 2), SN.bark, { sd: 1, hd: 0.4, lw: 1.5 });
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers, w = w0 * (1 - t * 0.7), yb = y - 9 * s - Ht * t * 0.8, h = Ht * 0.36, yt = yb - h;
    const m = w > 15 * s ? 4 : 3, pts = [[x, yt], [x + w * 0.5, yt + h * 0.52]];
    for (let k = 0; k <= m; k++) { const u = 1 - (2 * k) / m; pts.push([x + w * u, yb + (k % 2 ? -3.5 * s : 1.5 * s) * (k === 0 || k === m ? 0.4 : 1)]); }
    pts.push([x - w * 0.5, yt + h * 0.52]);
    toon(g, poly(pts), col, { sd: 2.6 * s, hd: 1.2 * s, lw: 1.6, light: light(col, 0.08) });
    // snow on the upper face, with a scalloped lower edge
    const sn = [[x, yt - 1.5 * s], [x + w * 0.56, yt + h * 0.5 * load * 1.4], [x + w * 0.86, yb - h * 0.22]];
    const n = 5;
    for (let k = 1; k < n; k++) { const u = 1 - (2 * k) / n; sn.push([x + w * 0.86 * u, yb - h * (0.42 - load * 0.18) + (k % 2 ? 3.2 * s : -1.5 * s)]); }
    sn.push([x - w * 0.86, yb - h * 0.22], [x - w * 0.56, yt + h * 0.5 * load * 1.4]);
    snowLump(g, blob(sn, 0.3), { sd: 1.4 * s, hd: 0.8, lw: 1.2 });
  }
  snowLump(g, ellipse(x, y + 0.5, 9 * s, 3 * s), { sd: 0.5, hd: 0.3, lw: 1 });
}
// tall narrow fir, bluer and less snow-laden
function snowFir(g, x, y, s, R, hsh) {
  const col = SN.fir, tiers = 6, Ht = (78 + hsh * 18) * s, w0 = (19 + hsh * 3) * s;
  snowShadow(g, x + 16 * s, y + 3 * s, 26 * s, 8 * s, 0.34);
  toon(g, rrect(x - 2.8 * s, y - 12 * s, 5.6 * s, 13 * s, 2), SN.bark, { sd: 1, hd: 0.4, lw: 1.5 });
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers, w = w0 * (1 - t * 0.78), yb = y - 8 * s - Ht * t * 0.84, h = Ht * 0.26, yt = yb - h;
    toon(g, poly([[x, yt], [x + w * 0.45, yt + h * 0.55], [x + w, yb + 1.5 * s], [x + w * 0.35, yb - 2.5 * s], [x, yb + 1 * s], [x - w * 0.35, yb - 2.5 * s], [x - w, yb + 1.5 * s], [x - w * 0.45, yt + h * 0.55]]), col, { sd: 2 * s, hd: 1 * s, lw: 1.5, light: light(col, 0.07) });
    snowLump(g, blob([[x, yt - 1 * s], [x + w * 0.5, yt + h * 0.5], [x + w * 0.7, yb - h * 0.25], [x + w * 0.2, yb - h * 0.38], [x - w * 0.25, yb - h * 0.3], [x - w * 0.7, yb - h * 0.28], [x - w * 0.5, yt + h * 0.5]], 0.3), { sd: 1, hd: 0.6, lw: 1.1 });
  }
}
// birch: white bark, black lenticels, bare twigs lined with snow
function snowBirch(g, x, y, s, R, hsh) {
  snowShadow(g, x + 12 * s, y + 2 * s, 22 * s, 6 * s, 0.3);
  const lean = (hsh - 0.5) * 6 * s, Ht = (52 + hsh * 16) * s;
  toon(g, poly([[x - 3.5 * s, y], [x - 2.2 * s + lean, y - Ht], [x + 1.6 * s + lean, y - Ht], [x + 3.6 * s, y]]), '#ece8de', { sd: 1.2, hd: 0.5, lw: 1.5, detail: c => {
    for (let k = 0; k < 7; k++) { const yy = y - (6 + k * Ht / 8) - R() * 4 * s, xx = x + lean * (6 + k * Ht / 8) / Ht; c.fillStyle = '#2a2420'; c.fillRect(xx - 3 * s + R() * 3 * s, yy, 2 * s + R() * 2 * s, 1.4 * s); }
  } });
  const br = (bx, by, a, l, w, d) => { if (l < 5 * s || d > 3) return; const ex = bx + C(a) * l, ey = by + S(a) * l; line(g, [[bx, by], [ex, ey]], OUT, w + 1.8); line(g, [[bx, by], [ex, ey]], '#7a6a5e', w); if (S(a) < -0.2 && l > 7 * s) line(g, [[bx + 0.5, by - w * 0.6], [ex + 0.5, ey - w * 0.6]], '#ffffff', Math.max(1, w * 0.7)); br(ex, ey, a - 0.45 - R() * 0.3, l * 0.66, w * 0.68, d + 1); br(ex, ey, a + 0.4 + R() * 0.3, l * 0.6, w * 0.64, d + 1); };
  br(x + lean * 0.7, y - Ht * 0.72, -PI / 2 - 0.55, 16 * s, 2.2 * s, 0); br(x + lean * 0.85, y - Ht * 0.86, -PI / 2 + 0.5, 15 * s, 2 * s, 0); br(x + lean, y - Ht, -PI / 2 - 0.1, 12 * s, 1.8 * s, 1);
  snowLump(g, ellipse(x, y + 0.5, 8 * s, 2.6 * s), { sd: 0.5, hd: 0.3, lw: 1 });
}
function snowDeadTree(g, x, y, s, R, hsh) {
  const col = '#3e342e';
  snowShadow(g, x + 10 * s, y + 2 * s, 20 * s, 6 * s, 0.28);
  toon(g, poly([[x - 5 * s, y], [x - 3 * s, y - 40 * s], [x + 2 * s, y - 52 * s], [x + 4 * s, y - 38 * s], [x + 6 * s, y]]), col, { sd: 1.2, hd: 0.4, lw: 1.6 });
  const br = (bx, by, a, l, w) => { if (l < 6 * s) return; const ex = bx + C(a) * l, ey = by + S(a) * l; line(g, [[bx, by], [ex, ey]], OUT, w + 2); line(g, [[bx, by], [ex, ey]], col, w); if (S(a) < 0) line(g, [[bx, by - w * 0.55], [ex, ey - w * 0.55]], '#f6f9fc', Math.max(1, w * 0.6)); br(ex, ey, a - 0.5 - R() * 0.3, l * 0.62, w * 0.65); br(ex, ey, a + 0.4 + R() * 0.3, l * 0.55, w * 0.6); };
  br(x, y - 36 * s, -PI / 2 - 0.6, 18 * s, 3.2 * s); br(x + 1, y - 44 * s, -PI / 2 + 0.5, 16 * s, 3 * s);
  snowLump(g, ellipse(x + 1, y - 52 * s, 3 * s, 1.6 * s), { sd: 0.3, hd: 0.2, lw: 1 });
  snowLump(g, ellipse(x, y + 0.5, 8 * s, 2.6 * s), { sd: 0.5, hd: 0.3, lw: 1 });
}

// ---------------- small scatter ----------------
function snowBush(g, x, y, s, R, hsh) {
  snowShadow(g, x + 8 * s, y + 2 * s, 20 * s, 6 * s, 0.28);
  const holly = hsh < 0.16, col = holly ? '#2d5a3c' : hsh < 0.27 ? '#3a5a4a' : '#5a4a3e';
  const b = [];
  for (let i = 0; i < 4; i++) b.push([x + (i - 1.5) * 7 * s, y - 7 * s - (i % 2) * 4 * s, (7 + R() * 3) * s]);
  const sil = new Path2D(); for (const [bx, by, br] of b) sil.addPath(circle(bx, by, br + 1.2)); g.fillStyle = OUT; g.fill(sil);
  for (const [bx, by, br] of b) toon(g, circle(bx, by, br), col, { sd: 2 * s, hd: 1.2 * s, lw: 0, light: light(col, 0.08) });
  if (col === '#5a4a3e') { g.strokeStyle = 'rgba(40,26,18,0.7)'; g.lineWidth = 1; for (let i = 0; i < 6; i++) { const a = -PI * (0.15 + R() * 0.7); g.beginPath(); g.moveTo(x, y - 5 * s); g.lineTo(x + C(a) * 15 * s, y - 5 * s + S(a) * 11 * s); g.stroke(); } }
  // snow resting on the upper half
  for (const [bx, by, br] of b) snowLump(g, blob([[bx - br * 0.85, by - br * 0.15], [bx - br * 0.4, by - br * 0.85], [bx + br * 0.3, by - br * 0.9], [bx + br * 0.85, by - br * 0.25], [bx + br * 0.2, by - br * 0.35 + 2 * s], [bx - br * 0.4, by - br * 0.2]], 0.45), { sd: 0.8, hd: 0.6, lw: 1 });
  if (holly) for (let i = 0; i < 5; i++) toon(g, circle(x + (R() - 0.5) * 24 * s, y - 3 * s - R() * 6 * s, 1.9 * s), '#c8303a', { sd: 0.5, hd: 0.5, lw: 0.9, light: '#ff8a8a' });
  snowSoft(g, x, y + 0.5, 15 * s, 3.5 * s);
}
function snowRock(g, x, y, s, R) {
  const col = R() < 0.5 ? SN.rock : '#868a96';
  snowShadow(g, x + 7 * s, y + 2 * s, 18 * s, 5.5 * s, 0.3);
  const n = 7, pts = [];
  for (let i = 0; i < n; i++) { const a = PI + (i / (n - 1)) * PI; pts.push([x + C(a) * (12 + R() * 4) * s, y - 2 * s + S(a) * (10 + R() * 5) * s]); }
  pts.push([x + 13 * s, y + 1 * s], [x - 13 * s, y + 1 * s]);
  toon(g, poly(pts), col, { sd: 3 * s, hd: 1.6 * s, lw: 1.5, light: SN.rockL });
  const top = pts.slice(0, n).map(([px, py]) => [px, py - 1.5 * s]);
  snowLump(g, blob([...top, [x + 9 * s, y - 7 * s], [x + 3 * s, y - 5 * s + R() * 2 * s], [x - 4 * s, y - 7 * s], [x - 10 * s, y - 6 * s]], 0.4), { sd: 0.8, hd: 0.6, lw: 1.1 });
  snowSoft(g, x - 2 * s, y + 1, 14 * s, 3.2 * s);
}
function snowTuft(g, x, y, s, R, hsh, noBase) {
  g.lineCap = 'round';
  for (let i = 0; i < 5; i++) { const lx = x + (i - 2) * 2.2 * s, h = (8 + R() * 7) * s, tx = lx + (i - 2) * 1.6 * s + (R() - 0.5) * 2; g.strokeStyle = 'rgba(29,19,12,0.6)'; g.lineWidth = 2.3 * s; g.beginPath(); g.moveTo(lx, y); g.quadraticCurveTo(lx, y - h * 0.6, tx, y - h); g.stroke(); g.strokeStyle = i % 2 ? SN.straw : '#cdb27a'; g.lineWidth = 1.2 * s; g.beginPath(); g.moveTo(lx, y); g.quadraticCurveTo(lx, y - h * 0.6, tx, y - h); g.stroke(); }
  if (!noBase) snowSoft(g, x, y + 0.5, 6.5 * s, 2 * s);
}
function snowCrystal(g, x, y, s, R) {
  snowShadow(g, x + 6, y + 1, 14 * s, 4 * s, 0.25);
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, x, y - 10 * s, 26 * s, '#9fe6ff', 0.25); g.restore();
  for (let i = 0; i < 3; i++) { const cx = x + (i - 1) * 6 * s, h = (12 + R() * 14) * s, lean = (i - 1) * 3 * s; toon(g, poly([[cx - 4 * s, y], [cx - 2 * s + lean, y - h * 0.8], [cx + lean, y - h], [cx + 2.5 * s + lean, y - h * 0.75], [cx + 4 * s, y]]), '#bfeaff', { sd: 1, hd: 1, lw: 1.2, light: '#ffffff', outline: '#244a6a' }); }
  snowHeap(g, [[x, y + 1, 9 * s, 0.45]]);
}
function snowStump(g, x, y, s, R) {
  snowShadow(g, x + 6 * s, y + 1, 13 * s, 4 * s, 0.26);
  cylinder(g, x, y, 8 * s, 3.4 * s, 9 * s, SN.bark, { bricks: false, kind: 'wood', topColor: '#c8a070', lw: 1.4 });
  snowLump(g, ellipse(x, y - 9.5 * s, 8.6 * s, 3.8 * s), { sd: 0.6, hd: 0.5, lw: 1.1 });
}
function snowLog(g, x, y, s, R) {
  snowShadow(g, x + 4, y + 2, 24 * s, 5 * s, 0.26);
  toon(g, rrect(x - 20 * s, y - 8 * s, 40 * s, 8 * s, 4 * s), SN.bark, { sd: 1.4, hd: 0.6, lw: 1.4 });
  toon(g, ellipse(x + 20 * s, y - 4 * s, 3 * s, 4 * s), '#c8a070', { sd: 0.3, hd: 0.2, lw: 1.2 });
  snowLump(g, blob([[x - 19 * s, y - 7 * s], [x - 8 * s, y - 11 * s], [x + 6 * s, y - 10.5 * s], [x + 18 * s, y - 8 * s], [x + 10 * s, y - 6.5 * s], [x - 10 * s, y - 6 * s]], 0.4), { sd: 0.6, hd: 0.5, lw: 1.1 });
}
function snowBoulder(g, x, y, s, R) {
  snowShadow(g, x + 12 * s, y + 3 * s, 34 * s, 9 * s, 0.32);
  const parts = [[x - 10 * s, y - 2 * s, 16 * s], [x + 9 * s, y, 13 * s], [x - 1 * s, y - 10 * s, 13 * s]];
  for (const [px, py, r] of parts) {
    const pts = snowBlobPts(px, py - r * 0.4, r, 8, R, 0.75, 0.22);
    toon(g, poly(pts), R() < 0.5 ? SN.rock : '#8a8f9a', { sd: 3 * s, hd: 1.6 * s, lw: 1.5, light: SN.rockL });
    const top = pts.filter(p => p[1] < py - r * 0.45);
    if (top.length > 2) { top.sort((a, b) => a[0] - b[0]); snowLump(g, blob([...top.map(([u, v]) => [u, v - 1.5 * s]), ...top.slice().reverse().map(([u, v]) => [u, v + 4 * s + R() * 3 * s])], 0.35), { sd: 0.8, hd: 0.6, lw: 1.1 }); }
  }
  snowHeap(g, [[x - 14 * s, y + 2, 9 * s, 0.5], [x + 14 * s, y + 3, 8 * s, 0.5]]);
}
function snowDrift(g, x, y, s, R) {
  const L = (30 + R() * 30) * s, h = (6 + R() * 5) * s;
  snowShadow(g, x + 8 * s, y + 4 * s, L * 0.75, 6 * s, 0.22);
  snowLump(g, blob([[x - L * 0.5, y + 2 * s], [x - L * 0.22, y - h * 0.8], [x + L * 0.08, y - h], [x + L * 0.4, y - h * 0.55], [x + L * 0.55, y + 1 * s], [x, y + 3 * s]], 0.45), { sd: 2.2 * s, hd: 1.2, lw: 1.1 });
}

// ---------------- structures (snow*) ----------------
// heavy snow over a house() roof: covers the visible roof slope and the gable edge, with icicles
function snowRoof(g, cx, w, yt, ya, depth, ov, R) {
  const x1 = cx + w / 2;
  snowLump(g, poly([[cx - 1, ya - 3], [x1 + ov + 2, yt + 1], [x1 + ov + depth * 0.7 + 2, yt + 1 - depth * 0.4], [cx + depth * 0.7, ya - depth * 0.4 - 3]]), { sd: 1.6, hd: 1, lw: 1.4 });
  const x0 = cx - w / 2;
  snowLump(g, blob([[x0 - ov - 3, yt + 5], [cx, ya - 4], [x1 + ov + 3, yt + 5], [x1 + ov - 6, yt + 6], [cx, ya + 5], [x0 - ov + 6, yt + 6]], 0.12), { sd: 1, hd: 0.8, lw: 1.3 });
  for (let x = x0 - ov + 6; x < x1 + ov - 4; x += 5 + R() * 6) { const L = 3 + R() * 7; toon(g, poly([[x - 1.6, yt + 5], [x + 1.6, yt + 5], [x, yt + 5 + L]]), '#d6f0fb', { sd: 0.3, hd: 0.4, lw: 0.9, outline: '#3a5a7a', light: '#ffffff' }); }
}
function snowWindow(g, x, y, w, h, lit = true) {
  toon(g, rrect(x - w / 2, y - h / 2, w, h, 1.5), lit ? '#ffd27a' : '#2a2430', { sd: 0, hd: 0, lw: 1.3 });
  if (lit) { g.save(); g.clip(rrect(x - w / 2, y - h / 2, w, h, 1.5)); g.fillStyle = lg(g, 0, y - h / 2, 0, y + h / 2, [[0, '#fff2b8'], [1, '#ffb64a']]); g.fillRect(x - w, y - h, w * 2, h * 2); g.restore(); snowLight(x, y + h, 70, '#ffb54a', 0.42); }
  line(g, [[x, y - h / 2], [x, y + h / 2]], OUT, 1); line(g, [[x - w / 2, y], [x + w / 2, y]], OUT, 1);
  snowLump(g, rrect(x - w / 2 - 2, y - h / 2 - 3, w + 4, 3.4, 1.6), { sd: 0.3, hd: 0.3, lw: 0.9 });
}
function snowChimney(g, x, y, h = 18) {
  toon(g, rrect(x - 4.5, y - h, 9, h, 1.5), '#7e7a74', { sd: 0.8, hd: 0.4, lw: 1.3, detail: c => wallBricks(c, x - 5, y - h, x + 5, y, { rowH: 4, bw: 6, seed: 5 }) });
  snowLump(g, ellipse(x, y - h, 6.5, 2.6), { sd: 0.4, hd: 0.3, lw: 1 });
  snowSmoke(x, y - h - 3, 1);
}
// log cabin with a snow-laden roof, lit window, smoking chimney
function snowCabin(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 22, 4, 66, 17, 0.34);
  const w = 58, wallH = 30, roofH = 26, depth = 18, ov = 7;
  const r = house(g, 0, 0, w, wallH, roofH, { wall: '#8a5e3a', wallKind: 'logs', roof: '#5b4636', roofKind: 'shingle', depth, overhang: ov, seed: Math.floor(R() * 100) });
  door(g, -12, 0, 12, 19, { color: '#2a1a10', open: false });
  snowWindow(g, 11, -16, 11, 10, e.lit !== false);
  snowChimney(g, 15, r.ya + 12, 20);
  snowRoof(g, 0, w, r.yt, r.ya, depth, ov, R);
  snowSoft(g, -22, 2, 16, 4); snowSoft(g, 30, 2, 20, 5);
  g.restore();
  snowLight(x + 11 * s, y - 16 * s, 40 * s, '#ffcf7a', 0.35);
}
// waystation inn: stone footing, timber upper floor, hanging sign, lanterns
function snowInn(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 30, 6, 110, 24, 0.36);
  // stable wing
  const st = house(g, 62, -4, 50, 26, 18, { wall: '#7a5232', wallKind: 'timber', roof: '#4e3c30', roofKind: 'shingle', depth: 16, overhang: 5, seed: 12 });
  toon(g, rect(50, -26, 24, 22), '#2a1c14', { sd: 0, hd: 0, lw: 1.3 });
  toon(g, blob([[52, -4], [56, -14], [64, -16], [72, -12], [72, -4]], 0.5), '#d8b856', { sd: 1, hd: 0.6, lw: 1.1 });
  snowRoof(g, 62, 50, st.yt, st.ya, 16, 5, R);
  // main house
  const w = 88, wallH = 46, roofH = 34, depth = 22, ov = 8;
  const r = house(g, 0, 0, w, wallH, roofH, { wall: '#9a6c44', wallKind: 'timber', roof: '#55403a', roofKind: 'shingle', depth, overhang: ov, seed: 7,
    wallDetail: (c, x0, yt, x1, yb) => { c.fillStyle = '#8f8a82'; c.fillRect(x0, yb - 12, x1 - x0, 12); wallBricks(c, x0, yb - 12, x1, yb, { rowH: 6, bw: 12, seed: 3, tint: true }); c.fillStyle = 'rgba(40,24,12,0.5)'; c.fillRect(x0, yb - 26, x1 - x0, 2.4); } });
  door(g, -6, 0, 15, 22, { color: '#2a1a10', open: true, glowColor: '#ffb040' });
  snowLight(-6, -8, 60, '#ffb040', 0.45);
  for (const wx of [-30, 26]) snowWindow(g, wx, -18, 12, 11);
  for (const wx of [-24, 0, 24]) snowWindow(g, wx, -37, 10, 9);
  snowChimney(g, -26, r.ya + 18, 22); snowChimney(g, 30, r.ya + 22, 18);
  snowRoof(g, 0, w, r.yt, r.ya, depth, ov, R);
  // hanging sign (a mug) on an iron bracket
  line(g, [[-44, -30], [-58, -30]], OUT, 3.4); line(g, [[-44, -30], [-58, -30]], '#4a4a50', 1.8);
  toon(g, rrect(-62, -27, 14, 12, 2), '#b08a5a', { sd: 0.6, hd: 0.4, lw: 1.2 });
  toon(g, rrect(-58.5, -24.5, 6, 7, 1), '#e3b34a', { sd: 0.3, hd: 0.3, lw: 0.8 });
  snowLump(g, rrect(-63, -29, 16, 3, 1.5), { sd: 0.3, hd: 0.3, lw: 0.9 });
  snowLantern(g, -48, 4, 0.9, R);
  snowSoft(g, -36, 3, 22, 5); snowSoft(g, 44, 3, 20, 5); snowSoft(g, 92, 1, 18, 5);
  g.restore();
}
function snowLantern(g, x, y, s, R) {
  snowShadow(g, x + 6 * s, y + 1, 10 * s, 3 * s, 0.25);
  toon(g, rrect(x - 2 * s, y - 34 * s, 4 * s, 34 * s, 1.5), '#5a3c24', { sd: 0.6, hd: 0.3, lw: 1.2 });
  line(g, [[x, y - 32 * s], [x + 8 * s, y - 32 * s]], OUT, 3); line(g, [[x, y - 32 * s], [x + 8 * s, y - 32 * s]], '#3a3a40', 1.6);
  toon(g, rrect(x + 4.5 * s, y - 31 * s, 7 * s, 9 * s, 1.5), '#ffd27a', { sd: 0, hd: 0, lw: 1.2 });
  toon(g, poly([[x + 3.5 * s, y - 31 * s], [x + 8 * s, y - 35 * s], [x + 12.5 * s, y - 31 * s]]), '#3a3a40', { sd: 0.3, hd: 0.2, lw: 1 });
  snowLump(g, ellipse(x + 8 * s, y - 34.5 * s, 4 * s, 1.6 * s), { sd: 0.2, hd: 0.2, lw: 0.8 });
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, x + 8 * s, y - 27 * s, 18 * s, '#ffb040', 0.6); g.restore();
  snowLight(x + 8 * s, y - 4 * s, 60 * s, '#ffb54a', 0.45);
}
function snowSign(g, x, y, s, R, e = {}) {
  snowShadow(g, x + 6 * s, y + 1, 10 * s, 3 * s, 0.25);
  toon(g, rrect(x - 1.8 * s, y - 32 * s, 3.6 * s, 32 * s, 1), '#6e4526', { sd: 0.5, hd: 0.3, lw: 1.2 });
  toon(g, poly([[x - 14 * s, y - 30 * s], [x + 10 * s, y - 30 * s], [x + 16 * s, y - 25 * s], [x + 10 * s, y - 20 * s], [x - 14 * s, y - 20 * s]]), '#a8804e', { sd: 0.6, hd: 0.4, lw: 1.2 });
  toon(g, poly([[x + 12 * s, y - 17 * s], [x - 10 * s, y - 17 * s], [x - 15 * s, y - 13 * s], [x - 10 * s, y - 9 * s], [x + 12 * s, y - 9 * s]]), '#9a7448', { sd: 0.6, hd: 0.4, lw: 1.2 });
  snowLump(g, rrect(x - 15 * s, y - 32.5 * s, 26 * s, 3.2 * s, 1.5), { sd: 0.3, hd: 0.3, lw: 0.9 });
  snowLump(g, rrect(x - 12 * s, y - 19 * s, 22 * s, 2.8 * s, 1.4), { sd: 0.3, hd: 0.3, lw: 0.9 });
  snowLump(g, ellipse(x, y - 33 * s, 3 * s, 1.5 * s), { sd: 0.2, hd: 0.2, lw: 0.8 });
  snowHeap(g, [[x, y + 1, 6 * s, 0.5]]);
}
function snowCrates(g, x, y, s, R) {
  snowShadow(g, x + 8 * s, y + 2, 20 * s, 5 * s, 0.26);
  for (const [dx, dy] of [[-8, 0], [8, 0], [0, -14]]) {
    const X = x + dx * s, Y = y + dy * s;
    toon(g, rrect(X - 7 * s, Y - 14 * s, 14 * s, 14 * s, 1.5), '#a8743c', { sd: 1, hd: 0.6, lw: 1.3, detail: c => { c.strokeStyle = 'rgba(70,40,10,0.6)'; c.lineWidth = 1; c.strokeRect(X - 5 * s, Y - 12 * s, 10 * s, 10 * s); } });
    snowLump(g, rrect(X - 7.5 * s, Y - 16 * s, 15 * s, 4 * s, 2), { sd: 0.4, hd: 0.3, lw: 1 });
  }
}
function snowFence(g, x1, y1, x2, y2, s, R) {
  const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / (16 * s)));
  for (const h of [10, 4]) { line(g, [[x1, y1 - h * s], [x2, y2 - h * s]], OUT, 3.6); line(g, [[x1, y1 - h * s], [x2, y2 - h * s]], '#7a5a3a', 2); }
  line(g, [[x1, y1 - 11.6 * s], [x2, y2 - 11.6 * s]], '#f4f8fb', 1.6);
  for (let i = 0; i <= n; i++) { const t = i / n, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t; toon(g, rrect(x - 1.8 * s, y - 15 * s, 3.6 * s, 16 * s, 1), '#6e4e30', { sd: 0.5, hd: 0.3, lw: 1.1 }); snowLump(g, ellipse(x, y - 15 * s, 2.8 * s, 1.5 * s), { sd: 0.2, hd: 0.2, lw: 0.8 }); }
  const L = []; for (let i = 0; i <= n * 2; i++) { const t = i / (n * 2); if (R() < 0.5) L.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + 1, (4 + R() * 4) * s, 0.5]); }
  snowHeap(g, L);
}
function snowWood(g, x, y, s, R) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 10, 3, 30, 7, 0.28);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) { const cx = -12 + i * 8 + row * 4, cy = -4 - row * 7; toon(g, circle(cx, cy, 4.2), '#8a5e38', { sd: 0.5, hd: 0.3, lw: 1.1 }); flat(g, circle(cx, cy, 2.4), '#c8a070', 0); flat(g, circle(cx, cy, 0.8), '#8a5e38', 0); }
  snowLump(g, blob([[-17, -22], [-4, -28], [8, -26], [16, -18], [4, -20], [-10, -19]], 0.4), { sd: 0.6, hd: 0.5, lw: 1.1 });
  g.restore();
}
function snowSled(g, x, y, s, R) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 8, 3, 34, 7, 0.28);
  line(g, [[-26, 0], [22, 0], [30, -8]], OUT, 4); line(g, [[-26, 0], [22, 0], [30, -8]], '#6e4e30', 2.2);
  for (const px of [-18, 0, 16]) line(g, [[px, 0], [px, -8]], '#5a3c24', 2.4);
  toon(g, rrect(-24, -14, 46, 7, 2), '#8a5e38', { sd: 0.8, hd: 0.4, lw: 1.3 });
  for (let i = 0; i < 3; i++) toon(g, rrect(-20 + i * 2, -22 - i * 5, 36 - i * 4, 6, 3), '#6b4423', { sd: 0.8, hd: 0.4, lw: 1.2 });
  snowLump(g, blob([[-18, -34], [0, -38], [16, -32], [6, -30], [-10, -30]], 0.4), { sd: 0.5, hd: 0.4, lw: 1 });
  g.restore();
}
function snowFire(g, x, y, s, R) {
  snowShadow(g, x + 4, y + 2, 18 * s, 5 * s, 0.2);
  flat(g, ellipse(x, y, 14 * s, 6 * s), '#6a5a4a', 1.1, OUT);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * PI * 2; toon(g, ellipse(x + C(a) * 12 * s, y + S(a) * 5 * s, 3.4 * s, 2.2 * s), '#8a8e96', { sd: 0.5, hd: 0.3, lw: 1 }); }
  line(g, [[x - 7 * s, y + 2], [x + 7 * s, y - 2]], '#4a2e18', 3); line(g, [[x - 7 * s, y - 2], [x + 7 * s, y + 2]], '#4a2e18', 3);
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, x, y - 6 * s, 26 * s, '#ff9a30', 0.75); g.restore();
  flat(g, blob([[x - 6 * s, y - 1], [x - 4 * s, y - 10 * s], [x, y - 17 * s], [x + 4 * s, y - 9 * s], [x + 6 * s, y - 1]], 0.7), '#ffae3a', 1.1, '#7a2a08');
  flat(g, blob([[x - 2.5 * s, y - 1], [x, y - 9 * s], [x + 2.5 * s, y - 1]], 0.7), '#fff3a0', 0);
  snowLight(x, y - 4, 110 * s, '#ff9a3a', 0.5); snowSmoke(x, y - 18 * s, 0.7);
}
function snowStable(g, x, y, s, R) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 20, 4, 70, 16, 0.32);
  const r = house(g, 0, 0, 70, 30, 20, { wall: '#7a5232', wallKind: 'timber', roof: '#4e3c30', roofKind: 'shingle', depth: 20, overhang: 6, seed: 14 });
  toon(g, rect(-24, -26, 48, 26), '#2a1c14', { sd: 0, hd: 0, lw: 1.4 });
  toon(g, blob([[-20, 0], [-16, -12], [-4, -16], [8, -14], [20, -8], [20, 0]], 0.5), '#d8b856', { sd: 1, hd: 0.6, lw: 1.1 });
  snowRoof(g, 0, 70, r.yt, r.ya, 20, 6, R);
  g.restore();
}
// ---- small camp & village pieces ----
function snowCairn(g, x, y, s, R) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 9, 2, 22, 6, 0.3);
  for (const [dx, dy, rx, ry] of [[0, -5, 15, 6.5], [-1, -13, 12, 5.8], [1.5, -20.5, 9, 5], [0, -27, 6, 4]]) {
    toon(g, ellipse(dx, dy, rx, ry), '#8a909a', { sd: 1.2, hd: 0.8, lw: 1.3, outline: '#262a36', light: '#b2bac4' });
    snowLump(g, ellipse(dx - 1, dy - ry * 0.5, rx * 0.68, ry * 0.42), { sd: 0.3, hd: 0.3, lw: 0.9 });
  }
  g.restore();
}
function snowWheel(g, x, y, r, col = '#6b4423') {
  toon(g, circle(x, y, r), col, { sd: 0.8, hd: 0.4, lw: 1.4 });
  flat(g, circle(x, y, r * 0.62), dark(col, 0.12), 0);
  for (let k = 0; k < 6; k++) { const a = k * PI / 3; line(g, [[x, y], [x + C(a) * r * 0.8, y + S(a) * r * 0.8]], dark(col, 0.25), 1.6); }
  toon(g, circle(x, y, r * 0.22), '#4a4a50', { sd: 0.2, hd: 0.2, lw: 1 });
}
function snowWagon(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale((e.flip ? -1 : 1) * s, s);
  snowShadow(g, 10, 3, 48, 10, 0.3);
  snowWheel(g, -16, -10, 9, '#5a3c24'); snowWheel(g, 26, -10, 9, '#5a3c24');
  line(g, [[34, -14], [56, -8]], OUT, 4); line(g, [[34, -14], [56, -8]], '#6e4526', 2.2);
  toon(g, rrect(-34, -26, 68, 13, 2), '#8a5e38', { sd: 1, hd: 0.5, lw: 1.4, detail: c => planks(c, -34, -26, 34, -13, { pw: 4.5 }) });
  const cov = new Path2D(); cov.moveTo(-31, -26); cov.bezierCurveTo(-36, -60, 32, -60, 30, -26); cov.closePath();
  toon(g, cov, e.cover || '#e4d9bf', { sd: 2.4, hd: 1.2, lw: 1.5, detail: c => { c.strokeStyle = 'rgba(110,90,60,0.45)'; c.lineWidth = 1.3; for (const xx of [-17, -1, 15]) { c.beginPath(); c.moveTo(xx, -26); c.quadraticCurveTo(xx + 1, -46, xx + 2, -54); c.stroke(); } } });
  snowLump(g, blob([[-27, -44], [-8, -55], [14, -55], [27, -43], [14, -46], [-10, -47]], 0.4), { sd: 0.6, hd: 0.5, lw: 1.1 });
  snowWheel(g, -20, -8, 10); snowWheel(g, 22, -8, 10);
  g.restore();
}
function snowWell(g, x, y, s, R) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 8, 3, 28, 8, 0.3);
  cylinder(g, 0, 0, 15, 6.5, 13, '#8e8a84', { rowH: 6, cols: 6, seed: 4, topColor: '#1e2a36' });
  snowLump(g, blob([[-15, -13], [-6, -16], [6, -16], [15, -13], [8, -11], [-8, -11]], 0.5), { sd: 0.4, hd: 0.3, lw: 1 });
  for (const sx of [-12, 12]) toon(g, rrect(sx - 1.8, -38, 3.6, 28, 1), '#6e4526', { sd: 0.5, hd: 0.3, lw: 1.1 });
  line(g, [[-12, -30], [12, -30]], OUT, 3.4); line(g, [[-12, -30], [12, -30]], '#7a4a24', 1.8);
  toon(g, rrect(-3, -27, 6, 7, 1.5), '#7a5a3a', { sd: 0.4, hd: 0.2, lw: 1 });
  toon(g, poly([[-19, -36], [0, -49], [19, -36], [15, -34], [0, -44], [-15, -34]]), '#5b4636', { sd: 0.8, hd: 0.5, lw: 1.3 });
  snowLump(g, blob([[-20, -37], [0, -51], [20, -37], [12, -38], [0, -46], [-12, -38]], 0.3), { sd: 0.6, hd: 0.5, lw: 1.1 });
  g.restore();
}
// long logs stacked in a pyramid (woodcutters' yard)
function snowLogPile(g, x, y, s, R) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 12, 3, 52, 10, 0.3);
  const rows = [[0, 4], [1, 3], [2, 2]];
  for (const [r, n] of rows) for (let i = 0; i < n; i++) {
    const cx = -27 + r * 9 + i * 18, cy = -6 - r * 13;
    toon(g, rrect(cx - 30, cy - 6.5, 58, 13, 6), '#7a5232', { sd: 1, hd: 0.5, lw: 1.3, detail: c => { c.strokeStyle = 'rgba(40,24,12,0.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx - 26, cy); c.lineTo(cx + 20, cy + 1); c.stroke(); } });
    toon(g, ellipse(cx + 28, cy, 5, 6.5), '#cfa775', { sd: 0.4, hd: 0.3, lw: 1.2 }); flat(g, ellipse(cx + 28, cy, 2.6, 3.4), '#b08a5a', 0);
  }
  snowLump(g, blob([[-26, -39], [-4, -46], [16, -45], [30, -37], [10, -36], [-14, -35]], 0.4), { sd: 0.6, hd: 0.5, lw: 1.1 });
  // chopping block with an axe
  toon(g, rrect(44, -14, 16, 14, 4), '#7a5232', { sd: 0.8, hd: 0.4, lw: 1.3 }); toon(g, ellipse(52, -14, 8, 3.2), '#cfa775', { sd: 0.3, hd: 0.2, lw: 1.1 });
  line(g, [[50, -14], [58, -30]], OUT, 3.4); line(g, [[50, -14], [58, -30]], '#a07a4a', 1.8);
  toon(g, poly([[54, -32], [62, -30], [60, -24], [55, -26]]), '#8a9098', { sd: 0.4, hd: 0.4, lw: 1 });
  g.restore();
}
// banner on a pole; emblem: 'raven' (House Morrow), 'anvil' (Ironvein), 'tower' (the realm)
function snowBannerPole(g, x, y, s, R, e = {}) {
  const col = e.color || '#c0392b', h = (e.h || 64) * s;
  snowShadow(g, x + 6 * s, y + 1, 10 * s, 3 * s, 0.25);
  pole(g, x, y - h, y, 2.6 * s, '#5a3c24');
  banner(g, x + 1, y - h + 2, 20 * s, 32 * s, col, { tail: true, wave: 1.2, emblem: (c, ex, ey) => snowEmblem(c, ex, ey, s, e.emblem || 'tower', col) });
  snowLump(g, ellipse(x, y - h - 2, 3 * s, 1.6 * s), { sd: 0.2, hd: 0.2, lw: 0.8 });
  snowSoft(g, x, y + 1, 7 * s, 2 * s);
}
function snowEmblem(c, x, y, s, kind, col) {
  if (kind === 'raven') {
    c.fillStyle = '#16121a';
    c.beginPath(); c.ellipse(x, y + 2 * s, 5 * s, 3.5 * s, -0.3, 0, PI * 2); c.fill();
    c.beginPath(); c.moveTo(x - 1 * s, y); c.lineTo(x - 9 * s, y - 4 * s); c.lineTo(x - 3 * s, y + 3 * s); c.fill();
    c.beginPath(); c.moveTo(x + 2 * s, y); c.lineTo(x + 9 * s, y - 5 * s); c.lineTo(x + 4 * s, y + 3 * s); c.fill();
    c.beginPath(); c.arc(x + 3 * s, y - 2.5 * s, 2.2 * s, 0, PI * 2); c.fill();
    c.beginPath(); c.moveTo(x + 5 * s, y - 2.5 * s); c.lineTo(x + 8 * s, y - 1.5 * s); c.lineTo(x + 5 * s, y - 1 * s); c.fill();
    c.fillStyle = '#e3b34a'; c.beginPath(); c.moveTo(x + 1 * s, y - 4.5 * s); c.lineTo(x + 1.6 * s, y - 7 * s); c.lineTo(x + 2.8 * s, y - 5.5 * s); c.lineTo(x + 3.6 * s, y - 7.4 * s); c.lineTo(x + 4.4 * s, y - 5.5 * s); c.lineTo(x + 5.4 * s, y - 7 * s); c.lineTo(x + 5.6 * s, y - 4.5 * s); c.closePath(); c.fill();
  } else if (kind === 'anvil') {
    c.fillStyle = '#2a2a30';
    c.beginPath(); c.moveTo(x - 7 * s, y - 3 * s); c.lineTo(x + 7 * s, y - 3 * s); c.lineTo(x + 4 * s, y); c.lineTo(x + 2 * s, y); c.lineTo(x + 3 * s, y + 4 * s); c.lineTo(x - 3 * s, y + 4 * s); c.lineTo(x - 2 * s, y); c.lineTo(x - 5 * s, y); c.closePath(); c.fill();
    c.fillStyle = '#ffd27a'; c.fillRect(x - 0.8 * s, y - 8 * s, 1.6 * s, 4 * s);
  } else if (kind === 'star') {
    c.fillStyle = '#f4e6a0'; c.fill(star(x, y, 5.5 * s, 0.45, 5));
  } else {
    c.fillStyle = '#f2e6c8'; c.fillRect(x - 3 * s, y - 4 * s, 6 * s, 9 * s);
    for (const dx of [-3, -0.6, 1.8]) c.fillRect(x + dx * s, y - 6 * s, 1.4 * s, 2 * s);
  }
}
// A-frame tent: e.color canvas, e.stripe optional stripes, e.banner color, e.emblem
function snowTent(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const col = e.color || '#d8ccb0';
  snowShadow(g, 16, 3, 50, 11, 0.32);
  const side = poly([[0, -40], [28, 0], [52, -12], [24, -52]]);
  toon(g, side, dark(col, 0.1), { sd: 1, hd: 0.5, lw: 1.6, detail: c => { if (e.stripe) { c.fillStyle = e.stripe; for (let k = 0; k < 3; k++) { const t = (k + 0.5) / 3.5; c.beginPath(); c.moveTo(0 + 28 * t, -40 + 40 * t); c.lineTo(24 + 28 * t, -52 + 40 * t); c.lineTo(24 + 28 * (t + 0.07), -52 + 40 * (t + 0.07)); c.lineTo(28 * (t + 0.07), -40 + 40 * (t + 0.07)); c.closePath(); c.fill(); } } } });
  const front = poly([[-28, 0], [0, -40], [28, 0]]);
  toon(g, front, col, { sd: 2, hd: 1, lw: 1.6, detail: c => { if (e.stripe) { c.fillStyle = e.stripe; for (const xx of [-16, 10]) { c.beginPath(); c.moveTo(xx * 0.1, -40); c.lineTo(xx, 0); c.lineTo(xx + 6, 0); c.lineTo(xx * 0.1 + 1.5, -40); c.closePath(); c.fill(); } } } });
  toon(g, poly([[-8, 0], [0, -26], [8, 0]]), '#241a14', { sd: 0, hd: 0, lw: 1.3 });
  if (e.lit) { g.save(); g.clip(poly([[-8, 0], [0, -26], [8, 0]])); g.fillStyle = 'rgba(255,170,70,0.7)'; g.fillRect(-8, -14, 16, 14); g.restore(); snowLight(x + 2 * s, y + 6 * s, 50 * s, '#ffb04a', 0.35); }
  snowLump(g, blob([[-2, -42], [24, -54], [36, -36], [12, -30]], 0.4), { sd: 0.8, hd: 0.5, lw: 1.1 });
  snowLump(g, blob([[0, -43], [8, -32], [2, -30], [-8, -32]], 0.4), { sd: 0.4, hd: 0.3, lw: 1 });
  line(g, [[0, -40], [0, -54]], OUT, 3); line(g, [[0, -40], [0, -54]], '#5a3c24', 1.6);
  if (e.banner) banner(g, 1, -54, 12, 8, e.banner, { tail: true, wave: 1, lw: 1 });
  g.restore();
}
// round command pavilion
function snowPavilion(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const col = e.color || '#7a1f3d', st = e.stripe || '#1d1418';
  snowShadow(g, 20, 4, 70, 15, 0.34);
  cylinder(g, 0, 0, 42, 14, 30, col, { bricks: false, kind: 'wood', topColor: col, top: false, detail: (c, yt) => { c.fillStyle = st; for (let k = -3; k <= 3; k++) { const xx = k * 12; c.fillRect(xx - 2.5, yt, 5, 50); } } });
  toon(g, poly([[-9, 0], [-9, -20], [9, -20], [9, 0]]), '#1e1612', { sd: 0, hd: 0, lw: 1.3 });
  cone(g, 0, -30, 48, 16, -78, col, { rows: 4 });
  snowLump(g, blob([[-40, -38], [-20, -56], [0, -76], [18, -60], [36, -44], [16, -46], [-6, -50], [-24, -44]], 0.35), { sd: 1, hd: 0.7, lw: 1.2 });
  line(g, [[0, -76], [0, -96]], OUT, 3.4); line(g, [[0, -76], [0, -96]], '#5a3c24', 1.8);
  banner(g, 1, -96, 16, 11, e.banner || st, { tail: true, wave: 1.2, lw: 1 });
  g.restore();
}
// line of sharpened stakes with snow caps
function snowPalisade(g, x1, y1, x2, y2, s, R, e = {}) {
  const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / (7 * s)));
  const items = [];
  for (let i = 0; i <= n; i++) { const t = i / n; items.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, (26 + snowHash(i, x1, 3) * 8) * s]); }
  snowShadow(g, (x1 + x2) / 2 + 10, (y1 + y2) / 2 + 4, Math.hypot(x2 - x1, y2 - y1) * 0.55, 10 * s, 0.28);
  for (const [x, y, h] of items) {
    toon(g, poly([[x - 3.6 * s, y + 1], [x - 3.6 * s, y - h], [x, y - h - 6 * s], [x + 3.6 * s, y - h], [x + 3.6 * s, y + 1]]), e.color || '#8a6038', { sd: 1, hd: 0.5, lw: 1.2 });
    snowLump(g, ellipse(x, y - h - 1.5 * s, 3.2 * s, 2 * s), { sd: 0.2, hd: 0.2, lw: 0.8 });
  }
  for (const f of [0.45, 0.78]) { const a = items[0], b = items[items.length - 1]; line(g, [[a[0], a[1] - a[2] * f], [b[0], b[1] - b[2] * f]], OUT, 3.6); line(g, [[a[0], a[1] - a[2] * f], [b[0], b[1] - b[2] * f]], '#6b4423', 2); }
  const L = []; for (const [x, y] of items) if (R() < 0.5) L.push([x, y + 1, (4 + R() * 5) * s, 0.5]); snowHeap(g, L);
}
// weapon rack with spears and round shields
function snowRack(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 8, 2, 28, 6, 0.26);
  for (const px of [-18, 18]) toon(g, rrect(px - 2, -30, 4, 30, 1), '#6e4526', { sd: 0.5, hd: 0.3, lw: 1.1 });
  line(g, [[-20, -24], [20, -24]], OUT, 3.4); line(g, [[-20, -24], [20, -24]], '#7a4a24', 1.8);
  for (let k = 0; k < 4; k++) { const sx = -12 + k * 8; line(g, [[sx, 0], [sx + 3, -40]], OUT, 3); line(g, [[sx, 0], [sx + 3, -40]], '#8a6a4a', 1.6); toon(g, poly([[sx + 1.4, -40], [sx + 3.4, -48], [sx + 5, -40]]), '#a8b0ba', { sd: 0.3, hd: 0.3, lw: 0.9 }); }
  for (const [sx, c1] of [[-14, e.color || '#7a1f3d'], [12, '#1d1418']]) { toon(g, circle(sx, -12, 8), c1, { sd: 1, hd: 0.6, lw: 1.3 }); toon(g, circle(sx, -12, 2.4), '#c9993e', { sd: 0.3, hd: 0.3, lw: 0.9 }); }
  snowLump(g, rrect(-21, -27, 42, 3, 1.5), { sd: 0.3, hd: 0.3, lw: 0.9 });
  g.restore();
}
// wooden prisoner cage (a hunched captive inside)
function snowCage(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 8, 3, 32, 8, 0.3);
  toon(g, rrect(-24, -6, 48, 8, 2), '#6e4526', { sd: 0.6, hd: 0.3, lw: 1.3 });
  toon(g, blob([[-8, -6], [-9, -18], [-4, -26], [4, -26], [8, -18], [9, -6]], 0.5), '#4a2a3a', { sd: 1, hd: 0.5, lw: 1.2 });
  toon(g, circle(1, -29, 5), '#d8b090', { sd: 0.6, hd: 0.4, lw: 1.1 });
  for (let k = 0; k <= 6; k++) { const xx = -22 + k * 7.3; line(g, [[xx, -4], [xx, -44]], OUT, 3.2); line(g, [[xx, -4], [xx, -44]], '#7a5232', 1.8); }
  toon(g, rrect(-25, -48, 50, 6, 2), '#6e4526', { sd: 0.6, hd: 0.3, lw: 1.3 });
  snowLump(g, rrect(-26, -52, 52, 5, 2.5), { sd: 0.4, hd: 0.3, lw: 1 });
  g.restore();
}
// ice-fishing shanty with a stovepipe
function snowFishHut(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 10, 3, 36, 9, 0.3);
  const r = house(g, 0, 0, 34, 24, 14, { wall: e.color || '#9a5a3a', wallKind: 'timber', roof: '#4e3c30', roofKind: 'shingle', depth: 12, overhang: 4, seed: 21 });
  door(g, -6, 0, 9, 15, { color: '#2a1a10', open: false });
  snowWindow(g, 8, -14, 7, 6);
  toon(g, rrect(8, r.ya - 2, 4, 16, 1), '#3a3a40', { sd: 0.3, hd: 0.2, lw: 1 }); snowSmoke(10, r.ya - 4, 0.6);
  snowRoof(g, 0, 34, r.yt, r.ya, 12, 4, R);
  g.restore();
}
// fish drying rack
function snowDryRack(g, x, y, s, R) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 8, 2, 30, 6, 0.26);
  for (const px of [-22, 22]) { line(g, [[px - 4, 0], [px, -36]], OUT, 3.4); line(g, [[px - 4, 0], [px, -36]], '#6e4526', 1.8); line(g, [[px + 4, 0], [px, -36]], OUT, 3.4); line(g, [[px + 4, 0], [px, -36]], '#6e4526', 1.8); }
  line(g, [[-24, -34], [24, -34]], OUT, 3.6); line(g, [[-24, -34], [24, -34]], '#7a4a24', 2);
  for (let k = 0; k < 6; k++) { const fx = -17 + k * 7; line(g, [[fx, -34], [fx, -30]], '#4a3a2a', 1); toon(g, blob([[fx - 2.2, -30], [fx, -32], [fx + 2.2, -30], [fx + 1.4, -18], [fx, -16], [fx - 1.4, -18]], 0.5), k % 2 ? '#a8b4bc' : '#c2a070', { sd: 0.5, hd: 0.5, lw: 0.9 }); }
  snowLump(g, rrect(-25, -38, 50, 3.4, 1.7), { sd: 0.3, hd: 0.3, lw: 0.9 });
  g.restore();
}
// upturned rowboat on the shore
function snowBoat(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale((e.flip ? -1 : 1) * s, s);
  snowShadow(g, 8, 3, 38, 8, 0.3);
  const hull = new Path2D(); hull.moveTo(-36, -2); hull.quadraticCurveTo(-30, -20, 0, -21); hull.quadraticCurveTo(30, -20, 38, -6); hull.lineTo(36, 0); hull.lineTo(-34, 2); hull.closePath();
  toon(g, hull, '#7a5032', { sd: 2, hd: 1, lw: 1.5, detail: c => { c.strokeStyle = 'rgba(40,22,10,0.5)'; c.lineWidth = 1.1; for (const yy of [-6, -11, -16]) { c.beginPath(); c.moveTo(-32, yy + 3); c.quadraticCurveTo(0, yy - 2, 34, yy + 1); c.stroke(); } } });
  snowLump(g, blob([[-26, -17], [0, -24], [26, -17], [10, -14], [-12, -14]], 0.45), { sd: 0.6, hd: 0.5, lw: 1.1 });
  g.restore();
}
// wooden pier reaching out onto the ice (x1,y1 shore -> x2,y2)
function snowDock(g, x1, y1, x2, y2, s, R) {
  const L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1), w = 30 * s;
  g.save(); g.translate(x1, y1); g.rotate(a);
  snowShadow(g, L / 2, w * 0.6, L * 0.55, 10, 0.3);
  for (let u = 10; u < L; u += 34) for (const v of [-w / 2 + 2, w / 2 - 2]) toon(g, rrect(u - 3, v - 2, 6, 16, 2), '#5a3c24', { sd: 0.5, hd: 0.3, lw: 1.2 });
  toon(g, rrect(0, -w / 2, L, w, 3), '#8a6038', { sd: 2, hd: 1, lw: 1.6, detail: c => { c.strokeStyle = 'rgba(50,25,10,0.5)'; c.lineWidth = 1.2; for (let u = 8; u < L; u += 9) { c.beginPath(); c.moveTo(u, -w / 2); c.lineTo(u, w / 2); c.stroke(); } c.fillStyle = 'rgba(244,248,252,0.85)'; for (let k = 0; k < L / 8; k++) { c.beginPath(); c.ellipse(R() * L, (R() - 0.5) * w * 0.8, 3 + R() * 7, 1.5 + R() * 3, 0, 0, PI * 2); c.fill(); } } });
  g.restore();
}

// faceted rock knoll from an outline (local coords): vertical facets with lit/shaded planes, a snow cap with a scalloped lower edge
function snowKnoll(g, pts, o = {}) {
  const base = o.color || '#7c8592', ink = o.ink || '#262a36', seed = o.seed || 41;
  const P = blob(pts, 0.22), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  toon(g, P, base, { sd: 4, hd: 2, lw: 2, outline: ink, light: light(base, 0.14), shade: dark(base, 0.12), detail: c => {
    if (o.radial) {
      // wedge facets fanning out from the opening, like rock split around a carved or worn mouth
      const [ox, oy] = o.radial, Rr = (maxX - minX) * 1.2;
      for (let a = PI * 0.96, k = 0; a < PI * 2.04; k++) {
        const da = 0.16 + snowHash(k, seed, 43) * 0.2, a1 = a + da, f = snowHash(k, seed, 45), am = a + da * (0.35 + snowHash(k, seed, 44) * 0.3);
        c.fillStyle = alpha(f < 0.35 ? light(base, 0.1) : f < 0.7 ? base : dark(base, 0.07), 0.92); c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + C(a) * Rr, oy + S(a) * Rr); c.lineTo(ox + C(a1) * Rr, oy + S(a1) * Rr); c.closePath(); c.fill();
        c.fillStyle = alpha(dark(base, 0.2), 0.7); c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + C(am) * Rr, oy + S(am) * Rr); c.lineTo(ox + C(a1) * Rr, oy + S(a1) * Rr); c.closePath(); c.fill();
        c.strokeStyle = alpha(ink, 0.42); c.lineWidth = 1.3; c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + C(a1) * Rr, oy + S(a1) * Rr); c.stroke();
        for (let q = 0; q < 2; q++) { const r0 = 90 + snowHash(k, q, 46) * 150, b0 = a + da * 0.1, b1 = a1 - da * 0.1; c.strokeStyle = alpha(ink, 0.32); c.beginPath(); c.moveTo(ox + C(b0) * r0, oy + S(b0) * r0); c.lineTo(ox + C((b0 + b1) / 2) * (r0 + 6), oy + S((b0 + b1) / 2) * (r0 + 6)); c.lineTo(ox + C(b1) * r0, oy + S(b1) * r0); c.stroke(); }
        a = a1;
      }
      if (o.detail) o.detail(c);
      return;
    }
    for (let x = minX - 10, k = 0; x < maxX + 10; k++) {
      const w = 34 + snowHash(k, seed, 43) * 30, x1 = x + w, r = x + w * (0.4 + snowHash(k, seed, 44) * 0.3), f = snowHash(k, seed, 45);
      c.fillStyle = alpha(f < 0.35 ? light(base, 0.08) : f < 0.7 ? base : dark(base, 0.06), 0.9); c.fillRect(x, minY - 20, w, maxY - minY + 40);
      c.fillStyle = alpha(dark(base, 0.2), 0.75); c.beginPath(); c.moveTo(r + 6, minY - 20); c.lineTo(x1, minY - 20); c.lineTo(x1, maxY + 20); c.lineTo(r - 4, maxY + 20); c.closePath(); c.fill();
      c.strokeStyle = alpha(ink, 0.45); c.lineWidth = 1.3; c.beginPath(); c.moveTo(r + 6, minY - 20); c.lineTo(r - 4, maxY + 20); c.stroke();
      c.strokeStyle = alpha(ink, 0.3); c.beginPath(); c.moveTo(x1, minY - 20); c.lineTo(x1, maxY + 20); c.stroke();
      for (let q = 0; q < 2; q++) { const yy = minY + (maxY - minY) * (0.3 + snowHash(k, q, 46) * 0.6); c.strokeStyle = alpha(ink, 0.35); c.beginPath(); c.moveTo(x + 2, yy); c.lineTo(x + w * 0.5, yy + 3); c.lineTo(x1 - 2, yy - 1); c.stroke(); }
      x = x1;
    }
    if (o.detail) o.detail(c);
  } });
  // snow cap: the crown of the outline down to a scalloped edge that tapers into the silhouette at both ends
  const yCap = minY + (maxY - minY) * (o.cap ?? 0.32);
  const ring = snowResample([...pts.slice(1), pts[0]], 6).filter(([x, y]) => y < yCap);
  if (ring.length > 3) {
    const n = ring.length, low = ring.map(([x, y], i) => { const t = i / (n - 1); return [x + ((minX + maxX) / 2 - x) * 0.06 * S(t * PI), y + (8 + 30 * S(t * PI)) * (0.85 + snowHash(i, seed, 48) * 0.3)]; });
    snowHeap(g, low.filter((_, i) => i % 3 === 1).map(([x, y], i) => [x, y - 4, 11 + snowHash(i, seed, 49) * 9, 0.5]));
    g.fillStyle = SN.snow; g.fill(blob([...ring, ...low.slice().reverse()], 0.2));
    g.save(); g.clip(blob([...ring, ...low.slice().reverse()], 0.2)); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round'; snowLine(g, ring.map(([x, y]) => [x - 3, y + 6])); g.restore();
    g.strokeStyle = ink; g.lineWidth = 2; g.lineCap = 'round'; g.lineJoin = 'round'; snowLine(g, ring);
  }
  return P;
}
// ---- Ironvein Hold (dwarven) ----
const STONE_D = '#8f8a84', INK2 = '#262a36', BRASS = '#c9993e';
function snowGuardian(g, x, y, s, flip) {
  g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
  toon(g, rrect(-20, -12, 40, 12, 2), '#7e7a74', { sd: 0.8, hd: 0.5, lw: 1.4, outline: INK2 });
  toon(g, poly([[-16, -12], [-20, -62], [-12, -78], [12, -78], [20, -62], [16, -12]]), '#9a958e', { sd: 2.4, hd: 1.2, lw: 1.6, outline: INK2, detail: c => { c.strokeStyle = 'rgba(30,30,40,0.35)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-15, -40); c.lineTo(15, -40); c.stroke(); } });
  toon(g, poly([[-14, -76], [14, -76], [9, -46], [0, -36], [-9, -46]]), '#b2ada6', { sd: 1.2, hd: 0.8, lw: 1.4, outline: INK2, detail: c => { c.strokeStyle = 'rgba(30,30,40,0.3)'; c.lineWidth = 1; for (const xx of [-6, 0, 6]) { c.beginPath(); c.moveTo(xx, -72); c.lineTo(xx * 0.6, -44); c.stroke(); } } });
  toon(g, circle(0, -86, 11), '#a39e97', { sd: 1.4, hd: 0.8, lw: 1.4, outline: INK2 });
  toon(g, poly([[-13, -86], [-12, -98], [0, -104], [12, -98], [13, -86]]), '#8a857e', { sd: 1, hd: 0.6, lw: 1.4, outline: INK2 });
  toon(g, poly([[-12, -95], [-24, -104], [-14, -92]]), '#b2ada6', { sd: 0.4, hd: 0.3, lw: 1.1, outline: INK2 });
  toon(g, poly([[12, -95], [24, -104], [14, -92]]), '#b2ada6', { sd: 0.4, hd: 0.3, lw: 1.1, outline: INK2 });
  toon(g, rrect(-3, -60, 6, 52, 2), '#8a857e', { sd: 0.6, hd: 0.3, lw: 1.2, outline: INK2 });
  toon(g, rrect(-12, -14, 24, 12, 2), '#8a857e', { sd: 0.8, hd: 0.5, lw: 1.3, outline: INK2 });
  snowLump(g, blob([[-13, -97], [0, -106], [13, -97], [6, -95], [-6, -95]], 0.4), { sd: 0.4, hd: 0.3, lw: 1 });
  snowLump(g, blob([[-20, -64], [-14, -72], [-8, -66], [-14, -62]], 0.4), { sd: 0.3, hd: 0.2, lw: 0.9 });
  snowLump(g, blob([[8, -66], [14, -72], [20, -64], [14, -62]], 0.4), { sd: 0.3, hd: 0.2, lw: 0.9 });
  g.restore();
}
function snowBrazier(g, x, y, s) {
  toon(g, rrect(x - 6 * s, y - 22 * s, 12 * s, 22 * s, 2), '#7e7a74', { sd: 0.8, hd: 0.4, lw: 1.3, outline: INK2 });
  toon(g, poly([[x - 12 * s, y - 26 * s], [x + 12 * s, y - 26 * s], [x + 8 * s, y - 20 * s], [x - 8 * s, y - 20 * s]]), '#5a5a62', { sd: 0.5, hd: 0.4, lw: 1.2 });
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, x, y - 34 * s, 30 * s, '#ff9a30', 0.7); g.restore();
  flat(g, blob([[x - 8 * s, y - 26 * s], [x - 5 * s, y - 36 * s], [x, y - 46 * s], [x + 5 * s, y - 35 * s], [x + 8 * s, y - 26 * s]], 0.7), '#ffae3a', 1.1, '#7a2a08');
  flat(g, blob([[x - 3.5 * s, y - 26 * s], [x, y - 37 * s], [x + 3.5 * s, y - 26 * s]], 0.7), '#fff3a0', 0);
  snowLight(x, y - 6 * s, 90 * s, '#ff9a3a', 0.45); snowSmoke(x, y - 48 * s, 0.6);
}
// the great carved gate of Ironvein Hold, set into the mountain (anchor: threshold centre)
function snowDwarfGate(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 12, 10, 190, 34, 0.36);
  // rock surround: a faceted knoll the hall is cut into
  snowKnoll(g, [[-196, 6], [-206, -110], [-198, -158], [-180, -198], [-146, -238], [-118, -260], [-76, -282], [-38, -290], [12, -293], [58, -287], [102, -272], [140, -256], [166, -228], [192, -194], [205, -146], [210, -100], [200, 6]], { color: '#7c8592', seed: 51, radial: [0, -60] });
  // threshold steps
  for (let k = 2; k >= 0; k--) { const w = 140 + k * 26; toon(g, rrect(-w / 2, -6 + k * 7, w, 9, 2), k ? '#9c978f' : '#a8a39b', { sd: 1, hd: 0.6, lw: 1.3, outline: INK2 }); snowLump(g, rrect(-w / 2 - 2, -8 + k * 7, w * 0.3, 3, 1.5), { sd: 0.2, hd: 0.2, lw: 0.8 }); }
  // the doorway: dark hall, warm forge-light deep inside
  const ow = 96, oh = 146;
  const door = poly([[-ow / 2, -4], [-ow / 2, -oh + 22], [-ow / 2 + 22, -oh], [ow / 2 - 22, -oh], [ow / 2, -oh + 22], [ow / 2, -4]]);
  toon(g, door, '#12141c', { sd: 0, hd: 0, lw: 2, outline: INK2 });
  g.save(); g.clip(door); g.fillStyle = lg(g, 0, -oh, 0, 0, [[0, 'rgba(10,12,20,1)'], [0.6, 'rgba(40,24,16,1)'], [1, 'rgba(120,60,24,1)']]); g.fillRect(-ow, -oh, ow * 2, oh); g.globalCompositeOperation = 'lighter'; glow(g, 0, -20, 70, '#ff8a2a', 0.5); g.restore();
  snowLight(0, 6, 120, '#ff9a3a', 0.35);
  // the great doors, swung inward
  for (const sd of [-1, 1]) {
    const p = poly([[sd * ow / 2, -4], [sd * ow / 2, -oh + 22], [sd * (ow / 2 - 26), -oh + 32], [sd * (ow / 2 - 26), -14]]);
    toon(g, p, '#6a4a2a', { sd: 1, hd: 0.5, lw: 1.6, outline: INK2, detail: c => { c.fillStyle = '#4a4a52'; for (const yy of [-30, -70, -110]) { c.beginPath(); c.moveTo(sd * ow / 2, yy); c.lineTo(sd * (ow / 2 - 26), yy - 4); c.lineTo(sd * (ow / 2 - 26), yy + 4); c.lineTo(sd * ow / 2, yy + 8); c.fill(); } c.fillStyle = BRASS; for (const yy of [-28, -68, -108]) for (const u of [4, 14]) { c.beginPath(); c.arc(sd * (ow / 2 - u), yy + 2 - u * 0.15, 1.6, 0, PI * 2); c.fill(); } } });
  }
  // pillars with carved bands and glowing runes
  for (const sd of [-1, 1]) {
    const px = sd * (ow / 2 + 26);
    toon(g, rect(px - 26, -188, 52, 188), STONE_D, { sd: 2.6, hd: 1.2, lw: 1.8, outline: INK2, light: '#b0aba4', detail: c => {
      wallBricks(c, px - 26, -188, px + 26, 0, { rowH: 16, bw: 26, seed: 31, color: 'rgba(30,30,40,0.3)' });
      c.fillStyle = 'rgba(40,38,44,0.35)'; for (const yy of [-150, -60]) c.fillRect(px - 26, yy, 52, 9);
      c.fillStyle = '#6f6a64'; c.fillRect(px - 10, -140, 20, 70);
      c.strokeStyle = 'rgba(255,170,70,0.85)'; c.lineWidth = 1.6; c.beginPath(); for (let k = 0; k < 6; k++) { const yy = -134 + k * 11; c.moveTo(px - 5, yy); c.lineTo(px + 5, yy + 4); c.lineTo(px - 5, yy + 8); } c.stroke();
    } });
    toon(g, rect(px - 34, -204, 68, 18), '#8a857e', { sd: 1, hd: 0.6, lw: 1.6, outline: INK2 });
    snowLump(g, blob([[px - 36, -205], [px - 10, -212], [px + 20, -211], [px + 36, -205], [px + 14, -201], [px - 16, -201]], 0.4), { sd: 0.6, hd: 0.5, lw: 1.1 });
  }
  // lintel and stepped crown with the anvil seal of Ironvein
  toon(g, poly([[-110, -204], [110, -204], [110, -230], [70, -230], [56, -252], [-56, -252], [-70, -230], [-110, -230]]), '#9a958e', { sd: 2, hd: 1, lw: 1.8, outline: INK2, light: '#b6b1aa', detail: c => { c.fillStyle = 'rgba(40,38,44,0.3)'; c.fillRect(-110, -220, 220, 5); } });
  toon(g, circle(0, -224, 21), '#3a3a42', { sd: 1, hd: 0.8, lw: 1.6, outline: INK2 });
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 0, -224, 40, '#ffb04a', 0.45); g.restore();
  toon(g, poly([[-13, -230], [13, -230], [8, -224], [4, -224], [6, -214], [-6, -214], [-4, -224], [-8, -224]]), BRASS, { sd: 0.6, hd: 0.6, lw: 1.1 });
  g.strokeStyle = 'rgba(255,190,90,0.9)'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, -224, 17, 0, PI * 2); g.stroke();
  snowLump(g, blob([[-112, -231], [-70, -234], [-56, -256], [56, -256], [70, -234], [112, -231], [80, -228], [40, -248], [-40, -248], [-80, -228]], 0.25), { sd: 1, hd: 0.7, lw: 1.2 });
  // icicles along the lintel
  for (let xx = -104; xx < 106; xx += 9 + R() * 8) { const L = 5 + R() * 12; toon(g, poly([[xx - 2, -204], [xx + 2, -204], [xx, -204 + L]]), '#d8f1fc', { sd: 0.3, hd: 0.4, lw: 0.9, outline: '#3a5a7a', light: '#ffffff' }); }
  // guardian statues and braziers
  snowGuardian(g, -150, 4, 1.05, false); snowGuardian(g, 150, 4, 1.05, true);
  snowBrazier(g, -86, 18, 1); snowBrazier(g, 86, 18, 1);
  g.restore();
}
// round stone bastion with a cannon on top
function snowBastion(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 22, 6, 62, 16, 0.36);
  const yt = cylinder(g, 0, 0, 38, 14, e.h || 86, '#8f8a84', { rowH: 11, cols: 9, seed: 7, topColor: '#7e7a74', bands: [12], bandColor: '#5d6168' });
  merlons(g, 0, yt, 38, 14, 'back', '#8f8a84', { n: 10, h: 10, w: 10 });
  // cannon peeking over the parapet
  const d = e.dir || 1;
  toon(g, capsule(0, yt - 4, d * 34, yt + 4, 6, 4.6), '#b07a36', { sd: 1.2, hd: 0.8, lw: 1.3, light: '#e0b060' });
  toon(g, circle(d * 34, yt + 4, 4.6), '#2a2420', { sd: 0, hd: 0, lw: 1.1 });
  merlons(g, 0, yt, 38, 14, 'front', '#8f8a84', { n: 10, h: 10, w: 10 });
  for (let k = 0; k < 10; k++) { const a = (k / 10) * PI * 2; if (S(a) < -0.05) continue; snowLump(g, ellipse(C(a) * 38, yt + S(a) * 14 - 11, 5, 2.4), { sd: 0.2, hd: 0.2, lw: 0.8 }); }
  for (const yy of [-40, -66]) toon(g, rrect(-2.5, yy, 5, 12, 2), '#1e1a20', { sd: 0, hd: 0, lw: 1 });
  if (e.banner !== false) { pole(g, -24, yt - 46, yt - 4, 2.4, '#5a3c24'); banner(g, -23, yt - 44, 15, 22, e.banner || '#b5651d', { tail: true, wave: 1, emblem: (c, ex, ey) => snowEmblem(c, ex, ey, 0.8, 'anvil') }); }
  snowSoft(g, 0, 2, 44, 7);
  g.restore();
}
// bronze field cannon on a wooden carriage (e.dir 1 = facing right)
function snowCannon(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale((e.dir || 1) * s, s);
  snowShadow(g, 6, 2, 34, 7, 0.3);
  snowWheel(g, -6, -9, 9, '#5a3c24');
  toon(g, poly([[-22, -10], [12, -18], [16, -12], [-20, -2]]), '#6e4526', { sd: 0.8, hd: 0.4, lw: 1.3 });
  toon(g, capsule(-14, -14, 26, -24, 7.5, 5.2), '#b07a36', { sd: 1.6, hd: 1, lw: 1.4, light: '#e6b866', detail: c => { c.fillStyle = 'rgba(80,50,20,0.5)'; for (const u of [0.2, 0.55]) { const xx = -14 + 40 * u, yy = -14 - 10 * u; c.fillRect(xx - 1.5, yy - 8, 3, 16); } } });
  toon(g, circle(26, -24, 5.2), '#2a2420', { sd: 0, hd: 0, lw: 1.1 });
  snowWheel(g, -2, -7, 10);
  snowLump(g, blob([[-14, -21], [2, -26], [16, -29], [8, -24], [-8, -19]], 0.4), { sd: 0.3, hd: 0.3, lw: 0.9 });
  for (const [dx, dy] of [[22, 0], [30, 0], [26, -6]]) toon(g, circle(dx, dy - 4, 4), '#3a3a40', { sd: 0.8, hd: 0.6, lw: 1, light: '#8a8a92' });
  g.restore();
}
// dwarven forge: stone furnace with a glowing mouth, anvil, quench barrel
function snowForge(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 16, 4, 64, 13, 0.32);
  toon(g, rrect(-40, -46, 62, 46, 3), '#8f8a84', { sd: 2, hd: 1, lw: 1.7, outline: INK2, detail: c => wallBricks(c, -40, -46, 22, 0, { rowH: 9, bw: 14, seed: 12, tint: true }) });
  toon(g, rrect(-12, -92, 18, 48, 2), '#7e7a74', { sd: 1.2, hd: 0.6, lw: 1.5, outline: INK2, detail: c => wallBricks(c, -12, -92, 6, -44, { rowH: 8, bw: 10, seed: 13 }) });
  snowSmoke(-3, -96, 1.1);
  const mouth = new Path2D(); mouth.moveTo(-30, -4); mouth.lineTo(-30, -22); mouth.arc(-18, -22, 12, PI, 0); mouth.lineTo(-6, -4); mouth.closePath();
  toon(g, mouth, '#ff9a30', { sd: 0, hd: 0, lw: 1.5, outline: INK2 });
  g.save(); g.clip(mouth); g.fillStyle = lg(g, 0, -34, 0, -4, [[0, '#ff7a1a'], [1, '#fff2a0']]); g.fillRect(-32, -36, 30, 34); g.restore();
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, -18, -16, 46, '#ff8a2a', 0.65); g.restore();
  snowLight(-18, 6, 130, '#ff8a2a', 0.5);
  snowLump(g, blob([[-41, -47], [-20, -51], [6, -51], [23, -47], [8, -45], [-20, -45]], 0.4), { sd: 0.5, hd: 0.4, lw: 1 });
  // anvil on a stump
  toon(g, rrect(34, -16, 16, 16, 3), '#7a5232', { sd: 0.8, hd: 0.4, lw: 1.3 });
  toon(g, poly([[28, -26], [56, -26], [52, -21], [47, -21], [48, -16], [36, -16], [37, -21], [32, -21]]), '#4a4a52', { sd: 0.6, hd: 0.6, lw: 1.3, light: '#8a8a94' });
  toon(g, poly([[56, -26], [62, -24], [56, -22]]), '#4a4a52', { sd: 0.2, hd: 0.2, lw: 1 });
  // quench barrel with ice
  toon(g, rrect(-62, -18, 16, 18, 3), '#7a5232', { sd: 0.8, hd: 0.4, lw: 1.3, detail: c => { c.fillStyle = '#4a4a50'; c.fillRect(-63, -14, 18, 2); c.fillRect(-63, -6, 18, 2); } });
  toon(g, ellipse(-54, -18, 8, 3), '#9fd0e8', { sd: 0.3, hd: 0.3, lw: 1 });
  g.restore();
}
function snowRails(g, x1, y1, x2, y2, s, R) {
  const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux, hw = 9 * s;
  for (let u = 4; u < L; u += 12 * s) { const cx = x1 + ux * u, cy = y1 + uy * u; line(g, [[cx - nx * (hw + 4), cy - ny * (hw + 4) * 0.8], [cx + nx * (hw + 4), cy + ny * (hw + 4) * 0.8]], '#3a2a1c', 4.2); line(g, [[cx - nx * (hw + 4), cy - ny * (hw + 4) * 0.8], [cx + nx * (hw + 4), cy + ny * (hw + 4) * 0.8]], '#6e4e30', 2.6); }
  for (const sd of [-1, 1]) { const ax = x1 + nx * hw * sd, ay = y1 + ny * hw * sd * 0.8, bx = x2 + nx * hw * sd, by = y2 + ny * hw * sd * 0.8; line(g, [[ax, ay], [bx, by]], '#22232a', 3.4); line(g, [[ax, ay - 0.8], [bx, by - 0.8]], '#9aa0aa', 1.2); }
  for (let u = 10; u < L; u += 40) if (snowHash(x1 + u, y1, 4) < 0.5) snowSoft(g, x1 + ux * u + nx * 4, y1 + uy * u + ny * 4, 10 * s, 3 * s, 0.8);
}
function snowMineCart(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 6, 2, 28, 6, 0.3);
  for (const wx of [-12, 12]) toon(g, circle(wx, -5, 5), '#3a3a42', { sd: 0.5, hd: 0.4, lw: 1.2 });
  toon(g, poly([[-22, -30], [22, -30], [17, -7], [-17, -7]]), '#5a5e66', { sd: 1.2, hd: 0.8, lw: 1.5, light: '#8a909a', detail: c => { c.fillStyle = '#3a3a42'; c.fillRect(-22, -22, 44, 3); c.fillStyle = BRASS; for (const u of [-16, -6, 6, 16]) { c.beginPath(); c.arc(u, -26, 1.3, 0, PI * 2); c.fill(); } } });
  for (let k = 0; k < 7; k++) { const ox = -16 + k * 5.4, oy = -31 - (k % 2) * 3; toon(g, poly(snowBlobPts(ox, oy, 4.5, 5, R)), k % 3 ? '#4a4648' : '#b06a3a', { sd: 0.5, hd: 0.4, lw: 1, light: k % 3 ? '#7a7678' : '#ffb070' }); }
  snowLump(g, blob([[-14, -36], [-2, -39], [10, -37], [2, -34], [-10, -34]], 0.4), { sd: 0.3, hd: 0.3, lw: 0.9 });
  g.restore();
}
// stack of black-powder kegs
function snowKegs(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 8, 2, 30, 6, 0.3);
  const keg1 = (kx, ky) => { toon(g, rrect(kx - 8, ky - 18, 16, 18, 4), '#7a5232', { sd: 0.8, hd: 0.5, lw: 1.3, detail: c => { c.fillStyle = '#3a3a42'; c.fillRect(kx - 9, ky - 15, 18, 2); c.fillRect(kx - 9, ky - 5, 18, 2); c.fillStyle = '#1d1418'; c.beginPath(); c.arc(kx, ky - 10, 3.2, 0, PI * 2); c.fill(); c.fillStyle = '#c0392b'; c.beginPath(); c.arc(kx, ky - 10, 1.4, 0, PI * 2); c.fill(); } }); snowLump(g, ellipse(kx, ky - 18.5, 7.5, 2.6), { sd: 0.3, hd: 0.3, lw: 0.9 }); };
  keg1(-10, 0); keg1(9, 1); keg1(0, -16);
  line(g, [[9, -8], [24, -4], [30, 2]], '#3a2a1a', 1.4);
  g.restore();
}
// ---- the Queen's chapel ----
function snowChapel(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 40, 8, 150, 28, 0.36);
  const r = house(g, 10, 0, 120, 56, 54, { wall: '#a39e96', wallKind: 'stone', roof: '#4c5566', roofKind: 'shingle', depth: 46, overhang: 8, seed: 41 });
  // side windows (on the depth wall) and buttresses
  for (const k of [0.3, 0.7]) { const wx = 70 + 46 * 0.6 * k, wy = -24 - 46 * 0.35 * k; toon(g, rrect(wx - 3, wy - 12, 6, 18, 3), '#ffd27a', { sd: 0, hd: 0, lw: 1.1 }); }
  // arched door with warm light
  door(g, 10, 0, 22, 34, { color: '#2a1a10', open: true, glowColor: '#ffb040' });
  snowLight(10, 8, 90, '#ffb040', 0.45);
  // rose window of stained glass
  toon(g, circle(10, -46, 11), '#2a2a3a', { sd: 0, hd: 0, lw: 1.5 });
  for (let k = 0; k < 8; k++) { g.fillStyle = ['#e85a5a', '#5a8ae8', '#f2c94a', '#5ac88a'][k % 4]; g.beginPath(); g.moveTo(10, -46); g.arc(10, -46, 9, k * PI / 4, (k + 1) * PI / 4); g.closePath(); g.fill(); }
  toon(g, circle(10, -46, 3), '#fff2b0', { sd: 0, hd: 0, lw: 1 });
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 10, -46, 26, '#ffd27a', 0.35); g.restore();
  snowRoof(g, 10, 120, r.yt, r.ya, 46, 8, R);
  // steeple on the left with a star finial
  const tx = -58;
  toon(g, rect(tx - 20, -128, 40, 128), '#a8a39b', { sd: 2.4, hd: 1.2, lw: 1.8, outline: INK2, detail: c => { wallBricks(c, tx - 20, -128, tx + 20, 0, { rowH: 9, bw: 15, seed: 43, tint: true }); } });
  toon(g, rrect(tx - 6, -110, 12, 22, 6), '#ffd27a', { sd: 0, hd: 0, lw: 1.2 });
  toon(g, rrect(tx - 6, -62, 12, 18, 6), '#2a2a3a', { sd: 0, hd: 0, lw: 1.2 });
  toon(g, rect(tx - 24, -136, 48, 10), '#8f8a84', { sd: 0.8, hd: 0.5, lw: 1.5, outline: INK2 });
  toon(g, poly([[tx - 24, -136], [tx, -212], [tx + 24, -136]]), '#4c5566', { sd: 2, hd: 1, lw: 1.7, outline: INK2 });
  snowLump(g, poly([[tx - 23, -137], [tx - 4, -196], [tx + 3, -170], [tx + 9, -158], [tx + 22, -137], [tx + 8, -140], [tx - 8, -140]]), { sd: 0.8, hd: 0.6, lw: 1.2 });
  pole(g, tx, -228, -210, 2, '#6b5a3a');
  toon(g, star(tx, -232, 8, 0.45, 5), '#e8c860', { sd: 0.6, hd: 0.6, lw: 1.2 });
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, tx, -232, 24, '#ffe28a', 0.35); g.restore();
  snowSoft(g, -10, 2, 90, 8);
  g.restore();
}
function snowGrave(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const n = e.n || 4;
  for (let k = 0; k < n; k++) {
    const gx = (k - (n - 1) / 2) * 22 + (R() - 0.5) * 6, gy = (k % 2) * 8, tilt = (R() - 0.5) * 0.18, h = 18 + R() * 8;
    g.save(); g.translate(gx, gy); g.rotate(tilt);
    snowShadow(g, 6, 2, 12, 3.5, 0.26);
    const p = new Path2D(); p.moveTo(-7, 0); p.lineTo(-7, -h + 7); p.arc(0, -h + 7, 7, PI, 0); p.lineTo(7, 0); p.closePath();
    toon(g, p, '#9aa0a8', { sd: 1, hd: 0.7, lw: 1.3, outline: INK2, light: '#c2c8d0', detail: c => { if (k % 2 === 0) { c.fillStyle = 'rgba(60,64,76,0.6)'; c.fill(star(0, -h + 9, 3.2, 0.45, 5)); } else { c.fillStyle = 'rgba(60,64,76,0.5)'; c.fillRect(-4, -h + 12, 8, 1.4); c.fillRect(-4, -h + 15, 6, 1.4); } } });
    snowLump(g, blob([[-7.5, -h + 7], [-4, -h - 0.5], [4, -h - 0.5], [7.5, -h + 7], [3, -h + 5], [-3, -h + 5]], 0.4), { sd: 0.3, hd: 0.3, lw: 0.9 });
    g.restore();
  }
  g.restore();
}
// statue of Queen Maelis holding a star aloft
function snowMaelis(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const st = '#a9afb8';
  snowShadow(g, 12, 3, 34, 8, 0.32);
  toon(g, rrect(-20, -16, 40, 16, 2), '#8f8a84', { sd: 1, hd: 0.6, lw: 1.5, outline: INK2, detail: c => wallBricks(c, -20, -16, 20, 0, { rowH: 8, bw: 20, seed: 5 }) });
  toon(g, rrect(-24, -22, 48, 7, 2), '#9c978f', { sd: 0.5, hd: 0.4, lw: 1.4, outline: INK2 });
  toon(g, poly([[-15, -22], [-11, -58], [-7, -72], [7, -72], [11, -58], [17, -22]]), st, { sd: 2.4, hd: 1.2, lw: 1.6, outline: INK2, light: '#cfd4dc', detail: c => { c.strokeStyle = 'rgba(40,44,56,0.3)'; c.lineWidth = 1; for (const xx of [-8, -1, 6]) { c.beginPath(); c.moveTo(xx, -60); c.lineTo(xx * 1.5, -23); c.stroke(); } } });
  toon(g, capsule(6, -66, 18, -96, 3.6, 3), st, { sd: 0.8, hd: 0.5, lw: 1.3, outline: INK2 });
  toon(g, star(19, -104, 9, 0.45, 5), '#c8ccd4', { sd: 0.8, hd: 0.8, lw: 1.3, outline: INK2 });
  toon(g, circle(-1, -80, 7.5), st, { sd: 1, hd: 0.6, lw: 1.4, outline: INK2 });
  toon(g, poly([[-7, -86], [-6, -93], [-3, -89], [-1, -95], [1, -89], [4, -93], [5, -86]]), '#c8ccd4', { sd: 0.3, hd: 0.3, lw: 1 });
  snowLump(g, blob([[-8, -86], [-1, -92], [6, -86], [2, -84], [-4, -84]], 0.4), { sd: 0.3, hd: 0.2, lw: 0.9 });
  snowLump(g, blob([[-12, -64], [-6, -70], [0, -66], [-7, -62]], 0.4), { sd: 0.3, hd: 0.2, lw: 0.9 });
  snowLump(g, blob([[12, -108], [19, -114], [26, -108], [19, -105]], 0.4), { sd: 0.3, hd: 0.2, lw: 0.9 });
  snowLump(g, rrect(-25, -25, 30, 4, 2), { sd: 0.3, hd: 0.2, lw: 0.9 });
  g.restore();
}
// ---- the ridge ----
function snowWatchtower(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 24, 4, 46, 10, 0.32);
  const legs = [[-20, 0], [20, 0], [-14, -8], [14, -8]];
  for (const [lx, ly] of legs.slice(2)) { line(g, [[lx, ly], [lx * 0.6, -86]], OUT, 5); line(g, [[lx, ly], [lx * 0.6, -86]], '#5a3c24', 3.2); }
  for (const yy of [-20, -50]) { line(g, [[-19, yy + 8], [19, yy - 12]], OUT, 3.6); line(g, [[-19, yy + 8], [19, yy - 12]], '#6e4526', 2); line(g, [[-19, yy - 12], [19, yy + 8]], OUT, 3.6); line(g, [[-19, yy - 12], [19, yy + 8]], '#6e4526', 2); }
  for (const [lx, ly] of legs.slice(0, 2)) { line(g, [[lx, ly], [lx * 0.6, -86]], OUT, 5.4); line(g, [[lx, ly], [lx * 0.6, -86]], '#6e4526', 3.6); }
  toon(g, rrect(-22, -96, 44, 12, 2), '#7a5232', { sd: 0.8, hd: 0.4, lw: 1.4, detail: c => planks(c, -22, -96, 22, -84, { vertical: true, pw: 5 }) });
  for (const px of [-18, 18]) toon(g, rrect(px - 2, -126, 4, 32, 1), '#5a3c24', { sd: 0.4, hd: 0.2, lw: 1.1 });
  toon(g, poly([[-28, -124], [0, -146], [28, -124]]), '#4e3c30', { sd: 1, hd: 0.6, lw: 1.5 });
  snowLump(g, poly([[-30, -124], [0, -150], [30, -124], [16, -126], [0, -140], [-16, -126]]), { sd: 0.8, hd: 0.6, lw: 1.2 });
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 0, -106, 26, '#ff9a30', 0.6); g.restore();
  flat(g, blob([[-6, -96], [-3, -106], [0, -113], [3, -105], [6, -96]], 0.7), '#ffae3a', 1, '#7a2a08');
  snowLight(0, -10, 80, '#ff9a3a', 0.3);
  if (e.banner) { pole(g, 22, -170, -124, 2, '#5a3c24'); banner(g, 23, -168, 14, 20, e.banner, { tail: true, wave: 1, emblem: (c, ex, ey) => snowEmblem(c, ex, ey, 0.7, e.emblem || 'anvil') }); }
  snowSoft(g, 0, 2, 32, 6);
  g.restore();
}
// avalanche debris: jumbled snow blocks, snapped trunks, rocks
function snowDebris(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 14, 4, 76, 14, 0.32);
  const parts = [];
  for (let k = 0; k < 9; k++) parts.push([(R() - 0.5) * 110, (R() - 0.5) * 22, 9 + R() * 14, R()]);
  parts.sort((a, b) => a[1] - b[1]);
  for (const [px, py, r, kind] of parts) {
    if (kind < 0.22) { const a = (R() - 0.5) * 1.2, L = 26 + R() * 20; toon(g, capsule(px - C(a) * L / 2, py - 6 - S(a) * L / 2, px + C(a) * L / 2, py - 6 + S(a) * L / 2, 4.4, 3.6), '#5c3e28', { sd: 0.8, hd: 0.4, lw: 1.3 }); toon(g, poly([[px + C(a) * L / 2 + 2, py - 10 + S(a) * L / 2], [px + C(a) * L / 2 + 8, py - 6 + S(a) * L / 2], [px + C(a) * L / 2 + 2, py - 2 + S(a) * L / 2]]), '#c8a070', { sd: 0, hd: 0, lw: 1 }); }
    else if (kind < 0.4) toon(g, poly(snowBlobPts(px, py - r * 0.4, r * 0.8, 6, R, 0.75, 0.3)), SN.rock, { sd: 2, hd: 1.2, lw: 1.3, light: SN.rockL });
    else { const pts = snowBlobPts(px, py - r * 0.45, r, 5, R, 0.7, 0.45); snowLump(g, poly(pts), { sd: 2.4, hd: 1.2, lw: 1.3 }); }
  }
  g.restore();
}
// avalanche run-out below a cliff (apex at x,y): a scoured track that spreads into a lumpy debris mound with blocks, rocks and snapped trunks
function snowAvalanche(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale((e.flip ? -1 : 1) * s, s);
  const len = e.len || 160, wd = e.w || 180;
  // scoured track: a soft blue-grey streak widening downhill (no outline, it is just churned snow)
  const tr = [[-10, -6], [10, -6], [wd * 0.3, len * 0.55], [-wd * 0.3, len * 0.55]];
  g.save(); g.filter = 'blur(6px)'; g.fillStyle = 'rgba(140,160,200,0.36)'; g.fill(blob(tr, 0.5)); g.restore();
  g.strokeStyle = 'rgba(118,138,184,0.3)'; g.lineWidth = 1.4; g.lineCap = 'round';
  for (let k = 0; k < 7; k++) { const u = (R() - 0.5) * 1.4, t0 = R() * 0.15; g.beginPath(); g.moveTo(u * 12, len * t0); g.quadraticCurveTo(u * wd * 0.16, len * (t0 + 0.2), u * wd * 0.3, len * (t0 + 0.38)); g.stroke(); }
  // debris mound: one lumpy silhouette, lobed along its front
  snowShadow(g, 12, len * 0.8, wd * 0.62, len * 0.24, 0.3);
  const lumps = [];
  for (let i = 0; i < 34; i++) { const t = 0.42 + Math.pow(R(), 0.6) * 0.5, u = (R() - 0.5) * 2 * (0.45 + (t - 0.42) * 1.1); lumps.push([u * wd * 0.42, len * t, 13 + R() * 13 * (1.2 - Math.abs(u) * 0.6), 0.55]); }
  for (let i = 0; i < 7; i++) { const t = 0.12 + R() * 0.32; lumps.push([(R() - 0.5) * wd * 0.6 * (t + 0.15), len * t, 7 + R() * 8, 0.55]); }
  snowHeap(g, lumps, { shade: '#bccadc' });
  // tumbled blocks, rocks and snapped trunks resting on the mound
  const parts = [];
  for (let i = 0; i < 18; i++) { const t = 0.4 + R() * 0.52, u = (R() - 0.5) * 2 * (0.35 + (t - 0.4) * 1.1); parts.push([u * wd * 0.38, len * t, 7 + R() * 8, R()]); }
  parts.sort((p, q) => p[1] - q[1]);
  for (const [px, py, r, kind] of parts) {
    if (kind < 0.16) { const a = (R() - 0.5) * 1.4, L = 30 + R() * 20, ex = px + C(a) * L / 2, ey = py - 4 + S(a) * L / 2; toon(g, capsule(px - C(a) * L / 2, py - 4 - S(a) * L / 2, ex, ey, 4.2, 3.4), SN.bark, { sd: 0.8, hd: 0.4, lw: 1.3 }); toon(g, poly([[ex, ey - 4], [ex + 8, ey - 2], [ex + 3, ey], [ex + 7, ey + 3], [ex, ey + 4]]), '#d8b484', { sd: 0, hd: 0, lw: 1 }); snowLump(g, ellipse(px - 2, py - 8, L * 0.22, 2.2), { sd: 0.3, hd: 0.2, lw: 0.9 }); }
    else if (kind < 0.3) toon(g, poly(snowBlobPts(px, py - r * 0.4, r * 0.8, 6, R, 0.75, 0.3)), SN.rock, { sd: 2, hd: 1.2, lw: 1.3, light: SN.rockL });
    else { snowShadow(g, px + r * 0.5, py + r * 0.1, r * 1.1, r * 0.4, 0.2); snowLump(g, blob(snowBlobPts(px, py - r * 0.5, r, 5, R, 0.72, 0.35), 0.25), { sd: 2.6, hd: 1.2, lw: 1.2, shade: '#aebfd6' }); }
  }
  g.restore();
}
// ---- the wyrm's peak ----
function snowIceCave(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 10, 14, 230, 40, 0.38);
  snowKnoll(g, [[-230, 30], [-250, -60], [-238, -120], [-214, -170], [-176, -214], [-140, -250], [-92, -274], [-40, -290], [16, -292], [70, -284], [122, -264], [170, -236], [206, -196], [232, -150], [250, -96], [254, -40], [236, 30]], { color: '#6e7a8c', seed: 57, radial: [0, -40], detail: c => {
    // glassy ice veins in the rock
    c.fillStyle = 'rgba(160,216,240,0.5)'; for (let k = 0; k < 9; k++) { const a = R() * PI, rr = 130 + R() * 90; c.beginPath(); c.ellipse(C(a) * rr * 0.95, -110 - S(a) * rr * 0.65, 18 + R() * 26, 7 + R() * 10, (R() - 0.5), 0, PI * 2); c.fill(); }
  } });
  // the maw
  const mw = 112, mh = 150;
  const maw = new Path2D(); maw.moveTo(-mw, 0); maw.bezierCurveTo(-mw * 1.05, -mh * 0.8, -mw * 0.6, -mh * 1.15, 0, -mh * 1.15); maw.bezierCurveTo(mw * 0.6, -mh * 1.15, mw * 1.05, -mh * 0.8, mw, 0); maw.closePath();
  toon(g, maw, '#0c1424', { sd: 0, hd: 0, lw: 2.4, outline: INK2 });
  g.save(); g.clip(maw);
  g.fillStyle = lg(g, 0, -mh * 1.15, 0, 0, [[0, '#060a14'], [0.55, '#0e1a30'], [1, '#2a5a86']]); g.fillRect(-mw * 1.2, -mh * 1.2, mw * 2.4, mh * 1.3);
  g.globalCompositeOperation = 'lighter'; glow(g, 0, -10, 120, '#5ac8ff', 0.55); glow(g, 0, -70, 60, '#3a7aff', 0.25);
  for (const ex of [-22, 22]) { glow(g, ex, -96, 10, '#9ff0ff', 0.9); }
  g.restore();
  snowLight(0, 20, 220, '#7ad8ff', 0.4);
  // ice fangs from the lip and rising from the floor
  for (let k = 0; k < 13; k++) { const t = (k + 0.5) / 13, ax = -mw * 0.95 + t * mw * 1.9, ay = -mh * (0.98 + 0.2 * S(t * PI)) + 6, L = 20 + S(t * PI) * 38 + R() * 16; toon(g, poly([[ax - 6, ay], [ax + 6, ay], [ax + (R() - 0.5) * 3, ay + L]]), '#cdeefc', { sd: 1, hd: 1, lw: 1.3, outline: '#24486a', light: '#ffffff' }); }
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { const ax = sd * (mw - 16 - k * 26), L = 30 - k * 6 + R() * 10; toon(g, poly([[ax - 7, 2], [ax + (R() - 0.5) * 4, 2 - L], [ax + 7, 2]]), '#cdeefc', { sd: 1, hd: 1, lw: 1.3, outline: '#24486a', light: '#ffffff' }); }
  // crystal clusters on the flanks
  for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) { const cx = sd * (mw + 30 + k * 22), cy = -10 - k * 18, h = 40 + R() * 40; toon(g, poly([[cx - 8, cy], [cx - 6 + sd * 4, cy - h * 0.8], [cx + sd * 6, cy - h], [cx + 8, cy - h * 0.7], [cx + 9, cy]]), '#b8e8fb', { sd: 1.4, hd: 1.4, lw: 1.4, outline: '#24486a', light: '#ffffff' }); }
  g.save(); g.globalCompositeOperation = 'lighter'; for (const sd of [-1, 1]) glow(g, sd * (mw + 60), -50, 70, '#8ae0ff', 0.25); g.restore();
  g.restore();
}
function snowIceSpire(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 14, 3, 40, 9, 0.3);
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 0, -40, 60, '#8ae0ff', 0.3); g.restore();
  const n = 4;
  for (let k = 0; k < n; k++) { const cx = (k - 1.5) * 12, h = (k === 1 || k === 2 ? 70 : 42) + R() * 26, lean = (k - 1.5) * 5, w = 8 + R() * 4; toon(g, poly([[cx - w, 2], [cx - w * 0.8 + lean * 0.6, -h * 0.82], [cx + lean, -h], [cx + w * 0.8 + lean * 0.6, -h * 0.78], [cx + w, 2]]), k % 2 ? '#bfeafc' : '#a6dcf4', { sd: 2, hd: 2, lw: 1.4, outline: '#24486a', light: '#ffffff', detail: c => { c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx - w * 0.3, -4); c.lineTo(cx - w * 0.2 + lean * 0.6, -h * 0.7); c.stroke(); } }); }
  snowSoft(g, 0, 2, 34, 6);
  g.restore();
}
// giant bones half-buried in snow: e.kind 'ribs' | 'skull'
function snowBones(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale((e.flip ? -1 : 1) * s, s);
  const bone = '#e8e0cc';
  if (e.kind === 'skull') {
    snowShadow(g, 10, 3, 46, 10, 0.3);
    toon(g, blob([[-40, -4], [-36, -26], [-12, -38], [20, -34], [40, -18], [44, -4], [20, 2], [-10, 2]], 0.4), bone, { sd: 2, hd: 1, lw: 1.6, light: '#fff8e8' });
    for (const [ex, ey] of [[-14, -22], [8, -22]]) flat(g, ellipse(ex, ey, 7, 5), '#3a2a2a', 1.2);
    toon(g, poly([[-30, -30], [-58, -58], [-40, -26]]), '#d8cfb8', { sd: 0.8, hd: 0.6, lw: 1.3 });
    toon(g, poly([[22, -32], [40, -66], [32, -28]]), '#d8cfb8', { sd: 0.8, hd: 0.6, lw: 1.3 });
    for (let k = 0; k < 5; k++) toon(g, poly([[28 + k * 3, -6], [30 + k * 3, 4], [32 + k * 3, -6]]), '#f2ecdc', { sd: 0, hd: 0, lw: 0.9 });
    snowLump(g, blob([[-34, -28], [-12, -40], [16, -36], [4, -30], [-18, -30]], 0.4), { sd: 0.5, hd: 0.4, lw: 1 });
  } else {
    snowShadow(g, 10, 4, 90, 14, 0.3);
    for (let k = 0; k < 6; k++) {
      const bx = -60 + k * 24, h = 46 - Math.abs(k - 2.5) * 6;
      const p = new Path2D(); p.moveTo(bx - 10, 0); p.quadraticCurveTo(bx - 14, -h, bx + 8, -h * 0.9); p.quadraticCurveTo(bx - 4, -h * 0.7, bx - 3, 0); p.closePath();
      toon(g, p, bone, { sd: 1, hd: 0.6, lw: 1.4, light: '#fff8e8' });
      snowLump(g, ellipse(bx - 6, -h * 0.84, 6, 2.6), { sd: 0.3, hd: 0.2, lw: 0.9 });
    }
    toon(g, rrect(-74, -8, 152, 9, 4.5), '#d8cfb8', { sd: 0.6, hd: 0.4, lw: 1.3 });
    snowSoft(g, 0, 2, 86, 8);
  }
  g.restore();
}
function snowRuin(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 16, 3, 50, 10, 0.3);
  const cols = e.n || 3;
  for (let k = 0; k < cols; k++) {
    const px = (k - (cols - 1) / 2) * 30, h = 30 + snowHash(x + k, y, 3) * 50;
    toon(g, rect(px - 9, -h, 18, h), '#9a958e', { sd: 1.6, hd: 0.8, lw: 1.5, outline: INK2, detail: c => { c.fillStyle = 'rgba(40,38,44,0.3)'; c.fillRect(px - 9, -h * 0.4, 18, 4); } });
    toon(g, poly([[px - 10, -h], [px - 6, -h - 7], [px + 2, -h - 3], [px + 10, -h - 8], [px + 10, -h]]), '#8a857e', { sd: 0.6, hd: 0.4, lw: 1.3, outline: INK2 });
    snowLump(g, blob([[px - 11, -h - 1], [px - 5, -h - 9], [px + 4, -h - 6], [px + 11, -h - 9], [px + 8, -h + 2], [px - 8, -h + 2]], 0.4), { sd: 0.4, hd: 0.3, lw: 1 });
  }
  toon(g, capsule(-40, 6, -2, 12, 8, 8), '#8f8a84', { sd: 1, hd: 0.6, lw: 1.4, outline: INK2 });
  snowLump(g, ellipse(-22, 2, 16, 4), { sd: 0.3, hd: 0.3, lw: 0.9 });
  g.restore();
}

// rocky islet dusted with snow, standing in the frozen lake (a tower plot sits on it)
function snowIsle(g, x, y, s, R, e = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  snowShadow(g, 10, 14, 96, 26, 0.32);
  toon(g, blob([[-86, 8], [-70, -14], [-30, -26], [20, -28], [64, -18], [90, 4], [70, 22], [20, 30], [-40, 28], [-76, 22]], 0.4), '#e9f4f9', { sd: 0, hd: 0, lw: 1.4, outline: '#3a5a7a' });
  for (let k = 0; k < 9; k++) { const a = PI * 0.05 + (k / 8) * PI * 0.9, rx = C(a) * 78, ry = 14 + S(a) * 10; toon(g, poly(snowBlobPts(rx, ry, 9 + R() * 7, 6, R, 0.7)), R() < 0.5 ? SN.rock : '#8a909a', { sd: 1.4, hd: 1, lw: 1.3, outline: '#262a36', light: SN.rockL }); snowLump(g, ellipse(rx - 2, ry - 6, 6, 2.6), { sd: 0.3, hd: 0.2, lw: 0.9 }); }
  snowLump(g, blob([[-78, 4], [-60, -18], [-20, -30], [26, -30], [66, -18], [82, 2], [60, 14], [10, 18], [-44, 16]], 0.4), { sd: 3, hd: 1.4, lw: 1.4 });
  for (let k = 0; k < 4; k++) { const rx = (R() - 0.5) * 120, ry = -24 + R() * 6; if (Math.abs(rx) < 40) continue; toon(g, poly(snowBlobPts(rx, ry, 6 + R() * 5, 6, R, 0.7)), SN.rock, { sd: 1, hd: 0.8, lw: 1.2, outline: '#262a36', light: SN.rockL }); snowLump(g, ellipse(rx - 1, ry - 4, 4.5, 2), { sd: 0.3, hd: 0.2, lw: 0.9 }); }
  g.restore();
}
const SNOW_DECO = {
  snowInn, snowCabin: (g, x, y, s, R, e) => snowCabin(g, x, y, s, R, e), snowStable, snowWood, snowLantern, snowSign, snowSled, snowCrates, snowFire,
  snowBoulder, snowDrift, snowFence: (g, x, y, s, R, e) => snowFence(g, e.x1, e.y1, e.x2, e.y2, s, R),
  snowCairn, snowWagon, snowWell, snowLogPile, snowBanner: snowBannerPole, snowTent, snowPavilion, snowRack, snowCage, snowFishHut, snowDryRack, snowBoat,
  snowPalisade: (g, x, y, s, R, e) => snowPalisade(g, e.x1, e.y1, e.x2, e.y2, s, R, e), snowDock: (g, x, y, s, R, e) => snowDock(g, e.x1, e.y1, e.x2, e.y2, s, R),
  snowDwarfGate, snowBastion, snowCannon, snowForge, snowRails: (g, x, y, s, R, e) => snowRails(g, e.x1, e.y1, e.x2, e.y2, s, R), snowMineCart, snowKegs,
  snowChapel, snowGrave, snowMaelis, snowWatchtower, snowDebris, snowAvalanche, snowIceCave, snowIceSpire, snowBones, snowRuin, snowIsle,
};

// ---------------- atmosphere: chimney smoke, warm light on snow, drifting mist, falling snow, cold vignette ----------------
export function snowAtmosphere(g, { M, R, N, W, H }) {
  // 1. chimney / fire smoke drifting downwind
  for (const sm of SNOW.smoke) {
    let x = sm.x, y = sm.y;
    for (let i = 0; i < 9; i++) {
      const r = (5 + i * 2.6) * sm.s, a = 0.32 * (1 - i / 9);
      g.fillStyle = `rgba(118,124,140,${a * 0.75})`; g.beginPath(); g.ellipse(x + r * 0.18, y + r * 0.2, r, r * 0.8, 0, 0, PI * 2); g.fill();
      g.fillStyle = `rgba(214,218,228,${a * 0.9})`; g.beginPath(); g.ellipse(x - r * 0.12, y - r * 0.12, r * 0.78, r * 0.6, 0, 0, PI * 2); g.fill();
      x += (5 + i * 1.8) * sm.s; y -= (7 + i * 1.2) * sm.s;
    }
  }
  // 2. warm light pooled on the snow (tints the white toward amber; plain alpha blend so it reads on white)
  for (const l of SNOW.lights) {
    g.save(); g.translate(l.x, l.y); g.scale(1, 0.62);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, l.r); gr.addColorStop(0, alpha(l.color, l.a * 0.42)); gr.addColorStop(0.45, alpha(l.color, l.a * 0.16)); gr.addColorStop(1, alpha(l.color, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, l.r, 0, PI * 2); g.fill(); g.restore();
  }
  // 3. low mist banks
  for (let i = 0; i < (M.mist ?? 7); i++) {
    const x = R() * W, y = R() * H, r = 160 + R() * 260;
    g.save(); g.translate(x, y); g.scale(1, 0.32);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, 'rgba(244,248,255,0.16)'); gr.addColorStop(1, 'rgba(244,248,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, PI * 2); g.fill(); g.restore();
  }
  // 4. falling snow (soft large flakes and fine dust)
  const nf = M.flakes ?? 260;
  for (let i = 0; i < nf; i++) {
    const x = R() * W, y = R() * H, big = R() < 0.3, r = big ? 1.8 + R() * 1.4 : 0.9 + R() * 0.8;
    if (big) { g.fillStyle = 'rgba(120,140,180,0.18)'; g.beginPath(); g.arc(x + 1, y + 1.5, r, 0, PI * 2); g.fill(); }
    g.fillStyle = `rgba(255,255,255,${big ? 0.85 : 0.6})`; g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill();
  }
  // 5. cold vignette
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.64);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.7, 'rgba(30,46,86,0.16)'); vg.addColorStop(1, 'rgba(22,32,64,0.48)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
// ===== end of snow theme =====
