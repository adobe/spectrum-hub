import { imsScript } from '../../a11y/mocks.js';
import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'profile',
  path: '/test/a11y/fixtures/profile.html',
  readySelector: 'se-profile se-button',
  visualRoot: 'se-profile',
  routes: [
    {
      url: 'https://auth.services.adobe.com/imslib/imslib.min.js',
      contentType: 'application/javascript',
      body: imsScript,
    },
  ],
});
