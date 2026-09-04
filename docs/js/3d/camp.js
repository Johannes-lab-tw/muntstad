// 3d/camp.js — the detailed places of the island: the camp with the campfire (real light), three huts and log
// seats, the pier with the boat, the cave mouth in the hill, and a signpost. createCamp(map) →
// { group, update(now, darkness, lite), obstacles, firePos }
import * as T from '../../vendor/three.module.min.js';
import { Builder, MAT, col } from './build.js';
import { CAMP, PIER, CAVE } from './heightmap.js';

const WOOD = '#8a5a35', WOOD_L = '#b5763f', STONE = '#7c8089';

function hut(b, x, z, y, rot, roof) {
  const g = new Builder({ r: 0.06 });
  g.box(-1.5, -1.3, 0, 3, 2.6, 1.9, '#d9b47a', { r: 0.08 });
  g.roof(-1.75, -1.55, 1.9, 3.5, 3.1, 1.3, roof, 'x');
  g.box(-0.45, 1.29, 0, 0.9, 0.06, 1.4, WOOD, { r: 0.02 });                 // door
  g.face(-1.5, -1.3, 0, 3, 2.6, 'y', 0.3, 0.9, 0.5, 0.5, '#bfe6ff', { t: 0.03 });   // window
  const m = g.build();
  m.position.set(x, y, z);
  m.rotation.y = rot;
  b.add(m);
}

export function createCamp(map) {
  const group = new T.Group();
  const obstacles = [];
  const anim = [];
  const y0 = map.heightAt(CAMP.x, CAMP.z);

  // ---- campfire: stone ring, logs, flames, embers, the light ----
  const fire = new Builder({ r: 0.04 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    fire.sphere(Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0.08, 0.22, i % 2 ? STONE : '#8d9199', 7);
  }
  fire.cyl(0, 0, 0, 0.75, 0.06, '#3b2a1e', 14);
  const fm = fire.build();
  fm.position.set(CAMP.x, y0, CAMP.z);
  group.add(fm);
  const logs = new Builder({ r: 0.05 });
  logs.add(new T.CylinderGeometry(0.12, 0.12, 1.1, 8).rotateZ(Math.PI / 2).rotateY(0.5).translate(0, 0.18, 0), WOOD);
  logs.add(new T.CylinderGeometry(0.12, 0.12, 1.1, 8).rotateZ(Math.PI / 2).rotateY(-0.7).translate(0, 0.3, 0), WOOD_L);
  const lm = logs.build();
  lm.position.set(CAMP.x, y0, CAMP.z);
  group.add(lm);
  const flames = [];
  const flameMat = new T.MeshStandardMaterial({ color: col('#ff9f2e'), emissive: col('#ff6a00'), emissiveIntensity: 1.6, roughness: 1 });
  const flameMat2 = new T.MeshStandardMaterial({ color: col('#ffe94d'), emissive: col('#ffb300'), emissiveIntensity: 1.8, roughness: 1 });
  for (let i = 0; i < 3; i++) {
    const c = new T.Mesh(new T.ConeGeometry(0.28 - i * 0.06, 0.9 - i * 0.15, 7), i === 2 ? flameMat2 : flameMat);
    c.position.set(CAMP.x + (i - 1) * 0.16, y0 + 0.6 + i * 0.1, CAMP.z + (i % 2) * 0.12);
    c.castShadow = false;
    group.add(c);
    flames.push(c);
  }
  const fireLight = new T.PointLight(0xffa040, 0, 24, 1.5);
  fireLight.position.set(CAMP.x, y0 + 1.2, CAMP.z);
  group.add(fireLight);
  obstacles.push({ x: CAMP.x, z: CAMP.z, r: 1.15, kind: 'fire' });

  // ---- log seats round the fire ----
  const seats = new Builder({ r: 0.05 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const sx = CAMP.x + Math.cos(a) * 2.6, sz = CAMP.z + Math.sin(a) * 2.6;
    seats.add(new T.CylinderGeometry(0.22, 0.22, 1.6, 8).rotateZ(Math.PI / 2).rotateY(-a).translate(sx, map.heightAt(sx, sz) + 0.22, sz), WOOD);
    obstacles.push({ x: sx, z: sz, r: 0.6 });
  }
  group.add(seats.build());

  // ---- three huts ----
  const huts = new T.Group();
  const hutDefs = [[CAMP.x - 5.5, CAMP.z + 3.5, 0.9, '#ff5f5f'], [CAMP.x + 5.8, CAMP.z + 3.0, -0.8, '#45b6ff'], [CAMP.x + 0.5, CAMP.z - 6.2, 3.1, '#ffb300']];
  for (const [hx, hz, rot, roof] of hutDefs) {
    hut(huts, hx, hz, map.heightAt(hx, hz), rot, roof);
    obstacles.push({ x: hx, z: hz, r: 2.1, kind: 'hut' });
  }
  group.add(huts);

  // ---- signpost ----
  const sign = new Builder({ r: 0.03 });
  sign.cyl(0, 0, 0, 0.08, 2.0, WOOD, 6);
  sign.box(-0.6, -0.05, 1.5, 1.2, 0.1, 0.36, WOOD_L, { r: 0.03 });
  sign.box(-0.5, -0.05, 1.0, 1.0, 0.1, 0.3, WOOD_L, { r: 0.03 });
  const sm = sign.build();
  const sgx = CAMP.x - 2.2, sgz = CAMP.z + 5.2;
  sm.position.set(sgx, map.heightAt(sgx, sgz), sgz);
  sm.rotation.y = 0.3;
  group.add(sm);
  obstacles.push({ x: sgx, z: sgz, r: 0.25 });

  // ---- pier and boat ----
  const pier = new Builder({ r: 0.02 });
  for (let z = PIER.z - PIER.len; z <= PIER.z; z += 0.6) pier.box(PIER.x - PIER.w / 2, z, PIER.deck - 0.1, PIER.w, 0.5, 0.1, WOOD_L, { r: 0.02 });
  for (let z = PIER.z - PIER.len + 0.5; z <= PIER.z; z += 2.5) for (const dx of [-PIER.w / 2 + 0.15, PIER.w / 2 - 0.15]) pier.cyl(PIER.x + dx, z, -0.8, 0.12, PIER.deck + 0.9, WOOD, 6);
  group.add(pier.build());
  const boat = new Builder({ r: 0.06 });
  boat.box(-0.9, -1.6, 0, 1.8, 3.2, 0.6, '#ff5f5f', { r: 0.2 });
  boat.box(-0.75, -1.4, 0.6, 1.5, 2.8, 0.06, '#e9e2cf', { r: 0.02 });
  boat.cyl(0.1, 0.2, 0.62, 0.05, 2.4, '#dcd7cb', 6);
  const sailShape = new T.Shape(); sailShape.moveTo(0, 0); sailShape.lineTo(1.2, 0); sailShape.lineTo(0, 1.9); sailShape.closePath();
  boat.add(new T.ExtrudeGeometry(sailShape, { depth: 0.03, bevelEnabled: false }).translate(0.15, 1.0, 0.17), '#ffffff');
  const bm = boat.build();
  bm.position.set(PIER.x + 2.4, 0.02, PIER.z - 3);
  group.add(bm);
  anim.push((t) => { bm.position.y = 0.02 + Math.sin(t / 900) * 0.06; bm.rotation.z = Math.sin(t / 1100) * 0.05; });

  // ---- cave mouth in the hill ----
  const cave = new Builder({ r: 0.05 });
  cave.add(new T.BoxGeometry(2.8, 2.4, 3.4).translate(0, 1.2, -1.7), '#0a0c14');   // the dark inside
  cave.add(new T.DodecahedronGeometry(1.1, 0).scale(1, 1.4, 1).translate(-1.9, 1.0, -0.3), '#6d717a');
  cave.add(new T.DodecahedronGeometry(1.0, 0).scale(1, 1.3, 1).translate(1.9, 0.9, -0.4), '#7c8089');
  cave.add(new T.DodecahedronGeometry(1.2, 0).scale(1.6, 0.8, 1).translate(0, 2.7, -0.8), '#6d717a');
  const cm = cave.build();
  cm.position.set(CAVE.x, map.heightAt(CAVE.x, CAVE.z) - 0.05, CAVE.z);
  cm.rotation.y = CAVE.heading;
  group.add(cm);
  obstacles.push({ x: CAVE.x - Math.sin(CAVE.heading) * 1.9 + Math.cos(CAVE.heading) * -1.9, z: CAVE.z - Math.cos(CAVE.heading) * 1.9 - Math.sin(CAVE.heading) * -1.9, r: 0.9 });

  const fireBase = y0;
  function update(now, darkness = 0, lite = false) {
    for (const fn of anim) fn(now);
    flames.forEach((c, i) => {
      const f = 1 + Math.sin(now / 90 + i * 2.1) * 0.12 + Math.sin(now / 37 + i) * 0.06;
      c.scale.set(f, 1 + Math.sin(now / 70 + i) * 0.18, f);
      c.position.y = fireBase + 0.6 + i * 0.1 + Math.sin(now / 120 + i) * 0.05;
      c.rotation.y = now / 400 + i;
    });
    // the fire is the light of the night: warm, flickering, strong in the dark and a soft glow by day
    fireLight.intensity = (lite ? 0.7 : 1) * (0.3 + darkness * 2.8) * (1 + Math.sin(now / 80) * 0.08 + Math.sin(now / 210) * 0.05) * 8;
  }
  return { group, update, obstacles, fireLight, firePos: new T.Vector3(CAMP.x, y0, CAMP.z) };
}
