// winkel.js — the shop: GELDMAKERS and LEUK tabs always visible, paged cards with big arrows.
// Every card shows the item as blocky 3D art (canvas sprite). Unaffordable cards stay visible (dimmed,
// "nog 12" + progress bar); affordable cards glow; owned items show ✓ and AAN/UIT.
import { formatCoins, makerLevel, makerIncome, upgradePrice, isFunActive, nextMakerTarget } from '../economy.js';
import { itemSprite, makerSprite } from '../art/sprites.js';

const PER_PAGE = 8;

export function createWinkel(game) {
  const grid = document.getElementById('shop-grid');
  const tabMakers = document.getElementById('tab-makers');
  const tabFun = document.getElementById('tab-fun');
  const tabHint = document.getElementById('tab-makers-hint');
  const prev = document.getElementById('shop-prev');
  const next = document.getElementById('shop-next');
  const dots = document.getElementById('shop-dots');
  let tab = 'makers';
  let page = 0;
  let cards = [];
  let built = '';

  document.getElementById('shop-stad').addEventListener('click', () => {
    game.audio.play('tap');
    game.show('stad');
  });
  tabMakers.addEventListener('click', () => setTab('makers'));
  tabFun.addEventListener('click', () => setTab('fun'));
  prev.addEventListener('click', () => turn(-1));
  next.addEventListener('click', () => turn(1));

  function avatarColor() {
    const s = game.state;
    return (game.config.colors.find((c) => c.id === s.color) || game.config.colors[0]).hex;
  }

  function setTab(t) {
    game.audio.play('tap');
    tab = t;
    page = 0;
    tabMakers.classList.toggle('active', tab === 'makers');
    tabFun.classList.toggle('active', tab === 'fun');
    build();
  }

  function items() {
    return tab === 'makers' ? game.config.makers : game.config.fun;
  }

  function perPage() {
    return tab === 'makers' ? game.config.makers.length : PER_PAGE;
  }

  function pageCount() {
    return Math.max(1, Math.ceil(items().length / perPage()));
  }

  function turn(dir) {
    game.audio.play('tap');
    const n = pageCount();
    page = (page + dir + n) % n;
    build();
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function coin() {
    return el('span', 'coin3 sm');
  }

  /** Price node: "nog 12 ●" or "20 ●" — text stays selectable by tests, the coin is CSS. */
  function setPrice(node, text) {
    node.innerHTML = '';
    node.appendChild(document.createTextNode(text));
    node.appendChild(coin());
  }

  function shake(card) {
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
  }

  function bump(card) {
    card.classList.remove('bump');
    void card.offsetWidth;
    card.classList.add('bump');
  }

  function build() {
    const key = `${tab}:${page}`;
    grid.innerHTML = '';
    grid.classList.toggle('makers', tab === 'makers');
    cards = [];
    const n = perPage();
    const list = items().slice(page * n, page * n + n);
    for (const item of list) {
      const card = el('div', 'card');
      card.dataset.id = item.id;
      card.dataset.kind = tab === 'makers' ? 'maker' : item.kind;
      const check = el('div', 'card-check', '✓');
      const icon = el('img', 'card-icon');
      icon.alt = '';
      icon.draggable = false;
      icon.src = tab === 'makers' ? makerSprite(item.id, 160, 1) : itemSprite(item, { color: avatarColor() });
      const name = el('div', 'card-name', item.name);
      const sub = el('div', 'card-sub', '');
      const price = el('div', 'card-price', '');
      const progress = el('div', 'progress');
      const bar = el('i');
      progress.appendChild(bar);
      const btn = el('button', 'btn btn-primary');
      btn.type = 'button';
      card.append(check, icon, name, sub, price, progress, btn);
      grid.appendChild(card);
      const c = { item, card, icon, sub, price, progress, bar, btn, check, action: null, level: -1 };
      btn.addEventListener('click', () => {
        if (typeof c.action === 'function') c.action();
      });
      card.addEventListener('pointerdown', () => {
        // a locked card has no button: every tap on it explains what to do (shake + spoken hint)
        if (card.classList.contains('locked')) {
          game.audio.play('thud');
          shake(card);
          game.mentor.say('lines.locked', { n: formatCoins(item.price) }, { kind: 'reaction' });
        }
      });
      cards.push(c);
    }
    built = key;
    const pages = pageCount();
    prev.hidden = pages < 2;
    next.hidden = pages < 2;
    dots.hidden = pages < 2;
    dots.innerHTML = '';
    for (let i = 0; i < pages; i++) {
      const d = el('i');
      if (i === page) d.classList.add('on');
      dots.appendChild(d);
    }
    render(game.state);
  }

  function setBtn(c, label, cls, glow) {
    c.btn.textContent = label;
    c.btn.className = `btn ${cls}${glow ? ' glow' : ''}`;
  }

  function renderMaker(c, state) {
    const m = c.item;
    const level = makerLevel(state, m.id);
    const wallet = Math.floor(state.wallet);
    if (level !== c.level) {
      c.level = level;
      c.icon.src = makerSprite(m.id, 160, Math.max(1, level));
    }
    c.check.hidden = level === 0;
    c.card.classList.toggle('owned', level > 0);
    if (level === 0) {
      const unlocked = game.isUnlocked(m.id);
      c.card.classList.toggle('locked', !unlocked);
      c.sub.textContent = `${formatCoins(m.income[0])} ${game.t('ui.perMinuut')}`;
      if (!unlocked) {
        c.price.textContent = `🔒 ${formatCoins(m.price)} `;
        c.price.appendChild(coin());
        c.progress.hidden = true;
        c.btn.hidden = true;
        c.card.classList.remove('dim', 'can');
        c.action = null;
        return;
      }
      c.btn.hidden = false;
      const missing = Math.max(0, m.price - wallet);
      c.card.classList.toggle('dim', missing > 0);
      c.card.classList.toggle('can', missing === 0);
      setPrice(c.price, missing > 0 ? `${game.t('ui.nog')} ${formatCoins(missing)} ` : `${formatCoins(m.price)} `);
      c.progress.hidden = missing === 0;
      c.bar.style.width = `${Math.min(100, (wallet / m.price) * 100)}%`;
      setBtn(c, game.t('ui.koop'), 'btn-primary' + (missing > 0 ? ' dim' : ''), missing === 0);
      c.action = () => {
        const r = game.buy('maker', m.id);
        if (r.ok) bump(c.card);
        else shake(c.card);
      };
      return;
    }
    c.card.classList.remove('locked');
    c.sub.textContent = `${'⭐'.repeat(level)} · ${formatCoins(makerIncome(m, level))} ${game.t('ui.perMinuut')}`;
    if (level >= game.config.maxLevel) {
      c.price.textContent = game.t('ui.max');
      c.progress.hidden = true;
      c.btn.hidden = true;
      c.card.classList.remove('dim', 'can');
      c.action = null;
      return;
    }
    const price = upgradePrice(m, level);
    const missing = Math.max(0, price - wallet);
    c.btn.hidden = false;
    c.card.classList.toggle('dim', missing > 0);
    c.card.classList.toggle('can', missing === 0);
    setPrice(c.price, missing > 0 ? `${game.t('ui.nog')} ${formatCoins(missing)} ` : `${formatCoins(price)} `);
    c.sub.textContent = `${'⭐'.repeat(level)} ${formatCoins(makerIncome(m, level))} → ${formatCoins(m.income[level])}`;
    c.progress.hidden = missing === 0;
    c.bar.style.width = `${Math.min(100, (wallet / price) * 100)}%`;
    setBtn(c, game.t('ui.upgrade'), 'btn-success' + (missing > 0 ? ' dim' : ''), missing === 0);
    c.action = () => {
      const r = game.buy('upgrade', m.id);
      if (r.ok) bump(c.card);
      else shake(c.card);
    };
  }

  function renderFun(c, state) {
    const f = c.item;
    const owned = !!state.fun[f.id];
    const wallet = Math.floor(state.wallet);
    c.check.hidden = !owned;
    c.card.classList.toggle('owned', owned);
    c.card.classList.remove('locked');
    c.sub.textContent = '';
    if (owned) {
      c.card.classList.remove('dim', 'can');
      c.progress.hidden = true;
      c.btn.hidden = false;
      if (['hat', 'skin', 'vehicle', 'paint', 'garden', 'pet'].includes(f.kind)) {
        // the button shows the state like a switch (AAN = you wear/show it); a tap flips it
        const active = isFunActive(state, game.config, f.id);
        c.price.textContent = '✓';
        setBtn(c, active ? game.t('ui.aan') : game.t('ui.uit'), active ? 'btn-success' : 'btn-grey', false);
        c.action = () => {
          game.audio.play('pop');
          game.toggleFun(f.id);
          bump(c.card);
        };
      } else {
        c.price.textContent = '✓';
        setBtn(c, `${game.t('ui.speel')} 🏠`, 'btn-success', false);
        c.action = () => {
          game.audio.play('tap');
          game.show('huis');
        };
      }
      return;
    }
    const missing = Math.max(0, f.price - wallet);
    c.btn.hidden = false;
    c.card.classList.toggle('dim', missing > 0);
    c.card.classList.toggle('can', missing === 0);
    setPrice(c.price, missing > 0 ? `${game.t('ui.nog')} ${formatCoins(missing)} ` : `${formatCoins(f.price)} `);
    c.progress.hidden = missing === 0;
    c.bar.style.width = `${Math.min(100, (wallet / f.price) * 100)}%`;
    setBtn(c, game.t('ui.koop'), 'btn-primary' + (missing > 0 ? ' dim' : ''), missing === 0);
    c.action = () => {
      const r = game.buy('fun', f.id);
      if (r.ok) {
        bump(c.card);
        const rc = c.card.getBoundingClientRect();
        game.fx.burst(rc.left + rc.width / 2, rc.top + rc.height * 0.4);
      } else shake(c.card);
    };
  }

  function render(state) {
    if (built !== `${tab}:${page}`) return;
    for (const c of cards) {
      if (tab === 'makers') renderMaker(c, state);
      else renderFun(c, state);
    }
    const target = nextMakerTarget(state, game.config);
    tabHint.innerHTML = '';
    if (target) {
      const missing = Math.max(0, target.maker.price - Math.floor(state.wallet));
      const img = el('img');
      img.alt = '';
      img.src = makerSprite(target.maker.id, 64, 1);
      tabHint.appendChild(img);
      tabHint.appendChild(document.createTextNode(target.unlocked
        ? (missing > 0 ? `${game.t('ui.nog')} ${formatCoins(missing)}` : `${game.t('ui.koop')}!`)
        : `🔒 ${formatCoins(target.maker.price)}`));
    }
  }

  return {
    show() {
      page = 0;
      tabMakers.classList.toggle('active', tab === 'makers');
      tabFun.classList.toggle('active', tab === 'fun');
      build();
    },
    hide() {},
    render,
    setTab,
  };
}
