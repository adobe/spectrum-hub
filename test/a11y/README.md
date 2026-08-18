# Accessibility tests

This suite runs [axe-core](https://github.com/dequelabs/axe-core) WCAG 2.2 AA scans plus Playwright's [`toMatchAriaSnapshot()`](https://playwright.dev/docs/aria-snapshots) accessibility-tree checks against every block, template, and shared custom element, using [Playwright](https://playwright.dev/). Tests run on every pull request via [`.github/workflows/a11y.yml`](../../.github/workflows/a11y.yml).

## What we're testing for

Each block gets three checks:

- **Light/default mode** — a full WCAG 2.2 A/AA scan (`wcag2a`, `wcag2aa`, `wcag22aa` tags), covering ARIA usage, semantic structure, labeling, keyboard/focus concerns, target size, and more.
- **Accessibility tree** — a `toMatchAriaSnapshot()` assertion against the block's root element, asserting its accessible roles/names/structure match a committed baseline. Axe only flags known WCAG rule violations; it won't notice a heading silently demoted to a `div`, a landmark losing its name, or a role getting clobbered, as long as nothing technically violates a rule. This test runs once, gated to the `chromium` project (the tree is browser/viewport-agnostic — see the gotcha below), and is skipped for a couple of blocks noted inline in their spec files (`schedule`: non-deterministic render pending a bug fix; `section-metadata`: removes its own root from the DOM on init).
- **Dark mode** — a focused color-contrast scan only. Dark mode reuses the same tokens and markup as light mode, so re-running the full ruleset (or the tree snapshot) would just repeat checks that don't vary by color scheme; contrast is the one thing that does.

`accessibility.homepage.spec.js` runs the same axe scans against the real homepage (proxied through a local [`aem up`](https://github.com/adobe/helix-cli) dev server — see [Running the tests](#running-the-tests)), rather than an isolated fixture.

### Accessibility-tree snapshots

```js
test(`${block.name} block matches its expected accessibility tree`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');
  await gotoBlock(page, block);
  await expect(page.locator(block.ariaRoot ?? `.${block.name}`)).toMatchAriaSnapshot(`
    - ...
  `);
});
```

- **Gate by `testInfo.project.name`, not the `browserName` fixture.** `Mobile Chrome` also runs on the Chromium *engine*, so `browserName !== 'chromium'` alone lets it slip through as a redundant second run of a check that's supposed to be identical everywhere.
- **`ariaRoot`** is an optional field on the `block` config object giving the root locator selector; defaults to `` `.${block.name}` ``. Override it when the block replaces its root with something else on init — a custom element (`profile` → `se-profile`, `search` → `sh-search`, `youtube` → `.video`) or an id instead of a class (`sitenav` → `#sitenav`, since `getSiteNav()` builds `<div id="sitenav">`).
- **Snapshots are inline template-literal strings**, not external `.aria.yml` files — this keeps the expected tree visible directly in the PR diff instead of a separate baseline file to review.
- **Generate or update** a snapshot with:
  ```bash
  npx playwright test test/a11y/blocks/<name>.spec.js --project=chromium -g "accessibility tree" --update-snapshots
  ```
  This writes `test-results/rebaselines.patch` rather than patching the spec file in place — review the diff, then `git apply test-results/rebaselines.patch` and delete `test-results/`.
- Treat the snapshot as living documentation: update it when a tree change is intentional, fix the block when it isn't.

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

## Shared custom elements (`test/a11y/custom-components/`)

`deps/se/se.js` registers shared form/UI web components (`se-button`, `se-input`, `se-textarea`, `se-checkbox`, `se-switch`, `se-select`, `se-segmentedcontrol`, `se-dialog`) used across several blocks. Rather than rely on whichever block happens to exercise them — which misses states like `disabled`/`error`/`checked` and, in a couple of cases, missed the element entirely — each gets its own fixture and spec, parallel to the block convention:

- `test/a11y/fixtures/custom-components/<name>.html` imports `/deps/se/se.js` directly (a bare side-effect import registers every element) and lays out the element's meaningful states side-by-side inside `<div class="test-container">`, so one axe pass and one aria-snapshot cover all of them.
- `test/a11y/custom-components/<name>.spec.js` is identical in shape to a block spec, with `ariaRoot: '.test-container'` (there's no single `.${name}` class to default to, since a fixture holds multiple instances).
- `test/a11y/coverage.spec.js` parses `customElements.define(...)` calls out of `deps/se/se.js` and fails if a registered element has no matching spec — a new element can't ship without a11y coverage.

Direct testing of these components surfaced real, pre-existing bugs that incidental block-level coverage had missed — left failing and documented rather than fixed as part of adding the tests:

- `se-checkbox`: native checkbox renders at 12–13px, below the WCAG 2.2 AA 2.5.8 Target Size minimum (24px).
- `se-textarea`: the `<textarea>` never gets an `id`, so its `<label for="...">` points at nothing — the field has no accessible label at all.
- `se-dialog`/`se-button`: insufficient button contrast (down to ~2.25:1, need 4.5:1) in both light and dark mode — not dark-mode-specific as first suspected.

## CI policy

`a11y.yml` fails the job on any violation, but it isn't a required check yet — merges aren't blocked.

## Running the tests

Playwright's `webServer` config starts a local [`aem up`](https://github.com/adobe/helix-cli) dev server automatically — you don't need to start anything yourself. It serves fixture files (and any other local file) directly, and proxies real page content from the linked preview environment for everything else (e.g. the homepage spec).

```bash
# Full suite, all projects (chromium desktop + Mobile Chrome)
npm run test:a11y

# One block, all browsers
npx playwright test test/a11y/blocks/card.spec.js

# One block, one browser
npx playwright test test/a11y/blocks/card.spec.js --project=chromium

# One custom element, all browsers
npx playwright test test/a11y/custom-components/se-button.spec.js

# Filter by test name
npx playwright test -g "sitenav"
```

> **Windows/PowerShell:** always use forward slashes in file-path arguments, even on Windows — `test/a11y/blocks/card.spec.js`, not `.\test\a11y\blocks\card.spec.js`. Playwright treats the argument as a regex matched against forward-slash paths; backslashes get parsed as regex escapes (`\t`, `\s`, etc.) and silently match nothing.

This suite is **not** part of `npm test` (that runs unit + extraction tests only) — it's kept separate since it needs its own browser install and dev server. Run it with `npm run test:a11y`, or via the dedicated [`a11y.yml`](../../.github/workflows/a11y.yml) workflow in CI.

## File structure

| Path | Purpose |
| --- | --- |
| [`axe-test.js`](./axe-test.js) | Shared Playwright `test`/`expect`, extended with a `makeAxeBuilder` fixture (consistent WCAG 2.2 tags). |
| [`block-a11y.js`](./block-a11y.js) | Shared `gotoBlock()` and `formatViolations()` utilities used by every block spec. |
| [`mocks.js`](./mocks.js) | Reusable mock HTML/JSON for blocks that fetch remote data at runtime. |
| [`blocks/<name>.spec.js`](./blocks/) | One file per block — the actual light/dark-mode test pair. |
| [`fixtures/<name>.html`](./fixtures/) | One fixture per block/template — the isolated page each spec loads. |
| [`custom-components/<name>.spec.js`](./custom-components/) | One file per shared `deps/se/se.js` element. |
| [`fixtures/custom-components/<name>.html`](./fixtures/custom-components/) | One fixture per shared custom element. |
| [`coverage.spec.js`](./coverage.spec.js) | Fails if a block under `blocks/` (repo root), or a `deps/se/se.js` custom element, has no matching spec file, unless explicitly exempted. |
| [`accessibility.homepage.spec.js`](./accessibility.homepage.spec.js) | Scans the real, live-proxied homepage rather than an isolated fixture. |

## Adding a new block

See the **Accessibility tests** section of [`AGENTS.md`](../../AGENTS.md) or the [`create-new-block`](../../.ai/skills/create-new-block/SKILL.md) skill for the full walkthrough — fixture template, spec template, and route-mocking example.
