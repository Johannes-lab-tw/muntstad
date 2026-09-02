// The service worker must precache every file in docs/ (so the game works offline) — this test keeps the list honest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const docs = path.resolve('docs');

function walk(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(path.join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

const sw = fs.readFileSync(path.join(docs, 'sw.js'), 'utf8');
const listed = [...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter((p) => p !== '');

test('sw.js precaches every file in docs/ (except itself) and nothing that does not exist', () => {
  const files = walk(docs).filter((f) => f !== 'sw.js' && !f.endsWith('.DS_Store'));
  const missing = files.filter((f) => !listed.includes(f));
  const stale = listed.filter((f) => !files.includes(f));
  assert.deepEqual(missing, [], `add to PRECACHE in docs/sw.js: ${missing.join(', ')}`);
  assert.deepEqual(stale, [], `remove from PRECACHE in docs/sw.js: ${stale.join(', ')}`);
  assert.ok(listed.includes('index.html'));
});

test('sw.js has a versioned cache name, skipWaiting and clients.claim', () => {
  assert.match(sw, /const CACHE_VERSION = 'muntstad-v\d+'/);
  assert.ok(sw.includes('skipWaiting()'));
  assert.ok(sw.includes('clients.claim()'));
  assert.ok(sw.includes("caches.match(request, { ignoreSearch: true })"));
});

test('index.html only references relative URLs and the required iOS meta tags', () => {
  const html = fs.readFileSync(path.join(docs, 'index.html'), 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) assert.ok(m[1].startsWith('./'), `not relative: ${m[1]}`);
  assert.ok(html.includes('name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"'));
  assert.ok(html.includes('apple-mobile-web-app-capable'));
  assert.ok(html.includes('apple-mobile-web-app-status-bar-style'));
  assert.ok(html.includes('rel="apple-touch-icon" href="./icons/icon-180.png"'));
  assert.ok(html.includes('name="theme-color"'));
  assert.ok(html.includes('<html lang="nl">'));
  assert.ok(!/https?:\/\//.test(html.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '')), 'no external URLs in index.html');
});

test('manifest is standalone, landscape, relative, with 192 and 512 PNG icons', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(docs, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, 'landscape');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.ok(manifest.icons.some((i) => i.sizes === '192x192' && i.type === 'image/png'));
  assert.ok(manifest.icons.some((i) => i.sizes === '512x512' && i.type === 'image/png'));
  for (const icon of manifest.icons) {
    assert.ok(icon.src.startsWith('./'));
    assert.ok(fs.existsSync(path.join(docs, icon.src)), `missing ${icon.src}`);
  }
  for (const f of ['icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png']) assert.ok(fs.statSync(path.join(docs, f)).size > 1000, f);
});

test('the site stays small: total docs/ under 1.5 MB (Three.js is vendored), no runtime dependencies', () => {
  const total = walk(docs).reduce((n, f) => n + fs.statSync(path.join(docs, f)).size, 0);
  assert.ok(total < 1.5 * 1024 * 1024, `docs/ is ${total} bytes`);
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(pkg.dependencies, undefined);
  assert.deepEqual(Object.keys(pkg.devDependencies), ['@playwright/test']);
  for (const f of walk(docs).filter((f) => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(docs, f), 'utf8');
    assert.ok(!/from\s+['"]https?:/.test(src) && !/import\(['"]https?:/.test(src), `${f} imports from the network`);
  }
});
