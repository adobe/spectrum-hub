import { mkdirSync } from 'node:fs';
import { release, tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const deployedURL = process.env.PLAYWRIGHT_BASE_URL;
const darwinMajor = Number.parseInt(release().split('.')[0], 10);
const needsFirefoxHome = process.platform === 'darwin' && darwinMajor >= 27;
let firefoxLaunchOptions;

if (needsFirefoxHome) {
  const firefoxHome = process.env.CFFIXED_USER_HOME
    || join(tmpdir(), 'spectrum-hub-playwright-firefox');
  mkdirSync(firefoxHome, { recursive: true });
  // Work around the macOS 27 app-data regression in Firefox before version 158.
  // Remove after upgrading Playwright and verifying Firefox without this environment:
  // https://github.com/microsoft/playwright/issues/42768
  // https://bugzilla.mozilla.org/show_bug.cgi?id=2060476
  // https://github.com/microsoft/playwright/pull/43494
  firefoxLaunchOptions = {
    env: {
      ...process.env,
      CFFIXED_USER_HOME: firefoxHome,
    },
  };
}

export default defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  // The .aem.live origin rate-limits bursts, and a throttled 429 reads as a
  // site failure. A deployed run therefore goes one page at a time and retries,
  // while the local aem up default keeps Playwright's full parallelism.
  workers: deployedURL ? 1 : undefined,
  retries: (deployedURL || process.env.CI) ? 2 : 0,
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
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        ...(firefoxLaunchOptions && { launchOptions: firefoxLaunchOptions }),
      },
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
