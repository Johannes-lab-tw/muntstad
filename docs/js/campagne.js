// campagne.js — "De verdwenen munten van Muntstad" (V6.6/V6.7), pure (no DOM, no Three): seven chapters, each worth
// one golden coin (a friend of Muntje). The texts live in docs/content/campagne.js; the game reports what happened
// (campagneEvent) and this module keeps the score on state.campagne = { hoofdstuk (0..7, 7 = saved), munten,
// pogingen (lost bear nights), reeks (nights in a row for chapter 6), grotOk (chest opened, not caught yet) }.

export const HOOFDSTUKKEN = ['kamp', 'grot', 'meer', 'berg', 'vuurtoren', 'licht', 'beren'];

export function createCampagne() {
  return { hoofdstuk: 0, munten: 0, pogingen: 0, reeks: 0, grotOk: false };
}

/** The chapter the player is on: { index, id, tekst } or null when the island is saved. */
export function currentHoofdstuk(c, content) {
  const idx = Math.max(0, Math.min(HOOFDSTUKKEN.length, c ? c.hoofdstuk || 0 : 0));
  if (idx >= HOOFDSTUKKEN.length) return null;
  const id = HOOFDSTUKKEN[idx];
  return { index: idx, id, tekst: (content || []).find((h) => h.id === id) || null };
}
export function isGered(c) {
  return (c ? c.hoofdstuk || 0 : 0) >= HOOFDSTUKKEN.length;
}

/**
 * Something happened: ev = { soort, vuur?, which? }. Kinds: 'nacht' (vuur true/false), 'kist' (which 'grot'|'hut'),
 * 'grotspook' (the cave ghost caught you), 'grotuit' (you left the cave), 'goudvis', 'top', 'beren' (all three gone),
 * 'berenverloren'. Returns { state, klaar (the finished chapter's id or null), reward, gered }.
 */
export function campagneEvent(state, config, ev) {
  const c = state.campagne || createCampagne();
  const cur = currentHoofdstuk(c);
  const none = { state, klaar: null, reward: 0, gered: false };
  if (!cur || !ev) return none;
  let next = null;   // the new campagne slice when something changed
  let done = false;
  switch (cur.id) {
    case 'kamp': if (ev.soort === 'nacht' && ev.vuur !== false) done = true; break;
    case 'grot':
      if (ev.soort === 'kist' && ev.which === 'grot') next = { ...c, grotOk: true };
      else if (ev.soort === 'grotspook' && c.grotOk) next = { ...c, grotOk: false };
      else if (ev.soort === 'grotuit' && c.grotOk) done = true;
      break;
    case 'meer': if (ev.soort === 'goudvis') done = true; break;
    case 'berg': if (ev.soort === 'top') done = true; break;
    case 'vuurtoren': if (ev.soort === 'kist' && ev.which === 'hut') done = true; break;
    case 'licht':
      if (ev.soort === 'nacht') {
        const reeks = ev.vuur === false ? 0 : (c.reeks || 0) + 1;
        if (reeks >= config.campagne.lichtNachten) done = true; else next = { ...c, reeks };
      }
      break;
    case 'beren':
      if (ev.soort === 'beren') done = true;
      else if (ev.soort === 'berenverloren') next = { ...c, pogingen: (c.pogingen || 0) + 1 };
      break;
    default: break;
  }
  if (done) {
    const reward = config.campagne.beloning[cur.index] || 0;
    const slice = { ...c, hoofdstuk: cur.index + 1, munten: (c.munten || 0) + 1, reeks: 0, grotOk: false };
    return {
      state: { ...state, wallet: state.wallet + reward, earnedWork: state.earnedWork + reward, campagne: slice },
      klaar: cur.id, reward, gered: isGered(slice),
    };
  }
  if (next) return { state: { ...state, campagne: next }, klaar: null, reward: 0, gered: false };
  return none;
}

/** A lost bear night: the wood in the bag and in the fire is gone (the bears ate it); you try again tomorrow. */
export function berenVerloren(state, config) {
  const r = campagneEvent(state, config, { soort: 'berenverloren' });
  const e = r.state.eiland;
  return { ...r.state, eiland: { ...e, bag: { ...e.bag, hout: 0 } }, nacht: { ...r.state.nacht, fire: 0 } };
}

export function normalizeCampagne(data) {
  const fresh = createCampagne();
  if (!data || typeof data !== 'object') return fresh;
  const num = (v, max) => Math.min(max, Math.max(0, Math.floor(Number(v) || 0)));
  const hoofdstuk = num(data.hoofdstuk, HOOFDSTUKKEN.length);
  return { hoofdstuk, munten: Math.min(hoofdstuk, num(data.munten, HOOFDSTUKKEN.length)), pogingen: num(data.pogingen, 999), reeks: num(data.reeks, 9), grotOk: !!data.grotOk };
}

/** The content must have all seven chapters in order, Dutch and short. Returns a list of problems. */
export function validateCampagne(content) {
  const errs = [];
  if (!Array.isArray(content) || content.length !== HOOFDSTUKKEN.length) { errs.push('seven chapters'); return errs; }
  content.forEach((h, i) => {
    if (h.id !== HOOFDSTUKKEN[i]) errs.push(`chapter ${i + 1}: id ${h.id}`);
    for (const [k, max] of [['titel', 30], ['verhaal', 160], ['doel', 70], ['klaar', 120]]) {
      if (typeof h[k] !== 'string' || !h[k].trim() || h[k].length > max) errs.push(`chapter ${h.id}: ${k}`);
      if (/\b(the|and|you|fire)\b/i.test(h[k] || '')) errs.push(`chapter ${h.id}: ${k} English`);
    }
  });
  return errs;
}
