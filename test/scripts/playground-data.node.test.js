import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import {
  getComponentProperties,
  buildControlsMap,
  parsePickerOptions,
  resolvePickerOptions,
  resolveControl,
  normalizePropertyName,
  findSwcProp,
} from '../../scripts/utils/playground-data.js';

const COMPONENTS_SHEET = [
  { component: 'Button', properties: 'variant, staticColor, text, fillStyle, size, isDisabled' },
  { component: 'Accordion', properties: '' },
  { component: 'Badge', properties: null },
];

const CONTROLS_SHEET = [
  { property: 'variant', v1: 'picker', 'v1+': 'picker' },
  { property: 'staticColor', v1: 'picker', 'v1+': 'radio' },
  { property: 'text', v1: 'picker', 'v1+': 'textfield' },
  { property: 'fillStyle', v1: 'picker', 'v1+': 'radio' },
  { property: 'size', v1: 'picker', 'v1+': 'radio' },
  { property: 'isDisabled', v1: 'picker', 'v1+': 'switch' },
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
];

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
    assert.deepEqual(map.get('variant'), { v1: 'picker', v1plus: 'picker' });
    assert.deepEqual(map.get('isDisabled'), { v1: 'picker', v1plus: 'switch' });
  });

  it('contains all rows from the sheet', () => {
    const map = buildControlsMap(CONTROLS_SHEET);
    assert.equal(map.size, CONTROLS_SHEET.length);
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
    assert.equal(result.controlType, 'picker');
  });

  it('returns null for a swc-only property when implementation is rsp', () => {
    assert.equal(resolveControl('truncate', 'rsp', controlsMap, RSP_PROPS, SWC_PROPS), null);
  });

  it('returns null for a property absent from both datasets when implementation is swc', () => {
    assert.equal(resolveControl('children', 'swc', controlsMap, RSP_PROPS, SWC_PROPS), null);
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
});
