// economy.js — pure, deterministic game economy. No DOM, no Date.now(), no side effects.
// Every function takes (state, config, ...) and returns a NEW state; nothing is mutated.
// The game, the unit tests and the balance simulator all share this exact logic.
import { createEiland } from './eiland.js';
import { createNacht } from './nacht.js';
import { createCampagne } from './campagne.js';

export const THIN_SPACE = ' '; // narrow no-break space: thin, and '2 000' never breaks over two lines

/** Fresh state for a new player. `now` is a timestamp in ms. */
export function createState(config, now) {
  const makers = {};
  for (const m of config.makers) makers[m.id] = 0; // level 0 = not owned
  return {
    version: config.saveVersion,
    createdAt: now,
    lastTick: now,
    name: '',
    color: config.colors[0].id,
    wallet: 0,               // may hold fractions internally; displayed floored
    earnedWork: 0,
    earnedPassive: 0,        // includes coins earned while away
    earnedOffline: 0,        // subset of earnedPassive earned during absences (for PAPA)
    spentFun: 0,
    spentMakers: 0,
    spentFood: 0,
    makers,
    fun: {},                 // id -> true when owned
    equipped: { hat: null, skin: null, vehicle: null, paint: null },
    hidden: {},              // id -> true when a garden item or pet is switched off
    foodTimerMs: 0,
    petHungry: false,
    carsWashed: 0,
    work: { sessionStart: null, log: [] },
    bestWorkRate: 0,         // best coins per minute over a trailing 60 s WERK window
    milestones: [],          // achieved milestone ids, in order
    playTimeMs: 0,
    flags: {},
    settings: { voice: true, sound: true, music: true, relayUrl: '' },
    eiland: createEiland(config),
    nacht: createNacht(),
    bank: createBank(now),
    campagne: createCampagne(),
  };
}

/** The savings bank (V6.4): saldo in the pot, the day it last grew, the interest earned so far. */
export function createBank(now = 0) {
  return { saldo: 0, lastGrowDay: dayIndex(now), earned: 0 };
}
export function dayIndex(now) {
  return Math.floor(now / 86400000);
}
/** Every calendar day that passed, the pot grows by the rate (compounded), capped. Returns { state, growth }. */
export function bankGrow(state, config, now) {
  const b = state.bank || createBank(now);
  const today = dayIndex(now);
  const days = Math.max(0, today - (b.lastGrowDay ?? today));
  if (days === 0 || b.saldo <= 0) return { state: { ...state, bank: { ...b, lastGrowDay: today } }, growth: 0 };
  const grown = Math.min(config.bank.max, b.saldo * Math.pow(1 + config.bank.ratePerDay, Math.min(days, 365)));
  const growth = Math.floor(grown - b.saldo);
  return { state: { ...state, bank: { saldo: b.saldo + growth, lastGrowDay: today, earned: (b.earned || 0) + growth }, earnedPassive: state.earnedPassive + growth }, growth };
}
/** Put coins in the pot (at most what is in the wallet, whole coins). Returns { ok, state, n }. */
export function bankDeposit(state, config, n) {
  const b = state.bank || createBank(0);
  const amount = Math.min(Math.floor(n), Math.floor(state.wallet), Math.max(0, config.bank.max - b.saldo));
  if (amount <= 0) return { ok: false, state, n: 0 };
  return { ok: true, state: { ...state, wallet: state.wallet - amount, bank: { ...b, saldo: b.saldo + amount } }, n: amount };
}
/** Take everything out of the pot. Returns { ok, state, n }. */
export function bankWithdraw(state) {
  const b = state.bank || createBank(0);
  if (b.saldo <= 0) return { ok: false, state, n: 0 };
  return { ok: true, state: { ...state, wallet: state.wallet + b.saldo, bank: { ...b, saldo: 0 } }, n: b.saldo };
}

// ---------- helpers ----------

export function makerById(config, id) {
  return config.makers.find((m) => m.id === id) || null;
}

export function funById(config, id) {
  return config.fun.find((f) => f.id === id) || null;
}

export function makerLevel(state, id) {
  return state.makers[id] || 0;
}

export function ownedMakerCount(state, config) {
  return config.makers.reduce((n, m) => n + (makerLevel(state, m.id) > 0 ? 1 : 0), 0);
}

/** Income per minute of one maker at a given level (0 when not owned). */
export function makerIncome(maker, level) {
  if (level <= 0) return 0;
  return maker.income[Math.min(level, maker.income.length) - 1];
}

/** Total passive income per minute of all owned makers. */
export function passivePerMinute(state, config) {
  let sum = 0;
  for (const m of config.makers) sum += makerIncome(m, makerLevel(state, m.id));
  return sum;
}

/** Price to go from `level` to `level + 1` (level ≥ 1): base × 2^level → 40, 80, 160, 320 for a base of 20. */
export function upgradePrice(maker, level) {
  return maker.price * Math.pow(2, level);
}

export function totalEarned(state) {
  return state.earnedWork + state.earnedPassive;
}

/** Makers unlock in order: the first is always open, the others when total earned reaches their price. */
export function isUnlocked(state, config, id) {
  const idx = config.makers.findIndex((m) => m.id === id);
  if (idx <= 0) return idx === 0;
  return totalEarned(state) >= config.makers[idx].price;
}

/** The next coin-maker to save for (cheapest not-yet-owned), with how many coins are still missing. */
export function nextMakerTarget(state, config) {
  for (const m of config.makers) {
    if (makerLevel(state, m.id) === 0) {
      return { maker: m, missing: Math.max(0, Math.ceil(m.price - state.wallet)), unlocked: isUnlocked(state, config, m.id) };
    }
  }
  return null;
}

export function petCount(state, config) {
  return config.fun.reduce((n, f) => n + (f.kind === 'pet' && state.fun[f.id] ? 1 : 0), 0);
}

export function ownedFunIds(state, config) {
  return config.fun.filter((f) => state.fun[f.id]).map((f) => f.id);
}

// ---------- time ----------

/**
 * Advance the economy from state.lastTick to `now`.
 * Elapsed time is capped at config.offlineCapMs (4 h per absence). An absence of at least
 * config.offlinePopupMinMs (60 s) is reported as `offline: true` so the UI can show the popup.
 * Pet food is paid automatically when possible; the wallet never goes negative.
 */
export function advance(state, config, now) {
  const rawElapsedMs = Math.max(0, now - state.lastTick);
  const elapsedMs = Math.min(rawElapsedMs, config.offlineCapMs);
  const offline = rawElapsedMs >= config.offlinePopupMinMs;

  const perMin = passivePerMinute(state, config);
  const earned = (perMin * elapsedMs) / 60000;
  let wallet = state.wallet + earned;

  let foodTimerMs = state.foodTimerMs;
  let petHungry = state.petHungry;
  let spentFood = state.spentFood;
  let foodPaid = 0;
  const pets = petCount(state, config);
  if (pets > 0) {
    const cost = config.pet.foodCost * pets;
    foodTimerMs += elapsedMs;
    while (foodTimerMs >= config.pet.foodIntervalMs) {
      foodTimerMs -= config.pet.foodIntervalMs;
      if (wallet >= cost) {
        wallet -= cost;
        spentFood += cost;
        foodPaid += cost;
        petHungry = false;
      } else {
        petHungry = true;
      }
    }
    if (petHungry && wallet >= cost) {
      wallet -= cost;
      spentFood += cost;
      foodPaid += cost;
      petHungry = false;
    }
  } else {
    foodTimerMs = 0;
    petHungry = false;
  }

  const next = {
    ...state,
    wallet,
    earnedPassive: state.earnedPassive + earned,
    earnedOffline: state.earnedOffline + (offline ? earned : 0),
    spentFood,
    foodTimerMs,
    petHungry,
    lastTick: now,
    playTimeMs: state.playTimeMs + (offline ? 0 : rawElapsedMs),
  };
  return { state: next, elapsedMs, rawElapsedMs, earned, foodPaid, offline };
}

// ---------- WERK ----------

export function startWork(state, now) {
  return { ...state, work: { sessionStart: now, log: [] } };
}

export function endWork(state) {
  return { ...state, work: { sessionStart: null, log: [] } };
}

/** The most coins per minute WERK can ever pay: one car every minCycleMs. */
export function workCeiling(config) {
  return (config.work.coinsPerCar * 60000) / config.work.minCycleMs;
}

/**
 * One car washed: +coinsPerCar. Also updates the work rate:
 * best coins per minute over any trailing 60 s window of a WERK session — literally the coins
 * earned in the last 60 s (no extrapolation, so a quick burst never counts as a full minute of work),
 * capped at the pace ceiling.
 */
export function washCar(state, config, now) {
  const coins = config.work.coinsPerCar;
  const sessionStart = state.work.sessionStart == null ? now : state.work.sessionStart;
  const log = state.work.log.filter(([t]) => now - t < config.work.windowMs).concat([[now, coins]]);
  const windowSum = log.reduce((s, [, c]) => s + c, 0);
  const rate = Math.min(workCeiling(config), windowSum * (60000 / config.work.windowMs));
  return {
    ...state,
    wallet: state.wallet + coins,
    earnedWork: state.earnedWork + coins,
    carsWashed: state.carsWashed + 1,
    work: { sessionStart, log },
    bestWorkRate: Math.max(state.bestWorkRate, rate),
  };
}

// ---------- WINKEL ----------

function missing(state, price) {
  return Math.max(0, Math.ceil(price - state.wallet));
}

/** Buy an unowned coin-maker. */
export function buyMaker(state, config, id) {
  const maker = makerById(config, id);
  if (!maker) return { ok: false, state, reason: 'unknown' };
  if (makerLevel(state, id) > 0) return { ok: false, state, reason: 'owned' };
  if (!isUnlocked(state, config, id)) return { ok: false, state, reason: 'locked', missing: missing(state, maker.price) };
  if (state.wallet < maker.price) return { ok: false, state, reason: 'coins', missing: missing(state, maker.price) };
  return {
    ok: true,
    state: {
      ...state,
      wallet: state.wallet - maker.price,
      spentMakers: state.spentMakers + maker.price,
      makers: { ...state.makers, [id]: 1 },
    },
  };
}

/** Upgrade an owned coin-maker by one level. */
export function upgradeMaker(state, config, id) {
  const maker = makerById(config, id);
  if (!maker) return { ok: false, state, reason: 'unknown' };
  const level = makerLevel(state, id);
  if (level === 0) return { ok: false, state, reason: 'not-owned' };
  if (level >= config.maxLevel) return { ok: false, state, reason: 'max' };
  const price = upgradePrice(maker, level);
  if (state.wallet < price) return { ok: false, state, reason: 'coins', missing: missing(state, price) };
  return {
    ok: true,
    state: {
      ...state,
      wallet: state.wallet - price,
      spentMakers: state.spentMakers + price,
      makers: { ...state.makers, [id]: level + 1 },
    },
    price,
  };
}

const EXCLUSIVE_KINDS = ['hat', 'skin', 'vehicle', 'paint'];

/** Buy a LEUK item. Exclusive kinds (hat, skin, vehicle, paint) are equipped right away. */
export function buyFun(state, config, id) {
  const item = funById(config, id);
  if (!item) return { ok: false, state, reason: 'unknown' };
  if (state.fun[id]) return { ok: false, state, reason: 'owned' };
  if (state.wallet < item.price) return { ok: false, state, reason: 'coins', missing: missing(state, item.price) };
  let next = {
    ...state,
    wallet: state.wallet - item.price,
    spentFun: state.spentFun + item.price,
    fun: { ...state.fun, [id]: true },
  };
  if (EXCLUSIVE_KINDS.includes(item.kind)) next = { ...next, equipped: { ...next.equipped, [item.kind]: id } };
  return { ok: true, state: next, item };
}

/** Equip / unequip (exclusive kinds) or show / hide (garden, pet) an owned item. */
export function toggleFun(state, config, id) {
  const item = funById(config, id);
  if (!item || !state.fun[id]) return state;
  if (EXCLUSIVE_KINDS.includes(item.kind)) {
    const current = state.equipped[item.kind];
    return { ...state, equipped: { ...state.equipped, [item.kind]: current === id ? null : id } };
  }
  if (item.kind === 'garden' || item.kind === 'pet') {
    const hidden = { ...state.hidden };
    if (hidden[id]) delete hidden[id];
    else hidden[id] = true;
    return { ...state, hidden };
  }
  return state;
}

/** Is an owned item currently active (equipped or shown)? */
export function isFunActive(state, config, id) {
  const item = funById(config, id);
  if (!item || !state.fun[id]) return false;
  if (EXCLUSIVE_KINDS.includes(item.kind)) return state.equipped[item.kind] === id;
  if (item.kind === 'garden' || item.kind === 'pet') return !state.hidden[id];
  return true;
}

// ---------- milestones ----------

function milestoneReached(state, config, m) {
  switch (m.kind) {
    case 'makers': return ownedMakerCount(state, config) >= m.value;
    // "your money works harder than you" needs a real work record first (at least the "tired" number of cars),
    // otherwise a child who barely worked would get the sticker together with the first coin-maker
    case 'passive-beats-work': return state.bestWorkRate > 0 && state.carsWashed >= config.work.tiredAfterCars && passivePerMinute(state, config) > state.bestWorkRate;
    case 'earned': return totalEarned(state) >= m.value;
    case 'all-makers': return ownedMakerCount(state, config) === config.makers.length;
    case 'level': return config.makers.some((mk) => makerLevel(state, mk.id) >= m.value);
    // the island (PLAN-V4)
    case 'nights': return (state.nacht?.nights || 0) >= m.value;
    case 'island-sold': return (state.eiland?.earned || 0) >= m.value;
    case 'quests': return (state.eiland?.questsDone || 0) >= m.value;
    case 'campagne': return (state.campagne?.munten || 0) >= m.value;   // V6.6: golden coins found
    default: return false;
  }
}

/** Returns { state, unlocked: [milestone ids newly reached] }. */
export function checkMilestones(state, config) {
  let unlocked = [];
  for (const m of config.milestones) {
    if (!state.milestones.includes(m.id) && milestoneReached(state, config, m)) unlocked.push(m.id);
  }
  // the first coin-maker gets its own moment: "passive beats work" waits for the next check
  if (unlocked.includes('eerste-geldmaker') && unlocked.includes('geld-werkt')) unlocked = unlocked.filter((id) => id !== 'geld-werkt');
  if (unlocked.length === 0) return { state, unlocked };
  return { state: { ...state, milestones: state.milestones.concat(unlocked) }, unlocked };
}

// ---------- misc ----------

export function setSetting(state, key, value) {
  return { ...state, settings: { ...state.settings, [key]: value } };
}

export function setFlag(state, key, value = true) {
  return { ...state, flags: { ...state.flags, [key]: value } };
}

export function setProfile(state, { name, color }) {
  return { ...state, name: name == null ? state.name : name, color: color == null ? state.color : color };
}

/** Whole number with a thin space as thousands separator: 12 345. Never abbreviates. */
export function formatCoins(n) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  const s = String(v);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const fromEnd = s.length - i;
    out += s[i];
    if (fromEnd > 1 && (fromEnd - 1) % 3 === 0) out += THIN_SPACE;
  }
  return out;
}

/** Numbers for the PAPA screen. */
export function stats(state, config) {
  return {
    earnedWork: Math.floor(state.earnedWork),
    earnedPassive: Math.floor(state.earnedPassive),
    earnedOffline: Math.floor(state.earnedOffline),
    spentFun: state.spentFun,
    spentMakers: state.spentMakers,
    spentFood: state.spentFood,
    perMinute: passivePerMinute(state, config),
    bestWorkRate: Math.round(state.bestWorkRate),
    playTimeMs: state.playTimeMs,
    carsWashed: state.carsWashed,
    makersOwned: ownedMakerCount(state, config),
    nights: state.nacht ? state.nacht.nights : 0,
    stolen: state.nacht ? state.nacht.stolen : 0,
    islandEarned: state.eiland ? state.eiland.earned : 0,
    questsDone: state.eiland ? state.eiland.questsDone : 0,
    tools: state.eiland ? Object.keys(state.eiland.tools).length : 0,
    fainted: state.nacht ? state.nacht.fainted || 0 : 0,
    frozen: state.nacht ? state.nacht.frozen || 0 : 0,
    hoofdstuk: state.campagne ? state.campagne.hoofdstuk || 0 : 0,
    munten: state.campagne ? state.campagne.munten || 0 : 0,
    berenVerloren: state.campagne ? state.campagne.pogingen || 0 : 0,
    bankSaldo: state.bank ? Math.floor(state.bank.saldo || 0) : 0,
    bankEarned: state.bank ? Math.floor(state.bank.earned || 0) : 0,
    bumped: state.nacht ? state.nacht.bumped || 0 : 0,
    honger: state.eiland ? Math.round(state.eiland.honger ?? 100) : 100,
    funOwned: ownedFunIds(state, config).length,
    milestones: state.milestones.length,
  };
}
