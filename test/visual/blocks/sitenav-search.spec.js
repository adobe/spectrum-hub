import { navAreasFragment, sitenavIndex } from '../../a11y/mocks.js';
import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'sitenav-search',
  path: '/test/a11y/fixtures/sitenav-search.html',
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
    await page.getByRole('button', { name: 'Search', exact: true }).click();

    const searchInput = page.locator('sh-search se-input input');
    await searchInput.waitFor();
    await searchInput.press('ArrowDown');
    await searchInput.press('Enter');

    await page.locator(
      '.level-1-button[aria-controls="sitenav-menu-foundations"][aria-expanded="true"]',
    ).waitFor();
  },
});
