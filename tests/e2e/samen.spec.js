// SAMEN SPELEN (PLAN-V4 R5): a parent opens a room on PAPA (four pictures), a second iPad joins via START → SAMEN
// and the pictures; both see each other on the island; the host's world (night, fire) reaches the guest; a guest's
// wood goes into the shared fire. Runs against server/relay/relay.js on ws://127.0.0.1:4174 (playwright.config).
import { test, expect } from '@playwright/test';
import { watchErrors, startGame, seedSave, closePopups, openPapa, state } from './helpers.js';

const RELAY = 'ws://127.0.0.1:4174/';
const hook = (page) => page.evaluate(() => {
  const h = window.__muntstad.avontuur;
  const s = window.__muntstad.samen;
  return { player: h.player, remotes: h.remotes, darkness: h.darkness, forestCount: h.forestCount, camp: h.landmarks.CAMP, action: h.action, down: h.down, samen: { status: s.status, isHost: s.isHost, isGuest: s.isGuest, code: s.code, peers: s.peers.size, id: s.id } };
});
async function openAvontuur(page) {
  await closePopups(page);   // a late "terwijl je weg was" or sticker popup would sit in front of the button
  // force: the 3D screen behind it renders at ~1 fps on CI, so Playwright's "stable" check never settles; a click that lands
  // during the screen animation or under a late popup is simply repeated
  for (let i = 0; i < 4; i++) {
    await closePopups(page);
    await page.locator('#nav-avontuur').click({ force: true });
    try { await expect(page.locator('#screen-avontuur')).toHaveClass(/active/, { timeout: 8000 }); break; } catch (e) { if (i === 3) throw e; }
  }
  await expect.poll(async () => (await hook(page)).forestCount, { timeout: 45000 }).toBeGreaterThan(1000);
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.3));   // daytime, whatever the wall clock says (a night would burn the fire, pay at dawn and pop a sticker)
}

test('host opens a room on PAPA, guest joins with the four pictures, both see each other and share the fire', async ({ browser }) => {
  const ctxA = await browser.newContext({ ...test.info().project.use });
  const ctxB = await browser.newContext({ ...test.info().project.use });
  const a = await ctxA.newPage(), b = await ctxB.newPage();
  const errA = watchErrors(a), errB = watchErrors(b);
  await seedSave(a, (s) => { s.wallet = 50; s.earnedWork = 50; s.settings.relayUrl = RELAY; s.eiland = { bag: { hout: 0, schelp: 0, bes: 0, vis: 0 }, tools: {}, quest: 0, questN: 0, questsDone: 0, collected: {}, sold: 0, earned: 0 }; s.nacht = { fire: 40, nights: 0, stolen: 0, clockOffsetMs: 0 }; return s; });
  await seedSave(b, (s) => { s.wallet = 20; s.earnedWork = 20; s.color = 'rood'; s.settings.relayUrl = RELAY; s.eiland = { bag: { hout: 3, schelp: 0, bes: 0, vis: 0 }, tools: {}, quest: 0, questN: 0, questsDone: 0, collected: {}, sold: 0, earned: 0 }; s.nacht = { fire: 90, nights: 0, stolen: 0, clockOffsetMs: 0 }; return s; });

  // A: the parent opens the room
  await startGame(a, { url: '/?lowres=1&phase=0.3' });
  await closePopups(a);
  await openPapa(a);
  await expect(a.locator('#relay-url')).toHaveValue(RELAY);
  await a.locator('#samen-kamer').click();
  await expect(a.locator('#samen-code')).not.toHaveText('', { timeout: 45000 });
  await expect(a.locator('#samen-status')).toContainText('Verbonden', { timeout: 45000 });
  const code = await a.evaluate(() => window.__muntstad.samen.code);
  expect(code).toMatch(/^[0-7]{4}$/);
  await a.locator('#papa-stad').click();

  // B: the child taps SAMEN and the pictures
  await b.goto('/?lowres=1&phase=0.3');
  await expect(b.locator('#btn-start')).toBeVisible();
  await b.locator('#btn-samen').click();
  await expect(b.locator('#samen-pad')).toBeVisible();
  for (const d of code) await b.locator(`#samen-keys [data-pic="${d}"]`).click();
  await expect.poll(() => b.evaluate(() => window.__muntstad.samen.status), { timeout: 45000 }).toBe('open');
  await expect(b.locator('#samen-pad')).toBeHidden({ timeout: 5000 });
  await b.locator('#btn-start').click();
  await expect(b.locator('#screen-stad')).toHaveClass(/active/);
  await closePopups(b);

  // both on the island: each sees the other with a name tag
  await openAvontuur(a);
  await openAvontuur(b);
  await expect.poll(async () => (await hook(a)).remotes.length, { timeout: 45000 }).toBe(1);
  await expect.poll(async () => (await hook(b)).remotes.length, { timeout: 45000 }).toBe(1);
  const ha = await hook(a), hb = await hook(b);
  expect(ha.samen.isHost).toBe(true);
  expect(hb.samen.isGuest).toBe(true);
  await expect(a.locator('#av-peers')).toContainText('2');
  // the guest walks: the host sees it move
  await b.evaluate(() => window.__muntstad.avontuur.setInput(0, 1, true));
  await b.waitForTimeout(2500);
  await b.evaluate(() => window.__muntstad.avontuur.setInput(null));
  const pb = (await hook(b)).player;
  // within a few metres: on a slow runner the last position update lags a frame or two behind
  await expect.poll(async () => { const r = (await hook(a)).remotes[0]; return Math.hypot(r.x - pb.x, r.z - pb.z); }, { timeout: 45000 }).toBeLessThan(4);

  // the host's night reaches the guest; the fire the guest sees is the host's (40), not its own save (90)
  await a.evaluate(() => window.__muntstad.avontuur.setPhase(0.82));
  await expect.poll(async () => (await hook(b)).darkness, { timeout: 45000 }).toBe(1);
  await expect.poll(async () => Math.round((await state(b)).nacht.fire), { timeout: 45000 }).toBeLessThanOrEqual(41);
  // the guest stokes: its wood leaves its bag and lands in the host's fire
  await b.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 2.2), hb.camp);
  await expect(b.locator('#av-stook')).toBeVisible({ timeout: 45000 });
  const hostFire = (await state(a)).nacht.fire;
  await b.locator('#av-stook').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect.poll(async () => (await state(b)).eiland.bag.hout, { timeout: 45000 }).toBe(0);
  await expect.poll(async () => (await state(a)).nacht.fire, { timeout: 45000 }).toBeGreaterThan(hostFire + 2);
  // V6.2 WEK: the guest faints (empty stomach in the dark) and lies down; the host walks up, presses WEK, the guest keeps its things
  await b.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 14), hb.camp);
  await a.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 14.5), ha.camp);
  await b.evaluate(() => { window.__muntstad.state.eiland.bag.schelp = 4; window.__muntstad.state.eiland.honger = 0; });
  await expect.poll(async () => (await hook(b)).down, { timeout: 45000 }).toBe(true);
  await expect(b.locator('#av-flauw')).toHaveClass(/down/);
  await expect.poll(async () => ((await hook(a)).remotes[0] || {}).down, { timeout: 45000 }).toBe(true);
  await expect.poll(async () => (await hook(a)).action?.label, { timeout: 45000 }).toBe('WEK');
  await a.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect.poll(async () => (await hook(b)).down, { timeout: 45000 }).toBe(false);
  expect((await state(b)).eiland.bag.schelp).toBe(4);   // nothing lost
  expect((await state(b)).eiland.honger).toBeGreaterThan(30);
  await expect.poll(() => b.evaluate(() => window.__muntstad.mentorLog.some((l) => l.includes('wakker'))), { timeout: 40000 }).toBe(true);
  await a.evaluate(() => window.__muntstad.avontuur.setPhase(null));

  // the guest leaves: the host's island is quiet again
  await b.evaluate(() => window.__muntstad.samen.leave());
  await expect.poll(async () => (await hook(a)).remotes.length, { timeout: 45000 }).toBe(0);
  expect(errA()).toEqual([]);
  expect(errB()).toEqual([]);
  await ctxA.close();
  await ctxB.close();
});
