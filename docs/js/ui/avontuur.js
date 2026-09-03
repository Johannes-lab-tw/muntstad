// ui/avontuur.js — the AVONTUUR screen (round 1 of PLAN-V4): walk around the town yourself with a joystick,
// swipe to look around, SPRING to jump, the dog trots along. STAD brings you back to the bird's-eye town.
import { createControls } from '../3d/controls.js';
import { createAvontuurScene } from '../3d/scene-avontuur.js';
import { setFlag } from '../economy.js';

export function createAvontuur(game) {
  const el = document.getElementById('screen-avontuur');
  const host = document.getElementById('avontuur');
  const controls = createControls(el, { stick: document.getElementById('stick'), knob: document.getElementById('stick-knob') });
  const scene3 = createAvontuurScene(game, game.engine, game.scene, controls);
  let raf = 0;
  let visible = false;

  const spring = document.getElementById('av-spring');
  spring.addEventListener('pointerdown', (e) => { e.preventDefault(); controls.pressJump(); });
  spring.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); });
  document.getElementById('av-stad').addEventListener('click', () => {
    game.audio.play('tap');
    game.show('stad');
  });

  function loop(now) {
    if (!visible) return;
    scene3.render(now);
    raf = requestAnimationFrame(loop);
  }
  window.addEventListener('resize', () => { if (visible) scene3.resize(); });

  return {
    show() {
      visible = true;
      scene3.setState(game.state);
      scene3.reset();
      scene3.mount(host);
      game.scene.setMode('avontuur');
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
      game.scene.setMode('stad');
    },
    render(state) { scene3.setState(state); },
    get visible() { return visible; },
    hook: scene3.hook,
  };
}
