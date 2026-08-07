import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  IMPLEMENTATIONS,
  ALL_OPTION,
  getImplementationById,
  getOtherImplementations,
} from '../../scripts/utils/implementations.js';

describe('IMPLEMENTATIONS', () => {
  it('lists the known implementation ids in order', () => {
    assert.deepEqual(IMPLEMENTATIONS.map((impl) => impl.id), ['rsp', 'swc', 'design-only']);
  });

  it('gives every implementation a non-empty id and label', () => {
    for (const impl of IMPLEMENTATIONS) {
      assert.equal(typeof impl.id, 'string');
      assert.ok(impl.id.length > 0);
      assert.equal(typeof impl.label, 'string');
      assert.ok(impl.label.length > 0);
    }
  });

  it('gives every implementation a non-empty shortLabel', () => {
    for (const impl of IMPLEMENTATIONS) {
      assert.equal(typeof impl.shortLabel, 'string');
      assert.ok(impl.shortLabel.length > 0);
    }
  });
});

describe('ALL_OPTION', () => {
  it('is a view option, not one of the implementations', () => {
    assert.equal(ALL_OPTION.id, 'all');
    assert.ok(!IMPLEMENTATIONS.some((impl) => impl.id === ALL_OPTION.id));
  });
});

describe('getImplementationById', () => {
  it('returns the matching implementation', () => {
    assert.equal(getImplementationById('rsp').label, 'React Spectrum');
    assert.equal(getImplementationById('swc').label, 'Spectrum Web Components');
  });

  it('returns null for an unknown or absent id', () => {
    assert.equal(getImplementationById('nope'), null);
    assert.equal(getImplementationById(undefined), null);
  });
});

describe('getOtherImplementations', () => {
  it('returns every implementation except the given one', () => {
    assert.deepEqual(getOtherImplementations('rsp').map((impl) => impl.id), ['swc', 'design-only']);
  });

  it('returns all implementations when the id is not one of them', () => {
    assert.deepEqual(getOtherImplementations('all').map((impl) => impl.id), ['rsp', 'swc', 'design-only']);
  });
});
