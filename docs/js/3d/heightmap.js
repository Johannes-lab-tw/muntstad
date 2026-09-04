// 3d/heightmap.js — the Avontuureiland as numbers (no Three.js: shared by the mesh, the walking code and the unit
// tests). A grid of heights out of value noise plus hand-drawn shapes: a sandy rim all round, a lake, a hill ridge
// with a cave, and sand paths from the pier to the camp, the lake and the hill. Sea level is y = 0.
// createHeightmap() → { size, n, cell, h, heightAt(x, z), kindAt(x, z), CAMP, PIER, LAKE, HILL, CAVE, PATHS }

export const MAP = Object.freeze({ size: 96, n: 192 });   // 96 × 96 m, half-metre cells

export const CAMP = Object.freeze({ x: 48, z: 52, r: 8 });     // the campfire, centre of everything
export const PIER = Object.freeze({ x: 48, z: 86, len: 8, w: 2.4, deck: 0.55 });   // south beach, planks over the water, boat to the village
export const LAKE = Object.freeze({ x: 68, z: 34, r: 8.5, level: 0.7 });
export const HILL = Object.freeze({ x: 30, z: 26, r: 22, top: 13 });
// the cave: its mouth on the hill's south-east flank, a flat tunnel `depth` metres into the hill (towards HILL),
// a chest at the end. heading = the direction the mouth faces (local +z of the model); the tunnel runs the other way.
export const CAVE = Object.freeze({ x: 39.5, z: 37.5, heading: Math.atan2(39.5 - 30, 37.5 - 26), depth: 5.5, halfWidth: 1.6, floor: 2.2, chestAt: 4.3 });
/** A point `t` metres into the tunnel from the mouth. */
export function caveInner(t) {
  return { x: CAVE.x - Math.sin(CAVE.heading) * t, z: CAVE.z - Math.cos(CAVE.heading) * t };
}
export function inCave(x, z, margin = 0) {
  const end = caveInner(CAVE.depth);
  return distToPath(x, z, [[CAVE.x + Math.sin(CAVE.heading) * 0.5, CAVE.z + Math.cos(CAVE.heading) * 0.5], [end.x, end.z]]) < CAVE.halfWidth + margin;
}
export const PATHS = Object.freeze([
  [[48, 79], [48, 72], [48, 58]],              // pier (land end) → camp
  [[52, 48], [57, 44], [61, 41]],              // camp → lake shore
  [[45, 46], [42, 41], [40, 39]],              // camp → cave
  [[44, 56], [30, 62], [18, 60]],              // camp → west beach
]);

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
  return v / sum;   // 0..1
}
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Distance from (x, z) to a polyline. */
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

/** Raw height before smoothing, in metres. */
export function baseHeight(x, z) {
  const { size } = MAP;
  const cx = size / 2, cz = size / 2;
  // island silhouette: a wobbly disc, land above 0 inside, sea outside
  const ang = Math.atan2(z - cz, x - cx);
  const wobble = 1 + (noise2(Math.cos(ang) * 2 + 5, Math.sin(ang) * 2 + 5, 11) - 0.5) * 0.28;
  const rr = Math.hypot(x - cx, z - cz) / (size * 0.46 * wobble);
  let h = (1 - smoothstep(0.62, 1.0, rr)) * 1.6 - 0.9;          // -0.9 in the sea, 0.7 on the shore plateau
  // rolling grass
  h += (fbm(x / 14, z / 14, 3) - 0.35) * 2.6 * (1 - smoothstep(0.7, 0.95, rr));
  // the hill ridge with a rocky top
  const dh = Math.hypot(x - HILL.x, z - HILL.z) / HILL.r;
  h += (1 - smoothstep(0.15, 1.0, dh)) * HILL.top * (0.8 + fbm(x / 9, z / 9, 5) * 0.4);
  // the lake bowl
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z) / LAKE.r;
  h = h * smoothstep(0.7, 1.15, dl) + (LAKE.level - 0.45) * (1 - smoothstep(0.7, 1.15, dl));
  // the camp is flat
  const dc = Math.hypot(x - CAMP.x, z - CAMP.z) / CAMP.r;
  h = h * smoothstep(0.55, 1.1, dc) + 1.3 * (1 - smoothstep(0.55, 1.1, dc));
  // the cave: a flat shelf at the mouth and a flat tunnel floor cut into the hill
  const dv = Math.hypot(x - CAVE.x, z - CAVE.z);
  h = h * smoothstep(1.6, 3.6, dv) + CAVE.floor * (1 - smoothstep(1.6, 3.6, dv));
  const end = caveInner(CAVE.depth);
  const dtun = distToPath(x, z, [[CAVE.x, CAVE.z], [end.x, end.z]]);
  if (dtun < CAVE.halfWidth + 1.2) h = h * smoothstep(CAVE.halfWidth, CAVE.halfWidth + 1.2, dtun) + CAVE.floor * (1 - smoothstep(CAVE.halfWidth, CAVE.halfWidth + 1.2, dtun));
  // paths are gently levelled (keeps them walkable)
  const dp = distToPaths(x, z);
  if (dp < 2.4) {
    const flat = Math.max(0.35, h);
    h = h + (flat - h) * (1 - smoothstep(1.0, 2.4, dp)) * 0.5;
  }
  return h;
}

export function createHeightmap() {
  const { size, n } = MAP;
  const cell = size / n;
  const h = new Float32Array((n + 1) * (n + 1));
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) h[j * (n + 1) + i] = baseHeight(i * cell, j * cell);
  // one smoothing pass takes the grid look off the noise
  const s = new Float32Array(h);
  for (let j = 1; j < n; j++) for (let i = 1; i < n; i++) {
    const k = j * (n + 1) + i;
    s[k] = (h[k] * 4 + h[k - 1] + h[k + 1] + h[k - (n + 1)] + h[k + (n + 1)]) / 8;
  }
  const at = (i, j) => s[Math.min(n, Math.max(0, j)) * (n + 1) + Math.min(n, Math.max(0, i))];
  function heightAt(x, z) {
    const gx = x / cell, gz = z / cell;
    const i = Math.floor(gx), j = Math.floor(gz);
    const fx = gx - i, fz = gz - j;
    const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
    return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fz;
  }
  function slopeAt(x, z) {
    const e = 0.5;
    return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
  }
  /** 'sea' | 'lake' | 'beach' | 'path' | 'grass' | 'rock' | 'snow' */
  function kindAt(x, z) {
    const y = heightAt(x, z);
    if (y < 0.05) return 'sea';
    if (inCave(x, z)) return 'cave';
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r * 0.95 && y < LAKE.level) return 'lake';
    if (y > HILL.top * 0.82) return 'snow';
    if (slopeAt(x, z) > 0.9 || y > HILL.top * 0.55) return 'rock';
    if (y < 0.45) return 'beach';
    if (distToPaths(x, z) < 1.3) return 'path';
    return 'grass';
  }
  const onPier = (x, z) => Math.abs(x - PIER.x) <= PIER.w / 2 && z >= PIER.z - PIER.len && z <= PIER.z + 0.6;
  /** Height of what you stand on: the terrain, or the pier deck over the water. */
  const groundAt = (x, z) => (onPier(x, z) ? PIER.deck : heightAt(x, z));
  const walkable = (x, z) => {
    if (x < 1 || z < 1 || x > size - 1 || z > size - 1) return false;
    if (onPier(x, z)) return true;
    const k = kindAt(x, z);
    return k !== 'sea' && k !== 'lake' && k !== 'snow';
  };
  return { size, n, cell, h: s, heightAt, groundAt, slopeAt, kindAt, walkable, onPier, inCave, CAMP, PIER, LAKE, HILL, CAVE, PATHS };
}
