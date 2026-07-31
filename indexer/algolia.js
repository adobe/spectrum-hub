/**
 * Publishes records to Algolia as a full atomic rebuild.
 *
 * replaceAllObjects builds a temporary index and moves it into place, so the
 * live index is never partially populated and deleted pages disappear without
 * any tracked state.
 */

import { algoliasearch } from 'algoliasearch';

import { INDEX_SETTINGS } from './settings.js';

/**
 * @param {object[]} records the complete record set
 * @param {object} config appId, writeKey, indexName
 * @param {object} options optional clientFactory, for tests
 */
export async function publish(records, config, { clientFactory = algoliasearch } = {}) {
  if (!records.length) {
    throw new Error('Refusing to publish: no records were built');
  }

  if (typeof config.indexName !== 'string' || !config.indexName) {
    throw new Error('Invalid indexName: must be a non-empty string');
  }

  const client = clientFactory(config.appId, config.writeKey);

  await client.setSettings({
    indexName: config.indexName,
    indexSettings: INDEX_SETTINGS,
  });

  await client.replaceAllObjects({
    indexName: config.indexName,
    objects: records,
  });
}
