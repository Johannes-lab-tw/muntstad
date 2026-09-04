// The adventure's movement is pure (docs/js/3d/player.js): walking follows the camera, jumps land, obstacles and the
// island edge push the player back, and the dog catches up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, createFollower, stepPlayer, stepFollower, keepInside, pushOut, roundedRectSdf, PLAYER } from '../../docs/js/3d/player.js';

const island = { x: 0, z: 0, w: 16, d: 12, r: 2.4 };

function run(p, input, seconds, env, dt = 1 / 60) {
  const events = { jumped: 0, landed: 0, maxY: 0 };
  for (let t = 0; t < seconds; t += dt) {
    stepPlayer(p, input, dt, env);
    if (p.jumped) events.jumped++;
    if (p.landed) events.landed++;
    events.maxY = Math.max(events.maxY, p.y);
    if (input.jump) input = { ...input, jump: false };
  }
  return events;
}

test('pushing the stick forward walks in the camera direction and turns the player that way', () => {
  const p = createPlayer(8, 6, 0);
  run(p, { x: 0, y: 1 }, 1, { yaw: 0, obstacles: [], island });
  assert.ok(p.z > 6 + 2.0, `walked forward: z ${p.z}`);
  assert.ok(Math.abs(p.x - 8) < 0.01);
  assert.ok(Math.abs(p.heading) < 0.01, 'faces +z');
  const q = createPlayer(8, 6, 0);
  run(q, { x: 1, y: 0 }, 1, { yaw: 0, obstacles: [], island });
  // looking along +z in a right-handed y-up world, the right-hand side is -x
  assert.ok(q.x < 8 - 2.0, 'stick right moves right of the camera (-x when looking along +z)');
  assert.ok(Math.abs(q.heading + Math.PI / 2) < 0.02, 'faces -x');
});

test('a full stick runs, a half stick walks, no stick stops', () => {
  const walk = createPlayer(8, 6, 0);
  run(walk, { x: 0, y: 0.5 }, 2, { yaw: 0, obstacles: [], island });
  const sprint = createPlayer(8, 6, 0);
  run(sprint, { x: 0, y: 1 }, 2, { yaw: 0, obstacles: [], island });
  assert.ok(sprint.z - 6 > (walk.z - 6) * 1.4, `run ${sprint.z - 6} vs walk ${walk.z - 6}`);
  assert.ok(sprint.running);
  run(sprint, { x: 0, y: 0 }, 0.5, { yaw: 0, obstacles: [], island });
  assert.equal(sprint.moving, false);
  assert.ok(Math.abs(sprint.vx) < 1e-9 && Math.abs(sprint.vz) < 1e-9);
});

test('a jump rises about one unit and lands again; no double jump in the air', () => {
  const p = createPlayer(8, 6, 0);
  const ev = run(p, { x: 0, y: 0, jump: true }, 1.5, { yaw: 0, obstacles: [], island });
  assert.equal(ev.jumped, 1);
  assert.equal(ev.landed, 1);
  assert.ok(ev.maxY > 0.9 && ev.maxY < 1.4, `apex ${ev.maxY}`);
  assert.equal(p.y, 0);
  assert.ok(p.grounded);
  const q = createPlayer(8, 6, 0);
  stepPlayer(q, { jump: true }, 1 / 60, { yaw: 0 });
  stepPlayer(q, { jump: true }, 1 / 60, { yaw: 0 });
  assert.ok(q.vy < PLAYER.jumpSpeed, 'second press ignored while airborne');
});

test('obstacles and the island edge push the player back', () => {
  const tree = { x: 8, z: 9, r: 0.5 };
  const p = createPlayer(8, 6, 0);
  run(p, { x: 0, y: 1 }, 3, { yaw: 0, obstacles: [tree], island });
  assert.ok(Math.hypot(p.x - tree.x, p.z - tree.z) >= tree.r + PLAYER.radius - 1e-6, 'stays outside the tree');
  assert.ok(p.z < 9, 'did not walk through it');
  const q = createPlayer(8, 6, 0);
  run(q, { x: 0, y: 1 }, 6, { yaw: 0, obstacles: [], island, margin: 0.45 });
  assert.ok(q.z <= 12 - 0.45 + 1e-6, `stays on the island: z ${q.z}`);
  assert.ok(roundedRectSdf(q.x, q.z, island) <= -0.45 + 1e-3);
  // the rounded corner is honoured too
  const [cx, cz] = keepInside(0.1, 0.1, island, 0.45);
  assert.ok(roundedRectSdf(cx, cz, island) <= -0.44, `corner: ${roundedRectSdf(cx, cz, island)}`);
  const [ox, oz] = pushOut(5, 5, 0.36, [{ x: 5, z: 5, r: 1 }]);
  assert.ok(Math.hypot(ox - 5, oz - 5) >= 1.36 - 1e-6, 'a point inside an obstacle is pushed out');
});

test('the dog catches up and stops behind the player', () => {
  const p = createPlayer(8, 6, 0);
  const dog = createFollower(8, 4.8, 0);
  const env = { yaw: 0, obstacles: [], island };
  for (let t = 0; t < 3; t += 1 / 60) { stepPlayer(p, { x: 0, y: 1 }, 1 / 60, env); stepFollower(dog, p, 1 / 60, env); }
  for (let t = 0; t < 2; t += 1 / 60) { stepPlayer(p, { x: 0, y: 0 }, 1 / 60, env); stepFollower(dog, p, 1 / 60, env); }
  const d = Math.hypot(p.x - dog.x, p.z - dog.z);
  assert.ok(d > 0.8 && d < 2.0, `dog ${d} behind`);
  assert.ok(dog.z < p.z, 'behind, not in front');
  assert.equal(dog.moving, false);
});
