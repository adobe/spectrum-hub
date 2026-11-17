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
together. References live inside the platform's `figma` cell, not at slice
level. Native cells contain Figma only and do not imply native code support.
The combined status table uses only components with web cells.

Both Design widgets use `getFigmaLink(pathname, componentData)` in
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
