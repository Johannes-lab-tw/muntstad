// gevecht.js — defending yourself (V9.2, PLAN-V9 §B), pure. Weapons you buy at the fire (later: make at the workbench),
// enemies with a few lives, the pack that grows with the nights, and the banner that says what tonight brings.
// Rule 2 stays: no blood; a beaten enemy poofs and drops a coin or two.

export const WAPENS = Object.freeze({
  speer:      { naam: 'SPEER',     icon: '🔱', bereik: 7,  herlaadMs: 900,  schade: 1, spook: false, alleenSpook: false, kleur: '#c9a47a' },
  katapult:   { naam: 'KATAPULT',  icon: '🥎', bereik: 10, herlaadMs: 600,  schade: 1, spook: false, alleenSpook: false, kleur: '#7a3fb8' },
  waterspuit: { naam: 'WATER',     icon: '🔫', bereik: 6,  herlaadMs: 400,  schade: 1, spook: true,  alleenSpook: true,  kleur: '#7fd8ff' },
  boemerang:  { naam: 'BOEMERANG', icon: '🪃', bereik: 9,  herlaadMs: 1200, schade: 2, spook: false, alleenSpook: false, kleur: '#ff9f2e' },
  alien:      { naam: 'ALIEN',     icon: '👽', bereik: 12, herlaadMs: 300,  schade: 2, spook: true,  alleenSpook: false, kleur: '#7dff7a' },
});
/** Strongest first: the best owned weapon that works against the target is the one you use. */
export const VOLGORDE = ['alien', 'boemerang', 'katapult', 'speer', 'waterspuit'];
export const VIJANDEN = ['wolf', 'piraat', 'beer', 'spook'];

/** The weapon to use against `doel` given the tools you own, or null (then BOE is all you have). */
export function wapenVoor(tools, doel) {
  const t = tools || {};
  for (const id of VOLGORDE) {
    const w = WAPENS[id];
    if (!t[id]) continue;
    if (doel === 'spook' ? !w.spook : w.alleenSpook) continue;
    return { id, ...w };
  }
  return null;
}

export function levens(kind, cfg) {
  return (cfg && cfg.levens && cfg.levens[kind]) || 1;
}

/** One hit on an enemy record ({ hp }): 'poef' when it is beaten, else 'raak'. */
export function tref(v, schade = 1) {
  v.hp = (v.hp == null ? 1 : v.hp) - schade;
  return v.hp <= 0 ? 'poef' : 'raak';
}

/** How big the wolf pack is on the night after `nights` survived nights: grows one every `roedelElke` nights. */
export function roedel(nights, config) {
  const W = config.wolven, G = config.gevecht;
  const n = (nights || 0) + 1;
  if (n < W.fromNight) return 0;
  return Math.min(G.roedelCap, W.pack + Math.floor((n - W.fromNight) / G.roedelElke));
}

/** What tonight brings, for the banner at dusk. ctx = { nights, wolves, bear, pirates, ghosts }. */
export function nachtPlan(ctx, config) {
  const n = (ctx.nights || 0) + 1;
  const wolven = ctx.wolves ? roedel(ctx.nights, config) : 0;
  const beren = ctx.bear ? (ctx.beren || 1) : 0;
  const piraten = ctx.pirates ? config.piraten.aantal : 0;
  const spoken = ctx.ghosts === false ? 0 : 1;
  const parts = [];
  if (wolven) parts.push('🐺'.repeat(wolven));
  if (beren) parts.push('🐻'.repeat(beren));
  if (piraten) parts.push('🏴‍☠️'.repeat(piraten));
  if (spoken) parts.push('👻');
  if (ctx.baas) parts.push(`${ctx.baas} BAAS`);
  return { n, wolven, beren, piraten, spoken, tekst: `Nacht ${n}: ${parts.join(' ')}` };
}
