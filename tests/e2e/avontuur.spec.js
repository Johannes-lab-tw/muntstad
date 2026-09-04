// AVONTUUR (PLAN-V4 rounds 1-2): the boat lands you on the pier of the Avontuureiland; the joystick walks, the
// space bar / SPRING jumps, the player never walks into the sea, the dog follows, night falls, DORP sails back.
// Runs in the cloud (GitHub Actions), one worker.
import { test, expect } from '@playwright/test';
import { watchErrors, startGame, seedSave, closePopups, shot } from './helpers.js';

const hook = (page) => page.evaluate(() => {
  const h = window.__muntstad.avontuur;
  const p = h.player;
  return { player: p, dog: h.dog, yaw: h.yaw, jumps: h.jumps, onLand: h.onLand(p.x, p.z), kind: h.kindAt(p.x, p.z), darkness: h.darkness, forestCount: h.forestCount };
});

async function openAvontuur(page) {
  await page.locator('#nav-avontuur').click();
  await expect(page.locator('#screen-avontuur')).toHaveClass(/active/);
  await expect.poll(async () => (await hook(page)).forestCount, { timeout: 30000 }).toBeGreaterThan(1000);
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

test('the joystick walks the player off the pier, the dog follows, SPRING jumps, night falls, DORP returns', async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 130; s.earnedWork = 130; s.makers.limonade = 1; s.fun = { hond: true }; s.milestones = ['eerste-geldmaker']; return s; });
  await startGame(page);
  await closePopups(page);
  await expect(page.locator('#nav-avontuur')).toBeVisible();
  await openAvontuur(page);
  await expect(page.locator('#topbar')).toBeVisible();
  const before = await hook(page);
  expect(before.dog, 'the dog is there').not.toBeNull();
  expect(before.onLand, 'starts on the pier').toBe(true);

  // the stick appears where the thumb lands and the player walks forward (north, onto the island)
  await thumb(page, 0, -60, 2500);
  const after = await hook(page);
  const walked = Math.hypot(after.player.x - before.player.x, after.player.z - before.player.z);
  expect(walked, 'walked forward').toBeGreaterThan(1.5);
  expect(after.player.z, 'towards the island').toBeLessThan(before.player.z);
  expect(after.onLand).toBe(true);
  await expect(page.locator('#stick')).not.toHaveClass(/on/);
  const dogMoved = Math.hypot(after.dog.x - before.dog.x, after.dog.z - before.dog.z);
  expect(dogMoved, 'the dog followed').toBeGreaterThan(0.5);

  // SPRING: the player jumps and lands again
  await page.locator('#av-spring').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect.poll(async () => (await hook(page)).jumps, { timeout: 3000 }).toBe(after.jumps + 1);
  await expect.poll(async () => (await hook(page)).player.grounded, { timeout: 4000 }).toBe(true);
  await shot(page, testInfo, '10-avontuur');

  // night: the palette darkens (forced phase for the test), then back to the clock
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.82));
  await expect.poll(async () => (await hook(page)).darkness, { timeout: 3000 }).toBe(1);
  await shot(page, testInfo, '11-avontuur-nacht');
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(null));

  await page.locator('#av-dorp').click();
  await expect(page.locator('#screen-stad')).toHaveClass(/active/);
  expect(errors()).toEqual([]);
});

test('WASD walks, space jumps, and the player never walks into the sea or up the snow', async ({ page }) => {
  const errors = watchErrors(page);
  await startGame(page);
  await closePopups(page);
  await openAvontuur(page);
  const start = await hook(page);
  await page.keyboard.down('w');
  await page.waitForTimeout(900);
  await page.keyboard.up('w');
  const moved = await hook(page);
  expect(Math.hypot(moved.player.x - start.player.x, moved.player.z - start.player.z)).toBeGreaterThan(1);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await hook(page)).jumps, { timeout: 3000 }).toBe(moved.jumps + 1);

  // run backwards (south) for a long time: the sea is off limits, the player stays on the pier or the beach
  await page.evaluate(() => window.__muntstad.avontuur.setInput(0, -1, true));
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.__muntstad.avontuur.setInput(null));
  const end = await hook(page);
  expect(end.onLand, `on land (${end.kind})`).toBe(true);
  expect(errors()).toEqual([]);
});
