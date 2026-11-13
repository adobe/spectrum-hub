# Component data contract

This is the data contract for the status model and combined index, including the
deprecation and preview signals available upstream. Keep it current as the mapping,
sources, or upstream signal availability change.

It complements the per-implementation pipeline docs — see [deps/rsp/README.md](../rsp/README.md) and [deps/swc/README.md](../swc/README.md) — rather than repeating them. Runtime normalization lives in [scripts/utils/extraction-status.js](../../scripts/utils/extraction-status.js). For a map of every file involved in building the combined status table (overrides, aliases, generated outputs), see [STATUS-FILES.md](./STATUS-FILES.md).

**Per-component prop rows** (`deps/rsp/data/*.json` and `deps/swc/data/*.json`) carry two contracts, deliberately separated. Both extractors write them through the same module, [`deps/shared/prop-contract.js`](../shared/prop-contract.js):

- `type` is a display string for [`blocks/table/table.js`](../../blocks/table/table.js). Human-readable only — nothing may branch on it.
- `kind` + `values` are the machine contract the playground builds controls from. `kind` is one of `enum`/`boolean`/`text`/`number`/`unknown`, and is `enum` if and only if `values` is non-empty. `values` are real JSON, so numeric options stay numeric, and are in the order the source declares them.

Table columns are opt-out, not opt-in: an unrecognised row key is appended as a column, so `kind`/`values` are listed in `table.js`'s `EXCLUDED_COLUMNS`. Any future machine-only field needs the same. `test/extractions/data-contract.node.test.js` enforces the contract over both committed catalogs, plus a per-pipeline canary for each one's own silent-failure mode; see [deps/swc/README.md](../swc/README.md) for how types are resolved and why the CEM cannot be trusted directly. For what the playground does with these rows, see [PLAYGROUND-CONTRACT.md](./PLAYGROUND-CONTRACT.md).

**Sources:**

- RSP: doc maturity from the S2 docs site ([react-spectrum.adobe.com](https://react-spectrum.adobe.com)), fetched live by `extract-doc-status.js`; props resolved from `@react-spectrum/s2` `.d.ts` files on unpkg/jsDelivr with the TypeScript compiler and type checker.
- SWC: the published `@adobe/spectrum-wc` Custom Elements Manifest, fetched from the `latest` distribution tag by `extract-cem-components.js`. The extractor records the resolved concrete package version in `deps/swc/version.json`, and `discover-components.js` generates `components.json` from the same published CEM.
- RSP AI Toolkit: `package: "ai"` entries in `deps/rsp/components.json` resolve props from `@react-spectrum/ai` and maturity from its shared documentation page. They remain part of the RSP implementation, not a separate status column.
- Figma: published component sets from the S2 Web, Spectrum AI Toolkit, S2 iOS, and S2 Android libraries. The source registry, authentication, and roster schema are documented in [deps/figma/README.md](../figma/README.md).

## Summary

- The two implementations expose status through **different fields with different meanings and different vocabularies**. They must be adapted per source, not merged directly. The adapter boundary is implemented in `extraction-status.js` and `status-model.js`.
- **Neither source currently emits a deprecation signal in its extracted data.** The SWC pipeline resolves `deprecated` and `preview` when either appears in a declaration's `status` field; it does not read the CEM's separate `deprecated` field. RSP S2 authors no `@deprecated` tags and its docs have no "deprecated" maturity, so RSP has no automatic path.
- **Manual `status-overrides.json` entries are currently the only way to publish a Deprecated cell.** The file is applied last in the index build.

## Status-resolution fields (the contract as built)

### React Spectrum (RSP)

Per-component file `deps/rsp/data/<Component>.json` has the shape `{ props: [...], status?: string }`.

| Field | Source | Values | Notes |
| ----- | ------ | ------ | ----- |
| `status` (top-level) | Implementation docs, not the package types | `stable` \| `alpha` \| `beta` \| `rc` \| *(absent)* | Doc maturity. The AI cohort shares one documentation page; S2 uses component pages. |
| `props[]` | `.d.ts` resolved with a TypeScript `Program` and `TypeChecker` | prop rows | Includes inherited and transformed property graphs that regex parsing could not resolve. [See the RSP README](../rsp/README.md). |

#### Prerelease status

The docs render a badge from `export const version` in `packages/dev/s2-docs/pages/s2/*.mdx`, and
`extract-doc-status.js` reads it. In the current committed extraction, `SideNav` is
`alpha`; the other extracted components are `stable` or have no published doc status.
The status model therefore treats `alpha`/`beta`/`rc` as valid values without assuming
that every one is present in a given snapshot.

### Spectrum Web Components (SWC)

Per-component file `deps/swc/data/swc-<tag>.json` is a flat array of prop rows. Component-level status is **derived**, not stored as a single field.

| Field | Source | Values | Notes |
| ----- | ------ | ------ | ----- |
| `status` (per row) | CEM declaration `status` | `internal` \| `preview` \| `deprecated` \| *(absent)* | Absent means public/stable. These are supported lifecycle values, independent of the package release channel. |
| `since` (per row) | CEM declaration `since` | e.g. `0.0.1`, `2.0.0` | Copied onto rows in the committed component catalogs. A declaration with no extracted attributes produces no rows on which to preserve it. |
| rows | CEM declaration `attributes` | attribute rows | Structured — no TS parsing. |

`getSwcComponentStatus` in [extraction-status.js](../../scripts/utils/extraction-status.js) returns the component's `status` as-is when every `since`-tagged prop shares one non-absent value (`internal`, `preview`, or `deprecated`), else `stable` (public or mixed), else `null` (no `since`-bearing prop at all — no maturity signal, floored by the index build).

#### Per-row lifecycle metadata

In the CEM, `status` and `since` are **declaration-level** component fields. `extract-cem-components.js` copies them onto every attribute row, and the adapter derives component status from those copied values. Reading declaration metadata directly instead would remove this round-trip.

**Caveat: name collision.** `swc-message-feedback` and `swc-response-status` have
functional attributes named `status`. These describe feedback or response state,
not lifecycle maturity. Status resolution reads the copied **declaration**
metadata, never a row's `attribute`, `property`, or functional option values.

### Figma

The raw roster preserves `{ source, platform, figmaFile, name, figmaPageId }`.
Source and node identify a resource. Its display name alone is not unique across
libraries or platforms.

The builder resolves one design per platform/canonical component. A selected
Figma cell contains `{ status, figmaSource, figmaFile, figmaPageId }`, plus any
authored guidance or display-name redirect. `figmaPageId` is a component-set node
ID, not a canvas/page ID. Presence resolves to Available unless overridden;
Figma names do not supply automatic lifecycle maturity.

Legacy two-field roster rows belong to S2 Web only. Browser consumers require
explicit source/file identity and never infer a native reference from web data.

## Adapter boundary (insurance against contract change)

The owner describes the upstream contract as "not finalized, may change." Downstream code (the combined table block, per-component pages) must **never bind to raw implementation vocabulary**. The boundary:

```
raw extraction files ─► shape/status reader ─► vocabulary adapter ─► unified index ─► UI
(deps/**/data/*.json)   (extraction-status.js) (status-model.js)    (deps/status-      (block
                                                                    index.json)        reads data)
```

1. **Shape/status reader — `scripts/utils/extraction-status.js`**: normalizes the RSP wrapper and SWC flat-array shapes and derives a component-level SWC status from the declaration metadata copied onto rows. It is also where lifecycle metadata remains separate from a functional attribute named `status`.
2. **Vocabulary adapter — `scripts/utils/status-model.js`**: a mapping table **keyed by implementation source**, since each implementation has its own vocabulary. It maps the normalized raw value to a unified status.
3. **Unified index — `deps/status-index.json`** (build-time, proposed by the daily action's pull request): the single surface used by the combined status UI. Shape is platform → implementation, so a vocabulary change is contained in the adapter and never reaches the UI.
4. **UI** renders columns *from* the index structure, not hard-coded RSP/SWC columns.

### Index shape (self-describing)

The index is emitted so a single fetch is interpretable without also reading `status-model.js` — this is what makes it consumable by AI-assisted tools and workflows, not just the block:

```jsonc
{
  // Machine-readable legend: the full status vocabulary a cell can carry, in canonical
  // order. Consumers read a cell's `status` id and look up its meaning here — no need to
  // import the adapter. Presentation-only fields (CSS color tokens) are intentionally
  // omitted; the complete enum is always emitted, even statuses not currently present.
  "statuses": {
    "available": { "label": "Available", "definition": "Ready for use. Fidelity may vary." }
    // …experimental, not-available, deprecated, removed
  },
  "implementations": {
    "web": [ { "id": "figma", "label": "Figma" }, /* RSP, SWC */ ],
    "ios": [ { "id": "figma", "label": "Figma" } ],
    "android": [ { "id": "figma", "label": "Figma" } ]
  },
  "components": [
    {
      "name": "PromptField",
      "label": "Prompt Field",
      "platforms": {
        "web": {
          "figma": {
            "status": "available",
            "figmaSource": "ai-toolkit",
            "figmaFile": "3WdX799d7ptEVA6RuTESXs",
            "figmaPageId": "24045:20181"
          }
          // RSP and SWC code cells are emitted here too.
        }
      }
    }
  ]
}
```

The `statuses` legend is generated from `STATUSES` by `statusLegend()` in [build-status-index.js](../build-status-index.js), so the embedded definitions never drift from the adapter.

Native platform metadata is emitted when that platform has selected designs.
Native cells contain Figma only. Native Code documentation links are resolved
separately by `scripts/utils/go-to-impl.js`; they do not claim code availability
or derive it from Figma status. Native-only components do not get web cells or
enter the web table's rows, counts, search results, or CSV export.

Each `deps/status/<slug>.json` contains the component's platform sections
directly, such as `{ web, ios, android }`. Figma references live inside each
platform's `figma` cell, not at slice level. A shared web page override changes
the web slice slug without moving a native slice from its canonical slug.
Shared `/mobile/components/<slug>` pages resolve DA aliases per platform
without changing canonical JSON filenames. For example, Buttons reads
`button.json`; Snackbars and toasts reads iOS from `toast.json` and Android
from `snackbar.json`. A missing native design renders a non-linked
**Design not available** pill for that platform, without a Figma action.
Native pages never use web as a fallback.

Current mapping (`SOURCE_MAPPINGS` in [status-model.js](../../scripts/utils/status-model.js)):

| Impl | Raw value | Unified status | Level 2 context |
| ---- | --------- | --------------- | ---------------- |
| RSP | `stable` | Available | "Stable" |
| RSP | `beta` | Available | "Beta" |
| RSP | `rc` | Available | "RC" |
| RSP | `alpha` | Available | "Alpha" |
| RSP | `deprecated` | Deprecated | — |
| RSP | *(absent, component not in roster)* | Not available | — |
| SWC | `stable` / *(absent, component present)* | Available | "Stable" / — |
| SWC | `preview` | Available | "Preview" |
| SWC | `internal` | Unmapped; filtered from the SWC roster before the join | — |
| SWC | `deprecated` | Deprecated | — |

RSP's `alpha`/`beta`/`rc` all resolve to Available (with their own Level 2 context) per the website status model — they're prerelease documentation states, not maturity gates. A component that's present in a source but yields no maturity signal at all (`null`/absent, not one of the raw values above) never reaches this table — it floors to Available (Figma, RSP) or Available (SWC) directly in the index build (`PRESENT_FLOOR` in `build-status-index.js`), since presence in a roster is never "Not available" for that column. `status: "deprecated"` is supported for SWC; RSP has no automatic path. See [Deprecation signals](#deprecation-signals).

## Name-matching and canonical join

The source rosters differ in shape and membership:

- RSP ([deps/rsp/components.json](../rsp/components.json)): PascalCase export keys, with package metadata for the AI cohort.
- SWC ([deps/swc/components.json](../swc/components.json)): bare tag name to published module subpath, including `components/` and `patterns/ai-toolkit/`.
- Figma ([deps/figma/components.json](../figma/components.json)): source/platform/file/node-qualified resources, including designs without a code peer.

**Roster selection (`build-status-index.js`):**

1. **`swcComponentTags`** converts every discovered SWC name to a tag. Published
   AI Toolkit patterns are included, not filtered by their module directory.
2. **`excludeInternalSwc`** removes a tag only when its extraction resolves to
   `internal`. A corresponding RSP or Figma component can still create the row.
3. **`roster-excludes.json`** removes reviewed composition parts from web
   membership across sources. These web exclusions do not remove native designs.

**Approach to name-matching:**

1. **Mechanical normalization** — strip the `swc-` prefix and convert kebab → Pascal (`swc-action-button` → `ActionButton`). This resolves the majority of joins.
2. **Alias file — [deps/component-aliases.json](../component-aliases.json)** handles genuine mismatches. RSP/SWC use their implementation maps. Figma uses `figmaSources[sourceId][displayName]`; legacy `figma` aliases apply only to S2 Web.
3. **Unmatched entries are single-implementation rows, not errors.** The index carries them with data present for one impl only.

**Roster scope.** Pattern membership alone does not exclude a published component.
Empty attribute arrays are valid for slot-only components and do not imply
unavailability. Internal status and reviewed composition-part exclusions still apply.
Unmatched public components remain single-implementation rows.

**Figma selection.** Matching is platform-specific. Multiple designs resolving
to one component on the same platform require explicit `figmaSource`,
`figmaPageSource`, or `figmaNodeId` selectors in that platform's Figma override.
Every supplied selector must match. Ambiguous or unmatched selections fail the
build before output writes. All resources remain in the raw roster.

**SWC pattern documentation.** Pattern membership does not create another code
implementation or package. The generated `docsSection` in
`impl-component-names.js` selects Storybook's `patterns-ai-toolkit` group instead
of `components`. An `upstreamName` alias handles a shared or nested docs page
without changing the real SWC tag.

## Deprecation signals

**Neither source emits a deprecation signal today.** Verified against Button, ActionButton, TableView and repo-wide.

### RSP — no usable signal

- **Zero `@deprecated` (and zero case-insensitive "deprecated") in all of `@react-spectrum/s2/src`**, including Button, ActionButton, and TableView. Because the `.d.ts` we parse are generated from this source, there is nothing to capture.
- The base types S2 inherits (`react-aria-components/src`) carry only **8 sparse, prop-level `@deprecated` tags** (e.g. `Select.selectedItem`). These are low-level ARIA props, not S2 component maturity, and `parseJSDoc` in `extract-props.js` discards all JSDoc tags except description and `@default`.
- The docs maturity vocabulary has **no "deprecated" value** — `VersionBadge` understands only `alpha`/`beta`/`rc`.

Capturing `@deprecated` from `.d.ts` would be a small parser change, but it would surface essentially nothing meaningful for S2 today.

### SWC — field not populated

- The CEM specification supports a separate `deprecated` field on declarations and members, but the current published manifest contains **zero `deprecated` fields**.
- The extractor reads declaration-level `status` and `since`. The committed catalog
  can contain public components without an explicit declaration `status`; do not
  infer `internal` from an old snapshot or a component's name.
- **Partially wired, unfed:** the runtime resolves `preview` and `deprecated` when the CEM declaration's `status` field carries those values. `getSwcComponentStatus` in `extraction-status.js` surfaces a uniform copied declaration status, and `SOURCE_MAPPINGS.swc` maps both values. The extractor does **not** currently read the CEM specification's separate `deprecated` field, so that form would require an extractor change.

The current automatic path is therefore specifically `declaration.status =
"deprecated"`, not any standards-compliant CEM deprecation signal.

## Recommendation: go / no-go on Deprecated

**Automatic detection is wired for an SWC declaration status; RSP still has no path to it. Deprecated is otherwise override-only.**

- SWC: `getSwcComponentStatus` and `SOURCE_MAPPINGS.swc` already resolve `status: "deprecated"` end-to-end. Supporting the CEM's separate `deprecated` field would require extractor work.
- RSP: still no automatic path. `extract-doc-status.js` can only ever parse `alpha`/`beta`/`rc`/`stable` from the S2 docs site; there's no `deprecated` doc-maturity state to read.
- Either way, the committed **`status-overrides.json`** escape hatch is applied last in the index build and can publish a known deprecation by hand, independent of upstream, for both sources.

## Open questions

- Confirm with the SWC team whether component `deprecated`/`preview` `status` will be
  authored. This determines when SWC-sourced Deprecated or Preview can appear
  automatically.
- Ask the RSP team whether component-level maturity and deprecation will become
  machine-readable in the package rather than only on the docs site.
