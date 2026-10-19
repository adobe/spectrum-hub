import { defineConfig, devices } from '@playwright/test';

const deployedURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report-smoke', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report-smoke', open: 'never' }]],
  outputDir: 'test-results/smoke',
  webServer: deployedURL ? undefined : {
    command: 'npx aem up --url https://main--spectrum-hub--adobe.aem.live --port 3003 --no-open',
    port: 3003,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: deployedURL || 'http://localhost:3003',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
