# Algolia content indexer

## Summary

A Node script that reads published Spectrum Hub content from `aem.live`, splits each page into
section-level records, inlines any linked fragment content, and pushes the result to Algolia as a
full atomic rebuild. It runs every two hours in GitHub Actions and runs identically on a developer
machine with a `.env` file.

## Problem

Search on Spectrum Hub is backed by an Algolia index (`spectrum-docs-test`) that holds four
hand-written placeholder records. There is no pipeline that puts real content into it.

The content also has a structural wrinkle that a naive scrape handles badly. Component pages compose
most of their prose from fragments, linked with `a[href*="/fragments/"]` and inlined client-side by
`blocks/fragment/fragment.js`. The published HTML for `/web/rsp/components/accordion` is a set of
headings plus six fragment links — under 4 KB, almost none of it prose. Its `content` value in
`query-index.json` is a single line. Indexed as-is, the page is effectively unsearchable.

Fragments also change independently of the pages that reference them. At the time of writing, the
accordion `description` fragment was modified a week later than the page that includes it.

## Goals

- Index all published content, with fragment content inlined as though it were part of the page.
- Produce records that render correctly in the redesigned search UI without requiring UI work.
- Run on a two-hour schedule in CI, and run locally from a `.env` file with no CI-specific machinery.
- Make the content-shaping logic easy to inspect and tune, since the record shape will need
  iteration.

## Non-goals

These were considered and deliberately deferred.

- **IMS authentication and the DA state log.** A full atomic rebuild needs no persisted state, so
  neither is required for correctness. The site is not behind auth today.
- **Indexing component props JSON.** Component pages embed a `table` block pointing at a props file
  such as `/deps/rsp/data/Accordion.json`. That text is invisible to an HTML scrape. Following it
  would make `isQuiet` or `density` findable, but it is a second source with its own shape and
  failure modes. Deferred until the prose record shape has settled.
- **Changes to `blocks/search/search.js`.** The search UI is being redesigned separately, and its
  design is settled: a highlighted title and tag pills per result. The record shape is designed
  around that constraint rather than requiring UI work. The indexer's only obligation is to emit
  `title`, `tags`, and `url` in the shape that design consumes.

## Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Record granularity | Section-level | A page split at `h1`/`h2`/`h3`, one record per section. Better relevance on long pages, and lets a result deep-link to the section that matched. |
| Sync strategy | Full atomic rebuild | `replaceAllObjects` swaps a temp index into place. Deletions are handled implicitly, and no state file can drift out of sync with reality. |
| State and auth | Deferred | No IMS, no DA log in v1. |
| Index target | New index, name from env | `ALGOLIA_INDEX_NAME` is required with no default, so `spectrum-docs-test` stays intact while the record shape is tuned against a scratch index. |
| Props JSON | Deferred | See non-goals. |
| Display title | `Page › Section` | Names the page and where the anchor lands, in the one line the UI allows. |

## Architecture

A new top-level `indexer/` directory, added to `.hlxignore` so it is not served, with an ESLint
override granting Node globals.

| Module | Responsibility |
| --- | --- |
| `indexer/index.js` | CLI entry. Parses flags, orchestrates the run, prints the summary, sets the exit code. |
| `indexer/config.js` | Reads `.env` when present, validates required variables. |
| `indexer/aem-client.js` | `fetchQueryIndex()` and `fetchPage(path)` against `SITE_ORIGIN`, through a concurrency pool. |
| `indexer/fragments.js` | `inlineFragments(mainEl, fetchPage)` — recursively replaces fragment links with fragment content. |
| `indexer/sections.js` | `splitSections(mainEl)` — an ordered list of sections with heading, level, anchor, and text. |
| `indexer/records.js` | `buildRecords(indexRow, sections, meta)` — Algolia records. |
| `indexer/algolia.js` | Applies settings, then `replaceAllObjects`. |
| `indexer/settings.js` | Index settings as a plain exported object. |

`fragments`, `sections`, and `records` are pure functions over a DOM and plain data, with the fetcher
injected. All the logic that will need tuning is unit-testable without network access.

### Dependencies

Two new runtime dependencies:

- `algoliasearch@5` — provides `replaceAllObjects`, which handles copying settings to the temporary
  index, batching, the atomic `moveIndex`, and waiting for the resulting task.
- `node-html-parser@9` — `querySelectorAll` and `textContent` over parsed HTML, with two small
  transitive dependencies.

### Data flow

1. `GET /query-index.json?limit=500` — 155 rows supplying `path`, `title`, `description`,
   `lastModified`, `platform`, `tags`.
2. `GET` each page's HTML.
3. Parse, then inline fragments recursively, fetching each distinct fragment once per run.
4. Split `main` into sections.
5. Build records.
6. Apply index settings, then `replaceAllObjects`.
7. Print a summary.

The `fragments` column in `query-index.json` and the separate `/fragments/query-index.json` are both
ignored. The fragment index reports `total: 1` while all six accordion fragments return HTTP 200,
so it is not a reliable source. Fragment links are discovered from the page HTML instead, and
fragment modification times come from the `last-modified` response header.

## Record shape

```js
{
  objectID: '/web/rsp/components/accordion#progressive-disclosure',
  url:      '/web/rsp/components/accordion#progressive-disclosure',
  path:     '/web/rsp/components/accordion',

  // Displayed. Title is highlighted; tags render as pills.
  title: 'Accordion › Progressive disclosure',
  tags:  ['accordion', 'container'],

  // Searched, not displayed.
  hierarchy:   { lvl0: 'Accordion', lvl1: 'Usage guidelines', lvl2: 'Progressive disclosure' },
  content:     '<full section text>',
  description: 'An accordion displays a list of items that can be expanded…',
  pageTitle:   'Accordion',

  // Facets, ranking, and debugging.
  section: 'web',
  platform: 'web',
  implementation: 'rsp',
  level: 3,
  position: 5,
  lastModified: 1785470599,
}
```

### Display fields

The search UI is fixed. A result row renders a highlighted **title** and a row of **tag pills**, and
nothing else. There is no description line. Records are therefore pre-formatted for display rather
than assembled by the UI.

- **`title`** is `pageTitle › heading` for a sub-section, or `pageTitle` alone for a page's lead
  section. The second segment is the section's own heading, because that names where the anchor
  lands. Hierarchies deeper than two levels still produce two segments; the UI has one line.
  Truncated to 80 characters. It is rendered from `_highlightResult.title`, which requires `title` to
  appear in both `searchableAttributes` and `attributesToHighlight`.
- **`tags`** are passed through verbatim from `query-index.json` and feed the pills, including their
  authored casing. The indexer applies no mapping, no title-casing, and no cap; how many pills fit is
  the UI's decision. At the time of writing, 1 of 155 pages carries tags, so most results render
  without pills until the content is tagged. This resolves itself as tagging lands, with no indexer
  change.
- **`description`** is not displayed. It is carried as a searchable attribute only, taken from the
  page's `description` in `query-index.json`, so a page still matches on its summary text.
- **`external`** is omitted. A `hit.external` check treats `undefined` correctly, which keeps
  external-link records a separate concern.
- **`url`** is a root-relative path, not an absolute URL. The UI renders it as
  `<a href="${hit.url}">`, which resolves against whatever host is serving the page, so the index is
  not tied to the `aem.live` preview origin and needs no rebuild when a production domain appears.
  External records, when they are added, will carry absolute URLs, which the same markup handles.

### Field derivations

| Field | Source |
| --- | --- |
| `path`, `pageTitle`, `tags`, `platform` | `query-index.json` row |
| `section` | First path segment, for example `web` for `/web/rsp/components/accordion`. `root` when the path has no segment. |
| `implementation` | `<meta name="implementation">` in the page head, which `query-index.json` does not expose. Free to read, since the HTML is already fetched. Empty string when absent. |
| `anchor` | The section heading's existing `id`. Empty string for a lead section with no `id`. |
| `position` | Zero-based index of the section within its page, in document order. |
| `level` | 1, 2, or 3, from the heading tag. Lead sections are 1. |
| `lastModified` | See below. |

`lastModified` is the maximum of the page's `lastModified` from `query-index.json` and the
modification time of every fragment inlined into that page. The two sources use different units: the
query index supplies epoch **seconds**, while a fragment's time comes from its `last-modified`
response header as an HTTP date string. Fragment times are converted with
`Math.floor(Date.parse(header) / 1000)` before comparison, so every value in the record is epoch
seconds. A fragment with a missing or unparseable header contributes nothing to the maximum.

### Hierarchy

`hierarchy` follows the DocSearch convention because inlining changes nesting. Injecting the
`usage-guidelines` fragment under `<h2>Usage guidelines</h2>` brings an `<h3>Progressive
disclosure</h3>` with it. Split flat, that section would lose the context that it belongs to usage
guidelines. `hierarchy` preserves the full path even though the display title shows two segments.

### Index settings

Applied from `settings.js` before every rebuild, so the index is reproducible from code. Settings
must be applied to the target index before `replaceAllObjects`, because that operation copies
settings from the target to the temporary index.

```js
{
  searchableAttributes: [
    'title',
    'hierarchy.lvl1',
    'content',
    'tags',
    'description',
  ],
  attributesToHighlight: ['title'],
  attributesForFaceting: ['platform', 'implementation', 'section', 'tags'],
  attributeForDistinct: 'path',
  distinct: 1,
  customRanking: ['asc(level)', 'asc(position)'],
}
```

`title` is listed first because it is the only text the UI shows, and it must be searchable for
`_highlightResult.title` to exist at all. It already contains `hierarchy.lvl0` and the section's own
heading, so only `hierarchy.lvl1` — the intermediate context that the two-segment title drops — needs
listing separately.

`attributesToSnippet` is not configured. Nothing renders a snippet.

`distinct: 1` on `path` collapses each page to its single best-matching section, so the results list
shows one row per page. Textual relevance is applied before `customRanking` in Algolia's default
ranking formula, so the section that actually matched wins and `customRanking` only breaks ties,
favouring higher-level and earlier sections.

`attributesToSnippet` is not consumed by the current UI. It is kept because it makes the Algolia
dashboard preview readable while tuning.

## Extraction rules

### Fragments

Fragment links are `a[href*="/fragments/"]`. Authored hrefs may be absolute `.aem.page` URLs, so each
href is normalised to a path first. The fragment's `main > div` children then replace either the
link's containing paragraph, when the link is that paragraph's only content, or the link element
itself otherwise. This mirrors what `blocks/fragment/fragment.js` does at runtime, and the
only-content case is the one every sampled page uses.

- Recursion is supported to a depth of 3, since a fragment may itself link fragments.
- A `visited` set guards against cycles.
- A per-run `Map` keyed by path means a fragment shared across pages is fetched once.
- A fragment that fails to fetch logs a warning and injects nothing. The page still indexes.

### Sections

`main` is walked in document order and cut at `h1`, `h2`, and `h3`. The anchor comes from the
heading's existing `id`, which the published HTML already provides. Content appearing before the
first heading joins the `h1` section.

A section is kept when it has a heading or content, and dropped only when it has neither. Pages that
are little more than a title, such as `/foundations/composition`, still produce one findable record.
Section content is capped at 8000 characters.

### Noise

Removed before text extraction. This list is a single exported constant, because it is the part most
likely to need tuning.

- Anchors whose text content is itself a URL. This is the authoring convention for data links, and it
  removes the bare `/deps/rsp/data/Accordion.json` link as well as any fragment link that failed to
  resolve.
- `.playground` and `.section-metadata` blocks, which hold key/value configuration such as
  `implementation` / `rsp` rather than prose.
- `<picture>` and `<img>`. Alt text is empty throughout the sampled content.

`.hero`, `.columns`, and `.table` are kept, because they carry prose.

## Configuration

`.env` already defines `ALGOLIA_APP_ID` and `ALGOLIA_WRITE_API_KEY`, so those names are reused. The
indexer performs writes only and never needs the search key, which stays in `.env` for the browser
block.

| Variable | Required | Default |
| --- | --- | --- |
| `ALGOLIA_APP_ID` | Yes | — |
| `ALGOLIA_WRITE_API_KEY` | Yes | — |
| `ALGOLIA_INDEX_NAME` | Yes | None. Must be explicit, so a missing variable cannot wipe the wrong index. |
| `SITE_ORIGIN` | No | `https://main--spectrum-hub--adobe.aem.live` |

`config.js` loads `.env` with `process.loadEnvFile()` inside a `try`/`catch`, matching the convention
already used by `tools/algolia-push-test.js` on the `search` branch. The call throws when the file is
absent, which is exactly the CI case, so the same code path works locally and in Actions without
branching and without a hand-written parser. Node's `--env-file` flag is not used, because it fails
the process rather than the call.

## CLI

```bash
node indexer/index.js                     # Full rebuild, pushes to Algolia
node indexer/index.js --dry-run           # Builds records to indexer/out/records.json, pushes nothing
node indexer/index.js --limit=10          # First 10 pages only
node indexer/index.js --path=/web/rsp/components/accordion   # One page, implies --dry-run
```

`--dry-run` is the tuning loop: inspect `records.json`, adjust the noise list or the splitter, re-run,
and diff. `indexer/out/` is added to `.gitignore`.

`--limit` and `--path` restrict which pages are read, but the push is still a full replace. A limited
run that pushes therefore leaves the index holding only those pages. Both flags are meant for scratch
indexes; `--path` implies `--dry-run` for that reason, and `--limit` prints a warning when combined
with a real push.

## Error handling

- A page that fails to fetch logs a warning and is skipped.
- A fragment that fails to fetch logs a warning and injects nothing.
- The run aborts before pushing, and exits non-zero, when page failures reach
  `max(3, attempted * 0.1)`. Without this, an `aem.live` outage would turn an atomic rebuild into an
  atomic emptying of the index. This mirrors how `deps/build-status-index.js` fails closed on an
  empty roster. The floor of 3 keeps a single flaky fetch from aborting a small `--limit` run, where
  a bare 10 percent threshold would trip after one failure.
- If zero records are built, the run aborts and exits non-zero.

The run prints a summary covering pages fetched, fragments resolved, records built, per-page
failures, and elapsed time.

## GitHub Actions

`.github/workflows/index-algolia.yml`:

- `schedule` with `cron: '0 */2 * * *'`, plus `workflow_dispatch` with a `dry_run` boolean input so a
  no-op run can be triggered against production configuration from the Actions tab.
- `permissions: contents: read`. Nothing is committed.
- Node 20, matching the existing workflows, then `npm ci` and a single `node indexer/index.js` step.
- `ALGOLIA_APP_ID` and `ALGOLIA_WRITE_API_KEY` as repository secrets. `ALGOLIA_INDEX_NAME` as a
  repository variable, so the target is visible without being secret.

## Testing

Tests live in `test/indexer/*.node.test.js`. The `test:extractions` npm script widens its glob to
`test/{extractions,indexer}/*.node.test.js`. Following
[`.ai/skills/test-driven-development`](../../../.ai/skills/test-driven-development/SKILL.md), tests
are written first. Every test runs against inline HTML fixtures with an injected fake fetcher, so no
test touches the network.

- **`sections`** — split points, hierarchy inherited across inlined `h3`s, anchor taken from the
  heading `id`, pre-heading content joining the `h1` section, the heading-or-content retention rule,
  whitespace collapsing, and the 8000-character cap.
- **`fragments`** — injection replaces the containing paragraph, nested fragments resolve, the depth
  cap holds, cycles terminate, a cached fragment is fetched once, and a 404 leaves the page intact.
- **`records`** — `objectID` uniqueness, `lastModified` rolling up to the maximum across inlined
  fragments and handling the seconds-versus-HTTP-date conversion, display title formatting for both
  lead and sub-sections including 80-character truncation, tags passed through untransformed, `url`
  emitted as a root-relative path, and `external` absent.
- **`config`** — a missing `.env` not throwing, and a missing required variable throwing.

## Follow-up work

- Point the redesigned search block at the new index once its record shape has settled.
- Decide how external-link records are maintained, given that a full rebuild replaces index contents.
- Index component props JSON, so that prop names such as `isQuiet` become findable.
- Add IMS authentication and the DA run log if the site moves behind auth or the run history becomes
  worth persisting.
