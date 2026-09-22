# Sitenav Public Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a safe cached public sitenav on repeat production page loads, revalidate it in the background, and replace changed content without layout shift or lost interaction state.

**Architecture:** Add a pure, versioned local-storage boundary beside the existing block. Refactor `sitenav.js` into deterministic source parsing/building and an abortable mount controller, then orchestrate a production-only stale-while-revalidate flow while preserving the current uncached authoring/preview path. Keep all feature logic inside the sitenav block.

**Tech Stack:** Browser ES modules, DOM APIs, local storage, AbortController, Web Test Runner, Sinon, Chai, Playwright, axe-core.

---

## Required skills and references

- Follow `@test-driven-development` for every behavior change.
- Read `.ai/docs/specs/2026-09-21-sitenav-public-cache-design.md` before implementation.
- Read `.ai/skills/eds-performance-review/SKILL.md` before changing the load path. Do not add sitenav-specific logic to `scripts/scripts.js` or `scripts/ak.js`.
- Read `test/a11y/README.md` before changing the Playwright fixture or accessibility spec.
- Run each RED command and confirm the expected failure before writing production code.

## File structure

| Path | Change | Responsibility |
| --- | --- | --- |
| `blocks/sitenav/sitenav-cache.js` | Create | Validate, read, compare, refresh, write, and remove the versioned public snapshot. No DOM or network access. |
| `blocks/sitenav/sitenav.js` | Modify | Parse fresh source, build deterministic nav trees, mount/unmount trees, preserve UI state, and orchestrate cached plus fresh rendering. |
| `test/blocks/sitenav-cache.test.js` | Create | Unit coverage for schema validation, expiry, canonicalization, storage failures, and production-only persistence policy. |
| `test/blocks/sitenav.test.js` | Modify | Unit coverage for deterministic source parsing, repeated builds, listener cleanup, state restoration, and stale-while-revalidate orchestration. |
| `test/a11y/blocks/sitenav.spec.js` | Modify | Route the `.plain.html` request and cover cached rendering, delayed revalidation, replacement, accessibility, and layout stability. |
| `test/a11y/fixtures/sitenav.html` | Modify | Set production-like config before dynamically importing the self-executing block. |
| `test/a11y/mocks.js` | Modify | Export a post-filter cached list and normalized public index rows for browser tests. |

Do not change `scripts/scripts.js` or `scripts/ak.js`.

### Task 1: Add the versioned public cache boundary

**Files:**
- Create: `blocks/sitenav/sitenav-cache.js`
- Create: `test/blocks/sitenav-cache.test.js`

- [ ] **Step 1: Write failing tests for cache validation and expiry**

Create tests that express the public API:

```js
import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import {
  CACHE_KEY,
  CACHE_VERSION,
  MAX_STALE_MS,
  readPublicNavCache,
} from '../../blocks/sitenav/sitenav-cache.js';

describe('sitenav public cache', () => {
  const now = Date.UTC(2026, 8, 21);
  let storage;

  beforeEach(() => {
    storage = {
      getItem: sinon.stub(),
      setItem: sinon.stub(),
      removeItem: sinon.stub(),
    };
  });

  it('returns a valid unexpired snapshot', () => {
    const snapshot = {
      version: CACHE_VERSION,
      savedAt: now - 1000,
      filteredListHtml: '<ul><li><a href="/public">Public</a></li></ul>',
      indexRows: [{ path: '/public', title: 'Public' }],
    };
    storage.getItem.withArgs(CACHE_KEY).returns(JSON.stringify(snapshot));

    expect(readPublicNavCache({ storage, now })).to.deep.equal(snapshot);
  });

  it('removes and rejects a snapshot older than MAX_STALE_MS', () => {
    storage.getItem.returns(JSON.stringify({
      version: CACHE_VERSION,
      savedAt: now - MAX_STALE_MS - 1,
      filteredListHtml: '<ul></ul>',
      indexRows: [],
    }));

    expect(readPublicNavCache({ storage, now })).to.equal(null);
    expect(storage.removeItem.calledWith(CACHE_KEY)).to.equal(true);
  });
});
```

Add separate cases for malformed JSON, the wrong version, missing fields, non-array `indexRows`, invalid rows, denied `getItem()`, and denied `removeItem()`.

- [ ] **Step 2: Run the cache tests and verify RED**

Run:

```bash
npm run test:file -- test/blocks/sitenav-cache.test.js
```

Expected: FAIL because `blocks/sitenav/sitenav-cache.js` does not exist.

- [ ] **Step 3: Implement the minimal cache reader**

Create `sitenav-cache.js` with:

```js
export const CACHE_VERSION = 1;
export const CACHE_KEY = `spectrum-hub:sitenav:public:v${CACHE_VERSION}`;
export const MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000;

const isIndexRow = (row) => row
  && typeof row.path === 'string'
  && typeof row.title === 'string';

const isSnapshot = (value) => value
  && value.version === CACHE_VERSION
  && Number.isFinite(value.savedAt)
  && typeof value.filteredListHtml === 'string'
  && Array.isArray(value.indexRows)
  && value.indexRows.every(isIndexRow);

export function removePublicNavCache(storage = localStorage) {
  try {
    storage.removeItem(CACHE_KEY);
  } catch {
    // Storage is optional; the network path remains authoritative.
  }
}

export function readPublicNavCache({
  storage = localStorage,
  now = Date.now(),
} = {}) {
  try {
    const value = JSON.parse(storage.getItem(CACHE_KEY) ?? 'null');
    if (!isSnapshot(value) || now - value.savedAt > MAX_STALE_MS) {
      removePublicNavCache(storage);
      return null;
    }
    return value;
  } catch {
    removePublicNavCache(storage);
    return null;
  }
}
```

- [ ] **Step 4: Run the cache tests and verify GREEN**

Run:

```bash
npm run test:file -- test/blocks/sitenav-cache.test.js
```

Expected: PASS.

- [ ] **Step 5: Write failing tests for canonicalization, comparison, and writes**

Cover:

```js
it('normalizes rows to trimmed path/title order', () => {
  expect(normalizeIndexRows([
    { title: ' Zebra ', path: ' /z ', ignored: true },
    { title: 'Alpha', path: '/a' },
  ])).to.deep.equal([
    { path: '/a', title: 'Alpha' },
    { path: '/z', title: 'Zebra' },
  ]);
});

it('refreshes savedAt when unchanged public data validates successfully', () => {
  writePublicNavCache(source, { storage, now, enabled: true, anonymous: true });
  const saved = JSON.parse(storage.setItem.firstCall.args[1]);
  expect(saved.savedAt).to.equal(now);
});

it('never writes off-CDN or authenticated data', () => {
  writePublicNavCache(source, { storage, enabled: false, anonymous: true });
  writePublicNavCache(source, { storage, enabled: true, anonymous: false });
  expect(storage.setItem.called).to.equal(false);
});
```

Also cover quota failure, canonical equality independent of input row order, and inequality when either the filtered list or normalized index changes.

- [ ] **Step 6: Run the new tests and verify RED**

Run:

```bash
npm run test:file -- test/blocks/sitenav-cache.test.js
```

Expected: FAIL because normalization, comparison, and write exports are missing.

- [ ] **Step 7: Implement normalization, comparison, and safe writes**

Add:

```js
export const normalizeIndexRows = (rows) => rows
  .filter(isIndexRow)
  .map(({ path, title }) => ({ path: path.trim(), title: title.trim() }))
  .sort((a, b) => a.path.localeCompare(b.path) || a.title.localeCompare(b.title));

export const sameNavSource = (left, right) => Boolean(left && right)
  && left.filteredListHtml === right.filteredListHtml
  && JSON.stringify(normalizeIndexRows(left.indexRows))
    === JSON.stringify(normalizeIndexRows(right.indexRows));

export function writePublicNavCache(source, {
  storage = localStorage,
  now = Date.now(),
  enabled,
  anonymous,
} = {}) {
  if (!enabled || !anonymous) { return false; }
  const value = {
    version: CACHE_VERSION,
    savedAt: now,
    filteredListHtml: source.filteredListHtml,
    indexRows: normalizeIndexRows(source.indexRows),
  };
  try {
    storage.setItem(CACHE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
```

Keep validation strict enough that empty/malformed HTML cannot reach the builder.

- [ ] **Step 8: Run tests and lint the new module**

Run:

```bash
npm run test:file -- test/blocks/sitenav-cache.test.js
npx eslint blocks/sitenav/sitenav-cache.js test/blocks/sitenav-cache.test.js
```

Expected: both commands pass with no warnings.

- [ ] **Step 9: Commit the cache boundary**

```bash
git add blocks/sitenav/sitenav-cache.js test/blocks/sitenav-cache.test.js
git commit -m "feat(sitenav): add public cache boundary"
```

### Task 2: Make nav source parsing and building deterministic

**Files:**
- Modify: `blocks/sitenav/sitenav.js:1-323`
- Modify: `blocks/sitenav/sitenav.js:503-565`
- Modify: `test/blocks/sitenav.test.js`

- [ ] **Step 1: Write failing source-parser tests**

Export a wished-for `parseNavSource(html, index, { anonymous, cdnEnv })` and test:

```js
it('returns a canonical anonymous-filtered pre-decoration list', () => {
  const source = parseNavSource(`
    <main><div>
      <ul>
        <li><span class="icon icon-home"></span><a href="/public">Public</a></li>
        <li class="audience-private"><a href="/private">Private</a></li>
      </ul>
    </div></main>
  `, [{ path: '/public', title: 'Public' }], { anonymous: true, cdnEnv: true });

  expect(source.filteredListHtml).to.include('span class="icon icon-home"');
  expect(source.filteredListHtml).to.not.include('/private');
  expect(source.indexRows).to.deep.equal([{ path: '/public', title: 'Public' }]);
});
```

Add tests that it rejects a response without exactly one usable root list and that it refuses the cacheable parser when `cdnEnv` is false.

Add a same-site absolute-link case proving that `/private` is filtered when authored as `https://spectrum.adobe.com/private`. External origins must remain untouched.

- [ ] **Step 2: Run the parser tests and verify RED**

Run:

```bash
npm run test:file -- test/blocks/sitenav.test.js
```

Expected: FAIL because `parseNavSource` is not exported.

- [ ] **Step 3: Split JSON fetching from nav-source parsing**

Replace the mixed HTML/JSON `fetchRes()` responsibility with focused helpers:

```js
const fetchText = async (path, init, fetchImpl = fetch) => {
  const response = await fetchImpl(path, init);
  if (!response.ok) { return null; }
  return response.text();
};

const fetchIndex = async (path, init, fetchImpl = fetch) => {
  const response = await fetchImpl(path, init);
  if (!response.ok) { return null; }
  const json = await response.json();
  return json.data;
};
```

Implement `parseNavSource()` so it:

1. Parses raw HTML with `DOMParser`.
2. Selects and validates the root list.
3. Applies the CDN audience rule defensively: remove `.audience-private` for anonymous visitors and `.audience-public` for authenticated visitors.
4. Normalizes authored icons to `span.icon` placeholders.
5. Runs `filterNavByIndex()` on the detached list, comparing the pathname of root-relative links and absolute links whose hostname matches the current origin or `getConfig().hostnames`. External origins are not filtered.
6. Returns `filteredListHtml` plus normalized index rows before `decorateLevel()`.

Do not call `loadArea()` in this production CDN parser. Use `/fragments/nav/site-nav.plain.html` for both CDN and off-CDN requests.

Preserve audience behavior in a separate off-CDN function. Because `.plain.html` returns a bare fragment rather than a document with `<main>`, move the parsed `document.body` children into a detached synthetic `<main>`, call `loadArea({ area: syntheticMain })`, clone the resulting root list immediately, normalize either remaining `span.icon` placeholders or already-converted SVG icons back to the canonical placeholder form, and return the same `{ filteredListHtml, indexRows }` source shape. The clone prevents the fire-and-forget icon import from mutating serialized source after capture.

Add an off-CDN test that includes `.audience-public` and `.audience-private` elements and verifies `loadArea()` still applies the repository's preview audience behavior without throwing on a missing `<main>`.

The off-CDN path still applies `filterNavByIndex()` when the index succeeds and passes the real index rows to `decorateIndexBasedNav()` and `decorateBadges()`. Audience decoration is the only intentional difference from the CDN source path.

Represent an index request failure as `null`, never `[]`. A `null` index skips filtering and index-based generation, renders the authored nav as today's fail-open behavior does, and is never eligible for cache persistence. A successful empty index remains `[]` and filters all unknown local leaf links.

Add tests for both cases:

- no cache plus a failed index (`null`) renders the unfiltered authored nav and does not write cache;
- a successful empty index (`[]`) removes unknown local leaf links.

- [ ] **Step 4: Run parser tests and verify GREEN**

Run:

```bash
npm run test:file -- test/blocks/sitenav.test.js
```

Expected: PASS.

- [ ] **Step 5: Write failing tests for repeatable builds**

Export `buildSitenav(source)` and add tests proving:

- the same source can build twice without duplicate badge counts;
- source icon placeholders become SVG references synchronously;
- current-page state is computed independently per build;
- the expand and trigger buttons exist immediately without calling `fetch`;
- no document-level listener is attached during the detached build.

Use identity assertions rather than serializing large DOM nodes:

```js
it('builds controls without fetching SVG documents', async () => {
  const fetchSpy = sandbox.spy(window, 'fetch');
  const built = await buildSitenav(source);

  expect(built.sitenav.querySelector('.sitenav-expand-btn')).to.not.equal(null);
  expect(built.sitenav.querySelector('.sitenav-trigger-btn')).to.not.equal(null);
  expect(fetchSpy.called).to.equal(false);
});
```

- [ ] **Step 6: Run the builder tests and verify RED**

Run:

```bash
npm run test:file -- test/blocks/sitenav.test.js
```

Expected: FAIL because `buildSitenav` is missing and the controls still await `fetchSvgEl()`.

- [ ] **Step 7: Refactor the builder**

Implement a detached builder that:

- parses `filteredListHtml`;
- synchronously upgrades `span.icon` with `getSvgRef()`;
- uses per-build copies of `INDEX_BASED_NAV` entries instead of mutating module globals;
- runs `decorateLevel()`, then `removeEmptyMenus()`, then `decorateIndexBasedNav()`, `decorateBadges()`, and `findCurrentPageInNav()`;
- creates expand/trigger controls with `getSvgRef('expandright', 'icon', 20)` and `getSvgRef('appsall', 'icon', 20)`;
- returns `{ sitenav, navList, currentLink, buttons }`;
- attaches only listeners scoped to elements inside the detached tree.

Change `decorateIndexBasedNav()` and `decorateBadges()` to accept the per-build index configuration explicitly.

The existing `getExpandButton()` and `getTriggerButton()` exports become synchronous. Update their current unit tests and remove `stubIconFetch()` usage that exists only for these controls.

Preserve `loadIcons()` semantics for `icon-size-*` placeholders: move the size class to the parent and remove the placeholder instead of generating an invalid icon URL.

- [ ] **Step 8: Run focused tests and lint**

Run:

```bash
npm run test:file -- test/blocks/sitenav.test.js
npx eslint blocks/sitenav/sitenav.js test/blocks/sitenav.test.js
```

Expected: PASS with no warnings.

- [ ] **Step 9: Commit deterministic building**

```bash
git add blocks/sitenav/sitenav.js test/blocks/sitenav.test.js
git commit -m "refactor(sitenav): make nav builds deterministic"
```

### Task 3: Add an abortable mount controller and state restoration

**Files:**
- Modify: `blocks/sitenav/sitenav.js:360-607`
- Modify: `test/blocks/sitenav.test.js`

- [ ] **Step 1: Write failing listener-cleanup tests**

Update setup APIs to accept an abort signal and test observable behavior:

```js
it('aborts listeners owned by the replaced nav', () => {
  const first = buildTestNav();
  const second = buildTestNav();
  const controller = createSitenavController(document.querySelector('main'));

  controller.mount(first);
  controller.replace(second);
  document.dispatchEvent(new CustomEvent(SEARCH_EXPAND_EVENT, {
    detail: { label: 'Foundations' },
  }));

  expect(first.navList.querySelector('.level-1-button')
    .getAttribute('aria-expanded')).to.equal('false');
  expect(second.navList.querySelector('.level-1-button')
    .getAttribute('aria-expanded')).to.equal('true');
});
```

Add a pagehide/scroll test proving the detached nav no longer writes scroll state.

- [ ] **Step 2: Run controller tests and verify RED**

Run:

```bash
npm run test:file -- test/blocks/sitenav.test.js
```

Expected: FAIL because setup functions do not accept a signal and no controller exists.

- [ ] **Step 3: Thread one abort signal through active listeners**

Update:

```js
setupOutsideClose(sitenav, { signal });
setupSearchIntegration(navList, { signal });
setupSitenavKeyboardHandling(sitenav, buttons, { signal });
setupScrollMemory(sitenav, { signal });
setupRovingTabindex(sitenav, navList, { signal });
```

Pass `{ signal }` to every `document`, `window`, and nav listener owned by a mounted tree. Ensure aborting also clears the pending scroll timer. Reuse `rovingTabindex()`'s existing `signal` option.

- [ ] **Step 4: Run cleanup tests and verify GREEN**

Run:

```bash
npm run test:file -- test/blocks/sitenav.test.js
```

Expected: PASS.

- [ ] **Step 5: Write failing state-capture and restore tests**

Cover:

- expanded desktop rail;
- open disclosure identities;
- mobile overlay and trigger `aria-expanded`;
- focused link surviving replacement;
- focused removed link falling back to its parent disclosure;
- focused removed branch falling back to the expand/trigger control;
- pending scroll state flushed before replacement;
- scroll restored only when the current link remains visible.

- [ ] **Step 6: Run state tests and verify RED**

Run:

```bash
npm run test:file -- test/blocks/sitenav.test.js
```

Expected: FAIL because state capture and restore are missing.

- [ ] **Step 7: Implement the controller lifecycle**

Create:

```js
export const createSitenavController = (main) => {
  let active = null;

  const activate = (built, state) => {
    const abortController = new AbortController();
    const { signal } = abortController;
    // Attach global listeners, roving tabindex, tooltips, and scroll memory here.
    // Restore state only after insertion.
    active = { ...built, abortController };
    return active;
  };

  return {
    mount(built) {
      if (active) { return this.replace(built); }
      main.before(built.sitenav);
      return activate(built);
    },
    replace(built) {
      if (!active) { return this.mount(built); }
      const state = captureSitenavState(active);
      flushSitenavScroll(active);
      active.abortController.abort();
      active.sitenav.replaceWith(built.sitenav);
      return activate(built, state);
    },
    get active() {
      return active;
    },
  };
};
```

Use stable control/menu IDs already produced by `decorateLevel()`. Do not initialize tooltips or perform `document.getElementById()` lookups on the detached replacement.

`activate()` restores captured state only after insertion, listener setup, roving-tabindex initialization, and tooltip synchronization.

- [ ] **Step 8: Run focused tests and lint**

Run:

```bash
npm run test:file -- test/blocks/sitenav.test.js
npx eslint blocks/sitenav/sitenav.js test/blocks/sitenav.test.js
```

Expected: PASS with no warnings.

- [ ] **Step 9: Commit the mount lifecycle**

```bash
git add blocks/sitenav/sitenav.js test/blocks/sitenav.test.js
git commit -m "feat(sitenav): preserve state across nav swaps"
```

### Task 4: Orchestrate production stale-while-revalidate

**Files:**
- Modify: `blocks/sitenav/sitenav.js:609-685`
- Modify: `test/blocks/sitenav.test.js`
- Test: `test/blocks/sitenav-cache.test.js`

- [ ] **Step 1: Write failing cached-fast-path tests**

Extract the IIFE body into an exported `initSitenav()` with one consistent dependency boundary:

```js
export async function initSitenav({
  config = getConfig(),
  storage = localStorage,
  fetchImpl = fetch,
  checkSession = checkIms,
  now = Date.now(),
  onMount,
} = {}) {
  // Production orchestration.
}
```

Use the same signature in every orchestration test:

```js
const pending = new Promise(() => {});
const source = makePublicSource();
const storage = makeStorageWithSnapshot(source);

it('mounts cached public nav before IMS and content requests resolve', async () => {
  const mounted = deferred();
  const initPromise = initSitenav({
    config: { cdnEnv: true },
    storage,
    checkSession: () => pending,
    onMount: mounted.resolve,
  });

  await mounted.promise;
  expect(document.querySelector('#sitenav')).to.not.equal(null);
  expect(await Promise.race([initPromise, Promise.resolve('pending')])).to.equal('pending');
});
```

Add tests that cache reads are skipped when `cdnEnv` is false and that a builder-invalid snapshot is removed before the fresh path continues.

- [ ] **Step 2: Run fast-path tests and verify RED**

Run:

```bash
npm run test:file -- test/blocks/sitenav.test.js
```

Expected: FAIL because `initSitenav` is not exported and the IIFE still waits for IMS first.

- [ ] **Step 3: Implement cached-first initialization**

`initSitenav()` should:

1. Read `getConfig().cdnEnv`.
2. Create one mount controller.
3. On CDN only, read and build the public snapshot.
4. Mount valid cached output immediately unless a fresh nav has already won the race and become active.
5. Start IMS and fresh content work without awaiting it before the cached mount.
6. On off-CDN origins, skip storage and use the existing `loadArea()` fragment behavior.

When fresh data completes, call `controller.mount(fresh)` if no cache was mounted. Compare and call `controller.replace(fresh)` only when `controller.active` already exists.

Tag build results as `cached` or `fresh`. Fresh is authoritative: if it mounts before the cached build resolves, discard the late cached result. `controller.mount()` also delegates to `replace()` when an active nav already exists so no caller can create a second `#sitenav`.

Keep the side-effect entry point:

```js
initSitenav().catch((error) => log('Could not load site navigation', error));
```

Do not add a second top-level fetch.

Keep `test/blocks/sitenav.test.js` module setup non-CDN so its import-time initializer remains neutralized by the existing bootstrap fetch stub. Production-like config belongs inside individual `initSitenav()` calls, not at module scope.

- [ ] **Step 4: Run fast-path tests and verify GREEN**

Run:

```bash
npm run test:file -- test/blocks/sitenav.test.js
```

Expected: PASS.

- [ ] **Step 5: Write failing revalidation and privacy tests**

Cover:

- unchanged anonymous source keeps the exact mounted `#sitenav` node and refreshes `savedAt`;
- the persisted `savedAt` is a finite number equal to the injected numeric `now`;
- changed anonymous source replaces once and writes the safe snapshot;
- changed authenticated source replaces once but never writes;
- unchanged authenticated source does not replace or write;
- either failed fresh request keeps a mounted cached nav;
- failed index response never overwrites the cache;
- no cache plus a failed index renders the unfiltered authored nav without generated index links and does not write cache;
- a successful empty index filters all unknown local leaf links;
- no cache plus failed fragment preserves today's omitted-nav behavior;
- local-storage exceptions do not reject initialization;
- off-CDN path neither reads nor writes local storage and still uses audience-aware `loadArea()`.

- [ ] **Step 6: Run revalidation tests and verify RED**

Run:

```bash
npm run test:file -- test/blocks/sitenav.test.js
```

Expected: FAIL because fresh source comparison, replacement, and safe persistence are incomplete.

- [ ] **Step 7: Implement revalidation**

Use:

```js
const sessionPromise = checkSession();
const [session, fragmentHtml, index] = await Promise.all([
  sessionPromise,
  fetchText('/fragments/nav/site-nav.plain.html', undefined, fetchImpl),
  sessionPromise.then(({ anonymous }) => fetchIndex(
    '/query-index.json?compact=true',
    anonymous ? undefined : { cache: 'no-store' },
    fetchImpl,
  )),
]);
const { anonymous } = session;
```

Avoid calling `checkSession()` twice: create one promise and reuse it for request policy and source classification. Treat the injected `now` as a numeric timestamp consistently with the cache module.

Handle index outcomes explicitly:

- **Successful array, including `[]`:** filter and generate against that exact result. The source can be compared and, when anonymous, cached.
- **Failed `null`:** if cached nav is active, keep it and stop. If no nav is active, build the authored list without filtering or generated index links to preserve the current fail-open behavior. Never compare or cache this incomplete source.

If no nav is active, mount the fresh tree; otherwise compare against the source associated with the mounted tree and replace only when different. Call `writePublicNavCache()` only with `{ storage, now, enabled: cdnEnv, anonymous }`.

When anonymous content is unchanged, still rewrite the safe snapshot to refresh `savedAt`.

- [ ] **Step 8: Run all sitenav unit tests and lint**

Run:

```bash
npm run test:file -- test/blocks/sitenav-cache.test.js test/blocks/sitenav.test.js
npx eslint blocks/sitenav/sitenav-cache.js blocks/sitenav/sitenav.js test/blocks/sitenav-cache.test.js test/blocks/sitenav.test.js
```

Expected: PASS with no warnings or unhandled promise rejections.

- [ ] **Step 9: Commit stale-while-revalidate behavior**

```bash
git add blocks/sitenav/sitenav-cache.js blocks/sitenav/sitenav.js test/blocks/sitenav-cache.test.js test/blocks/sitenav.test.js
git commit -m "feat(sitenav): revalidate cached public navigation"
```

### Task 5: Add browser-level cache, accessibility, and layout coverage

**Files:**
- Modify: `test/a11y/blocks/sitenav.spec.js`
- Modify: `test/a11y/fixtures/sitenav.html`
- Modify: `test/a11y/mocks.js`

- [ ] **Step 1: Update the route contract and verify it fails first**

Change both fragment route globs in `block.routes` and `levelThreeBlock.routes` from:

```js
url: '**/fragments/nav/site-nav',
```

to:

```js
url: '**/fragments/nav/site-nav.plain.html',
```

Do not change the extensionless sitenav route in `test/a11y/blocks/search.spec.js`; `blocks/search/nav-areas.js` remains a separate consumer and still requests `/fragments/nav/site-nav`.

Run:

```bash
npx playwright test test/a11y/blocks/sitenav.spec.js --project=chromium
```

Expected before production code is complete: FAIL or time out waiting for the new request/ready selector.

- [ ] **Step 2: Add a helper that seeds a valid public snapshot**

Use `page.addInitScript()` before navigation:

```js
async function seedPublicNavCache(page, {
  filteredListHtml = cachedList,
  indexRows = cachedIndexRows,
} = {}) {
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, {
    key: 'spectrum-hub:sitenav:public:v1',
    value: {
      version: 1,
      savedAt: Date.now(),
      filteredListHtml,
      indexRows,
    },
  });
}
```

If the local fixture is not classified as CDN, set production-like config in the fixture before importing `sitenav.js`; do not weaken production gating in application code.

Add `cachedSitenavList` and `cachedSitenavIndexRows` exports to `test/a11y/mocks.js` beside the existing sitenav fixtures. They must represent the post-filter, pre-decoration list and normalized public index rows.

- [ ] **Step 3: Write a failing cached-interactivity test**

Delay both fresh routes with controllable promises. Assert that before releasing them:

- `#sitenav .level-1-list` is visible;
- a level-1 button can open its menu;
- the query-index and fragment requests are pending.

Release the routes and assert the page settles without duplicate nav nodes.

- [ ] **Step 4: Run the cached-interactivity test and verify RED**

Run:

```bash
npx playwright test test/a11y/blocks/sitenav.spec.js --project=chromium -g "cached navigation is interactive"
```

Expected: FAIL until the cached-first orchestrator is wired into the fixture.

- [ ] **Step 5: Make the fixture and test setup production-accurate**

Ensure:

- the fixture config has `cdnEnv: true`;
- the fixture replaces its hoisted static side-effect import with:

  ```js
  import { setConfig } from '/scripts/ak.js';

  setConfig({
    cdnEnv: true,
    components: [],
    hostnames: [],
    linkBlocks: [],
  });
  await import('/blocks/sitenav/sitenav.js');
  ```

- route mocks serve the `.plain.html` URL;
- the cached snapshot contains only post-filter public list markup;
- tests clear local storage between cases that do not intentionally seed it.

- [ ] **Step 6: Write failing replacement and privacy tests**

Add browser tests that:

- use changed fresh content and observe exactly one `#sitenav` replacement;
- keep the old nav visible until the new tree is complete;
- preserve the expanded rail, open disclosure, and focused surviving link;
- use unchanged fresh public data and assert the original DOM node remains connected.

Keep authenticated non-persistence coverage in Task 4's dependency-injected unit tests. Do not load real IMS in this isolated Playwright fixture.

- [ ] **Step 7: Run replacement tests and verify RED, then GREEN**

Run before and after the minimal implementation adjustments:

```bash
npx playwright test test/a11y/blocks/sitenav.spec.js --project=chromium -g "cached|replacement|private"
```

Expected RED: assertions expose missing replacement/state/privacy behavior.

Expected GREEN: all selected tests pass.

- [ ] **Step 8: Add layout-stability assertions**

Capture the main content position and layout-shift entries:

```js
await page.addInitScript(() => {
  window.__sitenavLayoutShifts = [];
  new PerformanceObserver((list) => {
    list.getEntries()
      .filter((entry) => !entry.hadRecentInput)
      .forEach((entry) => window.__sitenavLayoutShifts.push(entry.value));
  }).observe({ type: 'layout-shift', buffered: true });
});

const before = await page.locator('main').boundingBox();
// Release changed fresh routes and wait for replacement.
const after = await page.locator('main').boundingBox();
expect(after.x).toBe(before.x);
expect(await page.evaluate(() => (
  window.__sitenavLayoutShifts.reduce((sum, value) => sum + value, 0)
))).toBe(0);
```

Add a Mobile Chrome case asserting the main width/position remains unchanged and the sitenav overlay does not create a grid track.

- [ ] **Step 9: Run accessibility and layout coverage**

Run:

```bash
npx playwright test test/a11y/blocks/sitenav.spec.js --project=chromium
npx playwright test test/a11y/blocks/sitenav.spec.js --project="Mobile Chrome"
```

Expected: existing axe and ARIA snapshots pass for both cold and cached behavior; cache/replacement/layout tests pass.

- [ ] **Step 10: Commit browser coverage**

```bash
git add test/a11y/blocks/sitenav.spec.js test/a11y/fixtures/sitenav.html test/a11y/mocks.js
git commit -m "test(sitenav): cover cached navigation lifecycle"
```

### Task 6: Run final regression and performance verification

**Files:**
- Verify: `blocks/sitenav/sitenav-cache.js`
- Verify: `blocks/sitenav/sitenav.js`
- Verify: `test/blocks/sitenav-cache.test.js`
- Verify: `test/blocks/sitenav.test.js`
- Verify: `test/a11y/blocks/sitenav.spec.js`

- [ ] **Step 1: Run focused unit coverage**

```bash
npm run test:file -- test/blocks/sitenav-cache.test.js test/blocks/sitenav.test.js
```

Expected: PASS.

- [ ] **Step 2: Run the complete unit suite**

```bash
npm run test:unit
```

Expected: PASS with no browser disconnects or unhandled rejections.

- [ ] **Step 3: Run the sitenav accessibility suite**

```bash
npx playwright test test/a11y/blocks/sitenav.spec.js
```

Expected: PASS for Chromium and Mobile Chrome.

- [ ] **Step 4: Run focused lint**

```bash
npx eslint blocks/sitenav/sitenav-cache.js blocks/sitenav/sitenav.js test/blocks/sitenav-cache.test.js test/blocks/sitenav.test.js test/a11y/blocks/sitenav.spec.js
```

Expected: PASS with no warnings.

- [ ] **Step 5: Compare cold and cached performance manually**

Use the same desktop route, viewport, and throttling profile for each run:

1. Clear local storage and record a cold load.
2. Navigate once anonymously to create the public snapshot.
3. Record a cached navigation while delaying the fragment and index requests.
4. Confirm cached links are usable before fresh responses.
5. Confirm `main` does not move when cached nav mounts or fresh nav replaces it.
6. Confirm unchanged data does not replace `#sitenav`.
7. Sign in, repeat the cached navigation, and confirm fresh private links appear only in memory and never in local storage.

- [ ] **Step 6: Review the final diff against the design**

Run:

```bash
git --no-pager diff --check
git --no-pager diff --stat
git --no-pager status --short
```

Expected: no whitespace errors; only planned files are changed.

- [ ] **Step 7: Commit any final test-only adjustments**

If Task 6 required changes:

```bash
git add blocks/sitenav/sitenav-cache.js blocks/sitenav/sitenav.js test/blocks/sitenav-cache.test.js test/blocks/sitenav.test.js test/a11y/blocks/sitenav.spec.js test/a11y/fixtures/sitenav.html
git commit -m "test(sitenav): verify public cache behavior"
```
