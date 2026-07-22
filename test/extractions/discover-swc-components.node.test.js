import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { collectComponents } from '../../deps/swc/discover-components.js';

describe('collectComponents', () => {
  it('maps each bare name to the directory of its module path, sorted', () => {
    const cem = {
      modules: [
        { path: 'components/button/Button.ts', declarations: [{ tagName: 'swc-button' }] },
        { path: 'components/badge/Badge.ts', declarations: [{ tagName: 'swc-badge' }] },
      ],
    };

    assert.deepEqual(collectComponents(cem), {
      badge: 'components/badge',
      button: 'components/button',
    });
  });

  it('gives every tag in a family module the same subpath', () => {
    const cem = {
      modules: [
        {
          path: 'components/tabs/Tabs.ts',
          declarations: [
            { tagName: 'swc-tabs' },
            { tagName: 'swc-tab' },
            { tagName: 'swc-tab-panel' },
          ],
        },
      ],
    };

    assert.deepEqual(collectComponents(cem), {
      tab: 'components/tabs',
      'tab-panel': 'components/tabs',
      tabs: 'components/tabs',
    });
  });

  it('derives pattern subpaths, including the divergent suggestion-group folder', () => {
    const cem = {
      modules: [
        {
          path: 'patterns/conversational-ai/suggestion/SuggestionGroup.ts',
          declarations: [{ tagName: 'swc-suggestion-group' }],
        },
      ],
    };

    assert.deepEqual(collectComponents(cem), {
      'suggestion-group': 'patterns/conversational-ai/suggestion',
    });
  });

  it('skips ../core base-class modules so the in-package declaration wins', () => {
    const cem = {
      modules: [
        { path: 'components/color-loupe/ColorLoupe.ts', declarations: [{ tagName: 'swc-color-loupe' }] },
        { path: '../core/components/color-loupe/ColorLoupe.base.ts', declarations: [{ tagName: 'swc-color-loupe' }] },
      ],
    };

    assert.deepEqual(collectComponents(cem), {
      'color-loupe': 'components/color-loupe',
    });
  });

  it('includes declarations regardless of status (e.g. internal)', () => {
    const cem = {
      modules: [
        { path: 'components/asset/Asset.ts', declarations: [{ tagName: 'swc-asset', status: 'internal' }] },
      ],
    };

    assert.deepEqual(collectComponents(cem), { asset: 'components/asset' });
  });

  it('ignores declarations without a tagName and handles empty modules', () => {
    const cem = {
      modules: [
        { path: 'components/button/Button.base.ts', declarations: [{ name: 'ButtonBase' }] },
        {},
      ],
    };

    assert.deepEqual(collectComponents(cem), {});
  });
});
