// 3d/spoken.js — the night visitors: a ghost (a floating white blob with big eyes, shy of light) and the Nachtbeer
// (a big round bear that plods to the fire). Nobody fights: the ghost flees from light, the bear from BOE.
// ghostModel() → { group, update(t, { fade }) }; bearModel() → { group, update(t, { walking }) }
// Also the things you can buy for the camp: tentModel(), torchModel(), fenceModel(r).
import * as T from '../../vendor/three.module.min.js';
import { Builder, col } from './build.js';

const INK = '#1b1f3b';

export function ghostModel() {
  const group = new T.Group();
  const mat = new T.MeshStandardMaterial({ color: col('#f4f7ff'), roughness: 0.9, transparent: true, opacity: 0.85, emissive: col('#aab4ff'), emissiveIntensity: 0.25 });
  const b = new Builder({ r: 0.1 });
  b.sphere(0, 0, 1.0, 0.55, '#ffffff', 12);
  b.box(-0.5, -0.5, 0.35, 1.0, 1.0, 0.7, '#ffffff', { r: 0.2 });
  for (let i = 0; i < 4; i++) b.sphere(-0.36 + i * 0.24, 0, 0.3, 0.16, '#ffffff', 8);
  const body = b.build({ material: mat, shadow: false });
  group.add(body);
  const face = new Builder({ r: 0.01 });
  face.sphere(-0.18, 0.5, 1.08, 0.12, INK, 8);
  face.sphere(0.18, 0.5, 1.08, 0.12, INK, 8);
  face.sphere(0, 0.52, 0.82, 0.1, INK, 8);
  const f = face.build({ shadow: false });
  group.add(f);
  let ph = Math.random() * 10;
  function update(t, { fade = 1 } = {}) {
    group.position.y = 0.6 + Math.sin(t / 420 + ph) * 0.18;
    group.rotation.z = Math.sin(t / 600 + ph) * 0.08;
    mat.opacity = 0.85 * fade;
    f.visible = fade > 0.3;
  }
  return { group, update };
}

export function bearModel() {
  const group = new T.Group();
  const c = '#5b3a21', d = '#3e2716', muzzle = '#c9a47a';
  const body = new Builder({ r: 0.12 });
  body.box(-0.6, -0.8, 0.45, 1.2, 1.6, 1.0, c, { r: 0.25 });
  const bm = body.build();
  group.add(bm);
  const head = new Builder({ r: 0.1 });
  head.box(-0.45, -0.4, 0, 0.9, 0.8, 0.8, c, { r: 0.2 });
  head.box(-0.2, 0.3, 0.1, 0.4, 0.2, 0.3, muzzle, { r: 0.08 });
  head.sphere(0, 0.52, 0.32, 0.09, INK, 8);
  head.sphere(-0.42, -0.1, 0.72, 0.16, d, 8);
  head.sphere(0.42, -0.1, 0.72, 0.16, d, 8);
  head.sphere(-0.2, 0.36, 0.5, 0.07, INK, 8);
  head.sphere(0.2, 0.36, 0.5, 0.07, INK, 8);
  const hm = head.build();
  hm.position.set(0, 1.25, 0.75);
  group.add(hm);
  const legs = [];
  for (const [dx, dz] of [[-0.38, -0.5], [0.38, -0.5], [-0.38, 0.5], [0.38, 0.5]]) {
    const l = new Builder({ r: 0.08 });
    l.box(-0.18, -0.18, -0.5, 0.36, 0.36, 0.5, d, { r: 0.1 });
    const m = l.build();
    m.position.set(dx, 0.5, dz);
    group.add(m);
    legs.push(m);
  }
  function update(t, { walking = true } = {}) {
    legs.forEach((l, i) => { l.rotation.x = walking ? Math.sin(t / 220 + i * Math.PI / 2) * 0.5 : 0; });
    bm.position.y = walking ? Math.abs(Math.sin(t / 220)) * 0.05 : 0;
    hm.rotation.y = Math.sin(t / 900) * 0.2;
  }
  return { group, update };
}

export function tentModel(color = '#ff9f2e') {
  const b = new Builder({ r: 0.04 });
  const shape = new T.Shape(); shape.moveTo(-1.6, 0); shape.lineTo(1.6, 0); shape.lineTo(0, 1.9); shape.closePath();
  b.add(new T.ExtrudeGeometry(shape, { depth: 2.6, bevelEnabled: false }).translate(0, 0, -1.3), color);
  b.box(-0.35, -1.32, 0, 0.7, 0.06, 1.1, '#3b2a1e', { r: 0.02 });   // the dark doorway
  b.cyl(-1.9, -1.4, 0, 0.04, 0.6, '#dcd7cb', 6);
  b.cyl(1.9, 1.4, 0, 0.04, 0.6, '#dcd7cb', 6);
  return b.build();
}

export function torchModel() {
  const b = new Builder({ r: 0.02 });
  b.cyl(0, 0, 0, 0.06, 1.5, '#8a5a35', 6);
  b.cyl(0, 0, 1.5, 0.12, 0.2, '#3b2a1e', 8);
  const m = b.build();
  const flame = new T.Mesh(new T.ConeGeometry(0.16, 0.5, 7), new T.MeshStandardMaterial({ color: col('#ff9f2e'), emissive: col('#ff6a00'), emissiveIntensity: 1.6 }));
  flame.position.y = 1.95;
  m.add(flame);
  const light = new T.PointLight(0xffa040, 0, 9, 1.6);
  light.position.y = 2.0;
  m.add(light);
  return { mesh: m, flame, light };
}

/** A ring of fence posts and rails round the camp, with an opening on the pier side (south). */
export function fenceModel(cx, cz, r, heightAt) {
  const b = new Builder({ r: 0.02 });
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.28) continue;   // the gap (towards +z, the pier)
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    const y = heightAt(x, z);
    b.cyl(x, z, y, 0.08, 1.1, '#8a5a35', 6);
    const a2 = ((i + 1) / n) * Math.PI * 2;
    if (Math.abs(a2 - Math.PI / 2) < 0.28) continue;
    const x2 = cx + Math.cos(a2) * r, z2 = cz + Math.sin(a2) * r;
    const len = Math.hypot(x2 - x, z2 - z);
    for (const h of [0.45, 0.85]) {
      const g = new T.BoxGeometry(0.06, 0.08, len).rotateY(Math.atan2(x2 - x, z2 - z)).translate((x + x2) / 2, (y + heightAt(x2, z2)) / 2 + h, (z + z2) / 2);
      b.add(g, '#b5763f');
    }
  }
  return b.build();
}
