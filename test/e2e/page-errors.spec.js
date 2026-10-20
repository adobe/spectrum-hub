import { test } from './page-errors.js';

test('same-origin network failure fails the page contract', async ({ page, baseURL }) => {
  test.fail();

  const failedURL = new URL('/__page-contract-request-failure.png', baseURL).href;
  await page.route(failedURL, (route) => route.abort('failed'));
  await page.setContent(`<img src="${failedURL}" alt="">`);
});
