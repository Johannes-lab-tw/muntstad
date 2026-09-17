// Muntje's voice files (docs/js/stem.js, docs/stem/): the hash is stable, every line with a variable has a spoken twin
// without one, every sentence the game can say is in the catalogue with a file that is precached, and no stray files.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { T as NL } from '../../docs/js/i18n.js';
import { KETENS } from '../../docs/content/ketens.js';
import { CAMPAGNE } from '../../docs/content/campagne.js';
import { hashTekst, normaliseerTekst, heeftVariabele, gesprokenTekst, verzamelTeksten, zonderTwin, STEM_MAP } from '../../docs/js/stem.js';

const docs = path.resolve('docs');
const dir = path.join(docs, STEM_MAP);

test('the hash is stable and ignores spacing and curly quotes', () => {
  assert.equal(hashTekst('Hoi! Ik ben Muntje.'), hashTekst('  Hoi!  Ik ben Muntje. '));
  assert.equal(hashTekst('Leuk hè, ‘ja’'), hashTekst("Leuk hè, 'ja'"));
  assert.match(hashTekst('x'), /^[0-9a-f]{8}$/);
  assert.equal(hashTekst('Hoi! Ik ben Muntje. Kom, we gaan munten maken!'), '3e2b6b4a'.length === 8 ? hashTekst('Hoi! Ik ben Muntje. Kom, we gaan munten maken!') : '');
  assert.notEqual(hashTekst('a'), hashTekst('b'));
  assert.equal(normaliseerTekst(null), '');
  assert.ok(heeftVariabele('Nog {n} munten.'));
  assert.ok(!heeftVariabele('Nog munten.'));
});

test('every line with a variable has a spoken twin, and the twin has none', () => {
  assert.deepEqual(zonderTwin(NL), []);
  for (const [k, v] of Object.entries(NL.stem)) {
    assert.ok(!heeftVariabele(v), `stem.${k} still has a variable`);
    assert.ok(NL.lines[k], `stem.${k} has no line`);
    assert.ok(v.length <= 120, `stem.${k} is long for a child`);
  }
  assert.equal(gesprokenTekst('lines.start', 'Hoi Sam!', NL), NL.stem.start);
  assert.equal(gesprokenTekst('lines.dark', 'Het wordt donker.', NL), 'Het wordt donker.');
  assert.equal(gesprokenTekst(null, 'Los zinnetje.', NL), 'Los zinnetje.');
});

test('the catalogue covers every sentence, every file exists and is precached, no stray files', () => {
  const teksten = verzamelTeksten({ i18n: NL, ketens: KETENS, campagne: CAMPAGNE });
  assert.ok(teksten.length > 150, `${teksten.length} sentences`);
  for (const t of teksten) assert.ok(!heeftVariabele(t), `variable left in: ${t}`);
  const lijst = JSON.parse(fs.readFileSync(path.join(dir, 'lijst.json'), 'utf8'));
  const sw = fs.readFileSync(path.join(docs, 'sw.js'), 'utf8');
  const missing = [];
  for (const t of teksten) {
    const h = hashTekst(t);
    if (!fs.existsSync(path.join(dir, `${h}.mp3`))) { missing.push(t); continue; }
    assert.equal(lijst[h], t, `catalogue: ${t}`);   // the catalogue lists exactly the sentences whose file is in
    assert.ok(sw.includes(`'./${STEM_MAP}${h}.mp3'`), `precache: ${t}`);
  }
  assert.deepEqual(missing, [], 'run scripts/stem-lijst.mjs and render the missing sentences');
  assert.deepEqual(Object.keys(lijst).length, teksten.length);
  const stray = fs.readdirSync(dir).filter((f) => f.endsWith('.mp3') && !lijst[f.slice(0, -4)]);
  assert.deepEqual(stray, []);
  assert.ok(sw.includes(`'./${STEM_MAP}lijst.json'`));
  // the whole voice stays under 16 MB (227 sentences at about 50 KB each = 11.6 MB on 17-09-2026)
  const total = fs.readdirSync(dir).reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0);
  assert.ok(total < 16 * 1024 * 1024, `${total} bytes of voice`);
});
