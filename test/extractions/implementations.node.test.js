import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PLATFORMS,
  IMPLEMENTATIONS,
  ALL_OPTION,
  getPlatformById,
  getImplementationsByPlatform,
  getImplementationById,
  getOtherImplementations,
} from '../../scripts/utils/implementations.js';

describe('PLATFORMS', () => {
  it('is the grouped source of truth: each platform has a non-empty id, label, and implementations', () => {
    for (const platform of PLATFORMS) {
      assert.equal(typeof platform.id, 'string');
      assert.ok(platform.id.length > 0);
      assert.equal(typeof platform.label, 'string');
      assert.ok(platform.label.length > 0);
      assert.ok(Array.isArray(platform.implementations));
      assert.ok(platform.implementations.length > 0);
    }
  });

  it('groups the web implementations under the web platform', () => {
    assert.deepEqual(
      getPlatformById('web').implementations.map((impl) => impl.id),
      ['rsp', 'swc'],
    );
  });
});

describe('IMPLEMENTATIONS', () => {
  it('flattens every platform, with ids matching the deps/ directories', () => {
    assert.deepEqual(IMPLEMENTATIONS.map((impl) => impl.id), ['rsp', 'swc']);
  });

  it('gives every implementation a non-empty id, label, and platform', () => {
    for (const impl of IMPLEMENTATIONS) {
      assert.equal(typeof impl.id, 'string');
      assert.ok(impl.id.length > 0);
      assert.equal(typeof impl.label, 'string');
      assert.ok(impl.label.length > 0);
      assert.ok(getPlatformById(impl.platform), 'platform tag resolves to a known platform');
    }
  });
});

describe('getPlatformById', () => {
  it('returns the matching platform', () => {
    assert.equal(getPlatformById('web').label, 'Web');
  });

  it('returns null for an unknown or absent id', () => {
    assert.equal(getPlatformById('nope'), null);
    assert.equal(getPlatformById(undefined), null);
  });
});

describe('getImplementationsByPlatform', () => {
  it('returns the implementations of one platform in declared order', () => {
    assert.deepEqual(getImplementationsByPlatform('web').map((impl) => impl.id), ['rsp', 'swc']);
  });

  it('returns an empty list for an unknown platform', () => {
    assert.deepEqual(getImplementationsByPlatform('nope'), []);
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
  it('returns the sibling implementations on the same platform, excluding the given one', () => {
    assert.deepEqual(getOtherImplementations('rsp').map((impl) => impl.id), ['swc']);
  });

  it('falls back to every implementation when the id is not one of them', () => {
    assert.deepEqual(getOtherImplementations('all').map((impl) => impl.id), ['rsp', 'swc']);
  });
});
