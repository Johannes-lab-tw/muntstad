// mentor.js — Muntje, the talking coin. Short Dutch lines in a bubble (with 🔊 replay) and spoken with a Dutch voice.
// Reactions (answers to what the child just did) are always shown; tips (unsolicited) at most one per 90 s.
import { muntjeSVG } from '../art.js';

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

  function talk(ms) {
    face.classList.add('talk');
    clearTimeout(talkTimer);
    talkTimer = setTimeout(() => face.classList.remove('talk'), ms);
  }

  function show(text) {
    lastText = text;
    textEl.textContent = text;
    bubble.classList.remove('hidden');
    // restart the pop animation
    bubble.style.animation = 'none';
    void bubble.offsetWidth;
    bubble.style.animation = '';
    clearTimeout(hideTimer);
    const ms = Math.max(5000, Math.min(12000, text.length * 90));
    hideTimer = setTimeout(hide, ms);
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
   * sayText(text, { kind: 'reaction' | 'tip' }) → true when shown.
   */
  function sayText(text, { kind = 'reaction' } = {}) {
    if (!text) return false;
    const now = game.now();
    if (kind === 'tip') {
      if (now - lastTip < game.config.mentor.tipGapMs) return false;
      lastTip = now;
    }
    show(text);
    speak(text);
    return true;
  }

  function say(key, vars = {}, opts = {}) {
    return sayText(game.t(key, { naam: game.displayName(), ...vars }), opts);
  }

  replay.addEventListener('click', () => {
    game.audio.play('tap');
    if (lastText) {
      show(lastText);
      speak(lastText);
    }
  });

  return {
    say,
    sayText,
    hide,
    setVisible(v) { root.hidden = !v; if (!v) hide(); },
    get lastText() { return lastText; },
  };
}
