import { test, expect } from '@playwright/test';
import { waitForStablePage } from './deployed-test.js';

const patternPages = [
  {
    name: 'pattern-library-typography',
    path: '/docs/pattern-library/typography',
    readySelector: 'h1#typography',
  },
  {
    name: 'pattern-library-buttons',
    path: '/docs/pattern-library/buttons',
    readySelector: 'h1#buttons',
  },
  {
    name: 'pattern-library-cards',
    path: '/docs/pattern-library/cards',
    readySelector: 'h1#cards',
  },
  {
    name: 'pattern-library-core-layouts',
    path: '/docs/pattern-library/core-layouts',
    readySelector: 'h1#core-layouts',
    // Sticky page chrome changes state while Playwright stitches this exceptionally
    // tall desktop page. Keep the pattern content visible and exclude only that chrome.
    screenshotStyle: 'header, #sitenav, .page-nav { visibility: hidden !important; }',
  },
  {
    name: 'pattern-library-playground',
    path: '/docs/pattern-library/playground',
    readySelector: 'h1#component-playground',
  },
  {
    name: 'pattern-library-table',
    path: '/docs/pattern-library/table',
    readySelector: 'h1#table',
  },
  {
    name: 'pattern-library-breadcrumbs',
    path: '/docs/pattern-library/breadcrumbs',
    readySelector: 'h1#breadcrumbs',
  },
  {
    name: 'pattern-library-search',
    path: '/docs/pattern-library/search',
    readySelector: 'h1#search',
  },
  {
    name: 'pattern-library-status-table',
    path: '/docs/pattern-library/status-table',
    readySelector: '.status-table',
    readyState: 'attached',
  },
  {
    name: 'pattern-library-usage',
    path: '/docs/pattern-library/usage',
    readySelector: 'h1#usage',
  },
];

for (const {
  name,
  path,
  readySelector,
  readyState = 'visible',
  maskSelectors = [],
  screenshotStyle,
} of patternPages) {
  test(`${name} matches its deployed baseline`, async ({ page }) => {
    await page.goto(path);
    await page.locator('body.se-loaded').waitFor();
    await page.locator(readySelector).waitFor({ state: readyState });
    await waitForStablePage(page);
    if (screenshotStyle) {
      await page.addStyleTag({ content: screenshotStyle });
    }

    const mask = maskSelectors.map((selector) => page.locator(selector));
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      ...(mask.length ? { mask } : {}),
    });
  });
}
