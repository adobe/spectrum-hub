import { footerFragment } from '../../a11y/mocks.js';
import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'footer',
  path: '/test/a11y/fixtures/footer.html',
  readySelector: '.footer-content',
  visualRoot: '.footer',
  routes: [
    {
      url: '**/fragments/nav/footer',
      contentType: 'text/html',
      body: footerFragment,
    },
  ],
});
