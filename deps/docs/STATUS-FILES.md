# Status & alias files — where does this go?

A quick-reference map of every file involved in building the combined component status
table. For the deeper story on the RSP/SWC status vocabulary itself — what `stable`,
`internal`, `preview`, and `deprecated` mean per source, and why they can't be merged
directly — see [DATA-CONTRACT.md](./DATA-CONTRACT.md). This doc is the map; that one is
the contract.

The combined status surfaces are produced by
[`deps/build-status-index.js`](../build-status-index.js), run by the daily GitHub Actions
after the per-implementation extractions. It reads hand-authored configuration plus
generated RSP/SWC/Figma extraction data, joins the source rosters, resolves each cell's
status, and writes the generated outputs below.

Status consumers bind to those generated outputs. The playground is a deliberate
exception: it reads the raw RSP/SWC prop catalogs because it needs `kind`, `values`, and
other property-level fields that do not belong in the combined status index.

```
builder inputs                                           generated outputs
──────────────                                           ─────────────────
authored configuration ─┐                                deps/status-index.json
generated extraction    ├──► deps/build-status-index.js    (combined table)
data                   ─┘    (reads scripts/utils/
                              extraction-status.js +      deps/status/<slug>.json
                              status-model.js)              (per-page slices)

                                                           deps/impl-component-names.js
                                                             (doc-link + import names)
```

## Where do I put a change?

| I want to... | Edit this file |
| --- | --- |
| Mark a component available/deprecated/experimental by hand, overriding its source-derived status | [`deps/status-overrides.json`](../status-overrides.json) |
| Fix a name that doesn't match cleanly across RSP/SWC/Figma (e.g. `swc-card` joins the canonical `Cards` row) | [`deps/component-aliases.json`](../component-aliases.json) |
| Point a component's "Go to RSP/SWC" link at a different upstream page | `upstreamName` — in [`deps/component-aliases.json`](../component-aliases.json) if that source ships the component, in [`deps/status-overrides.json`](../status-overrides.json) if it doesn't (Field Label → RSP's `Form.html`) |
| Add a Figma library or change its platform/file identity | [`scripts/utils/figma-sources.js`](../../scripts/utils/figma-sources.js), then rerun authenticated discovery and the status build |
| Map a Figma name without affecting another library | `figmaSources[sourceId][displayName]` in [`deps/component-aliases.json`](../component-aliases.json) |
| Select a component's Figma design among multiple same-platform resources | `figmaSource`, `figmaPageSource`, and/or `figmaNodeId` on its platform's Figma cell in [`deps/status-overrides.json`](../status-overrides.json) |
| Remove a composition part from the web table | [`deps/roster-excludes.json`](../roster-excludes.json); native designs are not removed |
| Add a "use Gen1 instead" style note under a status badge | `deps/<impl>/<impl>-secondary-status.json` (or `deps/figma/figma-secondary-status.json`) |
| Change what a raw status value (`stable`, `internal`, `preview`, ...) means in the unified table | [`scripts/utils/status-model.js`](../../scripts/utils/status-model.js) |
| Change how a raw RSP/SWC extraction file's status field is read | [`scripts/utils/extraction-status.js`](../../scripts/utils/extraction-status.js) |

None of the files under "generated outputs" below should ever be hand-edited. The
JavaScript output carries a generated-file comment; the JSON outputs do not because JSON
has no comments. Run `node deps/build-status-index.js` to regenerate them.

## Full file inventory

### Hand-authored inputs

| File | Keyed by | Purpose |
| --- | --- | --- |
| [`deps/component-aliases.json`](../component-aliases.json) | `rsp`/`swc` → own name; `figmaSources` → source ID → display name | Canonical-name resolution. Legacy `figma` aliases apply only to S2 Web. RSP/SWC entries can also carry `upstreamName` for external documentation links. |
| [`deps/status-overrides.json`](../status-overrides.json) | canonical name → platform → impl | Manual status override, applied last — wins over anything auto-detected. |
| [`scripts/utils/figma-sources.js`](../../scripts/utils/figma-sources.js) | stable source ID | Figma library label, platform, file key, and URL name, shared by discovery and browser links. |
| [`deps/roster-excludes.json`](../roster-excludes.json) | — (flat list) | Canonical names to drop from web membership across sources. Native design membership is independent. |
| `deps/rsp/rsp-secondary-status.json`, `deps/swc/swc-secondary-status.json`, `deps/figma/figma-secondary-status.json` | canonical name | Per-implementation secondary guidance text shown under the primary status badge. |

### Generated extraction inputs

These are generated by their per-source pipelines, then consumed by the combined status
builder. Do not hand-edit them either.

| File | Keyed by | Purpose |
| --- | --- | --- |
| `deps/rsp/data/*.json`, `deps/swc/data/swc-*.json`, `deps/figma/components.json` | — | Raw per-source extraction data (see each implementation's own README + [DATA-CONTRACT.md](./DATA-CONTRACT.md)). |

### Build-time logic

| File | Role |
| --- | --- |
| [`deps/build-status-index.js`](../build-status-index.js) | The orchestrator. Joins rosters, resolves statuses, applies secondary guidance then overrides, writes every generated output below. |
| [`deps/figma/resolve-components.js`](../figma/resolve-components.js) | Resolves source-qualified aliases and explicit selections per platform. Rejects invalid identities, ambiguous matches, and unmatched selections before the builder writes outputs. |
| [`scripts/utils/extraction-status.js`](../../scripts/utils/extraction-status.js) | Parses a raw RSP/SWC extraction file's shape (RSP is `{props, status?}`, SWC is a flat prop array) into props + a raw status value. Not the unified vocabulary — just shape-normalization. |
| [`scripts/utils/status-model.js`](../../scripts/utils/status-model.js) | Defines the unified status vocabulary (`STATUSES`: available/experimental/deprecated/removed/not-available) and maps each source's raw status value onto it. |

### Generated outputs (never hand-edit)

| File | Consumed by | Purpose |
| --- | --- | --- |
| [`deps/status-index.json`](../status-index.json) | `blocks/status-table/status-table.js` and data consumers | All platform/implementation cells and a self-describing status legend. The existing table uses only components with web cells; native-only entries do not affect its rows, counts, search, or CSV. |
| `deps/status/<slug>.json` (one per component page) | `blocks/component-status/component-status.js`, `scripts/utils/figma.js` via [`scripts/utils/component-slice.js`](../../scripts/utils/component-slice.js) | Platform sections such as `{ web, ios, android }`. Selected Figma cells carry source/file/node together. Shared web page overrides retain canonical native slice paths. The writer does not prune obsolete files, so use the index as the authoritative roster. |
| [`deps/impl-component-names.js`](../impl-component-names.js) | `scripts/utils/go-to-impl.js` (`docs`, `package`, `docsSection`), playground (`export`) | Per implementation, slug → optional `{ docs, export, package, docsSection }`. Documentation names, render exports, publishing packages, and Storybook groups are separate metadata. |

## Two names that look redundant but aren't

`impl-component-names.js` gives each slug optional `docs`, `export`, `package`, and
`docsSection` fields. The first two disagree for real components, and it's
tempting to collapse them to one value. Don't — they answer genuinely different questions:

- **`docs`**: "what does the source's *own public docs site* call this?" Several distinct
  real RSP components can share one doc page (`AlertDialog`, `Dialog`, and
  `FullscreenDialog` all link to `Dialog.html`), so this is many-to-one — it exists to
  build a link that actually resolves.
- **`export`**: "what do I actually `import` and render?" One-to-one. `AlertDialog` is
  still its own real, separate component even though its docs redirect to `Dialog.html`.

They are also built from different inputs: `docs` from every cell carrying an
`upstreamName` (so both `component-aliases.json` and `status-overrides.json` feed it),
`export` from the roster itself — an entry exists only where a component's real RSP name
differs from its canonical name. Today they disagree on `cards` (`Card` vs `CardView`),
`radio-button` (`RadioGroup` vs `Radio`) and `takeover-dialog` (`Dialog` vs
`FullscreenDialog`).

Do not reuse `docs` to decide what to render. One file is sufficient, but each consumer
must read the field that answers its own question.

Only RSP populates `export` — SWC renders by tag name, which `deps/swc/components.json`
already maps — but the shape is per-implementation, so a future source that needs one has
somewhere to put it.

## Documentation redirects and Figma selections

These are the two redirect fields, and they are unrelated mechanisms despite both being
"point somewhere else".

### `upstreamName` — what that source's docs site calls it

One field, used to build a link that resolves. `buildImplComponentNames` collects every
cell carrying one into the `docs` field of `impl-component-names.js`, which
[`scripts/utils/go-to-impl.js`](../../scripts/utils/go-to-impl.js) reads. Without one the
link builder falls back to the page's own slug, so `field-label` would become
`react-spectrum.adobe.com/FieldLabel.html` — a 404.

It is authored in **one of two files**, decided by whether that source ships the component
at all:

| Situation | Author it in |
| --- | --- |
| The source ships it under a different name (RSP's real `ActionButtonGroup` on the canonical `ActionGroup` row) | `component-aliases.json`, on the alias entry |
| The source doesn't ship it; an override is what claims coverage (Field Label and Help Text are not RSP exports) | `status-overrides.json`, on the cell |

The split exists because `component-aliases.json`'s value is read inside `joinRosters`,
which only iterates each source's actual roster — a component absent from
`deps/rsp/components.json` never enters that loop, so there is no join for the alias to
attach to. Both routes land on the same `upstreamName` field of the same cell; only the
authoring home differs.

### Figma selectors: which platform-specific design supplies the reference

These selectors live on `overrides[canonicalName][platform].figma`:

| Selector | Meaning |
| --- | --- |
| `figmaSource` | Registered library ID, such as `ai-toolkit` or `s2-ios`. |
| `figmaPageSource` | Exact display name in the roster. Can redirect to another component's design on the same platform. |
| `figmaNodeId` | Exact component-set node ID, useful for repeated names or versioned variants. |

Every supplied selector must match. No match or multiple remaining candidates
fails the build, rather than picking the last file or publishing a guessed link.
The selection preserves all raw resources in `deps/figma/components.json`.

The generated Figma cell carries `figmaSource`, `figmaFile`, and `figmaPageId`
together. `figmaNodeId` is the authored selector; `figmaPageId` is the historical
output name for the selected node ID. Neither is a Figma canvas/page ID.

Existing examples include Calendar redirecting to `Date and time field`, Cards
selecting `Card (Asset)`, and iOS Menu Item/Menu Header selecting the iOS 26
designs by node ID. These selections never enter `impl-component-names.js`.
Both the Design pill and "See in Figma" widget use the platform's same selected
reference. Native routes do not fall back to web.

See [Figma discovery](../figma/README.md) for registry changes, authentication,
source-qualified aliases, and live validation.

## `package` — which npm package a slug ships from

RSP's components come from two published packages, `@react-spectrum/s2` and
`@react-spectrum/ai`. They are one implementation and one status column; the split matters
only because the two are documented differently. S2 publishes a page per component, so a
link is `react-spectrum.adobe.com/{Export}.html`. The AI cohort is published as sections of
one page, so a link is `react-spectrum.adobe.com/ai-components.html#{export lowercased}`.

Neither `docs` nor `export` can answer which form to build: both are names, and an AI
component's name looks exactly like an S2 component's. So `buildImplComponentNames` copies
the `package` field from [`deps/rsp/components.json`](../rsp/components.json) onto the slug,
and [`scripts/utils/go-to-impl.js`](../../scripts/utils/go-to-impl.js) resolves it by
default. Callers can override the documentation name and package or supply an
independent metadata map without modifying the generated catalog. The pure routing
helpers in [`deps/rsp/docs.js`](../rsp/docs.js) select the same page for documentation
links and status extraction.

It is written only for a non-default package, so every S2 slug is unchanged. The same field
in `components.json` also selects which CDN base `deps/rsp/extract-props.js` crawls and
which docs page `deps/rsp/extract-doc-status.js` reads — see
[`deps/rsp/README.md`](../rsp/README.md).

## `docsSection`: which SWC Storybook group documents it

Published SWC AI Toolkit components live under `patterns/ai-toolkit/` in
`deps/swc/components.json`. The builder derives
`docsSection: "patterns-ai-toolkit"` from this grouping. Ordinary SWC components keep the
default `components` group. Both use the same npm package and SWC status column.

The generated section applies to implementation widgets and Code pills.
`upstreamName` still selects a different documentation slug when necessary:
Response Status Step links to Response Status's page; Suggestion Item links to
the nested `suggestion-group-suggestion-item` page. Neither redirect changes
the real tag used by the playground.
