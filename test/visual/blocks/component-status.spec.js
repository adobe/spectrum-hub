import { statusSlice } from '../../a11y/mocks.js';
import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'component-status',
  path: '/test/a11y/fixtures/component-status.html',
  readySelector: '.component-status-pill',
  visualRoot: '.component-status',
  routes: [
    {
      url: '**/deps/status/button.json',
      contentType: 'application/json',
      body: statusSlice,
    },
  ],
});
