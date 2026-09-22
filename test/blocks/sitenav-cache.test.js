import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

import {
  CACHE_KEY,
  CACHE_VERSION,
  MAX_STALE_MS,
  normalizeIndexRows,
  readPublicNavCache,
  removePublicNavCache,
  sameNavSource,
  writePublicNavCache,
} from '../../blocks/sitenav/sitenav-cache.js';

const withThrowingLocalStorage = (callback) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('denied', 'SecurityError');
    },
  });

  try {
    callback();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, 'localStorage', descriptor);
    } else {
      delete globalThis.localStorage;
    }
  }
};

describe('sitenav public cache reads', () => {
  const now = Date.UTC(2026, 8, 21);
  let storage;

  const snapshot = (overrides = {}) => ({
    version: CACHE_VERSION,
    savedAt: now - 1000,
    filteredListHtml: '<ul><li><a href="/public">Public</a></li></ul>',
    indexRows: [{ path: '/public', title: 'Public' }],
    ...overrides,
  });

  beforeEach(() => {
    storage = {
      getItem: sinon.stub(),
      setItem: sinon.stub(),
      removeItem: sinon.stub(),
    };
  });

  it('exports the versioned cache constants', () => {
    expect(CACHE_VERSION).to.equal(1);
    expect(CACHE_KEY).to.equal('spectrum-hub:sitenav:public:v1');
    expect(MAX_STALE_MS).to.equal(7 * 24 * 60 * 60 * 1000);
  });

  it('returns a valid unexpired snapshot', () => {
    const value = snapshot();
    storage.getItem.withArgs(CACHE_KEY).returns(JSON.stringify(value));

    expect(readPublicNavCache({ storage, now })).to.deep.equal(value);
  });

  it('accepts a snapshot exactly at the expiry boundary', () => {
    const value = snapshot({ savedAt: now - MAX_STALE_MS });
    storage.getItem.returns(JSON.stringify(value));

    expect(readPublicNavCache({ storage, now })).to.deep.equal(value);
  });

  it('removes and rejects a snapshot beyond the expiry boundary', () => {
    storage.getItem.returns(JSON.stringify(snapshot({
      savedAt: now - MAX_STALE_MS - 1,
    })));

    expect(readPublicNavCache({ storage, now })).to.equal(null);
    expect(storage.removeItem.calledOnceWithExactly(CACHE_KEY)).to.equal(true);
  });

  it('removes and rejects a future-dated snapshot', () => {
    storage.getItem.returns(JSON.stringify(snapshot({ savedAt: now + 1 })));

    expect(readPublicNavCache({ storage, now })).to.equal(null);
    expect(storage.removeItem.calledOnceWithExactly(CACHE_KEY)).to.equal(true);
  });

  [
    ['malformed JSON', '{'],
    ['the wrong version', JSON.stringify(snapshot({ version: CACHE_VERSION + 1 }))],
    ['a missing field', JSON.stringify({
      version: CACHE_VERSION,
      savedAt: now,
      indexRows: [],
    })],
    ['a non-finite savedAt', JSON.stringify(snapshot({ savedAt: 'today' }))],
    ['empty filtered HTML', JSON.stringify(snapshot({ filteredListHtml: '  ' }))],
    ['non-array index rows', JSON.stringify(snapshot({ indexRows: {} }))],
    ['an index row with a non-string path', JSON.stringify(snapshot({
      indexRows: [{ path: null, title: 'Public' }],
    }))],
    ['an index row with a non-string title', JSON.stringify(snapshot({
      indexRows: [{ path: '/public', title: null }],
    }))],
  ].forEach(([description, storedValue]) => {
    it(`removes and rejects ${description}`, () => {
      storage.getItem.returns(storedValue);

      expect(readPublicNavCache({ storage, now })).to.equal(null);
      expect(storage.removeItem.calledOnceWithExactly(CACHE_KEY)).to.equal(true);
    });
  });

  it('returns null when reading storage is denied', () => {
    storage.getItem.throws(new Error('denied'));

    expect(readPublicNavCache({ storage, now })).to.equal(null);
  });

  it('does not throw when removing an invalid entry is denied', () => {
    storage.getItem.returns('{');
    storage.removeItem.throws(new Error('denied'));

    expect(readPublicNavCache({ storage, now })).to.equal(null);
  });

  it('does not throw when explicit removal is denied', () => {
    storage.removeItem.throws(new Error('denied'));

    expect(() => removePublicNavCache(storage)).not.to.throw();
  });

  it('returns null when acquiring default storage is denied', () => {
    withThrowingLocalStorage(() => {
      expect(readPublicNavCache()).to.equal(null);
    });
  });

  it('does not throw when acquiring default storage for removal is denied', () => {
    withThrowingLocalStorage(() => {
      expect(() => removePublicNavCache()).not.to.throw();
    });
  });
});

describe('sitenav public cache sources', () => {
  const source = {
    filteredListHtml: '<ul><li><a href="/public">Public</a></li></ul>',
    indexRows: [{ path: '/public', title: 'Public' }],
  };
  let cacheStorage;

  beforeEach(() => {
    cacheStorage = {
      getItem: sinon.stub(),
      setItem: sinon.stub(),
      removeItem: sinon.stub(),
    };
  });

  it('trims valid rows, sorts by path then title, and drops extra fields', () => {
    expect(normalizeIndexRows([
      { title: ' Zebra ', path: ' /z ', ignored: true },
      { title: 'Beta', path: '/a' },
      { title: ' Alpha ', path: ' /a ' },
    ])).to.deep.equal([
      { path: '/a', title: 'Alpha' },
      { path: '/a', title: 'Beta' },
      { path: '/z', title: 'Zebra' },
    ]);
  });

  it('returns no rows for a non-array input', () => {
    expect(normalizeIndexRows(null)).to.deep.equal([]);
  });

  it('compares equivalent sources independently of row order and whitespace', () => {
    const left = {
      ...source,
      indexRows: [
        { path: '/z', title: 'Zebra' },
        { path: '/a', title: 'Alpha' },
      ],
    };
    const right = {
      ...source,
      indexRows: [
        { path: ' /a ', title: ' Alpha ' },
        { path: '/z', title: 'Zebra', ignored: true },
      ],
    };

    expect(sameNavSource(left, right)).to.equal(true);
  });

  it('rejects sources with different filtered HTML', () => {
    expect(sameNavSource(source, {
      ...source,
      filteredListHtml: '<ul><li>Changed</li></ul>',
    })).to.equal(false);
  });

  it('rejects sources with different normalized index rows', () => {
    expect(sameNavSource(source, {
      ...source,
      indexRows: [{ path: '/other', title: 'Other' }],
    })).to.equal(false);
  });

  it('returns false when either compared source is missing', () => {
    expect(sameNavSource(source, null)).to.equal(false);
    expect(sameNavSource(undefined, source)).to.equal(false);
  });

  it('returns false instead of normalizing a source with malformed index rows', () => {
    expect(sameNavSource(source, {
      ...source,
      indexRows: [
        { path: '/public', title: 'Public' },
        { path: '/malformed', title: null },
      ],
    })).to.equal(false);
  });

  it('writes a normalized, versioned snapshot with the supplied timestamp', () => {
    const savedAt = Date.UTC(2026, 8, 21);
    const unnormalizedSource = {
      ...source,
      indexRows: [{ path: ' /public ', title: ' Public ', ignored: true }],
    };

    expect(writePublicNavCache(unnormalizedSource, {
      storage: cacheStorage,
      now: savedAt,
      enabled: true,
      anonymous: true,
    })).to.equal(true);

    expect(cacheStorage.setItem.calledOnce).to.equal(true);
    const [key, serialized] = cacheStorage.setItem.firstCall.args;
    expect(key).to.equal(CACHE_KEY);
    expect(JSON.parse(serialized)).to.deep.equal({
      version: CACHE_VERSION,
      savedAt,
      filteredListHtml: source.filteredListHtml,
      indexRows: [{ path: '/public', title: 'Public' }],
    });
  });

  [
    ['disabled', false, true],
    ['authenticated', true, false],
    ['disabled and authenticated', false, false],
  ].forEach(([description, enabled, anonymous]) => {
    it(`skips writes when caching is ${description}`, () => {
      expect(writePublicNavCache(source, {
        storage: cacheStorage,
        enabled,
        anonymous,
      })).to.equal(false);
      expect(cacheStorage.setItem.called).to.equal(false);
    });
  });

  [
    ['disabled', false, true],
    ['authenticated', true, false],
  ].forEach(([description, enabled, anonymous]) => {
    it(`does not acquire default storage when caching is ${description}`, () => {
      withThrowingLocalStorage(() => {
        expect(writePublicNavCache(source, { enabled, anonymous })).to.equal(false);
      });
    });
  });

  it('returns false instead of throwing when quota is exceeded', () => {
    cacheStorage.setItem.throws(new Error('quota exceeded'));

    expect(writePublicNavCache(source, {
      storage: cacheStorage,
      enabled: true,
      anonymous: true,
    })).to.equal(false);
  });

  it('returns false instead of throwing for malformed source data', () => {
    expect(writePublicNavCache(null, {
      storage: cacheStorage,
      enabled: true,
      anonymous: true,
    })).to.equal(false);
    expect(cacheStorage.setItem.called).to.equal(false);
  });

  [
    ['a non-string path', [
      { path: '/valid', title: 'Valid' },
      { path: null, title: 'Malformed' },
    ]],
    ['a non-string title', [
      { path: '/valid', title: 'Valid' },
      { path: '/malformed', title: null },
    ]],
  ].forEach(([description, indexRows]) => {
    it(`rejects the entire source and does not persist when an index row has ${description}`, () => {
      expect(writePublicNavCache({
        ...source,
        indexRows,
      }, {
        storage: cacheStorage,
        enabled: true,
        anonymous: true,
      })).to.equal(false);
      expect(cacheStorage.setItem.called).to.equal(false);
    });
  });
});
