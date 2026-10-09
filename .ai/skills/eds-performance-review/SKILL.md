---
name: eds-performance-review
description: Review a diff against the core page lifecycle (scripts.js, ak.js, lazy.js, postlcp.js) for fragility, duplication, and unearned performance cost. Use before opening a PR that touches scripts.js or ak.js, when a block wants to hook into core page load for "speed," or when auditing for CLS/LCP regressions and speculative optimizations that were never measured.
---

# EDS Performance & Lifecycle Review

`scripts.js` and `ak.js` run on **every page**, ahead of **every pixel**. Any line added there is a tax every visitor pays, whether or not their page needs it. Default assumption when reviewing a diff to either file: **something is probably wrong** — prove otherwise before approving it.

## The page lifecycle — what already happens, in order

| Step | Where | What runs | Network? |
| --- | --- | --- | --- |
| 1 | `scripts.js` top-level | `spectrum-edge` class, session check, `setScheme`, `getMetadata` reads | No — sync DOM only |
| 2 | `loadPage()` setup | `setConfig`, then `await checkIms()`; `checkIms` returns immediately for anonymous visitors and dynamically imports IMS only for an IMS callback hash or active-session cookie | Conditional IMS import and session checks |
| 3 | Returning-visitor path | `await loadNav()` loads sitenav and, outside marketing pages, page-nav code and styles | Conditional navigation imports |
| 4 | Remaining `loadPage()` setup | `decorateBackground`, `buildAutoHero`, and `buildBreadcrumbs` | Background image requests; synchronous DOM restructuring |
| 5 | `await loadArea()` → `decorateDoc` and `config.decorateArea` | header display mode, hash persistence, and `fetchPriority` on the first eager image | No |
| 6 | `loadArea` preparation | `await decorateAudience`, then empty-section removal, picture decoration, section grouping, and link/block discovery | Conditional IMS check for audience-gated content |
| 7 | `loadArea` **for-loop**, per section, in document order | `loadIcons`, link blocks, then authored blocks — **the loop awaits each section before starting the next** | Yes — dynamic imports run in parallel within each block group |
| 8 | Session setup | Returning sessions begin `loadSession` before the loop; new sessions begin it after section 0. Header and navigation loading are intentionally not awaited here. | Deferred header/navigation imports |
| 9 | After **all** sections | `import('./lazy.js')` → lazy hash, favicon, footer, RUM, and non-production tools | Deferred — good home for work not needed for the initial content |
| 10 | `postlcp.js` | `loadPostLCP` awaits `loadBlock(header)` | ⚠️ **Not currently imported anywhere** — verify before assuming it is wired to an LCP signal. |

Steps 7–9 are the load-bearing insight: **every block already gets its own lazy JS+CSS import and its own progressive, section-ordered slot for free.** A block does not need bespoke code anywhere else to be "lazy," "deferred," or "not block the next section" — `loadBlock`/`loadExperience` already do that for every block, uniformly.

## The core rule

> If a PR touches `scripts.js` or `ak.js`, the default assumption is something is wrong.

The only edits to those two files that are usually fine are **data**, not **logic**: a new `hostnames` entry, a new `linkBlocks` pattern, a new `components` opt-out. The moment a change adds a `querySelector` for a specific block's class, or a dynamic `import()` of a specific block's module, by name, inside `scripts.js` or `ak.js` — that block has leaked into the loader. The loader is supposed to not know which blocks exist; the block should manage its own lifecycle from inside its own `init(el)`.

## The ruthless test

For every line proposed inside `loadPage`, `decorateArea`, or anywhere in `ak.js`'s `loadArea` path, ask:

1. **CLS** — does removing this line cause a layout shift that reserved CSS space (`min-height`, `aspect-ratio`, a skeleton) can't already fix?
2. **LCP** — does removing this line delay paint of the actual LCP candidate (hero image or heading text), measured, not assumed?
3. **Generic or special-cased?** — would this code do the same thing regardless of which blocks happen to exist on the page, or does it name one block/class/feature specifically?
4. **Could this just live in the block?** — could the same work happen inside that block's own `init()`, on the section-loop's natural cadence, with zero visible difference?
5. **Wrong shelf?** — could this move to `lazy.js` (after first paint) or `postlcp.js` (after LCP, once it's actually wired up) with zero visible difference?
6. **Measured or imagined?** — is this fixing a profiled, observed waterfall, or a theoretical one nobody captured a trace of?

If 1 and 2 are both "no," the code does not belong ahead of `loadArea`. If the answer to 3 is "special-cases a block," it belongs in that block's file, full stop.

## Historical case study: the removed `component-status` prefetch hook

An earlier implementation made `decorateArea` run this block-specific prefetch on
every call:

```js
const componentStatus = area.querySelector('.component-status');
if (componentStatus) {
  import('../blocks/component-status/component-status.js')
    .then((mod) => mod.prefetchStatusData(componentStatus));
}
```

This is the exact anti-pattern to catch, for three separate reasons:

1. **It leaks a specific block into the generic loader.** `decorateArea` is meant to be block-agnostic (its only other job is flagging the first eager image). This line makes it know about one block's class name and one block's exported function.
2. **It did not fire for its main use case.** `blocks/page-hero/page-hero.js` creates the `.component-status` element inside its own `init()`, during the section loop and after `decorateArea` has returned. The prefetch therefore could not see that element.
3. **Even where it could fire, it's solving the wrong layer.** The actual user-facing risk of a status pill popping in late is a layout shift — a CSS problem (reserve the pill row's height) — not a network-timing problem. A JS head-start races the fetch against `import()` resolution and buys, at best, a few milliseconds no user can perceive; reserved CSS space costs nothing and can't race.

The hook has been removed. Current code lets `component-status.js` fetch its own
data from `init()`, like other blocks. If pop-in becomes an observed problem,
reserve space in `component-status.css` rather than restoring a loader prefetch.

Use this historical case as calibration for what does not belong in `scripts.js`,
not as a description of current runtime behavior.

## What already runs for free — don't re-solve it

- **Per-block lazy JS+CSS** — `loadBlock`/`loadExperience` already dynamic-imports every block's `.js` and, unless opted out via `components`, its `.css`. A block never needs bespoke "make this lazy" wiring.
- **Progressive, section-ordered rendering** — the `for` loop in `loadArea` already awaits section *N* before starting section *N+1*. A new block doesn't need its own throttling or sequencing logic to avoid competing with earlier content.
- **Deferred non-critical work** — `lazy.js` already runs once, after every section's blocks have loaded. New "not needed for first paint" work belongs there, not folded into `loadPage`/`decorateArea`.
- **Eager LCP image priority** — `decorateArea`'s `eagerLoad` already strips `loading` and sets `fetchPriority: high` on the first non-SVG `<img>` in an area. A new hero/LCP-candidate block doesn't need its own eager-loading code — match the existing selector, or fix the selector if it's too narrow, but don't duplicate the behavior per-block.
- **Config-driven auto-blocking** — a block triggered by a link pattern (search, profile, schedule, fragment, …) doesn't need custom link-scanning code; add one entry to `linkBlocks` in `scripts.js`. That array is the one legitimate, generic, data-only thing `scripts.js` is *for*.

## Reviewing a PR: checklist

- [ ] Diff touches `scripts.js` or `ak.js`? Isolate the exact lines and run the six-question ruthless test above on each.
- [ ] Does anything in either file name a specific block, class, or feature — outside the `linkBlocks`/`components`/`hostnames` config arrays? That's a leak; push it into the block's own file.
- [ ] Is a fetch, computation, or DOM read being hoisted earlier than the block's own `init()` "to avoid a waterfall"? Demand a measured trace, not a theoretical one — and check whether the DOM node it queries for actually exists yet at that point in the lifecycle (see the historical case study).
- [ ] Could the same protection be achieved in CSS (reserved size, skeleton, `aspect-ratio`) instead of a JS timing hack? Prefer CSS — it can't lose a race.
- [ ] Is "lazy" or "deferred" work being added to `loadPage`/`decorateArea` instead of `lazy.js` (or `postlcp.js`, once confirmed wired)?
- [ ] If new code assumes `postlcp.js` fires on an LCP signal — verify that; as of this review it is not imported anywhere.
- [ ] Any logic duplicating what `ak.js`/`scripts.js` already does generically (eager-image flagging, section-ordered lazy loading, link auto-blocking)? Point back to the shared mechanism instead of a parallel one.

## When touching scripts.js/ak.js is legitimate

- A new `hostnames` entry (link rewriting).
- A new `linkBlocks` pattern (link-triggered auto-block).
- A new `components` opt-out (block manages its own CSS loading).
- A genuinely universal decoration applied identically to *every* block without knowing which ones exist (e.g. an accessibility attribute normalization pass, a locale config addition).

Even these should default to a **data** addition to an existing structure, not new conditional branching.
