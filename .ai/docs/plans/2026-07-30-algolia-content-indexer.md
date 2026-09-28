# Algolia Content Indexer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node script that reads published Spectrum Hub content from `aem.live`, inlines linked fragment content, splits each page into section-level records, and pushes them to Algolia as a full atomic rebuild — running every two hours in GitHub Actions and identically on a laptop with a `.env` file.

**Architecture:** Seven small modules under `indexer/`. The three that hold the interesting logic — `fragments`, `sections`, `records` — are pure functions over a parsed DOM and plain data, with the page fetcher injected as a parameter. Everything tunable is therefore unit-testable with no network. `index.js` orchestrates; `aem-client.js` and `algolia.js` are the only modules that do I/O.

**Tech Stack:** Node 20+ ESM, `node-html-parser@9` for parsing, `algoliasearch@5` for the atomic index swap, `node:test` + `node:assert/strict` for tests.

**Spec:** [`.ai/docs/specs/2026-07-30-algolia-content-indexer-design.md`](../specs/2026-07-30-algolia-content-indexer-design.md)

## Global Constraints

- **ESM only.** The repo sets `"type": "module"`. Use `import`/`export`, never `require`.
- **Node 20+.** `process.loadEnvFile()` requires 20.12+. CI pins `node-version: 20`.
- **Two new runtime dependencies**, both in `dependencies`: `node-html-parser@^9` and `algoliasearch@^5`. Add no others.
- **`indexer/` is not served.** It must be listed in `.hlxignore`.
- **ESLint.** `indexer/**/*.js` needs a config block adding `globals.node`; without it every `process` and `console` reference errors. Test files under `test/**/*.js` already get Node globals from `@adobe/eslint-config-helix`.
- **Test style.** Match `test/extractions/csv.node.test.js`: `import assert from 'node:assert/strict'`, `import { describe, it } from 'node:test'`, one `describe` per unit.
- **Never call the network in a test.** Every test injects a fake fetcher or operates on an inline HTML string.
- **Indentation is 2 spaces**, single quotes, semicolons, trailing commas on multiline literals.
- **Node text-node constant:** `nodeType === 3` is text, `nodeType === 1` is element. `node-html-parser` does not export `Node.TEXT_NODE`.
- **`node-html-parser` API notes.** Tag name is `node.rawTagName` (may be `undefined`; lowercase it defensively). Text is `node.text`, not `textContent`. Children are `node.childNodes`. `el.remove()` and `el.replaceWith(...nodes)` both exist. `:scope > div` is supported.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `indexer/config.js` | Load `.env` if present; read and validate environment. |
| `indexer/aem-client.js` | Fetch the query index and pages from `SITE_ORIGIN`, with a concurrency pool. |
| `indexer/fragments.js` | Recursively replace fragment links with fragment content. |
| `indexer/sections.js` | Strip noise, split `main` into sections with hierarchy. |
| `indexer/records.js` | Turn one index row plus its sections into Algolia records. |
| `indexer/settings.js` | Index settings as a plain exported object. |
| `indexer/algolia.js` | Apply settings, then `replaceAllObjects`. |
| `indexer/index.js` | CLI entry: flags, orchestration, summary, exit code. |
| `test/indexer/*.node.test.js` | Unit tests, one file per module under test. |
| `.github/workflows/index-algolia.yml` | Two-hourly schedule and manual dispatch. |

Task order builds the pure logic first (Tasks 2–4), so the parts that need tuning are testable before any I/O exists.

---

### Task 1: Project scaffolding

**Files:**
- Modify: `package.json`
- Modify: `eslint.config.js`
- Modify: `.hlxignore`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: `node-html-parser` and `algoliasearch` importable; `indexer/**/*.js` lints cleanly with Node globals; `npm run test:extractions` also runs `test/indexer/`.

- [ ] **Step 1: Install the two dependencies**

```bash
npm install node-html-parser@^9 algoliasearch@^5
```

- [ ] **Step 2: Widen the test glob**

In `package.json`, change the `test:extractions` script so it picks up the new directory:

```json
"test:extractions": "node --test test/extractions/*.node.test.js test/indexer/*.node.test.js"
```

- [ ] **Step 3: Give `indexer/` Node globals in ESLint**

In `eslint.config.js`, add this object to the array passed to `defineConfig`, immediately after the block that begins `files: ['test/**/*.js']`:

```js
  {
    // Node scripts, not browser code
    files: ['indexer/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
```

- [ ] **Step 4: Keep `indexer/` off the published site**

Append to `.hlxignore`:

```text
indexer/
```

- [ ] **Step 5: Ignore dry-run output**

Append to `.gitignore`:

```text
indexer/out/
```

- [ ] **Step 6: Verify lint and tests still pass**

Run: `npm run lint && npm run test:extractions`
Expected: both pass. The test glob now matches zero files in `test/indexer/`, which is not an error.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json eslint.config.js .hlxignore .gitignore
git commit -m "chore: scaffold indexer tooling and dependencies"
```

---

### Task 2: Section splitting

The heart of the extractor. Build it first because everything downstream depends on its output shape, and because it is the piece most likely to need tuning.

**Files:**
- Create: `indexer/sections.js`
- Test: `test/indexer/sections.node.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `NOISE_SELECTORS: string[]` — exported so it is easy to tune.
  - `stripNoise(main: HTMLElement): void` — mutates in place.
  - `splitSections(main: HTMLElement): Section[]` where
    `Section = { heading: string, level: 1|2|3, anchor: string, content: string, position: number, hierarchy: { lvl0: string, lvl1: string, lvl2: string } }`.
    `position` is the zero-based index within the returned array.

- [ ] **Step 1: Write the failing test**

Create `test/indexer/sections.node.test.js`:

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parse } from 'node-html-parser';

import { splitSections, stripNoise } from '../../indexer/sections.js';

const main = (html) => parse(`<main>${html}</main>`).querySelector('main');

describe('splitSections', () => {
  it('finds headings at any depth, in document order', () => {
    const el = main(`
      <div><div><div><div><div><h1 id="a">Deep H1</h1></div></div>
        <p>lead text</p></div>
        <section><article><h2 id="b">Deep H2</h2><p>b text</p>
          <div><span><h3 id="c">Very deep H3</h3></span></div><p>c text</p>
        </article></section>
      </div>
      <h2 id="d">Shallow H2</h2><p>d text</p>
      <div><h4>Not a boundary</h4><p>h4 body</p></div>`);
    assert.deepEqual(
      splitSections(el).map((s) => [s.level, s.heading, s.content]),
      [
        [1, 'Deep H1', 'lead text'],
        [2, 'Deep H2', 'b text'],
        [3, 'Very deep H3', 'c text'],
        [2, 'Shallow H2', 'd text Not a boundary h4 body'],
      ],
    );
  });

  it('merges pre-heading content into the first section', () => {
    const el = main('<div><p>breadcrumb</p><h1 id="t">Title</h1><p>body</p></div>');
    const [first] = splitSections(el);
    assert.equal(first.heading, 'Title');
    assert.equal(first.content, 'breadcrumb body');
  });

  it('takes the anchor from the heading id and defaults to empty', () => {
    const el = main('<h1 id="one">One</h1><p>x</p><h2>Two</h2><p>y</p>');
    assert.deepEqual(splitSections(el).map((s) => s.anchor), ['one', '']);
  });

  it('tracks hierarchy across levels and resets deeper levels', () => {
    const el = main(`
      <h1 id="p">Page</h1><p>a</p>
      <h2 id="s1">Sec One</h2><p>b</p>
      <h3 id="d1">Deep</h3><p>c</p>
      <h2 id="s2">Sec Two</h2><p>d</p>`);
    assert.deepEqual(splitSections(el).map((s) => s.hierarchy), [
      { lvl0: 'Page', lvl1: '', lvl2: '' },
      { lvl0: 'Page', lvl1: 'Sec One', lvl2: '' },
      { lvl0: 'Page', lvl1: 'Sec One', lvl2: 'Deep' },
      { lvl0: 'Page', lvl1: 'Sec Two', lvl2: '' },
    ]);
  });

  it('always keeps the first section but drops content-less later ones', () => {
    const el = main(`
      <h1 id="t">Title Only</h1>
      <h2 id="empty">Empty Parent</h2>
      <h3 id="real">Real</h3><p>has text</p>`);
    assert.deepEqual(
      splitSections(el).map((s) => s.heading),
      ['Title Only', 'Real'],
    );
  });

  it('keeps a dropped parent in its children hierarchy', () => {
    // This is what makes dropping content-less parents safe: the heading still
    // reaches the index through its children. Compute hierarchy before
    // filtering or this silently regresses.
    const el = main(`
      <h1 id="t">Page</h1>
      <h2 id="empty">Behaviors</h2>
      <h3 id="real">Title wrapping</h3><p>has text</p>`);
    const sections = splitSections(el);
    assert.equal(sections.length, 2);
    assert.deepEqual(sections[1].hierarchy, {
      lvl0: 'Page',
      lvl1: 'Behaviors',
      lvl2: 'Title wrapping',
    });
  });

  it('numbers position by final array index', () => {
    const el = main('<h1 id="t">T</h1><h2 id="e">Empty</h2><h2 id="k">Keep</h2><p>x</p>');
    assert.deepEqual(splitSections(el).map((s) => s.position), [0, 1]);
  });

  it('collapses whitespace and does not double-count nested text', () => {
    const el = main('<h1 id="t">T</h1><p>The   <strong>bold</strong>\n  word</p>');
    assert.equal(splitSections(el)[0].content, 'The bold word');
  });

  it('caps content at 8000 characters', () => {
    const el = main(`<h1 id="t">T</h1><p>${'x'.repeat(9000)}</p>`);
    assert.equal(splitSections(el)[0].content.length, 8000);
  });

  it('returns an empty array for an empty main', () => {
    assert.deepEqual(splitSections(main('')), []);
  });
});

describe('stripNoise', () => {
  it('removes playground and section-metadata blocks', () => {
    const el = main('<h1 id="t">T</h1><div class="playground"><div>impl</div></div><p>keep</p>');
    stripNoise(el);
    assert.equal(splitSections(el)[0].content, 'keep');
  });

  it('removes images and pictures but keeps surrounding prose', () => {
    const el = main('<h1 id="t">T</h1><picture><img alt="alt text"></picture><p>keep</p>');
    stripNoise(el);
    assert.equal(splitSections(el)[0].content, 'keep');
  });

  it('removes anchors whose text is a bare URL', () => {
    const el = main('<h1 id="t">T</h1><p><a href="/deps/x.json">https://example.test/deps/x.json</a></p><p>keep</p>');
    stripNoise(el);
    assert.equal(splitSections(el)[0].content, 'keep');
  });

  it('keeps anchors with real link text', () => {
    const el = main('<h1 id="t">T</h1><p>see <a href="/x">the guide</a></p>');
    stripNoise(el);
    assert.equal(splitSections(el)[0].content, 'see the guide');
  });

  it('keeps hero, columns, and table blocks', () => {
    const el = main('<h1 id="t">T</h1><div class="columns"><div><p>prose</p></div></div>');
    stripNoise(el);
    assert.equal(splitSections(el)[0].content, 'prose');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/indexer/sections.node.test.js`
Expected: FAIL — `Cannot find module '.../indexer/sections.js'`.

- [ ] **Step 3: Implement `indexer/sections.js`**

```js
/**
 * Splits a page's <main> into section-level chunks for indexing.
 *
 * Headings are not assumed to sit at any fixed depth: published pages wrap
 * content in EDS section divs, so a heading is typically several levels down,
 * and authored content can nest one deeper still. The walk is therefore
 * depth-first over the whole subtree, and any h1/h2/h3 found anywhere starts a
 * new section. Text is gathered from text nodes only, never from an element's
 * aggregate text, so nesting cannot count a passage twice.
 */

const HEADING_TAGS = new Set(['h1', 'h2', 'h3']);
const MAX_CONTENT_LENGTH = 8000;
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/** Blocks that hold configuration or media rather than prose. Tune freely. */
export const NOISE_SELECTORS = ['.playground', '.section-metadata', 'picture', 'img'];

const normalize = (value) => value.replace(/\s+/g, ' ').trim();

/**
 * Removes non-prose nodes from a <main> in place.
 * @param {object} main the parsed main element
 */
export function stripNoise(main) {
  NOISE_SELECTORS.forEach((selector) => {
    main.querySelectorAll(selector).forEach((el) => el.remove());
  });

  // Authors link data and fragments by pasting the URL as the link text. Those
  // anchors carry no prose, so drop them rather than index a URL.
  main.querySelectorAll('a').forEach((anchor) => {
    if (/^https?:\/\//i.test(anchor.text.trim())) { anchor.remove(); }
  });
}

/**
 * Splits a <main> into ordered sections.
 * @param {object} main the parsed main element
 * @returns {object[]} sections in document order
 */
export function splitSections(main) {
  const collected = [];
  let current = { heading: '', level: 1, anchor: '', parts: [] };

  const walk = (node) => {
    if (node.nodeType === TEXT_NODE) { current.parts.push(node.text); return; }
    if (node.nodeType !== ELEMENT_NODE) { return; }

    const tag = (node.rawTagName || '').toLowerCase();
    if (HEADING_TAGS.has(tag)) {
      collected.push(current);
      current = {
        heading: normalize(node.text),
        level: Number(tag[1]),
        anchor: node.getAttribute('id') || '',
        parts: [],
      };
      // Do not descend: the heading's own text is not body content.
      return;
    }

    node.childNodes.forEach(walk);
  };

  main.childNodes.forEach(walk);
  collected.push(current);

  // A leading run of content before the first heading belongs to that heading's
  // section, not to a headingless record of its own.
  if (collected.length > 1 && !collected[0].heading) {
    collected[1].parts = [...collected[0].parts, ...collected[1].parts];
    collected.shift();
  }

  const levels = [];
  return collected
    .map((section) => ({
      ...section,
      content: normalize(section.parts.join(' ')).slice(0, MAX_CONTENT_LENGTH),
    }))
    // Hierarchy is computed across every section, before any are dropped. A
    // content-less parent still contributes its heading to its children's
    // hierarchy — which is the whole reason dropping it is safe.
    .map((section) => {
      levels[section.level - 1] = section.heading;
      levels.length = section.level;
      return {
        ...section,
        hierarchy: { lvl0: levels[0] || '', lvl1: levels[1] || '', lvl2: levels[2] || '' },
      };
    })
    // The first section is always kept so every page stays findable by title.
    // Later sections need content: a heading whose prose lives in its own
    // sub-sections adds no searchable text of its own.
    .filter((section, index) => (index === 0 ? section.heading || section.content : section.content))
    .map((section, index) => ({
      heading: section.heading,
      level: section.level,
      anchor: section.anchor,
      content: section.content,
      position: index,
      hierarchy: section.hierarchy,
    }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/indexer/sections.node.test.js`
Expected: PASS, 15 tests.

- [ ] **Step 5: Lint**

Run: `npx eslint indexer/sections.js test/indexer/sections.node.test.js`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add indexer/sections.js test/indexer/sections.node.test.js
git commit -m "feat(indexer): split pages into section records"
```

---

### Task 3: Fragment inlining

**Files:**
- Create: `indexer/fragments.js`
- Test: `test/indexer/fragments.node.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `inlineFragments(main, fetchPage): Promise<number[]>` — mutates `main` in place and resolves to an array of epoch-second timestamps, one per fragment successfully inlined, for the caller to roll into `lastModified`. `fetchPage` is `(path: string) => Promise<{ html: string, lastModified: number|null } | null>`, resolving `null` when the fragment cannot be fetched.

- [ ] **Step 1: Write the failing test**

Create `test/indexer/fragments.node.test.js`:

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parse } from 'node-html-parser';

import { inlineFragments } from '../../indexer/fragments.js';

const main = (html) => parse(`<main>${html}</main>`).querySelector('main');
const page = (body) => `<html><body><main>${body}</main></body></html>`;

/** Builds a fetcher over a path -> html map, counting calls per path. */
function fakeFetcher(pages, times = {}) {
  const calls = [];
  const fetchPage = async (path) => {
    calls.push(path);
    if (!(path in pages)) { return null; }
    return { html: pages[path], lastModified: times[path] ?? null };
  };
  return { fetchPage, calls };
}

describe('inlineFragments', () => {
  it('replaces a link-only paragraph with the fragment body', async () => {
    const el = main('<div><p><a href="/fragments/a">https://x.test/fragments/a</a></p></div>');
    const { fetchPage } = fakeFetcher({ '/fragments/a': page('<div><p>fragment prose</p></div>') });
    await inlineFragments(el, fetchPage);
    assert.match(el.text, /fragment prose/);
    assert.equal(el.querySelectorAll('a[href*="/fragments/"]').length, 0);
  });

  it('normalises an absolute authored href to a path', async () => {
    const el = main('<p><a href="https://main--spectrum-hub--adobe.aem.page/fragments/a">link</a></p>');
    const { fetchPage, calls } = fakeFetcher({ '/fragments/a': page('<div><p>ok</p></div>') });
    await inlineFragments(el, fetchPage);
    assert.deepEqual(calls, ['/fragments/a']);
  });

  it('replaces only the anchor when the paragraph holds other content', async () => {
    const el = main('<p>before <a href="/fragments/a">https://x.test/fragments/a</a></p>');
    const { fetchPage } = fakeFetcher({ '/fragments/a': page('<div><p>inner</p></div>') });
    await inlineFragments(el, fetchPage);
    assert.match(el.text, /before/);
    assert.match(el.text, /inner/);
  });

  it('resolves fragments nested inside fragments', async () => {
    const el = main('<p><a href="/fragments/a">https://x.test/fragments/a</a></p>');
    const { fetchPage } = fakeFetcher({
      '/fragments/a': page('<div><p>outer</p><p><a href="/fragments/b">https://x.test/fragments/b</a></p></div>'),
      '/fragments/b': page('<div><p>inner</p></div>'),
    });
    await inlineFragments(el, fetchPage);
    assert.match(el.text, /outer/);
    assert.match(el.text, /inner/);
  });

  it('stops at a self-referential cycle without hanging', async () => {
    const el = main('<p><a href="/fragments/a">https://x.test/fragments/a</a></p>');
    const { fetchPage } = fakeFetcher({
      '/fragments/a': page('<div><p>loop</p><p><a href="/fragments/a">https://x.test/fragments/a</a></p></div>'),
    });
    await inlineFragments(el, fetchPage);
    assert.match(el.text, /loop/);
    assert.equal(el.querySelectorAll('a[href*="/fragments/"]').length, 0);
  });

  it('leaves the page intact when a fragment cannot be fetched', async () => {
    const el = main('<h1 id="t">Title</h1><p><a href="/fragments/missing">https://x.test/fragments/missing</a></p>');
    const { fetchPage } = fakeFetcher({});
    await inlineFragments(el, fetchPage);
    assert.match(el.text, /Title/);
    assert.equal(el.querySelectorAll('a[href*="/fragments/"]').length, 0);
  });

  it('returns the timestamp of each inlined fragment', async () => {
    const el = main('<p><a href="/fragments/a">https://x.test/fragments/a</a></p>');
    const { fetchPage } = fakeFetcher(
      { '/fragments/a': page('<div><p>x</p></div>') },
      { '/fragments/a': 1785470599 },
    );
    assert.deepEqual(await inlineFragments(el, fetchPage), [1785470599]);
  });

  it('omits a fragment with no usable timestamp', async () => {
    const el = main('<p><a href="/fragments/a">https://x.test/fragments/a</a></p>');
    const { fetchPage } = fakeFetcher({ '/fragments/a': page('<div><p>x</p></div>') });
    assert.deepEqual(await inlineFragments(el, fetchPage), []);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/indexer/fragments.node.test.js`
Expected: FAIL — `Cannot find module '.../indexer/fragments.js'`.

- [ ] **Step 3: Implement `indexer/fragments.js`**

```js
/**
 * Inlines linked fragment content into a page's <main>.
 *
 * Component pages compose most of their prose from fragments, linked as
 * a[href*="/fragments/"] and assembled in the browser by blocks/fragment.
 * Without inlining, those pages publish as headings and links with almost no
 * body text, and index as empty.
 */

import { parse } from 'node-html-parser';

const MAX_DEPTH = 3;
const FRAGMENT_LINK = 'a[href*="/fragments/"]';

/** Authored hrefs may be absolute .aem.page URLs; the fetcher wants a path. */
function toPath(href) {
  try {
    return new URL(href, 'https://fragment.invalid').pathname;
  } catch {
    return href;
  }
}

/**
 * The node an inlined fragment should replace. Authors put a fragment link in a
 * paragraph of its own, so the paragraph goes too; otherwise only the anchor.
 */
function replacementTarget(anchor) {
  const parent = anchor.parentNode;
  const isLinkOnlyParagraph = (parent?.rawTagName || '').toLowerCase() === 'p'
    && parent.text.trim() === anchor.text.trim();
  return isLinkOnlyParagraph ? parent : anchor;
}

async function inline(main, fetchPage, depth, visited, timestamps) {
  if (depth >= MAX_DEPTH) { return; }

  for (const anchor of main.querySelectorAll(FRAGMENT_LINK)) {
    const path = toPath(anchor.getAttribute('href') || '');
    const target = replacementTarget(anchor);

    if (visited.has(path)) { target.remove(); continue; }

    const fragment = await fetchPage(path);
    const fragmentMain = fragment?.html ? parse(fragment.html).querySelector('main') : null;
    if (!fragmentMain) { target.remove(); continue; }

    if (Number.isFinite(fragment.lastModified)) { timestamps.push(fragment.lastModified); }

    await inline(fragmentMain, fetchPage, depth + 1, new Set([...visited, path]), timestamps);

    const sections = fragmentMain.querySelectorAll(':scope > div');
    if (sections.length) { target.replaceWith(...sections); } else { target.remove(); }
  }
}

/**
 * Replaces every fragment link in a <main> with the fragment's content.
 * @param {object} main the parsed main element, mutated in place
 * @param {Function} fetchPage resolves a path to { html, lastModified } or null
 * @returns {Promise<number[]>} epoch seconds for each fragment inlined
 */
export async function inlineFragments(main, fetchPage) {
  const timestamps = [];
  await inline(main, fetchPage, 0, new Set(), timestamps);
  return timestamps;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/indexer/fragments.node.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 5: Lint**

Run: `npx eslint indexer/fragments.js test/indexer/fragments.node.test.js`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add indexer/fragments.js test/indexer/fragments.node.test.js
git commit -m "feat(indexer): inline fragment content into pages"
```

---

### Task 4: Record building

**Files:**
- Create: `indexer/records.js`
- Test: `test/indexer/records.node.test.js`

**Interfaces:**
- Consumes: `Section` objects from `indexer/sections.js` (Task 2).
- Produces:
  - `httpDateToEpochSeconds(value: string|null|undefined): number|null`
  - `buildRecords(row, sections, fragmentTimes = []): object[]` where `row` is a `query-index.json` row and the return value matches the record shape in the spec.

- [ ] **Step 1: Write the failing test**

Create `test/indexer/records.node.test.js`:

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildRecords, httpDateToEpochSeconds } from '../../indexer/records.js';

const row = {
  path: '/web/rsp/components/accordion',
  title: 'Accordion',
  description: 'An accordion displays a list of items.',
  lastModified: 1782763749,
  platform: 'Web',
  implementation: 'RSP',
  tags: ['accordion', 'container'],
};

const lead = {
  heading: 'Accordion', level: 1, anchor: 'accordion', content: 'intro prose',
  position: 0, hierarchy: { lvl0: 'Accordion', lvl1: '', lvl2: '' },
};
const deep = {
  heading: 'Progressive disclosure', level: 3, anchor: 'progressive-disclosure',
  content: 'body prose', position: 5,
  hierarchy: { lvl0: 'Accordion', lvl1: 'Usage guidelines', lvl2: 'Progressive disclosure' },
};

describe('httpDateToEpochSeconds', () => {
  it('converts an HTTP date to epoch seconds', () => {
    assert.equal(httpDateToEpochSeconds('Fri, 31 Jul 2026 04:03:19 GMT'), 1785470599);
  });

  it('returns null for missing or unparseable input', () => {
    assert.equal(httpDateToEpochSeconds(undefined), null);
    assert.equal(httpDateToEpochSeconds('not a date'), null);
  });
});

describe('buildRecords', () => {
  it('titles a lead section with the page title alone', () => {
    assert.equal(buildRecords(row, [lead])[0].title, 'Accordion');
  });

  it('titles a sub-section with page and its own heading', () => {
    assert.equal(buildRecords(row, [lead, deep])[1].title, 'Accordion › Progressive disclosure');
  });

  it('truncates a long title to 80 characters', () => {
    const long = { ...deep, heading: 'x'.repeat(200) };
    assert.equal(buildRecords(row, [lead, long])[1].title.length, 80);
  });

  it('builds objectID and url from path and anchor', () => {
    const [, record] = buildRecords(row, [lead, deep]);
    assert.equal(record.objectID, '/web/rsp/components/accordion#progressive-disclosure');
    assert.equal(record.url, '/web/rsp/components/accordion#progressive-disclosure');
  });

  it('omits the fragment when a section has no anchor', () => {
    const [record] = buildRecords(row, [{ ...lead, anchor: '' }]);
    assert.equal(record.objectID, '/web/rsp/components/accordion');
    assert.equal(record.url, '/web/rsp/components/accordion');
  });

  it('emits unique objectIDs across a page', () => {
    const ids = buildRecords(row, [lead, deep]).map((r) => r.objectID);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('passes pill fields through untransformed', () => {
    const [record] = buildRecords(row, [lead]);
    assert.equal(record.implementation, 'RSP');
    assert.equal(record.platform, 'Web');
    assert.deepEqual(record.tags, ['accordion', 'container']);
  });

  it('guarantees tags is an array and pill strings are strings', () => {
    const bare = { path: '/x', title: 'X', lastModified: 1 };
    const [record] = buildRecords(bare, [{ ...lead, hierarchy: { lvl0: 'X', lvl1: '', lvl2: '' } }]);
    assert.deepEqual(record.tags, []);
    assert.equal(record.implementation, '');
    assert.equal(record.platform, '');
    assert.equal(record.description, '');
  });

  it('coerces a single string tag into an array', () => {
    const [record] = buildRecords({ ...row, tags: 'solo' }, [lead]);
    assert.deepEqual(record.tags, ['solo']);
  });

  it('derives section from the first path segment', () => {
    assert.equal(buildRecords(row, [lead])[0].section, 'web');
    assert.equal(buildRecords({ ...row, path: '/' }, [lead])[0].section, 'root');
  });

  it('rolls lastModified up to the newest fragment', () => {
    const [record] = buildRecords(row, [lead], [1785470599, 1778101972]);
    assert.equal(record.lastModified, 1785470599);
  });

  it('keeps the page lastModified when it is newest', () => {
    const [record] = buildRecords(row, [lead], [1000]);
    assert.equal(record.lastModified, 1782763749);
  });

  it('does not emit an external field', () => {
    assert.equal('external' in buildRecords(row, [lead])[0], false);
  });

  it('returns nothing for a page with no sections', () => {
    assert.deepEqual(buildRecords(row, []), []);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/indexer/records.node.test.js`
Expected: FAIL — `Cannot find module '.../indexer/records.js'`.

- [ ] **Step 3: Implement `indexer/records.js`**

```js
/**
 * Turns a query-index row plus its extracted sections into Algolia records.
 *
 * The search UI renders a highlighted title and a row of pills, and nothing
 * else, so title is pre-formatted here rather than assembled in the UI. Pill
 * fields keep their authored casing and stay separate, letting the UI compose
 * and reorder them without a reindex.
 */

const TITLE_SEPARATOR = ' › ';
const MAX_TITLE_LENGTH = 80;

/**
 * Converts a last-modified header to epoch seconds, matching the units the
 * query index uses.
 * @param {string} value an HTTP date
 * @returns {number|null} epoch seconds, or null when unusable
 */
export function httpDateToEpochSeconds(value) {
  if (!value) { return null; }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : Math.floor(parsed / 1000);
}

const asString = (value) => (typeof value === 'string' ? value : '');

/** Authors may leave tags empty, or supply a single value rather than a list. */
function asTags(value) {
  if (Array.isArray(value)) { return value; }
  return typeof value === 'string' && value ? [value] : [];
}

function displayTitle(pageTitle, section) {
  const title = section.level === 1 || !section.heading || section.heading === pageTitle
    ? pageTitle
    : `${pageTitle}${TITLE_SEPARATOR}${section.heading}`;
  return title.slice(0, MAX_TITLE_LENGTH);
}

/**
 * @param {object} row a query-index.json row
 * @param {object[]} sections output of splitSections
 * @param {number[]} fragmentTimes epoch seconds for each inlined fragment
 * @returns {object[]} Algolia records
 */
export function buildRecords(row, sections, fragmentTimes = []) {
  const pageTitle = asString(row.title);
  const section = row.path.split('/').filter(Boolean)[0] || 'root';
  const lastModified = Math.max(Number(row.lastModified) || 0, ...fragmentTimes);

  return sections.map((entry) => {
    const id = entry.anchor ? `${row.path}#${entry.anchor}` : row.path;
    return {
      objectID: id,
      url: id,
      path: row.path,

      title: displayTitle(pageTitle, entry),
      implementation: asString(row.implementation),
      platform: asString(row.platform),
      tags: asTags(row.tags),

      hierarchy: entry.hierarchy,
      content: entry.content,
      description: asString(row.description),
      pageTitle,

      section,
      level: entry.level,
      position: entry.position,
      lastModified,
    };
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/indexer/records.node.test.js`
Expected: PASS, 16 tests.

- [ ] **Step 5: Lint**

Run: `npx eslint indexer/records.js test/indexer/records.node.test.js`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add indexer/records.js test/indexer/records.node.test.js
git commit -m "feat(indexer): build Algolia records from sections"
```

---

### Task 5: Configuration

**Files:**
- Create: `indexer/config.js`
- Test: `test/indexer/config.node.test.js`
- Modify: `.env`

**Interfaces:**
- Consumes: nothing.
- Produces: `loadConfig(env = process.env): { appId, writeKey, indexName, siteOrigin }`, throwing an `Error` naming every missing required variable. Also `DEFAULT_SITE_ORIGIN: string`.

`loadConfig` takes `env` as a parameter so tests never mutate `process.env`.

- [ ] **Step 1: Write the failing test**

Create `test/indexer/config.node.test.js`:

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_SITE_ORIGIN, loadConfig } from '../../indexer/config.js';

const complete = {
  ALGOLIA_APP_ID: 'APP',
  ALGOLIA_WRITE_API_KEY: 'KEY',
  ALGOLIA_INDEX_NAME: 'spectrum-docs-dev',
};

describe('loadConfig', () => {
  it('reads the required variables', () => {
    assert.deepEqual(loadConfig(complete), {
      appId: 'APP',
      writeKey: 'KEY',
      indexName: 'spectrum-docs-dev',
      siteOrigin: DEFAULT_SITE_ORIGIN,
    });
  });

  it('lets SITE_ORIGIN override the default', () => {
    const config = loadConfig({ ...complete, SITE_ORIGIN: 'https://example.test' });
    assert.equal(config.siteOrigin, 'https://example.test');
  });

  it('names every missing variable in one error', () => {
    assert.throws(
      () => loadConfig({ ALGOLIA_APP_ID: 'APP' }),
      /ALGOLIA_WRITE_API_KEY.*ALGOLIA_INDEX_NAME|ALGOLIA_INDEX_NAME.*ALGOLIA_WRITE_API_KEY/s,
    );
  });

  it('rejects an empty index name rather than defaulting', () => {
    assert.throws(() => loadConfig({ ...complete, ALGOLIA_INDEX_NAME: '' }), /ALGOLIA_INDEX_NAME/);
  });

  it('strips a trailing slash from SITE_ORIGIN', () => {
    const config = loadConfig({ ...complete, SITE_ORIGIN: 'https://example.test/' });
    assert.equal(config.siteOrigin, 'https://example.test');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/indexer/config.node.test.js`
Expected: FAIL — `Cannot find module '.../indexer/config.js'`.

- [ ] **Step 3: Implement `indexer/config.js`**

```js
/**
 * Environment configuration for the indexer.
 *
 * .env is loaded when present so a local run needs no shell setup; in CI the
 * file is absent and loadEnvFile throws, which is the expected path. The same
 * code therefore runs in both places without branching.
 */

export const DEFAULT_SITE_ORIGIN = 'https://main--spectrum-hub--adobe.aem.live';

const REQUIRED = ['ALGOLIA_APP_ID', 'ALGOLIA_WRITE_API_KEY', 'ALGOLIA_INDEX_NAME'];

try {
  process.loadEnvFile(new URL('../.env', import.meta.url).pathname);
} catch {
  // No .env file. Rely on the environment, as CI does.
}

/**
 * @param {object} env the environment to read
 * @returns {object} validated configuration
 */
export function loadConfig(env = process.env) {
  const missing = REQUIRED.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    appId: env.ALGOLIA_APP_ID,
    writeKey: env.ALGOLIA_WRITE_API_KEY,
    indexName: env.ALGOLIA_INDEX_NAME,
    siteOrigin: (env.SITE_ORIGIN || DEFAULT_SITE_ORIGIN).replace(/\/$/, ''),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/indexer/config.node.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Document the new variable in `.env`**

Add to `.env` (it is gitignored, so this is local only):

```text
# Target index for indexer/index.js. Use a scratch index locally.
ALGOLIA_INDEX_NAME=spectrum-docs-dev
```

- [ ] **Step 6: Lint and commit**

Run: `npx eslint indexer/config.js test/indexer/config.node.test.js`

```bash
git add indexer/config.js test/indexer/config.node.test.js
git commit -m "feat(indexer): load and validate configuration"
```

---

### Task 6: AEM client

**Files:**
- Create: `indexer/aem-client.js`
- Test: `test/indexer/aem-client.node.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `createClient({ siteOrigin, fetchImpl = fetch }): { fetchQueryIndex(), fetchPage(path) }`
  - `fetchQueryIndex(): Promise<object[]>` — the `data` array from `/query-index.json?limit=500`.
  - `fetchPage(path): Promise<{ html, lastModified } | null>` — `null` on any non-OK response; results cached per client instance so a shared fragment is fetched once.
  - `mapWithConcurrency(items, limit, worker): Promise<any[]>` — results in input order.

`fetchImpl` is injected so tests never touch the network.

- [ ] **Step 1: Write the failing test**

Create `test/indexer/aem-client.node.test.js`:

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createClient, mapWithConcurrency } from '../../indexer/aem-client.js';

const ORIGIN = 'https://site.test';

/** Minimal fetch double: a url -> { status, body, headers } map. */
function fakeFetch(routes) {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    const route = routes[url];
    if (!route) { return { ok: false, status: 404 }; }
    return {
      ok: true,
      status: 200,
      text: async () => route.body,
      json: async () => JSON.parse(route.body),
      headers: { get: (name) => (route.headers || {})[name.toLowerCase()] ?? null },
    };
  };
  return { impl, calls };
}

describe('fetchQueryIndex', () => {
  it('returns the data array', async () => {
    const { impl } = fakeFetch({
      [`${ORIGIN}/query-index.json?limit=500`]: { body: '{"data":[{"path":"/a"}]}' },
    });
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl });
    assert.deepEqual(await client.fetchQueryIndex(), [{ path: '/a' }]);
  });

  it('throws when the index cannot be fetched', async () => {
    const { impl } = fakeFetch({});
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl });
    await assert.rejects(() => client.fetchQueryIndex(), /query-index/);
  });
});

describe('fetchPage', () => {
  it('returns html and the parsed last-modified time', async () => {
    const { impl } = fakeFetch({
      [`${ORIGIN}/a`]: { body: '<html></html>', headers: { 'last-modified': 'Fri, 31 Jul 2026 04:03:19 GMT' } },
    });
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl });
    assert.deepEqual(await client.fetchPage('/a'), {
      html: '<html></html>',
      lastModified: 1785470599,
    });
  });

  it('returns null last-modified when the header is absent', async () => {
    const { impl } = fakeFetch({ [`${ORIGIN}/a`]: { body: 'x' } });
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl });
    assert.equal((await client.fetchPage('/a')).lastModified, null);
  });

  it('returns null for a missing page', async () => {
    const { impl } = fakeFetch({});
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl });
    assert.equal(await client.fetchPage('/nope'), null);
  });

  it('caches so a repeated path is fetched once', async () => {
    const { impl, calls } = fakeFetch({ [`${ORIGIN}/a`]: { body: 'x' } });
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl });
    await client.fetchPage('/a');
    await client.fetchPage('/a');
    assert.equal(calls.length, 1);
  });

  it('caches misses too', async () => {
    const { impl, calls } = fakeFetch({});
    const client = createClient({ siteOrigin: ORIGIN, fetchImpl: impl });
    await client.fetchPage('/nope');
    await client.fetchPage('/nope');
    assert.equal(calls.length, 1);
  });
});

describe('mapWithConcurrency', () => {
  it('preserves input order', async () => {
    const out = await mapWithConcurrency([3, 1, 2], 2, async (n) => n * 10);
    assert.deepEqual(out, [30, 10, 20]);
  });

  it('never exceeds the concurrency limit', async () => {
    let active = 0;
    let peak = 0;
    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (n) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => { setTimeout(resolve, 1); });
      active -= 1;
      return n;
    });
    assert.ok(peak <= 2, `peak concurrency was ${peak}`);
  });

  it('handles an empty list', async () => {
    assert.deepEqual(await mapWithConcurrency([], 4, async (n) => n), []);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/indexer/aem-client.node.test.js`
Expected: FAIL — `Cannot find module '.../indexer/aem-client.js'`.

- [ ] **Step 3: Implement `indexer/aem-client.js`**

```js
/**
 * Reads published content from aem.live.
 *
 * fetchImpl is injectable so tests never hit the network, and pages are cached
 * per client because a single fragment is often shared by many pages.
 */

import { httpDateToEpochSeconds } from './records.js';

const QUERY_INDEX = '/query-index.json?limit=500';

/**
 * Runs an async worker over items, capped at `limit` in flight.
 * @param {any[]} items input values
 * @param {number} limit maximum concurrent workers
 * @param {Function} worker receives (item, index)
 * @returns {Promise<any[]>} results in input order
 */
export async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;

  const run = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

/**
 * @param {object} options siteOrigin and an optional fetch implementation
 * @returns {object} a client bound to that origin
 */
export function createClient({ siteOrigin, fetchImpl = fetch }) {
  const cache = new Map();

  async function fetchQueryIndex() {
    const response = await fetchImpl(`${siteOrigin}${QUERY_INDEX}`);
    if (!response.ok) {
      throw new Error(`Could not fetch query-index.json: HTTP ${response.status}`);
    }
    const { data } = await response.json();
    return data || [];
  }

  async function fetchPage(path) {
    if (cache.has(path)) { return cache.get(path); }

    const response = await fetchImpl(`${siteOrigin}${path}`);
    const result = response.ok
      ? {
        html: await response.text(),
        lastModified: httpDateToEpochSeconds(response.headers.get('last-modified')),
      }
      : null;

    cache.set(path, result);
    return result;
  }

  return { fetchQueryIndex, fetchPage };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/indexer/aem-client.node.test.js`
Expected: PASS, 10 tests.

- [ ] **Step 5: Lint and commit**

Run: `npx eslint indexer/aem-client.js test/indexer/aem-client.node.test.js`

```bash
git add indexer/aem-client.js test/indexer/aem-client.node.test.js
git commit -m "feat(indexer): fetch content from aem.live"
```

---

### Task 7: Index settings and the Algolia writer

**Files:**
- Create: `indexer/settings.js`
- Create: `indexer/algolia.js`
- Test: `test/indexer/settings.node.test.js`

**Interfaces:**
- Consumes: `loadConfig` output (Task 5).
- Produces:
  - `INDEX_SETTINGS: object` — the settings applied before every rebuild.
  - `publish(records, config, { clientFactory }): Promise<void>` — applies settings, then replaces all objects atomically.

`clientFactory` defaults to `algoliasearch` and is injected so the test never contacts Algolia.

- [ ] **Step 1: Write the failing test**

Create `test/indexer/settings.node.test.js`:

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { publish } from '../../indexer/algolia.js';
import { INDEX_SETTINGS } from '../../indexer/settings.js';

describe('INDEX_SETTINGS', () => {
  it('searches title first so highlighting exists and outranks facets', () => {
    assert.equal(INDEX_SETTINGS.searchableAttributes[0], 'title');
  });

  it('highlights title, which is the only text the UI renders', () => {
    assert.ok(INDEX_SETTINGS.attributesToHighlight.includes('title'));
  });

  it('ranks pill fields below prose', () => {
    const attrs = INDEX_SETTINGS.searchableAttributes;
    assert.ok(attrs.indexOf('content') < attrs.indexOf('platform'));
    assert.ok(attrs.indexOf('tags') < attrs.indexOf('implementation'));
  });

  it('collapses results to one row per page', () => {
    assert.equal(INDEX_SETTINGS.attributeForDistinct, 'path');
    assert.equal(INDEX_SETTINGS.distinct, 1);
  });
});

describe('publish', () => {
  it('sets settings before replacing objects', async () => {
    const order = [];
    const clientFactory = () => ({
      setSettings: async () => { order.push('setSettings'); },
      replaceAllObjects: async () => { order.push('replaceAllObjects'); },
    });
    await publish([{ objectID: 'a' }], { appId: 'A', writeKey: 'K', indexName: 'idx' }, { clientFactory });
    assert.deepEqual(order, ['setSettings', 'replaceAllObjects']);
  });

  it('targets the configured index with the given records', async () => {
    const seen = {};
    const clientFactory = () => ({
      setSettings: async (args) => { seen.settings = args; },
      replaceAllObjects: async (args) => { seen.replace = args; },
    });
    const records = [{ objectID: 'a' }];
    await publish(records, { appId: 'A', writeKey: 'K', indexName: 'idx' }, { clientFactory });
    assert.equal(seen.settings.indexName, 'idx');
    assert.equal(seen.replace.indexName, 'idx');
    assert.deepEqual(seen.replace.objects, records);
  });

  it('refuses to publish an empty record set', async () => {
    const clientFactory = () => ({
      setSettings: async () => {},
      replaceAllObjects: async () => {},
    });
    await assert.rejects(
      () => publish([], { appId: 'A', writeKey: 'K', indexName: 'idx' }, { clientFactory }),
      /no records/i,
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/indexer/settings.node.test.js`
Expected: FAIL — `Cannot find module '.../indexer/algolia.js'`.

- [ ] **Step 3: Implement `indexer/settings.js`**

```js
/**
 * Algolia index settings, applied before every rebuild so the index is
 * reproducible from code. replaceAllObjects copies settings from the target
 * index to its temporary index, so these must be applied to the target first.
 */

export const INDEX_SETTINGS = {
  // Priority order. title is first because it is the only text the UI shows and
  // must be searchable for _highlightResult.title to exist at all. It already
  // contains hierarchy.lvl0 and the section heading, so only lvl1 — the middle
  // context a two-segment title drops — needs listing. The pill fields come
  // last: typing "iOS" should find iOS pages without outranking a real match.
  searchableAttributes: [
    'title',
    'hierarchy.lvl1',
    'content',
    'tags',
    'description',
    'implementation',
    'platform',
  ],
  attributesToHighlight: ['title'],
  attributesForFaceting: ['platform', 'implementation', 'section', 'tags'],
  // One row per page: the best-matching section wins and deep-links to itself.
  attributeForDistinct: 'path',
  distinct: 1,
  // Textual relevance is applied first, so this only breaks ties, favouring
  // higher-level and earlier sections.
  customRanking: ['asc(level)', 'asc(position)'],
};
```

- [ ] **Step 4: Implement `indexer/algolia.js`**

```js
/**
 * Publishes records to Algolia as a full atomic rebuild.
 *
 * replaceAllObjects builds a temporary index and moves it into place, so the
 * live index is never partially populated and deleted pages disappear without
 * any tracked state.
 */

import { algoliasearch } from 'algoliasearch';

import { INDEX_SETTINGS } from './settings.js';

/**
 * @param {object[]} records the complete record set
 * @param {object} config appId, writeKey, indexName
 * @param {object} options optional clientFactory, for tests
 */
export async function publish(records, config, { clientFactory = algoliasearch } = {}) {
  if (!records.length) {
    throw new Error('Refusing to publish: no records were built');
  }

  const client = clientFactory(config.appId, config.writeKey);

  await client.setSettings({
    indexName: config.indexName,
    indexSettings: INDEX_SETTINGS,
  });

  await client.replaceAllObjects({
    indexName: config.indexName,
    objects: records,
  });
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test test/indexer/settings.node.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 6: Lint and commit**

Run: `npx eslint indexer/settings.js indexer/algolia.js test/indexer/settings.node.test.js`

```bash
git add indexer/settings.js indexer/algolia.js test/indexer/settings.node.test.js
git commit -m "feat(indexer): publish records atomically to Algolia"
```

---

### Task 8: Orchestration and CLI

**Files:**
- Create: `indexer/index.js`
- Test: `test/indexer/index.node.test.js`

**Interfaces:**
- Consumes: every module from Tasks 2–7.
- Produces:
  - `parseArgs(argv: string[]): { dryRun: boolean, limit: number|null, path: string|null }` — `--path` implies `dryRun`.
  - `buildAll(rows, client): Promise<{ records: object[], failures: string[] }>`
  - `assertAcceptableFailureRate(attempted: number, failures: string[]): void` — throws when `failures.length >= Math.max(3, attempted * 0.1)`.

- [ ] **Step 1: Write the failing test**

Create `test/indexer/index.node.test.js`:

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assertAcceptableFailureRate, buildAll, parseArgs } from '../../indexer/index.js';

const page = (body) => ({ html: `<html><body><main>${body}</main></body></html>`, lastModified: null });

/** A client double over a path -> page map. */
const fakeClient = (pages) => ({
  fetchQueryIndex: async () => [],
  fetchPage: async (path) => pages[path] ?? null,
});

describe('parseArgs', () => {
  it('defaults to a full live run', () => {
    assert.deepEqual(parseArgs([]), { dryRun: false, limit: null, path: null });
  });

  it('reads --dry-run and --limit', () => {
    assert.deepEqual(parseArgs(['--dry-run', '--limit=10']), { dryRun: true, limit: 10, path: null });
  });

  it('makes --path imply --dry-run', () => {
    assert.deepEqual(parseArgs(['--path=/a']), { dryRun: true, limit: null, path: '/a' });
  });

  it('ignores a non-numeric limit', () => {
    assert.equal(parseArgs(['--limit=abc']).limit, null);
  });
});

describe('assertAcceptableFailureRate', () => {
  it('allows a couple of failures in a small run', () => {
    // Threshold is max(3, 10 * 0.1) = 3, so two failures are tolerated.
    assert.doesNotThrow(() => assertAcceptableFailureRate(10, ['/a', '/b']));
  });

  it('applies the floor of three on a small run', () => {
    assert.throws(() => assertAcceptableFailureRate(10, ['/a', '/b', '/c']), /failed/i);
  });

  it('tolerates three failures in a large run, where the rate governs', () => {
    // Threshold is max(3, 100 * 0.1) = 10. The floor must not abort a big run.
    assert.doesNotThrow(() => assertAcceptableFailureRate(100, ['/a', '/b', '/c']));
  });

  it('throws when a tenth of a large run fails', () => {
    const failures = Array.from({ length: 20 }, (unused, i) => `/p${i}`);
    assert.throws(() => assertAcceptableFailureRate(200, failures), /failed/i);
  });

  it('accepts a clean run', () => {
    assert.doesNotThrow(() => assertAcceptableFailureRate(200, []));
  });
});

describe('buildAll', () => {
  it('inlines fragments before splitting, so fragment prose is indexed', async () => {
    const client = fakeClient({
      '/a': page('<div><h1 id="t">Title</h1></div><div><h2 id="u">Usage</h2><p><a href="/fragments/f">https://x.test/fragments/f</a></p></div>'),
      '/fragments/f': page('<div><h3 id="p">Progressive</h3><p>fragment prose</p></div>'),
    });
    const { records } = await buildAll([{ path: '/a', title: 'Title', lastModified: 1 }], client);
    const deep = records.find((r) => r.objectID === '/a#p');
    assert.equal(deep.content, 'fragment prose');
    assert.equal(deep.title, 'Title › Progressive');
    assert.equal(deep.hierarchy.lvl1, 'Usage');
  });

  it('reports a page that cannot be fetched without throwing', async () => {
    const { records, failures } = await buildAll([{ path: '/gone', title: 'X', lastModified: 1 }], fakeClient({}));
    assert.deepEqual(failures, ['/gone']);
    assert.deepEqual(records, []);
  });

  it('keeps building after one page fails', async () => {
    const client = fakeClient({ '/ok': page('<div><h1 id="t">Ok</h1><p>text</p></div>') });
    const rows = [
      { path: '/gone', title: 'X', lastModified: 1 },
      { path: '/ok', title: 'Ok', lastModified: 1 },
    ];
    const { records, failures } = await buildAll(rows, client);
    assert.deepEqual(failures, ['/gone']);
    assert.equal(records.length, 1);
  });

  it('rolls a fragment timestamp into the page lastModified', async () => {
    const client = {
      fetchQueryIndex: async () => [],
      fetchPage: async (path) => (path === '/a'
        ? { ...page('<div><h1 id="t">T</h1><p><a href="/fragments/f">https://x.test/fragments/f</a></p></div>'), lastModified: 100 }
        : { ...page('<div><p>prose</p></div>'), lastModified: 999 }),
    };
    const { records } = await buildAll([{ path: '/a', title: 'T', lastModified: 100 }], client);
    assert.equal(records[0].lastModified, 999);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/indexer/index.node.test.js`
Expected: FAIL — `Cannot find module '.../indexer/index.js'`.

- [ ] **Step 3: Implement `indexer/index.js`**

```js
/**
 * CLI entry point for the Algolia content indexer.
 *
 *   node indexer/index.js                    full rebuild, pushes to Algolia
 *   node indexer/index.js --dry-run          writes indexer/out/records.json only
 *   node indexer/index.js --limit=10         first 10 pages
 *   node indexer/index.js --path=/some/page  one page, implies --dry-run
 *
 * --limit and --path restrict what is read, but a push is still a full replace,
 * so a limited run that publishes leaves the index holding only those pages.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'node-html-parser';

import { createClient, mapWithConcurrency } from './aem-client.js';
import { buildRecords } from './records.js';
import { inlineFragments } from './fragments.js';
import { loadConfig } from './config.js';
import { publish } from './algolia.js';
import { splitSections, stripNoise } from './sections.js';

const CONCURRENCY = 8;
const MIN_FAILURES_TO_ABORT = 3;
const FAILURE_RATE_LIMIT = 0.1;
const OUT_DIR = new URL('./out/', import.meta.url);

/**
 * @param {string[]} argv raw CLI arguments
 * @returns {object} parsed flags
 */
export function parseArgs(argv) {
  const has = (name) => argv.includes(name);
  const value = (name) => {
    const match = argv.find((arg) => arg.startsWith(`${name}=`));
    return match ? match.slice(name.length + 1) : null;
  };

  const rawLimit = Number(value('--limit'));
  const path = value('--path');

  return {
    dryRun: has('--dry-run') || Boolean(path),
    limit: Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : null,
    path,
  };
}

/**
 * Aborts a run that lost too much content to publish safely. Without this an
 * upstream outage would turn an atomic rebuild into an atomic emptying.
 * @param {number} attempted pages tried
 * @param {string[]} failures paths that could not be indexed
 */
export function assertAcceptableFailureRate(attempted, failures) {
  const threshold = Math.max(MIN_FAILURES_TO_ABORT, attempted * FAILURE_RATE_LIMIT);
  if (failures.length >= threshold) {
    throw new Error(
      `${failures.length} of ${attempted} pages failed, at or above the ${Math.ceil(threshold)} allowed. `
      + `Refusing to publish. First failures: ${failures.slice(0, 5).join(', ')}`,
    );
  }
}

/**
 * @param {object[]} rows query-index rows
 * @param {object} client an aem-client instance
 * @returns {Promise<object>} records and the paths that failed
 */
export async function buildAll(rows, client) {
  const failures = [];

  const built = await mapWithConcurrency(rows, CONCURRENCY, async (row) => {
    const page = await client.fetchPage(row.path);
    const main = page?.html ? parse(page.html).querySelector('main') : null;
    if (!main) { failures.push(row.path); return []; }

    const fragmentTimes = await inlineFragments(main, client.fetchPage);
    stripNoise(main);
    return buildRecords(row, splitSections(main), fragmentTimes);
  });

  return { records: built.flat(), failures };
}

function writeDryRun(records) {
  mkdirSync(fileURLToPath(OUT_DIR), { recursive: true });
  const file = fileURLToPath(new URL('records.json', OUT_DIR));
  writeFileSync(file, `${JSON.stringify(records, null, 2)}\n`);
  return file;
}

async function main() {
  const started = Date.now();
  const options = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const client = createClient({ siteOrigin: config.siteOrigin });

  let rows = await client.fetchQueryIndex();
  if (options.path) { rows = rows.filter((row) => row.path === options.path); }
  if (options.limit) { rows = rows.slice(0, options.limit); }

  if (!rows.length) {
    throw new Error('No pages matched. Check --path, or whether the query index is empty.');
  }
  if (options.limit && !options.dryRun) {
    console.warn(`WARNING: --limit with a live push replaces the whole index with ${rows.length} pages.`);
  }

  const { records, failures } = await buildAll(rows, client);
  failures.forEach((path) => console.warn(`WARNING: could not index ${path}`));
  assertAcceptableFailureRate(rows.length, failures);

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`Pages: ${rows.length} (${failures.length} failed)  Records: ${records.length}  Elapsed: ${elapsed}s`);

  if (options.dryRun) {
    console.log(`Dry run. Wrote ${writeDryRun(records)}`);
    return;
  }

  await publish(records, config);
  console.log(`Published ${records.length} records to "${config.indexName}".`);
}

// Only run when invoked directly, so the test can import the exports. argv[1]
// is resolved because `node indexer/index.js` passes a relative path while
// import.meta.url is always absolute.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`FAILED: ${error.message}`);
    process.exitCode = 1;
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/indexer/index.node.test.js`
Expected: PASS, 13 tests.

- [ ] **Step 5: Run the whole suite and lint**

Run: `npm run lint && npm run test:extractions`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add indexer/index.js test/indexer/index.node.test.js
git commit -m "feat(indexer): add CLI orchestration"
```

---

### Task 9: Verify against real content

No new tests. This task proves the pipeline works end to end on live data before any workflow runs it on a schedule.

**Files:**
- Modify: `indexer/sections.js` (only if the dry run reveals noise worth removing)

**Interfaces:**
- Consumes: the complete CLI from Task 8.
- Produces: a reviewed `indexer/out/records.json`.

- [ ] **Step 1: Dry-run a single known-hard page**

Run: `node indexer/index.js --path=/web/rsp/components/accordion`
Expected: roughly 14 records. This page is the acceptance case — its published HTML is almost entirely fragment links, so a low record count means inlining silently failed.

- [ ] **Step 2: Confirm fragment prose was inlined**

Run:

```bash
node -e "
const r = require('./indexer/out/records.json');
console.log('records:', r.length);
console.log('has fragment prose:', r.some((x) => /Accordions are effective for organizing/.test(x.content)));
console.log('has prop sections:', r.filter((x) => /isQuiet|density|isMultiple/.test(x.title)).length);
console.log(r.map((x) => x.title).join('\n'));
"
```

Expected: `has fragment prose: true`, and several prop-named sections. If `false`, inlining is broken — do not continue.

Two details this check gets wrong if written carelessly. A record has no `heading` field — the section heading reaches the record through `title` and `hierarchy`, so match against `title`. And `Progressive disclosure` is a section's *heading*, never its `content`; searching `content` for it returns false on a perfectly working pipeline. Match a distinctive phrase from the fragment's prose instead.

- [ ] **Step 3: Dry-run the whole site**

Run: `node indexer/index.js --dry-run`
Expected: about 155 pages, roughly 1100 records, 0 failures.

- [ ] **Step 4: Sanity-check the record set**

Run:

```bash
node -e "
const r = require('./indexer/out/records.json');
const ids = r.map((x) => x.objectID);
console.log('records:', r.length);
console.log('duplicate objectIDs:', ids.length - new Set(ids).size);
console.log('empty titles:', r.filter((x) => !x.title).length);
console.log('non-array tags:', r.filter((x) => !Array.isArray(x.tags)).length);
console.log('absolute urls:', r.filter((x) => /^https?:/.test(x.url)).length);
console.log('oversized:', r.filter((x) => JSON.stringify(x).length > 10000).length);
console.log('longest content:', Math.max(...r.map((x) => x.content.length)));
"
```

Expected: zero duplicates, zero empty titles, zero non-array tags, zero absolute URLs, zero oversized records.

- [ ] **Step 5: Read a sample and tune if needed**

Skim 20 records spread across the site. If a block type is leaking configuration or boilerplate into `content`, add its selector to `NOISE_SELECTORS` in `indexer/sections.js`, add a matching case to `test/indexer/sections.node.test.js`, and re-run.

- [ ] **Step 6: Publish to a scratch index**

With `ALGOLIA_INDEX_NAME=spectrum-docs-dev` in `.env`:

Run: `node indexer/index.js`
Expected: `Published ~1100 records to "spectrum-docs-dev".`

- [ ] **Step 7: Query the scratch index**

```bash
set -a && . ./.env && set +a
curl -s -X POST "https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/spectrum-docs-dev/query" \
  -H "X-Algolia-Application-Id: ${ALGOLIA_APP_ID}" \
  -H "X-Algolia-API-Key: ${ALGOLIA_WRITE_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{"query":"progressive disclosure","hitsPerPage":5}' \
  | node -e "let s='';process.stdin.on('data',(d)=>{s+=d;}).on('end',()=>{const j=JSON.parse(s);console.log('nbHits',j.nbHits);j.hits.forEach((h)=>console.log(h.title,'->',h.url));});"
```

Expected: the accordion page appears, with a `url` deep-linking to `#progressive-disclosure`. This is the single clearest proof the whole pipeline works — that text exists only inside a fragment.

- [ ] **Step 8: Commit any tuning**

```bash
git add indexer/sections.js test/indexer/sections.node.test.js
git commit -m "fix(indexer): tune content extraction against real pages"
```

Skip this step if nothing needed tuning.

---

### Task 10: Scheduled workflow

**Files:**
- Create: `.github/workflows/index-algolia.yml`
- Create: `indexer/README.md`

**Interfaces:**
- Consumes: the CLI from Task 8.
- Produces: a two-hourly scheduled run and a manual trigger.

- [ ] **Step 1: Create the workflow**

```yaml
name: Index content to Algolia

on:
  schedule:
    - cron: '0 */2 * * *' # Every two hours
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Build records without publishing'
        type: boolean
        default: false

permissions:
  contents: read

jobs:
  index:
    runs-on: ubuntu-latest
    steps:
      - name: Check out code
        uses: actions/checkout@v4

      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Build and publish the index
        run: node indexer/index.js ${{ inputs.dry_run && '--dry-run' || '' }}
        env:
          ALGOLIA_APP_ID: ${{ secrets.ALGOLIA_APP_ID }}
          ALGOLIA_WRITE_API_KEY: ${{ secrets.ALGOLIA_WRITE_API_KEY }}
          ALGOLIA_INDEX_NAME: ${{ vars.ALGOLIA_INDEX_NAME }}
```

- [ ] **Step 2: Validate the workflow parses**

Run:

```bash
node -e "
const fs = require('fs');
const text = fs.readFileSync('.github/workflows/index-algolia.yml', 'utf8');
['cron', 'workflow_dispatch', 'ALGOLIA_INDEX_NAME', 'npm ci'].forEach((needle) => {
  if (!text.includes(needle)) { throw new Error('missing ' + needle); }
});
console.log('workflow looks well formed');
"
```

Expected: `workflow looks well formed`.

- [ ] **Step 3: Write `indexer/README.md`**

````markdown
# Content indexer

Publishes Spectrum Hub content to Algolia. Runs every two hours via
[`.github/workflows/index-algolia.yml`](../.github/workflows/index-algolia.yml), and runs
identically on a laptop.

Each run is a full atomic rebuild: it reads every published page, inlines any linked
fragment content, splits each page into section-level records, and swaps the whole
index into place. Deleted pages disappear on the next run without any tracked state.

## Local use

Add to `.env` at the repo root:

```text
ALGOLIA_APP_ID=...
ALGOLIA_WRITE_API_KEY=...
ALGOLIA_INDEX_NAME=spectrum-docs-dev
```

Use a scratch index name locally. A run replaces the entire target index.

```bash
node indexer/index.js                     # full rebuild, publishes
node indexer/index.js --dry-run           # writes indexer/out/records.json, publishes nothing
node indexer/index.js --limit=10          # first 10 pages
node indexer/index.js --path=/web/rsp/components/accordion   # one page, implies --dry-run
```

`--limit` and `--path` restrict what is read, but a push is still a full replace, so a
limited run that publishes leaves the index holding only those pages.

## Tuning what gets indexed

Most tuning happens in [`sections.js`](./sections.js):

- `NOISE_SELECTORS` — blocks removed before text extraction, for configuration and media
  rather than prose.
- `splitSections` — where a page is cut, and which sections are kept.

Change it, add a case to `test/indexer/sections.node.test.js`, then compare with
`--dry-run`.

## Design

See [the design spec](../../.ai/docs/specs/2026-07-30-algolia-content-indexer-design.md)
for the record shape, index settings, and the reasoning behind them.
````

- [ ] **Step 4: Final full check**

Run: `npm run lint && npm run test:extractions`
Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/index-algolia.yml indexer/README.md
git commit -m "feat(indexer): run the indexer every two hours"
```

- [ ] **Step 6: Configure the repository (manual, outside this plan)**

These cannot be done from the working tree. Tell the user they are required before the schedule works:

- Add repository **secrets** `ALGOLIA_APP_ID` and `ALGOLIA_WRITE_API_KEY`.
- Add a repository **variable** `ALGOLIA_INDEX_NAME`, set to the production index name.
- Trigger the workflow manually once with `dry_run: true` to confirm the run is green before letting the schedule publish.

---

## Verification checklist

- [ ] `npm run lint` passes.
- [ ] `npm run test:extractions` passes, including all `test/indexer/` files.
- [ ] No test performs network I/O.
- [ ] `node indexer/index.js --path=/web/rsp/components/accordion` yields records containing fragment-only prose.
- [ ] A full `--dry-run` produces roughly 1100 records with no duplicate `objectID`s.
- [ ] A scratch-index query for "progressive disclosure" returns the accordion page with a deep-linked `url`.
- [ ] `indexer/` is listed in `.hlxignore` and `indexer/out/` in `.gitignore`.
