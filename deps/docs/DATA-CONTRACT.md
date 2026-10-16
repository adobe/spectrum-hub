# RSP / SWC data contract

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

## Summary

- The two implementations expose status through **different fields with different meanings and different vocabularies**. They must be adapted per source, not merged directly. The adapter boundary is implemented in `extraction-status.js` and `status-model.js`.
- **Neither source currently emits a deprecation signal in its extracted data.** The SWC pipeline resolves `deprecated` and `preview` when either appears in a declaration's `status` field; it does not read the CEM's separate `deprecated` field. RSP S2 authors no `@deprecated` tags and its docs have no "deprecated" maturity, so RSP has no automatic path.
- **Manual `status-overrides.json` entries are currently the only way to publish a Deprecated cell.** The file is applied last in the index build.

## Status-resolution fields (the contract as built)

### React Spectrum (RSP)

Per-component file `deps/rsp/data/<Component>.json` has the shape `{ props: [...], status?: string }`.

| Field | Source | Values | Notes |
| ----- | ------ | ------ | ----- |
| `status` (top-level) | S2 docs site, not the package types | `stable` \| `alpha` \| `beta` \| `rc` \| *(absent)* | Doc maturity. Absent means no published doc page for that name. |
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
| `status` (per row) | CEM declaration `status` | `internal` \| `preview` \| `deprecated` \| *(absent)* | Only `internal` is emitted today. Absent means public/stable. `preview`/`deprecated` are supported declaration-status values with no current occurrence — see below. |
| `since` (per row) | CEM declaration `since` | e.g. `0.0.1`, `2.0.0` | Copied onto rows in the committed component catalogs. A declaration with no extracted attributes produces no rows on which to preserve it. |
| rows | CEM declaration `attributes` | attribute rows | Structured — no TS parsing. |

`getSwcComponentStatus` in [extraction-status.js](../../scripts/utils/extraction-status.js) returns the component's `status` as-is when every `since`-tagged prop shares one non-absent value (`internal`, `preview`, or `deprecated`), else `stable` (public or mixed), else `null` (no `since`-bearing prop at all — no maturity signal, floored by the index build).

#### Per-row lifecycle metadata

In the CEM, `status` and `since` are **declaration-level** component fields. `extract-cem-components.js` copies them onto every attribute row, and the adapter derives component status from those copied values. Reading declaration metadata directly instead would remove this round-trip.

**Caveat — name collision.** At least one component (`swc-message-feedback`) has a *functional* attribute literally named `status` (`'positive' | 'negative'`). This is unrelated to lifecycle maturity. Any status resolution must key on the **declaration** `status`, never a member named `status`. (`swc-message-feedback` is currently a conversational-AI pattern member excluded from the joined roster by `standaloneSwcTags` — see [Name-matching and canonical join](#name-matching-and-canonical-join) — but the collision risk applies to any component with a functional `status` prop, standalone or not.)

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
  // One entry per platform, each listing that platform's columns in display order.
  "implementations": {
    "web": [ { "id": "figma", "label": "Figma" }, /* rsp, swc */ ],
    "mobile": [ { "id": "ios", "label": "iOS" }, { "id": "android", "label": "Android" } ]
  },
  "components": [
    {
      "name": "Button",
      "label": "Button",
      // Only the platforms that ship it. A reader tells "no row here" from "cell is Not
      // available" by whether its platform key is present at all.
      "platforms": {
        "web": { "figma": { "status": "available" }, /* … */ },
        "mobile": { "ios": { "status": "available" }, "android": { "status": "available" } }
      }
    }
  ]
}
```

The `statuses` legend is generated from `STATUSES` by `statusLegend()` in [build-status-index.js](../build-status-index.js), so the embedded definitions never drift from the adapter.

### One index, every platform

A component is one row carrying a key per platform that ships it. That shape is what makes the status table platform-agnostic: columns, labels and cells all come from `implementations[platform]` and `platforms[platform]`, so onboarding a platform is a data change.

The index cannot say which platform a given table renders, since it describes them all — the authored class on the block does (`status-table mobile`). [`blocks/status-table/status-table.js`](../../blocks/status-table/status-table.js) matches that class against the platforms the index declares, ignoring classes that name none, and renders only the components carrying that platform's key.

Keeping one file works because the shared configuration is already platform-aware: `status-overrides.json` has always been keyed `name → platform → impl`, and aliases and secondary overlays are keyed by **source** id (`figma`/`rsp`/`swc`/`ios`/`android`), which is unique across platforms. `roster-excludes.json` is the one that was not, and is now keyed by platform — an exclusion drops a canonical name from every source at once, and the platforms disagree about what is standalone (`ToggleButton` is a web composition part but a first-class mobile component).

[`PLATFORM_CONFIG`](../build-status-index.js) holds what genuinely varies — columns, present floors, overlay filenames, and a `readRoster` function, since web unions three extracted sources while mobile reads authored files. Its key order is the merge order, and the first platform to produce a row supplies that row's label.

A roster entry may carry an explicit `label`. A platform whose roster is display-name-first derives its canonical key *from* the display name, and that direction is lossy — `Floating action button (FAB)` normalizes to `FloatingActionButtonFAB`, which de-PascalCases back with the parentheses gone. Such an entry carries its authored name instead of having it reconstructed. RSP/SWC rows need none: their canonical key is the code identifier.

### The mobile rosters

The native mobile platforms follow SWC's shape rather than inventing one. `deps/ios/components.json` and `deps/android/components.json` map the name that platform uses to the component's **module subpath**, exactly as `deps/swc/components.json` maps a tag to a module subpath, and `joinNamedRosters` unions them. Status is never in these files: it comes from a per-component catalog of prop rows at `deps/<platform>/data/<Name>.json`, where `<Name>` is the subpath's last segment. That indirection is what lets a display-name key like `Pop-up button` sit beside a `PopUpButton.json` catalog.

Everything downstream is therefore the SWC path: `getSwcComponentStatus` derives the component's status from the rows' `status`/`since`, `SOURCE_MAPPINGS.ios`/`.android` map SWC's vocabulary (`stable`/`preview`/`deprecated`), and a component present in a roster whose catalog yields no maturity signal is floored to Available — presence in a roster is never "Not available" for that column.

Reads are tolerant: an absent **or unparseable** catalog yields no maturity signal and warns, rather than aborting the build. A half-written catalog is a normal state while a platform's extraction is still being built, and it should cost that one component its context, not take the whole index down and leave every surface on a stale file.

Two consequences worth knowing. A component **neither** platform lists has no row at all, since membership is presence — a component documented as unavailable everywhere needs a roster entry somewhere. And module subpaths are recorded relative to the package root, with the package version belonging in a `version.json` beside them (as `deps/swc/version.json` does) rather than baked into every path, so a version bump is one edit.

Per-component slices are merged the same way: one `deps/status/<slug>.json` carrying every platform that ships the component, because the slug is the key `/web/<impl>/components/<slug>` and `/mobile/components/<slug>` share. A component page reads whichever platform key it needs from one small fetch. `impl-component-names.js` stays web-derived — `buildImplComponentNames` skips any column that is not a registered web implementation, so other platforms would add nothing to it.

### Component-page routes

Web gives each implementation its own page tree, so a cell links to `/web/<impl>/components/<slug>`. Mobile publishes one page per component shared by both platforms, so its cells link to `/mobile/components/<slug>` with no implementation segment — every linked cell in a row points at the same page. `PER_COLUMN_PAGES` in the block holds that distinction. Which cells link at all is unchanged: `LINKED_STATUSES` plus the published-page gate, so an Available iOS cell is a link while a Not available Android cell beside it is plain text.

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

The two rosters differ in shape and, more importantly, in **membership**.

- RSP allow list ([deps/rsp/components.json](../rsp/components.json)): 121 `PascalCase` keys.
- SWC allow list ([deps/swc/components.json](../swc/components.json)): 41 tags total (bare name → module subpath), generated by `discover-components.js` from the CEM. `build-status-index.js` narrows this before joining — see below.

**Roster narrowing before the join (`build-status-index.js`):**

1. **`standaloneSwcTags`** drops any tag whose subpath starts with `patterns/` — currently `conversation-thread`, `conversation-turn`, `message-feedback`, `message-sources`, `pixel-loader`, `prompt-field`, `response-status`, `response-status-step`, `suggestion-group`, `suggestion-item`, `system-message`, `upload-attachment`, and `user-message` (13 of 41 tags). These are pattern members, not standalone documented components, so they never reach the table at all — not even as SWC-only rows.
2. **`excludeInternalSwc`** then drops any remaining tag whose resolved status is `internal` (currently `swc-icon` and `swc-ui-icon`) from the SWC contribution to the roster. An internal SWC primitive does not surface as an Experimental SWC cell; it is excluded from the join entirely for that column. If the same canonical name ships from RSP or Figma, that row still exists, just with SWC reading Not available rather than Experimental.
3. Dropping 13 pattern tags from 41 leaves 28 standalone tags, and dropping the 2 internal tags leaves 26 entering the join in the current snapshot.

**Approach to name-matching:**

1. **Mechanical normalization** — strip the `swc-` prefix and convert kebab → Pascal (`swc-action-button` → `ActionButton`). This resolves the majority of joins.
2. **Alias file — [deps/component-aliases.json](../component-aliases.json)**, keyed per source (`rsp`, `swc`, `figma`; see `canonicalNameForRsp`/`canonicalNameForSwc`/`canonicalNameForFigma`), for genuine mismatches where normalization is wrong or ambiguous, such as `swc-card` joining the canonical `Cards` row.
3. **Unmatched entries are single-implementation rows, not errors.** The index carries them with data present for one impl only.

**Roster scope.** The pattern and internal filters narrow the SWC roster before the
table sees it. Conversational-AI pattern members do not reach the joined roster.
`swc-tab` and `swc-tab-panel` remain standalone with no RSP peer because RSP exposes
`Tabs` only, so single-implementation SWC rows still occur.

## Deprecation signals

**Neither source emits a deprecation signal today.** Verified against Button, ActionButton, TableView and repo-wide.

### RSP — no usable signal

- **Zero `@deprecated` (and zero case-insensitive "deprecated") in all of `@react-spectrum/s2/src`**, including Button, ActionButton, and TableView. Because the `.d.ts` we parse are generated from this source, there is nothing to capture.
- The base types S2 inherits (`react-aria-components/src`) carry only **8 sparse, prop-level `@deprecated` tags** (e.g. `Select.selectedItem`). These are low-level ARIA props, not S2 component maturity, and `parseJSDoc` in `extract-props.js` discards all JSDoc tags except description and `@default`.
- The docs maturity vocabulary has **no "deprecated" value** — `VersionBadge` understands only `alpha`/`beta`/`rc`.

Capturing `@deprecated` from `.d.ts` would be a small parser change, but it would surface essentially nothing meaningful for S2 today.

### SWC — field not populated

- The CEM specification supports a separate `deprecated` field on declarations and members, but the current published manifest contains **zero `deprecated` fields**.
- The lifecycle metadata currently observed by the extractor is declaration-level `status` (only `internal`, on `swc-icon` and `swc-ui-icon`) and `since`.
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
