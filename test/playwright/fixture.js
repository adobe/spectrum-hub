export async function gotoFixture(page, { path, readySelector, routes = [] }) {
  for (const { url, contentType, body } of routes) {
    await page.route(url, (route) => route.fulfill({ contentType, body }));
  }

  await page.goto(path);

  if (typeof readySelector === 'string') {
    await page.waitForSelector(readySelector);
  } else if (readySelector?.selector) {
    await page.waitForSelector(readySelector.selector, { state: readySelector.state });
  } else {
    await page.waitForLoadState('networkidle');
  }
}
