// perf-probe.mjs — frame-time sampling per screen in Chromium with CPU throttling (≈ an iPad from 2019 at 4×).
// Usage: node scripts/perf-probe.mjs [--base http://127.0.0.1:4173/] [--throttle 4]
import { chromium } from '@playwright/test';
const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : f; };
const base = arg('base', 'http://127.0.0.1:4173/');
const throttle = Number(arg('throttle', 4));
const SAVE_KEY = 'muntstad.save.v1';
const save = { version: 1, createdAt: Date.now() - 3600000, lastTick: Date.now(), name: 'Perf', color: 'blauw', wallet: 2600, earnedWork: 900, earnedPassive: 6200, earnedOffline: 0, spentFun: 0, spentMakers: 0, spentFood: 0, makers: { limonade: 5, wasstraat: 3, pizzeria: 2, fabriek: 1, flat: 0 }, fun: { pet: true, kroon: true, bloemen: true, vlag: true, bankje: true, boom: true, hond: true, kat: true, trampoline: true, scooter: true }, equipped: { hat: 'kroon', skin: null, vehicle: 'scooter', paint: null }, hidden: {}, foodTimerMs: 0, petHungry: false, carsWashed: 20, work: { sessionStart: null, log: [] }, bestWorkRate: 15, milestones: ['eerste-geldmaker', 'geld-werkt', 'duizend', 'level-5'], playTimeMs: 0, flags: { started: true, workIntro: true, tiredSaid: true }, settings: { voice: false, sound: false, music: false } };
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1080, height: 810 }, deviceScaleFactor: 2 });
const page = await context.newPage();
await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, JSON.stringify(save)]);
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
await page.goto(base);
await page.locator('#btn-start').click();
await page.waitForTimeout(800);
for (let i = 0; i < 4; i++) { const b = page.locator('#overlay button').first(); if (await page.locator('#overlay').isHidden()) break; await b.click(); await page.waitForTimeout(300); }
async function sample(name) {
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => new Promise((resolve) => {
    const times = []; let last = performance.now(); let n = 0;
    function f(t) { times.push(t - last); last = t; if (++n < 150) requestAnimationFrame(f); else resolve(times.slice(10)); }
    requestAnimationFrame(f);
  }));
  const avg = r.reduce((a, b) => a + b, 0) / r.length; const max = Math.max(...r);
  const over = r.filter((t) => t > 20).length;
  console.log(`${name.padEnd(8)} avg ${avg.toFixed(1)} ms (${(1000 / avg).toFixed(0)} fps)  max ${max.toFixed(0)} ms  frames >20 ms: ${over}/${r.length}`);
}
await sample('stad');
await page.locator('#nav-werk').click(); await page.waitForTimeout(1200); await sample('werk'); await page.locator('#btn-klaar').click();
await page.locator('#nav-huis').click(); await sample('huis'); await page.locator('#huis-stad').click();
await page.locator('#nav-winkel').click(); await sample('winkel');
await browser.close();
