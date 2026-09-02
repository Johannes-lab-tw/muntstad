// art/avatar.js — the blocky avatar (cube head, block body, arms and legs), hats, skins, poses and vehicles.
// drawAvatar(iso, ctx, x, y, opts): opts = { color, hat, skin, facing: 'se'|'sw'|'nw'|'ne', pose: 'idle'|'walk'|'jump'|
// 'dance'|'salto'|'wave', t (ms), phase (walk cycle seed), vehicle: null|'scooter'|'auto', z (extra height) }.
// The figure is ~1.2 world units tall (S = 0.62). The face is drawn on the visible front face only.
import { shade, rgba } from '../iso.js';

const INK = '#1b1f3b';
export const S = 0.62;
const SKIN = '#f7c59f';
const HAIR = '#6b4226';
const PANTS = '#2f3a5c';

const SKINS = {
  zombie: { skin: '#8fe3a0', body: '#5b6472', hair: '#2f5d3a', mouth: 'zigzag' },
  kikker: { skin: '#5ad46f', body: '#3fbf5a', hair: null, frogEyes: true },
  astronaut: { skin: SKIN, body: '#f4f7fb', hair: HAIR, pack: true, visor: true },
  ninja: { skin: SKIN, body: '#1b1f3b', hair: '#1b1f3b', band: true, mouth: null },
  superheld: { skin: SKIN, body: '#ff5f5f', hair: HAIR, cape: true, mask: true },
};

function facingVec(facing) {
  return facing === 'se' ? [1, 0] : facing === 'nw' ? [-1, 0] : facing === 'sw' ? [0, 1] : [0, -1];
}

/** Draws the face features on the head block at (bx, by, hz) sized S on the given side. */
function face(iso, side, bx, by, hz, opts) {
  const s = S;
  const blink = opts.blink;
  const eh = blink ? 0.03 * s : 0.2 * s;
  const ev = blink ? 0.42 * s : 0.34 * s;
  if (opts.frogEyes) {
    // eyes sit on top of the head for the frog skin; the front shows only a wide smile
    iso.face(bx, by, hz, s * 0.7, s * 0.7, side, 0.16 * s, 0.16 * s, 0.38 * s, 0.07 * s, INK);
    return;
  }
  if (opts.mask) {
    iso.face(bx, by, hz, s * 0.7, s * 0.7, side, 0.06 * s, 0.3 * s, 0.58 * s, 0.26 * s, '#2f6fd6');
  }
  if (opts.band) {
    iso.face(bx, by, hz, s * 0.7, s * 0.7, side, 0, 0.58 * s, 0.7 * s, 0.1 * s, '#ff5f5f');
  }
  iso.face(bx, by, hz, s * 0.7, s * 0.7, side, 0.14 * s, ev, 0.16 * s, eh, '#ffffff');
  iso.face(bx, by, hz, s * 0.7, s * 0.7, side, 0.4 * s, ev, 0.16 * s, eh, '#ffffff');
  if (!blink) {
    iso.face(bx, by, hz, s * 0.7, s * 0.7, side, 0.19 * s, 0.36 * s, 0.08 * s, 0.12 * s, INK);
    iso.face(bx, by, hz, s * 0.7, s * 0.7, side, 0.45 * s, 0.36 * s, 0.08 * s, 0.12 * s, INK);
  }
  if (opts.mouth === 'zigzag') {
    for (let i = 0; i < 4; i++) iso.face(bx, by, hz, s * 0.7, s * 0.7, side, 0.22 * s + i * 0.07 * s, (i % 2 ? 0.12 : 0.17) * s, 0.07 * s, 0.05 * s, INK);
  } else if (opts.mouth !== null) {
    iso.face(bx, by, hz, s * 0.7, s * 0.7, side, 0.24 * s, 0.14 * s, 0.22 * s, 0.07 * s, '#c0392b');
  }
  // rosy cheeks
  iso.face(bx, by, hz, s * 0.7, s * 0.7, side, 0.05 * s, 0.24 * s, 0.08 * s, 0.06 * s, rgba('#ff8fb1', 0.7));
  iso.face(bx, by, hz, s * 0.7, s * 0.7, side, 0.57 * s, 0.24 * s, 0.08 * s, 0.06 * s, rgba('#ff8fb1', 0.7));
}

/** Hats sit on the head top (z = top). fx/fy = facing vector so brims point forward. */
function hat(iso, ctx, id, x, y, top, fx, fy, t) {
  const s = S;
  const brim = (len, wid, thick, color) => {
    if (fx > 0) iso.block(x + 0.35 * s, y - wid / 2, top, len, wid, thick, color);
    else if (fy > 0) iso.block(x - wid / 2, y + 0.35 * s, top, wid, len, thick, color);
    else if (fx < 0) iso.block(x - 0.35 * s - len, y - wid / 2, top, len, wid, thick, color);
    else iso.block(x - wid / 2, y - 0.35 * s - len, top, wid, len, thick, color);
  };
  switch (id) {
    case 'pet':
      iso.block(x - 0.37 * s, y - 0.37 * s, top, 0.74 * s, 0.74 * s, 0.22 * s, '#ff5f5f');
      brim(0.34 * s, 0.5 * s, 0.07 * s, '#ff5f5f');
      break;
    case 'strohoed':
      iso.block(x - 0.62 * s, y - 0.62 * s, top, 1.24 * s, 1.24 * s, 0.06 * s, '#f4d98a');
      iso.block(x - 0.36 * s, y - 0.36 * s, top + 0.06 * s, 0.72 * s, 0.72 * s, 0.28 * s, '#f4d98a');
      iso.block(x - 0.37 * s, y - 0.37 * s, top + 0.1 * s, 0.74 * s, 0.74 * s, 0.08 * s, '#ff5f5f');
      break;
    case 'helm':
      iso.block(x - 0.4 * s, y - 0.4 * s, top - 0.06 * s, 0.8 * s, 0.8 * s, 0.32 * s, '#ff5f5f');
      iso.block(x - 0.28 * s, y - 0.28 * s, top + 0.26 * s, 0.56 * s, 0.56 * s, 0.14 * s, '#ff5f5f');
      iso.block(x - 0.08 * s, y - 0.4 * s, top + 0.27 * s, 0.16 * s, 0.8 * s, 0.14 * s, '#ffffff');
      break;
    case 'hogehoed':
      iso.block(x - 0.5 * s, y - 0.5 * s, top, 1.0 * s, 1.0 * s, 0.06 * s, '#1b1f3b', { edge: rgba('#000', 0.3) });
      iso.block(x - 0.32 * s, y - 0.32 * s, top + 0.06 * s, 0.64 * s, 0.64 * s, 0.7 * s, '#2a2f4d');
      iso.block(x - 0.33 * s, y - 0.33 * s, top + 0.12 * s, 0.66 * s, 0.66 * s, 0.12 * s, '#ff5f5f');
      break;
    case 'feestmuts':
      iso.pyramid(x - 0.34 * s, y - 0.34 * s, top, 0.68 * s, 0.68 * s, 0.9 * s, '#ff6fae');
      iso.block(x - 0.12 * s, y - 0.12 * s, top + 0.9 * s, 0.24 * s, 0.24 * s, 0.2 * s, '#ffe94d');
      break;
    case 'piraat':
      iso.block(x - 0.62 * s, y - 0.62 * s, top, 1.24 * s, 1.24 * s, 0.12 * s, '#1b1f3b', { edge: rgba('#000', 0.3) });
      iso.block(x - 0.4 * s, y - 0.4 * s, top + 0.12 * s, 0.8 * s, 0.8 * s, 0.3 * s, '#2a2f4d');
      if (fx > 0) { iso.face(x - 0.4 * s, y - 0.4 * s, top + 0.12 * s, 0.8 * s, 0.8 * s, 'x', 0.3 * s, 0.08 * s, 0.2 * s, 0.16 * s, '#ffffff'); }
      if (fy > 0) { iso.face(x - 0.4 * s, y - 0.4 * s, top + 0.12 * s, 0.8 * s, 0.8 * s, 'y', 0.3 * s, 0.08 * s, 0.2 * s, 0.16 * s, '#ffffff'); }
      break;
    case 'cowboy':
      iso.block(x - 0.62 * s, y - 0.62 * s, top, 1.24 * s, 1.24 * s, 0.08 * s, '#8a5a35');
      iso.block(x - 0.36 * s, y - 0.36 * s, top + 0.08 * s, 0.72 * s, 0.72 * s, 0.42 * s, '#b5763f');
      iso.block(x - 0.37 * s, y - 0.37 * s, top + 0.12 * s, 0.74 * s, 0.74 * s, 0.08 * s, '#1b1f3b', { edge: false });
      break;
    case 'tovenaar':
      iso.block(x - 0.55 * s, y - 0.55 * s, top, 1.1 * s, 1.1 * s, 0.08 * s, '#2f6fd6');
      iso.pyramid(x - 0.36 * s, y - 0.36 * s, top + 0.08 * s, 0.72 * s, 0.72 * s, 1.1 * s, '#3b82f6');
      iso.block(x - 0.06 * s, y - 0.06 * s, top + 1.18 * s, 0.12 * s, 0.12 * s, 0.12 * s, '#ffe94d');
      break;
    case 'kroon':
      iso.block(x - 0.3 * s, y - 0.3 * s, top, 0.6 * s, 0.6 * s, 0.22 * s, '#ffc21c');
      for (const [dx, dy, col] of [[0, 0, '#ff5f5f'], [0.45, 0, '#45b6ff'], [0, 0.45, '#45d65c'], [0.45, 0.45, '#ff6fae']]) {
        iso.block(x - 0.3 * s + dx * s, y - 0.3 * s + dy * s, top + 0.22 * s, 0.15 * s, 0.15 * s, 0.2 * s, '#ffe58a');
        iso.block(x - 0.27 * s + dx * s, y - 0.27 * s + dy * s, top + 0.42 * s, 0.09 * s, 0.09 * s, 0.09 * s, col, { edge: false });
      }
      break;
    default:
      break;
  }
}

/**
 * Draw the avatar with its feet at world (x, y). Returns the head top z (for effects).
 */
export function drawAvatar(iso, ctx, x, y, opts = {}) {
  const {
    color = '#3b82f6', hat: hatId = null, skin = null, facing = 'se', pose = 'idle', t = 0, phase = 0, vehicle = null, z: extraZ = 0,
  } = opts;
  const sk = SKINS[skin] || {};
  const skinC = sk.skin || SKIN;
  const bodyC = sk.body || color;
  const hairC = sk.hair === undefined ? HAIR : sk.hair;
  const s = S;
  const [fx, fy] = facingVec(facing);
  const side = facing === 'se' ? 'x' : facing === 'sw' ? 'y' : null;

  let swing = 0, armUp = 0, bob = 0, z = extraZ, spin = 0;
  if (pose === 'walk') { swing = Math.sin(t / 110 + phase); bob = Math.abs(swing) * 0.03; }
  else if (pose === 'idle') { bob = Math.sin(t / 900 + phase) * 0.015; }
  else if (pose === 'jump') { armUp = 1; }
  else if (pose === 'dance') { swing = Math.sin(t / 140) * 0.8; armUp = Math.abs(Math.sin(t / 140)); bob = Math.abs(Math.sin(t / 140)) * 0.12; }
  else if (pose === 'wave') { armUp = 0.5 + Math.sin(t / 160) * 0.5; }
  else if (pose === 'salto') { spin = (Math.min(1, Math.max(0, t / 1000)) % 1) * Math.PI * 2; } // t = ms since the salto started
  const blink = pose !== 'salto' && ((t + phase * 1000) % 3200) < 130;

  if (vehicle === 'auto') {
    drawCar(iso, ctx, x, y, facing, color, t);
    z += 0.55;
  } else if (vehicle === 'scooter') {
    drawScooter(iso, ctx, x, y, facing, t);
    z += 0.16;
  } else {
    iso.blob(x, y, 0.42, 0.25);
  }

  ctx.save();
  if (spin) {
    // salto: rotate the whole figure around its centre in screen space
    const [cx, cy] = iso.P(x, y, z + 0.95 * s);
    ctx.translate(cx, cy);
    ctx.rotate(spin);
    ctx.translate(-cx, -cy);
  }

  const legH = 0.75 * s;
  if (vehicle !== 'auto') {
    // legs (hidden inside the car)
    const lx = fx * swing * 0.15 * s, ly = fy * swing * 0.15 * s;
    iso.block(x - 0.24 * s + lx, y - 0.12 * s + ly, z, 0.22 * s, 0.24 * s, legH, PANTS);
    iso.block(x + 0.02 * s - lx, y - 0.12 * s - ly, z, 0.22 * s, 0.24 * s, legH, PANTS);
  }
  const torsoZ = z + legH + bob;
  if (sk.cape) iso.block(x - 0.33 * s, y - 0.33 * s, torsoZ - 0.2 * s, 0.66 * s, 0.1 * s, 0.95 * s, '#ffe066');
  if (sk.pack) iso.block(x - 0.25 * s, y - 0.34 * s, torsoZ + 0.05 * s, 0.5 * s, 0.14 * s, 0.7 * s, '#c9d1dc');
  iso.block(x - 0.35 * s, y - 0.2 * s, torsoZ, 0.7 * s, 0.4 * s, 0.8 * s, bodyC);
  if (sk.superheld || skin === 'superheld') iso.face(x - 0.35 * s, y - 0.2 * s, torsoZ, 0.7 * s, 0.4 * s, side || 'x', 0.2 * s, 0.3 * s, 0.3 * s, 0.3 * s, '#ffe066');
  // arms
  const ax = fx * swing * 0.12 * s, ay = fy * swing * 0.12 * s;
  const armH = 0.72 * s;
  const upZ = armUp * 0.55 * s;
  iso.block(x - 0.58 * s - ax, y - 0.16 * s - ay, torsoZ + 0.03 * s + upZ, 0.2 * s, 0.32 * s, armH, skinC);
  iso.block(x + 0.38 * s + ax, y - 0.16 * s + ay, torsoZ + 0.03 * s + upZ, 0.2 * s, 0.32 * s, armH, skinC);
  // head
  const hz = torsoZ + 0.8 * s;
  const top = head(iso, ctx, x, y, hz, { side, sk, hairC, skinC, blink, hatId, fx, fy, t });
  ctx.restore();
  return top;
}

/** Cube head with hair, face, skin extras and hat; returns the top z. */
function head(iso, ctx, x, y, hz, { side, sk, hairC, skinC, blink, hatId, fx, fy, t }) {
  const s = S;
  const bx = x - 0.35 * s, by = y - 0.35 * s;
  iso.block(bx, by, hz, 0.7 * s, 0.7 * s, 0.7 * s, skinC);
  if (hairC) {
    iso.slab(bx, by, hz + 0.7 * s, 0.7 * s, 0.7 * s, hairC);
    // fringe on the front face; on the back views the whole back of the head is hair
    if (side === 'x') iso.face(bx, by, hz, 0.7 * s, 0.7 * s, 'x', 0, 0.58 * s, 0.7 * s, 0.12 * s, hairC);
    if (side === 'y') iso.face(bx, by, hz, 0.7 * s, 0.7 * s, 'y', 0, 0.58 * s, 0.7 * s, 0.12 * s, hairC);
    if (!side) { iso.face(bx, by, hz, 0.7 * s, 0.7 * s, 'x', 0, 0.2 * s, 0.7 * s, 0.5 * s, hairC); iso.face(bx, by, hz, 0.7 * s, 0.7 * s, 'y', 0, 0.2 * s, 0.7 * s, 0.5 * s, hairC); }
  }
  if (sk.frogEyes) {
    iso.block(x - 0.32 * s, y - 0.32 * s, hz + 0.7 * s, 0.24 * s, 0.24 * s, 0.24 * s, '#ffffff');
    iso.block(x + 0.08 * s, y - 0.32 * s, hz + 0.7 * s, 0.24 * s, 0.24 * s, 0.24 * s, '#ffffff');
    iso.block(x - 0.26 * s, y - 0.26 * s, hz + 0.94 * s, 0.12 * s, 0.12 * s, 0.06 * s, INK, { edge: false });
    iso.block(x + 0.14 * s, y - 0.26 * s, hz + 0.94 * s, 0.12 * s, 0.12 * s, 0.06 * s, INK, { edge: false });
  }
  if (side) face(iso, side, bx, by, hz, { ...sk, blink });
  if (sk.visor) {
    iso.block(bx - 0.06 * s, by - 0.06 * s, hz - 0.04 * s, 0.82 * s, 0.82 * s, 0.1 * s, '#e4e8ef');
    iso.block(bx - 0.06 * s, by - 0.06 * s, hz + 0.64 * s, 0.82 * s, 0.82 * s, 0.1 * s, '#e4e8ef');
  }
  if (hatId) hat(iso, ctx, hatId, x, y, hz + 0.7 * s + (hairC ? 0.02 * s : 0), fx, fy, t);
  return hz + 0.7 * s;
}

/** Only the head (for hat cards): feet point (x, y) is the head's base. */
export function drawHead(iso, ctx, x, y, opts = {}) {
  const { color = '#3b82f6', hat: hatId = null, skin = null, facing = 'se', t = 0, z = 0 } = opts;
  const sk = SKINS[skin] || {};
  const [fx, fy] = facingVec(facing);
  const side = facing === 'se' ? 'x' : facing === 'sw' ? 'y' : null;
  iso.blob(x, y, 0.3, 0.2);
  return head(iso, ctx, x, y, z, { side, sk, hairC: sk.hair === undefined ? HAIR : sk.hair, skinC: sk.skin || SKIN, blink: false, hatId, fx, fy, t });
}

/** Blocky car in the avatar colour, centred at (x, y), long axis along the facing direction. */
export function drawCar(iso, ctx, x, y, facing, color = '#3b82f6', t = 0) {
  const alongX = facing === 'se' || facing === 'nw';
  const w = alongX ? 1.5 : 0.8, d = alongX ? 0.8 : 1.5;
  iso.shadow(x - w / 2, y - d / 2, w, d, 0.55, 0.8);
  const wc = '#1b1f3b';
  if (alongX) for (const dx of [-0.45, 0.35]) for (const dy of [-0.42, 0.28]) iso.block(x + dx, y + dy, 0, 0.3, 0.14, 0.26, wc, { edge: false });
  else for (const dy of [-0.45, 0.35]) for (const dx of [-0.42, 0.28]) iso.block(x + dx, y + dy, 0, 0.14, 0.3, 0.26, wc, { edge: false });
  iso.block(x - w / 2, y - d / 2, 0.18, w, d, 0.4, color);
  const cw = alongX ? 0.8 : 0.7, cd = alongX ? 0.7 : 0.8;
  const cx = x - cw / 2 + (alongX ? -0.1 : 0), cy = y - cd / 2 + (alongX ? 0 : -0.1);
  iso.block(cx, cy, 0.58, cw, cd, 0.36, shade(color, 0.05));
  iso.face(cx, cy, 0.58, cw, cd, 'x', 0.08, 0.06, cd - 0.16, 0.26, '#bfe6ff', { edge: rgba(INK, 0.4) });
  iso.face(cx, cy, 0.58, cw, cd, 'y', 0.08, 0.06, cw - 0.16, 0.26, '#bfe6ff', { edge: rgba(INK, 0.4) });
  // headlights on the front
  if (facing === 'se') { iso.face(x - w / 2, y - d / 2, 0.18, w, d, 'x', 0.1, 0.12, 0.14, 0.14, '#ffe94d'); iso.face(x - w / 2, y - d / 2, 0.18, w, d, 'x', d - 0.24, 0.12, 0.14, 0.14, '#ffe94d'); }
  if (facing === 'sw') { iso.face(x - w / 2, y - d / 2, 0.18, w, d, 'y', 0.1, 0.12, 0.14, 0.14, '#ffe94d'); iso.face(x - w / 2, y - d / 2, 0.18, w, d, 'y', w - 0.24, 0.12, 0.14, 0.14, '#ffe94d'); }
}

export function drawScooter(iso, ctx, x, y, facing, t = 0) {
  const alongX = facing === 'se' || facing === 'nw';
  const w = alongX ? 1.0 : 0.36, d = alongX ? 0.36 : 1.0;
  iso.shadow(x - w / 2, y - d / 2, w, d, 0.3, 0.7);
  const wc = '#1b1f3b';
  if (alongX) { iso.block(x - 0.5, y - 0.1, 0, 0.22, 0.2, 0.24, wc, { edge: false }); iso.block(x + 0.28, y - 0.1, 0, 0.22, 0.2, 0.24, wc, { edge: false }); }
  else { iso.block(x - 0.1, y - 0.5, 0, 0.2, 0.22, 0.24, wc, { edge: false }); iso.block(x - 0.1, y + 0.28, 0, 0.2, 0.22, 0.24, wc, { edge: false }); }
  iso.block(x - w / 2, y - d / 2, 0.14, w, d, 0.06, '#45b6ff');
  // handlebar at the front
  const [fx, fy] = facingVec(facing);
  const hx = x + fx * 0.42, hy = y + fy * 0.42;
  iso.block(hx - 0.04, hy - 0.04, 0.2, 0.08, 0.08, 1.05, '#9aa3b2');
  if (alongX) iso.block(hx - 0.04, hy - 0.22, 1.2, 0.08, 0.44, 0.06, INK, { edge: false });
  else iso.block(hx - 0.22, hy - 0.04, 1.2, 0.44, 0.08, 0.06, INK, { edge: false });
}
