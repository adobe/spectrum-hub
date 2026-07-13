import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  swcTagToPascal,
  canonicalNameForSwc,
  joinRosters,
  filterRoster,
  toIndexStatus,
  applyOverrides,
  buildIndex,
} from '../../deps/build-status-index.js';

describe('swcTagToPascal', () => {
  it('strips the swc- prefix and converts kebab to Pascal', () => {
    assert.equal(swcTagToPascal('swc-action-button'), 'ActionButton');
  });

  it('handles a single-word tag', () => {
    assert.equal(swcTagToPascal('swc-button'), 'Button');
  });

  it('is a no-op-ish for an already unprefixed word', () => {
    assert.equal(swcTagToPascal('swc-icon'), 'Icon');
  });
});

describe('canonicalNameForSwc', () => {
  it('uses the mechanical normalization by default', () => {
    assert.equal(canonicalNameForSwc('swc-action-button', {}), 'ActionButton');
  });

  it('lets an alias override the mechanical name', () => {
    const aliases = { 'swc-cta': 'CallToAction' };
    assert.equal(canonicalNameForSwc('swc-cta', aliases), 'CallToAction');
  });
});

describe('joinRosters', () => {
  it('joins RSP and SWC entries that share a canonical name', () => {
    const roster = joinRosters(['ActionButton'], ['swc-action-button'], {});
    assert.deepEqual(roster, [
      { name: 'ActionButton', sources: { rsp: 'ActionButton', swc: 'swc-action-button' } },
    ]);
  });

  it('keeps an RSP-only component as a single-impl row', () => {
    const roster = joinRosters(['TableView'], [], {});
    assert.deepEqual(roster, [
      { name: 'TableView', sources: { rsp: 'TableView' } },
    ]);
  });

  it('keeps a SWC-only component as a single-impl row', () => {
    const roster = joinRosters([], ['swc-color-loupe'], {});
    assert.deepEqual(roster, [
      { name: 'ColorLoupe', sources: { swc: 'swc-color-loupe' } },
    ]);
  });

  it('redirects a mismatched SWC tag via the alias file', () => {
    const roster = joinRosters(['Asset'], ['swc-asset'], { 'swc-asset': 'AssetView' });
    const names = roster.map((r) => r.name).sort();
    assert.deepEqual(names, ['Asset', 'AssetView']);
    const assetView = roster.find((r) => r.name === 'AssetView');
    assert.deepEqual(assetView.sources, { swc: 'swc-asset' });
    const asset = roster.find((r) => r.name === 'Asset');
    assert.deepEqual(asset.sources, { rsp: 'Asset' });
  });

  it('returns rows sorted by canonical name', () => {
    const roster = joinRosters(['Zebra', 'Alpha'], ['swc-mango'], {});
    assert.deepEqual(roster.map((r) => r.name), ['Alpha', 'Mango', 'Zebra']);
  });
});

describe('filterRoster', () => {
  const roster = [
    { name: 'AccordionItem', sources: { rsp: 'AccordionItem', swc: 'swc-accordion-item' } },
    { name: 'Button', sources: { rsp: 'Button', swc: 'swc-button' } },
    { name: 'Cell', sources: { rsp: 'Cell' } },
  ];

  it('drops excluded components from every implementation at once', () => {
    const result = filterRoster(roster, ['AccordionItem', 'Cell']);
    assert.deepEqual(result.map((r) => r.name), ['Button']);
  });

  it('is a no-op with an empty exclusion list', () => {
    assert.equal(filterRoster(roster, []).length, 3);
    assert.equal(filterRoster(roster).length, 3);
  });

  it('ignores exclusion names not present in the roster', () => {
    assert.equal(filterRoster(roster, ['Nonexistent']).length, 3);
  });
});

describe('toIndexStatus', () => {
  it('maps RSP stable data to Available with a Stable context', () => {
    assert.deepEqual(toIndexStatus('rsp', { props: [], status: 'stable' }), {
      status: 'available',
      context: 'Stable',
    });
  });

  it('maps RSP alpha data to Experimental with no context', () => {
    assert.deepEqual(toIndexStatus('rsp', { props: [], status: 'alpha' }), {
      status: 'experimental',
    });
  });

  it('maps SWC internal-only data to Experimental', () => {
    const data = [{ attribute: 'x', since: '2.0.0', status: 'internal' }];
    assert.deepEqual(toIndexStatus('swc', data), { status: 'experimental' });
  });

  it('maps SWC released public data to Available', () => {
    const data = [{ attribute: 'x', since: '2.0.0' }];
    assert.deepEqual(toIndexStatus('swc', data), { status: 'available', context: 'Stable' });
  });

  it('maps absent data to Not available', () => {
    assert.deepEqual(toIndexStatus('rsp', null), { status: 'not-available' });
    assert.deepEqual(toIndexStatus('swc', null), { status: 'not-available' });
  });
});

describe('buildIndex', () => {
  const implementations = [
    { id: 'rsp', label: 'React Spectrum' },
    { id: 'swc', label: 'Spectrum Web Components' },
  ];

  const roster = [
    { name: 'ActionButton', sources: { rsp: 'ActionButton', swc: 'swc-action-button' } },
    { name: 'Modal', sources: { rsp: 'Modal' } },
    { name: 'PromptField', sources: { swc: 'swc-prompt-field' } },
    { name: 'TableView', sources: { rsp: 'TableView' } },
  ];

  const dataById = {
    'rsp:ActionButton': { props: [], status: 'stable' },
    'swc:swc-action-button': [{ attribute: 'x', since: '2.0.0', status: 'internal' }],
    // Present in the RSP roster but no doc page — the bridge yields null.
    'rsp:Modal': { props: [] },
    // Present in the SWC roster but no `since` — the bridge yields null.
    'swc:swc-prompt-field': [{ attribute: 'mode' }, { attribute: 'label' }],
    'rsp:TableView': { props: [], status: 'stable' },
  };
  const readData = (source, name) => dataById[`${source}:${name}`] ?? null;

  it('declares the implementations present for the platform', () => {
    const { index } = buildIndex({ roster, readData, implementations });
    assert.deepEqual(index.implementations, { web: ['rsp', 'swc'] });
  });

  it('resolves each implementation column from the roster + reader', () => {
    const { index } = buildIndex({ roster, readData, implementations });
    const ab = index.components.find((c) => c.name === 'ActionButton');
    assert.deepEqual(ab.platforms.web.rsp, { status: 'available', context: 'Stable' });
    assert.deepEqual(ab.platforms.web.swc, { status: 'experimental' });
  });

  it('emits Not available for an implementation a component lacks', () => {
    const { index } = buildIndex({ roster, readData, implementations });
    const tv = index.components.find((c) => c.name === 'TableView');
    assert.deepEqual(tv.platforms.web.swc, { status: 'not-available' });
  });

  it('floors an SWC roster member with no maturity signal to Experimental', () => {
    const { index } = buildIndex({ roster, readData, implementations });
    const pf = index.components.find((c) => c.name === 'PromptField');
    // Present in SWC (in the roster) but the bridge could not derive maturity.
    assert.deepEqual(pf.platforms.web.swc, { status: 'experimental' });
    // The implementation that does not ship it still reads Not available.
    assert.deepEqual(pf.platforms.web.rsp, { status: 'not-available' });
  });

  it('floors an RSP roster member with no doc page to Available (no context)', () => {
    const { index } = buildIndex({ roster, readData, implementations });
    const modal = index.components.find((c) => c.name === 'Modal');
    // Ships in stable S2; no doc page is not a maturity signal.
    assert.deepEqual(modal.platforms.web.rsp, { status: 'available' });
    assert.deepEqual(modal.platforms.web.swc, { status: 'not-available' });
  });
});

describe('applyOverrides', () => {
  const base = () => [
    {
      name: 'ActionButton',
      platforms: { web: { rsp: { status: 'available', context: 'Stable' }, swc: { status: 'experimental' } } },
    },
  ];

  it('forces a status and carries note + context', () => {
    const overrides = {
      ActionButton: { web: { swc: { status: 'deprecated', note: 'superseded by Button' } } },
    };
    const { components } = applyOverrides(base(), overrides);
    assert.deepEqual(components[0].platforms.web.swc, {
      status: 'deprecated',
      note: 'superseded by Button',
    });
  });

  it('warns on a redundant override that matches the auto status', () => {
    const overrides = { ActionButton: { web: { swc: { status: 'experimental' } } } };
    const { warnings } = applyOverrides(base(), overrides);
    assert.ok(warnings.some((w) => /redundant/i.test(w) && /ActionButton/.test(w)));
  });

  it('warns on an override for an unknown component', () => {
    const overrides = { Nonexistent: { web: { rsp: { status: 'deprecated' } } } };
    const { warnings } = applyOverrides(base(), overrides);
    assert.ok(warnings.some((w) => /unknown component/i.test(w) && /Nonexistent/.test(w)));
  });

  it('warns on an override that targets an implementation the component lacks', () => {
    const overrides = { ActionButton: { web: { ios: { status: 'available' } } } };
    const { warnings } = applyOverrides(base(), overrides);
    assert.ok(warnings.some((w) => /ios/.test(w)));
  });

  it('warns on an override with an unknown status id', () => {
    const overrides = { ActionButton: { web: { rsp: { status: 'bogus' } } } };
    const { warnings } = applyOverrides(base(), overrides);
    assert.ok(warnings.some((w) => /bogus/.test(w)));
  });
});
