import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';

const block = {
  name: 'hero',
  path: '/test/a11y/fixtures/hero.html',
  readySelector: '.hero-foreground',
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
    - heading "Build faster with Author Kit" [level=1]
    - paragraph: A component library for Edge Delivery Services that makes building accessible, performant sites straightforward.
    - paragraph:
      - strong:
        - link "Get started":
          - /url: /get-started
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
