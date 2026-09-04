// ui/avontuur.js — the AVONTUUR screen: the boat from the village lands you on the pier of the Avontuureiland
// (3d/scene-eiland.js). Joystick to walk, swipe to look around, SPRING to jump, the action button (PAK / HAK / PLUK /
// VIS / KAMP) does what is in front of you, the backpack and Muntje's quest sit under the wallet, DORP sails back.
import { createControls } from '../3d/controls.js';
import { createEilandScene } from '../3d/scene-eiland.js';
import { createKamp } from './kamp.js';
import { setFlag, formatCoins } from '../economy.js';
import { collect, completeQuest, currentQuest, bagCount } from '../eiland.js';

export function createAvontuur(game) {
  const el = document.getElementById('screen-avontuur');
  const host = document.getElementById('avontuur');
  const bagEl = document.getElementById('av-bag');
  const questEl = document.getElementById('av-quest');
  const actieBtn = document.getElementById('av-actie');
  const controls = createControls(el, { stick: document.getElementById('stick'), knob: document.getElementById('stick-knob') });
  let scene3 = null;   // built on first visit: the island is a few thousand things, not needed before the boat sails
  let raf = 0;
  let visible = false;
  let questSaid = -1;

  const kamp = createKamp(game, (what) => { if (what === 'close') controls.setEnabled(visible); if (what === 'sell' || what === 'tool') renderHud(game.state); });

  const spring = document.getElementById('av-spring');
  spring.addEventListener('pointerdown', (e) => { e.preventDefault(); controls.pressJump(); });
  spring.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); });
  actieBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (scene3) scene3.doAction(); });
  document.getElementById('av-dorp').addEventListener('click', () => {
    game.audio.play('tap');
    game.show('stad');
  });
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
  function renderHud(state) {
    const cfg = game.config.eiland;
    const e = state.eiland;
    const full = bagCount(e) >= cfg.bagMax;
    bagEl.innerHTML = Object.entries(cfg.items).map(([id, it]) => `<span title="${it.name}">${it.icon}<span class="n${full ? ' full' : ''}">${e.bag[id]}</span></span>`).join('');
    const q = currentQuest(e, game.config);
    if (q) {
      questEl.hidden = false;
      const plural = { hout: 'hout', schelp: 'schelpen', bes: 'bessen', vis: 'vissen' }[q.item] || q.item;
      questEl.innerHTML = `${cfg.items[q.item].icon} <b>${q.have} / ${q.n}</b> ${plural}`;
    } else questEl.hidden = true;
  }
  function onAction(a) {
    actieBtn.hidden = !a;
    if (a) actieBtn.textContent = a.label;
    actieBtn.classList.toggle('pulse', !!a && a.type === 'trek');
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
    });
    Object.setPrototypeOf(hook, scene3.hook);   // the tests read positions and set inputs through window.__muntstad.avontuur
  }

  return {
    show() {
      ensure();
      visible = true;
      scene3.setState(game.state);
      scene3.reset();
      scene3.mount(host);
      controls.setEnabled(true);
      renderHud(game.state);
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
      kamp.close();
      cancelAnimationFrame(raf);
      raf = 0;
    },
    render(state) { if (scene3) scene3.setState(state); if (visible) renderHud(state); },
    get visible() { return visible; },
    hook,
  };
}
