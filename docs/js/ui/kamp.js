// ui/kamp.js — the campfire as a real screen (V6.1): two tabs, VERKOPEN (what is in the backpack, per item and all at
// once) and KOPEN (the tools and camp upgrades), big cards four per page with arrows, DICHT back to the island.
// Lives as a full-screen layer inside the AVONTUUR screen, so the island stays where you left it.
import { bagValue, sellAll, buyTool, toolById, bagCount } from '../eiland.js';
import { formatCoins } from '../economy.js';

const PER_PAGE = 4;

export function createKamp(game, onChange) {
  const overlay = document.getElementById('kamp-overlay');
  const tabSell = document.getElementById('kamp-tab-verkopen');
  const tabBuy = document.getElementById('kamp-tab-kopen');
  const grid = document.getElementById('kamp-grid');
  const prev = document.getElementById('kamp-prev');
  const next = document.getElementById('kamp-next');
  const dots = document.getElementById('kamp-dots');
  const allBtn = document.getElementById('kamp-alles');
  const T = game.T;
  let open = false;
  let tab = 'verkopen';
  let page = 0;

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  function items() {
    const cfg = game.config.eiland;
    const e = game.state.eiland;
    if (tab === 'verkopen') return Object.entries(cfg.items).filter(([id]) => e.bag[id] > 0).map(([id, it]) => ({ id, it }));
    return cfg.tools.map((t) => ({ id: t.id, it: t }));
  }
  function pageCount() { return Math.max(1, Math.ceil(items().length / PER_PAGE)); }

  function sellOne(id) {
    const cfg = game.config.eiland;
    const e = game.state.eiland;
    const n = e.bag[id] || 0;
    if (n <= 0) return;
    const coins = n * cfg.items[id].price;
    game.audio.play('buy');
    for (let i = 0; i < Math.min(6, 2 + Math.floor(coins / 10)); i++) setTimeout(() => game.audio.play('coin'), 120 + i * 90);
    const p = game.walletPoint();
    game.fx.floatText(p.x + 40, p.y + 30, `+${formatCoins(coins)}`, '#2a9d3a');
    game.bumpWallet();
    game.update((s) => ({ ...s, wallet: s.wallet + coins, earnedWork: s.earnedWork + coins, eiland: { ...s.eiland, bag: { ...s.eiland.bag, [id]: 0 }, sold: s.eiland.sold + coins, earned: s.eiland.earned + coins } }));
    game.save();
    afterSell();
  }
  function sellEverything() {
    const r = sellAll(game.state, game.config);
    if (r.coins <= 0) return;
    game.audio.play('buy');
    for (let i = 0; i < Math.min(8, 2 + Math.floor(r.coins / 10)); i++) setTimeout(() => game.audio.play('coin'), 120 + i * 90);
    const p = game.walletPoint();
    game.fx.floatText(p.x + 40, p.y + 30, `+${formatCoins(r.coins)}`, '#2a9d3a');
    game.bumpWallet();
    game.update(() => r.state);
    game.save();
    afterSell();
  }
  function afterSell() {
    if (!game.state.flags.firstSell) {
      game.update((x) => ({ ...x, flags: { ...x.flags, firstSell: true } }));
      game.mentor.say('lines.firstSell', {}, { kind: 'reaction' });
    }
    onChange && onChange('sell');
    page = Math.min(page, pageCount() - 1);
    build();
  }
  function buy(id) {
    const r = buyTool(game.state, game.config, id);
    if (!r.ok) {
      game.audio.play('thud');
      if (r.reason === 'coins') game.mentor.say('lines.notEnough', { n: formatCoins(r.missing) }, { kind: 'reaction' });
      return;
    }
    const tool = toolById(game.config, id);
    game.audio.play('buy');
    game.update(() => r.state);
    game.save();
    game.mentor.say('lines.toolBought', { ding: tool.name.toLowerCase(), tekst: tool.tekst }, { kind: 'reaction' });
    onChange && onChange('tool', id);
    build();
  }

  function build() {
    const s = game.state;
    const cfg = game.config.eiland;
    const e = s.eiland;
    tabSell.classList.toggle('active', tab === 'verkopen');
    tabBuy.classList.toggle('active', tab === 'kopen');
    grid.innerHTML = '';
    const list = items();
    const pages = pageCount();
    page = Math.min(page, pages - 1);
    const shown = list.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
    if (tab === 'verkopen' && !list.length) {
      const empty = el('div', 'kamp-empty', T.popups.kampEmpty);
      grid.appendChild(empty);
    }
    for (const { id, it } of shown) {
      const card = el('div', 'card');
      card.dataset.id = id;
      const icon = el('div', 'card-emoji', it.icon);
      const name = el('div', 'card-name', it.name);
      const sub = el('div', 'card-sub');
      const price = el('div', 'card-price');
      const btn = el('button', 'btn btn-primary');
      btn.type = 'button';
      if (tab === 'verkopen') {
        const n = e.bag[id];
        sub.textContent = `${n} × ${it.name.toLowerCase()}`;
        price.textContent = `${formatCoins(n * it.price)} 🪙`;
        btn.textContent = 'VERKOOP';
        btn.className = 'btn btn-success';
        btn.addEventListener('click', () => sellOne(id));
      } else {
        const owned = !!e.tools[id];
        const can = s.wallet >= it.price;
        sub.textContent = it.tekst;
        if (owned) {
          card.classList.add('owned');
          price.textContent = T.popups.kampOwned;
          btn.textContent = '✔';
          btn.className = 'btn btn-grey';
          btn.disabled = true;
        } else {
          price.textContent = `${formatCoins(it.price)} 🪙`;
          btn.textContent = 'KOOP';
          btn.className = `btn btn-primary${can ? ' glow' : ' dim'}`;
          if (can) card.classList.add('can');
          btn.dataset.tool = id;
          btn.addEventListener('click', () => buy(id));
        }
      }
      card.append(icon, name, sub, price, btn);
      grid.appendChild(card);
    }
    prev.hidden = pages < 2;
    next.hidden = pages < 2;
    dots.hidden = pages < 2;
    dots.innerHTML = '';
    for (let i = 0; i < pages; i++) dots.appendChild(el('span', `dot${i === page ? ' on' : ''}`));
    allBtn.hidden = tab !== 'verkopen' || bagCount(e) === 0;
    allBtn.textContent = `ALLES ${formatCoins(bagValue(e, game.config))} 🪙`;
  }

  tabSell.addEventListener('click', () => { game.audio.play('tap'); tab = 'verkopen'; page = 0; build(); });
  tabBuy.addEventListener('click', () => { game.audio.play('tap'); tab = 'kopen'; page = 0; build(); });
  prev.addEventListener('click', () => { game.audio.play('tap'); page = (page - 1 + pageCount()) % pageCount(); build(); });
  next.addEventListener('click', () => { game.audio.play('tap'); page = (page + 1) % pageCount(); build(); });
  allBtn.addEventListener('click', sellEverything);
  document.getElementById('kamp-dicht').addEventListener('click', () => { game.audio.play('tap'); close(); });

  function show() {
    open = true;
    tab = bagCount(game.state.eiland) > 0 ? 'verkopen' : 'kopen';
    page = 0;
    build();
    overlay.hidden = false;
  }
  function close() {
    if (!open) return;
    open = false;
    overlay.hidden = true;
    grid.innerHTML = '';
    onChange && onChange('close');
  }

  return { show, close, build, get isOpen() { return open; } };
}
