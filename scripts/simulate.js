// simulate.js — economy balance simulator. Proves the lesson with the production economy code.
// Two strategies over a 20-minute session of a realistic child (≈ 15 coins/min from WERK):
//   Investor: minutes 0–10 buy the unlocked coin-maker/upgrade with the shortest payback (saving for it),
//             minutes 10–20 buy the cheapest not-yet-owned LEUK item whenever affordable.
//   Spender:  all 20 minutes buy the cheapest not-yet-owned LEUK item whenever affordable.
// Usage: node scripts/simulate.js   (also imported by tests/unit/balance.test.js)
import { pathToFileURL } from 'node:url';
import { CONFIG } from '../docs/js/config.js';
import * as E from '../docs/js/economy.js';

/** Shortest-payback investment among unlocked options (payback = price ÷ income gain per minute). */
export function bestInvestment(state, config) {
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
    if (cand && (!best || cand.payback < best.payback)) best = cand;
  }
  return best;
}

export function cheapestUnownedFun(state, config) {
  let best = null;
  for (const f of config.fun) {
    if (state.fun[f.id]) continue;
    if (!best || f.price < best.price) best = f;
  }
  return best;
}

function investStep(state, config, log, minute) {
  let best = bestInvestment(state, config);
  while (best && state.wallet >= best.price) {
    const r = best.type === 'buy' ? E.buyMaker(state, config, best.id) : E.upgradeMaker(state, config, best.id);
    if (!r.ok) break;
    state = r.state;
    log.push({ minute: +minute.toFixed(2), action: `${best.type} ${best.id}`, price: best.price });
    best = bestInvestment(state, config);
  }
  return state;
}

function funStep(state, config, log, minute) {
  let item = cheapestUnownedFun(state, config);
  while (item && state.wallet >= item.price) {
    const r = E.buyFun(state, config, item.id);
    if (!r.ok) break;
    state = r.state;
    log.push({ minute: +minute.toFixed(2), action: `fun ${item.id}`, price: item.price });
    item = cheapestUnownedFun(state, config);
  }
  return state;
}

/**
 * @param {object} opts
 * @param {'investor'|'spender'} opts.strategy
 * @param {number} [opts.minutes=20]
 * @param {number} [opts.workRate=15]   coins per minute from WERK (2 coins per car → one car every 8 s at 15/min)
 * @param {number} [opts.investMinutes=10]
 * @param {object} [opts.config]
 */
export function simulate({ strategy, minutes = 20, workRate = 15, investMinutes = 10, config = CONFIG }) {
  const stepMs = 1000;
  const carEveryMs = Math.round((config.work.coinsPerCar / workRate) * 60000);
  let state = E.createState(config, 0);
  state = E.startWork(state, 0);
  const log = [];
  let overtakeMin = null;
  let minWallet = Infinity;
  let stuck = false;
  let lastCars = 0;
  let nextCarAt = carEveryMs;
  const timeline = [];

  for (let t = stepMs; t <= minutes * 60000; t += stepMs) {
    state = E.advance(state, config, t).state;
    if (t >= nextCarAt) {
      state = E.washCar(state, config, t);
      nextCarAt += carEveryMs;
    }
    const minute = t / 60000;
    if (strategy === 'investor' && minute < investMinutes) state = investStep(state, config, log, minute);
    else state = funStep(state, config, log, minute);

    const ms = E.checkMilestones(state, config);
    state = ms.state;
    if (overtakeMin == null && ms.unlocked.includes('geld-werkt')) overtakeMin = minute;
    if (state.wallet < minWallet) minWallet = state.wallet;
    if (state.wallet < 0) stuck = true;
    if (t % 60000 === 0) {
      if (state.carsWashed === lastCars) stuck = true; // WERK must always progress
      lastCars = state.carsWashed;
      timeline.push({
        minute,
        wallet: Math.floor(state.wallet),
        passivePerMin: E.passivePerMinute(state, config),
        funItems: E.ownedFunIds(state, config).length,
        spentFun: state.spentFun,
      });
    }
  }
  return {
    strategy,
    minutes,
    workRate,
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
}
