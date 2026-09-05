// 3d/daycycle.js — the clock of the island, pure numbers (no Three.js): a cycle of 8 minutes day and 5 minutes
// night (V6.2; was 6 + 3), derived from the wall clock so every device (and later every player in a room) agrees on the time.
// phaseAt(now) → 0..1 (0 = sunrise, DAY_END = sunset, 1 = next sunrise); paletteAt(phase) → colours and strengths.

export const CYCLE = Object.freeze({ dayMs: 8 * 60 * 1000, nightMs: 5 * 60 * 1000 });
export const DAY_END = CYCLE.dayMs / (CYCLE.dayMs + CYCLE.nightMs);   // 0.615

export function phaseAt(nowMs, offsetMs = 0) {
  const total = CYCLE.dayMs + CYCLE.nightMs;
  return ((((nowMs + offsetMs) % total) + total) % total) / total;
}

/** 0 by day, 1 in deep night, with soft dusk and dawn. */
export function darknessAt(phase) {
  const dusk = smooth((phase - (DAY_END - 0.06)) / 0.1);
  const dawn = 1 - smooth((phase - 0.94) / 0.06);
  if (phase < DAY_END - 0.06) return phase < 0.06 ? 1 - smooth(phase / 0.06) : 0;
  if (phase < DAY_END + 0.04) return dusk;
  if (phase < 0.94) return 1;
  return dawn;
}
function smooth(t) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }

// keyframes over the phase: [phase, { sky, fog, sun, sunI, hemiSky, hemiGround, hemiI }]
const KEYS = [
  [0.00, { sky: '#ffb27a', fog: '#ffc9a0', sun: '#ffb070', sunI: 1.3, hemiSky: '#ffd7b0', hemiGround: '#6f8a4a', hemiI: 0.7 }],   // sunrise
  [0.12, { sky: '#8fdcff', fog: '#bfe9ff', sun: '#fff6e0', sunI: 2.4, hemiSky: '#d6f0ff', hemiGround: '#6fa84f', hemiI: 0.85 }],  // morning
  [0.45, { sky: '#7fd0ff', fog: '#b6e4ff', sun: '#ffffff', sunI: 2.6, hemiSky: '#d6f0ff', hemiGround: '#6fa84f', hemiI: 0.9 }],   // noon
  [0.60, { sky: '#ffb78a', fog: '#ffd0a8', sun: '#ffc27a', sunI: 1.6, hemiSky: '#ffd9b3', hemiGround: '#6f8a4a', hemiI: 0.7 }],   // golden hour
  [DAY_END + 0.03, { sky: '#2b2f66', fog: '#2d3468', sun: '#8fa0ff', sunI: 0.35, hemiSky: '#3a4380', hemiGround: '#1f2a2a', hemiI: 0.45 }], // dusk
  [0.80, { sky: '#0a0d2c', fog: '#10153a', sun: '#7f8fff', sunI: 0.18, hemiSky: '#1f2868', hemiGround: '#101616', hemiI: 0.27 }],  // night (deep: the fire is the light)
  [0.94, { sky: '#1d1f4a', fog: '#2a2f5c', sun: '#8f9fff', sunI: 0.3, hemiSky: '#333d80', hemiGround: '#1e2a2a', hemiI: 0.4 }],   // before dawn
  [1.00, { sky: '#ffb27a', fog: '#ffc9a0', sun: '#ffb070', sunI: 1.3, hemiSky: '#ffd7b0', hemiGround: '#6f8a4a', hemiI: 0.7 }],
];

function hexToRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

export function paletteAt(phase) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= phase) i++;
  const [p0, a] = KEYS[i], [p1, b] = KEYS[i + 1];
  const t = smooth((phase - p0) / Math.max(1e-6, p1 - p0));
  return {
    sky: mixHex(a.sky, b.sky, t), fog: mixHex(a.fog, b.fog, t), sun: mixHex(a.sun, b.sun, t),
    sunI: a.sunI + (b.sunI - a.sunI) * t,
    hemiSky: mixHex(a.hemiSky, b.hemiSky, t), hemiGround: mixHex(a.hemiGround, b.hemiGround, t),
    hemiI: a.hemiI + (b.hemiI - a.hemiI) * t,
    darkness: darknessAt(phase),
    // sun elevation in radians: rises at 0, peaks mid-day, sets at DAY_END; below the horizon at night
    sunElev: phase < DAY_END ? Math.sin((phase / DAY_END) * Math.PI) * 1.2 : -0.35,
    sunAz: phase < DAY_END ? (phase / DAY_END) * Math.PI : Math.PI,
  };
}
