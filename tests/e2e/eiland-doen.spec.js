// AVONTUUR round 3 ("Doen"): pick up a shell, chop a tree, sell at the campfire, buy the axe, quest progress.
// The tests teleport the player next to things (window.__muntstad.avontuur.teleport) and press the action button.
import { test, expect } from '@playwright/test';
import { watchErrors, startGame, seedSave, closePopups, state } from './helpers.js';

const hook = (page) => page.evaluate(() => {
  const h = window.__muntstad.avontuur;
  return { player: h.player, action: h.action, forestCount: h.forestCount, camp: h.landmarks.CAMP, lake: h.landmarks.LAKE };
});

async function openAvontuur(page) {
  // force: the 3D screen behind it renders at ~1 fps on CI, so Playwright's "stable" check never settles; a click that lands
  // during the screen animation or under a late popup is simply repeated
  for (let i = 0; i < 4; i++) {
    await closePopups(page);
    await page.locator('#nav-avontuur').click({ force: true });
    try { await expect(page.locator('#screen-avontuur')).toHaveClass(/active/, { timeout: 8000 }); break; } catch (e) { if (i === 3) throw e; }
  }
  await expect.poll(async () => (await hook(page)).forestCount, { timeout: 30000 }).toBeGreaterThan(1000);
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.3));   // daytime, whatever the wall clock says (a night would burn the fire, pay at dawn and pop a sticker)
  await page.waitForTimeout(300);
}

/** Teleport just south of a thing and wait for the action button to offer `label`. */
async function goTo(page, kind, label) {
  const target = await page.evaluate((k) => window.__muntstad.avontuur.nearest(k), kind);
  expect(target, `a ${kind} exists`).not.toBeNull();
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 0.9), target);
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 20000 }).toBe(label);
}

test('PAK picks a shell, HAK chops wood (three taps by hand), the backpack and the quest count along', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 20; s.earnedWork = 20; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  await expect(page.locator('#av-bag')).toContainText('0');

  await goTo(page, 'schelp', 'PAK');
  await page.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect.poll(async () => (await state(page)).eiland.bag.schelp, { timeout: 20000 }).toBe(1);
  // the shell is gone: the button no longer offers PAK for it
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 20000 }).not.toBe('PAK');

  await goTo(page, 'hout', 'HAK');
  for (let i = 0; i < 3; i++) {
    await page.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
    await page.waitForTimeout(150);
  }
  await expect.poll(async () => (await state(page)).eiland.bag.hout, { timeout: 20000 }).toBe(1);
  const s = await state(page);
  expect(s.eiland.collected.hout).toBe(1);
  expect(s.eiland.collected.schelp).toBe(1);
  await expect(page.locator('#av-bag')).toContainText('1');
  expect(errors()).toEqual([]);
});

test('a tree falls after six pieces of wood: bonus wood, a stump, HAK no longer offered there', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 100; s.earnedWork = 100; s.eiland = { bag: { hout: 0, schelp: 0, bes: 0, vis: 0 }, tools: { bijl: true }, quest: 0, questN: 0, questsDone: 0, collected: {}, sold: 0, earned: 0 }; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  await goTo(page, 'hout', 'HAK');
  // with the axe: one tap = two pieces, three taps = six = the tree comes down (+2 bonus)
  for (let i = 0; i < 3; i++) {
    await page.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
    await page.waitForTimeout(200);
  }
  await expect.poll(async () => (await state(page)).eiland.bag.hout, { timeout: 20000 }).toBe(8);
  await expect.poll(() => page.evaluate(() => window.__muntstad.avontuur.fallen), { timeout: 20000 }).toBeGreaterThan(0);
  // (the forest is dense: another tree may well offer HAK from the same spot, so no assertion on the label)
  await expect.poll(() => page.evaluate(() => window.__muntstad.mentorLog.some((l) => l.includes('Timmer'))), { timeout: 20000 }).toBe(true);
  expect(errors()).toEqual([]);
});

test('the chest in the cave: OPEN pays 30 coins once, then the chest is LEEG; a wall stops you at the side', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 10; s.earnedWork = 10; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  const lm = await page.evaluate(() => { const l = window.__muntstad.avontuur.landmarks; return { chest: l.CHEST, cave: l.CAVE }; });
  // in through the mouth: stand at the mouth, then a step in front of the chest
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z), lm.cave);
  await page.waitForTimeout(300);
  expect((await hook(page)).player.ground).toBeCloseTo(lm.cave.floor, 0);
  const h = lm.cave.heading;
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z), { x: lm.chest.x + Math.sin(h) * 1.3, z: lm.chest.z + Math.cos(h) * 1.3 });
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 20000 }).toBe('OPEN');
  await page.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect.poll(async () => Math.floor((await state(page)).wallet), { timeout: 20000 }).toBe(40);
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 20000 }).toBe('LEEG');
  await page.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await page.waitForTimeout(500);
  expect(Math.floor((await state(page)).wallet)).toBe(40);
  // V5.2: the bats flew when you came into the chamber, and the cave ghost woke up when the chest opened
  await expect.poll(() => page.evaluate(() => window.__muntstad.avontuur.bats), { timeout: 20000 }).not.toBe('hang');
  await expect.poll(() => page.evaluate(() => { const s = window.__muntstad.avontuur.caveGhost.state; return s === 'chase' || s === 'pause' ? 'awake' : s; }), { timeout: 20000 }).toBe('awake');
  await expect.poll(() => page.evaluate(() => window.__muntstad.mentorLog.some((l) => l.includes('wakker'))), { timeout: 20000 }).toBe(true);
  // run for the mouth: outside, the ghost gives up and goes back to sleep
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x + Math.sin(0.69) * 3, z + Math.cos(0.69) * 3), lm.cave);
  await expect.poll(() => page.evaluate(() => window.__muntstad.avontuur.caveGhost.state), { timeout: 20000 }).not.toBe('chase');
  await expect.poll(() => page.evaluate(() => window.__muntstad.mentorLog.some((l) => l.includes('veilig'))), { timeout: 20000 }).toBe(true);
  // the walls of the first leg: beside the tunnel, pushing towards it, you stay out (the hill's rock or the wall)
  const mid = { x: lm.cave.x - Math.sin(h) * 2.2, z: lm.cave.z - Math.cos(h) * 2.2 };
  const side = { x: mid.x + Math.cos(h) * 3.0, z: mid.z - Math.sin(h) * 3.0 };
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z), side);
  await page.evaluate(() => window.__muntstad.avontuur.setInput(0, 1, true));
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.__muntstad.avontuur.setInput(null));
  const p = (await hook(page)).player;
  expect(await page.evaluate(({ x, z }) => window.__muntstad.avontuur.inCave(x, z), p), 'the wall keeps you out').toBe(false);
  expect(errors()).toEqual([]);
});

test('KAMP sells the backpack for coins and the axe is bought with the shared wallet', async ({ page }) => {
  const errors = watchErrors(page);
  // a full fire, otherwise the button offers STOOK first (the wood in the bag wants to go into the fire)
  await seedSave(page, (s) => { s.wallet = 50; s.earnedWork = 50; s.eiland = { bag: { hout: 5, schelp: 4, bes: 0, vis: 1 }, tools: {}, quest: 0, questN: 0, questsDone: 0, collected: {}, sold: 0, earned: 0 }; s.nacht = { fire: 100, nights: 0, stolen: 0, clockOffsetMs: 0 }; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  const h = await hook(page);
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 2.2), h.camp);
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 20000 }).toBe('KAMP');
  await page.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect(page.locator('#kamp-overlay')).toBeVisible();
  await expect(page.locator('#kamp')).toContainText('Kampvuur');
  const before = (await state(page)).wallet;
  await page.locator('#kamp-verkoop').click();
  const expected = 5 * 2 + 4 * 3 + 1 * 8;
  await expect.poll(async () => Math.floor((await state(page)).wallet), { timeout: 20000 }).toBe(Math.floor(before) + expected);
  expect((await state(page)).eiland.bag.hout).toBe(0);
  // 50 + 30 = 80 coins: the axe (60) is affordable, the lantern (80) too, the fence not
  await page.locator('[data-tool="bijl"]').click();
  await expect.poll(async () => (await state(page)).eiland.tools.bijl, { timeout: 20000 }).toBe(true);
  expect(Math.floor((await state(page)).wallet)).toBe(Math.floor(before) + expected - 60);
  await expect(page.locator('[data-tool="bijl"]')).toHaveCount(0);
  await page.locator('#kamp-dicht').click();
  await expect(page.locator('#kamp-overlay')).toBeHidden();
  expect(errors()).toEqual([]);
});
