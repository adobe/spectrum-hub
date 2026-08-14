import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  packageEntryPath,
  resolveSpecifier,
  cdnUrlsForCanonicalPath,
} from '../../deps/rsp/cdn-resolve.js';

describe('packageEntryPath', () => {
  it('resolves react-aria-components to its dist/types/exports entry', () => {
    assert.equal(
      packageEntryPath('react-aria-components'),
      'react-aria-components/dist/types/exports/index.d.ts',
    );
  });

  it('resolves react-aria to its dist/types/exports entry', () => {
    assert.equal(packageEntryPath('react-aria'), 'react-aria/dist/types/exports/index.d.ts');
  });

  it('resolves @react-types/shared to its src entry (no dist/types prefix)', () => {
    assert.equal(packageEntryPath('@react-types/shared'), '@react-types/shared/src/index.d.ts');
  });

  it('resolves @types/react to a bare package-root index (empty base)', () => {
    assert.equal(packageEntryPath('@types/react'), '@types/react/index.d.ts');
  });

  it('returns null for an unregistered package', () => {
    assert.equal(packageEntryPath('@react-spectrum/s2'), null);
  });
});

describe('resolveSpecifier — relative imports', () => {
  it('resolves a sibling relative import within the same directory', () => {
    assert.equal(
      resolveSpecifier('./Button', '@react-spectrum/s2/dist/types/src/ActionButton.d.ts'),
      '@react-spectrum/s2/dist/types/src/Button.d.ts',
    );
  });

  it('resolves a parent-directory relative import', () => {
    assert.equal(
      resolveSpecifier('../src/Button', 'react-aria-components/dist/types/exports/Button.d.ts'),
      'react-aria-components/dist/types/src/Button.d.ts',
    );
  });

  it('leaves an already-.d.ts-suffixed relative specifier unchanged in shape', () => {
    assert.equal(
      resolveSpecifier('./Foo.d.ts', 'pkg/dir/Bar.d.ts'),
      'pkg/dir/Foo.d.ts',
    );
  });
});

describe('resolveSpecifier — bare package imports', () => {
  it('resolves a bare package specifier (no subpath) to that package\'s entry', () => {
    assert.equal(
      resolveSpecifier('react-aria-components', 'somewhere/File.d.ts'),
      'react-aria-components/dist/types/exports/index.d.ts',
    );
  });

  it('resolves a scoped bare package specifier to its entry', () => {
    assert.equal(
      resolveSpecifier('@react-types/shared', 'somewhere/File.d.ts'),
      '@react-types/shared/src/index.d.ts',
    );
  });

  it('resolves a package subpath through its registered base, not the raw specifier name', () => {
    // Regression case: react-aria-components/slots has no dist/types/src/slots.d.ts at all —
    // it must go through dist/types/exports/slots.d.ts (a thin re-export wrapper whose own
    // relative import then resolves to the real ../src/utils.d.ts).
    assert.equal(
      resolveSpecifier('react-aria-components/slots', 'somewhere/File.d.ts'),
      'react-aria-components/dist/types/exports/slots.d.ts',
    );
  });

  it('resolves a react-aria subpath the same way', () => {
    assert.equal(
      resolveSpecifier('react-aria/useButton', 'somewhere/File.d.ts'),
      'react-aria/dist/types/exports/useButton.d.ts',
    );
  });

  it('returns null for an unregistered bare package (e.g. react-dom)', () => {
    assert.equal(resolveSpecifier('react-dom', 'somewhere/File.d.ts'), null);
  });
});

describe('resolveSpecifier — runtime-package-to-types-package remapping', () => {
  it('remaps a bare "react" import to @types/react (react ships no .d.ts of its own)', () => {
    assert.equal(
      resolveSpecifier('react', 'somewhere/File.d.ts'),
      '@types/react/index.d.ts',
    );
  });

  it('remaps a "react/jsx-runtime" subpath to @types/react/jsx-runtime', () => {
    assert.equal(
      resolveSpecifier('react/jsx-runtime', 'somewhere/File.d.ts'),
      '@types/react/jsx-runtime.d.ts',
    );
  });
});

describe('cdnUrlsForCanonicalPath', () => {
  it('returns unpkg first, jsdelivr second, for the same path', () => {
    assert.deepEqual(
      cdnUrlsForCanonicalPath('@react-types/shared/src/index.d.ts'),
      [
        'https://unpkg.com/@react-types/shared/src/index.d.ts',
        'https://cdn.jsdelivr.net/npm/@react-types/shared/src/index.d.ts',
      ],
    );
  });
});
