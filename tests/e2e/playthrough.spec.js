// Full play-through: start → WERK earns ≥ 20 → buy Limonadekraam → wallet grows without input → buy a hat → HUIS shows it → PAPA gate works.
import { test, expect } from '@playwright/test';
import { watchErrors, startGame, washCars, state, closePopups, openPapa, shot } from './helpers.js';

test('start → work → invest → passive income → fun → house → papa', async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  await startGame(page);
  expect((await state(page)).wallet).toBe(0);

  // WERK: wash until we have at least 20 coins (10 cars)
  await washCars(page, 10);
  const afterWork = await state(page);
  expect(afterWork.wallet).toBeGreaterThanOrEqual(20);
  expect(afterWork.carsWashed).toBeGreaterThanOrEqual(10);
  expect(afterWork.bestWorkRate).toBeGreaterThan(0);
  expect(afterWork.flags.tiredSaid).toBe(true); // mentor: "je handen worden moe"

  // WINKEL: buy the Limonadekraam
  await page.locator('#nav-winkel').click();
  await expect(page.locator('#tab-makers')).toHaveClass(/active/);
  await page.locator('.card[data-id="limonade"] button').click();
  await expect.poll(async () => (await state(page)).makers.limonade).toBe(1);
  await expect(page.locator('#popup[data-popup="milestone"]')).toBeVisible();
  await shot(page, testInfo, '10-milestone');
  await closePopups(page);
  await expect(page.locator('#income-amount')).toHaveText('+12');

  // passive income: the wallet increases without any input
  const w1 = (await state(page)).wallet;
  await page.waitForTimeout(6000);
  const w2 = (await state(page)).wallet;
  expect(w2).toBeGreaterThan(w1);
  expect(w2 - w1).toBeGreaterThan(0.8); // 12/min ≈ 1.2 per 6 s
  expect(w2 - w1).toBeLessThan(2);

  // LEUK: buy the cheapest hat (15) — earn the rest by working
  await page.locator('#shop-stad').click();
  while ((await state(page)).wallet < 15) await washCars(page, 2);
  await page.locator('#nav-winkel').click();
  await page.locator('#tab-fun').click();
  await page.locator('.card[data-id="pet"] button').click();
  await expect.poll(async () => (await state(page)).fun.pet).toBe(true);
  await expect(page.locator('.card[data-id="pet"] .card-check')).toBeVisible();
  const afterHat = await state(page);
  expect(afterHat.equipped.hat).toBe('pet');
  expect(afterHat.spentFun).toBe(15);

  // HUIS shows the hat on the avatar and the first sticker
  await page.locator('#shop-stad').click();
  await page.locator('#nav-huis').click();
  await expect(page.locator('#huis-scene .avatar[data-hat="pet"]')).toBeVisible();
  await expect(page.locator('.sticker.got[data-milestone="eerste-geldmaker"]')).toBeVisible();
  await shot(page, testInfo, '11-huis-met-hoed');
  await page.locator('#huis-stad').click();

  // not enough coins: the card shakes, nothing is bought, wallet unchanged
  await page.locator('#nav-winkel').click();
  await page.locator('#tab-fun').click();
  const before = (await state(page)).wallet;
  await page.locator('.card[data-id="tovenaar"] button').click(); // 50, on the first page
  await page.waitForTimeout(300);
  expect((await state(page)).fun.tovenaar).toBeUndefined();
  expect(Math.floor((await state(page)).wallet)).toBeGreaterThanOrEqual(Math.floor(before));
  await expect(page.locator('#bubble-text')).toContainText('Nog');
  await page.locator('#shop-stad').click();

  // PAPA gate + stats
  await openPapa(page);
  await expect(page.locator('#papa-stats')).toContainText('Verdiend met WERK');
  const stats = await page.locator('#papa-stats').textContent();
  expect(stats).toContain('Uitgegeven aan LEUK');
  await expect(page.locator('#code-out')).toHaveValue(/^MS1\./);
  await page.locator('#papa-stad').click();
  await expect(page.locator('#screen-stad')).toHaveClass(/active/);

  expect(errors()).toEqual([]);
});
