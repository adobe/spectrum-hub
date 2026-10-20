import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'media',
  path: '/test/a11y/fixtures/media.html',
  readySelector: '.media[style]',
  visualRoot: '.media',
});
