// server/relay/relay.js — the tiny relay for SAMEN SPELEN (PLAN-V4 R5). Zero dependencies: a WebSocket server on
// plain Node (handshake + framing by hand, ~150 lines). It only passes messages between the players in a room; it
// never stores anything, never sees names (players are "1", "2", "3" with an animal), never talks to anyone else.
//   node server/relay/relay.js [--port 4174] [--host 127.0.0.1]
// Protocol (JSON text frames, ≤ 4 KB):
//   client → { t: 'join', room: '0312' }            answer { t: 'joined', id, host: bool, peers: [ids] }
//   client → { t: 'msg', to?: id, ... }             relayed to the room (or to `to`) as { t: 'msg', from: id, ... }
//   server → { t: 'peer', id } / { t: 'left', id } / { t: 'host', id } (a new host when the old one leaves)
// The same protocol runs as a Cloudflare Worker (server/relay/worker.js) for the home of Johannes and grandma's.
import http from 'node:http';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const MAX_ROOM = 6;
export const ROOM_RE = /^[0-7]{4}$/;   // four pictures out of eight

export function createRelay({ log = () => {} } = {}) {
  const rooms = new Map();   // code → Map(id → socket)
  let nextId = 1;

  function roomOf(code) {
    if (!rooms.has(code)) rooms.set(code, new Map());
    return rooms.get(code);
  }
  function send(sock, obj) {
    if (!sock.wsOpen) return;
    sock.write(frame(JSON.stringify(obj)));
  }
  function broadcast(room, obj, except) {
    for (const [id, s] of room) if (id !== except) send(s, obj);
  }

  function onMessage(sock, text) {
    let m;
    try { m = JSON.parse(text); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'join') {
      if (typeof m.room !== 'string' || !ROOM_RE.test(m.room) || sock.room) return;
      const room = roomOf(m.room);
      if (room.size >= MAX_ROOM) { send(sock, { t: 'full' }); return; }
      sock.id = nextId++;
      sock.room = m.room;
      const host = room.size === 0;
      if (host) room.hostId = sock.id;
      send(sock, { t: 'joined', id: sock.id, host, hostId: room.hostId, peers: [...room.keys()] });
      broadcast(room, { t: 'peer', id: sock.id }, sock.id);
      room.set(sock.id, sock);
      log(`join ${m.room} #${sock.id} (${room.size})`);
      return;
    }
    if (m.t === 'msg' && sock.room) {
      const room = rooms.get(sock.room);
      if (!room) return;
      const out = { ...m, from: sock.id };
      if (m.to != null) { const s = room.get(Number(m.to)); if (s) send(s, out); }
      else broadcast(room, out, sock.id);
      return;
    }
    if (m.t === 'ping') send(sock, { t: 'pong' });
  }
  function onClose(sock) {
    if (!sock.room) return;
    const room = rooms.get(sock.room);
    if (!room) return;
    room.delete(sock.id);
    broadcast(room, { t: 'left', id: sock.id });
    if (room.hostId === sock.id && room.size) {
      room.hostId = room.keys().next().value;
      broadcast(room, { t: 'host', id: room.hostId });
    }
    if (!room.size) rooms.delete(sock.room);
    log(`left ${sock.room} #${sock.id}`);
  }

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('muntstad relay\n');
  });
  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    if (!key || (req.headers.upgrade || '').toLowerCase() !== 'websocket') { socket.destroy(); return; }
    const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write(['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${accept}`, '', ''].join('\r\n'));
    socket.wsOpen = true;
    socket.setNoDelay(true);
    let buf = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      for (;;) {
        const f = parseFrame(buf);
        if (!f) break;
        buf = buf.subarray(f.total);
        if (f.opcode === 8) { socket.wsOpen = false; socket.end(); break; }
        if (f.opcode === 9) { socket.write(frame(f.payload, 10)); continue; }
        if (f.opcode === 1 && f.payload.length <= 4096) onMessage(socket, f.payload.toString('utf8'));
      }
    });
    socket.on('close', () => { socket.wsOpen = false; onClose(socket); });
    socket.on('error', () => { socket.wsOpen = false; });
  });

  return {
    server,
    listen(port = 4174, host = '127.0.0.1') { return new Promise((res) => server.listen(port, host, () => res(server.address()))); },
    close() { for (const room of rooms.values()) for (const s of room.values()) s.destroy(); return new Promise((res) => server.close(() => res())); },
    get rooms() { return rooms; },
  };
}

/** Build a server→client frame (no masking). opcode 1 = text, 10 = pong. */
export function frame(payload, opcode = 1) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
  const len = data.length;
  let head;
  if (len < 126) head = Buffer.from([0x80 | opcode, len]);
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | opcode; head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x80 | opcode; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([head, data]);
}

/** Parse one client→server frame (masked) from the start of buf, or null when incomplete. */
export function parseFrame(buf) {
  if (buf.length < 2) return null;
  const opcode = buf[0] & 0x0f;
  const masked = (buf[1] & 0x80) !== 0;
  let len = buf[1] & 0x7f, off = 2;
  if (len === 126) { if (buf.length < 4) return null; len = buf.readUInt16BE(2); off = 4; }
  else if (len === 127) { if (buf.length < 10) return null; len = Number(buf.readBigUInt64BE(2)); off = 10; }
  const maskLen = masked ? 4 : 0;
  if (buf.length < off + maskLen + len) return null;
  let payload = buf.subarray(off + maskLen, off + maskLen + len);
  if (masked) {
    const mask = buf.subarray(off, off + 4);
    const out = Buffer.alloc(len);
    for (let i = 0; i < len; i++) out[i] = payload[i] ^ mask[i & 3];
    payload = out;
  }
  return { opcode, payload, total: off + maskLen + len };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const arg = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
  const relay = createRelay({ log: (s) => console.log(`[relay] ${s}`) });
  relay.listen(Number(arg('port', 4174)), arg('host', '127.0.0.1')).then((a) => console.log(`[relay] ws://${a.address}:${a.port}`));
}
