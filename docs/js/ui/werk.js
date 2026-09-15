// werk.js — WERK as a conveyor mini-game (V7.6, PLAN-V7 §D, Johannes' Higgsfield choice of 16 September 2026).
// Side view: trucks roll in from the left over a conveyor into a big friendly wash tunnel with huge striped brushes,
// foam and rainbow water arcs. The truck in the middle is muddy: tap or swipe the mud away (3D blobs on the truck with
// transparent DOM hit areas projected over them), the truck sparkles, drives out to the right where the driver waves,
// and the next truck rolls in. Work is linear and bounded: a new truck never comes sooner than minCycleMs, every
// clean truck pays coinsPerCar. HUD: one ring top-right that fills over three trucks, one big round KLAAR.
import * as T from '../../vendor/three.module.min.js';
import { addLights, createCamera } from '../3d/engine.js';
import { Builder, shade, col, textPlane, meshSphere } from '../3d/build.js';
import { startWork, endWork, washCar, setFlag, makerLevel } from '../economy.js';

const TRUCK_COLORS = ['#ff5f5f', '#45b6ff', '#ffc21c', '#45d65c', '#b76cff', '#ff6fae', '#ff9f2e', '#2dd4bf'];
const TRUCK_TYPES = ['bak', 'kiep', 'tank', 'bak', 'pickup', 'kiep'];
const L = 3.8, D = 1.4;                  // truck length (x) and width (depth); the long side faces the camera
const X_FAR = -11, X_WAIT = -5.9, X_WASH = 0, X_DONE = 5.0, X_GONE = 11.5;
const FOAM_MAX = 22;                     // SPEC §6: at most 30 live particles, and confetti may join in
const RING_GOAL = 3;                     // the ring top-right fills over three trucks
const STRIPES = ['#ff5f5f', '#ffe94d', '#45b6ff', '#45d65c'];

/**
 * A chunky toy truck, long axis along x, cab at the front (+x), centred at the origin. Types: 'bak' (box body),
 * 'kiep' (dump truck with a heap of sand), 'tank' (tanker), 'pickup' (open bed with a crate).
 * Returns { group, wheels, slots, arm }: slots are the mud spots on the side that faces the camera (u along x from
 * the back, v = height), arm is the driver's arm that waves once the truck is clean.
 */
export function truckModel(color, type = 'bak') {
  const x0 = -L / 2, y0 = -D / 2;
  const b = new Builder({ r: 0.08 });
  const silver = '#d5dbe6', frame = '#3a4160';
  b.box(x0 + 0.1, y0 + 0.1, 0.32, L - 0.2, D - 0.2, 0.22, frame, { r: 0.05 });               // chassis
  b.box(x0 + L - 0.06, y0 + 0.08, 0.36, 0.12, D - 0.16, 0.26, silver, { r: 0.04 });          // front bumper
  b.box(x0 - 0.06, y0 + 0.08, 0.36, 0.12, D - 0.16, 0.26, silver, { r: 0.04 });              // rear bumper
  // the cab
  const cx = x0 + L - 1.15, cw = 1.15, ch = 1.15, cz = 0.54;
  b.box(cx, y0, cz, cw, D, ch, color, { r: 0.16 });
  b.face(cx, y0, cz, cw, D, 'x', 0.12, 0.42, D - 0.24, 0.62, '#bfe6ff', { t: 0.045 });       // windscreen
  b.face(cx, y0, cz, cw, D, 'y', 0.42, 0.45, 0.62, 0.55, '#bfe6ff', { t: 0.045 });           // side window
  b.face(cx, y0, cz, cw, D, 'x', 0.16, 0.1, 0.26, 0.2, '#ffe94d', { t: 0.05 });              // headlights
  b.face(cx, y0, cz, cw, D, 'x', D - 0.42, 0.1, 0.26, 0.2, '#ffe94d', { t: 0.05 });
  b.face(cx, y0, cz, cw, D, 'x', 0.5, 0.08, 0.4, 0.16, '#5b6472', { t: 0.05 });              // grille
  b.box(cx + cw - 0.32, y0 + D - 0.02, cz + 0.72, 0.16, 0.12, 0.14, shade(color, -0.1), { r: 0.03 }); // mirror
  b.cyl(cx + 0.18, y0 + 0.16, cz + ch - 0.05, 0.06, 0.5, silver, 8);                         // exhaust pipe
  const slots = [{ u: cx - x0 + 0.38, v: cz + 0.22 }];                                       // mud on the cab door
  // the load behind the cab
  const lx = x0 + 0.12, lw = cx - lx - 0.12, lz = 0.54;
  if (type === 'bak') {
    b.box(lx, y0 - 0.03, lz, lw, D + 0.06, 1.5, shade(color, 0.08), { r: 0.1 });
    b.face(lx, y0 - 0.03, lz, lw, D + 0.06, 'y', 0.15, 0.6, lw - 0.3, 0.3, '#ffffff', { t: 0.04 });   // white band
    slots.push({ u: 0.5, v: 1.72 }, { u: 1.35, v: 0.95 }, { u: 2.15, v: 1.75 }, { u: 1.0, v: 1.35 });
  } else if (type === 'kiep') {
    b.box(lx, y0, lz, lw, D, 0.95, shade(color, -0.08), { r: 0.08 });
    b.face(lx, y0, lz, lw, D, 'y', 0.12, 0.08, lw - 0.24, 0.1, shade(color, -0.35), { t: 0.04 });   // a rib
    b.puff(lx + lw * 0.5, 0, lz + 0.98, 0.52, '#e2c27a', 1);                                          // sand
    b.puff(lx + lw * 0.22, 0.12, lz + 0.92, 0.36, '#d8b76c', 1);
    slots.push({ u: 0.55, v: 1.2 }, { u: 1.4, v: 0.85 }, { u: 2.1, v: 1.25 }, { u: 1.0, v: 0.62 });
  } else if (type === 'tank') {
    b.add(new T.CylinderGeometry(0.66, 0.66, lw - 0.1, 22).rotateZ(Math.PI / 2).translate(lx + lw / 2, lz + 0.72, 0), silver);
    for (const f of [0.22, 0.5, 0.78]) b.add(new T.CylinderGeometry(0.7, 0.7, 0.12, 22).rotateZ(Math.PI / 2).translate(lx + lw * f, lz + 0.72, 0), color);
    b.box(lx + 0.2, y0 + 0.2, lz, lw - 0.4, D - 0.4, 0.3, frame, { r: 0.04 });                       // the saddle
    slots.push({ u: 0.55, v: 1.05 }, { u: 1.4, v: 1.5 }, { u: 2.15, v: 0.95 }, { u: 1.0, v: 1.55 });
  } else {
    b.box(lx, y0, lz, lw, D, 0.62, shade(color, 0.05), { r: 0.08 });                                   // open bed
    b.box(lx + 0.1, y0 + 0.1, lz + 0.5, lw - 0.2, D - 0.2, 0.08, shade(color, -0.4), { r: 0.02 });
    b.box(lx + 0.45, y0 + 0.25, lz + 0.56, 0.9, 0.9, 0.7, '#8a5a35', { r: 0.06 });                     // a crate
    slots.push({ u: 0.5, v: 0.85 }, { u: 1.6, v: 0.82 }, { u: 2.3, v: 0.78 }, { u: 1.05, v: 0.7 });
  }
  const group = new T.Group();
  group.add(b.build());
  // wheels: three a side
  const wheels = [];
  for (const wx of [x0 + 0.62, x0 + 1.32, x0 + L - 0.62]) for (const dz of [-D / 2 - 0.02, D / 2 + 0.02]) {
    const wheel = new T.Mesh(new T.CylinderGeometry(0.34, 0.34, 0.26, 18).rotateX(Math.PI / 2), new T.MeshStandardMaterial({ color: col('#1b1f3b'), roughness: 0.85 }));
    const hub = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 0.28, 12).rotateX(Math.PI / 2), new T.MeshStandardMaterial({ color: col('#c5ccd8'), roughness: 0.4, metalness: 0.3 }));
    wheel.add(hub);
    wheel.position.set(wx, 0.34, dz);
    wheel.castShadow = true;
    group.add(wheel);
    wheels.push(wheel);
  }
  // the driver in the side window: head with a cap looking at you, and an arm that waves when the truck is clean
  const driver = new T.Group();
  const hb = new Builder({ r: 0.02 });
  hb.sphere(0, 0, 0, 0.17, '#f7c9a3', 12);
  hb.sphere(0, 0, 0.09, 0.15, '#ff5f5f', 12);
  hb.box(0.06, -0.1, 0.1, 0.2, 0.2, 0.05, '#ff5f5f', { r: 0.02 });   // the peak of the cap points forward
  hb.sphere(-0.06, 0.15, 0.02, 0.028, '#1b1f3b', 6);
  hb.sphere(0.06, 0.15, 0.02, 0.028, '#1b1f3b', 6);
  driver.add(hb.build({ receive: false }));
  driver.position.set(cx + 0.73, cz + 0.72, y0 + D + 0.03);
  const arm = new T.Mesh(new T.BoxGeometry(0.09, 0.4, 0.09).translate(0, 0.18, 0), new T.MeshStandardMaterial({ color: col('#f7c9a3'), roughness: 0.8 }));
  arm.position.set(-0.24, -0.16, 0.06);
  arm.visible = false;
  driver.add(arm);
  group.add(driver);
  return { group, wheels, slots, arm, type };
}

/** World point (truck-local) of a mud slot on the long side that faces the camera. */
function slotPoint(slot) {
  return [-L / 2 + slot.u, slot.v, D / 2 + 0.04];
}

function mudModel() {
  const b = new Builder({ r: 0.02 });
  const c = '#7a4a22', dark = '#583417', light = '#a06a35';
  // a flat splat: puffs squashed along the face normal
  const puff = (x, y, z, r, color) => { const g = new T.IcosahedronGeometry(r, 1); g.translate(x, z, y); b.add(g, color); };
  puff(0, 0, 0, 0.36, c);
  puff(0.28, 0.03, 0.18, 0.21, dark);
  puff(-0.27, -0.03, -0.15, 0.22, light);
  puff(0.08, 0.05, -0.31, 0.16, dark);
  puff(-0.12, 0.03, 0.31, 0.15, light);
  puff(0.31, -0.02, -0.22, 0.12, c);
  const m = b.build({ receive: false });
  m.scale.z = 0.35;
  return m;
}

/** A striped brush roller of `len` along its axis, radius r; the mesh is centred at the origin, axis along y. */
function stripedRoller(len, r, seg = 8) {
  const b = new Builder({ r: 0.02 });
  const h = len / seg;
  for (let i = 0; i < seg; i++) b.add(new T.CylinderGeometry(r, r, h + 0.01, 18).translate(0, -len / 2 + h * (i + 0.5), 0), STRIPES[i % 4]);
  b.add(new T.CylinderGeometry(r * 0.35, r * 0.35, len + 0.5, 10), '#c5ccd8');   // the axle
  const m = b.build({ receive: false });
  m.castShadow = true;
  return m;
}

function disposeGroup(g) {
  g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
}

export function createWerk(game) {
  const stage = document.getElementById('werk-stage');
  const car = document.getElementById('werk-car');          // the hit layer above the canvas (name kept for the tests)
  const ringEl = document.getElementById('werk-count');
  const ringN = document.getElementById('werk-count-n');
  const klaar = document.getElementById('btn-klaar');
  const engine = game.engine;
  let W = 0, H = 0;
  let dirtLeft = 0;
  let ready = false;
  let visible = false;
  let truckIndex = 0;
  let sessionCars = 0;
  let carShownAt = 0;
  let timers = [];
  let raf = 0;
  const foam = [];
  const muds = new Map(); // slot index → mesh
  // the three trucks on screen: waiting (left), washing (middle), done (right, waving). Each { model, from, to, t0, dur, x }
  const trucks = { wait: null, wash: null, done: null };
  const leaving = [];     // trucks driving off to the right, removed when out of view

  function later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { for (const t of timers) clearTimeout(t); timers = []; }
  function randomInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  // ---------- the yard ----------
  const scene = new T.Scene();
  scene.fog = new T.Fog(col('#8fdcff'), 70, 170);
  const lights = addLights(scene, new T.Vector3(0, 0.5, 0), 13, engine ? engine.tier : 0);
  if (engine) engine.onTier((t) => lights.setTier(t));
  const cam = createCamera(
    { min: { x: -8.0, y: -0.3, z: -3.6 }, max: { x: 7.4, y: 4.9, z: 1.7 } },
    { top: 100, bottom: 24, left: 0, right: 0 },
    { fov: 28, elev: 0.24, az: 0.16 },
  );
  const camera = cam.camera;
  const st = new Builder({ r: 0.05 });
  st.box(-32, -16, -0.5, 64, 30, 0.5, '#5ccb5f', { r: 0.2 });                  // grass
  st.box(-32, -3.2, -0.02, 64, 5.6, 0.06, '#cfd6e2', { r: 0.02 });             // the concrete yard
  for (const [x, y, r, c] of [[-12, -10, 4.8, '#4fbf58'], [-3, -12, 5.8, '#55c95e'], [7, -11, 5.2, '#4fbf58'], [15, -9, 4.2, '#59cf62'], [23, -10, 5.5, '#4fbf58'], [-21, -10, 5.2, '#55c95e']]) st.sphere(x, y, -r * 0.55, r, c, 16);   // hills
  for (const [x, y, s] of [[-11, -5.6, 1.6], [-9.1, -6.3, 1.2], [9.6, -5.7, 1.6], [11.6, -6.5, 1.2], [-13.2, -3.4, 1.1], [13.4, -3.6, 1.3], [-8.2, 2.9, 1.0], [8.6, 2.8, 1.0]]) st.tree(x, y, s);
  for (const [x, y, z, r] of [[-9.5, -13, 7.2, 0.95], [-8.0, -13, 7.5, 0.7], [6, -14, 8.2, 1.05], [7.7, -14, 7.8, 0.75], [0.5, -15, 9.2, 0.85], [-1.1, -15, 9.0, 0.6]]) st.puff(x, y, z, r, '#ffffff', 1);   // clouds
  st.bush(-7.6, 1.9, 0.7); st.bush(7.4, 2.0, 0.6); st.bush(-6.2, -2.9, 0.6); st.bush(6.4, -3.0, 0.6);
  for (const [x, y, c] of [[-7.0, 2.3, '#ff6fae'], [-6.6, 2.6, '#ffe94d'], [6.9, 2.4, '#ff6fae'], [7.3, 2.7, '#ffffff']]) st.flower(x, y, c);
  // the conveyor: a grey belt between two rails, stripes move in render()
  st.box(-13, -1.05, 0, 26, 2.1, 0.12, '#8b93a3', { r: 0.03 });
  st.box(-13, -1.22, 0, 26, 0.17, 0.18, '#5f6779', { r: 0.02 });
  st.box(-13, 1.05, 0, 26, 0.17, 0.18, '#5f6779', { r: 0.02 });
  // the wash hall behind the lane, its tunnel mouth open towards the lane
  const hx = -3.9, hy = -3.8, hw = 7.8, hd = 2.7, hh = 3.7;
  const blue = '#3d8fe6';
  st.box(hx, hy, 0, hw, hd, hh, blue, { r: 0.16 });
  st.box(hx - 0.15, hy - 0.15, hh, hw + 0.3, hd + 0.3, 0.3, shade(blue, -0.3), { r: 0.06 });
  st.face(hx, hy, 0, hw, hd, 'y', 1.3, 0, 5.2, 2.8, '#1a3a6e', { t: 0.06 });                         // the mouth
  st.face(hx, hy, 0, hw, hd, 'y', 1.1, 2.62, 5.6, 0.32, '#ffe94d', { t: 0.08 });                      // yellow lintel
  for (const u of [0.25, hw - 0.95]) { st.face(hx, hy, 0, hw, hd, 'y', u, 1.5, 0.7, 0.7, '#ffffff', { t: 0.04 }); st.face(hx, hy, 0, hw, hd, 'y', u + 0.06, 1.56, 0.58, 0.58, '#cfe9ff', { t: 0.06 }); }
  st.add(new T.CylinderGeometry(0.66, 0.66, 0.1, 28).rotateX(Math.PI / 2).translate(hx + hw / 2, hh + 0.5, hy + hd + 0.05), '#ffffff');   // round sign
  st.add(new T.CylinderGeometry(0.54, 0.54, 0.12, 28).rotateX(Math.PI / 2).translate(hx + hw / 2, hh + 0.5, hy + hd + 0.06), blue);
  st.add(new T.SphereGeometry(0.16, 10, 8).translate(hx + hw / 2, hh + 0.42, hy + hd + 0.14), '#dff4ff');                                   // a drop on the sign
  st.add(new T.ConeGeometry(0.16, 0.26, 10).translate(hx + hw / 2, hh + 0.6, hy + hd + 0.14), '#dff4ff');
  st.cyl(hx + hw - 0.6, hy + 0.5, hh + 0.3, 0.04, 1.4, '#dcd7cb', 8);                                  // flag pole
  // the tunnel roof reaches out over the lane
  st.box(hx + 0.9, hy + hd, hh - 0.55, hw - 1.8, 2.3, 0.36, shade(blue, -0.12), { r: 0.06 });
  // foam clouds at the mouth and around the brushes
  for (const [x, y, z, r] of [[-3.0, 0.2, 0.25, 0.45], [-2.6, 0.9, 0.2, 0.38], [3.0, 0.2, 0.25, 0.45], [2.6, 0.9, 0.2, 0.38], [-2.3, 1.2, 0.3, 0.32], [2.4, 1.2, 0.3, 0.32], [-2.9, -0.4, 2.6, 0.4], [2.9, -0.4, 2.6, 0.4], [0, -0.6, 2.75, 0.45]]) st.puff(x, y, z, r, '#ffffff', 1);
  // a bucket with a sponge and a cone at the sides
  st.cyl(-6.9, 0.3, 0.06, 0.32, 0.55, '#45b6ff', 14, 0.36); st.cyl(-6.9, 0.3, 0.58, 0.36, 0.06, '#1a7ad6', 14); st.box(-7.05, 0.1, 0.62, 0.3, 0.26, 0.2, '#ffe94d', { r: 0.05 });
  st.cone(6.9, 0.4, 0.06, 0.28, 0.8, '#ff9f2e', 12); st.box(6.6, 0.1, 0.06, 0.6, 0.6, 0.06, '#ff9f2e', { r: 0.03 }); st.box(6.65, 0.15, 0.4, 0.5, 0.5, 0.06, '#ffffff', { r: 0.02 });
  scene.add(st.build());
  const signText = textPlane('WASSTRAAT', { w: 3.4, h: 0.34, font: 0.27, color: '#ffffff' });
  signText.position.set(hx + hw / 2, hh - 0.37, hy + hd + 2.3 + 0.02);   // on the front edge of the tunnel roof
  scene.add(signText);
  // the rainbow water arcs behind the truck
  for (const [i, c] of [['#ff5f5f'], ['#ffe94d'], ['#45b6ff']].entries()) {
    const arc = new T.Mesh(new T.TorusGeometry(2.25 + i * 0.2, 0.07, 8, 48, Math.PI), new T.MeshStandardMaterial({ color: col(c[0]), emissive: col(c[0]), emissiveIntensity: 0.35, roughness: 0.5 }));
    arc.position.set(0, 0.25, -0.85);
    scene.add(arc);
  }
  // the brushes: two big vertical rollers in front of the lane, one across above it
  const brushes = [];
  for (const bx of [-2.45, 2.45]) {
    const roller = stripedRoller(2.5, 0.46);
    roller.position.set(bx, 1.4, 1.1);
    scene.add(roller);
    brushes.push(roller);
  }
  const topRoller = stripedRoller(3.2, 0.4, 10);
  topRoller.rotation.z = Math.PI / 2;
  topRoller.position.set(0, 2.62, 0.1);
  scene.add(topRoller);
  const spray = [];
  for (let i = 0; i < 7; i++) { const s = meshSphere(0.07, '#dff4ff', 6, { transparent: true, opacity: 0.9 }); s.castShadow = false; scene.add(s); spray.push(s); }
  // conveyor stripes
  const stripes = [];
  for (let i = 0; i < 13; i++) {
    const s = new T.Mesh(new T.BoxGeometry(0.42, 0.03, 1.8), new T.MeshStandardMaterial({ color: col('#6f7787'), roughness: 0.9 }));
    s.position.set(-13 + i * 2, 0.13, 0);
    scene.add(s);
    stripes.push(s);
  }

  // ---------- V5.4: the hall grows with the level of the Wasstraat coin-maker (1 flags … 5 a palace) ----------
  const upgrade = new T.Group();
  scene.add(upgrade);
  const extraBrushes = [];
  const flags = [];
  const bulbs = [];
  let hallLevel = -1;
  const bulbMat = new T.MeshStandardMaterial({ color: col('#fff3b0'), emissive: col('#ffd23f'), emissiveIntensity: 1.2 });
  const neonMat = new T.MeshStandardMaterial({ color: col('#ff5fae'), emissive: col('#ff2d95'), emissiveIntensity: 1.6 });
  function flagAt(x, y, z, color, size = 1) {
    const pole = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1.1 * size, 6), new T.MeshStandardMaterial({ color: col('#dcd7cb') }));
    pole.position.set(x, y + 0.55 * size, z);
    upgrade.add(pole);
    const cloth = new T.Mesh(new T.PlaneGeometry(0.55 * size, 0.32 * size).translate(0.27 * size, 0, 0), new T.MeshStandardMaterial({ color: col(color), side: T.DoubleSide }));
    cloth.position.set(x, y + 0.95 * size, z);
    upgrade.add(cloth);
    flags.push(cloth);
  }
  function buildUpgrade(level) {
    while (upgrade.children.length) upgrade.remove(upgrade.children[0]);
    extraBrushes.length = 0; flags.length = 0; bulbs.length = 0;
    flagAt(hx + hw - 0.6, hh + 0.9, hy + 0.5, '#ffe94d', 1.1);   // the flag on the pole is always there
    if (level <= 0) return;
    const b = new Builder({ r: 0.04 });
    flagAt(hx + 0.3, hh + 0.3, hy + 0.3, '#ff5f5f');              // level 1: flags on the roof corners
    flagAt(hx + 0.3, hh + 0.3, hy + hd - 0.3, '#45d65c');
    if (level >= 2) {
      // neon along the roof edge and a glowing ring round the sign
      const strip = new T.Mesh(new T.BoxGeometry(hw + 0.3, 0.08, 0.08), neonMat);
      strip.position.set(hx + hw / 2, hh + 0.28, hy + hd + 0.2);
      upgrade.add(strip);
      const ring = new T.Mesh(new T.TorusGeometry(0.76, 0.05, 8, 40), neonMat);
      ring.position.set(hx + hw / 2, hh + 0.5, hy + hd + 0.1);
      upgrade.add(ring);
    }
    if (level >= 3) {
      // a second pair of brushes, a foam cannon and two palms
      for (const bx of [-3.7, 3.7]) {
        const roller = stripedRoller(1.9, 0.34, 6);
        roller.position.set(bx, 1.05, 0.9);
        upgrade.add(roller);
        extraBrushes.push(roller);
      }
      b.cyl(-5.6, 1.4, 0.06, 0.12, 0.9, '#9aa3b2', 8);
      b.box(-6.0, 1.1, 0.9, 0.8, 0.5, 0.4, '#45b6ff', { r: 0.08 });
      b.cone(-5.2, 1.35, 1.05, 0.14, 0.5, '#dff4ff', 8);
      for (const [px, py] of [[-6.6, -2.6], [6.8, -2.6]]) {
        for (let i = 0; i < 6; i++) b.cyl(px + i * 0.05, py - i * 0.03, i * 0.36, 0.13 - i * 0.008, 0.4, i % 2 ? '#a8763f' : '#8a5a35', 10);
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const g = new T.BoxGeometry(1.3, 0.05, 0.32); g.translate(0.6, 0, 0); g.rotateZ(-0.35); g.rotateY(a); g.translate(px + 0.3, 2.3, py - 0.15); b.add(g, i % 2 ? '#45d65c' : '#3fbf5a'); }
      }
    }
    if (level >= 4) {
      // a string of lights along the tunnel roof and two lamp posts
      for (let i = 0; i < 9; i++) {
        const bulb = new T.Mesh(new T.SphereGeometry(0.1, 7, 6), bulbMat.clone());
        bulb.position.set(-2.8 + i * 0.7, hh - 0.75, hy + hd + 2.25);
        upgrade.add(bulb);
        bulbs.push(bulb);
      }
      for (const [px, py] of [[-6.2, -1.6], [6.2, -1.6]]) { b.cyl(px, py, 0.06, 0.07, 2.4, '#8a8f99', 8); b.sphere(px, py, 2.55, 0.17, '#fff3b0', 8); }
    }
    if (level >= 5) {
      // the palace: golden trim, a tower with a dome and a star, a fountain, bunting
      b.box(hx - 0.15, hy - 0.15, hh + 0.3, hw + 0.3, hd + 0.3, 0.1, '#ffc21c', { r: 0.03 });
      b.box(hx + 0.4, hy + 0.5, hh + 0.4, 1.3, 1.3, 1.7, '#ffffff', { r: 0.06 });
      b.sphere(hx + 1.05, hy + 1.15, hh + 2.1, 0.75, '#ffc21c', 12);
      b.cone(hx + 1.05, hy + 1.15, hh + 2.75, 0.12, 0.5, '#ffe94d', 5);
      b.disc(7.2, -2.4, 0.06, 0.9, '#1a7ad6', 0.12, 20);
      b.cyl(7.2, -2.4, 0.15, 0.12, 0.7, '#e9e2cf', 10);
      b.disc(7.2, -2.4, 0.85, 0.36, '#e9e2cf', 0.08, 14);
      for (let i = 0; i < 12; i++) b.box(-2.9 + i * 0.55, 1.45, hh - 0.95 - (i % 2) * 0.08, 0.26, 0.03, 0.22, STRIPES[i % 4], { r: 0.01 });
    }
    upgrade.add(b.build());
  }
  function syncHall() {
    const level = makerLevel(game.state, 'wasstraat');
    if (level !== hallLevel) { hallLevel = level; buildUpgrade(level); }
  }

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

  // ---------- the trucks ----------
  function spawnTruck(x) {
    truckIndex++;
    const model = truckModel(TRUCK_COLORS[(truckIndex - 1) % TRUCK_COLORS.length], TRUCK_TYPES[(truckIndex - 1) % TRUCK_TYPES.length]);
    model.group.position.set(x, 0, 0);
    scene.add(model.group);
    return { model, from: x, to: x, t0: 0, dur: 1, x };
  }
  function drive(t, to, dur, now = performance.now()) {
    t.from = t.x; t.to = to; t.t0 = now; t.dur = Math.max(1, dur);
  }
  function truckX(t, now) {
    const f = Math.min(1, (now - t.t0) / t.dur);
    const e = t.to > t.from ? 1 - Math.pow(1 - f, 3) : f;   // ease out when arriving
    return t.from + (t.to - t.from) * e;
  }
  function removeTruck(t) {
    if (!t) return;
    scene.remove(t.model.group);
    disposeGroup(t.model.group);
  }

  let lastTime = 0, lastSparkle = 0, lastBrushFoam = 0;
  function render(now) {
    if (!visible || !engine) return;
    if (engine.checkSize()) resize();   // V7.0: the container changed size without a usable resize event (iPad rotation)
    const dt = lastTime ? Math.min(0.1, (now - lastTime) / 1000) : 0;
    if (lastTime) engine.trackFrame(now - lastTime, now);
    lastTime = now;
    const washing = !!trucks.wash && ready;
    for (const b of brushes) b.rotation.y = now / (washing ? 90 : 220);
    topRoller.rotation.x = now / (washing ? 110 : 260);
    for (const b of extraBrushes) b.rotation.y = -now / 130;
    for (let i = 0; i < flags.length; i++) flags[i].rotation.y = Math.sin(now / 260 + i) * 0.35;
    for (let i = 0; i < bulbs.length; i++) bulbs[i].material.emissiveIntensity = 0.6 + Math.max(0, Math.sin(now / 250 + i * 1.3)) * 1.4;
    for (const s of stripes) { s.position.x += dt * 0.9; if (s.position.x > 13) s.position.x -= 26; }
    for (const m of muds.values()) { const s = 1 + Math.sin(now / 260 + m.position.x * 3) * 0.06; m.scale.setScalar(s).multiply(m.userData.base || (m.userData.base = m.scale.clone())); }
    for (let i = 0; i < spray.length; i++) {
      const f = ((now / 900) + i / spray.length) % 1;
      spray[i].position.set(-1.5 + i * 0.5, 2.3 - f * 1.4, 0.8);
      spray[i].material.opacity = 0.9 - f * 0.8;
    }
    // the trucks roll; wheels turn with the distance; the clean driver waves
    const all = [trucks.wait, trucks.wash, trucks.done, ...leaving];
    for (const t of all) {
      if (!t) continue;
      const x = truckX(t, now);
      const moving = Math.abs(x - t.x) > 1e-4;
      t.x = x;
      t.model.group.position.set(x, moving ? Math.abs(Math.sin(now / 90)) * 0.03 : 0, 0);
      if (moving) for (const w of t.model.wheels) w.rotation.z = -x * 3;
      const waving = t === trucks.done;
      t.model.arm.visible = waving;
      if (waving) t.model.arm.rotation.z = 0.7 + Math.sin(now / 140) * 0.55;
    }
    for (let i = leaving.length - 1; i >= 0; i--) if (leaving[i].x >= X_GONE - 0.01) { removeTruck(leaving[i]); leaving.splice(i, 1); }
    if (trucks.wash && trucks.wash.x !== X_WASH && muds.size) repositionDirt(trucks.wash.x);
    // foam from the brushes while a truck is being washed; sparkles above the clean one
    if (washing && now - lastBrushFoam > 240 && foam.length < FOAM_MAX - 6) { lastBrushFoam = now; foamAt(-2.1, 0.5 + Math.random() * 1.6, 0.9, 1); foamAt(2.1, 0.5 + Math.random() * 1.6, 0.9, 1); }
    if (trucks.done && trucks.done.x >= X_DONE - 0.05 && now - lastSparkle > 700) { lastSparkle = now; sparkleAt(trucks.done.x + (Math.random() - 0.5) * 2.4, 1.2 + Math.random() * 1.2); }
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

  // ---------- mud: 3D blobs on the truck + transparent DOM hit areas ----------
  function slotScreen(slot, x = X_WASH) {
    const [px, py, pz] = slotPoint(slot);
    return project(px + x, py, pz);
  }

  function placeDirt(n) {
    clearSpots();
    const t = trucks.wash;
    if (!t) return;
    const slots = t.model.slots;
    const chosen = slots.slice().sort(() => Math.random() - 0.5).slice(0, n);
    for (const slot of chosen) {
      const idx = slots.indexOf(slot);
      const [px, py] = slotScreen(slot, t.x);
      const d = document.createElement('div');
      d.className = 'dirt';
      d.style.left = `${px}px`;
      d.style.top = `${py}px`;
      d.dataset.slot = String(idx);
      d.appendChild(document.createElement('i'));
      car.appendChild(d);
      const m = mudModel();
      const [wx, wy, wz] = slotPoint(slot);
      m.position.set(wx, wy, wz);
      m.rotation.z = Math.random() * 6;
      t.model.group.add(m);
      muds.set(idx, m);
    }
  }

  /** After a resize (or while the truck rolls) the truck is projected anew: move the hit areas along. */
  function repositionDirt(x = trucks.wash ? trucks.wash.x : X_WASH) {
    const slots = trucks.wash ? trucks.wash.model.slots : [];
    for (const d of car.querySelectorAll('.dirt')) {
      const slot = slots[Number(d.dataset.slot)];
      if (!slot) continue;
      const [px, py] = slotScreen(slot, x);
      d.style.left = `${px}px`;
      d.style.top = `${py}px`;
    }
  }

  /** The next truck rolls from the waiting spot into the tunnel; a new one comes to wait behind it. */
  function newCar() {
    if (!visible) return;
    clearSpots();
    const now = performance.now();
    if (!trucks.wait) trucks.wait = spawnTruck(X_FAR);
    trucks.wash = trucks.wait;
    drive(trucks.wash, X_WASH, game.config.work.carArriveMs, now);
    trucks.wait = spawnTruck(X_FAR);
    drive(trucks.wait, X_WAIT, game.config.work.carArriveMs + 250, now);
    const n = randomInt(game.config.work.dirtMin, game.config.work.dirtMax);
    dirtLeft = n;
    ready = false;
    car.className = 'werk-car in';
    carShownAt = now;
    game.audio.play('whoosh');
    later(() => {
      trucks.wash.x = X_WASH;
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

  function sparkleAt(wx, wy) {
    const [sx, sy] = project(wx, wy, D / 2 + 0.2);
    const s = document.createElement('span');
    s.className = 'sparkle-fx';
    s.textContent = '✨';
    s.style.left = `${sx - 26}px`;
    s.style.top = `${sy - 26}px`;
    car.appendChild(s);
    later(() => s.remove(), 700);
  }

  function clean(spot, x, y) {
    if (!ready || spot.classList.contains('gone')) return;
    // the splat stays in the DOM (invisible, no pointer events) until the next truck: removing it mid-swipe
    // would end the touch sequence on iOS
    spot.classList.add('gone');
    const idx = Number(spot.dataset.slot);
    const m = muds.get(idx);
    if (m && trucks.wash) {
      const t0 = performance.now();
      const shrink = () => { const f = Math.min(1, (performance.now() - t0) / 220); m.scale.multiplyScalar(1 - f * 0.5); if (f < 1 && m.parent) requestAnimationFrame(shrink); else if (m.parent) m.parent.remove(m); };
      shrink();
      const [wx, wy, wz] = slotPoint(trucks.wash.model.slots[idx]);
      foamAt(wx + trucks.wash.x, wy + 0.1, wz + 0.1);
    }
    dirtLeft--;
    game.audio.play('bubble');
    bubbles(x, y);
    if (dirtLeft <= 0) carDone();
  }

  function syncRing() {
    const n = sessionCars === 0 ? 0 : ((sessionCars - 1) % RING_GOAL) + 1;
    ringEl.style.setProperty('--p', String((n / RING_GOAL) * 100));
    ringN.textContent = String(n);
    ringEl.classList.remove('bump');
    void ringEl.offsetWidth;
    ringEl.classList.add('bump');
  }

  function carDone() {
    ready = false;
    game.audio.play('sparkle');
    const t = trucks.wash;
    const [cx, cy] = project(t ? t.x : 0, 1.6, D / 2);
    for (let i = 0; i < 3; i++) sparkleAt((t ? t.x : 0) - 1.2 + i * 1.1, 1.4 + (i % 2) * 0.8);
    foamAt(t ? t.x : 0, 1.0, 0.8, 10);
    const plus = document.createElement('span');
    plus.className = 'float-fx';
    plus.textContent = `+${game.config.work.coinsPerCar}`;
    plus.style.left = `${cx - 20}px`;
    plus.style.top = `${cy - 40}px`;
    car.appendChild(plus);
    later(() => plus.remove(), 900);
    sessionCars++;
    syncRing();
    game.update((s) => washCar(s, game.config, game.now()));
    game.audio.play('coin');
    const srect = stage.getBoundingClientRect();
    game.fx.flyCoins(srect.left + cx, srect.top + cy, 2);
    if (sessionCars % RING_GOAL === 0) {
      // the ring is full: a little party, and Muntje cheers (a reaction, so it always shows)
      later(() => { game.fx.confetti(); game.mentor.say('lines.wasRonde', {}, { kind: 'reaction' }); }, 350);
    }
    const stt = game.state;
    if (stt.carsWashed >= game.config.work.tiredAfterCars && !stt.flags.tiredSaid) {
      game.update((s) => setFlag(s, 'tiredSaid', true));
      later(() => game.mentor.say('lines.tired', {}, { kind: 'reaction' }), 400);
    }
    // the clean truck drives out to the right and the driver waves; the one that stood there drives off
    later(() => {
      const now = performance.now();
      if (trucks.done) { drive(trucks.done, X_GONE, game.config.work.carLeaveMs + 200, now); leaving.push(trucks.done); trucks.done = null; }
      if (trucks.wash) { drive(trucks.wash, X_DONE, game.config.work.carLeaveMs, now); trucks.done = trucks.wash; trucks.wash = null; }
      car.className = 'werk-car out';
      game.audio.play('whoosh');
      const elapsed = now - carShownAt;
      const wait = Math.max(game.config.work.carLeaveMs, game.config.work.minCycleMs - elapsed);
      later(newCar, wait);
    }, 450);
  }

  function hitAt(x, y) {
    const target = document.elementFromPoint(x, y);
    const spot = target && target.closest ? target.closest('.dirt') : null;
    if (spot) { clean(spot, x, y); return true; }
    return false;
  }

  /** A tap that misses (or comes while the truck is still rolling in) still answers with a splash. */
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

  function clearTrucks() {
    for (const t of [trucks.wait, trucks.wash, trucks.done, ...leaving]) removeTruck(t);
    trucks.wait = trucks.wash = trucks.done = null;
    leaving.length = 0;
  }

  return {
    show() {
      visible = true;
      syncHall();   // V5.4: the hall looks like its level
      sessionCars = 0;
      syncRing();
      resize();
      cancelAnimationFrame(raf);
      lastTime = 0;
      raf = requestAnimationFrame(render);
      game.update((s) => startWork(s, game.now()));
      clearTrucks();
      trucks.wait = spawnTruck(X_WAIT);
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
      clearTrucks();
      ready = false;
      car.className = 'werk-car';
      game.update((s) => endWork(s));
      game.save();
    },
    render() {},
  };
}
