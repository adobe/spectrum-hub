# Indexer heading ID normalization

## Problem

EDS includes authored heading-size syntax in generated heading IDs. For example, a heading can reach the indexer with `id="size-xl-overview"`.

The browser later removes the leading or trailing `size-*` modifier through `normalizeHeadingId()`. The indexer currently copies the original source ID into Algolia records, so search results link to `#size-xl-overview` while the rendered page exposes `#overview`. Those fragment links fail.

## Scope

Normalize heading anchors while building search sections. Do not rewrite upstream EDS HTML or custom-domain HTML responses.

The normalization applies only to IDs read from `h1`, `h2`, and `h3` elements by the indexer. Preserve:

- IDs without a boundary size modifier.
- `size-*` text in the middle of an ID.
- IDs on non-heading elements.
- Empty heading IDs.

## Design

Move the pure `normalizeHeadingId(id)` function into a browser- and Node-compatible shared utility. Keep the existing `ak.js` export so current browser consumers do not change.

When `splitSections()` creates a section, pass the heading's `id` through the shared function before assigning `section.anchor`. The rest of record generation remains unchanged and builds its URL from the normalized anchor.

This keeps runtime DOM IDs and indexed anchors on one canonical normalization rule without adding HTML response parsing or duplicating the regular expressions.

## Testing

Add an indexer section test that verifies:

- `size-xl-overview` becomes `overview`.
- `overview-size-m` becomes `overview`.
- Boundary modifiers on both sides are removed.
- Middle `size-*` text and similar non-modifier text remain unchanged.

Retain the existing `ak.js` normalization tests to verify the public export still behaves the same after extraction. Run the targeted `ak.js` and indexer tests, followed by the existing unit and indexer suites.
