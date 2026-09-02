// popups.js — offline earnings (count-up + TOP!), milestone celebrations (fanfare, confetti, sticker), building card.
import { formatCoins, makerById, makerLevel, makerIncome, upgradePrice } from '../economy.js';
import { makerSprite } from '../art/sprites.js';

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

  function coin(cls = 'coin3 sm') {
    return el('span', cls);
  }

  function withCoin(node, text) {
    node.appendChild(document.createTextNode(text));
    node.appendChild(coin());
    return node;
  }

  function sprite(src, cls = 'popup-icon') {
    const img = el('img', cls);
    img.alt = '';
    img.draggable = false;
    img.src = src;
    return img;
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
      node.textContent = `+${formatCoins(Math.round(to * ease))}`;
      if (f < 1) countTimer = requestAnimationFrame(step);
    }
    countTimer = requestAnimationFrame(step);
  }

  function bestMakerId() {
    const s = game.state;
    const owned = game.config.makers.filter((m) => makerLevel(s, m.id) > 0);
    return owned.length ? owned[owned.length - 1].id : game.config.makers[0].id;
  }

  /** "1 minuut", "12 minuten", "2 uur en 5 minuten" */
  function whenText(ms) {
    const mins = Math.max(1, Math.round(ms / 60000));
    const hours = Math.floor(mins / 60);
    const rest = mins % 60;
    const m = (n) => (n === 1 ? game.t('popups.minute') : game.t('popups.minutes', { n }));
    const h = (n) => (n === 1 ? game.t('popups.hour') : game.t('popups.hours', { n }));
    if (hours === 0) return m(mins);
    return rest ? `${h(hours)} ${game.t('popups.and')} ${m(rest)}` : h(hours);
  }

  function offline(earned, elapsedMs, rawElapsedMs = elapsedMs) {
    const n = Math.floor(earned);
    present((box) => {
      box.dataset.popup = 'offline';
      box.appendChild(el('h2', 'popup-title', game.t('popups.offlineTitle')));
      const when = whenText(rawElapsedMs);
      const capped = rawElapsedMs > elapsedMs + 60000;
      if (n < 1) {
        // no coin-maker yet: explain once what one would have done meanwhile
        box.appendChild(el('p', 'popup-text', game.t('popups.away', { when })));
        box.appendChild(sprite(makerSprite(game.config.makers[0].id, 150, 1)));
        box.appendChild(el('p', 'popup-text', game.t('popups.offlineNone')));
        box.appendChild(button(game.t('ui.top'), 'btn-primary btn-xl', close));
        game.mentor.say('lines.offlineNone');
        return;
      }
      const capHours = Math.round(game.config.offlineCapMs / 3600000);
      box.appendChild(el('p', 'popup-text', capped ? game.t('popups.madeCapped', { when, cap: capHours }) : game.t('popups.made', { when })));
      const big = el('div', 'popup-big');
      const amount = el('span', '', '+0');
      amount.id = 'offline-amount';
      big.append(amount, coin('coin3'));
      box.appendChild(big);
      box.appendChild(sprite(makerSprite(bestMakerId(), 150, Math.max(1, makerLevel(game.state, bestMakerId())))));
      box.appendChild(button(game.t('ui.top'), 'btn-primary btn-xl', close));
      countUp(amount, n);
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
      box.appendChild(el('p', 'popup-text', game.t('popups.stickerWall')));
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
      box.appendChild(sprite(makerSprite(id, 150, Math.max(1, level))));
      box.appendChild(el('h2', 'popup-title', maker.name));
      if (level === 0) {
        if (game.isUnlocked(id)) {
          const missing = Math.max(0, maker.price - Math.floor(state.wallet));
          box.appendChild(el('p', 'bcard-income', `${formatCoins(maker.income[0])} ${game.t('ui.perMinuut')}`));
          // same language as the shop card: "nog 12" with a progress bar when the coins are not there yet
          box.appendChild(withCoin(el('p', 'popup-text'), missing > 0 ? `${game.t('ui.nog')} ${formatCoins(missing)} ` : `${formatCoins(maker.price)} `));
          if (missing > 0) {
            const progress = el('div', 'progress');
            progress.style.width = '280px';
            const bar = el('i');
            bar.style.width = `${Math.min(100, (Math.floor(state.wallet) / maker.price) * 100)}%`;
            progress.appendChild(bar);
            box.appendChild(progress);
          }
          const b = button(`${game.t('ui.koop')} ${formatCoins(maker.price)}`, `btn-primary btn-xl${missing > 0 ? ' dim' : ''}`, () => {
            const r = game.buy('maker', id);
            if (r.ok) close();
            else { box.classList.add('shake'); setTimeout(() => box.classList.remove('shake'), 500); }
          });
          b.appendChild(coin());
          box.appendChild(b);
        } else {
          box.appendChild(withCoin(el('p', 'popup-text'), `${game.t('ui.verdienEerst')} ${formatCoins(maker.price)} `));
          box.appendChild(el('div', 'popup-icon', '🔒'));
        }
      } else {
        box.appendChild(el('div', 'bcard-stars', '⭐'.repeat(level)));
        box.appendChild(el('p', 'bcard-income', `${formatCoins(makerIncome(maker, level))} ${game.t('ui.perMinuut')}`));
        if (level < game.config.maxLevel) {
          const price = upgradePrice(maker, level);
          box.appendChild(el('p', 'popup-text', game.t('popups.buildingNext', { n: level + 1, inc: formatCoins(maker.income[level]) })));
          const b = button(`${game.t('ui.upgrade')} ${formatCoins(price)}`, 'btn-success btn-xl', () => {
            const r = game.buy('upgrade', id);
            if (r.ok) close();
            else { box.classList.add('shake'); setTimeout(() => box.classList.remove('shake'), 500); }
          });
          b.appendChild(coin());
          box.appendChild(b);
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
