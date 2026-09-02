// 3d/props.js — garden items for HUIS (and the trampoline) as rounded plastic 3D props.
// propModel(id) → { group, update(t, extra) }; the group's origin is the centre of the footprint on the ground.
import * as T from '../../vendor/three.module.min.js';
import { Builder, shade, meshBox, meshSphere, col, MAT } from './build.js';

const INK = '#1b1f3b';
const WOOD = '#b5763f', METAL = '#9aa3b2';

const PROPS = {
  bloemen(b) {
    b.disc(0, 0, 0, 0.62, '#8a5a35', 0.08, 18);
    const cols = ['#ff6fae', '#ffe94d', '#7c9bff', '#ff9f2e', '#ff6fae', '#b76cff'];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; b.flower(Math.cos(a) * 0.36, Math.sin(a) * 0.36, cols[i], 0.08); }
    b.flower(0, 0, '#ff5f5f', 0.08);
  },
  vlag(b, group, anim) {
    b.cyl(0, 0, 0, 0.22, 0.15, METAL, 12);
    b.cyl(0, 0, 0.15, 0.04, 1.7, '#e4e8ef', 8);
    b.sphere(0, 0, 1.88, 0.07, '#ffd23f', 8);
    const f = meshBox(0.72, 0.42, 0.04, '#ff5f5f', 0.03);
    f.geometry = f.geometry.clone().translate(0.36, 0, 0);
    f.position.set(0.02, 1.55, 0);
    group.add(f);
    const stripe = meshBox(0.7, 0.12, 0.05, '#ffffff', 0.01);
    stripe.geometry = stripe.geometry.clone().translate(0.36, 0, 0);
    stripe.position.set(0.02, 1.55, 0);
    group.add(stripe);
    anim.push((t) => { const r = Math.sin(t / 240) * 0.35; f.rotation.y = r; stripe.rotation.y = r; });
  },
  zandbak(b) {
    b.box(-0.6, -0.6, 0, 1.2, 1.2, 0.18, WOOD, { r: 0.05 });
    b.box(-0.5, -0.5, 0.14, 1.0, 1.0, 0.08, '#f4d98a', { r: 0.03 });
    b.cyl(0.05, 0.05, 0.2, 0.14, 0.26, '#ff5f5f', 12, 0.12);
    b.box(-0.35, 0.15, 0.2, 0.2, 0.2, 0.1, '#45b6ff', { r: 0.03 });
    b.sphere(0.3, -0.3, 0.3, 0.1, '#ffe94d', 8);
  },
  bankje(b) {
    b.box(-0.55, -0.15, 0, 0.1, 0.3, 0.3, METAL);
    b.box(0.45, -0.15, 0, 0.1, 0.3, 0.3, METAL);
    b.box(-0.6, -0.18, 0.3, 1.2, 0.36, 0.08, WOOD);
    b.box(-0.6, -0.18, 0.38, 1.2, 0.08, 0.36, WOOD);
  },
  hek(b) {
    for (let i = 0; i < 6; i++) b.box(-0.75 + i * 0.3, -0.04, 0, 0.12, 0.08, 0.45, '#ffffff', { r: 0.03 });
    b.box(-0.8, -0.03, 0.22, 1.6, 0.05, 0.08, '#ffffff', { r: 0.02 });
  },
  boom(b) {
    b.tree(0, 0, 0.85);
  },
  lantaarn(b, group, anim) {
    b.cyl(0, 0, 0, 0.16, 0.12, METAL, 12);
    b.cyl(0, 0, 0.12, 0.05, 1.3, '#5b6472', 8);
    b.box(-0.2, -0.2, 1.7, 0.4, 0.4, 0.06, '#5b6472', { r: 0.02 });
    const bulb = meshSphere(0.17, '#ffe94d', 12, { emissive: col('#ffd23f'), emissiveIntensity: 0.8, roughness: 0.5 });
    bulb.position.set(0, 1.56, 0);
    group.add(bulb);
    anim.push((t) => { bulb.material.emissiveIntensity = 0.7 + Math.sin(t / 500) * 0.15; });
  },
  brievenbus(b) {
    b.cyl(0, 0, 0, 0.04, 0.7, '#5b6472', 8);
    b.box(-0.22, -0.16, 0.7, 0.44, 0.32, 0.36, '#ff5f5f', { r: 0.08 });
    b.face(-0.22, -0.16, 0.7, 0.44, 0.32, 'x', 0.06, 0.2, 0.2, 0.05, INK);
    b.box(-0.24, -0.18, 1.06, 0.48, 0.36, 0.06, shade('#ff5f5f', -0.25), { r: 0.03 });
  },
  sneeuwpop(b) {
    b.sphere(0, 0, 0.3, 0.34, '#ffffff', 16);
    b.sphere(0, 0, 0.78, 0.26, '#ffffff', 16);
    b.sphere(0, 0, 1.14, 0.2, '#ffffff', 16);
    b.sphere(-0.07, 0.17, 1.2, 0.03, INK, 6);
    b.sphere(0.07, 0.17, 1.2, 0.03, INK, 6);
    const carrot = new T.ConeGeometry(0.04, 0.22, 8); carrot.rotateX(Math.PI / 2); carrot.translate(0, 1.14, 0.3); b.add(carrot, '#ff9f2e');
    b.cyl(0, 0, 1.3, 0.2, 0.04, INK, 12);
    b.cyl(0, 0, 1.34, 0.13, 0.2, INK, 12);
    b.box(-0.22, -0.22, 0.98, 0.44, 0.44, 0.06, '#ff5f5f', { r: 0.03 });
  },
  vijver(b, group, anim) {
    b.disc(0, 0, 0, 0.78, shade('#3fc0f5', -0.4), 0.05, 24);
    b.disc(0, 0, 0.03, 0.64, '#7fdcff', 0.05, 24);
    for (let i = 0; i < 3; i++) b.flower(-0.7 + i * 0.1, 0.62 - i * 0.28, '#ff6fae');
    const fish = meshBox(0.24, 0.1, 0.12, '#ff9f2e', 0.03);
    fish.position.set(0, 0.1, 0);
    group.add(fish);
    anim.push((t) => { fish.position.x = Math.sin(t / 900) * 0.3; fish.position.z = Math.cos(t / 900) * 0.2; fish.rotation.y = -t / 900; });
  },
  tent(b) {
    b.pyramid(-0.65, -0.65, 0, 1.3, 1.3, 1.1, '#ff5f5f');
    b.pyramid(-0.66, -0.2, 0, 1.32, 0.4, 0.6, '#ffffff');
    b.cyl(0, 0, 1.1, 0.03, 0.3, METAL, 6);
    b.box(0.03, -0.01, 1.28, 0.28, 0.03, 0.14, '#ffe94d', { r: 0.01 });
  },
  fontein(b, group, anim) {
    b.disc(0, 0, 0, 0.82, shade('#dcd7cb', -0.3), 0.08, 24);
    b.disc(0, 0, 0.06, 0.7, '#7fdcff', 0.05, 24);
    b.cyl(0, 0, 0.06, 0.12, 0.5, '#dcd7cb', 12);
    b.disc(0, 0, 0.56, 0.3, '#dcd7cb', 0.08, 16);
    const drops = [];
    for (let i = 0; i < 6; i++) { const d = meshSphere(0.05, '#ffffff', 6); group.add(d); drops.push(d); }
    anim.push((t) => {
      for (let i = 0; i < 6; i++) {
        const f = ((t / 650) + i / 6) % 1;
        const a = (i / 6) * Math.PI * 2;
        drops[i].position.set(Math.cos(a) * 0.35 * f, 0.6 + Math.sin(f * Math.PI) * 0.8, Math.sin(a) * 0.35 * f);
      }
    });
  },
  trampoline(b, group, anim) {
    for (const [dx, dy] of [[-0.7, -0.5], [0.6, -0.5], [-0.7, 0.4], [0.6, 0.4]]) b.cyl(dx + 0.05, dy + 0.05, 0, 0.05, 0.45, METAL, 8);
    b.disc(0, 0, 0.4, 1.0, '#2f6fd6', 0.08, 28);
    const mat = new T.Mesh(new T.CylinderGeometry(0.72, 0.72, 0.04, 28), new T.MeshStandardMaterial({ color: col('#45b6ff'), roughness: 0.6 }));
    mat.position.y = 0.48;
    mat.receiveShadow = true;
    group.add(mat);
    const inner = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.05, 24), new T.MeshStandardMaterial({ color: col('#1b3f8f'), roughness: 0.7 }));
    inner.position.y = 0.49;
    group.add(inner);
    anim.push((t, extra) => { const bounce = extra && extra.bounce ? extra.bounce : 0; mat.position.y = 0.48 - bounce * 0.12; inner.position.y = 0.49 - bounce * 0.14; });
  },
};

export function propModel(id) {
  const group = new T.Group();
  const anim = [];
  const b = new Builder({ r: 0.05 });
  const fn = PROPS[id];
  if (fn) fn(b, group, anim);
  else b.box(-0.3, -0.3, 0, 0.6, 0.6, 0.6, '#b794f4');
  if (b.geoms.length) group.add(b.build());
  return { group, update(t, extra) { for (const f of anim) f(t, extra); } };
}

export const PROP_IDS = Object.keys(PROPS);
