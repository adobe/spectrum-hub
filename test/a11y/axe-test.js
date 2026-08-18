import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// A consistently-configured AxeBuilder factory, shared across spec files.
export const test = base.extend({
  makeAxeBuilder: async ({ page }, use) => {
    const makeAxeBuilder = () => new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa']);

    await use(makeAxeBuilder);
  },
});

export { expect };
