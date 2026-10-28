import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';

const component = {
  name: 'se-dialog',
  path: '/test/a11y/fixtures/custom-components/se-dialog.html',
  // se-dialog calls showModal() itself ~20ms after connecting
  readySelector: 'se-dialog dialog[open]',
  ariaRoot: 'se-dialog',
};

async function gotoDialog(page, variant) {
  await gotoBlock(page, {
    ...component,
    path: `${component.path}?variant=${variant}`,
  });
  await page.waitForFunction(() => {
    const dialog = document.querySelector('se-dialog')?.shadowRoot?.querySelector('dialog');
    return dialog && getComputedStyle(dialog).opacity === '1';
  });
  if (variant === 'non-modal') {
    await page.locator('se-dialog').evaluate((dialog) => {
      dialog.close();
      dialog.show();
    });
  }
}

for (const variant of ['modal', 'non-modal', 'overflow-hidden', 'no-heading']) {
  test.describe(`${component.name} ${variant}`, () => {
    test('component in light/default mode has no WCAG 2.2 AA violations', async ({ page, makeAxeBuilder }) => {
      await gotoDialog(page, variant);

      const results = await makeAxeBuilder()
        .disableRules(component.disableRules ?? [])
        .analyze();

      expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
    });

    test('component matches its expected accessibility tree', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');

      await gotoDialog(page, variant);

      await expect(page.locator(component.ariaRoot)).toMatchAriaSnapshot(`
        - dialog:
          ${variant === 'no-heading' ? '' : '- paragraph: Modal example'}
          - text: Textfield
          - textbox "Textfield":
            - /placeholder: Anything you want...
          - button "Cancel"
          - button "Submit"
      `);
    });

    test('component in dark mode has no WCAG 2.2 AA violations', async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme: 'dark' });

      await gotoDialog(page, variant);

      const results = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();

      await testInfo.attach('accessibility-scan-results', {
        body: JSON.stringify(results, null, 2),
        contentType: 'application/json',
      });

      expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
    });
  });
}
