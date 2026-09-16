// The weather (docs/js/weer.js) is deterministic per day and seed, never storms early, storms rarely, and the fire
// burns faster in rain unless the afdak is up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { weerVoorDag, burnMul, seedOf, WEER, SOORTEN } from '../../docs/js/weer.js';
import { CONFIG } from '../../docs/js/config.js';

test('the same day and seed always give the same weather, and every kind occurs over a long run', () => {
  const seen = new Set();
  for (let d = 0; d < 400; d++) {
    const w = weerVoorDag(d, 42, CONFIG.weer);
    assert.equal(w, weerVoorDag(d, 42, CONFIG.weer));
    assert.ok(SOORTEN.includes(w), w);
    seen.add(w);
  }
  assert.deepEqual([...seen].sort(), SOORTEN.slice().sort());
});

test('no storm before the first storm day, and at most one storm in every stormElke days', () => {
  for (let seed = 0; seed < 50; seed++) {
    for (let d = 0; d < CONFIG.weer.eersteStormDag; d++) assert.notEqual(weerVoorDag(d, seed, CONFIG.weer), 'storm', `seed ${seed} day ${d}`);
    for (let d = 0; d < 200; d += CONFIG.weer.stormElke) {
      let storms = 0;
      for (let k = 0; k < CONFIG.weer.stormElke; k++) if (weerVoorDag(d + k, seed, CONFIG.weer) === 'storm') storms++;
      assert.ok(storms <= 1, `seed ${seed} from day ${d}: ${storms} storms`);
    }
  }
});

test('rain doubles the fire\'s appetite, a storm triples it, the afdak keeps it dry', () => {
  assert.equal(burnMul('zon', false, CONFIG.weer), 1);
  assert.equal(burnMul('bewolkt', false, CONFIG.weer), 1);
  assert.equal(burnMul('regen', false, CONFIG.weer), CONFIG.weer.regenMul);
  assert.equal(burnMul('storm', false, CONFIG.weer), CONFIG.weer.stormMul);
  assert.equal(burnMul('storm', true, CONFIG.weer), 1);
  assert.ok(WEER.storm.gloom > WEER.regen.gloom && WEER.regen.gloom > WEER.zon.gloom);
});

test('the seed comes from the save\'s creation time and stays small', () => {
  assert.equal(seedOf({ createdAt: 0 }), 0);
  assert.equal(seedOf(null), 0);
  const s = seedOf({ createdAt: 1789513200000 });
  assert.ok(s >= 0 && s < 997);
  assert.ok(CONFIG.eiland.tools.some((t) => t.id === 'afdak'), 'the afdak is for sale at the fire');
});
