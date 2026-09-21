import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'card',
  path: '/test/a11y/fixtures/card.html',
  readySelector: '.card-content-container',
  visualRoot: '.card',
});
