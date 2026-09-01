import { test, expect } from '@playwright/test';
import { watchErrors, startGame, washCars, state, seedSave, SAVE_KEY } from './helpers.js';

test('reload keeps the progress', async ({ page }) => {
  const errors = watchErrors(page);
  await startGame(page);
  await washCars(page, 2);
  const before = await state(page);
  expect(before.wallet).toBeGreaterThanOrEqual(4);
  // autosave happens within 5 s; the pagehide handler covers the rest
  await page.waitForTimeout(5500);
  await page.reload();
  await expect(page.locator('#btn-start')).toHaveText(/VERDER SPELEN/);
  await page.locator('#btn-start').click();
  const after = await state(page);
  expect(after.wallet).toBeGreaterThanOrEqual(before.wallet);
  expect(after.carsWashed).toBe(before.carsWashed);
  expect(after.flags.started).toBe(true);
  expect(errors()).toEqual([]);
});

test('a corrupted save resets cleanly instead of a blank screen', async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript((key) => window.localStorage.setItem(key, '{"wallet": 12, "makers": '), SAVE_KEY);
  await page.goto('/');
  await expect(page.locator('#btn-start')).toBeVisible();
  await expect(page.locator('#btn-start')).toHaveText(/SPEEL/);
  await page.locator('#btn-start').click();
  expect((await state(page)).wallet).toBe(0);
  expect(errors()).toEqual([]);
});

test('a seeded save with makers and items is restored', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => {
    s.wallet = 250;
    s.earnedWork = 200;
    s.earnedPassive = 300;
    s.makers.limonade = 2;
    s.makers.wasstraat = 1;
    s.fun = { kroon: true, hond: true };
    s.equipped.hat = 'kroon';
    return s;
  });
  await startGame(page);
  const s = await state(page);
  expect(s.makers.wasstraat).toBe(1);
  expect(s.equipped.hat).toBe('kroon');
  await expect(page.locator('#income-amount')).toHaveText('+68');
  await page.locator('#nav-huis').click();
  await expect(page.locator('#huis-scene .avatar[data-hat="kroon"]')).toBeVisible();
  await expect(page.locator('#huis-scene .pet[data-item="hond"]')).toBeVisible();
  expect(errors()).toEqual([]);
});
