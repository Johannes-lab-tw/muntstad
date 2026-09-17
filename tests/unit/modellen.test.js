// The GLB models (docs/modellen/*.glb, PLAN-V9 §C): every catalogued model exists, parses, stays low-poly, small and
// precached, and carries a skeleton plus a clip when the scene animates it. The reader itself is checked on a tiny GLB.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MODELLEN, MODEL_IDS, MODEL_MAP, leesGlb, telDriehoeken, pixelMaat, keurModel } from '../../docs/js/modellen.js';

const docs = path.resolve('docs');
const sw = fs.readFileSync(path.join(docs, 'sw.js'), 'utf8');

function glbVan(json, bin = new Uint8Array(0)) {
  const enc = new TextEncoder();
  let j = enc.encode(JSON.stringify(json));
  while (j.length % 4) j = new Uint8Array([...j, 0x20]);
  let b = bin;
  while (b.length % 4) b = new Uint8Array([...b, 0]);
  const total = 12 + 8 + j.length + (b.length ? 8 + b.length : 0);
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, j.length, true); dv.setUint32(16, 0x4e4f534a, true); out.set(j, 20);
  if (b.length) { dv.setUint32(20 + j.length, b.length, true); dv.setUint32(24 + j.length, 0x004e4942, true); out.set(b, 28 + j.length); }
  return out;
}

test('the GLB reader: header, chunks, triangles per mode, PNG and JPEG sizes', () => {
  const json = { asset: { version: '2.0' }, accessors: [{ count: 36 }, { count: 10 }, { count: 9 }], meshes: [{ primitives: [{ indices: 0 }, { indices: 1, mode: 5 }, { attributes: { POSITION: 2 } }, { indices: 0, mode: 1 }] }], animations: [{ name: 'Walk' }], skins: [{}] };
  const info = leesGlb(glbVan(json));
  assert.equal(info.triangles, 12 + 8 + 3);
  assert.deepEqual(info.animations, ['Walk']);
  assert.equal(info.skins, 1);
  assert.equal(telDriehoeken({ meshes: [] }), 0);
  assert.throws(() => leesGlb(new Uint8Array(30)), /magic/);
  const png = new Uint8Array(30); png.set([0x89, 0x50, 0x4e, 0x47]); new DataView(png.buffer).setUint32(16, 512); new DataView(png.buffer).setUint32(20, 256);
  assert.deepEqual(pixelMaat(png), { width: 512, height: 256 });
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, 0x04, 0x00, 0x02, 0x00, 3, 0, 0, 0]);
  assert.deepEqual(pixelMaat(jpg), { width: 512, height: 1024 });
  assert.deepEqual(pixelMaat(new Uint8Array([1, 2, 3])), { width: 0, height: 0 });
});

test('keurModel flags too many triangles, a missing skeleton and a big texture', () => {
  const ok = keurModel('piraat', { triangles: 5000, animations: ['walk'], skins: 1, images: [{ width: 512, height: 512 }] }, 1000);
  assert.deepEqual(ok, []);
  const bad = keurModel('piraat', { triangles: 20000, animations: [], skins: 0, images: [{ width: 2048, height: 2048 }] }, 1000);
  assert.equal(bad.length, 4);
  assert.deepEqual(keurModel('nope', {}, 1), ['nope: staat niet in MODELLEN']);
});

for (const id of MODEL_IDS) {
  test(`docs/${MODEL_MAP}${MODELLEN[id].file}: present, low-poly, animated when needed, small, precached`, () => {
    const file = path.join(docs, MODEL_MAP, MODELLEN[id].file);
    assert.ok(fs.existsSync(file), `${file} missing — run the Higgsfield pipeline (ART-DIRECTION §12)`);
    const bytes = fs.readFileSync(file);
    const info = leesGlb(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
    assert.deepEqual(keurModel(id, info, bytes.length), []);
    assert.ok(sw.includes(`'./${MODEL_MAP}${MODELLEN[id].file}'`), 'in PRECACHE');
    const maat = MODELLEN[id].hoogte || MODELLEN[id].lengte;
    assert.ok(maat > 0.3 && maat < 12, 'a sensible size in metres');
  });
}
