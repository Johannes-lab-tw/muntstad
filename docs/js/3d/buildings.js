// 3d/buildings.js — the five coin-makers (levels 1..5) and the child's house as rounded plastic 3D models.
// makerModel(id, level) → { group, update(t) }: the still parts are ONE merged mesh, the moving parts (flags, smoke,
// drips, floating coins) are small separate meshes animated by update(t). Each level adds one visible thing
// (ART-DIRECTION): 2 = extra prop, 3 = annex / floor, 4 = flag + sign, 5 = floating coins + star banner.
// Coordinates are plot-relative (0, 0 = plot centre); the caller positions the group.
import * as T from '../../vendor/three.module.min.js';
import { Builder, shade, meshBox, meshSphere, meshCoin, textPlane, col, MAT } from './build.js';

const GLASS = '#cfe9ff', LIT = '#fff1a8', WOOD = '#b5763f', METAL = '#9aa3b2', DOOR = '#7a3f1a';

function windowPane(b, x, y, z, w, d, side, u, v, uw = 0.5, vh = 0.45, color = GLASS) {
  b.face(x, y, z, w, d, side, u - 0.04, v - 0.04, uw + 0.08, vh + 0.08, '#ffffff', { t: 0.03 });
  b.face(x, y, z, w, d, side, u, v, uw, vh, color, { t: 0.045 });
}

/** Pole (static) + waving flag (animated). */
function flagAt(b, group, anim, x, y, h, color) {
  b.cyl(x, y, 0, 0.05, h, METAL, 8);
  b.sphere(x, y, h, 0.07, '#ffd23f', 8);
  const f = meshBox(0.66, 0.36, 0.04, color, 0.03);
  f.geometry = f.geometry.clone().translate(0.33, 0, 0); // hinge on the pole
  f.position.set(x, h - 0.28, y);
  group.add(f);
  anim.push((t) => { f.rotation.y = Math.sin(t / 260) * 0.35; f.scale.x = 0.9 + Math.sin(t / 180) * 0.1; });
}

/** Puff of smoke rising from (x, y, z): three growing spheres on a loop. */
function smokeAt(group, anim, x, y, z, period = 1000, drift = 0.25) {
  const puffs = [];
  for (let i = 0; i < 3; i++) {
    const s = meshSphere(0.14, '#ffffff', 8, { transparent: true, opacity: 0.8 });
    s.castShadow = false;
    group.add(s);
    puffs.push(s);
  }
  anim.push((t) => {
    for (let i = 0; i < 3; i++) {
      const f = ((t / period) + i / 3) % 1;
      puffs[i].position.set(x + f * drift, z + f * 1.3, y - f * 0.1);
      const s = 0.6 + f * 1.6;
      puffs[i].scale.set(s, s, s);
      puffs[i].material.opacity = 0.85 * (1 - f);
    }
  });
}

/** Three floating spinning coins + a white star banner (level 5). */
function crownAt(b, group, anim, x, y, z) {
  b.box(x - 0.9, y - 0.06, z, 1.8, 0.12, 0.42, '#ffffff', { r: 0.05 });
  const stars = textPlane('★ ★ ★', { w: 1.6, h: 0.4, font: 0.3, color: '#ffc21c' });
  stars.position.set(x, z + 0.21, y + 0.075);
  group.add(stars);
  const coins = [];
  for (let i = 0; i < 3; i++) {
    const c = meshCoin(0.24);
    group.add(c);
    coins.push(c);
  }
  anim.push((t) => {
    for (let i = 0; i < 3; i++) {
      coins[i].position.set(x - 0.7 + i * 0.7, z + 0.95 + Math.sin(t / 300 + i * 1.3) * 0.08, y);
      coins[i].rotation.y = t / 420 + i;
    }
  });
}

function drips(group, anim, x, y, z0) {
  const ds = [];
  for (let i = 0; i < 3; i++) {
    const d = meshSphere(0.06, '#9fe0ff', 6, { transparent: true, opacity: 0.9 });
    d.castShadow = false;
    group.add(d);
    ds.push(d);
  }
  anim.push((t) => {
    for (let i = 0; i < 3; i++) {
      const f = ((t / 700) + i / 3) % 1;
      ds[i].position.set(x, z0 - f * 1.1, y + i * 0.4);
      ds[i].material.opacity = 1 - f;
    }
  });
}

// ---------- Limonadekraam ----------
function limonade(b, group, anim, level) {
  const c = '#ffd23f';
  b.box(-0.9, -0.7, 0, 1.8, 1.4, 0.9, c, { r: 0.1 });                            // counter
  b.box(-0.95, -0.75, 0.86, 1.9, 1.5, 0.12, shade(c, -0.15));                     // counter rim
  for (const [px, py] of [[-0.85, -0.65], [0.73, -0.65], [-0.85, 0.53], [0.73, 0.53]]) b.cyl(px + 0.06, py + 0.06, 0.95, 0.06, 1.2, WOOD, 8);
  b.box(-1.05, -0.85, 2.1, 2.1, 1.7, 0.16, '#ff5f5f', { r: 0.06 });               // awning
  for (let i = 0; i < 5; i++) b.slab(-1.05 + i * 0.42, -0.85, 2.26, 0.21, 1.7, '#ffffff');
  for (let i = 0; i < 3; i++) b.sphere(-0.46 + i * 0.45, -0.06, 1.1, 0.15, '#ffe94d', 10); // lemons
  b.cyl(0.45, 0.35, 0.98, 0.16, 0.42, '#ff8fb1', 12);                                     // pitcher
  b.face(-0.9, -0.7, 0, 1.8, 1.4, 'x', 0.25, 0.25, 0.9, 0.45, '#fff8dc');
  b.face(-0.9, -0.7, 0, 1.8, 1.4, 'x', 0.4, 0.38, 0.6, 0.2, '#ffe94d', { t: 0.05 });
  if (level >= 2) b.box(1.05, -1.25, 0, 0.55, 0.55, 0.7, '#59a9ff', { r: 0.08 });          // cooler box
  if (level >= 3) { b.box(-1.45, -1.4, 0, 0.95, 0.95, 0.5, '#ffb347', { r: 0.06 }); for (let i = 0; i < 4; i++) b.sphere(-1.2 + (i % 2) * 0.4, -1.15 + Math.floor(i / 2) * 0.4, 0.6, 0.15, '#ffe94d', 8); } // lemon crate
  if (level >= 4) flagAt(b, group, anim, -1.4, 0.9, 2.4, '#45d65c');
  if (level >= 5) crownAt(b, group, anim, 0, -0.9, 2.45);
}

// ---------- Wasstraat ----------
function wasstraat(b, group, anim, level) {
  const c = '#4fb6ff';
  b.box(-1.2, -1, 0, 2.4, 2, 1.5, c, { r: 0.12 });
  b.box(-1.28, -1.08, 1.5, 2.56, 2.16, 0.22, shade(c, -0.3), { r: 0.06 });        // roof band
  b.face(-1.2, -1, 0, 2.4, 2, 'x', 0.35, 0, 1.3, 1.1, '#1f2a44', { t: 0.05 });     // tunnel mouth
  windowPane(b, -1.2, -1, 0, 2.4, 2, 'y', 0.3, 0.55);
  windowPane(b, -1.2, -1, 0, 2.4, 2, 'y', 1.4, 0.55);
  b.cyl(1.42, -0.52, 0, 0.18, 1.2, '#ff5f5f', 12);                                  // brush rollers
  b.cyl(1.42, 0.52, 0, 0.18, 1.2, '#ff5f5f', 12);
  b.box(-0.9, -1.3, 1.72, 1.6, 0.16, 0.6, '#ffffff', { r: 0.05 });                 // sign
  const s = textPlane('WASSTRAAT', { w: 1.5, h: 0.45, font: 0.24, color: '#1a7ad6' });
  s.position.set(-0.1, 2.02, -1.13);
  group.add(s);
  if (level >= 2) b.box(-1.85, 0.3, 0, 0.55, 0.55, 0.9, '#ffd23f', { r: 0.08 });    // vacuum station
  if (level >= 3) b.box(-1.2, 1.05, 0, 2.4, 0.4, 1, shade(c, 0.15), { r: 0.08 });    // annex
  drips(group, anim, 1.45, -0.5, 1.3);
  if (level >= 4) flagAt(b, group, anim, -1.85, -1.35, 2.4, '#ffd23f');
  if (level >= 5) crownAt(b, group, anim, 0, -1, 2.35);
}

// ---------- Pizzeria ----------
function pizzeria(b, group, anim, level) {
  const c = '#ffb0b0', roofc = '#e8483f';
  b.box(-1.1, -0.9, 0, 2.2, 1.8, 1.4, c, { r: 0.1 });
  b.roof(-1.25, -1.05, 1.4, 2.5, 2.1, 0.9, roofc, 'x');
  b.face(-1.1, -0.9, 0, 2.2, 1.8, 'x', 0.6, 0, 0.6, 0.95, DOOR);
  windowPane(b, -1.1, -0.9, 0, 2.2, 1.8, 'y', 0.25, 0.5, 0.6, 0.55);
  windowPane(b, -1.1, -0.9, 0, 2.2, 1.8, 'y', 1.35, 0.5, 0.6, 0.55);
  b.box(1.1, -0.75, 1.05, 0.45, 1.5, 0.1, '#ff5f5f', { r: 0.03 });                 // awning
  for (let i = 0; i < 4; i++) b.slab(1.1, -0.75 + i * 0.38, 1.15, 0.45, 0.19, '#ffffff');
  b.box(-0.7, -0.6, 2.1, 0.3, 0.3, 0.5, METAL, { r: 0.04 });                        // chimney
  b.face(-1.1, -0.9, 0, 2.2, 1.8, 'y', 0.75, 1.05, 0.7, 0.3, '#ffffff');
  b.face(-1.1, -0.9, 0, 2.2, 1.8, 'y', 0.85, 1.12, 0.5, 0.16, '#ffd23f', { t: 0.05 });
  if (level >= 2) { b.cyl(-1.1, 0.95, 0, 0.36, 0.45, WOOD, 12); b.disc(-1.1, 0.95, 0.45, 0.24, '#ffe6a8', 0.05, 14); b.disc(-1.1, 0.95, 0.5, 0.18, '#ff5f5f', 0.03, 14); } // terrace table with pizza
  let h = 1.4;
  if (level >= 3) {
    h = 2.4;
    b.box(-1.0, -0.8, 1.4, 2.0, 1.6, 1.0, c, { r: 0.08 });
    windowPane(b, -1.0, -0.8, 1.4, 2.0, 1.6, 'y', 0.3, 0.3);
    windowPane(b, -1.0, -0.8, 1.4, 2.0, 1.6, 'y', 1.2, 0.3);
    b.roof(-1.15, -0.95, 2.4, 2.3, 1.9, 0.8, roofc, 'x');
    b.box(-0.7, -0.6, 2.9, 0.3, 0.3, 0.5, METAL, { r: 0.04 });
  }
  smokeAt(group, anim, -0.55, -0.45, level >= 3 ? 3.5 : 2.7, 900);
  if (level >= 4) flagAt(b, group, anim, 1.35, 1.3, 2.4, '#ff5f5f');
  if (level >= 5) crownAt(b, group, anim, 0, -1, level >= 3 ? 3.4 : 2.5);
}

// ---------- Fabriek ----------
function fabriek(b, group, anim, level) {
  const c = '#b794f4';
  b.box(-1.3, -1, 0, 2.6, 2, 1.5, c, { r: 0.1 });
  for (let i = 0; i < 3; i++) b.roof(-1.3 + i * 0.87, -1, 1.5, 0.87, 2, 0.5, shade(c, -0.15), 'y'); // sawtooth
  b.cyl(0.8, -0.4, 2.0, 0.2, 1.2, METAL, 12);                                        // chimney
  b.cyl(0.8, -0.4, 3.1, 0.24, 0.12, shade(METAL, -0.2), 12);
  for (let i = 0; i < 3; i++) windowPane(b, -1.3, -1, 0, 2.6, 2, 'y', 0.2 + i * 0.8, 0.6, 0.5, 0.5, LIT);
  b.face(-1.3, -1, 0, 2.6, 2, 'x', 0.5, 0, 1, 1, '#5b6472', { t: 0.05 });            // loading door
  b.box(-0.2, -1.15, 1.6, 1.2, 0.14, 0.5, '#ffffff', { r: 0.05 });                   // robot sign
  b.face(-0.2, -1.15, 1.6, 1.2, 0.14, 'y', 0.25, 0.22, 0.2, 0.2, '#45b6ff', { t: 0.05 });
  b.face(-0.2, -1.15, 1.6, 1.2, 0.14, 'y', 0.75, 0.22, 0.2, 0.2, '#45b6ff', { t: 0.05 });
  b.face(-0.2, -1.15, 1.6, 1.2, 0.14, 'y', 0.4, 0.08, 0.4, 0.06, '#1b1f3b', { t: 0.05 });
  if (level >= 2) { b.box(-1.45, 1.05, 0, 0.6, 0.4, 0.6, '#ff9f2e', { r: 0.06 }); b.box(-0.8, 1.05, 0, 0.6, 0.4, 0.45, '#45d65c', { r: 0.06 }); } // crates
  if (level >= 3) { b.box(0.6, 1.05, 0, 0.9, 0.4, 1.0, shade(c, 0.1), { r: 0.06 }); windowPane(b, 0.6, 1.05, 0, 0.9, 0.4, 'y', 0.2, 0.35, 0.5, 0.4, LIT); } // annex
  smokeAt(group, anim, 0.8, -0.4, 3.2, 1100, 0.3);
  if (level >= 4) flagAt(b, group, anim, -1.45, -1.4, 2.9, '#b794f4');
  if (level >= 5) crownAt(b, group, anim, -0.2, -1.05, 3.1);
}

// ---------- Flatgebouw ----------
function flat(b, group, anim, level) {
  const c = '#8fc7ff';
  const floors = 3 + level;
  const h = floors * 0.62;
  b.box(-1, -1, 0, 2, 2, h, c, { r: 0.1 });
  b.box(-1.08, -1.08, h, 2.16, 2.16, 0.14, shade(c, -0.35), { r: 0.05 });
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < 3; i++) {
      b.face(-1, -1, 0, 2, 2, 'y', 0.2 + i * 0.6, 0.15 + f * 0.62, 0.4, 0.36, (f + i) % 3 === 0 ? LIT : '#dff1ff', { t: 0.04 });
      b.face(-1, -1, 0, 2, 2, 'x', 0.2 + i * 0.6, 0.15 + f * 0.62, 0.4, 0.36, (f + i) % 4 === 0 ? LIT : '#c9e6ff', { t: 0.04 });
    }
  }
  b.face(-1, -1, 0, 2, 2, 'x', 0.75, 0, 0.5, 0.55, '#1f2a44', { t: 0.05 });          // entrance
  b.box(0.3, -0.6, h + 0.14, 0.5, 0.5, 0.4, '#e4e8ef', { r: 0.05 });                  // roof box
  if (level >= 2) b.bush(-1.0, 1.25, 0.7);                                             // hedge
  if (level >= 3) { b.box(1.05, -1, 0, 0.45, 2, 0.62, shade(c, 0.1), { r: 0.05 }); windowPane(b, 1.05, -1, 0, 0.45, 2, 'x', 0.3, 0.15, 0.4, 0.36); windowPane(b, 1.05, -1, 0, 0.45, 2, 'x', 1.2, 0.15, 0.4, 0.36); } // ground-floor shop
  if (level >= 5) { b.box(-0.8, 0.1, h + 0.14, 0.9, 0.6, 0.08, '#6fd35b', { r: 0.03 }); b.tree(-0.4, 0.4, 0.45, undefined, undefined, h + 0.22); } // roof garden
  if (level >= 4) flagAt(b, group, anim, -1.4, -1.4, h + 0.9, '#ffd23f');
  if (level >= 5) crownAt(b, group, anim, 0, -1.05, h + 0.6);
}

// ---------- IJssalon (V5.5): a cream-and-pink parlour that grows a giant cone, a terrace and a second floor ----------
function ijssalon(b, group, anim, level) {
  const c = '#fff0f5', trim = '#ff9fbd';
  b.box(-1.1, -0.9, 0, 2.2, 1.8, 1.3, c, { r: 0.12 });
  b.box(-1.2, -1.0, 1.3, 2.4, 2.0, 0.22, trim, { r: 0.06 });
  b.face(-1.1, -0.9, 0, 2.2, 1.8, 'x', 0.65, 0, 0.5, 0.9, DOOR);
  windowPane(b, -1.1, -0.9, 0, 2.2, 1.8, 'y', 0.2, 0.4, 0.7, 0.6);
  windowPane(b, -1.1, -0.9, 0, 2.2, 1.8, 'y', 1.3, 0.4, 0.7, 0.6);
  // striped awning over the front
  for (let i = 0; i < 6; i++) b.box(-1.15 + i * 0.38, 0.9, 1.05, 0.36, 0.5, 0.06, i % 2 ? '#ffffff' : trim, { r: 0.01 });
  // the cone on the roof: bigger with every level
  const s = 0.55 + Math.min(level, 5) * 0.12;
  b.cone(0, 0, 1.52, 0.32 * s, 0.9 * s, '#d9a066', 8);
  b.sphere(0, 0, 1.52 + 0.9 * s, 0.38 * s, '#ff9fbd', 10);
  if (level >= 2) b.sphere(0, 0, 1.52 + 0.9 * s + 0.5 * s, 0.32 * s, '#fff2b3', 10);
  if (level >= 3) b.sphere(0, 0, 1.52 + 0.9 * s + 0.95 * s, 0.14 * s, '#ff5f5f', 8);   // the cherry
  if (level >= 2) { b.cyl(-1.0, 1.25, 0, 0.3, 0.4, WOOD, 10); b.cyl(-1.0, 1.25, 0.4, 0.05, 1.0, METAL, 6); b.cone(-1.0, 1.25, 1.35, 0.55, 0.25, trim, 10); }   // parasol table
  if (level >= 3) { b.cyl(1.0, 1.25, 0, 0.3, 0.4, WOOD, 10); b.cyl(1.0, 1.25, 0.4, 0.05, 1.0, METAL, 6); b.cone(1.0, 1.25, 1.35, 0.55, 0.25, '#7cc4ff', 10); }
  if (level >= 4) {
    b.box(-1.0, -0.8, 1.52, 2.0, 1.6, 1.0, c, { r: 0.08 });
    windowPane(b, -1.0, -0.8, 1.52, 2.0, 1.6, 'y', 0.3, 0.25, 0.6, 0.55);
    windowPane(b, -1.0, -0.8, 1.52, 2.0, 1.6, 'y', 1.1, 0.25, 0.6, 0.55);
    b.box(-1.1, -0.9, 2.52, 2.2, 1.8, 0.2, trim, { r: 0.06 });
    flagAt(b, group, anim, 1.2, -0.9, 2.7, trim);
  }
  if (level >= 5) crownAt(b, group, anim, -0.8, -0.7, level >= 4 ? 2.8 : 1.7);
  // the cone turns slowly from level 3 on
  if (level >= 3) {
    const spin = new T.Group();
    const cb = new Builder({ r: 0.02 });
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; cb.sphere(Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0, 0.1, ['#ff5f5f', '#ffe94d', '#45d65c', '#7cc4ff'][i], 6); }
    spin.add(cb.build({ shadow: false }));
    spin.position.set(0, (level >= 4 ? 2.72 : 1.52) + 0.9 * s + 1.2 * s, 0);
    group.add(spin);
    anim.push((t) => { spin.rotation.y = t / 900; });
  }
}

// ---------- Pretpark (V5.5): a gate, a ferris wheel that turns, a carousel, a slide, a bouncy castle, a loop ----------
function pretpark(b, group, anim, level) {
  // entrance arch on the road side
  b.box(-1.5, 1.2, 0, 0.18, 0.18, 1.6, '#ffe94d', { r: 0.03 });
  b.box(1.32, 1.2, 0, 0.18, 0.18, 1.6, '#ffe94d', { r: 0.03 });
  b.box(-1.55, 1.15, 1.6, 3.1, 0.3, 0.35, '#ff5f5f', { r: 0.06 });
  for (let i = 0; i < 5; i++) b.sphere(-1.2 + i * 0.6, 1.3, 1.97, 0.08, i % 2 ? '#ffe94d' : '#ffffff', 6);
  b.slab(-1.5, -1.5, 0, 3.0, 2.6, '#d5c9a0');   // the ground of the park
  // the ferris wheel: a hub on two legs, the wheel itself turns (grows with the level)
  const r = 0.55 + Math.min(level, 5) * 0.08;
  b.box(-0.9, -0.7, 0, 0.14, 0.14, r + 0.6, METAL, { r: 0.02 });
  b.box(-0.9, -0.1, 0, 0.14, 0.14, r + 0.6, METAL, { r: 0.02 });
  const wheel = new T.Group();
  const wb = new Builder({ r: 0.02 });
  wb.add(new T.TorusGeometry(r, 0.05, 6, 20), '#45b6ff');
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    wb.add(new T.BoxGeometry(0.04, r * 2, 0.04).rotateZ(a), METAL);
    wb.add(new T.BoxGeometry(0.28, 0.24, 0.24).translate(Math.cos(a) * r, Math.sin(a) * r, 0), ['#ff5f5f', '#ffe94d', '#45d65c', '#ff9f2e', '#b76cff', '#ff6fae'][i]);
  }
  wheel.add(wb.build());
  wheel.position.set(-0.9, r + 0.6, -0.4);
  wheel.rotation.y = Math.PI / 2;
  group.add(wheel);
  anim.push((t) => { wheel.rotation.z = t / 2600; });
  if (level >= 2) {
    // carousel: a round roof on a pole with four horses that go round
    b.cyl(0.6, -0.6, 0, 0.6, 0.12, '#ff5f5f', 14);
    b.cyl(0.6, -0.6, 0.12, 0.06, 1.1, METAL, 6);
    b.cone(0.6, -0.6, 1.2, 0.7, 0.4, '#ffe94d', 14);
    const car = new T.Group();
    const cb = new Builder({ r: 0.02 });
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; cb.box(Math.cos(a) * 0.4 - 0.1, Math.sin(a) * 0.4 - 0.07, 0.35, 0.2, 0.14, 0.2, ['#ffffff', '#ff9fbd', '#7cc4ff', '#fff2b3'][i], { r: 0.04 }); cb.cyl(Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0.12, 0.02, 1.0, METAL, 5); }
    car.add(cb.build());
    car.position.set(0.6, 0, -0.6);
    group.add(car);
    anim.push((t) => { car.rotation.y = t / 1400; });
  }
  if (level >= 3) { b.box(0.6, 0.5, 0, 0.16, 0.16, 1.1, METAL, { r: 0.02 }); b.box(0.35, 0.55, 0.9, 0.6, 0.3, 0.1, '#ffe94d', { r: 0.03 }); for (let i = 0; i < 5; i++) b.box(0.7 + i * 0.16, 0.5, 0.9 - i * 0.18, 0.2, 0.36, 0.08, '#45d65c', { r: 0.02 }); }   // slide
  if (level >= 4) { b.box(-1.4, -1.45, 0, 1.0, 0.8, 0.5, '#b76cff', { r: 0.18 }); for (const [dx, dy] of [[0, 0], [0.8, 0], [0, 0.6], [0.8, 0.6]]) b.cyl(-1.3 + dx, -1.35 + dy, 0.5, 0.08, 0.45, '#ff9fbd', 6); b.box(-1.4, -1.45, 0.95, 1.0, 0.8, 0.12, '#ff9fbd', { r: 0.05 }); }   // bouncy castle
  if (level >= 5) { b.add(new T.TorusGeometry(0.55, 0.06, 8, 24).rotateY(Math.PI / 2).translate(1.05, 0.7, 0.4), '#ff5f5f'); b.box(0.9, 1.0, 0, 0.3, 0.14, 0.7, METAL, { r: 0.02 }); b.box(0.9, -0.3, 0, 0.3, 0.14, 0.7, METAL, { r: 0.02 }); crownAt(b, group, anim, 1.1, -1.2, 1.9); }   // the loop
  if (level >= 3) flagAt(b, group, anim, -1.4, 1.2, 1.9, '#45d65c');
}

const BUILDERS = { limonade, wasstraat, pizzeria, ijssalon, fabriek, flat, pretpark };

/** Height of a coin-maker in world units at a level. */
export function makerHeight(id, level) {
  if (id === 'flat') return (3 + level) * 0.62 + (level >= 5 ? 1.9 : level >= 4 ? 1.0 : 0.6);
  if (id === 'pizzeria') return level >= 3 ? 4.4 : 3.4;
  if (id === 'fabriek') return level >= 4 ? 4.2 : 3.6;
  if (id === 'ijssalon') return level >= 4 ? 4.6 : 3.4;
  if (id === 'pretpark') return 2.4 + Math.min(level, 5) * 0.16;
  return level >= 5 ? 3.6 : 3.0;
}

export function makerModel(id, level) {
  const group = new T.Group();
  const anim = [];
  const b = new Builder();
  BUILDERS[id](b, group, anim, level);
  group.add(b.build());
  return { group, update(t) { for (const fn of anim) fn(t); } };
}

export const PAINT = { none: '#fff2c9', 'verf-rood': '#ff8a80', 'verf-blauw': '#7cc4ff', 'verf-geel': '#ffe066' };

/** The child's house: paint is a fun item id (verf-*) or 'none'. Plot-relative like the makers. */
export function houseModel(paint = 'none', opts = {}) {
  const group = new T.Group();
  const anim = [];
  const b = new Builder();
  const wall = PAINT[paint] || PAINT.none;
  b.box(-1, -0.8, 0, 2, 1.6, 1.3, wall, { r: 0.1 });
  b.roof(-1.15, -0.95, 1.3, 2.3, 1.9, 0.9, '#e8483f', 'x');
  b.face(-1, -0.8, 0, 2, 1.6, 'x', 0.55, 0, 0.5, 0.9, '#8a4a1a');
  b.face(-1, -0.8, 0, 2, 1.6, 'x', 0.95, 0.4, 0.06, 0.06, '#ffd23f', { t: 0.06 }); // door knob
  windowPane(b, -1, -0.8, 0, 2, 1.6, 'y', 0.25, 0.5);
  windowPane(b, -1, -0.8, 0, 2, 1.6, 'y', 1.25, 0.5);
  b.box(0.3, -0.5, 1.9, 0.3, 0.3, 0.6, METAL, { r: 0.04 });
  if (opts.fence !== false) for (let i = 0; i < 8; i++) b.box(-1.6 + i * 0.44, 1.35, 0, 0.12, 0.08, 0.4, '#ffffff', { r: 0.03 });
  if (opts.fence !== false) b.box(-1.62, 1.36, 0.22, 3.2, 0.05, 0.06, '#ffffff', { r: 0.02 });
  b.flower(-1.35, 0.95, '#ff6fae');
  b.flower(-0.95, 1.05, '#ffe94d');
  b.flower(1.2, 1.0, '#7c9bff');
  group.add(b.build());
  smokeAt(group, anim, 0.45, -0.35, 2.5, 1600, 0.15);
  return { group, update(t) { for (const fn of anim) fn(t); } };
}

/** "For sale" board on a post: price + coin when unlocked, a lock above the (greyed) price when closed. */
export function signModel(maker, unlocked, priceText) {
  const group = new T.Group();
  const b = new Builder();
  b.cyl(0, 0, 0, 0.05, 1.0, WOOD, 8);
  const bw = 1.7, bh = 0.72;
  b.box(-bw / 2, -0.06, 0.9, bw, 0.12, bh, unlocked ? '#ffffff' : '#e6e9ef', { r: 0.07 });
  b.box(-bw / 2 - 0.04, -0.08, 0.86, bw + 0.08, 0.16, 0.09, unlocked ? '#45b6ff' : '#b8bfcc', { r: 0.03 });
  group.add(b.build());
  const icon = textPlane(maker.icon, { w: 0.6, h: 0.6, font: 0.44, color: '#000000' });
  icon.position.set(-0.5, 1.26, 0.07);
  group.add(icon);
  const price = textPlane(priceText, { w: 1.1, h: 0.4, font: unlocked ? 0.32 : 0.26, color: unlocked ? '#1b1f3b' : '#7b8494', align: 'right' });
  price.position.set(0.22, unlocked ? 1.26 : 1.12, 0.07);
  group.add(price);
  if (unlocked) {
    const coin = meshCoin(0.13);
    coin.position.set(0.66, 1.26, 0.09);
    group.add(coin);
  } else {
    const lock = textPlane('🔒', { w: 0.4, h: 0.4, font: 0.28, color: '#000000' });
    lock.position.set(0.4, 1.4, 0.07);
    group.add(lock);
  }
  return group;
}

/** A bobbing golden arrow above an affordable plot. */
export function arrowModel() {
  const b = new Builder({ r: 0.04 });
  b.box(-0.18, -0.1, 0.5, 0.36, 0.2, 0.55, '#ffc21c', { r: 0.05 });
  const g = new T.ConeGeometry(0.42, 0.55, 4);
  g.rotateY(Math.PI / 4);
  g.rotateX(Math.PI);
  g.translate(0, 0.25, 0);
  b.add(g, '#ffc21c');
  const m = b.build({ material: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, emissive: col('#ffb300'), emissiveIntensity: 0.3 }) });
  return m;
}

/** Gold ring on the ground under an affordable plot. */
export function ringModel(r = 1.7) {
  const g = new T.RingGeometry(r - 0.16, r, 40);
  g.rotateX(-Math.PI / 2);
  const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: col('#ffc21c'), transparent: true, opacity: 0.8, depthWrite: false }));
  m.position.y = 0.09;
  return m;
}

export { MAT };
