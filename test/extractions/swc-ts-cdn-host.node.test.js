import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import ts from 'typescript';

import {
  extractImportSpecifiers,
  createCdnCompilerHost,
  buildProgram,
  crawl,
} from '../../deps/swc/ts-cdn-host.js';
import { cdnUrlsForCanonicalPath } from '../../deps/swc/locate-published-files.js';

// A fetchImpl stand-in that serves fixed content for known canonical paths (in the
// "pkgName::version/filePath" form ts-cdn-host.js/locate-published-files.js use everywhere) and
// 404s otherwise. Keyed by canonical path rather than URL, so fixtures read the same
// as the fileCache/resolutionCache keys they end up producing; cdnUrlsForCanonicalPath
// (the same function the real code uses) maps each key to its real unpkg/jsdelivr
// URLs. Since deps/swc's resolveSpecifier is async and bare-specifier resolution
// needs each package's own manifest, fixtures below only exercise relative imports
// (no manifest fetch involved) — bare-specifier resolution itself is covered in
// swc-locate-published-files.node.test.js.
function makeMockFetch(sourcesByCanonicalPath) {
  const calls = [];
  const urlToText = new Map();
  for (const [canonicalPath, text] of Object.entries(sourcesByCanonicalPath)) {
    for (const url of cdnUrlsForCanonicalPath(canonicalPath)) {
      urlToText.set(url, text);
    }
  }
  const fetchImpl = async (url) => {
    calls.push(url);
    const text = urlToText.get(url);
    return {
      ok: text !== undefined,
      status: text !== undefined ? 200 : 404,
      text: async () => text ?? '',
    };
  };
  return { fetchImpl, calls };
}

describe('extractImportSpecifiers', () => {
  it('finds specifiers from both import and export-from statements', () => {
    const source = `
      import { Foo } from './Foo';
      import type { Bar } from '@adobe/spectrum-wc-core/mixins';
      export { Baz } from './Baz';
      export * from './Qux';
    `;
    assert.deepEqual(
      extractImportSpecifiers(source).sort(),
      ['./Baz', './Foo', './Qux', '@adobe/spectrum-wc-core/mixins'].sort(),
    );
  });

  it('ignores bare re-exports with no specifier', () => {
    assert.deepEqual(extractImportSpecifiers('export interface Foo { bar: string; }'), []);
  });

  it('dedupes repeated specifiers', () => {
    const source = "import { A } from './shared';\nimport { B } from './shared';";
    assert.deepEqual(extractImportSpecifiers(source), ['./shared']);
  });
});

describe('crawl', () => {
  it('discovers and fetches every file reachable via relative import specifiers', async () => {
    const { fetchImpl } = makeMockFetch({
      '@adobe/spectrum-wc-core::2.0.0-beta.2/dist/mixins/pending-mixin.d.ts':
        "import { Foo } from './foo.js';\nexport interface PendingInterface { pending: boolean; }",
      '@adobe/spectrum-wc-core::2.0.0-beta.2/dist/mixins/foo.d.ts': 'export interface Foo { x: string; }',
    });

    const { fileCache, resolutionCache } = await crawl(
      ['@adobe/spectrum-wc-core::2.0.0-beta.2/dist/mixins/pending-mixin.d.ts'],
      { fetchImpl },
    );

    assert.equal(fileCache.size, 2);
    assert.ok(fileCache.get('@adobe/spectrum-wc-core::2.0.0-beta.2/dist/mixins/pending-mixin.d.ts').includes('PendingInterface'));
    assert.ok(fileCache.get('@adobe/spectrum-wc-core::2.0.0-beta.2/dist/mixins/foo.d.ts').includes('Foo'));
    assert.equal(
      resolutionCache.get('@adobe/spectrum-wc-core::2.0.0-beta.2/dist/mixins/pending-mixin.d.ts ./foo.js'),
      '@adobe/spectrum-wc-core::2.0.0-beta.2/dist/mixins/foo.d.ts',
    );
  });

  it('records an unreachable file as null instead of omitting it, and does not retry it', async () => {
    const { fetchImpl, calls } = makeMockFetch({
      '@adobe/spectrum-wc-core::2.0.0-beta.2/dist/mixins/a.d.ts':
        "import { Missing } from './gone.js';\nexport interface A {}",
    });

    const { fileCache } = await crawl(
      ['@adobe/spectrum-wc-core::2.0.0-beta.2/dist/mixins/a.d.ts'],
      { fetchImpl },
    );

    assert.equal(fileCache.get('@adobe/spectrum-wc-core::2.0.0-beta.2/dist/mixins/gone.d.ts'), null);
    assert.equal(calls.filter((u) => u.includes('gone.d.ts')).length, 2);
  });

  it('reuses a shared fileCache/resolutionCache pair across calls', async () => {
    const sources = {
      '@adobe/spectrum-wc-core::2.0.0-beta.2/dist/mixins/shared.d.ts': 'export interface Shared { s: string; }',
      '@adobe/spectrum-wc-core::2.0.0-beta.2/dist/mixins/a.d.ts':
        "import { Shared } from './shared.js';\nexport interface A extends Shared {}",
      '@adobe/spectrum-wc-core::2.0.0-beta.2/dist/mixins/b.d.ts':
        "import { Shared } from './shared.js';\nexport interface B extends Shared {}",
    };
    const { fetchImpl, calls } = makeMockFetch(sources);
    const cache = new Map();
    const resolutionCache = new Map();

    await crawl(['@adobe/spectrum-wc-core::2.0.0-beta.2/dist/mixins/a.d.ts'], { fetchImpl, cache, resolutionCache });
    const sharedFetchesAfterFirst = calls.filter((u) => u.includes('shared.d.ts')).length;
    await crawl(['@adobe/spectrum-wc-core::2.0.0-beta.2/dist/mixins/b.d.ts'], { fetchImpl, cache, resolutionCache });
    const sharedFetchesAfterSecond = calls.filter((u) => u.includes('shared.d.ts')).length;

    assert.equal(sharedFetchesAfterFirst, 1);
    assert.equal(sharedFetchesAfterSecond, 1, 'shared.d.ts should not be fetched again for the second entry');
    assert.equal(cache.size, 3);
  });
});

describe('buildProgram + createCdnCompilerHost — cross-file resolution via resolutionCache', () => {
  it('resolves a bare named-alias type across a relative import chain', async () => {
    const { fetchImpl } = makeMockFetch({
      '@adobe/spectrum-wc-core::2.0.0-beta.2/dist/mixins/sized-mixin.d.ts': [
        'export declare const ELEMENT_SIZES: readonly ["s", "m", "l"];',
        'export type ElementSize = (typeof ELEMENT_SIZES)[number];',
        'export interface SizedElementInterface { size: ElementSize; }',
      ].join('\n'),
    });
    const entryPath = '@adobe/spectrum-wc-core::2.0.0-beta.2/dist/mixins/sized-mixin.d.ts';
    const { fileCache, resolutionCache } = await crawl([entryPath], { fetchImpl });
    const { program, checker } = buildProgram(fileCache, resolutionCache, [entryPath]);

    const sourceFile = program.getSourceFile(entryPath);
    const interfaceDecl = sourceFile.statements.find(
      (s) => ts.isInterfaceDeclaration(s) && s.name.text === 'SizedElementInterface',
    );
    const type = checker.getTypeAtLocation(interfaceDecl);
    const sizeSymbol = checker.getPropertiesOfType(type).find((s) => s.name === 'size');

    assert.equal(checker.typeToString(checker.getTypeOfSymbol(sizeSymbol)), '"s" | "m" | "l"');
  });

  it('resolves a property whose type is declared in a separately-imported file', async () => {
    const { fetchImpl } = makeMockFetch({
      '@adobe/spectrum-wc-core::2.0.0-beta.2/dist/components/button/index.d.ts':
        "export * from './Button.types.js';",
      '@adobe/spectrum-wc-core::2.0.0-beta.2/dist/components/button/Button.types.d.ts': [
        'export declare const BUTTON_VARIANTS: readonly ["primary", "secondary"];',
        'export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];',
      ].join('\n'),
      '@adobe/spectrum-wc::2.0.0-beta.2/dist/components/button/Button.d.ts':
        "import { ButtonVariant } from '@adobe/spectrum-wc-core/components/button';\nexport declare class Button { variant: ButtonVariant; }",
    });
    const entryPath = '@adobe/spectrum-wc::2.0.0-beta.2/dist/components/button/Button.d.ts';
    // Bare cross-package resolution needs a manifest fetch too; stub resolveSpecifier's
    // dependency here isn't needed since we only crawl what's already reachable via
    // relative specifiers once the entry's own bare import is pre-seeded into the
    // resolutionCache directly, matching how extract-cem-components.js's real run
    // resolves it through locate-published-files.js's manifest-driven resolver.
    const resolutionCache = new Map([
      [
        '@adobe/spectrum-wc::2.0.0-beta.2/dist/components/button/Button.d.ts @adobe/spectrum-wc-core/components/button',
        '@adobe/spectrum-wc-core::2.0.0-beta.2/dist/components/button/index.d.ts',
      ],
    ]);
    const { fileCache } = await crawl(
      [entryPath, '@adobe/spectrum-wc-core::2.0.0-beta.2/dist/components/button/index.d.ts'],
      { fetchImpl, resolutionCache },
    );
    const { program, checker } = buildProgram(fileCache, resolutionCache, [entryPath]);

    const sourceFile = program.getSourceFile(entryPath);
    const classDecl = sourceFile.statements.find((s) => ts.isClassDeclaration(s));
    const classSymbol = checker.getSymbolAtLocation(classDecl.name);
    const classType = checker.getDeclaredTypeOfSymbol(classSymbol);
    const variantSymbol = checker.getPropertiesOfType(classType).find((s) => s.name === 'variant');

    const variantType = checker.getTypeOfSymbol(variantSymbol);
    assert.equal(
      checker.typeToString(variantType, undefined, ts.TypeFormatFlags.NoTruncation),
      '"primary" | "secondary"',
    );
  });
});

describe('createCdnCompilerHost', () => {
  it('reports lib files as existing even though they are not in the crawled fileCache', () => {
    const host = createCdnCompilerHost(new Map(), new Map(), { target: ts.ScriptTarget.ES2020 });
    assert.ok(host.fileExists('lib.d.ts'));
    assert.ok(host.fileExists(ts.getDefaultLibFileName({ target: ts.ScriptTarget.ES2020 })));
  });

  it('reports an uncrawled, non-lib file as not existing', () => {
    const host = createCdnCompilerHost(new Map(), new Map(), { target: ts.ScriptTarget.ES2020 });
    assert.equal(host.fileExists('@adobe/spectrum-wc-core::2.0.0-beta.2/dist/NotCrawled.d.ts'), false);
  });
});
