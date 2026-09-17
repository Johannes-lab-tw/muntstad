// werkbank.js — making things (V9.3, PLAN-V9 §B), pure. At the fire's workbench wood, stones, shells, berries and fish
// become weapons, gadgets and camp levels. Stones come from rocks (HAK), gadgets also from the chests spread over the
// island: ten fixed spots, three filled every day, what is in them depends on the zone. Nothing here costs coins.
import { CAMP, PIER, LAKE, MOERAS, HILL, RUINE, HUT, CAVE } from './3d/heightmap.js';

export const GADGETS = Object.freeze(['net', 'reddingsdrank', 'noodfakkel', 'fluit']);
export const GADGET_INFO = Object.freeze({
  net:           { naam: 'Net',           icon: '🕸️', tekst: 'Houdt een wolf of piraat tien tellen vast.' },
  reddingsdrank: { naam: 'Reddingsdrank', icon: '🧪', tekst: 'Maakt een gevallen vriend wakker.' },
  noodfakkel:    { naam: 'Noodfakkel',    icon: '🧨', tekst: 'Twintig tellen fel licht: alles blijft weg.' },
  fluit:         { naam: 'Fluit',         icon: '🎺', tekst: 'Roept je hond en je vriend naar je toe.' },
});

/** What you can make: tools (once), gadgets (a count) — cost in island items. */
export const RECEPTEN = Object.freeze([
  { id: 'speer',         soort: 'tool',   kost: { hout: 4, steen: 1 } },
  { id: 'katapult',      soort: 'tool',   kost: { hout: 3, steen: 2 } },
  { id: 'waterspuit',    soort: 'tool',   kost: { schelp: 4, hout: 2 } },
  { id: 'boemerang',     soort: 'tool',   kost: { hout: 6, steen: 2 } },
  { id: 'alien',         soort: 'tool',   kost: { steen: 8, schelp: 6, vis: 2 } },
  { id: 'fakkels',       soort: 'tool',   kost: { hout: 4 } },
  { id: 'afdak',         soort: 'tool',   kost: { hout: 8 } },
  { id: 'net',           soort: 'gadget', kost: { hout: 3, schelp: 1 } },
  { id: 'reddingsdrank', soort: 'gadget', kost: { bes: 6, vis: 1 } },
  { id: 'noodfakkel',    soort: 'gadget', kost: { hout: 2, steen: 1 } },
]);

/** The camp's five levels, made at the workbench one after the other. */
export const KAMP_LEVELS = Object.freeze([
  { level: 1, naam: 'Muur',       icon: '🧱', kost: { hout: 12, steen: 4 },            tekst: 'Een muur om het kamp. Wolven en piraten komen er niet zomaar door.' },
  { level: 2, naam: 'Wachttoren', icon: '🗼', kost: { hout: 20, steen: 8 },            tekst: 'Een toren met een lantaarn: licht over het hele kamp.' },
  { level: 3, naam: 'Grote tent', icon: '⛺', kost: { hout: 15, schelp: 6 },           tekst: 'Een grotere tent. Slapen gaat nog sneller.' },
  { level: 4, naam: 'Opslagkist', icon: '📦', kost: { hout: 25, steen: 10 },           tekst: 'Er passen twintig dingen meer in je rugzak.' },
  { level: 5, naam: 'Vlag',       icon: '🚩', kost: { hout: 10, schelp: 10, steen: 10 }, tekst: 'Jouw vlag op de toren. Het kamp is af!' },
]);

export function receptById(id) { return RECEPTEN.find((r) => r.id === id) || null; }
export function volgendeKampLevel(e) { return KAMP_LEVELS.find((k) => k.level === (e.kamp || 0) + 1) || null; }

/** What is missing for a cost, as { item: n }; empty when affordable. */
export function tekort(e, kost) {
  const out = {};
  for (const [item, n] of Object.entries(kost)) { const have = (e.bag && e.bag[item]) || 0; if (have < n) out[item] = n - have; }
  return out;
}
export function kanMaken(e, kost) { return Object.keys(tekort(e, kost)).length === 0; }

function betaal(e, kost) {
  const bag = { ...e.bag };
  for (const [item, n] of Object.entries(kost)) bag[item] = (bag[item] || 0) - n;
  return bag;
}

/** Make a recipe (tool or gadget). Returns { ok, state, reason }. */
export function maak(state, id) {
  const r = receptById(id);
  const e = state.eiland;
  if (!r) return { ok: false, state, reason: 'unknown' };
  if (r.soort === 'tool' && e.tools[id]) return { ok: false, state, reason: 'owned' };
  if (!kanMaken(e, r.kost)) return { ok: false, state, reason: 'items', tekort: tekort(e, r.kost) };
  const bag = betaal(e, r.kost);
  if (r.soort === 'tool') return { ok: true, state: { ...state, eiland: { ...e, bag, tools: { ...e.tools, [id]: true } } } };
  const gadgets = { ...(e.gadgets || {}), [id]: ((e.gadgets && e.gadgets[id]) || 0) + 1 };
  return { ok: true, state: { ...state, eiland: { ...e, bag, gadgets } } };
}

/** Build the next camp level. Returns { ok, state, level, reason }. */
export function upgradeKamp(state) {
  const e = state.eiland;
  const k = volgendeKampLevel(e);
  if (!k) return { ok: false, state, reason: 'max' };
  if (!kanMaken(e, k.kost)) return { ok: false, state, reason: 'items', tekort: tekort(e, k.kost) };
  return { ok: true, level: k.level, state: { ...state, eiland: { ...e, bag: betaal(e, k.kost), kamp: k.level } } };
}

/** Use one gadget (V9.4 uses them). Returns { ok, state }. */
export function gebruikGadget(state, id) {
  const e = state.eiland;
  const n = (e.gadgets && e.gadgets[id]) || 0;
  if (n <= 0) return { ok: false, state };
  return { ok: true, state: { ...state, eiland: { ...e, gadgets: { ...e.gadgets, [id]: n - 1 } } } };
}

// ---------- the chests ----------
export const KISTEN = Object.freeze([
  { x: CAMP.x - 26, z: CAMP.z - 22, zone: 'bos' },
  { x: CAMP.x + 30, z: CAMP.z - 12, zone: 'bos' },
  { x: PIER.x - 30, z: PIER.z - 14, zone: 'strand' },
  { x: PIER.x + 36, z: PIER.z - 16, zone: 'strand' },
  { x: LAKE.x - 34, z: LAKE.z + 12, zone: 'meer' },
  { x: MOERAS.x - 42, z: MOERAS.z + 22, zone: 'moeras' },
  { x: HILL.x + 52, z: HILL.z + 62, zone: 'berg' },
  { x: RUINE.x + 14, z: RUINE.z + 12, zone: 'ruine' },
  { x: HUT.x + 9, z: HUT.z + 9, zone: 'vuurtoren' },
  { x: CAVE.x - 9, z: CAVE.z + 9, zone: 'grot' },
]);
export const KIST_INHOUD = Object.freeze({
  bos:       [{ items: { hout: 8 } }, { gadgets: { net: 1 } }, { items: { bes: 6 } }],
  strand:    [{ items: { schelp: 6 } }, { coins: 25 }, { gadgets: { fluit: 1 } }],
  meer:      [{ items: { vis: 3 } }, { gadgets: { reddingsdrank: 1 } }],
  moeras:    [{ gadgets: { reddingsdrank: 1 } }, { items: { bes: 8 } }],
  berg:      [{ items: { steen: 6 } }, { coins: 40 }],
  ruine:     [{ coins: 50 }, { gadgets: { noodfakkel: 1 } }, { items: { steen: 4 } }],
  vuurtoren: [{ gadgets: { noodfakkel: 1 } }, { items: { hout: 6 } }],
  grot:      [{ coins: 60 }, { gadgets: { reddingsdrank: 2 } }],
});
export const KISTEN_PER_DAG = 3;

function hash(a, b, c = 0) {
  let h = (a * 2654435761 + b * 97 + c * 40503 + 7919) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}
/** The day as a whole number (local calendar days since 1 January 2026). */
export function dagKey(now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - new Date(2026, 0, 1).getTime()) / 86400000);
}
/** Which chests are filled today: three different spots, deterministic per day and save. */
export function kistenVandaag(day, seed = 0) {
  const out = [];
  for (let k = 0; out.length < KISTEN_PER_DAG && k < 30; k++) {
    const i = hash(day, seed, k) % KISTEN.length;
    if (!out.includes(i)) out.push(i);
  }
  return out;
}
export function kistInhoud(i, day, seed = 0) {
  const list = KIST_INHOUD[KISTEN[i].zone];
  return list[hash(day, seed, 100 + i) % list.length];
}
export function kistOpen(e, i) { return !!((e.kistenOpen || 0) & (1 << i)); }

/** Open chest `i` today. Returns { ok, state, inhoud }. The bag takes what fits; coins go to the wallet. */
export function openKist(state, config, i, day, seed = 0, bagMax = 30) {
  const e = state.eiland;
  const vandaag = e.kistenDag === day ? e : { ...e, kistenDag: day, kistenOpen: 0 };   // a new day resets the lids
  if (!kistenVandaag(day, seed).includes(i) || kistOpen(vandaag, i)) return { ok: false, state: { ...state, eiland: vandaag }, inhoud: null };
  const inhoud = kistInhoud(i, day, seed);
  let bag = { ...vandaag.bag }, gadgets = { ...(vandaag.gadgets || {}) }, wallet = state.wallet, earnedWork = state.earnedWork;
  if (inhoud.items) {
    let room = Math.max(0, bagMax - Object.values(bag).reduce((a, b) => a + b, 0));
    for (const [item, n] of Object.entries(inhoud.items)) { const add = Math.min(room, n); bag[item] = (bag[item] || 0) + add; room -= add; }
  }
  if (inhoud.gadgets) for (const [g, n] of Object.entries(inhoud.gadgets)) gadgets[g] = (gadgets[g] || 0) + n;
  if (inhoud.coins) { wallet += inhoud.coins; earnedWork += inhoud.coins; }
  return { ok: true, inhoud, state: { ...state, wallet, earnedWork, eiland: { ...vandaag, bag, gadgets, kistenOpen: (vandaag.kistenOpen || 0) | (1 << i) } } };
}
