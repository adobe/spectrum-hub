import { test, expect } from '@playwright/test';
import { waitForStablePage } from './deployed-test.js';

const stablePageChromeStyle = `
  header,
  #sitenav,
  .sitenav-trigger-btn,
  .page-nav {
    position: absolute !important;
  }
  .sitenav-trigger-btn {
    inset-block-start: 104px !important;
    inset-block-end: auto !important;
  }
  header .header-content {
    background-color: transparent !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  header .header-content::before {
    display: none !important;
  }
  header .brand-section a {
    inline-size: var(--sh-brand-mark-width-compact) !important;
  }
  header .brand-section svg > path:nth-child(2) {
    opacity: 0 !important;
    transition: none !important;
  }
`;

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
  },
  {
    name: 'pattern-library-playground',
    path: '/docs/pattern-library/playground',
    readySelector: 'h1#component-playground',
    // These RSP previews change internal text/disclosure rendering between identical
    // remote loads. Keep the surrounding playground and controls covered.
    maskSelectors: [
      'iframe[src*="component=action-button&implementation=rsp"]',
      'iframe[src*="component=accordion&implementation=rsp"]',
    ],
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
  screenshotStyle = stablePageChromeStyle,
} of patternPages) {
  test(`${name} matches its deployed baseline`, async ({ page }) => {
    await page.goto(path);
    await page.locator('body.se-loaded').waitFor();
    await page.locator(readySelector).waitFor({ state: readyState });
    await page.locator('header .header-content').waitFor();
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
