import { test, expect } from '@playwright/test';
import {
  imsScript,
  navAreasFragment,
  pageHeaderFragment,
  searchResponse,
  sitenavIndex,
} from '../../a11y/mocks.js';

async function mockPageDependencies(page) {
  await page.route('**/fragments/nav/header', (route) => route.fulfill({
    contentType: 'text/html',
    body: pageHeaderFragment,
  }));
  await page.route('**/fragments/nav/site-nav', (route) => route.fulfill({
    contentType: 'text/html',
    body: navAreasFragment,
  }));
  await page.route('**/query-index.json?compact=true', (route) => route.fulfill({
    contentType: 'application/json',
    body: sitenavIndex,
  }));
  await page.route('https://*-dsn.algolia.net/**', (route) => route.fulfill({
    contentType: 'application/json',
    body: searchResponse,
  }));
  await page.route('https://auth.services.adobe.com/imslib/imslib.min.js', (route) => (
    route.fulfill({ contentType: 'application/javascript', body: imsScript })
  ));
}

async function waitForFonts(page) {
  await page.evaluate(async () => document.fonts.ready);
}

test.describe('homepage visual smoke', () => {
  test.beforeEach(async ({ page }) => {
    await mockPageDependencies(page);
    await page.goto('/');
    await page.locator('body.se-loaded').waitFor();
  });

  test('default page matches its baseline', async ({ page }) => {
    // The full page contains a third-party live playground. The lead content section is
    // finite, representative, and independent of that mutable remote preview.
    const leadContent = page.locator('main > .section:has(h1#start-with-spectrum)');
    await expect(leadContent.getByRole('heading', { name: 'Start with Spectrum' })).toBeVisible();
    await waitForFonts(page);

    await expect(leadContent).toHaveScreenshot('homepage.png');
  });

  test('open search matches its baseline', async ({ page }) => {
    await page.getByRole('button', { name: 'Expand search' }).click();

    const search = page.locator('sh-search');
    const overlay = search.locator('.results-popover');
    await expect(search).toBeVisible();
    await expect(overlay).toBeVisible();
    await expect(search.getByRole('option', { name: /Getting started/ })).toBeVisible();
    await waitForFonts(page);

    await expect(overlay).toHaveScreenshot('homepage-search-open.png');
  });
});
