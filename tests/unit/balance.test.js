// The lesson, proven: over a 20-minute session an Investor (10 min coin-makers, then fun)
// ends up with far more fun than a Spender who buys fun whenever affordable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBoth, ratios, table } from '../../scripts/simulate.js';

const results = runBoth({ minutes: 20, workRate: 15 });
const r = ratios(results);

test('balance table (printed for RAPPORT.md)', () => {
  console.log('\n' + table(results) + '\n');
  assert.ok(results.investor.earned > 0 && results.spender.earned > 0);
});

test('Investor spends at least 3× the coins on LEUK compared to the Spender', () => {
  assert.ok(r.funCoins >= 3, `ratio ${r.funCoins.toFixed(2)} (investor ${results.investor.spentFun}, spender ${results.spender.spentFun})`);
});

test('Investor owns at least 1.5× the distinct fun items', () => {
  assert.ok(r.funItems >= 1.5, `ratio ${r.funItems.toFixed(2)} (investor ${results.investor.funItems}, spender ${results.spender.funItems})`);
});

test("Investor's passive income overtakes work income within 4 minutes", () => {
  assert.ok(results.investor.overtakeMin != null, 'never overtook');
  assert.ok(results.investor.overtakeMin <= 4, `overtook at ${results.investor.overtakeMin} min`);
});

test('Spender is never stuck: wallet never negative, WERK always progresses', () => {
  assert.equal(results.spender.stuck, false);
  assert.ok(results.spender.minWallet >= 0);
  assert.ok(results.spender.carsWashed >= 140, `cars ${results.spender.carsWashed}`);
  assert.equal(results.investor.stuck, false);
});

test('margins: the assertions hold with room to spare and at a slower and a faster child', () => {
  assert.ok(r.funCoins >= 3.3, `coins ratio only ${r.funCoins.toFixed(2)}`);
  assert.ok(r.funItems >= 1.8, `items ratio only ${r.funItems.toFixed(2)}`);
  // A slower or faster child still learns the lesson; a fast tapper (20/min) needs the Wasstraat
  // to be overtaken, which lands around 5.5 min with the spec's prices — the 4-minute promise is for the 15/min child.
  for (const workRate of [10, 20, 25]) {
    const rr = ratios(runBoth({ minutes: 20, workRate }));
    assert.ok(rr.funCoins >= 3, `workRate ${workRate}: coins ratio ${rr.funCoins.toFixed(2)}`);
    assert.ok(rr.funItems >= 1.5, `workRate ${workRate}: items ratio ${rr.funItems.toFixed(2)}`);
    assert.ok(rr.overtakeMin != null && rr.overtakeMin <= 6, `workRate ${workRate}: overtake ${rr.overtakeMin}`);
  }
});

test('the catalogue never runs out during the simulation', () => {
  const total = results.investor.funItems;
  assert.ok(total < 38, 'investor bought the whole catalogue: add items');
});
