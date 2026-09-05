// scripts/shots-eiland.mjs — screenshots of the island at the beach, the lake, the camp (day and night) and the forest,
// for the local critic. Usage: npm run serve, then node scripts/shots-eiland.mjs (writes screenshots/dev/12-16).
import { chromium } from '@playwright/test';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1080, height: 810 }, hasTouch: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const save = { version: 1, createdAt: Date.now() - 3600000, lastTick: Date.now(), name: 'Test', color: 'blauw', wallet: 300, earnedWork: 300, earnedPassive: 0, earnedOffline: 0, spentFun: 0, spentMakers: 0, spentFood: 0, makers: { limonade: 1, wasstraat: 0, pizzeria: 0, fabriek: 0, flat: 0 }, fun: { hond: true }, equipped: { hat: null, skin: null, vehicle: null, paint: null }, hidden: {}, foodTimerMs: 0, petHungry: false, carsWashed: 0, work: { sessionStart: null, log: [] }, bestWorkRate: 0, milestones: ['eerste-geldmaker'], playTimeMs: 0, flags: { started: true, workIntro: true, avontuurIntro: true }, settings: { voice: true, sound: true, music: true }, eiland: { bag: { hout: 2, schelp: 0, bes: 0, vis: 0 }, tools: { lantaarn: true, fakkels: true, hek: true, tent: true }, quest: 0, questN: 0, questsDone: 0, collected: {}, sold: 0, earned: 0 }, nacht: { fire: 80, nights: 0, stolen: 0, clockOffsetMs: 0 } };
await p.addInitScript(([k, v]) => localStorage.setItem(k, v), ['muntstad.save.v1', JSON.stringify(save)]);
await p.goto('http://127.0.0.1:4173/'); await p.waitForSelector('#btn-start'); await p.locator('#btn-start').click(); await p.waitForTimeout(900);
for (let i = 0; i < 4; i++) { if (await p.locator('#overlay').isHidden()) break; await p.locator('#overlay button').first().click(); await p.waitForTimeout(300); }
await p.locator('#nav-avontuur').click({ force: true }); await p.waitForTimeout(1500);
const closeAll = async () => { for (let i = 0; i < 4; i++) { if (await p.locator('#overlay').isHidden()) break; await p.locator('#overlay button').first().click(); await p.waitForTimeout(300); } };
const shot = async (n) => { await closeAll(); await p.locator('#bubble').evaluate((el) => el.classList.add('hidden')).catch(() => {}); await p.screenshot({ path: `screenshots/dev/${n}.png` }); console.log('shot', n); };
const tp = (x, z) => p.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z), { x, z });
await tp(240, 408); await p.evaluate(() => window.__muntstad.avontuur.setPhase(0.4)); await p.waitForTimeout(900); await shot('12-strand');
await tp(330, 233); await p.waitForTimeout(1500); await shot('13-meer');
await tp(240, 306); await p.waitForTimeout(1500); await shot('14-kamp');
await p.evaluate(() => window.__muntstad.avontuur.setPhase(0.85)); await p.waitForTimeout(1200); await shot('15-kamp-nacht');
await tp(205, 262); await p.evaluate(() => window.__muntstad.avontuur.setPhase(0.5)); await p.waitForTimeout(900); await shot('16-bos');
const cave = await p.evaluate(() => window.__muntstad.avontuur.landmarks.CAVE); await tp(cave.x + Math.sin(cave.heading) * 5, cave.z + Math.cos(cave.heading) * 5); await p.waitForTimeout(900); await shot('17-grot-buiten');
const chest = await p.evaluate(() => window.__muntstad.avontuur.landmarks.CHEST); await tp(chest.x + Math.sin(cave.heading) * 1.6, chest.z + Math.cos(cave.heading) * 1.6); await p.waitForTimeout(900); await shot('18-grot-binnen');
console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors');
await b.close();
