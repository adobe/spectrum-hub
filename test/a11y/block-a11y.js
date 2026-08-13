// Shared utilities for per-block a11y spec files (test/a11y/blocks/<name>.spec.js).

export function formatViolations(violations) {
  return violations
    .map(({ id, impact, description, nodes }) =>
      `[${impact}] ${id}: ${description}\n${nodes.map((n) => `  ${n.html}`).join('\n')}`)
    .join('\n\n');
}

export async function gotoBlock(page, { path: blockPath, readySelector, routes = [] }) {
  for (const { url, contentType, body } of routes) {
    await page.route(url, (r) => r.fulfill({ contentType, body }));
  }

  await page.goto(blockPath);

  if (typeof readySelector === 'string') {
    await page.waitForSelector(readySelector);
  } else if (readySelector?.selector) {
    await page.waitForSelector(readySelector.selector, { state: readySelector.state });
  } else {
    await page.waitForLoadState('networkidle');
  }
}
