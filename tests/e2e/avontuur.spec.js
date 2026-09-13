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
  // force: the 3D screen behind it renders at ~1 fps on CI, so Playwright's "stable" check never settles; a click that lands
  // during the screen animation or under a late popup is simply repeated
  for (let i = 0; i < 4; i++) {
    await closePopups(page);
    await page.locator('#nav-avontuur').click({ force: true });
    try { await expect(page.locator('#screen-avontuur')).toHaveClass(/active/, { timeout: 8000 }); break; } catch (e) { if (i === 3) throw e; }
  }
  await expect.poll(async () => (await hook(page)).forestCount, { timeout: 45000 }).toBeGreaterThan(1000);
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.3));   // daytime, whatever the wall clock says (a night would burn the fire, pay at dawn and pop a sticker)
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
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
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
  await expect.poll(async () => (await hook(page)).jumps, { timeout: 40000 }).toBe(after.jumps + 1);
  await expect.poll(async () => (await hook(page)).player.grounded, { timeout: 40000 }).toBe(true);
  await shot(page, testInfo, '10-avontuur');

  // night: the palette darkens (forced phase for the test), then back to the clock
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.82));
  await expect.poll(async () => (await hook(page)).darkness, { timeout: 40000 }).toBe(1);
  await shot(page, testInfo, '11-avontuur-nacht');
  await page.evaluate(() => window.__muntstad.avontuur.setPhase(null));
  // back to day = dawn: the first night survived pays and earns the 🌙 sticker popup (R6); close it before DORP
  await page.waitForTimeout(800);
  await closePopups(page);

  // V6.3: DORP is the boat back: the crossing shows for a moment, then you stand on the harbour pier of the walkable town
  // (the crossing overlay shows for 2.6 s; on the slow runner it may already be gone when we look, so only the shore counts).
  // The dawn sticker can pop up late on the slow runner (ipad-mini, 6 sep) and swallow the tap: close and tap again;
  // vaar() ignores a second call while the boat is sailing
  for (let i = 0; i < 4; i++) {
    await closePopups(page);
    await page.locator('#av-dorp').click({ force: true });
    try { await expect(page.locator('#screen-dorp')).toHaveClass(/active/, { timeout: 12000 }); break; } catch (e) { if (i === 3) throw e; }
  }
  expect(errors()).toEqual([]);
});

// V7.2 (PLAN-V7 §C.2): the island's buttons are round pictures at the edges: every visible button ≥ 64 px, none overlap or sit
// closer than 12 px, the middle of the screen (60 % wide, 55 % high) stays free of buttons, the emotes hide behind one smiley,
// and while the stick is held the buttons that are not the action step back
test('V7.2 kid-UX on the island: big round buttons at the edges, a free middle, emotes behind the smiley, dimming while walking', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 130; s.earnedWork = 130; s.eiland = { bag: { hout: 5, schelp: 2, bes: 6, vis: 0 }, tools: {}, quest: 0, questN: 0, questsDone: 0, collected: {}, sold: 0, earned: 0 }; s.nacht = { fire: 60, nights: 0, stolen: 0, clockOffsetMs: 0 }; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  // at the camp: KAMP is the action, STOOK shows (wood in the bag), EET shows (berries in the bag)
  const camp = await page.evaluate(() => window.__muntstad.avontuur.landmarks.CAMP);
  await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 2.2), camp);
  await expect(page.locator('#av-stook')).toBeVisible({ timeout: 40000 });
  await expect(page.locator('#av-eet')).toBeVisible();
  await expect(page.locator('#av-emote-row')).toBeHidden();
  const audit = () => page.evaluate(() => {
    const visible = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || el.hidden) return false; let p = el.parentElement; while (p) { const pcs = getComputedStyle(p); if (pcs.display === 'none' || pcs.visibility === 'hidden' || p.hidden) return false; p = p.parentElement; } return true; };
    const label = (b) => `#${b.id}`;
    const buttons = [...document.querySelectorAll('#screen-avontuur button')].filter(visible).filter((b) => !b.closest('#kamp-overlay, #av-samen-pad'));
    const small = [], overlaps = [], tooClose = [], inMiddle = [];
    const W = innerWidth, H = innerHeight;
    const mid = { left: W * 0.2, right: W * 0.8, top: H * 0.225, bottom: H * 0.775 };
    const rects = buttons.map((b) => ({ label: label(b), r: b.getBoundingClientRect() }));
    for (const { label: l, r } of rects) {
      if (r.width < 64 || r.height < 64) small.push(`${l} ${Math.round(r.width)}×${Math.round(r.height)}`);
      const ix = Math.min(r.right, mid.right) - Math.max(r.left, mid.left), iy = Math.min(r.bottom, mid.bottom) - Math.max(r.top, mid.top);
      if (ix > 1 && iy > 1) inMiddle.push(l);
    }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i].r, b = rects[j].r;
      const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ix > 1 && iy > 1) overlaps.push(`${rects[i].label} ∩ ${rects[j].label}`);
      else if (-ix < 11.5 && -iy < 11.5) tooClose.push(`${rects[i].label} ↔ ${rects[j].label}`);
    }
    return { n: buttons.length, small, overlaps, tooClose, inMiddle, moving: document.getElementById('screen-avontuur').classList.contains('moving'), dim: getComputedStyle(document.getElementById('av-dorp')).opacity };
  });
  let a = await audit();
  expect(a.n).toBeGreaterThanOrEqual(6);
  expect(a.small, 'touch targets under 64×64').toEqual([]);
  expect(a.overlaps, 'overlapping buttons').toEqual([]);
  expect(a.tooClose, 'buttons closer than 12 px').toEqual([]);
  expect(a.inMiddle, 'buttons in the middle of the screen').toEqual([]);
  // the smiley opens ZWAAI and DANS; an emote closes the row again
  await page.locator('#av-emote').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect(page.locator('#av-emote-row')).toBeVisible();
  a = await audit();
  expect(a.small, 'emote targets under 64×64').toEqual([]);
  expect(a.overlaps, 'emotes overlap').toEqual([]);
  expect(a.tooClose, 'emotes closer than 12 px').toEqual([]);
  await page.locator('#av-zwaai').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await expect(page.locator('#av-emote-row')).toBeHidden();
  // walking: the screen carries `moving` and DORP steps back to 55 %; standing still brings it back
  await page.evaluate(() => window.__muntstad.avontuur.setInput(0, 1, false));
  await expect.poll(async () => (await audit()).moving, { timeout: 40000 }).toBe(true);
  await expect.poll(async () => (await audit()).dim, { timeout: 40000 }).toBe('0.55');
  await page.evaluate(() => window.__muntstad.avontuur.setInput(null));
  await expect.poll(async () => (await audit()).moving, { timeout: 40000 }).toBe(false);
  expect(errors()).toEqual([]);
});

test('WASD walks, space jumps, and the player never walks into the sea or up the snow', async ({ page }) => {
  const errors = watchErrors(page);
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  const start = await hook(page);
  await page.keyboard.down('w');
  await page.waitForTimeout(900);
  await page.keyboard.up('w');
  const moved = await hook(page);
  expect(Math.hypot(moved.player.x - start.player.x, moved.player.z - start.player.z)).toBeGreaterThan(1);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await hook(page)).jumps, { timeout: 40000 }).toBe(moved.jumps + 1);

  // run backwards (south) for a long time: the sea is off limits, the player stays on the pier or the beach
  await page.evaluate(() => window.__muntstad.avontuur.setInput(0, -1, true));
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.__muntstad.avontuur.setInput(null));
  const end = await hook(page);
  expect(end.onLand, `on land (${end.kind})`).toBe(true);
  expect(errors()).toEqual([]);
});

// V7.0: rotating the iPad to portrait and back left the island blue: the window resize made the town scene pull the
// shared canvas into its own (hidden) container. After the turn the canvas must still sit in #avontuur, landscape-sized.
test('rotating to portrait and back keeps the 3D view on the island', async ({ page }) => {
  const errors = watchErrors(page);
  await seedSave(page, (s) => { s.wallet = 130; s.earnedWork = 130; s.makers.limonade = 1; s.milestones = ['eerste-geldmaker']; return s; });
  await startGame(page, { url: '/?lowres=1&phase=0.3' });
  await closePopups(page);
  await openAvontuur(page);
  const size = page.viewportSize();
  await page.setViewportSize({ width: size.height, height: size.width });
  await expect(page.locator('#rotate')).toBeVisible();
  await page.waitForTimeout(1500);
  await page.setViewportSize(size);
  await expect(page.locator('#rotate')).toBeHidden();
  const canvas = () => page.evaluate(() => {
    const c = document.querySelector('canvas.gl');
    const host = document.getElementById('avontuur');
    return { parent: c && c.parentElement.id, w: c ? c.width : 0, h: c ? c.height : 0, hostW: host.clientWidth, hostH: host.clientHeight };
  });
  await expect.poll(async () => (await canvas()).parent, { timeout: 40000 }).toBe('avontuur');
  await expect.poll(async () => { const c = await canvas(); return c.w > c.h && Math.abs(c.w / c.h - c.hostW / c.hostH) < 0.05; }, { timeout: 40000 }).toBe(true);
  expect(errors()).toEqual([]);
});
