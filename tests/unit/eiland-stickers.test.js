// R6: the island's stickers (first night, 100 coins on the island, five quests) fire once, and the PAPA stats carry
// the island numbers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../../docs/js/config.js';
import { createState, checkMilestones, stats } from '../../docs/js/economy.js';
import { T } from '../../docs/js/i18n.js';

test('island stickers: eerste-nacht, eiland-verkoper, vijf-opdrachten', () => {
  const s0 = createState(CONFIG, 0);
  assert.deepEqual(checkMilestones(s0, CONFIG).unlocked, []);
  const night = { ...s0, nacht: { ...s0.nacht, nights: 1 } };
  assert.deepEqual(checkMilestones(night, CONFIG).unlocked, ['eerste-nacht']);
  const sold = { ...s0, eiland: { ...s0.eiland, earned: 100 } };
  assert.deepEqual(checkMilestones(sold, CONFIG).unlocked, ['eiland-verkoper']);
  const quests = { ...s0, eiland: { ...s0.eiland, questsDone: 5 } };
  assert.deepEqual(checkMilestones(quests, CONFIG).unlocked, ['vijf-opdrachten']);
  const both = checkMilestones({ ...night, eiland: { ...s0.eiland, earned: 250, questsDone: 7 } }, CONFIG);
  assert.deepEqual(both.unlocked.sort(), ['eerste-nacht', 'eiland-verkoper', 'vijf-opdrachten']);
  assert.deepEqual(checkMilestones(both.state, CONFIG).unlocked, [], 'only once');
  for (const m of CONFIG.milestones) {
    assert.ok(T.milestones[m.id], `Muntje has a line for ${m.id}`);
    assert.ok(m.sticker && m.title);
  }
});

test('PAPA stats include the island', () => {
  const s = createState(CONFIG, 0);
  s.nacht = { ...s.nacht, nights: 3, stolen: 2 };
  s.eiland = { ...s.eiland, earned: 77, questsDone: 4, tools: { bijl: true, tent: true } };
  const st = stats(s, CONFIG);
  assert.equal(st.nights, 3);
  assert.equal(st.stolen, 2);
  assert.equal(st.islandEarned, 77);
  assert.equal(st.questsDone, 4);
  assert.equal(st.tools, 2);
  for (const k of ['nights', 'islandEarned', 'questsDone', 'stolen', 'tools', 'fainted', 'bumped', 'honger']) assert.ok(T.papa.stats[k], k);
  assert.equal(st.fainted, 0);
  assert.equal(st.honger, 100);
  assert.ok(T.papa.busy.includes('{naam}'));
});
