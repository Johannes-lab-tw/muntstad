// scripts/shot-vuur.mjs — the campfire at every level (V6.2), by day and at night, for the local critic.
// Usage: npm run serve, then node scripts/shot-vuur.mjs (writes screenshots/dev/20-vuur-L1..L5 and 21-vuur-nacht-L5).
import { chromium } from '@playwright/test';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1080, height: 810 }, hasTouch: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const save = { version: 1, createdAt: Date.now() - 3600000, lastTick: Date.now(), name: 'Test', color: 'blauw', wallet: 300, earnedWork: 300, earnedPassive: 0, earnedOffline: 0, spentFun: 0, spentMakers: 0, spentFood: 0, makers: { limonade: 1 }, fun: { hond: true }, equipped: {}, hidden: {}, foodTimerMs: 0, petHungry: false, carsWashed: 0, work: { sessionStart: null, log: [] }, bestWorkRate: 0, milestones: ['eerste-geldmaker'], playTimeMs: 0, flags: { started: true, workIntro: true, avontuurIntro: true }, settings: { voice: false, sound: false, music: false }, eiland: { bag: { hout: 12, schelp: 0, bes: 0, vis: 2 }, tools: {}, quest: 0, questN: 0, questsDone: 0, collected: {}, sold: 0, earned: 0 }, nacht: { fire: 10, nights: 3, stolen: 0, clockOffsetMs: 0, warm: 20 } };
await p.addInitScript(([k, v]) => localStorage.setItem(k, v), ['muntstad.save.v1', JSON.stringify(save)]);
await p.goto('http://127.0.0.1:4173/?phase=0.4'); await p.waitForSelector('#btn-start'); await p.locator('#btn-start').click(); await p.waitForTimeout(900);
const closeAll = async () => { for (let i = 0; i < 4; i++) { if (await p.locator('#overlay').isHidden()) break; await p.locator('#overlay button').first().click(); await p.waitForTimeout(300); } };
await closeAll();
await p.locator('#nav-avontuur').click({ force: true }); await p.waitForTimeout(1500);
const shot = async (n) => { await closeAll(); await p.locator('#bubble').evaluate((el) => el.classList.add('hidden')).catch(() => {}); await p.screenshot({ path: `screenshots/dev/${n}.png` }); console.log('shot', n); };
const camp = await p.evaluate(() => window.__muntstad.avontuur.landmarks.CAMP);
await p.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 3.0), camp);
for (const [lvl, wood] of [[1, 10], [2, 30], [3, 70], [4, 150], [5, 300]]) {
  await p.evaluate((w) => { window.__muntstad.state.nacht.fire = w; }, wood);
  await p.waitForTimeout(700);
  await shot(`20-vuur-L${lvl}`);
}
await p.evaluate(() => window.__muntstad.avontuur.setPhase(0.85)); await p.waitForTimeout(1200); await shot('21-vuur-nacht-L5');
await p.evaluate(() => { window.__muntstad.state.nacht.fire = 10; }); await p.waitForTimeout(700); await shot('22-vuur-nacht-L1');
console.log(JSON.stringify(await p.evaluate(() => { const a = window.__muntstad.avontuur; return { action: a.action, fireLevel: a.fireLevel, stook: !document.getElementById('av-stook').hidden, nacht: document.getElementById('av-nacht').textContent, bag: document.getElementById('av-bag').textContent }; })));
console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors');
await b.close();
