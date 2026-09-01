import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import {
  resolveSpecifier,
  cdnUrlsForCanonicalPath,
  componentEntryPath,
  rebaseInheritedModule,
  findCorePackageName,
  makeCanonicalPath,
  clearManifestCache,
  fetchManifest,
} from '../../deps/swc/locate-published-files.js';

// resolveSpecifier's manifest cache is module-level (shared across a whole
// extraction run by design) — clear it between tests so one test's mocked
// manifest for a given package+version can't leak into another's.
beforeEach(() => clearManifestCache());

// A fetchImpl stand-in that serves a fixed package.json for known "name@version" keys
// (matching the unpkg URL shape this module builds) and 404s otherwise.
function makeMockFetch(manifestsByPackageAtVersion) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const match = url.match(/^https:\/\/unpkg\.com\/(.+)\/package\.json$/);
    const manifest = match && manifestsByPackageAtVersion[match[1]];
    return {
      ok: Boolean(manifest),
      status: manifest ? 200 : 404,
      json: async () => manifest,
    };
  };
  return { fetchImpl, calls };
}

describe('makeCanonicalPath / resolveSpecifier — relative imports', () => {
  it('resolves a sibling relative import within the same package+version', async () => {
    const from = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.d.ts');
    const resolved = await resolveSpecifier('./Button.base', from);
    assert.equal(resolved, makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.base.d.ts'));
  });

  it('resolves a parent-directory relative import, e.g. mixins reaching the shared element base', async () => {
    const from = makeCanonicalPath('@adobe/spectrum-wc-core', '2.0.0-beta.2', 'dist/components/button/Button.base.d.ts');
    const resolved = await resolveSpecifier('../../element/index.js', from);
    assert.equal(resolved, makeCanonicalPath('@adobe/spectrum-wc-core', '2.0.0-beta.2', 'dist/element/index.d.ts'));
  });

  it('splits a scoped package name correctly rather than at the first "/" (regression: the '
    + 'first "/" in a scoped canonical path is inside the package name itself)', async () => {
    const from = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/a/b/c.d.ts');
    const resolved = await resolveSpecifier('./d', from);
    assert.equal(resolved, makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/a/b/d.d.ts'));
  });
});

describe('resolveSpecifier — bare package imports', () => {
  it('resolves a bare specifier to a dependency package via its own exports map', async () => {
    const { fetchImpl } = makeMockFetch({
      '@adobe/spectrum-wc@2.0.0-beta.2': {
        name: '@adobe/spectrum-wc',
        version: '2.0.0-beta.2',
        dependencies: { '@adobe/spectrum-wc-core': '2.0.0-beta.2' },
      },
      '@adobe/spectrum-wc-core@2.0.0-beta.2': {
        name: '@adobe/spectrum-wc-core',
        version: '2.0.0-beta.2',
        exports: { './components/button': { types: './dist/components/button/index.d.ts' } },
      },
    });
    const from = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.d.ts');
    const resolved = await resolveSpecifier('@adobe/spectrum-wc-core/components/button', from, { fetchImpl });
    assert.equal(resolved, makeCanonicalPath('@adobe/spectrum-wc-core', '2.0.0-beta.2', 'dist/components/button/index.d.ts'));
  });

  it('resolves a semver-range dependency to its concrete published version', async () => {
    const { fetchImpl } = makeMockFetch({
      '@adobe/spectrum-wc@2.0.0-beta.2': {
        name: '@adobe/spectrum-wc',
        version: '2.0.0-beta.2',
        dependencies: { lit: '^3.1.3' },
      },
      'lit@^3.1.3': {
        name: 'lit',
        version: '3.3.3',
        exports: { '.': { types: './development/index.d.ts' } },
      },
    });
    const from = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.d.ts');
    const resolved = await resolveSpecifier('lit', from, { fetchImpl });
    assert.equal(resolved, makeCanonicalPath('lit', '3.3.3', 'development/index.d.ts'));
  });

  it('resolves a self-referencing bare specifier (same package as the importing file)', async () => {
    const { fetchImpl } = makeMockFetch({
      '@adobe/spectrum-wc-core@2.0.0-beta.2': {
        name: '@adobe/spectrum-wc-core',
        exports: { './mixins': { types: './dist/mixins/index.d.ts' } },
      },
    });
    const from = makeCanonicalPath('@adobe/spectrum-wc-core', '2.0.0-beta.2', 'dist/components/button/Button.base.d.ts');
    const resolved = await resolveSpecifier('@adobe/spectrum-wc-core/mixins', from, { fetchImpl });
    assert.equal(resolved, makeCanonicalPath('@adobe/spectrum-wc-core', '2.0.0-beta.2', 'dist/mixins/index.d.ts'));
  });

  it('returns null for a bare specifier the importing package does not declare as a dependency', async () => {
    const { fetchImpl } = makeMockFetch({
      '@adobe/spectrum-wc@2.0.0-beta.2': {
        name: '@adobe/spectrum-wc',
        dependencies: { lit: '^3.1.3' },
      },
    });
    const from = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.d.ts');
    assert.equal(await resolveSpecifier('some-unrelated-package', from, { fetchImpl }), null);
  });

  it('returns null when the target package has no matching exports-map entry', async () => {
    const { fetchImpl } = makeMockFetch({
      '@adobe/spectrum-wc@2.0.0-beta.2': {
        name: '@adobe/spectrum-wc',
        dependencies: { '@adobe/spectrum-wc-core': '2.0.0-beta.2' },
      },
      '@adobe/spectrum-wc-core@2.0.0-beta.2': {
        name: '@adobe/spectrum-wc-core',
        exports: { './components/button': { types: './dist/components/button/index.d.ts' } },
      },
    });
    const from = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.d.ts');
    assert.equal(await resolveSpecifier('@adobe/spectrum-wc-core/components/nonexistent', from, { fetchImpl }), null);
  });

  it('resolves through a nested conditions object (e.g. import: { node: ..., default: ... })', async () => {
    const { fetchImpl } = makeMockFetch({
      '@adobe/spectrum-wc@2.0.0-beta.2': {
        name: '@adobe/spectrum-wc',
        dependencies: { 'lit-html': '3.3.3' },
      },
      'lit-html@3.3.3': {
        name: 'lit-html',
        version: '3.3.3',
        exports: { '.': { import: { node: './node/index.js', default: './development/lit-html.js' } } },
      },
    });
    const from = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.d.ts');
    const resolved = await resolveSpecifier('lit-html', from, { fetchImpl });
    // First-string-leaf, in object-key order — "node" wins over "default" here, and the
    // point under test is that a nested (non-string) condition value doesn't throw.
    assert.equal(resolved, makeCanonicalPath('lit-html', '3.3.3', 'node/index.d.ts'));
  });

  it('caches a manifest fetch — the same package+version is only fetched once', async () => {
    const { fetchImpl, calls } = makeMockFetch({
      '@adobe/spectrum-wc@2.0.0-beta.2': {
        name: '@adobe/spectrum-wc',
        dependencies: { '@adobe/spectrum-wc-core': '2.0.0-beta.2' },
      },
      '@adobe/spectrum-wc-core@2.0.0-beta.2': {
        name: '@adobe/spectrum-wc-core',
        exports: {
          './components/button': { types: './dist/components/button/index.d.ts' },
          './mixins': { types: './dist/mixins/index.d.ts' },
        },
      },
    });
    const from = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.d.ts');
    await resolveSpecifier('@adobe/spectrum-wc-core/components/button', from, { fetchImpl });
    await resolveSpecifier('@adobe/spectrum-wc-core/mixins', from, { fetchImpl });
    assert.equal(calls.filter((u) => u.includes('@adobe/spectrum-wc-core@2.0.0-beta.2')).length, 1);
  });
});

describe('cdnUrlsForCanonicalPath', () => {
  it('returns unpkg first, jsdelivr second, for the same package+version+path', () => {
    assert.deepEqual(
      cdnUrlsForCanonicalPath(makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.d.ts')),
      [
        'https://unpkg.com/@adobe/spectrum-wc@2.0.0-beta.2/dist/components/button/Button.d.ts',
        'https://cdn.jsdelivr.net/npm/@adobe/spectrum-wc@2.0.0-beta.2/dist/components/button/Button.d.ts',
      ],
    );
  });
});

describe('componentEntryPath', () => {
  it('builds a direct dist path from a CEM mod.path, swapping .ts for .d.ts', () => {
    assert.equal(
      componentEntryPath('components/button/Button.ts', '2.0.0-beta.2'),
      makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.d.ts'),
    );
  });
});

describe('rebaseInheritedModule', () => {
  it('rebases a "../core/" mixin path onto the core package\'s dist tree', () => {
    assert.equal(
      rebaseInheritedModule('../core/mixins/sized-mixin.ts', '@adobe/spectrum-wc-core', '2.0.0-beta.2'),
      makeCanonicalPath('@adobe/spectrum-wc-core', '2.0.0-beta.2', 'dist/mixins/sized-mixin.d.ts'),
    );
  });

  it('rebases a "../core/" component-base path the same way', () => {
    assert.equal(
      rebaseInheritedModule('../core/components/button/Button.base.ts', '@adobe/spectrum-wc-core', '2.0.0-beta.2'),
      makeCanonicalPath('@adobe/spectrum-wc-core', '2.0.0-beta.2', 'dist/components/button/Button.base.d.ts'),
    );
  });

  it('returns null for a shape other than the "../core/" prefix', () => {
    assert.equal(rebaseInheritedModule('./local-mixin.ts', '@adobe/spectrum-wc-core', '2.0.0-beta.2'), null);
  });
});

describe('findCorePackageName', () => {
  it('finds the @adobe/*-scoped dependency that is not the package itself', () => {
    const manifest = {
      name: '@adobe/spectrum-wc',
      dependencies: {
        '@adobe/spectrum-wc-core': '2.0.0-beta.2',
        '@lit-labs/observers': '2.0.2',
        lit: '^3.1.3',
      },
    };
    assert.equal(findCorePackageName(manifest), '@adobe/spectrum-wc-core');
  });

  it('returns null when no such dependency exists', () => {
    assert.equal(findCorePackageName({ name: '@adobe/spectrum-wc', dependencies: { lit: '^3.1.3' } }), null);
  });

  it('returns null when there are no dependencies at all', () => {
    assert.equal(findCorePackageName({ name: '@adobe/spectrum-wc' }), null);
  });
});

describe('fetchManifest caching', () => {
  it('does not re-fetch the same package+version twice', async () => {
    const { fetchImpl, calls } = makeMockFetch({
      'lit@3.3.3': { name: 'lit', version: '3.3.3', exports: { '.': { types: './index.d.ts' } } },
    });
    await fetchManifest('lit', '3.3.3', { fetchImpl });
    await fetchManifest('lit', '3.3.3', { fetchImpl });
    assert.equal(calls.length, 1);
  });

  it('caches a range fetch under its concrete resolved version too', async () => {
    const { fetchImpl, calls } = makeMockFetch({
      'lit@^3.1.3': { name: 'lit', version: '3.3.3', exports: { '.': { types: './index.d.ts' } } },
    });
    await fetchManifest('lit', '^3.1.3', { fetchImpl });
    // A later lookup by the concrete version this range resolved to should hit the
    // cache the first call already warmed, not issue a second network request.
    await fetchManifest('lit', '3.3.3', { fetchImpl });
    assert.equal(calls.length, 1);
  });
});
