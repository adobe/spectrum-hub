import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_CONCURRENCY, DEFAULT_SITE_ORIGIN, loadConfig } from '../../indexer/config.js';

const complete = {
  ALGOLIA_APP_ID: 'APP',
  ALGOLIA_WRITE_API_KEY: 'KEY',
  ALGOLIA_INDEX_NAME: 'spectrum-docs-dev',
};

describe('loadConfig', () => {
  it('reads the required variables', () => {
    assert.deepEqual(loadConfig(complete), {
      appId: 'APP',
      writeKey: 'KEY',
      indexName: 'spectrum-docs-dev',
      siteOrigin: DEFAULT_SITE_ORIGIN,
      concurrency: DEFAULT_CONCURRENCY,
    });
  });

  it('keeps the default concurrency low enough for the origin', () => {
    // The origin returned HTTP 429 for roughly a third of a 155-page run at 8.
    assert.ok(DEFAULT_CONCURRENCY <= 4, `default was ${DEFAULT_CONCURRENCY}`);
  });

  it('lets INDEXER_CONCURRENCY override the default', () => {
    assert.equal(loadConfig({ ...complete, INDEXER_CONCURRENCY: '6' }).concurrency, 6);
  });

  it('falls back to the default for an unset or empty INDEXER_CONCURRENCY', () => {
    assert.equal(loadConfig({ ...complete, INDEXER_CONCURRENCY: '' }).concurrency, DEFAULT_CONCURRENCY);
  });

  it('rejects a non-positive or non-integer INDEXER_CONCURRENCY', () => {
    // Failing loudly beats silently falling back to a value the operator was
    // trying to change.
    assert.throws(() => loadConfig({ ...complete, INDEXER_CONCURRENCY: '0' }), /INDEXER_CONCURRENCY/);
    assert.throws(() => loadConfig({ ...complete, INDEXER_CONCURRENCY: '-2' }), /INDEXER_CONCURRENCY/);
    assert.throws(() => loadConfig({ ...complete, INDEXER_CONCURRENCY: 'lots' }), /INDEXER_CONCURRENCY/);
  });

  it('lets SITE_ORIGIN override the default', () => {
    const config = loadConfig({ ...complete, SITE_ORIGIN: 'https://example.test' });
    assert.equal(config.siteOrigin, 'https://example.test');
  });

  it('names every missing variable in one error', () => {
    assert.throws(
      () => loadConfig({ ALGOLIA_APP_ID: 'APP' }),
      /ALGOLIA_WRITE_API_KEY.*ALGOLIA_INDEX_NAME|ALGOLIA_INDEX_NAME.*ALGOLIA_WRITE_API_KEY/s,
    );
  });

  it('rejects an empty index name rather than defaulting', () => {
    assert.throws(() => loadConfig({ ...complete, ALGOLIA_INDEX_NAME: '' }), /ALGOLIA_INDEX_NAME/);
  });

  it('strips a trailing slash from SITE_ORIGIN', () => {
    const config = loadConfig({ ...complete, SITE_ORIGIN: 'https://example.test/' });
    assert.equal(config.siteOrigin, 'https://example.test');
  });
});
