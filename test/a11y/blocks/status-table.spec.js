import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';
import { statusIndex, svgIcon } from '../mocks.js';

const block = {
  name: 'status-table',
  path: '/test/a11y/fixtures/status-table.html',
  readySelector: '.status-table-table',
  routes: [
    {
      url: '**/deps/status-index.json',
      contentType: 'application/json',
      body: statusIndex,
    },
    {
      url: '**/*.svg',
      contentType: 'image/svg+xml',
      body: svgIcon,
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
    - region "Component availability":
      - list:
        - listitem: Available Ready for use. Fidelity may vary.
        - listitem: Experimental Available for exploration and testing, but not recommended for production use.
        - listitem: Not available Not currently available or applicable for this implementation or design library.
      - button "Search components"
      - switch "Show details"
      - text: Show details
      - button "Download CSV"
      - table "Component availability":
        - rowgroup:
          - row "Component Figma Spectrum Web Components":
            - columnheader "Component":
              - button "Component"
            - columnheader "Figma":
              - button "Figma"
            - columnheader "Spectrum Web Components":
              - button "Spectrum Web Components"
        - rowgroup:
          - row "Button Available Button, Available in Spectrum Web Components":
            - rowheader "Button"
            - cell "Available"
            - cell "Button, Available in Spectrum Web Components":
              - link "Button, Available in Spectrum Web Components":
                - /url: /web/swc/components/button
                - text: ""
          - row "Calendar Not available Calendar, Experimental in Spectrum Web Components":
            - rowheader "Calendar"
            - cell "Not available"
            - cell "Calendar, Experimental in Spectrum Web Components":
              - link "Calendar, Experimental in Spectrum Web Components":
                - /url: /web/swc/components/calendar
                - text: ""
      - status: Sorted by Component, ascending
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
