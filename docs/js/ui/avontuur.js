// ui/avontuur.js — the AVONTUUR screen: the boat from the village lands you on the pier of the Avontuureiland
// (3d/scene-eiland.js). Joystick to walk, swipe to look around, SPRING to jump, the action button (PAK / HAK / PLUK /
// VIS / KAMP / STOOK / BOE / SLAAP) does what is in front of you, ZWAAI and DANS are emotes, the backpack, the fire
// and Muntje's quest sit under the wallet, DORP sails back. The night (fire, ghosts, bear, dawn reward) is bookkept
// here with docs/js/nacht.js; in a room (SAMEN SPELEN) the host does that and the guests mirror the fire.
import { createControls } from '../3d/controls.js';
import { createEilandScene } from '../3d/scene-eiland.js';
import { createKamp } from './kamp.js';
import { setFlag, formatCoins } from '../economy.js';
import { collect, completeQuest, currentQuest, bagCount, openChest, chestOpenedToday, todayKey } from '../eiland.js';
import { burnFire, stokeFire, ghostSteal, dawnReward } from '../nacht.js';
import { perks, drainHunger, eat, canEat, faint, deerBump } from '../uitdaging.js';
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
  let questSaid = -1;
  let burnAcc = 0, lastFireWarn = 0, fireOutSaid = false, lastStokeSaid = 0;
  const samen = game.samen;

  const kamp = createKamp(game, (what) => { if (what === 'close') controls.setEnabled(visible); if (what === 'sell' || what === 'tool') renderHud(game.state); });

  const spring = document.getElementById('av-spring');
  spring.addEventListener('pointerdown', (e) => { e.preventDefault(); controls.pressJump(); });
  spring.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); });
  actieBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (scene3) scene3.doAction(); });
  document.getElementById('av-dorp').addEventListener('click', () => {
    game.audio.play('tap');
    game.show('stad');
  });
  const eetBtn = document.getElementById('av-eet');
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
    if (r.questDone >= 0) {
      const q = completeQuest(game.state, game.config);
      if (q.reward > 0) {
        game.update(() => q.state);
        game.audio.play('upgrade');
        game.mentor.sayText(q.quest.klaar, { kind: 'reaction' });
        const p = game.walletPoint();
        game.fx.floatText(p.x + 40, p.y + 30, `+${formatCoins(q.reward)}`, '#2a9d3a');
        questSaid = -1;
        setTimeout(() => { if (visible) sayQuest(); }, 3500);
      }
    }
    game.save();
  }
  function sayQuest() {
    const q = currentQuest(game.state.eiland, game.config);
    if (!q || questSaid === q.index) return;
    questSaid = q.index;
    game.mentor.sayText(q.tekst, { kind: 'reaction' });
  }
  let hudKey = '';
  function renderHud(state) {
    const cfg = game.config.eiland;
    const e = state.eiland;
    const fire = Math.round(state.nacht.fire);
    const honger = Math.round(e.honger ?? 100);
    const full = bagCount(e) >= perks(e, game.config).bagMax;
    const peers = samen && samen.active ? samen.peers.size + 1 : 0;
    const key = `${Object.values(e.bag).join(',')}|${fire}|${honger}|${e.quest}|${e.questN}|${full}|${peers}`;
    if (key === hudKey) return;
    hudKey = key;
    bagEl.innerHTML = Object.entries(cfg.items).map(([id, it]) => `<span title="${it.name}">${it.icon}<span class="n${full ? ' full' : ''}">${e.bag[id]}</span></span>`).join('')
      + `<span class="fire" title="Vuur">🔥<i class="fire-bar${fire < 25 ? ' low' : ''}"><b style="width:${fire}%"></b></i></span>`
      + `<span class="honger" title="Eten">🍎<i class="honger-bar${honger < game.config.honger.slowBelow ? ' low' : ''}"><b style="width:${honger}%"></b></i></span>`;
    eetBtn.hidden = !canEat(e);
    const q = currentQuest(e, game.config);
    if (q) {
      questEl.hidden = false;
      const plural = { hout: 'hout', schelp: 'schelpen', bes: 'bessen', vis: 'vissen' }[q.item] || q.item;
      questEl.innerHTML = `${cfg.items[q.item].icon} <b>${q.have} / ${q.n}</b> ${plural}`;
    } else questEl.hidden = true;
    peersEl.hidden = peers === 0;
    if (peers) peersEl.textContent = `${samen.animal} 👥 ${peers}`;
  }
  function onAction(a) {
    actieBtn.hidden = !a;
    if (a) actieBtn.textContent = a.label;
    actieBtn.classList.toggle('pulse', !!a && (a.type === 'trek' || a.type === 'boe'));
  }

  // ---------- hunger, eating, fainting, the deer (V5.3) ----------
  let tickAcc = 0, lastHungerWarn = 0, emptySaid = false, fainting = false;
  function onTick(dtMs, darkness) {
    tickAcc += dtMs;
    if (tickAcc < 1000) return;
    const ms = tickAcc;
    tickAcc = 0;
    game.update((s) => ({ ...s, eiland: drainHunger(s.eiland, game.config, ms, darkness) }));
    const h = game.state.eiland.honger;
    const H = game.config.honger;
    if (h <= 0 && darkness > 0.5 && !fainting) { doFaint(); return; }
    if (h <= 0 && !emptySaid) { emptySaid = true; game.mentor.say('lines.hungerEmpty', {}, { kind: 'reaction' }); }
    else if (h > 0 && h < H.warnBelow && game.now() - lastHungerWarn > 40000) { lastHungerWarn = game.now(); game.mentor.say('lines.hungerLow', {}, { kind: 'reaction' }); }
    if (h > H.warnBelow) emptySaid = false;
  }
  function onEat() {
    const r = eat(game.state.eiland, game.config);
    if (!r.item) return;
    game.audio.play('munch');
    game.update((s) => ({ ...s, eiland: r.eiland }));
    game.fx.floatText(window.innerWidth * 0.5, window.innerHeight * 0.4, `🍎 +${r.gain}`, '#ffffff');
    if (r.eiland.honger >= game.config.honger.warnBelow && game.now() - lastHungerWarn > 15000) { lastHungerWarn = game.now(); game.mentor.say('lines.ate', {}, { kind: 'reaction' }); }
  }
  function doFaint() {
    fainting = true;
    game.audio.play('stumble');
    flauwEl.hidden = false;
    requestAnimationFrame(() => flauwEl.classList.add('on'));
    setTimeout(() => {
      game.update((s) => faint(s, game.config));
      game.save();
      const c = game.config;
      scene3.hook.teleport(c.eiland ? scene3.hook.landmarks.CAMP.x : 48, scene3.hook.landmarks.CAMP.z + 2.4);
      game.mentor.say('lines.fainted', {}, { kind: 'reaction' });
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
    if (darkness > 0.5) {
      if (fire <= 0 && before > 0 && !fireOutSaid) { fireOutSaid = true; game.mentor.say('lines.fireOut', {}, { kind: 'reaction' }); }
      else if (fire > 0 && fire < 25 && game.now() - lastFireWarn > 40000) { lastFireWarn = game.now(); game.mentor.say('lines.fireLow', {}, { kind: 'reaction' }); }
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
    if (game.now() - lastStokeSaid > 30000) { lastStokeSaid = game.now(); game.mentor.say('lines.stoked', {}, { kind: 'reaction' }); }
  }
  function onRemoteStoke(n) {
    if (n <= 0) return;
    game.update((s) => ({ ...s, nacht: { ...s.nacht, fire: Math.min(100, s.nacht.fire + n * game.config.nacht.woodValue) } }));
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
    game.update((s) => ({ ...s, nacht: { ...s.nacht, fire: Math.max(0, s.nacht.fire - game.config.nacht.bearEats * game.config.nacht.woodValue) } }));
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
  function ensure() {
    if (scene3) return;
    scene3 = createEilandScene(game, game.engine, controls, {
      onCollect,
      onKamp() { controls.setEnabled(false); kamp.show(); },
      onAction,
      onSay(key) { game.mentor.say(key, {}, { kind: 'reaction' }); },
      onBurn, onNight, onDawn, onSteal, onStoke, onSleep, onBearAte, onFireSync, onRemoteStoke, onChest, onCaveGhostCaught,
      onTick, onDeerBump,
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
    hook,
  };
}
