import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';

import { collectComponentData, fetchCEM, fetchResolvedVersion } from '../../deps/swc/extract-cem-components.js';

// fetchCEM/fetchResolvedVersion share the same unpkg-then-jsdelivr CDN fallback
// (fetchFromCdns) — real global.fetch is stubbed per test and restored after.
describe('CDN fallback (fetchCEM, fetchResolvedVersion)', () => {
  let originalFetch;
  beforeEach(() => { originalFetch = globalThis.fetch; });
  afterEach(() => { globalThis.fetch = originalFetch; });

  it('fetchCEM returns the first CDN\'s response when it succeeds', async () => {
    const cem = { modules: [] };
    globalThis.fetch = async (url) => {
      assert.match(url, /^https:\/\/unpkg\.com\/@adobe\/spectrum-wc@beta\/dist\/custom-elements\.json$/);
      return { ok: true, json: async () => cem };
    };
    assert.deepEqual(await fetchCEM(), cem);
  });

  it('fetchCEM falls back to the second CDN when the first fails', async () => {
    const cem = { modules: [] };
    const calledUrls = [];
    globalThis.fetch = async (url) => {
      calledUrls.push(url);
      if (url.includes('unpkg.com')) { return { ok: false }; }
      return { ok: true, json: async () => cem };
    };
    assert.deepEqual(await fetchCEM(), cem);
    assert.equal(calledUrls.length, 2);
    assert.match(calledUrls[1], /^https:\/\/cdn\.jsdelivr\.net\/npm\//);
  });

  it('fetchCEM throws when every CDN fails', async () => {
    globalThis.fetch = async () => { throw new Error('network down'); };
    await assert.rejects(fetchCEM(), /Failed to fetch CEM/);
  });

  it('fetchResolvedVersion returns the package.json version from the first working CDN', async () => {
    globalThis.fetch = async (url) => {
      assert.match(url, /\/package\.json$/);
      return { ok: true, json: async () => ({ version: '2.0.0-beta.2' }) };
    };
    assert.equal(await fetchResolvedVersion(), '2.0.0-beta.2');
  });

  it('fetchResolvedVersion throws when every CDN fails', async () => {
    globalThis.fetch = async () => ({ ok: false });
    await assert.rejects(fetchResolvedVersion(), /Failed to resolve the published version/);
  });
});

describe('collectComponentData', () => {
  it('filters one 2nd-gen CEM by tagName and formats declaration attributes', () => {
    const cem = {
      modules: [
        {
          declarations: [
            {
              name: 'Button',
              tagName: 'swc-button',
              status: 'preview',
              since: '2.0.0',
              attributes: [
                {
                  name: 'variant',
                  fieldName: 'variant',
                  type: { text: 'ButtonVariant' },
                  default: "'primary'",
                  description: 'The visual variant of the button.',
                },
                {
                  name: 'disabled',
                  fieldName: 'disabled',
                  type: { text: 'boolean' },
                  default: 'false',
                  description: 'Whether the button is disabled.',
                  inheritedFrom: {
                    name: 'ButtonBase',
                    module: '../core/components/button/Button.base.ts',
                  },
                },
              ],
              superclass: {
                name: 'ButtonBase',
                module: '@spectrum-web-components/core/components/button',
                package: '@spectrum-web-components/core',
              },
            },
            {
              name: 'Badge',
              tagName: 'swc-badge',
              attributes: [
                {
                  name: 'variant',
                  fieldName: 'variant',
                  type: { text: 'BadgeVariant' },
                },
              ],
            },
          ],
        },
      ],
    };

    const rows = collectComponentData(cem, 'swc-button');

    assert.deepEqual(rows, [
      {
        attribute: 'variant',
        property: 'variant',
        type: 'ButtonVariant',
        default: "'primary'",
        description: 'The visual variant of the button.',
        status: 'preview',
        since: '2.0.0',
      },
      {
        attribute: 'disabled',
        property: 'disabled',
        type: 'boolean',
        default: 'false',
        description: 'Whether the button is disabled.',
        inheritedFrom: 'ButtonBase',
        status: 'preview',
        since: '2.0.0',
      },
    ]);
  });

  it('uses the first tagName declaration when inherited base declarations share the tag', () => {
    const cem = {
      modules: [
        {
          declarations: [
            {
              name: 'ColorLoupe',
              tagName: 'swc-color-loupe',
              since: '0.0.1',
              attributes: [
                {
                  name: 'open',
                  fieldName: 'open',
                  type: { text: 'boolean' },
                },
              ],
            },
          ],
        },
        {
          declarations: [
            {
              name: 'ColorLoupeBase',
              tagName: 'swc-color-loupe',
              attributes: [
                {
                  name: 'open',
                  fieldName: 'open',
                  type: { text: 'boolean' },
                  inheritedFrom: { name: 'ColorLoupeBase' },
                },
              ],
            },
          ],
        },
      ],
    };

    assert.deepEqual(collectComponentData(cem, 'swc-color-loupe'), [
      {
        attribute: 'open',
        property: 'open',
        type: 'boolean',
        since: '0.0.1',
      },
    ]);
  });
});
