import { defineConfig, devices } from '@playwright/test';

// Set LINKCHECK_BASE_URL to crawl a deployed site (e.g. a branch preview or
// https://main--spectrum-hub--adobe.aem.live) instead of a local aem up server.
const deployedURL = process.env.LINKCHECK_BASE_URL;

export default defineConfig({
  testDir: './test/link-check',
  testMatch: '**/*.spec.js',
  timeout: 10 * 60 * 1000,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report-links', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report-links', open: 'never' }]],
  webServer: deployedURL ? undefined : {
    command: 'npx aem up --port 3002 --no-open',
    port: 3002,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: deployedURL || 'http://localhost:3002',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
