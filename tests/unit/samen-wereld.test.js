// The shared world of SAMEN SPELEN (docs/js/samen-wereld.js): the host's message packs and unpacks without loss that
// matters, lists are clamped, a guest's shot is checked, weapons obey the ghost rule, the pack picks the nearest player.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pakWereld, leesWereld, keurSchot, wapenMag, dichtstbij, keurPlek, MAX } from '../../docs/js/samen-wereld.js';

test('pakWereld → leesWereld keeps positions to a decimal, lives, flee states, the boss and the boat', () => {
  const msg = pakWereld({
    phase: 0.8234567, fire: 61.26, weer: 'storm', boot: true,
    ghosts: [{ x: 1.23, z: -4.56, hp: 1, state: 'come' }],
    wolves: [{ x: 10, z: 20, hp: 2, state: 'circle' }, { x: 11, z: 21, hp: 1, state: 'flee' }],
    bears: [], pirates: [{ x: 5, z: 6, hp: 3, state: 'come' }],
    baas: { id: 'koning', b: { x: 30, z: 40, hp: 7, hpMax: 10, state: 'come' } },
  });
  assert.equal(JSON.stringify(msg).length < 260, true, 'compact');
  const d = leesWereld(JSON.parse(JSON.stringify(msg)));
  assert.equal(d.ph, 0.8235);
  assert.equal(d.f, 61.3);
  assert.equal(d.wr, 'storm');
  assert.equal(d.bt, true);
  assert.deepEqual(d.g, [{ x: 1.2, z: -4.6, hp: 1, flee: false }]);
  assert.equal(d.w.length, 2);
  assert.equal(d.w[1].flee, true);
  assert.deepEqual(d.b, []);
  assert.equal(d.p[0].hp, 3);
  assert.deepEqual(d.bs, { id: 'koning', x: 30, z: 40, hp: 7, max: 10, flee: false });
});

test('leesWereld clamps: too many wolves, nonsense numbers, unknown weather, no boss', () => {
  const many = Array.from({ length: 40 }, (_, i) => [i, i, 1, 0]);
  const d = leesWereld({ ph: 7, f: -3, wr: 'hagel', bt: 'ja', w: [...many, ['x', 'y'], null], g: 'nee', bs: ['koning', 'a', 1] });
  assert.equal(d.ph, 0.9999);
  assert.equal(d.f, 0);
  assert.equal(d.wr, 'zon');
  assert.equal(d.bt, false);
  assert.equal(d.w.length, MAX.wolf);
  assert.deepEqual(d.g, []);
  assert.equal(d.bs, null);
  assert.deepEqual(leesWereld(null).w, []);
});

test('keurSchot accepts only a known kind, a small index and a real weapon', () => {
  assert.deepEqual(keurSchot({ k: 'wolf', i: 2, w: 'speer' }), { kind: 'wolf', i: 2, wapen: 'speer' });
  assert.deepEqual(keurSchot({ k: 'baas', i: 0, w: 'alien' }), { kind: 'baas', i: 0, wapen: 'alien' });
  assert.equal(keurSchot({ k: 'hert', i: 0, w: 'speer' }), null);
  assert.equal(keurSchot({ k: 'wolf', i: 99, w: 'speer' }), null);
  assert.equal(keurSchot({ k: 'wolf', i: 1.5, w: 'speer' }), null);
  assert.equal(keurSchot({ k: 'wolf', i: 0, w: 'bazooka' }), null);
  assert.equal(keurSchot(null), null);
});

test('wapenMag: water only on ghosts, a spear never on a ghost, the alien pistol on everything', () => {
  assert.equal(wapenMag('waterspuit', 'spook'), true);
  assert.equal(wapenMag('waterspuit', 'wolf'), false);
  assert.equal(wapenMag('speer', 'spook'), false);
  assert.equal(wapenMag('speer', 'piraat'), true);
  assert.equal(wapenMag('alien', 'spook'), true);
  assert.equal(wapenMag('alien', 'beer'), true);
  assert.equal(wapenMag('nope', 'wolf'), false);
});

test('dichtstbij picks the nearest player and skips broken entries; keurPlek reads a position', () => {
  const spelers = [{ id: null, x: 0, z: 0 }, { id: 7, x: 10, z: 0 }, { id: 9, x: NaN, z: 1 }];
  assert.equal(dichtstbij(spelers, 8, 1).id, 7);
  assert.equal(dichtstbij(spelers, 2, 0).id, null);
  assert.equal(dichtstbij([], 0, 0), null);
  assert.deepEqual(keurPlek({ x: '3', z: 4 }), { x: 3, z: 4 });
  assert.equal(keurPlek({ x: 'a' }), null);
});
