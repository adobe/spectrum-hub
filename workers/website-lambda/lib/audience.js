/*
 * Pure audience-based content filtering: given a page's HTML and whether the
 * viewer is authenticated, removes the content blocks that viewer must not see,
 * and the private card metadata in <head> that no block filter can reach.
 * No Request/Response/fetch here - index.js reads the proxied body and re-wraps
 * the filtered result.
 *
 * EDS blocks are `body > main > div (section) > div[class]` in the served HTML
 * (the `.block-content` wrapper the frontend adds is injected client-side, so
 * server-side a block is a direct grandchild of <main>). The `.plain.html`
 * variant is the same markup without the document/<main> wrapper, so there a
 * block is a top-level `div (section) > div[class]`. The `.md` variant renders
 * each block as a grid table headed `Name (variants)` (see
 * filterAudienceMarkdown). A block opts a viewer out with a class:
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
import { PRIVATE_CARD_FIELDS } from './card-fields.js';

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
  // The :scope form covers the head-less .plain.html variant, whose sections
  // are top-level (no <main>); it can't match a full page, whose root is <html>.
  const blocks = root.querySelectorAll(
    `main > div > div.${removeClass}, :scope > div > div.${removeClass}`,
  );
  if (!blocks.length) { return html; }

  // Splice from the tail so each removal leaves earlier offsets valid.
  // node-html-parser always populates `range`; the guard is belt-and-suspenders
  // so a missing one can never throw mid-splice.
  const ranges = blocks
    .map((el) => el.range)
    .filter((range) => Array.isArray(range) && range.length === 2)
    .sort((a, b) => b[0] - a[0]);

  let out = html;
  for (const [start, end] of ranges) {
    out = out.slice(0, start) + out.slice(end);
  }
  return out;
};

// Cheap gate, mirroring hasAudienceBlocks: a page carrying none of the private
// field names skips the parse entirely, which is nearly every page.
export const hasPrivateCardMeta = (html) => typeof html === 'string'
  && PRIVATE_CARD_FIELDS.some((field) => html.includes(field));

// Remove the private card metadata an anonymous viewer must not see.
//
// filterAudienceBlocks cannot do this: it removes blocks inside <main>, and a
// meta tag is neither a block nor inside <main>. Without this the steward and
// contact an author entered would ship in the page source of every public
// page, whatever the query index does.
//
// Authenticated viewers keep the tags. Unlike the audience classes there is no
// public counterpart to strip for them - these fields are private or absent.
//
// `meta[name=...]` is matched anywhere in the document rather than only under
// <head>, so a tag that ends up somewhere unexpected is still removed. Removal
// splices by source range exactly as filterAudienceBlocks does, leaving the
// rest of the HTML byte-for-byte unchanged.
export const filterPrivateCardMeta = (html, authed) => {
  if (authed || !hasPrivateCardMeta(html)) { return html; }

  const root = parse(html);
  const tags = root.querySelectorAll(
    PRIVATE_CARD_FIELDS.map((field) => `meta[name="${field}"]`).join(', '),
  );
  if (!tags.length) { return html; }

  // Splice from the tail so each removal leaves earlier offsets valid.
  const ranges = tags
    .map((el) => el.range)
    .filter((range) => Array.isArray(range) && range.length === 2)
    .sort((a, b) => b[0] - a[0]);

  let out = html;
  for (const [start, end] of ranges) {
    out = out.slice(0, start) + out.slice(end);
  }
  return out;
};

// A grid-table border line: `+---+`, `+===+`, `+:--+--:+` etc.
const isTableBorder = (line) => /^\+[-=:+]+\+\s*$/.test(line);
const isTableLine = (line) => line.startsWith('+') || line.startsWith('|');

// Class names a markdown block table header declares. AEM renders a block as a
// grid table whose first row is `Name (variant, variant)`; the variants become
// the block's classes the way AEM's toClassName derives them (lowercased, runs
// of non-alphanumerics as one hyphen: "audience private" -> audience-private).
// The header keeps the author's inline formatting (`**Cards (audience
// private)**`), so emphasis/code markers and escapes are dropped first, and
// every parenthesised group counts - erring towards stripping. The header row
// may wrap over several `|` lines.
const toClassName = (value) => value.toLowerCase().replace(/[^0-9a-z]+/g, '-').replace(/^-+|-+$/g, '');
const getTableClasses = (headerLines) => {
  const text = headerLines
    .map((line) => line.replace(/^\|/, '').replace(/\|\s*$/, ''))
    .join(' ')
    .replace(/[*_`\\]/g, '')
    .replace(/\s+/g, ' ');
  return [...text.matchAll(/\(([^)]*)\)/g)]
    .flatMap((match) => match[1].split(','))
    .map(toClassName);
};

// Reference labels (`![][image0]`, `[text][ref]`) used on the given lines.
const getReferenceLabels = (lines) => new Set(
  lines.flatMap((line) => [...line.matchAll(/\]\[([^\]]+)\]/g)].map((m) => m[1].toLowerCase())),
);
const REFERENCE_DEFINITION = /^\s{0,3}\[([^\]]+)\]:/;

// Markdown counterpart of filterAudienceBlocks for the `.md` page variant:
// removes each block table this viewer must not see (audience-private for
// anonymous, audience-public for authenticated), plus one trailing blank line.
// A table is a maximal run of lines starting with `+` or `|` that opens on a
// border line, so a nested table inside a cell goes with its parent block.
// AEM writes a cell's images as `![][imageN]` with the URL/title defined at the
// end of the document, so a reference definition used only by removed tables
// goes too. Prose that merely mentions "audience private" is untouched.
export const filterAudienceMarkdown = (md, authed) => {
  if (typeof md !== 'string' || !/audience/i.test(md)) { return md; }

  const removeClass = authed ? AUDIENCE_PUBLIC_CLASS : AUDIENCE_PRIVATE_CLASS;
  const lines = md.split('\n');
  const out = [];
  const removed = [];
  let i = 0;
  while (i < lines.length) {
    if (!isTableBorder(lines[i])) {
      out.push(lines[i]);
      i += 1;
      continue;
    }
    let end = i + 1;
    while (end < lines.length && isTableLine(lines[end])) { end += 1; }
    const table = lines.slice(i, end);
    const headerEnd = table.findIndex((line, idx) => idx > 0 && isTableBorder(line));
    const header = table.slice(1, headerEnd === -1 ? table.length : headerEnd);
    if (getTableClasses(header).includes(removeClass)) {
      removed.push(...table);
      if (end < lines.length && lines[end].trim() === '') { end += 1; }
    } else {
      out.push(...table);
    }
    i = end;
  }
  if (!removed.length) { return md; }

  const kept = getReferenceLabels(out.filter((line) => !REFERENCE_DEFINITION.test(line)));
  const orphaned = [...getReferenceLabels(removed)].filter((label) => !kept.has(label));
  if (!orphaned.length) { return out.join('\n'); }
  const result = [];
  for (let j = 0; j < out.length; j += 1) {
    const def = out[j].match(REFERENCE_DEFINITION);
    if (def && orphaned.includes(def[1].toLowerCase())) {
      if (out[j + 1]?.trim() === '' && (result.length === 0 || result.at(-1).trim() === '')) { j += 1; }
      continue;
    }
    result.push(out[j]);
  }
  return result.join('\n');
};
