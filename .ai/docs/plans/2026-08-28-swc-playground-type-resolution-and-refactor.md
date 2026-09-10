# SWC Playground — Type Resolution and Refactor

**Status: Tasks 1–7, 11, 13–16, 18–22 done; Task 12 answered by `refactor-rsp` (the RSP rewrite was brought over); Layer 1 complete for both catalogs; Layer 2 done on `refactor-playground`. Task 16 no longer gates the merge — it landed on `main` in `db99e9a`. Task 17 and Layer 3 are the only open items** (2026-09-03).

Verified against the code on 2026-09-03, since the 08-31 status had drifted: all four Task 11 items are done (`typescript` is `^5.9.3` in `devDependencies` and in the lockfile; both workflows `git add deps/impl-component-names.js`, the file that superseded `rsp-export-names.js`; `checkbox-group.jsx` has no stray `>`; `styles/styles.css` is back to `light-dark(#fff, #000)`). Task 16 shipped as `EXCLUDED_SOURCES` in `blocks/table/table.js` — an 18-entry set filtered on `inheritedFrom`, the "filter at render, keep the catalog complete" option this plan weighed.

**Task 17 was supposed to precede the block refactor and did not.** This plan says of it: "This is the regression net for the block refactor. It should exist *before* that branch starts, not after." The block refactor shipped on `refactor-playground` without it, and the bug that cost the most review time on that branch — a control whose selected value rendered as a different one (see Task 23) — is exactly what it was designed to catch. Sequencing recorded rather than re-argued; the net is still worth building.

The SWC half of the component playground had the same class of defect the RSP half already fixed in [the RSP inheritance-gap batch](./2026-08-13-rsp-playground-inheritance-gap-fixes.md): its extractor could not resolve named types, so the playground borrowed the *other* implementation's data to compensate — and shipped options for values the real component does not support. That is now fixed at the data source, not patched at the consumer.

This plan records what shipped, why each decision was made, and what is left. It deliberately separates **feature work that is done** (Tasks 1–7, on `swc-types`) from **refactor work that is not** (Tasks 8–11, intended for `refactor-swc`), because those live on different branches and the branch sequencing is still unresolved — see "Branch situation" below.

> **For agentic workers:** the full design history for Tasks 1–5 is in `.ai/docs/specs/2026-08-27-swc-type-resolution-design.md` (on `swc-types`). Read it before changing anything under `deps/swc/` — several shapes there look arbitrary and are not. Use `.ai/skills/test-driven-development/SKILL.md` for Tasks 8–10; all three are testable.
>
> **Reuse what exists.** The redesign below deliberately adds **no new data files**. Every lookup it needs already has a home — `scripts/utils/implementations.js`, `deps/impl-aliases.js`, `deps/<impl>/components.json`, `deps/<impl>/data/*.json`. Normalizing means changing what the existing extractors *write into the existing files*, not standing up a parallel catalog. See “What to reuse, and what not to create”.

## Branch situation

All six commits below are cherry-picked onto `refactor-swc`. The RSP TS-compiler rewrite (`a213393`…`4b5a370`) was deliberately **not** brought over, and the RSP side is coherent at its pre-rewrite state — extractor, data, tests, and README all match `main`.

| Branch | State |
|---|---|
| `refactor-swc` (current) | Tasks 1–7 present. `deps/rsp/` at the old regex pipeline; `deps/swc/` at the new compiler pipeline. |
| `swc-types` | Origin of the cherry-picks, plus the RSP rewrite. |
| `rsp-compiler-spike` | Two unrelated `deps` fixes not carried over: `8d857d6`, `6a49323`. |

Four `blocks/playground/` prerequisite commits were **not** carried over — `78ca443` (double-quote regex), `b972830` (controls-sheet fallback), `60772ec` (skip SWC fetch on RSP pages), `6f30e78` (RSP export names). Their absence leaves 5 failing tests (3 node, 2 browser). **This is expected and not being fixed in place** — the playground is being recreated. The failures are recorded here only because they are precise evidence for the redesign below: every one of them is a symptom of a root cause the rewrite removes.

## Work-stream classes

- **A — SWC extraction cannot resolve named types.** `deps/swc/extract-cem-components.js` copied `attribute.type.text` verbatim out of the CEM manifest, which records a bare alias (`"ButtonVariant"`) for anything not inline in the source. Nothing downstream can turn that into picker options.
- **B — The consumer compensates by borrowing the other implementation's data.** `blocks/playground/playground-data.js` tried RSP's resolved union first regardless of which implementation's page was rendering.
- **C — Pipeline and CI gaps.** The generated catalogs are rebuilt by scheduled workflows; a gap there is a production break, not a test gap.
- **D — Structural debt.** File-name collisions, untestable inline scripts, oversized modules, and one stray commit.

## Status table

| Item | Class | Evidence | Fix | Status |
|---|---|---|---|---|
| SWC Button offers `premium`/`genai` variants | B (root cause A) | `@adobe/spectrum-wc-core`'s `BUTTON_VARIANTS` is `["primary","secondary","accent","negative"]` at both `2.0.0-beta.0` and CDN `@beta`; RSP's Button genuinely supports the extra two, and `resolvePickerOptions` borrowed RSP's list unconditionally | Resolve SWC's own type at extraction time, then make the consumer implementation-aware | ✅ Tasks 1–4 |
| SWC `size` shows all 7 `ElementSize` values | A | Button's own `size: ButtonSize` (`s/m/l/xl`) narrows `SizedMixin`'s `size: ElementSize` (`xxs`–`xxl`); the CEM attributes the property to the mixin file either way, with no signal a narrower override exists | Check the direct superclass's own declared members before falling back to the CEM-attributed mixin file | ✅ Task 3 |
| Named-alias types unresolvable across the catalog | A | The CEM analyzer runs in its default non-type-resolving mode; ~35 components' enum props were bare identifiers | New TS-compiler pipeline under `deps/swc/`, mirroring RSP's | ✅ Tasks 1–2 |
| Long unions silently truncated | A (gotcha) | `checker.typeToString()` renders Badge's ~20-value `variant` as `"a" \| "b" \| ... N more ..."` — syntactically plausible, silently wrong | Pass `ts.TypeFormatFlags.NoTruncation`; regression test added | ✅ Task 2 |
| `extract-swc-properties.yml` never ran `npm ci` | C | The workflow had no install step; `extract-cem-components.js` now depends on the real `typescript` package | Added `npm ci`, mirroring the same fix on `extract-rsp-properties.yml` | ✅ Task 6 |
| Neither workflow committed `deps/rsp-export-names.js` | C | The file is generated by `build-status-index.js` but absent from both workflows' `git add` lists — drift there would never have been committed | Added to both `git add` lists | ✅ Task 6 |
| `scripts/utils/component-status.js` name collision | D | Collided with an unrelated UI block also named `component-status` | Renamed to `extraction-status.js` | ✅ Task 5 |
| `deps/figma/component-status.json` misnamed | D | It is a component roster, not status data — inconsistent with its RSP/SWC siblings | Renamed to `components.json` | ✅ Task 5 |
| No coverage for the new orchestration path | C | `findDeclarationAndModule` and `resolveAllAttributeTypes` were both new and untested; RSP export-name aliasing and skip-SWC-fetch-on-RSP-pages were previously-shipped fixes with zero regression coverage | 8 new tests across `extract-cem-components.node.test.js` and `test/blocks/playground.test.js` | ✅ Task 7 |
| Preview shells' inline `<script type="module">` untestable | D | `initRsp()` (~250 lines) and `initSwc()` (~120 lines) cannot be `import`ed by `node --test`, are invisible to `wtr`, and are not linted by ESLint — the only code of this complexity in the system with zero coverage | Extract to real modules (rewrite, Layer 3) | ⬜ Rewrite |
| `playground.js` mixes four concerns and hardcodes implementations | D | 671 lines: snippet serialization, control-widget factories, iframe/postMessage wiring, block lifecycle — plus `implementation === 'rsp'` branches in 3 functions, and it is the only consumer that does not import `scripts/utils/implementations.js` | Absorbed by the rewrite (Layers 1–2) | ⬜ Rewrite |
| Compiler-resolved unions parsed to `[]` | A/B | `parsePickerOptions` matched single quotes only; `checker.typeToString()` emits double. Every SWC enum lost its picker (badge `variant`, button `size`, progress-bar `labelPosition`) | Widened the regex to accept both quote styles | ✅ Task 13 |
| Picker options still come from regex-parsing a type string | A/B | The quote fix treats the symptom; the extractor still discards the structured `ts.Type` for a display string. The truncation trap and numeric-tail special case remain | Emit `kind`/`values` into the existing catalog files (Layer 1) | ⬜ Rewrite |
| RSP and SWC `ts-cdn-host.js` overlap | D | 172 and 188 lines, 96 differing lines — **less duplicated than assumed**; the SWC file documents the split as deliberate (async vs sync `resolveSpecifier`) | Open question, not a task | ⚠️ Deferred |
| `typescript` undeclared; workflows `git add` a missing file | C | Three SWC modules import `typescript`, absent from `package.json` and the lockfile; both workflows `git add deps/rsp-export-names.js`, which nothing on this branch generates | Declare the dep; reconcile the `git add` lists | ✅ Task 11 |
| Blue background tint committed by accident | D | `139d485` carries a one-line `styles/styles.css` change setting `--se-body-background-color` light value to `#aecee9`; the 2026-08-27 handoff flagged that exact edit as an unrelated pre-existing local experiment | Revert the line, or confirm it was intentional | ✅ Task 11 |

## Design decisions already made (do not re-litigate)

- **Fix the data source, not the consumer.** Making `resolvePickerOptions` implementation-aware was tried *first*, in isolation, and **reverted** — it broke `fillStyle`, `size`, and `variant` on the live SWC Button page entirely, because the AEM controls sheet does not curate options for common enum props. Cutting the RSP fallback removes the only option source for props whose SWC type is an unparseable alias. The same change is correct *now* only because the SWC data underneath it actually resolves. Do not reintroduce the consumer-side fix as a standalone change.
- **No exclusion lists, no hand-edited data.** A narrower interim fix — excluding `premium`/`genai` from SWC's options by name — was considered and explicitly declined. The generated catalogs are rebuilt daily by cron; anything a hand-edit cannot survive is throwaway scaffolding, the same trap already documented for `components.json` in the RSP batch.
- **Package resolution is derived, not tabled.** `deps/swc/cdn-resolve.js` resolves bare specifiers from each package's own published `exports` map, and `findCorePackageName()` discovers the `@adobe/*`-scoped core dependency at run time. This was a deliberate departure from RSP's static `PACKAGE_BASES` table, because that peer package has already been renamed once (`@spectrum-web-components/core` → `@adobe/spectrum-wc-core`).
- **Crawl the CDN at the version `deps/swc/version.json` records, never local `node_modules`.** `package.json` pins `2.0.0-beta.0`; the `@beta` dist-tag currently resolves to `2.0.0-beta.2`. Confirmed drift between them — the local install is missing components entirely (`close-button`), and the peer package name differs.
- **~~`impl-aliases.js` and `rsp-export-names.js` stay separate.~~ Superseded on `refactor-rsp` (2026-09-01).** The distinction is real and still enforced, but it did not need two files: they are now the `docs` and `export` fields of one generated `deps/impl-component-names.js`, and each reader names the field it wants. What shipped the original bug was answering a rendering question with the docs *value*, not the two files sharing a home. `deps/docs/STATUS-FILES.md` documents the current shape.
- **Extend the existing implementation registry; do not build a second one.** A *new* per-implementation registry was proposed to generalize `resolveComponentMeta`'s branching, then walked back — correctly at the time, because it was justified by a hypothetical third implementation. Two things have since changed: ios/android is confirmed for October, and `scripts/utils/implementations.js` already exists and already promises "adding a new web implementation is intended to be a single edit here." The current position is therefore **not** a reversal of that walk-back: still no new registry file, but the playground should stop hardcoding `implementation === 'rsp'` and start importing the registry every other block already uses. Keep those entries a data table — the moment they grow lifecycle hooks, it becomes the thing that was rejected. The generic fallback shell (`blocks/playground/index.html`) and its image-viewer logic stay as they are.

## Priority order

Revised 2026-08-29, after the decisions recorded under "Recreating the playground".

1. ✅ **Tasks 1–7, 13–15** — the SWC type-resolution pipeline, the precedence ladder, and the consumer parse fixes. All on `refactor-swc`.
2. **Task 11** — the four cleanup items. Two of them (undeclared `typescript`, the missing `git add` pathspec) break the daily crons regardless of the rewrite, so they should not wait on it.
3. **Task 12** — decide the RSP pipeline's fate, and **Task 16** with it. Layer 1 needs an extractor that emits `kind`/`values`, which the regex pipeline cannot; and the compiler pipeline cannot land until the table block can filter what it produces.
4. **Task 18** — write down the canonical-name rule and the `implementations` column schema. Cheap, and Layer 1 encodes both.
5. **Rewrite, Layer 1** — normalize both catalogs in place, extraction-only. No block changes; verified by diffing regenerated JSON.
6. **Task 17** — the Playwright smoke test, as the regression net **before** the block branch starts.
7. **Block refactor (separate branch)** — Layer 2 (implementation registry) and Layer 3 (shell extraction) against the Layer 1 contract.

Layer 3 is independent and can move in parallel. Layer 2 depends on Layer 1 having removed the data-shape differences it would otherwise encode.

## Recreating the playground

Both playgrounds are being rebuilt rather than refactored in place. This section is the design input for that rewrite: how the data is actually organized today, the three root causes behind the recurring bugs, and how to structure it so a third and fourth implementation cost a data-table entry instead of a new branch in five functions.

### How the data is organized today

Four independent sources, merged at runtime in `init()`:

| Source | Where | Shape |
|---|---|---|
| Block metadata | the authored page | `implementation` (`rsp`/`swc`/`ios`/`android`) + `component` (slug) |
| AEM workbook (external) | `?sheet=components`, `?sheet=controls` | `component → properties` (the allow-list), `property → control` + curated `options` |
| Generated catalogs | `deps/rsp/data/<Pascal>.json`, `deps/swc/data/swc-<slug>.json` | prop rows carrying a **stringified TypeScript type** |
| Snippet fragments | `deps/rsp/playground/snippets/<slug>.jsx`, `deps/swc/playground/snippets/<slug>.html` | markup — parsed as **XML** for RSP, **HTML** for SWC |

The workbook decides *which* controls appear; the catalogs decide *what values* they offer; the snippet decides what the preview renders.

The two catalogs already diverge in four ways: wrapper (`{ props: [] }` vs a bare array), filename convention, an `attribute` field only SWC carries, and quote style. `playground-data.js` papers over all of it at read time, with `findRspProp`/`findSwcProp` and `propertyNameCandidates` (the `isDisabled ↔ disabled` bridge).

### Root cause 1 — the type is a string, so every consumer is a regex

`type` is a stringified TypeScript type. Two producers emit two quotings:

```
old regex extractor      →  'primary' | 'secondary'     (copied from .d.ts source text)
checker.typeToString()   →  "primary" | "secondary"     (TypeScript's canonical renderer)
```

`parsePickerOptions` matches `/'([^']+)'/g` — single quotes only. Compiler-generated SWC data is double-quoted, so **every SWC enum parses to `[]`**.

The quoting is the symptom. The cause is that **the extractor held the real `ts.Type` — `type.isUnion()`, `union.types.map((t) => t.value)` — and discarded it for a display string the consumer has to reverse-engineer.** Every downstream scar traces to that one decision:

- the quote-style mismatch above;
- `typeToString()` silently truncating to `"a" | "b" | ... 12 more ...`, which the regex parses into a plausible, wrong, short list (this is why `ts.TypeFormatFlags.NoTruncation` had to be discovered by a failing test);
- the `(number & {})` special case for numeric unions;
- no way to distinguish a real union from a description string that happens to contain quotes.

### Root cause 2 — the fetch is unconditional because the merge is unconditional

`fetchPlaygroundInputs` fires both catalog requests regardless of implementation:

```js
fetchJson(`${base}/deps/rsp/data/${componentTitle}.json`).catch(() => []),
fetchJson(`${base}/deps/swc/data/swc-${component}.json`).catch(() => []),
```

Both swallow failure, so an SWC page silently fetches RSP data and an RSP page 404s on SWC data with no signal outside devtools.

### Root cause 3 — RSP data was load-bearing for SWC controls

Three places where RSP data silently propped up the SWC page:

1. **Options.** `resolvePickerOptions` tried RSP *first, always*. SWC's `type` was a bare alias (`"ButtonVariant"`) parsing to `[]`, so **every SWC picker was rendering RSP's option list.** That is exactly why SWC Button offered `premium`/`genai`, and why `size` showed all seven `ElementSize` values.
2. **Booleans.** `rspRow?.type === 'boolean'` fires before SWC's own check.
3. **Defaults.** `parseDefault(swcRow?.default ?? rspRow?.default)`.

`propertyNameCandidates` is what makes the borrowing possible — it deliberately matches RSP's `isDisabled` row to SWC's `disabled` property.

Nobody decided SWC should borrow RSP data. It fell out of "RSP's extractor resolves unions and SWC's does not, so try RSP first." **A capability gap in one extractor became a permanent cross-implementation data dependency in the consumer** — and a load-bearing one: removing the borrow without first fixing the parse turns wrong options into *no* options. That reverted once during the SWC work, and reproduces exactly on this branch today.

### What to reuse, and what not to create

The rewrite should add **no new data files**. Everything it needs already has a home, and in most cases the playground is the one consumer ignoring it:

| Need | Already exists | Do not create |
|---|---|---|
| Implementation registry (id, label, `deps/<id>/` dir) | `scripts/utils/implementations.js` | a per-implementation `descriptor.js` |
| Slug → real export / tag name | `deps/impl-aliases.js` (already keyed by implementation) | a third alias map |
| Component roster | `deps/<impl>/components.json` | — |
| Prop data | `deps/<impl>/data/*.json` | a parallel "normalized catalog" |
| Canonical naming | `deps/component-aliases.json` | — |
| Status | `deps/status-index.json`, `deps/status/*.json` | — |

`scripts/utils/implementations.js` is the important one. Its own doc comment already states the intent:

> Adding a new web implementation is intended to be a single edit here — every block that lists or links implementations … imports from this file. … `id` matches both the directory under `deps/` (e.g. `rsp` → `deps/rsp/`) and the source key in status-model.js.

Four consumers honor that (`status-table`, `component-status`, `breadcrumbs`, `build-status-index.js`). **The playground is the only one that does not import it** — it hardcodes `implementation === 'rsp'` branches instead. The registry is the right home for the playground's per-implementation facts; extend those entries rather than starting a new file beside them.

Likewise `deps/impl-aliases.js` is already shaped `{ rsp: { slug: Name }, swc: { … } }` — per-implementation slug resolution that generalizes to ios/android for free. That existing structure is why a second map (`deps/rsp-export-names.js`) needs a clear, documented reason to exist; `deps/docs/STATUS-FILES.md` gives it one, and that distinction should survive the rewrite.

### Layer 1 — normalize the existing catalogs in place

Change what the existing extractors write into the existing files. Add resolved values alongside the fields already there; do not introduce a new file:

```json
{
  "name": "isDisabled",
  "sourceName": "disabled",
  "attribute": "disabled",
  "slot": false,
  "kind": "boolean",
  "values": [],
  "default": false,
  "type": "boolean",
  "description": "…"
}
```

- **`name`** is the hub's canonical key — what the workbook's `properties` column matches against. Written by the extractor, not resolved at read time.
- **`sourceName`** is the implementation's own spelling (`disabled` on SWC, `isDisabled` on RSP); **`attribute`** is the DOM attribute where one exists, `null` otherwise. The snippet builder needs both; nothing else should.
- **`slot`** records slot-vs-attribute as data. `icon` and the `TEXT_KEYS` render as slot content, and that is a fact about the component, not a display choice.
- **`kind`** + **`values`** are the contract for building a control. `type` stays for the props table to display, and **nothing may branch on it**.

This deletes, outright:

- `parsePickerOptions` — and with it the quote bug, the truncation bug, and the numeric-tail case;
- `normalizePropertyName`, `propertyNameCandidates`, `findRspProp`, `findSwcProp` — the `isDisabled ↔ disabled` bridge moves into extraction, applied once, offline, unit-tested, instead of being re-derived on every read. **The bridge does not disappear** (the workbook stays RSP-keyed while SWC's catalog carries `disabled`); it stops being a runtime guess;
- the `<Pascal>.json` vs `swc-<slug>.json` split, if both settle on `deps/<impl>/data/<slug>.json` — the convention `implementations.js` already documents.

Note `values` must be **source-ordered**, which the checker's union ordering does not preserve — see Tasks 14–15.

Then `fetchPlaygroundInputs` fetches **exactly one catalog, the page's own**. Root causes 2 and 3 become impossible by construction rather than by a guard that can regress again.

### Layer 2 — extend the existing implementation registry

After Layer 1, four things genuinely vary per implementation: snippet extension and parse mode, snippet serializer, preview shell URL, and how the shell applies a prop. Those belong as fields on the existing `IMPLEMENTATIONS` entries, keeping the file's "one edit adds an implementation" promise intact:

```js
{
  id: 'swc',
  label: 'Spectrum Web Components',
  shortLabel: 'SWC',
  playground: {
    shell: 'deps/swc/playground/index.html',
    snippet: { ext: '.html', parse: 'html' },
  },
}
```

`resolveComponentMeta` becomes a lookup instead of a branch chain, and the serializer resolves from `id`. Adding ios/android is then a registry entry, a shell, and an extractor that writes the Layer 1 shape — with no edit to `playground.js`.

Keep this a **data table, not a plugin framework.**

### Layer 3 — get the shells out of HTML

`initRsp()` (~250 lines) and `initSwc()` (~120) are inline `<script type="module">` blocks: unimportable by `node --test`, invisible to `wtr`, unlinted. Extract them regardless of what else changes. The genuinely shared parts already live in `deps/shared/playground/` (theme sync, postMessage contract, prop-listener); what remains is irreducibly framework-specific mounting.

### Decisions taken 2026-08-29 (before Layer 1 starts)

These supersede two earlier suggestions in this document. Both are corrections, recorded so the reasoning is not re-derived.

**The workbook stays the allow-list.** An earlier draft of this section proposed demoting the sheet to control-types-and-overrides and letting the catalog decide which props exist. That is wrong, for two measured reasons:

- RSP's prop counts explode under the compiler pipeline. On the regex pipeline RSP is 679 props across 121 components (median 5, Button 7); post-rewrite it is Button 44 and TextField 60, mostly `aria-*`/`onKeyDown`/`onFocus` passthrough. The allow-list is the only thing keeping a page to a handful of meaningful controls.
- ios/android has **no catalog at all** — no `deps/ios`, no `deps/android`, no image assets. The fallback shell builds `/playground/<component>/images/<impl>/<sorted-props>.png` from live prop values, so it has controls sourced entirely from the workbook with options curated in the controls sheet.

So: **the workbook answers "which props, in what order"; the catalog answers "what kind, what values."** Root causes 2 and 3 still die, because the catalog lookup becomes single-implementation either way.

**A catalog is optional per implementation.** An implementation supplies zero or more of: authored images, an authored prop list, a `deps/<impl>/data/` directory. Nothing in the design may assume a catalog exists. This is a firmer contract than the earlier draft's, and it is what lets ios/android land in October without a data pipeline.

**Canonical property names keep RSP's spelling — but as the hub's vocabulary, not RSP's.** The controls sheet is already RSP-keyed: 10 of its 38 rows use React's boolean prefix (`isDisabled`, `isPending`, `isQuiet`, `isEmphasized`, `isJustified`, `isIndeterminate`, `isRequired`, `isLoading`, `isPrimaryActionDisabled`, `isSecondaryActionDisabled`). An earlier draft called this "convenient today and wrong in principle." That was overstated — Spectrum's design docs say "disabled", but SwiftUI also uses `is` prefixes and Compose uses `enabled`, so there is no cross-implementation convention for RSP's spelling to be wrong against. Re-keying would be migration for its own sake.

The real gap is that this was never written down, so a new row could say `disabled` or `isDisabled` and `propertyNameCandidates` would absorb either silently. **Document the rule instead of changing the names:** canonical names use the `is`/`has` boolean prefix; each implementation's own spelling and DOM attribute live in the catalog row.

### Workbook schema — the `implementations` column

The `components` tab gains an `implementations` column holding a comma-separated array, so a component is authored once for every implementation that shares its prop list:

```
component | implementations | properties
button    | ios, rsp, swc   | variant, size, fillStyle, isDisabled
badge     | rsp             | variant, size, fillStyle
badge     | swc             | variant, size
```

Lookup becomes `(component, implementations ∋ page's implementation)` rather than component alone. This keeps author-once as the default while making genuine divergence explicit — Badge's `fillStyle` exists on RSP and not SWC, which today surfaces only as a console warning.

Two failure modes need deciding when this is implemented:

- **No matching row.** Today an unmatched component silently renders zero controls. This should be loud.
- **Two matching rows** (the same implementation listed twice for one component). Ambiguous; recommend failing rather than picking the first.

### Layer 1 minimum contract

The full `kind` taxonomy is deliberately deferred until the RSP refactor is underway — RSP's props (`ReactNode` children, event handlers, style objects) will stress it in ways SWC's attributes do not. The minimum that unblocks SWC now:

- `kind`: one of `enum`, `boolean`, `text`, `number`.
- `values`: the resolved options, **in source order** (see the ordering note in Tasks 14–15).
- slot-vs-attribute recorded as its **own field**, not folded into `kind` — `icon` and the `TEXT_KEYS` render as slot content rather than attributes, and that is data, not presentation.
- the sheet's `control` column keeps describing the widget; `kind` describes the data.

### Sequencing

Extraction refactors land here; the playground block refactor gets its own branch. The block work is what proves the extraction contract, so this document must carry a spec precise enough to build against before that branch starts.

### Verifying 157 pages — Playwright smoke test

Playwright is already wired for accessibility (`playwright.config.js`, `npm run test:a11y`, CI installs chromium and uploads reports), and `test/a11y/coverage.spec.js` is structurally the same idea: a background spec that fails CI when a block has no coverage.

A playground smoke test visits each component page and asserts the rendered controls match the authored `properties` for that implementation — catching both a dropped control and an unauthored one. One design choice: **mock the workbook for the CI gate** (deterministic; content changes should not fail an unrelated PR) and keep a **separate live-drift check that reports rather than blocks**.

## Tasks

### Task 1 — SWC CDN resolution — DONE (`swc-types`)
**Files:** `deps/swc/cdn-resolve.js` (204 lines, new)

`resolveSpecifier()` resolves bare specifiers through each package's own published `exports` map, fetched and cached per package+version. `findCorePackageName()` discovers the core peer dependency by scope rather than by hardcoded name. `rebaseInheritedModule()` implements the one transform the CEM needs: `inheritedFrom.module` is a monorepo-relative path (`../core/mixins/sized-mixin.ts`) that does not map onto the published layout (`@adobe/spectrum-wc-core`'s `dist/mixins/sized-mixin.d.ts`), so the `../core/` prefix is stripped and the remainder rebased onto the other package's `dist/` root. **The rebase held with zero exceptions** across every `inheritedFrom.module` value in the live CEM, not just Button's. 20 tests in `test/extractions/swc-cdn-resolve.node.test.js`.

### Task 2 — SWC compiler host — DONE (`swc-types`)
**Files:** `deps/swc/ts-cdn-host.js` (188 lines, new)

Same two-phase split as RSP's: async `crawl()` walks the import graph into a cache, then synchronous `buildProgram()` builds a `ts.CompilerHost` from it with no further network. Differs from RSP's in one structural way — it threads a `resolutionCache` alongside the file cache, because this pipeline's `resolveSpecifier` is async and TypeScript's `resolveModuleNameLiterals` is not, so every resolution has to be precomputed during the crawl. TypeScript's own `lib.*.d.ts` files are read from the installed package rather than fetched. 10 tests in `test/extractions/swc-ts-cdn-host.node.test.js`.

### Task 3 — Attribute type resolution — DONE (`swc-types`)
**Files:** `deps/swc/resolve-attribute-types.js` (212 lines, new)

`needsResolution()` gates on a bare-identifier pattern with a `NEVER_RESOLVE` set for primitives. `collectResolutionTargets()` locates each attribute's declaring file — the component's own `mod.path` for own-attributes, the rebased `inheritedFrom.module` for inherited ones. `resolveTargets()` reads the property off the declaration and stringifies it with `ts.TypeFormatFlags.NoTruncation`.

Two findings worth keeping:

- **No general heritage-chain walking was needed.** `type.getBaseTypes()` returns empty for every SWC component class, because Lit's `class X extends X_base` intersection pattern defeats it — but reading a property directly off the declaration's own `getPropertiesOfType()` works regardless, since the CEM's `inheritedFrom` already did the flattening.
- **One level of override-checking was needed, and was added after initial ship.** Shipping v1 without it resolved `size` to the mixin's wider `ElementSize`. `resolveTargets()` now checks the direct superclass's own declared members first, via `findNamedDeclarationMember()` searching the already-crawled program — no second file resolution, since the component's entry file transitively imports its superclass. **Residual limitation:** a narrowing declared *two or more* hops up the chain still resolves to the mixin's wider type. Not hit in the current catalog — every `size` attribute now resolves to a component-specific range (`s/m/l/xl` for most, `s/m/l` for Divider/IllustratedMessage/ProgressCircle/Popover, `s/m/l/xl/xs` for Icon) — but it would need a second hop if it ever is.

21 tests in `test/extractions/resolve-attribute-types.node.test.js`, including the truncation regression test.

### Task 4 — Wire resolution into extraction and the consumer — DONE (`swc-types`)
**Files:** `deps/swc/extract-cem-components.js`, `blocks/playground/playground-data.js`, `deps/swc/data/*.json`

`resolveAllAttributeTypes()` batches the whole catalog into **one** shared crawl and compile pass, keyed `"tag::attributeName"` — most declaring files (mixins, the shared `element` base, lit) are reused across many components, so per-component crawling would refetch them ~35 times. It runs only on the CI path, where a concrete resolved `version` exists to pin the crawl to; the manual `<cem-path>` workflow writes bare alias names as before. A failure degrades to "no resolution this run" rather than aborting — every attribute still gets written.

On the consumer side, `resolvePickerOptions()` gained an `implementation` parameter: an SWC page tries SWC's own now-resolved type and never falls back to RSP's. `resolveControl()` falls through to the controls sheet's curated options when neither resolves, the same role that fallback already plays for `icon`. `parsePickerOptions()` was widened to accept double-quoted literals, since `checker.typeToString()` emits those where hand-authored `.d.ts` text uses single quotes.

22 `deps/swc/data/*.json` files changed, reviewed component-by-component. Verified live on SWC Button, Accordion, and Badge, and confirmed RSP's own Button page still shows `premium`/`genai` — correct there.

### Task 5 — Status and alias file audit — DONE (`swc-types`, `ae102b9`)
**Files:** `scripts/utils/extraction-status.js` (renamed), `deps/figma/components.json` (renamed), `deps/docs/STATUS-FILES.md` (new, 100 lines), `deps/docs/DATA-CONTRACT.md`, `blocks/table/table.js`, `deps/build-status-index.js`, `deps/component-aliases.json`, `deps/figma/fetch-figma-components.js`

Both renames resolved real name collisions. `STATUS-FILES.md` is a "where do I put an override" map of every file in the status-index build pipeline, cross-linked from `DATA-CONTRACT.md`, and documents explicitly why `impl-aliases.js` and `rsp-export-names.js` are not redundant.

### Task 6 — CI gaps — DONE (`swc-types`, `263d42d`)
**Files:** `.github/workflows/extract-swc-properties.yml`, `.github/workflows/extract-rsp-properties.yml`

Both were **production-breaking, not test-only**. `extract-swc-properties.yml` had no `npm ci` step at all, so the next scheduled run would have failed outright the moment `extract-cem-components.js` started importing `typescript`. Neither workflow's `git add` list included `deps/rsp-export-names.js`, so drift there would have been silently discarded every run.

### Task 7 — Coverage for previously-untested fixes — DONE (`swc-types`, `263d42d`)
**Files:** `test/extractions/extract-cem-components.node.test.js`, `test/blocks/playground.test.js`

Eight tests closing real gaps: `findDeclarationAndModule` and `resolveAllAttributeTypes` (the latter exported for this purpose), plus RSP export-name aliasing and the skip-SWC-fetch-on-RSP-pages behavior — both previously-shipped bug fixes that had no regression coverage until now.

Full suite on `swc-types`: **423 node tests + 704 browser tests, all green.**

### Tasks 8–10 — SUPERSEDED by the rewrite

The original items — extract the shells, split `playground.js`, DRY the two `ts-cdn-host.js` files — assumed a refactor in place. The playground is being recreated instead, so they fold into "Recreating the playground" above: shell extraction survives as Layer 3, the `playground.js` split is absorbed by Layers 1–2, and the `ts-cdn-host.js` question is deferred until both extractors are rewritten against the Layer 1 contract.

One measurement from the original analysis is worth keeping, because it contradicts the assumption it was filed under: the two `ts-cdn-host.js` files differ on **96 of ~180 lines**, and the SWC file's own header documents the duplication as deliberate — its `resolveSpecifier` is async (fetching each package's published manifest on demand) where RSP's is a synchronous table lookup, which is why only the SWC side threads a `resolutionCache`. Sharing them means either making RSP's pipeline async for no reason it needs, or a resolver-injection refactor of a working file. Treat "DRY these two" as an open question, not a task.

### Task 11 — Cleanup that survives the rewrite — NOT STARTED
These are real defects independent of how the playground is rebuilt.

1. **`typescript` is not declared as a dependency.** `deps/swc/ts-cdn-host.js` and `deps/swc/resolve-attribute-types.js` both `import ts from 'typescript'`, but `package.json` does not list it and `package-lock.json` has no install entry — the only matches are an unrelated package's optional peer range (`">=4.9.5"`). It resolves locally only because `node_modules/typescript@5.9.3` is a leftover from another branch. `extract-swc-properties.yml` correctly runs `npm ci`, which installs strictly from the lockfile, so **the next scheduled SWC extraction fails with `Cannot find package 'typescript'`** — as would a fresh clone running the three SWC test files. Add `"typescript": "^5.9.3"` to `devDependencies` and commit the lockfile.
2. **Both workflows `git add` a file that does not exist.** `deps/rsp-export-names.js` is in the `git add` list of `extract-rsp-properties.yml` and `extract-swc-properties.yml`, but its generator (`6f30e78`) was not cherry-picked and nothing on this branch writes it. `git add` on a missing pathspec is a hard error (`fatal: pathspec … did not match any files`), so **the commit step of both daily crons fails every run.** `deps/docs/STATUS-FILES.md` also documents the file and links to it at `../rsp-export-names.js`. Either restore the generator or drop the references from all three places together.
3. **`deps/rsp/playground/snippets/checkbox-group.jsx` has a stray `>`.** Line 20 closes the opening tag with `}>`; line 21 is a second, bare `>`. RSP snippets are parsed with `DOMParser(..., 'application/xml')`, so this is a parse error — `parseXmlFragmentRoot` returns `null` and the preview degrades silently rather than reporting anything. The added `contextualHelp={<ContextualHelp>…}` prop also needs checking against that XML parse path before it is trusted.
4. **`styles/styles.css` carries an unrelated experiment.** `--se-body-background-color`'s light value is `#aecee9` instead of `#fff`. The 2026-08-27 handoff flagged this exact edit as a pre-existing uncommitted local change; it was swept into `139d485`. `blocks/playground/preview-shell.css`, flagged in the same handoff, was not swept in and is clean.

### Task 12 — Decide the RSP pipeline's fate — NOT STARTED
`refactor-swc` carries the **old** regex-based RSP extractor while `swc-types` carries the TS-compiler rewrite (`a213393`…`4b5a370`, plus `deps/rsp/{cdn-resolve,ts-cdn-host}.js` and a fully regenerated catalog). The RSP side here is internally consistent, so nothing is broken today — but Layer 1 assumes an extractor that can emit `kind`/`values`, which the regex pipeline cannot do reliably. Decide before Layer 1 starts whether the RSP rewrite is brought over, redone against the new contract, or the RSP playground stays on regex-derived data with a documented capability gap.

### Task 13 — Parse compiler-resolved unions — DONE (`refactor-swc`)
**Files:** `blocks/playground/playground-data.js`, `test/extractions/playground-data.node.test.js`

The SWC type resolution was already working — every union in `deps/swc/data/*.json` is fully resolved, with no truncation anywhere (badge's `variant` carries all 25 values, button's `size` the correctly narrowed `"s" | "m" | "l" | "xl"`). The break was entirely consumer-side: `parsePickerOptions` matched `/'([^']+)'/g`, single quotes only, while `checker.typeToString()` emits double quotes. Every compiler-resolved union parsed to `[]` and every SWC enum lost its picker.

Widened the regex to `/'([^']+)'|"([^"]+)"/g`. This restores the un-cherry-picked `78ca443` and is the right shape for this branch regardless, since RSP data here is single-quoted (old regex extractor) and SWC data is double-quoted (compiler) — both must parse.

Verified as strictly additive: a sweep across every prop row in both catalogs found **787 rows unchanged, 43 newly resolved, 0 behavior changes**. Node suite 542/542. Browser suite 762 passing, with the same 2 pre-existing failures that need the un-cherry-picked `6f30e78`/`60772ec`. Confirmed live on the three reported pages — badge `variant` renders 25 options, button `size` 4, progress-bar `labelPosition` 2, and SWC Button's `variant` is `accent`/`negative`/`primary`/`secondary` with no `premium`/`genai`.

Two tests added at the `parsePickerOptions` unit level (a double-quoted union, and a long one to guard member-dropping); the existing `resolvePickerOptions`/`resolveControl` tests already covered it at the integration level and were red before this change.

**This does not close Layer 1.** The remaining warnings on those pages are a different, correct category — `fillStyle`/`overflowMode` on badge and `formatOptions` on progress-bar are authored in the workbook but genuinely absent from SWC's data, which is the "no `implementation` column" constraint documented above, not a bug.

### Task 14 — Resolution precedence ladder (`static VALID_SIZES`) — DONE (`refactor-swc`)
**Files:** `deps/swc/resolve-attribute-types.js`, `test/extractions/resolve-attribute-types.node.test.js`, `deps/swc/data/swc-action-button.json`

Action Button offers an `xs` size that never reached the playground. Tracing it turned up a **systematic CEM inaccuracy, not an edge case**: the published manifest claims `size: ElementSize` (all 7 of `xxs`–`xxl`) for **12 of the 16** size-bearing components, and is wrong for all 12. Button is really 4, divider 3, icon 5, progress-circle 3, action-button 5. Only the four components that declare their own narrowed type (accordion-item, avatar, illustrated-message, popover) are described correctly.

The cause is that `SizedMixin` takes each component's real range as a **runtime argument** (`SizedMixin(base, { validSizes })`) and its declared return type widens `size` straight back to `ElementSize`. The CEM analyzer and TypeScript are equally blind to it. The CEM does **not** record `VALID_SIZES` at all, so it cannot be recovered from the manifest.

The superclass-override check (Task 3) already recovered 11 of the 12. Action Button is the twelfth: it never declares `size` at all, so it inherits `ButtonBase`'s `size: ButtonSize` (4 values) — a correct read of an incorrect declaration. Its real range reaches the type system only as the type argument of `static readonly VALID_SIZES: readonly ActionButtonSize[]`, which is a documented part of the `SizedElementConstructor` mixin contract.

Rather than bolt a second override alongside the first, `resolveTargets()` now applies an explicit precedence ladder:

1. the component's own `static readonly VALID_<MEMBER>S` — SWC's own declared contract;
2. the direct superclass's declared member — right for 11 of 12;
3. the CEM-attributed declaring file.

Rung 1 matches members **syntactically** within the component's own class body, deliberately not via `checker.getPropertiesOfType()`: `SizedMixin`'s own `SizedElementConstructor` also declares `VALID_SIZES`, but as the generic `readonly ElementSize[]`, and inheriting that would be strictly worse than rung 2. A regression test covers exactly that.

Regenerating the full catalog changed **one line in one file** — `swc-action-button.json`'s `size` gained `"xs"`. Node suite 544/544; browser suite unchanged at the same 2 pre-existing failures. Verified live: the Action Button playground now offers 5 sizes.

**Known cosmetic wrinkle:** the checker's union ordering puts the new member last, so the control reads `s, m, l, xl, xs` rather than source order `xs, s, m, l, xl`. Icon already behaved this way; not a regression, but Layer 1's `values` array should preserve source order when it lands.

**The real fix is still upstream.** The CEM should describe the component's actual API — either a `@attribute {ActionButtonSize} size` JSDoc (a pattern `ButtonBase` already uses) or teaching the analyzer to read the mixin's `validSizes`, which would correct all 12 at once. Worth filing with the SWC team; rungs 1–2 are compensation carried on our side until it lands, and both become no-ops if it does.

### Task 15 — Resolve attributes the CEM flattened to `string` — DONE (`refactor-swc`)
**Files:** `deps/swc/resolve-attribute-types.js`, `test/extractions/resolve-attribute-types.node.test.js`, `deps/swc/data/swc-status-light.json`

Status Light's `variant` warned with `its type ("string") isn't a boolean or a list of options`. It is genuinely declared `variant: StatusLightVariant` — a 19-value union — but the CEM records `"string"`.

**Cause: the CEM analyzer trusts a JSDoc `@property` annotation over the real TypeScript declaration.** `StatusLight.d.ts` carries a lazy `@property {string} variant`, and that annotation wins over the class's own `variant: StatusLightVariant`. This is a **third distinct CEM failure mode**, separate from the two already recorded (unexpanded alias names; mixin-widened `size`).

`"string"` had been in `NEVER_RESOLVE` — correct in principle, since a genuinely-string attribute has nothing to resolve. But it is the one primitive that can mask a string-literal union, so it is now always attempted. Measured before changing anything: the CEM types 32 attributes as bare `string`, and **only this one is a lie** — the rest are real labels, `src`, `placeholder`, `value`. A genuine string resolves back to `"string"` and is written unchanged, which regenerating confirmed: **one file changed, one line**. `boolean`/`number` stay in `NEVER_RESOLVE` — neither can mask a string union.

Node suite 547/547; browser unchanged at the same 2 pre-existing failures. Full-catalog artifact sweep still clean. Verified live: the Status Light playground has **zero** console warnings and `variant` offers all 19 options.

Same cosmetic wrinkle as Task 14 — the checker's union ordering puts `info` last rather than source order (`neutral, info, positive, …`). Layer 1's `values` array should preserve source order.

**Upstream fix:** `@property {StatusLightVariant} variant`, one word. Worth bundling into the same SWC report as Task 14's `VALID_SIZES` finding — together they show the published CEM misdescribes types in three different ways, which is a stronger case than any one of them alone.

### Task 16 — Table block prop filtering — DONE (`main`, `db99e9a`)
**Files:** `blocks/table/table.js`

The RSP compiler pipeline takes components from ~5 props to ~40 — Button 7→44, TextField 5→60 — mostly legitimate DOM/ARIA passthrough (`aria-*`, `onKeyDown`, `onFocus`, `styles`). The playground is insulated by the workbook allow-list, but `blocks/table/table.js` renders the **full** prop table and has no such filter.

[The RSP plan](./2026-08-13-rsp-playground-inheritance-gap-fixes.md) flagged this during the Phase 1 spike as "a real per-component filtering pass (Phase 2 scope decision, not a bug)" and it went undecided until this task. It was a genuine prerequisite: landing the compiler rewrite without it would have made every RSP prop table unreadable overnight.

**Shipped as filter-at-render**, the middle option of the three weighed here: `EXCLUDED_SOURCES` in `blocks/table/table.js` is an 18-entry set of base interfaces (`StyleProps`, `DOMProps`, `AriaLabelingProps`, `PressEvents`, `TextInputDOMEvents`, …) filtered on each row's `inheritedFrom`. The catalog stays complete, so a consumer wanting the full list still has it, and the rule reads as one declarative set rather than a per-component list to maintain. The `passthrough: true` extraction flag was not needed — `inheritedFrom` already carries the same fact, and adding a second field derived from it would have been the redundancy this plan warns against elsewhere.

The original three options are kept above because the reasoning is still the operative precedent: if a passthrough prop ever needs excluding *without* a distinguishing `inheritedFrom`, that is when the flag earns its place.

### Task 17 — Playground control smoke test — NOT STARTED
**Files:** `test/playground/` (new), `playwright.config.js`

Visit each component page and assert the rendered controls match the authored `properties` for that page's implementation — catching a dropped control (a resolution failure) and an unauthored one (a stale sheet row) in one pass, across all 157 pages rather than the three-at-a-time spot-checking used so far.

Infrastructure already exists: Playwright is wired for accessibility (`playwright.config.js`, `npm run test:a11y`, CI installs chromium and uploads reports), and `test/a11y/coverage.spec.js` is structurally the same pattern — a background spec that fails CI when a block lacks coverage. `test/a11y/mocks.js` already establishes route-mocking.

Build **two** checks, not one: a mocked-workbook version as the CI gate (deterministic — a content edit should never fail an unrelated PR), and a live-workbook drift check that reports rather than blocks.

This is the regression net for the block refactor. It should exist **before** that branch starts, not after.

### Task 18 — Document the canonical-name rule — DONE (`refactor-rsp`)
**Files:** `deps/docs/PLAYGROUND-CONTRACT.md` (new), `deps/docs/DATA-CONTRACT.md`, `deps/rsp/README.md`, `deps/swc/README.md`

`DATA-CONTRACT.md` turned out to be about status resolution rather than the prop-row contract, so the consumer rules got their own file. `PLAYGROUND-CONTRACT.md` records the canonical-name rule (`is`/`has` prefix, each implementation's own spelling in its catalog row, the bridge as a documented mapping that retires when SWC emits a canonical name) alongside the rest of the consumer contract: one catalog per page, options from `values` and never `type`, `attribute` never crossing implementations, the catalog-only existence gate, and the derived "None" rule being SWC-only.

It points at the row shape rather than restating it, and closes with the known gaps and a table of which test enforces which rule. Both implementation READMEs link to it; two stale claims were corrected while doing this — the RSP README still listed union ordering as a limitation after it was fixed, and `DATA-CONTRACT.md` still pointed at `swc-data-contract.node.test.js`, which no longer exists.

### Task 19 — Layer 1 (SWC extraction half) — DONE (`refactor-swc`)
**Files:** `deps/swc/resolve-attribute-types.js`, `deps/swc/extract-cem-components.js`, their two test files, `deps/swc/data/*.json`

Every SWC row now carries `kind` and `values` — structured data straight from the TypeScript checker — so no consumer re-parses a type string. This is root cause 1's actual fix; the Task 13 quote widening was the symptom patch.

- `resolveTargets()` returns `{ type, values }` instead of a display string. `values` are real JSON (strings stay strings, numbers stay numbers), taken from the checker's union members, empty unless **every** non-nullish member is a literal — a union mixing literals with an open type has no fixed option set to offer.
- Nullish members are dropped, never offered. "None" stays a control-layer sentinel (`NO_ICON` / `NONE_OPTION`), matching the established pattern.
- `needsResolution()` now also accepts an already-inline literal union. Those needed no *expansion*, but their `values` must come from the checker like everything else rather than from a second, string-parsing code path.
- `attributeKind()` classifies `enum` / `boolean` / `text` / `number`, falling through to `unknown` — which draws no control and keeps the existing skip warning. It sees through a nullable primitive, so `number | null` is `number`.

Catalog after regenerating: **enum 50, boolean 45, text 39, number 15, unknown 2**. The only `unknown` rows are `action-button.aria-haspopup` and `aria-expanded`, which reach the CEM with no type at all — correctly left alone rather than guessed. Contract check across every row: `kind === 'enum'` if and only if `values` is non-empty, zero violations.

32 data files changed, almost entirely additive. Five `type` values moved, all explained: four were inline unions now resolving through the checker (quote normalization, same values; one also drops a `| undefined`), and `user-message.type` **reordered without losing a value** — the type-ID interning effect described below.

Node suite 552/552. Browser suite unchanged at the same 2 pre-existing failures. Verified live that SWC Button is untouched — nothing consumes `kind`/`values` yet, which is the intended state for an extraction-only change.

**Deferred: source ordering.** `values` follows the checker's order, which interns unions by type ID — first encounter across the whole program — so it is not source order. ActionButton's `xs` sorts behind ButtonSize's `s|m|l|xl`; `user-message.type` reordered for the same reason once `upload-artifact.type` was resolved in the same program. A probe confirmed the fix works: walk the alias back to its `(typeof CONST)[number]` tuple and read `checker.getTypeArguments()`, which gives declaration order. Roughly 30 lines of AST walking for a cosmetic gap on three components — deferred deliberately, not overlooked.

**Not in this task:** slots. The CEM records them explicitly (`slots: [{ name: "" }, { name: "icon" }]`), which is strictly better than the `TEXT_KEYS` name heuristic, but they have nowhere to live until the file wrapper is unified (`deps/rsp/data` uses `{ props: [] }`, SWC a bare array) and no consumer until the block branch. Shipping them now would be unused data. Recorded so the CEM's own slot list is used rather than re-deriving a heuristic.

**Still open for Layer 1:** the RSP half, which is gated on Task 12.

### Task 20 — Close the Layer 1 coverage gaps — DONE (`refactor-swc`)
**Files:** `deps/swc/extract-cem-components.js`, both extraction test files

An audit of Task 19 found four contract points that were **documented in comments but never asserted** — the same shape as the `NoTruncation` bug, which shipped because a plausible-looking behavior had no test. All four now have one:

- numeric union values stay numbers, not strings (decision A);
- `undefined`/`null` are dropped from `values`, never offered (decision B);
- a union mixing literals with an open type (`"a" | "b" | (string & {})`) yields **no** values — offering only the literal half would be a plausible, wrong option list;
- the resolution write-back, previously inline in `main()` and therefore untestable.

The first three passed on the first run: the implementation was already correct, it just had nothing locking it in. The fourth required extracting `applyResolvedTypes(rows, resolvedTypes, tag)` out of `main()` — now covered for the applied case, the no-result case (row keeps its bare type), and tag isolation (one component cannot pick up another's resolution).

Node suite 558/558. Regenerating the catalog produced a **byte-identical** result, confirming the extraction was a pure refactor. Coverage on the two modules: `resolve-attribute-types.js` 100% line / 100% function / 94.85% branch; `extract-cem-components.js` 76.98% line, with the remainder being `main()` — the CLI entry point, exercised by the daily workflow rather than by unit tests.

### Task 21 — `implementation` column in the components sheet — DONE (`refactor-swc`)
**Files:** `blocks/playground/playground-data.js`, `blocks/playground/playground.js`, `test/extractions/playground-data.node.test.js`

`getComponentProperties(name, implementation, componentsSheet, onSkip)` now resolves the authored property list per implementation, so a component can be authored once for every implementation that shares a list or split where they diverge (Badge has `fillStyle` on RSP but not SWC).

Resolution order:

1. a row whose `implementation` column lists the page's implementation — read as a comma-separated list, case- and space-insensitive;
2. otherwise a row with no `implementation` at all, so pre-existing rows keep serving every implementation and no backfill is forced;
3. no row for the component, or rows that exist but none covering this implementation — warn and return nothing;
4. two rows claiming the same implementation — warn and take the first.

Cases 3 and 4 warn rather than silently picking, because a dropped property is indistinguishable from one that was never authored. Previously an unknown component returned `[]` in silence.

7 new tests; node suite 569/569, browser unchanged at the same 2 pre-existing failures.

**Sheet state at implementation time** (preview, not yet published): 78 of 89 rows carry a value, most of them `rsp` only. Three SWC components have a row that omits `swc` and will render zero controls until it is added — **`avatar`, `button`, `button-group`**. A further 17 SWC components have no sheet row at all (`accordion-item`, `asset`, `icon`, `tab`, `tab-panel`, and the AI cluster) — a pre-existing gap, now warned instead of silent.

### Task 22 — "None" for optional attributes, derived not hardcoded — DONE (`refactor-swc`)
**Files:** `deps/swc/resolve-attribute-types.js`, `deps/swc/extract-cem-components.js`, `blocks/playground/playground-data.js`, `blocks/table/table.js`, `deps/swc/playground/apply-swc-prop.js`, `deps/rsp/playground/index.html`, `deps/shared/playground/unset-control-options.js`

SWC Badge's `fixed` control needed a "none" choice like `staticColor`. The signal turned out to be in the type system already: `fixed?: FixedValues` and `staticColor?: ButtonStaticColor` are **optional**, while `size`, `variant` and `subtle` are not. So this generalizes rather than adding a third hardcoded property name.

- `resolveTargets()` now reports `optional` per attribute, read from the **symbol's** `ts.SymbolFlags.Optional` rather than from the type. `strictNullChecks` is off in `buildProgram`, so `?` never widens a type to include `undefined` — reading the type would have silently reported everything as required.
- Every row carries `optional`, defaulting false.
- `resolveControl()` prepends the sentinel when a row is optional. This **replaces** the `property === 'staticColor'` special case for SWC; the name is kept only as a fallback for RSP, whose extractor does not emit `optional` yet, and should go when it is rewritten.
- The apply path (both the SWC module and the RSP shell) now removes the attribute for **any** property whose value is the sentinel, rather than gating on the property name.
- `static-color-options.js` became `unset-control-options.js` (`NO_STATIC_COLOR` → `NONE_OPTION`); the value `'None'` is unchanged, so nothing shifts behaviourally. **Superseded by Task 23** — that readable value turned out to collide with real catalog values and is now the opaque `__unset_none__`, displayed via `optionLabel()`.

19 of 151 attributes are optional. The enums among them now lead with "None": `badge.fixed`, every `static-color`, `message-feedback.status`, plus **`accordion-item.size` and `popover.size`** — both genuinely declared optional, so a "None" meaning "use the default" is consistent, but it is a change nobody asked for and worth a look.

`optional` was also added to `table.js`'s `EXCLUDED_COLUMNS` — the same trap as `kind`/`values`, since unrecognised row keys are appended as columns.

570/570 node; browser unchanged at the same 2 pre-existing failures; lint clean. Verified live: SWC Badge's `fixed` reads `None, block-start, block-end, inline-start, inline-end`, and the table columns are untouched.

### Task 23 — An unset sentinel must not look like a real value — DONE (`refactor-playground`)
**Files:** `deps/shared/playground/unset-control-options.js`, `blocks/playground/playground.js`, `blocks/playground/index.html`, `test/extractions/playground-data.node.test.js`, `test/blocks/playground.test.js`, `deps/docs/PLAYGROUND-CONTRACT.md`

Task 22 introduced `NONE_OPTION = 'None'` and the block refactor added `DEFAULT_OPTION = 'default'` for ColorArea's derived channels. Both were readable strings used directly as the option's value, and `isUnsetOption()` is a pure string test — so any catalog value spelled the same way was read as "unset".

**Seven RSP props ship `"default"` as a genuine enum member**: `ColorSwatch.rounding`, `ColorSwatchPicker.rounding`, `ContextualHelpPopover.padding`, `CustomDialog.padding`, `Popover.padding`, `Slider.thumbStyle`, `RangeSlider.thumbStyle`. Six were harmless by coincidence — their own `default` is also `default`, so dropping the prop matched passing it. `ColorSwatchPicker.rounding` defaults to `none`, so selecting `default` deleted the prop and rendered `none`: the control displayed one value while the preview and the code disclosure showed another. `SwatchGroup` is `rsp=available`, so the page is live; whether a reader hits it depends only on the workbook authoring `rounding` for it.

The fix separates the wire value from the label, which is the distinction that was missing rather than a new mechanism:

- the sentinels are now `__unset_none__` / `__unset_default__` — values no catalog can produce;
- `optionLabel(value)` returns `'None'` / `'default'` for a sentinel and the value itself otherwise, and both control builders (`buildPickerControl`, `buildSegmentedControl`) render it, so an opaque sentinel is never shown;
- the generic image shell drops unset props from its filename and `alt` text. It builds `${k}-${v}` into a URL, so an opaque sentinel had to be kept out of one — and "absent" should name no image variant anyway.

Guarded two ways: a unit test asserts `isUnsetOption` rejects `'default'`, `'None'`, `'none'`, `'full'` and `'precise'`; and a test reads **the real catalogs** to assert neither sentinel appears in any row's `values`, with a companion asserting `'default'` still does — so the guard is proven to bite, and a future upstream enum member matching a sentinel fails a test rather than a page.

676/676 node, 798/798 browser, lint clean. **This is the bug Task 17 would have caught**, which is the argument for building it.
