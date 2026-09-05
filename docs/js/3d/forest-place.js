// 3d/forest-place.js — where the forest grows, as pure numbers (no Three.js; unit-tested): a jittered grid over
// the island, trees in the noise clumps on the grass, bushes, rocks, grass tufts and flowers elsewhere; nothing on
// paths, in the camp, at the cave or on the pier. placeForest(map, seed) → { tree1: [{ x, z, y, s, rot }], ... }
import { fbm, distToPaths, CAMP, CAVE, PIER, LAKE, RUINE, inCave } from './heightmap.js';

export const KINDS = ['tree1', 'tree2', 'tree3', 'log', 'bush1', 'bush2', 'rock1', 'rock2', 'rock3', 'grass', 'flower', 'shell', 'reed', 'crab', 'butterfly'];

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/**
 * Deterministic placements per kind: [{ x, z, y, s, rot }]. Nothing on paths, in the camp, at the cave, the ruin or the
 * pier. `bounds` = { x0, z0, x1, z1 } limits it to one tile (V6.2); the seed mixes in the tile so tiles differ.
 */
export function placeForest(map, seed = 7, bounds = null) {
  const b = bounds || { x0: 0, z0: 0, x1: map.size, z1: map.size };
  const rand = rng(seed + Math.floor(b.x0) * 7919 + Math.floor(b.z0) * 104729);
  const out = Object.fromEntries(KINDS.map((k) => [k, []]));
  const free = (x, z, margin) => {
    if (distToPaths(x, z) < margin) return false;
    if (Math.hypot(x - CAMP.x, z - CAMP.z) < CAMP.r + margin) return false;
    if (Math.hypot(x - CAVE.x, z - CAVE.z) < 3.5 + margin || inCave(x, z, 3 + margin)) return false;
    if (Math.abs(x - PIER.x) < 3 + margin && z > PIER.z - PIER.len - 3) return false;
    if (RUINE && Math.hypot(x - RUINE.x, z - RUINE.z) < RUINE.r * 0.8 + margin) return false;
    return true;
  };
  const step = 1.15;
  const zStart = Math.max(2, Math.ceil(b.z0 / step) * step), zEnd = Math.min(map.size - 2, b.z1);
  const xStart = Math.max(2, Math.ceil(b.x0 / step) * step), xEnd = Math.min(map.size - 2, b.x1);
  for (let z = zStart; z < zEnd; z += step) for (let x = xStart; x < xEnd; x += step) {
    const px = x + (rand() - 0.5) * step * 0.9, pz = z + (rand() - 0.5) * step * 0.9;
    if (bounds && (px < b.x0 || px >= b.x1 || pz < b.z0 || pz >= b.z1)) continue;   // a tile owns only what lies inside it
    const kind = map.kindAt(px, pz);
    const y = map.heightAt(px, pz);
    const rot = rand() * Math.PI * 2;
    const s = 0.9 + rand() * 0.2;
    const r = rand();
    const nearLake = Math.hypot(px - LAKE.x, pz - LAKE.z) - LAKE.r;   // > 0 outside the water
    if (kind === 'grass') {
      const clump = fbm(px / 11, pz / 11, 21);           // forest where the clump noise is high
      if (nearLake > 0.2 && nearLake < 1.8 && r < 0.6) out.reed.push({ x: px, z: pz, y, s, rot });   // reeds round the lake
      else if (clump > 0.52 && nearLake > 7 && free(px, pz, 1.8)) {   // the lake keeps an open shore
        // one old thick tree in about twenty; now and then a fallen log at the edge of a clump
        if (r < 0.05 && clump > 0.62 && free(px, pz, 2.6)) out.tree3.push({ x: px, z: pz, y, s, rot });
        else if (r < 0.08 && clump < 0.58) out.log.push({ x: px, z: pz, y, s, rot });
        else out[r < 0.55 ? 'tree1' : 'tree2'].push({ x: px, z: pz, y, s: s * (0.9 + clump * 0.4), rot });
      } else if (r < 0.10 && free(px, pz, 1.2)) out[r < 0.05 ? 'bush1' : 'bush2'].push({ x: px, z: pz, y, s, rot });
      else if (r < 0.14 && free(px, pz, 1.0)) out.rock1.push({ x: px, z: pz, y, s: s * 0.8, rot });
      else if (r < 0.50) out.grass.push({ x: px, z: pz, y, s, rot });
      else if (r < 0.60) { out.flower.push({ x: px, z: pz, y, s, rot }); if (r < 0.515) out.butterfly.push({ x: px, z: pz, y: y + 0.6, s, rot }); }
    } else if (kind === 'moeras') {
      if (r < 0.22) out.reed.push({ x: px, z: pz, y, s, rot });                        // the swamp is full of reeds
      else if (r < 0.26 && free(px, pz, 1.4)) out.tree2.push({ x: px, z: pz, y, s: s * 0.8, rot });
      else if (r < 0.30) out.bush2.push({ x: px, z: pz, y, s, rot });               // swamp berries
    } else if (kind === 'rock' || kind === 'snow') {
      if (r < 0.22 && free(px, pz, 0)) out[r < 0.1 ? 'rock2' : 'rock3'].push({ x: px, z: pz, y, s: s * (0.8 + rand() * 0.8), rot });
    } else if (kind === 'beach') {
      if (nearLake > -0.5 && nearLake < 1.8 && r < 0.5) out.reed.push({ x: px, z: pz, y, s, rot });
      else if (r < 0.05 && free(px, pz, 1.0)) out.rock1.push({ x: px, z: pz, y, s: s * 0.6, rot });
      else if (r < 0.19 && free(px, pz, 0.6)) out.shell.push({ x: px, z: pz, y, s, rot });   // shells to pick up (R3)
      else if (r < 0.215 && free(px, pz, 0.6)) out.crab.push({ x: px, z: pz, y, s: s * 0.8, rot });   // crabs that scuttle
    }
  }
  return out;
}

