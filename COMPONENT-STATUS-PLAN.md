# Per-component Dev + Design status section — implementation plan

## Context

On each implementation's component page (`/web/<impl>/components/<slug>`, e.g. `/web/rsp/components/action-button`) we want a color-coded status card at the **top of the right rail, above the page-nav table of contents**. It shows two rows — **Dev** (the current implementation's status) and **Design** (the Figma status) — each with an icon, a status-colored label, and the status definition (per the design screenshot).

This is the Epic C "per-component Design/Dev status" work. The data layer already exists (`deps/status-index.json` + `scripts/utils/status-model.js`), so this is a pure UI addition.

Decisions confirmed:

- **Not authored** — injected by code so it appears on every component page automatically.
- **Separated** into its own module (own JS/CSS/test), not inlined in page-nav.
- Shows **Dev + Design** (two rows).
- **Render nothing** when the path doesn't resolve to a known implementation + component in the index.

## LCP / CLS assessment

- **LCP: no risk.** The card lives in the `pagenav` rail, which is desktop-only (`display: none` below 900px) and is not the LCP element — the LCP element is main-column content (hero / h1 / live component), painted independently. Adding a small deferred side-rail card and one extra fetch of a small static JSON does not touch the LCP path.
- **CLS: controlled.** The only shift risk is the injected card pushing the TOC down within the rail. We avoid it by composing the rail in a **single insertion pass**: `page-nav` runs an `async init`, so it appends the card element and `await`s `loadBlock(statusEl)` (which fetches the index and populates or removes the card) **before** it builds and appends the TOC `<ul>` — so the card and list enter the DOM together, before the rail's first paint. Nothing shifts because the rail is laid out once. Because the rail is deferred and non-LCP, awaiting the small JSON before the rail paints has no user-visible cost. Separation into its own module does **not** add CLS risk — the risk is the same async-injection question regardless of where the code lives, and it is solved by the single-pass composition.

## Approach

A new self-contained module **`blocks/component-status/`** renders the card; **`blocks/page-nav/page-nav.js`** orchestrates the fetch and mounts it in one pass so CLS stays at zero.

### 1. `blocks/component-status/component-status.js` (new)

Pure, testable helpers plus a builder. Reuses existing utilities rather than re-deriving:

- Import `STATUSES` from `scripts/utils/status-model.js` (single source for label + `color` token + `definition`; the index has no color, so we read `STATUSES` like `status-table.js` does).
- `toSlug(name)` — kebab of canonical PascalCase (same logic as `status-table.js` `toSlug`).
- `resolveContext(pathname)` → `{ impl, slug } | null`. Parses `/web/<impl>/components/<slug>` (mirrors `action-button.js` `componentSlugFromPath` / `resolveImplementation`). `impl` must be a registered code implementation — validated via `getImplementationById` from `scripts/utils/implementations.js` (so only `rsp` / `swc`, never `figma`, drive the Dev row).
- `findComponent(index, slug)` → `index.components.find((c) => toSlug(c.name) === slug) ?? null`.
- `buildRows(pathname, index)` → `HTMLElement[]` (pure, no fetch): resolves the context, finds the component, and returns the **Dev** row (`platforms.web[impl]`) and **Design** row (`platforms.web.figma`). Each row is built only when its cell is present (a missing cell omits that row, never fabricates a status); returns `[]` when the path doesn't resolve, the index is null, or the component isn't indexed. A row renders an icon, a status-colored label `"<Dev|Design> • <status.label>"` (via `--status-color: var(<STATUSES[status].color>)`, same pattern as `status-table.js` `buildBadge`), and `STATUSES[status].definition` beneath.
- `export default async function init(el)` — the standard block entry point (`el` is the `<div class="component-status">` page-nav created). Returns early and `el.remove()`s when `resolveContext(window.location.pathname)` is null; otherwise fetches `${codeBase}/deps/status-index.json` (reuse `getConfig().codeBase` + the index-path convention from `status-table.js`), builds rows via `buildRows`, and either `el.replaceChildren(...rows)` or `el.remove()`s when there are none (**render nothing**).

Labels are the fixed strings **"Dev"** and **"Design"** (matching the screenshot), not the implementation's full name. Definitions come from `STATUSES` (canonical) so they never drift from the adapter.

**Icons:** the screenshot shows a `</>` (dev) glyph and a palette/brush (design) glyph. Icons use the established `getSvgRef(name, className)` helper (`scripts/utils/svg.js`) — the `s2-icon-<name>` `<use>` pattern — not inline SVG. The exact S2 icon names for the dev/design glyphs aren't verifiable locally (the CDN icon set isn't in the repo); `code` / `brush` are in place as best-guess names pending confirmation.

### 2. `blocks/component-status/component-status.css` (new)

- Layout for the card: two rows, each `icon | (label + definition)`, using `--s2-spacing-*` and `--s2-font-*` tokens like the rail.
- Status-colored label via `color: var(--status-color)`; definition muted (`--s2-gray-700`).
- The icon `<svg>` is `display: block` at a fixed 20×20 so its box is honored even when the glyph is empty (an inline `<svg>` collapses to 0).
- No `display: none` media query needed — the card lives inside `.page-nav`, which is already desktop-only, so it inherits the rail's show/hide.

### 3. `blocks/page-nav/page-nav.js` (edit)

- `import { loadBlock } from '../../scripts/ak.js';` (no static import of component-status — it loads lazily, only on component pages).
- Early in `init`, compute `isComponent = isComponentPath(pathname)`. Gather headings; return only when there are **no headings and it isn't a component page**.
- On a component page, create `<div class="component-status">`, `el.append` it, and `await loadBlock(statusEl)` — the canonical loader lazy-loads the block's JS **and** CSS and runs its `init`. This happens **before** the TOC `<ul>` is built/appended, so card + list + widgets compose in one pass (CLS-safe). The block removes its own element when the component isn't indexed.
- The TOC-building branch is now guarded by `if (headings.length)`, so the card renders even on a component page with no `h2` headings. A final `if (!el.children.length) return;` guard leaves nothing behind when both the TOC and the card are absent. The card rides `syncPresence` automatically because it is a child of `el`.

### 4. `test/blocks/component-status.test.js` (new)

Follows `test/blocks/status-table.test.js` (web-test-runner browser suite). Covers:

- `resolveContext` parses rsp/swc component paths; returns null for non-component / figma / malformed paths.
- `findComponent` matches by kebab slug (ActionButton ↔ action-button).
- `buildRows` returns two rows with correct labels / colors / definitions for a fixture index; omits a row for a missing cell (Figma-only component → Design only); returns `[]` when the component isn't in the index or the path doesn't resolve.
- `init` fills its element on a component page and `el.remove()`s it when the path doesn't resolve, the fetch fails, or the component isn't indexed.
- `page-nav` mounts the card (via `loadBlock`) as the first child above the `<ul>` on a component page and omits it elsewhere.

### 5. `styles/styles.css` (edit)

The global Spectrum-edge decoration-hider was `div[data-status] { display: none; }`, which also matched the card's `.component-status-row` elements (they carry `data-status`). Scope it to `main > div[data-status]` so it only hides top-level section/block placeholders, not the nested status rows.

## Files

- `blocks/component-status/component-status.js` (new — `toSlug`, `resolveContext`, `findComponent`, `buildRows`, default `init`)
- `blocks/component-status/component-status.css` (new)
- `blocks/page-nav/page-nav.js` (edit — `loadBlock` mount, single-pass)
- `styles/styles.css` (edit — scope the `data-status` hider to `main > div[data-status]`)
- `test/blocks/component-status.test.js` (new)
- `test/blocks/page-nav.test.js` (edit — assert the mount)

Reused as-is: `scripts/utils/status-model.js` (`STATUSES`), `scripts/utils/implementations.js` (`getImplementationById`), `scripts/utils/svg.js` (`getSvgRef`), `scripts/ak.js` (`loadBlock`), the `toSlug` / badge / `--status-color` patterns from `blocks/status-table/status-table.js`, and the codeBase / index-path convention.

## Open item

- **Icons:** the block uses `getSvgRef` with the best-guess S2 names `code` (dev) and `brush` (design). Confirm the exact `s2-icon-<name>` names against the live icon set — a wrong name renders a blank 20×20 box, not a layout break.

## Verification

- **TDD** per repo convention: write `test/blocks/component-status.test.js` red first, implement to green, then `npm run test:unit` (web-test-runner). Status: implemented — `component-status` 26 tests + `page-nav` 38 tests green, full unit suite 556 passing.
- **Visual check**: real `/web/<impl>/components/<slug>` pages are served by AEM, so the local `http-server` can't render them; the block was verified in isolation against a mock index (both status colors, definitions, row omission, and the 20×20 icon box confirmed in the browser). Confirm the in-rail mount on an AEM preview.
- Confirm **no CLS**: with the rail visible, the TOC should not jump after load (card + list appear together).
- Confirm **render-nothing**: a non-component interior page shows no card; a component absent from the index shows no card.
- `stylelint` can't run locally on Node 20.5.1 (import-attributes) — lint CSS in a real terminal or rely on CI.
