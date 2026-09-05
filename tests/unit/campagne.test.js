// The campaign "De verdwenen munten van Muntstad" (docs/js/campagne.js + docs/content/campagne.js): seven chapters in
// order, each finished by one specific thing that happened, one golden coin each; the score survives the Bewaar-code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../../docs/js/config.js';
import { createState } from '../../docs/js/economy.js';
import { encodeCode, decodeCode, normalize } from '../../docs/js/save.js';
import { CAMPAGNE } from '../../docs/content/campagne.js';
import { HOOFDSTUKKEN, createCampagne, currentHoofdstuk, campagneEvent, berenVerloren, normalizeCampagne, validateCampagne, isGered } from '../../docs/js/campagne.js';

test('the content: seven chapters in the right order, Dutch and short; every chapter has a reward', () => {
  assert.deepEqual(validateCampagne(CAMPAGNE), []);
  assert.equal(CONFIG.campagne.beloning.length, HOOFDSTUKKEN.length);
  assert.ok(CONFIG.campagne.beloning[6] > CONFIG.campagne.beloning[0], 'the bears pay the most');
  assert.ok(validateCampagne(CAMPAGNE.slice(1)).length > 0);
  assert.ok(validateCampagne(CAMPAGNE.map((h) => ({ ...h, doel: 'Keep the fire' }))).length > 0, 'English is caught');
  assert.ok(CONFIG.eiland.tools.some((t) => t.id === 'klimschoenen'), 'the climbing shoes exist for chapter 4');
  assert.ok(CONFIG.milestones.some((m) => m.kind === 'campagne' && m.value === 7), 'the sticker for the saved town');
});

test('the seven chapters, in order: only the right event moves you on, each one pays a coin, the seventh saves Muntstad', () => {
  const C = CONFIG;
  let s = { ...createState(C, 0), wallet: 0 };
  assert.equal(currentHoofdstuk(s.campagne, CAMPAGNE).id, 'kamp');
  // 1 the camp: a night with the fire out does not count
  assert.equal(campagneEvent(s, C, { soort: 'nacht', vuur: false }).klaar, null);
  let r = campagneEvent(s, C, { soort: 'nacht', vuur: true });
  assert.equal(r.klaar, 'kamp'); assert.equal(r.reward, C.campagne.beloning[0]); assert.equal(r.state.campagne.munten, 1);
  s = r.state;
  // 2 the cave: the chest, then out without the ghost; caught = again
  assert.equal(campagneEvent(s, C, { soort: 'grotuit' }).state, s, 'out without the chest: nothing');
  s = campagneEvent(s, C, { soort: 'kist', which: 'grot' }).state;
  assert.equal(s.campagne.grotOk, true);
  s = campagneEvent(s, C, { soort: 'grotspook' }).state;
  assert.equal(s.campagne.grotOk, false, 'caught: the chest must be opened again');
  s = campagneEvent(s, C, { soort: 'kist', which: 'grot' }).state;
  r = campagneEvent(s, C, { soort: 'grotuit' });
  assert.equal(r.klaar, 'grot'); s = r.state;
  // 3 the lake, 4 the mountain, 5 the lighthouse hut
  assert.equal(campagneEvent(s, C, { soort: 'kist', which: 'hut' }).klaar, null, 'the hut chest is chapter 5, not 3');
  s = campagneEvent(s, C, { soort: 'goudvis' }).state; assert.equal(s.campagne.hoofdstuk, 3);
  s = campagneEvent(s, C, { soort: 'top' }).state; assert.equal(s.campagne.hoofdstuk, 4);
  s = campagneEvent(s, C, { soort: 'kist', which: 'hut' }).state; assert.equal(s.campagne.hoofdstuk, 5);
  // 6 the light: three nights in a row; a dark night resets
  s = campagneEvent(s, C, { soort: 'nacht', vuur: true }).state;
  s = campagneEvent(s, C, { soort: 'nacht', vuur: true }).state;
  assert.equal(s.campagne.reeks, 2);
  s = campagneEvent(s, C, { soort: 'nacht', vuur: false }).state;
  assert.equal(s.campagne.reeks, 0);
  for (let i = 0; i < 3; i++) s = campagneEvent(s, C, { soort: 'nacht', vuur: true }).state;
  assert.equal(s.campagne.hoofdstuk, 6);
  // 7 the bears: losing costs the wood and counts an attempt; winning saves the town
  s = { ...s, eiland: { ...s.eiland, bag: { ...s.eiland.bag, hout: 9 } }, nacht: { ...s.nacht, fire: 80 } };
  s = berenVerloren(s, C);
  assert.equal(s.campagne.pogingen, 1); assert.equal(s.eiland.bag.hout, 0); assert.equal(s.nacht.fire, 0);
  const wallet = s.wallet;
  r = campagneEvent(s, C, { soort: 'beren' });
  assert.equal(r.klaar, 'beren'); assert.equal(r.gered, true); assert.equal(r.state.campagne.munten, 7);
  assert.equal(r.state.wallet, wallet + C.campagne.beloning[6]);
  assert.ok(isGered(r.state.campagne));
  assert.equal(currentHoofdstuk(r.state.campagne, CAMPAGNE), null);
  assert.equal(campagneEvent(r.state, C, { soort: 'nacht', vuur: true }).state, r.state, 'after the end nothing changes');
});

test('the campaign survives the save and the Bewaar-code, nonsense is clamped', () => {
  let s = createState(CONFIG, 0);
  s = { ...s, campagne: { hoofdstuk: 4, munten: 4, pogingen: 2, reeks: 1, grotOk: false } };
  const back = decodeCode(encodeCode(s, CONFIG), CONFIG, 0);
  assert.equal(back.campagne.hoofdstuk, 4); assert.equal(back.campagne.munten, 4); assert.equal(back.campagne.pogingen, 2); assert.equal(back.campagne.reeks, 1);
  const n = normalize({ ...s, campagne: { hoofdstuk: 99, munten: 99, pogingen: -1 } }, CONFIG, 0);
  assert.equal(n.campagne.hoofdstuk, 7); assert.equal(n.campagne.munten, 7); assert.equal(n.campagne.pogingen, 0);
  assert.deepEqual(normalizeCampagne(null), createCampagne());
  assert.deepEqual(normalize({ ...s, campagne: undefined }, CONFIG, 0).campagne, createCampagne(), 'an old save starts at chapter 1');
});
