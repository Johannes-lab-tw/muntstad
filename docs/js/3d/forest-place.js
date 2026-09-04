// 3d/forest-place.js — where the forest grows, as pure numbers (no Three.js; unit-tested): a jittered grid over
// the island, trees in the noise clumps on the grass, bushes, rocks, grass tufts and flowers elsewhere; nothing on
// paths, in the camp, at the cave or on the pier. placeForest(map, seed) → { tree1: [{ x, z, y, s, rot }], ... }
import { fbm, distToPaths, CAMP, CAVE, PIER } from './heightmap.js';

export const KINDS = ['tree1', 'tree2', 'bush1', 'bush2', 'rock1', 'rock2', 'rock3', 'grass', 'flower', 'shell'];

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Deterministic placements per kind: [{ x, z, y, s, rot }]. Nothing on paths, in the camp, at the cave or the pier. */
export function placeForest(map, seed = 7) {
  const rand = rng(seed);
  const out = Object.fromEntries(KINDS.map((k) => [k, []]));
  const free = (x, z, margin) => {
    if (distToPaths(x, z) < margin) return false;
    if (Math.hypot(x - CAMP.x, z - CAMP.z) < CAMP.r + margin) return false;
    if (Math.hypot(x - CAVE.x, z - CAVE.z) < 3.5 + margin) return false;
    if (Math.abs(x - PIER.x) < 3 + margin && z > PIER.z - PIER.len - 3) return false;
    return true;
  };
  const step = 1.15;
  for (let z = 2; z < map.size - 2; z += step) for (let x = 2; x < map.size - 2; x += step) {
    const px = x + (rand() - 0.5) * step * 0.9, pz = z + (rand() - 0.5) * step * 0.9;
    const kind = map.kindAt(px, pz);
    const y = map.heightAt(px, pz);
    const rot = rand() * Math.PI * 2;
    const s = 0.9 + rand() * 0.2;
    const r = rand();
    if (kind === 'grass') {
      const clump = fbm(px / 11, pz / 11, 21);           // forest where the clump noise is high
      if (clump > 0.52 && free(px, pz, 1.8)) {
        out[r < 0.55 ? 'tree1' : 'tree2'].push({ x: px, z: pz, y, s: s * (0.9 + clump * 0.4), rot });
      } else if (r < 0.10 && free(px, pz, 1.2)) out[r < 0.05 ? 'bush1' : 'bush2'].push({ x: px, z: pz, y, s, rot });
      else if (r < 0.14 && free(px, pz, 1.0)) out.rock1.push({ x: px, z: pz, y, s: s * 0.8, rot });
      else if (r < 0.50) out.grass.push({ x: px, z: pz, y, s, rot });
      else if (r < 0.60) out.flower.push({ x: px, z: pz, y, s, rot });
    } else if (kind === 'rock' || kind === 'snow') {
      if (r < 0.22) out[r < 0.1 ? 'rock2' : 'rock3'].push({ x: px, z: pz, y, s: s * (0.8 + rand() * 0.8), rot });
    } else if (kind === 'beach') {
      if (r < 0.05 && free(px, pz, 1.0)) out.rock1.push({ x: px, z: pz, y, s: s * 0.6, rot });
      else if (r < 0.19 && free(px, pz, 0.6)) out.shell.push({ x: px, z: pz, y, s, rot });   // shells to pick up (R3)
    }
  }
  return out;
}

