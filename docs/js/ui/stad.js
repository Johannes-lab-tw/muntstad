// stad.js — the town screen: canvas scene, building cards, bottom bar (WERK · WINKEL · HUIS · PAPA hold-gate), idle tips.
import { nextMakerTarget, ownedMakerCount, ownedFunIds, setFlag } from '../economy.js';

export function createStad(game) {
  const el = document.getElementById('screen-stad');
  const canvas = document.getElementById('town');
  const papaBtn = document.getElementById('nav-papa');
  const papaRing = document.getElementById('papa-ring');
  let raf = 0;
  let visible = false;
  let lastInteraction = 0;
  let idleTimer = 0;

  // ---- navigation ----
  for (const [id, screen] of [['nav-werk', 'werk'], ['nav-winkel', 'winkel'], ['nav-huis', 'huis']]) {
    document.getElementById(id).addEventListener('click', () => {
      game.audio.play('tap');
      game.show(screen);
    });
  }

  // ---- PAPA: hold 3 s (long-press is reserved for the parent gate) ----
  let holdStart = 0;
  let holdRaf = 0;
  function holdFrame() {
    const p = Math.min(1, (performance.now() - holdStart) / game.config.papa.holdMs);
    papaRing.style.setProperty('--p', String(Math.round(p * 100)));
    if (p >= 1) {
      cancelHold();
      game.audio.play('unlock');
      game.show('gate');
      return;
    }
    holdRaf = requestAnimationFrame(holdFrame);
  }
  function startHold(e) {
    if (e && e.pointerType === 'mouse' && e.button !== 0) return;
    holdStart = performance.now();
    cancelAnimationFrame(holdRaf);
    holdRaf = requestAnimationFrame(holdFrame);
    try { papaBtn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }
  function cancelHold() {
    cancelAnimationFrame(holdRaf);
    holdRaf = 0;
    papaRing.style.setProperty('--p', '0');
  }
  papaBtn.addEventListener('pointerdown', startHold);
  papaBtn.addEventListener('pointerup', cancelHold);
  papaBtn.addEventListener('pointercancel', cancelHold);
  papaBtn.addEventListener('pointerleave', cancelHold);
  papaBtn.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---- taps on the town ----
  canvas.addEventListener('pointerdown', (e) => {
    lastInteraction = game.now();
    const rect = canvas.getBoundingClientRect();
    const hit = game.scene.hitTest(e.clientX - rect.left, e.clientY - rect.top);
    if (!hit) return;
    if (hit.type === 'maker') {
      game.audio.play('tap');
      game.update((s) => setFlag(s, 'tappedBuilding', true));
      game.popups.building(hit.id);
    } else if (hit.type === 'house') {
      game.audio.play('tap');
      game.show('huis');
    } else if (hit.type === 'avatar') {
      game.audio.play('jump');
    }
  });

  // ---- idle tips (gentle, rate-limited by the mentor) ----
  function idleCheck() {
    if (!visible || game.popups.isOpen) return;
    const s = game.state;
    if (game.now() - lastInteraction < 20000) return;
    const target = nextMakerTarget(s, game.config);
    if (target && target.unlocked && target.missing === 0 && !s.flags[`afford-${target.maker.id}`]) {
      if (game.mentor.say('lines.tipAfford', { ding: target.maker.name.toLowerCase() }, { kind: 'tip' })) {
        game.update((x) => setFlag(x, `afford-${target.maker.id}`, true));
      }
      return;
    }
    if (ownedMakerCount(s, game.config) >= 1 && !s.flags.tappedBuilding && !s.flags.tipBuilding) {
      if (game.mentor.say('lines.tipBuilding', {}, { kind: 'tip' })) game.update((x) => setFlag(x, 'tipBuilding', true));
      return;
    }
    if (ownedFunIds(s, game.config).length >= 1 && !s.flags.visitedHuis && !s.flags.tipHouse) {
      if (game.mentor.say('lines.tipHouse', {}, { kind: 'tip' })) game.update((x) => setFlag(x, 'tipHouse', true));
    }
  }

  function loop(now) {
    if (!visible) return;
    game.scene.render(now);
    raf = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => { if (visible) game.scene.resize(); });

  return {
    show() {
      visible = true;
      lastInteraction = game.now();
      game.scene.resize();
      game.scene.setState(game.state);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
      clearInterval(idleTimer);
      idleTimer = setInterval(idleCheck, 5000);
    },
    hide() {
      visible = false;
      cancelAnimationFrame(raf);
      raf = 0;
      clearInterval(idleTimer);
      cancelHold();
    },
    render(state) {
      game.scene.setState(state);
    },
    get visible() { return visible; },
  };
}
