import { test, expect } from '@playwright/test';

const routes = [
  {
    name: 'buttons',
    path: '/docs/pattern-library/buttons',
    selector: '.se-button .btn.primary',
  },
  {
    name: 'cards',
    path: '/docs/pattern-library/cards',
    selector: '.card-content-container',
  },
  {
    name: 'core-layouts',
    path: '/docs/pattern-library/core-layouts',
    selector: '.columns',
  },
  {
    name: 'playground',
    path: '/docs/pattern-library/playground',
    selector: '.playground-layout',
  },
  {
    name: 'search',
    path: '/docs/pattern-library/search',
    selector: 'sh-search',
  },
  {
    name: 'status-table',
    path: '/docs/pattern-library/status-table',
    selector: '.status-table table',
  },
  {
    name: 'table',
    path: '/docs/pattern-library/table',
    selector: '.table table',
  },
  {
    name: 'typography',
    path: '/docs/pattern-library/typography',
    selector: '.heading-size-xxl',
  },
  {
    name: 'usage',
    path: '/docs/pattern-library/usage',
    selector: '.usage',
  },
];

for (const route of routes) {
  test(`${route.name} pattern composes its block`, async ({ page }) => {
    const response = await page.goto(route.path, {
      waitUntil: 'domcontentloaded',
    });

    expect(response, `${route.path} should return a document response`).not.toBeNull();
    expect(
      response.ok(),
      `${route.path} returned ${response.status()} ${response.statusText()}`,
    ).toBe(true);
    await expect(page.locator(route.selector).first()).toBeVisible();
  });
}
