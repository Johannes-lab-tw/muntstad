// 3d/pets.js — dog, cat and dino as rounded plastic pets with a wagging tail, bobbing body and blinking eyes.
// petModel(id) → { group, update(t, { sleeping, phase, walking }) }. ~0.7 world units tall; origin between the feet,
// local +z is the front.
import * as T from '../../vendor/three.module.min.js';
import { Builder, blob, meshBox } from './build.js';

const INK = '#1b1f3b';

function eyes(b, hx, hy, hz, hw, hd, s) {
  b.face(hx, hy, hz, hw, hd, 'y', 0.16 * s, 0.36 * s, 0.14 * s, 0.16 * s, '#ffffff', { t: 0.04 });
  b.face(hx, hy, hz, hw, hd, 'y', 0.42 * s, 0.36 * s, 0.14 * s, 0.16 * s, '#ffffff', { t: 0.04 });
  b.face(hx, hy, hz, hw, hd, 'y', 0.2 * s, 0.38 * s, 0.07 * s, 0.1 * s, INK, { t: 0.05 });
  b.face(hx, hy, hz, hw, hd, 'y', 0.46 * s, 0.38 * s, 0.07 * s, 0.1 * s, INK, { t: 0.05 });
}

const PETS = {
  hond() {
    const c = '#c98a4b', dark = '#8a5a35';
    const body = new Builder({ r: 0.08 });
    body.box(-0.25, -0.5, 0.24, 0.5, 0.82, 0.42, c, { r: 0.12 });
    body.box(-0.27, 0.12, 0.2, 0.54, 0.16, 0.08, '#ff5f5f', { r: 0.03 });     // collar
    const legs = [];
    for (const [dx, dz] of [[-0.16, -0.32], [0.16, -0.32], [-0.16, 0.18], [0.16, 0.18]]) legs.push(meshBox(0.16, 0.28, 0.16, dark, 0.05));
    const head = new Builder({ r: 0.08 });
    head.box(-0.26, -0.25, 0, 0.52, 0.5, 0.48, c, { r: 0.12 });
    head.box(-0.28, -0.3, 0.3, 0.12, 0.14, 0.3, dark, { r: 0.04 });          // ears
    head.box(0.16, -0.3, 0.3, 0.12, 0.14, 0.3, dark, { r: 0.04 });
    head.face(-0.26, -0.25, 0, 0.52, 0.5, 'y', 0.18, 0.05, 0.16, 0.14, INK, { t: 0.05 }); // nose
    eyes(head, -0.26, -0.25, 0, 0.52, 0.5, 0.72);
    const tail = meshBox(0.12, 0.3, 0.1, dark, 0.04);
    tail.geometry = tail.geometry.clone().translate(0, 0.15, 0);
    return { body: body.build(), legs, head: head.build(), tail, bodyZ: 0.24, bodyH: 0.42, headAt: [0, 0.56, 0.32], tailAt: [0, 0.55, -0.5], sleepH: 0.3 };
  },
  kat() {
    const c = '#b9c0cc', dark = '#7b8494';
    const body = new Builder({ r: 0.08 });
    body.box(-0.21, -0.42, 0.2, 0.42, 0.72, 0.36, c, { r: 0.12 });
    const legs = [];
    for (const [dx, dz] of [[-0.13, -0.28], [0.13, -0.28], [-0.13, 0.16], [0.13, 0.16]]) legs.push(meshBox(0.14, 0.24, 0.14, dark, 0.05));
    const head = new Builder({ r: 0.08 });
    head.box(-0.22, -0.23, 0, 0.44, 0.46, 0.4, c, { r: 0.12 });
    head.pyramid(-0.2, -0.2, 0.4, 0.14, 0.14, 0.2, c);
    head.pyramid(0.06, -0.2, 0.4, 0.14, 0.14, 0.2, c);
    eyes(head, -0.22, -0.23, 0, 0.44, 0.46, 0.64);
    head.face(-0.22, -0.23, 0, 0.44, 0.46, 'y', 0.19, 0.12, 0.08, 0.06, '#ff8fb1', { t: 0.05 });
    const tail = meshBox(0.08, 0.45, 0.08, dark, 0.03);
    tail.geometry = tail.geometry.clone().translate(0, 0.22, 0);
    return { body: body.build(), legs, head: head.build(), tail, bodyZ: 0.2, bodyH: 0.36, headAt: [0, 0.5, 0.28], tailAt: [0, 0.4, -0.42], sleepH: 0.26 };
  },
  dino() {
    const c = '#45d65c', dark = '#1d9a37';
    const body = new Builder({ r: 0.08 });
    body.box(-0.28, -0.55, 0.3, 0.56, 0.9, 0.5, c, { r: 0.14 });
    for (let i = 0; i < 4; i++) body.pyramid(-0.08, -0.5 + i * 0.22, 0.8, 0.16, 0.16, 0.2, dark);
    const legs = [];
    for (const [dx, dz] of [[-0.17, -0.2], [0.17, -0.2]]) legs.push(meshBox(0.24, 0.34, 0.28, dark, 0.06));
    const head = new Builder({ r: 0.08 });
    head.box(-0.12, -0.12, -0.25, 0.24, 0.24, 0.35, c, { r: 0.06 });      // neck
    head.box(-0.28, -0.25, 0, 0.56, 0.5, 0.42, c, { r: 0.12 });
    eyes(head, -0.28, -0.25, 0, 0.56, 0.5, 0.72);
    head.face(-0.28, -0.25, 0, 0.56, 0.5, 'y', 0.1, 0.06, 0.34, 0.08, '#ffffff', { t: 0.05 }); // teeth
    const tail = meshBox(0.16, 0.18, 0.4, c, 0.05);
    tail.geometry = tail.geometry.clone().translate(0, 0, -0.2);
    return { body: body.build(), legs, head: head.build(), tail, bodyZ: 0.3, bodyH: 0.5, headAt: [0, 0.75, 0.45], tailAt: [0, 0.42, -0.55], sleepH: 0.34, legDz: [-0.2, -0.2] };
  },
};

export function petModel(id) {
  const parts = (PETS[id] || PETS.hond)();
  const group = new T.Group();
  group.add(blob(0.5, 0.3));
  const bodyG = new T.Group();
  bodyG.add(parts.body);
  const headG = new T.Group();
  headG.add(parts.head);
  headG.position.set(...parts.headAt);
  bodyG.add(headG);
  parts.tail.position.set(...parts.tailAt);
  bodyG.add(parts.tail);
  group.add(bodyG);
  const legPos = id === 'dino' ? [[-0.17, -0.2], [0.17, -0.2]] : id === 'kat' ? [[-0.13, -0.28], [0.13, -0.28], [-0.13, 0.16], [0.13, 0.16]] : [[-0.16, -0.32], [0.16, -0.32], [-0.16, 0.18], [0.16, 0.18]];
  parts.legs.forEach((leg, i) => { leg.position.set(legPos[i][0], 0.14, legPos[i][1]); group.add(leg); });

  function update(t, { sleeping = false, phase = 0, walking = false } = {}) {
    const bob = sleeping ? 0 : Math.abs(Math.sin(t / 300 + phase)) * 0.05;
    bodyG.position.y = sleeping ? -parts.bodyZ + 0.06 : bob;
    bodyG.rotation.x = 0;
    for (let i = 0; i < parts.legs.length; i++) {
      const leg = parts.legs[i];
      leg.visible = !sleeping;
      leg.rotation.x = walking ? Math.sin(t / 120 + phase + i * Math.PI) * 0.6 : 0;
    }
    parts.tail.rotation.y = sleeping ? 0 : Math.sin(t / 120 + phase) * 0.6;
    parts.tail.rotation.x = sleeping ? 0.6 : -0.3;
    headG.rotation.z = sleeping ? 0.5 : Math.sin(t / 700 + phase) * 0.08;
    headG.rotation.y = sleeping ? 0 : Math.sin(t / 1100 + phase) * 0.25;
  }
  return { group, update };
}
