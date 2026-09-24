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
      url: '**/blocks/playground/preview/index.html**',
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
    - text: <swc-button size="m"> Get started </swc-button>
  `);
});

test('multiple playgrounds retain isolated controls, focus, and preview status', async ({
  page,
  makeAxeBuilder,
}) => {
  await page.route('**/playground-data.json?sheet=components', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      data: [
        { Component: 'Button', Properties: 'isDisabled' },
        { Component: 'Badge', Properties: 'fixed' },
      ],
    }),
  }));
  await page.route('**/playground-data.json?sheet=controls', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      data: [
        { Property: 'isDisabled', control: 'switch' },
        { Property: 'fixed', control: 'switch' },
      ],
    }),
  }));
  await page.route('**/deps/swc/data/swc-button.json', (route) => route.fulfill({
    contentType: 'application/json',
    body: playgroundSwcProps,
  }));
  await page.route('**/deps/swc/data/swc-badge.json', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify([{
      property: 'fixed',
      attribute: 'fixed',
      type: 'boolean',
      kind: 'boolean',
      values: [],
      optional: true,
      default: 'false',
    }]),
  }));
  await page.route('**/deps/swc/playground/snippets/button.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<swc-button>Button</swc-button>',
  }));
  await page.route('**/deps/swc/playground/snippets/badge.html', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<swc-badge>Badge</swc-badge>',
  }));
  await page.route('**/blocks/playground/preview/index.html**', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<html><body></body></html>',
  }));
  await page.goto('/test/a11y/fixtures/playground-interactions.html');

  const playgrounds = page.locator('.playground');
  await expect(playgrounds).toHaveCount(2);
  await expect(playgrounds.nth(0).getByLabel('Button component controls')).toBeVisible();
  await expect(playgrounds.nth(1).getByLabel('Badge component controls')).toBeVisible();

  const buttonSwitch = playgrounds.nth(0).getByRole('switch');
  const badgeSwitch = playgrounds.nth(1).getByRole('switch');
  await buttonSwitch.click();
  await expect(buttonSwitch).toBeFocused();
  await expect(badgeSwitch).not.toBeChecked();

  const firstFrame = page.frames().find((frame) => frame.url().includes('frame=playground-'));
  await firstFrame.evaluate(() => {
    const frameId = new URLSearchParams(location.search).get('frame');
    parent.postMessage({
      type: 'preview-error',
      frameId,
      message: 'Adapter failed',
    }, '*');
  });
  await expect(
    playgrounds.nth(0).locator('.playground-preview [role="status"]'),
  ).toContainText('Preview unavailable');
  await expect(playgrounds.nth(0).getByRole('switch')).toBeVisible();
  await expect(playgrounds.nth(0).locator('pre')).toBeVisible();
  await expect(playgrounds.nth(1).locator('.playground-preview [role="status"]')).toBeEmpty();

  const results = await makeAxeBuilder().analyze();
  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

// The initial checks are static — they scan the block as first rendered and never
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
