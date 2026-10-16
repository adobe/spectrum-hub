import { imsScriptSignedIn, ioProfile } from '../../a11y/mocks.js';
import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'profile-signed-in',
  path: '/test/a11y/fixtures/profile-signed-in.html',
  readySelector: 'se-profile #avatar-button',
  visualRoot: 'se-profile',
  routes: [
    {
      url: 'https://auth.services.adobe.com/imslib/imslib.min.js',
      contentType: 'application/javascript',
      body: imsScriptSignedIn,
    },
    {
      url: 'https://cc-collab-stage.adobe.io/profile',
      contentType: 'application/json',
      body: ioProfile,
    },
  ],
});
