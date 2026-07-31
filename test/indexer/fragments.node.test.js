import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parse } from 'node-html-parser';

import { inlineFragments } from '../../indexer/fragments.js';

const main = (html) => parse(`<main>${html}</main>`).querySelector('main');
const page = (body) => `<html><body><main>${body}</main></body></html>`;

/** Builds a fetcher over a path -> html map, counting calls per path. */
function fakeFetcher(pages, times = {}) {
  const calls = [];
  const fetchPage = async (path) => {
    calls.push(path);
    if (!(path in pages)) { return null; }
    return { html: pages[path], lastModified: times[path] ?? null };
  };
  return { fetchPage, calls };
}

/** Collects warnings instead of printing them, so a test run stays quiet. */
function warnSink() {
  const warnings = [];
  return { warnings, options: { warn: (message) => warnings.push(message) } };
}

describe('inlineFragments', () => {
  it('replaces a link-only paragraph with the fragment body', async () => {
    const el = main('<div><p><a href="/fragments/a">https://x.test/fragments/a</a></p></div>');
    const { fetchPage } = fakeFetcher({ '/fragments/a': page('<div><p>fragment prose</p></div>') });
    await inlineFragments(el, fetchPage);
    assert.match(el.text, /fragment prose/);
    assert.equal(el.querySelectorAll('a[href*="/fragments/"]').length, 0);
  });

  it('normalises an absolute authored href to a path', async () => {
    const el = main('<p><a href="https://main--spectrum-hub--adobe.aem.page/fragments/a">link</a></p>');
    const { fetchPage, calls } = fakeFetcher({ '/fragments/a': page('<div><p>ok</p></div>') });
    await inlineFragments(el, fetchPage);
    assert.deepEqual(calls, ['/fragments/a']);
  });

  it('replaces only the anchor when the paragraph holds other content', async () => {
    const el = main('<p>before <a href="/fragments/a">https://x.test/fragments/a</a></p>');
    const { fetchPage } = fakeFetcher({ '/fragments/a': page('<div><p>inner</p></div>') });
    await inlineFragments(el, fetchPage);
    assert.match(el.text, /before/);
    assert.match(el.text, /inner/);
  });

  it('resolves fragments nested inside fragments', async () => {
    const el = main('<p><a href="/fragments/a">https://x.test/fragments/a</a></p>');
    const { fetchPage } = fakeFetcher({
      '/fragments/a': page('<div><p>outer</p><p><a href="/fragments/b">https://x.test/fragments/b</a></p></div>'),
      '/fragments/b': page('<div><p>inner</p></div>'),
    });
    await inlineFragments(el, fetchPage);
    assert.match(el.text, /outer/);
    assert.match(el.text, /inner/);
  });

  it('stops at a self-referential cycle without hanging', async () => {
    const el = main('<p><a href="/fragments/a">https://x.test/fragments/a</a></p>');
    const { fetchPage } = fakeFetcher({
      '/fragments/a': page('<div><p>loop</p><p><a href="/fragments/a">https://x.test/fragments/a</a></p></div>'),
    });
    await inlineFragments(el, fetchPage);
    assert.match(el.text, /loop/);
    assert.equal(el.querySelectorAll('a[href*="/fragments/"]').length, 0);
  });

  it('leaves the page intact when a fragment cannot be fetched', async () => {
    const el = main('<h1 id="t">Title</h1><p><a href="/fragments/missing">https://x.test/fragments/missing</a></p>');
    const { fetchPage } = fakeFetcher({});
    const { options } = warnSink();
    await inlineFragments(el, fetchPage, options);
    assert.match(el.text, /Title/);
    assert.equal(el.querySelectorAll('a[href*="/fragments/"]').length, 0);
  });

  it('returns the timestamp of each inlined fragment', async () => {
    const el = main('<p><a href="/fragments/a">https://x.test/fragments/a</a></p>');
    const { fetchPage } = fakeFetcher(
      { '/fragments/a': page('<div><p>x</p></div>') },
      { '/fragments/a': 1785470599 },
    );
    assert.deepEqual((await inlineFragments(el, fetchPage)).timestamps, [1785470599]);
  });

  it('omits a fragment with no usable timestamp', async () => {
    const el = main('<p><a href="/fragments/a">https://x.test/fragments/a</a></p>');
    const { fetchPage } = fakeFetcher({ '/fragments/a': page('<div><p>x</p></div>') });
    assert.deepEqual((await inlineFragments(el, fetchPage)).timestamps, []);
  });

  it('counts a resolved fragment', async () => {
    const el = main('<p><a href="/fragments/a">https://x.test/fragments/a</a></p>');
    const { fetchPage } = fakeFetcher({ '/fragments/a': page('<div><p>x</p></div>') });
    const result = await inlineFragments(el, fetchPage);
    assert.equal(result.resolved, 1);
    assert.equal(result.failed, 0);
  });

  it('warns about a fragment that 404s, and counts it as missing', async () => {
    // A silently dropped fragment is invisible content loss: the page still
    // returns 200 and still yields a title record, so nothing downstream can
    // tell that its prose is gone.
    const el = main('<p><a href="/fragments/missing">https://x.test/fragments/missing</a></p>');
    const { fetchPage } = fakeFetcher({});
    const { warnings, options } = warnSink();

    const result = await inlineFragments(el, fetchPage, options);

    assert.equal(result.missing, 1);
    assert.equal(result.unavailable, 0);
    assert.equal(result.failed, 1);
    assert.equal(result.resolved, 0);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /\/fragments\/missing/);
  });

  it('counts a fragment whose fetch rejects as unavailable, not missing', async () => {
    // What a 429 that exhausts its retries looks like from here. The origin
    // failing to answer is a different problem from content that is not there,
    // and only this one should be able to abort a run.
    const el = main('<h1 id="t">Title</h1><p><a href="/fragments/a">https://x.test/fragments/a</a></p>');
    const fetchPage = async () => { throw new Error('Gave up on /fragments/a after 4 attempts: HTTP 429'); };
    const { warnings, options } = warnSink();

    const result = await inlineFragments(el, fetchPage, options);

    assert.equal(result.unavailable, 1);
    assert.equal(result.missing, 0);
    assert.match(warnings[0], /429/);
    // One unreachable fragment must not discard the page.
    assert.match(el.text, /Title/);
  });

  it('counts a fragment that resolves to an empty main as missing', async () => {
    const el = main('<p><a href="/fragments/a">https://x.test/fragments/a</a></p>');
    const { fetchPage } = fakeFetcher({ '/fragments/a': page('') });
    const { warnings, options } = warnSink();

    const result = await inlineFragments(el, fetchPage, options);

    assert.equal(result.missing, 1);
    assert.equal(result.resolved, 0);
    assert.match(warnings[0], /empty/);
  });

  it('does not count a cycle as a failure', async () => {
    // The repeated fragment's content is already on the page, so removing the
    // second link loses nothing and must not inflate the loss counter.
    const el = main('<p><a href="/fragments/a">https://x.test/fragments/a</a></p>');
    const { fetchPage } = fakeFetcher({
      '/fragments/a': page('<div><p>loop</p><p><a href="/fragments/a">https://x.test/fragments/a</a></p></div>'),
    });
    const { warnings, options } = warnSink();

    const result = await inlineFragments(el, fetchPage, options);

    assert.equal(result.failed, 0);
    assert.equal(result.missing, 0);
    assert.equal(result.resolved, 1);
    assert.deepEqual(warnings, []);
  });

  it('counts fragments nested inside fragments', async () => {
    const el = main('<p><a href="/fragments/a">https://x.test/fragments/a</a></p>');
    const { fetchPage } = fakeFetcher({
      '/fragments/a': page('<div><p>outer</p><p><a href="/fragments/b">https://x.test/fragments/b</a></p></div>'),
      '/fragments/b': page('<div><p>inner</p></div>'),
    });
    assert.equal((await inlineFragments(el, fetchPage)).resolved, 2);
  });
});
