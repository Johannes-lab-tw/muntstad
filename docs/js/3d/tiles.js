// 3d/tiles.js — the island in tiles (V6.2). Only the tiles round the player exist: each one has its terrain mesh,
// its forest (InstancedMesh per kind) and its obstacles, shells and berry bushes. Tiles load one per frame as you
// walk and are dropped again when far away, so a 480 × 480 m island costs no more than a 96 × 96 m one did.
// createTiles(map, { statics }) → { group, update(px, pz), near(x, z), nearShells(x, z), nearBushes(x, z),
//   meshesOf(kind), setPose(item, scale, tilt, yaw), animate(now, dt, darkness), setLite(lite), count, loaded }
import * as T from '../../vendor/three.module.min.js';
import { tileTerrain } from './terrain.js';
import { placeForest, buildForest } from './forest.js';
import { createGrid } from './player.js';

const RING = 1;          // tiles kept around the player's tile (1 = 3 × 3)
const PREFETCH = 2;      // tiles prepared (not yet shown) further out

export function createTiles(map, { statics = [], isLite = () => false } = {}) {
  const group = new T.Group();
  const tiles = new Map();   // key → { tx, tz, group, terrain, forest, obstacles, shells, bushes }
  let near = createGrid(statics, 4), nearShells = createGrid([], 4), nearBushes = createGrid([], 4);
  let lite = false;
  let dirty = false;
  const queue = [];

  function build(tx, tz) {
    const key = map.tileKey(tx, tz);
    if (tiles.has(key)) return tiles.get(key);
    const bounds = { x0: tx * map.tile, z0: tz * map.tile, x1: (tx + 1) * map.tile, z1: (tz + 1) * map.tile };
    const g = new T.Group();
    const terrain = tileTerrain(map, bounds, isLite() ? 1.0 : 0.5);
    g.add(terrain);
    const placements = placeForest(map, 7, bounds);
    const forest = buildForest(placements);
    g.add(forest.group);
    for (const o of forest.obstacles) o.tile = key;
    const shells = placements.shell.map((s, index) => ({ ...s, index, tile: key, kind: 'shell', r: 0.3, taken: false }));
    const bushes = placements.bush2.map((b, index) => ({ ...b, index, tile: key, kind: 'bush2', r: 0.5, restUntil: 0 }));
    for (const k of Object.keys(forest.meshes)) forest.meshes[k].userData = { tile: key, kind: k };
    if (lite) for (const k of ['grass', 'flower']) if (forest.meshes[k]) forest.meshes[k].visible = false;
    const t = { key, tx, tz, group: g, terrain, forest, obstacles: forest.obstacles, shells, bushes, shown: false };
    tiles.set(key, t);
    return t;
  }
  function show(t) { if (!t.shown) { group.add(t.group); t.shown = true; dirty = true; } }
  function drop(t) {
    if (t.shown) group.remove(t.group);
    t.terrain.geometry.dispose();
    for (const m of Object.values(t.forest.meshes)) { m.geometry.dispose(); m.dispose(); }
    tiles.delete(t.key);
    dirty = true;
  }
  function rebuildGrids() {
    const obs = [...statics], sh = [], bu = [];
    for (const t of tiles.values()) { if (!t.shown) continue; for (const o of t.obstacles) obs.push(o); for (const s of t.shells) sh.push(s); for (const b of t.bushes) bu.push(b); }
    near = createGrid(obs, 4);
    nearShells = createGrid(sh, 4);
    nearBushes = createGrid(bu, 4);
    dirty = false;
  }

  /** Called every frame with the player's position: keeps the 3 × 3 tiles round the player shown, one new tile per call. */
  function update(px, pz) {
    const [ptx, ptz] = map.tileOf(Math.min(map.size - 1, Math.max(0, px)), Math.min(map.size - 1, Math.max(0, pz)));
    // drop tiles beyond the prefetch ring
    for (const t of [...tiles.values()]) if (Math.max(Math.abs(t.tx - ptx), Math.abs(t.tz - ptz)) > PREFETCH) drop(t);
    // show what is within the ring (build the nearest missing one, one per call)
    let built = false;
    for (let dz = -RING; dz <= RING; dz++) for (let dx = -RING; dx <= RING; dx++) {
      const tx = ptx + dx, tz = ptz + dz;
      if (tx < 0 || tz < 0 || tx >= map.tiles || tz >= map.tiles) continue;
      const key = map.tileKey(tx, tz);
      let t = tiles.get(key);
      if (!t) { if (built) continue; t = build(tx, tz); built = true; }
      show(t);
    }
    // prefetch one tile further out when nothing else was built this frame
    if (!built) {
      outer: for (let dz = -PREFETCH; dz <= PREFETCH; dz++) for (let dx = -PREFETCH; dx <= PREFETCH; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) <= RING) continue;
        const tx = ptx + dx, tz = ptz + dz;
        if (tx < 0 || tz < 0 || tx >= map.tiles || tz >= map.tiles) continue;
        if (!tiles.has(map.tileKey(tx, tz))) { build(tx, tz); break outer; }
      }
    }
    if (dirty) rebuildGrids();
  }
  /** Build everything within the ring at once (prebuild, and after a teleport: the ground must exist this frame). */
  function warm(px, pz) { for (let i = 0; i < 9; i++) update(px, pz); }

  function meshesOf(kind) {
    const out = [];
    for (const t of tiles.values()) if (t.shown && t.forest.meshes[kind]) out.push(t.forest.meshes[kind]);
    return out;
  }
  function tileOfItem(it) { return tiles.get(it.tile); }
  /** The shell / bush / obstacle behind an instance (tap on the world). */
  function find(tileKey, kind, index) {
    const t = tiles.get(tileKey);
    if (!t) return null;
    if (kind === 'shell') return t.shells[index] || null;
    if (kind === 'bush2') return t.bushes[index] || null;
    return t.obstacles.find((o) => o.kind === kind && o.index === index) || null;
  }
  function setPose(it, scale, tilt = 0, yaw = null) { const t = tileOfItem(it); if (t) t.forest.setPose(it.kind, it.index, scale, tilt, yaw); }
  function setScale(it, scale) { setPose(it, scale); }
  function animate(now, dt, darkness) { for (const t of tiles.values()) if (t.shown) t.forest.animate(now, dt, darkness); }
  function setLite(v) {
    lite = v;
    for (const t of tiles.values()) for (const k of ['grass', 'flower']) if (t.forest.meshes[k]) t.forest.meshes[k].visible = !v;
  }
  /** Every obstacle of a kind among the shown tiles (tests, the nearest-tree hook). */
  function allObstacles() { const out = []; for (const t of tiles.values()) if (t.shown) for (const o of t.obstacles) out.push(o); return out; }
  function allShells() { const out = []; for (const t of tiles.values()) if (t.shown) for (const s of t.shells) out.push(s); return out; }
  function allBushes() { const out = []; for (const t of tiles.values()) if (t.shown) for (const b of t.bushes) out.push(b); return out; }

  return {
    group, update, warm, meshesOf, setPose, setScale, animate, setLite, allObstacles, allShells, allBushes, find,
    near: (x, z) => near(x, z), nearShells: (x, z) => nearShells(x, z), nearBushes: (x, z) => nearBushes(x, z),
    setStatics(list) { statics = list; dirty = true; rebuildGrids(); },
    get count() { let n = 0; for (const t of tiles.values()) if (t.shown) n += t.obstacles.length + t.shells.length + t.bushes.length; return n; },
    get loaded() { return [...tiles.values()].filter((t) => t.shown).map((t) => t.key); },
  };
}
