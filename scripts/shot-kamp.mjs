// scripts/shot-kamp.mjs — one screenshot of the campfire panel at iPad size (diagnosis of the V5 layout report)
import { chromium } from '@playwright/test';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true }); const p = await ctx.newPage();
const save = { version: 1, createdAt: Date.now() - 3600000, lastTick: Date.now(), name: 'Test', color: 'blauw', wallet: 163, earnedWork: 163, earnedPassive: 0, earnedOffline: 0, spentFun: 0, spentMakers: 0, spentFood: 0, makers: { limonade: 1 }, fun: {}, equipped: { hat: null, skin: null, vehicle: null, paint: null }, hidden: {}, foodTimerMs: 0, petHungry: false, carsWashed: 0, work: { sessionStart: null, log: [] }, bestWorkRate: 0, milestones: ['eerste-geldmaker'], playTimeMs: 0, flags: { started: true, workIntro: true, avontuurIntro: true }, settings: { voice: true, sound: true, music: true }, eiland: { bag: { hout: 14, schelp: 0, bes: 2, vis: 0 }, tools: { bijl: true }, quest: 3, questN: 0, questsDone: 0, collected: {}, sold: 0, earned: 0 }, nacht: { fire: 100, nights: 0, stolen: 0, clockOffsetMs: 0 } };
await p.addInitScript(([k, v]) => localStorage.setItem(k, v), ['muntstad.save.v1', JSON.stringify(save)]);
await p.goto('http://127.0.0.1:4173/?phase=0.3'); await p.waitForSelector('#btn-start'); await p.locator('#btn-start').click(); await p.waitForTimeout(800);
for (let i = 0; i < 4; i++) { if (await p.locator('#overlay').isHidden()) break; await p.locator('#overlay button').first().click(); await p.waitForTimeout(300); }
await p.locator('#nav-avontuur').click({ force: true }); await p.waitForTimeout(1200);
const camp = await p.evaluate(() => window.__muntstad.avontuur.landmarks.CAMP);
await p.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 2.2), camp); await p.waitForTimeout(600);
await p.locator('#av-actie').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 }); await p.waitForTimeout(600);
await p.screenshot({ path: 'screenshots/dev/19-kamp-paneel.png' }); console.log('shot 19-kamp-paneel');
await b.close();
