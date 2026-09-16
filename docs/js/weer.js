// weer.js — the weather of the island, pure (V8.2, PLAN-V8 §B). One kind per day, decided from the day number and a
// seed per save, so every device in a SAMEN room agrees and the tests can pick a day. Rules (config.weer): never a
// storm before `eersteStormDag`, a storm only on one day in `stormElke` (and then half the time), rain one day in five.
// Rain makes the fire eat twice the wood, a storm three times; an afdak (a roof over the fire) keeps it dry.

export const WEER = Object.freeze({
  zon:     { icon: '☀️', gloom: 0,    rain: 0,   wind: 0 },
  bewolkt: { icon: '⛅', gloom: 0.18, rain: 0,   wind: 0.2 },
  regen:   { icon: '🌧️', gloom: 0.4,  rain: 0.6, wind: 0.4 },
  storm:   { icon: '⛈️', gloom: 0.62, rain: 1,   wind: 1 },
});
export const SOORTEN = Object.keys(WEER);

/** A small deterministic hash → [0, 1). */
export function hash(day, seed = 0) {
  let h = (day * 374761393 + seed * 668265263 + 1013904223) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** The weather of day `day` (0 = the first day) for a save with `seed`. */
export function weerVoorDag(day, seed = 0, cfg = {}) {
  const first = cfg.eersteStormDag ?? 3, every = cfg.stormElke ?? 4;
  const d = Math.max(0, Math.floor(day || 0)), s = Math.floor(seed || 0);
  const r = hash(d, s);
  if (d >= first && d % every === s % every && r < 0.5) return 'storm';
  if (r < 0.2) return 'regen';
  if (r < 0.5) return 'bewolkt';
  return 'zon';
}

/** How much faster the fire burns in this weather; the afdak keeps it dry. */
export function burnMul(weer, afdak = false, cfg = {}) {
  if (afdak) return 1;
  if (weer === 'storm') return cfg.stormMul ?? 3;
  if (weer === 'regen') return cfg.regenMul ?? 2;
  return 1;
}

/** The seed of a save: the moment it was created, folded small. */
export function seedOf(state) {
  return Math.floor(((state && state.createdAt) || 0) / 1000) % 997;
}
