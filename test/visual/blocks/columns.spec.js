import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'columns',
  path: '/test/a11y/fixtures/columns.html',
  readySelector: '.col-1',
  visualRoot: '.columns',
});
