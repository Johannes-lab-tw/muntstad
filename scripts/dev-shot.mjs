// dev-shot.mjs — screenshots of every screen with a seeded save, for eyeballing the layout while building.
// Usage: node scripts/dev-shot.mjs [--base http://127.0.0.1:4173/] [--out screenshots/dev] [--seed rich|new|mid]
//        [--width 1080 --height 810] [--dpr 1] [--screens stad,werk,winkel,leuk,huis,gebouw,gate,papa,start]
// Assumes the static server is already running (npm run serve, or the Browser pane's preview).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const arg = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const base = arg('base', process.env.BASE_URL || 'http://127.0.0.1:4173/');
const out = path.resolve(arg('out', 'screenshots/dev'));
const seedName = arg('seed', 'rich');
const width = Number(arg('width', 1080)), height = Number(arg('height', 810));
const dpr = Number(arg('dpr', 1));
const screens = arg('screens', 'start,stad,avontuur,werk,winkel,leuk,huis,gebouw,gate,papa').split(',');
const SAVE_KEY = 'muntstad.save.v1';

function seed(name) {
  const now = Date.now();
  const base = {
    version: 1, createdAt: now - 3600000, lastTick: now, name: 'Test', color: 'blauw', wallet: 0,
    earnedWork: 0, earnedPassive: 0, earnedOffline: 0, spentFun: 0, spentMakers: 0, spentFood: 0,
    makers: { limonade: 0, wasstraat: 0, pizzeria: 0, fabriek: 0, flat: 0 }, fun: {},
    equipped: { hat: null, skin: null, vehicle: null, paint: null }, hidden: {}, foodTimerMs: 0, petHungry: false,
    carsWashed: 0, work: { sessionStart: null, log: [] }, bestWorkRate: 0, milestones: [], playTimeMs: 0,
    flags: { started: true, workIntro: true, tiredSaid: true }, settings: { voice: true, sound: true, music: true },
  };
  if (name === 'new') return null;
  if (name === 'mid') {
    return { ...base, wallet: 130, earnedWork: 200, earnedPassive: 150, makers: { ...base.makers, limonade: 2 }, fun: { pet: true, bloemen: true }, equipped: { ...base.equipped, hat: 'pet' }, milestones: ['eerste-geldmaker'] };
  }
  return {
    ...base, wallet: 2600, earnedWork: 900, earnedPassive: 6200,
    makers: { limonade: 5, wasstraat: 3, pizzeria: 2, fabriek: 1, flat: 0 },
    fun: { pet: true, kroon: true, bloemen: true, vlag: true, bankje: true, boom: true, hond: true, kat: true, vuurwerk: true, dansje: true, salto: true, trampoline: true, 'verf-blauw': true, scooter: true },
    equipped: { hat: 'kroon', skin: null, vehicle: 'scooter', paint: 'verf-blauw' },
    milestones: ['eerste-geldmaker', 'geld-werkt', 'duizend'],
  };
}

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
const save = seed(seedName);
if (save) await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, JSON.stringify(save)]);
await page.goto(base);
await page.waitForSelector('#btn-start');
await page.waitForTimeout(600);
const shot = async (name) => { await page.locator('#bubble').evaluate((el) => el.classList.add('hidden')).catch(() => {}); await page.screenshot({ path: path.join(out, `${name}.png`), animations: 'disabled' }); console.log('shot', name); };
const closePopups = async () => { for (let i = 0; i < 5; i++) { if (await page.locator('#overlay').isHidden()) return; const b = page.locator('#overlay button').first(); if (await b.count()) await b.click(); await page.waitForTimeout(300); } };

if (screens.includes('start')) await shot('01-start');
await page.locator('#btn-start').click();
await page.waitForTimeout(900);
await closePopups();
if (screens.includes('stad')) await shot('02-stad');
if (screens.includes('avontuur')) { await page.locator('#nav-avontuur').click(); await page.waitForTimeout(1200); await shot('10-avontuur'); await page.locator('#av-stad').click(); await page.waitForTimeout(300); }
if (screens.includes('werk')) { await page.locator('#nav-werk').click(); await page.waitForTimeout(1400); await shot('03-werk'); await page.locator('#btn-klaar').click(); }
if (screens.includes('winkel') || screens.includes('leuk')) {
  await page.locator('#nav-winkel').click(); await page.waitForTimeout(400);
  if (screens.includes('winkel')) await shot('04-winkel-geldmakers');
  if (screens.includes('leuk')) { await page.locator('#tab-fun').click(); await page.waitForTimeout(300); await shot('05-winkel-leuk'); await page.locator('#shop-next').click(); await page.waitForTimeout(300); await shot('05b-winkel-leuk-2'); }
  await page.locator('#shop-stad').click();
}
if (screens.includes('huis')) { await page.locator('#nav-huis').click(); await page.waitForTimeout(900); await shot('06-huis'); await page.locator('#huis-stad').click(); }
if (screens.includes('gebouw')) {
  await page.waitForTimeout(300);
  const p = await page.evaluate(() => window.__muntstad.plotPoint ? window.__muntstad.plotPoint('limonade') : null);
  if (p) {
    await page.evaluate(({ x, y }) => { const c = document.getElementById('town'); const r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerType: 'touch', button: 0 })); }, p);
    await page.waitForTimeout(600);
    await shot('07-gebouwkaart');
    await closePopups();
  }
}
if (screens.includes('gate') || screens.includes('papa')) {
  const btn = page.locator('#nav-papa');
  const box = await btn.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(3400);
  await page.mouse.up();
  await page.waitForTimeout(400);
  if (screens.includes('gate')) await shot('08-gate');
  if (screens.includes('papa')) {
    const sum = await page.locator('#gate-sum').textContent();
    const [a, b] = sum.split('+').map((s) => Number(s.trim()));
    for (const d of String(a + b)) await page.locator(`#keypad button[data-key="${d}"]`).click();
    await page.locator('#keypad button[data-key="OK"]').click();
    await page.waitForTimeout(400);
    await shot('09-papa');
  }
}
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exitCode = 1; } else console.log('no page errors');
