// werk.js — "Auto's wassen" in a real 3D wash bay. A car drives onto the wet floor in front of the wash hall,
// mud blobs (3D) stick to its faces with transparent DOM hit areas (.dirt) projected over them; tap or swipe them
// away with foam, the car sparkles, drives off and pays 2 coins. Work is linear and bounded: a new car never
// comes sooner than minCycleMs.
import * as T from '../../vendor/three.module.min.js';
import { addLights, createCamera } from '../3d/engine.js';
import { Builder, shade, col, textPlane, meshSphere } from '../3d/build.js';
import { cushionMesh, createSea, WATER_Y } from '../3d/world.js';
import { startWork, endWork, washCar, setFlag } from '../economy.js';

const CAR_COLORS = ['#ff5f5f', '#45b6ff', '#45d65c', '#ffc21c', '#b76cff', '#ff6fae', '#2dd4bf', '#ff9f2e'];
const CAR_TYPES = ['sedan', 'van', 'pickup', 'sedan'];
// dirt slots on the car in face-local coordinates: side = 'y' (long side facing the camera), 'x' (front), 'top'
const SLOTS = [
  { side: 'y', u: 0.35, v: 0.28 }, { side: 'y', u: 1.4, v: 0.3 }, { side: 'y', u: 2.45, v: 0.26 },
  { side: 'x', u: 0.3, v: 0.3 }, { side: 'x', u: 1.0, v: 0.32 },
  { side: 'top', u: 2.3, v: 0.65 }, { side: 'top', u: 0.4, v: 0.6 },
];
const FOAM_MAX = 22; // SPEC §6: at most 30 live particles, and confetti may join in
const CAR = { w: 2.8, d: 1.3, z: 0.22 };

/** Big rounded car for the wash bay, long axis along x, centred at the origin. Returns { group, wheels }. */
export function washCarModel(color, type = 'sedan') {
  const { w, d, z } = CAR;
  const x0 = -w / 2, y0 = -d / 2;
  const b = new Builder({ r: 0.08 });
  b.box(x0, y0, z, w, d, 0.62, color, { r: 0.16 });                                    // body
  b.box(x0 - 0.08, y0 + 0.05, z + 0.08, 0.1, d - 0.1, 0.22, '#e4e8ef', { r: 0.04 });   // rear bumper
  b.box(x0 + w - 0.02, y0 + 0.05, z + 0.08, 0.1, d - 0.1, 0.22, '#e4e8ef', { r: 0.04 }); // front bumper
  b.face(x0, y0, z, w, d, 'x', 0.14, 0.3, 0.26, 0.2, '#ffe94d', { t: 0.05 });          // headlights
  b.face(x0, y0, z, w, d, 'x', d - 0.4, 0.3, 0.26, 0.2, '#ffe94d', { t: 0.05 });
  b.face(x0, y0, z, w, d, 'x', 0.45, 0.12, 0.4, 0.14, '#5b6472', { t: 0.05 });         // grille
  b.face(x0, y0, z, w, d, 'y', 0.2, 0.08, w - 0.4, 0.1, shade(color, -0.2), { t: 0.04 }); // side stripe
  b.face(x0, y0, z, w, d, 'y', 0.06, 0.34, 0.2, 0.14, '#ff5f5f', { t: 0.04 });        // tail light
  let cx = x0 + 0.7, cw = 1.5;
  if (type === 'van') { cx = x0 + 0.25; cw = 2.2; }
  if (type === 'pickup') { cx = x0 + 1.35; cw = 1.1; }
  const cd = d - 0.2, cy = y0 + 0.1, cz = z + 0.62, ch = type === 'van' ? 0.7 : 0.6;
  b.box(cx, cy, cz, cw, cd, ch, shade(color, 0.06), { r: 0.14 });
  b.face(cx, cy, cz, cw, cd, 'y', 0.1, 0.1, cw - 0.2, ch - 0.22, '#bfe6ff', { t: 0.045 }); // side window
  b.face(cx, cy, cz, cw, cd, 'x', 0.1, 0.1, cd - 0.2, ch - 0.22, '#bfe6ff', { t: 0.045 }); // windscreen
  if (type === 'pickup') b.box(x0 + 0.15, y0 + 0.12, z + 0.62, 1.05, d - 0.24, 0.18, shade(color, -0.35), { r: 0.04 });
  if (type === 'van') b.face(cx, cy, cz, cw, cd, 'y', 0.1, 0.1, 0.9, ch - 0.22, shade(color, 0.06), { t: 0.05 });
  b.box(cx + cw - 0.08, y0 + d - 0.02, cz + 0.2, 0.14, 0.12, 0.14, shade(color, -0.1), { r: 0.03 }); // mirror
  const group = new T.Group();
  group.add(b.build());
  const wheels = [];
  for (const dx of [-0.75, 0.95]) for (const dz of [-0.62, 0.62]) {
    const wg = new T.CylinderGeometry(0.26, 0.26, 0.24, 18);
    wg.rotateX(Math.PI / 2);
    const wheel = new T.Mesh(wg, new T.MeshStandardMaterial({ color: col('#1b1f3b'), roughness: 0.85 }));
    const hub = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 0.26, 12).rotateX(Math.PI / 2), new T.MeshStandardMaterial({ color: col('#c5ccd8'), roughness: 0.4, metalness: 0.3 }));
    wheel.add(hub);
    wheel.position.set(dx, 0.26, dz);
    wheel.castShadow = true;
    group.add(wheel);
    wheels.push(wheel);
  }
  return { group, wheels };
}

/** World point (car-local) of a dirt slot, on the +z face ('y'), the +x face ('x') or the top. */
function slotPoint(slot) {
  const { w, d, z } = CAR;
  const x0 = -w / 2, y0 = -d / 2;
  if (slot.side === 'y') return [x0 + slot.u, z + slot.v, y0 + d];
  if (slot.side === 'x') return [x0 + w, z + slot.v, y0 + slot.u];
  return [x0 + slot.u, z + 0.62, y0 + slot.v];
}

function mudModel(side) {
  const b = new Builder({ r: 0.02 });
  const c = '#7a4a22', dark = '#583417', light = '#a06a35';
  // a flat splat: puffs squashed along the face normal
  const puff = (x, y, z, r, color) => { const g = new T.IcosahedronGeometry(r, 1); g.translate(x, z, y); b.add(g, color); };
  puff(0, 0, 0, 0.34, c);
  puff(0.27, 0.03, 0.18, 0.2, dark);
  puff(-0.26, -0.03, -0.15, 0.21, light);
  puff(0.08, 0.05, -0.3, 0.15, dark);
  puff(-0.12, 0.03, 0.3, 0.14, light);
  puff(0.3, -0.02, -0.22, 0.11, c);
  const m = b.build({ receive: false });
  if (side === 'y') m.scale.z = 0.35;
  else if (side === 'x') m.scale.x = 0.35;
  else m.scale.y = 0.35;
  return m;
}

export function createWerk(game) {
  const stage = document.getElementById('werk-stage');
  const car = document.getElementById('werk-car');
  const countEl = document.getElementById('werk-count');
  const klaar = document.getElementById('btn-klaar');
  const engine = game.engine;
  let W = 0, H = 0;
  let dirtLeft = 0;
  let ready = false;
  let visible = false;
  let carIndex = 0;
  let sessionCars = 0;
  let carShownAt = 0;
  let timers = [];
  let raf = 0;
  // car motion: world x offset (0 = parked), phase 'in' | 'wash' | 'out' | 'gone'
  const carState = { phase: 'gone', t0: 0, color: CAR_COLORS[0], type: 'sedan', model: null };
  const foam = [];
  const muds = new Map(); // slot index → mesh

  function later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { for (const t of timers) clearTimeout(t); timers = []; }
  function randomInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  // ---------- the 3D bay ----------
  const scene = new T.Scene();
  scene.fog = new T.Fog(col('#8fdcff'), 40, 120);
  const center = new T.Vector3(0, 0, 0);
  const lights = addLights(scene, center, 9, engine ? engine.tier : 0);
  if (engine) engine.onTier((t) => lights.setTier(t));
  const cam = createCamera(
    { min: { x: -3.4, y: -0.2, z: -3.2 }, max: { x: 3.6, y: 2.6, z: 2.2 } },
    { top: 80, bottom: 96, left: 0, right: 0 },
    { fov: 26, elev: 0.46, az: Math.PI / 4 },
  );
  const camera = cam.camera;
  // floor: a concrete slab on its own little island in the sea
  const fx = -4.6, fy = -3.6, fw = 9.2, fd = 6.4;
  const isle = cushionMesh(fx - 0.9, fy - 0.9, fw + 1.8, fd + 1.8, 1.4, { depth: 1.2, bt: 0.36, bs: 0.42 });
  isle.position.y = -0.06;
  scene.add(isle);
  scene.add(createSea(0, 0, 200).mesh);
  const st = new Builder({ r: 0.05 });
  st.box(fx, fy, -0.06, fw, fd, 0.12, '#cfd6e2', { r: 0.5 });
  for (let gx = fx + 1; gx < fx + fw; gx += 1) st.box(gx - 0.015, fy + 0.2, 0.06, 0.03, fd - 0.4, 0.012, '#aab3c2', { r: 0.001 });
  for (let gy = fy + 1; gy < fy + fd; gy += 1) st.box(fx + 0.2, gy - 0.015, 0.06, fw - 0.4, 0.03, 0.012, '#aab3c2', { r: 0.001 });
  st.disc(-2.6, 1.6, 0.065, 0.8, '#7dd3fc', 0.02, 20);
  st.disc(2.4, 1.9, 0.065, 0.6, '#7dd3fc', 0.02, 20);
  // wash hall behind the car: tunnel mouth on the +z face, windows, sign, brush strip
  const hx = -3.2, hy = -3.4, hw = 6.4, hd = 1.9, hh = 2.4;
  st.box(hx, hy, 0.06, hw, hd, hh, '#4fb6ff', { r: 0.14 });
  st.box(hx - 0.1, hy - 0.1, hh + 0.06, hw + 0.2, hd + 0.2, 0.26, shade('#4fb6ff', -0.32), { r: 0.06 });
  st.face(hx, hy, 0.06, hw, hd, 'y', 1.9, 0, 2.6, 1.8, '#1f2a44', { t: 0.06 });
  for (let i = 0; i < 3; i++) st.face(hx, hy, 0.06, hw, hd, 'y', 1.95 + i * 0.85, 1.55, 0.7, 0.16, '#ff5f5f', { t: 0.08 });
  for (const u of [0.35, 4.95]) { st.face(hx, hy, 0.06, hw, hd, 'y', u - 0.05, 0.85, 1.2, 0.8, '#ffffff', { t: 0.04 }); st.face(hx, hy, 0.06, hw, hd, 'y', u, 0.9, 1.1, 0.7, '#cfe9ff', { t: 0.06 }); }
  st.box(hx + 1.3, hy - 0.15, hh + 0.32, 3.8, 0.16, 0.9, '#ffffff', { r: 0.06 });
  st.box(hx + 1.25, hy - 0.17, hh + 0.28, 3.9, 0.2, 0.1, '#1a7ad6', { r: 0.03 });
  // bucket with sponge, hose reel, cone, palm
  st.cyl(-3.8, 1.4, 0.06, 0.32, 0.55, '#45b6ff', 14, 0.36);
  st.cyl(-3.8, 1.4, 0.58, 0.36, 0.06, '#1a7ad6', 14);
  st.box(-3.95, 1.2, 0.62, 0.3, 0.26, 0.2, '#ffe94d', { r: 0.05 });
  st.cyl(3.95, -0.05, 0.06, 0.38, 0.5, '#45d65c', 16);
  st.cyl(3.95, -0.05, 0.56, 0.32, 0.1, '#1d9a37', 16);
  st.cone(3.75, 1.75, 0.06, 0.28, 0.8, '#ff9f2e', 12);
  st.box(3.45, 1.45, 0.06, 0.6, 0.6, 0.06, '#ff9f2e', { r: 0.03 });
  st.box(3.5, 1.5, 0.4, 0.5, 0.5, 0.06, '#ffffff', { r: 0.02 });
  for (let i = 0; i < 6; i++) st.cyl(4.3 + i * 0.05, -2.7 - i * 0.03, i * 0.32, 0.12 - i * 0.008, 0.36, i % 2 ? '#a8763f' : '#8a5a35', 10);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const g = new T.BoxGeometry(1.2, 0.05, 0.3); g.translate(0.55, 0, 0); g.rotateZ(-0.35); g.rotateY(a); g.translate(4.6, 2.0, -2.85); st.add(g, i % 2 ? '#45d65c' : '#3fbf5a'); }
  st.bush(-4.2, -1.6, 0.6, '#3fbf5a');
  st.bush(4.4, 0.9, 0.5, '#45d65c');
  scene.add(st.build());
  const signText = textPlane('WASSTRAAT', { w: 3.4, h: 0.72, font: 0.46, color: '#1a7ad6' });
  signText.position.set(hx + 3.2, hh + 0.78, hy + 0.02);
  scene.add(signText);
  const brushes = [];
  for (const bx of [hx + 1.8, hx + 4.6]) {
    const roller = new T.Mesh(new T.CylinderGeometry(0.24, 0.24, 1.7, 14), new T.MeshStandardMaterial({ color: col('#ff5f5f'), roughness: 0.7 }));
    roller.position.set(bx, 0.06 + 0.85, hy + hd + 0.3);
    roller.castShadow = true;
    scene.add(roller);
    const stripes = new T.Mesh(new T.CylinderGeometry(0.26, 0.26, 0.2, 14), new T.MeshStandardMaterial({ color: col('#ffffff'), roughness: 0.7 }));
    roller.add(stripes);
    brushes.push(roller);
  }
  const spray = [];
  for (let i = 0; i < 6; i++) { const s = meshSphere(0.07, '#dff4ff', 6, { transparent: true, opacity: 0.9 }); s.castShadow = false; scene.add(s); spray.push(s); }

  // ---------- layout ----------
  function resize() {
    if (!engine) return;
    if (engine.container !== stage) engine.mount(stage);
    else engine.resize();
    W = engine.W; H = engine.H;
    cam.fit(W, H);
    stage.appendChild(car); // the hit layer stays above the canvas
    repositionDirt();
  }

  const v3 = new T.Vector3();
  function project(x, y, z) {
    v3.set(x, y, z).project(camera);
    return [((v3.x + 1) / 2) * W, ((1 - v3.y) / 2) * H];
  }

  function carX(now) {
    const s = carState;
    if (s.phase === 'in') {
      const f = Math.min(1, (now - s.t0) / game.config.work.carArriveMs);
      const e = 1 - Math.pow(1 - f, 3);
      return -7 + 7 * e;
    }
    if (s.phase === 'out') {
      const f = Math.min(1, (now - s.t0) / game.config.work.carLeaveMs);
      return 0 + 8 * f * f;
    }
    if (s.phase === 'wash') return 0;
    return -7;
  }

  let lastTime = 0;
  function render(now) {
    if (!visible || !engine) return;
    if (lastTime) engine.trackFrame(now - lastTime, now);
    lastTime = now;
    for (const b of brushes) b.rotation.y = now / 120;
    for (const m of muds.values()) { const s = 1 + Math.sin(now / 260 + m.position.x * 3) * 0.06; m.scale.setScalar(s).multiply(m.userData.base || (m.userData.base = m.scale.clone())); }
    for (let i = 0; i < spray.length; i++) {
      const f = ((now / 900) + i / spray.length) % 1;
      spray[i].position.set(-0.6 + i * 0.5, 1.75 - f * 1.5, -1.3);
      spray[i].material.opacity = 0.9 - f * 0.8;
    }
    if (carState.model) {
      const x = carX(now);
      const bounce = carState.phase === 'in' ? Math.abs(Math.sin(now / 90)) * 0.03 : 0;
      carState.model.group.position.set(x, 0.06 + bounce, 0);
      carState.model.group.visible = carState.phase !== 'gone';
      const spin = carState.phase === 'wash' ? 0 : x * 3.5;
      for (const w of carState.model.wheels) w.rotation.z = -spin;
      if (carState.phase === 'in') repositionDirt(x);
    }
    for (let i = foam.length - 1; i >= 0; i--) {
      const p = foam[i];
      const f = (now - p.t0) / p.dur;
      if (f >= 1) { scene.remove(p.mesh); foam.splice(i, 1); continue; }
      p.mesh.position.set(p.x + p.vx * f, p.y + f * 0.9 + p.vy * f, p.z + p.vz * f);
      const s = 0.6 + f;
      p.mesh.scale.set(s, s, s);
      p.mesh.material.opacity = 0.95 - f * 0.9;
    }
    engine.render(scene, camera);
    raf = requestAnimationFrame(render);
  }

  // ---------- dirt: 3D blobs on the car + transparent DOM hit areas ----------
  function slotScreen(slot, x = 0) {
    const [px, py, pz] = slotPoint(slot);
    return project(px + x, py + 0.06, pz);
  }

  function placeDirt(n) {
    clearSpots();
    const chosen = SLOTS.slice().sort(() => Math.random() - 0.5).slice(0, n);
    for (const slot of chosen) {
      const idx = SLOTS.indexOf(slot);
      const [px, py] = slotScreen(slot);
      const d = document.createElement('div');
      d.className = 'dirt';
      d.style.left = `${px}px`;
      d.style.top = `${py}px`;
      d.dataset.slot = String(idx);
      d.appendChild(document.createElement('i'));
      car.appendChild(d);
      const m = mudModel(slot.side);
      const [wx, wy, wz] = slotPoint(slot);
      m.position.set(wx, wy, wz);
      m.rotation.y = Math.random() * 6;
      carState.model.group.add(m);
      muds.set(idx, m);
    }
  }

  /** After a resize (or while the car drives in) the car is projected anew: move the hit areas along. */
  function repositionDirt(x = 0) {
    for (const d of car.querySelectorAll('.dirt')) {
      const slot = SLOTS[Number(d.dataset.slot)];
      if (!slot) continue;
      const [px, py] = slotScreen(slot, x);
      d.style.left = `${px}px`;
      d.style.top = `${py}px`;
    }
  }

  function newCar() {
    if (!visible) return;
    clearSpots();
    carIndex++;
    carState.color = CAR_COLORS[(carIndex - 1) % CAR_COLORS.length];
    carState.type = CAR_TYPES[(carIndex - 1) % CAR_TYPES.length];
    if (carState.model) scene.remove(carState.model.group);
    carState.model = washCarModel(carState.color, carState.type);
    scene.add(carState.model.group);
    carState.phase = 'in';
    carState.t0 = performance.now();
    const n = randomInt(game.config.work.dirtMin, game.config.work.dirtMax);
    dirtLeft = n;
    ready = false;
    car.className = 'werk-car in';
    carShownAt = performance.now();
    game.audio.play('whoosh');
    later(() => {
      carState.phase = 'wash';
      placeDirt(n);
      ready = true;
    }, game.config.work.carArriveMs);
  }

  function clearSpots() {
    for (const d of car.querySelectorAll('.dirt, .bubble-fx, .sparkle-fx, .float-fx')) d.remove();
    for (const m of muds.values()) if (m.parent) m.parent.remove(m);
    muds.clear();
  }

  function foamAt(wx, wy, wz, n = 6) {
    for (let i = 0; i < n; i++) {
      if (foam.length >= FOAM_MAX) break;
      const mesh = meshSphere(0.09 + Math.random() * 0.08, '#ffffff', 8, { transparent: true, opacity: 0.95 });
      mesh.castShadow = false;
      scene.add(mesh);
      foam.push({ mesh, x: wx, y: wy, z: wz, vx: (Math.random() - 0.5) * 1.2, vy: Math.random() * 0.6, vz: (Math.random() - 0.5) * 1.2, t0: performance.now(), dur: 500 + Math.random() * 300 });
    }
  }

  function bubbles(x, y) {
    const rect = car.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      const b = document.createElement('span');
      b.className = 'bubble-fx';
      b.style.left = `${x - rect.left - 14}px`;
      b.style.top = `${y - rect.top - 14}px`;
      b.style.setProperty('--dx', `${(Math.random() - 0.5) * 140}px`);
      b.style.setProperty('--dy', `${-40 - Math.random() * 100}px`);
      car.appendChild(b);
      later(() => b.remove(), 800);
    }
  }

  function clean(spot, x, y) {
    if (!ready || spot.classList.contains('gone')) return;
    // the splat stays in the DOM (invisible, no pointer events) until the next car: removing it mid-swipe
    // would end the touch sequence on iOS
    spot.classList.add('gone');
    const idx = Number(spot.dataset.slot);
    const m = muds.get(idx);
    if (m) {
      const t0 = performance.now();
      const shrink = () => { const f = Math.min(1, (performance.now() - t0) / 220); m.scale.multiplyScalar(1 - f * 0.5); if (f < 1 && m.parent) requestAnimationFrame(shrink); else if (m.parent) m.parent.remove(m); };
      shrink();
      const [wx, wy, wz] = slotPoint(SLOTS[idx]);
      foamAt(wx + carX(performance.now()), wy + 0.1, wz);
    }
    dirtLeft--;
    game.audio.play('bubble');
    bubbles(x, y);
    if (dirtLeft <= 0) carDone();
  }

  function carDone() {
    ready = false;
    game.audio.play('sparkle');
    const [cx, cy] = project(0, 1.4, 0);
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      s.className = 'sparkle-fx';
      s.textContent = '✨';
      s.style.left = `${cx - 120 + i * 100}px`;
      s.style.top = `${cy - 60 + (i % 2) * 70}px`;
      car.appendChild(s);
      later(() => s.remove(), 700);
    }
    foamAt(0, 1.0, 0.7, 10);
    const plus = document.createElement('span');
    plus.className = 'float-fx';
    plus.textContent = `+${game.config.work.coinsPerCar}`;
    plus.style.left = `${cx - 20}px`;
    plus.style.top = `${cy - 40}px`;
    car.appendChild(plus);
    later(() => plus.remove(), 900);
    sessionCars++;
    countEl.querySelector('span').textContent = String(sessionCars);
    countEl.classList.remove('bump');
    void countEl.offsetWidth;
    countEl.classList.add('bump');
    game.update((s) => washCar(s, game.config, game.now()));
    game.audio.play('coin');
    const srect = stage.getBoundingClientRect();
    game.fx.flyCoins(srect.left + cx, srect.top + cy, 2);
    const stt = game.state;
    if (stt.carsWashed >= game.config.work.tiredAfterCars && !stt.flags.tiredSaid) {
      game.update((s) => setFlag(s, 'tiredSaid', true));
      later(() => game.mentor.say('lines.tired', {}, { kind: 'reaction' }), 400);
    }
    later(() => {
      carState.phase = 'out';
      carState.t0 = performance.now();
      car.className = 'werk-car out';
      game.audio.play('whoosh');
      const elapsed = performance.now() - carShownAt;
      const wait = Math.max(game.config.work.carLeaveMs, game.config.work.minCycleMs - elapsed);
      later(() => { carState.phase = 'gone'; }, game.config.work.carLeaveMs);
      later(newCar, wait);
    }, 450);
  }

  function hitAt(x, y) {
    const target = document.elementFromPoint(x, y);
    const spot = target && target.closest ? target.closest('.dirt') : null;
    if (spot) { clean(spot, x, y); return true; }
    return false;
  }

  /** A tap that misses (or comes while the car is still driving in) still answers with a splash. */
  function splash(x, y) {
    const rect = car.getBoundingClientRect();
    for (let i = 0; i < 4; i++) {
      const b = document.createElement('span');
      b.className = 'bubble-fx';
      b.style.left = `${x - rect.left - 14}px`;
      b.style.top = `${y - rect.top - 14}px`;
      b.style.setProperty('--dx', `${(Math.random() - 0.5) * 100}px`);
      b.style.setProperty('--dy', `${-30 - Math.random() * 60}px`);
      car.appendChild(b);
      later(() => b.remove(), 700);
    }
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!hitAt(e.clientX, e.clientY)) splash(e.clientX, e.clientY);
  });
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' && e.buttons === 0) return;
    hitAt(e.clientX, e.clientY);
  });

  klaar.addEventListener('click', () => {
    game.audio.play('tap');
    game.show('stad');
  });

  window.addEventListener('resize', () => { if (visible) resize(); });

  return {
    show() {
      visible = true;
      sessionCars = 0;
      countEl.querySelector('span').textContent = '0';
      resize();
      cancelAnimationFrame(raf);
      lastTime = 0;
      raf = requestAnimationFrame(render);
      game.update((s) => startWork(s, game.now()));
      carState.phase = 'gone';
      later(newCar, 120);
      if (!game.state.flags.workIntro) {
        game.update((s) => setFlag(s, 'workIntro', true));
        later(() => game.mentor.say('lines.firstWork', {}, { kind: 'reaction' }), 500);
      }
    },
    hide() {
      visible = false;
      cancelAnimationFrame(raf);
      raf = 0;
      clearTimers();
      clearSpots();
      for (const p of foam) scene.remove(p.mesh);
      foam.length = 0;
      carState.phase = 'gone';
      if (carState.model) carState.model.group.visible = false;
      car.className = 'werk-car';
      game.update((s) => endWork(s));
      game.save();
    },
    render() {},
  };
}
