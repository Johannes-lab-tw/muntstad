// ui/kamp.js — the campfire panel on the island: sell the backpack for coins, buy tools with the shared wallet.
// Same look as the popups (panel/popup classes), its own overlay inside the AVONTUUR screen.
import { bagValue, sellAll, buyTool, toolById } from '../eiland.js';
import { formatCoins } from '../economy.js';

export function createKamp(game, onChange) {
  const overlay = document.getElementById('kamp-overlay');
  const panel = document.getElementById('kamp');
  const T = game.T;
  let open = false;

  function render() {
    const s = game.state;
    const cfg = game.config.eiland;
    const e = s.eiland;
    const value = bagValue(e, game.config);
    const items = Object.entries(cfg.items).filter(([id]) => e.bag[id] > 0);
    const sellHtml = items.length
      ? `<div class="kamp-items">${items.map(([id, it]) => `<div class="kamp-item"><span class="ic">${it.icon}</span><span>${e.bag[id]} × ${it.name.toLowerCase()}</span><span class="tot">${formatCoins(e.bag[id] * it.price)} 🪙</span></div>`).join('')}</div>
         <div class="kamp-total">Samen ${formatCoins(value)} 🪙</div>
         <button class="btn btn-success btn-lg" id="kamp-verkoop" type="button">VERKOOP</button>`
      : `<p class="popup-text">${T.popups.kampEmpty}</p>`;
    const toolsHtml = cfg.tools.map((t) => {
      const owned = !!e.tools[t.id];
      const can = s.wallet >= t.price;
      const btn = owned
        ? `<button class="btn btn-grey btn-lg" type="button" disabled>✔ ${T.popups.kampOwned.toUpperCase()}</button>`
        : `<button class="btn ${can ? 'btn-primary' : 'btn-primary dim'} btn-lg" type="button" data-tool="${t.id}">KOOP ${formatCoins(t.price)}</button>`;
      return `<div class="kamp-tool"><span class="ic">${t.icon}</span><span class="txt"><b>${t.name}</b>${t.tekst}</span>${btn}</div>`;
    }).join('');
    panel.innerHTML = `
      <h2 class="popup-title">🔥 ${T.popups.kampTitle}</h2>
      <div class="kamp-cols">
        <div><h3>${T.popups.kampSell}</h3>${sellHtml}</div>
        <div><h3>${T.popups.kampBuy}</h3><div class="kamp-tools">${toolsHtml}</div></div>
      </div>
      <div class="kamp-foot"><button class="btn btn-secondary btn-lg" id="kamp-dicht" type="button">DICHT</button></div>`;
    panel.querySelector('#kamp-dicht').addEventListener('click', close);
    const sell = panel.querySelector('#kamp-verkoop');
    if (sell) sell.addEventListener('click', () => {
      const r = sellAll(game.state, game.config);
      if (r.coins <= 0) return;
      game.audio.play('buy');
      // coins you can hear and see: a short rain of coin sounds and a floating +n at the wallet
      const n = Math.min(8, 2 + Math.floor(r.coins / 10));
      for (let i = 0; i < n; i++) setTimeout(() => game.audio.play('coin'), 120 + i * 90);
      const p = game.walletPoint();
      game.fx.floatText(p.x + 40, p.y + 30, `+${formatCoins(r.coins)}`, '#2a9d3a');
      game.bumpWallet();
      game.update(() => r.state);
      game.save();
      if (!game.state.flags.firstSell) {
        game.update((x) => ({ ...x, flags: { ...x.flags, firstSell: true } }));
        game.mentor.say('lines.firstSell', {}, { kind: 'reaction' });
      }
      onChange && onChange('sell', r.coins);
      render();
    });
    for (const b of panel.querySelectorAll('[data-tool]')) b.addEventListener('click', () => {
      const id = b.dataset.tool;
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
      render();
    });
  }

  function show() {
    open = true;
    render();
    overlay.hidden = false;
  }
  function close() {
    open = false;
    overlay.hidden = true;
    panel.innerHTML = '';
    onChange && onChange('close');
  }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  return { show, close, get isOpen() { return open; } };
}
