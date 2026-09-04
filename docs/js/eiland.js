// eiland.js — the island's economy, pure (no DOM, no Three): the backpack, selling at the campfire, buying tools
// with the shared wallet, and Muntje's daily quests. Numbers live in config.js (config.eiland), texts in i18n.js.
// State slice: state.eiland = { bag, tools, quest, questN, questsDone, collected, sold, earned }

export function createEiland(config) {
  const bag = {};
  for (const id of Object.keys(config.eiland.items)) bag[id] = 0;
  return { bag, tools: {}, quest: 0, questN: 0, questsDone: 0, collected: { ...bag }, sold: 0, earned: 0, chestDay: '' };
}

export function bagCount(e) {
  return Object.values(e.bag).reduce((n, v) => n + v, 0);
}
export function bagFull(e, config) {
  return bagCount(e) >= config.eiland.bagMax;
}

/** Put `n` of an item in the backpack (as many as fit). Returns { eiland, added, questDone } — questDone = the finished quest index or -1. */
export function collect(e, config, item, n = 1) {
  if (!(item in e.bag)) return { eiland: e, added: 0, questDone: -1 };
  const room = Math.max(0, config.eiland.bagMax - bagCount(e));
  const added = Math.min(room, n);
  if (added <= 0) return { eiland: e, added: 0, questDone: -1 };
  const next = { ...e, bag: { ...e.bag, [item]: e.bag[item] + added }, collected: { ...e.collected, [item]: (e.collected[item] || 0) + added } };
  let questDone = -1;
  const q = config.eiland.quests[next.quest];
  if (q && q.item === item) {
    next.questN = Math.min(q.n, next.questN + added);
    if (next.questN >= q.n) questDone = next.quest;
  }
  return { eiland: next, added, questDone };
}

/** Coins for everything in the bag. */
export function bagValue(e, config) {
  let v = 0;
  for (const [id, n] of Object.entries(e.bag)) v += n * (config.eiland.items[id]?.price || 0);
  return v;
}

/** Sell the whole bag at the campfire: returns { state, coins }. Coins count as earned by working (the lesson stays: geldmakers are passive, this is active). */
export function sellAll(state, config) {
  const e = state.eiland;
  const coins = bagValue(e, config);
  if (coins <= 0) return { state, coins: 0 };
  const bag = {};
  for (const id of Object.keys(e.bag)) bag[id] = 0;
  return {
    state: { ...state, wallet: state.wallet + coins, earnedWork: state.earnedWork + coins, eiland: { ...e, bag, sold: e.sold + coins, earned: e.earned + coins } },
    coins,
  };
}

export function toolById(config, id) {
  return config.eiland.tools.find((t) => t.id === id) || null;
}

/** Buy a tool with the shared wallet. { ok, state, reason: 'owned' | 'coins', missing } */
export function buyTool(state, config, id) {
  const tool = toolById(config, id);
  if (!tool) return { ok: false, state, reason: 'unknown' };
  if (state.eiland.tools[id]) return { ok: false, state, reason: 'owned' };
  if (state.wallet < tool.price) return { ok: false, state, reason: 'coins', missing: Math.ceil(tool.price - state.wallet) };
  return {
    ok: true,
    state: { ...state, wallet: state.wallet - tool.price, spentFun: state.spentFun + tool.price, eiland: { ...state.eiland, tools: { ...state.eiland.tools, [id]: true } } },
  };
}

/** Wood per successful chop and taps needed per chop: the axe is the first "investment that pays back" on the island. */
export function chopRule(e, config) {
  return e.tools.bijl ? config.eiland.chop.withAxe : config.eiland.chop.hands;
}

/** Finish the current quest: reward coins, move on to the next (wrapping round). Returns { state, reward, quest }. */
export function completeQuest(state, config) {
  const e = state.eiland;
  const q = config.eiland.quests[e.quest];
  if (!q || e.questN < q.n) return { state, reward: 0, quest: null };
  const reward = q.n * (config.eiland.items[q.item]?.price || 1) * config.eiland.questBonus;
  const nextIdx = (e.quest + 1) % config.eiland.quests.length;
  return {
    state: { ...state, wallet: state.wallet + reward, earnedWork: state.earnedWork + reward, eiland: { ...e, quest: nextIdx, questN: 0, questsDone: e.questsDone + 1, earned: e.earned + reward } },
    reward,
    quest: q,
  };
}

export function currentQuest(e, config) {
  const q = config.eiland.quests[e.quest];
  return q ? { ...q, index: e.quest, have: e.questN } : null;
}

/** The chest in the cave fills once a day (local calendar day, e.g. '2026-09-05'). Returns { ok, state, coins }. */
export function chestOpenedToday(e, today) {
  return e.chestDay === today;
}
export function openChest(state, config, today) {
  const e = state.eiland;
  if (chestOpenedToday(e, today)) return { ok: false, state, coins: 0 };
  const coins = config.eiland.chest.coins;
  return { ok: true, coins, state: { ...state, wallet: state.wallet + coins, earnedWork: state.earnedWork + coins, eiland: { ...e, chestDay: today, earned: e.earned + coins } } };
}
export function todayKey(now = Date.now()) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Keep a loaded/decoded slice sane. */
export function normalizeEiland(data, config) {
  const fresh = createEiland(config);
  if (!data || typeof data !== 'object') return fresh;
  const num = (v, max = 1e6) => Math.min(max, Math.max(0, Math.floor(Number(v) || 0)));
  const bag = { ...fresh.bag };
  if (data.bag && typeof data.bag === 'object') for (const id of Object.keys(bag)) bag[id] = num(data.bag[id], config.eiland.bagMax);
  // never more than fits
  let total = Object.values(bag).reduce((n, v) => n + v, 0);
  for (const id of Object.keys(bag)) while (total > config.eiland.bagMax && bag[id] > 0) { bag[id]--; total--; }
  const tools = {};
  if (data.tools && typeof data.tools === 'object') for (const t of config.eiland.tools) if (data.tools[t.id]) tools[t.id] = true;
  const collected = { ...fresh.collected };
  if (data.collected && typeof data.collected === 'object') for (const id of Object.keys(collected)) collected[id] = num(data.collected[id]);
  const quest = num(data.quest) % Math.max(1, config.eiland.quests.length);
  const q = config.eiland.quests[quest];
  const chestDay = typeof data.chestDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.chestDay) ? data.chestDay : '';
  return { bag, tools, quest, questN: Math.min(q ? q.n : 0, num(data.questN)), questsDone: num(data.questsDone), collected, sold: num(data.sold), earned: num(data.earned), chestDay };
}
