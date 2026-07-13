/**
 * Reindex job: push the EDS query-index.json feed into an Algolia index.
 *
 * The frontend search block reads from Algolia at query time; this job keeps
 * that index in sync with the site's query-index. It is a build-time / CI
 * script, not browser code.
 */

import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

/**
 * Shape of a record in the EDS query-index.json feed.
 * @typedef {object} QueryIndexRecord
 * @property {string} path
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [header]
 * @property {string} [image]
 */

/** Fields copied from the query index into each Algolia record. */
export const INDEXED_FIELDS = ['path', 'title', 'description', 'header', 'image'];

/**
 * Index-level relevance settings, applied once per reindex run.
 *
 * Mirrors the old block's two-tier matching: title and header rank equally and
 * ahead of description (comma-joined attributes share a priority tier in
 * Algolia). `path` and `image` are retrieved for rendering but not searched.
 */
export const INDEX_SETTINGS = {
  searchableAttributes: ['title,header', 'description'],
  attributesToHighlight: ['title', 'header', 'description'],
  attributesToRetrieve: ['path', 'title', 'description', 'header', 'image'],
};

/**
 * Map a single query-index record to an Algolia record.
 *
 * Uses `path` as the stable `objectID` so re-running the job upserts existing
 * records instead of creating duplicates. Records without a usable `path`
 * cannot be addressed in Algolia and are treated as invalid.
 *
 * @param {QueryIndexRecord} record
 * @returns {Record<string, string> | null} the Algolia record, or null if unusable
 */
export function mapRecord(record) {
  if (!record || typeof record.path !== 'string' || !record.path.trim()) {
    return null;
  }

  const mapped = { objectID: record.path };
  INDEXED_FIELDS.forEach((field) => {
    const value = record[field];
    if (typeof value === 'string' && value.length) {
      mapped[field] = value;
    }
  });

  return mapped;
}

/**
 * Map and validate a query-index data array into Algolia records.
 * Records without a usable `path` are skipped.
 *
 * @param {QueryIndexRecord[]} data
 * @returns {Record<string, string>[]}
 */
export function mapRecords(data) {
  if (!Array.isArray(data)) {
    throw new TypeError('query-index data must be an array');
  }
  return data.map(mapRecord).filter(Boolean);
}

/**
 * Load a query-index feed from an HTTPS URL or a local file path.
 *
 * Remote sources must use HTTPS; plain HTTP is rejected so the feed cannot be
 * tampered with in transit. Returns the raw `data` array for {@link mapRecords}.
 *
 * @param {string} source HTTPS URL or local file path
 * @returns {Promise<QueryIndexRecord[]>}
 */
export async function loadQueryIndex(source) {
  if (typeof source !== 'string' || !source) {
    throw new TypeError('query-index source is required');
  }

  let json;
  if (/^https:\/\//i.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`failed to fetch query-index (${response.status})`);
    }
    json = await response.json();
  } else if (/^http:\/\//i.test(source)) {
    throw new Error('query-index source must use https, not http');
  } else {
    json = JSON.parse(await readFile(source, 'utf8'));
  }

  if (!json || !Array.isArray(json.data)) {
    throw new Error('query-index response is missing a data array');
  }
  return json.data;
}

/** Environment variables the reindex job reads for Algolia access. */
export const REQUIRED_ENV = ['ALGOLIA_APP_ID', 'ALGOLIA_ADMIN_KEY', 'ALGOLIA_INDEX_NAME'];

/**
 * Read and validate Algolia credentials from the environment.
 *
 * The admin (write) key must only ever come from the environment — never from
 * source, arguments, or logs. Fails closed, reporting which variables are
 * missing by name only, so a secret value can never leak into an error message.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ appId: string, adminKey: string, indexName: string }}
 */
export function loadCredentials(env = process.env) {
  const missing = REQUIRED_ENV.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(`missing required environment variables: ${missing.join(', ')}`);
  }
  return {
    appId: env.ALGOLIA_APP_ID,
    adminKey: env.ALGOLIA_ADMIN_KEY,
    indexName: env.ALGOLIA_INDEX_NAME,
  };
}

/**
 * Apply index settings and push records to Algolia.
 *
 * The client is injected so this stays unit-testable without network access or
 * credentials. Expects an algoliasearch v5 client exposing
 * `setSettings({ indexName, indexSettings })` and
 * `saveObjects({ indexName, objects })`.
 *
 * Refuses to run with zero records: an empty batch almost always means the feed
 * failed to load, and silently reindexing nothing would mask that failure.
 *
 * @param {object} params
 * @param {{ setSettings: Function, saveObjects: Function }} params.client
 * @param {string} params.indexName
 * @param {Record<string, string>[]} params.records
 * @returns {Promise<{ indexName: string, count: number }>}
 */
export async function reindex({ client, indexName, records }) {
  const usable = client
    && typeof client.setSettings === 'function'
    && typeof client.saveObjects === 'function';
  if (!usable) {
    throw new TypeError('a valid Algolia client is required');
  }
  if (!indexName) {
    throw new TypeError('indexName is required');
  }
  if (!Array.isArray(records) || !records.length) {
    throw new Error('refusing to reindex with zero records');
  }

  await client.setSettings({ indexName, indexSettings: INDEX_SETTINGS });
  await client.saveObjects({ indexName, objects: records });

  return { indexName, count: records.length };
}

/**
 * Create an algoliasearch v5 client.
 *
 * Imported dynamically so the rest of the module (and its unit tests) load
 * without the `algoliasearch` package, which is only needed for a real run.
 *
 * TODO(creds): add `algoliasearch` as a devDependency once the Algolia app is
 * provisioned. Until then, a real run stops here by design — the pure logic
 * above is fully covered by tests.
 *
 * @param {string} appId
 * @param {string} adminKey
 */
export async function createClient(appId, adminKey) {
  // eslint-disable-next-line import/no-unresolved
  const { algoliasearch } = await import('algoliasearch');
  return algoliasearch(appId, adminKey);
}

/**
 * CLI entry point: load the feed, map it, and push it to Algolia.
 * The source is taken from the first argument or QUERY_INDEX_SOURCE.
 */
export async function main() {
  const source = process.argv[2] || process.env.QUERY_INDEX_SOURCE;
  if (!source) {
    throw new Error('provide a query-index source (argument or QUERY_INDEX_SOURCE)');
  }

  const { appId, adminKey, indexName } = loadCredentials();
  const data = await loadQueryIndex(source);
  const records = mapRecords(data);
  const client = await createClient(appId, adminKey);

  const summary = await reindex({ client, indexName, records });
  // eslint-disable-next-line no-console
  console.log(`reindexed ${summary.count} records into "${summary.indexName}"`);
}

// Run only when invoked directly, never when imported by tests.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(`reindex failed: ${err.message}`);
    process.exit(1);
  });
}
