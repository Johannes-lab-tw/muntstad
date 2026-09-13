// shot-hud.mjs — screenshots of the island HUD (V7.2): pier, at the camp with STOOK, emotes open, walking (dimmed), night.
// Usage: node scripts/shot-hud.mjs [outDir]   (the static server must run on 127.0.0.1:4173)
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from '@playwright/test';
const out = process.argv[2] || 'shots-eiland';
fs.mkdirSync(out, { recursive: true });
const SAVE_KEY = 'muntstad.save.v1';
const now = Date.now();
const save = { version: 1, createdAt: now - 3600000, lastTick: now, name: 'Test', color: 'blauw', wallet: 2600, earnedWork: 900, earnedPassive: 6200, earnedOffline: 0, spentFun: 0, spentMakers: 0, spentFood: 0,
  makers: { limonade: 5, wasstraat: 3, pizzeria: 2, fabriek: 1, flat: 0 }, fun: {}, equipped: { hat: 'kroon', skin: null, vehicle: null, paint: null }, hidden: {}, foodTimerMs: 0, petHungry: false,
  carsWashed: 0, work: { sessionStart: null, log: [] }, bestWorkRate: 0, milestones: ['eerste-geldmaker', 'geld-werkt', 'duizend'], playTimeMs: 0,
  flags: { started: true, workIntro: true, tiredSaid: true, avontuurIntro: true }, settings: { voice: true, sound: true, music: true },
  eiland: { bag: { hout: 38, schelp: 4, bes: 16, vis: 0 }, tools: { rugzak: true }, quest: 0, questN: 0, questsDone: 0, collected: {}, sold: 0, earned: 0, honger: 62 },
  nacht: { fire: 250, nights: 1, stolen: 0, clockOffsetMs: 0, warm: 80 } };
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1080, height: 810 }, deviceScaleFactor: 1, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, JSON.stringify(save)]);
await page.goto('http://127.0.0.1:4173/?lowres=1&phase=0.3');
await page.waitForSelector('#btn-start');
await page.locator('#btn-start').click();
await page.waitForTimeout(900);
const closePopups = async () => { for (let i = 0; i < 5; i++) { if (await page.locator('#overlay').isHidden()) return; const b = page.locator('#overlay button').first(); if (await b.count()) await b.click(); await page.waitForTimeout(300); } };
await closePopups();
await page.locator('#nav-avontuur').click({ force: true });
await page.waitForTimeout(2500);
const shot = async (name) => { await page.screenshot({ path: path.join(out, `${name}.png`), animations: 'disabled' }); console.log('shot', name); };
const hook = () => page.evaluate(() => { const h = window.__muntstad.avontuur; return { camp: h.landmarks.CAMP, action: h.action }; });
await shot('20-eiland-pier');
const h = await hook();
await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 2.2), h.camp);
await page.waitForTimeout(1500);
await shot('21-eiland-kamp');
await page.locator('#av-emote').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
await page.waitForTimeout(50);   // the row folds after 4 s and a WebGL screenshot on a slow CPU takes a while
await shot('22-eiland-emotes');
await page.evaluate(() => window.__muntstad.avontuur.setInput(0, 1, false));
await page.waitForTimeout(800);
await shot('23-eiland-lopen');
await page.evaluate(() => window.__muntstad.avontuur.setInput(null));
await page.evaluate(() => window.__muntstad.avontuur.setPhase(0.82));
await page.waitForTimeout(1500);
await shot('24-eiland-nacht');
console.log(errors.length ? errors : 'no page errors');
await browser.close();
