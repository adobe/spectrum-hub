import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';

const block = {
  name: 'page-nav',
  path: '/test/a11y/fixtures/page-nav.html',
  readySelector: 'nav.page-nav',
};

// Below 900px, page-nav.js removes the nav from the DOM entirely — there's nothing to
// scan on mobile viewports, and that removal behavior is already covered by
// test/blocks/page-nav.test.js ("the nav is removed from the DOM below the desktop breakpoint").
test(`${block.name} block in light/default mode has no WCAG 2.2 AA violations`, async ({ page, makeAxeBuilder, isMobile }) => {
  test.skip(isMobile, 'page-nav is fully removed below 900px by design — see test/blocks/page-nav.test.js');

  await gotoBlock(page, block);

  const results = await makeAxeBuilder()
    .disableRules(block.disableRules ?? [])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${block.name} block in dark mode has no WCAG 2.2 AA violations`, async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, 'page-nav is fully removed below 900px by design — see test/blocks/page-nav.test.js');

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
