# React Spectrum component properties

Extracts component prop metadata from [@react-spectrum/s2](https://www.npmjs.com/package/@react-spectrum/s2) and stores it as per-component JSON files in `data/`.

## How it works

S2 publishes compiled TypeScript declaration files at `@react-spectrum/s2/dist/types/src/{Component}.d.ts`. Three scripts work together:

| Script | Role |
| ------ | ---- |
| **`discover-components.js`** | Scans published S2 types on unpkg and regenerates `components.json` (allow list, `includes`, cross-file `includeFiles`, and `extends`). S2 has no CEM-style index, so discovery replaces a hand-maintained component list. |
| **`extract-base-props.js`** | Builds shared base types in `data/rsp-base-props.json` from `@react-types/shared`, all of `react-aria-components`, and S2 `style-utils.d.ts`. |
| **`extract-props.js`** | Reads `components.json`, fetches each component (and any `includeFiles`) `.d.ts`, parses props, merges configured `includes` and `extends`, and attaches doc **status** from the published S2 site. |
| **`extract-doc-status.js`** | Resolves `alpha` / `beta` / `rc` / `stable` from [react-spectrum.adobe.com](https://react-spectrum.adobe.com) via `fetchComponentDocStatus` (used by `extract-props.js`; runnable alone for debugging). |

Unlike SWC's Custom Elements Manifest, React Spectrum has no structured metadata format — properties are parsed from TypeScript source with known regex limitations (see [Known limitations](#known-limitations)).

### Parallel with SWC extraction

Each package writes one JSON file per component. RSP files use `{ "status": "stable", "props": [ ... ] }` when a doc page exists (`status` omitted when there is no published S2 doc for that name). SWC files remain a top-level prop array.

The per-component pipeline in `extract-props.js` is:

1. **`collectComponentProps`** — TypeScript source + `components.json` config → prop rows.
2. **`fetchComponentDocStatus`** — doc maturity from the S2 docs site (see `extract-doc-status.js`).
3. **`buildComponentData(props, status)`** — wraps props and optional `status` for the JSON file.

The SWC counterpart in `deps/swc/extract-cem-components.js` is **`collectComponentData`** (CEM + `tagName` → rows with `attribute`, `property`, and so on). Names differ because CEM uses attributes and RSP uses React/TS props; the role is the same.

### Doc status (`status`)

Prerelease labels come from the **S2 documentation site**, not from `@react-spectrum/s2` types on unpkg. Authors set `export const version = 'rc'` in `packages/dev/s2-docs/pages/s2/*.mdx`; the live site renders that as a badge on `https://react-spectrum.adobe.com/{Component}.html`.

| Value | Meaning |
| ----- | ------- |
| `stable` | Doc page exists, no prerelease badge |
| `alpha` / `beta` / `rc` | Doc page shows a VersionBadge |
| *(field omitted)* | No published doc page for that component name (e.g. some sub-primitives) |

`extract-props.js` calls `fetchComponentDocStatus` once per component while extracting. To debug a single name: `node deps/rsp/extract-doc-status.js Button`.

**In Spectrum Hub UI**, use `scripts/utils/component-status.js`: `getComponentStatus(data)` reads RSP `status` from the extraction object; SWC flat arrays still use `since` / per-prop `internal` when CEM provides them. `getComponentProps(data)` returns prop rows for either shape (used by the table block).

### What gets merged into each component

1. **`includes`** — S2 often defines Spectrum-specific props in sibling interfaces in the same file (or a sibling import), such as `ButtonStyleProps` or `ActionButtonStyleProps`. Discover adds these from the primary interface header; `extract-props.js` merges them first and tags rows with `inheritedFrom`.
2. **Primary `interface`** — Props on the exported component interface (e.g. `ButtonProps`).
3. **`extends`** — Only **StyleProps** and **react-aria-components** types from `rsp-base-props.json`. Discover intentionally omits `DOMProps`, `SlotProps`, `GlobalDOMAttributes`, and similar utilities so per-component tables stay focused.

Inherited react-aria **`className`** is excluded from output (`EXCLUDED_PROPERTIES` in `extract-props.js`). S2 documents styling via the `styles` prop instead.

### Display in Spectrum Hub

The table block (`blocks/table/table.js`) hides rows whose `inheritedFrom` is **`StyleProps`**, since layout macro props apply to every S2 component. Other `inheritedFrom` values (e.g. `ButtonStyleProps`, `ButtonProps`) still appear in the table.

## Running the extraction

```sh
node deps/rsp/discover-components.js   # refresh components.json from published S2 types
node deps/rsp/extract-base-props.js
node deps/rsp/extract-props.js
npm run test:extractions
```

**In GitHub Actions:** The `Update React Spectrum Component Properties` workflow runs all three scripts daily at 7am UTC (and on manual dispatch), then commits `components.json` and `data/`. Everything is published on unpkg, so no manual type checkout is required (unlike SWC, which waits on a published CEM).

## `components.json` schema

Discovery writes most entries automatically. You can edit the file when a component needs a one-off fix.

| Field | Required | Description |
| ----- | -------- | ----------- |
| **Key** | yes | Output filename (`Button` → `data/Button.json`). |
| **`interface`** | yes | Primary exported props interface (e.g. `ButtonProps`, not legacy `SpectrumButtonProps`). |
| **`file`** | no | `.d.ts` basename when it differs from the key (e.g. `Tab` uses `Tabs.d.ts`, `LinkButton` uses `Button.d.ts`). |
| **`includes`** | no | Extra interfaces whose props are merged first (`ButtonStyleProps`, cross-file `ActionButtonStyleProps`, etc.). |
| **`includeFiles`** | no | Maps include names to `.d.ts` basenames when the interface is in another file (written by `discover-components.js`). |
| **`extends`** | no | Base type names from `rsp-base-props.json` — typically RAC types plus `StyleProps`. |

Example (discover output is similar):

```json
{
  "Button": {
    "interface": "ButtonProps",
    "includes": ["ButtonStyleProps"],
    "extends": ["ButtonProps", "StyleProps"]
  },
  "ActionButton": {
    "interface": "ActionButtonProps",
    "includes": ["ActionButtonStyleProps"],
    "extends": ["ButtonProps", "StyleProps"]
  },
  "ToggleButton": {
    "interface": "ToggleButtonProps",
    "includes": ["ActionButtonStyleProps"],
    "includeFiles": { "ActionButtonStyleProps": "ActionButton" },
    "extends": ["ToggleButtonProps", "StyleProps"]
  },
  "LinkButton": {
    "interface": "LinkButtonProps",
    "file": "Button",
    "includes": ["ButtonStyleProps"],
    "extends": ["ButtonProps", "StyleProps"]
  }
}
```

## Adding or fixing a component

**Preferred:** Run discovery and re-extract. New S2 exports are picked up when they appear as `export declare const ComponentName` in a top-level `.d.ts` file.

```sh
node deps/rsp/discover-components.js
node deps/rsp/extract-base-props.js
node deps/rsp/extract-props.js
```

**When discovery misses a component** (common cases):

- Export is `export declare function` instead of `export declare const` (e.g. some tab primitives).
- Interface name does not match `ComponentProps` or `S2SpectrumComponentProps`.
- Props live only in a file discover skips (`SKIP_FILES` in `discover-components.js`).

Add or adjust an entry in `components.json` by hand, then rerun `extract-props.js` (and `extract-base-props.js` if you need new RAC types in the catalog). Browse types on [unpkg](https://unpkg.com/@react-spectrum/s2/dist/types/src/).

Spot-check output against [S2 component docs](https://react-spectrum.adobe.com/beta/s2/index.html) (e.g. `size` on Button and ActionButton).

## Base props catalog (`rsp-base-props.json`)

`extract-base-props.js` auto-discovers types — there is no manual file list to maintain:

- **`@react-types/shared`** — all `.d.ts` files via unpkg `?meta`
- **`react-aria-components`** — all `.d.ts` under `dist/types/src/` via `?meta`
- **`@react-spectrum/s2`** — `style-utils.d.ts` for S2 `StyleProps` and related layout types

Fetches run in parallel per package. If a CDN request fails, the script logs a warning and continues so a partial catalog is still written.

When upstream adds new RAC interfaces, rerun `extract-base-props.js` before `extract-props.js` so `extends` names resolve.

## Known limitations

**Manual header token lists** — `discover-components.js` (`IGNORE_EXTENDS`) and `extract-props.js` (`extractExtends` → `ignored`) each keep a hand-edited set of TypeScript utility and shared type names to skip when reading interface headers. They are not generated from the compiler. If S2 introduces new tokens in `extends` clauses, both lists may need updates; updating only one can cause discovery and `extractExtends` tests to disagree. Production extraction follows `extends` in `components.json` from discovery, so discovery’s list is the one that matters for CI.

**Parser scope** — `parseProps` uses a single-line regex and may skip multi-line unions, generics, and function types. Spot-check JSON against S2 docs.

**`Omit<>` and prop exclusions** — `extends` lists what to merge in; props removed via `Omit<RACButtonProps, 'className' | …>` are not subtracted from inherited output. Spot-check when upstream changes `Omit` lists.

**Name collisions** — S2 `ButtonProps` (component API) and `react-aria-components` `ButtonProps` (RAC base) share a name. Component config uses RAC `ButtonProps` in `extends` for inherited press/focus props; the S2 interface body supplies `children`, and `includes` supplies Spectrum variants.

**Discovery coverage** — Only `export declare const` components in published `.d.ts` files are registered. Function-exported components need manual `components.json` entries.

**Deprecated props** — Still extracted if present in `.d.ts` (e.g. deprecated `isQuiet` on Button). No display-layer filter yet.

**Performance** — `discover-components.js` and `extract-props.js` fetch types sequentially (~90+ components). `extract-base-props.js` parallelizes per-file fetches.
