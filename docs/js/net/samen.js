// net/samen.js — SAMEN SPELEN glue between the game and the relay: one room, the host runs the world, the others
// send their own moves. Everything that leaves the device goes through send() with a whitelisted type and numbers.
// createSamen(game) → { openRoom(), joinRoom(code), leave(), send, on, get active, get isHost, get code, get peers,
//                      get status, get id, get animal, sendPos(...) }
import { createRelay, newRoomCode, isRoomCode, ANIMALS } from './relay.js';

export function createSamen(game) {
  const relay = createRelay();
  const handlers = {};
  let code = '';
  let lastPos = 0;
  let role = 'off';   // off | host | guest
  const looks = new Map();   // peer id → { animal, color, hat, skin }

  function emit(type, ...args) { for (const fn of handlers[type] || []) fn(...args); }
  function relayUrl() { return (game.state.settings.relayUrl || '').trim() || game.config.net.defaultRelay || ''; }
  function myLook() {
    const s = game.state;
    const colorIdx = Math.max(0, game.config.colors.findIndex((c) => c.id === s.color));
    return { animal: colorIdx % ANIMALS.length, color: colorIdx, hat: s.equipped.hat, skin: s.equipped.skin };
  }

  relay.on('status', (st) => emit('change'));
  relay.on('joined', ({ host }) => {
    role = host ? 'host' : 'guest';
    relay.send('hello', myLook());
    emit('change');
  });
  relay.on('peer', (id) => { relay.send('hello', myLook(), id); emit('peer', id); emit('change'); });
  relay.on('left', (id) => { looks.delete(id); emit('left', id); emit('change'); });
  relay.on('host', ({ me }) => { role = me ? 'host' : 'guest'; emit('change'); });
  relay.on('hello', (d, from) => {
    looks.set(from, { animal: Number(d?.animal) || 0, color: Number(d?.color) || 0, hat: typeof d?.hat === 'string' ? d.hat : null, skin: typeof d?.skin === 'string' ? d.skin : null });
    emit('look', from);
    emit('change');
  });
  for (const k of ['pos', 'world', 'stoke', 'steal', 'emote', 'boe', 'sleep', 'down', 'up', 'wake']) relay.on(k, (d, from) => emit(k, d, from));

  return {
    /** The host opens a room: a fresh code of four pictures. Returns the code or null (no relay URL set). */
    openRoom() {
      if (!relayUrl()) return null;
      code = newRoomCode();
      relay.open(relayUrl(), code);
      emit('change');
      return code;
    },
    joinRoom(c) {
      if (!relayUrl() || !isRoomCode(c)) return false;
      code = String(c);
      relay.open(relayUrl(), code);
      emit('change');
      return true;
    },
    leave() {
      relay.send('bye', {});
      relay.close();
      role = 'off';
      code = '';
      looks.clear();
      emit('change');
    },
    send(k, d, to) { return relay.send(k, d, to); },
    /** Throttled position broadcast (8 Hz): x, z, heading, pose, height above ground. */
    sendPos(x, z, h, p, y, now) {
      if (!relay.active || now - lastPos < game.config.net.posMs) return;
      lastPos = now;
      relay.send('pos', { x: +x.toFixed(2), z: +z.toFixed(2), h: +h.toFixed(2), p: p || 'idle', y: +(y || 0).toFixed(2) });
    },
    on(type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    lookOf(id) { return looks.get(id) || null; },
    get active() { return relay.active; },
    get isHost() { return relay.active && role === 'host'; },
    get isGuest() { return relay.active && role === 'guest'; },
    get code() { return code; },
    get peers() { return relay.peers; },
    get status() { return relay.status; },
    get id() { return relay.id; },
    get hostId() { return relay.hostId; },
    get animal() { return ANIMALS[myLook().animal]; },
    get hasRelay() { return !!relayUrl(); },
  };
}
