// scene.js — the town of Muntstad as a blocky 3D island on a 2:1 dimetric canvas.
// Static ground (water, cliffs, grass, road, pavements) is pre-rendered once per resize into an offscreen canvas;
// every frame draws ripples, depth-sorted entities (buildings, signs, trees, avatar, traffic), coins and clouds.
import { createIso, shade, rgba } from './iso.js';
import { BUILDERS, house as drawHouse, PAVE } from './art/buildings.js';
import { drawAvatar, drawCar } from './art/avatar.js';
import { makerLevel, makerIncome, formatCoins } from './economy.js';
import { spriteURL, makerSprite } from './art/sprites.js';

const INK = '#1b1f3b';
const MAX_PARTICLES = 30;
const FONT = '"Arial Rounded MT Bold", "Nunito", "Trebuchet MS", "Segoe UI", sans-serif';

export const ISLAND = { w: 16, d: 12, r: 2.4 };
export const ROAD = { x: 3, y: 2.6, w: 10, d: 6.8, r: 1.6, width: 1.3 };
export const PLOTS = {
  limonade: [5.2, 1.2],
  wasstraat: [9.6, 1.2],
  pizzeria: [14.3, 4.2],
  fabriek: [14.2, 8.4],
  flat: [1.6, 8.6],
};
export const HOUSE = [1.6, 4.4];
const PARK = [8, 6];
const PAL = {
  grass: '#6fd35b', grassDark: '#55b647', sand: '#f4d98a', dirt: '#b97b4b', rock: '#8a5a3a',
  road: '#5d6675', roadLine: '#f7d24a', side: '#dcd7cb',
};
const TREES = [[5.4, 5.2, 0.9], [10.6, 4.8, 1], [10.4, 7.6, 0.8], [3.4, 11.2, 0.8], [12.4, 11.3, 0.9], [1.2, 1.6, 0.7], [7.6, 0.6, 0.75], [15.1, 10.6, 0.7]];
const BUSHES = [[5.8, 7.4, 0.9], [11.6, 6.4, 0.7], [7.5, 11.4, 0.8], [15, 6.2, 0.6], [3.2, 0.8, 0.6], [12.2, 0.9, 0.55]];
const LAMPS = [[2.5, 2.2], [13.6, 2.2], [2.5, 9.9], [13.6, 9.9]];
const FLOWERS = [[6.6, 6.9, '#ff6fae'], [6.9, 7.2, '#ffe94d'], [9.3, 7.5, '#7c9bff'], [9.6, 7.8, '#ff6fae'], [4.2, 11.5, '#ffe94d'], [11.2, 11.6, '#ff6fae'], [15.2, 7.4, '#7c9bff']];

/** Points along the road loop (world units), with cumulative length. */
function roadPath(n = 320) {
  const { x, y, w, d, r } = ROAD;
  const pts = [];
  const seg = (fn, k) => { for (let i = 0; i < k; i++) pts.push(fn(i / k)); };
  const q = Math.round(n / 8);
  seg((f) => [x + r + (w - 2 * r) * f, y], q * 1.6);
  seg((f) => { const a = -Math.PI / 2 + (Math.PI / 2) * f; return [x + w - r + Math.cos(a) * r, y + r + Math.sin(a) * r]; }, q * 0.6);
  seg((f) => [x + w, y + r + (d - 2 * r) * f], q);
  seg((f) => { const a = (Math.PI / 2) * f; return [x + w - r + Math.cos(a) * r, y + d - r + Math.sin(a) * r]; }, q * 0.6);
  seg((f) => [x + w - r - (w - 2 * r) * f, y + d], q * 1.6);
  seg((f) => { const a = Math.PI / 2 + (Math.PI / 2) * f; return [x + r + Math.cos(a) * r, y + d - r + Math.sin(a) * r]; }, q * 0.6);
  seg((f) => [x, y + d - r - (d - 2 * r) * f], q);
  seg((f) => { const a = Math.PI + (Math.PI / 2) * f; return [x + r + Math.cos(a) * r, y + r + Math.sin(a) * r]; }, q * 0.6);
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1], b = pts[i % pts.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return { pts, cum, total: cum[pts.length] };
}

function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function createScene(canvas, game) {
  const ctx = canvas.getContext('2d');
  const config = game.config;
  const staticCanvas = document.createElement('canvas');
  const sctx = staticCanvas.getContext('2d');
  const iso = createIso(ctx, { unit: 36 });
  const siso = createIso(sctx, { unit: 36 });
  let W = 0, H = 0, dpr = 1;
  let state = null;
  const particles = [];
  const spawnTimers = {};
  const path = roadPath();
  let avatarDist = 0;
  let lastTime = 0;
  let lastCoinSound = 0;
  let hopUntil = 0;
  const popAt = {};
  const traffic = [
    { dist: 0.38, speed: 1.9, color: '#ff9f2e' },
    { dist: 0.78, speed: 1.6, color: '#45d65c' },
  ];
  const clouds = [{ x: 0.12, y: 52, s: 0.9 }, { x: 0.62, y: 34, s: 0.7 }];
  const images = new Map();

  function image(key, url) {
    let img = images.get(key);
    if (!img) {
      img = new Image();
      img.src = url;
      images.set(key, img);
    }
    return img.complete && img.naturalWidth ? img : null;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(320, Math.round(rect.width));
    H = Math.max(240, Math.round(rect.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    staticCanvas.width = canvas.width;
    staticCanvas.height = canvas.height;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const span = ISLAND.w + ISLAND.d;
    const unit = Math.floor(Math.min((W - 30) / span, (H - 190) / (span / 2 + 1.6)));
    const ox = W / 2 - ((ISLAND.w - ISLAND.d) / 2) * unit;
    const oy = Math.max(46, H - 150 - (span / 2 + 1.05) * unit);
    iso.set(unit, ox, oy);
    siso.set(unit, ox, oy);
    drawStatic();
  }

  function setState(s) {
    state = s;
  }

  // ---------- static ground ----------

  function islandPath(c, inset = 0) {
    const x = inset, y = inset, w = ISLAND.w - inset * 2, d = ISLAND.d - inset * 2, r = ISLAND.r;
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + d - r);
    c.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    c.lineTo(x + r, y + d);
    c.quadraticCurveTo(x, y + d, x, y + d - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function roadOutline(c) {
    const { x, y, w, d, r } = ROAD;
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + d - r);
    c.arcTo(x + w, y + d, x + w - r, y + d, r);
    c.lineTo(x + r, y + d);
    c.arcTo(x, y + d, x, y + d - r, r);
    c.lineTo(x, y + r);
    c.arcTo(x, y, x + r, y, r);
    c.closePath();
  }

  function drawStatic() {
    const c = sctx;
    const u = siso.unit;
    c.clearRect(0, 0, W, H);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#5cc9f7');
    g.addColorStop(1, '#1479cf');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    // cliff: stacked copies of the island shape
    const cliff = Math.round(u * 1.05);
    for (let i = cliff; i >= 1; i--) {
      const f = i / cliff;
      c.save();
      c.translate(0, i);
      siso.ground((cc) => { islandPath(cc); cc.fillStyle = f > 0.55 ? shade(PAL.rock, -0.12 * (f - 0.5)) : PAL.dirt; cc.fill(); });
      c.restore();
    }
    // foam ring in the water
    c.save();
    c.translate(0, cliff + 5);
    siso.ground((cc) => { islandPath(cc, -0.28); cc.strokeStyle = 'rgba(255,255,255,0.7)'; cc.lineWidth = 0.22; cc.stroke(); });
    c.restore();
    // sand rim, grass, beach corner
    siso.ground((cc) => { islandPath(cc); cc.fillStyle = PAL.sand; cc.fill(); cc.lineWidth = 0.08; cc.strokeStyle = shade(PAL.sand, -0.35); cc.stroke(); });
    siso.ground((cc) => { islandPath(cc, 0.55); cc.fillStyle = PAL.grass; cc.fill(); });
    siso.ground((cc) => {
      cc.beginPath();
      cc.moveTo(ISLAND.w - 0.5, 0.5);
      cc.lineTo(ISLAND.w - 0.5, 4.6);
      cc.quadraticCurveTo(ISLAND.w - 3.5, 3.4, ISLAND.w - 6, 0.5);
      cc.closePath();
      cc.fillStyle = PAL.sand;
      cc.fill();
    });
    c.fillStyle = PAL.grassDark;
    for (let i = 0; i < 90; i++) {
      const x = 1 + ((i * 7.31) % (ISLAND.w - 2)), y = 1 + ((i * 4.77) % (ISLAND.d - 2));
      const [X, Y] = siso.P(x, y);
      c.fillRect(X - 3, Y - 1, 6, 2);
    }
    // road
    siso.ground((cc) => {
      const { width } = ROAD;
      cc.lineJoin = 'round';
      roadOutline(cc); cc.lineWidth = width + 0.9; cc.strokeStyle = PAL.side; cc.stroke();
      roadOutline(cc); cc.lineWidth = width + 0.16; cc.strokeStyle = shade(PAL.road, -0.35); cc.stroke();
      roadOutline(cc); cc.lineWidth = width; cc.strokeStyle = PAL.road; cc.stroke();
      roadOutline(cc); cc.setLineDash([0.55, 0.45]); cc.lineWidth = 0.08; cc.strokeStyle = PAL.roadLine; cc.stroke(); cc.setLineDash([]);
      cc.fillStyle = '#ffffff';
      for (let i = 0; i < 5; i++) cc.fillRect(ROAD.x - width / 2 + 0.05, ROAD.y + 4.0 + i * 0.28, width - 0.1, 0.14);
    });
    // park: path + pond base + flower beds
    siso.disc(PARK[0], PARK[1], 1.7, 1.7, shade('#3fc0f5', -0.4));
    siso.disc(PARK[0], PARK[1], 1.5, 1.5, '#3fc0f5');
    for (const [fx, fy, col] of FLOWERS) siso.flower(fx, fy, col);
    // beach props
    siso.block(13.6, 1.2, 0, 0.18, 0.18, 1.6, '#b5763f');
    for (let i = 0; i < 4; i++) siso.block(13.2 + (i % 2) * 0.5, 0.9 + Math.floor(i / 2) * 0.5, 1.5 + (i % 3) * 0.08, 0.6, 0.6, 0.18, '#3fbf5a');
    siso.block(12.2, 2.4, 0, 0.08, 0.08, 1.2, '#8a8f99');
    siso.pyramid(11.7, 1.9, 1.15, 1.1, 1.1, 0.35, '#ff5f5f');
    siso.block(14.6, 2.6, 0, 0.5, 0.5, 0.3, '#f0b64a');
    siso.block(14.7, 2.7, 0.3, 0.3, 0.3, 0.25, '#ff5f5f');
    // bench in the park
    siso.block(7.2, 4.4, 0, 1.2, 0.35, 0.3, '#b5763f');
    siso.block(7.2, 4.4, 0.3, 1.2, 0.12, 0.35, '#b5763f');
    // town sign
    siso.block(6.4, 8.2, 0, 3.2, 0.14, 0.9, '#ffffff');
    const [tx, ty] = siso.P(8.0, 8.2, 0.45);
    c.save();
    c.translate(tx, ty);
    c.transform(1, 0.5, 0, 1, 0, 0);
    c.fillStyle = INK;
    c.font = `bold ${Math.max(20, Math.round(u * 0.56))}px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('MUNTSTAD', 0, 0);
    c.restore();
  }

  // ---------- coins ----------

  function spawnCoin(id) {
    if (particles.length >= MAX_PARTICLES) return;
    const p = PLOTS[id];
    if (!p) return;
    const target = game.walletPoint();
    const [x0, y0] = iso.P(p[0] + (Math.random() - 0.5) * 0.8, p[1] + (Math.random() - 0.5) * 0.8, 2.4);
    particles.push({ x0, y0, x1: target.x, y1: target.y, t0: performance.now(), dur: 800 + Math.random() * 200, rot: Math.random() * 6 });
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

  function drawParticles(now) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const f = Math.min(1, (now - p.t0) / p.dur);
      const ease = f * f * (3 - 2 * f);
      const arc = Math.sin(f * Math.PI) * 110;
      const x = p.x0 + (p.x1 - p.x0) * ease;
      const y = p.y0 + (p.y1 - p.y0) * ease - arc;
      iso.coin(x, y, 12, f * 9 + p.rot);
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

  // ---------- dynamic layer ----------

  function drawRipples(t) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.26)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const y = ((i * 105 + t / 60) % (H + 60)) - 30;
      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += 24) ctx.lineTo(x, y + Math.sin((x + t / 9 + i * 40) / 34) * 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPond(t) {
    iso.disc(PARK[0], PARK[1], 1.25, 1.25, '#7fdcff');
    const [X, Y] = iso.P(PARK[0] - 0.4 + Math.sin(t / 700) * 0.5, PARK[1] + 0.2);
    ctx.beginPath();
    ctx.ellipse(X, Y, iso.unit * 0.22, iso.unit * 0.09, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    // fountain spray in the middle
    for (let i = 0; i < 5; i++) {
      const f = ((t / 600) + i / 5) % 1;
      const [fx, fy] = iso.P(PARK[0] + (i - 2) * 0.12 * f, PARK[1], 0.2 + Math.sin(f * Math.PI) * 0.9);
      ctx.beginPath();
      ctx.arc(fx, fy, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
    }
  }

  function drawArrow(X, Y, t) {
    const bob = Math.sin(t / 220) * 5;
    const s = iso.unit * 0.42;
    ctx.save();
    ctx.translate(X, Y + bob);
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, -s * 1.5);
    ctx.lineTo(s * 0.45, -s * 1.5);
    ctx.lineTo(s * 0.45, -s * 0.6);
    ctx.lineTo(s * 0.95, -s * 0.6);
    ctx.lineTo(0, s * 0.3);
    ctx.lineTo(-s * 0.95, -s * 0.6);
    ctx.lineTo(-s * 0.45, -s * 0.6);
    ctx.closePath();
    ctx.fillStyle = '#ffc21c';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
  }

  function drawSign(x, y, maker, unlocked, affordable, t) {
    const u = iso.unit;
    iso.groundRect(x - 1.5, y - 1.4, 3, 2.8, 0.4, rgba('#ffffff', 0.32), unlocked ? rgba('#e08a00', 0.85) : rgba(INK, 0.28), 0.09);
    if (affordable) {
      const pulse = 0.5 + Math.sin(t / 260) * 0.5;
      iso.groundRect(x - 1.62, y - 1.52, 3.24, 3.04, 0.5, 'rgba(0,0,0,0)', rgba('#ffc21c', 0.35 + pulse * 0.5), 0.14 + pulse * 0.08);
    }
    iso.block(x - 0.06, y - 0.06, 0, 0.12, 0.12, 1.3, '#b5763f');
    const bw = 2.8, bh = 1.1;
    iso.block(x - bw / 2, y - 0.1, 1.25, bw, 0.12, bh, unlocked ? '#ffffff' : '#d9dde5');
    // sign face (the +y face of the board): mini building on the left, price + coin (or a lock) on the right.
    // Text is ≥ 20 px on every supported iPad (u ≥ 35 → 0.58 u ≥ 20).
    const [X, Y] = iso.P(x - bw / 2, y + 0.02, 1.25 + bh);
    const img = image(`maker:${maker.id}`, makerSprite(maker.id, 96));
    ctx.save();
    ctx.translate(X, Y);
    ctx.transform(1, 0.5, 0, 1, 0, 0);
    const icon = u * 0.95;
    if (img) {
      if (!unlocked) ctx.globalAlpha = 0.45;
      ctx.drawImage(img, u * 0.1, u * 0.08, icon, icon);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = INK;
    ctx.textBaseline = 'middle';
    if (unlocked) {
      const label = formatCoins(maker.price);
      ctx.font = `bold ${Math.max(20, Math.round(u * (label.length > 4 ? 0.5 : 0.58)))}px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(label, u * (bw - 0.62), u * 0.56);
    } else {
      ctx.font = `${Math.max(20, Math.round(u * 0.6))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🔒', u * (bw * 0.5 + 0.5), u * 0.55);
    }
    ctx.restore();
    if (unlocked) {
      const [cx, cy] = iso.P(x + bw / 2 - 0.3, y + 0.02, 1.25 + bh * 0.5);
      iso.coin(cx, cy, u * 0.19, 0);
    }
    if (affordable) {
      const [ax, ay] = iso.P(x, y, 1.25 + bh + 0.35);
      drawArrow(ax, ay, t);
    }
  }

  function popScale(id, now) {
    const at = popAt[id];
    if (!at) return 1;
    const f = (now - at) / 600;
    if (f >= 1) { delete popAt[id]; return 1; }
    // overshoot: 0 → 1.15 → 1
    return f < 0.5 ? 0.2 + (f / 0.5) * 0.95 : 1.15 - ((f - 0.5) / 0.5) * 0.15;
  }

  function withPop(id, x, y, now, fn) {
    const s = popScale(id, now);
    if (s === 1) return fn();
    const [X, Y] = iso.P(x, y);
    ctx.save();
    ctx.translate(X, Y);
    ctx.scale(s, s);
    ctx.translate(-X, -Y);
    fn();
    ctx.restore();
  }

  function avatarOnRoad(dt, now) {
    const vehicle = state.equipped.vehicle;
    const speed = vehicle === 'auto' ? 5.2 : vehicle === 'scooter' ? 3.1 : 1.55; // world units per second
    avatarDist = (avatarDist + speed * dt) % path.total;
    return along(avatarDist);
  }

  function along(dist) {
    const cum = path.cum;
    let i = 0;
    while (i < cum.length - 2 && cum[i + 1] < dist) i++;
    const a = path.pts[i], b = path.pts[(i + 1) % path.pts.length];
    const f = (dist - cum[i]) / Math.max(1e-6, cum[i + 1] - cum[i]);
    const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'se' : 'nw') : (dy > 0 ? 'sw' : 'ne');
    return { x, y, facing };
  }

  function drawClouds(t) {
    for (const c of clouds) {
      const x = ((c.x * W + t / (110 / c.s)) % (W + 320)) - 160;
      const y = c.y;
      // shadow on the ground
      ctx.fillStyle = 'rgba(20,30,80,0.10)';
      ctx.beginPath();
      ctx.ellipse(x + 60, y + H * 0.42, 90 * c.s, 26 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      ctx.beginPath();
      ctx.ellipse(x, y, 60 * c.s, 20 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 38 * c.s, y - 12 * c.s, 40 * c.s, 24 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 40 * c.s, y - 6 * c.s, 34 * c.s, 18 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  let avatarPos = { x: 0, y: 0, facing: 'se' };

  function render(now) {
    if (!state || !W) return;
    const dt = Math.min(0.1, lastTime ? (now - lastTime) / 1000 : 0.016);
    lastTime = now;
    scheduleCoins(dt);
    ctx.drawImage(staticCanvas, 0, 0, W, H);
    drawRipples(now);
    drawPond(now);

    const ents = [];
    for (const [tx, ty, ts] of TREES) ents.push({ depth: tx + ty, draw: () => iso.tree(tx, ty, ts) });
    for (const [bx, by, bs] of BUSHES) ents.push({ depth: bx + by, draw: () => iso.bush(bx, by, bs) });
    for (const [lx, ly] of LAMPS) ents.push({ depth: lx + ly, draw: () => { iso.block(lx - 0.06, ly - 0.06, 0, 0.12, 0.12, 1.5, '#8a8f99'); iso.block(lx - 0.16, ly - 0.16, 1.5, 0.32, 0.32, 0.25, '#ffe94d'); } });
    for (const m of config.makers) {
      const [px, py] = PLOTS[m.id];
      const level = makerLevel(state, m.id);
      ents.push({ depth: px + py, draw: () => withPop(m.id, px, py, now, () => {
        if (level > 0) BUILDERS[m.id](iso, ctx, px, py, level, now);
        else drawSign(px, py, m, game.isUnlocked(m.id), state.wallet >= m.price, now);
      }) });
    }
    ents.push({ depth: HOUSE[0] + HOUSE[1], draw: () => drawHouse(iso, ctx, HOUSE[0], HOUSE[1], state.equipped.paint || 'none', now) });
    avatarPos = avatarOnRoad(dt, now);
    const colorHex = (config.colors.find((c) => c.id === state.color) || config.colors[0]).hex;
    const hop = hopUntil > now ? Math.sin(((hopUntil - now) / 380) * Math.PI) * 0.9 : 0;
    ents.push({ depth: avatarPos.x + avatarPos.y, draw: () => drawAvatar(iso, ctx, avatarPos.x, avatarPos.y, {
      color: colorHex, hat: state.equipped.hat, skin: state.equipped.skin, facing: avatarPos.facing,
      pose: hop ? 'jump' : 'walk', t: now, vehicle: state.equipped.vehicle, z: hop,
    }) });
    for (const car of traffic) {
      car.dist = (car.dist + (car.speed * dt) / path.total) % 1;
      const c = along(car.dist * path.total);
      ents.push({ depth: c.x + c.y, draw: () => drawCar(iso, ctx, c.x, c.y, c.facing, car.color, now) });
    }
    ents.sort((a, b) => a.depth - b.depth);
    for (const e of ents) e.draw();

    drawParticles(now);
    drawClouds(now);
  }

  // ---------- interaction ----------

  function silhouette(x0, y0, x1, y1, h) {
    return [iso.P(x0, y0, h), iso.P(x1, y0, h), iso.P(x1, y0, 0), iso.P(x1, y1, 0), iso.P(x0, y1, 0), iso.P(x0, y1, h)];
  }

  /** Returns what was tapped: { type: 'maker', id } | { type: 'house' } | { type: 'avatar' } | null */
  function hitTest(x, y) {
    if (!W || !state) return null;
    const [ax, ay] = iso.P(avatarPos.x, avatarPos.y, 0.7);
    if (Math.hypot(x - ax, y - ay) < iso.unit * 1.1) return { type: 'avatar' };
    for (const m of config.makers) {
      const [px, py] = PLOTS[m.id];
      const h = m.id === 'flat' ? 5.6 : 3.2;
      if (pointInPoly(x, y, silhouette(px - 1.5, py - 1.5, px + 1.5, py + 1.5, h))) return { type: 'maker', id: m.id };
    }
    if (pointInPoly(x, y, silhouette(HOUSE[0] - 1.7, HOUSE[1] - 1.5, HOUSE[0] + 1.7, HOUSE[1] + 1.5, 2.5))) return { type: 'house' };
    return null;
  }

  function plotPoint(id) {
    const p = PLOTS[id];
    if (!p || !W) return { x: W / 2, y: H / 2 };
    const [X, Y] = iso.P(p[0], p[1], 2);
    return { x: X, y: Y };
  }

  function burst(id) {
    popAt[id] = performance.now();
    for (let i = 0; i < 6; i++) setTimeout(() => spawnCoin(id), i * 60);
  }

  function hop() {
    hopUntil = performance.now() + 380;
  }

  return { resize, render, hitTest, spawnCoin, burst, setState, plotPoint, hop, get particleCount() { return particles.length; } };
}
