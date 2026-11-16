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
| Map a mobile DA page slug to canonical components | `page` directly under `ios` or `android` in [`deps/status-overrides.json`](../status-overrides.json), then rebuild |
| Change a native documentation symbol or Android package | Platform-level `upstreamName` or `package` in [`deps/status-overrides.json`](../status-overrides.json), outside `figma`, then rebuild |
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
| [`deps/status-overrides.json`](../status-overrides.json) | canonical name → platform → impl; native naming fields live directly under their platform | Manual status overrides plus native page and documentation naming metadata. |
| [`scripts/utils/figma-sources.js`](../../scripts/utils/figma-sources.js) | stable source ID | Figma library label, platform, file key, and URL name, shared by discovery and browser links. |
| [`deps/roster-excludes.json`](../roster-excludes.json) | — (flat list) | Canonical names to drop from web membership across sources. Native design membership is independent. |
| `deps/rsp/rsp-secondary-status.json`, `deps/swc/swc-secondary-status.json` | display name, normalized to canonical name | Per-implementation secondary guidance text shown under the primary status badge. |
| `deps/figma/figma-secondary-status.json` | display name, normalized to canonical name | Web Figma guidance and membership. Names contribute Figma presence even without a discovered design; node references require a resolved roster entry. |

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
| [`deps/figma/resolve-components.js`](../figma/resolve-components.js) | Resolves source-qualified aliases and explicit selections per platform, including complete explicit node references. Rejects invalid roster identities, ambiguous matches, and selections that cannot be resolved. |
| [`scripts/utils/extraction-status.js`](../../scripts/utils/extraction-status.js) | Parses a raw RSP/SWC extraction file's shape (RSP is `{props, status?}`, SWC is a flat prop array) into props + a raw status value. Not the unified vocabulary — just shape-normalization. |
| [`scripts/utils/status-model.js`](../../scripts/utils/status-model.js) | Defines the unified status vocabulary (`STATUSES`: available/experimental/deprecated/removed/not-available) and maps each source's raw status value onto it. |

### Generated outputs (never hand-edit)

| File | Consumed by | Purpose |
| --- | --- | --- |
| [`deps/status-index.json`](../status-index.json) | `blocks/status-table/status-table.js` and data consumers | All platform/implementation cells and a self-describing status legend. The existing table uses only components with web cells; native-only entries do not affect its rows, counts, search, or CSV. |
| `deps/status/<slug>.json` (one per component page) | Status pills and automatic resource actions via [`scripts/utils/component-slice.js`](../../scripts/utils/component-slice.js) | Platform sections such as `{ web, ios, android }`. Selected Figma cells carry source/file/node together; native naming fields live outside `figma`. Shared web page overrides retain canonical native slice paths. The writer does not prune obsolete files, so use the index as the authoritative roster. |
| [`deps/impl-component-names.js`](../impl-component-names.js) | `scripts/utils/component-slice.js` (`canonical`), `scripts/utils/go-to-impl.js` (`canonical`, `docs`, `package`, `docsSection`), playground (`export`) | Per implementation/platform, slug → optional `{ canonical, docs, export, package, docsSection }`. Canonical components, documentation names, render exports, packages, and Storybook groups are separate metadata. |

## Two names that look redundant but aren't

`impl-component-names.js` gives each slug optional `canonical`, `docs`, `export`,
`package`, and `docsSection` fields. `canonical` identifies the component behind
a native page alias. `docs` and `export` disagree for real components, and it's
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

One field, used to build a documentation link. `buildImplComponentNames` collects
web code-cell and native platform-level values into the `docs` field of
`impl-component-names.js`, which
[`scripts/utils/go-to-impl.js`](../../scripts/utils/go-to-impl.js) reads. Without one the
link builder falls back to the page's own slug, so `field-label` would become
`react-spectrum.adobe.com/FieldLabel.html` — a 404.

For RSP/SWC, it is authored in **one of two files**, decided by whether that source
ships the component at all:

| Situation | Author it in |
| --- | --- |
| The source ships it under a different name (RSP's real `ActionButtonGroup` on the canonical `ActionGroup` row) | `component-aliases.json`, on the alias entry |
| The source doesn't ship it; an override is what claims coverage (Field Label and Help Text are not RSP exports) | `status-overrides.json`, on the cell |

The split exists because `component-aliases.json`'s value is read inside `joinRosters`,
which only iterates each source's actual roster — a component absent from
`deps/rsp/components.json` never enters that loop, so there is no join for the alias to
attach to. Both routes land on the same `upstreamName` field of the same cell; only the
authoring home differs.

For native documentation, set `upstreamName` directly under `ios` or `android` in
`status-overrides.json`, outside the Figma cell. It names documentation, not a
code availability status. See [Mobile page links](#mobile-page-links).

### Figma selectors: which platform-specific design supplies the reference

These selectors live on `overrides[canonicalName][platform].figma`:

| Selector | Meaning |
| --- | --- |
| `figmaSource` | Registered library ID, such as `ai-toolkit` or `s2-ios`. |
| `figmaPageSource` | Exact discovered display name, or the authored name for a complete explicit node reference. Can redirect to another component's design on the same platform. |
| `figmaNodeId` | Exact design node ID, useful for repeated names, versioned variants, or an explicit reference outside the roster. |

Discovered candidates must match every supplied selector. Multiple remaining
candidates fail the build. If none match, a complete source/name/node override
can supply an explicit reference, such as iOS `Switch (list)` (`s2-ios`,
`11368:7100`), without changing discovery. Incomplete unmatched selections fail
the build. The selection preserves all raw resources in
`deps/figma/components.json`. See
[Explicit node references](../figma/README.md#explicit-node-references) for
validation requirements and the known conflicting-selector limitation.

The generated Figma cell carries `figmaSource`, `figmaFile`, and `figmaPageId`
together. `figmaNodeId` is the authored selector; `figmaPageId` is the historical
output name for the selected node ID. Neither is a Figma canvas/page ID.

Existing examples include Calendar redirecting to `Date and time field`, Cards
selecting `Card (Asset)`, and iOS Menu, Menu Item, and Menu Header selecting
the iOS 26 designs by node ID. Menu uses a complete explicit reference to the standalone
`Menu` node (`5890:12308`) until discovery supports standalone components.
These selections never enter `impl-component-names.js`.
Both the Design pill and "See in Figma" widget use the platform's same selected
reference. Native routes do not fall back to web.

## Mobile page links

Mobile DA page aliases come from platform-level `page` overrides in
`deps/status-overrides.json`. The builder writes their `canonical` component
names to `deps/impl-component-names.js`; `scripts/utils/component-slice.js`
resolves them without renaming canonical JSON files. No runtime component list
needs updating.

For example:

```json
{
  "Snackbar": {
    "android": {
      "page": "snackbars-and-toasts",
      "upstreamName": "SnackbarHost",
      "package": "snackbar"
    }
  }
}
```

`page` is the DA page slug, `upstreamName` is the documentation symbol, and
`package` overrides Android's documentation package suffix. These fields are
independent of `figma` and do not require or imply a code status. Naming metadata
can also exist without a selected Figma design, but the canonical component must
already exist in the index. Add native fields to the component's existing
override entry so its web overrides remain intact. Rebuild after changing these fields:

```bash
node deps/build-status-index.js
```

Canonical routes retain the same documentation overrides as aliased routes.
Without an alias, the page slug is used unchanged. The builder rejects invalid
naming values and conflicting page aliases within a native platform, including
aliases that would shadow another native component's canonical slug.

For example, `/mobile/components/buttons` reads `deps/status/button.json`.
`/mobile/components/buttons` shows separate **iOS Design** and **Android Design**
pills and matching **See iOS in Figma** and **See Android in Figma** actions.
On shared mobile pages, a missing native platform cell gets a non-linked
**Design not available** pill for that platform, not a web fallback. Its Figma
action is omitted. Both platforms' Design pills remain private under the
existing audience rules. Platform-specific native pages omit a missing Design
pill. If no canonical slice can be fetched, the status block removes itself.

Examples of mobile route mappings:

| DA page slug | iOS component | Android component |
| --- | --- | --- |
| `buttons` | `Button` | `Button` |
| `switches` | `Switch` | `Switch` |
| `snackbars-and-toasts` | `Toast` | `Snackbar` |
| `toggle-buttons` | `ToggleButton` | `ToggleButtonSameContent` |

Both widgets use `fetchComponentPageSlice` to select the requested platform
from each canonical slice. Fetches are cached, so two platforms sharing one
component do not fetch it twice. Android Toggle buttons uses the same-content
design, not the distinct-content or icon variants.

### Native Code documentation

Mobile pages also show **Code documentation** pills and **Go to iOS** /
**Go to Android** actions. Both use `scripts/utils/go-to-impl.js`. iOS documentation
uses the documentation name without hyphens, falling back to the canonical
component name. Android uses `-spectrum-<kebab-name>.html` for the documentation
symbol and its hyphen-free name for the package, unless `package` overrides it.
Snackbar's `upstreamName: "SnackbarHost"` and `package: "snackbar"` produce
`snackbar/-spectrum-snackbar-host.html`. Android Toggle buttons uses
`upstreamName: "ToggleButton"` with the canonical `ToggleButtonSameContent`
design to produce `togglebutton/-spectrum-toggle-button.html`.
These are documentation links, not
native code availability statuses: the pills have no `data-status` attribute.
No native extraction is required. Native documentation actions do not require a
Figma reference and remain available to anonymous visitors when Design links
are removed by audience gating.

Native Code documentation pills require their platform's resolved status data.
Automatic documentation actions require a successfully fetched canonical status
slice. A 404 or fetch failure removes that platform's documentation pill and
action without hiding another platform whose slice exists. Shared-page
**Design not available** pills remain informational.
Requests are cached across pills and actions.
This does not validate upstream documentation URLs. Authored status links and
Copy markdown do not depend on these generated mappings.

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

Documentation metadata uses the full joined public catalog, before composition
parts are excluded from the web status roster. An `upstreamName` alias selects a
shared or nested documentation page without changing the published tag or module
path. Resolved cell overrides take precedence over catalog aliases.

Response Status Step and Suggestion Item remain excluded from web membership,
but retain their `docs` and `docsSection` metadata in `impl-component-names.js`.
Their existing page actions and Code pills therefore use the AI Toolkit
Storybook destinations. This does not add status-table rows or generate new
status slices for excluded children. Automatic actions still require an
available status slice.

The shipped-data regressions in `test/blocks/go-to-impl.test.js` and
`test/blocks/component-status.test.js` check these redirects without supplying
replacement catalog metadata.

For components with the required metadata, the same resolution applies on
`/web/<impl>/patterns/<group>/<slug>` routes,
including nested groups. The final slug selects the component's status slice.
The site's route group does not determine the Storybook group: a page under
`conversational-ai` still links to the CEM-derived `patterns-ai-toolkit` section.
Implementation widgets and Code pills share this resolution. Design widgets
and pills use the selected platform Figma reference, including AI Toolkit.
Recognizing a route does not add its component to the generated roster.

Component and pattern pages without second-level headings retain their
desktop page-nav actions under the accessible label **Page actions**. They do
not render an empty table of contents or start a scroll observer. Design links
remain private, and page-nav remains absent below 1200px.
