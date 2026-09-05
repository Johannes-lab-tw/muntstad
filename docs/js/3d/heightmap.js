// 3d/heightmap.js — the Avontuureiland as numbers (no Three.js: shared by the tiles, the walking code and the unit
// tests). V6.2: five times bigger (480 × 480 m), heights are analytic (noise plus hand-drawn shapes) and cached per
// tile at one-metre cells, so any point can be asked for without building the whole island first.
// Landmarks: the camp in the middle, the pier on the south beach, the lake, the mountain with snow and the cave, the
// swamp in the east, the ruin in the west. Sea level is y = 0.
// createHeightmap() → { size, tile, heightAt, groundAt, slopeAt, kindAt, walkable, onPier, inCave, inChamber, tileKey, … }

export const MAP = Object.freeze({ size: 480, tile: 60, tiles: 8 });   // 8 × 8 tiles of 60 m

export const CAMP = Object.freeze({ x: 240, z: 300, r: 12 });                    // the campfire, centre of everything
export const PIER = Object.freeze({ x: 240, z: 424, len: 8, w: 2.4, deck: 0.55 }); // south beach (shore at z ≈ 416), planks over the water
export const LAKE = Object.freeze({ x: 330, z: 205, r: 24, level: 0.7 });
export const HILL = Object.freeze({ x: 150, z: 135, r: 95, top: 42 });           // the mountain, snow on top
export const MOERAS = Object.freeze({ x: 360, z: 330, r: 48 });                  // the swamp: wet, slow, misty
export const RUINE = Object.freeze({ x: 120, z: 345, r: 22 });                   // the ruined village (chests, wolves)
export const VUURTOREN = Object.freeze({ x: 280, z: 68, r: 13, top: 7 });         // V6.5: the lighthouse rock on the north coast
export const HUT = Object.freeze({ x: 302, z: 90, r: 5 });                        // the abandoned hut with the chest
export const PATHS = Object.freeze([
  [[240, 415], [240, 370], [240, 315]],             // pier (land end) → camp
  [[250, 292], [290, 250], [312, 222]],             // camp → lake shore
  [[232, 290], [205, 240], [192, 208]],             // camp → cave
  [[228, 300], [170, 330], [140, 345]],             // camp → ruin
  [[252, 306], [300, 330], [330, 335]],             // camp → swamp edge
  [[246, 288], [262, 200], [286, 110], [300, 96]],  // camp → the hut and the lighthouse (V6.5)
]);

// ---------- the cave: a bent tunnel into the mountain's south-east flank, ending in a round chamber ----------
const CAVE_MOUTH = [192, 205];
const CAVE_HEADING = Math.atan2(CAVE_MOUTH[0] - HILL.x, CAVE_MOUTH[1] - HILL.z);   // the mouth faces away from the top
const CAVE_BEND = CAVE_HEADING + 0.9;
const CAVE_L1 = 5.5, CAVE_L2 = 6.0;
const cp1 = [CAVE_MOUTH[0] - Math.sin(CAVE_HEADING) * CAVE_L1, CAVE_MOUTH[1] - Math.cos(CAVE_HEADING) * CAVE_L1];
const cp2 = [cp1[0] - Math.sin(CAVE_BEND) * CAVE_L2, cp1[1] - Math.cos(CAVE_BEND) * CAVE_L2];
export const CAVE = Object.freeze({
  x: CAVE_MOUTH[0], z: CAVE_MOUTH[1], heading: CAVE_HEADING, bend: CAVE_BEND, floor: 3.0, halfWidth: 1.7,
  path: Object.freeze([CAVE_MOUTH, cp1, cp2]), legs: Object.freeze([CAVE_L1, CAVE_L2]), depth: CAVE_L1 + CAVE_L2,
  chamber: Object.freeze({ x: cp2[0], z: cp2[1], r: 3.6 }), chestAt: CAVE_L1 + CAVE_L2 + 1.8,
});
export function caveInner(t) {
  const p = CAVE.path;
  let rest = t;
  for (let i = 0; i < p.length - 1; i++) {
    const [ax, az] = p[i], [bx, bz] = p[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    if (rest <= len || i === p.length - 2) { const f = rest / len; return { x: ax + (bx - ax) * f, z: az + (bz - az) * f }; }
    rest -= len;
  }
  return { x: p[p.length - 1][0], z: p[p.length - 1][1] };
}
export function inChamber(x, z, margin = 0) {
  return Math.hypot(x - CAVE.chamber.x, z - CAVE.chamber.z) < CAVE.chamber.r + margin;
}
export function inCave(x, z, margin = 0) {
  const [mx, mz] = CAVE.path[0];
  const start = [mx + Math.sin(CAVE.heading) * 0.5, mz + Math.cos(CAVE.heading) * 0.5];
  return distToPath(x, z, [start, ...CAVE.path.slice(1)]) < CAVE.halfWidth + margin || inChamber(x, z, margin);
}

// ---------- deterministic value noise ----------
function hash(ix, iz, seed) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function smooth(t) { return t * t * (3 - 2 * t); }
export function noise2(x, z, seed = 1) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = smooth(x - ix), fz = smooth(z - iz);
  const a = hash(ix, iz, seed), b = hash(ix + 1, iz, seed), c = hash(ix, iz + 1, seed), d = hash(ix + 1, iz + 1, seed);
  return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fz;
}
export function fbm(x, z, seed = 1, octaves = 3) {
  let v = 0, amp = 0.5, f = 1, sum = 0;
  for (let i = 0; i < octaves; i++) { v += noise2(x * f, z * f, seed + i * 7) * amp; sum += amp; amp *= 0.5; f *= 2.1; }
  return v / sum;
}
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function distToPath(x, z, path) {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i], [bx, bz] = path[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = clamp01(((x - ax) * dx + (z - az) * dz) / Math.max(1e-6, dx * dx + dz * dz));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}
export function distToPaths(x, z) {
  let d = Infinity;
  for (const p of PATHS) d = Math.min(d, distToPath(x, z, p));
  return d;
}

/** Raw height in metres, analytic: the same answer for the same point, always. */
export function baseHeight(x, z) {
  const { size } = MAP;
  const cx = size / 2, cz = size / 2;
  // island silhouette: a wobbly disc, land above 0 inside, sea outside
  const ang = Math.atan2(z - cz, x - cx);
  const wobble = 1 + (noise2(Math.cos(ang) * 2.5 + 5, Math.sin(ang) * 2.5 + 5, 11) - 0.5) * 0.3;
  const rr = Math.hypot(x - cx, z - cz) / (size * 0.46 * wobble);
  let h = (1 - smoothstep(0.62, 1.0, rr)) * 1.6 - 0.9;
  // rolling grass, larger waves for a larger island
  h += (fbm(x / 60, z / 60, 3) - 0.35) * 5.0 * (1 - smoothstep(0.7, 0.95, rr));
  h += (fbm(x / 14, z / 14, 4) - 0.5) * 1.2 * (1 - smoothstep(0.7, 0.95, rr));
  // the mountain
  const dh = Math.hypot(x - HILL.x, z - HILL.z) / HILL.r;
  h += (1 - smoothstep(0.12, 1.0, dh)) * HILL.top * (0.8 + fbm(x / 30, z / 30, 5) * 0.4);
  // the lake bowl
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z) / LAKE.r;
  h = h * smoothstep(0.7, 1.15, dl) + (LAKE.level - 0.45) * (1 - smoothstep(0.7, 1.15, dl));
  // the swamp: low, flat, wet
  const dm = Math.hypot(x - MOERAS.x, z - MOERAS.z) / MOERAS.r;
  h = h * smoothstep(0.75, 1.15, dm) + (0.35 + fbm(x / 8, z / 8, 9) * 0.25) * (1 - smoothstep(0.75, 1.15, dm));
  // the camp and the ruin are flat shelves
  const dc = Math.hypot(x - CAMP.x, z - CAMP.z) / CAMP.r;
  h = h * smoothstep(0.55, 1.1, dc) + 1.4 * (1 - smoothstep(0.55, 1.1, dc));
  const dr = Math.hypot(x - RUINE.x, z - RUINE.z) / RUINE.r;
  h = h * smoothstep(0.6, 1.1, dr) + 2.2 * (1 - smoothstep(0.6, 1.1, dr));
  // the lighthouse rock: a steep knob with a flat top, and the hut's shelf beside it (V6.5)
  const dvt = Math.hypot(x - VUURTOREN.x, z - VUURTOREN.z) / VUURTOREN.r;
  h = Math.max(h, (1 - smoothstep(0.45, 1.0, dvt)) * VUURTOREN.top + (dvt < 0.45 ? 0 : 0));
  const dhut = Math.hypot(x - HUT.x, z - HUT.z) / HUT.r;
  h = h * smoothstep(0.7, 1.2, dhut) + 2.4 * (1 - smoothstep(0.7, 1.2, dhut));
  // the cave: a flat shelf at the mouth and a flat tunnel floor cut into the mountain
  const dv = Math.hypot(x - CAVE.x, z - CAVE.z);
  h = h * smoothstep(1.6, 3.8, dv) + CAVE.floor * (1 - smoothstep(1.6, 3.8, dv));
  const dtun = Math.min(distToPath(x, z, CAVE.path), Math.hypot(x - CAVE.chamber.x, z - CAVE.chamber.z) - (CAVE.chamber.r - CAVE.halfWidth));
  if (dtun < CAVE.halfWidth + 1.2) h = h * smoothstep(CAVE.halfWidth, CAVE.halfWidth + 1.2, dtun) + CAVE.floor * (1 - smoothstep(CAVE.halfWidth, CAVE.halfWidth + 1.2, dtun));
  // paths are gently levelled (keeps them walkable)
  const dp = distToPaths(x, z);
  if (dp < 2.6) {
    const flat = Math.max(0.35, h);
    h = h + (flat - h) * (1 - smoothstep(1.2, 2.6, dp)) * 0.5;
  }
  return h;
}

export function createHeightmap() {
  const { size, tile } = MAP;
  const CELL = 1;                       // cached cell size in metres
  const N = tile / CELL;                // cells per tile side
  const cache = new Map();              // tileKey → Float32Array (N+1)²
  const tileKey = (tx, tz) => `${tx},${tz}`;
  const tileOf = (x, z) => [Math.floor(x / tile), Math.floor(z / tile)];
  function tileHeights(tx, tz) {
    const k = tileKey(tx, tz);
    let a = cache.get(k);
    if (a) return a;
    a = new Float32Array((N + 1) * (N + 1));
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) a[j * (N + 1) + i] = baseHeight(tx * tile + i * CELL, tz * tile + j * CELL);
    cache.set(k, a);
    return a;
  }
  /** Bilinear height from the per-tile cache (built on first use). Outside the map: the sea. */
  function heightAt(x, z) {
    if (x < 0 || z < 0 || x >= size || z >= size) return -0.9;
    const [tx, tz] = tileOf(x, z);
    const a = tileHeights(tx, tz);
    const gx = (x - tx * tile) / CELL, gz = (z - tz * tile) / CELL;
    const i = Math.min(N - 1, Math.floor(gx)), j = Math.min(N - 1, Math.floor(gz));
    const fx = gx - i, fz = gz - j;
    const h00 = a[j * (N + 1) + i], h10 = a[j * (N + 1) + i + 1], h01 = a[(j + 1) * (N + 1) + i], h11 = a[(j + 1) * (N + 1) + i + 1];
    return (h00 + (h10 - h00) * fx) + ((h01 + (h11 - h01) * fx) - (h00 + (h10 - h00) * fx)) * fz;
  }
  function slopeAt(x, z) {
    const e = 0.5;
    return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
  }
  /** 'sea' | 'lake' | 'moeras' | 'cave' | 'beach' | 'path' | 'grass' | 'rock' | 'snow' */
  function kindAt(x, z) {
    const y = heightAt(x, z);
    if (y < 0.05) return 'sea';
    if (inCave(x, z)) return 'cave';
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r * 0.95 && y < LAKE.level) return 'lake';
    if (Math.hypot(x - MOERAS.x, z - MOERAS.z) < MOERAS.r * 0.9) return 'moeras';
    if (y > HILL.top * 0.8) return 'snow';
    if (slopeAt(x, z) > 0.9 || y > HILL.top * 0.55) return 'rock';
    if (y < 0.45) return 'beach';
    if (distToPaths(x, z) < 1.4) return 'path';
    return 'grass';
  }
  const onPier = (x, z) => Math.abs(x - PIER.x) <= PIER.w / 2 && z >= PIER.z - PIER.len && z <= PIER.z + 0.6;
  const groundAt = (x, z) => (onPier(x, z) ? PIER.deck : heightAt(x, z));
  const walkable = (x, z) => {
    if (x < 1 || z < 1 || x > size - 1 || z > size - 1) return false;
    if (onPier(x, z)) return true;
    const k = kindAt(x, z);
    return k !== 'sea' && k !== 'lake' && k !== 'snow';
  };
  return {
    size, tile, tiles: MAP.tiles, cell: CELL, heightAt, groundAt, slopeAt, kindAt, walkable, onPier, inCave, inChamber, tileKey, tileOf, tileHeights,
    CAMP, PIER, LAKE, HILL, CAVE, MOERAS, RUINE, VUURTOREN, HUT, PATHS,
  };
}
