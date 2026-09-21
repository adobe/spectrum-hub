import { statusIndex, statusTableQueryIndex, svgIcon } from '../../a11y/mocks.js';
import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'status-table',
  path: '/test/a11y/fixtures/status-table.html',
  readySelector: '.status-table-table',
  visualRoot: '.status-table',
  routes: [
    {
      url: '**/deps/status-index.json',
      contentType: 'application/json',
      body: statusIndex,
    },
    {
      url: '**/query-index.json*',
      contentType: 'application/json',
      body: statusTableQueryIndex,
    },
    {
      url: '**/*.svg',
      contentType: 'image/svg+xml',
      body: svgIcon,
    },
  ],
});
