// ui/avontuur.js — the AVONTUUR screen: the boat from the village lands you on the pier of the Avontuureiland
// (3d/scene-eiland.js). Joystick to walk, swipe to look around, SPRING to jump, the action button (PAK / HAK / PLUK /
// VIS / KAMP / STOOK / BOE / SLAAP) does what is in front of you, ZWAAI and DANS are emotes, the backpack, the fire
// and Muntje's quest sit under the wallet, DORP sails back. The night (fire, ghosts, bear, dawn reward) is bookkept
// here with docs/js/nacht.js; in a room (SAMEN SPELEN) the host does that and the guests mirror the fire.
import * as T from '../../vendor/three.module.min.js';
import { createControls } from '../3d/controls.js';
import { createEilandScene } from '../3d/scene-eiland.js';
import { createKamp } from './kamp.js';
import { createMinimap } from './minimap.js';
import { fireRadius } from '../nacht.js';
import { setFlag, formatCoins } from '../economy.js';
import { collect, bagCount, openChest, chestOpenedToday, todayKey } from '../eiland.js';
import { KETENS } from '../../content/ketens.js';
import { CAMPAGNE } from '../../content/campagne.js';
import { currentHoofdstuk, campagneEvent, berenVerloren, isGered } from '../campagne.js';
import { currentKeten, ketenEvent, PLEKKEN } from '../ketens.js';
import { burnFire, stokeFire, canStoke, ghostSteal, dawnReward, fireLevel, levelSpan } from '../nacht.js';
import { vindKaartstuk, graafSchat, weekKey } from '../schat.js';
import { plunder } from '../piraten.js';
import { openKist, dagKey, GADGET_INFO, GADGETS, gebruikGadget } from '../werkbank.js';
import { opnieuwAvontuur } from '../economy.js';
import { baasBuit } from '../bazen.js';
import { seedOf } from '../weer.js';
import { perks, drainHunger, eat, canEat, faint, deerBump, coolDown, freeze, cook } from '../uitdaging.js';
import { CYCLE } from '../3d/daycycle.js';

export function createAvontuur(game) {
  const el = document.getElementById('screen-avontuur');
  const host = document.getElementById('avontuur');
  const bagEl = document.getElementById('av-bag');
  const ringsEl = document.getElementById('av-rings');   // V7.2: fire / food / warmth as ring meters
  const actieIco = document.getElementById('av-actie-ico');
  const actieLbl = document.getElementById('av-actie-lbl');
  const questEl = document.getElementById('av-quest');
  const peersEl = document.getElementById('av-peers');
  const actieBtn = document.getElementById('av-actie');
  const controls = createControls(el, { stick: document.getElementById('stick'), knob: document.getElementById('stick-knob') });
  let scene3 = null;   // built on first visit: the island is a few thousand things, not needed before the boat sails
  let raf = 0;
  let visible = false;
  let questSaid = '';
  let burnAcc = 0, lastFireWarn = 0, fireOutSaid = false, lastStokeSaid = 0;
  let lastWeer = '', heartAcc = 0;   // V8.2
  const samen = game.samen;

  const kamp = createKamp(game, (what, info) => {
    if (what === 'close') controls.setEnabled(visible);
    if (what === 'sold') keten({ soort: 'verkoop', item: info.item, n: info.n });
    if (what === 'bought') keten({ soort: 'koop', tool: info.tool });
    if (what === 'sell' || what === 'tool' || what === 'kamp') { hudKey = ''; renderHud(game.state); }
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
    if (game.vaar) game.vaar('dorp'); else game.show('stad');   // V6.3: the boat back to the harbour
  });
  const eetBtn = document.getElementById('av-eet');
  const stookBtn = document.getElementById('av-stook');   // V6.2: wood into the fire, its own button at the fire
  stookBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (scene3) scene3.hook.stoke(); });
  const nachtEl = document.getElementById('av-nacht');
  const campEl = document.getElementById('av-campagne');
  const flauwEl = document.getElementById('av-flauw');
  const flauwTekst = document.getElementById('av-flauw-tekst');
  const mapEl = document.getElementById('av-map');
  const vignetteEl = document.getElementById('av-vignette');
  const bannerEl = document.getElementById('av-banner');   // V9.2
  let bannerTimer = 0;
  /** V9.5: while a boss is on the island the banner shows its name and lives (and does not fade). */
  function baasBanner(def, hp = 0, max = 0) {
    clearTimeout(bannerTimer);
    if (!def) { bannerEl.classList.add('hidden'); bannerEl.classList.remove('baas'); return; }
    bannerEl.textContent = `${def.icon} ${def.naam} ${'❤️'.repeat(Math.max(0, hp))}${'🖤'.repeat(Math.max(0, max - hp))}`;
    bannerEl.classList.remove('hidden');
    bannerEl.classList.add('baas');
  }
  let minimap = null;   // V6.2e: drawn the first time the island shows
  game.on('samenpad', (open) => { if (visible) controls.setEnabled(!open); });   // the SAMEN pad covers the stick
  eetBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); onEat(); });
  // V7.2: ZWAAI and DANS sit behind one smiley (PLAN-V7 §C.2 rule 4); the row folds away after a few seconds or after an emote
  const emoteBtn = document.getElementById('av-emote');
  const emoteRow = document.getElementById('av-emote-row');
  let emoteTimer = 0, emoteOpenedAt = 0;
  function showEmotes(v) {
    clearTimeout(emoteTimer);
    emoteRow.hidden = !v;
    if (v) { emoteOpenedAt = performance.now(); emoteTimer = setTimeout(() => { emoteRow.hidden = true; }, 4000); }
  }
  // a second tap within 300 ms is the same tap (a double pointerdown never closes what it just opened)
  emoteBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); game.audio.play('tap'); if (!emoteRow.hidden && performance.now() - emoteOpenedAt < 300) return; showEmotes(emoteRow.hidden); });
  document.getElementById('av-zwaai').addEventListener('pointerdown', (e) => { e.preventDefault(); game.audio.play('tap'); if (scene3) scene3.emote('wave'); showEmotes(false); });
  document.getElementById('av-dans').addEventListener('pointerdown', (e) => { e.preventDefault(); game.audio.play('tap'); if (scene3) scene3.emote('dance'); showEmotes(false); });
  // V9.4: the gadgets: one button with the count, a row of what you carry, a tap uses one
  const gadgetBtn = document.getElementById('av-gadget');
  const gadgetN = document.getElementById('av-gadget-n');
  const gadgetRow = document.getElementById('av-gadget-row');
  let gadgetTimer = 0, gadgetOpenedAt = 0;
  function showGadgets(v) {
    clearTimeout(gadgetTimer);
    gadgetRow.hidden = !v;
    if (v) { gadgetOpenedAt = performance.now(); gadgetTimer = setTimeout(() => { gadgetRow.hidden = true; }, 5000); }
  }
  function useGadget(id) {
    if (!scene3) return;
    const h = scene3.hook;
    let ok = false, line = null;
    if (id === 'net') { ok = h.gebruikNet(); line = ok ? 'lines.gadgetNet' : 'lines.gadgetNetNiets'; }
    else if (id === 'noodfakkel') { h.noodfakkel(); ok = true; line = 'lines.gadgetNoodfakkel'; }
    else if (id === 'fluit') { h.roepHond(); if (samen && samen.active) samen.send('fluit', {}); ok = true; line = 'lines.gadgetFluit'; }
    else if (id === 'reddingsdrank') { ok = true; line = 'lines.gadgetDrank'; }
    if (!ok) { game.mentor.say(line, {}, { kind: 'reaction' }); return; }
    const c = game.config;
    game.update((s) => { const r = gebruikGadget(s, id); if (!r.ok) return s; const t = r.state; return id === 'reddingsdrank' ? { ...t, eiland: { ...t.eiland, honger: Math.max(t.eiland.honger ?? 100, c.honger.afterFaint + 20) }, nacht: { ...t.nacht, warm: Math.max(t.nacht.warm ?? 100, c.kou.afterFaint + 20) } } : t; });
    game.save();
    game.audio.play(id === 'noodfakkel' ? 'firework' : 'unlock');
    game.mentor.say(line, {}, { kind: 'reaction' });
    hudKey = '';
    renderHud(game.state);
  }
  gadgetBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); game.audio.play('tap'); if (!gadgetRow.hidden && performance.now() - gadgetOpenedAt < 300) return; showGadgets(gadgetRow.hidden); });
  function renderGadgets(e) {
    const g = e.gadgets || {};
    const total = GADGETS.reduce((n, id) => n + (g[id] || 0), 0);
    gadgetBtn.hidden = total === 0;
    gadgetN.textContent = String(total);
    if (total === 0) { gadgetRow.hidden = true; gadgetRow.innerHTML = ''; return; }
    const want = GADGETS.filter((id) => g[id] > 0).map((id) => `${id}:${g[id]}`).join(',');
    if (gadgetRow.dataset.key === want) return;
    gadgetRow.dataset.key = want;
    gadgetRow.innerHTML = '';
    for (const id of GADGETS) {
      if (!(g[id] > 0)) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-ico btn-ico-s btn-purple';
      b.dataset.gadget = id;
      b.setAttribute('aria-label', GADGET_INFO[id].naam);
      b.innerHTML = `<i class="ico">${GADGET_INFO[id].icon}</i><b class="n">${g[id]}</b>`;
      b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); showGadgets(false); useGadget(id); });
      gadgetRow.appendChild(b);
    }
  }
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
  // ---------- the campaign (V6.6/V6.7): the game reports, campagne.js keeps the score ----------
  let hoofdstukSaid = -1;
  function campagne(ev) {
    const r = campagneEvent(game.state, game.config, ev);
    if (r.state === game.state) return;
    game.update(() => r.state);
    if (r.klaar) {
      game.save();
      game.audio.play('fanfare');
      const h = CAMPAGNE.find((x) => x.id === r.klaar);
      if (h) game.mentor.sayText(h.klaar, { kind: 'reaction' });
      const p = game.walletPoint();
      game.fx.floatText(p.x + 40, p.y + 30, `+${formatCoins(r.reward)} 🪙`, '#2a9d3a');
      game.bumpWallet();
      if (r.gered) { game.update((s) => setFlag(s, 'gered', true)); setTimeout(() => { if (visible) game.mentor.say('lines.gered', {}, { kind: 'reaction' }); }, 6000); }
      else setTimeout(() => { if (visible) sayHoofdstuk(); }, 6000);
    }
    hudKey = '';
    if (visible) renderHud(game.state);
  }
  function sayHoofdstuk() {
    const ch = currentHoofdstuk(game.state.campagne, CAMPAGNE);
    if (!ch || !ch.tekst || hoofdstukSaid === ch.index) return;
    hoofdstukSaid = ch.index;
    game.mentor.sayText(`${game.t('lines.nieuwHoofdstuk', { n: ch.index + 1, titel: ch.tekst.titel })} ${ch.tekst.verhaal}`, { kind: 'reaction' });
  }
  function onCaveExit() { campagne({ soort: 'grotuit' }); }
  function onGoldFish() {
    game.audio.play('fanfare');
    game.mentor.say('lines.goudvis', {}, { kind: 'reaction' });
    campagne({ soort: 'goudvis' });
  }
  function onTop() {
    game.mentor.say('lines.top', {}, { kind: 'reaction' });
    campagne({ soort: 'top' });
  }
  function onBerenGewonnen() {
    game.mentor.say('lines.berenGewonnen', {}, { kind: 'reaction' });
    campagne({ soort: 'beren' });
  }
  function onBerenVerloren() {
    game.audio.play('thud');
    game.update((s) => berenVerloren(s, game.config));
    game.save();
    game.mentor.say('lines.berenVerloren', {}, { kind: 'reaction' });
    hudKey = '';
    if (visible) renderHud(game.state);
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
  // V7.0: the campaign and chain cards start folded (one line) so the island stays visible; a tap unfolds them for a
  // few seconds, and the chain card unfolds by itself when a step is done so the tick is seen
  let questTimer = 0, campTimer = 0, lastStepKey = '';
  function unfold(el, ms) { el.classList.add('open'); return setTimeout(() => el.classList.remove('open'), ms); }
  function foldToggle(el, e) {
    e.stopPropagation(); e.preventDefault();   // not a joystick touch
    clearTimeout(el === questEl ? questTimer : campTimer);
    let timer = 0;
    if (el.classList.contains('open')) el.classList.remove('open'); else timer = unfold(el, 8000);
    if (el === questEl) questTimer = timer; else campTimer = timer;
  }
  questEl.addEventListener('pointerdown', (e) => foldToggle(questEl, e));
  campEl.addEventListener('pointerdown', (e) => foldToggle(campEl, e));
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
    const key = `${Object.values(e.bag).join(',')}|${Object.values(e.gadgets || {}).join(',')}|${e.kamp || 0}|${fire}|${honger}|${warm}|${e.keten}|${e.stap}|${e.stapN}|${full}|${peers}|${nights}|${lastDark}|${state.campagne ? state.campagne.hoofdstuk + ':' + state.campagne.munten : ''}`;
    if (key === hudKey) return;
    hudKey = key;
    // V6.2: the fire shows its level and how far it is to the next one; the cold as a blue bar
    const span = levelSpan(state.nacht.fire, game.config);
    const pct = span.level === 0 ? 0 : Math.round(((state.nacht.fire - span.from) / Math.max(1, span.to - span.from)) * 100);
    // V7.2: pictures only. The bag = a tile per thing with the count as a badge (red when the bag is full); the fire, the
    // food and the warmth = rings (the fire ring fills towards the next level and carries the level as its badge)
    bagEl.innerHTML = Object.entries(cfg.items).filter(([id]) => id !== 'maal' || (e.bag.maal || 0) > 0).map(([id, it]) => `<span class="tile" title="${it.name}">${it.icon}<b class="n${full ? ' full' : ''}">${e.bag[id] || 0}</b></span>`).join('');
    const fireP = span.level >= 5 ? 100 : pct;
    ringsEl.innerHTML = `<span class="ring fire${span.level <= 1 ? ' low' : ''}" style="--p:${fireP};--rc:#ff9f2e" title="Vuur level ${span.level}"><i class="ico">🔥</i><b>${span.level}</b></span>`
      + `<span class="ring honger${honger < game.config.honger.slowBelow ? ' low' : ''}" style="--p:${honger};--rc:#45d65c" title="Eten"><i class="ico">🍎</i></span>`
      + `<span class="ring warm${warm < game.config.kou.slowBelow ? ' low' : ''}" style="--p:${warm};--rc:#4fb8ff" title="Warmte"><i class="ico">🌡️</i></span>`;
    eetBtn.hidden = !canEat(e);
    renderGadgets(e);   // V9.4
    syncStook(state);
    // the dark rim closes in as you get cold (blue) or hungry (red)
    const coldF = Math.max(0, 1 - warm / game.config.kou.warnBelow), hungerF = Math.max(0, 1 - honger / game.config.honger.warnBelow);
    const f = Math.max(coldF, hungerF);
    vignetteEl.classList.toggle('on', f > 0);
    vignetteEl.style.setProperty('--vig', coldF >= hungerF ? `rgba(30, 60, 160, ${0.5 + f * 0.45})` : `rgba(150, 20, 20, ${0.5 + f * 0.45})`);
    const wIcon = scene3 ? scene3.hook.weer.icon : '☀️';   // V8.2: the weather in the day badge
    nachtEl.textContent = lastDark ? `${wIcon === '⛈️' ? '⛈️' : '🌙'} Nacht ${nights + 1}` : `${wIcon} Dag ${nights + 1}`;
    // the campaign line (V6.6): chapter, goal and the golden coins found so far
    const ch = currentHoofdstuk(state.campagne, CAMPAGNE);
    const munten = state.campagne ? state.campagne.munten || 0 : 0;
    campEl.innerHTML = ch && ch.tekst
      ? `<b>📖 ${ch.index + 1}. ${ch.tekst.titel}</b><span>${ch.tekst.doel}</span><i>${'🪙'.repeat(munten)}${'○'.repeat(7 - munten)}</i>`
      : `<b>🏆 Muntstad is gered!</b><i>${'🪙'.repeat(7)}</i>`;
    nachtEl.classList.toggle('night', !!lastDark);
    // the chain card: the title, done steps ticked, the current step with its count, the rest greyed
    const cur = currentKeten(e, KETENS);
    const stepKey = `${e.keten}:${e.stap}`;
    if (lastStepKey && stepKey !== lastStepKey) { clearTimeout(questTimer); questTimer = unfold(questEl, 5000); }   // a step done: show the tick
    lastStepKey = stepKey;
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
  // V7.2: the picture on the big action button, per label (the scene decides the label)
  const ACTIE_ICO = { PAK: '🫳', HAK: '🪓', PLUK: '🫐', VIS: '🎣', WACHT: '⏳', TREK: '🎣', KAMP: '⛺', KOOK: '🍳', BOE: '👻', SLAAP: '💤', WEK: '⏰' };
  function onAction(a) {
    // V6.1: the button keeps its place (visibility, not display), so DORP never slides under a finger that just tapped PAK
    actieBtn.style.visibility = a ? 'visible' : 'hidden';
    if (a) { actieLbl.textContent = a.label; actieIco.textContent = ACTIE_ICO[a.label] || '👉'; }
    actieBtn.classList.toggle('pulse', !!a && (a.type === 'trek' || a.type === 'boe'));
    lastAction = a;
    syncStook(game.state);
  }
  /** STOOK shows at the fire while there is wood in the bag and room in the heap. */
  function syncStook(state) {
    const atCamp = !!(lastAction && lastAction.atCamp);
    stookBtn.hidden = !(atCamp && canStoke(state.nacht, state.eiland, game.config));
  }

  // ---------- hunger, eating, fainting, the deer (V5.3) ----------
  let tickAcc = 0, lastHungerWarn = 0, emptySaid = false, fainting = false, lastColdWarn = 0, coldSaid = false;
  function onTick(dtMs, darkness, ctx = {}) {
    const dark = darkness > 0.5 ? 1 : 0;
    if (dark !== lastDark) { lastDark = dark; hudKey = ''; renderHud(game.state); }
    // V8.2: the weather in the badge and the rain you hear; the heartbeat when the stomach or the warmth runs low
    const wk = scene3 ? scene3.hook.weer.kind : 'zon';
    if (wk !== lastWeer) { lastWeer = wk; game.audio.setWeer(wk); hudKey = ''; renderHud(game.state); }
    heartAcc += dtMs;
    if (heartAcc > 900) {
      heartAcc = 0;
      const e0 = game.state.eiland, n0 = game.state.nacht;
      if ((e0.honger ?? 100) < game.config.honger.warnBelow || (n0.warm ?? 100) < game.config.kou.warnBelow) game.audio.play('heart');
    }
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
    if (((game.state.eiland.gadgets || {}).reddingsdrank || 0) > 0) { zelfRedden(why); return; }   // V9.4: your own potion saves you
    if (samen && samen.active && samen.peers.size > 0) { goDown(why); return; }
    opnieuw(why);   // V9.4: alone and nobody to save you: the adventure starts over
  }
  /** V9.4: drink your own reddingsdrank the moment you would fall. */
  function zelfRedden(why) {
    const c = game.config;
    game.update((s) => { const r = gebruikGadget(s, 'reddingsdrank'); const t = r.state; return { ...t, eiland: { ...t.eiland, honger: Math.max(t.eiland.honger ?? 100, c.honger.afterFaint) }, nacht: { ...t.nacht, warm: Math.max(t.nacht.warm ?? 100, c.kou.afterFaint) } }; });
    game.save();
    game.audio.play('upgrade');
    game.mentor.say('lines.zelfGered', {}, { kind: 'reaction' });
    hudKey = '';
    renderHud(game.state);
    setTimeout(() => { fainting = false; }, 1500);
  }
  /** V9.4: nobody could save you: the island starts over (the town and the coins stay). */
  function opnieuw(why) {
    flauwEl.hidden = false;
    flauwTekst.textContent = game.T.kort.opnieuw;
    requestAnimationFrame(() => flauwEl.classList.add('on'));
    controls.setEnabled(false);
    setTimeout(() => {
      game.update((s) => opnieuwAvontuur(s, game.config));
      game.save();
      if (scene3) { scene3.setState(game.state); scene3.hook.herstart(); }
      game.mentor.say('lines.opnieuw', {}, { kind: 'reaction' });
      hudKey = '';
      renderHud(game.state);
      flauwEl.classList.remove('on');
      controls.setEnabled(visible);
      setTimeout(() => { flauwEl.hidden = true; flauwTekst.textContent = ''; fainting = false; }, 700);
    }, 1400);
  }
  // V6.2: with friends around you first lie down; a friend who reaches you in time presses WEK and you keep your things
  let downTimer = 0, downWhy = 'honger';
  function goDown(why) {
    downWhy = why;
    flauwEl.hidden = false;
    flauwEl.classList.add('down');
    requestAnimationFrame(() => flauwEl.classList.add('on'));
    controls.setEnabled(false);
    scene3.hook.setDown(true);
    samen.send('down', { w: why === 'kou' ? 1 : 0 });
    game.mentor.say('lines.downWacht', {}, { kind: 'reaction' });
    let left = Math.round(game.config.redden.wachtMs / 1000);   // V9.4: longer, a friend has to fetch a potion
    const tick = () => { flauwTekst.textContent = `${game.T.lines.downText} ${left}`; };
    tick();
    downTimer = setInterval(() => { left--; tick(); if (left <= 0) endDown(false); }, 1000);
  }
  function endDown(woken) {
    if (downTimer) { clearInterval(downTimer); downTimer = 0; }
    flauwTekst.textContent = '';
    scene3.hook.setDown(false);
    if (samen && samen.active) samen.send('up', {});
    if (woken) {
      const c = game.config;
      game.update((s) => ({ ...s, eiland: { ...s.eiland, honger: Math.max(s.eiland.honger ?? 100, c.honger.afterFaint) }, nacht: { ...s.nacht, warm: Math.max(s.nacht.warm ?? 100, c.kou.afterFaint) } }));
      game.save();
      game.audio.play('upgrade');
      game.mentor.say('lines.woken', {}, { kind: 'reaction' });
      flauwEl.classList.remove('on', 'down');
      controls.setEnabled(visible);
      setTimeout(() => { flauwEl.hidden = true; fainting = false; }, 700);
    } else { flauwEl.classList.remove('down'); opnieuw(downWhy); }   // V9.4: nobody came with a potion
  }
  function fallDown(why) {
    flauwEl.hidden = false;
    requestAnimationFrame(() => flauwEl.classList.add('on'));
    setTimeout(() => {
      game.update((s) => (why === 'kou' ? freeze(s, game.config) : faint(s, game.config)));
      game.save();
      scene3.hook.teleport(scene3.hook.landmarks.CAMP.x, scene3.hook.landmarks.CAMP.z + 2.4);
      game.mentor.say(why === 'kou' ? 'lines.frozen' : 'lines.fainted', {}, { kind: 'reaction' });
      flauwEl.classList.remove('on');
      controls.setEnabled(visible);
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
    const weerMul = scene3 ? scene3.hook.weer.mul : 1;   // V8.2: rain and storm eat more wood unless the afdak is up
    game.update((s) => ({ ...s, nacht: burnFire(s.nacht, game.config, ms, darkness, perks(s.eiland, game.config).burnMul * weerMul) }));
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
    const wk = scene3 ? scene3.hook.weer.kind : 'zon';   // V8.2: the weather warning comes after the night line
    if (wk === 'storm' || wk === 'regen') setTimeout(() => { if (visible) game.mentor.say(wk === 'storm' ? 'lines.storm' : 'lines.regen', {}, { kind: 'reaction' }); }, bear ? 10000 : 5000);
  }
  function onDawn(fireBurned) {
    game.audio.setAmbient('day');
    const r = dawnReward(game.state.nacht, game.config, fireBurned);
    game.update((s) => ({ ...s, nacht: r.nacht, wallet: s.wallet + r.reward, earnedWork: s.earnedWork + r.reward }));
    game.save();
    keten({ soort: 'nacht', vuur: !!fireBurned });
    campagne({ soort: 'nacht', vuur: !!fireBurned });
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
    if (r.used <= 0) {
      // V7.1: a full heap is not an empty bag; say the right thing (and never "geen hout" with 38 pieces in the bag)
      game.mentor.say(r.reason === 'vol' ? 'lines.fireFull' : 'lines.noWood', {}, { kind: 'reaction' });
      syncStook(game.state);
      return;
    }
    game.audio.play('buy');
    if (samen && samen.isGuest) {
      // a guest's wood goes into the host's fire: take it out of the bag here, the host adds it to the fire
      game.update((s) => ({ ...s, eiland: r.eiland }));
      samen.send('stoke', { n: r.used });
    } else game.update((s) => ({ ...s, nacht: r.nacht, eiland: r.eiland }));
    // V7.4: the wood pops out of the fire itself (PLAN-V7 §B.2), not out of the middle of the screen
    const fp = scene3 && scene3.hook.firePoint ? scene3.hook.firePoint() : null;
    if (fp && fp.visible) game.fx.floatText(fp.x, fp.y, `+${r.used} 🪵`, '#ffffff');
    else game.fx.floatText(window.innerWidth * 0.5, window.innerHeight * 0.4, `🔥 +${r.used} 🪵`, '#ffffff');
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
  function onChest(which = 'grot') {
    const r = openChest(game.state, game.config, todayKey(game.now()), which);
    if (!r.ok) { game.mentor.say('lines.chestEmpty', {}, { kind: 'reaction' }); return; }
    game.update(() => r.state);
    game.save();
    scene3.setChestOpen(true, which);
    game.audio.play('fanfare');
    game.mentor.say('lines.chestOpen', { n: formatCoins(r.coins) }, { kind: 'reaction' });
    const p = game.walletPoint();
    game.fx.floatText(p.x + 40, p.y + 30, `+${formatCoins(r.coins)}`, '#2a9d3a');
    game.bumpWallet();
    keten({ soort: 'kist' });
    campagne({ soort: 'kist', which });
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
    campagne({ soort: 'grotspook' });
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
    samen.on('wake', () => { if (fainting && downTimer) endDown(true); });
    samen.on('down', () => { if (visible) game.mentor.say('lines.friendDown', {}, { kind: 'reaction' }); });
    samen.on('fluit', () => { if (visible) game.mentor.say('lines.fluitVriend', {}, { kind: 'reaction' }); });   // V9.4
  }

  function loop(now) {
    if (!visible) return;
    scene3.render(now);
    el.classList.toggle('moving', controls.active);   // V7.2: while walking, the buttons that are not the action step back
    if (!minimap) minimap = createMinimap(mapEl);
    minimap.update(scene3.hook.player, scene3.hook.remotes, scene3.hook.darkness, { fireR: fireRadius(game.state.nacht, game.config), kaart: scene3.hook.kaart }, now);
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
      onSound(name) { game.audio.play(name); },   // V8.2
      onPlunder() {   // V8.4: the pirates reached the fire
        const r = plunder(game.state, game.config.piraten);
        game.update(() => r.state);
        game.save();
        game.audio.play('thud');
        game.mentor.say('lines.piratenPlunder', {}, { kind: 'reaction' });
        hudKey = '';
        renderHud(game.state);
      },
      onGadgetKist(i) {   // V9.3: a chest on the island: items into the bag, gadgets, or coins
        const cfg = game.config.eiland;
        const r = openKist(game.state, game.config, i, dagKey(game.now()), seedOf(game.state), perks(game.state.eiland, game.config).bagMax);
        game.update(() => r.state);
        if (!r.ok) { game.mentor.say('lines.chestEmpty', {}, { kind: 'reaction' }); return; }
        game.save();
        game.audio.play('fanfare');
        const inh = r.inhoud;
        const wat = [
          ...Object.entries(inh.items || {}).map(([k, n]) => `${n} ${cfg.items[k].icon}`),
          ...Object.entries(inh.gadgets || {}).map(([k, n]) => `${n} ${GADGET_INFO[k].icon} ${GADGET_INFO[k].naam.toLowerCase()}`),
          ...(inh.coins ? [`${formatCoins(inh.coins)} munten`] : []),
        ].join(', ');
        game.mentor.say('lines.kistInhoud', { wat }, { kind: 'reaction' });
        if (inh.coins) { const p = game.walletPoint(); game.fx.floatText(p.x + 40, p.y + 30, `+${formatCoins(inh.coins)}`, '#2a9d3a'); game.bumpWallet(); }
        hudKey = '';
        renderHud(game.state);
      },
      onBaas(def, hp, max) {   // V9.5: the boss is here: the banner stays up with its lives, Muntje warns
        baasBanner(def, hp, max);
        game.audio.setTheme('baas');   // V9.7
        setTimeout(() => { if (visible) game.mentor.say('lines.baasKomt', { naam: def.naam }, { kind: 'reaction' }); }, 800);
      },
      onBaasHp(def, hp, max) { baasBanner(def, hp, max); },
      onBaasEet(def) {
        game.update((s) => ({ ...s, nacht: { ...s.nacht, fire: Math.max(0, s.nacht.fire - def.eet) } }));
        game.audio.play('munch');
        game.mentor.say('lines.baasEet', { naam: def.naam }, { kind: 'reaction' });
        hudKey = '';
        renderHud(game.state);
      },
      onBaasVerslagen(def) {
        const r = baasBuit(game.state, game.config, def);
        game.update(() => r.state);
        game.save();
        game.audio.play('fanfare');
        game.fx.confetti();
        const ding = game.config.fun.find((f) => f.id === r.ding);
        game.mentor.say(r.nieuw && ding ? 'lines.baasVerslagen' : 'lines.baasVerslagenMunten', { naam: def.naam, n: formatCoins(r.munten), ding: ding ? ding.name.toLowerCase() : '' }, { kind: 'reaction' });
        const p = game.walletPoint();
        game.fx.floatText(p.x + 40, p.y + 30, `+${formatCoins(r.munten)}`, '#2a9d3a');
        game.bumpWallet();
        baasBanner(null);
        game.audio.setTheme('eiland');
        hudKey = '';
        renderHud(game.state);
      },
      onBaasWeg(def) { baasBanner(null); game.audio.setTheme('eiland'); game.mentor.say('lines.baasWeg', { naam: def.naam }, { kind: 'reaction' }); },
      onWek() {   // V9.4: waking a friend costs a reddingsdrank
        const r = gebruikGadget(game.state, 'reddingsdrank');
        if (!r.ok) { game.mentor.say('lines.wekNodig', {}, { kind: 'reaction' }); return false; }
        game.update(() => r.state);
        game.save();
        hudKey = '';
        renderHud(game.state);
        return true;
      },
      onBuit(kind, n) {   // V9.2: a beaten enemy drops a coin or two
        game.update((s) => ({ ...s, wallet: s.wallet + n, earnedWork: s.earnedWork + n }));
        const p = game.walletPoint();
        game.fx.floatText(p.x + 40, p.y + 30, `+${formatCoins(n)}`, '#2a9d3a');
        game.bumpWallet();
        game.audio.play('coin');
      },
      onNachtPlan(plan, armed) {   // V9.2: the dusk banner, five seconds, and Muntje's nudge
        if (bannerEl.classList.contains('baas')) return;
        bannerEl.textContent = plan.tekst;
        bannerEl.classList.remove('hidden');
        clearTimeout(bannerTimer);
        bannerTimer = setTimeout(() => bannerEl.classList.add('hidden'), 5000);
        if (plan.wolven || plan.piraten || plan.beren) setTimeout(() => { if (visible) game.mentor.say(armed ? 'lines.nachtWapen' : 'lines.geenWapen', {}, { kind: 'reaction' }); }, 12000);
      },
      onPiratenGewonnen(n) {   // V8.4: all pirates ran: a gold coin each
        game.update((s) => ({ ...s, wallet: s.wallet + n, earnedWork: s.earnedWork + n }));
        game.save();
        game.audio.play('fanfare');
        game.fx.confetti();
        game.mentor.say('lines.piratenWeg', { n: formatCoins(n) }, { kind: 'reaction' });
        const p = game.walletPoint();
        game.fx.floatText(p.x + 40, p.y + 30, `+${formatCoins(n)}`, '#2a9d3a');
        game.bumpWallet();
      },
      onGraaf(id) {   // V8.3: a mound of earth: a map piece, or the treasure at the X; true = the mound is gone
        if (id === 'schat') {
          const r = graafSchat(game.state, game.config, weekKey(game.now()));
          if (!r.ok) { game.mentor.say('lines.schatWeer', {}, { kind: 'reaction' }); return false; }
          game.update(() => r.state);
          game.save();
          game.audio.play('fanfare');
          game.fx.confetti();
          game.mentor.say(r.hoed ? 'lines.schat' : 'lines.schatMunten', { n: formatCoins(r.coins) }, { kind: 'reaction' });
          const p = game.walletPoint();
          game.fx.floatText(p.x + 40, p.y + 30, `+${formatCoins(r.coins)}`, '#2a9d3a');
          game.bumpWallet();
          return true;
        }
        const r = vindKaartstuk(game.state, id);
        if (!r.ok) { game.mentor.say('lines.graafNiets', {}, { kind: 'reaction' }); return false; }
        game.update(() => r.state);
        game.save();
        game.audio.play('sparkle');
        game.mentor.say(r.over === 0 ? 'lines.kaartCompleet' : 'lines.kaartstuk', { n: r.over }, { kind: 'reaction' });
        return true;
      },
      onBliksemHout(n) {   // V8.2: the burnt tree leaves wood at dawn
        game.update((s) => { const max = perks(s.eiland, game.config).bagMax; const bag = { ...s.eiland.bag, hout: Math.min(max, (s.eiland.bag.hout || 0) + n) }; return { ...s, eiland: { ...s.eiland, bag } }; });
        game.mentor.say('lines.bliksemHout', { n }, { kind: 'reaction' });
        hudKey = '';
        renderHud(game.state);
      },
      onBurn, onNight, onDawn, onSteal, onStoke, onSleep, onBearAte, onFireSync, onRemoteStoke, onChest, onCaveGhostCaught,
      onTick, onDeerBump, onCook, onOntdek, onWolfBump, onCaveExit, onGoldFish, onTop, onBerenGewonnen, onBerenVerloren,
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
      scene3.setChestOpen(chestOpenedToday(game.state.eiland, todayKey(game.now()), 'hut'), 'hut');
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
      setTimeout(() => { if (visible) sayHoofdstuk(); }, game.state.flags.avontuurIntro ? 7000 : 16000);   // the chapter's story, after the welcome and the quest
    },
    hide() {
      visible = false;
      controls.setEnabled(false);
      game.audio.setAmbient(null);
      game.audio.setWeer(null);
      lastWeer = '';
      bannerEl.classList.add('hidden');
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
