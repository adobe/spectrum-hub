/**
 * Inlines linked fragment content into a page's <main>.
 *
 * Component pages compose most of their prose from fragments, linked as
 * a[href*="/fragments/"] and assembled in the browser by blocks/fragment.
 * Without inlining, those pages publish as headings and links with almost no
 * body text, and index as empty.
 *
 * Every fragment that cannot be inlined is warned about and counted. A silent
 * removal here is invisible content loss: the page still returns 200, still
 * yields its title record, and still looks like a success to the caller, while
 * the prose that justified inlining in the first place is gone. The counts are
 * what let the run refuse to publish a gutted index.
 *
 * The counts separate two very different things, because the abort decision
 * upstream cannot treat them alike:
 *
 * - `missing` — the origin answered, and there is nothing to inline. Authors
 *   routinely link fragments that were never published; a full run of the live
 *   site resolves 127 fragments and 404s on 368. That is the steady state, not
 *   an incident.
 * - `unavailable` — the origin did not answer. A rejection from the fetcher
 *   means the request exhausted its retries, so a throttled or down origin is
 *   eating content. That is the signal worth aborting on.
 */

import { parse } from 'node-html-parser';

const MAX_DEPTH = 3;
const FRAGMENT_LINK = 'a[href*="/fragments/"]';

/** Authored hrefs may be absolute .aem.page URLs; the fetcher wants a path. */
function toPath(href) {
  try {
    return new URL(href, 'https://fragment.invalid').pathname;
  } catch {
    return href;
  }
}

/**
 * The node an inlined fragment should replace. Authors put a fragment link in a
 * paragraph of its own, so the paragraph goes too; otherwise only the anchor.
 */
function replacementTarget(anchor) {
  const parent = anchor.parentNode;
  const isLinkOnlyParagraph = (parent?.rawTagName || '').toLowerCase() === 'p'
    && parent.text.trim() === anchor.text.trim();
  return isLinkOnlyParagraph ? parent : anchor;
}

async function inline(main, fetchPage, depth, visited, stats) {
  if (depth >= MAX_DEPTH) { return; }

  for (const anchor of main.querySelectorAll(FRAGMENT_LINK)) {
    const path = toPath(anchor.getAttribute('href') || '');
    const target = replacementTarget(anchor);

    if (visited.has(path)) {
      // A cycle, not a failure: this fragment's content is already on the page.
      target.remove();
    } else {
      let fetched = null;
      let reason = null;
      let bucket = 'missing';

      try {
        fetched = await fetchPage(path);
      } catch (error) {
        // A fetch that exhausts its retries rejects. One unreachable fragment
        // must not discard a whole page, so it is counted here, never rethrown.
        reason = error.message;
        bucket = 'unavailable';
      }

      const fragmentMain = !reason && fetched?.html
        ? parse(fetched.html).querySelector('main')
        : null;

      if (!reason && !fragmentMain) {
        reason = fetched?.html ? 'no <main> in the response' : 'not found';
      }

      if (fragmentMain) {
        if (Number.isFinite(fetched.lastModified)) { stats.timestamps.push(fetched.lastModified); }

        await inline(fragmentMain, fetchPage, depth + 1, new Set([...visited, path]), stats);

        const sections = fragmentMain.querySelectorAll(':scope > div');
        if (sections.length) {
          stats.resolved += 1;
          target.replaceWith(...sections);
        } else {
          reason = 'empty <main>';
        }
      }

      if (reason) {
        stats[bucket] += 1;
        stats.warn(`WARNING: fragment ${path} contributed no content (${reason})`);
        target.remove();
      }
    }
  }
}

/**
 * Replaces every fragment link in a <main> with the fragment's content.
 * @param {object} main the parsed main element, mutated in place
 * @param {Function} fetchPage resolves a path to { html, lastModified } or null
 * @param {object} options an optional warn sink, for tests
 * @returns {Promise<object>} timestamps (epoch seconds), and resolved/missing/unavailable counts
 */
export async function inlineFragments(main, fetchPage, { warn = console.warn } = {}) {
  const stats = {
    timestamps: [],
    resolved: 0,
    missing: 0,
    unavailable: 0,
    warn,
  };
  await inline(main, fetchPage, 0, new Set(), stats);
  return {
    timestamps: stats.timestamps,
    resolved: stats.resolved,
    missing: stats.missing,
    unavailable: stats.unavailable,
    failed: stats.missing + stats.unavailable,
  };
}
