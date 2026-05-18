# Platform picker — plan

> **Scratch doc.** Living plan for a new multi-platform picker feature in Spectrum Hub. Evolves as we explore requirements. Replace with a Jira epic or RFC once the shape stabilizes; delete this file then.

## Purpose

User story: as a Spectrum Hub visitor, I want to filter or switch documentation content by platform (e.g. web, iOS, Android, React Spectrum, SWC) so that I see implementation guidance relevant to my context without scanning content for other platforms.

## Content model (v1)

The picker operates on a **flat content tree**:

- **Per-implementation subtrees under `/platforms/`:**
  - `/platforms/rsp` — the React Spectrum implementation landing page (was previously planned as `/platforms/rsp/overview`; the `/overview` segment was dropped in favor of the impl root being the landing page itself)
  - `/platforms/rsp/[section]/[page]` (e.g. `/platforms/rsp/components/button`)
  - `/platforms/swc` — the Spectrum Web Components implementation landing page (same pattern)
  - `/platforms/swc/[section]/[page]`
- **Agnostic content at the root:**
  - `/components` — the implementation-cards + cross-implementation status-table page (the "All" view). Reached via sitenav or by selecting "All" in the picker. Uses the dedicated `components-overview` template (see Implementation outline).
  - Foundations / Guidance live at the root, outside `/platforms/`.
  - **No per-component agnostic pages in v1.** A page like `/components/[component]` is *not* part of the v1 model — pending the content-authoring open questions. Cross-implementation gap fallback targets `/components` (see the State and content reaction decisions).

No nested "Web" container — implementations are peers. The sitenav hides the `Platforms/` organizational wrapper so visitors never see it as a section. Native platforms (iOS, Android, Desktop) will follow the same flat pattern when they ship in a later phase.

## Prototype reference

The prototype lives in the **Docs-Vision** React SPA. There is **no dedicated `platform-picker` directory** — the picker functionality is spread across the app shell and a status-summary component. Files that were helpful:

- **`Docs-Vision/src/App.tsx`** — owns the picker's state and the option list.
  - `frameworkOptions` array (line 347): the six options the prototype exposes.
  - `useState<FrameworkKey>('react')` (line 711): the state hook.
  - `handleDesignDocsFrameworkChange` callback (line 788): fires on selection; updates state, swaps sidebar menu items, resets the active menu item.
  - The `<Picker>` element rendered around line 2614, with `aria-label="Framework"`, controlled `selectedKey`, `onSelectionChange`, `width: 100%`.
  - `frameworkMenuItems` keyed by framework (line 339): per-framework sidebar menu trees that get swapped in on selection.

- **`Docs-Vision/src/components/ComponentStatusSummaryCards.tsx`** — defines `PlatformSummaryCard` (line 222) which optionally embeds the framework `<Picker>` (line 264) as part of a card that also renders a component-status summary and a device icon. Useful for understanding how the picker composes with surrounding UI; not a generic picker control.

- **`Docs-Vision/src/contexts/`** — checked for a platform-related context, none found. The contexts are limited to IMS and Theme; picker state is local to `App.tsx`, not lifted to a context.

The picker control itself is the **Spectrum 2 `<Picker>` from React Spectrum**, not a custom component.

## Prototype findings

Sourced from `Docs-Vision/src/` (a React SPA — note the architectural mismatch with Spectrum Hub's EDS pipeline). The prototype calls this a **framework picker**, used interchangeably with "platform" in places (e.g. `PlatformSummaryCard` wraps the picker). Naming TBD for our port.

### Where it lives in the prototype

- **State owner:** `Docs-Vision/src/App.tsx` — `const [selectedFramework, setSelectedFramework] = useState<FrameworkKey>('react');` (line 711). All side effects flow from this one state hook.
- **UI:** Spectrum 2 `<Picker>` (a listbox-popup dropdown from React Spectrum) rendered around line 2614, with `aria-label="Framework"` and `width: 100%`. When a status summary is present it's embedded inside `<PlatformSummaryCard>` (`src/components/ComponentStatusSummaryCards.tsx:222`); otherwise it renders standalone.
- **Placement:** in the sidebar's section-2 "top" region (`<div className="components-sidebar-section2-top">`). The sidenav-equivalent below it reacts to the selection.

### Options (the actual list)

```ts
const frameworkOptions = [
  { id: 'all',                label: 'All' },
  { id: 'react',              label: 'React' },
  { id: 'web-components-20',  label: 'Web Components Gen2' },
  { id: 'ios',                label: 'iOS' },
  { id: 'android',            label: 'Android' },
  { id: 'desktop',            label: 'Desktop' },
];
```

Six options today, mixed across implementations (React, SWC) and native platforms (iOS, Android, Desktop), plus "All" for the cross-platform status view. **Selection model is single-select** (the Picker's `selectedKey` is a single value, not an array).

### Side effects of changing the selection

The `handleDesignDocsFrameworkChange` callback (App.tsx:788) does **all** of the following on every selection:

1. Updates `selectedFramework` state.
2. Swaps the sidebar menu's items entirely — `frameworkMenuItems[selectedFramework]` is a per-framework menu tree (App.tsx:339–344).
3. Resets the currently-selected nav item to the first valid item for the new framework (different defaults per platform — `'all'` → status table, native platforms → first leaf of root).
4. Changes badge rendering mode on nav items (e.g. React shows "live" badges, SWC shows version badges — App.tsx:2638–2647).
5. The displayed page content swaps based on `selectedMenuItem`, not directly by `selectedFramework`. So changing the framework cascades through menu selection and only indirectly swaps content.

### Persistence

**None.** State lives in `useState` in `App.tsx` and resets on page reload. No URL param, no localStorage, no session storage. A visitor's selection is per-session per-tab.

### Accessibility

- The Spectrum 2 `<Picker>` is React Spectrum / React Aria — implements APG **Combobox + Listbox popup** pattern under the hood. Keyboard, focus management, ARIA states are all handled by the library.
- `aria-label="Framework"` is the only explicit ARIA the prototype adds.

### Status summary integration

`PlatformSummaryCard` co-locates the picker with a status summary (e.g. "Mix of N components: stable X, beta Y, planned Z") and a device icon (laptop / mobile / desktop). This binds *picker* and *summary visualization* into one component — useful when the picker drives a status table, less useful as a generic site-wide control.

### Differences worth flagging for the Spectrum Hub port

1. **No React.** Spectrum Hub is EDS — vanilla HTML + decoration JS. The Spectrum 2 `<Picker>` doesn't drop in. We'd need either Spectrum Web Components' `<sp-picker>` (Lit-based, already a dep), a vanilla APG-compliant combobox, or a native `<select>` styled with Spectrum tokens.
2. **No SPA state.** No React state survives page navigation. We need an explicit persistence layer (URL param is the most EDS-native — shareable, deep-linkable, no JS-dependent state).
3. **Content reaction model is different.** Docs-Vision swaps a whole React menu tree by framework. In Spectrum Hub, "content reacts to platform" can mean: filtering the sitenav, hiding/showing blocks, swapping content sections, or routing to platform-prefixed pages. Authoring contract is the big open question.
4. **The "All" option is meaningful in Docs-Vision** because the status table aggregates across frameworks. Our use case for "All" depends on whether we have cross-platform views.

## Open questions

None remaining for v1. Content-authoring conventions captured as a working assumption in Decisions (see "Content authoring"); revisit triggers noted there.

## Decisions

Grouped by concern. Each cluster answers a piece of "what is this picker and how does it work."

### Scope

- **v1 ships React Spectrum and Spectrum Web Components only.** iOS, Android, Desktop are planned for a future phase. The architecture below accommodates them without changes.

### IA & options

- **Flat IA at both the data layer and the picker UI.**
  - Implementations diverge enough (e.g. TreeView exists in RS but not SWC) that forcing a Web parent creates rationalization problems.
  - **Data layer:** RS and SWC are peer entries at the root of `/platforms/`. No `/web/` segment.
  - **Picker UI options:** All, React Spectrum, Spectrum Web Components. No "Web" entry.
  - Future native-platform entries follow the same flat pattern.
  - **Revisit trigger:** if the layered content model (Future state section) is formally adopted, the data-layer side comes back open. Picker UI likely stays flat regardless.

- **"All" is kept as an explicit picker option** for stepping out to the cross-implementation overview at `/components` (implementation cards + status table).
  - **Behavior:** selecting "All" from `/platforms/[impl]/components/[component]` navigates to `/components`. From there, visitors can drill back in via the impl cards (browse by library) or the status-table rows (browse by component).
  - **In v1:** "All" surfaces React Spectrum vs Spectrum Web Components. Expands to include native platforms as they ship.

- **Native-platform entries are planned-future; implementation entries are extensible.** Native list is bounded (iOS, Android, Desktop) and can be hardcoded when added. Implementation list grows over time (SWC gen 1 → gen 2; future web frameworks) and should be data-driven so adding one doesn't require a code change.

### Control, a11y, and selection

- **APG pattern: Select-Only Combobox.** [APG reference](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/).
- **Control: custom Lit `<hub-picker>`** (`blocks/picker/picker-element.js`). Implements APG Select-Only Combobox keyboard, focus, and ARIA ourselves on top of the existing `deps/lit/dist/index.js`. Originally planned as SWC's `<sp-picker>`; switched to a hand-rolled Lit element to avoid SWC bundle build-step drift (no CI step rebuilds bundled deps when SWC versions float). See commits `42c45bc`–`f4e15b7`.
- **Single-select.** URL is canonical — can only encode one option at a time. No multi-select product requirement; "All" already covers cross-implementation comparison.
- **Mobile:** open design decision. The plan originally inherited `<sp-picker>`'s tray/dialog mode at narrow widths; the custom `<hub-picker>` has no equivalent. Current behavior: popdown listbox below the trigger on all viewports. Revisit if mobile UX testing shows the popdown isn't acceptable — implementing a tray would be a non-trivial follow-up.

### Placement

- **Section-scoped: the picker lives with the sitenav.**
  - **Where it appears:** any page under `/platforms/[impl]/...`, including:
    - The implementation landing page itself (`/platforms/rsp`, `/platforms/swc`).
    - Implementation-specific component pages (`/platforms/[impl]/components/[component]`).
    - Any other section under an implementation that lands in v1+ (e.g. impl-specific foundations should they exist).
    - This is wider than originally planned — the v0 sketch limited the picker to component detail pages only. Reality: anywhere the visitor is inside an implementation context, switching to the sibling impl is a meaningful action (it preserves the path *after* the impl segment — see Picker navigation below).
  - **Where it does NOT appear:** `/components` (uses the implementation-cards + status-table overview instead — reached via sitenav, not picker), `/foundations/*`, `/guidance/*`, homepage, top-level marketing pages. The picker is gated by the picker block itself reading the URL — the templates inject the block unconditionally and it self-removes on non-platform paths.
  - **Picker navigation behavior:** selecting a different impl preserves the path *after* the impl segment. From `/platforms/rsp/components/button` → swc → `/platforms/swc/components/button`. From `/platforms/rsp` (bare impl root) → swc → `/platforms/swc` (no trailing slash; the trailing-slash form returns 404 in AEM). Selecting "All" always routes to `/components`.
  - **Desktop:** rendered above the sitenav in the left rail. `<sp-picker>` inline; popup listbox opens below the trigger.
  - **Mobile:** rendered inside the section-menu disclosure (the existing collapsed `<details>` that wraps the sitenav at narrow widths). Visitors tap "Section menu" to open the disclosure; the picker sits at the top of that expanded panel, above the sitenav links. Tapping the `<hub-picker>` trigger opens the popdown listbox below it (see Control/a11y/selection above re: no tray mode in v1).
  - **Visual treatment / copy:** reads as a "view perspective" lens, not dev tooling.
  - **Tradeoff for bouncing audiences (designers, evaluators):** on mobile, they have to open the section menu before switching implementations — more friction than persistent chrome placement. Accepted in exchange for clean section-scoping and a single source of truth for "where the picker lives."
  - **Future revisit:** when the unified-mobile-drawer ticket ships (combining header nav + sitenav into one drawer), the section-menu disclosure folds into that drawer. The picker will end up inside the drawer's section-nav region, not the global header region. The current "picker is not a contributor to the drawer" note in `unified-mobile-drawer-ticket.temp.md` will need re-examination then.

### State and content reaction

- **URL is canonical state.** Picker is a navigation control, not a stateful filter. Picker's selected state is *derived* from the URL.
- **Sitenav swaps subtree** based on the URL. Page-nav rebuilds from the new page's `<h2>`s naturally. No special cross-block wiring needed.
- **Effective scope of effect: site-level.** Picker state follows the visitor as they navigate.
- **Cross-implementation gaps fall back to `/components`.** When SWC has no TreeView and the visitor switches the picker (or deep-links to `/platforms/swc/components/tree-view`), they land at `/components` — the status table shows the gap authoritatively (no row in the SWC column for that component). No per-gap authoring required.
- **localStorage deferred from v1.** Siblings are rendered as visible labeled links (see below), so there's no "discover the sibling" problem to solve. Revisit if visitors complain about cross-session continuity.

### Sibling surfacing

- **Renders in the page-nav's related-resources section** alongside Figma component, Dev docs, Copy markdown.
  - On a platform-specific page (e.g. `/platforms/rsp/components/button`): list shows **other implementations** (e.g. "Spectrum Web Components") as jump-offs. The current implementation is implicit (you're on it).
  - **In v1, no "agnostic version" sibling** since no per-component agnostic pages exist. Visitors who want the cross-implementation overview use "All" in the picker → `/components`.
  - **New block:** the related-resources block doesn't exist yet — built alongside the picker as part of v1.

### Content authoring

- **Use fragments for cross-implementation shared content; inline impl-specific content directly.**
  - **Why:** content that applies to both implementations (behavior guidance, accessibility intent, principles for a given component) lives in one authored document. Both implementation pages reference it via the `fragment` block, so editing the source updates both pages on next load. Authoring effort and drift risk are both minimized for the shared content; impl-specific content (e.g. RSP code samples vs. SWC code samples for the same component) remains inline on each impl page where it belongs.
  - **Why fragments specifically:** the `fragment` block already ships (`blocks/fragment/`) and is the EDS-native mechanism for inlining one authored document inside another. No new code required.
  - **Decision history:** the v1 working assumption was "authors repeat per impl page" with content drift accepted as a tradeoff. The revisit trigger (maintenance burden / drift becoming painful) fired during the design lock-in for the implementation-based IA, so the team has moved to the fragment-for-cross-impl pattern now rather than later.
  - **URL convention for shared fragments:** `/fragments/components/<component>/<section>` (e.g. `/fragments/components/button/behavior`). Predictable per-component bucket under an explicit `fragments` namespace so authors and devs can locate the shared source without guessing.
  - **What goes in a fragment vs. inline:**
    - **Fragment:** behavior guidance, accessibility notes, foundational principles, usage do/don'ts — anything that should remain in lockstep across implementations.
    - **Inline on the impl page:** API surface, code samples, version-specific notes, anything that genuinely differs between implementations.
  - **Deviations:** if a section needs to diverge for one implementation, authors either inline that section on the impl page (dropping the fragment reference for that section) or split the fragment into a shared part plus an impl-specific tail. Both are normal authoring operations — no code change.
  - **Foundations and Guidance content** continue to live at the root (`/foundations/*`, `/guidance/*`) and are linked from implementation pages as needed.
  - **Revisit trigger:**
    - If per-component agnostic pages (`/components/[component]`) get authored later, the cross-implementation gap fallback and sibling-surfacing decisions need to be updated to point at them.

## Constraints & dependencies

- **Existing tooling**: stylesheet conventions (`.ai/skills/stylesheet-conventions/`), create-new-block skill, accessibility-compliance skill.
- **Cross-block coordination**: the sitenav and page-nav both consume CSS custom properties for sticky-stacking offsets. If the platform picker is sticky too, it joins the same stacking contract.
- **Test infrastructure**: Phase 0 hygiene complete; new block tests would use `@web/test-runner` per `testing-plan.temp.md`. Playwright + axe-core arrive in Phase 3.

## Implementation outline

### New / modified blocks

1. **Picker block** (new — `blocks/picker/`)
   - Renders the custom Lit `<hub-picker>` defined in `picker-element.js`.
   - Selected state derived from URL (e.g. `/platforms/rsp/...` → `"rsp"`).
   - On selection change → navigate, preserving the path after the impl segment. "All" routes to `/components`.
   - Renders at the top of the left rail (desktop) or inside the section-menu disclosure (mobile).
   - Self-gates on URL: appears on any `/platforms/[impl]/...` page, no-op everywhere else. Templates inject the block unconditionally.

2. **Related-resources block** (new — `blocks/related-resources/`)
   - Labeled-link list, mirroring the existing Figma component / Dev docs / Copy markdown pattern.
   - Adds **sibling-implementation links** (e.g. on a React Spectrum Button page, a link to the SWC Button page).
   - Lives in the page-nav rail (desktop) / page-nav section (mobile).
   - Self-gates on URL: only appears on `/platforms/[impl]/components/[component]` pages (sibling links only meaningful for component-level pages).

3. **Status-table block** (new — `blocks/status-table/`)
   - Renders an implementation status grid. Rows = components. Columns = implementations. Cells = status badges (stable / beta / caution / deprecated).
   - **Per-implementation variants via class:**
     - `<div class="status-table">` — combined view, all impls (used on `/components`).
     - `<div class="status-table rsp">` — RSP only (used on the RSP landing page `/platforms/rsp`).
     - `<div class="status-table swc">` — SWC only (used on the SWC landing page `/platforms/swc`).
     - Unknown classes fall back to the combined view.
   - **Why variant class instead of URL inference:** the block could detect its scope from the current URL (combined on `/components`, single-impl on `/platforms/[impl]`). Variant class was chosen for two reasons: (1) authors get explicit control — placing the block in DA with a class is the same shape EDS uses for every other variant, and (2) URL inference fights you when content authors ever want a combined table on an impl page (or vice versa). Matches the create-new-block skill's stated variant pattern.
   - **Composition:** imports `buildTableElement` from the existing `blocks/table/table.js` to share the role-reset scaffolding (aria-rowgroup, aria-row, etc. that survive responsive `display` changes). The status-table block only owns the per-cell rendering — badges, links to component pages, per-cell aria-labels — and inherits the table-building primitive.
   - **Data:** consumes the two per-impl status manifests (`deps/{rsp,swc}/data/status.json`) via the `getComponentStatus` adapter.

4. **Implementation-cards block** (new — `blocks/implementation-cards/`)
   - The cards-across-the-top at `/components` — one card per implementation.
   - Shows component count (from `/query-index.json` entries under `/platforms/[impl]/components/`); status-ratio visual is deferred until design specs land.
   - Each card links to `/platforms/[impl]` (the impl landing page) — no trailing slash, no `/overview` segment.

5. **Sitenav block** (existing, modified — `blocks/sitenav/`)
   - New behavior: swap rendered subtree based on URL implementation segment.
   - Hides the `Platforms/` organizational wrapper from the visible nav.
   - Drive-by fix: the previous `init` read `pathname.split('/')[1]` raw and produced labels like "Jp navigation" on locale-prefixed URLs. The refactor uses a `strippedPath()` helper so locale-prefixed paths get the same label as the unprefixed default.
   - **Stickiness moved out:** `position: sticky` and its `top` offset used to live on `.sitenav`. After the rail-container-sticky refactor (see Chrome infrastructure below), the rail container pins as a unit and `.sitenav` is regular flow inside it. The inner overlay (`.sitenav > details[open] > .sitenav-list`) keeps its own `z-index` for the open-disclosure popup.

6. **Page-nav block** (existing, modified — `blocks/page-nav/`)
   - Reads `<h2>` elements inside `<main>` to build the in-page TOC.
   - **Fragment-aware refactor.** Previously scanned `main h2` once on `init` — h2s inside async-loading fragments (the `fragment` block fetches and inlines content) were missed. Now: builds the TOC immediately, then watches `<main>` with a `MutationObserver` and rebuilds when h2s arrive (or are removed).
   - **Hot-path optimizations** so the observer is cheap on busy pages:
     - Identity-check short-circuit (compare the new `Set` of h2 references to the last-rendered set; skip the rebuild if unchanged).
     - `requestAnimationFrame` debouncing — back-to-back mutations in the same frame coalesce into a single rebuild.
     - Observer auto-disconnects after `OBSERVER_STABILITY_MS` (3 seconds) with no h2 mutations. Resets on each h2-affecting mutation.
   - **State preserved across rebuilds:** `details.open` (so a mobile visitor's expand state survives a fragment arrival) and the active scroll-spy heading id (so `aria-current="location"` doesn't flash off until the next IntersectionObserver tick).
   - **Stickiness moved out:** same pattern as sitenav — the rail container is the sticky element; `.page-nav` is regular flow inside it.

7. **Table block** (existing, modified — `blocks/table/`)
   - Exports `buildTableElement(headerCells, dataCells)` so specialized table blocks (currently `status-table`) can share the role-reset scaffolding that survives responsive `display` changes (WCAG 1.3.1). The helper was previously a local `const`.
   - The helper also handles `<th scope="row">` row headers correctly — sets `role="rowheader"` instead of `role="cell"` for them. No regression to existing table-block consumers (they pass `<td>` cells).

### New templates

- **`components-overview` template** (`templates/components-overview/`) — owns the `/components` page composition. Renders the heading, implementation-cards, and status-table stacked in a grid. Uses `display: contents` (or equivalent) on `.default-content` / `.block-content` wrappers so authored blocks promote to grid items, and hides empty `.block-content` wrappers DA may emit so the layout doesn't accumulate empty rows.
- **`detail` template** (existing, modified) — left rail wraps picker + sitenav; right rail wraps page-nav + related-resources. Used for `/platforms/[impl]/components/[component]` pages.
- **`landing` template** (existing, modified) — left rail wraps picker + sitenav. Used for `/platforms/[impl]` impl landing pages and other landings (e.g. `/foundations/`). Picker self-gates so it's an empty container on non-platform landings.

### Chrome infrastructure

Emerged during implementation but not in the original plan. Captured here so a future reviewer (or new session) can find the reasoning without spelunking commits.

**Chrome stacking ladder.** Three CSS custom properties in `styles/styles.css` give the chrome a single source of truth for z-index tiers:

```css
--sh-z-sitenav: 10;       /* floor — section chrome (sitenav, page-nav) */
--sh-z-picker: 20;        /* picker's listbox overlays sitenav content */
--sh-z-mobile-menu: 30;   /* ceiling — header mobile-nav drawer */
```

- The picker tier sits above the sitenav tier so the listbox dropping out of the picker host can paint above the sitenav's expanded `<details>` panel. Without this, the sitenav's open-disclosure list painted on top of the picker listbox on mobile (verified bug pre-fix).
- The mobile-menu tier is the highest so the header's mobile-nav drawer wins against any open picker or sitenav.
- Applied at: `blocks/header/header.css` (uses `--sh-z-mobile-menu`), `blocks/picker/picker.css` (host element uses `--sh-z-picker` to establish a stacking context), `blocks/sitenav/sitenav.css` (inner overlay uses `--sh-z-sitenav`), `blocks/page-nav/page-nav.css` (open-disclosure overlay uses `--sh-z-sitenav`), and both rail containers in the templates.

**Rail-container stickiness.** Both rails (`.left-rail` in detail+landing, `.right-rail` in detail) are `position: sticky` themselves, with their stacking context at the appropriate ladder tier:

- `.left-rail` sticks at `top: var(--sh-nav-height)` with `z-index: var(--sh-z-picker)`. Holds the picker (which is why the rail is at picker tier — keeps the picker's effective stacking high enough to overlay the right-rail when the picker listbox drops).
- `.right-rail` sticks at `top: calc(var(--sh-nav-height) + var(--sitenav-summary-height))` on mobile (just below the sitenav summary bar) and `top: var(--sh-nav-height)` on desktop. Holds page-nav + related-resources, both pinned together.
- Both rails set `max-block-size` + `overflow-y: auto` so when the rail's combined content exceeds the viewport, it scrolls internally instead of pushing the page around.
- Sitenav and page-nav blocks had individual `position: sticky` rules previously. Those were removed during the refactor — the rail container is now the canonical sticky element. Both blocks are regular flow inside their container.

**Why container-level instead of per-block sticky:** keeps page-nav + related-resources visually together as the visitor scrolls (instead of related-resources detaching when page-nav sticks). Also gives one place to coordinate sticky offsets across the chrome, instead of each block computing its own `top` value.

### Data sources

| Source | Used by | Notes |
| --- | --- | --- |
| `/query-index.json` (existing) | sitenav, implementation-cards | Already powers the current sitenav. Used to list pages per implementation for nav and counting. |
| `deps/{rsp,swc}/data/status.json` | status-table, implementation-cards | **S2-only** per-impl manifests. Both manifests share a flat schema: `{ package: { default_status }, components: { id: bool }, overrides: { id: status } }`. RSP targets `@react-spectrum/s2`; SWC targets `@adobe/spectrum-wc` (2nd-gen, `swc-*` tags). The dual-generation modeling that earlier drafts had (first_gen / second_gen per component) was dropped — components shipping only in 1st-gen `sp-*` are intentionally invisible to the picker. Today both manifests are hand-authored seeds; extraction pipelines that regenerate them are tracked separately (see Build order step 2). |
| Per-page metadata (`<meta>` tags) | picker | Implementation derived from URL segment, not metadata. |
| Implementations registry | picker, related-resources, implementation-cards | v1: hardcoded list `['rsp', 'swc']`. Future: data-driven per the extensibility decision so adding a new web framework doesn't require a code change. |

### Data flow

**On `/platforms/[impl]/components/[component]`:**

```
URL = /platforms/rsp/components/button
│
├─► Picker block
│     Parse URL → "rsp"
│     Render <hub-picker> value="rsp"
│     On change → navigate to new URL
│
├─► Sitenav block
│     Parse URL → identify section + implementation
│     Fetch /query-index.json
│     Filter to /platforms/rsp/*
│     Render swapped subtree (hide Platforms/ wrapper)
│
├─► Related-resources block
│     Parse URL → current component + implementation
│     Read implementations registry
│     Render OTHER implementations + Figma / Dev docs / Copy markdown
│
└─► Page content (standard EDS block decoration)
```

**On `/components`** (uses the dedicated `components-overview` template):

```
URL = /components
│
├─► (No picker — out of scope per Placement decision)
│
├─► Implementation-cards block
│     Fetch /query-index.json
│     Group by implementation → render one card each, with count
│     (status-ratio visual deferred until design lands)
│
└─► Status-table block (no variant class — combined view)
      Fetch /deps/{rsp,swc}/data/status.json
      Compute union of components across both manifests
      Render table: rows = components, columns = implementations,
      cells = status badges linked to /platforms/[impl]/components/[component]
```

**On a per-implementation landing page** (e.g. `/platforms/rsp`):

```
URL = /platforms/rsp
│
├─► Picker block
│     Parse URL → "rsp"
│     Render <hub-picker> value="rsp"
│     On change → preserve path-after-impl (empty here) → navigate to
│       /platforms/swc (no trailing slash) or /components for "All"
│
├─► Sitenav block
│     Section prefix → /platforms/rsp
│     Filter pages whose path === prefix OR path starts with prefix + "/"
│     Render subtree of children (impl root itself is excluded from its
│     own tree, same as every other section landing page)
│
└─► Status-table block (variant class: rsp)
      Fetch /deps/rsp/data/status.json only
      Render single-column table of RSP components
```

### Layout

**Large screens (≥ 900px)** — 3-column grid template (similar to the existing `detail` template):

```
┌────────────────────────────────────────────────┐
│ Global header                                   │
├──────────┬───────────────────────┬─────────────┤
│ Picker   │ Page heading          │ Page-nav    │
│ Sitenav  │ Body content          │ (anchors)   │
│          │                       │ Related     │
│          │                       │ resources   │
└──────────┴───────────────────────┴─────────────┘
```

- Picker is sticky at the top of the left rail, above the sitenav tree.
- Left rail and right rail are sticky per existing chrome conventions.

**Small screens (< 900px)** — single column; section-menu disclosure folds picker + sitenav together:

```
┌──────────────────────────────────┐
│ Global header (with hamburger)    │
├──────────────────────────────────┤
│ ▶ Section menu (collapsed)        │
│   When expanded:                  │
│   ┌──────────────────────────┐    │
│   │ Picker (<hub-picker>)    │    │
│   │ Sitenav tree             │    │
│   └──────────────────────────┘    │
├──────────────────────────────────┤
│ Page heading                      │
│ Body content                      │
├──────────────────────────────────┤
│ Page-nav (anchors + related)      │
└──────────────────────────────────┘
```

- Tapping "Section menu" expands the disclosure with picker + sitenav inside.
- Tapping the picker opens its native popup/tray for option selection.
- Closing the picker tray and closing the section-menu disclosure are independent actions.

### Build order

Ordered to push decoupling seams to the front. Design specs are still in flight, so blocks built early should be cheap to rework visually. Strategy: shared utilities own all the cross-cutting logic (implementation list, URL parsing, status lookup); blocks stay thin and visual-only; the **templates** own placement and composition (no cross-block DOM mutation). The build flow is *pieces first* (utilities → adapter → individual blocks), *wiring last* (templates compose those blocks into pages), *then verify*.

1. **Shared utilities** (`scripts/utils/`) — **shipped:**
   - `implementations.js` — single source of truth for the implementation list (`IMPLEMENTATIONS`, `ALL_OPTION`), `getImplementationById`, `getOtherImplementations`. Adding a third implementation later = edit one file.
   - `platform-url.js` — URL parsing / building: `getImplementationFromPath`, `getComponentFromPath`, `buildImplementationPath`, `isOnPlatformComponentPage`, `resolveTargetUrl`, `getSectionPrefix`, `getPlatformSectionSuffix`. URL structure changes contained here. Earlier drafts also had `isOnPlatformPage` and `isOnComponentsOverview` — both removed during cleanup as they had no production consumers (only their own tests).
   - `strings.js` — `formatLabel(slug)` and `slugify(text)` extracted as shared helpers (previously duplicated across sitenav, status-table, and page-nav).
2. **Status adapter + S2 manifests:**
   - `scripts/utils/component-status.js` — thin adapter over the per-impl status manifests. Consumers call `getComponentStatus(component, data)` without knowing the manifest's field shape. **Shipped.**
   - `deps/rsp/data/status.json` and `deps/swc/data/status.json` — S2-only per-impl manifests, currently hand-authored seeds. **Shipped as placeholders matching the long-term schema.**
   - **Retargeting the extraction pipelines is now a near-term priority (no longer "defer until after blocks").** Both pipelines currently target non-S2 packages (`@adobe/react-spectrum` v3 classic for RSP, `@spectrum-web-components/*` 1st-gen for SWC), which is at odds with the picker's S2-only contract. Real data is available upstream for both: RSP S2 ships many components, and `@adobe/spectrum-wc` has ~8 beta components today. Without the retarget, the status table can't render anything meaningful beyond the seeded placeholders. Both retarget tickets are open and should be picked up alongside / immediately after the picker work — they are the gating dependency for the status-table block being useful in production.
3. **Authoring contract** — confirm with content team the "repeat content per implementation page" approach in parallel with utility work. Finalize URL patterns and any per-page metadata fields.
4. **Picker block** — custom Lit `<hub-picker>` (defined in `picker-element.js`), URL-derived state, navigation on selection change that preserves the path-after-impl. Self-gates on URL: renders on any `/platforms/[impl]/...` page, no-op everywhere else. Imports utilities. No knowledge of the sitenav or other blocks.
5. **Sitenav extension** — subtree-swap by URL implementation segment; hide `Platforms/` wrapper. Reads utilities for URL parsing and implementation list. Does not know about the picker or related-resources.
6. **Related-resources block** — labeled-link list with sibling-implementation entries. Reads utilities for "other implementations" and `platform-url.js` for building sibling links. Same shape as the picker logic but emits anchor links instead of picker options.
7. **`/components` overview blocks** — implementation-cards block + status-table block. Both consume `component-status.js` and the per-impl status manifests. The status-table block also imports `buildTableElement` from the existing `blocks/table/table.js` to share table-building scaffolding. Built independently of any template — placement comes in step 8.
8. **Template-owned placement + chrome infrastructure** — the three templates that compose these blocks into pages, plus the cross-cutting chrome plumbing:
   - **`templates/detail/`** (modified) — left rail wraps `.picker` + `.sitenav`; right rail wraps `.page-nav` + `.related-resources`. Used for `/platforms/[impl]/components/[component]` pages.
   - **`templates/landing/`** (modified) — left rail wraps `.picker` + `.sitenav`. Used for `/platforms/[impl]` impl landing pages and other landings (e.g. `/foundations/`). Picker self-gates so it's an empty container on non-platform landings.
   - **`templates/components-overview/`** (new) — single-column grid stacking heading, implementation-cards, and status-table for the `/components` page. Uses `display: contents` (or equivalent) on DA's `.default-content` / `.block-content` wrappers so the authored blocks promote to grid items, and hides empty `.block-content` wrappers DA may emit so the layout doesn't gain empty rows.
   - **Chrome stacking ladder + rail-container stickiness** (see "Chrome infrastructure" section above). The rails themselves are the sticky elements; sitenav and page-nav lost their individual `position: sticky` rules during this step. `styles/styles.css` gains the three z-index custom properties; `blocks/header/header.css` uses the top tier so its mobile-nav drawer wins; `blocks/picker/picker.css` puts the picker host at picker tier so its listbox can overlay sitenav content.
   - Across all three templates: no cross-block DOM mutation — each block owns its own DOM, the template just chooses where each lives. When the unified-mobile-drawer ticket eventually lands, the mobile disclosure migration is contained to these template files.
9. **Tests + a11y audit** — block-level unit tests; keyboard / screen-reader pass across the new chrome. Per-block CSS scopes (no `.sitenav .picker { ... }` selectors anywhere); placement-coordination CSS lives on the templates' layout wrappers. Current state: picker element has 50+ tests covering APG Select-Only Combobox; utilities have unit tests; other blocks (sitenav, related-resources, implementation-cards, status-table, page-nav) rely on shared-utility tests + DOM rendering and warrant a dedicated a11y audit (filed as Epic 3 in the breakdown).

The line between **visual rework** (likely) and **structural rework** (less likely) is intentionally encoded in this file layout: design changes → edit blocks; IA / URL / implementation-set changes → edit utilities.

## Future state — layered content model (not adopted)

The team has discussed a more structured three-tier content model plus a cross-cutting layer:

1. **Foundations** — core principles, visual language, accessibility. Cross-everything.
2. **Platform** — components and patterns organized by platform (Web, iOS, Android, Desktop). Cross-implementation *within* a platform. *Would* hold web-only-cross-impl content (e.g. CSS token exposure, browser support, web accessibility).
3. **Implementation** — framework-specific resources and code. Under Web: React Spectrum, Spectrum Web Components. Under each native platform: that platform's SDK / framework.
4. **Guidance** (cross-cutting) — naming, terminology, labels, UX writing patterns.

**Not formally approved.** Tech-lead pushed back on the Web rollup specifically — implementations diverge enough (e.g. TreeView exists in React Spectrum but not in SWC) that forcing a Web parent creates rationalization problems. **v1 follows the flat IA** at both the data layer and the picker UI.

**Revisit trigger:** if the layered model is formally adopted, the data-layer side of the picker's IA decision needs to be re-examined. The picker UI (flat) likely stays unchanged either way per the user-mental-model argument.

## References

- `Docs-Vision/src` — prototype
- `.ai/skills/create-new-block/SKILL.md` — block conventions
- `.ai/skills/stylesheet-conventions/SKILL.md` — CSS conventions
- `.ai/skills/accessibility-compliance/SKILL.md` — a11y patterns
- `unified-mobile-drawer-ticket.temp.md` — for sticky-stacking precedent
- `testing-plan.temp.md` — for test infra
