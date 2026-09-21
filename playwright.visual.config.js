import { defineConfig, devices } from '@playwright/test';

const desktop = devices['Desktop Chrome'];
const mobile = devices['Pixel 5'];

export default defineConfig({
  testDir: './test/visual',
  testMatch: ['**/*.spec.js'],
  outputDir: 'test-results/visual',
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixels: 0,
    },
  },
  reporter: process.env.CI
    ? [
      ['github'],
      ['html', { outputFolder: 'playwright-report-visual', open: 'never' }],
    ]
    : [
      ['list'],
      ['html', { outputFolder: 'playwright-report-visual', open: 'never' }],
    ],
  webServer: {
    command: 'npx aem up --port 3003 --no-open',
    port: 3003,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:3003',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-light',
      use: { ...desktop, colorScheme: 'light' },
    },
    {
      name: 'desktop-dark',
      use: { ...desktop, colorScheme: 'dark' },
    },
    {
      name: 'mobile-light',
      use: { ...mobile, colorScheme: 'light' },
    },
    {
      name: 'mobile-dark',
      use: { ...mobile, colorScheme: 'dark' },
    },
  ],
});
