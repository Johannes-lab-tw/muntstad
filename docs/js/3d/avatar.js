// 3d/avatar.js — the child's avatar as a rounded plastic figure (Roblox-style proportions): legs, torso, arms and a
// cube-ish head with a face, hair and hat; skins change materials and add parts; vehicles carry the figure.
// avatarModel(look) → { group, update(t, pose, extra), look }. The group's origin is between the feet; local +z is the
// front (rotate the group with rotation.y to face a direction). Limbs are real pivots, so walking really swings.
import * as T from '../../vendor/three.module.min.js';
import { Builder, shade, blob, col } from './build.js';

export const S = 0.62;
const INK = '#1b1f3b';
const SKIN = '#f7c59f';
const HAIR = '#6b4226';
const PANTS = '#2f3a5c';

const SKINS = {
  zombie: { skin: '#8fe3a0', body: '#5b6472', hair: '#2f5d3a', mouth: 'zigzag' },
  kikker: { skin: '#5ad46f', body: '#3fbf5a', hair: null, frogEyes: true },
  astronaut: { skin: SKIN, body: '#f4f7fb', hair: HAIR, pack: true, visor: true },
  ninja: { skin: SKIN, body: '#1b1f3b', hair: '#1b1f3b', band: true, mouth: null },
  superheld: { skin: SKIN, body: '#ff5f5f', hair: HAIR, cape: true, mask: true },
};

/** Hat on top of the head; head-local coordinates, head base at y = 0, top at `top`, front = +z. */
function hat(b, id, top) {
  const s = S;
  const brim = (len, wid, thick, color) => b.box(-wid / 2, 0.35 * s, top, wid, len, thick, color, { r: 0.02 });
  switch (id) {
    case 'pet':
      b.box(-0.37 * s, -0.37 * s, top, 0.74 * s, 0.74 * s, 0.22 * s, '#ff5f5f', { r: 0.06 });
      brim(0.34 * s, 0.5 * s, 0.07 * s, '#ff5f5f');
      break;
    case 'strohoed':
      b.cyl(0, 0, top, 0.7 * s, 0.06 * s, '#f4d98a', 20);
      b.cyl(0, 0, top + 0.06 * s, 0.4 * s, 0.28 * s, '#f4d98a', 16);
      b.cyl(0, 0, top + 0.1 * s, 0.41 * s, 0.08 * s, '#ff5f5f', 16);
      break;
    case 'helm':
      b.sphere(0, 0, top - 0.02 * s, 0.46 * s, '#ff5f5f', 14);
      b.box(-0.08 * s, -0.46 * s, top + 0.2 * s, 0.16 * s, 0.92 * s, 0.14 * s, '#ffffff', { r: 0.02 });
      break;
    case 'hogehoed':
      b.cyl(0, 0, top, 0.55 * s, 0.06 * s, '#1b1f3b', 20);
      b.cyl(0, 0, top + 0.06 * s, 0.34 * s, 0.7 * s, '#2a2f4d', 16);
      b.cyl(0, 0, top + 0.12 * s, 0.35 * s, 0.12 * s, '#ff5f5f', 16);
      break;
    case 'feestmuts':
      b.cone(0, 0, top, 0.36 * s, 0.9 * s, '#ff6fae', 16);
      b.sphere(0, 0, top + 0.95 * s, 0.1 * s, '#ffe94d', 8);
      break;
    case 'piraat':
      b.box(-0.62 * s, -0.62 * s, top, 1.24 * s, 1.24 * s, 0.12 * s, '#1b1f3b', { r: 0.05 });
      b.box(-0.4 * s, -0.4 * s, top + 0.12 * s, 0.8 * s, 0.8 * s, 0.3 * s, '#2a2f4d', { r: 0.06 });
      b.face(-0.4 * s, -0.4 * s, top + 0.12 * s, 0.8 * s, 0.8 * s, 'y', 0.3 * s, 0.08 * s, 0.2 * s, 0.16 * s, '#ffffff');
      break;
    case 'cowboy':
      b.cyl(0, 0, top, 0.68 * s, 0.08 * s, '#8a5a35', 20);
      b.cyl(0, 0, top + 0.08 * s, 0.38 * s, 0.42 * s, '#b5763f', 16);
      b.cyl(0, 0, top + 0.12 * s, 0.39 * s, 0.08 * s, '#1b1f3b', 16);
      break;
    case 'tovenaar':
      b.cyl(0, 0, top, 0.6 * s, 0.08 * s, '#2f6fd6', 20);
      b.cone(0, 0, top + 0.08 * s, 0.38 * s, 1.1 * s, '#3b82f6', 16);
      b.sphere(0, 0, top + 1.2 * s, 0.08 * s, '#ffe94d', 8);
      b.sphere(0.2 * s, 0.24 * s, top + 0.5 * s, 0.05 * s, '#ffe94d', 6);
      break;
    case 'kroon':
      b.cyl(0, 0, top, 0.34 * s, 0.22 * s, '#ffc21c', 12);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        b.box(Math.cos(a) * 0.28 * s - 0.06 * s, Math.sin(a) * 0.28 * s - 0.06 * s, top + 0.2 * s, 0.12 * s, 0.12 * s, 0.22 * s, '#ffe58a', { r: 0.02 });
        b.sphere(Math.cos(a) * 0.28 * s, Math.sin(a) * 0.28 * s, top + 0.46 * s, 0.05 * s, ['#ff5f5f', '#45b6ff', '#45d65c', '#ff6fae', '#b76cff'][i], 6);
      }
      break;
    default:
      break;
  }
}

/** Head group: cube head (base at y = 0), hair, face on +z, skin extras, hat. Returns { group, eyes }. */
function headModel(look) {
  const s = S;
  const sk = SKINS[look.skin] || {};
  const skinC = sk.skin || SKIN;
  const hairC = sk.hair === undefined ? HAIR : sk.hair;
  const g = new T.Group();
  const b = new Builder({ r: 0.07 });
  const bx = -0.35 * s, by = -0.35 * s;
  b.box(bx, by, 0, 0.7 * s, 0.7 * s, 0.7 * s, skinC, { r: 0.09 });
  if (hairC) {
    b.box(bx - 0.02, by - 0.02, 0.6 * s, 0.7 * s + 0.04, 0.7 * s + 0.04, 0.14 * s, hairC, { r: 0.05 });
    b.face(bx, by, 0, 0.7 * s, 0.7 * s, 'y', 0, 0.56 * s, 0.7 * s, 0.1 * s, hairC, { t: 0.03 });
    b.box(bx - 0.02, by - 0.03, 0.15 * s, 0.7 * s + 0.04, 0.12 * s, 0.5 * s, hairC, { r: 0.03 }); // back of the head
  }
  if (!sk.frogEyes) {
    if (sk.mask) b.face(bx, by, 0, 0.7 * s, 0.7 * s, 'y', 0.06 * s, 0.3 * s, 0.58 * s, 0.26 * s, '#2f6fd6', { t: 0.03 });
    if (sk.band) b.face(bx, by, 0, 0.7 * s, 0.7 * s, 'y', 0, 0.58 * s, 0.7 * s, 0.1 * s, '#ff5f5f', { t: 0.035 });
    if (sk.mouth === 'zigzag') for (let i = 0; i < 4; i++) b.face(bx, by, 0, 0.7 * s, 0.7 * s, 'y', 0.22 * s + i * 0.07 * s, (i % 2 ? 0.12 : 0.17) * s, 0.07 * s, 0.05 * s, INK, { t: 0.04 });
    else if (sk.mouth !== null) b.face(bx, by, 0, 0.7 * s, 0.7 * s, 'y', 0.24 * s, 0.14 * s, 0.22 * s, 0.07 * s, '#c0392b', { t: 0.04 });
    b.face(bx, by, 0, 0.7 * s, 0.7 * s, 'y', 0.05 * s, 0.24 * s, 0.09 * s, 0.07 * s, '#ff9fbd', { t: 0.035 }); // cheeks
    b.face(bx, by, 0, 0.7 * s, 0.7 * s, 'y', 0.56 * s, 0.24 * s, 0.09 * s, 0.07 * s, '#ff9fbd', { t: 0.035 });
  } else {
    b.face(bx, by, 0, 0.7 * s, 0.7 * s, 'y', 0.16 * s, 0.16 * s, 0.38 * s, 0.07 * s, INK, { t: 0.04 });
    b.sphere(-0.2 * s, -0.2 * s, 0.78 * s, 0.13 * s, '#ffffff', 10);
    b.sphere(0.2 * s, -0.2 * s, 0.78 * s, 0.13 * s, '#ffffff', 10);
    b.sphere(-0.2 * s, -0.09 * s, 0.8 * s, 0.06 * s, INK, 8);
    b.sphere(0.2 * s, -0.09 * s, 0.8 * s, 0.06 * s, INK, 8);
  }
  if (sk.visor) {
    b.cyl(0, 0, -0.02 * s, 0.5 * s, 0.1 * s, '#e4e8ef', 20);
    b.cyl(0, 0, 0.64 * s, 0.5 * s, 0.1 * s, '#e4e8ef', 20);
  }
  if (look.hat) hat(b, look.hat, 0.7 * s + (hairC ? 0.04 * s : 0));
  g.add(b.build());
  let eyes = null;
  if (!sk.frogEyes) {
    const e = new Builder({ r: 0.01 });
    e.face(bx, by, 0, 0.7 * s, 0.7 * s, 'y', 0.14 * s, 0.34 * s, 0.16 * s, 0.2 * s, '#ffffff', { t: 0.045 });
    e.face(bx, by, 0, 0.7 * s, 0.7 * s, 'y', 0.4 * s, 0.34 * s, 0.16 * s, 0.2 * s, '#ffffff', { t: 0.045 });
    e.face(bx, by, 0, 0.7 * s, 0.7 * s, 'y', 0.19 * s, 0.36 * s, 0.08 * s, 0.12 * s, INK, { t: 0.06 });
    e.face(bx, by, 0, 0.7 * s, 0.7 * s, 'y', 0.45 * s, 0.36 * s, 0.08 * s, 0.12 * s, INK, { t: 0.06 });
    eyes = e.build({ shadow: false });
    // scale around the eye line, not the head base
    eyes.geometry.translate(0, -0.44 * s, 0);
    eyes.position.y = 0.44 * s;
    g.add(eyes);
  }
  return { group: g, eyes };
}

function limb(w, d, h, color, r = 0.06) {
  // pivot at the top centre; the mesh hangs down
  const b = new Builder({ r });
  b.box(-w / 2, -d / 2, -h, w, d, h, color, { r });
  const m = b.build();
  return m;
}

/** Blocky-round car in the avatar colour: length along local +z (the front). */
export function carModel(color = '#3b82f6') {
  const g = new T.Group();
  const b = new Builder({ r: 0.08 });
  const L = 1.5, Wd = 0.8;
  b.box(-Wd / 2, -L / 2, 0.18, Wd, L, 0.4, color, { r: 0.12 });
  b.box(-0.34, -0.45, 0.56, 0.68, 0.72, 0.36, shade(color, 0.05), { r: 0.1 });
  b.face(-0.34, -0.45, 0.56, 0.68, 0.72, 'y', 0.06, 0.06, 0.56, 0.26, '#bfe6ff');   // windscreen
  b.face(-0.34, -0.45, 0.56, 0.68, 0.72, 'x', 0.08, 0.06, 0.56, 0.24, '#bfe6ff');   // side window
  b.box(-0.35, -0.47, 0.56, 0.02, 0.72, 0.36, shade(color, 0.05), { r: 0.01 });
  b.face(-Wd / 2, -L / 2, 0.18, Wd, L, 'y', 0.1, 0.12, 0.14, 0.14, '#ffe94d', { t: 0.05 }); // headlights
  b.face(-Wd / 2, -L / 2, 0.18, Wd, L, 'y', Wd - 0.24, 0.12, 0.14, 0.14, '#ffe94d', { t: 0.05 });
  b.box(-0.3, -L / 2 - 0.05, 0.12, 0.6, 0.08, 0.12, '#dcd7cb', { r: 0.03 });       // bumper
  g.add(b.build());
  const wheels = [];
  for (const [dx, dz] of [[-0.42, -0.45], [0.42, -0.45], [-0.42, 0.45], [0.42, 0.45]]) {
    const w = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 0.14, 14).rotateZ(Math.PI / 2), new T.MeshStandardMaterial({ color: col('#1b1f3b'), roughness: 0.8 }));
    w.position.set(dx, 0.17, dz);
    w.castShadow = true;
    g.add(w);
    wheels.push(w);
  }
  return { group: g, wheels, seat: 0.5 };
}

export function scooterModel() {
  const g = new T.Group();
  const b = new Builder({ r: 0.03 });
  b.box(-0.18, -0.5, 0.14, 0.36, 1.0, 0.06, '#45b6ff', { r: 0.03 });
  b.cyl(0, 0.46, 0.2, 0.035, 1.05, '#9aa3b2', 8);
  b.box(-0.22, 0.42, 1.2, 0.44, 0.08, 0.06, INK, { r: 0.02 });
  g.add(b.build());
  const wheels = [];
  for (const dz of [-0.42, 0.42]) {
    const w = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 0.1, 12).rotateZ(Math.PI / 2), new T.MeshStandardMaterial({ color: col('#1b1f3b'), roughness: 0.8 }));
    w.position.set(0, 0.12, dz);
    w.castShadow = true;
    g.add(w);
    wheels.push(w);
  }
  return { group: g, wheels, seat: 0.16 };
}

/**
 * Build the avatar. look = { color, hat, skin, vehicle }.
 * update(t, pose, extra): pose 'idle' | 'walk' | 'jump' | 'dance' | 'salto' | 'wave'; extra = { z, phase, speed }.
 */
export function avatarModel(look = {}) {
  const s = S;
  const sk = SKINS[look.skin] || {};
  const skinC = sk.skin || SKIN;
  const bodyC = sk.body || look.color || '#3b82f6';
  const group = new T.Group();
  group.add(blob(0.55, 0.32));
  const spin = new T.Group();       // salto pivot at the figure's centre
  const body = new T.Group();       // everything above the feet
  spin.add(body);
  group.add(spin);

  let vehicle = null;
  if (look.vehicle === 'auto') vehicle = carModel(look.color || '#3b82f6');
  else if (look.vehicle === 'scooter') vehicle = scooterModel();
  if (vehicle) group.add(vehicle.group);
  const inCar = look.vehicle === 'auto';
  const lift = vehicle ? vehicle.seat : 0;

  const legH = 0.75 * s;
  const legL = limb(0.22 * s, 0.24 * s, legH, PANTS);
  const legR = limb(0.22 * s, 0.24 * s, legH, PANTS);
  legL.position.set(-0.13 * s, legH, 0);
  legR.position.set(0.13 * s, legH, 0);
  if (!inCar) body.add(legL, legR);

  const torso = new Builder({ r: 0.07 });
  const tz = legH - (inCar ? 0.35 * s : 0);
  torso.box(-0.35 * s, -0.2 * s, tz, 0.7 * s, 0.4 * s, 0.8 * s, bodyC, { r: 0.09 });
  if (sk.cape) torso.box(-0.33 * s, -0.33 * s, tz - 0.2 * s, 0.66 * s, 0.1 * s, 0.95 * s, '#ffe066', { r: 0.03 });
  if (sk.pack) torso.box(-0.25 * s, -0.36 * s, tz + 0.05 * s, 0.5 * s, 0.16 * s, 0.7 * s, '#c9d1dc', { r: 0.05 });
  if (look.skin === 'superheld') torso.face(-0.35 * s, -0.2 * s, tz, 0.7 * s, 0.4 * s, 'y', 0.2 * s, 0.3 * s, 0.3 * s, 0.3 * s, '#ffe066', { t: 0.035 });
  body.add(torso.build());

  const armH = 0.72 * s;
  const armL = limb(0.2 * s, 0.32 * s, armH, skinC, 0.05);
  const armR = limb(0.2 * s, 0.32 * s, armH, skinC, 0.05);
  armL.position.set(-0.48 * s, tz + 0.75 * s, 0);
  armR.position.set(0.48 * s, tz + 0.75 * s, 0);
  body.add(armL, armR);

  const head = headModel(look);
  head.group.position.set(0, tz + 0.8 * s, 0);
  body.add(head.group);

  body.position.y = lift;
  const centreY = lift + tz + 0.4 * s;
  spin.position.y = centreY;
  body.position.y -= centreY;

  let phase = Math.random() * 10;
  function update(t, pose = 'idle', extra = {}) {
    const ph = extra.phase ?? phase;
    let swing = 0, armUp = 0, bob = 0, spinA = 0;
    if (pose === 'walk') { swing = Math.sin(t / 110 + ph); bob = Math.abs(swing) * 0.03; }
    else if (pose === 'idle') { bob = Math.sin(t / 900 + ph) * 0.015; swing = Math.sin(t / 900 + ph) * 0.06; }
    else if (pose === 'jump') { armUp = 1; }
    else if (pose === 'dance') { swing = Math.sin(t / 140) * 0.8; armUp = Math.abs(Math.sin(t / 140)); bob = Math.abs(Math.sin(t / 140)) * 0.12; }
    else if (pose === 'wave') { armUp = 0; }
    else if (pose === 'hak' || pose === 'vis') { armUp = 0; }
    else if (pose === 'salto') { spinA = Math.min(1, Math.max(0, (extra.since != null ? t - extra.since : t) / 1000)) * Math.PI * 2; }
    const vehicleRide = !!vehicle;
    legL.rotation.x = vehicleRide ? 0.4 : swing * 0.75 + (pose === 'jump' ? 0.35 : 0);
    legR.rotation.x = vehicleRide ? 0.4 : -swing * 0.75 + (pose === 'jump' ? 0.35 : 0);
    armL.rotation.x = vehicleRide ? -0.9 : -swing * 0.7 - armUp * 2.6;
    armR.rotation.x = vehicleRide ? -0.9 : swing * 0.7 - armUp * 2.6;
    armL.rotation.z = pose === 'dance' ? -0.5 - armUp * 0.4 : 0.06;
    armR.rotation.z = pose === 'dance' ? 0.5 + armUp * 0.4 : -0.06;
    if (pose === 'wave') { armR.rotation.x = -2.7; armR.rotation.z = -0.35 + Math.sin(t / 160) * 0.35; }
    if (pose === 'hak') { const sw = Math.sin(t / 75); armR.rotation.x = -1.7 + sw * 1.3; armL.rotation.x = -1.7 + sw * 1.3; armL.rotation.z = 0.25; armR.rotation.z = -0.25; }
    if (pose === 'vis') { armR.rotation.x = -1.3; armL.rotation.x = -1.1; armR.rotation.z = -0.15; }
    body.rotation.y = pose === 'dance' ? Math.sin(t / 140) * 0.5 : 0;
    head.group.rotation.y = pose === 'idle' ? Math.sin(t / 1300 + ph) * 0.15 : 0;
    head.group.rotation.z = pose === 'dance' ? Math.sin(t / 140 + 1) * 0.15 : 0;
    spin.rotation.x = -spinA;
    group.position.y = (extra.z || 0) + bob;
    if (head.eyes) {
      const blink = pose !== 'salto' && ((t + ph * 1000) % 3200) < 130;
      head.eyes.scale.y = blink ? 0.12 : 1;
    }
    if (vehicle) { const spinW = (extra.dist || t / 200) * 6; for (const w of vehicle.wheels) w.rotation.x = spinW; }
  }

  return { group, update, look, get height() { return lift + tz + 1.5 * s; } };
}

export function lookKey(look) {
  return `${look.color}|${look.hat}|${look.skin}|${look.vehicle}`;
}
