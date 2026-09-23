import { youtubeEmbed } from '../../a11y/mocks.js';
import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'youtube',
  path: '/test/a11y/fixtures/youtube.html',
  readySelector: 'iframe',
  visualRoot: '.video',
  routes: [
    {
      url: 'https://www.youtube-nocookie.com/**',
      contentType: 'text/html',
      body: youtubeEmbed,
    },
  ],
});
