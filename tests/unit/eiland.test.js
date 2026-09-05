// The Avontuureiland as numbers (V6.2: 480 × 480 m in 8 × 8 tiles of 60 m): the heightmap has sea all round, a flat
// camp, a lake, a snowy mountain, a swamp, a ruin and walkable sand paths; the forest never grows on paths, in the camp or in the water; the day cycle is 6 min day + 3 min night.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHeightmap, CAMP, PIER, LAKE, HILL, CAVE, PATHS, MAP, MOERAS, RUINE, caveInner } from '../../docs/js/3d/heightmap.js';
import { placeForest, KINDS } from '../../docs/js/3d/forest-place.js';
import { phaseAt, paletteAt, darknessAt, DAY_END, CYCLE } from '../../docs/js/3d/daycycle.js';
import { createPlayer, stepPlayer, createGrid, MAX_RISE } from '../../docs/js/3d/player.js';

const map = createHeightmap();

test('the island is surrounded by sea and its landmarks are where the plan puts them', () => {
  assert.equal(MAP.size, 480);
  assert.equal(MAP.tiles * MAP.tile, MAP.size);
  for (const [x, z] of [[4, 240], [240, 4], [476, 240], [240, 476], [8, 8], [470, 470]]) assert.equal(map.kindAt(x, z), 'sea', `sea at ${x},${z}`);
  assert.ok(Math.abs(map.heightAt(CAMP.x, CAMP.z) - 1.3) < 0.2, 'the camp is a flat shelf at ≈ 1.3 m');
  assert.equal(map.kindAt(CAMP.x, CAMP.z), 'grass');
  assert.equal(map.kindAt(LAKE.x, LAKE.z), 'lake');
  assert.ok(map.heightAt(LAKE.x, LAKE.z) < LAKE.level, 'the lake bed lies under its water level');
  assert.ok(map.heightAt(LAKE.x, LAKE.z) > 0, 'the lake is above the sea');
  assert.ok(map.heightAt(HILL.x, HILL.z) > HILL.top * 0.8, 'the hill is high');
  assert.equal(map.kindAt(HILL.x, HILL.z), 'snow');
  assert.ok(Math.abs(map.heightAt(CAVE.x, CAVE.z) - CAVE.floor) < 0.3, 'the cave mouth is a flat shelf');
  assert.equal(map.kindAt(MOERAS.x, MOERAS.z), 'moeras', 'the swamp is wet ground');
  assert.ok(map.walkable(MOERAS.x, MOERAS.z), 'you can wade through the swamp');
  assert.ok(Math.abs(map.heightAt(RUINE.x, RUINE.z) - 2.2) < 0.3 && map.kindAt(RUINE.x, RUINE.z) === 'grass', 'the ruin stands on a flat shelf');
  assert.equal(map.kindAt(PIER.x, PIER.z), 'sea', 'the pier stands in the water');
  assert.ok(map.onPier(PIER.x, PIER.z - 2) && map.walkable(PIER.x, PIER.z - 2), 'you can stand on the pier');
  assert.equal(map.groundAt(PIER.x, PIER.z - 2), PIER.deck);
  assert.ok(!map.walkable(PIER.x + 3, PIER.z - 2), 'next to the pier is water');
});

test('paths are walkable sand from the pier to the camp, the lake and the cave', () => {
  for (const path of PATHS) for (const [x, z] of path) {
    assert.ok(map.walkable(x, z), `walkable at ${x},${z}`);
    assert.ok(['path', 'beach', 'grass', 'cave', 'moeras'].includes(map.kindAt(x, z)), `${map.kindAt(x, z)} at ${x},${z}`);   // the cave path ends in the mouth, the swamp path at its edge
  }
  // walking the pier path: every half metre the ground rises less than a step
  const [[x0, z0], , [x1, z1]] = PATHS[0];
  let prev = map.groundAt(x0, z0);
  for (let z = z0; z >= z1; z -= 0.5) { const g = map.groundAt(x0, z); assert.ok(g - prev < MAX_RISE, `rise ${g - prev} at z ${z}`); prev = g; }
  assert.equal(x0, x1);
});

test('the cave is a flat bent tunnel into the hill ending in a chamber: walkable inside, rock beside it, the chest at the far side', () => {
  for (const t of [0, 1, 2, 3, 4.5, 6, 8, CAVE.depth, CAVE.chestAt]) {
    const p = caveInner(t);
    assert.equal(map.kindAt(p.x, p.z), 'cave', `cave at ${t} m`);
    assert.ok(map.walkable(p.x, p.z));
    assert.ok(Math.abs(map.heightAt(p.x, p.z) - CAVE.floor) < 0.06, `flat floor at ${t} m: ${map.heightAt(p.x, p.z)}`);
  }
  assert.equal(CAVE.path.length, 3, 'one bend');
  const mid = caveInner(2.5);
  const side = { x: mid.x + Math.cos(CAVE.heading) * 3.2, z: mid.z - Math.sin(CAVE.heading) * 3.2 };
  assert.ok(map.heightAt(side.x, side.z) > CAVE.floor + 2, 'the hill rises beside the first leg');
  const ch = CAVE.chamber;
  assert.ok(map.inChamber(ch.x, ch.z) && map.walkable(ch.x, ch.z));
  assert.ok(map.heightAt(ch.x + ch.r + 2.5, ch.z + 1) > CAVE.floor + 2 || map.heightAt(ch.x - ch.r - 2.5, ch.z) > CAVE.floor + 2, 'rock round the chamber');
  const chest = caveInner(CAVE.chestAt);
  assert.ok(map.inChamber(chest.x, chest.z), 'the chest stands in the chamber');
  // the tunnel leads towards the hill top, so the mouth faces away from it
  const inner = caveInner(CAVE.depth), hill = Math.hypot(inner.x - HILL.x, inner.z - HILL.z), mouth = Math.hypot(CAVE.x - HILL.x, CAVE.z - HILL.z);
  assert.ok(hill < mouth);
});

test('heightAt is continuous (bilinear), deterministic and the same across tile borders', () => {
  const a = map.heightAt(240.2, 350.7), b = map.heightAt(240.25, 350.7);
  assert.ok(Math.abs(a - b) < 0.2);
  assert.equal(createHeightmap().heightAt(240.2, 350.7), a);
  // a tile border (x = 240 is the edge between tiles 3 and 4): no seam
  const left = map.heightAt(239.999, 350.5), right = map.heightAt(240.001, 350.5);
  assert.ok(Math.abs(left - right) < 0.05, `seam ${left} vs ${right}`);
  assert.deepEqual(map.tileOf(239.9, 350), [3, 5]);
  assert.deepEqual(map.tileOf(240.1, 350), [4, 5]);
  assert.equal(map.tileHeights(4, 5).length, (MAP.tile + 1) * (MAP.tile + 1));
});

test('the forest grows on grass only, never on paths, in the camp, on the pier or in the water', () => {
  // the tiles round the camp (3 × 3 of 60 m = what the player sees at once), merged
  const f = Object.fromEntries(KINDS.map((k) => [k, []]));
  for (let tz = 4; tz <= 6; tz++) for (let tx = 3; tx <= 5; tx++) {
    const part = placeForest(map, 7, { x0: tx * MAP.tile, z0: tz * MAP.tile, x1: (tx + 1) * MAP.tile, z1: (tz + 1) * MAP.tile });
    for (const k of KINDS) f[k].push(...part[k]);
  }
  const total = KINDS.reduce((n, k) => n + f[k].length, 0);
  assert.ok(total > 3000 && total < 40000, `${total} things`);
  assert.ok(f.tree1.length + f.tree2.length > 800, `${f.tree1.length + f.tree2.length} trees`);
  for (const k of ['tree1', 'tree2', 'tree3', 'log', 'bush1', 'bush2', 'grass', 'flower', 'butterfly']) for (const it of f[k]) {
    const kind = map.kindAt(it.x, it.z);
    assert.ok(kind === 'grass' || ((k === 'tree2' || k === 'bush2') && kind === 'moeras'), `${k} on ${kind}`);
  }
  for (const it of f.crab) assert.equal(map.kindAt(it.x, it.z), 'beach', 'crabs live on the beach');
  for (const it of f.reed) assert.ok(map.walkable(it.x, it.z) && (Math.hypot(it.x - LAKE.x, it.z - LAKE.z) < LAKE.r + 2 || map.kindAt(it.x, it.z) === 'moeras'), 'reeds ring the lake or stand in the swamp');
  for (const it of f.tree2) if (map.kindAt(it.x, it.z) === 'moeras') assert.ok(true);
  assert.ok(f.tree3.length >= 3 && f.log.length >= 3 && f.reed.length >= 10 && f.crab.length >= 5 && f.butterfly.length >= 5, `tree3 ${f.tree3.length} log ${f.log.length} reed ${f.reed.length} crab ${f.crab.length} fly ${f.butterfly.length}`);
  for (const k of ['tree1', 'tree2', 'tree3']) for (const it of f[k]) {
    assert.ok(Math.hypot(it.x - CAMP.x, it.z - CAMP.z) > CAMP.r + 1.5, 'tree in the camp');
    assert.ok(!(Math.abs(it.x - PIER.x) < 3 && it.z > PIER.z - PIER.len - 3), 'tree at the pier');
  }
  const tile = { x0: 180, z0: 240, x1: 240, z1: 300 };
  assert.deepEqual(placeForest(map, 7, tile).tree1[0], placeForest(map, 7, tile).tree1[0], 'deterministic');
  for (const it of placeForest(map, 7, tile).tree1) assert.ok(it.x >= tile.x0 && it.x < tile.x1 && it.z >= tile.z0 && it.z < tile.z1, 'inside its tile');
});

test('day and night: 6 min day, 3 min night, dark palette at night', () => {
  assert.equal(CYCLE.dayMs + CYCLE.nightMs, 9 * 60 * 1000);
  assert.ok(Math.abs(DAY_END - 2 / 3) < 1e-9);
  assert.equal(phaseAt(0), 0);
  assert.ok(Math.abs(phaseAt(4.5 * 60 * 1000) - 0.5) < 1e-9);
  assert.equal(darknessAt(0.3), 0);
  assert.equal(darknessAt(0.85), 1);
  const noon = paletteAt(0.4), night = paletteAt(0.85);
  assert.ok(noon.sunI > 2 && night.sunI < 0.5);
  assert.ok(noon.sunElev > 0.5 && night.sunElev < 0);
  assert.ok(night.darkness === 1 && noon.darkness === 0);
  assert.match(night.sky, /^#[0-9a-f]{6}$/);
});

test('walking on the island: the sea and the snow stop you, cliffs are too steep, trees are found through the grid', () => {
  const env = { yaw: Math.PI, near: createGrid([{ x: CAMP.x, z: CAMP.z - 3, r: 0.5 }]), walkable: map.walkable, groundAt: map.groundAt };
  // from the pier onto the island: the ground under the feet follows the terrain
  const p = createPlayer(PIER.x, PIER.z - 2, Math.PI);
  p.ground = map.groundAt(p.x, p.z);
  for (let t = 0; t < 12; t += 1 / 60) stepPlayer(p, { x: 0, y: 1 }, 1 / 60, env);
  assert.ok(p.z < PIER.z - PIER.len - 4, `walked onto the island: z ${p.z}`);
  assert.ok(Math.abs(p.ground - map.groundAt(p.x, p.z)) < 1e-9);
  assert.ok(map.walkable(p.x, p.z));
  // into the sea from the beach: blocked at the water's edge
  const q = createPlayer(260, 408, 0);
  q.ground = map.groundAt(q.x, q.z);
  for (let t = 0; t < 6; t += 1 / 60) stepPlayer(q, { x: 0, y: -1 }, 1 / 60, env);   // south, towards the sea (yaw π ⇒ -y = +z)
  assert.ok(map.walkable(q.x, q.z), `still on land at ${q.x.toFixed(1)},${q.z.toFixed(1)} (${map.kindAt(q.x, q.z)})`);
  // the snow top is off limits
  const s = createPlayer(HILL.x, HILL.z + 70, 0);
  s.ground = map.groundAt(s.x, s.z);
  for (let t = 0; t < 30; t += 1 / 60) stepPlayer(s, { x: 0, y: 1 }, 1 / 60, { ...env, yaw: Math.PI });
  assert.notEqual(map.kindAt(s.x, s.z), 'snow');
  // the tree in the grid blocks
  const w = createPlayer(CAMP.x, CAMP.z, Math.PI);
  w.ground = map.groundAt(w.x, w.z);
  for (let t = 0; t < 3; t += 1 / 60) stepPlayer(w, { x: 0, y: 1 }, 1 / 60, env);
  assert.ok(Math.hypot(w.x - CAMP.x, w.z - (CAMP.z - 3)) >= 0.5 + 0.36 - 1e-6);
});
