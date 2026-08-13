# RSP Playground Bug Batch — Root-Cause Fixes

**Status: nothing implemented; re-prioritized** (2026-08-13). Task 1 (the `LabelableProps` extends fix) plus a durability shim in `discover-components.js` were built, verified working end-to-end, then **reverted back to a clean tree** — the shim would have been thrown away as soon as Task 9 (the compiler rewrite) landed, and the user decided not to spend time on throwaway scaffolding. Reconsidering scope at that point surfaced that **Task 9 only fixes Class A** (~9 of the 25 reports) — it touches `extract-base-props.js`/`extract-props.js` only, so it does nothing for Class B/C/D (~16 of the 25). Decision: **fix Class B/C/D first (Tasks 4–8 below), Task 9 last.** Task 9 is real and worth doing eventually, but it's not the lever that clears most of this batch.

This plan classifies 25 reported RSP-playground bugs by actual root cause (verified against the code and, for the console-warning question, against a live browser reproduction), then lays out fixes. It does **not** treat "we never scanned the upstream package for inherited properties" as the explanation for all 25 — that hypothesis holds for about a third of them; the rest are distinct bugs with distinct fixes. Forcing everything into one bucket would under-fix the real inheritance gap (see [[rsp-base-props-inheritance-gap]]) while leaving several unrelated defects unaddressed.

> **For agentic workers:** Use `.ai/skills/test-driven-development/SKILL.md` for Tasks 1–6 (all are testable Node/browser logic). Task 9 (long-term compiler rewrite) should be spiked on its own branch per the existing recommendation in memory before committing to the full swap — do it last, not first, since it only covers Class A.
>
> **On shims:** Task 1 (Class A, `LabelableProps`) is deliberately sequenced last among the "fast" tasks. Don't re-implement it — or any other durability workaround for the auto-generated `components.json`/`discover-components.js` pipeline — without checking in first. The daily `extract-rsp-properties.yml` cron will silently revert any hand-edit to `components.json` that discovery can't itself re-derive; anything patching around that is throwaway scaffolding once Task 9 lands, and the user has already declined to spend time on that once.

## Root-cause classes

- **A — Missing inherited-prop resolution.** Same mechanism as the previously-fixed `isDisabled` gap: `deps/rsp/components.json`'s `extends`/`includes` entry for the component omits an interface that actually declares the missing prop, and `deps/rsp/extract-props.js` only resolves one hop (never transitive), so the prop never reaches the component's `deps/rsp/data/<Name>.json`.
- **B — Data is correct; the playground UI/apply logic is broken.** The prop **is** present in the generated JSON; the bug is in `blocks/playground/` or `deps/rsp/playground/`.
- **C — Component never added to the catalog at all.** No `components.json` entry, no `.d.ts` scan, nothing to extract.
- **D — Other.** CSS/visual, upstream-library behavior, or a composition/context requirement — not a prop-extraction issue.

## Classification table

| Item | Class | Evidence | Fix |
|---|---|---|---|
| Number field (label) | A | `components.json` NumberField extends `[NumberFieldProps, StyleProps, InputProps]` — no `LabelableProps`; `label` is declared on `LabelableProps` in `rsp-base-props.json` | Add `LabelableProps` to `extends` |
| Picker (label) | A | Same gap — extends omits `LabelableProps` | Add `LabelableProps` to `extends` |
| Progress Circle (label) | A | Same gap | Add `LabelableProps` to `extends` |
| Radio group (label) | A | `RadioGroup.json`'s own `children` prop means "the Radios inside it," not text — group has no real `label` at all; `radio-group.jsx`'s own comment confirms react-aria's RadioGroup requires an accessible name | Add `LabelableProps` to `extends` |
| Search field (label) | A | Same gap | Add `LabelableProps` to `extends` |
| Text area (label) | A | `TextArea` entry (`includes: [TextFieldProps]`) has no `LabelableProps` either | Add `LabelableProps` to `extends` |
| Text Field (label) | A | Same gap | Add `LabelableProps` to `extends` |
| Tag group (label) | A | `TagGroup.json` has no `label`; extends omits `LabelableProps` | Add `LabelableProps` to `extends` |
| Slider field (label) | A (via `includes`, not `extends`) | `Slider` entry is `{"includes": ["SliderBaseProps"]}` with no `extends` key at all; `SliderBaseProps` isn't in `rsp-base-props.json` either; `slider.jsx`'s own comment documents this gap | Add `"extends": ["LabelableProps"]` — `includes` and `extends` are two different non-transitive code paths in `extract-props.js`, neither reaches `LabelableProps` today |
| **Radio button (label)** | **D, not A** | Radio's own `children` **is** its label (`Radio.json`: `"children": "The label for the element"`, same pattern as `Checkbox.json`) — it needs no `LabelableProps` fix at all. The real bug: a standalone `<Radio>` (no `RadioGroup` ancestor) crashes the entire preview before any control can do anything — see console-warnings section below | Fix the crash (Task 3), not the extends list |
| Tag group (isEmphasized) | B | `TagGroup.json` **has** `isEmphasized` | Not extraction — investigate why the control's value doesn't reach the live preview (Task 5) |
| AvatarGroup (missing size) | B | `AvatarGroup.json` **has** `size` (type `"16 \| 20 \| 24 \| ... \| (number & {})"`); `blocks/playground/playground-data.js` `parsePickerOptions` (`/'([^']+)'/g`) only matches quoted string literals, so this unquoted numeric union parses to zero options and `resolveControl` drops any zero-option, non-freeform property | Extend `parsePickerOptions` to also parse unquoted numeric-literal unions (Task 4) |
| Badge (outline colors) | D (unclear) | `Badge.json` has full color/variant option lists; no fillStyle-aware special-casing found anywhere in the playground code | Likely an upstream `@react-spectrum/s2` limitation (outline styling not implemented for every color), not a bug in this repo — spike/confirm before spending more time (Task 8) |
| Close button (staticColor invisible) | D | `blocks/playground/preview-shell.css` has background-contrast rules for `[static-color="black"]`/`[static-color="white"]` but none for `[static-color="auto"]` | Add an `auto` background rule (Task 6) |
| Help text (not loading) | C | Not a standalone RSP export — `deps/rsp/rsp-secondary-status.json` notes `"Use Form component"`; selecting it 404s the export lookup and hits the caught-error path | Remove from the playground catalog, or repoint at Form's `description`/`errorMessage` props (Task 8) |
| Side navigation (wrong snippet) | B/C boundary | `SideNav` **is** in `components.json` with real data; there's no `side-nav.jsx` in `deps/rsp/playground/snippets/` | Author the missing snippet (Task 6) |
| Tree view (highlight/checkbox) | B | `TreeView.json` has `selectionStyle: 'highlight' \| 'checkbox'` present | Data present — needs the same downstream investigation as Tag group's `isEmphasized` (Task 5) |
| Avatar (no props) | B | `Avatar.json` has 5 real props | Not extraction — see "no props" cluster below |
| Calendar (no props) | B | `Calendar.json` has real props (confirmed) | Same cluster |
| Cards (no props) | B | `Card.json` has 11 real props; `playground.js`'s `resolveComponentMeta` does `pascalCase(component)` with **no alias table**, so slug `cards` → `Cards` ≠ `Card.json` | Add a slug alias/rename (Task 4) |
| Select box (no props) | B | `SelectBox.json` has real props; slug `select-box` → `SelectBox` already matches the filename correctly | Not a slug mismatch — likely the external "components" spreadsheet's `properties` column is empty for this row (can't verify from this repo; see below) |
| Standard dialog (no props) | B | `Dialog.json` has 5 real props; slug `standard-dialog` → `StandardDialog` ≠ `Dialog.json` | Add a slug alias/rename (Task 4) |
| Table (no props) | B | Confirmed live: no `Table.json` exists, and there is **no `Table` export** in `@react-spectrum/s2` (`TableView` is the real export) — reproduced a caught "No RSP export named Table" error | Add a slug alias so `table` resolves to `TableView` everywhere it's used (Task 4) |
| Tag (missing) | B | `Tag.json` is a real, non-empty file; `Tag` has a `components.json` entry | Contradicts "missing" — same external-spreadsheet-row suspicion as Select box/Avatar |
| Swatch (no props) | C | No `Swatch` key in `components.json`, no `Swatch.json`, no snippet | Never added to the catalog (Task 7 territory — needs upstream `.d.ts` scan + a new entry) |
| Swatch group (no props) | C | Same — nothing anywhere for `SwatchGroup` | Same as Swatch |

**On the "no props" cluster (Avatar, Select box, Tag):** these three have correct extraction data and correct slug→filename resolution, so the "no controls shown" symptom must come from `blocks/playground/playground-data.js`'s `getComponentProperties()`, which looks up the block's authored `component` name in an **external AEM spreadsheet** (`playground-data.json?sheet=components`) and returns `[]` if that row's `properties` column is empty or the row doesn't exist. That spreadsheet isn't part of this repo, so it can't be verified or fixed from here — **flag to whoever owns the playground content spreadsheet** rather than treating it as a code bug. Cards/Standard dialog/Table are different: those slugs never resolve to the right JSON filename at all, which is a code bug (Task 4).

## Console-warning investigation (per the 2026-08-13 follow-up ask)

Tested empirically, not guessed: built a minimal harness driving `deps/rsp/playground/index.html` exactly the way `blocks/playground/playground.js` does (same postMessage contract), against the **live production esm.sh CDN build** the real playground uses, for `text-field`, `number-field`, `slider`, `avatar-group`, `tag-group`, and `tree-view` — the components with a Class A ("label" missing) or B (control drops silently) bug.

**Result: none of them produced any console warning or error.** The missing/incorrect prop is silently absent from the rendered output — no dev-mode invariant warning fires. This appears to be because `@react-spectrum/s2`'s esm.sh `?bundle` output is a production build with React/React Aria's dev warnings stripped. **This means fixing the Class A inheritance gap will not, on its own, resolve console warnings** — that hypothesis doesn't hold for this cluster. Worth double-checking against whatever specific warning text you're actually seeing in a real browser session, since it may point at something this harness doesn't reproduce (e.g. a warning that only fires with React's dev build, which the production playground doesn't load).

**What the same testing did surface, unprompted:** rendering a standalone `<Radio>` (exactly what `deps/rsp/playground/snippets/radio.jsx` renders — `<Radio>Option</Radio>`, no `RadioGroup` ancestor) throws a real, uncaught console **error**:

```
Uncaught TypeError: Cannot read properties of null (reading 'isDisabled')
```

This comes from react-aria's `useRadio` reading `RadioGroupState` off a `null` context, because Radio requires a `RadioGroup` ancestor to supply shared selection state. `radio.jsx` has an existing dev comment claiming this used to degrade silently ("renders NOTHING at all — no DOM, no console error") — so upstream `@react-spectrum/s2`/`react-aria-components` has apparently changed behavior since that comment was written, from a silent no-op to a hard crash. Since the playground's `initRsp()` always fetches whichever version esm.sh currently resolves as "latest" for the package (`https://esm.sh/${PKG}@${pkg.version}`, itself read live from `package.json`), this can drift again without warning. This is **unrelated to the LabelableProps inheritance gap** — it's a snippet-composition bug, and it's the actual explanation for "Radio button — label prop doesn't change" (the whole preview crashes before any control could do anything).

## Design decisions already made (do not re-litigate)

- **Two fix tracks, not one.** Task 1 (extends-list additions) is a narrow, low-risk patch for the ~9 confirmed Class A items. Task 7 (TS-compiler rewrite, [[rsp-base-props-inheritance-gap]]'s recommended Path B2) is the actual holistic fix — it prevents this whole class of bug for every future prop, not just `LabelableProps` — but it's a bigger effort and should be spiked separately before committing to the swap. Do Task 1 now; don't block it on Task 7.
- **Don't "fix" Radio by adding LabelableProps.** Radio's label is genuinely `children`, not an inherited `label` prop — confirmed against `Radio.json` and `Checkbox.json`'s identical pattern. The fix is the crash (Task 3).
- **The external playground-content spreadsheet is out of scope for this repo.** Select box, Avatar, and Tag's "no props" reports most likely trace to that spreadsheet's authored `properties` column, not to any file in this repo — don't spend engineering time here; report it to whoever maintains that sheet.
- **Badge and CloseButton (Class D rows) are lower-confidence.** Time-box a short spike (Task 8) rather than assuming they're extraction bugs.

## Priority order (revised 2026-08-13)

Do Class B/C/D first, Class A (Task 1) and the Task 9 rewrite last:

1. **Task 4** — component-slug → data-filename mismatches (Cards/StandardDialog/Table). Pure code, no upstream dependency, quick win.
2. **Task 6** — small fixes (AvatarGroup size-control regex, CloseButton `staticColor="auto"` CSS, side-nav snippet).
3. **Task 3** — the standalone-Radio crash.
4. **Task 5** — TagGroup `isEmphasized` / TreeView highlight-checkbox not reaching the live preview (needs more investigation before a fix is obvious).
5. **Task 7** — add Swatch/SwatchGroup to the catalog.
6. **Task 8** — spike Help text and Badge outline colors (time-boxed; may not be code bugs at all).
7. **Task 1/2** — the `LabelableProps` Class A fix. Revisit the durability question (plain edit vs. a generator-side fix vs. accepting it'll be superseded) once Task 9 is scheduled, rather than building a shim now.
8. **Task 9** — the TS-compiler rewrite. Do this last: it only resolves Class A, so it's the smallest-leverage item in the batch despite being the most structurally significant.

## Tasks

### Task 1 — Add missing `LabelableProps` extends entries (Class A cluster)
**Files:** `deps/rsp/components.json`
Add `"LabelableProps"` to the `extends` array for: `NumberField`, `Picker`, `ProgressCircle`, `RadioGroup`, `SearchField`, `TextArea`, `TextField`, `TagGroup`. For `Slider` (currently `includes`-only, no `extends` key), add `"extends": ["LabelableProps"]` alongside the existing `includes`.
Regenerate the affected `deps/rsp/data/*.json` files via the existing extraction script and confirm each now has a `label` entry (`inheritedFrom: "LabelableProps"`).
Add/extend `test/extractions/extract-props.node.test.js` coverage so a future accidental removal of one of these entries fails a test, not just a playground bug report.

### Task 2 — Do NOT touch Radio's extends list
No code change here — this task exists only to record that Radio was investigated and correctly excluded from Task 1 (see Design decisions).

### Task 3 — Fix the standalone-Radio crash
**Files:** `deps/rsp/playground/snippets/radio.jsx`, `deps/rsp/playground/index.html` (or wherever the fix lands after investigation)
Decide between: (a) change the standalone Radio preview snippet to wrap itself in a minimal `<RadioGroup aria-label="...">` (matches how real usage always looks anyway), or (b) add a guard in `initRsp()`/`render()` that catches the context-less-Radio case gracefully. Prefer (a) — it also fixes the "no DOM at all" symptom the old comment describes for whichever upstream version doesn't crash. Update or remove the now-inaccurate dev comment in `radio.jsx`.
Also audit other snippets for the same "requires a provider/context ancestor" pattern (e.g. anything else besides Radio that's normally only used inside a group/list) while this is fresh — upstream version drift can surface the same failure mode elsewhere.

### Task 4 — Fix component-slug → data-filename mismatches — DONE (2026-08-13, uncommitted)
**Files:** `deps/rsp/playground/pascal-case.js`, `blocks/playground/playground.js`, `deps/rsp/playground/index.html`, `test/blocks/playground.test.js`

Added `resolveRspComponentName()` to `pascal-case.js` — a small hand-maintained `RSP_NAME_ALIASES` map (`cards`→`Card`, `standard-dialog`→`Dialog`, `table`→`TableView`) that falls back to plain `pascalCase()` for everything else. **Deliberately not** `deps/impl-aliases.js` (auto-generated by `deps/build-status-index.js`, "do not edit by hand" — same durability trap as `components.json`) — and not even the same mapping: that file solves "which RSP *docs page* covers this slug" (e.g. `select-box`→`SelectBoxGroup`, the family's page), which is wrong for a live single-component preview (which needs `select-box`→`SelectBox`, already correct with no alias). This is its own small, purpose-specific, hand-committed list.

Applied everywhere `pascalCase(component)` previously stood in for the real export name:
- `resolveComponentMeta()`'s `componentTitle` (drives the `deps/rsp/data/<Name>.json` fetch and the code-disclosure tag name).
- `deps/rsp/playground/index.html`'s `exportName` (drives the live esm.sh import and its own data fetch).

**Found and fixed two more instances of the same bug while verifying live**, not originally scoped in this task:
1. RSP snippet files are named after the real export's kebab slug, not the authored block slug (`card.jsx`/`dialog.jsx`/`table-view.jsx` exist; `cards.jsx`/`standard-dialog.jsx`/`table.jsx` don't) — `markupUrl` was still built from the raw slug. Fixed by kebab-casing the resolved name (`toSlug(componentTitle)`, reusing `scripts/utils/component-path.js`'s existing helper — verified the pascalCase↔toSlug round-trip against all 102 existing snippet filenames, zero mismatches).
2. `OVERLAY_TRIGGERS`/`overlayShape` (both in `index.html` and in `buildRspSnippet()`) were keyed by the raw slug too — `standard-dialog` has no entry (only `dialog` does), so the Dialog preview rendered nothing at all (no wrapping `DialogTrigger`+`Button`). Same fix: look these up, and the `VIRTUALIZED_RSP_COMPONENTS`/`FULL_WIDTH_RSP_COMPONENTS`/`VERTICAL_ORIENTATION_COMPONENTS` sizing Sets alongside them, by a `routeSlug` derived from the resolved name.

Verified live against the real esm.sh build (throwaway harness, deleted after use, same pattern as the console-warning investigation): `table` now renders a real `TableView` with sample rows, `cards` renders a real `Card`, `standard-dialog` renders a working "Open dialog" trigger that opens to show real dialog content. Re-verified `tooltip` (an existing, already-correct overlay route) still works — no regression. Added unit tests to `test/blocks/playground.test.js` for `resolveRspComponentName` and `resolveComponentMeta` (couldn't run them through the project's `wtr` runner — a pre-existing, unrelated `puppeteer-core` ESM/CommonJS break in this environment — verified the underlying logic directly in the browser and via `npx eslint` instead). `npm run test:extractions` unaffected (same 3 pre-existing unrelated failures as before this change).

Not committed, per standing instruction on this branch.

### Task 5 — Investigate why present-but-inert controls don't reach the live preview
**Files:** `deps/rsp/playground/apply-rsp-prop.js`, `deps/shared/playground/apply-attribute.js`, `blocks/playground/playground.js` (`wireIframeMessaging`)
Covers Tag group's `isEmphasized` and Tree view's `selectionStyle` (highlight/checkbox) — both have real data, so the break is somewhere in the control-change → postMessage → `applyAttribute`/`currentProps[key]=value` → re-render path. Tree view is the more likely of the two to need special handling: it's a composed/slotted element (per `build-composite-element.js`/`compose-preview-children.js`), so a plain attribute set on `#mount` may not be enough to force React to re-render `TreeViewItem` children on a `selectionStyle` change — check whether `render()` actually re-runs with the new value, not just whether the attribute changes on the DOM node.

### Task 6 — Small fixes
- **AvatarGroup size control** (`blocks/playground/playground-data.js`, `parsePickerOptions`): also match unquoted numeric-literal unions (e.g. `16 | 20 | 24`), not just `'quoted'` string unions.
- **CloseButton staticColor=auto** (`blocks/playground/preview-shell.css`): add a background rule for `[static-color="auto"]` alongside the existing `black`/`white` ones.
- **Side navigation snippet**: author `deps/rsp/playground/snippets/side-nav.jsx` (none exists today), following the pattern of an existing composite snippet (e.g. `radio-group.jsx` post-Task-3, or `accordion.jsx` if one exists) — check `deps/rsp/data/SideNav.json` plus its `SideNavItem*` siblings for the expected composed shape.

### Task 7 — Add Swatch / SwatchGroup to the catalog (Class C)
**Files:** `deps/rsp/components.json`, `deps/rsp/discover-components.js`, `deps/rsp/extract-base-props.js`
These were never scanned at all — add `components.json` entries (interface names + `extends`, following the pattern of a similar simple component like `Avatar`), confirm `discover-components.js`/the base-props scan picks up their upstream `.d.ts` (they may need a package/path addition similar to the `react-aria` gap already tracked in [[rsp-base-props-inheritance-gap]]), then generate `deps/rsp/data/Swatch.json` and `SwatchGroup.json` and author their playground snippets.

### Task 8 — Spike: Help text, Badge outline colors
Short, time-boxed investigation (not a guaranteed code fix):
- **Help text**: confirm it isn't a standalone RSP export (already strongly indicated by `rsp-secondary-status.json`) and either remove it from the playground's component list or repoint it at Form's `description`/`errorMessage` controls.
- **Badge outline colors**: render a Badge with `fillStyle="outline"` across a few color values directly against the esm.sh build (same harness pattern as the console-warning investigation) to confirm whether this is a real upstream CSS limitation before writing any code.

### Task 9 (parallel, longer-term) — TS-compiler rewrite of the extraction pipeline
Already recommended in [[rsp-base-props-inheritance-gap]] (Path B2): rewrite `extract-base-props.js` around the TypeScript compiler API (`checker.getPropertiesOfType()`) so inheritance resolves transitively and automatically, retiring the flat base-props catalog and the manual `extends`/`includes` lists in `components.json` entirely. This is what actually prevents Task 1's bug class from recurring for the *next* missed prop. Spike on a branch; validate it reproduces the current catalog plus `label`/`isDisabled`/`isEmphasized`/`selectionStyle` correctly across the affected components before committing to the full swap. Sequence after Tasks 1–8 land (those are small, immediately-shippable fixes; this is a structural rewrite).
