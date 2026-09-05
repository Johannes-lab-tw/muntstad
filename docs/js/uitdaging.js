// uitdaging.js — the challenge of V5.3, pure (no DOM, no Three): hunger and eating, fainting, the perks of the gadgets
// and camp upgrades, and how every night gets harder. Numbers in config.honger / config.deer / config.eiland.tools.
// V6.2: the cold (config.kou) and cooking on a big fire.
import { fireLevel } from './nacht.js';

/** What the owned tools change. Everything else reads these instead of the raw config. */
export function perks(e, config) {
  const t = (e && e.tools) || {};
  const N = config.nacht, E = config.eiland;
  return {
    bagMax: t.rugzak ? E.bagMaxBig : E.bagMax,
    speedMul: t.schoenen ? E.shoesSpeed : 1,
    fishPer: t.hengel ? 2 : 1,
    bearScares: t.trommel ? 1 : N.bearScares,
    burnMul: t.vuurkuil ? N.firePitBurn : 1,
    fenceRadius: t.hoog_hek ? N.fenceRadiusHigh : N.fenceRadius,
    huts: t.hut2 ? 2 : 1,
  };
}

/** Hunger drains while you are on the island: slowly by day, faster in the dark. honger is 0..100. */
export function drainHunger(e, config, dtMs, darkness) {
  const H = config.honger;
  const rate = H.drainDay + (H.drainNight - H.drainDay) * darkness;   // per minute
  return { ...e, honger: Math.max(0, (e.honger ?? 100) - (rate * dtMs) / 60000) };
}

/** Is the player slow with hunger? */
export function isHungry(e, config) {
  return (e.honger ?? 100) < config.honger.slowBelow;
}
export function hungerSpeedMul(e, config) {
  return isHungry(e, config) ? config.honger.slowSpeed : 1;
}

/** Eat one thing from the bag: fish first when really hungry, otherwise a berry. Returns { eiland, item, gain } (item null = nothing to eat). */
export function eat(e, config) {
  const H = config.honger;
  const honger = e.honger ?? 100;
  if (honger >= 100) return { eiland: e, item: null, gain: 0 };
  const order = honger < 50 ? ['maal', 'vis', 'bes'] : ['bes', 'vis', 'maal'];   // really hungry: the biggest thing first
  const item = order.find((id) => (e.bag[id] || 0) > 0) || null;
  if (!item) return { eiland: e, item: null, gain: 0 };
  const gain = H.food[item];
  return { eiland: { ...e, bag: { ...e.bag, [item]: e.bag[item] - 1 }, honger: Math.min(100, honger + gain) }, item, gain };
}
export function canEat(e) {
  return (e.honger ?? 100) < 100 && ((e.bag.bes || 0) > 0 || (e.bag.vis || 0) > 0 || (e.bag.maal || 0) > 0);
}

/** KOOK (V6.2): one fish from the bag becomes a meal, on a fire of at least config.nacht.cookLevel. Returns { eiland, ok }. */
export function cook(e, fire, config) {
  if (fireLevel(fire, config) < config.nacht.cookLevel || (e.bag.vis || 0) <= 0) return { eiland: e, ok: false };
  return { eiland: { ...e, bag: { ...e.bag, vis: e.bag.vis - 1, maal: (e.bag.maal || 0) + 1 } }, ok: true };
}

/**
 * Cold (V6.2): warmth 0..100 on nacht.warm. In the dark it drops unless you stand in the fire's light (then it rises
 * fast); a lantern or torch halves the loss; by day it slowly comes back anywhere. Every night the cold bites harder.
 */
export function coolDown(n, config, dtMs, darkness, { atFire = false, lit = false } = {}) {
  const K = config.kou;
  const warm = n.warm ?? 100;
  let rate;
  if (atFire) rate = K.warmUp;
  else if (darkness > 0.5) rate = -K.dropNight * Math.min(K.dropCap, 1 + K.dropPerNight * (n.nights || 0)) * (lit ? K.litMul : 1);
  else rate = K.recoverDay;
  return { ...n, warm: Math.max(0, Math.min(100, warm + (rate * dtMs) / 60000)) };
}
export function isCold(n, config) {
  return (n.warm ?? 100) < config.kou.slowBelow;
}
export function coldSpeedMul(n, config) {
  return isCold(n, config) ? config.kou.slowSpeed : 1;
}
/** Frozen: warmth at zero in the dark. Like fainting: half the bag is gone, you wake at the fire, a bit warmer. */
export function freeze(state, config) {
  const e = state.eiland;
  const bag = {};
  for (const [id, n] of Object.entries(e.bag)) bag[id] = Math.floor(n / 2);
  return { ...state, eiland: { ...e, bag }, nacht: { ...state.nacht, warm: config.kou.afterFaint, frozen: (state.nacht.frozen || 0) + 1 } };
}

/** Fainting: an empty stomach in the dark. Half the bag is gone, you wake at the campfire with some strength back. */
export function faint(state, config) {
  const e = state.eiland;
  const bag = {};
  for (const [id, n] of Object.entries(e.bag)) bag[id] = Math.floor(n / 2);
  return { ...state, eiland: { ...e, bag, honger: config.honger.afterFaint }, nacht: { ...state.nacht, fainted: (state.nacht.fainted || 0) + 1 } };
}

/** The deer's bump: the bag falls open. Returns { state, drops: [item ids] } — the drops lie on the ground to be picked up again. */
export function deerBump(state, config) {
  const e = state.eiland;
  const drops = [];
  const bag = { ...e.bag };
  for (const id of Object.keys(bag)) {
    const n = Math.ceil(bag[id] * config.deer.dropShare);
    let dropped = 0;
    for (let i = 0; i < n && drops.length < config.deer.maxDrops; i++) { drops.push(id); dropped++; }
    bag[id] -= dropped;   // only what really fell out leaves the bag
  }
  return { state: { ...state, eiland: { ...e, bag }, nacht: { ...state.nacht, bumped: (state.nacht.bumped || 0) + 1 } }, drops };
}

/** Every night gets harder: more and faster ghosts, the bear more often. */
export function nightRules(nights, config) {
  const N = config.nacht, D = config.moeilijker;
  const n = Math.max(0, nights);
  return {
    ghostsMax: Math.min(D.ghostsCap, N.ghostsMax + Math.floor(n / D.ghostsEveryNights)),
    ghostSpeed: N.ghostSpeed * Math.min(D.speedCap, 1 + D.speedPerNight * n),
    ghostEveryMs: Math.max(D.ghostEveryMinMs, N.ghostEveryMs - n * D.ghostEveryStepMs),
    bearEvery: n >= D.bearOftenFrom ? D.bearEveryLater : N.bearEvery,
    deer: n + 1 >= config.deer.fromNight,
  };
}
