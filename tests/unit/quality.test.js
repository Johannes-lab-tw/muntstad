// The adaptive quality regulator (docs/js/3d/quality.js) must not be fooled by hitches, must climb back at 60 Hz,
// and must step down when frames really are slow. Frame times are fed as a played sequence.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuality, DEFAULTS } from '../../docs/js/3d/quality.js';

/** Feed `n` frames of `dtMs` each, returning every tier change. */
function feed(q, t, n, dtMs) {
  const changes = [];
  for (let i = 0; i < n; i++) { t.now += dtMs; const c = q.push(dtMs, t.now); if (c !== null) changes.push(c); }
  return changes;
}

test('a steady 60 Hz never drops a tier, even with a tile hitch every second', () => {
  const q = createQuality();
  const t = { now: 0 };
  const changes = [];
  for (let s = 0; s < 12; s++) {
    changes.push(...feed(q, t, 59, 16.7));
    changes.push(...feed(q, t, 1, 120));   // one hitch per second (a tile built in one frame)
  }
  assert.deepEqual(changes, []);
  assert.equal(q.tier, 0);
  const st = q.stats(t.now);
  assert.ok(st.p50 > 16 && st.p50 < 17.5, `median ${st.p50}`);
  assert.ok(st.hitchesPerMin >= 10, `hitches per minute ${st.hitchesPerMin}`);
});

test('really slow frames step down one tier at a time, with a gap between changes', () => {
  const q = createQuality();
  const t = { now: 0 };
  const changes = feed(q, t, 400, 30);   // 12 s at 30 ms (33 fps)
  assert.deepEqual(changes, [1, 2]);
  assert.equal(q.tier, 2);
  assert.deepEqual(feed(q, t, 200, 30), [], 'stays at the lowest tier');
});

test('at 60 Hz a lowered tier climbs back after the hold time (the old 13 ms rule never did)', () => {
  const q = createQuality({ tier: 2 });
  const t = { now: 0 };
  const changes = feed(q, t, 60 * 20, 16.7);   // 20 s of 60 Hz
  assert.deepEqual(changes, [1, 0]);
  assert.equal(q.tier, 0);
});

test('a forced (software) renderer keeps its tier whatever the frames say', () => {
  const q = createQuality({ tier: 2, forced: true });
  const t = { now: 0 };
  assert.deepEqual(feed(q, t, 60 * 20, 16.7), []);
  assert.equal(q.tier, 2);
});

test('stats give p50, p95 and the hitch count of the last minute', () => {
  const q = createQuality();
  const t = { now: 0 };
  feed(q, t, 100, 16);
  feed(q, t, 10, 24);
  feed(q, t, 2, 200);
  feed(q, t, 80, 16);
  const st = q.stats(t.now);
  assert.equal(st.tier, 0);
  assert.equal(st.hitchesPerMin, 2);
  assert.ok(st.p95 >= st.p50, 'p95 ≥ p50');
  assert.equal(DEFAULTS.upMs, 17.5);
});
