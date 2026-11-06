# Card grid and the component roll-up index

## Summary

`card-grid` becomes a data-driven block. An author places `card-grid` on a
collection page with a short config table; the block reads a query index,
filters it, and generates one `card-grid-item` per matching row. Per-page
values that feed each card are authored in a standard Metadata block on each
component page, including three that must stay private to authenticated
viewers. The edge strips those three from both the page and the index for an
anonymous viewer.

The model follows `content-grid` and `grid-item` in the sibling
`adobe-labs-website` repository, adapted to Spectrum Hub's audience gating and
to the existing `deps/status-index.json` status pipeline.

## Prior art

`adobe-labs-website` splits the same problem into two blocks:

- `blocks/content-grid/content-grid.js` reads a config table with
  `readBlockConfig`, fetches a per-section JSON endpoint through a shared
  `dataStore`, filters and sorts rows, then generates cards.
- `blocks/grid-item/grid-item.js` exports `buildGridItem(data, root)`, called
  both by an author-placed `grid-item` block and by `content-grid` with rows
  from JSON. One renderer, two callers.

Spectrum Hub differs in three ways that change the design: per-page card values
come from a Metadata block rather than a bespoke per-page block, component
status already exists in `deps/status-index.json`, and private values require
edge-level gating that `adobe-labs-website` has no equivalent for.

## Decisions

### Per-page values live in a standard Metadata block

A table named `Metadata` is converted to `<meta>` tags in `<head>` by the
AEM pipeline and removed from `main`. Any other table name, including the
`card-grid-metadata` name originally proposed, stays in `main` as an ordinary
block and renders on the page. Using the reserved `Metadata` name therefore
costs no block code and makes every value selectable by a query index with the
same `head > meta[name="..."]` pattern already present in `helix-query.yaml`.

### Card overrides use `card-title`, `card-description`, and `card-image`

In a Metadata block, `title` sets `og:title` and `description` sets the SEO
meta description. Both are already indexed columns. Authoring a card-specific
value under either name would overwrite the page's SEO value, so the card's
text is authored as `card-title` and `card-description` instead.

`card-image` supplies card-specific artwork without changing the page's
`og:image`. The card reads `card-image` first and falls back to the existing
`image` column when the override is absent or blank. Title, description, and
image use the same fallback rule: select the first nonblank string, then trim
it. Non-string values do not suppress a valid fallback. When both candidates
for a description or image are blank, the card omits that element.

Badges, indexed filter values, and authored status values use the same
string-only trimming rule. Non-string values are treated as absent rather
than converted to text. Filters then split comma-separated values and match
case-insensitively; statuses are validated against the shared vocabulary.

The grid resolves relative image URLs against the indexed component page's
`path`, not the page displaying the grid. For example, `./media_example.png`
on `/web/design-only/components/alert-banner` resolves to
`/web/design-only/components/media_example.png` on the current host.
Root-relative and absolute URLs keep their existing locations. This applies
to both `card-image` and the `image` fallback; the shared image helper is
unchanged.

The query-index configuration must extract `head > meta[name="card-image"]`
with `attribute(el, "content")` into a `card-image` column. Authors can add that
key to the standard Metadata block while leaving `image` unchanged, preserving
the existing social preview.

### Cards require a title and page path

The grid excludes a row unless it has a nonblank string `card-title` or fallback
`title`, plus a site-root-relative page path such as
`/web/rsp/components/button`. Paths cannot contain whitespace, backslashes,
query strings, or fragments, or begin with `//`. Titles are trimmed; a blank
card title falls back to the page title.

Eligibility is checked before authored filters and `count`, so incomplete rows
cannot consume card slots or break implementation filtering. Skipped rows are
reported through the configured logger with their path when available.
If no eligible rows match, the grid hides its own root. Its `.block-content`
wrapper and `.section` collapse only when every direct child is hidden or an
already collapsed grid container. Neighboring blocks and section copy remain
visible, and multiple grids do not overwrite each other's visibility.
Images, descriptions, status, and private resources remain optional. The
fallback title is available only when the index includes a `title` column.

The shared JSON store accepts an endpoint only. It caches successful payloads
for the page lifetime and deduplicates concurrent requests for that endpoint.
It does not accept fetch options or provide a cache-bypass API. Failed requests
are not cached.

### Component status prefers the existing status index

`deps/status-index.json`, built by `deps/build-status-index.js`, already holds
77 components with `platforms.web.{figma,rsp,swc}.status`. `status-table`
already reads that file. Adding a `status` column to a query index would create
a second source that can disagree with `deps/status-index.json`, so `card-grid`
joins against `deps/status-index.json` by component slug instead.

The lookup uses the segment immediately after `components` as the slug and
ignores trailing path segments. A component's own slug takes precedence over
shared-page overrides. When no own-slug status matches, a shared page resolves
only when all matching entries agree on one non-null status.

### `platform` and `implementation` are not authored

Both already exist as columns on the site-wide index and are already populated
for every component page: `platform` is `web` on all 91 rows, and
`implementation` is `rsp` on 61 rows, `swc` on 23 rows, and empty on the 7
`/web/design-only/components/*` rows. Both values are also derivable from the
page path by `implAndSlugFromPath` in `scripts/utils/component-path.js`.
Authoring either value by hand would introduce a third source that can
contradict both the column and the URL a card links to.

### One card per implementation page

A card represents a single component page, not a component. `/web/rsp/components/accordion`
and `/web/swc/components/accordion` each produce a card. No slug deduplication
runs. Because two cards can share a title, every card carries an implementation
label derived from its path.

The alternative — one card per component, merging implementations — was
rejected for this iteration. It matches the shape of `deps/status-index.json`
more closely but requires a merge rule, a primary-link rule, and a combined
status presentation, none of which are specified yet.

### The authored `content` key picks the index

A collection page names the collection it lists, and that name selects the
endpoint rather than filtering rows:

| Authored `content` | Index |
| --- | --- |
| `web` | `/web/components/query-index.json` |
| `web-rsp` | `/web/rsp/components/query-index.json` |
| `web-swc` | `/web/swc/components/query-index.json` |
| `mobile` | `/mobile/components/query-index.json` |
| `patterns` | `/patterns/query-index.json` |

Patterns sit beside components rather than under them, so their index uses
`/patterns/` rather than the component indexes' `/components/` paths.

An unauthored `content` defaults to `web`. A value with no entry renders nothing
and hides the block, rather than falling back to a default, so a typo cannot
quietly list another collection's content.

### The private values are stripped by field, not by row

Row filtering cannot reach them. `filterSheet` in
`workers/website-lambda/lib/query-index.js` drops a row only when its page is
marked `audience: private`, and a component page carrying a steward is usually
public: the page is for everyone, three of its values are not. So the edge
strips by field name instead, in both places the values appear.

1. **On the component page.** `filterAudienceBlocks` cannot help - it removes
   blocks under `<main>`, and these are `<meta>` tags in `<head>`. An earlier
   design put them in an `audience-private` block for exactly that reason;
   `filterPrivateCardMeta` replaces it, so the values can be ordinary Metadata
   rows and an author maintains one block instead of two.
2. **On a card.** The three values are authored as `card-steward`,
   `card-design-resources` and `card-contact` metadata and selected into the
   same card index as every other card column. AEM has no field-level ACL, so
   the edge supplies one: `filterPrivateEntries` in
   `workers/website-lambda/lib/query-index.js` removes those columns from the
   JSON for an anonymous viewer, and `filterPrivateCardMeta` in
   `workers/website-lambda/lib/audience.js` removes the matching `<meta>` tags
   from the page's `<head>`. Both read the field list from
   `workers/website-lambda/lib/card-fields.js`, which is the only place it is
   written down.

`card-grid` makes no session check of its own and fetches no second index: a
row either arrives carrying `card-steward` or it does not, and `badgesFromRow`
renders the badges for whichever values are present. helix-query reads the AEM origin rather than the
Lambda, so the index is always built from the unstripped values.

These filters apply to requests through the Lambda, not direct public AEM
origin URLs. This follows the site's existing audience-filtering model.

## Measured data

Values below were read from the published indexes on 2026-11-02 and from
`deps/status-index.json` in the working tree.

| Fact | Value |
| --- | --- |
| `/web/rsp/components/query-index.json` | 61 rows, HTTP 200 anonymous |
| `/web/swc/components/query-index.json` | 24 rows, HTTP 200 anonymous |
| Columns on both per-implementation indexes | `path`, `lastModified`, `title`, `description`, `image` |
| Rows matching `/web/**/components/**` in the site-wide index | 91 (61 `rsp`, 23 `swc`, 7 `design-only`) |
| Distinct `image` values across all component rows | 1 |
| Rows with an empty `title` and `description` | 1 (`/web/swc/components/patterns/conversational-ai`) |
| Slugs present in both the RSP and SWC indexes | 23 |
| `audience` column values on component rows | empty on all 91 |
| Component slugs that match a `deps/status-index.json` component | 60 of 61 RSP, 22 of 24 SWC |

## Prerequisites outside this repository

The block cannot ship against current content. Each item below is authoring or
index-configuration work, not code.

1. **Per-page card artwork.** The measured index returned a single placeholder
   URL for every component row. Author `card-image` values to provide real card
   artwork without changing social imagery. Existing `image` values remain the
   fallback.
2. **New index columns.** `card-title`, `card-description`, `card-image`,
   `card-subject`, `card-team`, `card-category`, and `card-behavior` must be
   added to the roll-up index and to the patterns index through the config
   service, followed by a reindex. Every card field carries the `card-` prefix
   so it is plain that the value exists only to build a card. The prefix spans
   both sides: an author labels the filter row `Card team`, and `FILTERS` reads
   the same key from the block and from the row. The checked-in `helix-query.yaml` is auto-generated and inert for
   these indexes.
3. **The private card columns.** `card-steward`, `card-design-resources`
   and `card-contact` must be added to each card index, along with an
   `audience` column so a wholly private page can be dropped by row as well.
4. **`card-behavior` has no definition.** The value is still unspecified, so
   neither a column nor a filter can be built for it.
5. **`card-status` needs a column on the patterns index.** The code reads it
   wherever the status pipeline has no answer, but nothing is authored until
   the config service selects the property.
6. **A stray nested patterns path.** Patterns have their own index beside
   components, so `/web/swc/components/patterns/conversational-ai` does not
   belong to either shape: the roll-up's `/web/**/components/**` include
   captures it, and `implAndSlugFromPath` reads its slug as `patterns`, so it
   derives no status. That row also carries an empty title and description.
   Move the page under `/patterns/` or give it a component slug.

### Indexed statuses take precedence over authored statuses

`statusForPath` addresses a page as `/<platform>/<impl>/components/<slug>`.
A patterns path has no `components` segment, so `implAndSlugFromPath` returns
no slug and the lookup returns null for every pattern - no entry in
`deps/status-index.json` can change that, because there is no key to put it
under.

`card-status` fills that gap, with the pipeline taking precedence:

```js
status: statusForPath(row.path, statusIndex) ?? cardStatus(row)
```

An indexed component status takes precedence, so an authored value cannot
override it. When the lookup returns no status, the authored column supplies
the fallback for both patterns and component pages. Automating pattern statuses
would require extending the path lookup as well as generating status-index
entries; new entries alone cannot make `/patterns/...` paths resolvable.

Authored statuses are normalised with `toClassName` and looked up in `STATUSES`.
A value with no entry is logged and dropped rather than rendered. `Not available`
and `not-available` are the same status. Filtering a grid
by `Card status` matches the resolved status rather than the column, so it
also works when a component row has no authored status.

## Known risks

- **Status validation does not restrict lookups to own properties.**
  `STATUSES[id]` can accept an inherited key such as `constructor`, even though
  it is not a defined status. Such a value can produce an empty status badge.
- **Index paths are filtered only by exact match.** `PUBLIC_FILTER_PATHS` in
  `workers/website-lambda/lib/gate.js` is compared with
  `Array.prototype.includes`, so an index missing from that list is classified
  `allow` and served unfiltered - private columns and all. All five card
  indexes are listed and a test pins that, but a sixth would have to be added
  by hand.
- **The private columns are only as private as the index config.** The edge
  strips what `card-fields.js` names, and no test can read the config service,
  so a fourth private field selected into an index but not added to that list
  ships to anonymous viewers with every suite green.
- **The shared cache currently serves only card-grid.** `status-table` and
  `sitenav` retain their own fetches, so other blocks can still request the same
  indexes independently. Retrofitting them onto `scripts/utils/data-store.js`
  remains outside this change's scope.

## Non-goals

- Merging RSP and SWC rows into one card.
- Retrofitting `status-table` and `sitenav` onto the shared fetch cache.
- Rendering `card-grid` on mobile routes. A `/mobile/` roll-up and its
  `PUBLIC_FILTER_PATHS` entry are anticipated by this design but out of scope.
- Any change to `deps/build-status-index.js` or the status data contract.
