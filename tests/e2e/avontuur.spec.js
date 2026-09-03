// AVONTUUR (PLAN-V4 round 1): the joystick walks, the space bar / SPRING jumps, the player stays on the island,
// the dog follows, and STAD brings the town back. Runs in the cloud (GitHub Actions), one worker.
import { test, expect } from '@playwright/test';
import { watchErrors, startGame, seedSave, closePopups, shot } from './helpers.js';

const hook = (page) => page.evaluate(() => {
  const h = window.__muntstad.avontuur;
  return { player: h.player, dog: h.dog, yaw: h.yaw, island: h.island, jumps: h.jumps };
});

async function openAvontuur(page) {
  await page.locator('#nav-avontuur').click();
  await expect(page.locator('#screen-avontuur')).toHaveClass(/active/);
  await page.waitForTimeout(400);
}

/** Touch the left half of the screen and hold the thumb `dx, dy` px from where it landed. */
async function thumb(page, dx, dy, holdMs) {
  await page.evaluate(async ({ dx, dy, holdMs }) => {
    const el = document.getElementById('screen-avontuur');
    const r = el.getBoundingClientRect();
    const x0 = r.left + r.width * 0.2, y0 = r.top + r.height * 0.6;
    const ev = (type, x, y) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0 }));
    ev('pointerdown', x0, y0);
    ev('pointermove', x0 + dx, y0 + dy);
    await new Promise((res) => setTimeout(res, holdMs));
    ev('pointerup', x0 + dx, y0 + dy);
  }, { dx, dy, holdMs });
}

test('the joystick walks the player, the dog follows, SPRING jumps, STAD returns', async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 130; s.earnedWork = 130; s.makers.limonade = 1; s.fun = { hond: true }; s.milestones = ['eerste-geldmaker']; return s; });
  await startGame(page);
  await closePopups(page);
  await expect(page.locator('#nav-avontuur')).toBeVisible();
  await openAvontuur(page);
  await expect(page.locator('#topbar')).toBeVisible();
  const before = await hook(page);
  expect(before.dog, 'the dog is there').not.toBeNull();

  // the stick appears where the thumb lands and the player walks forward
  await thumb(page, 0, -60, 2000);
  const after = await hook(page);
  const walked = Math.hypot(after.player.x - before.player.x, after.player.z - before.player.z);
  expect(walked, 'walked forward').toBeGreaterThan(1.5);
  await expect(page.locator('#stick')).not.toHaveClass(/on/);
  // the dog trotted after the player
  const dogDist = Math.hypot(after.player.x - after.dog.x, after.player.z - after.dog.z);
  expect(dogDist).toBeLessThan(3.5);

  // SPRING: the player jumps and lands again (a slow runner may render only a few frames of the arc)
  await page.locator('#av-spring').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect.poll(async () => (await hook(page)).jumps, { timeout: 3000 }).toBe(after.jumps + 1);
  await expect.poll(async () => (await hook(page)).player.grounded, { timeout: 4000 }).toBe(true);
  await shot(page, testInfo, '10-avontuur');

  await page.locator('#av-stad').click();
  await expect(page.locator('#screen-stad')).toHaveClass(/active/);
  expect(errors()).toEqual([]);
});

test('WASD walks, space jumps, and the player never leaves the island', async ({ page }) => {
  const errors = watchErrors(page);
  await startGame(page);
  await closePopups(page);
  await openAvontuur(page);
  const start = await hook(page);
  await page.keyboard.down('w');
  await page.waitForTimeout(700);
  await page.keyboard.up('w');
  const moved = await hook(page);
  expect(Math.hypot(moved.player.x - start.player.x, moved.player.z - start.player.z)).toBeGreaterThan(1);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await hook(page)).jumps, { timeout: 3000 }).toBe(moved.jumps + 1);

  // run in one direction for a long time: the sea is off limits
  await page.evaluate(() => window.__muntstad.avontuur.setInput(0, 1, true));
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.__muntstad.avontuur.setInput(null));
  const end = await hook(page);
  expect(end.player.x).toBeGreaterThan(end.island.x + 0.3);
  expect(end.player.x).toBeLessThan(end.island.x + end.island.w - 0.3);
  expect(end.player.z).toBeGreaterThan(end.island.z + 0.3);
  expect(end.player.z).toBeLessThan(end.island.z + end.island.d - 0.3);
  expect(errors()).toEqual([]);
});
