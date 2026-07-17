import assert from 'node:assert/strict';
import { describe, it, mock, beforeEach } from 'node:test';

import {
  fetchPlaygroundSheets,
  getComponentProperties,
  buildControlsMap,
  parsePickerOptions,
  resolvePickerOptions,
  resolveControl,
  normalizePropertyName,
  propertyNameCandidates,
  findSwcProp,
  findRspProp,
  cachedFetch,
  clearFetchCache,
} from '../../blocks/playground/playground-data.js';
import { ICON_OPTIONS, NO_ICON } from '../../deps/shared/playground/icon-options.js';

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

const RSP_PROPS = [
  { property: 'variant', type: "'primary' | 'secondary' | 'accent' | 'negative'" },
  { property: 'fillStyle', type: "'fill' | 'outline'" },
  { property: 'size', type: "'S' | 'M' | 'L' | 'XL'" },
  { property: 'staticColor', type: "'white' | 'black' | 'auto'" },
  { property: 'isPending', type: 'boolean' },
  { property: 'isQuiet', type: 'boolean' },
  { property: 'children', type: 'ReactNode' },
];

const SWC_PROPS = [
  { property: 'variant', attribute: 'variant', type: 'ButtonVariant' },
  { property: 'fillStyle', attribute: 'fill-style', type: 'ButtonFillStyle' },
  { property: 'size', attribute: 'size', type: 'ElementSize' },
  { property: 'disabled', attribute: 'disabled', type: 'boolean' },
  { property: 'pending', attribute: 'pending', type: 'boolean' },
  { property: 'quiet', attribute: 'quiet', type: 'boolean' },
  { property: 'truncate', attribute: 'truncate', type: 'boolean' },
  // SWC-only property whose type is a named (non-boolean) type with no RSP entry.
  { property: 'labelAlign', attribute: 'label-align', type: 'LabelAlign' },
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
  it('returns the property list for a known component', () => {
    const result = getComponentProperties('Button', COMPONENTS_SHEET);
    assert.deepEqual(result, ['variant', 'staticColor', 'text', 'fillStyle', 'size', 'isDisabled']);
  });

  it('is case-insensitive on the component name', () => {
    assert.equal(getComponentProperties('button', COMPONENTS_SHEET).length, 6);
    assert.equal(getComponentProperties('BUTTON', COMPONENTS_SHEET).length, 6);
  });

  it('returns an empty array for a component with an empty properties string', () => {
    assert.deepEqual(getComponentProperties('Accordion', COMPONENTS_SHEET), []);
  });

  it('returns an empty array for a component with a null properties value', () => {
    assert.deepEqual(getComponentProperties('Badge', COMPONENTS_SHEET), []);
  });

  it('returns an empty array for an unknown component', () => {
    assert.deepEqual(getComponentProperties('NonExistent', COMPONENTS_SHEET), []);
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

describe('parsePickerOptions', () => {
  it('extracts values from a union type string', () => {
    assert.deepEqual(
      parsePickerOptions("'primary' | 'secondary' | 'accent'"),
      ['primary', 'secondary', 'accent'],
    );
  });

  it('returns an empty array for a non-union type like boolean', () => {
    assert.deepEqual(parsePickerOptions('boolean'), []);
  });

  it('returns an empty array for complex types like ReactNode', () => {
    assert.deepEqual(parsePickerOptions('ReactNode'), []);
  });

  it('returns an empty array for an empty string', () => {
    assert.deepEqual(parsePickerOptions(''), []);
  });

  it('returns an empty array for a null/undefined input', () => {
    assert.deepEqual(parsePickerOptions(null), []);
    assert.deepEqual(parsePickerOptions(undefined), []);
  });
});

describe('resolvePickerOptions', () => {
  it('returns parsed options from RSP data', () => {
    assert.deepEqual(
      resolvePickerOptions('variant', RSP_PROPS, SWC_PROPS),
      ['primary', 'secondary', 'accent', 'negative'],
    );
  });

  it('returns [no, yes] for a boolean property in RSP', () => {
    assert.deepEqual(resolvePickerOptions('isPending', RSP_PROPS, SWC_PROPS), ['no', 'yes']);
    assert.deepEqual(resolvePickerOptions('isQuiet', RSP_PROPS, SWC_PROPS), ['no', 'yes']);
  });

  it('returns [no, yes] for a boolean property in SWC (exact match)', () => {
    assert.deepEqual(resolvePickerOptions('disabled', RSP_PROPS, SWC_PROPS), ['no', 'yes']);
  });

  it('returns [no, yes] for a boolean SWC property reached via name normalization', () => {
    assert.deepEqual(resolvePickerOptions('isDisabled', RSP_PROPS, SWC_PROPS), ['no', 'yes']);
  });

  it('returns an empty array for an SWC-only property with a named (non-boolean) type', () => {
    // labelAlign exists only in SWC and its type is a named type, so no options
    // can be resolved — RSP has nothing to fall back to.
    assert.deepEqual(resolvePickerOptions('labelAlign', RSP_PROPS, SWC_PROPS), []);
  });

  it('returns an empty array for a property not in either dataset', () => {
    assert.deepEqual(resolvePickerOptions('unknown', RSP_PROPS, SWC_PROPS), []);
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

describe('findRspProp', () => {
  it('finds a row by exact property name', () => {
    assert.deepEqual(findRspProp('isQuiet', RSP_PROPS), RSP_PROPS.find((p) => p.property === 'isQuiet'));
  });

  it('finds an is/has-prefixed rsp row from a bare swc-style name', () => {
    assert.deepEqual(findRspProp('quiet', RSP_PROPS), RSP_PROPS.find((p) => p.property === 'isQuiet'));
    assert.deepEqual(findRspProp('pending', RSP_PROPS), RSP_PROPS.find((p) => p.property === 'isPending'));
  });

  it('returns undefined when no candidate matches', () => {
    assert.equal(findRspProp('nonexistent', RSP_PROPS), undefined);
  });
});

describe('findSwcProp', () => {
  it('finds a row by exact property name', () => {
    assert.deepEqual(findSwcProp('disabled', SWC_PROPS), SWC_PROPS.find((p) => p.property === 'disabled'));
  });

  it('falls back to the normalized name when there is no exact match', () => {
    assert.deepEqual(findSwcProp('isDisabled', SWC_PROPS), SWC_PROPS.find((p) => p.property === 'disabled'));
  });

  it('returns undefined when neither the exact nor normalized name matches', () => {
    assert.equal(findSwcProp('unknown', SWC_PROPS), undefined);
  });
});

describe('resolveControl', () => {
  const controlsMap = buildControlsMap(CONTROLS_SHEET);

  it('returns a control descriptor for a property that exists in rsp', () => {
    const result = resolveControl('variant', 'rsp', controlsMap, RSP_PROPS, SWC_PROPS);
    assert.deepEqual(result, {
      controlType: 'picker',
      options: ['primary', 'secondary', 'accent', 'negative'],
      attribute: 'variant',
    });
  });

  it('returns a control descriptor for a property that exists in swc', () => {
    const result = resolveControl('fillStyle', 'swc', controlsMap, RSP_PROPS, SWC_PROPS);
    assert.notEqual(result, null);
    assert.equal(result.attribute, 'fill-style');
    // CONTROLS_SHEET authors fillStyle as a segmentedControl, not the picker default.
    assert.equal(result.controlType, 'segmentedControl');
  });

  it('returns null for a swc-only property when implementation is rsp', () => {
    assert.equal(resolveControl('truncate', 'rsp', controlsMap, RSP_PROPS, SWC_PROPS), null);
  });

  it('returns a descriptor for a swc-only property when implementation is swc', () => {
    const result = resolveControl('truncate', 'swc', controlsMap, RSP_PROPS, SWC_PROPS);
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

  it('returns null attribute when property has no swc equivalent even after normalization', () => {
    const result = resolveControl('children', 'rsp', controlsMap, RSP_PROPS, SWC_PROPS);
    assert.equal(result.attribute, null);
  });

  it('normalizes isDisabled to disabled for swc matching', () => {
    const result = resolveControl('isDisabled', 'swc', controlsMap, RSP_PROPS, SWC_PROPS);
    assert.notEqual(result, null);
    assert.equal(result.attribute, 'disabled');
  });

  it('normalizes isPending to pending for swc matching', () => {
    const result = resolveControl('isPending', 'swc', controlsMap, RSP_PROPS, SWC_PROPS);
    assert.notEqual(result, null);
    assert.equal(result.attribute, 'pending');
  });

  it('normalizes isQuiet to quiet for swc matching', () => {
    const result = resolveControl('isQuiet', 'swc', controlsMap, RSP_PROPS, SWC_PROPS);
    assert.notEqual(result, null);
    assert.equal(result.attribute, 'quiet');
  });

  it('returns the normalized swc attribute when looking up isPending for rsp', () => {
    const result = resolveControl('isPending', 'rsp', controlsMap, RSP_PROPS, SWC_PROPS);
    assert.notEqual(result, null);
    assert.equal(result.attribute, 'pending');
  });

  it('resolves an rsp control from a swc-style boolean name via an added prefix (quiet -> isQuiet)', () => {
    const result = resolveControl('quiet', 'rsp', controlsMap, RSP_PROPS, SWC_PROPS);
    assert.notEqual(result, null);
    assert.deepEqual(result.options, ['no', 'yes']);
  });

  it('resolves an rsp control from a swc-style boolean name (pending -> isPending)', () => {
    const result = resolveControl('pending', 'rsp', controlsMap, RSP_PROPS, SWC_PROPS);
    assert.notEqual(result, null);
    assert.deepEqual(result.options, ['no', 'yes']);
  });

  it('still returns null for a swc-only property with no rsp equivalent under any prefix', () => {
    assert.equal(resolveControl('truncate', 'rsp', controlsMap, RSP_PROPS, SWC_PROPS), null);
  });

  describe('onSkip callback', () => {
    it('is not called when a control resolves successfully', () => {
      const onSkip = mock.fn();
      resolveControl('variant', 'rsp', controlsMap, RSP_PROPS, SWC_PROPS, onSkip);
      assert.equal(onSkip.mock.callCount(), 0);
    });

    it('is called with a plain-English reason when the property is absent from the implementation data', () => {
      const onSkip = mock.fn();
      resolveControl('truncate', 'rsp', controlsMap, RSP_PROPS, SWC_PROPS, onSkip);
      assert.equal(onSkip.mock.callCount(), 1);
      const [message] = onSkip.mock.calls[0].arguments;
      assert.match(message, /"truncate"/);
      assert.match(message, /RSP data/);
    });

    it('is called with a plain-English reason when the property type cannot be resolved to options', () => {
      const onSkip = mock.fn();
      const result = resolveControl('children', 'rsp', controlsMap, RSP_PROPS, SWC_PROPS, onSkip);
      assert.deepEqual(result.options, []);
      assert.equal(onSkip.mock.callCount(), 1);
      const [message] = onSkip.mock.calls[0].arguments;
      assert.match(message, /"children"/);
      assert.match(message, /ReactNode/);
    });

    it('does not throw when onSkip is omitted', () => {
      assert.doesNotThrow(() => resolveControl('truncate', 'rsp', controlsMap, RSP_PROPS, SWC_PROPS));
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
      const result = resolveControl('text', 'rsp', textControlsMap, RSP_PROPS, SWC_PROPS);
      assert.notEqual(result, null);
      assert.equal(result.controlType, 'textfield');
    });

    it('resolves a "text" control for swc even when absent from the SWC prop data', () => {
      const result = resolveControl('text', 'swc', textControlsMap, RSP_PROPS, SWC_PROPS);
      assert.notEqual(result, null);
      assert.equal(result.controlType, 'textfield');
    });

    it('does not warn that "text" is missing from the implementation data', () => {
      const onSkip = mock.fn();
      resolveControl('text', 'rsp', textControlsMap, RSP_PROPS, SWC_PROPS, onSkip);
      const messages = onSkip.mock.calls.map((c) => c.arguments[0]);
      assert.ok(!messages.some((m) => m.includes('RSP data')));
    });

    it('also bypasses the existence check for "label" and "children"', () => {
      const labelMap = buildControlsMap([{ property: 'label', control: 'textfield' }]);
      assert.notEqual(resolveControl('label', 'swc', labelMap, RSP_PROPS, SWC_PROPS), null);

      const childrenMap = buildControlsMap([{ property: 'children', control: 'textfield' }]);
      assert.notEqual(resolveControl('children', 'swc', childrenMap, RSP_PROPS, SWC_PROPS), null);
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
      const result = resolveControl('icon', 'swc', iconMap, RSP_PROPS, SWC_PROPS);
      // NO_ICON always leads the list, ahead of the sheet's curated options —
      // it's the default value, see resolveControl's own comment on this.
      assert.deepEqual(result, {
        controlType: 'icon',
        options: [NO_ICON, 'search', 'copy', 'checkmarkcircle'],
        attribute: null,
      });
    });

    it('bypasses the existence check for both implementations', () => {
      assert.notEqual(resolveControl('icon', 'swc', iconMap, RSP_PROPS, SWC_PROPS), null);
      assert.notEqual(resolveControl('icon', 'rsp', iconMap, RSP_PROPS, SWC_PROPS), null);
    });

    it('always returns a null attribute, since the value flows to a slot, not a real attribute', () => {
      const result = resolveControl('icon', 'rsp', iconMap, RSP_PROPS, SWC_PROPS);
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
      const result = resolveControl('icon', 'swc', emptyIconMap, RSP_PROPS, SWC_PROPS, onSkip);
      assert.deepEqual(result.options, [NO_ICON, ...ICON_OPTIONS]);
      assert.equal(onSkip.mock.callCount(), 0);
    });
  });
});
