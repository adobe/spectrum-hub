import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { collectTags } from '../../deps/swc/discover-components.js';

describe('collectTags', () => {
  it('collects tagName declarations, sorted and deduped', () => {
    const cem = {
      modules: [
        {
          declarations: [
            { name: 'Button', tagName: 'swc-button' },
            { name: 'Badge', tagName: 'swc-badge' },
          ],
        },
        {
          declarations: [
            // Duplicate tagName from a base declaration — collapsed to one entry.
            { name: 'ButtonBase', tagName: 'swc-button' },
            { name: 'Accordion', tagName: 'swc-accordion' },
          ],
        },
      ],
    };

    assert.deepEqual(collectTags(cem), [
      'swc-accordion',
      'swc-badge',
      'swc-button',
    ]);
  });

  it('includes declarations regardless of status (e.g. internal)', () => {
    const cem = {
      modules: [
        {
          declarations: [
            { name: 'Button', tagName: 'swc-button' },
            // swc-asset / swc-icon are internal but still documented in the hub.
            { name: 'Asset', tagName: 'swc-asset', status: 'internal' },
          ],
        },
      ],
    };

    assert.deepEqual(collectTags(cem), ['swc-asset', 'swc-button']);
  });

  it('ignores declarations without a tagName and handles empty modules', () => {
    const cem = {
      modules: [
        { declarations: [{ name: 'ButtonBase' }] },
        {},
      ],
    };

    assert.deepEqual(collectTags(cem), []);
  });
});
