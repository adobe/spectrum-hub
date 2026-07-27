# Per-component Dev + Design status pills — implementation plan

## Context

On each implementation's component page (`/web/<impl>/components/<slug>`, e.g. `/web/rsp/components/action-button`) we show the component's Development and Design status as two button-styled pills in the page intro (inside `<main>`, beneath the description). Each pill is an icon + a `"<kind> <status>"` label — e.g. **Development available** / **Design available**. The data layer already exists (`deps/status-index.json` + `scripts/utils/status-model.js`), so this is a UI feature.

Design decisions (confirmed):

- **Not authored** — injected by code so it appears on every component page automatically.
- **Rendered in `<main>`** (page intro), not the page-nav rail.
- **Button-styled pills**, neutral coloring (gray, like `action-button`) — status is conveyed by the label + icon, not color.
- **Per-status icon + label**: `checkmarkcircle` for `available`; a distinct glyph per other status. Label is `"<kind> <status>"` with the status lowercased (`Development available`, `Development experimental`, `Design not available`, …). No status description.
- **Interactive links**: Development links to the implementation's docs (the `go-to-impl` URL); Design links to the component's Figma node (the `see-in-figma` URL). Reuses the exact same URL logic as those page-nav widgets. A pill whose link can't be resolved falls back to a static span.
- **Render nothing** when the path doesn't resolve to an indexed component.

## LCP / CLS assessment

- **LCP: no risk.** The pills are a small text row in the intro. The placeholder is injected before `loadArea` and decorated inline, so the pills are part of the initial layout, not spliced in after paint. They don't gate or delay the LCP element (the `<h1>`/hero).
- **CLS: minor, accepted for reliability.** `scripts.js` mounts the pills **after `loadArea`** (so the decorated hero/`<h1>` is reliably present), appending one small row to the intro. An earlier before-`loadArea` injection avoided the shift but was fragile — it depended on `main h1` being queryable that early and on section decoration nesting the placeholder correctly, which didn't hold on every page. The pills are a single intro row and their fetches are small/cached, so the shift is minimal; on non-component pages the block removes its element (render nothing).

## Approach

A new self-contained block **`blocks/component-status/`** renders the pills; **`scripts.js`** injects the placeholder into `main` so `loadArea` decorates it.

### 1. `blocks/component-status/component-status.js`

- Imports `STATUSES` (`status-model.js`), `getImplementationById` (`implementations.js`), `getSvgRef` (`svg.js`), and — to reuse the widget URL logic verbatim — `resolveImplementation`, `resolveFigmaUrl`, `fetchFigmaData` from `blocks/action-button/action-button.js`.
- `toSlug(name)` — kebab of canonical PascalCase.
- `resolveContext(pathname)` → `{ impl, slug } | null` — matches `/…/components/<slug>` under a registered code implementation (rsp/swc, never figma), validated via `getImplementationById`.
- `findComponent(index, slug)` — index row whose canonical name kebab-matches `slug`.
- `buildPill({ kind, label }, cell, link)` → one pill, or `null` when the cell is absent. Renders `<a>` when `link` resolves (`href`, `target="_blank"`, `rel="noopener noreferrer"`, and an `aria-label` naming the destination + new tab for WCAG 2.4.4 while keeping the visible label per 2.5.3), otherwise a static `<span>`. Icon via `getSvgRef(STATUS_ICONS[status.id], …)`, label `"<kind> <status.label lowercased>"`.
- `buildPills(pathname, index, figmaData)` → `HTMLElement[]`. Resolves context/component; builds the Development pill (`platforms.web[impl]`, link = `resolveImplementation(pathname).href`) and Design pill (`platforms.web.figma`, link = `resolveFigmaUrl(slug, figmaData)`); omits a pill whose cell is missing; returns `[]` when nothing resolves.
- `export default async function init(el)` — the block entry point. `el.remove()`s when `resolveContext` is null; otherwise fetches the index and the Figma roster in parallel, builds pills, and either `el.replaceChildren(...pills)` (with `role="group"` + `aria-label="Component status"`) or `el.remove()`s (render nothing).

**Icons** (`STATUS_ICONS`, `s2-icon-<name>`): `available` = `checkmarkcircle`, `experimental` = `magicwand`, `not-available` = `closecircle`, `deprecated` = `minus`, `removed` = `removecircle`.

### 2. `blocks/component-status/component-status.css`

- `.component-status` — a wrapping flex row of pills with a small top margin under the description.
- `.component-status-pill` — the button pill (matches `action-button`): `--s2-gray-100` background, `--s2-corner-radius-500`, icon + label, `--s2-gray-900` text, `text-decoration: none`.
- `a.component-status-pill` — interactive affordances only for the linked pills: pointer cursor, hover (`--s2-gray-200`), and a `--s2-blue-900` focus ring.
- `.component-status-icon` — `display: block`, 20×20 (an empty inline `<svg>` collapses to 0).

### 3. `scripts.js` (edit)

Add `buildComponentStatus()` (alongside `buildPageNav`): on a component path (and non-`marketing` template), append an empty `<div class="component-status">` to the hero's text column (`.fg-text` — the `<h1>`'s container, holding the breadcrumb, heading, and description) and `await loadBlock(el)`. Call it in `loadPage` **after** `await loadArea()` so the decorated hero is present. Appending as `.fg-text`'s last child places the pills inside the hero card, beneath the description (matching the design).

### 4. Tests

- `test/blocks/component-status.test.js` — `resolveContext`, `findComponent`, `buildPills` (labels, per-status icon, Development→go-to-impl href, Design→see-in-figma href, `target`/`rel`/`aria-label`, static-span fallback with no Figma entry, cell omission), and `init` (fills element / removes on non-resolve / fetch fail / absent component).
- `test/blocks/action-button.test.js` — unchanged; `fetchFigmaData` is now exported (single-line change).

## Files

- `blocks/component-status/component-status.js` (new)
- `blocks/component-status/component-status.css` (new)
- `scripts/scripts.js` (edit — `buildComponentStatus` injects the placeholder into `main`)
- `blocks/action-button/action-button.js` (edit — export `fetchFigmaData` for reuse)
- `test/blocks/component-status.test.js` (new)

Reused as-is: `STATUSES`, `getImplementationById`, `getSvgRef`, and `resolveImplementation` / `resolveFigmaUrl` / `fetchFigmaData` from `action-button.js`; the `action-button` pill styling; the `codeBase` / index-path convention from `status-table.js`.

## Verification

- **Tests**: `npm run test:unit`. Status: `component-status` + `action-button` green; full unit suite passing.
- **Visual**: real `/web/<impl>/components/<slug>` pages are AEM-served, so the local `http-server` can't render them; the block was verified in isolation against a mock index + Figma roster — pill styling, per-status labels/icons, Development→`react-spectrum.adobe.com/…` and Design→`figma.com/…?node-id=…` links (`target="_blank"`, aria-labels), and the static-span fallback all confirmed in the browser. Confirm the in-`main` placement on an AEM preview.
- `stylelint` can't run locally on Node 20.5.1 (import-attributes) — lint CSS in CI.
