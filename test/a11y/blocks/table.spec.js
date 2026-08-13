import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';

const block = {
  name: 'table',
  path: '/test/a11y/fixtures/table.html',
  readySelector: '.table table',
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
    - table "Button component Properties":
      - rowgroup:
        - row "Name Type Default Description":
          - columnheader "Name"
          - columnheader "Type"
          - columnheader "Default"
          - columnheader "Description"
      - rowgroup:
        - row "size string medium Controls the size of the button":
          - cell "size"
          - cell "string"
          - cell "medium"
          - cell "Controls the size of the button"
        - row "variant string primary Sets the visual style variant":
          - cell "variant"
          - cell "string"
          - cell "primary"
          - cell "Sets the visual style variant"
        - row "disabled boolean false Disables interaction and applies disabled styling":
          - cell "disabled"
          - cell "boolean"
          - cell "false"
          - cell "Disables interaction and applies disabled styling"
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
