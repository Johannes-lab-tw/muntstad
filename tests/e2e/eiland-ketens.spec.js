// AVONTUUR V6.2: Muntje's quest chains (docs/content/ketens.js) and the shadow wolves. The chain card shows the title,
// the steps and the count; discovering a place finishes an 'ontdek' step; a wolf in the dark shakes the bag, BOE sends
// the pack away. The clock is forced with setPhase; the wolves are put next to the player through the hook.
import { test, expect } from '@playwright/test';
import { watchErrors, startGame, seedSave, closePopups, state } from './helpers.js';

const hook = (page) => page.evaluate(() => {
  const h = window.__muntstad.avontuur;
  return { player: h.player, action: h.action, forestCount: h.forestCount, camp: h.landmarks.CAMP, pier: h.landmarks.PIER, darkness: h.darkness, wolves: h.wolves, drops: h.drops };
});
const mentorHas = (page, text) => page.evaluate((t) => (window.__muntstad.mentorLog || []).some((l) => l.toLowerCase().includes(t)), text);

async function openAvontuur(page) {
  for (let i = 0; i < 4; i++) {
    await closePopups(page);
    await page.locator('#nav-avontuur').click({ force: true });
    try { await expect(page.locator('#screen-avontuur')).toHaveClass(/active/, { timeout: 8000 }); break; } catch (e) { if (i === 3) throw e; }
  }
  await expect.poll(async () => (await hook(page)).forestCount, { timeout: 30000 }).toBeGreaterThan(1000);
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.3));
  await page.waitForTimeout(300);
}
const island = (extra = {}) => ({ bag: { hout: 3, schelp: 2, bes: 0, vis: 0 }, tools: {}, quest: 0, questN: 0, questsDone: 0, collected: {}, sold: 0, earned: 0, honger: 100, keten: 0, stap: 0, stapN: 0, ketensDone: 0, ...extra });

test('the chain card shows the first chain; walking onto the beach finishes an ontdek step; selling counts for a verkoop step', async ({ page }) => {
  const errors = watchErrors(page);
  // chain 3 ("Schelpen op het strand"): ontdek strand → verzamel 4 schelpen → verkoop 2 schelpen
  await seedSave(page, (s) => { s.wallet = 10; s.earnedWork = 10; s.eiland = island({ keten: 3, bag: { hout: 0, schelp: 4, bes: 0, vis: 0 } }); s.nacht = { fire: 30, nights: 0, stolen: 0, clockOffsetMs: 0 }; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  await expect(page.locator('#av-quest')).toBeVisible();
  await expect(page.locator('#av-quest .kt')).toHaveText('Schelpen op het strand');
  await expect(page.locator('#av-quest .st')).toHaveCount(3);
  await expect(page.locator('#av-quest .st.now')).toContainText('strand');
  // onto the beach: the ontdek step is done within a second or two, Muntje says so
  const h = await hook(page);
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z - 12), h.pier);
  await expect.poll(async () => (await state(page)).eiland.stap, { timeout: 20000 }).toBe(1);
  await expect(page.locator('#av-quest .st.done')).toHaveCount(1);
  await expect.poll(() => mentorHas(page, 'strand'), { timeout: 20000 }).toBe(true);
  // step 2 (four shells): the four in the bag do not count, only what you pick from now on; skip it through the hook-free way: sell first shows nothing
  await page.evaluate(() => { window.__muntstad.state.eiland.stap = 2; });   // straight to the verkoop step (picking four shells takes minutes on the runner)
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 2.2), h.camp);
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 20000 }).toBe('KAMP');
  await page.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect(page.locator('#kamp-overlay')).toBeVisible();
  const wallet = (await state(page)).wallet;
  await page.locator('#kamp-grid .card[data-id="schelp"] button').click();
  // four shells sold = the verkoop step (2) done = the chain done: 60 coins on top of the 12 for the shells
  await expect.poll(async () => (await state(page)).eiland.ketensDone, { timeout: 20000 }).toBe(1);
  expect(Math.floor((await state(page)).wallet)).toBe(Math.floor(wallet) + 12 + 60);
  expect((await state(page)).eiland.keten).toBe(4);
  expect((await state(page)).eiland.questsDone).toBe(1);
  await page.locator('#kamp-dicht').click();
  await expect(page.locator('#av-quest .kt')).toHaveText('Sterker vuur');
  expect(errors()).toEqual([]);
});

test('night 5: the shadow wolves come; one bites in the dark and your things lie on the ground; BOE sends the pack off; in the fire light they never bite', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 10; s.earnedWork = 10; s.eiland = island({ bag: { hout: 6, schelp: 4, bes: 2, vis: 0 } }); s.nacht = { fire: 60, nights: 4, stolen: 0, clockOffsetMs: 0, warm: 100 }; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  const h = await hook(page);
  // in the dark, far from the fire: a wolf right behind the player lunges and bites
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 26), h.camp);
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.82));
  await expect.poll(async () => (await hook(page)).darkness, { timeout: 20000 }).toBe(1);
  const p = (await hook(page)).player;
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.wolfAt(x, z + 3), p);
  await expect.poll(async () => (await hook(page)).wolves.length, { timeout: 20000 }).toBeGreaterThanOrEqual(3);
  await expect.poll(async () => (await hook(page)).drops.length, { timeout: 30000 }).toBeGreaterThan(0);
  await expect.poll(() => mentorHas(page, 'wolf'), { timeout: 20000 }).toBe(true);
  expect((await state(page)).nacht.bumped).toBeGreaterThanOrEqual(1);   // the pack keeps lunging while you stand in the dark
  // BOE while a wolf is close: the pack flees (the pack is put round the player: on the slow runner they would take long to arrive)
  const pp = (await hook(page)).player;
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.wolvesAt(x, z), pp);
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 30000 }).toBe('BOE');
  await page.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect.poll(async () => (await hook(page)).wolves.every((w) => w.state === 'flee'), { timeout: 20000 }).toBe(true);
  await expect.poll(() => mentorHas(page, 'rennen weg'), { timeout: 20000 }).toBe(true);
  // by the fire (level 3, light 6 m) a lunging wolf turns back into circling: the drops stay what they were
  await page.evaluate(() => window.__muntstad.avontuur.removeWolves());
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 2.0), h.camp);
  await page.waitForTimeout(500);
  const drops = (await hook(page)).drops.length;
  const bumped = (await state(page)).nacht.bumped;
  const q = (await hook(page)).player;
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.wolfAt(x, z + 3), q);
  await page.waitForTimeout(3000);
  expect((await hook(page)).drops.length).toBe(drops);
  expect((await state(page)).nacht.bumped).toBe(bumped);
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(null));
  expect(errors()).toEqual([]);
});

test('V6.5 the lighthouse: the hut chest on the north coast pays 60 once a day and counts as a kist step; the lighthouse can be discovered', async ({ page }) => {
  const errors = watchErrors(page);
  // chain 14 ("De vuurtoren"): ontdek vuurtoren → kist → 12 hout → nacht
  await seedSave(page, (s) => { s.wallet = 10; s.earnedWork = 10; s.eiland = island({ keten: 14 }); s.nacht = { fire: 30, nights: 0, stolen: 0, clockOffsetMs: 0 }; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  const L = await page.evaluate(() => window.__muntstad.avontuur.landmarks);
  await expect(page.locator('#av-quest .kt')).toHaveText('De vuurtoren');
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 16), L.VUURTOREN);
  await expect.poll(async () => (await state(page)).eiland.stap, { timeout: 20000 }).toBe(1);
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 1.5), L.HUTCHEST);
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 20000 }).toBe('OPEN');
  const wallet = (await state(page)).wallet;
  await page.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect.poll(async () => Math.floor((await state(page)).wallet), { timeout: 20000 }).toBe(Math.floor(wallet) + 60);
  await expect.poll(async () => (await hook(page)).action?.label, { timeout: 20000 }).toBe('LEEG');
  expect((await state(page)).eiland.stap).toBe(2);
  expect((await state(page)).eiland.chestDay).toBe('');   // the cave chest is a different chest
  expect(errors()).toEqual([]);
});
