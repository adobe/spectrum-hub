import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'se-button',
  path: '/test/a11y/fixtures/custom-components/se-button.html',
  readySelector: 'se-button button',
  visualRoot: '.test-container',
});
