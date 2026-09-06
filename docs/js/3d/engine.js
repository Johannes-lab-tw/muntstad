// 3d/engine.js — one WebGL renderer for every 3D screen. The canvas moves into the container of the active screen
// (iOS Safari allows only a handful of WebGL contexts, and one context is kinder to the battery).
// Adaptive quality: when frames get slow the pixel ratio and shadow resolution step down, and back up when steady.
import * as T from '../../vendor/three.module.min.js';

export function createEngine() {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.NoToneMapping;
  renderer.outputColorSpace = T.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = 'gl';
  canvas.setAttribute('aria-hidden', 'true');
  let container = null;
  let W = 0, H = 0;
  let tier = 0;               // 0 = full, 1 = lighter, 2 = lite
  const tierListeners = [];
  // a software renderer (SwiftShader in headless Chromium / CI) or a tiny CPU starts and stays in lite mode:
  // no shadows, pixel ratio 1, still water. Real iPads never hit this branch.
  let forcedLite = false;
  try {
    const gl = renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    const cores = navigator.hardwareConcurrency || 8;
    if (cores <= 2 || (/swiftshader|llvmpipe|software/i.test(name) && cores <= 4)) forcedLite = true; // CI runners; a fast desktop keeps full quality in dev-shot
  } catch (e) { /* ignore */ }

  // ?lowres=1 (tests on software renderers): draw at half resolution, everything else unchanged
  const lowres = /[?&]lowres=1/.test(location.search);
  function pixelRatio() {
    if (lowres) return 0.5;
    const base = Math.min(2, window.devicePixelRatio || 1);
    return tier === 2 ? Math.min(base, 1) : tier === 1 ? base * 0.8 : base;
  }
  function applyTier() {
    renderer.shadowMap.enabled = tier < 2;
    if (tier >= 2) renderer.shadowMap.needsUpdate = true;
  }

  function resize() {
    if (!container) return;
    // clientWidth/Height ignore the screen's slide-in transform (getBoundingClientRect would measure it small)
    W = Math.max(320, container.clientWidth || window.innerWidth);
    H = Math.max(240, container.clientHeight || window.innerHeight);
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(W, H, false);
  }

  function mount(el) {
    if (canvas.parentNode !== el) el.appendChild(canvas);
    container = el;
    resize();
  }
  // V7.0: iPadOS sometimes reports the old size in the resize event after a rotation; the scenes ask every 20th frame
  // whether the container has quietly changed size and resize themselves if so (a reflow every third of a second is cheap)
  let sizeTick = 0;
  function checkSize() {
    if (!container || (++sizeTick % 20) !== 0) return false;
    return Math.max(320, container.clientWidth || window.innerWidth) !== W || Math.max(240, container.clientHeight || window.innerHeight) !== H;
  }

  // ---------- adaptive quality ----------
  let acc = 0, n = 0, lastChange = 0, lastAvgMs = 0;
  function trackFrame(dtMs, now) {
    acc += dtMs;
    n++;
    if (n < 90) return;
    const avg = acc / n;
    lastAvgMs = avg;
    acc = 0; n = 0;
    if (forcedLite) return;
    if (avg > 26 && tier < 2 && now - lastChange > 2000) setTier(tier + 1, now);
    else if (avg < 13 && tier > 0 && now - lastChange > 8000) setTier(tier - 1, now);
  }
  function setTier(t, now = performance.now()) {
    tier = t;
    lastChange = now;
    applyTier();
    resize();
    for (const fn of tierListeners) fn(tier);
  }
  if (forcedLite) setTier(2);

  function render(scene, camera) {
    renderer.render(scene, camera);
  }

  return {
    renderer, canvas, mount, resize, render, trackFrame, checkSize,
    onTier(fn) { tierListeners.push(fn); fn(tier); },
    get W() { return W; },
    get H() { return H; },
    get tier() { return tier; },
    get fps() { return lastAvgMs > 0 ? Math.round(1000 / lastAvgMs) : 0; },   // V6.8: for the MELD code on PAPA
    get container() { return container; },
  };
}

/** Shadow-casting sun + sky light + a soft fill, the same on every screen. `size` = half-width of the shadow area. */
export function addLights(scene, center, size = 14, tier = 0) {
  const sun = new T.DirectionalLight(0xfff6e0, 2.4);
  sun.position.set(center.x - 11, 13, center.z + 9);
  sun.target.position.copy(center);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -size;
  sun.shadow.camera.right = size;
  sun.shadow.camera.top = size;
  sun.shadow.camera.bottom = -size;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const sky = new T.HemisphereLight(0xd6f0ff, 0x6fa84f, 0.85);
  scene.add(sky);
  const fill = new T.DirectionalLight(0xfff2d6, 0.45);
  fill.position.set(center.x + 12, 8, center.z - 6);
  scene.add(fill);
  const setTier = (t) => {
    sun.castShadow = t < 2;
    const s = t === 2 ? 1024 : t === 1 ? 1536 : 2048;
    if (sun.shadow.mapSize.x !== s) {
      sun.shadow.mapSize.set(s, s);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    }
  };
  setTier(tier);
  return { sun, sky, fill, setTier };
}

/**
 * Perspective camera looking at the world from the front-right corner at a toy-town angle, fitted so that the box
 * (bounds) fills the container minus the HUD paddings. Returns { camera, fit(W, H) }.
 */
export function createCamera(bounds, pads = { top: 100, bottom: 150, left: 20, right: 20 }, opts = {}) {
  const camera = new T.PerspectiveCamera(opts.fov || 30, 1, 0.5, 400);
  const elev = opts.elev ?? 0.66;   // radians above the ground
  const az = opts.az ?? Math.PI / 4;
  const dir = new T.Vector3(Math.cos(elev) * Math.sin(az), Math.sin(elev), Math.cos(elev) * Math.cos(az)).normalize();
  const center = new T.Vector3((bounds.min.x + bounds.max.x) / 2, (bounds.min.y + bounds.max.y) / 2, (bounds.min.z + bounds.max.z) / 2);
  const target = center.clone();
  const corners = [];
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) corners.push(new T.Vector3(x, y, z));
  let dist = 40;
  const v = new T.Vector3();

  function place() {
    camera.position.copy(target).addScaledVector(dir, dist);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
  }

  function fit(W, H) {
    camera.aspect = W / H;
    const availW = W - pads.left - pads.right, availH = H - pads.top - pads.bottom;
    const cx = (pads.left + W - pads.right) / 2, cy = (pads.top + H - pads.bottom) / 2;
    for (let i = 0; i < 8; i++) {
      place();
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const c of corners) {
        v.copy(c).project(camera);
        const sx = (v.x + 1) / 2 * W, sy = (1 - v.y) / 2 * H;
        minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
      }
      const scale = Math.max((maxX - minX) / availW, (maxY - minY) / availH);
      dist *= scale;
      // recentre: move the target so the projected box sits in the middle of the padded area
      const dx = (minX + maxX) / 2 - cx, dy = (minY + maxY) / 2 - cy;
      const right = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const worldPerPx = (2 * dist * Math.tan((camera.fov * Math.PI) / 360)) / H;
      target.addScaledVector(right, dx * worldPerPx).addScaledVector(up, -dy * worldPerPx);
    }
    place();
  }

  return { camera, fit, get target() { return target; }, get dist() { return dist; }, dir };
}
