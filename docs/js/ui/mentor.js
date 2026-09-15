// mentor.js — Muntje, the talking coin. Short Dutch lines in a bubble (with 🔊 replay) and spoken with a Dutch voice.
// Reactions (answers to what the child just did) are always shown; tips (unsolicited) at most one per 90 s.
// V7.7 (PLAN-V7 §C.2 rule 6): for a child who does not read yet the bubble shows a picture and at most three words
// (`kort.<key>` in i18n.js) while the voice says the whole sentence; it sits at the top in the middle and goes after
// 4 s. A tap on the words shows the whole sentence. Lines about a state that lasts (fire out, hunger, cold, down)
// stay longer. Lines without a short form (chains, chapters, stickers) show in full as before.
import { muntjeSVG } from '../art.js';

const HOLD = new Set(['lines.fireOut', 'lines.fireLow', 'lines.hungerEmpty', 'lines.coldEmpty', 'lines.down', 'lines.wolvesComing', 'lines.berenKomen', 'lines.deerComing', 'lines.bearComing']);
const SHORT_MS = 4000, HOLD_MS = 10000, FULL_MS = 6000;

export function createMentor(game) {
  const root = document.getElementById('mentor');
  const bubble = document.getElementById('bubble');
  const textEl = document.getElementById('bubble-text');
  const replay = document.getElementById('bubble-replay');
  const face = document.getElementById('muntje');
  face.innerHTML = muntjeSVG();

  let lastTip = -Infinity;
  let hideTimer = null;
  let talkTimer = null;
  let lastText = '';
  let lastShort = '';
  const log = [];   // the last full lines Muntje said (tests read them; a tip may replace the welcome line on a slow device)
  let shownAt = 0;

  function talk(ms) {
    face.classList.add('talk');
    clearTimeout(talkTimer);
    talkTimer = setTimeout(() => face.classList.remove('talk'), ms);
  }

  function show(text, short = '', ms = 0) {
    shownAt = game.now();
    lastText = text;
    lastShort = short;
    log.push(text);
    if (log.length > 20) log.shift();
    textEl.textContent = short || text;
    bubble.classList.toggle('kort', !!short);
    bubble.title = text;
    bubble.classList.remove('hidden');
    // restart the pop animation
    bubble.style.animation = 'none';
    void bubble.offsetWidth;
    bubble.style.animation = '';
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, ms || (short ? SHORT_MS : Math.max(5000, Math.min(12000, text.length * 90))));
    talk(Math.min(4000, text.length * 60));
  }

  function hide() {
    bubble.classList.add('hidden');
    clearTimeout(hideTimer);
  }

  function speak(text) {
    if (!game.state.settings.voice) return false;
    return game.speech.speak(text);
  }

  /**
   * sayText(text, { kind: 'reaction' | 'tip', short, hold }) → true when shown. `short` is the picture-plus-words
   * form for the bubble (the voice always gets `text`); `hold` keeps the bubble up for 10 s.
   */
  function sayText(text, { kind = 'reaction', short = '', hold = false } = {}) {
    if (!text) return false;
    const now = game.now();
    if (kind === 'tip') {
      if (now - lastTip < game.config.mentor.tipGapMs) return false;
      lastTip = now;
    }
    show(text, short, hold ? HOLD_MS : 0);
    speak(text);
    return true;
  }

  function say(key, vars = {}, opts = {}) {
    const all = { naam: game.displayName(), ...vars };
    const kortKey = key.startsWith('lines.') ? `kort.${key.slice(6)}` : '';
    const short = kortKey ? game.t(kortKey, all) : '';
    return sayText(game.t(key, all), { ...opts, short: short && short !== kortKey ? short : '', hold: opts.hold ?? HOLD.has(key) });
  }

  // a tap anywhere else dismisses the bubble once it has been readable for a moment
  document.addEventListener('pointerdown', (e) => {
    if (bubble.classList.contains('hidden') || bubble.contains(e.target) || face.contains(e.target)) return;
    if (game.now() - shownAt > 3500) hide();
  }, true);
  function again() {
    game.audio.play('tap');
    if (lastText) {
      show(lastText, lastShort);
      speak(lastText);
    }
  }
  replay.addEventListener('click', again);
  // Muntje himself is tappable: he repeats what he said (and wiggles)
  face.addEventListener('pointerdown', again);
  // a tap on the short words shows the whole sentence for a moment (a parent reading along)
  textEl.addEventListener('pointerdown', (e) => {
    if (!lastShort || !bubble.classList.contains('kort')) return;
    e.stopPropagation();
    textEl.textContent = lastText;
    bubble.classList.remove('kort');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, FULL_MS);
  });

  return {
    say,
    sayText,
    hide,
    setVisible(v) { root.hidden = !v; if (!v) hide(); },
    get lastText() { return lastText; },
    get log() { return log; },
  };
}
