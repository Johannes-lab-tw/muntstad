// scene.js — the town of Muntstad on a 2D canvas: island, road loop, plots with buildings that grow per level,
// the walking (or driving) avatar, drifting clouds and coin particles that fly to the wallet.
import { avatarSVG, vehicleSVG, svgToDataURL } from './art.js';
import { makerLevel, makerIncome } from './economy.js';

const INK = '#1f2937';
const MAX_PARTICLES = 30;

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function box(ctx, x, y, w, h, fill, r = 8, stroke = INK, lw = 4) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function tri(ctx, x1, y1, x2, y2, x3, y3, fill) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function circle(ctx, x, y, r, fill, stroke = INK, lw = 4) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function star(ctx, cx, cy, r, fill = '#fbbf24') {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function shadow(ctx, x, y, w) {
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, w / 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();
}

function windowGrid(ctx, x, y, cols, rows, w, h, gap, lit) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      box(ctx, x + c * (w + gap), y + r * (h + gap), w, h, lit && (r + c) % 3 === 0 ? '#fde047' : '#bae6fd', 3, INK, 2.5);
    }
  }
}

function tree(ctx, x, y, s = 1) {
  box(ctx, x - 6 * s, y - 14 * s, 12 * s, 26 * s, '#92400e', 4);
  circle(ctx, x, y - 30 * s, 22 * s, '#22c55e');
  circle(ctx, x - 12 * s, y - 20 * s, 14 * s, '#4ade80', INK, 3);
}

// ---------- buildings (bottom-centre anchored at x, y) ----------

function drawLimonade(ctx, x, y, level, t) {
  const s = 1 + (level - 1) * 0.06;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 4, 150);
  box(ctx, -60, -46, 120, 50, '#fde68a', 8);                    // counter
  box(ctx, -66, -60, 132, 16, '#f59e0b', 6);                    // counter top
  box(ctx, -56, -110, 8, 60, '#92400e', 3);                     // posts
  box(ctx, 48, -110, 8, 60, '#92400e', 3);
  for (let i = 0; i < 6; i++) tri(ctx, -72 + i * 24, -104, -48 + i * 24, -104, -60 + i * 24, -84, i % 2 ? '#ef4444' : '#fff'); // awning
  box(ctx, -74, -120, 148, 18, '#ef4444', 6);                  // awning top
  circle(ctx, -22, -36, 11, '#fde047');                          // lemons
  circle(ctx, 8, -30, 11, '#fde047');
  box(ctx, 26, -42, 18, 26, '#fca5a5', 4);                       // jug
  if (level >= 2) { box(ctx, 62, -96, 5, 60, '#6b7280', 2); tri(ctx, 67, -96, 92, -88, 67, -80, '#3b82f6'); }
  if (level >= 3) { box(ctx, -110, -40, 40, 44, '#fde68a', 6); circle(ctx, -90, -52, 20, '#f472b6'); }
  if (level >= 4) { box(ctx, -40, -146, 80, 22, '#fff', 6); ctx.fillStyle = INK; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('LIMO', 0, -129); }
  if (level >= 5) { for (let i = 0; i < 3; i++) star(ctx, -30 + i * 30, -160 + Math.sin(t / 300 + i) * 4, 9); }
  ctx.restore();
}

function drawWasstraat(ctx, x, y, level, t) {
  const s = 1 + (level - 1) * 0.05;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 4, 170);
  box(ctx, -78, -96, 156, 100, '#3b82f6', 12);                  // hall
  box(ctx, -84, -104, 168, 16, '#1d4ed8', 6);                   // roof
  roundRect(ctx, -52, -76, 104, 78, 26);                         // opening
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // little car inside
  box(ctx, -34, -34, 68, 24, '#ef4444', 8);
  box(ctx, -20, -50, 40, 18, '#ef4444', 6);
  circle(ctx, -18, -10, 8, INK, null);
  circle(ctx, 18, -10, 8, INK, null);
  // brushes + drops
  for (let i = 0; i < 3; i++) {
    const dy = (t / 6 + i * 20) % 60;
    circle(ctx, -30 + i * 30, -70 + dy, 4, '#7dd3fc', null);
  }
  box(ctx, -60, -96, 14, 60, '#facc15', 5);
  box(ctx, 46, -96, 14, 60, '#facc15', 5);
  if (level >= 2) { box(ctx, -34, -128, 68, 24, '#fff', 6); ctx.fillStyle = INK; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('WAS', 0, -110); }
  if (level >= 3) { box(ctx, 84, -70, 40, 74, '#60a5fa', 8); circle(ctx, 104, -40, 12, '#0f172a', INK, 3); }
  if (level >= 4) { box(ctx, 84, -100, 6, 34, '#6b7280', 2); tri(ctx, 90, -100, 114, -92, 90, -84, '#22c55e'); }
  if (level >= 5) { for (let i = 0; i < 4; i++) circle(ctx, -60 + i * 40, -140 + Math.sin(t / 250 + i) * 5, 6, i % 2 ? '#f472b6' : '#fde047'); }
  ctx.restore();
}

function drawPizzeria(ctx, x, y, level, t) {
  const s = 1 + (level - 1) * 0.05;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 4, 170);
  box(ctx, -70, -90, 140, 94, '#fecaca', 10);                   // walls
  tri(ctx, -82, -88, 0, -136, 82, -88, '#dc2626');               // roof
  box(ctx, -22, -46, 44, 50, '#92400e', 6);                      // door
  box(ctx, -60, -70, 30, 26, '#bae6fd', 4);                      // windows
  box(ctx, 30, -70, 30, 26, '#bae6fd', 4);
  for (let i = 0; i < 4; i++) box(ctx, -66 + i * 34, -34, 30, 8, i % 2 ? '#fff' : '#ef4444', 2, INK, 2); // awning stripes
  box(ctx, 30, -130, 16, 30, '#6b7280', 3);                      // chimney
  const puff = (t / 40) % 40;
  circle(ctx, 38, -140 - puff, 8 + puff / 6, 'rgba(255,255,255,0.8)', null);
  circle(ctx, 0, -104, 16, '#fbbf24');                           // pizza sign
  for (let i = 0; i < 5; i++) circle(ctx, Math.cos(i * 1.3) * 8, -104 + Math.sin(i * 1.3) * 8, 3, '#ef4444', null);
  if (level >= 2) { box(ctx, 74, -30, 40, 34, '#fde68a', 6); circle(ctx, 94, -40, 18, '#f472b6'); }
  if (level >= 3) { box(ctx, -70, -130, 140, 40, '#fecaca', 10); box(ctx, -50, -122, 30, 24, '#bae6fd', 4); box(ctx, 20, -122, 30, 24, '#bae6fd', 4); tri(ctx, -82, -128, 0, -176, 82, -128, '#dc2626'); }
  if (level >= 4) { box(ctx, -44, -160, 88, 22, '#fff', 6); ctx.fillStyle = '#dc2626'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PIZZA', 0, -143); }
  if (level >= 5) { for (let i = 0; i < 3; i++) star(ctx, -30 + i * 30, -196 + Math.sin(t / 300 + i) * 4, 9); }
  ctx.restore();
}

function drawFabriek(ctx, x, y, level, t) {
  const s = 1 + (level - 1) * 0.05;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 4, 190);
  box(ctx, -84, -86, 168, 90, '#c4b5fd', 8);                    // hall
  for (let i = 0; i < 3; i++) tri(ctx, -84 + i * 56, -86, -56 + i * 56, -118, -28 + i * 56, -86, '#8b5cf6'); // saw roof
  box(ctx, 40, -150, 22, 64, '#6b7280', 4);                      // chimney
  const puff = (t / 35) % 50;
  circle(ctx, 51, -160 - puff, 9 + puff / 5, 'rgba(255,255,255,0.75)', null);
  windowGrid(ctx, -70, -70, 4, 2, 24, 18, 10, true);
  box(ctx, -20, -40, 40, 44, '#6b7280', 6);                      // gate
  // robot sign
  box(ctx, -18, -140, 36, 30, '#e5e7eb', 6);
  circle(ctx, -7, -128, 5, '#3b82f6', INK, 2);
  circle(ctx, 7, -128, 5, '#3b82f6', INK, 2);
  box(ctx, -8, -118, 16, 4, INK, 1, null);
  if (level >= 2) { box(ctx, -10, -150, 22, 64, '#6b7280', 4); circle(ctx, 1, -164 - ((t / 40 + 20) % 50), 8, 'rgba(255,255,255,0.7)', null); }
  if (level >= 3) { box(ctx, 90, -60, 44, 64, '#a78bfa', 8); windowGrid(ctx, 96, -50, 2, 2, 14, 14, 6, true); }
  if (level >= 4) { box(ctx, -110, -60, 26, 64, '#a78bfa', 8); box(ctx, -96, -110, 6, 50, '#6b7280', 2); tri(ctx, -90, -110, -66, -102, -90, -94, '#ef4444'); }
  if (level >= 5) { for (let i = 0; i < 4; i++) circle(ctx, -60 + i * 40, -180 + Math.sin(t / 220 + i) * 6, 6, ['#f472b6', '#fde047', '#22c55e', '#38bdf8'][i]); }
  ctx.restore();
}

function drawFlat(ctx, x, y, level, t) {
  ctx.save();
  ctx.translate(x, y);
  const floors = 3 + level;
  const h = floors * 26 + 20;
  shadow(ctx, 0, 4, 150);
  box(ctx, -60, -h, 120, h + 4, '#93c5fd', 8);
  box(ctx, -66, -h - 12, 132, 16, '#1e40af', 6);
  windowGrid(ctx, -48, -h + 14, 4, floors, 18, 16, 8, true);
  box(ctx, -16, -34, 32, 38, '#1e3a8a', 5);
  if (level >= 2) box(ctx, 20, -h - 40, 6, 30, '#6b7280', 2);
  if (level >= 3) { box(ctx, -30, -h - 30, 60, 20, '#bfdbfe', 6); }
  if (level >= 4) { box(ctx, 66, -70, 34, 74, '#93c5fd', 8); windowGrid(ctx, 72, -60, 1, 2, 18, 16, 8, true); }
  if (level >= 5) { for (let i = 0; i < 3; i++) star(ctx, -30 + i * 30, -h - 52 + Math.sin(t / 300 + i) * 4, 9); }
  ctx.restore();
}

function drawTownHouse(ctx, x, y, paint, t) {
  ctx.save();
  ctx.translate(x, y);
  shadow(ctx, 0, 4, 150);
  box(ctx, -60, -80, 120, 84, paint, 8);
  tri(ctx, -72, -78, 0, -130, 72, -78, '#dc2626');
  box(ctx, 26, -120, 16, 30, '#9ca3af', 3);
  box(ctx, -16, -46, 32, 50, '#92400e', 6);
  circle(ctx, 8, -22, 3, '#fde047', null);
  box(ctx, -50, -66, 28, 24, '#bae6fd', 4);
  box(ctx, 22, -66, 28, 24, '#bae6fd', 4);
  box(ctx, -18, -114, 36, 24, '#fef3c7', 5);
  circle(ctx, 0, -102, 7, '#bae6fd', INK, 3);
  ctx.restore();
}

function drawEmptyPlot(ctx, x, y, maker, unlocked, price, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.setLineDash([10, 8]);
  roundRect(ctx, -76, -96, 152, 100, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = unlocked ? '#f59e0b' : '#6b7280';
  ctx.stroke();
  ctx.setLineDash([]);
  // sign post
  box(ctx, -4, -70, 8, 74, '#92400e', 3);
  box(ctx, -56, -120, 112, 54, '#fff', 8);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  if (unlocked) {
    ctx.font = '30px sans-serif';
    ctx.fillText(maker.icon, -22, -94);
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`${price}🪙`, 20, -92);
    const bob = Math.sin(t / 250) * 4;
    ctx.font = '24px sans-serif';
    ctx.fillText('👇', 0, -142 + bob);
  } else {
    ctx.font = '30px sans-serif';
    ctx.globalAlpha = 0.5;
    ctx.fillText(maker.icon, -22, -94);
    ctx.globalAlpha = 1;
    ctx.fillText('🔒', 22, -94);
  }
  ctx.restore();
}

const BUILDERS = { limonade: drawLimonade, wasstraat: drawWasstraat, pizzeria: drawPizzeria, fabriek: drawFabriek, flat: drawFlat };

/** Points along a rounded rectangle, with cumulative length. */
function roadPath(x, y, w, h, r, n = 240) {
  const pts = [];
  const segs = [
    { type: 'line', from: [x + r, y], to: [x + w - r, y] },
    { type: 'arc', c: [x + w - r, y + r], a0: -Math.PI / 2, a1: 0 },
    { type: 'line', from: [x + w, y + r], to: [x + w, y + h - r] },
    { type: 'arc', c: [x + w - r, y + h - r], a0: 0, a1: Math.PI / 2 },
    { type: 'line', from: [x + w - r, y + h], to: [x + r, y + h] },
    { type: 'arc', c: [x + r, y + h - r], a0: Math.PI / 2, a1: Math.PI },
    { type: 'line', from: [x, y + h - r], to: [x, y + r] },
    { type: 'arc', c: [x + r, y + r], a0: Math.PI, a1: Math.PI * 1.5 },
  ];
  const per = Math.ceil(n / segs.length);
  for (const s of segs) {
    for (let i = 0; i < per; i++) {
      const f = i / per;
      if (s.type === 'line') pts.push([s.from[0] + (s.to[0] - s.from[0]) * f, s.from[1] + (s.to[1] - s.from[1]) * f]);
      else {
        const a = s.a0 + (s.a1 - s.a0) * f;
        pts.push([s.c[0] + Math.cos(a) * r, s.c[1] + Math.sin(a) * r]);
      }
    }
  }
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1], b = pts[i % pts.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return { pts, cum, total: cum[pts.length] };
}

export function createScene(canvas, game) {
  const ctx = canvas.getContext('2d');
  const config = game.config;
  let W = 0, H = 0, dpr = 1;
  let layout = null;
  let state = null;
  const particles = [];
  const spawnTimers = {};
  const images = new Map();
  let avatarDist = 0;
  let lastTime = 0;
  let lastCoinSound = 0;
  const clouds = [{ x: 0.1, y: 0.16, s: 1 }, { x: 0.5, y: 0.13, s: 0.8 }, { x: 0.8, y: 0.18, s: 1.1 }];

  function image(key, svg) {
    let img = images.get(key);
    if (!img) {
      img = new Image();
      img.src = svgToDataURL(svg);
      images.set(key, img);
    }
    return img;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(320, Math.round(rect.width));
    H = Math.max(240, Math.round(rect.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const top = 100, bottom = H - 140;
    const bh = bottom - top;
    const road = { x: W * 0.2, y: top + bh * 0.27, w: W * 0.6, h: bh * 0.62, r: Math.min(80, bh * 0.2), width: 46 };
    const plots = {
      limonade: { x: W * 0.355, y: top + bh * 0.23 },
      wasstraat: { x: W * 0.645, y: top + bh * 0.23 },
      pizzeria: { x: W * 0.905, y: top + bh * 0.47 },
      fabriek: { x: W * 0.905, y: top + bh * 0.95 },
      flat: { x: W * 0.095, y: top + bh * 0.95 },
    };
    layout = {
      top, bottom,
      island: { x: 26, y: 26, w: W - 52, h: H - 52 },
      road,
      path: roadPath(road.x, road.y, road.w, road.h, road.r),
      plots,
      house: { x: W * 0.095, y: top + bh * 0.47 },
      park: { x: W * 0.5, y: top + bh * 0.62 },
    };
  }

  function setState(s) {
    state = s;
  }

  function walletPoint() {
    return game.walletPoint();
  }

  function spawnCoin(id) {
    if (!layout || particles.length >= MAX_PARTICLES) return;
    const p = layout.plots[id];
    if (!p) return;
    const target = walletPoint();
    particles.push({ x0: p.x + (Math.random() - 0.5) * 40, y0: p.y - 90, x1: target.x, y1: target.y, t0: performance.now(), dur: 750 + Math.random() * 200, rot: Math.random() * 6 });
  }

  function scheduleCoins(dt) {
    if (!state) return;
    for (const m of config.makers) {
      const inc = makerIncome(m, makerLevel(state, m.id));
      if (inc <= 0) continue;
      const interval = Math.min(5, Math.max(0.35, 60 / inc));
      spawnTimers[m.id] = (spawnTimers[m.id] ?? interval * Math.random()) - dt;
      if (spawnTimers[m.id] <= 0) {
        spawnCoin(m.id);
        spawnTimers[m.id] = interval;
      }
    }
  }

  function drawIsland(t) {
    // sea with soft waves
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const y = (i * 140 + (t / 40)) % (H + 40) - 20;
      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += 20) ctx.lineTo(x, y + Math.sin((x + t / 8) / 30) * 4);
      ctx.stroke();
    }
    const is = layout.island;
    // sand rim
    roundRect(ctx, is.x - 10, is.y - 10, is.w + 20, is.h + 20, 60);
    ctx.fillStyle = '#fde68a';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    // grass
    roundRect(ctx, is.x, is.y, is.w, is.h, 54);
    ctx.fillStyle = '#7ed957';
    ctx.fill();
    // beach corner (bottom right)
    ctx.beginPath();
    ctx.moveTo(is.x + is.w, is.y + is.h - 150);
    ctx.quadraticCurveTo(is.x + is.w - 40, is.y + is.h - 40, is.x + is.w - 190, is.y + is.h);
    ctx.lineTo(is.x + is.w, is.y + is.h);
    ctx.closePath();
    ctx.fillStyle = '#fde68a';
    ctx.fill();
    // palm + umbrella on the beach
    const px = is.x + is.w - 70, py = is.y + is.h - 60;
    ctx.save();
    ctx.translate(px, py);
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    box(ctx, -5, -60, 10, 60, '#92400e', 4);
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -62, 34, 10, (i * Math.PI) / 5, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    circle(ctx, px - 90, py + 4, 20, '#ef4444');
    box(ctx, px - 92, py - 6, 4, 34, INK, 1, null);
    // small grass tufts
    ctx.fillStyle = '#5fbf3f';
    for (let i = 0; i < 24; i++) {
      const gx = is.x + 40 + ((i * 197) % (is.w - 80));
      const gy = is.y + 40 + ((i * 131) % (is.h - 80));
      ctx.fillRect(gx, gy, 10, 4);
    }
  }

  function drawRoad() {
    const r = layout.road;
    ctx.lineJoin = 'round';
    roundRect(ctx, r.x, r.y, r.w, r.h, r.r);
    ctx.lineWidth = r.width + 8;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = r.width;
    ctx.strokeStyle = '#6b7280';
    ctx.stroke();
    ctx.setLineDash([22, 18]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fde68a';
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawPark(t) {
    const p = layout.park;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 10, 90, 40, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    circle(ctx, p.x - 30 + Math.sin(t / 700) * 10, p.y + 8, 6, '#fde047', INK, 2); // duck
    tree(ctx, p.x - 130, p.y - 20, 0.9);
    tree(ctx, p.x + 130, p.y - 30, 1);
    tree(ctx, p.x + 40, p.y - 70, 0.7);
    box(ctx, p.x - 40, p.y - 78, 80, 12, '#92400e', 4);          // bench
    box(ctx, p.x - 36, p.y - 66, 8, 14, '#78350f', 2);
    box(ctx, p.x + 28, p.y - 66, 8, 14, '#78350f', 2);
    // town sign
    box(ctx, p.x - 66, layout.road.y - 6, 132, 34, '#fff', 8);
    ctx.fillStyle = INK;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MUNTSTAD', p.x, layout.road.y + 11);
  }

  function drawPlots(t) {
    for (const m of config.makers) {
      const p = layout.plots[m.id];
      const level = makerLevel(state, m.id);
      // plot base
      roundRect(ctx, p.x - 84, p.y - 100, 168, 116, 16);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fill();
      if (level > 0) {
        BUILDERS[m.id](ctx, p.x, p.y, level, t);
        for (let i = 0; i < level; i++) star(ctx, p.x - (level - 1) * 11 + i * 22, p.y + 4, 8);
      } else {
        const unlocked = game.isUnlocked(m.id);
        drawEmptyPlot(ctx, p.x, p.y, m, unlocked, m.price, t);
      }
    }
    const h = layout.house;
    const paint = state.equipped.paint;
    const paintHex = { 'verf-rood': '#f87171', 'verf-blauw': '#60a5fa', 'verf-geel': '#fde047' }[paint] || '#fef3c7';
    drawTownHouse(ctx, h.x, h.y, paintHex, t);
  }

  function drawClouds(t) {
    for (const c of clouds) {
      const x = ((c.x * W + t / (90 / c.s)) % (W + 300)) - 150;
      const y = c.y * H;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.ellipse(x, y, 60 * c.s, 22 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 40 * c.s, y - 12 * c.s, 40 * c.s, 24 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 40 * c.s, y - 6 * c.s, 34 * c.s, 20 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function avatarKey() {
    return `${state.color}|${state.equipped.hat}|${state.equipped.skin}`;
  }

  function drawAvatar(t, dt) {
    const path = layout.path;
    const vehicle = state.equipped.vehicle;
    const speed = vehicle === 'auto' ? 190 : vehicle === 'scooter' ? 110 : 55;
    avatarDist = (avatarDist + speed * dt) % path.total;
    // find point
    let i = 0;
    const cum = path.cum;
    while (i < cum.length - 2 && cum[i + 1] < avatarDist) i++;
    const a = path.pts[i], b = path.pts[(i + 1) % path.pts.length];
    const f = (avatarDist - cum[i]) / Math.max(1e-6, cum[i + 1] - cum[i]);
    const x = a[0] + (b[0] - a[0]) * f;
    const y = a[1] + (b[1] - a[1]) * f;
    const dir = b[0] - a[0] < -0.01 ? -1 : 1;
    const colorHex = (config.colors.find((c) => c.id === state.color) || config.colors[0]).hex;
    const img = image(avatarKey(), avatarSVG({ color: colorHex, hat: state.equipped.hat, skin: state.equipped.skin }));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    shadow(ctx, 0, 14, 50);
    if (vehicle) {
      const vimg = image(`veh|${vehicle}|${colorHex}`, vehicleSVG(vehicle, colorHex));
      if (vimg.complete && vimg.naturalWidth) ctx.drawImage(vimg, -48, -46, 96, 60);
      if (img.complete && img.naturalWidth) ctx.drawImage(img, -22, -104, 44, 70);
    } else {
      const bob = Math.abs(Math.sin(t / 140)) * 6;
      if (img.complete && img.naturalWidth) ctx.drawImage(img, -26, -80 - bob, 52, 82);
    }
    ctx.restore();
    layout.avatar = { x, y };
  }

  function drawParticles(now) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const f = Math.min(1, (now - p.t0) / p.dur);
      const ease = f * f * (3 - 2 * f);
      const arc = Math.sin(f * Math.PI) * 90;
      const x = p.x0 + (p.x1 - p.x0) * ease;
      const y = p.y0 + (p.y1 - p.y0) * ease - arc;
      const sq = Math.abs(Math.cos(f * 10 + p.rot));
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(Math.max(0.25, sq), 1);
      circle(ctx, 0, 0, 12, '#f59e0b', INK, 3);
      circle(ctx, 0, 0, 7, '#fde68a', null);
      ctx.restore();
      if (f >= 1) {
        particles.splice(i, 1);
        game.bumpWallet();
        if (now - lastCoinSound > 250) {
          lastCoinSound = now;
          game.audio.play('coinSoft');
        }
      }
    }
  }

  function render(now) {
    if (!layout || !state) return;
    const dt = Math.min(0.1, lastTime ? (now - lastTime) / 1000 : 0.016);
    lastTime = now;
    scheduleCoins(dt);
    drawIsland(now);
    drawRoad();
    drawPark(now);
    drawClouds(now);
    drawPlots(now);
    drawAvatar(now, dt);
    drawParticles(now);
  }

  /** Returns what was tapped: { type: 'maker', id } | { type: 'house' } | { type: 'avatar' } | null */
  function hitTest(x, y) {
    if (!layout) return null;
    for (const m of config.makers) {
      const p = layout.plots[m.id];
      if (x >= p.x - 90 && x <= p.x + 90 && y >= p.y - 170 && y <= p.y + 24) return { type: 'maker', id: m.id };
    }
    const h = layout.house;
    if (x >= h.x - 80 && x <= h.x + 80 && y >= h.y - 140 && y <= h.y + 20) return { type: 'house' };
    if (layout.avatar && Math.hypot(x - layout.avatar.x, y - (layout.avatar.y - 40)) < 60) return { type: 'avatar' };
    return null;
  }

  function plotPoint(id) {
    const p = layout && layout.plots[id];
    return p ? { x: p.x, y: p.y - 60 } : { x: W / 2, y: H / 2 };
  }

  function burst(id) {
    for (let i = 0; i < 6; i++) setTimeout(() => spawnCoin(id), i * 60);
  }

  return { resize, render, hitTest, spawnCoin, burst, setState, plotPoint, get particleCount() { return particles.length; } };
}
