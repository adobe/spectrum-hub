# React Spectrum component properties

Generates the per-component prop data Spectrum Hub renders in API tables and the component playground, from two published packages: `@react-spectrum/s2` and `@react-spectrum/ai`.

Both feed the same roster and the same `rsp` status column — the AI package is a separate npm package, not a separate implementation. An entry records which package it came from in its `package` field, and three steps branch on it: the CDN base `extract-props.js` crawls, the docs page `extract-doc-status.js` reads, and the docs URL [`scripts/utils/go-to-impl.js`](../../scripts/utils/go-to-impl.js) builds.

## How it works

| Script | Role |
| ------ | ---- |
| **`discover-components.js`** | Scans each published package's types on unpkg and regenerates `components.json`: which primary props interface each component uses, which file it lives in when that differs from the component name, and which package it came from when that is not S2. |
| **`extract-props.js`** | For each entry, crawls that interface's real `.d.ts` import graph, builds a `ts.Program`, and asks the TypeScript checker for its fully resolved property set. Writes `data/{Component}.json` and attaches doc **status** from the published S2 site. |
| **`locate-published-files.js`** | Maps a module specifier to a CDN URL. Pure — no network. |
| **`docs.js`** | Selects the documentation page and URL. Shared by status extraction and site links. Pure, with no network or Node dependencies. |
| **`build-ts-checker.js`** | Fetches the import graph into a cache (`crawl`), then builds a synchronous `ts.CompilerHost` over it (`buildProgram`). |

Discovery and extraction use the same package bases, declaration paths, and CDN URL
helpers from `locate-published-files.js`. An omitted package selects S2; an explicit
unknown package ID raises an error.

S2 publishes no structured metadata, so the compiler is the source of truth: `checker.getPropertiesOfType()` returns a component's own props plus everything it inherits, transitively, with `Omit<>`/`Pick<>` applied as written.

### Why the compiler rather than parsing

A props interface routinely inherits through several hops (`ButtonProps` → `AriaBaseButtonProps` → `PressEvents`…), and S2 subtracts with `Omit<>` as often as it adds. Reading interface headers can follow one hop and cannot subtract at all, so it both misses inherited props and over-reports removed ones. The checker resolves the same declarations the compiler does, which makes both classes of error impossible rather than patched case by case.

The cost is that resolution is only as good as the crawl: a package missing from `locate-published-files.js`'s set leaves a heritage member unresolved, and TypeScript then collapses any `Omit<T, K>` over that chain to **zero** properties — silently, and for the whole interface. See [Known limitations](#known-limitations).

### Parallel with SWC extraction

Both implementations write the same per-prop contract from [`../shared/prop-contract.js`](../shared/prop-contract.js), so no consumer parses a type string. They differ in where declarations come from — a `.d.ts` import graph here, a Custom Elements Manifest for SWC — and in which optionality signal each records (see below).

### What appears in each component file

`data/{Component}.json` is `{ status?, props: [...] }`. Each prop row carries:

- `property` — the prop name.
- `type` — the resolved type as a display string. Human-readable only; **nothing may branch on it.** [`blocks/table/table.js`](../../blocks/table/table.js) renders it.
- `kind` — one of `enum`, `boolean`, `text`, `number`, `unknown`. Says what control the row can back.
- `values` — the selectable options as real JSON (numbers stay numbers), non-empty if and only if `kind` is `enum`, **in the order the source declares them**. The playground builds pickers from this.
- `required` — present and `true` only when the prop is not optional.
- `default`, `description` — from JSDoc `@default` and the doc comment.
- `inheritedFrom` — the interface that declares the prop, when it is not the component's own primary interface.

`kind` is `enum` if and only if `values` is non-empty. `kind: "unknown"` draws no control and warns rather than guessing — it covers `ReactNode` children, event handlers, and style objects, which have no fixed option set.

**Order is the source's, not the checker's.** TypeScript interns a union by type ID — first encounter anywhere in the program — so a component that narrows or widens a shared union used to inherit that union's order with its own members appended (ActionMenu offered `S, M, L, XL, XS`). `declaredValueOrder` in [`deps/shared/prop-contract.js`](../shared/prop-contract.js) recovers the declared order from the prop's own declaration node, because the resolved type cannot supply it. RSP declares its unions inline, so the union node *is* the order; SWC's `(typeof CONST)[number]` idiom needs following to the tuple. Reordering only ever sorts the resolved values, so membership cannot change.

### `required`, not `optional`

RSP records `required`; SWC records `optional`. This is not an inconsistency to reconcile — it is each technology's rare signal. TypeScript props are optional by default, so **3% of RSP props are required** and that is the informative half. SWC declares attributes required by default, so **13% are optional** and that is the informative half there. Recording the common case on either side would be noise.

It also means the playground's "an optional enum offers a *None* choice" rule is SWC-only. Applying it to RSP would put a spurious *None* on 97% of props, so RSP's `staticColor` control names itself explicitly in [`blocks/playground/playground-data.js`](../../blocks/playground/playground-data.js).

### Doc status (`status`)

`extract-doc-status.js` reads the component's published docs page and records `stable`, `alpha`, `beta`, or `rc`. A component with no doc page has no `status` field. See [../docs/DATA-CONTRACT.md](../docs/DATA-CONTRACT.md) for how that feeds the combined status index.

S2 publishes a page per component, so each one is read at `/{Component}.html`.
The AI package shares `/ai-components.html` and its prerelease badge.
`docsPageName` in `docs.js` selects the page for both status extraction and external
documentation links. Link formatting adds the lowercased component name as an
anchor for a shared page.

### Display in Spectrum Hub

The catalog is deliberately **complete** — every resolved prop is written, including DOM, ARIA, and event plumbing — because the playground, the status index, and future consumers each need a different subset.

Filtering is the consumer's job. `blocks/table/table.js` keeps `EXCLUDED_SOURCES`, a set of base interfaces whose props are plumbing rather than component API (`GlobalDOMEvents`, `AriaLabelingProps`, `PressEvents`, `DOMProps`, …). Button resolves 42 props and renders 8. The playground filters differently again: it shows only the properties authored in the workbook's `components` sheet.

What the playground does with a row once it has one — and the naming rules every lookup is keyed on — is documented in [../docs/PLAYGROUND-CONTRACT.md](../docs/PLAYGROUND-CONTRACT.md).

## Running the extraction

```sh
node deps/rsp/discover-components.js   # regenerates components.json, both packages
node deps/rsp/extract-props.js         # regenerates data/*.json (several minutes)
node deps/build-status-index.js        # rebuilds the combined index
```

`extract-props.js` shares one file cache across the whole run, so the ~250 base files common to every component are fetched once rather than per component. It also removes `data/*.json` for components no longer in `components.json`, and **fails closed** if the roster is less than half the size of the data directory — a broken discovery run must not be able to delete the catalog.

Both scripts run daily via [`.github/workflows/extract-rsp-properties.yml`](../../.github/workflows/extract-rsp-properties.yml), which needs `npm ci` because the pipeline imports the real `typescript` package.

## `components.json` schema

Generated — do not edit by hand; the daily workflow overwrites it.

| Field | Required | Meaning |
| ----- | -------- | ------- |
| **`interface`** | yes | The primary props interface to resolve, e.g. `ButtonProps`. |
| **`file`** | no | The declaration path relative to `dist/types/src`, without `.d.ts`, when it differs from the component name. Supports nested paths such as `loader/react`. |
| **`package`** | no | The publishing package, when it is not S2. Only `ai` today. |

```json
{
  "Button": { "interface": "ButtonProps" },
  "AccordionItem": { "interface": "AccordionItemProps", "file": "Accordion" },
  "UserMessage": { "interface": "UserMessageProps", "package": "ai" },
  "Thread": { "interface": "ThreadProps", "file": "Chat", "package": "ai" },
  "PixelLoader": { "interface": "PixelLoaderProps", "file": "loader/react", "package": "ai" },
  "InsertMenuButton": { "interface": "InsertMenuItemProps", "file": "PromptField", "package": "ai" }
}
```

`package` is omitted for S2 rather than written as `"s2"`, so an S2-only roster is byte-identical to the one this file described before the AI package was added.

Inheritance is not recorded here. The checker resolves it from the declarations themselves, so there is nothing for this file to configure or drift from.

## Authored names vs RSP export names

The name a page is authored under and the name RSP exports diverge for a minority of components — `action-group` ships as `ActionButtonGroup`, `table` as `TableView`, `takeover-dialog` as `FullscreenDialog`.

[`deps/impl-component-names.js`](../impl-component-names.js) maps authored slug → `{ docs, export }` per implementation; `export` is the real export name. It is generated by `build-status-index.js` from the roster (an entry exists only where the RSP name differs from the canonical one), so an upstream rename cannot leave a stale entry behind. `resolveRspComponentName()` in [`playground/pascal-case.js`](playground/pascal-case.js) reads it.

The export name is used only where the export itself is needed: the live esm.sh import, the `data/{Component}.json` fetch, and the code disclosure's tag name. Every other playground lookup — the snippet file, `OVERLAY_TRIGGERS`, the sizing sets — is keyed by the **authored** slug, so there is one key to keep in sync rather than two.

This is distinct from the same table's `docs` field, which answers "which RSP **docs page** covers this slug" and so points at family pages: `radio-button` → `RadioGroup` there, `Radio` here. [../docs/STATUS-FILES.md](../docs/STATUS-FILES.md) covers why both fields exist.

## Adding or fixing a component

Most components need nothing — discovery finds them and the checker resolves them. When a component is missing or its props look wrong:

1. Confirm it is in `components.json` with the right `interface`. Discovery supports `export declare const` and `export declare function`, including generic functions. When interface names differ, it can read a function's first parameter type if that references an exported interface in the same file.
2. Re-run `extract-props.js` and read the warnings. `"<Interface> not found in <file>.d.ts"` means `interface`/`file` is wrong.
3. If a component resolves to **zero** props, check for an unresolved package or an intentionally empty upstream interface. `PromptFieldSubmitButtonProps` is intentionally empty. The catalog canary allows only that API to be empty and requires removing the exception if it gains props.

## Known limitations

**`Omit<>` collapses on an unresolved heritage member.** If any interface in a chain references a package `locate-published-files.js` does not crawl, TypeScript collapses `Omit<T, K>` over that chain to zero properties — not just the unresolved part, the entire result, with no error. A component that suddenly reports no props almost always means a package needs adding to the crawl set. `react-aria`, `@types/react`, `react-stately`, and `@internationalized/date` are all in the set for exactly this reason.

**`typescript` must stay on the 5.x line.** npm's `latest` tag points at the native/Go-ported compiler, whose default export is version metadata only — `ts.createProgram` and the rest of the classic API are absent. `package.json` pins `^5.9.3`; the caret keeps it off the 6.x/7.x line.

**`LabeledValue` does not extract.** It is in the roster but produces no data file: `findComponentInterface`'s regex mismatches its declaration.

**`PromptFieldContainer` does not register.** Its props interface is published as `PropFieldContainerProps` — an upstream typo, missing the `mt` — so neither the `<Component>Props` nor the `S2Spectrum<Component>Props` fallback finds it, and `buildEntry` drops it. It has no section on the AI docs page either. Adding a name exception here would go stale the moment the typo is fixed upstream, so it is left unregistered.

**Discovery coverage.** Discovery scans capitalized component filenames and the nested
`loader/react.d.ts` entry that declares `PixelLoader`. Other lowercase helper files
are excluded.

**`@deprecated` is not surfaced.** S2 does not currently author the tag, and the JSDoc reader keeps only the description and `@default`. If S2 adds it, rows extract as ordinary props with no display-layer filter.

**Tests** — `discover-components`, `extract-props`, `locate-published-files`, and `build-ts-checker` cover the pipeline with mocked fetches (no live CDN).
