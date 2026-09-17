// V9.8 (PLAN-V9 §D): the town climbs slower and every step opens the next. Prerequisites per maker, the three town
// works (vergunning, brug, kade), maintenance (one broken maker at a time, REPAREER), and what PAPA and the
// Bewaar-code carry of it.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../docs/js/economy.js';
import { CONFIG } from '../../docs/js/config.js';
import { normalize, encodeCode, decodeCode } from '../../docs/js/save.js';

const DAY = 86400000;
function withMaker(s, id, level) { return { ...s, makers: { ...s.makers, [id]: level } }; }
function rich(s, n = 1e9) { return { ...s, wallet: n, earnedWork: n, earnedPassive: n }; }

test('prerequisites: each maker waits for the one before it at level 2, the Fabriek for three makers at 2, the Flat for the Fabriek at 5 plus the vergunning', () => {
  let s = rich(E.createState(CONFIG, 0));
  assert.equal(E.isUnlocked(s, CONFIG, 'limonade'), true);
  assert.equal(E.isUnlocked(s, CONFIG, 'wasstraat'), false);
  assert.equal(E.isUnlocked(withMaker(s, 'limonade', 1), CONFIG, 'wasstraat'), false, 'level 1 is not enough');
  s = withMaker(s, 'limonade', 2);
  assert.equal(E.isUnlocked(s, CONFIG, 'wasstraat'), true);
  assert.equal(E.isUnlocked(s, CONFIG, 'pizzeria'), false);
  s = withMaker(s, 'wasstraat', 2);
  const o = E.makerOntbreekt(s, CONFIG, 'fabriek');
  assert.equal(o.soort, 'aantal', 'two makers at level 2 are not three');
  assert.equal(o.aantal, 3);
  s = withMaker(s, 'pizzeria', 2);
  assert.equal(E.isUnlocked(s, CONFIG, 'ijssalon'), true);
  assert.equal(E.isUnlocked(s, CONFIG, 'fabriek'), true, 'limonade, wasstraat and pizzeria are three makers at level 2');
  s = withMaker(s, 'fabriek', 5);
  assert.equal(E.makerOntbreekt(s, CONFIG, 'flat').soort, 'werk', 'the vergunning comes first');
  assert.equal(E.isUnlocked(s, CONFIG, 'flat'), false);
  const b = E.buyWerk(s, CONFIG, 'vergunning');
  assert.equal(b.ok, true);
  assert.equal(E.isUnlocked(b.state, CONFIG, 'flat'), true);
  assert.equal(E.makerOntbreekt(b.state, CONFIG, 'hotel').werk.id, 'brug');
  assert.equal(E.makerOntbreekt(b.state, CONFIG, 'haven').werk.id, 'kade');
});

test('town works: vergunning, then brug, then kade; each once; counted as investment; never with too few coins', () => {
  let s = rich(E.createState(CONFIG, 0), 200000);
  assert.equal(E.buyWerk(s, CONFIG, 'brug').reason, 'locked', 'the brug needs the vergunning');
  let r = E.buyWerk(s, CONFIG, 'vergunning');
  assert.equal(r.ok, true);
  assert.equal(r.state.wallet, 200000 - 5000);
  assert.equal(r.state.spentMakers, 5000);
  assert.equal(E.buyWerk(r.state, CONFIG, 'vergunning').reason, 'owned');
  r = E.buyWerk(r.state, CONFIG, 'brug');
  assert.equal(r.ok, true);
  assert.equal(E.buyWerk({ ...r.state, wallet: 10 }, CONFIG, 'kade').reason, 'coins');
  r = E.buyWerk(r.state, CONFIG, 'kade');
  assert.equal(r.ok, true);
  assert.equal(E.stats(r.state, CONFIG).werken, 3);
  assert.equal(E.buyWerk(s, CONFIG, 'nope').reason, 'unknown');
});

test('maintenance: nothing breaks on the first day or within it; from the next day a maker can break, never two at once', () => {
  const kans1 = { ...CONFIG, onderhoud: { ...CONFIG.onderhoud, kansPerDag: 1 } };
  let s = withMaker(withMaker(E.createState(kans1, 0), 'limonade', 2), 'wasstraat', 1);
  let r = E.advance(s, kans1, 10 * 60000);
  assert.equal(r.kapot, null, 'same day: nothing');
  assert.equal(E.kapotMaker(r.state), null);
  r = E.advance(r.state, kans1, DAY + 1000);
  assert.ok(r.kapot === 'limonade' || r.kapot === 'wasstraat', `day two with chance 1: one breaks (${r.kapot})`);
  const broken = r.kapot;
  assert.equal(E.passivePerMinute(r.state, kans1), E.passivePerMinute(s, kans1) - E.makerIncome(E.makerById(kans1, broken), s.makers[broken]), 'the broken one earns nothing');
  const again = E.advance(r.state, kans1, 2 * DAY + 1000);
  assert.equal(again.kapot, null, 'never a second one while one is broken');
  assert.equal(E.kapotMaker(again.state), broken);
  // the same day again: no second roll (deterministic per day)
  assert.equal(E.advance(again.state, kans1, 2 * DAY + 5000).kapot, null);
  // chance 0: never
  const kans0 = { ...CONFIG, onderhoud: { ...CONFIG.onderhoud, kansPerDag: 0 } };
  let t = withMaker(E.createState(kans0, 0), 'limonade', 1);
  for (let d = 1; d < 30; d++) { const a = E.advance(t, kans0, d * DAY + 1000); assert.equal(a.kapot, null); t = a.state; }
  // with no maker owned nothing can break
  assert.equal(E.advance(E.createState(kans1, 0), kans1, DAY + 1000).kapot, null);
});

test('REPAREER costs 15 % of the price, restores the income and counts on PAPA; a storm breaks the highest maker', () => {
  let s = rich(withMaker(withMaker(E.createState(CONFIG, 0), 'limonade', 2), 'pizzeria', 3), 1000);
  assert.equal(E.repareer(s, CONFIG).reason, 'heel');
  const k = E.maakKapot(s, CONFIG);
  assert.equal(k.id, 'pizzeria', 'the highest level breaks in a storm');
  assert.equal(E.maakKapot(k.state, CONFIG).id, null, 'not a second one');
  const perMin = E.passivePerMinute(k.state, CONFIG);
  assert.equal(perMin, E.makerIncome(E.makerById(CONFIG, 'limonade'), 2));
  const price = E.reparatiePrijs(E.makerById(CONFIG, 'pizzeria'), CONFIG);
  assert.equal(price, Math.ceil(400 * 0.15));
  assert.equal(E.repareer({ ...k.state, wallet: price - 1 }, CONFIG).reason, 'coins');
  const r = E.repareer(k.state, CONFIG);
  assert.equal(r.ok, true);
  assert.equal(r.state.wallet, 1000 - price);
  assert.equal(E.kapotMaker(r.state), null);
  assert.equal(E.passivePerMinute(r.state, CONFIG), perMin + E.makerIncome(E.makerById(CONFIG, 'pizzeria'), 3));
  const st = E.stats(r.state, CONFIG);
  assert.equal(st.spentRepairs, price);
  assert.equal(st.gerepareerd, 1);
  assert.equal(st.kapot, null);
  assert.equal(E.maakKapot(s, CONFIG, 'limonade').id, 'limonade', 'a named maker when asked');
});

test('save: works and maintenance survive normalize and the Bewaar-code; old saves get the defaults', () => {
  let s = rich(withMaker(E.createState(CONFIG, 1000), 'limonade', 3), 50000);
  s = E.buyWerk(s, CONFIG, 'vergunning').state;
  s = E.maakKapot(s, CONFIG).state;
  s = { ...s, onderhoud: { ...s.onderhoud, gerepareerd: 2, spentRepairs: 9 } };
  const n = normalize(JSON.parse(JSON.stringify(s)), CONFIG, 5000);
  assert.deepEqual(n.werken, { vergunning: true });
  assert.equal(n.onderhoud.kapot, 'limonade');
  assert.equal(n.onderhoud.gerepareerd, 2);
  assert.equal(n.onderhoud.spentRepairs, 9);
  const back = decodeCode(encodeCode(s, CONFIG), CONFIG, 5000);
  assert.deepEqual(back.werken, { vergunning: true });
  assert.equal(back.onderhoud.kapot, 'limonade');
  assert.equal(back.onderhoud.gerepareerd, 2);
  assert.equal(back.onderhoud.spentRepairs, 9);
  const old = normalize({ ...JSON.parse(JSON.stringify(E.createState(CONFIG, 0))), werken: undefined, onderhoud: undefined }, CONFIG, 7 * DAY);
  assert.deepEqual(old.werken, {});
  assert.equal(old.onderhoud.kapot, null);
  assert.equal(old.onderhoud.dag, 7, 'an old save starts its maintenance clock today, so nothing breaks the moment it loads');
  assert.equal(normalize({ ...JSON.parse(JSON.stringify(s)), onderhoud: { kapot: 'nope' } }, CONFIG, 0).onderhoud.kapot, null);
});
