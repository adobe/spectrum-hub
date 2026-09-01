# Playground contract

How [`blocks/playground/`](../../blocks/playground/) turns a catalog row into a control, and the naming rules the whole pipeline is keyed on.

This covers the **consumer** side. The row shape itself is documented once, in [DATA-CONTRACT.md](./DATA-CONTRACT.md), and per-implementation extraction in [deps/rsp/README.md](../rsp/README.md) and [deps/swc/README.md](../swc/README.md). Where a file is the authority on an override or alias, see [STATUS-FILES.md](./STATUS-FILES.md).

## Where each answer comes from

Four independent sources, merged in `init()`:

| Source | Answers |
| --- | --- |
| Block metadata on the authored page | which `implementation` and which `component` |
| AEM workbook (`?sheet=components`, `?sheet=controls`) | **which** props appear, in what order, and which widget each uses |
| `deps/<impl>/data/*.json` | **what kind** each prop is and **what values** it offers |
| `deps/<impl>/playground/snippets/<slug>.*` | what the preview renders |

The division matters: **the workbook is the allow-list, the catalog is the vocabulary.** Button's RSP catalog holds 42 props; its page shows 8. Letting the catalog decide which controls exist would put every `aria-*` and `onKeyDown` on the page, and would leave ios/android — which have no catalog at all — with nothing.

## Rules the consumer follows

**Exactly one catalog is fetched: the page's own.** `fetchPlaygroundInputs` gates on `implementation`. Fetching both used to guarantee a 404 on every RSP page, and it is what let one implementation's option lists appear on the other's controls — SWC's Button offered `premium` and `genai`, which SWC does not implement. One catalog makes that impossible by construction rather than by a guard that can regress.

**Options come from `values`, never from `type`.** `type` is a display string for [`blocks/table/table.js`](../../blocks/table/table.js) and nothing may branch on it. This is not stylistic: 72 rows across the two catalogs have a `type` containing quoted literals but no fixed option set, and `DisclosurePanel.labelElementType` carries 178 of them. A consumer that parsed `type` offered a picker of HTML tag names. `kind` decides booleans for the same reason.

**`attribute` never crosses implementations.** Only SWC rows carry a DOM attribute; RSP props are not attributes, so an RSP control's `attribute` is `null` and the apply path uses the property name. An RSP control used to resolve to SWC's attribute — the same borrowing defect as the option lists, one field over.

**A shell's CSS hook is derived, never read from the row.** Both shells share [`preview-shell.css`](../../blocks/playground/preview-shell.css), whose `static-color` rules give a staticColor preview its contrasting backdrop and clear the wrapper's opaque background. SWC gets the hook free — `applySwcProp` reflects onto the live element, so the component itself carries `static-color`. RSP has no attribute to reflect, so the shell mirrors onto `#mount` under a name `mountAttributeName()` derives from the property. Reading `attribute` off the message instead is what silently broke this: once RSP correctly stopped borrowing SWC's field, the name was always `null`, `applyAttribute` returned early, and both rules stopped matching — a white staticColor button rendered white-on-white while the same SWC page went dark. Content props (`text`/`label`/`children`) are not mirrored, matching SWC, which sets `textContent` rather than an attribute.

**The existence gate applies only to an implementation that ships a catalog.** `CATALOG_IMPLEMENTATIONS` is `{rsp, swc}`. A property absent from the catalog of an implementation that *has* one is a real gap and warns; ios/android are authored entirely from the workbook, so a missing row there is normal.

**A "None" choice is derived from `optional`, which only SWC emits.** SWC declares attributes required by default, so `optional` is its rare, informative signal. TypeScript props are optional by default, so the same rule on RSP would put a spurious *None* on 97% of controls. RSP's `staticColor` therefore names itself explicitly in `playground-data.js` — a deliberate exception, not an oversight. See [deps/rsp/README.md](../rsp/README.md#required-not-optional).

**A route may declare that its props live on another export.** RSP splits Tooltip's API in two: `Tooltip` renders the bubble, but `placement`, `trigger`, `delay`, `isDisabled`, `shouldFlip`, `containerPadding`, `crossOffset` and `shouldCloseOnPress` are all declared on `TooltipTrigger`. Reading the route's own catalog there gives six props, none of them a control, so every authored property was rejected and the page rendered no controls at all.

`propsOnTrigger` on the route's `OVERLAY_TRIGGERS` entry moves two things together, and they have to move together: which catalog is read (`propsOwner()`, used by `resolveComponentMeta`'s `propsTitle` and by the shell) **and** which element the props are applied to — the wrapper rather than the route's own element, in the live preview and the code disclosure alike. Reading the right catalog without moving the apply target would render controls that silently do nothing.

Text and children stay on the route's own element regardless: they are its content, not its configuration. `tooltip` is the only route that needs this — every dialog declares its own props.

**A component with no controls gets no controls panel.** Two mechanisms produce this, and both are normal. Either the workbook yields no properties for the page — an empty `properties` cell, or no row covering this implementation, which is 23 slug/implementation pairs today, mostly stubs (`rating`, `tray`, `steplist`) plus RSP's `side-navigation` — or properties are authored and the existence gate rejects every one, because that implementation ships no catalog file for the component. Five pages are in the second group: SWC's `link`, which is utility CSS classes rather than a component API and is absent from `components.json` entirely, and RSP's `field-label`, `help-text`, `color-handle` and `color-loupe`, none of which are S2 exports, so no `deps/rsp/data` file is generated for them. A third route is possible but unexercised: a component whose catalog rows are all `unknown` or `text` with no options would skip every control even with properties authored — RSP's `SideNav` is one row set away from it, with 16 such props and an empty `properties` cell. `buildControlsPanel` returns `null` when nothing rendered, and the layout appends only what exists — otherwise an empty panel keeps its fixed column and labels a region containing nothing. No CSS is involved: `.playground-controls` is `flex: 0 0 <fixed>` and `.playground-preview` is `flex: 1 1 auto`, so with the panel gone the preview is the sole flex child and fills the row.

## Naming: the authored name is the thread

**Every lookup is keyed by the authored slug** — the snippet file, `OVERLAY_TRIGGERS`, the preview shell's sizing sets, and the workbook's `components` sheet. An implementation's own export name is resolved only where the export itself is needed:

- the esm.sh import and the code disclosure's tag name (RSP);
- the `deps/rsp/data/{Component}.json` filename.

Overrides are declared only where the names actually diverge — 13 of 121 RSP components — in the `export` field of the generated [`deps/impl-component-names.js`](../impl-component-names.js) (`action-group` → `ActionButtonGroup`, `table` → `TableView`).

Keying anything else by the export name means two keys to keep in sync. That was the previous convention, and it silently broke 13 pages: the code fetched `<authored>.jsx` while the file was named `<export>.jsx`, and `fetchText(...).catch(() => '')` swallowed the 404 into an empty preview. Do not reintroduce it.

Three naming questions look alike and have three different homes — see [STATUS-FILES.md](./STATUS-FILES.md) for the full map:

| Question | Home |
| --- | --- |
| What does Figma call this? | `deps/component-aliases.json` |
| What do I import and render? | `export`, in `deps/impl-component-names.js` |
| Where does the public doc page live? | `upstreamName`, in the alias and override files — surfaced as `docs` in `deps/impl-component-names.js` |

## Canonical property names

**Canonical names use the `is`/`has` boolean prefix** (`isDisabled`, `isQuiet`, `isPending`). This is the hub's vocabulary, which happens to match RSP's spelling, and a large minority of the controls sheet's rows already use it. It is not "RSP's convention leaking" — there is no cross-implementation standard to be wrong against, since SwiftUI also prefixes and Compose uses `enabled`.

Each implementation's own spelling stays in its catalog row (`property`), and the bridge between the two is `propertyNameCandidates` in `playground-data.js`: it walks both directions of the prefix so the workbook's `isDisabled` finds SWC's `disabled` row.

That bridge is a **runtime walk only until SWC's extractor writes a canonical name onto each row.** It is the last thing keeping `normalizePropertyName` and `propertyNameCandidates` alive; when that lands, `findProp` becomes a plain lookup. Until then, a new controls-sheet row must use the `is`/`has` form — the bridge would absorb either spelling silently, so the inconsistency would never surface as an error.

## What enforces this

| Rule | Test |
| --- | --- |
| Row contract over both committed catalogs, plus each pipeline's own canary | `test/extractions/data-contract.node.test.js` |
| `values` in declared order, membership never changing when reordered | `test/extractions/prop-contract.node.test.js` |
| Options from `values` and never from `type`; the existence gate; the name bridge | `test/extractions/playground-data.node.test.js` |
| One catalog fetched; authored-slug snippet and shell routing; no panel when there are no controls | `test/blocks/playground.test.js` |
| Overlay routes keyed by authored slug; which export owns a route's props | `test/extractions/overlay-triggers.node.test.js` |

The catalog guards are deliberately written so they have been *seen* to fail: the zero-props canary was checked against a planted empty component, the ordering guard is the same check that surfaced the original four out-of-order enums, and the `values`-over-`type` tests were run against the old type-parsing consumer to confirm all three go red.

## Known gaps

- **Three SWC rows carry `attribute` with no `property`** (`aria-haspopup`, `aria-expanded`, and accordion's `allowMultiple`), so `findProp` can never match them and they cannot back a control.
- **Slots are not extracted.** SWC's CEM records them explicitly, which beats the `TEXT_KEYS` name heuristic the consumer uses today. Three SWC components (`conversation-thread`, `suggestion-item`, `system-message`) have zero attributes and only slots, so the catalog describes none of their API.
- **The two catalogs still differ in filename and wrapper.** `Accordion.json` with `{ props, status }` versus `swc-accordion-item.json` as a bare array. `scripts/utils/extraction-status.js` normalizes it in Node and `d.props ?? d` in the browser, so the cost is two small readers rather than a consumer-visible difference.
- **28 slug/implementation pairs render no controls**, for the two reasons given above. Every one warns rather than failing silently, so a page that should have controls and does not is traceable from the console.
