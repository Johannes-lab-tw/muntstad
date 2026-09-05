// audio.js — every sound is synthesised with the Web Audio API. No audio files.
// createAudio() is safe to call without an AudioContext (tests, old browsers): every method is a no-op then.

const NOTE = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 };

export function createAudio() {
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  let ctx = null;
  let master = null;
  let sfxGain = null;
  let musicGain = null;
  let soundOn = true;
  let musicOn = true;
  let musicTimer = null;
  let nextNoteTime = 0;
  let step = 0;

  function ensure() {
    if (!Ctx) return false;
    if (!ctx) {
      try {
        ctx = new Ctx();
        master = ctx.createGain();
        master.gain.value = 0.9;
        master.connect(ctx.destination);
        sfxGain = ctx.createGain();
        sfxGain.gain.value = soundOn ? 1 : 0;
        sfxGain.connect(master);
        musicGain = ctx.createGain();
        musicGain.gain.value = musicOn ? 0.16 : 0;
        musicGain.connect(master);
      } catch (e) {
        ctx = null;
        return false;
      }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return true;
  }

  function tone({ freq = 440, type = 'sine', start = 0, dur = 0.15, gain = 0.3, slideTo = null, attack = 0.005, dest = null }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest || sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ start = 0, dur = 0.1, gain = 0.2, filter = 'bandpass', freq = 1200, q = 1, slideTo = null }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + start;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t0);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(sfxGain);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  const SFX = {
    tap() { tone({ freq: 700, type: 'square', dur: 0.05, gain: 0.08 }); },
    coin() {
      tone({ freq: NOTE.A5, type: 'triangle', dur: 0.08, gain: 0.25 });
      tone({ freq: NOTE.E6, type: 'triangle', start: 0.07, dur: 0.18, gain: 0.25 });
    },
    coinSoft() { tone({ freq: NOTE.C6, type: 'sine', dur: 0.09, gain: 0.08 }); },
    buy() {
      [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * 0.09, dur: 0.22, gain: 0.25 }));
    },
    upgrade() {
      tone({ freq: 1200, type: 'square', dur: 0.08, gain: 0.12 });
      tone({ freq: 1800, type: 'square', start: 0.08, dur: 0.25, gain: 0.14 });
      noise({ start: 0.02, dur: 0.12, gain: 0.12, filter: 'highpass', freq: 4000 });
      [NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6].forEach((f, i) => tone({ freq: f, type: 'triangle', start: 0.3 + i * 0.07, dur: 0.2, gain: 0.2 }));
    },
    fanfare() {
      const seq = [[NOTE.G4, 0.14], [NOTE.C5, 0.14], [NOTE.E5, 0.14], [NOTE.G5, 0.28], [NOTE.E5, 0.14], [NOTE.G5, 0.5]];
      let t = 0;
      for (const [f, d] of seq) {
        tone({ freq: f, type: 'sawtooth', start: t, dur: d, gain: 0.16 });
        tone({ freq: f / 2, type: 'triangle', start: t, dur: d, gain: 0.12 });
        t += d;
      }
      for (let i = 0; i < 6; i++) tone({ freq: 1500 + Math.random() * 2000, type: 'sine', start: t + i * 0.05, dur: 0.15, gain: 0.08 });
    },
    thud() {
      tone({ freq: 160, type: 'sine', dur: 0.22, gain: 0.35, slideTo: 60 });
      noise({ dur: 0.06, gain: 0.1, filter: 'lowpass', freq: 400 });
    },
    bubble() {
      noise({ dur: 0.07, gain: 0.12, filter: 'bandpass', freq: 900 + Math.random() * 1200, q: 3 });
      tone({ freq: 500 + Math.random() * 700, type: 'sine', dur: 0.1, gain: 0.1, slideTo: 1400 });
    },
    whoosh() { noise({ dur: 0.35, gain: 0.18, filter: 'lowpass', freq: 300, slideTo: 3000 }); },
    sparkle() {
      [NOTE.C6, NOTE.E6, NOTE.G6].forEach((f, i) => tone({ freq: f, type: 'sine', start: i * 0.06, dur: 0.18, gain: 0.14 }));
    },
    jump() { tone({ freq: 300, type: 'square', dur: 0.22, gain: 0.12, slideTo: 900 }); },
    pop() { tone({ freq: 900, type: 'sine', dur: 0.06, gain: 0.15, slideTo: 300 }); },
    firework() {
      noise({ dur: 0.5, gain: 0.25, filter: 'lowpass', freq: 2500, slideTo: 200 });
      for (let i = 0; i < 5; i++) tone({ freq: 800 + Math.random() * 1500, type: 'sine', start: 0.05 + i * 0.06, dur: 0.2, gain: 0.08 });
    },
    unlock() {
      [NOTE.C5, NOTE.G5, NOTE.C6].forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * 0.1, dur: 0.3, gain: 0.2 }));
    },
    // ---- the island (PLAN-V4 R6): ghosts, the bear, the night and the day ----
    boo() { tone({ freq: 420, type: 'sine', dur: 0.7, gain: 0.16, slideTo: 180, attack: 0.15 }); noise({ dur: 0.5, gain: 0.05, filter: 'bandpass', freq: 600, q: 2 }); },
    growl() { tone({ freq: 90, type: 'sawtooth', dur: 0.6, gain: 0.14, slideTo: 60, attack: 0.05 }); noise({ dur: 0.5, gain: 0.08, filter: 'lowpass', freq: 250 }); },
    owl() { tone({ freq: 380, type: 'sine', dur: 0.28, gain: 0.1, attack: 0.05 }); tone({ freq: 340, type: 'sine', start: 0.36, dur: 0.4, gain: 0.1, attack: 0.05 }); },
    bird() { for (let i = 0; i < 3; i++) tone({ freq: 2200 + Math.random() * 1200, type: 'sine', start: i * 0.11, dur: 0.08, gain: 0.05, slideTo: 2800 + Math.random() * 800 }); },
    crackle() { for (let i = 0; i < 3; i++) noise({ start: Math.random() * 0.4, dur: 0.03, gain: 0.05, filter: 'highpass', freq: 3000 }); },
    splash() { noise({ dur: 0.25, gain: 0.14, filter: 'bandpass', freq: 1200, q: 1 }); tone({ freq: 500, type: 'sine', dur: 0.15, gain: 0.08, slideTo: 200 }); },
    drip() { tone({ freq: 1800, type: 'sine', dur: 0.08, gain: 0.06, slideTo: 900 }); tone({ freq: 900, type: 'sine', start: 0.09, dur: 0.12, gain: 0.04, slideTo: 1400 }); },
    flutter() { for (let i = 0; i < 7; i++) noise({ start: i * 0.06, dur: 0.04, gain: 0.07, filter: 'bandpass', freq: 500 + i * 120, q: 2 }); },
    stumble() { tone({ freq: 220, type: 'triangle', dur: 0.18, gain: 0.2, slideTo: 90 }); noise({ dur: 0.12, gain: 0.1, filter: 'lowpass', freq: 500 }); },
    munch() { for (let i = 0; i < 3; i++) noise({ start: i * 0.12, dur: 0.06, gain: 0.09, filter: 'bandpass', freq: 700, q: 2 }); },
  };

  // ---- ambience on the island: birds by day, an owl and the fire by night (a few soft sounds a minute) ----
  let ambientTimer = null, ambientKind = null;
  function setAmbient(kind) {
    if (kind === ambientKind) return;
    ambientKind = kind;
    if (ambientTimer) clearInterval(ambientTimer);
    ambientTimer = null;
    if (!kind) return;
    ambientTimer = setInterval(() => {
      if (!soundOn || !ctx || ctx.state !== 'running') return;
      const r = Math.random();
      if (kind === 'day') { if (r < 0.35) SFX.bird(); }
      else { if (r < 0.2) SFX.owl(); else if (r < 0.6) SFX.crackle(); }
    }, 2500);
  }

  // ---- music: a quiet generated loop (pentatonic melody + bass), scheduled with lookahead ----
  const MELODY = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.E5, NOTE.D5, NOTE.E5, NOTE.C5, 0, NOTE.A4, NOTE.C5, NOTE.E5, NOTE.D5, NOTE.C5, 0, NOTE.G4, 0];
  const BASS = [NOTE.C4, 0, NOTE.G4, 0, NOTE.A4 / 2, 0, NOTE.E4, 0, NOTE.C4, 0, NOTE.G4 / 2, 0, NOTE.A4 / 2, 0, NOTE.G4 / 2, 0];
  let STEP = 0.28; // seconds per 8th note (~107 BPM); the night slows it down and drops an octave
  let octave = 1;

  function scheduleMusic() {
    if (!ctx || !musicOn) return;
    while (nextNoteTime < ctx.currentTime + 0.4) {
      const i = step % MELODY.length;
      const m = MELODY[i];
      const b = BASS[i];
      const start = Math.max(0, nextNoteTime - ctx.currentTime);
      if (m) tone({ freq: m * octave, type: 'triangle', start, dur: STEP * 0.9, gain: 0.5, attack: 0.02, dest: musicGain });
      if (b) tone({ freq: b * octave, type: 'sine', start, dur: STEP * 1.6, gain: 0.45, attack: 0.03, dest: musicGain });
      if (i % 4 === 0) tone({ freq: 2000, type: 'square', start, dur: 0.03, gain: 0.05, dest: musicGain });
      nextNoteTime += STEP;
      step++;
    }
  }

  function startMusic() {
    if (!ctx || musicTimer || !musicOn) return;
    nextNoteTime = ctx.currentTime + 0.1;
    step = 0;
    musicTimer = setInterval(scheduleMusic, 150);
    scheduleMusic();
  }

  function stopMusic() {
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
  }

  return {
    /** Call inside a user-gesture handler once (iOS needs a gesture to start audio). */
    unlock() {
      if (!ensure()) return false;
      try {
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      } catch (e) { /* ignore */ }
      startMusic();
      return true;
    },
    /** True once the context exists and actually runs (iOS reports 'interrupted' after a call or Siri). */
    get running() { return !!ctx && ctx.state === 'running'; },
    play(name) {
      if (!soundOn || !ctx) return;
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      const fn = SFX[name];
      if (fn) {
        try { fn(); } catch (e) { /* never break the game for a sound */ }
      }
    },
    setSound(on) {
      soundOn = !!on;
      if (sfxGain) sfxGain.gain.value = soundOn ? 1 : 0;
    },
    setMusic(on) {
      musicOn = !!on;
      if (musicGain) musicGain.gain.value = musicOn ? 0.16 : 0;
      if (musicOn) startMusic();
      else stopMusic();
    },
    get ready() { return !!ctx; },
    /** 'day' | 'night' | null: island ambience; night also slows the music and drops it an octave. */
    setAmbient(kind) {
      setAmbient(kind);
      const night = kind === 'night';
      STEP = night ? 0.42 : 0.28;
      octave = night ? 0.5 : 1;
      if (musicGain) musicGain.gain.value = musicOn ? (night ? 0.1 : 0.16) : 0;
    },
    pause() { stopMusic(); if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); },
    resume() { if (ctx) { if (ctx.state !== 'running') ctx.resume().catch(() => {}); startMusic(); } },
  };
}
