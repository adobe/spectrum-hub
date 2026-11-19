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
together. The platform's `figma` cell is authoritative. During activation,
slices also mirror selected S2 Web node IDs into a root-level `figmaPageId`
for cached readers. AI Toolkit and native references never use that legacy
field. Native availability cells describe Figma only; platform-level
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

Find the corresponding source annotations with `TODO(cache-rollout)`. This
checklist tracks pending work, not permission to remove compatibility code
during activation.

### Cache-retirement gates

- [ ] Record when preparation and activation reached production and confirm
  propagation of the prepared APIs.
- [ ] Verify expiry or invalidation of relevant browser and CDN entries,
  including freshness and stale-serving windows under the policies that
  applied when older assets were cached. One current response or an arbitrary
  waiting period is not sufficient evidence.
- [ ] Define how to retire open tabs with already-loaded module graphs and
  which older consumers a rollback must still support. Do not rely on an
  asset query string unless its cache-key behavior has been verified.

### Cache-gated removals

| Location | Cleanup |
| --- | --- |
| `scripts/utils/authored-status.js` and `authored-status-cell.js` | Remove the descriptor-only module after its cached consumers retire. Keep the current cell-node contract and the `authored-status-cell.js` URL; do not rename the live helper back to the old URL. Remove its transitional note after retirement. |
| `scripts/utils/component-slice.js`, `figma.js`, and `go-to-impl.js` | Replace namespace-import compatibility bridges with named imports once the corresponding prepared providers are guaranteed. |
| `scripts/utils/go-to-impl.js` | Remove the pathname overload of `resolveImplementation()` and its now-unused import in this file. Keep context-based resolution. |
| `scripts/utils/figma.js` and `test/blocks/figma.test.js` | Remove root-level S2 Web reads and the implicit source/optional-file compatibility in `figmaNodeUrl()`. Update legacy-call assertions to the explicit source/file contract. |
| `deps/build-status-index.js` | Stop emitting root-level `figmaPageId`, then regenerate and review the index, active slices, and implementation-name map using the documented generation workflow. Do not hand-edit generated files. |
| `test/blocks/cache-rollout.test.js` and `test/rollout-fixtures/{component-path,component-slice}.js` | Remove the transition suite and both frozen provider fixtures together. Keep permanent current-contract coverage in the owning block/helper suites. |
| `test/extractions/cache-rollout.node.test.js` | Remove legacy-output coverage with the retired field. Preserve shared-web/native isolation coverage in the permanent extraction suites. |
| `test/extractions/build-status-index.node.test.js` and `figma-resolution.node.test.js` | Replace transitional root-field assertions with assertions that slices have no root-level `figmaPageId`. Keep platform-specific reference assertions. |

`fetchComponentSlice()` and `implAndSlugFromPath()` still have live consumers.
They are not removal candidates merely because older consumers also use them.

### Other cleanup

- [ ] In `deps/build-status-index.js`, remove the unused `roster` parameter
  from `buildComponentSlices()`, obsolete third arguments at callers, and the
  always-empty slice-warning return and caller/test plumbing.
- [ ] In `deps/figma/resolve-components.js`, remove two-field legacy roster
  normalization after migrating old roster fixtures to explicit source,
  platform, and file identities. Update the legacy acceptance test in
  `test/extractions/figma-resolution.node.test.js` and remove the exception
  documented in `deps/figma/README.md`.
- [ ] Audit retained `deps/status/` files against generated slice names and
  live component and pattern routes. `writeComponentSlices()` does not prune.
  Absence from the current index alone does not establish that a slice is
  unused. Remove only verified unused files after the relevant cache gates.
- [ ] In `blocks/component-status/component-status.js`, prevent source-only
  wrappers and sections from reserving padding or dividers after authored
  statuses move into the hero. Preserve source markers needed for authoring
  order, including late fragments, and retain sections with other content.
  Add regression coverage for source-only sections and sections with
  remaining content, without weakening ordering or audience coverage.
- [ ] Reconcile the owning documentation and remove completed
  `TODO(cache-rollout)` annotations. Keep unresolved items tracked.

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
