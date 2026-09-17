// V9.4: the adventure starts over (docs/js/economy.js opnieuwAvontuur): the island goes, the town stays.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, opnieuwAvontuur, buyMaker } from '../../docs/js/economy.js';
import { CONFIG } from '../../docs/js/config.js';

test('starting over empties the island, the camp, the tools and the nights, and keeps coins, makers and the campaign', () => {
  let s = createState(CONFIG, 0);
  s = { ...s, wallet: 5000, earnedWork: 5000 };
  s = buyMaker(s, CONFIG, 'limonade').state;
  s = { ...s, eiland: { ...s.eiland, bag: { ...s.eiland.bag, hout: 20 }, tools: { speer: true }, kamp: 3, kaart: ['ruine'], gadgets: { net: 2 } }, nacht: { ...s.nacht, nights: 9, fire: 300, clockOffsetMs: 1234 }, campagne: { ...s.campagne, hoofdstuk: 2, munten: 2 } };
  const r = opnieuwAvontuur(s, CONFIG);
  assert.equal(r.eiland.bag.hout, 0);
  assert.deepEqual(r.eiland.tools, {});
  assert.equal(r.eiland.kamp, 0);
  assert.deepEqual(r.eiland.kaart, []);
  assert.equal(r.nacht.nights, 0);
  assert.equal(r.nacht.clockOffsetMs, 1234, 'the clock stays');
  assert.equal(r.nacht.herstart, 1);
  assert.equal(Math.floor(r.wallet), Math.floor(s.wallet));
  assert.equal(r.makers.limonade, 1);
  assert.equal(r.campagne.munten, 2);
});
