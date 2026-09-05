// nacht.js — the night, pure (no DOM, no Three): the campfire that eats wood, ghosts that steal in the dark, the
// Nachtbeer, and the reward at dawn. Numbers in config.nacht; the scene (3d/scene-eiland.js + 3d/spoken.js) only
// moves models around and asks these functions what happens. Nobody gets hurt: losing means losing wood or coins.

export function createNacht() {
  return { fire: 60, nights: 0, stolen: 0, clockOffsetMs: 0, lastDawnPhase: 0, bearScared: 0, fainted: 0, bumped: 0 };
}

/** The fire burns down: slowly by day, faster in the dark. fire is 0..100. */
export function burnFire(n, config, dtMs, darkness, mul = 1) {
  const rate = (config.nacht.burnDay + (config.nacht.burnNight - config.nacht.burnDay) * darkness) * mul;   // units per minute (the fire pit slows it)
  return { ...n, fire: Math.max(0, n.fire - (rate * dtMs) / 60000) };
}

/** Put wood in the fire: returns { nacht, eiland, used }. Takes up to `max` pieces from the backpack. */
export function stokeFire(n, e, config, max = 3) {
  const room = Math.ceil((100 - n.fire) / config.nacht.woodValue);
  const used = Math.max(0, Math.min(max, e.bag.hout || 0, room));
  if (used <= 0) return { nacht: n, eiland: e, used: 0 };
  return { nacht: { ...n, fire: Math.min(100, n.fire + used * config.nacht.woodValue) }, eiland: { ...e, bag: { ...e.bag, hout: e.bag.hout - used } }, used };
}

/** How far the fire's light reaches (ghosts keep out of the light). */
export function fireRadius(n, config) {
  return n.fire <= 0 ? 0 : config.nacht.fireRadiusMin + (config.nacht.fireRadiusMax - config.nacht.fireRadiusMin) * (n.fire / 100);
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
  const nx = g.x + (dx / Math.max(1e-6, d)) * speed * dt, nz = g.z + (dz / Math.max(1e-6, d)) * speed * dt;
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
  if (n.fire >= config.nacht.woodValue && pick < 0.5) return { nacht: { ...n, fire: n.fire - config.nacht.woodValue, stolen: n.stolen + 1 }, eiland: e, wallet, what: 'vuur' };
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
  b.x += (dx / d) * config.nacht.bearSpeed * dt;
  b.z += (dz / d) * config.nacht.bearSpeed * dt;
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

export function normalizeNacht(data) {
  const fresh = createNacht();
  if (!data || typeof data !== 'object') return fresh;
  const num = (v, max = 1e9) => Math.min(max, Math.max(0, Number(v) || 0));
  return { fire: num(data.fire, 100), nights: Math.floor(num(data.nights)), stolen: Math.floor(num(data.stolen)), clockOffsetMs: Math.floor(Number(data.clockOffsetMs) || 0) % (9 * 60 * 1000), lastDawnPhase: 0, bearScared: 0, fainted: Math.floor(num(data.fainted)), bumped: Math.floor(num(data.bumped)) };
}
