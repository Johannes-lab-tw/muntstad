// AVONTUUR round 4 ("Nacht"): the fire wants wood (STOOK), a ghost steals in the dark but not in the light of the
// lantern, and dawn pays when the fire kept burning. The clock is forced with setPhase.
import { test, expect } from '@playwright/test';
import { watchErrors, startGame, seedSave, closePopups, state } from './helpers.js';

const hook = (page) => page.evaluate(() => {
  const h = window.__muntstad.avontuur;
  return { player: h.player, action: h.action, forestCount: h.forestCount, camp: h.landmarks.CAMP, darkness: h.darkness, ghosts: h.ghosts, lights: h.lights };
});
const mentorHas = (page, text) => page.evaluate((t) => window.__muntstad.mentorLog.some((l) => l.includes(t)), text);

async function openAvontuur(page) {
  await page.locator('#nav-avontuur').click({ force: true });   // force: the 3D screen behind it renders at ~1 fps on CI, so Playwright's "stable" check never settles
  await expect(page.locator('#screen-avontuur')).toHaveClass(/active/);
  await expect.poll(async () => (await hook(page)).forestCount, { timeout: 30000 }).toBeGreaterThan(1000);
  await page.waitForTimeout(300);
}
const island = (extra = {}) => ({ bag: { hout: 3, schelp: 0, bes: 0, vis: 0 }, tools: {}, quest: 0, questN: 0, questsDone: 0, collected: {}, sold: 0, earned: 0, ...extra });

test('night falls: Muntje warns, STOOK feeds the fire with the wood in the bag, a ghost steals in the dark, dawn pays', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 10; s.earnedWork = 10; s.eiland = island(); s.nacht = { fire: 60, nights: 0, stolen: 0, clockOffsetMs: 0 }; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.82));
  await expect.poll(async () => (await hook(page)).darkness, { timeout: 20000 }).toBe(1);
  await expect.poll(() => mentorHas(page, 'donker'), { timeout: 20000 }).toBe(true);

  // STOOK at the fire: 3 pieces of wood → +36 fire units
  const h = await hook(page);
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 2.2), h.camp);
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 20000 }).toBe('STOOK');
  const fireBefore = (await state(page)).nacht.fire;
  await page.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect.poll(async () => (await state(page)).eiland.bag.hout, { timeout: 20000 }).toBe(0);
  expect((await state(page)).nacht.fire).toBeGreaterThan(fireBefore + 30);
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 20000 }).toBe('KAMP');

  // a ghost next to the player, far from the fire's light: it steals once
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 24), h.camp);
  await page.waitForTimeout(200);
  const p = (await hook(page)).player;
  expect((await hook(page)).lights.some((l) => Math.hypot(l.x - p.x, l.z - p.z) < l.r)).toBe(false);
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.ghostAt(x, z + 1.0), p);
  await expect.poll(async () => (await state(page)).nacht.stolen, { timeout: 20000 }).toBe(1);
  await expect.poll(() => mentorHas(page, 'spook'), { timeout: 20000 }).toBe(true);

  // dawn: the fire still burns → the first night pays 20 coins
  const walletBefore = Math.floor((await state(page)).wallet);
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.3));
  await expect.poll(async () => (await state(page)).nacht.nights, { timeout: 20000 }).toBe(1);
  expect(Math.floor((await state(page)).wallet)).toBe(walletBefore + 20);
  await expect.poll(async () => (await hook(page)).ghosts.length, { timeout: 20000 }).toBe(0);
  expect(errors()).toEqual([]);
});

test('with the lantern a ghost next to you cannot steal; the tent lets you sleep to the morning', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 10; s.earnedWork = 10; s.eiland = island({ tools: { lantaarn: true, tent: true } }); s.nacht = { fire: 60, nights: 0, stolen: 0, clockOffsetMs: 0 }; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.82));
  await expect.poll(async () => (await hook(page)).darkness, { timeout: 20000 }).toBe(1);
  const h = await hook(page);
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 24), h.camp);
  await page.waitForTimeout(200);
  const p = (await hook(page)).player;
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.ghostAt(x, z + 1.0), p);
  await page.waitForTimeout(3000);
  expect((await state(page)).nacht.stolen, 'the lantern keeps it off').toBe(0);
  const ghosts = (await hook(page)).ghosts;
  expect(ghosts.length).toBeGreaterThan(0);
  expect(Math.hypot(ghosts[0].x - p.x, ghosts[0].z - p.z), 'it hovers outside the light').toBeGreaterThan(1.0);

  // SLAAP in the tent shifts the clock to just before dawn (visible once the forced night phase is released)
  const tent = await page.evaluate(() => window.__muntstad.avontuur.landmarks.TENT);
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 1.2), tent);
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 20000 }).toBe('SLAAP');
  await page.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect.poll(async () => (await state(page)).nacht.clockOffsetMs, { timeout: 20000 }).toBeGreaterThan(0);
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(null));
  await expect.poll(async () => (await hook(page)).darkness, { timeout: 20000 }).toBeLessThan(1);
  const phase = await page.evaluate(() => window.__muntstad.avontuur.phase);
  expect(phase).toBeGreaterThan(0.95);
  expect(errors()).toEqual([]);
});
