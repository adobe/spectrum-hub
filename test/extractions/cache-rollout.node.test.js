import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { buildComponentSlices } from '../../deps/build-status-index.js';

// TODO(cache-rollout): Remove this suite with the legacy root field in figma-rollout-3-cleanup.
// Retain shared-web/native isolation coverage in the permanent extraction suites.
describe('transitional status slices', () => {
  const webFigma = {
    status: 'available',
    figmaSource: 's2-web',
    figmaFile: 'xHBWBBIe2eo5vwoCeNrC4Q',
    figmaPageId: '1:2',
  };

  it('keeps old Web consumers linked without mutating index platform data', () => {
    const component = { name: 'Button', platforms: { web: { figma: webFigma } } };
    const { slices } = buildComponentSlices([], [component]);
    assert.equal(slices[0].data.figmaPageId, '1:2');
    assert.equal(slices[0].data.web.figma, webFigma);
    assert.equal(component.platforms.figmaPageId, undefined);
  });

  it('preserves the legacy field on shared Web slices without leaking it into native slices', () => {
    const { slices } = buildComponentSlices([], [{
      name: 'CloseButton',
      platforms: {
        web: { figma: webFigma, rsp: { status: 'available', page: 'button' } },
        ios: { figma: { ...webFigma, figmaSource: 's2-ios' } },
      },
    }]);
    const web = slices.find(({ slug }) => slug === 'button');
    const native = slices.find(({ slug }) => slug === 'close-button');
    assert.equal(web.data.figmaPageId, '1:2');
    assert.equal(native.data.figmaPageId, undefined);
    assert.deepEqual(Object.keys(native.data), ['ios']);
  });

  it('never publishes a non-Web node as a legacy S2 Web reference', () => {
    const { slices } = buildComponentSlices([], [{
      name: 'ResponseStatus',
      platforms: {
        web: { figma: { ...webFigma, figmaSource: 'ai-toolkit', figmaFile: 'toolkit' } },
        ios: { figma: { ...webFigma, figmaSource: 's2-ios', figmaFile: 'ios' } },
      },
    }]);
    assert.equal(slices[0].data.figmaPageId, undefined);
  });

  it('commits regenerated legacy fields wherever the selected reference is S2 Web', () => {
    const directory = new URL('../../deps/status/', import.meta.url);
    const index = JSON.parse(readFileSync(new URL('../../deps/status-index.json', import.meta.url), 'utf8'));
    const { slices } = buildComponentSlices([], index.components);
    const slugs = new Set(slices.map(({ slug }) => slug));
    let selectedWebCount = 0;
    for (const slug of slugs) {
      const slice = JSON.parse(readFileSync(new URL(`${slug}.json`, directory), 'utf8'));
      if (slice.web?.figma?.figmaSource === 's2-web') {
        selectedWebCount += 1;
        assert.equal(slice.figmaPageId, slice.web.figma.figmaPageId, slug);
      }
    }
    assert.ok(selectedWebCount > 0);
  });
});
