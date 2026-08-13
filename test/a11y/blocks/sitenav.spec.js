import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';
import { navAreasFragment, sitenavIndex } from '../mocks.js';

const block = {
  name: 'sitenav',
  path: '/test/a11y/fixtures/sitenav.html',
  // getSiteNav() builds <div id="sitenav">, not .sitenav; decorateLevel adds
  // level-<depth>-list, not sitenav-list.
  readySelector: '#sitenav .level-1-list',
  routes: [
    {
      url: '**/fragments/nav/site-nav',
      contentType: 'text/html',
      body: navAreasFragment,
    },
    {
      url: '**/query-index.json',
      contentType: 'application/json',
      body: sitenavIndex,
    },
  ],
};

test(`${block.name} block in light/default mode has no WCAG 2.2 AA violations`, async ({ page, makeAxeBuilder }) => {
  await gotoBlock(page, block);

  const results = await makeAxeBuilder()
    .disableRules(block.disableRules ?? [])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${block.name} block in dark mode has no WCAG 2.2 AA violations`, async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });

  await gotoBlock(page, block);

  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();

  await testInfo.attach('accessibility-scan-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});
