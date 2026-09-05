// ketens.js — Muntje's quest chains (V6.2), pure (no DOM, no Three): a chain is a short story of 3-5 steps with the
// reward at the end. The content lives in docs/content/ketens.js (written by Ollama, checked by validateKetens and the
// unit test); the game reports what happened (ketenEvent) and this module keeps the score on state.eiland:
// keten (index), stap (step index), stapN (progress in the step), ketensDone.
import { LAKE, CAVE, MOERAS, RUINE, HILL, PIER } from './3d/heightmap.js';

export const SOORTEN = ['verzamel', 'stook', 'vuur', 'kook', 'eet', 'verkoop', 'koop', 'nacht', 'ontdek', 'kist'];
/** Places you can discover: within r of the point counts. */
export const PLEKKEN = Object.freeze({
  meer: { x: LAKE.x, z: LAKE.z, r: LAKE.r + 6, naam: 'het meer' },
  grot: { x: CAVE.x, z: CAVE.z, r: 6, naam: 'de grot' },
  moeras: { x: MOERAS.x, z: MOERAS.z, r: MOERAS.r * 0.9, naam: 'het moeras' },
  ruine: { x: RUINE.x, z: RUINE.z, r: RUINE.r, naam: 'de ruïne' },
  berg: { x: HILL.x, z: HILL.z, r: HILL.r * 0.45, naam: 'de berg' },
  strand: { x: PIER.x, z: PIER.z - 12, r: 9, naam: 'het strand' },
});
export function plekAt(x, z) {
  for (const [id, p] of Object.entries(PLEKKEN)) if (Math.hypot(x - p.x, z - p.z) < p.r) return id;
  return null;
}

/** How many times the step must happen (a target of 1 for the one-shot kinds). */
export function stapDoel(stap) {
  return stap.n && stap.n > 0 ? stap.n : 1;
}

/** The chain and step the player is on: { keten, index, stap, stapIndex, stapN, doel } or null when there are no chains. */
export function currentKeten(e, ketens) {
  if (!ketens || !ketens.length) return null;
  const index = ((e.keten || 0) % ketens.length + ketens.length) % ketens.length;
  const keten = ketens[index];
  const stapIndex = Math.min(keten.stappen.length - 1, Math.max(0, e.stap || 0));
  const stap = keten.stappen[stapIndex];
  return { keten, index, stap, stapIndex, stapN: Math.max(0, e.stapN || 0), doel: stapDoel(stap) };
}

/** Does this event count for this step? Returns how much progress it adds (0 = not this step). */
export function stapTelt(stap, ev) {
  if (!stap || !ev || ev.soort !== stap.soort) return 0;
  switch (stap.soort) {
    case 'verzamel':
    case 'verkoop': return ev.item === stap.item ? Math.max(0, ev.n || 0) : 0;
    case 'stook':
    case 'kook':
    case 'eet': return Math.max(0, ev.n == null ? 1 : ev.n);
    case 'vuur': return (ev.level || 0) >= stap.level ? 1 : 0;
    case 'koop': return ev.tool === stap.tool ? 1 : 0;
    case 'nacht': return ev.vuur === false ? 0 : 1;   // a night counts when the fire kept burning
    case 'ontdek': return ev.plek === stap.plek ? 1 : 0;
    case 'kist': return 1;
    default: return 0;
  }
}

/**
 * Something happened: ev = { soort, item?, n?, level?, tool?, plek?, vuur? }. Returns
 * { state, stapKlaar (the finished step or null), ketenKlaar (the finished chain or null), reward }.
 */
export function ketenEvent(state, ketens, ev) {
  const cur = currentKeten(state.eiland, ketens);
  if (!cur) return { state, stapKlaar: null, ketenKlaar: null, reward: 0 };
  const add = stapTelt(cur.stap, ev);
  if (add <= 0) return { state, stapKlaar: null, ketenKlaar: null, reward: 0 };
  const stapN = cur.stapN + add;
  if (stapN < cur.doel) return { state: { ...state, eiland: { ...state.eiland, keten: cur.index, stap: cur.stapIndex, stapN } }, stapKlaar: null, ketenKlaar: null, reward: 0 };
  // the step is done
  if (cur.stapIndex + 1 < cur.keten.stappen.length) {
    return { state: { ...state, eiland: { ...state.eiland, keten: cur.index, stap: cur.stapIndex + 1, stapN: 0 } }, stapKlaar: cur.stap, ketenKlaar: null, reward: 0 };
  }
  // the chain is done: the reward, on to the next chain
  const reward = cur.keten.beloning;
  const e = state.eiland;
  return {
    state: {
      ...state, wallet: state.wallet + reward, earnedWork: state.earnedWork + reward,
      eiland: { ...e, keten: (cur.index + 1) % ketens.length, stap: 0, stapN: 0, ketensDone: (e.ketensDone || 0) + 1, questsDone: (e.questsDone || 0) + 1, earned: (e.earned || 0) + reward },
    },
    stapKlaar: cur.stap, ketenKlaar: cur.keten, reward,
  };
}

/** Every chain must be playable with what the island has: returns a list of problems (empty = fine). */
export function validateKetens(ketens, config) {
  const errs = [];
  const ids = new Set();
  const items = Object.keys(config.eiland.items);
  const tools = config.eiland.tools.map((t) => t.id);
  const ok = (cond, msg) => { if (!cond) errs.push(msg); };
  ok(Array.isArray(ketens) && ketens.length >= 12, 'at least twelve chains');
  for (const k of ketens || []) {
    const at = `keten ${k.id}`;
    ok(typeof k.id === 'string' && /^[a-z][a-z0-9-]*$/.test(k.id), `${at}: id`);
    ok(!ids.has(k.id), `${at}: id twice`); ids.add(k.id);
    ok(typeof k.titel === 'string' && k.titel.length > 0 && k.titel.length <= 30, `${at}: titel`);
    ok(typeof k.klaar === 'string' && k.klaar.length > 0 && k.klaar.length <= 70, `${at}: klaar`);
    ok(Number.isInteger(k.beloning) && k.beloning >= 40 && k.beloning <= 300, `${at}: beloning`);
    ok(Array.isArray(k.stappen) && k.stappen.length >= 3 && k.stappen.length <= 5, `${at}: 3-5 stappen`);
    for (const s of k.stappen || []) {
      const sat = `${at} stap ${s.soort}`;
      ok(SOORTEN.includes(s.soort), `${sat}: soort`);
      ok(typeof s.tekst === 'string' && s.tekst.length > 0 && s.tekst.length <= 60, `${sat}: tekst`);
      ok(!/\b(the|and|you|fire|wood)\b/i.test(s.tekst || ''), `${sat}: Engels`);
      if (s.soort === 'verzamel') { ok(items.includes(s.item) && s.item !== 'maal', `${sat}: item`); ok(Number.isInteger(s.n) && s.n >= 1 && s.n <= 30, `${sat}: n`); }
      if (s.soort === 'verkoop') { ok(items.includes(s.item), `${sat}: item`); ok(Number.isInteger(s.n) && s.n >= 1 && s.n <= 15, `${sat}: n`); }
      if (s.soort === 'stook') ok(Number.isInteger(s.n) && s.n >= 1 && s.n <= 40, `${sat}: n`);
      if (s.soort === 'kook' || s.soort === 'eet') ok(Number.isInteger(s.n) && s.n >= 1 && s.n <= 5, `${sat}: n`);
      if (s.soort === 'vuur') ok(Number.isInteger(s.level) && s.level >= 2 && s.level <= 5, `${sat}: level`);
      if (s.soort === 'nacht') ok(Number.isInteger(s.n) && s.n >= 1 && s.n <= 3, `${sat}: n`);
      if (s.soort === 'koop') ok(tools.includes(s.tool), `${sat}: tool`);
      if (s.soort === 'ontdek') ok(Object.keys(PLEKKEN).includes(s.plek), `${sat}: plek`);
    }
  }
  return errs;
}
