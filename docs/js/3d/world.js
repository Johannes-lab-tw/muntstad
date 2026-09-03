// 3d/world.js — the island of Muntstad: cushion-shaped green island with a sandy rim in a bright sea, the road loop
// with pavements, plot pavements, park with pond and fountain, round trees and bushes, lamps, beach corner with palms,
// puffy clouds that drift and cast shadows, animated water and foam. Static parts are merged into a few meshes.
import * as T from '../../vendor/three.module.min.js';
import { Builder, MAT, shade, col, textPlane, INK } from './build.js';

export const ISLAND = { w: 16, d: 12, r: 2.4 };
// the loop sits well inside the plots: sidewalk edges at y 2.0/9.8 and x 2.4/13.2 leave every plot's building clear
export const ROAD = { x: 3.4, y: 3.0, w: 8.8, d: 5.8, r: 1.4, width: 1.2 };
export const PLOTS = {
  limonade: [5.2, 0.9],
  wasstraat: [9.6, 0.9],
  pizzeria: [14.4, 4.2],
  flat: [14.2, 8.6],
  fabriek: [1.6, 8.6],
};
export const HOUSE = [1.6, 4.4];
export const PARK = [7.8, 5.9];
export const PAVE = '#e9e2cf';
const PAL = {
  grass: '#6fd35b', grassDark: '#55b647', sand: '#f4d98a', dirt: '#b97b4b', rock: '#8a5a3a',
  road: '#4f5766', roadLine: '#f7d24a', side: '#dcd7cb',
};
const TREES = [[5.3, 5.0, 0.9], [10.3, 4.6, 1], [10.2, 7.4, 0.8], [3.4, 11.2, 0.8], [12.4, 11.3, 0.9], [1.2, 1.6, 0.7], [7.6, 0.5, 0.75], [15.1, 10.6, 0.7], [0.6, 6.6, 0.6], [15.4, 0.8, 0.65]];
const BUSHES = [[5.6, 7.2, 0.9], [11.3, 6.3, 0.7], [7.5, 11.4, 0.8], [15, 6.2, 0.6], [3.2, 0.8, 0.6], [12.2, 0.8, 0.55], [0.7, 10.8, 0.7], [8.9, 11.6, 0.6]];
const LAMPS = [[2.2, 2.6], [13.4, 2.6], [2.2, 9.2], [13.4, 9.2]];
const FLOWERS = [[6.6, 6.9, '#ff6fae'], [6.9, 7.2, '#ffe94d'], [9.3, 7.5, '#7c9bff'], [9.6, 7.8, '#ff6fae'], [4.2, 11.5, '#ffe94d'], [11.2, 11.6, '#ff6fae'], [15.2, 7.4, '#7c9bff'], [0.9, 3.4, '#ffe94d'], [6.2, 6.4, '#ff9f2e'], [9.9, 6.9, '#ffe94d']];
const WATER_Y = -0.55;

/** Points along the road loop (world units x / old-y), with cumulative length. */
export function roadPath(n = 320) {
  const { x, y, w, d, r } = ROAD;
  const pts = [];
  const seg = (fn, k) => { for (let i = 0; i < k; i++) pts.push(fn(i / k)); };
  const q = Math.round(n / 8);
  seg((f) => [x + r + (w - 2 * r) * f, y], q * 1.6);
  seg((f) => { const a = -Math.PI / 2 + (Math.PI / 2) * f; return [x + w - r + Math.cos(a) * r, y + r + Math.sin(a) * r]; }, q * 0.6);
  seg((f) => [x + w, y + r + (d - 2 * r) * f], q);
  seg((f) => { const a = (Math.PI / 2) * f; return [x + w - r + Math.cos(a) * r, y + d - r + Math.sin(a) * r]; }, q * 0.6);
  seg((f) => [x + w - r - (w - 2 * r) * f, y + d], q * 1.6);
  seg((f) => { const a = Math.PI / 2 + (Math.PI / 2) * f; return [x + r + Math.cos(a) * r, y + d - r + Math.sin(a) * r]; }, q * 0.6);
  seg((f) => [x, y + d - r - (d - 2 * r) * f], q);
  seg((f) => { const a = Math.PI + (Math.PI / 2) * f; return [x + r + Math.cos(a) * r, y + r + Math.sin(a) * r]; }, q * 0.6);
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1], b = pts[i % pts.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return { pts, cum, total: cum[pts.length] };
}

/** Position + heading along a path (from roadPath). */
export function along(path, dist) {
  const cum = path.cum;
  let i = 0;
  while (i < cum.length - 2 && cum[i + 1] < dist) i++;
  const a = path.pts[i], b = path.pts[(i + 1) % path.pts.length];
  const f = (dist - cum[i]) / Math.max(1e-6, cum[i + 1] - cum[i]);
  const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  return { x, y, angle: Math.atan2(dx, dy) }; // rotation.y so that local +z points along the travel direction
}

// ---------- ground shapes (world x / old-y → shape x / -y, laid flat with rotateX(-90°)) ----------

export function roundedRect(x, y, w, d, r) {
  const s = new T.Shape();
  const rr = Math.min(r, w / 2, d / 2);
  const Y = (v) => -v;
  s.moveTo(x + rr, Y(y));
  s.lineTo(x + w - rr, Y(y));
  s.absarc(x + w - rr, Y(y + rr), rr, Math.PI / 2, 0, true);
  s.lineTo(x + w, Y(y + d - rr));
  s.absarc(x + w - rr, Y(y + d - rr), rr, 0, -Math.PI / 2, true);
  s.lineTo(x + rr, Y(y + d));
  s.absarc(x + rr, Y(y + d - rr), rr, -Math.PI / 2, -Math.PI, true);
  s.lineTo(x, Y(y + rr));
  s.absarc(x + rr, Y(y + rr), rr, -Math.PI, -Math.PI * 1.5, true);
  s.closePath();
  return s;
}

export function roundedRectPath(x, y, w, d, r) {
  const p = new T.Path();
  const rr = Math.min(r, w / 2, d / 2);
  const Y = (v) => -v;
  p.moveTo(x + rr, Y(y));
  p.lineTo(x + w - rr, Y(y));
  p.absarc(x + w - rr, Y(y + rr), rr, Math.PI / 2, 0, true);
  p.lineTo(x + w, Y(y + d - rr));
  p.absarc(x + w - rr, Y(y + d - rr), rr, 0, -Math.PI / 2, true);
  p.lineTo(x + rr, Y(y + d));
  p.absarc(x + rr, Y(y + d - rr), rr, -Math.PI / 2, -Math.PI, true);
  p.lineTo(x, Y(y + rr));
  p.absarc(x + rr, Y(y + rr), rr, -Math.PI, -Math.PI * 1.5, true);
  p.closePath();
  return p;
}

export function flat(shape, y, color, o = {}) {
  const g = new T.ShapeGeometry(shape, o.segments || 6);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  g.deleteAttribute('uv');
  const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: col(color), roughness: o.rough ?? 0.85, transparent: !!o.opacity, opacity: o.opacity ?? 1, depthWrite: !o.opacity }));
  m.receiveShadow = true;
  if (o.order) m.renderOrder = o.order;
  return m;
}

// ---------- island body ----------

/** A cushion-shaped grass island with a sandy rounded rim and a dirt/rock cliff: top surface at y = 0. */
export function cushionMesh(x, y, w, d, r, { depth = 1.4, bt = 0.42, bs = 0.5 } = {}) {
  const shape = roundedRect(x, y, w, d, r);
  const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelOffset: 0, bevelSegments: 5, curveSegments: 10 });
  g.rotateX(-Math.PI / 2);          // extrusion now goes up along +y: from -bt to depth + bt
  g.translate(0, -(depth + bt), 0); // top surface at y = 0
  g.deleteAttribute('uv');
  const ng = g.index ? g.toNonIndexed() : g;
  const pos = ng.attributes.position, nor = ng.attributes.normal;
  const n = pos.count;
  const clr = new Float32Array(n * 3);
  const grass = col(PAL.grass), sand = col(PAL.sand), dirt = col(PAL.dirt), rock = col(PAL.rock);
  const tmp = new T.Color();
  for (let i = 0; i < n; i++) {
    const ny = nor.getY(i), y = pos.getY(i);
    if (ny > 0.75) tmp.copy(grass);
    else if (ny > 0.2 || y > -0.25) tmp.copy(sand);
    else tmp.copy(dirt).lerp(rock, Math.min(1, (-y - 0.3) / 1.0));
    clr[i * 3] = tmp.r; clr[i * 3 + 1] = tmp.g; clr[i * 3 + 2] = tmp.b;
  }
  ng.setAttribute('color', new T.Float32BufferAttribute(clr, 3));
  ng.computeBoundingSphere();
  const m = new T.Mesh(ng, MAT.plastic);
  m.receiveShadow = true;
  m.castShadow = false;
  return m;
}
function islandMesh() { return cushionMesh(0, 0, ISLAND.w, ISLAND.d, ISLAND.r); }

/** Animated sea: a big plane with gentle waves. */
export function createSea(cx, cz, size = 320) {
  const water = new T.Mesh(new T.PlaneGeometry(size, size, 64, 64), MAT.water);
  water.rotation.x = -Math.PI / 2;
  water.position.set(cx, WATER_Y, cz);
  water.receiveShadow = true;
  const wpos = water.geometry.attributes.position;
  const wbase = wpos.array.slice();
  function update(t, lite) {
    if (lite) return;
    const a = wpos.array;
    for (let i = 0; i < wpos.count; i++) {
      const x = wbase[i * 3], y = wbase[i * 3 + 1];
      a[i * 3 + 2] = Math.sin(x * 0.55 + t / 620) * 0.09 + Math.cos(y * 0.7 - t / 830) * 0.07 + Math.sin((x + y) * 0.3 + t / 1500) * 0.05;
    }
    wpos.needsUpdate = true;
    water.geometry.computeVertexNormals();
  }
  return { mesh: water, update };
}
export { WATER_Y };

function isletMesh(x, y, w, d) {
  const shape = roundedRect(x, y, w, d, Math.min(w, d) / 2.2);
  const depth = 1.0, bt = 0.35;
  const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bt, bevelSize: 0.4, bevelSegments: 4, curveSegments: 8 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -(depth + bt) + 0.05, 0);
  g.deleteAttribute('uv');
  const b = new Builder();
  b.add(g, PAL.sand);
  b.puff(x + w / 2, y + d / 2, 0.15, Math.min(w, d) * 0.28, PAL.grass, 1);
  return b;
}

function palm(b, x, y, s = 1) {
  // a leaning trunk of stacked rings and a crown of flat leaves
  for (let i = 0; i < 6; i++) b.cyl(x + i * 0.06 * s, y - i * 0.04 * s, i * 0.36 * s, (0.13 - i * 0.008) * s, 0.4 * s, i % 2 ? '#a8763f' : '#8a5a35', 10);
  const top = 2.2 * s;
  b.sphere(x + 0.36 * s, y - 0.24 * s, top, 0.16 * s, '#8a5a35', 8);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const g = new T.BoxGeometry(1.35 * s, 0.05, 0.34 * s);
    g.translate(0.62 * s, 0, 0);
    g.rotateZ(-0.35);
    g.rotateY(a);
    g.translate(x + 0.36 * s, top + 0.05, y - 0.24 * s);
    b.add(g, i % 2 ? '#45d65c' : '#3fbf5a');
  }
  b.sphere(x + 0.5 * s, y - 0.3 * s, top - 0.1, 0.09, '#b5763f', 6);
  b.sphere(x + 0.24 * s, y - 0.12 * s, top - 0.12, 0.09, '#b5763f', 6);
}

export function createWorld(config) {
  const group = new T.Group();
  const anim = [];

  // ---- island, sea, foam ----
  group.add(islandMesh());
  const sea = createSea(ISLAND.w / 2, ISLAND.d / 2);
  group.add(sea.mesh);
  const foamShape = roundedRect(-0.62, -0.62, ISLAND.w + 1.24, ISLAND.d + 1.24, ISLAND.r + 0.6);
  foamShape.holes.push(roundedRectPath(-0.36, -0.36, ISLAND.w + 0.72, ISLAND.d + 0.72, ISLAND.r + 0.36));
  const foam = flat(foamShape, WATER_Y + 0.025, '#ffffff', { opacity: 0.55, order: 1, segments: 10 });
  group.add(foam);

  // ---- beach corner, pavements, road ----
  const beach = new T.Shape();
  beach.moveTo(ISLAND.w - 0.2, -0.2); beach.lineTo(ISLAND.w - 0.2, -4.9); beach.quadraticCurveTo(ISLAND.w - 3.6, -3.6, ISLAND.w - 6.4, -0.2); beach.closePath();
  group.add(flat(beach, 0.006, PAL.sand));
  const ground = new Builder({ r: 0.05 });
  for (const m of config.makers) {
    const [px, py] = PLOTS[m.id];
    ground.box(px - 1.5, py - 1.5, 0, 3, 3, 0.06, PAVE, { r: 0.4 });
  }
  ground.box(HOUSE[0] - 1.7, HOUSE[1] - 1.5, 0, 3.4, 3, 0.05, '#bfe9a4', { r: 0.5 });
  // road: pavement band, asphalt, dashes, zebra
  const { x, y, w, d, r, width } = ROAD;
  const side = roundedRect(x - width / 2 - 0.4, y - width / 2 - 0.4, w + width + 0.8, d + width + 0.8, r + width / 2 + 0.4);
  side.holes.push(roundedRectPath(x + width / 2 + 0.4, y + width / 2 + 0.4, w - width - 0.8, d - width - 0.8, Math.max(0.2, r - width / 2 - 0.4)));
  group.add(flat(side, 0.07, PAL.side));
  const road = roundedRect(x - width / 2, y - width / 2, w + width, d + width, r + width / 2);
  road.holes.push(roundedRectPath(x + width / 2, y + width / 2, w - width, d - width, Math.max(0.2, r - width / 2)));
  group.add(flat(road, 0.075, PAL.road, { rough: 0.95 }));
  const path = roadPath(400);
  for (let s = 0; s < path.total; s += 1.0) {
    const p = along(path, s);
    const g = new T.BoxGeometry(0.1, 0.02, 0.5);
    g.rotateY(p.angle);
    g.translate(p.x, 0.085, p.y);
    ground.add(g, PAL.roadLine);
  }
  for (let i = 0; i < 5; i++) ground.add(new T.BoxGeometry(width - 0.1, 0.02, 0.14).translate(x, 0.085, y + 2.6 + i * 0.28), '#ffffff');
  group.add(ground.build({ shadow: false }));

  // ---- park: pond, fountain, benches, sign ----
  const park = new Builder({ r: 0.05 });
  park.disc(PARK[0], PARK[1], 0, 1.75, shade('#3fc0f5', -0.4), 0.05);
  park.disc(PARK[0], PARK[1], 0.02, 1.55, '#5fd2ff', 0.05);
  park.cyl(PARK[0], PARK[1], 0.05, 0.22, 0.45, '#dcd7cb', 12);
  park.disc(PARK[0], PARK[1], 0.5, 0.42, '#e9e2cf', 0.08, 16);
  for (const [fx, fy, c] of FLOWERS) park.flower(fx, fy, c);
  // bench
  park.box(7.0, 4.3, 0.28, 1.2, 0.38, 0.08, '#b5763f');
  park.box(7.0, 4.3, 0.36, 1.2, 0.1, 0.36, '#b5763f');
  park.box(7.05, 4.34, 0, 0.1, 0.3, 0.3, '#5b6472');
  park.box(8.05, 4.34, 0, 0.1, 0.3, 0.3, '#5b6472');
  // town sign: white board on two posts, text on the lower-left face
  park.cyl(6.4, 8.0, 0, 0.06, 0.9, '#9aa3b2', 8);
  park.cyl(9.2, 8.0, 0, 0.06, 0.9, '#9aa3b2', 8);
  park.box(6.2, 7.9, 0.5, 3.2, 0.16, 0.7, '#ffffff', { r: 0.08 });
  park.box(6.15, 7.88, 0.46, 3.3, 0.2, 0.08, '#45b6ff', { r: 0.03 });
  group.add(park.build());
  const sign = textPlane('MUNTSTAD', { w: 3.0, h: 0.62, font: 0.5, color: INK });
  sign.position.set(7.8, 0.85, 8.09);
  group.add(sign);
  // fountain spray
  const drops = [];
  for (let i = 0; i < 8; i++) {
    const s = new T.Mesh(new T.SphereGeometry(0.06, 6, 5), MAT.white);
    group.add(s);
    drops.push(s);
  }
  anim.push((t) => {
    for (let i = 0; i < drops.length; i++) {
      const f = ((t / 700) + i / drops.length) % 1;
      const a = (i / drops.length) * Math.PI * 2 + t / 2000;
      drops[i].position.set(PARK[0] + Math.cos(a) * 0.45 * f, 0.6 + Math.sin(f * Math.PI) * 0.9, PARK[1] + Math.sin(a) * 0.45 * f);
    }
  });

  // ---- scenery: trees, bushes, lamps, beach props ----
  const scenery = new Builder();
  for (const [tx, ty, ts] of TREES) scenery.tree(tx, ty, ts);
  for (const [bx, by, bs] of BUSHES) scenery.bush(bx, by, bs);
  for (const [lx, ly] of LAMPS) { scenery.cyl(lx, ly, 0, 0.16, 0.12, '#8a8f99', 10); scenery.cyl(lx, ly, 0.1, 0.05, 1.5, '#8a8f99', 8); scenery.box(lx - 0.2, ly - 0.2, 1.6, 0.4, 0.4, 0.08, '#5b6472'); }
  palm(scenery, 13.9, 1.4, 1.0);
  palm(scenery, 15.0, 2.9, 0.8);
  scenery.cyl(12.2, 2.5, 0, 0.04, 1.3, '#8a8f99', 6);                    // parasol
  scenery.cone(12.2, 2.5, 1.05, 1.0, 0.42, '#ff5f5f', 12);
  scenery.box(13.9, 2.9, 0, 1.0, 0.55, 0.04, '#ffe94d', { r: 0.02 });   // towel
  scenery.box(14.6, 3.5, 0, 0.42, 0.42, 0.34, '#45b6ff', { r: 0.08 }); // bucket
  scenery.sphere(11.6, 1.6, 0.22, 0.22, '#ff9f2e', 10);                 // beach ball
  for (const [rx, ry, rs] of [[-0.4, 9.6, 0.42], [16.5, 11.8, 0.38], [4.4, -0.5, 0.34]]) scenery.puff(rx, ry, -0.32, rs, '#a8afbd', 0);
  // hedges around every plot (leave the road side open), extra trees along the rim, flower beds at the corners
  for (const m of config.makers) {
    const [px, py] = PLOTS[m.id];
    const nearRoadX = px > ROAD.x + ROAD.w / 2 ? px - 1.7 : px + 1.7; // the side that faces the loop stays open
    for (let i = 0; i < 5; i++) {
      const t = -1.3 + i * 0.65;
      if (Math.abs(nearRoadX - (px + 1.7)) > 0.1) scenery.bush(px + 1.7, py + t, 0.42, '#3fbf5a'); else scenery.bush(px - 1.7, py + t, 0.42, '#3fbf5a');
    }
  }
  for (const [tx, ty, ts] of [[0.5, 0.5, 0.55], [2.6, 11.4, 0.7], [8.2, 11.6, 0.55], [15.6, 6.0, 0.6], [0.4, 8.0, 0.55], [7.0, -0.2, 0.5]]) scenery.tree(tx, ty, ts, '#45d65c');
  for (const [fx, fy] of [[3.0, 2.2], [12.7, 2.2], [3.0, 9.8], [12.7, 9.8]]) {
    scenery.disc(fx, fy, 0, 0.42, '#8a5a35', 0.08, 16);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; scenery.flower(fx + Math.cos(a) * 0.24, fy + Math.sin(a) * 0.24, ['#ff6fae', '#ffe94d', '#7c9bff', '#ff9f2e'][i % 4], 0.08); }
  }
  // street furniture: bins, a second bench, a picnic table, a mailbox
  for (const [bx, by] of [[4.0, 2.2], [11.6, 9.9], [2.4, 6.9]]) { scenery.cyl(bx, by, 0, 0.16, 0.42, '#45b6ff', 10); scenery.cyl(bx, by, 0.42, 0.18, 0.05, '#1a7ad6', 10); }
  scenery.box(8.4, 9.9, 0.28, 1.1, 0.36, 0.08, '#b5763f'); scenery.box(8.4, 9.9, 0.36, 1.1, 0.1, 0.34, '#b5763f'); scenery.box(8.45, 9.94, 0, 0.1, 0.28, 0.28, '#5b6472'); scenery.box(9.35, 9.94, 0, 0.1, 0.28, 0.28, '#5b6472');
  scenery.box(5.2, 9.4, 0.5, 1.2, 0.7, 0.08, '#c98a4b'); scenery.box(5.2, 9.1, 0.32, 1.2, 0.25, 0.06, '#c98a4b'); scenery.box(5.2, 10.15, 0.32, 1.2, 0.25, 0.06, '#c98a4b'); scenery.box(5.7, 9.65, 0, 0.2, 0.2, 0.5, '#8a5a35');
  scenery.cyl(3.3, 6.2, 0, 0.04, 0.7, '#5b6472', 6); scenery.box(3.1, 6.05, 0.7, 0.4, 0.3, 0.34, '#ff5f5f', { r: 0.06 });
  // a path from the house to the road
  scenery.box(2.9, 3.6, 0.0, 1.0, 1.9, 0.045, '#e9e2cf', { r: 0.1 });
  group.add(scenery.build());
  const lamps = [];
  for (const [lx, ly] of LAMPS) {
    const bulb = new T.Mesh(new T.SphereGeometry(0.17, 12, 10), new T.MeshStandardMaterial({ color: col('#ffe94d'), emissive: col('#ffd23f'), emissiveIntensity: 0.7, roughness: 0.5 }));
    bulb.position.set(lx, 1.5, ly);
    group.add(bulb);
    lamps.push(bulb);
  }

  // ---- islets with a palm for depth ----
  for (const [ix, iy, iw, id] of [[-7.5, -3.5, 3.2, 2.4], [19.5, -4.5, 2.6, 2.2], [-5.5, 13.5, 2.4, 2.0]]) {
    const b = isletMesh(ix, iy, iw, id);
    palm(b, ix + iw * 0.6, iy + id * 0.45, 0.75);
    group.add(b.build());
  }

  // ---- clouds ----
  const clouds = [];
  const cloudDefs = [[-6, 11, -8, 1.1], [11, 12, 17, 0.9], [-10, 10.5, 9, 0.8], [21, 11.5, -2, 0.7], [4, 12.5, 19, 1.0]];
  for (const [cx, cy, cz, s] of cloudDefs) {
    const b = new Builder();
    b.puff(0, 0, 0, 0.9 * s, '#ffffff', 1);
    b.puff(0.9 * s, 0.1 * s, -0.15 * s, 0.7 * s, '#ffffff', 1);
    b.puff(-0.8 * s, -0.1 * s, -0.1 * s, 0.6 * s, '#ffffff', 1);
    b.puff(0.2 * s, 0.6 * s, -0.2 * s, 0.55 * s, '#ffffff', 1);
    const m = b.build({ material: MAT.cloud, receive: false });
    m.position.set(cx, cy, cz);
    group.add(m);
    clouds.push({ mesh: m, speed: 0.18 + s * 0.12, x0: cx });
  }

  function update(t, dt, lite) {
    for (const fn of anim) fn(t);
    for (const c of clouds) {
      c.mesh.position.x += c.speed * dt;
      if (c.mesh.position.x > 26) c.mesh.position.x = -12;
    }
    foam.material.opacity = 0.45 + Math.sin(t / 900) * 0.15;
    sea.update(t, lite);
  }

  // boats bobbing in the sea and gulls circling above
  const boats = [];
  for (const [bx, bz, colr, ph] of [[11.5, 16.2, '#ff5f5f', 0], [-4.5, 5.5, '#45b6ff', 2], [20.5, 8.5, '#ffe94d', 4]]) {
    const b = new Builder({ r: 0.05 });
    b.box(-0.55, -0.28, 0, 1.1, 0.56, 0.3, colr, { r: 0.12 });
    b.box(-0.45, -0.2, 0.3, 0.9, 0.4, 0.04, '#e9e2cf', { r: 0.02 });
    b.cyl(0.05, 0, 0.32, 0.03, 1.2, '#dcd7cb', 6);
    const sail = new T.Shape(); sail.moveTo(0, 0); sail.lineTo(0.62, 0); sail.lineTo(0, 0.95); sail.closePath();
    const sg = new T.ExtrudeGeometry(sail, { depth: 0.02, bevelEnabled: false }); sg.translate(0.08, 0.5, -0.01); b.add(sg, '#ffffff');
    const m = b.build();
    m.position.set(bx, WATER_Y + 0.02, bz);
    m.rotation.y = ph;
    group.add(m);
    boats.push({ mesh: m, ph, bx, bz });
  }
  const gulls = [];
  for (let i = 0; i < 5; i++) {
    const b = new Builder({ r: 0.01 });
    b.add(new T.BoxGeometry(0.3, 0.02, 0.06).rotateZ(0.5).translate(-0.13, 0, 0), '#ffffff');
    b.add(new T.BoxGeometry(0.3, 0.02, 0.06).rotateZ(-0.5).translate(0.13, 0, 0), '#ffffff');
    const m = b.build({ shadow: false, receive: false });
    group.add(m);
    gulls.push({ mesh: m, r: 6 + i * 1.6, h: 5.5 + i * 0.5, ph: i * 1.3, sp: 0.25 + i * 0.04 });
  }
  anim.push((t) => {
    for (const b of boats) { b.mesh.position.y = WATER_Y + 0.02 + Math.sin(t / 900 + b.ph) * 0.06; b.mesh.rotation.z = Math.sin(t / 1100 + b.ph) * 0.05; b.mesh.rotation.x = Math.cos(t / 1300 + b.ph) * 0.04; }
    for (const g of gulls) {
      const a = t / 1000 * g.sp + g.ph;
      g.mesh.position.set(ISLAND.w / 2 + Math.cos(a) * g.r, g.h + Math.sin(t / 500 + g.ph) * 0.2, ISLAND.d / 2 + Math.sin(a) * g.r * 0.7);
      g.mesh.rotation.y = -a;
      g.mesh.scale.y = 1 + Math.sin(t / 120 + g.ph) * 0.5;
    }
  });

  return { group, update, lamps };
}

// ---------- collision circles for the adventure (3d/player.js) ----------
const PALMS = [[13.9, 1.4, 0.3], [15.0, 2.9, 0.26]];
/** Round obstacles {x, z, r} the player and the dog bump into: trees, bushes, lamps, palms, the pond, every plot (hedged) and the house. */
export function obstacles(config) {
  const out = [];
  for (const [x, z, s] of TREES) out.push({ x, z, r: 0.28 * s + 0.1 });
  for (const [x, z, s] of BUSHES) out.push({ x, z, r: 0.5 * s });
  for (const [x, z] of LAMPS) out.push({ x, z, r: 0.2 });
  for (const [x, z, r] of PALMS) out.push({ x, z, r });
  out.push({ x: PARK[0], z: PARK[1], r: 1.8 });
  for (const m of config.makers) { const [x, z] = PLOTS[m.id]; out.push({ x, z, r: 1.9 }); }
  out.push({ x: HOUSE[0], z: HOUSE[1], r: 1.95 });
  return out;
}
