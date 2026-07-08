# Component status table — implementation plan

## Overview

Spectrum consumers currently check several documentation sources to learn whether a component is available for their platform. This feature surfaces that information in one place: a status table that shows each component's availability across Web implementations, starting with React Spectrum (RSP) and Spectrum Web Components (SWC).

Design (Figma) status is planned but depends on an external library update and is handled in a later epic.

## Status model

Six unified statuses map from implementation-specific terminology:

| Status | Meaning |
| --- | --- |
| 🟢 Available | Available for use. May carry a Level 2 context label such as Preview, Beta, or Stable. |
| 🔵 Experimental | Available for experiments only; not production-ready. |
| ⚪ Not available | Not currently available. |
| 🟠 Deprecated | Available but planned for removal. |
| 🔴 Removed | Was available but is no longer supported. |

Deprecated and Removed are defined in the model but not populated yet, and they are sourced differently:

- **Deprecated** is a value a component carries while it still exists, so it may come from an upstream marker (a TypeScript `@deprecated` tag in RSP, or the Custom Elements Manifest `deprecated` field in SWC). The data-contract spike (SPDOCS-351) checks whether these markers exist and are consistent. If capturing them is simple, the extraction and mapping include Deprecated then.
- **Removed** is defined by a component disappearing from the implementations. A current snapshot cannot distinguish "removed" from "never existed," so it needs a history-comparison mechanism that diffs the index against prior state. This has its own spike and story in Epic A and is not required for the initial launch.

A committed manual override file is the fallback for both. It lets a maintainer set a component's status by hand when the automated signal is unreliable, absent, or a human decision (for example, a design-led deprecation). It works independently of the two spikes above, so Deprecated or Removed can be set manually before automated detection exists.

### Default status mapping

Each implementation carries its own status vocabulary, so the mapping config is keyed by implementation source rather than being global — a new platform adds its own mapping table without touching the existing ones. The Web implementations resolve as follows (exact rules for `alpha` and `internal` to be confirmed with PM and design):

| Source status | Unified status | Level 2 context |
| --- | --- | --- |
| `stable` | Available | Stable |
| `beta` | Available | Beta |
| `rc` | Available | RC |
| `alpha` | Experimental | — |
| `internal` (SWC) | Experimental | — |
| `deprecated` marker (if captured) | Deprecated | — |
| `null` / absent | Not available | — |

`Removed` is not a source status — it is derived by comparing index runs, not read from a field. See the note above.

## Architecture

### Tech stack

The site runs on AEM Edge Delivery Services (EDS). Pages are document-authored and rendered client-side by decorating **blocks**. Each block is a folder under `blocks/<name>/` containing `<name>.js` and `<name>.css`, where the JavaScript default-exports an `init(el)` function. There is no site bundler; the code ships as plain ES modules, with Lit vendored for select interactive pieces.

### Data

There is no single normalized manifest. Component data lives in two parallel per-component trees:

- `deps/rsp/data/<Component>.json` — an object `{ props, status }`, where `status` is one of `stable`, `alpha`, `beta`, `rc`, or absent.
- `deps/swc/data/swc-<name>.json` — a flat array of prop rows; status is derived from per-prop `since` and `status` fields (`stable` or `internal`).

Runtime normalization already exists in [`scripts/utils/component-status.js`](scripts/utils/component-status.js), which exposes `getComponentStatus`, `getComponentProps`, and `isPrereleaseStatus`. The per-component data shape is intentional and is the confirmed contract.

### Pipeline

A GitHub Action, [`extract-rsp-properties.yml`](.github/workflows/extract-rsp-properties.yml), runs daily at 07:00 UTC. It regenerates RSP data and doc status, then auto-commits the result. The equivalent SWC workflow exists but its schedule is currently commented out, pending `@adobe/spectrum-wc` publishing a `custom-elements.json`; it runs on manual dispatch only.

### Aggregate index

To avoid fetching hundreds of per-component files at render time, the pipeline emits a single build-time index, `deps/status-index.json`, that the UI reads. Each entry is keyed by canonical component and structured as a **platform → implementation** hierarchy, so a new platform is an additive data change rather than a schema migration. Only Web is populated initially:

```json
{
  "name": "button",
  "label": "Button",
  "platforms": {
    "web":     { "rsp": { "status": "stable" }, "swc": { "status": "stable" } },
    "mobile":  { "ios": {}, "android": {} },
    "desktop": { "drover": {}, "qt": {} }
  }
}
```

The EDS `helix-query.yaml` mechanism indexes authored pages only, not `deps/`, so a script-generated index is the correct approach.

### Component name join

RSP names are PascalCase (`Button`); SWC names are tags (`swc-button`). The index joins them on a canonical key derived by normalization (strip the `swc-` prefix, kebab-case both sides), with a committed `deps/component-aliases.json` resolving any mismatches.

### Manual status overrides

`deps/status-overrides.json` is an optional committed file that maps a canonical component to a forced status per platform and implementation, with an optional Level 2 context and a short note for provenance. The index build applies it last, so a manual override wins over the auto-detected value. This is the fallback path for Deprecated and Removed, and a general escape hatch for correcting any status. Overrides should be reviewed periodically, since one can drift from what the implementation now reports; the build logs a warning when an override matches the value it replaces so stale entries can be cleaned up.

### New block

The status table is a purpose-built block at `blocks/component-status/`. It does not reuse or refactor the existing `blocks/table/` block, which serves a different purpose (a static prop-listing table). The new block carries over the existing block's accessibility patterns — explicit table roles for responsive CSS and an `aria-labelledby` accessible name — by convention rather than shared code.

## Decisions

- **Three epics** rather than two, to separate the shared data layer from the table UI. See the epic plan below.
- **Status definitions** are shown as an always-visible legend, sourced from the status model.
- **Column sort** resets on reload. The sort state is factored so URL-based persistence can be added later without rework.
- **Deprecated** is folded into the Epic A data-contract spike and implemented if the upstream signal is simple to capture. **Removed** needs a history-comparison mechanism and has its own deferred spike and story.
- **Manual override fallback.** A committed `deps/status-overrides.json`, applied last in the index build, lets maintainers force any status by hand — the fallback for Deprecated and Removed and a general correction escape hatch. It works day one, independently of the detection spikes.
- **No platform landing pages.** Single-implementation views live on individual component pages.
- **`status-cards`** is a nested variant of the status-table block, not a standalone block.
- **The Design (Figma) column** is excluded from the combined table and deferred to Epic C.
- **Per-platform tables.** Each platform gets its own status table (Web first; mobile and desktop later). A single cross-platform table is not planned — the need for one will be monitored and revisited if it emerges.
- **Columns render from the data.** The block derives its implementation columns from the index's platform/implementation structure rather than hard-coding them, so adding a platform or implementation is a data change, not a block rewrite.

## Epic plan

### Epic A — Foundation (data layer)

Delivers the status model, mapping, and aggregate index. No external blocker; can start immediately. Both Epic B and Epic C depend on it.

1. **[Spike] Confirm the RSP/SWC data contract, including a deprecation signal.** Document the fields used for status resolution and propose an adapter boundary. Also determine whether RSP (`@deprecated` tags) or SWC (CEM `deprecated` field) expose deprecation, and whether capturing it is simple enough to include in this epic.
2. **Add the unified status model and mapping config** at `scripts/utils/status-model.js`, with Node unit tests. Include the `deprecated → Deprecated` rule if the spike confirms the signal is available.
3. **Build the aggregate index and wire the pipeline.** Add `deps/build-status-index.js`, an initial committed `deps/status-index.json`, `deps/component-aliases.json`, Node tests, and the workflow step that regenerates and commits the index. Capture the deprecation marker if the spike confirms it is simple.
4. **Add a manual status override file** at `deps/status-overrides.json`, applied last in the index build so maintainers can force any status by hand. This is the fallback for Deprecated and Removed and works day one, independently of the detection spikes.
5. **[Spike] Determine the detection approach for Removed status** (deferred; not required for launch). Design how to compare index runs to detect a component that disappeared, where baseline state lives, and how to avoid false removals when an extraction run fails or returns empty.
6. **Detect and surface Removed status** (deferred; depends on story 5). Implement the history comparison and map a disappearance to Removed.

### Epic B — Combined Web status table (UI)

Route: `/web/status-table`. Depends on Epic A. This is the Web table; mobile and desktop get their own per-platform tables later, so the block must derive its columns from the index structure rather than hard-coding RSP and SWC.

1. **Build the status-table block** at `blocks/component-status/`. It must render implementation columns from the index's platform/implementation structure, not a hard-coded RSP/SWC column set, so future platforms need no block changes.
2. **Add column sort**, with `aria-sort` on the active header and keyboard support.
3. **Add CSV export** via a new `scripts/utils/csv.js` utility.
4. **Add discoverable status definitions** as a legend sourced from the status model.
5. **Build the `status-cards` sub-component** as a nested variant of the block.

### Epic C — Per-component Design/Dev status

Routes: `/web/rsp/components/<component>` and `/web/swc/components/<component>`. Blocked on the Figma library update (~7 July 2026); schema and access are unconfirmed.

1. **[Spike] Confirm the Figma design data source**, schema, access method, and whether Design status can differ per implementation.
2. **Add the per-component Design/Dev status table** on component pages, reusing the shared model and legend.

## Scaling beyond Web

The feature starts with Web (RSP and SWC) but is expected to grow to more platforms and implementations:

| Platform | Implementations |
| --- | --- |
| Web | RSP, SWC |
| Mobile | iOS, Android |
| Desktop | Drover, Qt |

Decisions that keep this cheap to grow into:

- **Per-platform tables, not one cross-platform table.** Each platform gets its own table. A single combined table across platforms is not planned; the need will be monitored and revisited if it emerges.
- **The index uses a platform → implementation hierarchy** from the start (see Aggregate index), so a new platform is an additive data change, not a schema migration.
- **The mapping config is keyed by implementation source**, so each new implementation brings its own status vocabulary without disturbing existing mappings.
- **The block renders columns from the data**, so onboarding an implementation needs no block rewrite.

Known costs that grow with scale (tracked, not solved here):

- **Cross-platform name matching** is harder than RSP ↔ SWC; `deps/component-aliases.json` will carry more entries as names diverge across platforms.
- **Per-component page density** (Epic C) grows with the number of platforms and implementations shown.
- **Onboarding a new implementation** needs its own extraction workflow, detection strategy (often a spike, as with SWC and Figma), mapping entry, and aliases. This should become a repeatable checklist.

## Branching and merge strategy

Every change is PR-reviewed. Stories merge to `main` incrementally as they land — there is no long-lived epic integration branch.

- **A1 (spike)** and **A2 (`status-model.js`)** are inert to the running site and merge to `main` on their own PRs. Nothing imports them until Epic B exists.
- **A3** splits along a seam: the inert half (build script, committed index, alias file, tests) merges like A2; the live half (the workflow edit) needs a manual-dispatch dry run before it is trusted, because a failure in the new step could stall the existing daily RSP commit.
- **Epic B** branches off `main` once the foundation is merged. A dedicated base branch is only needed if Epic B must start before A3 is trusted in `main` — a parallelization lever, not a requirement.

## Open questions

- Final mapping rules for `alpha` and SWC `internal` (Experimental vs Available with context). Owner: PM and design.
- Whether Design status is a single value per component or can differ per implementation. Resolved by the Epic C spike.

## Risks

- The RSP/SWC data contract is described by its owner as not finalized and may change. The Epic A spike pins it down before the index and block are built against it.
- The Figma library update landing does not guarantee the schema Epic C needs is stable on that date. The Epic C spike confirms schema stability before points are committed.

## References

- PRD: "S2 website status model" (status definitions, Level 1 and Level 2 statuses, example Web platform table, OKR 4A.3).
- Ticket-writing standards: [`.ai/rules/write-issues-tickets.md`](.ai/rules/write-issues-tickets.md).
- Existing data-shape adapter: [`scripts/utils/component-status.js`](scripts/utils/component-status.js).
- Reference block pattern: [`blocks/table/table.js`](blocks/table/table.js).
