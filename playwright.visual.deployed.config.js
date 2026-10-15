import { defineConfig } from '@playwright/test';
import localVisualConfig from './playwright.visual.config.js';

const visualBaseURL = process.env.VISUAL_BASE_URL;
if (!visualBaseURL) {
  throw new Error('VISUAL_BASE_URL is required for deployed visual tests.');
}

let parsedBaseURL;
try {
  parsedBaseURL = new URL(visualBaseURL);
} catch {
  throw new Error('VISUAL_BASE_URL must be an absolute HTTP or HTTPS URL.');
}

if (!['http:', 'https:'].includes(parsedBaseURL.protocol)) {
  throw new Error('VISUAL_BASE_URL must be an absolute HTTP or HTTPS URL.');
}

const sharedConfig = { ...localVisualConfig };
delete sharedConfig.webServer;

export default defineConfig({
  ...sharedConfig,
  testDir: './test/visual/deployed',
  workers: 1,
  outputDir: 'test-results/visual-deployed',
  snapshotPathTemplate: '{testDir}/{testFilePath}-deployed-snapshots/{arg}-{projectName}{ext}',
  reporter: process.env.CI
    ? [
      ['github'],
      ['html', { outputFolder: 'playwright-report-visual-deployed', open: 'never' }],
    ]
    : [
      ['list'],
      ['html', { outputFolder: 'playwright-report-visual-deployed', open: 'never' }],
    ],
  use: {
    ...localVisualConfig.use,
    baseURL: parsedBaseURL.href,
  },
});
