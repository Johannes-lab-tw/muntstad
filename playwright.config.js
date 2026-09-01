// Playwright: three iPad sizes × Chromium + WebKit (WebKit ≈ Safari) against scripts/serve.js on 127.0.0.1.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
export const BASE = process.env.BASE_URL || `http://127.0.0.1:${PORT}/`;

const IPADS = [
  ['iPad (gen 7) landscape', 'ipad-gen7'],
  ['iPad Mini landscape', 'ipad-mini'],
  ['iPad Pro 11 landscape', 'ipad-pro11'],
];

export default defineConfig({
  testDir: 'tests/e2e',
  testIgnore: /live\.spec\.js/,
  timeout: 180000,
  expect: { timeout: 15000 },
  fullyParallel: true,
  workers: 3,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
    actionTimeout: 15000,
  },
  webServer: process.env.BASE_URL ? undefined : {
    command: `node scripts/serve.js --port ${PORT}`,
    url: BASE,
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: IPADS.flatMap(([name, id]) => [
    { name: `chromium-${id}`, use: { ...devices[name], browserName: 'chromium' } },
    { name: `webkit-${id}`, use: { ...devices[name], browserName: 'webkit' } },
  ]),
});
