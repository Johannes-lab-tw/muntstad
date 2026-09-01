// Smoke test against the live GitHub Pages URL in WebKit with the iPad (gen 7) landscape descriptor.
// Usage: BASE_URL=https://<user>.github.io/muntstad/ npm run test:live
import { defineConfig, devices } from '@playwright/test';

if (!process.env.BASE_URL) throw new Error('Set BASE_URL to the live site, e.g. https://user.github.io/muntstad/');

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: /live\.spec\.js/,
  timeout: 120000,
  expect: { timeout: 20000 },
  retries: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-live' }]],
  outputDir: 'test-results-live',
  use: { baseURL: process.env.BASE_URL, trace: 'retain-on-failure' },
  projects: [
    { name: 'webkit-ipad-gen7-live', use: { ...devices['iPad (gen 7) landscape'], browserName: 'webkit' } },
  ],
});
