import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'se-textarea',
  path: '/test/a11y/fixtures/custom-components/se-textarea.html',
  readySelector: 'se-textarea textarea',
  visualRoot: '.test-container',
});
