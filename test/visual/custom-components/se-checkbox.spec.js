import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'se-checkbox',
  path: '/test/a11y/fixtures/custom-components/se-checkbox.html',
  readySelector: 'se-checkbox input',
  visualRoot: '.test-container',
});
