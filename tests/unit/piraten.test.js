// The pirates (docs/js/piraten.js): the schedule, the walk to the fire, the scare, the plunder and the loot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { piratenNacht, stepPiraat, scarePiraat, plunder, buit } from '../../docs/js/piraten.js';
import { createState } from '../../docs/js/economy.js';
import { CONFIG } from '../../docs/js/config.js';

const P = CONFIG.piraten;

test('the boat comes from night vanafNacht and then every elke nights, never earlier', () => {
  for (let nights = 0; nights < P.vanafNacht - 1; nights++) assert.equal(piratenNacht(nights, P), false, `night ${nights + 1}`);
  assert.equal(piratenNacht(P.vanafNacht - 1, P), true);
  assert.equal(piratenNacht(P.vanafNacht, P), false);
  assert.equal(piratenNacht(P.vanafNacht - 1 + P.elke, P), true);
  assert.equal(piratenNacht(P.vanafNacht - 1 + P.elke * 4, P), true);
});

test('a pirate walks to the fire and plunders when it gets there; a scared one runs and is gone after a while', () => {
  const p = { x: 0, z: 40, heading: 0, state: 'come', pause: 0 };
  let res = null;
  for (let i = 0; i < 2000 && res !== 'plunder'; i++) res = stepPiraat(p, { target: { x: 0, z: 0 }, dt: 1 / 30 }, P);
  assert.equal(res, 'plunder');
  assert.ok(Math.hypot(p.x, p.z) < P.reach + 0.1);
  const q = { x: 0, z: 10, heading: 0, state: 'come', pause: 0 };
  assert.equal(scarePiraat(q, { x: 0, z: 0 }), true);
  assert.equal(q.state, 'flee');
  assert.equal(scarePiraat(q), false, 'not twice');
  let gone = null;
  for (let i = 0; i < 2000 && gone !== 'gone'; i++) gone = stepPiraat(q, { target: { x: 0, z: 0 }, dt: 1 / 30 }, P);
  assert.equal(gone, 'gone');
  assert.ok(q.z > 10, 'ran away from the fire');
});

test('the plunder takes a share of every kind and some wood, never below zero, and the loot is a coin per pirate', () => {
  let s = createState(CONFIG, 0);
  s = { ...s, eiland: { ...s.eiland, bag: { ...s.eiland.bag, hout: 10, schelp: 3, bes: 1, vis: 0 } }, nacht: { ...s.nacht, fire: 50 } };
  const r = plunder(s, P);
  assert.equal(r.state.eiland.bag.hout, 10 - Math.floor(10 * P.deel));
  assert.equal(r.state.eiland.bag.bes, 1, 'less than one piece is not taken');
  assert.equal(r.state.eiland.bag.vis, 0);
  assert.equal(r.hout, P.houtWeg);
  assert.equal(r.state.nacht.fire, 50 - P.houtWeg);
  const r2 = plunder({ ...s, nacht: { ...s.nacht, fire: 5 } }, P);
  assert.equal(r2.state.nacht.fire, 0);
  assert.equal(r2.hout, 5);
  assert.equal(buit(P), P.aantal * P.munt);
});
