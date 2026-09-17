// AVONTUUR round 4 ("Nacht"): the fire wants wood (STOOK), a ghost steals in the dark but not in the light of the
// lantern, and dawn pays when the fire kept burning. The clock is forced with setPhase.
import { test, expect } from '@playwright/test';
import { watchErrors, startGame, seedSave, closePopups, state } from './helpers.js';

const hook = (page) => page.evaluate(() => {
  const h = window.__muntstad.avontuur;
  return { player: h.player, action: h.action, forestCount: h.forestCount, camp: h.landmarks.CAMP, darkness: h.darkness, ghosts: h.ghosts, lights: h.lights };
});
const mentorHas = (page, text) => page.evaluate((t) => window.__muntstad.mentorLog.some((l) => l.includes(t)), text);

async function openAvontuur(page) {
  // force: the 3D screen behind it renders at ~1 fps on CI, so Playwright's "stable" check never settles; a click that lands
  // during the screen animation or under a late popup is simply repeated
  for (let i = 0; i < 4; i++) {
    await closePopups(page);
    await page.locator('#nav-avontuur').click({ force: true });
    try { await expect(page.locator('#screen-avontuur')).toHaveClass(/active/, { timeout: 8000 }); break; } catch (e) { if (i === 3) throw e; }
  }
  await expect.poll(async () => (await hook(page)).forestCount, { timeout: 45000 }).toBeGreaterThan(1000);
  await page.waitForTimeout(300);
}
const island = (extra = {}) => ({ bag: { hout: 3, schelp: 0, bes: 0, vis: 0 }, tools: {}, quest: 0, questN: 0, questsDone: 0, collected: {}, sold: 0, earned: 0, ...extra });

test('night falls: Muntje warns, STOOK feeds the fire with the wood in the bag, a ghost steals in the dark, dawn pays', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 10; s.earnedWork = 10; s.eiland = island(); s.nacht = { fire: 60, nights: 0, stolen: 0, clockOffsetMs: 0 }; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  await page.evaluate(() => window.__muntstad.avontuur.setWeer('zon'));   // rain burns the heap faster than the poll below
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.82));
  await expect.poll(async () => (await hook(page)).darkness, { timeout: 40000 }).toBe(1);
  await expect.poll(() => mentorHas(page, 'donker'), { timeout: 40000 }).toBe(true);

  // STOOK at the fire (V6.2: its own button next to EET): 3 pieces of wood → 3 more in the heap
  const h = await hook(page);
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 2.2), h.camp);
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 40000 }).toBe('KAMP');
  await expect(page.locator('#av-stook')).toBeVisible({ timeout: 40000 });
  const fireBefore = (await state(page)).nacht.fire;
  await page.locator('#av-stook').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  const fireAfter = (await state(page)).nacht.fire;   // read at once: on a slow runner the heap burns a piece while we poll
  await expect.poll(async () => (await state(page)).eiland.bag.hout, { timeout: 40000 }).toBe(0);
  expect(fireAfter).toBeGreaterThan(fireBefore + 2);
  await expect(page.locator('#av-stook')).toBeHidden({ timeout: 40000 });
  await expect(page.locator('#av-nacht')).toContainText('Nacht 1');

  // a ghost next to the player, far from the fire's light: it steals once
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 24), h.camp);
  await page.waitForTimeout(200);
  const p = (await hook(page)).player;
  expect((await hook(page)).lights.some((l) => Math.hypot(l.x - p.x, l.z - p.z) < l.r)).toBe(false);
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.ghostAt(x, z + 1.0), p);
  // at least once: on the slow CI runner (ipad-mini) the dark lasts long enough for a second steal (6 sep: 2 instead of 1)
  await expect.poll(async () => (await state(page)).nacht.stolen, { timeout: 40000 }).toBeGreaterThanOrEqual(1);
  await expect.poll(() => mentorHas(page, 'spook'), { timeout: 40000 }).toBe(true);

  // dawn: the fire still burns → the first night pays 20 coins, and (V6.6) chapter 1 of the campaign pays its coin too
  const walletBefore = Math.floor((await state(page)).wallet);
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.3));
  await expect.poll(async () => (await state(page)).nacht.nights, { timeout: 40000 }).toBe(1);
  expect(Math.floor((await state(page)).wallet)).toBe(walletBefore + 20 + 50);
  expect((await state(page)).campagne.hoofdstuk).toBe(1);
  await expect.poll(async () => (await hook(page)).ghosts.length, { timeout: 40000 }).toBe(0);
  expect(errors()).toEqual([]);
});

test('V7.1 (iPad 7 sep): a nearly full bonfire still takes wood; a full one says "vol", never "geen hout" with a full bag', async ({ page }) => {
  const errors = watchErrors(page);
  // the bug: 399.4 of 400 pieces in the heap, 38 in the bag; STOOK did nothing and Muntje said "Je hebt geen hout"
  await seedSave(page, (s) => { s.wallet = 10; s.earnedWork = 10; s.eiland = island({ bag: { hout: 38, schelp: 4, bes: 16, vis: 0 }, tools: { rugzak: true } }); s.nacht = { fire: 399.4, nights: 1, stolen: 0, clockOffsetMs: 0 }; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  const h = await hook(page);
  await page.evaluate(() => window.__muntstad.avontuur.setWeer('zon'));   // V8.2: rain would burn the heap faster and make room for two pieces
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 2.2), h.camp);
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 40000 }).toBe('KAMP');
  await expect(page.locator('#av-stook')).toBeVisible({ timeout: 40000 });
  await page.locator('#av-stook').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  // one piece goes in (two on a slow runner where the heap burned a crumb more while we waited); the point is: not zero
  await expect.poll(async () => (await state(page)).eiland.bag.hout, { timeout: 40000 }).toBeLessThan(38);
  expect((await state(page)).eiland.bag.hout).toBeGreaterThanOrEqual(36);
  expect((await state(page)).nacht.fire).toBeGreaterThan(399.8);   // topped off (it burns a crumb per second)
  expect(await mentorHas(page, 'geen hout')).toBe(false);
  // the heap is full now: STOOK folds away; a tap that still lands on a full heap says so
  await expect(page.locator('#av-stook')).toBeHidden({ timeout: 40000 });
  await page.evaluate(() => { window.__muntstad.state.nacht.fire = window.__muntstad.config.nacht.fireMax; window.__muntstad.avontuur.stoke(); });
  await expect.poll(() => mentorHas(page, 'vuur is vol'), { timeout: 40000 }).toBe(true);
  expect(await mentorHas(page, 'geen hout')).toBe(false);
  expect(errors()).toEqual([]);
});

test('V5.3: hunger drains and EET fills it; the Nachthert bumps you and your things lie on the ground to PAK; an empty stomach at night = faint at the fire', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 10; s.earnedWork = 10; s.eiland = island({ bag: { hout: 6, schelp: 4, bes: 2, vis: 1 }, honger: 30 }); s.nacht = { fire: 100, nights: 1, stolen: 0, clockOffsetMs: 0 }; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  // EET: the stomach is at 30 → a fish first (+40)
  await expect(page.locator('#av-eet')).toBeVisible();
  await page.locator('#av-eet').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect.poll(async () => (await state(page)).eiland.bag.vis, { timeout: 40000 }).toBe(0);
  expect((await state(page)).eiland.honger).toBeGreaterThan(60);
  // night 2: the deer comes; put it right behind the player in the dark, away from the fire
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.82));
  await expect.poll(async () => (await hook(page)).darkness, { timeout: 40000 }).toBe(1);
  const h = await hook(page);
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 24), h.camp);
  await page.waitForTimeout(300);
  const p = (await hook(page)).player;
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.deerAt(x, z + 2.5), p);
  await expect.poll(async () => (await state(page)).nacht.bumped, { timeout: 40000 }).toBeGreaterThanOrEqual(1);   // on a slow runner it may already have bumped twice
  await page.evaluate(() => window.__muntstad.avontuur.removeDeer());   // one bump is enough for this test (it would come back after fleeing)
  await expect.poll(() => page.evaluate(() => window.__muntstad.avontuur.drops.length), { timeout: 40000 }).toBeGreaterThan(0);
  const dropsBefore = await page.evaluate(() => window.__muntstad.avontuur.drops.length);
  const after = await state(page);
  const bagAfter = after.eiland.bag;
  // nothing is lost by the bump itself; on the slow runner a ghost may have stolen one thing in the meantime (counted in nacht.stolen)
  const total = bagAfter.hout + bagAfter.schelp + bagAfter.bes + dropsBefore;
  expect(total).toBeLessThanOrEqual(6 + 4 + 2);
  expect(total).toBeGreaterThanOrEqual(6 + 4 + 2 - after.nacht.stolen);
  // pick one up again
  const d0 = await page.evaluate(() => window.__muntstad.avontuur.drops[0]);
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 0.5), d0);
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 40000 }).toBe('PAK');
  await page.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect.poll(() => page.evaluate(() => window.__muntstad.avontuur.drops.length), { timeout: 40000 }).toBe(dropsBefore - 1);
  // an empty stomach in the dark: faint, wake at the fire with half the bag
  await page.evaluate(() => { window.__muntstad.state.eiland.honger = 0; });
  await expect.poll(async () => (await state(page)).nacht.fainted, { timeout: 40000 }).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__muntstad.mentorLog.some((l) => l.includes('wakker bij het vuur'))), { timeout: 40000 }).toBe(true);
  await expect.poll(async () => { const q = (await hook(page)).player; return Math.hypot(q.x - h.camp.x, q.z - h.camp.z); }, { timeout: 40000 }).toBeLessThan(5);
  expect((await state(page)).eiland.honger).toBeGreaterThan(40);   // afterFaint (50) minus a second of draining
  expect(errors()).toEqual([]);
});

test('with the lantern a ghost next to you cannot steal; the tent lets you sleep to the morning', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 10; s.earnedWork = 10; s.eiland = island({ tools: { lantaarn: true, tent: true } }); s.nacht = { fire: 60, nights: 0, stolen: 0, clockOffsetMs: 0 }; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.82));
  await expect.poll(async () => (await hook(page)).darkness, { timeout: 40000 }).toBe(1);
  const h = await hook(page);
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 24), h.camp);
  await page.waitForTimeout(200);
  const p = (await hook(page)).player;
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.ghostAt(x, z + 1.0), p);
  await page.waitForTimeout(3000);
  expect((await state(page)).nacht.stolen, 'the lantern keeps it off').toBe(0);
  const ghosts = (await hook(page)).ghosts;
  expect(ghosts.length).toBeGreaterThan(0);
  expect(Math.hypot(ghosts[0].x - p.x, ghosts[0].z - p.z), 'it hovers outside the light').toBeGreaterThan(1.0);

  // SLAAP in the tent shifts the clock to just before dawn (visible once the forced night phase is released)
  const tent = await page.evaluate(() => window.__muntstad.avontuur.landmarks.TENT);
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 1.2), tent);
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 40000 }).toBe('SLAAP');
  await page.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect.poll(async () => (await state(page)).nacht.clockOffsetMs, { timeout: 40000 }).toBeGreaterThan(0);
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(null));
  // the clock now stands just before dawn (a slow runner may already have crossed into the morning): the phase says so
  await expect.poll(() => page.evaluate(() => { const p = window.__muntstad.avontuur.phase; return p > 0.94 || p < 0.15; }), { timeout: 40000 }).toBe(true);
  await expect.poll(async () => (await hook(page)).darkness, { timeout: 60000 }).toBeLessThan(1);
  expect(errors()).toEqual([]);
});

// V8.2: the weather. A storm makes the fire eat three times the wood (the afdak keeps it dry), the day badge shows it,
// lightning strikes the tree beside the camp in the night and the burnt tree leaves wood at dawn.
test('V8.2 storm: the fire burns three times as fast, the badge shows it, lightning burns the tree and dawn leaves wood', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 10; s.earnedWork = 10; s.eiland = island(); s.nacht = { fire: 120, nights: 0, stolen: 0, clockOffsetMs: 0 }; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  const weer = () => page.evaluate(() => window.__muntstad.avontuur.weer);
  await page.evaluate(() => window.__muntstad.avontuur.setWeer('storm'));
  expect((await weer()).mul).toBe(3);
  await expect(page.locator('#av-nacht')).toContainText('⛈️', { timeout: 40000 });
  // night: the strike is forced (the real one comes 40 s after dark); the tree burns and counts as a light
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.82));
  await expect.poll(async () => (await hook(page)).darkness, { timeout: 40000 }).toBe(1);
  const before = (await state(page)).eiland.bag.hout;
  await page.evaluate(() => window.__muntstad.avontuur.strikeNow());
  await expect.poll(() => page.evaluate(() => window.__muntstad.avontuur.bliksem), { timeout: 40000 }).toBe(true);
  await expect.poll(() => mentorHas(page, 'Bliksem'), { timeout: 40000 }).toBe(true);
  expect((await hook(page)).lights.length).toBeGreaterThanOrEqual(2);
  // dawn: the burnt tree leaves six pieces of wood
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.3));
  await expect.poll(async () => (await state(page)).eiland.bag.hout, { timeout: 40000 }).toBe(before + 6);
  await expect.poll(() => page.evaluate(() => window.__muntstad.avontuur.bliksem), { timeout: 40000 }).toBe(false);
  // sun again: the multiplier is back to one
  await page.evaluate(() => window.__muntstad.avontuur.setWeer('zon'));
  expect((await weer()).mul).toBe(1);
  expect(errors()).toEqual([]);
});

// V8.4: the pirates. Forced pirate night: three pirates next to the player, BOE sends each one running, all three gone
// = 30 coins; a second landing that reaches the fire plunders the bag and the fire.
test('V8.4 pirates: BOE sends them running one by one for a gold coin each; when they reach the fire they plunder', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 10; s.earnedWork = 10; s.fun = {}; s.eiland = island({ bag: { hout: 10, schelp: 10, bes: 0, vis: 0 } }); s.nacht = { fire: 100, nights: 0, stolen: 0, clockOffsetMs: 0 }; return s; });   // no dog: it would chase the pirates itself
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.82));
  await expect.poll(async () => (await hook(page)).darkness, { timeout: 40000 }).toBe(1);
  const piraten = () => page.evaluate(() => window.__muntstad.avontuur.piraten);
  const h = await hook(page);
  // away from the fire, so the dog and the fire play no part
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 30), h.camp);
  await page.evaluate(() => window.__muntstad.avontuur.piratenNu());
  await expect.poll(async () => (await piraten()).length, { timeout: 40000 }).toBe(3);
  const walletBefore = Math.floor((await state(page)).wallet);
  for (let i = 3; i > 0; i--) {
    const p = (await hook(page)).player;
    await page.evaluate(({ x, z }) => window.__muntstad.avontuur.piratenAt(x, z + 2.5), p);
    await expect.poll(async () => (await hook(page)).action?.label, { timeout: 40000 }).toBe('BOE');
    await page.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
    await expect.poll(async () => (await piraten()).filter((q) => q.state === 'come').length, { timeout: 40000 }).toBe(i - 1);
  }
  await expect.poll(async () => Math.floor((await state(page)).wallet), { timeout: 40000 }).toBe(walletBefore + 30);
  await expect.poll(() => mentorHas(page, 'piraten'), { timeout: 40000 }).toBe(true);
  // the second landing reaches the fire: a share of the bag and twenty pieces of wood go with them
  await expect.poll(async () => (await piraten()).length, { timeout: 40000 }).toBe(0);
  const houtBefore = (await state(page)).eiland.bag.hout, fireBefore = (await state(page)).nacht.fire;
  await page.evaluate(() => window.__muntstad.avontuur.piratenNu());
  await expect.poll(async () => (await piraten()).length, { timeout: 40000 }).toBe(3);
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.piratenAt(x, z + 1.0), h.camp);
  await expect.poll(async () => (await state(page)).eiland.bag.hout, { timeout: 40000 }).toBe(houtBefore - Math.floor(houtBefore * 0.3));
  expect((await state(page)).nacht.fire).toBeLessThanOrEqual(fireBefore - 20 + 1);
  await expect.poll(() => mentorHas(page, 'namen spullen'), { timeout: 40000 }).toBe(true);
  expect(errors()).toEqual([]);
});

// V9.2: defending yourself. With a spear the action on a wolf in range is SPEER: two hits and the wolf poofs for two
// coins; the water pistol poofs a ghost in one; the dusk banner names the night.
test('V9.2 weapons: SPEER beats a wolf in two hits, WATER poofs a ghost, the banner says what comes', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 10; s.earnedWork = 10; s.eiland = island({ tools: { speer: true, waterspuit: true } }); s.nacht = { fire: 100, nights: 5, stolen: 0, clockOffsetMs: 0 }; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  await page.evaluate(() => window.__muntstad.avontuur.setWeer('zon'));
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.82));
  await expect.poll(async () => (await hook(page)).darkness, { timeout: 40000 }).toBe(1);
  await expect(page.locator('#av-banner')).toContainText('Nacht 6', { timeout: 40000 });
  const levens = () => page.evaluate(() => window.__muntstad.avontuur.levens);
  const wolves = () => page.evaluate(() => window.__muntstad.avontuur.wolves);
  // the pack next to the player, away from the fire; the spear is the action
  const h = await hook(page);
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 30), h.camp);
  await page.evaluate(() => window.__muntstad.avontuur.spawnWolves());
  const p = (await hook(page)).player;
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.wolvesAt(x, z + 3), p);
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 40000 }).toBe('SPEER');
  const n0 = (await wolves()).length;
  const poefs = () => page.evaluate(() => window.__muntstad.avontuur.poefs);
  const earned = async () => Math.floor((await state(page)).earnedWork);   // the loot lands here too; a ghost can steal from the wallet meanwhile
  const earnedBefore = await earned();
  // two hits kill a wolf; on the slow runner the pack moves, lunges or gives up between taps, so place them again and
  // tap until one poofs (the spear reloads in 0.9 s); a wolf that ran off and was removed is not a poof
  for (let i = 0; i < 10 && (await poefs()) === 0; i++) {
    await page.evaluate(({ x, z }) => window.__muntstad.avontuur.wolvesAt(x, z + 3), p);
    try { await expect.poll(async () => (await hook(page)).action?.label, { timeout: 8000 }).toBe('SPEER'); } catch (e) { continue; }
    await page.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
    await page.waitForTimeout(1200);
  }
  expect(await poefs()).toBe(1);
  await expect.poll(async () => (await wolves()).length, { timeout: 40000 }).toBeLessThan(n0);
  await expect.poll(earned, { timeout: 40000 }).toBe(earnedBefore + 2);
  // a ghost right here: the water pistol is the action, one hit and it is gone
  await page.evaluate(() => window.__muntstad.avontuur.scareWolves());
  await expect.poll(async () => (await wolves()).filter((w) => w.state !== 'flee').length, { timeout: 40000 }).toBe(0);
  const q = (await hook(page)).player;
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.ghostAt(x, z + 2), q);
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 40000 }).toBe('WATER');
  await page.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect.poll(poefs, { timeout: 40000 }).toBe(2);   // the ghost poofed (another one may have drifted in meanwhile)
  await expect.poll(earned, { timeout: 40000 }).toBe(earnedBefore + 3);
  expect(errors()).toEqual([]);
});
