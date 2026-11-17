import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildIndex, buildComponentSlices } from '../../deps/build-status-index.js';
import { FIGMA_SOURCES } from '../../scripts/utils/figma-sources.js';

function design(sourceId, name = 'Button', node = '1:1') {
  const source = FIGMA_SOURCES.find((entry) => entry.id === sourceId);
  return {
    name,
    figmaPageId: node,
    source: source.id,
    platform: source.platform,
    figmaFile: source.fileKey,
  };
}

function build(figmaRoster, options = {}) {
  return buildIndex({ roster: [], readData: () => null, figmaRoster, ...options }).index;
}

function cell(index, name, platform) {
  return index.components.find((row) => row.name === name)?.platforms[platform]?.figma;
}

describe('platform-specific Figma resolution', () => {
  it('keeps same-named designs separate across web, iOS, and Android', () => {
    const index = build([
      design('s2-web'), design('s2-ios', 'Button', '2:1'), design('s2-android', 'Button', '3:1'),
    ]);
    assert.equal(index.components.length, 1);
    for (const [platform, source] of [['web', 's2-web'], ['ios', 's2-ios'], ['android', 's2-android']]) {
      assert.equal(cell(index, 'Button', platform)?.figmaSource, source);
      assert.equal(cell(index, 'Button', platform)?.status, 'available');
    }
    assert.deepEqual(index.implementations.ios, [{ id: 'figma', label: 'Figma' }]);
  });

  it('adds AI designs to the existing web Figma column', () => {
    const index = build([design('ai-toolkit', 'Prompt field')]);
    assert.equal(cell(index, 'PromptField', 'web')?.figmaFile, '3WdX799d7ptEVA6RuTESXs');
  });

  it('does not create web cells for native-only components', () => {
    const index = build([design('s2-ios', 'Native control')]);
    assert.equal(index.components[0]?.platforms.web, undefined);
    assert.equal(index.components[0]?.platforms.ios.figma.status, 'available');
  });

  it('supports source-specific aliases without reusing web aliases for native names', () => {
    const index = build([
      design('s2-web', 'Control'),
      design('ai-toolkit', 'Control'),
      design('s2-ios', 'Control'),
    ], {
      aliases: {
        figma: { Control: 'WebControl' },
        figmaSources: { 'ai-toolkit': { Control: 'PromptField' } },
      },
    });
    assert.equal(cell(index, 'WebControl', 'web')?.figmaSource, 's2-web');
    assert.equal(cell(index, 'PromptField', 'web')?.figmaSource, 'ai-toolkit');
    assert.equal(cell(index, 'Control', 'ios')?.figmaSource, 's2-ios');
  });

  it('rejects ambiguous same-platform matches instead of choosing fetch order', () => {
    const rows = [design('s2-web'), design('ai-toolkit')];
    for (const entries of [rows, [...rows].reverse()]) {
      assert.throws(() => build(entries), /ambiguous.*web.*Button/i);
    }
  });

  it('selects a matching source explicitly and preserves its file/node pair', () => {
    const index = build([design('s2-web'), design('ai-toolkit', 'Button', '2:2')], {
      overrides: { Button: { web: { figma: { status: 'available', figmaSource: 'ai-toolkit' } } } },
    });
    assert.deepEqual(cell(index, 'Button', 'web'), {
      status: 'available',
      figmaSource: 'ai-toolkit',
      figmaFile: '3WdX799d7ptEVA6RuTESXs',
      figmaPageId: '2:2',
    });
  });

  it('uses node selection when one source contains duplicate display names', () => {
    const index = build([design('s2-ios'), design('s2-ios', 'Button', '2:2')], {
      overrides: { Button: { ios: { figma: { status: 'available', figmaNodeId: '2:2' } } } },
    });
    assert.equal(cell(index, 'Button', 'ios')?.figmaPageId, '2:2');
  });

  it('rejects a selection for another platform', () => {
    assert.throws(() => build([design('s2-web'), design('s2-ios')], {
      overrides: { Button: { web: { figma: { status: 'available', figmaSource: 's2-ios' } } } },
    }), /unmatched.*web.*Button/i);
  });

  it('rejects an invalid page-source override before outputs are written', () => {
    assert.throws(() => build([design('s2-web')], {
      overrides: { Button: { web: { figma: { status: 'available', figmaPageSource: 'Missing' } } } },
    }), /unmatched.*web.*Button/i);
  });

  it('borrows both file and node from an explicit page-source redirect', () => {
    const index = build([design('ai-toolkit', 'Prompt field', '3:3')], {
      roster: [{ name: 'FieldLabel', sources: {} }],
      overrides: {
        FieldLabel: {
          web: {
            figma: {
              status: 'available', figmaPageSource: 'Prompt field', figmaSource: 'ai-toolkit',
            },
          },
        },
      },
    });
    assert.equal(cell(index, 'FieldLabel', 'web')?.figmaPageId, '3:3');
    assert.equal(cell(index, 'FieldLabel', 'web')?.figmaSource, 'ai-toolkit');
  });

  it('treats a two-field legacy roster entry only as S2 Web', () => {
    const index = build([{ name: 'Button', figmaPageId: '1:1' }]);
    assert.equal(cell(index, 'Button', 'web')?.figmaSource, 's2-web');
    assert.equal(cell(index, 'Button', 'ios'), undefined);
  });

  it('rejects source/file/platform disagreement', () => {
    for (const changes of [{ platform: 'ios' }, { figmaFile: 'wrong' }, { source: 'unknown' }]) {
      assert.throws(() => build([{ ...design('ai-toolkit'), ...changes }]), /Figma.*identity/i);
    }
  });

  it('keeps excluded web components available natively', () => {
    const index = build([design('s2-web'), design('s2-ios')], { excludes: ['Button'] });
    assert.equal(cell(index, 'Button', 'web'), undefined);
    assert.equal(cell(index, 'Button', 'ios')?.status, 'available');
  });

  it('writes the same selected references into platform-specific component slices', () => {
    const index = build([design('s2-web'), design('s2-ios')]);
    const { slices } = buildComponentSlices([], index.components, []);
    assert.equal(slices[0]?.data.web.figma.figmaSource, 's2-web');
    assert.equal(slices[0]?.data.ios.figma.figmaSource, 's2-ios');
    assert.equal(slices[0]?.data.figmaPageId, undefined);
  });
});
