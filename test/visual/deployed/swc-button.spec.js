import { test, expect } from '@playwright/test';
import { waitForStableCapture } from './deployed-test.js';

test.describe('deployed SWC Button page visual smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/web/swc/components/button');
    await page.locator('body.se-loaded').waitFor();
  });

  test('component detail shell matches its deployed baseline', async ({ page }) => {
    const detail = page.locator('main > .section:has(.page-hero h1#button)');
    await expect(detail.getByRole('heading', { name: 'Button', exact: true })).toBeVisible();
    await expect(detail.locator('.component-status-pill')).toHaveCount(2);
    await waitForStableCapture(detail);

    await expect(detail).toHaveScreenshot('swc-button-detail.png');
  });
});
