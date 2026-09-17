// modellen.js — the catalogue of GLB models from the Higgsfield pipeline (V9.6, PLAN-V9 §C) and a tiny GLB reader,
// pure (no DOM, no Three), shared by the loader in 3d/modellen.js, the unit tests and scripts/glb-verklein.py's checks.
// Pipeline: a concept picture (GPT Image via Higgsfield, one style: round toy plastic, T-pose, white background) →
// Meshy image-to-3D with a skeleton and one clip → docs/modellen/<id>.glb (textures shrunk to 512 px) → precached.
// Rule 4 stays (no CDN: the loader is vendored), rule 5 too (our own pictures, no brands).

export const MODELLEN = Object.freeze({
  // hoogte: metres from the feet to the top in the scene (lengte: the longest side on the ground, for the boat); clip:
  // the animation the model walks with (null: a static model with a `wiebel`: 'loop' sways, 'ren' bobs fast, 'zweef'
  // floats); draai: extra yaw (radians) so the model faces +Z at heading 0 like every builder model; lamp: a small
  // glowing lantern in the hand; gloed: how much of its own colours it emits at night (0.22 default); fade: its
  // materials are per instance so the scene can make it see-through.
  piraat: { file: 'piraat.glb', hoogte: 2.0, clip: 'walk', draai: 0, lamp: [0.42, 0.9, 0.15], maxDriehoeken: 9000 },   // Meshy lands a hair over its 8 000 target
  beer:   { file: 'beer.glb',   hoogte: 2.1, clip: null,   draai: 0, wiebel: 'loop', maxDriehoeken: 9000 },
  wolf:   { file: 'wolf.glb',   hoogte: 1.05, clip: null,  draai: 0, wiebel: 'ren', maxDriehoeken: 7000 },
  spook:  { file: 'spook.glb',  hoogte: 1.5, clip: null,   draai: 0, wiebel: 'zweef', fade: true, gloed: 0.6, maxDriehoeken: 5000 },
  boot:   { file: 'boot.glb',   lengte: 7.0, clip: null,   draai: 0, gloed: 0.08, maxDriehoeken: 9000 },
});
export const MODEL_IDS = Object.keys(MODELLEN);
export const MODEL_MAP = 'modellen/';
export const MAX_TEXTUUR_PX = 1024;   // shrink with scripts/glb-verklein.py when Meshy ships 2048
export const MAX_GLB_BYTES = 3 * 1024 * 1024;

const GLB_MAGIC = 0x46546c67;   // 'glTF'
const JSON_CHUNK = 0x4e4f534a, BIN_CHUNK = 0x004e4942;

/** Read a GLB (Uint8Array or ArrayBuffer): { json, bin, triangles, animations, skins, images } — throws on a bad file. */
export function leesGlb(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (u8.byteLength < 20 || dv.getUint32(0, true) !== GLB_MAGIC) throw new Error('geen GLB (magic)');
  const version = dv.getUint32(4, true);
  if (version !== 2) throw new Error(`GLB versie ${version}, verwacht 2`);
  const total = dv.getUint32(8, true);
  if (total !== u8.byteLength) throw new Error(`GLB lengte ${total} klopt niet met ${u8.byteLength} bytes`);
  let off = 12, json = null, bin = null;
  while (off + 8 <= u8.byteLength) {
    const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
    const data = u8.subarray(off + 8, off + 8 + len);
    if (type === JSON_CHUNK) json = JSON.parse(new TextDecoder().decode(data));
    else if (type === BIN_CHUNK) bin = data;
    off += 8 + len;
  }
  if (!json) throw new Error('GLB zonder JSON-chunk');
  return { json, bin, triangles: telDriehoeken(json), animations: (json.animations || []).map((a) => a.name || ''), skins: (json.skins || []).length, images: beeldInfo(json, bin) };
}

/** Triangles over every mesh primitive (strips and fans count their triangles, points and lines count nothing). */
export function telDriehoeken(json) {
  const acc = json.accessors || [];
  let n = 0;
  for (const mesh of json.meshes || []) {
    for (const p of mesh.primitives || []) {
      const mode = p.mode == null ? 4 : p.mode;
      const count = p.indices != null ? acc[p.indices].count : (p.attributes && p.attributes.POSITION != null ? acc[p.attributes.POSITION].count : 0);
      if (mode === 4) n += Math.floor(count / 3);
      else if (mode === 5 || mode === 6) n += Math.max(0, count - 2);
    }
  }
  return n;
}

/** The embedded images with their pixel size (PNG from IHDR, JPEG from the first SOF marker) and byte length. */
export function beeldInfo(json, bin) {
  const out = [];
  for (const img of json.images || []) {
    const info = { mime: img.mimeType || '', width: 0, height: 0, bytes: 0 };
    if (img.bufferView != null && bin) {
      const bv = json.bufferViews[img.bufferView];
      const d = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
      info.bytes = d.byteLength;
      Object.assign(info, pixelMaat(d));
    }
    out.push(info);
  }
  return out;
}

/** Width and height of a PNG or JPEG byte array, { width: 0, height: 0 } when unknown. */
export function pixelMaat(d) {
  if (d.length > 24 && d[0] === 0x89 && d[1] === 0x50 && d[2] === 0x4e && d[3] === 0x47) {
    const dv = new DataView(d.buffer, d.byteOffset, d.byteLength);
    return { width: dv.getUint32(16), height: dv.getUint32(20) };
  }
  if (d.length > 4 && d[0] === 0xff && d[1] === 0xd8) {
    let i = 2;
    while (i + 9 < d.length) {
      if (d[i] !== 0xff) { i++; continue; }
      const m = d[i + 1];
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      const len = (d[i + 2] << 8) | d[i + 3];
      if ((m >= 0xc0 && m <= 0xc3) || (m >= 0xc5 && m <= 0xc7) || (m >= 0xc9 && m <= 0xcb) || (m >= 0xcd && m <= 0xcf)) {
        return { height: (d[i + 5] << 8) | d[i + 6], width: (d[i + 7] << 8) | d[i + 8] };
      }
      i += 2 + len;
    }
  }
  return { width: 0, height: 0 };
}

/** The checks every shipped model must pass (used by the unit test and printed by glb-verklein.py): a list of problems. */
export function keurModel(id, info, bytes) {
  const def = MODELLEN[id];
  const problemen = [];
  if (!def) return [`${id}: staat niet in MODELLEN`];
  if (bytes > MAX_GLB_BYTES) problemen.push(`${id}: ${bytes} bytes, meer dan ${MAX_GLB_BYTES}`);
  if (info.triangles > def.maxDriehoeken) problemen.push(`${id}: ${info.triangles} driehoeken, meer dan ${def.maxDriehoeken}`);
  if (info.triangles < 100) problemen.push(`${id}: maar ${info.triangles} driehoeken, is dit wel een model?`);
  if (def.clip && !info.animations.length) problemen.push(`${id}: geen animatie, clip '${def.clip}' verwacht`);
  if (def.clip && !info.skins) problemen.push(`${id}: geen skelet`);
  if (!def.clip && !def.wiebel && !def.lengte) problemen.push(`${id}: geen clip en geen wiebel: het staat stokstijf`);
  for (const im of info.images) if (im.width > MAX_TEXTUUR_PX || im.height > MAX_TEXTUUR_PX) problemen.push(`${id}: textuur ${im.width}x${im.height} groter dan ${MAX_TEXTUUR_PX}`);
  if (!info.images.length) problemen.push(`${id}: geen textuur`);
  return problemen;
}
