import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'table',
  path: '/test/a11y/fixtures/table.html',
  readySelector: '.table table',
  visualRoot: '.table',
});
