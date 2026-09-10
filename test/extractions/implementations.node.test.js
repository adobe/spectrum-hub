import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getPlaygroundConfig,
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

// The playground is the one consumer that used to hardcode `implementation === 'rsp'`
// instead of reading this file. Adding an implementation should stay a single edit here.
describe('getPlaygroundConfig', () => {
  it('returns the shell, snippet location and tag pattern for a web implementation', () => {
    assert.deepEqual(getPlaygroundConfig('swc'), {
      shell: 'deps/swc/playground/index.html',
      snippetDir: 'deps/swc/playground/snippets',
      snippetExt: 'html',
      tagPattern: 'swc-{slug}',
    });
    assert.equal(getPlaygroundConfig('rsp').snippetExt, 'jsx');
    assert.equal(getPlaygroundConfig('rsp').tagPattern, '{Pascal}');
  });

  // ios/android are not in this registry yet and design-only never renders a preview.
  // Both must degrade to the generic shell rather than throwing.
  it('returns null for an implementation with no playground', () => {
    assert.equal(getPlaygroundConfig('design-only'), null);
    assert.equal(getPlaygroundConfig('ios'), null);
    assert.equal(getPlaygroundConfig(undefined), null);
  });

  it('gives every configured implementation a complete config', () => {
    for (const impl of IMPLEMENTATIONS.filter((i) => i.playground)) {
      const { shell, snippetDir, snippetExt, tagPattern } = impl.playground;
      assert.ok(shell && snippetDir && snippetExt && tagPattern, impl.id);
      assert.match(tagPattern, /\{(Pascal|slug)\}/, `${impl.id} tagPattern must interpolate`);
    }
  });
});
