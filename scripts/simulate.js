// simulate.js — economy balance simulator. Proves the lesson with the production economy code.
// Two strategies over a 20-minute session of a realistic child (≈ 15 coins/min from WERK):
//   Investor: minutes 0–10 buy the unlocked coin-maker/upgrade with the shortest payback,
//             minutes 10–20 buy the cheapest not-yet-owned LEUK item whenever affordable.
//   Spender:  all 20 minutes buy the cheapest not-yet-owned LEUK item whenever affordable.
// Options let the tests probe both readings of "shortest payback" (save for the best unlocked option, or the
// best among affordable ones), bursty work pacing, and pet ownership (food costs).
// Usage: node scripts/simulate.js   (also imported by tests/unit/balance.test.js)
import { pathToFileURL } from 'node:url';
import { CONFIG } from '../docs/js/config.js';
import * as E from '../docs/js/economy.js';

/**
 * Shortest-payback investment (payback = price ÷ income gain per minute).
 * policy 'best': among all unlocked options (the investor saves for it).
 * policy 'affordable': among unlocked options the wallet can pay for right now.
 */
export function bestInvestment(state, config, policy = 'best') {
  let best = null;
  for (const m of config.makers) {
    const level = E.makerLevel(state, m.id);
    let cand = null;
    if (level === 0) {
      if (!E.isUnlocked(state, config, m.id)) continue;
      cand = { type: 'buy', id: m.id, price: m.price, payback: m.price / m.income[0] };
    } else if (level < config.maxLevel) {
      const price = E.upgradePrice(m, level);
      const gain = m.income[level] - m.income[level - 1];
      cand = { type: 'upgrade', id: m.id, price, payback: price / gain };
    }
    if (!cand) continue;
    if (policy === 'affordable' && state.wallet < cand.price) continue;
    if (!best || cand.payback < best.payback) best = cand;
  }
  return best;
}

export function cheapestUnownedFun(state, config, { petFirst = false } = {}) {
  let best = null;
  for (const f of config.fun) {
    if (state.fun[f.id]) continue;
    if (!best || f.price < best.price) best = f;
  }
  if (petFirst) {
    // save for the cheapest pet first (so food costs are part of the run), then cheapest-first as usual
    const pet = config.fun.filter((f) => f.kind === 'pet' && !state.fun[f.id]).sort((a, b) => a.price - b.price)[0];
    if (pet) return pet;
  }
  return best;
}

function investStep(state, config, log, minute, policy) {
  let best = bestInvestment(state, config, policy);
  while (best && state.wallet >= best.price) {
    const r = best.type === 'buy' ? E.buyMaker(state, config, best.id) : E.upgradeMaker(state, config, best.id);
    if (!r.ok) break;
    state = r.state;
    log.push({ minute: +minute.toFixed(2), action: `${best.type} ${best.id}`, price: best.price });
    best = bestInvestment(state, config, policy);
  }
  return state;
}

function funStep(state, config, log, minute, opts) {
  let item = cheapestUnownedFun(state, config, opts);
  while (item && state.wallet >= item.price) {
    const r = E.buyFun(state, config, item.id);
    if (!r.ok) break;
    state = r.state;
    log.push({ minute: +minute.toFixed(2), action: `fun ${item.id}`, price: item.price });
    item = cheapestUnownedFun(state, config, opts);
  }
  return state;
}

/** Times (ms) at which cars get washed. 'even': one car every 60000·coinsPerCar/workRate ms.
 *  'burst': bursts of `burstSize` cars at the minCycleMs floor, then a pause so the average stays workRate. */
export function carTimes({ minutes, workRate, config, pacing = 'even', burstSize = 8 }) {
  const end = minutes * 60000;
  const times = [];
  if (pacing === 'burst') {
    const period = (burstSize * config.work.coinsPerCar * 60000) / workRate;
    for (let t0 = 0; t0 < end; t0 += period) {
      for (let i = 0; i < burstSize; i++) {
        const t = t0 + 2500 + i * config.work.minCycleMs;
        if (t <= end) times.push(t);
      }
    }
  } else {
    const every = (config.work.coinsPerCar * 60000) / workRate;
    for (let t = every; t <= end; t += every) times.push(t);
  }
  return times;
}

/**
 * @param {object} opts
 * @param {'investor'|'spender'} opts.strategy
 * @param {number} [opts.minutes=20]
 * @param {number} [opts.workRate=15]        average coins per minute from WERK
 * @param {number} [opts.investMinutes=10]
 * @param {'best'|'affordable'} [opts.policy='best']
 * @param {'even'|'burst'} [opts.pacing='even']
 * @param {boolean} [opts.petFirst=false]    buy the cheapest pet as soon as affordable (exercises food costs)
 * @param {object} [opts.config]
 */
export function simulate({ strategy, minutes = 20, workRate = 15, investMinutes = 10, policy = 'best', pacing = 'even', petFirst = false, config = CONFIG }) {
  const stepMs = 1000;
  const times = carTimes({ minutes, workRate, config, pacing });
  let nextCar = 0;
  let state = E.createState(config, 0);
  state = E.startWork(state, 0);
  const log = [];
  let overtakeMin = null;
  let minWallet = Infinity;
  let stuck = false;
  let lastCars = 0;
  const timeline = [];

  for (let t = stepMs; t <= minutes * 60000; t += stepMs) {
    state = E.advance(state, config, t).state;
    while (nextCar < times.length && times[nextCar] <= t) {
      state = E.washCar(state, config, times[nextCar]);
      nextCar++;
    }
    const minute = t / 60000;
    if (strategy === 'investor' && minute < investMinutes) state = investStep(state, config, log, minute, policy);
    else state = funStep(state, config, log, minute, { petFirst });

    const ms = E.checkMilestones(state, config);
    state = ms.state;
    if (overtakeMin == null && ms.unlocked.includes('geld-werkt')) overtakeMin = minute;
    if (state.wallet < minWallet) minWallet = state.wallet;
    if (state.wallet < 0) stuck = true;
    if (t % 60000 === 0) {
      if (state.carsWashed === lastCars) stuck = true; // WERK must always progress
      lastCars = state.carsWashed;
      timeline.push({ minute, wallet: Math.floor(state.wallet), passivePerMin: E.passivePerMinute(state, config), funItems: E.ownedFunIds(state, config).length, spentFun: state.spentFun });
    }
  }
  return {
    strategy,
    minutes,
    workRate,
    policy,
    pacing,
    earned: Math.floor(E.totalEarned(state)),
    earnedWork: Math.floor(state.earnedWork),
    earnedPassive: Math.floor(state.earnedPassive),
    passivePerMin: E.passivePerMinute(state, config),
    bestWorkRate: Math.round(state.bestWorkRate),
    spentFun: state.spentFun,
    spentMakers: state.spentMakers,
    spentFood: state.spentFood,
    funItems: E.ownedFunIds(state, config).length,
    makersOwned: E.ownedMakerCount(state, config),
    makerLevels: config.makers.map((m) => `${m.id}:${state.makers[m.id]}`).join(' '),
    overtakeMin,
    minWallet: Math.floor(minWallet),
    stuck,
    carsWashed: state.carsWashed,
    wallet: Math.floor(state.wallet),
    log,
    timeline,
  };
}

export function runBoth(opts = {}) {
  return {
    investor: simulate({ ...opts, strategy: 'investor' }),
    spender: simulate({ ...opts, strategy: 'spender' }),
  };
}

export function ratios({ investor, spender }) {
  return {
    funCoins: spender.spentFun > 0 ? investor.spentFun / spender.spentFun : Infinity,
    funItems: spender.funItems > 0 ? investor.funItems / spender.funItems : Infinity,
    overtakeMin: investor.overtakeMin,
  };
}

function fmtMin(m) {
  return m == null ? '—' : `${m.toFixed(1)} min`;
}

/** Markdown table (Dutch, used in RAPPORT.md). */
export function table(results) {
  const { investor: i, spender: s } = results;
  const r = ratios(results);
  const rows = [
    ['', 'Investeerder', 'Uitgever'],
    ['Munten verdiend (totaal)', i.earned, s.earned],
    ['… waarvan door WERK', i.earnedWork, s.earnedWork],
    ['… waarvan door geldmakers', i.earnedPassive, s.earnedPassive],
    ['Passief inkomen aan het eind (per minuut)', i.passivePerMin, s.passivePerMin],
    ['Beste werktempo (per minuut)', i.bestWorkRate, s.bestWorkRate],
    ['Geldmakers (levels)', i.makerLevels, s.makerLevels],
    ['Geïnvesteerd in geldmakers', i.spentMakers, s.spentMakers],
    ['Uitgegeven aan LEUK', i.spentFun, s.spentFun],
    ['Leuke spullen (verschillende)', i.funItems, s.funItems],
    ['Hondenvoer betaald', i.spentFood, s.spentFood],
    ['Passief > werk na', fmtMin(i.overtakeMin), fmtMin(s.overtakeMin)],
    ['Laagste saldo', i.minWallet, s.minWallet],
    ['Auto’s gewassen', i.carsWashed, s.carsWashed],
  ];
  const lines = rows.map((row, idx) => {
    const line = `| ${row.join(' | ')} |`;
    return idx === 0 ? `${line}\n|---|---:|---:|` : line;
  });
  lines.push('');
  lines.push(`Verhouding LEUK-munten: ${r.funCoins.toFixed(2)}× (eis ≥ 3×) · leuke spullen: ${r.funItems.toFixed(2)}× (eis ≥ 1,5×) · inhaalmoment: ${fmtMin(r.overtakeMin)} (eis ≤ 4 min)`);
  return lines.join('\n');
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const results = runBoth({ minutes: 20, workRate: 15 });
  console.log('Muntstad — balanssimulatie (20 minuten, kind verdient 15 munten/min met WERK)\n');
  console.log(table(results));
  console.log('\nAankopen investeerder:');
  for (const l of results.investor.log) console.log(`  ${l.minute.toFixed(1).padStart(5)} min  ${l.action} (${l.price})`);
  console.log('\nAankopen uitgever:');
  for (const l of results.spender.log) console.log(`  ${l.minute.toFixed(1).padStart(5)} min  ${l.action} (${l.price})`);
  console.log('\nVarianten:');
  for (const opts of [{ policy: 'affordable' }, { pacing: 'burst' }, { petFirst: true }, { workRate: 10 }, { workRate: 20 }]) {
    const r = ratios(runBoth({ minutes: 20, workRate: 15, ...opts }));
    console.log(`  ${JSON.stringify(opts).padEnd(26)} munten ${r.funCoins.toFixed(2)}× · spullen ${r.funItems.toFixed(2)}× · inhalen ${fmtMin(r.overtakeMin)}`);
  }
}
