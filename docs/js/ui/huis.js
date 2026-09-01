// huis.js — the child's house and yard: paint, garden items, pets with idle animation, the avatar with hat/skin,
// trampoline (tap → jump), fireworks, dance moves, and the sticker wall of milestones. Pure joy screen.
import { avatarSVG, petSVG, houseSVG, trampolineSVG } from '../art.js';
import { isFunActive, setFlag } from '../economy.js';

const GARDEN_SLOTS = [[6, 74], [14, 84], [28, 88], [40, 80], [50, 90], [60, 84], [84, 92], [90, 78], [4, 56], [70, 74], [22, 70], [78, 66]];
const PET_SLOTS = [[56, 66], [36, 70], [62, 80]];

export function createHuis(game) {
  const scene = document.getElementById('huis-scene');
  const stickerGrid = document.getElementById('sticker-grid');
  const actions = document.getElementById('huis-actions');
  let signature = '';
  let avatarEl = null;

  document.getElementById('huis-stad').addEventListener('click', () => { game.audio.play('tap'); game.show('stad'); });
  document.getElementById('huis-winkel').addEventListener('click', () => { game.audio.play('tap'); game.show('winkel'); });

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function svgEl(svg, cls, left, top) {
    const wrap = el('div', cls);
    wrap.innerHTML = svg;
    const s = wrap.firstElementChild;
    s.classList.add(cls);
    s.style.left = `${left}%`;
    s.style.top = `${top}%`;
    return s;
  }

  function animate(node, cls, ms) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
    setTimeout(() => node.classList.remove(cls), ms);
  }

  function jump() {
    if (!avatarEl) return;
    game.audio.play('jump');
    animate(avatarEl, 'jump', 800);
    game.mentor.say('lines.trampoline', {}, { kind: 'tip' });
  }

  function fireworks() {
    game.audio.play('firework');
    const rect = scene.getBoundingClientRect();
    const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#f472b6', '#fde047'];
    for (let burst = 0; burst < 3; burst++) {
      setTimeout(() => {
        const cx = rect.width * (0.25 + Math.random() * 0.5);
        const cy = rect.height * (0.15 + Math.random() * 0.25);
        for (let i = 0; i < 10; i++) {
          const p = el('span', 'firework');
          const a = (i / 10) * Math.PI * 2;
          const r = 90 + Math.random() * 70;
          p.style.left = `${cx}px`;
          p.style.top = `${cy}px`;
          p.style.background = colors[(i + burst) % colors.length];
          p.style.setProperty('--dx', `${Math.cos(a) * r}px`);
          p.style.setProperty('--dy', `${Math.sin(a) * r + 40}px`);
          scene.appendChild(p);
          setTimeout(() => p.remove(), 1100);
        }
        if (burst > 0) game.audio.play('firework');
      }, burst * 350);
    }
    game.mentor.say('lines.fireworks', {}, { kind: 'tip' });
  }

  function build(state) {
    scene.innerHTML = '';
    actions.innerHTML = '';
    const colorHex = (game.config.colors.find((c) => c.id === state.color) || game.config.colors[0]).hex;
    // house
    const house = svgEl(houseSVG(state.equipped.paint || 'none'), 'house', 10, 14);
    scene.appendChild(house);
    // garden items
    let slot = 0;
    for (const f of game.config.fun) {
      if (f.kind !== 'garden' || !state.fun[f.id] || !isFunActive(state, game.config, f.id)) continue;
      const [x, y] = GARDEN_SLOTS[slot % GARDEN_SLOTS.length];
      slot++;
      const g = el('div', 'garden-item', f.icon);
      g.dataset.item = f.id;
      g.style.left = `${x}%`;
      g.style.top = `${y}%`;
      g.style.transform = 'translate(-50%, -100%)';
      scene.appendChild(g);
    }
    // trampoline
    if (state.fun.trampoline) {
      const tr = el('div', 'trampoline');
      tr.innerHTML = trampolineSVG();
      tr.dataset.item = 'trampoline';
      tr.addEventListener('pointerdown', jump);
      scene.appendChild(tr);
    }
    // pets
    let p = 0;
    for (const f of game.config.fun) {
      if (f.kind !== 'pet' || !state.fun[f.id] || !isFunActive(state, game.config, f.id)) continue;
      const [x, y] = PET_SLOTS[p % PET_SLOTS.length];
      p++;
      const pet = svgEl(petSVG(f.id), 'pet', x, y);
      pet.dataset.item = f.id;
      pet.style.transform = 'translate(-50%, -100%)';
      if (state.petHungry) {
        pet.classList.add('sleep');
        const z = el('div', 'zzz', '💤');
        z.style.left = `${x + 4}%`;
        z.style.top = `${y - 16}%`;
        scene.appendChild(z);
      }
      pet.addEventListener('pointerdown', () => {
        game.audio.play('pop');
        animate(pet, 'jump', 800);
      });
      scene.appendChild(pet);
    }
    // avatar
    avatarEl = svgEl(avatarSVG({ color: colorHex, hat: state.equipped.hat, skin: state.equipped.skin }), 'avatar', 46, 50);
    avatarEl.style.transform = 'translate(-50%, -100%)';
    avatarEl.dataset.hat = state.equipped.hat || '';
    avatarEl.dataset.skin = state.equipped.skin || '';
    avatarEl.addEventListener('pointerdown', jump);
    scene.appendChild(avatarEl);
    // action buttons for owned toys
    if (state.fun.trampoline) actions.appendChild(actionButton(`🦘 ${game.t('fun.spring')}`, 'btn-secondary', jump));
    if (state.fun.vuurwerk) actions.appendChild(actionButton(`🎆 ${game.t('fun.vuurwerk')}`, 'btn-primary', fireworks));
    if (state.fun.dansje) actions.appendChild(actionButton(`🕺 ${game.t('fun.dansje')}`, 'btn-success', () => { game.audio.play('buy'); animate(avatarEl, 'dance', 2500); }));
    if (state.fun.salto) actions.appendChild(actionButton(`🤸 ${game.t('fun.salto')}`, 'btn-success', () => { game.audio.play('whoosh'); animate(avatarEl, 'salto', 1100); }));
    // stickers
    stickerGrid.innerHTML = '';
    for (const m of game.config.milestones) {
      const got = state.milestones.includes(m.id);
      const s = el('div', 'sticker' + (got ? ' got' : ''), got ? m.sticker : '');
      s.dataset.milestone = m.id;
      s.title = m.title;
      stickerGrid.appendChild(s);
    }
  }

  function actionButton(label, cls, fn) {
    const b = el('button', `btn btn-lg ${cls}`, label);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  function sig(state) {
    return JSON.stringify([state.color, state.equipped, Object.keys(state.fun), state.hidden, state.petHungry, state.milestones]);
  }

  return {
    show() {
      signature = '';
      this.render(game.state);
      if (!game.state.flags.visitedHuis) game.update((s) => setFlag(s, 'visitedHuis', true));
    },
    hide() {},
    render(state) {
      const s = sig(state);
      if (s === signature) return;
      signature = s;
      build(state);
    },
  };
}
