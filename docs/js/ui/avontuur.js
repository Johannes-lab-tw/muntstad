// ui/avontuur.js — the AVONTUUR screen: the boat from the village lands you on the pier of the Avontuureiland
// (3d/scene-eiland.js). Joystick to walk, swipe to look around, SPRING to jump, the action button (PAK / HAK / PLUK /
// VIS / KAMP / STOOK / BOE / SLAAP) does what is in front of you, ZWAAI and DANS are emotes, the backpack, the fire
// and Muntje's quest sit under the wallet, DORP sails back. The night (fire, ghosts, bear, dawn reward) is bookkept
// here with docs/js/nacht.js; in a room (SAMEN SPELEN) the host does that and the guests mirror the fire.
import * as T from '../../vendor/three.module.min.js';
import { createControls } from '../3d/controls.js';
import { createEilandScene } from '../3d/scene-eiland.js';
import { createKamp } from './kamp.js';
import { setFlag, formatCoins } from '../economy.js';
import { collect, bagCount, openChest, chestOpenedToday, todayKey } from '../eiland.js';
import { KETENS } from '../../content/ketens.js';
import { currentKeten, ketenEvent, PLEKKEN } from '../ketens.js';
import { burnFire, stokeFire, ghostSteal, dawnReward, fireLevel, levelSpan } from '../nacht.js';
import { perks, drainHunger, eat, canEat, faint, deerBump, coolDown, freeze, cook } from '../uitdaging.js';
import { CYCLE } from '../3d/daycycle.js';

export function createAvontuur(game) {
  const el = document.getElementById('screen-avontuur');
  const host = document.getElementById('avontuur');
  const bagEl = document.getElementById('av-bag');
  const questEl = document.getElementById('av-quest');
  const peersEl = document.getElementById('av-peers');
  const actieBtn = document.getElementById('av-actie');
  const controls = createControls(el, { stick: document.getElementById('stick'), knob: document.getElementById('stick-knob') });
  let scene3 = null;   // built on first visit: the island is a few thousand things, not needed before the boat sails
  let raf = 0;
  let visible = false;
  let questSaid = '';
  let burnAcc = 0, lastFireWarn = 0, fireOutSaid = false, lastStokeSaid = 0;
  const samen = game.samen;

  const kamp = createKamp(game, (what, info) => {
    if (what === 'close') controls.setEnabled(visible);
    if (what === 'sold') keten({ soort: 'verkoop', item: info.item, n: info.n });
    if (what === 'bought') keten({ soort: 'koop', tool: info.tool });
    if (what === 'sell' || what === 'tool') renderHud(game.state);
  });

  const spring = document.getElementById('av-spring');
  spring.addEventListener('pointerdown', (e) => { e.preventDefault(); controls.pressJump(); });
  spring.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); });
  actieBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); lastActionAt = performance.now(); if (scene3) scene3.doAction(); });
  actieBtn.hidden = false;
  actieBtn.style.visibility = 'hidden';
  const dorpBtn = document.getElementById('av-dorp');
  dorpBtn.addEventListener('pointerdown', () => { dorpArmed = true; });
  dorpBtn.addEventListener('click', () => {
    // a real tap on DORP starts with a pointerdown on DORP; the click at the tail of a PAK/HAK tap (the button moved
    // under the finger) never had one and is not a wish to leave, however slow the device
    if (!dorpArmed || performance.now() - lastActionAt < 500) return;
    dorpArmed = false;
    game.audio.play('tap');
    game.show('stad');
  });
  const eetBtn = document.getElementById('av-eet');
  const stookBtn = document.getElementById('av-stook');   // V6.2: wood into the fire, its own button at the fire
  stookBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (scene3) scene3.hook.stoke(); });
  const nachtEl = document.getElementById('av-nacht');
  const flauwEl = document.getElementById('av-flauw');
  eetBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); onEat(); });
  document.getElementById('av-zwaai').addEventListener('pointerdown', (e) => { e.preventDefault(); game.audio.play('tap'); if (scene3) scene3.emote('wave'); });
  document.getElementById('av-dans').addEventListener('pointerdown', (e) => { e.preventDefault(); game.audio.play('tap'); if (scene3) scene3.emote('dance'); });
  // keyboard: E / Enter = the action button
  window.addEventListener('keydown', (e) => {
    if (!visible || !scene3 || kamp.isOpen) return;
    if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') { e.preventDefault(); scene3.doAction(); }
  });

  // ---------- collecting, quests, the HUD ----------
  function onCollect(item, n) {
    const r = collect(game.state.eiland, game.config, item, n);
    if (r.added <= 0) { game.mentor.say('lines.bagFull', {}, { kind: 'reaction' }); return; }
    game.update((s) => ({ ...s, eiland: r.eiland }));
    game.fx.floatText(window.innerWidth * 0.5, window.innerHeight * 0.4, `+${r.added} ${game.config.eiland.items[item].icon}`, '#ffffff');
    keten({ soort: 'verzamel', item, n: r.added });
    game.save();
  }
  // ---------- Muntje's quest chains (V6.2): the game reports what happened, ketens.js keeps the score ----------
  function keten(ev) {
    const r = ketenEvent(game.state, KETENS, ev);
    if (r.state === game.state) return;
    game.update(() => r.state);
    if (r.ketenKlaar) {
      game.save();
      game.audio.play('fanfare');
      game.mentor.sayText(r.ketenKlaar.klaar, { kind: 'reaction' });
      const p = game.walletPoint();
      game.fx.floatText(p.x + 40, p.y + 30, `+${formatCoins(r.reward)}`, '#2a9d3a');
      game.bumpWallet();
      questSaid = '';
      setTimeout(() => { if (visible) sayQuest(); }, 4000);
    } else if (r.stapKlaar) {
      game.audio.play('upgrade');
      questSaid = '';
      const cur = currentKeten(game.state.eiland, KETENS);
      if (cur) { questSaid = `${cur.index}:${cur.stapIndex}`; game.mentor.say('lines.ketenStap', { tekst: cur.stap.tekst }, { kind: 'reaction' }); }
    }
    hudKey = '';
    if (visible) renderHud(game.state);
  }
  function sayQuest() {
    const cur = currentKeten(game.state.eiland, KETENS);
    if (!cur) return;
    const key = `${cur.index}:${cur.stapIndex}`;
    if (questSaid === key) return;
    questSaid = key;
    game.mentor.sayText(cur.stapIndex === 0 ? `${cur.keten.titel}. ${cur.stap.tekst}` : cur.stap.tekst, { kind: 'reaction' });
  }
  const ontdektSaid = new Set();
  function onOntdek(plek) {
    if (!ontdektSaid.has(plek)) { ontdektSaid.add(plek); game.mentor.say('lines.ontdekt', { plek: PLEKKEN[plek].naam }, { kind: 'reaction' }); }
    keten({ soort: 'ontdek', plek });
  }
  function onWolfBump() {
    const r = deerBump(game.state, game.config, game.config.wolven);
    game.update(() => r.state);
    game.mentor.say('lines.wolfBite', {}, { kind: 'reaction' });
    return r.drops;
  }
  let hudKey = '';
  function renderHud(state) {
    const cfg = game.config.eiland;
    const e = state.eiland;
    const fire = Math.round(state.nacht.fire);
    const honger = Math.round(e.honger ?? 100);
    const warm = Math.round(state.nacht.warm ?? 100);
    const full = bagCount(e) >= perks(e, game.config).bagMax;
    const peers = samen && samen.active ? samen.peers.size + 1 : 0;
    const nights = state.nacht.nights || 0;
    const key = `${Object.values(e.bag).join(',')}|${fire}|${honger}|${warm}|${e.keten}|${e.stap}|${e.stapN}|${full}|${peers}|${nights}|${lastDark}`;
    if (key === hudKey) return;
    hudKey = key;
    // V6.2: the fire shows its level and how far it is to the next one; the cold as a blue bar
    const span = levelSpan(state.nacht.fire, game.config);
    const pct = span.level === 0 ? 0 : Math.round(((state.nacht.fire - span.from) / Math.max(1, span.to - span.from)) * 100);
    bagEl.innerHTML = Object.entries(cfg.items).filter(([id]) => id !== 'maal' || (e.bag.maal || 0) > 0).map(([id, it]) => `<span title="${it.name}">${it.icon}<span class="n${full ? ' full' : ''}">${e.bag[id] || 0}</span></span>`).join('')
      + `<span class="fire" title="Vuur level ${span.level}">🔥<b class="lvl">${span.level}</b><i class="fire-bar${span.level <= 1 ? ' low' : ''}"><b style="width:${pct}%"></b></i></span>`
      + `<span class="honger" title="Eten">🍎<i class="honger-bar${honger < game.config.honger.slowBelow ? ' low' : ''}"><b style="width:${honger}%"></b></i></span>`
      + `<span class="warm" title="Warmte">🌡️<i class="warm-bar${warm < game.config.kou.slowBelow ? ' low' : ''}"><b style="width:${warm}%"></b></i></span>`;
    eetBtn.hidden = !canEat(e);
    syncStook(state);
    nachtEl.textContent = lastDark ? `🌙 Nacht ${nights + 1}` : `☀️ Dag ${nights + 1}`;
    nachtEl.classList.toggle('night', !!lastDark);
    // the chain card: the title, done steps ticked, the current step with its count, the rest greyed
    const cur = currentKeten(e, KETENS);
    if (cur) {
      questEl.hidden = false;
      questEl.innerHTML = `<b class="kt">${cur.keten.titel}</b>` + cur.keten.stappen.map((s, i) => {
        const cls = i < cur.stapIndex ? 'done' : i === cur.stapIndex ? 'now' : 'todo';
        const mark = i < cur.stapIndex ? '✔' : i === cur.stapIndex ? '▶' : '○';
        const count = i === cur.stapIndex && cur.doel > 1 ? ` <i>${cur.stapN} / ${cur.doel}</i>` : '';
        return `<span class="st ${cls}">${mark} ${s.tekst}${count}</span>`;
      }).join('');
    } else questEl.hidden = true;
    peersEl.hidden = peers === 0;
    if (peers) peersEl.textContent = `${samen.animal} 👥 ${peers}`;
  }
  let lastActionAt = 0, dorpArmed = false, lastAction = null, lastDark = 0;
  function onAction(a) {
    // V6.1: the button keeps its place (visibility, not display), so DORP never slides under a finger that just tapped PAK
    actieBtn.style.visibility = a ? 'visible' : 'hidden';
    if (a) actieBtn.textContent = a.label;
    actieBtn.classList.toggle('pulse', !!a && (a.type === 'trek' || a.type === 'boe'));
    lastAction = a;
    syncStook(game.state);
  }
  /** STOOK shows at the fire while there is wood in the bag and room in the heap. */
  function syncStook(state) {
    const atCamp = !!(lastAction && lastAction.atCamp);
    stookBtn.hidden = !(atCamp && (state.eiland.bag.hout || 0) > 0 && state.nacht.fire < game.config.nacht.fireMax);
  }

  // ---------- hunger, eating, fainting, the deer (V5.3) ----------
  let tickAcc = 0, lastHungerWarn = 0, emptySaid = false, fainting = false, lastColdWarn = 0, coldSaid = false;
  function onTick(dtMs, darkness, ctx = {}) {
    const dark = darkness > 0.5 ? 1 : 0;
    if (dark !== lastDark) { lastDark = dark; hudKey = ''; renderHud(game.state); }
    tickAcc += dtMs;
    if (tickAcc < 1000) return;
    const ms = tickAcc;
    tickAcc = 0;
    game.update((s) => ({ ...s, eiland: drainHunger(s.eiland, game.config, ms, darkness), nacht: coolDown(s.nacht, game.config, ms, darkness, ctx) }));
    const h = game.state.eiland.honger;
    const H = game.config.honger;
    if (h <= 0 && darkness > 0.5 && !fainting) { doFaint('honger'); return; }
    if (h <= 0 && !emptySaid) { emptySaid = true; game.mentor.say('lines.hungerEmpty', {}, { kind: 'reaction' }); }
    else if (h > 0 && h < H.warnBelow && game.now() - lastHungerWarn > 40000) { lastHungerWarn = game.now(); game.mentor.say('lines.hungerLow', {}, { kind: 'reaction' }); }
    if (h > H.warnBelow) emptySaid = false;
    // the cold (V6.2)
    const w = game.state.nacht.warm ?? 100;
    const K = game.config.kou;
    if (w <= 0 && darkness > 0.5 && !fainting) { doFaint('kou'); return; }
    if (w <= 0 && !coldSaid) { coldSaid = true; game.mentor.say('lines.coldEmpty', {}, { kind: 'reaction' }); }
    else if (w > 0 && w < K.warnBelow && game.now() - lastColdWarn > 40000) { lastColdWarn = game.now(); game.mentor.say('lines.coldLow', {}, { kind: 'reaction' }); }
    if (w > K.warnBelow) coldSaid = false;
  }
  function onCook() {
    const r = cook(game.state.eiland, game.state.nacht.fire, game.config);
    if (!r.ok) return;
    game.audio.play('buy');
    game.update((s) => ({ ...s, eiland: r.eiland }));
    game.fx.floatText(window.innerWidth * 0.5, window.innerHeight * 0.4, '🐟 → 🍖', '#ffffff');
    if (game.now() - lastCookSaid > 30000) { lastCookSaid = game.now(); game.mentor.say('lines.cooked', {}, { kind: 'reaction' }); }
    keten({ soort: 'kook', n: 1 });
  }
  let lastCookSaid = 0;
  function onEat() {
    const r = eat(game.state.eiland, game.config);
    if (!r.item) return;
    game.audio.play('munch');
    game.update((s) => ({ ...s, eiland: r.eiland }));
    game.fx.floatText(window.innerWidth * 0.5, window.innerHeight * 0.4, `🍎 +${r.gain}`, '#ffffff');
    if (r.eiland.honger >= game.config.honger.warnBelow && game.now() - lastHungerWarn > 15000) { lastHungerWarn = game.now(); game.mentor.say('lines.ate', {}, { kind: 'reaction' }); }
    keten({ soort: 'eet', n: 1 });
  }
  function doFaint(why = 'honger') {
    fainting = true;
    game.audio.play('stumble');
    flauwEl.hidden = false;
    requestAnimationFrame(() => flauwEl.classList.add('on'));
    setTimeout(() => {
      game.update((s) => (why === 'kou' ? freeze(s, game.config) : faint(s, game.config)));
      game.save();
      scene3.hook.teleport(scene3.hook.landmarks.CAMP.x, scene3.hook.landmarks.CAMP.z + 2.4);
      game.mentor.say(why === 'kou' ? 'lines.frozen' : 'lines.fainted', {}, { kind: 'reaction' });
      flauwEl.classList.remove('on');
      setTimeout(() => { flauwEl.hidden = true; fainting = false; }, 700);
    }, 900);
  }
  function onDeerBump() {
    const r = deerBump(game.state, game.config);
    game.update(() => r.state);
    game.mentor.say('lines.deerBumped', {}, { kind: 'reaction' });
    return r.drops;
  }

  // ---------- the night ----------
  function onBurn(dtMs, darkness) {
    burnAcc += dtMs;
    if (burnAcc < 1000) return;
    const ms = burnAcc;
    burnAcc = 0;
    const before = game.state.nacht.fire;
    game.update((s) => ({ ...s, nacht: burnFire(s.nacht, game.config, ms, darkness, perks(s.eiland, game.config).burnMul) }));
    const fire = game.state.nacht.fire;
    const lvlBefore = fireLevel(before, game.config), lvlNow = fireLevel(fire, game.config);
    if (darkness > 0.5) {
      if (fire <= 0 && before > 0 && !fireOutSaid) { fireOutSaid = true; game.mentor.say('lines.fireOut', {}, { kind: 'reaction' }); }
      else if (lvlNow >= 1 && lvlNow < lvlBefore && game.now() - lastFireWarn > 20000) { lastFireWarn = game.now(); game.mentor.say('lines.fireLevelDown', { n: lvlNow }, { kind: 'reaction' }); }
      else if (fire > 0 && fire < 10 && game.now() - lastFireWarn > 40000) { lastFireWarn = game.now(); game.mentor.say('lines.fireLow', {}, { kind: 'reaction' }); }
    }
  }
  function onFireSync(fire) {
    if (Math.abs(game.state.nacht.fire - fire) < 0.5) return;
    game.update((s) => ({ ...s, nacht: { ...s.nacht, fire } }));
  }
  function onNight(bear, nights = 0) {
    fireOutSaid = false;
    game.audio.setAmbient('night');
    if (bear) game.audio.play('growl');
    game.mentor.say(samen && samen.isGuest ? 'lines.guestNight' : 'lines.nightComing', {}, { kind: 'reaction' });
    if (bear) setTimeout(() => { if (visible) game.mentor.say('lines.bearComing', {}, { kind: 'reaction' }); }, 5000);
    else if (nights === 1) setTimeout(() => { if (visible) game.mentor.say('lines.harderNight', {}, { kind: 'reaction' }); }, 5000);
  }
  function onDawn(fireBurned) {
    game.audio.setAmbient('day');
    const r = dawnReward(game.state.nacht, game.config, fireBurned);
    game.update((s) => ({ ...s, nacht: r.nacht, wallet: s.wallet + r.reward, earnedWork: s.earnedWork + r.reward }));
    game.save();
    keten({ soort: 'nacht', vuur: !!fireBurned });
    if (r.reward > 0) {
      game.audio.play('upgrade');
      game.mentor.say('lines.dawnReward', { n: formatCoins(r.reward) }, { kind: 'reaction' });
      const p = game.walletPoint();
      game.fx.floatText(p.x + 40, p.y + 30, `+${formatCoins(r.reward)}`, '#2a9d3a');
    } else game.mentor.say('lines.dawnNoFire', {}, { kind: 'reaction' });
  }
  function onSteal() {
    game.audio.play('boo');
    const r = ghostSteal(game.state.nacht, game.state.eiland, game.state.wallet, game.config);
    game.update((s) => ({ ...s, nacht: r.nacht, eiland: r.eiland, wallet: r.wallet }));
    const cfg = game.config.eiland;
    const what = r.what === 'vuur' ? 'hout uit het vuur' : r.what === 'munten' ? `${r.coins} munten` : r.what === 'niets' ? null : `een ${cfg.items[r.what].name.toLowerCase()}`;
    if (what) game.mentor.say('lines.ghostStole', { ding: what }, { kind: 'reaction' });
    else game.mentor.say('lines.ghostNothing', {}, { kind: 'reaction' });
  }
  function onStoke() {
    const r = stokeFire(game.state.nacht, game.state.eiland, game.config, 3);
    if (r.used <= 0) { game.mentor.say('lines.noWood', {}, { kind: 'reaction' }); return; }
    game.audio.play('buy');
    if (samen && samen.isGuest) {
      // a guest's wood goes into the host's fire: take it out of the bag here, the host adds it to the fire
      game.update((s) => ({ ...s, eiland: r.eiland }));
      samen.send('stoke', { n: r.used });
    } else game.update((s) => ({ ...s, nacht: r.nacht, eiland: r.eiland }));
    game.fx.floatText(window.innerWidth * 0.5, window.innerHeight * 0.4, `🔥 +${r.used} 🪵`, '#ffffff');
    const lvl = fireLevel(game.state.nacht.fire, game.config);
    if (!(samen && samen.isGuest) && lvl > fireLevel(r.nacht.fire - r.used, game.config)) { game.audio.play('upgrade'); game.mentor.say('lines.fireLevelUp', { n: lvl }, { kind: 'reaction' }); }
    else if (game.now() - lastStokeSaid > 30000) { lastStokeSaid = game.now(); game.mentor.say('lines.stoked', {}, { kind: 'reaction' }); }
    keten({ soort: 'stook', n: r.used });
    keten({ soort: 'vuur', level: lvl });
  }
  function onRemoteStoke(n) {
    if (n <= 0) return;
    game.update((s) => ({ ...s, nacht: { ...s.nacht, fire: Math.min(game.config.nacht.fireMax, s.nacht.fire + n) } }));
  }
  function onSleep() {
    const total = CYCLE.dayMs + CYCLE.nightMs;
    const target = game.config.nacht.sleepSkipsTo * total;
    const offset = ((target - (Date.now() % total)) % total + total) % total;
    game.update((s) => ({ ...s, nacht: { ...s.nacht, clockOffsetMs: Math.round(offset) } }));
    game.audio.play('unlock');
    game.mentor.say('lines.sleep', {}, { kind: 'reaction' });
  }
  function onChest() {
    const r = openChest(game.state, game.config, todayKey(game.now()));
    if (!r.ok) { game.mentor.say('lines.chestEmpty', {}, { kind: 'reaction' }); return; }
    game.update(() => r.state);
    game.save();
    scene3.setChestOpen(true);
    game.audio.play('fanfare');
    game.mentor.say('lines.chestOpen', { n: formatCoins(r.coins) }, { kind: 'reaction' });
    const p = game.walletPoint();
    game.fx.floatText(p.x + 40, p.y + 30, `+${formatCoins(r.coins)}`, '#2a9d3a');
    game.bumpWallet();
    keten({ soort: 'kist' });
  }
  function onCaveGhostCaught() {
    // the cave ghost takes shells first (up to caveGhost.steals), otherwise one thing of whatever you carry
    const e = game.state.eiland;
    const n = game.config.eiland.caveGhost.steals;
    const bag = { ...e.bag };
    let taken = null;
    if (bag.schelp > 0) { const k = Math.min(n, bag.schelp); bag.schelp -= k; taken = `${k} ${k === 1 ? 'schelp' : 'schelpen'}`; }
    else { const id = Object.keys(bag).find((k) => bag[k] > 0); if (id) { bag[id] -= 1; taken = `een ${game.config.eiland.items[id].name.toLowerCase()}`; } }
    if (taken) game.update((s) => ({ ...s, eiland: { ...s.eiland, bag }, nacht: { ...s.nacht, stolen: s.nacht.stolen + 1 } }));
    game.mentor.say(taken ? 'lines.caveGhostCaught' : 'lines.ghostNothing', {}, { kind: 'reaction' });
  }
  function onBearAte() {
    game.update((s) => ({ ...s, nacht: { ...s.nacht, fire: Math.max(0, s.nacht.fire - game.config.nacht.bearEats) } }));
    game.audio.play('thud');
    game.mentor.say('lines.bearAte', {}, { kind: 'reaction' });
  }
  if (samen) {
    samen.on('peer', () => { if (visible) game.mentor.say('lines.peerJoined', {}, { kind: 'reaction' }); hudKey = ''; if (visible) renderHud(game.state); });
    samen.on('left', () => { if (visible) game.mentor.say('lines.peerLeft', {}, { kind: 'reaction' }); hudKey = ''; if (visible) renderHud(game.state); });
    samen.on('change', () => { hudKey = ''; if (visible) renderHud(game.state); });
  }

  function loop(now) {
    if (!visible) return;
    scene3.render(now);
    raf = requestAnimationFrame(loop);
  }
  window.addEventListener('resize', () => { if (visible && scene3) scene3.resize(); });

  const hook = {
    get ready() { return !!scene3; },
    get kampOpen() { return kamp.isOpen; },
  };
  /** V6.1: build the island while the town is still on screen and compile its shaders, so the first steps do not stutter. */
  let warmed = false;
  function prebuild() {
    ensure();
    if (warmed) return;
    warmed = true;
    try {
      const r = game.engine.renderer;
      scene3.setState(game.state);
      r.compile(scene3.scene, scene3.camera);
      // one warm-up draw into a tiny off-screen target: shadow map, textures and instanced buffers get uploaded now
      const target = new T.WebGLRenderTarget(64, 64);
      r.setRenderTarget(target);
      r.render(scene3.scene, scene3.camera);
      r.setRenderTarget(null);
      target.dispose();
    } catch (e) { /* warming up is a bonus, never a blocker */ }
  }
  function ensure() {
    if (scene3) return;
    scene3 = createEilandScene(game, game.engine, controls, {
      onCollect,
      onKamp() { controls.setEnabled(false); kamp.show(); },
      onAction,
      onSay(key) { game.mentor.say(key, {}, { kind: 'reaction' }); },
      onBurn, onNight, onDawn, onSteal, onStoke, onSleep, onBearAte, onFireSync, onRemoteStoke, onChest, onCaveGhostCaught,
      onTick, onDeerBump, onCook, onOntdek, onWolfBump,
    });
    Object.setPrototypeOf(hook, scene3.hook);   // the tests read positions and set inputs through window.__muntstad.avontuur
  }

  return {
    show() {
      ensure();
      visible = true;
      scene3.setState(game.state);
      scene3.reset();
      scene3.setChestOpen(chestOpenedToday(game.state.eiland, todayKey(game.now())));
      scene3.mount(host);
      controls.setEnabled(true);
      hudKey = '';
      renderHud(game.state);
      game.audio.setTheme('eiland');
      game.audio.setAmbient(scene3.hook.darkness > 0.5 ? 'night' : 'day');
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
      if (!game.state.flags.avontuurIntro) {
        game.update((s) => setFlag(s, 'avontuurIntro', true));
        setTimeout(() => { if (visible) game.mentor.say('lines.eilandWelkom', {}, { kind: 'reaction' }); }, 600);
        setTimeout(() => { if (visible) game.mentor.say('lines.avontuur', {}, { kind: 'reaction' }); }, 6000);
        setTimeout(() => { if (visible) sayQuest(); }, 11000);
      } else setTimeout(() => { if (visible) sayQuest(); }, 1200);
    },
    hide() {
      visible = false;
      controls.setEnabled(false);
      game.audio.setAmbient(null);
      game.audio.setTheme('dorp');
      kamp.close();
      cancelAnimationFrame(raf);
      raf = 0;
    },
    render(state) { if (scene3) scene3.setState(state); if (visible) renderHud(state); },
    get visible() { return visible; },
    prebuild,
    hook,
  };
}
