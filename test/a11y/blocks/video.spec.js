import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';

// 1x1 transparent GIF, so the mocked poster still decodes as an image.
const PIXEL = Buffer.from(
  'R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
  'base64',
);

const block = {
  name: 'video',
  path: '/test/a11y/fixtures/video.html',
  // The block builds a poster facade; the player only appears after a click.
  readySelector: '.video-poster',
  routes: [
    // Keep CI off the YouTube image CDN and oEmbed endpoint.
    { url: 'https://img.youtube.com/**', contentType: 'image/gif', body: PIXEL },
    {
      url: 'https://www.youtube.com/oembed**',
      contentType: 'application/json',
      body: JSON.stringify({ title: 'Getting started with Author Kit' }),
    },
    {
      url: 'https://www.youtube-nocookie.com/**',
      contentType: 'text/html',
      body: '<html lang="en"><body></body></html>',
    },
    // Adobe Video Publishing Cloud: the poster frame, oEmbed, and the player.
    { url: /^https:\/\/video\.tv\.adobe\.com\/v\/[^/?]+\?format=jpeg$/, contentType: 'image/gif', body: PIXEL },
    {
      url: 'https://video.tv.adobe.com/oembed**',
      contentType: 'application/json',
      body: JSON.stringify({
        title: 'Spectrum 2 in five minutes',
        thumbnail_url: 'https://images-tv.adobe.com/mpcv3/1234/poster.jpg',
      }),
    },
    { url: 'https://images-tv.adobe.com/**', contentType: 'image/gif', body: PIXEL },
    {
      url: /^https:\/\/video\.tv\.adobe\.com\/v\/[^/?]+\/\?/,
      contentType: 'text/html',
      body: '<html lang="en"><body></body></html>',
    },
  ],
};

test(`${block.name} block in light/default mode has no WCAG 2.2 AA violations`, async ({ page, makeAxeBuilder }) => {
  await gotoBlock(page, block);

  const results = await makeAxeBuilder()
    .disableRules(block.disableRules ?? [])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${block.name} block matches its expected accessibility tree`, async ({ page }, testInfo) => {
  // Mobile Chrome also runs on the Chromium engine, so `browserName` alone can't isolate a
  // single run — check the project by name to actually run this once, not twice.
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');

  await gotoBlock(page, block);

  // The whole node is single quoted: a bare colon inside the button name
  // would otherwise read as a YAML mapping key.
  await expect(page.locator('.table-authored .video')).toMatchAriaSnapshot(`
    - 'button "Play video: Author Kit in five minutes"'
    - group:
      - text: View transcript
  `);
});

test(`${block.name} block swaps the poster for a titled player on activation`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Player swap is engine-agnostic; only the chromium project needs to run it');

  await gotoBlock(page, block);

  await page.locator('.table-authored .video-poster').click();

  const player = page.locator('.table-authored .video-player iframe');
  await expect(player).toHaveAttribute('title', 'Author Kit in five minutes');
  await expect(page.locator('.table-authored [role="status"]')).toHaveText('Video player loaded');
});

test(`${block.name} block plays an Adobe Video Publishing Cloud video`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Provider wiring is engine-agnostic; only the chromium project needs to run it');

  await gotoBlock(page, block);

  const adobe = page.locator('.adobe-authored');
  // The oEmbed thumbnail replaces the small default frame.
  await expect(adobe.locator('.video-media img'))
    .toHaveAttribute('src', 'https://images-tv.adobe.com/mpcv3/1234/poster.jpg');

  await adobe.locator('.video-poster').click();

  const player = adobe.locator('.video-player iframe');
  await expect(player).toHaveAttribute('title', 'Spectrum 2 in five minutes');
  const src = new URL(await player.getAttribute('src'));
  expect(src.origin).toBe('https://video.tv.adobe.com');
  expect(src.searchParams.get('learn')).toBe('on');
  expect(src.searchParams.get('autoplay')).toBe('1');
});

test(`${block.name} block in dark mode has no WCAG 2.2 AA violations`, async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });

  await gotoBlock(page, block);

  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();

  await testInfo.attach('accessibility-scan-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});
