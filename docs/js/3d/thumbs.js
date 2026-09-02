// 3d/thumbs.js — still images (data URLs) of the 3D art for shop cards, popups, the START avatar preview and HUD
// icons: each item is rendered once with the shared renderer into an offscreen target and cached.
// Same exports as the old art/sprites.js, so the call sites only changed their import path.
import * as T from '../../vendor/three.module.min.js';
import { Builder, col, meshCoin } from './build.js';
import { makerModel, houseModel } from './buildings.js';
import { avatarModel, carModel, scooterModel } from './avatar.js';
import { propModel } from './props.js';
import { petModel } from './pets.js';

const cache = new Map();
let engine = null;
let rt = null;
let rtSize = 0;
const lightsScene = new T.Scene();

export function setThumbEngine(e) { engine = e; }

function ensureTarget(px) {
  if (rt && rtSize === px) return rt;
  if (rt) rt.dispose();
  rt = new T.WebGLRenderTarget(px, px, { samples: 4, depthBuffer: true });
  rt.texture.colorSpace = T.SRGBColorSpace;
  rtSize = px;
  return rt;
}

/**
 * Render `group` into a square image of `size` CSS px. fit = { box (Box3, optional), margin, elev, az, pad }.
 * The camera looks from the toy-town angle and frames the object's bounding box.
 */
export function renderThumb(group, { size = 160, margin = 1.12, elev = 0.5, az = Math.PI / 4, box = null, lift = 0 } = {}) {
  if (!engine) return '';
  const scale = Math.min(2, window.devicePixelRatio || 1);
  const px = Math.round(size * scale);
  const target = ensureTarget(px);
  const scene = new T.Scene();
  scene.add(group);
  const sun = new T.DirectionalLight(0xfff6e0, 2.3);
  sun.position.set(-4, 7, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -4; sun.shadow.camera.right = 4; sun.shadow.camera.top = 4; sun.shadow.camera.bottom = -4;
  sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 30;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  scene.add(new T.HemisphereLight(0xd6f0ff, 0x6fa84f, 0.9));
  const fill = new T.DirectionalLight(0xffffff, 0.4);
  fill.position.set(5, 3, -3);
  scene.add(fill);
  group.updateMatrixWorld(true);
  const b = box || new T.Box3().setFromObject(group);
  const c = b.getCenter(new T.Vector3());
  const s = b.getSize(new T.Vector3());
  c.y += lift;
  const radius = Math.max(s.x, s.y, s.z) * 0.5 * margin + 0.05;
  const camera = new T.PerspectiveCamera(28, 1, 0.1, 100);
  const dist = radius / Math.sin((camera.fov * Math.PI) / 360);
  const dir = new T.Vector3(Math.cos(elev) * Math.sin(az), Math.sin(elev), Math.cos(elev) * Math.cos(az)).normalize();
  camera.position.copy(c).addScaledVector(dir, dist);
  camera.lookAt(c);
  camera.updateProjectionMatrix();
  const r = engine.renderer;
  const prevTarget = r.getRenderTarget();
  r.setRenderTarget(target);
  r.setClearColor(0x000000, 0);
  r.clear();
  r.render(scene, camera);
  const pixels = new Uint8Array(px * px * 4);
  r.readRenderTargetPixels(target, 0, 0, px, px, pixels);
  r.setRenderTarget(prevTarget);
  const canvas = document.createElement('canvas');
  canvas.width = px; canvas.height = px;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(px, px);
  // the GPU image is bottom-up: flip rows
  for (let y = 0; y < px; y++) img.data.set(pixels.subarray((px - 1 - y) * px * 4, (px - y) * px * 4), y * px * 4);
  ctx.putImageData(img, 0, 0);
  scene.remove(group);
  return canvas.toDataURL('image/png');
}

function cached(key, make) {
  let url = cache.get(key);
  if (!url) { url = make(); if (url) cache.set(key, url); }
  return url || '';
}

export function makerSprite(id, size = 160, level = 1) {
  return cached(`maker:${id}:${level}:${size}`, () => { const m = makerModel(id, level); m.update(400); return renderThumb(m.group, { size, margin: 1.08 }); });
}

export function houseSprite(paint = 'none', size = 160) {
  return cached(`house:${paint}:${size}`, () => { const m = houseModel(paint); m.update(400); return renderThumb(m.group, { size, margin: 1.08 }); });
}

export function avatarSprite({ color = '#3b82f6', hat = null, skin = null, pose = 'idle', facing = 'se' } = {}, size = 160) {
  return cached(`avatar:${color}:${hat}:${skin}:${pose}:${size}`, () => {
    const a = avatarModel({ color, hat, skin, vehicle: null });
    a.update(pose === 'salto' ? 250 : 400, pose, { since: 0 });
    a.group.rotation.y = 0.35;
    return renderThumb(a.group, { size, margin: 1.1, elev: 0.28 });
  });
}

/** Head + hat close-up for hat cards. */
export function hatSprite(hat, color = '#3b82f6', size = 160) {
  return cached(`hat:${hat}:${size}`, () => {
    const a = avatarModel({ color, hat, skin: null, vehicle: null });
    a.update(400, 'idle');
    a.group.rotation.y = 0.35;
    a.group.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(a.group);
    // frame the top third: the head with its hat
    box.min.y = box.max.y - Math.max(0.9, (box.max.y - box.min.y) * 0.5);
    return renderThumb(a.group, { size, margin: 1.15, elev: 0.25, box });
  });
}

export function vehicleSprite(kind, color = '#3b82f6', size = 160) {
  return cached(`vehicle:${kind}:${color}:${size}`, () => {
    const m = kind === 'auto' ? carModel(color) : scooterModel();
    m.group.rotation.y = 0.6;
    return renderThumb(m.group, { size, margin: 1.12, elev: 0.45 });
  });
}

export function propSprite(id, size = 160) {
  return cached(`prop:${id}:${size}`, () => { const m = propModel(id); m.update(400, {}); return renderThumb(m.group, { size, margin: 1.12 }); });
}

export function petSprite(id, size = 160) {
  return cached(`pet:${id}:${size}`, () => { const m = petModel(id); m.update(400, {}); m.group.rotation.y = 0.5; return renderThumb(m.group, { size, margin: 1.12, elev: 0.4 }); });
}

export function fireworkSprite(size = 160) {
  return cached(`firework:${size}`, () => {
    const b = new Builder({ r: 0.03 });
    const cols = ['#ff5f5f', '#ffc21c', '#45d65c', '#45b6ff', '#b76cff', '#ff6fae'];
    b.cyl(0, 0, 0, 0.13, 0.6, '#ff5f5f', 12);
    b.cone(0, 0, 0.6, 0.15, 0.28, '#ffc21c', 12);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 0.55 + (i % 2) * 0.25;
      b.sphere(Math.cos(a) * r, Math.sin(a) * r * 0.6, 1.6 + Math.sin(a) * 0.4, 0.11, cols[i % cols.length], 8);
    }
    for (let i = 0; i < 5; i++) b.sphere(0.03 * (i % 2), 0, 0.95 + i * 0.13, 0.05, '#ffe94d', 6);
    return renderThumb(b.build(), { size, margin: 1.1, elev: 0.3 });
  });
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

/** Small icons for the HUD and navigation buttons. */
export function navSprite(kind, size = 72) {
  return cached(`nav:${kind}:${size}`, () => {
    const b = new Builder({ r: 0.05 });
    const g = new T.Group();
    switch (kind) {
      case 'werk': // bucket with a sponge and foam
        b.cyl(0, 0, 0, 0.42, 0.7, '#45b6ff', 16, 0.48);
        b.cyl(0, 0, 0.66, 0.5, 0.08, '#1a7ad6', 16);
        b.box(-0.25, -0.18, 0.72, 0.5, 0.34, 0.24, '#ffe94d', { r: 0.06 });
        for (const [dx, dy, r] of [[-0.25, -0.3, 0.16], [0.28, -0.25, 0.12], [0.05, 0.3, 0.1]]) b.sphere(dx, dy, 1.05, r, '#ffffff', 10);
        break;
      case 'winkel': // shopping cart
        b.box(-0.5, -0.35, 0.22, 1.0, 0.7, 0.55, '#ffc21c', { r: 0.08 });
        b.box(-0.42, -0.27, 0.7, 0.84, 0.54, 0.08, '#e08a00', { r: 0.03 });
        b.sphere(-0.15, -0.05, 0.9, 0.17, '#ff5f5f', 10);
        b.sphere(0.2, 0.05, 0.86, 0.14, '#45d65c', 10);
        b.cyl(0.5, 0.2, 0.22, 0.04, 1.0, '#5b6472', 8);
        b.box(0.3, 0.16, 1.15, 0.28, 0.08, 0.08, '#5b6472');
        for (const [dx, dy] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) b.sphere(dx, dy, 0.12, 0.11, '#1b1f3b', 8);
        break;
      case 'huis':
        b.box(-0.5, -0.4, 0, 1.0, 0.8, 0.65, '#fff2c9', { r: 0.06 });
        b.roof(-0.58, -0.48, 0.65, 1.16, 0.96, 0.5, '#e8483f', 'x');
        b.face(-0.5, -0.4, 0, 1.0, 0.8, 'x', 0.28, 0, 0.24, 0.45, '#8a4a1a');
        b.face(-0.5, -0.4, 0, 1.0, 0.8, 'y', 0.15, 0.25, 0.26, 0.26, '#cfe9ff');
        b.face(-0.5, -0.4, 0, 1.0, 0.8, 'y', 0.6, 0.25, 0.26, 0.26, '#cfe9ff');
        break;
      case 'stad': // mini island with a tree and a house block
        b.box(-0.9, -0.7, -0.3, 1.8, 1.4, 0.3, '#f4d98a', { r: 0.4 });
        b.box(-0.75, -0.55, -0.02, 1.5, 1.1, 0.06, '#6fd35b', { r: 0.35 });
        b.box(-0.55, -0.3, 0, 0.5, 0.45, 0.4, '#fff2c9', { r: 0.04 });
        b.roof(-0.6, -0.35, 0.4, 0.6, 0.55, 0.3, '#e8483f', 'x');
        b.tree(0.35, 0.15, 0.45);
        break;
      case 'makers': { // little factory with a coin above
        b.box(-0.5, -0.35, 0, 1.0, 0.7, 0.55, '#b794f4', { r: 0.06 });
        b.roof(-0.5, -0.35, 0.55, 0.5, 0.7, 0.28, '#8a5cf0', 'y');
        b.roof(0, -0.35, 0.55, 0.5, 0.7, 0.28, '#8a5cf0', 'y');
        b.cyl(0.28, -0.12, 0.6, 0.08, 0.5, '#9aa3b2', 10);
        const coin = meshCoin(0.22); coin.position.set(-0.1, 1.45, -0.1); coin.rotation.y = 0.4; g.add(coin);
        break;
      }
      case 'fun': // gift box with a ribbon
        b.box(-0.4, -0.4, 0, 0.8, 0.8, 0.6, '#ff6fae', { r: 0.08 });
        b.box(-0.44, -0.44, 0.6, 0.88, 0.88, 0.14, '#ff8fc0', { r: 0.05 });
        b.box(-0.08, -0.46, 0, 0.16, 0.92, 0.76, '#ffe94d', { r: 0.02 });
        b.box(-0.46, -0.08, 0, 0.92, 0.16, 0.76, '#ffe94d', { r: 0.02 });
        b.sphere(-0.12, 0, 0.86, 0.12, '#ffe94d', 8); b.sphere(0.12, 0, 0.86, 0.12, '#ffe94d', 8);
        break;
      case 'income': { // stack of coins
        for (let i = 0; i < 4; i++) b.cyl(0.04 * i, 0, i * 0.11, 0.42, 0.1, i % 2 ? '#ffd23f' : '#e59b13', 20);
        const coin = meshCoin(0.36); coin.position.set(0.25, 0.75, 0.25); coin.rotation.y = 0.5; coin.rotation.z = 0.2; g.add(coin);
        break;
      }
      case 'car': {
        const m = carModel('#ff5f5f'); m.group.rotation.y = 0.6; g.add(m.group);
        break;
      }
      default:
        b.box(-0.3, -0.3, 0, 0.6, 0.6, 0.6, '#b794f4');
    }
    if (b.geoms.length) g.add(b.build());
    return renderThumb(g, { size, margin: 1.1, elev: 0.45 });
  });
}

export function clearSpriteCache() {
  cache.clear();
}
