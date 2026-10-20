import { test } from './page-errors.js';

test('same-origin network failure fails the page contract', async ({ page, baseURL }) => {
  test.fail();

  const failedURL = new URL('/__page-contract-request-failure.png', baseURL).href;
  await page.route(failedURL, (route) => route.abort('failed'));
  await page.setContent(`<img src="${failedURL}" alt="">`);
});

test('known WebKit IMS CORS errors are ignored as a pair', async ({ page, baseURL }) => {
  const { origin } = new URL(baseURL);

  await page.setContent('<main></main>');
  await page.evaluate((pageOrigin) => {
    console.error(
      `Origin ${pageOrigin} is not allowed by Access-Control-Allow-Origin. Status code: 200`,
    );

    setTimeout(() => {
      const error = new Error(
        '/adobeid-na1.services.adobe.com/ims/check/v6/token?jslVersion=test '
        + 'due to access control checks.',
      );
      error.name = 'XMLHttpRequest cannot load https';
      throw error;
    });
  }, origin);
});
