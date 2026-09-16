// 3d/quality.js — the adaptive quality regulator, pure (no DOM, no Three.js) so the unit tests can feed it frame times.
// V8.1: the old regulator averaged every frame, so one hitch (a tile built in one frame, a shader compile) pushed an
// iPad down a tier, and it could only climb back below 13 ms, which a 60 Hz screen never reaches (16.7 ms). Now:
// hitches (frames over `hitchMs`) are counted but kept out of the measurement, the measurement is the median frame
// time over a window, down happens at a median above `downMs`, up at a median below `upMs` held for `upHoldMs`.
// It also keeps the numbers the MELD code shows: p50, p95, hitches per minute.

export const DEFAULTS = Object.freeze({
  hitchMs: 80,        // a frame this long is a hitch: counted, not measured
  windowMs: 3000,     // the median is taken over this much frame time
  downMs: 24,         // median above this → one tier down (≈ under 42 fps)
  upMs: 17.5,         // median below this → one tier up (60 Hz gives 16.7 ms at best)
  upHoldMs: 8000,     // ... when it stays that good this long
  downGapMs: 2000,    // never two changes within this gap
  maxTier: 2,
});

function percentile(sorted, q) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * q)));
  return sorted[i];
}

/**
 * createQuality({ tier, forced, ...DEFAULTS }) → { push(dtMs, now), tier, stats, reset() }.
 * push() returns the new tier when it changed, otherwise null. `forced` pins the tier (software renderers).
 */
export function createQuality(opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  let tier = opts.tier ?? 0;
  const forced = !!opts.forced;
  let frames = [];          // measured frame times in the current window
  let windowStart = null;
  let lastChange = -Infinity;
  let goodSince = null;     // when the median first went below upMs (null when not good)
  let hitches = [];         // times of the last hitches (for per-minute)
  let last = { p50: 0, p95: 0, n: 0 };

  function push(dtMs, now) {
    if (windowStart === null) windowStart = now;
    if (dtMs > o.hitchMs) {
      hitches.push(now);
      if (hitches.length > 600) hitches.shift();
    } else frames.push(dtMs);
    if (now - windowStart < o.windowMs) return null;
    // a window is complete: measure
    const sorted = frames.slice().sort((a, b) => a - b);
    last = { p50: percentile(sorted, 0.5), p95: percentile(sorted, 0.95), n: sorted.length };
    frames = [];
    windowStart = now;
    if (forced || !sorted.length) return null;
    const median = last.p50;
    if (median > o.downMs) {
      goodSince = null;
      if (tier < o.maxTier && now - lastChange > o.downGapMs) { tier++; lastChange = now; return tier; }
      return null;
    }
    if (median < o.upMs) {
      if (goodSince === null) goodSince = now - o.windowMs;   // this whole window was good already
      if (tier > 0 && now - goodSince >= o.upHoldMs && now - lastChange > o.downGapMs) { tier--; lastChange = now; goodSince = now; return tier; }
    } else goodSince = null;
    return null;
  }

  function hitchesPerMinute(now) {
    const cutoff = now - 60000;
    while (hitches.length && hitches[0] < cutoff) hitches.shift();
    return hitches.length;
  }

  return {
    push,
    get tier() { return tier; },
    set tier(t) { tier = t; lastChange = -Infinity; goodSince = null; },
    get forced() { return forced; },
    /** The last complete window: { p50, p95, n } plus hitches in the last minute. */
    stats(now = 0) { return { ...last, hitchesPerMin: hitchesPerMinute(now), tier }; },
    reset() { frames = []; windowStart = null; goodSince = null; },
  };
}
