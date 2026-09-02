// Shared helpers for the Playwright tests.
import fs from 'node:fs';
import path from 'node:path';
import { expect } from '@playwright/test';

export const SAVE_KEY = 'muntstad.save.v1';

/** Collect console errors and page errors; call `errors()` at the end of a test. */
export function watchErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => {
    // a failed request is only an error when it is one of our own files
    if (req.url().includes('/js/') || req.url().includes('/css/')) errors.push(`requestfailed: ${req.url()} ${req.failure()?.errorText}`);
  });
  return () => errors;
}

/** Load the game and press SPEEL / VERDER SPELEN. */
export async function startGame(page, { url = '/' } = {}) {
  await page.goto(url);
  await expect(page.locator('#btn-start')).toBeVisible();
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-stad')).toHaveClass(/active/);
}

/** Read the live economy state from the page. */
export function state(page) {
  return page.evaluate(() => JSON.parse(JSON.stringify(window.__muntstad.state)));
}

/** Put a save in localStorage before the page loads. `mutate(state)` receives a fresh-ish default save. */
export async function seedSave(page, mutate) {
  const base = {
    version: 1,
    createdAt: Date.now() - 3600000,
    lastTick: Date.now(),
    name: 'Test',
    color: 'groen',
    wallet: 0,
    earnedWork: 0,
    earnedPassive: 0,
    earnedOffline: 0,
    spentFun: 0,
    spentMakers: 0,
    spentFood: 0,
    makers: { limonade: 0, wasstraat: 0, pizzeria: 0, fabriek: 0, flat: 0 },
    fun: {},
    equipped: { hat: null, skin: null, vehicle: null, paint: null },
    hidden: {},
    foodTimerMs: 0,
    petHungry: false,
    carsWashed: 0,
    work: { sessionStart: null, log: [] },
    bestWorkRate: 0,
    milestones: [],
    playTimeMs: 0,
    flags: { started: true },
    settings: { voice: true, sound: true, music: true },
  };
  const save = mutate ? mutate(base) || base : base;
  // keep the save consistent: owning a maker means the first milestone was already celebrated
  if (Object.values(save.makers).some((l) => l > 0) && !save.milestones.includes('eerste-geldmaker')) save.milestones.push('eerste-geldmaker');
  await page.addInitScript(([key, json]) => {
    window.localStorage.setItem(key, json);
  }, [SAVE_KEY, JSON.stringify(save)]);
  return save;
}

/** Close any open popup (TOP! / DICHT). */
export async function closePopups(page) {
  for (let i = 0; i < 6; i++) {
    const overlay = page.locator('#overlay');
    if (await overlay.isHidden()) return;
    const btn = overlay.locator('button').first();
    if (await btn.count()) await btn.click();
    await page.waitForTimeout(350);
  }
}

/** Wash `n` cars in WERK by tapping every dirt spot. Assumes the game is on STAD. */
export async function washCars(page, n) {
  await page.locator('#nav-werk').click();
  await expect(page.locator('#screen-werk')).toHaveClass(/active/);
  for (let i = 0; i < n; i++) {
    const before = (await state(page)).carsWashed;
    // wait for the car to arrive with its dirt spots
    await expect.poll(async () => page.locator('.dirt:not(.gone)').count(), { timeout: 15000 }).toBeGreaterThan(0);
    await page.waitForTimeout(800);
    for (let attempt = 0; attempt < 8; attempt++) {
      const spots = page.locator('.dirt:not(.gone)');
      const count = await spots.count();
      if (count === 0) break;
      const box = await spots.first().boundingBox();
      if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(120);
    }
    await expect.poll(async () => (await state(page)).carsWashed, { timeout: 15000 }).toBeGreaterThan(before);
  }
  await page.locator('#btn-klaar').click();
  await expect(page.locator('#screen-stad')).toHaveClass(/active/);
}

/** Hold the PAPA button for 3 s, then solve the sum on the keypad. Ends on the PAPA screen. */
export async function openPapa(page) {
  const btn = page.locator('#nav-papa');
  const box = await btn.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(3400);
  await page.mouse.up();
  await expect(page.locator('#screen-gate')).toHaveClass(/active/);
  const sum = await page.locator('#gate-sum').textContent();
  const [a, b] = sum.split('+').map((s) => Number(s.trim()));
  const answer = String(a + b);
  for (const d of answer) await page.locator(`#keypad button[data-key="${d}"]`).click();
  await page.locator('#keypad button[data-key="OK"]').click();
  await expect(page.locator('#screen-papa')).toHaveClass(/active/);
}

/** Save a CSS-pixel screenshot into screenshots/<project>/<name>.png */
export async function shot(page, testInfo, name, { keepBubble = false } = {}) {
  const dir = path.join(process.cwd(), 'screenshots', testInfo.project.name);
  fs.mkdirSync(dir, { recursive: true });
  if (!keepBubble) await page.locator('#bubble').evaluate((el) => el.classList.add('hidden')).catch(() => {});
  await page.screenshot({ path: path.join(dir, `${name}.png`), scale: 'css', animations: 'disabled' });
}
