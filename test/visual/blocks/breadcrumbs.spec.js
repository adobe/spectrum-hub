import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'breadcrumbs',
  path: '/test/a11y/fixtures/breadcrumbs.html',
  readySelector: '.breadcrumbs ol',
  visualRoot: '.breadcrumbs',
});
