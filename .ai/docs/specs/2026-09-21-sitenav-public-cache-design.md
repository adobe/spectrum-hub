# Sitenav public cache design

## Status

Approved in design discussion on September 21, 2026.

## Context

The sitenav currently loads from `blocks/sitenav/sitenav.js`. Importing the module starts an async flow that:

1. Checks the IMS session.
2. Fetches the authored nav fragment and the compact query index in parallel.
3. Filters links against the audience-specific index.
4. Decorates the list, adds generated links and badges, and marks the current page.
5. Fetches button icons and inserts `#sitenav` before `main`.

Returning visits start `loadNav()` earlier than first visits, but the nav still waits for authentication, both content requests, decoration, and icon requests before it enters the document. Global CSS reserves the desktop navigation track before insertion. The cache must complement that layout protection rather than replace it.

The final nav is audience-specific. Authenticated index requests use `cache: 'no-store'`, and the authored fragment can contain links that must be removed for an anonymous visitor. Persisting the final DOM, raw fragment response, or unfiltered list could retain private links.

## Goals

- Prevent layout shifts caused by sitenav insertion.
- Make public navigation usable earlier on repeat page loads.
- Continue fetching current navigation data on every page load.
- Replace stale visible navigation when fresh public or authenticated data differs.
- Preserve practical interaction state during replacement.
- Ensure authenticated navigation data is never written to local storage.
- Preserve the current cold-load behavior when no valid cache exists.

## Non-goals

- Offline navigation.
- Caching authenticated or personalized navigation.
- Moving sitenav-specific logic into `scripts.js` or `ak.js`.
- Persisting transient state such as focus, open menus, or the current-page marker.
- Treating local storage as the source of truth.

## Chosen approach

Use a hybrid of synchronous layout reservation and a stale-while-revalidate public source cache.

The cache stores two sanitized inputs needed to reproduce public navigation:

- the anonymous-filtered, pre-sitenav-decoration root `<ul>`;
- anonymous compact index rows normalized to `path` and `title`.

The sitenav uses a dedicated source parser rather than passing this fragment through generic `loadArea()`. The parser extracts and validates the root `<ul>` from the raw response, normalizes its icon placeholders, and filters it with `filterNavByIndex()` before any sitenav decoration. The raw fragment response is never persisted.

The cache does not store decorated `#sitenav` markup. Each page parses and decorates the filtered list again so event listeners, accessibility relationships, generated links, current-page state, and template-specific expansion reflect the current document and JavaScript version.

All cache and replacement behavior remains inside the sitenav block. The generic page loader continues to load the block as it does today.

The cache is enabled only when `getConfig().cdnEnv` is true. Authoring and preview origins intentionally expose gated content through `decorateAudience()` and therefore continue to use the existing uncached `loadArea()` path. They neither read nor write the public snapshot.

## Cache format and policy

Use an origin-scoped key:

```text
spectrum-hub:sitenav:public:v1
```

The stored value has this shape:

```js
{
  version: 1,
  savedAt: 1789956000000,
  filteredListHtml: '<ul>...</ul>',
  indexRows: [
    { path: '/example', title: 'Example' },
  ],
}
```

The cache boundary validates the complete shape before returning data. Storage access and JSON parsing are wrapped because browsers can reject local storage access, including in private browsing modes.

A snapshot can render for up to seven days after `savedAt`. It is still revalidated on every navigation. Expired, malformed, incomplete, version-mismatched, or builder-incompatible data is removed when possible and treated as a cache miss.

`version` is the code-to-cache contract. Any change to source parsing, icon placeholder handling, filtering, generated-link sentinels, or decoration assumptions must increment the version in the same change.

Fresh anonymous data replaces the cache only when both the fragment and compact index requests succeed. Authenticated data can update the visible nav but never local storage. Storage write or quota failures do not block rendering.

A successful unchanged anonymous refresh rewrites `savedAt` so an actively validated cache does not expire merely because the content remained stable.

Change detection uses two canonical strings:

- `filteredListHtml` is the root list's `outerHTML` on the production CDN after dedicated parsing, icon normalization, anonymous audience pruning, and query-index filtering, before sitenav decoration.
- `indexRows` contains only trimmed `path` and `title` strings, sorted first by `path` and then by `title`, and serialized with `JSON.stringify()`.

The implementation compares those strings directly and does not need a separate cryptographic hash.

## Component boundaries

### Public cache boundary

The cache boundary has no DOM responsibilities. It:

- reads and validates the versioned snapshot;
- normalizes public index rows;
- determines whether a snapshot is too old to render;
- compares canonical source snapshots;
- writes only data explicitly identified as anonymous;
- removes invalid entries when storage permits.

### Nav builder

The nav builder accepts filtered list HTML and index rows and returns a detached nav tree for the current page. It:

- parses and validates one root `<ul>`;
- converts canonical authored icon placeholders synchronously with the existing `getSvgRef()` helper;
- decorates list levels and accessibility relationships;
- generates index-based links and badges;
- marks and expands the current page;
- creates controls with synchronous SVG references and fixed button dimensions.

The source parser canonicalizes icons before serialization so the cached representation cannot depend on the timing of `loadArea()`'s fire-and-forget icon import. Both a newly fetched list and a cached list enter the builder with the same authored `span.icon` placeholder form.

The expand and mobile trigger buttons must not await `fetchSvgEl()` before mount. They use `getSvgRef()` or an equivalent synchronous SVG reference so complete control shells enter the document immediately. Existing CSS dimensions reserve their geometry while the external SVG resource resolves.

`getSvgRef('expandright', ..., 20)` and `getSvgRef('appsall', ..., 20)` resolve to the same `/img/icons/s2-icon-*-20-n.svg#icon` assets used by the fetched controls today.

The current module-level `INDEX_BASED_NAV` entries contain mutable `count` and `label` properties. Rebuilding twice on one page would carry state between builds. Those counters and element references must become per-build state before cached and fresh trees can coexist safely.

### Mount controller

The mount controller owns the active nav and its global listeners. Its lifecycle has two phases:

1. **Build:** create the detached tree and element-local handlers.
2. **Activate:** insert the tree, attach document/window handlers, initialize visibility-dependent roving tabindex, synchronize tooltips, and restore focus and scroll.

The controller:

- inserts the first completed nav;
- captures restorable UI state;
- replaces the active nav atomically;
- restores matching UI state;
- removes listeners and timers owned by the previous nav.

Document and window listeners should use an `AbortController` or an equivalent explicit cleanup contract. A replacement must not leave handlers closed over a detached nav.

No visibility-dependent setup, ID-based document lookup, or tooltip upgrade runs against the detached tree. Those steps begin only after atomic insertion, when the fresh tree is the document's sole owner of the generated IDs. The existing `rovingTabindex()` `signal` option participates in the controller's abort-based cleanup rather than introducing another teardown path.

## Load flow

### Cached path

1. Global CSS reserves the desktop sitenav track.
2. If `cdnEnv` is true, the sitenav module reads the public snapshot. Off-CDN environments skip the remaining cached path.
3. If the snapshot is valid and no more than seven days old, the builder creates a current-page nav from it.
4. The controller mounts the cached nav without waiting for IMS, nav-content requests, or fetched control SVGs.
5. Revalidation continues independently.

The cached path contains public links only. It is safe to show before IMS resolves.

### Revalidation path

1. Resolve the current IMS state.
2. Fetch `/fragments/nav/site-nav.plain.html` and `/query-index.json?compact=true` in parallel.
3. Keep `cache: 'no-store'` on the compact index request for authenticated visitors.
4. On the production CDN, parse the fresh fragment through the dedicated sitenav source parser, normalize its icon placeholders, remove any remaining `.audience-private` content for an anonymous visitor as defense in depth, then filter its root list with the fresh index. The canonical string is captured only after both audience-removal steps.
5. Serialize the canonical filtered, pre-sitenav-decoration list and normalized index rows.
6. Build a fresh nav off-DOM from that source.
7. Compare the fresh canonical source with the mounted source in memory for every visitor. If it is unchanged, keep the existing nav.
8. If the source differs, replace the nav atomically and restore interaction state.
9. If the visitor is anonymous and both inputs succeeded, persist the normalized public snapshot.

The direct `.plain.html` URL avoids the redirect currently observed for the extensionless production URL and retains normal browser `ETag` validation.

The dedicated CDN parser intentionally omits unrelated `loadArea()` behavior such as section grouping, picture decoration, and block loading. The sitenav consumes only the root list. Icon conversion is the one required former side effect and belongs explicitly to the nav builder.

Authenticated visitors intentionally receive the cached public nav before IMS resolves, followed by one state-preserving replacement when their fresh source includes private content. This is an accepted cost of the approved render-public-first behavior.

### Authoring and preview path

When `cdnEnv` is false, skip local storage and preserve the existing fragment processing path, including `decorateAudience()`. This avoids storing gated preview markup and prevents production cache assumptions from changing authoring behavior.

### Cold path

With no usable snapshot, the fresh network path remains authoritative. A failed fragment request continues to omit the sitenav. Cache persistence requires a successful fragment and index response even if existing network rendering retains its current fail-open behavior when the index is unavailable.

If a cached source passes storage validation but the builder rejects it, remove the cache entry, report the failure through the repository logger, and continue the fresh network path. Do not insert a partial cached nav.

### Revalidation failure

If a cached nav is mounted and either required fresh input fails, keep the cached nav for that page. Do not partially replace it or overwrite the last known-safe public snapshot.

## State-preserving replacement

Before replacing the active nav, capture:

- whether the desktop rail is expanded;
- the stable identity of each open disclosure;
- focused control or link identity;
- level-2 menu scroll positions;
- mobile overlay state when replacement occurs while open.

Build the fresh nav before changing the document. Replace the old node in one operation, run the controller's post-insert activation, then restore state where the same stable identities still exist.

If a focused item no longer exists, focus its nearest surviving parent disclosure. If no parent survives, focus the appropriate expand or mobile trigger control. Never allow a replacement to silently drop keyboard focus to `body`.

The fresh content remains authoritative. State restoration must not reopen a disclosure that no longer has content or restore a scroll offset outside the new menu bounds.

Replacement should reuse the existing `SCROLL_KEY` session storage mechanism. Flush pending scroll state before capture, then restore it through the same bounded visibility checks rather than creating a second persistence path.

## Layout behavior

Caching is not the primary CLS control. The existing `--sitenav-track-width` grid reservation remains active before `#sitenav` exists:

- desktop reserves the rail and applicable level-2 width;
- mobile keeps the track at zero because navigation is a fixed overlay;
- transitions begin only after `#sitenav` is present.

Implementation should verify that cached insertion and fresh replacement do not change the main content's desktop position. If a route cannot determine its final level-2 width before current-page decoration, prefer a stable reserved shell over moving fetch or block-specific logic earlier in the global loader.

## Accessibility

Both cached and fresh trees run through the same builder. No ARIA attributes or event wiring come from serialized DOM.

Replacement must preserve:

- the `nav` landmark name;
- unique menu and control IDs;
- `aria-controls`, `aria-labelledby`, `aria-expanded`, and `aria-current`;
- roving tabindex behavior;
- focus containment for the mobile overlay;
- reduced-motion behavior.

The old tree and its listeners must be fully inactive after replacement.

## Error handling

- Treat local storage exceptions as cache misses or failed writes.
- Treat malformed and unsupported cache entries as invalid.
- Keep a mounted cached nav when revalidation fails.
- Never persist a raw fragment response, an unfiltered list, incomplete inputs, or authenticated inputs.
- Do not return success-shaped empty data for failed required requests.
- Use the repository logger for unexpected parse, build, or replacement failures while allowing the network-first fallback to continue.

## Verification

### Unit tests

Cover:

- valid, expired, malformed, incomplete, and version-mismatched snapshots;
- denied local storage access and quota failures;
- cached mounting before unresolved IMS and network promises;
- anonymous refresh persistence with normalized `path` and `title` rows;
- authenticated rendering without persistence;
- disabled cache reads and writes when `cdnEnv` is false;
- anonymous audience pruning before canonical serialization;
- failed index refresh not overwriting the safe public snapshot;
- unchanged anonymous source retaining the existing DOM node;
- unchanged authenticated source retaining the existing DOM node without persistence;
- changed source replacing the nav once;
- restoration of expansion, open disclosures, focus fallback, overlay state, and scroll;
- cleanup of previous document/window listeners;
- independent generated-link counters across multiple builds.

### Browser and accessibility tests

- Run the existing axe and ARIA snapshot coverage for cold and cached paths.
- Add delayed fragment and index routes to prove the cached nav remains interactive while revalidation is pending.
- Verify changed fresh data swaps without an intermediate empty nav.
- Verify private links returned to an authenticated request never appear in local storage.
- At desktop widths, record layout positions or layout-shift entries before mount, after cached mount, and after fresh replacement.
- At mobile widths, verify the fixed overlay does not reserve a grid track.

### Performance acceptance criteria

- No layout shift is attributable to cached insertion or fresh replacement.
- Cached public controls are usable before delayed revalidation completes.
- Unchanged anonymous fresh data causes no DOM replacement.
- Unchanged authenticated fresh data also causes no DOM replacement and is never persisted.
- Changed data causes one atomic replacement.
- Cold-load timing does not regress because of cache work.
- Repeated replacement does not duplicate fetches, timers, or global listeners.

Manual comparison should use the same route, viewport, cache state, and network throttling for the current implementation, a cold load, and a cached load.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Persisting private links | Serialize only the post-filter root list, and write only after IMS identifies an anonymous visitor and both public inputs succeed. |
| Preview exposes gated markup | Disable cache reads and writes off the production CDN and preserve the existing audience-aware load path. |
| Stale or incompatible data | Use a versioned schema, a seven-day maximum stale age, and validation. |
| Code deploy changes the parsing contract | Increment the cache version with every parser, icon, filtering, sentinel, or decoration contract change; discard builder-incompatible snapshots. |
| Duplicate global listeners | Give the mount controller explicit teardown through an abort signal or cleanup callbacks. |
| Lost focus during replacement | Capture stable identities and provide a nearest-parent fallback. |
| Double-counted generated links | Move mutable index-based nav state into each build. |
| Main content shift | Keep synchronous CSS track reservation and measure positions during both mounts. |
| Local storage unavailable | Fail open to the existing network path without blocking rendering. |
| Large index data | Store only normalized `path` and `title` fields and catch quota failures. |
