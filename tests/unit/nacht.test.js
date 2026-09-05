// The night (docs/js/nacht.js): the fire burns wood, light keeps ghosts out, ghosts steal in the dark, the bear is
// scared by BOE, dawn pays. Balance: a night's wood is a fair job by hand and easy with the axe (the lesson).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../../docs/js/config.js';
import { createState } from '../../docs/js/economy.js';
import { encodeCode, decodeCode } from '../../docs/js/save.js';
import { CYCLE } from '../../docs/js/3d/daycycle.js';
import { createNacht, burnFire, stokeFire, fireRadius, fireLevel, levelSpan, isLit, stepGhost, ghostSteal, bearTonight, stepBear, scareBear, dawnReward, normalizeNacht, stepWolf, scareWolf } from '../../docs/js/nacht.js';

const N = CONFIG.nacht;

test('balance: a small fire eats 10-15 pieces a night, a bonfire about twice that; a night of wood is at most 40 taps by hand and 8 with the axe', () => {
  const nightMin = CYCLE.nightMs / 60000;
  const burned = N.burnNight * nightMin;   // level 1
  assert.ok(burned >= 10 && burned <= 15, `a night at level 1 burns ${burned} pieces`);
  const big = burned * (1 + 4 * N.burnPerLevel);   // level 5
  assert.ok(big >= 2 * burned && big <= 3 * burned, `a bonfire burns ${big}`);
  const wood = Math.ceil(burned);
  const tapsHand = wood * CONFIG.eiland.chop.hands.taps / CONFIG.eiland.chop.hands.wood;
  const tapsAxe = wood * CONFIG.eiland.chop.withAxe.taps / CONFIG.eiland.chop.withAxe.wood;
  assert.ok(tapsHand >= 20 && tapsHand <= 40, `${tapsHand} taps by hand`);
  assert.ok(tapsAxe <= 8, `${tapsAxe} taps with the axe`);
  // the levels climb: 20, 50, 100, 200 pieces, the heap holds 400; the light grows with the level
  assert.deepEqual([0, 1, 19, 20, 49, 50, 99, 100, 199, 200, 400].map((f) => fireLevel(f, CONFIG)), [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  assert.deepEqual(levelSpan(60, CONFIG), { level: 3, from: 50, to: 100 });
  assert.deepEqual(levelSpan(250, CONFIG), { level: 5, from: 200, to: N.fireMax });
  assert.deepEqual(levelSpan(0, CONFIG), { level: 0, from: 0, to: 1 });
  for (let l = 1; l < 5; l++) assert.ok(N.levelRadius[l + 1] > N.levelRadius[l]);
  assert.ok(N.levelRadius[5] >= 12, 'a bonfire lights the whole camp');
  // the axe pays back: three nights of rewards cover it
  const threeNights = N.rewardBase * 3 + N.rewardPerNight * 3;
  assert.ok(threeNights >= CONFIG.eiland.tools.find((t) => t.id === 'bijl').price, 'axe pays back in three nights');
});

test('the fire burns slowly by day, fast by night and more per level; wood stokes it up to the heap limit', () => {
  let n = { ...createNacht(), fire: 10 };   // level 1
  const day = burnFire(n, CONFIG, 60000, 0).fire;
  const night = burnFire(n, CONFIG, 60000, 1).fire;
  assert.ok(n.fire - day < n.fire - night);
  assert.ok(Math.abs((n.fire - night) - N.burnNight) < 1e-9);
  const big = burnFire({ ...n, fire: 300 }, CONFIG, 60000, 1).fire;
  assert.ok(Math.abs((300 - big) - N.burnNight * (1 + 4 * N.burnPerLevel)) < 1e-9, 'a bonfire eats more');
  assert.equal(burnFire({ ...n, fire: 1 }, CONFIG, 600000, 1).fire, 0);
  assert.equal(burnFire({ ...n, fire: 0 }, CONFIG, 600000, 1).fire, 0, 'an out fire stays at zero');
  const e = { bag: { hout: 10, schelp: 0, bes: 0, vis: 0 } };
  const r = stokeFire({ ...n, fire: 50 }, e, CONFIG, 3);
  assert.equal(r.used, 3);
  assert.equal(r.nacht.fire, 53);
  assert.equal(r.eiland.bag.hout, 7);
  const full = stokeFire({ ...n, fire: N.fireMax }, e, CONFIG, 3);
  assert.equal(full.used, 0, 'a full heap takes no wood');
  assert.equal(stokeFire({ ...n, fire: N.fireMax - 1 }, e, CONFIG, 3).used, 1, 'only the room that is left');
  assert.equal(stokeFire(n, { bag: { hout: 0 } }, CONFIG).used, 0);
  assert.ok(fireRadius({ ...n, fire: 100 }, CONFIG) > fireRadius({ ...n, fire: 10 }, CONFIG));
  assert.equal(fireRadius({ ...n, fire: 0 }, CONFIG), 0);
  assert.equal(fireRadius({ ...n, fire: 250 }, CONFIG), N.levelRadius[5]);
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
  assert.equal(a.nacht.fire, 50 - N.ghostTakes);
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
  assert.deepEqual(normalizeNacht({ fire: 500, nights: -1 }).fire, N.fireMax);
  assert.equal(normalizeNacht({ fire: 30 }).warm, 100, 'an old save starts warm');
  assert.deepEqual(normalizeNacht(null), createNacht());
});

test('V6.2 shadow wolves: they circle you in the dark, a lunge bites an unlit player, never a lit one; BOE and patience send them off', () => {
  const W = CONFIG.wolven;
  const target = { x: 0, z: 0 };
  const w = { x: 12, z: 0, heading: 0, state: 'circle', ang: 0 };
  for (let t = 0; t < 8; t += 1 / 30) stepWolf(w, { target, safe: false, dt: 1 / 30 }, CONFIG);
  const d = Math.hypot(w.x, w.z);
  assert.ok(Math.abs(d - W.circleR) < 1.0, `circles at ${d}`);
  assert.equal(w.state, 'circle');
  // a lit player: they keep further out and give up after their patience
  const lit = { x: 12, z: 0, heading: 0, state: 'circle', ang: 0 };
  let res = null;
  for (let t = 0; t < 6; t += 1 / 30) res = stepWolf(lit, { target, safe: true, dt: 1 / 30 }, CONFIG);
  assert.ok(Math.hypot(lit.x, lit.z) > W.circleR + 1, 'further out in the light');
  for (let t = 0; t < W.patience + 2; t += 1 / 30) res = stepWolf(lit, { target, safe: true, dt: 1 / 30 }, CONFIG);
  assert.equal(lit.state, 'flee');
  // the lunge: reaches an unlit player = bite, then flees and is gone
  const l = { x: 6, z: 0, heading: 0, state: 'lunge' };
  let bit = false;
  for (let t = 0; t < 5; t += 1 / 30) { if (stepWolf(l, { target, safe: false, dt: 1 / 30 }, CONFIG) === 'bite') { bit = true; break; } }
  assert.ok(bit); assert.equal(l.state, 'flee');
  let gone = null;
  for (let t = 0; t < 20; t += 1 / 30) { gone = stepWolf(l, { target, safe: false, dt: 1 / 30 }, CONFIG); if (gone === 'gone') break; }
  assert.equal(gone, 'gone');
  // a lunge at a player who steps into the light turns back into circling
  const l2 = { x: 6, z: 0, heading: 0, state: 'lunge' };
  assert.equal(stepWolf(l2, { target, safe: true, dt: 1 / 30 }, CONFIG), null);
  assert.equal(l2.state, 'circle');
  // BOE
  const b = { x: 3, z: 0, heading: 1, state: 'circle' };
  scareWolf(b, CONFIG);
  assert.equal(b.state, 'flee');
  assert.ok(W.fromNight >= 5 && W.pack >= 3);
});
