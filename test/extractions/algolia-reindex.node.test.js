import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { INDEX_SETTINGS, mapRecord, mapRecords } from '../../tools/algolia/reindex.js';

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
