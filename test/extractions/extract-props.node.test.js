import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  pruneStaleData,
  buildComponentData,
  findInterfaceDeclaration,
  extractPropsFromType,
  extractComponentProps,
} from '../../deps/rsp/extract-props.js';
import { buildProgram } from '../../deps/rsp/build-ts-checker.js';

describe('buildComponentData', () => {
  const props = [{ property: 'size', type: "'M'" }];

  it('always includes props', () => {
    assert.deepEqual(buildComponentData(props, null), { props });
  });

  it('adds status when a doc page exists', () => {
    assert.deepEqual(buildComponentData(props, 'stable'), {
      props,
      status: 'stable',
    });
  });

  it('adds prerelease status labels', () => {
    assert.deepEqual(buildComponentData(props, 'rc'), { props, status: 'rc' });
  });

  it('omits status when fetchComponentDocStatus returns null', () => {
    assert.deepEqual(buildComponentData(props, null), { props });
    assert.equal(buildComponentData(props, null).status, undefined);
  });
});

describe('findInterfaceDeclaration', () => {
  it('finds a named top-level interface in a source file', () => {
    const fileCache = new Map([['f.d.ts', 'export interface Foo { a: string; }\nexport interface Bar { b: string; }']]);
    const { program } = buildProgram(fileCache, ['f.d.ts']);
    const sourceFile = program.getSourceFile('f.d.ts');

    const decl = findInterfaceDeclaration(sourceFile, 'Bar');
    assert.equal(decl.name.text, 'Bar');
  });

  it('returns undefined when the interface is not present', () => {
    const fileCache = new Map([['f.d.ts', 'export interface Foo { a: string; }']]);
    const { program } = buildProgram(fileCache, ['f.d.ts']);
    const sourceFile = program.getSourceFile('f.d.ts');

    assert.equal(findInterfaceDeclaration(sourceFile, 'Missing'), undefined);
  });
});

// extractPropsFromType is the actual fix this rewrite is for: it's what replaces the
// previous one-hop extends/includes lookup with the real checker's transitive resolution.
describe('extractPropsFromType', () => {
  function typeFor(fileCache, entryFile, interfaceName) {
    const { program, checker } = buildProgram(fileCache, [entryFile]);
    const sourceFile = program.getSourceFile(entryFile);
    const decl = findInterfaceDeclaration(sourceFile, interfaceName);
    return { checker, type: checker.getTypeAtLocation(decl) };
  }

  it('flattens props inherited transitively across multiple files, not just one hop', () => {
    const fileCache = new Map([
      ['a.d.ts', [
        "import { BaseProps } from './b';",
        'export interface ButtonProps extends BaseProps {',
        '  ownProp: string;',
        '}',
      ].join('\n')],
      ['b.d.ts', [
        "import { DeepProps } from './c';",
        'export interface BaseProps extends DeepProps {',
        '  midProp?: number;',
        '}',
      ].join('\n')],
      ['c.d.ts', [
        'export interface DeepProps {',
        '  /**',
        '   * Deep doc.',
        '   * @default true',
        '   */',
        '  deepProp: boolean;',
        '}',
      ].join('\n')],
    ]);

    const { checker, type } = typeFor(fileCache, 'a.d.ts', 'ButtonProps');
    const props = extractPropsFromType(checker, type, 'ButtonProps');

    assert.deepEqual(
      props.map((p) => p.property).sort(),
      ['deepProp', 'midProp', 'ownProp'],
    );

    const deepProp = props.find((p) => p.property === 'deepProp');
    assert.equal(deepProp.description, 'Deep doc.');
    assert.equal(deepProp.default, 'true');
    assert.equal(deepProp.required, true);
    assert.equal(deepProp.inheritedFrom, 'DeepProps');

    const midProp = props.find((p) => p.property === 'midProp');
    assert.equal(midProp.required, undefined);
    assert.equal(midProp.inheritedFrom, 'BaseProps');

    // Declared directly on the primary interface — no inheritedFrom, matching prior shape.
    const ownProp = props.find((p) => p.property === 'ownProp');
    assert.equal(ownProp.inheritedFrom, undefined);
  });

  it('excludes className and the UNSAFE_ style/className escape hatches', () => {
    const fileCache = new Map([
      ['a.d.ts', [
        'export interface Wide {',
        '  className?: string;',
        '  UNSAFE_className?: string;',
        '  UNSAFE_style?: object;',
        '  kept: string;',
        '}',
        'export interface Narrow extends Wide {}',
      ].join('\n')],
    ]);

    const { checker, type } = typeFor(fileCache, 'a.d.ts', 'Narrow');
    const props = extractPropsFromType(checker, type, 'Narrow');

    assert.deepEqual(props.map((p) => p.property), ['kept']);
  });
});

describe('extractComponentProps', () => {
  function makeMockFetch(sourcesByCanonicalPath) {
    return async (url) => {
      const canonicalPath = url.replace(/^https:\/\/unpkg\.com\//, '');
      const text = sourcesByCanonicalPath[canonicalPath];
      return { ok: text !== undefined, status: text !== undefined ? 200 : 404, text: async () => text ?? '' };
    };
  }

  it('resolves a component end to end from its own .d.ts source', async () => {
    const fetchImpl = makeMockFetch({
      '@react-spectrum/s2/dist/types/src/Example.d.ts': [
        'export interface ExampleProps {',
        '  size?: string;',
        '}',
      ].join('\n'),
    });
    // extractComponentProps calls crawl() with the module-level `fetch`; simulate its
    // effect directly via a pre-populated shared cache instead of monkey-patching global fetch.
    const sharedFileCache = new Map();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchImpl;
    try {
      const props = await extractComponentProps('Example', { interface: 'ExampleProps' }, sharedFileCache);
      assert.deepEqual(props, [{
        property: 'size', type: 'string', kind: 'text', values: [],
      }]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // The same contract SWC emits (deps/shared/prop-contract.js), so no consumer
  // re-parses `type`. RSP records `required` rather than `optional`: TS props are
  // optional by default, so only 3% are required and that is the informative half.
  it('emits kind and values for a union, and marks a required prop', async () => {
    const fetchImpl = makeMockFetch({
      '@react-spectrum/s2/dist/types/src/Example.d.ts': [
        'export interface ExampleProps {',
        "  variant?: 'primary' | 'accent';",
        '  count?: 1 | 2 | 3;',
        '  isDisabled?: boolean;',
        '  children: string;',
        '}',
      ].join('\n'),
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchImpl;
    try {
      const props = await extractComponentProps('Example', { interface: 'ExampleProps' }, new Map());
      const by = Object.fromEntries(props.map((p) => [p.property, p]));

      assert.equal(by.variant.kind, 'enum');
      assert.deepEqual(by.variant.values, ['primary', 'accent']);
      // Numeric options stay numeric, as on the SWC side.
      assert.deepEqual(by.count.values, [1, 2, 3]);
      // TS's `boolean` is the union `false | true`; it must still read as the primitive.
      assert.equal(by.isDisabled.type, 'boolean');
      assert.equal(by.isDisabled.kind, 'boolean');
      assert.deepEqual(by.isDisabled.values, []);
      // `children` is the only non-optional member of the fixture.
      assert.equal(by.children.required, true);
      assert.equal(by.variant.required, undefined);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // The checker's default renderer truncates a long union to `"a" | ... N more ...`,
  // which reads as valid and is not. RSP would have shipped that silently.
  it('does not truncate a long union', async () => {
    const values = Array.from({ length: 24 }, (_, i) => `'v${i}'`).join(' | ');
    const fetchImpl = makeMockFetch({
      '@react-spectrum/s2/dist/types/src/Example.d.ts':
        `export interface ExampleProps { variant?: ${values}; }`,
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchImpl;
    try {
      const props = await extractComponentProps('Example', { interface: 'ExampleProps' }, new Map());
      assert.equal(props[0].values.length, 24);
      assert.ok(!props[0].type.includes('more'), props[0].type);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns null when the named interface is not found in the component file', async () => {
    const fetchImpl = makeMockFetch({
      '@react-spectrum/s2/dist/types/src/Example.d.ts': 'export interface SomethingElse {}',
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchImpl;
    try {
      const props = await extractComponentProps('Example', { interface: 'ExampleProps' }, new Map());
      assert.equal(props, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

// A component dropped from the roster left its data file behind forever — Icon.json
// outlived its components.json entry and kept serving stale rows to the table block.
describe('pruneStaleData', () => {
  it('names the files whose component is no longer in the roster', () => {
    const stale = pruneStaleData(['Button.json', 'Icon.json', 'TextField.json'], ['Button', 'TextField']);
    assert.deepEqual(stale, ['Icon.json']);
  });

  it('names nothing when every file is still rostered', () => {
    assert.deepEqual(pruneStaleData(['Button.json'], ['Button', 'TextField']), []);
  });

  // Fail closed: if discovery breaks and returns a short roster, pruning would delete
  // the catalog. Refuse rather than trust a roster that lost most of its entries.
  it('refuses to prune when the roster collapsed', () => {
    const files = Array.from({ length: 100 }, (_, i) => `C${i}.json`);
    assert.throws(() => pruneStaleData(files, ['C1', 'C2']), /roster/i);
  });

  it('ignores non-json entries', () => {
    assert.deepEqual(pruneStaleData(['Button.json', 'README.md'], ['Button']), []);
  });
});
