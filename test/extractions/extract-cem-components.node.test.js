import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';

import {
  attributeKind,
  collectComponentData,
  fetchCEM,
  fetchResolvedVersion,
} from '../../deps/swc/extract-cem-components.js';

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

// Layer 1: every row carries `kind` + `values` so no consumer re-parses `type`.
describe('attributeKind', () => {
  it('classifies the four kinds SWC actually uses', () => {
    assert.equal(attributeKind('boolean', []), 'boolean');
    assert.equal(attributeKind('string', []), 'text');
    assert.equal(attributeKind('number', []), 'number');
    assert.equal(attributeKind('"s" | "m"', ['s', 'm']), 'enum');
    assert.equal(attributeKind('50 | 75', [50, 75]), 'enum');
  });

  it('classifies anything with values as an enum regardless of its type text', () => {
    assert.equal(attributeKind('StatusLightVariant', ['neutral', 'info']), 'enum');
  });

  // aria-haspopup / aria-expanded reach the CEM with no type at all. Guessing a kind
  // would build a control from nothing; the skip warning is the correct outcome.
  it('is "unknown" for a type the CEM never recorded', () => {
    assert.equal(attributeKind('', []), 'unknown');
    assert.equal(attributeKind(undefined, []), 'unknown');
  });

  it('is "unknown" for a type it cannot turn into a control', () => {
    assert.equal(attributeKind('(e: Event) => void', []), 'unknown');
    assert.equal(attributeKind('ReactNode', []), 'unknown');
  });

  // Nullish is stripped, never offered — "none" is a control-layer sentinel, so a
  // nullable primitive is just that primitive (swc-progress-circle.progress).
  it('sees through a nullable primitive', () => {
    assert.equal(attributeKind('number | null', []), 'number');
    assert.equal(attributeKind('string | undefined', []), 'text');
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
                  kind: 'unknown',
                  values: [],
                  optional: false,
                  default: "'primary'",
                  description: 'The visual variant of the button.',
                },
                {
                  name: 'disabled',
                  fieldName: 'disabled',
                  type: { text: 'boolean' },
                  kind: 'boolean',
                  values: [],
                  optional: false,
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
                  kind: 'unknown',
                  values: [],
                  optional: false,
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
        kind: 'unknown',
        values: [],
        optional: false,
        default: "'primary'",
        description: 'The visual variant of the button.',
        status: 'preview',
        since: '2.0.0',
      },
      {
        attribute: 'disabled',
        property: 'disabled',
        type: 'boolean',
        kind: 'boolean',
        values: [],
        optional: false,
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
                  kind: 'boolean',
                  values: [],
                  optional: false,
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
                  kind: 'boolean',
                  values: [],
                  optional: false,
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
        kind: 'boolean',
        values: [],
        optional: false,
        since: '0.0.1',
      },
    ]);
  });
});
