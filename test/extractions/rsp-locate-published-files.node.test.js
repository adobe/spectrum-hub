import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  componentEntryPath,
  packageEntryPath,
  resolveSpecifier,
  cdnUrlsForCanonicalPath,
} from '../../deps/rsp/locate-published-files.js';

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

  it('resolves react-stately to its dist/types/exports entry', () => {
    assert.equal(packageEntryPath('react-stately'), 'react-stately/dist/types/exports/index.d.ts');
  });

  it('resolves @internationalized/date to its src entry (no exports-map indirection)', () => {
    assert.equal(
      packageEntryPath('@internationalized/date'),
      '@internationalized/date/dist/types/src/index.d.ts',
    );
  });

  it('resolves @react-spectrum/s2 to its dist/types/exports entry', () => {
    // @react-spectrum/ai imports bare `@react-spectrum/s2` specifiers, so S2 has to be
    // crawlable rather than skipped the way it was when only S2's own files were fetched.
    assert.equal(
      packageEntryPath('@react-spectrum/s2'),
      '@react-spectrum/s2/dist/types/exports/index.d.ts',
    );
  });

  it('returns null for an unregistered package', () => {
    assert.equal(packageEntryPath('react-dom'), null);
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

  it('resolves a relative import from a containing file with no directory component at all', () => {
    // Regression: lastIndexOf('/') is -1 with no slash at all, and naively slicing to that
    // index chops the last character off the filename instead of yielding an empty dir.
    assert.equal(resolveSpecifier('./b', 'a.d.ts'), 'b.d.ts');
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

  it('resolves a bare @react-spectrum/s2 specifier to its exports entry', () => {
    assert.equal(
      resolveSpecifier('@react-spectrum/s2', '@react-spectrum/ai/dist/types/src/PromptField.d.ts'),
      '@react-spectrum/s2/dist/types/exports/index.d.ts',
    );
  });

  it('resolves an @react-spectrum/s2 component subpath through its exports map', () => {
    assert.equal(
      resolveSpecifier('@react-spectrum/s2/Menu', '@react-spectrum/ai/dist/types/src/PromptField.d.ts'),
      '@react-spectrum/s2/dist/types/exports/Menu.d.ts',
    );
  });

  it('resolves @react-spectrum/s2/style to its own tree, not the exports map', () => {
    // S2's exports map routes "./style" to dist/types/style/index.d.ts. There is no
    // dist/types/exports/style.d.ts, so resolving it like every other subpath 404s — and
    // an unresolved heritage member collapses the whole Omit<> chain to zero properties.
    // Every @react-spectrum/ai component imports StyleString from this subpath.
    assert.equal(
      resolveSpecifier('@react-spectrum/s2/style', '@react-spectrum/ai/dist/types/src/UserMessage.d.ts'),
      '@react-spectrum/s2/dist/types/style/index.d.ts',
    );
  });

  it('still resolves a relative import inside @react-spectrum/s2\'s own src tree', () => {
    // Registering the package must not change how its own files resolve each other.
    assert.equal(
      resolveSpecifier('./Button', '@react-spectrum/s2/dist/types/src/ActionButton.d.ts'),
      '@react-spectrum/s2/dist/types/src/Button.d.ts',
    );
  });

  it('resolves an @react-spectrum/s2 icon to the package root, not its exports base', () => {
    // S2's exports map routes "./icons/*" to "./icons/*.d.ts" at the package root. Before
    // S2 was crawlable these specifiers resolved to null and were skipped; now they are
    // followed, so an uncorrected base turns every icon import into a failed fetch.
    assert.equal(
      resolveSpecifier('@react-spectrum/s2/icons/Edit', '@react-spectrum/ai/dist/types/src/PromptField.d.ts'),
      '@react-spectrum/s2/icons/Edit.d.ts',
    );
  });

  it('resolves an @react-spectrum/s2 illustration to the package root the same way', () => {
    assert.equal(
      resolveSpecifier('@react-spectrum/s2/illustrations/Cloud', 'somewhere/File.d.ts'),
      '@react-spectrum/s2/illustrations/Cloud.d.ts',
    );
  });

  it('still sends an ordinary @react-spectrum/s2 subpath through the exports base', () => {
    assert.equal(
      resolveSpecifier('@react-spectrum/s2/Popover', 'somewhere/File.d.ts'),
      '@react-spectrum/s2/dist/types/exports/Popover.d.ts',
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

describe('componentEntryPath', () => {
  it('resolves an S2 component against the S2 package', () => {
    assert.equal(
      componentEntryPath('Button', { interface: 'ButtonProps' }),
      '@react-spectrum/s2/dist/types/src/Button.d.ts',
    );
  });

  it('uses the entry\'s `file` when the component is declared elsewhere', () => {
    assert.equal(
      componentEntryPath('AccordionItem', { interface: 'AccordionItemProps', file: 'Accordion' }),
      '@react-spectrum/s2/dist/types/src/Accordion.d.ts',
    );
  });

  it('resolves an AI component against the AI package, not S2', () => {
    // Regression: every @react-spectrum/ai component was fetched from the S2 package, which
    // 404s for all 35 of them — extraction reported "<Interface> not found" and wrote
    // nothing, rather than failing loudly.
    assert.equal(
      componentEntryPath('UserMessage', { interface: 'UserMessageProps', package: 'ai' }),
      '@react-spectrum/ai/dist/types/src/UserMessage.d.ts',
    );
  });

  it('combines `file` and `package` for an AI sub-component', () => {
    assert.equal(
      componentEntryPath('ThreadItem', { interface: 'ThreadItemProps', file: 'Chat', package: 'ai' }),
      '@react-spectrum/ai/dist/types/src/Chat.d.ts',
    );
  });

  it('rejects an explicit unknown package id', () => {
    assert.throws(
      () => componentEntryPath('Button', { interface: 'ButtonProps', package: 'nonexistent' }),
      /Unknown RSP package: nonexistent/,
    );
  });

  it('preserves a nested declaration path', () => {
    assert.equal(
      componentEntryPath('PixelLoader', { file: 'loader/react', package: 'ai' }),
      '@react-spectrum/ai/dist/types/src/loader/react.d.ts',
    );
  });
});
