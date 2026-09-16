// schat.js — the treasure map (V8.3, PLAN-V8 §B): five map pieces lie under mounds of earth at the five far places of
// the island; with all five the map shows an X that moves every week; digging there (with the schep) pays coins and,
// the first time, the pirate hat. Pure: no DOM, no Three.js; the scene and the tests share it.
import { RUINE, MOERAS, HILL, HUT, CAVE } from './3d/heightmap.js';

/** The five places with a map piece and the mound to dig at (a few metres off the landmark). */
export const KAARTSTUKKEN = Object.freeze([
  { id: 'ruine',     x: RUINE.x + 4,  z: RUINE.z - 3,  naam: 'de ruïne' },
  { id: 'moeras',    x: MOERAS.x - 30, z: MOERAS.z - 24, naam: 'het moeras' },
  { id: 'berg',      x: HILL.x + 6,   z: HILL.z + 8,   naam: 'de bergtop' },
  { id: 'vuurtoren', x: HUT.x - 5,    z: HUT.z + 4,    naam: 'de vuurtorenhut' },
  { id: 'grot',      x: CAVE.x + 4,   z: CAVE.z + 6,   naam: 'de grot' },
]);
export const STUKKEN = KAARTSTUKKEN.map((k) => k.id);

/** Where the X can be: grassy spots between the landmarks; the week picks one. */
export const X_PLEKKEN = Object.freeze([
  { x: 200, z: 338 }, { x: 286, z: 346 }, { x: 182, z: 290 }, { x: 302, z: 278 }, { x: 250, z: 238 }, { x: 334, z: 262 },
]);

/** The week of `now` as a whole number (weeks since Monday 5 January 2026, local time). */
export function weekKey(now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const days = Math.round((d.getTime() - new Date(2026, 0, 5).getTime()) / 86400000);   // round: summer time shifts an hour
  return Math.floor(days / 7);
}

function hash(a, b) {
  let h = (a * 2654435761 + b * 40503 + 12345) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}

/** The X of this week for this save (index into X_PLEKKEN, with an offset so tests can ask for the next one). */
export function schatPlek(week, seed = 0, skip = 0) {
  return X_PLEKKEN[(hash(week, seed) + skip) % X_PLEKKEN.length];
}

export function kaartStukken(e) {
  return Array.isArray(e && e.kaart) ? e.kaart.filter((id) => STUKKEN.includes(id)) : [];
}
export function kaartCompleet(e) {
  return kaartStukken(e).length >= STUKKEN.length;
}

/** Dig at a map-piece mound. Returns { ok, state, over } (over = pieces still missing). */
export function vindKaartstuk(state, plek) {
  const e = state.eiland;
  const have = kaartStukken(e);
  if (!STUKKEN.includes(plek) || have.includes(plek)) return { ok: false, state, over: STUKKEN.length - have.length };
  const kaart = [...have, plek];
  return { ok: true, over: STUKKEN.length - kaart.length, state: { ...state, eiland: { ...e, kaart } } };
}

/** Dig at the X. Returns { ok, state, coins, hoed } (hoed = the pirate hat was just won). */
export function graafSchat(state, config, week) {
  const e = state.eiland;
  if (!kaartCompleet(e) || e.schatWeek === week) return { ok: false, state, coins: 0, hoed: false };
  const coins = config.schat.coins;
  const hoed = !state.fun[config.schat.hoed];
  const fun = hoed ? { ...state.fun, [config.schat.hoed]: true } : state.fun;
  return {
    ok: true, coins, hoed,
    state: { ...state, fun, wallet: state.wallet + coins, earnedWork: state.earnedWork + coins, eiland: { ...e, schatWeek: week, schatten: (e.schatten || 0) + 1, earned: e.earned + coins } },
  };
}
