// 3d/forest.js — thousands of simple things with InstancedMesh (one draw call per kind): two trees, two bushes,
// three rocks, a grass tuft and a flower. Where they stand comes from 3d/forest-place.js (pure, unit-tested).
// buildForest(placements) → { group, obstacles } makes the meshes; trees and rocks are round obstacles.
import * as T from '../../vendor/three.module.min.js';
import { Builder, MAT } from './build.js';
import { KINDS, placeForest } from './forest-place.js';
export { KINDS, placeForest };

// ---------- the nine models (built once, instanced) ----------
function geomOf(kind) {
  const b = new Builder({ r: 0.05 });
  switch (kind) {
    case 'tree1':   // round leafy tree
      b.cyl(0, 0, 0, 0.22, 1.3, '#8a5a35', 8);
      b.sphere(0, 0, 1.9, 1.0, '#3fbf5a', 10);
      b.sphere(0.5, 0.3, 1.6, 0.7, '#46c95f', 9);
      b.sphere(-0.5, -0.2, 1.7, 0.65, '#36a94e', 9);
      break;
    case 'tree2':   // pine
      b.cyl(0, 0, 0, 0.2, 1.0, '#7a4f2e', 8);
      b.cone(0, 0, 0.8, 1.15, 1.5, '#2f9e4c', 9);
      b.cone(0, 0, 1.7, 0.9, 1.3, '#37ad55', 9);
      b.cone(0, 0, 2.5, 0.6, 1.1, '#46c95f', 9);
      break;
    case 'bush1':
      b.sphere(0, 0, 0.35, 0.55, '#46c95f', 8);
      b.sphere(0.4, 0.2, 0.3, 0.4, '#3fbf5a', 8);
      break;
    case 'bush2':
      b.sphere(0, 0, 0.3, 0.45, '#3a9f4a', 8);
      b.sphere(-0.35, 0.15, 0.28, 0.35, '#46c95f', 8);
      b.sphere(0.1, -0.1, 0.65, 0.12, '#ff5f5f', 6);   // berries (R3 picks them)
      break;
    case 'rock1':
      b.add(new T.DodecahedronGeometry(0.5, 0).scale(1, 0.7, 1.2).translate(0, 0.25, 0), '#8d9199');
      break;
    case 'rock2':
      b.add(new T.DodecahedronGeometry(0.8, 0).scale(1.2, 0.8, 1).translate(0, 0.4, 0), '#7c8089');
      b.add(new T.DodecahedronGeometry(0.4, 0).translate(0.7, 0.2, 0.3), '#8d9199');
      break;
    case 'rock3':
      b.add(new T.DodecahedronGeometry(1.1, 0).scale(1, 1.3, 1).translate(0, 0.7, 0), '#6d717a');
      break;
    case 'grass':
      for (let i = 0; i < 3; i++) {
        const g = new T.ConeGeometry(0.07, 0.42, 4).translate(0, 0.21, 0).rotateZ((i - 1) * 0.35).translate((i - 1) * 0.08, 0, 0);
        b.add(g, i === 1 ? '#8fe06f' : '#6fd35b');
      }
      break;
    case 'flower':
      b.cyl(0, 0, 0, 0.03, 0.35, '#4fae45', 5);
      b.sphere(0, 0, 0.4, 0.11, '#ff6fae', 6);
      b.sphere(0, 0, 0.42, 0.05, '#ffe94d', 5);
      break;
    case 'shell':
      b.add(new T.SphereGeometry(0.22, 8, 6).scale(1, 0.45, 0.85).translate(0, 0.08, 0), '#ffe6d5');
      b.add(new T.SphereGeometry(0.1, 6, 5).scale(1, 0.5, 1).translate(0.12, 0.06, -0.06), '#ff9fbd');
      break;
    // the five below were drafted by Ollama (qwen3.8:27b) from the two tree examples and checked by hand
    case 'tree3':   // thick old tree
      b.cyl(0, 0, 0, 0.45, 1.5, '#6b4423', 8);
      b.cyl(0.3, 0.2, 1.2, 0.15, 0.8, '#5d3a1f', 6);
      b.cyl(-0.2, -0.3, 1.3, 0.12, 0.7, '#5d3a1f', 6);
      b.sphere(0, 0, 2.8, 1.2, '#2e8b57', 10);
      b.sphere(0.8, 0.5, 2.5, 0.9, '#3cb371', 9);
      b.sphere(-0.7, -0.4, 2.6, 0.85, '#228b22', 9);
      b.sphere(0.2, -0.6, 3.0, 0.7, '#3cb371', 8);
      break;
    case 'log':     // fallen trunk, a seat
      b.add(new T.CylinderGeometry(0.33, 0.33, 2.2, 10).rotateZ(Math.PI / 2).translate(0, 0.33, 0), '#8b5a2b');
      b.add(new T.CylinderGeometry(0.2, 0.2, 2.24, 10).rotateZ(Math.PI / 2).translate(0, 0.33, 0), '#c9a47a');
      b.sphere(-0.5, 0.3, 0.55, 0.13, '#654321', 8);
      b.sphere(0.6, -0.25, 0.5, 0.11, '#654321', 8);
      break;
    case 'reed':
      b.cyl(-0.2, -0.1, 0, 0.03, 1.2, '#4caf50', 6);
      b.cyl(0, 0, 0, 0.03, 1.4, '#43a047', 6);
      b.cyl(0.2, 0.1, 0, 0.03, 1.6, '#388e3c', 6);
      b.cyl(-0.1, 0.2, 0, 0.03, 1.3, '#4caf50', 6);
      b.cyl(0.1, -0.2, 0, 0.03, 1.5, '#43a047', 6);
      b.cyl(0, 0, 1.4, 0.06, 0.3, '#8b4513', 6);
      b.cyl(0.2, 0.1, 1.6, 0.06, 0.3, '#8b4513', 6);
      b.cyl(0.1, -0.2, 1.5, 0.06, 0.3, '#8b4513', 6);
      break;
    case 'crab':
      b.box(-0.25, -0.2, 0.06, 0.5, 0.4, 0.18, '#ff4500', { r: 0.06 });
      b.sphere(-0.3, 0.22, 0.14, 0.1, '#ff4500', 8);
      b.sphere(0.3, 0.22, 0.14, 0.1, '#ff4500', 8);
      for (const dx of [-0.35, 0.25]) for (const dy of [-0.3, -0.1, 0.1, 0.3]) b.box(dx, dy, 0, 0.1, 0.05, 0.08, '#ff6347');
      b.sphere(-0.1, 0.2, 0.26, 0.035, '#000000', 6);
      b.sphere(0.1, 0.2, 0.26, 0.035, '#000000', 6);
      break;
    case 'butterfly':
      b.cyl(0, 0, 0, 0.03, 0.25, '#333333', 6);
      b.box(-0.32, -0.12, 0.02, 0.3, 0.25, 0.02, '#ff1493');
      b.box(0.02, -0.12, 0.02, 0.3, 0.25, 0.02, '#00bfff');
      break;
    default: break;
  }
  return b.build().geometry;
}

const OBSTACLE_R = { tree1: 0.36, tree2: 0.34, tree3: 0.55, log: 0.6, rock1: 0.55, rock2: 0.95, rock3: 1.1 };

export function buildForest(placements) {
  const group = new T.Group();
  const obstacles = [];
  const meshes = {};
  const m = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), sc = new T.Vector3();
  const up = new T.Vector3(0, 1, 0);
  const tiltQ = new T.Quaternion(), tiltAxis = new T.Vector3(1, 0, 0);
  function place(mesh, it, i, scale, tilt = 0) {
    q.setFromAxisAngle(up, it.rot);
    if (tilt) { tiltQ.setFromAxisAngle(tiltAxis, tilt); q.multiply(tiltQ); }   // a chopped tree wobbles
    p.set(it.x, it.y - 0.05, it.z);
    sc.set(it.s * scale, it.s * scale, it.s * scale);
    m.compose(p, q, sc);
    mesh.setMatrixAt(i, m);
  }
  for (const kind of KINDS) {
    const list = placements[kind];
    if (!list || !list.length) continue;
    const geom = geomOf(kind);
    const mesh = new T.InstancedMesh(geom, MAT.plastic, list.length);
    const casts = kind.startsWith('tree') || kind.startsWith('rock');
    mesh.castShadow = casts;
    mesh.receiveShadow = true;
    list.forEach((it, i) => {
      place(mesh, it, i, 1);
      if (OBSTACLE_R[kind]) obstacles.push({ x: it.x, z: it.z, r: OBSTACLE_R[kind] * it.s, kind, index: i });
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;   // one bounding sphere per kind would cull the whole forest; distance fog does the rest
    group.add(mesh);
    meshes[kind] = mesh;
  }
  /** Scale one instance (0 hides it: a picked shell, a resting bush's berries are handled by the scene). */
  function setScale(kind, i, scale) {
    const mesh = meshes[kind];
    if (!mesh) return;
    place(mesh, placements[kind][i], i, scale);
    mesh.instanceMatrix.needsUpdate = true;
  }
  // life: crabs scuttle sideways on the beach, butterflies flutter over the flowers by day
  const crabs = (placements.crab || []).map((it, i) => ({ it, i, ph: Math.random() * 10, dir: Math.random() * Math.PI * 2, t: Math.random() * 3 }));
  const flies = (placements.butterfly || []).map((it, i) => ({ it, i, ph: Math.random() * 10 }));
  const tmp = { x: 0, z: 0, y: 0, s: 1, rot: 0 };
  function animate(now, dt, darkness) {
    const crabMesh = meshes.crab, flyMesh = meshes.butterfly;
    if (crabMesh) {
      for (const c of crabs) {
        c.t -= dt;
        if (c.t <= 0) { c.t = 1 + Math.random() * 3; c.dir = Math.random() * Math.PI * 2; c.move = Math.random() < 0.6; }
        const step = c.move ? 0.6 * dt : 0;
        c.it.ox = Math.max(-1.2, Math.min(1.2, (c.it.ox || 0) + Math.cos(c.dir) * step));
        c.it.oz = Math.max(-1.2, Math.min(1.2, (c.it.oz || 0) + Math.sin(c.dir) * step));
        tmp.x = c.it.x + c.it.ox; tmp.z = c.it.z + c.it.oz; tmp.y = c.it.y; tmp.s = c.it.s; tmp.rot = c.dir + Math.PI / 2;
        place(crabMesh, tmp, c.i, 1 + (c.move ? Math.sin(now / 60 + c.ph) * 0.06 : 0));
      }
      crabMesh.instanceMatrix.needsUpdate = true;
    }
    if (flyMesh) {
      flyMesh.visible = darkness < 0.6;
      if (flyMesh.visible) {
        for (const f of flies) {
          const a = now / 1400 + f.ph;
          tmp.x = f.it.x + Math.cos(a) * 0.8; tmp.z = f.it.z + Math.sin(a * 1.3) * 0.8;
          tmp.y = f.it.y + Math.sin(now / 300 + f.ph) * 0.25; tmp.s = f.it.s; tmp.rot = a + Math.PI / 2;
          place(flyMesh, tmp, f.i, 1 + Math.abs(Math.sin(now / 90 + f.ph)) * 0.3);
        }
        flyMesh.instanceMatrix.needsUpdate = true;
      }
    }
  }
  /** Tilt one instance (radians) at full scale: the wobble of a tree being chopped. */
  function setTilt(kind, i, tilt) {
    const mesh = meshes[kind];
    if (!mesh) return;
    place(mesh, placements[kind][i], i, 1, tilt);
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { group, obstacles, meshes, placements, setScale, setTilt, animate };
}
