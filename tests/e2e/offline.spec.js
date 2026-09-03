// Simulated absence: lastTick 1 h back → popup with 1 h of income; 5 h back → exactly the 4 h cap.
import { test, expect } from '@playwright/test';
import { watchErrors, startGame, seedSave, state, shot } from './helpers.js';

const HOUR = 3600000;
const digits = (s) => Number(String(s).replace(/[^\d]/g, ''));

test('1 hour away with a Limonadekraam gives 720 coins and the popup', async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.makers.limonade = 1; s.lastTick = Date.now() - HOUR; s.earnedWork = 100; return s; });
  await startGame(page);
  const popup = page.locator('#popup[data-popup="offline"]');
  await expect(popup).toBeVisible();
  await expect.poll(() => page.locator('#offline-amount').textContent().then(digits), { timeout: 8000 }).toBe(720);
  await expect(popup).toContainText('Terwijl je weg was');
  await shot(page, testInfo, '12-offline-popup');
  const s = await state(page);
  expect(Math.floor(s.wallet)).toBeGreaterThanOrEqual(720);
  expect(Math.floor(s.earnedOffline)).toBeGreaterThanOrEqual(720);
  await page.locator('#popup button').click();
  await expect(popup).toBeHidden();
  expect(errors()).toEqual([]);
});

test('5 hours away is capped at 4 hours: 2 880 coins', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.makers.limonade = 1; s.lastTick = Date.now() - 5 * HOUR; s.earnedWork = 100; return s; });
  await startGame(page);
  await expect(page.locator('#popup[data-popup="offline"]')).toBeVisible();
  await expect.poll(() => page.locator('#offline-amount').textContent().then(digits), { timeout: 8000 }).toBe(2880);
  const s = await state(page);
  expect(Math.floor(s.wallet)).toBeGreaterThanOrEqual(2880);
  expect(Math.floor(s.wallet)).toBeLessThan(2900);
  expect(errors()).toEqual([]);
});

test('a short absence (under a minute) shows no popup', async ({ page }) => {
  await seedSave(page, (s) => { s.makers.limonade = 1; s.lastTick = Date.now() - 30000; return s; });
  await startGame(page);
  await page.waitForTimeout(1500);
  await expect(page.locator('#overlay')).toBeHidden();
  const s = await state(page);
  expect(s.wallet).toBeGreaterThan(5);
  // the economy runs on real time: a slow CI machine spends extra seconds loading, and those earn coins too
  expect(s.wallet).toBeLessThan(process.env.CI ? 14 : 8);
});
