// 3d/build.js — geometry builder for the Roblox-style toy world: rounded plastic blocks, cylinders, spheres,
// roofs, pyramids and panels, merged into ONE mesh with vertex colours (one draw call per building).
// World axes: x → right-down on screen, y → up, z → left-down on screen (the old iso "y" is now z).
// The builder keeps the old canvas signatures: box(x, y, z, w, d, h, color) means base corner (x, y) on the ground,
// z = height above ground, w along x, d along the old y (world z), h up — so the v2 art ports 1:1.
import * as T from '../../vendor/three.module.min.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}
/** amount > 0 mixes toward white, amount < 0 toward deep navy (toy shadows are never plain black). */
export function shade(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  const t = clamp(amount, -1, 1);
  const target = t > 0 ? [255, 255, 255] : [22, 20, 58];
  const k = Math.abs(t);
  return rgbToHex([r + (target[0] - r) * k, g + (target[1] - g) * k, b + (target[2] - b) * k]);
}

export const INK = '#1b1f3b';
export const FONT = '"Arial Rounded MT Bold", "Nunito", "Trebuchet MS", "Segoe UI", sans-serif';

const colorCache = new Map();
export function col(hex) {
  let c = colorCache.get(hex);
  if (!c) { c = new T.Color(hex); colorCache.set(hex, c); }
  return c;
}

// ---------- shared materials ----------

export const MAT = {
  plastic: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.0 }),
  plasticFlat: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.0, flatShading: true }),
  gold: new T.MeshStandardMaterial({ color: col('#ffd23f'), roughness: 0.3, metalness: 0.55, emissive: col('#ffb300'), emissiveIntensity: 0.25 }),
  glass: new T.MeshStandardMaterial({ color: col('#bfe6ff'), roughness: 0.15, metalness: 0.1 }),
  white: new T.MeshStandardMaterial({ color: col('#ffffff'), roughness: 0.6 }),
  cloud: new T.MeshStandardMaterial({ color: col('#ffffff'), roughness: 1, emissive: col('#ffffff'), emissiveIntensity: 0.25 }),
  water: new T.MeshStandardMaterial({ color: col('#22aef2'), roughness: 0.22, metalness: 0.1 }),
};

// ---------- rounded box ----------

const rboxCache = new Map();
/** Rounded box centred at the origin: w along x, h along y (up), d along z; r = corner radius. */
export function roundedBox(w, h, d, r) {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r.toFixed(3)}`;
  let g = rboxCache.get(key);
  if (g) return g;
  const rr = Math.min(r, w / 2.01, h / 2.01, d / 2.01);
  if (rr < 0.012) {
    g = new T.BoxGeometry(w, h, d);
  } else {
    const iw = w - 2 * rr, ih = h - 2 * rr;
    const cr = Math.min(rr, iw / 2, ih / 2) * 0.999;
    const s = new T.Shape();
    const x0 = -iw / 2, y0 = -ih / 2, x1 = iw / 2, y1 = ih / 2;
    s.moveTo(x0 + cr, y0);
    s.lineTo(x1 - cr, y0);
    s.absarc(x1 - cr, y0 + cr, cr, -Math.PI / 2, 0, false);
    s.lineTo(x1, y1 - cr);
    s.absarc(x1 - cr, y1 - cr, cr, 0, Math.PI / 2, false);
    s.lineTo(x0 + cr, y1);
    s.absarc(x0 + cr, y1 - cr, cr, Math.PI / 2, Math.PI, false);
    s.lineTo(x0, y0 + cr);
    s.absarc(x0 + cr, y0 + cr, cr, Math.PI, Math.PI * 1.5, false);
    g = new T.ExtrudeGeometry(s, { depth: d - 2 * rr, bevelEnabled: true, bevelThickness: rr, bevelSize: rr, bevelOffset: 0, bevelSegments: 3, curveSegments: 4 });
    g.translate(0, 0, -(d - 2 * rr) / 2);
    g.deleteAttribute('uv');
  }
  rboxCache.set(key, g);
  return g;
}

// ---------- text on a plane ----------

const texCache = new Map();
/** A plane with text (or an emoji) drawn on a canvas texture. w × h in world units; the texture keeps the aspect. */
export function textPlane(text, { w = 2, h = 0.8, font = 0.55, color = INK, bg = null, weight = 'bold', px = 256, align = 'center', pad = 0.08 } = {}) {
  const key = `${text}|${w}|${h}|${font}|${color}|${bg}|${weight}|${px}|${align}`;
  let tex = texCache.get(key);
  if (!tex) {
    const c = document.createElement('canvas');
    const scale = px / h;
    c.width = Math.round(w * scale);
    c.height = Math.round(h * scale);
    const ctx = c.getContext('2d');
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.fillStyle = color;
    ctx.font = `${weight} ${Math.round(font * scale)}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    const x = align === 'center' ? c.width / 2 : align === 'left' ? pad * scale : c.width - pad * scale;
    ctx.fillText(text, x, c.height / 2 + font * scale * 0.04);
    tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    texCache.set(key, tex);
  }
  const m = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const mesh = new T.Mesh(new T.PlaneGeometry(w, h), m);
  mesh.renderOrder = 2;
  return mesh;
}

// ---------- soft ground blob (contact shadow / fake AO under characters) ----------

let blobTex = null;
export function blob(r = 0.5, alpha = 0.35) {
  if (!blobTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
    g.addColorStop(0, 'rgba(20,24,60,1)');
    g.addColorStop(0.55, 'rgba(20,24,60,0.55)');
    g.addColorStop(1, 'rgba(20,24,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    blobTex = new T.CanvasTexture(c);
  }
  const m = new T.Mesh(new T.PlaneGeometry(r * 2, r * 2), new T.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: alpha, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  m.renderOrder = 1;
  return m;
}

// ---------- the builder ----------

export class Builder {
  constructor(opts = {}) {
    this.geoms = [];
    this.r = opts.r ?? 0.06;        // default corner radius (world units)
    this.flat = !!opts.flat;
  }

  /** Add a geometry (already positioned) with one colour. */
  add(geom, color) {
    const g = geom.index ? geom.toNonIndexed() : geom;
    const n = g.attributes.position.count;
    const c = col(color);
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new T.Float32BufferAttribute(arr, 3));
    if (g.attributes.uv) g.deleteAttribute('uv');
    this.geoms.push(g);
    return this;
  }

  /** Cuboid with base corner (x, y) on the ground plane at height z; w along x, d along old-y (world z), h up. */
  box(x, y, z, w, d, h, color, o = {}) {
    const r = o.r ?? Math.min(this.r, w * 0.3, d * 0.3, h * 0.3);
    const g = roundedBox(w, h, d, r).clone();
    g.translate(x + w / 2, z + h / 2, y + d / 2);
    return this.add(g, color);
  }

  /** Thin slab (a top-only surface in the old art). */
  slab(x, y, z, w, d, color, t = 0.04) {
    return this.box(x, y, z, w, d, t, color, { r: 0.01 });
  }

  /** Vertical cylinder standing on (x, y) at height z. */
  cyl(x, y, z, r, h, color, seg = 18, rTop = null) {
    const g = new T.CylinderGeometry(rTop ?? r, r, h, seg);
    g.translate(x, z + h / 2, y);
    return this.add(g, color);
  }

  /** Flat disc on the ground (ponds, pavements). */
  disc(x, y, z, r, color, t = 0.03, seg = 28) {
    const g = new T.CylinderGeometry(r, r, t, seg);
    g.translate(x, z + t / 2, y);
    return this.add(g, color);
  }

  sphere(x, y, z, r, color, seg = 14) {
    const g = new T.SphereGeometry(r, seg, Math.max(8, Math.round(seg * 0.7)));
    g.translate(x, z, y);
    return this.add(g, color);
  }

  /** Puffy low-poly ball (tree crowns, bushes, clouds). */
  puff(x, y, z, r, color, detail = 1) {
    const g = new T.IcosahedronGeometry(r, detail);
    g.translate(x, z, y);
    return this.add(g, color);
  }

  cone(x, y, z, r, h, color, seg = 18) {
    const g = new T.ConeGeometry(r, h, seg);
    g.translate(x, z + h / 2, y);
    return this.add(g, color);
  }

  /** Pyramid with a w × d base at height z and apex h above the centre. */
  pyramid(x, y, z, w, d, h, color) {
    const g = new T.ConeGeometry(1, h, 4);
    g.rotateY(Math.PI / 4);
    g.scale(w / Math.SQRT2, 1, d / Math.SQRT2);
    g.translate(x + w / 2, z + h / 2, y + d / 2);
    return this.add(g, color);
  }

  /** Gabled roof: eaves at height z, ridge h higher; axis 'x' → ridge runs along x. */
  roof(x, y, z, w, d, h, color, axis = 'x') {
    const along = axis === 'x' ? w : d;      // length of the ridge
    const across = axis === 'x' ? d : w;     // width of the gable
    const s = new T.Shape();
    s.moveTo(-across / 2, 0);
    s.lineTo(across / 2, 0);
    s.lineTo(0, h);
    s.closePath();
    const g = new T.ExtrudeGeometry(s, { depth: along, bevelEnabled: false });
    g.translate(0, 0, -along / 2);
    if (axis === 'x') g.rotateY(Math.PI / 2);
    g.translate(x + w / 2, z, y + d / 2);
    g.deleteAttribute('uv');
    return this.add(g, color);
  }

  /** Panel on the +x face (side 'x', the lower-right face) or +z face (side 'y', lower-left) of a box at (x, y, z, w, d):
   *  u along the face, v up, sized uw × vh; sits 0.02 proud so it never z-fights. */
  face(x, y, z, w, d, side, u, v, uw, vh, color, o = {}) {
    const t = o.t ?? 0.035;
    if (side === 'x') {
      const g = new T.BoxGeometry(t, vh, uw);
      g.translate(x + w + t / 2 - 0.012, z + v + vh / 2, y + u + uw / 2);
      return this.add(g, color);
    }
    const g = new T.BoxGeometry(uw, vh, t);
    g.translate(x + u + uw / 2, z + v + vh / 2, y + d + t / 2 - 0.012);
    return this.add(g, color);
  }

  /** Tree with a round crown (Roblox-style): trunk + three puffs. size scales everything. */
  tree(x, y, size = 1, leaf = '#3fbf5a', trunk = '#8a5a35', z = 0) {
    const s = size;
    this.cyl(x, y, z, 0.13 * s, 0.75 * s, trunk, 10, 0.1 * s);
    this.puff(x, y, z + 1.05 * s, 0.55 * s, leaf, 1);
    this.puff(x + 0.28 * s, y - 0.1 * s, z + 1.3 * s, 0.42 * s, shade(leaf, 0.08), 1);
    this.puff(x - 0.22 * s, y + 0.2 * s, z + 1.38 * s, 0.4 * s, shade(leaf, 0.14), 1);
    return this;
  }

  bush(x, y, size = 1, leaf = '#46c95f') {
    const s = size;
    this.puff(x, y, 0.28 * s, 0.36 * s, leaf, 1);
    this.puff(x + 0.22 * s, y + 0.1 * s, 0.24 * s, 0.26 * s, shade(leaf, 0.1), 1);
    this.puff(x - 0.2 * s, y - 0.12 * s, 0.22 * s, 0.24 * s, shade(leaf, -0.05), 1);
    return this;
  }

  flower(x, y, color = '#ff6fae', z = 0) {
    this.cyl(x, y, z, 0.03, 0.22, '#3aa84f', 6);
    this.sphere(x, y, z + 0.27, 0.09, color, 8);
    return this;
  }

  /** Coin standing upright at (x, y), centre height z. */
  coin(x, y, z, r = 0.22, color = '#ffd23f') {
    const g = new T.CylinderGeometry(r, r, r * 0.3, 20);
    g.rotateX(Math.PI / 2);
    g.translate(x, z, y);
    return this.add(g, color);
  }

  /** Merge everything into one mesh. */
  build(o = {}) {
    if (!this.geoms.length) return new T.Group();
    let n = 0;
    for (const g of this.geoms) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), clr = new Float32Array(n * 3);
    let off = 0;
    for (const g of this.geoms) {
      pos.set(g.attributes.position.array, off);
      nor.set(g.attributes.normal.array, off);
      clr.set(g.attributes.color.array, off);
      off += g.attributes.position.count * 3;
    }
    const geom = new T.BufferGeometry();
    geom.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geom.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    geom.setAttribute('color', new T.Float32BufferAttribute(clr, 3));
    geom.computeBoundingSphere();
    const mesh = new T.Mesh(geom, o.material || (this.flat ? MAT.plasticFlat : MAT.plastic));
    mesh.castShadow = o.shadow !== false;
    mesh.receiveShadow = o.receive !== false;
    this.geoms = [];
    return mesh;
  }
}

/** One-off mesh helpers for animated parts (not merged). */
export function meshBox(w, h, d, color, r = 0.05) {
  const m = new T.Mesh(roundedBox(w, h, d, Math.min(r, w * 0.3, h * 0.3, d * 0.3)), new T.MeshStandardMaterial({ color: col(color), roughness: 0.55 }));
  m.castShadow = true;
  return m;
}
export function meshSphere(r, color, seg = 12, opts = {}) {
  const m = new T.Mesh(new T.SphereGeometry(r, seg, seg), new T.MeshStandardMaterial({ color: col(color), roughness: 0.9, ...opts }));
  return m;
}
export function meshCoin(r = 0.22) {
  const g = new T.CylinderGeometry(r, r, r * 0.32, 22);
  g.rotateX(Math.PI / 2);
  const m = new T.Mesh(g, MAT.gold);
  m.castShadow = true;
  return m;
}
