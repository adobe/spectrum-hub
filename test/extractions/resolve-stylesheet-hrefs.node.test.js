import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveStylesheetHrefs } from '../../deps/rsp/playground/resolve-stylesheet-hrefs.js';

// A previewed RSP component (e.g. ActionButton) internally composes other
// private sub-components (e.g. ProgressCircle for its pending spinner) whose
// CSS — including @keyframes the spinner animation needs — lives in its OWN
// separate per-component stylesheet, never the top-level component's. There is
// no single published "all styles" bundle, so loading just `<ExportName>.css`
// silently drops any nested sub-component's styles (confirmed against the
// real package: ProgressCircle.css holds the exact keyframes ActionButton's
// spinner references but never gets loaded). The fix loads every private CSS
// file the package ships, discovered from its real file listing, so this
// can't happen for any current or future component.
describe('resolveStylesheetHrefs', () => {
  const PKG = '@react-spectrum/s2';
  const VERSION = '1.5.1';
  const BASE = `https://esm.sh/${PKG}@${VERSION}`;

  it('loads every private .css file from the package listing, plus page.css', () => {
    const files = [
      '/page.css',
      '/dist/private/ActionButton.css',
      '/dist/private/ProgressCircle.css',
      '/dist/exports/ActionButton.mjs',
      '/dist/private/ActionButton.css.map',
    ];
    const hrefs = resolveStylesheetHrefs(PKG, VERSION, 'ActionButton', files);
    assert.ok(hrefs.includes(`${BASE}/page.css`));
    assert.ok(hrefs.includes(`${BASE}/dist/private/ActionButton.css`));
    assert.ok(hrefs.includes(`${BASE}/dist/private/ProgressCircle.css`));
  });

  it('excludes non-css files like .mjs and .css.map', () => {
    const files = [
      '/page.css',
      '/dist/private/ActionButton.css',
      '/dist/exports/ActionButton.mjs',
      '/dist/private/ActionButton.css.map',
    ];
    const hrefs = resolveStylesheetHrefs(PKG, VERSION, 'ActionButton', files);
    assert.ok(!hrefs.some((h) => h.endsWith('.mjs')));
    assert.ok(!hrefs.some((h) => h.endsWith('.css.map')));
  });

  it('orders page.css first regardless of listing order', () => {
    const files = ['/dist/private/ActionButton.css', '/page.css'];
    const hrefs = resolveStylesheetHrefs(PKG, VERSION, 'ActionButton', files);
    assert.equal(hrefs[0], `${BASE}/page.css`);
  });

  it('does not duplicate a css path that appears twice in the listing', () => {
    const files = ['/page.css', '/page.css'];
    const hrefs = resolveStylesheetHrefs(PKG, VERSION, 'ActionButton', files);
    assert.equal(hrefs.filter((h) => h === `${BASE}/page.css`).length, 1);
  });

  it('falls back to just page.css and the requested component\'s own CSS when no file listing is available', () => {
    const hrefs = resolveStylesheetHrefs(PKG, VERSION, 'ActionButton', null);
    assert.deepEqual(hrefs, [
      `${BASE}/page.css`,
      `${BASE}/dist/private/ActionButton.css`,
    ]);
  });

  it('falls back the same way for an empty file listing', () => {
    const hrefs = resolveStylesheetHrefs(PKG, VERSION, 'ActionButton', []);
    assert.deepEqual(hrefs, [
      `${BASE}/page.css`,
      `${BASE}/dist/private/ActionButton.css`,
    ]);
  });
});
