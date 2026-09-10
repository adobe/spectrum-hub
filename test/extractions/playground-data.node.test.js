import assert from 'node:assert/strict';
import { describe, it, mock, beforeEach } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  fetchPlaygroundSheets,
  getComponentProperties,
  buildControlsMap,
  resolvePickerOptions,
  resolveControl,
  normalizePropertyName,
  propertyNameCandidates,
  findProp,
  cachedFetch,
  clearFetchCache,
} from '../../blocks/playground/playground-data.js';
import { ICON_OPTIONS, NO_ICON } from '../../deps/shared/playground/icon-options.js';
import {
  NONE_OPTION, DEFAULT_OPTION, isUnsetOption, optionLabel,
} from '../../deps/shared/playground/unset-control-options.js';

const COMPONENTS_SHEET = [
  { component: 'Button', properties: 'variant, staticColor, text, fillStyle, size, isDisabled' },
  { component: 'Accordion', properties: '' },
  { component: 'Badge', properties: null },
];

const CONTROLS_SHEET = [
  { property: 'variant', control: 'picker' },
  { property: 'staticColor', control: 'segmentedControl' },
  { property: 'text', control: 'textfield' },
  { property: 'fillStyle', control: 'segmentedControl' },
  { property: 'size', control: 'segmentedControl' },
  { property: 'isDisabled', control: 'switch' },
];

// RSP's Button additionally supports "premium"/"genai" — values SWC's real
// ButtonVariant doesn't have (see .ai/docs/specs/2026-08-27-swc-type-resolution-
// design.md). Kept in this fixture deliberately: it's the exact regression
// resolvePickerOptions's implementation gate exists to prevent.
const RSP_PROPS = [
  {
    property: 'variant',
    type: "'primary' | 'secondary' | 'accent' | 'negative' | 'premium' | 'genai'",
    kind: 'enum',
    values: ['primary', 'secondary', 'accent', 'negative', 'premium', 'genai'],
  },
  {
    property: 'fillStyle', type: "'fill' | 'outline'", kind: 'enum', values: ['fill', 'outline'],
  },
  {
    property: 'size', type: "'S' | 'M' | 'L' | 'XL'", kind: 'enum', values: ['S', 'M', 'L', 'XL'],
  },
  {
    property: 'staticColor', type: "'white' | 'black' | 'auto'", kind: 'enum', values: ['white', 'black', 'auto'],
  },
  {
    property: 'channel',
    type: "'hue' | 'saturation' | 'red' | 'alpha'",
    kind: 'enum',
    values: ['hue', 'saturation', 'red', 'alpha'],
    required: true,
  },
  {
    property: 'xChannel', type: "'hue' | 'red' | 'green'", kind: 'enum', values: ['hue', 'red', 'green'],
  },
  {
    property: 'yChannel', type: "'hue' | 'red' | 'green'", kind: 'enum', values: ['hue', 'red', 'green'],
  },
  {
    property: 'isPending', type: 'boolean', kind: 'boolean', values: [],
  },
  {
    property: 'isQuiet', type: 'boolean', kind: 'boolean', values: [],
  },
  {
    property: 'children', type: 'ReactNode', kind: 'unknown', values: [],
  },
];

// SWC types here are already-resolved literal unions, matching what
// deps/swc/extract-cem-components.js now writes (it resolves named aliases like
// "ButtonVariant" via the real TypeScript compiler — see resolve-attribute-types.js
// — rather than leaving them as bare, unusable alias names).
const SWC_PROPS = [
  {
    property: 'variant',
    attribute: 'variant',
    type: '"primary" | "secondary" | "accent" | "negative"',
    kind: 'enum',
    values: ['primary', 'secondary', 'accent', 'negative'],
  },
  {
    property: 'fillStyle', attribute: 'fill-style', type: '"fill" | "outline"', kind: 'enum', values: ['fill', 'outline'],
  },
  // size's real SWC type is wider than RSP's (SizedMixin's generic ElementSize,
  // not Button's own narrower override) — this fixture matches that documented,
  // accepted limitation, not a mistake.
  {
    property: 'size',
    attribute: 'size',
    type: '"xxs" | "xs" | "s" | "m" | "l" | "xl" | "xxl"',
    kind: 'enum',
    values: ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl'],
  },
  {
    property: 'disabled', attribute: 'disabled', type: 'boolean', kind: 'boolean', values: [],
  },
  {
    property: 'pending', attribute: 'pending', type: 'boolean', kind: 'boolean', values: [],
  },
  {
    property: 'quiet', attribute: 'quiet', type: 'boolean', kind: 'boolean', values: [],
  },
  {
    property: 'truncate', attribute: 'truncate', type: 'boolean', kind: 'boolean', values: [],
  },
  // SWC-only property whose type genuinely couldn't be resolved (e.g. a generic or
  // interface shape resolve-attribute-types.js can't turn into a union) — still a
  // bare alias name, exercising the controls-sheet curated-options fallback.
  {
    property: 'labelAlign', attribute: 'label-align', type: 'LabelAlign', kind: 'unknown', values: [],
  },
];

describe('fetchPlaygroundSheets', () => {
  const SHEET_URL = 'https://example.com/playground.json';

  // Every test below reuses SHEET_URL — without this, the second test to run
  // would get the first test's cached (mocked) response instead of hitting
  // its own newly-mocked fetch.
  beforeEach(() => clearFetchCache());

  // Raw rows as an AEM workbook returns them: capitalized column headers that
  // the utility is expected to lowercase.
  const RAW_COMPONENTS = [
    { Component: 'Button', Properties: 'variant, size' },
    { Component: 'Accordion', Properties: '' },
  ];
  const RAW_CONTROLS = [
    { Property: 'variant', Control: 'picker' },
  ];

  function respondBySheet(t) {
    const calls = [];
    t.mock.method(globalThis, 'fetch', async (requestUrl) => {
      calls.push(requestUrl);
      const sheet = new URL(requestUrl).searchParams.get('sheet');
      const data = sheet === 'components' ? RAW_COMPONENTS : RAW_CONTROLS;
      return { ok: true, json: async () => ({ data }) };
    });
    return calls;
  }

  it('returns parsed data for both the components and controls tabs', async (t) => {
    respondBySheet(t);

    const { componentsSheet, controlsSheet } = await fetchPlaygroundSheets(SHEET_URL);

    assert.deepEqual(componentsSheet, [
      { component: 'Button', properties: 'variant, size' },
      { component: 'Accordion', properties: '' },
    ]);
    assert.deepEqual(controlsSheet, [
      { property: 'variant', control: 'picker' },
    ]);
  });

  it('requests both the components and controls tabs of the given workbook', async (t) => {
    const calls = respondBySheet(t);

    await fetchPlaygroundSheets(SHEET_URL);

    assert.ok(calls.includes(`${SHEET_URL}?sheet=components`));
    assert.ok(calls.includes(`${SHEET_URL}?sheet=controls`));
  });

  it('lowercases column headers so downstream lookups are case-insensitive', async (t) => {
    respondBySheet(t);

    const { controlsSheet } = await fetchPlaygroundSheets(SHEET_URL);

    // buildControlsMap keys off the lowercased "property"/"control" columns.
    const map = buildControlsMap(controlsSheet);
    assert.deepEqual(map.get('variant'), { control: 'picker', options: [] });
  });

  it('throws with the sheet name and status when a response is not ok', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 404 }));

    await assert.rejects(
      fetchPlaygroundSheets(SHEET_URL),
      /Failed to fetch sheet ".+" from .+: 404/,
    );
  });
});

describe('cachedFetch', () => {
  beforeEach(() => clearFetchCache());

  it('runs the given function on the first call for a URL', async () => {
    const run = mock.fn(async () => 'value');
    await cachedFetch('https://example.com/a', run);
    assert.equal(run.mock.callCount(), 1);
  });

  it('does not re-run the function for a URL it has already resolved', async () => {
    const run = mock.fn(async () => 'value');
    await cachedFetch('https://example.com/a', run);
    await cachedFetch('https://example.com/a', run);
    await cachedFetch('https://example.com/a', run);
    assert.equal(run.mock.callCount(), 1);
  });

  it('returns the same resolved value to every caller', async () => {
    const run = mock.fn(async () => ({ some: 'data' }));
    const first = await cachedFetch('https://example.com/a', run);
    const second = await cachedFetch('https://example.com/a', run);
    assert.equal(first, second);
  });

  it('shares a single in-flight call across concurrent callers, not one per caller', async () => {
    const run = mock.fn(async () => 'value');
    const [a, b, c] = await Promise.all([
      cachedFetch('https://example.com/a', run),
      cachedFetch('https://example.com/a', run),
      cachedFetch('https://example.com/a', run),
    ]);
    assert.equal(run.mock.callCount(), 1);
    assert.deepEqual([a, b, c], ['value', 'value', 'value']);
  });

  it('runs the function separately for different URLs', async () => {
    const run = mock.fn(async () => 'value');
    await cachedFetch('https://example.com/a', run);
    await cachedFetch('https://example.com/b', run);
    assert.equal(run.mock.callCount(), 2);
  });

  it('does not cache a rejection, so a later call can retry', async () => {
    let calls = 0;
    const run = mock.fn(async () => {
      calls += 1;
      if (calls === 1) { throw new Error('network blip'); }
      return 'recovered';
    });

    await assert.rejects(cachedFetch('https://example.com/a', run), /network blip/);
    const result = await cachedFetch('https://example.com/a', run);

    assert.equal(result, 'recovered');
    assert.equal(run.mock.callCount(), 2);
  });
});

describe('getComponentProperties', () => {
  // Every existing row predates the implementation column, so an unqualified row
  // must keep serving every implementation — otherwise all 88 need backfilling.
  it('uses an unqualified row for any implementation', () => {
    const result = getComponentProperties('Button', 'swc', COMPONENTS_SHEET);
    assert.deepEqual(result, ['variant', 'staticColor', 'text', 'fillStyle', 'size', 'isDisabled']);
  });

  it('is case-insensitive on the component name', () => {
    assert.equal(getComponentProperties('button', 'rsp', COMPONENTS_SHEET).length, 6);
    assert.equal(getComponentProperties('BUTTON', 'rsp', COMPONENTS_SHEET).length, 6);
  });

  it('returns an empty array for a component with an empty properties string', () => {
    assert.deepEqual(getComponentProperties('Accordion', 'rsp', COMPONENTS_SHEET), []);
  });

  it('returns an empty array for a component with a null properties value', () => {
    assert.deepEqual(getComponentProperties('Badge', 'rsp', COMPONENTS_SHEET), []);
  });

  it('warns and returns an empty array for an unknown component', () => {
    const warnings = [];
    assert.deepEqual(getComponentProperties('NonExistent', 'rsp', COMPONENTS_SHEET, (m) => warnings.push(m)), []);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /no row/i);
  });

  describe('implementation column', () => {
    const SHEET = [
      { component: 'badge', implementation: 'rsp', properties: 'fillStyle, overflowMode, size' },
      { component: 'badge', implementation: 'swc', properties: 'fixed, outline, size' },
      { component: 'button', implementation: 'ios, rsp, swc', properties: 'variant, size' },
      { component: 'divider', properties: 'size, orientation' },
      { component: 'tabs', implementation: 'rsp', properties: 'density' },
    ];

    it('picks the row matching the page implementation', () => {
      assert.deepEqual(getComponentProperties('badge', 'rsp', SHEET), ['fillStyle', 'overflowMode', 'size']);
      assert.deepEqual(getComponentProperties('badge', 'swc', SHEET), ['fixed', 'outline', 'size']);
    });

    it('reads the column as a comma-separated list', () => {
      for (const impl of ['ios', 'rsp', 'swc']) {
        assert.deepEqual(getComponentProperties('button', impl, SHEET), ['variant', 'size'], impl);
      }
    });

    it('falls back to an unqualified row when no qualified row matches', () => {
      assert.deepEqual(getComponentProperties('divider', 'swc', SHEET), ['size', 'orientation']);
    });

    it('prefers a qualified row over an unqualified one', () => {
      const sheet = [
        { component: 'badge', properties: 'shared' },
        { component: 'badge', implementation: 'swc', properties: 'specific' },
      ];
      assert.deepEqual(getComponentProperties('badge', 'swc', sheet), ['specific']);
      assert.deepEqual(getComponentProperties('badge', 'rsp', sheet), ['shared']);
    });

    it('warns when rows exist for the component but none covers this implementation', () => {
      const warnings = [];
      assert.deepEqual(getComponentProperties('tabs', 'swc', SHEET, (m) => warnings.push(m)), []);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0], /swc/);
    });

    it('warns and takes the first when two rows claim the same implementation', () => {
      const warnings = [];
      const sheet = [
        { component: 'badge', implementation: 'swc', properties: 'first' },
        { component: 'badge', implementation: 'swc, ios', properties: 'second' },
      ];
      assert.deepEqual(getComponentProperties('badge', 'swc', sheet, (m) => warnings.push(m)), ['first']);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0], /more than one/i);
    });

    it('ignores case and spacing in the column', () => {
      const sheet = [{ component: 'badge', implementation: '  IOS , SWC ', properties: 'a, b' }];
      assert.deepEqual(getComponentProperties('badge', 'swc', sheet), ['a', 'b']);
    });
  });
});

describe('buildControlsMap', () => {
  it('builds a map keyed by property name', () => {
    const map = buildControlsMap(CONTROLS_SHEET);
    assert.deepEqual(map.get('variant'), { control: 'picker', options: [] });
    assert.deepEqual(map.get('isDisabled'), { control: 'switch', options: [] });
  });

  it('contains all rows from the sheet', () => {
    const map = buildControlsMap(CONTROLS_SHEET);
    assert.equal(map.size, CONTROLS_SHEET.length);
  });

  it('trims surrounding whitespace from the property key so lookups match', () => {
    const map = buildControlsMap([{ property: '  variant  ', control: 'picker' }]);
    assert.deepEqual(map.get('variant'), { control: 'picker', options: [] });
  });

  it('parses a comma-separated options column into a trimmed array', () => {
    const map = buildControlsMap([{ property: 'icon', control: 'picker', options: 'search, copy , checkmark' }]);
    assert.deepEqual(map.get('icon'), { control: 'picker', options: ['search', 'copy', 'checkmark'] });
  });

  it('defaults options to an empty array when the column is absent or empty', () => {
    const map = buildControlsMap([{ property: 'variant', control: 'picker', options: '' }]);
    assert.deepEqual(map.get('variant'), { control: 'picker', options: [] });
  });
});

describe('resolvePickerOptions', () => {
  it('returns parsed options from RSP data for an rsp implementation', () => {
    assert.deepEqual(
      resolvePickerOptions('variant', RSP_PROPS),
      ['primary', 'secondary', 'accent', 'negative', 'premium', 'genai'],
    );
  });

  it('returns [no, yes] for a boolean property in RSP', () => {
    assert.deepEqual(resolvePickerOptions('isPending', RSP_PROPS), ['no', 'yes']);
    assert.deepEqual(resolvePickerOptions('isQuiet', RSP_PROPS), ['no', 'yes']);
  });

  it('returns [no, yes] for a boolean property in SWC (exact match)', () => {
    assert.deepEqual(resolvePickerOptions('disabled', SWC_PROPS), ['no', 'yes']);
  });

  it('returns [no, yes] for a boolean SWC property reached via name normalization', () => {
    assert.deepEqual(resolvePickerOptions('isDisabled', SWC_PROPS), ['no', 'yes']);
  });

  it('returns an empty array for an SWC-only property with a named (unresolved) type', () => {
    // labelAlign exists only in SWC and its type genuinely couldn't be resolved to a
    // union — RSP has nothing to fall back to either.
    assert.deepEqual(resolvePickerOptions('labelAlign', SWC_PROPS), []);
  });

  it('returns an empty array for a property not in either dataset', () => {
    assert.deepEqual(resolvePickerOptions('unknown', RSP_PROPS), []);
    assert.deepEqual(resolvePickerOptions('unknown', SWC_PROPS), []);
  });

  // The regression this implementation-gate exists to prevent: RSP's Button
  // supports "premium"/"genai" variants SWC's real ButtonVariant doesn't. An SWC
  // page must use SWC's own (already-resolved) union, never borrow RSP's wider one.
  it('resolves an swc implementation from SWC\'s own data, not RSP\'s wider union', () => {
    assert.deepEqual(
      resolvePickerOptions('variant', SWC_PROPS),
      ['primary', 'secondary', 'accent', 'negative'],
    );
  });

  it('still resolves RSP\'s own (wider) union for an rsp implementation', () => {
    assert.deepEqual(
      resolvePickerOptions('variant', RSP_PROPS),
      ['primary', 'secondary', 'accent', 'negative', 'premium', 'genai'],
    );
  });

  it('resolves fillStyle from SWC\'s own resolved union for an swc implementation', () => {
    assert.deepEqual(resolvePickerOptions('fillStyle', SWC_PROPS), ['fill', 'outline']);
  });
});

describe('normalizePropertyName', () => {
  it('strips is prefix and lowercases first char', () => {
    assert.equal(normalizePropertyName('isDisabled'), 'disabled');
    assert.equal(normalizePropertyName('isPending'), 'pending');
    assert.equal(normalizePropertyName('isQuiet'), 'quiet');
  });

  it('strips has prefix and lowercases first char', () => {
    assert.equal(normalizePropertyName('hasLabel'), 'label');
  });

  it('returns the name unchanged when no prefix matches', () => {
    assert.equal(normalizePropertyName('variant'), 'variant');
    assert.equal(normalizePropertyName('size'), 'size');
    assert.equal(normalizePropertyName('staticColor'), 'staticColor');
  });

  it('does not strip is when the third char is lowercase', () => {
    assert.equal(normalizePropertyName('island'), 'island');
    assert.equal(normalizePropertyName('issued'), 'issued');
  });
});

describe('propertyNameCandidates', () => {
  it('adds the prefix-stripped name for an is/has-prefixed name', () => {
    assert.deepEqual(propertyNameCandidates('isDisabled'), ['isDisabled', 'disabled']);
    assert.deepEqual(propertyNameCandidates('hasLabel'), ['hasLabel', 'label']);
  });

  it('adds is/has-prefixed forms for a bare name', () => {
    assert.deepEqual(propertyNameCandidates('disabled'), ['disabled', 'isDisabled', 'hasDisabled']);
  });
});

// One lookup for both catalogs now that only the page's own is fetched. The
// candidate walk is the workbook's RSP spelling reaching an SWC row.
describe('findProp', () => {
  it('finds a row by exact property name', () => {
    assert.deepEqual(findProp('isQuiet', RSP_PROPS), RSP_PROPS.find((p) => p.property === 'isQuiet'));
    assert.deepEqual(findProp('disabled', SWC_PROPS), SWC_PROPS.find((p) => p.property === 'disabled'));
  });

  it('bridges the workbook\'s is/has spelling to an SWC row', () => {
    assert.deepEqual(findProp('isDisabled', SWC_PROPS), SWC_PROPS.find((p) => p.property === 'disabled'));
  });

  it('bridges a bare name to an is/has-prefixed RSP row', () => {
    assert.deepEqual(findProp('quiet', RSP_PROPS), RSP_PROPS.find((p) => p.property === 'isQuiet'));
    assert.deepEqual(findProp('pending', RSP_PROPS), RSP_PROPS.find((p) => p.property === 'isPending'));
  });

  it('returns undefined when no candidate matches', () => {
    assert.equal(findProp('nonexistent', RSP_PROPS), undefined);
    assert.equal(findProp('unknown', SWC_PROPS), undefined);
  });
});

describe('resolveControl', () => {
  const controlsMap = buildControlsMap(CONTROLS_SHEET);

  it('returns a control descriptor for a property that exists in rsp', () => {
    const result = resolveControl('variant', 'rsp', controlsMap, RSP_PROPS);
    assert.deepEqual(result, {
      controlType: 'picker',
      options: ['primary', 'secondary', 'accent', 'negative', 'premium', 'genai'],
      // null, not SWC's 'variant': rsp rows carry no DOM attribute of their own.
      attribute: null,
    });
  });

  // Regression: an SWC page must never offer RSP-only variants (premium/genai)
  // just because RSP's union happened to resolve — see resolvePickerOptions tests.
  it('returns a control descriptor for the same property scoped to swc data instead', () => {
    const result = resolveControl('variant', 'swc', controlsMap, SWC_PROPS);
    assert.deepEqual(result, {
      controlType: 'picker',
      options: ['primary', 'secondary', 'accent', 'negative'],
      attribute: 'variant',
    });
  });

  it('returns a control descriptor for a property that exists in swc', () => {
    const result = resolveControl('fillStyle', 'swc', controlsMap, SWC_PROPS);
    assert.notEqual(result, null);
    assert.equal(result.attribute, 'fill-style');
    // CONTROLS_SHEET authors fillStyle as a segmentedControl, not the picker default.
    assert.equal(result.controlType, 'segmentedControl');
  });

  it('returns null for a swc-only property when implementation is rsp', () => {
    assert.equal(resolveControl('truncate', 'rsp', controlsMap, RSP_PROPS), null);
  });

  it('returns a descriptor for a swc-only property when implementation is swc', () => {
    const result = resolveControl('truncate', 'swc', controlsMap, SWC_PROPS);
    assert.deepEqual(result, {
      controlType: 'picker',
      options: ['no', 'yes'],
      attribute: 'truncate',
    });
  });

  // A property literally named "icon" is always treated as the icon slot
  // property (resolveControl's isIcon check is keyed purely on the property
  // name) — the same by-name existence-check exemption TEXT_KEYS gets — even
  // with no authored "icon" row in the controls sheet at all. With no row to
  // read from, it still resolves: controlType defaults to "picker" and its
  // options fall back to the shared ICON_OPTIONS catalog (see the "icon"
  // control describe block below for the case where a row IS authored).
  it('resolves a property literally named "icon" even with no authored control row', () => {
    const result = resolveControl('icon', 'swc', controlsMap, RSP_PROPS, SWC_PROPS);
    assert.notEqual(result, null);
    assert.equal(result.controlType, 'picker');
    assert.equal(result.attribute, null);
    assert.deepEqual(result.options, [NO_ICON, ...ICON_OPTIONS]);
  });

  it('defaults controlType to picker when property is not in the controls sheet', () => {
    const result = resolveControl('variant', 'rsp', new Map(), RSP_PROPS, SWC_PROPS);
    assert.equal(result.controlType, 'picker');
  });

  // staticColor has no documented default (unlike variant/fillStyle/size), so
  // `optional` is the extractor's own signal that an attribute may be absent
  // entirely, so its control needs a real "unset" choice rather than being forced
  // to one of the values. staticColor stays named below only because RSP's
  // extractor does not emit `optional` yet.
  it('leads an optional attribute\'s options with NONE_OPTION', () => {
    const optionalSwc = [
      {
        property: 'fixed',
        attribute: 'fixed',
        type: '"top" | "bottom"',
        kind: 'enum',
        values: ['top', 'bottom'],
        optional: true,
      },
    ];
    const result = resolveControl('fixed', 'swc', controlsMap, optionalSwc);
    assert.deepEqual(result.options, [NONE_OPTION, 'top', 'bottom']);
  });

  it('gives a required attribute no NONE_OPTION', () => {
    const requiredSwc = [
      {
        property: 'fixed',
        attribute: 'fixed',
        type: '"top" | "bottom"',
        kind: 'enum',
        values: ['top', 'bottom'],
        optional: false,
      },
    ];
    const result = resolveControl('fixed', 'swc', controlsMap, requiredSwc);
    assert.deepEqual(result.options, ['top', 'bottom']);
  });

  // NONE_OPTION leads its options the same way NO_ICON leads icon's.
  it('leads staticColor\'s options with NONE_OPTION', () => {
    const result = resolveControl('staticColor', 'rsp', controlsMap, RSP_PROPS, SWC_PROPS);
    assert.deepEqual(result.options, [NONE_OPTION, 'white', 'black', 'auto']);
  });

  // curated options are the only way to populate a picker/segmentedControl for it.
  it("falls back to the controls sheet's curated options when the type can't be introspected", () => {
    const curatedMap = buildControlsMap([{ property: 'labelAlign', control: 'segmentedControl', options: 'start, end' }]);
    const result = resolveControl('labelAlign', 'swc', curatedMap, SWC_PROPS);
    assert.deepEqual(result, {
      controlType: 'segmentedControl',
      options: ['start', 'end'],
      attribute: 'label-align',
    });
  });

  it('does not warn when curated options cover a type that cannot be introspected', () => {
    const curatedMap = buildControlsMap([{ property: 'labelAlign', control: 'segmentedControl', options: 'start, end' }]);
    const onSkip = mock.fn();
    resolveControl('labelAlign', 'swc', curatedMap, SWC_PROPS, onSkip);
    assert.equal(onSkip.mock.callCount(), 0);
  });

  it('prefers options derived from real type data over curated ones when both are available', () => {
    const curatedMap = buildControlsMap([{ property: 'variant', control: 'picker', options: 'ignored, alsoIgnored' }]);
    const result = resolveControl('variant', 'rsp', curatedMap, RSP_PROPS);
    assert.deepEqual(result.options, ['primary', 'secondary', 'accent', 'negative', 'premium', 'genai']);
  });

  it('returns a descriptor for a swc-only property when implementation is swc', () => {
    const result = resolveControl('truncate', 'swc', controlsMap, SWC_PROPS);
    assert.deepEqual(result, {
      controlType: 'picker',
      options: ['no', 'yes'],
      attribute: 'truncate',
    });
  });

  // A property literally named "icon" is always treated as the icon slot
  // property (resolveControl's isIcon check is keyed purely on the property
  // name) — the same by-name existence-check exemption TEXT_KEYS gets — even
  // with no authored "icon" row in the controls sheet at all. With no row to
  // read from, it still resolves: controlType defaults to "picker" and its
  // options fall back to the shared ICON_OPTIONS catalog (see the "icon"
  // control describe block below for the case where a row IS authored).
  it('resolves a property literally named "icon" even with no authored control row', () => {
    const result = resolveControl('icon', 'swc', controlsMap, SWC_PROPS);
    assert.notEqual(result, null);
    assert.equal(result.controlType, 'picker');
    assert.equal(result.attribute, null);
    assert.deepEqual(result.options, [NO_ICON, ...ICON_OPTIONS]);
  });

  it('defaults controlType to picker when property is not in the controls sheet', () => {
    const result = resolveControl('variant', 'rsp', new Map(), RSP_PROPS);
    assert.equal(result.controlType, 'picker');
  });

  // staticColor has no documented default (unlike variant/fillStyle/size), so
  // NONE_OPTION leads its options the same way NO_ICON leads icon's.
  it('leads staticColor\'s options with NONE_OPTION', () => {
    const result = resolveControl('staticColor', 'rsp', controlsMap, RSP_PROPS);
    assert.deepEqual(result.options, [NONE_OPTION, 'white', 'black', 'auto']);
  });

  // ColorArea derives both channels from the value's color space when neither is
  // passed. Without an unset choice the picker's first option led — colorSpace="rgb"
  // with xChannel="hue" and yChannel="hue", which is both the wrong space and the same
  // axis twice, and ColorArea rendered nothing at all. Verified live: unset renders,
  // and re-renders differently when colorSpace changes.
  it('leads xChannel and yChannel with DEFAULT_OPTION, not NONE_OPTION', () => {
    ['xChannel', 'yChannel'].forEach((property) => {
      const result = resolveControl(property, 'rsp', controlsMap, RSP_PROPS);
      assert.equal(result.options[0], DEFAULT_OPTION, property);
      assert.deepEqual(result.options, [DEFAULT_OPTION, 'hue', 'red', 'green'], property);
    });
  });

  it('still leads staticColor with NONE_OPTION, so the two sentinels stay distinct', () => {
    assert.equal(resolveControl('staticColor', 'rsp', controlsMap, RSP_PROPS).options[0], NONE_OPTION);
  });

  it('gives a property with no unset choice no sentinel at all', () => {
    assert.equal(resolveControl('variant', 'rsp', controlsMap, RSP_PROPS).options[0], 'primary');
  });

  // ColorSlider's `channel` is required and, unlike ColorArea's, is not inferred —
  // omitting it renders nothing, so it gets no unset choice. Its catalog lists all
  // eight channels across all three color spaces with `hue` leading, but `hue` is
  // invalid in `rgb`, which is colorSpace's own default. Measured live: rgb accepts
  // red/green/blue/alpha, hsl hue/saturation/lightness/alpha, hsb
  // hue/saturation/brightness/alpha — `alpha` is the only channel valid in all three.
  it('overrides the default for channel to the one valid in every color space', () => {
    const result = resolveControl('channel', 'rsp', controlsMap, RSP_PROPS);
    assert.equal(result.defaultOverride, 'alpha');
  });

  it('leaves the channel option list in its declared order', () => {
    const result = resolveControl('channel', 'rsp', controlsMap, RSP_PROPS);
    assert.deepEqual(result.options, ['hue', 'saturation', 'red', 'alpha']);
  });

  it('gives channel no unset choice, since omitting a required prop renders nothing', () => {
    const result = resolveControl('channel', 'rsp', controlsMap, RSP_PROPS);
    assert.equal(isUnsetOption(result.options[0]), false);
  });

  it('leaves every other property without a default override', () => {
    ['variant', 'size', 'staticColor', 'xChannel'].forEach((property) => {
      assert.equal(resolveControl(property, 'rsp', controlsMap, RSP_PROPS).defaultOverride, undefined, property);
    });
  });

  it('returns null attribute when property has no swc equivalent even after normalization', () => {
    const result = resolveControl('children', 'rsp', controlsMap, RSP_PROPS);
    assert.equal(result.attribute, null);
  });

  it('normalizes isDisabled to disabled for swc matching', () => {
    const result = resolveControl('isDisabled', 'swc', controlsMap, SWC_PROPS);
    assert.notEqual(result, null);
    assert.equal(result.attribute, 'disabled');
  });

  it('normalizes isPending to pending for swc matching', () => {
    const result = resolveControl('isPending', 'swc', controlsMap, SWC_PROPS);
    assert.notEqual(result, null);
    assert.equal(result.attribute, 'pending');
  });

  it('normalizes isQuiet to quiet for swc matching', () => {
    const result = resolveControl('isQuiet', 'swc', controlsMap, SWC_PROPS);
    assert.notEqual(result, null);
    assert.equal(result.attribute, 'quiet');
  });

  // Regression: an rsp page used to reach into SWC's catalog for `attribute` (root
  // cause 3 — the borrow that also leaked SWC's option lists). RSP props are not DOM
  // attributes, so the honest answer is null, and the rsp apply path uses the property
  // name directly.
  it('never borrows an swc attribute for an rsp control', () => {
    const result = resolveControl('isPending', 'rsp', controlsMap, RSP_PROPS);
    assert.notEqual(result, null);
    assert.equal(result.attribute, null);
  });

  it('resolves an rsp control from a swc-style boolean name via an added prefix (quiet -> isQuiet)', () => {
    const result = resolveControl('quiet', 'rsp', controlsMap, RSP_PROPS);
    assert.notEqual(result, null);
    assert.deepEqual(result.options, ['no', 'yes']);
  });

  it('resolves an rsp control from a swc-style boolean name (pending -> isPending)', () => {
    const result = resolveControl('pending', 'rsp', controlsMap, RSP_PROPS);
    assert.notEqual(result, null);
    assert.deepEqual(result.options, ['no', 'yes']);
  });

  it('still returns null for a swc-only property with no rsp equivalent under any prefix', () => {
    assert.equal(resolveControl('truncate', 'rsp', controlsMap, RSP_PROPS), null);
  });

  describe('onSkip callback', () => {
    it('is not called when a control resolves successfully', () => {
      const onSkip = mock.fn();
      resolveControl('variant', 'rsp', controlsMap, RSP_PROPS, onSkip);
      assert.equal(onSkip.mock.callCount(), 0);
    });

    it('is called with a plain-English reason when the property is absent from the implementation data', () => {
      const onSkip = mock.fn();
      resolveControl('truncate', 'rsp', controlsMap, RSP_PROPS, onSkip);
      assert.equal(onSkip.mock.callCount(), 1);
      const [message] = onSkip.mock.calls[0].arguments;
      assert.match(message, /"truncate"/);
      assert.match(message, /RSP data/);
    });

    it('is called with a plain-English reason when the property type cannot be resolved to options', () => {
      const onSkip = mock.fn();
      const result = resolveControl('children', 'rsp', controlsMap, RSP_PROPS, onSkip);
      assert.deepEqual(result.options, []);
      assert.equal(onSkip.mock.callCount(), 1);
      const [message] = onSkip.mock.calls[0].arguments;
      assert.match(message, /"children"/);
      assert.match(message, /ReactNode/);
    });

    it('does not throw when onSkip is omitted', () => {
      assert.doesNotThrow(() => resolveControl('truncate', 'rsp', controlsMap, RSP_PROPS));
    });
  });

  // "text"/"label"/"children" represent a component's slot/children content,
  // not a real named prop — extraction tools generally never emit an entry for
  // them in the RSP/SWC prop-data JSON (there's nothing to introspect, it's
  // just default slot content). Real production data confirmed this: neither
  // ActionButton.json nor swc-action-button.json has a "text" row, so the
  // existence check must not gate these three names the way it gates a real
  // prop like "icon".
  describe('text-content properties bypass the implementation-data existence check', () => {
    const textControlsMap = buildControlsMap([{ property: 'text', control: 'textfield' }]);

    it('resolves a "text" control for rsp even when absent from the RSP prop data', () => {
      const result = resolveControl('text', 'rsp', textControlsMap, RSP_PROPS);
      assert.notEqual(result, null);
      assert.equal(result.controlType, 'textfield');
    });

    it('resolves a "text" control for swc even when absent from the SWC prop data', () => {
      const result = resolveControl('text', 'swc', textControlsMap, SWC_PROPS);
      assert.notEqual(result, null);
      assert.equal(result.controlType, 'textfield');
    });

    it('does not warn that "text" is missing from the implementation data', () => {
      const onSkip = mock.fn();
      resolveControl('text', 'rsp', textControlsMap, RSP_PROPS, onSkip);
      const messages = onSkip.mock.calls.map((c) => c.arguments[0]);
      assert.ok(!messages.some((m) => m.includes('RSP data')));
    });

    it('also bypasses the existence check for "label" and "children"', () => {
      const labelMap = buildControlsMap([{ property: 'label', control: 'textfield' }]);
      assert.notEqual(resolveControl('label', 'swc', labelMap, SWC_PROPS), null);

      const childrenMap = buildControlsMap([{ property: 'children', control: 'textfield' }]);
      assert.notEqual(resolveControl('children', 'swc', childrenMap, SWC_PROPS), null);
    });
  });

  // The "icon" control has no real prop to introspect a type from (there's no
  // "icon" row in either ActionButton.json or swc-action-button.json), so —
  // once a property is actually authored with control "icon" — its options
  // come straight from the controls sheet instead of resolvePickerOptions, and
  // it gets the same implementation-data existence-check bypass as TEXT_KEYS.
  describe('"icon" control', () => {
    const iconMap = buildControlsMap([{ property: 'icon', control: 'icon', options: 'search, copy, checkmarkcircle' }]);

    it('resolves options from the controls sheet, not RSP/SWC data', () => {
      const result = resolveControl('icon', 'swc', iconMap, SWC_PROPS);
      // NO_ICON always leads the list, ahead of the sheet's curated options —
      // it's the default value, see resolveControl's own comment on this.
      assert.deepEqual(result, {
        controlType: 'icon',
        options: [NO_ICON, 'search', 'copy', 'checkmarkcircle'],
        attribute: null,
      });
    });

    it('bypasses the existence check for both implementations', () => {
      assert.notEqual(resolveControl('icon', 'swc', iconMap, SWC_PROPS), null);
      assert.notEqual(resolveControl('icon', 'rsp', iconMap, RSP_PROPS), null);
    });

    it('always returns a null attribute, since the value flows to a slot, not a real attribute', () => {
      const result = resolveControl('icon', 'rsp', iconMap, RSP_PROPS);
      assert.equal(result.attribute, null);
    });

    // The controls-sheet row leaves "options" blank here — resolveControl
    // falls back to the shared ICON_OPTIONS catalog (icon-options.js) rather
    // than warning, since that catalog is the intended default for most
    // components. The "no icon options are configured" warning only fires
    // when BOTH the sheet row and ICON_OPTIONS are empty, which isn't
    // reachable through this catalog as long as it ships at least one icon.
    it('falls back to the shared ICON_OPTIONS catalog when the sheet configures no icon options', () => {
      const emptyIconMap = buildControlsMap([{ property: 'icon', control: 'icon' }]);
      const onSkip = mock.fn();
      const result = resolveControl('icon', 'swc', emptyIconMap, SWC_PROPS, onSkip);
      assert.deepEqual(result.options, [NO_ICON, ...ICON_OPTIONS]);
      assert.equal(onSkip.mock.callCount(), 0);
    });
  });
});

// --- Layer 1: one catalog, structured values -------------------------------

// Rows as the extractors actually write them now: `kind` and `values` are resolved
// at extraction (deps/shared/prop-contract.js), so nothing here re-parses `type`.
const RSP_ROWS = [
  {
    property: 'variant', type: "'primary' | 'accent' | 'premium'", kind: 'enum', values: ['primary', 'accent', 'premium'],
  },
  { property: 'isPending', type: 'boolean', kind: 'boolean', values: [] },
  { property: 'children', type: 'ReactNode', kind: 'unknown', values: [] },
  { property: 'styles', type: 'StylesProp', kind: 'unknown', values: [] },
];

const SWC_ROWS = [
  {
    property: 'variant', attribute: 'variant', type: '"primary" | "accent"', kind: 'enum', values: ['primary', 'accent'],
  },
  {
    property: 'disabled', attribute: 'disabled', type: 'boolean', kind: 'boolean', values: [],
  },
];

describe('resolvePickerOptions reads the row, not its type string', () => {
  it('returns an enum row\'s resolved values verbatim', () => {
    assert.deepEqual(resolvePickerOptions('variant', RSP_ROWS), ['primary', 'accent', 'premium']);
    assert.deepEqual(resolvePickerOptions('variant', SWC_ROWS), ['primary', 'accent']);
  });

  it('offers no/yes for a boolean row', () => {
    assert.deepEqual(resolvePickerOptions('isPending', RSP_ROWS), ['no', 'yes']);
  });

  it('offers nothing for a row with no fixed option set', () => {
    assert.deepEqual(resolvePickerOptions('children', RSP_ROWS), []);
    assert.deepEqual(resolvePickerOptions('styles', RSP_ROWS), []);
  });

  it('offers nothing for a property absent from the catalog', () => {
    assert.deepEqual(resolvePickerOptions('nope', RSP_ROWS), []);
  });

  // The bridge survives because the workbook is RSP-keyed while SWC's catalog carries
  // its own spelling. It is why this cannot yet be a plain lookup by name.
  it('still bridges the workbook\'s RSP spelling to an SWC row', () => {
    assert.deepEqual(resolvePickerOptions('isDisabled', SWC_ROWS), ['no', 'yes']);
  });
});

// --- The contract's central rule ------------------------------------------------
//
// `type` is display-only and nothing may branch on it (deps/shared/prop-contract.js).
// That rule is only worth stating if something enforces it, so these rows are shaped so
// that reading `type` and reading `values` give DIFFERENT answers. All three fail if a
// consumer ever goes back to parsing the type string.
describe('options come from `values`, never from `type`', () => {
  it('prefers values even when the type string would parse to something else', () => {
    const rows = [{
      property: 'variant',
      // What the old regex consumer would have returned.
      type: "'legacy' | 'stale'",
      kind: 'enum',
      values: ['primary', 'accent'],
    }];
    assert.deepEqual(resolvePickerOptions('variant', rows), ['primary', 'accent']);
  });

  // ActionButton.aria-haspopup's real shape: string literals mixed with boolean
  // primitives, so there is no fixed option set. 72 rows across the two catalogs look
  // like this; DisclosurePanel.labelElementType carries 178 quoted literals, which the
  // regex would have offered as a picker of HTML tag names.
  it('offers nothing for a mixed union, however many literals the type contains', () => {
    const rows = [{
      property: 'ariaHaspopup',
      type: 'false | true | "true" | "false" | "menu" | "listbox" | "tree"',
      kind: 'unknown',
      values: [],
    }];
    assert.deepEqual(resolvePickerOptions('ariaHaspopup', rows), []);
  });

  it('lets `kind` decide a boolean even when the type is an opaque alias', () => {
    const rows = [{
      property: 'isQuiet', type: 'SomeInternalAlias', kind: 'boolean', values: [],
    }];
    assert.deepEqual(resolvePickerOptions('isQuiet', rows), ['no', 'yes']);
  });
});

// Characterisation of CATALOG_IMPLEMENTATIONS: the existence gate only applies to an
// implementation that ships a catalog. ios/android are authored entirely from the
// workbook, so a missing row there is normal, not a resolution failure.
describe('the existence gate applies only to implementations with a catalog', () => {
  const controlsMap = buildControlsMap(CONTROLS_SHEET);

  it('skips the gate for an implementation with no catalog', () => {
    const onSkip = [];
    for (const impl of ['ios', 'android']) {
      const result = resolveControl('variant', impl, controlsMap, [], (m) => onSkip.push(m));
      assert.notEqual(result, null, `${impl} should still get a descriptor`);
    }
    assert.deepEqual(onSkip.filter((m) => m.includes("isn't defined in the")), []);
  });

  it('still gates rsp and swc, whose catalogs are authoritative', () => {
    for (const impl of ['rsp', 'swc']) {
      assert.equal(resolveControl('variant', impl, controlsMap, []), null, impl);
    }
  });
});

// Both sentinels mean the same thing to every apply and serialize path — the label
// differs only because "default" is what RSP's docs call an inferred channel. A path
// that compared against one constant would silently reflect the other as a literal
// string value.
describe('isUnsetOption', () => {
  it('recognises both sentinels', () => {
    assert.equal(isUnsetOption(NONE_OPTION), true);
    assert.equal(isUnsetOption(DEFAULT_OPTION), true);
  });

  it('rejects a real option value', () => {
    ['white', 'hue', 'red', 'primary', ''].forEach((v) => assert.equal(isUnsetOption(v), false, v));
  });

  it('rejects a value that merely looks like a sentinel in another case', () => {
    assert.equal(isUnsetOption('none'), false);
    assert.equal(isUnsetOption('Default'), false);
  });

  it('keeps the two sentinels distinct', () => {
    assert.notEqual(NONE_OPTION, DEFAULT_OPTION);
  });

  // The regression this shape exists for. "default" and "None" are real enum members
  // in the shipped catalogs, so a readable sentinel swallows them: ColorSwatchPicker's
  // `rounding` offers "default" with `none` as its own default, and treating the
  // selection as unset dropped the prop and rendered the wrong value.
  it('rejects the real catalog values the labels are drawn from', () => {
    ['default', 'None', 'none', 'full', 'precise'].forEach((v) => {
      assert.equal(isUnsetOption(v), false, v);
    });
  });

  it('renders a label for each sentinel and leaves a real option alone', () => {
    assert.equal(optionLabel(NONE_OPTION), 'None');
    assert.equal(optionLabel(DEFAULT_OPTION), 'default');
    assert.equal(optionLabel('default'), 'default');
    assert.equal(optionLabel('hue'), 'hue');
  });
});

// Guards the collision at the source: no sentinel may equal a value any catalog ships,
// or selecting that value silently means "unset". Reads the real catalogs rather than a
// fixture, so a future upstream enum member that matches fails here.
describe('the sentinels cannot collide with a shipped catalog value', () => {
  const catalogValues = () => {
    const values = new Set();
    for (const dir of ['deps/swc/data', 'deps/rsp/data']) {
      for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
        const parsed = JSON.parse(readFileSync(join(dir, file), 'utf8'));
        for (const row of Array.isArray(parsed) ? parsed : (parsed.props ?? [])) {
          (row.values ?? []).forEach((v) => values.add(String(v)));
        }
      }
    }
    return values;
  };

  it('neither sentinel appears in any catalog row', () => {
    const values = catalogValues();
    assert.equal(values.has(NONE_OPTION), false, NONE_OPTION);
    assert.equal(values.has(DEFAULT_OPTION), false, DEFAULT_OPTION);
  });

  it('proves the guard bites — the old readable sentinels do collide', () => {
    const values = catalogValues();
    assert.ok(values.has('default'), '"default" should still be a real catalog value');
  });
});
