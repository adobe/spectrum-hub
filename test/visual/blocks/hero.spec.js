import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'hero',
  path: '/test/a11y/fixtures/hero.html',
  readySelector: '.hero-foreground',
  visualRoot: '.hero',
});
