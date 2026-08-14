/*
 * Pure audience-based content filtering: given a page's HTML and whether the
 * viewer is authenticated, removes the content blocks that viewer must not see.
 * No Request/Response/fetch here - index.js reads the proxied body and re-wraps
 * the filtered result.
 *
 * EDS blocks are `body > main > div (section) > div[class]` in the served HTML
 * (the `.block-content` wrapper the frontend adds is injected client-side, so
 * server-side a block is a direct grandchild of <main>). A block opts a viewer
 * out with a class:
 *   audience-public  - shown only to anonymous visitors; removed for authed
 *   audience-private - shown only to authorized visitors; removed for anonymous
 * The block is deleted from the served HTML entirely (nested children included)
 * so private markup never leaves the edge - the client-side removeForAudience in
 * scripts/ak.js is then defense-in-depth, not the only line.
 *
 * Removal splices each block out of the *original* HTML string by its parsed
 * source range, so everything else (doctype, head, whitespace) is preserved
 * byte-for-byte - no full re-serialization. node-html-parser is used only to
 * locate the blocks; it is service-agnostic (runs on Lambda/Workers/Node),
 * unlike JSDOM or Cloudflare's HTMLRewriter.
 */

import { parse } from './vendor/node-html-parser.mjs';

export const AUDIENCE_PUBLIC_CLASS = 'audience-public';
export const AUDIENCE_PRIVATE_CLASS = 'audience-private';

// Cheap gate so pages without any audience blocks (the vast majority) skip the
// parse entirely. Both class names share the 'audience-p' prefix.
export const hasAudienceBlocks = (html) => typeof html === 'string' && html.includes('audience-p');

// Remove the audience blocks this viewer must not see. Returns the HTML
// unchanged when there is nothing to strip.
export const filterAudienceBlocks = (html, authed) => {
  if (!hasAudienceBlocks(html)) { return html; }

  const removeClass = authed ? AUDIENCE_PUBLIC_CLASS : AUDIENCE_PRIVATE_CLASS;
  const root = parse(html);

  // Child combinators restrict the match to block-level divs (section > block);
  // an audience class on a section or nested deeper inside a block is ignored.
  const blocks = root.querySelectorAll(`main > div > div.${removeClass}`);
  if (!blocks.length) { return html; }

  // Splice from the tail so each removal leaves earlier offsets valid.
  const ranges = blocks
    .map((el) => el.range)
    .sort((a, b) => b[0] - a[0]);

  let out = html;
  for (const [start, end] of ranges) {
    out = out.slice(0, start) + out.slice(end);
  }
  return out;
};
