import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveRspPropKey, hasLabelProp } from '../../deps/rsp/playground/apply-rsp-prop.js';

// The playground's authored property name for a component's text content can
// be "text", "label", or "children" (whichever reads naturally for that
// component in the spreadsheet) — but @react-spectrum/s2 only ever accepts
// text content through the real "children" prop. See blocks/playground/playground.js
// buildRspSnippet's own TEXT_KEYS set for the equivalent snippet-rendering rule.
describe('resolveRspPropKey', () => {
  it('maps "text" to the real "children" prop', () => {
    assert.equal(resolveRspPropKey('text'), 'children');
  });

  it('maps "label" to the real "children" prop when the component has no real label prop (default)', () => {
    assert.equal(resolveRspPropKey('label'), 'children');
  });

  it('maps "label" to the real "children" prop when hasRealLabelProp is explicitly false', () => {
    assert.equal(resolveRspPropKey('label', false), 'children');
  });

  it('leaves "label" as "label" when hasRealLabelProp is true (e.g. Meter, AvatarGroup)', () => {
    assert.equal(resolveRspPropKey('label', true), 'label');
  });

  it('leaves "children" as "children"', () => {
    assert.equal(resolveRspPropKey('children'), 'children');
  });

  it('still maps "text" to "children" even when hasRealLabelProp is true — only "label" is affected', () => {
    assert.equal(resolveRspPropKey('text', true), 'children');
  });

  it('still maps "children" to "children" even when hasRealLabelProp is true', () => {
    assert.equal(resolveRspPropKey('children', true), 'children');
  });

  it('leaves a non-text property name unchanged', () => {
    assert.equal(resolveRspPropKey('variant'), 'variant');
    assert.equal(resolveRspPropKey('isDisabled'), 'isDisabled');
  });
});

// hasLabelProp is how a caller decides whether to pass hasRealLabelProp: true
// above — it just checks whether a component's own RSP prop data documents a
// real "label" property, e.g. Meter/AvatarGroup do, Button/Badge don't.
describe('hasLabelProp', () => {
  it('returns true when a "label" property row is present', () => {
    assert.equal(hasLabelProp([{ property: 'label', type: 'ReactNode' }]), true);
  });

  it('returns false when no "label" property row is present', () => {
    assert.equal(hasLabelProp([{ property: 'variant', type: 'string' }]), false);
  });

  it('returns false for an empty array', () => {
    assert.equal(hasLabelProp([]), false);
  });

  it('returns false for non-array input (e.g. a fetch that failed and fell back to undefined)', () => {
    assert.equal(hasLabelProp(undefined), false);
    assert.equal(hasLabelProp(null), false);
  });
});
