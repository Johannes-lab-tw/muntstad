// server/relay/worker.js — the same relay as relay.js, as a Cloudflare Worker with one Durable Object per room.
// Deploy (Johannes, once): `npx wrangler deploy` in server/relay with wrangler.toml; then put the wss:// URL in the
// PAPA screen under SAMEN SPELEN. Free tier is plenty for three players at home. No storage, no names, no logs.
export class Room {
  constructor(state) {
    this.sockets = new Map();   // id → WebSocket
    this.nextId = 1;
    this.hostId = null;
  }
  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    const sock = server;
    sock.roomJoined = false;
    sock.addEventListener('message', (ev) => this.onMessage(sock, ev.data));
    sock.addEventListener('close', () => this.onClose(sock));
    sock.addEventListener('error', () => this.onClose(sock));
    return new Response(null, { status: 101, webSocket: client });
  }
  send(sock, obj) { try { sock.send(JSON.stringify(obj)); } catch (e) { /* closed */ } }
  broadcast(obj, except) { for (const [id, s] of this.sockets) if (id !== except) this.send(s, obj); }
  onMessage(sock, data) {
    if (typeof data !== 'string' || data.length > 4096) return;
    let m;
    try { m = JSON.parse(data); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'join' && !sock.roomJoined) {
      if (this.sockets.size >= 6) { this.send(sock, { t: 'full' }); return; }
      sock.id = this.nextId++;
      sock.roomJoined = true;
      const host = this.sockets.size === 0;
      if (host) this.hostId = sock.id;
      this.send(sock, { t: 'joined', id: sock.id, host, hostId: this.hostId, peers: [...this.sockets.keys()] });
      this.broadcast({ t: 'peer', id: sock.id }, sock.id);
      this.sockets.set(sock.id, sock);
      return;
    }
    if (m.t === 'msg' && sock.roomJoined) {
      const out = { ...m, from: sock.id };
      if (m.to != null) { const s = this.sockets.get(Number(m.to)); if (s) this.send(s, out); }
      else this.broadcast(out, sock.id);
      return;
    }
    if (m.t === 'ping') this.send(sock, { t: 'pong' });
  }
  onClose(sock) {
    if (!sock.roomJoined || !this.sockets.has(sock.id)) return;
    this.sockets.delete(sock.id);
    this.broadcast({ t: 'left', id: sock.id });
    if (this.hostId === sock.id && this.sockets.size) {
      this.hostId = this.sockets.keys().next().value;
      this.broadcast({ t: 'host', id: this.hostId });
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const code = url.searchParams.get('room') || '';
    if (!/^[0-7]{4}$/.test(code)) return new Response('muntstad relay\n', { status: 200 });
    const id = env.ROOMS.idFromName(code);
    return env.ROOMS.get(id).fetch(request);
  },
};
