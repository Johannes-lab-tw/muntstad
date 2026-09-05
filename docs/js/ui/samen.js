// ui/samen.js — the SAMEN SPELEN screens: on PAPA the parent sets the relay address and opens a room (a code of
// four pictures on the screen); on START a child taps SAMEN and the four pictures to join. No typing for the child.
import { PICTURES, codeToPictures } from '../net/relay.js';

export function createSamenUi(game) {
  const T = game.T;
  const samen = game.samen;
  // ---- PAPA: relay address, KAMER, status ----
  const urlIn = document.getElementById('relay-url');
  const roomBtn = document.getElementById('samen-kamer');
  const stopBtn = document.getElementById('samen-stop');
  const codeEl = document.getElementById('samen-code');
  const statusEl = document.getElementById('samen-status');
  urlIn.addEventListener('change', () => {
    const v = urlIn.value.trim().slice(0, 200);
    game.update((s) => ({ ...s, settings: { ...s.settings, relayUrl: /^wss?:\/\//.test(v) ? v : '' } }));
    game.save();
    urlIn.value = game.state.settings.relayUrl || '';
    renderPapa();
  });
  roomBtn.addEventListener('click', () => {
    game.audio.play('tap');
    const c = samen.openRoom();
    if (!c) { statusEl.textContent = T.samen.noRelay; return; }
    renderPapa();
  });
  stopBtn.addEventListener('click', () => { game.audio.play('tap'); samen.leave(); renderPapa(); });
  function renderPapa() {
    urlIn.value = game.state.settings.relayUrl || '';
    urlIn.placeholder = game.config.net.defaultRelay || 'wss://…';
    const on = samen.status !== 'off';
    roomBtn.hidden = on;
    stopBtn.hidden = !on;
    codeEl.textContent = on && samen.code ? codeToPictures(samen.code) : '';
    statusEl.textContent = statusText();
  }
  function statusText() {
    const n = samen.peers.size + (samen.active ? 1 : 0);
    switch (samen.status) {
      case 'open': return `${T.samen.connected} ${n} ${n === 1 ? T.samen.player : T.samen.players}${samen.isHost ? ` · ${T.samen.youHost}` : ''}`;
      case 'connecting': return T.samen.connecting;
      case 'closed': return T.samen.retry;
      case 'full': return T.samen.full;
      case 'error': return T.samen.error;
      default: return samen.hasRelay ? T.samen.idle : T.samen.noRelay;
    }
  }

  // ---- START: SAMEN + the picture keypad ----
  const samenBtn = document.getElementById('btn-samen');
  const pad = document.getElementById('samen-pad');
  const slots = document.getElementById('samen-slots');
  const keys = document.getElementById('samen-keys');
  const padStatus = document.getElementById('samen-pad-status');
  let entry = '';
  for (let i = 0; i < PICTURES.length; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-pic';
    b.dataset.pic = String(i);
    b.textContent = PICTURES[i];
    b.addEventListener('click', () => {
      if (entry.length >= 4) return;
      game.audio.play('tap');
      entry += String(i);
      renderPad();
      if (entry.length === 4) tryJoin();
    });
    keys.appendChild(b);
  }
  document.getElementById('samen-wis').addEventListener('click', () => { game.audio.play('tap'); entry = ''; renderPad(); });
  document.getElementById('samen-terug').addEventListener('click', () => { game.audio.play('tap'); pad.hidden = true; });
  samenBtn.addEventListener('click', () => {
    game.audio.play('tap');
    entry = '';
    pad.hidden = false;
    renderPad();
  });
  function renderPad() {
    slots.innerHTML = [0, 1, 2, 3].map((i) => `<span class="samen-slot">${entry[i] != null ? PICTURES[Number(entry[i])] : '·'}</span>`).join('');
    padStatus.textContent = samen.hasRelay ? (entry.length < 4 ? T.samen.tapPictures : statusText()) : T.samen.askPapa;
  }
  function tryJoin() {
    if (!samen.hasRelay) { padStatus.textContent = T.samen.askPapa; return; }
    samen.joinRoom(entry);
    padStatus.textContent = T.samen.connecting;
  }
  samen.on('change', () => {
    if (!pad.hidden) padStatus.textContent = samen.hasRelay ? (entry.length < 4 ? T.samen.tapPictures : statusText()) : T.samen.askPapa;
    if (samen.active && !pad.hidden) setTimeout(() => { pad.hidden = true; }, 900);
    if (game.screen === 'papa') renderPapa();
    game.emit('samen', samen.status);
  });

  // ---- the island (V6.2): SAMEN on the island itself. KAMER opens a room (you are the host, your friend taps your four
  // pictures); tapping four pictures joins a friend's room. The pad covers the stick, so walking pauses while it is open.
  const avBtn = document.getElementById('av-samen');
  const avPad = document.getElementById('av-samen-pad');
  const avSlots = document.getElementById('av-samen-slots');
  const avKeys = document.getElementById('av-samen-keys');
  const avStatus = document.getElementById('av-samen-status');
  const avCode = document.getElementById('av-samen-code');
  const avKamer = document.getElementById('av-samen-kamer');
  const avStop = document.getElementById('av-samen-stop');
  const avWis = document.getElementById('av-samen-wis');
  let avEntry = '';
  for (let i = 0; i < PICTURES.length; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-pic';
    b.dataset.pic = String(i);
    b.textContent = PICTURES[i];
    b.addEventListener('click', () => {
      if (avEntry.length >= 4 || samen.status !== 'off') return;
      game.audio.play('tap');
      avEntry += String(i);
      renderAv();
      if (avEntry.length === 4) { if (samen.hasRelay) { samen.joinRoom(avEntry); avStatus.textContent = T.samen.connecting; } else avStatus.textContent = T.samen.askPapa; }
    });
    avKeys.appendChild(b);
  }
  function showAv(open) { avPad.hidden = !open; game.emit('samenpad', open); if (open) renderAv(); }
  avBtn.addEventListener('click', () => { game.audio.play('tap'); avEntry = ''; showAv(true); });
  avWis.addEventListener('click', () => { game.audio.play('tap'); avEntry = ''; renderAv(); });
  document.getElementById('av-samen-terug').addEventListener('click', () => { game.audio.play('tap'); showAv(false); });
  avKamer.addEventListener('click', () => { game.audio.play('tap'); if (!samen.openRoom()) avStatus.textContent = T.samen.noRelay; renderAv(); });
  avStop.addEventListener('click', () => { game.audio.play('tap'); samen.leave(); avEntry = ''; renderAv(); });
  function renderAv() {
    const on = samen.status !== 'off';
    avKamer.hidden = on;
    avWis.hidden = on;
    avStop.hidden = !on;
    avCode.textContent = on && samen.code ? codeToPictures(samen.code) : '';
    avSlots.hidden = on;
    avKeys.hidden = on;
    if (!on) avSlots.innerHTML = [0, 1, 2, 3].map((i) => `<span class="samen-slot">${avEntry[i] != null ? PICTURES[Number(avEntry[i])] : '·'}</span>`).join('');
    avStatus.textContent = !samen.hasRelay ? T.samen.askPapa : on ? statusText() : avEntry.length ? T.samen.tapPictures : T.samen.islandHelp;
  }
  samen.on('change', () => {
    if (!avPad.hidden) renderAv();
    if (samen.active && !avPad.hidden && samen.peers.size > 0) setTimeout(() => { if (samen.active) showAv(false); }, 1200);   // a friend is in: back to the island
  });

  return { renderPapa, statusText, renderAv };
}
