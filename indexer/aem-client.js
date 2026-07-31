/**
 * Reads published content from aem.live.
 *
 * fetchImpl is injectable so tests never hit the network, and pages are cached
 * per client because a single fragment is often shared by many pages.
 *
 * The origin rate-limits bursts. A 429 or a 5xx says "ask again", not "this is
 * gone", so those are retried with exponential backoff and only become a thrown
 * failure once the attempts are exhausted. Mapping them to null the way a real
 * 404 is mapped would make a throttled page indistinguishable from a deleted
 * one, and would quietly shrink the index instead of failing the run.
 */

import { httpDateToEpochSeconds } from './records.js';

const QUERY_INDEX = '/query-index.json?limit=500';

/** Statuses where the origin is asking us to come back, not reporting absence. */
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export const DEFAULT_MAX_ATTEMPTS = 4;
export const DEFAULT_BASE_DELAY_MS = 500;

/** A cooperative origin can still name an absurd delay; the run has a schedule. */
const MAX_RETRY_AFTER_MS = 30_000;

const defaultSleep = (ms) => new Promise((done) => { setTimeout(done, ms); });

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
 * Reads Retry-After, which RFC 9110 allows to be either delay-seconds or an
 * HTTP date.
 * @param {string|null} value the raw header
 * @returns {number|null} milliseconds to wait, or null when unusable
 */
export function retryAfterMs(value) {
  if (!value) { return null; }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }

  const epochSeconds = httpDateToEpochSeconds(value);
  if (epochSeconds === null) { return null; }
  const delta = epochSeconds * 1000 - Date.now();
  return delta > 0 ? Math.min(delta, MAX_RETRY_AFTER_MS) : 0;
}

/**
 * @param {object} options siteOrigin, and injectables for tests
 * @returns {object} a client bound to that origin
 */
export function createClient({
  siteOrigin,
  fetchImpl = fetch,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  baseDelayMs = DEFAULT_BASE_DELAY_MS,
  sleep = defaultSleep,
}) {
  const cache = new Map();

  /**
   * Resolves to a response for any status the caller can act on, including a
   * genuine 404. Throws when a retryable condition outlives its attempts, so
   * throttling can never masquerade as missing content.
   */
  async function fetchWithRetry(url) {
    let lastReason = '';

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let response = null;
      try {
        response = await fetchImpl(url);
      } catch (error) {
        // A transport error is as retryable as a 503.
        lastReason = error.message;
      }

      if (response) {
        if (response.ok || !RETRYABLE_STATUSES.has(response.status)) { return response; }
        lastReason = `HTTP ${response.status}`;
      }

      if (attempt < maxAttempts) {
        const advertised = response ? retryAfterMs(response.headers?.get('retry-after')) : null;
        // Exponential: 500ms, 1s, 2s. Retry-After wins when the origin sets it.
        await sleep(advertised ?? baseDelayMs * 2 ** (attempt - 1));
      }
    }

    throw new Error(`Gave up on ${url} after ${maxAttempts} attempts: ${lastReason}`);
  }

  async function fetchQueryIndex() {
    const response = await fetchWithRetry(`${siteOrigin}${QUERY_INDEX}`);
    if (!response.ok) {
      throw new Error(`Could not fetch query-index.json: HTTP ${response.status}`);
    }
    const { data } = await response.json();
    return data || [];
  }

  async function fetchPage(path) {
    if (cache.has(path)) { return cache.get(path); }

    const promise = (async () => {
      const response = await fetchWithRetry(`${siteOrigin}${path}`);
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
