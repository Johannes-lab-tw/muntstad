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
  await expect.poll(async () => (await hook(page)).sailing, { timeout: 15000 }).toBe(true);
  expect(await page.locator('#overtocht-tekst').textContent()).toContain('Avontuureiland');
  await expect(page.locator('#screen-avontuur')).toHaveClass(/active/, { timeout: 30000 });
  await expect.poll(() => page.evaluate(() => window.__muntstad.avontuur.forestCount), { timeout: 30000 }).toBeGreaterThan(1000);
  const ip = await page.evaluate(() => window.__muntstad.avontuur.player);
  const pier = await page.evaluate(() => window.__muntstad.avontuur.landmarks.PIER);
  expect(Math.abs(ip.x - pier.x)).toBeLessThan(1);
  await expect.poll(async () => (await hook(page)).sailing, { timeout: 20000 }).toBe(false);
  // and back
  await closePopups(page);
  await page.locator('#av-dorp').click({ force: true });
  await expect(page.locator('#screen-dorp')).toHaveClass(/active/, { timeout: 30000 });
  await expect.poll(async () => (await hook(page)).player.z, { timeout: 20000 }).toBeLessThan(0);
  expect(errors()).toEqual([]);
});

// V9.7: Muntje's own voice. The catalogue is in after boot, a sentence with a file plays through the audio context
// (gespeeld counts), a sentence without a file is not claimed (the iPad voice takes it), and a line with a name is
// spoken as its twin without the name.
test('V9.7 Muntjes eigen stem: catalogus geladen, een zin met bestand speelt, een zin zonder valt terug', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 20; s.earnedWork = 20; return s; });
  await startGame(page);
  await closePopups(page);
  await expect.poll(() => page.evaluate(() => window.__muntstad.stem.klaar), { timeout: 20000 }).toBe(true);
  expect(await page.evaluate(() => window.__muntstad.stem.aantal)).toBeGreaterThan(200);
  const zin = 'Hoi! Fijn dat je er weer bent.';
  expect(await page.evaluate((z) => window.__muntstad.stem.heeft(z), zin)).toBe(true);
  expect(await page.evaluate(() => window.__muntstad.stem.heeft('Deze zin bestaat niet, 12345.'))).toBe(false);
  expect(await page.evaluate(() => window.__muntstad.stem.heeft('Hoi! Ik ben Muntje. Kom, we gaan munten maken!'))).toBe(true);
  expect(await page.evaluate((z) => window.__muntstad.speech.speak(z), zin)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__muntstad.stem.gespeeld), { timeout: 20000 }).toBe(1);
  expect(errors()).toEqual([]);
});

// V9.8: every step opens the next. A locked maker card says what must be there first (not only the coins); the town
// works (vergunning, brug, kade) are cards on the GELDMAKERS tab; buying the vergunning opens the Flat.
test('V9.8 voorwaarden: de kaart zegt "eerst level 2", de vergunning is een kaart en opent de Flat', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => {
    s.wallet = 6000; s.earnedWork = 60000; s.earnedPassive = 60000;
    s.makers = { ...s.makers, limonade: 1, wasstraat: 0, pizzeria: 0, ijssalon: 5, fabriek: 5 };
    return s;
  });
  await startGame(page);
  await closePopups(page);
  await page.locator('#nav-winkel').click();
  await expect(page.locator('#tab-makers')).toHaveClass(/active/);
  // page 1: the Wasstraat waits for the Limonadekraam at level 2 (the coins are there)
  const was = page.locator('.card[data-id="wasstraat"]');
  await expect(was).toHaveClass(/locked/);
  await expect(was.locator('.card-price')).toContainText('eerst level 2');
  // page 2: the Flat waits for the vergunning although the Fabriek is at 5 (a milestone popup may sit on top: close it)
  await closePopups(page);
  await page.locator('#shop-next').click();
  const flat = page.locator('.card[data-id="flat"]');
  await expect(flat).toHaveClass(/locked/);
  await expect(flat.locator('.card-price')).toContainText('eerst vergunning');
  // page 3: the works; the brug waits for the vergunning, the vergunning can be built
  await closePopups(page);
  await page.locator('#shop-next').click();
  await expect(page.locator('.card[data-id="brug"]')).toHaveClass(/locked/);
  const verg = page.locator('.card[data-id="vergunning"]');
  await expect(verg).toHaveClass(/can/);
  await expect(verg.locator('button')).toHaveText('BOUW');
  await closePopups(page);
  await verg.locator('button').click();
  await expect(verg.locator('.card-check')).toBeVisible();
  await expect.poll(async () => (await state(page)).werken.vergunning, { timeout: 10000 }).toBe(true);
  expect((await state(page)).spentMakers).toBe(5000);   // the wallet keeps growing (two makers at level 5), the investment is exact
  await expect(page.locator('.card[data-id="brug"]')).not.toHaveClass(/locked/);
  // back to page 2: the Flat is open now (only the coins are missing)
  await closePopups(page);
  await page.locator('#shop-prev').click();
  await expect(flat).not.toHaveClass(/locked/);
  await expect(flat.locator('.card-price')).toContainText('nog');
  expect(errors()).toEqual([]);
});

// V9.8: maintenance. A broken maker earns nothing and shows KAPOT with a REPAREER button (15 % of its price); after the
// repair the stars are back and the income too. PAPA counts the repair.
test('V9.8 onderhoud: KAPOT op de kaart, REPAREER kost 15 %, daarna draait de geldmaker weer', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => {
    s.wallet = 100; s.earnedWork = 500;
    s.makers = { ...s.makers, limonade: 2 };
    s.onderhoud = { kapot: 'limonade', dag: Math.floor(Date.now() / 86400000), gerepareerd: 0, spentRepairs: 0 };
    return s;
  });
  await startGame(page);
  await closePopups(page);
  expect((await state(page)).onderhoud.kapot).toBe('limonade');
  await page.locator('#nav-winkel').click();
  const card = page.locator('.card[data-id="limonade"]');
  await expect(card.locator('.card-sub')).toContainText('KAPOT');
  await expect(card.locator('button')).toHaveText('REPAREER');
  await card.locator('button').click();
  await expect.poll(async () => (await state(page)).onderhoud.kapot, { timeout: 10000 }).toBe(null);
  const s = await state(page);
  expect(Math.floor(s.wallet)).toBe(97);   // 15 % of 20, rounded up
  expect(s.onderhoud.gerepareerd).toBe(1);
  expect(s.onderhoud.spentRepairs).toBe(3);
  await expect(card.locator('.card-sub')).toContainText('⭐⭐');
  await expect(card.locator('button')).toContainText('BETER');
  expect(errors()).toEqual([]);
});
