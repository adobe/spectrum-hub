import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  extractAllFromSource,
  extractInterfaceBlock,
  findInterfaceNames,
  parseProps,
} from '../../deps/rsp/extract-base-props.js';

describe('findInterfaceNames', () => {
  it('returns only exported interface names', () => {
    const source = `
      interface HiddenProps { hidden?: boolean; }
      export interface VisibleProps { visible?: boolean; }
      export interface OtherProps { other: string; }
    `;

    assert.deepEqual(findInterfaceNames(source), ['VisibleProps', 'OtherProps']);
  });
});

describe('extractAllFromSource', () => {
  it('collects props from every exported interface with parseable members', () => {
    const source = `
      export interface ButtonProps {
        /** Whether the button is disabled. */
        isDisabled?: boolean;
      }

      export interface ButtonRenderProps {
        isHovered: boolean;
      }

      export interface EmptyProps {}
    `;

    const result = {};
    const count = extractAllFromSource(source, result);

    assert.equal(count, 2);
    assert.deepEqual(result, {
      ButtonProps: [
        {
          property: 'isDisabled',
          type: 'boolean',
          description: 'Whether the button is disabled.',
        },
      ],
      ButtonRenderProps: [
        {
          property: 'isHovered',
          type: 'boolean',
          required: true,
        },
      ],
    });
  });

  it('parses aria attribute property names', () => {
    const source = `
      export interface LabelableProps {
        'aria-label'?: string;
        'aria-labelledby'?: string;
      }
    `;

    const result = {};
    extractAllFromSource(source, result);

    assert.deepEqual(result.LabelableProps.map((p) => p.property), [
      "'aria-label'",
      "'aria-labelledby'",
    ]);
  });

  it('skips interfaces with no parseable properties', () => {
    const source = `
      export interface StubProps extends OtherProps {}
      export interface EmptyProps {}
    `;

    const result = { Existing: [{ property: 'keep', type: 'boolean' }] };
    const count = extractAllFromSource(source, result);

    assert.equal(count, 0);
    assert.deepEqual(result, {
      Existing: [{ property: 'keep', type: 'boolean' }],
    });
  });
});

describe('extractInterfaceBlock', () => {
  it('extracts simple properties when object-typed members are present', () => {
    const source = `
      export interface StyleProps {
        styles?: { color: string };
        margin?: number;
      }
    `;

    const block = extractInterfaceBlock(source, 'StyleProps');
    assert.ok(parseProps(block).some((p) => p.property === 'margin'));
  });
});
