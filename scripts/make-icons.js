// make-icons.js — renders docs/icons/icon.svg to icon-180.png, icon-192.png and icon-512.png with a Playwright screenshot.
// Usage: npm run icons
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = path.join(root, 'docs', 'icons', 'icon.svg');
const svg = fs.readFileSync(svgPath, 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
for (const size of [180, 192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#38bdf8">${svg.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `)}</body></html>`);
  const out = path.join(root, 'docs', 'icons', `icon-${size}.png`);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: size, height: size }, omitBackground: false });
  console.log(`wrote ${path.relative(root, out)} (${fs.statSync(out).size} bytes)`);
}
await browser.close();
