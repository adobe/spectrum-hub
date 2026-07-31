import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createClient, mapWithConcurrency } from '../../indexer/aem-client.js';

const ORIGIN = 'https://site.test';

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

    const client = createClient({ siteOrigin: ORIGIN, fetchImpl });

    await assert.rejects(
      () => client.fetchPage('/a'),
      /transient network error/,
    );

    const result = await client.fetchPage('/a');
    assert.deepEqual(result, { html: 'success', lastModified: null });
    assert.equal(callCount, 2, 'should have retried after rejection');
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
