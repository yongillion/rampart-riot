// Rampart Riot art generator — architecture helpers (cylinders, cones, walls, roofs, crenellations, props)
import { toon, flat, ellipse, circle, rrect, poly, blob, rect, dark, light, mix, alpha, OUT, OL, glow, lg, rg, cylinderBricks, wallBricks, planks, roofTiles, rng, line, stroke, banner, pole } from './toon.js';

export const STONE = '#9a958c', STONE_D = '#6d6860', WOOD = '#8a5a32', WOOD_D = '#5e3a1e', IRON = '#5d6168', BRASS = '#c9993e';

// 3/4-view cylinder body between yBottom and yTop (front visible). Returns {body, top} paths.
export function cylPaths(cx, yb, rx, ry, h) {
  const yt = yb - h;
  const body = new Path2D();
  body.moveTo(cx - rx, yt); body.lineTo(cx - rx, yb);
  body.ellipse(cx, yb, rx, ry, 0, Math.PI, 0, true);
  body.lineTo(cx + rx, yt);
  body.ellipse(cx, yt, rx, ry, 0, 0, Math.PI, false);
  body.closePath();
  const top = new Path2D(); top.ellipse(cx, yt, rx, ry, 0, 0, Math.PI * 2);
  return { body, top, yt };
}

// shaded stone/wood cylinder
export function cylinder(ctx, cx, yb, rx, ry, h, base, o = {}) {
  const { body, top, yt } = cylPaths(cx, yb, rx, ry, h);
  const gr = lg(ctx, cx - rx, 0, cx + rx, 0, [[0, light(base, 0.08)], [0.32, base], [0.75, dark(base, 0.12)], [1, dark(base, 0.22)]]);
  ctx.fillStyle = gr; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  if (o.bricks !== false && o.kind !== 'wood') cylinderBricks(ctx, cx, yt, yb, rx, ry, { rowH: o.rowH || 8, cols: o.cols || Math.max(5, Math.round(rx / 5)), seed: o.seed || 3, tint: true, color: o.mortar });
  if (o.kind === 'wood') { ctx.strokeStyle = alpha('#2a1408', 0.45); ctx.lineWidth = 1; for (let i = 1; i < 9; i++) { const x = cx - rx + (i * 2 * rx) / 9; ctx.beginPath(); ctx.moveTo(x, yt); ctx.lineTo(x, yb + ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2))); ctx.stroke(); } }
  if (o.bands) for (const by of o.bands) { ctx.fillStyle = o.bandColor || IRON; ctx.beginPath(); ctx.ellipse(cx, yt + by, rx + 1, ry, 0, 0, Math.PI); ctx.lineTo(cx - rx - 1, yt + by - 3); ctx.ellipse(cx, yt + by - 3, rx + 1, ry, 0, Math.PI, 0, true); ctx.fill(); }
  if (o.detail) o.detail(ctx, yt);
  ctx.restore();
  ctx.lineJoin = 'round'; ctx.lineWidth = o.lw ?? 1.8; ctx.strokeStyle = OUT; ctx.stroke(body);
  if (o.top !== false) {
    const tc = o.topColor || light(base, 0.05);
    ctx.fillStyle = tc; ctx.fill(top);
    if (o.topDetail) { ctx.save(); ctx.clip(top); o.topDetail(ctx, yt); ctx.restore(); }
    ctx.lineWidth = o.lw ?? 1.8; ctx.stroke(top);
  }
  return yt;
}

// cone roof: base ellipse at yb (rx, ry), apex at ya
export function cone(ctx, cx, yb, rx, ry, ya, base, o = {}) {
  const p = new Path2D();
  p.moveTo(cx - rx, yb);
  p.quadraticCurveTo(cx - rx * 0.35, yb - (yb - ya) * 0.45, cx + (o.tilt || 0), ya);
  p.quadraticCurveTo(cx + rx * 0.35, yb - (yb - ya) * 0.45, cx + rx, yb);
  p.ellipse(cx, yb, rx, ry, 0, 0, Math.PI, false);
  p.closePath();
  ctx.fillStyle = lg(ctx, cx - rx, 0, cx + rx, 0, [[0, light(base, 0.1)], [0.35, base], [1, dark(base, 0.2)]]);
  ctx.fill(p);
  ctx.save(); ctx.clip(p);
  roofTiles(ctx, cx, ya, yb + ry * 0.5, 2, rx, { rows: o.rows || 6, color: alpha(dark(base, 0.35), 0.7) });
  ctx.restore();
  ctx.lineWidth = o.lw ?? 1.8; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke(p);
  // eave rim
  const rim = new Path2D(); rim.ellipse(cx, yb, rx + 1, ry + 0.5, 0, 0, Math.PI, false);
  ctx.lineWidth = 3.2; ctx.strokeStyle = dark(base, 0.3); ctx.stroke(rim);
  return p;
}

// merlons (crenellations) on a cylinder top; part = 'back' | 'front'
export function merlons(ctx, cx, yt, rx, ry, part, base, o = {}) {
  const n = o.n || 10, mh = o.h || 7, mw = o.w || 7;
  const items = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (o.phase || 0);
    const x = cx + Math.cos(a) * rx, y = yt + Math.sin(a) * ry;
    const front = Math.sin(a) > -0.05;
    if ((part === 'front') !== front) continue;
    items.push({ x, y, s: Math.sin(a) });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) {
    const w = mw * (0.75 + 0.25 * Math.abs(Math.cos(Math.asin(Math.max(-1, Math.min(1, it.s))))));
    toon(ctx, rrect(it.x - w / 2, it.y - mh, w, mh + 2, 1.2), it.s > 0 ? base : dark(base, 0.1), { sd: 1.2, hd: 0.6, lw: 1.4 });
  }
}

// ring wall (parapet) around top: draws a short cylinder wall band
export function parapet(ctx, cx, yt, rx, ry, h, base, part) {
  // back part: inner wall visible
  if (part === 'back') {
    const p = new Path2D();
    p.ellipse(cx, yt - h, rx, ry, 0, Math.PI, 0, false);
    p.lineTo(cx + rx, yt);
    p.ellipse(cx, yt, rx, ry, 0, 0, Math.PI, true);
    p.closePath();
    toon(ctx, p, dark(base, 0.08), { sd: 1, hd: 0.5, lw: 1.5 });
  } else {
    const p = new Path2D();
    p.moveTo(cx - rx, yt - h); p.lineTo(cx - rx, yt);
    p.ellipse(cx, yt, rx, ry, 0, Math.PI, 0, true);
    p.lineTo(cx + rx, yt - h);
    p.ellipse(cx, yt - h, rx, ry, 0, 0, Math.PI, false);
    p.closePath();
    ctx.fillStyle = lg(ctx, cx - rx, 0, cx + rx, 0, [[0, light(base, 0.08)], [0.35, base], [1, dark(base, 0.2)]]);
    ctx.fill(p);
    ctx.save(); ctx.clip(p); cylinderBricks(ctx, cx, yt - h, yt + ry, rx, ry, { rowH: 7, cols: 9, seed: 9 }); ctx.restore();
    ctx.lineWidth = 1.7; ctx.strokeStyle = OUT; ctx.stroke(p);
    const lip = new Path2D(); lip.ellipse(cx, yt - h, rx, ry, 0, 0, Math.PI, false);
    ctx.lineWidth = 2.6; ctx.strokeStyle = light(base, 0.12); ctx.stroke(lip);
  }
}

// wooden palisade stakes along an elliptical arc (front or back half)
export function stakes(ctx, cx, yt, rx, ry, part, h, o = {}) {
  const n = o.n || 14;
  const items = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const s = Math.sin(a);
    if ((part === 'front') !== (s > -0.05)) continue;
    items.push({ x: cx + Math.cos(a) * rx, y: yt + s * ry, s });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) {
    const w = 4.4;
    const col = it.s > 0 ? (o.color || '#9a6a3a') : dark(o.color || '#9a6a3a', 0.12);
    toon(ctx, poly([[it.x - w / 2, it.y + 1], [it.x - w / 2, it.y - h], [it.x, it.y - h - 4], [it.x + w / 2, it.y - h], [it.x + w / 2, it.y + 1]]), col, { sd: 1, hd: 0.5, lw: 1.2 });
  }
  if (part === 'front' && o.rail !== false) {
    const rail = new Path2D(); rail.ellipse(cx, yt - h * 0.55, rx, ry, 0, 0.05, Math.PI - 0.05, false);
    ctx.lineWidth = 3.4; ctx.strokeStyle = OUT; ctx.stroke(rail);
    ctx.lineWidth = 1.8; ctx.strokeStyle = o.railColor || '#6b4423'; ctx.stroke(rail);
  }
}

// gable house front (box with pitched roof) centered at cx, ground at yb
export function house(ctx, cx, yb, w, wallH, roofH, o = {}) {
  const x0 = cx - w / 2, x1 = cx + w / 2, yt = yb - wallH;
  const depth = o.depth || 14;
  // side wall (right) for depth
  const side = poly([[x1, yb], [x1, yt], [x1 + depth * 0.6, yt - depth * 0.35], [x1 + depth * 0.6, yb - depth * 0.35]]);
  toon(ctx, side, dark(o.wall || '#b8a07a', 0.14), { sd: 0.8, hd: 0, lw: 1.6, detail: g => { if (o.wallKind === 'logs') { g.strokeStyle = alpha('#2a1408', 0.5); for (let y = yb - 6; y > yt; y -= 7) { g.beginPath(); g.moveTo(x1, y); g.lineTo(x1 + depth, y - depth * 0.5); g.stroke(); } } } });
  // front wall
  const front = rect(x0, yt, w, wallH);
  toon(ctx, front, o.wall || '#b8a07a', { sd: 1.6, hd: 0.8, lw: 1.8, detail: g => {
    if (o.wallKind === 'stone') wallBricks(g, x0, yt, x1, yb, { rowH: 8, bw: 15, seed: o.seed || 2, tint: true });
    else if (o.wallKind === 'logs') { for (let y = yb; y > yt; y -= 7) { toon(g, rrect(x0 - 3, y - 7, w + 6, 7, 3.5), o.wall || '#9a6a3a', { sd: 1, hd: 0.6, lw: 1.1 }); } }
    else if (o.wallKind === 'timber') { planks(g, x0, yt, x1, yb, { vertical: true, pw: 7, seed: o.seed || 4 }); }
    else if (o.wallKind === 'plaster') { g.strokeStyle = alpha('#5a3a1a', 0.85); g.lineWidth = 3; g.strokeRect(x0 + 1.5, yt + 1.5, w - 3, wallH - 3); g.beginPath(); g.moveTo(x0, yt + wallH * 0.5); g.lineTo(x1, yt + wallH * 0.5); g.stroke(); g.beginPath(); g.moveTo(x0 + 3, yt + 3); g.lineTo(cx - 8, yt + wallH * 0.5); g.moveTo(x1 - 3, yt + 3); g.lineTo(cx + 8, yt + wallH * 0.5); g.stroke(); }
    if (o.wallDetail) o.wallDetail(g, x0, yt, x1, yb);
  } });
  // roof
  const ov = o.overhang ?? 8;
  const ya = yt - roofH;
  if (o.roofKind === 'flat') return { x0, x1, yt, ya: yt };
  const roofSide = poly([[cx, ya], [x1 + ov, yt + 4], [x1 + ov + depth * 0.7, yt + 4 - depth * 0.4], [cx + depth * 0.7, ya - depth * 0.4]]);
  toon(ctx, roofSide, dark(o.roof || '#a8452c', 0.1), { sd: 1, hd: 0.6, lw: 1.8, detail: g => { if (o.roofKind === 'thatch') { g.strokeStyle = alpha('#4a3010', 0.5); g.lineWidth = 1; for (let i = 0; i < 26; i++) { const t = i / 26; const x = cx + (x1 + ov - cx) * t; g.beginPath(); g.moveTo(x, ya + (yt + 4 - ya) * t); g.lineTo(x + depth * 0.7, ya + (yt + 4 - ya) * t - depth * 0.4); g.stroke(); } } else { g.strokeStyle = alpha('#2a0e08', 0.45); for (let i = 1; i < 6; i++) { const t = i / 6; g.beginPath(); g.moveTo(cx + (x1 + ov - cx) * t, ya + (yt + 4 - ya) * t); g.lineTo(cx + (x1 + ov - cx) * t + depth * 0.7, ya + (yt + 4 - ya) * t - depth * 0.4); g.stroke(); } } } });
  const gable = poly([[x0 - ov, yt + 4], [cx, ya], [x1 + ov, yt + 4], [x1 + ov - 4, yt + 7], [cx, ya + 6], [x0 - ov + 4, yt + 7]]);
  // gable wall triangle under roof
  toon(ctx, poly([[x0, yt], [cx, ya + 6], [x1, yt]]), o.gable || light(o.wall || '#b8a07a', 0.04), { sd: 1, hd: 0.4, lw: 1.6, detail: g => { if (o.gableDetail) o.gableDetail(g, cx, ya, yt); } });
  toon(ctx, gable, o.roof || '#a8452c', { sd: 1.6, hd: 0.8, lw: 1.9, detail: g => {
    if (o.roofKind === 'thatch') { g.strokeStyle = alpha('#5a3a10', 0.45); g.lineWidth = 1; for (let i = 0; i < 40; i++) { const x = x0 - ov + (i / 40) * (w + 2 * ov); g.beginPath(); g.moveTo(x, yt + 6); g.lineTo(cx + (x - cx) * 0.35, ya + 8); g.stroke(); } }
  } });
  return { x0, x1, yt, ya };
}

export function door(ctx, cx, yb, w, h, o = {}) {
  const p = new Path2D();
  p.moveTo(cx - w / 2, yb); p.lineTo(cx - w / 2, yb - h + w / 2); p.arc(cx, yb - h + w / 2, w / 2, Math.PI, 0); p.lineTo(cx + w / 2, yb); p.closePath();
  toon(ctx, p, o.color || '#2a1a10', { sd: 0, hd: 0, lw: 1.6 });
  if (o.open !== false) {
    const d = new Path2D(); d.moveTo(cx - w / 2 + 1, yb); d.lineTo(cx - w / 2 + 1, yb - h + w / 2); d.lineTo(cx - w * 0.05, yb - h + w * 0.3); d.lineTo(cx - w * 0.05, yb); d.closePath();
    toon(ctx, d, o.wood || '#7a4a24', { sd: 1, hd: 0.5, lw: 1.3, detail: g => { g.strokeStyle = alpha('#2a1408', 0.5); g.lineWidth = 0.8; for (let x = cx - w / 2 + 4; x < cx; x += 4) { g.beginPath(); g.moveTo(x, yb); g.lineTo(x, yb - h); g.stroke(); } } });
  }
  if (o.glowColor) glow(ctx, cx + w * 0.15, yb - h * 0.4, w * 0.8, o.glowColor, 0.35);
}

export function windowArch(ctx, cx, cy, w, h, glowColor) {
  const p = new Path2D(); p.moveTo(cx - w / 2, cy + h / 2); p.lineTo(cx - w / 2, cy - h / 2 + w / 2); p.arc(cx, cy - h / 2 + w / 2, w / 2, Math.PI, 0); p.lineTo(cx + w / 2, cy + h / 2); p.closePath();
  toon(ctx, p, glowColor ? '#ffd27a' : '#1f150e', { sd: 0, hd: 0, lw: 1.4 });
  if (glowColor) { ctx.save(); ctx.clip(p); ctx.fillStyle = lg(ctx, 0, cy - h / 2, 0, cy + h / 2, [[0, '#fff2b0'], [1, glowColor]]); ctx.fillRect(cx - w, cy - h, w * 2, h * 2); ctx.restore(); glow(ctx, cx, cy, w * 2.2, glowColor, 0.35); line(ctx, [[cx, cy - h / 2], [cx, cy + h / 2]], OUT, 1); line(ctx, [[cx - w / 2, cy], [cx + w / 2, cy]], OUT, 1); }
}

// stone foundation ring used under most towers
export function foundation(ctx, rx = 44, ry = 18, h = 9, base = STONE) {
  return cylinder(ctx, 0, 6, rx, ry, h, base, { rowH: 9, cols: 10, seed: 21, topColor: dark(base, 0.02), lw: 1.8 });
}

// stack of cannonballs
export function cannonballs(ctx, x, y, n = 3) {
  const pos = [[0, 0], [7, 0], [3.5, -5.5], [14, 0], [10.5, -5.5], [7, -11]].slice(0, n);
  for (const [dx, dy] of pos) toon(ctx, circle(x + dx, y + dy - 3.5, 3.6), '#3a3a40', { sd: 1, hd: 0.8, lw: 1.1, light: '#8a8a92' });
}
export function keg(ctx, x, y, s = 1, col = '#8a5a2a') {
  toon(ctx, rrect(x - 6 * s, y - 14 * s, 12 * s, 14 * s, 3 * s), col, { sd: 1.2, hd: 0.6, lw: 1.2, detail: g => { g.fillStyle = '#4a4a50'; g.fillRect(x - 7 * s, y - 11 * s, 14 * s, 1.8 * s); g.fillRect(x - 7 * s, y - 4 * s, 14 * s, 1.8 * s); } });
}
export function sandbag(ctx, x, y, w = 12, h = 6, col = '#c2a875') { toon(ctx, rrect(x - w / 2, y - h, w, h, h / 2), col, { sd: 1, hd: 0.6, lw: 1.1 }); }
export function torch(ctx, x, y, ph = 0, h = 16) {
  toon(ctx, rrect(x - 1.4, y - h, 2.8, h, 1), '#5a3a1e', { sd: 0.5, hd: 0.3, lw: 1 });
  toon(ctx, rrect(x - 2.8, y - h - 2, 5.6, 4, 1), '#4a4a50', { sd: 0.5, hd: 0.3, lw: 1 });
  const f = Math.sin(ph * Math.PI * 2) * 0.8;
  glow(ctx, x, y - h - 6, 16, '#ff9a30', 0.55);
  flat(ctx, blob([[x - 3.2, y - h - 2], [x - 2 + f, y - h - 8], [x + f * 1.2, y - h - 13], [x + 2.2 + f, y - h - 7], [x + 3.2, y - h - 2]], 0.7), '#ffae3a', 1, '#7a2a08');
  flat(ctx, blob([[x - 1.4, y - h - 2], [x + f * 0.6, y - h - 8], [x + 1.4, y - h - 2]], 0.7), '#fff3a0', 0);
}
