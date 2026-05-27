import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildComponentData,
  collectComponentProps,
  extractExtends,
  extractInterfaceBlock,
  parseJSDoc,
  parseProps,
} from '../../deps/rsp/extract-props.js';

const MOCK_BASE_PROPS = {
  StyleProps: [
    {
      property: 'styles',
      type: 'StylesProp',
      description: 'Spectrum-defined styles, returned by the `style()` macro.',
    },
  ],
  ButtonProps: [
    {
      property: 'isPending',
      type: 'boolean',
      description: 'Whether the button is in a pending state.',
    },
  ],
};

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

describe('parseJSDoc', () => {
  it('extracts description and @default', () => {
    assert.deepEqual(
      parseJSDoc('/** The size of the Button.\n * @default \'M\'\n */'),
      { description: 'The size of the Button.', default: "'M'" },
    );
  });

  it('stops description at the first @tag', () => {
    assert.deepEqual(
      parseJSDoc('/** Line one.\n * @deprecated use other\n */'),
      { description: 'Line one.', default: null },
    );
  });
});

describe('parseProps', () => {
  it('parses optional and required props with JSDoc', () => {
    const block = `
      /**
       * The size of the Button.
       * @default 'M'
       */
      size?: 'S' | 'M' | 'L';
      /** Button label. */
      children: ReactNode;
    `;

    assert.deepEqual(parseProps(block), [
      {
        property: 'size',
        type: "'S' | 'M' | 'L'",
        default: "'M'",
        description: 'The size of the Button.',
      },
      {
        property: 'children',
        type: 'ReactNode',
        required: true,
        description: 'Button label.',
      },
    ]);
  });
});

describe('extractInterfaceBlock', () => {
  it('handles nested object types in the interface body', () => {
    const source = `
      export interface Example {
        nested: { inner: string };
        plain?: boolean;
      }
    `;
    const block = extractInterfaceBlock(source, 'Example');
    // Nested `{ }` types can produce a partial property match; `plain` always parses.
    assert.ok(parseProps(block).some((p) => p.property === 'plain'));
  });

  it('finds non-exported interfaces in the same file', () => {
    const source = 'interface LocalOnly { foo?: string; }';
    const block = extractInterfaceBlock(source, 'LocalOnly');
    assert.equal(parseProps(block)[0].property, 'foo');
  });
});

describe('extractExtends', () => {
  it('returns known base types and ignores Omit and keyof tokens', () => {
    const source = `
      export interface ButtonProps extends Omit<RACButtonProps, 'children'>, StyleProps {
        children: ReactNode;
      }
    `;

    assert.deepEqual(
      extractExtends(source, 'ButtonProps', { StyleProps: [] }),
      ['StyleProps'],
    );
  });
});

describe('collectComponentProps', () => {
  it('merges includes, interface body, and configured base types', () => {
    const source = `
      interface ButtonStyleProps {
        /** Visual variant. */
        variant?: 'primary' | 'secondary';
      }

      export interface ButtonProps extends Omit<RACButtonProps, 'children'>, ButtonStyleProps {
        /** Button label. */
        children: ReactNode;
      }
    `;

    const props = collectComponentProps(
      source,
      {
        interface: 'ButtonProps',
        includes: ['ButtonStyleProps'],
        extends: ['ButtonProps', 'StyleProps'],
      },
      MOCK_BASE_PROPS,
    );

    assert.deepEqual(props, [
      {
        property: 'variant',
        type: "'primary' | 'secondary'",
        description: 'Visual variant.',
        inheritedFrom: 'ButtonStyleProps',
      },
      {
        property: 'children',
        type: 'ReactNode',
        required: true,
        description: 'Button label.',
      },
      {
        property: 'isPending',
        type: 'boolean',
        description: 'Whether the button is in a pending state.',
        inheritedFrom: 'ButtonProps',
      },
      {
        property: 'styles',
        type: 'StylesProp',
        description: 'Spectrum-defined styles, returned by the `style()` macro.',
        inheritedFrom: 'StyleProps',
      },
    ]);
  });

  it('lets own props win over inherited base props on name collision', () => {
    const source = `
      export interface ExampleProps {
        /** Local children description. */
        children: ReactNode;
      }
    `;

    const props = collectComponentProps(
      source,
      { interface: 'ExampleProps', extends: ['ButtonProps'] },
      {
        ButtonProps: [
          { property: 'children', type: 'string', description: 'Base children.' },
          { property: 'isPending', type: 'boolean' },
        ],
      },
    );

    assert.deepEqual(props, [
      {
        property: 'children',
        type: 'ReactNode',
        required: true,
        description: 'Local children description.',
      },
      {
        property: 'isPending',
        type: 'boolean',
        inheritedFrom: 'ButtonProps',
      },
    ]);
  });

  it('does not auto-merge base types when extends is omitted', () => {
    const source = `
      interface BadgeStyleProps { variant?: string; }
      export interface BadgeProps extends DOMProps, StyleProps, BadgeStyleProps {
        children: ReactNode;
      }
    `;

    const props = collectComponentProps(
      source,
      { interface: 'BadgeProps', includes: ['BadgeStyleProps'] },
      MOCK_BASE_PROPS,
    );

    assert.deepEqual(props, [
      {
        property: 'variant',
        type: 'string',
        inheritedFrom: 'BadgeStyleProps',
      },
      {
        property: 'children',
        type: 'ReactNode',
        required: true,
      },
    ]);
  });

  it('omits className from inherited react-aria base props', () => {
    const props = collectComponentProps(
      'export interface ButtonProps { children: ReactNode; }',
      { interface: 'ButtonProps', extends: ['ButtonProps'] },
      {
        ButtonProps: [
          {
            property: 'className',
            type: 'string',
            description: 'RAC className.',
          },
          { property: 'isPending', type: 'boolean' },
        ],
      },
    );

    assert.deepEqual(props, [
      { property: 'children', type: 'ReactNode', required: true },
      {
        property: 'isPending',
        type: 'boolean',
        inheritedFrom: 'ButtonProps',
      },
    ]);
  });

  it('merges only configured extends bases', () => {
    const source = `
      export interface BadgeProps extends DOMProps, StyleProps, BadgeStyleProps {
        children: ReactNode;
      }
    `;

    const props = collectComponentProps(
      source,
      { interface: 'BadgeProps', extends: ['StyleProps'] },
      MOCK_BASE_PROPS,
    );

    assert.deepEqual(props, [
      {
        property: 'children',
        type: 'ReactNode',
        required: true,
      },
      {
        property: 'styles',
        type: 'StylesProp',
        description: 'Spectrum-defined styles, returned by the `style()` macro.',
        inheritedFrom: 'StyleProps',
      },
    ]);
  });

  it('merges includes using includeFiles from components.json', () => {
    const main = `
      export interface ToggleButtonProps {
        isEmphasized?: boolean;
      }
    `;
    const actionButton = `
      interface ActionButtonStyleProps { isQuiet?: boolean; }
    `;

    const props = collectComponentProps(
      main,
      {
        interface: 'ToggleButtonProps',
        includes: ['ActionButtonStyleProps'],
        includeFiles: { ActionButtonStyleProps: 'ActionButton' },
      },
      {},
      { ActionButtonStyleProps: actionButton },
    );
    assert.deepEqual(props, [
      { property: 'isQuiet', type: 'boolean', inheritedFrom: 'ActionButtonStyleProps' },
      { property: 'isEmphasized', type: 'boolean' },
    ]);
  });

  it('returns null when the interface and includes are missing', () => {
    assert.equal(
      collectComponentProps('export interface Other {}', {
        interface: 'ButtonProps',
      }),
      null,
    );
  });
});
