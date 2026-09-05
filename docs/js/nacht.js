// nacht.js — the night, pure (no DOM, no Three): the campfire that eats wood, ghosts that steal in the dark, the
// Nachtbeer, and the reward at dawn. Numbers in config.nacht; the scene (3d/scene-eiland.js + 3d/spoken.js) only
// moves models around and asks these functions what happens. Nobody gets hurt: losing means losing wood or coins.
// V6.2: the fire is a heap of wood. `fire` counts the pieces in it; the more wood, the higher the level (1..5), the
// bigger the fire, the further its light reaches, and the more it eats per night. Under the limit the level drops.
import { CYCLE } from './3d/daycycle.js';

export function createNacht() {
  return { fire: 30, nights: 0, stolen: 0, clockOffsetMs: 0, lastDawnPhase: 0, bearScared: 0, fainted: 0, bumped: 0, warm: 100, frozen: 0 };
}

/** The level of the fire from the wood in it: 0 = out, 1 = a small fire, up to 5 = a bonfire (config.nacht.levels). */
export function fireLevel(fire, config) {
  if (!(fire > 0)) return 0;
  let level = 1;
  for (const limit of config.nacht.levels) if (fire >= limit) level++;
  return level;
}
/** Where this level starts and where the next one begins (for the HUD bar). */
export function levelSpan(fire, config) {
  const L = config.nacht.levels;
  const level = fireLevel(fire, config);
  const from = level <= 1 ? 0 : L[level - 2];
  const to = level === 0 ? 1 : level - 1 < L.length ? L[level - 1] : config.nacht.fireMax;
  return { level, from, to };
}

/** The fire burns down: slowly by day, faster in the dark, more per level. fire = pieces of wood (0..fireMax). */
export function burnFire(n, config, dtMs, darkness, mul = 1) {
  const N = config.nacht;
  const level = fireLevel(n.fire, config);
  if (level <= 0) return n;
  const rate = (N.burnDay + (N.burnNight - N.burnDay) * darkness) * (1 + (level - 1) * N.burnPerLevel) * mul;   // pieces per minute (the fire pit slows it)
  return { ...n, fire: Math.max(0, n.fire - (rate * dtMs) / 60000) };
}

/** Put wood in the fire: returns { nacht, eiland, used }. Takes up to `max` pieces from the backpack. */
export function stokeFire(n, e, config, max = 3) {
  const room = Math.max(0, Math.floor(config.nacht.fireMax - n.fire));
  const used = Math.max(0, Math.min(max, e.bag.hout || 0, room));
  if (used <= 0) return { nacht: n, eiland: e, used: 0 };
  return { nacht: { ...n, fire: Math.min(config.nacht.fireMax, n.fire + used) }, eiland: { ...e, bag: { ...e.bag, hout: e.bag.hout - used } }, used };
}

/** How far the fire's light reaches (ghosts keep out of the light): per level. */
export function fireRadius(n, config) {
  return config.nacht.levelRadius[fireLevel(n.fire, config)] || 0;
}

/** Is a point lit? lights = [{ x, z, r }]. */
export function isLit(x, z, lights) {
  for (const l of lights) if (l.r > 0 && Math.hypot(x - l.x, z - l.z) < l.r) return true;
  return false;
}

/**
 * A ghost drifts towards its target (the camp or the player), stays out of the light and, when it reaches an unlit
 * target, steals once and flees. g = { x, z, heading, state: 'come'|'flee', stole }.
 * ctx = { target: {x, z}, lights, fence: {x, z, r} | null, dt }. Returns 'steal' when it reaches the target in the dark.
 */
export function stepGhost(g, ctx, config) {
  const speed = config.nacht.ghostSpeed * (ctx.speedMul || 1);   // later nights: faster (uitdaging.nightRules)
  const dt = ctx.dt;
  if (g.state === 'flee') {
    g.x += Math.sin(g.heading) * speed * 1.8 * dt;
    g.z += Math.cos(g.heading) * speed * 1.8 * dt;
    g.life = (g.life ?? 4) - dt;
    return g.life <= 0 ? 'gone' : null;
  }
  const dx = ctx.target.x - g.x, dz = ctx.target.z - g.z;
  const d = Math.hypot(dx, dz);
  const step = Math.min(speed * dt, d);   // a long frame never overshoots the target
  const nx = g.x + (dx / Math.max(1e-6, d)) * step, nz = g.z + (dz / Math.max(1e-6, d)) * step;
  // light and the fence keep it out: it hovers at the edge, wobbling sideways
  const blocked = isLit(nx, nz, ctx.lights) || (ctx.fence && Math.hypot(nx - ctx.fence.x, nz - ctx.fence.z) < ctx.fence.r);
  if (blocked) {
    g.wait = (g.wait ?? 0) + dt;
    const side = Math.sin(g.wait * 1.7) * speed * dt;
    g.x += -(dz / Math.max(1e-6, d)) * side;
    g.z += (dx / Math.max(1e-6, d)) * side;
    g.heading = Math.atan2(dx, dz);
    if (g.wait > config.nacht.ghostPatience) { g.state = 'flee'; g.heading += Math.PI; g.life = 3; }
    return null;
  }
  g.x = nx; g.z = nz;
  g.heading = Math.atan2(dx, dz);
  if (d < config.nacht.ghostReach) { g.state = 'flee'; g.heading += Math.PI; g.life = 4; g.stole = true; return 'steal'; }
  return null;
}

/** What a ghost takes: a piece of wood from the fire, an item from the backpack, or a few coins. */
export function ghostSteal(n, e, wallet, config, pick = Math.random()) {
  const have = Object.entries(e.bag).filter(([, v]) => v > 0);
  if (n.fire >= 1 && pick < 0.5) return { nacht: { ...n, fire: Math.max(0, n.fire - config.nacht.ghostTakes), stolen: n.stolen + 1 }, eiland: e, wallet, what: 'vuur' };
  if (have.length) {
    const [id] = have[Math.floor(pick * have.length) % have.length];
    return { nacht: { ...n, stolen: n.stolen + 1 }, eiland: { ...e, bag: { ...e.bag, [id]: e.bag[id] - 1 } }, wallet, what: id };
  }
  const coins = Math.min(Math.floor(wallet), config.nacht.ghostCoins);
  return { nacht: { ...n, stolen: n.stolen + 1 }, eiland: e, wallet: wallet - coins, what: coins > 0 ? 'munten' : 'niets', coins };
}

/** Which night is it (1 = the first)? The bear comes every `bearEvery`-th night. */
export function bearTonight(n, config, every = config.nacht.bearEvery) {
  return (n.nights + 1) % every === 0;
}

/** The bear plods to the fire; noise (BOE) scares it a bit each time; three times and it turns round. b = { x, z, heading, scared, state } */
export function stepBear(b, ctx, config) {
  const dt = ctx.dt;
  if (b.state === 'flee') {
    b.x += Math.sin(b.heading) * config.nacht.bearSpeed * 2 * dt;
    b.z += Math.cos(b.heading) * config.nacht.bearSpeed * 2 * dt;
    b.life = (b.life ?? 6) - dt;
    return b.life <= 0 ? 'gone' : null;
  }
  if (b.pause > 0) { b.pause -= dt; return null; }
  const dx = ctx.target.x - b.x, dz = ctx.target.z - b.z;
  const d = Math.hypot(dx, dz);
  b.heading = Math.atan2(dx, dz);
  if (d < config.nacht.bearReach) { b.state = 'flee'; b.heading += Math.PI; b.life = 6; return 'eat'; }
  const step = Math.min(config.nacht.bearSpeed * dt, d);
  b.x += (dx / d) * step;
  b.z += (dz / d) * step;
  return null;
}
export function scareBear(b, config, scares = config.nacht.bearScares) {
  b.scared = (b.scared || 0) + 1;
  b.pause = 1.2;
  if (b.scared >= scares) { b.state = 'flee'; b.heading += Math.PI; b.life = 6; return true; }   // with the drum: one BOE
  return false;
}

/** Dawn: a night survived with the fire still burning pays coins; the bear counts extra. Returns { nacht, reward }. */
export function dawnReward(n, config, fireWasBurning) {
  const nights = n.nights + 1;
  const reward = fireWasBurning ? config.nacht.rewardBase + config.nacht.rewardPerNight * n.nights : 0;
  return { nacht: { ...n, nights, bearScared: 0 }, reward };
}

export function normalizeNacht(data, config = null) {
  const fresh = createNacht();
  if (!data || typeof data !== 'object') return fresh;
  const num = (v, max = 1e9) => Math.min(max, Math.max(0, Number(v) || 0));
  const fireMax = config ? config.nacht.fireMax : 400;
  const total = CYCLE.dayMs + CYCLE.nightMs;
  return {
    fire: num(data.fire, fireMax), nights: Math.floor(num(data.nights)), stolen: Math.floor(num(data.stolen)),
    clockOffsetMs: Math.floor(Number(data.clockOffsetMs) || 0) % total, lastDawnPhase: num(data.lastDawnPhase, 1),
    bearScared: Math.floor(num(data.bearScared, 9)), fainted: Math.floor(num(data.fainted)), bumped: Math.floor(num(data.bumped)),
    warm: data.warm == null ? 100 : num(data.warm, 100), frozen: Math.floor(num(data.frozen)),
  };
}

/**
 * A shadow wolf (V6.2). w = { x, z, heading, state: 'circle'|'lunge'|'flee', ang, wait, dir }.
 * ctx = { target: {x, z}, safe (the target stands in light or behind the fence), dt }. Returns 'bite' when a lunge
 * reaches an unsafe target, 'gone' when a fleeing wolf is far away, else null. Wolves circle at circleR (further out
 * when the target is lit), give up after `patience` seconds in the light, and never bite a safe target.
 */
export function stepWolf(w, ctx, config) {
  const W = config.wolven, dt = ctx.dt;
  const dx = ctx.target.x - w.x, dz = ctx.target.z - w.z, d = Math.hypot(dx, dz);
  if (w.state === 'flee') {
    w.x += Math.sin(w.heading) * W.speed * 1.5 * dt;
    w.z += Math.cos(w.heading) * W.speed * 1.5 * dt;
    w.life = (w.life ?? W.fleeMs / 1000) - dt;
    return w.life <= 0 ? 'gone' : null;
  }
  if (w.state === 'lunge') {
    if (ctx.safe) { w.state = 'circle'; return null; }
    w.heading = Math.atan2(dx, dz);
    const step = Math.min(W.speed * 1.4 * dt, d);
    w.x += Math.sin(w.heading) * step;
    w.z += Math.cos(w.heading) * step;
    if (d - step < W.reach) { w.state = 'flee'; w.heading += Math.PI; w.life = W.fleeMs / 1000; return 'bite'; }
    return null;
  }
  const r = ctx.safe ? W.circleR + W.lightGap : W.circleR;
  w.ang = (w.ang || 0) + (W.speed / r) * dt * (w.dir || 1);
  const tx = ctx.target.x + Math.cos(w.ang) * r, tz = ctx.target.z + Math.sin(w.ang) * r;
  const ex = tx - w.x, ez = tz - w.z, ed = Math.hypot(ex, ez);
  const step = Math.min(W.speed * dt, ed);
  if (ed > 1e-6) { w.x += (ex / ed) * step; w.z += (ez / ed) * step; w.heading = Math.atan2(ex, ez); }
  if (ctx.safe) {
    w.wait = (w.wait || 0) + dt;
    if (w.wait > W.patience) { w.state = 'flee'; w.heading = Math.atan2(w.x - ctx.target.x, w.z - ctx.target.z); w.life = W.fleeMs / 1000; }
  } else w.wait = 0;
  return null;
}
/** BOE: the wolf turns and runs. */
export function scareWolf(w, config) {
  w.state = 'flee';
  w.heading = (w.heading || 0) + Math.PI;
  w.life = config.wolven.fleeMs / 1000;
}
