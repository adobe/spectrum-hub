import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'se-switch',
  path: '/test/a11y/fixtures/custom-components/se-switch.html',
  readySelector: 'se-switch input',
  visualRoot: '.test-container',
});
