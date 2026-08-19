import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';
import { navAreasFragment, sitenavIndex } from '../mocks.js';

const block = {
  name: 'sitenav',
  path: '/test/a11y/fixtures/sitenav.html',
  // getSiteNav() builds <div id="sitenav">, not .sitenav
  ariaRoot: '#sitenav',
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

// Below 900px the rail collapses behind a hamburger trigger (see sitenav.css) and only
// opens on click — on mobile projects, open it first so the scan covers the real
// collapsed/expanded mobile experience instead of waiting forever on a closed panel.
async function waitForNavReady(page, isMobile) {
  if (isMobile) {
    await page.waitForSelector('.sitenav-trigger-btn');
    await page.click('.sitenav-trigger-btn');
  }

  // getSiteNav() builds <div id="sitenav">, not .sitenav; decorateLevel adds
  // level-<depth>-list, not sitenav-list.
  await page.waitForSelector('#sitenav .level-1-list');
}

test(`${block.name} block in light/default mode has no WCAG 2.2 AA violations`, async ({ page, makeAxeBuilder, isMobile }) => {
  await gotoBlock(page, block);
  await waitForNavReady(page, isMobile);

  const results = await makeAxeBuilder()
    .disableRules(block.disableRules ?? [])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${block.name} block matches its expected accessibility tree`, async ({ page, isMobile }, testInfo) => {
  // Mobile Chrome also runs on the Chromium engine, so `browserName` alone can't isolate a
  // single run — check the project by name to actually run this once, not twice.
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');

  await gotoBlock(page, block);
  await waitForNavReady(page, isMobile);

  await expect(page.locator(block.ariaRoot)).toMatchAriaSnapshot(`
    - navigation "Spectrum Hub":
      - list:
        - listitem:
          - button "Getting started"
        - listitem:
          - button "Foundations"
      - button "Collapse navigation" [expanded]:
        - img
  `);
});

test(`${block.name} block in dark mode has no WCAG 2.2 AA violations`, async ({ page, isMobile }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });

  await gotoBlock(page, block);
  await waitForNavReady(page, isMobile);

  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();

  await testInfo.attach('accessibility-scan-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});
