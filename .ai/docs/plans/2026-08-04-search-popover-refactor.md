# Search Popover Refactor Implementation Plan

**Status: implemented and committed** (2026-08-04) — all 4 tasks done, verified against the live dev preview. Notable findings from live verification, kept here for whoever next touches this code:
- The live `site-nav.html` fragment currently has **5** level-1 areas (Getting started, Foundations, Content, Web, Support) — no separate "Mobile" entry, unlike the design reference this plan was written from. Confirms the dynamic-fetch design decision was the right call: nothing hardcodes the count, so it just reflects whatever's live. The unused `Mobile` entry in `NAV_AREA_DESCRIPTIONS` is harmless dead data, not a bug.
- Pill fallback order (implementation → platform → tags, filtering empties) was confirmed against real Algolia data, including a case where `implementation` is empty and the pills correctly fall back to `[platform, tags[0]]`.
- One test file (`test/blocks/search.test.js`) reliably crashed the wtr/puppeteer browser (`Profiler.takePreciseCoverage: Session closed` / "browser disconnected") rather than just failing — root cause was `expect(domNode).to.equal(null)` / `.to.not.equal(null)` where the assertion was guaranteed to fail against a live DOM node pre-refactor; chai's diff-serialization of that node crashed the tab. Fixed by comparing `node === null` as a boolean instead. This is the same failure mode as `[[feedback_chai_dom_assertion_hangs]]`, just with a sharper, reproducible signature than "hangs" — worth checking first if a wtr run reports a browser disconnect instead of a normal test failure.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Follow `.ai/skills/test-driven-development/SKILL.md` for every task below — write the failing test first, watch it fail, then implement.

**Goal:** `blocks/search/search.js` (`<sh-search>`) currently opens its results popover only once a typed query returns hits, and shows title+description per hit. Change it to: (1) show a popover of the sitenav's level-1 areas (title, description, chevron) as soon as the search input mounts/is empty; (2) once the user types, replace that with title + up to 2 tag pills per hit (no description); (3) close (and collapse the input back to its icon button) on click-away or Escape. Clicking a level-1 area expands that same area in the real sitenav, rather than navigating anywhere.

**Architecture:** Two small additions plus one focused rewrite:
- `blocks/search/nav-areas.js` (new) — pure parse function + cached, dependency-injected fetch, mirroring the style of `indexer/aem-client.js`. Fetches `/fragments/nav/site-nav` independently of `blocks/sitenav/sitenav.js` (no shared import — see Global Constraints) and extracts level-1 labels, pairing each with description copy from a small static map.
- `blocks/sitenav/sitenav.js` (modified) — one new exported setup function, `setupSearchIntegration`, following the existing `setupOutsideClose`/`setupSitenavKeyboardHandling` pattern: it listens for a `sitenav:expand-level1` event on `document` and clicks the matching level-1 button, reusing the toggle logic that already exists on that button rather than duplicating it.
- `blocks/search/search.js` (modified) — adds a `navAreas` state array and a `_isNavView` getter (`true` when the query is empty) that switches what the shared listbox renders; generalizes keyboard nav to operate over whichever list (`navAreas` or `results`) is current; adds click-away/Escape close that also collapses the component back to its icon button via the `clear` event `blocks/action-button/action-button.js` already listens for (currently dead code — nothing dispatches it today).

**Tech Stack:** No new dependencies. Lit (existing), `@esm-bundle/chai` + `sinon` + `web-test-runner` for tests, matching `test/blocks/sitenav.test.js`.

## Design decisions already made (do not re-litigate)

- **Nav-area descriptions**: new static map in `nav-areas.js` (`NAV_AREA_DESCRIPTIONS`), keyed by label, independent of `site-nav.html`'s structure. **The "Support" description is a placeholder** (`site-nav.html` and the screenshots supplied don't show it) — flag for content review before merge; the other five are taken verbatim from the supplied screenshot.
- **Level-1 area list**: read live from `site-nav.html` (not hardcoded), so it stays in sync with the sitenav.
- **Clicking a nav area**: does not navigate. It dispatches `sitenav:expand-level1` (detail: `{ label }`) on `document`, which `sitenav.js` picks up to expand that area's level-2 flyout — mirroring a real click on the sitenav's own level-1 button. It also closes and collapses the search popover (see below); this wasn't asked explicitly but avoids two open nav surfaces competing for attention. **Flag this specific behavior for confirmation during review** — it's the one assumption in this plan that wasn't directly confirmed.
- **Tag pills on typed results**: cap at 2, using `implementation` first, then `platform`, dropping the rest of `tags[]` — confirmed against the screenshot (e.g. "RSP" then "Web").
- **View switching**: typing replaces the nav-area list with results; backspacing to an empty query restores the nav-area list (never closes the popover on its own).
- **Close behavior**: click-away or Escape both hide the popover *and* dispatch `clear`, collapsing `<sh-search>` back to the icon button (fixes the currently-unwired listener in `action-button.js:24-26`).
- **Out of scope**: the Algolia fetch/filter logic in `_search()` is untouched — this is a display-layer refactor only.

## Global Constraints

- **No cross-block import between `search.js` and `sitenav.js`.** Both reference the event name `sitenav:expand-level1` as a local string constant with a comment pointing at the other file, rather than one importing it from the other. Reason: `sitenav.js`'s module body is a side-effecting IIFE that fetches and injects the entire sitenav rail on import — importing anything from it in `search.js` would force that rail onto any page that loads search but intentionally has no sitenav.
- **`nav-areas.js` does its own minimal fetch+parse**, not `sitenav.js`'s `fetchRes`. `fetchRes` also runs `loadArea({ area: main })` (decorates blocks inside the fragment) — unnecessary work and an unwanted side effect for a function that only needs plain text labels.
- **Cache the nav-areas fetch at module scope.** `action-button.js` creates a fresh `<sh-search>` element every time the icon is clicked (`handleSearch`, `action-button.js:19-27`), so `connectedCallback` runs on every open — without caching, every open re-fetches the fragment.
- **The outside-click listener must be attached one tick late.** The same click that creates `<sh-search>` (the icon-button click in `action-button.js`) is still bubbling to `document` at the moment `connectedCallback` runs synchronously during insertion. Registering the outside-click listener immediately would have it fire on that same event and self-close instantly. Defer registration with `setTimeout(fn, 0)`.
- **Click events crossing a shadow boundary retarget to the host.** A `document`-level click listener sees `e.target === this` (the `<sh-search>` host) for any click that originated inside its own shadow DOM — so `this.contains(e.target)` correctly excludes all internal clicks without needing `composedPath()`.
- **Test style**: match `test/blocks/sitenav.test.js` — `@esm-bundle/chai` + `sinon`, `describe`/`it`, `sandbox.restore()` in `afterEach`. Never use chai's `.to.equal()`/`.to.deep.equal()` on live DOM nodes (can hang the runner serializing the diff) — compare identity/attributes as booleans instead, e.g. `expect(a === b).to.be.true`.
- **Indentation is 2 spaces**, single quotes, semicolons, trailing commas on multiline literals (existing `.eslintrc`/`eslint.config.js` already enforces this — run `npx eslint` per task).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `blocks/search/nav-areas.js` | Fetch + parse level-1 nav labels from `site-nav.html`; pair with static description copy. |
| `blocks/sitenav/sitenav.js` | Add `setupSearchIntegration` (new export), wire it into the existing IIFE. |
| `blocks/search/search.js` | Nav-area view, results-view tag pills, click-away/Escape close-and-collapse. |
| `blocks/search/search.css` | New pill styles; share row layout between nav-area and results rows; conditional heading. |
| `test/blocks/search-nav-areas.test.js` | Unit tests for `nav-areas.js`. |
| `test/blocks/sitenav.test.js` | Add tests for `setupSearchIntegration`. |
| `test/blocks/search.test.js` | New — component tests for `<sh-search>`'s two views and close behavior. |

Task order: build `nav-areas.js` first (pure, no dependents yet), then the `sitenav.js` listener (small, independently testable), then the `search.js` rewrite that consumes both, then CSS, then a manual verification pass.

---

### Task 1: Nav-area data module

**Files:**
- Create: `blocks/search/nav-areas.js`
- Test: `test/blocks/search-nav-areas.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `NAV_AREA_DESCRIPTIONS: Record<string, string>` — exported so content can tune it without touching parse logic.
  - `parseLevel1Areas(html: string): { label: string, description: string }[]` — pure, no network.
  - `fetchNavAreas(fetchImpl = fetch): Promise<{ label: string, description: string }[]>` — cached at module scope; resolves `[]` on any fetch/parse failure rather than throwing (a broken fragment fetch shouldn't crash the whole search popover).
  - `resetNavAreasCacheForTests()` — test-only, clears the module cache between tests.

- [x] **Step 1: Write the failing test**

Create `test/blocks/search-nav-areas.test.js`:

```js
import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

import {
  parseLevel1Areas, fetchNavAreas, NAV_AREA_DESCRIPTIONS, resetNavAreasCacheForTests,
} from '../../blocks/search/nav-areas.js';

const FRAGMENT_HTML = `<body><header></header><main><div><ul>
  <li><p>Getting started</p><ul><li><a href="/a">a</a></li></ul></li>
  <li><p>Foundations</p><ul>
    <li><p>Principles</p><ul><li><a href="/b">b</a></li></ul></li>
  </ul></li>
</ul></div></main></body>`;

describe('parseLevel1Areas', () => {
  it('extracts only top-level labels, in document order', () => {
    const areas = parseLevel1Areas(FRAGMENT_HTML);
    expect(areas.map((a) => a.label)).to.deep.equal(['Getting started', 'Foundations']);
  });

  it('does not pick up a nested level-2 heading like "Principles"', () => {
    const areas = parseLevel1Areas(FRAGMENT_HTML);
    expect(areas.some((a) => a.label === 'Principles')).to.be.false;
  });

  it('pairs each label with its known description', () => {
    const areas = parseLevel1Areas(FRAGMENT_HTML);
    expect(areas[0].description).to.equal(NAV_AREA_DESCRIPTIONS['Getting started']);
  });

  it('defaults to an empty description for an unknown label', () => {
    const [, foundations] = parseLevel1Areas('<main><div><ul><li><p>Unknown Area</p><ul><li><a>x</a></li></ul></li></ul></div></main>');
    expect(foundations).to.equal(undefined); // only one item in this fixture
    const [only] = parseLevel1Areas('<main><div><ul><li><p>Unknown Area</p><ul><li><a>x</a></li></ul></li></ul></div></main>');
    expect(only.description).to.equal('');
  });

  it('returns an empty array for a fragment with no nav list', () => {
    expect(parseLevel1Areas('<main></main>')).to.deep.equal([]);
  });
});

describe('fetchNavAreas', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    resetNavAreasCacheForTests();
  });

  afterEach(() => sandbox.restore());

  it('fetches the site-nav fragment and parses it', async () => {
    const fetchImpl = sandbox.stub().resolves(new Response(FRAGMENT_HTML, { status: 200 }));
    const areas = await fetchNavAreas(fetchImpl);
    expect(areas.map((a) => a.label)).to.deep.equal(['Getting started', 'Foundations']);
    expect(fetchImpl.calledOnceWith('/fragments/nav/site-nav')).to.be.true;
  });

  it('resolves an empty array when the fragment cannot be fetched', async () => {
    const fetchImpl = sandbox.stub().resolves(new Response('', { status: 404 }));
    expect(await fetchNavAreas(fetchImpl)).to.deep.equal([]);
  });

  it('caches: a second call does not fetch again', async () => {
    const fetchImpl = sandbox.stub().resolves(new Response(FRAGMENT_HTML, { status: 200 }));
    await fetchNavAreas(fetchImpl);
    await fetchNavAreas(fetchImpl);
    expect(fetchImpl.calledOnce).to.be.true;
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm run test:file -- test/blocks/search-nav-areas.test.js`
Expected: FAIL — `Failed to fetch dynamically imported module` / `Cannot find module '.../blocks/search/nav-areas.js'`.

- [x] **Step 3: Implement `blocks/search/nav-areas.js`**

```js
/**
 * Level-1 nav areas shown in the search popover before the user types.
 *
 * Read live from the sitenav's own fragment (site-nav.html) rather than
 * hardcoded, so the list stays in sync with the real sitenav. This module
 * deliberately does not import from blocks/sitenav/sitenav.js: that module's
 * body is a side-effecting IIFE that fetches and injects the whole sitenav
 * rail on import, which search must not force onto a page that doesn't want
 * one. It also does its own minimal fetch+parse rather than sitenav.js's
 * fetchRes, which additionally decorates blocks inside the fragment —
 * unneeded work here.
 */

const SITE_NAV_PATH = '/fragments/nav/site-nav';

// site-nav.html has no description field for level-1 items (they're pure
// toggles, not links to a page), so this copy lives here instead.
// TODO(content): confirm/replace "Support" — not shown in the design
// reference this map was built from.
export const NAV_AREA_DESCRIPTIONS = {
  'Getting started': 'Introduction, principles, and how to begin',
  Foundations: 'Color, typography, spacing, and design principles',
  Content: 'Voice, tone, and writing guidelines',
  Mobile: 'Components and patterns for iOS and Android',
  Web: 'Components, patterns, and principles for the web',
  Support: 'Get help and connect with the team',
};

/**
 * @param {string} html the site-nav fragment's raw HTML
 * @returns {{label: string, description: string}[]} level-1 areas, in order
 */
export function parseLevel1Areas(html) {
  const dom = new DOMParser().parseFromString(html, 'text/html');
  const labels = dom.querySelectorAll('main > div > ul > li > p');
  return [...labels].map((p) => {
    const label = p.textContent.trim();
    return { label, description: NAV_AREA_DESCRIPTIONS[label] ?? '' };
  });
}

let cached = null;

/**
 * @param {Function} fetchImpl injectable for tests; defaults to global fetch
 * @returns {Promise<{label: string, description: string}[]>} cached for the page's lifetime
 */
export function fetchNavAreas(fetchImpl = fetch) {
  cached ??= fetchImpl(SITE_NAV_PATH)
    .then((resp) => (resp.ok ? resp.text() : ''))
    .then(parseLevel1Areas)
    .catch(() => []);
  return cached;
}

/** Test-only: clears the module-scoped cache between tests. */
export function resetNavAreasCacheForTests() {
  cached = null;
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npm run test:file -- test/blocks/search-nav-areas.test.js`
Expected: PASS, 9 tests.

- [x] **Step 5: Lint**

Run: `npx eslint blocks/search/nav-areas.js test/blocks/search-nav-areas.test.js`
Expected: no output.

- [x] **Step 6: Commit**

```bash
git add blocks/search/nav-areas.js test/blocks/search-nav-areas.test.js
git commit -m "feat(search): add level-1 nav area data module"
```

---

### Task 2: Sitenav listens for `sitenav:expand-level1`

**Files:**
- Modify: `blocks/sitenav/sitenav.js`
- Modify: `test/blocks/sitenav.test.js`

**Interfaces:**
- Consumes: nothing new (operates on the `navList` already built by `decorateLevel`).
- Produces: `setupSearchIntegration(navList): void` — exported, called from the existing top-level IIFE alongside `setupOutsideClose`/`setupSitenavKeyboardHandling`.

- [x] **Step 1: Write the failing test**

Add to `test/blocks/sitenav.test.js` (import `setupSearchIntegration` in the existing destructured import at the top of the file, alongside `decorateLevel` etc.):

```js
describe('setupSearchIntegration', () => {
  let navList;

  beforeEach(() => {
    navList = buildNavList(`
      <ul>
        <li><p>Getting started</p><ul><li><a href="/a">a</a></li></ul></li>
        <li><p>Foundations</p><ul><li><a href="/b">b</a></li></ul></li>
      </ul>
    `);
    decorateLevel(navList, 1);
    document.body.append(navList);
    setupSearchIntegration(navList);
  });

  afterEach(() => navList.remove());

  it('expands the level-1 button matching the dispatched label', () => {
    document.dispatchEvent(new CustomEvent('sitenav:expand-level1', { detail: { label: 'Foundations' } }));

    const btn = navList.querySelector('.level-1-button[aria-controls="foundations"]');
    expect(btn.getAttribute('aria-expanded')).to.equal('true');
  });

  it('does nothing when no level-1 button matches the label', () => {
    document.dispatchEvent(new CustomEvent('sitenav:expand-level1', { detail: { label: 'Nonexistent' } }));

    const anyExpanded = [...navList.querySelectorAll('.level-1-button')]
      .some((btn) => btn.getAttribute('aria-expanded') === 'true');
    expect(anyExpanded).to.be.false;
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm run test:file -- test/blocks/sitenav.test.js`
Expected: FAIL — `setupSearchIntegration is not a function` (or import error).

- [x] **Step 3: Implement in `blocks/sitenav/sitenav.js`**

Add near the other `setup*` exports (after `setupSitenavKeyboardHandling`, before the closing IIFE):

```js
// search.js dispatches this on `document` when the user selects a level-1
// area from its own popover, e.g. document.dispatchEvent(new
// CustomEvent(EVENT_NAME, { detail: { label } })). Not imported directly by
// search.js — see the constraint in that block's plan/comments — so the
// string must stay in sync manually if ever renamed.
export const SEARCH_EXPAND_EVENT = 'sitenav:expand-level1';

// Reuses the level-1 button's own click handler (built in decorateLevel)
// rather than duplicating its sibling-collapsing logic here.
export const setupSearchIntegration = (navList) => {
  document.addEventListener(SEARCH_EXPAND_EVENT, (e) => {
    const menuId = toClassName(e.detail.label);
    navList.querySelector(`.level-1-button[aria-controls="${menuId}"]`)?.click();
  });
};
```

Wire it into the IIFE, alongside the other `setup*` calls:

```js
  setupSitenavKeyboardHandling(sitenav, [expandBtn, triggerBtn]);
  setupOutsideClose(sitenav);
  setupSearchIntegration(navList);
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npm run test:file -- test/blocks/sitenav.test.js`
Expected: PASS, all existing tests plus the 2 new ones.

- [x] **Step 5: Lint and commit**

Run: `npx eslint blocks/sitenav/sitenav.js test/blocks/sitenav.test.js`

```bash
git add blocks/sitenav/sitenav.js test/blocks/sitenav.test.js
git commit -m "feat(sitenav): listen for search-triggered level-1 expand"
```

---

### Task 3: Search popover — nav-area view, generalized keyboard nav

**Files:**
- Modify: `blocks/search/search.js`
- Test: `test/blocks/search.test.js` (new)

**Interfaces:**
- Consumes: `fetchNavAreas` (Task 1).
- Produces (internal, not exported — verified via rendered shadow DOM):
  - `navAreas` reactive property.
  - `_isNavView` getter.
  - `_currentItems` getter (returns `navAreas` or `results` depending on view).
  - `_selectNavArea(area)` — dispatches `sitenav:expand-level1`, then closes.

- [x] **Step 1: Write the failing tests**

Create `test/blocks/search.test.js`:

```js
import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

import '../../blocks/search/search.js';
import { resetNavAreasCacheForTests } from '../../blocks/search/nav-areas.js';

const NAV_HTML = `<body><header></header><main><div><ul>
  <li><p>Getting started</p><ul><li><a href="/a">a</a></li></ul></li>
  <li><p>Foundations</p><ul><li><a href="/b">b</a></li></ul></li>
</ul></div></main></body>`;

async function mountSearch(sandbox) {
  sandbox.stub(window, 'fetch').resolves(new Response(NAV_HTML, { status: 200 }));
  const el = document.createElement('sh-search');
  document.body.append(el);
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve)); // let fetchNavAreas resolve
  await el.updateComplete;
  return el;
}

describe('sh-search', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    resetNavAreasCacheForTests();
  });

  afterEach(() => {
    document.querySelectorAll('sh-search').forEach((el) => el.remove());
    sandbox.restore();
  });

  describe('nav-area view', () => {
    it('shows the level-1 nav areas before the user types anything', async () => {
      const el = await mountSearch(sandbox);
      const titles = [...el.shadowRoot.querySelectorAll('.hit-title')].map((n) => n.textContent);
      expect(titles).to.deep.equal(['Getting started', 'Foundations']);
    });

    it('shows each area\'s description', async () => {
      const el = await mountSearch(sandbox);
      const first = el.shadowRoot.querySelector('.hit-description');
      expect(first.textContent).to.equal('Introduction, principles, and how to begin');
    });

    it('does not render a results-count heading in nav view', async () => {
      const el = await mountSearch(sandbox);
      expect(el.shadowRoot.querySelector('.results-heading')).to.equal(null);
    });
  });

  describe('selecting a nav area', () => {
    it('dispatches sitenav:expand-level1 with the area label', async () => {
      const el = await mountSearch(sandbox);
      const spy = sinon.spy();
      document.addEventListener('sitenav:expand-level1', spy);

      el.shadowRoot.querySelector('.hit-title').closest('button').click();

      expect(spy.calledOnce).to.be.true;
      expect(spy.firstCall.args[0].detail.label).to.equal('Getting started');
      document.removeEventListener('sitenav:expand-level1', spy);
    });

    it('closes (dispatches clear) after selecting a nav area', async () => {
      const el = await mountSearch(sandbox);
      const spy = sinon.spy();
      el.addEventListener('clear', spy);

      el.shadowRoot.querySelector('.hit-title').closest('button').click();

      expect(spy.calledOnce).to.be.true;
    });
  });

  describe('typing', () => {
    it('switches to results view once a query is entered', async () => {
      const el = await mountSearch(sandbox);
      el.query = 'button';
      el.results = [{ objectID: '/a', title: 'Button', implementation: 'RSP', platform: 'Web', tags: [] }];
      await el.updateComplete;

      expect(el.shadowRoot.querySelector('.results-heading')).to.not.equal(null);
      expect(el.shadowRoot.querySelector('.hit-description')).to.equal(null);
    });

    it('returns to nav-area view when the query is cleared', async () => {
      const el = await mountSearch(sandbox);
      el.query = 'button';
      el.results = [{ objectID: '/a', title: 'Button' }];
      await el.updateComplete;

      el.query = '';
      el.results = [];
      await el.updateComplete;

      const titles = [...el.shadowRoot.querySelectorAll('.hit-title')].map((n) => n.textContent);
      expect(titles).to.deep.equal(['Getting started', 'Foundations']);
    });
  });

  describe('closing', () => {
    it('closes and collapses on Escape', async () => {
      const el = await mountSearch(sandbox);
      const spy = sinon.spy();
      el.addEventListener('clear', spy);

      const input = el.shadowRoot.querySelector('se-input');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));

      expect(spy.calledOnce).to.be.true;
    });

    it('closes and collapses on an outside click', async () => {
      const el = await mountSearch(sandbox);
      const spy = sinon.spy();
      el.addEventListener('clear', spy);
      await new Promise((resolve) => setTimeout(resolve)); // outside-click listener registers a tick late

      document.body.click();

      expect(spy.calledOnce).to.be.true;
    });

    it('does not close on a click inside the component', async () => {
      const el = await mountSearch(sandbox);
      const spy = sinon.spy();
      el.addEventListener('clear', spy);
      await new Promise((resolve) => setTimeout(resolve));

      el.shadowRoot.querySelector('.hit-title').click();
      // Clicking the title itself (not the whole button) still bubbles inside the shadow tree.

      expect(spy.called).to.be.false;
    });
  });
});
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `npm run test:file -- test/blocks/search.test.js`
Expected: FAIL — nav-area assertions fail (nothing renders before a query today), close/collapse assertions fail (`clear` never dispatched today).

- [x] **Step 3: Implement in `blocks/search/search.js`**

Replace the file's body with (imports/customElements.define/init unchanged at top and bottom):

```js
import { LitElement, html, nothing } from 'lit';
import { getConfig } from '../../scripts/ak.js';
import loadStyle from '../../scripts/utils/styles.js';
import { fetchNavAreas } from './nav-areas.js';
import '../../deps/se/se.js';

const { codeBase } = getConfig();

const styles = await Promise.all([
  loadStyle(import.meta.url),
  loadStyle(`${codeBase}/blocks/action-button/action-button.css`),
]);

const APP_ID = '464UXSQJQC';
const SEARCH_KEY = '271461afa0e340546d112204c7520c1e';
const INDEX_NAME = 'spectrum-docs-public';
const DEBOUNCE_MS = 250;

// Dispatched on document when a nav area is selected. Kept as a local string
// rather than imported from blocks/sitenav/sitenav.js — see the constraint in
// that file's plan/comments for why the two files stay decoupled.
const SEARCH_EXPAND_EVENT = 'sitenav:expand-level1';

class SHSearch extends LitElement {
  static properties = {
    query: { type: String, state: true },
    results: { type: Array, state: true },
    navAreas: { type: Array, state: true },
    activeIndex: { state: true },
  };

  constructor() {
    super();
    this.query = '';
    this.results = [];
    this.navAreas = [];
    this.activeIndex = -1;
    this._debounceTimeout = null;
    this._handleOutsideClick = this._handleOutsideClick.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = styles;
    fetchNavAreas().then((areas) => { this.navAreas = areas; });
    // Deferred: the same click that inserted this element (the action-button
    // icon click) is still bubbling to `document` right now. Registering
    // immediately would have this fire on that same click and self-close.
    setTimeout(() => document.addEventListener('click', this._handleOutsideClick), 0);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleOutsideClick);
    if (this._debounceTimeout) {
      clearTimeout(this._debounceTimeout);
    }
  }

  firstUpdated() {
    this.shadowRoot.querySelector('se-input').focus();
    this._popover.showPopover();
  }

  willUpdate(changed) {
    if (changed.has('results') || changed.has('navAreas')) {
      this.activeIndex = this._currentItems.length > 0 ? 0 : -1;
    }
  }

  updated(changed) {
    if (changed.has('activeIndex') && this.activeIndex > -1) {
      const el = this.shadowRoot.querySelector(`#result-${this.activeIndex}`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }

  get _isNavView() {
    return !this.query.trim();
  }

  get _currentItems() {
    return this._isNavView ? this.navAreas : this.results;
  }

  async _search(query) {
    const resp = await fetch(
      `https://${APP_ID}-dsn.algolia.net/1/indexes/${encodeURIComponent(INDEX_NAME)}/query`,
      {
        method: 'POST',
        headers: {
          'X-Algolia-Application-Id': APP_ID,
          'X-Algolia-API-Key': SEARCH_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      },
    );
    if (!resp.ok) {
      return [];
    }
    const { hits } = await resp.json();
    return hits;
  }

  async _runSearch() {
    const query = this.query.trim();
    if (!query) {
      // Empty query returns to nav-area view; the popover stays open.
      this.results = [];
      return;
    }
    this.results = await this._search(query);
  }

  _handleInput(e) {
    this.query = e.target.value;
    clearTimeout(this._debounceTimeout);
    this._debounceTimeout = setTimeout(() => this._runSearch(), DEBOUNCE_MS);
  }

  _handleSubmit(e) {
    e.preventDefault();
    clearTimeout(this._debounceTimeout);
    this._runSearch();
  }

  _handleKey(e) {
    const items = this._currentItems;

    switch (e.key) {
      case 'ArrowDown':
        if (!items.length) { return; }
        e.preventDefault();
        this._setActive((this.activeIndex + 1) % items.length);
        break;
      case 'ArrowUp':
        if (!items.length) { return; }
        e.preventDefault();
        this._setActive((this.activeIndex - 1 + items.length) % items.length);
        break;
      case 'Enter':
        if (this.activeIndex > -1) {
          e.preventDefault();
          this._select(items[this.activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        this._close();
        break;
      default:
        break;
    }
  }

  _setActive(index) {
    this.activeIndex = index;
  }

  _select(item) {
    if (this._isNavView) {
      this._selectNavArea(item);
    } else {
      this._selectHit(item);
    }
  }

  _selectHit(hit) {
    if (hit.url) {
      window.open(hit.url, '_blank');
    }
  }

  _selectNavArea(area) {
    document.dispatchEvent(new CustomEvent(SEARCH_EXPAND_EVENT, { detail: { label: area.label } }));
    this._close();
  }

  _close() {
    this._popover.hidePopover();
    this.dispatchEvent(new CustomEvent('clear'));
  }

  get _popover() {
    return this.shadowRoot.querySelector('.results-popover');
  }

  _handleOutsideClick(e) {
    // Click events crossing a shadow boundary retarget `e.target` to the
    // host, so this correctly excludes every click inside this component.
    if (this.contains(e.target)) { return; }
    this._close();
  }

  get _resultsCountText() {
    const { length } = this.results;
    if (length === 1) { return `${length} result`; }
    return `${length} results`;
  }

  _pillsFor(hit) {
    return [hit.implementation, hit.platform, ...(hit.tags || [])]
      .filter(Boolean)
      .slice(0, 2);
  }

  _renderNavArea(area, index) {
    const isActive = index === this.activeIndex;
    return html`
      <li
        id="result-${index}"
        role="option"
        aria-selected=${isActive}>
        <button
          type="button"
          class="result-row"
          tabindex="-1"
          @click=${() => this._selectNavArea(area)}>
          <div class="result-text">
            <p class="hit-title">${area.label}</p>
            ${area.description ? html`<p class="hit-description">${area.description}</p>` : nothing}
          </div>
          <svg class="icon" viewBox="0 0 20 20">
            <use href="/img/icons/s2-icon-chevronright-20-n.svg#icon"></use>
          </svg>
        </button>
      </li>
    `;
  }

  _renderHit(hit, index) {
    const isActive = index === this.activeIndex;
    const pills = this._pillsFor(hit);
    return html`
      <li
        id="result-${index}"
        role="option"
        aria-selected=${isActive}>
        <a
          class="result-row"
          href=${hit.url}
          target=${hit.external ? '_blank' : nothing}
          rel=${hit.external ? 'noopener' : nothing}
          tabindex="-1">
          <p class="hit-title">${hit.title || hit.objectID}</p>
          ${pills.length ? html`
            <div class="hit-tags">
              ${pills.map((pill) => html`<span class="tag-pill">${pill}</span>`)}
            </div>` : nothing}
        </a>
      </li>
    `;
  }

  render() {
    const activeId = this.activeIndex > -1 ? `result-${this.activeIndex}` : '';

    return html`
      <form class="search-form" @submit=${this._handleSubmit}>
        <se-input
          type="search"
          id="search-input"
          name="query"
          role="combobox"
          placeholder="Search everything..."
          aria-label="Search"
          aria-expanded="true"
          aria-controls="listbox"
          aria-activedescendant=${activeId}
          autocomplete="off"
          .value=${this.query}
          @input=${this._handleInput}
          @keydown=${this._handleKey}>
        </se-input>
      </form>
      <div class="results-popover" popover="manual">
        ${this._isNavView ? nothing : html`<p class="results-heading">${this._resultsCountText}</p>`}
        <ul id="listbox" class="results-list" aria-live="polite" role="listbox">
          ${this._isNavView
    ? this.navAreas.map((area, index) => this._renderNavArea(area, index))
    : this.results.map((hit, index) => this._renderHit(hit, index))}
        </ul>
        <div class="results-popover-footer">
          <div class="instruction">
            <div class="key">
              <svg class="icon" viewBox="0 0 12 12">
                <use href="/img/icons/s2-icon-return-12-n.svg#icon"></use>
              </svg>
            </div>
            <span class="text">to select</span>
          </div>
          <div class="instruction">
            <div class="key">
              <svg class="icon" viewBox="0 0 12 12">
                <use href="/img/icons/s2-icon-up-12-n.svg#icon"></use>
              </svg>
            </div>
            <div class="key">
              <svg class="icon" viewBox="0 0 12 12">
                <use href="/img/icons/s2-icon-down-12-n.svg#icon"></use>
              </svg>
            </div>
            <span class="text">to navigate</span>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('sh-search', SHSearch);

export default function init(el) {
  const cmp = document.createElement('sh-search');
  if (el) { el.replaceWith(cmp); }
  return cmp;
}
```

Notes on the rewrite:
- `aria-expanded` on the input is now always `"true"` while mounted, since the popover is showing one of the two views from `firstUpdated` onward (previously it reflected `results.length > 0`).
- `_renderNavArea` keeps the exact markup/classes (`hit-title`, `hit-description`, `result-text`, chevron) the old `_renderResult` used — that markup already matches the nav-area screenshot (title + subtext + chevron). Only the interactive element changed from `<a href>` to `<button>` (nav areas don't navigate), sharing a new `.result-row` class with the results-view `<a>` so CSS isn't duplicated (see Task 4).
- `_renderHit` is new: title + up to 2 pills, no description, no chevron — matching the typed-results screenshot exactly (no chevron shown there).

- [x] **Step 4: Run the tests to verify they pass**

Run: `npm run test:file -- test/blocks/search.test.js`
Expected: PASS, all tests.

- [x] **Step 5: Run the full unit suite to check for regressions**

Run: `npm run test:unit`
Expected: PASS. Pay particular attention to any pre-existing search-adjacent tests in `test/blocks/action-button.test.js` if one exists — grep for it first (`grep -rl "action-button" test/`); the `clear` event is now actually dispatched where before it never was.

- [x] **Step 6: Lint**

Run: `npx eslint blocks/search/search.js test/blocks/search.test.js`
Expected: no output.

- [x] **Step 7: Commit**

```bash
git add blocks/search/search.js test/blocks/search.test.js
git commit -m "feat(search): nav-area popover view, tag pills on results, close-and-collapse"
```

---

### Task 4: Styling

**Files:**
- Modify: `blocks/search/search.css`

**Interfaces:**
- Consumes: the `.result-row`, `.hit-tags`, `.tag-pill` classes introduced in Task 3's markup.
- Produces: visual result matching both attached screenshots.

- [x] **Step 1: Rename the shared row selector**

In `blocks/search/search.css`, the existing `.results-list a { ... }` block (grid layout, padding, hover, min-height) now needs to apply to both the nav-area `<button>` and the results `<a>`. Change the selector:

```css
    a, .result-row {
```

and the two selectors that reference `a` specifically:

```css
    /* Remove selected background when any sibling is hovered */
    &:has(.result-row:hover) li[aria-selected="true"] .result-row:not(:hover) {
      background-color: transparent;
    }
```

(replacing the earlier `&:has(a:hover) li[aria-selected="true"] a:not(:hover)`).

A `<button>` has no default text-align/border/background reset the way an `<a>` implicitly does in this codebase's baseline styles — add to the same block:

```css
    button.result-row {
      appearance: none;
      background: none;
      border: none;
      text-align: left;
      font: inherit;
      cursor: pointer;
    }
```

- [x] **Step 2: Add pill styles**

After the `.hit-description` rule:

```css
    .hit-tags {
      display: flex;
      gap: var(--s2-spacing-100);
      justify-self: end;
    }

    .tag-pill {
      display: inline-flex;
      align-items: center;
      height: var(--se-component-m-height);
      padding: 0 var(--s2-spacing-150);
      border-radius: var(--s2-corner-radius-500);
      background-color: var(--s2-gray-100);
      font-size: var(--s2-component-s-regular-font-size);
      white-space: nowrap;
    }
```

- [x] **Step 3: Verify in the browser**

Start the dev server (see `.claude/launch.json` / project run instructions), open a page with the search action button, and check:
- Clicking the icon opens the input with the 5 (or 6, once Support copy lands) nav areas below it, each with title/description/chevron, first one highlighted.
- Typing shows title + up to 2 pills, no chevron, no description.
- Backspacing to empty restores the nav-area list.
- Clicking outside, or pressing Escape, closes the popover and collapses the input back to the icon button.
- Selecting a nav area closes search and expands that area in the sitenav (if the current page renders one).

- [x] **Step 4: Lint and commit**

Run: `npx eslint blocks/search/search.css` if a stylelint config covers this file, otherwise skip lint and just visually verify.

```bash
git add blocks/search/search.css
git commit -m "style(search): pill layout for results, shared row styles for nav-area buttons"
```

---

## Follow-ups outside this plan's scope

- **Content**: final "Support" description copy for `NAV_AREA_DESCRIPTIONS` in `blocks/search/nav-areas.js`.
- **Confirm the close-on-nav-area-select assumption** (Design decisions section above) with the user before merging — it wasn't part of the original Q&A.
