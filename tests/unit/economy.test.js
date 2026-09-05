import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../../docs/js/config.js';
import * as E from '../../docs/js/economy.js';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

function withMaker(state, id, level) {
  return { ...state, makers: { ...state.makers, [id]: level } };
}

test('createState starts empty and unlocked only for the first maker', () => {
  const s = E.createState(CONFIG, 1000);
  assert.equal(s.wallet, 0);
  assert.equal(s.lastTick, 1000);
  assert.equal(E.passivePerMinute(s, CONFIG), 0);
  assert.equal(E.isUnlocked(s, CONFIG, 'limonade'), true);
  assert.equal(E.isUnlocked(s, CONFIG, 'wasstraat'), false);
});

test('income per tick: Limonadekraam level 1 makes 12 coins in one minute, 1 coin in 5 s', () => {
  let s = withMaker(E.createState(CONFIG, 0), 'limonade', 1);
  const r = E.advance(s, CONFIG, MIN);
  assert.equal(r.earned, 12);
  assert.equal(r.state.wallet, 12);
  assert.equal(r.state.earnedPassive, 12);
  assert.equal(r.offline, true); // exactly 60 s counts as an absence
  const r2 = E.advance(s, CONFIG, 5000);
  assert.equal(r2.earned, 1);
  assert.equal(r2.offline, false);
});

test('income adds up across makers and levels', () => {
  let s = E.createState(CONFIG, 0);
  s = withMaker(s, 'limonade', 2); // 18
  s = withMaker(s, 'wasstraat', 1); // 50
  assert.equal(E.passivePerMinute(s, CONFIG), 68);
  const r = E.advance(s, CONFIG, 30 * 1000);
  assert.equal(r.state.wallet, 34);
});

test('upgrade prices double per level: 40, 80, 160, 320 for the Limonadekraam', () => {
  const m = E.makerById(CONFIG, 'limonade');
  assert.deepEqual([1, 2, 3, 4].map((l) => E.upgradePrice(m, l)), [40, 80, 160, 320]);
});

test('per-level income tables follow base × 1 / 1.5 / 2.25 / 3.4 / 5 (rounded)', () => {
  for (const m of CONFIG.makers) {
    const base = m.income[0];
    const expected = [1, 1.5, 2.25, 3.4, 5].map((f) => Math.round(base * f));
    for (let i = 1; i < 5; i++) assert.ok(Math.abs(m.income[i] - expected[i]) <= 1, `${m.id} level ${i + 1}`);
  }
});

test('buying a maker needs coins and unlock; upgrading needs ownership and coins', () => {
  let s = E.createState(CONFIG, 0);
  let r = E.buyMaker(s, CONFIG, 'limonade');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'coins');
  assert.equal(r.missing, 20);
  s = { ...s, wallet: 25 };
  r = E.buyMaker(s, CONFIG, 'limonade');
  assert.equal(r.ok, true);
  assert.equal(r.state.wallet, 5);
  assert.equal(r.state.makers.limonade, 1);
  assert.equal(r.state.spentMakers, 20);
  assert.equal(E.buyMaker(r.state, CONFIG, 'limonade').reason, 'owned');
  // wasstraat locked until 120 earned
  const locked = E.buyMaker({ ...r.state, wallet: 500 }, CONFIG, 'wasstraat');
  assert.equal(locked.ok, false);
  assert.equal(locked.reason, 'locked');
  const unlockedState = { ...r.state, wallet: 500, earnedWork: 120 };
  assert.equal(E.buyMaker(unlockedState, CONFIG, 'wasstraat').ok, true);
  // upgrades
  assert.equal(E.upgradeMaker(s, CONFIG, 'limonade').reason, 'not-owned');
  const up = E.upgradeMaker({ ...r.state, wallet: 39 }, CONFIG, 'limonade');
  assert.equal(up.ok, false);
  assert.equal(up.missing, 1);
  const up2 = E.upgradeMaker({ ...r.state, wallet: 40 }, CONFIG, 'limonade');
  assert.equal(up2.ok, true);
  assert.equal(up2.state.makers.limonade, 2);
  assert.equal(up2.state.wallet, 0);
  const maxed = withMaker(r.state, 'limonade', CONFIG.maxLevel);   // V6.4: ten levels
  assert.equal(E.upgradeMaker({ ...maxed, wallet: 10000 }, CONFIG, 'limonade').reason, 'max');
});

test('unlock: next maker opens when total earned (work + passive) reaches its price', () => {
  let s = E.createState(CONFIG, 0);
  s = { ...s, earnedWork: 100, earnedPassive: 19 };
  assert.equal(E.isUnlocked(s, CONFIG, 'wasstraat'), false);
  s = { ...s, earnedPassive: 20 };
  assert.equal(E.isUnlocked(s, CONFIG, 'wasstraat'), true);
  assert.equal(E.isUnlocked(s, CONFIG, 'pizzeria'), false);
  assert.equal(E.nextMakerTarget(s, CONFIG).maker.id, 'limonade');
  assert.equal(E.nextMakerTarget(s, CONFIG).missing, 20);
});

test('fun purchases: fixed price, equip exclusive kinds, toggle garden items, missing amount', () => {
  let s = { ...E.createState(CONFIG, 0), wallet: 50 };
  let r = E.buyFun(s, CONFIG, 'kroon'); // 60
  assert.equal(r.ok, false);
  assert.equal(r.missing, 10);
  r = E.buyFun(s, CONFIG, 'pet'); // 15
  assert.equal(r.ok, true);
  assert.equal(r.state.wallet, 35);
  assert.equal(r.state.spentFun, 15);
  assert.equal(r.state.equipped.hat, 'pet');
  assert.equal(E.buyFun(r.state, CONFIG, 'pet').reason, 'owned');
  const r2 = E.buyFun(r.state, CONFIG, 'strohoed'); // 20 → replaces the hat
  assert.equal(r2.state.equipped.hat, 'strohoed');
  const toggled = E.toggleFun(r2.state, CONFIG, 'pet');
  assert.equal(toggled.equipped.hat, 'pet');
  const off = E.toggleFun(toggled, CONFIG, 'pet');
  assert.equal(off.equipped.hat, null);
  // garden
  const g = E.buyFun({ ...off, wallet: 100 }, CONFIG, 'bloemen');
  assert.equal(E.isFunActive(g.state, CONFIG, 'bloemen'), true);
  const gh = E.toggleFun(g.state, CONFIG, 'bloemen');
  assert.equal(E.isFunActive(gh, CONFIG, 'bloemen'), false);
  assert.equal(E.isFunActive(E.toggleFun(gh, CONFIG, 'bloemen'), CONFIG, 'bloemen'), true);
});

test('pet food is auto-paid every 2 minutes, wallet never negative, pet sleeps when broke and wakes when coins return', () => {
  let s = E.createState(CONFIG, 0);
  s = { ...s, fun: { hond: true }, wallet: 12 };
  let r = E.advance(s, CONFIG, 2 * MIN); // one meal: -5
  assert.equal(r.state.wallet, 7);
  assert.equal(r.foodPaid, 5);
  assert.equal(r.state.petHungry, false);
  r = E.advance(r.state, CONFIG, 4 * MIN); // second meal: -5 → 2
  assert.equal(r.state.wallet, 2);
  r = E.advance(r.state, CONFIG, 6 * MIN); // third meal cannot be paid
  assert.equal(r.state.wallet, 2);
  assert.equal(r.state.petHungry, true);
  assert.ok(r.state.wallet >= 0);
  // coins from work → pet is fed on the next tick
  let fed = E.washCar({ ...r.state, work: { sessionStart: 6 * MIN, log: [] } }, CONFIG, 6 * MIN + 1000); // +2 → 4, still < 5
  fed = E.washCar(fed, CONFIG, 6 * MIN + 2000); // +2 → 6
  const after = E.advance(fed, CONFIG, 6 * MIN + 3000);
  assert.equal(after.state.petHungry, false);
  assert.equal(after.state.wallet, 1);
  // two pets cost 10 per meal
  let two = { ...E.createState(CONFIG, 0), fun: { hond: true, kat: true }, wallet: 100 };
  assert.equal(E.advance(two, CONFIG, 2 * MIN).state.wallet, 90);
  // no pets: no cost, no timer
  const none = E.advance({ ...E.createState(CONFIG, 0), wallet: 3 }, CONFIG, HOUR);
  assert.equal(none.state.wallet, 3);
});

test('offline earnings: 1 h gives 1 h of income, 5 h is capped at 4 h, popup flag from 60 s', () => {
  const s = withMaker(E.createState(CONFIG, 0), 'limonade', 1); // 12/min
  const oneHour = E.advance(s, CONFIG, HOUR);
  assert.equal(oneHour.earned, 720);
  assert.equal(oneHour.offline, true);
  assert.equal(oneHour.elapsedMs, HOUR);
  const fiveHours = E.advance(s, CONFIG, 5 * HOUR);
  assert.equal(fiveHours.earned, 2880); // 4 h cap
  assert.equal(fiveHours.elapsedMs, 4 * HOUR);
  assert.equal(fiveHours.rawElapsedMs, 5 * HOUR);
  assert.equal(fiveHours.state.earnedOffline, 2880);
  assert.equal(fiveHours.state.playTimeMs, 0); // absences do not count as play time
  const short = E.advance(s, CONFIG, 59 * 1000);
  assert.equal(short.offline, false);
  assert.equal(short.state.playTimeMs, 59 * 1000);
  // time never runs backwards
  const back = E.advance({ ...s, lastTick: 10 * MIN }, CONFIG, 5 * MIN);
  assert.equal(back.earned, 0);
  assert.equal(back.state.lastTick, 5 * MIN);
});

test('washCar pays 2 coins and tracks the best trailing-60 s work rate', () => {
  let s = E.startWork(E.createState(CONFIG, 0), 0);
  // one car every 4 s for 60 s → 15 cars → 30 coins/min
  for (let t = 4000; t <= 60000; t += 4000) s = E.washCar(s, CONFIG, t);
  assert.equal(s.carsWashed, 15);
  assert.equal(s.wallet, 30);
  assert.equal(s.earnedWork, 30);
  assert.equal(s.bestWorkRate, 30);
  // a slower later window does not lower the best rate
  s = E.washCar(s, CONFIG, 200000);
  assert.equal(s.bestWorkRate, 30);
  // no extrapolation: one car 3 s into a session counts as 2 coins in the window, not as 40/min
  let q = E.startWork(E.createState(CONFIG, 0), 0);
  q = E.washCar(q, CONFIG, 3000);
  assert.equal(q.bestWorkRate, 2);
  const ended = E.endWork(q);
  assert.equal(ended.work.sessionStart, null);
  assert.equal(ended.bestWorkRate, 2);
  // a quick burst (8 cars at the 4 s floor) reads as 16 coins in the window, not as a full minute of work
  let b = E.startWork(E.createState(CONFIG, 0), 0);
  for (let i = 0; i < 8; i++) b = E.washCar(b, CONFIG, 2500 + i * 4000);
  assert.equal(b.bestWorkRate, 16);
  // the rate can never exceed the pace ceiling (a car every minCycleMs → 30/min)
  assert.equal(E.workCeiling(CONFIG), 30);
  let f = E.startWork(E.createState(CONFIG, 0), 0);
  for (let t = 1000; t <= 60000; t += 1000) f = E.washCar(f, CONFIG, t);
  assert.equal(f.bestWorkRate, 30);
});

test('milestones fire once, in order of achievement', () => {
  let s = E.createState(CONFIG, 0);
  assert.deepEqual(E.checkMilestones(s, CONFIG).unlocked, []);
  s = withMaker(s, 'limonade', 1);
  let r = E.checkMilestones(s, CONFIG);
  assert.deepEqual(r.unlocked, ['eerste-geldmaker']);
  s = r.state;
  assert.deepEqual(E.checkMilestones(s, CONFIG).unlocked, []);
  // passive beats work needs a work rate and a real work record (≥ tiredAfterCars cars)
  s = { ...s, bestWorkRate: 15, carsWashed: CONFIG.work.tiredAfterCars };
  assert.deepEqual(E.checkMilestones(s, CONFIG).unlocked, []); // 12 < 15
  s = withMaker(s, 'limonade', 2); // 18 > 15
  assert.deepEqual(E.checkMilestones({ ...s, carsWashed: 3 }, CONFIG).unlocked, [], 'too little work: no sticker yet');
  r = E.checkMilestones(s, CONFIG);
  assert.deepEqual(r.unlocked, ['geld-werkt']);
  // a slow worker who buys the first maker: the maker sticker comes alone, "geld werkt" follows on the next check
  const slow = { ...E.createState(CONFIG, 0), bestWorkRate: 8, carsWashed: 12 };
  const both = E.checkMilestones(withMaker(slow, 'limonade', 1), CONFIG);
  assert.deepEqual(both.unlocked, ['eerste-geldmaker']);
  assert.deepEqual(E.checkMilestones(both.state, CONFIG).unlocked, ['geld-werkt']);
  s = { ...r.state, earnedWork: 600, earnedPassive: 400 };
  assert.deepEqual(E.checkMilestones(s, CONFIG).unlocked, ['duizend']);
  s = withMaker(s, 'limonade', 5);
  assert.ok(E.checkMilestones(s, CONFIG).unlocked.includes('level-5'));
  for (const m of CONFIG.makers) s = withMaker(s, m.id, 1);
  assert.ok(E.checkMilestones(s, CONFIG).unlocked.includes('alle-geldmakers'));
  s = { ...s, earnedPassive: 100000 };
  assert.ok(E.checkMilestones(s, CONFIG).unlocked.includes('honderdduizend'));
});

test('formatCoins: integers, thin-space thousands, never abbreviated', () => {
  assert.equal(E.formatCoins(0), '0');
  assert.equal(E.formatCoins(999), '999');
  const T = E.THIN_SPACE;
  assert.equal(T, ' ');
  assert.equal(E.formatCoins(1000), '1' + T + '000');
  assert.equal(E.formatCoins(12345.9), '12' + T + '345');
  assert.equal(E.formatCoins(1234567), '1' + T + '234' + T + '567');
  assert.equal(E.formatCoins(-5), '0');
  assert.equal(E.formatCoins(NaN), '0');
  assert.ok(!/[kKmM]/.test(E.formatCoins(2500000)));
});

test('functions never mutate their input', () => {
  const s = Object.freeze({ ...E.createState(CONFIG, 0), wallet: 1000, earnedWork: 1000, work: Object.freeze({ sessionStart: 0, log: [] }) });
  E.advance(s, CONFIG, 5000);
  E.buyMaker(s, CONFIG, 'limonade');
  E.buyFun(s, CONFIG, 'pet');
  E.washCar(s, CONFIG, 4000);
  E.checkMilestones(withMaker(s, 'limonade', 1), CONFIG);
  assert.equal(s.wallet, 1000);
});

test('stats summarise the numbers for PAPA', () => {
  let s = { ...E.createState(CONFIG, 0), earnedWork: 100.7, earnedPassive: 250.2, spentFun: 30, spentMakers: 20 };
  s = withMaker(s, 'limonade', 1);
  const st = E.stats(s, CONFIG);
  assert.equal(st.earnedWork, 100);
  assert.equal(st.earnedPassive, 250);
  assert.equal(st.perMinute, 12);
  assert.equal(st.makersOwned, 1);
});
