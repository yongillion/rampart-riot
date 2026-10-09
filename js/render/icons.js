// Rampart Riot — UI icons: atlas frames ("icon/<name>") with procedural fallbacks
import { Assets, drawFrameFit } from '../core/assets.js';
import { star as drawStar } from './draw.js';

const TAU = Math.PI * 2;

export function drawIcon(ctx, name, x, y, size, o = {}) {
  const f = Assets.frame('icon/' + name);
  if (f) {
    if (o.gray) { ctx.save(); ctx.filter = 'grayscale(1) brightness(0.7)'; drawFrameFit(ctx, f, x, y, size, o.alpha ?? 1); ctx.restore(); }
    else drawFrameFit(ctx, f, x, y, size, o.alpha ?? 1);
    return;
  }
  fallback(ctx, name, x, y, size, o);
}

function fallback(ctx, name, x, y, s, o) {
  ctx.save();
  ctx.translate(x, y);
  const r = s / 2;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const ol = Math.max(1.5, s * 0.06);
  ctx.strokeStyle = '#1d130c'; ctx.lineWidth = ol;
  const fillStroke = (c) => { ctx.fillStyle = o.gray ? '#888' : c; ctx.fill(); ctx.stroke(); };
  switch (name) {
    case 'heart':
      ctx.beginPath(); ctx.moveTo(0, r * 0.8); ctx.bezierCurveTo(-r * 1.2, -r * 0.1, -r * 0.6, -r * 0.95, 0, -r * 0.35); ctx.bezierCurveTo(r * 0.6, -r * 0.95, r * 1.2, -r * 0.1, 0, r * 0.8); fillStroke('#e8323a');
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.35, r * 0.18, r * 0.12, -0.6, 0, TAU); ctx.fill();
      break;
    case 'gold':
      for (const [dx, dy] of [[-r * 0.25, r * 0.15], [r * 0.2, r * 0.25], [0, -r * 0.15]]) { ctx.beginPath(); ctx.ellipse(dx, dy, r * 0.55, r * 0.42, 0, 0, TAU); fillStroke('#f5c232'); ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.ellipse(dx - r * 0.1, dy - r * 0.08, r * 0.2, r * 0.12, 0, 0, TAU); ctx.fill(); }
      break;
    case 'skull': case 'wave':
      ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.7, 0, TAU); fillStroke('#efe7d4');
      ctx.beginPath(); ctx.rect(-r * 0.35, r * 0.35, r * 0.7, r * 0.45); fillStroke('#efe7d4');
      ctx.fillStyle = '#1d130c'; ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.1, r * 0.17, 0, TAU); ctx.arc(r * 0.28, -r * 0.1, r * 0.17, 0, TAU); ctx.fill();
      break;
    case 'star': drawStar(ctx, 0, 0, r, !o.empty); break;
    case 'pause': ctx.fillStyle = '#f4ead2'; ctx.strokeStyle = '#1d130c'; for (const dx of [-r * 0.32, r * 0.32]) { ctx.beginPath(); ctx.rect(dx - r * 0.16, -r * 0.5, r * 0.32, r); ctx.fill(); ctx.stroke(); } break;
    case 'play': ctx.beginPath(); ctx.moveTo(-r * 0.35, -r * 0.55); ctx.lineTo(r * 0.6, 0); ctx.lineTo(-r * 0.35, r * 0.55); ctx.closePath(); fillStroke('#f4ead2'); break;
    case 'speed1': case 'speed2': case 'speed3': {
      const n = +name.slice(5);
      for (let i = 0; i < Math.max(1, n); i++) { const dx = (i - (n - 1) / 2) * r * 0.55; ctx.beginPath(); ctx.moveTo(dx - r * 0.3, -r * 0.45); ctx.lineTo(dx + r * 0.35, 0); ctx.lineTo(dx - r * 0.3, r * 0.45); ctx.closePath(); fillStroke('#f4ead2'); }
      break;
    }
    case 'archer': case 'archer1':
      ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.7); ctx.quadraticCurveTo(r * 0.5, 0, -r * 0.5, r * 0.7); ctx.lineWidth = s * 0.12; ctx.strokeStyle = '#1d130c'; ctx.stroke(); ctx.lineWidth = s * 0.07; ctx.strokeStyle = '#a8743a'; ctx.stroke();
      ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.7); ctx.lineTo(-r * 0.5, r * 0.7); ctx.stroke();
      ctx.strokeStyle = '#1d130c'; ctx.lineWidth = ol; ctx.beginPath(); ctx.moveTo(-r * 0.6, 0); ctx.lineTo(r * 0.75, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.75, 0); ctx.lineTo(r * 0.45, -r * 0.15); ctx.lineTo(r * 0.45, r * 0.15); ctx.closePath(); fillStroke('#cfd6dc');
      break;
    case 'barracks': case 'barracks1':
      ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.65); ctx.lineTo(r * 0.6, -r * 0.65); ctx.lineTo(r * 0.55, r * 0.1); ctx.lineTo(0, r * 0.75); ctx.lineTo(-r * 0.55, r * 0.1); ctx.closePath(); fillStroke('#c0392b');
      ctx.beginPath(); ctx.rect(-r * 0.1, -r * 0.55, r * 0.2, r * 1.1); ctx.fillStyle = '#f2d06a'; ctx.fill();
      break;
    case 'mage': case 'mage1':
      ctx.beginPath(); ctx.moveTo(0, -r * 0.85); ctx.lineTo(r * 0.45, 0); ctx.lineTo(0, r * 0.85); ctx.lineTo(-r * 0.45, 0); ctx.closePath(); fillStroke('#9a6af0');
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(0, -r * 0.7); ctx.lineTo(r * 0.15, -r * 0.1); ctx.lineTo(-r * 0.1, -r * 0.1); ctx.closePath(); ctx.fill();
      break;
    case 'artillery': case 'artillery1':
      ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.55, 0, TAU); fillStroke('#3d3d42');
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.1, r * 0.15, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.35); ctx.quadraticCurveTo(r * 0.6, -r * 0.8, r * 0.85, -r * 0.6); ctx.strokeStyle = '#d8a050'; ctx.lineWidth = s * 0.07; ctx.stroke();
      ctx.fillStyle = '#ffb040'; ctx.beginPath(); ctx.arc(r * 0.85, -r * 0.6, r * 0.12, 0, TAU); ctx.fill();
      break;
    case 'upgrade':
      ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.lineTo(r * 0.7, 0); ctx.lineTo(r * 0.28, 0); ctx.lineTo(r * 0.28, r * 0.75); ctx.lineTo(-r * 0.28, r * 0.75); ctx.lineTo(-r * 0.28, 0); ctx.lineTo(-r * 0.7, 0); ctx.closePath(); fillStroke('#7fd35a');
      break;
    case 'sell':
      ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, TAU); fillStroke('#f5c232');
      ctx.fillStyle = '#7a4a08'; ctx.font = `900 ${Math.round(s * 0.55)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, r * 0.04);
      break;
    case 'rally':
      ctx.beginPath(); ctx.rect(-r * 0.45, -r * 0.75, r * 0.12, r * 1.5); fillStroke('#7a4a20');
      ctx.beginPath(); ctx.moveTo(-r * 0.33, -r * 0.72); ctx.lineTo(r * 0.6, -r * 0.45); ctx.lineTo(-r * 0.33, -r * 0.1); ctx.closePath(); fillStroke('#e8463a');
      break;
    case 'check': ctx.beginPath(); ctx.moveTo(-r * 0.6, 0); ctx.lineTo(-r * 0.15, r * 0.45); ctx.lineTo(r * 0.65, -r * 0.5); ctx.lineWidth = s * 0.2; ctx.strokeStyle = '#1d130c'; ctx.stroke(); ctx.lineWidth = s * 0.11; ctx.strokeStyle = '#7fe35a'; ctx.stroke(); break;
    case 'close': for (const k of [1, -1]) { ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.5 * k); ctx.lineTo(r * 0.5, r * 0.5 * k); ctx.lineWidth = s * 0.2; ctx.strokeStyle = '#1d130c'; ctx.stroke(); ctx.lineWidth = s * 0.11; ctx.strokeStyle = '#f06a5a'; ctx.stroke(); } break;
    case 'lock':
      ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 0.35, Math.PI, 0); ctx.lineWidth = s * 0.12; ctx.stroke(); ctx.lineWidth = ol;
      ctx.beginPath(); ctx.rect(-r * 0.5, -r * 0.15, r, r * 0.8); fillStroke('#d8a842');
      break;
    case 'skyfall':
      ctx.beginPath(); ctx.arc(r * 0.15, r * 0.15, r * 0.45, 0, TAU); fillStroke('#ff7a28');
      ctx.fillStyle = '#ffe080'; ctx.beginPath(); ctx.arc(r * 0.05, r * 0.05, r * 0.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffb040'; ctx.lineWidth = s * 0.08; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.15 - i * r * 0.15, -r * 0.15 - i * r * 0.05); ctx.lineTo(-r * 0.75 - i * r * 0.05, -r * 0.75 + i * r * 0.15); ctx.stroke(); }
      break;
    case 'militia':
      ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.55); ctx.lineTo(r * 0.55, -r * 0.55); ctx.lineTo(r * 0.5, r * 0.15); ctx.lineTo(0, r * 0.7); ctx.lineTo(-r * 0.5, r * 0.15); ctx.closePath(); fillStroke('#4a7ac8');
      ctx.strokeStyle = '#f2d06a'; ctx.lineWidth = s * 0.08; ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.3); ctx.lineTo(r * 0.3, r * 0.3); ctx.moveTo(r * 0.3, -r * 0.3); ctx.lineTo(-r * 0.3, r * 0.3); ctx.stroke();
      break;
    case 'book':
      ctx.beginPath(); ctx.rect(-r * 0.6, -r * 0.55, r * 1.2, r * 1.1); fillStroke('#8a3a2a');
      ctx.fillStyle = '#efe0b8'; ctx.fillRect(-r * 0.45, -r * 0.4, r * 0.9, r * 0.8);
      ctx.strokeStyle = '#8a3a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -r * 0.4); ctx.lineTo(0, r * 0.4); ctx.stroke();
      break;
    case 'gear':
      ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i * TAU / 16, rr = i % 2 ? r * 0.55 : r * 0.75; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); fillStroke('#b8b8c0');
      ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, TAU); ctx.fillStyle = '#3a3a40'; ctx.fill();
      break;
    default:
      ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, TAU); fillStroke('#c8b890');
      ctx.fillStyle = '#1d130c'; ctx.font = `800 ${Math.round(s * 0.36)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(name).slice(0, 2).toUpperCase(), 0, 0);
  }
  ctx.restore();
}
