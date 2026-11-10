import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './axe-test.js';

// TODO: these are current skipped right now because aem.page (the proxy) is gated
test.describe('homepage', () => {
  test.skip('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test.skip('should not have any automatically detectable WCAG 2.2 A or AA violations', async ({ page, makeAxeBuilder }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await makeAxeBuilder().analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
