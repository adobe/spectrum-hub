# Content indexer

Publishes Spectrum Hub content to Algolia. Runs every two hours via
[`.github/workflows/index-algolia.yml`](../.github/workflows/index-algolia.yml), and runs
identically on a laptop.

Each run is a full atomic rebuild: it reads every published page, inlines any linked
fragment content, splits each page into section-level records, and swaps the whole
index into place. Deleted pages disappear on the next run without any tracked state.

## Local use

Add to `.env` at the repo root:

```text
ALGOLIA_APP_ID=...
ALGOLIA_WRITE_API_KEY=...
ALGOLIA_INDEX_NAME=spectrum-docs-dev
```

Use a scratch index name locally. A run replaces the entire target index.

Two optional variables tune the run:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SITE_ORIGIN` | `https://main--spectrum-hub--adobe.aem.live` | Where content is read from. |
| `INDEXER_CONCURRENCY` | `3` | Page fetches in flight. The origin rate-limits bursts: a full run at 16 draws HTTP 429 widely and aborts, while 3 completes clean in about six seconds. Raise it only if the origin's limits change. |

```bash
node indexer/index.js                     # full rebuild, publishes
node indexer/index.js --dry-run           # writes indexer/out/records.json, publishes nothing
node indexer/index.js --limit=10          # first 10 pages
node indexer/index.js --path=/web/rsp/components/accordion   # one page, implies --dry-run
```

`--limit` and `--path` restrict what is read, but a push is still a full replace, so a
limited run that publishes leaves the index holding only those pages.

## Tuning what gets indexed

Most tuning happens in [`sections.js`](./sections.js):

- `NOISE_SELECTORS` — blocks removed before text extraction, for configuration and media
  rather than prose.
- `splitSections` — where a page is cut, and which sections are kept.

Change it, add a case to `test/indexer/sections.node.test.js`, then compare with
`--dry-run`.

## When a run refuses to publish

Each run replaces the whole index, so it fails closed rather than publish something
gutted. It aborts before pushing when any of these hold, printing the summary first so
the counts survive the abort:

- Page failures reach `max(3, pages * 0.1)`. A page that yields zero records counts here,
  not just one that could not be fetched.
- No fragment at all resolved, across a run that attempted at least ten.
- Unreachable fragments — requests that exhausted their retries — reach
  `max(3, fragments * 0.1)`.

Fragments the origin reports as 404 are counted and warned about but do not trigger an
abort on their own. Authors routinely link fragments that were never published: a full
run currently resolves 127 and 404s on 368, so treating that as an incident would block
every run.

## Design

See [the design spec](../docs/superpowers/specs/2026-07-30-algolia-content-indexer-design.md)
for the record shape, index settings, and the reasoning behind them.
