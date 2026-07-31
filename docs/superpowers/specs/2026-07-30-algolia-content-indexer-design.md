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
  such as `/deps/rsp/data/Accordion.json`. That text is invisible to an HTML scrape. Deferred until
  the prose record shape has settled — and worth less than it first appeared, because prototyping
  showed the `option-details` fragment already documents the same props as prose. After inlining, the
  accordion page yields sections headed `isMultiple`, `items`, `density`, `isDisabled`, `isQuiet`, and
  `size`, each with a description. Those prop names are findable in v1 through fragment inlining
  alone. Reading the JSON would add types and defaults, not names.
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
   `lastModified`, `platform`, `implementation`, and `tags`. Every field on a record other than the
   section text comes from here, so the indexer never reads the page `<head>` and parses `<main>`
   only.
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

  // Displayed. Title is highlighted; the rest render as pills.
  title:          'Accordion › Progressive disclosure',
  implementation: 'RSP',
  platform:       'Web',
  tags:           ['accordion', 'container'],

  // Searched, not displayed.
  hierarchy:   { lvl0: 'Accordion', lvl1: 'Usage guidelines', lvl2: 'Progressive disclosure' },
  content:     '<full section text>',
  description: 'An accordion displays a list of items that can be expanded…',
  pageTitle:   'Accordion',

  // Facets, ranking, and debugging.
  section: 'web',
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
- **`implementation`, `platform`, and `tags`** feed the pills. All three are passed through verbatim
  from `query-index.json`, authored casing included — `iOS`, `Mobile`, `RSP`, `Web`. The indexer
  applies no mapping, no title-casing, and no cap. At the time of writing these properties are nearly
  unpopulated, so most results render without pills until the content is tagged. That resolves itself
  as authoring lands, with no indexer change.

  They stay three separate fields rather than one merged array, and the UI composes the pill row:

  ```js
  const pills = [...hit.tags];
  if (hit.platform) pills.unshift(hit.platform);
  if (hit.implementation) pills.unshift(hit.implementation);
  ```

  Merging them in the record would cost more than it saves. `attributesForFaceting` can only filter
  on `platform` while `platform` is its own attribute. `searchableAttributes` is priority-ordered, and
  `tags` deliberately outranks `platform`, so folding `Web` into `tags` would make every `/web/**`
  page match "web" as strongly as a genuine tag hit. And keeping the composition in the UI means
  reordering or dropping a pill is a UI edit rather than a full reindex.

  To make those three lines safe, the indexer guarantees the shape: `tags` is always an array, never
  `undefined` or a bare string, and `implementation` and `platform` are always strings, empty when
  unauthored. The UI never needs to defend against a missing field.
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
| `path`, `pageTitle`, `description`, `tags`, `platform`, `implementation` | `query-index.json` row, verbatim |
| `section` | First path segment, for example `web` for `/web/rsp/components/accordion`. `root` when the path has no segment. |
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
    'implementation',
    'platform',
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

`implementation` and `platform` are listed last, so that typing a pill's text such as `iOS` finds the
matching pages while never outranking a title or body match.

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

`main` is walked **depth-first in document order** and cut at `h1`, `h2`, and `h3`. The walk must not
assume headings are direct children of `main`. The published HTML wraps content in EDS section
`div`s, so on a component page every heading sits three levels deep, and authored content can nest a
heading arbitrarily deeper. A boundary is any `h1`/`h2`/`h3` encountered anywhere in the subtree.
`h4` and below are not boundaries; their text becomes part of the enclosing section.

Text is accumulated from text nodes only, never from element `textContent`, so nesting depth cannot
cause a passage to be counted twice. The traversal does not descend into a heading after recording
it, which keeps heading text out of the section body.

The anchor comes from the heading's existing `id`, which the published HTML already provides.
Content appearing before the first heading is merged into the first heading's section, so a leading
breadcrumb or intro paragraph is not stranded in a headingless record.

**Retention:** the first section of a page is always kept, so every page stays findable by its title
even when it has no body — `/foundations/composition` is a title and nothing else. Every later
section is kept only when it has content. A sub-heading whose prose lives entirely in its own
sub-sections, such as `Behaviors` on a component page, is dropped rather than emitted as a
content-free record. Measured across a 26-page sample this removes 29 percent of records and costs no
searchable text, because those children already carry the parent in `hierarchy.lvl1`. No page in the
sample lost all of its records.

Section content is capped at 8000 characters. The longest section observed in the sample was 1221
characters, so the cap is a safety net rather than a routine truncation.

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
  lead and sub-sections including 80-character truncation, `url` emitted as a root-relative path, and
  `external` absent. Pill fields are covered by their own cases: values passed through untransformed,
  `tags` always an array given a missing, string, or null value in the source row, and
  `implementation` and `platform` always strings given a missing value.
- **`config`** — a missing `.env` not throwing, and a missing required variable throwing.

## Follow-up work

- Point the redesigned search block at the new index once its record shape has settled.
- Decide how external-link records are maintained, given that a full rebuild replaces index contents.
- Index component props JSON, so that prop names such as `isQuiet` become findable.
- Add IMS authentication and the DA run log if the site moves behind auth or the run history becomes
  worth persisting.
