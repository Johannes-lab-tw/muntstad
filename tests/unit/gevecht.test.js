// Defending yourself (docs/js/gevecht.js): weapon choice, lives, the growing pack and the dusk banner.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WAPENS, wapenVoor, levens, tref, roedel, nachtPlan } from '../../docs/js/gevecht.js';
import { CONFIG } from '../../docs/js/config.js';

test('the best owned weapon is used; water only against ghosts; a spear never against a ghost', () => {
  assert.equal(wapenVoor({}, 'wolf'), null);
  assert.equal(wapenVoor({ speer: true }, 'wolf').id, 'speer');
  assert.equal(wapenVoor({ speer: true, alien: true }, 'wolf').id, 'alien');
  assert.equal(wapenVoor({ speer: true }, 'spook'), null, 'a spear does nothing to a ghost');
  assert.equal(wapenVoor({ speer: true, waterspuit: true }, 'spook').id, 'waterspuit');
  assert.equal(wapenVoor({ waterspuit: true }, 'wolf'), null, 'water does nothing to a wolf');
  assert.equal(wapenVoor({ waterspuit: true, alien: true }, 'spook').id, 'alien');
  for (const id of Object.keys(WAPENS)) assert.ok(CONFIG.eiland.tools.some((t) => t.id === id), `${id} is for sale at the fire`);
});

test('lives per enemy, hits until poef', () => {
  const G = CONFIG.gevecht;
  assert.equal(levens('wolf', G), 2);
  assert.equal(levens('beer', G), 4);
  assert.equal(levens('spook', G), 1);
  assert.equal(levens('onbekend', G), 1);
  const w = { hp: levens('wolf', G) };
  assert.equal(tref(w, 1), 'raak');
  assert.equal(tref(w, 1), 'poef');
  const b = { hp: levens('beer', G) };
  assert.equal(tref(b, 2), 'raak');
  assert.equal(tref(b, 2), 'poef');
  assert.ok(G.buit.beer > G.buit.wolf && G.buit.wolf >= 1);
});

test('the pack grows with the nights and stops at the cap', () => {
  const W = CONFIG.wolven, G = CONFIG.gevecht;
  assert.equal(roedel(W.fromNight - 2, CONFIG), 0, 'no pack before its first night');
  assert.equal(roedel(W.fromNight - 1, CONFIG), W.pack);
  assert.equal(roedel(W.fromNight - 1 + G.roedelElke, CONFIG), W.pack + 1);
  assert.equal(roedel(200, CONFIG), G.roedelCap);
});

test('the banner says what comes tonight', () => {
  const p = nachtPlan({ nights: 0, wolves: false, bear: false, pirates: false }, CONFIG);
  assert.equal(p.tekst, 'Nacht 1: 👻');
  const q = nachtPlan({ nights: 7, wolves: true, bear: true, pirates: true }, CONFIG);
  assert.equal(q.n, 8);
  assert.equal(q.wolven, roedel(7, CONFIG));
  assert.ok(q.tekst.startsWith('Nacht 8: 🐺'));
  assert.ok(q.tekst.includes('🐻') && q.tekst.includes('🏴‍☠️') && q.tekst.includes('👻'));
});
