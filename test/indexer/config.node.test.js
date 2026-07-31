import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_SITE_ORIGIN, loadConfig } from '../../indexer/config.js';

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
    });
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
