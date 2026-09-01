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

**The existence gate applies only to an implementation that ships a catalog.** `CATALOG_IMPLEMENTATIONS` is `{rsp, swc}`. A property absent from the catalog of an implementation that *has* one is a real gap and warns; ios/android are authored entirely from the workbook, so a missing row there is normal.

**A "None" choice is derived from `optional`, which only SWC emits.** SWC declares attributes required by default, so `optional` is its rare, informative signal. TypeScript props are optional by default, so the same rule on RSP would put a spurious *None* on 97% of controls. RSP's `staticColor` therefore names itself explicitly in `playground-data.js` — a deliberate exception, not an oversight. See [deps/rsp/README.md](../rsp/README.md#required-not-optional).

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
| One catalog fetched; authored-slug snippet and shell routing | `test/blocks/playground.test.js` |
| Overlay routes keyed by authored slug | `test/extractions/overlay-triggers.node.test.js` |

The catalog guards are deliberately written so they have been *seen* to fail: the zero-props canary was checked against a planted empty component, the ordering guard is the same check that surfaced the original four out-of-order enums, and the `values`-over-`type` tests were run against the old type-parsing consumer to confirm all three go red.

## Known gaps

- **Three SWC rows carry `attribute` with no `property`** (`aria-haspopup`, `aria-expanded`, and accordion's `allowMultiple`), so `findProp` can never match them and they cannot back a control.
- **Slots are not extracted.** SWC's CEM records them explicitly, which beats the `TEXT_KEYS` name heuristic the consumer uses today. Three SWC components (`conversation-thread`, `suggestion-item`, `system-message`) have zero attributes and only slots, so the catalog describes none of their API.
- **The two catalogs still differ in filename and wrapper.** `Accordion.json` with `{ props, status }` versus `swc-accordion-item.json` as a bare array. `scripts/utils/extraction-status.js` normalizes it in Node and `d.props ?? d` in the browser, so the cost is two small readers rather than a consumer-visible difference.
- **Some components render no controls** because their workbook row omits the page's implementation, or has no row at all. This warns rather than failing silently.
