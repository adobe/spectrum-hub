import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'se-select',
  path: '/test/a11y/fixtures/custom-components/se-select.html',
  readySelector: 'se-select select',
  visualRoot: '.test-container',
});
