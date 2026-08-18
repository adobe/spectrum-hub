import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';
import { headerFragment } from '../mocks.js';

const block = {
  name: 'header',
  path: '/test/a11y/fixtures/header.html',
  readySelector: '.skip-link',
  routes: [
    {
      url: '**/fragments/nav/header',
      contentType: 'text/html',
      body: headerFragment,
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

test(`${block.name} block matches its expected accessibility tree`, async ({ page }, testInfo) => {
  // Mobile Chrome also runs on the Chromium engine, so `browserName` alone can't isolate a
  // single run — check the project by name to actually run this once, not twice.
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');

  await gotoBlock(page, block);

  await expect(page.locator(block.ariaRoot ?? `.${block.name}`)).toMatchAriaSnapshot(`
    - banner:
      - link "Skip to main content":
        - /url: "#main-content"
      - paragraph:
        - link "Adobe":
          - /url: /
      - list:
        - listitem:
          - link "Foundations":
            - /url: /foundations
        - listitem:
          - link "Components":
            - /url: /components
        - listitem:
          - link "Patterns":
            - /url: /patterns
      - region "Additional site actions":
        - list:
          - listitem:
            - link "Contact":
              - /url: /contact
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
