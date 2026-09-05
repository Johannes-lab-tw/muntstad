// The campaign "De verdwenen munten van Muntstad" (V6.6/V6.7): the chapter line on the island, chapter 1 (a night
// with the fire) pays a coin and moves on, the climbing shoes open the snow for chapter 4, and the last chapter's
// three bears are won with BOE (drum: one BOE each) or lost when they eat. Everything is steered through the hook.
import { test, expect } from '@playwright/test';
import { watchErrors, startGame, seedSave, closePopups, state } from './helpers.js';

const hook = (page) => page.evaluate(() => {
  const h = window.__muntstad.avontuur;
  return { player: h.player, action: h.action, forestCount: h.forestCount, camp: h.landmarks.CAMP, darkness: h.darkness, bears: h.bears, berenNacht: h.berenNacht, kind: h.kindAt(h.player.x, h.player.z) };
});
const mentorHas = (page, text) => page.evaluate((t) => (window.__muntstad.mentorLog || []).some((l) => l.toLowerCase().includes(t)), text);

async function openAvontuur(page) {
  for (let i = 0; i < 4; i++) {
    await closePopups(page);
    await page.locator('#nav-avontuur').click({ force: true });
    try { await expect(page.locator('#screen-avontuur')).toHaveClass(/active/, { timeout: 8000 }); break; } catch (e) { if (i === 3) throw e; }
  }
  await expect.poll(async () => (await hook(page)).forestCount, { timeout: 30000 }).toBeGreaterThan(1000);
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.3));
  await page.waitForTimeout(300);
}
const island = (extra = {}) => ({ bag: { hout: 6, schelp: 0, bes: 0, vis: 0 }, tools: {}, quest: 0, questN: 0, questsDone: 0, collected: {}, sold: 0, earned: 0, honger: 100, keten: 0, stap: 0, stapN: 0, ketensDone: 0, ...extra });

test('chapter 1: the line shows "Het kamp"; a night with the fire burning pays the first coin and opens chapter 2', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 10; s.earnedWork = 10; s.eiland = island(); s.nacht = { fire: 60, nights: 0, stolen: 0, clockOffsetMs: 0 }; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  await expect(page.locator('#av-campagne')).toContainText('1. Het kamp');
  await expect(page.locator('#av-campagne')).toContainText('○○○○○○○');
  const h = await hook(page);
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 2.2), h.camp);
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.82));
  await expect.poll(async () => (await hook(page)).darkness, { timeout: 20000 }).toBe(1);
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.3));
  await expect.poll(async () => (await state(page)).campagne.hoofdstuk, { timeout: 20000 }).toBe(1);
  expect((await state(page)).campagne.munten).toBe(1);
  await expect(page.locator('#av-campagne')).toContainText('2. De grot');
  await expect(page.locator('#av-campagne')).toContainText('🪙○○○○○○');
  await expect.poll(() => mentorHas(page, 'gouden vriend'), { timeout: 20000 }).toBe(true);
  await page.waitForTimeout(800);
  await closePopups(page);   // the 🪙 sticker
  expect(errors()).toEqual([]);
});

test('chapter 4: without the climbing shoes the snow stops you, with them you reach the top and the coin', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 10; s.earnedWork = 10; s.eiland = island({ tools: { klimschoenen: true } }); s.nacht = { fire: 60, nights: 0, stolen: 0, clockOffsetMs: 0 }; s.campagne = { hoofdstuk: 3, munten: 3, pogingen: 0, reeks: 0 }; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  await expect(page.locator('#av-campagne')).toContainText('4. De berg');
  const HILL = await page.evaluate(() => ({ x: 150, z: 135 }));
  // on the snow (the snow line lies about 35 m from the top): with the shoes it is land you can stand and walk on
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 30), HILL);
  await page.waitForTimeout(1500);
  const onSnow = await hook(page);
  expect(onSnow.kind).toBe('snow');
  expect(await page.evaluate(({ x, z }) => window.__muntstad.avontuur.onLand(x, z), onSnow.player)).toBe(true);
  await page.evaluate(() => window.__muntstad.avontuur.setInput(0, 1, true));
  await expect.poll(async () => (await hook(page)).player.z, { timeout: 20000 }).toBeLessThan(onSnow.player.z - 1.5);
  await page.evaluate(() => window.__muntstad.avontuur.setInput(null));
  // straight to the top: the chapter is done
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 4), HILL);
  await expect.poll(async () => (await state(page)).campagne.hoofdstuk, { timeout: 20000 }).toBe(4);
  await expect.poll(() => mentorHas(page, 'top van de berg'), { timeout: 20000 }).toBe(true);
  expect(errors()).toEqual([]);
});

test('chapter 7: three bears come; BOE with the drum sends each one off; all three gone = Muntstad is saved', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 10; s.earnedWork = 10; s.eiland = island({ tools: { trommel: true } }); s.nacht = { fire: 120, nights: 8, stolen: 0, clockOffsetMs: 0 }; s.campagne = { hoofdstuk: 6, munten: 6, pogingen: 0, reeks: 0 }; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  await expect(page.locator('#av-campagne')).toContainText('7. De Nachtberen');
  const h = await hook(page);
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 3), h.camp);
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.82));
  await expect.poll(async () => (await hook(page)).darkness, { timeout: 20000 }).toBe(1);
  await page.evaluate(() => window.__muntstad.avontuur.spawnBears());   // the game does this 20 s into the night; the test does not wait
  await expect.poll(async () => (await hook(page)).bears.length, { timeout: 20000 }).toBe(3);
  await expect.poll(() => mentorHas(page, 'drie nachtberen'), { timeout: 20000 }).toBe(true);
  for (let i = 0; i < 3; i++) {
    const p = (await hook(page)).player;
    await page.evaluate(({ x, z }) => window.__muntstad.avontuur.bearsAt(x, z + 2.5), p);
    await expect.poll(async () => (await hook(page)).action?.label, { timeout: 20000 }).toBe('BOE');
    await page.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
    await expect.poll(async () => (await hook(page)).bears.filter((b) => b.state === 'come').length, { timeout: 20000 }).toBe(2 - i);
  }
  await expect.poll(async () => (await state(page)).campagne.hoofdstuk, { timeout: 20000 }).toBe(7);
  expect((await state(page)).campagne.munten).toBe(7);
  expect((await state(page)).flags.gered).toBe(true);
  await expect(page.locator('#av-campagne')).toContainText('gered');
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.3));
  await page.waitForTimeout(800);
  await closePopups(page);   // the 🏆 sticker
  expect(errors()).toEqual([]);
});
