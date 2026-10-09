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

**Exactly one catalog is fetched: the page's own.** `fetchPlaygroundInputs` gates on
`implementation`, preventing one implementation's catalog values from being applied to
another.

**Options come from `values`, never from `type`.** `type` is a display string for [`blocks/table/table.js`](../../blocks/table/table.js) and nothing may branch on it. This is not stylistic: 72 rows across the two catalogs have a `type` containing quoted literals but no fixed option set, and `DisclosurePanel.labelElementType` carries 178 of them. A consumer that parsed `type` offered a picker of HTML tag names. `kind` decides booleans for the same reason.

Component-specific option overrides cover documented presets for an otherwise open-ended
type. RSP Avatar accepts arbitrary numbers and `<number>lh` strings, so its catalog has
no closed `values` list, but the playground picker offers the documented numeric sizes.
Keep these overrides scoped by implementation, component, and property so they cannot
leak into unrelated controls that share a property name.

**RSP snippet fragments use quoted JSX expressions.** The snippets must remain valid XML so the browser can preserve PascalCase names. Write numeric props as quoted expressions in the source, such as `size="{24}"`. The preview parser converts the expression to a number, and the code disclosure emits standard JSX as `size={24}`. A numeric-looking string without braces remains a string. Write boolean shorthand as an empty XML attribute, such as `isIndeterminate=""`; the preview treats it as `true`, and the disclosure emits `isIndeterminate`.

**`attribute` never crosses implementations.** Only SWC rows carry a DOM attribute. RSP
props are not attributes, so an RSP control's `attribute` is `null` and the apply path
uses the property name.

**A shell's CSS hook is derived, never read from the row.** Both shells share
[`preview-shell.css`](../../blocks/playground/preview-shell.css), whose `static-color`
rules give a `staticColor` preview its contrasting backdrop and clear the wrapper's
opaque background. `applySwcProp` reflects the SWC value onto the live element. RSP has
no attribute to reflect, so its shell mirrors the value onto `#mount` under a name
`mountAttributeName()` derives from the property. Content props
(`text`/`label`/`children`) are not mirrored, matching SWC, which sets `textContent`
rather than an attribute.

**The existence gate applies only to an implementation that ships a catalog.** `CATALOG_IMPLEMENTATIONS` is `{rsp, swc}`. A property absent from the catalog of an implementation that *has* one is a real gap and warns; ios/android are authored entirely from the workbook, so a missing row there is normal.

**An "unset" choice is derived from `optional`, which only SWC emits.** SWC declares attributes required by default, so `optional` is its rare, informative signal. TypeScript props are optional by default, so the same rule on RSP would put a spurious unset choice on 97% of controls. RSP's cases therefore name themselves explicitly in `playground-data.js` — a deliberate exception, not an oversight. See [deps/rsp/README.md](../rsp/README.md#required-not-optional).

**There are two unset labels and one meaning.** `NONE_OPTION` is a property that is simply off when absent; `DEFAULT_OPTION` is one the component works out for itself. Both lead their option list, so both land as the control's default, and every apply and serialize path omits the property rather than reflecting the sentinel. Compare with `isUnsetOption()`, never against one constant.

**An unset sentinel's value is opaque; only its label is readable.** The sentinels are
`__unset_none__` and `__unset_default__`, and they must not resemble real values.
`"default"` is a genuine enum member for seven RSP props
(`ColorSwatch.rounding`, `ColorSwatchPicker.rounding`,
`ContextualHelpPopover.padding`, `CustomDialog.padding`, `Popover.padding`,
`Slider.thumbStyle`, `RangeSlider.thumbStyle`), so it cannot serve as a sentinel.

Two rules follow. A control renders `optionLabel(value)`, never the value itself, so the sentinel is never shown; and the sentinel must never reach a URL — the generic image shell drops unset props from both its filename and its `alt` text, which is also what "absent" should mean there. `test/extractions/playground-data.node.test.js` guards the collision against the real catalogs, so a future upstream enum member that matches a sentinel fails a test rather than a page.

ColorArea's `xChannel` and `yChannel` must default to unset. The component derives both
from its value's color space and re-derives them when that space changes. Selecting the
first concrete option for each can produce an invalid pair and an empty preview.

**A required property gets a safe default instead, not an unset choice.** ColorSlider's `channel` looks like the same bug and is not: it is `required`, and unlike ColorArea's channels it is not inferred, so omitting it renders nothing too — an unset choice would trade one blank preview for another. `DEFAULT_OVERRIDES` in `playground-data.js` starts it on a value that suits `colorSpace`'s own default instead, ahead of any catalog `default`, because the constraint is between two properties and a per-prop `default` cannot express one. A reader can still select an invalid pair by hand; only filtering the channel options by the selected color space would prevent that, and the playground has no cross-control dependency today.

**A route may declare that its props live on another export.** RSP splits Tooltip's API in two: `Tooltip` renders the bubble, but `placement`, `trigger`, `delay`, `isDisabled`, `shouldFlip`, `containerPadding`, `crossOffset` and `shouldCloseOnPress` are all declared on `TooltipTrigger`. Reading the route's own catalog there gives six props, none of them a control, so every authored property was rejected and the page rendered no controls at all.

`propsOnTrigger` on the route's `OVERLAY_TRIGGERS` entry moves two things together, and they have to move together: which catalog is read (`propsOwner()`, used by `resolveComponentMeta`'s `propsTitle` and by the shell) **and** which element the props are applied to — the wrapper rather than the route's own element, in the live preview and the code disclosure alike. Reading the right catalog without moving the apply target would render controls that silently do nothing.

Text and children stay on the route's own element regardless: they are its content, not its configuration. `tooltip` is the only route that needs this — every dialog declares its own props.

**A component with no controls gets no controls panel.** Two mechanisms produce this,
and both are normal. Either the workbook yields no properties for the page—an empty
`properties` cell or no row covering this implementation—or properties are authored and
the existence gate rejects every one because that implementation ships no catalog file
for the component. Current examples of the second case are SWC's `link`, which is utility
CSS classes rather than a component API and is absent from `components.json`, and RSP's
`field-label`, `help-text`, `color-handle`, and `color-loupe`, none of which are S2
exports.

A third route is possible but currently unexercised: a component whose catalog rows are
all `unknown` or `text` with no options would skip every control even with properties
authored. RSP's `SideNav` is one row set away from it, with 16 such props and an empty
`properties` cell. `buildControlsPanel` returns `null` when nothing rendered, and the
layout appends only what exists—otherwise an empty panel keeps its fixed column and
labels a region containing nothing. No CSS is involved: `.playground-controls` is
`flex: 0 0 <fixed>` and `.playground-preview` is `flex: 1 1 auto`, so with the panel gone
the preview is the sole flex child and fills the row.

The exact number of no-controls pages is live content data, not a repository contract.
It changes with the AEM workbook, page metadata, and committed extraction catalogs, so
do not preserve a point-in-time total here unless an automated check also maintains it.

## Naming: the authored name is the thread

**Every lookup is keyed by the authored slug** — the snippet file, `OVERLAY_TRIGGERS`, the preview shell's sizing sets, and the workbook's `components` sheet. An implementation's own export name is resolved only where the export itself is needed:

- the esm.sh import and the code disclosure's tag name (RSP);
- the `deps/rsp/data/{Component}.json` filename.

Overrides are declared only where the names actually diverge — 13 of 121 RSP components — in the `export` field of the generated [`deps/impl-component-names.js`](../impl-component-names.js) (`action-group` → `ActionButtonGroup`, `table` → `TableView`).

Keying route-owned resources by the export name creates two keys that must remain in
sync. Keep snippets, trigger metadata, shell sizing, and workbook rows keyed by the
authored slug.

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

## Known gaps

- **Four SWC rows carry `attribute` with no `property`** (`aria-haspopup`, `aria-expanded`, `aria-disabled`, and accordion's `allowMultiple`), so `findProp` can never match them and they cannot back a control.
- **Slots are not extracted.** SWC's CEM records them explicitly, which beats the `TEXT_KEYS` name heuristic the consumer uses today. Three SWC components (`conversation-thread`, `suggestion-item`, `system-message`) have zero attributes and only slots, so the catalog describes none of their API.
- **The two catalogs still differ in filename and wrapper.** `Accordion.json` with `{ props, status }` versus `swc-accordion-item.json` as a bare array. `scripts/utils/extraction-status.js` normalizes it in Node and `d.props ?? d` in the browser, so the cost is two small readers rather than a consumer-visible difference.
- **No-controls pages warn rather than failing silently**, so a page that should have controls and does not is traceable from the console. The total is intentionally not fixed here because it is derived from live authored content.
