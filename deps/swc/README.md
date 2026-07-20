# Spectrum Web Components properties

Extracts component property metadata from [Spectrum Web Components](https://github.com/adobe/spectrum-web-components) 2nd-gen and stores it as per-component JSON files in `data/`.

## How it works

2nd-gen SWC publishes one Custom Elements Manifest (CEM) for all components. Tag names use the `swc-*` prefix (for example `swc-button`, not 1st-gen `sp-*`). The extractor reads that manifest once, then filters declarations by `tagName`.

The CEM is published with `@adobe/spectrum-wc` at `dist/custom-elements.json`, so the extractor fetches it from a CDN (unpkg or jsDelivr) by default. A locally built CEM path can still be passed as an argument to manually regenerate `data/` — for example when validating an unreleased SWC change.

| Script | Role |
| ------ | ---- |
| **`extract-cem-components.js`** | Reads a local CEM path when provided, otherwise fetches `@adobe/spectrum-wc` `custom-elements.json` (with CDN fallbacks). Formats each declaration's `attributes` array, including inherited attributes already present on the component in the CEM. |
| **`extract-cem-mixins.js`** | Legacy helper that builds `data/swc-mixins.json` from mixin/base class declarations. Normal extraction does not use this file — inherited attributes are already on each component declaration in 2nd-gen CEM. |
| **`discover-components.js`** | Regenerates `components.json` from the CEM: enumerates every declaration with a `tagName` (dedupe + sort, no status filter). `components.json` is a generated artifact — do not hand-edit it. |

Unlike RSP, SWC has a structured CEM. There is no TypeScript parser in the component path — output comes directly from manifest `attributes` entries.

### Parallel with RSP extraction

Each package builds one JSON array per component. The per-component step in `extract-cem-components.js` is **`collectComponentData`** (CEM + `tagName` → rows with `attribute`, `property`, and so on). The RSP counterpart in `deps/rsp/extract-props.js` is **`collectComponentProps`** (TypeScript source + `components.json` config → rows with `property`, `type`, and so on). Names differ because CEM uses attributes and RSP uses React/TS props; the role is the same.

### What appears in each component file

Each row in `data/swc-{tag}.json` maps a CEM attribute to:

- `attribute`, `property`, `type`, optional `default`, `description`
- `inheritedFrom` when the CEM marks the attribute as inherited from a base class or mixin (for example `SizedMixin`, `ButtonBase`)
- `status` and `since` from the component declaration (`@status`, `@since` in source)

### Component metadata (`status`, `since`)

- **`status`** — Lifecycle and visibility from `@status` (`preview`, `deprecated`, `internal`). Components without `status` are implicitly stable and public. Rows keep this field for future use; the site's component options table does not render it as a column today.
- **`since`** — Version from `@since` (for example `0.0.1` on early components, `2.0.0` after the convention was standardized).
- **npm dist-tags** (`latest`, `next`, etc.) describe the package release channel, not per-component lifecycle. Use `status` for component-level visibility in docs.

### Display in Spectrum Hub

The table block (`blocks/table/table.js`) hides **`status`** and **`since`** columns (`EXCLUDED_COLUMNS`) so the API table stays prop-focused. Rows with `inheritedFrom` (for example `ButtonBase`, `SizedMixin`) are still shown — unlike RSP, there is no blanket filter for mixin names.

## Running the extraction

**Published package CEM (default):**

```sh
node deps/swc/extract-cem-components.js
npm run test:extractions
```

This fetches the CEM from the CDN with no arguments. The package is currently pinned to a snapshot (`@adobe/spectrum-wc@0.4.0-snapshot-test.20260717104105`) in `extract-cem-components.js`; drop the pin once a stable release ships `dist/custom-elements.json`.

**Manual CEM regeneration (local build):**

Use this only to regenerate `data/` from an unreleased SWC change, by passing a locally built CEM path:

```sh
cd ../spectrum-web-components/2nd-gen/packages/swc
yarn analyze
cd ../../../../spectrum-hub
node deps/swc/extract-cem-components.js ../spectrum-web-components/2nd-gen/packages/swc/.storybook/custom-elements.json
npm run test:extractions
```

**In GitHub Actions:** The `Update Component Properties` workflow runs on a daily schedule and on manual dispatch. It first regenerates the allow list (`discover-components.js`), then extracts properties (`extract-cem-components.js`), both against the published CEM from the CDN, and commits any changes to `components.json` and `data/`. Newly published components flow in automatically.

Extraction tests live under `test/extractions/` and run with the repo's Node test runner (`npm run test:extractions`), which is also part of `npm test` in CI.

## `components.json` schema

`components.json` is a **generated artifact** — run `node deps/swc/discover-components.js` to regenerate it from the CEM rather than editing it by hand. It is a JSON array of custom element tag names, one per `tagName` declaration in the CEM (every tag is included, regardless of `status`).

```json
[
  "swc-badge",
  "swc-button",
  "swc-divider"
]
```

Entries are component tag names matched against declarations in the single `@adobe/spectrum-wc` CEM. Output files are named `{tag}.json` (for example `data/swc-button.json`).

There is no per-component npm package suffix (1st-gen used `"sp-button": "button"` for CDN paths). Everything resolves against the single `@adobe/spectrum-wc` manifest.

## Adding or fixing a component

**Preferred:** Run `node deps/swc/discover-components.js` to regenerate `components.json` from the published CEM, then rerun `extract-cem-components.js`. New `swc-*` tags are picked up automatically — no hand-editing. To validate a tag not yet in a published release, rebuild the CEM in the SWC repo (`yarn analyze`) and pass the local manifest path to both scripts.

**When the tag is missing from output:**

- Tag is not listed in `components.json`.
- Tag is not present in the CEM (component not analyzed or wrong `@customElement` name).
- CEM was stale — rerun `yarn analyze` in `2nd-gen/packages/swc`.

Spot-check JSON against [2nd-gen Storybook](https://github.com/adobe/spectrum-web-components/tree/main/2nd-gen/packages/swc) or component docs (for example confirm `size` on `swc-button`).

**Missing from a release:** If a `swc-*` tag in `components.json` is not yet in the published package, the CDN CEM will not contain it. Validate it with a local `yarn analyze` build until it ships.

## Updating mixins (legacy)

**This is a manual engineering maintenance task.** Unlike `extract-cem-components.js`, mixin extraction cannot be automated — the mixin class declarations live inside the SWC monorepo and are never published to npm or any CDN. There is no automated signal when they go out of date.

`data/swc-mixins.json` should be refreshed when:

- A SWC release notes changes to shared base classes or mixins (`Focusable`, `LikeAnchor`, `SizedMixin`, etc.)
- A newly added component is missing expected inherited properties in its output JSON
- SWC bumps a major version

```sh
cd ../spectrum-web-components/2nd-gen/packages/swc
yarn analyze
cd ../../../../spectrum-hub
node deps/swc/extract-cem-mixins.js ../spectrum-web-components/2nd-gen/packages/swc/.storybook/custom-elements.json
```

This overwrites `data/swc-mixins.json`. Commit the result and re-run `extract-cem-components.js` locally to verify the component output files look correct before pushing.

## Published CEM location

`extract-cem-components.js` tries these URLs until one succeeds:

- `https://unpkg.com/@adobe/spectrum-wc@<version>/dist/custom-elements.json`
- Same path on jsDelivr

The package ships `dist/custom-elements.json` (`files: ["dist/"]`, `customElements: "dist/custom-elements.json"`). The `<version>` is currently pinned to a snapshot in the script; remove the pin once a stable release includes the CEM.

## Future work

- **TODO: Remove the snapshot pin** — Drop the pinned `@0.4.0-snapshot-test.*` version in `extract-cem-components.js` once a stable `@adobe/spectrum-wc` release ships `dist/custom-elements.json`.
- Render `status` in docs if product needs component lifecycle labels in the table.

## Known limitations

**Snapshot pin** — The published CEM is currently only available on a snapshot tag, so `extract-cem-components.js` pins that exact version. CDN runs will break if that snapshot is unpublished before the pin moves to a stable release. Components not yet in that snapshot require a local `yarn analyze` build.

**Generated allow list** — `components.json` is regenerated by `discover-components.js` from the CEM. It lists every `tagName` with no status filter, so `internal` primitives (for example `swc-close-button`, `swc-popover`) are included alongside public components.

**CEM fidelity** — Output matches what the analyzer emits. If inherited attributes are missing on a declaration, fix analyzer globs or SWC source — do not expect 1st-gen-style `sp-mixins.json` merging during extraction.

**Duplicate tag names** — If multiple declarations share a `tagName`, the extractor uses the first match in module order.

**Tests** — `test/extractions/extract-cem-components.node.test.js` and `extract-cem-mixins.node.test.js` cover formatting and mixin collection helpers; they do not fetch live CDNs.