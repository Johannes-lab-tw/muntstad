// The island's economy (docs/js/eiland.js): the backpack fills up to bagMax, selling at the campfire pays into the
// shared wallet, tools cost coins and change the chop rule, quests count what you collect, and the Bewaar-code
// carries the island along.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../../docs/js/config.js';
import { createState } from '../../docs/js/economy.js';
import { encodeCode, decodeCode, normalize } from '../../docs/js/save.js';
import { createEiland, collect, bagCount, bagValue, sellAll, buyTool, chopRule, completeQuest, currentQuest, normalizeEiland } from '../../docs/js/eiland.js';

test('a fresh state has an empty backpack, no tools and the first quest', () => {
  const s = createState(CONFIG, 0);
  assert.deepEqual(s.eiland.bag, { hout: 0, schelp: 0, bes: 0, vis: 0 });
  assert.deepEqual(s.eiland.tools, {});
  assert.equal(currentQuest(s.eiland, CONFIG).index, 0);
  assert.ok(CONFIG.eiland.quests.length >= 12, 'Ollama wrote the quests');
  for (const q of CONFIG.eiland.quests) {
    assert.ok(q.item in CONFIG.eiland.items, q.item);
    assert.ok(q.n >= 3 && q.n <= 12);
    assert.ok(q.tekst.length <= 60 && q.klaar.length <= 60, q.tekst);
    assert.ok(!/[A-Za-z]+ing\b|\bthe\b|\byou\b/.test(q.tekst), `English in ${q.tekst}`);
  }
});

test('collecting fills the backpack up to bagMax; selling empties it into the wallet as work income', () => {
  let e = createEiland(CONFIG);
  let r = collect(e, CONFIG, 'hout', 5);
  assert.equal(r.added, 5);
  e = r.eiland;
  r = collect(e, CONFIG, 'schelp', 100);
  assert.equal(r.added, CONFIG.eiland.bagMax - 5, 'only what fits');
  e = r.eiland;
  assert.equal(bagCount(e), CONFIG.eiland.bagMax);
  assert.equal(collect(e, CONFIG, 'vis', 1).added, 0, 'full');
  assert.equal(collect(e, CONFIG, 'goud', 1).added, 0, 'unknown item');
  const value = 5 * CONFIG.eiland.items.hout.price + 25 * CONFIG.eiland.items.schelp.price;
  assert.equal(bagValue(e, CONFIG), value);
  const s = { ...createState(CONFIG, 0), eiland: e, wallet: 10, earnedWork: 3 };
  const sold = sellAll(s, CONFIG);
  assert.equal(sold.coins, value);
  assert.equal(sold.state.wallet, 10 + value);
  assert.equal(sold.state.earnedWork, 3 + value);
  assert.equal(bagCount(sold.state.eiland), 0);
  assert.equal(sold.state.eiland.sold, value);
  assert.equal(sellAll(sold.state, CONFIG).coins, 0);
});

test('the axe costs coins, pays back by doubling the wood per chop, and cannot be bought twice', () => {
  const s0 = { ...createState(CONFIG, 0), wallet: 50 };
  const no = buyTool(s0, CONFIG, 'bijl');
  assert.equal(no.ok, false);
  assert.equal(no.reason, 'coins');
  assert.equal(no.missing, 10);
  const s1 = { ...s0, wallet: 60 };
  assert.deepEqual(chopRule(s1.eiland, CONFIG), CONFIG.eiland.chop.hands);
  const yes = buyTool(s1, CONFIG, 'bijl');
  assert.ok(yes.ok);
  assert.equal(yes.state.wallet, 0);
  assert.equal(yes.state.spentFun, 60);
  assert.deepEqual(chopRule(yes.state.eiland, CONFIG), CONFIG.eiland.chop.withAxe);
  assert.equal(buyTool({ ...yes.state, wallet: 500 }, CONFIG, 'bijl').reason, 'owned');
  assert.equal(buyTool(s1, CONFIG, 'raket').reason, 'unknown');
  // the lesson: with the axe, 6 taps give 12 wood instead of 2
  const hands = Math.floor(6 / CONFIG.eiland.chop.hands.taps) * CONFIG.eiland.chop.hands.wood;
  const axe = Math.floor(6 / CONFIG.eiland.chop.withAxe.taps) * CONFIG.eiland.chop.withAxe.wood;
  assert.ok(axe >= hands * 4, `${axe} vs ${hands}`);
});

test('a quest counts its item, pays a bonus when done and moves on to the next', () => {
  let s = createState(CONFIG, 0);
  const q = currentQuest(s.eiland, CONFIG);
  let r;
  for (let i = 0; i < q.n - 1; i++) { r = collect(s.eiland, CONFIG, q.item, 1); s = { ...s, eiland: r.eiland }; assert.equal(r.questDone, -1); }
  r = collect(s.eiland, CONFIG, q.item, 1);
  assert.equal(r.questDone, 0);
  s = { ...s, eiland: r.eiland };
  assert.equal(completeQuest({ ...createState(CONFIG, 0) }, CONFIG).reward, 0, 'not done yet: no reward');
  const done = completeQuest(s, CONFIG);
  assert.equal(done.reward, q.n * CONFIG.eiland.items[q.item].price * CONFIG.eiland.questBonus);
  assert.equal(done.state.wallet, done.reward);
  assert.equal(done.state.eiland.quest, 1);
  assert.equal(done.state.eiland.questN, 0);
  assert.equal(done.state.eiland.questsDone, 1);
  // a different item does not count
  const other = Object.keys(CONFIG.eiland.items).find((id) => id !== CONFIG.eiland.quests[1].item);
  assert.equal(collect(done.state.eiland, CONFIG, other, 3).eiland.questN, 0);
});

test('the Bewaar-code and normalize carry the island along and clamp nonsense', () => {
  let s = { ...createState(CONFIG, 0), wallet: 200 };
  s = { ...s, eiland: collect(s.eiland, CONFIG, 'vis', 4).eiland };
  s = buyTool(s, CONFIG, 'bijl').state;
  s.eiland = { ...s.eiland, quest: 3, questN: 2, questsDone: 3, sold: 44, earned: 60 };
  const back = decodeCode(encodeCode(s, CONFIG), CONFIG, 0);
  assert.deepEqual(back.eiland.bag, { hout: 0, schelp: 0, bes: 0, vis: 4 });
  assert.deepEqual(back.eiland.tools, { bijl: true });
  assert.equal(back.eiland.quest, 3);
  assert.equal(back.eiland.questN, 2);
  assert.equal(back.eiland.questsDone, 3);
  assert.equal(back.eiland.sold, 44);
  const n = normalizeEiland({ bag: { hout: 999, schelp: -3, goud: 5 }, tools: { bijl: 1, raket: 1 }, quest: 999, questN: 999 }, CONFIG);
  assert.equal(bagCount(n), CONFIG.eiland.bagMax);
  assert.deepEqual(n.tools, { bijl: true });
  assert.ok(n.quest < CONFIG.eiland.quests.length);
  assert.ok(n.questN <= CONFIG.eiland.quests[n.quest].n);
  const old = normalize({ ...createState(CONFIG, 0), eiland: undefined }, CONFIG, 0);
  assert.deepEqual(old.eiland, createEiland(CONFIG), 'a save from before R3 gets a fresh island');
});
