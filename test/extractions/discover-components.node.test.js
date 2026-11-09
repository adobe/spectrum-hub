import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildEntry,
  componentFileNames,
  discoverComponents,
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

  it('finds a generic function-declaration export', () => {
    // @react-spectrum/ai declares Thread as `function Thread<T extends object>(...)`.
    // The type parameter sits between the name and the parameter list, so a pattern
    // expecting `(` immediately after the name silently drops it.
    const source = 'export declare function Thread<T extends object>(props: ThreadProps<T>): JSX.Element;';

    assert.deepEqual(findExportedNames(source), ['Thread']);
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

  it('resolves an arrow-function const declaration through the "<Component>Props" fallback', () => {
    // @react-spectrum/ai declares several components as a plain arrow-function type
    // rather than ForwardRefExoticComponent, so only the interface-name fallback applies.
    const source = `
      export interface ChatProps { children?: ReactNode; }
      export declare const Chat: (props: ChatProps & import("react").RefAttributes<HTMLDivElement>) => import("react").ReactElement | null;
    `;

    assert.equal(findComponentInterface(source, 'Chat'), 'ChatProps');
  });

  it('resolves a generic props interface, ignoring its type parameters', () => {
    const source = 'export interface AttachmentListProps<T> extends DOMProps { items?: Iterable<T>; }';

    assert.equal(findComponentInterface(source, 'AttachmentList'), 'AttachmentListProps');
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

  it('records `package` when the component comes from a non-default package', () => {
    const source = `
      export interface UserMessageProps { children: ReactNode; }
      export declare const UserMessage: ForwardRefExoticComponent<UserMessageProps>;
    `;

    const entry = buildEntry('UserMessage', 'UserMessage', source, 'ai');

    assert.deepEqual(entry, { interface: 'UserMessageProps', package: 'ai' });
  });

  it('omits `package` for the default S2 package', () => {
    const source = 'export declare const ToggleButton: ForwardRefExoticComponent<ToggleButtonProps>;';

    assert.deepEqual(buildEntry('ToggleButton', 'ToggleButton', source, 's2'), { interface: 'ToggleButtonProps' });
  });

  it('records both `file` and `package` for a non-default package sub-component', () => {
    const source = `
      export interface ThreadItemProps { id?: string; }
      export declare function ThreadItem(props: ThreadItemProps): JSX.Element;
    `;

    const entry = buildEntry('ThreadItem', 'Chat', source, 'ai');

    assert.deepEqual(entry, { interface: 'ThreadItemProps', file: 'Chat', package: 'ai' });
  });

  it('returns null when no props interface can be identified for the component', () => {
    assert.equal(buildEntry('Missing', 'Missing', 'export interface Unrelated {}'), null);
  });
});

describe('componentFileNames', () => {
  const meta = {
    files: [
      { path: '/dist/types/src/AIButton.d.ts' },
      { path: '/dist/types/src/Chat.d.ts' },
      { path: '/dist/types/src/useVoiceInput.d.ts' },
      { path: '/dist/types/src/loader/data.d.ts' },
      { path: '/dist/types/src/tokens.macro.d.ts' },
      { path: '/dist/types/src/Provider.d.ts' },
    ],
  };

  it('keeps only capitalized top-level files, sorted', () => {
    assert.deepEqual(componentFileNames(meta), ['AIButton', 'Chat']);
  });

  it('drops hook, nested, and macro files that cannot declare a component', () => {
    const names = componentFileNames(meta);

    assert.ok(!names.includes('useVoiceInput'));
    assert.ok(!names.includes('loader/data'));
    assert.ok(!names.includes('tokens.macro'));
  });

  it('drops files on the shared skip list', () => {
    assert.ok(!componentFileNames(meta).includes('Provider'));
  });
});

describe('discoverComponents', () => {
  const sources = {
    UserMessage: `
      export interface UserMessageProps { children: ReactNode; }
      export declare const UserMessage: ForwardRefExoticComponent<UserMessageProps>;
    `,
    Chat: `
      export interface ChatProps { children?: ReactNode; }
      export declare const Chat: (props: ChatProps) => ReactElement | null;
      export interface ThreadProps<T extends object> { items?: Iterable<T>; }
      export declare function Thread<T extends object>(props: ThreadProps<T>): JSX.Element;
      export declare const InternalChatContext: import("react").Context<unknown>;
    `,
  };
  const loadSource = async (fileName) => sources[fileName];

  it('marks every entry with the package it was discovered in', async () => {
    const components = await discoverComponents(['UserMessage'], loadSource, 'ai');

    assert.deepEqual(components, {
      UserMessage: { interface: 'UserMessageProps', package: 'ai' },
    });
  });

  it('registers each component declared in one file, recording the file when it differs', async () => {
    const components = await discoverComponents(['Chat'], loadSource, 'ai');

    assert.deepEqual(components, {
      Chat: { interface: 'ChatProps', package: 'ai' },
      Thread: { interface: 'ThreadProps', file: 'Chat', package: 'ai' },
    });
  });

  it('skips exports that resolve no props interface, such as a React context', async () => {
    const components = await discoverComponents(['Chat'], loadSource, 'ai');

    assert.ok(!Object.hasOwn(components, 'InternalChatContext'));
  });
});
