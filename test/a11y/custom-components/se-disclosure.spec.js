import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';

const component = {
  path: '/test/a11y/fixtures/custom-components/se-disclosure.html',
  readySelector: '#long button',
};

test('se-disclosure supports native keyboard disclosure and a bounded scroll panel', async ({ page }) => {
  await gotoBlock(page, component);
  const disclosure = page.locator('#long');
  const trigger = disclosure.getByRole('button', { name: 'Full type for autocomplete' });
  const panel = disclosure.getByRole('region');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toBeHidden();
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(trigger).toBeFocused();
  await expect(panel).toBeVisible();
  expect(await trigger.getAttribute('aria-controls')).toBe(await panel.getAttribute('id'));
  await page.keyboard.press('Tab');
  await expect(panel).toBeFocused();
  await page.keyboard.press('End');
  await expect.poll(() => panel.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  const geometry = await panel.evaluate((el) => ({
    height: el.clientHeight, fullHeight: el.scrollHeight,
  }));
  expect(geometry.height).toBeLessThanOrEqual(320);
  expect(geometry.fullHeight).toBeGreaterThan(geometry.height);
  await trigger.focus();
  await page.keyboard.press('Space');
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('se-disclosure truncates narrow trigger labels without losing their accessible name', async ({ page }) => {
  await gotoBlock(page, component);
  const disclosure = page.locator('#long');
  const name = 'Full type for autocomplete with a very long descriptive property name';
  await disclosure.evaluate((el, label) => {
    el.label = label;
    el.style.inlineSize = '180px';
  }, name);
  const trigger = disclosure.getByRole('button', { name, exact: true });
  await expect(trigger).toBeVisible();
  const geometry = await trigger.evaluate((el) => {
    const label = el.querySelector('.se-disclosure-label');
    const chevron = el.querySelector('svg').getBoundingClientRect();
    const button = el.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(label ?? el);
    const lines = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)));
    return {
      lines: lines.size,
      truncated: label ? label.scrollWidth > label.clientWidth : false,
      ellipsis: label ? getComputedStyle(label).textOverflow : '',
      chevronVisible: chevron.width > 0 && chevron.left >= button.left
        && chevron.right <= button.right,
    };
  });
  expect(geometry.lines).toBe(1);
  expect(geometry.truncated).toBe(true);
  expect(geometry.ellipsis).toBe('ellipsis');
  expect(geometry.chevronVisible).toBe(true);
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(disclosure.getByRole('region', { name, exact: true })).toBeVisible();
});

test('se-disclosure leaves short previews inline and preserves expanded state across resizing', async ({ page }) => {
  await gotoBlock(page, component);
  await expect(page.locator('#short').getByRole('button')).toHaveCount(0);
  await expect(page.locator('#short')).toContainText('string');
  const disclosure = page.locator('#long');
  await disclosure.getByRole('button').click();
  await disclosure.evaluate((el) => { el.style.inlineSize = '180px'; });
  await expect(disclosure.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  await expect(disclosure.getByRole('region')).toBeVisible();
});

test('se-disclosure detects overflow after width and content changes', async ({ page }) => {
  await gotoBlock(page, component);
  const disclosure = page.locator('#short');
  await disclosure.evaluate((el) => {
    el.textContent = 'string | number | boolean | undefined | null';
    el.style.inlineSize = '80px';
  });
  await expect(disclosure.getByRole('button')).toBeVisible();
  await disclosure.evaluate((el) => { el.style.inlineSize = '1000px'; });
  await expect(disclosure.getByRole('button')).toHaveCount(0);
});

test('se-disclosure keeps desktop table layout stable when overflow adds a trigger', async ({ page }) => {
  test.setTimeout(10000);
  await page.setViewportSize({ width: 1600, height: 900 });
  await gotoBlock(page, component);
  await page.addStyleTag({ url: '/blocks/table/table.css' });
  const type = Array.from({ length: 6 }, (_, i) => `"value-${i}"`).join(' | ');
  await page.evaluate(async (autocompleteType) => {
    const table = document.createElement('section');
    table.className = 'table quiet';
    table.style.inlineSize = '650px';
    table.innerHTML = '<table><thead><tr><th>Attribute</th><th>Property</th><th>Type</th><th>Default value</th><th>Description</th><th>Inherited from</th></tr></thead><tbody></tbody></table>';
    document.querySelector('main').append(table);
    const props = [
      ['size', '"s" | "m" | "l" | "xl"'],
      ['type', '"text" | "url" | "tel" | "email" | "password"'],
      ['autocomplete', autocompleteType],
    ];
    for (const [property, propType] of props) {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${property}</td><td>${property}</td><td class="table-type-cell"><span class="table-cell-value"></span></td><td>undefined</td><td>The ${property} of the field</td><td>TextfieldBase</td>`;
      const disclosure = document.createElement('se-disclosure');
      disclosure.setAttribute('preview', '');
      disclosure.setAttribute('label', `Expand to view more about ${property}`);
      disclosure.textContent = propType;
      row.querySelector('.table-cell-value').append(disclosure);
      table.querySelector('tbody').append(row);
    }
    await new Promise((resolve) => { requestAnimationFrame(resolve); });
  }, type);
  const disclosure = page.locator('.table se-disclosure').last();
  const trigger = disclosure.getByRole('button');
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(disclosure.getByRole('region')).toBeVisible();
  expect(await disclosure.textContent()).toBe(type);
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

for (const expanded of [false, true]) {
  test(`se-disclosure ${expanded ? 'expanded' : 'collapsed'} has no WCAG violations`, async ({ page, makeAxeBuilder }) => {
    await gotoBlock(page, component);
    if (expanded) { await page.locator('#long').getByRole('button').click(); }
    const results = await makeAxeBuilder().analyze();
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
  });
}

test('se-disclosure matches its expected accessibility tree', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Only desktop needs the shared tree');
  await gotoBlock(page, component);
  await expect(page.locator('.test-container')).toMatchAriaSnapshot(`
    - heading "Disclosures" [level=1]
    - button "Details"
    - button "Open details" [expanded]
    - region "Open details": Visible information
    - text: string
    - button "Full type for autocomplete"
  `);
});

test('se-disclosure dark mode has no contrast violations', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await gotoBlock(page, component);
  await page.locator('#long').getByRole('button').click();
  const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});
