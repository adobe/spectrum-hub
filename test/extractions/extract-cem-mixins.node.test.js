import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { collectMixins } from '../../deps/swc/extract-cem-mixins.js';

describe('collectMixins', () => {
  it('collects own attributes for classes referenced by inheritedFrom', () => {
    const cem = {
      modules: [
        {
          declarations: [
            {
              name: 'Button',
              tagName: 'swc-button',
              attributes: [
                {
                  name: 'disabled',
                  fieldName: 'disabled',
                  inheritedFrom: { name: 'ButtonBase' },
                },
              ],
            },
            {
              name: 'ButtonBase',
              attributes: [
                {
                  name: 'disabled',
                  fieldName: 'disabled',
                  type: { text: 'boolean' },
                  default: 'false',
                  description: 'Whether the button is disabled.',
                },
                {
                  name: 'pending',
                  fieldName: 'pending',
                  type: { text: 'boolean' },
                  default: 'false',
                },
              ],
            },
          ],
        },
      ],
    };

    assert.deepEqual(collectMixins(cem), {
      ButtonBase: [
        {
          attribute: 'disabled',
          property: 'disabled',
          type: 'boolean',
          default: 'false',
          description: 'Whether the button is disabled.',
        },
        {
          attribute: 'pending',
          property: 'pending',
          type: 'boolean',
          default: 'false',
        },
      ],
    });
  });

  it('skips inherited and duplicate attributes in collected mixins', () => {
    const cem = {
      modules: [
        {
          declarations: [
            {
              name: 'Button',
              tagName: 'swc-button',
              attributes: [
                {
                  name: 'size',
                  fieldName: 'size',
                  inheritedFrom: { name: 'ButtonBase' },
                },
              ],
            },
            {
              name: 'ButtonBase',
              attributes: [
                {
                  name: 'size',
                  fieldName: 'size',
                  type: { text: 'ElementSize' },
                },
                {
                  name: 'size',
                  fieldName: 'size',
                  type: { text: 'ElementSize' },
                },
                {
                  name: 'disabled',
                  fieldName: 'disabled',
                  inheritedFrom: { name: 'Focusable' },
                },
              ],
            },
          ],
        },
      ],
    };

    assert.deepEqual(collectMixins(cem), {
      ButtonBase: [
        {
          attribute: 'size',
          property: 'size',
          type: 'ElementSize',
        },
      ],
    });
  });
});
