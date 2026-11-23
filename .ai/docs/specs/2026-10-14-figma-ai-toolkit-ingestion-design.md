# Platform-specific Figma design ingestion

## Scope

Spectrum Hub uses Figma design data for the combined web status table,
component-status Design pills, and the "See in Figma" page-nav widget.
The Spectrum AI Toolkit Figma library is a design source independent of the
RSP and SWC code implementation catalogs.

The source registry in
[`scripts/utils/figma-sources.js`](../../../scripts/utils/figma-sources.js)
defines each library's source ID, platform, file key, and URL name:

| Source ID | Platform | Library |
| --- | --- | --- |
| `s2-web` | `web` | S2 Web |
| `ai-toolkit` | `web` | Spectrum AI Toolkit |
| `s2-ios` | `ios` | S2 iOS |
| `s2-android` | `android` | S2 Android |

## Discovery

[`deps/figma/discover-components.js`](../../../deps/figma/discover-components.js)
fetches published component sets through the Figma REST API and atomically
replaces `deps/figma/components.json`. It requires `FIGMA_TOKEN` with
`library_content:read` and access to every registered file.

Each generated row contains
`{ source, platform, figmaFile, name, figmaPageId }`.
Resource identity is source plus node ID, not display name. `figmaPageId` is a
component-set node ID, not a canvas/page ID.

Every source must return a non-empty, validated result. Invalid responses,
duplicate source/node identities, or a source returning fewer than half its
committed rows prevent publication. Discovery excludes names starting with
`.` and does not enumerate unpublished nodes, arbitrary frames, or standalone
components.

## Canonical resolution

[`deps/figma/resolve-components.js`](../../../deps/figma/resolve-components.js)
selects one design per platform/canonical component during the status build.

- `figmaSources[sourceId][displayName]` in `deps/component-aliases.json` defines
  source-qualified aliases. The `figma[displayName]` map applies only to S2 Web.
- `overrides[canonicalName][platform].figma` in `deps/status-overrides.json`
  selects a design using `figmaSource`, `figmaPageSource`, or `figmaNodeId`.
  Every supplied selector must match. `figmaPageSource` can select another
  canonical component's design on the same platform.
- Ambiguous matches, unmatched selections, and invalid resource identities
  fail the build before output writes.
- `deps/roster-excludes.json` removes web membership without removing native
  designs.
- `deps/figma/figma-secondary-status.json` supplies web guidance and contributes
  names to web Figma membership. An overlay entry alone supplies no node
  reference.

Figma presence maps to Available unless overridden. Names containing
"Deprecated" do not automatically change lifecycle status.

## Generated outputs and consumers

[`deps/build-status-index.js`](../../../deps/build-status-index.js) writes:

| Output | Contract |
| --- | --- |
| `deps/status-index.json` | Canonical components with platform/implementation cells and a status legend |
| `deps/status/<slug>.json` | Platform sections such as `{ web, ios, android }` for targeted runtime fetches |
| `deps/impl-component-names.js` | Code implementation documentation and export metadata; no Figma selections |

A selected Figma cell carries `figmaSource`, `figmaFile`, and `figmaPageId`
together. The platform's `figma` cell is authoritative. Generated slices no
longer mirror selected S2 Web node IDs into a root-level `figmaPageId`.
Retained orphan slices are pending a separate route audit. Native availability
cells describe Figma only; platform-level
documentation metadata does not imply native code support. The combined status
table uses only components with web cells.

Automatic Design pills and the "See in Figma" widget use
`getFigmaLinks(context, componentData, platforms)` in
[`scripts/utils/figma.js`](../../../scripts/utils/figma.js). They read
`web.figma` for `/web/<impl>/components/<slug>` and the corresponding native
cell for `/mobile/ios/components/<slug>` or
`/mobile/android/components/<slug>`. Native routes do not fall back to web.
Links require matching source, platform, file, and node identity.
`figmaNodeUrl(figmaPageId, sourceId, fileKey)` builds the registered library URL.

[`scripts/utils/component-slice.js`](../../../scripts/utils/component-slice.js)
memoizes each slice fetch by slug. A shared web page override changes the web
slice path without moving native data from its canonical slug. The slice
writer does not prune obsolete files; the index is the authoritative roster.

## Rollout cleanup: `figma-rollout-3-cleanup`

The cleanup retires the activation compatibility contracts. Completed items
are recorded below; orphan-slice auditing remains explicitly deferred.

### Cache-retirement gates

The maintainer confirmed these gates on 2026-11-23 before the remaining
compatibility code was removed. This records that confirmation, not an
independent production audit. Detailed deployment timestamps and invalidation
records are not included in this document.

- [x] Preparation and activation propagation, including the prepared APIs.
- [x] Retirement of relevant browser and CDN responses, including freshness
  and stale-serving windows under the policies that applied to older assets.
- [x] Open-tab retirement and rollback support for older consumers.

### Cache-gated removals

| Location | Completed cleanup |
| --- | --- |
| `scripts/utils/authored-status.js` and `authored-status-cell.js` | Removed the descriptor-only module and transitional note. The live `authored-status-cell.js` URL and cell-node contract remain unchanged. |
| `scripts/utils/component-slice.js`, `figma.js`, and `go-to-impl.js` | Replaced namespace-import compatibility bridges with named imports. |
| `scripts/utils/go-to-impl.js` | Removed the pathname overload of `resolveImplementation()` and its unused import. Context-based resolution remains. |
| `scripts/utils/figma.js` and `test/blocks/figma.test.js` | Removed root-level S2 Web reads and implicit source/optional-file compatibility. Tests cover explicit source/file identity and rejection of missing identity. |
| `deps/build-status-index.js` | Stopped emitting root-level `figmaPageId`. Active slices match the current generator; platform references are preserved. |
| `test/blocks/cache-rollout.test.js` and `test/rollout-fixtures/{component-path,component-slice}.js` | Removed the transition suite and both frozen provider fixtures. Permanent helper/block suites retain current-contract coverage. |
| `test/extractions/cache-rollout.node.test.js` | Removed legacy-output coverage. Permanent extraction suites retain shared-web/native isolation coverage. |
| `test/extractions/build-status-index.node.test.js` and `figma-resolution.node.test.js` | Assert that slices have no root-level `figmaPageId` while preserving platform-specific reference assertions. |

`fetchComponentSlice()` and `implAndSlugFromPath()` still have live consumers.
They are not removal candidates merely because older consumers also use them.

### Other cleanup

- [x] In `deps/build-status-index.js`, remove the unused `roster` parameter
  from `buildComponentSlices()`, obsolete third arguments at callers, and the
  always-empty slice-warning return and caller/test plumbing.
- [x] In `deps/figma/resolve-components.js`, remove two-field legacy roster
  normalization after migrating old roster fixtures to explicit source,
  platform, and file identities. Update the legacy acceptance test in
  `test/extractions/figma-resolution.node.test.js` and remove the exception
  documented in `deps/figma/README.md`.
- [ ] **Deferred to separate orphan-JSON work:** Audit retained `deps/status/` files against generated slice names and
  live component and pattern routes. `writeComponentSlices()` does not prune.
  Absence from the current index alone does not establish that a slice is
  unused. Remove only verified unused files after the relevant cache gates.
- [x] In `blocks/component-status/component-status.js`, prevent source-only
  wrappers and sections from reserving padding or dividers after authored
  statuses move into the hero. Preserve source markers needed for authoring
  order, including late fragments, and retain sections with other content.
  Add regression coverage for source-only sections and sections with
  remaining content, without weakening ordering or audience coverage.
- [x] Reconcile the owning documentation and remove completed
  `TODO(cache-rollout)` annotations. The deferred orphan audit remains tracked
  here and at `writeComponentSlices()`.

Source-only containers remain in the DOM to preserve ordering markers. They
reserve no padding or dividers after their authored statuses move into the
hero. Containers with other content stay visible; late content restores
previously empty containers without changing status order or audience classes.

## Operations and verification

Discovery and status generation are separate steps. Review the roster, index,
slices, and implementation-name map together. Do not hand-edit generated
outputs.

[Figma discovery](../../../deps/figma/README.md) documents authentication,
refresh commands, failure handling, and verification. The
[`validate-figma-discovery.yml`](../../../.github/workflows/validate-figma-discovery.yml)
workflow runs daily at 08:15 UTC and supports manual dispatch. It uses
default-branch code, rebuilds the index, and reports changes without committing,
pushing, or opening a pull request.

Use the maintained contracts for field definitions and authoring rules:

- [Component data contract](../../../deps/docs/DATA-CONTRACT.md)
- [Status and alias files](../../../deps/docs/STATUS-FILES.md)
- [Dependency workflows](../../../docs/DEPS.md)
- [Test commands](../../../docs/TESTS.md)
