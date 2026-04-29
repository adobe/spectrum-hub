# RSP Extraction: Fix Plan

Four issues identified from comparing `deps/rsp/` against `deps/swc/`. Two are bugs that need fixing before merge. Two are quality/scalability concerns to address before the component list grows. A fifth item was discovered during implementation.

---

## 1. ✅ Wrong script path in workflow and README

**Priority:** Fix before merge  
**Status:** Done

The GitHub Actions workflow and README both referenced `deps/react-spectrum/` — the directory is `deps/rsp/`. Fixed both `run:` and `git add` lines in the workflow, updated README command examples, and renamed `data/rs-base-props.json` → `data/rsp-base-props.json` with all coordinating references updated across both scripts.

---

## 2. ✅ JSDoc delimiters leaking into description output

**Priority:** Fix before merge  
**Status:** Done

`parseJSDoc` stripped `* ` line prefixes but not the opening `/**` or closing `*/`. Fixed by stripping both delimiters from the full comment string before splitting into lines:

```js
const cleaned = comment.replace(/^\/\*\*/, '').replace(/\*\/$/, '');
const lines = cleaned
  .split('\n')
  .map((l) => l.replace(/^\s*\*\s?/, '').trim())
  .filter(Boolean);
```

Fix applied to **both** `extract-props.js` and `extract-base-props.js`. After applying, both scripts must be re-run — `extract-base-props.js` first to regenerate `rsp-base-props.json` with clean descriptions, then `extract-props.js` to pick them up. Inherited props (e.g. `ActionButton.json`) come from `rsp-base-props.json`, not from the component's own `.d.ts`, so the base script must be re-run for those to be clean.

---

## 3. `extract-base-props.js` must run in the daily workflow

**Priority:** Fix before merge  
**Effort:** 2 lines in the workflow

`extract-base-props.js` fetches directly from unpkg (same as `extract-props.js`), so it can and should run in the daily GitHub Actions workflow. Without it, upstream changes to `react-aria` or `@react-types/shared` base types are never picked up automatically.

This is different from SWC's `extract-cem-mixins.js`, which requires a locally cloned SWC repo and a manually generated CEM file — it cannot be automated. RSP base props have no such constraint.

**File to change:** `.github/workflows/extract-rsp-properties.yml`

```yaml
- name: Extract component properties
  run: |
    node deps/rsp/extract-base-props.js
    node deps/rsp/extract-props.js
```

`git add deps/rsp/data/` already covers both output files — no further change needed.

Also update `deps/rsp/README.md` to reflect that the daily workflow runs both scripts and that `extract-base-props.js` is no longer manual-only.

---

## 4. `extends` in `components.json` will drift as RSP evolves

**Priority:** Address before scaling beyond ~5 components  
**Effort:** Medium — modify `extract-props.js`

SWC's CEM contains the full inheritance graph, so `extract-cem-components.js` resolves mixins automatically. RSP has no equivalent, so `extends` is declared manually per component in `components.json`. If `@adobe/react-spectrum` adds or removes an `extends` clause upstream, the output silently omits those inherited props.

**Recommended approach: auto-resolve from the `.d.ts` source**

The interface declaration in the TypeScript source already names what it extends:

```ts
export interface SpectrumButtonProps extends AriaBaseButtonProps, ButtonProps, StyleProps { ... }
```

`extract-props.js` already fetches this source. Parse the `extends` clause from the interface header, then intersect those names with known keys in `rsp-base-props.json` — no config change needed when upstream adds a base type that already exists in the base props file.

Steps:
1. After `extractInterfaceBlock` locates the interface, also capture its `extends` list from the header line using a regex.
2. Replace the hard-coded `bases` array from config with the auto-resolved list.
3. Retain `extends` in `components.json` as an optional override for cases where auto-resolution is incomplete (e.g., a base type not yet in `rsp-base-props.json`).
4. Emit a warning when an auto-resolved base name has no entry in `rsp-base-props.json`, prompting a run of `extract-base-props.js`.

This mirrors how `extract-cem-components.js` handles external mixin references — walk what upstream declares, warn on unknowns, don't silently drop them.

---

## 5. Regex-based TypeScript parser has a documented scope limit

**Priority:** Acceptable risk — document now, revisit if breakage occurs  
**Effort:** Comments + README section

`extractInterfaceBlock` (bracket counting) and `parseProps` (single-line regex) work reliably for straightforward interfaces with primitive and union types. They will silently skip or misparse:

- Multi-line type unions
- Generic types with angle brackets
- Function signatures (`(val: T) => void`)
- Conditional or mapped types

A full TypeScript parser (`ts-morph` or the TS compiler API) would be robust but adds a heavy dependency. The current approach is adequate for Spectrum component props, which are overwhelmingly simple unions and primitives. The risk is low today; it grows as more complex components are added.

**Actions:**
1. Add a comment above `parseProps` in `extract-props.js` documenting the known limitations.
2. Add a "Parser limitations" section to `deps/rsp/README.md` noting that multi-line and generic types may not parse correctly, and that the output should be spot-checked when adding a new component.
3. Track a follow-up to evaluate `ts-morph` if parser failures accumulate.

---

## 6. Sequential fetching will not scale to 50+ components

**Priority:** Address before registering more than ~20 components  
**Effort:** Small — refactor one loop in each script

Both `deps/rsp/extract-props.js` and `deps/swc/extract-cem-components.js` fetch components sequentially in a `for...of` loop. At 50 components with each fetch taking ~300–500ms, the daily workflow will take 15–25 seconds of pure network wait time. This grows linearly with every component added.

Both loops can be parallelized with `Promise.all`:

```js
await Promise.all(
  Object.entries(ALLOW_LIST).map(async ([component, config]) => {
    // existing loop body
  })
);
```

Note: the `count` variable in both scripts will need to move to an atomic pattern (e.g. count the resolved results array length after `Promise.all`) since concurrent writes to a shared counter are unsafe in an async context.

Additionally, `extract-base-props.js` fetches its URLs sequentially with no CDN fallback. A single CDN blip would silently produce an empty `rsp-base-props.json`, wiping inherited props on the next run. Add the same unpkg → jsdelivr fallback pattern used in `extract-props.js`.

---

## Execution order

| # | Item | When | Status |
|---|---|---|---|
| 1 | Fix script paths + rename base props file | Before merge | ✅ Done |
| 2 | Fix JSDoc delimiter stripping | Before merge | ✅ Done |
| 3 | Add `extract-base-props.js` to daily workflow | Before merge | Pending |
| 4 | Auto-resolve `extends` from `.d.ts` | Before registering more than ~5 components | Pending |
| 5 | Document parser scope | Before merge (low effort, no code change) | Pending |
| 6 | Parallelize fetching in RSP and SWC scripts | Before registering more than ~20 components | Pending |
