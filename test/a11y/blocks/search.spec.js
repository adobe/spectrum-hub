import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';
import { navAreasFragment } from '../mocks.js';

const block = {
  name: 'search',
  path: '/test/a11y/fixtures/search.html',
  readySelector: 'sh-search .hit-title',
  // search.js does el.replaceWith(cmp) — the .search div is gone, replaced by <sh-search>
  ariaRoot: 'sh-search',
  routes: [
    {
      url: '**/fragments/nav/site-nav',
      contentType: 'text/html',
      body: navAreasFragment,
    },
  ],
  // False positive: se-input associates its listbox via Cross-root ARIA Reflection
  // (input.ariaControlsElements = [listboxEl]), which correctly carries the relationship
  // into the accessibility tree across the shadow boundary but leaves the plain
  // aria-controls="" string attribute empty by design — axe-core only inspects that
  // attribute and doesn't yet recognize this newer element-reflection API.
  disableRules: ['aria-required-attr'],
};

test(`${block.name} block in light/default mode has no WCAG 2.2 AA violations`, async ({ page, makeAxeBuilder }) => {
  await gotoBlock(page, block);

  const results = await makeAxeBuilder()
    .disableRules(block.disableRules ?? [])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${block.name} block matches its expected accessibility tree`, async ({ page }, testInfo) => {
  // Mobile Chrome also runs on the Chromium engine, so `browserName` alone can't isolate a
  // single run — check the project by name to actually run this once, not twice.
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');

  await gotoBlock(page, block);

  await expect(page.locator(block.ariaRoot ?? `.${block.name}`)).toMatchAriaSnapshot(`
    - combobox "Search" [expanded]:
      - combobox "Search" [expanded]
      - button "Clear search"
    - listbox "Navigation areas":
      - option "Getting started Introduction, principles, and how to begin" [selected]:
        - paragraph: Getting started
        - paragraph: Introduction, principles, and how to begin
      - option "Foundations Color, typography, spacing, and design principles":
        - paragraph: Foundations
        - paragraph: Color, typography, spacing, and design principles
    - text: to select to navigate
  `);
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
