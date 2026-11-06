import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';
import { cardGridRollup, statusIndex } from '../mocks.js';

// The block makes no session check: the edge decides which columns a row
// carries. The mock supplies the signed-in shape, so the scan covers a card
// with every badge it can render.
const block = {
  name: 'card-grid',
  path: '/test/a11y/fixtures/card-grid.html',
  readySelector: '.card-grid-item',
  routes: [
    {
      url: '**/web/components/query-index.json*',
      contentType: 'application/json',
      body: cardGridRollup,
    },
    {
      url: '**/deps/status-index.json*',
      contentType: 'application/json',
      body: statusIndex,
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
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');

  await gotoBlock(page, block);

  await expect(page.locator(block.ariaRoot ?? `.${block.name}`)).toMatchAriaSnapshot(`
    - list:
      - listitem:
        - paragraph:
          - link "Button":
            - /url: /web/swc/components/button
        - paragraph: A button lets someone perform an action.
        - paragraph: SWC Available
        - list:
          - listitem: CXO
          - listitem: web
          - listitem: Michael Scott
      - listitem:
        - paragraph:
          - link "Calendar":
            - /url: /web/swc/components/calendar
        - paragraph: A calendar displays dates and lets someone pick one.
        - paragraph: SWC Experimental
        - list:
          - listitem: CXO
          - listitem: web
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
