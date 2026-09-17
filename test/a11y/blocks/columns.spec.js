import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';

const block = {
  name: 'columns',
  path: '/test/a11y/fixtures/columns.html',
  readySelector: '.col-1',
};

test('non-grid columns use responsive default gaps without overriding authored gaps', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'this test drives its own container widths');

  await gotoBlock(page, block);

  const gaps = await page.evaluate(() => {
    const columns = document.createElement('div');
    columns.className = 'columns';
    columns.style.inlineSize = '799px';
    columns.innerHTML = '<div class="row"><div class="col">Column</div></div>';
    document.body.append(columns);

    const row = columns.querySelector('.row');
    const narrowDefault = getComputedStyle(row).gap;
    columns.style.inlineSize = '800px';
    const wideDefault = getComputedStyle(row).gap;
    const authored = {};

    for (const modifier of ['gap-xs', 'gap-s', 'gap-m', 'gap-l', 'gap-xl', 'gap-xxl']) {
      columns.className = `columns ${modifier}`;
      authored[modifier] = getComputedStyle(row).gap;
    }

    return { narrowDefault, wideDefault, authored };
  });

  expect(gaps).toEqual({
    narrowDefault: '32px',
    wideDefault: '56px',
    authored: {
      'gap-xs': '8px',
      'gap-s': '12px',
      'gap-m': '16px',
      'gap-l': '24px',
      'gap-xl': '32px',
      'gap-xxl': '40px',
    },
  });
});

test('grid-layout adds flexible 300px tracks as space becomes available', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'this test drives its own container widths');

  await gotoBlock(page, {
    path: '/test/a11y/fixtures/columns-grid.html',
    readySelector: '.grid-column',
  });

  const positions = await page.evaluate(() => {
    const columns = document.querySelector('.columns');
    const tracksAt = (width) => {
      columns.style.inlineSize = `${width}px`;
      const groups = [...columns.querySelectorAll('.grid-column')];
      return groups.map((group) => ({
        x: Math.round(group.getBoundingClientRect().x),
        y: Math.round(group.getBoundingClientRect().y),
      }));
    };

    return {
      narrow: tracksAt(500),
      intermediate: tracksAt(700),
      wide: tracksAt(1000),
    };
  });

  expect(new Set(positions.narrow.map(({ x }) => x)).size).toBe(1);
  expect(new Set(positions.narrow.map(({ y }) => y)).size).toBe(3);
  expect(new Set(positions.intermediate.map(({ x }) => x)).size).toBe(2);
  expect(positions.intermediate[2].x).toBe(positions.intermediate[0].x);
  expect(positions.intermediate[2].y).toBeGreaterThan(positions.intermediate[0].y);
  expect(new Set(positions.wide.map(({ x }) => x)).size).toBe(3);
  expect(new Set(positions.wide.map(({ y }) => y)).size).toBe(1);
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
    - figure:
      - img "First column illustration"
      - paragraph:
        - text: First image caption with
        - link "more details"
        - text: .
    - heading "Feature one" [level=3]
    - paragraph: Describe the first feature clearly and concisely.
    - figure:
      - img "Second column illustration"
    - heading "Feature two" [level=3]
    - paragraph: Describe the second feature clearly and concisely.
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
