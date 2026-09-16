// piraten.js — the pirates (V8.4, PLAN-V8 §B), pure. From night `vanafNacht` and then every `elke` nights a pirate
// boat lands on the south beach a minute after dark and `aantal` pirates walk slowly to the camp, lanterns in hand, to
// plunder the fire's wood and your bag. One BOE sends a pirate running (they are cowards), the dog chases one away
// too; all of them gone before they reach the fire = they drop a gold coin each. No coins are ever lost (rule 2).

export function piratenNacht(nights, cfg) {
  const n = (nights || 0) + 1;   // the night that is about to fall is night `n`
  if (n < cfg.vanafNacht) return false;
  return (n - cfg.vanafNacht) % cfg.elke === 0;
}

/** Advance one pirate: 'plunder' when it reaches the target, 'gone' when it has fled out of sight, else null. */
export function stepPiraat(p, ctx, cfg) {
  const dt = ctx.dt;
  if (p.state === 'flee') {
    p.x += Math.sin(p.heading) * cfg.speed * 2.2 * dt;
    p.z += Math.cos(p.heading) * cfg.speed * 2.2 * dt;
    p.life = (p.life ?? 8) - dt;
    return p.life <= 0 ? 'gone' : null;
  }
  if (p.pause > 0) { p.pause -= dt; return null; }
  const dx = ctx.target.x - p.x, dz = ctx.target.z - p.z;
  const d = Math.hypot(dx, dz);
  p.heading = Math.atan2(dx, dz);
  if (d < cfg.reach) return 'plunder';
  const step = Math.min(cfg.speed * dt, d);
  p.x += (dx / d) * step;
  p.z += (dz / d) * step;
  return null;
}

/** BOE (or the dog): the pirate turns and runs. Returns true when it was still coming. */
export function scarePiraat(p, awayFrom = null) {
  if (p.state !== 'come') return false;
  p.state = 'flee';
  p.heading = awayFrom ? Math.atan2(p.x - awayFrom.x, p.z - awayFrom.z) : p.heading + Math.PI;
  p.life = 8;
  return true;
}

/** The pirates reach the fire: a share of every kind in the bag and some wood from the fire go with them. */
export function plunder(state, cfg) {
  const e = state.eiland;
  const bag = { ...e.bag };
  const taken = {};
  for (const id of Object.keys(bag)) {
    const n = Math.floor((bag[id] || 0) * cfg.deel);
    if (n > 0) { bag[id] -= n; taken[id] = n; }
  }
  const hout = Math.min(cfg.houtWeg, Math.max(0, Math.floor(state.nacht.fire)));
  return { taken, hout, state: { ...state, eiland: { ...e, bag }, nacht: { ...state.nacht, fire: Math.max(0, state.nacht.fire - hout) } } };
}

/** What the pirates drop when all of them ran: a gold coin each. */
export function buit(cfg) {
  return cfg.aantal * cfg.munt;
}
