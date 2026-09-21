import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { formatViolations } from '../block-a11y.js';
import { gotoFixture } from '../../playwright/fixture.js';

const block = {
  name: 'columns',
  path: '/test/a11y/fixtures/columns.html',
  readySelector: '.col-1',
};

test('non-grid columns use responsive default gaps without overriding authored gaps', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'this test drives its own container widths');

  await gotoFixture(page, block);

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
    narrowDefault: '56px',
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

  await gotoFixture(page, {
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
      wide: tracksAt(1100),
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

test('a sole medium column uses one explicit grid track', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'the computed grid assertion only needs one browser');

  await gotoFixture(page, {
    path: '/test/a11y/fixtures/columns-grid.html',
    readySelector: '.single-surviving-column .col',
  });

  const layout = await page.locator('.single-surviving-column').evaluate((columns) => {
    columns.style.inlineSize = '1160px';
    const row = columns.querySelector('.row');
    const col = row.querySelector('.col');

    return {
      columnCount: row.children.length,
      tracks: getComputedStyle(row).gridTemplateColumns,
      gridColumn: getComputedStyle(col).gridColumn,
    };
  });

  expect(layout).toEqual({
    columnCount: 1,
    tracks: '1160px',
    gridColumn: '1 / -1',
  });
});

test('a single-cell row keeps the spans established by a multi-column sibling row', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'the computed grid assertion only needs one browser');

  await gotoFixture(page, {
    path: '/test/a11y/fixtures/columns-grid.html',
    readySelector: '.mixed-row-columns .row-2 .col',
  });

  const layout = await page.locator('.mixed-row-columns').evaluate((columns) => {
    columns.style.inlineSize = '1160px';
    return [...columns.querySelectorAll('.row')].map((row) => ({
      columnCount: row.children.length,
      tracks: getComputedStyle(row).gridTemplateColumns,
      cells: [...row.children].map((col) => getComputedStyle(col).gridColumn),
    }));
  });

  expect(layout[0].columnCount).toBe(2);
  expect(layout[0].cells).toEqual(['1 / 7', '7 / 13']);
  expect(layout[1].columnCount).toBe(1);
  expect(layout[1].tracks.split(' ')).toHaveLength(12);
  expect(layout[1].cells).toEqual(['1 / 7']);
});

test('adjacent non-grid rows use the authored columns gap', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'the computed spacing assertion only needs one browser');

  await gotoFixture(page, {
    path: '/test/a11y/fixtures/columns-grid.html',
    readySelector: '.mixed-row-columns .row-2',
  });

  const spacing = await page.locator('.mixed-row-columns').evaluate((columns) => {
    columns.classList.add('gap-xs');
    const [firstRow, secondRow] = columns.querySelectorAll('.row');
    const firstRect = firstRow.getBoundingClientRect();
    const secondRect = secondRow.getBoundingClientRect();

    return {
      actual: Math.round(secondRect.top - firstRect.bottom),
      resolvedGap: Number.parseFloat(getComputedStyle(columns).getPropertyValue('--columns-gap')),
      authoredGap: Number.parseFloat(getComputedStyle(columns).getPropertyValue('--columns-gap-override')),
    };
  });

  expect(spacing).toEqual({
    actual: 8,
    resolvedGap: 8,
    authoredGap: 8,
  });
});

test('mixed columns rows preserve their expected accessibility-tree order', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');

  await gotoFixture(page, {
    path: '/test/a11y/fixtures/columns-grid.html',
    readySelector: '.mixed-row-columns .row-2',
  });

  await expect(page.locator('.mixed-row-columns')).toMatchAriaSnapshot(`
    - figure:
      - img "Nested components example"
    - heading "Nested components" [level=4]
    - paragraph: Text content
    - figure:
      - img "Dropdown field example"
  `);
});

test(`${block.name} block in light/default mode has no WCAG 2.2 AA violations`, async ({ page, makeAxeBuilder }) => {
  await gotoFixture(page, block);

  const results = await makeAxeBuilder()
    .disableRules(block.disableRules ?? [])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${block.name} block matches its expected accessibility tree`, async ({ page }, testInfo) => {
  // Mobile Chrome also runs on the Chromium engine, so `browserName` alone can't isolate a
  // single run — check the project by name to actually run this once, not twice.
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');

  await gotoFixture(page, block);

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

  await gotoFixture(page, block);

  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();

  await testInfo.attach('accessibility-scan-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});
