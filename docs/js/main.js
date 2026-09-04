// main.js — wires everything: state + economy loop (timestamps, never accumulated ticks), autosave, screens,
// mentor reactions, milestones, offline earnings, audio/speech unlock, PWA service worker.
import { CONFIG } from './config.js';
import * as E from './economy.js';
import * as S from './save.js';
import { T, t } from './i18n.js';
import { createAudio } from './audio.js';
import { createSpeech } from './speech.js';
import { createEngine } from './3d/engine.js';
import { createScene } from './3d/scene-stad.js';
import { createMentor } from './ui/mentor.js';
import { createPopups } from './ui/popups.js';
import { createFx } from './ui/fx.js';
import { createStart } from './ui/start.js';
import { createStad } from './ui/stad.js';
import { createAvontuur } from './ui/avontuur.js';
import { createWerk } from './ui/werk.js';
import { createWinkel } from './ui/winkel.js';
import { createHuis } from './ui/huis.js';
import { createPapa } from './ui/papa.js';
import { navSprite, setThumbEngine } from './3d/thumbs.js';

const $ = (id) => document.getElementById(id);

const memoryStorage = (() => {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
})();
const storage = (() => {
  try {
    const s = window.localStorage;
    s.setItem('muntstad.test', '1');
    s.removeItem('muntstad.test');
    return s;
  } catch (e) {
    console.warn('[muntstad] localStorage unavailable, progress lives in memory only');
    return memoryStorage;
  }
})();

let state;
let screen = 'start';
let mediaUnlocked = false;
let pendingOffline = null;
let lastRenderedWallet = -1;
const screens = {};
const listeners = {};

const audio = createAudio();
const speech = createSpeech(CONFIG);

const game = {
  config: CONFIG,
  T,
  t,
  audio,
  speech,
  get state() { return state; },
  get screen() { return screen; },
  now: () => Date.now(),
  displayName: () => (state.name && state.name.trim()) || T.defaultName,
  isUnlocked: (id) => E.isUnlocked(state, CONFIG, id),
  update,
  replaceState,
  save,
  show,
  buy,
  toggleFun,
  unlockMedia,
  applySettings,
  resetAll,
  walletPoint,
  bumpWallet,
  on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
  emit(ev, ...args) { for (const fn of listeners[ev] || []) fn(...args); },
};

// ---------- state ----------

const pendingMilestones = [];
function afterUpdate() {
  const ms = E.checkMilestones(state, CONFIG);
  state = ms.state;
  for (const id of ms.unlocked) {
    if (screen === 'start') pendingMilestones.push(id); // celebrate once the town is on screen
    else game.popups.milestone(id);
  }
  render();
}

function update(fn) {
  state = fn(state);
  afterUpdate();
  return state;
}

function replaceState(next) {
  state = { ...next, lastTick: Date.now() };
  save();
  afterUpdate();
}

function save() {
  S.save(storage, state, CONFIG);
}

function resetAll() {
  S.clear(storage, CONFIG);
  state = E.createState(CONFIG, Date.now());
  save();
  pendingOffline = null;
  show('start');
  render();
}

// ---------- purchases (shared by WINKEL and the building card) ----------

function buy(kind, id) {
  let r;
  if (kind === 'maker') r = E.buyMaker(state, CONFIG, id);
  else if (kind === 'upgrade') r = E.upgradeMaker(state, CONFIG, id);
  else r = E.buyFun(state, CONFIG, id);
  const maker = kind !== 'fun' ? E.makerById(CONFIG, id) : null;
  const item = kind === 'fun' ? E.funById(CONFIG, id) : null;
  const name = (maker || item || { name: '' }).name.toLowerCase();
  if (!r.ok) {
    audio.play('thud');
    if (r.reason === 'coins') {
      game.mentor.say(kind === 'fun' ? 'lines.notEnough' : 'lines.notEnoughMaker', { n: E.formatCoins(r.missing), ding: name }, { kind: 'reaction' });
    } else if (r.reason === 'locked') {
      game.mentor.say('lines.locked', { n: E.formatCoins(maker.price) }, { kind: 'reaction' });
    }
    return r;
  }
  const before = state;
  state = r.state;
  if (kind === 'maker') {
    audio.play('buy');
    game.scene.burst(id);
    if (E.ownedMakerCount(before, CONFIG) >= 1) game.mentor.say('lines.newMaker', {}, { kind: 'reaction' });
  } else if (kind === 'upgrade') {
    audio.play('upgrade');
    game.scene.burst(id);
    const level = E.makerLevel(state, id);
    if (level >= CONFIG.maxLevel) game.mentor.say('lines.maxLevel', { ding: name }, { kind: 'reaction' });
    else game.mentor.say('lines.upgrade', { ding: name, n: E.formatCoins(E.makerIncome(maker, level)) }, { kind: 'reaction' });
  } else {
    audio.play('buy');
    if (item.kind === 'hat') game.mentor.say('lines.hatBought', {}, { kind: 'reaction' });
    else if (item.kind === 'pet') game.mentor.say('lines.petBought', { ding: name }, { kind: 'reaction' });
    else if (item.kind === 'vehicle') game.mentor.say('lines.vehicleBought', { ding: name }, { kind: 'reaction' });
    else game.mentor.say('lines.funBought', { ding: name }, { kind: 'reaction' });
    if (state.wallet < 1 && !state.flags.zeroSaid) {
      state = E.setFlag(state, 'zeroSaid', true);
      setTimeout(() => game.mentor.say('lines.walletZero', {}, { kind: 'reaction' }), 4500);
    }
  }
  afterUpdate();
  save();
  return r;
}

function toggleFun(id) {
  update((s) => E.toggleFun(s, CONFIG, id));
  save();
}

// ---------- economy loop ----------

function tick() {
  const now = Date.now();
  const wasHungry = state.petHungry;
  const r = E.advance(state, CONFIG, now);
  state = r.state;
  if (r.offline) {
    // the popup shows what the coin-makers made; without any coin-maker it explains once what one would do
    let show = r.earned >= 1;
    if (!show && E.ownedMakerCount(state, CONFIG) === 0 && !state.flags.offlineNoMakersSaid) {
      state = E.setFlag(state, 'offlineNoMakersSaid', true);
      show = true;
    }
    if (show) {
      if (screen === 'start') pendingOffline = { earned: (pendingOffline ? pendingOffline.earned : 0) + r.earned, elapsedMs: r.elapsedMs, rawElapsedMs: r.rawElapsedMs };
      else game.popups.offline(r.earned, r.elapsedMs, r.rawElapsedMs);
    }
  }
  if (r.foodPaid > 0) onFoodPaid(r.foodPaid);
  if (!wasHungry && state.petHungry) onPetHungry();
  afterUpdate();
}

let foodSaid = 0;
function onFoodPaid(amount) {
  // the cost is always visible: "−5" ticks away at the wallet; Muntje explains it now and then
  if (TOPBAR_SCREENS.has(screen)) {
    const p = walletPoint();
    game.fx.floatText(p.x + 40, p.y + 30, `−${E.formatCoins(amount)}`, '#c93a3a');
  }
  foodSaid++;
  if (foodSaid > 2 && foodSaid % 5 !== 0) return;
  const best = CONFIG.makers.slice().reverse().find((m) => E.makerLevel(state, m.id) > 0);
  const pet = CONFIG.fun.find((f) => f.kind === 'pet' && state.fun[f.id]);
  if (!pet) return;
  if (best) game.mentor.say('lines.foodPaid', { ding: best.name.toLowerCase(), dier: pet.name.toLowerCase() }, { kind: 'tip' });
  else game.mentor.say('lines.foodTick', { n: E.formatCoins(amount), dier: pet.name.toLowerCase() }, { kind: 'tip' });
}

function onPetHungry() {
  const pet = CONFIG.fun.find((f) => f.kind === 'pet' && state.fun[f.id]);
  if (pet) game.mentor.say('lines.petSleeping', { dier: pet.name.toLowerCase() }, { kind: 'reaction' });
}

// ---------- rendering ----------

function render() {
  const wallet = Math.floor(state.wallet);
  if (wallet !== lastRenderedWallet) {
    $('wallet-amount').textContent = E.formatCoins(wallet);
    lastRenderedWallet = wallet;
  }
  $('income-amount').textContent = `+${E.formatCoins(E.passivePerMinute(state, CONFIG))}`;
  game.scene.setState(state);
  const active = screens[screen];
  if (active && active.render) active.render(state);
  game.emit('render', state);
}

function walletPoint() {
  const r = $('wallet-icon').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

let bumpTimer = 0;
let bumpUntil = 0;
function bumpWallet() {
  // a bump is a CSS animation: never restart it while it runs (coin storms would only cost layout)
  const now = performance.now();
  if (now < bumpUntil) return;
  bumpUntil = now + 360;
  const w = $('wallet');
  w.classList.add('bump');
  clearTimeout(bumpTimer);
  bumpTimer = setTimeout(() => w.classList.remove('bump'), 360);
}

// ---------- screens ----------

const TOPBAR_SCREENS = new Set(['stad', 'avontuur', 'werk', 'winkel', 'huis']);

function show(name) {
  if (!screens[name]) return;
  const prev = screens[screen];
  if (prev && prev.hide && screen !== name) prev.hide();
  screen = name;
  for (const sec of document.querySelectorAll('.screen')) sec.classList.toggle('active', sec.dataset.screen === name);
  $('app').dataset.screen = name;
  $('topbar').hidden = !TOPBAR_SCREENS.has(name);
  game.mentor.setVisible(TOPBAR_SCREENS.has(name));
  const next = screens[name];
  if (next.show) next.show();
  render();
  game.emit('screen', name);
  if (name === 'stad' && (pendingOffline || pendingMilestones.length)) {
    // the "while you were away" popup comes first (the strongest aha), stickers queue up behind it;
    // the welcome line (≈ 2.5 s spoken) gets room before the first popup takes over
    const p = pendingOffline;
    pendingOffline = null;
    const ids = pendingMilestones.splice(0);
    const delay = p ? 2600 : 900;
    setTimeout(() => {
      if (p) game.popups.offline(p.earned, p.elapsedMs, p.rawElapsedMs);
      ids.forEach((id) => game.popups.milestone(id));
    }, delay);
  }
}

// ---------- media (iOS needs a user gesture for audio and speech) ----------

function unlockMedia() {
  // called on every gesture: cheap, and it also revives a context that iOS put in 'interrupted' after a call or Siri
  audio.unlock();
  speech.unlock();
  if (mediaUnlocked) return;
  mediaUnlocked = true;
  applySettings();
}

function applySettings() {
  audio.setSound(state.settings.sound);
  audio.setMusic(state.settings.music);
  speech.setEnabled(state.settings.voice);
}

// ---------- boot ----------

function boot() {
  const loaded = S.load(storage, CONFIG, Date.now());
  state = loaded.state;
  if (loaded.status !== 'ok' && loaded.status !== 'new') console.info(`[muntstad] save ${loaded.status}: ${loaded.message}`);
  if (loaded.status === 'new') save();

  game.mentor = createMentor(game);
  game.popups = createPopups(game);
  game.fx = createFx(game);
  // real 3D (Three.js): one renderer for the town, the yard and the thumbnails
  game.engine = createEngine();
  setThumbEngine(game.engine);
  game.scene = createScene($('town'), game, game.engine);
  screens.start = createStart(game);
  screens.stad = createStad(game);
  screens.avontuur = createAvontuur(game);
  screens.werk = createWerk(game);
  screens.winkel = createWinkel(game);
  screens.huis = createHuis(game);
  const papa = createPapa(game);
  screens.papa = papa;
  screens.gate = papa.gate;

  // blocky icons for the HUD and navigation (rendered once from the same art as the town)
  const icons = { 'ico-werk': 'werk', 'ico-winkel': 'winkel', 'ico-winkel-2': 'winkel', 'ico-huis': 'huis', 'ico-stad-1': 'stad', 'ico-stad-2': 'stad', 'ico-stad-3': 'stad', 'ico-stad-4': 'stad', 'ico-stad-5': 'stad', 'ico-makers': 'makers', 'ico-fun': 'fun', 'income-icon': 'income', 'ico-car': 'car' };
  for (const [id, kind] of Object.entries(icons)) { const img = document.getElementById(id); if (img) img.src = navSprite(kind); }

  // zoom / callout prevention (iOS ignores user-scalable=no)
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('contextmenu', (e) => { if (!e.target.closest('input, textarea')) e.preventDefault(); });
  document.addEventListener('touchmove', (e) => { if (!e.target.closest('.papa-scroll')) e.preventDefault(); }, { passive: false });

  // the first gesture unlocks audio + speech; later gestures keep retrying until the context really runs
  document.addEventListener('pointerdown', () => { if (!mediaUnlocked || !audio.running) unlockMedia(); }, { capture: true });
  document.addEventListener('touchend', () => { if (!mediaUnlocked || !audio.running) unlockMedia(); }, { capture: true });

  // economy: catch up first (offline earnings), then tick every second
  tick();
  setInterval(tick, CONFIG.tickMs);
  setInterval(save, CONFIG.autosaveMs);
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      save();
      audio.pause();
    } else {
      tick();
      if (mediaUnlocked) audio.resume();
    }
  });
  window.addEventListener('resize', () => { game.scene.resize(); game.fx.resize(); });

  show('start');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // check for a new version every time the app comes back to the front, so the next start has it
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch((e) => console.info('[muntstad] service worker not registered:', e.message));
  }
  window.__muntstad = { get state() { return state; }, config: CONFIG, version: 4, plotPoint: (id) => game.scene.plotPoint(id), get scene() { return game.scene; }, avontuur: screens.avontuur.hook, get mentorLog() { return game.mentor.log; } };
}

boot();
