// The savings bank (V6.4, docs/js/economy.js): coins in the pot grow 5 % per calendar day, compounded and capped; you
// can put in what is in the wallet and take everything out; the pot survives the save and the Bewaar-code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../../docs/js/config.js';
import { createState, createBank, bankDeposit, bankWithdraw, bankGrow, dayIndex, stats } from '../../docs/js/economy.js';
import { encodeCode, decodeCode, normalize } from '../../docs/js/save.js';

const DAY = 86400000;

test('deposit takes whole coins from the wallet, never more than you have; withdraw returns everything', () => {
  let s = { ...createState(CONFIG, 0), wallet: 250.7 };
  let r = bankDeposit(s, CONFIG, 100);
  assert.ok(r.ok); assert.equal(r.n, 100); assert.equal(r.state.bank.saldo, 100); assert.ok(Math.abs(r.state.wallet - 150.7) < 1e-9);
  r = bankDeposit(r.state, CONFIG, 1000);
  assert.equal(r.n, 150, 'only what is there'); assert.equal(r.state.bank.saldo, 250);
  assert.equal(bankDeposit(r.state, CONFIG, 100).ok, false, 'an empty wallet puts nothing in');
  const w = bankWithdraw(r.state);
  assert.ok(w.ok); assert.equal(w.n, 250); assert.equal(w.state.bank.saldo, 0); assert.ok(Math.abs(w.state.wallet - 250.7) < 1e-9);
  assert.equal(bankWithdraw(w.state).ok, false);
});

test('the pot grows 5 % per calendar day, compounded, counts as passive income, and stops at the cap', () => {
  const now = 10 * DAY + 3600000;
  let s = { ...createState(CONFIG, now), wallet: 1000 };
  s = bankDeposit(s, CONFIG, 1000).state;
  assert.equal(bankGrow(s, CONFIG, now).growth, 0, 'the same day: nothing yet');
  const one = bankGrow(s, CONFIG, now + DAY);
  assert.equal(one.growth, 50);
  assert.equal(one.state.bank.saldo, 1050);
  assert.equal(one.state.bank.earned, 50);
  assert.equal(one.state.earnedPassive, s.earnedPassive + 50);
  const three = bankGrow(s, CONFIG, now + 3 * DAY);
  assert.equal(three.growth, Math.floor(1000 * 1.05 ** 3 - 1000));
  assert.equal(three.state.bank.lastGrowDay, dayIndex(now + 3 * DAY));
  // a second call the same day adds nothing
  assert.equal(bankGrow(three.state, CONFIG, now + 3 * DAY).growth, 0);
  // the cap
  const big = { ...s, bank: { saldo: CONFIG.bank.max - 10, lastGrowDay: dayIndex(now), earned: 0 } };
  assert.equal(bankGrow(big, CONFIG, now + DAY).state.bank.saldo, CONFIG.bank.max);
  // an empty pot never grows
  assert.equal(bankGrow(createState(CONFIG, now), CONFIG, now + 5 * DAY).growth, 0);
  assert.ok(CONFIG.bank.ratePerDay > 0 && CONFIG.bank.ratePerDay <= 0.1, 'a fair, safe rate');
});

test('the pot survives the save, the Bewaar-code and nonsense; PAPA sees the saldo and the interest', () => {
  const now = 20 * DAY;
  let s = { ...createState(CONFIG, now), wallet: 5000 };
  s = bankDeposit(s, CONFIG, 3000).state;
  s = bankGrow(s, CONFIG, now + 2 * DAY).state;
  const back = decodeCode(encodeCode(s, CONFIG), CONFIG, now + 2 * DAY);
  assert.equal(back.bank.saldo, s.bank.saldo);
  assert.equal(back.bank.earned, s.bank.earned);
  assert.equal(back.bank.lastGrowDay, s.bank.lastGrowDay);
  const n = normalize({ ...s, bank: { saldo: -5, lastGrowDay: 9999999, earned: 'x' } }, CONFIG, now);
  assert.equal(n.bank.saldo, 0); assert.equal(n.bank.earned, 0); assert.ok(n.bank.lastGrowDay <= dayIndex(now), 'never a day in the future');
  const old = normalize({ ...s, bank: undefined }, CONFIG, now);
  assert.deepEqual(old.bank, createBank(now), 'an old save starts with an empty pot');
  const st = stats(s, CONFIG);
  assert.equal(st.bankSaldo, s.bank.saldo); assert.equal(st.bankEarned, s.bank.earned);
});
