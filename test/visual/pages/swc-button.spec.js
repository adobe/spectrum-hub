import { test, expect } from '@playwright/test';
import {
  imsScript,
  navAreasFragment,
  pageHeaderFragment,
  playgroundComponentsSheet,
  playgroundControlsSheet,
  playgroundRspProps,
  playgroundSwcProps,
  sitenavIndex,
  statusSlice,
} from '../../a11y/mocks.js';

async function mockPageDependencies(page) {
  const routes = [
    ['**/fragments/nav/header', 'text/html', pageHeaderFragment],
    ['**/fragments/nav/site-nav', 'text/html', navAreasFragment],
    ['**/query-index.json?compact=true', 'application/json', sitenavIndex],
    ['**/deps/status/button.json', 'application/json', statusSlice],
    ['**/playground-data.json?sheet=components', 'application/json', playgroundComponentsSheet],
    ['**/playground-data.json?sheet=controls', 'application/json', playgroundControlsSheet],
    ['**/deps/rsp/data/Button.json', 'application/json', playgroundRspProps],
    ['**/deps/swc/data/swc-button.json', 'application/json', playgroundSwcProps],
    ['**/deps/swc/playground/index.html**', 'text/html', '<html><body></body></html>'],
    ['https://auth.services.adobe.com/imslib/imslib.min.js', 'application/javascript', imsScript],
  ];

  for (const [url, contentType, body] of routes) {
    await page.route(url, (route) => route.fulfill({ contentType, body }));
  }
}

async function waitForFonts(page) {
  await page.evaluate(async () => document.fonts.ready);
}

test.describe('SWC Button page visual smoke', () => {
  test.beforeEach(async ({ page }) => {
    await mockPageDependencies(page);
    await page.goto('/web/swc/components/button');
    await page.locator('body.se-loaded').waitFor();
  });

  test('component detail shell matches its baseline', async ({ page }) => {
    // The complete main region includes long, independently-authored fragments. The first
    // section is the stable detail shell and keeps this smoke capture focused.
    const detail = page.locator('main > .section:has(.page-hero h1#button)');
    await expect(detail.getByRole('heading', { name: 'Button', exact: true })).toBeVisible();
    await expect(detail.locator('.component-status-pill')).toHaveCount(2);
    await waitForFonts(page);

    await expect(detail).toHaveScreenshot('swc-button-detail.png');
  });

  test('playground matches its baseline', async ({ page }) => {
    const playground = page.locator('.playground');
    await expect(playground.locator('.playground-layout')).toBeVisible();
    await expect(playground.locator('pre')).toContainText('<swc-button');
    await waitForFonts(page);

    await expect(playground).toHaveScreenshot('swc-button-playground.png');
  });
});
