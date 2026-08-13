import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';
import { scheduleJson, eventFragment } from '../mocks.js';

const block = {
  name: 'schedule',
  path: '/test/a11y/fixtures/schedule.html',
  // schedule.js has a known destructuring mismatch with loadFragment's return shape;
  // the block may not fully render — use networkidle so axe still runs on the page
  routes: [
    {
      url: '**/mock-schedule.json',
      contentType: 'application/json',
      body: scheduleJson,
    },
    {
      url: '**/mock-event-fragment',
      contentType: 'text/html',
      body: eventFragment,
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
