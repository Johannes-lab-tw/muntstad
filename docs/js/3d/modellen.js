// 3d/modellen.js — loads the GLB models of the Higgsfield pipeline (V9.6, PLAN-V9 §C) once, normalises them (feet at
// y 0, `hoogte` metres tall, facing +Z, Lambert materials with the baked texture so the V9.1 light budget holds on every
// tier) and hands out animated clones. Everything has a fallback: `instantie(id)` returns null until the file is in,
// and the scene then keeps the builder model from spoken.js — a night never waits on a download.
import * as T from '../../vendor/three.module.min.js';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { clone as cloneSkinned } from '../../vendor/SkeletonUtils.js';
import { MODELLEN, MODEL_MAP } from '../modellen.js';

const loader = new GLTFLoader();
const klaar = new Map();     // id → { scene, clips, def }
const bezig = new Map();     // id → Promise
const fout = new Map();      // id → message

export function urlVan(id) { return new URL(`../../${MODEL_MAP}${MODELLEN[id].file}`, import.meta.url).href; }

/** Start loading a model (idempotent); resolves to true when it is usable, false when it failed. */
export function laad(id) {
  if (klaar.has(id)) return Promise.resolve(true);
  if (bezig.has(id)) return bezig.get(id);
  const def = MODELLEN[id];
  if (!def) return Promise.resolve(false);
  const p = loader.loadAsync(urlVan(id)).then((gltf) => {
    klaar.set(id, { scene: normaliseer(gltf.scene, def), clips: gltf.animations || [], def });
    return true;
  }).catch((e) => { fout.set(id, String(e && e.message || e)); return false; }).finally(() => bezig.delete(id));
  bezig.set(id, p);
  return p;
}

export function preload(ids = Object.keys(MODELLEN)) { return Promise.all(ids.map(laad)); }

/** 'glb' when loaded, 'laden' while loading, 'fout' after a failure, 'bouw' when nobody asked yet (the builder model). */
export function status(id) { return klaar.has(id) ? 'glb' : bezig.has(id) ? 'laden' : fout.has(id) ? 'fout' : 'bouw'; }
export function statusAlles() { const o = {}; for (const id of Object.keys(MODELLEN)) o[id] = status(id); return o; }

/** Scale to `hoogte`, put the feet on y 0 and the centre on the origin, turn to face +Z, swap materials to Lambert. */
function normaliseer(root, def) {
  root.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(root);
  const size = box.getSize(new T.Vector3());
  const s = def.lengte ? def.lengte / Math.max(size.x, size.z, 1e-6) : (size.y > 1e-6 ? def.hoogte / size.y : 1);
  const wrap = new T.Group();
  const inner = new T.Group();
  inner.add(root);
  inner.rotation.y = def.draai || 0;
  wrap.add(inner);
  root.position.set(-(box.min.x + size.x / 2) , -box.min.y, -(box.min.z + size.z / 2));
  wrap.scale.setScalar(s);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    const mats = Array.isArray(m) ? m : [m];
    const swapped = mats.map((mat) => {
      if (mat.userData.muntstadLambert) return mat;
      const lam = new T.MeshLambertMaterial({ map: mat.map || null, color: mat.color ? mat.color.clone() : 0xffffff, transparent: !!mat.transparent, opacity: mat.opacity == null ? 1 : mat.opacity, side: T.FrontSide });
      lam.userData.muntstadLambert = true;
      // Meshy ships emissiveFactor 1 with the colour texture as emissive map: taken literally that is a white blob at night.
      // A quarter of its own colours as glow keeps a pirate visible in the dark without a light (V9.1 budget).
      if (mat.map) { lam.emissive = new T.Color(0xffffff); lam.emissiveMap = mat.map; lam.emissiveIntensity = def.gloed == null ? 0.22 : def.gloed; }
      return lam;
    });
    o.material = Array.isArray(m) ? swapped : swapped[0];
    o.castShadow = true;
    o.receiveShadow = false;
    o.frustumCulled = !o.isSkinnedMesh;   // a skinned mesh's bounds stay at the bind pose: never cull it away mid-stride
  });
  return wrap;
}

/**
 * A fresh animated clone of a loaded model, or null when it is not in yet. The result speaks the builder models'
 * language: { group, update(now, { walking }) }, so the scene swaps them one for one.
 */
export function instantie(id) {
  const m = klaar.get(id);
  if (!m) return null;
  const group = cloneSkinned(m.scene);
  const mixer = new T.AnimationMixer(group);
  const clip = m.clips.find((c) => new RegExp(m.def.clip || 'walk', 'i').test(c.name)) || m.clips[0] || null;
  const action = clip ? mixer.clipAction(clip) : null;
  if (action) { action.play(); }
  let lamp = null;
  if (m.def.lamp) {
    lamp = new T.Mesh(new T.SphereGeometry(0.12, 8, 6), new T.MeshStandardMaterial({ color: 0xffe28a, emissive: 0xffc23f, emissiveIntensity: 1.6 }));
    lamp.position.set(m.def.lamp[0], m.def.lamp[1], m.def.lamp[2]);
    group.add(lamp);
  }
  // fade: own materials, so one see-through ghost does not dim the others
  const eigen = [];
  if (m.def.fade) group.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.depthWrite = false; eigen.push(o.material); } });
  const inner = group.children[0];   // the turned model; the bob and sway go on it so the caller's group stays clean
  const ph = Math.random() * Math.PI * 2;
  let last = 0;
  function update(now, { walking = true, running = true, fade = 1, speed = 1 } = {}) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    const moving = walking && running;
    if (action) { action.paused = !moving; action.timeScale = speed; if (moving) mixer.update(dt); }
    else if (m.def.wiebel === 'loop') { inner.rotation.z = moving ? Math.sin(now / 220) * 0.06 : 0; inner.position.y = moving ? Math.abs(Math.sin(now / 220)) * 0.06 : 0; }
    else if (m.def.wiebel === 'ren') { inner.rotation.x = moving ? Math.sin(now / 95) * 0.12 : 0; inner.position.y = moving ? Math.abs(Math.sin(now / 95)) * 0.1 : 0; }
    else if (m.def.wiebel === 'zweef') { inner.position.y = 0.6 + Math.sin(now / 420 + ph) * 0.18; inner.rotation.z = Math.sin(now / 600 + ph) * 0.08; }
    if (eigen.length) for (const mat of eigen) mat.opacity = Math.max(0.05, Math.min(1, fade)) * 0.92;
    if (lamp) lamp.material.emissiveIntensity = 1.3 + Math.sin(now / 90) * 0.4;
  }
  return { group, update, mixer, glb: true };
}
