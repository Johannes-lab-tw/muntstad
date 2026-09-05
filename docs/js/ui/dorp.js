// ui/dorp.js — the DORP screen (V6.3): walk through Muntstad yourself. The stick and the swipe are the island's
// (3d/controls.js), the town is scene-stad's world seen through 3d/scene-dorp.js. KAART goes back to the map (STAD),
// the bottom row has WERK / WINKEL / HUIS, the action button offers KOOP / BETER at a building, HUIS at your house and
// VAAR at the boat in the harbour. The crossing (VAAR, and DORP from the island) shows the boat on the sea for a moment.
import { createControls } from '../3d/controls.js';
import { createDorpScene } from '../3d/scene-dorp.js';
import { setFlag } from '../economy.js';

export function createDorp(game) {
  const el = document.getElementById('screen-dorp');
  const host = document.getElementById('dorp');
  const controls = createControls(el, { stick: document.getElementById('dp-stick'), knob: document.getElementById('dp-stick-knob') });
  const actieBtn = document.getElementById('dp-actie');
  const overtocht = document.getElementById('overtocht');
  const overtochtTekst = document.getElementById('overtocht-tekst');
  let scene3 = null;
  let raf = 0;
  let visible = false;
  let sailing = false;

  for (const [id, screen] of [['dp-kaart', 'stad'], ['dp-werk', 'werk'], ['dp-winkel', 'winkel'], ['dp-huis', 'huis']]) {
    document.getElementById(id).addEventListener('click', () => { game.audio.play('tap'); game.show(screen); });
  }
  document.getElementById('dp-spring').addEventListener('pointerdown', (e) => { e.preventDefault(); controls.pressJump(); });
  actieBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (scene3) scene3.doAction(); });
  actieBtn.hidden = false;
  actieBtn.style.visibility = 'hidden';
  el.addEventListener('keydown', (e) => { if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') { e.preventDefault(); if (scene3) scene3.doAction(); } });

  function onAction(a) {
    actieBtn.style.visibility = a ? 'visible' : 'hidden';
    if (a) actieBtn.textContent = a.label;
  }

  /**
   * The crossing: the boat sails over the screen for a moment, then the other shore shows. `to` = 'avontuur' | 'dorp'.
   * Shared with the island's DORP button (game.vaar).
   */
  function vaar(to) {
    if (sailing) return;
    sailing = true;
    overtochtTekst.textContent = to === 'avontuur' ? game.T.lines.varen : game.T.lines.varenTerug;
    overtocht.hidden = false;
    overtocht.classList.remove('on');
    requestAnimationFrame(() => overtocht.classList.add('on'));
    game.audio.play('unlock');
    game.mentor.say(to === 'avontuur' ? 'lines.varen' : 'lines.varenTerug', {}, { kind: 'reaction' });
    setTimeout(() => {
      game.show(to);
      setTimeout(() => { overtocht.classList.remove('on'); setTimeout(() => { overtocht.hidden = true; sailing = false; }, 500); }, 250);
    }, game.config.dorp.overtochtMs);
  }
  game.vaar = vaar;

  function ensure() {
    if (scene3) return;
    scene3 = createDorpScene(game, game.engine, controls, {
      onAction,
      onVaar() { vaar('avontuur'); },
      onHuis() { game.audio.play('tap'); game.show('huis'); },
      onMaker(id) { game.audio.play('tap'); game.update((s) => setFlag(s, 'tappedBuilding', true)); game.popups.building(id); },
      onSay(key) { game.mentor.say(key, {}, { kind: 'reaction' }); },
    });
    Object.setPrototypeOf(hook, scene3.hook);
  }

  function loop(now) {
    if (!visible) return;
    controls.setEnabled(!game.popups.isOpen && !sailing);   // a card or the crossing on top: the stick pauses
    scene3.render(now);
    raf = requestAnimationFrame(loop);
  }
  window.addEventListener('resize', () => { if (visible && scene3) scene3.resize(); });

  const hook = {
    get ready() { return !!scene3; },
    get sailing() { return sailing; },
    vaar,
  };

  return {
    show() {
      ensure();
      visible = true;
      scene3.setState(game.state);
      scene3.reset();
      scene3.mount(host);
      controls.setEnabled(true);
      game.audio.setTheme('dorp');
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
      if (!game.state.flags.dorpIntro) {
        game.update((s) => setFlag(s, 'dorpIntro', true));
        setTimeout(() => { if (visible) game.mentor.say('lines.dorpWelkom', {}, { kind: 'reaction' }); }, 600);
      }
    },
    hide() {
      visible = false;
      controls.setEnabled(false);
      cancelAnimationFrame(raf);
      raf = 0;
    },
    render(state) { if (scene3) scene3.setState(state); },
    get visible() { return visible; },
    hook,
  };
}
