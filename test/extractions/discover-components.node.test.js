import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildEntry,
  findComponentInterface,
  findExportedNames,
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

describe('findComponentInterface', () => {
  it('finds the type argument of a ForwardRefExoticComponent declaration', () => {
    const source = 'export declare const ToggleButton: ForwardRefExoticComponent<ToggleButtonProps>;';

    assert.equal(findComponentInterface(source, 'ToggleButton'), 'ToggleButtonProps');
  });

  it('falls back to a "<Component>Props" interface when there is no ForwardRefExoticComponent', () => {
    const source = `
      export interface ToastContainerProps { placement?: string; }
      export declare function ToastContainer(props: ToastContainerProps): ReactNode;
    `;

    assert.equal(findComponentInterface(source, 'ToastContainer'), 'ToastContainerProps');
  });

  it('falls back to a legacy "S2Spectrum<Component>Props" interface as a last resort', () => {
    const source = 'export interface S2SpectrumLegacyProps { foo?: string; }';

    assert.equal(findComponentInterface(source, 'Legacy'), 'S2SpectrumLegacyProps');
  });

  it('returns null when no matching interface name pattern is found', () => {
    assert.equal(findComponentInterface('export interface Unrelated {}', 'Missing'), null);
  });
});

describe('buildEntry', () => {
  it('records the interface name and omits `file` when it matches the component name', () => {
    const source = `
      export declare const ToggleButton: ForwardRefExoticComponent<ToggleButtonProps>;
      export interface ToggleButtonProps extends StyleProps {
        isEmphasized?: boolean;
      }
    `;

    const entry = buildEntry('ToggleButton', 'ToggleButton', source);

    assert.deepEqual(entry, { interface: 'ToggleButtonProps' });
  });

  it('records `file` when the component is declared in a differently-named source file', () => {
    const source = `
      export interface ToastContainerProps {
        placement?: ToastPlacement;
      }

      export declare function ToastContainer(props: ToastContainerProps): ReactNode;
    `;

    const entry = buildEntry('ToastContainer', 'Toast', source);

    assert.deepEqual(entry, { interface: 'ToastContainerProps', file: 'Toast' });
  });

  it('returns null when no props interface can be identified for the component', () => {
    assert.equal(buildEntry('Missing', 'Missing', 'export interface Unrelated {}'), null);
  });
});
