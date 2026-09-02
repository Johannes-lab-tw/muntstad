// art/pets.js — dog, cat and dino as blocky 3D pets. drawPet(iso, ctx, id, x, y, opts)
// opts = { t, facing: 'se'|'sw', sleeping, phase }. ~0.7 world units tall; feet at (x, y).
import { shade, rgba } from '../iso.js';

const INK = '#1b1f3b';

function eyes(iso, side, bx, by, bz, bw, bd, s, sleeping) {
  if (sleeping) {
    iso.face(bx, by, bz, bw, bd, side, 0.16 * s, 0.4 * s, 0.14 * s, 0.03 * s, INK);
    iso.face(bx, by, bz, bw, bd, side, 0.42 * s, 0.4 * s, 0.14 * s, 0.03 * s, INK);
    return;
  }
  iso.face(bx, by, bz, bw, bd, side, 0.16 * s, 0.36 * s, 0.14 * s, 0.16 * s, '#ffffff');
  iso.face(bx, by, bz, bw, bd, side, 0.42 * s, 0.36 * s, 0.14 * s, 0.16 * s, '#ffffff');
  iso.face(bx, by, bz, bw, bd, side, 0.2 * s, 0.38 * s, 0.07 * s, 0.1 * s, INK);
  iso.face(bx, by, bz, bw, bd, side, 0.46 * s, 0.38 * s, 0.07 * s, 0.1 * s, INK);
}

export const PETS = {
  hond(iso, ctx, x, y, { t = 0, facing = 'se', sleeping = false, phase = 0 }) {
    const c = '#c98a4b', dark = '#8a5a35';
    const side = facing === 'sw' ? 'y' : 'x';
    const bob = sleeping ? 0 : Math.abs(Math.sin(t / 300 + phase)) * 0.05;
    const bodyH = sleeping ? 0.3 : 0.42;
    iso.blob(x, y, 0.55, 0.22);
    if (!sleeping) for (const [dx, dy] of [[-0.42, -0.22], [0.08, -0.22], [-0.42, 0.06], [0.08, 0.06]]) iso.block(x + dx, y + dy, 0, 0.18, 0.18, 0.26, dark);
    const bz = sleeping ? 0 : 0.24;
    iso.block(x - 0.5, y - 0.28, bz + bob, 0.82, 0.5, bodyH, c);
    // tail (wags)
    const wag = Math.sin(t / 120 + phase) * 0.12;
    iso.block(x - 0.62, y - 0.1 + wag, bz + bob + bodyH - 0.1, 0.16, 0.1, 0.3, dark);
    // head
    const hz = bz + bob + bodyH - 0.1;
    const hx = x + 0.2, hy = y - 0.3;
    iso.block(hx, hy, hz, 0.5, 0.52, 0.48, c);
    iso.block(hx - 0.02, hy - 0.06, hz + 0.3, 0.14, 0.12, 0.3, dark); // ears
    iso.block(hx + 0.38, hy + 0.46, hz + 0.3, 0.14, 0.12, 0.3, dark);
    if (side === 'x') { iso.face(hx, hy, hz, 0.5, 0.52, 'x', 0.18, 0.05, 0.16, 0.14, INK); }
    else { iso.face(hx, hy, hz, 0.5, 0.52, 'y', 0.18, 0.05, 0.16, 0.14, INK); }
    eyes(iso, side, hx, hy, hz, 0.5, 0.52, 0.72, sleeping);
    iso.block(hx - 0.02, hy - 0.02, hz - 0.02, 0.54, 0.56, 0.08, '#ff5f5f'); // collar
  },
  kat(iso, ctx, x, y, { t = 0, facing = 'se', sleeping = false, phase = 0 }) {
    const c = '#b9c0cc', dark = '#7b8494';
    const side = facing === 'sw' ? 'y' : 'x';
    const bob = sleeping ? 0 : Math.abs(Math.sin(t / 340 + phase)) * 0.04;
    iso.blob(x, y, 0.5, 0.22);
    if (!sleeping) for (const [dx, dy] of [[-0.36, -0.18], [0.06, -0.18], [-0.36, 0.04], [0.06, 0.04]]) iso.block(x + dx, y + dy, 0, 0.15, 0.15, 0.22, dark);
    const bz = sleeping ? 0 : 0.2;
    const bodyH = sleeping ? 0.26 : 0.36;
    iso.block(x - 0.45, y - 0.24, bz + bob, 0.72, 0.42, bodyH, c);
    const curl = Math.sin(t / 400 + phase) * 0.08;
    iso.block(x - 0.62, y - 0.02 + curl, bz + bob + 0.05, 0.2, 0.08, 0.45, dark); // tail
    const hz = bz + bob + bodyH - 0.06;
    const hx = x + 0.16, hy = y - 0.26;
    iso.block(hx, hy, hz, 0.44, 0.46, 0.4, c);
    iso.pyramid(hx + 0.02, hy + 0.02, hz + 0.4, 0.14, 0.14, 0.2, c); // ears
    iso.pyramid(hx + 0.28, hy + 0.3, hz + 0.4, 0.14, 0.14, 0.2, c);
    eyes(iso, side, hx, hy, hz, 0.44, 0.46, 0.64, sleeping);
    iso.face(hx, hy, hz, 0.44, 0.46, side, 0.19, 0.12, 0.08, 0.06, '#ff8fb1'); // nose
  },
  dino(iso, ctx, x, y, { t = 0, facing = 'se', sleeping = false, phase = 0 }) {
    const c = '#45d65c', dark = '#1d9a37';
    const side = facing === 'sw' ? 'y' : 'x';
    const bob = sleeping ? 0 : Math.abs(Math.sin(t / 280 + phase)) * 0.06;
    iso.blob(x, y, 0.6, 0.22);
    if (!sleeping) for (const [dx, dy] of [[-0.4, -0.2], [0.1, -0.2]]) iso.block(x + dx, y + dy, 0, 0.26, 0.3, 0.32, dark);
    const bz = sleeping ? 0 : 0.3;
    const bodyH = sleeping ? 0.34 : 0.5;
    iso.block(x - 0.55, y - 0.3, bz + bob, 0.9, 0.55, bodyH, c);
    for (let i = 0; i < 4; i++) iso.pyramid(x - 0.5 + i * 0.22, y - 0.12, bz + bob + bodyH, 0.16, 0.16, 0.2, dark); // back spikes
    const sway = Math.sin(t / 260 + phase) * 0.1;
    iso.block(x - 0.85, y - 0.1 + sway, bz + bob + 0.1, 0.36, 0.16, 0.18, c); // tail
    const hz = bz + bob + bodyH;
    const hx = x + 0.2, hy = y - 0.28;
    iso.block(hx - 0.05, hy + 0.1, hz - 0.15, 0.24, 0.24, 0.3, c); // neck
    iso.block(hx, hy, hz + 0.1, 0.56, 0.5, 0.42, c);
    eyes(iso, side, hx, hy, hz + 0.1, 0.56, 0.5, 0.72, sleeping);
    iso.face(hx, hy, hz + 0.1, 0.56, 0.5, side, 0.1, 0.06, 0.34, 0.08, '#ffffff'); // teeth strip
  },
};

export function drawPet(iso, ctx, id, x, y, opts = {}) {
  const fn = PETS[id];
  if (fn) fn(iso, ctx, x, y, opts);
  else iso.block(x - 0.25, y - 0.25, 0, 0.5, 0.5, 0.5, '#ff9f2e');
}
