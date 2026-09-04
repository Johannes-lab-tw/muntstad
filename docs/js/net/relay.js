// net/relay.js — the client side of SAMEN SPELEN: one WebSocket to our own relay, a room of four pictures, and a
// small set of whitelisted message types. Nothing personal ever leaves the iPad: no names, only numbers (positions,
// poses, the fire) and an animal per player. Without a relay URL everything simply works alone.
// createRelay(config) → { open(url, code), close(), send(type, data), on(type, fn), get id, get isHost, get peers, get state }

export const PICTURES = ['🍋', '🐶', '⭐', '🚗', '🐸', '🌈', '🍕', '🚀'];   // a room code is four of these (digits 0-7)
export const ANIMALS = ['🐶', '🐱', '🦖', '🐸', '🦊', '🐼'];

/** Four random pictures, as digits '0'..'7'. */
export function newRoomCode(rand = Math.random) {
  let s = '';
  for (let i = 0; i < 4; i++) s += String(Math.floor(rand() * PICTURES.length) % PICTURES.length);
  return s;
}
export function codeToPictures(code) {
  return String(code).split('').map((d) => PICTURES[Number(d)] || '?').join(' ');
}
export function isRoomCode(code) {
  return /^[0-7]{4}$/.test(String(code));
}
/** Only these leave the device, and only with numbers/short ids in them. */
export const TYPES = new Set(['pos', 'hello', 'world', 'stoke', 'steal', 'emote', 'boe', 'sleep', 'bye']);

export function createRelay() {
  let ws = null, id = 0, hostId = 0, url = '', code = '';
  const peers = new Map();   // id → { animal, seen }
  const handlers = {};
  let status = 'off';        // off | connecting | open | closed | full | error
  let retry = 0, retryTimer = 0, closing = false;

  function emit(type, ...args) { for (const fn of handlers[type] || []) fn(...args); }
  function setStatus(s) { if (status !== s) { status = s; emit('status', s); } }

  function connect() {
    closing = false;
    setStatus('connecting');
    try {
      ws = new WebSocket(url.includes('?') ? `${url}&room=${code}` : `${url}?room=${code}`);
    } catch (e) { setStatus('error'); return; }
    ws.onopen = () => { retry = 0; ws.send(JSON.stringify({ t: 'join', room: code })); };
    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (!m || typeof m !== 'object') return;
      if (m.t === 'joined') {
        id = m.id; hostId = m.hostId;
        peers.clear();
        for (const p of m.peers || []) peers.set(p, { animal: null, seen: Date.now() });
        setStatus('open');
        emit('joined', { id, host: id === hostId });
        return;
      }
      if (m.t === 'full') { setStatus('full'); closing = true; ws.close(); return; }
      if (m.t === 'peer') { peers.set(m.id, { animal: null, seen: Date.now() }); emit('peer', m.id); return; }
      if (m.t === 'left') { peers.delete(m.id); emit('left', m.id); return; }
      if (m.t === 'host') { hostId = m.id; emit('host', { id: hostId, me: hostId === id }); return; }
      if (m.t === 'msg' && TYPES.has(m.k)) {
        const p = peers.get(m.from);
        if (p) p.seen = Date.now();
        if (m.k === 'hello' && p) p.animal = Number(m.d && m.d.animal) || 0;
        emit(m.k, m.d, m.from);
      }
    };
    ws.onclose = () => {
      ws = null;
      if (closing) { setStatus(status === 'full' ? 'full' : 'closed'); return; }
      setStatus('closed');
      retry = Math.min(5, retry + 1);
      clearTimeout(retryTimer);
      retryTimer = setTimeout(connect, 600 * retry * retry);
    };
    ws.onerror = () => { /* onclose follows */ };
  }

  return {
    open(relayUrl, roomCode) {
      if (!relayUrl || !isRoomCode(roomCode)) return false;
      url = relayUrl; code = roomCode;
      clearTimeout(retryTimer);
      if (ws) { closing = true; ws.close(); }
      connect();
      return true;
    },
    close() {
      closing = true;
      clearTimeout(retryTimer);
      if (ws) ws.close();
      ws = null; id = 0; hostId = 0; peers.clear();
      setStatus('off');
    },
    send(k, d, to) {
      if (!ws || ws.readyState !== 1 || !TYPES.has(k)) return false;
      const m = { t: 'msg', k, d };
      if (to != null) m.to = to;
      ws.send(JSON.stringify(m));
      return true;
    },
    on(type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    get id() { return id; },
    get isHost() { return status === 'open' && id === hostId; },
    get hostId() { return hostId; },
    get peers() { return peers; },
    get status() { return status; },
    get code() { return code; },
    get active() { return status === 'open'; },
  };
}
