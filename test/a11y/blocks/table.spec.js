import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';

const block = {
  name: 'table',
  path: '/test/a11y/fixtures/table.html',
  readySelector: '.table table',
};

for (const { name, props } of [
  { name: 'authored tables' },
  { name: 'extracted types at the disclosure threshold', props: [{ property: 'size', type: `"${'x'.repeat(498)}"` }] },
  {
    name: 'excluded long types',
    props: [
      { property: 'size', type: 'string' },
      { property: 'excluded', type: `"${'x'.repeat(499)}"`, inheritedFrom: 'StyleProps' },
    ],
  },
]) {
  test(`${name} do not load disclosure dependencies`, async ({ page }) => {
    const requests = [];
    page.on('request', (request) => requests.push(new URL(request.url()).pathname));
    await gotoBlock(page, props ? {
      ...block,
      path: `${block.path}?data`,
      routes: [{
        url: '**/deps/swc/data/swc-text-field.json',
        contentType: 'application/json',
        body: JSON.stringify(props),
      }],
    } : block);
    await expect(page.locator('.table-scroll')).toBeVisible();
    expect(requests.filter((path) => /^\/deps\/(se|lit)\/|^\/scripts\/utils\/styles\.js$/.test(path)))
      .toEqual([]);
  });
}

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
    - region "Button component Properties":
      - table "Button component Properties":
        - rowgroup:
          - row "Name Type Default Description":
            - columnheader "Name"
            - columnheader "Type"
            - columnheader "Default"
            - columnheader "Description"
        - rowgroup:
          - row "size string medium Controls the size of the button":
            - cell "size"
            - cell "string"
            - cell "medium"
            - cell "Controls the size of the button"
          - row "variant string primary Sets the visual style variant":
            - cell "variant"
            - cell "string"
            - cell "primary"
            - cell "Sets the visual style variant"
          - row "disabled boolean false Disables interaction and applies disabled styling":
            - cell "disabled"
            - cell "boolean"
            - cell "false"
            - cell "Disables interaction and applies disabled styling"
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

test('extracted autocomplete type stays complete inside its own responsive disclosure', async ({ page, makeAxeBuilder }) => {
  await gotoBlock(page, { ...block, path: `${block.path}?data` });
  const disclosure = page.locator('se-disclosure[label="View more about autocomplete"]');
  const trigger = disclosure.getByRole('button');
  await expect(trigger).toBeVisible();
  const actualType = await page.evaluate(async () => {
    const data = await (await fetch('/deps/swc/data/swc-text-field.json')).json();
    return data.find((prop) => prop.attribute === 'autocomplete').type;
  });
  expect(actualType.length).toBeGreaterThan(30000);
  expect(await disclosure.textContent()).toBe(actualType);
  const preview = disclosure.locator('.se-disclosure-preview');
  const fourLines = await preview.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight) * 4);
  expect(await preview.evaluate((el) => {
    const style = getComputedStyle(el);
    return el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  }))
    .toBeLessThanOrEqual(fourLines + 1);
  await trigger.click();
  const panel = disclosure.getByRole('region');
  await expect(panel).toBeVisible();
  expect(await panel.locator('slot').evaluate((slot) => slot.assignedNodes()
    .map((node) => node.textContent).join(''))).toBe(actualType);
  expect(await panel.evaluate((el) => el.clientHeight)).toBeLessThanOrEqual(320);
  const bounds = await disclosure.evaluate((el) => ({
    disclosure: el.getBoundingClientRect().width,
    cell: el.closest('td').getBoundingClientRect().width,
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(bounds.disclosure).toBeLessThanOrEqual(bounds.cell);
  expect(bounds.document).toBeLessThanOrEqual(bounds.viewport);
  expect(await trigger.evaluate((el) => el.getBoundingClientRect().bottom))
    .toBeLessThanOrEqual(await panel.evaluate((el) => el.getBoundingClientRect().top));
  const results = await makeAxeBuilder().analyze();
  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test('only types longer than 500 characters use disclosures at narrow and desktop widths', async ({ page }) => {
  const shortType = '"s" | "m" | "l" | "xl"';
  const boundaryType = `"${'x'.repeat(498)}"`;
  const longType = `"${'x'.repeat(499)}"`;
  const props = [
    { attribute: 'size', type: shortType },
    { attribute: 'boundary', type: boundaryType },
    { attribute: 'long', type: longType },
  ];
  await gotoBlock(page, {
    ...block,
    path: `${block.path}?data`,
    routes: [{
      url: '**/deps/swc/data/swc-text-field.json',
      contentType: 'application/json',
      body: JSON.stringify(props),
    }],
  });
  const rows = page.locator('tbody tr');
  for (const width of [390, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [index, type] of [shortType, boundaryType].entries()) {
      await expect(rows.nth(index).locator('se-disclosure')).toHaveCount(0);
      await expect(rows.nth(index).locator('.table-cell-value').last()).toHaveText(type);
    }
    const disclosure = rows.nth(2).locator('se-disclosure');
    await expect(disclosure.getByRole('button')).toBeVisible();
    expect(await disclosure.textContent()).toBe(longType);
  }
});

test('wide API tables scroll without squeezing Type disclosures or changing the mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await gotoBlock(page, {
    ...block,
    path: `${block.path}?data`,
    routes: [{
      url: '**/deps/swc/data/swc-text-field.json',
      contentType: 'application/json',
      body: JSON.stringify([{
        property: 'errorMessage',
        type: Array(50).fill('string | number | ReactElement<unknown>').join(' | '),
        default: '-',
        description: 'UnbrokenDescription'.repeat(12),
      }]),
    }],
  });
  const tableBlock = page.locator('.table');
  await tableBlock.evaluate((el) => { el.style.inlineSize = '700px'; });
  const cell = page.locator('.table-type-cell:has(se-disclosure)');
  const trigger = cell.getByRole('button');
  await expect(trigger).toBeVisible();
  expect(await cell.evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(256);
  const scroller = tableBlock.locator('.table-scroll');
  await expect(scroller).toHaveAttribute('tabindex', '0');
  await expect(tableBlock).toHaveAttribute('data-scroll-hint', '');
  expect(await scroller.evaluate((el) => el.scrollWidth)).toBeGreaterThan(
    await scroller.evaluate((el) => el.clientWidth),
  );
  await scroller.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await scroller.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
  await expect(tableBlock).not.toHaveAttribute('data-scroll-hint');
  await trigger.click();
  await expect(cell.getByRole('region')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(1600);

  await tableBlock.evaluate((el) => { el.style.removeProperty('inline-size'); });
  await page.setViewportSize({ width: 390, height: 900 });
  expect(await page.locator('tbody tr').evaluate((el) => getComputedStyle(el).display)).toBe('grid');
  await expect(cell.locator('.table-cell-label')).toBeVisible();
  await expect(trigger).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390);
});

test('extracted description links have accessible names and safe destinations', async ({ page, makeAxeBuilder }) => {
  await gotoBlock(page, {
    ...block,
    path: `${block.path}?data`,
    routes: [{
      url: '**/deps/swc/data/swc-text-field.json',
      contentType: 'application/json',
      body: JSON.stringify([{
        property: 'id',
        type: 'string',
        description: "The element's `id`. See\n[`MDN`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/id).",
      }]),
    }],
  });
  const link = page.getByRole('link', { name: 'MDN', exact: true });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', 'https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/id');
  await expect(page.locator('td:last-child > .table-cell-value > code')).toHaveText('id');
  await expect(link.locator('code')).toHaveText('MDN');
  const results = await makeAxeBuilder().analyze();
  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

for (const direction of ['ltr', 'rtl']) {
  test(`table scroll hint follows overflow and layout changes in ${direction}`, async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await gotoBlock(page, block);
    const tableBlock = page.locator('.table');
    const scroller = tableBlock.locator('.table-scroll');
    const table = tableBlock.locator('table');
    const hintOpacity = () => tableBlock.evaluate((el) => getComputedStyle(el, '::after').opacity);
    await tableBlock.evaluate((el, dir) => {
      el.style.inlineSize = '700px';
      el.dir = dir;
    }, direction);
    await expect.poll(hintOpacity).toBe('0');
    await expect(tableBlock).not.toHaveAttribute('data-scroll-hint');
    await expect(scroller).toHaveAccessibleDescription('');

    // Content can grow after initialization without resizing the viewport or scroller.
    await table.evaluate((el) => { el.style.minInlineSize = '900px'; });
    await expect(tableBlock).toHaveAttribute('data-scroll-hint', '');
    await expect.poll(hintOpacity).toBe('1');
    const instructions = 'Scrollable table. Use the left and right arrow keys to view more.';
    await expect(scroller).toHaveAccessibleDescription(instructions);
    await scroller.focus();
    await expect(scroller).toBeFocused();
    await page.keyboard.press(direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
    await expect.poll(() => scroller.evaluate((el) => Math.abs(el.scrollLeft))).toBeGreaterThan(0);
    const scrollPosition = await scroller.evaluate((el) => Math.abs(el.scrollLeft));
    await page.keyboard.press(direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft');
    await expect.poll(() => scroller.evaluate((el) => Math.abs(el.scrollLeft)))
      .toBeLessThan(scrollPosition);
    expect(await tableBlock.locator('.visually-hidden').evaluate((el) => ({
      width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height,
    }))).toEqual({ width: 1, height: 1 });

    await tableBlock.evaluate((el) => { el.style.inlineSize = '1000px'; });
    await expect(tableBlock).not.toHaveAttribute('data-scroll-hint');
    await expect.poll(hintOpacity).toBe('0');
    await expect(scroller).toHaveAccessibleDescription('');

    await tableBlock.evaluate((el) => { el.style.inlineSize = '700px'; });
    await expect(tableBlock).toHaveAttribute('data-scroll-hint', '');
    await expect.poll(hintOpacity).toBe('1');
    await scroller.evaluate((el, dir) => {
      el.scrollLeft = dir === 'rtl' ? -el.scrollWidth : el.scrollWidth;
    }, direction);
    await expect(tableBlock).not.toHaveAttribute('data-scroll-hint');
    await expect.poll(hintOpacity).toBe('0');
    await expect(scroller).toHaveAccessibleDescription(instructions);
    await scroller.evaluate((el) => { el.scrollLeft = 0; });
    await expect.poll(hintOpacity).toBe('1');

    await table.evaluate((el) => { el.style.removeProperty('min-inline-size'); });
    await expect(tableBlock).not.toHaveAttribute('data-scroll-hint');
    await expect.poll(hintOpacity).toBe('0');
    await expect(scroller).toHaveAccessibleDescription('');
  });
}
