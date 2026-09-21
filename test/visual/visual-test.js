import { test, expect } from '@playwright/test';
import { gotoFixture } from '../playwright/fixture.js';

export function normalizeVisualCase(config) {
  const missing = ['name', 'path', 'visualRoot'].filter((key) => !config[key]);
  if (missing.length) {
    throw new Error(`${config.name ?? 'Visual case'} requires ${missing.join(', ')}`);
  }

  return {
    name: config.name,
    path: config.path,
    readySelector: config.readySelector,
    routes: config.routes ?? [],
    visualRoot: config.visualRoot,
    prepare: config.prepare,
    screenshotOptions: config.screenshotOptions ?? {},
  };
}

async function waitForVisualAssets(locator) {
  await locator.page().evaluate(async () => document.fonts.ready);
  await locator.evaluate(async (root) => {
    const images = [...root.querySelectorAll('img')];
    await Promise.all(images.map((image) => {
      if (image.complete) {
        return image.decode().catch(() => {});
      }
      return new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }));
  });
}

export function defineVisualFixture(input) {
  const visualCase = normalizeVisualCase(input);

  test(`${visualCase.name} matches its visual baseline`, async ({ page }) => {
    await gotoFixture(page, visualCase);
    if (visualCase.prepare) {
      await visualCase.prepare(page);
    }

    const root = page.locator(visualCase.visualRoot);
    await expect(root).toBeVisible();
    await waitForVisualAssets(root);
    await expect(root).toHaveScreenshot(
      `${visualCase.name}.png`,
      visualCase.screenshotOptions,
    );
  });
}
