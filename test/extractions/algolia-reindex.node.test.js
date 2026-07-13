import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterEach, beforeEach, describe, it,
} from 'node:test';

import {
  INDEX_SETTINGS,
  loadCredentials,
  loadQueryIndex,
  mapRecord,
  mapRecords,
} from '../../tools/algolia/reindex.js';

const FULL_ENV = {
  ALGOLIA_APP_ID: 'app123',
  ALGOLIA_ADMIN_KEY: 'super-secret-admin-key',
  ALGOLIA_INDEX_NAME: 'spectrum_hub',
};

describe('mapRecord', () => {
  it('uses path as the stable objectID', () => {
    const mapped = mapRecord({ path: '/components/button', title: 'Button' });
    assert.equal(mapped.objectID, '/components/button');
    assert.equal(mapped.path, '/components/button');
  });

  it('copies optional fields when present', () => {
    const mapped = mapRecord({
      path: '/p',
      title: 'Title',
      description: 'Desc',
      header: 'Header',
      image: '/img.png',
    });
    assert.equal(mapped.title, 'Title');
    assert.equal(mapped.description, 'Desc');
    assert.equal(mapped.header, 'Header');
    assert.equal(mapped.image, '/img.png');
  });

  it('omits optional fields that are missing or empty', () => {
    const mapped = mapRecord({ path: '/p', title: 'Only title', description: '' });
    assert.equal(mapped.title, 'Only title');
    assert.ok(!('description' in mapped));
    assert.ok(!('header' in mapped));
    assert.ok(!('image' in mapped));
  });

  it('returns null when path is missing, empty, or not a string', () => {
    assert.equal(mapRecord({ title: 'No path' }), null);
    assert.equal(mapRecord({ path: '   ' }), null);
    assert.equal(mapRecord({ path: 42 }), null);
    assert.equal(mapRecord(null), null);
  });
});

describe('loadQueryIndex', () => {
  /** @type {typeof fetch} */
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch({ ok = true, status = 200, body = {} }) {
    globalThis.fetch = async () => ({ ok, status, json: async () => body });
  }

  it('fetches and returns the data array from an https source', async () => {
    mockFetch({ body: { data: [{ path: '/a' }] } });
    const data = await loadQueryIndex('https://example.com/query-index.json');
    assert.deepEqual(data, [{ path: '/a' }]);
  });

  it('throws when the fetch response is not ok', async () => {
    mockFetch({ ok: false, status: 503 });
    await assert.rejects(
      loadQueryIndex('https://example.com/query-index.json'),
      /503/,
    );
  });

  it('rejects plain http sources', async () => {
    await assert.rejects(
      loadQueryIndex('http://example.com/query-index.json'),
      /https/,
    );
  });

  it('throws when the response has no data array', async () => {
    mockFetch({ body: { notData: [] } });
    await assert.rejects(
      loadQueryIndex('https://example.com/query-index.json'),
      /data array/,
    );
  });

  it('reads a local file path', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'algolia-reindex-'));
    const file = join(dir, 'query-index.json');
    await writeFile(file, JSON.stringify({ data: [{ path: '/local' }] }));
    try {
      const data = await loadQueryIndex(file);
      assert.deepEqual(data, [{ path: '/local' }]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('requires a non-empty source', async () => {
    await assert.rejects(loadQueryIndex(''), TypeError);
  });
});

describe('loadCredentials', () => {
  it('returns the credentials when every variable is present', () => {
    assert.deepEqual(loadCredentials(FULL_ENV), {
      appId: 'app123',
      adminKey: 'super-secret-admin-key',
      indexName: 'spectrum_hub',
    });
  });

  it('throws listing the missing variable names', () => {
    assert.throws(
      () => loadCredentials({ ALGOLIA_APP_ID: 'app123' }),
      /ALGOLIA_ADMIN_KEY.*ALGOLIA_INDEX_NAME|ALGOLIA_INDEX_NAME.*ALGOLIA_ADMIN_KEY/,
    );
  });

  it('never includes a secret value in the error message', () => {
    // admin key present but index name missing -> error must not echo the key
    try {
      loadCredentials({ ALGOLIA_APP_ID: 'app123', ALGOLIA_ADMIN_KEY: 'super-secret-admin-key' });
      assert.fail('expected loadCredentials to throw');
    } catch (err) {
      assert.ok(!err.message.includes('super-secret-admin-key'));
    }
  });
});

describe('INDEX_SETTINGS', () => {
  it('ranks title and header ahead of description', () => {
    assert.deepEqual(INDEX_SETTINGS.searchableAttributes, ['title,header', 'description']);
  });

  it('retrieves the fields the frontend needs to render a result', () => {
    ['path', 'title', 'description', 'image'].forEach((field) => {
      assert.ok(
        INDEX_SETTINGS.attributesToRetrieve.includes(field),
        `expected attributesToRetrieve to include ${field}`,
      );
    });
  });

  it('highlights the text fields shown in results', () => {
    assert.deepEqual(INDEX_SETTINGS.attributesToHighlight, ['title', 'header', 'description']);
  });
});

describe('mapRecords', () => {
  it('maps every valid record in the array', () => {
    const records = mapRecords([
      { path: '/a', title: 'A' },
      { path: '/b', title: 'B' },
    ]);
    assert.equal(records.length, 2);
    assert.deepEqual(records.map((r) => r.objectID), ['/a', '/b']);
  });

  it('skips records without a usable path', () => {
    const records = mapRecords([
      { path: '/a', title: 'A' },
      { title: 'no path' },
      { path: '', title: 'empty path' },
    ]);
    assert.equal(records.length, 1);
    assert.equal(records[0].objectID, '/a');
  });

  it('throws when given a non-array', () => {
    assert.throws(() => mapRecords({ data: [] }), TypeError);
    assert.throws(() => mapRecords(null), TypeError);
  });
});
