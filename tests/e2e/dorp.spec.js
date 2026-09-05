// DORP (V6.3): walk through Muntstad yourself. From the map (STAD) the DORP button puts you on the harbour pier; the
// stick walks, the sea and the plots block, at a building the action button offers KOOP / BETER, at the boat VAAR;
// the crossing shows the boat and lands you on the island's pier; KAART goes back to the map.
import { test, expect } from '@playwright/test';
import { watchErrors, startGame, seedSave, closePopups, state } from './helpers.js';

const hook = (page) => page.evaluate(() => {
  const h = window.__muntstad.dorp;
  return { ready: h.ready, player: h.player, action: h.action, sailing: h.sailing, harbor: h.landmarks.HARBOR, plots: h.landmarks.PLOTS, house: h.landmarks.HOUSE, island: h.landmarks.ISLAND };
});

async function openDorp(page) {
  for (let i = 0; i < 4; i++) {
    await closePopups(page);
    await page.locator('#nav-dorp').click({ force: true });
    try { await expect(page.locator('#screen-dorp')).toHaveClass(/active/, { timeout: 8000 }); break; } catch (e) { if (i === 3) throw e; }
  }
  await expect.poll(async () => (await hook(page)).ready, { timeout: 30000 }).toBe(true);
}

test('DORP: you start on the pier, walk into the town, the sea stops you, a plot offers KOOP or BETER, KAART goes back', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 500; s.earnedWork = 500; s.makers = { limonade: 1 }; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openDorp(page);
  const h = await hook(page);
  expect(h.player.x).toBeCloseTo(h.harbor.x, 0);
  expect(h.player.z).toBeLessThan(0);
  // walk north (the stick up = the camera's forward, the town): the player moves onto the island
  await page.evaluate(() => window.__muntstad.dorp.setInput(0, 1, true));
  await expect.poll(async () => (await hook(page)).player.z, { timeout: 30000 }).toBeGreaterThan(0.5);
  await page.evaluate(() => window.__muntstad.dorp.setInput(null));
  // the sea is not for walking: teleport to the rim and push west, you stay on land
  await page.evaluate(() => window.__muntstad.dorp.teleport(1.0, 7.0));
  await page.evaluate(() => window.__muntstad.dorp.setInput(-1, 0, true));
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.__muntstad.dorp.setInput(null));
  const p = (await hook(page)).player;
  expect(await page.evaluate(({ x, z }) => window.__muntstad.dorp.walkable(x, z), p)).toBe(true);
  expect(p.x).toBeGreaterThan(0.2);
  // the owned lemonade stand offers BETER, an unowned plot KOOP; BETER opens the building card
  await page.evaluate(({ x, z }) => window.__muntstad.dorp.teleport(x, z + 2.4), { x: h.plots.limonade[0], z: h.plots.limonade[1] });
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 20000 }).toBe('BETER');
  await page.locator('#dp-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect(page.locator('#overlay')).toBeVisible();
  await closePopups(page);
  await page.evaluate(({ x, z }) => window.__muntstad.dorp.teleport(x, z + 2.4), { x: h.plots.pizzeria[0], z: h.plots.pizzeria[1] });
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 20000 }).toBe('KOOP');
  // your house: HUIS
  await page.evaluate(({ x, z }) => window.__muntstad.dorp.teleport(x, z + 2.4), { x: h.house[0], z: h.house[1] });
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 20000 }).toBe('HUIS');
  // KAART: the map
  await page.locator('#dp-kaart').click({ force: true });
  await expect(page.locator('#screen-stad')).toHaveClass(/active/);
  expect(errors()).toEqual([]);
});

test('the boat: VAAR at the end of the pier shows the crossing and lands you on the island pier; DORP on the island sails back', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 50; s.earnedWork = 50; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openDorp(page);
  const h = await hook(page);
  await page.evaluate(({ x, z }) => window.__muntstad.dorp.teleport(x, z - 3.2), { x: h.harbor.x, z: h.harbor.z });
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 20000 }).toBe('VAAR');
  await page.locator('#dp-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect(page.locator('#overtocht')).toBeVisible();
  await expect(page.locator('#overtocht')).toContainText('Avontuureiland');
  await expect(page.locator('#screen-avontuur')).toHaveClass(/active/, { timeout: 15000 });
  await expect.poll(() => page.evaluate(() => window.__muntstad.avontuur.forestCount), { timeout: 30000 }).toBeGreaterThan(1000);
  const ip = await page.evaluate(() => window.__muntstad.avontuur.player);
  const pier = await page.evaluate(() => window.__muntstad.avontuur.landmarks.PIER);
  expect(Math.abs(ip.x - pier.x)).toBeLessThan(1);
  await expect(page.locator('#overtocht')).toBeHidden({ timeout: 10000 });
  // and back
  await closePopups(page);
  await page.locator('#av-dorp').click({ force: true });
  await expect(page.locator('#overtocht')).toContainText('Muntstad');
  await expect(page.locator('#screen-dorp')).toHaveClass(/active/, { timeout: 15000 });
  await expect.poll(async () => (await hook(page)).player.z, { timeout: 20000 }).toBeLessThan(0);
  expect(errors()).toEqual([]);
});
