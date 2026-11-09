import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';
import { statusSlice } from '../mocks.js';
import { FIGMA_SOURCES } from '../../../scripts/utils/figma-sources.js';

const block = {
  name: 'component-status',
  path: '/test/a11y/fixtures/component-status.html',
  readySelector: '.component-status-pill',
  routes: [
    {
      url: '**/deps/status/button.json',
      contentType: 'application/json',
      body: statusSlice,
    },
  ],
};

for (const source of FIGMA_SOURCES.filter(({ platform }) => platform !== 'web')) {
  test(`${block.name} ${source.platform} page exposes only its accessible Design link`, async ({ page, makeAxeBuilder }, testInfo) => {
    await gotoBlock(page, {
      ...block,
      path: `${block.path}?platform=${source.platform}`,
      routes: [{
        url: '**/deps/status/button.json',
        contentType: 'application/json',
        body: JSON.stringify({
          [source.platform]: {
            figma: {
              status: 'available', figmaSource: source.id, figmaFile: source.fileKey, figmaPageId: '1:2',
            },
          },
        }),
      }],
    });
    const results = await makeAxeBuilder().analyze();
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
    await expect(page.locator('[data-kind="dev"]')).toHaveCount(0);
    if (testInfo.project.name === 'chromium') {
      await expect(page.locator('.component-status')).toMatchAriaSnapshot(`
        - group "Component status":
          - link "Design available. Opens Figma in a new tab.":
            - /url: https://www.figma.com/design/${source.fileKey}/${source.urlName}?node-id=1-2&m=dev
            - text: ""
      `);
    }
  });
}

test(`${block.name} AI page exposes the published SWC pattern documentation link`, async ({ page, makeAxeBuilder }) => {
  await gotoBlock(page, {
    ...block,
    path: `${block.path}?component=message-sources`,
    routes: [{
      url: '**/deps/status/message-sources.json',
      contentType: 'application/json',
      body: JSON.stringify({
        web: {
          swc: { status: 'available' },
          figma: { status: 'not-available' },
        },
      }),
    }],
  });
  await expect(page.getByRole('link', { name: 'Code available. Opens SWC documentation in a new tab.' })).toHaveAttribute('href', 'https://spectrum-web-components.adobe.com/?path=/docs/patterns-ai-toolkit-message-sources--docs');
  const results = await makeAxeBuilder().analyze();
  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

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
    - group "Component status":
      - link "Code available. Opens SWC documentation in a new tab.":
        - /url: https://spectrum-web-components.adobe.com/?path=/docs/components-button--docs
        - text: ""
      - link "Design experimental. Opens Figma in a new tab.":
        - /url: https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web?node-id=9230-3620&m=dev
        - text: ""
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
