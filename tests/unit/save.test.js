import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../../docs/js/config.js';
import * as E from '../../docs/js/economy.js';
import * as S from '../../docs/js/save.js';

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    dump: () => Object.fromEntries(map),
  };
}

test('save → load round-trips the state', () => {
  const storage = fakeStorage();
  let s = { ...E.createState(CONFIG, 100), wallet: 42.5, name: 'Kapitein', color: 'rood' };
  s = E.buyFun({ ...s, wallet: 100 }, CONFIG, 'pet').state;
  s = { ...s, makers: { ...s.makers, limonade: 3 }, milestones: ['eerste-geldmaker'] };
  assert.equal(S.save(storage, s, CONFIG), true);
  const r = S.load(storage, CONFIG, 200);
  assert.equal(r.status, 'ok');
  assert.equal(r.state.wallet, 85);
  assert.equal(r.state.name, 'Kapitein');
  assert.equal(r.state.color, 'rood');
  assert.equal(r.state.makers.limonade, 3);
  assert.equal(r.state.fun.pet, true);
  assert.equal(r.state.equipped.hat, 'pet');
  assert.deepEqual(r.state.milestones, ['eerste-geldmaker']);
  assert.equal(r.state.lastTick, 100); // kept, so offline earnings can be computed
});

test('empty storage gives a fresh state with status new', () => {
  const r = S.load(fakeStorage(), CONFIG, 5);
  assert.equal(r.status, 'new');
  assert.equal(r.state.wallet, 0);
  assert.equal(r.state.lastTick, 5);
});

test('corrupted JSON resets cleanly with a message', () => {
  const storage = fakeStorage({ [S.storageKey(CONFIG)]: '{"wallet": 12, "makers": ' });
  const r = S.load(storage, CONFIG, 7);
  assert.equal(r.status, 'reset');
  assert.ok(r.message.length > 0);
  assert.equal(r.state.wallet, 0);
});

test('a save with an unknown shape resets, a save from a newer version resets', () => {
  const bad = fakeStorage({ [S.storageKey(CONFIG)]: JSON.stringify({ version: 1, hello: 'world' }) });
  assert.equal(S.load(bad, CONFIG, 1).status, 'reset');
  const newer = fakeStorage({ [S.storageKey(CONFIG)]: JSON.stringify({ version: 99, wallet: 5, makers: {} }) });
  const r = S.load(newer, CONFIG, 1);
  assert.equal(r.status, 'reset');
  assert.equal(r.state.wallet, 0);
});

test('an older save version (v0 prototype) is migrated, not reset', () => {
  const storage = fakeStorage({ [`${CONFIG.saveKey}.v0`]: JSON.stringify({ coins: 77, makers: { limonade: 2 }, name: 'Bo' }) });
  const r = S.load(storage, CONFIG, 9);
  assert.equal(r.status, 'migrated');
  assert.equal(r.state.version, CONFIG.saveVersion);
  assert.equal(r.state.wallet, 77);
  assert.equal(r.state.makers.limonade, 2);
  assert.equal(r.state.name, 'Bo');
});

test('normalize clamps nonsense values and drops unknown ids', () => {
  const s = S.normalize({
    version: 1,
    wallet: -50,
    makers: { limonade: 99, bogus: 3 },
    fun: { pet: true, nothing: true },
    equipped: { hat: 'kroon', skin: 'pet' },
    hidden: { pet: true, zzz: true },
    milestones: ['duizend', 'fake'],
    color: 'roze',
    name: 'x'.repeat(50),
    settings: { voice: false },
    foodTimerMs: 1e15,
  }, CONFIG, 3);
  assert.equal(s.wallet, 0);
  assert.ok(s.foodTimerMs <= CONFIG.pet.foodIntervalMs, 'food timer is clamped so the first tick cannot loop forever');
  assert.equal(s.makers.limonade, CONFIG.maxLevel);
  assert.equal('bogus' in s.makers, false);
  assert.deepEqual(Object.keys(s.fun), ['pet']);
  assert.equal(s.equipped.hat, null); // kroon is not owned
  assert.equal(s.equipped.skin, null);
  assert.deepEqual(s.hidden, { pet: true });
  assert.deepEqual(s.milestones, ['duizend']);
  assert.equal(s.color, CONFIG.colors[0].id);
  assert.equal(s.name.length, 20);
  assert.equal(s.settings.voice, false);
  assert.equal(s.settings.sound, true);
});

test('storage errors never throw', () => {
  const broken = { getItem: () => { throw new Error('nope'); }, setItem: () => { throw new Error('nope'); }, removeItem: () => { throw new Error('nope'); } };
  const r = S.load(broken, CONFIG, 1);
  assert.equal(r.state.wallet, 0);
  assert.equal(S.save(broken, r.state, CONFIG), false);
  S.clear(broken, CONFIG);
});

test('Bewaar-code round-trips progress and rejects typos', () => {
  let s = { ...E.createState(CONFIG, 0), wallet: 1234.7, earnedWork: 500, earnedPassive: 900.4, spentMakers: 160, name: 'Kapitein Bo', color: 'groen', carsWashed: 40, bestWorkRate: 17.6, playTimeMs: 125000 };
  s = { ...s, makers: { ...s.makers, limonade: 3, wasstraat: 1 } };
  s = E.buyFun({ ...s, wallet: 2000 }, CONFIG, 'kroon').state;
  s = E.buyFun(s, CONFIG, 'hond').state;
  s = E.buyFun(s, CONFIG, 'boom').state;
  s = E.toggleFun(s, CONFIG, 'boom');
  s = { ...s, milestones: ['eerste-geldmaker', 'geld-werkt'], settings: { voice: false, sound: true, music: false } };
  const code = S.encodeCode(s, CONFIG);
  assert.match(code, /^MS1\.[A-Za-z0-9_-]+\.[0-9a-z]{2}$/);
  assert.ok(code.length < 400, `code length ${code.length}`);
  const back = S.decodeCode(code, CONFIG, 5000);
  assert.ok(back);
  assert.equal(back.wallet, Math.floor(s.wallet));
  assert.equal(back.name, 'Kapitein Bo');
  assert.equal(back.color, 'groen');
  assert.equal(back.makers.limonade, 3);
  assert.equal(back.makers.wasstraat, 1);
  assert.equal(back.fun.kroon, true);
  assert.equal(back.fun.hond, true);
  assert.equal(back.equipped.hat, 'kroon');
  assert.equal(back.hidden.boom, true);
  assert.deepEqual(back.milestones, ['eerste-geldmaker', 'geld-werkt']);
  assert.equal(back.carsWashed, 40);
  assert.equal(back.bestWorkRate, 18);
  assert.equal(back.playTimeMs, 125000);
  assert.equal(back.settings.voice, false);
  assert.equal(back.settings.music, false);
  assert.equal(back.lastTick, 5000); // no offline earnings from a code
  // whitespace/newlines are tolerated (pasted codes)
  assert.ok(S.decodeCode(code.slice(0, 10) + '\n ' + code.slice(10), CONFIG, 1));
  // typos are rejected
  const typo = code.slice(0, 20) + (code[20] === 'A' ? 'B' : 'A') + code.slice(21);
  assert.equal(S.decodeCode(typo, CONFIG, 1), null);
  assert.equal(S.decodeCode('hallo', CONFIG, 1), null);
  assert.equal(S.decodeCode('', CONFIG, 1), null);
  assert.equal(S.decodeCode(null, CONFIG, 1), null);
});
