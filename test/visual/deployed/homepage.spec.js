import { test, expect } from '@playwright/test';
import { waitForStableCapture } from './deployed-test.js';

test.describe('deployed homepage visual smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('body.se-loaded').waitFor();
  });

  test('lead content matches its deployed baseline', async ({ page }) => {
    const leadContent = page.locator('main > .section:has(h1#start-with-spectrum)');
    await expect(leadContent.getByRole('heading', { name: 'Start with Spectrum' })).toBeVisible();
    await waitForStableCapture(leadContent);

    await expect(leadContent).toHaveScreenshot('homepage.png');
  });
});
