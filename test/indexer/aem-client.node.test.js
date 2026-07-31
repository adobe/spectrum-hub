import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_MAX_ATTEMPTS,
  createClient,
  mapWithConcurrency,
  retryAfterMs,
} from '../../tools/indexer/aem-client.js';

const ORIGIN = 'https://site.test';

/**
 * Records the delays a client would have waited instead of waiting them, so a
 * backoff test costs no wall-clock time.
 */
function fakeSleep() {
  const delays = [];
  return { delays, sleep: async (ms) => { delays.push(ms); } };
}

/** Replays a queue of canned responses, one per call. */
function scriptedFetch(script) {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    const step = script[Math.min(calls.length - 1, script.length - 1)];
    if (step.throws) { throw new Error(step.throws); }
    return {
      ok: step.status === 200,
      status: step.status,
      text: async () => step.body ?? '',
      json: async () => JSON.parse(step.body ?? '{}'),
      headers: { get: (name) => (step.headers || {})[name.toLowerCase()] ?? null },
    };
  };
  return { impl, calls };
}

/** Minimal fetch double: a url -> { status, body, headers } map. */
function fakeFetch(routes) {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    const route = routes[url];
    if (!route) { return { ok: false, status: 404 }; }
    return {
      ok: true,
      status: 200,
      text: async () => route.body,
      json: async () => JSON.parse(route.body),
      headers: { get: (name) => (route.headers || {})[name.toLowerCase()] ?? null },
    };
  };
  return { impl, calls };
}

describe('fetchQueryIndex', () => {
  it('returns the data array', async () => {
    const { impl } = fakeFetch({
      [`${ORIGIN}/query-index.json?limit=500`]: { body: '{"data":[{"path":"/a"}]}' },
    });
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl });
    assert.deepEqual(await client.fetchQueryIndex(), [{ path: '/a' }]);
  });

  it('throws when the index cannot be fetched', async () => {
    const { impl } = fakeFetch({});
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl });
    await assert.rejects(() => client.fetchQueryIndex(), /query-index/);
  });
});

describe('fetchPage', () => {
  it('returns html and the parsed last-modified time', async () => {
    const { impl } = fakeFetch({
      [`${ORIGIN}/a`]: { body: '<html></html>', headers: { 'last-modified': 'Fri, 31 Jul 2026 04:03:19 GMT' } },
    });
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl });
    assert.deepEqual(await client.fetchPage('/a'), {
      html: '<html></html>',
      lastModified: 1785470599,
    });
  });

  it('returns null last-modified when the header is absent', async () => {
    const { impl } = fakeFetch({ [`${ORIGIN}/a`]: { body: 'x' } });
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl });
    assert.equal((await client.fetchPage('/a')).lastModified, null);
  });

  it('returns null for a missing page', async () => {
    const { impl } = fakeFetch({});
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl });
    assert.equal(await client.fetchPage('/nope'), null);
  });

  it('caches so a repeated path is fetched once', async () => {
    const { impl, calls } = fakeFetch({ [`${ORIGIN}/a`]: { body: 'x' } });
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl });
    await client.fetchPage('/a');
    await client.fetchPage('/a');
    assert.equal(calls.length, 1);
  });

  it('caches misses too', async () => {
    const { impl, calls } = fakeFetch({});
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl });
    await client.fetchPage('/nope');
    await client.fetchPage('/nope');
    assert.equal(calls.length, 1);
  });

  it('deduplicates concurrent requests for the same uncached path', async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      await new Promise((resolve) => { setTimeout(resolve, 10); });
      return {
        ok: true,
        status: 200,
        text: async () => 'x',
        json: async () => ({}),
        headers: { get: () => null },
      };
    };

    const client = createClient({ siteOrigin: ORIGIN, fetchImpl });
    const [result1, result2] = await Promise.all([
      client.fetchPage('/a'),
      client.fetchPage('/a'),
    ]);

    assert.deepEqual(result1, { html: 'x', lastModified: null });
    assert.deepEqual(result2, { html: 'x', lastModified: null });
    assert.equal(calls.length, 1, 'should have made only one network call');
  });

  it('evicts rejections from cache so transient errors can be retried', async () => {
    let callCount = 0;
    const fetchImpl = async () => {
      callCount += 1;
      if (callCount === 1) {
        throw new Error('transient network error');
      }
      return {
        ok: true,
        status: 200,
        text: async () => 'success',
        json: async () => ({}),
        headers: { get: () => null },
      };
    };

    // maxAttempts: 1 disables the retry layer so this test still exercises what
    // it is about — that a rejection is evicted from the cache — rather than
    // being absorbed by a retry.
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl, maxAttempts: 1 });

    await assert.rejects(
      () => client.fetchPage('/a'),
      /transient network error/,
    );

    const result = await client.fetchPage('/a');
    assert.deepEqual(result, { html: 'success', lastModified: null });
    assert.equal(callCount, 2, 'should have retried after rejection');
  });
});

describe('retry', () => {
  it('retries a 429 and succeeds', async () => {
    const { impl, calls } = scriptedFetch([
      { status: 429 },
      { status: 429 },
      { status: 200, body: 'hello' },
    ]);
    const { delays, sleep } = fakeSleep();
    const client = createClient({
      siteOrigin: ORIGIN, fetchImpl: impl, sleep, baseDelayMs: 500,
    });

    assert.equal((await client.fetchPage('/a')).html, 'hello');
    assert.equal(calls.length, 3);
    assert.deepEqual(delays, [500, 1000], 'backoff should be exponential');
  });

  it('surfaces an exhausted 429 as a rejection, not as a missing page', async () => {
    // A throttled page must never look like a deleted one: that is how a
    // rate-limited origin silently shrinks the index.
    const { impl, calls } = scriptedFetch([{ status: 429 }]);
    const { sleep } = fakeSleep();
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl, sleep });

    await assert.rejects(() => client.fetchPage('/a'), /429/);
    assert.equal(calls.length, DEFAULT_MAX_ATTEMPTS);
  });

  it('does not retry a genuine 404', async () => {
    const { impl, calls } = scriptedFetch([{ status: 404 }]);
    const { delays, sleep } = fakeSleep();
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl, sleep });

    assert.equal(await client.fetchPage('/gone'), null);
    assert.equal(calls.length, 1);
    assert.deepEqual(delays, []);
  });

  it('retries a 503', async () => {
    const { impl, calls } = scriptedFetch([{ status: 503 }, { status: 200, body: 'ok' }]);
    const { sleep } = fakeSleep();
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl, sleep });

    assert.equal((await client.fetchPage('/a')).html, 'ok');
    assert.equal(calls.length, 2);
  });

  it('retries a transport error', async () => {
    const { impl, calls } = scriptedFetch([{ throws: 'ECONNRESET' }, { status: 200, body: 'ok' }]);
    const { sleep } = fakeSleep();
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl, sleep });

    assert.equal((await client.fetchPage('/a')).html, 'ok');
    assert.equal(calls.length, 2);
  });

  it('honours a Retry-After header over its own backoff', async () => {
    const { impl } = scriptedFetch([
      { status: 429, headers: { 'retry-after': '2' } },
      { status: 200, body: 'ok' },
    ]);
    const { delays, sleep } = fakeSleep();
    const client = createClient({
      siteOrigin: ORIGIN, fetchImpl: impl, sleep, baseDelayMs: 500,
    });

    await client.fetchPage('/a');
    assert.deepEqual(delays, [2000]);
  });

  it('retries the query index too', async () => {
    const { impl, calls } = scriptedFetch([
      { status: 429 },
      { status: 200, body: '{"data":[{"path":"/a"}]}' },
    ]);
    const { sleep } = fakeSleep();
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl, sleep });

    assert.deepEqual(await client.fetchQueryIndex(), [{ path: '/a' }]);
    assert.equal(calls.length, 2);
  });

  it('respects a lowered attempt budget', async () => {
    const { impl, calls } = scriptedFetch([{ status: 429 }]);
    const { sleep } = fakeSleep();
    const client = createClient({
      siteOrigin: ORIGIN, fetchImpl: impl, sleep, maxAttempts: 2,
    });

    await assert.rejects(() => client.fetchPage('/a'));
    assert.equal(calls.length, 2);
  });
});

describe('retryAfterMs', () => {
  it('reads delay-seconds', () => {
    assert.equal(retryAfterMs('3'), 3000);
  });

  it('reads an HTTP date', () => {
    const future = new Date(Date.now() + 5000).toUTCString();
    const ms = retryAfterMs(future);
    assert.ok(ms > 0 && ms <= 5000, `got ${ms}`);
  });

  it('treats a past date as no wait', () => {
    assert.equal(retryAfterMs('Fri, 31 Jul 2020 04:03:19 GMT'), 0);
  });

  it('caps an absurd delay', () => {
    assert.equal(retryAfterMs('99999'), 30000);
  });

  it('ignores a missing or unparseable value', () => {
    assert.equal(retryAfterMs(null), null);
    assert.equal(retryAfterMs('soon'), null);
  });
});

describe('mapWithConcurrency', () => {
  it('preserves input order', async () => {
    const out = await mapWithConcurrency([3, 1, 2], 2, async (n) => n * 10);
    assert.deepEqual(out, [30, 10, 20]);
  });

  it('never exceeds the concurrency limit', async () => {
    let active = 0;
    let peak = 0;
    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (n) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => { setTimeout(resolve, 1); });
      active -= 1;
      return n;
    });
    assert.ok(peak <= 2, `peak concurrency was ${peak}`);
  });

  it('handles an empty list', async () => {
    assert.deepEqual(await mapWithConcurrency([], 4, async (n) => n), []);
  });
});
