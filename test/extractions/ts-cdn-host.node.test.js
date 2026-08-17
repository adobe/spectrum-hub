import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import ts from 'typescript';

import {
  extractImportSpecifiers,
  createCdnCompilerHost,
  buildProgram,
  crawl,
} from '../../deps/rsp/ts-cdn-host.js';

// A fetchImpl stand-in that serves fixed content for known canonical paths and 404s
// otherwise — records every URL it's asked for so tests can assert on fetch counts.
function makeMockFetch(sourcesByCanonicalPath) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const canonicalPath = url.replace(/^https:\/\/unpkg\.com\//, '');
    const text = sourcesByCanonicalPath[canonicalPath];
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
      import type { Bar } from 'react-aria-components';
      export { Baz } from './Baz';
      export * from '@react-types/shared';
    `;
    assert.deepEqual(
      extractImportSpecifiers(source).sort(),
      ['./Baz', './Foo', '@react-types/shared', 'react-aria-components'].sort(),
    );
  });

  it('ignores bare re-exports with no specifier', () => {
    const source = 'export interface Foo { bar: string; }';
    assert.deepEqual(extractImportSpecifiers(source), []);
  });

  it('dedupes repeated specifiers', () => {
    const source = `
      import { A } from './shared';
      import { B } from './shared';
    `;
    assert.deepEqual(extractImportSpecifiers(source), ['./shared']);
  });
});

// The test that directly proves the bug this rewrite fixes: a prop declared 3 interfaces
// up an `extends` chain, split across 3 files, resolved transitively and automatically by
// the real checker - no manual per-hop lookup, unlike the regex pipeline it replaces.
describe('buildProgram — transitive cross-file extends resolution', () => {
  const fileCache = new Map([
    ['fixture/A.d.ts', [
      "import { BaseProps } from './B';",
      'export interface ButtonProps extends BaseProps {',
      '  ownProp: string;',
      '}',
    ].join('\n')],
    ['fixture/B.d.ts', [
      "import { DeepProps } from './C';",
      'export interface BaseProps extends DeepProps {',
      '  midProp?: number;',
      '}',
    ].join('\n')],
    ['fixture/C.d.ts', [
      'export interface DeepProps {',
      '  /**',
      '   * Deep doc.',
      '   * @default true',
      '   */',
      '  deepProp: boolean;',
      '}',
    ].join('\n')],
  ]);

  function getInterfaceType(program, checker, fileName, interfaceName) {
    const sourceFile = program.getSourceFile(fileName);
    const decl = sourceFile.statements.find(
      (s) => ts.isInterfaceDeclaration(s) && s.name.text === interfaceName,
    );
    return checker.getTypeAtLocation(decl);
  }

  it('flattens all 3 levels of extends into one property list', () => {
    const { program, checker } = buildProgram(fileCache, ['fixture/A.d.ts']);
    const type = getInterfaceType(program, checker, 'fixture/A.d.ts', 'ButtonProps');
    const propNames = checker.getPropertiesOfType(type).map((s) => s.name).sort();

    assert.deepEqual(propNames, ['deepProp', 'midProp', 'ownProp']);
  });

  it('reads JSDoc description and @default off a symbol inherited from 2 hops away', () => {
    const { program, checker } = buildProgram(fileCache, ['fixture/A.d.ts']);
    const type = getInterfaceType(program, checker, 'fixture/A.d.ts', 'ButtonProps');
    const deepProp = checker.getPropertiesOfType(type).find((s) => s.name === 'deepProp');

    const description = ts.displayPartsToString(deepProp.getDocumentationComment(checker));
    const defaultTag = deepProp.getJsDocTags(checker).find((t) => t.name === 'default');

    assert.equal(description, 'Deep doc.');
    assert.equal(ts.displayPartsToString(defaultTag.text), 'true');
  });

  it('correctly reports which properties are optional vs required', () => {
    const { program, checker } = buildProgram(fileCache, ['fixture/A.d.ts']);
    const type = getInterfaceType(program, checker, 'fixture/A.d.ts', 'ButtonProps');
    const byName = Object.fromEntries(
      checker.getPropertiesOfType(type).map((s) => [s.name, s]),
    );

    // eslint-disable-next-line no-bitwise
    const isOptional = (symbol) => Boolean(symbol.flags & ts.SymbolFlags.Optional);
    assert.equal(isOptional(byName.ownProp), false);
    assert.equal(isOptional(byName.midProp), true);
    assert.equal(isOptional(byName.deepProp), false);
  });

  it('resolves standard-lib utility types (Omit/Pick) without any CDN-fetched lib file', () => {
    const utilityFileCache = new Map([
      ['fixture/D.d.ts', [
        "import { Wide } from './E';",
        "export interface Narrow extends Omit<Wide, 'excluded'> {",
        '  extra: string;',
        '}',
      ].join('\n')],
      ['fixture/E.d.ts', [
        'export interface Wide {',
        '  kept: string;',
        '  excluded: string;',
        '}',
      ].join('\n')],
    ]);

    const { program, checker } = buildProgram(utilityFileCache, ['fixture/D.d.ts']);
    const type = getInterfaceType(program, checker, 'fixture/D.d.ts', 'Narrow');
    const propNames = checker.getPropertiesOfType(type).map((s) => s.name).sort();

    assert.deepEqual(propNames, ['extra', 'kept']);
  });
});

describe('crawl', () => {
  it('discovers and fetches every file reachable via import/export specifiers', async () => {
    const { fetchImpl } = makeMockFetch({
      'pkg/dist/types/src/A.d.ts': "import { B } from './B';\nexport interface A extends B {}",
      'pkg/dist/types/src/B.d.ts': 'export interface B { fromB: string; }',
    });

    const fileCache = await crawl(['pkg/dist/types/src/A.d.ts'], { fetchImpl });

    assert.equal(fileCache.size, 2);
    assert.ok(fileCache.get('pkg/dist/types/src/A.d.ts').includes('extends B'));
    assert.ok(fileCache.get('pkg/dist/types/src/B.d.ts').includes('fromB'));
  });

  it('records an unreachable file as null instead of omitting it, and does not retry it', async () => {
    const { fetchImpl, calls } = makeMockFetch({
      'pkg/dist/types/src/A.d.ts': "import { Missing } from './gone';\nexport interface A {}",
    });

    const fileCache = await crawl(['pkg/dist/types/src/A.d.ts'], { fetchImpl });

    assert.equal(fileCache.get('pkg/dist/types/src/gone.d.ts'), null);
    // unpkg + jsdelivr fallback = 2 attempts for the missing file, not more.
    assert.equal(calls.filter((u) => u.includes('gone.d.ts')).length, 2);
  });

  it('reuses a shared cache across calls instead of re-fetching already-known files', async () => {
    const sources = {
      'pkg/dist/types/src/Shared.d.ts': 'export interface Shared { s: string; }',
      'pkg/dist/types/src/A.d.ts': "import { Shared } from './Shared';\nexport interface A extends Shared {}",
      'pkg/dist/types/src/B.d.ts': "import { Shared } from './Shared';\nexport interface B extends Shared {}",
    };
    const { fetchImpl, calls } = makeMockFetch(sources);
    const cache = new Map();

    await crawl(['pkg/dist/types/src/A.d.ts'], { fetchImpl, cache });
    const sharedFetchesAfterFirst = calls.filter((u) => u.includes('Shared.d.ts')).length;
    await crawl(['pkg/dist/types/src/B.d.ts'], { fetchImpl, cache });
    const sharedFetchesAfterSecond = calls.filter((u) => u.includes('Shared.d.ts')).length;

    assert.equal(sharedFetchesAfterFirst, 1);
    assert.equal(sharedFetchesAfterSecond, 1, 'Shared.d.ts should not be fetched again for the second entry');
    assert.equal(cache.size, 3);
  });
});

describe('createCdnCompilerHost', () => {
  it('reports lib files as existing even though they are not in the crawled fileCache', () => {
    const host = createCdnCompilerHost(new Map(), { target: ts.ScriptTarget.ES2020 });
    assert.ok(host.fileExists('lib.d.ts'));
    assert.ok(host.fileExists(ts.getDefaultLibFileName({ target: ts.ScriptTarget.ES2020 })));
  });

  it('reports an uncrawled, non-lib file as not existing', () => {
    const host = createCdnCompilerHost(new Map(), { target: ts.ScriptTarget.ES2020 });
    assert.equal(host.fileExists('@react-spectrum/s2/dist/types/src/NotCrawled.d.ts'), false);
  });
});
