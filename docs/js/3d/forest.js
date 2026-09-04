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
    default: break;
  }
  return b.build().geometry;
}

const OBSTACLE_R = { tree1: 0.36, tree2: 0.34, rock1: 0.55, rock2: 0.95, rock3: 1.1 };

export function buildForest(placements) {
  const group = new T.Group();
  const obstacles = [];
  const meshes = {};
  const m = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), sc = new T.Vector3();
  const up = new T.Vector3(0, 1, 0);
  function place(mesh, it, i, scale) {
    q.setFromAxisAngle(up, it.rot);
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
  return { group, obstacles, meshes, placements, setScale };
}
