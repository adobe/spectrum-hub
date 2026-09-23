import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'se-segmentedcontrol',
  path: '/test/a11y/fixtures/custom-components/se-segmentedcontrol.html',
  readySelector: 'se-segmentedcontrol .se-segmentedcontrol input[type="radio"]',
  visualRoot: '.test-container',
});
