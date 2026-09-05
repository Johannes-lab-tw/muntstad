// scripts/shot-dorp.mjs — walking through Muntstad (V6.3): the harbour pier, the street by the lemonade stand and the
// crossing, for the local critic. Usage: npm run serve, then node scripts/shot-dorp.mjs (writes screenshots/dev/27-29).
import { chromium } from '@playwright/test';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1080, height: 810 }, hasTouch: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const save = { version: 1, createdAt: Date.now() - 3600000, lastTick: Date.now(), name: 'Test', color: 'blauw', wallet: 3000, earnedWork: 3000, earnedPassive: 0, earnedOffline: 0, spentFun: 0, spentMakers: 0, spentFood: 0, makers: { limonade: 3, wasstraat: 2, ijssalon: 1, pizzeria: 1, fabriek: 0, flat: 0, pretpark: 0 }, fun: { hond: true }, equipped: { hat: 'strohoed', skin: null, vehicle: null, paint: null }, hidden: {}, foodTimerMs: 0, petHungry: false, carsWashed: 40, work: { sessionStart: null, log: [] }, bestWorkRate: 0, milestones: ['eerste-geldmaker'], playTimeMs: 0, flags: { started: true, workIntro: true, avontuurIntro: true, dorpIntro: true }, settings: { voice: false, sound: false, music: false }, eiland: { bag: { hout: 0, schelp: 0, bes: 0, vis: 0 }, tools: {}, quest: 0, questN: 0, questsDone: 0, collected: {}, sold: 0, earned: 0 }, nacht: { fire: 30, nights: 0, stolen: 0, clockOffsetMs: 0 } };
await p.addInitScript(([k, v]) => localStorage.setItem(k, v), ['muntstad.save.v1', JSON.stringify(save)]);
await p.goto('http://127.0.0.1:4173/?phase=0.4'); await p.waitForSelector('#btn-start'); await p.locator('#btn-start').click(); await p.waitForTimeout(900);
const closeAll = async () => { for (let i = 0; i < 4; i++) { if (await p.locator('#overlay').isHidden()) break; await p.locator('#overlay button').first().click(); await p.waitForTimeout(300); } };
await closeAll();
await p.locator('#nav-dorp').click({ force: true }); await p.waitForTimeout(1500);
const shot = async (n) => { await closeAll(); await p.locator('#bubble').evaluate((el) => el.classList.add('hidden')).catch(() => {}); await p.screenshot({ path: `screenshots/dev/${n}.png` }); console.log('shot', n); };
await shot('27-dorp-haven');
const plots = await p.evaluate(() => window.__muntstad.dorp.landmarks.PLOTS);
await p.evaluate(({ x, z }) => window.__muntstad.dorp.teleport(x, z + 2.6), { x: plots.limonade[0], z: plots.limonade[1] });
await p.waitForTimeout(900);
await shot('28-dorp-straat');
const harbor = await p.evaluate(() => window.__muntstad.dorp.landmarks.HARBOR);
await p.evaluate(({ x, z }) => window.__muntstad.dorp.teleport(x, z - 3.2), harbor);
await p.waitForTimeout(700);
await p.evaluate(() => window.__muntstad.dorp.act());
await p.waitForTimeout(1200);
await p.screenshot({ path: 'screenshots/dev/29-overtocht.png' }); console.log('shot 29-overtocht');
await p.waitForTimeout(3000);
console.log(JSON.stringify(await p.evaluate(() => ({ screen: document.querySelector('.screen.active')?.id, player: window.__muntstad.avontuur.player }))));
console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors');
await b.close();
