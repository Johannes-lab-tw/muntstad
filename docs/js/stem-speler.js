// stem-speler.js — plays Muntje's voice files (V9.7, see stem.js). The catalogue docs/stem/lijst.json says which
// sentences have a file; a sentence is looked up by the hash of its text, fetched (from the precache, so offline too),
// decoded once through the game's AudioContext and played on its own gain. A small cache keeps the last sentences
// decoded; anything not in the catalogue, or a fetch that fails, returns false so speech.js uses the iPad voice.
import { hashTekst, STEM_MAP } from './stem.js';

const CACHE_MAX = 24;

export function createStemSpeler(audio, { basis = new URL(`../${STEM_MAP}`, import.meta.url).href, fetchFn = globalThis.fetch } = {}) {
  let lijst = null;            // Set of hashes, once the catalogue is in
  let laden = null;
  const cache = new Map();     // hash → AudioBuffer (insertion order = age)
  let stop = null;             // stops the sentence that is playing
  let gespeeld = 0;            // sentences that started from a file (tests)

  function laadLijst() {
    if (laden) return laden;
    laden = (fetchFn ? fetchFn(`${basis}lijst.json`) : Promise.reject(new Error('geen fetch')))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => { lijst = new Set(Object.keys(j)); return lijst; })
      .catch(() => { lijst = new Set(); return lijst; });
    return laden;
  }

  async function buffer(hash) {
    if (cache.has(hash)) { const b = cache.get(hash); cache.delete(hash); cache.set(hash, b); return b; }
    const r = await fetchFn(`${basis}${hash}.mp3`);
    if (!r.ok) throw new Error(String(r.status));
    const b = await audio.decode(await r.arrayBuffer());
    cache.set(hash, b);
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
    return b;
  }

  return {
    /** Start fetching the catalogue (call at boot); resolves when known. */
    laad: laadLijst,
    get klaar() { return !!lijst; },
    get aantal() { return lijst ? lijst.size : 0; },
    get gespeeld() { return gespeeld; },
    /** Is there a file for this exact sentence? (false until the catalogue is in) */
    heeft(text) { return !!lijst && lijst.has(hashTekst(text)); },
    /** Play the sentence; resolves true when it started, false when it could not (then the caller falls back). */
    async speel(text) {
      if (!this.heeft(text) || !audio.decode) return false;
      try {
        const b = await buffer(hashTekst(text));
        this.stop();
        stop = audio.speakBuffer(b);
        if (stop) gespeeld++;
        return !!stop;
      } catch (e) { return false; }
    },
    stop() { if (stop) { try { stop(); } catch (e) { /* ignore */ } stop = null; } },
    /** Fetch and decode a few sentences ahead (the first ones a child hears), best effort. */
    async warm(texts) { await laadLijst(); for (const t of texts) if (this.heeft(t)) buffer(hashTekst(t)).catch(() => {}); },
  };
}
