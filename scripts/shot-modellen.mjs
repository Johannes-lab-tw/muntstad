// shot-modellen.mjs — screenshots of the GLB models in the island scene (V9.6, ART-DIRECTION §12), against a running
// `npm run serve`: node scripts/shot-modellen.mjs [phase] [beer]  (phase 0.3 = day, 0.82 = night; 'beer' puts the bear
// in front instead of the wolf and the ghost). Writes shot-vijanden.png and shot-boot.png next to this file's OUT.
import { chromium } from '@playwright/test';
import { seedSave, startGame, closePopups } from '../tests/e2e/helpers.js';

const S = (process.env.OUT || 'test-results/modellen/').replace(/\/?$/, '/');
import('node:fs').then((fs) => fs.mkdirSync(S, { recursive: true }));
const phase = Number(process.argv[2] || 0.3);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1, baseURL: 'http://127.0.0.1:4173' });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.type() + ' ' + m.text()); });
await seedSave(page, (s) => { s.wallet = 500; s.earnedWork = 500; s.fun = {}; s.eiland = { bag: { hout: 12, schelp: 4, bes: 2, vis: 0, steen: 0 }, tools: { speer: true }, quest: 0, questN: 0, questsDone: 0, collected: {}, sold: 0, earned: 0 }; s.nacht = { fire: 100, nights: 3, stolen: 0, clockOffsetMs: 0 }; return s; });
await startGame(page, { url: '/?phase=' + phase });
await closePopups(page);
for (let i = 0; i < 4; i++) {
  await closePopups(page);
  await page.locator('#nav-avontuur').click({ force: true });
  try { await page.waitForSelector('#screen-avontuur.active', { timeout: 8000 }); break; } catch (e) { if (i === 3) throw e; }
}
await page.waitForFunction(() => window.__muntstad?.avontuur?.forestCount > 1000, null, { timeout: 60000 });
await page.waitForFunction(() => { const m = window.__muntstad.avontuur.modellen; return ['piraat', 'beer', 'wolf', 'spook', 'boot'].every((k) => m[k] !== 'laden' && m[k] !== 'bouw'); }, null, { timeout: 40000 });
console.log('modellen:', JSON.stringify(await page.evaluate(() => window.__muntstad.avontuur.modellen)));
const A = () => page.evaluate(() => window.__muntstad.avontuur.player);
const camp = await page.evaluate(() => window.__muntstad.avontuur.landmarks.CAMP);
await page.evaluate(({ x, z }) => window.__muntstad.avontuur.teleport(x, z + 30), camp);   // on land, away from the pier (the sea floor hides anything placed over water)
await page.waitForTimeout(400);
let pl = await A();
const F = (f, r) => ({ x: pl.x + Math.sin(pl.heading) * f + Math.cos(pl.heading) * r, z: pl.z + Math.cos(pl.heading) * f - Math.sin(pl.heading) * r });   // forward/right of the player
await page.evaluate(() => window.__muntstad.avontuur.spawnWolves());
await closePopups(page);
await page.waitForTimeout(300);
if (process.argv[3] === 'beer') { await page.evaluate(() => window.__muntstad.avontuur.spawnBears(1)); await page.evaluate((p) => window.__muntstad.avontuur.bearsAt(p.x, p.z), F(5.5, 0.8)); }
else { await page.evaluate((p) => window.__muntstad.avontuur.ghostAt(p.x, p.z), F(6, 2.5)); await page.evaluate((p) => window.__muntstad.avontuur.wolvesAt(p.x, p.z), F(4, -0.5)); }
await page.waitForTimeout(150);
console.log('after:', JSON.stringify(await page.evaluate(() => window.__muntstad.avontuur.modellen)));
await page.screenshot({ path: S + 'shot-vijanden.png' });
// the boat: a pirate night shows it off the south beach
await page.evaluate(() => window.__muntstad.avontuur.piratenNu());
const pier = await page.evaluate(async () => { const hm = await import('./js/3d/heightmap.js'); return hm.PIER; });
const yaw = await page.evaluate(() => window.__muntstad.avontuur.yaw);
console.log('yaw', yaw, 'heading', (await A()).heading);
await page.evaluate(({ x, z, yaw }) => window.__muntstad.avontuur.teleport(x + 20 - Math.sin(yaw) * 14 - 9, z + 8 - Math.cos(yaw) * 14), { ...pier, yaw });
await page.waitForTimeout(1500);
await closePopups(page);
await page.screenshot({ path: S + 'shot-boot.png' });
console.log('bootGlb:', await page.evaluate(() => window.__muntstad.avontuur.modellen.bootGlb), 'camera:', JSON.stringify(await page.evaluate(() => window.__muntstad.avontuur.camera)));
console.log('errors:', errs.slice(0, 8));
await browser.close();
