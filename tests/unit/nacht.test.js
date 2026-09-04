// The night (docs/js/nacht.js): the fire burns wood, light keeps ghosts out, ghosts steal in the dark, the bear is
// scared by BOE, dawn pays. Balance: a night's wood is a fair job by hand and easy with the axe (the lesson).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../../docs/js/config.js';
import { createState } from '../../docs/js/economy.js';
import { encodeCode, decodeCode } from '../../docs/js/save.js';
import { CYCLE } from '../../docs/js/3d/daycycle.js';
import { createNacht, burnFire, stokeFire, fireRadius, isLit, stepGhost, ghostSteal, bearTonight, stepBear, scareBear, dawnReward, normalizeNacht } from '../../docs/js/nacht.js';

const N = CONFIG.nacht;

test('balance: a full fire lasts a night; the wood for a night is 24 taps by hand and 4 with the axe', () => {
  const nightMin = CYCLE.nightMs / 60000;
  const burned = N.burnNight * nightMin;
  assert.ok(burned >= 80 && burned <= 110, `a night burns ${burned} of 100`);
  const wood = Math.ceil(burned / N.woodValue);
  const tapsHand = wood * CONFIG.eiland.chop.hands.taps / CONFIG.eiland.chop.hands.wood;
  const tapsAxe = wood * CONFIG.eiland.chop.withAxe.taps / CONFIG.eiland.chop.withAxe.wood;
  assert.ok(tapsHand >= 20 && tapsHand <= 30, `${tapsHand} taps by hand`);
  assert.ok(tapsAxe <= 5, `${tapsAxe} taps with the axe`);
  // the axe pays back: three nights of rewards cover it
  const threeNights = N.rewardBase * 3 + N.rewardPerNight * 3;
  assert.ok(threeNights >= CONFIG.eiland.tools.find((t) => t.id === 'bijl').price, 'axe pays back in three nights');
});

test('the fire burns slowly by day and fast by night; wood stokes it up to 100', () => {
  let n = createNacht();
  const day = burnFire(n, CONFIG, 60000, 0).fire;
  const night = burnFire(n, CONFIG, 60000, 1).fire;
  assert.ok(n.fire - day < n.fire - night);
  assert.equal(n.fire - night, N.burnNight);
  assert.equal(burnFire({ ...n, fire: 1 }, CONFIG, 600000, 1).fire, 0);
  const e = { bag: { hout: 10, schelp: 0, bes: 0, vis: 0 } };
  const r = stokeFire({ ...n, fire: 50 }, e, CONFIG, 3);
  assert.equal(r.used, 3);
  assert.equal(r.nacht.fire, 86);
  assert.equal(r.eiland.bag.hout, 7);
  const full = stokeFire({ ...n, fire: 100 }, e, CONFIG, 3);
  assert.equal(full.used, 0, 'a full fire takes no wood');
  assert.equal(stokeFire(n, { bag: { hout: 0 } }, CONFIG).used, 0);
  assert.ok(fireRadius({ ...n, fire: 100 }, CONFIG) > fireRadius({ ...n, fire: 10 }, CONFIG));
  assert.equal(fireRadius({ ...n, fire: 0 }, CONFIG), 0);
});

test('a ghost drifts to the fire, stops at the light, gives up; in the dark it steals and flees', () => {
  const lights = [{ x: 0, z: 0, r: 6 }];
  const g = { x: 0, z: 20, heading: 0, state: 'come' };
  let res = null;
  for (let t = 0; t < 30; t += 1 / 30) { res = stepGhost(g, { target: { x: 0, z: 0 }, lights, fence: null, dt: 1 / 30 }, CONFIG); if (res) break; }
  assert.notEqual(res, 'steal', 'never steals in the light');
  assert.ok(!isLit(g.x, g.z, lights) || g.state === 'flee', 'stayed outside the light or fled');
  const dark = { x: 0, z: 20, heading: 0, state: 'come' };
  let stole = false;
  for (let t = 0; t < 30; t += 1 / 30) { if (stepGhost(dark, { target: { x: 0, z: 0 }, lights: [], fence: null, dt: 1 / 30 }, CONFIG) === 'steal') { stole = true; break; } }
  assert.ok(stole, 'steals when nothing is lit');
  assert.equal(dark.state, 'flee');
  // the fence blocks too
  const fenced = { x: 0, z: 20, heading: 0, state: 'come' };
  let r2 = null;
  for (let t = 0; t < 30; t += 1 / 30) { r2 = stepGhost(fenced, { target: { x: 0, z: 0 }, lights: [], fence: { x: 0, z: 0, r: 9 }, dt: 1 / 30 }, CONFIG); if (r2 === 'steal') break; }
  assert.notEqual(r2, 'steal');
});

test('what a ghost steals: wood from the fire, an item from the bag, or a few coins; never below zero', () => {
  const n = { ...createNacht(), fire: 50 };
  const e = { bag: { hout: 2, schelp: 0, bes: 0, vis: 0 } };
  const a = ghostSteal(n, e, 10, CONFIG, 0.1);
  assert.equal(a.what, 'vuur');
  assert.equal(a.nacht.fire, 38);
  const b = ghostSteal(n, e, 10, CONFIG, 0.9);
  assert.equal(b.what, 'hout');
  assert.equal(b.eiland.bag.hout, 1);
  const c = ghostSteal({ ...n, fire: 0 }, { bag: { hout: 0, schelp: 0, bes: 0, vis: 0 } }, 2, CONFIG, 0.9);
  assert.equal(c.what, 'munten');
  assert.equal(c.wallet, 0);
  const d = ghostSteal({ ...n, fire: 0 }, { bag: { hout: 0 } }, 0, CONFIG, 0.9);
  assert.equal(d.what, 'niets');
  assert.equal(d.nacht.stolen, 1);
});

test('the bear comes every third night, plods to the fire, and three BOEs send it away', () => {
  assert.equal(bearTonight({ nights: 2 }, CONFIG), true);
  assert.equal(bearTonight({ nights: 0 }, CONFIG), false);
  const b = { x: 0, z: 30, heading: 0, state: 'come', scared: 0, pause: 0 };
  let r = null;
  for (let t = 0; t < 60; t += 1 / 30) { r = stepBear(b, { target: { x: 0, z: 0 }, dt: 1 / 30 }, CONFIG); if (r) break; }
  assert.equal(r, 'eat');
  const c = { x: 0, z: 30, heading: 0, state: 'come', scared: 0, pause: 0 };
  assert.equal(scareBear(c, CONFIG), false);
  assert.equal(scareBear(c, CONFIG), false);
  assert.equal(scareBear(c, CONFIG), true);
  assert.equal(c.state, 'flee');
});

test('dawn pays when the fire burned, more every night; the state survives the Bewaar-code', () => {
  const n = { ...createNacht(), nights: 2 };
  const r = dawnReward(n, CONFIG, true);
  assert.equal(r.reward, N.rewardBase + N.rewardPerNight * 2);
  assert.equal(r.nacht.nights, 3);
  assert.equal(dawnReward(n, CONFIG, false).reward, 0);
  const s = { ...createState(CONFIG, 0), nacht: { ...createNacht(), fire: 42.6, nights: 4, stolen: 2, clockOffsetMs: 12345 } };
  const back = decodeCode(encodeCode(s, CONFIG), CONFIG, 0);
  assert.equal(back.nacht.fire, 43);
  assert.equal(back.nacht.nights, 4);
  assert.equal(back.nacht.stolen, 2);
  assert.equal(back.nacht.clockOffsetMs, 12345);
  assert.deepEqual(normalizeNacht({ fire: 500, nights: -1 }).fire, 100);
  assert.deepEqual(normalizeNacht(null), createNacht());
});
