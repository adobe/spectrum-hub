import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';

import {
  applyResolvedTypes,
  attributeKind,
  collectComponentData,
  findDeclarationAndModule,
  fetchCEM,
  fetchResolvedVersion,
  resolveAllAttributeTypes,
} from '../../deps/swc/extract-cem-components.js';
import { cdnUrlsForCanonicalPath, clearManifestCache } from '../../deps/swc/cdn-resolve.js';

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

// The merge that writes resolution results back onto the formatted rows. Previously
// inline in main(), so untestable — a row silently keeping its bare alias would only
// show up as a missing control in a browser.
describe('applyResolvedTypes', () => {
  const rows = () => ([
    { attribute: 'variant', type: 'ButtonVariant', kind: 'unknown', values: [], optional: false },
    { attribute: 'disabled', type: 'boolean', kind: 'boolean', values: [], optional: false },
  ]);

  it('writes type, values and a recomputed kind for a resolved row', () => {
    const out = rows();
    applyResolvedTypes(out, new Map([
      ['swc-button::variant', { type: '"primary" | "accent"', values: ['primary', 'accent'], optional: true }],
    ]), 'swc-button');
    assert.deepEqual(out[0], {
      attribute: 'variant', type: '"primary" | "accent"', kind: 'enum', values: ['primary', 'accent'], optional: true,
    });
  });

  it('leaves a row untouched when resolution produced nothing for it', () => {
    const out = rows();
    applyResolvedTypes(out, new Map(), 'swc-button');
    assert.deepEqual(out, rows());
  });

  it('keys by tag so one component cannot pick up another\'s resolution', () => {
    const out = rows();
    applyResolvedTypes(out, new Map([
      ['swc-badge::variant', { type: '"neutral"', values: ['neutral'], optional: false }],
    ]), 'swc-button');
    assert.deepEqual(out, rows());
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

describe('findDeclarationAndModule', () => {
  const cem = {
    modules: [
      {
        path: 'components/button/Button.ts',
        declarations: [{ name: 'Button', tagName: 'swc-button', attributes: [] }],
      },
    ],
  };

  it('returns the declaration and its containing module\'s path', () => {
    const found = findDeclarationAndModule(cem, 'swc-button');
    assert.equal(found.modPath, 'components/button/Button.ts');
    assert.equal(found.decl.name, 'Button');
  });

  it('returns null for a tag not present in any module', () => {
    assert.equal(findDeclarationAndModule(cem, 'swc-nonexistent'), null);
  });
});

// resolveAllAttributeTypes wires findDeclarationAndModule + collectResolutionTargets +
// resolveTargets together across every allow-listed component in one pass — these tests
// cover that wiring itself, not the resolution logic each piece already has its own
// dedicated tests for (resolve-attribute-types.node.test.js, swc-cdn-resolve.node.test.js).
describe('resolveAllAttributeTypes', () => {
  let originalFetch;
  let originalWarn;
  let warnings;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalWarn = console.warn;
    warnings = [];
    // eslint-disable-next-line no-console
    console.warn = (message) => warnings.push(message);
    // resolveSpecifier's manifest cache is module-level — clear it so one test's
    // mocked manifest for a given package+version can't leak into another's.
    clearManifestCache();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    // eslint-disable-next-line no-console
    console.warn = originalWarn;
  });

  // Values may be a manifest object (package.json responses, read via .json()) or a
  // plain string (crawled .d.ts file contents, read via .text() — see ts-cdn-host.js).
  function mockCdnFetch(responsesByCanonicalPath) {
    const urlToValue = new Map();
    for (const [canonicalPath, value] of Object.entries(responsesByCanonicalPath)) {
      for (const url of cdnUrlsForCanonicalPath(canonicalPath)) {
        urlToValue.set(url, value);
      }
    }
    return async (url) => {
      const value = urlToValue.get(url);
      return {
        ok: value !== undefined,
        status: value !== undefined ? 200 : 404,
        json: async () => value,
        text: async () => (typeof value === 'string' ? value : ''),
      };
    };
  }

  it('warns and returns an empty map when the core peer dependency cannot be found', async () => {
    globalThis.fetch = mockCdnFetch({
      '@adobe/spectrum-wc::2.0.0-beta.2/package.json': {
        name: '@adobe/spectrum-wc',
        dependencies: { lit: '^3.1.3' },
      },
    });

    const resolved = await resolveAllAttributeTypes({ modules: [] }, '2.0.0-beta.2');

    assert.equal(resolved.size, 0);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /couldn't find.*core peer dependency/);
  });

  it('finds no resolvable targets and returns an empty map without crawling anything, '
    + 'for a component whose types are already primitives', async () => {
    globalThis.fetch = mockCdnFetch({
      '@adobe/spectrum-wc::2.0.0-beta.2/package.json': {
        name: '@adobe/spectrum-wc',
        version: '2.0.0-beta.2',
        dependencies: { '@adobe/spectrum-wc-core': '2.0.0-beta.2' },
      },
      '@adobe/spectrum-wc-core::2.0.0-beta.2/package.json': {
        name: '@adobe/spectrum-wc-core',
        version: '2.0.0-beta.2',
      },
    });
    const cem = {
      modules: [{
        path: 'components/button/Button.ts',
        declarations: [{
          name: 'Button',
          tagName: 'swc-button',
          attributes: [{ name: 'disabled', fieldName: 'disabled', type: { text: 'boolean' } }],
        }],
      }],
    };

    const resolved = await resolveAllAttributeTypes(cem, '2.0.0-beta.2');

    assert.equal(resolved.size, 0);
    assert.equal(warnings.length, 0);
  });

  it('resolves a real bare-alias target end to end through the shared crawl', async () => {
    const buttonEntryPath = '@adobe/spectrum-wc::2.0.0-beta.2/dist/components/button/Button.d.ts';
    globalThis.fetch = mockCdnFetch({
      '@adobe/spectrum-wc::2.0.0-beta.2/package.json': {
        name: '@adobe/spectrum-wc',
        version: '2.0.0-beta.2',
        dependencies: { '@adobe/spectrum-wc-core': '2.0.0-beta.2' },
      },
      '@adobe/spectrum-wc-core::2.0.0-beta.2/package.json': {
        name: '@adobe/spectrum-wc-core',
        version: '2.0.0-beta.2',
      },
      [buttonEntryPath]: [
        'export type ButtonVariant = "primary" | "secondary";',
        'export declare class Button { variant: ButtonVariant; }',
      ].join('\n'),
    });
    const cem = {
      modules: [{
        path: 'components/button/Button.ts',
        declarations: [{
          name: 'Button',
          tagName: 'swc-button',
          attributes: [{ name: 'variant', fieldName: 'variant', type: { text: 'ButtonVariant' } }],
        }],
      }],
    };

    const resolved = await resolveAllAttributeTypes(cem, '2.0.0-beta.2');

    assert.deepEqual(resolved.get('swc-button::variant'), {
      type: '"primary" | "secondary"',
      values: ['primary', 'secondary'],
      optional: false,
    });
  });
});
