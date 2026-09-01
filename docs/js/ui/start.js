// start.js — first run: pick a colour + optional name (skipping is the big button). Returning: "VERDER SPELEN".
import { avatarSVG } from '../art.js';
import { setProfile, setFlag } from '../economy.js';

export function createStart(game) {
  const el = document.getElementById('screen-start');
  const avatar = document.getElementById('start-avatar');
  const newBox = document.getElementById('start-new');
  const colorRow = document.getElementById('color-row');
  const nameInput = document.getElementById('name-input');
  const btn = document.getElementById('btn-start');
  let color = game.config.colors[0].id;

  function drawAvatar() {
    const hex = (game.config.colors.find((c) => c.id === color) || game.config.colors[0]).hex;
    const s = game.state;
    avatar.innerHTML = avatarSVG({ color: hex, hat: s.equipped.hat, skin: s.equipped.skin, wave: true });
    avatar.classList.add('wave');
  }

  colorRow.innerHTML = '';
  for (const c of game.config.colors) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'color-btn';
    b.style.background = c.hex;
    b.dataset.color = c.id;
    b.setAttribute('aria-label', c.id);
    b.addEventListener('click', () => {
      game.audio.play('pop');
      color = c.id;
      for (const x of colorRow.children) x.classList.toggle('selected', x === b);
      drawAvatar();
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

  return {
    show() {
      const s = game.state;
      const returning = !!s.flags.started;
      color = s.color;
      newBox.hidden = returning;
      btn.textContent = returning ? game.t('ui.verderSpelen') : game.t('ui.speelStart');
      for (const x of colorRow.children) x.classList.toggle('selected', x.dataset.color === color);
      nameInput.value = s.name || '';
      drawAvatar();
    },
    hide() {
      nameInput.blur();
    },
    render() {},
  };
}
