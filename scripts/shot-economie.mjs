// scripts/shot-economie.mjs — V6.4: the map with the north strip (Hotel, Handelshaven, Raketbasis), a level-8 stand
// with its golden topper, the show pieces (statue, yacht, own street, fireworks), the bank card, and the new buildings
// at walking scale. Usage: npm run serve, then node scripts/shot-economie.mjs (writes screenshots/dev/30-33).
import { chromium } from '@playwright/test';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1080, height: 810 }, hasTouch: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const save = { version: 1, createdAt: Date.now() - 3600000, lastTick: Date.now(), name: 'Sem', color: 'blauw', wallet: 12000000, earnedWork: 3000, earnedPassive: 12000000, earnedOffline: 0, spentFun: 0, spentMakers: 0, spentFood: 0, makers: { limonade: 8, wasstraat: 10, ijssalon: 6, pizzeria: 5, fabriek: 5, flat: 7, pretpark: 9, hotel: 5, haven: 5, raketbasis: 5 }, fun: { hond: true, standbeeld: true, jacht: true, straatnaam: true, 'vuurwerk-avond': true, 'gouden-hoed': true }, equipped: { hat: 'gouden-hoed', skin: null, vehicle: null, paint: null }, hidden: {}, foodTimerMs: 0, petHungry: false, carsWashed: 40, work: { sessionStart: null, log: [] }, bestWorkRate: 0, milestones: ['eerste-geldmaker'], playTimeMs: 0, flags: { started: true, workIntro: true, avontuurIntro: true, dorpIntro: true, bankHint: true }, settings: { voice: false, sound: false, music: false }, eiland: { bag: { hout: 0, schelp: 0, bes: 0, vis: 0 }, tools: {}, quest: 0, questN: 0, questsDone: 0, collected: {}, sold: 0, earned: 0 }, nacht: { fire: 30, nights: 0, stolen: 0, clockOffsetMs: 0 }, bank: { saldo: 250000, lastGrowDay: Math.floor(Date.now() / 86400000) - 2, earned: 0 } };
await p.addInitScript(([k, v]) => localStorage.setItem(k, v), ['muntstad.save.v1', JSON.stringify(save)]);
await p.goto('http://127.0.0.1:4173/?phase=0.4'); await p.waitForSelector('#btn-start'); await p.locator('#btn-start').click(); await p.waitForTimeout(1200);
const closeAll = async () => { for (let i = 0; i < 4; i++) { if (await p.locator('#overlay').isHidden()) break; await p.locator('#overlay button').first().click(); await p.waitForTimeout(300); } };
await closeAll();
const shot = async (n) => { await p.locator('#bubble').evaluate((el) => el.classList.add('hidden')).catch(() => {}); await p.screenshot({ path: `screenshots/dev/${n}.png` }); console.log('shot', n); };
await p.waitForTimeout(2500);
await shot('30-kaart-economie');
// the bank card: tap the bank on the map (project its spot with the town camera)
const pt = await p.evaluate(async () => {
  const T = await import('/vendor/three.module.min.js');
  const s = window.__muntstad.scene;
  const v = new T.Vector3(12.9, 0.8, 4.8).project(s.camera);
  const r = document.getElementById('town').getBoundingClientRect();
  return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
});
await p.mouse.click(pt.x, pt.y);
await p.waitForTimeout(600);
await shot('31-spaarbank');
console.log('bank popup:', await p.evaluate(() => document.getElementById('popup')?.dataset.popup), JSON.stringify(await p.evaluate(() => window.__muntstad.state.bank)));
await closeAll();
// walking: the hotel and the harbour at walking scale
for (let i = 0; i < 4; i++) {
  await closeAll();
  await p.locator('#nav-dorp').click({ force: true });
  try { await p.waitForFunction(() => document.getElementById('screen-dorp').classList.contains('active'), null, { timeout: 6000 }); break; } catch (e) { console.log('dorp click retry', i); }
}
await p.waitForTimeout(1500);
const plots = await p.evaluate(() => window.__muntstad.dorp.landmarks.PLOTS);
await p.evaluate(({ x, z }) => window.__muntstad.dorp.teleport(x, z - 3.4), { x: plots.haven[0], z: plots.haven[1] });
await p.waitForTimeout(900);
await shot('32-dorp-haven-maker');
await p.evaluate(({ x, z }) => window.__muntstad.dorp.teleport(x + 3.2, z - 1.0), { x: plots.hotel[0], z: plots.hotel[1] });
await p.waitForTimeout(900);
await shot('33-dorp-hotel');
console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors');
await b.close();
