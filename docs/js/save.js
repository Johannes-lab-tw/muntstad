// save.js — versioned localStorage save, migration chain, corruption-safe load, Bewaar-code export/import.
// Pure helpers take a `storage` object ({ getItem, setItem, removeItem }) so tests can pass a fake.
import { createState } from './economy.js';
import { normalizeEiland } from './eiland.js';
import { normalizeNacht } from './nacht.js';

const CODE_PREFIX = 'MS1';

export function storageKey(config) {
  return `${config.saveKey}.v${config.saveVersion}`;
}

export function serialize(state) {
  return JSON.stringify(state);
}

/** Migration chain from older save versions to the current one. Returns null when it cannot. */
export function migrate(raw, config, now) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  let data = raw;
  let version = Number.isInteger(data.version) ? data.version : 0;
  if (version > config.saveVersion) return null; // from a newer game: never guess
  if (version === 0) {
    // v0 prototype layout: { coins, makers: { id: level }, name } → v1
    const fresh = createState(config, now);
    data = {
      ...fresh,
      name: typeof data.name === 'string' ? data.name : '',
      wallet: Number(data.coins) || 0,
      earnedWork: Number(data.coins) || 0,
      makers: { ...fresh.makers, ...(data.makers && typeof data.makers === 'object' ? data.makers : {}) },
      version: 1,
    };
    version = 1;
  }
  return data;
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Fill defaults for missing keys, clamp numbers, drop unknown ids. Returns null when the shape is hopeless. */
export function normalize(data, config, now) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (typeof data.makers !== 'object' || data.makers === null) return null;
  if (!('wallet' in data)) return null;
  const fresh = createState(config, now);
  const makers = {};
  for (const m of config.makers) {
    const lvl = Math.floor(num(data.makers[m.id], 0));
    makers[m.id] = Math.min(config.maxLevel, Math.max(0, lvl));
  }
  const fun = {};
  if (data.fun && typeof data.fun === 'object') {
    for (const f of config.fun) if (data.fun[f.id]) fun[f.id] = true;
  }
  const equipped = { ...fresh.equipped };
  if (data.equipped && typeof data.equipped === 'object') {
    for (const k of Object.keys(equipped)) {
      const id = data.equipped[k];
      const item = typeof id === 'string' ? config.fun.find((f) => f.id === id) : null;
      equipped[k] = item && fun[id] && item.kind === k ? id : null;
    }
  }
  const hidden = {};
  if (data.hidden && typeof data.hidden === 'object') {
    for (const id of Object.keys(data.hidden)) if (fun[id] && data.hidden[id]) hidden[id] = true;
  }
  const milestones = Array.isArray(data.milestones)
    ? data.milestones.filter((id) => config.milestones.some((m) => m.id === id))
    : [];
  const colorOk = config.colors.some((c) => c.id === data.color);
  return {
    ...fresh,
    version: config.saveVersion,
    createdAt: num(data.createdAt, now),
    lastTick: num(data.lastTick, now),
    name: typeof data.name === 'string' ? data.name.slice(0, 20) : '',
    color: colorOk ? data.color : fresh.color,
    wallet: num(data.wallet),
    earnedWork: num(data.earnedWork),
    earnedPassive: num(data.earnedPassive),
    earnedOffline: num(data.earnedOffline),
    spentFun: num(data.spentFun),
    spentMakers: num(data.spentMakers),
    spentFood: num(data.spentFood),
    makers,
    fun,
    equipped,
    hidden,
    foodTimerMs: Math.min(num(data.foodTimerMs), config.pet.foodIntervalMs), // a corrupted timer can never loop for ages
    petHungry: !!data.petHungry,
    carsWashed: Math.floor(num(data.carsWashed)),
    work: { sessionStart: null, log: [] },
    bestWorkRate: num(data.bestWorkRate),
    milestones,
    playTimeMs: num(data.playTimeMs),
    flags: data.flags && typeof data.flags === 'object' ? { ...data.flags } : {},
    eiland: normalizeEiland(data.eiland, config),
    nacht: normalizeNacht(data.nacht),
    settings: {
      voice: data.settings && 'voice' in data.settings ? !!data.settings.voice : true,
      sound: data.settings && 'sound' in data.settings ? !!data.settings.sound : true,
      music: data.settings && 'music' in data.settings ? !!data.settings.music : true,
      relayUrl: data.settings && typeof data.settings.relayUrl === 'string' && /^wss?:\/\//.test(data.settings.relayUrl) ? data.settings.relayUrl.slice(0, 200) : '',
    },
  };
}

/** Parse a raw JSON string into a usable state. status: ok | migrated | reset. */
export function deserialize(json, config, now) {
  if (json == null || json === '') return { state: null, status: 'empty', message: 'no save' };
  let raw;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    return { state: null, status: 'reset', message: 'save is not valid JSON' };
  }
  const version = raw && Number.isInteger(raw.version) ? raw.version : 0;
  const migrated = migrate(raw, config, now);
  if (!migrated) return { state: null, status: 'reset', message: `save version ${version} cannot be migrated` };
  let state = null;
  try {
    state = normalize(migrated, config, now);
  } catch (e) {
    state = null;
  }
  if (!state) return { state: null, status: 'reset', message: 'save has an unknown shape' };
  return { state, status: version < config.saveVersion ? 'migrated' : 'ok', message: '' };
}

/** Load from storage: returns a usable state always (fresh state when nothing usable exists). */
export function load(storage, config, now) {
  let json = null;
  try {
    json = storage.getItem(storageKey(config));
    if (json == null) {
      // older key names (v0 prototype) → migrate
      for (let v = config.saveVersion - 1; v >= 0; v--) {
        const old = storage.getItem(`${config.saveKey}.v${v}`);
        if (old != null) { json = old; break; }
      }
    }
  } catch (e) {
    return { state: createState(config, now), status: 'new', message: 'storage unavailable' };
  }
  const result = deserialize(json, config, now);
  if (result.state) return result;
  return { state: createState(config, now), status: result.status === 'empty' ? 'new' : 'reset', message: result.message };
}

export function save(storage, state, config) {
  try {
    storage.setItem(storageKey(config), serialize(state));
    return true;
  } catch (e) {
    return false;
  }
}

export function clear(storage, config) {
  try {
    for (let v = 0; v <= config.saveVersion; v++) storage.removeItem(`${config.saveKey}.v${v}`);
  } catch (e) { /* ignore */ }
}

// ---------- Bewaar-code (short text code) ----------

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function bytesToB64(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = i + 1 < bytes.length ? bytes[i + 1] : 0, c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : '';
    out += i + 2 < bytes.length ? B64[n & 63] : '';
  }
  return out;
}

function b64ToBytes(str) {
  const out = [];
  let buffer = 0, bits = 0;
  for (const ch of str) {
    const v = B64.indexOf(ch);
    if (v < 0) return null;
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 255);
    }
  }
  return Uint8Array.from(out);
}

function checksum(bytes) {
  let sum = 7;
  for (const b of bytes) sum = (sum * 31 + b) % 1296;
  return sum.toString(36).padStart(2, '0');
}

/** Compact, typo-safe text code with the progress that matters. */
export function encodeCode(state, config) {
  const funIdx = config.fun.map((f, i) => (state.fun[f.id] ? i : -1)).filter((i) => i >= 0);
  const eq = ['hat', 'skin', 'vehicle', 'paint'].map((k) => config.fun.findIndex((f) => f.id === state.equipped[k]));
  const hiddenIdx = config.fun.map((f, i) => (state.hidden[f.id] ? i : -1)).filter((i) => i >= 0);
  const ms = state.milestones.map((id) => config.milestones.findIndex((m) => m.id === id)).filter((i) => i >= 0);
  const colorIdx = Math.max(0, config.colors.findIndex((c) => c.id === state.color));
  const payload = [
    1,
    state.name,
    colorIdx,
    Math.floor(state.wallet),
    Math.floor(state.earnedWork),
    Math.floor(state.earnedPassive),
    Math.floor(state.earnedOffline),
    state.spentFun,
    state.spentMakers,
    state.spentFood,
    config.makers.map((m) => state.makers[m.id] || 0),
    funIdx,
    eq,
    hiddenIdx,
    ms,
    state.carsWashed,
    Math.round(state.bestWorkRate),
    Math.round(state.playTimeMs / 1000),
    (state.settings.voice ? 1 : 0) | (state.settings.sound ? 2 : 0) | (state.settings.music ? 4 : 0),
    // the island (since PLAN-V4 R3): bag counts in config order, owned tools as indices, quest index + progress, sold, earned
    [Object.keys(config.eiland.items).map((id) => state.eiland.bag[id] || 0), config.eiland.tools.map((t, i) => (state.eiland.tools[t.id] ? i : -1)).filter((i) => i >= 0), state.eiland.quest, state.eiland.questN, state.eiland.questsDone, state.eiland.sold, state.eiland.earned, Math.round(state.eiland.honger ?? 100)],
    [Math.round(state.nacht.fire), state.nacht.nights, state.nacht.stolen, state.nacht.clockOffsetMs, state.nacht.fainted || 0, state.nacht.bumped || 0],
  ];
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return `${CODE_PREFIX}.${bytesToB64(bytes)}.${checksum(bytes)}`;
}

/** Restore a state from a Bewaar-code. Returns null for anything invalid. */
export function decodeCode(code, config, now) {
  if (typeof code !== 'string') return null;
  const clean = code.replace(/\s+/g, '');
  const parts = clean.split('.');
  if (parts.length !== 3 || parts[0] !== CODE_PREFIX) return null;
  const bytes = b64ToBytes(parts[1]);
  if (!bytes || checksum(bytes) !== parts[2].toLowerCase()) return null;
  let p;
  try {
    p = JSON.parse(new TextDecoder().decode(bytes));
  } catch (e) {
    return null;
  }
  if (!Array.isArray(p) || p[0] !== 1) return null;
  try {
    const fresh = createState(config, now);
    const list = (v) => (Array.isArray(v) ? v : []);
    const makers = {};
    config.makers.forEach((m, i) => { makers[m.id] = Math.min(config.maxLevel, Math.max(0, Number(list(p[10])[i]) || 0)); });
    const fun = {};
    for (const i of list(p[11])) if (config.fun[i]) fun[config.fun[i].id] = true;
    const equipped = { ...fresh.equipped };
    ['hat', 'skin', 'vehicle', 'paint'].forEach((k, i) => {
      const idx = list(p[12])[i];
      const item = config.fun[idx];
      equipped[k] = item && fun[item.id] && item.kind === k ? item.id : null;
    });
    const hidden = {};
    for (const i of list(p[13])) if (config.fun[i] && fun[config.fun[i].id]) hidden[config.fun[i].id] = true;
    const milestones = list(p[14]).map((i) => config.milestones[i]?.id).filter(Boolean);
    const bits = Number(p[18]) || 0;
    const ei = list(p[19]);
    const bag = {};
    Object.keys(config.eiland.items).forEach((id, i) => { bag[id] = Number(list(ei[0])[i]) || 0; });
    const tools = {};
    for (const i of list(ei[1])) if (config.eiland.tools[i]) tools[config.eiland.tools[i].id] = true;
    return normalize({
      ...fresh,
      name: typeof p[1] === 'string' ? p[1] : '',
      color: (config.colors[p[2]] || config.colors[0]).id,
      wallet: p[3], earnedWork: p[4], earnedPassive: p[5], earnedOffline: p[6],
      spentFun: p[7], spentMakers: p[8], spentFood: p[9],
      makers, fun, equipped, hidden, milestones,
      carsWashed: p[15], bestWorkRate: p[16], playTimeMs: (Number(p[17]) || 0) * 1000,
      settings: { voice: !!(bits & 1), sound: !!(bits & 2), music: !!(bits & 4) },
      // a restored code is a returning player: START must say "Verder spelen", not ask for a name again
      flags: { started: true, workIntro: true },
      eiland: { bag, tools, quest: ei[2], questN: ei[3], questsDone: ei[4], sold: ei[5], earned: ei[6], honger: ei[7] },
      nacht: { fire: list(p[20])[0], nights: list(p[20])[1], stolen: list(p[20])[2], clockOffsetMs: list(p[20])[3], fainted: list(p[20])[4], bumped: list(p[20])[5] },
      lastTick: now, createdAt: now,
    }, config, now);
  } catch (e) {
    return null;
  }
}
