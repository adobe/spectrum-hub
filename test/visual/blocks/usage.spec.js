import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'usage',
  path: '/test/a11y/fixtures/usage.html',
  readySelector: '.usage-panel',
  visualRoot: '.usage',
});
