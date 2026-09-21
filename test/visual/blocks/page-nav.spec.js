import { test, expect } from '@playwright/test';
import { gotoFixture } from '../../playwright/fixture.js';

const name = 'page-nav';

test(`${name} matches its visual baseline`, async ({ page }) => {
  const viewport = page.viewportSize();
  const isMobile = viewport.width < 1200;

  if (isMobile) {
    await page.setViewportSize({ width: 1200, height: viewport.height });
  }

  await gotoFixture(page, {
    path: '/test/a11y/fixtures/page-nav.html',
    readySelector: {
      selector: 'nav.page-nav',
      state: 'attached',
    },
  });
  const nav = page.locator('nav.page-nav');

  if (isMobile) {
    await page.setViewportSize(viewport);
    await expect(nav).toBeHidden();
    await page.evaluate(async () => document.fonts.ready);
    await expect(page).toHaveScreenshot(`${name}.png`, {
      clip: {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      },
    });
    return;
  }

  await expect(nav).toBeVisible();
  await page.evaluate(async () => document.fonts.ready);
  await expect(nav).toHaveScreenshot(`${name}.png`);
});
