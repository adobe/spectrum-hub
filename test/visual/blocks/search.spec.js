import { navAreasFragment } from '../../a11y/mocks.js';
import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'search',
  path: '/test/a11y/fixtures/search.html',
  readySelector: 'sh-search .hit-title',
  visualRoot: 'sh-search',
  routes: [
    {
      url: '**/fragments/nav/site-nav',
      contentType: 'text/html',
      body: navAreasFragment,
    },
  ],
});
