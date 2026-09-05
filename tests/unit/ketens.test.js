// Muntje's quest chains (docs/js/ketens.js + docs/content/ketens.js, V6.2): every chain Ollama wrote is playable with
// what the island has, the score moves step by step, and the reward comes at the end of the chain.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../../docs/js/config.js';
import { createState } from '../../docs/js/economy.js';
import { encodeCode, decodeCode } from '../../docs/js/save.js';
import { KETENS } from '../../docs/content/ketens.js';
import { validateKetens, currentKeten, ketenEvent, stapTelt, plekAt, PLEKKEN, SOORTEN } from '../../docs/js/ketens.js';
import { LAKE, CAVE, CAMP } from '../../docs/js/3d/heightmap.js';

test('the content: at least twelve chains, every step a known kind with things the island has, Dutch and short', () => {
  const errs = validateKetens(KETENS, CONFIG);
  assert.deepEqual(errs, []);
  assert.ok(KETENS.length >= 12);
  const kinds = new Set(KETENS.flatMap((k) => k.stappen.map((s) => s.soort)));
  for (const s of ['verzamel', 'stook', 'vuur', 'kook', 'nacht', 'ontdek', 'verkoop']) assert.ok(kinds.has(s), `a chain uses ${s}`);
  // the first chain is easy, the last one heavy
  assert.ok(KETENS[0].beloning < KETENS[KETENS.length - 1].beloning);
  // the validator really checks: a broken chain is caught
  assert.ok(validateKetens([{ ...KETENS[0], stappen: [{ soort: 'vliegen', tekst: 'Vlieg.' }] }], CONFIG).length > 0);
  assert.ok(validateKetens([{ ...KETENS[0], stappen: [{ soort: 'verzamel', item: 'goud', n: 2, tekst: 'Zoek goud.' }, ...KETENS[0].stappen] }], CONFIG).length > 0);
  assert.ok(SOORTEN.length >= 10);
});

test('places to discover: the lake, the cave, the swamp, the ruin, the mountain and the beach; the camp is none of them', () => {
  assert.equal(plekAt(LAKE.x, LAKE.z + LAKE.r + 2), 'meer');
  assert.equal(plekAt(CAVE.x, CAVE.z), 'grot');
  assert.equal(plekAt(CAMP.x, CAMP.z), null);
  for (const id of ['meer', 'grot', 'moeras', 'ruine', 'berg', 'strand']) assert.equal(plekAt(PLEKKEN[id].x, PLEKKEN[id].z), id);
});

test('a chain counts step by step: only the right event counts, a finished step says so, the reward comes at the end', () => {
  const ketens = [
    { id: 'a', titel: 'A', beloning: 50, klaar: 'Klaar!', stappen: [
      { soort: 'verzamel', item: 'hout', n: 3, tekst: 'Hak drie hout.' },
      { soort: 'vuur', level: 2, tekst: 'Vuur level 2.' },
      { soort: 'ontdek', plek: 'meer', tekst: 'Naar het meer.' },
    ] },
    { id: 'b', titel: 'B', beloning: 80, klaar: 'Ook klaar!', stappen: [{ soort: 'kist', tekst: 'Open de kist.' }, { soort: 'nacht', n: 2, tekst: 'Twee nachten.' }, { soort: 'koop', tool: 'bijl', tekst: 'Koop de bijl.' }] },
  ];
  let s = createState(CONFIG, 0);
  const cur0 = currentKeten(s.eiland, ketens);
  assert.equal(cur0.index, 0); assert.equal(cur0.stapIndex, 0); assert.equal(cur0.doel, 3);
  // the wrong item does nothing (and the state stays the same object)
  let r = ketenEvent(s, ketens, { soort: 'verzamel', item: 'bes', n: 2 });
  assert.equal(r.state, s);
  r = ketenEvent(s, ketens, { soort: 'verzamel', item: 'hout', n: 2 });
  assert.equal(r.state.eiland.stapN, 2); assert.equal(r.stapKlaar, null);
  r = ketenEvent(r.state, ketens, { soort: 'verzamel', item: 'hout', n: 2 });   // 4 ≥ 3: the step is done
  assert.equal(r.stapKlaar.soort, 'verzamel'); assert.equal(r.state.eiland.stap, 1); assert.equal(r.state.eiland.stapN, 0);
  s = r.state;
  assert.equal(ketenEvent(s, ketens, { soort: 'vuur', level: 1 }).state, s, 'level 1 is not enough');
  s = ketenEvent(s, ketens, { soort: 'vuur', level: 3 }).state;
  assert.equal(s.eiland.stap, 2);
  assert.equal(ketenEvent(s, ketens, { soort: 'ontdek', plek: 'grot' }).state, s, 'the wrong place');
  const wallet = s.wallet;
  r = ketenEvent(s, ketens, { soort: 'ontdek', plek: 'meer' });
  assert.equal(r.ketenKlaar.id, 'a'); assert.equal(r.reward, 50);
  assert.equal(r.state.wallet, wallet + 50);
  assert.equal(r.state.eiland.keten, 1); assert.equal(r.state.eiland.stap, 0);
  assert.equal(r.state.eiland.ketensDone, 1); assert.equal(r.state.eiland.questsDone, 1, 'counts for the sticker too');
  s = r.state;
  s = ketenEvent(s, ketens, { soort: 'kist' }).state;
  assert.equal(ketenEvent(s, ketens, { soort: 'nacht', vuur: false }).state, s, 'a night with the fire out does not count');
  s = ketenEvent(s, ketens, { soort: 'nacht', vuur: true }).state;
  assert.equal(s.eiland.stapN, 1);
  s = ketenEvent(s, ketens, { soort: 'nacht' }).state;
  assert.equal(s.eiland.stap, 2);
  r = ketenEvent(s, ketens, { soort: 'koop', tool: 'bijl' });
  assert.equal(r.ketenKlaar.id, 'b');
  assert.equal(r.state.eiland.keten, 0, 'after the last chain the first one comes round again');
  assert.equal(stapTelt({ soort: 'verkoop', item: 'maal', n: 2 }, { soort: 'verkoop', item: 'maal', n: 5 }), 5);
  assert.equal(stapTelt({ soort: 'kook', n: 2 }, { soort: 'kook' }), 1);
});

test('the chain position survives the Bewaar-code', () => {
  const s = { ...createState(CONFIG, 0) };
  s.eiland = { ...s.eiland, keten: 4, stap: 2, stapN: 7, ketensDone: 4 };
  const back = decodeCode(encodeCode(s, CONFIG), CONFIG, 0);
  assert.equal(back.eiland.keten, 4); assert.equal(back.eiland.stap, 2); assert.equal(back.eiland.stapN, 7); assert.equal(back.eiland.ketensDone, 4);
});
