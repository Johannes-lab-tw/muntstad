// start.js — first run: pick a colour + optional name (skipping is the big button). Returning: "VERDER SPELEN".
// The town itself lives and breathes behind the panel (a second scene instance renders into the background).
import { avatarSprite } from '../art/sprites.js';
import { createScene } from '../scene.js';
import { setProfile, setFlag } from '../economy.js';

export function createStart(game) {
  const avatar = document.getElementById('start-avatar');
  const newBox = document.getElementById('start-new');
  const colorRow = document.getElementById('color-row');
  const nameInput = document.getElementById('name-input');
  const btn = document.getElementById('btn-start');
  const bg = document.getElementById('start-canvas');
  let color = game.config.colors[0].id;
  let bgScene = null;
  let raf = 0;
  let visible = false;
  let last = 0;

  function hexOf(id) {
    return (game.config.colors.find((c) => c.id === id) || game.config.colors[0]).hex;
  }

  function drawAvatar() {
    const s = game.state;
    avatar.innerHTML = '';
    const img = new Image();
    img.alt = '';
    img.draggable = false;
    img.src = avatarSprite({ color: hexOf(color), hat: s.equipped.hat, skin: s.equipped.skin, pose: 'wave' }, 200);
    avatar.appendChild(img);
    avatar.classList.add('wave');
  }

  colorRow.innerHTML = '';
  for (const c of game.config.colors) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'color-btn';
    b.style.setProperty('--c', c.hex);
    b.dataset.color = c.id;
    b.setAttribute('aria-label', c.id);
    b.addEventListener('click', () => {
      game.audio.play('pop');
      color = c.id;
      for (const x of colorRow.children) x.classList.toggle('selected', x === b);
      drawAvatar();
      if (bgScene) bgScene.setState({ ...game.state, color });
    });
    colorRow.appendChild(b);
  }

  btn.addEventListener('click', () => {
    game.unlockMedia();
    game.audio.play('buy');
    const returning = !!game.state.flags.started;
    const name = nameInput.value.trim().slice(0, 12);
    game.update((s) => setFlag(setProfile(s, { name: returning ? s.name : name, color: returning ? s.color : color }), 'started', true));
    game.save();
    game.show('stad');
    setTimeout(() => game.mentor.say(returning ? 'lines.welcomeBack' : 'lines.start', {}, { kind: 'reaction' }), 300);
  });

  function loop(now) {
    if (!visible) return;
    // the background town runs at ~30 fps: plenty for a backdrop, gentle on the battery
    if (now - last > 30) {
      last = now;
      bgScene.render(now);
    }
    raf = requestAnimationFrame(loop);
  }

  function ensureScene() {
    if (bgScene) return;
    const quiet = {
      config: game.config,
      audio: { play() {} },
      isUnlocked: (id) => game.isUnlocked(id),
      walletPoint: () => ({ x: 80, y: 60 }),
      bumpWallet() {},
    };
    bgScene = createScene(bg, quiet);
  }

  window.addEventListener('resize', () => { if (visible && bgScene) bgScene.resize(); });

  return {
    show() {
      visible = true;
      const s = game.state;
      const returning = !!s.flags.started;
      color = s.color;
      newBox.hidden = returning;
      btn.closest('.start-panel').classList.toggle('returning', returning);
      btn.textContent = returning ? game.t('ui.verderSpelen') : game.t('ui.speelStart');
      for (const x of colorRow.children) x.classList.toggle('selected', x.dataset.color === color);
      nameInput.value = s.name || '';
      drawAvatar();
      ensureScene();
      bgScene.setState(s);
      bgScene.resize();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    },
    hide() {
      visible = false;
      cancelAnimationFrame(raf);
      raf = 0;
      nameInput.blur();
    },
    render(s) {
      if (visible && bgScene) bgScene.setState({ ...s, color });
    },
  };
}
