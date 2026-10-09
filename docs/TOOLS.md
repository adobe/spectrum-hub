# Tools

Spectrum Hub includes browser authoring tools, standalone DA applications,
developer integrations, and an operational content indexer. These tools have
different loading and credential requirements. They are not all part of the
public page runtime.

## Tool inventory

| Tool | Location | Audience | Purpose |
| --- | --- | --- | --- |
| DA live preview | `tools/da/` | Authors/developers | Connects a page to DA preview updates |
| Quick Edit | `tools/quick-edit/` | Authors | Loads the DA Quick Edit plugin |
| Scheduler | `tools/scheduler/` | Authors/developers | Simulates time-dependent content off production |
| Sidekick integration | `tools/sidekick/` | Authors | Connects scheduler and Quick Edit actions to the AEM sidekick |
| SEO Description | `tools/seo-description/` | Authors | DA app for working with page description metadata |
| Tag Audit | `tools/tag-audit/` | Authors/content operators | DA app for inspecting authored tag usage |
| Tag Gen | `tools/tag-gen/` | Authors/content operators | DA app for generating/managing tag data |
| Content indexer | `tools/indexer/` | Operators/developers | Builds and atomically publishes Algolia search records |

## Runtime loading

[`scripts/lazy.js`](../scripts/lazy.js) is the main author-tool boundary, and the check
is a single environment comparison:

- `ENV !== 'prod'` gates the `import()` of `tools/scheduler/scheduler.js`, so production
  pages never load the date simulator.
- `tools/sidekick/sidekick.js` is imported when an `aem-sidekick` element is present,
  either already in the DOM or announced later by a `sidekick-ready` event.
- DA preview loads through the `dapreview` query parameter rather than the environment.
- Sidekick custom actions then initialize the scheduler and Quick Edit.

Keep author-only code behind the environment checks. Adding it to the critical
page lifecycle increases production JavaScript cost and can expose controls to
the wrong audience.

## DA live preview

`tools/da/da.js` loads DA's `dapreview.js` implementation and passes it the
Spectrum Hub `loadPage` function so preview refreshes use the normal page
lifecycle.

| Query value | Source |
| --- | --- |
| `?dapreview=on` | `https://da.live` |
| `?dapreview=local` | `http://localhost:3000` |
| `?dapreview=<ref>` | Named `da-live` AEM deployment |

If the parameter is absent, the integration does nothing.

## Quick Edit

`tools/quick-edit/quick-edit.js` loads DA's Quick Edit plugin and supplies the
current repository mountpoint and page path. It can be opened by a sidekick
custom action or directly through a query parameter.

| Query value | Source |
| --- | --- |
| `?quick-edit=on` | `https://da.live` |
| `?quick-edit=local` | `http://localhost:6456` |
| `?quick-edit=<ref>` | Named `da-nx` AEM deployment |

Named references accept only letters, digits, and hyphens. Invalid values do not
produce a dynamic import URL.

## Scheduler

The scheduler is a non-production date simulator implemented as the
`<aem-scheduler>` custom element.

| Value | Behavior |
| --- | --- |
| `?schedule=now` | Uses the current Unix timestamp |
| `?schedule=<unix-seconds>` | Uses the supplied timestamp |
| `?schedule=reset` | Clears persisted simulation |

The selected timestamp is stored as `aem-schedule` in local storage so it
survives navigation. Closing the scheduler clears the query parameter and
stored value. The module exits immediately in the production environment.

This simulates the client-visible date; it does not change publish state or
CloudFront time.

**Note:** This tool is not currently in use. Its companion block, `schedule`, has been removed from the repo.

## Sidekick integration

`tools/sidekick/sidekick.js` listens for sidekick custom events:

- `custom:scheduler` toggles the date simulator.
- `custom:quick-edit` opens Quick Edit with the sidekick payload.

The sidekick is marked ready only after its integration is attached. Keep new
custom actions in this adapter rather than coupling sidekick event details to
unrelated blocks.

## Standalone DA apps

The SEO Description, Tag Audit, and Tag Gen tools are standalone HTML/JavaScript
applications loaded in the `spectrum-hub` DA space. Typically, these apps run on DA
content or pages, not the deployed site itself. They:

- import the DA App SDK from `da.live`
- load the repository's bundled Lit compatibility module through an import map
- run independently of normal page block loading

Changes to these apps should be tested in their DA host context, not only by
opening the HTML directly. Do not place privileged secrets in browser code or
HTML.

## Algolia content indexer

`tools/indexer/` performs a full atomic index rebuild:

1. reads the published AEM query index
2. fetches each page
3. inlines linked fragments' content
4. removes configured non-content noise
5. splits pages into section-level records
6. writes a local record file
7. replaces the complete Algolia index unless dry-run mode is active

[`.github/workflows/index-algolia.yml`](../.github/workflows/index-algolia.yml) runs on a
`0 */12 * * *` cron, with concurrency limited to one run at a time against one index. It
uses repository secrets and a repository variable for:

- `ALGOLIA_APP_ID`
- `ALGOLIA_WRITE_API_KEY`
- `ALGOLIA_INDEX_NAME`

For local use, put placeholders or personal development credentials in an
untracked `.env` file and target a scratch index. Never copy real credentials
into documentation, fixtures, committed environment examples, or command
history.

Optional configuration:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SITE_ORIGIN` | The published AEM origin — see [`tools/indexer/README.md`](../tools/indexer/README.md) | Content source |
| `INDEXER_CONCURRENCY` | `3` | Concurrent page fetches |

### Safe commands

```bash
node tools/indexer/index.js --dry-run
node tools/indexer/index.js --path=/web/rsp/components/accordion
```

Both avoid publishing. `--path` implies dry-run.

Use `--limit` carefully:

```bash
node tools/indexer/index.js --limit=10 --dry-run
```

Without `--dry-run`, a limited run still replaces the entire remote index with
only the selected records. A command with no flags performs a live full
replacement:

```bash
node tools/indexer/index.js
```

Run that only with explicit authorization, verified credentials, and the
intended index name.

The indexer fails closed when page or fragment resolution failures cross its
safety thresholds. See [`tools/indexer/README.md`](../tools/indexer/README.md)
for the exact thresholds and record design.

## Testing tools

| Change | Validation |
| --- | --- |
| DA/Quick Edit origin resolution | Targeted browser unit tests |
| Scheduler behavior | Scheduler unit and accessibility tests |
| Standalone DA app | Unit tests plus manual validation in DA |
| Index record construction | `npm run test:indexer` |
| Full index build | Dry-run and inspection of `tools/indexer/out/records.json` |
| Sidekick action | Non-production page with sidekick connected |

The generated `tools/indexer/out/` directory is local output, not authored
source.

## Adding a tool

Before creating a new tool:

1. Decide whether it is a page feature, sidekick action, DA app, local developer
   utility, or operational job.
2. Put a page feature in a block unless it specifically needs a tool host.
3. Keep author-only tools out of the production lifecycle.
4. Define how it receives configuration and how missing configuration fails.
5. Never expose write credentials to browser code.
6. Add focused tests and document any destructive command.
7. Add scheduled automation only when ownership, concurrency, timeout, and
   failure behavior are explicit.

## Related guides

- [Architecture](./ARCHITECTURE.md)
- [Content authoring](./CONTENT_AUTHORING.md)
- [Tests](./TESTS.md)
- [Dependencies and generated data](./DEPS.md)
