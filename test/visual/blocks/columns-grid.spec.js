import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'columns-grid',
  path: '/test/a11y/fixtures/columns-grid.html',
  readySelector: '.grid-column',
  visualRoot: '.columns-wrapper',
});
