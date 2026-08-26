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
  standaloneSwcTags,
  excludeInternalSwc,
  toIndexStatus,
  readSecondaries,
  applySecondaries,
  applyOverrides,
  buildIndex,
  buildComponentSlices,
  buildImplAliases,
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

  it('reads the canonical name off an object-shaped alias entry', () => {
    const aliases = { 'swc-cta': { canonical: 'CallToAction', externalName: 'swc-cta' } };
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

  it('reads the canonical name off an object-shaped alias entry', () => {
    const aliases = { ActionButtonGroup: { canonical: 'ActionGroup', externalName: 'ActionButtonGroup' } };
    assert.equal(canonicalNameForRsp('ActionButtonGroup', aliases), 'ActionGroup');
  });
});

describe('joinRosters', () => {
  it('joins RSP, SWC, and Figma entries that share a canonical name', () => {
    const roster = joinRosters(['ActionButton'], ['swc-action-button'], ['Action button'], {});
    assert.deepEqual(roster, [
      {
        name: 'ActionButton',
        sources: { rsp: 'ActionButton', swc: 'swc-action-button', figma: 'Action button' },
        externalNames: {},
      },
    ]);
  });

  it('keeps an RSP-only component as a single-source row', () => {
    const roster = joinRosters(['TableView'], [], [], {});
    assert.deepEqual(roster, [
      { name: 'TableView', sources: { rsp: 'TableView' }, externalNames: {} },
    ]);
  });

  it('keeps a SWC-only component as a single-source row', () => {
    const roster = joinRosters([], ['swc-color-loupe'], [], {});
    assert.deepEqual(roster, [
      { name: 'ColorLoupe', sources: { swc: 'swc-color-loupe' }, externalNames: {} },
    ]);
  });

  it('keeps a Figma-only design as a single-source row (union membership)', () => {
    const roster = joinRosters([], [], ['Bar panel and toolbar'], {});
    assert.deepEqual(roster, [
      { name: 'BarPanelAndToolbar', sources: { figma: 'Bar panel and toolbar' }, externalNames: {} },
    ]);
  });

  it('merges a Figma name into an existing row via the figma alias map', () => {
    const roster = joinRosters(['TableView'], [], ['Table'], { figma: { Table: 'TableView' } });
    assert.deepEqual(roster, [
      { name: 'TableView', sources: { rsp: 'TableView', figma: 'Table' }, externalNames: {} },
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
      { name: 'Toast', sources: { rsp: 'ToastContainer', figma: 'Toast' }, externalNames: {} },
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
      { name: 'Cards (Asset)', sources: { rsp: 'AssetCard', figma: 'Cards (Asset)' }, externalNames: {} },
    ]);
  });

  it('records a verified external name from an object-shaped rsp alias entry', () => {
    const roster = joinRosters(
      ['ActionButtonGroup'],
      [],
      [],
      { rsp: { ActionButtonGroup: { canonical: 'ActionGroup', externalName: 'ActionButtonGroup' } } },
    );
    assert.deepEqual(roster, [
      {
        name: 'ActionGroup',
        sources: { rsp: 'ActionButtonGroup' },
        externalNames: { rsp: 'ActionButtonGroup' },
      },
    ]);
  });

  it('does not set an external name for a plain-string alias entry (no verified direction)', () => {
    const roster = joinRosters(['ToastContainer'], [], [], { rsp: { ToastContainer: 'Toast' } });
    assert.deepEqual(roster[0].externalNames, {});
  });

  it('keeps the first-found external name across a many-to-one merge, regardless of order', () => {
    const aliases = {
      rsp: {
        CardPreview: 'Cards',
        Card: { canonical: 'Cards', externalName: 'Card' },
        CardView: 'Cards',
      },
    };
    const forward = joinRosters(['CardPreview', 'Card', 'CardView'], [], [], aliases);
    const reversed = joinRosters(['CardView', 'Card', 'CardPreview'], [], [], aliases);
    assert.equal(forward[0].externalNames.rsp, 'Card');
    assert.equal(reversed[0].externalNames.rsp, 'Card');
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

describe('standaloneSwcTags', () => {
  it('keeps components/* tags and drops patterns/* tags', () => {
    const components = {
      button: 'components/button',
      tabs: 'components/tabs',
      'suggestion-group': 'patterns/conversational-ai/suggestion',
      'response-status-step': 'patterns/conversational-ai/response-status/response-status-step',
    };
    assert.deepEqual(standaloneSwcTags(components), ['swc-button', 'swc-tabs']);
  });

  it('returns tags in components.json key order', () => {
    assert.deepEqual(
      standaloneSwcTags({ tabs: 'components/tabs', accordion: 'components/accordion' }),
      ['swc-tabs', 'swc-accordion'],
    );
  });
});

describe('excludeInternalSwc', () => {
  const dataByTag = {
    'swc-asset': [{ attribute: 'a', since: '2.0.0', status: 'internal' }],
    'swc-button': [{ attribute: 'b', since: '2.0.0' }],
    'swc-prompt-field': [{ attribute: 'c' }], // no since -> no maturity signal
  };
  const readData = (tag) => dataByTag[tag] ?? null;

  it('drops a tag whose extraction resolves to internal', () => {
    const tags = ['swc-asset', 'swc-button', 'swc-prompt-field'];
    assert.deepEqual(excludeInternalSwc(tags, readData), ['swc-button', 'swc-prompt-field']);
  });

  it('keeps a tag with no extraction data (floored later)', () => {
    assert.deepEqual(excludeInternalSwc(['swc-missing'], readData), ['swc-missing']);
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

  it('maps SWC internal-only data to Not available (internal is unmapped)', () => {
    // Internal components are excluded upstream (excludeInternalSwc), so the adapter no
    // longer maps `internal`; a stray value falls through to Not available.
    const data = [{ attribute: 'x', since: '2.0.0', status: 'internal' }];
    assert.deepEqual(toIndexStatus('swc', data), { status: 'not-available' });
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
    'swc:swc-action-button': [{ attribute: 'x', since: '2.0.0' }],
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
    assert.deepEqual(ab.platforms.web.swc, { status: 'available', context: 'Stable' });
  });

  it('carries a roster entry\'s externalNames onto the matching cell as originalName', () => {
    const aliasedRoster = [
      { name: 'ActionGroup', sources: { rsp: 'ActionButtonGroup' }, externalNames: { rsp: 'ActionButtonGroup' } },
    ];
    const { index } = buildIndex({
      roster: aliasedRoster,
      readData: () => ({ props: [], status: 'stable' }),
      columns,
    });
    const ag = index.components.find((c) => c.name === 'ActionGroup');
    assert.equal(ag.platforms.web.rsp.originalName, 'ActionButtonGroup');
  });

  it('omits originalName when the roster entry has no externalNames entry for that column', () => {
    const { index } = buildIndex({ roster, readData, columns });
    const ab = index.components.find((c) => c.name === 'ActionButton');
    assert.ok(!Object.hasOwn(ab.platforms.web.rsp, 'originalName'));
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

  it('sets hasPage: false without changing the status', () => {
    const overrides = { ActionButton: { web: { rsp: { status: 'available', hasPage: false } } } };
    const { components } = applyOverrides(base(), overrides);
    assert.deepEqual(components[0].platforms.web.rsp, { status: 'available', hasPage: false });
  });

  it('does not warn as redundant when only hasPage changes', () => {
    const overrides = { ActionButton: { web: { rsp: { status: 'available', context: 'Stable', hasPage: false } } } };
    const { warnings } = applyOverrides(base(), overrides);
    assert.ok(!warnings.some((w) => /redundant/i.test(w)));
  });

  it('omits hasPage from the cell when true (the default)', () => {
    const overrides = { ActionButton: { web: { rsp: { status: 'deprecated', hasPage: true } } } };
    const { components } = applyOverrides(base(), overrides);
    assert.ok(!Object.hasOwn(components[0].platforms.web.rsp, 'hasPage'));
  });

  it('carries a page override onto the cell', () => {
    const overrides = {
      ActionButton: { web: { swc: { status: 'experimental', page: 'action-button-and-group' } } },
    };
    const { components } = applyOverrides(base(), overrides);
    assert.equal(components[0].platforms.web.swc.page, 'action-button-and-group');
  });

  it('does not warn as redundant when only page changes', () => {
    const overrides = {
      ActionButton: { web: { swc: { status: 'experimental', page: 'action-button-and-group' } } },
    };
    const { warnings } = applyOverrides(base(), overrides);
    assert.ok(!warnings.some((w) => /redundant/i.test(w)));
  });
});

describe('buildComponentSlices', () => {
  const roster = [
    { name: 'ActionButton', sources: { swc: 'swc-action-button' } },
    { name: 'ActionGroup', sources: { swc: 'swc-action-group' } },
  ];
  const components = [
    { name: 'ActionButton', platforms: { web: { swc: { status: 'available' } } } },
    { name: 'ActionGroup', platforms: { web: { swc: { status: 'available' } } } },
  ];

  it('slugs a normal component by its own name, not flagged shared', () => {
    const { slices } = buildComponentSlices(roster, components, []);
    const actionButton = slices.find((s) => s.slug === 'action-button');
    assert.ok(actionButton);
    assert.equal(actionButton.shared, false);
  });

  it('redirects components carrying a page override to that shared slug, flagged shared', () => {
    const overridden = [
      { name: 'ActionButton', platforms: { web: { swc: { status: 'available', page: 'action-button-and-group' } } } },
      { name: 'ActionGroup', platforms: { web: { swc: { status: 'available', page: 'action-button-and-group' } } } },
    ];
    const { slices } = buildComponentSlices(roster, overridden, []);
    assert.deepEqual(slices.map((s) => s.slug), ['action-button-and-group', 'action-button-and-group']);
    assert.ok(slices[0].shared);
    assert.ok(slices[1].shared);
  });

  it('carries a cell\'s own originalName through unchanged (buildIndex/applyOverrides set it, not this function)', () => {
    const withOriginalName = [
      { name: 'ActionButton', platforms: { web: { rsp: { status: 'available', originalName: 'ActionBtn' } } } },
    ];
    const rosterWithRsp = [{ name: 'ActionButton', sources: { rsp: 'ActionButton' } }];
    const { slices } = buildComponentSlices(rosterWithRsp, withOriginalName, []);
    assert.equal(slices[0].data.web.rsp.originalName, 'ActionBtn');
  });

  it('attaches the figma page id by source name, unaffected by a page override', () => {
    const rosterWithFigma = [{ name: 'ActionButton', sources: { figma: 'Action Button' } }];
    const { slices, warnings } = buildComponentSlices(
      rosterWithFigma,
      [{ name: 'ActionButton', platforms: { web: {} } }],
      [{ name: 'Action Button', figmaPageId: '1:1' }],
    );
    assert.equal(slices[0].data.figmaPageId, '1:1');
    assert.deepEqual(warnings, []);
  });

  it('prefers a `web.figma.originalName` override over the roster source name', () => {
    // Calendar has no Figma page of its own; a status-overrides.json entry redirects its
    // Design link to the Date and time field design without touching Calendar's own roster
    // membership (sources.figma is absent — this is a code-only component in Figma terms).
    const rosterNoFigmaSource = [{ name: 'Calendar', sources: { rsp: 'Calendar' } }];
    const { slices, warnings } = buildComponentSlices(
      rosterNoFigmaSource,
      [{
        name: 'Calendar',
        platforms: { web: { figma: { status: 'available', originalName: 'Date and time field' } } },
      }],
      [{ name: 'Date and time field', figmaPageId: '10196:3411' }],
    );
    assert.equal(slices[0].data.figmaPageId, '10196:3411');
    assert.deepEqual(warnings, []);
  });

  it('pins one Figma variant via originalName when several sources could match the canonical name', () => {
    // Cards has six Figma variant pages all aliased to the canonical "Cards" name; without an
    // override the last-processed source wins by accident. An originalName override pins one
    // deliberately.
    const rosterCards = [{ name: 'Cards', sources: { figma: 'Cards (User)' } }];
    const { slices, warnings } = buildComponentSlices(
      rosterCards,
      [{
        name: 'Cards',
        platforms: { web: { figma: { status: 'available', originalName: 'Cards (Asset)' } } },
      }],
      [
        { name: 'Cards (Asset)', figmaPageId: '10182:4354' },
        { name: 'Cards (User)', figmaPageId: '10182:123493' },
      ],
    );
    assert.equal(slices[0].data.figmaPageId, '10182:4354');
    assert.deepEqual(warnings, []);
  });

  it('warns when a `web.figma.originalName` override matches nothing in the Figma roster', () => {
    // A typo'd or stale name (roster entry renamed/removed upstream) must not fail silently —
    // the component's Figma link just vanishes otherwise, with no build signal.
    const rosterNoFigmaSource = [{ name: 'Calendar', sources: { rsp: 'Calendar' } }];
    const { slices, warnings } = buildComponentSlices(
      rosterNoFigmaSource,
      [{
        name: 'Calendar',
        platforms: { web: { figma: { status: 'available', originalName: 'Date and Time Field' } } },
      }],
      [{ name: 'Date and time field', figmaPageId: '10196:3411' }],
    );
    assert.equal(slices[0].data.figmaPageId, undefined);
    assert.deepEqual(warnings, [
      'figma originalName override for "Calendar" targets unmatched Figma roster entry "Date and Time Field"',
    ]);
  });
});

describe('buildImplAliases', () => {
  it('keys an originalName by impl and the slice\'s own slug', () => {
    const slices = [
      { slug: 'action-group', data: { web: { rsp: { status: 'available', originalName: 'ActionButtonGroup' } } } },
    ];
    assert.deepEqual(buildImplAliases(slices), { rsp: { 'action-group': 'ActionButtonGroup' } });
  });

  it('picks up a page override\'s shared slug, since it reads the slice\'s slug directly', () => {
    const slices = [
      {
        slug: 'color-handle-and-loupe',
        data: {
          web: {
            rsp: { status: 'available', originalName: 'ColorHandle' },
            swc: { status: 'available', originalName: 'ColorHandle' },
          },
        },
      },
    ];
    assert.deepEqual(buildImplAliases(slices), {
      rsp: { 'color-handle-and-loupe': 'ColorHandle' },
      swc: { 'color-handle-and-loupe': 'ColorHandle' },
    });
  });

  it('omits a cell with no originalName', () => {
    const slices = [{ slug: 'action-button', data: { web: { rsp: { status: 'available' } } } }];
    assert.deepEqual(buildImplAliases(slices), {});
  });

  it('returns an empty object for no slices', () => {
    assert.deepEqual(buildImplAliases([]), {});
  });

  it('excludes a figma cell\'s originalName — it redirects the Figma link, not a code implementation', () => {
    const slices = [{
      slug: 'calendar',
      data: {
        web: {
          figma: { status: 'available', originalName: 'Date and time field' },
          rsp: { status: 'available' },
        },
      },
    }];
    assert.deepEqual(buildImplAliases(slices), {});
  });
});
