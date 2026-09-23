import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'action-button',
  path: '/test/a11y/fixtures/action-button.html',
  readySelector: 'button.action-button-primary',
  visualRoot: '.action-button',
});
