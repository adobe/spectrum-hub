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
    - text: <swc-button> Button </swc-button>
    - button "Expand code"
  `);
});

// The three checks above are static — they scan the block as first rendered and never
// touch a control, so nothing covered the state a user is actually in once they start
// changing props. That state is where this block's accessibility is least obvious: the
// preview is a separate document updated by postMessage, and the code snippet is rebuilt
// on a debounce, so a control change has two asynchronous consequences and neither is
// visible to an axe scan of the initial render.
test(`${block.name} block stays accessible after a control interaction`, async ({ page, makeAxeBuilder }) => {
  await gotoBlock(page, block);

  const toggle = page.getByRole('switch', { name: 'isDisabled' });
  const snippet = page.locator('.playground pre');

  // Asserted on the attribute rather than the whole snippet: the surrounding formatting
  // and slot text are the serializer's business and change independently of this block.
  await expect(snippet).not.toContainText('disabled');

  await toggle.click();

  // The snippet rebuild is debounced (DISCLOSURE_DEBOUNCE_MS in playground.js), so this
  // also asserts the debounce actually settles rather than dropping the last change.
  await expect(snippet).toContainText('disabled');

  // 2.4.3 / 3.2.2: operating a control must not move focus or rebuild the control out
  // from under the user. These are `se-*` custom elements, so a re-render that swapped
  // the inner input would silently drop focus mid-interaction — invisible to a mouse
  // user, and a lost place for anyone using a keyboard or screen reader.
  await expect(toggle).toBeFocused();
  // se-switch renders a native checkbox with role=switch, so its state is the `checked`
  // property rather than an aria-checked attribute — both are valid, and asserting the
  // wrong one passes vacuously against a missing attribute.
  await expect(toggle).toBeChecked();

  const results = await makeAxeBuilder()
    .disableRules(block.disableRules ?? [])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
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
