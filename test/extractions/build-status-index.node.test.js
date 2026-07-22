import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  normalizeName,
  swcTagToPascal,
  canonicalNameForSwc,
  canonicalNameForFigma,
  canonicalNameForRsp,
  joinRosters,
  filterRoster,
  toIndexStatus,
  readSecondaries,
  applySecondaries,
  applyOverrides,
  buildIndex,
  statusLegend,
} from '../../deps/build-status-index.js';
import { STATUSES } from '../../scripts/utils/status-model.js';

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

describe('normalizeName', () => {
  it('title-cases and strips separators and parentheses to a canonical key', () => {
    assert.equal(normalizeName('Bar panel and toolbar'), 'BarPanelAndToolbar');
    assert.equal(normalizeName('App frame (Browsing)'), 'AppFrameBrowsing');
  });
});

describe('canonicalNameForFigma', () => {
  it('normalizes a Figma display name by default', () => {
    assert.equal(canonicalNameForFigma('Action button', {}), 'ActionButton');
  });

  it('lets an alias merge a Figma name into an existing canonical row', () => {
    assert.equal(canonicalNameForFigma('Table', { Table: 'TableView' }), 'TableView');
  });

  it('lets an identity alias preserve a name normalizeName would otherwise mangle', () => {
    // Without the alias, `normalizeName` strips the parens to `CardsAsset`, splitting the
    // row from the RSP export that aliases to `Cards (Asset)`.
    assert.equal(canonicalNameForFigma('Cards (Asset)', {}), 'CardsAsset');
    assert.equal(
      canonicalNameForFigma('Cards (Asset)', { 'Cards (Asset)': 'Cards (Asset)' }),
      'Cards (Asset)',
    );
  });
});

describe('canonicalNameForRsp', () => {
  it('uses the RSP export name as-is by default', () => {
    assert.equal(canonicalNameForRsp('DatePicker', {}), 'DatePicker');
  });

  it('lets an alias merge a differently-named RSP export into an existing canonical row', () => {
    assert.equal(canonicalNameForRsp('ToastContainer', { ToastContainer: 'Toast' }), 'Toast');
  });
});

describe('joinRosters', () => {
  it('joins RSP, SWC, and Figma entries that share a canonical name', () => {
    const roster = joinRosters(['ActionButton'], ['swc-action-button'], ['Action button'], {});
    assert.deepEqual(roster, [
      {
        name: 'ActionButton',
        sources: { rsp: 'ActionButton', swc: 'swc-action-button', figma: 'Action button' },
      },
    ]);
  });

  it('keeps an RSP-only component as a single-source row', () => {
    const roster = joinRosters(['TableView'], [], [], {});
    assert.deepEqual(roster, [
      { name: 'TableView', sources: { rsp: 'TableView' } },
    ]);
  });

  it('keeps a SWC-only component as a single-source row', () => {
    const roster = joinRosters([], ['swc-color-loupe'], [], {});
    assert.deepEqual(roster, [
      { name: 'ColorLoupe', sources: { swc: 'swc-color-loupe' } },
    ]);
  });

  it('keeps a Figma-only design as a single-source row (union membership)', () => {
    const roster = joinRosters([], [], ['Bar panel and toolbar'], {});
    assert.deepEqual(roster, [
      { name: 'BarPanelAndToolbar', sources: { figma: 'Bar panel and toolbar' } },
    ]);
  });

  it('merges a Figma name into an existing row via the figma alias map', () => {
    const roster = joinRosters(['TableView'], [], ['Table'], { figma: { Table: 'TableView' } });
    assert.deepEqual(roster, [
      { name: 'TableView', sources: { rsp: 'TableView', figma: 'Table' } },
    ]);
  });

  it('redirects a mismatched SWC tag via the swc alias map', () => {
    const roster = joinRosters(['Asset'], ['swc-asset'], [], { swc: { 'swc-asset': 'AssetView' } });
    const names = roster.map((r) => r.name).sort();
    assert.deepEqual(names, ['Asset', 'AssetView']);
    assert.deepEqual(roster.find((r) => r.name === 'AssetView').sources, { swc: 'swc-asset' });
  });

  it('merges a differently-named RSP export into an existing row via the rsp alias map', () => {
    const roster = joinRosters(
      ['ToastContainer'],
      [],
      ['Toast'],
      { rsp: { ToastContainer: 'Toast' } },
    );
    assert.deepEqual(roster, [
      { name: 'Toast', sources: { rsp: 'ToastContainer', figma: 'Toast' } },
    ]);
  });

  it('returns rows sorted by canonical name', () => {
    const roster = joinRosters(['Zebra', 'Alpha'], ['swc-mango'], [], {});
    assert.deepEqual(roster.map((r) => r.name), ['Alpha', 'Mango', 'Zebra']);
  });

  it('joins a parenthesized Figma card with its differently-named RSP export via aliases', () => {
    const roster = joinRosters(
      ['AssetCard'],
      [],
      ['Cards (Asset)'],
      {
        rsp: { AssetCard: 'Cards (Asset)' },
        figma: { 'Cards (Asset)': 'Cards (Asset)' },
      },
    );
    assert.deepEqual(roster, [
      { name: 'Cards (Asset)', sources: { rsp: 'AssetCard', figma: 'Cards (Asset)' } },
    ]);
  });

  it('splits a card into duplicate rows when the Figma identity alias is missing', () => {
    // Regression guard: without the figma identity alias, `normalizeName` yields `CardsAsset`
    // while the RSP alias yields `Cards (Asset)`, so the two never merge.
    const roster = joinRosters(
      ['AssetCard'],
      [],
      ['Cards (Asset)'],
      { rsp: { AssetCard: 'Cards (Asset)' } },
    );
    const names = roster.map((r) => r.name);
    assert.equal(names.length, 2);
    assert.ok(names.includes('CardsAsset'), 'Figma name normalizes to CardsAsset');
    assert.ok(names.includes('Cards (Asset)'), 'RSP alias stays Cards (Asset)');
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

  it('maps RSP alpha data to Available with an Alpha context', () => {
    assert.deepEqual(toIndexStatus('rsp', { props: [], status: 'alpha' }), {
      status: 'available',
      context: 'Alpha',
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
  const columns = [
    { id: 'figma', label: 'Figma' },
    { id: 'rsp', label: 'React Spectrum' },
    { id: 'swc', label: 'Spectrum Web Components' },
  ];

  const roster = [
    { name: 'ActionButton', sources: { rsp: 'ActionButton', swc: 'swc-action-button', figma: 'Action button' } },
    { name: 'Modal', sources: { rsp: 'Modal' } },
    { name: 'PromptField', sources: { swc: 'swc-prompt-field' } },
    { name: 'TableView', sources: { rsp: 'TableView' } },
    { name: 'BarPanelAndToolbar', sources: { figma: 'Bar panel and toolbar' } },
  ];

  const dataById = {
    'rsp:ActionButton': { props: [], status: 'stable' },
    'swc:swc-action-button': [{ attribute: 'x', since: '2.0.0', status: 'internal' }],
    // Present in the RSP roster but no doc page — the bridge yields null.
    'rsp:Modal': { props: [] },
    // Present in the SWC roster but no `since` — the bridge yields null.
    'swc:swc-prompt-field': [{ attribute: 'mode' }, { attribute: 'label' }],
    'rsp:TableView': { props: [], status: 'stable' },
    // Figma has no per-component data files; the reader always returns null for it.
  };
  const readData = (source, name) => dataById[`${source}:${name}`] ?? null;

  it('declares the columns (with labels) present for the platform', () => {
    const { index } = buildIndex({ roster, readData, columns });
    assert.deepEqual(index.implementations, { web: columns });
  });

  it('resolves each column from the roster + reader', () => {
    const { index } = buildIndex({ roster, readData, columns });
    const ab = index.components.find((c) => c.name === 'ActionButton');
    assert.deepEqual(ab.platforms.web.rsp, { status: 'available', context: 'Stable' });
    assert.deepEqual(ab.platforms.web.swc, { status: 'experimental' });
  });

  it('emits Not available for a source a component lacks', () => {
    const { index } = buildIndex({ roster, readData, columns });
    const tv = index.components.find((c) => c.name === 'TableView');
    assert.deepEqual(tv.platforms.web.swc, { status: 'not-available' });
    assert.deepEqual(tv.platforms.web.figma, { status: 'not-available' });
  });

  it('floors a present Figma design to Available (no data files)', () => {
    const { index } = buildIndex({ roster, readData, columns });
    const bpt = index.components.find((c) => c.name === 'BarPanelAndToolbar');
    assert.deepEqual(bpt.platforms.web.figma, { status: 'available' });
    assert.deepEqual(bpt.platforms.web.rsp, { status: 'not-available' });
    assert.deepEqual(bpt.platforms.web.swc, { status: 'not-available' });
  });

  it('floors an SWC roster member with no maturity signal to Available', () => {
    const { index } = buildIndex({ roster, readData, columns });
    const pf = index.components.find((c) => c.name === 'PromptField');
    assert.deepEqual(pf.platforms.web.swc, { status: 'available' });
    assert.deepEqual(pf.platforms.web.rsp, { status: 'not-available' });
  });

  it('floors an RSP roster member with no doc page to Available (no context)', () => {
    const { index } = buildIndex({ roster, readData, columns });
    const modal = index.components.find((c) => c.name === 'Modal');
    assert.deepEqual(modal.platforms.web.rsp, { status: 'available' });
  });

  it('de-PascalCases RSP/SWC row labels and title-cases Figma-only row labels', () => {
    const { index } = buildIndex({ roster, readData, columns });
    assert.equal(index.components.find((c) => c.name === 'ActionButton').label, 'Action Button');
    assert.equal(index.components.find((c) => c.name === 'BarPanelAndToolbar').label, 'Bar Panel and Toolbar');
  });

  it('layers secondary guidance onto the matching cell', () => {
    const secondaries = { swc: { TableView: 'Use Gen1' } };
    const { index } = buildIndex({
      roster, readData, columns, secondaries,
    });
    const tv = index.components.find((c) => c.name === 'TableView');
    assert.equal(tv.platforms.web.swc.secondary, 'Use Gen1');
  });

  it('embeds a self-describing status legend for every status in the model', () => {
    const { index } = buildIndex({ roster, readData, columns });
    assert.deepEqual(Object.keys(index.statuses), Object.keys(STATUSES));
    assert.deepEqual(index.statuses.available, {
      label: STATUSES.available.label,
      definition: STATUSES.available.definition,
    });
  });

  it('omits the presentation-only color token from the legend', () => {
    assert.ok(!('color' in statusLegend().available));
  });
});

describe('readSecondaries', () => {
  const columns = [{ id: 'rsp' }, { id: 'swc' }, { id: 'figma' }];

  it('keys each overlay entry by canonical name, applying figma aliases', () => {
    const overlays = {
      rsp: [{ name: 'Alert Dialog', context: 'Use Dialog component' }],
      swc: [{ name: 'Table', context: 'Use Gen1' }],
      figma: null,
    };
    const secondaries = readSecondaries(columns, (id) => overlays[id], { figma: { Table: 'TableView' } });
    assert.equal(secondaries.rsp.AlertDialog, 'Use Dialog component');
    assert.equal(secondaries.swc.TableView, 'Use Gen1');
    assert.ok(!('figma' in secondaries));
  });
});

describe('applySecondaries', () => {
  const components = () => [
    { name: 'TableView', platforms: { web: { swc: { status: 'not-available' } } } },
  ];

  it('sets the secondary line on a matched cell', () => {
    const comps = components();
    applySecondaries(comps, { swc: { TableView: 'Use Gen1' } });
    assert.equal(comps[0].platforms.web.swc.secondary, 'Use Gen1');
  });

  it('warns when an overlay entry matches no component', () => {
    const warnings = applySecondaries(components(), { swc: { Nonexistent: 'x' } });
    assert.ok(warnings.some((w) => /unmatched/i.test(w) && /Nonexistent/.test(w)));
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
