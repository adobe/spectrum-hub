# Figma component roster

Discovers published component sets from the registered Spectrum libraries.
Discovery runs explicitly and atomically replaces `components.json`. It does
not update the status index or component slices.

## Source registry

[`scripts/utils/figma-sources.js`](../../scripts/utils/figma-sources.js) records
each source's ID, platform, file key, label, and URL name.

| Source ID | Platform | Library |
| --- | --- | --- |
| `s2-web` | `web` | S2 Web |
| `ai-toolkit` | `web` | Spectrum AI Toolkit |
| `s2-ios` | `ios` | S2 iOS |
| `s2-android` | `android` | S2 Android |

`fetch-figma-components.js` requests published `component_sets` and excludes
names starting with `.`. It does not enumerate standalone components,
arbitrary frames, or unpublished nodes.

`discover-components.js` validates all sources before publishing. Failed
requests, malformed identities, duplicate nodes, empty sources, or a source
shrinking below half its previous roster count leave the existing file
unchanged.

## Local authentication and discovery

Use a Figma [personal access token](https://developers.figma.com/docs/rest-api/personal-access-tokens/)
with [`library_content:read`](https://developers.figma.com/docs/rest-api/scopes/)
and access to every registered file. Scope alone does not grant file access.
The script sends the token in the `X-Figma-Token` header.

Set `FIGMA_TOKEN` through approved credential tooling, or use the repository's
ignored `.env` file. Do not include token values in commands, source, fixtures,
logs, or generated data. The script does not load `.env` automatically.

```sh
node --env-file=.env deps/figma/discover-components.js
```

Omit `--env-file=.env` when the variable is already exported.

This discovery layer introduces a platform-qualified roster. Keep the existing
checked-in roster until the matching status-builder and browser integration
lands. Do not feed the new roster to legacy consumers or commit its output
independently of that migration.

For authentication failures, check expiry, scope, and access to the named file.
For HTTP 429, wait for the applicable rate limit before retrying. Rotate or
revoke credentials through the approved credential owner.

## Authenticated GitHub Actions validation

The manually dispatched
[`Validate Figma discovery`](../../.github/workflows/validate-figma-discovery.yml)
workflow uses default-branch code, read-only repository permission, and
checkout without persisted credentials. It passes the repository secret
`FIGMA_TOKEN` only to discovery and reports roster changes without rebuilding
legacy status consumers. It does not commit, push, or upload API responses.

The workflow must exist on the default branch before dispatch is available.
A GitHub secret stores the credential but does not grant Figma file access.
Do not run contributor code with this secret.

## Roster contract and checks

Each row contains `source`, `platform`, `figmaFile`, `name`, and `figmaPageId`.
Identity is source plus node ID, not display name. `figmaPageId` is the
component-set node ID, not the canvas/page ID. Rows sort by platform, source,
name, then node ID.

```sh
node --test test/extractions/figma-*.node.test.js
```

These credential-free fixtures check validation and publication safety.
Only authenticated discovery proves live access and published node identities.
