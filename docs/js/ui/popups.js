// popups.js — offline earnings (count-up + TOP!), milestone celebrations (fanfare, confetti, sticker), building card.
import { formatCoins, makerById, makerLevel, makerIncome, upgradePrice } from '../economy.js';

export function createPopups(game) {
  const overlay = document.getElementById('overlay');
  const popup = document.getElementById('popup');
  const queue = [];
  let open = false;
  let countTimer = 0;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function button(label, cls, onClick) {
    const b = el('button', `btn ${cls}`, label);
    b.type = 'button';
    b.addEventListener('click', () => {
      game.audio.play('tap');
      onClick();
    });
    return b;
  }

  function close() {
    overlay.hidden = true;
    popup.innerHTML = '';
    open = false;
    cancelAnimationFrame(countTimer);
    if (queue.length) {
      const next = queue.shift();
      setTimeout(() => next(), 250);
    }
  }

  function present(build) {
    if (open) {
      queue.push(() => present(build));
      return;
    }
    open = true;
    popup.innerHTML = '';
    build(popup);
    overlay.hidden = false;
  }

  function countUp(node, to, ms = 1400) {
    const t0 = performance.now();
    function step(now) {
      const f = Math.min(1, (now - t0) / ms);
      const ease = 1 - Math.pow(1 - f, 3);
      node.textContent = `+${formatCoins(Math.round(to * ease))} 🪙`;
      if (f < 1) countTimer = requestAnimationFrame(step);
    }
    countTimer = requestAnimationFrame(step);
  }

  function offline(earned, elapsedMs) {
    const n = Math.floor(earned);
    if (n < 1) return;
    present((box) => {
      box.dataset.popup = 'offline';
      box.appendChild(el('h2', 'popup-title', game.t('popups.offlineTitle')));
      const mins = Math.round(elapsedMs / 60000);
      const hours = Math.floor(mins / 60);
      const rest = mins % 60;
      const when = hours > 0 ? `${hours} uur${rest ? ` en ${rest} minuten` : ''}` : `${mins} minuten`;
      box.appendChild(el('p', 'popup-text', `Je was ${when} weg. Je geldmakers maakten:`));
      const big = el('div', 'popup-big', '+0 🪙');
      big.id = 'offline-amount';
      box.appendChild(big);
      box.appendChild(el('div', 'popup-icon', '🏭💰'));
      box.appendChild(button(game.t('ui.top'), 'btn-primary btn-xl', close));
      countUp(big, n);
      game.audio.play('coin');
      game.mentor.say('lines.offline', { n: formatCoins(n) });
    });
  }

  function milestone(id) {
    const m = game.config.milestones.find((x) => x.id === id);
    if (!m) return;
    present((box) => {
      box.dataset.popup = 'milestone';
      box.appendChild(el('h2', 'popup-title', m.title));
      box.appendChild(el('div', 'popup-icon', m.sticker));
      box.appendChild(el('p', 'popup-text', `Sticker voor op je muur in HUIS!`));
      box.appendChild(button(game.t('ui.top'), 'btn-primary btn-xl', close));
      game.audio.play('fanfare');
      game.fx.confetti();
      game.mentor.sayText(game.t(`milestones.${id}`));
    });
  }

  function building(id) {
    const maker = makerById(game.config, id);
    if (!maker || open) return;
    present((box) => {
      box.dataset.popup = 'building';
      const state = game.state;
      const level = makerLevel(state, id);
      box.appendChild(el('div', 'popup-icon', maker.icon));
      box.appendChild(el('h2', 'popup-title', maker.name));
      if (level === 0) {
        if (game.isUnlocked(id)) {
          box.appendChild(el('p', 'bcard-income', `${maker.income[0]} ${game.t('ui.perMinuut')}`));
          box.appendChild(el('p', 'popup-text', `${maker.price} 🪙`));
          box.appendChild(button(`${game.t('ui.koop')} ${maker.price} 🪙`, 'btn-primary btn-xl', () => {
            const r = game.buy('maker', id);
            if (r.ok) close();
            else box.classList.add('shake'), setTimeout(() => box.classList.remove('shake'), 500);
          }));
        } else {
          box.appendChild(el('p', 'popup-text', game.t('popups.buildingLocked', { n: formatCoins(maker.price) })));
          box.appendChild(el('div', 'popup-icon', '🔒'));
        }
      } else {
        box.appendChild(el('div', 'bcard-stars', '⭐'.repeat(level)));
        box.appendChild(el('p', 'bcard-income', `${formatCoins(makerIncome(maker, level))} ${game.t('ui.perMinuut')}`));
        if (level < game.config.maxLevel) {
          const price = upgradePrice(maker, level);
          box.appendChild(el('p', 'popup-text', game.t('popups.buildingNext', { n: level + 1, inc: formatCoins(maker.income[level]) })));
          box.appendChild(button(`${game.t('ui.upgrade')} ${formatCoins(price)} 🪙`, 'btn-success btn-xl', () => {
            const r = game.buy('upgrade', id);
            if (r.ok) { close(); }
            else { box.classList.add('shake'); setTimeout(() => box.classList.remove('shake'), 500); }
          }));
        } else {
          box.appendChild(el('p', 'popup-text', game.t('ui.max')));
        }
      }
      box.appendChild(button(game.t('ui.dicht'), 'btn-secondary btn-lg', close));
    });
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && popup.dataset.popup === 'building') close();
  });

  return { offline, milestone, building, close, get isOpen() { return open; } };
}
