import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { mapWithConcurrency } from '../../tools/indexer/aem-client.js';
import { classifyLink, normalizeUrl } from './lib/crawl.js';
import { toMarkdown } from './lib/report.js';

// A single PR's worth of new pages is nowhere near this; it exists so a crawler
// bug (e.g. a dedup miss) fails loudly with a truncation note instead of hanging.
const MAX_PAGES = Number(process.env.LINKCHECK_MAX_PAGES) || 300;
// Link status checks are plain HTTP requests, not browser renders, so they can
// run well ahead of the one-page-at-a-time discovery crawl below.
const CONCURRENCY = Number(process.env.LINKCHECK_CONCURRENCY) || 8;
const REQUEST_TIMEOUT = 15_000;
const CRAWL_TIMEOUT = 10 * 60 * 1000;
// Past this, one broken shared element (e.g. a footer link on every page) would
// bury the report in identical rows instead of surfacing distinct problems.
const MAX_OCCURRENCES_PER_LINK = 5;

const REPORT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../test-results/link-check');

/**
 * HEAD first since it's cheap, but confirm any failure with GET before calling a
 * link broken — some servers (Figma among them) implement HEAD inconsistently
 * with GET, always routing it to a 404 handler while the real page loads fine.
 *
 * Deliberately no custom User-Agent: spoofing a browser string looks *more*
 * suspicious to some WAFs than Playwright's own default (w3.org 200s the
 * default UA on both verbs but 403s a spoofed desktop-Chrome string), so the
 * default is the safer choice across sites, not just the honest one.
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} url
 * @returns {Promise<{ok: boolean, status: number|string, reason?: string}>}
 */
async function checkLinkStatus(request, url) {
  const options = { timeout: REQUEST_TIMEOUT };
  try {
    let response = await request.head(url, options);
    if (!response.ok()) {
      response = await request.get(url, options);
    }
    return { ok: response.ok(), status: response.status() };
  } catch (err) {
    return { ok: false, status: 'error', reason: err.message };
  }
}

/**
 * Checks every discovered link's status in parallel and expands each broken one
 * back out to the pages that referenced it (capped, see MAX_OCCURRENCES_PER_LINK).
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {Map<string, Array<{sourcePage: string, href: string, text: string, kind: string}>>}
 *   occurrences
 * @returns {Promise<object[]>} broken-link report rows
 */
async function validateLinks(request, occurrences) {
  const urls = [...occurrences.keys()];
  const statuses = await mapWithConcurrency(
    urls,
    CONCURRENCY,
    (url) => checkLinkStatus(request, url),
  );

  const brokenEntries = [];
  urls.forEach((url, index) => {
    const result = statuses[index];
    if (result.ok) {
      return;
    }
    const refs = occurrences.get(url);
    refs.slice(0, MAX_OCCURRENCES_PER_LINK).forEach((ref) => {
      brokenEntries.push({
        ...ref, status: result.status, reason: result.reason,
      });
    });
    if (refs.length > MAX_OCCURRENCES_PER_LINK) {
      brokenEntries.push({
        sourcePage: `(+${refs.length - MAX_OCCURRENCES_PER_LINK} more pages)`,
        href: url,
        text: '',
        kind: refs[0].kind,
        status: result.status,
        reason: result.reason,
      });
    }
  });
  return brokenEntries;
}

test('site navigation has no broken links', async ({ page, request, baseURL }, testInfo) => {
  test.setTimeout(CRAWL_TIMEOUT);

  const { origin } = new URL(baseURL);
  const start = normalizeUrl('/', baseURL);

  const visited = new Set();
  const queued = new Set([start]);
  const queue = [start];
  /** @type {Map<string, Array<{sourcePage: string, href: string, text: string, kind: string}>>} */
  const occurrences = new Map([[start, [{
    sourcePage: '(start)', href: start, text: '', kind: 'internal',
  }]]]);
  const broken = [];
  let linksChecked = 0;

  function recordOccurrence(url, occurrence) {
    if (!occurrences.has(url)) {
      occurrences.set(url, []);
    }
    occurrences.get(url).push(occurrence);
  }

  /** Classifies one `<a href>` found on `sourcePage` and records it for later checks. */
  async function handleAnchor(href, text, sourcePage) {
    const link = classifyLink(href, sourcePage, origin);
    if (link.kind === 'skip') {
      return;
    }
    linksChecked += 1;

    if (link.kind === 'invalid') {
      broken.push({
        sourcePage, href, text, kind: 'invalid', status: 'n/a', reason: 'unparseable href',
      });
    } else if (link.kind === 'hash') {
      const exists = await page.evaluate((id) => !!document.getElementById(id), link.id);
      if (!exists) {
        broken.push({
          sourcePage, href, text, kind: 'hash', status: 'n/a', reason: `no element with id="${link.id}"`,
        });
      }
    } else if (link.kind === 'internal') {
      recordOccurrence(link.url, {
        sourcePage, href, text, kind: 'internal',
      });
      if (!visited.has(link.url) && !queued.has(link.url)) {
        queued.add(link.url);
        queue.push(link.url);
      }
    } else {
      recordOccurrence(link.url, {
        sourcePage, href, text, kind: 'external',
      });
    }
  }

  /**
   * Renders one queued page purely to extract its links for further discovery —
   * whether the page itself is broken is decided later, by validateLinks, not here.
   */
  async function visitPage(url) {
    visited.add(url);

    try {
      // EDS pages hydrate nav/footer fragments and lazy blocks after the initial
      // load event (see test/a11y's homepage spec for the same convention) — a
      // bare `domcontentloaded` wait would miss most real navigation links.
      await page.goto(url, { timeout: REQUEST_TIMEOUT });
      await page.waitForLoadState('networkidle', { timeout: REQUEST_TIMEOUT });
    } catch {
      // Can't extract links from a page that didn't load; its own status is still checked below.
      return;
    }

    const anchors = await page.evaluate(() => Array.from(document.querySelectorAll('a[href]'), (el) => ({
      href: el.getAttribute('href'),
      text: (el.textContent || '').trim(),
    })));

    for (const { href, text } of anchors) {
      await handleAnchor(href, text, url);
    }
  }

  while (queue.length && visited.size < MAX_PAGES) {
    const url = queue.shift();
    if (!visited.has(url)) {
      await visitPage(url);
    }
  }

  broken.push(...await validateLinks(request, occurrences));

  const stats = { pagesVisited: visited.size, linksChecked, truncated: queue.length > 0 };
  const markdown = toMarkdown(broken, stats);

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, 'report.md'), markdown);
  fs.writeFileSync(path.join(REPORT_DIR, 'report.json'), JSON.stringify({ stats, broken }, null, 2));
  await testInfo.attach('broken-links-report.md', { body: markdown, contentType: 'text/markdown' });

  // Soft: every page in the crawl still gets checked and reported even once one
  // link is found broken — the assertion only fails the test at the very end.
  expect.soft(broken, markdown).toEqual([]);
});
