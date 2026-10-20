import { statusSlice } from '../../a11y/mocks.js';
import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'page-hero',
  path: '/test/a11y/fixtures/page-hero.html',
  readySelector: '.component-status-pill',
  visualRoot: '.page-hero',
  routes: [
    {
      url: '**/deps/status/button.json',
      contentType: 'application/json',
      body: statusSlice,
    },
  ],
});
