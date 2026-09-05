// 3d/vuurtoren.js — the Vuurtoren (V6.5): a lighthouse on a rock on the north coast of the Avontuureiland, and the
// abandoned hut with a chest a little further along. At night the lamp turns and throws a beam over the sea; by day
// the tower is a white-and-red landmark you can see from the mountain. createVuurtoren(map) →
//   { group, update(now, darkness), obstacles, chest: { pos, setOpen, isOpen }, lampAt }
import * as T from '../../vendor/three.module.min.js';
import { Builder, col } from './build.js';
import { VUURTOREN, HUT } from './heightmap.js';

const WOOD = '#8a5a35', WOOD_L = '#b5763f';

export function createVuurtoren(map) {
  const group = new T.Group();
  const obstacles = [];
  const V = VUURTOREN;
  const y0 = map.heightAt(V.x, V.z);

  // ---- the tower: a white base, red bands, a gallery and the lamp room ----
  const t = new Builder({ r: 0.05 });
  t.cyl(V.x, V.z, y0 - 0.2, 2.6, 0.5, '#8d9199', 16);                       // the foot on the rock
  t.cyl(V.x, V.z, y0 + 0.3, 1.5, 3.2, '#f7f7f2', 16, 1.3);
  t.cyl(V.x, V.z, y0 + 3.5, 1.3, 2.6, '#e0533d', 16, 1.15);
  t.cyl(V.x, V.z, y0 + 6.1, 1.15, 2.4, '#f7f7f2', 16, 1.0);
  t.cyl(V.x, V.z, y0 + 8.5, 1.4, 0.25, '#3a3d47', 16);                       // the gallery
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; t.cyl(V.x + Math.cos(a) * 1.3, V.z + Math.sin(a) * 1.3, y0 + 8.75, 0.04, 0.7, '#3a3d47', 5); }
  t.cyl(V.x, V.z, y0 + 9.45, 1.35, 0.05, '#3a3d47', 16);
  t.cyl(V.x, V.z, y0 + 9.5, 0.9, 1.3, '#cfe9ff', 12);                        // the glass lamp room
  t.cone(V.x, V.z, y0 + 10.8, 1.1, 0.9, '#e0533d', 12);
  t.sphere(V.x, V.z, y0 + 11.8, 0.16, '#ffc21c', 8);
  // a door and two windows
  t.box(V.x - 0.35, V.z + 1.2, y0 + 0.3, 0.7, 0.2, 1.2, '#5b3a1e', { r: 0.04 });
  t.box(V.x - 0.25, V.z + 1.05, y0 + 4.2, 0.5, 0.2, 0.6, '#cfe9ff', { r: 0.03 });
  t.box(V.x - 0.25, V.z + 0.95, y0 + 6.9, 0.5, 0.2, 0.6, '#cfe9ff', { r: 0.03 });
  group.add(t.build());
  obstacles.push({ x: V.x, z: V.z, r: 1.9, kind: 'vuurtoren' });

  // ---- the lamp: a warm point light and a turning beam (a long thin cone) ----
  const lamp = new T.PointLight(0xfff1a8, 0, 26, 1.4);
  lamp.position.set(V.x, y0 + 10.1, V.z);
  group.add(lamp);
  const beam = new T.Mesh(new T.ConeGeometry(2.2, 22, 12, 1, true), new T.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.0, side: T.DoubleSide, depthWrite: false }));
  beam.geometry.rotateX(-Math.PI / 2);        // the cone points along +z
  beam.geometry.translate(0, 0, 11);          // its tip at the lamp
  const beamHolder = new T.Group();
  beamHolder.position.set(V.x, y0 + 10.1, V.z);
  beamHolder.add(beam);
  group.add(beamHolder);

  // ---- the abandoned hut with the chest ----
  const hy = map.heightAt(HUT.x, HUT.z);
  const h = new Builder({ r: 0.05 });
  h.box(HUT.x - 1.6, HUT.z - 1.3, hy, 3.2, 2.6, 1.9, '#6f5a3e', { r: 0.08 });
  h.box(HUT.x - 1.8, HUT.z - 1.5, hy + 1.9, 3.6, 3.0, 0.2, '#4a3a26', { r: 0.05 });
  h.box(HUT.x - 1.7, HUT.z - 0.2, hy + 2.1, 3.4, 0.5, 0.9, '#4a3a26', { r: 0.05 });   // a sagging ridge
  h.box(HUT.x - 0.4, HUT.z + 1.2, hy, 0.8, 0.3, 1.4, '#3a2a18', { r: 0.03 });       // the open door
  h.box(HUT.x + 0.7, HUT.z + 1.25, hy + 0.8, 0.6, 0.2, 0.5, '#2a3140', { r: 0.02 });  // a dark window
  for (let i = 0; i < 4; i++) h.box(HUT.x - 2.4 + i * 0.5, HUT.z - 1.9, hy, 0.4, 0.14, 0.6 + (i % 2) * 0.3, WOOD, { r: 0.03 });   // a broken fence
  group.add(h.build());
  obstacles.push({ x: HUT.x, z: HUT.z, r: 2.1, kind: 'hut' });

  const chestPos = { x: HUT.x, z: HUT.z + 2.4 };
  const chestG = new T.Group();
  const cb = new Builder({ r: 0.04 });
  cb.box(-0.55, -0.35, 0, 1.1, 0.7, 0.55, WOOD, { r: 0.06 });
  cb.box(-0.58, -0.38, 0.5, 1.16, 0.06, 0.1, '#ffc21c', { r: 0.02 });
  cb.box(-0.58, 0.32, 0.5, 1.16, 0.06, 0.1, '#ffc21c', { r: 0.02 });
  cb.box(-0.08, -0.4, 0.3, 0.16, 0.08, 0.18, '#ffc21c', { r: 0.02 });
  chestG.add(cb.build());
  const lid = new T.Group();
  const lb = new Builder({ r: 0.04 });
  lb.box(-0.55, 0, 0, 1.1, 0.7, 0.32, WOOD_L, { r: 0.08 });
  lb.box(-0.58, 0.32, 0, 1.16, 0.06, 0.3, '#ffc21c', { r: 0.02 });
  lid.add(lb.build());
  lid.position.set(0, 0.55, -0.35);
  chestG.add(lid);
  const gold = new Builder({ r: 0.03 });
  for (let i = 0; i < 9; i++) gold.coin(-0.35 + (i % 3) * 0.35, -0.2 + Math.floor(i / 3) * 0.2, 0.55 + (i % 2) * 0.05, 0.14);
  const goldM = gold.build({ shadow: false });
  goldM.visible = false;
  chestG.add(goldM);
  chestG.position.set(chestPos.x, map.heightAt(chestPos.x, chestPos.z), chestPos.z);
  chestG.rotation.y = Math.PI;
  group.add(chestG);
  let lidTarget = 0, lidNow = 0;
  const chest = { pos: chestPos, setOpen(open) { lidTarget = open ? 1 : 0; }, get isOpen() { return lidTarget > 0; } };

  function update(now, darkness = 0) {
    const on = darkness > 0.3;
    lamp.intensity = on ? 6 + darkness * 10 : 0.6;
    beamHolder.rotation.y = now / 1400;
    beam.material.opacity = on ? 0.16 + darkness * 0.14 : 0;
    lidNow += (lidTarget - lidNow) * 0.1;
    lid.rotation.x = -lidNow * 1.7;
    goldM.visible = lidNow > 0.5;
  }
  return { group, update, obstacles, chest, lampAt: { x: V.x, z: V.z, y: y0 + 10.1 } };
}
