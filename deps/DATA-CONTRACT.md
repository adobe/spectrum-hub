# RSP / SWC data contract (spike)

Spike deliverable for SPDOCS-351. This document pins the data contract that the status model and combined index are built against, and records whether a deprecation signal exists upstream today.

It complements the per-implementation pipeline docs — see [deps/rsp/README.md](./rsp/README.md) and [deps/swc/README.md](./swc/README.md) — rather than repeating them. Runtime normalization lives in [scripts/utils/component-status.js](../scripts/utils/component-status.js).

**Sources inspected (local workspace, not published artifacts):**

- RSP: `@react-spectrum/s2` source and `packages/dev/s2-docs` in the sibling `react-spectrum` checkout.
- SWC: the locally generated CEM at `../spectrum-web-components/2nd-gen/packages/swc/.storybook/custom-elements.json` (31 component declarations). The CEM is **not yet published** to `@adobe/spectrum-wc`.
- Verified against the QA sample: **Button, ActionButton, TableView**.

## Summary

- The two implementations expose status through **different fields with different meanings and different vocabularies**. They must be adapted per source, not merged directly. An adapter boundary is proposed below.
- **No deprecation signal is available from either source today.** RSP S2 authors no `@deprecated` tags and its docs have no "deprecated" maturity; the SWC CEM contains zero `deprecated` fields.
- **Recommendation: defer Deprecated in this epic** and set any known deprecations by hand via the planned `status-overrides.json`. Both sources can fold in cheaply later if the signal appears.

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
| `status` (per row) | CEM declaration `status` | `internal` \| *(absent)* | Only `internal` is emitted today (2 of 31 declarations: `swc-asset`, `swc-icon`). Absent means public/stable. |
| `since` (per row) | CEM declaration `since` | e.g. `0.0.1`, `2.0.0` | Present on ~19 declarations. |
| rows | CEM declaration `attributes` | attribute rows | Structured — no TS parsing. |

`getSwcComponentStatus` in [component-status.js](../scripts/utils/component-status.js) returns `internal` when every `since`-tagged prop is internal, else `stable`, else `null`.

**Finding — the per-prop `status`/`since` are an artifact.** In the CEM, `status` and `since` are **declaration-level** (component) fields. `extract-cem-components.js` copies them onto every attribute row, so the runtime "per-prop" derivation actually reduces to reading the component declaration. The adapter should read the declaration level directly and skip the round-trip.

**Caveat — name collision.** At least one component (`swc-message-feedback`) has a *functional* attribute literally named `status` (`'positive' | 'negative'`). This is unrelated to lifecycle maturity. Any status resolution must key on the **declaration** `status`, never a member named `status`.

## Adapter boundary (insurance against contract change)

The owner describes the upstream contract as "not finalized, may change." Downstream code (the combined table block, per-component pages) must **never bind to raw implementation vocabulary**. The boundary:

```
raw extraction files ─► per-implementation adapter ─► unified index ─► UI
(deps/**/data/*.json)   (status-model.js, keyed        (deps/status-      (block reads
                         by impl source)                index.json)        columns from data)
```

1. **Adapter — `scripts/utils/status-model.js`** (next story): a mapping table **keyed by implementation source**, since each impl has its own vocabulary. It consumes the fields documented above and emits a unified status. It also absorbs the SWC declaration-vs-per-prop artifact and the `status`-named-prop collision so no other code sees them.
2. **Unified index — `deps/status-index.json`** (build-time, emitted by the daily action): the single surface downstream binds to. Shape is platform → implementation, so a vocabulary change is contained in the adapter and never reaches the UI.
3. **UI** renders columns *from* the index structure, not hard-coded RSP/SWC columns.

Starter mapping (values to be confirmed in the status-model story; shown to illustrate the boundary, not to finalize):

| Impl | Raw value | Unified status |
| ---- | --------- | -------------- |
| RSP | `stable` | Available |
| RSP | `alpha` / `beta` / `rc` | Experimental |
| RSP | *(absent)* | Not available |
| SWC | *(absent)* = public | Available |
| SWC | `internal` | Experimental *(confirm)* |
| either | *(deprecation — none today)* | Deprecated *(via override only, see below)* |

## Name-matching and canonical join

The two rosters differ in shape and, more importantly, in **membership**.

- RSP allow list ([deps/rsp/components.json](./rsp/components.json)): ~100 `PascalCase` keys.
- SWC allow list ([deps/swc/components.json](./swc/components.json)): 30 `swc-<kebab>` tags (31 declarations in the CEM).

**Approach:**

1. **Mechanical normalization** — strip the `swc-` prefix and convert kebab → Pascal (`swc-action-button` → `ActionButton`). This resolves the majority of joins.
2. **Alias file — `deps/component-aliases.json`** (next story) for genuine mismatches where normalization is wrong or ambiguous, e.g. `swc-asset` is **not** RSP `AssetCard`.
3. **Unmatched entries are single-implementation rows, not errors.** The index carries them with data present for one impl only.

**Finding — the rosters cover different component spaces.** Roughly half the SWC 2nd-gen tags have no 1:1 RSP peer, mostly the AI/chat cohort: `swc-conversation-thread`, `swc-conversation-turn`, `swc-prompt-field`, `swc-message-feedback`, `swc-message-sources`, `swc-response-status`, `swc-suggestion-group`, `swc-suggestion-item`, `swc-system-message`, `swc-upload-artifact`, `swc-user-message`, `swc-color-loupe`. Conversely `swc-tab` / `swc-tab-panel` have no standalone RSP equivalent (RSP exposes `Tabs` only). The combined Web table should expect many legitimately single-impl rows.

## Deprecation finding (the core question)

**Neither source emits a deprecation signal today.** Verified against Button, ActionButton, TableView and repo-wide.

### RSP — no usable signal

- **Zero `@deprecated` (and zero case-insensitive "deprecated") in all of `@react-spectrum/s2/src`**, including Button, ActionButton, and TableView. Because the `.d.ts` we parse are generated from this source, there is nothing to capture.
- The base types S2 inherits (`react-aria-components/src`) carry only **8 sparse, prop-level `@deprecated` tags** (e.g. `Select.selectedItem`). These are low-level ARIA props, not S2 component maturity, and `parseJSDoc` in `extract-props.js` discards all JSDoc tags except description and `@default`.
- The docs maturity vocabulary has **no "deprecated" value** — `VersionBadge` understands only `alpha`/`beta`/`rc`.
- **Doc correction needed:** [deps/rsp/README.md](./rsp/README.md) "Known limitations" cites "deprecated `isQuiet` on Button." That prop no longer exists in S2 Button; the claim is stale (legacy Spectrum). It should be updated.

Capturing `@deprecated` from `.d.ts` would be a small parser change, but it would surface essentially nothing meaningful for S2 today.

### SWC — field not populated

- The CEM supports a `deprecated` field (CEM spec allows it on declarations and members), but the current manifest contains **zero `deprecated` fields**.
- The only lifecycle metadata present is declaration-level `status` (only `internal`, 2 declarations) and `since`.
- **Doc note:** [deps/swc/README.md](./swc/README.md) documents `status` as supporting `preview` / `deprecated` / `internal`. Only `internal` is observed in the current CEM; `deprecated` and `preview` are not emitted. The README describes the intended vocabulary, not current output.

Capturing the CEM `deprecated` field would be trivial (one line in `formatAttr`), but there is no data to capture, and SWC extraction is separately blocked on CEM publication.

## Recommendation: go / no-go on Deprecated

**No-go for automatic detection this epic. Defer.**

- No automatic Deprecated status can be sourced from RSP or SWC today.
- Ship Deprecated only through the planned committed **`status-overrides.json`** escape hatch (already an Epic A story), applied last in the index build. This lets any known deprecation be set by hand on day one, independent of upstream.
- Keep the door open cheaply: the adapter's per-source mapping should already include a `deprecated → Deprecated` rule, so if RSP starts authoring `@deprecated` (one small parser change to keep the tag) or the SWC CEM starts populating `deprecated` (one line in `formatAttr`), it folds in without rework.

## Follow-ups this spike surfaced

- Update the stale `isQuiet` deprecation example in [deps/rsp/README.md](./rsp/README.md).
- Clarify in [deps/swc/README.md](./swc/README.md) that `deprecated`/`preview` `status` values are intended, not currently emitted.
- Ask the SWC team to (a) publish the CEM and (b) confirm whether component `deprecated`/`status` will be authored — this determines when SWC-sourced Deprecated becomes viable.
- Ask the RSP team whether component-level maturity (and deprecation) will ever be machine-readable in the package rather than only on the docs site.
