// 3d/player.js — pure movement for the adventure: a third-person player (walk, run, jump, turn) that bumps into round
// obstacles and stays on the island, plus a follower (the dog) that trots after the player. No Three.js here: the
// same functions run in the unit tests (tests/unit/player.test.js) and in the scene (3d/scene-avontuur.js).
//
// Coordinates: x / z on the ground (world units, 1 ≈ one metre in the town), y up. Heading is the angle the player
// faces: a Three group with rotation.y = heading has its local +z pointing along (sin heading, cos heading).

export const PLAYER = Object.freeze({
  radius: 0.36,        // body radius for collisions
  walk: 2.6,           // units per second
  run: 4.6,
  accel: 18,           // how fast the speed follows the stick
  turn: 11,            // heading follows the move direction at this rate (rad/s scale)
  jumpSpeed: 5.6,      // gives a hop of ≈ 1.1 units
  gravity: 15,
  runAt: 0.92,         // stick pushed this far = run
});

export const FOLLOWER = Object.freeze({
  radius: 0.3,
  speed: 3.4,          // a bit faster than the player's walk, slower than the run
  keep: 0.9,           // preferred distance behind the player
  side: 1.15,          // ... and to the player's right
  start: 1.9,          // starts moving when farther away than this
  turn: 9,
});

export function createPlayer(x = 0, z = 0, heading = 0) {
  return { x, z, y: 0, vy: 0, heading, vx: 0, vz: 0, speed: 0, grounded: true, moving: false, running: false, landed: false, jumped: false };
}

export function createFollower(x = 0, z = 0, heading = 0) {
  return { x, z, heading, moving: false };
}

/** Signed distance from (x, z) to the border of a rounded rectangle {x, z, w, d, r} (negative = inside). */
export function roundedRectSdf(px, pz, rect) {
  const hx = rect.w / 2 - rect.r, hz = rect.d / 2 - rect.r;
  const cx = rect.x + rect.w / 2, cz = rect.z + rect.d / 2;
  const qx = Math.abs(px - cx) - hx, qz = Math.abs(pz - cz) - hz;
  const ox = Math.max(qx, 0), oz = Math.max(qz, 0);
  return Math.hypot(ox, oz) + Math.min(Math.max(qx, qz), 0) - rect.r;
}

/** Push (x, z) back inside `rect` by `margin` (the sandy rim is not for walking). Returns [x, z]. */
export function keepInside(px, pz, rect, margin = 0) {
  const inner = { x: rect.x + margin, z: rect.z + margin, w: rect.w - 2 * margin, d: rect.d - 2 * margin, r: Math.max(0.01, rect.r - margin) };
  let x = px, z = pz;
  for (let i = 0; i < 3; i++) {
    const s = roundedRectSdf(x, z, inner);
    if (s <= 0) break;
    const e = 0.01;
    const gx = (roundedRectSdf(x + e, z, inner) - roundedRectSdf(x - e, z, inner)) / (2 * e);
    const gz = (roundedRectSdf(x, z + e, inner) - roundedRectSdf(x, z - e, inner)) / (2 * e);
    const len = Math.hypot(gx, gz) || 1;
    x -= (gx / len) * (s + 0.001);
    z -= (gz / len) * (s + 0.001);
  }
  return [x, z];
}

/** Push (x, z) out of every round obstacle {x, z, r} for a body of radius `radius`. Returns [x, z]. */
export function pushOut(px, pz, radius, obstacles) {
  let x = px, z = pz;
  for (let pass = 0; pass < 2; pass++) {
    for (const o of obstacles) {
      const dx = x - o.x, dz = z - o.z;
      const min = o.r + radius;
      const d = Math.hypot(dx, dz);
      if (d >= min) continue;
      if (d < 1e-6) { x = o.x + min; continue; }
      x = o.x + (dx / d) * min;
      z = o.z + (dz / d) * min;
    }
  }
  return [x, z];
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Ease `from` towards `to` (angles) by rate*dt, the short way round. */
export function turnTowards(from, to, rate, dt) {
  const d = wrapAngle(to - from);
  const k = Math.min(1, rate * dt);
  return wrapAngle(from + d * k);
}

/**
 * Advance the player by dt seconds.
 * input = { x, y, run, jump }: x right / y forward on the stick, each in [-1, 1], relative to the camera yaw;
 * env = { yaw, obstacles: [{x, z, r}], island: {x, z, w, d, r}, margin }.
 * Sets p.landed / p.jumped for one step so the scene can play a sound.
 */
export function stepPlayer(p, input, dt, env) {
  const P = PLAYER;
  p.landed = false;
  p.jumped = false;
  let ix = input.x || 0, iy = input.y || 0;
  let mag = Math.hypot(ix, iy);
  if (mag > 1) { ix /= mag; iy /= mag; mag = 1; }
  const dead = mag < 0.12;
  const wantRun = !dead && (input.run || mag >= P.runAt);
  const target = dead ? 0 : (wantRun ? P.run : P.walk) * Math.min(1, mag / P.runAt);
  // move direction in the world: forward = the camera's looking direction on the ground
  const fx = Math.sin(env.yaw), fz = Math.cos(env.yaw);
  const rx = Math.cos(env.yaw), rz = -Math.sin(env.yaw);
  let dx = 0, dz = 0;
  if (!dead) {
    dx = rx * ix + fx * iy;
    dz = rz * ix + fz * iy;
    const l = Math.hypot(dx, dz) || 1;
    dx /= l; dz /= l;
    p.heading = turnTowards(p.heading, Math.atan2(dx, dz), P.turn, dt);
  }
  // speed follows the stick smoothly; airborne the direction is kept (no air control surprises)
  const k = Math.min(1, P.accel * dt);
  p.speed += (target - p.speed) * k;
  if (!dead && p.grounded) { p.vx = dx * p.speed; p.vz = dz * p.speed; }
  else if (p.grounded) { p.vx = 0; p.vz = 0; p.speed = 0; }
  let x = p.x + p.vx * dt, z = p.z + p.vz * dt;
  if (env.obstacles) [x, z] = pushOut(x, z, P.radius, env.obstacles);
  if (env.island) [x, z] = keepInside(x, z, env.island, env.margin ?? 0);
  p.x = x; p.z = z;
  // jumping
  if (input.jump && p.grounded) { p.vy = P.jumpSpeed; p.grounded = false; p.jumped = true; }
  if (!p.grounded) {
    p.y += p.vy * dt;
    p.vy -= P.gravity * dt;
    if (p.y <= 0) { p.y = 0; p.vy = 0; p.grounded = true; p.landed = true; }
  }
  p.moving = !dead || p.speed > 0.2;
  p.running = wantRun;
  return p;
}

/** The dog: trots towards a point behind the player when it fell behind, turns to face where it goes. */
export function stepFollower(f, player, dt, env = {}) {
  const F = FOLLOWER;
  // the spot the dog aims for: behind and to the right of the player, so it never sits between camera and player
  const sh = Math.sin(player.heading), ch = Math.cos(player.heading);
  const bx = player.x - sh * F.keep + ch * F.side;
  const bz = player.z - ch * F.keep - sh * F.side;
  const dx = bx - f.x, dz = bz - f.z;
  const d = Math.hypot(dx, dz);
  const far = Math.hypot(player.x - f.x, player.z - f.z);
  if (!f.moving && far > F.start) f.moving = true;
  if (f.moving && d < 0.15) f.moving = false;
  if (f.moving && d > 1e-4) {
    const speed = Math.min(F.speed, d / Math.max(dt, 1e-3));
    f.heading = turnTowards(f.heading, Math.atan2(dx, dz), F.turn, dt);
    let x = f.x + (dx / d) * speed * dt, z = f.z + (dz / d) * speed * dt;
    if (env.obstacles) [x, z] = pushOut(x, z, F.radius, env.obstacles);
    if (env.island) [x, z] = keepInside(x, z, env.island, env.margin ?? 0);
    f.x = x; f.z = z;
  } else if (!f.moving) {
    // idle: look at the player
    f.heading = turnTowards(f.heading, Math.atan2(player.x - f.x, player.z - f.z), 4, dt);
  }
  return f;
}
