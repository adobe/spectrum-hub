import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  S2_DOCS_BASE,
  fetchComponentDocStatus,
  parseStatusFromHtml,
  parseStatusFromMdx,
  s2MdxUrl,
} from '../../deps/rsp/extract-doc-status.js';

describe('parseStatusFromMdx', () => {
  it('returns prerelease when export const version is set', () => {
    const mdx = "export const version = 'rc';\n# Autocomplete\n";
    assert.equal(parseStatusFromMdx(mdx), 'rc');
  });

  it('returns stable when no version export exists', () => {
    assert.equal(parseStatusFromMdx('# Button\n'), 'stable');
  });
});

describe('parseStatusFromHtml', () => {
  it('returns prerelease when the docs badge is present', () => {
    assert.equal(parseStatusFromHtml('<span>rc</span>'), 'rc');
    assert.equal(parseStatusFromHtml('>alpha<'), 'alpha');
  });

  it('returns stable when no badge is present', () => {
    assert.equal(parseStatusFromHtml('<h1>Button</h1>'), 'stable');
  });
});

describe('fetchComponentDocStatus', () => {
  /** @type {typeof fetch} */
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  /**
   * @param {Record<string, { status: number, body: string }>} routes
   */
  function mockFetch(routes) {
    globalThis.fetch = async (input) => {
      const url = String(input);
      const route = routes[url];
      if (!route) {
        return { ok: false, status: 404, text: async () => '' };
      }
      return {
        ok: route.status >= 200 && route.status < 300,
        status: route.status,
        text: async () => route.body,
      };
    };
  }

  it('reads status from the published S2 HTML doc', async () => {
    mockFetch({
      [`${S2_DOCS_BASE}/Button.html`]: {
        status: 200,
        body: '<h1>Button</h1>',
      },
    });

    assert.equal(await fetchComponentDocStatus('Button'), 'stable');
  });

  it('detects prerelease badges in HTML', async () => {
    mockFetch({
      [`${S2_DOCS_BASE}/Toast.html`]: {
        status: 200,
        body: '<h1>Toast</h1>>alpha<',
      },
    });

    assert.equal(await fetchComponentDocStatus('Toast'), 'alpha');
  });

  it('falls back to MDX on jsDelivr when HTML returns 404', async () => {
    const mdxUrl = s2MdxUrl('FutureComponent');
    mockFetch({
      [`${S2_DOCS_BASE}/FutureComponent.html`]: { status: 404, body: '' },
      [mdxUrl]: {
        status: 200,
        body: "export const version = 'beta';\n# FutureComponent\n",
      },
    });

    assert.equal(await fetchComponentDocStatus('FutureComponent'), 'beta');
  });

  it('returns null when neither HTML nor MDX is available', async () => {
    mockFetch({
      [`${S2_DOCS_BASE}/Missing.html`]: { status: 404, body: '' },
      [s2MdxUrl('Missing')]: { status: 404, body: '' },
    });

    assert.equal(await fetchComponentDocStatus('Missing'), null);
  });

  it('returns null when HTML fails with a non-404 error', async () => {
    mockFetch({
      [`${S2_DOCS_BASE}/Button.html`]: { status: 503, body: 'unavailable' },
    });

    assert.equal(await fetchComponentDocStatus('Button'), null);
  });
});
