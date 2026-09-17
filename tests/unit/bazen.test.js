// The boss nights (docs/js/bazen.js): the schedule, the walk-eat-retreat loop, the loot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BAZEN, baasVoorNacht, maakBaas, stepBaas, baasBuit } from '../../docs/js/bazen.js';
import { createState } from '../../docs/js/economy.js';
import { CONFIG } from '../../docs/js/config.js';

const B = CONFIG.bazen;

test('a boss every fifth night, in order, with more lives every round', () => {
  assert.equal(baasVoorNacht(0, B), null);
  assert.equal(baasVoorNacht(B.vanafNacht - 2, B), null);
  assert.equal(baasVoorNacht(B.vanafNacht - 1, B).id, 'koning');
  assert.equal(baasVoorNacht(B.vanafNacht, B), null);
  assert.equal(baasVoorNacht(B.vanafNacht - 1 + B.elke, B).id, 'kapitein');
  assert.equal(baasVoorNacht(B.vanafNacht - 1 + 2 * B.elke, B).id, 'monster');
  const again = baasVoorNacht(B.vanafNacht - 1 + 3 * B.elke, B);
  assert.equal(again.id, 'koning');
  assert.equal(again.ronde, 1);
  assert.equal(again.hp, BAZEN[0].hp + B.hpPerRonde);
  for (const d of BAZEN) assert.ok(CONFIG.fun.some((f) => f.id === d.buit.ding && f.schat), `${d.buit.ding} exists and is not for sale`);
});

test('a boss walks to the fire, eats, backs off and comes again; a fleeing boss is gone after a while', () => {
  const def = BAZEN[0];
  const b = maakBaas(def, 0, 30);
  let ate = 0, steps = 0;
  for (; steps < 4000 && ate < 2; steps++) { const r = stepBaas(b, { target: { x: 0, z: 0 }, dt: 1 / 30 }, def); if (r === 'eat') ate++; }
  assert.equal(ate, 2, 'it comes back after retreating');
  assert.ok(steps < 4000);
  b.state = 'flee'; b.heading = 0; b.life = 6;
  let gone = null;
  for (let i = 0; i < 1000 && gone !== 'gone'; i++) gone = stepBaas(b, { target: { x: 0, z: 0 }, dt: 1 / 30 }, def);
  assert.equal(gone, 'gone');
});

test('the loot pays coins, gives the hat once, and counts the boss on PAPA', () => {
  let s = createState(CONFIG, 0);
  const def = BAZEN[1];
  const r1 = baasBuit(s, CONFIG, def);
  assert.equal(r1.nieuw, true);
  assert.equal(r1.state.fun[def.buit.ding], true);
  assert.equal(r1.state.wallet, def.buit.munten);
  assert.equal(r1.state.eiland.bazen.kapitein, 1);
  const r2 = baasBuit(r1.state, CONFIG, def);
  assert.equal(r2.nieuw, false, 'the hat only once');
  assert.equal(r2.state.eiland.bazen.kapitein, 2);
  assert.equal(r2.state.wallet, def.buit.munten * 2);
});
