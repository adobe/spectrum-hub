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
    await inlineFragments(el, fetchPage);
    assert.match(el.text, /Title/);
    assert.equal(el.querySelectorAll('a[href*="/fragments/"]').length, 0);
  });

  it('returns the timestamp of each inlined fragment', async () => {
    const el = main('<p><a href="/fragments/a">https://x.test/fragments/a</a></p>');
    const { fetchPage } = fakeFetcher(
      { '/fragments/a': page('<div><p>x</p></div>') },
      { '/fragments/a': 1785470599 },
    );
    assert.deepEqual(await inlineFragments(el, fetchPage), [1785470599]);
  });

  it('omits a fragment with no usable timestamp', async () => {
    const el = main('<p><a href="/fragments/a">https://x.test/fragments/a</a></p>');
    const { fetchPage } = fakeFetcher({ '/fragments/a': page('<div><p>x</p></div>') });
    assert.deepEqual(await inlineFragments(el, fetchPage), []);
  });
});
