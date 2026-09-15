import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';

const component = {
  name: 'se-select',
  path: '/test/a11y/fixtures/custom-components/se-select.html',
  readySelector: 'se-select select',
  ariaRoot: '.test-container',
};

test(`${component.name} component in light/default mode has no WCAG 2.2 AA violations`, async ({ page, makeAxeBuilder }) => {
  await gotoBlock(page, component);

  const results = await makeAxeBuilder()
    .disableRules(component.disableRules ?? [])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${component.name} component matches its expected accessibility tree`, async ({ page }, testInfo) => {
  // Mobile Chrome also runs on the Chromium engine, so `browserName` alone can't isolate a
  // single run — check the project by name to actually run this once, not twice.
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');

  await gotoBlock(page, component);

  await expect(page.locator(component.ariaRoot)).toMatchAriaSnapshot(`
    - text: Size
    - combobox "Size":
      - option "Small" [selected]
      - option "Medium"
      - option "Large"
    - img
    - text: Disabled picker
    - combobox "Disabled picker" [disabled]:
      - option "Small" [selected]
    - img
  `);
});

test(`${component.name} picker stays below the select and scrolls internally`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Native picker placement is Chromium-specific; only the chromium project needs to run it');

  await gotoBlock(page, component);

  const select = page.getByRole('combobox', { name: 'Size' });

  await select.evaluate((selectEl) => {
    const { host } = selectEl.getRootNode();
    host.style.position = 'fixed';
    host.style.inset = 'auto 16px 48px auto';
    host.style.zIndex = '1';

    for (let index = 0; index < 20; index += 1) {
      const option = document.createElement('option');
      option.value = `extra-${index + 1}`;
      option.textContent = `Extra option ${index + 1}`;
      selectEl.append(option);
    }
  });

  await select.click();

  const pickerStyles = await select.evaluate((selectEl) => {
    const styles = getComputedStyle(selectEl, '::picker(select)');

    return {
      maxBlockSize: styles.maxBlockSize,
      overflowY: styles.overflowY,
      positionArea: styles.positionArea,
      positionTryFallbacks: styles.positionTryFallbacks,
    };
  });

  expect(pickerStyles).toEqual({
    maxBlockSize: 'stretch',
    overflowY: 'auto',
    positionArea: 'self-end span-self-end',
    positionTryFallbacks: 'none',
  });

  const getOptionRects = () => select.evaluate((selectEl) => {
    const selectRect = selectEl.getBoundingClientRect();
    const firstOption = selectEl.options[0];
    const lastOption = selectEl.options[selectEl.options.length - 1];

    const toRect = (option) => {
      const rect = option.getBoundingClientRect();

      return {
        bottom: rect.bottom,
        top: rect.top,
      };
    };

    return {
      firstOption: toRect(firstOption),
      lastOption: toRect(lastOption),
      selectBottom: selectRect.bottom,
      viewportHeight: window.innerHeight,
    };
  });

  const initialRects = await getOptionRects();
  expect(initialRects.firstOption.top).toBeGreaterThanOrEqual(initialRects.selectBottom);
  expect(initialRects.lastOption.bottom).toBeGreaterThan(initialRects.viewportHeight);

  await page.keyboard.press('End');

  const afterEndRects = await getOptionRects();
  expect(afterEndRects.firstOption.top).toBeLessThan(initialRects.firstOption.top);
  expect(afterEndRects.lastOption.top).toBeGreaterThan(afterEndRects.selectBottom);
  expect(afterEndRects.lastOption.bottom).toBeLessThanOrEqual(afterEndRects.viewportHeight);
});

test(`${component.name} component in dark mode has no WCAG 2.2 AA violations`, async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });

  await gotoBlock(page, component);

  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();

  await testInfo.attach('accessibility-scan-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});
