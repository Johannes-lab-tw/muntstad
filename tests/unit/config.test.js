import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../../docs/js/config.js';

test('every price and income is a positive integer', () => {
  for (const m of CONFIG.makers) {
    assert.ok(Number.isInteger(m.price) && m.price > 0, m.id);
    assert.equal(m.income.length, CONFIG.maxLevel, m.id);
    for (const inc of m.income) assert.ok(Number.isInteger(inc) && inc > 0, `${m.id} income ${inc}`);
    for (let i = 1; i < m.income.length; i++) assert.ok(m.income[i] > m.income[i - 1], `${m.id} income must grow`);
  }
  for (const f of CONFIG.fun) assert.ok(Number.isInteger(f.price) && f.price > 0, f.id);
});

test('ids are unique across makers, fun items and milestones', () => {
  const ids = [...CONFIG.makers, ...CONFIG.fun, ...CONFIG.milestones].map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('makers are ordered by price and the first one is cheap enough for a minute of work', () => {
  for (let i = 1; i < CONFIG.makers.length; i++) assert.ok(CONFIG.makers[i].price > CONFIG.makers[i - 1].price);
  assert.ok(CONFIG.makers[0].price <= 30);
});

test('LEUK catalogue has at least 30 items with the price ranges of the spec', () => {
  assert.ok(CONFIG.fun.length >= 30, `only ${CONFIG.fun.length} items`);
  const inRange = (kind, lo, hi) => CONFIG.fun.filter((f) => f.kind === kind).every((f) => f.price >= lo && f.price <= hi);
  assert.ok(inRange('hat', 15, 60));
  assert.ok(inRange('skin', 40, 80));
  assert.ok(inRange('garden', 30, 120));
  assert.ok(inRange('pet', 80, 200));
  assert.ok(CONFIG.fun.filter((f) => f.kind === 'pet').length >= 3);
  assert.equal(CONFIG.fun.find((f) => f.id === 'scooter').price, 150);
  assert.equal(CONFIG.fun.find((f) => f.id === 'auto').price, 500);
  assert.equal(CONFIG.fun.find((f) => f.id === 'trampoline').price, 300);
  assert.equal(CONFIG.fun.find((f) => f.id === 'vuurwerk').price, 30);
  for (const f of CONFIG.fun) assert.ok(['hat', 'skin', 'vehicle', 'paint', 'garden', 'pet', 'show', 'dance', 'toy'].includes(f.kind), f.id);
});

test('names are short Dutch words (no English UI words)', () => {
  const english = /\b(buy|shop|work|settings|continue|back|play|house|car|hat|dog|cat)\b/i;
  for (const x of [...CONFIG.makers, ...CONFIG.fun]) {
    assert.ok(!english.test(x.name), `${x.id}: ${x.name}`);
    assert.ok(x.name.split(' ').length <= 2, `${x.id}: name too long`);
  }
});

test('caps and timings match the spec', () => {
  assert.equal(CONFIG.offlineCapMs, 4 * 60 * 60 * 1000);
  assert.equal(CONFIG.offlinePopupMinMs, 60 * 1000);
  assert.equal(CONFIG.pet.foodCost, 5);
  assert.equal(CONFIG.pet.foodIntervalMs, 2 * 60 * 1000);
  assert.equal(CONFIG.mentor.tipGapMs, 90 * 1000);
  assert.equal(CONFIG.papa.holdMs, 3000);
  assert.equal(CONFIG.work.coinsPerCar, 2);
  assert.equal(CONFIG.milestones.length, 9);   // 6 town stickers + 3 island stickers (PLAN-V4 R6)
});
