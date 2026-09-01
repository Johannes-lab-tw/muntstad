// The lesson, proven: over a 20-minute session an Investor (10 min coin-makers, then fun)
// ends up with far more fun than a Spender who buys fun whenever affordable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../../docs/js/config.js';
import { runBoth, ratios, table } from '../../scripts/simulate.js';

const results = runBoth({ minutes: 20, workRate: 15 });
const r = ratios(results);

function lessonHolds(res, label, { overtakeMax = 4 } = {}) {
  const x = ratios(res);
  assert.ok(x.funCoins >= 3, `${label}: coins ratio ${x.funCoins.toFixed(2)} (investor ${res.investor.spentFun}, spender ${res.spender.spentFun})`);
  assert.ok(x.funItems >= 1.5, `${label}: items ratio ${x.funItems.toFixed(2)} (investor ${res.investor.funItems}, spender ${res.spender.funItems})`);
  assert.ok(x.overtakeMin != null && x.overtakeMin <= overtakeMax, `${label}: overtake ${x.overtakeMin} min`);
  assert.ok(res.investor.funItems < CONFIG.fun.length, `${label}: the catalogue ran out — add items`);
  assert.equal(res.spender.stuck, false, `${label}: spender stuck`);
  assert.equal(res.investor.stuck, false, `${label}: investor stuck`);
  assert.ok(res.spender.minWallet >= 0 && res.investor.minWallet >= 0, `${label}: wallet went negative`);
}

test('balance table (printed for RAPPORT.md)', () => {
  console.log('\n' + table(results) + '\n');
  assert.ok(results.investor.earned > 0 && results.spender.earned > 0);
});

test('Investor spends at least 3× the coins on LEUK compared to the Spender', () => {
  assert.ok(r.funCoins >= 3, `ratio ${r.funCoins.toFixed(2)}`);
});

test('Investor owns at least 1.5× the distinct fun items', () => {
  assert.ok(r.funItems >= 1.5, `ratio ${r.funItems.toFixed(2)}`);
});

test("Investor's passive income overtakes work income within 4 minutes", () => {
  assert.ok(results.investor.overtakeMin != null, 'never overtook');
  assert.ok(results.investor.overtakeMin <= 4, `overtook at ${results.investor.overtakeMin} min`);
});

test('nobody is ever stuck: wallet never negative, WERK keeps paying, catalogue never runs out', () => {
  lessonHolds(results, 'baseline');
  assert.ok(results.spender.carsWashed >= 140, `cars ${results.spender.carsWashed}`);
});

test('margins: the baseline holds with room to spare', () => {
  assert.ok(r.funCoins >= 3.3, `coins ratio only ${r.funCoins.toFixed(2)}`);
  assert.ok(r.funItems >= 1.8, `items ratio only ${r.funItems.toFixed(2)}`);
});

test('both readings of "shortest payback" pass: save for the best unlocked option, or best among affordable', () => {
  lessonHolds(runBoth({ minutes: 20, workRate: 15, policy: 'affordable' }), 'policy=affordable');
});

test('bursty work (8 cars at the 4 s floor, then a pause, same 15/min average) still teaches the lesson', () => {
  // a burst reads as a higher work rate than even pacing, so the overtake may need the Wasstraat (≈ 6 min)
  lessonHolds(runBoth({ minutes: 20, workRate: 15, pacing: 'burst' }), 'pacing=burst', { overtakeMax: 6.5 });
});

test('with a pet, food is paid automatically and the lesson still holds', () => {
  const res = runBoth({ minutes: 20, workRate: 15, petFirst: true });
  assert.ok(res.investor.spentFood > 0, 'investor never paid food');
  assert.ok(res.spender.spentFood > 0, 'spender never paid food');
  lessonHolds(res, 'petFirst');
});

test('a slower (10/min) and a faster (20/min) child still learn the lesson', () => {
  // the 4-minute promise is for the 15/min child; a fast tapper needs the Wasstraat to be overtaken (≈ 5.5 min)
  lessonHolds(runBoth({ minutes: 20, workRate: 10 }), 'workRate=10');
  lessonHolds(runBoth({ minutes: 20, workRate: 20 }), 'workRate=20', { overtakeMax: 6 });
});
