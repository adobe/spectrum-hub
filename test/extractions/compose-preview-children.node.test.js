import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { composeChildren, buildIconChild } from '../../deps/rsp/playground/compose-preview-children.js';
import { NO_ICON } from '../../deps/shared/playground/icon-options.js';

function fakeCreateElement(type, props, ...children) {
  return { type, props, children };
}

describe('composeChildren', () => {
  it('returns just the text child when there is no icon', () => {
    assert.equal(composeChildren(null, 'Save'), 'Save');
  });

  it('returns just the icon child when there is no text', () => {
    const icon = { type: 'svg' };
    assert.equal(composeChildren(icon, null), icon);
  });

  it('returns both as an array, icon first, when both are present', () => {
    const icon = { type: 'svg' };
    assert.deepEqual(composeChildren(icon, 'Save'), [icon, 'Save']);
  });

  it('treats an empty string text child as present (not falsy-omitted)', () => {
    const icon = { type: 'svg' };
    assert.deepEqual(composeChildren(icon, ''), [icon, '']);
  });

  it('returns null when neither an icon nor text is present', () => {
    assert.equal(composeChildren(null, null), null);
  });
});

describe('buildIconChild', () => {
  it('returns null for NO_ICON', () => {
    assert.equal(buildIconChild(fakeCreateElement, NO_ICON), null);
  });

  it('builds an explicitly-sized svg element with a nested <use> pointing at the icon href', () => {
    const el = buildIconChild(fakeCreateElement, 'search');
    assert.equal(el.type, 'svg');
    assert.equal(el.props.viewBox, '0 0 20 20');
    assert.equal(el.props.width, 20);
    assert.equal(el.props.height, 20);
    assert.equal(el.props.fill, 'currentColor');
    assert.equal(el.children.length, 1);
    assert.equal(el.children[0].type, 'use');
    assert.ok(el.children[0].props.href.includes('search'));
  });
});
