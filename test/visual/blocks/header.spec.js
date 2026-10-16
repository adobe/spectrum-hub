import { headerFragment } from '../../a11y/mocks.js';
import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'header',
  path: '/test/a11y/fixtures/header.html',
  readySelector: '.skip-link',
  visualRoot: 'header',
  routes: [
    {
      url: '**/fragments/nav/header',
      contentType: 'text/html',
      body: headerFragment,
    },
  ],
});
