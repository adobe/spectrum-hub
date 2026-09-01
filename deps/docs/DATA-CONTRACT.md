# RSP / SWC data contract

Originally a spike deliverable for SPDOCS-351; now the living reference for the data contract the status model and combined index are built against, including which deprecation/preview signals are available upstream. Keep this current as the mapping, sources, or upstream signal availability change.

It complements the per-implementation pipeline docs — see [deps/rsp/README.md](../rsp/README.md) and [deps/swc/README.md](../swc/README.md) — rather than repeating them. Runtime normalization lives in [scripts/utils/extraction-status.js](../../scripts/utils/extraction-status.js).

**Sources:**

- RSP: doc maturity from the S2 docs site ([react-spectrum.adobe.com](https://react-spectrum.adobe.com)), fetched live by `extract-doc-status.js`; props parsed from `@react-spectrum/s2` `.d.ts` on unpkg/jsDelivr.
- SWC: the **published** `@adobe/spectrum-wc` Custom Elements Manifest (currently pinned to a snapshot tag pending a stable release — see [deps/swc/README.md](../swc/README.md)), fetched from CDN by `extract-cem-components.js`. `components.json` is auto-discovered from this same CEM by `discover-components.js` and currently lists 35 tags.
- Originally verified against the QA sample **Button, ActionButton, TableView** while the CEM was still a local, pre-publication build (31 declarations at the time). The pipeline has since moved to the published package; re-verify against the current data if this contract is revisited.

## Summary

- The two implementations expose status through **different fields with different meanings and different vocabularies**. They must be adapted per source, not merged directly. The adapter boundary below is now implemented in `status-model.js`.
- **Neither source currently emits a deprecation signal in its data**, but the adapter and the SWC extractor are already wired to resolve `deprecated` (and `preview`) if one appears — see [SWC — field not populated](#swc--field-not-populated) below. RSP S2 authors no `@deprecated` tags and its docs have no "deprecated" maturity, so RSP has no path to auto-detect it yet.
- **Deprecated ships today only through the committed `status-overrides.json`** override file, applied last in the index build — not because detection is unbuilt for SWC, but because no upstream source currently produces a `deprecated` value to detect.

## Status-resolution fields (the contract as built)

### React Spectrum (RSP)

Per-component file `deps/rsp/data/<Component>.json` has the shape `{ props: [...], status?: string }`.

| Field | Source | Values | Notes |
| ----- | ------ | ------ | ----- |
| `status` (top-level) | S2 docs site, not the package types | `stable` \| `alpha` \| `beta` \| `rc` \| *(absent)* | Doc maturity. Absent means no published doc page for that name. |
| `props[]` | `.d.ts` parsed with regex | prop rows | Known parser limits (multi-line unions, generics, function types) — see rsp README. |

**Finding — the RSP status signal is effectively binary today.** The prerelease vocabulary is real code: the docs render a badge from `export const version` in `packages/dev/s2-docs/pages/s2/*.mdx`, and `extract-doc-status.js` reads it. But **no `s2/*` doc page currently declares a version** — the only two `export const version` in the entire docs repo are on React Aria pages (`Autocomplete` = `rc`, `Toast` = `alpha`). So every tracked S2 component resolves to `stable` (or absent). The status model should treat `alpha`/`beta`/`rc` as valid-but-currently-unused rather than over-fitting to them.

### Spectrum Web Components (SWC)

Per-component file `deps/swc/data/swc-<tag>.json` is a flat array of prop rows. Component-level status is **derived**, not stored as a single field.

| Field | Source | Values | Notes |
| ----- | ------ | ------ | ----- |
| `status` (per row) | CEM declaration `status` | `internal` \| `preview` \| `deprecated` \| *(absent)* | Only `internal` is emitted today, on 2 of 35 declarations (`swc-asset`, `swc-icon`). Absent means public/stable. `preview`/`deprecated` are valid CEM values with no current occurrence — see below. |
| `since` (per row) | CEM declaration `since` | e.g. `0.0.1`, `2.0.0` | Present on 23 of 35 declarations. |
| rows | CEM declaration `attributes` | attribute rows | Structured — no TS parsing. |

`getSwcComponentStatus` in [extraction-status.js](../../scripts/utils/extraction-status.js) returns the component's `status` as-is when every `since`-tagged prop shares one non-absent value (`internal`, `preview`, or `deprecated`), else `stable` (public or mixed), else `null` (no `since`-bearing prop at all — no maturity signal, floored by the index build).

**Finding — the per-prop `status`/`since` are an artifact.** In the CEM, `status` and `since` are **declaration-level** (component) fields. `extract-cem-components.js` copies them onto every attribute row, so the runtime "per-prop" derivation actually reduces to reading the component declaration. Still true today: the adapter reads the copied-down row value rather than the declaration directly. Reading the declaration level directly and skipping the round-trip remains an open simplification, not yet done.

**Caveat — name collision.** At least one component (`swc-message-feedback`) has a *functional* attribute literally named `status` (`'positive' | 'negative'`). This is unrelated to lifecycle maturity. Any status resolution must key on the **declaration** `status`, never a member named `status`. (`swc-message-feedback` is currently a conversational-AI pattern member excluded from the joined roster by `standaloneSwcTags` — see [Name-matching and canonical join](#name-matching-and-canonical-join) — but the collision risk applies to any component with a functional `status` prop, standalone or not.)

## Adapter boundary (insurance against contract change)

The owner describes the upstream contract as "not finalized, may change." Downstream code (the combined table block, per-component pages) must **never bind to raw implementation vocabulary**. The boundary:

```
raw extraction files ─► per-implementation adapter ─► unified index ─► UI
(deps/**/data/*.json)   (status-model.js, keyed        (deps/status-      (block reads
                         by impl source)                index.json)        columns from data)
```

1. **Adapter — `scripts/utils/status-model.js`**: a mapping table **keyed by implementation source**, since each impl has its own vocabulary. It consumes the fields documented above and emits a unified status. It also absorbs the SWC declaration-vs-per-prop artifact and the `status`-named-prop collision so no other code sees them.
2. **Unified index — `deps/status-index.json`** (build-time, emitted by the daily action): the single surface downstream binds to. Shape is platform → implementation, so a vocabulary change is contained in the adapter and never reaches the UI.
3. **UI** renders columns *from* the index structure, not hard-coded RSP/SWC columns.

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
  "implementations": { "web": [ { "id": "figma", "label": "Figma" }, /* … */ ] },
  "components": [
    {
      "name": "ActionButton",
      "label": "Action Button",
      "platforms": { "web": { "figma": { "status": "available" }, /* … */ } }
    }
  ]
}
```

The `statuses` legend is generated from `STATUSES` by `statusLegend()` in [build-status-index.js](../build-status-index.js), so the embedded definitions never drift from the adapter.

Shipped mapping (`SOURCE_MAPPINGS` in [status-model.js](../../scripts/utils/status-model.js)):

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
| SWC | `internal` | Experimental | — |
| SWC | `deprecated` | Deprecated | — |

RSP's `alpha`/`beta`/`rc` all resolve to Available (with their own Level 2 context) per the website status model — they're prerelease documentation states, not maturity gates. A component that's present in a source but yields no maturity signal at all (`null`/absent, not one of the raw values above) never reaches this table — it floors to Available (Figma, RSP) or Available (SWC) directly in the index build (`PRESENT_FLOOR` in `build-status-index.js`), since presence in a roster is never "Not available" for that column. `deprecated` is live for SWC (the extractor can surface it from the CEM) and dormant for RSP (the extractor has no path to it) — see [Deprecation finding](#deprecation-finding-the-core-question) below.

## Name-matching and canonical join

The two rosters differ in shape and, more importantly, in **membership**.

- RSP allow list ([deps/rsp/components.json](../rsp/components.json)): 101 `PascalCase` keys.
- SWC allow list ([deps/swc/components.json](../swc/components.json)): 35 tags total (bare name → module subpath), generated by `discover-components.js` from the CEM. `build-status-index.js` narrows this before joining — see below.

**Roster narrowing before the join (`build-status-index.js`):**

1. **`standaloneSwcTags`** drops any tag whose subpath starts with `patterns/` — the conversational-AI cohort (`conversation-thread`, `conversation-turn`, `message-feedback`, `message-sources`, `prompt-field`, `response-status`, `response-status-step`, `suggestion-group`, `suggestion-item`, `system-message`, `upload-artifact`, `user-message`: 12 of 35 tags). These are pattern members, not standalone documented components, so they never reach the table at all — not even as SWC-only rows.
2. **`excludeInternalSwc`** then drops any remaining tag whose resolved status is `internal` (currently `swc-asset`, `swc-icon`) from the SWC contribution to the roster. An internal SWC primitive no longer surfaces as an Experimental SWC cell; it's excluded from the join entirely for that column. If the same canonical name ships from RSP or Figma, that row still exists, just with SWC reading Not available rather than Experimental.
3. This leaves 23 − 2 = 21 standalone, non-internal SWC tags entering the join as of this writing.

**Approach to name-matching:**

1. **Mechanical normalization** — strip the `swc-` prefix and convert kebab → Pascal (`swc-action-button` → `ActionButton`). This resolves the majority of joins.
2. **Alias file — [deps/component-aliases.json](../component-aliases.json)**, keyed per source (`rsp`, `swc`, `figma`; see `canonicalNameForRsp`/`canonicalNameForSwc`/`canonicalNameForFigma`), for genuine mismatches where normalization is wrong or ambiguous, e.g. `swc-asset` is **not** RSP `AssetCard`. Shipped and in use, not a future story.
3. **Unmatched entries are single-implementation rows, not errors.** The index carries them with data present for one impl only.

**Finding — the rosters cover different component spaces, but the pattern/internal filters narrow this before the table sees it.** The AI/chat cohort (conversational-AI pattern members) never reaches the joined roster as of `standaloneSwcTags`, so it no longer appears as legitimately single-impl SWC rows — the earlier framing of "expect many single-impl rows from the AI/chat cohort" no longer holds; those tags are filtered out upstream of the join. `swc-tab` / `swc-tab-panel` remain standalone with no RSP peer (RSP exposes `Tabs` only), so single-impl SWC rows still occur, just from a narrower set than originally surveyed.

## Deprecation finding (the core question)

**Neither source emits a deprecation signal today.** Verified against Button, ActionButton, TableView and repo-wide.

### RSP — no usable signal

- **Zero `@deprecated` (and zero case-insensitive "deprecated") in all of `@react-spectrum/s2/src`**, including Button, ActionButton, and TableView. Because the `.d.ts` we parse are generated from this source, there is nothing to capture.
- The base types S2 inherits (`react-aria-components/src`) carry only **8 sparse, prop-level `@deprecated` tags** (e.g. `Select.selectedItem`). These are low-level ARIA props, not S2 component maturity, and `parseJSDoc` in `extract-props.js` discards all JSDoc tags except description and `@default`.
- The docs maturity vocabulary has **no "deprecated" value** — `VersionBadge` understands only `alpha`/`beta`/`rc`.
- **Fixed:** [deps/rsp/README.md](../rsp/README.md) previously cited a stale "deprecated `isQuiet` on Button" example (a legacy-Spectrum prop that no longer exists in S2 Button); it now correctly states that S2 authors no `@deprecated` JSDoc tags.

Capturing `@deprecated` from `.d.ts` would be a small parser change, but it would surface essentially nothing meaningful for S2 today.

### SWC — field not populated

- The CEM supports a `deprecated` field (CEM spec allows it on declarations and members), but the current published manifest contains **zero `deprecated` fields**.
- The only lifecycle metadata present is declaration-level `status` (only `internal`, on 2 of 35 declarations) and `since`.
- **Wired, unfed:** [deps/swc/README.md](../swc/README.md) documents `status` as supporting `preview` / `deprecated` / `internal`. Only `internal` is observed in the current CEM; `deprecated` and `preview` are not emitted by the source. Unlike when this doc was written, the runtime **can** now resolve `preview` and `deprecated` if the CEM starts emitting them — `getSwcComponentStatus` in `extraction-status.js` surfaces any uniform component-level `status`, and `SOURCE_MAPPINGS.swc` maps all three to their unified status. The gap today is upstream data, not code.

Capturing the CEM `deprecated` field required no change to `formatAttr` — the field was already copied onto every row. The resolver-side work (recognizing `deprecated`/`preview`, not just `internal`) has been done; there is simply no data to exercise it yet.

## Recommendation: go / no-go on Deprecated

**Automatic detection is wired for SWC; RSP still has no path to it. Deprecated is otherwise override-only.**

- SWC: `getSwcComponentStatus` and `SOURCE_MAPPINGS.swc` already resolve `deprecated` end-to-end; it's dormant only because the current CEM never sets a component's `@status` to `deprecated`. No further code change is needed for SWC — this will "just work" the day the CEM populates it.
- RSP: still no automatic path. `extract-doc-status.js` can only ever parse `alpha`/`beta`/`rc`/`stable` from the S2 docs site; there's no `deprecated` doc-maturity state to read.
- Either way, Deprecated ships today through the committed **`status-overrides.json`** escape hatch, applied last in the index build. This lets any known deprecation be set by hand, independent of upstream, for both sources.

## Follow-ups this spike surfaced

- ~~Update the stale `isQuiet` deprecation example in `deps/rsp/README.md`~~ — done.
- ~~Clarify in `deps/swc/README.md` that `deprecated`/`preview` `status` values are intended, not currently emitted~~ — done.
- ~~Ask the SWC team to publish the CEM~~ — done; `@adobe/spectrum-wc` now ships a published (snapshot-pinned) CEM that `extract-cem-components.js` fetches from CDN.
- Still open: confirm with the SWC team whether component `deprecated`/`preview` `status` will be authored — this determines when SWC-sourced Deprecated/Preview actually appears in the table, since the code path is already in place.
- Still open: ask the RSP team whether component-level maturity (and deprecation) will ever be machine-readable in the package rather than only on the docs site.
