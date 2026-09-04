import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';

const component = {
  name: 'se-textarea',
  path: '/test/a11y/fixtures/custom-components/se-textarea.html',
  readySelector: 'se-textarea textarea',
  ariaRoot: '.test-container',
};

test(`${component.name} component in light/default mode has no WCAG 2.2 AA violations`, async ({ page, makeAxeBuilder }) => {
  await gotoBlock(page, component);

  const results = await makeAxeBuilder()
    .disableRules(component.disableRules ?? [])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${component.name} component matches its expected accessibility tree`, async ({ page }, testInfo) => {
  // Mobile Chrome also runs on the Chromium engine, so `browserName` alone can't isolate a
  // single run — check the project by name to actually run this once, not twice.
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');

  await gotoBlock(page, component);

  await expect(page.locator(component.ariaRoot)).toMatchAriaSnapshot(`
    - text: Notes
    - textbox "Notes":
      - /placeholder: Add notes
    - text: Bio
    - textbox "Bio"
    - paragraph: This field is required
  `);
});

test(`${component.name} component in dark mode has no WCAG 2.2 AA violations`, async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });

  await gotoBlock(page, component);

  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();

  await testInfo.attach('accessibility-scan-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});
