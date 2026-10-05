---
name: create-new-block
description: Scaffold and implement a new EDS block for Spectrum Hub. Use when adding a new block — covers file structure, the init(el) function contract, metadata-driven composition, CSS conventions, and when to use automatic composition vs per-page authoring vs fragments.
---

# Create a New Block

Use this skill when creating a new block from scratch or wiring an existing scaffolded block into the page lifecycle.

## Block file structure

Every block lives in its own folder under `blocks/`. The folder name must exactly match the class name that `loadBlock` uses to resolve it.

```
blocks/
  <block-name>/
    <block-name>.js
    <block-name>.css
```

## How `loadBlock` resolves a block

```js
export async function loadBlock(block) {
  const { components } = getConfig();
  const [name] = block.classList;       // first class = block name
  block.dataset.blockName = name;
  const style = !components.some((cmp) => name === cmp); // load CSS unless opted out
  await loadExperience(block, 'blocks', name, style);
  return block;
}
```

Key rules:
- The **first class** on the element is the block name — no secondary `block` class is needed.
- `loadExperience` loads `blocks/<name>/<name>.js` and, if `style` is true, `blocks/<name>/<name>.css`.
- CSS loads automatically for all blocks unless the block name is listed in the `components` array in `scripts.js` (currently `['fragment', 'profile']`). Add a block there only if it does not need a block-specific stylesheet or manages its own CSS loading.
- **No registration required** — adding a folder under `blocks/` with matching JS and CSS files is sufficient.

## The `init(el)` contract

```js
export default async function init(el) {
  // el is the block's DOM element
  // populate it — don't create a new container
}
```

- `el` is whatever element was passed to `loadBlock` — could be a `<div>`, `<nav>`, `<aside>`, etc.
- The caller may have already set `className`, `aria-label`, and other attributes on `el`. **Do not overwrite them.**
- Append content into `el` directly. Use `el.replaceChildren()` only when replacing authored content is part of the block's contract.
- `init` is `async` — `await` any fetches before appending content.

## How automatic composition injects blocks

This repository does not have a `templates/` registry. Metadata-driven composition
lives in the existing page lifecycle or in a parent block:

- `scripts/scripts.js` reads page metadata and creates universal page structures such
  as the automatic page hero and breadcrumbs.
- A parent block can create a child block and call `loadBlock`. For example,
  `page-hero` creates `component-status` for component pages.

Keep block-specific composition in the closest owning block. Add logic to
`scripts.js` only when it is genuinely universal page setup; use the
`eds-performance-review` skill before changing that lifecycle.

```js
import { loadBlock } from '../../scripts/ak.js';

export default async function init(el) {
  const child = document.createElement('div');
  child.className = 'my-child-block';
  child.setAttribute('aria-label', '...');
  el.append(child);
  await loadBlock(child);
}
```

For multiple independent blocks, load them in parallel:

```js
await Promise.all([loadBlock(firstChild), loadBlock(secondChild)]);
```

## When to use automatic composition vs per-page authoring vs fragments

| Approach | Use when |
| --- | --- |
| **Automatic composition** | A block is structural and appears for a metadata-defined page type. Add it through an existing owning block where possible; reserve `scripts.js` for universal page setup. |
| **Per-page authoring** | Block is content-specific — authors add it to individual pages in the document editor via a table with the block name as the header. |
| **Fragment** | Content is shared across pages but not global (not header/footer). Author a document at `/fragments/<path>` and reference it with a `fragment` block table on each page. |

Header and footer are special — they are baked into the HTML shell by the delivery pipeline, not authored per-page. `ak.js` finds those empty elements and calls `loadBlock` on them automatically.

## CSS file

`loadBlock` automatically loads `blocks/<name>/<name>.css` alongside the JS — no import needed. Scope all styles to the block root class. Use kebab-case, block-prefixed names for child classes; this project does not use BEM.

For the full CSS authoring reference — design tokens, light/dark mode, nesting conventions, media query syntax, reduced motion, and global utilities — see **[`.ai/skills/stylesheet-conventions/SKILL.md`](../stylesheet-conventions/SKILL.md)**.

## Querying data from the index

Dynamic blocks (sitenav, in-page-nav) fetch data at runtime rather than reading authored content.

```js
const resp = await fetch('/query-index.json');
if (!resp.ok) return;
const { data } = await resp.json();
```

`data` is an array of page objects: `{ path, title, description, ... }`.

Filter by the current top-level URL section:

```js
const [, topSection] = window.location.pathname.split('/');
const sectionPages = data.filter(({ path }) => path.startsWith(`/${topSection}/`));
```

For reading headings from the current page (TOC/in-page-nav pattern):

```js
const headings = [...document.querySelectorAll('main h2, main h3')]
  .filter((h) => !el.contains(h)); // exclude any headings inside the block itself
```

## Block variants and state classes

Extra classes on a block element are variant or state flags. `loadBlock` always uses only the **first** class as the block name — additional classes do not affect which JS or CSS file loads. They are purely CSS targets.

```html
<!-- "centered" and "dark" are variants — only "hero" drives block resolution -->
<div class="hero centered dark">...</div>
```

```css
.hero {
  /* base styles */

  &.centered { text-align: center; }
  &.dark { background-color: var(--s2-gray-1000); color: var(--s2-gray-25); }
}
```

If a variant needs meaningfully different JS behavior, check for the variant class inside `init`:

```js
export default async function init(el) {
  const isDark = el.classList.contains('dark');
  // ...
}
```

## Content wrappers inside `el`

When a block is authored directly in a page document, `ak.js` runs `groupChildren` on each section before loading blocks. It groups consecutive children into wrapper divs based on element type:

- **`.default-content`** — wraps runs of non-`div` elements (paragraphs, headings, images, inline text)
- **`.block-content`** — wraps runs of `div` elements (nested block containers)

```js
// ak.js — groupChildren (simplified)
// non-div children → .default-content
// div children     → .block-content
```

`loadBlock` preserves these wrappers — they are present in the DOM when `init(el)` runs. Individual block JS may choose to strip them after reading the content, but that is the block's own decision.

Account for the wrappers when querying inside `el`:

```js
export default async function init(el) {
  // Text/heading content sits inside .default-content, not directly in el
  const defaultContent = el.querySelector('.default-content');
  // Nested block divs sit inside .block-content
  const blockContent = el.querySelector('.block-content');
  // Or query specific elements regardless of nesting depth:
  const links = el.querySelectorAll('a');
}
```

Blocks created programmatically by page setup or a parent block can start with no
authored content, so no wrappers are present.

## Block authoring conventions

### Reduce div soup

EDS decoration leaves unnecessary container elements in the DOM. Use `replaceWith` to swap wrapper divs for semantic elements rather than appending inside them.

```js
// Instead of appending into a generic div, replace it with a semantic element
const section = el.querySelector('.default-content');
const article = document.createElement('article');
article.innerHTML = section.innerHTML;
section.replaceWith(article);
```

Where it is necessary to retain classes from a parent or grandparent (e.g. EDS-injected classes), copy them onto the replacement element before calling `replaceWith`.

### Prefer object syntax for DOM data

When reading block content from table rows, assign it to a named object first. This keeps optional chaining isolated to one place and makes the rest of the function readable.

```js
const data = {
  backgroundColor: el.children?.[0]?.innerText?.trim(),
  textContent: el.children?.[1]?.children?.[0],
  imageContent: el.children?.[1]?.children?.[1],
  altText: el.children?.[1]?.children?.[2]?.innerText?.trim(),
  primaryVariant: Boolean(el.children?.[2]?.innerText?.trim()),
};

// Now use the object — no optional chaining clutter in the logic
if (data.primaryVariant) {
  layout.classList.add('my-block-primary');
} else {
  layout.style.background = `var(--spectrum-${data.backgroundColor})`;
}
```

### Use project class naming

This project does not use BEM. Use kebab-case and prefix child or state classes
with the block name when they need a class:

```css
.my-block { ... }
.my-block-heading { ... }
.my-block-image { ... }
.my-block-primary { ... }
.my-block-heading-large { ... }
```

For variants authored directly on the block root, use a short additional class and
scope it through the root:

```css
.my-block {
  &.compact { ... }
  &.dark { ... }
}
```

The block root class (`my-block`) is set by `loadBlock` from the first class on
the element. Prefer semantic elements and nested selectors over adding classes
that are not needed.

## Testing

Every block has two kinds of tests.

### Unit tests

Unit tests live in `test/blocks/<name>.test.js` and run in a real browser via `@web/test-runner`. They mount the block element directly and call `init(el)`, then assert on the resulting DOM. See existing tests for the pattern — `test/blocks/card.test.js` is a good reference.

### Accessibility tests

axe-core WCAG 2.2 AA scans run against every block via Playwright. **A new block is not done until it has both of these files** — a background check (`test/a11y/coverage.spec.js`) fails CI if a block under `blocks/` has no matching spec file, so don't skip this step when scaffolding.

1. Create `test/a11y/fixtures/<name>.html`. The fixture is a minimal HTML page that loads the block's CSS with `<link>` and initializes it with `<script type="module">`. Use a `data:` URI image placeholder so fixture images never 404. Two easy-to-miss requirements that fail *silently* (the block just quietly renders nothing, with no error) rather than throwing: author the block's own markup in raw row → cell(div) → content shape, not simplified/decorated HTML, since `init()` reads it by walking `:scope > div`; and wrap the block in a `<div class="section">` — a block placed directly under `<main>` is hidden by EDS's flash-of-undecorated-content guard.

   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>My-block fixture</title>
     <link rel="stylesheet" href="/styles/styles.css">
     <link rel="stylesheet" href="/blocks/my-block/my-block.css">
   </head>
   <body>
     <main id="main-content">
       <div class="section">
         <div class="my-block">
           <div>
             <div><!-- cell content here --></div>
           </div>
         </div>
       </div>
     </main>
     <script type="module">
       import init from '/blocks/my-block/my-block.js';
       document.querySelectorAll('.my-block').forEach(init);
     </script>
   </body>
   </html>
   ```

2. Create `test/a11y/blocks/<name>.spec.js` — one file per block, no shared registry to edit. Copy [`test/a11y/blocks/card.spec.js`](../../../test/a11y/blocks/card.spec.js) as a starting template: a light-mode axe scan, an accessibility-tree snapshot, and a dark-mode axe scan, in that order:

   ```js
   import AxeBuilder from '@axe-core/playwright';
   import { test, expect } from '../axe-test.js';
   import { gotoBlock, formatViolations } from '../block-a11y.js';

   const block = {
     name: 'my-block',
     path: '/test/a11y/fixtures/my-block.html',
     readySelector: '.my-block-inner', // element that appears after init completes
   };

   test(`${block.name} block in light/default mode has no WCAG 2.2 AA violations`, async ({ page, makeAxeBuilder }) => {
     await gotoBlock(page, block);

     const results = await makeAxeBuilder()
       .disableRules(block.disableRules ?? [])
       .analyze();

     expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
   });

   test(`${block.name} block matches its expected accessibility tree`, async ({ page }, testInfo) => {
     // Mobile Chrome also runs on the Chromium engine, so `browserName` alone can't isolate a
     // single run — check the project by name to actually run this once, not twice.
     test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');

     await gotoBlock(page, block);

     await expect(page.locator(block.ariaRoot ?? `.${block.name}`)).toMatchAriaSnapshot(`
       - ...
     `);
   });

   test(`${block.name} block in dark mode has no WCAG 2.2 AA violations`, async ({ page }, testInfo) => {
     await page.emulateMedia({ colorScheme: 'dark' });
     await gotoBlock(page, block);

     const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();

     await testInfo.attach('accessibility-scan-results', {
       body: JSON.stringify(results, null, 2),
       contentType: 'application/json',
     });

     expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
   });
   ```

   `readySelector` is a CSS selector for any element created by `init` — the test waits for it before running axe. If the block removes itself from the DOM on init (like `section-metadata`), use `{ selector: '.my-block', state: 'detached' }` instead of a string.

   **All three `test(...)` calls must be written directly in this file**, not moved into a shared helper — Playwright reports a failing test's file/line as wherever `test()` is literally called, so hiding it in `block-a11y.js` would make every block's failures misreport as coming from that one shared file. Generate/update the accessibility-tree snapshot with `npx playwright test test/a11y/blocks/<name>.spec.js --project=chromium -g "accessibility tree" --update-snapshots`.

   If the block fetches remote data at runtime, add a `routes` array to the `block` object to mock those requests — copy [`test/a11y/blocks/header.spec.js`](../../../test/a11y/blocks/header.spec.js) for a worked example. Add reusable mock strings to [`test/a11y/mocks.js`](../../../test/a11y/mocks.js); keep one-off mocks inline in the spec file.

   The rare block that renders arbitrary passthrough content with no fixed structure to assert against (e.g. `fragment`) can be exempted instead of given a spec file — see the `EXCLUDED` set in `test/a11y/coverage.spec.js`. This should be an explicit, justified exception, not a default.

For fixture-specific requirements such as `setConfig`, the fixture-markup gotchas in full, and what to update when an existing block's behavior changes, see [`test/a11y/README.md`](../../../test/a11y/README.md).
