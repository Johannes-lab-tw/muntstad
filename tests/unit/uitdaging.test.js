// V5.3 (docs/js/uitdaging.js): hunger drains and eating fills, fainting halves the bag, the deer shakes things out,
// the gadgets change the rules, and every night gets harder. Balance: a full stomach lasts a day and a night.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../../docs/js/config.js';
import { createState } from '../../docs/js/economy.js';
import { CYCLE } from '../../docs/js/3d/daycycle.js';
import { createEiland, collect, bagMaxOf, normalizeEiland } from '../../docs/js/eiland.js';
import { burnFire } from '../../docs/js/nacht.js';
import { encodeCode, decodeCode } from '../../docs/js/save.js';
import { perks, drainHunger, isHungry, hungerSpeedMul, eat, canEat, faint, deerBump, nightRules } from '../../docs/js/uitdaging.js';

const H = CONFIG.honger;

test('balance: a full stomach lasts a day and a night without eating, and a fish plus a few berries fills it again', () => {
  const dayMin = CYCLE.dayMs / 60000, nightMin = CYCLE.nightMs / 60000;
  const used = H.drainDay * dayMin + H.drainNight * nightMin;
  assert.ok(used >= 40 && used <= 60, `a day and a night use ${used} of 100`);
  assert.ok(H.food.vis + 3 * H.food.bes >= 60);
  assert.ok(H.slowBelow > 0 && H.slowSpeed < 1);
});

test('hunger drains (faster in the dark), slows you under the limit, and EET picks fish when really hungry', () => {
  let e = createEiland(CONFIG);
  assert.equal(e.honger, 100);
  const day = drainHunger(e, CONFIG, 60000, 0).honger, night = drainHunger(e, CONFIG, 60000, 1).honger;
  assert.equal(100 - day, H.drainDay);
  assert.equal(100 - night, H.drainNight);
  assert.equal(drainHunger({ ...e, honger: 1 }, CONFIG, 600000, 1).honger, 0);
  e = { ...e, honger: 20, bag: { hout: 0, schelp: 0, bes: 2, vis: 1 } };
  assert.ok(isHungry(e, CONFIG));
  assert.equal(hungerSpeedMul(e, CONFIG), H.slowSpeed);
  assert.ok(canEat(e));
  const a = eat(e, CONFIG);
  assert.equal(a.item, 'vis', 'really hungry: the fish first');
  assert.equal(a.eiland.honger, 20 + H.food.vis);
  assert.equal(a.eiland.bag.vis, 0);
  const b = eat({ ...a.eiland, honger: 80 }, CONFIG);
  assert.equal(b.item, 'bes', 'a bit hungry: a berry');
  assert.equal(eat({ ...e, honger: 100 }, CONFIG).item, null, 'full: nothing');
  assert.equal(eat({ ...e, bag: { hout: 3, schelp: 0, bes: 0, vis: 0 } }, CONFIG).item, null, 'wood is not food');
  assert.ok(!canEat({ ...e, bag: { hout: 3, schelp: 0, bes: 0, vis: 0 } }));
});

test('fainting halves the bag and counts; the deer shakes half of everything out, at most maxDrops things', () => {
  const s = { ...createState(CONFIG, 0) };
  s.eiland = { ...s.eiland, honger: 0, bag: { hout: 7, schelp: 4, bes: 1, vis: 0 } };
  const f = faint(s, CONFIG);
  assert.deepEqual(f.eiland.bag, { hout: 3, schelp: 2, bes: 0, vis: 0 });
  assert.equal(f.eiland.honger, H.afterFaint);
  assert.equal(f.nacht.fainted, 1);
  const d = deerBump({ ...s, eiland: { ...s.eiland, bag: { hout: 9, schelp: 4, bes: 3, vis: 2 } } }, CONFIG);
  assert.ok(d.drops.length <= CONFIG.deer.maxDrops);
  assert.ok(d.drops.length >= 4);
  const left = Object.values(d.state.eiland.bag).reduce((n, v) => n + v, 0);
  assert.equal(left + d.drops.length, 18, 'nothing is lost, it lies on the ground');
  assert.equal(d.state.nacht.bumped, 1);
});

test('the gadgets: bag 60, shoes faster than the deer, fish ×2, drum = one BOE, fire pit slows the fire, high fence', () => {
  const none = perks({ tools: {} }, CONFIG);
  assert.equal(none.bagMax, CONFIG.eiland.bagMax);
  assert.equal(none.speedMul, 1);
  const all = perks({ tools: { rugzak: true, schoenen: true, hengel: true, trommel: true, vuurkuil: true, hoog_hek: true, hut2: true } }, CONFIG);
  assert.equal(all.bagMax, 60);
  assert.ok(4.6 * all.speedMul > CONFIG.deer.speed, 'running with the shoes beats the deer');
  assert.equal(all.fishPer, 2);
  assert.equal(all.bearScares, 1);
  assert.ok(all.burnMul < 1);
  assert.ok(all.fenceRadius > none.fenceRadius);
  assert.equal(all.huts, 2);
  // the big backpack really holds 60
  let e = { ...createEiland(CONFIG), tools: { rugzak: true } };
  assert.equal(bagMaxOf(e, CONFIG), 60);
  assert.equal(collect(e, CONFIG, 'hout', 100).added, 60);
  // the fire pit: a night costs 30 % less wood
  const n = { fire: 100 };
  const plain = burnFire(n, CONFIG, 60000, 1).fire, pit = burnFire(n, CONFIG, 60000, 1, all.burnMul).fire;
  assert.ok(100 - pit < (100 - plain) * 0.75);
  // every tool has a price, an icon and a Dutch line
  for (const t of CONFIG.eiland.tools) assert.ok(t.price > 0 && t.icon && t.tekst.length > 8 && !/\b(the|you)\b/.test(t.tekst), t.id);
});

test('every night harder: more and faster ghosts, sooner, the bear more often, the deer from night 2', () => {
  const r0 = nightRules(0, CONFIG), r4 = nightRules(4, CONFIG), r20 = nightRules(20, CONFIG);
  assert.equal(r0.ghostsMax, CONFIG.nacht.ghostsMax);
  assert.equal(r0.deer, false, 'the first night is deer-free');
  assert.equal(nightRules(1, CONFIG).deer, true);
  assert.ok(r4.ghostsMax > r0.ghostsMax && r4.ghostSpeed > r0.ghostSpeed && r4.ghostEveryMs < r0.ghostEveryMs);
  assert.equal(r20.ghostsMax, CONFIG.moeilijker.ghostsCap);
  assert.ok(r20.ghostSpeed <= CONFIG.nacht.ghostSpeed * CONFIG.moeilijker.speedCap + 1e-9);
  assert.equal(r20.bearEvery, CONFIG.moeilijker.bearEveryLater);
  assert.equal(r0.bearEvery, CONFIG.nacht.bearEvery);
});

test('hunger and the counters survive the Bewaar-code and normalize', () => {
  const s = createState(CONFIG, 0);
  s.eiland = { ...s.eiland, honger: 37.6 };
  s.nacht = { ...s.nacht, fainted: 2, bumped: 5 };
  const back = decodeCode(encodeCode(s, CONFIG), CONFIG, 0);
  assert.equal(back.eiland.honger, 38);
  assert.equal(back.nacht.fainted, 2);
  assert.equal(back.nacht.bumped, 5);
  assert.equal(normalizeEiland({}, CONFIG).honger, 100, 'an old save starts full');
  assert.equal(normalizeEiland({ honger: 500 }, CONFIG).honger, 100);
  const big = normalizeEiland({ bag: { hout: 55 }, tools: { rugzak: 1 } }, CONFIG);
  assert.equal(big.bag.hout, 55, 'with the big backpack 55 fits');
  assert.equal(normalizeEiland({ bag: { hout: 55 } }, CONFIG).bag.hout, 30, 'without it 30');
});
