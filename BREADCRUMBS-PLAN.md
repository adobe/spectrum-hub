# Automatic breadcrumbs — implementation plan

## Context

On component detail pages (`/web/<impl>/components/<slug>`, e.g. `/web/swc/components/button`) we want a breadcrumb trail rendered at the top of `<main>`, above the page's `<h1>` — matching the reference screenshot of the prototype, which shows `Web › SWC › Components` directly above the "Button" heading. `Web` links to the web overview page, `SWC` links to the SWC landing page, and `Components` is the terminal crumb (the current page's own title is already the `<h1>` immediately below, so it isn't repeated in the trail).

There is currently **no breadcrumb mechanism at all** in this codebase. `COPY-MARKDOWN-TURNDOWN-PLAN.md`'s reference to breadcrumbs living in `<header>` (old `ak.js`) describes a mechanism that was deleted in the `[nav++]` refactor (commit `c529b47`), before which breadcrumbs were purely **authored** (an editor dropped a `<breadcrumbs>` block into the page body, or set a `breadcrumbs` metadata value, and the header code just relocated it — no path parsing, no auto-generated labels/links). None of that survives today; this is a from-scratch feature.

Decisions confirmed:

- **Not authored — automatic.** Derived entirely from `window.location.pathname`; an editor never has to add anything to a page for the trail to appear.
- **Lives in `<main>`, not `<header>`.** The header is a fixed-height (`--sh-header-height`, `styles/styles.css:364`), CLS-guarded chrome bar shared by every page, laid out in a single `space-between` flex row (`blocks/header/header.css`) with no slot for a second row. The screenshot's trail sits inside the content column, above the `<h1>` — so it's page content chrome, not header chrome, and is inserted as the first child of `<main>`.
- **V1 scope: `/web/<impl>/components/<slug>` pages only**, where `<impl>` is a registered implementation from `scripts/utils/implementations.js` (`rsp`, `swc`). This mirrors `blocks/status-table/status-table.js`'s existing `const PLATFORM = 'web'` and `COMPONENT-STATUS-PLAN.md`'s `getImplementationById` gate — `mobile/ios` and `mobile/android` have no implementation registry to validate against yet, so they're out of scope until that exists.
- **Trail is `Web > <Impl short label> > Components`** — three crumbs, fixed depth for v1 (no dynamic depth needed since there's only one URL shape to support).
  - `Web` → `/web/overview` (the same URL `site-nav.html` uses for the sitenav's "Overview" link under the "Web" section).
  - `<Impl short label>` (`SWC` / `RSP`) → `/web/<impl>` (the implementation's landing page — matches `blocks/sitenav/sitenav.js`'s `INDEX_BASED_NAV` prefixes `/web/rsp`, `/web/swc`).
  - `Components` → **not a link** (plain text, last crumb). There's no `/web/<impl>/components` listing page to point to, and the component's own name is already the page's `<h1>`.
- **Render nothing** when the pathname doesn't resolve to a known section + implementation + component shape — same "render nothing" contract as `COMPONENT-STATUS-PLAN.md`, for consistency across the two sibling features.
- **Synchronous, no fetch.** Unlike `page-nav`'s widget fragment or `component-status`'s JSON index fetch, breadcrumb labels are a small fixed vocabulary (`Web`, `SWC`, `RSP`, `Components`) fully derivable from the URL alone — no network round trip needed, so the trail can be built and inserted before first paint instead of awaited/deferred.
- **New self-contained block** (`blocks/breadcrumbs/`), following the `page-nav` / planned `component-status` convention: its own JS + CSS + test, loaded via the existing `loadBlock` mechanism rather than inlined into `scripts.js` or `header.js`.

## LCP / CLS assessment

- **LCP: no risk.** The breadcrumb element is built and prepended to `<main>` at the very start of `loadArea` — inside `decorateArea`, which `ak.js:373-374` calls *before* `decorateSections` walks `main`'s children into blocks. Because it's inserted before any section/block decoration or paint has happened, it becomes part of the initial layout rather than something spliced in after the fact. It adds a small amount of height above the true LCP element (the page's `<h1>` or hero content), the same way a static, server-rendered breadcrumb bar would — it does not delay when the LCP element *starts* rendering, since nothing about its construction is async or fetch-gated.
- **CLS: no risk under the "render nothing" contract.** The trail is derived synchronously and inserted synchronously, in the same tick, before the browser's first layout/paint of `main`'s contents — there is no two-pass insertion (build now, backfill later) the way `component-status`'s planned card needs `await` + single-pass composition to avoid a rail reflow. On a page where breadcrumbs don't apply, the builder returns `null` and nothing is inserted at all, so there's no reserved-then-collapsed space either.
- **Minor accepted tradeoff — brief unstyled flash.** Following the established `loadBlock` convention (`blocks/breadcrumbs/breadcrumbs.css` loaded lazily via `loadStyle`, same as every other block including `header`) means the breadcrumb `<nav>` can exist in the DOM for a moment before its stylesheet applies, i.e. the same FOUC risk `header.js` already accepts (mitigated there with a `visibility: hidden` toggle). Given the breadcrumb markup is a plain, small text row with no meaningful unstyled/styled visual gap, this plan accepts that tradeoff rather than special-casing breadcrumb CSS into the eagerly-loaded `styles/styles.css`. Flagged as an open item below if it proves visually noticeable.

## Approach

### 1. `scripts/utils/implementations.js` (edit)

Add a `shortLabel` field to the existing `IMPLEMENTATIONS` registry so the abbreviation used in the trail (`SWC`, `RSP`) has one canonical source, instead of `blocks/action-button/action-button.js`'s existing pattern of a private, unexported, file-local `{ swc: { label: 'SWC', ... } }` map (see `action-button.js:117-128`). This keeps the file's own stated intent ("adding a new web implementation is intended to be a single edit here") true for the new consumer too:

```js
export const IMPLEMENTATIONS = [
  { id: 'rsp', label: 'React Spectrum', shortLabel: 'RSP' },
  { id: 'swc', label: 'Spectrum Web Components', shortLabel: 'SWC' },
];
```

No other change to this file — `getImplementationById` is reused as-is.

### 2. `blocks/breadcrumbs/breadcrumbs.js` (new)

Pure, testable helpers plus a builder, mirroring the `resolveContext(pathname)` convention `COMPONENT-STATUS-PLAN.md` establishes for its sibling feature:

- `resolveContext(pathname)` → `{ impl } | null`. Splits the pathname into segments and matches the fixed v1 shape `['web', <implId>, 'components', <slug>]` exactly (length 4, `segments[0] === 'web'`, `segments[2] === 'components'`, non-empty `segments[3]`). Resolves `segments[1]` via `getImplementationById` from `scripts/utils/implementations.js`; returns `null` if it isn't a registered implementation (guards out `figma` and any future non-web-doc entries the same way `COMPONENT-STATUS-PLAN.md`'s context resolver does). Deliberately self-contained rather than importing `isComponentPath` from `page-nav.js` — matches the existing precedent of each block owning its own small path-parsing helper (`page-nav.js`'s `isComponentPath`, `action-button.js`'s `resolveImplementation`, `status-table.js`'s slug/href builders all independently derive from the URL rather than sharing a cross-block helper).
- `buildTrail(impl)` → an ordered array of crumb descriptors:
  ```js
  [
    { label: 'Web', href: '/web/overview' },
    { label: impl.shortLabel, href: `/web/${impl.id}` },
    { label: 'Components', href: null },
  ]
  ```
- `buildBreadcrumbs(pathname)` → `HTMLElement | null`:
  - `resolveContext(pathname)`; if `null` → return `null` (render nothing).
  - `buildTrail(impl)`; build a `<nav class="breadcrumbs" aria-label="Breadcrumb">` containing an `<ol>` of `<li>` items — an `<a href="…">` for crumbs with an `href`, a plain `<span>` for the terminal `Components` crumb. Separators (`›`) are rendered via CSS (`::before` on non-first `<li>`), not literal DOM text, so they're excluded from copy/paste and from screen-reader list semantics.
- `export default function init(el)` — the standard block contract (`el` is the `<nav class="breadcrumbs">` element already in the DOM). Builds the trail via `buildBreadcrumbs(window.location.pathname)` and, if non-null, moves its children into `el`; if `null`, removes `el` from the DOM (covers the "render nothing" case for whatever inserted the placeholder — see §4).

Kept synchronous throughout — no `async`/`await`, consistent with the "no fetch" decision above.

### 3. `blocks/breadcrumbs/breadcrumbs.css` (new)

- `.breadcrumbs`/`.breadcrumbs ol` as a single-row flex layout using `--s2-spacing-*` tokens, sitting above the content column with a small bottom margin before the `<h1>`.
- Link crumbs use the standard link color token; the terminal `Components` crumb uses muted text (`--s2-gray-700`), matching how `component-status`'s planned definition text is muted relative to its status label.
- `.breadcrumbs li:not(:first-child)::before { content: '›'; }` for the separator, spaced with `--s2-spacing-100`.
- No responsive `display: none` — the trail should show at all viewport widths (unlike `page-nav`, which is desktop-only chrome).

### 4. `scripts/scripts.js` (edit)

`decorateArea` (`scripts.js:27-42`) is the earliest synchronous hook `loadArea` calls (`ak.js:373-374`), before section/block decoration — the same hook already used to stamp `main.id`. Extend it to prepend a breadcrumbs placeholder for the top-level document only (guard on `area === document`, since `decorateArea` also runs for nested fragment areas such as the `page-nav` widgets fragment, where a second breadcrumb trail must not be built):

```js
import { buildBreadcrumbs } from '../blocks/breadcrumbs/breadcrumbs.js';
// ...
const decorateArea = ({ area = document }) => {
  // ...existing eagerLoad + main.id logic...

  if (area === document && main && !main.querySelector('.breadcrumbs')) {
    const trail = buildBreadcrumbs(window.location.pathname);
    if (trail) { main.prepend(trail); }
  }
};
```

Note this calls `buildBreadcrumbs` directly (module-level function) rather than going through `loadBlock`, because the element it builds is already fully-formed markup — there's no separate "block init" step needed the way `page-nav`/`header` need one to fetch/build async content. This means `blocks/breadcrumbs/breadcrumbs.js` doesn't need the `export default function init(el)` block-contract entry point described in §2 after all; simplifies to just exporting `resolveContext`, `buildTrail`, and `buildBreadcrumbs`, and `breadcrumbs.css` is pulled in via a static `@import` in `styles/styles.css` (eager, same tier as core layout CSS) instead of the lazy per-block `loadStyle` convention — removing the FOUC tradeoff flagged above, since there's no `loadBlock` call to go through in the first place.

*(This supersedes the `loadBlock`-based framing in §§1-3 above where it conflicts — see "Open items" for the one open call this creates.)*

## Files

- `scripts/utils/implementations.js` (edit — add `shortLabel`)
- `blocks/breadcrumbs/breadcrumbs.js` (new — `resolveContext`, `buildTrail`, `buildBreadcrumbs`)
- `blocks/breadcrumbs/breadcrumbs.css` (new)
- `scripts/scripts.js` (edit — `decorateArea` prepends the trail for the top-level document)
- `styles/styles.css` (edit — `@import` for `breadcrumbs.css`, or equivalent eager-load wiring)
- `test/blocks/breadcrumbs.test.js` (new)
- `test/scripts/scripts.test.js` (edit, if this file exists — assert `decorateArea` prepends/omits the trail; confirm exact test file location before writing)

Reused as-is: `getImplementationById` from `scripts/utils/implementations.js`; the `--s2-spacing-*`/`--s2-gray-700` token conventions from `status-table.js`/`component-status` (planned); the "render nothing" contract and `resolveContext(pathname)` naming from `COMPONENT-STATUS-PLAN.md`.

## Open items

- **`loadBlock` vs. direct call.** §4 above resolves this in favor of a direct, synchronous `buildBreadcrumbs` call from `decorateArea` (no `loadBlock`, no block-contract `init`, eager CSS) because there's no async data and no benefit to the lazy-loading machinery — but this is a deviation from every other injected-chrome feature in the repo (`header`, `page-nav`, planned `component-status`), which all go through `loadBlock`. Worth a second look before implementing: if consistency with those three outweighs the small eager-CSS cost, fall back to the `loadBlock`-based version in §§1-3 (placeholder `<nav class="breadcrumbs">` inserted in `decorateArea`, `loadBlock(el)` called — not awaited, matching how `buildPageNav()` is already fire-and-forgot in `scripts.js:104` — and `init(el)` does the `buildBreadcrumbs`/DOM-population work).
- **Test file location for the `decorateArea` change.** `scripts/scripts.js` doesn't currently appear to have its own dedicated test file the way each block does (`test/blocks/*.test.js`); confirm whether one exists (e.g. `test/scripts/scripts.test.js`) before writing new tests for the `decorateArea` extension, or whether that logic should be tested indirectly through `test/blocks/breadcrumbs.test.js`'s `buildBreadcrumbs` coverage plus a thin DOM-level check.
- **Mobile.** `mobile/ios` and `mobile/android` have no implementation registry (`scripts/utils/implementations.js` is web-only) and no `/mobile/<impl>/components/<slug>` precedent confirmed elsewhere in the codebase. Deferred until that registry exists, per the v1 scope decision above.
- **`Components` crumb clickability.** Confirmed as non-linking for v1 per the screenshot (no listing page exists at `/web/<impl>/components`). If a components-index page is ever added at that URL, this crumb should become a link — flagged here so it isn't forgotten as a follow-up rather than re-litigated from scratch.

## Verification

- **TDD** per repo convention: write `test/blocks/breadcrumbs.test.js` red first, implement to green. Cover: `resolveContext` matches `/web/swc/components/button` and `/web/rsp/components/action-button`, returns `null` for `/web/overview`, `/web/figma/components/button` (unregistered impl), `/web/swc/components` (missing slug), and non-`/web` paths (e.g. `/mobile/...`, `/foundations/...`). `buildTrail` produces the three expected crumbs with correct labels/hrefs per implementation. `buildBreadcrumbs` returns `null` when `resolveContext` does, and returns a `<nav>` with a link `Web`, a link `<ShortLabel>`, and a non-link `Components` otherwise. Run `npm test` (web-test-runner) in a real terminal — the browser suite historically can't complete inside the agent sandbox.
- **Visual check** via the preview server: load `/web/swc/components/button` and `/web/rsp/components/action-button` and confirm `Web › SWC › Components` (or `Web › RSP › Components`) renders above the `<h1>`, with `Web` and the impl crumb clickable and `Components` plain text. Load a non-component page (e.g. `/web/overview`) and confirm no trail renders.
- Confirm **no CLS**: breadcrumb insertion happens before first paint of `main`'s content, so there should be no visible jump/reflow on load — check via the browser preview's layout-shift behavior at ≥ any viewport width (the trail is not viewport-gated, unlike `page-nav`).
- Confirm **render-nothing**: a non-`/web` interior page, a `/web/<impl>` landing page (no `components` segment), and a `/web/figma/...` path (unregistered implementation) all show no trail.
- `stylelint` can't run locally on Node 20.5.1 (import-attributes) — lint CSS in a real terminal or rely on CI.
