import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { collectComponentData } from '../../deps/swc/extract-cem-components.js';

describe('collectComponentData', () => {
  it('filters one 2nd-gen CEM by tagName and formats declaration attributes', () => {
    const cem = {
      modules: [
        {
          declarations: [
            {
              name: 'Button',
              tagName: 'swc-button',
              status: 'preview',
              since: '2.0.0',
              attributes: [
                {
                  name: 'variant',
                  fieldName: 'variant',
                  type: { text: 'ButtonVariant' },
                  default: "'primary'",
                  description: 'The visual variant of the button.',
                },
                {
                  name: 'disabled',
                  fieldName: 'disabled',
                  type: { text: 'boolean' },
                  default: 'false',
                  description: 'Whether the button is disabled.',
                  inheritedFrom: {
                    name: 'ButtonBase',
                    module: '../core/components/button/Button.base.ts',
                  },
                },
              ],
              superclass: {
                name: 'ButtonBase',
                module: '@spectrum-web-components/core/components/button',
                package: '@spectrum-web-components/core',
              },
            },
            {
              name: 'Badge',
              tagName: 'swc-badge',
              attributes: [
                {
                  name: 'variant',
                  fieldName: 'variant',
                  type: { text: 'BadgeVariant' },
                },
              ],
            },
          ],
        },
      ],
    };

    const rows = collectComponentData(cem, 'swc-button');

    assert.deepEqual(rows, [
      {
        attribute: 'variant',
        property: 'variant',
        type: 'ButtonVariant',
        default: "'primary'",
        description: 'The visual variant of the button.',
        status: 'preview',
        since: '2.0.0',
      },
      {
        attribute: 'disabled',
        property: 'disabled',
        type: 'boolean',
        default: 'false',
        description: 'Whether the button is disabled.',
        inheritedFrom: 'ButtonBase',
        status: 'preview',
        since: '2.0.0',
      },
    ]);
  });

  it('uses the first tagName declaration when inherited base declarations share the tag', () => {
    const cem = {
      modules: [
        {
          declarations: [
            {
              name: 'ColorLoupe',
              tagName: 'swc-color-loupe',
              since: '0.0.1',
              attributes: [
                {
                  name: 'open',
                  fieldName: 'open',
                  type: { text: 'boolean' },
                },
              ],
            },
          ],
        },
        {
          declarations: [
            {
              name: 'ColorLoupeBase',
              tagName: 'swc-color-loupe',
              attributes: [
                {
                  name: 'open',
                  fieldName: 'open',
                  type: { text: 'boolean' },
                  inheritedFrom: { name: 'ColorLoupeBase' },
                },
              ],
            },
          ],
        },
      ],
    };

    assert.deepEqual(collectComponentData(cem, 'swc-color-loupe'), [
      {
        attribute: 'open',
        property: 'open',
        type: 'boolean',
        since: '0.0.1',
      },
    ]);
  });
});
