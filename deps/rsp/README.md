# React Spectrum component properties

Generates the per-component prop data Spectrum Hub renders in API tables and the component playground, from the published `@react-spectrum/s2` package.

## How it works

| Script | Role |
| ------ | ---- |
| **`discover-components.js`** | Scans published S2 types on unpkg and regenerates `components.json`: which primary props interface each component uses, and which file it lives in when that differs from the component name. |
| **`extract-props.js`** | For each entry, crawls that interface's real `.d.ts` import graph, builds a `ts.Program`, and asks the TypeScript checker for its fully resolved property set. Writes `data/{Component}.json` and attaches doc **status** from the published S2 site. |
| **`cdn-resolve.js`** | Maps a module specifier to a CDN URL. Pure — no network. |
| **`ts-cdn-host.js`** | Fetches the import graph into a cache (`crawl`), then builds a synchronous `ts.CompilerHost` over it (`buildProgram`). |

S2 publishes no structured metadata, so the compiler is the source of truth: `checker.getPropertiesOfType()` returns a component's own props plus everything it inherits, transitively, with `Omit<>`/`Pick<>` applied as written.

### Why the compiler rather than parsing

A props interface routinely inherits through several hops (`ButtonProps` → `AriaBaseButtonProps` → `PressEvents`…), and S2 subtracts with `Omit<>` as often as it adds. Reading interface headers can follow one hop and cannot subtract at all, so it both misses inherited props and over-reports removed ones. The checker resolves the same declarations the compiler does, which makes both classes of error impossible rather than patched case by case.

The cost is that resolution is only as good as the crawl: a package missing from `cdn-resolve.js`'s set leaves a heritage member unresolved, and TypeScript then collapses any `Omit<T, K>` over that chain to **zero** properties — silently, and for the whole interface. See [Known limitations](#known-limitations).

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

`extract-doc-status.js` reads the component's published S2 docs page and records `stable`, `alpha`, `beta`, or `rc`. A component with no doc page has no `status` field. See [../docs/DATA-CONTRACT.md](../docs/DATA-CONTRACT.md) for how that feeds the combined status index.

### Display in Spectrum Hub

The catalog is deliberately **complete** — every resolved prop is written, including DOM, ARIA, and event plumbing — because the playground, the status index, and future consumers each need a different subset.

Filtering is the consumer's job. `blocks/table/table.js` keeps `EXCLUDED_SOURCES`, a set of base interfaces whose props are plumbing rather than component API (`GlobalDOMEvents`, `AriaLabelingProps`, `PressEvents`, `DOMProps`, …). Button resolves 42 props and renders 8. The playground filters differently again: it shows only the properties authored in the workbook's `components` sheet.

What the playground does with a row once it has one — and the naming rules every lookup is keyed on — is documented in [../docs/PLAYGROUND-CONTRACT.md](../docs/PLAYGROUND-CONTRACT.md).

## Running the extraction

```sh
node deps/rsp/discover-components.js   # regenerates components.json
node deps/rsp/extract-props.js         # regenerates data/*.json (~3 min)
node deps/build-status-index.js        # rebuilds the combined index
```

`extract-props.js` shares one file cache across the whole run, so the ~250 base files common to every component are fetched once rather than per component. It also removes `data/*.json` for components no longer in `components.json`, and **fails closed** if the roster is less than half the size of the data directory — a broken discovery run must not be able to delete the catalog.

Both scripts run daily via [`.github/workflows/extract-rsp-properties.yml`](../../.github/workflows/extract-rsp-properties.yml), which needs `npm ci` because the pipeline imports the real `typescript` package.

## `components.json` schema

Generated — do not edit by hand; the daily workflow overwrites it.

| Field | Required | Meaning |
| ----- | -------- | ------- |
| **`interface`** | yes | The primary props interface to resolve, e.g. `ButtonProps`. |
| **`file`** | no | The `.d.ts` basename, when it differs from the component name (`AccordionItem` lives in `Accordion.d.ts`). |

```json
{
  "Button": { "interface": "ButtonProps" },
  "AccordionItem": { "interface": "AccordionItemProps", "file": "Accordion" }
}
```

Inheritance is not recorded here. The checker resolves it from the declarations themselves, so there is nothing for this file to configure or drift from.

## Authored names vs RSP export names

The name a page is authored under and the name RSP exports diverge for a minority of components — `action-group` ships as `ActionButtonGroup`, `table` as `TableView`, `takeover-dialog` as `FullscreenDialog`.

[`deps/rsp-export-names.js`](../rsp-export-names.js) maps authored slug → real export. It is generated by `build-status-index.js` from the roster (an entry exists only where the RSP name differs from the canonical one), so an upstream rename cannot leave a stale entry behind. `resolveRspComponentName()` in [`playground/pascal-case.js`](playground/pascal-case.js) reads it.

The export name is used only where the export itself is needed: the live esm.sh import, the `data/{Component}.json` fetch, and the code disclosure's tag name. Every other playground lookup — the snippet file, `OVERLAY_TRIGGERS`, the sizing sets — is keyed by the **authored** slug, so there is one key to keep in sync rather than two.

This is distinct from [`deps/impl-aliases.js`](../impl-aliases.js), which answers "which RSP **docs page** covers this slug" and so points at family pages: `radio-button` → `RadioGroup` there, `Radio` here. [../docs/STATUS-FILES.md](../docs/STATUS-FILES.md) covers why both exist.

## Adding or fixing a component

Most components need nothing — discovery finds them and the checker resolves them. When a component is missing or its props look wrong:

1. Confirm it is in `components.json` with the right `interface`. Discovery registers `export declare const` components; anything exported as a function needs investigating there.
2. Re-run `extract-props.js` and read the warnings. `"<Interface> not found in <file>.d.ts"` means `interface`/`file` is wrong.
3. If a component resolves to **zero** props, suspect an unresolved package rather than the component — see the `Omit<>` collapse below.

## Known limitations

**`Omit<>` collapses on an unresolved heritage member.** If any interface in a chain references a package `cdn-resolve.js` does not crawl, TypeScript collapses `Omit<T, K>` over that chain to zero properties — not just the unresolved part, the entire result, with no error. A component that suddenly reports no props almost always means a package needs adding to the crawl set. `react-aria`, `@types/react`, `react-stately`, and `@internationalized/date` are all in the set for exactly this reason.

**`typescript` must stay on the 5.x line.** npm's `latest` tag points at the native/Go-ported compiler, whose default export is version metadata only — `ts.createProgram` and the rest of the classic API are absent. `package.json` pins `^5.9.3`; the caret keeps it off the 6.x/7.x line.

**`LabeledValue` does not extract.** It is in the roster but produces no data file: `findComponentInterface`'s regex mismatches its declaration.

**Discovery coverage.** Only `export declare const` components in published `.d.ts` files are registered.

**`@deprecated` is not surfaced.** S2 does not currently author the tag, and the JSDoc reader keeps only the description and `@default`. If S2 adds it, rows extract as ordinary props with no display-layer filter.

**Tests** — `discover-components`, `extract-props`, `cdn-resolve`, and `ts-cdn-host` cover the pipeline with mocked fetches (no live CDN).
