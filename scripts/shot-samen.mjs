// scripts/shot-samen.mjs — the SAMEN pad on the island and a fainted player waiting for WEK (V6.2), for the local
// critic. Usage: npm run serve, then node scripts/shot-samen.mjs (writes screenshots/dev/25-samen-pad, 26-wek).
import { chromium } from '@playwright/test';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1080, height: 810 }, hasTouch: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const save = { version: 1, createdAt: Date.now() - 3600000, lastTick: Date.now(), name: 'Test', color: 'blauw', wallet: 300, earnedWork: 300, earnedPassive: 0, earnedOffline: 0, spentFun: 0, spentMakers: 0, spentFood: 0, makers: { limonade: 1 }, fun: { hond: true }, equipped: {}, hidden: {}, foodTimerMs: 0, petHungry: false, carsWashed: 0, work: { sessionStart: null, log: [] }, bestWorkRate: 0, milestones: ['eerste-geldmaker'], playTimeMs: 0, flags: { started: true, workIntro: true, avontuurIntro: true }, settings: { voice: false, sound: false, music: false, relayUrl: 'ws://127.0.0.1:1' }, eiland: { bag: { hout: 7, schelp: 2, bes: 3, vis: 1 }, tools: {}, quest: 0, questN: 0, questsDone: 0, collected: {}, sold: 0, earned: 0 }, nacht: { fire: 60, nights: 1, stolen: 0, clockOffsetMs: 0 } };
await p.addInitScript(([k, v]) => localStorage.setItem(k, v), ['muntstad.save.v1', JSON.stringify(save)]);
await p.goto('http://127.0.0.1:4173/?phase=0.4'); await p.waitForSelector('#btn-start'); await p.locator('#btn-start').click(); await p.waitForTimeout(900);
const closeAll = async () => { for (let i = 0; i < 4; i++) { if (await p.locator('#overlay').isHidden()) break; await p.locator('#overlay button').first().click(); await p.waitForTimeout(300); } };
await closeAll();
await p.locator('#nav-avontuur').click({ force: true }); await p.waitForTimeout(1500);
const shot = async (n) => { await closeAll(); await p.locator('#bubble').evaluate((el) => el.classList.add('hidden')).catch(() => {}); await p.screenshot({ path: `screenshots/dev/${n}.png` }); console.log('shot', n); };
const camp = await p.evaluate(() => window.__muntstad.avontuur.landmarks.CAMP);
await p.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 6), camp);
await p.waitForTimeout(700);
await p.locator('#av-samen').click();
await p.waitForTimeout(500);
await shot('25-samen-pad');
await p.locator('#av-samen-terug').click();
// the fainted pose, as a friend would see it: the player lies down
await p.evaluate(() => { window.__muntstad.avontuur.setDown(true); });
await p.waitForTimeout(600);
await shot('26-wek');
console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors');
await b.close();
