import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';
import {
  playgroundComponentsSheet, playgroundControlsSheet, playgroundRspProps, playgroundSwcProps,
} from '../mocks.js';

const block = {
  name: 'playground',
  path: '/test/a11y/fixtures/playground.html',
  // layout (preview + controls) and the code disclosure land together in one replaceChildren
  readySelector: '.playground-layout',
  routes: [
    {
      url: '**/playground-data.json?sheet=components',
      contentType: 'application/json',
      body: playgroundComponentsSheet,
    },
    {
      url: '**/playground-data.json?sheet=controls',
      contentType: 'application/json',
      body: playgroundControlsSheet,
    },
    {
      url: '**/deps/rsp/data/Button.json',
      contentType: 'application/json',
      body: playgroundRspProps,
    },
    {
      url: '**/deps/swc/data/swc-button.json',
      contentType: 'application/json',
      body: playgroundSwcProps,
    },
    {
      // avoid a real cross-origin CDN fetch inside the live-preview iframe
      url: '**/deps/swc/playground/index.html**',
      contentType: 'text/html',
      body: '<html><body></body></html>',
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
    - iframe
    - switch "isDisabled"
    - text: isDisabled
    - button "Copy code"
    - status
    - text: <swc-button>Label</swc-button>
    - button "Expand code"
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
