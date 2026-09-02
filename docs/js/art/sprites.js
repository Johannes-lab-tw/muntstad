// art/sprites.js — renders the blocky art to small images (data URLs) for shop cards, signs, the START avatar
// preview and HUD icons. Every sprite is drawn once per key and cached.
import { createIso } from '../iso.js';
import { BUILDERS, house, makerHeight } from './buildings.js';
import { drawAvatar, drawHead, drawCar, drawScooter } from './avatar.js';
import { drawProp } from './props.js';
import { drawPet } from './pets.js';

const cache = new Map();

/** Render `draw(iso, ctx)` into a square canvas of `size` CSS px; returns the canvas. */
export function renderSprite(draw, { size = 160, unit = 30, ox = null, oy = null, dpr = null } = {}) {
  const scale = dpr || Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const c = document.createElement('canvas');
  c.width = Math.round(size * scale);
  c.height = Math.round(size * scale);
  const ctx = c.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const iso = createIso(ctx, { unit, ox: ox == null ? size / 2 : ox, oy: oy == null ? size * 0.6 : oy });
  draw(iso, ctx);
  return c;
}

export function spriteURL(key, draw, opts) {
  let url = cache.get(key);
  if (!url) {
    url = renderSprite(draw, opts).toDataURL('image/png');
    cache.set(key, url);
  }
  return url;
}

export function makerSprite(id, size = 160, level = 1) {
  // the plot is 3 units wide (6 units across in iso) and the building may be tall: scale so the whole thing fits
  const h = makerHeight(id, level);
  const unit = size / Math.max(6.4, 1.6 + h + 1.5);
  return spriteURL(`maker:${id}:${level}:${size}`, (iso, ctx) => BUILDERS[id](iso, ctx, 0, 0, level, 400), { size, unit, oy: size - unit * 1.6 - size * 0.04 });
}

export function houseSprite(paint = 'none', size = 160) {
  const unit = size / 6.4;
  return spriteURL(`house:${paint}:${size}`, (iso, ctx) => house(iso, ctx, 0, 0, paint, 400), { size, unit, oy: size - unit * 1.75 - size * 0.06 });
}

export function avatarSprite({ color = '#3b82f6', hat = null, skin = null, pose = 'idle', facing = 'se' } = {}, size = 160) {
  const unit = size / 2.2;
  return spriteURL(`avatar:${color}:${hat}:${skin}:${pose}:${facing}:${size}`, (iso, ctx) => drawAvatar(iso, ctx, 0, 0, { color, hat, skin, pose, facing, t: 400 }), { size, unit, oy: size - unit * 0.45 });
}

/** Head + hat close-up for hat cards. */
export function hatSprite(hat, color = '#3b82f6', size = 160) {
  const unit = size / 1.25;
  return spriteURL(`hat:${hat}:${size}`, (iso, ctx) => drawHead(iso, ctx, 0, 0, { color, hat, facing: 'se', t: 400 }), { size, unit, oy: size - unit * 0.34 });
}

export function vehicleSprite(kind, color = '#3b82f6', size = 160) {
  const unit = size / 2.6;
  return spriteURL(`vehicle:${kind}:${color}:${size}`, (iso, ctx) => {
    if (kind === 'auto') drawCar(iso, ctx, 0, 0, 'se', color, 400);
    else drawScooter(iso, ctx, 0, 0, 'se', 400);
  }, { size, unit, oy: size * 0.62 });
}

export function propSprite(id, size = 160) {
  const unit = id === 'trampoline' ? size / 2.6 : size / 2.4;
  return spriteURL(`prop:${id}:${size}`, (iso, ctx) => drawProp(iso, ctx, id, 0, 0, 400), { size, unit, oy: size - unit * 0.7 });
}

export function petSprite(id, size = 160) {
  const unit = size / 2.1;
  return spriteURL(`pet:${id}:${size}`, (iso, ctx) => drawPet(iso, ctx, id, 0, 0, { t: 400, facing: 'se' }), { size, unit, oy: size - unit * 0.5 });
}

export function fireworkSprite(size = 160) {
  // a blocky burst: a rocket tube on the ground and a ring of coloured cubes in the air, in the same voxel style
  const unit = size / 3.2;
  return spriteURL(`firework:${size}`, (iso, ctx) => {
    const cols = ['#ff5f5f', '#ffc21c', '#45d65c', '#45b6ff', '#b76cff', '#ff6fae'];
    iso.blob(0, 0, 0.3, 0.2);
    iso.block(-0.12, -0.12, 0, 0.24, 0.24, 0.6, '#ff5f5f');
    iso.pyramid(-0.14, -0.14, 0.6, 0.28, 0.28, 0.25, '#ffc21c');
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = 0.55 + (i % 2) * 0.25;
      const cx = Math.cos(a) * r, cy = Math.sin(a) * r * 0.5;
      iso.block(cx - 0.1, cy - 0.1, 1.5 + Math.sin(a) * 0.5, 0.2, 0.2, 0.2, cols[i % cols.length], { edge: false });
    }
    for (let i = 0; i < 5; i++) iso.block(-0.06 + (i % 2) * 0.05, -0.06, 0.9 + i * 0.12, 0.1, 0.1, 0.06, '#ffe94d', { edge: false });
  }, { size, unit, oy: size * 0.9 });
}

/** Sprite for any catalogue item (maker or fun) by config entry. */
export function itemSprite(item, { color = '#3b82f6', size = 160, maker = false } = {}) {
  if (maker) return makerSprite(item.id, size);
  switch (item.kind) {
    case 'hat': return hatSprite(item.id, color, size);
    case 'skin': return avatarSprite({ color, skin: item.id }, size);
    case 'vehicle': return vehicleSprite(item.id, color, size);
    case 'paint': return houseSprite(item.id, size);
    case 'garden': return propSprite(item.id, size);
    case 'pet': return petSprite(item.id, size);
    case 'show': return fireworkSprite(size);
    case 'dance': return avatarSprite({ color, pose: item.id === 'salto' ? 'salto' : 'dance' }, size);
    case 'toy': return propSprite('trampoline', size);
    default: return propSprite(item.id, size);
  }
}

/** Small blocky icons for the HUD and navigation buttons. */
export function navSprite(kind, size = 72) {
  const u = size / 2.4;
  return spriteURL(`nav:${kind}:${size}`, (iso, ctx) => {
    switch (kind) {
      case 'werk': // bucket with a sponge and foam
        iso.blob(0, 0, 0.5, 0.2);
        iso.block(-0.4, -0.4, 0, 0.8, 0.8, 0.7, '#45b6ff');
        iso.block(-0.44, -0.44, 0.62, 0.88, 0.88, 0.1, '#1a7ad6');
        iso.block(-0.28, -0.22, 0.72, 0.5, 0.34, 0.26, '#ffe94d');
        for (const [dx, dy, r] of [[-0.25, -0.35, 0.16], [0.28, -0.3, 0.12], [0.05, -0.55, 0.1]]) {
          const [X, Y] = iso.P(dx, dy, 1.05);
          ctx.beginPath(); ctx.arc(X, Y, r * u, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(27,31,59,0.4)'; ctx.stroke();
        }
        break;
      case 'winkel': // shopping cart
        iso.blob(0, 0.1, 0.55, 0.2);
        iso.block(-0.35, -0.2, 0, 0.16, 0.16, 0.2, '#1b1f3b', { edge: false });
        iso.block(0.3, -0.2, 0, 0.16, 0.16, 0.2, '#1b1f3b', { edge: false });
        iso.block(-0.5, -0.35, 0.22, 1.0, 0.7, 0.55, '#ffc21c');
        iso.slab(-0.42, -0.27, 0.77, 0.84, 0.54, '#e08a00');
        iso.block(-0.3, -0.2, 0.77, 0.3, 0.3, 0.3, '#ff5f5f');
        iso.block(0.05, -0.15, 0.77, 0.28, 0.28, 0.22, '#45d65c');
        iso.block(0.5, 0.15, 0.22, 0.08, 0.08, 1.0, '#5b6472');
        iso.block(0.4, 0.15, 1.15, 0.28, 0.08, 0.08, '#5b6472');
        break;
      case 'huis':
        iso.blob(0, 0, 0.7, 0.2);
        iso.block(-0.5, -0.4, 0, 1.0, 0.8, 0.65, '#fff2c9');
        iso.roof(-0.58, -0.48, 0.65, 1.16, 0.96, 0.5, '#e8483f', 'x');
        iso.face(-0.5, -0.4, 0, 1.0, 0.8, 'x', 0.28, 0, 0.24, 0.45, '#8a4a1a');
        iso.face(-0.5, -0.4, 0, 1.0, 0.8, 'y', 0.15, 0.25, 0.26, 0.26, '#cfe9ff');
        iso.face(-0.5, -0.4, 0, 1.0, 0.8, 'y', 0.6, 0.25, 0.26, 0.26, '#cfe9ff');
        break;
      case 'stad': // mini island with a tree and a house block
        iso.groundRect(-0.9, -0.7, 1.8, 1.4, 0.5, '#f4d98a', '#c9a24a', 0.06);
        iso.groundRect(-0.75, -0.55, 1.5, 1.1, 0.4, '#6fd35b');
        iso.block(-0.55, -0.3, 0, 0.5, 0.45, 0.4, '#fff2c9');
        iso.roof(-0.6, -0.35, 0.4, 0.6, 0.55, 0.3, '#e8483f', 'x');
        iso.tree(0.35, 0.15, 0.45);
        break;
      case 'makers': // little factory with a coin above
        iso.blob(0, 0, 0.6, 0.2);
        iso.block(-0.5, -0.35, 0, 1.0, 0.7, 0.55, '#b794f4');
        iso.roof(-0.5, -0.35, 0.55, 0.5, 0.7, 0.28, '#8a5cf0', 'y');
        iso.roof(0, -0.35, 0.55, 0.5, 0.7, 0.28, '#8a5cf0', 'y');
        iso.block(0.2, -0.2, 0.6, 0.16, 0.16, 0.5, '#9aa3b2');
        { const [X, Y] = iso.P(-0.1, -0.1, 1.5); iso.coin(X, Y, u * 0.24, 0.3); }
        break;
      case 'fun': // gift box with a ribbon
        iso.blob(0, 0, 0.5, 0.2);
        iso.block(-0.4, -0.4, 0, 0.8, 0.8, 0.6, '#ff6fae');
        iso.block(-0.44, -0.44, 0.6, 0.88, 0.88, 0.14, '#ff8fc0');
        iso.block(-0.08, -0.46, 0, 0.16, 0.92, 0.76, '#ffe94d', { edge: false });
        iso.block(-0.46, -0.08, 0, 0.92, 0.16, 0.76, '#ffe94d', { edge: false });
        iso.block(-0.2, -0.2, 0.74, 0.4, 0.4, 0.2, '#ffe94d', { edge: false });
        break;
      case 'income': // stack of coins
        for (let i = 0; i < 3; i++) { const [X, Y] = iso.P(0.35 - i * 0.35, 0.35 - i * 0.35, 0.05 + i * 0.05); iso.coin(X, Y + u * 0.2, u * 0.4, 0); }
        break;
      case 'car':
        drawCar(iso, ctx, 0, 0, 'se', '#ff5f5f', 0);
        break;
      default:
        iso.block(-0.3, -0.3, 0, 0.6, 0.6, 0.6, '#b794f4');
    }
  }, { size, unit: u, oy: size * 0.72 });
}

export function clearSpriteCache() {
  cache.clear();
}
