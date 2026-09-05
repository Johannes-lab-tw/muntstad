// scripts/shot-wolven.mjs — the shadow wolves round the player at night and the chain card by day (V6.2), for the local
// critic. Usage: npm run serve, then node scripts/shot-wolven.mjs (writes screenshots/dev/23-wolven, 24-keten).
import { chromium } from '@playwright/test';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1080, height: 810 }, hasTouch: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const save = { version: 1, createdAt: Date.now() - 3600000, lastTick: Date.now(), name: 'Test', color: 'blauw', wallet: 300, earnedWork: 300, earnedPassive: 0, earnedOffline: 0, spentFun: 0, spentMakers: 0, spentFood: 0, makers: { limonade: 1 }, fun: { hond: true }, equipped: {}, hidden: {}, foodTimerMs: 0, petHungry: false, carsWashed: 0, work: { sessionStart: null, log: [] }, bestWorkRate: 0, milestones: ['eerste-geldmaker'], playTimeMs: 0, flags: { started: true, workIntro: true, avontuurIntro: true }, settings: { voice: false, sound: false, music: false }, eiland: { bag: { hout: 7, schelp: 2, bes: 3, vis: 1 }, tools: { lantaarn: true }, quest: 0, questN: 0, questsDone: 0, collected: {}, sold: 0, earned: 0, keten: 4, stap: 1, stapN: 6 }, nacht: { fire: 60, nights: 5, stolen: 0, clockOffsetMs: 0, warm: 70 } };
await p.addInitScript(([k, v]) => localStorage.setItem(k, v), ['muntstad.save.v1', JSON.stringify(save)]);
await p.goto('http://127.0.0.1:4173/?phase=0.4'); await p.waitForSelector('#btn-start'); await p.locator('#btn-start').click(); await p.waitForTimeout(900);
const closeAll = async () => { for (let i = 0; i < 4; i++) { if (await p.locator('#overlay').isHidden()) break; await p.locator('#overlay button').first().click(); await p.waitForTimeout(300); } };
await closeAll();
await p.locator('#nav-avontuur').click({ force: true }); await p.waitForTimeout(1500);
const shot = async (n) => { await closeAll(); await p.locator('#bubble').evaluate((el) => el.classList.add('hidden')).catch(() => {}); await p.screenshot({ path: `screenshots/dev/${n}.png` }); console.log('shot', n); };
const camp = await p.evaluate(() => window.__muntstad.avontuur.landmarks.CAMP);
await p.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 44), camp);   // the open beach path south of the camp
await p.waitForTimeout(900);
await shot('24-keten');
await p.evaluate(() => window.__muntstad.avontuur.setPhase(0.85)); await p.waitForTimeout(1200);
await p.evaluate(() => { const a = window.__muntstad.avontuur; a.spawnWolves(); });
await p.waitForTimeout(6000);
await shot('23-wolven');
console.log(JSON.stringify(await p.evaluate(() => { const a = window.__muntstad.avontuur; return { wolves: a.wolves, action: a.action, quest: document.getElementById('av-quest').textContent }; })));
console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors');
await b.close();
