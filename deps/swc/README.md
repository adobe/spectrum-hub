# Spectrum Web Components properties

Extracts component property metadata from [Spectrum Web Components](https://github.com/adobe/spectrum-web-components) 2nd-gen and stores it as per-component JSON files in `data/`.

What the playground does with these rows, and the naming rules every lookup is keyed on, is documented in [../docs/PLAYGROUND-CONTRACT.md](../docs/PLAYGROUND-CONTRACT.md).

## How it works

2nd-gen SWC publishes one Custom Elements Manifest (CEM) for all components. Tag names use the `swc-*` prefix (for example `swc-button`, not 1st-gen `sp-*`). The extractor reads that manifest once, then filters declarations by `tagName`.

The CEM is published with `@adobe/spectrum-wc` at `dist/custom-elements.json`, so the extractor fetches it from a CDN (unpkg or jsDelivr) by default. A locally built CEM path can still be passed as an argument to manually regenerate `data/` — for example when validating an unreleased SWC change.

| Script | Role |
| ------ | ---- |
| **`extract-cem-components.js`** | Reads a local CEM path when provided, otherwise fetches `@adobe/spectrum-wc` `custom-elements.json` (with CDN fallbacks). Formats each declaration's `attributes` array, including inherited attributes already present on the component in the CEM. |
| **`discover-components.js`** | Regenerates `components.json` from the CEM: maps every `tagName` (bare name, no `swc-` prefix) to the module subpath it ships from, derived from the declaration's module `path` (dedupe + sort, no status filter). `components.json` is a generated artifact — do not hand-edit it. |

Unlike RSP, SWC has a structured CEM. Attribute *names* come directly from manifest `attributes` entries, but their **types do not** — the CEM records unexpanded alias names and misdescribes types in three known ways, so `resolve-attribute-types.js` re-resolves each one through the real TypeScript compiler over CDN-fetched `.d.ts` files. See [Attribute type resolution](#attribute-type-resolution).

### Parallel with RSP extraction

Each package builds one JSON array per component. The per-component step in `extract-cem-components.js` is **`collectComponentData`** (CEM + `tagName` → rows with `attribute`, `property`, and so on). The RSP counterpart in `deps/rsp/extract-props.js` is **`collectComponentProps`** (TypeScript source + `components.json` config → rows with `property`, `type`, and so on). Names differ because CEM uses attributes and RSP uses React/TS props; the role is the same.

### What appears in each component file

Each row in `data/swc-{tag}.json` maps a CEM attribute to:

- `attribute`, `property`, optional `default`, `description`
- `type` — the resolved type as a display string. Human-readable only; **nothing may branch on it.** `blocks/table/table.js` renders it.
- `kind` — one of `enum`, `boolean`, `text`, `number`, `unknown`. Says what control the row can back.
- `values` — the selectable options as real JSON (numbers stay numbers), empty unless `kind` is `enum`. The playground builds pickers from this rather than parsing `type`.
- `inheritedFrom` when the CEM marks the attribute as inherited from a base class or mixin (for example `SizedMixin`, `ButtonBase`)
- `status` and `since` from the component declaration (`@status`, `@since` in source)

`kind` is `enum` if and only if `values` is non-empty; `test/extractions/swc-data-contract.node.test.js` enforces that over the committed catalog. `kind: "unknown"` draws no control and warns when an authored control depends on it. Consult the current catalog for types that could not be resolved.

### Attribute type resolution

`resolve-attribute-types.js` resolves each attribute's real type, trying three sources in order, most authoritative first:

1. the component's own `static readonly VALID_<MEMBER>S`
2. the direct superclass's declared member
3. the CEM-attributed declaring file (a mixin, or the component's own)

Rungs 1 and 2 exist because **the CEM misdescribes attribute types in three ways**, all confirmed against the published `2.0.0-beta.2` artifacts:

| | What the CEM says | Reality |
| --- | --- | --- |
| Unexpanded aliases | `"ButtonVariant"` | 45 of 158 attributes; needs a compiler to expand |
| Mixin-widened `size` | `ElementSize` (7 values) for 12 of 16 size-bearing components | None accepts all 7 — `SizedMixin` takes the real range as a runtime argument |
| JSDoc over declaration | `swc-status-light`'s `variant` as `string` | A 19-value union; a lazy `@property {string}` wins over the real declaration |

These rungs are compensation, not the fix — the manifest is wrong, and correcting it belongs upstream in Spectrum Web Components. Each rung becomes a no-op once that lands, so check the table above against a new release before assuming a rung is still earning its place.

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

This fetches the CEM from the `latest` distribution tag, resolves the concrete package version, and records it in `version.json`. The playground reads that committed version rather than independently floating on `latest`.

**Manual CEM regeneration (local build):**

To validate an unreleased SWC change, generate its CEM in the SWC repository and pass the same local manifest to discovery and extraction:

```sh
node deps/swc/discover-components.js /absolute/path/to/custom-elements.json
node deps/swc/extract-cem-components.js /absolute/path/to/custom-elements.json
npm run test:extractions
```

**In GitHub Actions:** The `Update Component Properties` workflow runs on a daily schedule and on manual dispatch. It first regenerates the allow list (`discover-components.js`), then extracts properties (`extract-cem-components.js`), both against the published CEM from the CDN, and commits any changes to `components.json` and `data/`. Newly published components flow in automatically.

Extraction tests live under `test/extractions/` and run with the repo's Node test runner (`npm run test:extractions`). It's one of several `test:*` scripts (alongside `test:indexer` and `test:links:unit`) that make up `npm test` in CI.

## `components.json` schema

`components.json` is a **generated artifact** — run `node deps/swc/discover-components.js` to regenerate it from the CEM rather than editing it by hand. It is a JSON object mapping each bare component name (tag without the `swc-` prefix) to the esm.sh module subpath it ships from, one entry per `tagName` declaration in the CEM (every tag is included, regardless of `status`).

```json
{
  "badge": "components/badge",
  "button": "components/button",
  "tab": "components/tabs",
  "tabs": "components/tabs",
  "suggestion-group": "patterns/ai-toolkit/suggestion"
}
```

It is the single source of truth for two things: **which tags exist** (the keys) and **where each tag's module lives** (the value). The subpath is the directory of the declaration's module `path` in the CEM, so it mirrors the upstream package layout — `components/<name>` for standard components, `patterns/<pattern>/<name>` for pattern members. Several tags can share one subpath when a module ships a whole family (`components/tabs` exports Tabs, Tab, TabPanel). The playground's `define-swc.js` imports this file to resolve which module to load for a given tag; the extractor reads its keys as the roster of tags to extract.

Extraction output files are named `{tag}.json` (for example `data/swc-button.json`). Everything resolves against the single `@adobe/spectrum-wc` manifest — there is no per-component npm package suffix (1st-gen used `"sp-button": "button"` for CDN paths).

### AI Toolkit status and documentation

The status builder includes published pattern members alongside ordinary components. `message-sources` and `response-status` are roster members even though their modules live under `patterns/ai-toolkit/`. An empty attribute array does not mean a discovered component is unavailable. Existing lifecycle and reviewed web-roster exclusions still apply.

Run `node deps/build-status-index.js` after refreshing the catalog or properties. The builder joins matching RSP and Figma resources on the canonical component; it does not create another SWC implementation for AI Toolkit.

The generated `docsSection` selects Storybook's `patterns-ai-toolkit` group. Documentation aliases handle shared or nested pages without changing the published tag or module path. See [STATUS-FILES.md](../docs/STATUS-FILES.md#docssection-which-swc-storybook-group-documents-it).

## Adding or fixing a component

**Preferred:** Run `node deps/swc/discover-components.js` to regenerate `components.json` from the published CEM, then rerun `extract-cem-components.js`. New `swc-*` tags are picked up automatically — no hand-editing. To validate a tag not yet in a published release, rebuild the CEM in the SWC repo (`yarn analyze`) and pass the local manifest path to both scripts.

**When the tag is missing from output:**

- Tag is not listed in `components.json`.
- Tag is not present in the CEM (component not analyzed or wrong `@customElement` name).
- CEM was stale. Rebuild the manifest using the upstream SWC repository's instructions.

Spot-check JSON against [SWC Storybook](https://spectrum-web-components.adobe.com/) or the published package declarations.

**Missing from a release:** If a `swc-*` tag in `components.json` is not yet in the published package, the CDN CEM will not contain it. Validate it with a local `yarn analyze` build until it ships.

## Published CEM location

`extract-cem-components.js` tries these URLs until one succeeds:

- `https://unpkg.com/@adobe/spectrum-wc@<version>/dist/custom-elements.json`
- Same path on jsDelivr

The package ships `dist/custom-elements.json` and exposes it through its `customElements` entry. The extractor requests `latest`; `version.json` records the concrete version used by the published extraction.

## Future work

- Render `status` in docs if product needs component lifecycle labels in the table.

## Known limitations

**Generated allow list:** `components.json` keys every published `tagName` with no status filter. The status builder separately excludes tags whose extraction resolves to `internal`, then applies reviewed roster exclusions. Do not infer lifecycle from a component's name. `../core/*` base-class declarations are skipped so a tag's subpath points at its published in-package module, not the core base.

**CEM fidelity** — Output matches what the analyzer emits. If inherited attributes are missing on a declaration, fix analyzer globs or SWC source — do not expect 1st-gen-style `sp-mixins.json` merging during extraction.

**Duplicate tag names** — If multiple declarations share a `tagName`, the extractor uses the first match in module order.

**Tests** — `extract-cem-components`, `resolve-attribute-types`,
`swc-locate-published-files`, and `swc-build-ts-checker` cover the pipeline with
mocked fetches (no live CDN). `data-contract` validates the committed catalog;
`build-status-index` covers published AI pattern membership and documentation metadata.
