import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assertAcceptableFailureRate, buildAll, parseArgs } from '../../indexer/index.js';

const page = (body) => ({ html: `<html><body><main>${body}</main></body></html>`, lastModified: null });

/** A client double over a path -> page map. */
const fakeClient = (pages) => ({
  fetchQueryIndex: async () => [],
  fetchPage: async (path) => pages[path] ?? null,
});

describe('parseArgs', () => {
  it('defaults to a full live run', () => {
    assert.deepEqual(parseArgs([]), { dryRun: false, limit: null, path: null });
  });

  it('reads --dry-run and --limit', () => {
    assert.deepEqual(parseArgs(['--dry-run', '--limit=10']), { dryRun: true, limit: 10, path: null });
  });

  it('makes --path imply --dry-run', () => {
    assert.deepEqual(parseArgs(['--path=/a']), { dryRun: true, limit: null, path: '/a' });
  });

  it('ignores a non-numeric limit', () => {
    assert.equal(parseArgs(['--limit=abc']).limit, null);
  });
});

describe('assertAcceptableFailureRate', () => {
  it('allows a couple of failures in a small run', () => {
    // Threshold is max(3, 10 * 0.1) = 3, so two failures are tolerated.
    assert.doesNotThrow(() => assertAcceptableFailureRate(10, ['/a', '/b']));
  });

  it('applies the floor of three on a small run', () => {
    assert.throws(() => assertAcceptableFailureRate(10, ['/a', '/b', '/c']), /failed/i);
  });

  it('tolerates three failures in a large run, where the rate governs', () => {
    // Threshold is max(3, 100 * 0.1) = 10. The floor must not abort a big run.
    assert.doesNotThrow(() => assertAcceptableFailureRate(100, ['/a', '/b', '/c']));
  });

  it('throws when a tenth of a large run fails', () => {
    const failures = Array.from({ length: 20 }, (unused, i) => `/p${i}`);
    assert.throws(() => assertAcceptableFailureRate(200, failures), /failed/i);
  });

  it('accepts a clean run', () => {
    assert.doesNotThrow(() => assertAcceptableFailureRate(200, []));
  });
});

describe('buildAll', () => {
  it('inlines fragments before splitting, so fragment prose is indexed', async () => {
    const client = fakeClient({
      '/a': page('<div><h1 id="t">Title</h1></div><div><h2 id="u">Usage</h2><p><a href="/fragments/f">https://x.test/fragments/f</a></p></div>'),
      '/fragments/f': page('<div><h3 id="p">Progressive</h3><p>fragment prose</p></div>'),
    });
    const { records } = await buildAll([{ path: '/a', title: 'Title', lastModified: 1 }], client);
    const deep = records.find((r) => r.objectID === '/a#p');
    assert.equal(deep.content, 'fragment prose');
    assert.equal(deep.title, 'Title › Progressive');
    assert.equal(deep.hierarchy.lvl1, 'Usage');
  });

  it('reports a page that cannot be fetched without throwing', async () => {
    const { records, failures } = await buildAll([{ path: '/gone', title: 'X', lastModified: 1 }], fakeClient({}));
    assert.deepEqual(failures, ['/gone']);
    assert.deepEqual(records, []);
  });

  it('keeps building after one page fails', async () => {
    const client = fakeClient({ '/ok': page('<div><h1 id="t">Ok</h1><p>text</p></div>') });
    const rows = [
      { path: '/gone', title: 'X', lastModified: 1 },
      { path: '/ok', title: 'Ok', lastModified: 1 },
    ];
    const { records, failures } = await buildAll(rows, client);
    assert.deepEqual(failures, ['/gone']);
    assert.equal(records.length, 1);
  });

  it('rolls a fragment timestamp into the page lastModified', async () => {
    const client = {
      fetchQueryIndex: async () => [],
      fetchPage: async (path) => (path === '/a'
        ? { ...page('<div><h1 id="t">T</h1><p><a href="/fragments/f">https://x.test/fragments/f</a></p></div>'), lastModified: 100 }
        : { ...page('<div><p>prose</p></div>'), lastModified: 999 }),
    };
    const { records } = await buildAll([{ path: '/a', title: 'T', lastModified: 100 }], client);
    assert.equal(records[0].lastModified, 999);
  });

  it('records a failure when the page fetch rejects, without rejecting buildAll', async () => {
    const client = {
      fetchQueryIndex: async () => [],
      fetchPage: async (path) => {
        if (path === '/network-down') { throw new Error('ECONNRESET'); }
        return null;
      },
    };
    const { records, failures } = await buildAll([{ path: '/network-down', title: 'X', lastModified: 1 }], client);
    assert.deepEqual(failures, ['/network-down']);
    assert.deepEqual(records, []);
  });

  it('records a failure when buildRecords throws on a row with no path, without rejecting buildAll', async () => {
    const client = fakeClient({ '/no-path': page('<div><h1 id="t">Title</h1><p>text</p></div>') });
    const rows = [{ path: undefined, title: 'No Path', lastModified: 1 }];
    // buildRecords keys its error message on the row, not the path, so buildAll
    // must record the failure under whatever falsy path the row carries.
    const { records, failures } = await buildAll(rows, client);
    assert.deepEqual(failures, [undefined]);
    assert.deepEqual(records, []);
  });

  it('still builds records for a good row alongside a fetch rejection and a buildRecords throw', async () => {
    const client = {
      fetchQueryIndex: async () => [],
      fetchPage: async (path) => {
        if (path === '/network-down') { throw new Error('ECONNRESET'); }
        if (path === '/ok') { return page('<div><h1 id="t">Ok</h1><p>text</p></div>'); }
        return null;
      },
    };
    const rows = [
      { path: '/network-down', title: 'X', lastModified: 1 },
      { path: undefined, title: 'No Path', lastModified: 1 },
      { path: '/ok', title: 'Ok', lastModified: 1 },
    ];
    const { records, failures } = await buildAll(rows, client);
    assert.deepEqual(failures, ['/network-down', undefined]);
    assert.equal(records.length, 1);
    assert.equal(records[0].objectID, '/ok#t');
  });
});
