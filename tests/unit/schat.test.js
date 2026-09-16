// The treasure map (docs/js/schat.js): five pieces, one per far place; the X moves weekly and is deterministic per
// save; digging pays once a week and the pirate hat once ever.
import test from 'node:test';
import assert from 'node:assert/strict';
import { KAARTSTUKKEN, STUKKEN, X_PLEKKEN, weekKey, schatPlek, vindKaartstuk, kaartCompleet, graafSchat } from '../../docs/js/schat.js';
import { createState } from '../../docs/js/economy.js';
import { CONFIG } from '../../docs/js/config.js';

test('five pieces at five different places, each with a name', () => {
  assert.equal(KAARTSTUKKEN.length, 5);
  assert.equal(new Set(STUKKEN).size, 5);
  for (const k of KAARTSTUKKEN) assert.ok(k.naam && k.x > 0 && k.z > 0);
});

test('the week key counts whole weeks and the X is the same all week, different per save', () => {
  const mon = new Date(2026, 8, 14, 9).getTime(), sun = new Date(2026, 8, 20, 23).getTime(), next = new Date(2026, 8, 21, 1).getTime();
  assert.equal(weekKey(mon), weekKey(sun));
  assert.equal(weekKey(next), weekKey(mon) + 1);
  const a = schatPlek(weekKey(mon), 7), b = schatPlek(weekKey(mon), 7);
  assert.deepEqual(a, b);
  assert.ok(X_PLEKKEN.includes(a));
  const spots = new Set();
  for (let w = 0; w < 30; w++) spots.add(JSON.stringify(schatPlek(w, 7)));
  assert.ok(spots.size >= 3, 'the X moves over the weeks');
  assert.notDeepEqual(schatPlek(3, 1, 1), schatPlek(3, 1, 0), 'skip gives the next candidate');
});

test('digging up the pieces one by one completes the map; the same mound gives nothing twice', () => {
  let s = createState(CONFIG, 0);
  assert.equal(kaartCompleet(s.eiland), false);
  let r = vindKaartstuk(s, 'ruine');
  assert.ok(r.ok);
  assert.equal(r.over, 4);
  s = r.state;
  assert.equal(vindKaartstuk(s, 'ruine').ok, false);
  assert.equal(vindKaartstuk(s, 'nergens').ok, false);
  for (const id of ['moeras', 'berg', 'vuurtoren', 'grot']) { r = vindKaartstuk(s, id); assert.ok(r.ok); s = r.state; }
  assert.equal(r.over, 0);
  assert.ok(kaartCompleet(s.eiland));
});

test('the treasure pays once a week, the pirate hat once ever, and never before the map is complete', () => {
  let s = createState(CONFIG, 0);
  assert.equal(graafSchat(s, CONFIG, 10).ok, false, 'no map, no treasure');
  for (const id of STUKKEN) s = vindKaartstuk(s, id).state;
  const w0 = s.wallet;
  let r = graafSchat(s, CONFIG, 10);
  assert.ok(r.ok && r.hoed);
  assert.equal(r.coins, CONFIG.schat.coins);
  assert.equal(r.state.wallet, w0 + CONFIG.schat.coins);
  assert.equal(r.state.fun[CONFIG.schat.hoed], true);
  assert.equal(r.state.eiland.schatten, 1);
  s = r.state;
  assert.equal(graafSchat(s, CONFIG, 10).ok, false, 'not twice in one week');
  r = graafSchat(s, CONFIG, 11);
  assert.ok(r.ok && !r.hoed, 'next week: coins again, the hat only once');
  assert.equal(r.state.eiland.schatten, 2);
  assert.ok(CONFIG.fun.some((f) => f.id === CONFIG.schat.hoed && f.schat), 'the pirate hat exists and is not for sale');
  assert.ok(CONFIG.eiland.tools.some((t) => t.id === 'schep'), 'the schep is for sale at the fire');
});
