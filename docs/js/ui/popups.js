// popups.js — offline earnings (count-up + TOP!), milestone celebrations (fanfare, confetti, sticker), building card.
import { formatCoins, makerById, makerLevel, makerIncome, upgradePrice, bankGrow, bankDeposit, bankWithdraw } from '../economy.js';
import { makerSprite } from '../3d/thumbs.js';

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

  /** The savings bank (V6.4): the pot, the growth so far, ERIN steps, ALLES ERIN, OPHALEN. */
  function bank() {
    if (open) return;
    const grown = bankGrow(game.state, game.config, game.now());
    if (grown.growth > 0) { game.update(() => grown.state); game.save(); }
    present((box) => {
      box.dataset.popup = 'bank';
      box.appendChild(el('div', 'popup-icon', '🏦'));
      box.appendChild(el('h2', 'popup-title', game.t('popups.bankTitle')));
      box.appendChild(el('p', 'popup-text', game.t('popups.bankText')));
      const saldo = el('p', 'bcard-income');
      const earned = el('p', 'popup-text');
      const refresh = () => {
        const b = game.state.bank || { saldo: 0, earned: 0 };
        saldo.textContent = `${game.t('popups.bankSaldo')} ${formatCoins(Math.floor(b.saldo))} 🪙`;
        earned.textContent = `${game.t('popups.bankEarned')} ${formatCoins(Math.floor(b.earned || 0))} 🪙`;
        for (const [n, btn] of stepBtns) btn.classList.toggle('dim', Math.floor(game.state.wallet) < n);
        outBtn.classList.toggle('dim', b.saldo <= 0);
        allBtn.classList.toggle('dim', Math.floor(game.state.wallet) < 1);
      };
      box.appendChild(saldo);
      box.appendChild(earned);
      if (grown.growth > 0) box.appendChild(el('p', 'popup-text', game.t('popups.bankGrew', { n: formatCoins(grown.growth) })));
      const row = el('div', 'row');
      const stepBtns = [];
      const put = (n) => {
        const r = bankDeposit(game.state, game.config, n);
        if (!r.ok) { box.classList.add('shake'); setTimeout(() => box.classList.remove('shake'), 500); return; }
        game.audio.play('buy');
        game.update(() => r.state);
        game.save();
        game.bumpWallet();
        refresh();
      };
      for (const n of game.config.bank.steps) {
        const b = button(`${game.t('popups.inleg')} ${formatCoins(n)}`, 'btn-primary btn-lg', () => put(n));
        b.dataset.bank = String(n);
        stepBtns.push([n, b]);
        row.appendChild(b);
      }
      box.appendChild(row);
      const row2 = el('div', 'row');
      const allBtn = button(game.t('popups.alles'), 'btn-success btn-lg', () => put(Math.floor(game.state.wallet)));
      allBtn.dataset.bank = 'alles';
      const outBtn = button(game.t('popups.ophalen'), 'btn-orange btn-lg', () => {
        const r = bankWithdraw(game.state);
        if (!r.ok) { box.classList.add('shake'); setTimeout(() => box.classList.remove('shake'), 500); return; }
        game.audio.play('upgrade');
        game.update(() => r.state);
        game.save();
        game.bumpWallet();
        refresh();
      });
      outBtn.dataset.bank = 'ophalen';
      row2.appendChild(allBtn);
      row2.appendChild(outBtn);
      box.appendChild(row2);
      box.appendChild(button(game.t('ui.dicht'), 'btn-secondary btn-lg', close));
      refresh();
      if (!game.state.flags.bankHint) { game.update((s) => ({ ...s, flags: { ...s.flags, bankHint: true } })); game.mentor.say('lines.bankHint', {}, { kind: 'reaction' }); }
    });
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && (popup.dataset.popup === 'building' || popup.dataset.popup === 'bank')) close();
  });

  return { offline, milestone, building, bank, close, get isOpen() { return open; } };
}
