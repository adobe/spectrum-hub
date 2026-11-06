# Figma AI Toolkit ingestion

## Goal

Spectrum Hub's Design column is driven by one Figma library: S2 · Web
(`xHBWBBIe2eo5vwoCeNrC4Q`). The AI components now shipping in Spectrum Web
Components, and soon in `@react-spectrum/ai`, are designed in a second file —
Spectrum AI Toolkit (`3WdX799d7ptEVA6RuTESXs`). Those rows currently read
`figma: not-available` because no roster entry exists for them.

This spec covers what has to be written so the Design column, the "See in Figma"
page-nav widget, and the component-status Design pill resolve against either
file. It does not cover the `@react-spectrum/ai` package ingestion, which is a
separate change to `deps/rsp/`.

## Constraint: no Figma Desktop Bridge plugin

The S2 roster in `deps/figma/components.json` was produced by hand through a
Figma MCP server backed by the Desktop Bridge plugin, as the header comment in
[`deps/figma/fetch-figma-components.js`](../../../deps/figma/fetch-figma-components.js)
records. The Desktop Bridge plugin is no longer an approved technology, so the
AI Toolkit roster cannot be produced that way and the S2 roster can no longer be
refreshed that way either.

The replacement is the Figma REST API, which
`fetch-figma-components.js` already sketches but never wired up. That changes
`fetch-figma-components.js` from a sketch into a real, runnable script, and it
introduces a credential this repository does not have today.

## Current contract

Everything below is what exists now, and it assumes a single Figma file
throughout.

| File | Shape | Written by |
| --- | --- | --- |
| `deps/figma/components.json` | `[{ name, figmaPageId }]`, 83 entries | Nothing. Hand-produced through MCP. |
| `deps/figma/figma-secondary-status.json` | `[{ name, context }]`, 9 entries | Authored by hand. |
| `deps/status/<slug>.json` | `{ web, figmaPageId? }` | `deps/build-status-index.js` |

`figmaPageId` is stored colon-separated (`9230:3620`). The Figma URL form is
hyphenated (`9230-3620`), and `figmaNodeUrl` converts between the two.

The read path:

1. `main()` in [`deps/build-status-index.js`](../../../deps/build-status-index.js)
   reads `deps/figma/components.json` and `deps/figma/figma-secondary-status.json`,
   and unions the two name lists into `figmaNames`.
2. `joinRosters` folds `figmaNames` into canonical component rows through
   `canonicalNameForFigma`, which title-cases the Figma display name unless
   `deps/component-aliases.json` overrides it.
3. `buildComponentSlices` builds a `figmaPageIdByName` map from the roster and
   writes the matching node id onto each component's slice, honoring a
   `web.figma.figmaPageSource` override from `deps/status-overrides.json`.
4. In the browser, `fetchComponentSlice` in
   [`scripts/utils/component-slice.js`](../../../scripts/utils/component-slice.js)
   fetches one slice, and `figmaNodeUrl` in
   [`scripts/utils/figma.js`](../../../scripts/utils/figma.js) turns
   `figmaPageId` into a link against the hard-coded `FIGMA_FILE_URL`.

The single hard-coded file URL in `scripts/utils/figma.js` is the reason a
second file cannot simply be appended to the roster: every node id in the roster
is assumed to live in S2 · Web, and a node id from the AI Toolkit would produce
a link into the wrong file. Figma resolves such a URL to the file's default
view rather than erroring, so the failure is silent.

## What has to be written

### 1. Roster entries carry their file key

`deps/figma/components.json` gains a third field:

```json
[
  { "name": "Accordion", "figmaPageId": "10093:987" },
  { "name": "Prompt field", "figmaPageId": "3161:2278", "figmaFile": "3WdX799d7ptEVA6RuTESXs" }
]
```

`figmaFile` is omitted for S2 · Web entries and present for AI Toolkit entries.
Omission means S2 · Web. Writing the field only where it differs from the
default keeps the diff for this change to the new rows, and matches how
`deps/rsp/components.json` omits `file` when it matches the component name.

An alternative considered and rejected: a second roster file,
`deps/figma/ai-components.json`. It would need a parallel secondary-status
file, a second `readJson` call, a second union into `figmaNames`, and a second
map in `buildComponentSlices` — all to express one field.

### 2. `fetch-figma-components.js` becomes a runnable multi-file script

Today the module exports one function, `fetchFigmaComponents(api)`, takes an
injected caller, hard-codes `FIGMA_FILE`, and has no `main()`. It has to become
a script in the shape of `deps/rsp/discover-components.js`: fetch, map, sort,
write `components.json`, and run under
`node deps/figma/fetch-figma-components.js`.

Required changes:

- Replace the `FIGMA_FILE` constant with a `FIGMA_FILES` list of
  `{ key, label }`, holding S2 · Web and the AI Toolkit.
- Fetch each file's component sets, tag each result with its file key, and
  concatenate. Keep the existing filter that drops names starting with `.`,
  which are Figma-internal.
- Set `figmaFile` only when the key is not S2 · Web, per the default above.
- Sort the merged roster by name, so the committed file has a stable diff
  independent of fetch order.
- Read the token from `process.env.FIGMA_TOKEN` and send it as the
  `X-Figma-Token` request header. Exit non-zero with a clear message when the
  variable is absent, rather than writing a partial roster.
- Fail closed on a short result, as `deps/rsp/extract-props.js` does: refuse to
  overwrite `components.json` when the fetched roster is less than half the size
  of the committed one. A revoked token or an unpublished library must not be
  able to empty the Design column.

**Credential.** A Figma personal access token scoped to read the two files.
`GET /v1/files/:key/component_sets` reads published library content, so the
token needs `library_content:read`; a raw file read, if the fallback in the next
paragraph is needed, needs `file_content:read`. The token is not in this
repository, this developer's environment, or CI today, so it has to be issued
and stored as a `FIGMA_TOKEN` repository secret before any of this runs.

**Verify before building on it.** `GET /v1/files/:key/component_sets` returns
only component sets **published to a team library**. If the AI Toolkit's
component sets are not published, the endpoint returns an empty list and the
script writes nothing for that file. Confirm the endpoint returns a non-empty
list for `3WdX799d7ptEVA6RuTESXs` as the first step of implementation. If it
returns nothing, the fallback is `GET /v1/files/:key` plus a walk of the
document tree for `COMPONENT_SET` nodes, which is a larger response and a
different parser, and which needs `file_content:read` instead.

### 3. `build-status-index.js` passes the file key to the slice

`buildComponentSlices` currently builds one map:

```js
const figmaPageIdByName = new Map(figmaRoster.map((entry) => [entry.name, entry.figmaPageId]));
```

It has to carry both fields, keeping the existing `figmaPageSource` override
behavior unchanged — an override names a roster entry, and that entry now
supplies a file key as well as a node id:

```js
const figmaEntryByName = new Map(figmaRoster.map((entry) => [entry.name, entry]));
```

The slice gains `figmaFile`, written only when the roster entry has one:

```json
{ "web": { "…": "…" }, "figmaPageId": "3161:2278", "figmaFile": "3WdX799d7ptEVA6RuTESXs" }
```

Slices for S2 · Web components do not change at all, so regenerating the index
produces a diff limited to the new AI rows.

Nothing else in `build-status-index.js` changes. `joinRosters`,
`canonicalNameForFigma`, `readSecondaries`, and `buildImplComponentNames` all
operate on names, and `buildImplComponentNames` already skips the figma column.

### 4. `figmaNodeUrl` takes the file key

[`scripts/utils/figma.js`](../../../scripts/utils/figma.js) replaces its single
`FIGMA_FILE_URL` constant with a map of file key to design URL, and
`figmaNodeUrl` takes a second argument:

```js
export function figmaNodeUrl(figmaPageId, figmaFile)
```

`figmaFile` is optional and defaults to the S2 · Web key, matching the roster
default in step 1. An unrecognized key returns `null` rather than guessing a
file, so a roster typo removes the widget instead of linking somewhere wrong.

This is a signature change with two callers, and both pass the new argument from
the same slice:

- `decorateSeeInFigma`, in the same file, which already holds the slice.
- [`blocks/component-status/component-status.js:108`](../../../blocks/component-status/component-status.js), which calls
  `figmaNodeUrl(componentData.figmaPageId)` inside `buildPills`.

`decorateSeeInFigma` also builds its `aria-label` from
`componentData.web?.figma?.figmaPageSource ?? componentSlug`. That text names a
component, not a file, so it does not change.

### 5. Name collisions between the two files

`figmaEntryByName` is keyed by display name across both files, so a component
set named the same in S2 · Web and the AI Toolkit silently resolves to whichever
entry the merged roster wrote last. Today's single-file roster cannot have this
problem; a two-file roster can.

`fetch-figma-components.js` has to detect a name present in more than one file
and warn, naming both files, the way `writeComponentSlices` warns on an
accidental slug collision. Resolution is an entry in the `figma` section of
`deps/component-aliases.json`, which already renames Figma display names into
canonical names.

The S2 roster's 83 current names share nothing with the AI vocabulary
(`chat`, `prompt`, `message`, `thread`, `response`, `attachment`, `suggestion`),
so no collision is expected on the first run. The warning is there to catch the
AI Toolkit growing a `Button` later.

### 6. Aliases for the AI cohort

The SWC AI components already in the index use names that do not normalize onto
the RSP or Figma names for the same component. The pairs visible today, from the
untracked slices in `deps/status/`:

| SWC slug | Likely RSP export | Needs alias |
| --- | --- | --- |
| `prompt-field` | `PromptField` | No |
| `user-message` | `UserMessage` | No |
| `message-feedback` | `MessageFeedback` | No |
| `response-status` | `ResponseStatus` | No |
| `message-sources` | `MessageSource` | Yes — plural |
| `conversation-thread` | `Thread` | Yes |
| `conversation-turn` | `ThreadItem` | Yes |
| `suggestion-group` | `MessageSuggestionList` | Yes |

The AI Toolkit's own display names are unknown until the roster is fetched, so
the `figma` aliases cannot be written in advance. Fetch the roster first, then
reconcile all three vocabularies in one pass. Until that pass lands, the AI rows
will appear as duplicates — one row per vocabulary — rather than one row with
three filled cells.

### 7. Automation

There is no `extract-figma-*.yml` workflow; `.github/workflows/` has one for RSP
and one for SWC only. Once `fetch-figma-components.js` runs unattended, it
should get one modeled on
[`.github/workflows/extract-rsp-properties.yml`](../../../.github/workflows/extract-rsp-properties.yml):
a daily schedule plus `workflow_dispatch`, a single long-lived
`chore/figma-components` branch, `FIGMA_TOKEN` from repository secrets, and a
`node deps/build-status-index.js` step so the committed index matches the
committed roster. It stages `deps/figma/components.json`,
`deps/status-index.json`, `deps/status/`, and `deps/impl-component-names.js`.

The workflow is separable from the rest of this spec. The roster can be
refreshed by hand with the same script in the meantime.

## Tests

Per [`test-driven-development`](../../skills/test-driven-development/SKILL.md),
each of these is written before the change it covers.

**`test/extractions/figma-roster.node.test.js`** — new, for the extraction
script, with mocked fetches and no live API, matching how
`test/extractions/build-status-index.node.test.js` covers the builder:

- Merges two files' component sets into one sorted roster.
- Omits `figmaFile` for S2 · Web entries and sets it for AI Toolkit entries.
- Drops component sets whose name starts with `.`.
- Warns, naming both files, when one display name appears in both.
- Exits non-zero without writing when `FIGMA_TOKEN` is absent.
- Refuses to write a roster less than half the committed size.

**`test/extractions/build-status-index.node.test.js`** — extend the existing
`buildComponentSlices` cases, which today pass roster fixtures such as
`[{ name: 'Action Button', figmaPageId: '1:1' }]`:

- A roster entry with `figmaFile` writes it onto the slice.
- A roster entry without `figmaFile` writes a slice with no `figmaFile` key,
  unchanged from today.
- A `figmaPageSource` override resolves to the target entry's file key, not the
  overridden component's.

**`test/blocks/figma.test.js`** — extend the `figmaNodeUrl` describe block:

- No `figmaFile` builds an S2 · Web URL, which is the existing assertion.
- An AI Toolkit key builds an AI Toolkit URL.
- An unrecognized key returns `null`.
- `decorateSeeInFigma` links into the AI Toolkit when the slice names it.

**`test/blocks/component-status.test.js`** — one case asserting the Design pill
links into the AI Toolkit for a slice carrying `figmaFile`, alongside the
existing `figmaPageId: '123:456'` cases.

Fixtures in `test/blocks/page-nav.test.js`, `test/blocks/page-hero.test.js`, and
`test/a11y/mocks.js` hard-code `figmaPageId: '9230:3620'` with no `figmaFile`.
They exercise the S2 · Web default and need no change, which is itself the
check that the default holds.

## Documentation to update

- [`deps/docs/STATUS-FILES.md`](../../../deps/docs/STATUS-FILES.md) — the
  generated-files table and the `figmaPageSource` section, both of which
  describe the slice as carrying a node id alone.
- [`deps/docs/DATA-CONTRACT.md`](../../../deps/docs/DATA-CONTRACT.md) — the
  Figma column's presence rule, which is unchanged, and the slice shape, which
  is not.
- [`deps/README.md`](../../../deps/README.md) — the generated-files table, which
  does not list `deps/figma/components.json` at all today because nothing
  generated it. It does now.
- [`deps/figma/fetch-figma-components.js`](../../../deps/figma/fetch-figma-components.js)
  — its header comment describes the MCP process this spec replaces.

## Open questions

1. **Are the AI Toolkit's component sets published to a team library?** This
   decides whether `component_sets` works or the heavier file-tree walk is
   needed. Answer it first; it changes step 2's parser and the token's scope.
2. **Who issues `FIGMA_TOKEN`, and against which account?** A personal token
   tied to one person's Figma seat becomes a single point of failure for the
   daily workflow.
3. **Does the AI Toolkit carry node ids for components that S2 · Web also
   designs?** If so, the alias pass in step 6 has to decide which file wins the
   Design link for a shared row. `figmaPageSource` in
   `deps/status-overrides.json` is the existing mechanism, and it would now
   select a file as well as a page.
