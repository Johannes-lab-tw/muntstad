// 3d/camp.js — the detailed places of the island: the camp with the campfire (real light), three huts and log
// seats, the pier with the boat, the cave mouth in the hill, and a signpost. createCamp(map) →
// { group, update(now, darkness, lite), obstacles, firePos }
import * as T from '../../vendor/three.module.min.js';
import { Builder, MAT, col, textPlane } from './build.js';
import { CAMP, PIER, CAVE, caveInner } from './heightmap.js';

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
  // what the boards say (the lake lies north-east, the cave north-west)
  const t1 = textPlane('MEER →', { w: 1.1, h: 0.3, font: 0.2, color: '#ffffff' });
  t1.position.set(0, 1.68, 0.06);
  const t2 = textPlane('← GROT', { w: 0.95, h: 0.26, font: 0.18, color: '#ffffff' });
  t2.position.set(0, 1.15, 0.06);
  sm.add(t1, t2);
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

  // ---- the cave (V5.2): a bent tunnel into the hill that ends in a round chamber; rock walls and roofs, crystals,
  // stalactites, bats under the ceiling, a chest at the far side of the chamber ----
  const HW = CAVE.halfWidth, CH = 3.2;   // half width, wall height
  const wallC = '#4a4e58', wallD = '#33363f';
  const cave = new Builder({ r: 0.05 });
  const segs = [];
  for (let i = 0; i < CAVE.path.length - 1; i++) {
    const [ax, az] = CAVE.path[i], [bx, bz] = CAVE.path[i + 1];
    const len = Math.hypot(bx - ax, bz - az), h = Math.atan2(bx - ax, bz - az);
    segs.push({ ax, az, len, h });
    // a segment lies along local +z; boxes are built at the origin then rotated/translated into place
    const put = (geom, color) => { geom.rotateY(h); geom.translate(ax, 0, az); cave.add(geom, color); };
    const ext = i === 0 ? 0.6 : 1.2;   // overlap at the bend so no gap shows
    put(new T.BoxGeometry(HW * 2 + 2.4, 0.9, len + ext).translate(0, CH - 0.15, len / 2 + (i === 0 ? -0.3 : 0.2)), wallD);   // roof
    put(new T.BoxGeometry(1.2, CH, len + ext).translate(-HW - 0.6, CH / 2, len / 2 + (i === 0 ? -0.3 : 0.2)), wallC);      // left wall
    put(new T.BoxGeometry(1.2, CH, len + ext).translate(HW + 0.6, CH / 2, len / 2 + (i === 0 ? -0.3 : 0.2)), wallC);       // right wall
    put(new T.BoxGeometry(HW * 2, 0.06, len).translate(0, 0.02, len / 2), '#2a2d36');                                     // dark floor
    // wall obstacles every metre on both sides
    for (let t = 0.6; t < (i < CAVE.path.length - 2 ? len - 1.0 : len + 0.4); t += 1.0) for (const side of [-1, 1]) {   // no wall blocks at the inside of the bend
      obstacles.push({ x: ax + Math.sin(h) * t + Math.cos(h) * side * (HW + 0.55), z: az + Math.cos(h) * t - Math.sin(h) * side * (HW + 0.55), r: 0.75, kind: 'wall' });
    }
  }
  // boulders framing the mouth and lying on top of the first leg, so it reads as a hole in the hill from outside
  const m0 = segs[0];
  const boulder = (lx, ly, lz, r, sx = 1, sy = 1.4, sz = 1, c = '#6d717a') => { const g = new T.DodecahedronGeometry(r, 0).scale(sx, sy, sz).translate(lx, ly, lz); g.rotateY(m0.h); g.translate(m0.ax, 0, m0.az); cave.add(g, c); };
  boulder(-HW - 0.9, 1.1, -0.3, 1.3);
  boulder(HW + 0.9, 1.0, -0.2, 1.2, 1, 1.4, 1, '#7c8089');
  boulder(0, CH + 0.3, 0.4, 1.4, 1.8, 0.9, 1);
  boulder(-1.6, CH + 0.5, 2.5, 1.1, 1.4, 0.8, 1.2, '#7c8089');
  boulder(1.7, CH + 0.4, 3.5, 1.2, 1.5, 0.9, 1.2);
  // the chamber: a ring of wall blocks (open where the tunnel comes in), a roof disc, stalactites
  const ch = CAVE.chamber, R = ch.r;
  const entry = Math.atan2(segs[1].az - ch.z, segs[1].ax - ch.x);   // angle (cos/sin) from the centre towards the tunnel
  const NW = 16;
  for (let i = 0; i < NW; i++) {
    const a = (i / NW) * Math.PI * 2;
    let da = a - entry; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    if (Math.abs(da) < 0.45) continue;   // the opening
    const wx = ch.x + Math.cos(a) * (R + 0.6), wz = ch.z + Math.sin(a) * (R + 0.6);
    const g = new T.BoxGeometry(1.5, CH + 0.8, 1.2).translate(0, (CH + 0.8) / 2, 0); g.rotateY(-a + Math.PI / 2); g.translate(wx, 0, wz);
    cave.add(g, i % 2 ? wallC : wallD);
    obstacles.push({ x: ch.x + Math.cos(a) * (R + 0.45), z: ch.z + Math.sin(a) * (R + 0.45), r: 0.8, kind: 'wall' });
  }
  cave.add(new T.CylinderGeometry(R + 1.4, R + 1.4, 0.9, 20).translate(ch.x, CH + 0.8 + 0.3, ch.z), wallD);          // roof
  cave.add(new T.CylinderGeometry(R, R, 0.06, 20).translate(ch.x, 0.02, ch.z), '#2a2d36');                        // floor
  for (let i = 0; i < 9; i++) {                                                                                     // stalactites
    const a = i * 0.7 + 0.3, rr = 0.6 + (i % 3) * 0.9;
    cave.add(new T.ConeGeometry(0.16 + (i % 2) * 0.08, 0.7 + (i % 3) * 0.4, 6).rotateX(Math.PI).translate(ch.x + Math.cos(a) * rr, CH + 0.8 - 0.35, ch.z + Math.sin(a) * rr), '#5b5f6a');
  }
  const cm = cave.build();
  cm.position.y = CAVE.floor - 0.05;
  group.add(cm);
  // crystals: emissive spikes along the tunnel and round the chamber, a cool light in the chamber and one at the bend
  const crystalMat = new T.MeshStandardMaterial({ color: col('#9fe8ff'), emissive: col('#4fc8ff'), emissiveIntensity: 1.4, roughness: 0.3 });
  const crystals = new T.Group();
  const crystal = (x, y, z, s, rz) => { const c = new T.Mesh(new T.ConeGeometry(0.16 * s, 1.2 * s, 5), crystalMat); c.position.set(x, y, z); c.rotation.z = rz; crystals.add(c); };
  for (const seg of segs) for (const [t, side, s] of [[1.6, -1, 0.5], [3.2, 1, 0.45]]) {
    crystal(seg.ax + Math.sin(seg.h) * t + Math.cos(seg.h) * side * (HW - 0.15), CAVE.floor + 0.9 + s, seg.az + Math.cos(seg.h) * t - Math.sin(seg.h) * side * (HW - 0.15), s, side * 0.6);
  }
  for (let i = 0; i < 5; i++) { const a = entry + 0.9 + i * 0.9; crystal(ch.x + Math.cos(a) * (R - 0.2), CAVE.floor + 0.7 + (i % 2) * 0.9, ch.z + Math.sin(a) * (R - 0.2), 0.55 + (i % 2) * 0.2, Math.cos(a) * 0.7); }
  group.add(crystals);
  const crystalLight = new T.PointLight(0x7fd8ff, 7, 12, 1.5);
  crystalLight.position.set(ch.x, CAVE.floor + 2.2, ch.z);
  group.add(crystalLight);
  const bendLight = new T.PointLight(0x7fd8ff, 4, 8, 1.6);
  bendLight.position.set(segs[1].ax, CAVE.floor + 1.8, segs[1].az);
  group.add(bendLight);
  // bats under the chamber ceiling: small black shapes that hang, then flap out through the tunnel (the scene animates)
  const bats = [];
  for (let i = 0; i < 7; i++) {
    const b = new Builder({ r: 0.01 });
    b.add(new T.BoxGeometry(0.34, 0.03, 0.12).rotateZ(0.45).translate(-0.15, 0, 0), '#14161c');
    b.add(new T.BoxGeometry(0.34, 0.03, 0.12).rotateZ(-0.45).translate(0.15, 0, 0), '#14161c');
    b.sphere(0, 0, 0, 0.07, '#14161c', 6);
    const mesh = b.build({ shadow: false, receive: false });
    const a = i * 0.9, rr = 0.4 + (i % 4) * 0.6;
    mesh.position.set(ch.x + Math.cos(a) * rr, CAVE.floor + CH + 0.55, ch.z + Math.sin(a) * rr);
    group.add(mesh);
    bats.push({ mesh, home: mesh.position.clone(), ph: i * 1.1 });
  }
  // the chest at the far side of the chamber: box, lid on a hinge, gold when open
  const chestG = new T.Group();
  const cb = new Builder({ r: 0.04 });
  cb.box(-0.55, -0.35, 0, 1.1, 0.7, 0.55, '#8a5a35', { r: 0.06 });
  cb.box(-0.58, -0.38, 0.5, 1.16, 0.06, 0.1, '#ffc21c', { r: 0.02 });
  cb.box(-0.58, 0.32, 0.5, 1.16, 0.06, 0.1, '#ffc21c', { r: 0.02 });
  cb.box(-0.08, -0.4, 0.3, 0.16, 0.08, 0.18, '#ffc21c', { r: 0.02 });   // lock
  chestG.add(cb.build());
  const lid = new T.Group();
  const lb = new Builder({ r: 0.04 });
  lb.box(-0.55, 0, 0, 1.1, 0.7, 0.32, '#a86a3d', { r: 0.08 });
  lb.box(-0.58, 0.32, 0, 1.16, 0.06, 0.3, '#ffc21c', { r: 0.02 });
  lid.add(lb.build());
  lid.position.set(0, 0.55, -0.35);   // hinge at the back edge
  chestG.add(lid);
  const gold = new Builder({ r: 0.03 });
  for (let i = 0; i < 9; i++) gold.coin(-0.35 + (i % 3) * 0.35, -0.2 + Math.floor(i / 3) * 0.2, 0.55 + (i % 2) * 0.05, 0.14);
  const goldM = gold.build({ shadow: false });
  goldM.visible = false;
  chestG.add(goldM);
  const chestPos = caveInner(CAVE.chestAt);
  chestG.position.set(chestPos.x, CAVE.floor, chestPos.z);
  chestG.rotation.y = Math.atan2(ch.x - chestPos.x, ch.z - chestPos.z);   // faces the middle of the chamber
  group.add(chestG);
  let lidOpen = 0;   // 0..1 animated
  let lidTarget = 0;
  obstacles.push({ x: chestPos.x, z: chestPos.z, r: 0.75, kind: 'chest' });
  anim.push((t) => {
    lidOpen += (lidTarget - lidOpen) * 0.12;
    lid.rotation.x = -lidOpen * 1.9;
    goldM.visible = lidOpen > 0.3;
    crystalMat.emissiveIntensity = 1.2 + Math.sin(t / 700) * 0.3;
  });
  const chest = { pos: chestPos, setOpen(open) { lidTarget = open ? 1 : 0; }, get isOpen() { return lidTarget > 0; } };
  const caveInfo = { bats, chamber: ch, entry, segs, ghostAt: { x: ch.x + Math.cos(entry + Math.PI * 0.75) * (R - 0.9), z: ch.z + Math.sin(entry + Math.PI * 0.75) * (R - 0.9) } };

  const fireBase = y0;
  let level = 1;   // 0 = out, 1 = a full fire (round 4: the fire wants wood)
  function update(now, darkness = 0, lite = false) {
    for (const fn of anim) fn(now);
    const size = level <= 0 ? 0 : 0.35 + level * 0.65;
    flames.forEach((c, i) => {
      const f = (1 + Math.sin(now / 90 + i * 2.1) * 0.12 + Math.sin(now / 37 + i) * 0.06) * size;
      c.visible = size > 0;
      c.scale.set(f, (1 + Math.sin(now / 70 + i) * 0.18) * size, f);
      c.position.y = fireBase + 0.25 + (0.35 + i * 0.1) * size + Math.sin(now / 120 + i) * 0.05;
      c.rotation.y = now / 400 + i;
    });
    // the fire is the light of the night: warm, flickering, strong in the dark and a soft glow by day
    fireLight.intensity = size * (lite ? 0.7 : 1) * (0.3 + darkness * 2.8) * (1 + Math.sin(now / 80) * 0.08 + Math.sin(now / 210) * 0.05) * 8;
    fireLight.distance = 6 + size * 18;
  }
  /** The second hut (V5.3 upgrade): built when bought. Returns its obstacle. */
  function addHut(x, z, rot, roof) {
    const g = new T.Group();
    hut(g, x, z, map.heightAt(x, z), rot, roof);
    group.add(g);
    return { x, z, r: 2.1, kind: 'hut' };
  }
  return { group, update, obstacles, fireLight, chest, cave: caveInfo, addHut, firePos: new T.Vector3(CAMP.x, y0, CAMP.z), setFire(l) { level = Math.max(0, Math.min(1, l)); } };
}
