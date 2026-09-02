// art/buildings.js — the five coin-makers and the child's house as blocky 3D art on the iso canvas.
// Every builder: (iso, ctx, x, y, level, t) with (x, y) the centre of a 3 × 3 plot, level 1..5, t in ms.
// Each level adds one visible thing (see ART-DIRECTION): 2 = extra prop, 3 = annex / floor, 4 = flag + sign,
// 5 = floating coins + star banner. Buildings stay inside their plot (overhang ≤ 0.3).
import { shade, rgba } from '../iso.js';

const INK = '#1b1f3b';
export const PAVE = '#e9e2cf';
const GLASS = '#cfe9ff', LIT = '#fff1a8', WOOD = '#b5763f', METAL = '#9aa3b2', DOOR = '#7a3f1a';
const edge = (a = 0.4) => ({ edge: rgba(INK, a) });

function pavement(iso, x, y) {
  iso.groundRect(x - 1.5, y - 1.5, 3, 3, 0.4, PAVE, shade(PAVE, -0.25));
}

/** Pole with a waving flag (level 4 marker). */
export function flag(iso, x, y, t, color = '#45d65c', h = 2.4) {
  iso.block(x - 0.05, y - 0.05, 0, 0.1, 0.1, h, METAL);
  const wave = Math.sin(t / 260) * 0.08;
  iso.block(x + 0.05, y - 0.02, h - 0.45, 0.62 + wave, 0.04, 0.34, color);
}

/** Three floating coins + a white star banner (level 5 marker), z = height above ground. */
export function crown(iso, ctx, x, y, z, t) {
  iso.block(x - 0.9, y - 0.06, z, 1.8, 0.12, 0.42, '#ffffff');
  const [sx, sy] = iso.P(x, y - 0.06, z + 0.21);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.transform(1, 0.5, 0, 1, 0, 0);
  ctx.fillStyle = '#ffc21c';
  ctx.font = `bold ${Math.round(iso.unit * 0.34)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★ ★ ★', 0, 0);
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const bob = Math.sin(t / 300 + i * 1.3) * 0.08;
    const [cx, cy] = iso.P(x - 0.7 + i * 0.7, y, z + 0.9 + bob);
    iso.coin(cx, cy, iso.unit * 0.26, t / 420 + i);
  }
}

/** Puff of smoke rising from (x, y, z), three growing circles on a loop. */
export function smoke(iso, ctx, x, y, z, t, period = 1000, drift = 8) {
  for (let i = 0; i < 3; i++) {
    const f = ((t / period) + i / 3) % 1;
    const [X, Y] = iso.P(x, y, z + f * 1.2);
    ctx.beginPath();
    ctx.arc(X + f * drift, Y, iso.unit * (0.12 + f * 0.2), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.85 - f * 0.85})`;
    ctx.fill();
  }
}

function window(iso, x, y, z, w, d, side, u, v, uw = 0.5, vh = 0.45, color = GLASS) {
  iso.face(x, y, z, w, d, side, u, v, uw, vh, color, edge(0.4));
}

// ---------- Limonadekraam ----------
export function limonade(iso, ctx, x, y, level, t) {
  const c = '#ffd23f';
  pavement(iso, x, y);
  iso.shadow(x - 0.9, y - 0.7, 1.8, 1.4, 1.9);
  iso.block(x - 0.9, y - 0.7, 0, 1.8, 1.4, 0.9, c);                    // counter
  iso.block(x - 0.95, y - 0.75, 0.86, 1.9, 1.5, 0.12, shade(c, -0.15)); // counter top rim
  for (const [px, py] of [[-0.85, -0.65], [0.73, -0.65], [-0.85, 0.53], [0.73, 0.53]]) iso.block(x + px, y + py, 0.95, 0.12, 0.12, 1.2, WOOD);
  iso.block(x - 1.05, y - 0.85, 2.1, 2.1, 1.7, 0.16, '#ff5f5f');        // awning
  for (let i = 0; i < 5; i++) iso.slab(x - 1.05 + i * 0.42, y - 0.85, 2.26, 0.21, 1.7, '#ffffff');
  for (let i = 0; i < 3; i++) iso.block(x - 0.6 + i * 0.45, y - 0.2, 0.98, 0.28, 0.28, 0.26, '#ffe94d'); // lemons
  iso.block(x + 0.3, y + 0.2, 0.98, 0.3, 0.3, 0.42, '#ff8fb1');         // pitcher
  iso.face(x - 0.9, y - 0.7, 0, 1.8, 1.4, 'x', 0.25, 0.25, 0.9, 0.45, '#fff8dc', edge(0.4)); // sign
  iso.face(x - 0.9, y - 0.7, 0, 1.8, 1.4, 'x', 0.4, 0.38, 0.6, 0.2, '#ffe94d', {});
  if (level >= 2) iso.block(x + 1.05, y - 1.25, 0, 0.55, 0.55, 0.7, '#59a9ff'); // cooler box
  if (level >= 3) { iso.block(x - 1.45, y - 1.4, 0, 0.95, 0.95, 0.5, '#ffb347'); iso.block(x - 1.25, y - 1.2, 0.5, 0.55, 0.55, 0.35, '#ffe94d'); } // lemon crate
  if (level >= 4) flag(iso, x - 1.4, y + 0.9, t, '#45d65c');
  if (level >= 5) crown(iso, ctx, x, y - 0.9, 2.45, t);
}

// ---------- Wasstraat ----------
export function wasstraat(iso, ctx, x, y, level, t) {
  const c = '#4fb6ff';
  pavement(iso, x, y);
  iso.shadow(x - 1.2, y - 1, 2.4, 2, 1.8);
  iso.block(x - 1.2, y - 1, 0, 2.4, 2, 1.5, c);
  iso.block(x - 1.28, y - 1.08, 1.5, 2.56, 2.16, 0.22, shade(c, -0.3));       // roof band
  iso.face(x - 1.2, y - 1, 0, 2.4, 2, 'x', 0.35, 0, 1.3, 1.1, '#1f2a44', edge(0.5)); // tunnel mouth
  window(iso, x - 1.2, y - 1, 0, 2.4, 2, 'y', 0.3, 0.55);
  window(iso, x - 1.2, y - 1, 0, 2.4, 2, 'y', 1.4, 0.55);
  iso.block(x + 1.25, y - 0.7, 0, 0.35, 0.35, 1.2, '#ff5f5f');                // brush rollers
  iso.block(x + 1.25, y + 0.35, 0, 0.35, 0.35, 1.2, '#ff5f5f');
  iso.block(x - 0.9, y - 1.3, 1.72, 1.6, 0.16, 0.6, '#ffffff');               // sign
  iso.face(x - 0.9, y - 1.3, 1.72, 1.6, 0.16, 'y', 0.2, 0.15, 1.2, 0.3, '#45b6ff', {});
  for (let i = 0; i < 3; i++) {                                               // drips
    const f = ((t / 700) + i / 3) % 1;
    iso.block(x + 1.45, y - 0.5 + i * 0.4, 1.3 - f * 1.1, 0.12, 0.12, 0.18, '#9fe0ff', { edge: false, alpha: 1 - f });
  }
  if (level >= 2) iso.block(x - 1.85, y + 0.3, 0, 0.55, 0.55, 0.9, '#ffd23f'); // vacuum station
  if (level >= 3) iso.block(x - 1.2, y + 1.05, 0, 2.4, 0.45, 1, shade(c, 0.15)); // annex
  if (level >= 4) flag(iso, x - 1.85, y - 1.35, t, '#ffd23f');
  if (level >= 5) crown(iso, ctx, x, y - 1, 2.35, t);
}

// ---------- Pizzeria ----------
export function pizzeria(iso, ctx, x, y, level, t) {
  const c = '#ffb0b0', roofc = '#e8483f';
  pavement(iso, x, y);
  iso.shadow(x - 1.1, y - 0.9, 2.2, 1.8, 2.3);
  iso.block(x - 1.1, y - 0.9, 0, 2.2, 1.8, 1.4, c);
  iso.roof(x - 1.25, y - 1.05, 1.4, 2.5, 2.1, 0.9, roofc, 'x');
  iso.face(x - 1.1, y - 0.9, 0, 2.2, 1.8, 'x', 0.6, 0, 0.6, 0.95, DOOR, edge(0.4));
  window(iso, x - 1.1, y - 0.9, 0, 2.2, 1.8, 'y', 0.25, 0.5, 0.6, 0.55);
  window(iso, x - 1.1, y - 0.9, 0, 2.2, 1.8, 'y', 1.35, 0.5, 0.6, 0.55);
  iso.block(x + 1.1, y - 0.75, 1.05, 0.45, 1.5, 0.1, '#ff5f5f');              // awning
  for (let i = 0; i < 4; i++) iso.slab(x + 1.1, y - 0.75 + i * 0.38, 1.15, 0.45, 0.19, '#ffffff');
  iso.block(x - 0.7, y - 0.6, 2.1, 0.3, 0.3, 0.5, METAL);                     // chimney
  smoke(iso, ctx, x - 0.55, y - 0.45, 2.7, t, 900);
  // pizza sign on the +y face
  iso.face(x - 1.1, y - 0.9, 0, 2.2, 1.8, 'y', 0.75, 1.05, 0.7, 0.3, '#ffffff', edge(0.4));
  iso.face(x - 1.1, y - 0.9, 0, 2.2, 1.8, 'y', 0.85, 1.12, 0.5, 0.16, '#ffd23f', {});
  if (level >= 2) { iso.block(x - 1.45, y + 0.6, 0, 0.7, 0.7, 0.45, WOOD); iso.block(x - 1.4, y + 0.65, 0.45, 0.6, 0.6, 0.06, '#ffffff'); iso.block(x - 1.25, y + 0.8, 0.5, 0.3, 0.3, 0.06, '#ff5f5f'); } // terrace table with pizza
  if (level >= 3) { iso.block(x - 1.1, y - 0.9, 1.4, 2.2, 1.8, 0.05, c); iso.block(x - 1.0, y - 0.8, 1.4, 2.0, 1.6, 1.0, c); window(iso, x - 1.0, y - 0.8, 1.4, 2.0, 1.6, 'y', 0.3, 0.3); window(iso, x - 1.0, y - 0.8, 1.4, 2.0, 1.6, 'y', 1.2, 0.3); iso.roof(x - 1.15, y - 0.95, 2.4, 2.3, 1.9, 0.8, roofc, 'x'); iso.block(x - 0.7, y - 0.6, 2.9, 0.3, 0.3, 0.5, METAL); }
  if (level >= 4) flag(iso, x + 1.35, y + 1.3, t, '#ff5f5f');
  if (level >= 5) crown(iso, ctx, x, y - 1, level >= 3 ? 3.4 : 2.5, t);
}

// ---------- Fabriek ----------
export function fabriek(iso, ctx, x, y, level, t) {
  const c = '#b794f4';
  pavement(iso, x, y);
  iso.shadow(x - 1.3, y - 1, 2.6, 2, 2.8);
  iso.block(x - 1.3, y - 1, 0, 2.6, 2, 1.5, c);
  for (let i = 0; i < 3; i++) iso.roof(x - 1.3 + i * 0.87, y - 1, 1.5, 0.87, 2, 0.5, shade(c, -0.15), 'y'); // sawtooth
  iso.block(x + 0.6, y - 0.6, 2.0, 0.4, 0.4, 1.2, METAL);                    // chimney
  smoke(iso, ctx, x + 0.8, y - 0.4, 3.2, t, 1100, 10);
  for (let i = 0; i < 3; i++) window(iso, x - 1.3, y - 1, 0, 2.6, 2, 'y', 0.2 + i * 0.8, 0.6, 0.5, 0.5, LIT);
  iso.face(x - 1.3, y - 1, 0, 2.6, 2, 'x', 0.5, 0, 1, 1, '#5b6472', edge(0.4)); // loading door
  iso.block(x - 0.2, y - 1.15, 1.6, 1.2, 0.14, 0.5, '#ffffff');              // robot sign
  iso.face(x - 0.2, y - 1.15, 1.6, 1.2, 0.14, 'y', 0.25, 0.22, 0.2, 0.2, '#45b6ff', {});
  iso.face(x - 0.2, y - 1.15, 1.6, 1.2, 0.14, 'y', 0.75, 0.22, 0.2, 0.2, '#45b6ff', {});
  if (level >= 2) { iso.block(x - 1.45, y + 1.05, 0, 0.6, 0.45, 0.6, '#ff9f2e'); iso.block(x - 0.8, y + 1.05, 0, 0.6, 0.45, 0.45, '#45d65c'); } // crates
  if (level >= 3) { iso.block(x + 0.6, y + 1.05, 0, 0.9, 0.45, 1.0, shade(c, 0.1)); window(iso, x + 0.6, y + 1.05, 0, 0.9, 0.45, 'y', 0.2, 0.35, 0.5, 0.4, LIT); } // annex
  if (level >= 4) flag(iso, x - 1.45, y - 1.4, t, '#b794f4', 2.9);
  if (level >= 5) crown(iso, ctx, x - 0.2, y - 1.05, 3.1, t);
}

// ---------- Flatgebouw ----------
export function flat(iso, ctx, x, y, level, t) {
  const c = '#8fc7ff';
  const floors = 3 + level;
  const h = floors * 0.62;
  pavement(iso, x, y);
  iso.shadow(x - 1, y - 1, 2, 2, h + 0.3);
  iso.block(x - 1, y - 1, 0, 2, 2, h, c);
  iso.block(x - 1.08, y - 1.08, h, 2.16, 2.16, 0.14, shade(c, -0.35));
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < 3; i++) {
      window(iso, x - 1, y - 1, 0, 2, 2, 'y', 0.2 + i * 0.6, 0.15 + f * 0.62, 0.4, 0.36, (f + i) % 3 === 0 ? LIT : '#dff1ff');
      window(iso, x - 1, y - 1, 0, 2, 2, 'x', 0.2 + i * 0.6, 0.15 + f * 0.62, 0.4, 0.36, (f + i) % 4 === 0 ? LIT : '#c9e6ff');
    }
  }
  iso.face(x - 1, y - 1, 0, 2, 2, 'x', 0.75, 0, 0.5, 0.55, '#1f2a44', edge(0.4)); // entrance
  iso.block(x + 0.3, y - 0.6, h + 0.14, 0.5, 0.5, 0.4, '#e4e8ef');           // roof box
  if (level >= 2) iso.block(x - 1.45, y + 1.05, 0, 0.9, 0.45, 0.5, '#45d65c'); // hedge
  if (level >= 3) { iso.block(x + 1.05, y - 1, 0, 0.45, 2, 0.62, shade(c, 0.1)); window(iso, x + 1.05, y - 1, 0, 0.45, 2, 'x', 0.3, 0.15, 0.4, 0.36); window(iso, x + 1.05, y - 1, 0, 0.45, 2, 'x', 1.2, 0.15, 0.4, 0.36); } // ground-floor shop
  if (level >= 4) flag(iso, x - 1.4, y - 1.4, t, '#ffd23f', h + 0.9);
  if (level >= 5) { iso.block(x - 0.8, y + 0.1, h + 0.14, 0.9, 0.6, 0.08, '#6fd35b'); iso.tree(x - 0.4, y + 0.4, 0.45); crown(iso, ctx, x, y - 1.05, h + 0.6, t); }
}

export const BUILDERS = { limonade, wasstraat, pizzeria, fabriek, flat };

export const PAINT = { none: '#fff2c9', 'verf-rood': '#ff8a80', 'verf-blauw': '#7cc4ff', 'verf-geel': '#ffe066' };

/** The child's house with garden: paint is a fun item id (verf-*) or 'none'. */
export function house(iso, ctx, x, y, paint = 'none', t = 0) {
  const wall = PAINT[paint] || PAINT.none;
  iso.groundRect(x - 1.7, y - 1.5, 3.4, 3, 0.5, '#bfe9a4', shade('#bfe9a4', -0.25));
  iso.shadow(x - 1, y - 0.8, 2, 1.6, 2.2);
  iso.block(x - 1, y - 0.8, 0, 2, 1.6, 1.3, wall);
  iso.roof(x - 1.15, y - 0.95, 1.3, 2.3, 1.9, 0.9, '#e8483f', 'x');
  iso.face(x - 1, y - 0.8, 0, 2, 1.6, 'x', 0.55, 0, 0.5, 0.9, '#8a4a1a', edge(0.4));
  iso.face(x - 1, y - 0.8, 0, 2, 1.6, 'x', 0.95, 0.4, 0.06, 0.06, '#ffd23f', {}); // door knob
  window(iso, x - 1, y - 0.8, 0, 2, 1.6, 'y', 0.25, 0.5);
  window(iso, x - 1, y - 0.8, 0, 2, 1.6, 'y', 1.25, 0.5);
  iso.block(x + 0.3, y - 0.5, 1.9, 0.3, 0.3, 0.6, METAL);
  smoke(iso, ctx, x + 0.45, y - 0.35, 2.5, t, 1600, 6);
  for (let i = 0; i < 8; i++) iso.block(x - 1.6 + i * 0.44, y + 1.35, 0, 0.12, 0.08, 0.4, '#ffffff', { edge: rgba(INK, 0.25) });
  iso.flower(x - 1.35, y + 0.95, '#ff6fae');
  iso.flower(x - 0.95, y + 1.05, '#ffe94d');
  iso.flower(x + 1.2, y + 1.0, '#7c9bff');
}
