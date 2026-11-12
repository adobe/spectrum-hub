import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';

const component = {
  name: 'se-disclosure',
  path: '/test/a11y/fixtures/custom-components/se-disclosure.html',
  readySelector: '#long button',
  ariaRoot: '.test-container',
};

test(`${component.name} supports native keyboard disclosure and a bounded scroll panel`, async ({ page }) => {
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

test(`${component.name} scrolls overflowing panels with vertical arrows`, async ({ page }) => {
  await gotoBlock(page, component);
  const disclosure = page.locator('#long');
  await disclosure.getByRole('button').click();
  const panel = disclosure.getByRole('region');
  expect(await panel.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(1);
  await panel.focus();
  await expect(panel).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => panel.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  const scrolled = await panel.evaluate((el) => el.scrollTop);
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => panel.evaluate((el) => el.scrollTop)).toBeLessThan(scrolled);
  await expect(panel).toBeFocused();
});

test(`${component.name} preserves descendant controls and modified panel shortcuts`, async ({ page }) => {
  await gotoBlock(page, component);
  const disclosure = page.locator('#long');
  await disclosure.getByRole('button').click();
  const panel = disclosure.getByRole('region');
  const prevented = await panel.evaluate((el) => {
    const input = document.createElement('input');
    el.getRootNode().host.append(input);
    const events = [
      ...['altKey', 'ctrlKey', 'metaKey', 'shiftKey'].map((modifier) => (
        new KeyboardEvent('keydown', {
          key: 'ArrowDown', [modifier]: true, bubbles: true, cancelable: true,
        })
      )),
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    ];
    const results = events.map((event) => {
      el.dispatchEvent(event);
      return event.defaultPrevented;
    });
    const inputEvent = new KeyboardEvent('keydown', {
      key: 'ArrowDown', bubbles: true, composed: true, cancelable: true,
    });
    input.dispatchEvent(inputEvent);
    results.push(inputEvent.defaultPrevented);
    return results;
  });
  expect(prevented).toEqual([false, false, false, false, false, false]);
  expect(await panel.evaluate((el) => el.scrollTop)).toBe(0);
});

test(`${component.name} leaves vertical arrows alone when the panel fits`, async ({ page }) => {
  await gotoBlock(page, component);
  const panel = page.getByRole('region', { name: 'Open details', exact: true });
  expect(await panel.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  const prevented = await panel.evaluate((el) => ['ArrowUp', 'ArrowDown'].map((key) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    return event.defaultPrevented;
  }));
  expect(prevented).toEqual([false, false]);
});

test(`${component.name} truncates narrow trigger labels without losing their accessible name`, async ({ page }) => {
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

test(`${component.name} leaves short previews inline and preserves expanded state across resizing`, async ({ page }) => {
  await gotoBlock(page, component);
  await expect(page.locator('#short').getByRole('button')).toHaveCount(0);
  await expect(page.locator('#short')).toContainText('string');
  const disclosure = page.locator('#long');
  await disclosure.getByRole('button').click();
  await disclosure.evaluate((el) => { el.style.inlineSize = '180px'; });
  await expect(disclosure.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  await expect(disclosure.getByRole('region')).toBeVisible();
});

test(`${component.name} detects overflow after width and content changes`, async ({ page }) => {
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

for (const expanded of [false, true]) {
  test(`${component.name} component in light/default mode has no WCAG 2.2 AA violations${expanded ? ' when expanded' : ''}`, async ({ page, makeAxeBuilder }) => {
    await gotoBlock(page, component);
    if (expanded) { await page.locator('#long').getByRole('button').click(); }

    const results = await makeAxeBuilder()
      .disableRules(component.disableRules ?? [])
      .analyze();

    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
  });
}

test(`${component.name} component matches its expected accessibility tree`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');

  await gotoBlock(page, component);

  await expect(page.locator(component.ariaRoot)).toMatchAriaSnapshot(`
    - heading "Disclosures" [level=1]
    - button "Details"
    - button "Open details" [expanded]
    - region "Open details": Visible information
    - text: string
    - button "Full type for autocomplete"
  `);
});

test(`${component.name} component in dark mode has no WCAG 2.2 AA violations`, async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });

  await gotoBlock(page, component);
  await page.locator('#long').getByRole('button').click();

  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();

  await testInfo.attach('accessibility-scan-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});
