# Figma component roster

Discovers published component sets from the registered Spectrum libraries.
Discovery atomically replaces `components.json`. It runs locally on demand and
in CI daily or on manual dispatch. The generated roster supplies
platform-specific Design statuses and links through
[`build-status-index.js`](../build-status-index.js).

## Source registry

[`scripts/utils/figma-sources.js`](../../scripts/utils/figma-sources.js) is the
shared registry for discovery and browser links:

| Source ID | Platform | Library |
| --- | --- | --- |
| `s2-web` | `web` | [S2 Web](https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web) |
| `ai-toolkit` | `web` | [Spectrum AI Toolkit](https://www.figma.com/design/3WdX799d7ptEVA6RuTESXs/Spectrum-AI-Toolkit) |
| `s2-ios` | `ios` | [S2 iOS](https://www.figma.com/design/OQExiy8bX0pRqee71eAWX6/S2---iOS) |
| `s2-android` | `android` | [S2 Android](https://www.figma.com/design/Yzbd4jgLTo6KhEPZKwv1WA/S2---Android) |

Each entry records its source ID, label, platform, file key, and URL name.
Adding a library starts here, not with another discovery script.

## Discovery and publication

| File | Role |
| --- | --- |
| `fetch-figma-components.js` | Requests one file's published `component_sets`, validates the response and entry identities, and excludes names starting with `.`. |
| `discover-components.js` | Fetches every registered source, validates per-source counts and duplicate node identities, sorts deterministically, and atomically replaces `components.json`. |
| `resolve-components.js` | Resolves source-qualified aliases and selects one design per platform/canonical component. Ambiguous or unmatched selections fail the index build. |

The [Figma endpoint](https://developers.figma.com/docs/rest-api/component-endpoints/#get-file-component-sets-endpoint)
returns **published component sets** from a library's main file. It does not
enumerate standalone components, arbitrary frames, or unpublished nodes.

Every configured source must return usable sets. Missing credentials, failed
requests, malformed responses, duplicate source/node identities, empty sources,
or a source shrinking below half its previous roster count prevent publication.
The existing roster remains unchanged. If a library has no published sets,
check publication before considering a separately approved document-tree
discovery mode. An empty result is not successful support for that library.

Atomic publication applies to `components.json`. Rebuilding the downstream
index and slices is a separate step.

## Local authentication and discovery

Use a Figma [personal access token](https://developers.figma.com/docs/rest-api/personal-access-tokens/)
with the [`library_content:read` scope](https://developers.figma.com/docs/rest-api/scopes/)
and access to **all registered files**. Scope alone does not grant file access.
The script sends the token in the `X-Figma-Token` header.

Set `FIGMA_TOKEN` through your approved credential tooling, or put it in the
repository's ignored `.env` file using a local editor. Do not paste token values
into commands, source files, fixtures, logs, or generated data.

With the project's Node.js version and an existing `.env`:

```sh
node --env-file=.env deps/figma/discover-components.js
node deps/build-status-index.js
```

If `FIGMA_TOKEN` is already exported, omit `--env-file=.env`. The script does not
load `.env` automatically.

Review the roster, index, slices, and generated implementation-name map together.
Discovery alone does not update component-page links. Commit generated changes
only after reviewing their source identities and selections.

For authentication failures, check expiry, scope, and access to the named file.
For HTTP 429, wait for the applicable rate limit to clear before retrying.
Rotate credentials before expiry and update both the local environment and any
Actions secret that uses them. Revoke a suspected exposed token immediately.
Persistent automation needs an approved credential owner. OAuth and plan access
tokens require their own integration; this script implements personal-token
authentication.

## Authenticated GitHub Actions validation

The [`Validate Figma discovery`](../../.github/workflows/validate-figma-discovery.yml)
workflow runs daily at 08:15 UTC and supports manual dispatch. It:

1. Rejects dispatches from a branch other than the repository's default branch.
2. Checks out default-branch code without persisting Git credentials.
3. Runs credential-free discovery/resolution tests.
4. Passes the repository secret `FIGMA_TOKEN` only to the discovery step.
5. Rebuilds the index and reports source counts and generated-file changes.

An authorized maintainer can add the secret under **Settings > Secrets and
variables > Actions**. The credential still needs the Figma scope and file access
described above. A GitHub secret stores a credential; it does not grant Figma
permissions.

The workflow must exist on the default branch before scheduling or manual dispatch is
available. Select that branch when running it. Use local discovery to validate
an unmerged feature branch initially. The workflow has read-only repository
permission, does not commit or push, and does not upload raw API responses. It
does not run contributor pull-request code with the secret.

## `components.json` schema

The generated array preserves every usable resource's identity:

```json
[
  {
    "source": "ai-toolkit",
    "platform": "web",
    "figmaFile": "3WdX799d7ptEVA6RuTESXs",
    "name": "Prompt field",
    "figmaPageId": "24045:20181"
  }
]
```

Identity is **source plus node ID**, not display name. Sort order is platform,
source ID, display name, then node ID. `figmaPageId` is the component-set node ID,
not the Figma canvas/page ID. Its historical field name remains for compatibility.
Legacy rows containing only `name` and `figmaPageId` are read as S2 Web only.

## Matching and selected references

`component-aliases.json` supports `figmaSources[sourceId][displayName]` for
source-qualified canonical names. Existing `figma[displayName]` aliases apply
only to S2 Web. Matching never crosses platforms.

When multiple designs match one canonical component on the same platform,
select explicitly in `status-overrides.json`. Every supplied selector must
match:

```json
{
  "MenuItem": {
    "ios": {
      "figma": {
        "status": "available",
        "figmaSource": "s2-ios",
        "figmaNodeId": "5890:12360",
        "note": "Use the iOS 26 Menu Elements design."
      }
    }
  }
}
```

`figmaPageSource` optionally selects an exact display name, including a different
canonical component's design. `figmaNodeId` selects a node; it is written to
generated output as `figmaPageId`. A selection neither renames nor removes raw
resources from the roster. No match or multiple remaining candidates is an
error, never a last-file-wins choice. A complete `figmaSource`, `figmaPageSource`,
and `figmaNodeId` override can also reference a node outside the discovered roster.
The source must match the platform. This does not change discovery.

The selected platform Figma cell carries `figmaSource`, `figmaFile`, and
`figmaPageId` in both the index and its component slice. Web component routes read
`web.figma`; `/mobile/ios/components/<slug>` and
`/mobile/android/components/<slug>` read their own platform's cell. Native Design
statuses never borrow a web reference. Native Code documentation links are
resolved separately and do not imply code availability. The existing combined
status table remains web-only.

Shared `/mobile/components/<slug>` pages show separate iOS and Android Design
pills and Figma actions for the native references present in the slice.
A missing native design shows a non-linked **Design not available** pill for
that platform, without a Figma action.
Mobile DA aliases in `scripts/utils/component-path.js` resolve each platform's
canonical component. For example, `/mobile/components/buttons` reads
`deps/status/button.json`, not a DA-named `buttons.json`. These aliases do not
change Figma discovery or generated filenames.

Figma presence maps to Available unless overridden. Names containing
"Deprecated" do not automatically change lifecycle status.

## Secondary guidance and verification

`figma-secondary-status.json` is authored web-only guidance, not a discovery
roster or a source selector. See [STATUS-FILES.md](../docs/STATUS-FILES.md) for
the complete authoring map.

Credential-free checks:

```sh
node --test test/extractions/figma-*.node.test.js test/extractions/build-status-index.node.test.js
```

These fixtures prove validation, failure safety, matching, and output contracts.
Only authenticated discovery proves access to the live files, their current
published sets, and their real names and node IDs.
