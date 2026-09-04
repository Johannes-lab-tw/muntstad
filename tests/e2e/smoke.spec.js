import { test, expect } from '@playwright/test';
import { watchErrors, startGame, seedSave, openPapa, shot, closePopups, state } from './helpers.js';

test('every screen loads without console errors, with a screenshot of each', async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.locator('#btn-start')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
  await shot(page, testInfo, '01-start');

  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-stad')).toHaveClass(/active/);
  // the welcome line ('Ik ben Muntje') may already be replaced by the WERK tip on a slow runner: check the log
  await expect.poll(() => page.evaluate(() => window.__muntstad.mentorLog.some((t) => t.includes('Muntje'))), { timeout: 15000 }).toBe(true);
  await shot(page, testInfo, '13-muntje-praat', { keepBubble: true });
  await page.waitForTimeout(500);
  await shot(page, testInfo, '02-stad');

  await page.locator('#nav-werk').click();
  await expect(page.locator('#screen-werk')).toHaveClass(/active/);
  await page.waitForTimeout(1200);
  await shot(page, testInfo, '03-werk');
  await page.locator('#btn-klaar').click();

  await page.locator('#nav-winkel').click();
  await expect(page.locator('#screen-winkel')).toHaveClass(/active/);
  await page.waitForTimeout(300);
  await shot(page, testInfo, '04-winkel-geldmakers');
  await page.locator('#tab-fun').click();
  await page.waitForTimeout(300);
  await shot(page, testInfo, '05-winkel-leuk');
  await page.locator('#shop-stad').click();

  await page.locator('#nav-huis').click();
  await expect(page.locator('#screen-huis')).toHaveClass(/active/);
  await page.waitForTimeout(300);
  await shot(page, testInfo, '06-huis');
  await page.locator('#huis-stad').click();

  await openPapa(page);
  await shot(page, testInfo, '08-papa');
  await page.locator('#papa-stad').click();
  await expect(page.locator('#screen-stad')).toHaveClass(/active/);

  expect(errors()).toEqual([]);
});

test('the gate screen and popups render without errors', async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 500; s.earnedWork = 500; s.makers.limonade = 1; s.milestones = ['eerste-geldmaker']; return s; });
  await startGame(page);
  await closePopups(page);
  // building card
  await page.evaluate(() => window.__muntstad.state && document.getElementById('town').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 })));
  const btn = page.locator('#nav-papa');
  const box = await btn.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(3100);
  await expect(page.locator('#screen-gate')).toHaveClass(/active/, { timeout: 20000 });
  await page.mouse.up();
  await shot(page, testInfo, '07-gate');
  // a wrong answer stays on the gate with a new sum
  const sumBefore = await page.locator('#gate-sum').textContent();
  await page.locator('#keypad button[data-key="1"]').click();
  await page.locator('#keypad button[data-key="OK"]').click();
  await expect(page.locator('#screen-gate')).toHaveClass(/active/);
  await expect.poll(() => page.locator('#gate-sum').textContent()).not.toBe(sumBefore);
  await page.locator('#gate-stad').click();
  await expect(page.locator('#screen-stad')).toHaveClass(/active/);
  expect(errors()).toEqual([]);
});

test('portrait shows the rotate hint without crashing', async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  await page.setViewportSize({ width: 810, height: 1080 });
  await page.goto('/');
  await expect(page.locator('#rotate')).toBeVisible();
  await expect(page.locator('#rotate')).toContainText('Draai je iPad');
  await shot(page, testInfo, '09-portrait');
  await page.setViewportSize({ width: 1080, height: 810 });
  await expect(page.locator('#rotate')).toBeHidden();
  await expect(page.locator('#btn-start')).toBeVisible();
  expect(errors()).toEqual([]);
});

test('two milestones at once are celebrated one after the other', async ({ page }) => {
  const errors = watchErrors(page);
  // a level-5 Limonadekraam and 1 200 coins earned, but only the first sticker on the wall: two stickers are due at once
  await seedSave(page, (s) => { s.makers.limonade = 5; s.earnedWork = 1200; s.milestones = ['eerste-geldmaker']; return s; });
  await startGame(page);
  const popup = page.locator('#popup[data-popup="milestone"]');
  await expect(popup).toBeVisible({ timeout: 10000 });
  await expect(popup).toContainText('1 000');
  await page.locator('#popup button').click();
  await expect(popup).toBeVisible({ timeout: 10000 });
  await expect(popup).toContainText('level 5');
  await page.locator('#popup button').click();
  await expect(page.locator('#overlay')).toBeHidden();
  const s = await state(page);
  expect(s.milestones).toEqual(expect.arrayContaining(['eerste-geldmaker', 'duizend', 'level-5']));
  await page.locator('#nav-huis').click();
  await expect(page.locator('.sticker.got[data-milestone="level-5"]')).toBeVisible();
  expect(errors()).toEqual([]);
});
