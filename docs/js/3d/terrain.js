// 3d/terrain.js — the island's ground as one mesh with vertex colours (sand, grass, dark grass, rock, snow, sand
// paths), the sea around it and the lake in it. Heights and kinds come from 3d/heightmap.js.
// createTerrain(map) → { group, update(t, lite) }
import * as T from '../../vendor/three.module.min.js';
import { MAT, col } from './build.js';
import { createSea } from './world.js';
import { fbm, LAKE } from './heightmap.js';

const COL = {
  seabed: '#dcc98f', beach: '#f4d98a', path: '#e8d5a2', grass: '#6fd35b', grassDark: '#4fae45', grassLight: '#8fe06f',
  rock: '#8d9199', rockDark: '#6d717a', snow: '#f7fbff', lakeBed: '#7fb0a0',
};

export function createTerrain(map) {
  const group = new T.Group();
  const { n, cell, size } = map;
  const verts = (n + 1) * (n + 1);
  const pos = new Float32Array(verts * 3);
  const clr = new Float32Array(verts * 3);
  const tmp = new T.Color();
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const k = j * (n + 1) + i;
    const x = i * cell, z = j * cell;
    const y = map.h[k];
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
    const kind = map.kindAt(x, z);
    const v = fbm(x / 6, z / 6, 31);          // colour variation
    if (kind === 'sea') tmp.set(col(COL.seabed)).lerp(col(COL.beach), Math.min(1, Math.max(0, (y + 0.9) / 0.9)));
    else if (kind === 'lake') tmp.set(col(COL.lakeBed));
    else if (kind === 'beach') tmp.set(col(COL.beach)).lerp(col(COL.grass), Math.max(0, (y - 0.3) / 0.15) * 0.5);
    else if (kind === 'path') tmp.set(col(COL.path));
    else if (kind === 'snow') tmp.set(col(COL.snow));
    else if (kind === 'rock') tmp.set(col(COL.rock)).lerp(col(COL.rockDark), v);
    else tmp.set(col(v < 0.45 ? COL.grassDark : COL.grass)).lerp(col(COL.grassLight), Math.max(0, v - 0.6) * 1.5);
    // sandy blend where grass meets the beach
    if (kind === 'grass' && y < 0.6) tmp.lerp(col(COL.beach), (0.6 - y) / 0.15 * 0.6);
    clr[k * 3] = tmp.r; clr[k * 3 + 1] = tmp.g; clr[k * 3 + 2] = tmp.b;
  }
  const idx = new Uint32Array(n * n * 6);
  let o = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const a = j * (n + 1) + i, b = a + 1, c = a + (n + 1), d = c + 1;
    idx[o++] = a; idx[o++] = c; idx[o++] = b;
    idx[o++] = b; idx[o++] = c; idx[o++] = d;
  }
  const geom = new T.BufferGeometry();
  geom.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geom.setAttribute('color', new T.Float32BufferAttribute(clr, 3));
  geom.setIndex(new T.BufferAttribute(idx, 1));
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
  const ground = new T.Mesh(geom, MAT.plasticFlat);
  ground.receiveShadow = true;
  ground.castShadow = false;
  group.add(ground);

  // the sea (waves from the village's sea) and the lake
  const sea = createSea(size / 2, size / 2, 420);
  sea.mesh.position.y = 0;
  group.add(sea.mesh);
  const lake = new T.Mesh(new T.CircleGeometry(LAKE.r * 0.98, 40), new T.MeshStandardMaterial({ color: col('#4fc8f0'), roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.9 }));
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(LAKE.x, LAKE.level, LAKE.z);
  lake.receiveShadow = true;
  group.add(lake);

  function update(t, lite) {
    sea.update(t, lite);
  }
  return { group, update, ground };
}
