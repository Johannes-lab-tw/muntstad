// The workbench and the chests (docs/js/werkbank.js): recipes cost items not coins, camp levels go one at a time,
// three chests a day per save, contents by zone, lids reset with the day.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RECEPTEN, KAMP_LEVELS, KISTEN, GADGETS, maak, upgradeKamp, tekort, kistenVandaag, kistInhoud, openKist, dagKey, gebruikGadget } from '../../docs/js/werkbank.js';
import { createState } from '../../docs/js/economy.js';
import { CONFIG } from '../../docs/js/config.js';

const withBag = (s, bag) => ({ ...s, eiland: { ...s.eiland, bag: { ...s.eiland.bag, ...bag } } });

test('every recipe and camp level costs only island items that exist; every tool recipe is a real tool', () => {
  const items = Object.keys(CONFIG.eiland.items);
  assert.ok(items.includes('steen'), 'stones are an island item');
  for (const r of [...RECEPTEN, ...KAMP_LEVELS]) for (const k of Object.keys(r.kost)) assert.ok(items.includes(k), `${r.id || r.naam}: ${k}`);
  for (const r of RECEPTEN) if (r.soort === 'tool') assert.ok(CONFIG.eiland.tools.some((t) => t.id === r.id), r.id);
  for (const r of RECEPTEN) if (r.soort === 'gadget') assert.ok(GADGETS.includes(r.id), r.id);
});

test('making a spear takes wood and a stone, once; a gadget counts up; not enough = a shortage list', () => {
  let s = createState(CONFIG, 0);
  const r0 = maak(s, 'speer');
  assert.equal(r0.ok, false);
  assert.deepEqual(r0.tekort, { hout: 4, steen: 1 });
  s = withBag(s, { hout: 10, steen: 3, bes: 6, vis: 1 });
  const r1 = maak(s, 'speer');
  assert.ok(r1.ok);
  assert.equal(r1.state.eiland.tools.speer, true);
  assert.equal(r1.state.eiland.bag.hout, 6);
  assert.equal(r1.state.eiland.bag.steen, 2);
  assert.equal(maak(r1.state, 'speer').reason, 'owned');
  const r2 = maak(r1.state, 'reddingsdrank');
  assert.ok(r2.ok);
  assert.equal(r2.state.eiland.gadgets.reddingsdrank, 1);
  const r3 = gebruikGadget(r2.state, 'reddingsdrank');
  assert.ok(r3.ok && r3.state.eiland.gadgets.reddingsdrank === 0);
  assert.equal(gebruikGadget(r3.state, 'reddingsdrank').ok, false);
  assert.deepEqual(tekort(s.eiland, { hout: 20 }), { hout: 10 });
});

test('the camp goes up one level at a time and stops at five', () => {
  let s = withBag(createState(CONFIG, 0), { hout: 200, steen: 100, schelp: 50 });
  for (let lvl = 1; lvl <= 5; lvl++) { const r = upgradeKamp(s); assert.ok(r.ok, `level ${lvl}`); assert.equal(r.level, lvl); s = r.state; }
  assert.equal(s.eiland.kamp, 5);
  assert.equal(upgradeKamp(s).reason, 'max');
  const poor = createState(CONFIG, 0);
  assert.equal(upgradeKamp(poor).reason, 'items');
});

test('three different chests a day, the same for the same day and save, contents from the zone table', () => {
  const a = kistenVandaag(120, 5), b = kistenVandaag(120, 5), c = kistenVandaag(121, 5);
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, 3);
  assert.notDeepEqual(a, c);
  for (const i of a) { const inh = kistInhoud(i, 120, 5); assert.ok(inh.items || inh.gadgets || inh.coins, `chest ${i} ${KISTEN[i].zone}`); }
  const mon = new Date(2026, 8, 14, 9).getTime(), late = new Date(2026, 8, 14, 23).getTime(), next = new Date(2026, 8, 15, 1).getTime();
  assert.equal(dagKey(mon), dagKey(late));
  assert.equal(dagKey(next), dagKey(mon) + 1);
});

test('opening a chest gives its contents once; the next day the lids are closed again', () => {
  let s = createState(CONFIG, 0);
  const day = 200, seed = 3;
  const [i] = kistenVandaag(day, seed);
  const r = openKist(s, CONFIG, i, day, seed, 30);
  assert.ok(r.ok);
  const inh = r.inhoud;
  if (inh.coins) assert.equal(r.state.wallet, s.wallet + inh.coins);
  if (inh.items) for (const [k, n] of Object.entries(inh.items)) assert.equal(r.state.eiland.bag[k], n);
  if (inh.gadgets) for (const [k, n] of Object.entries(inh.gadgets)) assert.equal(r.state.eiland.gadgets[k], n);
  assert.equal(openKist(r.state, CONFIG, i, day, seed, 30).ok, false, 'not twice');
  const other = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].find((j) => !kistenVandaag(day, seed).includes(j));
  assert.equal(openKist(r.state, CONFIG, other, day, seed, 30).ok, false, 'an empty spot gives nothing');
  const tomorrow = kistenVandaag(day + 1, seed)[0];
  assert.ok(openKist(r.state, CONFIG, tomorrow, day + 1, seed, 30).ok, 'a new day fills chests again');
});
