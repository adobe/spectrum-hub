import { test as base, expect } from '@playwright/test';

/**
 * A page can compose every block it owns and still be broken underneath: an
 * uncaught exception, a `console.error`, or a missing asset. Those failures are
 * invisible to a locator assertion and are the ones most likely to differ
 * between Chromium, Firefox, and WebKit, so every page contract test gates on
 * them through this extended `page` fixture.
 */

// Every engine reports a failed subresource as a console error, with its own
// wording — and Firefox does not report it at all. Responses are checked
// instead: identical in all three engines, and the URL comes with them.
const RESOURCE_CONSOLE_ERROR = /Failed to load resource|the server responded with a status/i;

// Known defects this suite tolerates so it can gate on new breakage. Each entry
// states what is broken; delete it with the fix.
const ALLOWED_RESPONSES = [
  // The Pattern Library playground is authored for a `table-view` component,
  // but deps/rsp/playground/snippets/ ships table.jsx and no table-view.jsx.
  /\/deps\/rsp\/playground\/snippets\/table-view\.jsx$/,
];

const ALLOWED_CONSOLE_ERRORS = [];

// How long a page keeps reporting after its contract assertion passes.
const SETTLE_MS = Number(process.env.PLAYWRIGHT_SETTLE_MS ?? 2000);

const matches = (patterns, text) => patterns.some((pattern) => pattern.test(text));

export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    const { origin } = new URL(baseURL);
    const failures = [];

    page.on('pageerror', (error) => {
      failures.push(`uncaught ${error.name}: ${error.message}`);
    });

    page.on('console', (message) => {
      if (message.type() !== 'error') { return; }
      const text = message.text();
      if (RESOURCE_CONSOLE_ERROR.test(text)) { return; }
      if (matches(ALLOWED_CONSOLE_ERRORS, text)) { return; }
      failures.push(`console.error: ${text}`);
    });

    // Third-party origins fail for reasons this repository cannot fix, so only
    // the site's own assets gate the suite.
    page.on('response', (response) => {
      const url = response.url();
      if (response.status() < 400) { return; }
      if (!url.startsWith(origin)) { return; }
      if (matches(ALLOWED_RESPONSES, url)) { return; }
      failures.push(`${response.status()} ${url}`);
    });

    await use(page);

    // Blocks load lazily, so a failure can happen after the assertion that
    // ended the test body. Give the page a bounded chance to surface one
    // instead of tearing down the moment a locator resolves. This is a dwell,
    // not a quiet-network wait: it costs the same on every page.
    await page.waitForLoadState('load').catch(() => {});
    await page.waitForTimeout(SETTLE_MS);

    expect(failures, `${page.url()} reported page errors`).toEqual([]);
  },
});

export { expect };
