# Platform picker — plan

> **Scratch doc.** Living plan for a new multi-platform picker feature in Spectrum Hub. Evolves as we explore requirements. Replace with a Jira epic or RFC once the shape stabilizes; delete this file then.

## Purpose

User story: as a Spectrum Hub visitor, I want to filter or switch documentation content by platform (e.g. web, iOS, Android, React Spectrum, SWC) so that I see implementation guidance relevant to my context without scanning content for other platforms.

## Content model (v1)

The picker operates on a **flat content tree**:

- **Per-implementation subtrees under `/platforms/`:**
  - `/platforms/rsp/[section]/[page]`
  - `/platforms/swc/[section]/[page]`
- **Agnostic content at the root:**
  - `/components` — the implementation-cards + cross-implementation status-table page (the "All" view). Reached via sitenav or by selecting "All" in the picker.
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
  - **Where it appears:** `/platforms/[implementation]/components/[component]` — implementation-specific component pages.
  - **Where it does NOT appear:** `/components` (the implementation-cards + status-table overview page — reached via sitenav, not picker), `/foundations/*`, `/guidance/*`, homepage, top-level marketing pages. The picker only exists where switching implementation context for the current content is a meaningful action.
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

- **Working assumption: authors repeat information per implementation page.**
  - **Why:** simplest authoring model — each `/platforms/[impl]/components/[component]` page is self-contained and authoritative for that implementation. No fragments to share, no metadata to mark cross-cutting content, no per-component agnostic page to maintain.
  - **Implication:** content that applies to both React Spectrum and SWC (e.g. usage principles for Button) is duplicated across both implementation pages. Authors keep parity by editing both when content changes.
  - **Tradeoff:** content drift between implementation pages is the well-known cost. Accepted for v1 in exchange for the authoring simplicity.
  - **Foundations and Guidance content** are the only true cross-implementation content. They live at the root (`/foundations/*`, `/guidance/*`) and are linked from implementation pages as needed.
  - **Revisit triggers:**
    - If maintenance burden / content drift becomes painful, revisit by introducing fragments shared across implementation pages.
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
   - On selection change → navigate to the corresponding URL (or `/components` if "All").
   - Renders at the top of the left rail (desktop) or inside the section-menu disclosure (mobile).
   - Only present on `/platforms/[impl]/components/[component]` pages.

2. **Related-resources block** (new — `blocks/related-resources/`)
   - Labeled-link list, mirroring the existing Figma component / Dev docs / Copy markdown pattern.
   - Adds **sibling-implementation links** (e.g. on a React Spectrum Button page, a link to the SWC Button page).
   - Lives in the page-nav rail (desktop) / page-nav section (mobile).

3. **Status-table block** (new — `blocks/status-table/`)
   - Renders the cross-implementation comparison at `/components`.
   - Rows = components. Columns = implementations. Cells = status badges (stable / beta / planned / etc.).
   - Reads `/query-index.json` plus per-page metadata.

4. **Implementation-cards block** (new — `blocks/implementation-cards/`)
   - The cards-across-the-top at `/components` — one card per implementation.
   - Shows component count + status-ratio visual.

5. **Sitenav block** (existing, modified — `blocks/sitenav/`)
   - New behavior: swap rendered subtree based on URL implementation segment.
   - Hides the `Platforms/` organizational wrapper from the visible nav.

### Data sources

| Source | Used by | Notes |
| --- | --- | --- |
| `/query-index.json` (existing) | sitenav, implementation-cards | Already powers the current sitenav. Used to list pages per implementation for nav and counting. |
| `deps/swc/data/status.json` (new) | status-table, related-resources, implementation-cards | Extracted from npm + unpkg metadata for `@spectrum-web-components/*` (1st-gen, `sp-*` tag names) and `@adobe/spectrum-wc` (2nd-gen, `swc-*` tag names). Contains per-component presence in each generation, per-generation version → default status (`0.x` → Beta, `1.x` → Stable), and optional hand-curated per-component overrides. |
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

**On `/components`:**

```
URL = /components
│
├─► (No picker — out of scope per Placement decision)
│
├─► Sitenav block
│     Standard components-section nav (no implementation subtree swap)
│
├─► Implementation-cards block
│     Fetch /query-index.json
│     Group by implementation → render one card each, with count + status ratio
│
└─► Status-table block
      Fetch /query-index.json + read per-page metadata
      Group by (component × implementation)
      Render grid with status badges
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

Ordered to push decoupling seams to the front. Design specs are still in flight, so blocks built early should be cheap to rework visually. Strategy: shared utilities own all the cross-cutting logic (implementation list, URL parsing, status lookup); blocks stay thin and visual-only; the template owns placement and composition (no cross-block DOM mutation).

1. **Shared utilities** (`scripts/utils/`) — **shipped:**
   - `implementations.js` — single source of truth for the implementation list (`IMPLEMENTATIONS`, `ALL_OPTION`), `getImplementationById`, `getOtherImplementations`. Adding a third implementation later = edit one file.
   - `platform-url.js` — URL parsing / building: `getImplementationFromPath`, `getComponentFromPath`, `buildImplementationPath`, `isOnPlatformPage`, `isOnComponentsOverview`. URL structure changes contained here.
2. **Status adapter + seed manifests:**
   - `scripts/utils/component-status.js` — thin adapter over the per-impl status manifests. Consumers call `getComponentStatus(component, impl)` without knowing the manifest's field shape. **Shipped.**
   - `deps/swc/data/status.json` and `deps/rsp/data/status.json` — hand-authored seed manifests matching the adapter's schema. **Shipped as placeholders.**
   - Extraction pipelines that regenerate these from npm + unpkg are **deferred to follow-up tickets.** RSP retargets from `@adobe/react-spectrum` (v3 classic) to `@react-spectrum/s2`; SWC moves to `@adobe/spectrum-wc` (2nd-gen) once Button and ActionButton land there. Both tickets are open; this plan unblocks block work in the meantime by treating the seed manifests as the contract.
3. **Authoring contract** — confirm with content team the "repeat content per implementation page" approach in parallel with utility work. Finalize URL patterns and any per-page metadata fields.
4. **Picker block** — `<sp-picker>` wrapper, URL-derived state, navigation on selection change. Imports utilities. Wrapped in a thin facade so swapping the underlying control later (e.g. for a different SWC version, native `<select>`, custom combobox) is contained at the facade boundary. No knowledge of the sitenav or other blocks.
5. **Sitenav extension** — subtree-swap by URL implementation segment; hide `Platforms/` wrapper. Reads utilities for URL parsing and implementation list. Does not know about the picker or related-resources.
6. **Related-resources block** — labeled-link list with sibling-implementation entries. Reads utilities for "other implementations" and `platform-url.js` for building sibling links. Same shape as the picker logic but emits anchor links instead of `<sp-picker>` options.
7. **Template-owned placement** — the components template (or a `section-menu` wrapper block) renders the structural composition so picker and sitenav sit as siblings inside `<details>` on mobile and stack in the left rail on desktop. Neither block mutates the other's DOM. When the unified-mobile-drawer ticket eventually lands, this is the only piece that needs reshuffling.
8. **`/components` overview** — implementation-cards block + status-table block. Both consume `component-status.js`. Build last so design specs have the longest possible runway to arrive before code lands.
9. **Tests + a11y audit** — block-level unit tests; keyboard / screen-reader pass across the new chrome. Per-block CSS scopes (no `.sitenav .picker { ... }` selectors anywhere); placement-coordination CSS lives on the template's layout wrapper.

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
