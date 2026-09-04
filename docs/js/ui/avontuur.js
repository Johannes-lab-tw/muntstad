// ui/avontuur.js — the AVONTUUR screen: the boat from the village lands you on the pier of the Avontuureiland
// (3d/scene-eiland.js). Joystick to walk, swipe to look around, SPRING to jump, DORP to sail back to STAD.
import { createControls } from '../3d/controls.js';
import { createEilandScene } from '../3d/scene-eiland.js';
import { setFlag } from '../economy.js';

export function createAvontuur(game) {
  const el = document.getElementById('screen-avontuur');
  const host = document.getElementById('avontuur');
  const controls = createControls(el, { stick: document.getElementById('stick'), knob: document.getElementById('stick-knob') });
  let scene3 = null;   // built on first visit: the island is a few thousand things, not needed before the boat sails
  let raf = 0;
  let visible = false;

  const spring = document.getElementById('av-spring');
  spring.addEventListener('pointerdown', (e) => { e.preventDefault(); controls.pressJump(); });
  spring.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); });
  document.getElementById('av-dorp').addEventListener('click', () => {
    game.audio.play('tap');
    game.show('stad');
  });

  function loop(now) {
    if (!visible) return;
    scene3.render(now);
    raf = requestAnimationFrame(loop);
  }
  window.addEventListener('resize', () => { if (visible && scene3) scene3.resize(); });

  const hook = {
    get ready() { return !!scene3; },
  };
  function ensure() {
    if (scene3) return;
    scene3 = createEilandScene(game, game.engine, controls);
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
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
      if (!game.state.flags.avontuurIntro) {
        game.update((s) => setFlag(s, 'avontuurIntro', true));
        setTimeout(() => { if (visible) game.mentor.say('lines.avontuur', {}, { kind: 'reaction' }); }, 600);
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
