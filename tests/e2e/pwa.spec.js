// PWA: manifest + icons reachable, service worker installs, and the game loads with the server switched off.
import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { watchErrors } from './helpers.js';

test('manifest, icons and service worker are reachable and well-formed', async ({ page, request, baseURL }) => {
  const manifest = await request.get(new URL('manifest.webmanifest', baseURL).href);
  expect(manifest.status()).toBe(200);
  const json = await manifest.json();
  expect(json.display).toBe('standalone');
  expect(json.start_url).toBe('./');
  expect(json.scope).toBe('./');
  expect(json.orientation).toBe('landscape');
  expect(json.icons.some((i) => i.sizes === '192x192')).toBe(true);
  expect(json.icons.some((i) => i.sizes === '512x512')).toBe(true);
  for (const icon of json.icons) {
    expect(icon.src.startsWith('./')).toBe(true);
    const r = await request.get(new URL(icon.src, baseURL).href);
    expect(r.status(), icon.src).toBe(200);
  }
  const apple = await request.get(new URL('icons/icon-180.png', baseURL).href);
  expect(apple.status()).toBe(200);
  const sw = await request.get(new URL('sw.js', baseURL).href);
  expect(sw.status()).toBe(200);
  expect(await sw.text()).toContain('CACHE_VERSION');
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', './manifest.webmanifest');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', './icons/icon-180.png');
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
});

test('real offline: the game still loads after the server is stopped', async ({ browser, browserName }, testInfo) => {
  test.setTimeout(120000);
  const port = 4300 + (testInfo.parallelIndex % 50) * 2 + (browserName === 'webkit' ? 1 : 0);
  const server = spawn(process.execPath, [path.join(process.cwd(), 'scripts', 'serve.js'), '--port', String(port)], { stdio: 'ignore' });
  const origin = `http://127.0.0.1:${port}/`;
  const context = await browser.newContext({ ...testInfo.project.use, baseURL: origin });
  const page = await context.newPage();
  const errors = watchErrors(page);
  try {
    // wait until the server answers
    await expect.poll(async () => {
      try { return (await page.request.get(origin)).status(); } catch (e) { return 0; }
    }, { timeout: 20000 }).toBe(200);
    await page.goto(origin);
    await expect(page.locator('#btn-start')).toBeVisible();

    const swSupported = await page.evaluate(() => 'serviceWorker' in navigator);
    if (!swSupported) {
      testInfo.annotations.push({ type: 'skipped', description: `${browserName}: navigator.serviceWorker is not available in this Playwright build` });
      test.skip(true, 'service worker not available in this browser build');
    }
    // wait for the service worker to be ready and the precache to be complete
    const ready = await page.evaluate(async () => {
      const timeout = new Promise((r) => setTimeout(() => r('timeout'), 20000));
      const ok = (async () => {
        await navigator.serviceWorker.ready;
        for (let i = 0; i < 100; i++) {
          const keys = await caches.keys();
          const name = keys.find((k) => k.startsWith('muntstad-'));
          if (name) {
            const cache = await caches.open(name);
            const entries = await cache.keys();
            if (entries.length >= 25) return `ok:${entries.length}`;
          }
          await new Promise((r) => setTimeout(r, 200));
        }
        return 'incomplete';
      })();
      return Promise.race([ok, timeout]);
    });
    // the precache must be complete before we cut the server: an incomplete cache is a real failure, not a skip
    expect(ready, 'service worker precache').toMatch(/^ok:/);

    // stop the server, then reload: everything must come from the service worker cache
    server.kill();
    await new Promise((r) => setTimeout(r, 800));
    await expect.poll(async () => {
      try { await page.request.get(origin, { timeout: 2000 }); return 'up'; } catch (e) { return 'down'; }
    }, { timeout: 10000 }).toBe('down');
    await page.reload();
    await expect(page.locator('#btn-start')).toBeVisible({ timeout: 20000 });
    await page.locator('#btn-start').click();
    await expect(page.locator('#screen-stad')).toHaveClass(/active/);
    expect(errors().filter((e) => !e.includes('requestfailed'))).toEqual([]);
  } finally {
    server.kill();
    await context.close();
  }
});
