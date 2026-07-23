import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildEntry,
  buildIncludeFiles,
  findExportedNames,
  findIncludeImportPath,
} from '../../deps/rsp/discover-components.js';

describe('findExportedNames', () => {
  it('finds forwardRef-style const exports', () => {
    const source = 'export declare const ToggleButton: ForwardRefExoticComponent<ToggleButtonProps>;';

    assert.deepEqual(findExportedNames(source), ['ToggleButton']);
  });

  it('finds plain function-declaration exports', () => {
    // Regression: S2 moved ToastContainer from a const/forwardRef export to a plain
    // function declaration, which silently dropped it from components.json.
    const source = 'export declare function ToastContainer(props: ToastContainerProps): ReactNode;';

    assert.deepEqual(findExportedNames(source), ['ToastContainer']);
  });

  it('finds both styles in the same file without duplicates', () => {
    const source = `
      export declare const ToggleButton: ForwardRefExoticComponent<ToggleButtonProps>;
      export declare function ToastContainer(props: ToastContainerProps): ReactNode;
    `;

    assert.deepEqual(findExportedNames(source), ['ToggleButton', 'ToastContainer']);
  });
});

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

  it('resolves the interface for a plain function-declaration component', () => {
    const source = `
      export interface ToastContainerProps {
        placement?: ToastPlacement;
      }

      export declare function ToastContainer(props: ToastContainerProps): ReactNode;
    `;

    const entry = buildEntry('ToastContainer', 'Toast', source);

    assert.equal(entry.interface, 'ToastContainerProps');
    assert.equal(entry.file, 'Toast');
  });
});
