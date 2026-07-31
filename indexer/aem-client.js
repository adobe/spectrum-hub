/**
 * Reads published content from aem.live.
 *
 * fetchImpl is injectable so tests never hit the network, and pages are cached
 * per client because a single fragment is often shared by many pages.
 */

import { httpDateToEpochSeconds } from './records.js';

const QUERY_INDEX = '/query-index.json?limit=500';

/**
 * Runs an async worker over items, capped at `limit` in flight.
 * @param {any[]} items input values
 * @param {number} limit maximum concurrent workers
 * @param {Function} worker receives (item, index)
 * @returns {Promise<any[]>} results in input order
 */
export async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;

  const run = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

/**
 * @param {object} options siteOrigin and an optional fetch implementation
 * @returns {object} a client bound to that origin
 */
export function createClient({ siteOrigin, fetchImpl = fetch }) {
  const cache = new Map();

  async function fetchQueryIndex() {
    const response = await fetchImpl(`${siteOrigin}${QUERY_INDEX}`);
    if (!response.ok) {
      throw new Error(`Could not fetch query-index.json: HTTP ${response.status}`);
    }
    const { data } = await response.json();
    return data || [];
  }

  async function fetchPage(path) {
    if (cache.has(path)) { return cache.get(path); }

    const promise = (async () => {
      const response = await fetchImpl(`${siteOrigin}${path}`);
      const result = response.ok
        ? {
          html: await response.text(),
          lastModified: httpDateToEpochSeconds(response.headers.get('last-modified')),
        }
        : null;
      return result;
    })().catch((err) => {
      cache.delete(path);
      throw err;
    });

    cache.set(path, promise);
    return promise;
  }

  return { fetchQueryIndex, fetchPage };
}
