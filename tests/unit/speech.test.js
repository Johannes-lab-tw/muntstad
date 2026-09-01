import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickVoice, createSpeech } from '../../docs/js/speech.js';
import { CONFIG } from '../../docs/js/config.js';

const v = (name, lang, extra = {}) => ({ name, lang, localService: false, default: false, ...extra });

test('prefers nl-NL over other Dutch voices', () => {
  const voices = [v('Ellen', 'nl-BE'), v('Samantha', 'en-US'), v('Xander', 'nl-NL')];
  assert.equal(pickVoice(voices).name, 'Xander');
});

test('falls back to any nl voice when nl-NL is missing', () => {
  const voices = [v('Samantha', 'en-US'), v('Ellen', 'nl-BE')];
  assert.equal(pickVoice(voices).name, 'Ellen');
});

test('accepts underscore and case variants (nl_NL, NL-nl)', () => {
  assert.equal(pickVoice([v('A', 'nl_NL')]).name, 'A');
  assert.equal(pickVoice([v('B', 'NL-nl')]).name, 'B');
});

test('returns null when no Dutch voice exists (never reads Dutch with another voice)', () => {
  assert.equal(pickVoice([v('Samantha', 'en-US'), v('Anna', 'de-DE')]), null);
  assert.equal(pickVoice([]), null);
  assert.equal(pickVoice(undefined), null);
  assert.equal(pickVoice([{ name: 'weird' }]), null);
});

test('among several nl-NL voices prefers the default, then a local one', () => {
  const voices = [v('Remote', 'nl-NL'), v('Local', 'nl-NL', { localService: true }), v('Default', 'nl-NL', { default: true })];
  assert.equal(pickVoice(voices).name, 'Default');
  assert.equal(pickVoice(voices.slice(0, 2)).name, 'Local');
});

test('wrapper stays silent without a Dutch voice and speaks with one', () => {
  const spoken = [];
  class FakeUtterance { constructor(text) { this.text = text; } }
  const synth = {
    voices: [v('Samantha', 'en-US')],
    listeners: {},
    getVoices() { return this.voices; },
    addEventListener(ev, fn) { this.listeners[ev] = fn; },
    speak(u) { spoken.push(u); },
    cancel() { spoken.push('cancel'); },
  };
  const sp = createSpeech(CONFIG, synth, FakeUtterance);
  assert.equal(sp.available, false);
  assert.equal(sp.speak('Hoi!'), false);
  assert.equal(spoken.length, 0);
  // voices arrive later (iOS loads them asynchronously)
  synth.voices = [v('Xander', 'nl-NL')];
  synth.listeners.voiceschanged();
  assert.equal(sp.available, true);
  assert.equal(sp.speak('Hoi kapitein!'), true);
  assert.equal(spoken[0], 'cancel'); // cancels a running utterance first
  assert.equal(spoken[1].text, 'Hoi kapitein!');
  assert.equal(spoken[1].rate, CONFIG.mentor.speechRate);
  assert.equal(spoken[1].voice.name, 'Xander');
  sp.setEnabled(false);
  assert.equal(sp.speak('stil'), false);
});

test('wrapper without speechSynthesis at all is harmless', () => {
  const sp = createSpeech(CONFIG, undefined, undefined);
  assert.equal(sp.available, false);
  sp.unlock();
  assert.equal(sp.speak('x'), false);
  sp.cancel();
});
