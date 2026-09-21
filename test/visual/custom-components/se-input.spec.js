import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'se-input',
  path: '/test/a11y/fixtures/custom-components/se-input.html',
  readySelector: 'se-input input',
  visualRoot: '.test-container',
});
