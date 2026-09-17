// stem.js — Muntje's own voice (V9.7, PLAN-V9 §C), pure. Every sentence Muntje can say is rendered once with one Dutch
// voice (Higgsfield text-to-speech, ElevenLabs, 0.15 credit per line) into docs/stem/<hash>.mp3; the catalogue
// docs/stem/lijst.json maps the hash of the sentence to its text. At run time speech.js looks a sentence up by hash
// and plays the file; a sentence without a file (a name, a number, an old cache) falls back to the iPad voice.
// Lines with variables have a spoken twin without them in i18n `stem` ("Hoi! Ik ben Muntje." instead of "Hoi Sam!").

/** The text as it is hashed: trimmed, one space between words, straight quotes. */
export function normaliseerTekst(t) {
  return String(t || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
}

/** FNV-1a (32 bit) over the UTF-16 code units of the normalised text, as eight hex digits. Same in Node and Safari. */
export function hashTekst(t) {
  const s = normaliseerTekst(t);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export const STEM_MAP = 'stem/';
export function bestandVan(t) { return `${STEM_MAP}${hashTekst(t)}.mp3`; }

/** Does the sentence still carry a {variable}? Then it can never have a file. */
export function heeftVariabele(t) { return /\{[a-zA-Z]+\}/.test(String(t || '')); }

/** What Muntje says out loud for a line key: the spoken twin when the line has variables, else the line itself. */
export function gesprokenTekst(key, tekst, i18n) {
  const k = key && key.startsWith('lines.') ? key.slice(6) : key;
  const twin = k && i18n && i18n.stem && i18n.stem[k];
  return twin || tekst;
}

/**
 * Every sentence the game can send to the voice, each once: the mentor lines (spoken twins for the ones with
 * variables), the quest chains (title + first step, the other steps, the reward line), the campaign chapters
 * ("Hoofdstuk n: titel. verhaal" and the finished line), the milestone popups and the sticker lines.
 */
export function verzamelTeksten({ i18n, ketens = [], campagne = [] }) {
  const out = new Set();
  const add = (t) => { const n = normaliseerTekst(t); if (n && !heeftVariabele(n)) out.add(n); };
  const L = i18n.lines || {};
  for (const [k, v] of Object.entries(L)) add(gesprokenTekst(`lines.${k}`, v, i18n));
  for (const ch of ketens) {
    (ch.stappen || []).forEach((s, i) => add(i === 0 ? `${ch.titel}. ${s.tekst}` : s.tekst));
    add(ch.klaar);
  }
  campagne.forEach((ch, i) => {
    const t = ch.tekst || {};
    if (t.titel && t.verhaal) add(`${(L.nieuwHoofdstuk || 'Hoofdstuk {n}: {titel}.').replace('{n}', String(i + 1)).replace('{titel}', t.titel)} ${t.verhaal}`);
    add(ch.klaar || t.klaar);
  });
  for (const v of Object.values(i18n.milestones || {})) { if (typeof v === 'string') add(v); else if (v && v.title) { add(v.title); add((i18n.popups.stickerGot || '').replace('{titel}', v.title)); } }
  add(i18n.popups && i18n.popups.stickerNot);
  return [...out];
}

/** The lines with variables that still lack a spoken twin (unit test: must be empty). */
export function zonderTwin(i18n) {
  return Object.entries(i18n.lines || {}).filter(([k, v]) => heeftVariabele(v) && !(i18n.stem && i18n.stem[k])).map(([k]) => k);
}
