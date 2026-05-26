import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildEntry,
  buildIncludeFiles,
  findIncludeImportPath,
} from '../../deps/rsp/discover-components.js';

describe('findIncludeImportPath', () => {
  it('returns the sibling .d.ts basename for a relative import', () => {
    const source = `
      import { ActionButtonStyleProps } from './ActionButton';
      export interface ToggleButtonProps extends ActionButtonStyleProps {}
    `;

    assert.equal(findIncludeImportPath(source, 'ActionButtonStyleProps'), 'ActionButton');
  });

  it('returns null when the include is not imported from a sibling path', () => {
    const source = `
      interface ButtonStyleProps { variant?: string; }
      export interface ButtonProps extends ButtonStyleProps {}
    `;

    assert.equal(findIncludeImportPath(source, 'ButtonStyleProps'), null);
  });
});

describe('buildIncludeFiles', () => {
  it('omits includes that are declared in the same source file', () => {
    const source = `
      interface ButtonStyleProps { variant?: string; }
      export interface ButtonProps extends ButtonStyleProps {}
    `;

    assert.equal(
      buildIncludeFiles(source, ['ButtonStyleProps']),
      undefined,
    );
  });

  it('maps cross-file includes to their types file basename', () => {
    const source = `
      import { ActionButtonStyleProps } from './ActionButton';
      export interface ToggleButtonProps extends ActionButtonStyleProps {}
    `;

    assert.deepEqual(
      buildIncludeFiles(source, ['ActionButtonStyleProps']),
      { ActionButtonStyleProps: 'ActionButton' },
    );
  });
});

describe('buildEntry', () => {
  it('adds includeFiles for cross-file style props', () => {
    const source = `
      import type { ToggleButtonProps as RACToggleButtonProps } from 'react-aria-components';
      import { ActionButtonStyleProps } from './ActionButton';

      export declare const ToggleButton: ForwardRefExoticComponent<ToggleButtonProps>;

      export interface ToggleButtonProps extends RACToggleButtonProps, ActionButtonStyleProps, StyleProps {
        isEmphasized?: boolean;
      }
    `;

    const entry = buildEntry('ToggleButton', 'ToggleButton', source);

    assert.equal(entry.interface, 'ToggleButtonProps');
    assert.deepEqual(entry.includes, ['ActionButtonStyleProps']);
    assert.deepEqual(entry.includeFiles, { ActionButtonStyleProps: 'ActionButton' });
    assert.ok(entry.extends?.includes('StyleProps'));
  });
});
