# Indexer heading ID normalization implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Algolia search-result fragments match the heading IDs exposed by the rendered page.

**Architecture:** Move the existing pure heading-ID normalizer from `ak.js` into `scripts/utils/heading-id.js`. Re-export it from `ak.js` for current browser consumers, and call the same utility when the indexer reads heading IDs in `splitSections()`.

**Tech Stack:** JavaScript ES modules, Web Test Runner, Node test runner, `node-html-parser`

---

### Task 1: Share heading ID normalization with the indexer

**Files:**
- Create: `scripts/utils/heading-id.js`
- Modify: `scripts/ak.js:382-401`
- Modify: `tools/indexer/sections.js:12-61`
- Test: `test/indexer/sections.node.test.js:38-42`
- Verify: `test/scripts/ak.test.js:41-62`

- [ ] **Step 1: Write the failing indexer regression test**

Extend the existing anchor test in `test/indexer/sections.node.test.js`:

```js
it('normalizes boundary size modifiers in heading anchors', () => {
  const el = main(`
    <h1 id="size-xl-overview">Overview</h1><p>intro</p>
    <h2 id="details-size-m">Details</h2><p>details</p>
    <h3 id="size-xl-api-size-s">API</h3><p>api</p>
    <h2 id="heading-size-xl-details">Middle</h2><p>middle</p>
    <h2 id="sizeable-content">Similar</h2><p>similar</p>
  `);

  assert.deepEqual(
    splitSections(el).map((section) => section.anchor),
    ['overview', 'details', 'api', 'heading-size-xl-details', 'sizeable-content'],
  );
});
```

- [ ] **Step 2: Run the indexer section test and verify RED**

Run:

```bash
node --test test/indexer/sections.node.test.js
```

Expected: FAIL because `splitSections()` returns the original EDS IDs with boundary `size-*` modifiers.

- [ ] **Step 3: Create the shared pure utility**

Create `scripts/utils/heading-id.js`:

```js
export default function normalizeHeadingId(id) {
  return id
    .replace(/^size-[a-z0-9]+-/, '')
    .replace(/-size-[a-z0-9]+$/, '');
}
```

The module must remain free of DOM and browser-global dependencies so both `ak.js` and the Node indexer can import it.

- [ ] **Step 4: Preserve the existing `ak.js` API**

At the top of `scripts/ak.js`, import the utility:

```js
import normalizeHeadingId from './utils/heading-id.js';
```

Replace the existing function declaration with a re-export:

```js
export { normalizeHeadingId };
```

Keep the existing `loadIcons()` call unchanged:

```js
parent.id = normalizeHeadingId(parent.id);
```

- [ ] **Step 5: Normalize IDs at the indexer boundary**

At the top of `tools/indexer/sections.js`, import the utility:

```js
import normalizeHeadingId from '../../scripts/utils/heading-id.js';
```

Normalize only heading IDs as each section is created:

```js
anchor: normalizeHeadingId(node.getAttribute('id') || ''),
```

Do not modify heading text, non-heading IDs, record construction, or source HTML.

- [ ] **Step 6: Run targeted tests and verify GREEN**

Run:

```bash
node --test test/indexer/sections.node.test.js
npm run test:file -- test/scripts/ak.test.js
```

Expected: both commands pass. The existing `ak.js` tests prove its public named export retains the same normalization behavior.

- [ ] **Step 7: Run complete relevant suites**

Run:

```bash
npm run test:indexer
npm run test:unit
npx eslint scripts/ak.js scripts/utils/heading-id.js tools/indexer/sections.js test/indexer/sections.node.test.js
git diff --check
```

Expected: all commands exit successfully. The unit suite may continue to report the repository's intentional skipped tests.

- [ ] **Step 8: Review the final diff**

Run:

```bash
git --no-pager diff -- scripts/ak.js scripts/utils/heading-id.js tools/indexer/sections.js test/indexer/sections.node.test.js
```

Confirm the diff contains only the shared utility extraction, the indexer call, and its regression coverage. Do not commit unless the user explicitly requests it.
