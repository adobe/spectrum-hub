import { navAreasFragment, sitenavIndex } from '../../a11y/mocks.js';
import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'sitenav',
  path: '/test/a11y/fixtures/sitenav.html',
  visualRoot: 'body',
  routes: [
    {
      url: '**/fragments/nav/site-nav',
      contentType: 'text/html',
      body: navAreasFragment,
    },
    {
      url: '**/query-index.json*',
      contentType: 'application/json',
      body: sitenavIndex,
    },
  ],
  prepare: async (page) => {
    const isMobile = (page.viewportSize()?.width ?? 0) < 900;
    if (isMobile) {
      await page.waitForSelector('.sitenav-trigger-btn');
      await page.click('.sitenav-trigger-btn');
    }
    await page.waitForSelector('#sitenav .level-1-list');
  },
});
