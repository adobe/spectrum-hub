import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { publish } from '../../indexer/algolia.js';
import { INDEX_SETTINGS } from '../../indexer/settings.js';

describe('INDEX_SETTINGS', () => {
  it('searches title first so highlighting exists and outranks facets', () => {
    assert.equal(INDEX_SETTINGS.searchableAttributes[0], 'title');
  });

  it('highlights title, which is the only text the UI renders', () => {
    assert.ok(INDEX_SETTINGS.attributesToHighlight.includes('title'));
  });

  it('ranks pill fields below prose', () => {
    const attrs = INDEX_SETTINGS.searchableAttributes;
    assert.ok(attrs.indexOf('content') < attrs.indexOf('platform'));
    assert.ok(attrs.indexOf('tags') < attrs.indexOf('implementation'));
  });

  it('collapses results to one row per page', () => {
    assert.equal(INDEX_SETTINGS.attributeForDistinct, 'path');
    assert.equal(INDEX_SETTINGS.distinct, 1);
  });
});

describe('publish', () => {
  it('sets settings before replacing objects', async () => {
    const order = [];
    const clientFactory = () => ({
      setSettings: async () => { order.push('setSettings'); },
      replaceAllObjects: async () => { order.push('replaceAllObjects'); },
    });
    await publish([{ objectID: 'a' }], { appId: 'A', writeKey: 'K', indexName: 'idx' }, { clientFactory });
    assert.deepEqual(order, ['setSettings', 'replaceAllObjects']);
  });

  it('targets the configured index with the given records', async () => {
    const seen = {};
    const clientFactory = () => ({
      setSettings: async (args) => { seen.settings = args; },
      replaceAllObjects: async (args) => { seen.replace = args; },
    });
    const records = [{ objectID: 'a' }];
    await publish(records, { appId: 'A', writeKey: 'K', indexName: 'idx' }, { clientFactory });
    assert.equal(seen.settings.indexName, 'idx');
    assert.equal(seen.replace.indexName, 'idx');
    assert.deepEqual(seen.replace.objects, records);
  });

  it('refuses to publish an empty record set', async () => {
    const clientFactory = () => ({
      setSettings: async () => {},
      replaceAllObjects: async () => {},
    });
    await assert.rejects(
      () => publish([], { appId: 'A', writeKey: 'K', indexName: 'idx' }, { clientFactory }),
      /no records/i,
    );
  });
});
