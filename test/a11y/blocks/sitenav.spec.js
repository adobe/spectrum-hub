import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';
import {
  navAreasFragment, sitenavIndex, navAreasFragmentWithLevel3, sitenavIndexWithLevel3,
} from '../mocks.js';

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
      // sitenav.js requests '/query-index.json?compact=true' — the trailing '*' is required
      // for Playwright's glob route matching to include the query string, otherwise this
      // mock silently never intercepts and the real network response is used instead.
      url: '**/query-index.json*',
      contentType: 'application/json',
      body: sitenavIndex,
    },
  ],
};

// Four levels deep (Foundations > Layout and structure > Spacing > Scale) so a
// level-3-button (with its own chevron, per decorateLevel's depth === 2 || depth === 3
// rule) actually exists to expand — see mocks.js for why this needs its own fragment/index
// pair rather than reusing navAreasFragment/sitenavIndex.
const levelThreeBlock = {
  ...block,
  routes: [
    {
      url: '**/fragments/nav/site-nav',
      contentType: 'text/html',
      body: navAreasFragmentWithLevel3,
    },
    {
      // sitenav.js requests '/query-index.json?compact=true' — the trailing '*' is required
      // for Playwright's glob route matching to include the query string, otherwise this
      // mock silently never intercepts and the real network response is used instead.
      url: '**/query-index.json*',
      contentType: 'application/json',
      body: sitenavIndexWithLevel3,
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

// Drills down to reveal the level-3 button without expanding it, so callers can assert
// its own collapsed -> expanded transition independently.
async function revealLevelThreeButton(page) {
  await page.getByRole('button', { name: 'Foundations', exact: true }).click();
  await page.getByRole('button', { name: 'Layout and structure', exact: true }).click();
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

test(`${block.name} block with a level-3 item expanded has no WCAG 2.2 AA violations`, async ({ page, makeAxeBuilder, isMobile }) => {
  await gotoBlock(page, levelThreeBlock);
  await waitForNavReady(page, isMobile);
  await revealLevelThreeButton(page);
  await page.getByRole('button', { name: 'Spacing', exact: true }).click();

  const results = await makeAxeBuilder()
    .disableRules(block.disableRules ?? [])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${block.name} block toggles the level-3 button's own aria-expanded state and reveals its level-4 link`, async ({ page, isMobile }) => {
  await gotoBlock(page, levelThreeBlock);
  await waitForNavReady(page, isMobile);
  await revealLevelThreeButton(page);

  const level3Btn = page.getByRole('button', { name: 'Spacing', exact: true });
  const level4Link = page.getByRole('link', { name: 'Scale', exact: true });

  await expect(level3Btn).toHaveAttribute('aria-expanded', 'false');
  await expect(level4Link).not.toBeVisible();

  await level3Btn.click();

  await expect(level3Btn).toHaveAttribute('aria-expanded', 'true');
  await expect(level4Link).toBeVisible();
});

test(`${block.name} block matches its expected accessibility tree with a level-3 item expanded`, async ({ page, isMobile }, testInfo) => {
  // Mobile Chrome also runs on the Chromium engine, so `browserName` alone can't isolate a
  // single run — check the project by name to actually run this once, not twice.
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');

  await gotoBlock(page, levelThreeBlock);
  await waitForNavReady(page, isMobile);
  await revealLevelThreeButton(page);
  await page.getByRole('button', { name: 'Spacing', exact: true }).click();

  await expect(page.locator('#sitenav .level-3-button')).toMatchAriaSnapshot(`
    - button "Spacing" [expanded]:
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
