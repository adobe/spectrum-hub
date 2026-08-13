# Accessibility tests

This suite runs [axe-core](https://github.com/dequelabs/axe-core) WCAG 2.2 AA scans against every block and template, using [Playwright](https://playwright.dev/). Tests run on every pull request via [`.github/workflows/a11y.yml`](../../.github/workflows/a11y.yml).

## What we're testing for

Each block gets two checks:

- **Light/default mode** — a full WCAG 2.2 A/AA scan (`wcag2a`, `wcag2aa`, `wcag22aa` tags), covering ARIA usage, semantic structure, labeling, keyboard/focus concerns, target size, and more.
- **Dark mode** — a focused color-contrast scan only. Dark mode reuses the same tokens and markup as light mode, so re-running the full ruleset would just repeat checks that don't vary by color scheme; contrast is the one thing that does.

`accessibility.homepage.spec.js` runs the same scans against the real homepage (proxied through a local [`aem up`](https://github.com/adobe/helix-cli) dev server — see [Running the tests](#running-the-tests)), rather than an isolated fixture.

## Fixture markup requirements

A fixture must reproduce the **raw markup a real page would have before EDS decorates it** — not the block's own decorated output, and not hand-simplified markup. Getting this wrong tends to fail silently (the block finds no content and quietly does nothing) rather than throwing an error, so it's worth understanding why each rule exists.

### Use raw table-row/cell shape, not decorated output

EDS block markup starts as nested `<div>`s mirroring a table (row → cell → content), which each block's `init()` reads by walking `:scope > div`. Author fixtures in that raw shape:

```html
<!-- Correct: row > cell(div) > content -->
<div class="card">
  <div>
    <div><picture>...</picture></div>
    <div><h3>Title</h3><p>Body copy</p></div>
  </div>
</div>
```

Skipping the cell-level `<div>` (e.g. putting `<picture>`/`<h3>`/`<p>` directly inside the row) means `row.querySelectorAll(':scope > div')` finds nothing — the block extracts no content and often removes the row, with no error to point at the problem.

### Wrap the block in a `.section` div

`styles.css` hides any `<div>` that's a **direct** child of `<main>` (EDS's flash-of-undecorated-content guard) — a block placed straight under `<main>` renders with zero size, and `page.waitForSelector` (which checks visibility) times out even though the element exists. Always wrap the block:

```html
<main id="main-content">
  <div class="section">
    <div class="card">...</div>
  </div>
</main>
```

### Self-executing blocks need a side-effect import

Most blocks export a default `init(el)` function and get initialized with:

```html
<script type="module">
  import init from '/blocks/my-block/my-block.js';
  document.querySelectorAll('.my-block').forEach(init);
</script>
```

A few blocks (`page-nav`, `sitenav`) are self-executing IIFEs with no default export — they build their own DOM by scanning the current document. Importing them with a default import throws a module-link error that prevents the whole module graph from evaluating. Use a bare side-effect import instead:

```html
<script type="module">
  import '/blocks/sitenav/sitenav.js';
</script>
```

### Author pre-parsed data attributes, not authoring shorthand

Full-page decoration (`decorateLinks`) parses authoring shorthand like `title="style:primary"` into `dataset.style` before a block ever sees it. Isolated fixtures skip that pipeline entirely, so a block reading `el.dataset.style` directly (e.g. `action-button`) never sees a value if the fixture only sets the authoring shorthand. Author the parsed form directly:

```html
<!-- Wrong in a fixture: never gets parsed -->
<a title="style:primary" href="#">Click me</a>

<!-- Right: pre-parsed, as ak.js's decorateLink would leave it -->
<a data-style="primary" href="#">Click me</a>
```

### Declare shared dependencies real pages inherit for free

Any block importing `deps/se/se.js` (or `lit` transitively) needs its own import map, since isolated fixtures don't inherit the one `head.html` provides on real pages:

```html
<script type="importmap">{"imports":{"lit":"/deps/lit/dist/index.js"}}</script>
```

### Avoid 404s on images

Use a `data:` URI placeholder for any authored image so fixtures don't depend on real assets:

```html
<picture><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7" alt=""></picture>
```

## Running the tests

Playwright's `webServer` config starts a local [`aem up`](https://github.com/adobe/helix-cli) dev server automatically — you don't need to start anything yourself. It serves fixture files (and any other local file) directly, and proxies real page content from the linked preview environment for everything else (e.g. the homepage spec).

```bash
# Full suite, all browsers (chromium, firefox, webkit, + mobile emulation)
npm run test:a11y

# One block, all browsers
npx playwright test test/a11y/blocks/card.spec.js

# One block, one browser
npx playwright test test/a11y/blocks/card.spec.js --project=chromium

# Filter by test name
npx playwright test -g "sitenav"
```

> **Windows/PowerShell:** always use forward slashes in file-path arguments, even on Windows — `test/a11y/blocks/card.spec.js`, not `.\test\a11y\blocks\card.spec.js`. Playwright treats the argument as a regex matched against forward-slash paths; backslashes get parsed as regex escapes (`\t`, `\s`, etc.) and silently match nothing.

`npm test` runs this suite alongside unit and extraction tests, and fails overall if any of the three fail.

## File structure

| Path | Purpose |
| --- | --- |
| [`axe-test.js`](./axe-test.js) | Shared Playwright `test`/`expect`, extended with a `makeAxeBuilder` fixture (consistent WCAG 2.2 tags). |
| [`block-a11y.js`](./block-a11y.js) | Shared `gotoBlock()` and `formatViolations()` utilities used by every block spec. |
| [`mocks.js`](./mocks.js) | Reusable mock HTML/JSON for blocks that fetch remote data at runtime. |
| [`blocks/<name>.spec.js`](./blocks/) | One file per block — the actual light/dark-mode test pair. |
| [`fixtures/<name>.html`](./fixtures/) | One fixture per block/template — the isolated page each spec loads. |
| [`coverage.spec.js`](./coverage.spec.js) | Fails if a block under `blocks/` (repo root) has no matching spec file, unless explicitly exempted. |
| [`accessibility.homepage.spec.js`](./accessibility.homepage.spec.js) | Scans the real, live-proxied homepage rather than an isolated fixture. |

## Adding a new block

See the **Accessibility tests** section of [`AGENTS.md`](../../AGENTS.md) or the [`create-new-block`](../../.ai/skills/create-new-block/SKILL.md) skill for the full walkthrough — fixture template, spec template, and route-mocking example.
