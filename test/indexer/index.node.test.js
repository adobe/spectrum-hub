import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, it } from 'node:test';

import {
  assertAcceptableFailureRate,
  assertAcceptableFragmentLoss,
  buildAll,
  main,
  parseArgs,
} from '../../tools/indexer/index.js';

const run = promisify(execFile);
const ENTRY = fileURLToPath(new URL('../../tools/indexer/index.js', import.meta.url));

const page = (body) => ({ html: `<html><body><main>${body}</main></body></html>`, lastModified: null });

/** A client double over a path -> page map. */
const fakeClient = (pages) => ({
  fetchQueryIndex: async () => [],
  fetchPage: async (path) => pages[path] ?? null,
});

/** Swallows the fragment warnings buildAll would otherwise print. */
const quiet = { warn: () => {} };

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

  it('rejects an unrecognized flag', () => {
    // A typo like --dry-runn must not silently fall through to a full live
    // replace of the index.
    assert.throws(() => parseArgs(['--dry-runn']), /--dry-runn/);
  });

  it('rejects an empty --path value', () => {
    assert.throws(() => parseArgs(['--path=']), /--path/);
  });

  it('rejects an empty --limit value', () => {
    assert.throws(() => parseArgs(['--limit=']), /--limit/);
  });

  it('rejects --limit=0 rather than treating it as no limit', () => {
    // Falling through to null here would mean "index everything and publish",
    // which is the opposite of what asking for zero pages meant.
    assert.throws(() => parseArgs(['--limit=0']), /positive integer/);
  });

  it('rejects a negative --limit', () => {
    assert.throws(() => parseArgs(['--limit=-5']), /positive integer/);
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

describe('assertAcceptableFragmentLoss', () => {
  it('accepts a run that inlined no fragments at all', () => {
    assert.doesNotThrow(() => assertAcceptableFragmentLoss({ resolved: 0 }));
  });

  it('accepts the live site\'s steady state of unpublished fragments', () => {
    // A full run of the real site resolves 127 fragments and 404s on 368.
    // A flat rate over all failures would abort every run forever.
    assert.doesNotThrow(() => assertAcceptableFragmentLoss({ resolved: 127, missing: 368 }));
  });

  it('accepts an isolated unreachable fragment in a large run', () => {
    // One bad fragment costs one section. It must not abort the whole run.
    assert.doesNotThrow(() => assertAcceptableFragmentLoss({ resolved: 599, unavailable: 1 }));
  });

  it('aborts when nothing at all resolved, whatever the cause', () => {
    // The demonstrated case: 100 pages all returning 200 while every fragment
    // fails. Page failures are zero, so only this guard sees the loss.
    assert.throws(() => assertAcceptableFragmentLoss({ resolved: 0, missing: 600 }), /Refusing to publish/);
    assert.throws(() => assertAcceptableFragmentLoss({ resolved: 0, unavailable: 600 }), /Refusing to publish/);
  });

  it('does not call a single page with a few dead links a total loss', () => {
    // --path against a page whose six fragment links are all unpublished is a
    // tuning run, not a wipe.
    assert.doesNotThrow(() => assertAcceptableFragmentLoss({ resolved: 0, missing: 6 }));
  });

  it('aborts once a tenth of fragments are unreachable', () => {
    // Concurrency 8 against the live origin produced exactly this shape: the
    // origin answering 429 to a large slice of the run.
    assert.throws(
      () => assertAcceptableFragmentLoss({ resolved: 440, missing: 0, unavailable: 60 }),
      /unreachable/,
    );
  });

  it('applies a floor of three unreachable on a small run', () => {
    assert.throws(() => assertAcceptableFragmentLoss({ resolved: 3, unavailable: 3 }), /unreachable/);
    assert.doesNotThrow(() => assertAcceptableFragmentLoss({ resolved: 4, unavailable: 2 }));
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
    // fetchPage resolves a real page for every path (including undefined) so
    // execution gets past the `!pageMain` check and actually reaches
    // buildRecords, which is what throws on a pathless row.
    const client = {
      fetchQueryIndex: async () => [],
      fetchPage: async () => page('<div><h1 id="t">Title</h1><p>text</p></div>'),
    };
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
        // The pathless row's fetch still resolves a real page, so its failure
        // comes from buildRecords rejecting the missing path, not from a
        // missing <main> — keeping this test on the same failure route as
        // the dedicated buildRecords-throw test above.
        return page('<div><h1 id="t">No Path Page</h1><p>text</p></div>');
      },
    };
    const rows = [
      { path: '/network-down', title: 'X', lastModified: 1 },
      { path: undefined, title: 'No Path', lastModified: 1 },
      { path: '/ok', title: 'Ok', lastModified: 1 },
    ];
    const { records, failures } = await buildAll(rows, client);
    // mapWithConcurrency preserves input order in its results array, but the
    // two failures still land in `failures` in whatever order their workers
    // complete, which a concurrent pool does not promise. Assert membership,
    // not position.
    assert.equal(failures.length, 2);
    assert.ok(failures.includes('/network-down'));
    assert.ok(failures.includes(undefined));
    assert.equal(records.length, 1);
    assert.equal(records[0].objectID, '/ok#t');
  });

  it('reports fragment counts back to the caller', async () => {
    const client = fakeClient({
      '/a': page('<div><h1 id="t">T</h1><p><a href="/fragments/ok">https://x.test/fragments/ok</a></p>'
        + '<p><a href="/fragments/gone">https://x.test/fragments/gone</a></p></div>'),
      '/fragments/ok': page('<div><p>prose</p></div>'),
    });
    const { fragments } = await buildAll([{ path: '/a', title: 'T', lastModified: 1 }], client, quiet);
    assert.deepEqual(fragments, { resolved: 1, missing: 1, unavailable: 0 });
  });

  it('separates an unreachable fragment from a missing one', async () => {
    const client = {
      fetchQueryIndex: async () => [],
      fetchPage: async (path) => {
        if (path === '/fragments/throttled') { throw new Error('Gave up after 4 attempts: HTTP 429'); }
        return page('<div><h1 id="t">T</h1><p>prose</p>'
          + '<p><a href="/fragments/throttled">https://x.test/fragments/throttled</a></p></div>');
      },
    };
    const { fragments } = await buildAll([{ path: '/a', title: 'T', lastModified: 1 }], client, quiet);
    assert.deepEqual(fragments, { resolved: 0, missing: 0, unavailable: 1 });
  });

  it('keeps a page whose fragment failed, rather than discarding it', async () => {
    // Partial content beats nothing: the page's own prose is still worth indexing.
    const client = fakeClient({
      '/a': page('<div><h1 id="t">T</h1><p>page prose</p>'
        + '<p><a href="/fragments/gone">https://x.test/fragments/gone</a></p></div>'),
    });
    const { records, failures } = await buildAll([{ path: '/a', title: 'T', lastModified: 1 }], client, quiet);
    assert.deepEqual(failures, []);
    assert.equal(records.length, 1);
    assert.match(records[0].content, /page prose/);
  });

  it('counts a page that yields zero records as a failure', async () => {
    // A 200 with an empty <main> throws nothing and returns nothing. Uncounted,
    // a whole site emptied this way would still clear the abort threshold.
    const client = fakeClient({ '/empty': page('') });
    const { records, failures } = await buildAll([{ path: '/empty', title: '', lastModified: 1 }], client, quiet);
    assert.deepEqual(records, []);
    assert.deepEqual(failures, ['/empty']);
  });

  it('reports why a page failed, not just that it did', async () => {
    // A retry-exhausted 429 and a genuine 404 both land on the same failure
    // path. An operator reading a red run has to be able to tell them apart.
    const warnings = [];
    const client = {
      fetchQueryIndex: async () => [],
      fetchPage: async () => { throw new Error('Gave up on /a after 4 attempts: HTTP 429'); },
    };

    await buildAll(
      [{ path: '/a', title: 'T', lastModified: 1 }],
      client,
      { warn: (message) => warnings.push(message) },
    );

    assert.match(warnings.join(' '), /could not index \/a: .*429/);
  });

  it('honours the injected concurrency', async () => {
    let active = 0;
    let peak = 0;
    const client = {
      fetchQueryIndex: async () => [],
      fetchPage: async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((done) => { setTimeout(done, 1); });
        active -= 1;
        return page('<div><h1 id="t">T</h1><p>x</p></div>');
      },
    };
    const rows = Array.from({ length: 8 }, (unused, i) => ({ path: `/p${i}`, title: 'T', lastModified: 1 }));
    await buildAll(rows, client, { concurrency: 2, warn: () => {} });
    assert.ok(peak <= 2, `peak concurrency was ${peak}`);
  });
});

/**
 * Builds a fully injected run. Nothing here touches the network, the filesystem,
 * a real config, or a real index.
 */
function harness({ rows = [], pages = {}, argv = [] } = {}) {
  const published = [];
  const dryRuns = [];
  const logs = [];

  const options = {
    argv,
    configLoader: () => ({
      appId: 'APP',
      writeKey: 'KEY',
      indexName: 'scratch-index',
      siteOrigin: 'https://site.test',
      concurrency: 2,
    }),
    clientFactory: () => ({
      fetchQueryIndex: async () => rows,
      fetchPage: async (path) => pages[path] ?? null,
    }),
    publisher: async (records, config) => { published.push({ records, config }); },
    dryRunWriter: (records) => { dryRuns.push(records); return '/nowhere/records.json'; },
    log: { log: (m) => logs.push(m), warn: (m) => logs.push(m) },
  };

  return { options, published, dryRuns, logs };
}

const rowsFor = (count, prefix = '/p') => Array.from(
  { length: count },
  (unused, i) => ({ path: `${prefix}${i}`, title: `T${i}`, lastModified: 1 }),
);

const goodPages = (count, prefix = '/p') => Object.fromEntries(
  rowsFor(count, prefix).map((row) => [row.path, page(`<div><h1 id="t">${row.title}</h1><p>prose</p></div>`)]),
);

describe('main', () => {
  it('publishes exactly once with the built records on a healthy run', async () => {
    const { options, published } = harness({ rows: rowsFor(5), pages: goodPages(5) });

    const result = await main(options);

    assert.equal(published.length, 1);
    assert.equal(published[0].records.length, 5);
    assert.deepEqual(published[0].records, result.records);
    assert.equal(published[0].config.indexName, 'scratch-index');
    assert.equal(result.published, true);
  });

  it('never calls publish on a dry run', async () => {
    const { options, published, dryRuns } = harness({
      rows: rowsFor(5),
      pages: goodPages(5),
      argv: ['--dry-run'],
    });

    const result = await main(options);

    assert.deepEqual(published, []);
    assert.equal(dryRuns.length, 1);
    assert.equal(result.published, false);
  });

  it('never calls publish when page failures exceed the threshold', async () => {
    // Every page 404s, so the index would be emptied rather than rebuilt.
    const { options, published } = harness({ rows: rowsFor(10), pages: {} });

    await assert.rejects(() => main(options), /pages failed/);
    assert.deepEqual(published, []);
  });

  it('never calls publish when every fragment fails but every page returns 200', async () => {
    // The demonstrated content-loss case. Page failures are zero here: each page
    // still yields its title record, so only the fragment guard can stop it.
    const pages = Object.fromEntries(rowsFor(12).map((row) => [
      row.path,
      page(`<div><h1 id="t">${row.title}</h1><p>lead</p>`
        + '<p><a href="/fragments/gone">https://x.test/fragments/gone</a></p></div>'),
    ]));
    const { options, published } = harness({ rows: rowsFor(12), pages });

    await assert.rejects(() => main(options), /None of the 12 fragments/);
    assert.deepEqual(published, []);
  });

  it('never calls publish when a throttled origin makes fragments unreachable', async () => {
    // Every page resolves, most fragments resolve, but a tenth of them exhaust
    // their retries — the shape a rate-limited origin produces.
    const rows = rowsFor(20);
    const pages = Object.fromEntries(rows.map((row, i) => [
      row.path,
      page(`<div><h1 id="t">${row.title}</h1><p>lead</p>`
        + `<p><a href="/fragments/${i < 4 ? 'throttled' : 'ok'}">https://x.test/f</a></p></div>`),
    ]));
    pages['/fragments/ok'] = page('<div><h2 id="f">Frag</h2><p>fragment prose</p></div>');

    const { options, published } = harness({ rows, pages });
    options.clientFactory = () => ({
      fetchQueryIndex: async () => rows,
      fetchPage: async (path) => {
        if (path === '/fragments/throttled') { throw new Error('Gave up: HTTP 429'); }
        return pages[path] ?? null;
      },
    });

    await assert.rejects(() => main(options), /unreachable/);
    assert.deepEqual(published, []);
  });

  it('publishes despite fragments the origin says do not exist', async () => {
    // The live site's steady state: authors link fragments that were never
    // published. That must not block every run.
    const rows = rowsFor(20);
    const pages = Object.fromEntries(rows.map((row, i) => [
      row.path,
      page(`<div><h1 id="t">${row.title}</h1><p>lead</p>`
        + `<p><a href="/fragments/${i < 15 ? 'gone' : 'ok'}">https://x.test/f</a></p></div>`),
    ]));
    pages['/fragments/ok'] = page('<div><h2 id="f">Frag</h2><p>fragment prose</p></div>');

    const { options, published } = harness({ rows, pages });
    const result = await main(options);

    assert.equal(published.length, 1);
    assert.deepEqual(result.fragments, { resolved: 5, missing: 15, unavailable: 0 });
  });

  it('never calls publish when pages return an empty main', async () => {
    const pages = Object.fromEntries(rowsFor(10).map((row) => [row.path, page('')]));
    const { options, published } = harness({ rows: rowsFor(10), pages });

    await assert.rejects(() => main(options), /pages failed/);
    assert.deepEqual(published, []);
  });

  it('still publishes when a single fragment fails in an otherwise healthy run', async () => {
    const rows = rowsFor(20);
    const pages = Object.fromEntries(rows.map((row, i) => [
      row.path,
      page(`<div><h1 id="t">${row.title}</h1><p>lead</p>`
        + `<p><a href="/fragments/${i === 0 ? 'gone' : 'ok'}">https://x.test/fragments/f</a></p></div>`),
    ]));
    pages['/fragments/ok'] = page('<div><h2 id="f">Frag</h2><p>fragment prose</p></div>');

    const { options, published } = harness({ rows, pages });
    const result = await main(options);

    assert.equal(published.length, 1);
    assert.deepEqual(result.fragments, { resolved: 19, missing: 1, unavailable: 0 });
    // The page with the broken fragment is still in the index.
    assert.ok(published[0].records.some((record) => record.path === '/p0'));
  });

  it('prints the summary before aborting, so an operator sees the counts', async () => {
    const { options, logs } = harness({ rows: rowsFor(10), pages: {} });

    await assert.rejects(() => main(options));

    const summary = logs.find((line) => line.startsWith('Pages:'));
    assert.ok(summary, `no summary in: ${logs.join(' | ')}`);
    assert.match(summary, /Fragments: \d+ resolved \(\d+ not found, \d+ unreachable\)/);
  });

  it('reports fragments resolved and lost in the summary', async () => {
    const rows = rowsFor(4);
    const pages = Object.fromEntries(rows.map((row) => [
      row.path,
      page(`<div><h1 id="t">${row.title}</h1><p>lead</p>`
        + '<p><a href="/fragments/ok">https://x.test/fragments/ok</a></p></div>'),
    ]));
    pages['/fragments/ok'] = page('<div><h2 id="f">Frag</h2><p>fragment prose</p></div>');

    const { options, logs } = harness({ rows, pages });
    await main(options);

    assert.ok(
      logs.some((line) => line.includes('Fragments: 4 resolved (0 not found, 0 unreachable)')),
      logs.join(' | '),
    );
  });

  it('warns before a live push that --limit will replace the whole index', async () => {
    const { options, logs, published } = harness({
      rows: rowsFor(5),
      pages: goodPages(5),
      argv: ['--limit=2'],
    });

    await main(options);

    assert.ok(logs.some((line) => line.includes('replaces the whole index')));
    assert.equal(published[0].records.length, 2);
  });
});

describe('entry guard', () => {
  it('does not run main when the module is imported', async () => {
    // This test file has already imported indexer/index.js at the top without a
    // run happening; a subprocess proves it for a clean process too.
    const { stdout, stderr } = await run(process.execPath, [
      '--input-type=module',
      '-e',
      `await import(${JSON.stringify(ENTRY)});`,
    ]);
    assert.equal(stdout, '');
    assert.equal(stderr, '');
  });

  it('still runs main when invoked directly', async () => {
    // An unrecognized flag is rejected by parseArgs, which is the first thing
    // main does — before any config read or network call. Seeing that message
    // proves main ran, offline. The run exits non-zero, which execFile reports
    // as a rejection carrying the captured streams.
    const error = await run(process.execPath, [ENTRY, '--not-a-flag']).then(
      () => null,
      (err) => err,
    );
    assert.ok(error, 'a rejected run should exit non-zero');
    assert.equal(error.code, 1);
    assert.match(error.stderr, /FAILED: Unrecognized argument: --not-a-flag/);
  });
});
