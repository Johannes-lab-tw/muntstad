// papa.js — parent gate (a sum a 6-year-old can't do yet, entered on a keypad) and the PAPA screen:
// stats, conversation starters, toggles, Bewaar-code export/import, double-confirmed RESET.
import { formatCoins, stats, setSetting } from '../economy.js';
import { encodeCode, decodeCode } from '../save.js';

export function createPapa(game) {
  const sumEl = document.getElementById('gate-sum');
  const answerEl = document.getElementById('gate-answer');
  const keypad = document.getElementById('keypad');
  const gatePanel = document.querySelector('.gate-panel');
  const statsEl = document.getElementById('papa-stats');
  const startersEl = document.getElementById('papa-starters');
  const togglesEl = document.getElementById('papa-toggles');
  const codeOut = document.getElementById('code-out');
  const codeIn = document.getElementById('code-in');
  const codeStatus = document.getElementById('code-status');
  const resetConfirm = document.getElementById('reset-confirm');
  let answer = 0;
  let typed = '';

  // ---- gate ----
  function newSum() {
    const { sumMin, sumMax } = game.config.papa;
    let a, b;
    do {
      a = sumMin + Math.floor(Math.random() * (sumMax - sumMin + 1));
      b = sumMin + Math.floor(Math.random() * (sumMax - sumMin + 1));
    } while ((a % 10) + (b % 10) < 10); // always a carry
    answer = a + b;
    typed = '';
    sumEl.textContent = `${a} + ${b}`;
    answerEl.textContent = '?';
  }

  function key(label, cls, fn) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn ${cls}`;
    b.textContent = label;
    b.dataset.key = label;
    b.addEventListener('click', () => { game.audio.play('tap'); fn(); });
    keypad.appendChild(b);
  }
  for (const d of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) key(d, '', () => digit(d));
  key(game.t('ui.wis'), 'btn-secondary', () => { typed = ''; answerEl.textContent = '?'; });
  key('0', '', () => digit('0'));
  key(game.t('ui.ok'), 'btn-primary', check);

  function digit(d) {
    if (typed.length >= 3) return;
    typed += d;
    answerEl.textContent = typed;
  }

  function check() {
    if (Number(typed) === answer) {
      game.audio.play('unlock');
      game.show('papa');
    } else {
      game.audio.play('thud');
      gatePanel.classList.remove('shake');
      void gatePanel.offsetWidth;
      gatePanel.classList.add('shake');
      newSum();
    }
  }

  document.getElementById('gate-stad').addEventListener('click', () => { game.audio.play('tap'); game.show('stad'); });
  document.getElementById('papa-stad').addEventListener('click', () => { game.audio.play('tap'); game.show('stad'); });

  // ---- PAPA screen ----
  function fmtTime(ms) {
    const min = Math.floor(ms / 60000);
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h} ${game.T.papa.hours} ${m} ${game.T.papa.minutes}` : `${m} ${game.T.papa.minutes}`;
  }

  function renderStats(state) {
    const s = stats(state, game.config);
    const L = game.T.papa.stats;
    const rows = [
      [L.earnedWork, `${formatCoins(s.earnedWork)} 🪙`],
      [L.earnedPassive, `${formatCoins(s.earnedPassive)} 🪙`],
      [L.earnedOffline, `${formatCoins(s.earnedOffline)} 🪙`],
      [L.spentFun, `${formatCoins(s.spentFun)} 🪙`],
      [L.spentMakers, `${formatCoins(s.spentMakers)} 🪙`],
      [L.spentFood, `${formatCoins(s.spentFood)} 🪙`],
      [L.perMinute, `${formatCoins(s.perMinute)} 🪙`],
      [L.bestWorkRate, `${formatCoins(s.bestWorkRate)} 🪙`],
      [L.playTime, fmtTime(s.playTimeMs)],
      [L.carsWashed, String(s.carsWashed)],
      [L.makersOwned, `${s.makersOwned} / ${game.config.makers.length}`],
      [L.funOwned, `${s.funOwned} / ${game.config.fun.length}`],
      [L.nights, String(s.nights)],
      [L.islandEarned, `${formatCoins(s.islandEarned)} 🪙`],
      [L.questsDone, `${s.questsDone}`],
      [L.stolen, `${s.stolen}×`],
      [L.tools, `${s.tools} / ${game.config.eiland.tools.length}`],
      [L.fainted, `${s.fainted}×`],
      [L.hoofdstuk, s.hoofdstuk >= 7 ? '7 / 7 · Muntstad gered' : `${s.hoofdstuk + 1} / 7`],
      [L.munten, `${s.munten} / 7`],
      [L.berenVerloren, `${s.berenVerloren}×`],
      [L.bankSaldo, `${formatCoins(s.bankSaldo)} 🪙`],
      [L.bankEarned, `${formatCoins(s.bankEarned)} 🪙`],
      [L.bumped, `${s.bumped}×`],
      [L.honger, `${s.honger}`],
    ];
    // one line for a parent who asks "what was he up to?"
    const busy = document.getElementById('papa-busy');
    if (busy) {
      const naam = game.displayName();
      busy.textContent = `${game.t('papa.busy', { naam })}: ${game.t('papa.busyTown', { makers: s.makersOwned, cars: s.carsWashed })} · ${game.t('papa.busyIsland', { nights: s.nights, quests: s.questsDone, earned: formatCoins(s.islandEarned), tools: s.tools })}.`;
    }
    statsEl.innerHTML = '';
    for (const [k, v] of rows) {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      statsEl.append(dt, dd);
    }
  }

  function renderToggles(state) {
    togglesEl.innerHTML = '';
    for (const k of ['voice', 'sound', 'music']) {
      const on = !!state.settings[k];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `btn btn-lg ${on ? 'btn-success' : 'off'}`;
      b.dataset.setting = k;
      b.innerHTML = `<span>${game.T.papa.toggles[k]}</span><span>${on ? game.t('ui.aan') : game.t('ui.uit')}</span>`;
      b.addEventListener('click', () => {
        game.audio.play('tap');
        game.update((s) => setSetting(s, k, !s.settings[k]));
        game.applySettings();
        game.save();
        renderToggles(game.state);
      });
      togglesEl.appendChild(b);
    }
  }

  startersEl.innerHTML = '';
  for (const line of game.T.papa.starters) {
    const li = document.createElement('li');
    li.textContent = line;
    startersEl.appendChild(li);
  }

  document.getElementById('code-copy').addEventListener('click', async () => {
    game.audio.play('tap');
    let ok = false;
    try {
      codeOut.focus();
      codeOut.select();
      codeOut.setSelectionRange(0, codeOut.value.length);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(codeOut.value);
        ok = true;
      } else {
        ok = document.execCommand('copy');
      }
    } catch (e) {
      ok = false;
    }
    setStatus(ok ? game.T.papa.codeCopied : game.T.papa.codeCopyFailed, !ok);
  });

  document.getElementById('code-load').addEventListener('click', () => {
    game.audio.play('tap');
    const restored = decodeCode(codeIn.value, game.config, game.now());
    if (!restored) {
      setStatus(game.T.papa.codeBad, true);
      return;
    }
    game.replaceState(restored);
    codeIn.value = '';
    setStatus(game.T.papa.codeLoaded, false);
    render(game.state);
  });

  function setStatus(text, bad) {
    codeStatus.textContent = text;
    codeStatus.classList.toggle('bad', !!bad);
    setTimeout(() => { if (codeStatus.textContent === text) codeStatus.textContent = ''; }, 4000);
  }

  document.getElementById('reset-1').addEventListener('click', () => { game.audio.play('tap'); resetConfirm.hidden = false; });
  document.getElementById('reset-no').addEventListener('click', () => { game.audio.play('tap'); resetConfirm.hidden = true; });
  document.getElementById('reset-yes').addEventListener('click', () => {
    game.audio.play('thud');
    resetConfirm.hidden = true;
    game.resetAll();
  });

  function render(state) {
    renderStats(state);
    renderToggles(state);
    codeOut.value = encodeCode(state, game.config);
  }

  return {
    gate: {
      show() { newSum(); },
      hide() {},
      render() {},
    },
    show() {
      resetConfirm.hidden = true;
      codeStatus.textContent = '';
      render(game.state);
    },
    hide() { codeIn.blur(); },
    render(state) { renderStats(state); },
  };
}
