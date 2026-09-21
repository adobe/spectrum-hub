import {
  playgroundComponentsSheet, playgroundControlsSheet, playgroundRspProps, playgroundSwcProps,
} from '../../a11y/mocks.js';
import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'playground',
  path: '/test/a11y/fixtures/playground.html',
  readySelector: '.playground-layout',
  visualRoot: '.playground',
  routes: [
    {
      url: '**/playground-data.json?sheet=components',
      contentType: 'application/json',
      body: playgroundComponentsSheet,
    },
    {
      url: '**/playground-data.json?sheet=controls',
      contentType: 'application/json',
      body: playgroundControlsSheet,
    },
    {
      url: '**/deps/rsp/data/Button.json',
      contentType: 'application/json',
      body: playgroundRspProps,
    },
    {
      url: '**/deps/swc/data/swc-button.json',
      contentType: 'application/json',
      body: playgroundSwcProps,
    },
    {
      url: '**/deps/swc/playground/index.html**',
      contentType: 'text/html',
      body: '<html><body></body></html>',
    },
  ],
});
