// bazen.js — the boss nights (V9.5, PLAN-V9 §B), pure. Every fifth night a boss comes: the Nachtbeerkoning (night 5),
// the Spookkapitein (10, a ghost: only water and the alien pistol work), the Moerasmonster (15), then round two with more
// lives. A boss walks to the fire, eats a heap of wood, backs off and comes again until dawn or until it is beaten;
// beaten = coins and, the first time, a hat nobody can buy. No blood: it poofs.

export const BAZEN = Object.freeze([
  { id: 'koning',   naam: 'Nachtbeerkoning', icon: '👑', hp: 10, speed: 1.3, reach: 2.2, geest: false, eet: 20, buit: { munten: 100, ding: 'berenkroon' },    truc: 'storm' },
  { id: 'kapitein', naam: 'Spookkapitein',   icon: '🏴‍☠️', hp: 10, speed: 1.1, reach: 2.0, geest: true,  eet: 15, buit: { munten: 200, ding: 'kapiteinshoed' }, truc: 'spoken' },
  { id: 'monster',  naam: 'Moerasmonster',   icon: '🟢', hp: 12, speed: 0.9, reach: 2.4, geest: false, eet: 25, buit: { munten: 300, ding: 'moerasmuts' },    truc: 'slijm' },
]);
export const BAAS_IDS = BAZEN.map((b) => b.id);
export function baasById(id) { return BAZEN.find((b) => b.id === id) || null; }

/** The boss of the night after `nights` survived nights, or null. Round two and up add `hpPerRonde` lives. */
export function baasVoorNacht(nights, cfg) {
  const n = (nights || 0) + 1;
  if (n < cfg.vanafNacht || n % cfg.elke !== 0) return null;
  const k = n / cfg.elke - 1;
  const def = BAZEN[k % BAZEN.length];
  const ronde = Math.floor(k / BAZEN.length);
  return { ...def, ronde, hp: def.hp + ronde * cfg.hpPerRonde };
}

/** A fresh boss record at (x, z) heading for the fire. */
export function maakBaas(def, x, z) {
  return { x, z, heading: 0, state: 'come', hp: def.hp, hpMax: def.hp, pause: 0, retreat: 0, burst: 0, sinds: 0 };
}

/**
 * Advance the boss by dt seconds towards ctx.target: 'eat' the moment it reaches the fire (then it backs off five
 * seconds and comes again), 'gone' when it has fled out of sight, else null. The king storms: every twelve seconds
 * two seconds at double speed.
 */
export function stepBaas(b, ctx, def) {
  const dt = ctx.dt;
  b.sinds = (b.sinds || 0) + dt;
  if (b.state === 'flee') {
    b.x += Math.sin(b.heading) * def.speed * 2.5 * dt;
    b.z += Math.cos(b.heading) * def.speed * 2.5 * dt;
    b.life = (b.life ?? 6) - dt;
    return b.life <= 0 ? 'gone' : null;
  }
  if (b.pause > 0) { b.pause -= dt; return null; }
  const dx = ctx.target.x - b.x, dz = ctx.target.z - b.z;
  const d = Math.hypot(dx, dz) || 1e-6;
  if (b.state === 'retreat') {
    b.heading = Math.atan2(-dx, -dz);
    b.x -= (dx / d) * def.speed * dt;
    b.z -= (dz / d) * def.speed * dt;
    b.retreat -= dt;
    if (b.retreat <= 0) b.state = 'come';
    return null;
  }
  b.heading = Math.atan2(dx, dz);
  if (d < def.reach) { b.state = 'retreat'; b.retreat = 5; return 'eat'; }
  let speed = def.speed;
  if (def.truc === 'storm') { const t = b.sinds % 12; if (t > 10) speed *= 2; }
  const step = Math.min(speed * dt, d);
  b.x += (dx / d) * step;
  b.z += (dz / d) * step;
  return null;
}

/** The loot: coins, the hat the first time, and the count on PAPA. */
export function baasBuit(state, config, def) {
  const e = state.eiland;
  const munten = def.buit.munten;
  const nieuw = !!def.buit.ding && !state.fun[def.buit.ding];
  const fun = nieuw ? { ...state.fun, [def.buit.ding]: true } : state.fun;
  const bazen = { ...(e.bazen || {}), [def.id]: ((e.bazen && e.bazen[def.id]) || 0) + 1 };
  return { munten, ding: def.buit.ding, nieuw, state: { ...state, fun, wallet: state.wallet + munten, earnedWork: state.earnedWork + munten, eiland: { ...e, bazen } } };
}
