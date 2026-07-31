/**
 * Inlines linked fragment content into a page's <main>.
 *
 * Component pages compose most of their prose from fragments, linked as
 * a[href*="/fragments/"] and assembled in the browser by blocks/fragment.
 * Without inlining, those pages publish as headings and links with almost no
 * body text, and index as empty.
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

async function inline(main, fetchPage, depth, visited, timestamps) {
  if (depth >= MAX_DEPTH) { return; }

  for (const anchor of main.querySelectorAll(FRAGMENT_LINK)) {
    const path = toPath(anchor.getAttribute('href') || '');
    const target = replacementTarget(anchor);

    if (visited.has(path)) {
      target.remove();
    } else {
      const fragment = await fetchPage(path);
      const fragmentMain = fragment?.html ? parse(fragment.html).querySelector('main') : null;
      if (!fragmentMain) {
        target.remove();
      } else {
        if (Number.isFinite(fragment.lastModified)) {
          timestamps.push(fragment.lastModified);
        }

        await inline(fragmentMain, fetchPage, depth + 1, new Set([...visited, path]), timestamps);

        const sections = fragmentMain.querySelectorAll(':scope > div');
        if (sections.length) {
          target.replaceWith(...sections);
        } else {
          target.remove();
        }
      }
    }
  }
}

/**
 * Replaces every fragment link in a <main> with the fragment's content.
 * @param {object} main the parsed main element, mutated in place
 * @param {Function} fetchPage resolves a path to { html, lastModified } or null
 * @returns {Promise<number[]>} epoch seconds for each fragment inlined
 */
export async function inlineFragments(main, fetchPage) {
  const timestamps = [];
  await inline(main, fetchPage, 0, new Set(), timestamps);
  return timestamps;
}
