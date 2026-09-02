// Kid-UX audits on every screen (SPEC §4): touch targets ≥ 64×64 and ≥ 12 px apart without overlap, primary buttons
// ≥ 80 px tall, button labels ≥ 24 px, coin count ≥ 36 px, all visible text ≥ 20 px, Dutch only.
// Tap targets are buttons plus the invisible hit areas on HUIS (.hit) and the mud splats on WERK (.dirt).
import { test, expect } from '@playwright/test';
import { startGame, seedSave, closePopups, openPapa } from './helpers.js';

const ENGLISH = /\b(buy|shop|work|settings|continue|back|play|next|previous|close|cancel|loading|score|menu)\b/i;

async function audit(page, screenName) {
  await page.locator('#bubble').evaluate((el) => el.classList.add('hidden')).catch(() => {});
  return page.evaluate((name) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    function visible(el) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      if (r.right <= 0 || r.bottom <= 0 || r.left >= vw || r.top >= vh) return false;
      // any hidden ancestor?
      let p = el.parentElement;
      while (p) {
        const pcs = getComputedStyle(p);
        if (pcs.display === 'none' || pcs.visibility === 'hidden') return false;
        p = p.parentElement;
      }
      return true;
    }
    const label = (b) => (b.id ? `#${b.id}` : b.textContent.trim().slice(0, 20)) || b.className;
    const buttons = [...document.querySelectorAll('button, [role="button"]')].filter(visible);
    const taps = [...document.querySelectorAll('.hit, .dirt:not(.gone)')].filter(visible);
    const small = [];
    const rects = [];
    for (const b of [...buttons, ...taps]) {
      const r = b.getBoundingClientRect();
      if (r.width < 64 || r.height < 64) small.push(`${label(b)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    for (const b of buttons) rects.push({ label: label(b), r: b.getBoundingClientRect() });
    const overlaps = [];
    const tooClose = [];
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].r, b = rects[j].r;
        const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ix > 1 && iy > 1) overlaps.push(`${rects[i].label} ∩ ${rects[j].label}`);
        else {
          // gap between the two rectangles: both axes closer than 12 px means a fat finger can hit both
          const gx = -ix, gy = -iy;
          if (gx < 12 && gy < 12) tooClose.push(`${rects[i].label} ↔ ${rects[j].label} (${Math.round(Math.max(gx, gy))} px)`);
        }
      }
    }
    // primary buttons ≥ 80 px tall, labels ≥ 24 px (PAPA is deliberately small: SPEC §3.2)
    const shortPrimary = [];
    const smallLabel = [];
    for (const b of buttons) {
      const r = b.getBoundingClientRect();
      if (b.matches('.btn-nav, .btn-xl') && r.height < 80) shortPrimary.push(`${label(b)} ${Math.round(r.height)}px`);
      const fs = parseFloat(getComputedStyle(b).fontSize);
      if (b.id !== 'nav-papa' && fs < 24) smallLabel.push(`${label(b)} ${fs}px`);
    }
    const wallet = document.getElementById('wallet-amount');
    const walletSize = wallet && visible(wallet) ? parseFloat(getComputedStyle(wallet).fontSize) : 99;
    // text size: every visible text node
    const smallText = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const el = node.parentElement;
      if (!el || ['SCRIPT', 'STYLE', 'TITLE', 'NOSCRIPT'].includes(el.tagName)) continue;
      if (!visible(el)) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 20) smallText.push(`"${text.slice(0, 30)}" ${size}px`);
    }
    const domText = document.body.innerText;
    return { name, buttons: buttons.length, small, overlaps, tooClose, shortPrimary, smallLabel, walletSize, smallText, domText };
  }, screenName);
}

function check(result) {
  expect(result.buttons, `${result.name}: no buttons found`).toBeGreaterThan(0);
  expect(result.small, `${result.name}: touch targets under 64×64`).toEqual([]);
  expect(result.overlaps, `${result.name}: overlapping buttons`).toEqual([]);
  expect(result.tooClose, `${result.name}: buttons closer than 12 px`).toEqual([]);
  expect(result.shortPrimary, `${result.name}: primary buttons under 80 px`).toEqual([]);
  expect(result.smallLabel, `${result.name}: button labels under 24 px`).toEqual([]);
  expect(result.walletSize, `${result.name}: coin count under 36 px`).toBeGreaterThanOrEqual(36);
  expect(result.smallText, `${result.name}: text under 20 px`).toEqual([]);
  const english = result.domText.match(ENGLISH);
  expect(english, `${result.name}: English word "${english && english[0]}"`).toBeNull();
}

test('touch targets, text sizes and Dutch-only on every screen', async ({ page }) => {
  await seedSave(page, (s) => { s.wallet = 130; s.earnedWork = 130; s.makers.limonade = 1; s.fun = { pet: true, bloemen: true, hond: true, vuurwerk: true, dansje: true, trampoline: true }; s.equipped.hat = 'pet'; s.milestones = ['eerste-geldmaker']; s.flags = {}; return s; });
  await page.goto('/');
  await expect(page.locator('#btn-start')).toBeVisible();
  check(await audit(page, 'start'));

  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-stad')).toHaveClass(/active/);
  await closePopups(page);
  check(await audit(page, 'stad'));

  await page.locator('#nav-werk').click();
  await expect.poll(async () => page.locator('.dirt:not(.gone)').count(), { timeout: 10000 }).toBeGreaterThan(0);
  check(await audit(page, 'werk'));
  await page.locator('#btn-klaar').click();

  await page.locator('#nav-winkel').click();
  await page.waitForTimeout(200);
  check(await audit(page, 'winkel-geldmakers'));
  await page.locator('#tab-fun').click();
  await page.waitForTimeout(200);
  check(await audit(page, 'winkel-leuk'));
  await page.locator('#shop-next').click();
  await page.waitForTimeout(200);
  check(await audit(page, 'winkel-leuk-2'));
  await page.locator('#shop-stad').click();

  await page.locator('#nav-huis').click();
  await page.waitForTimeout(400);
  check(await audit(page, 'huis'));
  await page.locator('#huis-stad').click();

  // building card popup: tap the Limonadekraam plot (the scene reports where it is)
  const town = page.locator('#town');
  const box = await town.boundingBox();
  const plot = await page.evaluate(() => window.__muntstad.plotPoint('limonade'));
  await page.evaluate(({ x, y }) => {
    const c = document.getElementById('town');
    const r = c.getBoundingClientRect();
    c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerType: 'touch', button: 0 }));
  }, plot);
  expect(box).toBeTruthy();
  await expect(page.locator('#popup[data-popup="building"]')).toBeVisible();
  await page.waitForTimeout(600); // let the pop animation finish before measuring
  check(await audit(page, 'gebouwkaart'));
  await closePopups(page);

  await openPapa(page);
  check(await audit(page, 'papa'));
});

test('gate screen audit', async ({ page }) => {
  await startGame(page);
  const btn = page.locator('#nav-papa');
  const box = await btn.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(3400);
  await page.mouse.up();
  await expect(page.locator('#screen-gate')).toHaveClass(/active/);
  check(await audit(page, 'gate'));
});

test('offline popup and milestone popup audit', async ({ page }) => {
  await seedSave(page, (s) => { s.makers.limonade = 1; s.lastTick = Date.now() - 3600000; s.earnedWork = 100; return s; });
  await startGame(page);
  await expect(page.locator('#popup[data-popup="offline"]')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1600);
  check(await audit(page, 'popup-offline'));
  await closePopups(page);
});

test('milestone popup audit', async ({ page }) => {
  await seedSave(page, (s) => { s.makers.limonade = 5; s.earnedWork = 1200; s.milestones = ['eerste-geldmaker']; return s; });
  await startGame(page);
  await expect(page.locator('#popup[data-popup="milestone"]')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(600);
  check(await audit(page, 'popup-milestone'));
});
