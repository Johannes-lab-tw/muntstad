// speech.js — speechSynthesis wrapper. Dutch voice only: prefers nl-NL, falls back to any nl-*, otherwise silent.
// pickVoice() is pure so it can be unit-tested in Node.

function normLang(lang) {
  return String(lang || '').toLowerCase().replace('_', '-');
}

/** Choose a Dutch voice from a list of SpeechSynthesisVoice-like objects. Returns null when none is Dutch. */
export function pickVoice(voices) {
  const list = (voices || []).filter((v) => v && typeof v.lang === 'string');
  // V5.6: the livelier voices first — iOS ships "Claire"/"Xander" and, when downloaded, enhanced or premium versions
  const lively = (arr) => arr.find((v) => /enhanced|premium|verbeterd|siri/i.test(v.name || '')) || arr.find((v) => /claire/i.test(v.name || ''));
  const exact = list.filter((v) => normLang(v.lang) === 'nl-nl');
  if (exact.length) return lively(exact) || exact.find((v) => v.default) || exact.find((v) => v.localService) || exact[0];
  const nl = list.filter((v) => normLang(v.lang).startsWith('nl'));
  if (nl.length) return lively(nl) || nl.find((v) => v.default) || nl.find((v) => v.localService) || nl[0];
  return null;
}

/**
 * Browser wrapper. `synth` is window.speechSynthesis (injectable for tests).
 * - unlock(): call inside a user-gesture handler once (iOS blocks speech that is not gesture-initiated)
 * - speak(text): cancels a running utterance first; returns false when no Dutch voice exists
 */
export function createSpeech(config, synth = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance) {
  let voice = null;
  let unlocked = false;
  let enabled = true;

  function refresh() {
    if (!synth) return;
    try { voice = pickVoice(synth.getVoices()); } catch (e) { voice = null; }
  }
  if (synth && typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', refresh);
  refresh();

  function cancel() {
    if (!synth) return;
    try { synth.cancel(); } catch (e) { /* ignore */ }
  }

  return {
    get available() { return !!(synth && Utterance && voice); },
    get unlocked() { return unlocked; },
    get voiceName() { return voice ? voice.name : ''; },
    setEnabled(v) { enabled = !!v; if (!enabled) cancel(); },
    refresh,
    unlock() {
      if (!synth || !Utterance || unlocked) return;
      try {
        const u = new Utterance('');
        u.volume = 0;
        synth.speak(u);
        unlocked = true;
      } catch (e) { /* ignore */ }
      refresh();
    },
    speak(text) {
      if (!synth || !Utterance || !enabled || !text) return false;
      if (!voice) refresh();
      if (!voice) return false;
      const busy = !!(synth.speaking || synth.pending);
      cancel();
      try {
        const u = new Utterance(String(text));
        u.voice = voice;
        u.lang = voice.lang;
        u.rate = config.mentor.speechRate;
        // a livelier Muntje: a higher voice, and a bit of lilt — questions and cheers go up, warnings stay level
        const s = String(text);
        u.pitch = /[!?]$/.test(s) ? 1.3 : /^(Let op|Het vuur|Je maag|Het spook|Het hert)/.test(s) ? 1.1 : 1.22;
        // Safari drops an utterance queued in the same tick as a cancel() that interrupted speech; a short breath fixes that
        if (busy) setTimeout(() => { try { if (enabled) synth.speak(u); } catch (e) { /* ignore */ } }, 60);
        else synth.speak(u);
        return true;
      } catch (e) {
        return false;
      }
    },
    cancel,
  };
}
