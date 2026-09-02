// The parent side: the gate only opens after a real 3-second hold, RESET needs a double confirmation,
// and the Bewaar-code restores progress (and refuses a broken code).
import { test, expect } from '@playwright/test';
import { watchErrors, startGame, seedSave, state, openPapa, closePopups } from './helpers.js';

test('a short tap on PAPA does not open the gate', async ({ page }) => {
  const errors = watchErrors(page);
  await startGame(page);
  await page.locator('#nav-papa').click();
  await page.waitForTimeout(900);
  await expect(page.locator('#screen-stad')).toHaveClass(/active/);
  await expect(page.locator('#screen-gate')).not.toHaveClass(/active/);
  expect(errors()).toEqual([]);
});

test('RESET asks twice, NEE keeps everything, JA starts fresh', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 300; s.earnedWork = 300; s.makers.limonade = 2; return s; });
  await startGame(page);
  await closePopups(page);
  await openPapa(page);
  await page.locator('#reset-1').click();
  await expect(page.locator('#reset-confirm')).toBeVisible();
  await page.locator('#reset-no').click();
  await expect(page.locator('#reset-confirm')).toBeHidden();
  expect((await state(page)).makers.limonade).toBe(2);
  await page.locator('#reset-1').click();
  await page.locator('#reset-yes').click();
  await expect(page.locator('#screen-start')).toHaveClass(/active/);
  await expect(page.locator('#btn-start')).toHaveText(/SPEEL/);
  const fresh = await state(page);
  expect(fresh.wallet).toBe(0);
  expect(fresh.makers.limonade).toBe(0);
  expect(errors()).toEqual([]);
});

test('Bewaar-code restores progress and refuses a broken code', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 250; s.earnedWork = 300; s.makers.limonade = 3; s.fun = { kroon: true }; s.equipped.hat = 'kroon'; return s; });
  await startGame(page);
  await closePopups(page);
  await openPapa(page);
  const code = await page.locator('#code-out').inputValue();
  expect(code).toMatch(/^MS1\./);
  // wipe, then restore from the code
  await page.locator('#reset-1').click();
  await page.locator('#reset-yes').click();
  await expect(page.locator('#btn-start')).toHaveText(/SPEEL/);
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-stad')).toHaveClass(/active/);
  await openPapa(page);
  await page.locator('#code-in').fill(code);
  await page.locator('#code-load').click();
  await expect(page.locator('#code-status')).toHaveText(/Geladen/);
  const s = await state(page);
  expect(s.makers.limonade).toBe(3);
  expect(s.equipped.hat).toBe('kroon');
  expect(s.flags.started).toBe(true);
  await page.locator('#code-in').fill('MS1.abcdef.zz');
  await page.locator('#code-load').click();
  await expect(page.locator('#code-status')).toHaveText(/klopt niet/);
  expect((await state(page)).makers.limonade).toBe(3);
  // after a reload the restored player is a returning player
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator('#btn-start')).toHaveText(/VERDER SPELEN/);
  expect(errors()).toEqual([]);
});
