import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'banner',
  path: '/test/a11y/fixtures/banner.html',
  readySelector: '.banner .se-button',
  visualRoot: '.banner',
});
