# React Spectrum component properties

Extracts component prop metadata from [@react-spectrum/s2](https://www.npmjs.com/package/@react-spectrum/s2) and stores it as per-component JSON files in `data/`.

## How it works

S2 publishes compiled TypeScript declaration files at `@react-spectrum/s2/dist/types/src/{Component}.d.ts`. Two scripts work together, backed by a small shared engine:

| Script | Role |
| ------ | ---- |
| **`discover-components.js`** | Scans published S2 types on unpkg and regenerates `components.json` — for each exported component, just its primary props interface name and (when it differs) source file. S2 has no CEM-style index, so discovery replaces a hand-maintained component list. |
| **`extract-props.js`** | Reads `components.json`; for each component, crawls its `.d.ts` file's real import graph and asks the TypeScript compiler for the named interface's fully resolved, transitively-inherited property set — no manual per-hop merging. |
| **`extract-doc-status.js`** | Resolves `alpha` / `beta` / `rc` / `stable` from [react-spectrum.adobe.com](https://react-spectrum.adobe.com) via `fetchComponentDocStatus` (used by `extract-props.js`; runnable alone for debugging). |
| **`cdn-resolve.js`** | Pure module-specifier → CDN URL resolution (relative imports, and known packages' real `package.json` "exports" map). No network, no filesystem. |
| **`ts-cdn-host.js`** | The extraction engine: asynchronously crawls a component's import graph into an in-memory file cache, then builds a fully synchronous `ts.CompilerHost` from that cache and a real `ts.Program`/`TypeChecker` — all without installing `@react-spectrum/s2`, `react-aria-components`, or any of their dependencies as real npm packages. |

Unlike SWC's Custom Elements Manifest, React Spectrum has no structured metadata format of its own — but props are resolved via the real TypeScript compiler API against CDN-fetched `.d.ts` content, not regex, so inheritance (including `Omit<>`/`Pick<>` and multi-hop `extends` chains) resolves the same way a real TypeScript consumer of these packages would see it.

### Parallel with SWC extraction

Each package writes one JSON file per component. RSP files use `{ "status": "stable", "props": [ ... ] }` when a doc page exists (`status` omitted when there is no published S2 doc for that name). SWC files remain a top-level prop array.

The per-component pipeline in `extract-props.js` is:

1. **`extractComponentProps`** — crawls the component's `.d.ts` import graph (`ts-cdn-host.js`'s `crawl`), builds a real `ts.Program` over it (`buildProgram`), finds the named interface (`findInterfaceDeclaration`), and resolves its properties (`extractPropsFromType`, using `checker.getPropertiesOfType()`).
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

`checker.getPropertiesOfType()` on the component's primary props interface returns everything the real TypeScript type resolves to — every `extends`/`Omit`/`Pick` level, however many hops deep, exactly as a real consumer's editor/compiler would see it. No separate `includes`/`extends` bookkeeping is needed; `components.json` only records which interface (and, when it differs, which file) to inspect. Rows carry `inheritedFrom` set to whichever interface actually declares that property, omitted when it's the primary interface itself.

`className`, `UNSAFE_className`, and `UNSAFE_style` are excluded from output (`EXCLUDED_PROPERTIES` in `extract-props.js`) — S2 documents styling via the `styles` prop/`style()` macro instead, and treats these as internal escape hatches, not part of the documented public API.

### Display in Spectrum Hub

The table block (`blocks/table/table.js`) hides rows whose `inheritedFrom` is **`StyleProps`**, since layout macro props apply to every S2 component. Other `inheritedFrom` values (e.g. `ButtonStyleProps`, `ButtonProps`) still appear in the table.

## Running the extraction

```sh
node deps/rsp/discover-components.js   # refresh components.json from published S2 types
node deps/rsp/extract-props.js
npm run test:extractions
```

**In GitHub Actions:** The `Update React Spectrum Component Properties` workflow runs both scripts daily at 7am UTC (and on manual dispatch), then commits `components.json` and `data/`. Everything is published on unpkg, so no manual type checkout is required (unlike SWC, which waits on a published CEM).

A full-catalog run (~120 components) takes several minutes — `extract-props.js` shares one file cache across all components in a run (`ts-cdn-host.js`'s `crawl`'s `cache` option), so the ~250+ base files common to every component (react-aria-components, react-aria, react-stately, @react-types/shared, @internationalized/date, @types/react) are fetched once, not once per component.

## `components.json` schema

Discovery writes every entry automatically. You can edit the file by hand for a one-off fix, but **any hand edit will be silently overwritten the next time `discover-components.js` runs** (it always writes a fresh file, not a merge) — if a fix needs to survive, it has to change what discovery itself derives, not just the output file.

| Field | Required | Description |
| ----- | -------- | ----------- |
| **Key** | yes | Output filename (`Button` → `data/Button.json`). |
| **`interface`** | yes | Primary exported props interface (e.g. `ButtonProps`, not legacy `SpectrumButtonProps`). |
| **`file`** | no | `.d.ts` basename when it differs from the key (e.g. `Tab` uses `Tabs.d.ts`, `LinkButton` uses `Button.d.ts`). |

Example (discover output is similar):

```json
{
  "Button": {
    "interface": "ButtonProps"
  },
  "LinkButton": {
    "interface": "LinkButtonProps",
    "file": "Button"
  },
  "Tab": {
    "interface": "TabProps",
    "file": "Tabs"
  }
}
```

## Adding or fixing a component

**Preferred:** Run discovery and re-extract. New S2 exports are picked up when they appear as `export declare const ComponentName` in a top-level `.d.ts` file.

```sh
node deps/rsp/discover-components.js
node deps/rsp/extract-props.js
```

**When discovery misses a component** (common cases):

- Export is `export declare function` instead of `export declare const` (e.g. some tab primitives).
- Interface name does not match `ComponentProps` or `S2SpectrumComponentProps`.
- Props live only in a file discover skips (`SKIP_FILES` in `discover-components.js`).

Add or adjust an entry in `components.json` by hand, then rerun `extract-props.js`. Browse types on [unpkg](https://unpkg.com/@react-spectrum/s2/dist/types/src/). Remember: a hand edit to `components.json` won't survive the next `discover-components.js` run unless discovery itself is taught to derive it (see the schema section above).

Spot-check output against [S2 component docs](https://react-spectrum.adobe.com/beta/s2/index.html) (e.g. `size` on Button and ActionButton).

## The CDN-crawling engine (`cdn-resolve.js` + `ts-cdn-host.js`)

`ts.CompilerHost`'s `getSourceFile`/`readFile`/`fileExists` are synchronous, but fetching `.d.ts` files from a CDN is async, and the import graph isn't known upfront. This works in two phases:

1. **`crawl()`** (async) — starting from a component's own `.d.ts`, fetches it, does a cheap regex scan of its `import`/`export ... from` specifiers (not a real parse — that happens in phase 2), resolves each to another file via `cdn-resolve.js`, and recurses until nothing new is discovered. Returns `Map<canonicalPath, sourceText | null>` (`null` records "fetched, but 404'd" so a failure isn't silently retried or confused with "never reached").
2. **`buildProgram()`** (sync from here on) — builds a `ts.CompilerHost` backed entirely by that now-fully-populated cache, then a real `ts.Program`/`TypeChecker`.

**Known packages** (`cdn-resolve.js`'s `PACKAGE_BASES`): `react-aria-components`, `react-aria`, `react-stately` (all follow the same `package.json` "exports"-map indirection — a subpath like `react-aria-components/Tree` resolves through `dist/types/exports/Tree.d.ts`, a thin re-export wrapper, not a guessed `dist/types/src/Tree.d.ts` path, which isn't always the real filename), `@react-types/shared` and `@internationalized/date` (direct `src`/`dist/types/src`, no exports-map indirection), and `@types/react` (DefinitelyTyped — `react` itself ships no `.d.ts` of its own; needed because several RAC interfaces use `React.JSX.IntrinsicElements` in a generic constraint position). None of these are real npm dependencies of this repo — only `typescript` itself is (it's the compiler tool, not one of the packages under analysis).

**Standard-library types** (`Array`, `Promise`, `Omit`, `Pick`, `Record`, ...) come from the **locally installed** `typescript` package's `lib/lib.*.d.ts` files, not the CDN — they're TypeScript's own ambient globals, and reading them from disk avoids fetching megabytes of unrelated content while guaranteeing `Omit<>`/`Pick<>` resolve correctly (the previous regex pipeline couldn't handle these at all — it just skipped the token name).

## Known limitations

**`typescript` must stay on the 5.x line.** As of mid-2026, npm's `typescript` `latest` tag points at a different, native/Go-ported compiler whose default export has no classic `createProgram`/`TypeChecker` API at all (2 exports total, vs. 2000+ on the classic line). `package.json` pins `^5.9.3` deliberately — don't let this float to a `^6`/`latest` range without first confirming the classic API still exists there.

**`Omit<T, K>` collapses to zero properties if `T` has any unresolved heritage member anywhere in its chain** — not just the unresolved piece, the whole result. This is why `cdn-resolve.js`'s known-package list exists at all; if S2/RAC add a dependency on a new package this pipeline doesn't yet crawl, expect large, not small, prop losses on whatever components reach it — a missing single prop is unlikely, a missing *cluster* (e.g. every overlay-trigger prop on every popover-based component at once) is the actual failure signature to watch for.

**Discovery coverage** — Only `export declare const` components in published `.d.ts` files are registered. Function-exported components need manual `components.json` entries (which, per the schema note above, only survive if discovery itself is updated to derive them).

**Deprecated props** — S2 does not currently author `@deprecated` JSDoc tags (verified across `@react-spectrum/s2/src`, including Button), so none reach the extracted `.d.ts`. If S2 adds them later they are extracted as ordinary prop rows (`readJsDoc` in `extract-props.js` only reads the description and `@default` — `@deprecated` itself is dropped), and there is no display-layer filter. See [../docs/DATA-CONTRACT.md](../docs/DATA-CONTRACT.md).

**Performance** — `discover-components.js` fetches component list files sequentially (~120 components). `extract-props.js` shares one file cache across the whole run (see "Running the extraction" above), so a full run takes minutes, not the many-times-longer it would take fetching every base file once per component.
