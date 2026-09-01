// Smoke test against the live GitHub Pages URL (run with playwright.live.config.js).
import { test, expect } from '@playwright/test';
import { watchErrors } from './helpers.js';

test('live site: loads, starts, serves manifest, icons and service worker', async ({ page, request, baseURL }) => {
  const errors = watchErrors(page);
  const home = await request.get(baseURL);
  expect(home.status()).toBe(200);
  for (const file of ['manifest.webmanifest', 'sw.js', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'js/main.js', 'css/style.css']) {
    const r = await request.get(new URL(file, baseURL).href);
    expect(r.status(), file).toBe(200);
  }
  await page.goto(baseURL);
  await expect(page.locator('#btn-start')).toBeVisible();
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-stad')).toHaveClass(/active/);
  await page.locator('#nav-werk').click();
  await expect(page.locator('.dirt').first()).toBeVisible();
  await page.locator('#btn-klaar').click();
  await page.locator('#nav-winkel').click();
  await expect(page.locator('.card[data-id="limonade"]')).toBeVisible();
  const swState = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'unsupported';
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 15000))]);
    return reg ? 'ready' : 'timeout';
  });
  expect(['ready', 'unsupported']).toContain(swState);
  expect(errors()).toEqual([]);
});
