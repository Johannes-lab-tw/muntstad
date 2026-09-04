// The relay (server/relay/relay.js): WebSocket framing by hand, rooms of four pictures, first in = host, messages
// only go to the room, the host role moves on when the host leaves. Uses Node's built-in WebSocket client.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRelay, frame, parseFrame } from '../../server/relay/relay.js';
import { newRoomCode, codeToPictures, isRoomCode, PICTURES } from '../../docs/js/net/relay.js';

function client(url) {
  const ws = new WebSocket(url);
  const inbox = [];
  const waiters = [];
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (waiters.length) waiters.shift()(m); else inbox.push(m); };
  const next = () => (inbox.length ? Promise.resolve(inbox.shift()) : new Promise((res) => waiters.push(res)));
  const opened = new Promise((res) => { ws.onopen = res; });
  return { ws, next, opened, send: (o) => ws.send(JSON.stringify(o)) };
}
const timeout = (p, ms = 3000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

test('frames round-trip: text, masked client frames, lengths 0 / 200 / 70000', () => {
  for (const len of [0, 5, 200, 70000]) {
    const text = 'x'.repeat(len);
    const f = frame(text);
    const parsed = parseFrame(f);
    assert.equal(parsed.opcode, 1);
    assert.equal(parsed.payload.toString(), text);
    assert.equal(parsed.total, f.length);
  }
  // a masked frame like a browser sends
  const payload = Buffer.from('{"t":"ping"}');
  const mask = Buffer.from([1, 2, 3, 4]);
  const masked = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i & 3];
  const f = Buffer.concat([Buffer.from([0x81, 0x80 | payload.length]), mask, masked]);
  assert.equal(parseFrame(f).payload.toString(), '{"t":"ping"}');
  assert.equal(parseFrame(Buffer.from([0x81])), null, 'incomplete');
});

test('room codes are four pictures out of eight', () => {
  assert.equal(PICTURES.length, 8);
  const c = newRoomCode(() => 0.99);
  assert.equal(c, '7777');
  assert.ok(isRoomCode(c));
  assert.ok(!isRoomCode('8888') && !isRoomCode('123') && !isRoomCode('abcd'));
  assert.equal(codeToPictures('0312'), `${PICTURES[0]} ${PICTURES[3]} ${PICTURES[1]} ${PICTURES[2]}`);
});

test('join, relay, host handoff', async () => {
  const relay = createRelay();
  const addr = await relay.listen(0, '127.0.0.1');
  const url = `ws://127.0.0.1:${addr.port}/`;
  try {
    const a = client(url), b = client(url), c = client(url);
    await timeout(Promise.all([a.opened, b.opened, c.opened]));
    a.send({ t: 'join', room: '0312' });
    const ja = await timeout(a.next());
    assert.equal(ja.t, 'joined');
    assert.equal(ja.host, true);
    b.send({ t: 'join', room: '0312' });
    const jb = await timeout(b.next());
    assert.equal(jb.host, false);
    assert.deepEqual(jb.peers, [ja.id]);
    const pa = await timeout(a.next());
    assert.deepEqual(pa, { t: 'peer', id: jb.id });
    // another room does not hear us
    c.send({ t: 'join', room: '7777' });
    await timeout(c.next());
    b.send({ t: 'msg', k: 'pos', d: { x: 1 } });
    const got = await timeout(a.next());
    assert.equal(got.t, 'msg');
    assert.equal(got.from, jb.id);
    assert.deepEqual(got.d, { x: 1 });
    // a bad room is ignored, a second join is ignored
    c.send({ t: 'join', room: 'zzzz' });
    c.send({ t: 'ping' });
    assert.equal((await timeout(c.next())).t, 'pong');
    // host leaves → b becomes host
    a.ws.close();
    const left = await timeout(b.next());
    assert.equal(left.t, 'left');
    const host = await timeout(b.next());
    assert.deepEqual(host, { t: 'host', id: jb.id });
    b.ws.close(); c.ws.close();
  } finally {
    await relay.close();
  }
});
